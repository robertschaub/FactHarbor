# Implementation Brief — Plastik Stage 2 Fix
**Date:** 2026-03-20
**From:** Captain (reviewed Senior Developer analysis)
**Role for next agent:** Senior Developer
**Priority:** Stage 2 prompt work. Direction policy only as controlled experiment.

---

## Context

Stage 1 claim-contract preservation is fixed and stable. Do not touch it.
The remaining Plastik verdict spread (~35pp) is downstream, driven primarily by Stage 2.

Full analysis: `Docs/AGENTS/Handoffs/2026-03-20_Senior_Developer_Plastik_Downstream_Instability_Analysis.md`

Validator-era 5-run baseline (current `main`):

| Input | Truth% | Verdict |
|---|---|---|
| DE exact | 43 | MIXED |
| EN exact | 54 | MIXED |
| DE paraphrase | 39 | LEANING-FALSE |
| EN paraphrase | 74 | MOSTLY-TRUE |
| FR exact | 69 | LEANING-TRUE |

Expected range: 15–45% (MOSTLY-FALSE → LEANING-FALSE). Runs 4 and 5 are outliers.

---

## Work Items — Ordered by Priority

### A1 — Experiment: verdictDirectionPolicy (not a permanent default change)

**What:** Temporarily enable `verdictDirectionPolicy: "retry_once_then_safe_downgrade"` via UCM admin config — NOT by changing the code default in `config-schemas.ts`.

**Why not a code default:** This is an amplifier fix, not a root cause fix. Activating it permanently before the Stage 2 root causes are addressed could mask real issues and cause systematic overcorrection to MIXED. Treat it as a diagnostic experiment first.

**How to activate:**
- Use the admin API to set `verdictDirectionPolicy: "retry_once_then_safe_downgrade"` in the live UCM pipeline config.
- Admin endpoint: `PUT http://localhost:3000/api/admin/config/pipeline/default` (header: `X-Admin-Key`)
- Confirm the change is live by reading the config back.

**Run the 5-input Plastik control set** (or a subset of 2–3 runs if cost is a concern — at minimum, re-run Run 4 EN paraphrase and Run 5 FR exact).

**Observe and record:**
- Does truth% for Run 4 (EN paraphrase) correct downward from 74%?
- Does Run 5 (FR exact) correct from 69%?
- Are any previously-correct runs (Run 3, DE paraphrase, 39%) pushed toward MIXED incorrectly?
- Check warnings output for `verdict_direction_issue` — were direction mismatches actually detected?
- Check whether any run gets overcorrected to MIXED (>45% → <45%) without a genuine evidence base for the correction.

**Decision gate:**
- If runs 4 and 5 correct downward AND runs 1–3 are unaffected → **recommend enabling as permanent default** (update `config-schemas.ts` + pipeline config JSON).
- If overcorrection observed on runs 1–3 → **revert, do not enable**, document the failure mode.
- If direction mismatches were not even detected (no `verdict_direction_issue` warnings) → the problem is upstream of the direction check (Stage 2 evidence labels), not in Stage 4. Document and proceed to B1/B2 only.

**Cost:** 1 Haiku call per claim with a detected direction mismatch. Expected: low marginal cost.

---

### B1 — EXTRACT_EVIDENCE: claimDirection guidance for broad evaluative predicates

**Requires explicit Captain approval before implementing the prompt change.**
(Per AGENTS.md Analysis Prompt Rules)

**File:** `apps/web/prompts/claimboundary.prompt.md`
**Section:** `## EXTRACT_EVIDENCE`
**Current lines 605–608:**
```
- `claimDirection`:
  - "supports": Evidence affirms the claim
  - "contradicts": Evidence refutes the claim
  - "contextual": Evidence provides relevant context but doesn't affirm/refute
```

**Problem:** For claims with broad evaluative predicates ("brings no real benefit", "is pointless", "bringt nichts"), partial benefit findings are ambiguous. A source reporting "recycling achieves 58% PET recovery" could be classified `supports` (58% is not "real benefit") or `contradicts` (58% is a measurable benefit). Different runs classify the same type of finding differently, creating evidence balance variance that propagates to the verdict.

**Proposed addition** (for Captain to approve or rephrase):
```
- When the claim uses a broad negative evaluative predicate (e.g., "brings no benefit",
  "is pointless", "has no real value"), apply this rule for partial/mixed findings:
  classify evidence showing a measurable, documented benefit as `contradicts` — unless
  the source explicitly concludes the benefit is negligible, marginal, or irrelevant
  to the claim. Do not treat a limited benefit as equivalent to no benefit.
```

**Important:** This must remain generic — no hardcoding of "recycling", "plastic", or any topic-specific terms.

---

### B2 — GENERATE_QUERIES: contradiction iteration handling

**Requires explicit Captain approval before implementing the prompt change.**

**File:** `apps/web/prompts/claimboundary.prompt.md`
**Section:** `## GENERATE_QUERIES`
**Current behavior:** The prompt handles `"contrarian"` iterationType explicitly (line 482 area) but gives no special treatment to `"contradiction"` iterationType. Both `main` and `contradiction` iterations follow the same legacy/pro_con rules.

**Problem:** The contradiction-reserved iteration loop (1 reserved iteration per run, per `contradictionReservedIterations` config) is meant to specifically find counter-evidence. But the query generation prompt for `iterationType = "contradiction"` does not receive any explicit instruction to seek the opposite evidential direction. It behaves identically to a main iteration.

**Proposed addition** (for Captain to approve or rephrase):
In the section that describes iteration types (around line 470), add:
```
When `iterationType` is `"contradiction"`, actively seek evidence that challenges or
refutes the claim — regardless of what the existing evidence pool shows. Generate
queries that would surface credible, factual counter-evidence: sources that document
measured benefits (if the claim is negative) or documented failures (if the claim is
positive). Do not repeat queries already used in main iterations.
```

**Note:** This is distinct from `"contrarian"` (which fires only after a detected skew). `"contradiction"` fires unconditionally as a reserved step. Both should actively seek opposing evidence, but for different structural reasons.

---

## Success Criteria

After A1 experiment and B1/B2 implementation:

| Criterion | Target |
|---|---|
| Spread within the 5-run Plastik family | < 20pp (down from 35pp) |
| Runs 4 and 5 truth% | < 55% (down from 74% / 69%) |
| Runs 1–3 truth% | Unchanged or ±5pp |
| No regression on Hydrogen | Still MOSTLY-FALSE (< 35%) |
| No regression on Bolsonaro EN fairness | Still LEANING-TRUE (> 55%) |
| No new systematic MIXED overcorrection | No run that was correctly LEANING-FALSE pushed to MIXED |

---

## What NOT to do

- Do not change Stage 1 claim decomposition or the contract validator. It is working.
- Do not hardcode topic-specific terms in any prompt (AGENTS.md: no hardcoded keywords).
- Do not change `verdictGroundingPolicy` — that addresses different problem (phantom citation IDs). Keep `"disabled"`.
- Do not run `test:llm`, `test:neutrality`, `test:cb-integration` unless explicitly asked (expensive).
- Do not run boundary concentration analysis (Stage 3) until spread is reassessed after B1/B2.

---

## Code / Config Locations

| What | Where |
|---|---|
| verdictDirectionPolicy code default | `apps/web/src/lib/config-schemas.ts` lines ~891–895, ~1024–1025 |
| verdictDirectionPolicy passthrough in pipeline | `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` lines 5379–5382 |
| Direction validation + repair flow | `apps/web/src/lib/analyzer/verdict-stage.ts` line ~907+ |
| EXTRACT_EVIDENCE prompt section | `apps/web/prompts/claimboundary.prompt.md` line 578 |
| GENERATE_QUERIES prompt section | `apps/web/prompts/claimboundary.prompt.md` line 426 |
| Admin config API | `PUT localhost:3000/api/admin/config/pipeline/default` |
| Invite code for test runs | `SELF-TEST` |

---

## Handoff Chain

- Prior analysis: `Docs/AGENTS/Handoffs/2026-03-20_Senior_Developer_Plastik_Downstream_Instability_Analysis.md`
- Quality history: `Docs/WIP/2026-03-19_Report_Quality_Evolution_Investigation.md` §10.3–10.4
- Contract fix (do not reopen): `Docs/WIP/2026-03-20_Broad_Claim_Contract_Validator_Plan.md`
