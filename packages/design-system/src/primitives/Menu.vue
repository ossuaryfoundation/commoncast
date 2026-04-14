<!--
  commoncast / Menu — click-triggered dropdown action menu.

  Same visual language as Select, used for per-row actions (participant
  context menu, source context menu, destination context menu). Pure
  presentation: the caller supplies an array of items and listens for
  @select; the menu has no business knowledge.

  Variants:
    - kind: "item" (default) or "separator"
    - destructive items render in the signal-red color
    - disabled items render dimmed and don't emit
    - an optional per-item `hint` renders as a mono label on the right
    - the trigger lives in a named slot; the menu positions itself
      absolutely to the start/end of the trigger

  Closes on outside click, Escape, or a successful selection.
-->
<script setup lang="ts">
import { ref } from "vue";
import { onClickOutside, onKeyStroke } from "@vueuse/core";

export interface MenuItem {
  kind?: "item" | "separator";
  id?: string;
  label?: string;
  hint?: string;
  destructive?: boolean;
  disabled?: boolean;
}

withDefaults(
  defineProps<{
    items: ReadonlyArray<MenuItem>;
    align?: "start" | "end";
    minWidth?: string;
  }>(),
  { align: "end", minWidth: "180px" },
);

const emit = defineEmits<{ (e: "select", id: string): void }>();

const open = ref(false);
const root = ref<HTMLElement | null>(null);

onClickOutside(root, () => (open.value = false));
onKeyStroke("Escape", () => {
  if (open.value) open.value = false;
});

function toggle(e: Event) {
  e.stopPropagation();
  open.value = !open.value;
}

function pick(item: MenuItem) {
  if (item.disabled || item.kind === "separator") return;
  if (!item.id) return;
  emit("select", item.id);
  open.value = false;
}
</script>

<template>
  <div ref="root" class="relative inline-block">
    <div class="inline-flex" @click="toggle">
      <slot name="trigger" :open="open" />
    </div>

    <div
      v-if="open"
      role="menu"
      class="absolute top-full z-40 mt-1 border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] py-1 shadow-[var(--cc-shadow-md)]"
      :style="{ minWidth }"
      :class="align === 'end' ? 'right-0' : 'left-0'"
    >
      <template v-for="(item, i) in items" :key="item.id ?? `sep-${i}`">
        <div
          v-if="item.kind === 'separator'"
          class="my-1 h-px bg-[var(--cc-border)]"
        />
        <button
          v-else
          type="button"
          role="menuitem"
          :disabled="item.disabled"
          class="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left font-body text-[12px] transition-[background] duration-[var(--cc-dur-fast)] hover:bg-[var(--cc-chalk-warm)] disabled:cursor-not-allowed disabled:opacity-50"
          :class="item.destructive ? 'text-[var(--cc-signal)] hover:bg-[var(--cc-signal-dim)]' : 'text-[var(--cc-ink)]'"
          @click.stop="pick(item)"
        >
          <span class="truncate">{{ item.label }}</span>
          <span
            v-if="item.hint"
            class="shrink-0 font-ui text-[9px] uppercase tracking-[0.1em] text-[var(--cc-ink-ghost)]"
          >
            {{ item.hint }}
          </span>
        </button>
      </template>
    </div>
  </div>
</template>
