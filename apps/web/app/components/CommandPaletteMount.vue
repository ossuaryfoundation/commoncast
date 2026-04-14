<!--
  CommandPaletteMount — singleton mount point for the ⌘K palette.

  Reads commands from the module-level useCommands() registry, wires
  the open state to a local ref, registers a hotkey (cmd+k) that
  always works (even inside form fields via `global: true`), and
  mounts the DS CommandPalette primitive. Lives in layouts/studio.vue
  so it's available on every studio route.
-->
<script setup lang="ts">
import { ref } from "vue";
import { CommandPalette } from "@commoncast/design-system";
import { useCommands } from "~/composables/useCommands";
import { useHotkeys } from "~/composables/useHotkeys";

const open = ref(false);
const { commands } = useCommands();
const { register } = useHotkeys();

register({
  id: "system.palette.open",
  keys: "cmd+k",
  label: "Open command palette",
  category: "System",
  global: true,
  action: () => {
    open.value = true;
  },
});
</script>

<template>
  <CommandPalette v-model:open="open" :commands="commands" />
</template>
