<!--
  ToastStack — the singleton mount point for the toast bus.

  Reads the reactive `items` from useToasts and renders one DS Toast
  per entry inside a fixed bottom-right TransitionGroup. Mounted in
  both layouts (studio + default) so any page can emit toasts and
  they appear in the correct spot.

  Purely a wiring component: zero logic beyond forwarding events from
  the presentational Toast back into the composable bus.
-->
<script setup lang="ts">
import { Toast } from "@commoncast/design-system";
import { useToasts } from "~/composables/useToasts";

const { items, dismiss } = useToasts();
</script>

<template>
  <Teleport to="body">
    <TransitionGroup
      name="cc-toast"
      tag="div"
      class="pointer-events-none fixed right-6 bottom-6 z-[60] flex flex-col-reverse gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      <Toast
        v-for="item in items"
        :key="item.id"
        :kind="item.kind"
        :title="item.title"
        :description="item.description"
        :action-label="item.action?.label"
        @action="item.action?.onClick()"
        @dismiss="dismiss(item.id)"
      />
    </TransitionGroup>
  </Teleport>
</template>

<style>
.cc-toast-enter-active,
.cc-toast-leave-active {
  transition:
    transform 220ms var(--cc-ease-smooth),
    opacity 220ms var(--cc-ease-smooth);
}
.cc-toast-enter-from,
.cc-toast-leave-to {
  transform: translateX(24px);
  opacity: 0;
}
.cc-toast-leave-active {
  position: absolute;
  right: 0;
}
</style>
