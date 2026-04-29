---
### 2026-04-29 | Lead Architect / Senior Developer | Codex (GPT-5) | Selected Claim Admission Coverage Fix
**Task:** Implement the approved selected-claim acquisition starvation plan end to end, review/debate as needed, restart services, submit live jobs, monitor results, and document outcomes.

**Files touched:** `apps/web/src/lib/analyzer/research-orchestrator.ts`, `apps/web/src/lib/analyzer/research-waste-metrics.ts`, `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/analyzer/warning-display.ts`, `apps/web/src/lib/claim-selection-flow.ts`, `apps/web/src/lib/internal-runner-queue.ts`, `apps/web/src/lib/config-schemas.ts`, `apps/web/configs/pipeline.default.json`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/api/Services/ClaimSelectionDraftService.cs`, `apps/api/Services/JobService.cs`, `apps/web/scripts/automatic-claim-selection.js`, targeted web/API tests, `Docs/WIP/2026-04-29_Selected_Claim_Acquisition_Starvation_Findings_And_Plan.md`, `Docs/WIP/2026-04-29_Remaining_Unification_Implementation_Status.md`, `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Atomic Claim Selection and Validation/WebHome.xwiki`, `Docs/AGENTS/Role_Learnings.md`.

**Key decisions:** The root cause was an incomplete existing mechanism, not an ACS mode distinction. Stage 2 already had a below-floor selected-claim targeting path, but late protected-window checks plus no-search zero-yield exhaustion could produce ordinary zero-evidence `UNVERIFIED` selected claims. The fix stayed structural: pre-query protected-window guard, explicit no-acquisition telemetry/warning, budget-aware admission cap, persisted C# enforcement, and exact-cap auto-continue. No prompt change, deterministic semantic filtering, second selector, or UCM default mode switch was introduced. Phase 1 alone was live-tested and failed at 5 selected claims, so budget admission was promoted into the same release train. Candidate count equal to the admission cap now bypasses ACS recommendation and selects all candidates.

**Open items:** Bolsonaro exact-extended runs are now healthy on acquisition but stable `UNVERIFIED` (`aa686dcce9d544a3a0d93a17e5860b67` 52.5/40; `685fbe2dc6674dfa91a3a741eaa57b9c` 48.5/40) while older exact-extended baselines were usually `LEANING-TRUE` / `MOSTLY-TRUE`. Treat that as a separate report-quality/adjudication drift investigation. Long-tail runtime remains after acquisition, especially applicability/claim mapping, clustering, and verdict debate.

**Warnings:** Keep the effective local admission cap at 3 under the current 600s research budget / 120s contradiction reserve / 160s estimated main-research-per-claim default until fresh canary timings support a higher value. Do not interpret future `UNVERIFIED` Bolsonaro results as acquisition misses without checking `selectedClaimResearchCoverage` first. The repeat SVP canary `661a649d61444be1b4c7a511bc8df2a6` had zero targeted selected-claim count fixed but surfaced separate verdict-integrity warnings.

**For next agent:** Start from commits `08dfe69b`, `ee1ef6ce`, and `952b0847`. Use validation summaries, not verdict labels alone: expected healthy selection telemetry is `claimSelectionCap=5`, `claimSelectionAdmissionCap=3`, selected count <= 3, and `zeroTargetedSelectedClaimCount=0`. For Bolsonaro, compare acquisition separately from adjudication: both current exact-cap runs selected `AC_01`, `AC_02`, and `AC_03`, all with sufficient searched evidence. The next likely high-value slice is a report-quality review of why current adjudication weights procedural challenges more heavily than older exact-extended baselines.

**Learnings:** Appended to `Docs/AGENTS/Role_Learnings.md`: exact-cap ACS should bypass recommendation and preserve all candidates when `candidateCount <= effectiveAdmissionCap`.

**Verification:** Targeted Vitest suites and web build passed for the implementation commits; API focused tests passed for draft/job enforcement; services were restarted after commits. Live jobs used: `a652605b34cc430c9eb424bd9188fae7` (Phase 1 only, failed coverage at 5), `60f8e2287a07446fb80edf4ff89e8cc8` (SVP pass), `661a649d61444be1b4c7a511bc8df2a6` (SVP repeat pass), `1b77e64cebac44da87a075a5977a3bf3` (pre exact-cap bug), `aa686dcce9d544a3a0d93a17e5860b67` (Bolsonaro pass on coverage), `685fbe2dc6674dfa91a3a741eaa57b9c` (Bolsonaro repeat pass on coverage). Original 6-job budget was used; optional +2 was not used.

```text
DEBT-GUARD RESULT
Classification: incomplete existing mechanism.
Chosen option: amend existing selected-claim coverage/admission boundaries.
Rejected options: lower automatic-only cap, direct-path semantic selection, prompt changes, and deterministic claim filtering.
Net complexity: one existing Stage 2 guard amended, one existing ACS admission contract made budget-aware and persisted, one exact-cap boundary corrected.
Debt accepted: report-quality adjudication drift and post-acquisition runtime are documented as separate follow-ups.
```
