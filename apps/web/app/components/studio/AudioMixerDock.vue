<!--
  AudioMixerDock — always-on horizontal mixer strip.

  Lives in a dedicated row between the main three-column split and
  the StatusBar in the studio grid. Unlike the old AudioMixerStrip
  (which stacked source rows vertically inside a 280px tab), the
  dock lays sources out horizontally: one column per source plus a
  final Master column. Every column has:
    - kind chip (You / Peer / Aux / Master)
    - truncated label
    - Mute toggle (two-state, signal-red when muted)
    - vertical-feeling fader Slider laid horizontally (full column width)
    - live VU meter under the slider

  The "always on" part of this is the point — pros want the mixer
  in their peripheral vision at all times, not buried behind a tab.

  Zero business logic: reads mixer rows + levels from StudioContext
  and forwards fader + mute to the composable. No audio graph code
  anywhere near this file (CLAUDE.md §3).
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

function toneClass(kind: "local" | "peer" | "other"): string {
  if (kind === "local") return "border-[var(--cc-signal)] text-[var(--cc-signal)]";
  if (kind === "peer") return "border-[var(--cc-live)] text-[var(--cc-live)]";
  return "border-[color:var(--cc-border-strong)] text-[var(--cc-ink-muted)]";
}

function kindLabel(kind: "local" | "peer" | "other"): string {
  if (kind === "local") return "You";
  if (kind === "peer") return "Peer";
  return "Aux";
}

function onGain(id: string, v: number) {
  ctx.hostMixer.setGain(id, v);
}
function onToggleMute(id: string, next: boolean) {
  ctx.hostMixer.setMuted(id, next);
}
</script>

<template>
  <section
    class="flex h-[96px] shrink-0 items-stretch gap-0 border-t border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk-warm)]"
    aria-label="Audio mixer"
  >
    <!-- Label column -->
    <div
      class="flex w-[132px] shrink-0 flex-col justify-between border-r border-[color:var(--cc-border)] bg-[var(--cc-chalk)] px-3 py-2"
    >
      <span
        class="font-ui text-[9px] uppercase tracking-[0.14em] text-[var(--cc-ink-muted)]"
      >Mixer</span>
      <span
        class="font-ui text-[8.5px] uppercase tracking-[0.1em] text-[var(--cc-ink-ghost)]"
      >
        {{ sources.length }} source{{ sources.length === 1 ? "" : "s" }}
      </span>
    </div>

    <!-- Per-source columns -->
    <div class="flex min-w-0 flex-1 items-stretch overflow-x-auto">
      <div
        v-if="sources.length === 0"
        class="flex flex-1 items-center justify-center px-4 font-ui text-[9px] uppercase tracking-[0.1em] text-[var(--cc-ink-ghost)]"
      >
        Start your mic or wait for a peer to appear
      </div>

      <div
        v-for="row in sources"
        :key="row.id"
        class="flex w-[164px] shrink-0 flex-col gap-1.5 border-r border-[color:var(--cc-border)] px-3 py-2"
      >
        <div class="flex items-center gap-2">
          <span
            class="shrink-0 border px-1 py-px font-ui text-[8px] uppercase tracking-[0.1em]"
            :class="toneClass(row.kind)"
          >
            {{ kindLabel(row.kind) }}
          </span>
          <span
            class="truncate font-body text-[11px] font-semibold text-[var(--cc-ink)]"
            :title="row.label"
          >
            {{ row.label }}
          </span>
          <button
            type="button"
            class="ml-auto shrink-0 border px-1.5 py-[1px] font-ui text-[7.5px] uppercase tracking-[0.12em] transition-colors"
            :class="
              row.muted
                ? 'border-[var(--cc-signal)] bg-[var(--cc-signal-dim)] text-[var(--cc-signal)]'
                : 'border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] text-[var(--cc-ink-muted)] hover:text-[var(--cc-ink)]'
            "
            :aria-pressed="row.muted"
            @click="onToggleMute(row.id, !row.muted)"
          >
            {{ row.muted ? "M" : "Mute" }}
          </button>
        </div>

        <Slider
          :model-value="row.gain"
          :min="0"
          :max="1.5"
          :step="0.01"
          :disabled="row.muted"
          :show-value="false"
          @update:model-value="(v) => onGain(row.id, v)"
        />

        <VUMeter
          :level="row.muted ? 0 : levelFor(row.id)"
          :peak="row.muted ? 0 : peakFor(row.id)"
          :height="5"
        />
      </div>
    </div>

    <!-- Master column -->
    <div
      class="flex w-[164px] shrink-0 flex-col gap-1.5 border-l border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] px-3 py-2"
    >
      <div class="flex items-center gap-2">
        <span
          class="shrink-0 border border-[var(--cc-soot)] bg-[var(--cc-soot)] px-1 py-px font-ui text-[8px] uppercase tracking-[0.1em] text-[var(--cc-chalk)]"
        >Master</span>
        <span class="tabular-nums font-ui text-[9px] uppercase tracking-[0.1em] text-[var(--cc-ink-muted)]">
          {{ Math.round(ctx.hostMixer.masterLevel.value * 100) }}%
        </span>
      </div>
      <VUMeter
        :level="ctx.hostMixer.masterLevel.value"
        :peak="ctx.hostMixer.masterPeak.value"
        :height="10"
      />
      <span
        class="font-ui text-[8.5px] uppercase tracking-[0.1em]"
        :class="
          ctx.fanout.aggregate.value === 'connected'
            ? 'text-[var(--cc-live)]'
            : 'text-[var(--cc-ink-ghost)]'
        "
      >
        {{ ctx.fanout.aggregate.value === "connected" ? "On air" : "Off air" }}
      </span>
    </div>
  </section>
</template>
