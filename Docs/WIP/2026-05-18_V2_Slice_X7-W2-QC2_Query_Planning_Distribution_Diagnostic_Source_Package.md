# V2 Slice X7-W2-QC2 Query Planning Distribution Diagnostic Source Package

**Date:** 2026-05-18
**Status:** source package for review; implementation blocked until package commit
**Owner:** Lead Developer / Captain Deputy
**Parent package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-QC1_Query_Planning_Query_Count_Estimation_Package.md`

## 1. Purpose

X7-W2-LS1 showed that W2 blocks when accepted Query Planning emits 3 query entries while W2 allows at most 2. QC1 then defined the evidence contract for deciding between:

- a compatible W2 canary that emits at most 2 Query Planning entries; or
- a reviewed W2 cap-alignment source package.

X7-W2-QC2 implements the minimal diagnostic harness needed to collect that evidence without using the product route and without reaching Source Acquisition/W2/provider-network execution.

## 2. Approved Direction

Claude Opus 4.6 senior architect/security review recommended a committed diagnostic harness under a reviewed execution package.

Rejected paths:

- product route with gates disabled: rejects the fail-closed runtime model and risks W2/source execution;
- existing artifacts only: insufficient because the same German input produced 2 entries in one earlier package and 3 entries in later packages;
- immediate W2 cap alignment: premature without distribution evidence.

Accepted path:

- implement one local diagnostic harness that calls Claim Understanding and Query Planning only;
- add a boundary test proving the harness cannot import Source Acquisition, W2 candidate-provider network, parser, EvidenceCorpus, V1 analyzer, public route, cache/SR/storage, or product runner code;
- run it only after verifiers pass, against exact Captain-defined inputs, and stop after Query Planning inspection.

## 3. Source Envelope

Allowed new files:

- `scripts/v2/diagnostics/query-planning-distribution.ts`
- `apps/web/test/unit/scripts/query-planning-distribution-boundary.test.ts`

Allowed docs/status files:

- `Docs/WIP/2026-05-18_V2_Slice_X7-W2-QC2_Query_Planning_Distribution_Diagnostic_Source_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-QC2_Source_Package.md`
- `Docs/AGENTS/index/handoff-index.json`

Forbidden edits:

- V2 analyzer product/orchestrator/runtime files;
- prompt/config/schema/model/provider policy files;
- source-acquisition files;
- parser/cache/SR/storage/EvidenceCorpus/report/verdict/public/API/UI files;
- V1 analyzer/prompt/type/helper files;
- package/lock files.

## 4. Harness Requirements

The harness must:

- accept only a fixed local list of Captain-defined direct-text inputs in the script or via an explicit `--input-key` selection from that list;
- run one input at a time unless a later package approves batching;
- call Claim Understanding and Query Planning runtime paths only;
- record `commit`, `promptContentHash`, `renderedPromptHash`, `configSnapshotHash`, `modelPolicyId`, Query Planning status, query entry count, selected AtomicClaim count, token/duration telemetry, and failure reason if any;
- stop immediately after Query Planning inspection;
- write only a local JSON/Markdown result under `Docs/WIP/` or `test-output/` when the execution package explicitly requests it;
- emit no public output and write no cache/SR/storage/source/evidence/report/verdict artifacts;
- never construct Source Acquisition handoff, Source Acquisition request, W2 candidate-provider network loop, provider-network boundary, content dereference, parser input, EvidenceCorpus, report, verdict, warning, confidence, or public compatibility view.

Real Claim Understanding and Query Planning model calls are acceptable under this reviewed package because they are the exact hidden runtime capabilities already used by earlier V2 live gates. They must stay no-store and must not trigger source/network execution.

## 5. Boundary Test Requirements

The boundary test must fail if the harness imports or references:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/`;
- `source-acquisition-candidate-runtime`;
- `candidate-provider-network-loop`;
- `source-acquisition-network-`;
- `source-acquisition-content-`;
- parser owner files;
- EvidenceCorpus or source-material owners;
- V1 analyzer modules;
- API/UI/public route modules;
- cache, Source Reliability, storage, report, verdict, warning, confidence modules.

It must also assert that the harness includes a stop marker such as `STOP_AFTER_QUERY_PLANNING_INSPECTION` so future edits do not drift into Source Acquisition.

## 6. Initial Diagnostic Input Set

Use only Captain-defined inputs. Initial QC2 execution may include up to three inputs:

```text
Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz
Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?
Using hydrogen for cars is more efficient than using electricity
```

Do not paraphrase, translate, normalize, shorten, or substitute them.

## 7. Verifiers

Before running the harness:

```powershell
npm -w apps/web run test -- test/unit/scripts/query-planning-distribution-boundary.test.ts
npm -w apps/web run build
git diff --check
git status --short --untracked-files=all
```

If implementation touches only the harness and boundary test, do not run expensive validation suites or live jobs.

## 8. Execution Stop Rules

Stop and document instead of continuing if:

- the harness needs a prompt/config/schema/model/provider policy edit;
- the harness needs product runner/orchestrator/API/UI/public wiring;
- the harness imports or calls any Source Acquisition, W2, provider-network, content, parser, cache, SR, storage, EvidenceCorpus, report, verdict, warning, or confidence path;
- the harness cannot obtain Claim Understanding or Query Planning output without product-route execution;
- any input outside the Captain-defined list is needed;
- a model call fails repeatedly or produces invalid schema for all selected inputs;
- worktree becomes dirty before execution except for the expected harness/result files.

## 9. Completion Criteria

QC2 implementation is complete when:

- the harness and boundary test are implemented inside the approved envelope;
- verifiers pass;
- a completion handoff records whether the harness was run;
- if run, a result document records per-input query counts and whether the next package should be compatible-canary or W2 cap-alignment.
