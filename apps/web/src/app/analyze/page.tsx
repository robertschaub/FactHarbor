/**
 * Analyze Page v2.4.4
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
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <h1 style={{ marginBottom: 8 }}>FactHarbor Analysis</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        Enter a claim, question, article text, or URL to analyze
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Examples:&#10;• Was the Bolsonaro judgment fair and based on Brazil's law?&#10;• Climate change is primarily caused by human activities&#10;• https://example.com/article-to-analyze"
            style={{
              width: "100%",
              minHeight: 200,
              padding: 16,
              fontSize: 15,
              lineHeight: 1.6,
              border: "2px solid #ddd",
              borderRadius: 12,
              resize: "vertical",
              fontFamily: "inherit",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => e.target.style.borderColor = "#007bff"}
            onBlur={(e) => e.target.style.borderColor = "#ddd"}
          />
        </div>

        {/* Auto-detected type indicator */}
        {hasInput && (
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 8, 
            marginBottom: 16,
            padding: "8px 12px",
            backgroundColor: detectedType === "url" ? "#e3f2fd" : "#f3e5f5",
            borderRadius: 8,
            fontSize: 13
          }}>
            <span style={{ fontSize: 16 }}>
              {detectedType === "url" ? "🔗" : "📝"}
            </span>
            <span style={{ color: detectedType === "url" ? "#1565c0" : "#7b1fa2" }}>
              Detected: <strong>{detectedType === "url" ? "URL - will fetch and analyze content" : "Text/Question - will analyze directly"}</strong>
            </span>
          </div>
        )}

        {error && (
          <div style={{ 
            padding: 12, 
            backgroundColor: "#f8d7da", 
            color: "#721c24", 
            borderRadius: 8, 
            marginBottom: 16,
            border: "1px solid #f5c6cb"
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="submit"
            disabled={isSubmitting || !hasInput}
            style={{
              flex: 1,
              padding: "14px 24px",
              fontSize: 16,
              fontWeight: 600,
              backgroundColor: isSubmitting || !hasInput ? "#ccc" : "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: isSubmitting || !hasInput ? "not-allowed" : "pointer",
              transition: "background-color 0.2s",
            }}
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
            style={{
              padding: "14px 20px",
              fontSize: 16,
              backgroundColor: "#f8f9fa",
              color: hasInput ? "#333" : "#999",
              border: "1px solid #ddd",
              borderRadius: 10,
              cursor: hasInput ? "pointer" : "not-allowed",
            }}
          >
            Clear
          </button>
        </div>
      </form>

      {/* Example queries */}
      <div style={{ marginTop: 32 }}>
        <h3 style={{ fontSize: 14, color: "#666", marginBottom: 12 }}>Try these examples:</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?",
            "Is climate change primarily caused by human activities?",
            "Did the 2020 US election have widespread fraud?",
          ].map((example, i) => (
            <button
              key={i}
              onClick={() => setInput(example)}
              style={{
                padding: "10px 14px",
                backgroundColor: "#f8f9fa",
                border: "1px solid #ddd",
                borderRadius: 8,
                textAlign: "left",
                cursor: "pointer",
                fontSize: 13,
                color: "#333",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#e9ecef"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
            >
              📝 {example}
            </button>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ 
        marginTop: 32, 
        padding: 20, 
        backgroundColor: "#f8f9fa", 
        borderRadius: 12,
        border: "1px solid #ddd"
      }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, color: "#666" }}>How FactHarbor Works</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[
            { icon: "🔍", title: "Research", desc: "Searches multiple sources" },
            { icon: "📊", title: "Extract", desc: "Identifies claims & facts" },
            { icon: "⚖️", title: "Analyze", desc: "Weighs evidence" },
            { icon: "📋", title: "Report", desc: "Transparent verdict" },
          ].map((step, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{step.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#333" }}>{step.title}</div>
              <div style={{ fontSize: 11, color: "#666" }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
