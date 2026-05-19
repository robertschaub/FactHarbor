# V2 Slice X7-W4-G Bounded Corpus Text Authorization Review Package

**Date:** 2026-05-19
**Status:** Steering Board review package only; implementation and live job blocked
**Owner:** Lead Developer / Captain Deputy
**Parent evidence:**

- W3-B bounded page-summary Source Material live pass: job `0964b2da1f534821b2e01bc7f50a7fff`
- W4-F product-route observability live pass: job `cd9963e27a62444e80ee1305fa4f6f94`
- W4-F implementation commit: `3c1a6a2cbd31a3c33206b18b6731389fbfb05297`
- W4-F live-result docs commit: `94c2a022906b65a734c5de410be84e60f3d9afd5`

**Live-job tranche:** `3` jobs remain. This package may propose exactly one later post-implementation canary, counted against that tranche, only after Steering Board review, implementation review, clean verifiers, runtime refresh, and route preflight.

## 1. Purpose

W4-F closed the observability proof. It showed that the product V2 route can reach:

```text
W3-B Source Material
  -> W4-A Source Material to EvidenceCorpus readiness
  -> W4-C Source Material corpus admission
  -> W4-D shell-only EvidenceCorpus
  -> W4-E extraction-readiness denial
```

The next useful step is no longer another denial or observability layer. W4-G should be the first positive bounded corpus-text authorization:

```text
existing W3-B bounded Wikimedia page-summary extract text
  + W4-F-proven corpus chain closure
  -> one hidden/admin-only linked EvidenceCorpus bounded-text sidecar/record
  -> extraction remains closed
  -> public V2 remains pre-cutover and blocked
```

The goal is to prove that bounded Source Material text can be carried into the EvidenceCorpus layer without creating extraction input, EvidenceItems, parser execution, report/verdict/warning/confidence behavior, or public output. W4-G must not supersede or mutate the W4-D shell or W4-E denial state; it should add a linked sidecar or linked corpus-text decision that preserves the existing shell-only denial provenance.

## 2. Baseline Facts

W3-B already creates a bounded hidden/admin-only Source Material record from the Wikimedia page-summary `extract` field only:

- source-material version `v2.evidence-lifecycle.source-material.page-summary.x7w3b`;
- record version `v2.evidence-lifecycle.source-material.page-summary-record.x7w3b`;
- source-material kind `wikimedia_page_summary_extract_text`;
- endpoint id `ep_wikimedia_project_page_summary`;
- provider id `wikimedia_core`;
- max text bytes `4096`;
- `truncationApplied: false`;
- no raw provider JSON, raw URL, raw title, raw page key, headers, cookies, parser output, EvidenceItems, report/verdict/warning/confidence, public compatibility fields, cache IO, Source Reliability, or durable storage.

W4-C currently admits only a text-free corpus-admission input with source-material refs, hashes, lengths, endpoint id, kind, and language.

W4-D currently creates only a `kind: "shell_only"` EvidenceCorpus with `corpusTextAccess: "closed"`.

W4-E currently denies extraction from that shell as `extraction_denied_shell_only` / `shell_only_corpus`.

W4-F proved those W4-C/W4-D/W4-E states are reachable through the product V2 route and hidden/admin-only artifact route while public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover`.

## 3. Recommended W4-G Shape

Implement a narrow two-parent authorization contract:

1. **Text parent:** the runtime-owned W3-B Source Material decision, including exactly one bounded `wikimedia_page_summary_extract_text` record and its `sourceMaterialText`.
2. **Corpus parent:** the same-run W4-F chain state, preferably the in-memory runtime decisions that produced the W4-F artifact, proving W4-C admission, W4-D shell creation, and W4-E extraction denial on the same ledger.

W4-G should not use the W4-F artifact route output as the source of text. W4-F is a reachability and closure proof. The text-bearing input remains the producer-owned W3-B Source Material decision.

W4-G should not rewrite, replace, mutate, or reinterpret W4-D or W4-E. The W4-D shell remains `kind: "shell_only"` with `corpusTextAccess: "closed"`, and W4-E remains `extraction_denied_shell_only` / `shell_only_corpus`. W4-G adds a separately owned bounded-text sidecar or linked text-authorization decision that points back to the W4-D shell lineage.

The W4-G contract should create one hidden/admin-only EvidenceCorpus text-bearing record only when the W3-B text parent and W4-D corpus parent describe the same source-material record:

- same `sourceMaterialRef`;
- same `locatorRef`;
- same `candidatePreviewId`;
- same `providerId`;
- same `sourceMaterialEndpointId`;
- same `sourceMaterialKind`;
- same `languageCode`;
- same `sourceMaterialTextHash`;
- same `sourceMaterialTextByteLength`;
- same `sourceMaterialTextCharLength`;
- source-material record count exactly `1`;
- W4-E still denies extraction.

No new safe locator-materialization contract is needed for W4-G. W3-A/W3-B already materialized and dereferenced the safe locator. W4-G needs lineage equality and bounded text authorization, not locator creation. A new locator contract belongs to a later W3-C or provider-widening package, not this slice.

## 4. Exact Accepted Input

W4-G may accept only producer-owned runtime inputs created in the current product V2 run:

- W2 status `candidate_provider_network_completed`;
- W3-A status `source_candidate_preview_materialized`;
- W3-B status `source_material_page_summary_completed`;
- W3-B stop reason `not_stopped`;
- W3-B source-material record count exactly `1`;
- W3-B record kind `wikimedia_page_summary_extract_text`;
- W3-B response status category `success_2xx`;
- W3-B content type category `accepted_json`;
- W3-B text byte length `> 0` and `<= 4096`;
- W3-B text hash equal to `sha256(sourceMaterialText)`;
- W4-A status `source_material_structurally_admissible_evidence_corpus_gate_closed`;
- W4-C status `source_material_admitted_to_corpus_input_gate_closed`;
- W4-D status `evidence_corpus_shell_created_extraction_gate_closed`;
- W4-D corpus kind `shell_only`;
- W4-D corpus text access `closed`;
- W4-E status `extraction_denied_shell_only`;
- W4-E stop reason `shell_only_corpus`;
- public cutover status `blocked_precutover`;
- same run id and observability ledger across the W3-B/W4-F chain.

W4-G must reject:

- public result JSON;
- W4-F admin artifact JSON used as execution input;
- copied, spread, structured-cloned, or JSON-round-tripped W3-B/W4-C/W4-D/W4-E state;
- W3-B admin route output used as execution input;
- raw provider response JSON;
- raw URL, raw title, raw page key, request URL, headers, cookies, or low-level network details;
- more than one Source Material record;
- any record kind other than `wikimedia_page_summary_extract_text`;
- W3-A partial previews;
- W3-C source-material widening;
- any source material not created by W3-B in the same runtime run.

## 5. Corpus Text Field Shape And Caps

Recommended decision version:

```text
v2.evidence-lifecycle.evidence-corpus-bounded-text-authorization.x7w4g
```

Recommended record version:

```text
v2.evidence-lifecycle.evidence-corpus.bounded-text-sidecar.x7w4g
```

Recommended positive status:

```text
bounded_corpus_text_sidecar_created_extraction_gate_closed
```

Recommended EvidenceCorpus text posture:

- sidecar kind `bounded_text_sidecar` or linked decision kind `bounded_text_authorization`;
- `visibility: "internal_admin_only"`;
- `publicPointerExposure: "forbidden"`;
- `corpusTextAccess: "internal_admin_only_sidecar"`;
- `preservesShellOnlyCorpus: true`;
- `mutatesShellCorpus: false`;
- `mutatesExtractionDenial: false`;
- `semanticExtractionAuthorized: false`;
- `evidenceItemExtractionAuthorized: false`;
- `extractionInput: null`;
- `evidenceItems: []`.

Recommended text-bearing record fields:

- `recordVersion`;
- `corpusTextRecordId`;
- `evidenceCorpusId`;
- `sourceMaterialRef`;
- `locatorRef`;
- `candidatePreviewId`;
- `providerId`;
- `sourceMaterialEndpointId`;
- `languageCode`;
- `sourceMaterialKind: "wikimedia_page_summary_extract_text"`;
- `textKind: "wikimedia_page_summary_extract_text"`;
- `text`;
- `textHash`;
- `textByteLength`;
- `textCharLength`;
- `truncationApplied: false`;
- `sourceMaterialTextHash`;
- `sourceMaterialTextByteLength`;
- `sourceMaterialTextCharLength`;
- `w3bDecisionVersion`;
- `w4cDecisionVersion`;
- `w4dCorpusVersion`;
- `w4eStatus`;
- `publicPointerExposure: "forbidden"`;
- closed execution flags.

The internal sidecar/decision may hold `text` so the pipeline can prove bounded corpus-text authorization. The admin artifact route must not return `text` by default. The default route projection should expose only hash, byte length, char length, provenance refs, decision versions, status, stop reason, and closed execution flags.

If the implementation includes text inspection at all, text may be returned only when an authenticated admin request supplies an explicit inspection flag such as `includeText=1`. That response must be no-store, must mark `inspectionMode: "explicit_admin_text_inspection"`, must remain internal/admin-only, and must not be used by downstream execution. The safer default recommendation is to omit text inspection in W4-G unless Steering explicitly asks for it during implementation review.

Caps:

| Limit | Value | Reason |
|---|---:|---|
| Corpus text records per decision | `1` | W3-B creates one record; no widening in W4-G |
| Corpus text bytes per record | `4096` | Matches W3-B/W4-C cap; no cap raise |
| Aggregate corpus text bytes | `4096` | One record only |
| Text chars | derived, bounded by byte cap | Multilingual-safe; UTF-8 byte cap is authoritative |
| Serialized hidden artifact bytes | `32_768` | Enough for one bounded internal sidecar and redacted route metadata, still small |
| Records per ledger for W4-G artifact sink | `4` recommended | Matches recent bounded hidden artifact posture |
| Ledger count | `256` recommended | Matches recent bounded hidden artifact posture |

Oversize text must fail closed. Do not truncate in W4-G.

## 6. Provenance, Hash, And Ref Posture

W4-G should preserve the existing W3-B Source Material text exactly after W3-B normalization. It must not re-fetch, re-parse, summarize, translate, classify, or semantically interpret the text.

Required provenance checks:

- W3-B Source Material decision is runtime-owned;
- W4-C admission decision is runtime-owned;
- W4-D shell decision is runtime-owned and not mutated after provenance marking;
- W4-E denial decision is runtime-owned;
- W3-B record hash equals `sha256(sourceMaterialText)`;
- W4-C and W4-D metadata matches the W3-B record hash/ref/length/endpoint/kind/language;
- the W4-G text record hash equals the W3-B text hash;
- the W4-G byte/char lengths equal the W3-B byte/char lengths;
- the ledger id and run id match across the chain.

References carried forward should be opaque runtime refs, not raw locators:

- `sourceMaterialRef`;
- `locatorRef`;
- `candidatePreviewId`;
- `providerId`;
- `sourceMaterialEndpointId`;
- `languageCode`;
- hashes and lengths.

Do not carry raw URL, raw title, raw page key, provider URL, or request path into W4-G.

## 7. Raw-Leak Protections

The only source text allowed in W4-G is the already bounded W3-B `sourceMaterialText`, copied into the internal/admin-only corpus text sidecar/decision after W4-G revalidates hash, byte length, record count, kind, and closure state.

Forbidden in public result JSON, UI, reports, exports, compatibility projections, logs, and errors:

- the bounded W3-B source material text;
- the W4-G bounded corpus text sidecar contents;
- any substring of the bounded text emitted for debugging or diagnostics.

Forbidden in W4-G records, artifacts, default route responses, public result JSON, report markdown, UI, export, compatibility projections, logs, and errors:

- raw provider JSON;
- raw URL;
- raw title;
- raw page key;
- request URL;
- headers;
- cookies;
- secrets;
- stack traces;
- low-level exception text;
- `extract_html`;
- full page/source/html content;
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

The W4-G admin route, if implemented, must be authenticated, internal, no-store, and explicitly marked `internal_admin_only` / `forbidden`. The default response must be hash/length/provenance-only and must omit `text`, `sourceMaterialText`, excerpts, snippets, previews, and raw provider fields. Public V2 output must remain `4.0.0-cb-precutover` / `blocked_precutover`.

## 8. Failure Boundaries

Recommended blocked statuses / stop reasons:

| Condition | Recommended stop reason |
|---|---|
| W3-B missing or not runtime-owned | `w3b_not_runtime_owned` |
| W3-B not completed | `w3b_not_completed` |
| W3-B record count not exactly 1 | `source_material_record_count_unsupported` |
| Unsupported source-material kind | `source_material_kind_unsupported` |
| Text missing or blank | `source_material_text_missing` |
| Text over 4096 bytes | `source_material_text_oversized` |
| Text hash mismatch | `source_material_hash_mismatch` |
| W4-C not positive/runtime-owned | `w4c_admission_not_positive` |
| W4-D shell missing/not runtime-owned | `w4d_shell_not_runtime_owned` |
| W4-D not shell-only | `w4d_shell_status_invalid` |
| W4-E not denial/runtime-owned | `w4e_denial_not_runtime_owned` |
| W4-E not `extraction_denied_shell_only` | `w4e_denial_status_invalid` |
| W3-B and W4-D lineage mismatch | `source_material_lineage_mismatch` |
| copied/spread/JSON/structured-clone input | `runtime_ownership_missing` |
| post-mark mutation | `runtime_ownership_mutated_after_mark` |
| forbidden raw marker | `raw_leakage_marker_detected` |
| downstream flag opened | `downstream_execution_not_authorized` |
| structural exception | `structural_exception` |

Blocked W4-G decisions must emit no corpus text sidecar/record, no extraction input, no EvidenceItems, no parser output, no report/verdict/warning/confidence data, no public output changes, no cache/SR/storage writes, and no retries.

## 9. Explicit Non-Goals

W4-G does not authorize:

- implementation before Steering Board review;
- live canary before a later implementation package, review, commit, clean verifiers, runtime refresh, and route preflight;
- more than one later W4-G canary;
- extraction input;
- EvidenceItems;
- parser execution;
- packet/frame consumption;
- report generation;
- verdict generation;
- warning generation;
- confidence generation;
- truth-percentage generation;
- public output changes;
- cache IO;
- Source Reliability;
- durable storage;
- retries;
- provider expansion;
- W2 endpoint migration;
- W3-C source-material widening;
- Tier 2 full page/source/html fetch;
- ACS or direct URL execution;
- prompt, config, model, schema, gateway-policy, or cache-policy edits;
- V1 reuse, V1 work, or V1 cleanup.

## 10. Candidate Source Envelope For Later Implementation

This package does not approve source edits. If accepted, a later implementation should stay inside this candidate envelope unless reviewers change it.

Production:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-owner.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-provenance.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-bounded-text-artifacts/route.ts`
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`

Tests:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-owner.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-provenance.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-artifact-sink.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-bounded-text-artifacts/route.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/orchestrator.test.ts`, only if the existing orchestrator test owns the product-route assertion
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Status/handoff/index files may be added only as completion artifacts.

Any source edit for source acquisition, W2 endpoint migration, W3-C widening, parser, extraction, EvidenceItems, report/verdict/warning/confidence, public UI/report/export/API surface, cache/SR/storage, provider expansion, prompts/configs/models/schemas, ACS/direct URL, V1 files, or cleanup is outside this package.

## 11. Required Tests And Boundary Guards

Focused tests should prove:

- W4-G creates exactly one hidden/admin-only corpus text sidecar/record from one runtime-owned W3-B record and matching W4-C/W4-D/W4-E chain;
- W4-G does not supersede or mutate W4-D shell state;
- W4-G does not supersede or mutate W4-E denial state;
- the text hash, byte length, and char length match W3-B exactly;
- source-material ref, locator ref, candidate preview id, provider id, endpoint id, kind, and language match W4-C/W4-D lineage;
- copied, spread, structured-cloned, or JSON-round-tripped parents are rejected;
- post-mark mutated parents are rejected;
- missing W3-B, unsupported kind, blank text, oversize text, hash mismatch, multiple records, W4-C non-positive, W4-D non-shell, and W4-E non-denial all fail closed;
- admin artifact route is authenticated, no-store, bounded, and hidden/admin-only;
- default admin artifact route response is hash/length/provenance-only and contains no `text`, `sourceMaterialText`, excerpt, snippet, preview, or raw provider field;
- optional text inspection, if implemented, requires an explicit authenticated admin inspection flag and never becomes the default response;
- malformed ledger ids return `400` no-store;
- missing ledgers return `404` no-store;
- unauthenticated reads return `401` no-store;
- W4-G artifacts do not include forbidden raw provider/url/title/page-key fields;
- public result JSON remains precutover and has no W4-G hidden-marker leak;
- no parser, EvidenceItems, extraction input, report/verdict/warning/confidence, cache/SR/storage, provider expansion, W2 endpoint migration, ACS/direct URL, or V1 imports are introduced.

Boundary guards should be explicit enough to catch:

- imports from V1 analyzer paths;
- parser imports or parser execution;
- EvidenceItem creation;
- extraction input creation;
- public UI/report/export/API wiring;
- cache/SR/storage imports or writes;
- provider expansion and W2 endpoint migration;
- prompt/config/model/schema edits;
- use of W4-F admin artifact JSON as execution input;
- broad route exposure outside the approved internal artifact route.

## 12. Required Verifiers Before Any Future W4-G Canary

Before committing any W4-G implementation package:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-provenance.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-bounded-text-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
```

If `orchestrator.test.ts` is amended, include it in the focused verifier set.

Before any later canary:

- confirm `git status --short --untracked-files=all` is clean;
- confirm `git rev-parse HEAD` matches the accepted W4-G implementation commit;
- refresh/restart runtime from that commit;
- run the product runner route preflight used by recent W2/W3/W4 canaries;
- run authenticated and unauthenticated W4-G artifact-route preflight;
- confirm public V2 route still prepares `pipeline: claimboundary-v2` and remains pre-cutover;
- confirm no unrelated dirty docs/tooling/source files exist.

Do not run expensive LLM tests.
Do not run a canary from this review package.

## 13. Later Canary Recommendation

A later single W4-G canary is recommended after implementation review because this is the first positive text-bearing EvidenceCorpus crossing. Local tests can prove structural containment, but one product-route canary should prove:

- W3-B still creates one bounded page-summary Source Material record;
- W4-F chain closure still appears on the same ledger;
- W4-G creates one hidden/admin-only corpus text sidecar/record;
- text byte length is `> 0` and `<= 4096`;
- W4-G text hash equals the W3-B Source Material text hash;
- W4-G default admin route response exposes only hash/length/provenance and not text;
- extraction remains closed;
- public V2 remains `4.0.0-cb-precutover` / `blocked_precutover`;
- no hidden markers or text leak publicly.

Recommended canary input: exact Captain-defined input `Using hydrogen for cars is more efficient than using electricity`, for continuity with W3-A/W3-B/W4-F.

The canary would consume one job from the current `3`-job tranche, leaving `2`. No second W4-G canary should be run without Steering Board review.

## 14. Pass Criteria For The Later Canary

W4-G passes only if one product-route live canary:

- uses the exact Captain-defined input `Using hydrogen for cars is more efficient than using electricity`;
- runs on clean committed/refreshed runtime from the W4-G implementation commit;
- reaches `SUCCEEDED`;
- records hidden/admin-only artifacts through W3-B, W4-F, and W4-G on the same ledger;
- shows W2 nonzero hidden structural candidates and nonzero bytes;
- shows W3-B `source_material_page_summary_completed` with exactly one bounded Source Material record;
- shows W4-C `source_material_admitted_to_corpus_input_gate_closed`;
- shows W4-D `evidence_corpus_shell_created_extraction_gate_closed`;
- shows W4-E `extraction_denied_shell_only` / `shell_only_corpus`;
- shows W4-G `bounded_corpus_text_sidecar_created_extraction_gate_closed`;
- shows exactly one W4-G text sidecar/record;
- shows text byte length `> 0` and `<= 4096`;
- shows W4-G text hash equals the W3-B Source Material text hash;
- shows W4-G preserves W4-D shell-only and W4-E denial provenance without mutating either state;
- keeps `semanticExtractionAuthorized: false`;
- keeps `evidenceItemExtractionAuthorized: false`;
- keeps `extractionInput: null`;
- keeps `evidenceItems: []`;
- keeps parser/cache/SR/storage/report/verdict/warning/confidence/public flags closed;
- exposes the W4-G artifact only through the authenticated internal no-store route;
- keeps the default W4-G artifact route response hash/length/provenance-only with no text;
- if text inspection is implemented, exposes text only through an explicit authenticated admin inspection flag and never through default route responses;
- keeps public result `_schemaVersion` at `4.0.0-cb-precutover`;
- keeps public cutover status `blocked_precutover`;
- keeps public result damaged/precutover and not a meaningful V2 report;
- leaks no W4-G markers or source text into public result JSON, report markdown, UI, export, compatibility projection, logs, or errors;
- consumes exactly one live job from the 3-job tranche.

## 15. Stop Criteria

Stop and return to Steering Board without a canary or second attempt if any of these occur:

- implementation needs source edits outside the approved envelope;
- W4-G cannot use producer-owned W3-B Source Material and matching W4-F/W4-D/W4-E chain state;
- W3-B text is missing, blank, oversized, or hash-mismatched;
- the W3-B and W4-D/W4-C lineage does not match;
- source text would need to come from route JSON, logs, docs, public output, or copied state;
- source-material widening, provider expansion, endpoint migration, retries, parser work, extraction input, EvidenceItems, report/verdict/warning/confidence behavior, cache/SR/storage, public behavior, ACS/direct URL, or V1 work becomes necessary;
- hidden artifact routing would expose raw provider payload, raw URL/title/key, or text publicly or by default;
- W4-G would need to mutate, supersede, or reinterpret W4-D shell-only state or W4-E extraction-denial state;
- local verifiers fail and the root cause is not a narrow W4-G formatting/type/test issue;
- runtime cannot be refreshed cleanly from the committed W4-G implementation.

## 16. Review Questions

Architect:

- Is the two-parent contract, W3-B for text and W4-F/W4-D/W4-E for corpus closure, the right authorization shape?
- Should the linked sidecar use `bounded_text_sidecar`, `bounded_text_authorization`, or another name?
- Is `corpusTextAccess: "internal_admin_only_sidecar"` clear enough, or should the field distinguish "sidecar text exists" from "extraction authorized" more explicitly?

Security/runtime:

- Is carrying the bounded W3-B text into a hidden/admin-only corpus record acceptable with the proposed cap and route posture?
- Should W4-G omit text inspection entirely in the first implementation, or include an explicit admin-only `includeText=1` inspection flag?
- Are the raw-leak protections enough for first text-bearing corpus admission?

Code/package:

- Is the candidate source envelope narrow enough?
- Should W4-G be implemented as a sidecar text record linked to the W4-D shell, or as a new linked corpus-text decision that preserves the W4-D shell and W4-E denial unchanged?
- Are the proposed tests sufficient to prove runtime ownership, lineage equality, and public non-leakage?

Product/quality/cost:

- Is one canary worth spending from the `3`-job tranche for first text-bearing corpus proof?
- Should the continuity canary stay on `Using hydrogen for cars is more efficient than using electricity`?
- Should W4-G be required before any extraction-readiness or EvidenceItem package?

## 17. Completion Requirements For This Docs Package

Before committing this docs package:

- append `Docs/AGENTS/Agent_Outputs.md`;
- create a completion handoff under `Docs/AGENTS/Handoffs/`;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` only as a pointer to the review package;
- rebuild `Docs/AGENTS/index/handoff-index.json`;
- run:

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run index
git diff --check
```

Do not implement W4-G from this package.
Do not run live jobs or expensive LLM tests.
