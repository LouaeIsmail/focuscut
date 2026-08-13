import { useRef } from "react";

type Props = {
  onFile: (file: File) => void;
  onRecord: () => void;
  onStop: () => void;
  recording: boolean;
  elapsed: number;
  error: string | null;
  helper: boolean;
};

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function Landing({
  onFile,
  onRecord,
  onStop,
  recording,
  elapsed,
  error,
  helper,
}: Props) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="landing">
      <header className="nav">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
            <circle
              cx="16"
              cy="16"
              r="9"
              fill="none"
              stroke="#ff5c33"
              strokeWidth="2"
            />
            <circle cx="16" cy="16" r="3" fill="#ff5c33" />
          </svg>
          Focuscut
        </div>
        <a href="https://github.com/LouaeIsmail/focuscut">GitHub</a>
      </header>
      <main className="hero">
        <div>
          <div className="kicker">Open source · nothing uploads</div>
          <h1>Zooms that follow the action.</h1>
          <p>
            Record your screen or drop a video. Clicks become zooms. Export a
            polished demo from your browser.
          </p>
          {recording ? (
            <div className="rec-panel">
              <div className="rec-row">
                <span className="rec-dot" aria-hidden="true" />
                <span className="rec-time">{clock(elapsed)}</span>
                Recording
              </div>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={onStop}
              >
                End recording
              </button>
              <p className="hint">
                Come back to this tab and hit End. You can also use Stop
                sharing in the browser bar.
                {helper
                  ? " Clicks in other tabs will become zooms."
                  : " Install the click helper if you want auto zooms."}
              </p>
            </div>
          ) : (
            <div className="actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={onRecord}
              >
                Record screen
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => input.current?.click()}
              >
                Drop a video
              </button>
              <input
                ref={input}
                className="hidden-input"
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFile(file);
                }}
              />
            </div>
          )}
          {error ? <p className="error">{error}</p> : null}
          {!recording ? (
            <p className="hint helper-line">
              {helper
                ? "Click helper is on. Zooms will plant on your clicks."
                : "Auto-zoom needs the helper: chrome://extensions → Load unpacked → extension/"}
            </p>
          ) : null}
        </div>
      </main>
      <footer className="foot">
        <span>MIT. Your file stays on this machine.</span>
        <span>Space play · Z zoom · [ ] trim</span>
      </footer>
    </div>
  );
}
