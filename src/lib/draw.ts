import { BACKGROUNDS, type Look, type Transform } from "../types";

const imageCache = new Map<string, HTMLImageElement>();

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  if (radius <= 0) {
    ctx.rect(x, y, w, h);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
  }
  ctx.closePath();
}

export function outputSize(
  look: Look,
  video?: HTMLVideoElement | null,
): { w: number; h: number } {
  const long =
    look.quality === "2160" ? 3840 : look.quality === "1440" ? 2560 : 1920;
  const short =
    look.quality === "2160" ? 2160 : look.quality === "1440" ? 1440 : 1080;

  if (look.aspect === "source" && video?.videoWidth && video.videoHeight) {
    const r = video.videoWidth / video.videoHeight;
    if (r >= 1) return { w: long, h: Math.round(long / r) };
    return { w: Math.round(short * r), h: short };
  }
  if (look.aspect === "9:16") return { w: short, h: long };
  if (look.aspect === "1:1") return { w: short, h: short };
  return { w: long, h: short };
}

export function videoBox(
  video: HTMLVideoElement,
  look: Look,
  w: number,
  h: number,
): { dx: number; dy: number; dw: number; dh: number } {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const pad = Math.max(0, look.padding);
  const maxW = Math.max(1, w - pad * 2);
  const maxH = Math.max(1, h - pad * 2);
  const scale =
    look.fit === "cover"
      ? Math.max(maxW / vw, maxH / vh)
      : Math.min(maxW / vw, maxH / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  return { dx: (w - dw) / 2, dy: (h - dh) / 2, dw, dh };
}

function paintBackground(
  ctx: CanvasRenderingContext2D,
  look: Look,
  width: number,
  height: number,
): void {
  if (look.bgImage) {
    let img = imageCache.get(look.bgImage);
    if (!img) {
      img = new Image();
      img.src = look.bgImage;
      imageCache.set(look.bgImage, img);
    }
    if (img.complete && img.naturalWidth) {
      const s = Math.max(width / img.naturalWidth, height / img.naturalHeight);
      const iw = img.naturalWidth * s;
      const ih = img.naturalHeight * s;
      ctx.drawImage(img, (width - iw) / 2, (height - ih) / 2, iw, ih);
      return;
    }
  }

  const preset = BACKGROUNDS.find((b) => b.id === look.backgroundId);
  const colors =
    look.backgroundId === "custom"
      ? [look.customColor]
      : (preset?.colors ?? [look.customColor]);

  if (colors.length === 1) {
    ctx.fillStyle = colors[0] ?? "#111110";
  } else {
    const g = ctx.createLinearGradient(0, 0, width * 0.2, height);
    colors.forEach((c, i) => {
      g.addColorStop(i / Math.max(1, colors.length - 1), c);
    });
    ctx.fillStyle = g;
  }
  ctx.fillRect(0, 0, width, height);
}

export function previewSize(
  look: Look,
  video: HTMLVideoElement | null,
  cssWidth: number,
  cssHeight: number,
): { w: number; h: number } {
  const out = outputSize(look, video);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const maxLong = 1280 * dpr;
  const fit = Math.min(
    1,
    maxLong / Math.max(out.w, out.h),
    (Math.max(2, cssWidth) * dpr) / out.w,
    (Math.max(2, cssHeight) * dpr) / out.h,
  );
  return {
    w: Math.max(2, Math.round(out.w * fit)),
    h: Math.max(2, Math.round(out.h * fit)),
  };
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  xf: Transform,
  look: Look,
  dest?: { w: number; h: number },
): void {
  const { w, h } = dest ?? outputSize(look, video);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, w, h);
  paintBackground(ctx, look, w, h);

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const { dx, dy, dw, dh } = videoBox(video, look, w, h);
  const flush = look.padding <= 0 && look.radius <= 0 && look.border <= 0;

  if (look.shadow && !flush) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 48;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = "#000";
    roundRect(ctx, dx, dy, dw, dh, look.radius);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  if (!flush) {
    roundRect(ctx, dx, dy, dw, dh, look.radius);
    ctx.clip();
  }

  const fx = dx + xf.x * dw;
  const fy = dy + xf.y * dh;
  ctx.translate(fx, fy);
  ctx.scale(xf.scale, xf.scale);
  ctx.translate(-fx, -fy);
  ctx.drawImage(video, dx, dy, dw, dh);
  ctx.restore();

  if (look.border > 0 && !flush) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = look.border;
    roundRect(ctx, dx, dy, dw, dh, look.radius);
    ctx.stroke();
    ctx.restore();
  }
}

export function canvasToVideo(
  clickX: number,
  clickY: number,
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  look: Look,
): { x: number; y: number } | null {
  const { w, h } = outputSize(look, video);
  const rect = canvas.getBoundingClientRect();
  const x = ((clickX - rect.left) / rect.width) * w;
  const y = ((clickY - rect.top) / rect.height) * h;
  if (!video.videoWidth) return null;
  const { dx, dy, dw, dh } = videoBox(video, look, w, h);
  if (x < dx || y < dy || x > dx + dw || y > dy + dh) return null;
  return { x: (x - dx) / dw, y: (y - dy) / dh };
}
