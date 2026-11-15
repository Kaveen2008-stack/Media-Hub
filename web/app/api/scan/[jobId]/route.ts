import { PD, listFiles, pdHeaders, validId } from "@/lib/server";

export const dynamic = "force-dynamic";

// 202 = not ready yet, 200 = scan result (file is deleted after reading)
export async function GET(_: Request, { params }: { params: { jobId: string } }) {
  if (!validId(params.jobId)) return Response.json({ error: "bad id" }, { status: 400 });
  const file = (await listFiles()).find((f) => f.name === `job-${params.jobId}.json`);
  if (!file) return Response.json({ pending: true }, { status: 202 });

  const r = await fetch(`${PD}/file/${file.id}`, { headers: pdHeaders(), cache: "no-store" });
  const data = await r.json();
  await fetch(`${PD}/file/${file.id}`, { method: "DELETE", headers: pdHeaders() });
  return Response.json(data);
}
