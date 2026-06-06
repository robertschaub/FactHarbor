# AtomicClaim Reference Data — Consolidated Decision

**Date:** 2026-06-06
**Status:** Consolidated design decision
**Related model:** `Docs/WIP/2026-06-06_AtomicClaim_Reference_Data_Model.md`
**Related plan:** `Docs/WIP/2026-06-04_Report_Quality_Measurement_Implementation_Plan.md`

## Decision

Reference dossiers must cover two first-class aspects:

1. **Interpretation frames** for ambiguous terms, phrases, and legal/procedural concepts.
2. **Frame-scoped atomicity/separability** for truth conditions that are clearly determinable inside a chosen frame.

The central hard case is not arbitrary claim-count variance. Split/combine wording differences can occur, but many benchmark inputs have a clearly determinable number of distinct truth conditions. Dossiers must therefore prevent ambiguity handling from hiding missed AtomicClaims.

## Consolidated Model

- Each dossier defines one Captain-approved input.
- Each dossier can define one or more interpretation frames.
- Each interpretation frame defines:
  - the term/frame being interpreted;
  - the admissible meaning of that frame;
  - required, optional, tolerated-context, and forbidden reference assertions;
  - an `atomicityProfile` describing whether the frame's truth-condition count is determinable;
  - distinct truth conditions when determinable.
- Each required reference assertion belongs to exactly one truth condition.
- Strict truth conditions must remain independently assessable in the report.

N:M semantic alignment is permitted only to tolerate wording and occasional split/combine differences. It must not allow a report to merge away, omit, or obscure clearly distinct truth conditions.

## Scoring Contract

C1 dossier-backed scoring is sequential and per frame:

1. **Clarification fit** - whether Stage 1 behavior matches the dossier's expected clarification reason where forward telemetry exists.
2. **Frame admissibility** - which interpretation frame the report actually pursued.
3. **Assertion coverage** - whether required assertions in the active frame are addressed.
4. **Atomicity fidelity** - whether strict truth conditions in the active frame are independently assessable.
5. **Disclosure fidelity** - whether competing frames are disclosed when required.

C3 dossier-backed scoring applies only after C1 alignment and only against the active frame's mapped reference assertions.

## Phase 0b Gate

Dossier-backed C1/C3 metrics stay diagnostic until the pilot proves reliability:

- manual alignment first;
- two-pass LLM alignment only after Captain-approved spend cap;
- at least 85% manual-vs-judge agreement on each axis;
- kappa at or above 0.70 where sample size supports it;
- no production scorer wiring if frame admissibility or atomicity fidelity is unstable.

## Red Lines

- No strict 1:1 expected AtomicClaim string list.
- No single-pass multi-frame LLM judging for C1.
- No scoring extraction coverage before selecting the active interpretation frame.
- No using ambiguity to excuse missed deterministic atoms.
- No collapsing distinct truth conditions to evade an atomicity miss.
- No LLM judge spend without Captain-approved cap.
