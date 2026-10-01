# AKEL Pipeline Detail V2

> **Info**
>
> **Target Technical Reference** - Detailed V2 stage flow, run lifecycle, and ownership boundaries.
>
> This page describes target architecture, not current implementation state.

## Detailed Pipeline Flow

# V2 Pipeline Detail

> **Info**
>
> Detailed target flow for the V2 rebuild. This diagram describes target architecture, not current implementation state.

![V2 Pipeline Detail diagram 1](../../../../../diagrams/diagram-338efd5c00682d17.svg)

[Full-size diagram](../../../../../diagrams/diagram-338efd5c00682d17.svg) · [Mermaid source](../../../../../diagrams/diagram-338efd5c00682d17.mmd)

## Request Lifecycle

# V2 Request Lifecycle

> **Info**
>
> Target request lifecycle for a controlled V2 replacement path. This diagram describes target architecture, not current implementation state.

![V2 Request Lifecycle diagram 1](../../../../../diagrams/diagram-331f96210376b11a.svg)

[Full-size diagram](../../../../../diagrams/diagram-331f96210376b11a.svg) · [Mermaid source](../../../../../diagrams/diagram-331f96210376b11a.mmd)

## Analysis Session Product Lifecycle

# V2 Analysis Session UX

> **Info**
>
> Target product flow for V2 focus preparation, mode selection, analysis execution, and report provenance. This diagram describes target architecture, not current implementation or active process.

![V2 Analysis Session UX diagram 1](../../../../../diagrams/diagram-3ddb036828914470.svg)

[Full-size diagram](../../../../../diagrams/diagram-3ddb036828914470.svg) · [Mermaid source](../../../../../diagrams/diagram-3ddb036828914470.mmd)

## Mode Summary

| Mode | Target user | Default | Product behavior |
|----|----|----|----|
| Unattended | Normal users | Yes | Selects a small recommended analysis focus and continues automatically when safe. |
| Attended | Advanced users | No | Pauses for focus confirmation and allows a broader configured focus. |
| Deep review | Admin/internal/expert | No | Uses an explicit per-run cap and review policy. |

The mode selector remains visible before each submission for now. The server, not the browser, is authoritative for allowed modes, caps, and forced-review conditions.

------------------------------------------------------------------------

**Navigation:** [Diagrams](../../../../diagrams/index.md)

The product lifecycle is intentionally smoother than the persistence lifecycle. V2 may use existing draft/preparation endpoints and existing job execution endpoints behind a unified UI shell. A later formal `AnalysisSession` API facade may normalize UI state, but it must internally map to preparation/draft and execution/job records rather than merging them.

Do not create a persisted `JobEntity` before selected focus is finalized just to simplify UI state. Jobs represent executable analysis requests. Focus preparation represents pre-job negotiation and cacheable understanding work.

## Stage Contracts

| Stage | Inputs | Semantic LLM tasks | Structural tasks | Outputs |
|----|----|----|----|----|
| **Claim Understanding + Gate 1** | `PipelineRunContext`, raw input, optional `InputGroundingSeed`, optional ACS prepared snapshot | Claim extraction, contract validation, repair, salience/atomicity judgment | ID generation, schema validation, selected-ID matching, ACS migration, ledger events | `ClaimContract`, Gate 1 status |
| **Evidence Lifecycle** | `PipelineRunContext`, `ClaimContract`, optional seeded sources | Query planning, relevance, applicability, extraction, quality judgments | Provider calls, fetch retry, dedupe by structural source identity, budget accounting, trace events | `EvidenceCorpus` |
| **Sufficiency Gate** | `EvidenceCorpus`, `ClaimContract`, config snapshot | Evidence adequacy judgment where semantic | Gate status construction, warning/event projection | `SufficiencyAssessment` |
| **Boundary Formation** | `EvidenceCorpus`, `ClaimContract`, `SufficiencyAssessment` | EvidenceScope normalization/equivalence, boundary clustering, low-coherence rationale | Boundary IDs, coverage matrix, evidence assignment by stable IDs | `BoundarySet` |
| **Verdict Adjudication + Gate 4** | `ClaimContract`, `EvidenceCorpus`, `BoundarySet`, prompt/model policy | Advocate, challenger, reconciliation, grounding, direction, confidence reasoning | Citation ID validation, parse/citation checks, repair ledger, Gate 4 status | `VerdictSet` |
| **Aggregation + Result Writer** | `ClaimContract`, `EvidenceCorpus`, `BoundarySet`, `VerdictSet` | Article adjudication where configured, narrative generation, semantic explanation checks | Aggregation math, quality gate object, warning projection, schema serialization | `ReportResult` |
| **External Adapters** | `ReportResult` plus legacy fixtures when needed | None | API/UI/export/validation projection, legacy read fallback | `CompatibilityView` |

## Shared Gateways

### Prompt / Model / LLM Gateway

The gateway owns prompt section rendering, required variable validation, model task routing, provider retry/fallback, and structured output parsing. Stages request semantic tasks; they do not implement independent provider retry, credential fallback, parse recovery, or model routing.

The gateway is also the V2 cost/latency governor. Every prompt-backed task declares max calls, token budget, timeout, retry/fallback policy, cache policy, and escalation policy. Stronger models, extra retrieval, fuller debate, or repair loops run only when a V2-owned quality signal justifies the extra spend.

V2 uses prevention-first recovery. The gateway validates prompt variables, schema version, token budget, selected IDs, evidence IDs, and source IDs before calls. Provider/network retry and structured-output retry are bounded structural recovery. Meaning-changing correction is allowed only as explicit, LLM-owned, typed, ledgered recovery; hidden semantic repair and answer fishing are forbidden.

### Warning and Event Policy

All warning visibility uses one materiality policy for UI, API summaries, markdown, HTML export, metrics, and validation:

> Would the verdict be materially different if this event had not occurred?

Routine recovered operations are silent or admin-only. System failures, analytical scarcity, and internal diagnostics are surfaced according to verdict impact, not raw event severity.

### Cache Governance

Analysis-affecting cache keys include every value that can change the semantic answer: prompt section and content hash, model task, provider, model, temperature profile, output schema version, config snapshot hash, result schema version, evidence/source identity when applicable, language/search context, current-date bucket, and adapter version when cached output feeds public projection.

## Parser Worker And Input Types

V2 separates input capability from analytical pipeline readiness.

Direct text does not require a parser worker and is the first production target.

Web page support requires a parser-worker seam before parsed source text can enter Evidence Lifecycle. The first web parser package may target only passive text/HTML behavior: no script execution, no subresource loading, no link following, no browser rendering, and no active content execution.

PDF support is a separate high-risk path. It requires stronger isolation and a dedicated PDF parser package. PDF parsing must not be treated as a side effect of simple web-page support.

The provisional parser profile `P0_PROVISIONAL_LOCAL_INERT` is for fixture/control or synthetic inert local/test work only. It is not a security boundary, cannot consume 2C-A transport-owned packets, and cannot support production or staging traffic.

## Report Generation Regression Control

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

Stage 5 report-generation changes are promoted through versioned profiles, not ad hoc edits. Every public report records report-generation profile id/version, report writer version, prompt section/hash where applicable, model task version, config snapshot hash, source commit, renderer/export adapter version, and stored evidence/replay packet id/hash when used.

Candidate changes should replay from stored canonical packets when upstream contracts are unchanged. If the change alters claim understanding, evidence lifecycle, boundary formation, verdict adjudication, or warning materiality, stored replay is insufficient and full pipeline validation is required at the approved gate.

The previous approved report-generation profile is the normal rollback target. A candidate with unresolved report-quality regression must not become the default.

## Simplifications From V1

| V1 complexity | V2 simplification |
|----|----|
| Stage code owns too much retry, warning, prompt, and compatibility behavior | Move those policies into shared gateways and adapters. |
| Claim extraction contains multiple special repairs and refresh paths | Consolidate under one `ClaimIntegrityPolicy` and `ClaimContract`. |
| Research continuation is hidden inside loop logic | Make sufficiency a named gate with explicit continuation, caveat, or damage outcomes. |
| Boundary grouping can depend on deterministic semantic shortcuts | Use LLM-owned semantic equivalence or structural-only checks; no keyword or text-overlap meaning decisions. |
| Verdict confidence and warning decisions appear in multiple layers | Use one verdict confidence contract and one warning materiality authority. |
| UI/API/export readers can infer fallback meanings independently | Use `ReportResult` as the authority and adapters as thin projections. |
| Preparation, selection, and execution appear as separate user journeys | Present one Analysis Session while preserving internal draft/job separation. |

## Implementation Boundary

| Boundary item | V2 target |
|----|----|
| V2 code root | `apps/web/src/lib/analyzer-v2/` |
| Public TypeScript entrypoint | `runClaimBoundaryPipelineV2(context)` |
| Pre-cutover schema | `4.0.0-cb-precutover` |
| Public cutover schema | `4.0.0-cb` |
| V1 compatibility schema | `3.2.0-cb` remains readable |
| Default runtime | V1 ClaimAssessmentBoundary until a current cutover decision |
| Cutover prerequisite | Contract, adapter, quality, verification, and validation checks passed |
| Final redesign state | V1 analysis pipeline implementation removed; historical V1 reports remain readable through adapters/fixtures |
| Old behavior investigation | Use old commits/worktrees, not retained V1 code in the forward architecture |
| Product session model | unified Analysis Session shell over preparation/job endpoints first; formal `AnalysisSession` facade only if needed |

## Clean-Room Boundary

V2 internals are built from V2 contracts, not copied V1 code or types. V2 modules must not import or clone V1 analyzer modules, V1 prompt files, V1 prompt profiles, or V1 pipeline-owned TypeScript contracts.

The current runner/job shape may be translated into V2 input only at a named ingress adapter. That adapter is structural and one-way: current job/request data -\> V2-owned DTO. It does not make V1 analysis types part of V2.

## Final Naming Policy

V2 should not end with awkward names only because V1 still occupies the current runtime namespace. During rebuild, disambiguation belongs at the package and gate boundary: `apps/web/src/lib/analyzer-v2/`, the pre-cutover schema, and the pre-cutover runner gate.

Inside that boundary, V2 contracts should use clean domain names such as `PipelineRunContext`, `ReportResult`, `ClaimContract`, `EvidenceCorpus`, `BoundarySet`, and `VerdictSet`. Obsolete rebuild labels are not final architecture names.

After V2 cutover stabilizes and V1 analysis code is deleted, a naming-normalization cleanup renames the surviving package, entrypoints, schemas, and docs to final names and checks for leftover temporary rebuild labels in runtime code. Shared services that are not V1-pipeline-owned, such as Source Reliability, keep their existing meaningful service names.

------------------------------------------------------------------------

**Navigation:** [AKEL Pipeline V2](../akel-pipeline-v2/index.md) \| [Current AKEL Pipeline Detail](../../../../../akel-stage-details.md)
