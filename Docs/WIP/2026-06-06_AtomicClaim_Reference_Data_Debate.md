# AtomicClaim Reference Data — Focused Debate Record

**Date:** 2026-06-06
**Topic:** How reference data should cover both clearly determinable AtomicClaim separability and ambiguous term/frame interpretation.
**Trigger:** Captain correction: split/combine variance exists, but often the number of AtomicClaims is clear; the harder issue is interpreting ambiguous terms such as "pointless" or "rechtskräftig".
**Inputs reviewed:** `Docs/WIP/2026-06-06_AtomicClaim_Reference_Data_Model.md`, the Claim Clarification Gate design's ambiguity states, and the current report-quality implementation plan.

## Debate Positions

### Atomicity Formalist

The model must not let N:M alignment become a loophole. Many inputs have clearly distinct truth conditions. If a dossier can determine those conditions, a report must keep them independently assessable even when it phrases them in one extracted claim.

Accepted:

- Add frame-scoped `atomicityProfile`.
- Add distinct truth conditions.
- Add separability rules.
- Penalize merged claims when they hide a distinct truth condition.

### Interpretation-Frame Specialist

The primary hard case is not arbitrary claim count. It is term/frame interpretation. Inputs such as "pointless" and "rechtskräftig" need explicit interpretation frames and ambiguity policy. A report may be allowed to commit to one frame, may need to disclose alternatives, or may need to cover all frames.

Accepted:

- Keep interpretation frames as the primary container.
- Add `interpretedTermOrFrame` and `interpretationDefinition`.
- Default multi-frame dossiers to `must_disclose`.

### Measurement Methodologist

C1 cannot be a single opaque semantic score. It needs separable axes so reviewers can see whether a report failed because it chose the wrong frame, missed an assertion, collapsed distinct atoms, or failed to disclose ambiguity.

Accepted:

- Score `clarificationFit`, `frameAdmissibility`, `assertionCoverage`, `atomicityFidelity`, and `disclosureFidelity`.
- Use active-frame selection before assertion mapping.
- Measure judge agreement per axis, not only aggregate C1.

### Implementation Skeptic

The schema and judge flow can become too expensive and too complex. The pilot must be bounded and must prove reliability before production wiring.

Accepted:

- v0.1 required fields stay minimal.
- No production wiring before pilot gates.
- USD 10 proposed initial judge cap.
- Stop on unstable per-axis mapping.

## Reconciled Decision

**ADOPT WITH MODIFICATIONS.**

The reference-data system now has two first-class contracts:

1. **Interpretation-frame contract** for ambiguous terms/frames.
2. **Atomicity/separability contract** for determinable truth conditions inside each frame.

Frame choice comes first. Assertion and atomicity scoring happen only inside the active frame. N:M mapping remains allowed for wording variance, but cannot erase clear atomicity.

## Required Changes Applied

- `Docs/WIP/2026-06-06_AtomicClaim_Reference_Data_Model.md`
  - Rewritten around frame-scoped atomicity.
  - Added `expectedClarificationReason`.
  - Added `atomicityPolicy`, frame `atomicityProfile`, `distinctTruthConditions`, `truthConditionId`, and `separability`.
  - Rewrote C1 scoring into sequential axes.
  - Added two-pass LLM judge requirement.
  - Added Phase 0b pilot gates per axis.

- `Docs/WIP/2026-06-04_Report_Quality_Measurement_Implementation_Plan.md`
  - Added explicit Phase 0b.
  - Updated reference-gradient language.
  - Added pilot dossiers and per-axis gates.

## Red Lines

- No strict 1:1 expected AtomicClaim string list.
- No using ambiguity to excuse missed deterministic atoms.
- No single-pass multi-frame LLM judging for C1.
- No production scorer wiring before per-axis reliability is measured.
- No LLM judge spend without Captain-approved cap.
