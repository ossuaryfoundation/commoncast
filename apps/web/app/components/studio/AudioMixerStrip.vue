<!--
  Audio mixer strip — host-facing per-source faders.

  Reads live state from the host mixer via StudioContext. One row per
  audio source (local mic, remote peers), each with a mute toggle and a
  linear gain slider. The strip is pure glue — no business logic here
  beyond calling ctx.hostMixer methods on user input.

  The underlying AudioMixer (WebAudio graph) lives in the composable
  layer and is never read directly here. This component only ever sees
  a list of { id, label, gain, muted, kind } rows plus the master
  output meter level.
-->
<script setup lang="ts">
import { computed } from "vue";
import { Slider, VUMeter } from "@commoncast/design-system";
import { useStudioContext } from "~/composables/useStudioContext";

const ctx = useStudioContext();

const sources = computed(() => ctx.hostMixer.sources.value);
const levels = computed(() => ctx.hostMixer.levels.value);

function levelFor(id: string) {
  return levels.value[id]?.level ?? 0;
}
function peakFor(id: string) {
  return levels.value[id]?.peak ?? 0;
}

function onGain(id: string, v: number) {
  ctx.hostMixer.setGain(id, v);
}
function onToggleMute(id: string, next: boolean) {
  ctx.hostMixer.setMuted(id, next);
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <p class="font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--cc-ink-muted)]">
      Mixer
    </p>

    <div v-if="sources.length === 0" class="border border-dashed border-[color:var(--cc-border)] p-3 font-ui text-[9px] uppercase tracking-[0.1em] text-[var(--cc-ink-ghost)]">
      No audio sources yet. Start your mic or wait for a peer to join.
    </div>

    <div
      v-for="row in sources"
      :key="row.id"
      class="flex flex-col gap-2 border border-[color:var(--cc-border)] bg-[var(--cc-chalk)] p-2.5"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-2">
          <span
            class="shrink-0 border px-1 py-px font-ui text-[8px] uppercase tracking-[0.1em]"
            :class="{
              'border-[var(--cc-signal)] text-[var(--cc-signal)]': row.kind === 'local',
              'border-[var(--cc-live)] text-[var(--cc-live)]': row.kind === 'peer',
              'border-[color:var(--cc-border-strong)] text-[var(--cc-ink-muted)]': row.kind === 'other',
            }"
          >{{ row.kind === "local" ? "You" : row.kind === "peer" ? "Peer" : "Aux" }}</span>
          <span class="truncate font-body text-[12px] font-semibold text-[var(--cc-ink)]">
            {{ row.label }}
          </span>
        </div>
        <button
          type="button"
          class="shrink-0 border px-2 py-[2px] font-ui text-[8.5px] uppercase tracking-[0.12em] transition-colors"
          :class="
            row.muted
              ? 'border-[var(--cc-signal)] bg-[var(--cc-signal-dim)] text-[var(--cc-signal)]'
              : 'border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk-warm)] text-[var(--cc-ink-muted)] hover:text-[var(--cc-ink)]'
          "
          :aria-pressed="row.muted"
          @click="onToggleMute(row.id, !row.muted)"
        >
          {{ row.muted ? "Muted" : "Mute" }}
        </button>
      </div>
      <Slider
        :model-value="row.gain"
        :min="0"
        :max="1.5"
        :step="0.01"
        :disabled="row.muted"
        :format="(v) => `${Math.round(v * 100)}%`"
        @update:model-value="(v) => onGain(row.id, v)"
      />
      <VUMeter
        :level="row.muted ? 0 : levelFor(row.id)"
        :peak="row.muted ? 0 : peakFor(row.id)"
        :height="5"
      />
    </div>

    <div
      v-if="sources.length > 0"
      class="flex flex-col gap-1 border-t border-[color:var(--cc-border)] pt-3"
    >
      <div class="flex items-center justify-between">
        <span class="font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--cc-ink-muted)]">
          Master
        </span>
        <span class="font-ui text-[8.5px] tabular-nums text-[var(--cc-ink-ghost)]">
          {{ Math.round(ctx.hostMixer.masterLevel.value * 100) }}%
        </span>
      </div>
      <VUMeter
        :level="ctx.hostMixer.masterLevel.value"
        :peak="ctx.hostMixer.masterPeak.value"
        :height="7"
      />
    </div>
  </section>
</template>
