# 2026-05-20 Lead Developer V2 W8-E Upstream Stop Attribution Implementation

## Summary

Implemented W8-E inside the approved package:

`Docs/WIP/2026-05-20_V2_Slice_W8-E_W8B_Upstream_Stop_Attribution_Package.md`

W8-B now includes enum-only upstream stop attribution in the existing internal
Alpha report-result candidate and default route projection. No new route, sink,
storage, public behavior, prompt/model/config/schema change, or live job was
added.

## Implementation

Changed:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-result-artifact-sink.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route.test.ts`

The new `upstreamStopAttribution` projection reports:

- first incomplete stage;
- first incomplete W8-B reason;
- W5, W5-F, W6-B, W6-C, W7-A, W8-A, and W7-B2 enum/count status summaries;
- explicit redaction flags proving no source text, EvidenceItem text, input
  text, prompt text, provider payload, hidden ledger id, or raw internal state is
  returned.

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route.test.ts` passed: 2 files / 11 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts` passed: 1 file / 94 tests.
- `npm run validate:v2-gates` passed.
- `node scripts/validate-v2-gate-register.mjs --self-test` passed.
- `npm run debt:sensors` returned known `advisory_warn`.
- `npm -w apps/web run build` passed.

Closeout `npm run index`, `git diff --check`, and final status should be run
immediately before commit.

## Debt-Guard Result

Classification: incomplete-existing-mechanism / planned-temporary-debt.

Chosen option: amend existing W8-B projection in place. Rejected options were a
new W6-C/W7-B2 route, another sink, another live canary, or relaxing W8-B to
treat incomplete sufficiency as report-ready.

Net mechanisms: unchanged.

Residual risk: attribution improves the next canary diagnosis but does not fix
the upstream W6-C sufficiency completion stop. A later reviewed package is still
required before rerunning a live canary.

## Warnings

No live job was run. W8-E authorizes no prompt/model/config/schema/UCM/gateway
edit, public/API/UI/report/export/compatibility behavior, parser/cache/SR/storage
behavior, provider expansion, ACS/direct URL, V1 work, V1 cleanup, or W8-B
readiness relaxation.
