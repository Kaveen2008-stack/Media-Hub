import { Job, LibFile, MediaItem, ProcessItem, Settings } from "./types";

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...init });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error ?? `Request failed (${r.status})`);
  }
  return r.json();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const dispatch = (mode: "scan" | "process", payload: unknown) =>
  j<{ job_id: string }>("/api/dispatch", { method: "POST", body: JSON.stringify({ mode, payload }) });

export async function scan(url: string, onTick?: (s: number) => void): Promise<MediaItem[]> {
  const { job_id } = await dispatch("scan", { url });
  for (let i = 0; i < 60; i++) {           // up to ~3 min
    await sleep(3000);
    onTick?.((i + 1) * 3);
    const r = await fetch(`/api/scan/${job_id}`);
    if (r.status === 200) {
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      return d.items;
    }
    if (r.status !== 202) throw new Error("Scan failed");
  }
  throw new Error("Scan timed out — check the Actions run");
}

export const processItems = (items: ProcessItem[], settings: Settings) =>
  dispatch("process", { items, settings });

export const getJobs = () => j<{ jobs: Job[] }>("/api/jobs");
export const getFiles = () => j<{ files: LibFile[] }>("/api/files");
export const deleteFile = (id: string) => j<{ ok: boolean }>(`/api/files/${id}`, { method: "DELETE" });

export const streamUrl = (id: string) => `/api/stream/${id}`;
export const downloadUrl = (id: string) => `https://pixeldrain.com/api/file/${id}?download`;
