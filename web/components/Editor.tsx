"use client";

import { useMemo, useRef, useState } from "react";
import Preview, { Meta } from "./Preview";
import { Group, Seg, Slider, Toggle } from "./ui";
import { renderEdit, streamUrl } from "@/lib/client";
import { DEFAULT_SPEC, DEFAULT_TEXT, EditSpec, LibFile, PRESETS, TextLayer } from "@/lib/types";

const TABS = ["Trim & Speed", "Frame", "Color", "Effects", "Text", "Audio", "Export"] as const;
type Tab = (typeof TABS)[number];

interface Props {
  file: LibFile;
  others: LibFile[];
  onClose: () => void;
  onRendered: () => void;
}

export default function Editor({ file, others, onClose, onRendered }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [spec, setSpec] = useState<EditSpec>(DEFAULT_SPEC);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [tab, setTab] = useState<Tab>("Trim & Speed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof EditSpec>(k: K, v: EditSpec[K]) => setSpec((s) => ({ ...s, [k]: v }));
  const patch = (p: Partial<EditSpec>) => setSpec((s) => ({ ...s, ...p }));

  const dur = meta?.duration ?? 0;
  const end = spec.end ?? dur;
  const outLen = Math.max(0, (end - spec.start) / spec.speed);

  const music = useMemo(() => others.filter((f) => f.id !== file.id), [others, file.id]);
  const now = () => videoRef.current?.currentTime ?? 0;

  function setText(i: number, p: Partial<TextLayer>) {
    set("texts", spec.texts.map((t, k) => (k === i ? { ...t, ...p } : t)));
  }

  async function render() {
    setBusy(true); setError("");
    try {
      const final: EditSpec = { ...spec, end: spec.end != null && spec.end >= dur - 0.05 ? null : spec.end };
      await renderEdit({ id: file.id, name: file.name }, final);
      onRendered();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="text-sm text-zinc-400 hover:text-white">← Library</button>
        <p className="truncate px-4 text-sm text-zinc-300">{file.name}</p>
        <button onClick={render} disabled={busy || !meta}
          className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium hover:bg-violet-500 disabled:opacity-40">
          {busy ? "Starting…" : "Render"}
        </button>
      </div>
      {error && <p className="rounded-lg border border-red-900 bg-red-950 p-3 text-sm text-red-300">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <Preview src={streamUrl(file.id)} spec={spec} meta={meta} videoRef={videoRef} onMeta={setMeta} />
          <p className="text-center text-xs text-zinc-500">
            Preview is an approximation · output length {outLen.toFixed(1)}s
            {meta ? ` · source ${meta.w}×${meta.h}` : ""}
          </p>
        </div>

        <aside className="rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="flex flex-wrap gap-1 border-b border-zinc-800 p-2">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-md px-2.5 py-1 text-xs ${tab === t ? "bg-violet-600" : "text-zinc-400 hover:bg-zinc-800"}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="max-h-[62vh] space-y-6 overflow-y-auto p-4">
            {tab === "Trim & Speed" && (
              <>
                <Group title="Trim">
                  <Slider label="Start" value={spec.start} min={0} max={Math.max(dur, 0.1)} step={0.1} suffix="s"
                          onChange={(v) => patch({ start: Math.min(v, end - 0.1) })} />
                  <Slider label="End" value={end} min={0} max={Math.max(dur, 0.1)} step={0.1} suffix="s"
                          onChange={(v) => patch({ end: Math.max(v, spec.start + 0.1) })} />
                  <div className="flex gap-2">
                    <button className="flex-1 rounded-md border border-zinc-700 py-1 text-xs hover:bg-zinc-800"
                      onClick={() => patch({ start: Math.min(now(), end - 0.1) })}>Start = playhead</button>
                    <button className="flex-1 rounded-md border border-zinc-700 py-1 text-xs hover:bg-zinc-800"
                      onClick={() => patch({ end: Math.max(now(), spec.start + 0.1) })}>End = playhead</button>
                  </div>
                </Group>
                <Group title="Speed">
                  <Seg value={spec.speed} onChange={(v) => set("speed", v)}
                    options={[0.5, 0.75, 1, 1.1, 1.15, 1.2, 1.5, 2].map((v) => ({ v, label: `${v}x` }))} />
                  <Slider label="Speed" value={spec.speed} min={0.25} max={4} step={0.05} suffix="x"
                          onChange={(v) => set("speed", v)} />
                </Group>
              </>
            )}

            {tab === "Frame" && (
              <>
                <Group title="Aspect ratio (center crop)">
                  <Seg value={spec.aspect} onChange={(v) => set("aspect", v)}
                    options={[{ v: "original", label: "Original" }, { v: "9:16", label: "9:16" }, { v: "1:1", label: "1:1" },
                              { v: "4:5", label: "4:5" }, { v: "16:9", label: "16:9" }]} />
                </Group>
                <Group title="Zoom & position">
                  <Slider label="Zoom" value={spec.zoom} min={1} max={3} step={0.01} suffix="x" onChange={(v) => set("zoom", v)} />
                  <Slider label="Pan X" value={spec.panX} min={-1} max={1} step={0.01} onChange={(v) => set("panX", v)} />
                  <Slider label="Pan Y" value={spec.panY} min={-1} max={1} step={0.01} onChange={(v) => set("panY", v)} />
                </Group>
                <Group title="Rotate / flip">
                  <Seg value={spec.rotate} onChange={(v) => set("rotate", v)}
                    options={[0, 90, 180, 270].map((v) => ({ v: v as 0 | 90 | 180 | 270, label: `${v}°` }))} />
                  <Toggle label="Mirror horizontally" value={spec.flipH} onChange={(v) => set("flipH", v)} />
                  <Toggle label="Flip vertically" value={spec.flipV} onChange={(v) => set("flipV", v)} />
                </Group>
              </>
            )}

            {tab === "Color" && (
              <>
                <Group title="Adjust">
                  <Slider label="Brightness" value={spec.brightness} min={-0.5} max={0.5} step={0.01} onChange={(v) => set("brightness", v)} />
                  <Slider label="Contrast" value={spec.contrast} min={0.5} max={2} step={0.01} onChange={(v) => set("contrast", v)} />
                  <Slider label="Saturation" value={spec.saturation} min={0} max={3} step={0.01} onChange={(v) => set("saturation", v)} />
                  <Slider label="Gamma" value={spec.gamma} min={0.5} max={2} step={0.01} onChange={(v) => set("gamma", v)} />
                  <Slider label="Hue" value={spec.hue} min={-180} max={180} step={1} suffix="°" digits={0} onChange={(v) => set("hue", v)} />
                  <Slider label="Temperature (warm ↔ cool)" value={spec.temperature} min={-1} max={1} step={0.05} onChange={(v) => set("temperature", v)} />
                </Group>
                <Group title="Look">
                  <Seg value={spec.look} onChange={(v) => set("look", v)}
                    options={[{ v: "none", label: "None" }, { v: "grayscale", label: "B&W" }, { v: "sepia", label: "Sepia" }, { v: "invert", label: "Invert" }]} />
                </Group>
              </>
            )}

            {tab === "Effects" && (
              <>
                <Group title="Presets">
                  <div className="flex flex-wrap gap-1.5">
                    {PRESETS.map((p) => (
                      <button key={p.name} onClick={() => patch(p.patch)}
                        className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs hover:bg-zinc-800">{p.name}</button>
                    ))}
                  </div>
                </Group>
                <Group title="Effects">
                  <Slider label="Blur" value={spec.blur} min={0} max={20} step={0.5} onChange={(v) => set("blur", v)} />
                  <Slider label="Sharpen" value={spec.sharpen} min={0} max={2} step={0.05} onChange={(v) => set("sharpen", v)} />
                  <Slider label="Vignette" value={spec.vignette} min={0} max={1} step={0.05} onChange={(v) => set("vignette", v)} />
                  <Slider label="Film grain" value={spec.grain} min={0} max={40} step={1} digits={0} onChange={(v) => set("grain", v)} />
                </Group>
                <Group title="Fade">
                  <Slider label="Fade in" value={spec.fadeIn} min={0} max={5} step={0.1} suffix="s" onChange={(v) => set("fadeIn", v)} />
                  <Slider label="Fade out" value={spec.fadeOut} min={0} max={5} step={0.1} suffix="s" onChange={(v) => set("fadeOut", v)} />
                </Group>
              </>
            )}

            {tab === "Text" && (
              <>
                {spec.texts.map((t, i) => (
                  <Group key={i} title={`Text ${i + 1}`}>
                    <textarea value={t.text} rows={2} onChange={(e) => setText(i, { text: e.target.value })}
                      className="w-full rounded-md border border-zinc-700 bg-zinc-950 p-2 text-sm outline-none focus:border-violet-500" />
                    <div className="flex items-center gap-3">
                      <input type="color" value={t.color} onChange={(e) => setText(i, { color: e.target.value })}
                             className="h-8 w-10 cursor-pointer rounded border border-zinc-700 bg-transparent" />
                      <div className="flex-1"><Toggle label="Background box" value={t.box} onChange={(v) => setText(i, { box: v })} /></div>
                    </div>
                    <Slider label="Size (% of height)" value={t.size} min={2} max={20} step={0.5} onChange={(v) => setText(i, { size: v })} />
                    <Slider label="Position X" value={t.x} min={0} max={1} step={0.01} onChange={(v) => setText(i, { x: v })} />
                    <Slider label="Position Y" value={t.y} min={0} max={1} step={0.01} onChange={(v) => setText(i, { y: v })} />
                    <Slider label="Show from" value={t.start} min={0} max={Math.max(outLen, 0.1)} step={0.1} suffix="s"
                            onChange={(v) => setText(i, { start: v })} />
                    <Slider label="Show until" value={t.end ?? outLen} min={0} max={Math.max(outLen, 0.1)} step={0.1} suffix="s"
                            onChange={(v) => setText(i, { end: v >= outLen - 0.05 ? null : v })} />
                    <button onClick={() => set("texts", spec.texts.filter((_, k) => k !== i))}
                      className="text-xs text-red-400 hover:underline">Remove</button>
                  </Group>
                ))}
                <button onClick={() => set("texts", [...spec.texts, { ...DEFAULT_TEXT }])}
                  className="w-full rounded-lg border border-dashed border-zinc-700 py-2 text-sm hover:bg-zinc-800">+ Add text</button>
                <p className="text-xs text-zinc-500">Text rendering supports Latin characters (Sinhala/CJK need a different font).</p>
              </>
            )}

            {tab === "Audio" && (
              <>
                <Group title="Original audio">
                  <Toggle label="Mute" value={spec.mute} onChange={(v) => set("mute", v)} />
                  <Slider label="Volume" value={spec.volume} min={0} max={3} step={0.05} suffix="x" onChange={(v) => set("volume", v)} />
                </Group>
                <Group title="Background music (from your Pixeldrain files)">
                  <select value={spec.musicId ?? ""} onChange={(e) => set("musicId", e.target.value || null)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 p-2 text-sm">
                    <option value="">None</option>
                    {music.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  {spec.musicId && (
                    <Slider label="Music volume" value={spec.musicVolume} min={0} max={2} step={0.05} suffix="x" onChange={(v) => set("musicVolume", v)} />
                  )}
                </Group>
              </>
            )}

            {tab === "Export" && (
              <Group title="Output">
                <Seg value={spec.height ?? 0} onChange={(v) => set("height", v || null)}
                  options={[{ v: 0, label: "Original" }, { v: 1080, label: "1080p" }, { v: 720, label: "720p" }, { v: 480, label: "480p" }]} />
                <Slider label="Quality (lower = better, bigger)" value={spec.crf} min={16} max={30} step={1} digits={0} onChange={(v) => set("crf", v)} />
                <button onClick={() => setSpec(DEFAULT_SPEC)}
                  className="w-full rounded-lg border border-zinc-700 py-2 text-sm hover:bg-zinc-800">Reset all edits</button>
                <button onClick={render} disabled={busy || !meta}
                  className="w-full rounded-lg bg-violet-600 py-2.5 font-medium hover:bg-violet-500 disabled:opacity-40">
                  {busy ? "Starting…" : "Render"}
                </button>
                <p className="text-xs text-zinc-500">The edited copy is uploaded to Pixeldrain; the original stays untouched.</p>
              </Group>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
