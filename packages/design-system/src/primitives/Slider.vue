<!--
  commoncast / Slider — single-handle horizontal range input.

  Flat editorial aesthetic: a 2px base track, a filled segment from min
  to the current value, and a small square thumb. Uses a real <input
  type="range"> under the hood for a11y + keyboard + touch handling,
  styled to match with ::-webkit-slider-thumb / ::-moz-range-thumb in
  a scoped <style>.

  Presentational only: takes v-model:number + min/max/step/disabled +
  an optional label and hint. Emits no business logic.
-->
<script setup lang="ts">
import { computed } from "vue";

const model = defineModel<number>({ default: 0 });

const props = withDefaults(
  defineProps<{
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    hint?: string;
    disabled?: boolean;
    /** Render the value readout on the right of the label row. */
    showValue?: boolean;
    /** Custom value formatter. */
    format?: (v: number) => string;
  }>(),
  { min: 0, max: 1, step: 0.01, showValue: true },
);

const fillPct = computed(() => {
  const span = props.max - props.min;
  if (span <= 0) return 0;
  return Math.max(0, Math.min(100, ((model.value - props.min) / span) * 100));
});

const displayValue = computed(() =>
  props.format ? props.format(model.value) : model.value.toFixed(2),
);
</script>

<template>
  <label class="flex flex-col gap-1">
    <span
      v-if="label || showValue"
      class="flex items-center justify-between gap-2"
    >
      <span
        v-if="label"
        class="font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--cc-ink-muted)]"
      >{{ label }}</span>
      <span
        v-if="showValue"
        class="font-ui text-[9px] tabular-nums text-[var(--cc-ink-ghost)]"
      >{{ displayValue }}</span>
    </span>

    <span class="cc-slider-wrap relative block h-[14px]" :class="disabled ? 'opacity-50' : ''">
      <span
        class="pointer-events-none absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-[var(--cc-chalk-deep)]"
      />
      <span
        class="pointer-events-none absolute top-1/2 left-0 h-[2px] -translate-y-1/2 bg-[var(--cc-ink)]"
        :style="{ width: `${fillPct}%` }"
      />
      <input
        v-model.number="model"
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        class="cc-slider-input absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent focus:outline-none"
      />
    </span>

    <span
      v-if="hint"
      class="font-ui text-[8px] uppercase tracking-[0.1em] text-[var(--cc-ink-ghost)]"
    >{{ hint }}</span>
  </label>
</template>

<style scoped>
.cc-slider-input {
  -webkit-appearance: none;
}
.cc-slider-input::-webkit-slider-runnable-track {
  height: 100%;
  background: transparent;
}
.cc-slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 14px;
  background: var(--cc-ink);
  border: 1px solid var(--cc-chalk);
  box-shadow: 1px 1px 0 rgba(28, 27, 26, 0.2);
  cursor: pointer;
  margin-top: 0;
  transition: background var(--cc-dur-fast);
}
.cc-slider-input:hover::-webkit-slider-thumb,
.cc-slider-input:focus-visible::-webkit-slider-thumb {
  background: var(--cc-signal);
}
.cc-slider-input::-moz-range-track {
  height: 100%;
  background: transparent;
}
.cc-slider-input::-moz-range-thumb {
  width: 10px;
  height: 14px;
  background: var(--cc-ink);
  border: 1px solid var(--cc-chalk);
  cursor: pointer;
  border-radius: 0;
}
.cc-slider-input:hover::-moz-range-thumb,
.cc-slider-input:focus-visible::-moz-range-thumb {
  background: var(--cc-signal);
}
</style>
