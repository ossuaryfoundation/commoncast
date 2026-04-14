/**
 * Pinia / studio — durable, JSON-serializable studio state.
 *
 * Holds scenes, layouts, overlays, brand, active scene. Does NOT hold any
 * live MediaStream / RTCPeerConnection / engine handle — those live in
 * composables with shallowRef. See CLAUDE.md §3.
 */
import { defineStore } from "pinia";
import type { LayoutId } from "@commoncast/design-system";

export interface Scene {
  id: string;
  index: number;
  name: string;
  shortcut: string;
  layout: LayoutId;
  overlays: {
    logo: boolean;
    lowerThird: boolean;
    ticker: boolean;
  };
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

export const useStudioStore = defineStore("studio", {
  state: () => ({
    studioId: "default",
    title: "Open Source Streaming Workshop",
    activeLayout: "grid" as LayoutId,
    activeSceneId: "panel",
    scenes: [
      {
        id: "intro",
        index: 1,
        name: "Intro",
        shortcut: "F1",
        layout: "solo" as LayoutId,
        overlays: { logo: true, lowerThird: false, ticker: false },
      },
      {
        id: "panel",
        index: 2,
        name: "Panel",
        shortcut: "F2",
        layout: "grid" as LayoutId,
        overlays: { logo: true, lowerThird: true, ticker: false },
      },
      {
        id: "interview",
        index: 3,
        name: "Interview",
        shortcut: "F3",
        layout: "speaker" as LayoutId,
        overlays: { logo: true, lowerThird: true, ticker: false },
      },
      {
        id: "screenshare",
        index: 4,
        name: "Screen Share",
        shortcut: "F4",
        layout: "split" as LayoutId,
        overlays: { logo: true, lowerThird: false, ticker: false },
      },
      {
        id: "outro",
        index: 5,
        name: "Outro",
        shortcut: "F5",
        layout: "solo" as LayoutId,
        overlays: { logo: true, lowerThird: false, ticker: true },
      },
    ] as Scene[],
    overlays: {
      logo: true,
      lowerThird: true,
      ticker: false,
    },
    brand: {
      accent: "#D94250",
      logoText: "commoncast",
      lowerName: "Moheeb Zara",
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
  },
  actions: {
    setScene(id: string) {
      const scene = this.scenes.find((s) => s.id === id);
      if (!scene) return;
      this.activeSceneId = id;
      this.activeLayout = scene.layout;
      this.overlays = { ...scene.overlays };
    },
    setLayout(layout: LayoutId) {
      this.activeLayout = layout;
    },
    setOverlay(key: keyof typeof this.overlays, value: boolean) {
      this.overlays[key] = value;
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
