import { describe, expect, it } from "vitest";
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
    const xf = sampleTransform(1.2, [z({ t: 1 })], 10);
    expect(xf.scale).toBe(2);
    expect(xf.x).toBe(0.2);
  });

  it("returns to identity after the ease-out", () => {
    const xf = sampleTransform(3, [z({ t: 1, hold: 0.5 })], 10);
    expect(xf.scale).toBe(1);
  });
});
