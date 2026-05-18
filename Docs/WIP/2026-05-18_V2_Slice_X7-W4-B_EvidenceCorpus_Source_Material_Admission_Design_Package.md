# V2 Slice X7-W4-B EvidenceCorpus Source Material Admission Design Package

**Date:** 2026-05-18
**Status:** Steering Board review package only; implementation and live jobs blocked
**Owner:** Lead Developer / Captain Deputy
**Parent readiness package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W4-A_Source_Material_EvidenceCorpus_Readiness_Source_Package.md`
**Parent readiness commit:** `b7fa607b`
**Parent live evidence:** W3-B job `0964b2da1f534821b2e01bc7f50a7fff`
**Live-job tranche:** 4 jobs remain. This package proposes no live job.

## 1. Purpose

W3-B proved one bounded hidden/admin-only Source Material path from a Wikimedia page-summary endpoint.
W4-A then proved that a runtime-owned W3-B Source Material decision can be structurally recognized while keeping the EvidenceCorpus build gate closed.

X7-W4-B is the proposed next design package: define the first EvidenceCorpus source-material admission contract before implementing corpus creation, widening Source Material fetches, or spending more live-job budget.

W4-B answers one question:

What may a future EvidenceCorpus admission stage accept from W4-A, preserve, reject, and expose as hidden/admin-only corpus-admission state without becoming EvidenceItem extraction or public report behavior?

## 2. Next-Direction Debate

A compact post-W4A review was run before drafting this package.

Participants:

- Security/containment reviewer;
- Product/quality/cost reviewer;
- Architecture/implementation-sequencing reviewer;
- Claude Opus 4.6 was attempted twice through `node scripts/agents/invoke-claude.cjs`, but both calls timed out and returned no review result.

Returned consensus:

1. Choose W4-B before W3-C.
2. Keep W4-B design/package-first, with no implementation and no live job.
3. Defer W3-C Source Material sweep until the admission contract defines which distribution properties matter.
4. Treat W3-B's single canary as enough evidence to design the first contract, not enough evidence to approve EvidenceCorpus creation.

Rationale:

- More page summaries would add network/source-text surface before the downstream admission contract exists.
- W4-A deliberately closed the gate; the next architectural gap is what may pass through that gate later.
- A design-only package is lower cost and reduces leakage and interpretation risk before any corpus-building implementation.

## 3. Current Facts

W3-B canary job `0964b2da1f534821b2e01bc7f50a7fff`:

- ran on committed/refreshed runtime `871d6b606c3301c40860bb32ed0886598495f24d`;
- first prepared `pipeline: claimboundary-v2`;
- reached `SUCCEEDED`;
- kept public V2 `_schemaVersion: 4.0.0-cb-precutover`;
- kept public `meta.publicCutoverStatus: blocked_precutover`;
- leaked no W2/W3-A/W3-B hidden markers publicly;
- recorded W2 `candidate_provider_network_completed`, `9` candidates, and `13742` total bytes;
- recorded W3-A `8` materialized preview records;
- recorded W3-B `source_material_page_summary_completed`, `1` attempted fetch, `1` Source Material record, and `1` fetch diagnostic;
- created Source Material kind `wikimedia_page_summary_extract_text`;
- kept parser execution, cache read/write, storage write, Source Reliability, EvidenceCorpus, EvidenceItems, report, verdict, warning, confidence, and public surface writes false.

W4-A commit `b7fa607b`:

- implemented `v2.evidence-lifecycle.source-material-to-evidence-corpus-readiness.x7w4a`;
- accepts only producer-owned W3-B runtime state;
- rejects copied, cloned, reconstructed, malformed, oversized, or leaking inputs;
- emits text-free hidden/admin-only readiness artifacts;
- records source-material hash/length/status summaries only;
- keeps `extractionInput: null`, `evidenceCorpus: null`, `evidenceCorpusBuildAuthorized: false`, and `evidenceItems: []`;
- ran no W4-A live job.

These facts are enough to define corpus-admission boundaries. They are not enough to create EvidenceCorpus records, extract EvidenceItems, judge report quality, or broaden provider/source coverage.

## 4. W4-B Decision

W4-B should be a design/source-package decision, not an implementation slice.

Recommended decision:

- define the minimal future corpus-admission contract;
- define which fields are allowed, forbidden, copied, referenced, hashed, or retained as runtime-only source material;
- define which failures remain denial states;
- define the future implementation envelope and verifier set;
- explicitly defer W3-C until after the contract identifies what distribution evidence is needed.

W4-B should not create source files, tests, runtime routes, artifacts, or live jobs. A later W4-C source package may implement the accepted W4-B contract if Steering Board review approves it.

W4-B acceptance must produce an explicit next-step decision, not automatic implementation authorization:

- proceed to a narrow W4-C admission implementation package if the contract is clear enough; or
- prepare W3-C first if reviewers identify distribution unknowns that materially affect the admission contract.

## 5. Non-Goals

X7-W4-B does not authorize:

- implementation;
- live jobs;
- W3-C Source Material sweep;
- additional source-material fetches;
- second provider;
- W2 endpoint migration;
- parser execution;
- full page/source/html fetch;
- EvidenceCorpus creation;
- EvidenceItems;
- LLM extraction input;
- semantic relevance or evidence extraction;
- report, verdict, warning, confidence, truth percentage, or public compatibility behavior;
- cache IO;
- Source Reliability;
- durable storage;
- retries;
- ACS or direct URL execution;
- prompt, config, model, schema, gateway-policy, or cache-policy edits;
- V1 reuse, V1 work, or V1 cleanup.

## 6. Terminology Boundary

W4-B must keep these entities distinct:

| Entity | Meaning in this package | Must not become |
|---|---|---|
| Source Material | bounded hidden/admin-only fetched source text plus structural metadata from W3-B | EvidenceItem, report excerpt, public source, parser output |
| W4-A readiness | text-free structural admissibility/denial decision | corpus record, extraction input, public signal |
| EvidenceCorpus admission record | future hidden/admin-only normalized stage input record, if later implemented | verdict evidence, claim direction, probative value, Source Reliability score |
| EvidenceCorpus | future collection of admitted source-material records plus lineage | generated evidence, verdict reasoning, public report |
| EvidenceItem | future LLM-extracted evidence statement | Source Material or corpus admission metadata |

The first future corpus-admission record should be normalized stage input, not another fetch artifact and not an EvidenceItem.

## 7. Accepted Inputs For Future W4-C

A later W4-C implementation may accept only process-local, runtime-owned W4-A readiness decisions from the current product V2 route execution.

Required parent state:

- W4-A decision version is `v2.evidence-lifecycle.source-material-to-evidence-corpus-readiness.x7w4a`;
- W4-A status is `source_material_structurally_admissible_evidence_corpus_gate_closed`;
- W4-A stop reason is `not_stopped`;
- W4-A visibility is `internal_admin_only`;
- W4-A public pointer exposure is `forbidden`;
- W4-A public cutover status is `blocked_precutover`;
- W4-A source material record count is `1` as an initial W4-C slice limit, not a canonical long-term corpus limit;
- W4-A admitted source material record count is `1` as an initial W4-C slice limit;
- W4-A rejected source material record count is `0` as an initial W4-C slice limit;
- W4-A source-material kind is `wikimedia_page_summary_extract_text`;
- W4-A response status category is `success_2xx`;
- W4-A content type category is `accepted_json`;
- W4-A carries a nonblank source-material hash and bounded byte/char lengths;
- W4-A has `extractionInput: null`, `evidenceCorpus: null`, `evidenceCorpusBuildAuthorized: false`, and `evidenceItems: []`;
- all parser/cache/SR/storage/report/verdict/warning/confidence/public flags remain false.

Future W4-C must not accept:

- public result JSON;
- W3-B or W4-A admin artifact JSON as execution input;
- copied W3-B Source Material records;
- copied W4-A readiness decisions;
- docs/log copies;
- raw provider JSON;
- raw page key, raw title, raw URL, headers, cookies, low-level exception text, or stack traces;
- W3-A preview records directly;
- W2 candidates directly;
- parser output;
- Source Reliability data;
- any source-material kind not explicitly approved by the package under review.

## 8. Future Corpus Admission Contract Sketch

If W4-B is accepted, a later W4-C package may define a pure core decision version such as:

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

The first future admission decision must still report `evidenceCorpus: null` and `evidenceCorpusBuildAuthorized: false`.
W4-C must not create an `EvidenceCorpus`; corpus construction must be a later package.

## 9. Future Corpus Record Shape

W4-B recommends a minimal hidden/admin-only corpus-admission record shape for later W4-C review.

Allowed fields:

- record version;
- visibility `internal_admin_only`;
- public pointer exposure `forbidden`;
- opaque corpus input id;
- opaque source-material ref;
- opaque locator ref;
- opaque candidate preview id;
- source-material kind enum;
- provider family id;
- source-material endpoint id;
- source-material text hash;
- source-material text byte length;
- source-material text char length;
- language code;
- response status category;
- content type category;
- truncation flag, initially `false`;
- structural provenance from W4-A;
- downstream flags proving parser/cache/SR/storage/EvidenceItems/report/verdict/warning/confidence/public behavior remained false.

Text posture decision:

- The default W4-C corpus-admission output should carry hash/ref metadata only.
- Bounded source text should remain in process-local runtime-owned Source Material state.
- A later extraction gate may access bounded source text only through a process-local runtime-owned accessor that rejects copied, cloned, reconstructed, route-derived, or post-mark mutated state.
- W4-C corpus-admission records and admin artifacts must not copy source text.
- Direct bounded text carriage requires a separate Steering-reviewed package before implementation.

## 10. Forbidden Corpus Admission Fields

Future W4-C corpus-admission output must not include:

- public result fields;
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
- extraction input packet unless separately reviewed;
- EvidenceItems;
- evidence statements;
- source reliability score;
- probative value;
- claim direction;
- verdict label;
- truth percentage;
- confidence;
- warning;
- report prose;
- public compatibility fields.

## 11. Denial Matrix

Future W4-C must fail closed for:

| Condition | Expected posture |
|---|---|
| W4-A missing | blocked |
| W4-A not runtime-owned | blocked |
| W4-A copied via JSON, spread, `structuredClone`, reconstruction, docs/log/admin route | blocked |
| W4-A positive-looking but post-mark mutated | blocked |
| W4-A status not admissible | blocked |
| W4-A source-material record count not exactly `1` for first implementation | blocked |
| Unsupported source-material kind | blocked |
| Missing or invalid source-material hash/length | blocked |
| Structural leak marker in corpus-admission metadata | blocked |
| Attempt to create EvidenceItem/report/verdict/warning/confidence/public output | blocked |
| Attempt to read cache/SR/storage or admin artifact route as execution input | blocked |
| Attempt to copy source text into corpus-admission output or admin artifact | blocked |

## 12. Relationship To W3-C

W3-C Source Material sweep remains useful, but only after W4-B defines what to measure.

Likely future W3-C distribution questions:

- How often do W3-A materialized locators lead to successful page-summary Source Material?
- How often is source-material text blank, oversized, structurally rejected, or non-JSON?
- How often do language codes or locator refs fail across Captain-defined inputs?
- How often would the first corpus-admission contract reject otherwise successful Source Material?
- How often is the source-material kind unsupported by the accepted admission contract?
- What source-material text length distribution affects hash/ref-only admission and later extraction planning?
- How often is provider/language metadata unavailable or structurally invalid?

W3-C should not run before W4-B because breadth without admission criteria can create noise, spend live budget, and bias the corpus design around incidental Wikimedia summary behavior.

W3-C becomes justified only if W4-B or W4-C review identifies one of these measurable unknowns as blocking the next step.

## 13. Implementation Envelope For Later W4-C Review

This package authorizes no implementation. If W4-B is accepted, a later W4-C implementation package should stay near this envelope.

Minimum W4-C package shape:

- pure corpus-admission core;
- runtime-owned W4-A provenance validation;
- focused tests and boundary guards;
- no live job;
- no runner changes;
- no product/public behavior;
- no EvidenceCorpus creation.

Optional W4-C add-ons require separate justification inside the W4-C package:

- metadata-only hidden/admin-only artifact sink;
- metadata-only internal no-store route;
- product-route hidden observability.

If any optional route/artifact is approved, it must be text-free, admin-only, no-store, and never executable input. W4-C execution may not read its own route, the W4-A route, or the W3-B route.

Potential production files:

- new pure core under `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/`;
- required W4-A readiness runtime-owned provenance sidecar or reader under `apps/web/src/lib/analyzer-v2-runtime/`;
- focused hidden runtime owner under `apps/web/src/lib/analyzer-v2-runtime/`;
- optional bounded hidden/admin-only artifact sink and internal no-store route only if the W4-C package proves inspection value;
- focused product-route hidden observability wiring only if the W4-C package explicitly approves it.

Potential tests:

- pure corpus-admission tests;
- runtime provenance tests;
- copied/JSON/spread/structured-clone/reconstructed/post-mark mutation rejection tests;
- leak sentinel tests;
- boundary guard tests;
- W4-A regression tests proving the readiness gate still does not create corpus output.

Forbidden implementation files:

- public API/UI/report/export/compatibility files;
- V1 analyzer/prompt/type/helper files;
- prompt files;
- UCM/default config files;
- model/cache/source-reliability policy files;
- package and lock files;
- W2/W3-A/W3-B network transport changes;
- W3-C sweep files;
- parser/OCI execution files;
- API persistence/database files;
- runner queue.

## 14. Boundary Guards For Later W4-C

Future implementation should prove:

- W4-C pure core does not import `analyzer-v2-runtime`;
- W4-C imports no V1 analyzer modules;
- W4-C imports no parser, cache, Source Reliability, storage, report, verdict, warning-display, public compatibility, ACS/direct URL, provider transport, or provider SDK modules;
- public files do not import W4-C runtime owner, artifact sink, or route internals;
- W4-C cannot create EvidenceItems;
- W4-C cannot create `EvidenceCorpus`;
- W4-C cannot output source text;
- W4-C cannot name its first output as `EvidenceCorpus`; it remains corpus-admission input only;
- W4-C cannot call LLM/model/provider code;
- W4-C cannot emit reports, verdicts, warnings, confidence, truth percentage, or public compatibility fields;
- W4-C cannot read W3-B or W4-A admin artifact routes as execution input;
- W4-C cannot write cache/SR/storage;
- W4-C cannot mutate gateway/model/cache policy;
- W4-C does not regress W4-A or X7-B absence-path tests.

## 15. Review Questions

Reviewers should decide:

1. Is W4-B the right next package before W3-C?
2. Does the package correctly close the text posture: W4-C corpus-admission output is hash/ref-only, while source text remains process-local runtime-owned Source Material state unless a separate reviewed package opens direct text carriage?
3. Does the package correctly close the naming posture: W4-C output remains `corpus-admission input` or `EvidenceCorpusAdmissionRecord`, not `EvidenceCorpus`?
4. Are the blocked statuses and denial matrix sufficient?
5. Is a future W4-C implementation package the correct next step after W4-B, or should W3-C distribution sampling come first once the contract is reviewed?

## 16. Reviewer Prompt

Review `Docs/WIP/2026-05-18_V2_Slice_X7-W4-B_EvidenceCorpus_Source_Material_Admission_Design_Package.md` as the proposed next FactHarbor V2 package after W4-A commit `b7fa607b`.

Return `approve`, `modify`, or `reject`.

Check whether:

- W4-B should precede W3-C;
- the package keeps W4-B design-only and blocks implementation/live jobs;
- the Source Material, W4-A readiness, corpus-admission, EvidenceCorpus, and EvidenceItem boundaries are clear;
- the future input contract correctly requires process-local runtime-owned W4-A state;
- the future corpus-admission record shape avoids EvidenceItem/report/verdict semantics;
- parser, Source Reliability, cache/storage, public exposure, retries, provider expansion, W2 endpoint migration, ACS/direct URL, V1 work, and V1 cleanup remain closed;
- any open design point requires Captain decision before a later W4-C implementation package.
