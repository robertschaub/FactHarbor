# Terminology reference

Use these terms consistently in documentation, code and prompts. The current TypeScript contracts in [types.ts](https://github.com/robertschaub/FactHarbor/blob/main/apps/web/src/lib/analyzer/types.ts) define exact fields and optionality.

## Core concepts

| Term | Meaning | Common representation |
|---|---|---|
| **AtomicClaim** | A single verifiable assertion extracted from user input | `AtomicClaim`, `atomicClaims` |
| **EvidenceItem** | Information extracted from a source; it is not automatically a verified fact | `EvidenceItem`, `evidenceItems`, `statement` |
| **EvidenceScope** | Per-evidence metadata describing the source's methodology, time, geography or other relevant limits | `EvidenceScope`, `evidenceScope` |
| **ClaimAssessmentBoundary** | Evidence-emergent grouping of compatible EvidenceScopes, formed after research | `ClaimAssessmentBoundary`, `claimBoundaries`, `claimBoundaryId` |
| **BoundaryFinding** | A claim's assessment using evidence within one boundary | `BoundaryFinding`, `boundaryFindings` |
| **Claim verdict** | Assessment of an AtomicClaim, including evidence references and uncertainty | `CBClaimVerdict`, `claimVerdicts` |
| **CoverageMatrix** | Which claims have evidence in which boundaries, including recorded gaps | `CoverageMatrix`, `coverageMatrix` |
| **VerdictNarrative** | Explanation of the overall assessment, evidence, disagreements and limitations | `VerdictNarrative`, `verdictNarrative` |
| **Background** | Narrative background from the input; it does not create a separate analytical boundary | `backgroundDetails` |

An EvidenceScope describes the conditions of an individual source's evidence. A ClaimAssessmentBoundary groups compatible evidence for assessment. Neither means an arbitrary topic, rhetorical viewpoint or predefined “context.” Missing source metadata must not be invented.

## Evidence and verdict interpretation

**Probative value** (`probativeValue`) describes evidence quality for assessment. **SourceType** classifies the kind of source. Source reputation, evidence relevance and factual support are related but distinct judgments.

**Truth percentage** and **confidence** are different result fields. The [seven-band scale](../../../diagrams/verdict-scale/index.md) expresses the truth assessment; confidence expresses support for that assessment. **MIXED** and **UNVERIFIED** must remain distinguishable. A retained verdict may carry `publishable: false`; clients must respect its qualification instead of treating the number alone as a publishable conclusion.

**Contested** means relevant documented counter-evidence exists. **Doubted** means an objection lacks that evidential basis. Unsupported objections, political disagreement and opinion alone must not reduce truth or confidence.

## Contributor naming rules

- Use `atomicClaim`/`atomicClaims` for assertions, and `claimBoundary`/`claimBoundaries`/`claimBoundaryId` for boundaries.
- Call extracted material evidence or statements, not verified facts.
- Qualify “scope” as EvidenceScope; use the full ClaimAssessmentBoundary name when explaining the analytical frame.
- Keep evidence references, claim IDs and boundary IDs consistent with the current public schemas. Do not introduce names from removed pipelines into new code.
- Semantic classification remains LLM-owned and multilingual; structural validation remains deterministic.

See [stage responsibilities](../../../../akel-stage-details.md), [prompt management](../../../../prompt-architecture.md) and [agent instructions](https://github.com/robertschaub/FactHarbor/blob/main/AGENTS.md) for the operative rules.
