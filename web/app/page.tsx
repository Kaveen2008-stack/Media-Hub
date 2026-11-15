"use client";

import { useCallback, useEffect, useState } from "react";
import JobsBar from "@/components/JobsBar";
import Library from "@/components/Library";
import ScanPanel from "@/components/ScanPanel";
import { getJobs } from "@/lib/client";
import { Job } from "@/lib/types";

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);

  const refresh = useCallback(async () => {
    try { setJobs((await getJobs()).jobs); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 6000);
    return () => clearInterval(t);
  }, [refresh]);

  // Library reloads whenever a job's status or upload count changes.
  const sig = jobs.map((j) => `${j.job_id}:${j.status}:${j.outputs}`).join("|");

  return (
    <main className="mx-auto max-w-6xl space-y-10 p-6">
      <header>
        <h1 className="text-2xl font-bold">Media Hub</h1>
        <p className="text-sm text-zinc-400">GitHub Actions processes → Pixeldrain stores → play / edit / download here</p>
      </header>
      <ScanPanel onStarted={refresh} />
      <JobsBar jobs={jobs} />
      <Library refreshSig={sig} onStarted={refresh} />
    </main>
  );
}
