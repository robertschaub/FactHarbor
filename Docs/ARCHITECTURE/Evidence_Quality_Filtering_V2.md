# Evidence Lifecycle and Quality V2

**Status:** V2 target specification companion
**Canonical reader page:** `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Evidence Lifecycle V2/WebHome.xwiki`

This document summarizes the V2 replacement for the V1 evidence-quality-filter approach. V2 treats evidence quality as a lifecycle responsibility rather than as a late deterministic cleanup pass.

## Lifecycle

The V2 evidence lifecycle is:

1. Build a query plan for selected `AtomicClaim` IDs.
2. Acquire and fetch source candidates through configured providers.
3. Judge relevance and applicability.
4. Extract `EvidenceItem` records with `EvidenceScope`, direction, source reference, `probativeValue`, and `sourceType`.
5. Attach source reliability signals where available.
6. Produce an `EvidenceCorpus`.
7. Run the sufficiency gate: continue, refine, proceed with caveat, or produce a damaged/non-analytical result.

## Quality Boundary

V2 allows deterministic structural checks:

- empty/null validation;
- schema validation;
- source URL/reference presence;
- stable IDs;
- citation ID matching;
- fetch status;
- duplicate source identity;
- budget accounting.

Semantic evidence decisions must be LLM-owned or explicitly approved as configurable semantic policy:

- relevance;
- applicability;
- probative value;
- source meaning;
- claim direction;
- EvidenceScope compatibility;
- evidence strength;
- multilingual semantic equivalence.

## Rejected V1 Carry-Forward

V2 does not adopt:

- vague phrase counts;
- keyword or regex evidence classification;
- Jaccard/text-overlap semantic dedupe;
- language-specific wording rules;
- deterministic category-specific meaning requirements;
- late silent dropping of evidence without a traceable warning or gate state.

## Warning And Scarcity Handling

Evidence scarcity is analytical reality, not automatically a system error.

- Recovered provider issues are silent or admin-only.
- Partial acquisition degradation that materially limits evidence is user-visible.
- Sparse or inaccessible sources may produce a caveat or UNVERIFIED path.
- System failure that prevents trustworthy analysis produces a damaged/non-analytical result.

## Multilingual Requirement

V2 must preserve original-language evidence where useful and must not force translation before analysis unless an approved stage contract requires it. Semantic applicability, extraction, and scope compatibility remain LLM-owned.
