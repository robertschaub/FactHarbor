# V2 Slice X7-W4-H Bounded Extraction-Input Authorization Review Package

**Date:** 2026-05-19
**Role:** Lead Developer / Captain Deputy
**Status:** Implementation approved and locally implemented; no live job authorized
**Parent state:** W4-G closed as `PASS_X7_W4_G_BOUNDED_CORPUS_TEXT_CANARY`
**Parent implementation commit:** `3861568be8a4199b75034d24f52d178f3e375a67`
**Parent canary documentation commit:** `cbbb9dea`
**Parent canary job:** `1535d6e3695743fd88394c2dc3e3a546`
**Current live-job tranche:** `6`, reset/increased after W4-G closeout

**Implementation checkpoint:** W4-H has been implemented inside this amended package envelope as one hidden/admin-only `bounded_text_extraction_input_packet` from runtime-owned W4-G bounded text sidecar state. Verifiers passed locally; no canary/live job has been run.

## 1. Purpose

X7-W4-H is the first proposed extraction boundary after W4-G. It should not jump to EvidenceItems.

The narrow objective is to authorize exactly one hidden/admin-only extraction-input packet derived only from the runtime-owned W4-G bounded corpus-text sidecar. The packet is a bounded structural handoff to a future extraction stage; it is not extraction execution and it must not produce EvidenceItems.

W4-H should answer one question:

Can the W4-G bounded text sidecar be converted into a minimal internal extraction-input packet while preserving all public, default-admin, and downstream execution closures?

## 2. Current Ground Truth

W4-G proved the following in one product-route canary:

- W2 produced hidden provider candidates.
- W3-B produced one bounded hidden/admin-only `wikimedia_page_summary_extract_text` Source Material record.
- W4-C admitted that Source Material into the corpus input gate.
- W4-D created a shell-only EvidenceCorpus.
- W4-E denied extraction readiness for the shell-only corpus.
- W4-G created one linked `bounded_text_sidecar` from the runtime-owned W3-B page-summary text, capped by the W3-B/W4-G maximum of `4096` bytes.
- The W4-G default admin route projection stayed `hash_length_provenance_only`.
- Public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover`.
- Extraction input, EvidenceItems, parser execution, report/verdict/warning/confidence behavior, cache/SR/storage, retries, provider expansion, W2/W3 widening, ACS/direct URL, and V1 work remained blocked.

## 3. Recommended W4-H Shape

W4-H should add a new linked decision and packet, not mutate or supersede W4-G.

Recommended positive decision status:

```text
bounded_extraction_input_packet_created_extraction_execution_closed
```

Recommended decision version:

```text
v2.evidence-lifecycle.extraction-input-authorization.x7w4h
```

Recommended packet version:

```text
v2.evidence-lifecycle.extraction-input.bounded-text-packet.x7w4h
```

Recommended packet kind:

```text
bounded_text_extraction_input_packet
```

The W4-H decision should create exactly one packet only when one runtime-owned W4-G bounded text sidecar is valid. The decision must keep all extraction execution flags closed:

- `extractionExecutionAuthorized: false`
- `llmExtractionCallAuthorized: false`
- `parserExecuted: false`
- `semanticExtractionAuthorized: false`
- `evidenceItemExtractionAuthorized: false`
- `evidenceItems: []`
- public cutover remains `blocked_precutover`

W4-H should not change the W4-D shell-only EvidenceCorpus, the W4-E extraction denial, or the W4-G sidecar.

## 4. Exact Accepted Parent Input

W4-H may accept only producer-owned, runtime-created W4-G state from the same product V2 ledger. It must not use a public result, compatibility projection, report markdown, UI data, exported data, logs, errors, or the W4-G default admin route projection as its text input.

The accepted parent must include a W4-G decision with:

- `decisionVersion: "v2.evidence-lifecycle.evidence-corpus-bounded-text-authorization.x7w4g"`
- `status: "bounded_corpus_text_sidecar_created_extraction_gate_closed"`
- `stopReason: "not_stopped"`
- `visibility: "internal_admin_only"`
- `publicPointerExposure: "forbidden"`
- exactly one bounded text sidecar
- no extraction input
- no EvidenceItems
- `publicCutoverStatus: "blocked_precutover"`

The accepted W4-G sidecar must include:

- `sidecarVersion: "v2.evidence-lifecycle.evidence-corpus.bounded-text-sidecar.x7w4g"`
- `kind: "bounded_text_sidecar"`
- `visibility: "internal_admin_only"`
- `publicPointerExposure: "forbidden"`
- `sourceMaterialKind: "wikimedia_page_summary_extract_text"`
- `textKind: "bounded_page_summary_extract_text"`
- `text` present only in process-internal W4-G state, not from route output
- `textHash` equal to `sha256(text)`
- `textHash` equal to `sourceMaterialTextHash`
- `textByteLength` equal to the UTF-8 byte length of `text`
- `textByteLength` equal to `sourceMaterialTextByteLength`
- `textCharLength` equal to `sourceMaterialTextCharLength`
- `textByteLength > 0`
- `textByteLength <= 4096`
- `maxTextBytes: 4096`
- `truncationApplied: false`
- `sourceMaterialRuntimeOwned: true`
- `corpusTextAccess: "internal_admin_only_bounded_text_sidecar"`
- `extractionDenialStatus: "extraction_denied_shell_only"`
- `preservesShellOnlyCorpus: true`
- `mutatesShellCorpus: false`
- `mutatesExtractionDenial: false`
- `semanticExtractionAuthorized: false`
- `evidenceItemExtractionAuthorized: false`
- `extractionInput: null`
- `evidenceItems: []`

The accepted sidecar must also carry non-empty opaque lineage/provenance values:

- `boundedTextSidecarId`
- `linkedEvidenceCorpusId`
- `linkedEvidenceCorpusShellVersion`
- `sourceMaterialRef`
- `locatorRef`
- `candidatePreviewId`
- `providerId` (current upstream value is `wikimedia_core`; W4-H must preserve the exact W4-G sidecar value)
- `sourceMaterialEndpointId`
- `languageCode`
- `sourceMaterialRecordVersion`
- `admissionDecisionVersion`
- `shellDecisionVersion`
- `extractionDenialDecisionVersion`

## 5. Smallest Extraction-Input Packet Shape

W4-H should keep the packet deliberately small. The packet is not evidence and should not be treated as a public or analytical result.

Recommended packet fields:

```ts
type BoundedExtractionInputPacket = {
  packetVersion: "v2.evidence-lifecycle.extraction-input.bounded-text-packet.x7w4h";
  packetId: string;
  kind: "bounded_text_extraction_input_packet";
  visibility: "internal_admin_only";
  publicPointerExposure: "forbidden";

  source: "w4g_bounded_text_sidecar";
  parentDecisionVersion: "v2.evidence-lifecycle.evidence-corpus-bounded-text-authorization.x7w4g";
  parentStatus: "bounded_corpus_text_sidecar_created_extraction_gate_closed";
  parentSidecarVersion: "v2.evidence-lifecycle.evidence-corpus.bounded-text-sidecar.x7w4g";
  parentSidecarId: string;

  linkedEvidenceCorpusId: string;
  sourceMaterialRef: string;
  locatorRef: string;
  candidatePreviewId: string;
  providerId: string;
  sourceMaterialEndpointId: string;
  sourceMaterialKind: "wikimedia_page_summary_extract_text";
  languageCode: string;

  inputText: string;
  inputTextHash: string;
  inputTextByteLength: number;
  inputTextCharLength: number;
  maxInputTextBytes: 4096;
  truncationApplied: false;

  sourceMaterialTextHash: string;
  sourceMaterialTextByteLength: number;
  sourceMaterialTextCharLength: number;

  extractionExecutionAuthorized: false;
  llmExtractionCallAuthorized: false;
  parserExecuted: false;
  semanticExtractionAuthorized: false;
  evidenceItemExtractionAuthorized: false;
  evidenceItems: [];
  publicCutoverStatus: "blocked_precutover";
};
```

`inputText` is allowed only inside the hidden/admin-only packet state because the packet is the future extraction boundary. It must not appear in default admin route responses, public result JSON, UI, reports, exports, compatibility projections, logs, or errors.

`providerId` must be copied from the W4-G sidecar without remapping. The current W3-B/W4-G lineage value is `wikimedia_core`; W4-H must not introduce `wikimedia` or any other new provider id. Future implementation must fail closed if the packet provider id differs from the parent W4-G sidecar provider id.

No prompt profile, model policy, cache policy, schema prompt, or UCM behavior should be added in W4-H.

## 6. Default Admin Artifact And Route Posture

If W4-H implementation adds an admin artifact route, the route must be:

- authenticated by the existing internal admin-key pattern;
- internal only;
- `Cache-Control: no-store`;
- explicitly marked `visibility: "internal_admin_only"`;
- explicitly marked `publicPointerExposure: "forbidden"`;
- hash/length/provenance-only by default.

The default route response may expose:

- W4-H decision status and version;
- packet version and packet kind;
- packet id;
- parent W4-G decision/sidecar versions and ids;
- source and corpus lineage ids;
- provider id and source-material endpoint id;
- input hash;
- input byte/char lengths;
- maximum input byte cap;
- closed downstream flags;
- public cutover blocked status.

The default route response must not expose:

- `inputText`;
- `text`;
- `sourceMaterialText`;
- excerpts, snippets, previews, summaries, or raw source text;
- raw provider payloads;
- raw URLs;
- raw titles;
- raw page keys;
- raw request paths;
- raw query text.

The safer recommendation is to omit text inspection in W4-H. If Steering explicitly asks for inspection later, it must require a separate explicit authenticated admin inspection flag, remain no-store/internal-only, and must still not feed any public or downstream execution surface.

## 7. Failure Boundaries

Blocked W4-H decisions must emit no extraction-input packet.

Recommended stop reasons:

- `w4g_decision_missing`
- `w4g_not_runtime_owned`
- `w4g_not_positive`
- `w4g_sidecar_missing`
- `w4g_sidecar_count_unsupported`
- `w4g_sidecar_kind_unsupported`
- `w4g_sidecar_visibility_invalid`
- `w4g_sidecar_text_missing`
- `w4g_sidecar_text_oversized`
- `w4g_sidecar_text_hash_mismatch`
- `w4g_sidecar_text_length_mismatch`
- `source_material_hash_mismatch`
- `source_material_length_mismatch`
- `lineage_missing_or_invalid`
- `provider_id_mismatch`
- `corpus_text_access_invalid`
- `w4g_downstream_flags_open`
- `public_cutover_not_blocked`
- `raw_leakage_marker_detected`
- `structural_exception`

Every blocked decision must keep:

- `extractionInput: null`
- `evidenceItems: []`
- `extractionExecutionAuthorized: false`
- `llmExtractionCallAuthorized: false`
- `parserExecuted: false`
- public V2 `4.0.0-cb-precutover` / `blocked_precutover`

## 8. Explicit Non-Goals

W4-H does not authorize:

- a live job from this implementation checkpoint;
- a second W4-G canary;
- EvidenceItems;
- parser execution;
- LLM evidence extraction calls;
- report, verdict, warning, or confidence behavior;
- public result JSON changes;
- UI, report, export, or compatibility-projection changes;
- cache, Source Reliability, or durable storage behavior;
- retries;
- provider expansion;
- W2 endpoint migration;
- W3 source-material widening;
- Tier 2 full page/source/html fetch;
- ACS/direct URL execution;
- prompt/config/model/schema edits;
- V1 reuse, V1 work, or V1 cleanup.

## 9. Implementation Envelope

The accepted implementation is limited to:

```text
apps/web/src/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization.ts
apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-owner.ts
apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-provenance.ts
apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-artifact-sink.ts
apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-extraction-input-artifacts/route.ts
apps/web/src/lib/analyzer-v2/orchestrator.ts
apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization.test.ts
apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-owner.test.ts
apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-provenance.test.ts
apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-artifact-sink.test.ts
apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-extraction-input-artifacts/route.test.ts
apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts
Docs/STATUS/Current_Status.md
Docs/STATUS/Backlog.md
Docs/AGENTS/Agent_Outputs.md
Docs/AGENTS/Handoffs/
Docs/AGENTS/index/handoff-index.json
```

`orchestrator.ts` should be touched only to record the hidden/admin-only W4-H decision after W4-G when all parent checks pass. It must not open extraction execution or public behavior.

## 10. Verifier Set

Before the W4-H implementation commit:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-provenance.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-extraction-input-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run index
git diff --check
git status --short --untracked-files=all
```

The focused extraction-input authorization tests must include a mutated-provider case proving W4-H fails closed when the W4-H packet provider id would differ from the parent W4-G sidecar provider id.

Before any later W4-H canary:

```powershell
git status --short --untracked-files=all
git rev-parse HEAD
# Refresh API/Web runtime from the accepted W4-H implementation commit.
# Verify API/Web runtime commit hashes match that implementation commit.
# Preflight the W4-H internal route:
# - unauthenticated request denied with no-store;
# - malformed/missing ledger handled without text leakage;
# - default authenticated response is hash/length/provenance-only.
```

## 11. Pass Criteria

The local implementation is accepted only if:

- W4-H is locally implemented and verifier-clean.
- No W4-H live job has been run from this package.
- Any W4-H canary still requires separate Steering authorization.
- Accepted parent input is limited to runtime-owned W4-G bounded text sidecar state.
- The smallest extraction-input packet is defined and bounded.
- The W4-H packet is hidden/admin-only.
- `inputText` is internal-only and absent from public/default-admin/log/error surfaces.
- Default route/artifact projection is hash/length/provenance-only.
- Extraction execution remains closed.
- EvidenceItems remain absent.
- Parser, LLM extraction, report/verdict/warning/confidence, cache/SR/storage, retries, provider expansion, W2/W3 widening, ACS/direct URL, and V1 work remain closed.

The implementation passes only if local verifiers prove:

- exactly one valid runtime-owned W4-G sidecar creates exactly one W4-H packet;
- invalid, copied, route-derived, missing, oversized, mutated, or hash-mismatched parent inputs fail closed;
- packet provider id differing from the W4-G sidecar provider id fails closed;
- W4-H does not mutate W4-D, W4-E, or W4-G state;
- W4-H does not introduce prompt/model/config/cache policy changes;
- the artifact route is authenticated/no-store/internal-only;
- default route projection does not contain text;
- public result JSON remains precutover and contains no W4-H hidden markers or text.

## 12. Stop And Pivot Criteria

Stop and return to Steering Board if W4-H would require any of the following:

- reading text from a route response instead of runtime-owned W4-G state;
- accepting more than one sidecar;
- raising the `4096` byte cap;
- adding source fetches or provider calls;
- widening W2/W3;
- adding parser execution;
- adding an LLM extraction call;
- creating EvidenceItems;
- changing report/verdict/warning/confidence behavior;
- adding public UI/API/report/export/compatibility behavior;
- adding cache/SR/storage behavior;
- logging or default-admin exposing the text;
- changing prompt/config/model/schema behavior;
- touching V1 code or prompts.

If W4-H local implementation is clean but the first live canary later cannot produce the W4-H packet from W4-G state, stop after that single canary and bring the failure back as a Steering decision. Do not spend a second W4-H canary without a reviewed follow-up package.

## 13. Canary Recommendation

One later W4-H product-route canary is worth spending from the reset `6`-job tranche after, and only after, a reviewed implementation package is accepted, committed, verifier-clean, and runtime-refreshed.

Rationale:

- W4-H is the first extraction-input boundary, even though extraction execution remains closed.
- Local tests can prove contract containment, but one product-route canary should prove that the full W2/W3/W4 lineage can create exactly one hidden packet without public leakage.
- The packet carries internal bounded text, so a public/default-admin leak check matters more than for text-free gates.

Recommended later canary input, unless Captain chooses another approved input:

```text
Using hydrogen for cars is more efficient than using electricity
```

The canary would consume one job from the `6`-job tranche, leaving `5`. No second W4-H canary should be run without Steering Board review.

Canary pass target:

- W2 through W4-G repeat the known hidden chain.
- W4-H records one `bounded_text_extraction_input_packet`.
- W4-H packet byte length is `> 0` and `<= 4096`.
- W4-H packet hash equals the W4-G sidecar hash and W3-B Source Material text hash.
- W4-H packet provider id equals the W4-G sidecar provider id exactly.
- Default W4-H route projection is hash/length/provenance-only.
- Public result JSON, UI, report markdown, export, compatibility projection, logs, and errors show no text and no hidden markers.
- Extraction execution, EvidenceItems, parser, report/verdict/warning/confidence, cache/SR/storage, provider expansion, W2/W3 widening, ACS/direct URL, and V1 work remain closed.

## 14. Review Questions

Steering Board should decide:

- Is the proposed `bounded_text_extraction_input_packet` the right minimal packet name and shape?
- Should W4-H omit explicit admin text inspection entirely in the first implementation?
- Is one later W4-H canary justified from the reset `6`-job tranche?
- Should W4-H be required before any EvidenceItem extraction package?

## 15. Decision Requested

W4-H is locally implemented and verifier-clean. Approve, amend, or reject the implementation checkpoint for commit and decide separately whether a later W4-H canary is worth spending from the live-job tranche.

Do not run a W4-H live job from this package. Any W4-H canary still requires separate Steering authorization.
