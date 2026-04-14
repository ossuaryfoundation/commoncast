/**
 * useScreenCapture — wraps navigator.mediaDevices.getDisplayMedia.
 *
 * The stream and track live in shallowRef (CLAUDE.md §3 — never put live
 * media in a deeply-reactive container). When the user ends the capture from
 * the browser's native controls, the "ended" event on the track clears our
 * state automatically.
 */
import { shallowRef, onScopeDispose, type ShallowRef } from "vue";

export interface UseScreenCaptureReturn {
  readonly stream: Readonly<ShallowRef<MediaStream | null>>;
  readonly videoTrack: Readonly<ShallowRef<MediaStreamTrack | null>>;
  readonly error: Readonly<ShallowRef<unknown>>;
  start(): Promise<MediaStream>;
  stop(): void;
}

export function useScreenCapture(): UseScreenCaptureReturn {
  const stream = shallowRef<MediaStream | null>(null);
  const videoTrack = shallowRef<MediaStreamTrack | null>(null);
  const error = shallowRef<unknown>(null);

  async function start(): Promise<MediaStream> {
    stop();
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      });
      stream.value = s;
      const vt = s.getVideoTracks()[0] ?? null;
      videoTrack.value = vt;
      vt?.addEventListener("ended", stop, { once: true });
      return s;
    } catch (err) {
      error.value = err;
      throw err;
    }
  }

  function stop(): void {
    stream.value?.getTracks().forEach((t) => t.stop());
    stream.value = null;
    videoTrack.value = null;
  }

  onScopeDispose(stop);

  return { stream, videoTrack, error, start, stop };
}
