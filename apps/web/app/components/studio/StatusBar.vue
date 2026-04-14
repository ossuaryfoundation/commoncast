<script setup lang="ts">
import { StatusBarIndicator } from "@commoncast/design-system";
import { usePrefsStore } from "~/stores/prefs";

const prefs = usePrefsStore();
</script>

<template>
  <footer
    class="flex h-8 items-center gap-6 border-t border-[var(--cc-soot-mid)] bg-[var(--cc-soot)] px-4"
  >
    <StatusBarIndicator status="live" label="CLASP" :value="prefs.claspRelayUrl" />
    <StatusBarIndicator status="caution" label="LVQR" value="—" />
    <StatusBarIndicator status="live" label="WebRTC" value="0 peers" />
    <StatusBarIndicator status="offline" label="Rec" value="—" />
    <span class="ml-auto font-ui text-[9px] uppercase text-[var(--cc-ink-ghost)]">
      commoncast v0.0.0
    </span>
  </footer>
</template>
