/**
 * useStudioChat — projection of the clasp room's chat addresses into
 * the chat Pinia store + higher-level send / feature / clear actions.
 *
 * Architecture:
 *   - subscribe to /studio/{id}/chat/* wildcard; push each incoming
 *     message into useChatStore
 *   - subscribe to /studio/{id}/chat/featured; mirror into the store
 *     so UI + compositor both read from a single source
 *   - sendMessage(text): writes a new ChatMessage to
 *     addresses.chatMessage(studioId, id)
 *   - featureMessage(id) (host-only): writes the id to
 *     addresses.chatFeatured; schedules an 8-second auto-clear (the
 *     host is the clock, not every client, so we don't race on who
 *     clears first)
 *   - clearFeatured() (host-only): cancels any pending timer and
 *     writes null to the featured address
 *
 * CLAUDE.md §3: no media here, no reactive boxes around live timers —
 * plain closure state.
 */
import { onMounted, onScopeDispose } from "vue";
import { useNuxtApp } from "#app";
import {
  addresses,
  type ChatMessage,
  type ClaspClient,
} from "@commoncast/clasp-client";
import { useChatStore } from "~/stores/chat";

export interface UseStudioChatOptions {
  studioId: string;
  myPid: string;
  myName: string;
  role: "host" | "guest";
}

export interface UseStudioChatReturn {
  sendMessage(text: string): Promise<void>;
  featureMessage(id: string): Promise<void>;
  clearFeatured(): Promise<void>;
}

const AUTO_CLEAR_MS = 8000;

export function useStudioChat(
  opts: UseStudioChatOptions,
): UseStudioChatReturn {
  const store = useChatStore();
  const nuxt = useNuxtApp();
  const clasp = nuxt.$clasp as ClaspClient;

  let unsubMessages: (() => void) | null = null;
  let unsubFeatured: (() => void) | null = null;
  let autoClearTimer: ReturnType<typeof setTimeout> | null = null;

  onMounted(() => {
    // When a client re-mounts (HMR, route change), start from a clean
    // slate — stale messages from a previous session would mislead the
    // UI about what's really live in the room.
    store.reset();

    const wildcard = addresses.chatMessagesWildcard(opts.studioId);
    const prefix = `${addresses.studioRoot(opts.studioId)}/chat/`;

    unsubMessages = clasp.on(wildcard, (value, address) => {
      // Filter out the featured subresource — it lives on the same
      // wildcard (/chat/featured) and is a bare id string, not a
      // ChatMessage.
      if (address.endsWith("/chat/featured")) return;
      if (value == null) {
        // clasp treats null as delete — mirror into the store.
        const id = address.slice(prefix.length);
        if (id) store.remove(id);
        return;
      }
      const msg = value as Partial<ChatMessage>;
      if (!msg?.id || typeof msg.id !== "string") return;
      if (typeof msg.text !== "string") return;
      store.upsert({
        id: msg.id,
        fromPid: msg.fromPid ?? "unknown",
        fromName: msg.fromName ?? "Guest",
        text: msg.text,
        platform: msg.platform ?? "commoncast",
        sentAt: msg.sentAt ?? Date.now(),
      });
    });

    unsubFeatured = clasp.on(
      addresses.chatFeatured(opts.studioId),
      (value) => {
        if (typeof value === "string") store.setFeatured(value);
        else store.setFeatured(null);
      },
    );
  });

  async function sendMessage(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const msg: ChatMessage = {
      id,
      fromPid: opts.myPid,
      fromName: opts.myName,
      text: trimmed,
      platform: "commoncast",
      sentAt: Date.now(),
    };
    await clasp.set(addresses.chatMessage(opts.studioId, id), msg);
  }

  function cancelAutoClear() {
    if (autoClearTimer) {
      clearTimeout(autoClearTimer);
      autoClearTimer = null;
    }
  }

  async function featureMessage(id: string): Promise<void> {
    if (opts.role !== "host") {
      console.warn("[commoncast] featureMessage ignored: host-only");
      return;
    }
    await clasp.set(addresses.chatFeatured(opts.studioId), id);
    cancelAutoClear();
    autoClearTimer = setTimeout(() => {
      void clasp.set(addresses.chatFeatured(opts.studioId), null);
      autoClearTimer = null;
    }, AUTO_CLEAR_MS);
  }

  async function clearFeatured(): Promise<void> {
    if (opts.role !== "host") return;
    cancelAutoClear();
    await clasp.set(addresses.chatFeatured(opts.studioId), null);
  }

  onScopeDispose(() => {
    cancelAutoClear();
    unsubMessages?.();
    unsubFeatured?.();
  });

  return { sendMessage, featureMessage, clearFeatured };
}
