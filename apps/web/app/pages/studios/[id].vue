<!--
  Studio — the host (and guest) broadcasting interface. The heart of commoncast.

  The engine / media / recorder / sender / peers all live at this level so a
  single compositor instance is shared across the toolbar, stage, and
  controls. Children read the canvas slot via provide/inject.
-->
<script setup lang="ts">
import { onMounted, onUnmounted, provide, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { asSceneId, asSourceId } from "@commoncast/studio-engine";

import { useStudioStore } from "~/stores/studio";
import { useStudioEngine } from "~/composables/useStudioEngine";
import { useUserMedia } from "~/composables/useUserMedia";
import { useStudioRecorder } from "~/composables/useStudioRecorder";
import { useBroadcastSender } from "~/composables/useBroadcastSender";
import { useStudioPeers } from "~/composables/useStudioPeers";

import TopToolbar from "~/components/studio/TopToolbar.vue";
import SourcesPanel from "~/components/studio/SourcesPanel.vue";
import StudioStage from "~/components/studio/StudioStage.vue";
import ControlsPanel from "~/components/studio/ControlsPanel.vue";
import StatusBar from "~/components/studio/StatusBar.vue";

definePageMeta({ layout: "studio" });

const studio = useStudioStore();
const route = useRoute();
studio.studioId = String(route.params.id ?? "default");

// Guest mode is selected by a ?guest=<name> query param coming from /join/[id].
const guestName = typeof route.query.guest === "string" ? route.query.guest : null;
const role: "host" | "guest" = guestName ? "guest" : "host";
const myName = guestName ?? "Host";
const myPid =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `pid-${Math.random().toString(36).slice(2)}`;

// Canvas ref owned by the page; StudioStage slots the DOM element into it.
const canvas = ref<HTMLCanvasElement | null>(null);
provide("commoncast:canvas", canvas);

const engine = useStudioEngine(canvas, { width: 1280, height: 720, fps: 30 });
const media = useUserMedia();
const recorder = useStudioRecorder();
const sender = useBroadcastSender();

const mountedSourceIds = new Set<string>();

async function addCamera(pid: string, name: string, track: MediaStreamTrack) {
  if (!engine.ready.value) return;
  if (mountedSourceIds.has(pid)) return;
  await engine.addSource({
    kind: "camera",
    id: asSourceId(pid),
    name,
    track,
  });
  mountedSourceIds.add(pid);
}

const peers = useStudioPeers({
  studioId: studio.studioId,
  myPid,
  role,
  getLocalTrack: () => media.videoTrack.value,
  onRemoteTrack: async (fromPid, track) => {
    await addCamera(fromPid, fromPid, track);
    renderScene();
  },
});

function renderScene() {
  if (!engine.ready.value) return;
  const feeds = Array.from(mountedSourceIds).map((id) => asSourceId(id));
  engine.setScene({
    id: asSceneId(studio.activeSceneId),
    name: studio.activeScene?.name ?? "",
    layout: studio.activeLayout,
    feeds,
    overlays: [
      {
        kind: "logo",
        visible: studio.overlays.logo,
        text: studio.brand.logoText,
        accent: studio.brand.accent,
      },
      {
        kind: "lowerThird",
        visible: studio.overlays.lowerThird,
        name: studio.brand.lowerName,
        subtitle: studio.brand.lowerSubtitle,
        accent: studio.brand.accent,
      },
      {
        kind: "ticker",
        visible: studio.overlays.ticker,
        text: studio.brand.tickerText,
        accent: studio.brand.accent,
      },
    ],
  });
}

watch(
  [engine.ready, media.videoTrack],
  async ([ready, track]) => {
    if (!ready || !track) return;
    await addCamera(myPid, myName, track);
    renderScene();
  },
);

watch(
  () => [studio.activeLayout, studio.overlays, studio.brand, studio.activeSceneId],
  () => renderScene(),
  { deep: true },
);

// A. Broadcast — studio.isLive is toggled by the Go Live button in TopToolbar.
watch(
  () => studio.isLive,
  async (live) => {
    if (live) {
      const track = engine.getOutputTrack();
      if (!track) {
        console.warn("[commoncast] broadcast: engine output track not ready");
        studio.isLive = false;
        return;
      }
      try {
        await sender.publish({
          studioId: studio.studioId,
          destAddr: "test",
          track,
        });
      } catch (err) {
        console.error("[commoncast] broadcast publish failed", err);
        studio.isLive = false;
      }
    } else {
      sender.close();
    }
  },
);

// B. Record — studio.isRecording is toggled by the Record button in TopToolbar.
watch(
  () => studio.isRecording,
  async (rec) => {
    if (rec) {
      const stream = engine.getOutputStream();
      if (!stream) {
        console.warn("[commoncast] record: engine output stream not ready");
        studio.isRecording = false;
        return;
      }
      recorder.start(stream);
    } else if (recorder.state.value === "recording" || recorder.state.value === "paused") {
      const blob = await recorder.stop();
      if (blob) downloadBlob(blob, `commoncast-${Date.now()}.webm`);
    }
  },
);

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Keyboard shortcuts F1–F5 for scene recall.
function handleKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null;
  if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
  const match = e.key.match(/^F([1-5])$/);
  if (!match) return;
  const idx = Number(match[1]);
  const scene = studio.scenes.find((s) => s.index === idx);
  if (scene) {
    e.preventDefault();
    studio.setScene(scene.id);
  }
}

onMounted(async () => {
  window.addEventListener("keydown", handleKey);

  // Best-effort local camera + mic.
  try {
    await media.start({
      audio: true,
      video: { width: 1280, height: 720 },
    });
  } catch {
    // no camera — the studio still works for layout/branding previews
  }

  // Join the clasp room and start peering.
  try {
    await peers.join(myName);
  } catch (err) {
    console.error("[commoncast] peers.join failed", err);
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKey);
});
</script>

<template>
  <div class="grid h-full grid-rows-[44px_1fr_32px] bg-[var(--cc-chalk)]">
    <TopToolbar />
    <div class="grid grid-cols-[220px_1fr_280px] overflow-hidden">
      <SourcesPanel />
      <StudioStage />
      <ControlsPanel />
    </div>
    <StatusBar />
  </div>
</template>
