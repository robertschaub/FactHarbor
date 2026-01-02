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
          <div className={styles.sectionTitle}>Web</div>
          {errWeb ? (
            <div className={styles.error}>Error: {errWeb}</div>
          ) : web ? (
            <div className={styles.grid}>
              <div>Service</div><div><code>{web.service}</code></div>
              <div>Env</div><div><code>{web.node_env ?? "—"}</code></div>
              <div>LLM</div><div><code>{web.llm_provider ?? "—"}</code></div>
              <div>Git</div><div><code>{shortSha(web.git_sha)}</code></div>
            </div>
          ) : <div>Loading…</div>}
        </div>

        <div className={`${styles.section} ${styles.sectionLarge}`}>
          <div className={styles.sectionTitle}>API</div>
          {errApi ? (
            <div className={styles.error}>Error: {errApi}</div>
          ) : api ? (
            <div className={styles.grid}>
              <div>Service</div><div><code>{api.service}</code></div>
              <div>Env</div><div><code>{api.environment ?? "—"}</code></div>
              <div>DB</div><div><code>{api.db_provider ?? "—"}</code></div>
              <div>Asm</div><div><code>{api.assembly_version ?? "—"}</code></div>
              <div>Git</div><div><code>{shortSha(api.git_sha)}</code></div>
            </div>
          ) : <div>Loading…</div>}
        </div>

        <div className={`${styles.section} ${styles.sectionLinks}`}>
          <div className={styles.sectionTitle}>Links</div>
          <div className={styles.linksContainer}>
            <a href="/api/health" className={styles.link}>Web health</a>
            <a href="/api/fh/health" className={styles.link}>API health</a>
            <a href="/api/version" className={styles.link}>Web version</a>
            <a href="/api/fh/version" className={styles.link}>API version</a>
          </div>
        </div>
      </div>
    </div>
  );
}
