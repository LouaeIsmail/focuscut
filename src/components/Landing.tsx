import { useRef } from "react";

type Props = {
  onFile: (file: File) => void;
  onRecord: () => void;
};

export function Landing({ onFile, onRecord }: Props) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="landing">
      <header className="nav">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="9" fill="none" stroke="#ff5c33" strokeWidth="2" />
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
            Record your screen or drop a video. Click where the viewer should
            look. Export a polished demo from your browser.
          </p>
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={onRecord}>
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
        </div>
      </main>
      <footer className="foot">
        <span>MIT. Your file stays on this machine.</span>
        <span>Space play · Z add zoom · click video to aim</span>
      </footer>
    </div>
  );
}
