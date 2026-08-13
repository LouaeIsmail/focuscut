import { useEffect, useMemo, useRef, useState } from "react";
import { canvasToVideo, outputSize, renderFrame } from "../lib/draw";
import { exportVideo } from "../lib/exportVideo";
import { sampleTransform, uid } from "../lib/transform";
import {
  BACKGROUNDS,
  type Aspect,
  type Look,
  type Zoom,
} from "../types";

type Props = {
  src: string;
  onReset: () => void;
};

function fmt(t: number): string {
  const s = Math.max(0, t);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, "0")}`;
}

export function Editor({ src, onReset }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zooms, setZooms] = useState<Zoom[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [exporting, setExporting] = useState<number | null>(null);
  const [look, setLook] = useState<Look>({
    aspect: "16:9",
    padding: 96,
    radius: 18,
    background: BACKGROUNDS[0]?.css ?? "#111110",
  });

  const size = useMemo(() => outputSize(look), [look]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let lastUi = 0;
    const draw = (ts: number) => {
      const t = video.currentTime;
      const xf = sampleTransform(t, zooms, video.duration || duration);
      renderFrame(ctx, video, xf, look);
      if (ts - lastUi > 80) {
        lastUi = ts;
        setNow(t);
        setPlaying(!video.paused && !video.ended);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [look, zooms, duration, size.w, size.h]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (video.paused) void video.play();
        else video.pause();
      }
      if (e.key === "z" || e.key === "Z") {
        addZoom(0.5, 0.5);
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        if (selected) {
          setZooms((zs) => zs.filter((z) => z.id !== selected));
          setSelected(null);
        }
      }
      if (e.key === "ArrowLeft") {
        video.currentTime = Math.max(0, video.currentTime - 1);
      }
      if (e.key === "ArrowRight") {
        video.currentTime = Math.min(duration, video.currentTime + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, duration, zooms]);

  function addZoom(x: number, y: number) {
    const video = videoRef.current;
    const t = video?.currentTime ?? 0;
    const next: Zoom = {
      id: uid(),
      t,
      x,
      y,
      scale: 1.85,
      hold: 0.7,
    };
    setZooms((zs) => [...zs, next].sort((a, b) => a.t - b.t));
    setSelected(next.id);
  }

  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const pt = canvasToVideo(e.clientX, e.clientY, canvas, video, look);
    if (!pt) return;
    addZoom(pt.x, pt.y);
  }

  async function onExport() {
    const video = videoRef.current;
    if (!video) return;
    setExporting(0);
    try {
      const blob = await exportVideo({
        video,
        zooms,
        look,
        onProgress: (p) => setExporting(p),
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "focuscut.webm";
      a.click();
    } finally {
      setExporting(null);
    }
  }

  const current = zooms.find((z) => z.id === selected);

  return (
    <div className="editor">
      <header className="top">
        <button type="button" className="btn" onClick={onReset}>
          New
        </button>
        <div className="brand">Focuscut</div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void onExport()}
          disabled={exporting !== null}
        >
          Export
        </button>
      </header>

      <div className="stage">
        <video
          ref={videoRef}
          src={src}
          playsInline
          muted
          preload="auto"
          style={{
            position: "absolute",
            width: 2,
            height: 2,
            opacity: 0,
            pointerEvents: "none",
          }}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration || 0);
          }}
          onLoadedData={(e) => {
            const v = e.currentTarget;
            setDuration(v.duration || 0);
            setReady(true);
            if (v.currentTime === 0) v.currentTime = 0.04;
          }}
        />
        <canvas
          ref={canvasRef}
          onClick={onCanvasClick}
          aria-label="Preview. Click to add a zoom."
        />
      </div>

      <aside className="side">
        <h2>Look</h2>
        <div className="field">
          <label htmlFor="aspect">Aspect</label>
          <select
            id="aspect"
            value={look.aspect}
            onChange={(e) =>
              setLook((l) => ({ ...l, aspect: e.target.value as Aspect }))
            }
          >
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
            <option value="1:1">1:1</option>
          </select>
        </div>
        <div className="field">
          <label>Background</label>
          <div className="swatches">
            {BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                type="button"
                className="swatch"
                data-on={look.background === b.css}
                title={b.label}
                style={{ background: b.css }}
                onClick={() => setLook((l) => ({ ...l, background: b.css }))}
              />
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="pad">Padding {look.padding}px</label>
          <input
            id="pad"
            type="range"
            min={24}
            max={180}
            value={look.padding}
            onChange={(e) =>
              setLook((l) => ({ ...l, padding: Number(e.target.value) }))
            }
          />
        </div>
        <div className="field">
          <label htmlFor="rad">Corners {look.radius}px</label>
          <input
            id="rad"
            type="range"
            min={0}
            max={40}
            value={look.radius}
            onChange={(e) =>
              setLook((l) => ({ ...l, radius: Number(e.target.value) }))
            }
          />
        </div>

        <h2>Zoom</h2>
        {current ? (
          <>
            <div className="field">
              <label htmlFor="scale">Scale {current.scale.toFixed(2)}×</label>
              <input
                id="scale"
                type="range"
                min={1.1}
                max={3}
                step={0.05}
                value={current.scale}
                onChange={(e) => {
                  const scale = Number(e.target.value);
                  setZooms((zs) =>
                    zs.map((z) => (z.id === current.id ? { ...z, scale } : z)),
                  );
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="hold">Hold {current.hold.toFixed(1)}s</label>
              <input
                id="hold"
                type="range"
                min={0.1}
                max={3}
                step={0.1}
                value={current.hold}
                onChange={(e) => {
                  const hold = Number(e.target.value);
                  setZooms((zs) =>
                    zs.map((z) => (z.id === current.id ? { ...z, hold } : z)),
                  );
                }}
              />
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setZooms((zs) => zs.filter((z) => z.id !== current.id));
                setSelected(null);
              }}
            >
              Remove zoom
            </button>
          </>
        ) : (
          <p className="hint">
            Click the video to aim a zoom at the playhead. Z adds one in the
            center.
          </p>
        )}
      </aside>

      <div className="time">
        <div className="time-controls">
          <button
            type="button"
            className="btn"
            onClick={() => {
              const v = videoRef.current;
              if (!v) return;
              if (v.paused) void v.play();
              else v.pause();
            }}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <span>
            {fmt(now)} / {fmt(duration)}
          </span>
          <span>{ready ? `${zooms.length} zooms` : "Loading…"}</span>
        </div>
        <div className="rail">
          <div
            className="playhead"
            style={{ left: duration ? `${(now / duration) * 100}%` : 0 }}
          />
          {zooms.map((z) => (
            <button
              key={z.id}
              type="button"
              className="mark"
              data-on={z.id === selected}
              style={{ left: duration ? `${(z.t / duration) * 100}%` : 0 }}
              onClick={(e) => {
                e.stopPropagation();
                setSelected(z.id);
                const v = videoRef.current;
                if (v) v.currentTime = z.t;
              }}
            />
          ))}
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={now}
            onChange={(e) => {
              const v = videoRef.current;
              const t = Number(e.target.value);
              if (v) v.currentTime = t;
              setNow(t);
            }}
          />
        </div>
      </div>

      {exporting !== null && (
        <div className="progress">
          <div className="progress-card">
            Exporting… {Math.round(exporting * 100)}%
          </div>
        </div>
      )}
    </div>
  );
}
