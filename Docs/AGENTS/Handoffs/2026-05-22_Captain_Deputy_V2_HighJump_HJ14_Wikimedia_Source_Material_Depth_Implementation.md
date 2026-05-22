# Captain Deputy V2 HighJump HJ14 Wikimedia Source Material Depth Implementation

Date: 2026-05-22
Role: Captain Deputy / Lead Developer
Status: implementation complete; canary pending after commit/runtime refresh

## Summary

Implemented HJ14 under
`Docs/WIP/2026-05-22_V2_HighJump_HJ14_Wikimedia_Source_Material_Depth_Repair.md`.
Steer-Co consensus selected the smallest report-value repair after HJ13:
deepen existing Wikimedia Source Material before adding a provider or changing
report/extraction prompts.

The implementation amends the existing W3-B Wikimedia Source Material transport
in place. It replaces the short REST page-summary path with project-local
MediaWiki Action API TextExtracts:

`/w/api.php?action=query&prop=extracts&exchars=1200&explaintext=1&exsectionformat=plain&format=json&formatversion=2&redirects=1&titles=<materialized-title>`

The transport normalizes provider responses to the existing `{ extract }`
shape, stripping raw provider page metadata such as title/page id/key before
the outcome reaches W3-B record creation. Existing W3-B contract labels remain
stable for downstream compatibility.

## Files Changed

- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-transport.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-transport.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts`
- `Docs/WIP/2026-05-22_V2_HighJump_HJ14_Wikimedia_Source_Material_Depth_Repair.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-22_Captain_Deputy_V2_HighJump_HJ14_Wikimedia_Source_Material_Depth_Implementation.md`
- `Docs/AGENTS/index/handoff-index.json` after `npm run index`

## Boundaries Preserved

- No provider expansion.
- No prompt/model/config/schema/UCM/gateway edit.
- No parser execution or full page/source/html fetch.
- No deterministic semantic source ranking or comparator keyword logic.
- No retries, cache, Source Reliability, storage, public API/UI/report/export,
  compatibility projection, ACS/direct URL, V1 work, or V1 cleanup.
- Public V2 remains blocked/precutover/damaged.

## Debt-Guard Result

DEBT-GUARD RESULT

- Classification: `incomplete-existing-mechanism`.
- Chosen option: amend existing W3-B Wikimedia transport in place.
- Rejected path and why: provider expansion, prompt/report repair, semantic
  ranking, parser/full-page fetch, retry/fallback stack, and new hidden routes
  are broader than the evidence requires after HJ13.
- What was removed/simplified: short REST summary request path as the active
  W3-B Wikimedia source-material fetch.
- What was added: one structural response-normalization helper inside the
  existing transport plus focused tests for the Action API path and raw provider
  metadata stripping.
- Net mechanism count: unchanged.
- Budget reconciliation: stayed inside the package envelope; no new stage,
  route, provider, parser, public surface, prompt/schema path, cache, SR,
  storage, or retry mechanism.
- Debt accepted and removal trigger: existing "page-summary" contract naming
  now covers bounded Wikimedia text extracts for compatibility. If HJ14 proves
  useful, a later consolidation package should rename or merge W3-B
  summary/extract terminology without behavior widening.

## Verification

Passed locally:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-transport.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts`
  - `3` files / `14` tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`
  - `74` files / `352` tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
  - `142` files / `860` tests
- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `npm run debt:sensors`
  - `advisory_warn`, generated `2026-05-22T04:06:17.696Z`
- `npm -w apps/web run build`
- `git diff --check`

One focused verifier initially failed because an owner test still expected the
old REST summary path. Classification: `keep`; source direction was correct and
the test expectation was updated within the HJ14 envelope.

## Next Action

Commit the implementation, refresh API/Web runtime to the implementation
commit, verify runtime hashes and clean git status, preflight public
precutover/internal artifact containment, then run exactly one HJ14 canary using
the Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

Record job id, runtime commit, W3-B Source Material byte lengths/kinds, W5/W8
hidden chain, public/default-admin leak checks, and update the live-job ledger.
No second HJ14 canary is authorized without a new reviewed package.

## Warnings

- TextExtracts `exchars` is officially capped at `1200`; this is a bounded
  depth repair, not a full-source solution.
- If HJ14 still leaves the report `UNVERIFIED` for lack of direct comparator
  evidence, stop same-provider tweaks and bring Steer-Co a provider/endpoint
  package.

## Learnings

- Current HJ13 evidence points to source-material depth/substance as the
  immediate blocker, not another report-readiness layer.
- Keeping contract labels stable avoided broad downstream fixture churn while
  still improving the source substrate.
