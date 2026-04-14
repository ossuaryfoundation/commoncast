<!--
  commoncast / Tabs — uppercase tab strip with signal-red underline on active.
  v-model over the active tab id. Content is projected via default slot.
-->
<script setup lang="ts" generic="T extends string">
defineProps<{
  tabs: ReadonlyArray<{ id: T; label: string }>;
}>();

const model = defineModel<T>({ required: true });
</script>

<template>
  <div class="flex border-b border-[color:var(--cc-border)]">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="relative px-4 py-3 font-ui text-[9px] uppercase tracking-wide transition-colors duration-[var(--cc-dur-fast)]"
      :class="
        model === tab.id
          ? 'text-[var(--cc-ink)]'
          : 'text-[var(--cc-ink-muted)] hover:text-[var(--cc-ink-soft)]'
      "
      @click="model = tab.id"
    >
      {{ tab.label }}
      <span
        v-if="model === tab.id"
        class="absolute inset-x-3 bottom-0 h-[2px] bg-[var(--cc-signal)]"
      />
    </button>
  </div>
</template>
