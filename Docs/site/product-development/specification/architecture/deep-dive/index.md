# Deep Dive Index

This section contains detailed implementation references for developers and testers. Each page provides code-level detail, configuration options, and testing guidance.

> **Info**
>
> **New to FactHarbor?** Start with the [Architecture Overview](../index.md) and the Level 2 Architectural Views before diving into these references.

## By Topic

### Pipeline Implementation

| Page | Description | Key Files |
|----|----|----|
| [Pipeline Variants](pipeline-variants/index.md) | Twin-path architecture (ClaimAssessmentBoundary + Monolithic Dynamic): invariants, shared primitives, result model, variant selection, configuration | `claimboundary-pipeline.ts`, `verdict-stage.ts`, `monolithic-dynamic.ts` |
| [Verdict Debate Pattern](../../../../verdict-debate.md) | Structured 5-step adversarial debate pattern: roles (Advocate, Challenger, Reconciler), model tiers, research rationale, and quality guards | `verdict-stage.ts`, `claimboundary.prompt.md` |

### Quality and Evidence

| Page | Description | Key Files |
|----|----|----|
| [Quality Gates](quality-gates/index.md) | Gate 1 (claim validation) and Gate 4 (confidence assessment) — criteria, examples, configuration | `quality-gates.ts` |
| [Evidence Quality Filtering](evidence-quality-filtering/index.md) | 7-layer defence strategy, filter rules, category-specific requirements, troubleshooting | `evidence-filter.ts`, `provenance-validation.ts` |
| [Context Detection](context-detection/index.md) | ClaimAssessmentBoundary clustering methodology, multi-boundary scenarios | `claimboundary-pipeline.ts` (Stage 3) |
| [Direction Semantics](direction-semantics/index.md) | Multi-layer direction semantics, scope mismatch problem, LLM-code alignment, counter-claim handling | `verdict-stage.ts`, `types.ts` |

### Calculations and Scoring

| Page | Description | Key Files |
|----|----|----|
| [Calculations and Verdicts](calculations-and-verdicts/index.md) | 7-point verdict scale, aggregation hierarchy, weighting formulas, counter-evidence handling | `aggregation.ts`, `truth-scale.ts` |
| [Confidence Calibration](confidence-calibration/index.md) | 4-layer calibration system, graduated recency penalty, low-source penalty, configuration | `confidence-calibration.ts` |
| [Source Reliability](source-reliability/index.md) | LLM-based evaluation, 7-band credibility scale, multi-language support, caching, admin guide | `source-reliability.ts` |

### Infrastructure

| Page | Description | Key Files |
|----|----|----|
| [Prompt Architecture](../../../../prompt-architecture.md) | Modular prompt composition, provider-specific variants, token optimisation | `prompts/` |
| [Storage Technology](storage-technology/index.md) | Caching value analysis, Redis/PostgreSQL/Vector DB assessments, cost modelling | `config-storage.ts`, `source-reliability-cache.ts` |
| [Schema Migration](schema-migration/index.md) | Database schema evolution patterns | `Data/` |

## By Role

### Pipeline Developer

Start with: [Pipeline Variants](pipeline-variants/index.md) → [Verdict Debate Pattern](../../../../verdict-debate.md) → [Calculations and Verdicts](calculations-and-verdicts/index.md) → [Quality Gates](quality-gates/index.md)

### Prompt Engineer

Start with: [Prompt Architecture](../../../../prompt-architecture.md) → [Verdict Debate Pattern](../../../../verdict-debate.md) → [Evidence Quality Filtering](evidence-quality-filtering/index.md) → [Confidence Calibration](confidence-calibration/index.md)

### QA / Tester

Start with: [Quality Gates](quality-gates/index.md) → [Context Detection](context-detection/index.md) → [Evidence Quality Filtering](evidence-quality-filtering/index.md)

### Source Reliability Specialist

Start with: [Source Reliability](source-reliability/index.md) (5 sub-pages covering overview, architecture, configuration, refinement, and admin)

------------------------------------------------------------------------

**Navigation:** [Architecture](../index.md)
