<!--
  ControlsPanel — right-side inspector.

  Five tabs. Every tab is wired to real state:

  - Layout    → setSceneLayout(activeSceneId, …); rebuilds the selected
                scene's feeds array around the new slot count. No more
                "global activeLayout" — layout is a per-scene property.
  - Overlays  → reads/writes activeScene.overlays, not a global overlay
                bag. Flipping logo on the Panel scene no longer flips
                logo on every other scene.
  - Scenes    → F1–F5 scene recall buttons (unchanged).
  - Brand     → brand store edits (still persisted via pinia-persist).
  - Chat      → deliberate empty state until the real chat slice lands.
-->
<script setup lang="ts">
import { computed, ref } from "vue";
import {
  ColorSwatch,
  Input,
  LayoutOption,
  OverlayRow,
  PanelHeader,
  SceneButton,
  Tabs,
  type LayoutId,
} from "@commoncast/design-system";
import { useStudioStore } from "~/stores/studio";
import AudioMixerStrip from "~/components/studio/AudioMixerStrip.vue";

const studio = useStudioStore();

const tabs = [
  { id: "layout", label: "Layout" },
  { id: "audio", label: "Audio" },
  { id: "overlays", label: "Overlays" },
  { id: "scenes", label: "Scenes" },
  { id: "brand", label: "Brand" },
] as const;
type TabId = (typeof tabs)[number]["id"];
const activeTab = ref<TabId>("layout");

const layouts: Array<{ id: LayoutId; label: string }> = [
  { id: "solo", label: "Solo" },
  { id: "split", label: "Split" },
  { id: "grid", label: "Grid" },
  { id: "speaker", label: "Speaker" },
  { id: "sidebar", label: "Sidebar" },
  { id: "pip", label: "PiP" },
];

const activeLayout = computed<LayoutId>(
  () => studio.activeScene?.layout ?? "grid",
);
const overlayState = computed(() => ({
  logo: studio.activeScene?.overlays.logo ?? false,
  lowerThird: studio.activeScene?.overlays.lowerThird ?? false,
  ticker: studio.activeScene?.overlays.ticker ?? false,
}));
</script>

<template>
  <aside
    class="flex h-full w-[280px] shrink-0 flex-col border-l border-[color:var(--cc-border)] bg-[var(--cc-chalk-warm)]"
  >
    <PanelHeader title="Controls" />
    <Tabs v-model="activeTab" :tabs="tabs" />

    <div class="flex-1 overflow-y-auto px-4 py-4">
      <!-- Layout -->
      <div v-if="activeTab === 'layout'" class="flex flex-col gap-3">
        <p class="font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--cc-ink-muted)]">
          Layout for <span class="text-[var(--cc-ink)]">{{ studio.activeScene?.name }}</span>
        </p>
        <div class="grid grid-cols-3 gap-2">
          <LayoutOption
            v-for="l in layouts"
            :id="l.id"
            :key="l.id"
            :label="l.label"
            :active="activeLayout === l.id"
            @select="studio.setLayout(l.id)"
          />
        </div>
      </div>

      <!-- Audio mixer -->
      <div v-else-if="activeTab === 'audio'">
        <AudioMixerStrip />
      </div>

      <!-- Overlays (per scene) -->
      <div v-else-if="activeTab === 'overlays'" class="flex flex-col">
        <p class="mb-3 font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--cc-ink-muted)]">
          Overlays for <span class="text-[var(--cc-ink)]">{{ studio.activeScene?.name }}</span>
        </p>
        <OverlayRow
          :model-value="overlayState.logo"
          label="Logo"
          description="Image · Top Right"
          @update:model-value="studio.setOverlay('logo', $event)"
        />
        <OverlayRow
          :model-value="overlayState.lowerThird"
          label="Lower Third"
          description="Name · Subtitle"
          @update:model-value="studio.setOverlay('lowerThird', $event)"
        />
        <OverlayRow
          :model-value="overlayState.ticker"
          label="Ticker"
          description="Scrolling text"
          @update:model-value="studio.setOverlay('ticker', $event)"
        />
      </div>

      <!-- Scenes -->
      <div v-else-if="activeTab === 'scenes'" class="flex flex-col gap-1">
        <SceneButton
          v-for="scene in studio.scenes"
          :key="scene.id"
          :index="scene.index"
          :name="scene.name"
          :shortcut="scene.shortcut"
          :active="studio.activeSceneId === scene.id"
          @select="studio.setScene(scene.id)"
        />
      </div>

      <!-- Brand -->
      <div v-else-if="activeTab === 'brand'" class="flex flex-col gap-4">
        <div>
          <div class="mb-2 font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--cc-ink-muted)]">
            Accent color
          </div>
          <div class="flex flex-wrap gap-2">
            <ColorSwatch
              v-for="c in studio.accentPalette"
              :key="c"
              :color="c"
              :active="studio.brand.accent === c"
              @select="studio.setAccent(c)"
            />
          </div>
        </div>
        <Input v-model="studio.brand.lowerName" label="Lower third name" />
        <Input v-model="studio.brand.lowerSubtitle" label="Lower third subtitle" />
        <Input v-model="studio.brand.logoText" label="Logo text" />
        <Input v-model="studio.brand.tickerText" label="Ticker text" />
      </div>

    </div>
  </aside>
</template>
