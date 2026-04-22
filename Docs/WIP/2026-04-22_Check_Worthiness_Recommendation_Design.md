---
title: Check-Worthiness Recommendation - Consolidated Design
date: 2026-04-22
authors: Codex (GPT-5)
status: Draft for implementation review
scope: ACS-CW-1 inside the ACS draft/prepared-job architecture
related:
  - Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md
  - Docs/WIP/2026-04-20_Dominant_Proposition_Architecture_Plan.md
  - Docs/STATUS/Backlog.md
  - Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Debate_CheckWorthiness_Before_ACS.md
  - Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Clarified_Order_ACS_CheckWorthiness_TopLevelProposition.md
  - Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Documentation_Update_ACS_CheckWorthiness_TopLevelProposition.md
  - Docs/Knowledge/ViClaim_EMNLP2025_Lessons_for_FactHarbor.md
  - Docs/Knowledge/CheckThat_Lab_Lessons_for_FactHarbor.md
  - Docs/Knowledge/HAMiSoN_Lessons_for_FactHarbor.md
  - apps/web/src/lib/analyzer/claim-extraction-stage.ts
  - apps/web/src/lib/analyzer/types.ts
---

# Check-Worthiness Recommendation - Consolidated Design

This document consolidates the current repository position on check-worthiness into one implementation-oriented design note for `ACS-CW-1`.

It uses the current ACS spec, backlog entries, April 22 handoffs, the dominant-proposition sequencing note, and the live Stage 1 contract as inputs. Each requested section below was pressure-tested with a targeted Advocate/Challenger/Reconciler debate before the wording was fixed.

## 1. Related Pains, Needs, Opportunities

### Pains

- The live extraction-time `AtomicClaim.checkWorthiness` field still exists as a coarse extraction-time signal on claims. It is not the rich post-Gate-1 selector authority defined here. Treating it as selector authority would misstate both the approved ACS design and the current runtime authority boundary.
- Current claim-validity authority sits elsewhere: Gate 1 handles opinion/specificity and contract validation remains the sole fidelity authority. There is no approved standalone pre-ACS public contract for check-worthiness recommendation.
- A loose extraction-time scalar does not provide the explicit triage needed for ACS selection between fact-check-worthy claims, factual-but-not-worth-checking claims, opinion/subjective claims, and unclear claims.
- Without an ACS-native recommendation layer, automatic selection would lack the approved draft/job audit surface tied to the exact final candidate set.

### Needs

- Preserve Gate 1 and contract validation as the sole claim-validity authorities.
- Run recommendation only after Stage 1 has produced the exact final flat `CBClaimUnderstanding.atomicClaims` set.
- Use one batched, multilingual-safe LLM recommendation surface with explicit rationale and persisted audit output.
- Fail closed rather than silently falling back to extraction-time `checkWorthiness`.

### Opportunities

- Improve automatic-mode selection quality without reopening Stage 1 semantics.
- Reduce avoidable Stage 2 waste by separating clearly fact-check-worthy candidates from weaker factual but non-check-worthy candidates.
- Create a clearer recommendation rationale in the ACS draft/job record.
- Shape the implementation as an internal reusable service boundary so the same recommendation logic can later be reused by Atomic Claim Extraction from Input without creating a separate public pre-ACS product surface.
- Establish a later evaluation path for a smaller specialized classifier if FactHarbor-specific evidence justifies it.

### Debate checkpoint

- Verdict: `MODIFY`
- Kept: the authority-mismatch framing, the post-Gate-1 ACS boundary, and the need for explicit triage over the final flat candidate set.
- Tightened: efficiency, user-facing, and future-classifier claims are secondary opportunities, not the core architectural pain.

## 2. Requirements

1. Recommendation is a strict post-Gate-1 ACS contract over the exact final surviving `atomicClaims` set.
2. Gate 1 opinion/specificity and contract validation retain sole authority for claim validity. Recommendation governs only post-Gate-1 ranking and preselection inside ACS.
3. Recommendation uses one batched LLM surface over already-surviving candidate claims.
4. The normative output contract contains `rankedClaimIds`, `recommendedClaimIds` capped at 3, `assessments`, and `rationale`.
5. Interactive mode uses recommendation for ranking and default preselection and may still expand final user selection up to the ACS max of 5. Automatic mode is intentionally more conservative and promotes up to 3 `recommendedClaimIds` to `selectedClaimIds`.
6. Recommendation metadata persists in draft/job metadata as ranked ids, recommended ids, rationale, and assessments.
7. Recommendation failure must fail closed. There is no silent or deterministic fallback to extraction-time `checkWorthiness`.
8. Recommendation remains inside ACS and must not become a standalone pre-ACS contract.
9. Recommendation logic must remain generic and multilingual-safe. No deterministic keyword, regex, or score-fusion logic may drive semantic selection decisions.
10. ACS semantics remain scoped to the final flat `atomicClaims` set only.
11. Recommendation does not alter Gate 1 validity authority and does not extend ACS semantics to `topLevelProposition`.
12. The implementation should expose an internal reusable service boundary so later consumers, including Atomic Claim Extraction from Input, can call the same recommendation logic without changing the ACS-first rollout path.
13. Worthiness properties should remain explicitly aligned at the semantic level with the ZHAW/ViClaim categories: FCW-equivalent, FNC-equivalent, and OPN-equivalent, with `unclear` retained as a FactHarbor control state.
14. Recommendation must self-validate at the module boundary before persistence or downstream consumption. For a candidate set of size `N > 0`, a valid snapshot requires exactly `N` assessments, exactly `N` ranked claim ids, and coverage of the full final candidate set.
15. `rankedClaimIds` must be a unique ordered permutation of the final candidate claim ids. `recommendedClaimIds` must be a unique ordered subset of `rankedClaimIds` with cardinality `0..min(3, N)`.
16. Any empty or partial output that violates these invariants, including structured-output soft-refusal shapes such as empty arrays or blank rationale strings, counts as recommendation failure and follows the retry/fail-closed path even if schema parsing succeeds.

### Debate checkpoint

- Verdict: `MODIFY`
- Kept: post-Gate-1 scope, batched call, fail-closed behavior, persistence, and mode split.
- Added: explicit max-3 recommendation cap and explicit non-goals.
- Tightened: "authority" now means post-Gate-1 recommendation authority only, never claim-validity authority.

## 3. Preconditions, Dependencies

### Hard preconditions

- `ACS-1` draft/prepared-job foundation exists.
- Stage 1 can capture and persist the exact final `CBClaimUnderstanding.atomicClaims` candidate set for the draft/job flow.
- Draft/job metadata surfaces exist for persisted recommendation output.
- Recommendation attaches only to the final flat `atomicClaims` set.

### Enabling dependencies

- Prepared-job execution flow can consume selected claims without re-running cold-start Stage 1.
- Prompt/runtime support exists for the approved single batched recommendation surface.
- Interactive and automatic ACS flows can consume `recommendedClaimIds`.

### Rollout-readiness dependency

- Recommendation-specific multilingual validation is a rollout gate before broader rollout, not a first-order architectural prerequisite.

### Non-preconditions and exclusions

- `topLevelProposition` is not a precondition.
- No standalone pre-ACS public recommendation service is part of the approved path.
- Any pre-ACS check-worthiness work must stay internal telemetry/prototyping inside the eventual ACS architecture.

### Debate checkpoint

- Verdict: `MODIFY`
- Kept: `ACS-1` foundation is the hard prerequisite and `TOPPROP-1` remains later and separate.
- Tightened: runtime mechanics moved to enabling dependencies, and multilingual validation was demoted from architecture prerequisite to rollout-readiness gate.

## 4. Specification

### Module boundary

Introduce a new ACS-internal module at `apps/web/src/lib/analyzer/claim-selection-recommendation.ts`.

This is a target ACS contract. It does not mean the module already exists in the live runtime.

Implement it behind an internal analyzer service boundary. The first consumer is ACS draft preparation; later consumers may reuse the same service inside FactHarbor, including Atomic Claim Extraction from Input, without turning it into a standalone pre-ACS public contract.

### Inputs

- Original input
- `impliedClaim`
- `articleThesis`
- Final `atomicClaims` as full typed claim objects, not a reduced projection

In the current CB contract this means the full `AtomicClaim` objects are passed, including the existing typed fields needed for recommendation reasoning such as `category`, thesis/directness-related fields, grounding-related fields, and the coarse extraction-time `checkWorthiness` signal. This section does not rely on the older `subClaims[].type` shape.

### Output contract

Canonical definitions for `ClaimSelectionRecommendationAssessment` and `ClaimSelectionRecommendation` must live in `apps/web/src/lib/analyzer/types.ts`. The inline shapes below document the expected contract and must not become a second divergent source of truth relative to the ACS spec.

```ts
export interface ClaimSelectionRecommendationAssessment {
  claimId: string;
  triageLabel:
    | "fact_check_worthy"
    | "fact_non_check_worthy"
    | "opinion_or_subjective"
    | "unclear";
  thesisDirectness: "high" | "medium" | "low";
  expectedEvidenceYield: "high" | "medium" | "low";
  coversDistinctRelevantDimension: boolean;
  redundancyWithClaimIds: string[];
  recommendationRationale: string;
}

export interface ClaimSelectionRecommendation {
  rankedClaimIds: string[];
  recommendedClaimIds: string[]; // max 3
  assessments: ClaimSelectionRecommendationAssessment[];
  rationale: string; // non-empty
}
```

### Structural validity invariants

These invariants are enforced at the recommendation-module boundary before persistence, UI consumption, or automatic-mode promotion:

- For a final candidate set of size `N > 0`, `assessments.length` must equal `N`.
- Each assessment must reference exactly one final candidate `claimId`, and assessment `claimId` values must be unique.
- `rankedClaimIds.length` must equal `N`, and the list must be a unique ordered permutation of the final candidate claim ids.
- `recommendedClaimIds` must be a unique ordered subset of `rankedClaimIds` with size `0..min(3, N)`.
- `rationale` must be non-empty, and each `recommendationRationale` must be non-empty.
- Outputs that are structurally parsed but empty, partial, duplicate-ridden, out-of-set, or blank-rationale are invalid and count as recommendation failure.

This is required so the fail-closed rule is actually enforceable in the presence of structured-output soft-refusal behavior.

### Worthiness-property alignment

The semantic target should stay explicitly aligned to the ZHAW/ViClaim worthiness properties:

| FactHarbor v1 label | ZHAW / ViClaim semantic alignment |
| --- | --- |
| `fact_check_worthy` | FCW |
| `fact_non_check_worthy` | FNC |
| `opinion_or_subjective` | OPN |
| `unclear` | FactHarbor-specific control state when the model cannot safely place the claim into the FCW/FNC/OPN-equivalent buckets |

This does not claim full ViClaim multilabel parity. FactHarbor v1 still uses one primary treatment label plus the `unclear` control state.

### Execution rules

- Default to one structured LLM call on the `context_refinement` tier because this is a single batched analysis task rather than a full verdict-generation debate. Implementation must validate provider-specific quality before rollout. If the configured `context_refinement` model is insufficient for joint reasoning about redundancy, thesis directness, evidence yield, and coverage, this task must be promoted to a stronger route before rollout.
- Evaluate the full final candidate set jointly so the model can reason about redundancy and coverage across claims.
- Do not use deterministic keyword, regex, or score-fusion logic for semantic selection.
- Do not fall back to extraction-time `checkWorthiness` if the recommendation call fails.
- After structured parsing, validate recommendation invariants against the final candidate set before persistence or downstream use.
- Retry policy: allow at most 1 retry inside the draft flow on timeout, schema-validation failure, or post-parse invariant failure (including soft-refusal-shaped empty/partial outputs) using the same contract; allow 0 retries on explicit model refusal; fail closed after exhausting retries.

### Recommendation policy

- Normally auto-recommend from `fact_check_worthy`.
- Allow `unclear` only when the higher-ranked `fact_check_worthy` claims would otherwise leave a distinct thesis-relevant dimension uncovered. In v1, "material coverage" means preserving at least one distinct relevant dimension that is not already covered by the current provisional recommendation set.
- Do not auto-recommend `fact_non_check_worthy` or `opinion_or_subjective` in v1.
- Claims that are not auto-recommended may still remain user-selectable in the ACS chooser.
- The prompt contract should treat `redundancyWithClaimIds` relative to materially competing recommendation candidates, especially the provisional recommendation set, rather than generating broad noisy cross-links across the full pool.

### Persistence and mode rules

- Persist the recommendation snapshot in draft/job metadata.
- In automatic mode, `recommendedClaimIds` become `selectedClaimIds`.
- In interactive mode, recommendation drives ranking and default preselection only.
- The asymmetry is intentional: automatic mode is conservative and capped at 3 recommendations, while interactive mode can still expand final user selection up to the ACS manual limit of 5.

### Live-state guard

This specification introduces a new ACS contract. It does not rewrite the current live extraction-time `AtomicClaim.checkWorthiness` field into selector authority. That live field remains a coarse extraction-time signal in the live contract, not the rich post-Gate-1 recommendation contract defined here.

### Debate checkpoint

- Verdict: `MODIFY`
- Kept: one ACS-internal batched module, approved inputs, approved outputs, policy limits, persistence, and automatic-mode promotion.
- Added: an explicit live-state guard and explicit `max 3` cap.
- Dropped: any wording that could imply the module already exists live or that Stage 1 semantics are being rewritten.

## 5. Risks and Mitigation

These are design and rollout-integrity risks derived from the approved architecture. They are not reported production incidents.

- `Authority drift`: Recommendation may be misread as claim-validity authority rather than post-Gate-1 recommendation authority.
  Mitigation: keep docs, prompts, types, and tests explicit that Gate 1 opinion/specificity and contract validation remain the sole claim-validity authorities.

- `Contract confusion`: The live coarse extraction-time `AtomicClaim.checkWorthiness` field may be conflated with the target ACS recommendation contract.
  Mitigation: keep an explicit live-state note, distinct contract naming, and an explicit rule that the extraction-time field remains a coarse extraction-time signal rather than selector authority.

- `Provisional taxonomy/generalization risk`: The v1 single primary triage label is an approved simplification, but mixed fact/opinion and FNC-style cases remain hard.
  Mitigation: keep the schema explicitly provisional, run recommendation-specific multilingual validation, and revise the schema before broader rollout if that gate fails.

- `Failure handling pressure`: Recommendation failure blocks progress and may create pressure to add shortcut fallbacks.
  Mitigation: fail closed, enforce module-boundary invariants before persistence, allow at most 1 retry on timeout, schema-validation failure, or invariant failure, allow 0 retries on explicit model refusal, and prohibit fallback to extraction-time `checkWorthiness`.

- `Rollout coupling/sequencing drift`: Work may drift into a standalone pre-ACS rollout or pull `topLevelProposition` semantics into ACS.
  Mitigation: preserve the approved staged order of `ACS-1` first, `ACS-CW-1` second, and `TOPPROP-1` later; keep ACS scoped to the final flat `atomicClaims` set only.

- `Implementation note`: Prompt/runtime growth should be monitored, but it is not a first-order architectural risk on the same level as authority, contract, taxonomy, failure, or sequencing.

### Debate checkpoint

- Verdict: `MODIFY`
- Kept: authority, contract, taxonomy, failure, and sequencing as the core risk set.
- Tightened: all mitigations are expressed as contract, sequencing, and fail-closed controls.
- Demoted: prompt/runtime complexity to an implementation note rather than a primary architecture risk.

## 6. Implementation Plan

### Phase 1 - Complete or confirm `ACS-1` foundation

- Draft/prepared-job flow
- Exact final candidate-set persistence
- Selection metadata surfaces required for recommendation persistence and consumption

### Phase 2 - Add `ACS-CW-1` contract and module

- Recommendation types and metadata shape
- Prompt/module interfaces
- Batched recommendation execution module inside the existing ACS draft/prepared-job architecture
- Internal reusable service boundary for later non-ACS consumers inside FactHarbor, including Atomic Claim Extraction from Input

### Phase 3 - Wire consumption and approved audit/review surfaces

- Interactive ranking and default preselection
- Automatic-mode promotion of `recommendedClaimIds` to `selectedClaimIds`
- Approved audit/review surfaces for persisted recommendation metadata

### Phase 4 - Validation and rollout gate

- Recommendation-specific multilingual validation
- Schema revision before broader rollout if that gate fails
- Broader rollout only as part of the ACS track

### Narrow-slice rule

If a narrower early slice is needed, the only acceptable one is automatic-only ACS inside the same draft/prepared-job architecture. It is not a standalone pre-ACS Check-worthiness rollout.

### Explicit exclusion

`TOPPROP-1` remains a later, separate track and is outside this implementation plan.

### Debate checkpoint

- Verdict: `MODIFY`
- Kept: the approved ACS-first order and the recommendation-specific rollout gate.
- Tightened: Phase 1 is explicitly `ACS-1` foundation, not blended scaffolding.
- Added: explicit exclusion of `TOPPROP-1` and explicit prohibition on reading any narrow slice as a standalone pre-ACS rollout.

## 7. Summary

The current repository position is stable:

- Check-worthiness is not being upgraded into a new Gate 1 authority.
- The existing extraction-time `checkWorthiness` field remains a coarse extraction-time signal and is not being upgraded into the richer post-Gate-1 selector authority defined here.
- The approved missing capability is a new ACS-internal, post-Gate-1, batched recommendation layer over the exact final flat `atomicClaims` set.
- Full rollout depends on `ACS-1` foundation first, `ACS-CW-1` second, and `TOPPROP-1` later.

## 8. Review Disposition

- Accepted findings: the contract was hardened to make fail-closed behavior enforceable and to make recommendation snapshots self-validating at the module boundary.
- What changed: the doc now requires full-candidate coverage invariants, ordered/permutation constraints for ids, non-empty rationale fields, explicit soft-refusal handling, bounded retry rules, fuller input-contract wording, and a clearer explanation of the automatic `max 3` versus interactive `max 5` asymmetry.
- What also changed: the live extraction-time `checkWorthiness` field is now described as a coarse extraction-time signal rather than as purely advisory, while the new ACS module remains the richer post-Gate-1 selector contract.
- Intentionally flexible: `recommendedClaimIds` may still be empty if the ranked/assessed snapshot is otherwise complete and the policy does not justify a safe recommendation; the current ACS spec does not require at least one recommendation in every case.
- Full rationale: see [2026-04-22_Unassigned_Check_Worthiness_Lead_Developer_Review_Disposition.md](/c:/DEV/FactHarbor/Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Check_Worthiness_Lead_Developer_Review_Disposition.md:10) and [2026-04-22_Unassigned_Check_Worthiness_Senior_Architect_LLM_Expert_Findings_Disposition.md](/c:/DEV/FactHarbor/Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Check_Worthiness_Senior_Architect_LLM_Expert_Findings_Disposition.md:10).
