/**
 * System Health Banner
 *
 * Client component that polls system health and displays a warning banner
 * when providers are unhealthy or job processing is paused.
 *
 * Shows when:
 * - Any provider circuit is open or half_open (search/LLM unavailable)
 * - System is paused (admin action or automatic circuit breaker)
 *
 * Non-dismissible for provider issues (reflects real-time state);
 * dismissible for paused-system state once acknowledged.
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

const PROVIDER_MESSAGES: Record<string, string> = {
  search: "Web search unavailable \u2014 analyses will have limited or no evidence",
  llm: "LLM provider experiencing issues \u2014 analyses may fail or be delayed",
};

export function SystemHealthBanner() {
  const [health, setHealth] = useState<HealthState | null>(null);

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

  if (!health) return null;

  // Find providers with open/half_open circuits
  const unhealthyProviders = Object.entries(health.providers)
    .filter(([, p]) => p.state !== "closed")
    .map(([name, p]) => ({
      name,
      state: p.state,
      failures: p.consecutiveFailures,
      lastError: p.lastFailureMessage,
    }));

  const hasProviderIssues = unhealthyProviders.length > 0;
  const isPaused = health.systemPaused;

  // Nothing to show when all healthy
  if (!hasProviderIssues && !isPaused) return null;

  const pausedDate = health.pausedAt
    ? new Date(health.pausedAt).toLocaleString()
    : "unknown time";

  return (
    <div className={styles.banner} role="alert">
      <div className={styles.content}>
        <div className={styles.icon}>&#9888;</div>
        <div className={styles.text}>
          {isPaused && (
            <>
              <div className={styles.title}>Analysis system is paused</div>
              <div className={styles.message}>
                {health.pauseReason || "A provider outage has been detected."}
                {" "}New jobs will be queued but not processed until an administrator resumes the system.
              </div>
              <div className={styles.timestamp}>Paused since: {pausedDate}</div>
            </>
          )}
          {hasProviderIssues && !isPaused && (
            <div className={styles.title}>Provider issues detected</div>
          )}
          {unhealthyProviders.length > 0 && (
            <div className={styles.details}>
              {unhealthyProviders.map((p) => (
                <div key={p.name} className={styles.providerBadge}>
                  <span>{PROVIDER_MESSAGES[p.name] ?? `${p.name}: ${p.state}`}</span>
                  {p.lastError && (
                    <span className={styles.providerError}> ({p.lastError.slice(0, 80)})</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
