/**
 * commoncast / studio-engine / layouts
 *
 * Layouts are pure functions: given a canvas size and a feed count, return a
 * list of rects (one per feed). No Pixi, no DOM. Trivially unit-testable.
 */

import type { LayoutId, Rect } from "../types.js";

const pad = 12;

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

export function computeLayout(
  id: LayoutId,
  width: number,
  height: number,
  feedCount: number,
): Rect[] {
  if (feedCount === 0) return [];
  switch (id) {
    case "solo":
      return [{ x: pad, y: pad, width: width - pad * 2, height: height - pad * 2 }];
    case "split":
      return split(width, height, 2, 1).slice(0, feedCount);
    case "grid":
      return split(width, height, 2, 2).slice(0, feedCount);
    case "speaker": {
      // 2.5fr main left, 1fr stacked right
      const mainW = ((width - pad * 3) * 2.5) / 3.5;
      const sideW = (width - pad * 3) - mainW;
      const halfH = (height - pad * 3) / 2;
      const rects: Rect[] = [
        { x: pad, y: pad, width: mainW, height: height - pad * 2 },
        { x: pad * 2 + mainW, y: pad, width: sideW, height: halfH },
        { x: pad * 2 + mainW, y: pad * 2 + halfH, width: sideW, height: halfH },
      ];
      return rects.slice(0, feedCount);
    }
    case "sidebar": {
      const mainW = ((width - pad * 3) * 2.2) / 3.2;
      const sideW = (width - pad * 3) - mainW;
      const halfH = (height - pad * 3) / 2;
      const rects: Rect[] = [
        { x: pad, y: pad, width: mainW, height: height - pad * 2 },
        { x: pad * 2 + mainW, y: pad, width: sideW, height: halfH },
        { x: pad * 2 + mainW, y: pad * 2 + halfH, width: sideW, height: halfH },
      ];
      return rects.slice(0, feedCount);
    }
    case "pip": {
      const main: Rect = { x: pad, y: pad, width: width - pad * 2, height: height - pad * 2 };
      if (feedCount === 1) return [main];
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
