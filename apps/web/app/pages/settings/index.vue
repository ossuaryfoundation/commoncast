<script setup lang="ts">
import { Button, Input } from "@commoncast/design-system";
import { usePrefsStore } from "~/stores/prefs";
import { ref, watch } from "vue";

const prefs = usePrefsStore();
const relay = ref(prefs.claspRelayUrl);
watch(() => prefs.claspRelayUrl, (v) => (relay.value = v));

function save() {
  prefs.setRelayUrl(relay.value);
}
function reset() {
  prefs.resetRelayUrl();
  relay.value = prefs.claspRelayUrl;
}
</script>

<template>
  <section class="mx-auto max-w-[720px] px-8 py-10">
    <h1 class="font-display text-[34px] font-semibold text-[var(--cc-ink)]">Settings</h1>
    <p class="mt-1 font-body text-[14px] text-[var(--cc-ink-muted)]">
      Infrastructure &amp; destinations.
    </p>

    <section class="mt-10">
      <h2 class="font-ui text-[11px] uppercase tracking-wider text-[var(--cc-ink-muted)]">
        Clasp Relay
      </h2>
      <p class="mt-2 font-body text-[13px] text-[var(--cc-ink-soft)]">
        The WebSocket URL of the clasp relay used for signaling and state. Default is
        <span class="font-code">wss://relay.clasp.to</span>. Override with your own self-hosted relay for production.
      </p>
      <div class="mt-4 flex items-end gap-3">
        <Input v-model="relay" label="Relay URL" type="url" />
        <Button variant="primary" @click="save">Save</Button>
        <Button variant="ghost" @click="reset">Reset</Button>
      </div>
    </section>

    <section class="mt-10">
      <h2 class="font-ui text-[11px] uppercase tracking-wider text-[var(--cc-ink-muted)]">
        Destinations
      </h2>
      <p class="mt-2 font-body text-[13px] text-[var(--cc-ink-muted)]">
        External RTMP targets (YouTube, Twitch) and LVQR egress ship after MVP. For now you
        can broadcast composited video to any clasp address via the studio's Broadcast action.
      </p>
    </section>
  </section>
</template>
