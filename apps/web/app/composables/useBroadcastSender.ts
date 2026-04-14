/**
 * useBroadcastSender — thin single-instance Vue wrapper around
 * createBroadcastSender from ./broadcastSender. Kept for callers that
 * only need to talk to one destination (the receive page's reverse
 * flow, ad-hoc dev tests, etc).
 *
 * For multi-destination fanout use useBroadcastFanout instead — that's
 * what the studio page wires to studio.isLive.
 */
import { onScopeDispose, readonly, ref, type Ref } from "vue";
import { useNuxtApp } from "#app";
import type { ClaspClient } from "@commoncast/clasp-client";
import {
  createBroadcastSender,
  type BroadcastSenderState,
} from "./broadcastSender";

export type { BroadcastSenderState };

export interface UseBroadcastSenderReturn {
  readonly state: Readonly<Ref<BroadcastSenderState>>;
  publish(opts: {
    studioId: string;
    destAddr: string;
    stream: MediaStream;
  }): Promise<void>;
  close(): void;
}

export function useBroadcastSender(): UseBroadcastSenderReturn {
  const nuxt = useNuxtApp();
  const clasp = nuxt.$clasp as ClaspClient;
  const inner = createBroadcastSender(clasp);

  const state = ref<BroadcastSenderState>("idle");
  const unsub = inner.onStateChange((s) => {
    state.value = s;
  });

  onScopeDispose(() => {
    unsub();
    inner.close();
  });

  return {
    state: readonly(state) as Readonly<Ref<BroadcastSenderState>>,
    publish: inner.publish.bind(inner),
    close: inner.close.bind(inner),
  };
}
