# V2 Slice X7-G1 Downstream No-Corpus Denial Source Package

**Date:** 2026-05-17
**Status:** implementation complete; pre-commit reviews accepted
**Owner role:** Lead Architect / Captain Deputy
**Baseline:** `f1706491` (`docs: add v2 x7g no-corpus denial package`)
**Parent package:** `Docs/WIP/2026-05-17_V2_Slice_X7-G_Downstream_Evidence_Lifecycle_No_Corpus_Denial_Package.md`
**Review result:** Architect APPROVE, Security/runtime APPROVE, Code/package APPROVE, LLM Expert APPROVE after adding completion/index requirements.

## 1. Purpose

Implement the smallest pure-core X7-G downstream denial owner:

```text
X7-B no-source-material guard output in -> downstream Evidence Lifecycle blocked/no-corpus state out.
```

This source package intentionally excludes runtime adapters. It does not consume X7-F or C0-S3 runtime-owned objects. Those require a separate later package under `apps/web/src/lib/analyzer-v2-runtime/` if needed.

## 2. Approval Requested

Approve implementation of X7-G1 exactly inside the file envelope and contract below.

This approval would permit only a pure `analyzer-v2` core denial module and focused tests. It would not approve runtime adapters, source execution, parser execution, downstream semantic LLM tasks, live jobs, product/public wiring, prompt/config/model/schema changes, cache/SR/storage, or V1 work.

## 3. Source Envelope

Allowed source files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/downstream-denial/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/downstream-denial/no-corpus-denial.ts`

Allowed tests:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/downstream-denial/no-corpus-denial.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Allowed docs/completion files:

- this package;
- `Docs/STATUS/Current_Status.md`;
- `Docs/STATUS/Backlog.md`;
- `Docs/AGENTS/Agent_Outputs.md`;
- `Docs/AGENTS/Handoffs/<dated X7-G1 completion handoff>.md`;
- `Docs/AGENTS/index/handoff-index.json`.

No other files are approved.

## 4. Input Contract

X7-G1 may consume only:

- `EvidenceCorpusSourceMaterialGuardDecision` from `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard.ts`;
- unknown/malformed input for fail-closed tests.

X7-G1 must not import:

- `@/lib/analyzer-v2-runtime/**`;
- X7-F runtime execution gate code;
- C0-S3 parser-admission parsed-material denial code;
- prompt loaders or model adapters;
- provider/search/fetch/parser/cache/SR/storage/product/public/API/UI/report/export paths;
- V1 analyzer/prompt/type/code paths.

## 5. Output Contract

Add a version constant:

```ts
export const DOWNSTREAM_NO_CORPUS_DENIAL_VERSION =
  "v2.evidence-lifecycle.downstream.no-corpus-denial.x7g1";
```

Allowed status values:

- `downstream_blocked_no_evidence_corpus`;
- `downstream_blocked_source_material_invalid`;
- `downstream_blocked_source_material_not_accepted`;
- `downstream_blocked_input_invalid`.

Allowed blocked reasons:

- `source_material_guard_no_corpus`;
- `source_material_guard_invalid`;
- `source_material_guard_not_accepted`;
- `source_material_guard_input_invalid`.

Required result fields:

- `denialVersion`;
- `visibility: "internal_only"`;
- `status`;
- `blockedReason`;
- `sourceMaterialGuardVersion`;
- `sourceMaterialGuardStatus`;
- `sourceMaterialGuardReason`;
- `applicabilityInput: null`;
- `extractionInput: null`;
- `sufficiencyInput: null`;
- `boundaryInput: null`;
- `verdictInput: null`;
- `evidenceCorpus: null`;
- `evidenceItems: null`;
- `warnings: null`;
- `report: null`;
- `publicOutput: null`;
- `liveEligibility: false`;
- `semanticLlmTasksApproved: false`;
- `productPublicLiveApproved: false`;
- `cacheTouched: false`;
- `sourceReliabilityTouched: false`.

The builder must be pure and synchronous.

## 6. Mapping Rules

For exact-shape X7-B guard output:

- `not_buildable_no_source_material` -> `downstream_blocked_no_evidence_corpus`;
- `blocked_source_material_invalid` -> `downstream_blocked_source_material_invalid`;
- `blocked_source_material_not_accepted` -> `downstream_blocked_source_material_not_accepted`.

Malformed, copied-with-extra-fields, missing required fields, or wrong version input -> `downstream_blocked_input_invalid`.

X7-G1 must not distinguish based on claim text, language, URL, topic, source type, provider, rank, or source count. It is structural only.

## 7. Explicit Non-Goals

X7-G1 must not:

- consume X7-F or C0-S3 runtime-owned outputs;
- add a runtime adapter;
- execute source acquisition;
- execute provider/search/fetch/content dereference;
- execute parser or consume bytes/frames/packets;
- create parsed material, source material, EvidenceCorpus, EvidenceItems, source records, warnings, report content, verdicts, confidence, or public compatibility fields;
- run applicability, extraction, sufficiency, boundary, verdict, aggregation, or report LLM calls;
- touch prompts, prompt frontmatter, prompt loaders, configs, models, schemas, UCM defaults, cache, storage, or Source Reliability;
- add product/orchestrator/runner/API/UI/report/export wiring;
- submit live jobs or canaries;
- execute ACS/direct URL paths;
- reuse V1 code or clean up V1.

## 8. Boundary Guard Requirements

Update `boundary-guard.test.ts` to prove:

- exact allowed file list under `evidence-lifecycle/downstream-denial/`;
- no `@/lib/analyzer-v2-runtime` import from downstream-denial core;
- no V1 analyzer imports;
- no prompt/model/provider/search/fetch/parser/cache/SR/storage/product/public/API/UI/report/export imports;
- no barrel export into product-reachable analyzer-v2 APIs;
- production downstream-denial source imports only the X7-B source-material guard contract and local files.

## 9. Focused Tests

Add tests that prove:

- X7-B `not_buildable_no_source_material` maps to `downstream_blocked_no_evidence_corpus`;
- X7-B `blocked_source_material_invalid` maps to `downstream_blocked_source_material_invalid`;
- X7-B `blocked_source_material_not_accepted` maps to `downstream_blocked_source_material_not_accepted`;
- malformed/wrong-version/extra-field input fails closed as `downstream_blocked_input_invalid`;
- all downstream input/output fields are null or false;
- no status or reason string contains `ready`, `eligible`, `available`, `executable`, `approved`, `source_acquired`, `evidence_available`, `corpus_buildable`, or `live_eligible`;
- behavior is independent of claim text and language because the builder consumes only structural guard output;
- boundary guard restrictions pass.

## 10. Verifiers

Focused:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/downstream-denial/no-corpus-denial.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
```

Broader:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
node scripts/build-index.mjs --tier=2 --tracked-only
git diff --check
git diff --cached --check
```

Do not run expensive LLM tests or live jobs.

## 11. Implementation Completion Requirements

Before committing an X7-G1 implementation:

- update this package status with implementation commit/review state;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` only as X7-G1 status pointers;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create a completion handoff under `Docs/AGENTS/Handoffs/`;
- rebuild and stage `Docs/AGENTS/index/handoff-index.json`;
- run the focused and broader verifiers in section 10.

## 12. Review Questions

Architect:

- Is pure-core-only X7-G1 the right first implementation after the X7-G invariant package?
- Is excluding runtime adapters from this slice correct?
- Is the source envelope narrow enough?

Security/runtime:

- Are blocked surfaces and import boundaries complete?
- Do the status names avoid readiness/execution confusion?
- Is it safe that runtime-owned X7-F/C0-S3 consumption is deferred?

Code/package:

- Are the tests and boundary guards enforceable?
- Are the verifiers sufficient?
- Is this source package ready for implementation without Captain approval?

LLM Expert:

- Does the package preserve the distinction between pre-execution absence and analytical evidence scarcity?
- Does it avoid enabling downstream semantic LLM tasks?
