# V2 Slice X7-W4-I Execution Readiness Denial Review Package

**Date:** 2026-05-19
**Role:** Lead Developer / Captain Deputy
**Status:** Locally implemented and verifier-clean; no live canary authorized
**Parent state:** W4-H closed as `PASS_X7_W4_H_BOUNDED_EXTRACTION_INPUT_CANARY`
**Parent implementation commit:** `a652fd70d7a3053ee6f57ca32659cf0e4cc5e901`
**Parent canary documentation commit:** `eeb18be2`
**Parent canary job:** `df8402362bee46daba2fe83000156b0d`
**Remaining live-job tranche:** `5`
**Live-job tranche ledger:** `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`
**Package author:** Lead Developer / Captain Deputy
**Reviewer:** Steering Board / Captain approval in current Codex thread on 2026-05-19
**Implementer:** Lead Developer / Captain Deputy
**Canary runner:** Blocked until separate Steering authorization after implementation acceptance
**Implementation handoff:** `Docs/AGENTS/Handoffs/2026-05-19_Lead_Developer_V2_X7-W4-I_Execution_Readiness_Denial_Implementation.md`

## 1. Purpose

X7-W4-I is the first proposed consumer-side decision after W4-H. It should not run extraction.

The narrow objective is to define one hidden/admin-only execution-readiness denial decision over exactly one runtime-owned W4-H `bounded_text_extraction_input_packet`. W4-I may confirm that the packet is structurally eligible as input for a future extraction executor, but it must keep execution closed.

W4-I should answer one question:

Can the W4-H bounded packet be consumed by an execution-readiness gate without opening LLM extraction calls, parser execution, EvidenceItems, public behavior, or durable side effects?

This is infrastructure/containment progress only. W4-I must not be described as report-quality progress.

## 1.1 Gate Accounting

**What W4-I unlocks:** a future reviewed proposal for actual extraction execution can reference one consumer-side readiness-denial decision proving that the W4-H packet can reach an execution boundary while execution remains closed. W4-I does not unlock extraction execution by itself.

**What W4-I retires or merges:** W4-I retires nothing in this slice. It supplements W4-H with a linked consumer-side denial artifact. W4-D shell-only state, W4-E extraction-readiness denial, W4-G bounded text sidecar, and W4-H extraction-input packet remain separate closure evidence and are not mutated, superseded, or merged.

**Stop condition:** stop and return to Steering if W4-I would require packet text exposure outside runtime-owned state, more than one packet, a byte-cap increase, source fetch/provider widening, parser execution, LLM extraction, EvidenceItems, report/verdict/warning/confidence behavior, public behavior, cache/SR/storage, prompt/config/model/schema edits, ACS/direct URL, or V1 work.

## 2. Current Ground Truth

W4-H proved the following in one product-route canary:

- W2 produced hidden provider candidates.
- W3-B produced one bounded hidden/admin-only Source Material record.
- W4-G produced one bounded text sidecar whose hash matched the W3-B Source Material text hash.
- W4-H produced exactly one hidden/admin-only `bounded_text_extraction_input_packet`.
- The W4-H packet was `613` bytes, capped by `4096`.
- The W4-H packet hash matched the W4-G sidecar hash and W3-B Source Material text hash.
- The W4-H packet `providerId` matched the W4-G sidecar `providerId`: `wikimedia_core`.
- Default W4-H route projection stayed hash/length/provenance-only with `inputTextReturned: false`.
- Public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover`.
- Extraction execution, EvidenceItems, parser execution, LLM extraction calls, report/verdict/warning/confidence behavior, cache/SR/storage, retries, provider expansion, W2/W3 widening, ACS/direct URL, prompt/config/model/schema edits, V1 work, and V1 cleanup remained blocked.

## 3. Recommended W4-I Shape

W4-I should add a new linked consumer decision. It must not mutate or supersede W4-H, W4-G, W4-E, or W4-D state.

Recommended decision status:

```text
extraction_input_structurally_eligible_execution_denied
```

Recommended decision version:

```text
v2.evidence-lifecycle.execution-readiness-denial.x7w4i
```

Recommended decision kind:

```text
evidence_lifecycle_execution_readiness_denial
```

Recommended execution gate status:

```text
closed_pre_execution
```

The positive W4-I decision is "positive" only for structural readiness. It is still a denial for execution. It must keep:

- `extractionExecutionAuthorized: false`
- `llmExtractionCallAuthorized: false`
- `parserExecuted: false`
- `semanticExtractionAuthorized: false`
- `evidenceItemExtractionAuthorized: false`
- `evidenceItems: []`
- `reportGenerated: false`
- `verdictGenerated: false`
- `warningGenerated: false`
- `confidenceGenerated: false`
- public cutover `blocked_precutover`

## 4. Exact Accepted Parent Input

W4-I may accept only producer-owned, runtime-created W4-H packet state from the same product V2 ledger. It must not use:

- public result JSON;
- compatibility projections;
- UI data;
- report markdown;
- exported data;
- logs or errors;
- the W4-H default admin route response;
- copied, JSON-cloned, spread, or reconstructed packet objects.

The accepted W4-H decision must include:

- `decisionVersion: "v2.evidence-lifecycle.extraction-input-authorization.x7w4h"`
- `status: "bounded_extraction_input_packet_created_extraction_execution_closed"`
- `visibility: "internal_admin_only"`
- `publicPointerExposure: "forbidden"`
- exactly one packet
- no EvidenceItems
- `extractionExecutionAuthorized: false`
- `llmExtractionCallAuthorized: false`
- `parserExecuted: false`
- `semanticExtractionAuthorized: false`
- `evidenceItemExtractionAuthorized: false`
- `publicCutoverStatus: "blocked_precutover"`

The accepted packet must include:

- `packetVersion: "v2.evidence-lifecycle.extraction-input.bounded-text-packet.x7w4h"`
- `kind: "bounded_text_extraction_input_packet"`
- `visibility: "internal_admin_only"`
- `publicPointerExposure: "forbidden"`
- `source: "w4g_bounded_text_sidecar"`
- `inputText` present only in runtime-owned process state, not from route output
- `inputTextHash` equal to `sha256(inputText)`
- `inputTextByteLength` equal to UTF-8 byte length of `inputText`
- `inputTextByteLength > 0`
- `inputTextByteLength <= 4096`
- `maxInputTextBytes: 4096`
- `truncationApplied: false`
- `sourceMaterialTextHash` equal to `inputTextHash`
- `sourceMaterialTextByteLength` equal to `inputTextByteLength`
- `providerId` exactly copied from W4-G lineage
- non-empty parent lineage values: `packetId`, `parentSidecarId`, `linkedEvidenceCorpusId`, `sourceMaterialRef`, `locatorRef`, `candidatePreviewId`, `sourceMaterialEndpointId`, and `languageCode`

W4-I may hash and length-check the internal packet text for structural integrity only. It must not parse, summarize, classify, score, extract, quote, or otherwise interpret the text.

## 5. Decision Artifact Shape

The W4-I decision should be deliberately small and text-free by default.

Recommended fields:

```ts
type ExecutionReadinessDenialDecision = {
  decisionVersion: "v2.evidence-lifecycle.execution-readiness-denial.x7w4i";
  decisionId: string;
  kind: "evidence_lifecycle_execution_readiness_denial";
  status:
    | "extraction_input_structurally_eligible_execution_denied"
    | "blocked";
  stopReason: string;
  visibility: "internal_admin_only";
  publicPointerExposure: "forbidden";

  parentPacketVersion: "v2.evidence-lifecycle.extraction-input.bounded-text-packet.x7w4h";
  parentPacketId: string | null;
  parentDecisionVersion: "v2.evidence-lifecycle.extraction-input-authorization.x7w4h";
  parentDecisionStatus:
    | "bounded_extraction_input_packet_created_extraction_execution_closed"
    | null;

  structuralEligibility: "eligible" | "ineligible";
  executionGateStatus: "closed_pre_execution";
  denialReason: "execution_not_authorized_in_x7w4i";

  inputTextHash: string | null;
  inputTextByteLength: number | null;
  inputTextCharLength: number | null;
  maxInputTextBytes: 4096;
  providerId: string | null;
  sourceMaterialRef: string | null;
  locatorRef: string | null;
  candidatePreviewId: string | null;
  linkedEvidenceCorpusId: string | null;

  defaultProjection: "hash_length_provenance_only";
  inputTextReturned: false;

  extractionExecutionAuthorized: false;
  llmExtractionCallAuthorized: false;
  parserExecuted: false;
  semanticExtractionAuthorized: false;
  evidenceItemExtractionAuthorized: false;
  evidenceItems: [];
  reportGenerated: false;
  verdictGenerated: false;
  warningGenerated: false;
  confidenceGenerated: false;
  publicCutoverStatus: "blocked_precutover";
};
```

`inputText` may remain in W4-H's internal packet state. W4-I should not create a new text-bearing copy unless implementation evidence shows this is necessary. The W4-I decision and any default route response must be hash/length/provenance-only.

## 6. Default Admin Artifact And Route Posture

If W4-I implementation adds an admin artifact route, the route must be:

- authenticated by the existing internal admin-key pattern;
- internal only;
- `Cache-Control: no-store`;
- explicitly marked `visibility: "internal_admin_only"`;
- explicitly marked `publicPointerExposure: "forbidden"`;
- hash/length/provenance-only by default.

The default route response may expose:

- W4-I decision status, version, and stop reason;
- parent W4-H decision and packet versions;
- packet id and lineage ids;
- provider id and source-material endpoint id;
- input hash;
- input byte/char lengths;
- maximum input byte cap;
- structural eligibility;
- closed downstream flags;
- public cutover blocked status.

The default route response must not expose:

- `inputText`;
- `text`;
- source material text;
- excerpts, snippets, previews, summaries, or raw source text;
- raw provider payloads;
- raw URLs;
- raw titles;
- raw page keys;
- raw request paths;
- raw query text;
- EvidenceItems or draft EvidenceItem-like objects.

## 7. Failure Boundaries

Blocked W4-I decisions must emit no execution ticket and no EvidenceItems.

Recommended stop reasons:

- `w4h_decision_missing`
- `w4h_not_runtime_owned`
- `w4h_not_positive`
- `w4h_packet_missing`
- `w4h_packet_count_unsupported`
- `packet_kind_unsupported`
- `packet_visibility_invalid`
- `packet_text_missing`
- `packet_text_oversized`
- `packet_text_hash_mismatch`
- `packet_text_length_mismatch`
- `source_material_hash_mismatch`
- `source_material_length_mismatch`
- `lineage_missing_or_invalid`
- `provider_id_missing_or_invalid`
- `w4h_downstream_flags_open`
- `public_cutover_not_blocked`
- `raw_leakage_marker_detected`
- `structural_exception`

Every blocked decision must keep:

- `structuralEligibility: "ineligible"`
- `executionGateStatus: "closed_pre_execution"`
- `extractionExecutionAuthorized: false`
- `llmExtractionCallAuthorized: false`
- `parserExecuted: false`
- `semanticExtractionAuthorized: false`
- `evidenceItemExtractionAuthorized: false`
- `evidenceItems: []`
- public V2 `4.0.0-cb-precutover` / `blocked_precutover`

## 8. Explicit Non-Goals

W4-I does not authorize:

- implementation from this package before Steering review;
- a live job from this package;
- a second W4-H canary;
- execution tickets;
- LLM extraction calls;
- EvidenceItems;
- parser execution;
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

## 9. Proposed Implementation Envelope

If Steering approves W4-I later, implementation should be limited to:

```text
apps/web/src/lib/analyzer-v2/evidence-lifecycle/execution-readiness/execution-readiness-denial.ts
apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-denial-owner.ts
apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-denial-provenance.ts
apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-artifact-sink.ts
apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-execution-readiness-artifacts/route.ts
apps/web/src/lib/analyzer-v2/orchestrator.ts
apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/execution-readiness/execution-readiness-denial.test.ts
apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-denial-owner.test.ts
apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-denial-provenance.test.ts
apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-artifact-sink.test.ts
apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-execution-readiness-artifacts/route.test.ts
apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts
Docs/STATUS/Current_Status.md
Docs/STATUS/Backlog.md
Docs/AGENTS/Agent_Outputs.md
Docs/AGENTS/Handoffs/
Docs/AGENTS/index/handoff-index.json
```

`orchestrator.ts` should be touched only to record the hidden/admin-only W4-I decision after W4-H when all parent checks pass. It must not open extraction execution or public behavior.

## 10. Proposed Verifier Set

Before any later W4-I implementation commit:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/execution-readiness/execution-readiness-denial.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-denial-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-denial-provenance.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-execution-readiness-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run index
git diff --check
git status --short --untracked-files=all
```

Focused tests should prove:

- one valid runtime-owned W4-H packet creates one W4-I structural-readiness denial decision;
- copied, JSON-cloned, spread, route-derived, missing, oversized, hash-mismatched, length-mismatched, hidden-flag-mutated, provider-missing, lineage-missing, or downstream-flag-open packet inputs fail closed;
- W4-I does not create execution tickets, EvidenceItems, parser output, report/verdict/warning/confidence, cache/SR/storage, or public output;
- the artifact route is authenticated/no-store/internal-only;
- default route projection does not contain `inputText`, `text`, source material text, snippets, summaries, raw provider payloads, raw URLs, raw titles, raw page keys, raw request paths, raw query text, or EvidenceItem-like bodies;
- public result JSON remains precutover and contains no W4-I hidden markers or text.

Before any later W4-I canary:

```powershell
git status --short --untracked-files=all
git rev-parse HEAD
# Refresh API/Web runtime from the accepted W4-I implementation commit.
# Verify API/Web runtime commit hashes match that implementation commit.
# Preflight the W4-I internal route:
# - unauthenticated request denied with no-store;
# - malformed/missing ledger handled without text leakage;
# - default authenticated response is hash/length/provenance-only.
```

## 11. Pass Criteria

The package is accepted only if Steering agrees that:

- W4-I remains limited to the approved local implementation package until Steering authorizes any later canary.
- Accepted parent input is limited to runtime-owned W4-H packet state.
- W4-I records structural eligibility and execution denial in one hidden/admin-only decision.
- The W4-I decision is hash/length/provenance-only by default.
- Internal packet text remains absent from public/default-admin/log/error surfaces.
- Extraction execution remains closed.
- LLM extraction calls remain closed.
- EvidenceItems remain absent.
- Parser, report/verdict/warning/confidence, public behavior, cache/SR/storage, retries, provider expansion, W2/W3 widening, ACS/direct URL, prompt/config/model/schema edits, V1 work, and V1 cleanup remain closed.

The later implementation would pass only if local verifiers prove:

- exactly one valid runtime-owned W4-H packet creates exactly one W4-I decision;
- all malformed, copied, route-derived, mutated, oversized, or hash/length-mismatched packet inputs fail closed;
- W4-I does not mutate W4-H packet state or earlier W4-D/W4-E/W4-G state;
- no text appears in public/default-admin/log/error surfaces;
- public result JSON remains precutover and contains no W4-I hidden markers or text.

## 12. Stop And Pivot Criteria

Stop and return to Steering Board if W4-I would require any of the following:

- reading packet text from a route response instead of runtime-owned W4-H state;
- accepting more than one packet;
- raising the `4096` byte cap;
- adding source fetches or provider calls;
- widening W2/W3;
- adding parser execution;
- adding an LLM extraction call;
- creating EvidenceItems or draft EvidenceItem-like objects;
- creating execution tickets;
- changing report/verdict/warning/confidence behavior;
- adding public UI/API/report/export/compatibility behavior;
- adding cache/SR/storage behavior;
- logging or default-admin exposing packet text;
- changing prompt/config/model/schema behavior;
- touching V1 code or prompts.

If W4-I local implementation is clean but the first live canary later cannot produce the W4-I decision from W4-H state, stop after that single canary and bring the failure back as a Steering decision. Do not spend a second W4-I canary without a reviewed follow-up package.

## 13. Canary Recommendation

One later W4-I product-route canary is worth spending from the remaining `5`-job tranche after, and only after, a reviewed implementation package is accepted, committed, verifier-clean, and runtime-refreshed.

Rationale:

- W4-I is the first consumer-side execution boundary after packet creation.
- Local tests can prove contract containment, but one product-route canary should prove that the full W2/W3/W4 lineage can reach the W4-I denial decision without public leakage.
- This is still a denial gate, so one canary is enough; a second canary should require Steering review.

Recommended later canary input, unless Captain chooses another approved input:

```text
Using hydrogen for cars is more efficient than using electricity
```

The canary would consume one job from the `5`-job tranche, leaving `4`. No second W4-I canary should be run without Steering Board review.

Canary pass target:

- W2 through W4-H repeat the known hidden chain.
- W4-I records one `extraction_input_structurally_eligible_execution_denied` decision.
- W4-I parent packet hash equals W4-H packet hash, W4-G sidecar hash, and W3-B Source Material text hash.
- W4-I parent packet bytes are `> 0` and `<= 4096`.
- W4-I parent packet `providerId` equals the W4-H packet provider id exactly.
- Default W4-I route projection is hash/length/provenance-only.
- Public result JSON, UI, report markdown, export, compatibility projection, logs, and errors show no packet text and no hidden markers.
- Extraction execution, EvidenceItems, parser, report/verdict/warning/confidence, cache/SR/storage, provider expansion, W2/W3 widening, ACS/direct URL, prompt/config/model/schema edits, and V1 work remain closed.

## 14. Review Questions

Resolved by implementation approval:

- `extraction_input_structurally_eligible_execution_denied` is the local implementation status for a structural-readiness positive / execution-denial negative decision.
- W4-I adds its own authenticated internal no-store artifact route with hash/length/provenance-only default projection.
- One later W4-I canary may be proposed from the remaining `5`-job tranche, but it remains blocked until separate Steering authorization and ledger-confirmed accounting.
- W4-I should be treated as the current execution-boundary denial evidence before any future extraction-execution package.

## 15. Decision Requested

Local implementation is approved and in progress under this package. After verifiers pass, record the implementation result and keep live execution blocked.

Do not run a W4-I live job from this package. Any W4-I canary requires separate Steering authorization, clean provenance, accepted implementation commit, runtime refresh, and `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json` budget accounting.
