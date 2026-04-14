/**
 * useTimecode — running HH:MM:SS display.
 */
import { ref, onScopeDispose } from "vue";

export function useTimecode() {
  const value = ref("00:00:00");
  const running = ref(false);
  let startAt = 0;
  let handle: ReturnType<typeof setInterval> | null = null;

  function fmt(ms: number): string {
    const s = Math.floor(ms / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  function start() {
    if (running.value) return;
    running.value = true;
    startAt = performance.now();
    handle = setInterval(() => {
      value.value = fmt(performance.now() - startAt);
    }, 250);
  }
  function stop() {
    running.value = false;
    if (handle) clearInterval(handle);
    handle = null;
    value.value = "00:00:00";
  }

  onScopeDispose(stop);
  return { value, running, start, stop };
}
