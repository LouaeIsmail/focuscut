import type { Transform, Zoom } from "../types";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Quintic ease-in-out. Softer than smoothstep at the ends. */
function easeInOut(t: number): number {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 16 * x * x * x * x * x : 1 - (-2 * x + 2) ** 5 / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpXf(a: Transform, b: Transform, t: number): Transform {
  const e = easeInOut(t);
  return {
    x: lerp(a.x, b.x, e),
    y: lerp(a.y, b.y, e),
    scale: lerp(a.scale, b.scale, e),
  };
}

const IDENTITY: Transform = { x: 0.5, y: 0.5, scale: 1 };

function zoomXf(z: Zoom): Transform {
  return { x: z.x, y: z.y, scale: z.scale };
}

/**
 * Camera path: ease in, pan between clicks, ease out after the last one.
 * Does not zoom back to 1x between clicks.
 */
export function sampleTransform(
  t: number,
  zooms: Zoom[],
  duration: number,
  ease = 0.65,
): Transform {
  if (zooms.length === 0 || duration <= 0) return IDENTITY;

  const zs = zooms.slice().sort((a, b) => a.t - b.t);
  const first = zs[0];
  const last = zs[zs.length - 1];
  if (!first || !last) return IDENTITY;

  const travel = Math.max(0.18, ease);

  if (t <= first.t - travel) return IDENTITY;
  if (t < first.t) {
    return lerpXf(IDENTITY, zoomXf(first), (t - (first.t - travel)) / travel);
  }

  for (let i = 0; i < zs.length - 1; i++) {
    const cur = zs[i];
    const next = zs[i + 1];
    if (!cur || !next) continue;
    const start = Math.max(cur.t, next.t - travel);
    if (t < start) return zoomXf(cur);
    if (t < next.t) {
      const span = Math.max(0.0001, next.t - start);
      return lerpXf(zoomXf(cur), zoomXf(next), (t - start) / span);
    }
  }

  const holdEnd = last.t + last.hold;
  if (t <= holdEnd) return zoomXf(last);
  const exitEnd = holdEnd + travel;
  if (t < exitEnd) return lerpXf(zoomXf(last), IDENTITY, (t - holdEnd) / travel);
  return IDENTITY;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
