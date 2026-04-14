<!--
  ChatPanel — the chat UI tab inside ControlsPanel.

  Responsibilities:
    - subscribe-mounted ChatMessage list scrolling to bottom on new
      messages (with a small "stick to bottom" heuristic so the
      host can scroll up to read without being yanked back)
    - a send form for the current participant
    - a host-only "Feature on stream" action per message (reuses the
      `@feature` event from the presentational ChatMessage primitive)
    - a currently-featured banner with a Clear button (host only) so
      the host can see what's on-air and dismiss early

  Zero business logic in this component beyond calling the chat
  facade on the StudioContext. The DS ChatMessage component is pure
  presentation and already emits `feature`.
-->
<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { ChatMessage as ChatMessageRow } from "@commoncast/design-system";
import { useStudioContext } from "~/composables/useStudioContext";
import { useChatStore } from "~/stores/chat";
import { useToasts } from "~/composables/useToasts";

const ctx = useStudioContext();
const store = useChatStore();
const toasts = useToasts();

const list = computed(() => store.list);
const featured = computed(() => store.featured);
const isHost = computed(() => ctx.role === "host");

const draft = ref("");
const listRef = ref<HTMLElement | null>(null);
const stickyBottom = ref(true);

function handleScroll() {
  const el = listRef.value;
  if (!el) return;
  // "Close enough to bottom" → keep sticking; else let the user read.
  const distanceFromBottom =
    el.scrollHeight - el.scrollTop - el.clientHeight;
  stickyBottom.value = distanceFromBottom < 40;
}

async function scrollToBottomIfSticky() {
  if (!stickyBottom.value) return;
  await nextTick();
  const el = listRef.value;
  if (el) el.scrollTop = el.scrollHeight;
}

watch(
  () => list.value.length,
  () => {
    void scrollToBottomIfSticky();
  },
);

async function send() {
  const text = draft.value.trim();
  if (!text) return;
  const originalDraft = draft.value;
  draft.value = "";
  try {
    await ctx.chat.sendMessage(text);
  } catch (err) {
    // Restore the draft so the user doesn't lose what they typed
    draft.value = originalDraft;
    toasts.error({
      title: "Message didn't send",
      description: (err as Error).message || "Network or relay error",
    });
  }
  stickyBottom.value = true;
  await scrollToBottomIfSticky();
}

async function featureMessage(id: string) {
  try {
    await ctx.chat.featureMessage(id);
  } catch (err) {
    toasts.error({
      title: "Couldn't feature message",
      description: (err as Error).message,
    });
  }
}
async function clearFeatured() {
  try {
    await ctx.chat.clearFeatured();
  } catch (err) {
    toasts.error({
      title: "Couldn't clear featured message",
      description: (err as Error).message,
    });
  }
}
</script>

<template>
  <div class="flex h-full flex-col gap-2">
    <!-- Currently featured banner (host has a clear button) -->
    <div
      v-if="featured"
      class="flex items-start gap-2 border border-[var(--cc-signal)] bg-[var(--cc-signal-dim)] p-2"
    >
      <div class="flex min-w-0 flex-1 flex-col">
        <span class="font-ui text-[8.5px] uppercase tracking-[0.12em] text-[var(--cc-signal)]">
          Featured on stream
        </span>
        <span class="mt-1 truncate font-display text-[12px] font-semibold text-[var(--cc-ink)]">
          {{ featured.fromName }}
        </span>
        <p class="mt-1 line-clamp-2 font-body text-[12px] text-[var(--cc-ink-soft)]">
          {{ featured.text }}
        </p>
      </div>
      <button
        v-if="isHost"
        type="button"
        class="shrink-0 border border-[var(--cc-signal)] bg-[var(--cc-chalk)] px-2 py-[2px] font-ui text-[8.5px] uppercase tracking-[0.12em] text-[var(--cc-signal)] transition-colors hover:bg-[var(--cc-signal)] hover:text-white"
        @click="clearFeatured"
      >
        Clear
      </button>
    </div>

    <!-- Message list -->
    <div
      ref="listRef"
      class="flex-1 overflow-y-auto border border-[color:var(--cc-border)] bg-[var(--cc-chalk)]"
      @scroll="handleScroll"
    >
      <div
        v-if="list.length === 0"
        class="flex h-full items-center justify-center p-6 text-center font-ui text-[9px] uppercase tracking-[0.1em] text-[var(--cc-ink-ghost)]"
      >
        No messages yet.<br />Start the conversation.
      </div>
      <ChatMessageRow
        v-for="msg in list"
        :key="msg.id"
        :username="msg.fromName"
        :platform="msg.platform"
        :text="msg.text"
        :featured="store.featuredId === msg.id"
        @feature="featureMessage(msg.id)"
      />
    </div>

    <!-- Send form -->
    <form class="flex items-stretch gap-0" @submit.prevent="send">
      <input
        v-model="draft"
        type="text"
        placeholder="Say something…"
        class="min-w-0 flex-1 border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] px-2.5 py-2 font-body text-[12px] text-[var(--cc-ink)] placeholder:text-[var(--cc-ink-whisper)] focus:border-[var(--cc-signal)] focus:outline-none"
        maxlength="500"
      />
      <button
        type="submit"
        :disabled="!draft.trim()"
        class="shrink-0 border border-l-0 border-[color:var(--cc-border-strong)] bg-[var(--cc-soot)] px-3 font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--cc-chalk)] transition-colors hover:bg-[var(--cc-soot-mid)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Send
      </button>
    </form>
  </div>
</template>
