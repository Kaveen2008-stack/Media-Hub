import { EditSpec, Job, LibFile } from "./types";

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...init });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error ?? `Request failed (${r.status})`);
  }
  return r.json();
}

export const renderEdit = (source: { id: string; name: string }, spec: EditSpec) =>
  j<{ job_id: string }>("/api/dispatch", {
    method: "POST",
    body: JSON.stringify({ payload: { source, spec } }),
  });

export const getJobs = () => j<{ jobs: Job[] }>("/api/jobs");
export const getFiles = () => j<{ files: LibFile[] }>("/api/files");
export const deleteFile = (id: string) => j<{ ok: boolean }>(`/api/files/${id}`, { method: "DELETE" });

export const streamUrl = (id: string) => `/api/stream/${id}`;
export const downloadUrl = (id: string) => `https://pixeldrain.com/api/file/${id}?download`;
export const thumbUrl = (id: string) => `/api/thumb/${id}`;
