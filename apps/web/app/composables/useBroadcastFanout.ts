/**
 * useBroadcastFanout — manages N concurrent broadcast senders keyed by
 * destination id. Reads the destinations Pinia store; each auto-enabled
 * destination gets its own BroadcastSender instance (one RTCPeerConnection
 * + clasp subscription pair) that publishes the composite output stream
 * to its individual clasp destAddr.
 *
 * Responsibilities:
 *   - `goAll(studioId, stream)` — start publishing to every auto
 *     destination in the store; remembers the stream + studioId so
 *     later store mutations can reuse them.
 *   - `stopAll()` — close every sender.
 *   - Watches the auto list — while streaming, destinations toggled on
 *     start publishing immediately; destinations toggled off close
 *     their sender. Adding a new destination while live also publishes
 *     to it right away.
 *   - `aggregate` — computed composite state for the whole fanout
 *     ("connected" if any is connected; "negotiating" if any is; etc).
 *     This is what the toolbar chip and status bar read.
 *   - `states` — per-destination state map so the drawer can show a
 *     status dot next to each row.
 *
 * CLAUDE.md §3 compliance: the live RTCPeerConnections and clasp
 * subscriptions live in plain Map/closure state, never in reactive
 * proxies. The reactive surface is the scalar derived state.
 */
import { computed, onScopeDispose, ref, shallowRef, watch, type Ref } from "vue";
import { useNuxtApp } from "#app";
import type { ClaspClient } from "@commoncast/clasp-client";
import {
  createBroadcastSender,
  type BroadcastSender,
  type BroadcastSenderState,
} from "./broadcastSender";
import { useDestinationsStore } from "~/stores/destinations";

export interface UseBroadcastFanoutReturn {
  /** Per-destination state, keyed by destination id. */
  readonly states: Ref<Record<string, BroadcastSenderState>>;
  /** Composite state across all live senders. */
  readonly aggregate: Ref<BroadcastSenderState>;
  /** True while goAll has been called and stopAll hasn't yet. */
  readonly streaming: Ref<boolean>;
  /** Count of destinations currently in "connected" state. */
  readonly connectedCount: Ref<number>;
  /** Total count of destinations we're trying to stream to right now. */
  readonly activeCount: Ref<number>;
  goAll(studioId: string, stream: MediaStream): Promise<void>;
  stopAll(): void;
}

export function useBroadcastFanout(): UseBroadcastFanoutReturn {
  const nuxt = useNuxtApp();
  const clasp = nuxt.$clasp as ClaspClient;
  const store = useDestinationsStore();

  const senders = new Map<string, BroadcastSender>();
  const unsubs = new Map<string, () => void>();

  const states = ref<Record<string, BroadcastSenderState>>({});
  const streaming = ref(false);
  const lastStream = shallowRef<MediaStream | null>(null);
  const lastStudioId = ref<string>("");

  function ensureSender(destId: string): BroadcastSender {
    let existing = senders.get(destId);
    if (existing) return existing;
    existing = createBroadcastSender(clasp);
    senders.set(destId, existing);
    const unsub = existing.onStateChange((s) => {
      states.value = { ...states.value, [destId]: s };
    });
    unsubs.set(destId, unsub);
    return existing;
  }

  async function startDest(destId: string): Promise<void> {
    const dest = store.all[destId];
    if (!dest) return;
    if (!lastStream.value || !lastStudioId.value) return;
    const sender = ensureSender(destId);
    try {
      await sender.publish({
        studioId: lastStudioId.value,
        destAddr: dest.addr,
        stream: lastStream.value,
      });
    } catch (err) {
      console.error("[commoncast] destination publish failed", dest.id, err);
    }
  }

  function stopDest(destId: string): void {
    const sender = senders.get(destId);
    if (!sender) return;
    sender.close();
  }

  async function goAll(studioId: string, stream: MediaStream): Promise<void> {
    streaming.value = true;
    lastStudioId.value = studioId;
    lastStream.value = stream;
    const autos = store.list.filter((d) => d.auto);
    if (autos.length === 0) {
      console.warn(
        "[commoncast] goAll called but no destinations are marked auto",
      );
    }
    await Promise.all(autos.map((d) => startDest(d.id)));
  }

  function stopAll(): void {
    streaming.value = false;
    for (const destId of Array.from(senders.keys())) stopDest(destId);
  }

  // Live reaction: while we're streaming, mirror the destinations store
  // onto the running senders. New auto destinations start publishing
  // right away; un-auto'd or removed destinations close.
  watch(
    () => store.list.filter((d) => d.auto).map((d) => d.id),
    async (nextIds, prevIds) => {
      if (!streaming.value) return;
      const prev = prevIds ?? [];
      for (const id of prev) {
        if (!nextIds.includes(id)) stopDest(id);
      }
      for (const id of nextIds) {
        if (prev.includes(id)) continue;
        await startDest(id);
      }
    },
  );

  // Tear down senders for destinations that have been fully removed
  // from the store (as opposed to just un-auto'd) so we don't leak
  // closures for dead ids.
  watch(
    () => new Set(store.order),
    (nextIds) => {
      for (const id of Array.from(senders.keys())) {
        if (nextIds.has(id)) continue;
        senders.get(id)?.close();
        senders.delete(id);
        unsubs.get(id)?.();
        unsubs.delete(id);
        const { [id]: _removed, ...rest } = states.value;
        states.value = rest;
      }
    },
  );

  const aggregate = computed<BroadcastSenderState>(() => {
    const entries = Object.values(states.value);
    if (entries.length === 0) return "idle";
    if (entries.some((s) => s === "connected")) return "connected";
    if (entries.some((s) => s === "negotiating")) return "negotiating";
    if (entries.every((s) => s === "failed")) return "failed";
    if (entries.every((s) => s === "closed" || s === "idle")) return "idle";
    return "negotiating";
  });

  const connectedCount = computed(
    () => Object.values(states.value).filter((s) => s === "connected").length,
  );
  const activeCount = computed(
    () =>
      Object.values(states.value).filter(
        (s) => s === "connected" || s === "negotiating",
      ).length,
  );

  onScopeDispose(() => {
    stopAll();
    for (const u of unsubs.values()) {
      try {
        u();
      } catch {
        // ignore
      }
    }
    unsubs.clear();
    senders.clear();
  });

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      stopAll();
      for (const u of unsubs.values()) {
        try {
          u();
        } catch {
          // ignore
        }
      }
      unsubs.clear();
      senders.clear();
    });
  }

  return {
    states,
    aggregate,
    streaming,
    connectedCount,
    activeCount,
    goAll,
    stopAll,
  };
}
