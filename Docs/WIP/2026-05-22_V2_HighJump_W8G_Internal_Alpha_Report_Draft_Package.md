# V2 HighJump W8-G Internal Alpha Report Draft Package

**Date:** 2026-05-22
**Status:** Locally implemented and verifier-clean; live canary pending runtime refresh
**Owner:** Captain Deputy / Lead Developer
**Scope:** V2 direct-text internal Alpha path only

## Decision

Implement W8-G as a hidden/admin-only internal Alpha report draft projection over
the already validated W8-B report-result candidate and W7-B boundary/verdict
execution output.

W8-G does not add a new LLM call. It preserves W7-B's LLM-owned
boundary/verdict review payload internally and renders a deterministic internal
review draft from that validated payload. Public V2 remains
`4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`.

## Steer-Co / Team Consensus

The team recommendation after HJ7 was to continue report creation rather than
return to broad readiness scaffolding.

Consolidated outcome:

- Proceed with a narrow W8-G internal draft path.
- Do not add a report-prose LLM call yet; first preserve and expose the existing
  W7-B LLM-owned rationale/caveats/verdict candidates for internal report
  review.
- Keep the default admin projection hash/length/provenance-only.
- Allow draft text only behind an explicit authenticated no-store admin
  inspection flag.
- Keep public result JSON, UI, reports, exports, compatibility projection, logs,
  and errors free of draft/source/EvidenceItem/prompt/provider text.

Claude Opus 4.6 returned `MODIFY`: it supported the report-prose direction but
required an authority anchor, authenticated prose inspection surface, and
comparator/report-review binding. The implementation follows that by avoiding a
new LLM/prompt/model/schema transition in W8-G and by making the draft an
inspection-only internal artifact.

Gemini review was degraded because `GOOGLE_GENERATIVE_AI_API_KEY` was not
available locally; this did not block the package because the implemented path
is bounded, reversible, hidden-only, and does not change public behavior or
prompt/model/schema authority.

## What This Unlocks

W8-G unlocks internal report review over actual W7-B-generated boundary and
verdict candidate prose. It converts the HJ7 structured metadata-only result
into a human-readable internal Alpha draft suitable for comparator and
Captain-quality review.

It does not unlock:

- public report generation;
- public verdict/truth/confidence/warning publication;
- report-prose LLM execution;
- prompt/model/config/schema/UCM/gateway changes;
- cache, Source Reliability, storage, parser, ACS/direct URL, provider
  expansion, V1 work, or V1 cleanup.

## Older Guard / Artifact Impact

W8-G does not retire W8-B. It adds a linked draft artifact that depends on W8-B
lineage and W7-B review payload integrity.

New temporary mechanism:

- W8-G internal Alpha report draft artifact route/sink.

Merge trigger:

- merge W8-G into a stable report writer after internal report review accepts
  the output shape and a later package owns public/report behavior explicitly.

## Exact Input Contract

Accepted parents:

- W8-B `InternalAlphaReportResultCandidate` with
  `status = internal_alpha_report_result_candidate_created`;
- W7-B `BoundaryVerdictExecutionDecision` with
  `status = boundary_verdict_candidates_created_internal`;
- W7-B `internalReviewPayload` present;
- W8-B lineage decision id equals W7-B decision id;
- W8-B `resultPayloadHash` equals W7-B `resultPayloadHash`.

Fail-closed outcomes:

- missing or non-created W8-B result;
- missing or non-accepted W7-B execution;
- missing W7-B review payload;
- lineage mismatch;
- empty draft;
- draft byte length above `32768`.

## Artifact And Route Contract

The W8-G artifact is process-local and hidden/admin-only.

Default route projection:

- artifact version, status, hashes, byte lengths, parent provenance, counts;
- `draftMarkdownReturned = false`;
- no raw ledger id, run id, decision id, EvidenceItem id, source text,
  EvidenceItem text, prompt text, provider payload, public verdict, public truth
  percentage, public confidence, or public warning.

Explicit inspection projection:

- requires valid admin key;
- requires `inspectDraftText=true`;
- remains `Cache-Control: no-store`;
- returns the internal draft Markdown only for review.

## V2 SCORECARD IMPACT

Quality dimensions advanced:

- V2-Q5 Verdict quality: exposes W7-B verdict candidates in a reviewable
  internal draft rather than metadata only.
- V2-Q6 Warning integrity: carries warning materiality inputs into a visible
  internal draft section without publishing warnings.
- V2-Q8 Public cutover safety: keeps public V2 fail-closed while allowing
  internal review.
- V2-Q10 Complexity convergence: avoids a new LLM report-prose mechanism until
  internal review proves what prose quality gap remains.

Direct user/report value:

- creates the first human-readable internal Alpha report draft over the HJ7
  evidence/verdict chain.

Cost/latency impact:

- no additional model call, no new provider, no live job until after commit and
  runtime refresh.

## V2 RETIREMENT LEDGER IMPACT

Rows touched:

- V2-RL-004: hidden artifact routes remain temporary and must merge into a
  stable run-ledger/report-inspection design.
- V2-RL-021: HighJump bar-lowering remains temporary until report review
  decides which bars to raise.
- V2-RL-023: new W8-G internal Alpha report draft projection.

Status changes:

- Add V2-RL-023 as `merge`.

New mechanism owner:

- Lead Developer owns W8-G until stable report writer/report-review owner
  absorbs it.

Removal / merge trigger:

- merge into stable report writer after internal report review accepts output
  shape; otherwise quarantine if report review finds the deterministic draft
  misleading or not useful.

Debt accepted:

- bounded process-local hidden artifact route is accepted as temporary
  HighJump evidence machinery.

## Debt-Guard / Risk Mitigation

Balanced risk mitigation decision:

- Named risk: HJ7 produced structured W8-B metadata but no human-readable report
  material for quality review.
- Decision result: add one bounded projection because no existing W8-B default
  projection may expose prose by default.
- Rejected alternatives: public report projection, new report-prose LLM call,
  prompt/schema/model edit, or broad W8-B route widening.
- Owner: Lead Developer.
- Verifier: focused W8-G tests, route/sink tests, boundary guard, V2 gate
  validation, build, and one optional post-commit canary.
- Net-complexity impact: increases by one temporary hidden artifact route/sink
  with a merge trigger.
- Residual risk: process-local hidden route family continues to grow.
- Removal / merge trigger: stable report writer/report-review surface.

Latest debt sensor status:

- `npm run debt:sensors` on 2026-05-22T00:31:25.717Z returned
  `advisory_warn`.
- Salient warnings: V2 source/test size, boundary-guard size, Docs/WIP count,
  net mechanism increases, and consolidation-marker gaps.

## Implementation Delta

Source:

- `boundary-verdict-execution.ts` now preserves a bounded W7-B
  `internalReviewPayload` from validated boundary/verdict output.
- `internal-alpha-report-draft.ts` builds W8-G decisions and deterministic
  internal draft Markdown from the W7-B review payload.
- `evidence-lifecycle-internal-alpha-report-draft-artifact-sink.ts` records
  process-local hidden/admin-only W8-G artifacts with default redaction and
  explicit inspection projection.
- `evidence-lifecycle-internal-alpha-report-draft-artifacts/route.ts` exposes
  an authenticated no-store internal route with default redaction and
  `inspectDraftText=true` inspection.
- `orchestrator.ts` records W8-G after successful W8-B artifact recording
  inside the hidden runtime containment block.

Tests:

- W7-B execution payload retention.
- W8-G draft builder pass/fail-closed cases.
- W8-G sink bounds/redaction/inspection.
- W8-G route auth/no-store/default-redaction/inspection/query validation.
- W8-G product-chain integration.
- Boundary guard exact file/import and containment checks.

## Local Verifier Results

Passed:

```text
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-draft.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-result-artifact-sink.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-draft-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-draft-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator-w8b-product-chain.test.ts test/unit/lib/analyzer-v2/orchestrator-w7c-product-chain.test.ts
# 9 files / 45 tests passed

npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts
# 95 tests passed

npm run validate:v2-gates

node scripts/validate-v2-gate-register.mjs --self-test

npm run debt:sensors
# advisory_warn

npm -w apps/web run build

git diff --check
```

Failed verifier recovery:

- Initial W8-G sink test oversize fixture reached invalid-ledger validation
  first. Compact debt-guard amended the test fixture only.
- Initial build found the inspection projection type inherited
  `draftMarkdownReturned: false` from the default projection while returning
  `true`. Compact debt-guard amended the TypeScript type with `Omit`; runtime
  behavior was unchanged.

## Verifier Plan

Required local verifiers before implementation commit:

```text
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-draft.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-result-artifact-sink.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-draft-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-draft-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator-w8b-product-chain.test.ts test/unit/lib/analyzer-v2/orchestrator-w7c-product-chain.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run debt:sensors
npm -w apps/web run build
git diff --check
git status --short --untracked-files=all
```

Optional post-commit canary:

- one HJ8 live job using Captain input
  `Using hydrogen for cars is more efficient than using electricity`;
- only after focused verifiers pass, source is committed, runtime refreshed,
  runtime commit matches, git status is clean, and authenticated route preflight
  confirms no-store/redaction behavior.

## Pass Criteria

Local pass:

- W7-B retains an internal review payload with W7-B LLM-owned candidate prose.
- W8-G creates exactly one hidden/admin-only internal draft when W8-B/W7-B
  lineage is valid.
- W8-G fails closed on missing payload, parent not-created/not-accepted states,
  lineage mismatch, empty draft, or oversize draft.
- Default admin route is hash/length/provenance-only.
- Explicit inspection route returns draft text only with admin auth and
  `inspectDraftText=true`.
- Boundary guard permits only exact W8-G files/imports and forbids public,
  provider, parser, cache/SR/storage, ACS/direct URL, and V1 paths.

Canary pass:

- hidden chain repeats HJ7 through W8-B;
- W8-G artifact records `internal_alpha_report_draft_created`;
- default W8-G route returns no draft text;
- inspection route returns draft Markdown;
- public V2 remains pre-cutover/damaged with no draft/source/EvidenceItem text
  leak.

## Stop Criteria

Stop and use Steer-Co if:

- W8-G cannot be implemented without prompt/model/config/schema/UCM/gateway
  changes;
- W8-G requires a new LLM call;
- default admin/public/log/error surfaces expose draft/source/EvidenceItem text;
- boundary guard requires wildcard or broad analyzer-v2-runtime import
  allowances;
- local verifiers fail twice with unclear root cause.

Stop for Captain approval if:

- public API/UI/report/export/compatibility projection is proposed;
- live-job budget outside the current authorized HighJump tranche is needed;
- V1 cleanup/removal is proposed.
