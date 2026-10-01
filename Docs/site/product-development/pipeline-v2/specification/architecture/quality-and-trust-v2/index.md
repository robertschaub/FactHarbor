# Quality and Trust V2

> **Info**
>
> **Target Trust Architecture** - This page describes the V2 replacement target for quality gates, evidence quality, source reliability, confidence, warnings, and report trust.
>
> This page describes target architecture, not current implementation state.

## Purpose

V2 preserves FactHarbor's trust safeguards while reducing duplicated policy decisions across stages, adapters, warning display, and report generation. The trust architecture is intentionally centralized:

-   one named claim integrity gate;
-   one named evidence sufficiency gate;
-   one verdict integrity gate;
-   one warning materiality authority;
-   one canonical public result;
-   thin compatibility adapters that do not reinterpret verdict meaning.

This is a simplification of ownership, not a reduction of analytical rigor.

## V2 Trust Flow

# V2 Quality Gates Flow

> **Info**
>
> Target V2 trust flow: Gate 1, sufficiency, Gate 4, report integrity, and shared warning materiality. This diagram describes target architecture, not current implementation state.

![V2 Quality Gates Flow diagram 1](../../../../../diagrams/diagram-ec2c38920b7626fc.svg)

[Full-size diagram](../../../../../diagrams/diagram-ec2c38920b7626fc.svg) · [Mermaid source](../../../../../diagrams/diagram-ec2c38920b7626fc.mmd)

## Report Regression Control

# V2 Report Regression Control

> **Info**
>
> Target promotion and rollback loop for V2 report-generation changes. This diagram describes target architecture, not current implementation state.

![V2 Report Regression Control diagram 1](../../../../../diagrams/diagram-1005e3f001f4aada.svg)

[Full-size diagram](../../../../../diagrams/diagram-1005e3f001f4aada.svg) · [Mermaid source](../../../../../diagrams/diagram-1005e3f001f4aada.mmd)

## Required Controls

| Control | Purpose |
|----|----|
| Versioned profile | Roll back prompt/model/config/rendering defaults without source-code rollback when possible. |
| Golden corpus | Compare against approved inputs and pinned deployed comparator reports, not current master V1. |
| Stored-packet replay | Test report-generation changes without paying for full research when upstream contracts are unchanged. |
| Difference classification | Separate improvement, neutral change, accepted tradeoff, and regression. |
| Promotion gate | Prevent default rollout until automated checks and focused review pass. |
| Provenance metadata | Make every public report traceable to profile, prompt/model/config, source commit, and evidence packet. |

------------------------------------------------------------------------

**Navigation:** [Diagrams](../../../../diagrams/index.md)

V2 treats report generation as a quality-bearing surface. Narrative, markdown, HTML/export, article adjudication, warning presentation, and report writer profile changes require candidate-vs-approved comparison before promotion.

The baseline is the approved golden corpus: benchmark inputs, pinned deployed comparator reports, stored fixtures, and report-quality expectation files. Current master V1 is not a quality oracle.

Promotion requires automated schema/citation/render/Q-code checks, stored-evidence replay where valid, semantic LLM or focused review for meaning and explanation quality, measured cost/latency impact, and no unresolved regression. Accepted tradeoffs need an explicit review record.

## Trust Model

| Trust concern | V2 owner | Required outcome |
|----|----|----|
| Claim fidelity | `ClaimContract` and Gate 1 | Selected AtomicClaims preserve the user's analytical request, including ACS selected-claim IDs when present. |
| Evidence traceability | `EvidenceCorpus` | Every EvidenceItem has a source, source reference, EvidenceScope, claim direction, and extraction/provenance trace. |
| Evidence adequacy | `SufficiencyAssessment` | The pipeline explicitly decides whether to continue, refine, proceed with caveat, or produce a damaged/non-analytical result. |
| Boundary coherence | `BoundarySet` | ClaimAssessmentBoundaries emerge from compatible EvidenceScopes after research, not from predeclared topic buckets. |
| Verdict integrity | `VerdictSet` and Gate 4 | Verdicts cite evidence, preserve direction semantics, distinguish doubted from contested, and pass confidence checks. |
| Public interpretation | `ReportResult` | One canonical result owns verdict, truth percentage, confidence, quality gates, warnings, and report-quality status. |
| User-visible caveats | `WarningEvent` policy | Warning visibility follows material verdict impact, not raw event noise or inline UI decisions. |

## Gate Summary

| Gate | Stage | Blocks when | User-facing representation |
|----|----|----|----|
| Gate 1 - Claim integrity | Claim Understanding | The input is not analyzable, selected claims are lost, ACS migration is invalid, or repair cannot preserve intent. | Blocked or damaged report with claim-integrity explanation. |
| Sufficiency Gate | Evidence Lifecycle | Evidence is too sparse, too weak, inaccessible, or mismatched to support a trustworthy verdict. | Caveat, refinement, or damaged/non-analytical report depending on materiality. |
| Gate 4 - Verdict integrity | Verdict Adjudication | Verdicts lack citation integrity, direction integrity, grounding, or confidence support. | Verdict is repaired, downgraded, or blocked according to the shared policy. |
| Report integrity | Aggregation and Result Writer | Canonical public fields, warnings, or evidence references are inconsistent. | Damaged-report flag or compatibility adapter failure before publication. |

## Evidence Quality Boundary

V2 separates structural checks from semantic evidence judgment:

| Allowed structural plumbing | Semantic decision owner |
|----|----|
| Schema validation, source URL presence, stable IDs, citation ID matching, duplicate source identity, fetch status, budget accounting | LLM-owned relevance, applicability, probative value, scope compatibility, evidence strength, and source meaning judgments |

V2 must not reintroduce deterministic semantic filtering based on vague phrase lists, keyword matching, language-specific regex, Jaccard-style meaning similarity, or category-specific wording rules. Those V1 mechanisms may remain historical runtime documentation, but they are not V2 target design.

## Source Reliability In V2

Source reliability remains valuable as an observable source-trust signal. In V2 it is integrated as part of the EvidenceCorpus and run ledger, not as an automatic truth-percentage formula.

The accepted V2 posture is:

-   source reliability can inform source portfolio visibility and reviewer diagnostics;
-   source reliability may be shown to verdict adjudication only through an approved policy;
-   direct source-reliability verdict weighting requires later architecture review and comparator validation;
-   cached source-reliability records must remain traceable to model/prompt/config versions.

See [Source Reliability V2](../deep-dive/source-reliability-v2/index.md).

## Confidence And Warning Authority

V2 keeps the 7-point verdict scale and the MIXED/UNVERIFIED distinction, but centralizes confidence semantics in the canonical result writer and Gate 4 contract. Adapters, UI readers, exports, and validation summaries consume `ReportResult` instead of recalculating verdict meaning.

Warning materiality uses the governing test:

> Would the verdict be materially different if this event had not occurred?

Routine recovered operations stay silent or admin-only. Analytical scarcity is visible when it materially limits trust, but it is not treated as a system error. System failures that can degrade or damage the verdict must remain visible.

## Cutover Readiness Checks

Before V2 can replace V1, quality and trust review must verify:

-   Gate 1, sufficiency, Gate 4, and report-integrity states appear in `ReportResult` and compatibility projections.
-   User-visible warnings are classified by one shared policy.
-   Evidence citations are complete enough for every verdict that depends on evidence.
-   Report-quality status, narrative completeness, and evidence references are present in public artifacts.
-   Report-generation profiles are versioned, replayable where upstream contracts are unchanged, and rollback-ready.
-   Source reliability is observable without unapproved direct verdict weighting.
-   V2 and V1 comparator reports are reviewed for the approved benchmark inputs.

## Related V2 Pages

-   [AKEL Pipeline V2](../akel-pipeline-v2/index.md)
-   [AKEL Pipeline Detail V2](../akel-pipeline-detail-v2/index.md)
-   [Data Model V2](../data-model-v2/index.md)
-   [Quality Gates V2](../deep-dive/quality-gates-v2/index.md)
-   [Evidence Lifecycle V2](../deep-dive/evidence-lifecycle-v2/index.md)
-   [Calculations and Verdicts V2](../deep-dive/calculations-and-verdicts-v2/index.md)

------------------------------------------------------------------------

**Navigation:** [Architecture](../../../../specification/architecture/index.md) \| [Current Quality and Trust](../../../../specification/architecture/quality-and-trust/index.md)
