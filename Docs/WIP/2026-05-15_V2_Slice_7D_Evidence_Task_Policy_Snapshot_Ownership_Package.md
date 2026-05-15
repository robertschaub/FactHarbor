# V2 Slice 7D Evidence Task Policy Snapshot Ownership Package

**Date:** 2026-05-15
**Status:** draft for review; docs-only; no source authorization
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `e9176a75` (`docs: record v2 evidence source request`)
**Prior source gate:** 7C `22530936` (`feat: add v2 evidence source request contract`)
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

Decide who owns the future frozen Evidence Lifecycle task-policy snapshot before any executable source acquisition, query planning, applicability, extraction, sufficiency, Source Reliability integration, or `EvidenceCorpus` source contract is implemented.

7C intentionally uses a static symbolic policy snapshot:

- source: `static_contract_only`;
- policy status: `not_executable`;
- symbolic planned task labels only;
- fixed complete retrieval-policy catalog;
- no provider/search/fetch/prompt/model/cache/SR/public/orchestrator behavior.

7D defines how that inert symbolic contract marker can later be replaced by approved runtime authority without turning this package into UCM, prompt, model, provider, cache, or corpus implementation.

## 2. Review Consolidation

Reviewer input split:

- two reviewers recommended task-policy ownership first;
- one reviewer recommended an `EvidenceCorpus` not-built/blocked contract first, but warned strongly against modeling not-executed state as real empty evidence.

Consolidated decision for this package:

- proceed with task-policy ownership first;
- carry the corpus warning as a guardrail: no `EvidenceCorpus` contract until task-policy ownership and acquisition/extraction prerequisites are clearer;
- when corpus work starts, model "not executed/not built" as a build decision, not as a real empty `EvidenceCorpus`;
- do not authorize source code from this 7D package.

No Captain escalation is needed for this docs-only package. Captain/deputy escalation remains required before runtime authority, prompt/model/schema/UCM changes, provider/search/fetch execution, Source Reliability imports/IO, public exposure, live jobs, ACS/direct URL execution, or V1 cleanup.

## 3. Scope Allowed By This Package

Allowed now:

- this WIP approval package;
- status/guardrail/handoff updates that clearly mark 7D as docs-only;
- review questions for a later source package.

Blocked now:

- source edits;
- UCM/default JSON edits;
- gateway policy or model policy edits;
- prompt file edits;
- provider/search/fetch implementation;
- prompt rendering or model calls;
- cache IO;
- Source Reliability imports, calls, cache reads, cache writes, admin/config changes, or prompt changes;
- `EvidenceCorpus` source contract;
- sufficiency, boundary, verdict, aggregation, report, public API/UI/export changes;
- live jobs;
- V1 reuse or cleanup.

## 4. Ownership Model

Future evidence task-policy authority must be created once per pipeline run and passed through stage contracts as a frozen snapshot.

| Owner | Owns | Must not own |
|---|---|---|
| Pipeline run context owner | Freezes approved evidence task-policy snapshot for the run. | Live singleton reads during a run; semantic decisions. |
| Evidence Lifecycle owner | Consumes frozen snapshot, records policy provenance, and fails closed when required policy is missing. | UCM storage, prompt text, provider SDK calls, public exposure. |
| Prompt/model gateway owner | Approved prompt section references, model tier/profile, task budget, retry/fallback, and schema ownership for semantic tasks. | Source fetching, cache persistence, verdict math, public result projection. |
| UCM/admin policy owner | Future editable task-policy storage and activation workflow. | Runtime execution without separate approval; hidden automatic activation. |
| Provider/search/fetch owner | Future structural provider calls, fetch status, retry/rate-limit/circuit accounting. | Semantic relevance, evidence strength, source credibility meaning. |
| Source Reliability service | Existing SR evaluation/cache/admin domain. | V2 task-policy storage; direct verdict weighting. |

## 5. Snapshot Shape To Define Later

A future executable `EvidenceTaskPolicySnapshot` must include:

- snapshot version and hash;
- approval pointer and rollback target;
- policy source and activation status;
- task entries for query planning, applicability, evidence extraction, source-language/lane decisions, and sufficiency;
- prompt profile/section references;
- model tier/provider/model profile;
- structured output schema reference;
- max calls, token budgets, timeout, retry budget, fallback behavior;
- cache policy and provenance dimensions;
- retrieval policy mode limits;
- source-language-first and cross-language lane policy;
- warning materiality mapping;
- escalation rules for provider collapse, budget exhaustion, low evidence, parse/schema failure, and source scarcity.

These fields are future requirements only. 7D does not create them in code or UCM.

## 6. Symbolic Versus Runtime Authority

7C symbolic fields remain non-executable until replaced by a reviewed task-policy source gate.

| 7C symbolic field | Future runtime authority requires |
|---|---|
| symbolic planned task keys | approved task entry with prompt/model/schema/budget ownership |
| fixed retrieval-policy catalog | approved LLM/task-policy selection mechanism, not deterministic claim-text branching |
| `not_executable` policy status | explicit approval pointer and activation state |
| `no_store_no_read` cache policy | approved cache identity, IO owner, provenance dimensions, rollback, and tests |
| `not_wired` provider execution | reviewed provider/search/fetch ownership package |
| `thin_port_pending` SR integration | reviewed V2 SR port contract, with no SR service rewrite |

7D explicitly does not authorize replacing any of these fields.

## 7. Semantic Decision Boundary

The following remain LLM-owned through approved prompt/UCM-governed task policy:

- query planning;
- source relevance and applicability;
- evidence extraction;
- claim direction;
- probative value;
- source meaning, credibility, bias, independence, and expertise;
- EvidenceScope compatibility;
- source-language equivalence and supplementary lane decisions;
- sufficiency.

Task policy may freeze routing, budgets, prompt/profile references, retrieval modes, approvals, and rollback. It must not encode deterministic meaning decisions.

Forbidden in future source gates unless separately approved as LLM/prompt policy:

- keyword/regex evidence classification;
- vague phrase counts;
- Jaccard/token-overlap semantic dedupe;
- English-default routing;
- provider rank/fetch success/source type/domain/language as hidden truth, relevance, probative, or credibility signal;
- V1 evidence-quality-filter carry-forward.

## 8. EvidenceCorpus Guardrail

Do not implement `EvidenceCorpus` as an "empty corpus" just because source execution is not approved.

Required future distinction:

- `not_built` / `blocked_pre_execution`: source acquisition, applicability, extraction, and sufficiency have not run.
- real empty corpus: source acquisition and extraction executed under approved policy and found no usable evidence.

A future corpus package must model the first case as a build decision or blocked state, not as analytical evidence scarcity, no evidence, or sufficiency failure.

## 9. Preconditions For Later Source Packages

Before any executable Evidence Lifecycle source work:

- task-policy authority must be approved and frozen in the run context;
- prompt/model/schema tasks must pass LLM Expert and Captain/deputy review;
- provider/search/fetch ownership must be separately approved;
- Source Reliability port must be defined without changing SR implementation;
- warning materiality and sufficiency outcomes must be defined;
- public result/report/API/UI exposure must remain blocked unless a separate public gate approves it.

## 10. Proposed Next Package

If 7D is approved, the next package should be docs-only and should choose between:

- `7E Evidence Task Policy Contract Source Package`: inert source contract for frozen task-policy snapshots, no UCM/provider/prompt/model execution; or
- `7E Evidence Corpus Build Decision Package`: docs-only package for a `not_built`/`blocked_pre_execution` decision, not a real `EvidenceCorpus`.

Recommendation: choose task-policy contract source before corpus build decision.

## 11. Verification For This Package

Docs-only verification:

- `git diff --check`;
- no source file changes;
- no live jobs;
- reviewer confirmation that the package does not authorize runtime authority.

## 12. Review Questions

Reviewers should answer:

1. Does this package correctly resolve the post-7C ordering question?
2. Is task-policy ownership the right next gate before any corpus-shaped contract?
3. Are the symbolic/runtime authority boundaries clear enough?
4. Does the EvidenceCorpus guardrail prevent fake empty-corpus semantics?
5. Is a Captain decision needed before drafting the next package?
