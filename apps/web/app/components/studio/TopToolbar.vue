<script setup lang="ts">
import { Button, OnAirBadge, StatusDot } from "@commoncast/design-system";
import { useStudioStore } from "~/stores/studio";
import { useTimecode } from "~/composables/useTimecode";
import { watch } from "vue";

const studio = useStudioStore();
const tc = useTimecode();

watch(
  () => studio.isLive,
  (live) => (live ? tc.start() : tc.stop()),
  { immediate: true },
);
</script>

<template>
  <header
    class="flex h-11 items-center gap-4 border-b border-[var(--cc-soot-mid)] bg-[var(--cc-soot)] px-4"
  >
    <NuxtLink
      to="/"
      class="flex items-center gap-2 font-ui text-[11px] uppercase tracking-wider text-[var(--cc-chalk)]"
    >
      <span
        class="h-2 w-2 rounded-full bg-[var(--cc-signal)]"
        style="animation: cc-pulse-dot 2s ease infinite"
      />
      commoncast
    </NuxtLink>

    <span class="mx-2 h-4 w-px bg-[var(--cc-soot-mid)]" />

    <Button
      :variant="studio.isLive ? 'live' : 'ghost'"
      size="sm"
      @click="studio.goLive()"
    >
      {{ studio.isLive ? 'On Air' : 'Go Live' }}
    </Button>
    <Button
      :variant="studio.isRecording ? 'primary' : 'ghost'"
      size="sm"
      @click="studio.toggleRecording()"
    >
      {{ studio.isRecording ? 'Rec' : 'Record' }}
    </Button>

    <span class="mx-2 h-4 w-px bg-[var(--cc-soot-mid)]" />

    <div class="flex items-center gap-3">
      <span class="flex items-center gap-1 font-ui text-[9px] uppercase text-[var(--cc-ink-whisper)]">
        <StatusDot status="live" pulse />
        YT
      </span>
      <span class="flex items-center gap-1 font-ui text-[9px] uppercase text-[var(--cc-ink-whisper)]">
        <StatusDot status="live" pulse />
        Twitch
      </span>
      <span class="flex items-center gap-1 font-ui text-[9px] uppercase text-[var(--cc-ink-whisper)]">
        <StatusDot status="caution" />
        LVQR
      </span>
    </div>

    <div class="ml-auto flex items-center gap-4">
      <span class="font-code text-[11px] text-[var(--cc-ink-whisper)]">{{ tc.value.value }}</span>
      <OnAirBadge :live="studio.isLive" />
    </div>
  </header>
</template>
