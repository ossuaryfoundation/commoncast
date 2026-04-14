/**
 * Tailwind v4 preset for commoncast.
 *
 * Tailwind v4 is CSS-first (`@theme` in CSS), but we still expose a small TS
 * preset so consumers can import a single thing and get everything wired.
 *
 * Usage from apps/web:
 *
 *   // app.css (or wherever Tailwind is imported)
 *   @import "tailwindcss";
 *   @import "@commoncast/design-system/tokens.css";
 *   @import "@commoncast/design-system/src/theme.css";
 *
 * The TS export below is provided for tooling that wants to read the token
 * names programmatically (e.g. editor autocomplete, codegen).
 */

import { tokens } from "./tokens/tokens.js";

export const designSystemPreset = {
  tokens,
  fontFamilies: tokens.font,
} as const;

export default designSystemPreset;
