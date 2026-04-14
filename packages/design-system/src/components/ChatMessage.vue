<!--
  commoncast / ChatMessage
-->
<script setup lang="ts">
import Badge from "../primitives/Badge.vue";

defineProps<{
  username: string;
  platform?: "youtube" | "twitch" | "commoncast";
  text: string;
  featured?: boolean;
}>();

defineEmits<{ (e: "feature"): void }>();
</script>

<template>
  <div
    class="border-b border-[color:var(--cc-border)] px-[10px] py-[6px] last:border-b-0"
    :class="featured && 'bg-[var(--cc-signal-dim)]'"
  >
    <div class="flex items-center gap-2">
      <span class="font-display text-[13px] font-semibold text-[var(--cc-ink)]">
        {{ username }}
      </span>
      <Badge
        v-if="platform === 'youtube'"
        variant="signal"
      >YT</Badge>
      <Badge
        v-else-if="platform === 'twitch'"
        variant="pixi"
      >TW</Badge>
      <Badge v-else variant="clasp">CC</Badge>
      <button
        type="button"
        class="ml-auto font-ui text-[9px] uppercase text-[var(--cc-signal)] hover:text-[var(--cc-signal-hover)]"
        @click="$emit('feature')"
      >
        Feature
      </button>
    </div>
    <p class="mt-1 font-body text-[13px] text-[var(--cc-ink-soft)]">{{ text }}</p>
  </div>
</template>
