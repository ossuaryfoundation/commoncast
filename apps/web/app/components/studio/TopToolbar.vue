<!--
  Top toolbar — the broadcast command strip.

  H1 repair pass:
    - Destinations chip rebuilt: one button, one hit target, full-opacity
      StatusDot + clear "N/M live" count, no nested rgba chip-in-chip.
    - New Copy-invite action: writes /join/{studioId} to clipboard,
      fires a success toast, lives next to the studio identity.
    - Studio title is now visible (was buried in the store). Click to
      rename lands in a future slice; for now it's static text.
-->
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Button, OnAirBadge, StatusDot } from "@commoncast/design-system";
import { useStudioContext } from "~/composables/useStudioContext";
import { useStudioStore } from "~/stores/studio";
import { useDestinationsStore } from "~/stores/destinations";
import { useTimecode } from "~/composables/useTimecode";
import { useToasts } from "~/composables/useToasts";
import DestinationsDrawer from "~/components/studio/DestinationsDrawer.vue";

const ctx = useStudioContext();
const studio = useStudioStore();
const destinationsStore = useDestinationsStore();
const toasts = useToasts();
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

// Destinations: one aggregate status + one clean "connected/total" label.
type DestTone = "live" | "caution" | "signal" | "offline";
const destTone = computed<DestTone>(() => {
  const s = senderState.value;
  if (s === "connected") return "live";
  if (s === "negotiating") return "caution";
  if (s === "failed") return "signal";
  return "offline";
});
const destCountLabel = computed(() => {
  if (destCount.value === 0) return "none";
  if (senderState.value === "connected") {
    return `${connectedCount.value}/${destCount.value} live`;
  }
  return `${destCount.value} ${destCount.value === 1 ? "dest" : "dests"}`;
});

// Peers chip tone — mirrors destinations styling.
const peerTone = computed<DestTone>(() =>
  peerCount.value > 0 ? "live" : "offline",
);

// Copy-invite action
async function copyInvite() {
  if (typeof window === "undefined") return;
  const url = `${window.location.origin}/join/${studio.studioId}`;
  try {
    await navigator.clipboard.writeText(url);
    toasts.success({
      title: "Invite link copied",
      description: url,
    });
  } catch {
    toasts.error({
      title: "Couldn't copy to clipboard",
      description: "Your browser may have blocked clipboard access.",
    });
  }
}
</script>

<template>
  <header
    class="flex h-11 items-center gap-3 border-b border-[var(--cc-soot-mid)] bg-[var(--cc-soot)] px-3 text-[var(--cc-chalk)]"
  >
    <!-- brand + studio identity -->
    <NuxtLink
      to="/"
      class="flex items-center gap-2 pr-3 font-display text-[13px] font-bold tracking-[0.02em]"
    >
      <span
        class="h-[7px] w-[7px] bg-[var(--cc-signal)]"
        style="animation: cc-pulse-dot 2s ease infinite"
      />
      commoncast
    </NuxtLink>

    <span
      class="truncate border-l border-[var(--cc-soot-mid)] pl-3 font-display text-[12px] font-semibold text-[var(--cc-ink-whisper)] max-w-[220px]"
      :title="studio.title"
    >
      {{ studio.title }}
    </span>

    <!-- Copy invite -->
    <button
      type="button"
      class="flex items-center gap-1.5 border border-[var(--cc-soot-mid)] bg-transparent px-2 py-[4px] font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--cc-ink-whisper)] transition-colors hover:border-[var(--cc-ink-ghost)] hover:bg-[var(--cc-soot-mid)] hover:text-[var(--cc-chalk)]"
      aria-label="Copy invite link"
      title="Copy invite link"
      @click="copyInvite"
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
        <rect x="1" y="3" width="8" height="8" stroke="currentColor" stroke-width="1.2" />
        <path d="M3 3 V1 H11 V9 H9" stroke="currentColor" stroke-width="1.2" fill="none" />
      </svg>
      <span>Copy invite</span>
    </button>

    <span class="mx-1 h-4 w-px bg-[var(--cc-soot-mid)]" />

    <!-- Go live + record -->
    <div class="flex items-center gap-2">
      <Button
        :variant="liveVariant"
        size="sm"
        :disabled="!engineReady && senderState !== 'connected'"
        :title="!engineReady ? 'Engine is still initializing…' : undefined"
        @click="studio.goLive()"
      >
        {{ liveLabel }}
      </Button>
      <Button
        :variant="recVariant"
        size="sm"
        :disabled="!engineReady && recorderState !== 'recording'"
        :title="!engineReady ? 'Engine is still initializing…' : undefined"
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

    <!-- destinations chip — one button, full contrast -->
    <button
      type="button"
      class="ml-1 flex items-center gap-2 border border-[var(--cc-soot-mid)] bg-transparent px-2.5 py-[5px] font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--cc-chalk)] transition-colors hover:border-[var(--cc-ink-ghost)] hover:bg-[var(--cc-soot-mid)]"
      :aria-expanded="destinationsOpen"
      aria-haspopup="dialog"
      :title="destCount === 0 ? 'Add a destination to go live' : 'Manage destinations'"
      @click="destinationsOpen = true"
    >
      <StatusDot
        :status="destTone"
        :pulse="destTone === 'live'"
        :size="5"
      />
      <span>Destinations</span>
      <span
        class="border-l border-[var(--cc-soot-mid)] pl-2 tabular-nums text-[var(--cc-ink-whisper)]"
      >
        {{ destCountLabel }}
      </span>
    </button>

    <DestinationsDrawer v-model:open="destinationsOpen" />

    <!-- peers chip — matches destinations treatment -->
    <div
      class="flex items-center gap-1.5 border border-[var(--cc-soot-mid)] bg-transparent px-2.5 py-[5px] font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--cc-chalk)]"
      :aria-label="`${peerCount} ${peerCount === 1 ? 'peer' : 'peers'} connected`"
    >
      <StatusDot
        :status="peerTone"
        :pulse="peerTone === 'live'"
        :size="5"
      />
      <span>{{ peerCount }} {{ peerCount === 1 ? "peer" : "peers" }}</span>
    </div>

    <div class="ml-auto flex items-center gap-4">
      <span
        class="font-code text-[11px] tracking-[0.06em] tabular-nums text-[var(--cc-ink-whisper)]"
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
