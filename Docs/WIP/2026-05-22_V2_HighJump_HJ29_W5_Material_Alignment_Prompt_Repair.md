# V2 HighJump HJ29 - W5 Material-Alignment Prompt Repair

**Status:** validated by live job; stopped at W5 no-extractable evidence; follow-up HJ30 rebalance in progress
**Date:** 2026-05-22
**Owner:** Captain Deputy / Lead Developer
**Authority:** Captain HighJump direction, explicit prompt-edit/live-job authorization, and fresh `18` job tranche after HJ27

## Evidence

HJ28 (`327edd966a904108b8bc51f05ec64b42`) ran the default manual V2 path for the Captain-defined Bolsonaro/fair-trial input on runtime `aa931443bad0d80072ef2f35475b0b41e715faa6`.

The Serper distribution repair worked as intended at the source-material breadth level and the internal report writer produced `10172` report bytes. The remaining report-quality defect moved downstream:

- W5 accepted evidence that was generic or adjacent to the claim target rather than materially aligned with the selected legal-proceedings/fair-trial claim.
- The resulting report remained `UNVERIFIED` and materially below the Captain expectation for this input.
- Examples observed in the report were an environmental-governance/political-strategy item and a generic democratic-institutions framework item crowding out case-specific fair-trial/procedural material.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`

Chosen option: amend the existing W5 `V2_EVIDENCE_EXTRACTION` prompt contract.

Rejected paths:

- Add more provider/fetch/parser machinery: source-material breadth improved and the current defect is extraction selectivity, not proven fetch reachability.
- Add deterministic filtering: AGENTS.md forbids deterministic semantic text-analysis decisions; material relevance must stay LLM-owned.
- Raise/lower schemas or add retries: the output is structurally valid but analytically weak, so schema/retry changes do not target the root cause.

Net mechanism count: unchanged. This is a prompt-only repair to an existing task contract.

## Implementation

Changed:

- `apps/web/prompts/claimboundary-v2.prompt.md`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`

Behavior:

- Keeps the HighJump bar low enough to extract partial, indirect, low-confidence, or limited evidence when it is materially aligned.
- Adds a material-alignment guard so W5 does not extract a point merely because it names the claim actor, appears in the same broad domain, states a generic standard, describes unrelated conduct, or supplies background context.
- Clarifies that source-material kind or fetch depth must not override material alignment: a direct preview can be more useful than an abstract that addresses only adjacent/background material.
- Allows generic framework evidence only when the supplied content links it to the selected claim target or it is a clearly necessary standard reference that does not crowd out case-specific items.
- Keeps `no_extractable_evidence` available when only generic, adjacent-domain, or unrelated background would not help a downstream verifier.

## Verification

Passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle`
- `npm run validate:v2-gates`
- `npm run debt:sensors` (`advisory_warn`, known V2 source/test/docs/boundary-guard footprint warnings)
- `npm -w apps/web run build`

Failed-attempt recovery:

- First focused prompt-contract run failed because the test still asserted the old exact wording containing `partial, contextual, indirect...`.
- Classification: `keep`; the prompt repair stayed justified by HJ28 evidence and the test was amended to assert the new material-alignment contract instead of restoring weaker wording.

## Live Validation Result

Live validation was run after commit `0b5a5e73b062f1d6aa6aa958bd16c468a56d1a65`
and runtime refresh.

Result:

- Job: `323c5fd3540e43aab9c7c6e686ec4de4`
- Pipeline: default manual V2 path stored and ran `claimboundary-v2`
- Runtime commit: `0b5a5e73b062f1d6aa6aa958bd16c468a56d1a65`
- Classification:
  `STOP_X7_HJ29_BOLSONARO_W5_NO_EXTRACTABLE_EVIDENCE_AFTER_MATERIAL_ALIGNMENT`
- Hidden chain: Claim Understanding, Query Planning, Source Acquisition, Source
  Material, and W5 all executed. W5 saw 9 source content packets and 4971
  parent-packet bytes.
- W5 result: accepted `no_extractable_evidence`, `evidenceItemCount: 0`; no
  internal report writer artifact was created.
- Public/default containment: held. Public V2 stayed
  `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`.

Interpretation:

HJ29 successfully removed the HJ28 adjacent/generic extraction defect, but the
material-alignment rule overshot and made W5 too strict for bounded
preview/abstract material. The next repair should amend the same W5 prompt
contract so weak but materially tied source-attributed points can become
limited/contextual/unclear EvidenceItems instead of stopping the report path.
Do not add provider/fetch/parser/retry/schema/public/V1 machinery for this
symptom.

Follow-up validation belongs to HJ30. The HJ30 pass signal is not "any
evidence"; it is evidence that stays materially tied to the selected claim
target while preserving the report path. The HJ30 stop signal is either a repeat
of HJ28-style adjacent/generic crowd-out or a repeat of HJ29-style empty W5
output without useful new information.
