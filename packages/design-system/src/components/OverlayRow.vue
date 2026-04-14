<!--
  commoncast / OverlayRow — label + description + toggle switch.
-->
<script setup lang="ts">
import Toggle from "../primitives/Toggle.vue";

defineProps<{
  label: string;
  description?: string;
}>();

const model = defineModel<boolean>({ default: false });
</script>

<template>
  <div
    class="flex items-center justify-between gap-3 border-b border-[color:var(--cc-border)] py-3 last:border-b-0"
  >
    <div class="flex flex-col">
      <span class="font-display text-[13px] font-semibold text-[var(--cc-ink)]">
        {{ label }}
      </span>
      <span
        v-if="description"
        class="font-ui text-[9px] uppercase text-[var(--cc-ink-muted)]"
      >
        {{ description }}
      </span>
    </div>
    <Toggle v-model="model" :aria-label="label" />
  </div>
</template>
