<!--
  StudioStage — hosts the Pixi canvas AND the numbered slot overlay.

  The compositor lives one level up (studios/[id].vue) and provides
  the canvas ref + the StudioContext via inject. This component is
  responsible for:

  1. slotting the <canvas> element into the page's ref so the compositor
     can mount into it;
  2. drawing a transparent overlay of numbered slot rectangles on top of
     the canvas, sized in percentage units from the studio-engine's
     computeSlots() so the HTML grid is pixel-identical to the Pixi grid;
  3. handling clicks/keystrokes to select/deselect slots via the shared
     useStageSelection state — the Inventory panel reads that selection
     to route the next click-to-assign.

  Visual language: sharp-edged numbered badges in the top-left of each
  slot (DM Mono, 9px), dashed outlines for empty slots, solid signal-red
  ring for the currently selected slot, minimal fill that never obscures
  the underlying video.
-->
<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, type Ref } from "vue";
import { BroadcastFrame, Kbd } from "@commoncast/design-system";
import { computeSlots, getSlotCount } from "@commoncast/studio-engine";
import { useStudioContext } from "~/composables/useStudioContext";
import { useStudioStore } from "~/stores/studio";

const canvasSlot = inject<Ref<HTMLCanvasElement | null>>("commoncast:canvas");
function setCanvas(el: Element | null) {
  if (canvasSlot) canvasSlot.value = el as HTMLCanvasElement | null;
}

const ctx = useStudioContext();
const studio = useStudioStore();

const CANVAS_W = 1280;
const CANVAS_H = 720;

interface SlotView {
  index: number;
  left: string;
  top: string;
  width: string;
  height: string;
  sourceId: string | null;
}

const slots = computed<SlotView[]>(() => {
  const scene = studio.activeScene;
  if (!scene) return [];
  const rects = computeSlots(scene.layout, CANVAS_W, CANVAS_H);
  const count = getSlotCount(scene.layout);
  const out: SlotView[] = [];
  for (let i = 0; i < count; i++) {
    const r = rects[i];
    if (!r) continue;
    out.push({
      index: i,
      left: `${(r.x / CANVAS_W) * 100}%`,
      top: `${(r.y / CANVAS_H) * 100}%`,
      width: `${(r.width / CANVAS_W) * 100}%`,
      height: `${(r.height / CANVAS_H) * 100}%`,
      sourceId: scene.feeds[i] ?? null,
    });
  }
  return out;
});

const selected = computed(() => ctx.selection.slot.value);

function handleSlotClick(slot: SlotView, evt: MouseEvent) {
  evt.stopPropagation();
  ctx.selection.toggleSlot(slot.index);
}

function handleSlotClear(slot: SlotView, evt: MouseEvent) {
  evt.stopPropagation();
  if (!studio.activeScene) return;
  studio.assignSlot(studio.activeScene.id, slot.index, null);
}

function clearSelection() {
  ctx.selection.clear();
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") ctx.selection.clear();
}
onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));

const activeSceneName = computed(
  () => studio.activeScene?.name ?? studio.activeSceneId,
);
const activeShortcut = computed(
  () => studio.activeScene?.shortcut ?? "",
);
</script>

<template>
  <div class="flex h-full min-h-0 min-w-0 flex-col bg-[var(--cc-chalk-cool)]">
    <div
      class="flex items-center justify-between border-b border-[color:var(--cc-border)] bg-[var(--cc-chalk-warm)] px-4 py-2"
    >
      <div class="flex items-center gap-3 font-ui text-[10px] uppercase tracking-[0.12em]">
        <span
          class="border border-[color:var(--cc-soot)] bg-[var(--cc-soot)] px-2 py-[2px] text-[9px] text-[var(--cc-chalk)]"
        >Program</span>
        <span class="text-[var(--cc-ink-ghost)]">Preview</span>
        <span class="mx-1 h-3 w-px bg-[var(--cc-border)]" />
        <span class="text-[var(--cc-ink)]">{{ activeSceneName }}</span>
        <Kbd v-if="activeShortcut">{{ activeShortcut }}</Kbd>
      </div>
      <span class="font-code text-[10px] tracking-[0.05em] text-[var(--cc-ink-muted)]">
        {{ CANVAS_W }}×{{ CANVAS_H }} · 30fps
      </span>
    </div>

    <div class="flex min-h-0 min-w-0 flex-1 items-center justify-center p-6">
      <div
        class="relative max-h-full max-w-full"
        :style="{ aspectRatio: '16 / 9', height: '100%' }"
      >
        <BroadcastFrame class="!h-full !w-full">
          <canvas :ref="setCanvas" class="absolute inset-0 h-full w-full" />

        <!-- clickable full-frame background clears selection -->
        <div class="absolute inset-0" @click="clearSelection" />

        <!-- numbered slot overlay -->
        <div
          v-for="slot in slots"
          :key="slot.index"
          class="absolute cursor-pointer transition-[box-shadow,border-color] duration-[var(--cc-dur-fast)] ease-[var(--cc-ease-snappy)]"
          :style="{
            left: slot.left,
            top: slot.top,
            width: slot.width,
            height: slot.height,
          }"
          :class="[
            selected === slot.index
              ? 'border-2 border-[var(--cc-signal)] shadow-[inset_0_0_0_1px_rgba(244,242,239,0.3)]'
              : slot.sourceId
              ? 'border border-dashed border-[rgba(244,242,239,0.18)] hover:border-[rgba(244,242,239,0.45)]'
              : 'border border-dashed border-[rgba(244,242,239,0.35)] bg-[rgba(244,242,239,0.03)] hover:border-[rgba(244,242,239,0.65)] hover:bg-[rgba(244,242,239,0.06)]',
          ]"
          @click="(e) => handleSlotClick(slot, e)"
        >
          <!-- slot index chip, top-left -->
          <div
            class="absolute left-0 top-0 flex items-center gap-1.5 px-1.5 py-[3px] font-ui text-[8.5px] uppercase tracking-[0.12em] leading-none"
            :class="
              selected === slot.index
                ? 'bg-[var(--cc-signal)] text-white'
                : slot.sourceId
                ? 'bg-[rgba(28,27,26,0.7)] text-[rgba(255,255,255,0.7)]'
                : 'bg-[rgba(28,27,26,0.5)] text-[rgba(255,255,255,0.55)]'
            "
          >
            <span>{{ String(slot.index + 1).padStart(2, "0") }}</span>
          </div>

          <!-- empty-slot centered hint -->
          <div
            v-if="!slot.sourceId"
            class="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <span
              class="font-ui text-[9px] uppercase tracking-[0.18em]"
              :class="
                selected === slot.index
                  ? 'text-[var(--cc-signal)]'
                  : 'text-[rgba(244,242,239,0.35)]'
              "
            >
              {{ selected === slot.index ? "Pick a source" : "Empty" }}
            </span>
          </div>

          <!-- bottom strip: source label + unassign action when bound -->
          <div
            v-if="slot.sourceId"
            class="absolute right-0 bottom-0 left-0 flex items-center justify-between gap-2 bg-gradient-to-t from-[rgba(0,0,0,0.6)] to-transparent px-1.5 pt-3 pb-1"
          >
            <span
              class="truncate font-body text-[10px] font-semibold text-white/90"
            >
              {{ ctx.labelForSource(slot.sourceId) }}
            </span>
            <button
              type="button"
              class="shrink-0 border border-[rgba(255,255,255,0.2)] bg-[rgba(28,27,26,0.6)] px-1.5 py-[1px] font-ui text-[7.5px] uppercase tracking-[0.1em] text-white/70 transition-colors hover:bg-[var(--cc-signal)] hover:text-white"
              @click="(e) => handleSlotClear(slot, e)"
            >
              Clear
            </button>
          </div>
        </div>
        </BroadcastFrame>
      </div>
    </div>

    <div
      class="border-t border-[color:var(--cc-border)] bg-[var(--cc-chalk-warm)] px-4 py-[6px] font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--cc-ink-muted)]"
    >
      <span v-if="selected != null">
        Slot {{ selected + 1 }} selected · click a source in the inventory, or press
        <Kbd>Esc</Kbd>
      </span>
      <span v-else>
        Click a numbered slot to bind a source
      </span>
    </div>
  </div>
</template>
