<!--
  commoncast / Input — thin wrapper around <input>. v-model via defineModel.
-->
<script setup lang="ts" generic="T extends string | number">
const model = defineModel<T>();

defineProps<{
  label?: string;
  placeholder?: string;
  type?: "text" | "number" | "url" | "email" | "password";
  disabled?: boolean;
  id?: string;
  maxWidth?: string;
}>();
</script>

<template>
  <label class="flex flex-col gap-1" :for="id">
    <span
      v-if="label"
      class="font-ui text-[9px] uppercase tracking-wide text-[var(--cc-ink-muted)]"
    >
      {{ label }}
    </span>
    <input
      :id="id"
      v-model="model"
      :type="type ?? 'text'"
      :placeholder="placeholder"
      :disabled="disabled"
      :style="{ maxWidth }"
      class="w-full rounded-[var(--cc-radius-md)] border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] px-3 py-2 font-body text-[var(--cc-text-base)] text-[var(--cc-ink)] placeholder:text-[var(--cc-ink-whisper)] focus:border-[var(--cc-signal)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
    />
  </label>
</template>
