<!--
  Guest join page. Guests land here from an invite link, pick devices, and join the studio.
-->
<script setup lang="ts">
import { ref } from "vue";
import { Button, Input, Toggle } from "@commoncast/design-system";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const studioId = String(route.params.id ?? "default");

const name = ref("");
const camera = ref(true);
const mic = ref(true);
const screen = ref(false);

function join() {
  if (!name.value.trim()) return;
  router.push(`/studios/${studioId}?guest=${encodeURIComponent(name.value)}`);
}
</script>

<template>
  <section class="mx-auto flex min-h-full max-w-[520px] flex-col items-center justify-center p-8">
    <div
      class="w-full border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] p-8 shadow-[var(--cc-shadow-md)]"
    >
      <div class="flex items-center gap-2 font-ui text-[11px] uppercase tracking-wider text-[var(--cc-ink-muted)]">
        <span class="h-2 w-2 rounded-full bg-[var(--cc-signal)]" />
        commoncast
      </div>
      <h1 class="mt-3 font-display text-[26px] font-semibold text-[var(--cc-ink)]">
        Join the studio
      </h1>
      <p class="mt-1 font-body text-[13px] text-[var(--cc-ink-muted)]">
        Studio <span class="font-code">{{ studioId }}</span> — hosted on commoncast
      </p>

      <div class="mt-6 aspect-video w-full bg-[var(--cc-soot)]" />

      <div class="mt-6 flex flex-col gap-4">
        <Input v-model="name" label="Your name" placeholder="How should we introduce you?" />
        <div class="flex items-center justify-between">
          <span class="font-ui text-[9px] uppercase text-[var(--cc-ink-muted)]">Camera</span>
          <Toggle v-model="camera" />
        </div>
        <div class="flex items-center justify-between">
          <span class="font-ui text-[9px] uppercase text-[var(--cc-ink-muted)]">Microphone</span>
          <Toggle v-model="mic" />
        </div>
        <div class="flex items-center justify-between">
          <span class="font-ui text-[9px] uppercase text-[var(--cc-ink-muted)]">Screen share</span>
          <Toggle v-model="screen" />
        </div>
      </div>

      <Button variant="live" block class="mt-6" @click="join">Join studio</Button>
      <p class="mt-4 text-center font-ui text-[9px] uppercase text-[var(--cc-ink-muted)]">
        No account needed · Powered by CommonCast · WebRTC + CLASP
      </p>
    </div>
  </section>
</template>
