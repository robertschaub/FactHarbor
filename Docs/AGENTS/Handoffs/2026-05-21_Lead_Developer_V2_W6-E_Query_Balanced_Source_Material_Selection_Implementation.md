# Lead Developer Handoff - V2 W6-E Query-Balanced Source Material Selection Implementation

**Date:** 2026-05-21
**Role:** Lead Developer
**Slice:** W6-E Query-Balanced Source Material Selection
**Package:** `Docs/WIP/2026-05-21_V2_Slice_W6-E_Query_Balanced_Source_Material_Selection_Review_Package.md`
**Status:** implementation complete; verifier-clean locally; no live job run

## Summary

Implemented W6-E as a bounded structural selection repair inside the existing
W3-B Source Material page-summary owner.

The selector now joins eligible W3-B fetch locators back to W3-A preview records
by `candidatePreviewId`, derives the structural group from
`providerAttemptOrdinal`, and selects one eligible locator from each distinct
provider-attempt group before filling remaining slots. The hard cap remains
`3`, fetches remain sequential, dedupe remains active, and the existing
Wikimedia search/page-summary path is unchanged.

## Files Changed

- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-artifact-sink.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts`

The bounded-text artifact sink amendment is a closeout repair from the W6-D3
containment path: legacy/fixture artifacts missing `boundedTextSidecars` now
redact as an empty plural projection instead of throwing.

## Boundaries Preserved

No live job was run. No provider expansion, endpoint migration, W3-C widening,
full page/source/html fetch, parser execution, cache/SR/storage, prompt/model/
config/schema/UCM/gateway change, W6 prompt weakening, W7 gate relaxation,
report/verdict/warning/confidence publication, public/API/UI/report/export/
compatibility behavior, ACS/direct URL support, V1 work, or V1 cleanup was
added.

## Verification

Passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts`
- focused sink + selector recovery test: 2 files / 9 tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`: 73 files / 345 tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle`: 43 files / 214 tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`: 94 tests
- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `npm run debt:sensors`: `advisory_warn`
- `npm -w apps/web run build`

Pending closeout checks before commit:

- `npm run index`
- `git diff --check`
- final git status

## Failed-Attempt Recovery

Two verifier corrections occurred:

- The first focused selector test failed because the test's duplicate locator
  did not actually duplicate the current dedupe key. Classification: keep
  implementation, amend test. The corrected test duplicates provider/locator/
  page-key while pointing to a second preview id.
- The first full runtime suite found legacy/fixture artifacts without
  `boundedTextSidecars`. Classification: incomplete existing containment
  mechanism. The fix amends the existing redaction helper to default missing
  plural sidecars to `[]`; no new mechanism was added.

## Debt-Guard Result

Classification: incomplete-existing-mechanism / bounded structural repair.
Chosen path: amend existing W3-B selector and existing W4-G redaction helper.
Rejected paths: add new route/sink, add semantic ranking, widen providers, raise
fetch caps, weaken W6, or relax W7. Net mechanisms unchanged.

## Next Agent Context

After commit, a separately reviewed W6-E canary package may spend one live job
only if Steer-Co agrees that the remaining budget justifies it. The canary must
verify provider-attempt group diversity, containment, W5 schema state, and W6-C
recommendation movement. If W6-C remains `refine_retrieval`, stop same-provider
refinement and move to provider/source diversity.
