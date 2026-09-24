# Two-job model-upgrade pilot

Status: **implemented offline; no-spend preparation is followed by one final GO before activation or paid runs**.

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

The one final GO is required before either paid submission and before activating B. After A is reviewed and the continuation gate passes, activate B, rerun B's complete preflight, and submit its single authorized run. The manifest rejects `--n` other than 1, a wrong output path, or an existing arm output, so it cannot silently repeat or replace a pilot observation.

## Reporting

`scripts/diag/live-ab-arm-report.cjs` is read-only. It reports approved/start/completion commits, canonical per-type config hashes, SR attribution/error types, exact and bounded-unknown cost columns, cached searches, timeout evidence, structured fallback fields, and confidence before/after the narrative adjustment. It can also emit a metadata-stripped claim-review packet:

```powershell
node scripts/diag/live-ab-arm-report.cjs --manifest test-output/model-upgrade-pilot/execution-preflight.json --arm A=test-output/model-upgrade-pilot-A.jsonl --arm B=test-output/model-upgrade-pilot-B.jsonl --md test-output/model-upgrade-pilot-report.md --blind-json test-output/model-upgrade-pilot-blind.json
```

The bounded-unknown amount is an operational upper allowance, not an invoice amount. It applies only to explicit synthetic lost-evaluation markers and the exact historical allowance recorded in the plan; unrelated or physical unpriced calls leave the upper bound unresolved and block the next submission. A duration of at least 300 seconds is a proxy only; a Headers Timeout is confirmed only when the recorded error carries the timeout marker. Structured retry/fallback fields are shown separately because they may overlap or lack persistent markers.
