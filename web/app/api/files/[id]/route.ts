import { PD, pdHeaders, validId } from "@/lib/server";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!validId(params.id)) return Response.json({ error: "bad id" }, { status: 400 });
  const r = await fetch(`${PD}/file/${params.id}`, { method: "DELETE", headers: pdHeaders() });
  if (!r.ok) return Response.json({ error: `Pixeldrain ${r.status}` }, { status: 502 });
  return Response.json({ ok: true });
}
