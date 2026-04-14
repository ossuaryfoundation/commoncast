/**
 * useHostMixer — Vue wrapper around studio-engine's AudioMixer.
 *
 * The mixer is a framework-agnostic WebAudio graph. This composable:
 *   - instantiates one on mount and destroys it on scope dispose
 *   - exposes reactive `level` / `peak` for the mixed output (so the
 *     studio toolbar/status bar can render a master meter)
 *   - tracks a reactive list of sources (id, label, gain, muted) so the
 *     mixer strip can render rows without touching the AudioMixer directly
 *   - resumes the AudioContext on the first add/resume attempt (the
 *     autoplay policy suspends new contexts until a user gesture)
 *
 * CLAUDE.md §3 compliance: the AudioMixer (live audio graph) lives in
 * plain variables / shallowRef, never in deeply-reactive state. What goes
 * through Pinia-ish reactivity is the derived metadata (gain values,
 * muted flags, source labels) — the scalar read-out of the graph.
 */
import { shallowRef, ref, onScopeDispose, watch, type Ref, type ShallowRef } from "vue";
import { AudioMixer } from "@commoncast/studio-engine";

export interface HostMixerSource {
  id: string;
  label: string;
  /** 0..1.5 typical range; values above 1 amplify. */
  gain: number;
  muted: boolean;
  /** `"local"` for our own mic, `"peer"` for a remote track, `"other"` for aux. */
  kind: "local" | "peer" | "other";
}

export interface MixerLevels {
  level: number;
  peak: number;
}

export interface UseHostMixerReturn {
  /** The underlying mixer instance. Exposed for advanced callers. */
  readonly mixer: ShallowRef<AudioMixer | null>;
  /** List of live sources, in insertion order. */
  readonly sources: Ref<HostMixerSource[]>;
  /** Per-source RMS + decaying-peak levels, keyed by source id. */
  readonly levels: Ref<Record<string, MixerLevels>>;
  /** RMS level of the final mix (0..1). */
  readonly masterLevel: Ref<number>;
  /** Decaying peak of the final mix (0..1). */
  readonly masterPeak: Ref<number>;
  /** Mixed output audio track (stable identity across source changes). */
  readonly outputTrack: Ref<MediaStreamTrack | null>;
  readonly outputStream: ShallowRef<MediaStream | null>;
  /** Add or replace an audio source by id. */
  addSource(
    id: string,
    label: string,
    track: MediaStreamTrack,
    opts?: { kind?: HostMixerSource["kind"]; gain?: number; muted?: boolean },
  ): void;
  removeSource(id: string): void;
  setGain(id: string, gain: number): void;
  setMuted(id: string, muted: boolean): void;
  resume(): Promise<void>;
}

export function useHostMixer(): UseHostMixerReturn {
  const mixer = shallowRef<AudioMixer | null>(null);
  const sources = ref<HostMixerSource[]>([]);
  const outputTrack = ref<MediaStreamTrack | null>(null);
  const outputStream = shallowRef<MediaStream | null>(null);
  const levels = ref<Record<string, MixerLevels>>({});
  const masterLevel = ref(0);
  const masterPeak = ref(0);
  let rafHandle = 0;

  function ensureMixer(): AudioMixer {
    if (!mixer.value) {
      mixer.value = new AudioMixer();
      outputStream.value = mixer.value.outputStream();
      outputTrack.value = mixer.value.outputTrack();
      startLevelLoop();
    }
    return mixer.value;
  }

  function startLevelLoop() {
    if (rafHandle || typeof window === "undefined") return;
    const tick = () => {
      const m = mixer.value;
      if (!m) {
        rafHandle = 0;
        return;
      }
      const next: Record<string, MixerLevels> = {};
      for (const row of sources.value) {
        const prev = levels.value[row.id];
        const lv = m.getSourceLevel(row.id);
        const pk = Math.max((prev?.peak ?? 0) * 0.94, lv);
        next[row.id] = { level: lv, peak: pk };
      }
      levels.value = next;
      const ml = m.getMasterLevel();
      masterLevel.value = ml;
      masterPeak.value = Math.max(masterPeak.value * 0.94, ml);
      rafHandle = requestAnimationFrame(tick);
    };
    rafHandle = requestAnimationFrame(tick);
  }

  function stopLevelLoop() {
    if (rafHandle) {
      cancelAnimationFrame(rafHandle);
      rafHandle = 0;
    }
  }

  function syncSources() {
    if (!mixer.value) {
      sources.value = [];
      return;
    }
    const byId = new Map(sources.value.map((s) => [s.id, s]));
    const next: HostMixerSource[] = [];
    for (const entry of mixer.value.listSources()) {
      const prev = byId.get(entry.id);
      next.push({
        id: entry.id,
        label: prev?.label ?? entry.id,
        kind: prev?.kind ?? "other",
        gain: entry.gain,
        muted: entry.muted,
      });
    }
    sources.value = next;
  }

  async function resume(): Promise<void> {
    await ensureMixer().ensureRunning();
  }

  function addSource(
    id: string,
    label: string,
    track: MediaStreamTrack,
    opts: { kind?: HostMixerSource["kind"]; gain?: number; muted?: boolean } = {},
  ): void {
    if (track.kind !== "audio") return;
    const m = ensureMixer();
    m.addSource(id, track, { gain: opts.gain, muted: opts.muted });
    // After addSource, cache label + kind in our metadata layer.
    const existing = sources.value.find((s) => s.id === id);
    const merged: HostMixerSource = {
      id,
      label,
      kind: opts.kind ?? existing?.kind ?? "other",
      gain: opts.gain ?? existing?.gain ?? 1,
      muted: opts.muted ?? existing?.muted ?? false,
    };
    sources.value = [
      ...sources.value.filter((s) => s.id !== id),
      merged,
    ];
    outputTrack.value = m.outputTrack();
    outputStream.value = m.outputStream();
  }

  function removeSource(id: string): void {
    mixer.value?.removeSource(id);
    sources.value = sources.value.filter((s) => s.id !== id);
  }

  function setGain(id: string, gain: number): void {
    mixer.value?.setGain(id, gain);
    const i = sources.value.findIndex((s) => s.id === id);
    if (i >= 0) {
      const next = [...sources.value];
      next[i] = { ...next[i]!, gain };
      sources.value = next;
    }
  }

  function setMuted(id: string, muted: boolean): void {
    mixer.value?.setMuted(id, muted);
    const i = sources.value.findIndex((s) => s.id === id);
    if (i >= 0) {
      const next = [...sources.value];
      next[i] = { ...next[i]!, muted };
      sources.value = next;
    }
  }

  onScopeDispose(() => {
    stopLevelLoop();
    mixer.value?.destroy();
    mixer.value = null;
    outputTrack.value = null;
    outputStream.value = null;
    sources.value = [];
    levels.value = {};
    masterLevel.value = 0;
    masterPeak.value = 0;
  });

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      stopLevelLoop();
      mixer.value?.destroy();
      mixer.value = null;
    });
  }

  // Eagerly create on first access in the script setup so callers that
  // read `outputTrack` immediately get `null` and then a value when the
  // first source arrives.
  void watch(
    sources,
    () => {
      if (mixer.value) outputTrack.value = mixer.value.outputTrack();
    },
    { flush: "sync" },
  );

  return {
    mixer,
    sources,
    levels,
    masterLevel,
    masterPeak,
    outputTrack,
    outputStream,
    addSource,
    removeSource,
    setGain,
    setMuted,
    resume,
  };
}
