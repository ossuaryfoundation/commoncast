<!--
  People + Inventory panel — the real replacement.

  Three sections:

  1. Local — camera + mic selects, live audio meter. Same as before.

  2. On Stage — everyone in the studio whose participant entry says
     stage === "live", rendered as bindable source rows:
       - click a row while a slot is selected → binds to the slot
       - each row has a context Menu (host-only for others; limited
         self-menu for "You") with Send to backstage / Mute / Camera
         off / Kick. The self row exposes self-mute + self-camera.
     The "screen share" row lives here too as a non-participant source.

  3. Backstage — everyone whose entry says stage === "backstage". Not
     bindable to slots. Each row shows a raised-hand indicator when
     the guest has asked to come up. The host sees "Bring on stage"
     actions; guests see a self-row with "Raise hand" / "Lower hand".

  All business logic lives in the composables/stores — this component
  only reads from the injected StudioContext and the participants store,
  and invokes context methods on click.
-->
<script setup lang="ts">
import { computed } from "vue";
import {
  PanelHeader,
  Select,
  VUMeter,
  Kbd,
  Menu,
  type SelectItem,
  type MenuItem,
} from "@commoncast/design-system";
import { useStudioContext } from "~/composables/useStudioContext";
import { useStudioStore } from "~/stores/studio";
import { useParticipantsStore, type StudioParticipant } from "~/stores/participants";
import { usePrefsStore } from "~/stores/prefs";

const ctx = useStudioContext();
const studio = useStudioStore();
const participantsStore = useParticipantsStore();
const prefs = usePrefsStore();

const cameraItems = computed<SelectItem[]>(() => [
  { value: "", label: "System default" },
  ...ctx.devices.videoInputs.value.map((d, i) => ({
    value: d.deviceId,
    label: d.label || `Camera ${i + 1}`,
  })),
]);
const micItems = computed<SelectItem[]>(() => [
  { value: "", label: "System default" },
  ...ctx.devices.audioInputs.value.map((d, i) => ({
    value: d.deviceId,
    label: d.label || `Microphone ${i + 1}`,
  })),
]);

const cameraValue = computed<string | null>({
  get: () => prefs.defaultCameraId ?? "",
  set: (v) => {
    void ctx.switchCamera(v ? v : null);
  },
});
const micValue = computed<string | null>({
  get: () => prefs.defaultMicId ?? "",
  set: (v) => {
    void ctx.switchMic(v ? v : null);
  },
});

const activeFeeds = computed<readonly (string | null)[]>(
  () => studio.activeScene?.feeds ?? [],
);

function slotOf(sourceId: string): number | null {
  const i = activeFeeds.value.indexOf(sourceId);
  return i >= 0 ? i : null;
}

const selectedSlot = computed(() => ctx.selection.slot.value);
const hasSelection = computed(() => selectedSlot.value != null);

function bindIfSlotSelected(sourceId: string) {
  if (selectedSlot.value == null) return;
  ctx.assignToSelectedSlot(sourceId);
}

const localAudioOn = computed(() => ctx.media.audioTrack.value != null);

async function startScreen() {
  try {
    await ctx.screen.start();
  } catch {
    // user cancelled
  }
}

// ─── participant row logic ─────────────────────────────────────────
const myMuted = computed(() => participantsStore.all[ctx.myPid]?.muted ?? false);
const myCameraOff = computed(
  () => participantsStore.all[ctx.myPid]?.cameraOff ?? false,
);
const myRaisedHand = computed(
  () => participantsStore.all[ctx.myPid]?.raisedHand ?? false,
);

const onStage = computed<StudioParticipant[]>(() => participantsStore.onStage);
const backstage = computed<StudioParticipant[]>(() => participantsStore.backstage);
const isHost = computed(() => ctx.role === "host");

function sourceIdFor(p: StudioParticipant): string {
  return p.pid === ctx.myPid ? ctx.localSourceId : p.pid;
}

function menuFor(p: StudioParticipant, where: "stage" | "backstage"): MenuItem[] {
  const isMe = p.pid === ctx.myPid;
  const items: MenuItem[] = [];

  if (where === "backstage") {
    if (isHost.value && !isMe) {
      items.push({ id: "bring-on-stage", label: "Bring on stage" });
    }
    if (isMe) {
      items.push({
        id: p.raisedHand ? "lower-hand" : "raise-hand",
        label: p.raisedHand ? "Lower hand" : "Raise hand",
      });
    }
  } else {
    if (isHost.value && !isMe) {
      items.push({ id: "send-to-backstage", label: "Send to backstage" });
    }
  }

  if (isMe || isHost.value) {
    if (items.length > 0) items.push({ kind: "separator" });
    items.push({
      id: p.muted ? "unmute" : "mute",
      label: p.muted ? "Unmute mic" : "Mute mic",
    });
    items.push({
      id: p.cameraOff ? "camera-on" : "camera-off",
      label: p.cameraOff ? "Turn camera on" : "Turn camera off",
    });
  }

  if (isHost.value && !isMe) {
    items.push({ kind: "separator" });
    items.push({ id: "kick", label: "Remove from studio", destructive: true });
  }

  return items;
}

async function handleMenu(p: StudioParticipant, action: string) {
  const part = ctx.participants;
  switch (action) {
    case "bring-on-stage":
      await part.bringOnStage(p.pid);
      break;
    case "send-to-backstage":
      await part.sendToBackstage(p.pid);
      break;
    case "raise-hand":
      await part.raiseHand(true);
      break;
    case "lower-hand":
      await part.raiseHand(false);
      break;
    case "mute":
      await part.setMuted(p.pid, true);
      break;
    case "unmute":
      await part.setMuted(p.pid, false);
      break;
    case "camera-off":
      await part.setCameraOff(p.pid, true);
      break;
    case "camera-on":
      await part.setCameraOff(p.pid, false);
      break;
    case "kick":
      await part.kick(p.pid);
      break;
  }
}

function initialsFor(p: StudioParticipant): string {
  return p.name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase() || "??";
}
</script>

<template>
  <aside
    class="flex h-full w-full flex-col border-r border-[color:var(--cc-border)] bg-[var(--cc-chalk-warm)]"
  >
    <PanelHeader title="People" />

    <div class="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      <!-- ===== LOCAL ===== -->
      <section class="flex flex-col gap-3">
        <h3
          class="flex items-center gap-2 font-ui text-[9px] uppercase tracking-[0.14em] text-[var(--cc-ink-muted)]"
        >
          Local
          <span class="h-px flex-1 bg-[var(--cc-border)]" />
        </h3>

        <Select v-model="cameraValue" :items="cameraItems" label="Camera" />
        <Select v-model="micValue" :items="micItems" label="Microphone" />

        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <span class="font-ui text-[9px] uppercase tracking-[0.12em] text-[var(--cc-ink-muted)]">
              Input level
            </span>
            <span
              class="font-ui text-[8.5px] uppercase tracking-[0.1em]"
              :class="
                myMuted
                  ? 'text-[var(--cc-signal)]'
                  : localAudioOn
                  ? 'text-[var(--cc-live)]'
                  : 'text-[var(--cc-ink-ghost)]'
              "
            >
              {{ myMuted ? "Muted" : localAudioOn ? "Live" : "Off" }}
            </span>
          </div>
          <VUMeter
            :level="myMuted ? 0 : ctx.audioLevel.value"
            :peak="myMuted ? 0 : ctx.audioPeak.value"
            :height="7"
          />
        </div>
      </section>

      <!-- ===== ON STAGE ===== -->
      <section class="flex flex-col gap-2">
        <h3
          class="flex items-center gap-2 font-ui text-[9px] uppercase tracking-[0.14em] text-[var(--cc-ink-muted)]"
        >
          On Stage
          <span
            class="border border-[color:var(--cc-border)] px-1 font-ui text-[8px] text-[var(--cc-ink-ghost)]"
          >
            {{ onStage.length }}
          </span>
          <Kbd v-if="hasSelection">Slot {{ (selectedSlot ?? 0) + 1 }}</Kbd>
          <span class="h-px flex-1 bg-[var(--cc-border)]" />
        </h3>

        <!-- Participant rows -->
        <div
          v-for="p in onStage"
          :key="p.pid"
          class="group flex items-stretch"
        >
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-3 border border-[color:var(--cc-border)] bg-[var(--cc-chalk)] p-2 text-left transition-[transform,box-shadow,border-color] duration-[var(--cc-dur-fast)] ease-[var(--cc-ease-snappy)] hover:-translate-y-px hover:border-[color:var(--cc-border-strong)] hover:shadow-[var(--cc-shadow-sm)]"
            :class="
              slotOf(sourceIdFor(p)) != null
                ? p.pid === ctx.myPid
                  ? 'border-l-[3px] border-l-[var(--cc-signal)]'
                  : 'border-l-[3px] border-l-[var(--cc-live)]'
                : ''
            "
            @click="bindIfSlotSelected(sourceIdFor(p))"
          >
            <span
              class="relative flex h-7 w-7 shrink-0 items-center justify-center font-display text-[10px] font-bold tracking-[0.04em]"
              :class="
                p.pid === ctx.myPid
                  ? 'bg-[var(--cc-soot)] text-[var(--cc-chalk)]'
                  : 'bg-[var(--cc-live-dim)] text-[var(--cc-live)]'
              "
            >
              {{ p.pid === ctx.myPid ? "ME" : initialsFor(p) }}
              <span
                v-if="p.muted"
                class="absolute -right-1 -bottom-1 flex h-3 w-3 items-center justify-center border border-[var(--cc-chalk)] bg-[var(--cc-signal)] text-[7px] font-bold text-white"
                aria-label="Muted"
              >
                M
              </span>
            </span>
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="flex items-center gap-1.5">
                <span class="truncate font-body text-[12px] font-semibold text-[var(--cc-ink)]">
                  {{ p.name }}
                </span>
                <span
                  v-if="p.role === 'host'"
                  class="shrink-0 border border-[color:var(--cc-border-strong)] bg-[var(--cc-chalk-warm)] px-1 font-ui text-[7.5px] uppercase tracking-[0.1em] text-[var(--cc-ink-muted)]"
                >
                  Host
                </span>
              </span>
              <span
                class="truncate font-ui text-[8.5px] uppercase tracking-[0.1em] text-[var(--cc-ink-muted)]"
              >
                {{ p.cameraOff ? "Camera off" : "On stage · live" }}
              </span>
            </span>
            <span
              v-if="slotOf(sourceIdFor(p)) != null"
              class="shrink-0 border px-1.5 py-px font-ui text-[8px] uppercase tracking-[0.12em]"
              :class="
                p.pid === ctx.myPid
                  ? 'border-[var(--cc-signal)] bg-[var(--cc-signal-dim)] text-[var(--cc-signal)]'
                  : 'border-[var(--cc-live)] bg-[var(--cc-live-dim)] text-[var(--cc-live)]'
              "
            >
              Slot {{ (slotOf(sourceIdFor(p)) ?? 0) + 1 }}
            </span>
          </button>

          <Menu
            :items="menuFor(p, 'stage')"
            @select="(id) => handleMenu(p, id)"
          >
            <template #trigger>
              <button
                type="button"
                class="flex h-full shrink-0 items-center justify-center border border-l-0 border-[color:var(--cc-border)] bg-[var(--cc-chalk)] px-2 font-ui text-[var(--cc-ink-muted)] transition-colors hover:bg-[var(--cc-chalk-warm)] hover:text-[var(--cc-ink)]"
                aria-label="Participant actions"
              >
                <svg width="12" height="4" viewBox="0 0 12 4" aria-hidden>
                  <circle cx="2" cy="2" r="1" fill="currentColor" />
                  <circle cx="6" cy="2" r="1" fill="currentColor" />
                  <circle cx="10" cy="2" r="1" fill="currentColor" />
                </svg>
              </button>
            </template>
          </Menu>
        </div>

        <!-- Screen share row -->
        <div v-if="ctx.screen.active.value" class="flex items-stretch">
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-3 border border-[color:var(--cc-border)] bg-[var(--cc-chalk)] p-2 text-left transition-[transform,box-shadow,border-color] duration-[var(--cc-dur-fast)] ease-[var(--cc-ease-snappy)] hover:-translate-y-px hover:border-[color:var(--cc-border-strong)] hover:shadow-[var(--cc-shadow-sm)]"
            :class="
              slotOf(ctx.screenSourceId) != null
                ? 'border-l-[3px] border-l-[var(--cc-info)]'
                : ''
            "
            @click="bindIfSlotSelected(ctx.screenSourceId)"
          >
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center bg-[var(--cc-info-dim)] font-display text-[10px] font-bold tracking-[0.04em] text-[var(--cc-info)]"
            >
              SC
            </span>
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="truncate font-body text-[12px] font-semibold text-[var(--cc-ink)]">
                Screen share
              </span>
              <span class="truncate font-ui text-[8.5px] uppercase tracking-[0.1em] text-[var(--cc-ink-muted)]">
                Display capture
              </span>
            </span>
            <span
              v-if="slotOf(ctx.screenSourceId) != null"
              class="shrink-0 border border-[color:var(--cc-info)] bg-[var(--cc-info-dim)] px-1.5 py-px font-ui text-[8px] uppercase tracking-[0.12em] text-[var(--cc-info)]"
            >
              Slot {{ (slotOf(ctx.screenSourceId) ?? 0) + 1 }}
            </span>
          </button>
          <button
            type="button"
            class="shrink-0 border border-l-0 border-[color:var(--cc-border)] bg-[var(--cc-chalk)] px-3 font-ui text-[8.5px] uppercase tracking-[0.12em] text-[var(--cc-ink-muted)] transition-colors hover:bg-[var(--cc-signal-dim)] hover:text-[var(--cc-signal)]"
            @click="ctx.screen.stop()"
          >
            Stop
          </button>
        </div>
        <button
          v-else
          type="button"
          class="flex w-full items-center justify-center gap-2 border border-dashed border-[color:var(--cc-border-strong)] bg-transparent p-2 font-ui text-[9.5px] uppercase tracking-[0.12em] text-[var(--cc-ink-muted)] transition-colors hover:border-[color:var(--cc-ink-muted)] hover:text-[var(--cc-ink)]"
          @click="startScreen"
        >
          + Add screen share
        </button>

        <p
          v-if="onStage.length === 1 && !ctx.screen.active.value"
          class="font-ui text-[8.5px] uppercase leading-[1.5] tracking-[0.1em] text-[var(--cc-ink-ghost)]"
        >
          {{
            hasSelection
              ? "Click a source to bind it to the selected slot."
              : "Click a slot on the stage first."
          }}
        </p>
      </section>

      <!-- ===== BACKSTAGE ===== -->
      <section v-if="backstage.length > 0" class="flex flex-col gap-2">
        <h3
          class="flex items-center gap-2 font-ui text-[9px] uppercase tracking-[0.14em] text-[var(--cc-ink-muted)]"
        >
          Backstage
          <span
            class="border border-[color:var(--cc-border)] px-1 font-ui text-[8px] text-[var(--cc-ink-ghost)]"
          >
            {{ backstage.length }}
          </span>
          <span class="h-px flex-1 bg-[var(--cc-border)]" />
        </h3>

        <div
          v-for="p in backstage"
          :key="p.pid"
          class="group flex items-stretch"
        >
          <button
            type="button"
            :disabled="!isHost && p.pid !== ctx.myPid"
            class="flex min-w-0 flex-1 items-center gap-3 border border-[color:var(--cc-border)] bg-[var(--cc-chalk)]/60 p-2 text-left transition-[transform,box-shadow,border-color] duration-[var(--cc-dur-fast)] ease-[var(--cc-ease-snappy)] hover:-translate-y-px hover:border-[color:var(--cc-border-strong)] hover:shadow-[var(--cc-shadow-sm)] disabled:cursor-default disabled:hover:transform-none"
            :class="p.raisedHand ? 'border-l-[3px] border-l-[var(--cc-caution)]' : ''"
            @click="isHost && p.pid !== ctx.myPid ? ctx.participants.bringOnStage(p.pid) : null"
          >
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center bg-[var(--cc-chalk-deep)] font-display text-[10px] font-bold tracking-[0.04em] text-[var(--cc-ink-muted)]"
            >
              {{ p.pid === ctx.myPid ? "ME" : initialsFor(p) }}
            </span>
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="flex items-center gap-1.5">
                <span class="truncate font-body text-[12px] font-semibold text-[var(--cc-ink)]">
                  {{ p.name }}
                </span>
                <span
                  v-if="p.raisedHand"
                  class="shrink-0 font-display text-[11px] leading-none text-[var(--cc-caution)]"
                  aria-label="Raised hand"
                  title="Raised hand"
                >✋</span>
              </span>
              <span
                class="truncate font-ui text-[8.5px] uppercase tracking-[0.1em] text-[var(--cc-ink-muted)]"
              >
                {{
                  p.raisedHand
                    ? "Hand raised · waiting"
                    : p.pid === ctx.myPid
                    ? "You · backstage"
                    : isHost
                    ? "Click to bring on stage"
                    : "Waiting"
                }}
              </span>
            </span>
          </button>

          <Menu
            :items="menuFor(p, 'backstage')"
            @select="(id) => handleMenu(p, id)"
          >
            <template #trigger>
              <button
                type="button"
                class="flex h-full shrink-0 items-center justify-center border border-l-0 border-[color:var(--cc-border)] bg-[var(--cc-chalk)] px-2 font-ui text-[var(--cc-ink-muted)] transition-colors hover:bg-[var(--cc-chalk-warm)] hover:text-[var(--cc-ink)]"
                aria-label="Participant actions"
              >
                <svg width="12" height="4" viewBox="0 0 12 4" aria-hidden>
                  <circle cx="2" cy="2" r="1" fill="currentColor" />
                  <circle cx="6" cy="2" r="1" fill="currentColor" />
                  <circle cx="10" cy="2" r="1" fill="currentColor" />
                </svg>
              </button>
            </template>
          </Menu>
        </div>

        <button
          v-if="!isHost && !myRaisedHand && participantsStore.all[ctx.myPid]?.stage === 'backstage'"
          type="button"
          class="w-full border border-dashed border-[color:var(--cc-caution)] bg-transparent p-2 font-ui text-[9.5px] uppercase tracking-[0.12em] text-[var(--cc-caution)] transition-colors hover:bg-[var(--cc-caution-dim)]"
          @click="ctx.participants.raiseHand(true)"
        >
          ✋ Raise hand
        </button>
      </section>
    </div>
  </aside>
</template>
