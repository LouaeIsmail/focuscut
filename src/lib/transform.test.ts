import { describe, expect, it } from "vitest";
import { clicksToZooms } from "./clicks";
import { sampleTransform } from "./transform";
import type { Zoom } from "../types";

const z = (over: Partial<Zoom> & Pick<Zoom, "t">): Zoom => ({
  id: "z",
  x: 0.2,
  y: 0.3,
  scale: 2,
  hold: 0.5,
  ...over,
});

describe("sampleTransform", () => {
  it("is identity with no zooms", () => {
    expect(sampleTransform(1, [], 10)).toEqual({ x: 0.5, y: 0.5, scale: 1 });
  });

  it("holds the zoom during the hold window", () => {
    const xf = sampleTransform(1.2, [z({ t: 1 })], 10, 0.38);
    expect(xf.scale).toBe(2);
    expect(xf.x).toBe(0.2);
  });

  it("returns to identity after the ease-out", () => {
    const xf = sampleTransform(3, [z({ t: 1, hold: 0.5 })], 10, 0.38);
    expect(xf.scale).toBe(1);
  });

  it("pans between clicks instead of zooming out to 1x", () => {
    const a = z({ id: "a", t: 1, x: 0.2, y: 0.2, scale: 2, hold: 0.4 });
    const b = z({ id: "b", t: 2, x: 0.8, y: 0.8, scale: 2, hold: 0.4 });
    const mid = sampleTransform(1.8, [a, b], 10, 0.5);
    expect(mid.scale).toBeGreaterThan(1.5);
    expect(mid.x).toBeGreaterThan(0.2);
    expect(mid.x).toBeLessThan(0.8);
  });
});

describe("clicksToZooms", () => {
  it("drops clicks that are too close together", () => {
    const zooms = clicksToZooms([
      { t: 1, x: 0.2, y: 0.2 },
      { t: 1.1, x: 0.3, y: 0.3 },
      { t: 2, x: 0.8, y: 0.8 },
    ]);
    expect(zooms).toHaveLength(2);
    expect(zooms[0]?.t).toBe(1);
    expect(zooms[1]?.t).toBe(2);
  });
});
