# Handoff: V2 W6-D1 Contract Widening Implementation

**Date:** 2026-05-21
**Role:** Lead Developer
**Model:** Codex GPT-5.5
**Scope:** `Docs/WIP/2026-05-21_V2_Slice_W6-D_Retrieval_Refinement_Source_Material_Fan_In_Review_Package.md`
**Status:** implementation verifier-clean, commit pending

## Summary

Implemented W6-D1 as contract-only widening of the existing W3/W4/W5 source-material, EvidenceCorpus, bounded-text, and extraction-input chain. The one-record path remains valid, while the contracts now accept bounded fan-in up to three page-summary Source Material records and one aggregate extraction-input packet capped at 4096 bytes.

This slice does not add runtime fan-in fetching, live jobs, provider expansion, parser execution, prompt/model/config/schema changes, public behavior, cache/SR/storage, report/verdict/warning/confidence behavior, ACS/direct URL behavior, V1 work, or V1 cleanup.

## Implementation Delta

- `source-material-readiness` now accepts `1..3` Source Material records, exposes canonical `sourceMaterialRecords`, preserves the singular compatibility projection, and rejects inconsistent counts, malformed records, duplicate source-material ids, or duplicate text hashes.
- `source-material-admission` now builds canonical `corpusAdmissionInputs` for every accepted readiness record while preserving the first input as the singular compatibility projection.
- `evidence-corpus-shell` now aggregates refs, locators, candidates, providers, endpoint ids, language codes, source-material kinds, and text hashes across the bounded fan-in while keeping text access closed.
- `bounded-text-authorization` now creates one bounded text sidecar per Source Material record, preserves the first sidecar as the singular compatibility projection, and enforces the aggregate 4096-byte text cap.
- `bounded-extraction-input-authorization` now builds one aggregate extraction-input packet from `1..3` bounded text sidecars, with aggregate hash/length fields and provider-id equality checks.
- Runtime provenance exact-key guards and owner fixtures were aligned to the canonical array fields so process-local runtime ownership still detects copies and post-mark mutations.
- The extraction-input artifact projection now includes only the new aggregate hash/length/provenance array fields; text remains excluded from default projections.

## Boundaries Preserved

- No W6-D2 runtime same-provider page-summary fan-in.
- No live job or canary.
- No source text in public/default-admin/log/error surfaces.
- No parser, EvidenceCorpus parser material, EvidenceItems beyond existing W5 path, report/verdict/warning/confidence behavior, cache/SR/storage, retries, provider expansion, W2/W3 endpoint widening, ACS/direct URL, V1 reuse, or V1 cleanup.
- Selection/drop behavior remains structural only; no semantic ranking, keyword filtering, or topic-specific logic was added.

## Verification

Passed:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-readiness.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-admission.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-shell.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle
npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run debt:sensors
npm -w apps/web run build
git diff --check
```

Result details:

- Focused W6-D1 contract tests: 5 files / 20 tests passed.
- Analyzer V2 runtime slice: 73 files / 341 tests passed.
- Analyzer V2 evidence-lifecycle slice: 43 files / 214 tests passed.
- Boundary guard: 1 file / 94 tests passed.
- `npm run debt:sensors`: `advisory_warn`; salient warnings remain V2 source/test/boundary-guard/docs footprint, net-mechanism telemetry, and older consolidation-marker warnings.

## Failed-Attempt Recovery

The first runtime verifier run exposed exact-key provenance drift after adding canonical fan-in array fields. Classified as `keep/amend`: the contract widening was still justified and the failure was limited to runtime ownership guards and hand-built fixtures. The fix amended provenance allowlists and fixtures to the canonical array shape rather than weakening ownership checks.

## DEBT-GUARD RESULT

**Classification:** incomplete-existing-mechanism / contract widening.

**Chosen option:** amend the existing W4/W5 contract chain in place.

**Rejected path:** new parallel fan-in route/owner, prompt retry, provider expansion, cap increase, or public projection change.

**What removed/simplified:** none in this slice; legacy singular fields remain as compatibility projections while arrays become canonical.

**What added:** bounded fan-in arrays and aggregate packet fields, plus focused fan-in tests and provenance fixture alignment.

**Net mechanism count:** unchanged public/runtime fetch mechanisms; existing contracts widened only.

**Budget reconciliation:** stayed in W3/W4/W5 contract/projection/tests and provenance guards; no runtime fan-in fetch, live job, public route, prompt/config/model/schema edit, or provider expansion.

**Debt accepted/removal trigger:** singular compatibility fields remain until W6-D2 and later projection consumers no longer need them. After W6-D canary evidence, the one-record path should be downgraded to compatibility baseline if fan-in becomes the preferred sufficiency path.

## V2 SCORECARD IMPACT

Improves report-quality prerequisites by removing the one-record bottleneck from the hidden Source Material to extraction-input chain. W6-D1 alone does not improve report quality at runtime; it enables W6-D2 to test whether bounded page fan-in moves W6-C away from `refine_retrieval`.

## V2 RETIREMENT LEDGER IMPACT

Creates retirement pressure on the single-record W3-B/W4-G/W4-H canary path as the main sufficiency proof path, but does not retire it yet. W6-D2 plus a later canary must provide the evidence before the one-record path is downgraded.

## V2 CONSOLIDATION GATE

Passed for W6-D1. This is not a new hidden denial/proof layer; it widens existing contracts needed for the report-value retrieval-refinement path. W6-D2 must reuse these contracts rather than cloning separate fan-in machinery.

## Next

Proceed to W6-D2 only after W6-D1 is committed cleanly. W6-D2 should implement same-provider Wikimedia page-summary fan-in through the existing approved runtime path and remain capped at three records / 4096 aggregate extraction-input bytes. No W6-D canary is authorized until W6-D1 and W6-D2 are both committed, runtime refreshed, routes preflighted, and the live-job ledger updated.
