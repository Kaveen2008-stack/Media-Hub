import { listFiles } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const files = (await listFiles())
      .filter((f) => /\.(mp4|mov|mkv|webm)$/i.test(f.name))
      .sort((a, b) => (a.date_upload < b.date_upload ? 1 : -1));
    return Response.json({ files });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
