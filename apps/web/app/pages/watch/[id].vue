<!--
  Public viewer page. MVP: static frame + placeholder chat.
-->
<script setup lang="ts">
import { Badge, ChatMessage, StatusDot } from "@commoncast/design-system";
import { ref } from "vue";

const messages = ref([
  { id: "1", username: "jamie", platform: "youtube" as const, text: "love the palette, very commoncast energy" },
  { id: "2", username: "sam", platform: "twitch" as const, text: "where can I self-host a relay?" },
  { id: "3", username: "asha", platform: "commoncast" as const, text: "clasp addresses are so clean for scene state" },
]);
const draft = ref("");

function send() {
  if (!draft.value.trim()) return;
  messages.value.push({
    id: String(Date.now()),
    username: "you",
    platform: "commoncast",
    text: draft.value,
  });
  draft.value = "";
}
</script>

<template>
  <section class="mx-auto grid max-w-[1200px] grid-cols-[1fr_320px] gap-4 p-8">
    <div>
      <div class="aspect-video bg-[var(--cc-soot)]" />
      <div class="mt-4 flex items-center justify-between">
        <h1 class="font-display text-[22px] font-semibold text-[var(--cc-ink)]">
          Open Source Streaming Workshop
        </h1>
        <Badge variant="live">
          <StatusDot status="live" pulse /> Live
        </Badge>
      </div>
    </div>

    <aside class="flex h-full flex-col border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)]">
      <div class="flex items-center justify-between border-b border-[color:var(--cc-border)] px-4 py-3">
        <span class="font-ui text-[11px] uppercase tracking-wider text-[var(--cc-ink-muted)]">
          Chat
        </span>
        <span class="font-code text-[10px] text-[var(--cc-ink-muted)]">47 viewers</span>
      </div>
      <div class="flex-1 overflow-y-auto">
        <ChatMessage
          v-for="m in messages"
          :key="m.id"
          :username="m.username"
          :platform="m.platform"
          :text="m.text"
        />
      </div>
      <form
        class="flex items-center gap-2 border-t border-[color:var(--cc-border)] p-3"
        @submit.prevent="send"
      >
        <input
          v-model="draft"
          class="flex-1 border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk-warm)] px-3 py-2 font-body text-[13px] focus:border-[var(--cc-signal)] focus:outline-none"
          placeholder="Say something…"
        />
        <button
          type="submit"
          class="bg-[var(--cc-signal)] px-3 py-2 font-ui text-[9px] uppercase text-white"
        >
          Send
        </button>
      </form>
    </aside>
  </section>
</template>
