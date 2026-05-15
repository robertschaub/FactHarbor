# V2 Slice 7B Evidence Source Acquisition And Task Policy Approval Package

**Date:** 2026-05-15
**Status:** draft for review; docs-only; no source authorization
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `f3f98cef` (`docs: record v2 evidence intake gate`)
**Prior source gate:** 7A `08c7ddae` (`feat: add v2 evidence lifecycle intake`)
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

Define the next Evidence Lifecycle boundary before any source acquisition implementation.

Slice 7A proved only this:

- accepted internal `ClaimUnderstandingStageHandoff` with a non-null `ClaimContract` can become an internal `EvidenceLifecycleIntake`;
- blocked, damaged, or malformed handoffs fail closed and produce no intake;
- no research, provider, fetch, cache, public result, or orchestrator behavior exists yet.

7B must decide how a future accepted `EvidenceLifecycleIntake` may become a source-acquisition/task-policy contract without starting executable provider work.

## 2. Review Input And Consolidated Decision

Review trace: Lead Architect, LLM Expert, and Senior Developer reviewers assessed the next gate in this Codex thread on 2026-05-15. Consolidated decision for this package:

- proceed with a docs-only 7B package;
- do not write an inert source-acquisition code slice yet;
- do not pause this planning package for the `Plastic recycling is pointless` Claim Understanding policy debt;
- do not approve provider/search/fetch implementation, prompt/model/schema/UCM mutation, public exposure, cache IO, or live jobs.

The missing decision is ownership, not TypeScript syntax. Encoding code now would prematurely freeze provider/search/fetch boundaries, evidence task-policy authority, Source Reliability integration, and fail-closed semantics.

## 3. Scope Allowed By This Package

Allowed now:

- this WIP approval package;
- guardrail/status/handoff updates that clearly mark 7B as docs-only;
- a proposed later 7C source envelope limited to inert V2-owned contracts, tests, and static guards if review approves it.

Not allowed by this package:

- editing `apps/web/src/lib/analyzer-v2/evidence-lifecycle/*`;
- editing gateway policy, model policy, UCM defaults, prompt files, provider factory, runtime activation, public result/report/API/UI/export files, or V1 analyzer files;
- running live jobs.

## 4. Future Contract Shape To Review

The future source contract should be designed around these internal concepts. Names are proposed for review, not implemented names.

| Concept | Purpose | Non-negotiable |
|---|---|---|
| `SourceAcquisitionRequest` | Converts accepted `EvidenceLifecycleIntake` into a source-acquisition request. | May exist only for `EvidenceLifecycleStartDecision.status === "intake_ready"`. |
| `EvidenceAcquisitionPolicySnapshot` | Frozen task/config policy for retrieval strategy, budgets, task IDs, and fallback behavior. | Must be carried as a run-context/policy snapshot, not live singleton reads during a run. |
| `RetrievalPolicyPlan` | Names which retrieval policies are requested: baseline, primary-source refinement, contradiction search, supplementary language lane, scarcity handling. | Task policy may name allowed modes and budgets; any retrieval selection that interprets meaning must be made by an approved LLM task/prompt policy, not deterministic rules. |
| `SourceCandidate` | Structural record for provider-returned sources. | Provider rank/snippet/domain/fetch success is not truth, relevance, probative value, or credibility. |
| `SourceFetchTrace` | Fetch status, retry/rate-limit/circuit events, source IDs, and failure class. | Structural only; no hidden semantic filtering. |
| `ApplicabilityDecision` | LLM-owned applicability/relevance decision for source/excerpt against claim and evidence need. | No keyword, regex, language, or overlap heuristics. |
| `EvidenceExtractionPacket` | LLM-owned extraction of `EvidenceItem`, `EvidenceScope`, claim direction, probative value, and source-type rationale. | Must be schema validated and source/citation linked. |
| `SourceReliabilitySignalRef` | Reference to existing Source Reliability signal when available. | Diagnostic/contextual unless later verdict policy approves numerical influence. |
| `EvidenceCorpus` | Canonical Stage 2 output containing sources, evidence, scopes, trace, applicability, source reliability signals, and warnings. | Public result remains damaged until a later result/report gate. |

## 5. Ownership Boundaries

| Owner | Owns | Does not own |
|---|---|---|
| Evidence Lifecycle | Source-acquisition request shape, retrieval policy plan, acquisition trace semantics, `EvidenceCorpus` contract, fail-closed intake behavior. | Concrete provider SDK calls, UI/API exposure, public verdict meaning. |
| Provider/Search/Fetch owner | Search provider calls, fetch attempts, retries, rate limits, circuit behavior, structural source identity, raw fetch status. | Semantic relevance, source credibility meaning, probative value, verdict impact. |
| Prompt/model gateway | Semantic query planning, relevance/applicability, evidence extraction, source-type rationale, sufficiency where semantic. | Runtime approval without Captain/LLM Expert gate, hidden singleton policy reads. |
| Source Reliability service | Existing SR service/cache/admin behavior and versioned source-trust evaluations. | V2 pipeline rewrite, direct truth-percentage multipliers, forked V2 SR service. |
| Result/report/API/UI owner | Later public projection of canonical `ReportResult`. | Exposing 7B/7C internal packets before a public result gate. |

## 6. Semantic Versus Structural Boundary

Allowed deterministic structural work in later source slices:

- null/empty validation;
- schema validation;
- source ID and citation ID construction;
- URL/source identity normalization for dedupe;
- provider/fetch status recording;
- retry, timeout, rate-limit, and circuit accounting;
- budget accounting;
- ledger event construction.

Must be LLM-owned through approved prompt/UCM-governed task policy, or separately approved semantic policy:

- query planning;
- source relevance;
- applicability;
- evidence extraction;
- claim direction;
- probative value;
- evidence strength;
- source meaning, credibility, bias, independence, and expertise;
- EvidenceScope compatibility;
- source-language equivalence;
- sufficiency.

Task policy freezes routing, budgets, prompt/profile references, retrieval modes, and approval state. It must not encode deterministic meaning decisions.

Explicitly forbidden:

- V1 evidence-quality-filter carry-forward;
- vague phrase counts;
- keyword/regex evidence classification;
- Jaccard or token-overlap semantic dedupe;
- English-default source routing;
- provider rank, fetch success, source type, URL/domain, or language as hidden truth/relevance/probative signals.

## 7. Source Reliability Boundary

Source Reliability remains unchanged. V2 may define only a thin consumption boundary.

Allowed:

- reference existing SR signal records in `EvidenceCorpus`;
- record cache hit/miss/stale metadata returned through a future thin SR port in the run ledger;
- include source-trust context in later approved adjudication prompts;
- show source portfolio diagnostics to reviewers/admins.

Forbidden without later review:

- applying a direct truth-percentage multiplier from SR;
- hardcoded outlet/domain/country/language/source weights;
- forking or renaming the SR service for V2;
- changing SR prompts/config/admin/cache behavior as part of Evidence Lifecycle;
- directly importing SR service/cache modules or performing SR cache IO in 7C;
- treating search-provider rank as credibility.

## 8. Task Policy Snapshot Requirements

A later executable Evidence Lifecycle source gate must define a frozen policy snapshot before any provider work. At minimum:

- task IDs for query planning, applicability, extraction, and sufficiency;
- prompt profile and section references;
- model tier/provider/model profile;
- max calls, token budgets, timeout, retry budget, and fallback policy;
- cache policy, including no-store/no-read default until separately approved;
- retrieval policy limits by mode;
- language-lane policy and source-language-first behavior;
- warning materiality mapping;
- escalation rules for provider collapse, budget exhaustion, low evidence, and schema/parse failures;
- approval pointer and rollback behavior.

This package does not approve a UCM migration or activation. It only states what future policy ownership must define.

## 9. Fail-Closed Rules

A later source contract must preserve these rules:

- no source acquisition request unless `EvidenceLifecycleStartDecision.status === "intake_ready"`;
- no acquisition for blocked/damaged/malformed Claim Understanding handoffs;
- no acquisition from public damaged pre-cutover envelope data;
- no acquisition from hidden diagnostics or adapter attempt metadata;
- direct URL and ACS runtime execution remain blocked unless a later gate explicitly names and verifies them;
- provider failure, search collapse, fetch collapse, budget exhaustion, and insufficient evidence produce typed outcomes, not fabricated evidence.

## 10. Later 7C Source Envelope Proposal

If 7B is approved, the next source slice should be contract-only and may add only the files listed below. Committing 7B does not authorize 7C implementation; 7C still requires a separate reviewed source package.

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.ts`
- focused tests under `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/`
- static guards in `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Allowed 7C behavior:

- pure functions that map `EvidenceLifecycleStartDecision.status === "intake_ready"` to a non-executable `SourceAcquisitionRequest`;
- typed blocked decisions for non-ready intake;
- no async, no provider/search/fetch call, no prompt/model adapter call, no cache IO, no public output, no orchestrator wiring.

Blocked in 7C:

- provider SDK imports;
- concrete provider callback factories;
- search provider imports;
- source fetch implementation;
- SR service imports;
- prompt rendering or model calls;
- gateway approval flips;
- UCM/default JSON mutation;
- public API/UI/report/export changes;
- live jobs;
- V1 imports, cloning, or cleanup.

## 11. Verifier Requirements For 7C

Minimum verifier set for a later 7C contract-only source slice:

- focused Evidence Lifecycle source-acquisition tests;
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`;
- Analyzer V2 unit slice if import boundaries change;
- `npm -w apps/web run build`;
- `git diff --check`;
- static scan proving no V1 analyzer/prompt/type reuse, no provider SDK/search/fetch imports, no cache/storage IO, no public surface changes, no prompt/model/schema/UCM changes.

No live jobs are meaningful for 7C because it must remain non-executable.

## 12. Open Items

- Claim Understanding policy-quality review for `Plastic recycling is pointless` `blocked/no_valid_claim` remains separate and must be resolved before broad benchmark/cutover claims.
- UCM/task-policy storage model for V2 evidence tasks is not decided by this package.
- Concrete source/search/fetch provider ownership is not implemented by this package.
- Source Reliability numerical verdict influence remains unapproved.
- Public V2 result/report exposure remains blocked.

## 13. Review Questions

Reviewers should answer:

1. Does 7B correctly keep ownership decisions out of source code until reviewed?
2. Is the proposed 7C source envelope narrow enough?
3. Are semantic versus structural boundaries clear enough to prevent deterministic evidence-meaning logic?
4. Is Source Reliability integration correctly limited to an unchanged thin port?
5. Are any Captain-level decisions required before drafting 7C?
