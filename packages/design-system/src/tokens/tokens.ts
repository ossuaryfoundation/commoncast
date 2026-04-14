/**
 * commoncast — design tokens (TypeScript mirror)
 *
 * Mirror of tokens.css. PixiJS and anything that renders to canvas must read
 * tokens from here because CSS custom properties aren't visible inside shaders
 * or OffscreenCanvas contexts.
 *
 * Keep this file in sync with tokens.css. The diff-test at
 * ../../tests/tokens-sync.test.ts will fail if they drift.
 */

export const tokens = {
  color: {
    chalk: "#F4F2EF",
    chalkWarm: "#ECEAE6",
    chalkCool: "#E3E1DC",
    chalkDeep: "#D5D2CC",
    soot: "#1C1B1A",
    sootMid: "#3A3835",
    sootSoft: "#52504D",

    ink: "#1C1B1A",
    inkSoft: "#4A4845",
    inkMuted: "#7A7774",
    inkGhost: "#A8A5A1",
    inkWhisper: "#C8C5C1",

    signal: "#D94250",
    signalHover: "#C43A47",
    signalStrong: "#B52D3A",

    live: "#22A559",
    caution: "#D4940A",
    info: "#3B82CE",
    offline: "#A8A5A1",

    clasp: "#00B89F",
    pixi: "#A855F7",
    lvqr: "#F59E0B",
    webrtc: "#3B82F6",
  },
  font: {
    display: '"Outfit", system-ui, sans-serif',
    body: '"Source Sans 3", system-ui, sans-serif',
    ui: '"DM Mono", ui-monospace, monospace',
    code: '"Fira Code", ui-monospace, monospace',
  },
  text: {
    "4xl": 48,
    "3xl": 34,
    "2xl": 26,
    xl: 20,
    lg: 16,
    base: 14,
    sm: 13,
    xs: 11,
    "2xs": 9,
  },
  leading: {
    tight: 1.15,
    snug: 1.3,
    normal: 1.55,
  },
  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
  },
  radius: {
    sm: 2,
    md: 3,
  },
  motion: {
    easeSnappy: "cubic-bezier(0.22, 1, 0.36, 1)",
    easeSmooth: "cubic-bezier(0.4, 0, 0.2, 1)",
    durFast: 100,
    durMed: 200,
  },
} as const;

export type Tokens = typeof tokens;
export type ColorToken = keyof Tokens["color"];
