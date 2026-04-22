---
### 2026-04-22 | Lead Architect | Codex (GPT-5) | Implementation Order For Check-Worthiness Atomic Claim Selection And Dominant Claim
**Task:** Investigate the dependency structure between the current specification improvements for Check-worthiness, Atomic Claim Selection, and Dominant Atomic Claim, then propose the implementation order.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Implementation_Order_CheckWorthiness_AtomicClaimSelection_DominantClaim.md`; `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Recommended engineering order is: (1) Dominant Atomic Claim hardening first, (2) Atomic Claim Selection draft/prepared-job foundation second, (3) Check-worthiness recommendation third as the selection-ranking layer that completes ACS. The key dependency is not “check-worthiness before selection”; it is the reverse: the approved Check-worthiness design now lives inside ACS as a post-Gate-1 batched recommendation over the exact final `CBClaimUnderstanding.atomicClaims`, persisted into draft/job claim-selection metadata. Dominant Atomic Claim is the most independent item because the Stage 5 article-adjudication path, `dominanceAssessment`, prompt contract, and UCM config already exist in the current runtime. Atomic Claim Selection explicitly freezes the current Stage 1 seam and explicitly does not introduce or depend on `topLevelProposition`, so any Stage 1 parent-structure work must stay out of the ACS v1 path.
**Open items:** Confirm terminology before implementation. In the repo today, “Dominant Atomic Claim” and “Dominant Proposition / topLevelProposition” are different concepts. If Captain means the April 20 `topLevelProposition` proposal rather than the existing Stage 5 dominance path, that item should move to the end of the sequence, after ACS v1, because ACS is deliberately specified against the current flat `atomicClaims` seam.
**Warnings:** Do not conflate current Stage 5 `dominanceAssessment` with proposed Stage 1 `topLevelProposition`. Do not implement Check-worthiness as a standalone authoritative Gate 1 rewrite; the approved ACS spec makes current `AtomicClaim.checkWorthiness` advisory only and requires a separate batched LLM recommendation call. Do not let ACS alter Stage 1 extraction semantics in v1; its candidate set must stay identical to today’s final `understanding.atomicClaims`.
**For next agent:** Use these anchors when planning implementation: current Stage 5 dominance path is in `apps/web/src/lib/analyzer/aggregation-stage.ts`, `apps/web/src/lib/analyzer/types.ts`, `apps/web/prompts/claimboundary.prompt.md`, and `apps/web/configs/calculation.default.json`; current Stage 1 candidate seam is `CBClaimUnderstanding.atomicClaims` in `apps/web/src/lib/analyzer/types.ts` and `extractClaims(...)` in `apps/web/src/lib/analyzer/claim-extraction-stage.ts`; the ACS build-ready design is `Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md`; the parent-structure follow-on is `Docs/WIP/2026-04-20_Dominant_Proposition_Architecture_Plan.md`.
**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.

## Dependency Summary

### 1. Dominant Atomic Claim

Current runtime status:
- already has a live Stage 5 seam: `articleAdjudication` + `dominanceAssessment`
- prompt section already exists: `ARTICLE_ADJUDICATION`
- UCM config already exists: `aggregation.articleAdjudication.enabled`

Dependency posture:
- depends only on the existing per-claim verdict path
- does not require ACS
- does not require the new Check-worthiness recommendation design
- may consume a smaller downstream claim set once ACS exists, but that is a normal upstream-input change, not a hard prerequisite

Implementation implication:
- this is the cleanest first slice because it improves current report correctness without changing intake flow, Stage 1 claim shape, or job lifecycle

### 2. Atomic Claim Selection

Current spec posture:
- sits on the exact current final `CBClaimUnderstanding.atomicClaims`
- must not change Stage 1 extraction semantics
- uses a new pre-job draft/intake object plus prepared Stage 1 snapshot
- intentionally does not depend on `topLevelProposition`

Dependency posture:
- independent of Dominant Atomic Claim at the architecture level
- but it is the enabling substrate for the new Check-worthiness recommendation flow, because that recommendation is defined over the exact final candidate set shown to the user and must persist into draft/job selection metadata

Implementation implication:
- the draft/prepared-job plumbing should land before the new selection-ranking logic is treated as complete product behavior

### 3. Check-worthiness

Current repo/spec posture:
- current extracted `AtomicClaim.checkWorthiness` exists in Stage 1, but it is advisory only
- current ClaimBoundary Stage 1 does not call `applyGate1Lite(...)`
- current Gate 1 filtering is driven by opinion/specificity plus the separate contract-validation path
- the approved improvement is a new post-Gate-1 batched LLM triage/recommendation module inside ACS, not a global rewrite of Gate 1

Dependency posture:
- depends on ACS if implemented as currently specified
- does not need Dominant Atomic Claim
- should be designed against the exact final candidate set that ACS persists and displays

Implementation implication:
- implementing it before ACS would either create dead-end plumbing or force duplication of the later draft/job audit contract

## Recommended Order

1. **Dominant Atomic Claim first**
   - Smallest blast radius.
   - Directly improves current article-level correctness.
   - Reuses existing Stage 5 adjudication seams already in production shape.
   - Keeps the work isolated from intake/UI/API redesign.

2. **Atomic Claim Selection foundation second**
   - Add the draft entity, prepared Stage 1 snapshot path, confirm/restart lifecycle, and prepared-job Stage 2 entry.
   - Keep the candidate set identical to today’s final `atomicClaims`.
   - Keep the feature behind a flag until the recommendation layer is ready.

3. **Check-worthiness recommendation third**
   - Implement as the batched post-Gate-1 recommendation module defined in ACS section 8.2.
   - Persist the full recommendation snapshot into draft/job claim-selection metadata.
   - Enable ACS only once this layer is in place, because the approved v1 design treats recommendation failure as blocking rather than falling back to deterministic ranking.

## Rollout Note

If the team wants a user-visible rollout order rather than a code-slice order, the safer release sequence is:

1. ship Dominant Atomic Claim hardening
2. build ACS foundation behind a flag
3. turn on ACS only when the Check-worthiness recommendation layer is complete

## Terminology Caveat

If “Dominant Atomic Claim” is being used informally to mean the April 20 `topLevelProposition` / dominant-proposition proposal, then the order changes:

1. Dominant Atomic Claim Stage 5 hardening
2. Atomic Claim Selection
3. Check-worthiness recommendation
4. `topLevelProposition` detection-only work

That extra separation is necessary because ACS v1 is explicitly defined against the current flat atomic-claim seam and the dominant-proposition plan itself says the parent structure must stay outside `atomicClaims` and bypass the existing `dominanceAssessment` path.
