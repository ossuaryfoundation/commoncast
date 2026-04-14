<!--
  Inventory panel — the honest replacement for the old hardcoded SourcesPanel.

  Two sections, both live:

  1. Local   — camera + mic dropdowns backed by useMediaDevices, driving a
               restart of useUserMedia when the selection changes. Live VU
               meter under the mic for immediate feedback.

  2. Sources — rows for every *bindable* source in the room:
               the local camera, an optional screen-capture track, and one
               row per remote WebRTC peer. Clicking a row while a slot is
               selected on the stage assigns that source to the slot; rows
               light up with their current slot assignment in the active
               scene. Nothing here is a placeholder — every row reflects
               real state.
-->
<script setup lang="ts">
import { computed } from "vue";
import { PanelHeader, Select, VUMeter, Kbd, type SelectItem } from "@commoncast/design-system";
import { useStudioContext } from "~/composables/useStudioContext";
import { useStudioStore } from "~/stores/studio";
import { usePrefsStore } from "~/stores/prefs";

const ctx = useStudioContext();
const studio = useStudioStore();
const prefs = usePrefsStore();

const cameraItems = computed<SelectItem[]>(() => [
  { value: "", label: "System default" },
  ...ctx.devices.videoInputs.value.map((d, i) => ({
    value: d.deviceId,
    label: d.label || `Camera ${i + 1}`,
  })),
]);
const micItems = computed<SelectItem[]>(() => [
  { value: "", label: "System default" },
  ...ctx.devices.audioInputs.value.map((d, i) => ({
    value: d.deviceId,
    label: d.label || `Microphone ${i + 1}`,
  })),
]);

const cameraValue = computed<string | null>({
  get: () => prefs.defaultCameraId ?? "",
  set: (v) => {
    void ctx.switchCamera(v ? v : null);
  },
});
const micValue = computed<string | null>({
  get: () => prefs.defaultMicId ?? "",
  set: (v) => {
    void ctx.switchMic(v ? v : null);
  },
});

const activeFeeds = computed<readonly (string | null)[]>(
  () => studio.activeScene?.feeds ?? [],
);

function slotOf(sourceId: string): number | null {
  const i = activeFeeds.value.indexOf(sourceId);
  return i >= 0 ? i : null;
}

const selectedSlot = computed(() => ctx.selection.slot.value);
const hasSelection = computed(() => selectedSlot.value != null);

function handleSourceClick(sourceId: string, available: boolean) {
  if (!available) return;
  if (selectedSlot.value == null) return;
  ctx.assignToSelectedSlot(sourceId);
}

const localLive = computed(() => ctx.media.videoTrack.value != null);
const localAudioOn = computed(() => ctx.media.audioTrack.value != null);
const peerPids = computed(() => ctx.peers.remotePids.value);

async function startScreen() {
  try {
    await ctx.screen.start();
  } catch {
    // user cancelled the picker — ignore
  }
}
</script>

<template>
  <aside
    class="flex h-full w-full flex-col border-r border-[color:var(--cc-border)] bg-[var(--cc-chalk-warm)]"
  >
    <PanelHeader title="Inventory" />

    <div class="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      <!-- ===== LOCAL ===== -->
      <section class="flex flex-col gap-3">
        <h3
          class="flex items-center gap-2 font-ui text-[9px] uppercase tracking-[0.14em] text-[var(--cc-ink-muted)]"
        >
          Local
          <span class="h-px flex-1 bg-[var(--cc-border)]" />
        </h3>

        <Select v-model="cameraValue" :items="cameraItems" label="Camera" />
        <Select v-model="micValue" :items="micItems" label="Microphone" />

        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <span class="font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--cc-ink-muted)]">Input level</span>
            <span
              class="font-ui text-[8.5px] uppercase tracking-[0.1em]"
              :class="localAudioOn ? 'text-[var(--cc-live)]' : 'text-[var(--cc-ink-ghost)]'"
            >
              {{ localAudioOn ? "Live" : "Off" }}
            </span>
          </div>
          <VUMeter :level="ctx.audioLevel.value" :peak="ctx.audioPeak.value" :height="7" />
        </div>
      </section>

      <!-- ===== SOURCES ===== -->
      <section class="flex flex-col gap-2">
        <h3
          class="flex items-center gap-2 font-ui text-[9px] uppercase tracking-[0.14em] text-[var(--cc-ink-muted)]"
        >
          Sources
          <Kbd v-if="hasSelection">Slot {{ (selectedSlot ?? 0) + 1 }}</Kbd>
          <span class="h-px flex-1 bg-[var(--cc-border)]" />
        </h3>

        <!-- Local camera row -->
        <button
          type="button"
          :disabled="!localLive"
          class="group flex w-full items-center gap-3 border border-[color:var(--cc-border)] bg-[var(--cc-chalk)] p-2 text-left transition-[transform,box-shadow,border-color] duration-[var(--cc-dur-fast)] ease-[var(--cc-ease-snappy)] hover:-translate-y-px hover:border-[color:var(--cc-border-strong)] hover:shadow-[var(--cc-shadow-sm)] disabled:cursor-not-allowed disabled:opacity-50"
          :class="
            slotOf(ctx.localSourceId) != null
              ? 'border-l-[3px] border-l-[var(--cc-signal)]'
              : ''
          "
          @click="handleSourceClick(ctx.localSourceId, localLive)"
        >
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center bg-[var(--cc-soot)] font-display text-[10px] font-bold tracking-[0.04em] text-[var(--cc-chalk)]"
          >
            ME
          </span>
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="truncate font-body text-[12px] font-semibold text-[var(--cc-ink)]">
              {{ ctx.myName }}
            </span>
            <span
              class="truncate font-ui text-[8.5px] uppercase tracking-[0.1em] text-[var(--cc-ink-muted)]"
            >
              {{ localLive ? "Local · camera" : "Local · no camera" }}
            </span>
          </span>
          <span
            v-if="slotOf(ctx.localSourceId) != null"
            class="shrink-0 border border-[color:var(--cc-signal)] bg-[var(--cc-signal-dim)] px-1.5 py-px font-ui text-[8px] uppercase tracking-[0.12em] text-[var(--cc-signal)]"
          >
            Slot {{ (slotOf(ctx.localSourceId) ?? 0) + 1 }}
          </span>
        </button>

        <!-- Screen share row -->
        <div
          v-if="ctx.screen.active.value"
          class="flex items-stretch gap-0"
        >
          <button
            type="button"
            class="group flex min-w-0 flex-1 items-center gap-3 border border-[color:var(--cc-border)] bg-[var(--cc-chalk)] p-2 text-left transition-[transform,box-shadow,border-color] duration-[var(--cc-dur-fast)] ease-[var(--cc-ease-snappy)] hover:-translate-y-px hover:border-[color:var(--cc-border-strong)] hover:shadow-[var(--cc-shadow-sm)]"
            :class="
              slotOf(ctx.screenSourceId) != null
                ? 'border-l-[3px] border-l-[var(--cc-info)]'
                : ''
            "
            @click="handleSourceClick(ctx.screenSourceId, true)"
          >
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center bg-[var(--cc-info-dim)] font-display text-[10px] font-bold tracking-[0.04em] text-[var(--cc-info)]"
            >
              SC
            </span>
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="truncate font-body text-[12px] font-semibold text-[var(--cc-ink)]">
                Screen share
              </span>
              <span
                class="truncate font-ui text-[8.5px] uppercase tracking-[0.1em] text-[var(--cc-ink-muted)]"
              >
                Display capture
              </span>
            </span>
            <span
              v-if="slotOf(ctx.screenSourceId) != null"
              class="shrink-0 border border-[color:var(--cc-info)] bg-[var(--cc-info-dim)] px-1.5 py-px font-ui text-[8px] uppercase tracking-[0.12em] text-[var(--cc-info)]"
            >
              Slot {{ (slotOf(ctx.screenSourceId) ?? 0) + 1 }}
            </span>
          </button>
          <button
            type="button"
            class="shrink-0 border border-l-0 border-[color:var(--cc-border)] bg-[var(--cc-chalk)] px-3 font-ui text-[8.5px] uppercase tracking-[0.12em] text-[var(--cc-ink-muted)] transition-colors hover:bg-[var(--cc-signal-dim)] hover:text-[var(--cc-signal)]"
            @click="ctx.screen.stop()"
          >
            Stop
          </button>
        </div>
        <button
          v-else
          type="button"
          class="flex w-full items-center justify-center gap-2 border border-dashed border-[color:var(--cc-border-strong)] bg-transparent p-2 font-ui text-[9.5px] uppercase tracking-[0.12em] text-[var(--cc-ink-muted)] transition-colors hover:border-[color:var(--cc-ink-muted)] hover:text-[var(--cc-ink)]"
          @click="startScreen"
        >
          + Add screen share
        </button>

        <!-- Peers -->
        <button
          v-for="pid in peerPids"
          :key="pid"
          type="button"
          class="group flex w-full items-center gap-3 border border-[color:var(--cc-border)] bg-[var(--cc-chalk)] p-2 text-left transition-[transform,box-shadow,border-color] duration-[var(--cc-dur-fast)] ease-[var(--cc-ease-snappy)] hover:-translate-y-px hover:border-[color:var(--cc-border-strong)] hover:shadow-[var(--cc-shadow-sm)]"
          :class="
            slotOf(pid) != null
              ? 'border-l-[3px] border-l-[var(--cc-live)]'
              : ''
          "
          @click="handleSourceClick(pid, true)"
        >
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center bg-[var(--cc-live-dim)] font-display text-[10px] font-bold tracking-[0.04em] text-[var(--cc-live)]"
          >
            {{ pid.slice(0, 2).toUpperCase() }}
          </span>
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="truncate font-body text-[12px] font-semibold text-[var(--cc-ink)]">
              {{ ctx.labelForSource(pid) }}
            </span>
            <span
              class="truncate font-ui text-[8.5px] uppercase tracking-[0.1em] text-[var(--cc-ink-muted)]"
            >
              Peer · WebRTC
            </span>
          </span>
          <span
            v-if="slotOf(pid) != null"
            class="shrink-0 border border-[color:var(--cc-live)] bg-[var(--cc-live-dim)] px-1.5 py-px font-ui text-[8px] uppercase tracking-[0.12em] text-[var(--cc-live)]"
          >
            Slot {{ (slotOf(pid) ?? 0) + 1 }}
          </span>
        </button>
        <div
          v-if="peerPids.length === 0"
          class="border border-dashed border-[color:var(--cc-border)] bg-transparent px-2 py-3 text-center font-ui text-[9px] uppercase tracking-[0.1em] text-[var(--cc-ink-ghost)]"
        >
          No peers in the room
        </div>

        <p
          class="mt-1 border-t border-[color:var(--cc-border)] pt-2 font-ui text-[8.5px] uppercase leading-[1.5] tracking-[0.1em] text-[var(--cc-ink-ghost)]"
        >
          {{
            hasSelection
              ? "Click a source to bind it to the selected slot."
              : "Select a slot on the stage first."
          }}
        </p>
      </section>
    </div>
  </aside>
</template>
