/**
 * useUserMedia — reactive wrapper around getUserMedia.
 *
 * Critical: the MediaStream/MediaStreamTrack live in `shallowRef`, never in
 * deeply-reactive state. The derived primitives (isLive, error, tracks count)
 * are the reactive surface. See CLAUDE.md §3.
 */
import { shallowRef, ref, onScopeDispose } from "vue";

export interface UseUserMediaReturn {
  readonly stream: Readonly<ReturnType<typeof shallowRef<MediaStream | null>>>;
  readonly videoTrack: Readonly<ReturnType<typeof shallowRef<MediaStreamTrack | null>>>;
  readonly audioTrack: Readonly<ReturnType<typeof shallowRef<MediaStreamTrack | null>>>;
  readonly isLive: Readonly<ReturnType<typeof ref<boolean>>>;
  readonly error: Readonly<ReturnType<typeof shallowRef<unknown>>>;
  start(constraints?: MediaStreamConstraints): Promise<MediaStream>;
  stop(): void;
}

export function useUserMedia(): UseUserMediaReturn {
  const stream = shallowRef<MediaStream | null>(null);
  const videoTrack = shallowRef<MediaStreamTrack | null>(null);
  const audioTrack = shallowRef<MediaStreamTrack | null>(null);
  const isLive = ref(false);
  const error = shallowRef<unknown>(null);

  async function start(
    constraints: MediaStreamConstraints = { audio: true, video: true },
  ): Promise<MediaStream> {
    stop();
    try {
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      stream.value = s;
      videoTrack.value = s.getVideoTracks()[0] ?? null;
      audioTrack.value = s.getAudioTracks()[0] ?? null;
      isLive.value = true;

      // Update isLive if the track ends (permission revoked, device unplugged).
      const handleEnded = () => {
        if (!stream.value) return;
        const stillLive = stream.value.getTracks().some((t) => t.readyState === "live");
        isLive.value = stillLive;
      };
      s.getTracks().forEach((t) => t.addEventListener("ended", handleEnded));

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
    audioTrack.value = null;
    isLive.value = false;
  }

  onScopeDispose(stop);

  return {
    stream: stream,
    videoTrack,
    audioTrack,
    isLive,
    error,
    start,
    stop,
  };
}
