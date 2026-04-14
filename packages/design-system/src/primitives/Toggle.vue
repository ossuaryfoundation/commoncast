<!--
  commoncast / Toggle — 32x18 switch. v-model with defineModel<T>() (Vue 3.5+).
  Dimensions come from the mockup's `.ov-sw` / `.toggle` classes.
-->
<script setup lang="ts">
const model = defineModel<boolean>({ default: false });

const props = defineProps<{
  disabled?: boolean;
  ariaLabel?: string;
}>();

function toggle() {
  if (props.disabled) return;
  model.value = !model.value;
}
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="model"
    :aria-label="ariaLabel"
    :disabled="disabled"
    class="relative inline-flex h-[18px] w-[32px] shrink-0 cursor-pointer items-center rounded-[var(--cc-radius-sm)] border transition-[background-color,border-color] duration-[var(--cc-dur-med)] ease-[var(--cc-ease-smooth)] disabled:cursor-not-allowed disabled:opacity-50"
    :class="
      model
        ? 'border-[var(--cc-live)] bg-[var(--cc-live-dim)]'
        : 'border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk-deep)]'
    "
    @click="toggle"
  >
    <span
      class="absolute top-[2px] h-[12px] w-[12px] rounded-[var(--cc-radius-sm)] transition-[transform,background-color] duration-[var(--cc-dur-med)] ease-[var(--cc-ease-smooth)]"
      :class="
        model
          ? 'translate-x-[16px] bg-[var(--cc-live)]'
          : 'translate-x-[2px] bg-[var(--cc-ink-ghost)]'
      "
    />
  </button>
</template>
