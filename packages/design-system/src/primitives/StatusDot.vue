<!--
  commoncast / StatusDot — 6px dot with optional pulse animation.
-->
<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  status: "live" | "signal" | "caution" | "info" | "offline";
  pulse?: boolean;
  size?: number;
}>();

const color = computed(() => {
  switch (props.status) {
    case "live":
      return "var(--cc-live)";
    case "signal":
      return "var(--cc-signal)";
    case "caution":
      return "var(--cc-caution)";
    case "info":
      return "var(--cc-info)";
    case "offline":
      return "var(--cc-offline)";
  }
});

const glow = computed(() => {
  switch (props.status) {
    case "live":
      return "0 0 6px var(--cc-live-glow)";
    case "signal":
      return "0 0 6px var(--cc-signal-glow)";
    default:
      return "none";
  }
});
</script>

<template>
  <span
    :style="{
      width: `${size ?? 6}px`,
      height: `${size ?? 6}px`,
      background: color,
      boxShadow: glow,
      animation: pulse ? 'cc-pulse-dot 1.5s ease infinite' : undefined,
    }"
    class="inline-block rounded-full"
    aria-hidden="true"
  />
</template>
