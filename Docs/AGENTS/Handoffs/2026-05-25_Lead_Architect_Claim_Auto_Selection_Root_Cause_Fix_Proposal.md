---
date: 2026-05-25
role: Lead Architect
agent: Codex (GPT-5)
status: proposal
open_items: yes
---

# Claim Auto-Selection Root-Cause Fix Proposal

## Scope

This proposal addresses the Stage 1.5 automatic claim-selection failures seen after `claimAutoSelectionEnabled` was turned on by default.

The goal is to keep automatic selection enabled, keep the lightweight design, and remove the actual failure mechanism without restoring Pipeline_V2-style orchestration or user chooser machinery.

## Current Evidence

Recent local jobs failed in Stage 1.5 with:

- `AI_NoObjectGeneratedError`
- `No object generated: response did not match schema`
- terminal `UNVERIFIED`
- `confidence=0`
- `claimSelection.selectedClaimIds=[]`
- dropped claims marked `reasonType="selector_failed"`

The active selector uses `generateText(... output: Output.object({ schema }))`. That means the AI SDK applies the Zod schema before FactHarbor's own normalization and validation logic can inspect the returned object.

A narrow repair that only increases rationale char limits and removes `.strict()` should be treated as a stopgap, not the target design. It still keeps prose rationales as required fields and still validates them as hard post-parse constraints. This can move failures from SDK schema rejection into FactHarbor retry/fail-closed logic instead of removing the root cause.

## Root Cause

The selector contract currently mixes two responsibilities:

1. Machine decision contract: which atomic claims to rank, select, and drop.
2. Report/audit prose: short per-claim and overall rationales.

The machine decision is essential to pipeline execution. The prose is useful transparency metadata. Today both are enforced as one strict structured-output contract. Any minor prose violation, such as a missing rationale, extra key, null field, or overlong rationale, can prevent the selector from returning an object at all. That blocks Stage 2 before research begins.

The root cause is therefore not simply "rationale length too short." The root cause is that non-essential presentation prose is part of the provider-enforced execution contract.

## Design Decision

Use a tolerant provider-facing wire schema and a strict FactHarbor domain validator.

Provider-facing schema should be compact and decision-oriented:

```ts
{
  rankedClaimIds: string[],
  recommendedClaimIds: string[],
  assessments: Array<{
    claimId: string,
    triageLabel: "fact_check_worthy" | "fact_non_check_worthy" | "opinion_or_subjective" | "unclear",
    thesisDirectness: "high" | "medium" | "low",
    expectedEvidenceYield: "high" | "medium" | "low",
    coversDistinctRelevantDimension: "high" | "medium" | "low",
    redundancyWithClaimIds?: string[],
    recommendationRationale?: string
  }>,
  rationale?: string
}
```

Provider-facing Zod behavior:

- Do not use `.strict()`.
- Do not require rationale fields.
- Do not use tight rationale char caps in the SDK schema.
- Use optional/default/catch behavior for non-critical fields so SDK validation does not fail before FactHarbor sees the object.
- Normalize enum-label shape at the wire boundary before enum validation. Accept harmless casing/separator drift such as `Fact_Check_Worthy` or `fact-check-worthy` and normalize to the canonical contract labels. This is structural label normalization, not semantic text analysis.
- Capture a bounded raw-output diagnostic preview on selector failure. `recordClaimSelectionCall` should include an admin/metrics-only preview of at most 300 chars from the best available source, in priority order: structured object, `result.text`, AI SDK error payload/cause text, or stringified error. This must not be rendered in user-facing reports.

FactHarbor domain validation remains strict:

- `rankedClaimIds` must contain every evaluated candidate exactly once.
- `recommendedClaimIds` must be known candidate IDs.
- `recommendedClaimIds` must preserve ranked order.
- `recommendedClaimIds.length <= claimAutoSelectionCap`.
- `assessments` must map only to known evaluated candidate IDs.
- `redundancyWithClaimIds` must reference only known candidate IDs and not self-reference.

Rationales become optional display metadata:

- If present, trim and truncate for display.
- If absent, derive a neutral transparency message from structural selector data such as triage label, rank, and redundancy.
- Do not let absent or overlong prose decide whether research runs.

Candidate-volume decision:

- Reduce the default `claimAutoSelectionCandidateCap` from 25 to 12 when implementing this fix, while keeping the UCM maximum at 25.
- Rationale: this materially reduces ID-coverage drift risk in `rankedClaimIds`, `recommendedClaimIds`, `assessments`, and `redundancyWithClaimIds` without changing the conceptual design. The candidate cap is still a structured-output reliability bound, not a semantic filter.
- If the implementer sees evidence that Stage 1 source order is not good enough for article inputs at 12 candidates, hold the default at 25 and document the verifier result. Otherwise default to 12.

## Rejected Alternatives

Disable `claimAutoSelectionEnabled`.

Rejected because the Captain explicitly wants the feature enabled and the bug is fixable at the contract boundary.

Raise rationale limits only.

Rejected as incomplete. It reduces one known failure mode but keeps prose as a hard execution dependency.

Add more blind retries.

Rejected as symptom treatment. Retrying the same brittle contract increases cost and latency without changing the failure mechanism.

Fallback to all claims after selector failure.

Rejected as the primary fix because it hides selector failures and changes the intended cost/quality behavior. It may be considered later as an explicitly visible emergency degradation mode, but not as the root-cause fix.

Fallback to extraction-time `checkWorthiness`.

Rejected because `AtomicClaim.checkWorthiness` is advisory Stage 1 metadata, not selector authority.

Deterministic ranker over Stage 1 fields.

Rejected under current repository policy. It would make the Stage 1.5 selection decision through deterministic weighting/sorting over semantic fields such as `checkWorthiness`, centrality, thesis relevance, specificity, and harm potential. Those fields are LLM-produced, but the final selection policy would still be deterministic analytical decision logic. `AGENTS.md` requires LLM-powered intelligence for analysis-affecting classification, comparison, ranking, and interpretation. This alternative can be reopened only if Captain explicitly changes that policy or approves a dedicated architecture exception.

## Implementation Plan

1. Replace the current strict selector schema with a tolerant wire schema in `apps/web/src/lib/analyzer/claim-selection-recommendation.ts`.
2. Move all important invariants into `validateClaimSelectionRecommendation`.
3. Keep rationales optional in the wire schema and normalize them after validation.
4. Add structural enum normalization before canonical enum validation for selector labels.
5. Add bounded raw-output preview capture for selector failures in metrics/admin diagnostics.
6. Lower the file-backed default candidate cap to 12 unless implementation evidence justifies keeping 25; keep the UCM max at 25.
7. Update `ClaimSelectionRecommendationAssessment` and `ClaimSelectionRecommendation` types if needed so rationales are optional or normalized before exposure.
8. Update dropped-claim metadata construction in `claimboundary-pipeline.ts` so display rationale can be generated from triage/rank/redundancy when LLM prose is absent.
9. Update `CLAIM_SELECTION_RECOMMENDATION` prompt to ask for decision JSON first and make rationale fields optional transparency metadata, not mandatory execution fields.
10. Add focused tests:
   - accepts valid selector output without rationales;
   - ignores extra fields;
   - trims/truncates long rationales instead of failing;
   - normalizes harmless enum casing/separator drift;
   - records a bounded diagnostic preview on selector failure;
   - still rejects unknown IDs, duplicate rank IDs, missing ranked candidates, bad selected order, cap overflow, and invalid redundancy IDs;
   - integration test confirms a selector output without rationales still reaches Stage 2 with selected claims.
11. Run safe verification:
   - focused selector tests;
   - claim auto-selection pipeline integration test;
   - config drift test if config is touched;
   - `npm test`;
   - `npm -w apps/web run build`.

Prompt changes require explicit Captain approval before implementation, per repository rules.

Schema/validator/diagnostic changes in steps 1-8 and 10-11 can be implemented as code changes. Step 9 changes `CLAIM_SELECTION_RECOMMENDATION` prompt wording and needs explicit Captain approval before landing.

## Implementer Clarifications

Null should be treated like absence for optional wire fields:

- `redundancyWithClaimIds: null` should normalize to `[]`.
- `recommendationRationale: null` should normalize to absent rationale.
- `rationale: null` should normalize to absent overall rationale.

The enum normalizer should cover casing, hyphen/underscore/space, and camelCase drift before canonical enum validation. Examples that should normalize if otherwise valid:

- `Fact_Check_Worthy`
- `fact-check-worthy`
- `fact check worthy`
- `factCheckWorthy`

Anything that does not normalize to a known contract label must still fail validation. Do not map semantically new labels such as `mostly_check_worthy`.

Diagnostic preview requirements:

- Admin/metrics only; never render in user-facing reports or exports.
- Hard cap at 300 characters.
- Prefer structured output preview, then `result.text`, then AI SDK error payload/cause text, then stringified error.
- Redact obvious credential patterns before recording, including bearer tokens and `sk-...` style API keys.

If selector failures persist after this fix:

- If failures are mostly ID-coverage drift even at candidate cap 12, consider lowering the default cap toward 8.
- If failures are mostly label-shape drift under load, consider a narrow model-route adjustment for Stage 1.5. Treat that as a follow-up hypothesis, not part of this fix.

## Expected Result

The selector remains LLM-powered and multilingual. It still fails closed for bad decision structure, but no longer fails merely because transparency prose is missing, too long, or contains harmless extra shape drift.

This keeps the high-jump principle: preserve the useful automatic check-worthiness selection, reduce brittle safety/ceremony, and keep the implementation lightweight.

## Short Reviewer Prompt

Review the proposed root-cause fix for FactHarbor Stage 1.5 automatic claim selection. Recent jobs fail with `AI_NoObjectGeneratedError` because `Output.object({ schema })` enforces a strict Zod contract that requires short rationale prose before our validator can inspect the object. The proposal is to replace the provider-facing schema with a tolerant decision-only wire schema, move hard invariants into FactHarbor validation, and make rationales optional display metadata. Check whether this truly removes the failure mechanism while preserving selector safety, multilingual/general-topic compliance, and `claimAutoSelectionEnabled=true`. Identify any better root-cause fix or blocking risk before implementation.

## Reviewer Consolidation

Accepted reviewer additions:

- Raw-output diagnostic preview on failure is mandatory. Without it, a remaining failure mode would again be opaque.
- Enum normalization is mandatory. A tolerant wire contract must tolerate harmless casing/separator/camelCase drift in contract labels.
- Candidate cap reduction to 12 is recommended as part of the implementation unless evidence shows unacceptable quality loss. This is a reliability/cost control, not the root-cause fix.

Rejected reviewer alternative:

- A deterministic ranker over existing Stage 1 fields is not currently allowed by the repository's LLM-intelligence rule. It may be cheaper and faster, but it would move the selector decision from an LLM judgment into deterministic analytical ranking logic. Reopen only with explicit Captain approval for an architecture exception.
