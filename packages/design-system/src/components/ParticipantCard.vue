<!--
  commoncast / ParticipantCard
  Renders one participant row in the SourcesPanel.
  Variants mirror `.ss-card` states: `live` (green left border), `back` (amber), `media` (blue).
-->
<script setup lang="ts">
import Avatar from "../primitives/Avatar.vue";
import Badge from "../primitives/Badge.vue";

defineProps<{
  name: string;
  initials: string;
  color?: string;
  section?: "live" | "backstage" | "media";
  active?: boolean;
  speaking?: boolean;
  host?: boolean;
  meta?: string;
}>();

defineEmits<{ (e: "select"): void }>();
</script>

<template>
  <button
    type="button"
    class="group flex w-full items-center gap-3 border-l-[3px] bg-[var(--cc-chalk)] px-3 py-2 text-left transition-[transform,box-shadow,border-color] duration-[var(--cc-dur-fast)] ease-[var(--cc-ease-snappy)] hover:-translate-y-[1px] hover:shadow-[var(--cc-shadow-sm)]"
    :class="[
      section === 'live' && 'border-l-[var(--cc-live)]',
      section === 'backstage' && 'border-l-[var(--cc-caution)] opacity-75',
      section === 'media' && 'border-l-[var(--cc-info)]',
      !section && 'border-l-transparent',
      active && 'bg-[var(--cc-chalk-warm)]',
    ]"
    @click="$emit('select')"
  >
    <Avatar :initials="initials" :color="color" :size="28" :speaking="speaking" />
    <span class="flex min-w-0 flex-1 flex-col">
      <span class="truncate font-display text-[13px] font-semibold text-[var(--cc-ink)]">
        {{ name }}
      </span>
      <span
        v-if="meta"
        class="truncate font-ui text-[9px] uppercase text-[var(--cc-ink-muted)]"
      >
        {{ meta }}
      </span>
    </span>
    <Badge v-if="host" variant="signal">Host</Badge>
    <Badge v-else-if="section === 'live'" variant="live">Live</Badge>
    <Badge v-else-if="section === 'backstage'" variant="caution">Wait</Badge>
  </button>
</template>
