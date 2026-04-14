/**
 * useStudioPeers — composes useClaspRoom + one usePeerConnection per remote.
 *
 * One RTCPeerConnection per remote participant, keyed by pid. The host role
 * auto-initiates an SDP offer to every new participant it sees; guests wait
 * for the offer and respond. Inbound signaling is routed to the right peer
 * based on `fromPid`.
 *
 * Remote tracks are surfaced via the `onRemoteTrack` callback so the caller
 * (typically studios/[id].vue) can register them with the studio engine.
 */
import { ref, watch, onScopeDispose, type Ref } from "vue";
import { useClaspRoom } from "./useClaspRoom";
import { usePeerConnection, type UsePeerConnectionReturn } from "./usePeerConnection";
import type { ParticipantEntry } from "@commoncast/clasp-client";

export interface UseStudioPeersOptions {
  studioId: string;
  myPid: string;
  role: "host" | "guest";
  /** Called lazily when a peer needs a local track to send. */
  getLocalTrack: () => MediaStreamTrack | null;
  /** Called once per inbound remote track, per peer. */
  onRemoteTrack: (fromPid: string, track: MediaStreamTrack) => void;
}

export interface UseStudioPeersReturn {
  readonly remotePids: Ref<readonly string[]>;
  join(displayName: string): Promise<void>;
  leave(): Promise<void>;
}

export function useStudioPeers(opts: UseStudioPeersOptions): UseStudioPeersReturn {
  const room = useClaspRoom(opts.studioId, opts.myPid);
  const peers = new Map<string, UsePeerConnectionReturn>();
  const remotePids = ref<string[]>([]);
  let signalUnsub: (() => void) | null = null;
  let participantsUnwatch: (() => void) | null = null;

  function refreshRemotePids(): void {
    remotePids.value = Array.from(peers.keys());
  }

  function ensurePeer(remotePid: string): UsePeerConnectionReturn {
    const existing = peers.get(remotePid);
    if (existing) return existing;
    const pc = usePeerConnection({
      onSignalOut: (payload) => room.sendSignal(remotePid, payload),
      onRemoteTrack: (track) => opts.onRemoteTrack(remotePid, track),
    });
    const localTrack = opts.getLocalTrack();
    if (localTrack) pc.addLocalTrack(localTrack);
    peers.set(remotePid, pc);
    refreshRemotePids();
    return pc;
  }

  async function join(displayName: string): Promise<void> {
    const entry: ParticipantEntry = {
      name: displayName,
      role: opts.role,
      stage: "live",
      slot: 0,
      muted: false,
    };
    await room.join(entry);

    signalUnsub = room.onSignal(async (fromPid, payload) => {
      if (fromPid === opts.myPid) return;
      const pc = ensurePeer(fromPid);
      try {
        await pc.handleSignal(payload);
      } catch (err) {
        console.error("[commoncast] handleSignal failed", err);
      }
    });

    // Host-initiates model: whenever a new participant appears, create an
    // offer. Guests stay passive — they'll build their peer entry when the
    // host's offer lands in onSignal.
    participantsUnwatch = watch(
      () => Object.keys(room.participants.value),
      async (pids) => {
        if (opts.role !== "host") return;
        for (const pid of pids) {
          if (pid === opts.myPid) continue;
          if (peers.has(pid)) continue;
          const pc = ensurePeer(pid);
          try {
            await pc.createOffer();
          } catch (err) {
            console.error("[commoncast] createOffer failed", err);
          }
        }
      },
      { immediate: true },
    );
  }

  async function leave(): Promise<void> {
    participantsUnwatch?.();
    participantsUnwatch = null;
    signalUnsub?.();
    signalUnsub = null;
    for (const pc of peers.values()) pc.close();
    peers.clear();
    refreshRemotePids();
    await room.leave();
  }

  onScopeDispose(() => {
    void leave();
  });

  return { remotePids, join, leave };
}
