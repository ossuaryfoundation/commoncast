<!--
  commoncast / BroadcastFrame
  Dark soot-colored 16:9 frame with a slot for the scene content (whatever the
  host decides to render — a <canvas>, a grid of <video> elements, a static
  mockup, etc). Purely presentational.
-->
<script setup lang="ts">
withDefaults(
  defineProps<{
    aspectRatio?: number;
    rounded?: boolean;
  }>(),
  { aspectRatio: 16 / 9, rounded: false },
);
</script>

<template>
  <div
    class="relative w-full overflow-hidden border border-[color:var(--cc-border-strong)] bg-[var(--cc-soot)] shadow-[var(--cc-shadow-lg)]"
    :class="rounded ? 'rounded-[var(--cc-radius-md)]' : ''"
    :style="{ aspectRatio: `${aspectRatio}` }"
  >
    <slot />
  </div>
</template>
