"use client";

import { useCallback, useEffect, useState } from "react";
import { deleteFile, downloadUrl, getFiles, streamUrl, thumbUrl } from "@/lib/client";
import { LibFile } from "@/lib/types";

const mb = (n: number) => (n / 1048576).toFixed(1) + " MB";

interface Props {
  refreshSig: string;
  onEdit: (file: LibFile, all: LibFile[]) => void;
}

export default function Library({ refreshSig, onEdit }: Props) {
  const [files, setFiles] = useState<LibFile[]>([]);
  const [playing, setPlaying] = useState<LibFile | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try { setFiles((await getFiles()).files); setError(""); }
    catch (e) { setError((e as Error).message); }
    finally { setLoaded(true); }
  }, []);
  useEffect(() => { load(); }, [load, refreshSig]);

  async function remove(f: LibFile) {
    if (!confirm(`Delete "${f.name}" from Pixeldrain?`)) return;
    try { await deleteFile(f.id); setFiles((p) => p.filter((x) => x.id !== f.id)); }
    catch (e) { setError((e as Error).message); }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Your Pixeldrain videos</h2>
        <button onClick={load} className="text-sm text-zinc-400 hover:text-white">Refresh</button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {loaded && !files.length && !error && (
        <p className="text-sm text-zinc-500">No videos found. Upload videos to your Pixeldrain account, then press Refresh.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {files.map((f) => (
          <div key={f.id} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
            <button onClick={() => setPlaying(f)} className="relative block aspect-video w-full bg-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbUrl(f.id)} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center text-3xl opacity-0 transition hover:opacity-100">▶</span>
            </button>
            <div className="space-y-3 p-3">
              <div>
                <p className="truncate text-sm">{f.name}</p>
                <p className="text-xs text-zinc-500">{mb(f.size)} · {new Date(f.date_upload).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onEdit(f, files)}
                  className="flex-1 rounded-lg bg-violet-600 py-1.5 text-sm font-medium hover:bg-violet-500">Edit</button>
                <a href={downloadUrl(f.id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm hover:bg-emerald-500">Download</a>
                <button onClick={() => remove(f)} className="rounded-lg px-2 py-1.5 text-sm text-red-400 hover:bg-red-950">✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

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
    </section>
  );
}
