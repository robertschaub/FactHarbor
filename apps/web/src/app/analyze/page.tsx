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
import { readDefaultPipelineVariant } from "@/lib/pipeline-variant";

export default function AnalyzePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelineVariant, setPipelineVariant] = useState<PipelineVariant>("orchestrated");
  const [pipelineLoaded, setPipelineLoaded] = useState(false);

  // Load default pipeline from localStorage on mount.
  // This is intentionally done in an effect to avoid SSR/localStorage access.
  useEffect(() => {
    setPipelineVariant(readDefaultPipelineVariant());
    setPipelineLoaded(true);
  }, []);

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
      // If the user submits immediately after a hard refresh, React state can still be the SSR default.
      // In that case, fall back to the browser-local default from storage.
      const pipelineToSend = pipelineLoaded ? pipelineVariant : readDefaultPipelineVariant();

      // Guard against the UI getting stuck disabled if the server is under load.
      // If the request doesn't return promptly, abort and allow the user to retry.
      const controller = new AbortController();
      const timeoutMs = 15000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch("/api/fh/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputType, inputValue, pipelineVariant: pipelineToSend }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to start analysis: ${text}`);
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

        {/* Pipeline selection cards */}
        <div className={styles.pipelineInfo} style={{ marginBottom: 16 }}>
          <label className={styles.variantLabel} style={{ display: "block", marginBottom: 8 }}>Pipeline:</label>
          <div className={styles.pipelineInfoGrid} style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            <div
              className={`${styles.pipelineInfoCard} ${pipelineVariant === "orchestrated" ? styles.pipelineInfoCardSelected : ""}`}
              onClick={() => setPipelineVariant("orchestrated")}
            >
              <div className={styles.pipelineInfoHeader} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 13 }}>
                <span>🎯</span>
                <strong>Orchestrated</strong>
                <span className={styles.pipelineInfoBadge} style={{ marginLeft: "auto", padding: "2px 6px", fontSize: 10, fontWeight: 600, backgroundColor: "#28a745", color: "#fff", borderRadius: 3 }}>Default</span>
              </div>
              <div className={styles.pipelineInfoStats} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666" }}>
                <span title="Quality">⭐⭐⭐⭐⭐</span>
                <span title="Speed">2-5 min</span>
                <span title="Cost">$0.50-$2</span>
              </div>
            </div>
            <div
              className={`${styles.pipelineInfoCard} ${pipelineVariant === "monolithic_dynamic" ? styles.pipelineInfoCardSelected : ""}`}
              onClick={() => setPipelineVariant("monolithic_dynamic")}
            >
              <div className={styles.pipelineInfoHeader} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 13 }}>
                <span>⚗️</span>
                <strong>Dynamic</strong>
                <span className={styles.pipelineInfoBadgeExp} style={{ marginLeft: "auto", padding: "2px 6px", fontSize: 10, fontWeight: 600, backgroundColor: "#e65100", color: "#fff", borderRadius: 3 }}>Exp.</span>
              </div>
              <div className={styles.pipelineInfoStats} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#666" }}>
                <span title="Quality">⭐⭐⭐</span>
                <span title="Speed">20-60s</span>
                <span title="Cost">$0.10-$0.40</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className={styles.errorBox}>
            {error}
          </div>
        )}

        <div className={styles.buttonContainer}>
          <button
            type="submit"
            disabled={isSubmitting || !hasInput}
            className={`${styles.submitButton} ${isSubmitting || !hasInput ? styles.submitButtonDisabled : styles.submitButtonEnabled}`}
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
