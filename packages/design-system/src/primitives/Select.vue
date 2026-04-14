<!--
  commoncast / Select — lightweight single-select dropdown.

  Deliberately minimal: a trigger button + a popover list, closed on
  outside click or Escape. No portal, no virtual keyboard focus trap — the
  studio needs a dozen of these (cameras, mics, layouts, scenes, destinations)
  and paying the reka-ui complexity tax for every one is not worth it yet.

  v-model resolves to the selected item's `value`. Items with `disabled` are
  rendered dimmed and are not clickable. Matches the editorial aesthetic:
  mono label, 2px hard border, sharp corners, hard-offset shadow on open.
-->
<script setup lang="ts" generic="V extends string">
import { computed, ref } from "vue";
import { onClickOutside, onKeyStroke } from "@vueuse/core";

export interface SelectItem<V extends string = string> {
  value: V;
  label: string;
  hint?: string;
  disabled?: boolean;
}

const model = defineModel<V | null>({ default: null });

const props = withDefaults(
  defineProps<{
    items: ReadonlyArray<SelectItem<V>>;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    emptyLabel?: string;
  }>(),
  {
    placeholder: "Select…",
    emptyLabel: "No options",
  },
);

const open = ref(false);
const root = ref<HTMLElement | null>(null);

onClickOutside(root, () => (open.value = false));
onKeyStroke("Escape", () => (open.value = false));

const selected = computed<SelectItem<V> | undefined>(() =>
  props.items.find((i) => i.value === model.value),
);

function toggle() {
  if (props.disabled) return;
  open.value = !open.value;
}

function pick(item: SelectItem<V>) {
  if (item.disabled) return;
  model.value = item.value;
  open.value = false;
}
</script>

<template>
  <div ref="root" class="relative flex flex-col gap-1">
    <span
      v-if="label"
      class="font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--cc-ink-muted)]"
    >
      {{ label }}
    </span>

    <button
      type="button"
      :disabled="disabled"
      :aria-expanded="open"
      :aria-haspopup="'listbox'"
      class="group flex h-[30px] items-center justify-between gap-2 border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] px-2.5 text-left font-body text-[12px] text-[var(--cc-ink)] transition-[background,border-color] duration-[var(--cc-dur-fast)] ease-[var(--cc-ease-snappy)] hover:border-[var(--cc-ink-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-signal)] disabled:cursor-not-allowed disabled:opacity-50"
      :class="open ? 'border-[var(--cc-signal)]' : ''"
      @click="toggle"
    >
      <span class="truncate" :class="selected ? '' : 'text-[var(--cc-ink-whisper)]'">
        {{ selected?.label ?? placeholder }}
      </span>
      <svg
        width="9"
        height="6"
        viewBox="0 0 9 6"
        class="shrink-0 text-[var(--cc-ink-muted)] transition-transform duration-[var(--cc-dur-fast)]"
        :class="open ? '-rotate-180' : ''"
        aria-hidden
      >
        <path d="M0.5 0.5 L4.5 4.5 L8.5 0.5" fill="none" stroke="currentColor" stroke-width="1.2" />
      </svg>
    </button>

    <ul
      v-if="open"
      role="listbox"
      class="absolute left-0 right-0 top-full z-30 mt-1 max-h-[260px] overflow-y-auto border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] py-1 shadow-[var(--cc-shadow-md)]"
    >
      <li
        v-if="items.length === 0"
        class="px-2.5 py-1.5 font-ui text-[10px] uppercase tracking-[0.12em] text-[var(--cc-ink-ghost)]"
      >
        {{ emptyLabel }}
      </li>
      <li
        v-for="item in items"
        :key="item.value"
        role="option"
        :aria-selected="model === item.value"
        :aria-disabled="item.disabled || undefined"
        class="flex cursor-pointer items-center justify-between gap-3 px-2.5 py-1.5 font-body text-[12px] leading-tight transition-[background] duration-[var(--cc-dur-fast)]"
        :class="[
          item.disabled
            ? 'cursor-not-allowed text-[var(--cc-ink-whisper)]'
            : 'text-[var(--cc-ink)] hover:bg-[var(--cc-chalk-warm)]',
          model === item.value ? 'bg-[var(--cc-signal-dim)]' : '',
        ]"
        @click="pick(item)"
      >
        <span class="truncate">{{ item.label }}</span>
        <span
          v-if="item.hint"
          class="shrink-0 font-ui text-[9px] uppercase tracking-[0.1em] text-[var(--cc-ink-ghost)]"
        >
          {{ item.hint }}
        </span>
      </li>
    </ul>
  </div>
</template>
