# V2 Slice X7-W4-D EvidenceCorpus Shell Source Package

**Date:** 2026-05-18
**Status:** Steering Board review package only; implementation and live jobs blocked
**Owner:** Lead Developer / Captain Deputy
**Parent implementation package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W4-C_Corpus_Admission_Source_Package.md`
**Parent implementation commit:** `471d230b`
**Live-job tranche:** 4 jobs remain. This package proposes no live job.

## 1. Purpose

X7-W4-C implemented the first hidden/admin-only corpus-admission input gate from producer-owned W4-A readiness.
It is still not EvidenceCorpus construction: W4-C output remains hash/ref-only and keeps `evidenceCorpus: null`, `evidenceCorpusBuildAuthorized: false`, `evidenceItems: []`, and `extractionInput: null`.

X7-W4-D is the proposed next source package.
It asks reviewers to approve the smallest possible EvidenceCorpus crossing:

- consume only producer-owned W4-C corpus-admission output;
- create exactly one hidden/admin-only `EvidenceCorpus` shell/manifest;
- keep extraction, EvidenceItems, parser, report/verdict/warning/confidence, public behavior, cache/SR/storage, retries, provider expansion, ACS/direct URL, and V1 work closed.

W4-D does not create evidence. It creates only a corpus container shell that can later be used by a separately reviewed extraction-readiness package.

## 2. Expert Review Consolidation

Post-W4-C review produced two positions:

- Claude Opus recommended a docs-only decision package before creating any EvidenceCorpus object.
- Local Senior Architect, Security/Containment, and Product/Quality/Cost reviewers recommended the minimal EvidenceCorpus shell as the next target, provided it remains text-free, hidden/admin-only, and extraction-closed.

Consolidated recommendation:

- prepare this W4-D package before implementation;
- make W4-D the minimal `EvidenceCorpus` shell package if reviewers approve it;
- do not implement directly from W4-C without this package;
- do not introduce another readiness-only gate unless W4-D review identifies a specific contract or containment gap that the shell package cannot safely cover.

## 3. Explicit Non-Goals

X7-W4-D does not authorize:

- implementation before review;
- product-route observability wiring;
- artifact sink or artifact route;
- live jobs;
- W3-C Source Material sweep;
- additional source-material fetches;
- multiple Source Material records;
- second provider;
- W2 endpoint migration;
- parser execution;
- full page/source/html fetch;
- source-text carriage in EvidenceCorpus;
- extraction input;
- EvidenceItems;
- LLM evidence extraction;
- semantic relevance assessment;
- report, verdict, warning, confidence, truth percentage, or public compatibility behavior;
- cache IO;
- Source Reliability;
- durable storage;
- retries;
- ACS or direct URL execution;
- prompt, config, model, schema, gateway-policy, or cache-policy edits;
- V1 reuse, V1 work, or V1 cleanup.

## 4. Recommended Architecture

W4-D should add one shell-only corpus boundary.

Recommended source flow:

```text
W3-B runtime-owned Source Material
  -> W4-A runtime-owned readiness
  -> W4-C runtime-owned corpus-admission input
  -> W4-D hidden EvidenceCorpus shell
  -> extraction gate closed
```

Recommended split:

- pure core builds the shell decision from a W4-C admission decision plus explicit runtime ownership;
- runtime owner reads W4-C admission provenance and calls the pure core;
- W4-C owner marks admission decisions as producer-owned;
- copied, JSON-round-tripped, spread, `structuredClone`, reconstructed, route-derived, docs/log, and post-mark mutated W4-C decisions fail closed.

W4-D must not read W3-B Source Material or W4-A readiness directly.
The only allowed input is producer-owned W4-C corpus admission.

## 5. EvidenceCorpus Shell Semantics

W4-D may create a non-null corpus shell, but it must not imply extraction readiness.

Recommended positive status:

```text
evidence_corpus_shell_created_extraction_gate_closed
```

Recommended downstream gate:

```text
evidence_item_extraction_gate_closed
```

Recommended shell semantics:

- `evidenceCorpus.kind: "shell_only"`;
- `corpusTextAccess: "closed"`;
- `semanticExtractionAuthorized: false`;
- `extractionInput: null`;
- `evidenceItems: []`;
- `evidenceItemExtractionAuthorized: false`;
- parser/cache/SR/storage/report/verdict/warning/confidence/public flags remain false.

Important wording:

The W4-D shell is a corpus container/manifest, not analytical evidence.
It is not sufficient input for report generation, verdict generation, confidence calculation, warning generation, Source Reliability scoring, or EvidenceItem extraction.

## 6. EvidenceCorpus Shell Shape

Recommended shell fields:

- shell version;
- opaque `evidenceCorpusId`;
- `kind: "shell_only"`;
- visibility `internal_admin_only`;
- public pointer exposure `forbidden`;
- source-material ref list, initially exactly one;
- locator ref list, initially exactly one;
- candidate preview id list, initially exactly one;
- provider id list, initially exactly one;
- source-material endpoint id list, initially exactly one;
- language code list, initially exactly one;
- source-material kind list, initially exactly one;
- source-material text hash list, initially exactly one;
- aggregate byte length and char length;
- W4-C admission lineage;
- W4-A readiness lineage from W4-C input;
- `corpusTextAccess: "closed"`;
- `semanticExtractionAuthorized: false`;
- `evidenceItemExtractionAuthorized: false`;
- downstream execution flags all false.

Forbidden shell fields:

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

## 7. Output Contract

Recommended decision version:

```text
v2.evidence-lifecycle.evidence-corpus-shell.x7w4d
```

Recommended positive status:

```text
evidence_corpus_shell_created_extraction_gate_closed
```

Recommended blocked statuses:

- `blocked_pre_evidence_corpus_admission_absent`;
- `blocked_pre_evidence_corpus_admission_not_runtime_owned`;
- `blocked_pre_evidence_corpus_admission_mutated_after_provenance`;
- `blocked_pre_evidence_corpus_admission_not_admissible`;
- `blocked_pre_evidence_corpus_readiness_lineage_invalid`;
- `blocked_pre_evidence_corpus_source_material_metadata_incomplete`;
- `blocked_pre_evidence_corpus_source_material_record_count_unsupported`;
- `blocked_pre_evidence_corpus_source_material_hash_invalid`;
- `blocked_pre_evidence_corpus_source_material_oversized`;
- `blocked_pre_evidence_corpus_source_material_leakage_risk`;
- `blocked_pre_evidence_corpus_downstream_execution_not_authorized`;
- `evidence_corpus_shell_damaged_structural`.

Recommended stop reasons:

- `not_stopped`;
- `w4c_not_completed`;
- `w4c_admission_not_positive`;
- `runtime_ownership_missing`;
- `admission_post_mark_mutated`;
- `readiness_lineage_inconsistent`;
- `source_material_metadata_incomplete`;
- `source_material_identity_missing`;
- `source_material_hash_missing`;
- `source_material_hash_invalid`;
- `source_material_length_invalid`;
- `source_material_record_count_unsupported`;
- `raw_leakage_marker_detected`;
- `downstream_execution_not_authorized`;
- `structural_exception`.

Required top-level fields:

- decision version;
- visibility `internal_admin_only`;
- public pointer exposure `forbidden`;
- status and stop reason;
- parent W4-C status, stop reason, and decision version;
- source-material record count, initially exactly `1`;
- `evidenceCorpus`, non-null only for the shell-positive path;
- `evidenceCorpus.kind: "shell_only"`;
- `evidenceItems: []`;
- `extractionInput: null`;
- `evidenceItemExtractionAuthorized: false`;
- downstream gate `evidence_item_extraction_gate_closed`;
- public cutover status `blocked_precutover`;
- product execution flags proving parser/cache/SR/storage/EvidenceItems/report/verdict/warning/confidence/public behavior remained false.

## 8. Denial Matrix

Future W4-D must fail closed for:

| Condition | Expected posture |
|---|---|
| W4-C admission missing | blocked |
| W4-C admission not runtime-owned | blocked |
| W4-C admission copied via JSON, spread, `structuredClone`, reconstruction, docs/log/admin route | blocked |
| W4-C admission positive-looking but post-mark mutated | `blocked_pre_evidence_corpus_admission_mutated_after_provenance` / `admission_post_mark_mutated` |
| W4-C status not admissible | blocked |
| W4-C source-material record count not exactly `1` for initial implementation | blocked |
| Missing provider/language/endpoint/hash/length metadata | blocked |
| W4-A readiness lineage from W4-C admission absent or inconsistent | `blocked_pre_evidence_corpus_readiness_lineage_invalid` / `readiness_lineage_inconsistent` |
| Structural leak marker in corpus shell metadata | blocked |
| Attempt to read W3-B or W4-A directly | blocked by boundary guard |
| Attempt to copy source text into shell | blocked |
| Attempt to create EvidenceItems or extraction input | blocked |
| Attempt to read cache/SR/storage or admin artifact route as execution input | blocked |
| Attempt to produce report/verdict/warning/confidence/public output | blocked |

## 9. Approved Implementation Envelope

This package authorizes no implementation until reviewed and committed.
If accepted, implementation must stay inside this envelope.

Allowed production files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-shell.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-provenance.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-owner.ts` only to mark producer-owned W4-C admission decisions
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-shell-owner.ts`

Allowed test files:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-shell.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-provenance.test.ts`
- focused amendments to `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-owner.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-shell-owner.test.ts`
- focused amendments to `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Allowed docs:

- this package;
- minimal pointer-style status/backlog update;
- completion handoff;
- Agent_Outputs;
- generated handoff index.

Forbidden files:

- `apps/web/src/lib/analyzer-v2/orchestrator.ts`;
- W3-B/W4-A/W4-C artifact sinks or routes;
- public API/UI/report/export/compatibility files;
- V1 analyzer/prompt/type/helper files;
- prompt files;
- UCM/default config files;
- model/cache/source-reliability policy files;
- package and lock files;
- W2/W3/W4 network transport files;
- W3-C sweep files;
- parser/OCI execution files;
- API persistence/database files;
- runner queue.

## 10. Boundary Guards

W4-D implementation must prove:

- pure shell core does not import `analyzer-v2-runtime`;
- no W4-D source imports W3-B Source Material modules, W4-A readiness owner/provenance, W3-B owner/provenance, or artifact routes;
- W4-D consumes only W4-C admission provenance;
- no W4-D source imports V1 analyzer modules;
- no W4-D source imports parser, cache, Source Reliability, storage, report, verdict, warning-display, public compatibility, ACS/direct URL, provider transport, or provider SDK modules;
- public files do not import W4-D runtime owner or W4-C provenance internals;
- W4-D cannot create EvidenceItems;
- W4-D cannot create extraction input;
- W4-D cannot output source text;
- W4-D cannot call LLM/model/provider code;
- downstream extraction or public-path consumers must explicitly reject `evidenceCorpus.kind === "shell_only"`; a non-null `evidenceCorpus` check is insufficient authorization for extraction or public use;
- W4-D cannot read W3-B/W4-A/W4-C admin artifact routes as execution input;
- W4-D cannot write cache/SR/storage;
- W4-D cannot mutate gateway/model/cache policy.

## 11. Test Expectations

Focused tests must cover:

- producer-owned W4-C admission creates exactly one hidden/admin-only shell;
- shell carries no source text;
- shell carries hash/ref/provider/language/kind lineage only;
- shell has `kind: "shell_only"`;
- `extractionInput` remains `null`;
- `evidenceItems` remains `[]`;
- `semanticExtractionAuthorized` remains `false`;
- `evidenceItemExtractionAuthorized` remains `false`;
- parser/cache/SR/storage/report/verdict/warning/confidence/public flags remain false;
- downstream extraction/public guard tests prove `kind: "shell_only"` is rejected and cannot be treated as evidence-bearing by a non-null corpus check;
- direct W3-B Source Material and W4-A readiness inputs are rejected;
- copied, JSON, spread, `structuredClone`, reconstructed, route-derived, docs/log, and post-mark mutated W4-C admissions are blocked;
- missing provider/language/hash/length metadata is blocked;
- raw URL/title/page-key/header/secret/error/source-text/report/verdict poison markers are rejected;
- W4-C tests still prove no source text appears in corpus-admission output.

## 12. Required Verifier Set For Later Implementation

Before any W4-D implementation commit, run at least:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-shell.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-admission.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-provenance.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-shell-owner.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
npm run index
git status --short --untracked-files=all
```

Do not run expensive tests or live jobs as W4-D implementation verification.

## 13. Live Job Policy

W4-D proposes no live job.

Rationale:

- W4-D has no product-route wiring;
- W4-D performs no network IO;
- W4-D creates no artifact route;
- unit and boundary tests are enough to prove the hidden shell contract.

Any live proof must be a separate reviewed canary package after product-route observability wiring is explicitly approved.

## 14. Exit Conditions And Next Decision

W4-D implementation passes only if focused verifiers prove:

- producer-owned W4-C admission becomes exactly one text-free `EvidenceCorpus` shell;
- copied/cloned/reconstructed/mutated W4-C admissions are rejected;
- direct W3-B/W4-A inputs are rejected;
- the shell carries no source text;
- `evidenceItems` remains `[]`;
- `extractionInput` remains `null`;
- all extraction/report/verdict/public flags remain false.

W4-D must stop and return for review if:

- the shell needs source text;
- implementation needs product-route wiring, artifact routes, runner changes, or live evidence;
- W4-D needs to create EvidenceItems or extraction input;
- W4-D needs parser/cache/SR/storage;
- W4-D needs direct W3-B or W4-A access instead of W4-C provenance;
- W4-D needs more than one Source Material record.

Post-W4-D next decision:

- if W4-D passes, prepare a reviewed extraction-readiness package;
- consider W3-C only if W4-D or extraction-readiness design identifies measurable source-material distribution unknowns that block the next contract.

## 15. Reviewer Prompt

Review `Docs/WIP/2026-05-18_V2_Slice_X7-W4-D_EvidenceCorpus_Shell_Source_Package.md` as the proposed next FactHarbor V2 package after W4-C commit `471d230b`.

Return `approve`, `modify`, or `reject`.

Check whether:

- W4-D should be the minimal EvidenceCorpus shell package, or whether another readiness-only package is needed first;
- the package avoids semantic inflation from shell to evidence;
- W4-D correctly consumes only W4-C runtime-owned admission;
- the implementation envelope is narrow enough;
- the shell stays text-free and hidden/admin-only;
- EvidenceItems, extraction input, parser, report/verdict/warning/confidence/public behavior, cache/SR/storage, provider expansion, W2 endpoint migration, ACS/direct URL, V1 work, and V1 cleanup remain closed;
- any decision should escalate to Captain before implementation.
