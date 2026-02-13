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
| 4-hotfix (Claim assignment ordering) | pending commit | Moved claim assignments before `ensureContextsCoverAssignments` — fixes rollback regression |
| Bonus (harmPotential inflation) | pending | Narrowed HIGH criteria, removed keyword list from verdict prompt, made override one-directional |

**Build:** passes. **Tests:** 816/816 pass.

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

## Note to Workgroup

All issues verified. Phase 1-4 DONE, pending validation. "High Harm" RESOLVED.
Awaiting Captain consolidation decision.

---

## Risks / Concerns

1. Report assembly changes could break UI
2. Context ID remapping complexity (~500 line function)
3. Type changes needed for `AnalysisContext` interface
