"use client";

import { useEffect, useState } from "react";
import styles from "./AboutBox.module.css";

type WebVersion = {
  service: string;
  node_env?: string | null;
  llm_provider?: string | null;
  git_sha?: string | null;
  now_utc?: string | null;
};

type ApiVersion = {
  service: string;
  environment?: string | null;
  assembly_version?: string | null;
  db_provider?: string | null;
  git_sha?: string | null;
  now_utc?: string | null;
};

async function safeJson<T>(url: string): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `${res.status} ${txt}` };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

function shortSha(sha?: string | null) {
  if (!sha) return "—";
  return sha.length > 10 ? sha.slice(0, 10) : sha;
}

export function AboutBox() {
  const [web, setWeb] = useState<WebVersion | null>(null);
  const [api, setApi] = useState<ApiVersion | null>(null);

  const [errWeb, setErrWeb] = useState<string | null>(null);
  const [errApi, setErrApi] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const w = await safeJson<WebVersion>("/api/version");
      if (!alive) return;
      if (w.ok) setWeb(w.data!);
      else setErrWeb(w.error ?? "Unknown error");
    })();

    (async () => {
      const a = await safeJson<ApiVersion>("/api/fh/version");
      if (!alive) return;
      if (a.ok) setApi(a.data!);
      else setErrApi(a.error ?? "Unknown error");
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>System Info</div>
          {errWeb && errApi ? (
            <div className={styles.error}>Error loading system info</div>
          ) : (web || api) ? (
            <div className={styles.grid}>
              {web && <><div>Environment</div><div><code>{web.node_env ?? "—"}</code></div></>}
              {web && <><div>LLM Provider</div><div><code>{web.llm_provider ?? "—"}</code></div></>}
              {api && <><div>API Version</div><div><code>{api.assembly_version ?? "—"}</code></div></>}
              {(web?.git_sha || api?.git_sha) && (
                <><div>Build</div><div><code>{shortSha(web?.git_sha || api?.git_sha)}</code></div></>
              )}
            </div>
          ) : <div>Loading…</div>}
        </div>

        <div className={`${styles.section} ${styles.sectionLinks}`}>
          <div className={styles.sectionTitle}>Health</div>
          <div className={styles.linksContainer}>
            <a href="/api/health" className={styles.link} target="_blank" rel="noopener">Web</a>
            <a href="/api/fh/health" className={styles.link} target="_blank" rel="noopener">API</a>
          </div>
        </div>
      </div>
    </div>
  );
}
