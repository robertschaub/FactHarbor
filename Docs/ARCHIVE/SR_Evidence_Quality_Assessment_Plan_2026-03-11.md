# SR Evidence Quality Assessment Plan

**Status:** 📋 Lead Developer Updated (Architect review addressed)
**Created:** 2026-03-11
**Author Role:** Senior Developer (Claude Opus 4.6)
**Depends on:** SR UCM Separation (COMPLETED)

---

## Problem Statement

SR evaluation currently sends raw search snippets (title + snippet) to the evaluation LLM as a flat, unweighted list. The LLM receives items like:

```
E1: "MBFC rates reitschuster.de as Mixed factual reporting"
E7: "Blog post mentioning reitschuster in passing"
```

Both look structurally identical. The LLM must infer evidence quality entirely from content — there is no `probativeValue` label, no source authority classification, no evidence categorization. This leads to:

- **Inconsistent scoring** — the same domain can score differently depending on which snippets happen to appear first in the flat list
- **Weak signals inflated** — low-quality mentions carry equal visual weight to Tier 1 fact-checker ratings
- **Scores too high for well-documented unreliable sources** — e.g., reitschuster.de scores 0.35 despite CORRECTIV fact-checks + MBFC "Mixed" rating (baseline: 0.25)

### Root Cause

The main analysis pipeline solves this with a two-stage approach:
1. **LLM assigns probativeValue** (high/medium/low) during evidence extraction
2. **Deterministic filter** validates and filters by probativeValue (`evidence-filter.ts`)

SR skips both stages entirely. Evidence goes raw from search → LLM evaluation.

---

## Design Principles

1. **Evidence quality is the core competency** — SR must assess evidence with the same rigor as the pipeline
2. **LLM Intelligence mandate** — quality assessment is a semantic decision → must use LLM, not heuristics
3. **No forced scoring bands** — the evaluation LLM decides the score; we improve its input quality, not constrain its output
4. **Clone, don't couple** — SR will eventually be independently deployable; share patterns but not runtime dependencies
5. **Cost-conscious** — one cheap Haiku batch call, not per-item assessment

---

## Locked Architecture Decision

SR must remain deployment-separable from the main analysis pipeline.

- **Dedicated SR prompt surface only:** all new prompt text for this feature lives in `apps/web/prompts/source-reliability.prompt.md` (or SR prompt variants under the same pipeline key), not inline in route code and not in claimboundary prompts.
- **Dedicated SR UCM only:** all feature toggles/settings live under Source Reliability config (`sr.default.json` / `SourceReliabilityConfig`), not shared with pipeline/text-analysis profiles.
- **No cross-pipeline prompt coupling:** SR evaluation may reuse utility code patterns, but prompt sections/keys, rendering, and variables are SR-owned.
- **Forward deployment boundary:** feature code should be structured as SR modules callable from the current route, so it can move to a standalone SR service later without changing behavior.

---

## Architect Review Resolutions (2026-03-11)

This plan now incorporates the Lead Architect review decisions:

- **H1 resolved:** enrichment-call failure is a **warning-level quality degradation**, not informational noise.
- **H2 resolved:** `EnrichedEvidenceItem` is SR-module-internal only; no export to shared analyzer types.
- **H3 resolved:** quality assessment is budget-aware and must not violate per-domain SR timeout guarantees.
- **M1 resolved:** no inline assessor-name duplication; quality prompt reuses SR prompt taxonomy.
- **M2 resolved:** enrichment version metadata is persisted for cache provenance and targeted invalidation.
- **M3 resolved:** assessment batch size gets an independent UCM cap.
- **M4 resolved:** prompt rendering path is unified under SR prompt-loader conventions.
- **L1 resolved:** `evidenceCategory` becomes a typed union with `other` and `unclassified`.
- **L2 resolved:** shared evidence library idea moved out of this implementation plan.
- **L3 resolved:** multilingual quality-assessment tests are required.

---

## Architecture

### Current Flow (flat, unweighted)

```
Search queries → Search results → Relevance filter → Evidence pack (flat list) → Evaluation LLM
                                                       [E1, E2, ... E12]          (guesses quality)
```

### Proposed Flow (quality-assessed, tiered)

```
Search queries → Search results → Relevance filter → Evidence pack → Quality Assessment (Haiku batch)
                                                                          ↓
                                                      Enriched evidence pack → Evaluation LLM
                                                      [E1 HIGH fact_checker_rating,              (knows quality)
                                                       E5 MEDIUM academic_research,
                                                       E9 LOW general_mention]
```

---

## Implementation Plan

### Phase 1: Evidence Quality Assessment Call (~2h)

**Goal:** Add a batch Haiku call that assigns `probativeValue` and `evidenceCategory` to each evidence pack item.

**Location:** SR-owned module (called by route), e.g. `apps/web/src/lib/source-reliability/evidence-quality-assessment.ts`
Route integration remains in `apps/web/src/app/api/internal/evaluate-source/route.ts`.

**New function signature:**
```typescript
type EvidenceProbativeValue = "high" | "medium" | "low";

type EvidenceCategory =
  | "fact_checker_rating"
  | "press_council_ruling"
  | "academic_research"
  | "journalistic_analysis"
  | "industry_report"
  | "general_mention"
  | "opinion"
  | "self_published"
  | "other"
  | "unclassified";

// SR-internal only. Do not export to shared analyzer types.
interface EnrichedEvidenceItem {
  id: string;
  probativeValue: EvidenceProbativeValue;
  evidenceCategory: EvidenceCategory;
}

async function assessEvidenceQuality(
  domain: string,
  items: EvidencePackItem[]
): Promise<EnrichedEvidenceItem[]>
```

`assessEvidenceQuality()` returns SR-internal classifications only. The merge step writes optional fields onto `EvidencePackItem` instances in the route/module boundary.

**Merge contract (mandatory):**
- `N items in` -> `N items out` (never drop evidence items)
- Merge by exact `id` only
- Missing/invalid classification for an item -> default `probativeValue: "low"`, `evidenceCategory: "unclassified"`
- Unknown IDs returned by the LLM are ignored (logged as debug diagnostics)
- Duplicate IDs in LLM output use first valid occurrence; later duplicates ignored
- Full call failure/timeout -> pass through original items unchanged (current behavior)

**LLM prompt design (Haiku batch, SR-owned prompt section):**
```
For each evidence item about the domain "{domain}", assess:
1. probativeValue: "high" | "medium" | "low"
   - HIGH: Direct fact-checker rating, press council ruling, official regulatory finding
   - MEDIUM: Academic research, journalistic investigation, media analysis,
     industry report with methodology
   - LOW: Blog mention, social media reference, passing mention in unrelated article,
     opinion piece without evidence, self-published content
2. evidenceCategory: What type of evidence is this?
   (fact_checker_rating, press_council_ruling, academic_research,
    journalistic_analysis, industry_report, general_mention, opinion, self_published)

Items:
E1: [title] — [snippet]
E2: [title] — [snippet]
...

Return JSON array: [{id, probativeValue, evidenceCategory}, ...]
```

**Prompt source (mandatory):**
- Add dedicated section(s) to `apps/web/prompts/source-reliability.prompt.md` for this step (for example `## EVIDENCE QUALITY ASSESSMENT TASK` and `## EVIDENCE QUALITY ASSESSMENT OUTPUT FORMAT`)
- Reuse the existing SR "Recognized Independent Assessors" taxonomy from the same prompt file instead of duplicating assessor lists in route/module code
- Render via prompt-loader using SR pipeline key (`source-reliability`)
- Keep only structural assembly in code (`items`, `domain`, variables), no hardcoded semantic prompt text in route/module

**Model:** Claude Haiku 4.5 (fast, cheap — ~$0.0025 per batch of 30 items)

**Error handling and severity:**
- If Haiku call fails, fall back to unenriched evidence pack (flat list) and continue evaluation.
- This is a **quality-affecting degraded mode** and must be logged/emitted as **warning** (`sr_evidence_quality_assessment_failed`), not info.
- Rationale: the fallback reintroduces the known quality weakness this feature is intended to reduce.
- **Warning system note:** SR uses its own caveat system (`ResponsePayload.caveats: string[]`), separate from the pipeline's `AnalysisWarningType` / `WARNING_CLASSIFICATION` registry in `warning-display.ts`. The AGENTS.md rule "All warning types MUST be registered in warning-display.ts" applies to pipeline warnings only. SR caveats are surfaced via `applyEvidenceQualityAssessmentCaveat()` in the SR route. If SR warnings are ever unified with the pipeline system, this warning type must be registered.
- Observability rule: include only domain, error class, latency, item count, and timeout info (no snippet text in logs).

**Placement in code:** After evidence pack assembly (~line 1253), before primary evaluation call (~line 1370).

### Phase 2: Tiered Evidence Presentation (~1h)

**Goal:** Present evidence to the evaluation LLM grouped by probativeValue, not as a flat list.

**Current prompt format:**
```
EVIDENCE PACK (12 items):
E1: [title] — [snippet] (source: [url])
E2: [title] — [snippet] (source: [url])
...
```

**New prompt format:**
```
EVIDENCE PACK (12 items, quality-assessed):

═══ HIGH PROBATIVE VALUE (fact-checker ratings, press council rulings) ═══
E1 [fact_checker_rating]: [title] — [snippet] (source: [url])
E4 [press_council_ruling]: [title] — [snippet] (source: [url])

═══ MEDIUM PROBATIVE VALUE (academic research, journalistic analysis) ═══
E3 [academic_research]: [title] — [snippet] (source: [url])
E6 [journalistic_analysis]: [title] — [snippet] (source: [url])

═══ LOW PROBATIVE VALUE (general mentions, opinions) ═══
E7 [general_mention]: [title] — [snippet] (source: [url])
E9 [opinion]: [title] — [snippet] (source: [url])
```

**Prompt instruction update:** Add to both primary and refinement prompts:
```
Evidence items are pre-assessed for probativeValue (HIGH/MEDIUM/LOW).
Weight HIGH probativeValue evidence most heavily — these are authoritative assessments.
LOW probativeValue items provide context but should not override HIGH/MEDIUM signals.
If HIGH items consistently indicate unreliability, the score should reflect that
even if LOW items are ambiguous or neutral.
```

### Phase 3: EvidencePack Schema Extension (~30min)

**Goal:** Persist enriched evidence in the SR cache for debugging and future use.

**Changes to `EvidencePackItem` type:**
```typescript
// Existing fields (unchanged)
id: string;
url: string;
title: string;
snippet: string | null;
query: string;
provider: string;

// New fields (Phase 1)
probativeValue?: "high" | "medium" | "low";    // Optional for backwards compat
evidenceCategory?: EvidenceCategory;            // Optional for backwards compat
enrichmentVersion?: 1;                          // Distinguishes assessed LOW vs unassessed
```

```typescript
// New metadata (EvidencePack-level)
qualityAssessment?: {
  status: "applied" | "skipped" | "failed";
  version?: 1;
  model?: string;
  timeoutMs?: number;
  latencyMs?: number;
  assessedItemCount?: number;
  skippedReason?: "disabled" | "empty_evidence" | "budget_guard";
  errorType?: "timeout" | "provider_error" | "parse_error" | "unknown";
};
```

The `evidence_pack` column in SQLite already stores JSON — no schema migration needed. Old cached entries simply lack the new fields.

### Phase 4: UCM Configuration (~30min)

**Goal:** Make evidence quality assessment configurable via SR UCM.

**New fields in `sr.default.json` / `SrConfig`:**
```json
{
  "evidenceQualityAssessment": {
    "enabled": true,
    "model": "haiku",
    "timeoutMs": 8000,
    "maxItemsPerAssessment": 30,
    "minRemainingBudgetMs": 20000
  }
}
```

> **Updated 2026-03-11:** `maxItemsPerAssessment` raised from 12 → 30 when keyword-based pre-filtering (`isRelevantSearchResult`) was replaced with LLM relevance classification. The LLM now classifies a `relevant: boolean` field alongside `probativeValue` and `evidenceCategory`, and irrelevant items are filtered post-assessment. `maxEvidenceItems` also raised from 12 → 30.

**Config behavior:**
- `enabled: false` → skip quality assessment, use flat evidence pack (current behavior)
- `model` → which model to use for the batch assessment call
- `timeoutMs` → timeout for the quality assessment call (separate from main eval timeout)
- `maxItemsPerAssessment` → batch size for assessment call; also determines relevance filtering batch size
- `minRemainingBudgetMs` → skip assessment if remaining per-domain budget is too tight
- Config lives in **Source Reliability profile only** (`sr.default.json` / `SourceReliabilityConfig`)
- No shared knobs with claimboundary/pipeline config

### Phase 5: Timeout Budget Integration (~45min)

**Goal:** Ensure assessment call never causes per-domain timeout cascade.

**Current timeout context (existing code):**
- SR prefetch per-domain timeout: `SR_CONFIG.evalTimeoutMs` (default 90s)
- SR route primary evaluation timeout: 90s
- SR route refinement timeout: 90s

**Mandatory behavior:**
- Pass request start timestamp and per-domain budget into route (`budgetMs` based on `SR_CONFIG.evalTimeoutMs`).
- Compute `remainingBudgetMs` before each major SR step.
- Run quality assessment only if `remainingBudgetMs >= minRemainingBudgetMs`.
- Clamp assessment timeout to the smaller of configured timeout and current budget headroom.
- If budget is tight, skip quality assessment with `qualityAssessment.status="skipped"` and `skippedReason="budget_guard"` (no hard failure).
- Keep core evaluation path prioritized over enrichment when budgets conflict.

---

## What This Does NOT Do

- **No deterministic scoring rules.** No "MBFC Mixed = score 0.29-0.38". The LLM decides.
- **No forced bands or cumulative rules.** If evidence is strong enough, the LLM will score appropriately.
- **No shared runtime dependency with pipeline.** Cloned pattern, independent implementation.
- **No changes to search queries.** Evidence collection stays the same; only assessment changes.
- **No changes to the main analysis pipeline.** This is SR-only.

---

## Expected Impact

**reitschuster.de example:**
- Current: E1-E12 flat list → LLM sees CORRECTIV fact-checks + blog mentions at equal weight → scores 0.35
- After: E1 [HIGH fact_checker_rating] CORRECTIV + E3 [HIGH fact_checker_rating] MBFC Mixed → LLM naturally weights these → expected score ~0.22-0.28

**srf.ch example:**
- Current: flat list → some evidence quality is missed → scores ~82%
- After: HIGH items showing "public broadcaster, editorial standards, press council membership" → expected score ~85%

The key insight: **we're not telling the LLM what to score — we're telling it which evidence matters most.** The LLM already knows how to interpret fact-checker ratings; it just needs to know which items ARE fact-checker ratings.

---

## Cost Analysis

| Component | Cost per domain | Notes |
|-----------|----------------|-------|
| Current: 2 LLM calls (Claude + GPT) | ~$0.02-0.05 | Unchanged |
| New: 1 Haiku batch call | ~$0.0025 | Up to 30 items, ~1200 input tokens, ~500 output tokens |
| **Total increase** | **~5-12%** | Negligible |

Cost scales approximately linearly with `maxItemsPerAssessment`; this parameter is intentionally independent from evidence retrieval count.

---

Deferred architecture research item ("shared evidence-core feasibility") is tracked in [Backlog.md](c:/DEV/FactHarbor/Docs/STATUS/Backlog.md).

---

## Rollback

- Phase 1-2: Set `evidenceQualityAssessment.enabled: false` in UCM → reverts to flat evidence pack
- Phase 3: Backwards compatible (optional fields)
- Phase 4: UCM config only — remove fields to revert

---

## Testing

1. **Unit test:** `assessEvidenceQuality()` with mock Haiku responses — verify enrichment
2. **Unit test:** merge contract (`N in -> N out`, missing IDs, unknown IDs, duplicate IDs, invalid enums, timeout fallback)
3. **Unit test:** prompt loading/rendering for SR evidence-quality sections (fails closed when section missing)
4. **Unit test:** timeout budget guard (`budget_guard` skip path, timeout clamping, warning emission on assessment failure)
5. **Integration test:** Full SR evaluation with quality assessment enabled vs disabled — compare scores
6. **Multilingual integration test:** evidence snippets in German/French/English in one pack; verify stable probative labeling and no English-only failure mode
7. **Spot-check domains:**
   - reitschuster.de: should drop from ~0.35 to ~0.22-0.28 (baseline: 0.25)
   - foxnews.com: should drop from ~0.38 to ~0.28-0.33 (baseline: 0.28)
   - srf.ch: should stay ~0.82-0.87 (baseline: 0.85)
   - weltwoche.de: should stay ~0.22 (already correct)
   - These are diagnostic expectations, not hard pass/fail gates (live web + LLM variance)
8. **Regression guard:** Run all existing SR-related tests (`npm test`)
