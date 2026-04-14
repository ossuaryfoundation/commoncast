<!--
  commoncast / PanelHeader — label on the left, optional action button on the right.
-->
<script setup lang="ts">
defineProps<{ title: string; actionLabel?: string }>();

defineEmits<{ (e: "action"): void }>();
</script>

<template>
  <div
    class="flex items-center justify-between border-b border-[color:var(--cc-border)] px-4 py-3"
  >
    <span class="font-ui text-[11px] uppercase tracking-wide text-[var(--cc-ink-muted)]">
      {{ title }}
    </span>
    <button
      v-if="actionLabel"
      type="button"
      class="font-ui text-[9px] uppercase text-[var(--cc-signal)] hover:text-[var(--cc-signal-hover)]"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>
