/**
 * usePeerConnection — one RTCPeerConnection per remote peer.
 *
 * Signaling is delegated to a callback (typically wired to useClaspRoom), so
 * this composable stays decoupled from the transport. The pc itself lives in a
 * plain variable inside the closure — it is NEVER put in a reactive container.
 *
 * Usage:
 *   const pc = usePeerConnection({
 *     onSignalOut: (payload) => room.sendSignal(remotePid, payload),
 *     onRemoteTrack: (track) => engine.addSource({kind:'camera', track, ...}),
 *   });
 *   // inbound:
 *   room.onSignal((fromPid, payload) => pc.handleSignal(payload));
 */
import { onScopeDispose, shallowRef } from "vue";
import type { SignalPayload } from "@commoncast/clasp-client";

export interface UsePeerConnectionOptions {
  onSignalOut: (payload: SignalPayload) => void | Promise<void>;
  onRemoteTrack?: (track: MediaStreamTrack) => void;
  rtcConfig?: RTCConfiguration;
}

export interface UsePeerConnectionReturn {
  readonly connectionState: Readonly<ReturnType<typeof shallowRef<RTCPeerConnectionState>>>;
  addLocalTrack(track: MediaStreamTrack, stream?: MediaStream): void;
  createOffer(): Promise<void>;
  handleSignal(payload: SignalPayload): Promise<void>;
  close(): void;
}

const DEFAULT_RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function usePeerConnection(
  opts: UsePeerConnectionOptions,
): UsePeerConnectionReturn {
  const pc = new RTCPeerConnection(opts.rtcConfig ?? DEFAULT_RTC_CONFIG);
  const connectionState = shallowRef<RTCPeerConnectionState>(pc.connectionState);

  pc.addEventListener("connectionstatechange", () => {
    connectionState.value = pc.connectionState;
  });

  pc.addEventListener("icecandidate", (e) => {
    if (e.candidate) {
      void opts.onSignalOut({ type: "ice", candidate: e.candidate.toJSON() });
    }
  });

  pc.addEventListener("track", (e) => {
    const track = e.track;
    if (track && opts.onRemoteTrack) opts.onRemoteTrack(track);
  });

  function addLocalTrack(track: MediaStreamTrack, stream?: MediaStream): void {
    if (stream) pc.addTrack(track, stream);
    else pc.addTrack(track);
  }

  async function createOffer(): Promise<void> {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    if (offer.sdp) {
      await opts.onSignalOut({ type: "offer", sdp: offer.sdp });
    }
  }

  async function handleSignal(payload: SignalPayload): Promise<void> {
    switch (payload.type) {
      case "offer": {
        await pc.setRemoteDescription({ type: "offer", sdp: payload.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (answer.sdp) {
          await opts.onSignalOut({ type: "answer", sdp: answer.sdp });
        }
        break;
      }
      case "answer": {
        await pc.setRemoteDescription({ type: "answer", sdp: payload.sdp });
        break;
      }
      case "ice": {
        try {
          await pc.addIceCandidate(payload.candidate);
        } catch {
          // Swallow: it's common for late ICE candidates to fail innocuously.
        }
        break;
      }
    }
  }

  function close(): void {
    pc.getSenders().forEach((s) => {
      try {
        pc.removeTrack(s);
      } catch {
        // ignore
      }
    });
    pc.close();
  }

  onScopeDispose(close);

  return {
    connectionState,
    addLocalTrack,
    createOffer,
    handleSignal,
    close,
  };
}
