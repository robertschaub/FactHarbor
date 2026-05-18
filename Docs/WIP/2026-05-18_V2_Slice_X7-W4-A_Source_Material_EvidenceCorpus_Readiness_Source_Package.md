# V2 Slice X7-W4-A Source Material to EvidenceCorpus Readiness Source Package

**Date:** 2026-05-18
**Status:** Steering Board review package only; implementation and live jobs blocked
**Owner:** Lead Developer / Captain Deputy
**Parent Source Material package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W3-B_Bounded_Page_Summary_Source_Material_Source_Package.md`
**Parent live result:** `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W3-B_Live_Canary_Result.md`
**Parent commits:** `871d6b60` W3-B implementation, `1737ba90` W3-B live-result documentation
**Live-job tranche:** 4 jobs remain. This package proposes no live job by default.

## 1. Purpose

W3-B proved the first bounded hidden/admin-only Source Material path:

- one committed/refreshed product-route canary;
- W2 hidden candidate-provider network completed;
- W3-A hidden source-candidate preview produced materialized records;
- W3-B performed one bounded Wikimedia Page Content Service summary fetch;
- W3-B created one hidden/admin-only `wikimedia_page_summary_extract_text` Source Material record;
- public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover`.

X7-W4-A is the proposed next package: define and implement the first Source Material to EvidenceCorpus readiness gate while still producing no EvidenceCorpus, EvidenceItems, parser output, report, verdict, warning, confidence, or public behavior.

The package should answer one question:

Can V2 admit a runtime-owned W3-B Source Material record as structurally ready for a future EvidenceCorpus stage, while keeping the corpus-build gate closed and rejecting copied, public/admin-artifact, malformed, oversized, or leaking inputs?

## 2. Post-W3B Debate Result

A post-W3B steering debate was run before drafting this package.

Participants:

- Claude Opus 4.6 senior architect / LLM expert;
- Security/containment reviewer;
- Product/quality/cost reviewer;
- Lead Developer / Captain Deputy consolidation.

Positions:

- Claude recommended a W3-C Source Material sweep across more W3-A materialized candidates to build distribution evidence.
- Security/containment recommended W4-A readiness first, because widening network/source exposure before a downstream gate increases surface area.
- Product/quality/cost recommended W4-A readiness first, because more summaries are useful only after the next stage defines what it can admit.

Consolidated Lead Developer recommendation:

1. Choose W4-A first.
2. Keep W3-C Source Material sweep as a later candidate after the EvidenceCorpus readiness/denial boundary exists.
3. Do not add another live job now; W4-A can use the W3-B canary result as evidence and should verify by tests.
4. Keep W2 endpoint durability and second-provider work as separate later tracks.

Rationale:

- W3-B has already proven the first network/source-material path.
- The next risk is accidental downstream interpretation or evidence/report leakage, not lack of another page-summary sample.
- A readiness/denial gate is low-cost, low-live-budget, and reduces risk before more fetch breadth.

## 3. Current Facts

W3-B canary job `0964b2da1f534821b2e01bc7f50a7fff`:

- ran on clean committed/refreshed runtime `871d6b606c3301c40860bb32ed0886598495f24d`;
- first prepared `pipeline: claimboundary-v2`;
- reached `SUCCEEDED`;
- kept public V2 `_schemaVersion: 4.0.0-cb-precutover`;
- kept public `meta.publicCutoverStatus: blocked_precutover`;
- leaked no W2/W3-A/W3-B hidden markers publicly.

Hidden evidence:

- W2: `candidate_provider_network_completed`, `9` candidates, `13742` total bytes;
- W3-A: `9` preview records, `8` materialized, `1` partial, `0` blocked;
- W3-B: `source_material_page_summary_completed`, `1` attempted fetch, `1` Source Material record, `1` fetch diagnostic;
- W3-B Source Material kind: `wikimedia_page_summary_extract_text`;
- W3-B bounded text size: `960` bytes / `960` chars;
- W3-B response status category: `success_2xx`;
- W3-B content type category: `accepted_json`;
- W3-B downstream gate: `source_material_to_evidence_corpus_gate_closed`.

This is enough to design the structural readiness/denial boundary. It is not enough to approve extraction, EvidenceCorpus creation, report quality, provider coverage, or public output.

## 4. Relationship To Existing Absence Path

W4-A is the presence-case complement to the existing X7-B/X7-G absence path. It must not replace, bypass, or regress the current no-source-material denial modules:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/readiness.ts` (`SOURCE_MATERIAL_READINESS_DECISION_VERSION`) proves candidate-only state is not Source Material.
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/contract.ts` (`v2.evidence-lifecycle.source-material-absence-contract.x7b`) packages absence/readiness as a contract.
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard.ts` (`v2.evidence-lifecycle.evidence-corpus.source-material-guard.x7b`) blocks EvidenceCorpus build when no accepted Source Material exists.
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/build-decision.ts` keeps pre-execution EvidenceCorpus build decisions closed.

W4-A should add a new positive structural-readiness path for runtime-owned W3-B Source Material. It must leave the existing absence modules authoritative for no-source-material cases and include focused regression tests proving those modules continue to behave as before.

Visibility marker note:

- Existing absence-path modules use `visibility: "internal_only"` because they are pure structural contracts with no admin artifact exposure.
- W4-A runtime artifacts, if implemented, should use `visibility: "internal_admin_only"` plus `publicPointerExposure: "forbidden"` because they summarize a Source Material-bearing runtime path.
- W4-A pure core may use the same stricter marker for consistency with W3-B, but implementation must document the relationship rather than silently mixing the conventions.

Versioning note:

- W4-A should not reuse `SOURCE_MATERIAL_READINESS_DECISION_VERSION`, because that version describes candidate-only no-source-material readiness.
- W4-A should use a distinct presence-case version such as `v2.evidence-lifecycle.source-material-to-evidence-corpus-readiness.x7w4a`.

## 5. Explicit Non-Goals

X7-W4-A does not authorize:

- new network fetches;
- another live job by default;
- W3-C Source Material sweep;
- Source Material widening beyond the existing one-record W3-B contract;
- parser execution;
- parsing full page/source/html bytes;
- EvidenceCorpus creation;
- EvidenceItems;
- extraction input passed to an LLM;
- semantic text classification or evidence extraction;
- report, verdict, warning, confidence, truth percentage, or public compatibility fields;
- cache IO;
- Source Reliability;
- durable storage;
- retries;
- second provider;
- W2 endpoint migration;
- ACS or direct URL execution;
- prompt, config, model, schema, gateway-policy, or cache-policy edits;
- V1 reuse, V1 work, or V1 cleanup.

## 6. Accepted Inputs

W4-A may accept only process-local, runtime-owned W3-B Source Material decision state from the current product V2 route execution.

Required W3-B parent state:

- public V2 is `blocked_precutover`;
- W2 status is `candidate_provider_network_completed`;
- W3-A has at least one `source_candidate_preview_materialized` record;
- W3-B decision version is `v2.evidence-lifecycle.source-material.page-summary.x7w3b`;
- W3-B status is `source_material_page_summary_completed`;
- W3-B stop reason is `not_stopped`;
- W3-B attempted fetch count is exactly `1`;
- W3-B fetch diagnostic count is exactly `1`;
- W3-B source-material endpoint id is `ep_wikimedia_project_page_summary`;
- W3-B source-material record count is exactly `1` for first W4-A implementation;
- W3-B Source Material record version is `v2.evidence-lifecycle.source-material.page-summary-record.x7w3b`;
- W3-B Source Material kind is `wikimedia_page_summary_extract_text`;
- Source Material visibility is `internal_admin_only`;
- public pointer exposure is `forbidden`;
- source-material text is bounded by the W3-B text cap;
- source-material text hash is present;
- source-material text hash, byte length, and char length recompute to the recorded values;
- fetch diagnostic status is `success`;
- fetch diagnostic content type category is `accepted_json`;
- fetch diagnostic response status category is `success_2xx`;
- W3-B downstream gate remains `source_material_to_evidence_corpus_gate_closed`;
- all parser/cache/SR/storage/EvidenceCorpus/evidence/report/verdict/warning/confidence/public flags are false except the approved W3-B Source Material creation flags.

W4-A must not accept:

- public result JSON;
- admin artifact JSON as execution input;
- copied W3-B records from logs, docs, durable files, route responses, or tests pretending to be runtime-owned state;
- raw provider JSON;
- raw page keys, raw titles, raw URLs, headers, cookies, stack traces, or low-level exception text;
- W3-A preview text as Source Material;
- W2 candidates directly;
- full page/source/html body;
- parser output;
- any provider other than the existing W3-B Source Material record.

Test fixtures may construct structurally equivalent objects for unit tests, but positive production execution must consume producer-owned runtime objects only. Tests must also prove structurally equivalent copied objects fail through provenance checks.

## 7. Readiness Output Contract

W4-A should produce one hidden/admin-only readiness decision and, if implemented in product route, one hidden/admin-only readiness artifact.

Recommended decision version:

```text
v2.evidence-lifecycle.source-material-to-evidence-corpus-readiness.x7w4a
```

Recommended statuses:

- `source_material_structurally_admissible_evidence_corpus_gate_closed`;
- `blocked_pre_evidence_corpus_source_material_absent`;
- `blocked_pre_evidence_corpus_parent_not_completed`;
- `blocked_pre_evidence_corpus_source_material_not_runtime_owned`;
- `blocked_pre_evidence_corpus_source_material_contract_invalid`;
- `blocked_pre_evidence_corpus_source_material_oversized`;
- `blocked_pre_evidence_corpus_source_material_leakage_risk`;
- `blocked_pre_evidence_corpus_downstream_gate_closed`;
- `source_material_to_evidence_corpus_readiness_damaged_structural`.

Recommended stop reasons:

- `not_stopped`;
- `w3b_not_completed`;
- `source_material_record_missing`;
- `source_material_record_count_unsupported`;
- `runtime_ownership_missing`;
- `visibility_invalid`;
- `public_pointer_exposure_invalid`;
- `source_material_kind_unsupported`;
- `source_material_text_missing`;
- `source_material_text_oversized`;
- `source_material_hash_missing`;
- `fetch_diagnostic_not_success`;
- `raw_leakage_marker_detected`;
- `downstream_execution_not_authorized`;
- `structural_exception`.

Allowed readiness fields:

- version;
- visibility `internal_admin_only`;
- public pointer exposure `forbidden`;
- run id and ledger id;
- status and stop reason;
- parent W2/W3-A/W3-B status summaries;
- source-material record count;
- admitted source-material record count;
- rejected source-material record count;
- opaque source-material id/ref;
- source-material kind enum;
- source-material text byte/char length;
- source-material text hash;
- content type category;
- response status category;
- extraction input `null`;
- EvidenceCorpus `null`;
- evidence corpus build authorized `false`;
- EvidenceItems `[]`;
- all downstream flags false;
- downstream gate `evidence_corpus_build_gate_closed`.

Forbidden readiness output:

- source-material text copied into readiness artifact;
- raw page key/title/URL;
- provider JSON;
- response body;
- headers/cookies;
- raw exception details;
- parser packets;
- extraction prompts;
- evidence statements;
- EvidenceCorpus;
- EvidenceItems;
- report prose;
- verdict label;
- truth percentage;
- confidence;
- user-facing warning;
- public compatibility fields.

## 8. Runtime Ownership And Provenance

W4-A should follow the existing V2 pattern and must include producer-owned provenance for positive production admission:

- pure core structural decision module under `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/`;
- required process-local W3-B Source Material provenance marker/reader sidecar;
- required hidden runtime owner under `apps/web/src/lib/analyzer-v2-runtime/`;
- required hidden/admin-only in-memory artifact sink;
- required admin-only no-store readiness artifact route;
- focused product-route hidden observability wiring after W3-B.

Production code must not recover W3-B Source Material from the W3-B admin artifact route. Artifact routes are inspection surfaces, not execution inputs.

The W3-B producer path should mark the W3-B Source Material decision or contained record as producer-owned before W4-A reads it. W4-A must reject JSON clones, `structuredClone`, spread copies, reconstructed objects, route responses, docs/log copies, and post-mark mutated objects even if their structural fields match.

If runtime ownership cannot be proven without reading public/admin artifacts, W4-A must stop before implementation.

## 9. Implementation Envelope For Later Review

This package authorizes no implementation. If approved, the later implementation should stay inside this envelope.

Allowed production files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness-guard.ts`
- required focused W3-B Source Material provenance sidecar in `apps/web/src/lib/analyzer-v2-runtime/`;
- required focused readiness owner in `apps/web/src/lib/analyzer-v2-runtime/`;
- required focused readiness artifact sink in `apps/web/src/lib/analyzer-v2-runtime/`;
- required admin-only no-store artifact route under `apps/web/src/app/api/internal/analyzer-v2/`;
- focused amendments to `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.ts` only to mark producer-owned W3-B Source Material state;
- focused amendments to `apps/web/src/lib/analyzer-v2/orchestrator.ts` for product-route hidden observability.

Allowed test files:

- focused unit tests for W4-A pure readiness/guard modules;
- focused runtime provenance/owner/artifact/route tests;
- focused orchestrator tests;
- focused regression tests for the existing X7-B absence path;
- focused amendments to `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`.

Allowed docs:

- this package;
- minimal pointer-style status/backlog update if needed;
- completion handoff;
- Agent_Outputs;
- generated handoff index.

Forbidden files:

- public API/UI/report/export/compatibility files;
- V1 analyzer/prompt/type/helper files;
- prompt files;
- UCM/default config files;
- model/cache/source-reliability policy files;
- package and lock files;
- W2/W3-A/W3-B network transport changes;
- W3-B endpoint, fetch-count, byte-cap, retry, or source-material body-field changes;
- parser/OCI execution files;
- API persistence/database files;
- runner queue unless a separate reviewed package proves it is required.

## 10. Boundary Guards

W4-A implementation should prove:

- public files do not import W4-A runtime owner, artifact sink, or route internals;
- W4-A does not import V1 analyzer modules;
- W4-A does not import parser, cache, Source Reliability, durable storage, report, verdict, warning-display, public compatibility, ACS/direct URL, or provider transport modules;
- W4-A pure core does not import analyzer-v2-runtime;
- W4-A cannot create EvidenceCorpus or EvidenceItems;
- W4-A cannot call LLM/model/provider code;
- W4-A cannot emit reports, verdicts, warnings, confidence, truth percentage, or public compatibility fields;
- W4-A cannot read from W3-B admin artifact routes as execution input;
- W4-A cannot write cache/SR/storage;
- W4-A cannot mutate gateway/model/cache policy.
- W4-A does not regress existing X7-B source-material absence guards.

## 11. Test Expectations

Focused tests must cover:

- completed producer-owned W3-B Source Material record admitted as `source_material_structurally_admissible_evidence_corpus_gate_closed`;
- missing W3-B Source Material blocked;
- W2/W3-A/W3-B parent not completed blocked;
- copied/admin/public artifact input rejected;
- JSON clone, `structuredClone`, spread copy, reconstructed object, route response, docs/log copy, and post-mark mutated object rejected;
- Source Material kind other than `wikimedia_page_summary_extract_text` rejected;
- blank, missing, oversized, hashless, or hash/length-inconsistent Source Material text rejected;
- raw URL/title/page-key/header/secret/error/report/verdict poison sentinel markers rejected from structural fields and artifacts;
- fetch diagnostic non-success rejected;
- W3-B decision version, record version, `stopReason`, attempted fetch count, fetch diagnostic count, content type category, and response status category validated;
- visibility or public pointer exposure mismatch rejected;
- multiple Source Material records blocked or explicitly unsupported in first implementation;
- source-material text is not emitted in W4-A readiness artifacts;
- EvidenceCorpus remains `null`;
- evidence corpus build authorized remains `false`;
- EvidenceItems remains `[]`;
- extraction input remains `null`;
- parser/cache/SR/storage/report/verdict/warning/confidence/public flags remain false;
- public V2 remains `4.0.0-cb-precutover` / `blocked_precutover` if product-route hidden observability is included;
- artifact route, if added, requires admin key, returns no-store, and sanitizes not-found/error responses.
- existing `source-material/readiness.ts`, `source-material/contract.ts`, `evidence-corpus/source-material-guard.ts`, and `evidence-corpus/build-decision.ts` absence-path tests still pass.

## 12. Required Verifier Set For Later Implementation

Before any W4-A implementation commit, run at least:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/build-decision.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/readiness.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/contract.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
npm run index
git status --short --untracked-files=all
```

Add focused runtime provenance/owner/artifact/route tests to the first command when their filenames exist.

Do not run expensive tests as package verification.

## 13. Live Job Policy

W4-A proposes no live job by default.

Rationale:

- W3-B canary already proved the product-route W2/W3-A/W3-B upstream path.
- W4-A should be a structural readiness/denial gate with focused unit and boundary tests.
- Spending live budget on another hidden canary before new IO or public behavior exists would add cost with limited evidence value.

A live canary may be proposed only if the later W4-A implementation wires new product-route hidden artifacts and reviewers decide route-level proof is necessary. If proposed, it must be one job maximum under a separate reviewed canary section and must use only Captain-defined inputs.

## 14. Reviewer Prompt

Review `Docs/WIP/2026-05-18_V2_Slice_X7-W4-A_Source_Material_EvidenceCorpus_Readiness_Source_Package.md` as the proposed next FactHarbor V2 package after W3-B passed its single canary.

Return `approve`, `modify`, or `reject`.

Check whether:

- W4-A is the right next step before widening Source Material coverage;
- the package correctly treats W3-B Source Material as process-local runtime-owned input, not public/admin artifact input;
- the readiness output contract is strict enough and does not create EvidenceCorpus;
- parser, extraction, EvidenceItems, report, verdict, warning, confidence, public behavior, cache/SR/storage, retries, second provider, W2 endpoint migration, ACS/direct URL, and V1 work remain closed;
- no live job by default is appropriate;
- the implementation envelope and verifier set are sufficient;
- any decision should escalate to Captain before implementation.
