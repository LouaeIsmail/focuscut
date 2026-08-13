export type ScreenRecording = {
  stop: () => void
  result: Promise<Blob>
}

function mimeType(): string {
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
    return "video/webm;codecs=vp9"
  }
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
    return "video/webm;codecs=vp8"
  }
  if (MediaRecorder.isTypeSupported("video/webm")) return "video/webm"
  return ""
}

async function getDisplayStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: true,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotAllowedError") throw err
    return navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: false,
    })
  }
}

function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop()
}

export async function startRecording(): Promise<ScreenRecording> {
  const stream = await getDisplayStream()

  const mime = mimeType()
  const rec = mime
    ? new MediaRecorder(stream, { mimeType: mime })
    : new MediaRecorder(stream)
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  let settled = false
  let finish: (() => void) | undefined

  const result = new Promise<Blob>((resolve, reject) => {
    finish = () => {
      if (settled) return
      settled = true
      try {
        if (rec.state === "recording") {
          rec.requestData()
          rec.stop()
        }
      } catch {
        /* already stopped */
      }
      stopTracks(stream)
      window.setTimeout(() => {
        resolve(new Blob(chunks, { type: rec.mimeType || "video/webm" }))
      }, 80)
    }

    rec.onerror = () => {
      if (settled) return
      settled = true
      stopTracks(stream)
      reject(new Error("Recording failed"))
    }
    rec.onstop = () => finish?.()
    for (const track of stream.getTracks()) {
      track.addEventListener("ended", () => finish?.())
    }
  })

  rec.start(200)

  return {
    stop: () => finish?.(),
    result,
  }
}
