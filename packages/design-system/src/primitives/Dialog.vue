<!--
  commoncast / Dialog — headless wrapper around reka-ui's modal Dialog.

  Handles the hard things (focus trap, initial focus, Esc to close,
  backdrop click, portal, ARIA) via reka-ui. We style an editorial
  card: chalk background, sharp-edged border, hard-offset shadow,
  display-font title in a muted-warm header, optional description,
  main content in a scrollable body, actions in a footer.

  v-model:open on the root. Consumers can pass:
    - `title`: required string
    - `description`: optional secondary string
    - `width`: CSS length for the dialog frame
    - default slot: main content
    - `actions` slot (with { close } props): footer buttons
-->
<script setup lang="ts">
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "reka-ui";

const open = defineModel<boolean>("open", { default: false });

withDefaults(
  defineProps<{
    title: string;
    description?: string;
    width?: string;
    /** If true, clicking the backdrop or pressing Esc does nothing. */
    modal?: boolean;
  }>(),
  { width: "440px", modal: true },
);

function close() {
  open.value = false;
}
</script>

<template>
  <DialogRoot v-model:open="open" :modal="modal">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-[65] bg-[var(--cc-soot)]/60 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out"
      />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-[66] flex max-h-[90vh] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 flex-col border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] shadow-[var(--cc-shadow-lg)] focus:outline-none"
        :style="{ width }"
      >
        <header
          class="flex shrink-0 items-start justify-between gap-3 border-b border-[color:var(--cc-border)] bg-[var(--cc-chalk-warm)] px-5 py-4"
        >
          <div class="min-w-0 flex-1">
            <DialogTitle
              class="truncate font-display text-[15px] font-semibold tracking-[-0.01em] text-[var(--cc-ink)]"
            >
              {{ title }}
            </DialogTitle>
            <DialogDescription
              v-if="description"
              class="mt-1 font-body text-[12px] text-[var(--cc-ink-muted)]"
            >
              {{ description }}
            </DialogDescription>
          </div>
          <DialogClose
            class="flex h-6 w-6 shrink-0 items-center justify-center border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] font-ui text-[12px] leading-none text-[var(--cc-ink-muted)] transition-colors hover:bg-[var(--cc-chalk-warm)] hover:text-[var(--cc-ink)]"
            aria-label="Close dialog"
          >
            ×
          </DialogClose>
        </header>

        <div class="flex-1 overflow-y-auto px-5 py-4">
          <slot :close="close" />
        </div>

        <footer
          v-if="$slots.actions"
          class="flex shrink-0 items-center justify-end gap-2 border-t border-[color:var(--cc-border)] bg-[var(--cc-chalk-warm)] px-5 py-3"
        >
          <slot name="actions" :close="close" />
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
