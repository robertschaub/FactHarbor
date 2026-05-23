# V2 HighJump HJ58 W4-G Bounded Sidecar Prefix Repair

**Status:** implemented, committed, live-verified
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Captain input:** V2 HighJump continues toward complete internal reports; new live-job budget is `18`.

## Observed Defect

HJ57 cleared the W5 extraction contract failure for the hydrogen input, but the Bundesrat-simple rerun stopped upstream:

- job: `b1356da1f72f4f27a6fafb3bc5418746`
- stage: W4-G bounded corpus text authorization
- status: `blocked_pre_bounded_corpus_text_oversized`
- stop reason: `source_material_text_oversized`
- evidence: `9` Source Material records, aggregate text bytes `19216`, no W4-G sidecars, no W4-H packets, W5 blocked before execution.

HJ56 Bolsonaro-PT also exposed the same W4-G stop. This is now a repeated report-path blocker.

## Decision

Amend the existing W4-G aggregate-cap mechanism in place. Keep the current aggregate cap at `16_384` bytes and admit a deterministic upstream-order prefix of already validated W3-B Source Material sidecars that fits the cap.

This lowers the premature all-or-nothing bar without raising caps, adding providers, changing extraction semantics, or introducing a parallel source path.

## Scope

Allowed:

- W4-G bounded corpus text authorization source file.
- Focused W4-G tests.
- Minimal status/package/ledger documentation.
- One post-commit live canary on the Captain-defined Bundesrat-simple input if verifiers pass and runtime provenance is clean.

Closed:

- no source/provider/parser/cache/SR/storage widening;
- no public/default report, verdict, truth, confidence, or source text exposure;
- no prompt/model/config/schema edit;
- no retries or fallback provider behavior;
- no ACS/direct URL or V1 work.

## V2 Scorecard Impact

Improves internal report reachability by allowing W4-G to pass useful bounded source material to W4-H/W5 when the full source-material fan-in is too large. This directly targets a repeated stop that prevents report generation.

## V2 Retirement Ledger Impact

No new permanent hidden mechanism. The old all-or-nothing aggregate failure path is narrowed: W4-G now uses the same cap as an admission budget rather than a whole-stage blocker. The oversized failure remains only for the case where no single sidecar can fit.

## V2 Consolidation Gate

Net complexity is intended to stay roughly unchanged:

- no new route;
- no new artifact family;
- no new approval gate;
- no new source acquisition behavior;
- one small selector helper inside the existing W4-G owner.

The repair must remain structural and upstream-order based. It must not rank source material semantically.

## Debt-Guard

Classification: `incomplete-existing-mechanism`
Chosen option: amend existing W4-G aggregate-cap logic.
Rejected path: raise the aggregate cap again. HJ16 already raised it once, and another cap increase would make the artifact larger without removing the all-or-nothing failure pattern.
Rejected path: semantic source selection. That would require LLM-owned ranking or source-quality logic and is outside this structural repair.
Net mechanism count: unchanged.

## Pass Criteria

Local:

- W4-G creates a bounded prefix when full fan-in exceeds the aggregate cap.
- The selected aggregate text bytes are `<= 16_384`.
- The selected sidecars preserve upstream record order and lineage hashes.
- W4-H/extraction-input and boundary guard tests remain green.
- `validate:v2-gates`, `debt:sensors`, build, index, and diff checks pass.

Live canary:

- runtime source matches committed HJ58 repair;
- manual/default V2 path remains `claimboundary-v2`;
- public/default containment remains `4.0.0-cb-precutover`, `blocked_precutover`, `report_damaged`, no public/default report markdown, verdict, truth, confidence, prompt, source text, or hidden ids;
- the Bundesrat-simple input no longer stops at W4-G `source_material_text_oversized`;
- W4-G sidecar count is `> 0` and bounded by the aggregate cap;
- if a later stage stops, record the new stop and do not stack another repair without evidence.

## Stop Criteria

Stop and reconvene Steer-Co if:

- the repair requires cap increase, source/provider widening, semantic ranking, prompt/model/config/schema edits, public behavior, or V1 work;
- local verifiers fail with unclear root cause;
- live validation repeats the same W4-G stop without useful new evidence;
- public/default route leaks hidden source/report/prompt/verdict/truth/confidence data.

## Local Verification

Implementation commit:

`b4c9de14a557d280254ff940626ef3987b448236 fix(v2): admit bounded w4g sidecar prefix`

Verifier results:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/bounded-text-authorization.test.ts` passed (`7` tests).
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-owner.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` passed (`3` files / `107` tests).
- `npm run validate:v2-gates` passed.
- `npm run debt:sensors` returned advisory warnings only for known V2 footprint, boundary-guard, docs, and consolidation signals.
- `npm -w apps/web run build` passed.
- `npm run index` passed.
- `git diff --check` and `git diff --cached --check` passed.

Debt-guard result: keep. The repair amends the existing W4-G aggregate-cap mechanism and adds no new route, artifact family, provider, parser, retry, cache/SR/storage, public surface, prompt/model/config/schema behavior, or V1 path.

## Live Validation Result

Evidence file:

`Docs/WIP/canary-evidence-hj58-w4g-bounded-prefix-repair.json`

Runtime/source provenance:

- committed implementation: `b4c9de14a557d280254ff940626ef3987b448236`;
- runtime Web/API/proxy version endpoints reported `b4c9de14a557d280254ff940626ef3987b448236`;
- git status was clean before submission.

Live job:

- job: `b6ac7b2a8ad646c0897cce8cddd8e37c`;
- input: `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`;
- pipeline variant: `claimboundary-v2`;
- status: `SUCCEEDED`.

Result:

- classification: `PASS_X7_HJ58_W4G_BOUNDED_PREFIX_REPAIR_VERIFIED_INTERNAL_REPORT_PRODUCED`;
- information yield: `report_produced`;
- the previous W4-G `source_material_text_oversized` stop did not recur;
- W5 received `8` source-content packets through a W4-H parent packet of `14176` bytes, within the `16384` byte aggregate cap;
- W5 extracted `4` EvidenceItems;
- internal report writer produced an authenticated admin-only report draft (`5728` hidden artifact bytes, `5721` authenticated job markdown characters).

Containment:

- public/default fetch stayed `4.0.0-cb-precutover` and `blocked_precutover`;
- public/default report markdown, verdict, truth percentage, and confidence remained absent;
- unauthenticated internal report-writer artifact route returned `401`;
- authenticated/default hidden artifact routes are process-local and later returned `404` after runtime movement, so the durable closeout records the immediate artifact inspection summary and the authenticated job record.

Budget:

- Captain reset live-job budget to `18` before HJ58;
- HJ58 consumed `1` successful job;
- `17` remain.

## Next Direction

Do not add another reachability/proof layer from HJ58. The repair reached an internal report on the previously blocked Bundesrat-simple input. The next HighJump step should inspect report quality across the successful internal Alpha reports and choose one concrete quality bar to raise from observed report defects.
