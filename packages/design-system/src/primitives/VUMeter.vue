<!--
  commoncast / VUMeter — flat horizontal level bar with a decaying peak tick.

  Inputs `level` and `peak` are 0..1 RMS values (typical speech sits around
  0.05–0.25, peaks around 0.4). We apply a gentle gain so normal conversation
  lights up most of the bar. Color gates: live → caution → signal as the
  signal approaches clipping, matching the token palette.
-->
<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    level: number;
    peak?: number;
    /** Multiplier applied before mapping to the 0–100% bar width. */
    gain?: number;
    height?: number;
  }>(),
  { gain: 1.4, height: 6, peak: 0 },
);

function clampPct(v: number): number {
  const scaled = Math.min(1, Math.max(0, v * props.gain));
  return Math.round(scaled * 100);
}

const levelPct = computed(() => clampPct(props.level));
const peakPct = computed(() => clampPct(props.peak));
const stage = computed(() => {
  const v = levelPct.value;
  if (v >= 85) return "hot";
  if (v >= 55) return "warm";
  return "cool";
});
</script>

<template>
  <div
    class="relative w-full overflow-hidden border border-[color:var(--cc-border-strong)] bg-[var(--cc-ink-whisper)]"
    :style="{ height: `${height}px` }"
    role="meter"
    :aria-valuenow="levelPct"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div
      class="absolute inset-y-0 left-0 transition-[width] duration-[100ms] ease-linear"
      :style="{ width: `${levelPct}%` }"
      :class="{
        'bg-[var(--cc-live)]': stage === 'cool',
        'bg-[var(--cc-caution)]': stage === 'warm',
        'bg-[var(--cc-signal)]': stage === 'hot',
      }"
    />
    <div
      v-if="peak > 0"
      class="absolute top-0 bottom-0 w-[2px] bg-[var(--cc-ink)] opacity-80"
      :style="{ left: `calc(${peakPct}% - 1px)` }"
    />
  </div>
</template>
