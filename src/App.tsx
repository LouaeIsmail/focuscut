import { useCallback, useRef, useState } from "react";
import { Editor } from "./components/Editor";
import { Landing } from "./components/Landing";
import { recordDisplay } from "./lib/record";

export function App() {
  const [src, setSrc] = useState<string | null>(null);
  const objectUrl = useRef<string | null>(null);

  const loadBlob = useCallback((blob: Blob) => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    const url = URL.createObjectURL(blob);
    objectUrl.current = url;
    setSrc(url);
  }, []);

  const onFile = useCallback(
    (file: File) => {
      loadBlob(file);
    },
    [loadBlob],
  );

  const onRecord = useCallback(async () => {
    const blob = await recordDisplay();
    loadBlob(blob);
  }, [loadBlob]);

  const reset = useCallback(() => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setSrc(null);
  }, []);

  if (!src) {
    return <Landing onFile={onFile} onRecord={() => void onRecord()} />;
  }

  return <Editor src={src} onReset={reset} />;
}
