/**
 * Pinia / studio — durable, JSON-serializable studio state.
 *
 * Holds scenes (with per-scene slot assignments + overlays), brand, and the
 * active scene. Does NOT hold any live MediaStream / RTCPeerConnection /
 * engine handle — those live in composables with shallowRef. See CLAUDE.md §3.
 */
import { defineStore } from "pinia";
import { getSlotCount, type LayoutId } from "@commoncast/studio-engine";

export type OverlayKey = "logo" | "lowerThird" | "ticker";

export interface SceneOverlays {
  logo: boolean;
  lowerThird: boolean;
  ticker: boolean;
}

export interface Scene {
  id: string;
  index: number;
  name: string;
  shortcut: string;
  layout: LayoutId;
  /**
   * Sparse slot assignment for this scene. `feeds[i]` is either a source id
   * (by string) bound to slot i of the current layout, or null. Length
   * always equals `getSlotCount(layout)` — grows/shrinks when the layout
   * changes via `setSceneLayout`.
   */
  feeds: (string | null)[];
  overlays: SceneOverlays;
}

export interface Brand {
  accent: string;
  logoText: string;
  lowerName: string;
  lowerSubtitle: string;
  tickerText: string;
}

const PRESET_ACCENTS = [
  "#D94250",
  "#22A559",
  "#3B82CE",
  "#9333EA",
  "#F59E0B",
  "#0D9488",
] as const;

function emptyFeeds(layout: LayoutId): (string | null)[] {
  return Array.from({ length: getSlotCount(layout) }, () => null);
}

function defaultScenes(): Scene[] {
  const s = (
    id: string,
    index: number,
    name: string,
    shortcut: string,
    layout: LayoutId,
    overlays: SceneOverlays,
  ): Scene => ({
    id,
    index,
    name,
    shortcut,
    layout,
    feeds: emptyFeeds(layout),
    overlays,
  });
  return [
    s("intro", 1, "Intro", "F1", "solo", { logo: true, lowerThird: false, ticker: false }),
    s("panel", 2, "Panel", "F2", "grid", { logo: true, lowerThird: true, ticker: false }),
    s("interview", 3, "Interview", "F3", "speaker", { logo: true, lowerThird: true, ticker: false }),
    s("screenshare", 4, "Screen Share", "F4", "sidebar", { logo: true, lowerThird: false, ticker: false }),
    s("outro", 5, "Outro", "F5", "solo", { logo: true, lowerThird: false, ticker: true }),
  ];
}

export const useStudioStore = defineStore("studio", {
  state: () => ({
    studioId: "default",
    title: "Open Source Streaming Workshop",
    activeSceneId: "panel",
    scenes: defaultScenes(),
    brand: {
      accent: "#D94250",
      logoText: "commoncast",
      lowerName: "Host",
      lowerSubtitle: "Open Source Streaming",
      tickerText: "BROADCASTING FOR THE COMMONS · COMMONCAST · OPEN SOURCE LIVE PRODUCTION",
    } as Brand,
    accentPalette: PRESET_ACCENTS,
    isLive: false,
    isRecording: false,
  }),
  getters: {
    activeScene: (s): Scene | null =>
      s.scenes.find((sc) => sc.id === s.activeSceneId) ?? null,
    /** Back-compat shim for places that still read activeLayout directly. */
    activeLayout(): LayoutId {
      return this.activeScene?.layout ?? "grid";
    },
  },
  actions: {
    setScene(id: string) {
      const scene = this.scenes.find((s) => s.id === id);
      if (!scene) return;
      this.activeSceneId = id;
    },
    /** Change the layout of a specific scene and resize its feeds array. */
    setSceneLayout(sceneId: string, layout: LayoutId) {
      const scene = this.scenes.find((s) => s.id === sceneId);
      if (!scene) return;
      scene.layout = layout;
      const target = getSlotCount(layout);
      const next = emptyFeeds(layout);
      for (let i = 0; i < Math.min(scene.feeds.length, target); i++) {
        next[i] = scene.feeds[i] ?? null;
      }
      scene.feeds = next;
    },
    /** Convenience: set the active scene's layout. */
    setLayout(layout: LayoutId) {
      if (!this.activeSceneId) return;
      this.setSceneLayout(this.activeSceneId, layout);
    },
    /** Assign (or clear, when sourceId is null) a slot on a specific scene. */
    assignSlot(sceneId: string, slotIndex: number, sourceId: string | null) {
      const scene = this.scenes.find((s) => s.id === sceneId);
      if (!scene) return;
      if (slotIndex < 0 || slotIndex >= scene.feeds.length) return;
      // If this source is already bound elsewhere on this scene, clear it
      // first so the same source never occupies two slots at once.
      if (sourceId != null) {
        for (let i = 0; i < scene.feeds.length; i++) {
          if (scene.feeds[i] === sourceId) scene.feeds[i] = null;
        }
      }
      scene.feeds[slotIndex] = sourceId;
    },
    /**
     * When a new source (local camera, remote peer, screen share) becomes
     * available, drop it into the first empty slot of every scene that
     * doesn't already reference it. Existing assignments are preserved.
     */
    autoAssignSource(sourceId: string) {
      for (const scene of this.scenes) {
        if (scene.feeds.includes(sourceId)) continue;
        const idx = scene.feeds.findIndex((f) => f == null);
        if (idx >= 0) scene.feeds[idx] = sourceId;
      }
    },
    /** When a source is gone, clear it from every scene's assignments. */
    forgetSource(sourceId: string) {
      for (const scene of this.scenes) {
        for (let i = 0; i < scene.feeds.length; i++) {
          if (scene.feeds[i] === sourceId) scene.feeds[i] = null;
        }
      }
    },
    /** Toggle a per-scene overlay on the active scene. */
    setOverlay(key: OverlayKey, value: boolean) {
      if (!this.activeScene) return;
      this.activeScene.overlays[key] = value;
    },
    setAccent(color: string) {
      this.brand.accent = color;
    },
    goLive() {
      this.isLive = !this.isLive;
    },
    toggleRecording() {
      this.isRecording = !this.isRecording;
    },
  },
});
