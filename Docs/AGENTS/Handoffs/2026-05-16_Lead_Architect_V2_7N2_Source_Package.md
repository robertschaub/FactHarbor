# Lead Architect Handoff: V2 7N-2 Source Package

## Summary

Prepared and reviewed the V2 7N-2 source package:

- `Docs/WIP/2026-05-16_V2_Slice_7N2_Source_Acquisition_Structural_Executor_Source_Package.md`

The package approves only an Analyzer V2 structural source-acquisition executor with fake/test/controlled-harness injected ports. It does not authorize production/runtime provider/search/fetch/parser/network behavior or any public/product/live-job path.

## Review Outcome

Initial review:

- Code reviewer/gatekeeper: `MODIFY`.
- LLM/pipeline architect reviewer: `MODIFY`.
- Source-acquisition/runtime boundary reviewer: `MODIFY`.

Modifications applied:

- 7H structural outcome labels stay exact; timeout, cancellation, retry exhaustion, and partial execution are executor stop/reason fields.
- 7C `SourceAcquisitionStartDecision` / `SourceAcquisitionRequest` reuse is mandatory.
- Controlled-harness authority is a closed literal object with explicit negative capability flags.
- Budget staleness uses a handoff identity/hash or frozen handoff snapshot; `maxAttemptsPerQuery` must be exactly `1`.
- `structural-executor.test.ts` is explicitly allowed.
- Opaque output bans include URLs, domains, source names, source records, dereference locators, provider rank, and language-derived labels.
- Source-language policy, supplementary-lane rationale, and retrieval-policy keys are opaque upstream provenance/pass-through only.

Focused re-review:

- Code reviewer/gatekeeper: `APPROVE`.
- LLM/pipeline architect reviewer: `APPROVE`.
- Source-acquisition/runtime boundary reviewer: `APPROVE`.

## Approved Source Boundary

Allowed production files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/execution-contract.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor.ts`

Allowed test files:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Blocked:

- source-acquisition-port edits;
- production/runtime concrete provider/search/fetch/parser/network behavior;
- provider SDK imports;
- analyzer-v2-runtime factories;
- product/orchestrator/runner wiring;
- public API/UI/report/export/compatibility exposure;
- live jobs/canaries;
- cache IO or durable storage;
- Source Reliability import/call;
- prompt/config/model/schema edits;
- ACS/direct URL execution;
- semantic relevance/applicability/extraction/probative-value/sufficiency/warning/verdict/report behavior;
- V1 analyzer/prompt/type/code reuse;
- V1 cleanup.

## Next Step

Implement 7N-2 exactly under the approved package. If implementation pressure reaches concrete provider IO, production/runtime ports, product wiring, public exposure, cache, SR, prompt/config/schema changes, ACS/direct URL, or V1 work, stop and return to review.

## Verification For Implementation

Required:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
git diff --check
git diff --cached --check
```

No expensive tests or live jobs are approved by this package.

## Warnings

- 7N-2 is controlled-harness structural execution only, not production source execution.
- `success` means acquisition-status-only, not relevance, quality, sufficiency, warning, verdict, confidence, or report authority.
- Avoiding direct SDK imports is not sufficient to run source IO; concrete provider wiring requires 7N-3.
- `Docs/AGENTS/Agent_Outputs.md` already had an unrelated local modification and was left untouched.

## Learnings

- Source execution gates must distinguish approved structural outcome labels from executor stop reasons.
- Contract reuse must be explicit when multiple inert handoffs already exist; otherwise new slices can accidentally create parallel lifecycle state.
