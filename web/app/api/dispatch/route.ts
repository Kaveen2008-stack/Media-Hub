import { WORKFLOW, ghHeaders, validId } from "@/lib/server";

export async function POST(req: Request) {
  const { payload } = await req.json();
  const src = payload?.source;
  const spec = payload?.spec;

  if (!src || typeof src.id !== "string" || !validId(src.id) || !spec || typeof spec !== "object")
    return Response.json({ error: "Invalid request" }, { status: 400 });
  if (spec.musicId && !validId(String(spec.musicId)))
    return Response.json({ error: "Invalid music id" }, { status: 400 });

  const body = JSON.stringify({ source: { id: src.id, name: String(src.name ?? "video") }, spec });
  if (body.length > 60000) return Response.json({ error: "Payload too large" }, { status: 400 });

  const job_id = "j" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const r = await fetch(`${WORKFLOW()}/dispatches`, {
    method: "POST",
    headers: ghHeaders(),
    body: JSON.stringify({
      ref: process.env.GITHUB_REF ?? "main",
      inputs: { job_id, mode: "edit", payload: body },
    }),
  });
  if (r.status !== 204)
    return Response.json({ error: `GitHub ${r.status}: ${(await r.text()).slice(0, 200)}` }, { status: 502 });
  return Response.json({ job_id });
}
