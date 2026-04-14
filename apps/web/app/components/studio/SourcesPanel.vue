<script setup lang="ts">
import { PanelHeader, ParticipantCard } from "@commoncast/design-system";
import { useParticipantsStore } from "~/stores/participants";

const participants = useParticipantsStore();
</script>

<template>
  <aside
    class="flex h-full w-[220px] shrink-0 flex-col border-r border-[color:var(--cc-border)] bg-[var(--cc-chalk-warm)]"
  >
    <PanelHeader title="People" action-label="+ Invite" />
    <div class="flex-1 overflow-y-auto">
      <section>
        <div class="px-4 pt-3 pb-2 font-ui text-[9px] uppercase tracking-wider text-[var(--cc-ink-muted)]">
          On Stage
        </div>
        <div class="flex flex-col gap-px">
          <ParticipantCard
            v-for="p in participants.onStage"
            :key="p.id"
            :name="p.name"
            :initials="p.initials"
            :color="p.color"
            section="live"
            :host="p.host"
            :speaking="p.speaking"
          />
        </div>
      </section>

      <section>
        <div class="px-4 pt-4 pb-2 font-ui text-[9px] uppercase tracking-wider text-[var(--cc-ink-muted)]">
          Backstage
        </div>
        <div class="flex flex-col gap-px">
          <ParticipantCard
            v-for="p in participants.backstage"
            :key="p.id"
            :name="p.name"
            :initials="p.initials"
            :color="p.color"
            section="backstage"
          />
        </div>
      </section>

      <section>
        <div class="px-4 pt-4 pb-2 font-ui text-[9px] uppercase tracking-wider text-[var(--cc-ink-muted)]">
          Media
        </div>
        <div class="flex flex-col gap-px pb-3">
          <ParticipantCard
            v-for="p in participants.media"
            :key="p.id"
            :name="p.name"
            :initials="p.initials"
            :color="p.color"
            section="media"
            :meta="p.meta"
          />
        </div>
      </section>
    </div>
  </aside>
</template>
