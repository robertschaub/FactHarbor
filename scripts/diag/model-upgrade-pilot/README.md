# Two-job model-upgrade pilot

Status: **Claude review conditions incorporated; regenerate the execution freeze before final GO and paid runs**.

This directory is the tracked, reviewable control package for one baseline A job and, conditionally, one Sonnet 5 adaptive/medium B job. The authoritative decisions are in `conditional-pilot-plan.json`. The B payload differs from active A only in `modelVerdict` and `modelPolicies`; its clustering ceiling is 32,768 provider output tokens.

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

After the implementation is independently reviewed and committed, the settled no-spend preparation may:

1. Start through the repository's prescribed clean restart path.
2. Save `arm-B-sonnet5-medium.json` through the UCM Admin API without activating it.
3. Generate the ignored execution manifest from the tracked template. The generator requires a clean reviewed commit, computes every source/control artifact hash, records the commit, and inserts the inactive B content hash. Nothing tracked is rewritten, avoiding circular commit provenance.
4. Review the generated manifest and run A's preflight-only check. Preflight-only reads local Git/SQLite state but submits no job.

Generate the ignored record only after the final reviewed commit exists:

```powershell
node scripts/diag/verdict-stability-batch.cjs --freeze-preflight-template scripts/diag/model-upgrade-pilot/preflight-manifest.template.json --manifest-out test-output/model-upgrade-pilot/execution-preflight.json --arm-b-config-hash <UCM_CONTENT_HASH>
node scripts/diag/verdict-stability-batch.cjs --inputs scripts/diag/model-upgrade-pilot/pilot-input.json --n 1 --preflight test-output/model-upgrade-pilot/execution-preflight.json --arm A --preflight-only
```

The one final GO is required before either paid submission and before activating B. Amending this plan invalidates the earlier execution manifest and readiness receipt: commit the reviewed amendment, regenerate the manifest and previews, and verify the runtime revision before A. The manifest rejects `--n` other than 1, a wrong output path, or an existing arm output, so it cannot silently repeat or replace a pilot observation.

## Execution conditions from the Claude review

The operator records these checks; the runner does not automate the continuation gate or restoration.

1. **Before A:** confirm no other writer or agent session is active, including the separate Codex worktree. Confirm exactly 1,711 jobs and no new jobs since preparation; a changed count requires reconciliation. Keep the machine awake. Verify the reviewed runtime and concurrency 1. If services restarted after 2026-09-24 15:15 UTC, or runtime provenance is uncertain, relaunch with `$env:FH_RUNNER_MAX_CONCURRENCY='1'` and rerun A's preflight-only check.
2. **Gate for B:** A must succeed without a hard failure or `report_damaged`, pass postflight, account for exactly one additional job (1,712 total), and have a resolved conservative cost ceiling below $5. No A call may last 300 seconds or more in clustering, Stage 1, Stage 5 or SR. Resolve ambiguous stage labels from raw metadata; if a covered stage cannot be excluded, stop before B. Record A's band and blinded claim review; their quality results do not gate B.
3. **Between arms:** do not restart services or clear caches. Disclose B's inherited SR unknowns and cache reuse. After the gate passes, activate the frozen B hash, wait at least 35 seconds for the 30-second config-pointer TTL, run B preflight-only, then submit B. A restart between arms stops this pair.
4. **Restore after completion or an early stop:** first establish terminal job status; wait if the job is not terminal. Confirm its pipeline has stopped; if pipeline exit remains uncertain, restart the web app before changing configuration. Keep execution exclusive and submit no further job during restoration. Reactivate A's full hash from the plan, restart normally with concurrency 2, and verify all five baseline hashes and no nonterminal jobs.

After final GO, use the reviewed manifest for each authorized submission:

```powershell
node scripts/diag/verdict-stability-batch.cjs --inputs scripts/diag/model-upgrade-pilot/pilot-input.json --n 1 --preflight test-output/model-upgrade-pilot/execution-preflight.json --arm A --run
# Only after A passes the gate, B activation, the 35-second wait and B preflight-only:
node scripts/diag/verdict-stability-batch.cjs --inputs scripts/diag/model-upgrade-pilot/pilot-input.json --n 1 --preflight test-output/model-upgrade-pilot/execution-preflight.json --arm B --run
```

## Reporting

`scripts/diag/live-ab-arm-report.cjs` is read-only. It reports approved/start/completion commits, canonical per-type config hashes, SR attribution/error types, exact and bounded-unknown cost columns, cached searches, timeout evidence, structured fallback fields, and confidence before/after the narrative adjustment. It can also emit a metadata-stripped claim-review packet:

```powershell
node scripts/diag/live-ab-arm-report.cjs --manifest test-output/model-upgrade-pilot/execution-preflight.json --arm A=test-output/model-upgrade-pilot-A.jsonl --arm B=test-output/model-upgrade-pilot-B.jsonl --md test-output/model-upgrade-pilot-report.md --blind-json test-output/model-upgrade-pilot-blind.json
```

The bounded-unknown amount is an operational upper allowance, not an invoice amount. It applies only to explicit synthetic lost-evaluation markers and the exact historical allowance recorded in the plan; unrelated or physical unpriced calls leave the upper bound unresolved and block the next submission. A duration of at least 300 seconds is a proxy only; a Headers Timeout is confirmed only when the recorded error carries the timeout marker. Structured retry/fallback fields are shown separately because they may overlap or lack persistent markers.

A `report_damaged` B with `validator_unavailable` and schema failures is a transport outcome, not evidence against the model's analytical quality. It remains the assigned B observation, without replacement. Either outcome leaves this a smoke test only.
