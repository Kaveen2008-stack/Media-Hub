export const runtime = "edge";

// Streams a Pixeldrain file with Range support so <video> can seek.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!/^[A-Za-z0-9_-]{4,24}$/.test(params.id)) return new Response("bad id", { status: 400 });

  const headers = new Headers({
    Authorization: "Basic " + btoa(":" + process.env.PIXELDRAIN_API_KEY),
  });
  const range = req.headers.get("range");
  if (range) headers.set("Range", range);

  const up = await fetch(`https://pixeldrain.com/api/file/${params.id}`, { headers });
  const out = new Headers();
  for (const k of ["content-length", "content-range"]) {
    const v = up.headers.get(k);
    if (v) out.set(k, v);
  }
  out.set("accept-ranges", "bytes");
  out.set("content-type", "video/mp4");
  out.set("cache-control", "private, max-age=3600");
  return new Response(up.body, { status: up.status, headers: out });
}
