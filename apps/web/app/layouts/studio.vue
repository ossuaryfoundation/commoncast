<!--
  Studio layout: full-bleed, no site chrome. The studio owns the whole
  screen. ToastStack mounted here so studio-page toasts have a home.
-->
<script setup lang="ts">
import ToastStack from "~/components/ToastStack.vue";
</script>

<template>
  <div class="h-full">
    <slot />
    <ToastStack />
  </div>
</template>
