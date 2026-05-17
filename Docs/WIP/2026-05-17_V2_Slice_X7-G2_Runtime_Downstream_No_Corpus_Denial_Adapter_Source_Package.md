# V2 Slice X7-G2 Runtime Downstream No-Corpus Denial Adapter Source Package

**Date:** 2026-05-17
**Status:** implementation complete; awaiting focused review/commit
**Owner role:** Lead Architect / Captain Deputy
**Baseline:** `fa048201` (`feat: add v2 x7g1 no-corpus denial`)
**Parent packages:** `Docs/WIP/2026-05-17_V2_Slice_X7-G_Downstream_Evidence_Lifecycle_No_Corpus_Denial_Package.md`, `Docs/WIP/2026-05-17_V2_Slice_X7-G1_Downstream_No_Corpus_Denial_Source_Package.md`
**Decision source:** post-X7-G1 deputy debate. Architect, Security/runtime, and Code/package recommended X7-G2 package-first. LLM Expert recommended defining live-smoke/readiness semantics before any live job; this package therefore keeps live smoke explicitly out of scope and blocked.
**Review result:** Architect APPROVE, Security/runtime APPROVE, Code/package APPROVE, LLM Expert APPROVE after adding producer-owned provenance sidecars, package-vs-implementation completion split, and producer-test verifier coverage.
**Implementation result:** X7-G2 is implemented inside the approved envelope. It adds producer-owned X7-F/C0-S3 result provenance sidecars, producer marking, an additive pure-core structural no-corpus input, and a hidden `analyzer-v2-runtime` adapter. Focused tests, Analyzer V2 runtime tests, Analyzer V2 tests, build, gate validators, and diff hygiene passed locally. Live jobs, source/provider/search/fetch/parser execution, downstream semantic LLM execution, EvidenceCorpus/EvidenceItems, product/public wiring, prompt/config/model/schema edits, cache/SR/storage, ACS/direct URL, B3 proof execution, 2D-C, V1 work, and V1 cleanup remain blocked.

## 1. Purpose

Define a reviewed future implementation package for a hidden runtime adapter that can consume runtime-produced denial outputs and reduce them to pure downstream no-corpus denial state without letting runtime-owned objects enter `analyzer-v2` core.

The current X7-G1 pure core accepts exact X7-B `EvidenceCorpusSourceMaterialGuardDecision` output only. X7-F and C0-S3 do not carry that exact object. X7-G2 must not fabricate an X7-B guard shell. Instead, it may extend the pure downstream-denial core with a deliberately named structural no-corpus input contract, then add a runtime adapter that strips producer-owned X7-F/C0-S3 denial outputs into that structural input before calling the pure core.

The structural input extension is preferred over avoiding X7-G1 changes because fabricating X7-B guard decisions would blur provenance, and a runtime-only downstream mapper would duplicate X7-G1 denial semantics outside the pure core. The extension must be additive only: existing X7-B behavior and X7-G1 status/type names must remain backward-compatible.

X7-F and C0-S3 result objects are not currently protected by their own runtime-owned readers. X7-F proves runtime ownership of its X7-E input before producing a result, and C0-S3 proves runtime ownership of its C0-S2 input before producing a result, but their final result objects can still be copied or reconstructed. X7-G2 therefore must add producer-owned result provenance before consuming those outputs, or it must fail closed. The approved path for this package is producer-owned provenance.

```text
runtime-produced X7-F / C0-S3 denial output
  -> producer-owned provenance mark + reader
  -> hidden analyzer-v2-runtime adapter
  -> structural no-corpus input
  -> pure analyzer-v2 downstream denial core
  -> downstream blocked/no-corpus state
```

## 2. Approval Requested

Approve implementation of X7-G2 exactly inside the file envelope and contract below.

This approval would permit only:

- a narrow pure-core structural input extension in `analyzer-v2/evidence-lifecycle/downstream-denial`;
- X7-F result producer marking in `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate.ts`;
- C0-S3 result producer marking in `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial.ts`;
- two dedicated producer-owned provenance sidecars/readers for X7-F and C0-S3 result objects;
- a hidden runtime adapter under `analyzer-v2-runtime`;
- focused tests and boundary guards, including tests proving only producers import mark APIs and the adapter imports reader APIs only.

This approval would not permit source/provider/search/fetch/parser execution, parser byte or packet consumption, downstream semantic LLM tasks, EvidenceCorpus/EvidenceItem creation, product/public/live wiring, prompt/config/model/schema edits, cache/SR/storage, ACS/direct URL execution, B3 proof execution, 2D-C, V1 reuse, or V1 cleanup.

## 3. Live-Smoke Separation

X7-G2 is not a live-smoke readiness gate.

It must not define, approve, or run live jobs. It must not claim that direct-text smoke is meaningful. A later live-smoke/readiness package must separately define:

- committed revision and runtime refresh requirements;
- allowed Captain-defined inputs;
- hidden artifacts to inspect;
- pass/fail criteria;
- whether X3-B prompt alignment is a prerequisite;
- why no-corpus denial is not evidence scarcity;
- why hidden readiness is not product/public readiness.

Until that separate reviewed package exists, live jobs remain blocked even if X7-G2 is later implemented.

## 4. Source Envelope

Allowed pure-core source files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/downstream-denial/types.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/downstream-denial/no-corpus-denial.ts`

Allowed runtime source files:

- `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate.ts`
- `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate-provenance.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial-provenance.ts`
- `apps/web/src/lib/analyzer-v2-runtime/downstream-no-corpus-denial-adapter.ts`

Allowed tests:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/downstream-denial/no-corpus-denial.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate-provenance.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial-provenance.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/downstream-no-corpus-denial-adapter.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Allowed docs/completion files:

- this package;
- `Docs/STATUS/Current_Status.md`;
- `Docs/STATUS/Backlog.md`;
- `Docs/AGENTS/Agent_Outputs.md`;
- `Docs/AGENTS/Handoffs/<dated X7-G2 completion handoff>.md`;
- `Docs/AGENTS/index/handoff-index.json`.

No other files are approved.

## 5. Pure-Core Contract Extension

X7-G2 may add a pure structural input type to the downstream-denial core. Candidate name:

```ts
type DownstreamNoCorpusStructuralInput = {
  readonly inputVersion: "v2.evidence-lifecycle.downstream.no-corpus-structural-input.x7g2";
  readonly visibility: "internal_only";
  readonly structuralSource:
    | "x7b_source_material_guard"
    | "x7f_source_acquisition_gate"
    | "c0s3_parsed_material_denial";
  readonly status:
    | "structural_no_evidence_corpus"
    | "structural_source_acquisition_closed"
    | "structural_no_parsed_material"
    | "structural_input_rejected";
  readonly blockedReason:
    | "source_material_guard_no_corpus"
    | "runtime_source_acquisition_gate_closed"
    | "runtime_source_acquisition_gate_rejected"
    | "runtime_parser_denial_no_parsed_material"
    | "runtime_input_not_owned"
    | "runtime_input_invalid";
  readonly sourceMaterial: null;
  readonly parsedMaterial: null;
  readonly extractionInput: null;
  readonly evidenceCorpus: null;
};
```

The exact names may be adjusted during implementation review, but they must avoid readiness or execution-approval wording. Do not use `ready`, `eligible`, `available`, `executable`, `approved`, `source_acquired`, `source_material_available`, `evidence_available`, `corpus_buildable`, or `live_eligible` in X7-G2-owned status or reason labels.

The pure core must keep X7-B exact guard input supported. It may either:

- add a separate builder for structural input; or
- make `buildDownstreamNoCorpusDenial()` accept a strict union of exact X7-B guard output and exact structural input.

It must not accept runtime-produced X7-F or C0-S3 objects directly. It must reject malformed, extra-field, wrong-version, mismatched, or positive-looking structural input as `downstream_blocked_input_invalid`.

## 6. Runtime Result Provenance Contract

X7-G2 must add producer-owned provenance for X7-F and C0-S3 result objects before the adapter consumes them.

Allowed shape:

- each producer marks every returned result object through its dedicated sidecar before returning it;
- each sidecar stores the exact object in a process-local `WeakSet` or stronger local identity reader;
- each sidecar exposes a read/inspect API that returns the owned object only when the exact object identity and critical denial/null-output fields still match;
- spread copies, JSON round trips, `structuredClone`, reconstructed objects, extra-field objects, wrong-version objects, post-mark mutations, and positive-looking objects fail closed.

Candidate sidecar APIs:

- `readHiddenDirectTextSourceAcquisitionExecutionGateRuntimeOwnedResult(value: unknown)`;
- `readSourceAcquisitionParserAdmissionParsedMaterialDenialRuntimeOwnedResult(value: unknown)`.

The sidecars must not export mark functions for product/public callers. If a mark function must be exported to the producer file, boundary guards must prove only the producer imports it. The adapter must import reader/inspection APIs only.

## 7. Runtime Adapter Contract

The hidden runtime adapter may consume only already-created runtime-produced denial outputs after result provenance inspection:

- producer-owned `HiddenDirectTextSourceAcquisitionExecutionGateResult` read through the X7-F result provenance reader;
- producer-owned `SourceAcquisitionParserAdmissionParsedMaterialDenialResult` read through the C0-S3 result provenance reader;
- unknown/malformed input for fail-closed tests.

The adapter must treat copied, JSON-round-tripped, reconstructed, extra-field, wrong-version, mutable, or positive-looking X7-F/C0-S3-shaped objects as invalid unless the exact object passes the corresponding X7-G2 result provenance reader. X7-G2 must not claim ownership from structural shape alone.

The adapter must output only denial-only structural facts and call or map through the pure downstream-denial core. It must not return X7-F/C0-S3 result objects, raw parser admission references, content packets, source locators, source text, parsed text, or provider/network details.

Candidate adapter result fields:

- `adapterVersion`;
- `visibility: "internal_only"`;
- `status: "runtime_downstream_blocked_no_corpus" | "runtime_downstream_blocked_input_invalid"`;
- `blockedReason`;
- `upstreamKind: "x7f_source_acquisition_gate" | "c0s3_parsed_material_denial" | null`;
- `coreDenial`;
- all downstream analytical/public fields null or false.

## 8. Mapping Rules

X7-F mappings:

- X7-F `gate_closed_no_io` with `executionStatus: "blocked_no_io"` and all no-IO/null-output proof fields intact -> structural source acquisition closed -> downstream blocked/no-corpus.
- X7-F `blocked_pre_execution` with owned result identity and all no-IO/null-output proof fields intact -> structural input rejected -> downstream blocked/no-corpus.
- copied, reconstructed, JSON-round-tripped, `structuredClone`, post-mark mutated, malformed, wrong-version, extra-field, no-IO-proof-broken, positive-looking, or unsupported X7-F-shaped input -> runtime adapter blocked input invalid.

C0-S3 mappings:

- C0-S3 `blocked_no_parsed_material` -> structural no parsed material -> downstream blocked/no-corpus.
- C0-S3 `blocked_admission_not_runtime_owned` with owned C0-S3 result identity -> structural input rejected -> downstream blocked/no-corpus.
- copied, reconstructed, JSON-round-tripped, `structuredClone`, post-mark mutated, malformed, wrong-version, extra-field, positive-looking, or unsupported C0-S3-shaped input -> runtime adapter blocked input invalid.

The adapter must not infer analytical evidence scarcity, evidence sufficiency, source reliability, warnings, verdicts, confidence, or report quality from any mapping.

## 9. Explicit Non-Goals

X7-G2 must not:

- execute source acquisition;
- call provider/search/fetch/content dereference;
- execute a parser, spawn a worker, consume bytes, frames, packets, fixture bytes, synthetic bytes, or real fetched bytes;
- create parsed material, source material, extraction input, EvidenceCorpus, EvidenceItems, sources, cited sources, warnings, reports, verdicts, confidence, or public compatibility fields;
- run applicability, extraction, sufficiency, boundary, verdict, aggregation, or report LLM calls;
- touch prompts, prompt frontmatter, prompt loaders, configs, models, schemas, UCM defaults, cache, storage, or Source Reliability;
- add product/orchestrator/runner/API/UI/report/export wiring;
- add a barrel export into product-reachable APIs;
- submit live jobs or canaries;
- execute ACS/direct URL paths;
- run B3 proof or unlock 2D-C;
- reuse V1 code or clean up V1.

## 10. Boundary Guard Requirements

Update `boundary-guard.test.ts` to prove:

- the pure downstream-denial core does not import `@/lib/analyzer-v2-runtime/**`;
- X7-F and C0-S3 producers are the only production files allowed to import their respective result mark APIs;
- the runtime adapter imports only approved X7-F/C0-S3 result reader/inspection APIs and the pure downstream-denial core;
- the runtime adapter does not directly accept raw X7-F/C0-S3 result-shaped objects without result provenance inspection;
- no V1 analyzer/prompt/type/code imports;
- no prompt/model/provider/search/fetch/parser/cache/SR/storage/product/public/API/UI/report/export imports;
- no direct fetch, network, parser, worker-spawn, cache, storage, or Source Reliability calls;
- no product/public/barrel export and no transitive product/public reachability;
- exact approved file list for the new runtime adapter.

## 11. Focused Tests

Add tests that prove:

- X7-B exact guard input still maps as in X7-G1;
- structural input maps to downstream blocked/no-corpus without creating downstream artifacts;
- malformed/wrong-version/extra-field/mismatched structural input fails closed;
- X7-F result producer marks returned results and the reader accepts only the exact unmutated object;
- copied, JSON-round-tripped, `structuredClone`, reconstructed, extra-field, wrong-version, post-mark mutated, and positive-looking X7-F result-shaped objects fail closed;
- C0-S3 result producer marks returned results and the reader accepts only the exact unmutated object;
- copied, JSON-round-tripped, `structuredClone`, reconstructed, extra-field, wrong-version, post-mark mutated, and positive-looking C0-S3 result-shaped objects fail closed;
- owned X7-F closed no-IO result maps through the runtime adapter to downstream blocked/no-corpus;
- owned X7-F blocked result maps only to denial or adapter invalid, never positive readiness;
- owned C0-S3 no-parsed-material denial maps through the runtime adapter to downstream blocked/no-corpus;
- owned C0-S3 non-runtime-owned-admission denial maps to structural rejected denial; unowned C0-S3-shaped input fails adapter invalid;
- all downstream input/output fields remain null or false;
- no X7-G2-owned status or reason string contains readiness/execution/live/source-available terminology;
- no claim text, language, URL, topic, provider, rank, or source count can affect output.

## 12. Verifiers

Focused:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/downstream-no-corpus-denial-adapter.test.ts test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate-provenance.test.ts test/unit/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial-provenance.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/downstream-denial/no-corpus-denial.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
```

Broader:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
node scripts/build-index.mjs --tier=2 --tracked-only
git diff --check
git diff --cached --check
```

Do not run expensive LLM tests or live jobs.

## 13. Review Questions

Architect:

- Is the package correctly sequenced after X7-G1 and before any downstream Evidence Lifecycle execution?
- Is the pure-core structural input extension justified, or should X7-G2 avoid touching X7-G1?
- Does the package clearly separate X7-G2 from live-smoke readiness?

Security/runtime:

- Does the new result-provenance requirement close the X7-F/C0-S3 ownership gap?
- Are runtime-produced X7-F/C0-S3 objects kept out of pure `analyzer-v2` core?
- Are denied surfaces complete?
- Are ownership/copy/malformed/positive-looking cases covered enough?

Code/package:

- Is the source envelope narrow and enforceable?
- Is the structural-input contract preferable to fabricating X7-B guard objects?
- Are the focused and broader verifiers sufficient?

LLM Expert:

- Does the package preserve the distinction between pre-execution denial and analytical evidence scarcity?
- Does it avoid enabling or implying downstream semantic LLM tasks?
- Does the live-smoke separation language prevent hidden readiness from being mistaken for report readiness?

## 14. Package Completion Requirements

Before committing this package:

- obtain Architect, Security/runtime, Code/package, and LLM Expert review;
- update this package status with review state;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` only as X7-G2 status pointers;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create a completion handoff under `Docs/AGENTS/Handoffs/`;
- rebuild and stage `Docs/AGENTS/index/handoff-index.json`;
- run:

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
node scripts/build-index.mjs --tier=2 --tracked-only
git diff --check
git diff --cached --check
```

Do not run live jobs or expensive LLM tests.

## 15. Future Implementation Completion Requirements

Before committing a future X7-G2 implementation:

- update this package status with implementation commit/review state;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` only as X7-G2 implementation pointers;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create an implementation handoff under `Docs/AGENTS/Handoffs/`;
- rebuild and stage `Docs/AGENTS/index/handoff-index.json`;
- run the focused and broader verifiers in section 12;
- run `git diff --check`;
- run `git diff --cached --check`;
- keep live jobs, expensive LLM suites, B3 proof execution, and 2D-C blocked unless a separate reviewed package explicitly approves them.
