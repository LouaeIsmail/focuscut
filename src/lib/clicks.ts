import type { Click, Zoom } from "../types";
import { uid } from "./transform";

type Reply = {
  channel: "focuscut-reply";
  id: string;
  ok?: boolean;
  clicks?: Array<{ t: number; x: number; y: number; sx: number; sy: number }>;
};

const localClicks: Array<{
  t: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
}> = [];
let captureStart = 0;
let localListening = false;

function onLocalPointer(e: PointerEvent): void {
  if (!localListening || e.button !== 0) return;
  localClicks.push({
    t: (Date.now() - captureStart) / 1000,
    x: e.clientX / Math.max(1, window.innerWidth),
    y: e.clientY / Math.max(1, window.innerHeight),
    sx: e.screenX / Math.max(1, window.screen.width),
    sy: e.screenY / Math.max(1, window.screen.height),
  });
}

function askHelper<T>(payload: Record<string, unknown>, ms = 250): Promise<T | null> {
  const id = uid();
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMsg);
      resolve(null);
    }, ms);
    const onMsg = (e: MessageEvent<Reply>) => {
      if (e.source !== window) return;
      if (e.data?.channel !== "focuscut-reply" || e.data.id !== id) return;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMsg);
      resolve(e.data as T);
    };
    window.addEventListener("message", onMsg);
    window.postMessage({ channel: "focuscut", id, ...payload }, "*");
  });
}

export async function helperInstalled(): Promise<boolean> {
  const res = await askHelper<{ ok?: boolean }>({ type: "focuscut-ping" }, 180);
  return Boolean(res?.ok);
}

export function startClickCapture(t0: number): void {
  captureStart = t0;
  localClicks.length = 0;
  localListening = true;
  window.addEventListener("pointerdown", onLocalPointer, true);
  void askHelper({ type: "focuscut-session-start", t0 });
}

export function stopClickCapture(): void {
  localListening = false;
  window.removeEventListener("pointerdown", onLocalPointer, true);
}

export function collectClicks(useScreen: boolean): Click[] {
  const merged = [...localClicks];
  return merged.map((c) => ({
    t: c.t,
    x: useScreen ? c.sx : c.x,
    y: useScreen ? c.sy : c.y,
  }));
}

export async function collectHelperClicks(
  useScreen: boolean,
): Promise<Click[]> {
  const res = await askHelper<Reply>({ type: "focuscut-session-stop" }, 800);
  const extra = res?.clicks ?? [];
  const fromHelper = extra.map((c) => ({
    t: c.t,
    x: useScreen ? c.sx : c.x,
    y: useScreen ? c.sy : c.y,
  }));
  return [...collectClicks(useScreen), ...fromHelper];
}

export function clicksToZooms(clicks: Click[], scale = 1.85): Zoom[] {
  const sorted = clicks
    .filter((c) => Number.isFinite(c.t) && c.t >= 0)
    .sort((a, b) => a.t - b.t);
  const out: Zoom[] = [];
  for (const c of sorted) {
    const prev = out[out.length - 1];
    if (prev && c.t - prev.t < 0.28) continue;
    out.push({
      id: uid(),
      t: c.t,
      x: Math.min(1, Math.max(0, c.x)),
      y: Math.min(1, Math.max(0, c.y)),
      scale,
      hold: 0.7,
      source: "auto",
    });
  }
  return out;
}
