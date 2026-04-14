/**
 * commoncast / studio-engine / types
 *
 * Data model for scenes, layers and sources. Discriminated unions (`kind`) so
 * renderers can exhaustively switch and TypeScript will complain when a new
 * source type is added but not handled.
 */

// Branded IDs — prevent mixing up sceneId / layerId / sourceId in call sites.
export type SourceId = string & { readonly __brand: "SourceId" };
export type LayerId = string & { readonly __brand: "LayerId" };
export type SceneId = string & { readonly __brand: "SceneId" };

export const asSourceId = (s: string): SourceId => s as SourceId;
export const asLayerId = (s: string): LayerId => s as LayerId;
export const asSceneId = (s: string): SceneId => s as SceneId;

export type LayoutId =
  | "solo"
  | "split"
  | "grid"
  | "speaker"
  | "sidebar"
  | "pip";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---- sources ----------------------------------------------------------

export interface CameraSourceSpec {
  kind: "camera";
  id: SourceId;
  name: string;
  /** Live video track (MediaStreamTrack kind === 'video'). */
  track: MediaStreamTrack;
}

export interface ImageSourceSpec {
  kind: "image";
  id: SourceId;
  name: string;
  url: string;
}

export interface TextSourceSpec {
  kind: "text";
  id: SourceId;
  name: string;
  text: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
}

export type SourceSpec = CameraSourceSpec | ImageSourceSpec | TextSourceSpec;

// ---- overlays ---------------------------------------------------------

export interface LogoOverlaySpec {
  kind: "logo";
  visible: boolean;
  text: string;
  accent: string;
}

export interface LowerThirdOverlaySpec {
  kind: "lowerThird";
  visible: boolean;
  name: string;
  subtitle: string;
  accent: string;
}

export interface TickerOverlaySpec {
  kind: "ticker";
  visible: boolean;
  text: string;
  accent: string;
}

/**
 * Transient "feature on stream" chat banner. Rendered at the top of the
 * frame with the commenter's name + their message body, tinted by the
 * studio accent. The caller is responsible for driving visibility
 * (the compositor has no internal timer) — typically the chat composable
 * on the host schedules an auto-hide a few seconds after featuring.
 */
export interface ChatBannerOverlaySpec {
  kind: "chatBanner";
  visible: boolean;
  name: string;
  text: string;
  /** Origin platform tag — rendered as a small pill when present. */
  platform?: "commoncast" | "youtube" | "twitch";
  accent: string;
}

export type OverlaySpec =
  | LogoOverlaySpec
  | LowerThirdOverlaySpec
  | TickerOverlaySpec
  | ChatBannerOverlaySpec;

// ---- scene ------------------------------------------------------------

export interface Scene {
  id: SceneId;
  name: string;
  layout: LayoutId;
  /**
   * Sparse slot assignment. `feeds[i]` is the source bound to slot i of
   * the layout, or null if the slot is empty. Length should equal the
   * layout's slot count (see LAYOUT_SLOT_COUNT in ./layouts); shorter is
   * padded with null, longer is ignored.
   */
  feeds: ReadonlyArray<SourceId | null>;
  overlays: ReadonlyArray<OverlaySpec>;
  background?: string;
}

// ---- render settings --------------------------------------------------

export interface CompositorSettings {
  width: number;
  height: number;
  fps: number;
  background: string;
}

export const DEFAULT_SETTINGS: CompositorSettings = {
  width: 1920,
  height: 1080,
  fps: 30,
  background: "#1c1b1a",
};
