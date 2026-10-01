# Pipeline V2

> **Info**
>
> **Target Architecture Reference** - This space describes the planned V2 replacement for the current AKEL / ClaimAssessmentBoundary pipeline.
>
> These pages describe target architecture, not current implementation state.

## Purpose

Pipeline V2 replaces the current AKEL / ClaimAssessmentBoundary pipeline with a cleaner architecture that keeps FactHarbor's trust safeguards while reducing control-flow complexity, scattered compatibility logic, and duplicate policy decisions.

The governing intent is:

> Replace the current analysis pipeline with a cleaner, maintainable architecture. Start from a reverse-engineered current-state specification, clean and redesign it, then implement directly in small reviewed increments. The UI should remain unchanged unless a concrete product, trust, or compatibility need is approved.

V1 is not the V2 quality target. V2 preserves only explicitly justified concepts, contracts, and safeguards. V1 analysis code is removed after V2 owns the equivalent contract and passes its verifier; historical reports remain readable through adapters and fixtures, not through a live V1 analysis path.

The full architectural narrative lives in [AKEL Pipeline V2](specification/architecture/akel-pipeline-v2/index.md).

## Content

This space collects all V2-specific documentation. Each page describes target architecture only; nothing here is current runtime behavior.

### Architectural Views

| Page | Summary |
|----|----|
| [AKEL Pipeline V2](specification/architecture/akel-pipeline-v2/index.md) | Top-level V2 architecture: stage sequence, key design shifts, input capability roadmap, cost/latency targets, recovery policy, V1 protection rules. |
| [AKEL Pipeline Detail V2](specification/architecture/akel-pipeline-detail-v2/index.md) | Detailed lifecycle: how preparation, draft, and job execution interact behind a unified Analysis Session UI. |
| [Data Model V2](specification/architecture/data-model-v2/index.md) | Target V2 contract model: `PipelineRunContext`, `ClaimContract`, `EvidenceCorpus`, `BoundarySet`, `VerdictSet`, `ReportResult`. |
| [Quality and Trust V2](specification/architecture/quality-and-trust-v2/index.md) | Centralized trust architecture: one claim-integrity gate, one sufficiency gate, one verdict gate, shared warning policy. |

### Deep Dives

| Page | Summary |
|----|----|
| [Pipeline Variants V2](specification/architecture/deep-dive/pipeline-variants-v2/index.md) | Temporary dual-variant posture for the V1-to-V2 cutover and the cleanup conditions that follow. |
| [Quality Gates V2](specification/architecture/deep-dive/quality-gates-v2/index.md) | Gate 1 (claim contract integrity), Sufficiency Gate, Gate 4 (verdict), and their typed outputs. |
| [Evidence Lifecycle V2](specification/architecture/deep-dive/evidence-lifecycle-v2/index.md) | Evidence as a lifecycle: query planning, acquisition, multilingual extraction, scope-aware corpus building. |
| [Verdict Debate Pattern V2](specification/architecture/deep-dive/verdict-debate-pattern-v2/index.md) | Structured adjudication - Advocate, Challenger, Reconciler, validation, confidence gating - never collapsed into a one-shot prompt. |
| [Calculations and Verdicts V2](specification/architecture/deep-dive/calculations-and-verdicts-v2/index.md) | One canonical verdict authority in `ReportResult`; 7-point verdict scale and the MIXED/UNVERIFIED distinction preserved. |
| [Prompt Architecture V2](specification/architecture/deep-dive/prompt-architecture-v2/index.md) | Prompt, model, config, and cache governance; required attributes for every V2 analysis prompt section. |
| [Source Reliability V2](specification/architecture/deep-dive/source-reliability-v2/index.md) | Integration boundary for source reliability; no hidden coupling between reliability scores and public truth percentages. |

### Diagrams

| Page | Summary |
|----|----|
| [V2 Pipeline Overview](diagrams/v2-pipeline-overview/index.md) | High-level diagram: input through run context, stages, and `ReportResult`. |
| [V2 Pipeline Detail](diagrams/v2-pipeline-detail/index.md) | Detailed flowchart of entry, run state, stage transitions, and adapters. |
| [V2 Request Lifecycle](diagrams/v2-request-lifecycle/index.md) | Sequence diagram of a controlled V2 replacement path from User/UI through services. |
| [V2 Analysis Session UX](diagrams/v2-analysis-session-ux/index.md) | Product flow for focus preparation, mode selection, analysis execution, and report provenance. |
| [V2 Entity Model ERD](diagrams/v2-entity-model-erd/index.md) | ER diagram of V2 contract entities and their relationships. |
| [V2 Quality Gates Flow](diagrams/v2-quality-gates-flow/index.md) | Trust flow: Gate 1, sufficiency, Gate 4, report integrity, shared warning materiality. |
| [V2 Verdict Debate Pattern](diagrams/v2-verdict-debate-pattern/index.md) | Diagram of structured verdict adjudication and gateway routing. |
| [V2 Prompt Architecture](diagrams/v2-prompt-architecture/index.md) | UCM prompt profiles, sections, variables, output schemas, and cache governance. |
| [V2 Report Regression Control](diagrams/v2-report-regression-control/index.md) | Promotion and rollback loop for V2 report-generation changes via versioned candidate profiles. |

------------------------------------------------------------------------

**Navigation:** [Product Development](../index.md) \| [Current Architecture](../specification/architecture/index.md)
