# V2 HighJump HJ59 W5 Temporal Relation Extraction Repair

**Status:** closed as live-validated PASS
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Captain input:** HighJump continues toward useful internal V2 reports; prompt edits and live jobs are approved when naturally needed; current live-job budget is reset to `18` after HJ57. HJ58 and HJ59 consumed one job each; `16` remain after this closeout.

## Observed Defect

HJ58 cleared the W4-G oversized Source Material blocker and produced an internal report for the Bundesrat-simple input:

- job: `b6ac7b2a8ad646c0897cce8cddd8e37c`;
- report path: W5 extracted `4` EvidenceItems and the internal report writer produced an authenticated admin-only draft;
- quality result: the internal report remained `UNVERIFIED` rather than the expected `TRUE` / `MOSTLY-TRUE` high-true chronology shape.

The report text shows the pipeline had some relevant timeline material, including signature/approval/submission events, but it treated missing final decision dates and procedural ambiguity as unverifiability. The benchmark expectation for `bundesrat-simple` is high-true because the literal chronology can be supported by source-attributed signature timing plus evidence that the compared parliamentary/popular decisions were later or still pending.

## Steer-Co Direction

Reduced-quorum Steer-Co review converged on W5 EvidenceItem extraction as the next lowest-complexity bar:

- Query Planning produced `5` German queries.
- W4-G/W4-H delivered `8` bounded source-content packets.
- W5 executed and produced only `4` EvidenceItems.
- The internal report writer mostly carried the weak upstream evidence and verdict candidate.

The next repair should improve generic extraction of temporal/procedural relation evidence before another reachability layer is added.

An attempted Opus 4.6 challenge call timed out. Because the remaining proposal is bounded, reversible, prompt-only, and supported by two independent reviewer findings, Captain Deputy proceeds with reduced quorum.

## Decision

Amend the existing `V2_EVIDENCE_EXTRACTION` prompt section in place. Add generic guidance for temporal/procedural relation claims so W5 extracts distinct relation components when supplied source content states them:

- date/status of the first event;
- date/status of the compared decision or milestone;
- evidence that the compared milestone happened after the first event;
- evidence that the compared milestone was still pending, not yet held, not yet submitted, not yet finalized, or otherwise not completed at the relevant time;
- source-attributed distinctions between preliminary, institutional, formal, final, or procedural stages when those distinctions affect the relation.

This is an LLM-owned extraction guidance repair. It does not decide verdicts, force a chronology outcome, or hardcode any domain.

## Scope

Allowed:

- `apps/web/prompts/claimboundary-v2.prompt.md` section `V2_EVIDENCE_EXTRACTION`;
- focused prompt-contract test updates;
- minimal status/package/ledger/documentation;
- UCM import/activation after commit;
- one post-commit live rerun of the same Captain-defined Bundesrat-simple input if verifiers pass and runtime provenance is clean.

Closed:

- no code-side deterministic semantic rule;
- no schema relaxation;
- no model/provider/parser/cache/SR/storage widening;
- no retries or repair loop;
- no public/default report, verdict, truth, confidence, or source text exposure;
- no report-writer verdict rewriting;
- no ACS/direct URL or V1 work.

## V2 Scorecard Impact

Improves report value by targeting a concrete report-quality defect after report reachability is achieved: V2 must preserve enough relation evidence for useful internal verdict work rather than reaching a report that collapses to `UNVERIFIED`.

## V2 Retirement Ledger Impact

No new hidden mechanism. The repair raises the quality of the existing W5 prompt contract and reduces pressure to add downstream compensating logic in sufficiency, boundary/verdict, or report writer.

## V2 Consolidation Gate

Net mechanism count remains unchanged:

- no new route;
- no new artifact;
- no new source path;
- no new code branch;
- one prompt-section amendment and one test assertion update.

## Debt-Guard

Classification: `incomplete-existing-mechanism`
Chosen option: amend existing W5 extraction prompt.
Rejected path: report-writer or verdict post-hoc correction; that would compensate downstream instead of giving sufficiency/verdict stages better EvidenceItems.
Rejected path: source/provider widening; HJ58 already supplied `8` source-content packets and reached W5, so W5 quality should be tested first.
Net mechanism count: unchanged.

## Pass Criteria

Local:

- Prompt-contract test confirms the new temporal/procedural relation guidance is present.
- Existing W5 extraction runtime tests remain green.
- `validate:v2-gates`, `debt:sensors`, build, index, and diff checks pass.
- UCM active `claimboundary-v2` prompt hash matches the updated prompt after import/activation.

Live:

- runtime source matches committed HJ59 repair;
- manual/default V2 path remains `claimboundary-v2`;
- public/default containment remains `4.0.0-cb-precutover`, `blocked_precutover`, no public/default report markdown, verdict, truth, confidence, prompt, source text, or hidden ids;
- W5 produces EvidenceItems that include source-attributed temporal/procedural relation components rather than only a weak generic timeline;
- internal report quality moves materially toward the benchmark expectation or exposes the next owning stage with useful evidence.

## Stop Criteria

Stop and reconvene Steer-Co if:

- local verifiers fail with unclear root cause;
- the repair would require domain terms, deterministic semantic code, schema/model/config changes, source/provider widening, report-writer verdict forcing, public behavior, or V1 work;
- the live rerun still produces the same `UNVERIFIED` shape with no new useful evidence, which would indicate Source Material or downstream sufficiency/verdict ownership rather than W5 prompt ownership;
- public/default route leaks hidden source/report/prompt/verdict/truth/confidence data.

## Local Verification

Pre-live verifier set passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.test.ts`
- `npm run validate:v2-gates`
- `npm run debt:sensors` (`advisory_warn` only for known V2 footprint/docs/consolidation signals)
- `npm -w apps/web run build`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `npm run index`
- `git diff --check`

The prompt was imported and activated in UCM as `hj59-w5-temporal-relation-extraction` with content hash `8e50a65fe61c1961d3d0e6e5eb7dc0b9075e870a5ffe64e688c08ba6aff1bf20`. Runtime was refreshed and Web/API/proxy version endpoints reported `e5654ea78f683e675d28b481ed1dfbd3d85bd48a` before submission.

## Live Validation

HJ59 job `769142306fab4af0ae46130bd5dcdda2` ran the exact Captain-defined input:

`Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`

The job stayed on `claimboundary-v2`, finished `SUCCEEDED`, and used runtime commit `e5654ea78f683e675d28b481ed1dfbd3d85bd48a`.

Public/default containment held:

- schema `4.0.0-cb-precutover`;
- cutover `blocked_precutover`;
- `analysisIssueCode` `report_damaged`;
- public/default report markdown absent;
- public/default verdict, truth percentage, and confidence absent;
- unauthenticated hidden route access returned `401`.

Authenticated admin-only report output improved materially from HJ58:

- report markdown length: `4368`;
- headline: `Internal Alpha Review: Temporal Inversion in EU Treaty Executive Action and Parliamentary Decision`;
- internal Alpha verdict: `TRUE`;
- truth percentage: `88`;
- confidence: `85`.

This is inside the current `bundesrat-simple` benchmark band (`TRUE` / `MOSTLY-TRUE`, truth `85..100`, confidence `75..95`). It is not final release-quality evidence by itself: the report still needs human report-quality review for exact procedural wording and source fit, but HJ59 proves that the W5 temporal/procedural relation repair moved the internal report from the HJ58 weak/UNVERIFIED shape to a true-side report with usable confidence.

Classification:

`PASS_X7_HJ59_W5_TEMPORAL_RELATION_REPAIR_INTERNAL_TRUE_BAND_PRODUCED`

Information yield:

`report_quality_improved`

## Next Direction

Do not stack another Bundesrat-only prompt edit. The next HighJump step should use stronger validation across selected Captain-defined inputs, then choose the next quality bar from observed report defects. HJ59 makes single-input progress credible, but cross-input robustness and report-quality review are now more valuable than another one-job reachability canary.
