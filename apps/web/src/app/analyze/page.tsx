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
import {
  getAnalyzeInputType,
  normalizeAnalyzeInputValue,
} from "@/lib/analyze-input-client";
import {
  canUseSessionStorage,
  getLocalStorageItemSafely,
  getSessionStorageItemSafely,
  type ClaimSelectionMode,
  getStoredClaimSelectionMode,
  setLocalStorageItemSafely,
  setStoredClaimSelectionMode,
  storeDraftAccessToken,
} from "@/lib/claim-selection-client";
import { SystemHealthBanner } from "@/components/SystemHealthBanner";

export default function AnalyzePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState<ClaimSelectionMode>("interactive");
  const [quotaStatus, setQuotaStatus] = useState<{
    hourlyLimit: number;
    hourlyRemaining: number;
    dailyLimit: number;
    dailyRemaining: number;
    lifetimeRemaining: number;
    isActive: boolean;
    expiresUtc: string | null;
  } | null>(null);
  const [checkingQuota, setCheckingQuota] = useState(false);
  const [adminKey, setAdminKey] = useState<string | null>(null);

  // Load invite code and admin key on mount.
  useEffect(() => {
    const storedCode = getLocalStorageItemSafely("fh_invite_code") || "";
    setInviteCode(storedCode);
    setAdminKey(getSessionStorageItemSafely("fh_admin_key"));
    setSelectionMode(getStoredClaimSelectionMode());
  }, []);

  const checkQuota = async (code: string) => {
    if (!code.trim()) {
      setQuotaStatus(null);
      return;
    }
    setQuotaStatus(null);
    setCheckingQuota(true);
    try {
      const res = await fetch("/api/fh/analyze/status", {
        headers: { "X-Invite-Code": code.trim() },
      });
      if (res.ok) {
        const data = await res.json();
        setQuotaStatus({
          hourlyLimit: data.hourlyLimit ?? 0,
          hourlyRemaining: data.hourlyRemaining ?? 999,
          dailyLimit: data.dailyLimit ?? 0,
          dailyRemaining: data.dailyRemaining ?? 999,
          lifetimeRemaining: data.lifetimeRemaining ?? 999,
          isActive: data.isActive,
          expiresUtc: data.expiresUtc ?? null,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) {
      setError("Please enter text or a URL to analyze");
      return;
    }

    if (!adminKey && !canUseSessionStorage()) {
      setError(
        "This browser blocks session storage, which FactHarbor needs to hold the draft access token. Enable session storage or use an admin key.",
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { inputType, inputValue } = normalizeAnalyzeInputValue(input);

      // Guard against the UI getting stuck disabled if the server is under load.
      // If the request doesn't return promptly, abort and allow the user to retry.
      const controller = new AbortController();
      const timeoutMs = 15000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // Update stored invite code
      setLocalStorageItemSafely("fh_invite_code", inviteCode);
      setStoredClaimSelectionMode(selectionMode);

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (adminKey) {
        headers["x-admin-key"] = adminKey;
      }

      const res = await fetch("/api/fh/claim-selection-drafts", {
        method: "POST",
        headers,
        body: JSON.stringify({
          inputType,
          inputValue,
          selectionMode,
          inviteCode: inviteCode.trim() || undefined
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to start analysis: ${res.statusText}`);
      }

      const data = await res.json();
      if (typeof data?.draftId !== "string" || typeof data?.draftAccessToken !== "string") {
        throw new Error("Draft creation response was incomplete");
      }

      const storedDraftToken = storeDraftAccessToken(data.draftId, data.draftAccessToken);
      if (!storedDraftToken && !adminKey) {
        throw new Error(
          "Draft was created, but this browser blocked session storage needed to open it. Enable session storage and submit again.",
        );
      }

      router.push(`/analyze/select/${data.draftId}`);
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

  const detectedType = getAnalyzeInputType(input);
  const hasInput = input.trim().length > 0;

  return (
    <div className={styles.container}>
      <SystemHealthBanner />
      <h1 className={styles.title}>FactHarbor Fact-Check</h1>
      <p className={styles.subtitle}>
        Enter a claim, question, article text, or URL to analyze
      </p>

      <form onSubmit={handleSubmit}>
        <div className={styles.inputContainer}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"Examples:\n• Climate change is primarily caused by human activities\n• https://example.com/article-to-analyze"}
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

        <div
          style={{
            marginBottom: 16,
            padding: "14px 16px",
            border: "1px solid #d9dee5",
            borderRadius: 12,
            background: "#f8fafc",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 10 }}>
            Claim Selection
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={selectionMode === "automatic"}
              onChange={(event) => {
                const nextMode: ClaimSelectionMode = event.target.checked ? "automatic" : "interactive";
                setSelectionMode(nextMode);
                setStoredClaimSelectionMode(nextMode);
              }}
              style={{ marginTop: 2 }}
            />
            <span style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                Auto-continue with recommended claims
              </span>
              <span style={{ fontSize: 12, lineHeight: 1.5, color: "#475569" }}>
                FactHarbor prepares candidate atomic claims first. In automatic mode it continues
                directly when the recommendation step returns a non-empty subset; otherwise it falls
                back to the manual selection page.
              </span>
            </span>
          </label>
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
              {quotaStatus && (() => {
                const canSubmit = quotaStatus.isActive
                  && quotaStatus.hourlyRemaining > 0
                  && quotaStatus.dailyRemaining > 0
                  && quotaStatus.lifetimeRemaining > 0
                  && (!quotaStatus.expiresUtc || new Date(quotaStatus.expiresUtc) > new Date());
                return (
                  <span style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 10,
                    background: canSubmit ? "#d4edda" : "#f8d7da",
                    color: canSubmit ? "#28a745" : "#dc3545",
                    fontWeight: 600
                  }}>
                    {!quotaStatus.isActive ? "Inactive Code"
                      : quotaStatus.expiresUtc && new Date(quotaStatus.expiresUtc) <= new Date() ? "Expired"
                      : canSubmit ? `${quotaStatus.hourlyRemaining} remaining this hour`
                      : "Limit reached"}
                  </span>
                );
              })()}
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
                borderColor: quotaStatus ? (
                  quotaStatus.isActive
                    && quotaStatus.hourlyRemaining > 0
                    && quotaStatus.dailyRemaining > 0
                    && quotaStatus.lifetimeRemaining > 0
                    ? "#28a745" : "#dc3545"
                ) : "inherit"
              }}
              required
            />
            {quotaStatus && quotaStatus.isActive && (quotaStatus.hourlyRemaining <= 0 || quotaStatus.dailyRemaining <= 0 || quotaStatus.lifetimeRemaining <= 0) && (
              <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 6, padding: "8px 12px", marginTop: 8, fontSize: 12, color: "#856404", lineHeight: 1.5 }}>
                {quotaStatus.lifetimeRemaining <= 0
                  ? "You have used all available analyses for this invite code. Contact the administrator for additional quota."
                  : quotaStatus.dailyRemaining <= 0
                    ? `Daily limit reached (${quotaStatus.dailyLimit}/day). You can submit again after midnight UTC.`
                    : `Hourly limit reached (${quotaStatus.hourlyLimit}/hour). You can submit again in a few minutes.`}
              </div>
            )}
            {quotaStatus && !quotaStatus.isActive && (
              <div style={{ background: "#f8d7da", border: "1px solid #f5c6cb", borderRadius: 6, padding: "8px 12px", marginTop: 8, fontSize: 12, color: "#721c24", lineHeight: 1.5 }}>
                This invite code has been deactivated. Contact the administrator for a new code.
              </div>
            )}
            {quotaStatus && quotaStatus.isActive && quotaStatus.expiresUtc && new Date(quotaStatus.expiresUtc) <= new Date() && (
              <div style={{ background: "#f8d7da", border: "1px solid #f5c6cb", borderRadius: 6, padding: "8px 12px", marginTop: 8, fontSize: 12, color: "#721c24", lineHeight: 1.5 }}>
                This invite code has expired. Contact the administrator for a new code.
              </div>
            )}
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
              <>⏳ Preparing Claim Selection...</>
            ) : (
              <>🔍 Check</>
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

        {/* Methodology note */}
        <p
          style={{
            fontSize: 12,
            color: "#6b7280",
            lineHeight: 1.6,
            margin: "16px 0 0",
          }}
        >
          When you submit a claim, question, or article, FactHarbor extracts the
          core verifiable assertions, researches them using live web sources, and
          subjects the evidence to a multi-step debate between an advocate, a
          challenger, and a reconciler before producing a verdict. Each conclusion
          is scored on a 7-point scale from TRUE to FALSE with an associated
          confidence level. Analysis can take 5 minutes or more depending on
          complexity and system load.{" "}
          <a
            href="https://factharbor.ch"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#6b7280", textDecoration: "underline" }}
          >
            Learn more at FactHarbor.ch
          </a>
        </p>
      </form>

    </div>
  );
}
