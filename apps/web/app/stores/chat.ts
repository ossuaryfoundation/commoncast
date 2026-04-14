/**
 * Pinia / chat — ring-buffered chat messages projected from the clasp
 * room's chat wildcard.
 *
 * Not persisted (ephemeral live-session data). Capped at a fixed limit
 * so an abusive flood can't grow the store unboundedly. The composable
 * writes into this store; UI reads from it.
 */
import { defineStore } from "pinia";
import type { ChatMessage } from "@commoncast/clasp-client";

const HISTORY_LIMIT = 200;

export const useChatStore = defineStore("chat", {
  state: () => ({
    messages: {} as Record<string, ChatMessage>,
    /** Chronological order of message ids, oldest → newest. */
    order: [] as string[],
    /** The currently-featured message id, or null. */
    featuredId: null as string | null,
  }),
  getters: {
    list(state): ChatMessage[] {
      const out: ChatMessage[] = [];
      for (const id of state.order) {
        const msg = state.messages[id];
        if (msg) out.push(msg);
      }
      return out;
    },
    featured(state): ChatMessage | null {
      if (!state.featuredId) return null;
      return state.messages[state.featuredId] ?? null;
    },
    count(state): number {
      return state.order.length;
    },
  },
  actions: {
    upsert(msg: ChatMessage) {
      if (msg.id in this.messages) {
        this.messages = { ...this.messages, [msg.id]: msg };
        return;
      }
      const nextOrder = [...this.order, msg.id];
      const nextMessages: Record<string, ChatMessage> = {
        ...this.messages,
        [msg.id]: msg,
      };
      if (nextOrder.length > HISTORY_LIMIT) {
        const overflow = nextOrder.length - HISTORY_LIMIT;
        const dropped = nextOrder.splice(0, overflow);
        for (const id of dropped) delete nextMessages[id];
        // If the featured message aged out, clear the pointer.
        if (this.featuredId && dropped.includes(this.featuredId)) {
          this.featuredId = null;
        }
      }
      this.order = nextOrder;
      this.messages = nextMessages;
    },
    remove(id: string) {
      if (!(id in this.messages)) return;
      const { [id]: _drop, ...rest } = this.messages;
      this.messages = rest;
      this.order = this.order.filter((o) => o !== id);
      if (this.featuredId === id) this.featuredId = null;
    },
    setFeatured(id: string | null) {
      this.featuredId = id;
    },
    reset() {
      this.messages = {};
      this.order = [];
      this.featuredId = null;
    },
  },
});
