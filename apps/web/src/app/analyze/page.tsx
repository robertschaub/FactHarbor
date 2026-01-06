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

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../../styles/common.module.css";

export default function AnalyzePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const res = await fetch("/api/fh/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputType, inputValue }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to start analysis: ${text}`);
      }

      const data = await res.json();
      router.push(`/jobs/${data.jobId}`);
    } catch (err: any) {
      setError(err.message || "An error occurred");
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
            { icon: "📊", title: "Extract", desc: "Identifies claims & facts" },
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
