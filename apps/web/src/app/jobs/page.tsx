"use client";

import { useEffect, useState } from "react";

type JobListItem = { jobId: string; status: string; createdUtc: string; inputType: string; inputPreview: string | null };

export default function JobsPage() {
  const [items, setItems] = useState<JobListItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/fh/jobs", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as JobListItem[];
        setItems(data);
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      }
    })();
  }, []);

  return (
    <div>
      <h1 style={{ margin: "8px 0 12px" }}>Jobs</h1>
      {err && <div style={{ color: "#f88" }}>Error: {err}</div>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #333", padding: 8 }}>Created (UTC)</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #333", padding: 8 }}>Status</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #333", padding: 8 }}>Input</th>
          </tr>
        </thead>
        <tbody>
          {items.map((j) => (
            <tr key={j.jobId}>
              <td style={{ padding: 8, borderBottom: "1px solid #222" }}>{j.createdUtc}</td>
              <td style={{ padding: 8, borderBottom: "1px solid #222" }}>
                <a href={`/jobs/${j.jobId}`} style={{ textDecoration: "underline" }}>{j.status}</a>
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #222" }}>
                <code>{j.inputType}</code> — {j.inputPreview ?? "—"}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={3} style={{ padding: 8 }}>No jobs yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
