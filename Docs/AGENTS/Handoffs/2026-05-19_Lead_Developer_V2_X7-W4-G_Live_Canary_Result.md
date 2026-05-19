# Lead Developer Handoff - V2 X7-W4-G Bounded Corpus Text Live Canary Result

**Date:** 2026-05-19
**Role:** Lead Developer / Captain Deputy
**Agent:** Codex (GPT-5.5)
**Status:** `PASS_X7_W4_G_BOUNDED_CORPUS_TEXT_CANARY`
**Implementation commit:** `3861568be8a4199b75034d24f52d178f3e375a67`
**Source package:** `Docs/WIP/2026-05-19_V2_Slice_X7-W4-G_Bounded_Corpus_Text_Authorization_Review_Package.md`

## Task

Run exactly one approved W4-G product-route canary after confirming clean provenance, refreshing API/Web runtime from commit `3861568b`, verifying runtime commit hashes, and preflighting the W4-G internal artifact route.

## Provenance And Preflight

- Worktree was clean before runtime refresh and before submission.
- `HEAD`, API runtime, and Web runtime all reported `3861568be8a4199b75034d24f52d178f3e375a67`.
- Config validation passed and prompt/config reseed reported `0` changed / `0` errors.
- Runner route preflight returned `400 Missing jobId` with the runner key.
- W4-G artifact route preflight passed:
  - unauthenticated missing-ledger request: `401`, `Cache-Control: no-store`;
  - authenticated missing-ledger request: `404`, `Cache-Control: no-store`, `internal_admin_only` / `forbidden`;
  - authenticated malformed-ledger request: `400`, `Cache-Control: no-store`.
- W4-G success projection was checked after the canary on the canary ledger because a successful W4-G route projection requires an in-memory W4-G artifact.

## Canary Result

- Result classification: `PASS_X7_W4_G_BOUNDED_CORPUS_TEXT_CANARY`
- Job id: `1535d6e3695743fd88394c2dc3e3a546`
- Input: `Using hydrogen for cars is more efficient than using electricity`
- Pipeline variant: `claimboundary-v2`
- First preparation event: `Preparing input (pipeline: claimboundary-v2)`
- Status: `SUCCEEDED`
- Created git: `3861568be8a4199b75034d24f52d178f3e375a67`
- Executed git: `3861568be8a4199b75034d24f52d178f3e375a67`
- Public schema: `4.0.0-cb-precutover`
- Public cutover status: `blocked_precutover`
- Public issue: `report_damaged`
- Public leak check: no W4-G hidden markers, hidden chain markers, or bounded source text leaked in public API/Web job JSON or public report markdown.

## Hidden Artifact Evidence

All inspected hidden artifacts were present on ledger `1535d6e3695743fd88394c2dc3e3a546:precutover-observability`.

- W2: `candidate_provider_network_completed`, `completed_structural`, `3` provider attempts, `3` network attempts, `9` total hidden candidates, `14246` total bytes.
- W3-A: `source_candidate_preview_partial`. This did not block W3-B because the W3-B path still produced one bounded page-summary Source Material record.
- W3-B: `source_material_page_summary_completed`, `not_stopped`, `1` bounded hidden `wikimedia_page_summary_extract_text` Source Material record, `613` bytes, text hash `e3b89fdd919c7c7f052eb54f8f0f5b4a733215bace040882d278682584efa6bb`.
- W4-A: `source_material_structurally_admissible_evidence_corpus_gate_closed`, `1` admitted Source Material record, `evidenceCorpusBuildAuthorized: false`, `extractionInput: null`.
- W4-F/W4-C: `source_material_admitted_to_corpus_input_gate_closed`.
- W4-F/W4-D: `evidence_corpus_shell_created_extraction_gate_closed`, `EvidenceCorpus.kind: "shell_only"`, `corpusTextAccess: "closed"`.
- W4-F/W4-E: `extraction_denied_shell_only`, `shell_only_corpus`.
- W4-G: `bounded_corpus_text_sidecar_created_extraction_gate_closed`, `not_stopped`, exactly `1` `bounded_text_sidecar`, `corpusTextAccess: "internal_admin_only_bounded_text_sidecar"`, `613` bytes, max `4096` bytes.
- W4-G text hash equals W3-B Source Material text hash: `e3b89fdd919c7c7f052eb54f8f0f5b4a733215bace040882d278682584efa6bb`.
- W4-G preserved shell-only/denial posture: `preservesShellOnlyCorpus: true`, `mutatesShellCorpus: false`, `mutatesExtractionDenial: false`, `semanticExtractionAuthorized: false`, `evidenceItemExtractionAuthorized: false`, `extractionInput: null`, `evidenceItems: []`.
- W4-F and W4-G closed execution flags stayed false for source text authorization beyond the sidecar, extraction input creation, EvidenceItem generation, parser, cache, storage, Source Reliability, report, verdict, warning, confidence, and public surface writes.

## Route And Leak Checks

- W2/W3-A/W3-B/W4-A/W4-F/W4-G internal artifact routes all returned `200`, `Cache-Control: no-store`, `visibility: internal_admin_only`, and `publicPointerExposure: forbidden`.
- W4-G route returned `defaultProjection: "hash_length_provenance_only"`.
- W4-G default route projection had `textReturned: false`, `textAccess: "redacted_default_hash_length_provenance_only"`, no exact `text` key, no exact `sourceMaterialText` key, and did not contain the bounded source text in the route body.
- Public API and Web job reads stayed `4.0.0-cb-precutover` / `blocked_precutover` and did not contain W4-G status strings, sidecar markers, W3-B/W4-C/W4-D/W4-E hidden statuses, `wikimedia_page_summary_extract_text`, exact `text` keys, exact `sourceMaterialText` keys, or the bounded source text.

## Budget

The W4-G canary consumed `1` job from the `3`-job tranche. Remaining live-job budget: `2`.

## Warnings

- No second W4-G canary is authorized.
- W4-G is closed only for this bounded corpus-text sidecar canary gate.
- W4-G does not authorize extraction input, EvidenceItems, parser execution, report/verdict/warning/confidence behavior, public behavior, cache/SR/storage, retries, provider expansion, W2/W3 widening, ACS/direct URL, V1 work, or V1 cleanup.

## For Next Agent

Treat W4-G as passed and closed for the approved canary gate. The next step should be a reviewed Steering decision before opening extraction input, EvidenceItems, parser work, report/verdict behavior, public behavior, provider/source widening, cache/SR/storage, ACS/direct URL, V1 work, or V1 cleanup.

## Learnings

The first positive text-bearing EvidenceCorpus crossing can remain contained when the product path carries the text only as an internal bounded sidecar and exposes admin observability through hashes, lengths, and provenance by default.
