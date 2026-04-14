<!--
  commoncast / SceneButton — full-width scene preset button with number, name, shortcut.
-->
<script setup lang="ts">
defineProps<{
  index: number;
  name: string;
  shortcut?: string;
  active?: boolean;
}>();

defineEmits<{ (e: "select"): void }>();
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 border-l-[3px] bg-[var(--cc-chalk)] px-3 py-3 text-left transition-[transform,box-shadow,border-color] duration-[var(--cc-dur-fast)] ease-[var(--cc-ease-snappy)] hover:-translate-y-[1px] hover:shadow-[var(--cc-shadow-sm)]"
    :class="
      active
        ? 'border-l-[var(--cc-signal)] bg-[var(--cc-chalk-warm)]'
        : 'border-l-transparent'
    "
    @click="$emit('select')"
  >
    <span
      class="inline-flex h-6 w-6 items-center justify-center rounded-[var(--cc-radius-sm)] bg-[var(--cc-soot)] font-ui text-[9px] text-[var(--cc-chalk)]"
    >
      {{ index }}
    </span>
    <span class="flex-1 font-display text-[13px] font-semibold text-[var(--cc-ink)]">
      {{ name }}
    </span>
    <span
      v-if="shortcut"
      class="font-ui text-[9px] uppercase text-[var(--cc-ink-muted)]"
    >
      {{ shortcut }}
    </span>
  </button>
</template>
