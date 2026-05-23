# V2 HighJump HJ57 - W5 Extraction Contract Repair

**Status:** live validation complete; docs closeout in progress
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Preceded by:** HJ56 full internal-report gauntlet

## Why This Slice Exists

HJ56 showed broad internal-report reachability, but W5 is now the repeated
quality bottleneck:

- `bundesrat-simple` reached W5 with 9 source-content packets and failed
  `task_contract_validation_failed` / `approved_packet_mismatch`.
- `hydrogen-en` reached W5 with strong candidate/source breadth and failed
  `schema_validation_failed` with `evidenceItems` too big.
- Successful reports still carried only `2` to `4` EvidenceItems, below strong
  comparator breadth.

The next balanced repair is to amend the existing W5 prompt contract so the
model uses exact structural source packet references, stays inside the existing
five-item output cap, and uses more of the available item budget when distinct
material points exist.

## Scope

Allowed:

- amend only `V2_EVIDENCE_EXTRACTION` in
  `apps/web/prompts/claimboundary-v2.prompt.md`;
- strengthen the existing Evidence Lifecycle prompt-contract test;
- import and activate the updated `claimboundary-v2` prompt profile through
  UCM after commit;
- run up to two focused live reruns after verifier-clean commit and runtime
  refresh:
  - `Using hydrogen for cars is more efficient than using electricity`
  - `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`

Closed:

- schema relaxation;
- code-side deterministic semantic extraction;
- retries or repair loops;
- source/provider/parser expansion;
- report-writer, boundary/verdict, sufficiency, cache/SR/storage, ACS/direct
  URL, public/default behavior, UI/API/export/compatibility behavior, V1 work,
  or V1 cleanup.

## V2 Scorecard Impact

Positive:

- V2-Q1 usable report path: repairs two HJ56 report stops.
- V2-Q4 evidence usefulness: improves the EvidenceItem packet supplied to
  sufficiency and verdict stages.
- V2-Q6 report quality: raises evidence breadth before report roll-up changes.

## V2 Retirement Ledger Impact

No new mechanism. This amends an existing prompt section and test, reducing the
need for future W5 diagnostics or downstream compensating logic.

## V2 Consolidation Gate

Allowed because the slice changes one existing prompt section and one existing
test. It does not add hidden artifacts, routes, guards, providers, schemas, or
parallel execution paths.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`.

Chosen option: amend the existing W5 prompt contract.

Rejected paths:

- schema relaxation, because the live failures are provider-output contract
  violations that the prompt should avoid;
- retries/repairs, because the better fix is to prevent invalid output;
- provider/source expansion, because HJ56 had adequate source-content packets
  for the failing hydrogen and Bundesrat-simple cases;
- report-writer changes, because missing/invalid EvidenceItems are upstream.

Net mechanisms: unchanged.

## Verification Plan

Before live jobs:

- focused Evidence Lifecycle prompt-contract test;
- focused W5 bounded extraction tests;
- `npm run validate:v2-gates`;
- `npm run debt:sensors`;
- `npm -w apps/web run build`;
- `npm run index`;
- `git diff --check`;
- commit;
- import/activate the prompt in UCM with a new version label;
- refresh runtime and verify Web/API/proxy commit match;
- verify active `claimboundary-v2` prompt hash changed.

Current local verifier status before commit:

- focused Evidence Lifecycle prompt-contract and bounded extraction tests passed
  (`2` files / `17` tests);
- `npm run validate:v2-gates` passed;
- `npm run debt:sensors` returned advisory warnings only for known V2 footprint,
  boundary-guard/docs footprint, debt telemetry, and consolidation markers;
- `npm -w apps/web run build` passed after clearing stale generated `.next`
  output;
- `npm run index` passed;
- `git diff --check` passed.

Live validation:

- run exactly the two focused reruns above, sequentially;
- pass if both stay on V2, public/default containment holds, and hydrogen no
  longer fails W5 schema validation while Bundesrat-simple no longer fails W5
  approved-packet task-contract validation;
- if W5 still fails with the same diagnostics, stop and classify the prompt
  repair as insufficient;
- if W5 passes but report quality remains weak, document the next concrete
  report-quality bar instead of stacking another W5 prompt tweak.

## Live Validation Result

Runtime and UCM state:

- implementation commit: `f4c3357b090445b0b1f93eba1070e3a1432e54a6`;
- runtime/docs sync commit under test:
  `44154ac093a323a6c8e83dffca6a6e2493d856f1`;
- active `claimboundary-v2` prompt label:
  `hj57-w5-extraction-contract-repair`;
- active prompt hash:
  `5a00717b8deb9a7c38f679cac4ee99414cc07b842f0837719bb86b904f810413`;
- default pipeline: `claimboundary-v2`;
- public/default containment held for both jobs.

Jobs:

- `837c65bedaf94fb8bd0e91a65e607963` ran
  `Using hydrogen for cars is more efficient than using electricity`.
  The HJ56 W5 `schema_validation_failed` / `evidenceItems too_big` stop was
  cleared. W5 completed with `4` admitted EvidenceItems, sufficiency completed,
  internal Alpha result first incomplete stage was `none`, and the internal
  report writer produced a `6130` byte authenticated admin-only internal report.
- `b1356da1f72f4f27a6fafb3bc5418746` ran
  `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`.
  The prior HJ56 W5 `approved_packet_mismatch` was not reproduced, but the run
  also did not reach W5 execution. It stopped upstream with W4-G
  `source_material_text_oversized`: `9` Source Material records,
  aggregate source-material text byte length `19216`, `0` W4-G sidecars,
  `0` W4-H packets, W5 `blocked_pre_execution`, and EvidenceItems `0`.

Classification:

`PARTIAL_PASS_X7_HJ57_W5_CONTRACT_REPAIR_HYDROGEN_VERIFIED_BUNDESRAT_BLOCKED_UPSTREAM_W4G_OVERSIZED`

Information yield:

- hydrogen: `report_produced`; the prompt repair prevented the observed W5
  oversized-output schema failure and improved EvidenceItem breadth from the
  failing HJ56 state to `4` admitted EvidenceItems;
- Bundesrat-simple: `new_failure_or_upstream_stop_with_useful_evidence`; the
  run identifies W4-G oversized Source Material as the next blocker for this
  input, so spending another HJ57 rerun would be low-yield until W4-G handling
  is addressed.

Budget:

- fresh tranche reset: `18`;
- HJ57 consumed: `2`;
- remaining after HJ57: `16`.

Next:

Do not stack another W5 prompt tweak from this result. The next concrete
HighJump bar is the recurring W4-G oversized Source Material blocker, now seen
in HJ56 Bolsonaro-PT and HJ57 Bundesrat-simple, while preserving source-text
containment and public/default precutover blocking.
