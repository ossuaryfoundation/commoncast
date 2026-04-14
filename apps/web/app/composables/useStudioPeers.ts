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
import type { UseClaspRoomReturn } from "./useClaspRoom";
import { usePeerConnection, type UsePeerConnectionReturn } from "./usePeerConnection";
import type { ParticipantEntry } from "@commoncast/clasp-client";

export interface UseStudioPeersOptions {
  /**
   * A pre-instantiated clasp room — owned by the studio page so the same
   * room can back both useStudioPeers (WebRTC mesh) and
   * useStudioParticipants (presence projection).
   */
  room: UseClaspRoomReturn;
  myPid: string;
  role: "host" | "guest";
  /**
   * Called lazily when a peer needs local tracks to send. Return both the
   * video and audio tracks; the peer connection adds each one via a
   * separate addTrack call so remote clients receive a `track` event per
   * kind.
   */
  getLocalTracks: () => ReadonlyArray<MediaStreamTrack>;
  /** Called once per inbound remote track, per peer. Track kind is preserved. */
  onRemoteTrack: (fromPid: string, track: MediaStreamTrack) => void;
}

export interface UseStudioPeersReturn {
  readonly remotePids: Ref<readonly string[]>;
  join(displayName: string): Promise<void>;
  leave(): Promise<void>;
  /** Host operation: tear down a specific peer connection by pid. */
  closePeer(pid: string): void;
}

export function useStudioPeers(opts: UseStudioPeersOptions): UseStudioPeersReturn {
  const room = opts.room;
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
    for (const track of opts.getLocalTracks()) {
      pc.addLocalTrack(track);
    }
    peers.set(remotePid, pc);
    refreshRemotePids();
    return pc;
  }

  async function join(displayName: string): Promise<void> {
    // Host self-promotes to live on join; guests land in backstage and
    // wait for the host to bring them on stage (StreamYard-style flow).
    const entry: ParticipantEntry = {
      name: displayName,
      role: opts.role,
      stage: opts.role === "host" ? "live" : "backstage",
      slot: 0,
      muted: false,
      raisedHand: false,
      cameraOff: false,
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

  function closePeer(pid: string): void {
    const pc = peers.get(pid);
    if (!pc) return;
    pc.close();
    peers.delete(pid);
    refreshRemotePids();
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

  return { remotePids, join, leave, closePeer };
}
