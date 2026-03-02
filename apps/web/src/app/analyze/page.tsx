/**
 * Analyze Page v2.4.8
 *
 * Features:
 * - Auto URL detection (no radio button needed)
 * - Single text input that handles both text and URLs
 * - Clean, simple interface
 *
 * @version 2.4.4
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../../styles/common.module.css";
import type { PipelineVariant } from "@/lib/pipeline-variant";
import { SystemHealthBanner } from "@/components/SystemHealthBanner";

export default function AnalyzePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pipelineVariant: PipelineVariant = "claimboundary";
  const [quotaStatus, setQuotaStatus] = useState<{
    dailyRemaining: number;
    lifetimeRemaining: number;
    isActive: boolean;
  } | null>(null);
  const [checkingQuota, setCheckingQuota] = useState(false);
  const [adminKey, setAdminKey] = useState<string | null>(null);

  // Load invite code and admin key on mount.
  useEffect(() => {
    const storedCode = localStorage.getItem("fh_invite_code") || "";
    setInviteCode(storedCode);
    setAdminKey(sessionStorage.getItem("fh_admin_key"));
  }, []);

  const checkQuota = async (code: string) => {
    if (!code.trim()) {
      setQuotaStatus(null);
      return;
    }
    setQuotaStatus(null);
    setCheckingQuota(true);
    try {
      const res = await fetch(`/api/fh/analyze/status?code=${encodeURIComponent(code.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setQuotaStatus({
          dailyRemaining: data.dailyRemaining,
          lifetimeRemaining: data.lifetimeRemaining,
          isActive: data.isActive
        });
      } else {
        setQuotaStatus(null);
      }
    } catch (err) {
      setQuotaStatus(null);
    } finally {
      setCheckingQuota(false);
    }
  };

  // Debounce quota check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inviteCode) checkQuota(inviteCode);
    }, 800);
    return () => clearTimeout(timer);
  }, [inviteCode]);

  // When navigating back from /jobs/[id], browsers can restore this page from bfcache
  // with stale React state (e.g. isSubmitting=true), which would keep the button disabled.
  // Reset the submit state whenever the page is shown/visible again.
  useEffect(() => {
    const reset = () => setIsSubmitting(false);

    // Fires on normal show and bfcache restore (event.persisted === true).
    const onPageShow = () => reset();
    window.addEventListener("pageshow", onPageShow);

    // Also handle tab switching / backgrounding.
    const onVisibility = () => {
      if (document.visibilityState === "visible") reset();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Auto-detect if input is a URL
  const isUrl = (text: string): boolean => {
    const trimmed = text.trim();
    // Check if it looks like a URL
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return true;
    }
    // Check for common URL patterns without protocol
    if (/^(www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
      return true;
    }
    return false;
  };

  const getInputType = (): "url" | "text" => {
    return isUrl(input) ? "url" : "text";
  };

  const normalizeUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return "https://" + trimmed;
    }
    return trimmed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) {
      setError("Please enter text or a URL to analyze");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const inputType = getInputType();
      const inputValue = inputType === "url" ? normalizeUrl(input) : input.trim();
      const pipelineToSend = pipelineVariant;

      // Guard against the UI getting stuck disabled if the server is under load.
      // If the request doesn't return promptly, abort and allow the user to retry.
      const controller = new AbortController();
      const timeoutMs = 15000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // Update stored invite code
      localStorage.setItem("fh_invite_code", inviteCode);

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (adminKey) {
        headers["x-admin-key"] = adminKey;
      }

      const res = await fetch("/api/fh/analyze", {
        method: "POST",
        headers,
        body: JSON.stringify({
          inputType,
          inputValue,
          pipelineVariant: pipelineToSend,
          inviteCode: inviteCode.trim() || undefined
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to start analysis: ${res.statusText}`);
      }

      const data = await res.json();
      router.push(`/jobs/${data.jobId}`);
    } catch (err: any) {
      const msg =
        err?.name === "AbortError"
          ? "Request timed out while starting analysis (server busy). Please try again."
          : err?.message || "An error occurred";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const detectedType = getInputType();
  const hasInput = input.trim().length > 0;

  return (
    <div className={styles.container}>
      <SystemHealthBanner />
      <h1 className={styles.title}>FactHarbor Analysis</h1>
      <p className={styles.subtitle}>
        Enter a claim, question, article text, or URL to analyze
      </p>

      <form onSubmit={handleSubmit}>
        <div className={styles.inputContainer}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Examples:&#10;• Was the Bolsonaro judgment fair and based on Brazil's law?&#10;• Climate change is primarily caused by human activities&#10;• https://example.com/article-to-analyze"
            className={styles.textarea}
          />
        </div>

        {/* Auto-detected type indicator */}
        {hasInput && (
          <div className={`${styles.detectedTypeIndicator} ${detectedType === "url" ? styles.detectedTypeUrl : styles.detectedTypeText}`}>
            <span className={styles.detectedTypeIcon}>
              {detectedType === "url" ? "🔗" : "📝"}
            </span>
            <span className={detectedType === "url" ? styles.detectedTypeTextUrl : styles.detectedTypeTextText}>
              Detected: <strong>{detectedType === "url" ? "URL - will fetch and analyze content" : "Text/Question - will analyze directly"}</strong>
            </span>
          </div>
        )}

        {/* Methodology note */}
        <p
          style={{
            fontSize: 12,
            color: "#6b7280",
            lineHeight: 1.6,
            maxWidth: 640,
            margin: "8px 0 16px",
          }}
        >
          When you submit a claim, question, or article, FactHarbor extracts the
          core verifiable assertions, researches them using live web sources, and
          subjects the evidence to a multi-step debate between an advocate, a
          challenger, and a reconciler before producing a verdict. Each conclusion
          is scored on a 7-point scale from TRUE to FALSE with an associated
          confidence level. Analysis typically takes 2&ndash;5 minutes depending on
          complexity.{" "}
          <a
            href="https://factharbor.ch"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#6b7280", textDecoration: "underline" }}
          >
            Learn more at FactHarbor.ch
          </a>
        </p>

        {/* Pipeline info */}
        <div className={styles.pipelineInfo} style={{ marginBottom: 16 }}>
          <div className={`${styles.pipelineInfoCard} ${styles.pipelineInfoCardSelected}`} style={{ cursor: "default" }}>
            <div className={styles.pipelineInfoHeader} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 13 }}>
              <span>🎯</span>
              <strong>ClaimBoundary Pipeline</strong>
            </div>
            <div className={styles.pipelineInfoStats} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666" }}>
              <span title="Approach">5-stage + debate</span>
              <span title="Speed">2-5 min</span>
              <span title="Cost">$0.50-$2</span>
            </div>
          </div>
        </div>

        {/* Invite Code — hidden for logged-in admins */}
        {adminKey ? (
          <div style={{ marginBottom: 16, padding: "8px 12px", background: "#d4edda", borderRadius: 6, fontSize: 13, color: "#155724" }}>
            Logged in as admin — invite code not required.
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label className={styles.variantLabel} style={{ margin: 0 }}>Invite Code:</label>
              {checkingQuota && <span style={{ fontSize: 11, color: "#666" }}>Checking...</span>}
              {quotaStatus && (
                <span style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: quotaStatus.isActive && quotaStatus.dailyRemaining > 0 ? "#d4edda" : "#f8d7da",
                  color: quotaStatus.isActive && quotaStatus.dailyRemaining > 0 ? "#28a745" : "#dc3545",
                  fontWeight: 600
                }}>
                  {quotaStatus.isActive
                    ? `${quotaStatus.dailyRemaining} remaining today`
                    : "Inactive Code"}
                </span>
              )}
            </div>
            <input
              type="password"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter your alpha invite code"
              className={styles.textarea}
              style={{
                height: "auto",
                padding: "10px",
                minHeight: "unset",
                borderColor: quotaStatus ? (quotaStatus.isActive && quotaStatus.dailyRemaining > 0 ? "#28a745" : "#dc3545") : "inherit"
              }}
              required
            />
            <p style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
              A valid invite code is required to use the FactHarbor alpha preview.
            </p>
          </div>
        )}

        {error && (
          <div className={styles.errorBox}>
            {error}
          </div>
        )}

        <div className={styles.buttonContainer}>
          <button
            type="submit"
            disabled={isSubmitting || !hasInput || (!adminKey && !inviteCode.trim())}
            className={`${styles.submitButton} ${isSubmitting || !hasInput || (!adminKey && !inviteCode.trim()) ? styles.submitButtonDisabled : styles.submitButtonEnabled}`}
          >
            {isSubmitting ? (
              <>⏳ Starting Analysis...</>
            ) : (
              <>🔍 Analyze</>
            )}
          </button>

          <button
            type="button"
            onClick={() => setInput("")}
            disabled={!hasInput}
            className={`${styles.clearButton} ${hasInput ? styles.clearButtonEnabled : styles.clearButtonDisabled}`}
          >
            Clear
          </button>
        </div>
      </form>

      {/* Example queries */}
      <div className={styles.examplesSection}>
        <h3 className={styles.examplesTitle}>Try these examples:</h3>
        <div className={styles.examplesList}>
          {[
            "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?",
            "Is climate change primarily caused by human activities?",
            "Did the 2020 US election have widespread fraud?",
          ].map((example, i) => (
            <button
              key={i}
              onClick={() => setInput(example)}
              className={styles.exampleButton}
            >
              📝 {example}
            </button>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className={styles.howItWorksSection}>
        <h3 className={styles.howItWorksTitle}>How FactHarbor Works</h3>
        <div className={styles.stepsGrid}>
          {[
            { icon: "🔍", title: "Research", desc: "Searches multiple sources" },
            { icon: "📊", title: "Extract", desc: "Identifies claims & evidence" },
            { icon: "⚖️", title: "Analyze", desc: "Weighs evidence" },
            { icon: "📋", title: "Report", desc: "Transparent verdict" },
          ].map((step, i) => (
            <div key={i} className={styles.stepItem}>
              <div className={styles.stepIcon}>{step.icon}</div>
              <div className={styles.stepTitle}>{step.title}</div>
              <div className={styles.stepDescription}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
