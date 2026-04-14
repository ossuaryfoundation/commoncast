<!--
  Status bar — a row of honest indicators. Every value here is derived
  from a real composable or store. No hardcoded labels.
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { StatusBarIndicator, VUMeter } from "@commoncast/design-system";
import { useStudioContext } from "~/composables/useStudioContext";
import { usePrefsStore } from "~/stores/prefs";
import { useNuxtApp } from "#app";
import type { ClaspClient, ConnectionState } from "@commoncast/clasp-client";

const ctx = useStudioContext();
const prefs = usePrefsStore();

const claspState = ref<ConnectionState>("idle");
let unsub: (() => void) | null = null;
onMounted(() => {
  const nuxt = useNuxtApp();
  const clasp = nuxt.$clasp as ClaspClient | undefined;
  if (!clasp) return;
  unsub = clasp.onStateChange((s) => (claspState.value = s));
});
onUnmounted(() => {
  unsub?.();
});

type IndicatorStatus = "live" | "caution" | "offline";

const claspIndicator = computed<{ status: IndicatorStatus; value: string }>(() => {
  switch (claspState.value) {
    case "connected":
      return { status: "live", value: prefs.claspRelayUrl.replace(/^wss?:\/\//, "") };
    case "connecting":
    case "reconnecting":
      return { status: "caution", value: claspState.value };
    case "error":
      return { status: "offline", value: "error" };
    case "disconnected":
      return { status: "offline", value: "offline" };
    default:
      return { status: "caution", value: "idle" };
  }
});

const senderIndicator = computed<{ status: IndicatorStatus; value: string }>(() => {
  const s = ctx.fanout.aggregate.value;
  const connected = ctx.fanout.connectedCount.value;
  const active = ctx.fanout.activeCount.value;
  if (s === "connected") return { status: "live", value: `${connected}/${active || connected} dest` };
  if (s === "negotiating") return { status: "caution", value: `negotiating ${active}` };
  if (s === "failed") return { status: "offline", value: "failed" };
  return { status: "offline", value: "ready" };
});

const peerCount = computed(() => ctx.peers.remotePids.value.length);
const peersIndicator = computed<{ status: IndicatorStatus; value: string }>(() => ({
  status: peerCount.value > 0 ? "live" : "offline",
  value: `${peerCount.value} ${peerCount.value === 1 ? "peer" : "peers"}`,
}));

function fmtRec(ms: number): string {
  const total = Math.floor(ms / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

const recIndicator = computed<{ status: IndicatorStatus; value: string }>(() => {
  const s = ctx.recorder.state.value;
  if (s === "recording") return { status: "live", value: fmtRec(ctx.recorder.elapsedMs.value) };
  if (s === "paused") return { status: "caution", value: "paused" };
  if (s === "stopped") return { status: "offline", value: "saved" };
  return { status: "offline", value: "—" };
});
</script>

<template>
  <footer
    class="flex h-8 items-center gap-6 border-t border-[var(--cc-soot-mid)] bg-[var(--cc-soot)] px-4"
  >
    <StatusBarIndicator
      :status="claspIndicator.status"
      label="CLASP"
      :value="claspIndicator.value"
    />
    <StatusBarIndicator
      :status="senderIndicator.status"
      label="Broadcast"
      :value="senderIndicator.value"
    />
    <StatusBarIndicator
      :status="peersIndicator.status"
      label="WebRTC"
      :value="peersIndicator.value"
    />
    <StatusBarIndicator
      :status="recIndicator.status"
      label="Rec"
      :value="recIndicator.value"
    />

    <!-- Master output level pill -->
    <div class="flex items-center gap-2">
      <span class="font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--cc-ink-ghost)]">
        Mix
      </span>
      <div class="w-[72px]">
        <VUMeter
          :level="ctx.hostMixer.masterLevel.value"
          :peak="ctx.hostMixer.masterPeak.value"
          :height="5"
        />
      </div>
    </div>

    <span class="ml-auto font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--cc-ink-ghost)]">
      commoncast v0.0.0
    </span>
  </footer>
</template>
