<!--
  StudioStage — hosts the <canvas> the Pixi compositor renders into.

  The engine itself is mounted one level up in studios/[id].vue and provided
  via an injection key, so the toolbar / record / broadcast buttons can share
  a single compositor instance. StudioStage just slots the canvas element
  into the ref the page owns.
-->
<script setup lang="ts">
import { inject, type Ref } from "vue";
import { BroadcastFrame } from "@commoncast/design-system";

const canvasSlot = inject<Ref<HTMLCanvasElement | null>>("commoncast:canvas");

function setCanvas(el: Element | null) {
  if (canvasSlot) canvasSlot.value = el as HTMLCanvasElement | null;
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
        <canvas :ref="setCanvas" class="h-full w-full" />
      </BroadcastFrame>
    </div>
  </div>
</template>
