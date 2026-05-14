# Pipeline Rebuild Target Specification Review Consolidation

**Date:** 2026-05-12
**Workspace:** `C:\DEV\FactHarbor`
**Git branch:** `codex/v2-pipeline-rebuild`
**Status:** Deputy review complete; target architecture approved; implementation in progress through Slice 6A
**Reviewed spec:** `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md`

---

## 1. Review Scope

The deputy team reviewed the cleaned target specification for replacing the current ClaimAssessmentBoundary pipeline. The review checked:

- clean architecture balance and maintainability;
- prompt/config/model and LLM-semantic compliance;
- implementation feasibility and migration order;
- regression, result schema, warning/report, API/UI/export, and adapter risk;
- adversarial failure modes: broken intermediate system, over-preserved V1 complexity, hidden coupling, vague gates, and additive-refactoring drift.

No reviewer edited files, ran tests, submitted jobs, or changed implementation.

---

## 2. First-Pass Verdict

All five reviewers returned **approve with required changes**. No reviewer requested Captain escalation.

| Reviewer lens | First-pass verdict | Main required changes |
|---|---|---|
| Lead Architect | Approve with required changes | add uniform stage failure/event/gate matrix; lock implementation-entry decisions; clarify cleanup semantics; make runtime/cost measurable |
| LLM Expert | Approve with required changes | require verifier for every hotspot; add cache governance; strengthen source-language-first policy; add prompt-genericity gate; clarify source-classification boundaries |
| Senior Developer | Approve with required changes | define V2 namespace/entrypoint/pre-cutover gate; move adapters earlier; make ACS default concrete; define cross-language schema ownership; split tests per slice |
| Code Reviewer | Approve with required changes | lock schema skeleton/defaults; separate provider/search retry ownership; strengthen UI/export tests; add typed warning contract; specify ACS behavior |
| Challenger | Approve with required changes | add field-level adapter mappings; add mechanism retention/deletion ledger; operationalize pre-cutover path; make cutover gates concrete; add decision dependency order |

---

## 3. Changes Applied

The target specification was revised to include:

- Section 4.1: deputy review consolidation.
- Section 4.2: V2 implementation boundary and pre-cutover strategy, including `apps/web/src/lib/analyzer-v2/`, `runClaimBoundaryPipelineV2(context)`, disabled-by-default pre-cutover gate, kill switch, and V1 protection rules.
- Section 6: default V2 schema strings, `ReportResult` skeleton, `WarningEvent` skeleton, and typed provider/search outcome ownership.
- Section 7: concrete ACS consume/migrate default and selected-claim preservation.
- Section 8: source-language-first multilingual/search policy and source-classification boundary.
- Section 12.1: uniform stage failure/event/gate matrix.
- Section 13: cache governance, prompt-genericity/multilingual gate, and prompt/config/model quarantine list.
- Section 14: primary issue selection policy.
- Section 15: field-level external compatibility matrix and cross-language schema ownership.
- Section 16: mandatory deterministic-hotspot verifier/waiver table.
- Section 17: per-slice test strategy, render smoke checks, and concrete cutover quality gates.
- Section 18: adapter-first implementation slice order and cutover checklist.
- Section 18.1: mechanism retention and cleanup ledger.
- Section 21: decision defaults, dependency order, and escalation triggers.

---

## 4. Second-Pass Verdict

All five reviewers returned **approve**. No remaining blockers. No Captain escalation required.

| Reviewer lens | Second-pass verdict | Remaining blockers | Escalation |
|---|---|---|---|
| Lead Architect | Approve | none | no |
| LLM Expert | Approve | none | no |
| Senior Developer | Approve | none | no |
| Code Reviewer | Approve | none | no |
| Challenger | Approve | none | no |

Implementation-review reminder from Lead Architect: verify during implementation that the pre-cutover gate cannot accidentally route public jobs to V2.

---

## 5. Final Deputy Decision

The target architecture is approved by the Captain Deputy team as the implementation baseline.

This does not mean unrestricted implementation. Implementation must follow the approved slice order in the target spec:

1. Golden result, ACS, warning, and legacy fixtures plus JSON schema contract tests.
2. Compatibility adapters for V1/V2 fixtures and all public consumers.
3. Isolated V2 shell, disabled by default.
4. Prompt/config/model gateway skeleton.
5. Stage-by-stage implementation.
6. Pre-cutover verification.
7. Approved live validation gate.
8. Controlled cutover.
9. V1 cleanup only after V2 gates pass.

Prompt edits, live validation spend, UI/API/report breaks, ACS invalidation, static HTML retirement, warning-policy changes, or material verdict-math changes still require escalation under the target spec.

---

## 6. Verification State

This was a documentation/specification review.

- No analyzer source files changed.
- No prompt files changed.
- No config files changed.
- No UI files changed.
- No tests were run.
- No live jobs or validation batches were submitted.

`git diff --check` and `npm run index` should be run after this consolidation and related tracking docs are updated.
