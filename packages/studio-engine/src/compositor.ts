/**
 * commoncast / studio-engine / Compositor
 *
 * The Pixi v8 compositor. Owns the canvas, the Pixi Application, and the live
 * scene graph. Consumers (Vue layer) only call the facade methods below — they
 * never touch Pixi primitives directly.
 *
 * Responsibilities:
 *   - mount a Pixi Application into an existing <canvas>
 *   - accept scenes via `setScene()`
 *   - manage source textures (camera / image / text)
 *   - draw overlays (logo, lower third, ticker) on top
 *   - expose the composited output as a MediaStreamTrack via getOutputTrack()
 *   - clean up everything in `destroy()`
 *
 * WebGPU is preferred; Pixi v8 auto-falls-back to WebGL2 when WebGPU isn't
 * available.
 *
 * NOTE: this file deliberately does NOT import vue. See CLAUDE.md §3.
 */

import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
} from "pixi.js";
import { computeSlots, getSlotCount } from "./layouts/index.js";
import { createCameraSource, type CameraSourceHandle } from "./sources/CameraSource.js";
import {
  DEFAULT_SETTINGS,
  type CompositorSettings,
  type LogoOverlaySpec,
  type LowerThirdOverlaySpec,
  type OverlaySpec,
  type Scene,
  type SourceId,
  type SourceSpec,
  type TickerOverlaySpec,
} from "./types.js";

export interface Compositor {
  readonly canvas: HTMLCanvasElement;
  readonly settings: CompositorSettings;
  init(): Promise<void>;
  addSource(source: SourceSpec): Promise<void>;
  removeSource(id: SourceId): void;
  setScene(scene: Scene): void;
  /**
   * Mark a source as currently speaking (or not). When a source is in
   * the active scene's feeds, a pulsing live-green stroke is drawn over
   * its slot rect. Completely idempotent; cheap enough to call at 60Hz.
   */
  updateSourceSpeaking(id: SourceId, speaking: boolean): void;
  getOutputTrack(): MediaStreamTrack | null;
  getOutputStream(): MediaStream | null;
  destroy(): void;
}

interface MountedSource {
  spec: SourceSpec;
  sprite: Sprite | Text;
  /** For camera sources, the HTMLVideoElement that backs the texture. */
  camera?: CameraSourceHandle;
}

export interface CreateCompositorOptions {
  canvas: HTMLCanvasElement;
  settings?: Partial<CompositorSettings>;
}

export function createCompositor(opts: CreateCompositorOptions): Compositor {
  const settings: CompositorSettings = { ...DEFAULT_SETTINGS, ...opts.settings };
  const canvas = opts.canvas;

  const app = new Application();
  let initialized = false;
  let destroyed = false;

  // Scene graph layers (z-order matters):
  //   background -> feeds -> speaking rings -> overlays
  const background = new Graphics();
  const feedsLayer = new Container();
  const speakingLayer = new Container();
  const overlaysLayer = new Container();

  const sources = new Map<SourceId, MountedSource>();
  let currentScene: Scene | null = null;

  // Sources currently flagged as "speaking". We keep this as a Set
  // (source identity) rather than a map of rings because the ring's
  // rect is derived from the current scene — scene changes rebuild the
  // rings from this set. This way, toggling speaking in the middle of
  // a scene recompute is cheap and idempotent.
  const speaking = new Set<SourceId>();
  const speakingRings = new Map<SourceId, Graphics>();

  // Output track cache — canvas.captureStream is stable per-canvas, so we
  // create one stream and reuse its track.
  let outputStream: MediaStream | null = null;

  async function init(): Promise<void> {
    if (initialized) return;
    await app.init({
      canvas,
      width: settings.width,
      height: settings.height,
      background: settings.background,
      antialias: true,
      // Pixi v8 auto-picks WebGPU when available and falls back to WebGL2.
      preference: "webgpu",
    } satisfies Parameters<Application["init"]>[0]);

    background
      .rect(0, 0, settings.width, settings.height)
      .fill({ color: settings.background });

    app.stage.addChild(background, feedsLayer, speakingLayer, overlaysLayer);

    // canvas.captureStream is available on HTMLCanvasElement.
    // Pixi's canvas IS an HTMLCanvasElement (not an OffscreenCanvas) because
    // we passed one in explicitly above.
    outputStream = canvas.captureStream(settings.fps);

    initialized = true;
  }

  async function addSource(source: SourceSpec): Promise<void> {
    if (!initialized) throw new Error("Compositor.addSource called before init()");
    if (sources.has(source.id)) return;

    switch (source.kind) {
      case "camera": {
        const camera = createCameraSource(source.track);
        await camera.start();
        const texture = Texture.from(camera.video);
        const sprite = new Sprite(texture);
        sprite.anchor.set(0); // top-left origin — layout gives us top-left rects
        sources.set(source.id, { spec: source, sprite, camera });
        break;
      }
      case "image": {
        const texture = (await Assets.load(source.url)) as Texture;
        const sprite = new Sprite(texture);
        sources.set(source.id, { spec: source, sprite });
        break;
      }
      case "text": {
        const text = new Text({
          text: source.text,
          style: {
            fontFamily: source.fontFamily ?? "Outfit, sans-serif",
            fontSize: source.fontSize ?? 48,
            fill: source.color ?? "#f4f2ef",
          },
        });
        sources.set(source.id, { spec: source, sprite: text });
        break;
      }
    }
    // Re-layout if this source is part of the current scene.
    if (currentScene && currentScene.feeds.includes(source.id)) {
      applyScene(currentScene);
    }
  }

  function removeSource(id: SourceId): void {
    const mounted = sources.get(id);
    if (!mounted) return;
    mounted.camera?.stop();
    mounted.sprite.destroy({ children: true });
    sources.delete(id);
    if (currentScene && currentScene.feeds.includes(id)) {
      applyScene(currentScene);
    }
  }

  function applyScene(scene: Scene): void {
    currentScene = scene;

    // Rebuild feeds layer from sparse slot assignments.
    feedsLayer.removeChildren();
    const slotCount = getSlotCount(scene.layout);
    const rects = computeSlots(scene.layout, settings.width, settings.height);
    for (let i = 0; i < slotCount; i++) {
      const rect = rects[i];
      const sourceId = scene.feeds[i] ?? null;
      if (!rect || !sourceId) continue;
      const mounted = sources.get(sourceId);
      if (!mounted) continue;
      mounted.sprite.x = rect.x;
      mounted.sprite.y = rect.y;
      mounted.sprite.width = rect.width;
      mounted.sprite.height = rect.height;
      feedsLayer.addChild(mounted.sprite);
    }

    // Rebuild the speaking-ring layer for any source currently flagged
    // as speaking AND present in this scene's feeds.
    rebuildSpeakingRings();

    // Rebuild overlays layer.
    overlaysLayer.removeChildren();
    for (const overlay of scene.overlays) {
      if (!overlay.visible) continue;
      const node = createOverlayNode(overlay, settings);
      if (node) overlaysLayer.addChild(node);
    }
  }

  function rebuildSpeakingRings(): void {
    // Tear down all existing rings; rebuild from `speaking` set.
    for (const ring of speakingRings.values()) ring.destroy();
    speakingRings.clear();
    speakingLayer.removeChildren();
    if (!currentScene) return;
    const rects = computeSlots(
      currentScene.layout,
      settings.width,
      settings.height,
    );
    const slotCount = getSlotCount(currentScene.layout);
    for (let i = 0; i < slotCount; i++) {
      const sourceId = currentScene.feeds[i] ?? null;
      if (!sourceId) continue;
      if (!speaking.has(sourceId)) continue;
      const rect = rects[i];
      if (!rect) continue;
      const ring = buildSpeakingRing(rect);
      speakingLayer.addChild(ring);
      speakingRings.set(sourceId, ring);
    }
  }

  function updateSourceSpeaking(id: SourceId, isSpeaking: boolean): void {
    if (isSpeaking) {
      if (speaking.has(id)) return;
      speaking.add(id);
    } else {
      if (!speaking.has(id)) return;
      speaking.delete(id);
    }
    // Fast path: add/remove a single ring without rebuilding the layer.
    if (!currentScene) return;
    const rects = computeSlots(
      currentScene.layout,
      settings.width,
      settings.height,
    );
    const slotCount = getSlotCount(currentScene.layout);
    for (let i = 0; i < slotCount; i++) {
      if (currentScene.feeds[i] !== id) continue;
      const rect = rects[i];
      if (!rect) return;
      const existing = speakingRings.get(id);
      if (isSpeaking) {
        if (existing) return;
        const ring = buildSpeakingRing(rect);
        speakingLayer.addChild(ring);
        speakingRings.set(id, ring);
      } else {
        if (!existing) return;
        existing.destroy();
        speakingRings.delete(id);
      }
      return;
    }
  }

  function buildSpeakingRing(rect: { x: number; y: number; width: number; height: number }): Graphics {
    // 3px live-green stroke inset 1px from the slot so it sits on top
    // of the source sprite without clipping outside the slot.
    const inset = 2;
    return new Graphics()
      .rect(rect.x + inset, rect.y + inset, rect.width - inset * 2, rect.height - inset * 2)
      .stroke({ color: 0x22a559, width: 3, alignment: 1 });
  }

  function setScene(scene: Scene): void {
    if (!initialized) throw new Error("Compositor.setScene called before init()");
    applyScene(scene);
  }

  function getOutputTrack(): MediaStreamTrack | null {
    return outputStream?.getVideoTracks()[0] ?? null;
  }

  function getOutputStream(): MediaStream | null {
    return outputStream;
  }

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;

    for (const [, mounted] of sources) {
      mounted.camera?.stop();
      mounted.sprite.destroy({ children: true });
    }
    sources.clear();

    outputStream?.getTracks().forEach((t) => t.stop());
    outputStream = null;

    // Pixi v8 destroy signature
    app.destroy(true, { children: true, texture: true });
  }

  return {
    canvas,
    settings,
    init,
    addSource,
    removeSource,
    setScene,
    updateSourceSpeaking,
    getOutputTrack,
    getOutputStream,
    destroy,
  };
}

// ---- overlays --------------------------------------------------------------

function createOverlayNode(
  overlay: OverlaySpec,
  settings: CompositorSettings,
): Container | null {
  switch (overlay.kind) {
    case "logo":
      return createLogoNode(overlay, settings);
    case "lowerThird":
      return createLowerThirdNode(overlay, settings);
    case "ticker":
      return createTickerNode(overlay, settings);
  }
}

function createLogoNode(spec: LogoOverlaySpec, settings: CompositorSettings): Container {
  const c = new Container();
  const bg = new Graphics()
    .roundRect(0, 0, 180, 36, 2)
    .fill({ color: 0x1c1b1a, alpha: 0.75 });
  const dot = new Graphics().circle(16, 18, 5).fill({ color: spec.accent });
  const label = new Text({
    text: spec.text.toUpperCase(),
    style: {
      fontFamily: "DM Mono, monospace",
      fontSize: 12,
      fill: "#f4f2ef",
      letterSpacing: 1.5,
    },
  });
  label.x = 30;
  label.y = 10;
  c.addChild(bg, dot, label);
  c.x = settings.width - 180 - 24;
  c.y = 24;
  return c;
}

function createLowerThirdNode(
  spec: LowerThirdOverlaySpec,
  settings: CompositorSettings,
): Container {
  const c = new Container();
  const accentBar = new Graphics().rect(0, 0, 4, 72).fill({ color: spec.accent });
  const panel = new Graphics()
    .rect(4, 0, 420, 72)
    .fill({ color: 0x1c1b1a, alpha: 0.78 });
  const name = new Text({
    text: spec.name,
    style: {
      fontFamily: "Outfit, sans-serif",
      fontSize: 22,
      fontWeight: "700",
      fill: "#f4f2ef",
    },
  });
  name.x = 20;
  name.y = 12;
  const sub = new Text({
    text: spec.subtitle.toUpperCase(),
    style: {
      fontFamily: "DM Mono, monospace",
      fontSize: 11,
      fill: "#c8c5c1",
      letterSpacing: 1.2,
    },
  });
  sub.x = 20;
  sub.y = 44;
  c.addChild(accentBar, panel, name, sub);
  c.x = 32;
  c.y = settings.height - 72 - 48;
  return c;
}

function createTickerNode(
  spec: TickerOverlaySpec,
  settings: CompositorSettings,
): Container {
  const c = new Container();
  const bg = new Graphics()
    .rect(0, 0, settings.width, 36)
    .fill({ color: spec.accent });
  const text = new Text({
    text: spec.text,
    style: {
      fontFamily: "DM Mono, monospace",
      fontSize: 14,
      fill: "#ffffff",
      letterSpacing: 2,
    },
  });
  text.x = 24;
  text.y = 9;
  c.addChild(bg, text);
  c.y = settings.height - 36;
  return c;
}
