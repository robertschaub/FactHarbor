"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

type Job = {
  jobId: string;
  status: string;
  progress: number;
  createdUtc: string;
  updatedUtc: string;
  inputType: string;
  inputValue: string;
  inputPreview: string | null;
  resultJson: any | null;
  reportMarkdown: string | null;
};

type EventItem = { id: number; tsUtc: string; level: string; message: string };

export default function JobPage({ params }: { params: { id: string } }) {
  const jobId = params.id;
  const [job, setJob] = useState<Job | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tab, setTab] = useState<"report" | "json" | "events">("report");
  const [err, setErr] = useState<string | null>(null);
  const [showTechnicalNotes, setShowTechnicalNotes] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const res = await fetch(`/api/fh/jobs/${jobId}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Job;
      if (alive) setJob(data);
    };

    load().catch((e: any) => setErr(e?.message ?? String(e)));

    const id = setInterval(() => {
      load().catch(() => {});
    }, 2000);

    return () => { alive = false; clearInterval(id); };
  }, [jobId]);

  useEffect(() => {
    // SSE events
    const es = new EventSource(`/api/fh/jobs/${jobId}/events`);
    es.onmessage = (evt) => {
      try {
        const item = JSON.parse(evt.data) as EventItem;
        setEvents((prev) => {
          const exists = prev.some((p) => p.id === item.id);
          return exists ? prev : [...prev, item].sort((a, b) => a.id - b.id);
        });
      } catch {}
    };
    es.onerror = () => {};
    return () => es.close();
  }, [jobId]);

  const report = job?.reportMarkdown ?? "";
  const reportForDisplay = useMemo(() => {
    if (showTechnicalNotes) return report;
    return report.replace(/## Technical Notes[\s\S]*$/m, "").trim();
  }, [report, showTechnicalNotes]);
  const jsonText = useMemo(() => (job?.resultJson ? JSON.stringify(job.resultJson, null, 2) : ""), [job]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h1 style={{ margin: "8px 0 0" }}>Job</h1>

      {err && <div style={{ color: "#f88" }}>Error: {err}</div>}

      {job ? (
        <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
          <div><b>ID:</b> <code>{job.jobId}</code></div>
          <div><b>Status:</b> <code>{job.status}</code> ({job.progress}%)</div>
          <div><b>Created:</b> {job.createdUtc}</div>
          <div><b>Updated:</b> {job.updatedUtc}</div>
          <div style={{ marginTop: 8 }}><b>Input:</b> <code>{job.inputType}</code> — {job.inputPreview ?? "—"}</div>
        </div>
      ) : (
        <div>Loading…</div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setTab("report")} style={{ padding: "8px 10px", border: "1px solid #333", borderRadius: 10, cursor: "pointer" }}>Report</button>
        <button onClick={() => setTab("json")} style={{ padding: "8px 10px", border: "1px solid #333", borderRadius: 10, cursor: "pointer" }}>JSON</button>
        <button onClick={() => setTab("events")} style={{ padding: "8px 10px", border: "1px solid #333", borderRadius: 10, cursor: "pointer" }}>Events</button>
        <button
          onClick={() => setShowTechnicalNotes((value) => !value)}
          style={{ padding: "8px 10px", border: "1px solid #333", borderRadius: 10, cursor: "pointer" }}
        >
          {showTechnicalNotes ? "Hide Technical Notes" : "Show Technical Notes"}
        </button>
      </div>

      {tab === "report" && (
        <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
          {reportForDisplay ? <ReactMarkdown>{reportForDisplay}</ReactMarkdown> : <div>No report yet.</div>}
        </div>
      )}

      {tab === "json" && (
        <pre style={{ border: "1px solid #333", borderRadius: 10, padding: 12, overflowX: "auto" }}>
          {jsonText || "No result yet."}
        </pre>
      )}

      {tab === "events" && (
        <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {events.map((e) => (
              <li key={e.id}>
                <code>{e.tsUtc}</code> <b>{e.level}</b> — {e.message}
              </li>
            ))}
            {events.length === 0 && <li>No events yet.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
