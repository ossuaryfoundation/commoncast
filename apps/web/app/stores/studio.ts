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

/** Slugify + de-dupe a name into a scene id that's stable-ish and URL-safe. */
function makeSceneId(existing: ReadonlyArray<{ id: string }>, name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "scene";
  const used = new Set(existing.map((s) => s.id));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
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
    /**
     * Append a new scene. `name` is required; `layout` defaults to grid.
     * Overlays default to logo-on / others-off so the scene doesn't
     * inherit anything unexpected from its neighbours.
     */
    addScene(opts: { name: string; layout?: LayoutId }): Scene {
      const id = makeSceneId(this.scenes, opts.name);
      const scene: Scene = {
        id,
        index: this.scenes.length + 1,
        name: opts.name.trim() || `Scene ${this.scenes.length + 1}`,
        shortcut: this.scenes.length < 5 ? `F${this.scenes.length + 1}` : "",
        layout: opts.layout ?? "grid",
        feeds: emptyFeeds(opts.layout ?? "grid"),
        overlays: { logo: true, lowerThird: false, ticker: false },
      };
      this.scenes = [...this.scenes, scene];
      // New scenes pick up whatever sources are already mounted in other
      // scenes so they aren't blank on first select.
      const referenced = new Set<string>();
      for (const existing of this.scenes) {
        for (const f of existing.feeds) if (f) referenced.add(f);
      }
      for (const sourceId of referenced) {
        const empty = scene.feeds.findIndex((f) => f == null);
        if (empty < 0) break;
        scene.feeds[empty] = sourceId;
      }
      return scene;
    },
    /**
     * Duplicate a scene. The copy is inserted immediately after its
     * source and becomes the active scene. Feeds are carried over.
     */
    duplicateScene(id: string): Scene | null {
      const idx = this.scenes.findIndex((s) => s.id === id);
      if (idx < 0) return null;
      const src = this.scenes[idx]!;
      const copy: Scene = {
        id: makeSceneId(this.scenes, `${src.name} copy`),
        index: idx + 2,
        name: `${src.name} copy`,
        shortcut: "",
        layout: src.layout,
        feeds: [...src.feeds],
        overlays: { ...src.overlays },
      };
      const next = [...this.scenes];
      next.splice(idx + 1, 0, copy);
      this.scenes = next;
      this.reindexScenes();
      this.activeSceneId = copy.id;
      return copy;
    },
    renameScene(id: string, name: string): void {
      const scene = this.scenes.find((s) => s.id === id);
      if (!scene) return;
      const next = name.trim();
      if (!next) return;
      scene.name = next;
    },
    /**
     * Remove a scene. Refuses to remove the final scene (studio must
     * always have at least one) and auto-picks a new active scene if
     * the deleted one was active.
     */
    removeScene(id: string): void {
      if (this.scenes.length <= 1) return;
      const idx = this.scenes.findIndex((s) => s.id === id);
      if (idx < 0) return;
      const nextScenes = this.scenes.filter((s) => s.id !== id);
      this.scenes = nextScenes;
      this.reindexScenes();
      if (this.activeSceneId === id) {
        // Prefer the scene that used to sit at the same index; fall
        // back to the last scene if we deleted the tail.
        const fallback = nextScenes[Math.min(idx, nextScenes.length - 1)];
        this.activeSceneId = fallback?.id ?? nextScenes[0]!.id;
      }
    },
    /**
     * Reassign `.index` to match array position (1-based) and rebuild
     * the default F1-F5 shortcut mapping for the first five scenes.
     */
    reindexScenes(): void {
      const next = this.scenes.map((scene, i) => ({
        ...scene,
        index: i + 1,
        // Keep custom (non F1-F5) shortcuts as-is; refresh default ones
        // to match the new position.
        shortcut:
          scene.shortcut && !/^F[1-5]$/.test(scene.shortcut)
            ? scene.shortcut
            : i < 5
              ? `F${i + 1}`
              : "",
      }));
      this.scenes = next;
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
