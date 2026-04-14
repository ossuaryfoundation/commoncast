<!--
  commoncast / Toast — single notification card.

  Presentational only. Four kinds (info / success / warn / error) drive a
  left accent bar + the mono kind-label color; everything else is static
  editorial: sharp-edged chalk card, hard-offset shadow, display title,
  body-sans description, optional action button, dismiss ×.

  Width clamped to 320–420 for consistency across the stack. Consumers
  wrap many Toast instances in a Vue <TransitionGroup> for enter/leave.
-->
<script setup lang="ts">
import { computed } from "vue";

export type ToastKind = "info" | "success" | "warn" | "error";

const props = defineProps<{
  kind: ToastKind;
  title: string;
  description?: string;
  actionLabel?: string;
}>();

defineEmits<{
  (e: "action"): void;
  (e: "dismiss"): void;
}>();

const accentVar = computed(() => {
  switch (props.kind) {
    case "info":
      return "var(--cc-info)";
    case "success":
      return "var(--cc-live)";
    case "warn":
      return "var(--cc-caution)";
    case "error":
      return "var(--cc-signal)";
  }
});

const kindLabel = computed(() => {
  switch (props.kind) {
    case "info":
      return "Info";
    case "success":
      return "Success";
    case "warn":
      return "Warning";
    case "error":
      return "Error";
  }
});
</script>

<template>
  <div
    class="pointer-events-auto relative flex min-w-[320px] max-w-[420px] border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] shadow-[var(--cc-shadow-md)]"
    role="status"
    :aria-live="kind === 'error' ? 'assertive' : 'polite'"
  >
    <span
      class="w-[4px] self-stretch shrink-0"
      :style="{ background: accentVar }"
    />

    <div class="flex flex-1 flex-col gap-1 py-3 pl-3 pr-10">
      <span
        class="font-ui text-[9px] uppercase tracking-[0.14em] leading-none"
        :style="{ color: accentVar }"
      >
        {{ kindLabel }}
      </span>
      <h3
        class="font-display text-[14px] font-semibold tracking-[-0.01em] text-[var(--cc-ink)]"
      >
        {{ title }}
      </h3>
      <p
        v-if="description"
        class="font-body text-[12px] leading-[1.45] text-[var(--cc-ink-muted)]"
      >
        {{ description }}
      </p>
      <button
        v-if="actionLabel"
        type="button"
        class="mt-1 self-start border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk-warm)] px-2 py-[3px] font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--cc-ink)] transition-colors hover:bg-[var(--cc-chalk-deep)]"
        @click="$emit('action')"
      >
        {{ actionLabel }}
      </button>
    </div>

    <button
      type="button"
      class="absolute right-[6px] top-[6px] flex h-5 w-5 items-center justify-center font-ui text-[13px] leading-none text-[var(--cc-ink-ghost)] transition-colors hover:text-[var(--cc-ink)]"
      aria-label="Dismiss notification"
      @click="$emit('dismiss')"
    >
      ×
    </button>
  </div>
</template>
