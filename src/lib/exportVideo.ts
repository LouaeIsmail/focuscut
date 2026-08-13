import { renderFrame, outputSize } from "./draw";
import { sampleTransform } from "./transform";
import type { Look, Zoom } from "../types";

export async function exportVideo(opts: {
  video: HTMLVideoElement;
  zooms: Zoom[];
  look: Look;
  onProgress?: (p: number) => void;
}): Promise<Blob> {
  const { video, zooms, look, onProgress } = opts;
  const { w, h } = outputSize(look);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");

  const canvasStream = canvas.captureStream(30);
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

  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";

  const chunks: BlobPart[] = [];
  const rec = new MediaRecorder(mixed, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
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

  const duration = video.duration || 0;
  video.pause();
  video.currentTime = 0;
  await waitSeek(video);

  rec.start(200);
  video.playbackRate = 1;
  await video.play();

  await new Promise<void>((resolve) => {
    let donePlaying = false;
    const finishPlay = () => {
      if (donePlaying) return;
      donePlaying = true;
      resolve();
    };
    const tick = () => {
      const xf = sampleTransform(video.currentTime, zooms, duration);
      renderFrame(ctx, video, xf, look);
      onProgress?.(duration ? Math.min(1, video.currentTime / duration) : 0);
      const atEnd =
        video.ended ||
        video.paused ||
        (duration > 0 && video.currentTime >= duration - 0.05);
      if (atEnd) {
        finishPlay();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    video.onended = finishPlay;
    window.setTimeout(finishPlay, Math.ceil(duration * 1000) + 2000);
  });

  if (rec.state === "recording") {
    rec.requestData();
    rec.stop();
  }
  for (const t of audioTracks) t.stop();
  await Promise.race([
    done,
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, 1200);
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
    if (video.readyState >= 2) {
      resolve();
      return;
    }
    video.addEventListener("seeked", () => resolve(), { once: true });
  });
}
