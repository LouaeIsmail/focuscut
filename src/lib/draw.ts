import { ASPECTS, type Look, type Transform } from "../types";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function paintBackground(
  ctx: CanvasRenderingContext2D,
  look: Look,
  width: number,
  height: number,
): void {
  const css = look.background;
  if (css.startsWith("linear-gradient")) {
    const g = ctx.createLinearGradient(0, 0, width * 0.3, height);
    if (css.includes("#2a120c")) {
      g.addColorStop(0, "#2a120c");
      g.addColorStop(0.45, "#5a2314");
      g.addColorStop(1, "#c45a2a");
    } else if (css.includes("#0c1a22")) {
      g.addColorStop(0, "#0c1a22");
      g.addColorStop(0.5, "#163445");
      g.addColorStop(1, "#2d6a6a");
    } else {
      g.addColorStop(0, "#16101f");
      g.addColorStop(0.55, "#3a2458");
      g.addColorStop(1, "#8a4b6e");
    }
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = css;
  }
  ctx.fillRect(0, 0, width, height);
}

export function outputSize(look: Look): { w: number; h: number } {
  return ASPECTS[look.aspect];
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  xf: Transform,
  look: Look,
): void {
  const { w, h } = outputSize(look);
  ctx.clearRect(0, 0, w, h);
  paintBackground(ctx, look, w, h);

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const pad = look.padding;
  const maxW = w - pad * 2;
  const maxH = h - pad * 2;
  const fit = Math.min(maxW / vw, maxH / vh);
  const dw = vw * fit;
  const dh = vh * fit;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 48;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = "#000";
  roundRect(ctx, dx, dy, dw, dh, look.radius);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, dx, dy, dw, dh, look.radius);
  ctx.clip();

  const fx = dx + xf.x * dw;
  const fy = dy + xf.y * dh;
  ctx.translate(fx, fy);
  ctx.scale(xf.scale, xf.scale);
  ctx.translate(-fx, -fy);
  ctx.drawImage(video, dx, dy, dw, dh);
  ctx.restore();
}

/** Map a click on the preview canvas to video-normalized 0–1 coords. */
export function canvasToVideo(
  clickX: number,
  clickY: number,
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  look: Look,
): { x: number; y: number } | null {
  const { w, h } = outputSize(look);
  const rect = canvas.getBoundingClientRect();
  const x = ((clickX - rect.left) / rect.width) * w;
  const y = ((clickY - rect.top) / rect.height) * h;

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const pad = look.padding;
  const maxW = w - pad * 2;
  const maxH = h - pad * 2;
  const fit = Math.min(maxW / vw, maxH / vh);
  const dw = vw * fit;
  const dh = vh * fit;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;
  if (x < dx || y < dy || x > dx + dw || y > dy + dh) return null;
  return {
    x: (x - dx) / dw,
    y: (y - dy) / dh,
  };
}
