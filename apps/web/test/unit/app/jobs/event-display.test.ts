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

  it("classifies fallback model recovery as info overrideLevel", () => {
    const d = classifyEvent("warn", "Stage 1 Pass 2 recovered via fallback model (claude-haiku-4-5-20251001); review claim quality warnings.");
    expect(d.phase).toBe("understand");
    expect(d.label).toBe("Fallback model used");
    expect(d.params).toContain("claude-haiku-4-5-20251001");
    expect(d.overrideLevel).toBe("info");
  });

  // ── Setup — new messages ──────────────────────────────────────────────────
  it("classifies URL fetch (url input type)", () => {
    const d = classifyEvent("info", "Fetching URL content...");
    expect(d.phase).toBe("setup");
    expect(d.label).toBe("Fetching URL content");
  });

  it("classifies URL fetch (auto-detected URL in text)", () => {
    const d = classifyEvent("info", "Detected URL input — fetching content...");
    expect(d.phase).toBe("setup");
    expect(d.label).toBe("Fetching URL content");
  });

  it("classifies LLM model event", () => {
    const d = classifyEvent("info", "LLM: claude-haiku-4-5-20251001 — extraction & research");
    expect(d.phase).toBe("setup");
    expect(d.label).toBe("LLM model");
    expect(d.params).toContain("claude-haiku-4-5-20251001");
  });

  // ── LLM call trace ───────────────────────────────────────────────────────
  it("classifies LLM call: claim extraction Pass 1 as understand phase", () => {
    const d = classifyEvent("info", "LLM call: claim extraction (Pass 1) — claude-haiku-4-5-20251001");
    expect(d.phase).toBe("understand");
    expect(d.label).toBe("Claim extraction (Pass 1)");
    expect(d.params).toBe("claude-haiku-4-5-20251001");
  });

  it("classifies LLM call: Gate 1 validation as understand phase", () => {
    const d = classifyEvent("info", "LLM call: Gate 1 validation — claude-haiku-4-5-20251001");
    expect(d.phase).toBe("understand");
    expect(d.label).toBe("Gate 1 validation");
    expect(d.params).toBe("claude-haiku-4-5-20251001");
  });

  it("classifies LLM call: advocate as verdict phase", () => {
    const d = classifyEvent("info", "LLM call: advocate — claude-sonnet-4-5");
    expect(d.phase).toBe("verdict");
    expect(d.label).toBe("Advocate");
    expect(d.params).toBe("claude-sonnet-4-5");
  });

  it("classifies LLM call: self-consistency as verdict phase", () => {
    const d = classifyEvent("info", "LLM call: self-consistency — claude-sonnet-4-5");
    expect(d.phase).toBe("verdict");
    expect(d.label).toBe("Self-consistency");
    expect(d.params).toBe("claude-sonnet-4-5");
  });

  it("classifies LLM call: challenger as verdict phase", () => {
    const d = classifyEvent("info", "LLM call: challenger — claude-sonnet-4-5");
    expect(d.phase).toBe("verdict");
    expect(d.label).toBe("Challenger");
    expect(d.params).toBe("claude-sonnet-4-5");
  });

  it("classifies LLM call: reconciler as verdict phase", () => {
    const d = classifyEvent("info", "LLM call: reconciler — claude-sonnet-4-5");
    expect(d.phase).toBe("verdict");
    expect(d.label).toBe("Reconciler");
    expect(d.params).toBe("claude-sonnet-4-5");
  });

  it("classifies LLM call: validation as verdict phase", () => {
    const d = classifyEvent("info", "LLM call: validation — claude-sonnet-4-5");
    expect(d.phase).toBe("verdict");
    expect(d.label).toBe("Validation");
    expect(d.params).toBe("claude-sonnet-4-5");
  });

  it("classifies LLM call: verdict narrative as verdict phase", () => {
    const d = classifyEvent("info", "LLM call: verdict narrative — claude-sonnet-4-5");
    expect(d.phase).toBe("verdict");
    expect(d.label).toBe("Verdict narrative");
    expect(d.params).toBe("claude-sonnet-4-5");
  });

  it("classifies LLM call: clustering as cluster phase", () => {
    const d = classifyEvent("info", "LLM call: clustering — claude-sonnet-4-5");
    expect(d.phase).toBe("cluster");
    expect(d.label).toBe("Clustering");
    expect(d.params).toBe("claude-sonnet-4-5");
  });

  it("classifies LLM call: query generation as research phase", () => {
    const d = classifyEvent("info", "LLM call: query generation — claude-haiku-4-5-20251001");
    expect(d.phase).toBe("research");
    expect(d.label).toBe("Query generation");
    expect(d.params).toBe("claude-haiku-4-5-20251001");
  });

  it("classifies LLM call: relevance classification as research phase", () => {
    const d = classifyEvent("info", "LLM call: relevance classification — claude-haiku-4-5-20251001");
    expect(d.phase).toBe("research");
    expect(d.label).toBe("Relevance classification");
    expect(d.params).toBe("claude-haiku-4-5-20251001");
  });

  it("classifies LLM call: evidence extraction as research phase", () => {
    const d = classifyEvent("info", "LLM call: evidence extraction — claude-haiku-4-5-20251001");
    expect(d.phase).toBe("research");
    expect(d.label).toBe("Evidence extraction");
    expect(d.params).toBe("claude-haiku-4-5-20251001");
  });

  it("classifies LLM call: preliminary evidence as understand phase", () => {
    const d = classifyEvent("info", "LLM call: preliminary evidence — claude-haiku-4-5-20251001");
    expect(d.phase).toBe("understand");
    expect(d.label).toBe("Preliminary evidence");
    expect(d.params).toBe("claude-haiku-4-5-20251001");
  });

  it("classifies LLM call: evidence applicability as research phase", () => {
    const d = classifyEvent("info", "LLM call: evidence applicability — claude-haiku-4-5-20251001");
    expect(d.phase).toBe("research");
    expect(d.label).toBe("Evidence applicability");
    expect(d.params).toBe("claude-haiku-4-5-20251001");
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

  it("classifies contradicting evidence search iterations", () => {
    const d = classifyEvent("info", "Searching for contradicting evidence (2/4)...");
    expect(d.phase).toBe("research");
    expect(d.label).toBe("Contradicting evidence search");
    expect(d.params).toBe("2/4");
  });

  it("classifies search provider warn with params and overrideLevel info", () => {
    const d = classifyEvent("warn", 'Search provider "google-cse" error: quota exceeded');
    expect(d.phase).toBe("research");
    expect(d.label).toBe("Search provider error");
    expect(d.params).toContain("google-cse");
    expect(d.params).toContain("quota exceeded");
    expect(d.overrideLevel).toBe("info");
  });

  it("classifies successful search event as info with overrideLevel", () => {
    const d = classifyEvent("warn", "Search: google-cse, brave — 12 results");
    expect(d.phase).toBe("research");
    expect(d.label).toBe("Search results");
    expect(d.params).toContain("google-cse");
    expect(d.overrideLevel).toBe("info");
  });

  it("classifies preliminary search error", () => {
    const d = classifyEvent("warn", "Preliminary search error: serpapi - rate limited");
    expect(d.phase).toBe("research");
    expect(d.label).toBe("Search error");
    expect(d.params).toContain("serpapi");
  });

  it("classifies research time budget event", () => {
    const d = classifyEvent("info", "Research time budget reached (5 min), proceeding to analysis...");
    expect(d.phase).toBe("research");
    expect(d.label).toBe("Research time limit reached");
    expect(d.params).toContain("5 min");
  });

  it("classifies no new evidence event", () => {
    const d = classifyEvent("info", "No new evidence found in 3 consecutive iterations, proceeding...");
    expect(d.phase).toBe("research");
    expect(d.label).toBe("No new evidence found");
    expect(d.params).toContain("3");
  });

  it("classifies research time budget during contradiction search", () => {
    const d = classifyEvent("info", "Research time budget reached during contradiction search, proceeding...");
    expect(d.phase).toBe("research");
    expect(d.label).toBe("Contradiction search time limit reached");
  });

  it("classifies source reliability evaluation", () => {
    const d = classifyEvent("info", "Evaluating source reliability...");
    expect(d.phase).toBe("research");
    expect(d.label).toBe("Evaluating source reliability");
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

  it("classifies debate advocate step", () => {
    const d = classifyEvent("info", "Verdict debate: advocate — 4 claims");
    expect(d.phase).toBe("verdict");
    expect(d.label).toBe("Advocate verdict");
    expect(d.params).toBe("4 claims");
  });

  it("classifies debate self-consistency step", () => {
    const d = classifyEvent("info", "Verdict debate: self-consistency check");
    expect(d.phase).toBe("verdict");
    expect(d.label).toBe("Self-consistency check");
  });

  it("classifies debate adversarial challenge step", () => {
    const d = classifyEvent("info", "Verdict debate: adversarial challenge");
    expect(d.phase).toBe("verdict");
    expect(d.label).toBe("Adversarial challenge");
  });

  it("classifies debate reconciliation step", () => {
    const d = classifyEvent("info", "Verdict debate: reconciliation");
    expect(d.phase).toBe("verdict");
    expect(d.label).toBe("Reconciling verdicts");
  });

  it("classifies debate validation step", () => {
    const d = classifyEvent("info", "Verdict debate: validation");
    expect(d.phase).toBe("verdict");
    expect(d.label).toBe("Validating verdicts");
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

  it("classifies 'Analysis complete.' (dot variant)", () => {
    const d = classifyEvent("info", "Analysis complete.");
    expect(d.phase).toBe("done");
    expect(d.label).toBe("Analysis complete");
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

  it("labels misc as 'Additional' (not 'Other')", () => {
    expect(PHASE_LABELS["misc"]).toBe("Additional");
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
