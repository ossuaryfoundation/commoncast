<!--
  DestinationsDrawer — the wiring layer that binds the destinations
  store and the broadcast fanout state to a presentational Drawer.

  The Drawer primitive itself is pure design-system. This component is
  where the "here's your list of destinations and their current
  transport state" logic lives. Destinations are editable while live —
  toggling auto off closes the corresponding sender; toggling on spins
  one up and publishes to it immediately.
-->
<script setup lang="ts">
import { ref } from "vue";
import {
  Drawer,
  Input,
  Button,
  Toggle,
  StatusDot,
} from "@commoncast/design-system";
import { useStudioContext } from "~/composables/useStudioContext";
import {
  useDestinationsStore,
  type Destination,
} from "~/stores/destinations";
import type { BroadcastSenderState } from "~/composables/broadcastSender";
import { useConfirm } from "~/composables/useConfirm";

const model = defineModel<boolean>("open", { default: false });

const ctx = useStudioContext();
const store = useDestinationsStore();
const confirm = useConfirm();

const newName = ref("");
const newAddr = ref("");
const submitError = ref<string | null>(null);

function makeId(name: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "dest";
  const used = new Set(Object.keys(store.all));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function addDestination() {
  const name = newName.value.trim();
  const addr = newAddr.value.trim();
  if (!name || !addr) {
    submitError.value = "Both a name and a clasp address are required.";
    return;
  }
  submitError.value = null;
  store.add({
    id: makeId(name),
    name,
    addr,
    kind: "clasp-addr",
    auto: true,
  });
  newName.value = "";
  newAddr.value = "";
}

type Tone = "live" | "caution" | "signal" | "offline";
function statusTone(state: BroadcastSenderState | undefined): Tone {
  if (state === "connected") return "live";
  if (state === "negotiating") return "caution";
  if (state === "failed") return "signal";
  return "offline";
}
function statusLabel(state: BroadcastSenderState | undefined): string {
  if (!state || state === "idle" || state === "closed") return "idle";
  return state;
}

function stateFor(dest: Destination): BroadcastSenderState | undefined {
  return ctx.fanout.states.value[dest.id];
}

function toggleAuto(dest: Destination, next: boolean) {
  store.update(dest.id, { auto: next });
}

async function removeDest(dest: Destination) {
  const ok = await confirm.ask({
    title: `Remove "${dest.name}"?`,
    description:
      "The destination will be removed from the studio. Active broadcasts to this target will stop immediately.",
    confirmLabel: "Remove",
    danger: true,
  });
  if (!ok) return;
  store.remove(dest.id);
}
</script>

<template>
  <Drawer v-model:open="model" title="Destinations" width="400px">
    <div class="flex flex-col gap-5 p-4">
      <p
        class="font-ui text-[9.5px] uppercase leading-[1.6] tracking-[0.1em] text-[var(--cc-ink-muted)]"
      >
        Every destination is a clasp address. When you click
        <span class="text-[var(--cc-ink)]">Go Live</span>, the host
        publishes the composite program feed to every destination marked
        <span class="text-[var(--cc-live)]">Auto</span>. Receivers open
        <span class="font-code">/receive/&lt;addr&gt;?studio=&lt;id&gt;</span>.
      </p>

      <!-- Current destinations -->
      <section v-if="store.list.length > 0" class="flex flex-col gap-2">
        <h3
          class="flex items-center gap-2 font-ui text-[9px] uppercase tracking-[0.14em] text-[var(--cc-ink-muted)]"
        >
          Configured
          <span
            class="border border-[color:var(--cc-border)] px-1 font-ui text-[8px] text-[var(--cc-ink-ghost)]"
          >{{ store.list.length }}</span>
          <span class="h-px flex-1 bg-[var(--cc-border)]" />
        </h3>

        <div
          v-for="dest in store.list"
          :key="dest.id"
          class="flex flex-col gap-2 border border-[color:var(--cc-border)] bg-[var(--cc-chalk-warm)] p-3"
        >
          <div class="flex items-center gap-3">
            <StatusDot :status="statusTone(stateFor(dest))" :pulse="statusTone(stateFor(dest)) === 'live'" />
            <div class="flex min-w-0 flex-1 flex-col">
              <span class="truncate font-body text-[13px] font-semibold text-[var(--cc-ink)]">
                {{ dest.name }}
              </span>
              <span class="truncate font-ui text-[8.5px] uppercase tracking-[0.1em] text-[var(--cc-ink-muted)]">
                {{ dest.kind }} · <span class="font-code text-[9px]">{{ dest.addr }}</span> · {{ statusLabel(stateFor(dest)) }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-ui text-[8.5px] uppercase tracking-[0.12em] text-[var(--cc-ink-muted)]">Auto</span>
              <Toggle
                :model-value="dest.auto"
                @update:model-value="(v) => toggleAuto(dest, v)"
              />
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span class="font-ui text-[8.5px] uppercase tracking-[0.1em] text-[var(--cc-ink-ghost)]">
              {{ dest.auto ? "Included in Go Live" : "Manual only" }}
            </span>
            <button
              type="button"
              class="border border-[color:var(--cc-border)] bg-transparent px-2 py-[3px] font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--cc-signal)] transition-colors hover:bg-[var(--cc-signal-dim)]"
              @click="removeDest(dest)"
            >
              Remove
            </button>
          </div>
        </div>
      </section>

      <!-- Empty state -->
      <section
        v-else
        class="border border-dashed border-[color:var(--cc-border-strong)] p-3 font-ui text-[9.5px] uppercase tracking-[0.1em] text-[var(--cc-ink-ghost)]"
      >
        No destinations yet. Add one below to go live.
      </section>

      <!-- Add new -->
      <form
        class="flex flex-col gap-3 border border-dashed border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk)] p-3"
        @submit.prevent="addDestination"
      >
        <h3
          class="flex items-center gap-2 font-ui text-[9px] uppercase tracking-[0.14em] text-[var(--cc-ink-muted)]"
        >
          Add destination
          <span class="h-px flex-1 bg-[var(--cc-border)]" />
        </h3>
        <Input v-model="newName" label="Name" placeholder="YouTube test" />
        <Input v-model="newAddr" label="Clasp address" placeholder="yt-test" />
        <p
          v-if="submitError"
          class="font-ui text-[9px] uppercase tracking-[0.1em] text-[var(--cc-signal)]"
        >
          {{ submitError }}
        </p>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          :disabled="!newName.trim() || !newAddr.trim()"
        >
          + Add destination
        </Button>
      </form>
    </div>
  </Drawer>
</template>
