# V2 Slice X7-B Source-Material / Evidence-Corpus Guard Source Package

**Date:** 2026-05-16
**Status:** draft review package; no source implementation until deputy review approves
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `33ddb984` (`docs: refresh handoff index`)
**Parent gate:** X7-A hidden candidate-to-source-material readiness
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Purpose

X7-A proves that X6 candidate-acquisition output is not source material, not evidence, and not extraction input. It also keeps extraction and evidence-corpus readiness blocked because no source material exists.

X7-B closes the next downstream ambiguity before provider-network readiness:

1. Evidence Corpus build logic must have an explicit source-material input gate.
2. X7-A `SourceMaterialReadinessDecision` must be consumable only as a negative guard, not as a fake source-material object.
3. Future provider/network/parser output must not become corpus-buildable unless a later source-material acceptance decision explicitly says it is valid.

X7-B is a hidden/internal contract slice. It must stay negative and pre-execution. It must not add source material, source records, parsed text, EvidenceItems, evidence corpus population, extraction, warnings, verdicts, confidence, report content, product wiring, public output, live jobs, cache, storage, Source Reliability, prompt/config/model/schema changes, ACS/direct URL execution, V1 reuse, or V1 cleanup.

X7-B is a companion guard to the existing 7F `EvidenceCorpusBuildDecision`. It does not replace or mutate 7F. `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/types.ts` and `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/build-decision.ts` are intentionally out of scope for X7-B; if implementation appears to require editing them, stop and return to review.

## 2. Review Context

Deputy review after X7-A split on whether the next package should be provider-network readiness or a downstream guard. Reconciliation adopted this sequence:

1. **X7-B:** source-material / evidence-corpus negative guard.
2. **X7-C:** hidden provider-network readiness, only after X7-B passes.

Reasoning:

- X7-A closes the candidate/source-material confusion, but current `EvidenceCorpusBuildDecision` still depends on `SourceAcquisitionStartDecision`, not the X7-A source-material readiness boundary.
- Provider-network readiness would be useful, but it should feed into a downstream contract that already rejects absent or invalid source material.
- X7-B must not invent a rich empty-corpus or fake source-material model. It is only a narrow negative guard.

## 3. Requested Deputy Decision

Requested approval:

> Approved to implement V2 Slice X7-B under `Docs/WIP/2026-05-16_V2_Slice_X7-B_Source_Material_Evidence_Corpus_Guard_Source_Package.md`, limited to an internal source-material contract and evidence-corpus guard proving that absent X7-A source material cannot be treated as corpus-buildable input. No provider/network execution, no source-material population, no content dereference, no parser/packet/frame/byte consumption, no EvidenceItems, no extraction/applicability/sufficiency/warnings/verdict/confidence/report output, no product/orchestrator/runner/API/UI/export wiring, no cache/storage/Source Reliability, no prompt/config/model/schema edits, no ACS/direct URL execution, no V1 analyzer/prompt/type/code reuse, and no V1 cleanup.

If reviewers do not approve this exact negative-guard boundary, do not implement X7-B.

Escalate to Captain only if the team wants to skip X7-B and move directly into provider-network readiness/execution, source IO, source-material creation, product/live wiring, parser behavior, prompt/model/config changes, or V1 cleanup.

## 4. Implementation Boundary

### 4.1 Allowed Production Files

New files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/contract.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard.ts`

Allowed responsibilities:

- define a minimal internal source-material absence contract / rejection gate for this pre-execution slice;
- define an explicit decision that consumes `SourceMaterialReadinessDecision`;
- accept X7-A readiness only as `not_buildable_no_source_material`;
- preserve `evidenceCorpus: null`;
- expose future-oriented, exact-shape blocked reasons without creating real source material;
- keep all decisions `internal_only`;
- ensure no X7-B input is corpus-buildable.

The source-material contract must be minimal and negative-only. It must not model source records, source contents, parsed text, evidence items, source reliability, warnings, verdicts, confidence, or report fields.

The evidence-corpus guard must be a separate pure core function, for example:

```ts
buildEvidenceCorpusSourceMaterialGuard(sourceMaterialDecision)
```

It may consume only the X7-A source-material readiness decision or the new minimal source-material absence/rejection contract. It must return a negative corpus-build guard while no source material exists.

### 4.2 Allowed Test Files

New files:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/contract.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard.test.ts`

Existing file:

- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Boundary guards must prove:

- exact allowed file inventory for the `source-material/` and `evidence-corpus/` roots after X7-B is added;
- source-material contract files do not import runtime, provider/network/content/parser/cache/storage/SR/product/public/prompt/config/model/schema/V1 modules;
- evidence-corpus source-material guard files do not import runtime, provider/network/content/parser/cache/storage/SR/product/public/prompt/config/model/schema/V1 modules;
- no product/public surface reaches the new X7-B guard directly or transitively;
- X7-B files do not call `fetch`, provider SDKs, parser functions, content transport, packet sink, Source Reliability, cache/storage APIs, model adapters, prompt loaders, or public/report APIs.

### 4.3 Allowed Documentation Files

After implementation only:

- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Handoffs/<date>_Lead_Architect_V2_X7-B_Source_Material_Evidence_Corpus_Guard.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json` after `npm run index`

## 5. Runtime Contract

X7-B may add only negative internal statuses:

- source-material contract status:
  - `not_available_pre_execution`;
- evidence-corpus source-material guard status:
  - `not_buildable_no_source_material`;
  - `blocked_source_material_invalid`;
  - `blocked_source_material_not_accepted`.

X7-B must not define or return `accepted_future_source_material`, `buildable_future_source_material`, or any other positive source-material/corpus-buildable state. A later package may introduce a positive source-material acceptance contract only after source-material creation is separately reviewed and approved.

The default path from X7-A must produce:

- visibility `internal_only`;
- no source material;
- no extraction input;
- no evidence corpus;
- blocked or not-buildable reason `not_buildable_no_source_material`;
- no warnings;
- no public fields.

## 6. Verification Requirements

Focused tests must prove:

- X7-A `not_ready_pre_execution` readiness produces `not_buildable_no_source_material`;
- X7-A blocked readiness produces a blocked evidence-corpus source-material guard;
- malformed, copied, JSON-round-tripped, extra-field, or source-like source-material inputs fail closed;
- no input, including X7-A readiness, malformed source-like objects, copied objects, or JSON-round-tripped objects, can produce a corpus-buildable or source-material-accepted state;
- candidates, hidden locators, query text, provider IDs, provider attempt IDs, retrieval policy keys, URLs, titles, snippets, domains, source counts, raw payloads, parser bytes, parsed text, cache keys, SR scores, warnings, verdicts, truth percentages, confidence, and report prose do not appear in any X7-B decision;
- X7-B does not create source material, extraction input, EvidenceItems, evidence corpus entries, warnings, verdicts, confidence, or report output;
- X7-B does not change or depend on public V2 output;
- X7-B does not import or transitively reach runtime/provider/network/content/parser/cache/storage/SR/product/public/prompt/config/model/schema/V1 modules.

Minimum verifier commands:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/readiness.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/build-decision.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

No expensive real-LLM tests and no live jobs are approved by X7-B.

## 7. Stop Conditions

Stop and return to deputy/Captain review if implementation requires:

- provider-network readiness or execution;
- real network/search/fetch behavior;
- content dereference;
- parser, packet, frame, or byte consumption;
- source-material population;
- source records, source arrays, or source counts that imply evidence;
- EvidenceItems or evidence corpus population;
- mutation or replacement of 7F `evidence-corpus/types.ts` or `evidence-corpus/build-decision.ts`;
- extraction, applicability, sufficiency, warning, verdict, confidence, report, or public compatibility behavior;
- product/orchestrator/runner/API/UI/report/export wiring;
- cache IO, durable storage, or Source Reliability;
- prompt/config/model/schema edits;
- ACS prepared snapshot or direct URL execution;
- V1 analyzer/prompt/type/code reuse;
- V1 cleanup.

## 8. Reviewer Prompt

Use this prompt for Architect, Security, Senior Developer, Claude/Gemini, or deputy reviewers:

> Review `Docs/WIP/2026-05-16_V2_Slice_X7-B_Source_Material_Evidence_Corpus_Guard_Source_Package.md` as the proposed FactHarbor V2 X7-B source implementation boundary. Return `approve`, `modify`, or `reject`. Check whether it is safe and precise enough to add a hidden/internal source-material/evidence-corpus negative guard after X7-A. Focus on exact file envelope, no fake empty-corpus semantics, no source-material population, no provider/network execution, no parser/content/byte behavior, no Source Reliability, no cache/storage, no product/public/live wiring, no prompt/config/model/schema edits, no EvidenceItem/extraction/applicability/sufficiency/warning/verdict/confidence/report generation, no ACS/direct URL, no V1 reuse/cleanup, verifier adequacy, rollback, and whether any decision must escalate to Captain before implementation. Also confirm that provider-network readiness should be the follow-up X7-C only after X7-B is accepted.

## 9. Rollback

Rollback must be simple:

- remove the new source-material contract file;
- remove the new evidence-corpus guard file;
- remove focused test files;
- remove boundary-guard additions;
- public behavior remains unchanged because no product/public path may import X7-B.
