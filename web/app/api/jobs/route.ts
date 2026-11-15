import { WORKFLOW, ghHeaders, listFiles } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [runsRes, files] = await Promise.all([
      fetch(`${WORKFLOW()}/runs?per_page=20`, { headers: ghHeaders(), cache: "no-store" }),
      listFiles(),
    ]);
    if (!runsRes.ok) throw new Error(`GitHub ${runsRes.status}`);
    const runs = (await runsRes.json()).workflow_runs ?? [];
    const jobs = runs.map((r: any) => ({
      job_id: r.display_title,
      status: r.status,
      conclusion: r.conclusion,
      created_at: r.created_at,
      url: r.html_url,
      outputs: files.filter((f) => f.name.startsWith(`out-${r.display_title}-`)).length,
    }));
    return Response.json({ jobs });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
