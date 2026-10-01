# Model-comparison diagnostic tools

The stored pilot controls and outcomes are historical. **No run, replacement observation, model promotion, configuration activation or service restart is authorized by this directory.** Do not reuse completed/stopped output paths or prior budgets. Current restrictions are in [Backlog](../../../Docs/STATUS/Backlog.md#holds-and-required-decisions).

## Offline checks

```powershell
node --test scripts/diag/verdict-stability-batch.test.mjs
node --test scripts/diag/live-ab-arm-report.test.mjs
npm -w apps/web test -- test/unit/lib/analyzer/model-policy.test.ts
node --check scripts/diag/verdict-stability-batch.cjs
node --check scripts/diag/live-ab-arm-report.cjs
```

Inspect commands for their state/output scope before using them in a restricted assignment. A manifest or frozen control is evidence of a particular approved execution, not a reusable authorization.

## Before a future comparison

Require a fresh reviewed plan and explicit GO covering exact Captain-approved input wording, model/configuration choices, bounded output paths, budget, continuation/stop conditions, restoration and evidence retention. Commit the reviewed source first. Freeze source/control/configuration hashes and verify the running revision and active pointers separately; a checkout hash alone is not runtime proof.

The existing runner supports plan-only and preflight-only modes. Read `scripts/diag/verdict-stability-batch.cjs` for its current arguments. Generating a manifest writes state; activation, setup and `--run` require their own authorization. Reject an existing arm output, unexplained job-count change, unresolved cost ceiling, missing decisive capture or mismatched prompt/config provenance. Do not replace a failed assigned-arm outcome.

Keep comparator-bearing submissions isolated. Cache carryover and any inter-arm restart must follow the reviewed comparison design and be recorded. Before restoration, establish terminal status and pipeline exit; preserve the authorized baseline, exact active hashes and evidence. None of these instructions authorizes changing the currently running services.

## Reporting and limits

`scripts/diag/live-ab-arm-report.cjs` reads saved evidence and can write an assigned report or blinded packet. Keep raw job evidence and output destinations within the task's access scope. Distinguish expected, job and result prompt hashes, missing records, measured cost, known partial cost and unresolved total. A historical allowance for an explicit synthetic lost-evaluation marker is not a provider invoice or a blanket price for unknown physical calls.

A long duration is a timeout proxy; confirm a Headers Timeout from its error marker. Separate retries and fallback events where their records overlap or are missing. Distinguish transport/schema failure, semantic failure and unavailable evidence; neither a schema pass nor a damaged report alone establishes general model intelligence or superiority.

The entity-null correction is complete; evidence-applicability capture is unimplemented and must start offline/default-off if separately assigned. C14, semantic-design and source-reliability eligibility/cap holds remain unchanged. Do not repair historical records or infer missing telemetry.
