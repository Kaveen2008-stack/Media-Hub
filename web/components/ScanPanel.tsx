"use client";

import { useState } from "react";
import Controls from "./Controls";
import VideoGrid from "./VideoGrid";
import { processItems, scan } from "@/lib/client";
import { DEFAULT_SETTINGS, MediaItem, Settings } from "@/lib/types";

export default function ScanPanel({ onStarted }: { onStarted: () => void }) {
  const [url, setUrl] = useState("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [scanning, setScanning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onScan() {
    if (!url.trim()) return;
    setScanning(true); setError(""); setItems([]); setSelected(new Set()); setElapsed(0);
    try { setItems(await scan(url.trim(), setElapsed)); }
    catch (e) { setError((e as Error).message); }
    finally { setScanning(false); }
  }

  const toggle = (id: string) =>
    setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function onProcess() {
    setBusy(true); setError("");
    try {
      const chosen = items.filter((i) => selected.has(i.id)).map((i) => ({ title: i.title, url: i.url }));
      await processItems(chosen, settings);
      setSelected(new Set());
      onStarted();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <section className="space-y-5">
      <div className="flex gap-3">
        <input value={url} onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onScan()}
          placeholder="Paste a channel / playlist / video URL"
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 outline-none focus:border-violet-500" />
        <button onClick={onScan} disabled={scanning}
          className="rounded-lg bg-violet-600 px-6 font-medium hover:bg-violet-500 disabled:opacity-50">
          {scanning ? `Scanning… ${elapsed}s` : "Scan"}
        </button>
      </div>

      {error && <p className="rounded-lg border border-red-900 bg-red-950 p-3 text-sm text-red-300">{error}</p>}

      {items.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-zinc-400">
              <span>{items.length} videos · {selected.size} selected</span>
              <button className="hover:text-white"
                onClick={() => setSelected(selected.size === items.length ? new Set() : new Set(items.map((i) => i.id)))}>
                {selected.size === items.length ? "Clear" : "Select all"}
              </button>
            </div>
            <VideoGrid items={items} selected={selected} onToggle={toggle} />
          </div>
          <aside className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900 p-5 lg:sticky lg:top-6 lg:self-start">
            <h2 className="font-semibold">Settings</h2>
            <Controls settings={settings} onChange={setSettings} />
            <button onClick={onProcess} disabled={!selected.size || busy}
              className="w-full rounded-lg bg-violet-600 py-2.5 font-medium hover:bg-violet-500 disabled:opacity-40">
              {busy ? "Starting..." : `Process Selected (${selected.size})`}
            </button>
          </aside>
        </div>
      )}
    </section>
  );
}
