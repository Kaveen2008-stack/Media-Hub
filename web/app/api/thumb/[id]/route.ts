export const runtime = "edge";

// Proxies the Pixeldrain thumbnail so the browser never talks to Pixeldrain directly.
export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!/^[A-Za-z0-9_-]{4,24}$/.test(params.id)) return new Response("bad id", { status: 400 });

  const up = await fetch(
    `https://pixeldrain.com/api/file/${params.id}/thumbnail?width=320&height=180`,
    {
      headers: {
        Authorization: "Basic " + btoa(":" + (process.env.PIXELDRAIN_API_KEY ?? "").trim()),
        "User-Agent": "Mozilla/5.0 (compatible; media-hub)",
      },
    },
  );
  if (!up.ok) return new Response("no thumbnail", { status: 404 });

  return new Response(up.body, {
    headers: {
      "content-type": up.headers.get("content-type") ?? "image/webp",
      "cache-control": "private, max-age=86400",
    },
  });
}
