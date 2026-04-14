<!--
  StudioStage — the preview/broadcast frame.

  This is where the Pixi canvas lives. The engine is mounted via
  useStudioEngine(canvasRef). The wrapper <BroadcastFrame> is pure
  presentation from the design system.
-->
<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { BroadcastFrame } from "@commoncast/design-system";
import { useStudioEngine } from "~/composables/useStudioEngine";
import { useUserMedia } from "~/composables/useUserMedia";
import { useStudioStore } from "~/stores/studio";
import { asSceneId, asSourceId } from "@commoncast/studio-engine";

const canvas = ref<HTMLCanvasElement | null>(null);
const engine = useStudioEngine(canvas, { width: 1280, height: 720, fps: 30 });
const media = useUserMedia();
const studio = useStudioStore();

onMounted(async () => {
  // Best-effort local camera. Fail silently if denied — the canvas still renders.
  try {
    await media.start({ audio: false, video: { width: 1280, height: 720 } });
  } catch {
    // no camera — the studio still works for layout/branding previews
  }
});

// Once both engine and camera are ready, add the camera as a source and
// assemble the scene according to the store.
watch(
  [engine.ready, media.videoTrack],
  async ([ready, track]) => {
    if (!ready || !engine.compositor.value) return;
    if (track) {
      await engine.addSource({
        kind: "camera",
        id: asSourceId("local"),
        name: "You",
        track,
      });
    }
    renderScene();
  },
);

// Update the engine whenever scene-relevant store fields change.
watch(
  () => [studio.activeLayout, studio.overlays, studio.brand, studio.activeSceneId],
  () => renderScene(),
  { deep: true },
);

function renderScene() {
  if (!engine.ready.value) return;
  const sourceIds = media.videoTrack.value ? [asSourceId("local")] : [];
  engine.setScene({
    id: asSceneId(studio.activeSceneId),
    name: studio.activeScene?.name ?? "",
    layout: studio.activeLayout,
    feeds: sourceIds,
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
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center justify-between border-b border-[color:var(--cc-border)] px-4 py-2">
      <div class="flex gap-4 font-ui text-[10px] uppercase tracking-wide">
        <span class="text-[var(--cc-ink)]">Program</span>
        <span class="text-[var(--cc-ink-muted)]">Preview</span>
      </div>
      <span class="font-code text-[10px] text-[var(--cc-ink-muted)]">1280×720 · 30fps</span>
    </div>

    <div class="flex flex-1 items-center justify-center p-6">
      <BroadcastFrame class="max-w-full">
        <canvas ref="canvas" class="h-full w-full" />
      </BroadcastFrame>
    </div>
  </div>
</template>
