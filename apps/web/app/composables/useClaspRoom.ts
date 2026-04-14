/**
 * useClaspRoom — joins a clasp studio room and exposes reactive participant state.
 *
 * The clasp client itself is provided by plugins/clasp.client.ts.
 */
import { onScopeDispose, ref, shallowRef, type Ref } from "vue";
import { useNuxtApp } from "#app";
import {
  joinStudio,
  type ClaspClient,
  type ParticipantEntry,
  type SignalPayload,
  type StudioSession,
} from "@commoncast/clasp-client";

export interface UseClaspRoomReturn {
  readonly session: Readonly<ReturnType<typeof shallowRef<StudioSession | null>>>;
  readonly participants: Ref<Record<string, ParticipantEntry>>;
  readonly state: Ref<"idle" | "joining" | "joined" | "error">;
  join(entry: ParticipantEntry): Promise<void>;
  leave(): Promise<void>;
  sendSignal(toPid: string, payload: SignalPayload): Promise<void>;
  onSignal(cb: (fromPid: string, payload: SignalPayload) => void): () => void;
}

export function useClaspRoom(
  studioId: string,
  participantId: string,
): UseClaspRoomReturn {
  const nuxt = useNuxtApp();
  const clasp = nuxt.$clasp as ClaspClient;
  const session = shallowRef<StudioSession | null>(null);
  const participants = ref<Record<string, ParticipantEntry>>({});
  const state = ref<"idle" | "joining" | "joined" | "error">("idle");

  async function join(entry: ParticipantEntry): Promise<void> {
    if (state.value === "joining" || state.value === "joined") return;
    state.value = "joining";
    try {
      await clasp.connect();
      const s = joinStudio(clasp, studioId, participantId);
      session.value = s;
      s.onParticipants((pid, value) => {
        const next = { ...participants.value };
        if (value === null) delete next[pid];
        else next[pid] = value;
        participants.value = next;
      });
      await s.announcePresence(entry);
      state.value = "joined";
    } catch (err) {
      state.value = "error";
      throw err;
    }
  }

  async function leave(): Promise<void> {
    await session.value?.leave();
    session.value = null;
    participants.value = {};
    state.value = "idle";
  }

  async function sendSignal(
    toPid: string,
    payload: SignalPayload,
  ): Promise<void> {
    await session.value?.sendSignal(toPid, payload);
  }

  function onSignal(
    cb: (fromPid: string, payload: SignalPayload) => void,
  ): () => void {
    return session.value?.onSignal(cb) ?? (() => {});
  }

  onScopeDispose(() => {
    void leave();
  });

  return {
    session,
    participants,
    state,
    join,
    leave,
    sendSignal,
    onSignal,
  };
}
