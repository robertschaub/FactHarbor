# Multilingual and cross-language neutrality

Cross-language verdict divergence remains an open quality issue (`NEUTRALITY-1`). Uniform instructions and successful parsing do not establish equivalent evidence coverage or outcomes.

A March 2026 comparison recorded DE 33%, EN 72% and FR 13% for the plastic-recycling family. Those displayed values span **59 percentage points**; the historical summary labelled the spread 58 points. Preserve that discrepancy when citing the record. These are dated observations, not a current rerun or authorized substitute inputs.

## Language contract

Preserve original-language input and source-authored evidence. Report-authored prose follows the recorded report language. Do not infer a claim's jurisdiction from the language of its text. Semantic interpretation and retrieval-language choices must use language-model intelligence under root AGENTS.md, not language-specific keyword rules.

The result's `languageIntent` and `searchQueries[].languageLane` record language behavior. Inspect those fields instead of inferring retrieval behavior from the report's visible language. Current types and configuration are public under `apps/web/src/lib/`.

## Current capability

The EN supplementary retrieval lane is implemented but experimental and **default-off**. It is intended for evidence coverage under scarcity, never as a proxy for balancing verdict direction. The source-native lane has a default-off scaffold; its planner is unimplemented. A recorded no-op does not establish working retrieval.

Code defaults are not effective runtime values. Verify the active UCM search configuration before reasoning about a report or conducting an authorized comparison.

## 5. Validation state and promotion gate

This gate is a requirement for a future authorized comparison, not permission to enable a lane or submit jobs. Use only Captain-approved exact inputs and the applicable budget/stop rules. Keep baseline and candidate otherwise comparable, including configuration, execution provenance and cache conditions.

Record input/report language, lane activation, queries/results/evidence by lane, verdict direction, truth percentage and confidence. Check source-language preservation and report-language purity.

Do not promote beyond default-off unless:

- Report-language purity holds or improves.
- Source-authored evidence remains in its original language.
- EN retrieval activates only under its intended scarcity conditions.
- No case has an unexplained direction/confidence regression.
- No case indicates the lane is acting as a balancing proxy.

There is no current automated cross-language divergence test, and the removed question/statement suite was not a working neutrality check. New exact question/statement pairs require Captain approval (`NEUTRALITY-PAIRS`). Framing-symmetry calibration measures a different property; a symmetry pass is not proof of correctness.

See [quality expectations](../AGENTS/Captain_Quality_Expectations.md), [calibration policy](../../apps/web/test/README.md#calibration-contract) and [current holds](../../CONTRIBUTING.md#project-state-and-change-authority).
