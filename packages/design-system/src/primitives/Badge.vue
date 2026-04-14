<!--
  commoncast / Badge — small uppercase label.
  Variants mirror `.badge-*` classes from the design-system mockup.
-->
<script setup lang="ts">
import { tv, type VariantProps } from "tailwind-variants";

const badge = tv({
  base: [
    "inline-block font-ui uppercase tracking-wide",
    "px-[7px] py-[2px] text-[9px]",
    "border rounded-[var(--cc-radius-sm)]",
    "leading-[1.6] select-none",
  ],
  variants: {
    variant: {
      signal:
        "text-[var(--cc-signal)] border-[var(--cc-signal)] bg-[var(--cc-signal-dim)]",
      live: "text-[var(--cc-live)] border-[var(--cc-live)] bg-[var(--cc-live-dim)]",
      caution:
        "text-[var(--cc-caution)] border-[var(--cc-caution)] bg-[var(--cc-caution-dim)]",
      info: "text-[var(--cc-info)] border-[var(--cc-info)] bg-[var(--cc-info-dim)]",
      neutral:
        "text-[var(--cc-ink-muted)] border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk-warm)]",
      clasp:
        "text-[var(--cc-clasp)] border-[var(--cc-clasp)] bg-[color-mix(in_oklab,var(--cc-clasp)_8%,transparent)]",
      pixi: "text-[var(--cc-pixi)] border-[var(--cc-pixi)] bg-[color-mix(in_oklab,var(--cc-pixi)_8%,transparent)]",
      lvqr: "text-[var(--cc-lvqr)] border-[var(--cc-lvqr)] bg-[color-mix(in_oklab,var(--cc-lvqr)_8%,transparent)]",
      webrtc:
        "text-[var(--cc-webrtc)] border-[var(--cc-webrtc)] bg-[color-mix(in_oklab,var(--cc-webrtc)_8%,transparent)]",
    },
  },
  defaultVariants: { variant: "neutral" },
});

type BadgeVariants = VariantProps<typeof badge>;

defineProps<{ variant?: BadgeVariants["variant"] }>();
</script>

<template>
  <span :class="badge({ variant })">
    <slot />
  </span>
</template>
