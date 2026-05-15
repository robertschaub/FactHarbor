# V2 Slice 7J Evidence Prompt/Schema/Model/UCM Approval Package

**Date:** 2026-05-15
**Status:** consolidated approval package after LLM Expert/deputy review; approved by Captain for 7J-1; 7J-1 implemented at `1a874b8d`; no runtime/source execution authorization
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `63acb0eb` (`docs: record v2 direct-text canaries`)
**Prior gate:** 7I `f58373a5` (`docs: define v2 evidence task design gate`)
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`
**Guardrails:** `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`

## 1. Purpose

Define the approval direction for V2 Evidence Lifecycle prompt sections, structured output schemas, model task policy, and UCM placement before any prompt/model/schema/config/source implementation begins.

7I assigned future semantic ownership to LLM-owned tasks. 7J turns that into a reviewable approval package. It must preserve the clean-room boundary, keep Source Reliability unchanged, avoid V1 prompt/type/code reuse, and prevent a vague approval from becoming source execution authority.

7J is a gate package. It does not by itself authorize:

- source edits;
- test edits;
- prompt file edits;
- schema implementation;
- UCM/default JSON changes;
- model-policy registry edits;
- gateway/task approval flips;
- prompt loader/model adapter/runtime wiring;
- provider/search/fetch execution;
- cache IO;
- Source Reliability integration;
- public exposure;
- live jobs;
- V1 cleanup.

## 1.1 Review Consolidation

Review inputs:

- Gemini senior architecture/LLM-systems review: `APPROVE`; suggested categorical missing-evidence dimensions and long-term `analysis-profile` naming.
- Senior Developer review: `MODIFY`; required a concrete verifier envelope, task-policy authority clarification, and stronger prompt co-location safety.
- Claude Opus LLM Expert/senior architect review: `MODIFY`; required tighter non-authorization wording, no baked-in retry default, preservation of the optional `evidence_quality` split, warning-owner separation, inert-test wording, and explicit Captain canary execution blocking.

Consolidated decision:

- Keep 7J as direction-only and non-executable.
- Apply the required wording and verifier hardening in this package.
- Require direct Captain approval before any 7J-1 source package because the next step affects prompt-profile placement, task split boundaries, and future canary sequencing.

## 2. Captain Intent Captured

Captain intent relevant to this gate:

- V2 replaces V1; V1 analysis code and prompts are removal debt after V2 cutover and stabilization.
- V2 must not reuse or clone V1 analysis code, prompts, prompt sections, or V1-owned types.
- Source Reliability remains unchanged until a later reviewed thin-port package.
- Quality has priority over cost and speed, but cost and latency should be reduced conceptually by better architecture, batching, and prevention-first design rather than retry-heavy repair loops.
- The UI is not frozen: the final product should improve Atomic Claim preparation/selection/analysis-session usability, but Evidence Lifecycle prompt/model work must not change UI before the approved UI/session gate.
- Live jobs are allowed only when a committed, runtime-refreshed executable gate makes them meaningful. Captain-approved future direct-text canaries are:
  - `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
  - `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
  These inputs must not be substituted, paraphrased, translated, or run before a reviewed executable gate.

## 3. Recommended 7J Decision

Approve **direction only** for a later non-executable source package that may define clean-room V2 Evidence Lifecycle prompt sections, output schemas, and task-policy metadata. Do not approve runtime execution.

Recommended sequence after this package:

1. 7J review consolidation with LLM Expert/deputy findings. Complete in this package.
2. Captain approval of the consolidated 7J direction.
3. 7J-1 non-executable prompt/schema/model-policy source package, with exact file envelope and verifiers.
4. 7K inert task contract types only if still useful after 7J-1.
5. Later provider/search/fetch execution activation design.
6. Later source execution wiring, Source Reliability thin-port, sufficiency, and public exposure gates.

## 4. Task Set Direction

Use the existing Evidence Lifecycle task keys as the first task boundary set:

| Task key | Prompt section candidate | Owns | Must not own |
|---|---|---|---|
| `evidence_query_planning` | `V2_EVIDENCE_QUERY_PLANNING` | LLM-owned search intent, retrieval strategy, source-language strategy, supplementary-lane reasoning, and query-plan rationale under approved UCM/model policy. | Provider IO, fetch retries, deterministic keyword expansion, English defaulting, cache IO, source reliability, sufficiency, public output. |
| `evidence_applicability` | `V2_EVIDENCE_APPLICABILITY` | LLM-owned assessment of whether acquired source content is applicable to the `ClaimContract` and selected AtomicClaims. | Provider rank, URL/domain heuristics, source credibility, sufficiency, verdict direction, public output. |
| `evidence_extraction` | `V2_EVIDENCE_EXTRACTION` | LLM-owned extraction of evidence statements, claim direction, EvidenceScope metadata, probative value/evidence strength, and extraction provenance from approved source content. If probative value/evidence strength is later split out, it must move to a separate LLM-owned `evidence_quality` task, not deterministic code. | Verdict generation, sufficiency, Source Reliability scoring, report narrative, public output. |
| `evidence_sufficiency` | `V2_EVIDENCE_SUFFICIENCY_GATE` | LLM-owned sufficiency assessment after approved acquisition/extraction, including structured categorical missing-evidence dimensions, stop/refine/caveat/damaged recommendation, and material scarcity classification input. | Retrieval implementation, provider IO, verdict confidence, final warnings without warning-owner approval. |

Do not add `evidence_source_relevance` or `evidence_quality` as separate tasks in the first source package unless LLM Expert review proves that the split reduces complexity or improves quality. The first design should avoid task fragmentation.

`evidence_sufficiency` is a deliberate 7J extension over the narrow 7I query/applicability/extraction task trio. It is included so sufficiency remains an explicit gate instead of becoming hidden retrieval-loop or verdict-stage behavior.

## 5. Prompt Source Direction

Preferred short-term prompt placement:

- Use the existing clean-room V2 prompt profile `claimboundary-v2`.
- 7J does not authorize editing `apps/web/prompts/claimboundary-v2.prompt.md`. A later 7J-1 source package must name the exact prompt-file envelope, carry Captain approval and LLM Expert review, and remain non-executable.
- Keep `claimboundary-v2` not file-seeded and not executable until a later activation gate explicitly approves seeding/activation.
- Keep prompt sections generic, topic-neutral, multilingual, and free of Captain validation input terms.
- Do not copy V1 prompt wording, examples, section structure, profile content, or V1 analyzer-owned contract names.

Rationale:

- Reusing the V2 prompt profile keeps UCM manageable while the task model stabilizes.
- A new prompt profile now would force broader UCM/admin decisions before the Evidence Lifecycle contracts are stable.
- The final naming-normalization slice after V1 deletion can remove awkward temporary labels if needed.

Prompt co-location safety for a later 7J-1 source package:

- tests must prove `V2_CLAIM_UNDERSTANDING_GATE1` was not changed accidentally;
- tests must prove `claimboundary-v2` file seeding remains disabled unless a later activation gate explicitly changes it;
- static hygiene tests must reject Captain canary/input terms and concrete benchmark vocabulary;
- boundary/static tests must prove no V1 prompt sections, V1 wording, or V1-owned prompt structure were copied or aliased.

## 6. Schema Direction

Each prompt-backed task should use a task-result envelope, not a bare success object. This prevents prompt/schema failures from fabricating evidence, applicability, sufficiency, or scarcity.

Candidate schema families for a later source package:

| Task | Candidate schema id | Success payload | Failure payload |
|---|---|---|---|
| Query planning | `v2.evidence_query_planning_result.0` | bounded query plan, retrieval policy references, source-language/supplementary-lane decision, provenance rationale | blocked/damaged status, structured task events, no query plan |
| Applicability | `v2.evidence_applicability_result.0` | per-source/content applicability decisions and bounded rationale | blocked/damaged status, structured task events, no applicability result |
| Extraction | `v2.evidence_extraction_result.0` | evidence items, evidence scopes, claim direction, probative value/evidence strength, extraction provenance | blocked/damaged status, structured task events, no evidence items |
| Sufficiency | `v2.evidence_sufficiency_assessment.0` | sufficiency status, categorical missing dimensions, continue/refine/caveat/damaged recommendation, material scarcity candidate | blocked/damaged status, structured task events, no sufficiency assessment |

Schema rules:

- Use discriminated status branches such as `accepted`, `blocked`, and `damaged`.
- Do not emit a real empty `EvidenceCorpus` before source acquisition and extraction have executed.
- Do not emit evidence scarcity before approved acquisition, extraction, and sufficiency assessment.
- Keep provider/search/fetch structural outcomes separate from semantic applicability and evidence strength.
- Keep Source Reliability fields absent or explicitly pending until the later SR thin-port package.
- Use categorical values for LLM classifications and bounded continuous values only where the LLM is making an assessment that genuinely needs scale.
- Sufficiency may produce only a material scarcity candidate. Warning materialization, registration, and user visibility remain owned by a later warning/result/report gate.

## 7. Model Policy Direction

Model policy should be task-oriented and frozen into `PipelineRunContext` before task execution. Do not let stages read mutable global policy during a run.

Recommended policy shape for a later source package:

| Task | Quality posture | Cost/latency posture |
|---|---|---|
| `evidence_query_planning` | strong enough for multilingual/source-language planning and contradiction/refinement intent | batch selected AtomicClaims in one call where possible; bounded query count from UCM |
| `evidence_applicability` | reliable enough to avoid source-admission drift | batch source packets; no per-source call explosion unless UCM-approved |
| `evidence_extraction` | strongest among the Evidence Lifecycle tasks when source content is dense, technical, legal, or multilingual | packet compression and bounded source slices before model call; no retry-first design |
| `evidence_sufficiency` | strong enough to stop weak evidence honestly before verdict work | one structured gate call after corpus assembly; no hidden loops |

Policy constraints:

- exact provider/model/tier/temperature/token/timeout/budget values belong in UCM/model-task policy, not hardcoded code;
- default posture should be near-deterministic for structured contracts unless LLM Expert approves a different setting;
- 7J approves no default retry policy. A later source package may propose a per-task structural parse/schema retry only through UCM/model-task policy and LLM Expert review; semantic repair loops are not approved by this package;
- batching is preferred over many small calls;
- failure telemetry must distinguish parse failure, schema failure, blocked policy, provider failure, timeout, and budget exit;
- every call must record prompt hash, model task, provider/model, output schema version, task-policy snapshot/version/hash, config snapshot hash, timing, token usage, retry count, cache decision, and approval pointer.

Task-policy authority clarification:

- a later 7J-1 source package may add non-executable Evidence Lifecycle task metadata only;
- if a source package touches gateway/model-policy registry files, it must name those files explicitly and prove blocked-only semantics;
- no task metadata may create executable gateway state, prompt/model approval, cache approval, provider execution, or product/runtime dispatch authority.

## 8. UCM Placement Direction

Do not keep expanding the overloaded V1-era `pipeline.default.json` as the long-term home for V2 task policy.

Short-term:

- keep prompt content under existing UCM prompt storage with profile `claimboundary-v2`;
- keep file seeding disabled until activation is approved;
- keep the current static Evidence Lifecycle task-policy snapshot non-executable until source packages add reviewed policy metadata.

Target direction:

- introduce a task-oriented V2 analysis profile domain on top of the existing UCM storage backend;
- make task policy visible by task key, prompt section, schema id, model policy, cache policy, approval status, active hash, verifier, and rollback target;
- use existing raw config/admin surfaces until a later UI gate approves task-oriented read-only dashboards and activation flows;
- make budgets, caps, source-language policy, supplementary-lane policy, model routing, and cache policy UCM-owned where they affect analysis behavior.

Name decision:

- No config-domain name is approved by 7J.
- `analyzer-v2` is acceptable as the current internal module/test namespace while the rebuild is in progress.
- `analysis-profile` is the preferred long-term human-facing UCM/admin concept because it should survive post-V1 naming normalization better.
- A later UCM source package must validate the concrete config type/profile naming against existing API/admin conventions before any schema/default JSON change.

## 9. Prevention-First Cost And Quality Measures

7J should prevent retry-heavy design by construction:

- use task-result envelopes so blocked/damaged outcomes are valid outputs, not schema failures that invite retries;
- keep source-language-first prompt policy and avoid English fallback prompts;
- batch selected AtomicClaims and source packets where quality allows;
- compress source packets structurally before prompt calls without semantic filtering in code;
- keep prompt prefixes stable and dynamic source content last for caching efficiency;
- make query plans bounded and explicit rather than letting downstream code fan out;
- make sufficiency an explicit stop/refine/caveat/damaged gate so verdict work does not compensate for weak evidence;
- reserve stronger models for extraction/sufficiency only when task policy or quality gates indicate need;
- surface budget exits honestly through sufficiency or damaged states rather than inventing confidence.

## 10. Blocked Surfaces

This package must not be used as approval for:

- creating or editing prompt files;
- adding Zod schemas or TypeScript result types;
- adding or changing UCM config/default JSON;
- adding or changing gateway/model/cache policy registries;
- prompt loader or model adapter wiring;
- provider SDK imports;
- search/fetch/parser/network execution;
- cache key construction or IO;
- Source Reliability import/call/cache access/admin changes;
- orchestrator/product/runtime wiring;
- hidden artifact expansion;
- public API/UI/report/export/compatibility changes;
- ACS/direct URL execution;
- live jobs;
- execution of the Captain-approved direct-text canaries before a committed, runtime-refreshed executable gate;
- prompt/source/schema/config/test changes containing Captain canary terms or benchmark vocabulary except where those inputs are listed as locked Captain-approved future live-job canaries;
- V1 analyzer/prompt/type reuse;
- V1 cleanup.

## 10.1 Minimum 7J-1 Verifier Envelope

A later non-executable 7J-1 source package must name its exact file envelope and include at least these verifiers:

- prompt contract/render tests for any new V2 Evidence Lifecycle sections;
- prompt static-hygiene tests rejecting Captain canary terms, topic-specific examples, English-only assumptions, provider-specific wording, V1 prompt sections, and V1 prompt wording;
- schema tests for accepted, blocked, and damaged branches for every new task-result envelope;
- tests proving task-policy metadata remains non-executable;
- tests proving no prompt file seeding or active-profile flip occurred;
- tests proving no gateway/model/cache approval flip occurred;
- Analyzer V2 boundary guard coverage for no V1 analyzer imports, no V1 prompt reuse, no provider SDK imports, no cache IO, no Source Reliability imports/calls, and no public/API/UI/report/export exposure;
- build verification when TypeScript, schema, config, or prompt-loader-adjacent files change;
- `git status --short`, `git diff --check`, and `git diff --cached --check` because new files are otherwise invisible to plain unstaged diff checks.

## 11. Required Review Questions

Reviewers should answer:

1. Does 7J correctly keep prompt/schema/model/UCM work non-executable?
2. Is the four-task set sufficient, or should any task be split/merged before source work?
3. Is the prompt placement direction (`claimboundary-v2` sections, no file seeding yet) appropriate?
4. Are the schema envelopes strong enough to prevent fabricated evidence, scarcity, or sufficiency?
5. Is the model-policy direction quality-first while still controlling cost and latency?
6. Is the name deferral correct, with `analyzer-v2` only as current internal namespace and `analysis-profile` as the preferred long-term human-facing UCM/admin concept?
7. Are any decisions high-risk enough to require direct Captain confirmation before the next docs/source package?

## 12. Reviewer Prompt

Use this prompt for LLM Expert, Lead Architect, Senior Developer, Claude/Gemini, or deputy reviewers:

> Review `Docs/WIP/2026-05-15_V2_Slice_7J_Evidence_Prompt_Schema_Model_UCM_Approval_Package.md` as a FactHarbor V2 Evidence Lifecycle approval package. Treat Captain intent as clean-room V2 replacement, quality before cost/speed, no V1 prompt/code/type reuse, multilingual/source-language-first behavior, Source Reliability unchanged until a later thin-port gate, prevention-first design, and no public/runtime/source execution without later reviewed gates. Return `approve`, `modify`, or `reject`; list blockers, required changes, optional improvements, UCM naming preference, and whether direct Captain escalation is needed.

## 13. Verification For This Package

Docs-only verification:

- `git diff --check`;
- `git diff --cached --check` after staging new files;
- no source/test/config/prompt/schema file changes;
- no live jobs;
- reviewer confirmation that 7J authorizes direction only.

## 14. Approval Boundary

If Captain approves this consolidated package, the next allowed step is still only a scoped package for non-executable prompt/schema/model-policy source artifacts.

Exact Captain wording required before source implementation:

> Approved to implement the next 7J non-executable source package under `Docs/WIP/2026-05-15_V2_Slice_7J_Evidence_Prompt_Schema_Model_UCM_Approval_Package.md`, limited to clean-room V2 Evidence Lifecycle prompt sections, structured output schemas, non-executable task-policy metadata, and inert verifier-style tests only. No live LLM/provider/search/fetch execution, runtime execution, file seeding, approval flips, provider/search/fetch execution, cache IO, Source Reliability integration, public exposure, live jobs, direct-text canary execution, or V1 cleanup.

Approval and implementation record:

- Captain approved the exact 7J-1 implementation boundary in conversation on 2026-05-15.
- 7J-1 implementation commit: `1a874b8d` (`feat: add v2 evidence task contracts`).
- Completion handoff: `Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_Slice_7J1_NonExecutable_Evidence_Task_Contracts.md`.
- The implemented slice remains non-executable and does not authorize prompt/model runtime execution, file seeding, approval flips, provider/search/fetch execution, cache IO, Source Reliability integration, public exposure, live jobs, direct-text canary execution, ACS/direct URL execution, or V1 cleanup.
