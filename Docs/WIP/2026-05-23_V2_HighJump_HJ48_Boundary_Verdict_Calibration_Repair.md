# V2 HighJump HJ48 - Boundary/Verdict Calibration Repair

**Status:** implementation in progress under Captain Deputy HighJump authority
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Preceded by:** HJ47 internal Alpha report `b6498cbb050641ff91f5bdcd5886590c`

## Why This Slice Exists

HJ47 produced a complete hidden/internal Alpha report and public/default
containment held. That is real report-path progress. The observed defect moved
from reachability to calibration: the internal verdict candidates returned
`TRUE` with truth `90`/`92` and confidence `85`/`88`.

For the `asylum-235000-de` benchmark family, the accepted expectation is
true-side but caveated: `LEANING-TRUE` or `MOSTLY-TRUE`, truth `58..75`,
confidence `40..70`, with the Captain-accepted comparator at `MOSTLY-TRUE`
`78`/`68`. HJ47 therefore overshot label, truth, and confidence even though
its own report preserved caveats about approximate wording, upstream sufficiency
status, source singularity, and temporal alignment.

Claude Opus 4.6 returned `MODIFY`: pivot to prompt-only verdict/confidence
calibration, not more source locator machinery. A short no-code review of recent
complete reports showed the overcalibration pattern is not broad across recent
asylum runs: HJ38/HJ41/HJ43/HJ45 were underconfident/UNVERIFIED. HJ47 flips too
far once direct evidence appears.

## Scope

Amend only the existing `V2_BOUNDARY_VERDICT_EXECUTION` prompt section so it
uses supplied caveat and sufficiency signals when assigning internal label,
truth, and confidence candidates.

Allowed:

- add generic calibration guidance for internal verdict candidates;
- teach the prompt to reserve strongest labels/scores for direct, precise,
  well-supported evidence;
- require caveated sufficiency, source singularity, approximate/threshold
  mismatch, or non-independent authority context to lower label/truth/confidence
  instead of only appearing as prose caveats;
- discourage near-duplicate verdict candidates when a second boundary only adds
  context that does not independently verify the claim;
- update focused prompt-contract tests;
- run one HJ48 live rerun after clean verifiers and committed runtime refresh.

Closed:

- source acquisition, provider expansion, XLSX/locator changes, parser work,
  retries, cache/SR/storage behavior, public behavior, schema changes, model
  policy changes, UCM approval flips, direct URL/ACS, V1 work, and V1 cleanup.

## V2 Scorecard Impact

Positive:

- V2-Q5 Verdict quality: candidate labels and truth/confidence should match
  evidence strength and caveats.
- V2-Q6 Report quality: the internal report should stay useful without
  overstating certainty.
- V2-Q10 Complexity convergence: amends an existing prompt instead of adding
  another source-material or diagnostic mechanism.

## V2 Retirement Ledger Impact

No new hidden mechanism. HJ48 helps retire HighJump bar-lowering debt by raising
the first successful report's calibration bar based on observed evidence.

## V2 Consolidation Gate

Allowed because it directly addresses the observed report-quality defect and
does not add parallel machinery.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`.

Chosen option: amend the existing boundary/verdict prompt.

Rejected paths:

- adding more source locator/crawler behavior after a complete report was
  produced;
- changing schema or report writer, because the report writer correctly copies
  supplied verdict values;
- code-side deterministic calibration, which would violate the LLM-intelligence
  rule for analytical judgment;
- another live rerun without a calibration repair.

Net mechanisms: unchanged.

Temporary debt: prompt-side calibration remains HighJump-era and must be
reviewed against broader benchmark reports before public cutover.

## Verification Plan

Before live job:

- focused prompt-contract test;
- focused boundary/verdict runtime tests if available through existing suite;
- `npm run validate:v2-gates`;
- `npm run debt:sensors`;
- `npm -w apps/web run build`;
- `npm run index`;
- `git diff --check`;
- clean git status, runtime refresh, Web/API/proxy version match.

Local verifier results:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts` - pass, 1 file / 10 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-owner.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-report-writer.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.test.ts` - pass, 5 files / 41 tests.
- `npm run validate:v2-gates` - pass.
- `npm run debt:sensors` - `advisory_warn`; salient warnings remain known V2/test/boundary-guard/docs footprint and existing consolidation-marker review items.
- `npm -w apps/web run build` - pass.

Live validation:

- exactly one HJ48 rerun for the Captain-defined input
  `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`;
- pass if the internal report still completes and moves the top-line verdict
  candidate from `TRUE` toward `MOSTLY-TRUE` or `LEANING-TRUE`, with truth and
  confidence materially reduced into or near the accepted family band;
- preserve public/default containment.

## Stop Conditions

Stop and reconvene Steer-Co if:

- local tests imply schema/code/source/provider changes are needed;
- prompt calibration damages structural output validity;
- the live rerun remains `TRUE` with very high confidence despite similar thin
  evidence and caveats;
- another benchmark family is clearly harmed by the generic calibration wording;
- any public/default-admin/log/error surface leaks report text, source text,
  prompt text, provider payload, hidden IDs, public verdict, truth percentage,
  or confidence.
