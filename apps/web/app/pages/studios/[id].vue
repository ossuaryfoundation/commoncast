<!--
  Studio — the host broadcasting interface. This is the heart of commoncast.
-->
<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useStudioStore } from "~/stores/studio";
import { useRoute } from "vue-router";
import TopToolbar from "~/components/studio/TopToolbar.vue";
import SourcesPanel from "~/components/studio/SourcesPanel.vue";
import StudioStage from "~/components/studio/StudioStage.vue";
import ControlsPanel from "~/components/studio/ControlsPanel.vue";
import StatusBar from "~/components/studio/StatusBar.vue";

definePageMeta({ layout: "studio" });

const studio = useStudioStore();
const route = useRoute();
studio.studioId = String(route.params.id ?? "default");

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

onMounted(() => window.addEventListener("keydown", handleKey));
onUnmounted(() => window.removeEventListener("keydown", handleKey));
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
