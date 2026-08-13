import { renderFrame, outputSize } from "./draw";
import { sampleTransform } from "./transform";
import type { Look, Zoom } from "../types";

type VideoWithFrames = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number) => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

function exportMime(): string {
  const types = [
    "video/mp4;codecs=avc1.42E01E",
    "video/webm;codecs=h264",
    "video/webm;codecs=vp8",
    "video/webm;codecs=vp9",
    "video/webm",
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm";
}

function bitrate(look: Look): number {
  if (look.quality === "2160") return 20_000_000;
  if (look.quality === "1440") return 12_000_000;
  return 8_000_000;
}

export async function exportVideo(opts: {
  video: HTMLVideoElement;
  zooms: Zoom[];
  look: Look;
  trimStart: number;
  trimEnd: number;
  onProgress?: (p: number) => void;
}): Promise<Blob> {
  const { video, zooms, look, onProgress } = opts;
  const trimStart = Math.max(0, opts.trimStart);
  const trimEnd = Math.max(trimStart + 0.05, opts.trimEnd);
  const span = trimEnd - trimStart;

  const { w, h } = outputSize(look, video);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", {
    alpha: false,
    desynchronized: true,
  });
  if (!ctx) throw new Error("No 2d context");

  const canvasStream = canvas.captureStream(30);
  const wasMuted = video.muted;
  video.muted = false;
  let audioTracks: MediaStreamTrack[] = [];
  try {
    const vs = (
      video as HTMLVideoElement & { captureStream: () => MediaStream }
    ).captureStream();
    audioTracks = vs.getAudioTracks();
  } catch {
    audioTracks = [];
  }
  const mixed = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioTracks,
  ]);

  const mime = exportMime();
  const chunks: BlobPart[] = [];
  const rec = new MediaRecorder(mixed, {
    mimeType: mime,
    videoBitsPerSecond: bitrate(look),
    audioBitsPerSecond: 128_000,
  });
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  let settled = false;
  const done = new Promise<Blob>((resolve, reject) => {
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(new Blob(chunks, { type: mime }));
    };
    rec.onerror = () => {
      if (settled) return;
      settled = true;
      reject(new Error("Export failed"));
    };
    rec.onstop = finish;
  });

  const v = video as VideoWithFrames;
  video.pause();
  video.playbackRate = 1;
  video.currentTime = trimStart;
  await waitSeek(video);

  rec.start();
  await video.play();

  await new Promise<void>((resolve) => {
    let donePlaying = false;
    let handle = 0;
    const finishPlay = () => {
      if (donePlaying) return;
      donePlaying = true;
      if (handle && v.cancelVideoFrameCallback) v.cancelVideoFrameCallback(handle);
      resolve();
    };
    const onFrame = () => {
      const t = video.currentTime;
      const xf = sampleTransform(t, zooms, video.duration || trimEnd, look.ease);
      renderFrame(ctx, video, xf, look);
      onProgress?.(span ? Math.min(1, (t - trimStart) / span) : 0);
      const atEnd =
        video.ended || video.paused || t >= trimEnd - 0.04;
      if (atEnd) {
        finishPlay();
        return;
      }
      if (v.requestVideoFrameCallback) {
        handle = v.requestVideoFrameCallback(onFrame);
      } else {
        requestAnimationFrame(onFrame);
      }
    };
    if (v.requestVideoFrameCallback) {
      handle = v.requestVideoFrameCallback(onFrame);
    } else {
      requestAnimationFrame(onFrame);
    }
    video.onended = finishPlay;
    window.setTimeout(finishPlay, Math.ceil(span * 1000) + 2000);
  });

  video.muted = wasMuted;
  if (rec.state === "recording") {
    rec.requestData();
    rec.stop();
  }
  for (const t of audioTracks) t.stop();
  await Promise.race([
    done,
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, 1500);
    }),
  ]);
  if (!settled) {
    settled = true;
    return new Blob(chunks, { type: mime });
  }
  return done;
}

function waitSeek(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    const done = () => resolve();
    if (Math.abs(video.currentTime) < 0.05 && video.readyState >= 2) {
      resolve();
      return;
    }
    video.addEventListener("seeked", done, { once: true });
    window.setTimeout(done, 400);
  });
}
