export async function recordDisplay(): Promise<Blob> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 30 },
    audio: true,
  });

  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";

  return new Promise((resolve, reject) => {
    const chunks: BlobPart[] = [];
    const rec = new MediaRecorder(stream, { mimeType: mime });
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    rec.onerror = () => {
      stopTracks(stream);
      reject(new Error("Recording failed"));
    };
    rec.onstop = () => {
      stopTracks(stream);
      resolve(new Blob(chunks, { type: mime }));
    };
    for (const track of stream.getTracks()) {
      track.addEventListener("ended", () => {
        if (rec.state === "recording") rec.stop();
      });
    }
    rec.start(250);
  });
}

function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}
