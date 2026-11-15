import { Job } from "@/lib/types";

function badge(j: Job) {
  if (j.status !== "completed") return { t: j.status === "queued" ? "Queued" : "Running", c: "bg-violet-500/20 text-violet-300" };
  if (j.conclusion === "success") return { t: "Done", c: "bg-emerald-500/20 text-emerald-300" };
  return { t: "Failed", c: "bg-red-500/20 text-red-300" };
}

export default function JobsBar({ jobs }: { jobs: Job[] }) {
  if (!jobs.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">Recent jobs</h2>
      <div className="space-y-2">
        {jobs.slice(0, 6).map((j) => {
          const b = badge(j);
          return (
            <a key={j.job_id} href={j.url} target="_blank" rel="noreferrer"
               className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm hover:border-zinc-600">
              <span className="font-mono text-zinc-400">{j.job_id}</span>
              <span className="text-zinc-400">{j.outputs} uploaded</span>
              <span className={`rounded px-2 py-0.5 text-xs ${b.c}`}>{b.t}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
