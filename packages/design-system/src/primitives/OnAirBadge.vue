<!--
  commoncast / OnAirBadge — animated live indicator for the toolbar.
-->
<script setup lang="ts">
defineProps<{ live?: boolean }>();
</script>

<template>
  <span
    class="inline-flex items-center gap-2 rounded-[var(--cc-radius-md)] border border-[var(--cc-signal-strong)] bg-[var(--cc-signal)] px-3 py-[5px] font-ui text-[11px] font-semibold uppercase tracking-wide text-white"
    :style="live ? { animation: 'cc-onair-glow 1.5s ease infinite' } : undefined"
  >
    <span
      class="h-[6px] w-[6px] rounded-full bg-white"
      :style="live ? { animation: 'cc-blink 1s step-end infinite' } : undefined"
    />
    On Air
  </span>
</template>
