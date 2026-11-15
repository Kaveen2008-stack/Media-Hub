// Server-only helpers (never import from client components).
export const PD = "https://pixeldrain.com/api";

export const pdHeaders = (): HeadersInit => ({
  Authorization: "Basic " + btoa(":" + process.env.PIXELDRAIN_API_KEY),
});

export interface PdFile {
  id: string;
  name: string;
  size: number;
  date_upload: string;
  mime_type?: string;
}

export async function listFiles(): Promise<PdFile[]> {
  const r = await fetch(`${PD}/user/files`, { headers: pdHeaders(), cache: "no-store" });
  if (!r.ok) throw new Error(`Pixeldrain ${r.status}`);
  return (await r.json()).files ?? [];
}

export const ghHeaders = (): HeadersInit => ({
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

export const WORKFLOW = () =>
  `https://api.github.com/repos/${process.env.GITHUB_REPO}/actions/workflows/process.yml`;

export const validId = (id: string) => /^[A-Za-z0-9_-]{4,24}$/.test(id);
