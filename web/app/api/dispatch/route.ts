import { WORKFLOW, ghHeaders, validId } from "@/lib/server";

export async function POST(req: Request) {
  const { mode, payload } = await req.json();
  if (mode !== "scan" && mode !== "process")
    return Response.json({ error: "bad mode" }, { status: 400 });

  if (mode === "scan" && !/^https?:\/\//.test(payload?.url ?? ""))
    return Response.json({ error: "Invalid URL" }, { status: 400 });

  if (mode === "process") {
    const items = payload?.items;
    const ok =
      Array.isArray(items) && items.length > 0 && items.length <= 50 &&
      items.every((i: any) =>
        typeof i.title === "string" &&
        ((typeof i.url === "string" && /^https?:\/\//.test(i.url)) ||
          (typeof i.pd_id === "string" && validId(i.pd_id))));
    if (!ok) return Response.json({ error: "Invalid items" }, { status: 400 });
  }

  const body = JSON.stringify(payload);
  if (body.length > 60000) return Response.json({ error: "Payload too large" }, { status: 400 });

  const job_id = "j" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const r = await fetch(`${WORKFLOW()}/dispatches`, {
    method: "POST",
    headers: ghHeaders(),
    body: JSON.stringify({
      ref: process.env.GITHUB_REF ?? "main",
      inputs: { job_id, mode, payload: body },
    }),
  });
  if (r.status !== 204)
    return Response.json({ error: `GitHub ${r.status}: ${(await r.text()).slice(0, 200)}` }, { status: 502 });
  return Response.json({ job_id });
}
