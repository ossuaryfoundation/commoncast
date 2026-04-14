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
import { computed, nextTick, ref } from "vue";
import {
  ColorSwatch,
  Input,
  LayoutOption,
  Menu,
  OverlayRow,
  PanelHeader,
  SceneButton,
  Tabs,
  type LayoutId,
  type MenuItem,
} from "@commoncast/design-system";
import { useStudioStore } from "~/stores/studio";
import AudioMixerStrip from "~/components/studio/AudioMixerStrip.vue";

const studio = useStudioStore();

// ─── scene editor state ─────────────────────────────────────────
const editingSceneId = ref<string | null>(null);
const editingName = ref("");
const nameInputRef = ref<HTMLInputElement | null>(null);

async function startRename(sceneId: string, currentName: string) {
  editingSceneId.value = sceneId;
  editingName.value = currentName;
  await nextTick();
  nameInputRef.value?.focus();
  nameInputRef.value?.select();
}
function commitRename() {
  if (!editingSceneId.value) return;
  studio.renameScene(editingSceneId.value, editingName.value);
  editingSceneId.value = null;
}
function cancelRename() {
  editingSceneId.value = null;
}

function addSceneClicked() {
  const scene = studio.addScene({ name: `Scene ${studio.scenes.length + 1}` });
  studio.setScene(scene.id);
  void startRename(scene.id, scene.name);
}

function sceneMenuItems(sceneId: string): MenuItem[] {
  return [
    { id: "rename", label: "Rename" },
    { id: "duplicate", label: "Duplicate" },
    { kind: "separator" },
    {
      id: "delete",
      label: "Delete",
      destructive: true,
      disabled: studio.scenes.length <= 1,
    },
  ];
}

function handleSceneMenu(sceneId: string, action: string) {
  const scene = studio.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  switch (action) {
    case "rename":
      void startRename(sceneId, scene.name);
      break;
    case "duplicate":
      studio.duplicateScene(sceneId);
      break;
    case "delete":
      studio.removeScene(sceneId);
      break;
  }
}

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
      <div v-else-if="activeTab === 'scenes'" class="flex flex-col gap-2">
        <div
          v-for="scene in studio.scenes"
          :key="scene.id"
          class="flex items-stretch"
        >
          <!-- Inline rename editor when this row is being edited. -->
          <label
            v-if="editingSceneId === scene.id"
            class="group flex min-w-0 flex-1 items-center gap-3 border-l-[3px] border-l-[var(--cc-signal)] bg-[var(--cc-chalk)] px-3 py-3"
          >
            <span
              class="inline-flex h-6 w-6 items-center justify-center rounded-[var(--cc-radius-sm)] bg-[var(--cc-soot)] font-ui text-[9px] text-[var(--cc-chalk)]"
            >{{ scene.index }}</span>
            <input
              ref="nameInputRef"
              v-model="editingName"
              type="text"
              class="min-w-0 flex-1 border-0 bg-transparent font-display text-[13px] font-semibold text-[var(--cc-ink)] outline-none"
              @keydown.enter.prevent="commitRename"
              @keydown.escape.prevent="cancelRename"
              @blur="commitRename"
            />
          </label>
          <SceneButton
            v-else
            :index="scene.index"
            :name="scene.name"
            :shortcut="scene.shortcut"
            :active="studio.activeSceneId === scene.id"
            class="min-w-0 flex-1"
            @select="studio.setScene(scene.id)"
            @dblclick="startRename(scene.id, scene.name)"
          />
          <Menu
            :items="sceneMenuItems(scene.id)"
            @select="(id) => handleSceneMenu(scene.id, id)"
          >
            <template #trigger>
              <button
                type="button"
                class="flex h-full shrink-0 items-center justify-center border-y border-r border-[color:var(--cc-border)] bg-[var(--cc-chalk)] px-2 font-ui text-[var(--cc-ink-muted)] transition-colors hover:bg-[var(--cc-chalk-warm)] hover:text-[var(--cc-ink)]"
                aria-label="Scene actions"
              >
                <svg width="12" height="4" viewBox="0 0 12 4" aria-hidden>
                  <circle cx="2" cy="2" r="1" fill="currentColor" />
                  <circle cx="6" cy="2" r="1" fill="currentColor" />
                  <circle cx="10" cy="2" r="1" fill="currentColor" />
                </svg>
              </button>
            </template>
          </Menu>
        </div>

        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 border border-dashed border-[color:var(--cc-border-strong)] bg-transparent px-3 py-2 font-ui text-[9.5px] uppercase tracking-[0.12em] text-[var(--cc-ink-muted)] transition-colors hover:border-[color:var(--cc-ink-muted)] hover:text-[var(--cc-ink)]"
          @click="addSceneClicked"
        >
          + Add scene
        </button>

        <p
          class="border-t border-[color:var(--cc-border)] pt-2 font-ui text-[8.5px] uppercase leading-[1.5] tracking-[0.1em] text-[var(--cc-ink-ghost)]"
        >
          Double-click a scene to rename · F1-F5 recall the first five
        </p>
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
