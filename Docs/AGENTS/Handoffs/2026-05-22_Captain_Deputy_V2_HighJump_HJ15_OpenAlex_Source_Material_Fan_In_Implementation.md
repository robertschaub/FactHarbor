# 2026-05-22 - Captain Deputy - V2 HighJump HJ15 OpenAlex Source Material Fan-In Implementation

## Role And Scope

- Role: Captain Deputy / Lead Developer.
- Slice: `X7-HJ-15-OPENALEX-SOURCE-MATERIAL-FAN-IN-REPAIR`.
- Package:
  `Docs/WIP/2026-05-22_V2_HighJump_HJ15_OpenAlex_Source_Material_Fan_In_Repair.md`.
- Preceding result:
  `STOP_X7_HJ14_WIKIMEDIA_TEXTEXTRACTS_NO_MEASURABLE_DEPTH_GAIN_INTERNAL_ALPHA_DRAFT_CREATED`
  on job `959c0246501c44558cbf8f484f9b6e3b`.

## Steer-Co Decision

Steer-Co consented to HJ15 as an `incomplete-existing-mechanism` repair:

- amend the existing OpenAlex Source Material collector;
- collect unique valid OpenAlex abstract records up to the existing cap;
- use structural de-duplication only;
- avoid another Wikimedia depth tweak, provider expansion, prompt/schema edit,
  parser/full source fetch, cache/SR/storage, retry stack, public behavior, ACS
  support, and V1 work.

Claude Opus review was attempted twice through the project wrapper but returned
Anthropic `529 Overloaded`; internal Steer-Co consent was used.

## Implementation Delta

Changed:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts`
- HJ15 package/status/backlog/Agent_Outputs/handoff/ledger docs

Behavior:

- The OpenAlex collector now tracks structural Source Material identity keys.
- It continues through projected candidates instead of stopping after the first
  valid record in a response.
- It skips structurally duplicate records and invalid/no-abstract candidates
  without consuming cap space.
- It stops at the existing `maxCandidatesPerQuery` cap.
- It does not raise endpoint, provider, query, retry, timeout, or byte scope.

## Verification

Passed before implementation commit:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts`
  - `1` file / `8` tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material.test.ts`
  - `3` files / `19` tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`
  - `74` files / `353` tests
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
  - `142` files / `861` tests
- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `npm run debt:sensors`
  - `advisory_warn`, generated `2026-05-22T04:32:29.364Z`
- `npm -w apps/web run build`
- `git diff --check`

## Containment

No public/API/UI/report/export/compatibility behavior changed. Public V2 remains
blocked/precutover/damaged. No prompt/model/config/schema edits, parser/full
source fetch, cache/SR/storage behavior, provider/endpoint expansion, retries,
ACS/direct URL support, V1 reuse, or V1 cleanup were added.

## Next Action

Commit the focused implementation. If runtime refresh and commit-hash checks are
clean, run exactly one HJ15 canary using:
`Using hydrogen for cars is more efficient than using electricity`.

The HighJump tranche is exhausted. The canary requires Steer-Co budget
reconciliation and must be recorded as exception overrun `5` if run. No second
HJ15 canary is authorized.
