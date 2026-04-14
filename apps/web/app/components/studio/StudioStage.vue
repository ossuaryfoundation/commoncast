<!--
  StudioStage — hosts the Pixi canvas AND the numbered slot overlay.

  H1 repair pass:
    - Slot overlay divs → real <button>s with aria-label + Enter/Space
      keyboard handling so the stage is fully keyboard-accessible.
    - Edit/Operate mode: chips, empty labels, and clear buttons vanish
      in operate mode so the live canvas is clean. Auto-switches to
      operate when studio.isLive flips on, back to edit when it flips
      off. Manual toggle (button + `T` hotkey) is still available.
    - Removed the lying "Program / Preview" label — we only have one
      canvas. Shows the active scene name + shortcut in its place.
    - Onboarding CTA: when local media hasn't started yet, a centered
      card invites the user to enable camera and microphone.
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
const mode = computed(() => ctx.selection.mode.value);
const isEdit = computed(() => mode.value === "edit");
const mediaReady = computed(() => ctx.media.stream.value != null);

function handleSlotClick(slot: SlotView, evt: MouseEvent) {
  evt.stopPropagation();
  if (!isEdit.value) return;
  ctx.selection.toggleSlot(slot.index);
}

function handleSlotKeydown(slot: SlotView, evt: KeyboardEvent) {
  if (!isEdit.value) return;
  if (evt.key === "Enter" || evt.key === " ") {
    evt.preventDefault();
    ctx.selection.toggleSlot(slot.index);
  }
}

function handleSlotClear(slot: SlotView, evt: MouseEvent) {
  evt.stopPropagation();
  if (!studio.activeScene) return;
  studio.assignSlot(studio.activeScene.id, slot.index, null);
}

function clearSelection() {
  ctx.selection.clear();
}

async function onEnableMedia() {
  try {
    await ctx.requestMedia();
  } catch {
    // Errors are surfaced via the toast bus from inside requestMedia.
  }
}

function onKey(e: KeyboardEvent) {
  // Don't steal typing keys when the user is in a form field.
  const target = e.target as HTMLElement | null;
  if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
  if (e.key === "Escape") {
    ctx.selection.clear();
    return;
  }
  // `T` toggles edit/operate mode when no modifier is pressed
  if ((e.key === "t" || e.key === "T") && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    ctx.selection.toggleMode();
  }
}

onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));

const activeSceneName = computed(
  () => studio.activeScene?.name ?? studio.activeSceneId,
);
const activeShortcut = computed(
  () => studio.activeScene?.shortcut ?? "",
);

function labelForSlot(slot: SlotView): string {
  const src = slot.sourceId;
  if (!src) return `Slot ${slot.index + 1}, empty`;
  return `Slot ${slot.index + 1}, bound to ${ctx.labelForSource(src)}`;
}
</script>

<template>
  <div class="flex h-full min-h-0 min-w-0 flex-col bg-[var(--cc-chalk-cool)]">
    <!-- Stage header: scene identity + mode toggle + readout -->
    <div
      class="flex items-center justify-between border-b border-[color:var(--cc-border)] bg-[var(--cc-chalk-warm)] px-4 py-2"
    >
      <div class="flex items-center gap-3 font-ui text-[10px] uppercase tracking-[0.12em]">
        <span
          class="flex items-center gap-1.5 border border-[var(--cc-soot)] bg-[var(--cc-soot)] px-2 py-[2px] text-[9px] text-[var(--cc-chalk)]"
        >
          <span
            class="h-[5px] w-[5px] rounded-full"
            :class="
              ctx.fanout.aggregate.value === 'connected'
                ? 'bg-[var(--cc-live)]'
                : 'bg-[var(--cc-ink-ghost)]'
            "
          />
          {{ ctx.fanout.aggregate.value === "connected" ? "LIVE" : "STAGE" }}
        </span>
        <span class="text-[var(--cc-ink)]">{{ activeSceneName }}</span>
        <Kbd v-if="activeShortcut">{{ activeShortcut }}</Kbd>
      </div>
      <div class="flex items-center gap-3 font-ui text-[10px] uppercase tracking-[0.12em] text-[var(--cc-ink-muted)]">
        <!-- mode toggle -->
        <div
          class="flex items-center border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)]"
          role="group"
          aria-label="Stage mode"
        >
          <button
            type="button"
            class="px-2 py-[3px] font-ui text-[8.5px] uppercase tracking-[0.12em] transition-colors"
            :class="
              isEdit
                ? 'bg-[var(--cc-soot)] text-[var(--cc-chalk)]'
                : 'bg-transparent text-[var(--cc-ink-muted)] hover:text-[var(--cc-ink)]'
            "
            :aria-pressed="isEdit"
            @click="ctx.selection.setMode('edit')"
          >
            Edit
          </button>
          <button
            type="button"
            class="border-l border-[color:var(--cc-border-strong)] px-2 py-[3px] font-ui text-[8.5px] uppercase tracking-[0.12em] transition-colors"
            :class="
              !isEdit
                ? 'bg-[var(--cc-soot)] text-[var(--cc-chalk)]'
                : 'bg-transparent text-[var(--cc-ink-muted)] hover:text-[var(--cc-ink)]'
            "
            :aria-pressed="!isEdit"
            @click="ctx.selection.setMode('operate')"
          >
            Operate
          </button>
        </div>
        <Kbd>T</Kbd>
        <span class="mx-1 h-3 w-px bg-[var(--cc-border)]" />
        <span class="font-code text-[10px] tracking-[0.05em]">
          {{ CANVAS_W }}×{{ CANVAS_H }} · 30fps
        </span>
      </div>
    </div>

    <!-- Stage frame + slot overlay + onboarding CTA -->
    <div class="flex min-h-0 min-w-0 flex-1 items-center justify-center p-6">
      <div
        class="relative max-h-full max-w-full"
        :style="{ aspectRatio: '16 / 9', height: '100%' }"
      >
        <BroadcastFrame class="!h-full !w-full">
          <canvas :ref="setCanvas" class="absolute inset-0 h-full w-full" />

          <!-- clickable full-frame background clears selection (edit mode only) -->
          <div
            v-if="isEdit"
            class="absolute inset-0"
            @click="clearSelection"
          />

          <!-- numbered slot overlay -->
          <template v-if="isEdit">
            <button
              v-for="slot in slots"
              :key="slot.index"
              type="button"
              :aria-label="labelForSlot(slot)"
              :aria-pressed="selected === slot.index"
              class="absolute cursor-pointer transition-[box-shadow,border-color] duration-[var(--cc-dur-fast)] ease-[var(--cc-ease-smooth)]"
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
                    ? 'border border-dashed border-[rgba(244,242,239,0.2)] hover:border-[rgba(244,242,239,0.5)]'
                    : 'border border-dashed border-[rgba(244,242,239,0.38)] bg-[rgba(244,242,239,0.03)] hover:border-[rgba(244,242,239,0.68)] hover:bg-[rgba(244,242,239,0.06)]',
              ]"
              @click="(e) => handleSlotClick(slot, e)"
              @keydown="(e) => handleSlotKeydown(slot, e)"
            >
              <!-- slot index chip, top-left -->
              <div
                class="absolute left-0 top-0 flex items-center gap-1.5 px-1.5 py-[3px] font-ui text-[8.5px] uppercase tracking-[0.12em] leading-none"
                :class="
                  selected === slot.index
                    ? 'bg-[var(--cc-signal)] text-white'
                    : slot.sourceId
                      ? 'bg-[rgba(28,27,26,0.72)] text-[rgba(255,255,255,0.78)]'
                      : 'bg-[rgba(28,27,26,0.56)] text-[rgba(255,255,255,0.62)]'
                "
                aria-hidden
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
                      : 'text-[rgba(244,242,239,0.4)]'
                  "
                >
                  {{ selected === slot.index ? "Pick a source" : "Empty" }}
                </span>
              </div>

              <!-- bottom strip: source label + unassign action when bound -->
              <div
                v-if="slot.sourceId"
                class="pointer-events-none absolute right-0 bottom-0 left-0 flex items-center justify-between gap-2 bg-gradient-to-t from-[rgba(0,0,0,0.6)] to-transparent px-1.5 pt-3 pb-1"
              >
                <span
                  class="truncate font-body text-[10px] font-semibold text-white/90"
                >
                  {{ ctx.labelForSource(slot.sourceId) }}
                </span>
                <button
                  type="button"
                  class="pointer-events-auto shrink-0 border border-[rgba(255,255,255,0.22)] bg-[rgba(28,27,26,0.66)] px-1.5 py-[1px] font-ui text-[7.5px] uppercase tracking-[0.1em] text-white/80 transition-colors hover:bg-[var(--cc-signal)] hover:text-white"
                  :aria-label="`Clear ${ctx.labelForSource(slot.sourceId)} from slot ${slot.index + 1}`"
                  @click.stop="(e) => handleSlotClear(slot, e)"
                >
                  Clear
                </button>
              </div>
            </button>
          </template>

          <!-- Onboarding card: enable camera/mic -->
          <div
            v-if="!mediaReady"
            class="absolute inset-0 z-[5] flex items-center justify-center bg-[rgba(28,27,26,0.72)] backdrop-blur-[2px]"
          >
            <div
              class="flex max-w-[440px] flex-col gap-4 border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] p-6 shadow-[var(--cc-shadow-lg)]"
            >
              <span
                class="font-ui text-[9px] uppercase tracking-[0.14em] text-[var(--cc-signal)]"
              >Setup required</span>
              <h2
                class="font-display text-[22px] font-semibold tracking-[-0.01em] text-[var(--cc-ink)]"
              >
                Enable camera &amp; microphone
              </h2>
              <p class="font-body text-[13px] leading-[1.5] text-[var(--cc-ink-soft)]">
                commoncast runs the entire mixer in your browser. Give it
                access to your camera and microphone to join the room —
                you can revoke access anytime from your browser settings.
              </p>
              <button
                type="button"
                class="self-start border border-[var(--cc-signal-strong)] bg-[var(--cc-signal)] px-4 py-2 font-ui text-[10px] uppercase tracking-[0.14em] text-white transition-colors hover:bg-[var(--cc-signal-hover)]"
                @click="onEnableMedia"
              >
                Enable camera &amp; mic
              </button>
            </div>
          </div>
        </BroadcastFrame>
      </div>
    </div>

    <!-- footer status -->
    <div
      class="border-t border-[color:var(--cc-border)] bg-[var(--cc-chalk-warm)] px-4 py-[6px] font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--cc-ink-muted)]"
    >
      <span v-if="!isEdit" class="text-[var(--cc-ink-ghost)]">
        Operate mode · press <Kbd>T</Kbd> to edit slots
      </span>
      <span v-else-if="selected != null">
        Slot {{ selected + 1 }} selected · click a source in the people panel, or press
        <Kbd>Esc</Kbd>
      </span>
      <span v-else>
        Click a numbered slot to bind a source · <Kbd>T</Kbd> toggles edit/operate
      </span>
    </div>
  </div>
</template>
