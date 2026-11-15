"use client";

import { useCallback, useEffect, useState } from "react";
import Editor from "@/components/Editor";
import JobsBar from "@/components/JobsBar";
import Library from "@/components/Library";
import { getJobs } from "@/lib/client";
import { Job, LibFile } from "@/lib/types";

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editing, setEditing] = useState<{ file: LibFile; all: LibFile[] } | null>(null);

  const refresh = useCallback(async () => {
    try { setJobs((await getJobs()).jobs); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 6000);
    return () => clearInterval(t);
  }, [refresh]);

  const sig = jobs.map((j) => `${j.job_id}:${j.status}:${j.outputs}`).join("|");

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-6">
      {!editing && (
        <header>
          <h1 className="text-2xl font-bold">Video Editor</h1>
          <p className="text-sm text-zinc-400">Pixeldrain → edit in browser → render on GitHub Actions → back to Pixeldrain</p>
        </header>
      )}

      {editing ? (
        <Editor file={editing.file} others={editing.all}
          onClose={() => setEditing(null)}
          onRendered={() => { setEditing(null); refresh(); }} />
      ) : (
        <>
          <JobsBar jobs={jobs} />
          <Library refreshSig={sig} onEdit={(file, all) => setEditing({ file, all })} />
        </>
      )}
    </main>
  );
}
