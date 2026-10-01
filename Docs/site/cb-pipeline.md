# ClaimAssessmentBoundary pipeline

FactHarbor analyses verifiable claims against evidence gathered from sources. It keeps the conditions under which evidence applies, groups compatible evidence, and subjects emerging verdicts to structured challenge before reporting an assessment.

![FactHarbor method: claims, research, evidence-defined boundaries and structured debate](diagrams/homepage-method.svg)

[Full-size diagram](diagrams/homepage-method.svg) · [Mermaid source](diagrams/homepage-method.mmd)

## Evidence defines the analytical frame

An **AtomicClaim** is a single verifiable assertion. An **EvidenceItem** is material extracted from a source; extraction does not make it a verified fact. Its **EvidenceScope** records the conditions under which it applies, including methodology and temporal bounds.

A **ClaimAssessmentBoundary** groups compatible EvidenceScopes after research. This matters when apparently conflicting findings were obtained under different conditions: the report should make those differences visible instead of treating every result as interchangeable.

## From input to report

| Stage | Purpose | What remains inspectable |
|---|---|---|
| Understand | Identify verifiable AtomicClaims and check their fidelity to the input | The assertions actually assessed |
| Research | Gather supporting and opposing evidence, assess its relevance and quality, and retain source references | Evidence statements, sources and their scope |
| Group evidence | Identify compatible EvidenceScopes and the boundaries they establish | Why findings are assessed together or separately |
| Form and challenge verdicts | Develop an evidence-backed assessment, test it through challenge and reconciliation, and validate the result | The evidence and reasoning supporting the assessment |
| Aggregate and explain | Combine claim-level results while retaining uncertainty, boundaries and limitations | A structured report rather than an unsupported headline |

## Structured challenge

The **Advocate** develops an evidence-backed assessment. **Self-consistency** checks, when enabled, examine its stability. The **Challenger** looks for counter-evidence, coverage gaps and weaknesses. The **Reconciler** weighs those findings, and the **Validator** checks grounding and alignment between reasoning and the verdict. See the [debate method](verdict-debate.md).

Different providers can be assigned to different roles to reduce dependence on one provider's reasoning. This provides structural separation; it does not establish unbiased or independently correct results.

An objection must have documented evidential support to change an assessment. Opinion or rhetorical disagreement alone must not reduce truth percentage or confidence. Agreement among models is also not a substitute for evidence.

## Quality and uncertainty

Claim validation and confidence assessment are required checkpoints. Evidence quality, source reliability, relevant conditions and agreement across boundaries all matter to interpretation. Truth and confidence answer different questions: how strongly the evidence supports a claim, and how secure that assessment is.

The design also distinguishes factual truth from misleading presentation. Missing context, selective evidence or an implied causal link can matter even when an isolated statement is true. Optional checks depend on the active configuration and should not be assumed to have run in every report.

Sparse or inaccessible evidence, source errors, model mistakes and incomplete retrieval remain limitations. A structured debate and cited report make an assessment easier to examine; they do not guarantee correctness.

## Related reading

-   [Analysis architecture](akel-pipeline.md)
-   [Stage responsibilities](akel-stage-details.md)
-   [Prompt management](prompt-architecture.md)
-   [Public source and contribution guidance](https://github.com/robertschaub/FactHarbor)
