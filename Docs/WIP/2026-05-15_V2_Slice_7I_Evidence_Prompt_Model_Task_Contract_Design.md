# V2 Slice 7I Evidence Prompt/Model Task Contract Design

**Date:** 2026-05-15
**Status:** approved by deputy-team review; docs-only; no source authorization
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `db082989` (`docs: record v2 source acquisition port contract`)
**Prior source gate:** 7H `24ad47fd` (`feat: add v2 source acquisition port contract`)
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

Define the future LLM-owned Evidence Lifecycle task contracts before any query planning, applicability, extraction, provider/search/fetch execution, source execution activation, prompt text, model routing, schema, or UCM source changes.

7H created only an inert structural port contract. The next missing decision is semantic task ownership: what query planning, source applicability, and evidence extraction may decide, and how those decisions stay separate from provider/search/fetch IO.

7I is docs-only. It must not authorize source/test edits, prompt files, schemas, UCM/default JSON, gateway/model policy changes, provider/search/fetch execution, cache IO, Source Reliability integration, public exposure, orchestrator wiring, live jobs, or V1 cleanup.

## 2. Review Consolidation

Deputy-team debate result: **choose 7I path A, docs-only prompt/model task contract design**.

Rejected for now:

- source execution activation sequencing, because execution authority before semantic task contracts would let structural IO shape analytical behavior;
- inert task source types, because types should encode a reviewed task design rather than become the place where task semantics are decided implicitly.

Recommended sequence:

1. 7I docs-only task contract design.
2. 7J Captain + LLM Expert approval package for task prompts/schemas/model-policy direction.
3. 7K inert source task contract types only if still useful.
4. Later provider/search/fetch execution activation design.
5. Later actual source execution wiring.

## 3. Scope Allowed By This Package

Allowed now:

- this WIP approval package;
- status/guardrail/handoff updates that mark 7I as docs-only;
- review questions for later prompt/model/source packages.

Blocked now:

- source edits;
- test edits;
- prompt text;
- prompt profile registration or file seeding;
- schema files;
- UCM/default JSON edits;
- gateway/model/cache policy edits;
- gateway/task approval flips or executable-status flips;
- prompt loader, model adapter, or runtime dispatch wiring;
- hidden artifact or observability-ledger expansion;
- provider/search/fetch execution;
- provider SDK imports;
- network/parser imports;
- direct `fetch(...)`;
- cache keys, cache reads, cache writes, storage IO;
- Source Reliability imports, calls, cache access, admin/config changes, or signal consumption;
- orchestrator/product wiring;
- public API/UI/report/export/compatibility changes;
- ACS/direct URL execution;
- live jobs;
- V1 analyzer/prompt/type reuse or cleanup.

## 4. Task Ownership

Future Evidence Lifecycle semantic tasks:

| Task | Owns | Must not own |
|---|---|---|
| `evidence_query_planning` | LLM-owned search intent, query strategy, source-language and supplementary-lane reasoning under approved prompt/model/UCM policy. | Provider IO, fetch retries, deterministic keyword expansion, English defaulting, cache IO, public output. |
| `evidence_applicability` | LLM-owned assessment of whether acquired source content is applicable to the `ClaimContract` and selected AtomicClaims. | Provider rank, URL/domain/source type as hidden relevance; Source Reliability scoring; sufficiency. |
| `evidence_extraction` | LLM-owned extraction of evidence statements, direction, scope metadata, probative value/evidence strength, and extraction provenance from approved source content. If probative value is later split out, it must move to a separate LLM-owned `evidence_quality` task, not deterministic code. | Verdict generation, source credibility scoring, sufficiency, warning materiality, public report text. |

Optional future task:

- `evidence_source_relevance` may be split from applicability only if a later package proves it removes complexity or improves quality. Otherwise applicability should own relevance-to-claim decisions to avoid extra task fragmentation.

## 5. Inputs And Outputs To Design Later

7I does not define schemas. It records the expected conceptual inputs and outputs for later approval.

Future task inputs may include:

- `ClaimContract`;
- selected AtomicClaim IDs;
- frozen task-policy snapshot/version/hash;
- retrieval-policy catalog;
- source-acquisition request id;
- source-acquisition port contract version;
- structural source records after future acquisition;
- source content packet and structural fetch provenance after future fetch.

Future task outputs may include:

- query-plan entries with provenance and bounded rationale;
- applicability decisions with source/content references;
- extracted evidence statements with source references, claim direction, EvidenceScope metadata, probative value/evidence strength, and extraction confidence;
- structured integrity events and blocked/damaged reasons.

Future task outputs must not include:

- public result/report text;
- final verdicts;
- sufficiency decisions;
- Source Reliability scores;
- deterministic conversions from extraction confidence to probative value or evidence strength;
- hidden provider credentials;
- raw prompt text;
- unbounded model prose.

## 6. Semantic Boundary

These decisions must be LLM-owned through approved prompt/model/UCM policy:

- query planning;
- source relevance and applicability;
- evidence extraction;
- claim direction;
- probative value;
- source-language strategy;
- supplementary-language lane decisions;
- contradiction/refinement needs;
- source content meaning.

Forbidden in deterministic code:

- claim-text keyword routing;
- regex or token-overlap query generation;
- English-default query planning;
- deterministic language routing;
- source type/domain/provider rank/fetch success as relevance, probative value, credibility, or truth signal;
- deterministic mapping from source type, domain, provider rank, fetch success, or extraction confidence to probative value or evidence strength;
- selected-claim-count heuristics that change semantic retrieval behavior;
- deterministic evidence extraction.

Allowed deterministic plumbing:

- schema validation;
- ID/reference validation;
- status transitions;
- budget counters once approved by UCM;
- timeout/retry counters once approved;
- structural source identity checks.

## 7. Multilingual And Source-Language Policy

Source-language-first remains a future policy requirement.

Future tasks must preserve:

- original language as first-class input;
- no forced translation as a prerequisite;
- no English default unless explicitly approved in UCM/prompt policy;
- supplementary language lanes as approved LLM/UCM-governed decisions, not hardcoded code paths;
- tests that compare non-English and English structural behavior where no semantic execution is approved.

## 8. Prompt/Model/UCM Approval Path

7I authorizes no prompt/model/UCM changes.

Before any task becomes executable:

- Captain approval plus LLM Expert review is required;
- deputy-team review may supplement that approval but does not replace Captain approval for prompt-backed V2 tasks;
- prompt sections must be clean-room V2-owned and UCM-managed;
- model/task policy must be versioned and frozen into the run context;
- structured output schemas must be reviewed;
- failure mapping must be defined;
- cost/time budgets must be UCM-owned, not hardcoded;
- rollback and approval pointers must be recorded.

## 9. Failure And Warning Boundary

7I must not add warnings.

Future classification ownership:

- pre-execution or not-wired states are not evidence scarcity;
- provider/search/fetch collapse after execution is a system-failure candidate;
- evidence scarcity is analytical reality only after approved acquisition, extraction, and sufficiency;
- parse/schema failures are task execution failures, not evidence scarcity;
- recovered fallback behavior is silent or admin-only unless materially degrading;
- user-visible warning registration requires a later result/report gate.

Sufficiency remains separate from extraction and source acquisition.

## 10. Source Reliability Boundary

Source Reliability remains unchanged.

Future task contracts may reference only a future SR thin-port principle:

- SR signals attach only after source records exist;
- no SR imports, cache reads, evaluations, admin/config changes, or score consumption before a later SR-port package;
- SR signals must not become hidden verdict weighting or source applicability authority without quality validation and approval.

## 11. Recommended Next Gates

After 7I:

1. 7J Captain + LLM Expert approval package for task prompts, schemas, model policy, and UCM placement.
2. 7K inert source task contract types, if still useful after 7J.
3. Provider/search/fetch execution activation design.
4. Actual source execution wiring.
5. Source Reliability thin-port implementation package.
6. EvidenceCorpus population and sufficiency package.
7. Public result/report/API/UI exposure package.

## 12. Verification For This Package

Docs-only verification:

- `git diff --check`;
- no source/test/config/prompt/schema file changes;
- no live jobs;
- reviewer confirmation that 7I authorizes design only.

## 13. Review Questions

Reviewers should answer:

1. Does 7I correctly choose docs-only task design before task/source implementation?
2. Are query planning, applicability, and extraction boundaries clear enough?
3. Are deterministic semantic shortcuts blocked strongly enough?
4. Are multilingual/source-language-first constraints clear enough?
5. Is Captain escalation needed before committing this docs-only package?
