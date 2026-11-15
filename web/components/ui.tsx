import { ReactNode } from "react";

export function Slider(p: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; suffix?: string; digits?: number;
}) {
  return (
    <label className="block text-sm">
      <div className="mb-1 flex justify-between text-zinc-400">
        <span>{p.label}</span>
        <span className="text-zinc-100">{p.value.toFixed(p.digits ?? 2)}{p.suffix}</span>
      </div>
      <input type="range" min={p.min} max={p.max} step={p.step} value={p.value}
             onChange={(e) => p.onChange(parseFloat(e.target.value))} />
    </label>
  );
}

export function Seg<T extends string | number>(p: {
  value: T; options: { v: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {p.options.map((o) => (
        <button key={String(o.v)} onClick={() => p.onChange(o.v)}
          className={`rounded-md border px-2.5 py-1 text-xs ${
            p.value === o.v ? "border-violet-500 bg-violet-500/20" : "border-zinc-700 hover:bg-zinc-800"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle(p: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between text-sm">
      <span className="text-zinc-300">{p.label}</span>
      <input type="checkbox" checked={p.value} onChange={(e) => p.onChange(e.target.checked)}
             className="h-4 w-4 accent-violet-500" />
    </label>
  );
}

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
      {children}
    </div>
  );
}
