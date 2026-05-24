# FactHarbor Calculations and Verdicts V2

**Status:** V2 target specification companion
**Canonical reader page:** `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Calculations and Verdicts V2/WebHome.xwiki`

This document summarizes the calculation and verdict rules for the pipeline rebuild. The current `Calculations.md` file remains V1/ClaimAssessmentBoundary runtime documentation until cutover.

## V2 Verdict Authority

V2 has one public verdict authority: `ReportResult`.

`ReportResult` owns:

- verdict label;
- truth percentage;
- confidence and confidence tier;
- MIXED vs UNVERIFIED decision;
- quality-gate state;
- material warnings;
- evidence references;
- report-quality status.

Compatibility adapters may project these fields for API, UI, export, validation, and historical reads. They must not compute replacement verdicts.

## Preserved Semantics

V2 preserves the current 7-point verdict scale and the distinction between:

- `MIXED`: enough evidence exists on both sides to support a confident mixed state;
- `UNVERIFIED`: evidence is insufficient, inaccessible, or too weak for a trustworthy direction call.

Any change to public verdict bands or labels requires a separate product and architecture decision.

## Aggregation Boundary

Aggregation may compose approved stage outputs and structural fields. It may not make semantic text decisions with regex, keyword lists, language-specific rules, text-overlap scores, or hidden adapter fallbacks.

Semantic decisions belong to the relevant LLM-owned stage contract:

- claim meaning: Claim Understanding;
- relevance/applicability/probative value: Evidence Lifecycle;
- EvidenceScope compatibility: Boundary Formation;
- evidence-backed contestation and confidence reasoning: Verdict Adjudication.

## Doubted vs Contested

V2 keeps the evidence-backed contestation rule:

- `contested`: counter-argumentation is backed by documented evidence and may affect truth percentage or confidence;
- `doubted`: unsupported objection, denial, or opinion and must not reduce verdict truth percentage or confidence by itself.

## Source Reliability

Source reliability is an observable source-trust signal in V2. Direct truth-percentage weighting by source reliability is not adopted by default and requires later architecture review, comparator evidence, and tests.

## Explicit Non-Imports From V1

V2 does not carry forward these V1 calculation mechanisms as target design:

- direct source-reliability truth-percentage formulas;
- deterministic semantic special-case guards;
- vague phrase, keyword, or language-specific evidence scoring;
- text-overlap or Jaccard-style semantic grouping;
- adapter-side fallback verdict reinterpretation.

## Cutover Verifiers

Before V2 calculations can be public:

- fixture reports must cover TRUE/FALSE/MIXED/UNVERIFIED and damaged-result states;
- compatibility adapters must expose the same public verdict semantics as `ReportResult`;
- warning severity must match the shared materiality policy;
- comparator review must use approved benchmark inputs and best available historical reports;
- validation spend must happen only after commit, runtime refresh, and explicit approval.
