<!--
  ConfirmMount — singleton Dialog mount for useConfirm().

  Mounted once in layouts/studio.vue. Reads `pending` from the
  useConfirm singleton; when non-null, opens a Dialog with the
  title, description, and Cancel/Confirm actions. Confirm button
  renders in signal-red when the action is marked `danger`.
-->
<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { Dialog, Button } from "@commoncast/design-system";
import { useConfirm } from "~/composables/useConfirm";

const { pending, respond } = useConfirm();

const open = ref(false);
const confirmBtnRef = ref<HTMLElement | null>(null);
const cancelBtnRef = ref<HTMLElement | null>(null);

watch(pending, async (next, prev) => {
  if (next && !prev) {
    open.value = true;
    // Focus the least-destructive choice by default: Confirm for
    // non-danger, Cancel for danger.
    await nextTick();
    if (next.danger) cancelBtnRef.value?.focus();
    else confirmBtnRef.value?.focus();
  } else if (!next && prev) {
    open.value = false;
  }
});

// If the user dismisses the Dialog via backdrop/Esc, the Dialog
// flips `open` to false — we need to resolve the promise as "cancel".
watch(open, (next) => {
  if (!next && pending.value) respond(false);
});

const confirmLabel = computed(() => pending.value?.confirmLabel ?? "Confirm");
const cancelLabel = computed(() => pending.value?.cancelLabel ?? "Cancel");
const isDanger = computed(() => pending.value?.danger === true);
const title = computed(() => pending.value?.title ?? "");
const description = computed(() => pending.value?.description);

function onConfirm() {
  respond(true);
}
function onCancel() {
  respond(false);
}
</script>

<template>
  <Dialog
    v-model:open="open"
    :title="title"
    :description="description"
    width="440px"
  >
    <template #actions>
      <button
        ref="cancelBtnRef"
        type="button"
        class="border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] px-3 py-[6px] font-ui text-[10px] uppercase tracking-[0.12em] text-[var(--cc-ink)] transition-colors hover:bg-[var(--cc-chalk-warm)]"
        @click="onCancel"
      >
        {{ cancelLabel }}
      </button>
      <button
        v-if="isDanger"
        ref="confirmBtnRef"
        type="button"
        class="border border-[var(--cc-signal-strong)] bg-[var(--cc-signal)] px-3 py-[6px] font-ui text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-[var(--cc-signal-hover)]"
        @click="onConfirm"
      >
        {{ confirmLabel }}
      </button>
      <button
        v-else
        ref="confirmBtnRef"
        type="button"
        class="border border-[color:var(--cc-border-strong)] bg-[var(--cc-soot)] px-3 py-[6px] font-ui text-[10px] uppercase tracking-[0.12em] text-[var(--cc-chalk)] transition-colors hover:bg-[var(--cc-soot-mid)]"
        @click="onConfirm"
      >
        {{ confirmLabel }}
      </button>
    </template>
  </Dialog>
</template>
