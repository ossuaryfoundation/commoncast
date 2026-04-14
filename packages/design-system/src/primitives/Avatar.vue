<!--
  commoncast / Avatar — initials circle with optional speaking ring.
-->
<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  initials: string;
  color?: string;
  size?: number;
  speaking?: boolean;
}>();

const bg = computed(() => props.color ?? "var(--cc-ink-muted)");
const dim = computed(() => `${props.size ?? 32}px`);
</script>

<template>
  <span
    :style="{
      width: dim,
      height: dim,
      background: bg,
    }"
    class="relative inline-flex items-center justify-center rounded-full font-display text-[13px] font-semibold text-white select-none"
  >
    {{ initials }}
    <span
      v-if="speaking"
      class="pointer-events-none absolute inset-[-3px] rounded-full border-2 border-[var(--cc-live)]"
      style="animation: cc-pulse-ring 0.6s ease infinite alternate"
    />
  </span>
</template>
