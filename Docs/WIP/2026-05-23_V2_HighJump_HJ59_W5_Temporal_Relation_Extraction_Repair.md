# V2 HighJump HJ59 W5 Temporal Relation Extraction Repair

**Status:** implementation/verifier package
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Captain input:** HighJump continues toward useful internal V2 reports; prompt edits and live jobs are approved when naturally needed; current live-job budget is `17` after HJ58.

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
