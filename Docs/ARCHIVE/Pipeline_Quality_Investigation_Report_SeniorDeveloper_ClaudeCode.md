# Pipeline Quality Investigation — Report: Senior Developer (Claude Code Opus)

**Date:** 2026-02-13
**Hub Document:** Docs/WIP/Pipeline_Quality_Investigation_2026-02-13.md
**Status:** DONE

---

## Implementation Log

| Phase | Commit | What |
|-------|--------|------|
| 1-3 (Report Assembly + Fallback + Budget) | `4e000e9` | Enriched contexts, rating labels, DEGRADED status, budget fix |
| 4 (Context ID Stability) | `61050da` | Batched LLM similarity remap, moved orphan check, 4-layer defense |
| 4-hotfix (Claim assignment ordering) | `ab28b01` | Moved claim assignments before `ensureContextsCoverAssignments` — fixes rollback regression |
| Bonus (harmPotential inflation) | `0c97838` | Narrowed HIGH criteria, removed keyword list from verdict prompt, made override one-directional |
| Prompt caching + docs | `3a1012a` | Anthropic ephemeral cache on system messages; WIP cleanup; investigation files |
| Single-context enrichment + search ordering | `93a5813` | Synthesize per-context verdict for single-context; stamp contextId on claim verdicts; move contradiction search before cross-context discovery |
| Verdict direction auto-correction | *uncommitted* | Enable `autoCorrect: true` with LLM `suggestedPct`; capped fallback formula; `rating` update; Direction Semantics doc sync |

**Build:** passes.

### harmPotential "High Harm" Inflation (discovered during implementation)
**Finding:** Most claims showed "High Harm" because the verdict validation prompt (`text-analysis-verdict.prompt.md`) used a broad keyword list (die, kill, harm, risk, fraud...) to override the understand phase's classification. Nearly all real-world topics matched at least one keyword.
**Fix:** Removed keyword list (AGENTS.md violation), aligned all prompts to narrow criteria (death/severe injury/safety hazards/major fraud only), made verdict override one-directional (can downgrade, cannot escalate medium→high).

---

## Files Analyzed

- `apps/web/src/lib/analyzer/orchestrated.ts` — Main pipeline (~13,600 lines), examined report assembly section
- `artifacts/job_127d_result.json` — Fox News article job result JSON
- `apps/api/factharbor.db` — SQLite database, queried recent jobs
- `apps/web/prompts/text-analysis/text-analysis-verdict.prompt.md` — Verdict validation prompt
- `apps/web/src/lib/analyzer/prompts/base/understand-base.ts` — Understand phase prompt base

---

## Findings

### CONFIRMED: Issue 1 — articleVerdict Structure Issue

**Status:** PARTIALLY CONFIRMED

The `articleVerdict` IS populated inside `articleAnalysis`, but there's no TOP-LEVEL `articleVerdict` field. The data exists but structure may not match UI expectations.

---

### CONFIRMED: Issue 2 — analysisContexts Missing Verdicts and Evidence

**Status:** FULLY CONFIRMED

The code returns RAW context metadata WITHOUT enrichment:
```typescript
analysisContexts: state.understanding!.analysisContexts,
```

Missing fields: `verdict`, `evidenceItems`, `claimVerdicts`

Available data to populate: `verdictSummary.analysisContextAnswers[]`, `evidenceItems[]` with `contextId`, `claimVerdicts[]` with `contextId`

---

### CONFIRMED: Issue 3 — Context ID Instability

**Status:** FULLY CONFIRMED

Log evidence shows orphaned claims: `Claim SC1 assigned to non-existent context CTX_03c90aa6`

Root cause: `refineContextsFromEvidence()` creates new context IDs without remapping existing assignments.

---

### CONFIRMED: Issue 4 — Silent Verdict Fallback

**Status:** FULLY CONFIRMED

All 8 claims in job 127d have `verdict: 50, confidence: 50, reasoning: "No verdict returned by LLM for this claim."`

---

### CONFIRMED: Issue 5 — 7-Point Rating Labels Missing

**Status:** FULLY CONFIRMED

`percentageToClaimVerdict()` exists but is never called to set the `rating` field.

---

### CONFIRMED: Issue 6 — Budget Counter Mismatch

**Status:** FULLY CONFIRMED

`budgetStats.llmCalls = 1` vs `researchStats.llmCalls = 21`

---

## Proposals

### Proposal 1: Fix Report Assembly (P0)

1. Enrich `analysisContexts` with verdicts and evidence before returning
2. Add `rating` field to claim verdicts using `percentageToClaimVerdict()`
3. Use `state.llmCalls` for accurate budget stats

### Proposal 2: Fix Context ID Stability (P0)

1. Build ID remapping table when creating new contexts
2. Remap all claim/evidence assignments
3. Validate no orphaned claims remain

### Proposal 3: Fix Silent Failure Patterns (P1)

1. Mark reports with wholesale fallback as DEGRADED
2. Implement structured output recovery
3. Surface warnings prominently

---

## "High Harm" Signal Issue: ALREADY FIXED

The issue has been corrected in the current codebase.

**Evidence:**
1. `text-analysis-verdict.prompt.md` v1.2.0: "Do NOT classify based on topic keywords"
2. `understand-base.ts`: Narrow HIGH definition with MEDIUM default
3. `orchestrated.ts`: Override blocks medium→high escalation
4. Job 127d: `{"high":1,"medium":7,"low":0}` — reasonable distribution

---

## CONFIRMED: Issue 7 — Verdict Direction Mismatch (claimDirection scope)

**Status:** FIXED (uncommitted)

**Root cause:** `claimDirection` on evidence items is evaluated relative to the **original user claim** (top-level thesis), NOT relative to each individual sub-claim. When the verdict LLM evaluates per-sub-claim verdicts, it receives evidence labeled `[SUPPORTING]`/`[COUNTER-EVIDENCE]` based on the parent claim's direction. This can mislead the verdict for sub-claims with different logical relationships to the evidence.

**Example from test job FH-MLLB1ZU7:**
- Original claim: "Can government statements be trusted?"
- SC3: "Trust in government statements depends on consistency between statements and documented facts"
- Evidence supports SC3's assertion (consistency = trust factor), but direction labels were relative to parent
- Result: SC3 rated 41% ("Mostly False") despite supporting evidence

**Detection was already working:** `validateVerdictDirections()` (line 3809) uses an LLM-powered batch call to detect direction mismatches. The analysis warnings for job FH-MLLB1ZU7 correctly flagged SC3's mismatch.

**What was broken:** `autoCorrect: false` at all 3 call sites (lines 8353, 8959, 9696). The system detected the mismatch but did not apply the correction — it only generated warnings.

**Fix (v2 — LLM-provided correction percentage):**
1. Changed `autoCorrect: false` → `autoCorrect: true` at all 3 verdict paths (multi-context, single-context, standalone)
2. Added `suggestedPct` to the `VERDICT_DIRECTION_VALIDATION_BATCH_USER` prompt — the LLM now provides the corrected percentage along with the direction assessment
3. Updated `batchDirectionValidationLLM` parser to extract `suggestedPct` (validated 0-100, rounded)
4. Updated auto-correction block: uses LLM `suggestedPct` when available; capped fallback `max(55, min(75, 100-verdictPct))` / `max(25, min(45, 100-verdictPct))` if LLM omits it
5. Added `rating: percentageToClaimVerdict(correctedPct, verdict.confidence)` so 7-point label stays consistent
6. Updated Direction Semantics xWiki doc (sections 5.3, 5.4, 8, 10, 11 + all stale line numbers)

**Correction strategy:**
- **Primary**: LLM provides `suggestedPct` based on evidence strength assessment (not just direction)
- **Fallback**: Capped inversion to moderate band (55-75 for "high", 25-45 for "low") — prevents extreme swings

**Why the old formula was unsafe:** `max(65, 100 - verdictPct)` could produce 90-point swings (5% → 95%) from a binary direction signal. The new approach lets the same LLM that detects the mismatch also calibrate the magnitude.

**Files changed:**
- `orchestrated.prompt.md:1070-1073` — added `suggestedPct` to response schema
- `orchestrated.ts:3734` — added `suggestedPct` to `DirectionValidationResult` type
- `orchestrated.ts:3781-3785` — parser extracts `suggestedPct`
- `orchestrated.ts:3906-3916` — correction uses `suggestedPct` with capped fallback
- `orchestrated.ts:8354,8960,9697` — `autoCorrect: true`
- `Direction Semantics/WebHome.xwiki` — sections 5.3, 5.4, 8, 10, 11 updated

---

## Note to Workgroup

All issues verified. Phase 1-4 DONE + verdict direction correction enabled with LLM-calibrated magnitude. "High Harm" RESOLVED. Direction Semantics doc updated to reflect new state.

---

## Risks / Concerns

1. Report assembly changes could break UI
2. Context ID remapping complexity (~500 line function)
3. Type changes needed for `AnalysisContext` interface
4. LLM may not always provide `suggestedPct` (fallback formula handles this with capped range)
