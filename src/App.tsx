import { useCallback, useEffect, useRef, useState } from "react";
import { Editor } from "./components/Editor";
import { Landing } from "./components/Landing";
import { clicksToZooms, helperInstalled } from "./lib/clicks";
import { startRecording, type ScreenRecording } from "./lib/record";
import type { Zoom } from "./types";

export function App() {
  const [src, setSrc] = useState<string | null>(null);
  const [seedZooms, setSeedZooms] = useState<Zoom[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [helper, setHelper] = useState(false);
  const objectUrl = useRef<string | null>(null);
  const session = useRef<ScreenRecording | null>(null);

  useEffect(() => {
    void helperInstalled().then(setHelper);
  }, []);

  const loadBlob = useCallback((blob: Blob, zooms: Zoom[] = []) => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    const url = URL.createObjectURL(blob);
    objectUrl.current = url;
    setSeedZooms(zooms);
    setSrc(url);
  }, []);

  const stopRecording = useCallback(() => {
    session.current?.stop();
  }, []);

  const onRecord = useCallback(async () => {
    setError(null);
    try {
      const rec = await startRecording();
      session.current = rec;
      setRecording(true);
      setElapsed(0);
      const { blob, clicks } = await rec.result;
      session.current = null;
      setRecording(false);
      if (blob.size === 0) {
        setError("Recording was empty. Try again and hit End when you are done.");
        return;
      }
      loadBlob(blob, clicksToZooms(clicks));
    } catch (err) {
      session.current = null;
      setRecording(false);
      if (err instanceof DOMException && err.name === "NotAllowedError") return;
      setError(err instanceof Error ? err.message : "Could not start recording");
    }
  }, [loadBlob]);

  useEffect(() => {
    if (!recording) return;
    const started = Date.now();
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [recording]);

  const reset = useCallback(() => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setSrc(null);
    setSeedZooms([]);
  }, []);

  if (!src) {
    return (
      <Landing
        onFile={(file) => loadBlob(file)}
        onRecord={() => void onRecord()}
        onStop={stopRecording}
        recording={recording}
        elapsed={elapsed}
        error={error}
        helper={helper}
      />
    );
  }

  return <Editor src={src} onReset={reset} seedZooms={seedZooms} />;
}
