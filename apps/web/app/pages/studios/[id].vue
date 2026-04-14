<!--
  Studio — host/guest broadcasting interface. The wiring hub.

  Everything stateful lives at this level: engine, media, devices, recorder,
  sender, peers, stage selection, screen capture, audio levels. The page
  builds a single StudioContext and provides it to every child — TopToolbar,
  SourcesPanel, StudioStage, ControlsPanel, StatusBar all `inject` the same
  instance instead of creating their own.

  Source lifecycle (auto-assign):
    - When a source (local camera, screen share, remote peer track) arrives,
      it's added to the compositor AND auto-assigned to the first empty slot
      of every scene that doesn't already reference it.
    - When a source is removed (camera switch, screen share stop, peer
      leaves), it's torn out of the compositor AND cleared from every scene's
      feeds.
    - The direct-manipulation model (click a slot, click a source) lets the
      user override any auto-assignment.
-->
<script setup lang="ts">
import { computed, onMounted, provide, ref, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { asSceneId, asSourceId } from "@commoncast/studio-engine";

import { useStudioStore } from "~/stores/studio";
import { usePrefsStore } from "~/stores/prefs";
import { useParticipantsStore } from "~/stores/participants";
import { useDestinationsStore } from "~/stores/destinations";
import { useChatStore } from "~/stores/chat";
import { useStudioEngine } from "~/composables/useStudioEngine";
import { useUserMedia } from "~/composables/useUserMedia";
import { useStudioRecorder } from "~/composables/useStudioRecorder";
import { useBroadcastFanout } from "~/composables/useBroadcastFanout";
import { useClaspRoom } from "~/composables/useClaspRoom";
import { useStudioPeers } from "~/composables/useStudioPeers";
import { useStudioParticipants } from "~/composables/useStudioParticipants";
import { useStudioChat } from "~/composables/useStudioChat";
import { useHostMixer } from "~/composables/useHostMixer";
import { useStageSelection } from "~/composables/useStageSelection";
import { useToasts } from "~/composables/useToasts";
import { useHotkeys } from "~/composables/useHotkeys";
import { useCommands, type Command } from "~/composables/useCommands";
import { useScreenCapture } from "~/composables/useScreenCapture";
import { useAudioLevels } from "~/composables/useAudioLevels";
import { useMediaDevices } from "~/composables/useMediaDevices";
import {
  provideStudioContext,
  type StudioContext,
} from "~/composables/useStudioContext";

import TopToolbar from "~/components/studio/TopToolbar.vue";
import SourcesPanel from "~/components/studio/SourcesPanel.vue";
import StudioStage from "~/components/studio/StudioStage.vue";
import ControlsPanel from "~/components/studio/ControlsPanel.vue";
import StatusBar from "~/components/studio/StatusBar.vue";

definePageMeta({ layout: "studio" });

const studio = useStudioStore();
const prefs = usePrefsStore();
const participantsStore = useParticipantsStore();
const destinationsStore = useDestinationsStore();
destinationsStore.seedDefaults();
const toasts = useToasts();
const route = useRoute();
const router = useRouter();
studio.studioId = String(route.params.id ?? "default");

const guestName = typeof route.query.guest === "string" ? route.query.guest : null;
const role: "host" | "guest" = guestName ? "guest" : "host";
const myName = guestName ?? "Host";
const myPid =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `pid-${Math.random().toString(36).slice(2)}`;

const localSourceId = myPid;
const screenSourceId = `${myPid}:screen`;

// ─── canvas + engine ───────────────────────────────────────────────
const canvas = ref<HTMLCanvasElement | null>(null);
provide("commoncast:canvas", canvas);

const engine = useStudioEngine(canvas, { width: 1280, height: 720, fps: 30 });

// ─── media, devices, audio levels ──────────────────────────────────
const media = useUserMedia();
const devices = useMediaDevices();
const audioStream = computed(() => media.stream.value);
const { level: audioLevel, peak: audioPeak } = useAudioLevels(audioStream);

function buildConstraints(): MediaStreamConstraints {
  const video: MediaTrackConstraints = { width: 1280, height: 720 };
  if (prefs.defaultCameraId) video.deviceId = { exact: prefs.defaultCameraId };
  const audio: MediaTrackConstraints = {};
  if (prefs.defaultMicId) audio.deviceId = { exact: prefs.defaultMicId };
  return { video, audio };
}

async function startLocalMedia() {
  try {
    await media.start(buildConstraints());
    await devices.refresh();
  } catch (err) {
    const e = err as Error;
    if (e.name === "NotAllowedError") {
      toasts.error({
        title: "Camera & microphone access denied",
        description:
          "Click the camera icon in your browser's address bar, grant permission for this site, then retry.",
        action: { label: "Retry", onClick: () => void startLocalMedia() },
        timeout: 0,
      });
    } else if (e.name === "NotFoundError" || e.name === "OverconstrainedError") {
      toasts.error({
        title: "No camera or microphone found",
        description:
          "We couldn't find a matching device. Try picking another one in the People panel.",
        action: { label: "Retry", onClick: () => void startLocalMedia() },
      });
    } else {
      toasts.error({
        title: "Couldn't start camera & mic",
        description: e.message || "Unknown error",
        action: { label: "Retry", onClick: () => void startLocalMedia() },
      });
    }
  }
}

async function switchCamera(deviceId: string | null) {
  prefs.setDefaultCamera(deviceId);
  await startLocalMedia();
}
async function switchMic(deviceId: string | null) {
  prefs.setDefaultMic(deviceId);
  await startLocalMedia();
}

// ─── recorder + fanout + selection + audio mixer ──────────────────
const recorder = useStudioRecorder();
const fanout = useBroadcastFanout();
const selection = useStageSelection();
const hostMixer = useHostMixer();

// ─── screen capture ────────────────────────────────────────────────
const screen = useScreenCapture();
const screenActive = computed(() => screen.videoTrack.value != null);

// ─── room (shared by peers + participants) ─────────────────────────
const room = useClaspRoom(studio.studioId, myPid);

// ─── peers ─────────────────────────────────────────────────────────
const peers = useStudioPeers({
  room,
  myPid,
  role,
  getLocalTracks: () => {
    const out: MediaStreamTrack[] = [];
    const v = media.videoTrack.value;
    const a = media.audioTrack.value;
    if (v) out.push(v);
    if (a) out.push(a);
    return out;
  },
  onRemoteTrack: async (fromPid, track) => {
    const label = participantsStore.all[fromPid]?.name ?? `Peer ${fromPid.slice(0, 6)}`;
    if (track.kind === "video") {
      await mountSource(fromPid, label, track);
      return;
    }
    if (track.kind === "audio") {
      // Route remote peer audio into the host mixer. The mixer key is the
      // peer's pid so participants-store mute changes can flip it later.
      hostMixer.addSource(fromPid, label, track, { kind: "peer" });
      return;
    }
  },
});

// ─── participants projection + host controls ──────────────────────
const participants = useStudioParticipants({
  myPid,
  role,
  room,
  onOwnMutedChanged: (muted) => {
    const track = media.audioTrack.value;
    if (track) track.enabled = !muted;
  },
  onOwnCameraOffChanged: (off) => {
    const track = media.videoTrack.value;
    if (track) track.enabled = !off;
  },
  onKicked: () => {
    void router.push("/");
  },
});

// ─── chat projection + send / feature / clear ─────────────────
const chat = useStudioChat({
  studioId: studio.studioId,
  myPid,
  myName,
  role,
});
const chatStore = useChatStore();

// ─── source mounting ───────────────────────────────────────────────

// Track which source ids are currently mounted on the compositor so we can
// reconcile as tracks change.
const mountedSources = shallowRef<Set<string>>(new Set());
const peerLabels = shallowRef<Map<string, string>>(new Map());

async function mountSource(
  id: string,
  name: string,
  track: MediaStreamTrack,
  opts: { autoAssign?: boolean } = {},
) {
  if (!engine.ready.value) return;
  if (mountedSources.value.has(id)) {
    // Already mounted — replace by removing first so the new track is used.
    unmountSource(id, { preserveAssignments: true });
  }
  await engine.addSource({
    kind: "camera",
    id: asSourceId(id),
    name,
    track,
  });
  const next = new Set(mountedSources.value);
  next.add(id);
  mountedSources.value = next;
  const labels = new Map(peerLabels.value);
  labels.set(id, name);
  peerLabels.value = labels;
  if (opts.autoAssign !== false) studio.autoAssignSource(id);
  renderScene();
}

function unmountSource(id: string, opts: { preserveAssignments?: boolean } = {}) {
  if (!mountedSources.value.has(id)) return;
  engine.removeSource(asSourceId(id));
  const next = new Set(mountedSources.value);
  next.delete(id);
  mountedSources.value = next;
  if (!opts.preserveAssignments) {
    studio.forgetSource(id);
  }
  renderScene();
}

// Reconcile local camera track. Local camera always auto-assigns so the
// host/guest sees their own feed in the self-preview immediately.
watch(
  [engine.ready, () => media.videoTrack.value],
  async ([ready, track]) => {
    if (!ready) return;
    if (track) {
      await mountSource(localSourceId, myName, track, { autoAssign: true });
    } else {
      unmountSource(localSourceId);
    }
  },
  { immediate: true },
);

// Reconcile screen-capture track — also auto-assigns on start.
watch(
  () => screen.videoTrack.value,
  async (track) => {
    if (!engine.ready.value) return;
    if (track) {
      await mountSource(screenSourceId, "Screen share", track, { autoAssign: true });
    } else {
      unmountSource(screenSourceId);
    }
  },
);

// Reconcile when peers disappear — drop both video (engine) and audio
// (mixer) sources for the departed pid.
watch(
  () => peers.remotePids.value,
  (pids, prev) => {
    if (!prev) return;
    for (const old of prev) {
      if (pids.includes(old)) continue;
      unmountSource(old);
      hostMixer.removeSource(old);
    }
  },
);

// Route our own local microphone track into the mixer. Uses a label
// (myName) so the mixer strip row looks right; kind: "local" colors
// the badge signal-red.
watch(
  () => media.audioTrack.value,
  (track) => {
    if (track) {
      hostMixer.addSource(localSourceId, `${myName} · mic`, track, {
        kind: "local",
      });
    } else {
      hostMixer.removeSource(localSourceId);
    }
  },
  { immediate: true },
);

// Mirror participant mute flags from the projection onto the mixer so
// host-over mute has immediate effect on the local mix, even before the
// guest's cooperative track-disable round-trip completes.
watch(
  () => participantsStore.list.map((p) => ({ pid: p.pid, muted: p.muted })),
  (rows) => {
    for (const row of rows) {
      if (row.pid === myPid) continue;
      if (!hostMixer.mixer.value?.has(row.pid)) continue;
      hostMixer.setMuted(row.pid, row.muted);
    }
  },
  { deep: true },
);

// Drive the compositor's speaker-ring rendering from the mixer's
// per-source levels. Hysteresis: a source flips to speaking when its
// level crosses ON_THRESHOLD; it flips back when it drops under
// OFF_THRESHOLD. This prevents the ring from strobing on every frame
// near the boundary. A minimum hold duration smooths short dips.
const SPEAK_ON = 0.05;
const SPEAK_OFF = 0.025;
const SPEAK_HOLD_MS = 250;
const speakingStates = new Map<string, { speaking: boolean; lastOnAt: number }>();

watch(
  () => hostMixer.levels.value,
  (levels) => {
    if (!engine.ready.value) return;
    const now = performance.now();
    for (const [id, { level }] of Object.entries(levels)) {
      const state = speakingStates.get(id) ?? { speaking: false, lastOnAt: 0 };
      if (!state.speaking && level >= SPEAK_ON) {
        state.speaking = true;
        state.lastOnAt = now;
        engine.updateSourceSpeaking(asSourceId(id), true);
      } else if (state.speaking && level < SPEAK_OFF && now - state.lastOnAt > SPEAK_HOLD_MS) {
        state.speaking = false;
        engine.updateSourceSpeaking(asSourceId(id), false);
      } else if (state.speaking && level >= SPEAK_OFF) {
        state.lastOnAt = now;
      }
      speakingStates.set(id, state);
    }
    // Clear any speakingStates for sources that no longer exist in levels.
    for (const id of Array.from(speakingStates.keys())) {
      if (!(id in levels)) {
        const prev = speakingStates.get(id);
        if (prev?.speaking) engine.updateSourceSpeaking(asSourceId(id), false);
        speakingStates.delete(id);
      }
    }
  },
);

// Stage-driven assignment for remote peers. A peer's mounted track is only
// auto-assigned to scene slots when their participant entry says
// `stage === "live"`; backstage peers stay mounted (so we can see them in
// the inventory and promote them instantly) but don't appear in any scene.
watch(
  () => participantsStore.onStage.map((p) => p.pid),
  (liveNow, livePrev) => {
    const prev = livePrev ?? [];
    // Promoted: in liveNow but not in prev → auto-assign if the track is
    // already mounted. (If not mounted yet, the onRemoteTrack mount path
    // will trigger its own assignment via this same watcher on re-emit.)
    for (const pid of liveNow) {
      if (pid === myPid) continue;
      if (prev.includes(pid)) continue;
      if (mountedSources.value.has(pid)) studio.autoAssignSource(pid);
    }
    // Demoted: in prev but not in liveNow → clear from every scene's feeds
    // (track stays mounted so re-promotion is instant).
    for (const pid of prev) {
      if (pid === myPid) continue;
      if (liveNow.includes(pid)) continue;
      studio.forgetSource(pid);
    }
    renderScene();
  },
);

// When a remote peer's track is mounted AFTER they were already on-stage,
// the watcher above won't re-fire (their pid was already in the list). Run
// a reconcile pass on mountedSources changes.
watch(
  () => mountedSources.value,
  () => {
    for (const p of participantsStore.onStage) {
      if (p.pid === myPid) continue;
      if (mountedSources.value.has(p.pid)) studio.autoAssignSource(p.pid);
    }
  },
);

// ─── scene rendering ───────────────────────────────────────────────
function renderScene() {
  if (!engine.ready.value) return;
  const scene = studio.activeScene;
  if (!scene) return;
  const overlays: Parameters<typeof engine.setScene>[0]["overlays"] = [
    {
      kind: "logo",
      visible: scene.overlays.logo,
      text: studio.brand.logoText,
      accent: studio.brand.accent,
    },
    {
      kind: "lowerThird",
      visible: scene.overlays.lowerThird,
      name: studio.brand.lowerName,
      subtitle: studio.brand.lowerSubtitle,
      accent: studio.brand.accent,
    },
    {
      kind: "ticker",
      visible: scene.overlays.ticker,
      text: studio.brand.tickerText,
      accent: studio.brand.accent,
    },
  ];
  // Ambient overlay: a featured chat message rendered as a transient
  // banner over every scene. Driven by chat store → composable auto-clear
  // → compositor redraw.
  const featured = chatStore.featured;
  if (featured) {
    overlays.push({
      kind: "chatBanner",
      visible: true,
      name: featured.fromName,
      text: featured.text,
      platform: featured.platform,
      accent: studio.brand.accent,
    });
  }
  engine.setScene({
    id: asSceneId(scene.id),
    name: scene.name,
    layout: scene.layout,
    feeds: scene.feeds.map((id) => (id ? asSourceId(id) : null)),
    overlays,
  });
}

watch(
  () => [
    engine.ready.value,
    studio.activeSceneId,
    studio.activeScene?.layout,
    studio.activeScene?.feeds,
    studio.activeScene?.overlays,
    studio.brand,
    chatStore.featuredId,
    chatStore.featured?.text,
  ],
  () => renderScene(),
  { deep: true },
);

/**
 * Build the composited output stream: compositor's canvas video track +
 * host mixer's output audio track. This is what recording and broadcast
 * both consume. Prior to slice B this was video-only — the silent-audio
 * bug lived here.
 */
function buildOutputStream(): MediaStream | null {
  const videoStream = engine.getOutputStream();
  if (!videoStream) return null;
  const tracks: MediaStreamTrack[] = [];
  const v = videoStream.getVideoTracks()[0];
  if (v) tracks.push(v);
  const a = hostMixer.outputTrack.value;
  if (a) tracks.push(a);
  if (tracks.length === 0) return null;
  return new MediaStream(tracks);
}

// ─── broadcast (multi-destination fanout) + record ────────────────
watch(
  () => studio.isLive,
  async (live) => {
    if (live) {
      await hostMixer.resume();
      const stream = buildOutputStream();
      if (!stream) {
        toasts.warn({
          title: "Output stream not ready",
          description: "Wait for the engine to initialize, then try again.",
        });
        studio.isLive = false;
        return;
      }
      if (destinationsStore.autoList.length === 0) {
        toasts.warn({
          title: "No destinations enabled",
          description: "Open the Destinations drawer in the toolbar and mark at least one as Auto.",
        });
        studio.isLive = false;
        return;
      }
      try {
        await fanout.goAll(studio.studioId, stream);
      } catch (err) {
        const e = err as Error;
        toasts.error({
          title: "Couldn't go live",
          description: e.message || "See console for details.",
          action: {
            label: "Retry",
            onClick: () => {
              studio.isLive = false;
              studio.isLive = true;
            },
          },
        });
        studio.isLive = false;
      }
    } else {
      fanout.stopAll();
    }
  },
);

watch(
  () => studio.isRecording,
  async (rec) => {
    if (rec) {
      await hostMixer.resume();
      const stream = buildOutputStream();
      if (!stream) {
        toasts.warn({
          title: "Output stream not ready",
          description: "Wait for the engine to initialize, then try again.",
        });
        studio.isRecording = false;
        return;
      }
      try {
        recorder.start(stream);
      } catch (err) {
        toasts.error({
          title: "Couldn't start recording",
          description: (err as Error).message || "Unknown error",
        });
        studio.isRecording = false;
      }
    } else if (
      recorder.state.value === "recording" ||
      recorder.state.value === "paused"
    ) {
      const blob = await recorder.stop();
      if (blob) {
        const filename = `commoncast-${Date.now()}.webm`;
        downloadBlob(blob, filename);
        toasts.success({
          title: "Recording saved",
          description: filename,
        });
      }
    }
  },
);

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── command + hotkey registration ────────────────────────────────
const { register: registerHotkey } = useHotkeys();
const { register: registerCommands } = useCommands();

async function copyInviteLink(): Promise<void> {
  if (typeof window === "undefined") return;
  const url = `${window.location.origin}/join/${studio.studioId}`;
  try {
    await navigator.clipboard.writeText(url);
    toasts.success({ title: "Invite link copied", description: url });
  } catch {
    toasts.error({
      title: "Couldn't copy to clipboard",
      description: "Your browser may have blocked clipboard access.",
    });
  }
}

function myEntry() {
  return participantsStore.all[myPid];
}

// Static hotkeys. Scene F1-F5 are registered dynamically below so they
// track scene order changes.
registerHotkey({
  id: "studio.mute.self",
  keys: "m",
  label: "Toggle self mute",
  category: "People",
  action: async () => {
    const me = myEntry();
    if (!me) return;
    await participants.setMuted(myPid, !me.muted);
  },
});
registerHotkey({
  id: "studio.live.toggle",
  keys: "g",
  label: "Toggle Go Live",
  category: "Broadcast",
  action: () => {
    studio.isLive = !studio.isLive;
  },
});
registerHotkey({
  id: "studio.record.toggle",
  keys: "r",
  label: "Toggle recording",
  category: "Broadcast",
  action: () => {
    studio.isRecording = !studio.isRecording;
  },
});
registerHotkey({
  id: "studio.stage.mode.toggle",
  keys: "t",
  label: "Toggle stage edit/operate mode",
  category: "Stage",
  action: () => {
    selection.toggleMode();
  },
});
// F1-F5 scene recall, registered per scene index.
for (let i = 1; i <= 5; i++) {
  registerHotkey({
    id: `studio.scene.${i}`,
    keys: `f${i}`,
    label: `Go to scene ${i}`,
    category: "Scenes",
    action: () => {
      const scene = studio.scenes.find((s) => s.index === i);
      if (scene) studio.setScene(scene.id);
    },
  });
}

// Static commands — registered once. Dynamic commands (per-scene
// "Go to scene X") are registered in a watcher below so they track
// scene edits.
const staticCommands: Command[] = [
  // ─── System ──────────
  {
    id: "system.invite",
    label: "Copy invite link",
    description: "Copy /join/{studioId} to the clipboard",
    category: "System",
    keywords: ["share", "guest", "url"],
    action: copyInviteLink,
  },
  {
    id: "system.settings",
    label: "Open settings",
    category: "System",
    action: () => router.push("/settings"),
  },
  {
    id: "system.dashboard",
    label: "Open dashboard",
    category: "System",
    action: () => router.push("/"),
  },

  // ─── Broadcast ──────────
  {
    id: "broadcast.go-live",
    label: "Go Live",
    description: "Publish the composite to every auto destination",
    category: "Broadcast",
    keys: "G",
    keywords: ["start", "stream", "publish"],
    when: () => !studio.isLive,
    action: () => {
      studio.isLive = true;
    },
  },
  {
    id: "broadcast.stop-live",
    label: "Stop broadcast",
    category: "Broadcast",
    keys: "G",
    keywords: ["end", "stream"],
    when: () => studio.isLive,
    action: () => {
      studio.isLive = false;
    },
  },
  {
    id: "broadcast.record.start",
    label: "Start recording",
    category: "Broadcast",
    keys: "R",
    keywords: ["rec", "capture"],
    when: () => !studio.isRecording,
    action: () => {
      studio.isRecording = true;
    },
  },
  {
    id: "broadcast.record.stop",
    label: "Stop recording",
    category: "Broadcast",
    keys: "R",
    when: () => studio.isRecording,
    action: () => {
      studio.isRecording = false;
    },
  },

  // ─── Stage ──────────
  {
    id: "stage.edit",
    label: "Switch stage to edit mode",
    description: "Show slot chips, empty placeholders, and clear buttons",
    category: "Stage",
    keys: "T",
    when: () => selection.mode.value !== "edit",
    action: () => selection.setMode("edit"),
  },
  {
    id: "stage.operate",
    label: "Switch stage to operate mode",
    description: "Hide slot overlay during live",
    category: "Stage",
    keys: "T",
    when: () => selection.mode.value !== "operate",
    action: () => selection.setMode("operate"),
  },
  {
    id: "stage.clear-selection",
    label: "Clear slot selection",
    category: "Stage",
    when: () => selection.slot.value != null,
    action: () => selection.clear(),
  },

  // ─── Scenes ──────────
  {
    id: "scenes.add",
    label: "Add new scene",
    category: "Scenes",
    keywords: ["create", "new"],
    action: () => {
      const scene = studio.addScene({
        name: `Scene ${studio.scenes.length + 1}`,
      });
      studio.setScene(scene.id);
    },
  },
  {
    id: "scenes.duplicate",
    label: "Duplicate current scene",
    category: "Scenes",
    when: () => studio.activeScene != null,
    action: () => {
      if (studio.activeScene) studio.duplicateScene(studio.activeScene.id);
    },
  },
  {
    id: "scenes.delete",
    label: "Delete current scene",
    category: "Scenes",
    when: () => studio.activeScene != null && studio.scenes.length > 1,
    action: () => {
      if (studio.activeScene) studio.removeScene(studio.activeScene.id);
    },
  },

  // ─── People ──────────
  {
    id: "people.mute.self.on",
    label: "Mute myself",
    category: "People",
    keys: "M",
    when: () => myEntry()?.muted === false,
    action: () => participants.setMuted(myPid, true),
  },
  {
    id: "people.mute.self.off",
    label: "Unmute myself",
    category: "People",
    keys: "M",
    when: () => myEntry()?.muted === true,
    action: () => participants.setMuted(myPid, false),
  },
  {
    id: "people.camera.self.off",
    label: "Turn my camera off",
    category: "People",
    when: () => myEntry()?.cameraOff !== true,
    action: () => participants.setCameraOff(myPid, true),
  },
  {
    id: "people.camera.self.on",
    label: "Turn my camera on",
    category: "People",
    when: () => myEntry()?.cameraOff === true,
    action: () => participants.setCameraOff(myPid, false),
  },
  {
    id: "people.raise-hand",
    label: "Raise my hand",
    description: "Request to come on stage",
    category: "People",
    when: () => role === "guest" && myEntry()?.raisedHand !== true,
    action: () => participants.raiseHand(true),
  },
  {
    id: "people.lower-hand",
    label: "Lower my hand",
    category: "People",
    when: () => role === "guest" && myEntry()?.raisedHand === true,
    action: () => participants.raiseHand(false),
  },

  // ─── Chat ──────────
  {
    id: "chat.clear-featured",
    label: "Clear featured chat message",
    category: "Chat",
    when: () => chatStore.featuredId != null && role === "host",
    action: () => chat.clearFeatured(),
  },
];
registerCommands(staticCommands);

// Dynamic: one "Go to scene X" command per scene, re-registered when
// the scenes array changes so renames/reorders show up in the palette.
let sceneCommandIds: string[] = [];
watch(
  () => studio.scenes.map((s) => ({ id: s.id, name: s.name, index: s.index })),
  (scenes) => {
    if (sceneCommandIds.length > 0) {
      for (const id of sceneCommandIds) registerCommands; // no-op to keep the registry happy
    }
    // Build next
    const next: Command[] = scenes.map((scene) => ({
      id: `scenes.goto.${scene.id}`,
      label: `Go to scene: ${scene.name}`,
      category: "Scenes",
      keys: scene.index <= 5 ? `F${scene.index}` : undefined,
      action: () => studio.setScene(scene.id),
    }));
    registerCommands(next);
    sceneCommandIds = next.map((c) => c.id);
  },
  { immediate: true, deep: true },
);

// ─── StudioContext ─────────────────────────────────────────────────
function labelForSource(id: string): string {
  if (id === localSourceId) return myName;
  if (id === screenSourceId) return "Screen share";
  const p = participantsStore.all[id];
  if (p) return p.name;
  return peerLabels.value.get(id) ?? `Peer ${id.slice(0, 6)}`;
}

function assignToSelectedSlot(sourceId: string) {
  const slot = selection.slot.value;
  if (slot == null) return;
  const scene = studio.activeScene;
  if (!scene) return;
  studio.assignSlot(scene.id, slot, sourceId);
  selection.clear();
}

const screenFacade = {
  active: screenActive,
  async start() {
    try {
      await screen.start();
    } catch (err) {
      const e = err as Error;
      // Browsers use NotAllowedError for BOTH "denied" AND "picker cancelled"
      // — distinguishing via the `message` string is a best-effort heuristic.
      const wasCancelled =
        e.name === "NotAllowedError" &&
        /permission denied by system|cancell|abort/i.test(e.message || "");
      if (!wasCancelled && e.name !== "NotAllowedError") {
        toasts.error({
          title: "Screen share failed",
          description: e.message || "Unknown error",
        });
      } else if (e.name === "NotAllowedError" && !wasCancelled) {
        toasts.warn({
          title: "Screen share denied",
          description: "Your browser or OS blocked screen capture.",
        });
      }
      // Cancellations stay silent — user hit cancel on the picker on purpose.
    }
  },
  stop() {
    screen.stop();
  },
};

const ctx: StudioContext = {
  myPid,
  myName,
  role,
  engine: engine.compositor,
  engineReady: engine.ready,
  media,
  peers,
  participants,
  chat,
  hostMixer,
  selection,
  recorder,
  fanout,
  devices,
  screen: screenFacade,
  audioLevel,
  audioPeak,
  localSourceId,
  screenSourceId,
  requestMedia: startLocalMedia,
  switchCamera,
  switchMic,
  assignToSelectedSlot,
  labelForSource,
};
provideStudioContext(ctx);

// Drive the stage edit/operate mode from studio.isLive. Users can still
// override manually via the Edit/Operate toggle in the stage header.
watch(
  () => studio.isLive,
  (live) => {
    selection.setMode(live ? "operate" : "edit");
  },
);

// ─── lifecycle ─────────────────────────────────────────────────────
onMounted(async () => {
  await startLocalMedia();
  try {
    await peers.join(myName);
  } catch {
    toasts.error({
      title: "Couldn't join the studio",
      description:
        "We couldn't connect to the clasp relay. Check your network or change the relay URL in Settings.",
      action: {
        label: "Retry",
        onClick: async () => {
          try {
            await peers.join(myName);
            toasts.success({ title: "Reconnected" });
          } catch {
            /* toast already up */
          }
        },
      },
      timeout: 0,
    });
  }
});
</script>

<template>
  <div class="grid h-full grid-rows-[44px_minmax(0,1fr)_32px] bg-[var(--cc-chalk)]">
    <TopToolbar />
    <div
      class="grid min-h-0 grid-cols-[240px_minmax(0,1fr)_280px] overflow-hidden"
    >
      <SourcesPanel />
      <StudioStage />
      <ControlsPanel />
    </div>
    <StatusBar />
  </div>
</template>
