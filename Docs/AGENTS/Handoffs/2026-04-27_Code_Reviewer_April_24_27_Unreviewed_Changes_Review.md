# Code Review: Unreviewed Changes April 24-27, 2026

**Date:** 2026-04-27
**Role:** Code Reviewer
**Agent:** Claude Opus 4.6
**Classification:** Significant
**Open Items:** Yes

## Scope

98 commits touching code/prompts/tests landed on `main` between April 24-27 without formal Code Reviewer sign-off. Reviewed via 5 parallel passes against baseline `078be27b`. Key diffstat: +3,164/-252 lines across 10 core production files; +3,685 test lines across 6+ test files.

**Commits skipped (already covered):** `d26fa84a`, `671c9462`, `6b1507e7`, `c1513ac8` (235000 regression handoffs), all docs-only commits.

## Verification

- **TypeScript tests:** 2019 passed, 1 skipped (108 test files)
- **Next.js build:** Clean, no type errors
- **.NET tests:** 12 passed, 0 failed

## Findings Summary

| Severity | Count | Key Items |
|----------|-------|-----------|
| **HIGH** | 1 | Prepared Stage 1 snapshot reuse without provenance validation |
| **MEDIUM** | 8 | Prompt density, undefined terms, cross-worker queue state, etc. |
| **LOW** | 18 | Missing test coverage, code quality, cosmetic issues |
| **INFO** | 49 | Confirmations of correct design and coverage |

## HIGH Findings

### [P4-011] Prepared Stage 1 snapshots reused without provenance validation
**File:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts:943-954`
**Description:** When `input.preparedStage1` is provided, the pipeline calls `buildPreparedResearchState` using the snapshot's data directly without comparing any provenance hashes (`promptContentHash`, `pipelineConfigHash`, `searchConfigHash`, `calcConfigHash`). If a deployment changes prompts or pipeline config between preparation and execution, Stage 1 understanding (claim extraction, contract validation, salience commitment) will be stale — produced by different prompts/config than what Stage 2+ uses.
**Recommendation:** Before reusing a prepared snapshot, compare at minimum `promptContentHash` and `pipelineConfigHash` against current values. If they differ, reject the snapshot or re-run Stage 1. The provenance fields already exist but are never validated.

## MEDIUM Findings

### [P1-002] Final batch adjudicateNeutralCitationDirections call has no rollback
**File:** `apps/web/src/lib/analyzer/verdict-stage.ts:1797`
**Description:** Call site 3 mutates `evidence[].claimDirection` without rollback. If `enforceVerdictCitationIntegrity` at line 1809 were to gain throw paths, evidence would be left partially mutated. Currently safe because the function is synchronous and does not throw.
**Recommendation:** Add a defensive comment documenting this call is intentionally final-and-committed.

### [P1-004] isSingleClaimScopedEvidence excludes shared evidence from adjudication
**File:** `apps/web/src/lib/analyzer/verdict-stage.ts:2606`
**Description:** Multi-claim evidence (`relevantClaimIds.length > 1`) is never adjudicated. If shared evidence is the only neutral candidate for the decisive side, those verdicts will always degrade to `verdict_integrity_failure` with no repair path.
**Recommendation:** Monitor frequency of this scenario in production. If common, consider per-claim direction via `claimDirectionByClaimId`.

### [P2-005] "companion claim" used 15 times but never formally defined
**File:** `apps/web/prompts/claimboundary.prompt.md:292`
**Description:** The concept drives the entire comparison decomposition subsystem but has no explicit definition. LLM must infer meaning from context.
**Recommendation:** Add a one-line definition near first use in CLAIM_EXTRACTION_PASS2.

### [P2-007] Evidence Direction Contract density creates LLM selective attention risk
**File:** `apps/web/prompts/claimboundary.prompt.md:1204-1355`
**Description:** ~60 lines of dense negative constraints ("Do not mark... Do not classify...") in EXTRACT_EVIDENCE. Combined with Rule 20 density (P2-001), the prompt has two major density hotspots.
**Recommendation:** Restructure into a decision-tree format to reduce parallel negative rules.

### [P2-012] "comparison orientation" used 8 times but never defined
**File:** `apps/web/prompts/claimboundary.prompt.md:292`
**Description:** Could be misinterpreted as direction of the comparison operator rather than subject-object framing.
**Recommendation:** Add one-line definition.

### [P3-006] Shallow spread for cloned evidence items shares nested objects
**File:** `apps/web/src/lib/analyzer/research-extraction-stage.ts:628,639-654`
**Description:** `{ ...assessedItem, ... }` is a shallow spread — nested objects like `evidenceScope` are shared references. No code currently mutates them post-clone, but future changes could cause cross-claim contamination.
**Recommendation:** Add warning comment or deep-clone `evidenceScope`.

### [P4-005] No mutex/lock around globalThis queue state mutations
**File:** `apps/web/src/lib/internal-runner-queue.ts:44-78`
**Description:** Per-process state only. Multiple Next.js workers each maintain independent queue state. Mitigated by server-side `claimRunnerSlot` using SERIALIZABLE transactions.
**Recommendation:** Document that actual concurrency enforcement is server-side.

### [P5-007] No unit test for TryClaimRunnerSlotAsync
**File:** `apps/api/Services/JobService.cs:113`
**Description:** The flagship new method has proper SERIALIZABLE isolation but zero direct tests. Web integration tests mock the HTTP endpoint without exercising the C# logic.
**Recommendation:** Add tests for successful claim, not_found, not_queued, and capacity_full branches.

## LOW Findings

| ID | File | Description |
|----|------|-------------|
| P1-007 | verdict-stage.ts:3700 | citationArraysChanged length check — actually correct on analysis |
| P1-011 | verdict-stage.test.ts | No multi-claim verdict batch test for adjudication |
| P1-013 | aggregation-stage.ts | hasBorderlineAdjudicationNeed has no dedicated unit test |
| P1-015 | aggregation-stage.ts:298 | shouldRunArticleAdjudication path label misleading for borderline-only case |
| P1-017 | verdict-stage.ts:2883 | Evidence mutation via side effect (pre-existing pattern) |
| P2-001 | claimboundary.prompt.md:571-603 | Rule 20 density has tripled (~33 lines, 20+ bullets) |
| P2-008 | claimboundary.prompt.md:2454-2480 | APPLICABILITY near-duplicates Evidence Direction Contract |
| P2-015 | claimboundary.prompt.md:1566-1670 | VERDICT_ADVOCATE enumeration inconsistency with EXTRACT_EVIDENCE |
| P3-002 | source-reliability.ts:226 | budgetDeadlineMs null check is dead code |
| P3-008 | research-orchestrator.ts:642 | budgetExhaustionWarned collapses two distinct scenarios |
| P3-011 | source-reliability.test.ts | Time-limit test only in subdomain file |
| P3-015 | research-extraction-stage.ts:628 | Applicability-disabled path returns bare item without copy |
| P3-016 | source-reliability.ts:460 | totalBatches estimate can be inaccurate (cosmetic) |
| P3-018 | research-extraction-stage.ts:636-654 | Original neutral evidence ID dropped when all claims get directions |
| P4-006 | internal-runner-queue.ts:56-61 | Defensive reconstruction masks state corruption silently |
| P4-009 | internal-runner-queue.ts:946-957 | Draft preparation lacks server-side claim mechanism |
| P4-016 | runner-concurrency-split.integration.test.ts | No test for claim-runner rejection paths |
| P4-018 | claimboundary-pipeline.test.ts | No test for provenance field population |
| P4-021 | internal-runner-queue.ts:384-386 | Misleading indentation after removed block |
| P4-022 | claim-extraction-stage.ts:1253 | `as unknown as AtomicClaim[]` casts repeated |
| P4-023 | claimboundary-pipeline.ts:451 | resolveClaimDisplayText uses untyped `any` |
| P4-027 | internal-runner-queue.ts:428 | Narrow window between claimRunnerSlot and first status emit |
| P5-013 | ClaimSelectionDraftService.cs:190 | Selection state TOCTOU still uses read-committed |
| P5-019 | claim-selection-drafts/route.ts:27 | Manual input validation, not schema-based |
| P5-022 | api.Tests | Duplicated TestDatabase helper class |

## Prior Findings Status

| # | Finding | Status |
|---|---------|--------|
| 1 | No C# tests for ClaimSelectionDraftService | **RESOLVED** — 11 tests covering all 5 priorities |
| 2 | Verdict fallback skips re-enforcement | **RESOLVED** — `enforceVerdictCitationIntegrity` runs downstream on all paths |
| 3 | Relevance cache key missing model/provider | **RESOLVED** — provider + modelName now in cache key |
| 4 | MT-5(C) retry lacks max guard | **RESOLVED** — `maxMt5CorrectiveRetries = 1`, counter cannot be reset |
| 5 | SR budget exhaustion not covered | **RESOLVED** — budget enforcement per-domain, warning types emitted |

## Positive Observations

- **Test expansion is excellent:** +3,685 test lines with thorough coverage of new adjudication, budget enforcement, cache, and C# service logic.
- **Token security is textbook:** SHA-256 + fixed-time comparison + hash-only storage.
- **Runner concurrency enforcement:** Proper SERIALIZABLE isolation at the API layer.
- **Cross-stage prompt consistency:** Despite 43 prompt commits, comparison direction rules are coherent across all pipeline stages.
- **All 5 prior review findings resolved.**

## Recommended Priority Actions

1. **[P4-011] HIGH — Add provenance validation before snapshot reuse** (claimboundary-pipeline.ts)
2. **[P5-007] MEDIUM — Add TryClaimRunnerSlotAsync unit tests** (JobService.cs)
3. **[P2-005] MEDIUM — Define "companion claim" in prompt** (claimboundary.prompt.md)
4. **[P2-012] MEDIUM — Define "comparison orientation" in prompt** (claimboundary.prompt.md)
5. **[P2-007] LOW — Restructure Evidence Direction Contract density** (claimboundary.prompt.md)
