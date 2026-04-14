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
import { computeLayout } from "./layouts/index.js";
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
  //   background -> feeds -> overlays
  const background = new Graphics();
  const feedsLayer = new Container();
  const overlaysLayer = new Container();

  const sources = new Map<SourceId, MountedSource>();
  let currentScene: Scene | null = null;

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

    app.stage.addChild(background, feedsLayer, overlaysLayer);

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

    // Rebuild feeds layer according to layout.
    feedsLayer.removeChildren();
    const rects = computeLayout(
      scene.layout,
      settings.width,
      settings.height,
      scene.feeds.length,
    );
    scene.feeds.forEach((sourceId, i) => {
      const mounted = sources.get(sourceId);
      const rect = rects[i];
      if (!mounted || !rect) return;
      mounted.sprite.x = rect.x;
      mounted.sprite.y = rect.y;
      mounted.sprite.width = rect.width;
      mounted.sprite.height = rect.height;
      feedsLayer.addChild(mounted.sprite);
    });

    // Rebuild overlays layer.
    overlaysLayer.removeChildren();
    for (const overlay of scene.overlays) {
      if (!overlay.visible) continue;
      const node = createOverlayNode(overlay, settings);
      if (node) overlaysLayer.addChild(node);
    }
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
