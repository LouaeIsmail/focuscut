import type { Click } from "../types";
import { collectHelperClicks, startClickCapture, stopClickCapture } from "./clicks";

export type RecordingResult = {
  blob: Blob;
  clicks: Click[];
};

export type ScreenRecording = {
  stop: () => void;
  result: Promise<RecordingResult>;
};

function mimeType(): string {
  const types = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/webm;codecs=h264,opus",
    "video/webm;codecs=h264",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9,opus",
    "video/webm",
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

async function getDisplayStream(): Promise<MediaStream> {
  const video = {
    frameRate: { ideal: 30, max: 30 },
    cursor: "always" as const,
  };
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video,
      audio: true,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotAllowedError") throw err;
    return navigator.mediaDevices.getDisplayMedia({
      video,
      audio: false,
    });
  }
}

function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}

export async function startRecording(): Promise<ScreenRecording> {
  const stream = await getDisplayStream();
  const videoTrack = stream.getVideoTracks()[0];
  const surface = videoTrack?.getSettings().displaySurface ?? "browser";
  if (videoTrack) videoTrack.contentHint = "motion";

  const t0 = Date.now();
  startClickCapture(t0);

  const mime = mimeType();
  const rec = mime
    ? new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 8_000_000,
        audioBitsPerSecond: 128_000,
      })
    : new MediaRecorder(stream, { videoBitsPerSecond: 8_000_000 });

  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  let settled = false;
  let finish: (() => void) | undefined;

  const result = new Promise<RecordingResult>((resolve, reject) => {
    finish = () => {
      if (settled) return;
      settled = true;
      try {
        if (rec.state === "recording") {
          rec.requestData();
          rec.stop();
        }
      } catch {
        /* already stopped */
      }
      stopTracks(stream);
      window.setTimeout(() => {
        void collectHelperClicks(surface === "monitor").then((clicks) => {
          stopClickCapture();
          resolve({
            blob: new Blob(chunks, { type: rec.mimeType || "video/webm" }),
            clicks,
          });
        });
      }, 120);
    };

    rec.onerror = () => {
      if (settled) return;
      settled = true;
      stopTracks(stream);
      stopClickCapture();
      reject(new Error("Recording failed"));
    };
    rec.onstop = () => finish?.();
    for (const track of stream.getTracks()) {
      track.addEventListener("ended", () => finish?.());
    }
  });

  rec.start();

  return {
    stop: () => finish?.(),
    result,
  };
}
