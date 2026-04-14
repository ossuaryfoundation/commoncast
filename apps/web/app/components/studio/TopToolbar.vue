<!--
  Top toolbar — the broadcast command strip.

  Everything here now reads from real state:
    - Go Live toggles studio.isLive (the page watches that to drive
      useBroadcastSender); the button label reflects sender.state.
    - Record toggles studio.isRecording and the duration chip reads
      recorder.elapsedMs so pausing/recovering is honest.
    - The destinations chip shows sender.state; the peers chip reads
      ctx.peers.remotePids.length; the on-air badge only lights when
      the broadcast is actually connected, not just when the user
      clicked the button.

  The old hardcoded YT / Twitch / LVQR badges are gone — they'll return
  as a real multi-destination drawer in a follow-up slice.
-->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Button, OnAirBadge, Kbd } from "@commoncast/design-system";
import { useStudioContext } from "~/composables/useStudioContext";
import { useStudioStore } from "~/stores/studio";
import { useDestinationsStore } from "~/stores/destinations";
import { useTimecode } from "~/composables/useTimecode";
import DestinationsDrawer from "~/components/studio/DestinationsDrawer.vue";

const ctx = useStudioContext();
const studio = useStudioStore();
const destinationsStore = useDestinationsStore();
const live = useTimecode();

const destinationsOpen = ref(false);

// Live-since counter — starts when any destination transitions to connected.
watch(
  () => ctx.fanout.aggregate.value,
  (s) => {
    if (s === "connected") live.start();
    else live.stop();
  },
  { immediate: true },
);

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function fmtRec(ms: number): string {
  const total = Math.floor(ms / 1000);
  const hh = pad(Math.floor(total / 3600));
  const mm = pad(Math.floor((total % 3600) / 60));
  const ss = pad(total % 60);
  return `${hh}:${mm}:${ss}`;
}

const senderState = computed(() => ctx.fanout.aggregate.value);
const recorderState = computed(() => ctx.recorder.state.value);
const recElapsed = computed(() => fmtRec(ctx.recorder.elapsedMs.value));
const peerCount = computed(() => ctx.peers.remotePids.value.length);
const engineReady = computed(() => ctx.engineReady.value);
const destCount = computed(() => destinationsStore.count);
const connectedCount = computed(() => ctx.fanout.connectedCount.value);

const liveLabel = computed(() => {
  if (senderState.value === "negotiating") return "Going live…";
  if (senderState.value === "connected") return "On Air";
  if (senderState.value === "failed") return "Retry live";
  return "Go Live";
});
const liveVariant = computed<"live" | "ghost" | "primary">(() => {
  if (senderState.value === "connected") return "live";
  if (senderState.value === "negotiating") return "primary";
  return "ghost";
});

const recLabel = computed(() => {
  if (recorderState.value === "recording") return recElapsed.value;
  if (recorderState.value === "paused") return `${recElapsed.value} · paused`;
  if (recorderState.value === "stopped") return "Save";
  return "Record";
});
const recVariant = computed<"primary" | "ghost">(() =>
  recorderState.value === "recording" ? "primary" : "ghost",
);

// Destinations chip — aggregate of the whole fanout. Click opens the
// destinations drawer where individual rows can be edited/toggled.
const destChip = computed(() => {
  const s = senderState.value;
  const label =
    s === "connected"
      ? `${connectedCount.value}/${destCount.value} live`
      : destCount.value === 0
        ? "none"
        : `${destCount.value} configured`;
  const state: "on" | "pending" | "fail" | "off" =
    s === "connected"
      ? "on"
      : s === "negotiating"
        ? "pending"
        : s === "failed"
          ? "fail"
          : "off";
  return { label, state };
});
</script>

<template>
  <header
    class="flex h-11 items-center gap-3 border-b border-[var(--cc-soot-mid)] bg-[var(--cc-soot)] px-3 text-[var(--cc-chalk)]"
  >
    <NuxtLink
      to="/"
      class="flex items-center gap-2 border-r border-[var(--cc-soot-mid)] pr-3 font-display text-[13px] font-bold tracking-[0.02em]"
    >
      <span
        class="h-[7px] w-[7px] bg-[var(--cc-signal)]"
        style="animation: cc-pulse-dot 2s ease infinite"
      />
      commoncast
    </NuxtLink>

    <div class="flex items-center gap-2">
      <Button
        :variant="liveVariant"
        size="sm"
        :disabled="!engineReady && senderState !== 'connected'"
        @click="studio.goLive()"
      >
        {{ liveLabel }}
      </Button>
      <Button
        :variant="recVariant"
        size="sm"
        :disabled="!engineReady && recorderState !== 'recording'"
        @click="studio.toggleRecording()"
      >
        <span class="flex items-center gap-1.5">
          <span
            v-if="recorderState === 'recording'"
            class="h-[7px] w-[7px] rounded-full bg-white"
            style="animation: cc-blink 1.2s step-end infinite"
          />
          {{ recLabel }}
        </span>
      </Button>
    </div>

    <!-- destinations chip (opens the drawer) -->
    <button
      type="button"
      class="ml-2 flex items-center gap-2 border border-[rgba(255,255,255,0.1)] px-2 py-[4px] font-ui text-[9px] uppercase tracking-[0.12em] transition-colors hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.05)]"
      aria-label="Open destinations drawer"
      @click="destinationsOpen = true"
    >
      <span class="text-[rgba(255,255,255,0.45)]">Destinations</span>
      <span
        class="flex items-center gap-1 px-1.5 py-[1px]"
        :class="{
          'border border-[rgba(34,165,89,0.4)] text-[var(--cc-live)]': destChip.state === 'on',
          'border border-[rgba(212,148,10,0.4)] text-[var(--cc-caution)]': destChip.state === 'pending',
          'border border-[rgba(217,66,80,0.4)] text-[var(--cc-signal)]': destChip.state === 'fail',
          'border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.3)]': destChip.state === 'off',
        }"
      >
        <span
          class="h-[4px] w-[4px]"
          :class="{
            'bg-[var(--cc-live)]': destChip.state === 'on',
            'bg-[var(--cc-caution)]': destChip.state === 'pending',
            'bg-[var(--cc-signal)]': destChip.state === 'fail',
            'bg-[rgba(255,255,255,0.2)]': destChip.state === 'off',
          }"
        />
        {{ destChip.label }}
      </span>
    </button>

    <DestinationsDrawer v-model:open="destinationsOpen" />

    <!-- peers chip -->
    <div
      class="flex items-center gap-1.5 font-ui text-[9px] uppercase tracking-[0.12em] text-[rgba(255,255,255,0.45)]"
    >
      <span
        class="h-[4px] w-[4px] rounded-full"
        :class="peerCount > 0 ? 'bg-[var(--cc-live)]' : 'bg-[rgba(255,255,255,0.2)]'"
      />
      {{ peerCount }} {{ peerCount === 1 ? "peer" : "peers" }}
    </div>

    <div class="ml-auto flex items-center gap-4">
      <span
        class="font-code text-[11px] tracking-[0.06em] text-[rgba(255,255,255,0.45)]"
      >
        <template v-if="senderState === 'connected'">
          <span class="text-[var(--cc-live)]">LIVE</span> {{ live.value.value }}
        </template>
        <template v-else>
          <span>READY</span>
        </template>
      </span>
      <OnAirBadge :live="senderState === 'connected'" />
    </div>
  </header>
</template>
