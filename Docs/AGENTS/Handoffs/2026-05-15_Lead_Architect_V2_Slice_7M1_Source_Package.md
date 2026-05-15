# 2026-05-15 - Lead Architect - V2 Slice 7M-1 Source Package

## Summary

Prepared and reviewed the 7M-1 source approval package:

- `Docs/WIP/2026-05-15_V2_Slice_7M1_Query_Plan_Inspection_Handoff_Source_Package.md`

The package approves only hidden/internal query-plan inspection and a non-executable query-plan-to-source-acquisition handoff after 7L-1. It does not authorize source acquisition execution.

## Review Outcome

Initial review:

- Senior Developer reviewer: `APPROVE`.
- LLM Expert reviewer: `MODIFY`.
- Code Reviewer / gatekeeper: `MODIFY`.

Modifications applied:

- added explicit `QueryPlanInspectionRequest` envelope with `runtimeResult` plus selected AtomicClaim ID snapshot from the same 7L-1 input/readiness envelope;
- forbids selected-ID inference from query target IDs;
- explicitly avoids changing the 7L-1 runtime result shape;
- restricts adapter attempt summaries to status/count/type only;
- forbids raw adapter `failureMessage` retention and provider telemetry copied wholesale;
- adds structural checks for max query count, empty per-entry targets, selected snapshot source/uniqueness, and partial selected-claim coverage;
- adds ACS/direct URL boundary-guard verifier coverage.

Focused re-review:

- Senior Developer reviewer: `APPROVE`.
- LLM Expert reviewer: `APPROVE`.
- Code Reviewer / gatekeeper: `APPROVE`.

## Approved Source Boundary

Allowed:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff.ts`
- focused tests for those modules;
- boundary guard updates.

Narrow existing-file allowance:

- `source-acquisition/types.ts` only if shared handoff types cannot live cleanly in the new module;
- `query-planning/runtime.ts` may export existing types only, with no runtime behavior change.

Blocked:

- provider/search/fetch/parser/network execution;
- Source Reliability import/call;
- cache IO;
- prompt text edits;
- UCM/default JSON changes;
- product/orchestrator/runner wiring;
- public API/UI/report/export/compatibility exposure;
- live jobs/canaries;
- ACS/direct URL execution;
- evidence/source/corpus population;
- applicability/extraction/sufficiency/warning/verdict/report behavior;
- V1 analyzer/prompt/type/code reuse;
- V1 cleanup.

## Verification

Docs-only verification passed:

```powershell
git diff --check
git diff --cached --check
```

No source/test/prompt/config/schema files were edited and no live jobs were run for this package.

## Next Step

Implement 7M-1 exactly under the approved package. If implementation requires changing the 7L-1 runtime result shape, touching forbidden files, adding storage/public/product wiring, source execution, Source Reliability, cache IO, prompt/config edits, live jobs, or V1 work, stop and return to review/Captain.

## Warnings

- Query plans are intent, not evidence.
- Partial selected-claim coverage may be recorded structurally but must not be judged semantically in 7M-1.
- Do not parse query text/rationale to infer target claims or quality.
- Adapter diagnostics must stay redacted unless a later diagnostics gate approves message retention.

## Learnings

- Handoff packages must name every provenance input they rely on. If the upstream runtime result does not carry a required field, the package needs an explicit request envelope rather than implicit inference.
