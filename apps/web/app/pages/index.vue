<!--
  Dashboard — the studio list. Static for now; backend ships later.
-->
<script setup lang="ts">
import { Badge, Button, StatusDot } from "@commoncast/design-system";

const stats = [
  { label: "Total Broadcasts", value: "12" },
  { label: "Hours Streamed", value: "38h" },
  { label: "Saved Studios", value: "3" },
  { label: "Live Now", value: "1" },
];

const studios = [
  {
    id: "workshop",
    title: "Open Source Streaming Workshop",
    live: true,
    participants: 4,
    viewers: 128,
    timestamp: "01:24:37",
  },
  {
    id: "podcast",
    title: "CommonCast Podcast",
    live: false,
    participants: 2,
    viewers: 0,
    timestamp: "—",
  },
  {
    id: "standup",
    title: "Engineering Standup",
    live: false,
    participants: 6,
    viewers: 0,
    timestamp: "—",
  },
];
</script>

<template>
  <section class="mx-auto max-w-[1200px] px-8 py-10">
    <div class="flex items-end justify-between">
      <div>
        <h1 class="font-display text-[34px] font-semibold tracking-tight text-[var(--cc-ink)]">
          Studios
        </h1>
        <p class="mt-1 font-body text-[14px] text-[var(--cc-ink-muted)]">
          Broadcasting for the commons.
        </p>
      </div>
      <NuxtLink to="/studios/workshop">
        <Button variant="primary">+ New Studio</Button>
      </NuxtLink>
    </div>

    <div class="mt-8 grid grid-cols-4 gap-4">
      <div
        v-for="s in stats"
        :key="s.label"
        class="border border-[color:var(--cc-border)] bg-[var(--cc-chalk)] p-4"
      >
        <div class="font-ui text-[9px] uppercase text-[var(--cc-ink-muted)]">
          {{ s.label }}
        </div>
        <div class="mt-1 font-display text-[26px] font-semibold text-[var(--cc-ink)]">
          {{ s.value }}
        </div>
      </div>
    </div>

    <h2 class="mt-12 font-ui text-[11px] uppercase tracking-wider text-[var(--cc-ink-muted)]">
      Studios
    </h2>
    <div class="mt-3 grid grid-cols-3 gap-4">
      <NuxtLink
        v-for="s in studios"
        :key="s.id"
        :to="`/studios/${s.id}`"
        class="group border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] p-4 transition-[transform,box-shadow] duration-[var(--cc-dur-fast)] hover:-translate-y-[1px] hover:shadow-[var(--cc-shadow-md)]"
      >
        <div class="flex items-start justify-between">
          <h3 class="font-display text-[17px] font-semibold text-[var(--cc-ink)]">
            {{ s.title }}
          </h3>
          <Badge v-if="s.live" variant="live">Live</Badge>
          <Badge v-else variant="neutral">Saved</Badge>
        </div>
        <div class="mt-4 grid aspect-video grid-cols-2 grid-rows-2 gap-1 bg-[var(--cc-soot)] p-1">
          <div class="bg-[var(--cc-soot-mid)]" />
          <div class="bg-[var(--cc-soot-mid)]" />
          <div class="bg-[var(--cc-soot-mid)]" />
          <div class="bg-[var(--cc-soot-mid)]" />
        </div>
        <div class="mt-3 flex items-center justify-between font-ui text-[9px] uppercase text-[var(--cc-ink-muted)]">
          <span class="flex items-center gap-1">
            <StatusDot v-if="s.live" status="live" pulse />
            {{ s.participants }} guests
          </span>
          <span>{{ s.timestamp }}</span>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>
