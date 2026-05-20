# V2 Slice W8-E W8-B Upstream Stop Attribution Package

Date: 2026-05-20
Owner: Captain Deputy / Steer-Co
Author: Captain Deputy / Lead Developer
Reviewers: Claude Opus 4.6 Senior Architect, GPT technical reviewer
Implementer: Lead Developer
Canary runner: none in this package

## 1. Decision

Approved direction: implement one bounded attribution improvement inside the
existing W8-B internal Alpha report-result artifact projection. Do not add a new
route, sink, product stage, live job, prompt/model/config/schema change, public
surface, or report behavior.

W8-D proved the W8-B route is reachable, but it stopped because W8-B saw an
upstream incomplete sufficiency state:

- job: `828aacb298ed43a885b8d2f41379f25e`
- classification: `STOP_X7_W8_D_INTERNAL_ALPHA_RESULT_BLOCKED_BY_SUFFICIENCY_ASSESSMENT`
- W8-B artifact status: `internal_alpha_report_result_blocked`
- W8-B blocked reason: `sufficiency_assessment_not_completed`
- W8-B input EvidenceItem count: `1`
- W8-B cited ref count: `0`

Steer-Co consensus: do not retry W8-D. The next package should make the existing
W8-B route self-attributing enough to distinguish W6-C, W7-A/W8-A, and W7-B2
stop causes on the next reviewed canary without creating another route layer.

## 2. Problem

W8-B currently reports the first high-level blocked reason, but its default
admin projection does not expose the enum-only upstream stop state that explains
why W6-C/W7-B2 did not complete.

This makes W8-D actionable only as "some upstream sufficiency completion problem"
instead of identifying whether the next repair belongs to:

- W6-C sufficiency assessment provider/schema/task execution;
- W5 evidence thinness or handoff lineage;
- W7-A/W8-A bridge readiness;
- W7-B2 boundary/verdict execution readiness;
- or evidence breadth/source acquisition.

## 3. Scope

Allowed source/test envelope:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-result-artifact-sink.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts` only if needed to preserve existing W8-B route/source guard coverage
- docs/status/handoff/index files required by protocol

Allowed behavior:

- Add an enum-only `upstreamStopAttribution` or equivalent field to W8-B
  `InternalAlphaReportResultCandidate` and default projection.
- Populate it using existing parent decisions already passed to
  `buildInternalAlphaReportResultCandidate`.
- Include only existing structural status and reason enums, counts, hashes, and
  boolean redaction facts.
- Prefer first-incomplete-stage attribution:
  - W5 bounded extraction;
  - W5-F handoff;
  - W6-B sufficiency intake;
  - W6-C sufficiency assessment;
  - W7-A boundary/verdict candidate bridge;
  - W8-A internal report stop bridge;
  - W7-B2 boundary/verdict execution.
- Preserve current W8-B fail-closed behavior. Do not convert a blocked result
  into a candidate-created result.
- Add focused tests for W6-C non-completed, W7-B2 non-accepted, and accepted
  path attribution.

Forbidden:

- no prompt/model/config/schema/UCM/gateway edits or approval flips;
- no new route, sink, durable storage, cache IO, Source Reliability, parser,
  provider expansion, W2/W3 widening, ACS/direct URL, V1 work, or V1 cleanup;
- no live job/canary;
- no report/verdict/warning/confidence behavior;
- no public/API/UI/report/export/compatibility exposure;
- no source text, EvidenceItem text, snippets, summaries, provider payloads,
  prompt text, rendered prompt text, hidden ledger ids, or raw internal state in
  public/default-admin/log/error surfaces;
- no relaxation of W8-B pass criteria.

## 4. V2 SCORECARD IMPACT

- Advances V2-Q5 by making the first internal report-result path actionable when
  it blocks upstream.
- Advances V2-Q10 by avoiding another live job and avoiding a new route/sink.
- Does not claim report-quality progress. This is attribution/convergence work.

## 5. V2 RETIREMENT LEDGER IMPACT

- Supports `V2-RL-004` route consolidation pressure: use the existing W8-B route
  for report-chain attribution instead of adding per-stage routes.
- Supports `V2-RL-017`: W8-A remains parity-covered; W8-E must not make W8-A a
  new public/report owner.
- No retirement is completed in W8-E. Any later route or bridge retirement must
  use a separate package.

## 6. V2 CONSOLIDATION GATE

This package is allowed despite touching hidden artifacts because it adds no new
hidden mechanism. It amends an existing projection to make the next decision
more precise and reduce the chance of repeated canary/diagnostic loops.

Net mechanism count: unchanged.

## 7. Latest Debt Sensor Status

`npm run debt:sensors` on 2026-05-20 returned `advisory_warn`.

Salient warnings:

- V2 source/tests exceed advisory footprint thresholds.
- `boundary-guard.test.ts` remains large.
- Docs/WIP and handoff counts exceed advisory thresholds.
- Some older V2 Source Acquisition/EvidenceCorpus docs lack consolidation
  markers.

W8-E must therefore avoid new routes/sinks and avoid widening boundary guard
unless a verifier requires it.

## 8. Verifier Plan

Required before implementation closeout:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run debt:sensors
npm run index
git diff --check
git status --short --untracked-files=all
```

Build is optional unless TypeScript impact is not covered by focused tests or a
local type error appears.

## 9. Pass Criteria

Classify implementation as complete only if:

- W8-B still fails closed for incomplete W6-C/W7-B2 parents;
- W8-B accepted path behavior is unchanged;
- default W8-B route remains no-store/authenticated and text-free;
- upstream attribution identifies the first incomplete stage and enum-only
  status/reason data;
- no public/default-admin/log/error text leak is introduced;
- no new route/sink/live job/source behavior is added;
- verifiers pass.

## 10. Stop Criteria

Stop and reconvene Steer-Co if:

- the fix requires prompt/model/config/schema/UCM/gateway edits;
- a new route/sink appears necessary;
- W8-B would need to treat non-completed W6-C as report-ready;
- the package needs source text, EvidenceItem text, prompt text, provider
  payload, hidden ledger ids, or raw internal state;
- the root cause turns out to be legitimate analytical insufficiency requiring
  evidence breadth/source strategy rather than W8-B attribution;
- any verifier fails with unclear cause.

## 11. Live Jobs

No live job is authorized in W8-E.

If W8-E is implemented and verifier-clean, a later W8-F or W8-D2 canary package
may propose exactly one rerun against the remaining budget only after Steer-Co
review.
