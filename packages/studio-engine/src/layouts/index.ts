/**
 * commoncast / studio-engine / layouts
 *
 * Layouts are pure functions. Each layout has a fixed slot count — the UI
 * assigns one source per slot, rather than pouring a flat feed list into
 * whatever layout happens to be active. `computeSlots` returns the full rect
 * list for a layout (length = LAYOUT_SLOT_COUNT[layoutId]); `computeLayout`
 * is kept as a feed-count-truncating convenience for callers that still
 * want the old shape. No Pixi, no DOM. Trivially unit-testable.
 */

import type { LayoutId, Rect } from "../types.js";

const pad = 12;

/** Fixed slot count per layout. The UI never shows more slots than this. */
export const LAYOUT_SLOT_COUNT: Record<LayoutId, number> = {
  solo: 1,
  split: 2,
  grid: 4,
  speaker: 3,
  sidebar: 3,
  pip: 2,
};

export function getSlotCount(id: LayoutId): number {
  return LAYOUT_SLOT_COUNT[id];
}

function split(width: number, height: number, cols: number, rows: number): Rect[] {
  const rects: Rect[] = [];
  const cellW = (width - pad * (cols + 1)) / cols;
  const cellH = (height - pad * (rows + 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push({
        x: pad + c * (cellW + pad),
        y: pad + r * (cellH + pad),
        width: cellW,
        height: cellH,
      });
    }
  }
  return rects;
}

/**
 * Return ALL slot rects for a layout at the given canvas size. The returned
 * array's length always equals LAYOUT_SLOT_COUNT[id]. This is what the
 * compositor + the HTML slot overlay both read from.
 */
export function computeSlots(id: LayoutId, width: number, height: number): Rect[] {
  switch (id) {
    case "solo":
      return [{ x: pad, y: pad, width: width - pad * 2, height: height - pad * 2 }];
    case "split":
      return split(width, height, 2, 1);
    case "grid":
      return split(width, height, 2, 2);
    case "speaker": {
      const mainW = ((width - pad * 3) * 2.5) / 3.5;
      const sideW = width - pad * 3 - mainW;
      const halfH = (height - pad * 3) / 2;
      return [
        { x: pad, y: pad, width: mainW, height: height - pad * 2 },
        { x: pad * 2 + mainW, y: pad, width: sideW, height: halfH },
        { x: pad * 2 + mainW, y: pad * 2 + halfH, width: sideW, height: halfH },
      ];
    }
    case "sidebar": {
      const mainW = ((width - pad * 3) * 2.2) / 3.2;
      const sideW = width - pad * 3 - mainW;
      const halfH = (height - pad * 3) / 2;
      return [
        { x: pad, y: pad, width: mainW, height: height - pad * 2 },
        { x: pad * 2 + mainW, y: pad, width: sideW, height: halfH },
        { x: pad * 2 + mainW, y: pad * 2 + halfH, width: sideW, height: halfH },
      ];
    }
    case "pip": {
      const main: Rect = {
        x: pad,
        y: pad,
        width: width - pad * 2,
        height: height - pad * 2,
      };
      const pipW = Math.round(width * 0.22);
      const pipH = Math.round(pipW * (9 / 16));
      const pip: Rect = {
        x: width - pipW - pad * 2,
        y: height - pipH - pad * 2,
        width: pipW,
        height: pipH,
      };
      return [main, pip];
    }
  }
}

/**
 * Legacy API: return the first N slot rects for a layout. Kept for any
 * caller that still wants the dense-feed shape.
 */
export function computeLayout(
  id: LayoutId,
  width: number,
  height: number,
  feedCount: number,
): Rect[] {
  if (feedCount === 0) return [];
  return computeSlots(id, width, height).slice(0, feedCount);
}
