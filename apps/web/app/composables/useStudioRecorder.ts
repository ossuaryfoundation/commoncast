/**
 * useStudioRecorder — MediaRecorder wrapper that streams chunks.
 *
 * Chunks are collected in a plain module-scoped array (not reactive) and
 * concatenated into a Blob on stop, then exposed via a one-shot Blob URL. For
 * long sessions, swap this out for a WritableStream → IndexedDB pipeline.
 */
import { onScopeDispose, ref, shallowRef } from "vue";

export interface UseStudioRecorderReturn {
  readonly state: Readonly<ReturnType<typeof ref<"idle" | "recording" | "paused" | "stopped">>>;
  readonly lastBlob: Readonly<ReturnType<typeof shallowRef<Blob | null>>>;
  readonly elapsedMs: Readonly<ReturnType<typeof ref<number>>>;
  start(stream: MediaStream, mimeType?: string): void;
  pause(): void;
  resume(): void;
  stop(): Promise<Blob | null>;
}

export function useStudioRecorder(): UseStudioRecorderReturn {
  const state = ref<"idle" | "recording" | "paused" | "stopped">("idle");
  const lastBlob = shallowRef<Blob | null>(null);
  const elapsedMs = ref(0);

  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let startAt = 0;
  let tickHandle: ReturnType<typeof setInterval> | null = null;

  function start(stream: MediaStream, mimeType = "video/webm;codecs=vp9,opus"): void {
    if (state.value === "recording") return;
    const finalMime = MediaRecorder.isTypeSupported(mimeType)
      ? mimeType
      : "video/webm";
    recorder = new MediaRecorder(stream, { mimeType: finalMime });
    chunks = [];
    lastBlob.value = null;

    recorder.addEventListener("dataavailable", (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    });
    recorder.addEventListener("stop", () => {
      lastBlob.value = new Blob(chunks, { type: finalMime });
      state.value = "stopped";
      if (tickHandle) clearInterval(tickHandle);
      tickHandle = null;
    });

    recorder.start(1000); // 1s timeslice
    startAt = performance.now();
    elapsedMs.value = 0;
    tickHandle = setInterval(() => {
      elapsedMs.value = performance.now() - startAt;
    }, 200);
    state.value = "recording";
  }

  function pause(): void {
    recorder?.pause();
    state.value = "paused";
  }
  function resume(): void {
    recorder?.resume();
    state.value = "recording";
  }
  function stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!recorder || state.value === "idle") {
        resolve(null);
        return;
      }
      recorder.addEventListener(
        "stop",
        () => resolve(lastBlob.value),
        { once: true },
      );
      recorder.stop();
    });
  }

  onScopeDispose(() => {
    if (recorder && recorder.state !== "inactive") recorder.stop();
    if (tickHandle) clearInterval(tickHandle);
  });

  return { state, lastBlob, elapsedMs, start, pause, resume, stop };
}
