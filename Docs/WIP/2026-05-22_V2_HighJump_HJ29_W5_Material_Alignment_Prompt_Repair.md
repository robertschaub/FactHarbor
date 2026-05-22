# V2 HighJump HJ29 - W5 Material-Alignment Prompt Repair

**Status:** locally implemented, verifier-clean, pending commit/runtime refresh/live validation
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

## Next Validation

After commit and runtime refresh, run one default manual V2 validation on the Captain-defined Bolsonaro/fair-trial input.

Pass signal:

- W5 extracts materially target-specific legal/procedural/fair-trial evidence rather than adjacent/generic context.
- Internal report writer produces an admin-visible V2 report.
- Public/default containment remains `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged` with no hidden text/status leak.

Stop signal:

- The same adjacent/generic evidence crowd-out repeats without useful new information.
- The run requires provider/fetch/parser expansion, schema relaxation, retries, public behavior, cache/SR/storage, ACS/direct URL, V1 work, or another hidden mechanism to proceed.
- Runtime/source provenance is stale or public/default surfaces leak hidden text or hidden statuses.
