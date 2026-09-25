# Two-job model-upgrade follow-up

Status: **Follow-up v2 completed** at `78927246a42f99c3e8065abfc2ef32724b9701ba`: A returned MIXED 55/50; B returned a damaged report before main research. Both postflights passed. Additional recorded cost: **$2.540906**. Baseline configuration and concurrency 2 are restored. See the [results and review](../../../Docs/WIP/2026-09-22_Model_Configuration_Upgrade_Investigation.md#completed-follow-up-pair-2026-09-24). Retain Sonnet 4.6; this smoke comparison supports no promotion.

The [authorized offline corrections](../../../Docs/WIP/2026-09-22_Model_Configuration_Upgrade_Investigation.md#offline-observability-and-restart-corrections-2026-09-24) add final capture/attribution, schema-failure excerpts and shared API/web startup ownership/error checks with retained logs. The corrected caller invocation passed an authorized real restart at `6b3a5018a`: exit 0, both new listener owners verified, healthy HTTP responses and unchanged hashes/job count. The [review and live verification](../../../Docs/WIP/2026-09-22_Model_Configuration_Upgrade_Investigation.md#offline-invocation-diagnosis-and-c14-decision-2026-09-24) also record Captain’s decision to retain current C14 eligibility. No further analysis run is authorized.

The subsequent [thinking-policy screen](../../../Docs/WIP/2026-09-22_Model_Configuration_Upgrade_Investigation.md#bounded-stage-screen-results-2026-09-25) **stopped after four calls at $0.105822** on frozen `277d0fbe9`, following Claude preflight GO and Captain's execution confirmation. Each Sonnet 5 arm (disabled/adaptive-medium) had one schema failure in two attempts. The German disabled output passed schema but failed semantic review by recommending claim-level retries while approving the set. Calls 5–8 were not run; no replacements. Artifacts and the permanent stop marker are under `test-output/model-upgrade-pilot/followup-20260925/stage-screen/`. Retain Sonnet 4.6; next recommendation is offline analysis of that contradiction. This screen and the full-pipeline controls below are historical, not reusable execution authority.

The protocol below preserves the completed execution design. Its outputs and frozen controls are historical and must not be reused for another submission. Any future run requires a fresh reviewed plan, freeze and Captain GO; this file grants no restart, activation or spending authority.

The first pilot completed at `7b3799cc`: A missed its band; B returned a damaged report and failed prompt-provenance postflight. Recorded spend was $3.2555616; baseline and concurrency 2 were restored. Its [results](../../../Docs/WIP/2026-09-22_Model_Configuration_Upgrade_Investigation.md#completed-two-job-smoke-pilot-2026-09-24) and frozen artifacts under `test-output/model-upgrade-pilot/execution-20260924/` remain historical. V2 uses fresh output paths and cannot replace either observation.

The [offline follow-up](../../../Docs/WIP/2026-09-22_Model_Configuration_Upgrade_Investigation.md#offline-correction-and-failure-diagnosis-2026-09-24) fixes prompt-hash propagation on terminal results and adds independent expected/job/result-hash flags to the report. The subsequent [three offline fixes](../../../Docs/WIP/2026-09-22_Model_Configuration_Upgrade_Investigation.md#three-offline-fixes-2026-09-24) add SR translation hygiene, admin-only Stage 1 capture and a narrow completion gate. They do not repair historical jobs or establish a model-quality gain. Frozen execution artifacts remain historical; changed source/reporting requires a new reviewed freeze and GO for any future run.

The frozen controls are in `conditional-pilot-plan.json`. A is Sonnet 4.6 on `pipeline/default` hash `1b699a0d…6fd9`; B is Sonnet 5 adaptive/medium on saved inactive hash `ceb9e50b…adad`. Their contents were rehashed and B matched to `arm-B-sonnet5-medium.json`; only `modelVerdict` and `modelPolicies` differ. Both retain Haiku routine work and the unchanged OpenAI challenger. The exact input is `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`.

B's stage caps remain 8,192/16,384, with clustering 32,768 matching A. At the Captain's 110 tokens/s planning rate, clustering's ceiling alone represents about 298 seconds; it leaves little margin near the roughly 300-second no-header limit. Thinking is requested, not proven by the setting. Every recorded Headers Timeout, schema failure, fallback or damaged report remains an assigned-arm outcome, without replacement. These known limitations are part of the requested GO.

## Offline checks

```powershell
node --test scripts/diag/verdict-stability-batch.test.mjs
node --test scripts/diag/live-ab-arm-report.test.mjs
npm -w apps/web test -- test/unit/lib/analyzer/model-policy.test.ts
node --check scripts/diag/verdict-stability-batch.cjs
node --check scripts/diag/live-ab-arm-report.cjs
```

Plan-only output does not submit jobs:

```powershell
node scripts/diag/verdict-stability-batch.cjs --inputs scripts/diag/model-upgrade-pilot/pilot-input.json --n 1
```

## No-spend preparation and final-GO boundary

Before GO, preparation reads local Git/SQLite state, verifies the existing inactive B blob, builds the exact input and generates the ignored manifest after this proposal is reviewed and committed. The generator pins that final clean commit and all source/control hashes. A's preflight-only check is also read-only; it does not attest the revision running in either service. Restart/setup waits for the execution GO.

Generate the ignored record only after the final reviewed commit exists:

```powershell
node scripts/diag/verdict-stability-batch.cjs --freeze-preflight-template scripts/diag/model-upgrade-pilot/preflight-manifest.template.json --manifest-out test-output/model-upgrade-pilot/followup-20260924/execution-preflight.json --arm-b-config-hash ceb9e50b9a0daf6ce24e5e0cfedb40a75204a0dccaa74bd455840ff6bb25adad
$env:FH_PER_JOB_USD='5' # Planning allowance, not a forecast or hard invoice ceiling.
node scripts/diag/verdict-stability-batch.cjs --inputs scripts/diag/model-upgrade-pilot/pilot-input.json --n 1 --preflight test-output/model-upgrade-pilot/followup-20260924/execution-preflight.json --arm A --preflight-only
node scripts/diag/verdict-stability-batch.cjs --inputs scripts/diag/model-upgrade-pilot/pilot-input.json --n 1 --preflight test-output/model-upgrade-pilot/followup-20260924/execution-preflight.json --arm B
```

The final GO is required before runtime setup, either paid submission or B activation. Amending this plan invalidates its execution manifest: commit the reviewed amendment, generate a fresh manifest/preview and verify the runtime revision before A. The manifest rejects `--n` other than 1, a wrong output path or an existing arm output. B's plan-only output checks the frozen static contract without activating B; its active preflight can pass only after authorized activation.

## Execution conditions from the Claude review

The operator records these checks; the runner does not automate the continuation gate or restoration.

1. **Before A, after GO:** confirm no other writer or agent session is active, including the separate Codex worktree. Confirm exactly 1,713 jobs and no new jobs since preparation; a changed count requires reconciliation. Keep the machine awake. Restart API/web through `scripts/restart-clean.ps1` with `$env:FH_RUNNER_MAX_CONCURRENCY='1'`. Verify the frozen revision in both services, concurrency 1 and all five baseline hashes; rerun A's preflight-only check.
2. **Gate for B:** A must succeed without a hard failure or `report_damaged`, pass postflight, account for exactly one additional job (1,714 total), and have a resolved conservative cost ceiling below $5. No A call may last 300 seconds or more in clustering, Stage 1, Stage 5 or SR. Resolve ambiguous stage labels from raw metadata; if a covered stage cannot be excluded, stop before B. When A invokes the three instrumented diagnostics, their admin capture must contain the decisive candidates/typed flags; missing or materially truncated decisive capture stops the pair. Record A's band and blinded claim review; their quality results do not gate B.
3. **Between arms:** do not restart services or clear caches. Disclose B's inherited SR unknowns, translation success/failure cache and search reuse; these confound model cost comparisons. After the gate passes, activate the frozen B hash, wait at least 35 seconds for the 30-second config-pointer TTL, run B preflight-only, then submit B. A restart between arms stops this pair.
4. **Restore after completion or an early stop:** first establish terminal job status; wait if the job is not terminal. Confirm its pipeline has stopped; if pipeline exit remains uncertain, restart the web app before changing configuration. Keep execution exclusive and submit no further job during restoration. Reactivate A's full hash from the plan, restart normally with concurrency 2, and verify all five baseline hashes and no nonterminal jobs.

After final GO, use the reviewed manifest for each authorized submission:

```powershell
node scripts/diag/verdict-stability-batch.cjs --inputs scripts/diag/model-upgrade-pilot/pilot-input.json --n 1 --preflight test-output/model-upgrade-pilot/followup-20260924/execution-preflight.json --arm A --run
# Only after A passes the gate, B activation, the 35-second wait and B preflight-only:
node scripts/diag/verdict-stability-batch.cjs --inputs scripts/diag/model-upgrade-pilot/pilot-input.json --n 1 --preflight test-output/model-upgrade-pilot/followup-20260924/execution-preflight.json --arm B --run
```

## Reporting

`scripts/diag/live-ab-arm-report.cjs` is read-only. It reports approved/start/completion commits, canonical per-type config hashes, SR attribution/error types, exact and bounded-unknown cost columns, cached searches, timeout evidence, structured fallback fields, and confidence before/after the narrative adjustment. It can also emit a metadata-stripped claim-review packet:

```powershell
node scripts/diag/live-ab-arm-report.cjs --manifest test-output/model-upgrade-pilot/followup-20260924/execution-preflight.json --arm A=test-output/model-upgrade-pilot/followup-20260924/A.jsonl --arm B=test-output/model-upgrade-pilot/followup-20260924/B.jsonl --md test-output/model-upgrade-pilot/followup-20260924/report.md --blind-json test-output/model-upgrade-pilot/followup-20260924/blind.json
```

The bounded-unknown amount is an operational upper allowance, not an invoice amount. It applies only to explicit synthetic lost-evaluation markers and the exact historical allowance recorded in the plan; unrelated or physical unpriced calls leave the upper bound unresolved and block the next submission. A duration of at least 300 seconds is a proxy only; a Headers Timeout is confirmed only when the recorded error carries the timeout marker. Structured retry/fallback fields are shown separately because they may overlap or lack persistent markers.

A `report_damaged` B with `validator_unavailable` and schema failures is a transport outcome, not evidence against the model's analytical quality. It remains the assigned B observation, without replacement. Either outcome leaves this a smoke test only.
