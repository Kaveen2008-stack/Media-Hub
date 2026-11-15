"use client";

import { useCallback, useEffect, useState } from "react";
import Controls from "./Controls";
import { deleteFile, downloadUrl, getFiles, processItems, streamUrl } from "@/lib/client";
import { DEFAULT_SETTINGS, LibFile, Settings } from "@/lib/types";

const mb = (n: number) => (n / 1048576).toFixed(1) + " MB";

export default function Library({ refreshSig, onStarted }: { refreshSig: string; onStarted: () => void }) {
  const [files, setFiles] = useState<LibFile[]>([]);
  const [playing, setPlaying] = useState<LibFile | null>(null);
  const [editing, setEditing] = useState<LibFile | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setFiles((await getFiles()).files); } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { load(); }, [load, refreshSig]);

  async function remove(f: LibFile) {
    if (!confirm(`Delete "${f.name}" from Pixeldrain?`)) return;
    try { await deleteFile(f.id); setFiles((p) => p.filter((x) => x.id !== f.id)); }
    catch (e) { setError((e as Error).message); }
  }

  async function applyEdit() {
    if (!editing) return;
    setBusy(true);
    try {
      await processItems([{ title: editing.name.replace(/\.[^.]+$/, ""), pd_id: editing.id }], settings);
      setEditing(null); setSettings(DEFAULT_SETTINGS); onStarted();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">Library (Pixeldrain)</h2>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!files.length && <p className="text-sm text-zinc-500">No videos yet.</p>}

      {files.map((f) => (
        <div key={f.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{f.name}</p>
            <p className="text-xs text-zinc-500">{mb(f.size)} · {new Date(f.date_upload).toLocaleString()}</p>
          </div>
          <button onClick={() => setPlaying(f)} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700">Play</button>
          <button onClick={() => { setEditing(f); setSettings(DEFAULT_SETTINGS); }} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700">Edit</button>
          <a href={downloadUrl(f.id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm hover:bg-emerald-500">Download</a>
          <button onClick={() => remove(f)} className="rounded-lg px-2 py-1.5 text-sm text-red-400 hover:bg-red-950">✕</button>
        </div>
      ))}

      {playing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPlaying(null)}>
          <div className="w-full max-w-4xl space-y-2" onClick={(e) => e.stopPropagation()}>
            <video src={streamUrl(playing.id)} controls autoPlay className="max-h-[80vh] w-full rounded-lg bg-black" />
            <div className="flex justify-between text-sm text-zinc-300">
              <span className="truncate">{playing.name}</span>
              <button onClick={() => setPlaying(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="truncate font-semibold">Edit: {editing.name}</h3>
            <Controls settings={settings} onChange={setSettings} />
            <p className="text-xs text-zinc-500">Creates a new edited copy; the original stays.</p>
            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm">Cancel</button>
              <button onClick={applyEdit} disabled={busy} className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-medium hover:bg-violet-500 disabled:opacity-50">
                {busy ? "Starting..." : "Create copy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
