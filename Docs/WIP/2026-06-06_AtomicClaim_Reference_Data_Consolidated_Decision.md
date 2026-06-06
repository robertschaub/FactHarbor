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
- Strict truth conditions must remain independently assessable through Stage 1 `AtomicClaims`.
- `expectedInputClassification` uses the real Stage 1 enum (`single_atomic_claim`, `ambiguous_single_claim`, `multi_assertion_input`, `question`, `article`). Richer clarification reasons are future telemetry and are not scored in v0.1.
- Atomicity is frame-scoped only. There is no root-level atomicity override.
- Current-snapshot dossiers are time-relative gold: build comparisons must pin dossier ID, dossier version, and comparison run-window.

N:M semantic alignment is permitted only to tolerate wording and occasional split/combine differences. It must not allow a report to merge away, omit, or obscure clearly distinct truth conditions.

## Scoring Contract

C1 dossier-backed scoring is sequential and per frame:

1. **Input-classification fit** - whether Stage 1 `inputClassification` matches the dossier's expected real enum value where telemetry exists.
2. **Frame admissibility** - which interpretation frame the report actually pursued.
3. **Assertion coverage** - whether required assertions in the active frame are addressed.
4. **Atomicity fidelity** - whether strict truth conditions in the active frame are independently represented by Stage 1 `AtomicClaims`; downstream verdict/evidence cannot rescue a C1 merge.
5. **Disclosure fidelity** - whether competing frames are disclosed when required.

C3 dossier-backed scoring applies only after C1 alignment and only against the active frame's mapped reference assertions. Evidence-source equivalence uses a separate C3 judge contract over mapped assertions, source snapshots, report `EvidenceItem`s, and `CBClaimVerdict.evidenceIds`; it does not rewrite C1.

## Phase 0b Gate

Dossier-backed C1/C3 metrics stay diagnostic until the pilot proves reliability:

- manual alignment first;
- JSON Schema + structural validator before dossier authoring beyond draft;
- pinned manual-alignment rubric before manual-vs-judge agreement is measured;
- two-pass LLM alignment only after Captain-approved spend cap;
- at least 85% manual-vs-judge agreement on each axis;
- kappa at or above 0.70 only once an axis has at least 30 adjudicable scored units and a non-degenerate label distribution;
- no production scorer wiring if frame admissibility, determinability, or atomicity fidelity is unstable.

## Red Lines

- No strict 1:1 expected AtomicClaim string list.
- No single-pass multi-frame LLM judging for C1.
- No scoring extraction coverage before selecting the active interpretation frame.
- No using ambiguity to excuse missed deterministic atoms.
- No collapsing distinct truth conditions to evade an atomicity miss.
- No C1 rescue from downstream verdicts, evidence, or narrative.
- No production use of current-snapshot gold without dossier-version and run-window pinning.
- No LLM judge spend without Captain-approved cap.
