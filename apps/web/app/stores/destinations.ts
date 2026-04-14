/**
 * Pinia / destinations — broadcast destinations.
 *
 * Each destination is a named target the studio's composite output can
 * be published to. For MVP, every destination is kind: "clasp-addr",
 * meaning the destAddr is a clasp address any subscribed receiver
 * (e.g. /receive/{addr}) can pick up. Future slices add "rtmp" and
 * "lvqr" kinds; until then the union is narrow and the union branch
 * switches are trivial.
 *
 * Persisted via the pinia-persist plugin so user destination edits
 * survive reloads (see plugins/pinia-persist.client.ts).
 */
import { defineStore } from "pinia";

export type DestinationKind = "clasp-addr";

export interface Destination {
  id: string;
  name: string;
  kind: DestinationKind;
  /** The clasp destAddr leg of broadcastOut(studioId, destAddr). */
  addr: string;
  /**
   * When true, the fanout publishes to this destination whenever the
   * studio goes live. Users can toggle individual destinations on or
   * off without removing them.
   */
  auto: boolean;
}

export const useDestinationsStore = defineStore("destinations", {
  state: () => ({
    all: {} as Record<string, Destination>,
    order: [] as string[],
    /** Once true, seedDefaults won't run again even if `all` goes empty. */
    seeded: false,
  }),
  getters: {
    list(state): Destination[] {
      return state.order
        .map((id) => state.all[id])
        .filter((d): d is Destination => d != null);
    },
    autoList(): Destination[] {
      return this.list.filter((d) => d.auto);
    },
    count(state): number {
      return state.order.length;
    },
  },
  actions: {
    /**
     * Install a default "test" destination the first time the studio
     * loads. Idempotent; once `seeded` is true we never auto-create
     * another one (even after the user deletes everything).
     */
    seedDefaults() {
      if (this.seeded) return;
      this.seeded = true;
      if (this.order.length > 0) return;
      this.add({
        id: "default",
        name: "Test receiver",
        kind: "clasp-addr",
        addr: "test",
        auto: true,
      });
    },
    add(dest: Destination) {
      this.all = { ...this.all, [dest.id]: dest };
      if (!this.order.includes(dest.id)) {
        this.order = [...this.order, dest.id];
      }
    },
    update(id: string, patch: Partial<Destination>) {
      const existing = this.all[id];
      if (!existing) return;
      this.all = { ...this.all, [id]: { ...existing, ...patch } };
    },
    remove(id: string) {
      if (!(id in this.all)) return;
      const { [id]: _removed, ...rest } = this.all;
      this.all = rest;
      this.order = this.order.filter((o) => o !== id);
    },
  },
});
