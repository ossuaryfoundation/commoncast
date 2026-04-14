<!--
  commoncast / Drawer — edge-aligned sheet with a dimmed backdrop.

  Presentational primitive. v-model:open controls visibility;
  consumers render their content in the default slot and (optionally)
  a header in the named "header" slot. Closes on Escape, backdrop
  click, or the X button.

  Teleported to <body> so stacking contexts don't matter. Held to the
  right edge by default (studios-style destinations drawer); pass
  `side="left"` for a left sheet. Width is a CSS length string so
  callers can pick `320px`, `40vw`, etc.
-->
<script setup lang="ts">
import { onKeyStroke } from "@vueuse/core";

const model = defineModel<boolean>("open", { default: false });

withDefaults(
  defineProps<{
    side?: "right" | "left";
    width?: string;
    title?: string;
  }>(),
  { side: "right", width: "380px" },
);

onKeyStroke("Escape", () => {
  if (model.value) model.value = false;
});

function close() {
  model.value = false;
}
</script>

<template>
  <Teleport v-if="model" to="body">
    <div class="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-[var(--cc-soot)]/40 backdrop-blur-[1px]"
        @click="close"
      />
      <!-- Sheet -->
      <aside
        class="absolute top-0 bottom-0 flex flex-col border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] shadow-[var(--cc-shadow-lg)]"
        :class="side === 'right' ? 'right-0 border-l' : 'left-0 border-r'"
        :style="{ width }"
      >
        <header
          v-if="title || $slots.header"
          class="flex shrink-0 items-center justify-between gap-3 border-b border-[color:var(--cc-border)] bg-[var(--cc-chalk-warm)] px-4 py-3"
        >
          <div class="min-w-0 flex-1">
            <slot name="header">
              <h2
                class="truncate font-display text-[15px] font-semibold tracking-[-0.01em] text-[var(--cc-ink)]"
              >
                {{ title }}
              </h2>
            </slot>
          </div>
          <button
            type="button"
            class="flex h-6 w-6 shrink-0 items-center justify-center border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] font-ui text-[12px] leading-none text-[var(--cc-ink-muted)] transition-colors hover:bg-[var(--cc-chalk-warm)] hover:text-[var(--cc-ink)]"
            aria-label="Close drawer"
            @click="close"
          >
            ×
          </button>
        </header>
        <div class="flex-1 overflow-y-auto">
          <slot />
        </div>
      </aside>
    </div>
  </Teleport>
</template>
