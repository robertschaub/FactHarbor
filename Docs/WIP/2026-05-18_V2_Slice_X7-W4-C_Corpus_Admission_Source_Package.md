# V2 Slice X7-W4-C Corpus-Admission Source Package

**Date:** 2026-05-18
**Status:** Steering Board review package only; implementation and live jobs blocked
**Owner:** Lead Developer / Captain Deputy
**Parent design package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W4-B_EvidenceCorpus_Source_Material_Admission_Design_Package.md`
**Parent design commit:** `006a2785`
**Parent readiness commit:** `b7fa607b`
**Live-job tranche:** 4 jobs remain. This package proposes no live job.

## 1. Purpose

W4-A implemented a hidden/admin-only Source Material to EvidenceCorpus readiness gate and kept corpus building closed.
W4-B then defined the next contract boundary: W4-C may implement only a corpus-admission input gate, not EvidenceCorpus construction.

X7-W4-C is the proposed source package for the minimal implementation:

- pure corpus-admission core;
- runtime-owned W4-A readiness provenance;
- focused tests and boundary guards;
- no product/public wiring;
- no artifact route;
- no live job;
- no EvidenceCorpus creation.

W4-C answers one implementation question:

Can V2 convert producer-owned W4-A readiness into a hidden, text-free corpus-admission input while still reporting `evidenceCorpus: null`, `evidenceCorpusBuildAuthorized: false`, and no EvidenceItems?

## 2. W4-B Review Decisions Carried Forward

Binding W4-B outcomes:

- W4-C output is hash/ref-only by default.
- Source text remains in process-local runtime-owned Source Material state.
- W4-C corpus-admission records and admin artifacts must not copy source text.
- Direct source-text carriage requires a separate reviewed package.
- W4-C output must be named corpus-admission input, not EvidenceCorpus.
- W4-C has no live job and no runner changes.
- W3-C Source Material sweep is deferred unless W4-C review identifies measurable distribution unknowns that block admission.

## 3. Explicit Non-Goals

X7-W4-C does not authorize:

- product-route observability wiring;
- artifact sink or route;
- live jobs;
- W3-C Source Material sweep;
- additional source-material fetches;
- second provider;
- W2 endpoint migration;
- parser execution;
- full page/source/html fetch;
- EvidenceCorpus creation;
- EvidenceItems;
- extraction input passed to LLM;
- semantic relevance or evidence extraction;
- report, verdict, warning, confidence, truth percentage, or public compatibility behavior;
- cache IO;
- Source Reliability;
- durable storage;
- retries;
- ACS or direct URL execution;
- prompt, config, model, schema, gateway-policy, or cache-policy edits;
- V1 reuse, V1 work, or V1 cleanup.

## 4. Current Metadata Gap

W4-A readiness currently exposes text-free source-material identity, kind, hash, byte length, char length, response status, and content type.

It does not expose W3-B `providerId` or `languageCode`.

W4-C must not bypass W4-A by reading W3-B directly. Therefore W4-C has two possible postures:

1. implement corpus-admission input only from current W4-A fields, without provider/language metadata; or
2. include a focused W4-A readiness metadata extension for `providerId` and `languageCode`, validated from the runtime-owned W3-B record and still text-free.

Recommendation:

- choose option 2 inside the W4-C package;
- limit the W4-A amendment to `providerId` and `languageCode` in `EvidenceCorpusSourceMaterialReadinessRecordSummary`;
- validate `providerId` and `languageCode` as nonblank structural fields;
- include `providerId` and `languageCode` in W4-A's structural leak scan;
- emit `providerId` and `languageCode` in W4-A readiness output only as text-free metadata;
- preserve W4-A's text-free artifact posture;
- add W4-A regression tests proving no source text appears in readiness/admission output.

Rationale:

- provider and language metadata are structural corpus-admission metadata, not semantic evidence;
- later extraction planning will need language/provider lineage;
- adding those fields at W4-A avoids W4-C reaching around the readiness gate to W3-B runtime objects.

If reviewers reject the W4-A metadata extension, W4-C should stop and return with a narrower package rather than reading W3-B directly.

## 5. Approved Implementation Envelope

This package authorizes no implementation until reviewed and committed. If accepted, implementation must stay inside this envelope.

Allowed production files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-admission.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness.ts` for the focused `providerId` / `languageCode` text-free metadata extension only
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-provenance.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-owner.ts` only to mark producer-owned W4-A readiness decisions
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-owner.ts`

Allowed test files:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-admission.test.ts`
- focused amendments to `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-provenance.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-owner.test.ts`
- focused amendments to `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-owner.test.ts`
- focused amendments to `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Allowed docs:

- this package;
- minimal pointer-style status/backlog update;
- completion handoff;
- Agent_Outputs;
- generated handoff index.

Forbidden files:

- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- W4-A artifact sink or route files;
- W3-B artifact sink or route files;
- public API/UI/report/export/compatibility files;
- V1 analyzer/prompt/type/helper files;
- prompt files;
- UCM/default config files;
- model/cache/source-reliability policy files;
- package and lock files;
- W2/W3-A/W3-B network transport files;
- W3-C sweep files;
- parser/OCI execution files;
- API persistence/database files;
- runner queue.

## 6. Runtime Ownership

Future implementation must add W4-A readiness provenance:

- only the W4-A producer/owner may mark readiness decisions as runtime-owned;
- W4-C may consume only the W4-A readiness provenance reader;
- copied, JSON-round-tripped, spread, `structuredClone`, reconstructed, docs/log/admin-route, and post-mark mutated W4-A decisions must fail closed;
- W4-C must not read W3-B or W4-A admin artifact routes as execution input.

The W4-A mark function must not be exported from a barrel or imported by public/product surfaces.

Pure-core split:

- `source-material-admission.ts` may accept a W4-A readiness decision plus an explicit runtime-ownership/provenance boolean or structural provenance result.
- `source-material-admission.ts` must not import runtime provenance or owner modules.
- the runtime owner may read W4-A provenance, pass the owned decision plus ownership result into the pure core, and return the core decision.
- W4-C must reject direct W3-B Source Material decisions, W3-B records, and W3-B runtime-owner outputs even when structurally valid.

Metadata-extension stop rule:

If adding `providerId` / `languageCode` requires W4-C to read W3-B directly, add product-route wiring, add artifact routes, or spend a live canary, W4-C must stop and return for package review.

## 7. Corpus-Admission Output Contract

Recommended decision version:

```text
v2.evidence-lifecycle.evidence-corpus-source-material-admission.x7w4c
```

Recommended positive status:

```text
source_material_admitted_to_corpus_input_gate_closed
```

Recommended blocked statuses:

- `blocked_pre_evidence_corpus_readiness_absent`;
- `blocked_pre_evidence_corpus_readiness_not_runtime_owned`;
- `blocked_pre_evidence_corpus_readiness_not_admissible`;
- `blocked_pre_evidence_corpus_source_material_kind_unsupported`;
- `blocked_pre_evidence_corpus_source_material_hash_invalid`;
- `blocked_pre_evidence_corpus_source_material_oversized`;
- `blocked_pre_evidence_corpus_source_material_leakage_risk`;
- `blocked_pre_evidence_corpus_downstream_execution_not_authorized`;
- `evidence_corpus_source_material_admission_damaged_structural`.

Recommended stop reasons:

- `not_stopped`;
- `w4a_not_completed`;
- `runtime_ownership_missing`;
- `source_material_kind_unsupported`;
- `source_material_identity_missing`;
- `source_material_hash_missing`;
- `source_material_length_invalid`;
- `source_material_record_count_unsupported`;
- `raw_leakage_marker_detected`;
- `downstream_execution_not_authorized`;
- `structural_exception`.

Required top-level fields:

- admission decision version;
- visibility `internal_admin_only`;
- public pointer exposure `forbidden`;
- status and stop reason;
- parent W4-A status, stop reason, and decision version;
- source-material record count, initially exactly `1`;
- admitted corpus-admission input count;
- rejected corpus-admission input count;
- `corpusAdmissionInput`, nullable;
- `evidenceCorpus: null`;
- `evidenceCorpusBuildAuthorized: false`;
- `evidenceItems: []`;
- `extractionInput: null`;
- downstream gate `evidence_corpus_construction_gate_closed`;
- public cutover status `blocked_precutover`;
- product execution flags proving parser/cache/SR/storage/EvidenceItems/report/verdict/warning/confidence/public behavior remained false.

## 8. Corpus-Admission Input Shape

Positive `corpusAdmissionInput` should be text-free.

Allowed fields:

- input version;
- opaque corpus admission input id;
- opaque source-material ref;
- opaque locator ref;
- opaque candidate preview id;
- provider id, from the W4-A metadata extension;
- source-material endpoint id;
- source-material kind;
- language code, from the W4-A metadata extension;
- source-material text hash;
- source-material text byte length;
- source-material text char length;
- response status category;
- content type category;
- truncation flag, initially `false`;
- source material record count, initially `1`;
- W4-A readiness version/status lineage;
- downstream flags all false.

Forbidden fields:

- source-material text;
- raw provider JSON;
- raw URL;
- raw page title;
- raw page key;
- provider-returned URL;
- request URL;
- headers;
- cookies;
- secrets;
- stack traces;
- low-level exception text;
- parser packet or parsed material;
- LLM prompt text;
- extraction input packet;
- EvidenceCorpus;
- EvidenceItems;
- evidence statements;
- Source Reliability score;
- probative value;
- claim direction;
- verdict label;
- truth percentage;
- confidence;
- warning;
- report prose;
- public compatibility fields.

## 9. Denial Matrix

Future W4-C must fail closed for:

| Condition | Expected posture |
|---|---|
| W4-A missing | blocked |
| W4-A not runtime-owned | blocked |
| W4-A copied via JSON, spread, `structuredClone`, reconstruction, docs/log/admin route | blocked |
| W4-A positive-looking but post-mark mutated | blocked |
| W4-A status not admissible | blocked |
| W4-A source-material record count not exactly `1` for initial implementation | blocked |
| Unsupported source-material kind | blocked |
| Missing provider or language metadata after W4-A metadata extension | blocked |
| Missing or invalid source-material hash/length | blocked |
| Structural leak marker in admission metadata | blocked |
| Attempt to create EvidenceCorpus/EvidenceItem/report/verdict/warning/confidence/public output | blocked |
| Attempt to read cache/SR/storage or admin artifact route as execution input | blocked |
| Attempt to copy source text into corpus-admission output | blocked |

## 10. Test Expectations

Focused tests must cover:

- producer-owned W4-A readiness admitted as `source_material_admitted_to_corpus_input_gate_closed`;
- corpus-admission output carries no source text;
- corpus-admission output uses hash/ref metadata only;
- `evidenceCorpus` remains `null`;
- `evidenceCorpusBuildAuthorized` remains `false`;
- `evidenceItems` remains `[]`;
- `extractionInput` remains `null`;
- `providerId` and `languageCode` are carried through W4-A readiness after the metadata extension;
- W4-C rejects direct W3-B Source Material decisions, W3-B records, and W3-B runtime-owner outputs even when structurally valid;
- absent, incomplete, copied, JSON, spread, `structuredClone`, reconstructed, route-derived, docs/log, and post-mark mutated W4-A decisions are blocked;
- unsupported source-material kind is blocked;
- missing provider/language/hash/length is blocked;
- raw URL/title/page-key/header/secret/error/source-text/report/verdict poison markers are rejected;
- parser/cache/SR/storage/report/verdict/warning/confidence/public flags remain false;
- W4-A readiness tests still prove no source text appears in readiness output.

## 11. Boundary Guards

W4-C implementation must prove:

- pure core does not import `analyzer-v2-runtime`;
- no W4-C source, including runtime owner, provenance, or admission owner code, imports W3-B runtime owner, W3-B provenance, W3-B source-material modules, or W3-B artifact routes;
- no W4-C source imports V1 analyzer modules;
- no W4-C source imports parser, cache, Source Reliability, storage, report, verdict, warning-display, public compatibility, ACS/direct URL, provider transport, or provider SDK modules;
- public files do not import W4-C runtime owner or W4-A provenance internals;
- W4-C cannot create `EvidenceCorpus`;
- W4-C cannot create EvidenceItems;
- W4-C cannot output source text;
- W4-C cannot call LLM/model/provider code;
- W4-C cannot read W3-B or W4-A admin artifact routes as execution input;
- the only W3-B-derived fields allowed into W4-C are `providerId` and `languageCode` after W4-A has added them to its text-free readiness summary;
- W4-C cannot write cache/SR/storage;
- W4-C cannot mutate gateway/model/cache policy;
- W4-C does not regress W4-A or X7-B absence-path tests.

## 12. Required Verifier Set For Later Implementation

Before any W4-C implementation commit, run at least:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-admission.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/build-decision.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-provenance.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-owner.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
npm run index
git status --short --untracked-files=all
```

Do not run expensive tests or live jobs as W4-C implementation verification.

## 13. Live Job Policy

W4-C proposes no live job.

Rationale:

- W4-C has no product-route wiring;
- W4-C performs no network IO;
- W4-C creates no artifact route;
- focused unit/boundary tests are enough to prove the hidden admission contract.

Any live proof must be a separate reviewed canary package after W4-C implementation and only if reviewers approve product-route observability wiring first.

## 14. Exit Conditions And Next Decision

W4-C implementation passes only if focused verifiers prove:

- producer-owned W4-A readiness becomes exactly one text-free corpus-admission input;
- `providerId` and `languageCode` are present through W4-A readiness metadata;
- direct W3-B bypass inputs are rejected;
- copied/cloned/reconstructed/mutated W4-A inputs are rejected;
- `evidenceCorpus` remains `null`;
- `evidenceCorpusBuildAuthorized` remains `false`;
- `evidenceItems` remains `[]`;
- `extractionInput` remains `null`;
- no product wiring, artifact route, live job, public output, parser, cache/SR/storage, report, verdict, warning, or confidence behavior is added.

W4-C must stop and return for review if:

- the metadata extension cannot be implemented without W3-B bypass;
- implementation needs product-route wiring, artifact routes, runner changes, or live evidence;
- source text needs to be copied into admission output;
- W4-C needs to create EvidenceCorpus or EvidenceItems.

Post-W4-C next decision:

- proceed to corpus-construction or extraction-readiness design only if W4-C passes and no distribution unknown blocks the next contract;
- prepare W3-C only if W4-C exposes specific measurable distribution unknowns, such as admission rejection rate, blank/oversized source-material frequency, unsupported kind rate, language/provider metadata availability, or text-length distribution needed for extraction planning.

## 15. Reviewer Prompt

Review `Docs/WIP/2026-05-18_V2_Slice_X7-W4-C_Corpus_Admission_Source_Package.md` as the proposed next FactHarbor V2 package after W4-B commit `006a2785`.

Return `approve`, `modify`, or `reject`.

Check whether:

- W4-C is the right next package before W3-C;
- the focused W4-A `providerId` / `languageCode` metadata extension is justified and still text-free;
- the implementation envelope is narrow enough;
- W4-C correctly creates corpus-admission input only, not EvidenceCorpus;
- source text stays out of W4-C output and artifacts;
- product-route wiring, artifact routes, live jobs, parser, EvidenceItems, report/verdict/warning/confidence/public behavior, cache/SR/storage, retries, provider expansion, W2 endpoint migration, ACS/direct URL, V1 work, and V1 cleanup remain closed;
- any decision should escalate to Captain before implementation.
