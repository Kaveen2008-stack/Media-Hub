"use client";

import { RefObject, useEffect, useRef, useState } from "react";
import { EditSpec } from "@/lib/types";

export interface Meta { duration: number; w: number; h: number }

const ASPECT: Record<string, number> = { "9:16": 9 / 16, "1:1": 1, "16:9": 16 / 9, "4:5": 4 / 5 };

interface Props {
  src: string;
  spec: EditSpec;
  meta: Meta | null;
  videoRef: RefObject<HTMLVideoElement>;
  onMeta: (m: Meta) => void;
}

/** Live approximation of the final render (CSS filters + transforms). Final output is made by FFmpeg. */
export default function Preview({ src, spec, meta, videoRef, onMeta }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [t, setT] = useState(0);

  const rot = spec.rotate;
  const swap = rot === 90 || rot === 270;
  const nat = meta ? (swap ? meta.h / meta.w : meta.w / meta.h) : 16 / 9;
  const A = spec.aspect === "original" ? nat : ASPECT[spec.aspect];
  const end = spec.end ?? meta?.duration ?? 0;

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [A]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = spec.speed;
    v.volume = Math.max(0, Math.min(1, spec.volume));
    v.muted = spec.mute;
  }, [spec.speed, spec.volume, spec.mute, videoRef]);

  function onTimeUpdate() {
    const v = videoRef.current;
    if (!v) return;
    setT(v.currentTime);
    if (end && v.currentTime >= end) { v.currentTime = spec.start; }
    else if (v.currentTime < spec.start - 0.05) { v.currentTime = spec.start; }
  }

  // stage = video frame (after rotation) scaled to "cover" the box
  let sw = box.w, sh = box.h;
  if (nat > A) { sh = box.h; sw = sh * nat; } else { sw = box.w; sh = sw / nat; }
  const vw = swap ? sh : sw;
  const vh = swap ? sw : sh;

  const z = spec.zoom;
  const zoomT = `translate(${-spec.panX * (z - 1) / 2 * 100}%, ${-spec.panY * (z - 1) / 2 * 100}%) scale(${z})`;

  const filters = [
    `brightness(${1 + spec.brightness})`,
    `contrast(${spec.contrast})`,
    `saturate(${spec.saturation})`,
    spec.hue ? `hue-rotate(${spec.hue}deg)` : "",
    spec.blur ? `blur(${spec.blur}px)` : "",
    spec.look === "grayscale" ? "grayscale(1)" : "",
    spec.look === "sepia" ? "sepia(1)" : "",
    spec.look === "invert" ? "invert(1)" : "",
  ].filter(Boolean).join(" ");

  const outT = (t - spec.start) / spec.speed;

  return (
    <div className="flex justify-center">
      <div ref={boxRef}
        className="relative overflow-hidden rounded-lg bg-black"
        style={{ aspectRatio: String(A), width: `min(100%, calc(62vh * ${A}))` }}>
        <div className="absolute inset-0" style={{ transform: zoomT }}>
          <div className="absolute left-1/2 top-1/2"
               style={{ width: sw, height: sh, transform: `translate(-50%, -50%) scale(${spec.flipH ? -1 : 1}, ${spec.flipV ? -1 : 1})` }}>
            <video ref={videoRef} src={src} controls playsInline preload="metadata"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                onMeta({ duration: v.duration, w: v.videoWidth, h: v.videoHeight });
              }}
              onTimeUpdate={onTimeUpdate}
              className="absolute left-1/2 top-1/2 max-w-none"
              style={{ width: vw, height: vh, filter: filters,
                       transform: `translate(-50%, -50%) rotate(${rot}deg)` }} />
          </div>
        </div>

        {spec.vignette > 0 && (
          <div className="pointer-events-none absolute inset-0"
               style={{ background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${spec.vignette * 0.85}) 100%)` }} />
        )}

        {spec.texts.map((tl, i) => {
          const vis = outT >= tl.start && (tl.end == null || outT <= tl.end);
          if (!vis || !tl.text.trim()) return null;
          return (
            <div key={i} className="pointer-events-none absolute whitespace-pre font-bold leading-tight"
              style={{
                left: `${tl.x * 100}%`, top: `${tl.y * 100}%`,
                transform: `translate(${-tl.x * 100}%, ${-tl.y * 100}%)`,
                fontSize: box.h * tl.size / 100, color: tl.color,
                background: tl.box ? "rgba(0,0,0,.45)" : "transparent",
                padding: tl.box ? "0.15em 0.3em" : 0,
              }}>
              {tl.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
