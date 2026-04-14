<!--
  Studio layout: full-bleed, no site chrome. The studio owns the whole
  screen. ToastStack mounted here so studio-page toasts have a home.
-->
<script setup lang="ts">
import ToastStack from "~/components/ToastStack.vue";
import CommandPaletteMount from "~/components/CommandPaletteMount.vue";
import ShortcutsDialog from "~/components/ShortcutsDialog.vue";
import ConfirmMount from "~/components/ConfirmMount.vue";
</script>

<template>
  <div class="h-full">
    <slot />
    <ToastStack />
    <CommandPaletteMount />
    <ShortcutsDialog />
    <ConfirmMount />
  </div>
</template>
