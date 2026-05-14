# Pipeline Rebuild Target Specification Draft

**Date:** 2026-05-12
**Workspace:** `C:\DEV\FactHarbor`
**Git branch:** `main`
**Status:** Deputy-approved target architecture; implementation stable through Slice 6B.3c-4B; real provider factory wiring remains blocked pending separate review
**Owner role:** Lead Architect

---

## 1. Purpose

This document defines the target architecture for replacing the current ClaimAssessmentBoundary pipeline with a cleaner, more maintainable pipeline.

The goal is replacement, not additive refactoring. The new pipeline should be built as an isolated V2 path, then verified and cut over only after the specification and validation gates approve it. The current hot path must remain runnable until V2 passes the approved structural, compatibility, warning/report, quality, cost, and performance gates.

The final redesigned state must not retain the V1 pipeline implementation as an alternate analysis path. V1 may remain temporarily as frozen runtime/fallback support before cutover, but after V2 cutover and stabilization the V1 pipeline code must be removed in audited cleanup slices. Historical report readability remains supported through adapters/fixtures, not by keeping the V1 analysis pipeline alive. Investigation of old V1 behavior uses Git history and old-commit worktrees, not retained forward-code paths.

Captain quality rationale: V1 is not the quality target for V2. The current pipeline is judged insufficiently stable and below the desired report-quality bar, with no acceptable progress since the last deployment and little meaningful progress after the early ClaimAssessmentBoundary creation period. V2 therefore preserves only explicitly justified concepts, contracts, and safeguards; it must not preserve V1 code, prompts, or mechanisms merely because they are current.

This draft intentionally does not edit source code, prompts, config, UI, or tests. It is the review package that should be challenged by Lead Architect, LLM Expert, Senior Developer, Code Reviewer, and Gemini/Challenger roles before implementation starts.

---

## 1.1 Implementation Progress Addendum - 2026-05-13

Implementation continues in `C:\DEV\FactHarbor` on Git branch `main` after deputy approval of this target architecture. Current committed state:

| Slice | Status | Commit | Notes |
|---|---|---|---|
| Target specification | done | `869b8861` | Deputy-approved architecture baseline |
| Slice 1: contract fixtures | done | `80deeb6f` | V2/V1 result, warning, ACS, and legacy fixtures plus schema tests |
| Slice 2A-2H: compatibility readers/adapters | done | slice commits through `041c0bd5` | Public/read surfaces can consume V2 fixtures while V1 runtime remains default |
| Slice 3: disabled V2 shell | done | `ce42e058` | V2 entry exists but is double-gated and disabled by default |
| Slice 4: damaged V2 envelope | done | `a654f125` | V2 shell returns schema-valid damaged/non-analytical result |
| Slice 5: gateway governance skeleton | done | `aa07554f` | Prompt/model/cache governance is static and non-executable |
| Slice 6A: Claim Understanding contracts | done | `617f8540` | V2 ClaimContract schema/fixture and pure ACS prepared-snapshot migration adapter |
| Slice 6A.5: pre-6B contract/wiring hardening | done | `724dd9aa` | Full ACS snapshot ingress, shell-placeholder isolation, cache-policy alignment, and 6B schema alignment tests completed without prompt/model execution |
| Slice 6B.0: Claim Understanding prompt/model review package | modify | `Docs/WIP/2026-05-14_V2_Slice_6B_Prompt_Model_Review_Package.md` | Deputy reviews required 6B.1a result-envelope contract and 6B.1b UCM/profile/model-policy plumbing before prompt text or execution |
| Slice 6B.1a: Claim Understanding result envelope | done | `24f55d4a` | Non-executable `ClaimUnderstandingResult` envelope added; accepted outputs carry `ClaimContract`, blocked/damaged outputs carry typed reasons without fabricating a contract |
| Slice 6B.1b: UCM/profile/model-policy plumbing | done | `2f1b60a4` | `claimboundary-v2` profile/frontmatter support, V1/V2 profile separation, and blocked task model-policy metadata added without prompt text, file seeding, or execution |
| Slice 6B.2: prompt draft + contract tests | done | `8a1ef8cd` | Clean-room non-executable `claimboundary-v2.prompt.md` with `V2_CLAIM_UNDERSTANDING_GATE1`, render/static-hygiene/schema/contract tests, and final Claude Opus LLM Expert approval; no file seeding, approval flips, runtime LLM call, UI/API change, live job, or V1 reuse |
| Slice 6B.3a: Claim Understanding foundation | done | `2d14c89a` | Explicit V2 prompt loader, production runtime schemas, cache/provenance no-dispatch/no-store decisions, policy eligibility guard, and tests completed. No file seeding, approval flips, runtime model call, orchestrator wiring, API/UI/report change, live jobs, or V1 analyzer imports |
| Slice 6B.3b: model adapter contract | done | `04742922` | V2-owned local adapter under `apps/web/src/lib/analyzer-v2/`, dependency-injected mock dispatch, production schema validation, policy fail-closed behavior, identical structural retry, typed telemetry/provenance, no cache IO, no provider SDK callsite, no product-path imports, and no neutral/shared adapter. |
| Slice 6B.3c-0: structural no-dispatch orchestration | done | `3223d99f` | Internal-only Claim Understanding runtime stage, ACS migration only with canonical V2 hashes, direct input blocked by shipped gateway policy, raw shell-placeholder rejection, no prompt/cache/provider/model dispatch, and public leak guards. |
| Slice 6B.3c-1: dispatch-frame contract | done | `8a663d3f` | Pure internal frame builder for direct-text exact pass-through, direct-URL fail-closed handling, ACS resolved-text/hash requirements, and static guards against prompt/model/cache/provider/V1 imports. |
| Slice 6B.3c-4A: internal runtime scaffold | done | `1b0ff9c2` / `531a0ff6` | Captain-approved direct-text scaffold plus guard hardening. Execution remains internal/controlled, requires explicit injected provider callback, keeps public V2 output damaged, and does not approve real provider factory ownership, cache IO, public exposure, live jobs, ACS/direct URL execution, or V1 cleanup. |
| Slice 6B.3c-4B: provider-boundary ownership contract | done | this commit | Inert `analyzer-v2-runtime` ownership contract and guards only. It defines the future provider factory review shape without creating callbacks, importing provider SDKs, wiring product callers, flipping approvals, exposing public results, or running live jobs. |

No live jobs have been used for these slices. Current Captain allowance: up to 4 live jobs without explicit confirmation when a committed/refreshed runtime slice makes them meaningful.

```mermaid
flowchart LR
  S0["Spec approved"]
  S1["Contracts and fixtures"]
  S2["Compatibility readers and adapters"]
  S3["Disabled V2 shell"]
  S4["Damaged V2 envelope"]
  S5["Gateway governance"]
  S6A["Claim Understanding contracts"]
  S6A5["Pre-6B contract/wiring hardening"]
  S6B0["6B review package"]
  S6B1A["6B.1a result envelope"]
  S6B1B["6B.1b UCM/profile plumbing"]
  S6B2["6B.2 prompt draft + tests"]
  S6B3A["6B.3a foundation"]
  S6B3B["6B.3b mock adapter"]
  S6B3C0["6B.3c-0 no-dispatch runtime"]
  S6B3C1["6B.3c-1 dispatch frame"]
  S6B3C4A["6B.3c-4A internal scaffold"]
  S6B3C4B["6B.3c-4B provider ownership contract"]
  S6B["Claim Understanding prompt/model execution"]
  S7["Evidence lifecycle"]
  S8["Boundary formation"]
  S9["Verdict and Gate 4"]
  S10["Aggregation and result writer"]
  S11["Pre-cutover verification"]
  S12["Live validation gate"]
  S13["Cutover"]
  S14["V1 cleanup"]

  S0 --> S1 --> S2 --> S3 --> S4 --> S5 --> S6A
  S6A --> S6A5 --> S6B0 --> S6B1A --> S6B1B
  S6B1B -->|"Captain prompt approval recorded"| S6B2
  S6B2 --> S6B3A --> S6B3B --> S6B3C0 --> S6B3C1 --> S6B3C4A --> S6B3C4B
  S6B3C4B -->|"later provider wiring approval required"| S6B
  S6B --> S7 --> S8 --> S9 --> S10 --> S11 --> S12 --> S13 --> S14

  classDef done fill:#dff5e3,stroke:#2f7d32,color:#102a12
  classDef blocked fill:#fff0cc,stroke:#9a6700,color:#3a2600
  classDef future fill:#eef2ff,stroke:#4f5fa8,color:#151a3a
  class S0,S1,S2,S3,S4,S5,S6A,S6A5,S6B0,S6B1A,S6B1B,S6B2,S6B3A,S6B3B,S6B3C0,S6B3C1,S6B3C4A,S6B3C4B done
  class S6B blocked
  class S7,S8,S9,S10,S11,S12,S13,S14 future
```

Current architectural boundary:

```mermaid
flowchart TB
  subgraph "V1 Runtime - still default"
    V1["claimboundary-pipeline.ts"]
    API["API / UI / reports / validation readers"]
  end

  subgraph "Compatibility Layer - implemented"
    CV["V2 compatibility view"]
    RR["legacy runner result readers"]
    FX["V1/V2 fixtures and schemas"]
  end

  subgraph "V2 Pre-Cutover Path - implemented but non-analytical"
    ENTRY["runClaimBoundaryPipelineV2"]
    ENV["damaged 4.0.0-cb-precutover envelope"]
    GW["gateway policies blocked until approval"]
    CU["ClaimContract + ACS migration"]
    DF["dispatch frame contract"]
  end

  subgraph "Not Yet Implemented"
    LLM["V2 prompt-backed claim understanding"]
    EV["evidence lifecycle"]
    CAB["boundary formation"]
    VER["verdict adjudication and Gate 4"]
    AGG["aggregation and canonical writer"]
  end

  API --> CV
  CV --> FX
  RR --> FX
  ENTRY --> ENV
  GW --> CU
  CU --> DF
  CU -. "contracts only" .-> LLM
  LLM --> EV --> CAB --> VER --> AGG
  V1 --> API

  classDef live fill:#e8f4ff,stroke:#2463a7,color:#08233d
  classDef adapter fill:#edf7ed,stroke:#3d8b40,color:#102a12
  classDef offline fill:#fff4d6,stroke:#9a6700,color:#3a2600
  classDef future fill:#f1f1f1,stroke:#777,color:#222
  class V1,API live
  class CV,RR,FX adapter
  class ENTRY,ENV,GW,CU offline
  class LLM,EV,CAB,VER,AGG future
```

Slice 6B.3b is complete at `04742922`. Slice 6B.0 prepared the prompt/model review package and UCM prerequisites; deputy review returned `MODIFY`; the pre-prompt blockers were closed by the `ClaimUnderstandingResult` envelope plus minimal UCM/profile/model-policy plumbing; the Captain-approved prompt-text slice added only a clean-room V2 prompt source plus contract/static-hygiene tests; 6B.3a added structural foundation code; and 6B.3b added only the V2-owned local adapter contract with dependency-injected mock dispatch, production schema validation, policy fail-closed behavior, identical structural retry, typed telemetry/provenance, no cache IO, no provider SDK callsite, no product-path imports, and no neutral/shared adapter. V2 still remains non-executable for real analysis: `claimboundary-v2` is not file-seeded, prompt/model/cache approvals are not flipped, and no runtime LLM call or live job was added. Runtime dispatch and orchestration remain unapproved.

6B.3c expert debate returned `MODIFY`: do not implement full runtime-dispatch/orchestrator wiring as originally written. The next boundary is 6B.3c-0 structural Claim Understanding orchestration only: internal runtime state, ACS migration at the V2 edge, direct-input gateway blocking before prompt/cache/provider work, shell-placeholder raw-ID failure before normalization can hide it, no model-adapter import from product execution paths, no prompt rendering, no provider callback, no cache IO, no public/API/UI/report field, no approval/status mutation, and no live jobs.

Follow-up 6B.3c-0 acceptance debate also returned `MODIFY`: source work could start only under `Docs/WIP/2026-05-14_V2_Slice_6B3_Revised_Implementation_Plan.md` Section 7.1.1. That addendum named the exact file/test envelope: raw runner placeholder detection, no `resolvedInputSha256` reuse as ACS snapshot hash, V2-owned no-dispatch Claim Understanding stage/runtime state, internal-only orchestrator state, recursive public-result leak guard, import-time side-effect guard, no product-path model-adapter import, and no prompt/cache/provider side effects. Slice 6B.3c-0 is now complete at `3223d99f`.

Deputy review of the dispatch integration package returned `MODIFY`: only a narrower 6B.3c-1 dispatch-frame contract was approved before product runtime dispatch. Slice 6B.3c-1 is complete at `8a663d3f`: it added a pure internal frame builder, direct-text exact pass-through, unresolved direct-URL fail-closed handling, ACS resolved-text/hash requirements, and static guards against prompt/model/cache/provider/V1 imports. Product runtime dispatch remains blocked. The active follow-up gate package is `Docs/WIP/2026-05-14_V2_Slice_6B3c_Product_Runtime_Dispatch_Review_Package.md`; first review returned `MODIFY`, and the revised package approves no source code while asking reviewers to resolve executable approval source, provider boundary, prompt/config/cache hash construction, cache posture, URL-resolution prerequisite, and product-path model-adapter import guard.

Subsequent 6B.3c-4 work remains pre-cutover and non-public. 6B.3c-4A added only the Captain-approved internal direct-text scaffold with injected provider callbacks and then hardened it so production callers cannot reference scaffold option keys outside the approved owner files. 6B.3c-4B adds only an inert provider-boundary ownership contract under `apps/web/src/lib/analyzer-v2-runtime/` plus guards. Real product-owned provider factory wiring, AI SDK imports, approval flips, public result exposure, cache IO, ACS/direct URL execution, live jobs, and V1 cleanup remain blocked until a later reviewed source-wiring gate.

### 1.1.1 Final Implementation Readiness Review - 2026-05-14

Final readiness review verdict: **approve with required changes**. Do not redo or quarantine Slices 1-6A; keep the current foundation. The required inserted Slice 6A.5 is now complete, and prompt/model execution remains blocked until the Slice 6B approval gate.

Review inputs:

- Gemini adversarial architecture review: approve continuing implementation; no blocker before non-prompt implementation work; Slice 6B remains blocked by Captain approval and LLM Expert review.
- Claude Opus bounded senior-architect/LLM review: approve with required changes; no broader redesign; required narrow 6A.5 hardening before Slice 6B.
- Deputy architecture reviewer: KEEP Slices 1-6A; ensure the shell-only fallback claim id cannot reach real prompt-backed claim understanding.
- Deputy implementation reviewer: KEEP Slices 1-6A; require ACS ingress, cache-policy, and schema-alignment prep before Slice 6B.
- Local verification: `npm -w apps/web run test -- test/unit/lib/analyzer-v2` passed 10 files / 48 tests; no live jobs were run.

Slice 6A.5 scope completed by `724dd9aa`:

1. Carry the full ACS prepared snapshot through V2 ingress when available, not only `resolvedInputText`, so the existing migration can consume selected claim statements and integrity fields.
2. Add fail-closed isolation so shell-only placeholder claim ids such as `AC_V2_SHELL_01` cannot enter real prompt-backed Claim Understanding.
3. Align claim-understanding cache policy for ACS-backed and direct-input runs, including key requirements and tests for both paths.
4. Define and test the 6B schema relationship: either the prompt task output schema is the `ClaimContract` schema, or `v2.claim_understanding_gate1.0` is an explicit intermediate prompt-output schema that maps into `v2.claim_contract.0`. No prompt text or model execution starts until this is documented and verified.

Implementation verification after Slice 6A.5:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` passed 12 files / 53 tests.
- `npm -w apps/web run test -- test/unit/lib/internal-runner-v2-routing.test.ts` passed 1 file / 4 tests.
- `npm -w apps/web run build` passed, including postbuild prompt/config reseed check with 0 changes.
- Clean-room scan found no V1 analyzer imports, V1 prompt reuse, or prompt/model execution in Analyzer V2 code or focused tests.
- `git diff --check` passed before commit.

Implementation verification after Slice 6B.1a:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` passed 12 files / 58 tests.
- Focused Claim Understanding/gateway tests, boundary guard, and web build passed before commit.
- Clean-room scan again found no V1 analyzer imports, V1 prompt reuse, or prompt/model execution in Analyzer V2 code or focused tests.
- `git diff --check` passed before commit.

Implementation verification after Slice 6B.2:

- Focused 6B.2 verifier passed 7 files / 145 tests covering the prompt contract, Claim Understanding envelope, prompt-surface registry, config storage, config schemas, gateway policy, and boundary guard.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` passed 13 files / 70 tests.
- `npm -w apps/web run build` passed; postbuild reseeded only the existing prompt profiles, confirming `claimboundary-v2` remained not file-seeded.
- `npm test` passed.
- `git diff --check` passed before commit.
- No live jobs, runtime LLM calls, approval flips, file seeding, UI/API changes, or V1 prompt/code/type reuse were added.

This is not public cutover readiness. Public cutover still requires the remaining analytical slices, Analysis Session UX checks, comparator/Q-code quality validation, cost/latency measurement, report-generation regression controls, rollback readiness, and audited V1 cleanup/naming-normalization gates.

---

## 1.2 xWiki Architecture Crosscheck - 2026-05-13

This specification is implementation-led: source reverse-engineering and current contract tests remain authoritative for the V2 rebuild. The `.xwiki` architecture documentation was reviewed as design intent and as a model for reader-level diagrams, with stale portions filtered out before being carried forward.

Reviewed `.xwiki` sources:

| xWiki page | Useful for V2 | Staleness / caution |
|---|---|---|
| `Architecture/WebHome.xwiki` | Reader-level 5-stage overview and audience navigation style | "Start simple" wording must not override this project phase's completeness/correctness bar |
| `System Design/WebHome.xwiki` | Two-service lifecycle and API/runner responsibility split | Some route/file names may drift from current code |
| `AKEL Pipeline/WebHome.xwiki` and `AKEL Pipeline Detail/WebHome.xwiki` | Human-readable stage flow, sequence diagram level, LLM call budget framing | Old diagrams show V1 mechanisms and schema versions, not V2 ownership |
| `Deep Dive/Pipeline Variants/WebHome.xwiki` | Non-negotiable invariants: no stage skipping, fail closed, no synthetic evidence, result envelope | Variant dispatch details are V1/V2 compatibility context, not V2 target design |
| `Data Model/WebHome.xwiki` and diagram pages | Entity hierarchy and ERD readability | Field names and schema versions are V1-oriented |
| `Deep Dive/Context Detection/WebHome.xwiki` | EvidenceScope vs ClaimAssessmentBoundary separation and evidence-emergent boundary rationale | Some examples and function names are historical |
| `Quality and Trust/WebHome.xwiki` and quality gate diagrams | Gate 1/Gate 4 placement and defense-in-depth explanation style | Deterministic confidence/evidence mechanisms must be revalidated against current AGENTS rules |
| `Deep Dive/Prompt Architecture/WebHome.xwiki` | UCM prompt authority, section rendering, provider-output governance | Provider detection snippets and known exceptions are V1 implementation details |
| `Deep Dive/Verdict Debate Pattern/WebHome.xwiki` | Multi-role verdict adjudication and evidence-backed challenge principle | Exact step count/model tiers remain V2 policy decisions, not automatic carry-forward |
| `Deep Dive/Direction Semantics/WebHome.xwiki` | Direction-layer separation and warning against deterministic direction correction | Prompt snippets cannot be copied without approval |
| `Source Reliability/*` | Batch prefetch/sync lookup as a clean integration pattern | Direct verdict weighting formulas are not accepted V2 design until quality-validated |

Useful design intent incorporated or reaffirmed:

- keep `.xwiki`-level diagrams in the target spec, not only code-facing tables;
- preserve the two-service request lifecycle: API owns job persistence/events, Next.js runner owns analysis;
- keep EvidenceScope as per-evidence metadata and ClaimAssessmentBoundary as post-research evidence-emergent grouping;
- keep Gate 1 and Gate 4 as named trust checkpoints, but make V2 warning/materiality policy the user-facing authority;
- keep structured verdict adjudication with evidence-backed challenge and reconciliation; do not collapse to one prompt;
- keep UCM/prompt section governance and explicit prompt/model/cache policy before any LLM-backed stage executes;
- keep a result/entity ERD so external adapters and reviewers can see the contract relationships;
- use diagrams to show where V2 is intentionally simpler: one run context, one gateway, one result writer, one warning policy, and thin adapters.

Stale or rejected `.xwiki` content for V2:

- V1 schema strings such as `3.0.0-cb` are historical; V2 pre-cutover runs use `4.0.0-cb-precutover`.
- V1 monolithic pipeline files and some old function names are not V2 implementation targets.
- Deterministic semantic filters such as vague-phrase matching, Jaccard-like dedupe, keyword provider detection, or direction correction cannot be reintroduced as analysis logic.
- Direct source-reliability truth-percentage formulas are not accepted as V2 verdict math until deputy review and comparator validation approve them.
- Prompt examples or snippets from `.xwiki` are design references only; prompt text changes still need Captain approval and LLM Expert review.

Compact Design Intent Mapping:

| V2 area | xWiki intent preserved | Explicitly rejected or deferred mechanism | V2 authority |
|---|---|---|---|
| Request lifecycle | API owns job persistence/events; Next.js runner owns analysis execution | Changing public API/UI behavior as part of V2 rebuild | Sections 4.2 and 15; compatibility adapter tests |
| Pipeline shape | Understand -> Research -> Boundary formation -> Verdict -> Aggregation/report | Stage skipping or collapsing verdicting into one prompt | Sections 3, 4, 7-12 |
| Claim understanding | Gate 1 protects claim fidelity, analyzability, and selected-claim integrity | Copying old prompt wording; deterministic semantic claim filtering | Section 7; `ClaimContract` schema/tests |
| ACS compatibility | Prepared Stage 1 snapshots and selected IDs remain consumable | Invalidating drafts or redoing selected Stage 1 without approval | Sections 7 and 15; ACS migration contract tests |
| Evidence lifecycle | EvidenceItem remains source-backed and carries EvidenceScope metadata | Vague-phrase, keyword, or Jaccard semantic evidence decisions | Sections 8 and 16 |
| Boundary formation | ClaimAssessmentBoundaries emerge after research from compatible EvidenceScopes | Predefining AnalysisContexts or exact-text semantic fingerprints | Sections 10 and 16 |
| Verdict adjudication | Evidence-backed challenge and reconciliation remain trust safeguards | Baseless challenge weight reduction; deterministic direction correction | Sections 12, 14, and 16 |
| Aggregation/result writer | One canonical result authority drives public interpretation | Adapter-side verdict reinterpretation or legacy formula carryover by default | Sections 6, 12, 15, and 18.1 |
| Warning policy | User-visible warnings are governed by materiality, not raw event severity | Inline warning display rules in UI/API/export readers | Section 14; warning fixture/tests |
| Prompt/model governance | UCM prompt sections and model policies remain explicit runtime contracts | New prompt text/profile/model execution without Captain approval and LLM Expert review | Section 13; gateway policy tests |
| Source reliability | Existing service/cache/admin surfaces remain shared; V2 consumes source-trust signals through a thin integration boundary | Rebuilding, forking, or directly importing source-reliability truth-percentage formulas without quality validation | Sections 8, 12, 18.1 |
| Diagrams/readability | Human readers need xWiki-level lifecycle, entity, gate, and stage diagrams | Treating old diagrams as implementation proof | Sections 1.2 and 1.3 |

## 1.3 Reader-Level V2 Diagrams

The following diagrams mirror the old xWiki diagram level, but describe the new V2 target and the current guarded implementation posture.

### V2 Request Lifecycle

```mermaid
sequenceDiagram
  participant User as User / UI
  participant API as API service
  participant Runner as Next.js runner
  participant Select as Pipeline selector
  participant V1 as V1 CB pipeline
  participant V2 as V2 pipeline shell
  participant Adapter as Compatibility adapters
  participant Store as Job storage / events

  User->>API: submit analysis input
  API->>Store: create queued job
  API->>Runner: POST internal run-job
  Runner->>Select: choose persisted pipeline variant

  alt default production path
    Select->>V1: run current ClaimAssessmentBoundary pipeline
    V1-->>Runner: V1 result JSON and report
  else explicit gated V2 pre-cutover path
    Select->>V2: runClaimBoundaryPipelineV2(context)
    V2-->>Runner: 4.0.0-cb-precutover damaged or future V2 result
  end

  Runner->>Adapter: project result for API/UI/export/readers
  Adapter-->>Runner: compatible result surfaces
  Runner->>API: PATCH job result and status
  API->>Store: persist result JSON, events, quick fields
  API-->>User: SSE / polling update
```

### Target V2 Pipeline Detail

```mermaid
flowchart TB
  subgraph Entry["Entry and Run State"]
    IN["PipelineRunContext\ninput, currentDate, selected claims,\nconfig snapshot, prompt profile, model policy"]
    LEDGER["Observability ledger\nstage events, warnings, usage, timings"]
  end

  subgraph Gateways["Shared Gateways"]
    LLMG["Prompt / Model / LLM Gateway\nrender section, validate variables,\nroute model task, parse structured output"]
    WARN["Warning and Event Policy\nmateriality, visibility, primary issue,\ndamaged-report relation"]
    CACHE["Cache Governance\nprompt/model/config/input/schema dimensions"]
  end

  subgraph S1["Stage 1: Claim Understanding and Gate 1"]
    ACS["ACS prepared snapshot migration\nstructural selected-ID preservation"]
    CU["LLM claim understanding\nnot implemented until Slice 6B approval"]
    G1["Gate 1\nclaim contract validation and repair policy"]
    CC["ClaimContract"]
  end

  subgraph S2["Stage 2: Evidence Lifecycle"]
    QP["Query plan"]
    ACQ["Source acquisition and fetch"]
    REL["Relevance and applicability"]
    EXT["Evidence extraction\nEvidenceItem + EvidenceScope"]
    EC["EvidenceCorpus"]
  end

  subgraph S25["Stage 2.5: Sufficiency Gate"]
    SUFF["SufficiencyAssessment\ncontinue, refine, caveat, or damage"]
  end

  subgraph S3["Stage 3: Boundary Formation"]
    BF["LLM EvidenceScope congruence"]
    COV["Coverage matrix"]
    BS["BoundarySet"]
  end

  subgraph S4["Stage 4: Verdict Adjudication and Gate 4"]
    ADV["Advocate"]
    CHAL["Evidence-backed challenger"]
    REC["Reconciliation"]
    VAL["Grounding, direction, citation validation"]
    G4["Gate 4 confidence integrity"]
    VS["VerdictSet"]
  end

  subgraph S5["Stage 5: Aggregation and Result Writer"]
    AGG["Aggregation policy"]
    NAR["Narrative/report composition"]
    RR["Canonical ReportResult"]
    ADAPT["External CompatibilityView\nAPI, UI, markdown, HTML, metrics, validation"]
  end

  IN --> LEDGER
  IN --> ACS --> CC
  IN --> CU --> G1 --> CC
  LLMG --> CU
  LLMG --> QP
  LLMG --> REL
  LLMG --> EXT
  LLMG --> BF
  LLMG --> ADV
  LLMG --> CHAL
  LLMG --> REC
  LLMG --> VAL
  CACHE --> LLMG
  WARN --> G1
  WARN --> SUFF
  WARN --> G4
  WARN --> RR
  CC --> QP --> ACQ --> REL --> EXT --> EC
  EC --> SUFF --> BF --> COV --> BS
  BS --> ADV --> CHAL --> REC --> VAL --> G4 --> VS
  VS --> AGG --> NAR --> RR --> ADAPT
  LEDGER -.-> RR

  classDef gateway fill:#fff4d6,stroke:#9a6700,color:#3a2600
  classDef stage fill:#e8f4ff,stroke:#2463a7,color:#08233d
  classDef output fill:#edf7ed,stroke:#3d8b40,color:#102a12
  class LLMG,WARN,CACHE gateway
  class IN,ACS,CU,G1,QP,ACQ,REL,EXT,SUFF,BF,COV,ADV,CHAL,REC,VAL,G4,AGG,NAR stage
  class CC,EC,BS,VS,RR,ADAPT,LEDGER output
```

### Target V2 Entity Model

```mermaid
erDiagram
  PIPELINE_RUN_CONTEXT ||--|| CLAIM_CONTRACT : "creates"
  PIPELINE_RUN_CONTEXT ||--|| CONFIG_SNAPSHOT : "uses"
  PIPELINE_RUN_CONTEXT ||--|| OBSERVABILITY_LEDGER : "records"

  CLAIM_CONTRACT ||--o{ ATOMIC_CLAIM : "selects"
  CLAIM_CONTRACT ||--o{ WARNING_EVENT : "emits"
  CLAIM_CONTRACT ||--o| ACS_MIGRATION : "may_use"

  EVIDENCE_CORPUS ||--o{ SOURCE_RECORD : "contains"
  EVIDENCE_CORPUS ||--o{ EVIDENCE_ITEM : "contains"
  SOURCE_RECORD ||--o{ EVIDENCE_ITEM : "provides"
  EVIDENCE_ITEM ||--|| EVIDENCE_SCOPE : "has"
  EVIDENCE_ITEM }o--o{ ATOMIC_CLAIM : "relates_to"

  SUFFICIENCY_ASSESSMENT ||--|| EVIDENCE_CORPUS : "assesses"
  SUFFICIENCY_ASSESSMENT ||--o{ WARNING_EVENT : "emits"

  BOUNDARY_SET ||--o{ CLAIM_ASSESSMENT_BOUNDARY : "contains"
  CLAIM_ASSESSMENT_BOUNDARY ||--o{ EVIDENCE_SCOPE : "groups"
  CLAIM_ASSESSMENT_BOUNDARY ||--o{ EVIDENCE_ITEM : "assigns"
  BOUNDARY_SET ||--|| COVERAGE_MATRIX : "has"

  VERDICT_SET ||--o{ CLAIM_VERDICT : "contains"
  CLAIM_VERDICT }o--|| ATOMIC_CLAIM : "rates"
  CLAIM_VERDICT }o--o{ EVIDENCE_ITEM : "cites"
  CLAIM_VERDICT }o--o{ CLAIM_ASSESSMENT_BOUNDARY : "uses"
  CLAIM_VERDICT ||--o{ VERDICT_CHALLENGE : "addresses"
  VERDICT_SET ||--o{ WARNING_EVENT : "emits"

  REPORT_RESULT ||--|| CLAIM_CONTRACT : "summarizes"
  REPORT_RESULT ||--|| EVIDENCE_CORPUS : "references"
  REPORT_RESULT ||--|| BOUNDARY_SET : "presents"
  REPORT_RESULT ||--|| VERDICT_SET : "aggregates"
  REPORT_RESULT ||--o{ WARNING_EVENT : "publishes"
  REPORT_RESULT ||--|| COMPATIBILITY_VIEW : "projects"

  PIPELINE_RUN_CONTEXT {
    string runId
    string currentDate
    string originalInput
    string promptProfile
    string resultSchemaVersion
  }
  CLAIM_CONTRACT {
    string schemaVersion
    string gate1Status
    json selectedAtomicClaimIds
  }
  ATOMIC_CLAIM {
    string id
    string statement
    boolean selected
  }
  EVIDENCE_ITEM {
    string id
    string statement
    string probativeValue
    string claimDirection
  }
  EVIDENCE_SCOPE {
    string methodology
    string temporal
    string boundaries
    string geographic
  }
  CLAIM_ASSESSMENT_BOUNDARY {
    string id
    string label
    string scopeSummary
  }
  CLAIM_VERDICT {
    string claimId
    float truthPercentage
    float confidence
    string gate4Status
  }
  WARNING_EVENT {
    string type
    string category
    string displaySeverity
    boolean primaryIssueEligible
  }
  REPORT_RESULT {
    string schemaVersion
    string verdictLabel
    float truthPercentage
    float confidence
    boolean damagedReport
  }
```

### V2 Quality Gates And Warning Materiality

```mermaid
flowchart TB
  INPUT["Input / ACS prepared snapshot"] --> G1{{"Gate 1\nClaim contract integrity"}}
  G1 -->|"pass"| RESEARCH["Evidence lifecycle"]
  G1 -->|"blocked or fail"| DAMAGE1["Damaged or blocked result\nno semantic repair by adapter"]

  RESEARCH --> SUFF{{"Sufficiency gate"}}
  SUFF -->|"sufficient"| BOUNDARY["Boundary formation"]
  SUFF -->|"scarce but usable"| SCARCE["Analytical reality warning\nvisible only if materially useful"]
  SUFF -->|"not usable"| DAMAGE2["Damaged or low-confidence result"]
  SCARCE --> BOUNDARY

  BOUNDARY --> VERDICT["Verdict adjudication"]
  VERDICT --> G4{{"Gate 4\nconfidence and citation integrity"}}
  G4 -->|"pass"| RESULT["Canonical ReportResult"]
  G4 -->|"caveat"| WARNED["ReportResult with user-visible caveat"]
  G4 -->|"no trustworthy verdict"| DAMAGE3["Damaged report"]

  DAMAGE1 --> POLICY["Warning/Event Policy"]
  DAMAGE2 --> POLICY
  DAMAGE3 --> POLICY
  WARNED --> POLICY
  RESULT --> POLICY

  POLICY --> MAT{{"Would verdict be materially different\nwithout this event?"}}
  MAT -->|"No"| INFO["silent or admin-only info"]
  MAT -->|"Maybe"| WARNING["user-visible warning"]
  MAT -->|"Yes"| ERROR["error or damaged report"]
  INFO --> ADAPTERS["API / UI / markdown / HTML / validation adapters"]
  WARNING --> ADAPTERS
  ERROR --> ADAPTERS

  classDef gate fill:#fff4d6,stroke:#9a6700,color:#3a2600
  classDef ok fill:#edf7ed,stroke:#3d8b40,color:#102a12
  classDef warn fill:#fff0cc,stroke:#9a6700,color:#3a2600
  classDef error fill:#fde2e2,stroke:#a33a3a,color:#3b0d0d
  class G1,SUFF,G4,MAT gate
  class RESEARCH,BOUNDARY,VERDICT,RESULT,INFO,ADAPTERS ok
  class SCARCE,WARNED,WARNING warn
  class DAMAGE1,DAMAGE2,DAMAGE3,ERROR error
```

The old `.xwiki` diagrams showed the current CB pipeline as a dense single-path flow. The V2 diagrams intentionally make the policy gateways visible because that is the architectural simplification: stages own domain outputs, shared gateways own prompt/model/cache and warning behavior, and adapters own compatibility.

---

## 1.4 xWiki-Derived V2 Specification Refinements - 2026-05-13

This section is additive to Sections 1.2 and 1.3. The new V2 `.xwiki` pages are canonical reader-level design documentation, but they do not override source reverse-engineering, committed V2 schemas, fixtures, contract tests, or approved implementation slices.

| Refinement | Spec expectation | Boundary / non-import rule |
|---|---|---|
| Documentation parity | V2 readiness and cutover review must keep reader-level xWiki parity for lifecycle, entity, gate, verdict-debate, prompt-architecture, and presentation diagrams. | This is a readiness and review expectation, not a blocker for every implementation commit and not authority over tests or code. |
| Academic/research-platform view | Validation planning should treat cost, latency, verdict stability, evidence coverage, input neutrality, and multilingual robustness as research-platform observability lenses. | Concrete metrics, benchmark scope, live-job spend, or new validation batches still require the normal approval gate. These metrics must not become source-reliability verdict formulas or deterministic source-type scoring. |
| Explanation/report quality | Before cutover, ReportResult and quality-gate contracts must keep explanation/report quality visible through narrative status, evidence references, report-quality status, warnings, and adapter parity tests. | This docs-only refinement does not introduce schema changes. Any schema expansion belongs to an explicit contract slice with fixtures and tests. |
| Job lifecycle and audit trail | When V2 ledger implementation reaches persistence/adapters, ledger concepts must map cleanly to persisted job status/events, warnings, usage/timing metadata, and audit artifacts. | No API, database, or event-shape change is approved by this section. Implementation must use the relevant slice review. |
| ACS selected-claim integrity | Selected AtomicClaim IDs and selected claim statements must not silently disappear during V2 ACS snapshot migration or claim understanding. Missing or invalid selected claims must produce a Gate 1 blocked/damaged status or an explicitly approved ACS retry path. | V2 may not silently reselect, drop, or redo selected Stage 1 claims to recover from migration failure. |
| xWiki reader links | The V2 spec is accompanied by the xWiki pages for `AKEL Pipeline V2`, `AKEL Pipeline Detail V2`, `Data Model V2`, `Quality and Trust V2`, `Quality Gates V2`, `Pipeline Variants V2`, `Evidence Lifecycle V2`, `Verdict Debate Pattern V2`, `Calculations and Verdicts V2`, `Prompt Architecture V2`, `Source Reliability V2`, and `Academic Cooperation V2 Diagrams`. | Older V1 xWiki pages remain historical/runtime references for the current pipeline and must not be treated as V2 implementation proof. |

Additional xWiki non-import list for V2:

- prompt snippets or prompt examples without Captain approval and LLM Expert review;
- V1 schema strings, route names, file names, or function names as target implementation truth;
- deterministic semantic filters, keyword lists, text-overlap grouping, or language-specific meaning decisions;
- direct source-reliability truth-percentage formulas without later quality validation approval;
- provider-detection snippets or hardcoded model-tier assumptions from older docs;
- old `AnalysisContext` framing or context-detection diagrams as replacements for ClaimAssessmentBoundary terminology;
- polished diagrams as proof that a behavior is currently implemented.

Deputy consolidation verdict: Franklin and Lorentz both returned `MODIFY` and approved this bounded addendum only with the authority, scope, and non-import guards above. A follow-up Claude Opus review of commit `b6c9926c` returned `APPROVE` with no blockers or required edits. No source, prompt, config, runtime, API, UI, or live-job change is included.

---

## 2. Governing Intent

Captain intent, restated in implementation-ready wording:

> Replace the current FactHarbor analysis pipeline with a cleaner, maintainable architecture. Start from a reverse-engineered current-state specification, then design the cleaned target architecture, then implement only after review approval. The new pipeline must be clearly less complicated than the current one, but it must not drop the analytical safeguards that make FactHarbor trustworthy. UI behavior should remain unchanged unless a concrete product, trust, or compatibility need is approved.

Normal decision points in this specification are delegated to the Captain Deputy team. Escalate to Captain only for high risk, no deputy consensus, live validation spend, material UI/API/report/persisted-data breakage, prompt edits, security/production concerns, or removal of core analysis guarantees.

---

## 3. Non-Negotiable Contracts

V2 must preserve these contracts:

1. Analytical flow: Understand -> Research -> Boundary formation -> Verdict -> Aggregation/report.
2. Gate 1 claim validation and Gate 4 confidence integrity.
3. Evidence transparency: every verdict must cite supporting/opposing evidence items where relevant.
4. ClaimAssessmentBoundary, AtomicClaim, EvidenceScope, EvidenceItem, and probativeValue terminology.
5. LLM ownership for semantic text decisions.
6. Generic topic behavior and multilingual robustness.
7. Input neutrality, including question vs assertion neutrality.
8. ACS prepared Stage 1 snapshot compatibility by default.
9. Canonical result JSON and persisted historical report readability.
10. Warning materiality policy across all user-facing surfaces.
11. UCM governance for analysis-affecting prompts/config/model choices.
12. Comparator-based report quality expectations before cutover.

V2 must not:

- collapse Stage 4 into a single verdict prompt;
- remove Gate 1 or Gate 4;
- make semantic decisions with regex, keyword lists, token overlap, or language-specific deterministic rules;
- break UI/API/report/export behavior without explicit approval;
- spend live validation budget before an approved gate;
- start implementation before this target specification is approved.

---

## 4. Target Architecture Overview

V2 should be a clean pipeline application composed of explicit use-case owners and shared policy gateways.

```mermaid
flowchart TD
  A["Pipeline Application"] --> B["Run Context + Config Snapshot"]
  B --> C["Claim Understanding + Gate 1"]
  C --> D["Evidence Lifecycle"]
  D --> E["Evidence Sufficiency Gate"]
  E --> F["Boundary Formation"]
  F --> G["Verdict Adjudication + Gate 4"]
  G --> H["Aggregation + Report Result Writer"]
  H --> I["External Compatibility Adapters"]

  J["Prompt / Model / LLM Gateway"] --> C
  J --> D
  J --> F
  J --> G
  J --> H

  K["Warning + Event Policy"] --> D
  K --> E
  K --> G
  K --> H
  K --> I

  L["Observability Ledger"] --> A
  L --> C
  L --> D
  L --> F
  L --> G
  L --> H
```

Core principle: the orchestrator controls sequence and state handoff; it does not own semantic decisions, prompt strings, source reliability policy, warning display policy, result interpretation, or UI/export compatibility behavior.

---

## 4.1 Deputy Review Consolidation

Five deputy reviewers returned **approve with required changes** and no Captain escalation. This revision folds their required changes into the spec:

- implementation isolation is operationalized with a proposed V2 namespace, disabled-by-default pre-cutover entry, feature flag, kill switch, and V1 protection rules;
- external adapters now require field-level mapping, ownership, fallback lifetime, and fixture-driven tests;
- canonical result, warning, sufficiency, verdict, and compatibility contracts have schema skeletons and invariants;
- every stage has explicit failure/event/gate behavior;
- every deterministic semantic hotspot needs a disposition and verifier or a deputy-approved waiver;
- ACS compatibility is no longer open-ended: V2 consumes/migrates V1 prepared snapshots by default and preserves selected-claim IDs;
- runtime/cost acceptance uses a measured baseline and approved comparator method, not vague "acceptable" wording.

Implementation remains blocked until the review gate confirms these revisions.

---

## 4.2 V2 Implementation Boundary And Pre-Cutover Strategy

V2 must be built in an isolated path. The proposed implementation boundary is:

| Boundary item | Required decision |
|---|---|
| V2 code root | `apps/web/src/lib/analyzer-v2/` |
| V2 public TypeScript entrypoint | `runClaimBoundaryPipelineV2(context)` exported from `apps/web/src/lib/analyzer-v2/index.ts` |
| Shared contract artifacts | versioned JSON schemas/fixtures under `apps/web/test/fixtures/analyzer-v2/`, consumable by both TypeScript and API-side tests |
| V1 hot path | remains `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` until cutover approval |
| Runner integration | V1 remains default; V2 can run only through an explicit disabled-by-default pre-cutover gate |
| Proposed pre-cutover gate | `FH_ANALYZER_PIPELINE=v2-precutover` plus explicit internal-run request metadata |
| Kill switch | absence of the pre-cutover gate routes all runs to V1 |
| Public persistence | V2 must not replace public `resultJson` or `reportMarkdown` before cutover approval |
| Allowed V1 changes before cutover | contract fixtures, compatibility adapters, adapter/test seams, and explicit pre-cutover routing guard only |
| Forbidden before cutover | deleting V1 hot-path mechanisms, changing public UI behavior, changing public API behavior, replacing V1 output, or running V2 for normal public jobs |

V2 modules may import shared structural utilities only when the utility is proven semantic-free. V1 may not import V2 stage internals. External adapters may consume `ReportResult` and compatibility fixtures; they may not call stage internals. Stages may not call UI, markdown, static HTML, API, validation, or metrics helpers.

Clean-room boundary rule: V2 implementation must not import, reuse, alias, extend, or clone V1 pipeline analysis code, V1 prompt files, V1 prompt profiles, or V1 pipeline-owned types. Compatibility at the runner/storage edge is allowed only as a one-way structural mapping from current job/request data into V2-owned contracts. That mapping must live at a clearly named seam and must not expose V1 types into V2 internals. Internal V2 contracts are derived from this specification and the current slice's actual needs, not from copying V1 shapes.

The current master V1 pipeline is not the report-quality oracle for V2. V2 quality comparison should use pinned deployed historical reports, Captain-defined benchmark expectations, and stored fixtures. Master V1 remains only a frozen runtime/fallback path until V2 cutover and must not survive as a parallel production analysis path after the redesign is complete. Backward investigation is handled by checking out old commits as worktrees, never by preserving V1 code for forward development.

**Final naming policy**

V2 should not accumulate awkward names only because V1 still occupies the current runtime namespace. During rebuild, the temporary namespace is the module/package boundary: `apps/web/src/lib/analyzer-v2/`, the gated pre-cutover schema, and the pre-cutover runner flag. Inside that boundary, contracts should use clean domain names such as `PipelineRunContext`, `ReportResult`, `ClaimContract`, `EvidenceCorpus`, `BoundarySet`, and `VerdictSet`, not permanent names like `V2InternalEvaluationResult`.

After V2 cutover stabilizes and V1 analysis code is deleted, a mandatory naming-normalization cleanup slice must rename surviving V2 package/entrypoint/schema labels to final names and add a guard that fails if obsolete rebuild labels, `precutover`, or unnecessary `V2` prefixes remain in final runtime code. Shared services that are not V1-pipeline-owned, such as Source Reliability, keep their meaningful service names.

"Clean the current pipeline" means quarantine and remove V1 mechanisms after V2 owns the equivalent contract and passes the named verifier. Cleanup must not leave FactHarbor in a broken intermediate state, but it is a mandatory end-state requirement rather than an optional follow-up.

---

## 4.3 Quality-Constrained Cost And Latency Envelope

Cost and latency are design constraints, not quality tradeoffs. A faster or cheaper V2 run is acceptable only when it preserves or improves the approved quality floor: Gate 1 fidelity, Gate 4 integrity, evidence transparency, warning honesty, report clarity, multilingual/input-neutral behavior, and comparator/Q-code expectations. If a run hits a cost or time budget, V2 must surface the effect through sufficiency, scarcity, budget-exit, warning, or damaged-report behavior; it must not manufacture confidence to stay inside the envelope.

Initial V2 targets before measurement:

| Analysis class | Structural/LLM-owned classification signals | Active runtime target | Cost target | Review threshold |
|---|---|---:|---:|---:|
| Simple | short input, 1-2 selected AtomicClaims, adequate evidence, no significant evidence-backed contestation | 2-5 min | $0.10-$0.75 | unchanged unless quality regresses |
| Normal | typical public fact-check, up to 3 selected AtomicClaims, ordinary retrieval, sufficient evidence | 6-10 min | $0.50-$1.25 | above 12 min or above $1.75 |
| Complex | more than 3 selected AtomicClaims, evidence-backed contestation, difficult retrieval, legal/technical reasoning, or sufficiency caveats | 10-18 min | $1.25-$3.25 | above 22 min or above $4.00 |
| Deep-review exception | Captain/deputy-approved quality need beyond normal/complex envelope | explicit per-run budget | explicit per-run budget | explicit approval required |

Classification may use structural facts and LLM-owned semantic assessments only. It must not use topic keywords, entity names, language-specific regexes, or V1 prompt/code behavior.

Budget-control mechanisms required before prompt-backed V2 execution:

- every model task declares provider/model tier, max calls, token budget, timeout, retry/fallback policy, cache policy, and escalation policy;
- the normal path batches semantic work aggressively instead of multiplying per-source or per-claim calls without a contract reason;
- independent structural work such as search, fetch, parsing, and adapter projection is parallelized with explicit concurrency caps and cancellation;
- stronger models, extra retrieval, fuller verdict debate, repair loops, or extra validation run only when V2-owned gates show insufficiency, evidence-backed contestation, low confidence, citation/direction risk, provider failure, or report-integrity risk;
- the observability ledger records stage wall time, active LLM time, input/output tokens, estimated cost, cache hits/misses, retries, provider/model, escalation reason, and budget-exit reason;
- cutover validation reports cost and latency by preparation, queue, active final runtime, retrieval, verdict, export, and total user-visible wait.

No cost/latency optimization may weaken the clean-room boundary, reuse V1 prompts/code/types, hide warnings, skip Understand -> Research -> Verdict, or replace LLM-owned semantic decisions with deterministic shortcuts.

---

## 4.4 Prevention-First Recovery Policy

V2 should be designed so retries and repairs are rare. Prevention is preferred because repeated correction loops hide complexity, increase cost, create unstable behavior, and can become an accidental substitute for clean contracts. This is not a "zero retries ever" rule. Quality remains the priority: V2 must use the right model, evidence packet, schema, and gate design on the first attempt, even when that costs more than a cheap-first-then-repair loop.

**Prevention mechanisms required before prompt-backed V2 execution**

- Contract-first prompts: each task has one semantic responsibility, required variables, stable IDs, allowed output states, output schema, and tests.
- Valid uncertainty states: `insufficient_evidence`, `cannot_determine`, `blocked`, `caveat`, and `damaged` are first-class outcomes where appropriate, not malformed partial answers.
- Pre-call structural validation: validate run context, config snapshot, prompt variables, selected claim IDs, evidence IDs, source IDs, schema version, token budget, and evidence packet completeness before the LLM call.
- Stable references: models reference claim, source, evidence, boundary, and citation IDs instead of recreating objects in prose.
- Sufficiency before verdict: verdict adjudication must not compensate for weak evidence; weak evidence returns refine, caveat, low-confidence, insufficient, or damaged states through the sufficiency gate.
- Right model first for high-leverage stages: Claim Understanding, Sufficiency, Verdict Adjudication, and Gate 4 must not rely on low-cost attempts that predictably need semantic repair.
- No silent truncation of decisive material: evidence packets must be bounded intentionally and ledgered when material is excluded.

**Allowed and forbidden recovery**

| Recovery situation | V2 policy | Quality rule |
|---|---|---|
| Structural preflight failure | do not call the LLM; fail fast to a typed validation error, approved retry path, or damaged result | prevents wasting calls and avoids malformed downstream state |
| Provider/network/transient failure | one bounded same-task retry or configured provider fallback through the gateway | retry is structural resilience, not semantic fishing |
| Structured-output parse/schema failure | one bounded same-task/schema retry where the provider supports it; otherwise typed failure or damaged result | no hidden reinterpretation of malformed content |
| Analytical insufficiency | return insufficiency/caveat/refine/damaged state; do not patch toward a desired verdict | uncertainty is honest output |
| Meaning-changing correction | allowed only as explicit, LLM-owned, typed, observable recovery with gate status and ledger entry | no silent semantic repair |
| "Try again for a better answer" | forbidden | quality must come from correct first-pass design, not stochastic sampling for preference |

Every retry, fallback, escalation, semantic correction, safe downgrade, and damaged result records a recovery class, stage, model task, trigger, count, quality-protection reason, and final gate outcome in the observability ledger. A high retry or repair rate is a design defect and should block cutover until the responsible contract, prompt, model policy, evidence packet, or gate is improved.

---

## 4.5 Analysis Session UX And Focus Mode Policy

Today's UX decision is an approved product reason to change the current UI flow in V2. The current separation between Atomic Claim preparation, claim selection, and analysis execution is architecturally useful, but it should not be exposed as separate products. V2 presents one continuous **Analysis Session** experience while preserving the internal draft/preparation and job/execution boundary.

```mermaid
flowchart TB
  INPUT["Submit input\nchoose mode before submission"] --> PREP["Preparing analysis focus"]
  PREP --> DECIDE{{"Can V2 safely auto-continue?"}}
  DECIDE -->|"yes: unattended cap satisfied"| RUN["Running fact-check"]
  DECIDE -->|"no: review required or attended mode"| REVIEW["Confirm focus\nor revise input"]
  REVIEW -->|"continue analysis"| RUN
  REVIEW -->|"revise input"| INPUT
  RUN --> REPORT["Report ready\nanalysis focus provenance shown"]

  classDef user fill:#e8f4ff,stroke:#2463a7,color:#08233d
  classDef internal fill:#fff4d6,stroke:#9a6700,color:#3a2600
  classDef output fill:#edf7ed,stroke:#3d8b40,color:#102a12
  class INPUT,REVIEW user
  class PREP,DECIDE,RUN internal
  class REPORT output
```

**User-facing terminology contract**

| Internal concept | User-facing wording |
|---|---|
| AtomicClaim / selected AtomicClaim | analysis focus, what FactHarbor will check |
| ACS preparation / draft | preparing analysis focus |
| Claim selection | confirm focus |
| Start final job | continue analysis |
| Restart claim wording | revise input |

`AtomicClaim`, `draft`, `Stage 1`, prepared snapshot, and "real job" remain implementation language. Normal users should see one session lifecycle: submit input -> preparing analysis focus -> confirm focus only when needed -> running fact-check -> report ready.

**Mode policy**

The mode choice is visible before each job submission for now. The browser may remember the last choice as a convenience, but the server is authoritative for allowed modes, caps, forced-review rules, and future user/profile restrictions.

| Mode | Target user | Default? | Behavior | Initial cap guidance |
|---|---|---:|---|---|
| Unattended | normal users | yes | V2 selects a small recommended focus set and continues automatically when safe | target 1-3 selected claims |
| Attended | advanced users | no | user reviews and selects the analysis focus before execution | configured higher cap, target 3-5 selected claims |
| Deep review | admin/internal/expert | no | explicit higher budget/cap for quality-justified cases | explicit per-run budget and approval |

Future logged-in product policy may restrict modes by entitlement, role, risk profile, or admin configuration. Until that exists, the mode selector is shown before each submission and defaults to Unattended.

**Auto-continue and forced-review rules**

Unattended mode should reduce unnecessary review, cost, timing, and report sprawl. It may auto-continue when Claim Understanding finds a coherent recommended focus set inside the unattended cap and the recommendation confidence is high enough.

V2 must pause for focus confirmation when:

- the user selected Attended or Deep review mode;
- recommendation confidence is low;
- the input contains competing or incoherent focus candidates;
- clearly separate high-value claims cannot be fairly reduced under the unattended cap;
- policy/config marks the input or mode as high-risk or ambiguous;
- automatic reduction would materially affect trust, evidence coverage, or report usefulness.

The user may select/reject claims in the focus set, but may not edit claim wording in V2's first implementation. "Revise input" is the supported escape hatch when wording is wrong.

**API and persistence boundary**

The first implementation step should be a unified UI shell over the existing draft/job endpoints. A later V2 slice may introduce a formal `AnalysisSession` API facade that returns normalized UI state while internally mapping to preparation/draft and execution/job records.

Do not create a persisted `JobEntity` before the selected focus is finalized just to simplify the UI. Pre-job preparation and job execution stay separate in persistence because final jobs should represent executable analysis requests, not unfinished focus negotiation.

**Atomic-claim preprocessing cost policy**

The ZHAW-inspired atomic-claim preprocessing remains valuable for focus quality, but V2 must avoid unnecessary extra LLM rounds. Where Claim Understanding/Gate 1 already yields a small coherent set inside the selected mode cap, V2 should continue with that set and not run a separate recommendation call. Deeper focus recommendation runs only when selection materially matters: many candidate claims, ambiguity, redundancy, competing focuses, or high-risk reduction.

V2 should fold focus recommendation metadata into the Claim Understanding contract where possible. Logical fields remain separate, but the normal path should avoid a second LLM round for simple cases. Preparation results should be cached/reused by prompt/config/model/schema/input/current-date bucket where safe under the clean-room and prompt-governance rules.

Reports should show the analysis focus used for the report as provenance. For attended or forced-review sessions, the report may also show that unselected candidate claims existed, without implying they were analyzed.

---

## 4.6 Implementation Readiness Checkpoint - 2026-05-14

No further architecture-wide redesign is needed before continuing implementation. The target direction is now stable enough for the next slice sequence, with these remaining gates:

| Readiness item | Status | Required before |
|---|---|---|
| Captain intent and V1 cleanup policy | documented | continue slice implementation |
| Clean-room no V1 code/prompt/type reuse boundary | documented and guarded by current tests | any new V2 implementation code |
| Quality-constrained cost/latency envelope | documented | prompt-backed runtime work and live validation |
| Prevention-first recovery policy | documented | prompt-backed runtime work |
| Analysis Session UX and mode policy | documented | public V2 UX/cutover |
| Prompt/model execution approval | blocked by explicit approval requirement | Slice 6B Claim Understanding prompt/model execution |
| LLM Expert review of new/changed prompt/model behavior | required | Slice 6B Claim Understanding prompt/model execution |
| Exact UCM defaults for mode caps and forced-review thresholds | implementation-slice decision; deputy team may decide unless risk escalates | public mode enforcement |
| Live validation plan | approved budget exists, but no run until commit-first/runtime-refresh gate | comparator-quality gate |

Risk mitigation before Slice 6B:

- write or update contract tests before enabling any prompt-backed execution;
- make mode caps, forced-review thresholds, model task routing, cache policy, and token/call budgets UCM/model-task governed where they affect analysis behavior;
- keep the first UI implementation as a shell over existing preparation/job endpoints; introduce a formal `AnalysisSession` facade only if the shell needs stable normalized state;
- do not submit live jobs until the relevant changes are committed and the runtime/prompt/config state is refreshed;
- run the Captain Deputy review/debate path for any contested prompt, model, UX, or cutover decision.

---

## 5. Logical Module Boundaries

Exact file names can be refined by implementation, but the V2 root and public entrypoint in Section 4.2 are the default unless deputy review changes them before implementation.

| Boundary | Owns | Must not own |
|---|---|---|
| Pipeline application | Stage sequencing, cancellation/damage exits, run state, typed handoff | LLM prompt content, semantic classification, result rendering |
| Run context/config snapshot | Current date, input, selected claims, UCM config, prompt profile, model policy, run metadata | Per-stage mutable config reads |
| Prompt/model/LLM gateway | Prompt section rendering, variable validation, model task routing, LLM provider retry/fallback, LLM structured output parsing | Stage business rules, search/source acquisition, or hardcoded analysis strings |
| Claim understanding | AtomicClaim extraction, contract validation/repair, Gate 1, ACS prepared-state reuse | Source acquisition loops or verdict work |
| Evidence lifecycle | Query plan, search/source acquisition, relevance, extraction, applicability, provenance, retrieval policies | Claim rewriting, boundary clustering, verdict labels, LLM provider retry mechanics |
| Sufficiency gate | Evidence sufficiency, evidence scarcity warnings, continuation/stop decision | Retrieval implementation or verdict confidence |
| Boundary formation | EvidenceScope normalization/equivalence, ClaimAssessmentBoundary construction, evidence assignment, coverage matrix | Verdict generation or aggregation math |
| Verdict adjudication | Advocate/challenger/reconciler roles, citation integrity, grounding/direction repair, Gate 4 | Public result schema conversion, UI display, or LLM provider retry mechanics |
| Aggregation/result writer | Aggregation math, article adjudication, narrative, canonical result JSON, quality gates | API/UI/static export fallback logic |
| Warning/event policy | Warning registration, materiality, user/admin visibility, primary issue selection | Stage-specific semantic judgment |
| External adapters | API list/detail, job UI shape, markdown, static HTML, validation, calibration, metrics, historical read compatibility | Reinterpreting verdicts independently |
| Observability ledger | Acquisition trace, repair events, prompt/model usage, timings, warnings, adapter decisions | Product semantics |

---

## 6. Canonical V2 Data Contracts

V2 should use explicit typed handoff objects. Names below are logical contract names, not final implementation class names.

| Contract | Required content | Notes |
|---|---|---|
| `PipelineRunContext` | run id, original input, current date, locale/language signal, config snapshot, prompt profile, model policy, ACS selected IDs when present | Created once and passed through all stages |
| `ClaimContract` | original input, extracted AtomicClaims, selected AtomicClaims, contract validation result, repair/audit events, Gate 1 status | Claim fidelity authority |
| `EvidenceCorpus` | sources, EvidenceItems, EvidenceScopes, acquisition trace, applicability results, source reliability signals, evidence warnings | Owns evidence lifecycle state |
| `SufficiencyAssessment` | sufficiency status, missing evidence dimensions, continuation/refinement policy, user-facing scarcity warnings | Separate from retrieval implementation |
| `BoundarySet` | ClaimAssessmentBoundaries, normalized scopes, evidence assignments, coverage matrix, boundary warnings | Owns CAB product semantics |
| `VerdictSet` | per-claim/per-boundary verdicts, debate artifacts, citation integrity results, direction/grounding repairs, Gate 4 status | Owns verdict integrity |
| `ReportResult` | canonical truth, verdict, confidence, quality gates, warnings, evidence references, narrative, schema version, metadata | Sole source for public interpretation |
| `CompatibilityView` | API/UI/export/validation-specific projection of `ReportResult` | Thin adapter; no independent verdict semantics |

The public result schema should be versioned. Implementation-entry default:

- pre-cutover schema: `4.0.0-cb-precutover`;
- public cutover schema: `4.0.0-cb`;
- V1 public compatibility schema remains `3.2.0-cb`.

The exact string can still be changed by deputy review before implementation, but it cannot remain open once the first result-contract implementation slice starts. Historical V1 read compatibility has no automatic expiry. The V1 analysis pipeline implementation does have an expiry: it must be removed after V2 cutover, stabilization, and audited cleanup verification.

**ReportResult schema skeleton**

`ReportResult` must include these top-level groups before adapter work starts:

| Group | Required fields or invariants |
|---|---|
| Schema | `_schemaVersion`, `meta.schemaVersion`, `meta.pipeline`, `meta.resultContractVersion` |
| Run metadata | run id, current date, executed commit/hash fields when available, prompt/config/model hashes when available |
| Input | original input reference, selected AtomicClaim IDs when ACS is used, input language signal without forcing translation |
| Claims | AtomicClaim id, `statement`, Gate 1 status, selected status, related ClaimAssessmentBoundary IDs |
| Evidence | EvidenceItem id, statement, source id, claim direction, evidenceScope, probativeValue, sourceType, claimBoundaryId, citation reference |
| Boundaries | ClaimAssessmentBoundary id, label, scope summary, covered claim IDs, evidence IDs, coverage matrix link |
| Verdict | canonical verdict label, truthPercentage, confidence, confidence tier, Gate 4 status, verdict source marker |
| Quality gates | Gate 1, sufficiency, Gate 4, report integrity, warning integrity, damaged-report flag when applicable |
| Warnings | list of canonical `WarningEvent` objects, already classified for display by the shared warning policy |
| Narrative/report | markdown, narrative sections, evidence references, report-quality status |
| Report generation provenance | report-generation profile id/version, report writer version, narrative prompt section/version/hash when applicable, model task ids/versions, config snapshot hash, evidence packet or replay fixture id/hash when applicable, renderer/export adapter version |
| Compatibility | optional V1 compatibility projection fields, clearly marked as fallback/adapter material |

Adapters must read this canonical schema. They may expose legacy aliases, but they may not compute a different verdict authority when canonical fields are present.

**WarningEvent schema skeleton**

Every warning or user/admin-visible event that can leave the pipeline must carry:

- stable `type`;
- `category`: routine operation, system failure, analytical reality, or internal diagnostic;
- raw `severity`;
- display severity from the shared warning policy;
- visibility: silent, admin-only, user-visible, or blocking;
- affected stage/owner;
- affected claim/boundary/evidence/source IDs when applicable;
- materiality rationale;
- recovery state;
- primary-issue eligibility;
- damaged-report relation if applicable.

`severe` is represented as `severity: "error"` plus a damaged-report/report-damaged flag. Internal diagnostics remain admin-only unless a separate damage event is emitted.

**Typed provider/search outcomes**

Retry, fallback, circuit accounting, and parse recovery have one owner per mechanism:

- LLM provider mechanics belong to the prompt/model/LLM gateway and return typed `LLMCallResult` outcomes to stages.
- Search/source acquisition mechanics belong to the evidence lifecycle source-acquisition owner and return typed `SourceAcquisitionResult` outcomes.
- Stages may request an LLM task or acquisition policy, but they must not implement independent provider retries, credential fallback, parse recovery, or circuit accounting.

---

## 7. Stage Contract: Claim Understanding And Gate 1

**Purpose:** Convert user input or ACS prepared input into a validated, selected AtomicClaim contract.

**Inputs**

- `PipelineRunContext`
- raw user input or URL/PDF-derived text
- optional `InputGroundingSeed` containing already-resolved source bodies or preliminary snippets, without letting claim understanding own full research
- optional ACS `PreparedStage1Snapshot`
- optional selected AtomicClaim IDs

**Semantic LLM tasks**

- claim extraction;
- contract validation;
- contract repair;
- atomicity and salience judgment where they affect claim selection.

**Structural tasks**

- schema validation;
- ID generation;
- selected-ID matching;
- prepared snapshot compatibility checks;
- event/ledger recording.

**Outputs**

- `ClaimContract`;
- Gate 1 pass/fail/damaged status;
- repair/audit ledger;
- ACS-compatible prepared snapshot data when required.

**Simplification from V1**

- Consolidate salience, low-count reprompt, contract retry, narrow repair, final refresh, and atomicity audit under one `ClaimIntegrityPolicy`.
- Move preliminary evidence seeding out of claim understanding into `InputGroundingSeed` and the evidence lifecycle as first-class seed states.
- Keep the two-pass grounding intent where evidence grounding materially improves claim quality. V2 does this by allowing claim understanding to consume `InputGroundingSeed`; any new search/fetch/retrieval belongs to evidence lifecycle unless a deputy-approved verifier shows the behavior must remain before claim extraction.
- Preserve ACS prepared snapshots by default; V1 snapshot invalidation requires deputy/Captain approval.

**Failure modes**

- no valid AtomicClaim -> damaged report;
- contract validation failure after allowed repair -> damaged report;
- selected claim missing from prepared snapshot -> damaged report or explicit ACS retry path;
- prompt/model unavailable -> provider failure warning or damaged report depending on recovery.

**ACS compatibility contract**

V2 must consume V1 `PreparedStage1Snapshot` by default. Migration may normalize shape internally, but it must preserve:

- draft id and job association;
- selected AtomicClaim IDs and selected-claim finality;
- original `statement` text for selected claims;
- prepared evidence/source seed data when present;
- retry/restart/hide behavior for active drafts;
- runner reuse semantics so final jobs do not redo prepared Stage 1 unless the draft is explicitly invalid.

Invalidating existing snapshots, dropping selected IDs, changing active draft behavior, or forcing users to reselect claims requires deputy/Captain approval and an explicit user/admin behavior plan.

**Pre-6B hardening requirements**

Before any prompt-backed Claim Understanding execution is enabled:

- V2 ingress must carry the full ACS prepared snapshot or a typed equivalent sufficient for `ClaimContract` migration, including selected claim ids, selected claim statements, detected language/input type, and Gate 1 summary fields.
- Shell-only fallback ids, including `AC_V2_SHELL_01`, are allowed only inside the damaged pre-cutover envelope. Real Claim Understanding must fail closed or produce a damaged Gate 1 result when no valid selected/direct-input claim contract can be produced.
- The 6B gateway output schema must be the `ClaimUnderstandingResult` envelope (`v2.claim_understanding_result.0`). Accepted results carry a `ClaimContract` validated against `v2.claim_contract.0`; blocked/damaged results must not fabricate one.
- Cache-policy tests must cover ACS-prepared input and direct input so equivalent prompt-backed decisions have stable keys without requiring an ACS hash where no ACS snapshot exists.

**Post-6B.0 review update**

LLM Expert review found that a direct `ClaimContract` prompt output cannot honestly represent direct-input failure, no-valid-claim states, or non-ACS runs without fabricating fields such as V1 ACS migration metadata. Slice 6B.1a implemented the required `ClaimUnderstandingResult` envelope at `24f55d4a`:

- accepted branch contains a valid `ClaimContract`;
- blocked/damaged branches contain no fabricated claim contract and carry typed integrity events and damaged/blocked reasons;
- structural fields such as hashes, current date, profile ids, and ACS migration facts are copied by gateway/migration code, not invented by the LLM;
- direct-input success does not require or fabricate `prepared-stage1-v1` migration metadata.

**Post-6B.1b update**

Slice 6B.1b implemented the minimal UCM/profile/model-policy plumbing at `2f1b60a4`:

- `claimboundary-v2` is valid for prompt frontmatter and UCM prompt management, and a clean-room prompt source now exists for contract review, but it remains excluded from file seeding until a separate activation decision approves runtime use;
- V1 `claimboundary` and V2 `claimboundary-v2` prompt profiles are validated as separate frontmatter profiles;
- `claim_understanding_gate1` has a concrete, blocked model-policy metadata record covering tier, temperature, call budget, schema retry count, timeout, token budget, fallback, and escalation behavior;
- gateway execution remains blocked until prompt, model, and cache approvals are all recorded.

The current boundary is the completed 6B.3c-4B provider-boundary ownership contract. The completed 6B.3b approval covered only mock adapter mechanics, 6B.3c-0 covered only no-dispatch orchestration, 6B.3c-1 covered only frame construction/rejection, 6B.3c-4A covered only an internal injected-callback scaffold, and 6B.3c-4B covers only inert provider-ownership contracts and guards. Do not enable `claimboundary-v2` file seeding, flip prompt/model/cache approvals, make `claim_understanding_gate1` executable, build a real provider callback factory, wire production callers for dispatch, expose public results, enable cache IO, or submit live jobs without separate Captain/deputy approval, updated LLM Expert/runtime review, and commit-first/runtime-refresh discipline.

---

## 8. Stage Contract: Evidence Lifecycle

**Purpose:** Build a transparent, source-backed evidence corpus for selected AtomicClaims.

**Inputs**

- `PipelineRunContext`
- `ClaimContract`
- optional seeded evidence/source bodies from Stage 1 or URL/PDF resolution

**Semantic LLM tasks**

- query planning;
- source relevance assessment;
- evidence extraction;
- applicability assessment;
- source/evidence quality judgments where semantic;
- contradiction/refinement decision inputs.

**Structural tasks**

- search/source provider calls;
- fetch retry/circuit behavior;
- deduplication by structural source identity;
- budget accounting;
- source and evidence ID assignment;
- acquisition trace recording.

**Outputs**

- `EvidenceCorpus`;
- acquisition trace;
- source reliability signals;
- evidence warnings;
- input to `SufficiencyAssessment`.

**Retrieval policies**

V2 should replace a tangled loop with named retrieval policies:

| Policy | Purpose | Notes |
|---|---|---|
| Baseline research | Establish initial supporting/opposing/neutral corpus | Always present unless input invalid |
| Primary-source refinement | Seek source-native decisive documents when secondary/current routes are insufficient | Avoid token-overlap selection |
| Contradiction search | Seek evidence-backed contestation, not opinion-only doubts | Must preserve contestation policy |
| Supplementary language lane | Add cross-language coverage when useful | Source-language-first; no English default, no forced translation, no English analysis fallback; cross-language policy is UCM-owned |
| Evidence scarcity handling | Surface real-world scarcity as info/warning, not system error | Uses warning materiality policy |

**Simplification from V1**

- Make seeded evidence a first-class state instead of special remap plumbing.
- Separate semantic relevance/applicability from structural fetch and dedupe.
- Replace deterministic text overlap and vague-string checks with LLM assessment or structural-only checks.
- Keep budget controls, but make them owned by config snapshot and observable in the ledger.
- Source type, trust, reliability, and applicability that affect analysis must be LLM/UCM-governed and generic. Provider metadata may be used as structural evidence, not as hidden verdict-affecting classification.

---

## 9. Stage Contract: Sufficiency Gate

**Purpose:** Decide whether the corpus is adequate to continue to boundary/verdict work or whether retrieval should refine, warn, or produce a damaged/low-confidence report.

**Inputs**

- `EvidenceCorpus`
- `ClaimContract`
- config snapshot

**Outputs**

- `SufficiencyAssessment`
- continuation/refinement decision
- evidence scarcity warning when material

**Rules**

- Sufficiency is a gate, not a hidden loop condition.
- Evidence scarcity is an analytical reality category unless caused by system failure.
- Degrading issues must be visible; recovered routine fallbacks should be silent/info.
- Sufficiency must not use hardcoded domain keywords or language-specific assumptions.

---

## 10. Stage Contract: Boundary Formation

**Purpose:** Form ClaimAssessmentBoundaries from EvidenceScopes and assign evidence to boundaries.

**Inputs**

- `EvidenceCorpus`
- `ClaimContract`
- `SufficiencyAssessment`

**Semantic LLM tasks**

- scope normalization/equivalence;
- boundary clustering;
- boundary rationales where useful for audit;
- low-coherence explanation.

**Structural tasks**

- boundary ID generation;
- coverage matrix construction;
- evidence assignment by stable IDs after semantic assignment;
- fallback boundary creation when no valid boundary can be formed.

**Outputs**

- `BoundarySet`
- `claimBoundaryId` assignments
- coverage matrix
- boundary warnings/events

**Simplification from V1**

- Do not use exact string fingerprints or Jaccard-like text overlap to decide semantic grouping.
- Keep `CB_GENERAL`-style fallback behavior, but make it observable through structured events/warnings where material.
- Persist or expose enough boundary rationale for debugging if LLM clustering produces low coherence.

---

## 11. Stage Contract: Verdict Adjudication And Gate 4

**Purpose:** Produce evidence-cited verdicts with integrity checks and confidence gating.

**Inputs**

- `ClaimContract`
- `EvidenceCorpus`
- `BoundarySet`
- config snapshot
- prompt/model policy

**Semantic LLM tasks**

- advocate verdict;
- challenger verdict;
- reconciliation;
- grounding validation;
- direction validation/repair;
- source reliability calibration if productized;
- confidence reasoning.

**Structural tasks**

- citation ID validation;
- evidence ID existence checks;
- consume typed LLM provider outcomes from the prompt/model/LLM gateway;
- structural parse/citation validation after the gateway has returned a typed result;
- phantom citation stripping;
- Gate 4 status calculation from canonical confidence policy.

**Outputs**

- `VerdictSet`
- Gate 4 status
- citation/grounding/direction repair ledger
- verdict warnings

**Rules**

- Preserve advocate/challenger/reconciler role separation.
- Preserve baseless challenge enforcement: opinion-only contestation cannot reduce truth/confidence.
- Preserve safe downgrade when integrity checks cannot recover.
- Unify the current multiple confidence schemes into one canonical confidence contract.
- Do not collapse this stage into a one-shot verdict prompt.

---

## 12. Stage Contract: Aggregation, Article Adjudication, And Report Result

**Purpose:** Convert verdicts and evidence into one canonical report result.

**Inputs**

- `ClaimContract`
- `EvidenceCorpus`
- `BoundarySet`
- `VerdictSet`
- config snapshot

**Semantic LLM tasks**

- article-level adjudication where configured and justified;
- narrative generation;
- explanation quality checks if semantic.

**Structural tasks**

- aggregation math over LLM-produced fields;
- quality-gate object construction;
- canonical warning projection;
- result schema serialization.

**Outputs**

- `ReportResult`
- `reportMarkdown`
- adapter-ready compatibility views

**Rules**

- `ReportResult.verdict`, `truthPercentage`, confidence, quality gates, and warnings are authoritative.
- API/UI/export/metrics/validation adapters must not independently infer verdict meaning except as legacy fallback.
- Article adjudication should have an explicit model task, UCM-owned temperature/budget, and observable failure behavior.
- Narrative/report-quality failures should be visible to admins and user-visible only when material under warning policy.

### 12.1 Report Generation Regression Control And Rollback

Report generation is a quality-bearing surface. Future improvements to narrative generation, article adjudication, report structure, markdown/HTML rendering, warning presentation, or explanation style must be regression-controlled before they become the default.

**Baseline and replay assets**

- The baseline is pinned deployed comparator reports, Captain-defined benchmark inputs, stored fixtures, and `Docs/AGENTS/*quality-expectations*.json`; current master V1 is not a quality oracle.
- Where possible, report-generation candidates should replay from stored canonical packets (`ClaimContract`, `EvidenceCorpus`, `BoundarySet`, `VerdictSet`, warnings, and quality gates) so narrative/result-writer changes can be evaluated without paying for full research.
- Stored-evidence replay is valid only when the upstream evidence/verdict contracts are unchanged. If a change alters claim understanding, evidence lifecycle, boundary formation, verdict adjudication, or warning materiality, full pipeline validation is required at the approved gate.

**Versioning and rollback unit**

Every public report must carry enough provenance to identify the active report-generation path: report-generation profile id/version, report writer version, narrative prompt section/version/hash when applicable, model task ids/versions, model/provider, config snapshot hash, result schema version, renderer/export adapter version, source commit, and replay/evidence-packet id/hash when used.

The primary rollback unit is the approved report-generation profile. Prompt sections, model task routing, report-generation config, renderer/export profile, and narrative rubric should be UCM/profile-versioned where they affect output. If a candidate regresses, the default profile can be switched back to the previous approved profile without code rollback. Code-level result-writer regressions still require normal source rollback or a guarded fix.

**Candidate comparison**

Candidate report-generation changes must be compared against the current approved profile on the same stored inputs/evidence packets where possible. Each material difference is classified as:

| Classification | Meaning | Promotion effect |
|---|---|---|
| `improvement` | better fidelity, clarity, evidence transparency, warning honesty, or user usefulness without quality loss | may support promotion |
| `neutral` | wording/layout changes with no material quality or trust change | acceptable if tests pass |
| `accepted_tradeoff` | a known downside accepted for a larger quality/product reason | requires deputy/Captain approval record |
| `regression` | weaker evidence transparency, misleading narrative, wrong emphasis, hidden caveat, broken citation, verdict drift, or poorer comparator/Q-code result | blocks promotion and triggers rollback/quarantine |

Semantic comparison must use an LLM-owned rubric or deputy review, not keyword, regex, or surface-similarity scoring. Structural checks may verify schema validity, citation id existence, markdown/HTML renderability, link integrity, and adapter field presence.

**Promotion gate**

A report-generation candidate can become default only after:

- schema, adapter, markdown/static HTML, and render smoke tests pass;
- report-quality/Q-code checks pass against `Docs/AGENTS/report-quality-expectations.json`;
- candidate-vs-current comparison is completed for the approved golden corpus and stored replay packets;
- warning materiality, evidence citations, analysis focus provenance, and damaged-report behavior remain visible and consistent;
- multilingual/input-neutral and Captain-defined comparator expectations do not regress;
- cost/latency impact is measured and any increase has a quality-protection reason;
- deputy review signs off on all `accepted_tradeoff` items and no unresolved `regression` remains.

Failed report-generation candidates are classified as `keep`, `quarantine`, or `revert` before further broadening, following the failed-attempt recovery rule. A regressing profile must not remain selectable as default; if kept for diagnosis, it is marked experimental/internal and excluded from normal runtime selection.

---

## 12.2 Stage Failure, Event, And Gate Matrix

Each stage contract includes this matrix. Implementers may add more events, but they may not remove the listed failure/gate behavior without review.

| Stage | Failure/damaged behavior | Required events | Gate or warning behavior |
|---|---|---|---|
| Claim understanding | damaged report when no valid selected AtomicClaim or contract repair fails | claim extraction start/end, contract validation, repair attempt/result, ACS snapshot consumed/migrated/invalid | Gate 1 status; ACS invalidation requires approval |
| Evidence lifecycle | system failure warning/error when all acquisition paths fail; analytical scarcity warning when evidence is genuinely sparse | query plan, acquisition attempt/result, fetch retry, evidence extraction, applicability, seed reuse, budget use | no hidden stage skip; scarcity surfaced through warning policy |
| Sufficiency gate | low-confidence/damaged path only when corpus cannot support a trustworthy verdict | sufficiency assessment, refinement decision, stop/continue reason | D5/sufficiency status; material insufficiency visible |
| Boundary formation | fallback boundary when clustering fails recoverably; damaged report only if no coherent boundary/evidence assignment can be produced | normalization, clustering, fallback boundary, orphan assignment, coverage matrix build | boundary concentration/low coherence warnings through warning policy |
| Verdict adjudication | safe downgrade or damaged report when citation/grounding/direction integrity cannot recover | advocate/challenger/reconciliation calls, citation validation, direction repair, safe downgrade, Gate 4 | Gate 4 canonical confidence status; baseless challenges do not reduce verdict |
| Aggregation/result writer | damaged report when canonical result cannot be serialized; admin warning for narrative/adjudication fallback unless material | aggregation, article adjudication, narrative generation, quality gate build, result serialization | one canonical verdict/truth/confidence/warning authority |
| External adapters | adapter failure must not reinterpret the canonical result; user-visible failure only when product output is degraded | adapter input schema, legacy fallback use, field mapping, export/render status | adapter parity tests; warnings use shared display policy |

---

## 13. Prompt, Config, And Model Governance

V2 must treat prompts, config, and model routing as first-class architecture.

**Prompt registry**

- Every analysis prompt section has a registered owner, semantic task, variables, output schema, model task, and test coverage.
- Prompt frontmatter variables must match rendered variables.
- Prompt render warnings should fail contract tests for required sections.
- Orphan sections such as `CLAIM_GROUPING` are quarantined until a real V2 caller is proven.
- Inline analysis-affecting prompt text in code is not allowed in new implementation.
- Prompt text changes require explicit human approval and LLM Expert review.

**Config snapshot**

- UCM/JSON defaults remain authoritative for analysis-affecting tunables.
- TypeScript schemas and JSON defaults must remain synchronized.
- Duplicate JSON keys should be detected by tests or config loading.
- Hardcoded analysis-affecting temperatures, thresholds, token budgets, and timeouts are not allowed unless classified as fixed structural constants.
- Dead/unwired knobs should fail a dedicated config contract test.

**Model policy**

- One model task registry owns model tier, provider preferences, temperature, token budget, timeout, retry, and fallback policy.
- Semantic tasks should batch aggressively, cache identical/equivalent inputs, and use lower-cost models where fit.
- Provider fallback is structural resilience; it must not silently change prompt/task semantics.
- The model task registry is also the cost/latency governor. Each task records max calls, token budget, timeout, retry/fallback policy, cache policy, escalation policy, and the quality signal that justifies any stronger model, extra retrieval, fuller debate, or repair loop.
- Retry/fallback policy follows the prevention-first recovery taxonomy in Section 4.4: provider and schema retries are bounded structural recovery; hidden semantic repair and stochastic answer fishing are forbidden.

**Cache governance**

Any analysis-affecting cache key must include every value that can change the semantic answer:

- prompt section name and prompt content hash;
- model task id, provider, model, temperature profile, and output schema version;
- config snapshot hash and result schema version;
- source/evidence identity when evidence is part of the task;
- language/search context where it affects retrieval or interpretation;
- current-date bucket when the task reasons about current facts;
- compatibility adapter version when cached output feeds public projection.

Cache reuse for structurally identical inputs is allowed. Cache reuse for semantically equivalent but textually different inputs is allowed only if equivalence is LLM-owned or structurally proven by stable IDs.

**Prompt genericity and multilingual gate**

Before any V2 prompt migration or cutover:

- no analysis prompt may include test-case terms or concrete examples derived from Captain validation inputs;
- no prompt may steer by concrete date periods, regions, people, or topic vocabulary unless it is an input variable or provider-facing search query;
- prompt variable rendering must be warning-free for every required section;
- multilingual behavior must be source-language-first and must not force English analysis fallback;
- LLM Expert review and explicit human approval are required for actual prompt text edits.

**Quarantine list before implementation**

The implementation plan must classify these prompt/config/model surfaces before code starts:

- `CLAIM_GROUPING` prompt section;
- `model-tiering.ts` vs active model resolver behavior;
- legacy model tier aliases and `orchestrated` profile usage;
- duplicate or weakly wired config knobs, including timeout/token/temperature fields identified in the baseline;
- hardcoded call-site temperatures and budgets.

**V2 UCM structure follow-up**

The V2 prompt/model/config design should not keep expanding the overloaded V1 `pipeline.default.json` shape. The staged proposal in `Docs/WIP/2026-05-14_V2_Slice_6B_Prompt_Model_Review_Package.md` is the current working direction:

- keep the existing versioned UCM storage backend (`config_blobs`, `config_active`, `config_usage`);
- keep V2 prompt-profile plumbing and the clean-room `claimboundary-v2` prompt source separate from runtime activation until the 6B.3 execution gate decides file seeding and approvals;
- define model task registry, stage policy, cache policy metadata, and report-generation profile as task-oriented V2 configuration concepts;
- defer broad UCM UI changes until the V2 content model is reviewed, then add a task-oriented admin view over the existing raw config editor;
- ensure every V2 prompt/model/config activation records approval state, verifier, active hash, and rollback target.

UCM deputy review refined this into a minimum path: do not add V2 prompt/model task policy into the old broad `pipeline` config as a long-term home. First support `claimboundary-v2` as a separate prompt profile and add a task-oriented model policy for `claim_understanding_gate1`; keep bespoke UI work minimal until the V2 task-policy model stabilizes.

Post-6B.3b-completion status: the minimum path now includes a clean-room prompt source, contract tests, a reviewed 6B.3 execution approval package, a revised implementation plan, completed 6B.3a structural foundation, completed 6B.3b mock adapter contract after Claude Opus/Gemini `MODIFY` findings, and a 6B.3c debate consolidation that requires a no-dispatch structural slice before runtime dispatch. `claimboundary-v2` is valid/manageable for prompt-profile validation and import, and `apps/web/prompts/claimboundary-v2.prompt.md` exists for review, but it is intentionally not file-seeded or executable. `claim_understanding_gate1` has blocked task-oriented model-policy metadata and is only structurally eligible for future execution after separate approval. Before broad prompt/model execution or cutover, V2 still needs the task-oriented analysis-profile/admin-gate track: model task registry shape, stage policy shape, cache policy metadata, approval-state visibility, config snapshot provenance, and rollback targets.

---

## 14. Warning And Event Policy

V2 must have one warning authority for UI, markdown, HTML export, API summaries, metrics, and validation.

The authority may be `warning-display.ts` or a reviewed replacement, but there must be exactly one product-facing materiality policy.

**Severity rule**

Before any warning is user-visible, apply:

> Would the verdict be materially different if this event had not occurred?

- No: silent or admin-only info.
- Maybe: warning at most.
- Yes: error or severe/damaged report.

**Required categories**

- Routine operations: silent/info unless aggregate quality degrades.
- System failures: warning/error/severe depending on verdict impact.
- Analytical reality: info/warning, never error/severe.
- Internal diagnostics: info unless the result is actually damaged.

Adapters must not filter warnings by raw severity without the shared policy.

**Primary issue selection**

API summaries, UI headers, markdown, static HTML, metrics, and validation must use the same primary-issue policy:

1. Pick blocking damaged-report events first.
2. Then pick user-visible errors that can change verdict direction or confidence tier.
3. Then pick user-visible warnings that materially caveat the same verdict direction.
4. Do not promote admin-only diagnostics to user-visible primary issues.
5. Do not surface recovered routine fallbacks as primary issues.

Raw severity is an input to the policy, not the policy itself.

---

## 15. External Compatibility Matrix

Default posture: preserve behavior through adapters. Retire or break only with approval.

Adapters have a named owner, a field-level mapping, a fallback lifetime, and a fixture-driven verifier. The canonical V2 fields below refer to the `ReportResult` schema skeleton in Section 6.

| Surface | V2 disposition | Canonical field authority | Legacy fallback | Required verifier |
|---|---|---|---|---|
| API job detail | Preserve through adapter | `ReportResult.verdict`, `truthPercentage`, `confidence`, `qualityGates`, `warnings`, `report.markdown`, `evidence`, `claimBoundaries` | Read `3.2.0-cb` fields when canonical V2 absent; no expiry without approved migration | Serialization tests for V2 fixture and legacy fixture |
| API job list/quick fields | Preserve through adapter | same canonical verdict/truth/confidence plus primary issue from warning policy | derive only when canonical fields absent | Quick-field tests proving no rederived label when V2 verdict exists |
| Runner/internal run-job | Preserve | result writer output plus run metadata | V1 runner path remains default until cutover | route contract test or integration test |
| ACS draft/prepared snapshot | Preserve/migrate | `ClaimContract.selectedAtomicClaimIds`, prepared snapshot metadata, seed state | consume V1 snapshot; migration is internal | draft-to-job reuse contract test |
| Job UI | Preserve behavior | compatibility view over canonical result, warnings, evidence, boundaries | legacy display helpers only for legacy reports | fixture-driven UI adapter/component tests and render smoke check whenever result adapters change |
| Markdown report | Preserve through adapter | canonical verdict, warnings, evidence citations, quality gates, narrative | legacy markdown read-only | warning/result parity test |
| Static HTML export | Preserve through adapter unless retirement approved | canonical verdict, warnings, quality gates, citations, narrative | legacy fields only when reading legacy reports | static export fixture test and render smoke check |
| Metrics/report-quality scripts | Versioned adapter | canonical quality gates, warnings, result metadata, Q-code outputs | explicit legacy parser branch | parser tests for V2 and legacy fixtures |
| Validation/calibration scripts | Versioned adapter | canonical claims, verdict/truth/confidence, warnings, evidence counts | explicit legacy parser branch | validation-summary adapter tests |
| Historical reports | Preserve read compatibility | legacy stored `resultJson` and `reportMarkdown` remain readable | no automatic retirement | legacy fixture/read test |
| Warning display registry | Preserve or reviewed replacement | `WarningEvent.displaySeverity`, visibility, primary issue policy | legacy warnings mapped through shared policy | cross-surface warning parity test |

Cross-language ownership: JSON schemas and fixtures are the shared source of truth between TypeScript pipeline code and C# API code. TypeScript types and C# DTOs are generated from or tested against those fixtures; neither language owns the public contract alone.

---

## 16. Deterministic Semantic Hotspot Disposition

V2 implementation must include a hotspot disposition checklist before code lands. Every hotspot needs an automated verifier, static-review verifier, or explicit deputy-approved waiver. "Where practical" is not sufficient.

| Hotspot family | V2 rule | Required verifier |
|---|---|---|
| substring anchor/salience checks | Structural ID checks only; semantic preservation via LLM | static guard plus unit test for ID-only structural path |
| input-type heuristics | Structural routing only; semantic route choice via LLM if needed | route contract test or deputy waiver |
| source-type regex/string bucketing | Provider metadata is structural only; source type/trust/reliability/applicability that affects analysis is LLM/UCM-governed | source-classification contract test |
| token-overlap primary-source selection | LLM source completeness/relevance assessment | retrieval-policy test proving token overlap is not the selector |
| hardcoded non-directional labels overriding evidence direction | LLM/schema policy, not deterministic label list | verdict/direction contract test or static review |
| vague-string scope quality checks | LLM scope quality signal | scope-quality prompt/schema contract test |
| platform/TLD/name-length reliability heuristics | Curated UCM or LLM source-trust policy where analysis-affecting | source-trust policy review and config test |
| exact scope fingerprints for grouping | Stable structural IDs only; semantic equivalence via LLM | boundary equivalence test |
| Jaccard-like boundary merge | Structural cap plus LLM equivalence | boundary cap/equivalence test |
| narrative/report regex quality checks | Structural formatting only or LLM rubric | report-quality contract test |
| English fallback language behavior | Preserve source language or explicitly mark non-analysis fallback | multilingual contract test |

---

## 17. Test And Validation Strategy

Implementation must start with contract tests and adapters, not live jobs.

**Pre-implementation required tests**

Pre-implementation tests are grouped by slice to avoid one oversized first change:

| Slice | Required tests before slice implementation |
|---|---|
| Contract fixtures | V1 fixture, V2 fixture, warning fixture, ACS prepared snapshot fixture, JSON schema validation |
| Compatibility adapters | API list/detail serialization, markdown parity, static HTML export, metrics parser, validation parser, historical report read |
| V2 shell | disabled-by-default routing, kill switch, no public result replacement, V1 hot-path still runnable |
| Prompt/config/model gateway | prompt registry/frontmatter/variables, prompt genericity audit, multilingual prompt audit, model task registry, cache key/invalidation tests |
| Claim understanding | Gate 1 contract, ACS snapshot consumption/migration, selected-ID finality, `InputGroundingSeed` behavior |
| Evidence lifecycle | retrieval policy tests, seed reuse, source-language-first behavior, source classification boundary, acquisition warning policy |
| Sufficiency/boundary | sufficiency warning tests, boundary equivalence, fallback boundary, coverage matrix |
| Verdict/Gate 4 | citation integrity, direction repair, baseless challenge, safe downgrade, canonical confidence policy |
| Aggregation/result writer | canonical verdict/truth/confidence, quality gates, warning event schema, article adjudication fallback, report-generation regression-control fixtures |
| UI/export/render | fixture-driven UI adapter test, markdown output test, static HTML render smoke check whenever adapters change |
| Hotspot gate | one verifier or deputy-approved waiver for every hotspot in Section 16 |

**Safe verification during implementation**

- `npm test`
- `npm -w apps/web run build`
- focused unit/contract tests for touched surfaces
- `git diff --check`

**Expensive/live validation**

Run only after approval, with commit-first and runtime-refresh discipline. Use only Captain-defined analysis inputs. Compare against:

- `Docs/AGENTS/Captain_Quality_Expectations.md`
- `Docs/AGENTS/benchmark-expectations.json`
- `Docs/AGENTS/report-quality-expectations.json`
- exact/family comparator reports where available

**Cutover quality gates**

- Gate 1 and Gate 4 parity or improvement against approved comparator reports and Q-code expectations;
- no evidence transparency regression: every verdict has traceable supporting/opposing evidence references where applicable;
- no warning materiality regression across UI, markdown, HTML export, API summaries, metrics, and validation;
- no UI/API/report/export compatibility regression unless explicitly approved;
- Analysis Session UX checks pass: Unattended is the normal default, mode selection is visible before submission, server-side mode/cap enforcement is authoritative, forced-review conditions are honored, and no job is created before finalized focus selection;
- report-generation regression controls pass for any narrative/result-writer change: versioned provenance, stored-evidence replay where valid, candidate-vs-current comparison, rollback-ready profile, and deputy signoff for accepted tradeoffs;
- no deterministic semantic hotspot introduced without a verifier or deputy-approved waiver;
- no material multilingual/input-neutrality regression on Captain-defined inputs and approved comparator families;
- runtime/cost measured against current-stack baselines using separate buckets for preparation, interactive wait, queue, active final runtime, retrieval, verdict, and export;
- cost/latency measured against the quality-constrained envelope in Section 4.3: normal runs target 6-10 minutes and $0.50-$1.25, complex runs target 10-18 minutes and $1.25-$3.25, and review is required above the documented thresholds;
- any accepted over-budget run records the quality-protection reason, such as more than 3 selected AtomicClaims, evidence-backed contestation, source scarcity, provider degradation, citation/direction risk, or Captain/deputy-approved deep-review mode;
- retry and repair rates are low, ledgered, and accepted by deputy review; high rates block cutover until the responsible contract, prompt, model policy, evidence packet, or gate is improved;
- deputy signoff records exact comparators used, exact vs variant status, local vs deployed status, and any accepted residual risk.

---

## 18. Implementation Slice Outline After Approval

This is not approval to implement. It is the proposed order once the target spec passes review.

1. Golden result, ACS, warning, and legacy fixtures plus JSON schema contract tests.
2. Compatibility adapters for V1 fixture, V2 fixture, API list/detail, job UI, markdown, static HTML, metrics, validation, calibration, and historical reports.
3. Isolated V2 shell returning a fixture/stub result, disabled by default behind the pre-cutover gate.
4. Prompt/config/model gateway skeleton, cache governance, and dead-knob detection.
5. Claim understanding and Gate 1, including ACS snapshot consumption/migration, `InputGroundingSeed`, focus recommendation metadata, and mode-cap contract tests.
6. Slice 6A.5 pre-6B contract/wiring hardening: full ACS snapshot ingress, shell-placeholder isolation, claim-understanding cache-policy alignment, and 6B prompt-output-to-ClaimContract schema alignment.
7. Evidence lifecycle and sufficiency gate, with retrieval policies and source-language-first behavior.
8. Boundary formation.
9. Verdict adjudication and Gate 4.
10. Aggregation and canonical result writer, including report-generation provenance and regression-control harness.
11. Analysis Session UI shell over existing preparation/job endpoints, preserving backend draft/job separation.
12. Formal `AnalysisSession` API facade only if the shell needs a stable facade before cutover; do not merge draft and job persistence.
13. Pre-cutover verification path that can compare V1/V2 without replacing public output.
14. Comparator-based quality review and approved live validation only at the named gate.
15. Controlled cutover with rollback plan.
16. Mandatory V1 pipeline cleanup after V2 gates pass and cutover stabilizes.
17. Mandatory naming-normalization cleanup after V1 deletion: surviving package, entrypoint, schema, and documentation names become the final clean names, with a guard against leftover rebuild labels in runtime code.

No expensive validation or live jobs are part of slices 1 through 11 unless Captain explicitly approves the spend.

Failed-validation recovery during implementation must classify the prior attempt as `keep`, `quarantine`, or `revert` before broadening scope.

**Cutover checklist**

- V1 hot path still runnable.
- Pre-cutover gate and kill switch verified.
- API list/detail parity verified.
- UI fixture render and smoke check pass.
- Analysis Session shell checks pass: visible mode selector, Unattended default, Attended review path, forced-review path, selection-only focus editing, revise-input escape hatch, and report focus provenance.
- Report-generation promotion/rollback checks pass: golden corpus comparison, stored-evidence replay where applicable, rollback profile pointer, and no unresolved report-quality regression.
- Markdown and static HTML export parity pass.
- ACS draft reuse and selected-ID behavior pass.
- Warning parity and primary issue selection pass.
- Historical report read compatibility pass.
- Metrics/validation parser compatibility pass.
- Comparator/Q-code quality gate accepted by deputy team.
- Rollback path documented.
- V1 cleanup list has owner, verifier, and deletion criteria.
- Final naming-normalization slice has owner, verifier, and runtime-code guard.

---

## 18.1 Mechanism Retention And Cleanup Ledger

No V1 mechanism may be carried into V2 only because V1 had it. Each retained mechanism needs an owner, allowed mechanism boundary, removed/quarantined parts, and verifier.

No V1 type or prompt may be copied into V2 under a new name. If a concept is required, the implementation slice must define the minimal V2 contract from this specification and verify why each field exists. Similar field names are acceptable only at compatibility seams or when they are canonical domain terms, not because V1 already exposed them.

V1 prompt cleanup condition: V1 analysis prompt files, prompt profiles, prompt sections, and UCM active prompt entries are removal debt once V2 owns the corresponding prompt-backed task. They must be removed from runtime selection after all of these are true:

- the V2 task has its own prompt profile, section id, required-variable contract, output schema, approval record, and tests;
- no runtime code, prompt registry, config profile, or model-task route can load the V1 prompt/profile/section;
- historical report readability relies only on stored report data, fixtures, and adapters, not on reloading V1 prompts;
- static prompt-boundary guards and prompt/config/model contract tests pass;
- deputy signoff records whether any V1 prompt material is archived for historical reading only or deleted from the forward tree.

| Mechanism family | V2 owner | Preserve/simplify/remove rule | Verifier before cutover |
|---|---|---|---|
| Claim integrity repairs | Claim understanding | preserve contract validation, repair, atomicity, and salience intent; simplify overlapping retries under `ClaimIntegrityPolicy` | Gate 1/ACS/contract tests |
| Two-pass grounding | Claim understanding plus evidence lifecycle | preserve grounding via `InputGroundingSeed`; new retrieval belongs to evidence lifecycle | claim quality fixture tests and seed reuse tests |
| Retrieval loops | Evidence lifecycle | preserve baseline, refinement, contradiction, multilingual/source-language policies; remove hidden loop branches | retrieval policy tests and acquisition ledger checks |
| Source reliability | source-trust policy owner, decided before Stage 4/5 implementation | preserve source-trust signal; consolidate duplicate deterministic and LLM calibration paths into one reviewed policy | source-trust policy review, config test, quality validation when verdict math changes |
| Scope normalization and boundaries | Boundary formation | preserve CAB semantics and coverage matrix; remove exact text semantic equivalence | boundary equivalence and coverage tests |
| Verdict debate and repair | Verdict adjudication | preserve debate roles, citation integrity, baseless challenge policy, direction repair, safe downgrade; remove duplicate provider retry/parse handling from stage code | Gate 4 and citation/direction tests |
| Article adjudication | Aggregation/result writer | preserve only as explicit, observable, UCM/model-task-owned mechanism; default behavior-preserving until quality validation approves changes | adjudication fallback and quality tests |
| Report generation profile and narrative rendering | Aggregation/result writer plus external adapters | preserve output quality through versioned profiles, stored-evidence replay, candidate-vs-current comparison, and rollback-ready defaults; no default promotion with unresolved regression | report-generation regression harness, Q-code checks, render smoke tests, deputy signoff |
| Warning display | Warning/event policy | preserve materiality policy; remove raw-severity-only public filtering | cross-surface warning parity tests |
| Result adapters | External adapters | preserve behavior through field-level mapping; remove independent verdict derivation when canonical fields exist | API/UI/export/metrics/validation fixture tests |
| V1 analysis prompt files/profiles/sections | Prompt/model/LLM gateway and config snapshot | no reuse, copy, alias, or active runtime loading; remove from runtime after V2-owned prompt task is approved and verified; archive only if historical reading value remains | prompt-boundary static guard, prompt/config/model contract tests, UCM active-profile check, deputy signoff |
| Legacy config/model surfaces | Prompt/model/LLM gateway and config snapshot | quarantine orphan/dead/unwired surfaces until consumer proof; remove only with verifier | prompt/config/model contract tests and deputy signoff |

V1 cleanup can start only after this ledger has a completed verifier for the relevant mechanism and the deputy team approves deletion or quarantine. Cleanup means removing dead/stale/non-hot-path code after replacement is proven, not deleting the current product path first. Once V2 owns the public path and the stabilization gate passes, remaining V1 analysis pipeline code is treated as removal debt with owners and deadlines; it is not an indefinitely supported variant. After V1 deletion, final naming normalization is part of cleanup completion, not optional polish.

---

## 19. Complexity Reduction Criteria

V2 is not considered simpler unless these are true:

- one canonical result writer;
- one confidence/Gate 4 contract;
- one warning display/materiality authority;
- one prompt/model task registry;
- one config snapshot per run;
- adapters read canonical result instead of reinterpreting it;
- stage inputs/outputs/failure modes are typed and testable;
- the orchestrator contains no semantic analysis logic;
- retrieval policies are named and observable rather than hidden loop branches;
- semantic decisions are LLM-owned or structural-only by explicit classification;
- stale prompt/config/model surfaces are quarantined or removed with proof;
- every retained V1 mechanism has a named V2 owner and verifier.

---

## 20. Rejected Alternatives

| Alternative | Rejected because |
|---|---|
| Patch the current pipeline in place | Preserves ownership drift and does not satisfy replacement intent |
| Delete/clean V1 hot path before V2 exists | Creates broken intermediate system risk |
| Collapse verdicting into one prompt | Loses citation integrity, adversarial review, direction repair, and Gate 4 protections |
| Keep adapters guessing result shape | Preserves the current compatibility drift |
| Remove ACS as plumbing | ACS is an external workflow contract |
| Treat warning severity as raw filtering | Violates warning materiality policy |
| Keep exact text fingerprints for semantic grouping | Violates LLM-intelligence and multilingual rules |
| Start with live benchmark jobs | Violates cost and commit/runtime discipline for spec phase |
| Migrate prompts immediately | Prompt edits require explicit approval and LLM Expert review |

---

## 21. Open Decisions For Deputy Review

These decisions are no longer all equally open. Some are implementation-entry defaults; others are dependency-gated and cannot remain unresolved past the slice they govern.

| Decision | Draft default | Must be resolved before | Escalate to Captain if |
|---|---|---|---|
| Public V2 schema version string | `4.0.0-cb`, with `4.0.0-cb-precutover` before cutover | Slice 1 contract fixtures | public API/persisted report compatibility would break |
| V1 pipeline implementation lifetime | temporary only; remove after V2 cutover and stabilization | Slice 1 contract fixtures plus cleanup ledger | proposal tries to keep V1 as a parallel production variant |
| Historical V1 read compatibility lifetime | no automatic expiry for persisted reports; preserve reads through adapters/fixtures, not pipeline code | Slice 1 contract fixtures | retirement or migration is proposed |
| V1 behavioral archaeology | use old commits/worktrees, not retained forward-code paths | Git history plus tagged/deployed revision references | proposal keeps V1 implementation for backward investigation |
| V2 namespace/path | `apps/web/src/lib/analyzer-v2/` with `runClaimBoundaryPipelineV2(context)` | Slice 3 V2 shell | repo organization outside analyzer scope changes |
| ACS V1 snapshot handling | consume/migrate by default and preserve selected IDs | Slice 1 fixtures and Slice 5 claim understanding | invalidation or user-visible draft loss is proposed |
| Static HTML export | preserve through adapter | Slice 2 adapters | retirement is proposed |
| Analysis Session UX | one continuous user-facing session; internal draft/job persistence remains separate; mode choice visible before each submission, default Unattended | before public V2 UX/cutover | proposal hides mode, removes forced-review safeguards, creates jobs before finalized focus, or changes caps without server enforcement |
| Source reliability | behavior-preserving source-trust policy until reviewed quality validation approves verdict-math changes | before Stage 4/5 implementation | verdict math changes materially |
| Article adjudication | keep explicit, observable, UCM/model-task-owned; default behavior-preserving | before aggregation/result writer implementation | cost/latency increase is material |
| Prompt migration | defer actual prompt edits until approved implementation slice | before gateway or stage prompt edits | any prompt text edit is proposed |
| Live validation plan | contract tests first, live jobs only after implementation readiness | before comparator-quality gate | any live/expensive validation is requested |

---

## 22. Reviewer Prompt

Review `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md` as the cleaned target architecture for replacing the current FactHarbor ClaimAssessmentBoundary pipeline. Treat Captain intent as replacement-with-clean-architecture, not additive refactoring. Check whether the draft is genuinely simpler than the current pipeline while preserving Gate 1, Gate 4, evidence transparency, ClaimAssessmentBoundary semantics, ACS compatibility, warning materiality, multilingual robustness, LLM-owned semantic decisions, and external UI/API/report/export compatibility. Focus on hidden coupling, over-preserved legacy complexity, missing adapters/tests, prompt/config/model governance gaps, deterministic semantic hotspots, broken-intermediate risk, and any place where the spec weakens report quality or trust.

Expected reviewer output:

- verdict: approve / approve with required changes / reject;
- blockers;
- required changes before implementation approval;
- optional improvements;
- escalation needed: yes/no, with reason.

---

## 23. Verification State

This document is now the operative V2 target specification with implementation progress addenda.

6B.* implementation addenda are a parallel gated Claim Understanding runtime/provider activation track. They do not replace the main rebuild Slice 1+ sequence and do not belong to the V1 monitor backlog queue. Current 6B.* blocked/allowed constraints are centralized in `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96` in `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`; future 6B.* slice plans and handoffs must reference that checklist version/hash or a newer superseding version/hash.

- Analyzer source changes for Slice 6A.5 were committed separately at `724dd9aa`.
- Slice 6B.2 prompt-source and contract-test changes were committed separately at `8a1ef8cd`.
- This status update tracks the current source slice without prompt/config/API/UI/public runtime/live-job behavior changes.
- Slice 6B.3a implementation is committed at `2d14c89a`; it changes only structural Analyzer V2 foundation code and tests.
- Slice 6B.3b implementation is committed at `04742922`; it adds only mock adapter contract code and tests.
- Slice 6B.3c debate returned `MODIFY`; 6B.3c-0 structural no-dispatch implementation is committed at `3223d99f`; 6B.3c-1 dispatch-frame contract implementation is committed at `8a663d3f`; 6B.3c-4A scaffold implementation is committed at `1b0ff9c2` with Captain approval pointer recorded in its confirmation package and handoff; 6B.3c-4A guard hardening is committed at `531a0ff6`; 6B.3c-4B adds only inert provider-boundary ownership contracts and guards; 6B.3c-4C is a docs-only source-wiring approval package for approval-authority cleanup before provider factory wiring; later dispatch-capable Claim Understanding integration remains unapproved.
- Slice 6B.2 implementation verification passed: focused 6B.2 tests, full Analyzer V2 unit slice, web build, safe `npm test`, clean-room scans, and `git diff --check`.
- No live jobs or validation batches were submitted.

Run `npm run index` and `git diff --check` after this file and tracking docs are updated.
