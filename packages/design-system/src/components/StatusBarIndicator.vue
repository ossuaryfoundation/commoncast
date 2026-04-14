<!--
  commoncast / StatusBarIndicator — dot + label + value for the bottom status bar.
-->
<script setup lang="ts">
import StatusDot from "../primitives/StatusDot.vue";

defineProps<{
  status: "live" | "signal" | "caution" | "info" | "offline";
  label: string;
  value?: string;
  pulse?: boolean;
}>();
</script>

<template>
  <span class="inline-flex items-center gap-[6px] font-ui text-[9px] uppercase text-[var(--cc-chalk)]">
    <StatusDot :status="status" :pulse="pulse" />
    <span class="text-[var(--cc-chalk)]">{{ label }}</span>
    <span
      v-if="value"
      class="font-code text-[9px] text-[var(--cc-ink-whisper)]"
    >
      {{ value }}
    </span>
  </span>
</template>
