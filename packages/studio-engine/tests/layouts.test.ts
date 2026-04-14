import { describe, it, expect } from "vitest";
import { computeLayout } from "../src/layouts/index.js";

describe("computeLayout", () => {
  it("returns one rect for solo with any feed count >= 1", () => {
    expect(computeLayout("solo", 1920, 1080, 3)).toHaveLength(1);
  });

  it("returns at most 2 rects for split", () => {
    const rects = computeLayout("split", 1920, 1080, 4);
    expect(rects).toHaveLength(2);
    expect(rects[0]?.x).toBeLessThan(rects[1]?.x ?? 0);
  });

  it("returns exactly feedCount rects when feedCount fits the layout", () => {
    expect(computeLayout("grid", 1920, 1080, 3)).toHaveLength(3);
    expect(computeLayout("grid", 1920, 1080, 4)).toHaveLength(4);
  });

  it("returns empty when there are no feeds", () => {
    expect(computeLayout("grid", 1920, 1080, 0)).toEqual([]);
  });

  it("PiP: single feed is full-screen, two feeds produces a small pip in the corner", () => {
    const one = computeLayout("pip", 1920, 1080, 1);
    expect(one).toHaveLength(1);
    const two = computeLayout("pip", 1920, 1080, 2);
    expect(two).toHaveLength(2);
    const [main, pip] = two;
    expect(pip?.width).toBeLessThan(main?.width ?? 0);
    expect(pip?.x).toBeGreaterThan(main?.x ?? 0);
  });

  it("speaker layout: main rect is wider than side rects", () => {
    const [main, side1] = computeLayout("speaker", 1920, 1080, 3);
    expect(main?.width).toBeGreaterThan(side1?.width ?? 0);
  });

  it("all rects stay within canvas bounds", () => {
    const width = 1280;
    const height = 720;
    for (const id of ["solo", "split", "grid", "speaker", "sidebar", "pip"] as const) {
      const rects = computeLayout(id, width, height, 4);
      for (const r of rects) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.width).toBeLessThanOrEqual(width);
        expect(r.y + r.height).toBeLessThanOrEqual(height);
      }
    }
  });
});
