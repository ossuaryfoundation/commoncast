<!--
  commoncast / ColorSwatch — 24x24 click target for brand accent color picker.
-->
<script setup lang="ts">
defineProps<{
  color: string;
  active?: boolean;
  ariaLabel?: string;
}>();

defineEmits<{ (e: "select"): void }>();
</script>

<template>
  <button
    type="button"
    :aria-label="ariaLabel ?? color"
    :aria-pressed="active"
    :style="{ background: color }"
    class="h-6 w-6 rounded-[var(--cc-radius-sm)] border transition-shadow duration-[var(--cc-dur-fast)] ease-[var(--cc-ease-snappy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-signal)]"
    :class="
      active
        ? 'border-[var(--cc-ink)] shadow-[inset_0_0_0_2px_var(--cc-chalk),0_0_0_1px_var(--cc-ink)]'
        : 'border-[color:var(--cc-border-strong)] hover:border-[var(--cc-ink)]'
    "
    @click="$emit('select')"
  />
</template>
