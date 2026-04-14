<!--
  commoncast / Button

  Presentational only: props in, events out. Never imports stores, composables,
  or business logic.

  Variants and sizes mirror the `.btn.*` classes in docs/mockups/design-system.html.
-->
<script setup lang="ts">
import { tv, type VariantProps } from "tailwind-variants";

const button = tv({
  base: [
    "inline-flex items-center justify-center gap-2",
    "font-ui uppercase tracking-wide",
    "border border-[color:var(--cc-border-strong)]",
    "transition-[background,color,box-shadow] duration-[var(--cc-dur-fast)] ease-[var(--cc-ease-snappy)]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--cc-signal)]",
    "rounded-[var(--cc-radius-md)]",
  ],
  variants: {
    variant: {
      default: "bg-[var(--cc-chalk)] text-[var(--cc-ink-soft)] hover:bg-[var(--cc-chalk-warm)]",
      primary:
        "bg-[var(--cc-signal)] text-white border-[var(--cc-signal-strong)] hover:bg-[var(--cc-signal-hover)]",
      live:
        "bg-[var(--cc-live)] text-white border-[color:color-mix(in_oklab,var(--cc-live)_70%,black)] hover:brightness-95",
      ghost:
        "bg-transparent text-[var(--cc-ink-muted)] border-[color:var(--cc-border)] hover:text-[var(--cc-ink)] hover:border-[color:var(--cc-border-strong)]",
      dark:
        "bg-[var(--cc-soot)] text-[var(--cc-chalk)] border-[var(--cc-soot-mid)] hover:bg-[var(--cc-soot-mid)]",
    },
    size: {
      sm: "px-[10px] py-[5px] text-[9px]",
      md: "px-4 py-2 text-[11px]",
      lg: "px-6 py-3 text-[13px]",
    },
    block: {
      true: "w-full",
      false: "",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
    block: false,
  },
});

type ButtonVariants = VariantProps<typeof button>;

withDefaults(
  defineProps<{
    variant?: ButtonVariants["variant"];
    size?: ButtonVariants["size"];
    block?: boolean;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
  }>(),
  { type: "button" },
);

defineEmits<{ (e: "click", evt: MouseEvent): void }>();
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="button({ variant, size, block })"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>
