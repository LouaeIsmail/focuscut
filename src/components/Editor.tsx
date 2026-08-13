import { useEffect, useMemo, useRef, useState } from "react";
import { canvasToVideo, previewSize, renderFrame } from "../lib/draw";
import { exportVideo } from "../lib/exportVideo";
import { sampleTransform, uid } from "../lib/transform";
import {
  BACKGROUNDS,
  DEFAULT_LOOK,
  type Aspect,
  type FitMode,
  type Look,
  type Quality,
  type Zoom,
} from "../types";

type Props = {
  src: string;
  onReset: () => void;
  seedZooms?: Zoom[];
};

function fmt(t: number): string {
  const s = Math.max(0, t);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, "0")}`;
}

export function Editor({ src, onReset, seedZooms = [] }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgInput = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [zooms, setZooms] = useState<Zoom[]>(seedZooms);
  const [selected, setSelected] = useState<string | null>(
    seedZooms[0]?.id ?? null,
  );
  const [exporting, setExporting] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1);
  const [useAutoZooms, setUseAutoZooms] = useState(true);
  const [look, setLook] = useState<Look>(DEFAULT_LOOK);

  const visibleZooms = useMemo(
    () => (useAutoZooms ? zooms : zooms.filter((z) => z.source !== "auto")),
    [zooms, useAutoZooms],
  );
  const autoCount = zooms.filter((z) => z.source === "auto").length;

  const lookRef = useRef(look);
  const zoomsRef = useRef(visibleZooms);
  const trimRef = useRef({ start: trimStart, end: trimEnd });
  lookRef.current = look;
  zoomsRef.current = visibleZooms;
  trimRef.current = { start: trimStart, end: trimEnd };

  useEffect(() => {
    if (!ready) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!ctx) return;

    const v = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number;
      cancelVideoFrameCallback?: (id: number) => void;
    };

    let raf = 0;
    let rvfc = 0;
    let lastUi = 0;
    let stopped = false;

    const draw = () => {
      const currentLook = lookRef.current;
      const trim = trimRef.current;
      if (trim.end > trim.start && !video.paused && video.currentTime >= trim.end) {
        video.pause();
        video.currentTime = trim.end;
      }
      const rect = canvas.getBoundingClientRect();
      const dest = previewSize(currentLook, video, rect.width, rect.height);
      if (canvas.width !== dest.w || canvas.height !== dest.h) {
        canvas.width = dest.w;
        canvas.height = dest.h;
      }
      const xf = sampleTransform(
        video.currentTime,
        zoomsRef.current,
        video.duration || 0,
        currentLook.ease,
      );
      renderFrame(ctx, video, xf, currentLook, dest);
    };

    const step = (ts: number) => {
      if (stopped) return;
      draw();
      if (ts - lastUi > 120) {
        lastUi = ts;
        setNow(video.currentTime);
        setPlaying(!video.paused && !video.ended);
      }
      if (!video.paused && !video.ended && v.requestVideoFrameCallback) {
        rvfc = v.requestVideoFrameCallback(() => step(performance.now()));
      } else {
        raf = requestAnimationFrame(step);
      }
    };

    const onPause = () => {
      if (stopped) return;
      cancelAnimationFrame(raf);
      v.cancelVideoFrameCallback?.(rvfc);
      raf = requestAnimationFrame(step);
    };

    video.addEventListener("pause", onPause);
    video.addEventListener("seeked", draw);
    raf = requestAnimationFrame(step);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      v.cancelVideoFrameCallback?.(rvfc);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("seeked", draw);
    };
  }, [ready]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)
        return;
      if (e.code === "Space") {
        e.preventDefault();
        if (video.paused) {
          if (video.currentTime >= trimEnd - 0.05) video.currentTime = trimStart;
          void video.play();
        } else video.pause();
      }
      if (e.key === "z" || e.key === "Z") addZoom(0.5, 0.5);
      if ((e.key === "Backspace" || e.key === "Delete") && selected) {
        setZooms((zs) => zs.filter((z) => z.id !== selected));
        setSelected(null);
      }
      if (e.key === "ArrowLeft") {
        video.currentTime = Math.max(trimStart, video.currentTime - 1);
      }
      if (e.key === "ArrowRight") {
        video.currentTime = Math.min(trimEnd || duration, video.currentTime + 1);
      }
      if (e.key === "[") setTrimStart(video.currentTime);
      if (e.key === "]") setTrimEnd(video.currentTime);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, duration, trimStart, trimEnd]);

  function addZoom(x: number, y: number, t = videoRef.current?.currentTime ?? 0) {
    const next: Zoom = {
      id: uid(),
      t,
      x,
      y,
      scale: 1.85,
      hold: 0.7,
      source: "manual",
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
    const end = trimEnd || video.duration || 0;
    try {
      const blob = await exportVideo({
        video,
        zooms: visibleZooms,
        look,
        trimStart,
        trimEnd: end,
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

  const current = visibleZooms.find((z) => z.id === selected);

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
            const d = e.currentTarget.duration || 0;
            setDuration(d);
            setTrimEnd(d);
          }}
          onLoadedData={(e) => {
            const v = e.currentTarget;
            const d = v.duration || 0;
            setDuration(d);
            if (!trimEnd) setTrimEnd(d);
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
        <h2>Frame</h2>
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
            <option value="source">Source</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="fit">Fit</label>
          <select
            id="fit"
            value={look.fit}
            onChange={(e) =>
              setLook((l) => ({ ...l, fit: e.target.value as FitMode }))
            }
          >
            <option value="contain">Contain</option>
            <option value="cover">Cover (fill)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="quality">Export quality</label>
          <select
            id="quality"
            value={look.quality}
            onChange={(e) =>
              setLook((l) => ({ ...l, quality: e.target.value as Quality }))
            }
          >
            <option value="1080">1080p</option>
            <option value="1440">1440p</option>
            <option value="2160">4K</option>
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
                data-on={look.backgroundId === b.id && !look.bgImage}
                title={b.label}
                style={{
                  background:
                    b.colors.length === 1
                      ? b.colors[0]
                      : `linear-gradient(160deg, ${b.colors.join(",")})`,
                }}
                onClick={() =>
                  setLook((l) => ({
                    ...l,
                    backgroundId: b.id,
                    bgImage: null,
                  }))
                }
              />
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="custom-bg">Custom color</label>
          <input
            id="custom-bg"
            type="color"
            value={look.customColor}
            onChange={(e) =>
              setLook((l) => ({
                ...l,
                backgroundId: "custom",
                customColor: e.target.value,
                bgImage: null,
              }))
            }
          />
        </div>
        <div className="field">
          <button
            type="button"
            className="btn"
            onClick={() => bgInput.current?.click()}
          >
            Background image
          </button>
          <input
            ref={bgInput}
            className="hidden-input"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = URL.createObjectURL(file);
              setLook((l) => ({ ...l, bgImage: url }));
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="pad">Padding {look.padding}px</label>
          <input
            id="pad"
            type="range"
            min={0}
            max={220}
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
            max={48}
            value={look.radius}
            onChange={(e) =>
              setLook((l) => ({ ...l, radius: Number(e.target.value) }))
            }
          />
        </div>
        <div className="field">
          <label htmlFor="border">Border {look.border}px</label>
          <input
            id="border"
            type="range"
            min={0}
            max={16}
            value={look.border}
            onChange={(e) =>
              setLook((l) => ({ ...l, border: Number(e.target.value) }))
            }
          />
        </div>
        <div className="field">
          <label htmlFor="ease">Zoom ease {look.ease.toFixed(2)}s</label>
          <input
            id="ease"
            type="range"
            min={0.12}
            max={1.2}
            step={0.02}
            value={look.ease}
            onChange={(e) =>
              setLook((l) => ({ ...l, ease: Number(e.target.value) }))
            }
          />
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={look.shadow}
            onChange={(e) =>
              setLook((l) => ({ ...l, shadow: e.target.checked }))
            }
          />
          Drop shadow
        </label>

        <h2>Trim</h2>
        <div className="field">
          <label htmlFor="in">In {fmt(trimStart)}</label>
          <input
            id="in"
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={trimStart}
            onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 0.05))}
          />
        </div>
        <div className="field">
          <label htmlFor="out">Out {fmt(trimEnd)}</label>
          <input
            id="out"
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={trimEnd}
            onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 0.05))}
          />
        </div>
        <p className="hint">[ sets in · ] sets out at the playhead</p>

        <h2>Zoom {visibleZooms.length ? `(${visibleZooms.length})` : ""}</h2>
        {autoCount > 0 ? (
          <label className="check">
            <input
              type="checkbox"
              checked={useAutoZooms}
              onChange={(e) => setUseAutoZooms(e.target.checked)}
            />
            Click zooms ({autoCount})
          </label>
        ) : null}
        {current ? (
          <>
            <div className="field">
              <label htmlFor="scale">Scale {current.scale.toFixed(2)}×</label>
              <input
                id="scale"
                type="range"
                min={1.1}
                max={3.5}
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
                max={4}
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
            Click the video to aim a zoom. Z adds one in the center. Auto zooms
            from clicks need the helper extension.
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
              if (v.paused) {
                if (v.currentTime >= trimEnd - 0.05) v.currentTime = trimStart;
                void v.play();
              } else v.pause();
            }}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <span>
            {fmt(now)} / {fmt(duration)}
          </span>
          <span>{ready ? `${visibleZooms.length} zooms` : "Loading…"}</span>
          <label className="speed">
            Speed
            <select
              value={speed}
              onChange={(e) => {
                const n = Number(e.target.value);
                setSpeed(n);
                if (videoRef.current) videoRef.current.playbackRate = n;
              }}
            >
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={1.5}>1.5×</option>
              <option value={2}>2×</option>
            </select>
          </label>
        </div>
        <div className="rail">
          <div
            className="trim-shade"
            style={{
              left: 0,
              width: duration ? `${(trimStart / duration) * 100}%` : 0,
            }}
          />
          <div
            className="trim-shade"
            style={{
              left: duration ? `${(trimEnd / duration) * 100}%` : "100%",
              right: 0,
            }}
          />
          <div
            className="playhead"
            style={{ left: duration ? `${(now / duration) * 100}%` : 0 }}
          />
          {visibleZooms.map((z) => (
            <button
              key={z.id}
              type="button"
              className="mark"
              data-auto={z.source === "auto"}
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
