/**
 * broadcastSender — a framework-neutral, multi-instance-safe factory
 * for the "publish a MediaStream to a clasp address over WebRTC"
 * primitive.
 *
 * Prior to slice E this logic was baked into the useBroadcastSender
 * composable, which made it impossible to stream to more than one
 * destination at a time. Extracting the guts into a plain TS factory
 * lets useBroadcastFanout manage N concurrent senders keyed by
 * destination id, while useBroadcastSender remains available as a
 * thin single-instance Vue wrapper for callers that only need one.
 *
 * CLAUDE.md §3: zero Vue here. The RTCPeerConnection and clasp
 * subscriptions live in plain closure state; state changes are
 * emitted through a small observer.
 */
import { addresses, type ClaspClient } from "@commoncast/clasp-client";

export type BroadcastSenderState =
  | "idle"
  | "negotiating"
  | "connected"
  | "failed"
  | "closed";

export interface BroadcastSender {
  getState(): BroadcastSenderState;
  /**
   * Subscribe to state transitions. Fires immediately with the current
   * state for convenience. Returns an unsubscribe fn.
   */
  onStateChange(cb: (state: BroadcastSenderState) => void): () => void;
  publish(opts: {
    studioId: string;
    destAddr: string;
    stream: MediaStream;
  }): Promise<void>;
  close(): void;
}

const RTC: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function createBroadcastSender(clasp: ClaspClient): BroadcastSender {
  let state: BroadcastSenderState = "idle";
  const listeners = new Set<(s: BroadcastSenderState) => void>();

  function setState(next: BroadcastSenderState): void {
    state = next;
    for (const l of listeners) l(next);
  }

  let pc: RTCPeerConnection | null = null;
  let unsubs: Array<() => void> = [];

  function close(): void {
    pc?.close();
    pc = null;
    for (const u of unsubs) {
      try {
        u();
      } catch {
        // ignore
      }
    }
    unsubs = [];
    if (state !== "idle") setState("closed");
  }

  async function publish(opts: {
    studioId: string;
    destAddr: string;
    stream: MediaStream;
  }): Promise<void> {
    close();

    const conn = new RTCPeerConnection(RTC);
    pc = conn;
    setState("negotiating");

    for (const track of opts.stream.getTracks()) {
      conn.addTrack(track, opts.stream);
    }

    const offerAddr = addresses.broadcastOut(opts.studioId, opts.destAddr);
    const answerAddr = addresses.broadcastOutAnswer(
      opts.studioId,
      opts.destAddr,
    );
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

    conn.addEventListener("icecandidate", (e) => {
      if (e.candidate) {
        void clasp.set(iceHostAddr, { candidate: e.candidate.toJSON() });
      }
    });

    conn.addEventListener("connectionstatechange", () => {
      if (!pc || pc !== conn) return;
      if (conn.connectionState === "connected") setState("connected");
      else if (conn.connectionState === "failed") setState("failed");
      else if (conn.connectionState === "closed") setState("closed");
    });

    await clasp.connect();

    // Subscribe BEFORE publishing the offer so we don't race a fast receiver.
    unsubs.push(
      clasp.on(answerAddr, (value) => {
        const v = value as { sdp?: string } | null;
        if (!v?.sdp || !pc || pc !== conn) return;
        void pc.setRemoteDescription({ type: "answer", sdp: v.sdp });
      }),
    );
    unsubs.push(
      clasp.on(iceReceiverAddr, (value) => {
        const v = value as { candidate?: RTCIceCandidateInit } | null;
        if (!v?.candidate || !pc || pc !== conn) return;
        void pc.addIceCandidate(v.candidate).catch(() => {});
      }),
    );

    const offer = await conn.createOffer();
    await conn.setLocalDescription(offer);
    if (offer.sdp) {
      await clasp.set(offerAddr, { sdp: offer.sdp });
    }
  }

  return {
    getState: () => state,
    onStateChange(cb) {
      listeners.add(cb);
      cb(state);
      return () => {
        listeners.delete(cb);
      };
    },
    publish,
    close,
  };
}
