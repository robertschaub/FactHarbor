import { describe, it, expect } from "vitest";
import { classifyEvent, formatLocalTime, PHASE_LABELS } from "@/app/jobs/[id]/lib/event-display";

describe("classifyEvent", () => {
  // ── Setup ────────────────────────────────────────────────────────────────
  it("classifies 'Job created'", () => {
    const d = classifyEvent("info", "Job created");
    expect(d.phase).toBe("setup");
    expect(d.label).toBe("Job created");
  });

  it("classifies 'Runner started'", () => {
    const d = classifyEvent("info", "Runner started");
    expect(d.phase).toBe("setup");
    expect(d.label).toBe("Analysis started");
  });

  it("classifies 'Preparing input (pipeline: claimboundary)'", () => {
    const d = classifyEvent("info", "Preparing input (pipeline: claimboundary)");
    expect(d.phase).toBe("setup");
    expect(d.label).toBe("Preparing input");
    expect(d.params).toBe("pipeline: claimboundary");
  });

  // ── Understand ───────────────────────────────────────────────────────────
  it("classifies Pass 1", () => {
    const d = classifyEvent("info", "Extracting claims: Pass 1 (rapid scan)...");
    expect(d.phase).toBe("understand");
    expect(d.label).toBe("Scanning input — Pass 1");
  });

  it("classifies preliminary web search", () => {
    const d = classifyEvent("info", "Extracting claims: preliminary web search...");
    expect(d.phase).toBe("understand");
    expect(d.label).toBe("Initial web search");
  });

  it("classifies Pass 2", () => {
    const d = classifyEvent("info", "Extracting claims: Pass 2 (evidence-grounded refinement)...");
    expect(d.phase).toBe("understand");
    expect(d.label).toBe("Refining claims — Pass 2");
  });

  it("classifies Gate 1 validation", () => {
    const d = classifyEvent("info", "Extracting claims: Gate 1 validation...");
    expect(d.phase).toBe("understand");
    expect(d.label).toBe("Gate 1 validation");
  });

  it("classifies reprompt attempt with params", () => {
    const d = classifyEvent("info", "Extracting claims: reprompt attempt 2/3...");
    expect(d.phase).toBe("understand");
    expect(d.label).toBe("Reprompt");
    expect(d.params).toBe("2/3");
  });

  // ── Research ─────────────────────────────────────────────────────────────
  it("classifies researching evidence", () => {
    const d = classifyEvent("info", "Researching evidence for claims...");
    expect(d.phase).toBe("research");
    expect(d.label).toBe("Searching for evidence");
  });

  it("classifies contrarian evidence search", () => {
    const d = classifyEvent("info", "Running contrarian evidence search...");
    expect(d.phase).toBe("research");
    expect(d.label).toBe("Contrarian evidence search");
  });

  it("classifies search provider warn with params", () => {
    const d = classifyEvent("warn", 'Search provider "google-cse" error: quota exceeded');
    expect(d.phase).toBe("research");
    expect(d.label).toBe("Search provider error");
    expect(d.params).toContain("google-cse");
    expect(d.params).toContain("quota exceeded");
  });

  // ── Cluster ──────────────────────────────────────────────────────────────
  it("classifies clustering", () => {
    const d = classifyEvent("info", "Clustering evidence into boundaries...");
    expect(d.phase).toBe("cluster");
  });

  // ── Verdict ──────────────────────────────────────────────────────────────
  it("classifies generating verdicts", () => {
    const d = classifyEvent("info", "Generating verdicts...");
    expect(d.phase).toBe("verdict");
    expect(d.label).toBe("Generating verdicts");
  });

  it("classifies aggregating", () => {
    const d = classifyEvent("info", "Aggregating final assessment...");
    expect(d.phase).toBe("verdict");
    expect(d.label).toBe("Aggregating assessment");
  });

  // ── Quality ──────────────────────────────────────────────────────────────
  it("classifies TIGERScore", () => {
    const d = classifyEvent("info", "Performing holistic TIGERScore quality evaluation...");
    expect(d.phase).toBe("quality");
  });

  // ── Done ─────────────────────────────────────────────────────────────────
  it("classifies Done", () => {
    const d = classifyEvent("info", "Done");
    expect(d.phase).toBe("done");
    expect(d.label).toBe("Analysis complete");
  });

  it("classifies Result stored", () => {
    const d = classifyEvent("info", "Result stored");
    expect(d.phase).toBe("done");
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────
  it("classifies job cancelled", () => {
    const d = classifyEvent("info", "Job cancelled by user");
    expect(d.phase).toBe("lifecycle");
  });

  it("classifies retry with params", () => {
    const d = classifyEvent("info", "Retry job created from job-abc-123 (retry #2, pipeline: claimboundary)");
    expect(d.phase).toBe("lifecycle");
    expect(d.label).toBe("Retry created");
    expect(d.params).toContain("job-abc-123");
    expect(d.params).toContain("retry #2");
  });

  // ── Error ────────────────────────────────────────────────────────────────
  it("classifies error level events", () => {
    const d = classifyEvent("error", "Something went wrong unexpectedly");
    expect(d.phase).toBe("error");
    expect(d.isStackTrace).toBeFalsy();
  });

  it("classifies stack trace events", () => {
    const d = classifyEvent("error", "Stack (truncated):\n  at fn (file.ts:10)");
    expect(d.phase).toBe("error");
    expect(d.isStackTrace).toBe(true);
  });

  it("classifies failed verdict extraction", () => {
    const d = classifyEvent("error", "Failed to extract verdict: NullReferenceException");
    expect(d.phase).toBe("error");
    expect(d.label).toBe("Verdict extraction failed");
    expect(d.params).toContain("NullReferenceException");
  });

  // ── Misc fallback ────────────────────────────────────────────────────────
  it("falls back to misc for unknown messages", () => {
    const d = classifyEvent("info", "Some completely unknown pipeline message");
    expect(d.phase).toBe("misc");
    expect(d.label).toBe("Some completely unknown pipeline message");
  });

  it("truncates long unknown messages in label", () => {
    const long = "A".repeat(100);
    const d = classifyEvent("info", long);
    expect(d.phase).toBe("misc");
    expect(d.label.length).toBeLessThanOrEqual(80);
  });
});

describe("PHASE_LABELS", () => {
  it("has a label for every phase", () => {
    const phases = ["setup", "understand", "research", "cluster", "verdict", "quality", "done", "lifecycle", "error", "misc"] as const;
    for (const p of phases) {
      expect(PHASE_LABELS[p]).toBeTruthy();
    }
  });
});

describe("formatLocalTime", () => {
  it("formats a valid ISO timestamp", () => {
    const result = formatLocalTime("2026-03-16T14:32:05Z");
    expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });

  it("returns input on invalid timestamp", () => {
    const result = formatLocalTime("not-a-date");
    expect(result).toBe("not-a-date");
  });
});
