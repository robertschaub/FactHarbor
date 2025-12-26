"use client";

import { useState } from "react";

type CreateJobResponse = { jobId: string; status: string };

export default function Page() {
  const [inputType, setInputType] = useState<"text" | "url">("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    setJobId(null);

    try {
      const body =
        inputType === "text"
          ? { inputType, inputValue: text }
          : { inputType, inputValue: url };

      const res = await fetch("/api/fh/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as CreateJobResponse;
      setJobId(data.jobId);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h1 style={{ margin: "8px 0 0" }}>Analyze</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="radio" checked={inputType === "text"} onChange={() => setInputType("text")} />
          Text
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="radio" checked={inputType === "url"} onChange={() => setInputType("url")} />
          URL
        </label>
      </div>

      {inputType === "text" ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste text here…"
          rows={10}
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #333" }}
        />
      ) : (
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article"
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #333" }}
        />
      )}

      <button
        onClick={submit}
        disabled={busy || (inputType === "text" ? text.trim().length === 0 : url.trim().length === 0)}
        style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #333", fontWeight: 700, cursor: "pointer" }}
      >
        {busy ? "Starting…" : "Run analysis"}
      </button>

      {err && <div style={{ color: "#f88" }}>Error: {err}</div>}

      {jobId && (
        <div style={{ padding: 12, border: "1px solid #333", borderRadius: 10 }}>
          Job created: <a href={`/jobs/${jobId}`} style={{ textDecoration: "underline" }}>{jobId}</a>
        </div>
      )}
    </div>
  );
}
