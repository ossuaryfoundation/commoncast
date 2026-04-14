<!--
  commoncast / LayoutOption — mini thumbnail button in the Layout tab.
  Visualizes one of the six layout shapes using CSS grid.
-->
<script setup lang="ts">
export type LayoutId = "solo" | "split" | "grid" | "speaker" | "sidebar" | "pip";

defineProps<{
  id: LayoutId;
  label: string;
  active?: boolean;
}>();

defineEmits<{ (e: "select"): void }>();
</script>

<template>
  <button
    type="button"
    class="flex flex-col items-center gap-2 rounded-[var(--cc-radius-md)] border bg-[var(--cc-chalk)] p-2 transition-all duration-[var(--cc-dur-fast)] ease-[var(--cc-ease-snappy)] focus-visible:outline-none"
    :class="
      active
        ? 'border-[2px] border-[var(--cc-signal)] shadow-[0_0_0_3px_var(--cc-signal-dim)]'
        : 'border-[color:var(--cc-border-strong)] hover:border-[var(--cc-ink)]'
    "
    @click="$emit('select')"
  >
    <span
      class="grid h-[44px] w-full gap-[2px]"
      :class="[
        id === 'solo' && 'grid-cols-1 grid-rows-1',
        id === 'split' && 'grid-cols-2 grid-rows-1',
        id === 'grid' && 'grid-cols-2 grid-rows-2',
        id === 'speaker' && 'grid-cols-[2.5fr_1fr] grid-rows-2',
        id === 'sidebar' && 'grid-cols-[2.2fr_1fr] grid-rows-2',
        id === 'pip' && 'grid-cols-1 grid-rows-1',
      ]"
    >
      <span
        v-if="id === 'solo'"
        class="bg-[var(--cc-ink-ghost)]"
      />
      <template v-else-if="id === 'split'">
        <span class="bg-[var(--cc-ink-ghost)]" />
        <span class="bg-[var(--cc-ink-ghost)]" />
      </template>
      <template v-else-if="id === 'grid'">
        <span class="bg-[var(--cc-ink-ghost)]" />
        <span class="bg-[var(--cc-ink-ghost)]" />
        <span class="bg-[var(--cc-ink-ghost)]" />
        <span class="bg-[var(--cc-ink-ghost)]" />
      </template>
      <template v-else-if="id === 'speaker'">
        <span class="row-span-2 bg-[var(--cc-ink-ghost)]" />
        <span class="bg-[var(--cc-ink-ghost)]" />
        <span class="bg-[var(--cc-ink-ghost)]" />
      </template>
      <template v-else-if="id === 'sidebar'">
        <span class="row-span-2 bg-[var(--cc-ink-ghost)]" />
        <span class="bg-[var(--cc-ink-ghost)]" />
        <span class="bg-[var(--cc-ink-ghost)]" />
      </template>
      <template v-else-if="id === 'pip'">
        <span class="relative bg-[var(--cc-ink-ghost)]">
          <span
            class="absolute right-[3px] bottom-[3px] h-[30%] w-[30%] bg-[var(--cc-ink)]"
          />
        </span>
      </template>
    </span>
    <span class="font-ui text-[9px] uppercase text-[var(--cc-ink-muted)]">{{ label }}</span>
  </button>
</template>
