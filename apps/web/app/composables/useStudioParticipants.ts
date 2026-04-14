/**
 * useStudioParticipants — projects the clasp room's participant state into
 * the Pinia `participants` store AND exposes the host-control action API
 * (bring-on-stage, send-to-backstage, mute, camera-off, kick) + guest-side
 * self actions (raise hand).
 *
 * The composable is also the place where "my own presence changed remotely"
 * gets routed — e.g. when the host mutes a guest, the guest's client sees
 * `muted: true` on its own entry here and the onOwnMuted callback lets the
 * studio page toggle the local audio track accordingly.
 */
import { watch, onScopeDispose } from "vue";
import type { ParticipantEntry } from "@commoncast/clasp-client";
import type { UseClaspRoomReturn } from "./useClaspRoom";
import { useParticipantsStore } from "~/stores/participants";

export interface UseStudioParticipantsOptions {
  myPid: string;
  role: "host" | "guest";
  room: UseClaspRoomReturn;
  /** Fires when our own muted flag transitions (host-over or self). */
  onOwnMutedChanged?: (muted: boolean) => void;
  /** Fires when our own cameraOff flag transitions. */
  onOwnCameraOffChanged?: (off: boolean) => void;
  /** Fires when the host kicks us (our entry becomes null). */
  onKicked?: () => void;
}

export interface UseStudioParticipantsReturn {
  readonly isHost: boolean;
  /** Host: promote a participant to the live stage. */
  bringOnStage(pid: string): Promise<void>;
  /** Host: send a participant back to backstage. */
  sendToBackstage(pid: string): Promise<void>;
  /** Self or host: set muted flag (self -> updatePresence, host -> setParticipant). */
  setMuted(pid: string, muted: boolean): Promise<void>;
  /** Self or host: set cameraOff flag. */
  setCameraOff(pid: string, off: boolean): Promise<void>;
  /** Guest: raise/lower my own hand. */
  raiseHand(raised: boolean): Promise<void>;
  /** Host: kick (delete presence entry). */
  kick(pid: string): Promise<void>;
}

export function useStudioParticipants(
  opts: UseStudioParticipantsOptions,
): UseStudioParticipantsReturn {
  const store = useParticipantsStore();

  let prevOwnMuted = false;
  let prevOwnCameraOff = false;
  let wasPresent = false;

  const stop = watch(
    () => opts.room.participants.value,
    (next) => {
      store.replaceAll(next);

      const mine = next[opts.myPid];
      if (!mine) {
        if (wasPresent && opts.onKicked) opts.onKicked();
        wasPresent = false;
        return;
      }
      wasPresent = true;

      if (mine.muted !== prevOwnMuted) {
        prevOwnMuted = mine.muted;
        opts.onOwnMutedChanged?.(mine.muted);
      }
      const cameraOff = mine.cameraOff ?? false;
      if (cameraOff !== prevOwnCameraOff) {
        prevOwnCameraOff = cameraOff;
        opts.onOwnCameraOffChanged?.(cameraOff);
      }
    },
    { immediate: true, deep: true },
  );

  onScopeDispose(stop);

  function session() {
    return opts.room.session.value;
  }

  function stripPid<T extends { pid?: string }>(entry: T): Omit<T, "pid"> {
    const { pid: _drop, ...rest } = entry;
    return rest;
  }

  async function hostPatch(pid: string, patch: Partial<ParticipantEntry>) {
    if (opts.role !== "host") {
      console.warn("[commoncast] host-only action attempted by non-host role");
      return;
    }
    const existing = store.all[pid];
    if (!existing) return;
    const base = stripPid(existing) as ParticipantEntry;
    const next: ParticipantEntry = { ...base, ...patch };
    await session()?.setParticipant(pid, next);
  }

  async function bringOnStage(pid: string): Promise<void> {
    // Promoting a participant also clears any raised-hand state on their
    // entry so the "waiting" indicator resets.
    await hostPatch(pid, { stage: "live", raisedHand: false });
  }

  async function sendToBackstage(pid: string): Promise<void> {
    await hostPatch(pid, { stage: "backstage" });
  }

  async function setMuted(pid: string, muted: boolean): Promise<void> {
    if (pid === opts.myPid) {
      await session()?.updatePresence({ muted });
      return;
    }
    await hostPatch(pid, { muted });
  }

  async function setCameraOff(pid: string, off: boolean): Promise<void> {
    if (pid === opts.myPid) {
      await session()?.updatePresence({ cameraOff: off });
      return;
    }
    await hostPatch(pid, { cameraOff: off });
  }

  async function raiseHand(raised: boolean): Promise<void> {
    await session()?.updatePresence({ raisedHand: raised });
  }

  async function kick(pid: string): Promise<void> {
    if (opts.role !== "host") return;
    if (pid === opts.myPid) return;
    await session()?.setParticipant(pid, null);
  }

  return {
    isHost: opts.role === "host",
    bringOnStage,
    sendToBackstage,
    setMuted,
    setCameraOff,
    raiseHand,
    kick,
  };
}
