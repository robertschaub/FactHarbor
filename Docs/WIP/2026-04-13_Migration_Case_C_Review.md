# Case C -- Ambiguous Entries Requiring Manual Classification

Generated: 2026-04-13T19:54:09.062Z

These entries reference a Handoffs/ path OUTSIDE the Files touched field.
Decide for each whether the referenced handoff is the canonical detailed version of THIS task
(same-task -> Significant, link existing) or a DIFFERENT task this entry merely cites
(different-task -> Standard, materialize new file).

Mark each entry below with: **DECISION: Significant** or **DECISION: Standard**
Then pass this file via --case-c-decisions to the live run.

---
## 2026-04-10 :: Lead Architect :: Seven-Run Contract Failure Review

**Referenced handoff (outside Files touched):** Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Report_Quality_Deep_Investigation.md

**DECISION:** Standard

Entry excerpt:
```
### 2026-04-10 | Lead Architect | GitHub Copilot (GPT-5.4) | Seven-Run Contract Failure Review
**Task:** Review the seven local post-fix treaty runs, document the two user-approved reference jobs, classify the degraded runs, and identify the concrete runtime seams responsible for failure.
**Files touched:** `Docs/Investigations/2026-04-10_Claim_Contract_Run_Review.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Split degraded outputs into two classes: genuine Stage-1 anchor loss/legal-effect injection for the `rechtskräftig` failures, and a separate validator false negative for coordinated temporal-anchor decomposition on the non-anchor input. Recorded `c72d7b...` and `0fff063...` as user-facing reference outputs, with `8bbc2e...` retained as the cleanest Stage-1 fused-shape reference.
**Open items:** Runtime fix pass still needed in `claim-extraction-stage.ts` for coordinated-anchor acceptance and for removing final-claim revalidation fail-open success semantics. Stage-1 fusion hardening for `rechtskräftig` should be implemented and re-run against the same 4 plus 3 battery.
**Warnings:** `c72d7b...` is outcome-correct but not a perfect extraction-shape reference because it externalizes `rechtskräftig` into a standalone legal-effect claim. `0fff063...` is outcome-correct but still passed through a final revalidation fail-open path.
**For next agent:** Start with `Docs/Investigations/2026-04-10_Claim_Contract_Run_Review.md`. The key implementation target is the whole-an
... (truncated)
```

---
## 2026-04-08 :: Lead Architect + LLM Expert :: Dominant Claim Aggregation Follow-Up

**Referenced handoff (outside Files touched):** Docs/AGENTS/Handoffs/2026-04-08_Lead_Architect_Dominant_Claim_Aggregation_Investigation.md

**DECISION:** Standard

Entry excerpt:
```
### 2026-04-08 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Claim Aggregation Follow-Up
**Task:** Re-investigate dominant-claim aggregation using live job `11a8f75cb79449b69f152635eb42663a`, compare mixed-direction controls, and consolidate a solution/plan for the Captain.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Confirmed the existing handoff `Docs/AGENTS/Handoffs/2026-04-08_Lead_Architect_Dominant_Claim_Aggregation_Investigation.md` is directionally correct. Added two important follow-up findings: (1) the hydrogen family (`a0c5e51e00cb4de080f961fc9854ed55`) shows the same structural bug class as the Swiss treaty case, so dominance handling is not a one-family fix; (2) the article-level narrative override can violate its own prompt contract when all direct claims were assessed (Swiss sibling run `67a3d07df2d04ebaab7a0ec0f256bd1a` moved deterministic ~61.4 to final 77), so any dominance work must include an override guard. Plastic recycling remains the clearest “no dominant claim” control.
**Open items:** Captain approval is still required before prompt changes. Implementation should define whether dominance affects only claim boosts or also attenuation of subordinate sibling claims.
**Warnings:** Increasing `anchorClaimMultiplier` alone is insufficient. The target job already gives AC_03 the anchor boost, yet the aggregate remains 65 because two timeline claims are still treated as co-equal. Relying on `VERDICT_NARRATIVE` alone is also
... (truncated)
```

---
## 2026-04-05 :: Senior Developer :: Grounding Alias Fix — Validated

**Referenced handoff (outside Files touched):** Docs/AGENTS/Handoffs/2026-04-05_Senior_Developer_Grounding_Alias_Fix_Validation.md

**DECISION:** Significant

Entry excerpt:
```
### 2026-04-05 | Senior Developer | Claude Code (Opus 4.6) | Grounding Alias Fix — Validated
**Task:** Implement and validate grounding-validator alias fix for timestamp-ID false positives on Bolsonaro EN and Plastik DE.
**Files touched:** `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`
**Key decisions:** Validator-local aliasing (`EVG_001`/`EVG_002`/...) in grounding validation payload only. Reasoning text also aliased (`ffaa4fdd`) after first canary showed reasoning-to-registry mismatch. Canonical pipeline IDs untouched.
**Open items:** (1) Bolsonaro EN still trails deployed by ~9pp — retrieval-depth-driven, testable via `sufficiencyMinMainIterations: 1→2`. (2) One genuine cross-claim contamination warning on Plastik AC_02 — separate Stage-4 issue, not blocking.
**Warnings:** None.
**For next agent:** Full handoff: `Docs/AGENTS/Handoffs/2026-04-05_Senior_Developer_Grounding_Alias_Fix_Validation.md`. Clean canary jobs: Bolsonaro `703c261d05744fdf8ddc70ce3afa5145` (LEANING-TRUE 64/58, zero grounding/direction warnings), Plastik `da1180edfae445f8a93bbcbaa2e50144` (LEANING-FALSE 41/66, one genuine cross-claim warning only).
**Learnings:** No
```

---
## 2026-04-02 :: Senior Developer :: Restore Local Runner Serial Mode For Debugging

**Referenced handoff (outside Files touched):** Docs/AGENTS/Handoffs/2026-03-23_Senior_Developer_Stage4_Provider_Guard_Reliability_Alignment.md

**DECISION:** Standard

Entry excerpt:
```
### 2026-04-02 | Senior Developer | Codex (GPT-5) | Restore Local Runner Serial Mode For Debugging
**Task:** Re-check the historical `FH_RUNNER_MAX_CONCURRENCY` decision after repeated restart/requeue observations and restore the local debugging stack to serial job execution.
**Files touched:** `apps/web/.env.local`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Verified the March 23 handoff `Docs/AGENTS/Handoffs/2026-03-23_Senior_Developer_Stage4_Provider_Guard_Reliability_Alignment.md` explicitly justified moving the local runner back to `FH_RUNNER_MAX_CONCURRENCY=3` on the theory that Stage-4 lane throttling was the proper fix. Given the user's longer-running restart/requeue observations and today's reproduction work, I restored `apps/web/.env.local` to `FH_RUNNER_MAX_CONCURRENCY=1` as a local debugging isolation measure and restarted the stack via `scripts/restart-clean.ps1`.
**Open items:** This is a local operational setting, not a new product decision. It still needs fresh validation runs to see whether restart/requeue symptoms drop under serial execution.
**Warnings:** I did not change `apps/web/.env.example`; repo/default documentation still says `3`. The local machine is now intentionally divergent for debugging. Any later agent who wants concurrent validation again must change `.env.local` back explicitly and restart services.
**For next agent:** Assume the currently running local web stack is serial (`FH_RUNNER_MAX_CONCURRENCY=1`). Do not interpret improvement
... (truncated)
```

---
## 2026-04-09 :: Lead Architect :: Review Option G LLM-Led Article Adjudication

**Referenced handoff (outside Files touched):** Docs/AGENTS/Handoffs/2026-04-09_Lead_Architect_LLM_Expert_Option_G_Review_Request.md

**DECISION:** Standard

Entry excerpt:
```
### 2026-04-09 | Lead Architect | Codex (GPT-5) | Review Option G LLM-Led Article Adjudication
**Task:** Independently review `Docs/AGENTS/Handoffs/2026-04-09_Lead_Architect_LLM_Expert_Option_G_Review_Request.md` and answer five targeted architecture questions on the approved Option G redesign.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The direction-conflict predicate is acceptable as structural plumbing because it routes on typed LLM outputs rather than interpreting raw text, but the current `>50 / <=50` split is too hair-trigger and should treat near-midpoint mixed claims as non-directional. The deviation cap should be widened from `25` to `30` for conflict-path jobs because the canonical Swiss motivating case needs roughly a 30-point correction; otherwise the guard blocks the intended repair. Removing narrative truth override is acceptable, but same-direction unresolved-claim jobs remain the main uncovered risk and should not automatically trigger LLM adjudication unless validation shows a real baseline distortion pattern. Folding dominance into a single `ARTICLE_ADJUDICATION` step is sound for v1; keep the nested dominance rationale in the output for auditability rather than paying for a separate dominance call. The most important uncovered edge cases are (1) near-50 mixed claims falsely tripping the conflict gate, (2) same-direction unresolved jobs with a high-centrality unresolved claim, and (3) the broader policy question that Option G still 
... (truncated)
```
