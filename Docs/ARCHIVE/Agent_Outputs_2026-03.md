# Agent Outputs Log -- Archive 2026-03

Archived inline entries from 2026-03. Embedded Handoffs/ paths have been rewritten to Docs/ARCHIVE/Handoffs/2026-03/.

### 2026-03-31 | Senior Developer | Codex (GPT-5) | Source Fetch Failure Reduction Follow-up Fix
**Task:** Correct the just-implemented source-fetch short-circuit so it matches the approved low-risk plan, then update the plan doc and verification coverage.
**Files touched:** `Docs/WIP/2026-03-31_Source_Fetch_Failure_Reduction_Plan.md`, `apps/web/src/lib/analyzer/research-acquisition-stage.ts`, `apps/web/test/unit/lib/analyzer/research-acquisition-stage.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Replaced cumulative per-domain blocking counts with a true per-domain blocking streak. The streak now updates at fetch completion time inside each worker, so delayed same-batch siblings can be skipped on a best-effort basis without widening state beyond one `fetchSources()` call. Any non-blocking outcome for that domain resets the streak. Skipped URLs no longer count toward `attempted`, so warning metrics reflect actual fetches rather than queued URLs.
**Open items:** None for this work item. Remaining limitation stays intentional: already-launched concurrent same-domain requests in the same batch may still run before the blocking streak trips.
**Warnings:** The working tree already contained unrelated documentation edits outside this task. I did not touch or revert them.
**For next agent:** Safe verification passed on current working tree: `npm -w apps/web exec vitest run test/unit/lib/analyzer/research-acquisition-stage.test.ts`, `npm test`, and `npm -w apps/web run build`. New focused tests cover streak reset after a non-blocking outcome, exclusion of skipped URLs from `attempted`, and delayed same-batch sibling suppression under concurrent batching.
**Learnings:** no

---

### 2026-03-31 | Lead Architect | Claude Code (Opus 4.6) | DistinctEvents Event-Granularity Architect Review
**Task:** Review adjusted `distinctEvents` event-granularity fix proposal for Bolsonaro multi-proceeding degradation.
**Files touched:** `Docs/WIP/2026-03-31_DistinctEvents_Event_Granularity_Architect_Review.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key findings:** (1) Diagnosis correct: Bolsonaro "various/all" degradation is event-granularity at Stage 1, not Stage 4/5. All 3 anchor jobs extract STF lifecycle milestones instead of STF+TSE peer proceedings. (2) "Independently researchable" standard is right but should be phrased as "requiring different evidence sources or institutional authorities." (3) Prompt-only is the correct first step — LLM repair pass deferred. (4) Lifecycle phases must be preserved for single-process inputs. (5) Evaluative/compound non-event inputs (SRG, Homeopathy, Plastik) must remain inert.
**Decision:** `Adjusted prompt-only distinctEvents fix justified`. Proposed specific prompt change at claimboundary.prompt.md:202-207 — revise Include rules to add granularity rule steering multi-proceeding inputs toward peer extraction while preserving lifecycle for single-process inputs.
**For next agent:** Full review at `Docs/WIP/2026-03-31_DistinctEvents_Event_Granularity_Architect_Review.md`. Prompt change requires human approval. Validation gate: 3 positive Bolsonaro multi-proceeding runs + 4 guardrail runs (single-proceeding, SRG, evaluative).

---

### 2026-03-31 | Senior Developer | Claude Code (Opus 4.6) | Source Fetch Failure Reduction (Domain Short-Circuit + Warning Enrichment)
**Task:** Implement approved source fetch failure reduction: domain-level short-circuit for 401/403 and error-type enrichment in warnings.
**Files touched:** `research-acquisition-stage.ts` (domain skip logic + humanizeErrorType + warning enrichment), `config-schemas.ts` (UCM field), `pipeline.default.json` (default), `research-acquisition-stage.test.ts` (8 new tests).
**Fix 1 (domain short-circuit):** Within each `fetchSources()` call, tracks per-domain consecutive 401/403 failures. After threshold (default 2), best-effort skips later same-domain URLs. Does NOT trigger on 404 (URL-specific), timeout, or network errors. UCM-configurable via `fetchDomainSkipThreshold` (0 disables). Skip count folded into existing `source_fetch_failure` warning details as `skippedByDomainShortCircuit`.
**Fix 2 (warning enrichment):** Warning message now appends human-readable error type summary (e.g., "1× paywall/blocked, 1× dead link"). Admin/operator diagnostic improvement only — no warning-display policy change.
**Scope caveat:** Short-circuit operates per `fetchSources()` call (one query batch), not across the entire analysis run. Concurrent in-flight requests within a batch may not be skipped — this is best-effort by design.
**Tests:** 8 new tests: 403 skip, 404 no-skip, timeout no-skip, independent domain tracking, threshold=0 disabled, warning message enrichment, humanizeErrorType mapping. 1492 total pass. Build clean.
**For next agent:** No new warning type registered. Observability via existing `source_fetch_failure` details field.

---

### 2026-03-31 | Lead Architect | Claude Code (Opus 4.6) | Source Fetch Failure Investigation + Reduction Plan
**Task:** Investigate why source fetch failures are frequent and URLs work in browser but fail in pipeline.
**Files touched:** `Docs/WIP/2026-03-31_Source_Fetch_Failure_Reduction_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key findings:** (1) 46% failure rate across sampled warnings — operationally expected for server-side fetching. (2) Dominant failure (56%) is HTTP 403 from paywall/bot-blocking/Cloudflare JS challenges — structurally unfixable without headless browser. (3) Pipeline retries same blocked domain repeatedly within a run, wasting time. (4) Warning messages don't tell users *why* fetches failed.
**Proposed:** (1) Domain-level fetch short-circuit after 2 consecutive deterministic failures (~30 lines, UCM-configurable). (2) Error-type enrichment in warning messages (~10 lines). Both code-only, no analytical behavior change.
**For next agent:** Full plan at `Docs/WIP/2026-03-31_Source_Fetch_Failure_Reduction_Plan.md`. Implementation in `research-acquisition-stage.ts`.

---

### 2026-03-31 | Senior Developer | Claude Code (Opus 4.6) | Ghost Boundary Sanitization + Grounding Validation Fix
**Task:** Fix two defects from job `696d8140`: ghost boundary IDs passing through advocate parsing, and grounding validation false positives from FLOOD-1 source portfolio expansion.
**Files touched:** `verdict-stage.ts` (boundary sanitization in `advocateVerdict()`, source portfolio in grounding validation input, `VerdictValidationRepairContext` extended), `claimboundary.prompt.md` (`VERDICT_GROUNDING_VALIDATION` source portfolio rule + input variable), `verdict-stage.test.ts` (3 new tests + 1 existing test fixed).
**Fix 1 (boundary sanitization):** After `parseAdvocateVerdict()`, filter each verdict's `boundaryFindings` to only include boundary IDs valid for that specific claim via `coverageMatrix.getBoundariesForClaim()`. Ghost IDs silently dropped with debug log. Per-claim (not global) filtering prevents cross-claim boundary contamination in range widening.
**Fix 2 (grounding validation):** Added `sourcePortfolioByClaim` to `VerdictValidationRepairContext`. Threaded `fullPortfolio` through. Flattened source portfolio (sourceId + domain) passed to grounding validation input. Prompt updated with rule: source portfolio references are valid context, not hallucinated evidence.
**Tests:** Ghost boundary stripped (1), cross-claim boundary stripped (1), grounding receives source portfolio (1), existing portfolio test fixed to use real `buildCoverageMatrix`. 1484 total pass. Build clean.
**For next agent:** Fix 3 (optional prompt hardening for VERDICT_ADVOCATE boundary IDs) is deferred — can be picked up later.

---

### 2026-03-30 | Senior Developer | Claude Code (Opus 4.6) | Unify VERDICT_DIRECTION_VALIDATION Contract
**Task:** Fix review blocker — `validateDirectionOnly()` passed top-level `evidencePool` while batch path embedded it per-verdict. Unified on per-verdict shape.
**Files touched:** `verdict-stage.ts` (1 call site), `claimboundary.prompt.md` (prompt wording), `verdict-stage.test.ts` (1 test capture updated)
**What changed:** (1) `validateDirectionOnly()` now embeds `evidencePool` inside the verdict object, matching the batch path. (2) Prompt `VERDICT_DIRECTION_VALIDATION` input section updated to describe per-verdict claim-local evidence pool, removed separate `${evidencePool}` variable. (3) Test for re-validation capture updated to read from `verdicts[0].evidencePool` instead of top-level `input.evidencePool`.
**Not changed:** `VERDICT_DIRECTION_REPAIR` (single-claim top-level `evidencePool` is correct). Grounding validation (correctly global).
**Verification:** 157 verdict-stage tests pass. 1481 total tests pass. Build clean.
**For next agent:** The `VERDICT_DIRECTION_VALIDATION` prompt now has one consistent contract: `${verdicts}` contains an array where each verdict includes its own `evidencePool`. No separate top-level `${evidencePool}` is used. `VERDICT_DIRECTION_REPAIR` is unchanged.

---

### 2026-03-30 | Senior Developer | Claude Code (Opus 4.6) | Claim-Local Verdict Scope Fix
**Task:** Fix structural bug where direction validation/repair uses full boundary evidence pool instead of claim-local evidence, causing false `verdict_integrity_failure` downgrades (9e4d anchor case).
**Files touched:** `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`
**Key decisions:** Added `getClaimLocalEvidence()` helper with 3-tier priority (relevantClaimIds -> cited IDs -> full pool fallback). Applied to batch direction validation, `attemptDirectionRepair`, and `validateDirectionOnly`. Grounding validation intentionally left global (ID existence checks). No prompt, Stage 1, aggregation, or article adjudication changes.
**Open items:** Stage 1 proxy decomposition hardening is a separate follow-up (not blocking). The batch direction validation prompt input shape changed from top-level `evidencePool` to per-verdict embedded pools -- monitor for any LLM parsing issues on next real run.
**Warnings:** The prompt contract for `VERDICT_DIRECTION_VALIDATION` now receives `evidencePool` inside each verdict object rather than as a sibling field. This is a structural improvement but changes the input shape.
**For next agent:** Full handoff at `Docs/ARCHIVE/Handoffs/2026-03/2026-03-30_Senior_Developer_Claim_Local_Verdict_Scope_Fix.md`. Verification: 1481 tests pass, build succeeds. Ready for human review and commit.
**Learnings:** no

---

### 2026-03-30 | Lead Architect | Gemini 3.1 Pro | 9e4d SRF Factchecking Investigation Review
**Task:** Adjudicate the root cause of the AC_02 failure in job 9e4d3712e12d49bc8cadd601766e5f4b.
**Files touched:** Docs/WIP/2026-03-30_9e4d_SRF_Factchecking_Architect_Review.md
**Key decisions:** The downstream explanation is the true root cause. Stage 4's verdict integrity validation processes the entire global boundary evidence pool rather than strictly claim-local evidence. This causes hallucinatory cross-contamination where a claim with poor/neutral evidence falsely fails integrity because a sibling claim's strong evidence leaked into the validation context. Stage-1 proxy drift is real but secondary.
**Open items:** Need a developer to implement the claim-local scoping fix for 
unValidationCheckWithRetry, alidateDirectionOnly, and ttemptDirectionRepair.
**Warnings:** Do not implement Stage 1 drift heuristics yet; do not restore the ±10pp clamp as it played no part in this failure.
**For next agent:** Read Docs/WIP/2026-03-30_9e4d_SRF_Factchecking_Architect_Review.md. Implement Option B local scoping for verdict stage validation.
**Learnings:** no

---

### 2026-03-30 | Lead Architect | Claude Code (Opus 4.6) | 9e4d SRF Factchecking — Architect Review
**Task:** Adjudicate competing explanations for AC_02 `verdict_integrity_failure` in job `9e4d`.
**Files touched:** `Docs/WIP/2026-03-30_9e4d_SRF_Factchecking_Architect_Review.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key findings:** (1) Direction validation at `verdict-stage.ts:1091-1094` passes full evidence pool, not claim-local. AC_02's integrity downgrade cites 6 supports (EV_001-006) that belong to AC_01. (2) AC_02's actual claim-local pool is 4 neutral items — the cross-claim contamination is the scoping bug, not just thin evidence. (3) Stage 1 proxy decomposition is a contributing cause but not the primary bug. (4) ±10pp clamp removal had zero effect (LLM kept truth at 58). (5) Grounding validation correctly uses full pool (checking ID existence is global). (6) `isVerdictDirectionPlausible()` correctly uses cited arrays.
**Decision:** `Claim-local verdict-scope fix justified`. Code-only fix: filter `evidence` to claim-local items before passing to direction validation and repair LLM calls. ~5 lines per call site. Stage 1 prompt hardening is a separate follow-up.
**For next agent:** Full review at `Docs/WIP/2026-03-30_9e4d_SRF_Factchecking_Architect_Review.md`. Two call sites to fix: direction validation (line 1091) and repair (line 1547). Grounding validation (line 1072) stays full-pool. Fallback: if claim-local is empty, use cited evidence, then full pool with warning.

---

### 2026-03-30 | Lead Architect | Claude Code (Opus 4.6) | Article Adjudication: Hybrid Clamp vs LLM-Led Review
**Task:** Evaluate whether the ±10pp truth clamp and confidence ceiling in Stage 5 article adjudication violate the LLM Intelligence mandate.
**Files touched:** `Docs/WIP/2026-03-30_Article_Adjudication_Hybrid_vs_LLM_Review.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** (1) Confidence ceiling (adjusted ≤ deterministic) is a valid structural invariant — "unresolved claims add uncertainty, never remove it." Keep. (2) ±10pp truth clamp is a semantic analytical constraint — it limits how the LLM interprets the impact of unresolved claims. Violates AGENTS.md LLM Intelligence mandate. Remove. (3) Schema validation (0-100), `Number.isFinite` guard, and deterministic fallback are structural plumbing. Keep. (4) Prompt should soften "±10pp" to "adjust conservatively" — soft guidance, not hard bound.
**Decision:** `Pure LLM article adjudication justified` — Option B (remove truth clamp, keep confidence ceiling). ~4 lines code, ~2 lines prompt. 2 tests rewrite, 2 new tests.
**For next agent:** Full review at `Docs/WIP/2026-03-30_Article_Adjudication_Hybrid_vs_LLM_Review.md`. Code change in `aggregation-stage.ts:232-236`. Prompt change in `claimboundary.prompt.md:1366`. Prompt change requires human approval.

---

### 2026-03-30 | Senior Developer | Claude Code (Opus 4.6) | Quality Evolution Deep Analysis + Doc Sync
**Task:** 100-job quality evolution analysis across 12 input families. Comprehensive doc sync.
**Files touched:** `Current_Status.md`, `Backlog.md`, `WIP/README.md`, `Agent_Outputs.md`, `WIP/2026-03-30_Report_Quality_Evolution_Deep_Analysis.md`
**Critical finding:** Plastik cross-linguistic neutrality gap — 58pp spread (DE 33% / EN 72% / FR 13%). Same semantic claim, directionally opposite verdicts. Driven by Stage 2 evidence language bias. Not covered by EVD-1.
**Status updates:** All integrity fixes marked DONE. NEUTRALITY-1 and FLAT-EARTH-1 added. Cross-linguistic neutrality is next quality gap.
**For next agent:** Read the quality evolution report. NEUTRALITY-1 needs Captain decision on EVD-1 cross-linguistic thresholds.

---

### 2026-03-30 | Senior Developer | Claude Code (Opus 4.6) | Report Matrix + LLM Article Adjudication
**Task:** Fix UNVERIFIED claims missing from matrix and ignored in article verdict.
**Files touched:** `claimboundary-pipeline.ts` (report matrix from all claims), `aggregation-stage.ts` (adjudication parsing with ceiling/fallback), `claimboundary.prompt.md` (VERDICT_NARRATIVE schema extension), `types.ts` (VerdictNarrative interface), `page.tsx` (matrix labels from coverageMatrix.claims).
**What changed:** (1) Report matrix now built from ALL final claim verdicts, not just assessable claims — UNVERIFIED claims get visible columns. (2) VERDICT_NARRATIVE LLM now returns `adjustedTruthPercentage` and `adjustedConfidence` — pipeline uses these as final article values with ceiling constraint (confidence can only decrease) and ±10pp truth bound. Falls back to deterministic on any parsing failure.
**Validation:** Partial-insufficient run (`f80b6b41`): confidence dropped from ~65 to 40, matrix shows all 3 claims, article honestly reflects incomplete coverage. Fully-assessed controls (Bolsonaro, Hydrogen): adjudicated numbers match deterministic output. No regressions.
**For next agent:** No new LLM call added. Existing VERDICT_NARRATIVE call extended. Ship together — matrix without adjudication creates a visible inconsistency.

---

### 2026-03-29 | Lead Architect | Claude Code (Opus 4.6) | 2705 + e407 Root Fix — Reviewer Notes
**Task:** Code/Architecture review of the revised 2705/e407 root-fix proposal.
**Files touched:** `Docs/WIP/2026-03-29_2705_e407_Root_Fix_Reviewer_Notes.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key findings:** (1) Proposal correctly targets the root bug at line 561, not downstream. (2) `runVerdictStageWithPreflight` already guards `claims.length === 0` — no redundant guard needed. (3) `buildCoverageMatrix` handles empty claims correctly. (4) Aggregation self-corrects for all-zero-confidence but NOT for Stage-4's spurious confidence=30 — confirming the short-circuit is a correctness fix. (5) Verdict uniqueness should assert-not-dedup. (6) gate4Stats needs no separate fix.
**Decision:** `Approved as root-fix path`. No revision needed. Two implementation cautions noted for the implementing agent.
**For next agent:** The plan is approved. Implement by changing `activeClaims` to `assessableClaims = sufficientClaims` (removing the fallback), fixing matrix labels in `page.tsx`, and adding a uniqueness assertion (not dedup) after verdict assembly. No prompt change needed.

---

### 2026-03-29 | Senior Developer | Codex (GPT-5) | 2705 + e407 Root Fix Review Tightening
**Task:** Re-tighten the `2705 / e407` architect review so it is ready for another review round after concerns that the previous package still mixed root fixes with symptom cleanup.
**Files touched:** `Docs/WIP/2026-03-29_2705_e407_Root_Fix_Architect_Review.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Reframed the review around a stronger architecture: explicit `assessableClaims` after D5, Stage 4 only on that subset, verdict-uniqueness invariant before aggregation, and matrix label alignment as a separate presentation fix. Removed aggregation deduplication from the primary-fix story and repositioned the residual `Werkzeuge/Methoden` split as a separate Stage-1 follow-on rather than pretending the integrity patch solves recurrence.
**Open items:** No code change yet. The next implementation prompt should use the tightened framing and avoid presenting aggregation dedup as the main repair.
**Warnings:** The review now cleanly separates the `e407` integrity bug from the residual Stage-1 recurrence family. Do not collapse those back together in execution planning.
**For next agent:** The updated review is at [2026-03-29_2705_e407_Root_Fix_Architect_Review.md](C:/DEV/FactHarbor/Docs/WIP/2026-03-29_2705_e407_Root_Fix_Architect_Review.md). If implementation is requested next, the package should be: assessable-claims short-circuit, verdict-uniqueness invariant, and matrix label alignment, with Stage-1 Step 4 explicitly deferred.
**Learnings:** no

---

### 2026-03-29 | Lead Architect | Claude Code (Opus 4.6) | 2705 + e407 Root Fix — Architect Review
**Task:** Re-open the 2705/e407 issue family and find the best root-cause solution.
**Files touched:** `Docs/WIP/2026-03-29_2705_e407_Root_Fix_Architect_Review.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** (1) Primary bug is all-insufficient fallback at `claimboundary-pipeline.ts:561` — sends D5-rejected claims to Stage 4, producing duplicate verdicts and corrupted article verdict. (2) Secondary bug: UI matrix label/body mismatch in `page.tsx:1871`. (3) Aggregation has no dedup guard. (4) Salvage step (Option C) is premature — Stage-1 fix already shipped, measure first. (5) Root fix is enforcing two invariants: no Stage 4 for D5-rejected claims, one verdict per claim ID. Three code-only changes, ~30 lines total.
**Implementation order:** (1) All-insufficient short-circuit in pipeline. (2) Matrix label alignment in page.tsx. (3) Aggregation dedup guard. All code-only, single commit.
**Open items:** None — all code-only.
**For next agent:** Full review at `Docs/WIP/2026-03-29_2705_e407_Root_Fix_Architect_Review.md`. All three fixes are in `claimboundary-pipeline.ts`, `page.tsx`, and `aggregation-stage.ts` respectively. No prompt change needed.

---

### 2026-03-30 | Senior Developer | Claude Code (Opus 4.6) | 2705/e407 Root Fix — Assessable-Claims + Verdict Uniqueness + Matrix
**Task:** Fix all-insufficient fallback integrity failure and Coverage Matrix mismatch.
**Files touched:** `claimboundary-pipeline.ts` (assessable-claims path + verdict uniqueness invariant), `page.tsx` (matrix label source).
**What changed:** (1) `activeClaims` fallback removed — Stage 4 only gets D5-sufficient claims. (2) Duplicate `claimId`s in verdicts throw hard failure. (3) Matrix labels from `coverageMatrix.claims`.
**Validation:** 5 jobs, zero dup IDs, matrix aligned. 2705: AC_01 in matrix only, AC_02 UNVERIFIED (correct).
**For next agent:** Report at `Docs/ARCHIVE/Handoffs/2026-03/2026-03-29_Senior_Developer_2705_e407_Root_Fix_Implementation.md`.

---

### 2026-03-29 | Senior Developer | Claude Code (Opus 4.6) | Stage 1 Claim Decomposition Fix (3-Step)
**Task:** Implement approved 3-step fix for b8e6/8640/cd4501 claim decomposition failures.
**Files touched:** `claim-extraction-stage.ts` (Step 1 fallback removal + Step 3 retry re-validation), `claimboundary.prompt.md` (Step 2 evidence-separability rule + schema), `types.ts` + `warning-display.ts` (new warning type), `claim-contract-validation.test.ts` (3 new tests).
**Step 2 is the primary fix.** Evidence-separability check caught 8640/cd4501 4-claim over-fragmentation and triggered merge to 2 claims. UNVERIFIED starvation eliminated. Step 1 near-zero practical impact (classification changed). Step 3 provides re-validation safety net.
**Validation:** 5 jobs. 8640 family fixed (4→2 claims, MOSTLY-TRUE 72/73). Bolsonaro preserved (2 claims, no regression). Controls clean. b8e6 still over-fragments (needs Pass 2 refinement, documented).
**For next agent:** Full report at `Docs/ARCHIVE/Handoffs/2026-03/2026-03-29_Senior_Developer_Stage1_Claim_Decomposition_Fix.md`. b8e6 residual is a separate Pass 2 issue.

---

### 2026-03-29 | Lead Architect | Claude Code (Opus 4.6) | Claim Decomposition Plan — Stress Test
**Task:** Adversarial quality-bar review of the approved 3-step decomposition fix plan before implementation.
**Files touched:** `Docs/WIP/2026-03-29_Claim_Decomposition_Plan_Stress_Test.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key findings:** (1) Step 1 (fallback removal) is practically inert on current data — all 7 affected jobs had claims that passed Gate 1 fidelity independently; the dimension-tag exemption was never exercised. (2) Step 3 (retry hardening) has no trigger without Step 2 for 8640-class failures. (3) Step 2 (contract evidence-separability) is the critical path and primary fix. (4) Sequence is pragmatically correct but analytically inverted — Steps 1+3 are preparatory infrastructure, not the primary defense.
**Decision:** `Plan approved with sequencing changes` — ship Steps 1+3 now as code-only preparatory work, but reframe: the decomposition problem is not resolved until Step 2 (prompt, needs approval) is live.
**For next agent:** The code-only changes (Steps 1+3) are safe to implement. Step 2 approval is the critical path. Full stress-test report at `Docs/WIP/2026-03-29_Claim_Decomposition_Plan_Stress_Test.md`.

---

### 2026-03-29 | Lead Architect | Claude Code (Opus 4.6) | b8e6 + 8640 + cd4501 Claim Decomposition — Architect Review (Rev 2)
**Task:** Adjudicate shared Stage-1 claim-decomposition problem behind three SRG SSR jobs. Supersedes 2-job version.
**Files touched:** `Docs/WIP/2026-03-29_b8e6_8640_cd4501_Claim_Decomposition_Architect_Review.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** (1) Four failure layers identified: fallback heuristic (b8e6), contract-validation blind spot (8640), Pass 2 over-fragmentation (contributing), retry-path failure (cd4501). (2) cd4501 is decisive — contract validation caught the problem but retry reproduced the same split because guidance addresses proxy drift, not over-fragmentation. (3) No re-validation after retry. (4) Recommended: Option D — fallback removal + contract evidence-separability + retry hardening. Steps 1+3 are code-only and can ship together. Step 2 requires prompt approval.
**Open items:** Step 2 (contract-validation evidence-separability prompt) requires explicit human approval. Coverage-matrix communication gap noted as separate UI follow-up.
**For next agent:** Full review at `Docs/WIP/2026-03-29_b8e6_8640_cd4501_Claim_Decomposition_Architect_Review.md`. Steps 1+3 (fallback removal + retry hardening) are code-only and can ship in one commit. Step 2 needs prompt approval.

---

### 2026-03-29 | Lead Architect | Claude Code (Opus 4.6) | b8e6 + 8640 Claim Decomposition — Architect Review
**Task:** Adjudicate shared Stage-1 claim-decomposition problem behind two SRG SSR jobs.
**Files touched:** `Docs/WIP/2026-03-29_b8e6_8640_Claim_Decomposition_Architect_Review.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** (1) Both jobs share a family-level root cause: Stage 1 decomposition control too permissive + contract validation lacks evidence-separability check. (2) b8e6 is primarily a fallback dimension-tagging heuristic bug (`single_atomic_claim` auto-promoted to dimension decomposition). (3) 8640 is contract-validation blind spot (evaluative sub-claims not checked for evidence separability). (4) 7/200 recent jobs affected (3.5%). (5) Not a recent regression — fallback introduced 2026-03-23.
**Implementation order:** (1) Remove `single_atomic_claim` fallback from dimension-tagging heuristic (code-only, 3 locations). (2) Add evidence-separability check to CLAIM_CONTRACT_VALIDATION prompt (requires human approval). (3) Remeasure.
**Open items:** Step 2 prompt change requires explicit human approval.
**For next agent:** Full review at `Docs/WIP/2026-03-29_b8e6_8640_Claim_Decomposition_Architect_Review.md`. Step 1 is code-only, ~3 lines × 3 locations in `claim-extraction-stage.ts`.

---

### 2026-03-29 | Lead Architect | Claude Code (Opus 4.6) | 1bfb Direction Integrity — Architect Review
**Task:** Adjudicate competing explanations for AC_02 `verdict_integrity_failure` in job `1bfb` and decide canonical fix strategy.
**Files touched:** `Docs/WIP/2026-03-29_1bfb_Direction_Integrity_Architect_Review.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** (1) Primary failure is citation-carriage defect: VERDICT_RECONCILIATION schema omits `supportingEvidenceIds`/`contradictingEvidenceIds`, parser inherits stale advocate arrays. (2) Direction-validator false positive is REJECTED as primary — it's a downstream victim of stale input. (3) Threshold tuning is premature while arrays are stale. (4) 25/400 recent jobs (6.25%) hit `verdict_integrity_failure` — systemic. (5) Warning-state bug confirmed: `safeDowngradeVerdict` receives pre-repair verdict but post-repair issues.
**Implementation order:** (1) Warning-state bug fix (code-only, ~2 lines). (2) Reconciliation citation-carriage fix (prompt schema + parser, requires human approval). (3) Remeasure direction-validator false-positive rate on clean data. (4) Only then consider direction-validator prompt/threshold changes.
**Open items:** Prompt schema change requires explicit human approval. Post-fix measurement round needed (10 jobs, $5-10).
**For next agent:** Full review at `Docs/WIP/2026-03-29_1bfb_Direction_Integrity_Architect_Review.md`. Step 1 (warning bug) is trivially shippable. Step 2 (citation-carriage) needs human approval for prompt change. The `Direction_Validator_False_Positive_Investigation.md` proposal is deferred until Step 3 measurement.

---

### 2026-03-29 | Lead Architect | Claude Code (Opus 4.6) | Seeded Evidence Mapping Fix — Revised Proposal (Rev 2)
**Task:** Revise the seeded-evidence mapping proposal to reject Option B (all-claims fallback) and recommend Option C (post-Pass-2 LLM remap).
**Files touched:** `Docs/WIP/2026-03-26_Seeded_Evidence_Mapping_Fix_Proposal_Rev2.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** (1) Option B explicitly rejected — fabricates attribution. (2) Option C recommended — one batched Haiku remap call after Pass 2. (3) Options A/D rejected. (4) Option E deferred.
**For next agent:** Full proposal at `Docs/WIP/2026-03-26_Seeded_Evidence_Mapping_Fix_Proposal_Rev2.md`.

---

### 2026-03-27 | Senior Developer | Claude Code (Opus 4.6) | Internet Outage Resilience (OUTAGE-A1/A2/A4/A5)
**Task:** Make jobs survive internet outages: classify network errors, trip the circuit breaker, abort damaged jobs, auto-resume.
**Root cause:** (1) Network errors classified as `unknown` — breaker blind. (2) Stage 4 failures swallowed by fallback verdicts — runner breaker never fires. (3) Paused jobs produce useless UNVERIFIED 50/0 results. (4) No auto-recovery — requires manual admin resume.
**Fixes:** (A1) `NETWORK_CONNECTIVITY_PATTERNS` in `error-classification.ts`. (A2) `maybeRecordProviderFailure()` in `verdict-generation-stage.ts`. (A4) `claimboundary-pipeline.ts` Stage 4 catch re-throws when `isSystemPaused()` — no damaged results. (A5) `probeAndMaybeResume()` in `internal-runner-queue.ts` — HEAD to Anthropic on each watchdog tick, auto-resumes if reachable.
**Tests:** 10 new tests (8 classification + 2 auto-resume). 1428 total pass, build clean.
**For next agent:** Pre-call fast-fail probe (A.3) is the remaining follow-on. Plan at `Docs/WIP/2026-03-27_Internet_Outage_Resilience_Plan.md`.

---

### 2026-03-27 | Senior Developer | Claude Code (Opus 4.6) | Promote `preliminaryEvidenceLlmRemapEnabled` to Default-On
**Task:** Flip default to `true` after Captain approval.
**Files touched:** `config-schemas.ts` (DEFAULT_PIPELINE_CONFIG), `pipeline.default.json`, local UCM reseeded (hash `6900c4e4`).
**Monitor:** Homeopathy-family confidence anomaly (74→24 in single ON run) — watch post-promotion, rollback flag available.
**For next agent:** Flag is now default-on. Deployed systems get `true` on next deploy/reseed. Rollback via UCM Admin UI or file revert.

---

### 2026-03-27 | Senior Developer | Claude Code (Opus 4.6) | Seeded Evidence Remap — Current-Stack Promotion Gate
**Task:** Run controlled A/B comparison of `preliminaryEvidenceLlmRemapEnabled` on post-FLOOD-1 stack to determine promote-or-hold.
**Method:** 4 input families × ON/OFF pairs (8 runs) + 3 user-submitted OFF-only runs + 15-item spot-check.
**Key finding:** Bolsonaro A/B is decisive — same verdict (LEANING-TRUE), same truth% (64.3 vs 64.4), but seeded mapping 0%→92%. Mapping quality: 14/15 clearly correct, 1 borderline, 0 fabricated. Plastik DE neutral. Hydrogen stable. Homeopathy EN shows a confidence anomaly worth monitoring.
**Recommendation:** **Promote to default-on.** The remap recovers claim-local attribution for semantic-slug families without verdict distortion, at ~$0.002/run cost.
**For next agent:** Full report at `Docs/ARCHIVE/Handoffs/2026-03/2026-03-27_Senior_Developer_Seeded_Evidence_LLM_Remap_Promotion_Gate.md`. Gate doc at `Docs/WIP/2026-03-27_Seeded_Evidence_Remap_Promotion_Gate_Parked.md` (updated, no longer parked). UCM flag currently OFF — Captain flip to default-on pending approval.

---

### 2026-03-27 | Senior Developer | Claude Code (Opus 4.6) | FLOOD-1: Single-Source Flooding Mitigation (Fix 1 + Fix 2)
**Task:** Implement approved single-source flooding mitigation for the ClaimAssessmentBoundary pipeline per `Docs/WIP/2026-03-27_Bolsonaro_efc5e66f_Single_Source_Flooding_Investigation.md`.
**Files touched:** `verdict-stage.ts` (source portfolio builder + claim-local threading), `verdict-generation-stage.ts` (sources parameter), `claimboundary-pipeline.ts` (pass state.sources), `research-extraction-stage.ts` (applyPerSourceCap with best-N reselection), `research-orchestrator.ts` (cap enforcement + eviction), `config-schemas.ts` + `pipeline.default.json` (maxEvidenceItemsPerSource: 5), `claimboundary.prompt.md` (3 verdict sections + reseed), `verdict-stage.test.ts` (9 new tests), `research-extraction-stage.test.ts` (9 new tests).
**Key decisions:** (1) Source portfolio is **claim-local** (`sourcePortfolioByClaim: Record<string, SourcePortfolioEntry[]>`) — evidence concentration for AC_01 does not bleed into AC_02/AC_03. (2) Portfolio is **partition-scoped** — advocate sees portfolio from institutional evidence, challenger from general evidence, reconciler from full pool (respects D5 partitioning). (3) Per-source cap uses **best-N reselection** across existing+new items by probativeValue — a later high-quality item can displace an earlier weaker item from the same source (returns `evictedIds`). Within same tier, existing items preferred over new (no churn). (4) Prompt-contract changes instruct each role (advocate/challenger/reconciler) with role-appropriate SR-awareness rules.
**Review corrections applied:** Lead Architect review identified (a) global portfolio bled concentration across claims and ignored D5 partitioning → fixed with claim-local + partition-scoped portfolios, (b) first-come cap semantics → fixed with best-N reselection + eviction.
**Open items:** Live validation required — 4 runs per investigation §12: 2× Bolsonaro, 1× Plastik DE, 1× Hydrogen.
**Verification:** 1411 tests pass (70 files), build clean, config-drift clean, prompts reseeded (`df2b04aa → 9ba9f521`).
**For next agent:** Run the 4-run validation plan. Success criteria: AC_01 TP rises toward 55-65 range, no source contributes >5 items, no regression on Plastik DE or Hydrogen. Anti-success: cap discards critical evidence from sole-provider sources, verdict ignores SR data despite prompt change.

---

### 2026-03-27 | Lead Architect | Claude Code (Opus 4.6) | Single-Source Evidence Flooding Investigation + Multi-Agent Debate
**Task:** Investigate why job `efc5e66f` (Bolsonaro, MIXED 56/51) produced LEANING-FALSE on AC_01 instead of expected LEANING-TRUE.
**Files touched:** `Docs/WIP/2026-03-27_Bolsonaro_efc5e66f_Single_Source_Flooding_Investigation.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key findings:** (1) Single URL (civilizationworks.org, trackRecordScore=0.38) produced 11 evidence items — all `contradicts`/`high`/`organization_report` — flipping AC_01 from typical ~60 TP to 38. (2) SR is missing from the active verdict path — legacy weighting branch exists but only addresses supporting evidence, not contradicting. (3) No per-source item cap exists. (4) No within-source redundancy detection. (5) The seeded evidence LLM remap (`preliminaryEvidenceLlmRemapEnabled: true`) is NOT responsible — civilizationworks items are all Stage 2, not seeded.
**Debate:** Four-position debate (per-source cap advocate, SR integration advocate, LLM consolidation advocate, challenger/do-nothing). Consolidated and revised per GPT Senior Architect review.
**Proposal (revised):** Fix 1 + Fix 2 ship together. Fix 1: SR-aware verdict reasoning = payload (per-source portfolio summary in `verdict-stage.ts`) + prompt-contract (3 verdict sections in `claimboundary.prompt.md`) + prompt reseed. Fix 2: per-source item cap (`maxEvidenceItemsPerSource: 5`, blunt safety rail in extraction stage). Fix 3 deferred.
**Review corrections:** (1) Fix 1 scope expanded — not ~10 lines. (2) "SR inert" narrowed. (3) Fix 2 moved to same rollout. (4) Legacy weighting acknowledged as non-fallback for this case. (5) Cap tie-breaking described as blunt.
**Open items:** Prompt-contract changes require explicit human approval. Validation: 4 runs.
**For next agent:** Full investigation at `Docs/WIP/2026-03-27_Bolsonaro_efc5e66f_Single_Source_Flooding_Investigation.md`. Ship Fix 1 + Fix 2 together. Fix 1 needs: (a) per-source portfolio summary in verdict payload modeled on `source-reliability-calibration.ts`, (b) prompt instructions in VERDICT_ADVOCATE/CHALLENGER/RECONCILIATION, (c) prompt reseed.

---

### 2026-03-27 | Senior Developer | Claude Code (Opus 4.6) | Seeded Evidence LLM Remap — Validation Tightening
**Task:** Close two gaps before promotion decision: (1) add successful-path unit test with mocked LLM, (2) run one additional Bolsonaro live validation.
**Files touched:** `claimboundary-pipeline.test.ts` (1 new test + `beforeEach` for describe block), `2026-03-27_Senior_Developer_Seeded_Evidence_LLM_Remap_Experiment.md` (updated tables and observations).
**Test added:** Mocked LLM remap test — 2 claims, 3 prelim items (1 resolved, 2 unresolved semantic slugs), mock returns claim-specific mappings + invalid `AC_99`. Verifies: in-place mutation, invalid-ID filtering, resolved item untouched, no blanket attribution, llmCalls increment, correct prompt section call.
**Live run:** Bolsonaro-3 (`efc5e66f`) — extended input, 3 claims. MIXED 56.3/51.5. 27 seeded, 23 mapped, 4 unmapped — **85% remap success**. All claims have 4-6 sourceTypes, 9-10 domains. AC_02 UNVERIFIED is confidence-driven (41%), not diversity-starvation-driven (20 items, 4 sourceTypes, 9 domains).
**Verification:** 1393 tests pass, build clean.
**For next agent:** Handoff updated at `Docs/ARCHIVE/Handoffs/2026-03/2026-03-27_Senior_Developer_Seeded_Evidence_LLM_Remap_Experiment.md`. Both validation gaps closed. Promotion decision rests on 5 live runs (3 Bolsonaro, 1 Plastik DE, 1 Hydrogen) + 17 unit tests.

---

### 2026-03-27 | Senior Developer | Claude Code (Opus 4.6) | Seeded Evidence LLM Remap — Option C Implemented & Validated
**Task:** Implement and validate Option C (post-Pass-2 LLM remap) for unresolved seeded preliminary evidence claim mapping.
**Files touched:** `research-orchestrator.ts` (remap function + call site), `claimboundary-pipeline.ts` (barrel exports), `config-schemas.ts` + `pipeline.default.json` (`preliminaryEvidenceLlmRemapEnabled`), `claimboundary.prompt.md` (`REMAP_SEEDED_EVIDENCE` section), `claimboundary-pipeline.test.ts` (16 new tests).
**Key decisions:** (1) Integration point in `researchEvidence()` before `seedEvidenceFromPreliminarySearch()` — remap modifies understanding's preliminary evidence in-place, then existing seeding picks up updated IDs. (2) `wouldResolveExistingRemap()` helper replicates 4-step heuristic to identify only genuinely unresolved items. (3) Default `false` per task brief (experiment-first lifecycle). (4) Fail-open on any LLM or schema failure.
**Validation:** 4 runs — Bolsonaro-1 (83% remap, LEANING-TRUE 61.6/67.8), Bolsonaro-2 (69% remap, LEANING-TRUE 64.0/66.5), Plastik DE (zero regression, all 43 mapped), Hydrogen (76% remap, MOSTLY-FALSE 18.5/77.7). Zero UNVERIFIED. No blanket inflation. Baseline had 0% seeded mapping for Bolsonaro.
**Open items:** Default `false` — Captain decision to promote to `true`.
**For next agent:** Full validation report at `Docs/ARCHIVE/Handoffs/2026-03/2026-03-27_Senior_Developer_Seeded_Evidence_LLM_Remap_Experiment.md`. 1392 tests pass, build clean. UCM flag already active in local config.db. Ready for Captain review.

---

### 2026-03-27 | Lead Architect | Codex (GPT-5) | Single-Source Flooding Proposal Review
**Task:** Review `Docs/WIP/2026-03-27_Bolsonaro_efc5e66f_Single_Source_Flooding_Investigation.md` and assess the proposed 3-fix mitigation for civilizationworks-driven evidence flooding.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Confirmed the core runtime diagnosis: verdict prompts currently receive per-item `sourceType` / `probativeValue` / provenance metadata but no `trackRecordScore` or `trackRecordConfidence`, while both SR calibration and legacy post-hoc weighting are default-off in live config. Also confirmed there is no per-source extraction cap and no active within-source consolidation. Rejected the claim that SR is universally "unused" in code as overstated; a legacy weighting path exists, but it is disabled by default and would not be a sufficient fix. Recommended sequencing adjustment: Fix 1 is valid, but Fix 2 should be treated as the likely required safety rail, not merely a later option, because the existing challenger prompt already asks the LLM to detect shared-source dependence and did not stop this failure mode.
**Open items:** If implementation is approved, decide whether Fix 1 is only payload enrichment or a real prompt-contract change. If the latter, it needs explicit human approval plus prompt reseeding under `apps/web/prompts/claimboundary.prompt.md`.
**Warnings:** Do not frame Fix 1 as a pure `verdict-stage.ts` code tweak. Reliable SR-aware reasoning likely requires prompt guidance in addition to payload fields. Also do not rely on legacy `applyEvidenceWeighting()` as the fallback answer; its current shape is post-hoc and limited.
**For next agent:** Start with `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/prompts/claimboundary.prompt.md`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, and `apps/web/src/lib/analyzer/research-extraction-stage.ts`. Preserve the AGENTS rule that semantic consolidation must stay LLM-driven; deterministic caps are acceptable only as structural plumbing.
**Learnings:** no

---

### 2026-03-27 | Lead Architect | Codex (GPT-5) | Single-Source Flooding Implementation Review
**Task:** Review the implementation of Fix 1 (SR-aware verdict reasoning) and Fix 2 (per-source evidence cap) against the approved design.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Implementation is close, but not yet architecturally clean. Found two substantive issues: (1) `sourcePortfolio` is built once from the full evidence pool and passed unchanged into multi-claim verdict calls, so its `evidenceCount` is global rather than claim-local and also leaks across D5 advocate/challenger partitions; this weakens the intended “for this claim / for this role” concentration signal. (2) `applyPerSourceCap()` is incremental only: once a source has reached the cap, later higher-probative items from that same source are discarded rather than replacing weaker earlier items. The cap therefore enforces volume limits but does not truly retain the best `maxPerSource` items across the cumulative pool.
**Open items:** Rework Fix 1 to provide claim-local source concentration context, ideally `sourcePortfolioByClaim` (and preferably role-scoped when partitioning is active). Rework Fix 2 to reselect the best retained items per source across `existing + new`, or explicitly accept/document the weaker “first to fill wins” behavior.
**Warnings:** Test coverage added for the helpers is good, but it does not currently cover claim-local portfolio correctness, partition interaction, or replacement behavior once a source is already at the cap.
**For next agent:** Start in `apps/web/src/lib/analyzer/verdict-stage.ts` and `apps/web/src/lib/analyzer/research-extraction-stage.ts`. Preserve the structural-only nature of the cap and do not revert the prompt-contract work; the remaining work is about scoping and cumulative selection semantics.
**Learnings:** no

---

### 2026-03-27 | Lead Architect | Codex (GPT-5) | Single-Source Flooding Recommendation Update
**Task:** Re-evaluate the same implementation after live-file changes and independent sub-agent review.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The earlier global-portfolio concern is superseded. `verdict-stage.ts` now builds claim-local, role-scoped portfolios (`buildSourcePortfolioByClaim`) for advocate/self-consistency/challenger and a full claim-local portfolio for reconciliation. That architectural direction is correct. The current blocker is prompt-contract mismatch: Stage 4 now passes `sourcePortfolioByClaim` into VERDICT_ADVOCATE and VERDICT_CHALLENGER inputs, but the prompt sections still interpolate `${sourcePortfolio}`. `prompt-loader.ts` leaves unknown placeholders unchanged, so the new claim-local portfolio likely never reaches the model in those roles. Cap semantics were also re-reviewed: the current “first retained items consume slots; later items do not replace them” behavior is acceptable for initial rollout as a blunt safety rail, but the comments/tests should describe that honestly.
**Open items:** Align prompt variable names and tests with the current claim-local contract (`sourcePortfolioByClaim`) or change the code back to the original `sourcePortfolio` key consistently. Add focused tests that assert the rendered prompt input key matches the prompt contract.
**Warnings:** Do not approve the current working tree as-is. Fix 1 is partially broken until the prompt variable mismatch is corrected. Fix 2 does not block rollout, but its contract wording should not overstate “best items overall” semantics.
**For next agent:** Check `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/prompts/claimboundary.prompt.md`, `apps/web/src/lib/analyzer/prompt-loader.ts`, and `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`. Preserve claim-local, role-scoped portfolio semantics; the needed fix is consistency, not rollback.
**Learnings:** no

---

### 2026-03-27 | Lead Architect | Codex (GPT-5) | Single-Source Flooding Final Re-Review
**Task:** Re-review the latest source after the Senior Developer addressed the prompt-contract mismatch and updated tests.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** No review findings remain in the current source. The verdict path now consistently uses `sourcePortfolioByClaim` in code and prompts, including advocate, self-consistency, challenger, and reconciliation. The per-source cap semantics were also upgraded from incremental first-come retention to best-N re-selection across existing+new items with explicit eviction of weaker existing items. Focused verification passed: targeted vitest for verdict-stage + research-extraction-stage passed, and `npm -w apps/web run build` passed with prompt reseed unchanged.
**Open items:** Live validation against the Bolsonaro / Plastik / Hydrogen families remains the main empirical follow-up.
**Warnings:** Residual risk is behavioral, not structural: the LLM may still underuse the new portfolio signal in some edge cases, so live validation is still needed before calling the mitigation fully proven.
**For next agent:** If Captain wants confidence beyond static review, run the planned live validation matrix from the investigation document. Otherwise this implementation is architecturally acceptable for merge.
**Learnings:** no

---

### 2026-03-27 | Lead Developer | Codex (GPT-5) | Seeded Evidence Remap Canonization and Commit Split
**Task:** Sync the seeded-evidence remap work into canonical docs and commit the repo in meaningful chunks.
**Files touched:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/ARCHIVE/Handoffs/2026-03/2026-03-27_Senior_Developer_Seeded_Evidence_LLM_Remap_Experiment.md`, `Docs/WIP/2026-03-26_Bolsonaro_Seeded_Preliminary_Evidence_Mapping_Review.md`, `Docs/WIP/2026-03-26_Seeded_Evidence_LLM_Remap_Proposal.md`, `Docs/WIP/2026-03-26_Seeded_Evidence_Mapping_Fix_Investigation.md`, `Docs/WIP/2026-03-26_Seeded_Evidence_Mapping_Fix_Proposal_Rev2.md`, `Docs/WIP/2026-03-27_Bolsonaro_efc5e66f_Single_Source_Flooding_Investigation.md`, `Docs/WIP/2026-03-27_Seeded_Evidence_Remap_Promotion_Gate_Parked.md`
**Key decisions:** Canonized the current remap state as: implemented and validated as an **optional control**, default `false`, promotion gate parked. Updated `Current_Status.md` and `Backlog.md` to reflect that `preliminaryEvidenceLlmRemapEnabled` is available but not promoted to default-on. Updated the WIP index to include the parked promotion-gate resume point and the seeded-evidence proposal chain. Split commits intentionally: code landed first as `b70f1662` (`feat(analyzer): add seeded evidence llm remap experiment`), docs/status sync follows separately.
**Open items:** The final promote-or-hold decision for `preliminaryEvidenceLlmRemapEnabled` is still parked. Remaining verification lives in `Docs/WIP/2026-03-27_Seeded_Evidence_Remap_Promotion_Gate_Parked.md`.
**Warnings:** Do not treat the remap as canonical default-on behavior yet. The paused promotion gate still needs the OFF comparison runs and remapped-evidence spot-check before any default flip.
**For next agent:** Resume the default-on decision from `Docs/WIP/2026-03-27_Seeded_Evidence_Remap_Promotion_Gate_Parked.md`. Treat the current canonical state as: feature exists, default remains off, selective validation/use is approved.
**Learnings:** no

---

### 2026-03-27 | Lead Architect | Codex (GPT-5) | Remap Gate Sequencing Recommendation
**Task:** Advise whether live jobs should be run before resuming the parked seeded-evidence remap promotion gate.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Recommended running a small current-stack live A/B batch before resuming the parked gate. Reason: the parked remap evidence was collected on commit `1ff092cdf8b442d12716ddb1b704d5247554d199+df1135bd`, while current HEAD is `5654841be8cc` and the analyzer stack has materially changed due to the single-source flooding mitigation. The old batch is therefore not decision-grade for a default-on remap promotion. Also verified that the parked note is stale: job `a71bc67082b64bf0945bb4ee650b3148` is no longer running and actually succeeded (`LEANING-FALSE`, 36/75) on the old commit.
**Open items:** Run current-stack ON/OFF comparison jobs before making the promotion decision. Minimum recommended batch: Bolsonaro extended input ON/OFF plus Plastik DE ON/OFF with only `preliminaryEvidenceLlmRemapEnabled` toggled. Add second replicates only if the 4-run signal is ambiguous.
**Warnings:** Do not continue the parked gate as if it were still a clean same-stack comparison. The historical ON runs remain useful background, but not a merge/promotion-grade basis for a default flip after the new mitigation landed.
**For next agent:** Update `Docs/WIP/2026-03-27_Seeded_Evidence_Remap_Promotion_Gate_Parked.md` to mark `a71bc670` as completed, then use the current-stack A/B batch to decide whether remap still delivers net value under the new baseline. Spot-check remapped Bolsonaro items from the fresh ON run, not only the historical March 27 runs.
**Learnings:** no

---

### 2026-03-27 | Lead Architect | Codex (GPT-5) | Homeopathy Run `b5f29c58` Review
**Task:** Review live job `b5f29c5807aa4747903113c0c2b9b1d8` and state the architect-level conclusion.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Classified `b5f29c58` as a mixed/hold signal, not a positive promotion signal for seeded-evidence remap. The run is current-stack (`5654841be8cc...+d5ae0999`) and job events confirm remap was active (`Preliminary evidence remap: 26/30 items resolved`). Compared against same-input sibling `efe1102fda0f40cfa99e42096d45de1c` on the same commit, remap materially changed seeded claim attribution and pushed the top-line verdict upward (`LEANING-TRUE 60.8/74.2` → `MOSTLY-TRUE 75.8/24`), but overall report quality worsened because AC_03 collapsed to `UNVERIFIED 50/24` after a direction-integrity safe downgrade. This is evidence that remap is impactful on this family, but not evidence that it should be promoted to default-on.
**Open items:** If this input family matters, do manual claim-level comparison of seeded items on AC_02/AC_03 between `b5f29c58` and `efe1102f`, because the claim flips are too large to treat as benign noise.
**Warnings:** Both runs still contain grounding-check warnings for cited evidence IDs not present in the final evidence pool; `b5f29c58` shows the worse set. Treat the run as informative but not clean. Also, this broad thesis decomposes into a mechanistic subclaim, making it a weaker promotion-gate canary than Bolsonaro/Plastik.
**For next agent:** Use this run as a cautionary data point in the remap gate: remap ON can materially change claim-local attribution, but net value must be judged on confidence/integrity, not truth% alone.
**Learnings:** no

---

### 2026-03-27 | Lead Architect | Codex (GPT-5) | Remap Promotion Gate Final Architect Call
**Task:** Review the completed current-stack A/B promotion gate for `preliminaryEvidenceLlmRemapEnabled` and state the final architect recommendation.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Approved promotion to default-on, with an explicit monitor caveat for the Homeopathy family. The decisive evidence is the Bolsonaro pair (`e8d50baa` OFF vs `e25cb33c` ON): same verdict direction and essentially same truth/confidence, but seeded mapping improves from `0/27` to `22/24`, which is the ideal repair signature for this feature. Hydrogen corroborates the same pattern (large mapping recovery, stable FALSE-leaning outcome). Plastik DE shows additional seeded recovery with no directional regression outside its already-documented variance band. The Homeopathy pair remains a real caution signal, not something to hand-wave away, but it is not strong enough to outweigh the cleaner Bolsonaro/Hydrogen evidence for the default decision.
**Open items:** After the Captain flips the default, monitor Homeopathy-family runs and any broad evaluative multi-claim inputs where remap may concentrate seeded evidence unevenly across decomposed claims.
**Warnings:** Keep the rollback flag available. Also, the grounding-check warnings with missing evidence IDs observed in some runs are a separate integrity concern and should not be conflated with the remap promotion decision.
**For next agent:** If asked to operationalize the decision, update canonical status/backlog docs to reflect the default flip and preserve the Homeopathy monitor note. Do not present the promotion as universally risk-free; present it as approved with targeted monitoring.
**Learnings:** no

---

### 2026-03-27 | Lead Architect | Codex (GPT-5) | Remap Promotion Close-Out Check
**Task:** Verify the promoted default-on state for `preliminaryEvidenceLlmRemapEnabled` after commit `b5fad127` and identify any remaining close-out gaps.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Confirmed the promotion commit exists at HEAD (`b5fad127 feat(config): promote preliminaryEvidenceLlmRemapEnabled to default-on`), the working tree is clean, and config defaults are updated in code/JSON. The remaining gap is documentation sync: `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` still describe remap as parked/default-off. Architecturally, the promotion is accepted; canonization is not fully closed until those status docs are updated. Remote deployment is also still pending manual execution because the automated path was blocked by SSH key issues.
**Open items:** Update the status docs to reflect default-on + Homeopathy monitor note, then run the manual remote deploy command if deployment is still intended now.
**Warnings:** Do not let the repository present two different truths at once: code/defaults now say ON, but status docs still say OFF. That will confuse the next agent and any Captain reviewing current state.
**For next agent:** Update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` before treating REMAP-1 as fully closed. Preserve the monitor note and deployment caveat.
**Learnings:** no

---

### 2026-03-27 | Lead Architect | Codex (GPT-5) | Remap Promotion Deploy-Clear Check
**Task:** Verify the post-promotion confirmation runs and documentation sync after the follow-up docs commits.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The state is now deploy-clear. `65800acb` added the post-promotion confirmation runs, and current HEAD is `d5b13580` with follow-up doc refinements. Canonical docs now reflect the promoted default-on state (`Current_Status.md`, `Backlog.md`), and the post-promotion Homeopathy canary no longer reproduces the earlier confidence collapse (`de699b14` = 71.1 confidence). Bolsonaro confirmation also remains healthy (`bf2c3b9a` = LEANING-TRUE 70.4/69.0). The original monitor concern is therefore reduced from an open deploy risk to routine watchlist status.
**Open items:** Remote deployment still needs the manual `deploy-remote.ps1 -ForceConfigs` step if not already executed.
**Warnings:** The WIP filename `2026-03-27_Seeded_Evidence_Remap_Promotion_Gate_Parked.md` is now historically stale in name only; not a blocker, but it should eventually be renamed or archived during consolidation to avoid confusion.
**For next agent:** Treat REMAP-1 as canonically promoted and validated. If asked for next steps, focus on deployment execution and routine post-deploy monitoring rather than reopening the promotion gate.
**Learnings:** no

---

### 2026-03-27 | Lead Architect | Codex (GPT-5) | Remap Gate WIP Record Update
**Task:** Update `Docs/WIP/2026-03-27_Seeded_Evidence_Remap_Promotion_Gate_Parked.md` so it reads as a completed record instead of a parked stub.
**Files touched:** `Docs/WIP/2026-03-27_Seeded_Evidence_Remap_Promotion_Gate_Parked.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Rewrote the WIP file into a final completed-record document. It now captures the promotion decision, distinguishes old-stack background runs from the current-stack gate batch, records the post-promotion confirmation runs, and explicitly explains that the `_Parked` filename is historical only. Kept the file in place rather than renaming it because the request was to update the existing document and the repo already references this path.
**Open items:** During future WIP consolidation, either archive or rename this file so the filename matches its completed state.
**Warnings:** The content is now correct, but the path still carries the legacy `_Parked` suffix by design.
**For next agent:** Use the updated WIP file as the compact historical summary. Use the handoff docs for full operational detail.
**Learnings:** no

---

### 2026-03-27 | Lead Architect | Codex (GPT-5) | Direction Validator False Positive Rev 2 Review
**Task:** Re-review `Docs/WIP/2026-03-27_Direction_Validator_False_Positive_Investigation.md` after the stated Rev 2 corrections.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The three previously raised concerns were addressed: the doc now frames the incident as a two-layer failure with the LLM validator as primary, correctly characterizes self-consistency as advocate-partition stability rather than full-pool correctness, and corrects the implementation details around Rule 2 and `ConsistencyResult.stable`. One substantive review finding remains: the proposed mitigation section still overstates observability and understates scope. In the live code, when `isVerdictDirectionPlausible()` returns `true`, the path does not emit an info-level `AnalysisWarning`; it only logs `console.info`. Because the proposed change is an early exit inside `isVerdictDirectionPlausible()`, it would also affect the `verdictDirectionPolicy: "disabled"` path by suppressing diagnostics earlier, not just the `retry_once_then_safe_downgrade` enforcement path.
**Open items:** Revise Section 7 mitigations to match actual runtime behavior. If the intended design is to preserve an info-level warning even when rescued, that needs an explicit caller-side change in `validateVerdicts()`, not just a helper tweak.
**Warnings:** Do not approve the proposal text as-is; its current mitigation bullets misdescribe the behavior change and the diagnostic impact.
**For next agent:** Re-check `Docs/WIP/2026-03-27_Direction_Validator_False_Positive_Investigation.md` against `apps/web/src/lib/analyzer/verdict-stage.ts` lines 1118-1176 before approving any implementation prompt.
**Learnings:** no

---

### 2026-03-27 | Lead Architect | Codex (GPT-5) | Direction Validator False Positive Rev 3 Re-Review
**Task:** Re-review `Docs/WIP/2026-03-27_Direction_Validator_False_Positive_Investigation.md` after the observability and scope corrections.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** No review findings remain. Section 7 now correctly states that the current rescue path produces no persisted diagnostic signal, only `console.info`, and it properly frames the proposed info-level warning as a new implementation requirement rather than existing behavior. It also now correctly states that the rescue runs before the policy guard and therefore affects observability across all policy modes, not just `retry_once_then_safe_downgrade`.
**Open items:** If implementation is approved, the coding prompt should explicitly require caller-side warning emission on rescue so the behavior matches the document.
**Warnings:** The proposal still carries the inherent architectural caveat already acknowledged in the doc: advocate-side stability is not proof of full-pool correctness.
**For next agent:** Treat the investigation doc as architecturally review-ready. If moving to implementation, preserve the distinction between current behavior and proposed observability changes.
**Learnings:** no

---

### 2026-03-27 | Lead Architect | Codex (GPT-5) | Direction Validator Fix Implementation Review
**Task:** Review the implementation of the direction-validator false-positive fix in `apps/web`.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Found one remaining review issue. The new persisted warning for plausibility rescue is emitted only on the initial rescue path in `validateVerdicts()`, but not when a repaired verdict later passes via `isVerdictDirectionPlausible()` during re-validation. That means plausibility-based overrides are still not fully observable. Focused verification passed: `npm -w apps/web exec vitest run test/unit/lib/analyzer/verdict-stage.test.ts`.
**Open items:** Add the same `direction_rescue_plausible` warning (or equivalent) on the repaired-verdict rescue branch, and add a focused test for that path.
**Warnings:** As implemented, admins can still miss a subset of rescue events, specifically repaired verdicts accepted because the plausibility helper returns `true` at the second validation gate.
**For next agent:** Inspect `apps/web/src/lib/analyzer/verdict-stage.ts` around lines 1123 and 1155. The first branch now emits the warning; the second still silently accepts the repaired verdict.
**Learnings:** no

---

### 2026-03-27 | Lead Architect | Codex (GPT-5) | Direction Validator Fix Final Re-Review
**Task:** Re-review the direction-validator false-positive fix after the repaired-path warning and warning-contract tests were added.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** No review findings remain. `direction_rescue_plausible` is now emitted on both the initial plausibility-rescue path and the repaired-verdict rescue path, with `phase: "post_repair"` on the latter. The warning contract is also now directly tested for both `rescueReason: "evidence_ratio"` and `rescueReason: "stable_consistency"` plus `consistencySpread`. Focused verification passed again: `npm -w apps/web exec vitest run test/unit/lib/analyzer/verdict-stage.test.ts`.
**Open items:** None from architecture review.
**Warnings:** The existing design caveat still applies by construction: stable advocate-side consistency is not proof of full-pool correctness.
**For next agent:** Treat this implementation as review-approved. If additional verification is desired, the next step is live validation on the Homeopathy-family scenario that originally triggered the investigation.
**Learnings:** no

---

### 2026-03-27 | Lead Architect | Codex (GPT-5) | Outage Resilience Commit 83a50d8c Review
**Task:** Review the claimed “complete outage resilience” state after commit `83a50d8c`.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Found two substantive gaps. First, the new watchdog auto-resume resumes on any HTTP response from the Anthropic endpoint, including unauthenticated `401`, so pauses caused by auth errors, rate limits, or provider-side outages can clear incorrectly. The included integration test explicitly encodes `401` as a successful auto-resume. Second, the “current job fails cleanly” claim only holds after the breaker is already open. `claimboundary-pipeline.ts` rethrows only when `isSystemPaused()` is true, but provider-health opens the circuit only after 3 consecutive failures; a first outage-hit Stage 4 failure can still fall through to damaged fallback verdicts before the pause trips.
**Open items:** Gate auto-resume by pause cause (or by a real half-open/provider-health probe) instead of “any HTTP response”, and close the first-job fallback gap if the goal is truly zero damaged fallback reports during an outage.
**Warnings:** The current implementation is good progress for raw internet outage recovery, but it is not yet equivalent to a robust provider-health circuit for all pause causes.
**For next agent:** Re-check `apps/web/src/lib/internal-runner-queue.ts`, `apps/web/src/lib/provider-health.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, and `apps/web/test/unit/lib/drain-runner-pause.integration.test.ts` before declaring outage resilience “complete”.
**Learnings:** no

---

### 2026-03-27 | Lead Architect | Codex (GPT-5) | Outage Resilience Follow-Up Re-Review
**Task:** Re-review the outage-resilience changes after the network-only auto-resume guard and plan-doc correction.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** No review findings remain on the two previously identified issues. `internal-runner-queue.ts` now gates auto-resume behind `isPausedDueToNetwork()`, so auth/rate-limit pauses are not eligible for the watchdog probe, and `drain-runner-pause.integration.test.ts` now directly asserts that non-network pauses do not call the probe. The plan doc also now correctly documents that the first outage-hit job can still produce fallback verdicts before the breaker trips and identifies A.3 / within-job counting as the remaining path to close that gap.
**Open items:** The first-job gap remains a documented follow-on rather than an implemented fix.
**Warnings:** There is still a low-risk maintenance concern that the network pattern list is duplicated between `error-classification.ts` and `internal-runner-queue.ts`; not a review finding, but worth keeping aligned if patterns evolve.
**For next agent:** Treat the previous two outage-resilience review findings as closed. If this area is reopened, focus on A.3 pre-call probing or a within-job failure counter rather than watchdog semantics.
**Learnings:** no

---

### 2026-03-27 | Senior Developer | Codex (GPT-5) | A.3 Pre-Stage-4 Connectivity Probe
**Task:** Implement A.3 so Stage 4 fast-fails on clear LLM connectivity loss instead of producing first-outage-hit fallback verdicts.
**Files touched:** `apps/web/src/lib/connectivity-probe.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/src/lib/internal-runner-queue.ts`, `apps/web/test/unit/lib/connectivity-probe.test.ts`, `apps/web/test/unit/lib/analyzer/verdict-preflight.test.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `Docs/WIP/2026-03-27_Internet_Outage_Resilience_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added a shared LLM connectivity probe module with provider-aware default endpoints and a 5s timeout. Refactored Stage 4 entry in `claimboundary-pipeline.ts` into `runVerdictStageWithPreflight()`, which probes before verdict generation, aborts cleanly on transport failure, and records clear network failures into provider-health so repeated preflight failures can still open the LLM circuit and pause the system. Reused the same probe module in the watchdog auto-resume path instead of keeping duplicate fetch logic.
**Open items:** Stage 2 LLM failures still do not feed provider-health. Preflight timeout failures abort the current job fast but do not currently count toward opening the LLM circuit because timeout classification remains separate from clear network-connectivity failures.
**Warnings:** The preflight intentionally probes the configured primary LLM provider endpoint, which is correct for the internet-outage gap this task targeted. It does not attempt multi-provider semantic health checks for every per-role override.
**For next agent:** Safe verification passed end-to-end: `npm test`, `npm -w apps/web run build`, plus focused runs for `test/unit/lib/connectivity-probe.test.ts`, `test/unit/lib/analyzer/verdict-preflight.test.ts`, `test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, and `test/unit/lib/drain-runner-pause.integration.test.ts`. If this area is extended, the next likely decision is whether preflight timeouts should also count toward provider-health pause/open behavior.
**Learnings:** no

---

### 2026-03-27 | Senior Developer | Codex (GPT-5) | Network Matcher Dedup Follow-Up
**Task:** Apply the low-priority cleanup to deduplicate the watchdog's network-connectivity matcher.
**Files touched:** `apps/web/src/lib/error-classification.ts`, `apps/web/src/lib/internal-runner-queue.ts`, `apps/web/test/unit/lib/error-classification.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Exported `isNetworkConnectivityFailureText()` from `error-classification.ts`, switched `classifyError()` to use it internally, and updated `internal-runner-queue.ts` to reuse the same helper instead of carrying its own regex list. Added focused unit coverage for the exported helper.
**Open items:** None from this cleanup itself. The broader provider-scan suggestion remains intentionally out of scope.
**Warnings:** This is a maintenance-only follow-up; behavior should remain unchanged.
**For next agent:** Focused verification passed: `npm -w apps/web exec vitest run test/unit/lib/error-classification.test.ts test/unit/lib/auto-pause-flow.integration.test.ts test/unit/lib/drain-runner-pause.integration.test.ts`.
**Learnings:** no

---

### 2026-03-28 | Senior Developer | Codex (GPT-5) | Execution-Time Commit Provenance
**Task:** Make job provenance reflect the commit that actually executed a job attempt, including automatic system re-queues after restart.
**Files touched:** `apps/web/src/lib/build-info.ts`, `apps/web/src/app/api/version/route.ts`, `apps/web/src/lib/internal-runner-queue.ts`, `apps/web/src/app/jobs/[id]/page.tsx`, `apps/web/test/unit/lib/build-info.test.ts`, `apps/api/Data/Entities.cs`, `apps/api/Controllers/InternalJobsController.cs`, `apps/api/Controllers/JobsController.cs`, `apps/api/Services/JobService.cs`, `apps/api/migrations/20260328000000_AddExecutedWebGitCommitHash.cs`, `apps/api/migrations/FhDbContextModelSnapshot.cs`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added `ExecutedWebGitCommitHash` as execution-time provenance on the API job entity instead of overloading the existing creation-time `GitCommitHash`. The web runner now resolves the active web commit once per run, includes it in internal status updates, and also writes it into `resultJson.meta.executedWebGitCommitHash`. Admin job APIs expose both hashes, the admin job detail UI shows execution commit first with creation commit as secondary context when they differ, and the existing `gitHash` filter now matches either creation or execution hashes.
**Open items:** The new DB column exists in code and migration, but the migration still needs to be applied on existing databases. Historical jobs will naturally have `ExecutedWebGitCommitHash = null` until they are re-run. The admin jobs list still labels/filter state generically; only the detail page was updated in this pass.
**Warnings:** API verification required a separate output path because the local dev API process was holding `apps/api/bin/Debug/net8.0/FactHarbor.Api.dll` open. Web verification passed normally. This change adds provenance only; it does not alter analysis behavior.
**For next agent:** Verification passed with `npm test`, `npm -w apps/web run build`, and `dotnet build apps/api -o C:\\DEV\\FactHarbor\\apps\\api\\bin-verify\\provenance-fix /p:UseAppHost=false`. Before relying on the new field locally or on a persistent environment, run the API migration so `ExecutedWebGitCommitHash` exists in `Jobs`.
**Learnings:** no

---

### 2026-03-28 | Senior Developer | Codex (GPT-5) | Simplify Commit Provenance UI
**Task:** Reduce the surfaced provenance back to one visible commit hash while keeping execution-time provenance correct.
**Files touched:** `apps/api/Controllers/JobsController.cs`, `apps/web/src/app/jobs/[id]/page.tsx`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Kept both hashes in storage, but changed the API/UI contract so `gitCommitHash` now resolves to `ExecutedWebGitCommitHash ?? GitCommitHash`. That preserves the existing “nice” single-hash UI while making the visible hash execution-time authoritative for new jobs and legacy-compatible for old ones.
**Open items:** Existing databases still need the migration for `ExecutedWebGitCommitHash`. Historical jobs continue to show the old creation-time hash until they are rerun because no execution-time value exists for them.
**Warnings:** The admin list/detail `gitHash` filter still matches both creation-time and execution-time hashes in the backend, which is intentional for mixed historical data during transition.
**For next agent:** Verification passed again after the simplification: `npm test`, `npm -w apps/web run build`, and `dotnet build apps/api -o C:\\DEV\\FactHarbor\\apps\\api\\bin-verify\\provenance-fix-ui /p:UseAppHost=false`.
**Learnings:** no

---

### 2026-03-28 | Senior Developer | Codex (GPT-5) | Dirty Local Build ID Support
**Task:** Make the visible execution-time provenance include dirty local working-tree state and ensure admin hash tracing accepts `+` build ids.
**Files touched:** `apps/web/src/lib/build-info.ts`, `apps/web/test/unit/lib/build-info.test.ts`, `apps/api/Controllers/JobsController.cs`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Upgraded the web-side build-id resolver to mirror the API’s local behavior: clean local runs return the current commit hash, dirty local runs return `{hash}+{wthash}` or `{hash}+dirty`. Updated admin `gitHash` normalization so links and manual tracing accept dirty build ids instead of stripping `+` away.
**Open items:** The UI label still says `Commit`, even though a dirty local value is semantically a build fingerprint. That was kept intentionally to preserve the existing UI surface.
**Warnings:** Production remains clean-commit only because `GIT_COMMIT` still wins. Dirty suffixes only appear on local/dev-style execution paths where git is available and the web runner has uncommitted changes.
**For next agent:** Focused follow-up verification passed with `npm -w apps/web exec vitest run test/unit/lib/build-info.test.ts` and `dotnet build apps/api -o C:\\DEV\\FactHarbor\\apps\\api\\bin-verify\\dirty-build-id /p:UseAppHost=false`.
**Learnings:** no

---

### 2026-03-28 | Senior Developer | Codex (GPT-5) | Provenance Review Hardening Follow-Up
**Task:** Apply the low-risk review fixes to execution-time commit provenance and stop where added scope outweighed benefit.
**Files touched:** `apps/web/src/lib/build-info.ts`, `apps/web/src/app/api/version/route.ts`, `apps/web/src/lib/internal-runner-queue.ts`, `apps/api/Controllers/JobsController.cs`, `apps/web/test/unit/lib/build-info.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added cached build-id lookup for `/api/version`, normalized fallback env-hash paths, stopped sending `executedWebGitCommitHash` on every progress update, tightened dirty-suffix filter validation to `+dirty` or 8 hex chars, documented the untracked-file limitation in the working-tree hash, and added both clean-working-tree and dirty-`GIT_COMMIT` unit coverage. Deliberately did **not** create a brand-new API test harness just to unit-test `NormalizeGitHashFilter`, because the repo currently has no API test project and that would have been higher scope than the review value justified.
**Open items:** `NormalizeGitHashFilter` still has no dedicated C# unit test. That is the only review item intentionally left unfixed due to setup cost vs. payoff.
**Warnings:** `build-info.ts` now caches only when explicitly requested. The runner still resolves uncached execution provenance once per job, which is intentional to keep per-run provenance accurate during local dev.
**For next agent:** Full safe verification passed after this follow-up: `npm -w apps/web exec vitest run test/unit/lib/build-info.test.ts`, `npm test`, `npm -w apps/web run build`, and `dotnet build apps/api -o C:\\DEV\\FactHarbor\\apps\\api\\bin-verify\\provenance-fix-final /p:UseAppHost=false`.
**Learnings:** no

---

### 2026-03-28 | Senior Developer | Codex (GPT-5) | API Startup Fix For Provenance Schema Drift
**Task:** Repair the local `/jobs` 500 after the execution-time commit provenance change broke API startup on an existing SQLite database.
**Files touched:** `apps/api/Program.cs`, `apps/api/migrations/20260321000000_AddGitCommitHash.cs`, `apps/api/migrations/20260328000000_AddExecutedWebGitCommitHash.cs`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Root cause was twofold: the new `ExecutedWebGitCommitHash` column did not exist in the local `Jobs` table, and both manual provenance migrations used `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, which SQLite rejected. Worse, these hand-authored migration files are not present in `__EFMigrationsHistory`, so relying on `Database.Migrate()` alone was not sufficient. Fixed this by changing both provenance migrations to plain `AddColumn(...)` and adding a narrow startup schema-compatibility shim in `Program.cs` that ensures `GitCommitHash` and `ExecutedWebGitCommitHash` exist before the first `Jobs` query runs.
**Open items:** The new startup compatibility shim means mixed historical SQLite DBs will self-heal on restart, but the manual provenance migrations still are not tracked in `__EFMigrationsHistory`. That is consistent with earlier manual schema additions in this repo, but worth remembering if API migration strategy is cleaned up later.
**Warnings:** This patch modifies the local SQLite schema on startup by adding missing nullable text columns. Historical jobs still have `ExecutedWebGitCommitHash = NULL` until they are rerun.
**For next agent:** Live recovery verified after `scripts/restart-clean.ps1`: `http://localhost:5000/v1/jobs?page=1&pageSize=1` returned 200, `http://localhost:3000/api/fh/jobs?page=1&pageSize=1` returned 200, and `PRAGMA table_info(Jobs)` now includes `ExecutedWebGitCommitHash`.
**Learnings:** no

---

### 2026-03-28 | Senior Developer | Codex (GPT-5) | Test Dashboard LLM Coverage
**Task:** Make Admin → Configuration Test Dashboard cover LLM providers that are actually used by debate roles or already configured in env, not only the global `pipeline.llmProvider`.
**Files touched:** `apps/web/src/app/api/admin/test-config/route.ts`, `apps/web/src/app/admin/test-config/page.tsx`, `apps/web/test/unit/app/api/admin/test-config/route.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Switched the LLM test route to load effective pipeline config via `loadPipelineConfig("default")`, derive provider usage from both `pipeline.llmProvider` and `debateRoles.*.provider`, and run checks for any provider that is either used by config or has credentials present in env. Kept unused-and-unconfigured providers as `skipped`, updated the UI help text to reflect that behavior, and added Google alias support so `GOOGLE_API_KEY` is treated as configured alongside `GOOGLE_GENERATIVE_AI_API_KEY`.
**Open items:** Search-provider coverage logic is unchanged; this patch only broadens LLM coverage in the dashboard.
**Warnings:** “Run All Tests” now performs live checks against any configured LLM provider, even if that provider is only a fallback/debate-role provider. That is intentional and may increase dashboard test cost slightly when multiple LLM keys are present.
**For next agent:** Verification passed with `npx vitest run test/unit/app/api/admin/test-config/route.test.ts` and `npm run build` from `apps/web`. If you need to validate the live dashboard behavior manually, use the admin test page; no additional code changes should be required.
**Learnings:** no

---

### 2026-03-28 | Senior Developer | Codex (GPT-5) | Google LLM Env Var Correction
**Task:** Correct the Google LLM credential handling after confirming the installed `@ai-sdk/google` package only defaults to `GOOGLE_GENERATIVE_AI_API_KEY`, not `GOOGLE_API_KEY`.
**Files touched:** `apps/web/src/app/api/admin/test-config/route.ts`, `apps/web/src/app/admin/test-config/page.tsx`, `apps/web/src/lib/analyzer/verdict-generation-stage.ts`, `apps/web/src/app/api/health/route.ts`, `apps/web/test/unit/app/api/admin/test-config/route.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Removed the dashboard-only `GOOGLE_API_KEY` alias, updated the Stage 4 provider-credential precheck to require `GOOGLE_GENERATIVE_AI_API_KEY` for Google, and renamed the health-route diagnostic field so it no longer implies the wrong env var. Kept the broader LLM dashboard change itself: configured or actually-used providers are still tested even when they are not the global `pipeline.llmProvider`.
**Open items:** `claimboundary-pipeline.test.ts` still saves/restores `GOOGLE_API_KEY` in one cleanup block, but it no longer influences Google credential detection and did not need behavior changes.
**Warnings:** The immediately previous agent-output entry mentions `GOOGLE_API_KEY` support for the dashboard; this follow-up supersedes that part.
**For next agent:** Verification passed with `npx vitest run test/unit/app/api/admin/test-config/route.test.ts`, `npx vitest run test/unit/lib/analyzer/claimboundary-pipeline.test.ts --testNamePattern "missing credentials from explicitly configured providers"`, and `npm run build` from `apps/web`.
**Learnings:** no

---

### 2026-03-28 | Senior Developer | Codex (GPT-5) | Dashboard Tests Follow Active Default UCM
**Task:** Tighten Admin → Configuration Test Dashboard so LLM checks are driven only by the effective active default UCM config, not by arbitrary keys present in `.env.local`.
**Files touched:** `apps/web/src/app/api/admin/test-config/route.ts`, `apps/web/src/app/admin/test-config/page.tsx`, `apps/web/test/unit/app/api/admin/test-config/route.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Kept `loadPipelineConfig("default")` for LLM selection and changed the test plan so a provider is tested only when the effective active pipeline config actually uses it (`pipeline.llmProvider` or `debateRoles.*.provider`). Also switched search-provider selection to `loadSearchConfig("default")` for the same “runtime-effective default profile” behavior. Configured-but-inactive providers are now skipped again, with UI copy updated to say checks follow the effective default UCM config.
**Open items:** Earlier entries in this file that say “configured providers are also tested” are now superseded by this stricter rule.
**Warnings:** This reduces surprise and cost, but it also means a valid provider key can remain untested until the active default config actually routes work to that provider.
**For next agent:** Verification passed with `npx vitest run test/unit/app/api/admin/test-config/route.test.ts` and `npm run build` from `apps/web`. The route tests now cover both cases: inactive configured Google is skipped, and active Google via a debate role is tested.
**Learnings:** no

---

### 2026-03-28 | Senior Developer | Codex (GPT-5) | Dashboard Timeout And Error Cleanup
**Task:** Stop Admin → Configuration Test Dashboard from appearing stuck during live provider checks and replace verbose `AI_RetryError` stack dumps with concise provider messages.
**Files touched:** `apps/web/src/app/api/admin/test-config/route.ts`, `apps/web/src/app/admin/test-config/page.tsx`, `apps/web/test/unit/app/api/admin/test-config/route.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added real abort timeouts to the LLM test calls, parallelized independent checks inside the admin test route, and added a client-side fetch timeout so the UI exits “Running Tests...” with a clear error if the route still stalls. Also reused `classifyError()` to collapse quota/rate-limit failures into concise dashboard messages and removed stack-trace details from the visible result cards.
**Open items:** The dashboard still performs real live provider checks by design, so slow external providers can still delay completion up to the configured timeout window.
**Warnings:** Route execution order is now partially parallelized. Result order in the UI is preserved because `Promise.all()` result arrays are pushed in a fixed order, but provider calls now run concurrently.
**For next agent:** Verification passed with `npx vitest run test/unit/app/api/admin/test-config/route.test.ts` and `npm run build` from `apps/web`. The route tests now include the OpenAI quota error shape and assert that the user-facing message is concise.
**Learnings:** no

---

### 2026-03-29 | Senior Developer | Codex (GPT-5) | 2705 + e407 Matrix and All-Insufficient Investigation
**Task:** Determine whether local job `2705c6bf1c904306bd81a2040025024f` was only a Coverage Matrix UI issue, then analyze worse repeat run `e407cba4ac354248b21d26a4fb0ceaf7` and consolidate a prevention strategy.
**Files touched:** `Docs/ARCHIVE/Handoffs/2026-03/2026-03-29_Senior_Developer_2705_e407_Matrix_and_All_Insufficient_Investigation.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** `2705...` is partly a real UI bug (matrix headers built from all claim verdicts while the matrix body follows `coverageMatrix.claims`), but `e407...` proves a deeper pipeline bug: when all claims are D5-insufficient, `claimboundary-pipeline.ts` falls back to sending all claims into Stage 4, then appends insufficient-evidence fallbacks for those same claim IDs. That produces duplicate verdict entries and an article verdict driven by claims that should have short-circuited to `UNVERIFIED`. Separate residual issue: Stage-1 still over-splits this factual conjunct input (`Werkzeuge` vs `Methoden`) and contract validation still falsely reports perfect preservation.
**Open items:** Fix order should be: (1) stop Stage 4 from running on all-insufficient claim sets, (2) fix the matrix header/body mismatch and add a small transparency cue, (3) reopen the residual Stage-1 factual conjunct-splitting family as a separate refinement.
**Warnings:** `2705...` predates clean commit `fff7a508`; `e407...` ran on `fff7a508` plus a dirty suffix. The Stage-4 orchestration bug is still decisive because it is visible in stored result data, not just UI behavior.
**For next agent:** Read [2026-03-29_Senior_Developer_2705_e407_Matrix_and_All_Insufficient_Investigation.md](C:/DEV/FactHarbor/Docs/ARCHIVE/Handoffs/2026-03/2026-03-29_Senior_Developer_2705_e407_Matrix_and_All_Insufficient_Investigation.md) before proposing fixes. Do not paper over the issue with a verdict dedupe patch; the first real fix belongs in [claimboundary-pipeline.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claimboundary-pipeline.ts).
**Learnings:** no

---

### 2026-03-28 | Senior Developer | Codex (GPT-5) | Single-Attempt Provider Probes
**Task:** Make the Configuration Test Dashboard provider probes surface the real first provider error instead of timing out behind AI SDK retries.
**Files touched:** `apps/web/src/app/api/admin/test-config/route.ts`, `apps/web/test/unit/app/api/admin/test-config/route.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Set `maxRetries: 0` on the OpenAI/Anthropic/Google/Mistral `generateText()` probes. This keeps the dashboard as a fast health check rather than a retry-heavy workflow and allows quota/auth failures to return immediately instead of being masked as a 15s timeout.
**Open items:** If a provider still times out after this change, the underlying single request is genuinely stalling and would need deeper provider-specific diagnostics.
**Warnings:** This intentionally reduces resilience during the dashboard probe itself. That is correct for a diagnostic surface; the goal is fast truth, not best-effort recovery.
**For next agent:** Verification passed with `npx vitest run test/unit/app/api/admin/test-config/route.test.ts` and `npm run build` from `apps/web`. The route test now also asserts that the dashboard probes use `maxRetries: 0`.
**Learnings:** no

---

### 2026-03-29 | Senior Developer | Codex (GPT-5) | b8e6 Duplicate Atomic Claims Investigation
**Task:** Investigate why job `b8e616ef9a5e4678b074f2bb8614b2d1` produced extremely similar atomic claims and check whether a recent change caused it.
**Files touched:** `Docs/ARCHIVE/Handoffs/2026-03/2026-03-29_Senior_Developer_b8e6_Duplicate_Atomic_Claims_Investigation.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Root cause is Stage 1 over-splitting plus fallback dimension tagging, not a last-3-day committed regression. The run was classified `single_atomic_claim`, yet two near-duplicate claims were emitted and then auto-tagged `isDimensionDecomposition=true` by the fallback heuristic in `claim-extraction-stage.ts`, which exempted them from Gate 1 fidelity filtering. Recent committed changes do not implicate Stage 1: executed base commit `f1e5cc96...` is UI-only, the only extraction-area commit in the last 3 days was observability-only, and the heuristic itself dates to 2026-03-23.
**Open items:** Dirty-worktree suffix `+cbdf73b6` means uncommitted local changes were present at execution time, but the exact delta cannot be reconstructed from stored job data alone.
**Warnings:** Same Stage-1 pattern appears in several recent jobs; this is broader than a single SRG SSR input.
**For next agent:** Read [2026-03-29_Senior_Developer_b8e6_Duplicate_Atomic_Claims_Investigation.md](C:/DEV/FactHarbor/Docs/ARCHIVE/Handoffs/2026-03/2026-03-29_Senior_Developer_b8e6_Duplicate_Atomic_Claims_Investigation.md) before proposing fixes. The most likely targets are the `single_atomic_claim` dimension-tagging fallback and/or contract-validation false negatives.
**Learnings:** no

---

### 2026-03-29 | Senior Developer | Codex (GPT-5) | b8e6 + 8640 Claim Decomposition Debate
**Task:** Compare local job `b8e616ef9a5e4678b074f2bb8614b2d1` with deployed job `8640e06255c4455cb97c9c699700b5ed` and consolidate a root-cause/fix plan.
**Files touched:** `Docs/ARCHIVE/Handoffs/2026-03/2026-03-29_Senior_Developer_b8e6_8640_Claim_Decomposition_Debate.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The jobs are related, but not because of a fresh last-3-days committed regression. Shared issue: Stage 1 decomposition is too permissive and contract validation is too weak at rejecting non-independent claim splits. `b8e6` shows conjunct over-splitting (`Werkzeuge` vs `Methoden`) on a `single_atomic_claim`; `8640` shows aggressive evaluative decomposition (`effizient` vs `wirksam`) on an `ambiguous_single_claim`, with both downstream claims starving evidence and going `UNVERIFIED`. Secondary issue: the fallback `single_atomic_claim` → dimension-decomposition tagging in `claim-extraction-stage.ts` is too broad and muddies auditability.
**Open items:** Prompt-level strengthening for contract validation needs explicit approval. Dirty-worktree suffix on `b8e6` means an unknown uncommitted local delta existed at execution time.
**Warnings:** Do not over-attribute this to the fallback tag alone. The main problem is earlier: Pass 2 + contract validation accepted claim sets that were too close together to justify separate downstream research.
**For next agent:** Read [2026-03-29_Senior_Developer_b8e6_8640_Claim_Decomposition_Debate.md](C:/DEV/FactHarbor/Docs/ARCHIVE/Handoffs/2026-03/2026-03-29_Senior_Developer_b8e6_8640_Claim_Decomposition_Debate.md). Recommended fix order: (1) narrow the fallback tag so explicit `single_atomic_claim` does not auto-become dimension decomposition; (2) strengthen `CLAIM_CONTRACT_VALIDATION` whole-set coherence / independence checks; (3) validate on `b8e6`, `8640`, Bolsonaro compound claim, and a clean control.
**Learnings:** no

---

### 2026-03-29 | Senior Developer | Codex (GPT-5) | Claim-Splitting Debate: b8e6 and 8640
**Task:** Compare local job `b8e6...` and remote job `8640...`, determine whether they share a root cause, and propose a consolidated fix strategy.
**Files touched:** `Docs/ARCHIVE/Handoffs/2026-03/2026-03-29_Senior_Developer_Claim_Splitting_Debate_b8e6_8640.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The jobs are related but not identical. `b8e6...` is primarily a `single_atomic_claim` fallback mis-tagging problem: near-duplicate conjunct splits were auto-tagged as dimension decompositions and escaped Gate 1 fidelity filtering. `8640...` is a broader over-decomposition / independence-validation problem: three claims were accepted, but two close evaluative claims (`effizient`, `wirksam`) both starved at D5. No evidence points to a last-3-day committed regression; the key Stage-1 fallback behavior predates that window.
**Open items:** Exact dirty-worktree deltas at execution time remain unknowable from stored job data alone.
**Warnings:** A narrow duplicate-detector fix would likely address `b8e6...` better than `8640...`; the broader need is an LLM-based post-Pass-2 independence/overlap validator plus a narrower `single_atomic_claim` fallback.
**For next agent:** Read [2026-03-29_Senior_Developer_Claim_Splitting_Debate_b8e6_8640.md](C:/DEV/FactHarbor/Docs/ARCHIVE/Handoffs/2026-03/2026-03-29_Senior_Developer_Claim_Splitting_Debate_b8e6_8640.md). Best next step is a design review, not immediate coding.
**Learnings:** no

---

### 2026-03-29 | Lead Architect | Codex (GPT-5) | Re-review of 2705/e407 Root Fix Package
**Task:** Re-assess whether the proposed `all-insufficient short-circuit + matrix label fix + aggregation dedup guard` package is a true root fix or mostly symptom handling.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The all-insufficient short-circuit is a true root fix for `e407`: Stage 4 must not run on claims D5 already marked insufficient. The matrix label fix is also legitimate, but it is a separate presentation/data-contract repair, not part of the e407 root cause. The aggregation dedup guard is not a root fix; it is optional defense-in-depth and should not be the primary mechanism relied on. No salvage step is warranted now because the architecture should first enforce the invariant that Stage 4 only receives assessable claims; salvage would be a separate, higher-order recovery feature if the all-insufficient rate remains problematic after the upstream Stage-1 work settles.
**Open items:** If the team wants stronger architecture later, the right direction is a typed assessed-claim subset passed from D5 into Stage 4/UI/aggregation rather than ad hoc filtering plus fallback behavior.
**Warnings:** Do not let an aggregation dedup layer become the thing that hides invalid pipeline states. Duplicate claim IDs in `claimVerdicts` should be treated as a bug signal, not normalized away by default.
**For next agent:** The immediate implementation order should be: (1) short-circuit all-insufficient before Stage 4, (2) align matrix labels with `coverageMatrix.claims`, (3) only add a minimal assertive duplicate guard if you want defense-in-depth. Do not add salvage or broader architecture changes in the same patch.
**Learnings:** no

---

### 2026-03-30 | Code Reviewer | Codex (GPT-5) | Review of cc362d64 + Recent Job Effects
**Task:** Review implementation commit `cc362d64` (`assessableClaims` path + verdict uniqueness + matrix alignment) and compare its intended effects against recent local job runs.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** No blocking code defect found in the patch itself. `claimboundary-pipeline.ts` now correctly routes only D5-sufficient claims into Stage 4 and throws on duplicate final verdict IDs; `page.tsx` now derives matrix labels from `coverageMatrix.claims`. Main review gaps are validation-related: the implementation handoff explicitly states no new targeted tests were added, and the live validation set did not directly exercise the all-insufficient branch the patch is meant to repair. Recent local jobs on dirty build `94593477...+bfb6811c` show the expected effect direction: `55299...` and `11c529...` have no duplicate claim IDs and matrix claims align to the assessable subset; `5f1f96...` removes the earlier `e407` duplicate-verdict symptom but does so on a run where both claims were assessable.
**Open items:** Add focused tests for (1) all-insufficient -> no Stage 4 verdicts, (2) duplicate verdict invariant throw, and (3) matrix labels keyed strictly to `coverageMatrix.claims`. Re-run at least one clean post-commit all-insufficient scenario on exact build `cc362d64` or later.
**Warnings:** Recent validation jobs were not executed on the committed hash `cc362d64`; they were run on a dirty lineage based on `94593477`. Also, the broader SRG Stage-1 instability remains: identical input family still produced both a 2-claim (`55299...`) and 3-claim (`11c529...`) decomposition under the same dirty build.
**For next agent:** Read the implementation handoff and inspect job IDs `55299b20161141869e01071b12dc3a65`, `5f1f96f650d24036bce358c3f3053b69`, and `11c5295a9a7345ad841b832f2970bfa4`. Treat `cc362d64` as code-review approved with validation caveats, not as a fully closed operational proof.
**Learnings:** no

---

### 2026-03-31 | Lead Architect | Codex (GPT-5) | DistinctEvents Event-Granularity Family Effects Memo
**Task:** Review likely live-job-family effects of the proposed `distinctEvents` / event-granularity fix using current local jobs, archived quality docs, and current prompt rules; identify where the fix would help, where it could harm, and what validation gate is required.
**Files touched:** `Docs/WIP/2026-03-31_DistinctEvents_Event_Granularity_Family_Effects_Memo.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The current Bolsonaro degradation is still best explained by wrong event granularity upstream: current `"various/all"` jobs (`791073...`, `34149...`, `0d21...`) populate `distinctEvents` with STF lifecycle milestones instead of top-level independently researchable proceedings like STF vs TSE, so Stage 2 faithfully over-researches STF. But the first proposed fix shape ("prefer top-level proceedings over lifecycle events") is too blunt. Current article/timeline-style inputs like `a2b7e76c...` already use `distinctEvents` correctly, and single-proceeding legal inputs like `696d...` can legitimately need lifecycle phases. The adjusted recommendation is a generic, conditional design: strengthen `distinctEvents` guidance for collection-style multi-proceeding/process inputs so they prefer top-level independently researchable units, while preserving lifecycle/timeline detail when the input is really about one process chronology or an article argued through episodes. If prompt-only behavior still looks too blunt, the safer extension is a narrow LLM-based `distinctEvents` validation/repair step for collection-style inputs only.
**Open items:** No implementation yet. Prompt changes still require explicit approval. If this workstream continues, the exact prompt language should be reviewed together with the validation gate before coding.
**Warnings:** Do not key the fix to literal words like `"various"`. Do not globally ban lifecycle events. Do not try to solve this in verdict logic, matrix logic, or with deterministic semantic heuristics. Guardrail families are important: single-proceeding Bolsonaro, article/timeline URL inputs, SRG/SRF compound inputs, and broad evaluative controls must remain stable.
**For next agent:** Start with the memo at `Docs/WIP/2026-03-31_DistinctEvents_Event_Granularity_Family_Effects_Memo.md`. The required validation set should include: Bolsonaro EN `"various"` / `"all"` / proceedings-statement variants, PT Bolsonaro as multilingual multi-event control, a non-political multi-event/process control (March 7 plan uses Boeing 737 MAX investigations + recertification), a single-proceeding Bolsonaro guardrail (`696d...` / `14d7...`), the `wind-still.ch` URL input (`a2b7...`), SRG/SRF compound control (`11c529...`), and broad evaluative inertness controls like `9e4d...` and Homeopathy. Key pass criteria: Bolsonaro `"various/all"` regains top-level multi-proceeding coverage; article/timeline inputs do not flatten; broad evaluative inputs do not start inventing `distinctEvents`.
**Learnings:** no

---

### 2026-03-30 | Senior Developer | Codex (GPT-5) | Flat-Earth False Ambiguity Investigation
**Task:** Investigate why job `c7c3528ce21b46abb1b4965466ad0c3d` extracted `Flacherde-Überzeugungen sind in der modernen Gesellschaft weit verbreitet` from input `Ist die Erde flach?`, and propose a generic fix.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The issue is upstream in Stage 1 and predates the recent integrity work. Both `c7c3528...` and the older `c492414d...` classified `Ist die Erde flach?` as `ambiguous_single_claim`, then decomposed it into a direct physical-property claim plus a representational/prevalence claim. That second claim is not part of the user's thesis. Root cause is not the matrix or verdicting; it is that the ambiguous-claim pathway is still too permissive for direct factual-property questions. The fix should be generic and LLM-based: tighten Pass 2 prompt rules so direct factual predicates/properties remain `single_atomic_claim` unless the wording itself asks about multiple interpretations, and strengthen contract validation so public-perception / prevalence / discourse claims fail when the input asks about a direct real-world property.
**Open items:** Current observability is misleading here: `understanding.contractValidationSummary` reflects the original failed extraction (including a transient spherical-shape inversion), not the final accepted retry output. If this family is implemented, persist the retry validation outcome or selected-candidate summary too.
**Warnings:** Do not fix this with hardcoded Flat-Earth or belief/prevalence keywords. The solution must stay generic, multilingual, and prompt-driven.
**For next agent:** Use `c7c3528ce21b46abb1b4965466ad0c3d` and `c492414da7fa422c8ef51156488b9e04` as characterization cases. Proposed implementation order: (1) prompt-level narrowing of `ambiguous_single_claim` for direct factual-property questions, (2) stronger contract-validation whole-set rejection of representational/prevalence claims unless the input explicitly asks about them, (3) better persistence of retry contract-validation diagnostics.
**Learnings:** no

---

### 2026-03-30 | Lead Architect | Codex (GPT-5) | Matrix and Aggregation Handling of UNVERIFIED Claims
**Task:** Investigate whether D5-insufficient `UNVERIFIED` claims should be shown in the matrix and influence article-level aggregation in jobs like `11c5295a...`.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Current behavior excludes unresolved claims at two layers: `claimboundary-pipeline.ts` builds `coverageMatrix` from `assessableClaims` only, and `aggregation-stage.ts` gives `UNVERIFIED` claims zero effective weight because the claim weight multiplies by `confidence / 100`. A proper solution should separate these concerns. Matrix display should visualize evidence coverage for all final/atomic claims, while Stage 4 should still operate only on assessable claims. Article aggregation should not rely on old buggy UI effects or duplicate verdicts; if product wants unresolved claims to matter, that must be implemented explicitly as an unresolved-claim penalty or neutral blend in aggregation, not as accidental LLM side effects.
**Open items:** Any unresolved-claim aggregation penalty would change analysis output and should likely be UCM-tunable.
**Warnings:** Do not “fix” this by reverting the old broken label behavior. The correct path is to keep matrix labels driven by `coverageMatrix.claims`, while reconsidering what `coverageMatrix.claims` should contain and how zero-confidence claims should influence article-level confidence/truth.
**For next agent:** Anchor on job `11c5295a9a7345ad841b832f2970bfa4`. Treat matrix visibility and article aggregation as separate design decisions. Keep the `assessableClaims` Stage 4 integrity fix intact.
**Learnings:** no

---

### 2026-03-30 | Lead Architect | Codex (GPT-5) | Speed/Cost Optimization Reassessment on Current CB Stack
**Task:** Re-read the historical speed/cost optimization docs, compare them to the current ClaimAssessmentBoundary code, and identify the best next optimization by benefit vs report-quality risk.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Several previously discussed optimization items are now stale against the code. `P1-A2` / “parallel verdict generation” is still listed in `Current_Status.md` and `Backlog.md`, but Stage 4 already batches claims per debate step and already parallelizes Steps 2+3 plus the validation checks; that old recommendation should no longer drive decisions. `P1-B` preliminary-search parallelism and W15 same-domain fetch staggering are also already implemented in code. The remaining real hotspot is the Stage 2 research loop: inside `runResearchIteration`, each generated query still runs search -> relevance LLM -> fetch -> extraction LLM serially, up to `researchMaxQueriesPerIteration=3` across `maxTotalIterations=10`. Best next engineering optimization: parallelize per-query work inside Stage 2 using the same local-result merge pattern already proven in Stage 1 preliminary parallelism. Best clean cost-only lever: move `explanationQualityMode` from `rubric` to `structural` if product is willing to drop the post-hoc rubric call, because it is outside the verdict path and does not change the analysis result itself.
**Open items:** Documentation drift should be corrected before any new optimization plan is reopened: `Current_Status.md` still advertises stale parallel-verdict work and outdated budget language, and `Backlog.md` still lists already-shipped W15 / P1-B items as pending. If Stage 2 query-parallelism is approved, it needs a bounded-concurrency design and deterministic merge strategy for warnings, sources, search-query logs, and evidence-pool updates.
**Warnings:** Do not start with self-consistency cuts, clustering-to-Haiku, Batch API, or claim caching. Self-consistency now feeds the direction-rescue path, so reducing it is quality-risky. Clustering-to-Haiku saves little but touches the boundary formation step. Batch API remains architecturally non-trivial on the current runtime. Claim caching still has high invalidation/freshness complexity on a live-web, current-date-aware pipeline.
**For next agent:** Use `research-orchestrator.ts` as the primary hotspot, especially the serial query loop in `runResearchIteration`. Reuse the concurrency pattern from `claim-extraction-stage.ts` preliminary search if implementing the Stage 2 speed path. If only a config experiment is wanted, test `explanationQualityMode: structural` before touching verdict-stage debate settings.
**Learnings:** no

---

### 2026-03-30 | Lead Architect | Codex (GPT-5) | Cost and Speed Optimization Reassessment
**Task:** Re-read the historical speed/cost optimization documents, compare them against the current ClaimAssessmentBoundary source, and recommend the best next optimization by benefit versus report-quality risk.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The strongest current candidate is no longer any March “parallel verdict generation” or deferred `P1-B` plan. Those are stale against the live code. Stage 4 already runs batched multi-claim debate with internal parallelism in `verdict-stage.ts`, and Stage 1 preliminary search is already parallelized in `claim-extraction-stage.ts`. The best live engineering lever is Stage-4 payload de-duplication: `createProductionLLMCall()` renders large structured inputs directly into the system prompt and then sends the same input again as `JSON.stringify(input)` in the user message. Because prompt caching only applies to the system message, this likely wastes a substantial amount of billable, uncached input tokens on every advocate / self-consistency / challenger / reconciliation / validation call. This should be the first optimization target, gated by a small A/B because it still touches prompt delivery. Secondary candidate: a UCM-only self-consistency tier experiment (`selfConsistency` from standard to budget). Do not prioritize clustering-model downgrade, broad budget cuts, Batch API, or claim caching before this.
**Open items:** Several optimization docs are now materially stale and should be corrected before they anchor new planning: `Current_Status.md` still advertises “parallel verdict generation” as open; `Backlog.md` still lists both W15 and parallel verdict generation as pending; `2026-03-26_Next_Workstream_Decision.md` still treats `P1-B` as future work.
**Warnings:** I attempted to fork parallel explorer reviews, but this session did not return usable sub-agent results; the synthesis was completed from direct local doc/code analysis. If Stage-4 payload de-duplication is pursued, validate it on a small representative A/B set because it changes how prompt context is delivered even though the analytical content should remain the same.
**For next agent:** Anchor the recommendation on these code/docs: `verdict-generation-stage.ts` (rendered system prompt + duplicate user JSON), `claimboundary.prompt.md` (Stage-4 sections already include full structured inputs), `verdict-stage.ts` (batched multi-claim + internal Step 2/3 parallelism), `claim-extraction-stage.ts` (preliminary search already parallelized), `research-acquisition-stage.ts` (W15 same-domain staggering already implemented), `Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md`, `Current_Status.md`, and `Backlog.md`.
**Learnings:** no

---

### 2026-03-30 | Lead Architect | Codex (GPT-5) | Optimization Reassessment with Current Metrics Baseline
**Task:** Re-read the historical speed/cost optimization discussions, inspect the current ClaimAssessmentBoundary code, and use the live `AnalysisMetrics` baseline to identify the best next optimization target by benefit versus report-quality risk.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** I used the integrated metrics path now wired through `claimboundary-pipeline.ts` / `metrics-integration.ts` and queried `apps/api/factharbor.db` directly instead of relying on stale March assumptions. On the most recent 50 `claimboundary` metrics rows, average wall time is ~716s/job with phase split: research ~256s, verdict ~240s, cluster ~108s, understand ~68s, aggregate ~13s. Estimated LLM cost split is verdict ~$17.8 / 50 jobs, research ~$11.5, cluster ~$6.9, understand ~$3.2, aggregate ~$0.8. This changes the recommendation: the best first **optimization experiment** is now `P1-A` clustering-model downgrade, not old “parallel verdict generation.” Stage 3 is a single isolated Sonnet call in `boundary-clustering-stage.ts`, so it offers meaningful speed/cost upside with a much narrower blast radius than touching Stage 2 evidence budgets or Stage 4 self-consistency. `P1-B` is no longer open work because preliminary search parallelism is already shipped in `claim-extraction-stage.ts`. If a purely structural speed-only item is preferred over a quality-affecting experiment, the next best engineering candidate is new Stage-2 per-query parallelism inside `research-orchestrator.ts`, because Stage 2 is still serial at the query level even though Stage 1 has already adopted the local-merge parallel pattern.
**Open items:** Documentation drift is now material. `Known_Issues.md`, `Current_Status.md`, and `Backlog.md` still contain stale optimization guidance: “parallel verdict generation” is obsolete in the CB stack, and `Metrics Infrastructure Not Integrated` is no longer true now that metrics persist into `AnalysisMetrics`. Prompt-caching observability is also overstated in docs/backlog because cache fields exist in `metrics.ts` but are not populated by current `recordLLMCall(...)` call sites.
**Warnings:** Do not start with self-consistency cuts or research-budget cuts. Self-consistency now feeds stability, confidence shaping, and direction-rescue behavior, so it is high quality risk. Research reductions attack the largest phase, but they degrade evidence coverage directly. A clustering downgrade still needs a tight A/B because ClaimAssessmentBoundary formation can change report structure even though it is only one call.
**For next agent:** If approved, frame the next step as a measured `P1-A` experiment, not a blind rollout. Add a dedicated Stage-3 model/tier control instead of piggybacking on `modelVerdict`, then compare Sonnet vs budget-tier clustering on a representative validation set. Keep a second option ready: bounded Stage-2 query parallelism using the deterministic local-merge pattern already present in `claim-extraction-stage.ts`.
**Learnings:** no

---

### 2026-03-30 | Lead Architect | Codex (GPT-5) | Final Optimization Priority Reconciliation
**Task:** Reconcile same-day optimization recommendations after parallel doc review, code inspection, and direct `AnalysisMetrics` queries.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Final architect synthesis: (1) **best first overall by benefit/risk** is Stage-2 per-query parallelism in `research-orchestrator.ts`, because research is the largest wall-clock phase (~35% of recent runs), query processing is still serial, and this is a structural timing change rather than a semantic budget/model cut; (2) **best first pure cost/speed experiment** is `P1-A` Stage-3 clustering-model downgrade, because clustering is a single isolated Sonnet call (~108s / ~15.8% of wall time, ~$6.9 over the last 50 jobs) and is easier to isolate than Stage-4 reductions; (3) old “parallel verdict generation” should no longer anchor planning because current Stage 4 is already batched and internally parallelized, and `P1-B` / W15 are already implemented.
**Open items:** Correct stale planning docs before opening any optimization workstream: `Known_Issues.md` still says metrics are not integrated, `Current_Status.md` and `Backlog.md` still advertise obsolete “parallel verdict generation,” and `Backlog.md` still shows shipped W15 as pending.
**Warnings:** I do **not** recommend starting with self-consistency cuts, verdict prompt surgery, or broad research-budget reductions. Those all have a worse report-degradation profile than either Stage-2 query parallelism or a tightly gated clustering experiment.
**For next agent:** If the Captain wants the safest engineering start, scope a bounded Stage-2 query-parallel prototype using the same local-collection / deterministic-merge pattern already used in `claim-extraction-stage.ts`. If the Captain wants the strongest cost+speed experiment, scope `P1-A` with a dedicated Stage-3 model/tier knob and an explicit A/B gate.
**Learnings:** no

---

### 2026-03-30 | Lead Architect | Codex (GPT-5) | Stage-2 Query Parallelism — Sharpened Low-Risk Design
**Task:** Turn the Stage-2 per-query parallelism idea into a concrete low-risk architecture proposal using multiple reviewer loops.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The correct v1 is a **bounded, two-wave, deterministic-merge** design. Keep target-claim selection, query generation, and query-budget reservation serial. Parallelize only per-query work with **local result objects**. Wave A runs `search -> relevance` in parallel. Wave B runs `fetch -> extract` in parallel on local shadow state. All shared `state` mutation remains single-threaded in a final merge. The critical semantic correction from reviewer loop 2: do **not** assign URL ownership at selection time. Current serial behavior is effectively **earliest query-order successful fetch wins**. A later query may still recover a shared URL if an earlier query selected it but failed to fetch it. So v1 should tolerate some bounded duplicate fetch/extract work across parallel workers and then drop later duplicate sources/evidence during deterministic merge. Derivative validation and `applyPerSourceCap()` must run exactly once after merge. Scope v1 to `iterationType === "main"` only. Add a new UCM knob `researchQueryParallelism` with default `1`; validate at `2`; keep contradiction/contrarian loops serial.
**Open items:** Docs remain stale around optimization state (`parallel verdict generation`, pending W15, and old metrics status). If implementation starts, those planning docs should be corrected in the same stream or immediately after.
**Warnings:** Do not implement this as a raw `Promise.all` over the current loop. Do not reuse `parallelExtractionLimit` for query-pipeline fanout. Do not cut self-consistency or research budgets first. V1 accepts some duplicate worker effort intentionally to preserve serial semantics; a later v2 can optimize duplicate shared-URL coordination only after parity is proven.
**For next agent:** Implementation should add focused tests for: unchanged query order, unchanged per-claim budget semantics, duplicate-URL behavior where earlier successful fetch suppresses later duplicates, duplicate-URL behavior where earlier fetch failure allows later success, deterministic source ID assignment, post-merge derivative validation, and one-shot per-source cap across combined new evidence. Validation gate: A/B `researchQueryParallelism=1` vs `2` on Bolsonaro, Plastik DE, and Hydrogen; require no claim-count drift, no direction flips on control families, no new `UNVERIFIED`, and median research-phase reduction >= 15% before promotion.
**Learnings:** no

---

### 2026-03-30 | Lead Architect | Codex (GPT-5) | Stage-2 Query Parallelism — Sharpened Low-Risk Design
**Task:** Sharpen the recommended Stage-2 per-query parallelism idea into a concrete low-risk implementation and rollout strategy.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Recommended v1 shape: keep target-claim selection and `generateResearchQueries()` serial, but parallelize independent per-query work inside `runResearchIteration()` with a new UCM knob `researchQueryParallelism` defaulting to `1` at first ship, with canary value `2`. Scope v1 to `iterationType === "main"` only; keep contradiction and contrarian iterations serial. Preserve current serial semantics by assigning each fetched URL to the first query that selected it in generated-query order (“first query wins”), then perform a single-threaded merge for `searchQueries`, `search_provider_error` upserts, source ID assignment, derivative validation against the union of existing+new URLs, and one final `applyPerSourceCap()` pass across all newly kept evidence plus the existing pool. Do **not** mutate shared `state.sources`, `state.evidenceItems`, or `state.warnings` from parallel workers.
**Open items:** Implementation should introduce narrow helper result types for Phase A (search + relevance) and Phase B (owned-url fetch + extraction) instead of rewriting Stage 2 wholesale. Validation should begin with the existing `runResearchIteration` test block in `claimboundary-pipeline.test.ts` and add explicit duplicate-URL ownership, merged warning, derivative-validation timing, and per-source-cap-once tests.
**Warnings:** A naive `Promise.all(queries.map(...))` is not safe enough. The risky points are exactly these existing stateful operations: `upsertSearchProviderWarning(...)`, derivative validation using `state.sources`, and `applyPerSourceCap(...)`. If any of those run inside parallel workers, report behavior can drift. Also avoid broadening v1 to contradiction/contrarian loops until the main-loop path is validated.
**For next agent:** Use these anchors when implementing: serial query loop and state mutations in `research-orchestrator.ts`, safe parallel local-merge pattern in `claim-extraction-stage.ts`, and runtime validation against recent `AnalysisMetrics` baselines in `apps/api/factharbor.db`. Rollout plan: ship behind `researchQueryParallelism=1`, validate `1` vs `2` on Bolsonaro, Plastik DE, and Hydrogen, then promote to `2` only if research-phase latency improves materially without verdict-direction drift or evidence/source-count collapse. Rollback is instant by setting the knob back to `1`.
**Learnings:** no

---

### 2026-03-30 | Lead Architect | Codex (GPT-5) | Stage-2 Query Parallelism — Low-Risk Design Sharpening
**Task:** Sharpen the Stage-2 per-query parallelism recommendation into a concrete low-risk implementation design with explicit merge boundaries, rollback, and validation shape.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The safe design is a **two-wave query pipeline** inside `runResearchIteration()`: keep query generation and query-budget reservation serial; then run **Wave A** (`searchWebWithProvider` + `classifyRelevance`) in bounded parallelism with local results only; deterministically assign each selected URL to the **first query that selected it** so serial “first query wins” semantics are preserved; then run **Wave B** (`fetchSources` + `extractResearchEvidence`) in bounded parallelism per query but only on that query’s owned URLs, again with local shadow state only; finally do a single-threaded merge that upserts provider warnings, assigns global source IDs, validates derivatives against the union of existing+new URLs, and applies `applyPerSourceCap()` exactly once across all new evidence plus the existing pool. This preserves the current serial safety points at `research-orchestrator.ts` query-budget consumption, `upsertSearchProviderWarning`, `fetchSources` state mutation, `llm_provider_error` dedup, and per-source cap eviction. Recommended UCM knob: `researchQueryParallelism` (int, default `1` for initial ship, validate at `2`, max `3`).
**Open items:** Implementation should likely add small helper types/results for Wave A, URL ownership assignment, Wave B local outputs, and single-threaded merge helpers. `fetchSources()` can be reused with a narrower `Pick<CBResearchState, "sources" | "warnings">` state signature or local shadow state.
**Warnings:** Do not parallelize across iterations or across target claims in Stage 2. Do not apply per-source cap or derivative validation inside workers. Do not let duplicate-URL ownership become non-deterministic. Stage 2 has no Stage-4-style provider guard, so bounded concurrency is required.
**For next agent:** Start from `research-orchestrator.ts`, `research-acquisition-stage.ts`, and the proven Stage-1 merge pattern in `claim-extraction-stage.ts`. First build deterministic ownership + local-result helpers. Then add tests for first-query-wins URL assignment, single-threaded warning merge, derivative validation across worker-fetched URLs, one-shot per-source cap application, and `researchQueryParallelism=1` parity vs current behavior.
**Learnings:** no

---

### 2026-03-30 | Lead Architect | Codex (GPT-5) | Stage-2 Query Parallelism — Low-Risk Design Sharpening
**Task:** Stress-test the Stage-2 per-query parallelism recommendation and refine it into a concrete low-risk implementation shape.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The safe design is a **two-wave query pipeline**, not a naive `Promise.all` over the existing loop. Keep query generation serial. Pre-reserve budget for the generated queries in original order. **Phase A:** run `searchWebWithProvider()` + `classifyRelevance()` in bounded parallelism, but keep all results local. Merge deterministically in original query order, and build a stable query→candidate-URL map. **Phase B:** fetch + extract in bounded parallelism using per-query local shadow state, but only on URLs that remain assigned to that query after deterministic ownership resolution. Preserve current serial semantics as closely as possible by letting the earliest query own the first successful use of a URL, not merely the first selection. Defer all shared-state mutation — provider-warning upserts, `state.searchQueries`, `state.sources`, derivative validation, `state.evidenceItems`, and `applyPerSourceCap()` — to a single merge phase. Apply the per-source cap once across `existing + all new kept items`, never inside parallel workers.
**Open items:** Add a dedicated UCM knob such as `researchQueryParallelism` (default `2`) rather than overloading `parallelExtractionLimit`, because query-fanout and fetch-fanout are different risk controls. The main unresolved semantic choice for implementation is how much effort to spend preserving the rare case where query A fails to fetch a duplicated URL and query B would have retried it in the current serial loop.
**Warnings:** The naive “first query wins” reservation at URL-selection time is too aggressive: it suppresses later duplicate-query retry opportunities after an early fetch failure. Likewise, running `fetchSources()` directly against shared `state` from parallel workers is unsafe because it mutates `state.sources` and `state.warnings`. Keep `upsertSearchProviderWarning()` single-threaded in the merge path, matching the existing Stage-1 parallel search pattern.
**For next agent:** Implementation should start by extracting small helper types for local query results and local fetch/extract results, then add focused tests around duplicate URLs, deterministic merge order, query-budget preservation, and one-shot per-source cap behavior. Use `claimboundary-pipeline.test.ts` as the main harness because `runResearchIteration()` is already covered there.
**Learnings:** no

---

### 2026-03-30 | LLM Expert | Codex (GPT-5) | Google CSE Bias Risk Review For FactHarbor
**Task:** Investigate whether the concern that Google Custom Search / Programmable Search can return biased or manipulated results implies concrete improvements for FactHarbor.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Recommendation is **yes, FactHarbor should improve the retrieval layer**, but this is primarily a search-architecture issue, not evidence that Google CSE itself is unusable. External Google documentation confirms Programmable Search is not equivalent to Google Web Search: it can emphasize engine-selected results, may return only a subset of the Google index, supports promotions, and supports explicit sorting/biasing/filtering and region-restricted ranking. The current FactHarbor default stack amplifies that risk because `search.default.json` enables `googleCse` and `serper` by default, while `wikipedia`, `semanticScholar`, and `googleFactCheck` remain disabled; in `web-search.ts`, supplementary providers are skipped in `auto` mode whenever any primary provider returns results. With `maxResults: 10`, Google CSE can fill the full default quota alone, so the effective evidence pool often remains single-provider or single-index dominated. The highest-value improvements are: (1) run at least one supplementary evidence category even when primary providers succeed, (2) prefer index diversity over “Google + Google-derived” defaults, (3) expose retrieval provenance/diversity diagnostics at report level, and (4) treat Programmable Search configuration as analysis-critical infrastructure that must be audited, not a neutral black box.
**Open items:** No code was changed in this pass. If implementation follows, it should decide whether to promote supplementary providers by default, whether `auto` should guarantee cross-category coverage, whether cache keys need provider/category awareness, and whether Google CSE should remain priority 1 or be demoted behind a less configurable full-web provider.
**Warnings:** The shared Google AI Mode page itself was not directly readable from the toolchain; the investigated topic was inferred from the redirect query text embedded in the shared URL. Also, some improvement options touch prompts or default runtime config, which may require explicit Captain approval under the prompt/config governance rules.
**For next agent:** Start from `apps/web/src/lib/web-search.ts`, `apps/web/configs/search.default.json`, `apps/web/src/lib/config-schemas.ts`, and `Docs/Specification/Multi_Source_Evidence_Retrieval.md`. Verify current production intent for supplementary providers before changing defaults. If work continues, frame it as retrieval-diversity hardening rather than a blanket “replace Google” initiative.
**Learnings:** no

---

### 2026-03-30 | Code Reviewer | Codex (GPT-5) | Review Of 03387283 Report Matrix And Article Adjudication
**Task:** Review commit `03387283` (`feat(verdict): report matrix over all claims + LLM article adjudication`) and check recent jobs for intended effects.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The implementation direction is correct: Stage 4 assessability routing remains intact in `claimboundary-pipeline.ts`, the report matrix is now built from all final claim verdict IDs, and article-level LLM adjudication is genuinely active in Stage 5. Recent jobs on `03387283` confirm both behaviors: `1b32f39aaae841f881203bf2cddf52c6` now shows matrix claims `AC_01` + `AC_02` with `AC_02` still `UNVERIFIED`, and `45b71bf022e64efab363b8d92070658c` shows all-`UNVERIFIED` claims in the matrix with zero counts. Fully assessed control `9ca3393c2506475ca6d5e4baaa61ab40` retained deterministic article numbers, while partial-insufficient `1b32...` ended at `75 / 50`, showing the new narrative adjudication lowered confidence relative to the only assessed claim’s `68%`.
**Open items:** I did not find focused automated tests for the new Stage 5 behavior itself (`adjustedTruthPercentage`, `adjustedConfidence`, report-matrix-over-all-final-claims, and fail-open narrative parsing). Existing aggregateAssessment tests still cover generic Stage 5 output and fallback narrative, but not the new adjudication path.
**Warnings:** The new `±10pp` article-truth bound is hardcoded in `aggregation-stage.ts` and mirrored in prompt text. That is a real analysis-policy choice, not just plumbing, so it may deserve explicit review as a configurable or at least explicitly ratified constant. Also note that `npm test` and `npm -w apps/web run build` both passed at review time, so there is no current blocking test/build failure.
**For next agent:** If follow-up work continues, add narrow tests around (1) unresolved-claim report matrix columns, (2) LLM confidence ceiling enforcement, (3) truth-bound clamping, and (4) parse/missing-field fallback to deterministic aggregation. If policy is revisited, inspect whether the hardcoded `±10pp` bound belongs in UCM instead of code/prompt duplication.
**Learnings:** no

---

### 2026-03-30 | Senior Developer | Codex (GPT-5) | Stage-5 Adjudication Test Hardening
**Task:** Add focused regression tests for the new report-matrix and article-level adjudication behavior introduced in `03387283`.
**Files touched:** `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added narrow tests for four concrete behaviors: (1) article-level adjusted confidence is ceiling-capped to the deterministic baseline, (2) adjusted truth is clamped to the conservative bound, (3) missing adjusted numbers fall back to deterministic aggregation, and (4) the report matrix can include `UNVERIFIED` final claims without altering the assessable-claims routing. Kept the tests inside the existing Stage 5 / D5 pipeline test surfaces instead of building a new harness.
**Open items:** The `±10pp` truth bound remains a policy decision rather than a purely structural one. The tests now lock in the current behavior, but they do not answer whether that constant should stay hardcoded or move into UCM.
**Warnings:** This pass hardens coverage only; it does not change runtime semantics. If product decides to alter the article-level adjudication bounds later, these tests will need deliberate updating rather than silent drift.
**For next agent:** Current verification is clean: targeted `claimboundary-pipeline.test.ts`, full `npm test`, and `npm -w apps/web run build` all pass. If policy review continues, inspect `aggregation-stage.ts` and `claimboundary.prompt.md` together so code/prompt bounds do not diverge.
**Learnings:** no

---

### 2026-03-30 | Lead Architect | Codex (GPT-5) | MCP Adoption Risk Review
**Task:** Assess whether FactHarbor should adopt MCP for repo workflow and/or as a product-facing integration surface, using parallel sub-agent debate and direct architecture review.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Consensus recommendation is **not now** for both. For repo workflow, MCP is only justified later as a **thin read-only knowledge/ops layer** if multi-agent context friction becomes a real bottleneck; it should read existing sources of truth (`AGENTS.md`, `Docs/AGENTS/*`, job/config surfaces) rather than duplicating knowledge. For the product, MCP should **never** become an internal architectural layer between existing services; if adopted later, it should be a **thin external adapter** over the current async HTTP job API (`/v1/analyze`, `/v1/jobs/{id}` or `api/fh/*`) with a minimal tool set such as submit-analysis, get-status, and get-report.
**Open items:** No implementation work was started. If the Captain wants to revisit this later, the next concrete step is to define a minimal external contract and decide whether the trigger is (a) real multi-tool developer pain or (b) a specific partner/assistant integration request.
**Warnings:** Adding MCP now would create another compatibility/auth/provenance surface while the project is still alpha and focused on analysis quality and cross-linguistic neutrality. The major architectural risk is letting MCP bypass the existing job lifecycle, warning handling, rate limits, and provenance boundaries.
**For next agent:** Use these anchors when revisiting: `AGENTS.md`, `Docs/ARCHIVE/Agent_Knowledge_Restructuring_2026-02-24.md`, `Docs/Knowledge/Factiverse_Lessons_for_FactHarbor.md`, `Docs/STATUS/Current_Status.md`, `apps/api/Controllers/AnalyzeController.cs`, `apps/api/Controllers/JobsController.cs`, `apps/web/src/app/api/fh/analyze/route.ts`, `apps/web/src/app/api/fh/jobs/route.ts`, `apps/web/src/app/api/fh/jobs/[id]/route.ts`, and `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`.
**Learnings:** no

---

### 2026-03-31 | Lead Architect | Codex (GPT-5) | Investigate 696d8140 Bolsonaro Process/Fairness Job
**Task:** Investigate job `696d81406d5a4fbfaa4c23ec49fe4e85`, identify the root cause of the visible result issues, and propose the best low-risk/high-quality fix.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The job shows two distinct defects with different priority. Primary defect: the advocate verdict emitted an invalid `boundaryFindings` entry (`CB_37`) that is not present in the actual boundaries or the claim's coverage matrix. This is a structural output bug, likely caused by the model inventing a pseudo-boundary for the OAB-PR sub-perspective inside merged boundary `CB_03`. Secondary defect: the grounding validator now produces false-positive `verdict_grounding_issue` warnings because verdict reasoning legitimately references source IDs / `trackRecordScore` from `sourcePortfolioByClaim`, but `VERDICT_GROUNDING_VALIDATION` still only sees `evidencePool`, so it treats those source-metadata references as hallucinations. The March 29-31 article-adjudication and claim-local direction-scope fixes are not the cause here.
**Open items:** Best fix sequence: (1) code-only structural sanitization of `boundaryFindings` against the claim-local valid boundary ID set from `coverageMatrix`, plus optional prompt hardening in `VERDICT_ADVOCATE`; (2) separate prompt+plumbing refresh for `VERDICT_GROUNDING_VALIDATION` so source-portfolio references are treated as valid structural grounding context when `sourcePortfolioByClaim` is present.
**Warnings:** Do not solve the ghost boundary issue with semantic name matching or heuristic remapping. The safe structural behavior is to drop invalid or claim-inapplicable boundary IDs rather than guessing what the model meant. Also do not treat the current grounding warning as a claim-quality failure — it is an outdated validator-context problem.
**For next agent:** Anchor files: `apps/web/src/lib/analyzer/verdict-stage.ts` (`parseAdvocateVerdict`, `runStructuralConsistencyCheck`, `validateVerdicts`), `apps/web/src/lib/analyzer/aggregation-stage.ts` (`computeTriangulationScore`), and `apps/web/prompts/claimboundary.prompt.md` (`VERDICT_ADVOCATE`, `VERDICT_GROUNDING_VALIDATION`). The cleanest immediate fix is structural filtering of `boundaryFindings` using `coverageMatrix.getBoundariesForClaim(claimId)` before downstream use.
**Learnings:** no

---

### 2026-03-31 | Lead Architect | Codex (GPT-5) | Refresh Pipeline Speed and Cost Optimization Plan
**Task:** Re-read the March 19 pipeline speed/cost plan, reconcile it with what has shipped since late March, and update the plan plus tracking docs with the correct current state and next-step sequence.
**Files touched:** `Docs/WIP/Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Reframed the March 19 plan as a residual source plan for the still-open optimization ideas, not a live execution plan. Marked `P1-B/C/D/E` complete, `P1-A2` retired as stale, and `P1-A` as the only remaining Phase 1 candidate pending a fresh post-March-30 baseline and explicit approval. Captured `W15` as shipped adjacent runtime/reliability work that must now be considered part of the baseline. Synced `Current_Status.md` and `Backlog.md` so they no longer describe `P1-B` as a deferred future decision.
**Open items:** No optimization work was approved here. If optimization is reopened, the next architectural step is a fresh runtime/cost baseline on the post-March-30 validated stack, then an isolated `P1-A` decision, then measurement-only review of `P2-*` if still warranted.
**Warnings:** Do not treat archived March 17-19 timing data as current truth. The stack now includes shipped `P1-B`, W15, and the March 29-30 integrity fixes, so any optimization decision based on the old baseline would be architecturally unsound.
**For next agent:** Read the refreshed [Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md](C:/DEV/FactHarbor/Docs/WIP/Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md) first. The canonical policy is now: optimization stays secondary; if reopened, start with a fresh benchmark rather than continuing the old Phase 1 sequence blindly.
**Learnings:** no

---

### 2026-03-30 | Code Reviewer | Codex (GPT-5) | Review Claim-Local Verdict Scope Fix
**Task:** Review the uncommitted Stage-4 claim-local evidence scoping implementation for the `9e4d` SRF fact-checking failure before commit.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The core scoping change is correct: `getClaimLocalEvidence()` in `verdict-stage.ts` now builds a claim-local subset from `relevantClaimIds` plus cited IDs, and the repair path uses that subset. Focused `verdict-stage.test.ts` passes locally. However, the patch is **not ready to commit as-is** because the prompt/input contract for `VERDICT_DIRECTION_VALIDATION` is now inconsistent across call sites. The batch validator changed to embed `evidencePool` inside each verdict object, and the prompt was changed to only render `${verdicts}`. But `validateDirectionOnly()` still calls the same prompt with a top-level `${evidencePool}` shape only. That means post-repair re-validation no longer shows its evidence pool to the model.
**Open items:** Unify the `VERDICT_DIRECTION_VALIDATION` contract before commit. Either: (1) make every call site pass claim-local `evidencePool` inside each verdict object and update the prompt text accordingly, or (2) keep a top-level `evidencePool` contract everywhere and change the batch path to match. Then rerun the focused verdict-stage tests plus one real job.
**Warnings:** `apps/web/prompts/claimboundary.prompt.md` now describes “Verdicts (with cited evidence pool)” but `validateDirectionOnly()` in `apps/web/src/lib/analyzer/verdict-stage.ts` still passes the evidence pool only at top level. Tests currently mock LLM inputs and do not catch prompt-rendering mismatches. Do not commit until this contract is reconciled.
**For next agent:** Review [verdict-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-stage.ts#L1081), [verdict-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-stage.ts#L1611), and [claimboundary.prompt.md](C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md#L1217) together. The likely lowest-risk fix is to standardize `VERDICT_DIRECTION_VALIDATION` on per-verdict claim-local `evidencePool` and update `validateDirectionOnly()` to match.
**Learnings:** no

---

### 2026-03-30 | Senior Developer | Codex (GPT-5) | Remove Deterministic Article-Truth Clamp
**Task:** Implement the approved Stage-5 policy change: remove the deterministic `±10pp` truth clamp while keeping only structural safeguards around article-level LLM adjudication.
**Files touched:** `apps/web/src/lib/analyzer/aggregation-stage.ts`, `apps/web/prompts/claimboundary.prompt.md`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Removed the deterministic article-truth clamp so `adjustedTruthPercentage` is now LLM-led and bounded only to valid `0..100` range. Kept the confidence ceiling (`adjustedConfidence <= deterministicConfidence`) as a structural invariant. Softened the `VERDICT_NARRATIVE` prompt from an explicit `±10pp` rule to a qualitative “adjust conservatively / stay grounded” instruction. Rewrote the Stage-5 clamp test to assert pure LLM truth adjustment and added an explicit malformed-adjustment fallback test.
**Open items:** `npm test` still shows the same intermittent failures in `test/unit/app/api/admin/test-config/route.test.ts` and `test/unit/lib/drain-runner-pause.integration.test.ts`, but both files passed cleanly when rerun in isolation immediately after the suite failure. This change did not introduce a stable new failing test surface.
**Warnings:** The confidence ceiling remains a deliberate structural safeguard. If product later decides even that is too restrictive, revisit `aggregation-stage.ts` and the Stage-5 prompt together. The build also reseeded the updated `claimboundary` prompt hash in `config.db`.
**For next agent:** Verification status: targeted `claimboundary-pipeline.test.ts` passed; isolated reruns of the two flaky failure files passed; `npm -w apps/web run build` passed. If you need a clean full-suite run before commit, rerun `npm test` once more in a quiet environment and compare against the isolated-file results before treating any admin/drain-runner failures as regression.
**Learnings:** no

---

### 2026-03-30 | Code Reviewer | Codex (GPT-5) | 9e4d SRF “Hervorragende Arbeit” Investigation
**Task:** Investigate job `9e4d3712e12d49bc8cadd601766e5f4b`, isolate the root cause, and propose the lowest-risk high-quality fix. Cross-check with an independent downstream-focused sidecar investigation and reconcile the findings.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The user-visible failure is primarily a **downstream claim-scope bug in verdict direction validation/repair**, with a secondary upstream Stage-1 decomposition miss. Stage 1 classified the input as `ambiguous_single_claim` and decomposed “hervorragende Arbeit” into method quality, scope/reach, and transparency. Contract validation ran but incorrectly passed the split as “identical to the original input,” so Gate 1 kept all three dimension claims. The decisive downstream defect is in `verdict-stage.ts`: `validateVerdicts()` sends the **full evidence pool** to `VERDICT_DIRECTION_VALIDATION`, `attemptDirectionRepair()`, and `validateDirectionOnly()` instead of filtering to claim-relevant evidence. In this job, `AC_02`’s real claim-local evidence pool contains only 4 neutral items, but the direction-integrity warning and repair reasoning cite 6 supports + 3 contradicts from other claims. This cross-claim contamination produced a false direction-integrity failure, a misleading repair rationale, and an avoidable confidence collapse.
**Open items:** Upstream quality is still imperfect: the claim decomposition/contract-validation layer probably should not accept `Umfang und Reichweite der Faktencheck-Aktivitäten` as a clean dimension of “hervorragende Arbeit.” But that is a broader prompt-quality follow-up, not the first low-risk fix.
**Warnings:** Do not “fix” this by adding deterministic semantic heuristics. The lowest-risk repair is structural: scope direction validation/repair to claim-local evidence (`relevantClaimIds`), with a fallback to cited IDs/full pool only when claim-local evidence is empty. If claim-local scoping is changed, remeasure recent jobs where `verdict_integrity_failure` or `direction_rescue_plausible` appeared on decomposed multi-claim evaluative inputs.
**For next agent:** Review these anchors first: `apps/web/src/lib/analyzer/verdict-stage.ts` lines around the Stage-5 validation input (`VERDICT_DIRECTION_VALIDATION` currently gets full `evidencePool`), the repair path (`attemptDirectionRepair()` and `validateDirectionOnly()`), `apps/web/src/lib/analyzer/claim-extraction-stage.ts` lines `256-294` for contract-validation retry guidance, and `apps/web/prompts/claimboundary.prompt.md` lines `332-336` for evidence-separability / proxy-drift rules. Best immediate fix proposal: make the direction validator + repair path claim-local; then remeasure this job family before deciding whether a prompt-only Stage-1 tightening is still needed.
**Learnings:** no

---

### 2026-03-30 | Senior Developer | Codex (GPT-5) | 9e4d SRF Faktenpruefung Investigation
**Task:** Investigate job `9e4d3712e12d49bc8cadd601766e5f4b`, identify the root cause, and propose the best low-risk/high-quality fix.
**Files touched:** `Docs/ARCHIVE/Handoffs/2026-03/2026-03-30_Senior_Developer_9e4d_SRF_Factchecking_Investigation.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Root cause is Stage 1 claim shaping plus a contract-validation miss, not Stage 4/5. The broad evaluative input was decomposed into proxy dimensions (`scope/reach`, `transparency/error communication`) that do not cleanly preserve the original thesis. Contract validation ran but incorrectly approved the set, and Gate 1 then preserved the claims because dimension-decomposition outputs are fidelity-exempt. Downstream verdict integrity correctly downgraded `AC_02` and article adjudication correctly lowered overall confidence.
**Open items:** Prompt-only hardening is the recommended next step: strengthen `CLAIM_CONTRACT_VALIDATION` so broad evaluative activity-quality claims retry when they decompose into quantity/reach/publicity/policy/communications proxies unless the input explicitly asks for those. A narrow Pass 2 clarification is a secondary backup only.
**Warnings:** Do not treat the `verdict_integrity_failure` on `AC_02` as the root cause. That downgrade is protective. Do not add deterministic proxy/overlap heuristics.
**For next agent:** Full investigation and code anchors are in `Docs/ARCHIVE/Handoffs/2026-03/2026-03-30_Senior_Developer_9e4d_SRF_Factchecking_Investigation.md`.
**Learnings:** no

---

### 2026-03-31 | Lead Architect | Codex (GPT-5) | Regression Check for 696d8140 Boundary/Grounding Issues
**Task:** Determine whether the defects observed in job `696d81406d5a4fbfaa4c23ec49fe4e85` were introduced by a recent fix or are older latent issues.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The job contains two separate defects with different timelines. The **primary ghost-boundary defect** (`boundaryFindings` containing invalid `CB_37`) was **not introduced by a recent fix**. `parseAdvocateVerdict()` has accepted raw `boundaryFindings` without sanitization since the original verdict-stage introduction in commit `db563471` (2026-02-16), and the advocate prompt has pushed per-boundary findings since the original prompt rollout in commit `6e2c2c5b` (2026-02-16). This is an older latent structural flaw now exposed by a concrete job. The **secondary grounding-warning defect** *was* introduced by a recent fix: commit `20f11239` (2026-03-27, `feat(analyzer): add single-source flooding mitigation (FLOOD-1)`) added `sourcePortfolioByClaim` / `trackRecordScore` reasoning to advocate/challenger/reconciler prompts and code, but left `VERDICT_GROUNDING_VALIDATION` unchanged. As a result, grounding validation still sees only `evidencePool`, so it now falsely flags legitimate source-portfolio references (e.g. `S_025`, `S_031`, `S_037`, `trackRecordScore`) as unverifiable.
**Open items:** Implement the low-risk fix sequence already identified: (1) sanitize verdict `boundaryFindings` against valid boundary IDs before downstream use, (2) refresh `VERDICT_GROUNDING_VALIDATION` context/prompt so it understands source-portfolio references, (3) optionally harden `VERDICT_ADVOCATE` prompt text to forbid inventing boundary IDs.
**Warnings:** Do not attribute the main bug to recent article-adjudication or matrix work. Commits `03387283`, `7fdf2b44`, and `17da5b84` are not causally involved. The March 27 regression explains the noisy grounding warning, not the ghost boundary itself.
**For next agent:** If you need proof points, inspect `git blame` on `apps/web/src/lib/analyzer/verdict-stage.ts` line around `boundaryFindings: parseBoundaryFindings(raw.boundaryFindings)` (shows `db563471`) and `apps/web/prompts/claimboundary.prompt.md` lines around the advocate “per-boundary findings” rules (shows `6e2c2c5b`). Then inspect `git show 20f11239` to see the addition of source-portfolio-aware reasoning to verdict prompts without any corresponding grounding-validation update.
**Learnings:** no

---

### 2026-03-31 | Lead Architect | Codex (GPT-5) | Bolsonaro “Various Trials” Regression Investigation
**Task:** Investigate why the current Bolsonaro “various/all trials/proceedings” inputs no longer produce strong STF/TSE separation, why the verdict is lower, and why the claim-assessment boundaries are less rich than in historical reports.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The current failure is primarily **upstream event-detection narrowing**, not a matrix/verdict bug. Current runs `7910732038884c6bb03e6e789024f5cb`, `34149ab8de1f465580902707e4d40328`, and `0d21e43e180d45718bca3c409251cbcd` all recognize only **STF-focused events/sub-stages** in `understanding.distinctEvents` (coup trial, house arrest, publication, appeals). They do **not** extract the separate TSE electoral proceeding at all. Since `distinctEvents` now does flow into Stage 2 query generation, the absence of a TSE event means the query set stays STF-heavy (`Bolsonaro coup trial`, `STF First Panel`, `Justice Fux dissent`, etc.), so TSE-specific research is never actively pursued. This explains both the thinner, more generic current boundaries and the lower article truth. Historical docs show that better Bolsonaro runs came either from different input variants (Portuguese or “international due process” formulations) or from runs where TSE-specific coverage actually entered the evidence pool. The March 2026 historical notes are consistent: the intended mechanism for “various/multiple proceedings” was always `distinctEvents`, not splitting AtomicClaims by court. Today’s problem is that `distinctEvents` is populated too narrowly (multiple STF sub-events instead of multiple distinct proceedings/institutions).
**Open items:** Best low-risk fix is prompt-only and needs explicit approval: tighten Stage 1 Pass 2 guidance so when the input references “various”, “multiple”, or “all” trials/proceedings about the same subject, `distinctEvents` should prefer **distinct legal proceedings/institutions/episodes** over sub-stages within one proceeding. Then validate on Bolsonaro-family controls plus a non-political multi-event control. A secondary Stage 2 prompt follow-up may be warranted if query generation still over-focuses on the most recent/highest-profile proceeding after `distinctEvents` improves.
**Warnings:** Some of the old richer reports are not exact apples-to-apples comparisons: several were Portuguese, some used a different EN variant with “international standards of due process,” and some historical “richness” also included contamination or redundant boundaries. Do not try to “restore richness” by reintroducing foreign contamination or redundant source spread. The specific regression is loss of distinct proceeding coverage (especially TSE), not raw boundary count.
**For next agent:** Anchor evidence: current jobs `7910732038884c6bb03e6e789024f5cb`, `34149ab8de1f465580902707e4d40328`, `0d21e43e180d45718bca3c409251cbcd`; archived docs `Docs/ARCHIVE/Report_Quality_Analysis_2026-03-08.md` (§5B/6), `Docs/ARCHIVE/Report_Variability_Consolidated_Plan_2026-03-07.md` (MT-3, `distinctEvents`), `Docs/ARCHIVE/Bolsonaro_Analysis_Investigation_arch.md`, and `Docs/ARCHIVE/Baseline_Test_Results_Phase1_2026-03-12.md`. The deciding signal is in `understanding.distinctEvents`: current runs list only STF-related events, which then drive STF-heavy search queries and broad merged boundaries.
**Learnings:** no

---

### 2026-03-31 | Lead Architect | Codex (GPT-5) | Consolidated Bolsonaro Degradation Investigation
**Task:** Investigate why current Bolsonaro-family reports degraded relative to the best historical runs (not only the `"various trials"` wording), using direct job inspection, archived reports, and parallel sidecar investigations; then reconcile the findings into one fix proposal.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Three independent investigations converged on the same main conclusion. There is **no broad new Bolsonaro collapse** — direction remains stable and the current family still sits in the `LEANING-TRUE` band most of the time. The main loss is **quality ceiling**: weaker proceeding coverage, less institution-specific boundary richness, and lower truth/confidence than the best March runs. The primary cause is now an **upstream Stage 1 event-structure gap**: current jobs (`7910732038884c6bb03e6e789024f5cb`, `34149ab8de1f465580902707e4d40328`, `0d21e43e180d45718bca3c409251cbcd`) populate `understanding.distinctEvents` with **STF lifecycle sub-events** (coup trial, publication, appeals, monitoring, house arrest) instead of **top-level independently researchable proceedings** (e.g. TSE electoral proceeding vs STF criminal/coup proceeding). Because `distinctEvents` now *does* feed Stage 2 query generation, Stage 2 faithfully follows that narrow understanding and generates STF-heavy queries. That in turn yields thinner and more generic boundaries, less TSE/electoral-law evidence, and lower article scores. Historical docs show the intended architecture had already shifted multi-proceeding coverage into `distinctEvents`, not more AtomicClaims; what remains broken is the *granularity* of those events, not the downstream wiring. Recent Stage 4/5 work (article adjudication, claim-local direction validation, boundary grounding fixes) is not causal. `DIV-1` and `REMAP-1` are net improvements and not the source of the current issue. `FLOOD-1` may reduce some old “richness” by trimming same-source redundancy, but that is mostly a quality-positive side effect, not the root cause of missing TSE coverage.
**Open items:** Best fix path should stay at the understanding→research boundary. A prompt-only tweak phrased around the literal word `"various"` is too narrow. The stronger generic fix is: (1) update the Pass 2 `distinctEvents` guidance so event sets prefer **top-level independently researchable proceedings/institutions/episodes** over lifecycle sub-stages of one proceeding, and (2) optionally add a small LLM-based `distinctEvents` validation/repair pass for collection-style legal/process inputs when the extracted event set appears to be only sub-stages of one proceeding. Validate on Bolsonaro EN/PT collection inputs plus at least one non-political multi-event control.
**Warnings:** Do not try to restore the old historical peak mechanically. Some older “richness” came from contamination, pre-SR-weighting conditions, or special snapshot behavior. Success should mean better top-level proceeding coverage and institution-specific boundaries without reintroducing foreign contamination or same-source flooding.
**For next agent:** Use these anchors together: current jobs `7910732038884c6bb03e6e789024f5cb`, `34149ab8de1f465580902707e4d40328`, `0d21e43e180d45718bca3c409251cbcd`, `696d81406d5a4fbfaa4c23ec49fe4e85`, `14d7fb1530894dbb9a15dee961e0e9c7`; archived docs `Docs/ARCHIVE/Report_Variability_Consolidated_Plan_2026-03-07.md`, `Docs/ARCHIVE/Report_Quality_Analysis_2026-03-08.md`, `Docs/ARCHIVE/Baseline_Test_Results_Phase1_2026-03-12.md`, `Docs/ARCHIVE/Report_Quality_Criteria_Scorecard_2026-03-12_arch.md`, and `Docs/WIP/2026-03-30_Report_Quality_Evolution_Deep_Analysis.md`. The key proof is that current `distinctEvents` represent only one STF proceeding broken into milestones; once that happens, Stage 2 never gets a TSE branch to research.
**Learnings:** no

---

### 2026-03-31 | Lead Architect | Codex (GPT-5) | Bolsonaro Historical Degradation Docs-Only Synthesis
**Task:** Investigate the historical Bolsonaro report degradation using archived docs and current status docs only, and identify what degraded, which plans shipped vs deferred, and which historical explanations still fit today.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The archived record shows Bolsonaro quality had multiple dimensions, not just STF/TSE separation: foreign/U.S. contamination, boundary richness/institution specificity, verdict stability, and claim framing quality. Several of the historically important enabling defects are no longer current primary explanations because they were later shipped or superseded: `distinctEvents` is no longer dead downstream (MT-3 shipped), seeded preliminary evidence remap shipped, and diversity-aware sufficiency shipped. The present docs support a narrower residual explanation: Bolsonaro is now relatively stable directionally, but no longer consistently reaches the earlier quality ceiling on top-level proceeding coverage and court-specific boundary richness.
**Open items:** The remaining unresolved question is whether today’s residual Bolsonaro gap is mostly upstream event/proceeding selection quality or a residual evidence/boundary problem. The docs support the first explanation more strongly, but do not fully close the second because FLOOD-1 still awaits complete live validation.
**Warnings:** The best historical run (`5a2aceff`) is an exceptional peak, not a safe baseline. Archived docs already say language alone does not explain it and that some older high-scoring runs also carried contamination or pre-SR-weighting behavior, so not every drop versus that run should be interpreted as a clean regression.
**For next agent:** Most relevant anchors: `Docs/ARCHIVE/Report_Quality_Criteria_Scorecard_2026-03-12_arch.md` for what “better” meant, `Docs/ARCHIVE/Report_Variability_Consolidated_Plan_2026-03-07.md` for which multi-trial fixes shipped, `Docs/ARCHIVE/Report_Quality_Analysis_2026-03-08.md` for which explanations were later reframed, and `Docs/STATUS/Current_Status.md` / `Docs/STATUS/Backlog.md` for the March 26-30 shipped items (`DIV-1`, `REMAP-1`, `FLOOD-1`, `GATE1-REF`).
**Learnings:** no

---

### 2026-03-31 | Lead Architect | Codex (GPT-5) | Cross-Family Risk Review for `distinctEvents` Granularity Change
**Task:** Review docs/history only to assess likely cross-family effects of a Stage-1 `distinctEvents` change that prefers top-level independently researchable proceedings/institutions/episodes over lifecycle sub-stages.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The archive supports this direction only if it stays narrow. Historical plans already wanted multi-event coverage to flow through richer `distinctEvents`, not through more atomic claims (`Report_Quality_Analysis_2026-03-08.md`, Fix 5B; `Report_Variability_Consolidated_Plan_2026-03-07.md`, MT-3). Likely positives are broader multi-proceeding coverage, richer institution-specific boundaries, and lower risk of STF-only narrowing on collection-style legal/process prompts. The main regression risk is over-coarsening genuine single-proceeding lifecycle inputs or spreading sparse-evidence research too thin, which could raise `UNVERIFIED` rates in weaker families. The safest framing is: prefer top-level independently researchable units only for collection-style multi-event inputs, while preserving lifecycle-stage extraction when the input explicitly asks about chronology, appeals, monitoring, publication, or another single proceeding's process.
**Open items:** If implemented, validate on Bolsonaro EN/PT, the archived non-political multi-event control (`Boeing 737 MAX investigations and recertification decisions`), one multilingual multi-event control, and one single-proceeding lifecycle negative control.
**Warnings:** Do not turn this into a broad Stage-1 rewrite. The March 30 quality-evolution analysis shows Bolsonaro is already directionally stable; the target is quality ceiling, not global verdict behavior. Also do not let this bleed into SRG/SRF-style evaluative/disclosure families or direct factual controls, where eventization would likely be noise rather than help.
**For next agent:** Most relevant anchors are `Docs/ARCHIVE/Report_Variability_Consolidated_Plan_2026-03-07.md` (validation matrix V2-V5, MT-3 expectations, cross-topic `UNVERIFIED` guardrail), `Docs/ARCHIVE/Report_Quality_Analysis_2026-03-08.md` (Fix 5B wording), `Docs/ARCHIVE/Baseline_Test_Results_Phase1_2026-03-12.md` (historical Bolsonaro scoring criteria), `Docs/WIP/2026-03-30_Report_Quality_Evolution_Deep_Analysis.md` (current family stability), and `Docs/STATUS/Backlog.md` / `Docs/STATUS/Current_Status.md` for what already shipped.
**Learnings:** no

---

### 2026-03-31 | Lead Architect | Codex (GPT-5) | Consolidated Cross-Family Effects of `distinctEvents` Fix
**Task:** Reassess the proposed Bolsonaro-oriented `distinctEvents` fix with parallel agents, identify likely positive and negative effects across report families, and adjust the proposal to maximize net benefit.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Parallel reviews converged that the fix is directionally correct but the first version was too blunt. The adjusted proposal is: keep the change at the Stage-1 `distinctEvents` boundary; define `distinctEvents` as the minimal set of independently researchable peer event clusters; prefer sibling/peer clusters over lifecycle milestones only for collection-style multi-event inputs; preserve lifecycle/timeline sub-events when the input is explicitly about one process chronology or an article argued through episodes; and do **not** add a new always-on LLM validation/repair step yet. This should help Bolsonaro-like multi-proceeding families, non-political multi-event/process families, and multilingual multi-event prompts, while limiting harm to single-proceeding lifecycle and broad evaluative families.
**Open items:** If prompt-only guidance does not materially improve the Bolsonaro family without raising `UNVERIFIED` elsewhere, the next step should be a narrow LLM-based `distinctEvents` repair only for collection-style multi-event outputs, not a permanent always-on Stage-1 validator.
**Warnings:** `distinctEvents` directly changes query fanout and research-loop minimum iterations, so over-expansion can increase cost and spread sparse evidence too thin. Do not optimize for raw boundary count or to recreate contaminated historical peaks. Do not let this bleed into SRG/SRF, Plastik-style broad evaluative, single-event, or clearly timeline/article-driven families.
**For next agent:** Validate on Bolsonaro EN/PT (`"various"` / `"all"`), a single-proceeding Bolsonaro guardrail, `wind-still.ch` timeline/article-style control, SRG/SRF compound controls, broad evaluative inertness controls, and the documented Boeing 737 MAX multi-event/process control. The current consensus is prompt-only first, domain-neutral, with lifecycle preservation and no always-on repair step.
**Learnings:** no
