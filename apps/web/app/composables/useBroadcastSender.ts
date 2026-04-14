/**
 * useBroadcastSender
 *
 * Publishes a MediaStreamTrack (typically the compositor's output track) to a
 * destination address via clasp. This is the "send composited video out
 * through clasp to an address" primitive from the build plan.
 *
 * Transport model: the composite track is carried over a NEW RTCPeerConnection.
 * Clasp only carries signaling (SDP offer/answer + ICE candidates) via the
 * broadcastOut* addresses. Media flows P2P over WebRTC — we do NOT try to
 * push raw frames through clasp (there's a 64KB frame cap).
 */
import { onScopeDispose, ref, shallowRef } from "vue";
import { useNuxtApp } from "#app";
import {
  addresses,
  type ClaspClient,
  type SignalPayload,
} from "@commoncast/clasp-client";

export type BroadcastSenderState =
  | "idle"
  | "negotiating"
  | "connected"
  | "failed"
  | "closed";

export interface UseBroadcastSenderReturn {
  readonly state: Readonly<ReturnType<typeof ref<BroadcastSenderState>>>;
  /**
   * Open a one-way WebRTC connection carrying `track` and publish the offer
   * at broadcastOut(studioId, destAddr). A receiver subscribed to that
   * address writes the answer back and we complete the handshake.
   */
  publish(opts: {
    studioId: string;
    destAddr: string;
    track: MediaStreamTrack;
  }): Promise<void>;
  close(): void;
}

const RTC: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function useBroadcastSender(): UseBroadcastSenderReturn {
  const state = ref<BroadcastSenderState>("idle");
  const pcRef = shallowRef<RTCPeerConnection | null>(null);
  const unsubsRef = shallowRef<Array<() => void>>([]);

  async function publish(opts: {
    studioId: string;
    destAddr: string;
    track: MediaStreamTrack;
  }): Promise<void> {
    const nuxt = useNuxtApp();
    const clasp = nuxt.$clasp as ClaspClient;

    close();

    const pc = new RTCPeerConnection(RTC);
    pcRef.value = pc;
    state.value = "negotiating";

    pc.addTrack(opts.track);

    const offerAddr = addresses.broadcastOut(opts.studioId, opts.destAddr);
    const answerAddr = addresses.broadcastOutAnswer(opts.studioId, opts.destAddr);
    const iceHostAddr = addresses.broadcastOutIce(
      opts.studioId,
      opts.destAddr,
      "host",
    );
    const iceReceiverAddr = addresses.broadcastOutIce(
      opts.studioId,
      opts.destAddr,
      "receiver",
    );

    pc.addEventListener("icecandidate", (e) => {
      if (e.candidate) {
        void clasp.set(iceHostAddr, { candidate: e.candidate.toJSON() });
      }
    });

    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "connected") state.value = "connected";
      else if (pc.connectionState === "failed") state.value = "failed";
      else if (pc.connectionState === "closed") state.value = "closed";
    });

    await clasp.connect();

    // Subscribe to receiver's answer + ICE BEFORE publishing the offer so we
    // don't race a fast receiver.
    const unsubAnswer = clasp.on(answerAddr, (value) => {
      const v = value as { sdp?: string } | null;
      if (!v?.sdp) return;
      void pc.setRemoteDescription({ type: "answer", sdp: v.sdp });
    });
    const unsubIce = clasp.on(iceReceiverAddr, (value) => {
      const v = value as { candidate?: RTCIceCandidateInit } | null;
      if (!v?.candidate) return;
      void pc.addIceCandidate(v.candidate).catch(() => {});
    });
    unsubsRef.value = [unsubAnswer, unsubIce];

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    if (offer.sdp) {
      await clasp.set(offerAddr, { sdp: offer.sdp });
    }
  }

  function close(): void {
    pcRef.value?.close();
    pcRef.value = null;
    unsubsRef.value.forEach((u) => u());
    unsubsRef.value = [];
    if (state.value !== "idle") state.value = "closed";
  }

  onScopeDispose(close);

  return { state, publish, close };
}

// Silence unused import if the linter strips types aggressively.
export type _SignalPayload = SignalPayload;
