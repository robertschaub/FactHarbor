/**
 * System Health Banner
 *
 * Client component that polls system health and displays a warning banner
 * when job processing is paused due to a provider outage.
 */

"use client";

import { useEffect, useState } from "react";
import styles from "./SystemHealthBanner.module.css";

type ProviderHealth = {
  state: string;
  consecutiveFailures: number;
  lastFailureMessage: string | null;
};

type HealthState = {
  providers: Record<string, ProviderHealth>;
  systemPaused: boolean;
  pausedAt: number | null;
  pauseReason: string | null;
};

const POLL_INTERVAL_MS = 30_000;

export function SystemHealthBanner() {
  const [health, setHealth] = useState<HealthState | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchHealth = async () => {
      try {
        const res = await fetch("/api/fh/system-health", { cache: "no-store" });
        if (res.ok && mounted) {
          setHealth(await res.json());
        }
      } catch {
        // Silently ignore — banner just won't show
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, POLL_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!health?.systemPaused || dismissed) return null;

  const pausedDate = health.pausedAt
    ? new Date(health.pausedAt).toLocaleString()
    : "unknown time";

  // Find which providers are unhealthy
  const unhealthyProviders = Object.entries(health.providers)
    .filter(([, p]) => p.state !== "closed")
    .map(([name, p]) => ({
      name,
      state: p.state,
      failures: p.consecutiveFailures,
      lastError: p.lastFailureMessage,
    }));

  return (
    <div className={styles.banner} role="alert">
      <div className={styles.content}>
        <div className={styles.icon}>&#9888;</div>
        <div className={styles.text}>
          <div className={styles.title}>Job processing is paused</div>
          <div className={styles.message}>
            {health.pauseReason || "A provider outage has been detected."}
            {" "}Jobs in the queue will resume once an administrator resolves the issue.
          </div>
          {unhealthyProviders.length > 0 && (
            <div className={styles.details}>
              {unhealthyProviders.map((p) => (
                <span key={p.name} className={styles.providerBadge}>
                  {p.name}: {p.state} ({p.failures} failures)
                </span>
              ))}
            </div>
          )}
          <div className={styles.timestamp}>Paused since: {pausedDate}</div>
        </div>
        <button
          type="button"
          className={styles.dismiss}
          onClick={() => setDismissed(true)}
          aria-label="Dismiss banner"
        >
          &#10005;
        </button>
      </div>
    </div>
  );
}
