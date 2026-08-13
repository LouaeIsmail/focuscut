import { useCallback, useEffect, useRef, useState } from "react"
import { Editor } from "./components/Editor"
import { Landing } from "./components/Landing"
import { startRecording, type ScreenRecording } from "./lib/record"

export function App() {
  const [src, setSrc] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const objectUrl = useRef<string | null>(null)
  const session = useRef<ScreenRecording | null>(null)

  const loadBlob = useCallback((blob: Blob) => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    const url = URL.createObjectURL(blob)
    objectUrl.current = url
    setSrc(url)
  }, [])

  const stopRecording = useCallback(() => {
    session.current?.stop()
  }, [])

  const onRecord = useCallback(async () => {
    setError(null)
    try {
      const rec = await startRecording()
      session.current = rec
      setRecording(true)
      setElapsed(0)
      const blob = await rec.result
      session.current = null
      setRecording(false)
      if (blob.size === 0) {
        setError("Recording was empty. Try again and hit End when you are done.")
        return
      }
      loadBlob(blob)
    } catch (err) {
      session.current = null
      setRecording(false)
      if (err instanceof DOMException && err.name === "NotAllowedError") return
      setError(err instanceof Error ? err.message : "Could not start recording")
    }
  }, [loadBlob])

  useEffect(() => {
    if (!recording) return
    const started = Date.now()
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000))
    }, 250)
    return () => window.clearInterval(id)
  }, [recording])

  const reset = useCallback(() => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = null
    setSrc(null)
  }, [])

  if (!src) {
    return (
      <Landing
        onFile={loadBlob}
        onRecord={() => void onRecord()}
        onStop={stopRecording}
        recording={recording}
        elapsed={elapsed}
        error={error}
      />
    )
  }

  return <Editor src={src} onReset={reset} />
}
