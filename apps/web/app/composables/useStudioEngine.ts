/**
 * useStudioEngine — mounts the Pixi compositor into a <canvas> ref.
 *
 * The engine handle lives in a shallowRef so Vue never proxies the Pixi graph.
 * Callers get a small imperative facade (addSource, removeSource, setScene,
 * getOutputTrack) plus a ready flag.
 */
import { onScopeDispose, shallowRef, watch, type Ref, type ShallowRef } from "vue";
import {
  createCompositor,
  type Compositor,
  type CompositorSettings,
  type Scene,
  type SourceSpec,
  type SourceId,
} from "@commoncast/studio-engine";

export interface UseStudioEngineReturn {
  readonly compositor: Readonly<ShallowRef<Compositor | null>>;
  readonly ready: Readonly<ShallowRef<boolean>>;
  addSource(spec: SourceSpec): Promise<void>;
  removeSource(id: SourceId): void;
  setScene(scene: Scene): void;
  getOutputTrack(): MediaStreamTrack | null;
  getOutputStream(): MediaStream | null;
}

export function useStudioEngine(
  canvasRef: Ref<HTMLCanvasElement | null>,
  settings?: Partial<CompositorSettings>,
): UseStudioEngineReturn {
  const compositor = shallowRef<Compositor | null>(null);
  const ready = shallowRef(false);

  const stop = watch(
    canvasRef,
    async (el) => {
      if (!el || compositor.value) return;
      const c = createCompositor({ canvas: el, settings });
      await c.init();
      compositor.value = c;
      ready.value = true;
    },
    { immediate: true },
  );

  function destroy() {
    stop();
    compositor.value?.destroy();
    compositor.value = null;
    ready.value = false;
  }

  onScopeDispose(destroy);

  if (import.meta.hot) {
    import.meta.hot.dispose(() => destroy());
  }

  return {
    compositor,
    ready,
    async addSource(spec) {
      await compositor.value?.addSource(spec);
    },
    removeSource(id) {
      compositor.value?.removeSource(id);
    },
    setScene(scene) {
      compositor.value?.setScene(scene);
    },
    getOutputTrack() {
      return compositor.value?.getOutputTrack() ?? null;
    },
    getOutputStream() {
      return compositor.value?.getOutputStream() ?? null;
    },
  };
}
