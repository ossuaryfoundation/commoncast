/**
 * useAudioLevels — live RMS + decaying-peak level for a MediaStream's audio.
 *
 * Reactive to a MediaStream ref: when the stream changes, we tear down the
 * old AudioContext/AnalyserNode graph and build a new one. The returned
 * `level` and `peak` refs are updated via requestAnimationFrame while the
 * owning scope is alive. All of this is kept outside Pinia — the raw graph
 * never touches a reactive proxy.
 */
import { ref, shallowRef, watch, onScopeDispose, type Ref } from "vue";

export interface UseAudioLevelsReturn {
  /** 0..~1 RMS of the current audio frame. */
  readonly level: Ref<number>;
  /** 0..~1 decaying peak. */
  readonly peak: Ref<number>;
}

export function useAudioLevels(
  stream: Ref<MediaStream | null>,
): UseAudioLevelsReturn {
  const level = ref(0);
  const peak = ref(0);

  const ctxRef = shallowRef<AudioContext | null>(null);
  const analyserRef = shallowRef<AnalyserNode | null>(null);
  let raf = 0;

  function teardown() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    analyserRef.value?.disconnect();
    analyserRef.value = null;
    const ctx = ctxRef.value;
    ctxRef.value = null;
    if (ctx && ctx.state !== "closed") {
      void ctx.close().catch(() => {});
    }
    level.value = 0;
    peak.value = 0;
  }

  function setup(s: MediaStream | null) {
    teardown();
    if (!s || s.getAudioTracks().length === 0) return;
    if (typeof window === "undefined" || typeof AudioContext === "undefined") return;
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(s);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.6;
    src.connect(analyser);
    ctxRef.value = ctx;
    analyserRef.value = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      const a = analyserRef.value;
      if (!a) return;
      a.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      level.value = rms;
      peak.value = Math.max(peak.value * 0.95, rms);
      raf = requestAnimationFrame(tick);
    };
    tick();
  }

  watch(stream, (s) => setup(s), { immediate: true });
  onScopeDispose(teardown);

  return { level, peak };
}
