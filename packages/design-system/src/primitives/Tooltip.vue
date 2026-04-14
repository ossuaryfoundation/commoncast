<!--
  commoncast / Tooltip — headless wrapper around reka-ui's Tooltip.

  Presentational only: consumers put the triggering element in the
  default slot, pass a string in `content` (or a named `content` slot
  for rich content). Focus + hover open / close is handled by reka-ui;
  we only style the content panel.

  Editorial aesthetic: dark soot panel, mono label, wide tracking,
  hard-offset shadow. Tooltips are information, not decoration — they
  should feel like captions on a broadsheet, not SaaS bubbles.
-->
<script setup lang="ts">
import {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
} from "reka-ui";

withDefaults(
  defineProps<{
    content?: string;
    /** Hover delay (ms) before the tooltip appears. Default 400. */
    delayDuration?: number;
    side?: "top" | "right" | "bottom" | "left";
    sideOffset?: number;
    align?: "start" | "center" | "end";
    disabled?: boolean;
  }>(),
  {
    delayDuration: 400,
    side: "top",
    sideOffset: 6,
    align: "center",
  },
);
</script>

<template>
  <TooltipProvider :delay-duration="delayDuration">
    <TooltipRoot :disabled="disabled">
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          :side="side"
          :side-offset="sideOffset"
          :align="align"
          class="z-[70] border border-[color:var(--cc-border-strong)] bg-[var(--cc-soot)] px-2 py-[5px] font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--cc-chalk)] shadow-[var(--cc-shadow-md)] will-change-[opacity,transform] data-[state=delayed-open]:animate-in data-[state=closed]:animate-out"
        >
          <slot name="content">{{ content }}</slot>
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
