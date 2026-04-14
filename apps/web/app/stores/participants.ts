/**
 * Pinia / participants — PROJECTION of the live clasp room.
 *
 * This store is a derived read-model, not a source of truth. The real
 * authority is the clasp room; useStudioParticipants subscribes to it and
 * $patches this store in response. Reason the projection exists at all:
 *
 *   - UI components can read "onStage", "backstage", "raisedHands" without
 *     knowing anything about clasp or composables.
 *   - Getters centralize the sort/filter logic.
 *   - We can compute derived state (speaking, slot badge, …) without having
 *     every component re-subscribe.
 *
 * IMPORTANT: this store is intentionally NOT persisted via pinia-persist.
 * Stale participant data across reloads is worse than an empty list.
 */
import { defineStore } from "pinia";
import type { ParticipantEntry } from "@commoncast/clasp-client";

export interface StudioParticipant extends ParticipantEntry {
  pid: string;
}

export const useParticipantsStore = defineStore("participants", {
  state: () => ({
    all: {} as Record<string, StudioParticipant>,
  }),
  getters: {
    list(state): StudioParticipant[] {
      return Object.values(state.all).sort(
        (a, b) => (a.slot ?? 0) - (b.slot ?? 0),
      );
    },
    onStage(): StudioParticipant[] {
      return this.list.filter((p) => p.stage === "live");
    },
    backstage(): StudioParticipant[] {
      return this.list.filter((p) => p.stage === "backstage");
    },
    raisedHands(): StudioParticipant[] {
      return this.backstage.filter((p) => p.raisedHand === true);
    },
    host(): StudioParticipant | null {
      return this.list.find((p) => p.role === "host") ?? null;
    },
  },
  actions: {
    /** Replace the entire map from a fresh clasp snapshot. */
    replaceAll(next: Record<string, ParticipantEntry | null | undefined>) {
      const out: Record<string, StudioParticipant> = {};
      for (const [pid, entry] of Object.entries(next)) {
        if (!entry) continue;
        out[pid] = { ...entry, pid };
      }
      this.all = out;
    },
    /** Upsert a single entry. Called by the projection on a per-pid change. */
    upsert(pid: string, entry: ParticipantEntry | null) {
      if (entry == null) {
        const { [pid]: _, ...rest } = this.all;
        this.all = rest;
        return;
      }
      this.all = { ...this.all, [pid]: { ...entry, pid } };
    },
  },
});
