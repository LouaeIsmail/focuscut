import type { Transform, Zoom } from "../types";

const EASE = 0.38;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpXf(a: Transform, b: Transform, t: number): Transform {
  const e = smoothstep(t);
  return {
    x: lerp(a.x, b.x, e),
    y: lerp(a.y, b.y, e),
    scale: lerp(a.scale, b.scale, e),
  };
}

const IDENTITY: Transform = { x: 0.5, y: 0.5, scale: 1 };

function windowOf(z: Zoom): { start: number; holdEnd: number; end: number } {
  return {
    start: z.t - EASE,
    holdEnd: z.t + z.hold,
    end: z.t + z.hold + EASE,
  };
}

function zoomXf(z: Zoom): Transform {
  return { x: z.x, y: z.y, scale: z.scale };
}

/** Sample the zoom transform at time t (seconds). */
export function sampleTransform(
  t: number,
  zooms: Zoom[],
  duration: number,
): Transform {
  if (zooms.length === 0 || duration <= 0) return IDENTITY;

  const sorted = zooms.slice().sort((a, b) => a.t - b.t);
  const active: { z: Zoom; start: number; holdEnd: number; end: number }[] = [];
  for (const z of sorted) {
    const w = windowOf(z);
    if (t >= w.start && t <= w.end) active.push({ z, ...w });
  }

  if (active.length === 0) return IDENTITY;
  if (active.length === 1) {
    const a = active[0];
    if (!a) return IDENTITY;
    if (t < a.z.t) {
      const u = (t - a.start) / Math.max(0.0001, a.z.t - a.start);
      return lerpXf(IDENTITY, zoomXf(a.z), u);
    }
    if (t <= a.holdEnd) return zoomXf(a.z);
    const u = (t - a.holdEnd) / Math.max(0.0001, a.end - a.holdEnd);
    return lerpXf(zoomXf(a.z), IDENTITY, u);
  }

  const first = active[0];
  const last = active[active.length - 1];
  if (!first || !last) return IDENTITY;
  const span = last.holdEnd - first.z.t;
  const u = span <= 0 ? 1 : (t - first.z.t) / span;
  return lerpXf(zoomXf(first.z), zoomXf(last.z), u);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
