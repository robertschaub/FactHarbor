# Gate 1 (“Claim Validation”) & ClaimType — Analysis, Issues, and Proposed Changes

**Date:** 2026-01-19  
**Audience:** Maintainers / Lead Dev / Pipeline owners  
**Scope:** OrchestratedPipeline + MonolithicToolLoop_CanonicalSchema + MonolithicToolLoop_DynamicSchema

---

## 1) Executive Summary

**Observation:** The original “Gate 1” concept (filter out opinions/predictions) is **more harmful than useful** in a fact-checking product because:

- Many real user inputs are **evaluative** (“fair”, “biased”, “good policy”, “reasonable”), yet still depend on **verifiable factual components** (timeline, procedure, legal standards, quotes, outcomes).
- A hard “opinion/prediction ⇒ stop” rule creates **false negatives** (no research), producing “Unverified 50%” boilerplate results that look like failures.
- Gate1 heuristics can reduce **coverage** (fewer sub-claims), distort **scope coverage**, and reduce **input neutrality** (question phrasing may trigger different markers).

**Recommendation:** Reframe Gate 1 as **Claim Characterization** (diagnostic metadata + budgeting hints), not a filter. Only filter extremely **content-poor** noise and optionally `checkWorthiness="low"` (budget protection), never “opinion/prediction” by itself.

---

## 2) What Gate 1 is today (current behavior)

### 2.1 Orchestrated pipeline (TypeScript orchestrator)

- **Gate1-lite** is applied in `understandClaim()` as a pre-research pre-filter.
- **Full Gate 1** exists in `apps/web/src/lib/analyzer/quality-gates.ts`, but is **not currently applied** to remove claims in the orchestrated path (it’s mainly for statistics / future use).

**Where this matters:**
- Gate1-lite runs **before** supplemental-claims logic. Any filtering here reduces downstream coverage and may change what gets researched and what ends up in verdicting.

### 2.2 Monolithic canonical pipeline

- Claim type is determined by the LLM during canonical “claim extraction” (`ClaimExtractionSchema` includes `claimType`).
- Historically, canonical used claimType to **early-return** for “opinion/prediction” (i.e., no research). This was a key failure mode.
- Current direction should be: claimType may exist as metadata, but must not block research.

### 2.3 Monolithic dynamic pipeline

- No explicit claimType is required in the dynamic schema. The dynamic path should still support evaluative/predictive inputs by:
  - decomposing into verifiable statements, and/or
  - describing criteria and producing a clearly labeled “assessment” (not pretending it’s a pure factual verification).

---

## 3) How “claimType” is currently determined

There are **two different claimType systems** today:

1) **Heuristic Gate1 claimType** (orchestrated quality-gates)
- Based on regex markers (opinion markers, future markers, specificity patterns) + lightweight “content word count”.
- Output: `"FACTUAL" | "OPINION" | "PREDICTION" | "AMBIGUOUS"`

**Heuristic details (why it’s questionable):**
- `PREDICTION` is chosen if any “future” marker matches (e.g., “will”, “going to”, “expected to”).
- `OPINION` is chosen if the opinion marker score is high enough (matches on phrases like “I think”, “should”, “best/worst”, etc.).
- `FACTUAL` is chosen if specificity signals are present (numbers/dates/attribution/comparison structure) and opinion score is low.
- Otherwise the claim is `AMBIGUOUS`.

These are **linguistic heuristics**, not ground truth. They frequently misclassify real-world evaluative questions that still have factual components.

2) **Canonical LLM claimType** (monolithic-canonical)
- LLM outputs `"factual" | "opinion" | "prediction" | "mixed"` as part of the schema.
- This can influence the monolithic loop (query formulation, extraction framing, etc.) depending on prompt usage.

**Issue:** Two parallel claimType systems drift and produce inconsistent behavior across pipelines.

---

## 4) Why Gate 1 filtering is harmful (failure modes)

### 4.1 False-negative “no research”

Inputs like:
- “The Bolsonaro judgment was fair and based on Brazil’s law”

can be labeled as “opinion”, but users expect:
- What was the ruling?
- What legal standards were applied?
- What procedural steps occurred?
- What criticisms exist, and are they evidence-based?

A filter converts an analyzable request into a “cannot fact-check” response.

### 4.2 Coverage loss and scope distortion

Filtering reduces sub-claims before supplemental-claim generation:
- fewer sub-claims ⇒ less chance to cover all scopes
- can bias what gets researched (and what ends up weighted into the overall verdict)

### 4.3 Input neutrality risks

Heuristic markers (e.g., “should”, “best”, “seems”) can appear more often depending on phrasing style. If they affect which claims enter research, question vs statement can diverge more than expected.

---

## 5) Proposed changes (recommended)

### Proposal A (minimal, low risk): Gate 1 becomes “Claim Characterization”

- **Rename semantics** in docs/code: Gate 1 is no longer “filter opinions/predictions”.
- **Do not filter** on “opinion/prediction” markers.
- Keep only:
  - filter extremely content-poor noise (spam / too vague), and
  - optional: `checkWorthiness="low"` for Gate1-lite (budget protection).
- Persist the characterization for transparency:
  - `claimType` (as a label)
  - `opinionScore`, `futureOriented`, `specificityScore`
  - `failureReason` only for “too vague”

### Proposal B (medium, improves correctness): Replace claimType with multi-axis “Claim Character”

Replace the single claimType with explicit axes (more stable and more actionable):
- **verifiability**: `high | medium | low`
- **timeOrientation**: `past_present | future | unknown`
- **normativity**: `evaluative | descriptive | mixed`
- **specificity**: `0..1`

Gate1 produces these as **metadata**, never a hard filter.

### Proposal C (bigger product win): Make evaluative claims first-class

For evaluative claims (“fair”, “reasonable”, “biased”):
- Ask the model to produce:
  - criteria (what “fair” means here),
  - factual sub-claims (procedural steps, citations, outcomes),
  - and a structured “assessment” that is clearly labeled as evaluative.

This prevents “truth percentage” from being the only representation of an inherently evaluative question.

---

## 6) Concrete implementation steps (suggested)

1) **Orchestrated**
   - Keep Gate1-lite only as budget protection (`checkWorthiness="low"` + “too vague”).
   - Store Gate1 characterization as metadata for inspection/debugging.
   - Update documentation/comments implying “filters opinions/predictions”.

2) **Canonical**
   - Remove any early-return behavior based on claimType.
   - Ensure prompts do not instruct “cannot fact-check opinions”; instead instruct decomposition and criteria framing.

3) **Dynamic**
   - Prefer “assessment” outputs and decompositions rather than “cannot fact-check”.

---

## 7) Acceptance criteria / success metrics

- Evaluative inputs no longer result in a boilerplate “cannot fact-check” response without research.
- Input neutrality regression stays within target (≤4% drift).
- Research budgets remain stable (no runaway costs from non-factual fluff).
- UI clearly communicates when an output is an **evaluative assessment** vs a pure factual verification.

