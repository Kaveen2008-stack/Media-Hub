import { Settings } from "@/lib/types";

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
}

function Slider(p: {
  label: string; value: number; min: number; max: number; step: number;
  suffix?: string; onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm">
      <div className="mb-1 flex justify-between text-zinc-400">
        <span>{p.label}</span>
        <span className="text-zinc-100">{p.value.toFixed(2)}{p.suffix}</span>
      </div>
      <input type="range" min={p.min} max={p.max} step={p.step} value={p.value}
             onChange={(e) => p.onChange(parseFloat(e.target.value))} />
    </label>
  );
}

export default function Controls({ settings: s, onChange }: Props) {
  const set = (k: keyof Settings) => (v: number) => onChange({ ...s, [k]: v });
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[1, 1.1, 1.15, 1.2].map((v) => (
          <button key={v} onClick={() => set("speed")(v)}
            className={`flex-1 rounded-md border px-2 py-1 text-xs ${
              s.speed === v ? "border-violet-500 bg-violet-500/20" : "border-zinc-700 hover:bg-zinc-800"}`}>
            {v}x
          </button>
        ))}
      </div>
      <Slider label="Speed" value={s.speed} min={0.5} max={2} step={0.05} suffix="x" onChange={set("speed")} />
      <Slider label="Zoom / crop" value={s.zoom} min={1} max={1.5} step={0.01} suffix="x" onChange={set("zoom")} />
      <Slider label="Brightness" value={s.brightness} min={-0.3} max={0.3} step={0.01} onChange={set("brightness")} />
      <Slider label="Contrast" value={s.contrast} min={0.7} max={1.4} step={0.01} onChange={set("contrast")} />
      <Slider label="Saturation" value={s.saturation} min={0.5} max={1.6} step={0.01} onChange={set("saturation")} />
    </div>
  );
}
