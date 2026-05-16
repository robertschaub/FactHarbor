# V2 Slice X7-G Downstream Evidence Lifecycle No-Corpus Denial Package

**Date:** 2026-05-17
**Status:** reviewed docs-only package; not source approval
**Owner role:** Lead Architect / Captain Deputy
**Baseline:** `8e2091a0` (`docs: add v2 x3b prompt alignment package`)
**Decision source:** post-X3-B deputy consolidation; Security/runtime and LLM Expert recommended this before live-smoke or additional OCI-proof request packaging.
**Review result:** Architect APPROVE, Security/runtime APPROVE, Code/package APPROVE, LLM Expert APPROVE after split pure-core/runtime-adapter envelope amendments.

## 1. Purpose

This package records the downstream Evidence Lifecycle invariant that must remain true after hidden query planning, X7-F closed no-IO source-acquisition execution denial, C0-S3 parsed-material denial, and X3-B docs-only prompt-alignment preparation:

```text
No accepted source material and no EvidenceCorpus means no downstream semantic Evidence Lifecycle execution, no evidence/report/verdict behavior, and no live eligibility.
```

The intent is to reduce agent mis-sequencing risk. Hidden query planning, source-acquisition readiness, no-IO source-acquisition denial, parser-admission metadata, parsed-material denial, and prompt-frontmatter alignment must not be mistaken for permission to run applicability, extraction, sufficiency, boundary formation, verdict, reporting, public projection, or live-smoke jobs.

## 2. Status Of This Package

This package is documentation only. It does not approve implementation.

It may be used as input to a later reviewed source package, but that later package must be explicit about file envelope, exact negative statuses, tests, boundary guards, and completion verifiers.

This package may be sequenced before a direct-text live-smoke readiness package only to record downstream denial invariants first. It does not replace, authorize, or define the later live-smoke readiness gate.

## 3. Current Upstream Facts

- X3-B exists only as a reviewed docs-only approval package and still requires explicit Captain approval before prompt implementation.
- 7L-1 query planning is hidden/internal prompt-model execution only; it does not run search, fetch, parse, source reliability, or downstream Evidence Lifecycle tasks.
- X7-F returns a closed no-IO source-acquisition execution-denial gate. It keeps `research_acquisition` gateway policy `notImplemented`.
- X7-B already rejects absent or fake source material from becoming corpus-buildable input.
- C0-S3 consumes runtime-owned parser admission provenance and still returns no parsed material, no source material, no extraction input, and no EvidenceCorpus.
- B3/B3A are proof preparation only. No local positive proof exists, and 2D-C remains blocked.
- X4 public cutover guard remains fail-closed; no meaningful V2 public verdict/report exposure is approved.

## 4. Denial Invariant

Until a later reviewed gate explicitly creates accepted source material and an internal EvidenceCorpus, all downstream Evidence Lifecycle stages must remain blocked.

The invariant covers:

- Evidence applicability;
- Evidence extraction;
- Evidence sufficiency assessment;
- boundary formation or boundary clustering;
- verdict generation;
- aggregation;
- warning materiality decisions based on evidence sufficiency;
- report markdown, export, UI, or API projection;
- public compatibility quick fields;
- live-smoke eligibility.

No downstream stage may infer evidence scarcity, source collapse, sufficiency, confidence, warnings, verdict direction, or report quality from the absence of source material in this pre-execution state. Absence here is a pipeline gate condition, not an analytical result about the real world.

## 5. Future Implementation Shape

This package does not approve source edits, but a later X7-G source package may propose a hidden/internal denial owner with these properties:

- consumes only already-existing internal no-source/no-corpus signals such as X7-B source-material guard, X7-F closed no-IO gate, or C0-S3 parsed-material denial;
- emits denial-only downstream lifecycle state;
- returns only null or zero output for source material, parsed material, extraction input, EvidenceCorpus, EvidenceItems, warnings, verdicts, reports, public fields, cache, Source Reliability, and live eligibility;
- uses status names that cannot be mistaken for readiness or execution approval;
- is not barrel-exported to product/public surfaces;
- is protected by boundary guards.

The pure core denial owner must consume only normalized structural denial snapshots or existing core X7-B no-corpus guard outputs. If a later package needs to consume runtime-owned X7-F or C0-S3 outputs, it must add a separately reviewed hidden runtime adapter under `apps/web/src/lib/analyzer-v2-runtime/` that strips those runtime-owned objects to denial-only structural facts before calling the pure core owner.

Candidate status labels for later review:

- `downstream_blocked_no_evidence_corpus`;
- `downstream_blocked_source_acquisition_not_executable`;
- `downstream_blocked_no_parsed_material`;
- `downstream_blocked_no_source_material`.

Avoid these labels unless a later gate deliberately approves a positive path:

- `ready`;
- `available`;
- `eligible`;
- `executable`;
- `approved`;
- `source_acquired`;
- `source_material_available`;
- `evidence_available`;
- `corpus_buildable`;
- `live_eligible`.

## 6. Required Future Source Package Envelope

If a later source package is drafted, it must define the exact file envelope before implementation. A candidate pure-core envelope is:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/downstream-denial/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/downstream-denial/no-corpus-denial.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/downstream-denial/no-corpus-denial.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

The pure core may consume only structural/sanitized no-corpus input and must not import `apps/web/src/lib/analyzer-v2-runtime/**`.

If runtime-owned X7-F or C0-S3 outputs are consumed, the later package must add a separately reviewed hidden runtime adapter under `apps/web/src/lib/analyzer-v2-runtime/` that converts those runtime-owned objects into denial-only structural facts. Tests must cover both the pure core and runtime adapter when both exist. The runtime adapter must not be product/public/barrel exported.

Status/handoff files may be added only as completion artifacts.

Any different source envelope requires Architect, Security/runtime, and Code/package review before implementation.

## 7. Explicitly Forbidden

No current or future package may use this document to approve:

- prompt edits, prompt frontmatter edits, prompt-loader changes, or prompt tests;
- model/cache/gateway approval flips;
- provider/search/fetch/source execution;
- candidate acquisition changes;
- content dereference execution;
- parser execution, worker spawn, byte/frame/packet consumption, or parsed-material creation;
- source-material population;
- EvidenceCorpus creation or EvidenceItem creation;
- applicability, extraction, sufficiency, boundary, verdict, aggregation, report, warning, confidence, or public compatibility behavior;
- cache IO, durable storage, or Source Reliability integration;
- product/orchestrator/runner/API/UI/report/export wiring;
- live jobs, canaries, validation batches, or direct-text smoke runs;
- ACS/direct URL execution;
- B3 proof execution or 2D-C unlock;
- V1 reuse, V1 prompt/code cloning, or V1 cleanup.

## 8. Required Future Guards

Any future source implementation must prove:

- no imports from V1 analyzer/prompt/type/code paths;
- no imports from `@/lib/analyzer-v2-runtime` or `apps/web/src/lib/analyzer-v2-runtime/**` inside the pure `analyzer-v2/evidence-lifecycle/downstream-denial` core;
- no imports from prompt loaders, model adapters, gateway approval mutation, provider SDKs, search/fetch/content dereference/parser/cache/SR/storage/product/public/API/UI/report/export paths;
- no barrel export into product-reachable analyzer-v2 APIs;
- no product/public/barrel export from any optional runtime adapter;
- no transitive product/public reachability;
- no prompt/config/model/schema/default JSON changes;
- no live-job or runner reachability;
- no source material, parsed material, EvidenceCorpus, EvidenceItems, warnings, verdicts, confidence, reports, sources, or public fields are produced.

## 9. Required Future Tests

A later implementation package must include tests for:

- X7-F closed no-IO input maps to downstream blocked/no-corpus state;
- X7-B no-source-material guard maps to downstream blocked/no-corpus state;
- C0-S3 no-parsed-material denial maps to downstream blocked/no-corpus state;
- pure core accepts only normalized structural denial snapshots or existing core X7-B no-corpus guard outputs;
- optional runtime adapter strips X7-F/C0-S3 runtime-owned outputs to denial-only structural facts before calling the pure core owner;
- malformed or copied upstream signals fail closed;
- all output-bearing fields remain null or zero;
- no status string implies readiness, live eligibility, source availability, evidence availability, or execution approval;
- boundary guard import/export restrictions.

## 10. Review Questions

Architect:

- Does this package record the right invariant before any future downstream Evidence Lifecycle work?
- Is B correctly sequenced before live-smoke readiness packaging?
- Is the future source envelope narrow enough for a later reviewed implementation package?

Security/runtime:

- Are the denied surfaces complete?
- Are the status names safe enough to avoid execution/readiness confusion?
- Are the future boundary guards sufficient?

Code/package:

- Is this package enforceable by tests and boundary guards if later implemented?
- Is the docs-only envelope complete?
- Are status/handoff/index completion requirements clear enough?

LLM Expert:

- Does this prevent hidden readiness from being interpreted as permission for downstream semantic LLM tasks?
- Does it avoid treating pre-execution absence as evidence scarcity or an analytical finding?

## 11. Completion Requirements For This Docs Package

Before committing this docs package:

- obtain Architect, Security/runtime, and Code/package review;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create a completion handoff under `Docs/AGENTS/Handoffs/`;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` only as a pointer to the docs-only package;
- rebuild `Docs/AGENTS/index/handoff-index.json`;
- run:

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
node scripts/build-index.mjs --tier=2 --tracked-only
git diff --check
git diff --cached --check
```

Do not run live jobs or expensive LLM tests.
