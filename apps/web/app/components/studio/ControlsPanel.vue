<script setup lang="ts">
import { ref } from "vue";
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

const studio = useStudioStore();

const tabs = [
  { id: "layout", label: "Layout" },
  { id: "overlays", label: "Overlays" },
  { id: "scenes", label: "Scenes" },
  { id: "brand", label: "Brand" },
  { id: "chat", label: "Chat" },
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
</script>

<template>
  <aside
    class="flex h-full w-[280px] shrink-0 flex-col border-l border-[color:var(--cc-border)] bg-[var(--cc-chalk-warm)]"
  >
    <PanelHeader title="Controls" />
    <Tabs v-model="activeTab" :tabs="tabs" />

    <div class="flex-1 overflow-y-auto px-4 py-4">
      <!-- Layout -->
      <div v-if="activeTab === 'layout'" class="grid grid-cols-3 gap-2">
        <LayoutOption
          v-for="l in layouts"
          :key="l.id"
          :id="l.id"
          :label="l.label"
          :active="studio.activeLayout === l.id"
          @select="studio.setLayout(l.id)"
        />
      </div>

      <!-- Overlays -->
      <div v-else-if="activeTab === 'overlays'" class="flex flex-col">
        <OverlayRow
          :model-value="studio.overlays.logo"
          label="Logo"
          description="Image · Top Right"
          @update:model-value="studio.setOverlay('logo', $event)"
        />
        <OverlayRow
          :model-value="studio.overlays.lowerThird"
          label="Lower Third"
          description="Banner"
          @update:model-value="studio.setOverlay('lowerThird', $event)"
        />
        <OverlayRow
          :model-value="studio.overlays.ticker"
          label="Ticker"
          description="Scrolling Text"
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
          <div class="mb-2 font-ui text-[9px] uppercase tracking-wide text-[var(--cc-ink-muted)]">
            Accent Color
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
        <Input
          v-model="studio.brand.lowerName"
          label="Lower Third Name"
        />
        <Input
          v-model="studio.brand.lowerSubtitle"
          label="Lower Third Subtitle"
        />
        <Input v-model="studio.brand.logoText" label="Logo Text" />
        <Input v-model="studio.brand.tickerText" label="Ticker Text" />
      </div>

      <!-- Chat -->
      <div v-else class="font-ui text-[10px] text-[var(--cc-ink-muted)]">
        Chat integration ships after MVP.
      </div>
    </div>
  </aside>
</template>
