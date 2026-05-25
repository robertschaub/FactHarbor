# Local vs Deployed Regression Investigation — 2026-05-25

Senior Architect / LLM investigation: why did many inputs that succeeded on the deployed `app.factharbor.ch` build (22.Apr 26) fail on the local current build (24.May 26)?

## TL;DR

Two independent failures combine to produce the symptom:

1. **Auto-selection regression** (commit `d2d06f83 feat(analyzer): enable automatic claim selection`, 2026-05-24 20:24Z) — every recent local V1-pipeline run that exercised Stage 1.5 hit `AI_NoObjectGeneratedError` from the structured-output Zod schema; the failure path emits `verdictLabel=UNVERIFIED, confidence=0, droppedClaims[reasonType=selector_failed]`. Deployed predates the feature, so it succeeds.
2. **Both local dev processes are running stale code from the `Pipeline_V2` branch.** Even though `main` HEAD (`2dccb322`) no longer contains V2 source, the long-lived dev processes booted from a tree that did, and hot-reload didn't (couldn't) update the affected constants/closures. New submissions never reach the current V1 pipeline at all — they return a `_schemaVersion: "4.0.0-cb-precutover"` V2 pre-cutover envelope with `analysisIssueCode: report_damaged`.
   - **.NET API (PID 5000, `dotnet watch run`, 118 hot-reload iterations)**: still has `string pipelineVariant = "claimboundary-v2"` baked in as the default. New jobs from `POST /v1/analyze` *without* an explicit `pipelineVariant` are stored with `PipelineVariant = "claimboundary-v2"` (verified twice: L1 `da35fbb7…`, L2 `9e9488ec…`). This default only existed on commit `79a5c31f feat(v2): default manual jobs to pipeline v2` on the `Pipeline_V2` branch, never on `main`.
   - **Web dev (PID 65268, `next dev --webpack -p 3000`)**: the `runJobBackground` / `drainRunnerQueue` modules in memory still hold V2 envelope code that produces `meta.pipeline = "claimboundary-v2"` / `_schemaVersion = "4.0.0-cb-precutover"`. Hot-reload of the route file (`apps/web/.next/dev/server/app/api/internal/run-job/route.js` was rebuilt clean at 25.05 00:01) does **not** invalidate the long-lived setInterval/setTimeout closures inside the runner queue module that were captured at process start.

The deployed build at `app.factharbor.ch` (banner: "Alpha 22.Apr 26") predates both issues, so the same inputs return real verdicts there.

## Evidence

### A. Same inputs, two outcomes

| Input | Deployed (22.Apr build) | Local (current build) |
|---|---|---|
| `https://en.wikipedia.org/wiki/Iran_and_weapons_of_mass_destruction` | `e2f5862b` MOSTLY-TRUE c=62 (2026-05-24 21:20Z) | `c6732cd4` UNVERIFIED c=0 (2026-05-24 19:42Z) |
| `O processo judicial contra Jair Bolsonaro …` (PT) | `7e2eb661` LEANING-TRUE c=63 (2026-05-24 20:55Z) | `4f794e2c` UNVERIFIED c=0 (2026-05-24 19:31Z) |
| `Plastic recycling is pointless` | no exact-English deployed historical run; closest is `77468aa6` "Le recyclage du plastique ne sert à rien" LEANING-FALSE c=67 (2026-04-21) | `570873a3` UNVERIFIED c=0 (2026-05-24 19:30Z); `da35fbb768` L1 report_damaged V2-envelope (2026-05-24 22:01Z); `9e9488ec` L2 report_damaged V2-envelope (2026-05-24 22:25Z) |
| `Was Iran actually making nukes?` | `57aca91d` LEANING-FALSE c=78 (2026-05-24 19:58Z) | `bb73fbe8` report_damaged V2-envelope (2026-05-24 20:01Z) |

### B. Captured selector exception (root cause of the V1-path failure)

From `GET /api/fh/metrics/c6732cd4…`, `taskType=claim_selection`:

```
retries=0  model=claude-sonnet-4-6  durationMs=36576  success=false
  errorType:    AI_NoObjectGeneratedError
  errorMessage: "No object generated: response did not match schema."

retries=1  model=claude-sonnet-4-6  durationMs=36282  success=false
  errorType:    AI_NoObjectGeneratedError
  errorMessage: "No object generated: response did not match schema."
```

Same pattern on `4f794e2c…`. After both retries, `claimboundary-pipeline.ts:932-967` takes the `catch` branch and emits the `selector_failed` terminal result.

### C. Why the selector LLM output fails the Zod schema

Schema in [claim-selection-recommendation.ts](apps/web/src/lib/analyzer/claim-selection-recommendation.ts):

- `rationale ≤ 240` chars
- `recommendationRationale ≤ 160` chars per claim
- `rankedClaimIds` must cover **every** evaluated candidate exactly once
- `.strict()` mode → unknown fields rejected
- prompt in [claimboundary.prompt.md:728](apps/web/prompts/claimboundary.prompt.md) repeats those limits but the Sonnet 4.6 output does not consistently respect them

`Output.object()` (Vercel AI SDK) returns "no object" whenever the model's structured output fails the Zod check; that's exactly what was logged. With 15 candidates on the Iran wiki input, the model needs 15 rationales each ≤160 chars plus a 240-char overall rationale, no extra fields — a tight envelope for verbose Sonnet output.

### D. Active config

`GET /api/admin/config/pipeline/default` (active hash `37f84938…`, activated 2026-05-24 20:56:19Z):

- `claimAutoSelectionEnabled: true`
- `claimAutoSelectionCap: 5`
- `claimAutoSelectionCandidateCap: 25`

Previous version `cab527bd…` (created 2026-05-24 17:12:19Z) has the feature off and is the natural rollback target. Per `feedback_deploy_config_state.md`, only the DB-resident active config matters — editing `pipeline.default.json` would not take effect.

### E. Stale dev-process state (second, independent issue)

Two L-jobs (`da35fbb7…` at 22:01Z, `9e9488ec…` at 22:25Z) both returned:

```json
"meta": {
  "schemaVersion": "4.0.0-cb-precutover",
  "pipeline": "claimboundary-v2",
  "publicCutoverStatus": "blocked_precutover",
  "executedWebGitCommitHash": "1eaf8b69…"
}
```

while neither curl request included `pipelineVariant`. Both jobs were written into `Jobs.PipelineVariant = "claimboundary-v2"` in the API DB.

Source vs runtime mismatch:

- `apps/api/Controllers/AnalyzeController.cs` on `main` defaults to `"claimboundary"`; the `"claimboundary-v2"` default only ever existed on `Pipeline_V2` branch commit `79a5c31f feat(v2): default manual jobs to pipeline v2` (2026-05-22). That commit is **not** in `main`'s ancestry.
- `apps/api/obj/Debug/net8.0/FactHarbor.Api.dll` has been re-emitted; `strings` shows no `precutover` / `claimboundary-v2`. But the **already-loaded process** (PID 5000, `--no-build`, dotnet-watch iteration 118) holds the OLD compiled assembly in memory. Hot-reload does not replace string-constant default parameter values.
- `apps/web/.next/dev/server/app/api/internal/run-job/route.js` was re-emitted at 25.05 00:01 with no V2 strings, **after** both L-jobs ran. But the long-running web dev process (PID 65268) holds a captured `setInterval(...) → drainRunnerQueue()` whose closure points at the original (V2-envelope) module instance. Route hot-reload does not reconstruct those captured closures.
- L2 (`9e9488ec…`) was submitted at 22:25Z, *after* the web's run-job route had been recompiled to V1-clean. It still produced a V2-envelope result. That definitively rules out "just clear the web's `.next` cache" as a sufficient fix — the in-process state must be discarded by restarting the process.

Net: every new submission today, regardless of input, is intercepted by the in-process V2 pre-cutover envelope. None of them reach the V1 pipeline (and therefore not Stage 1.5 either), so even the auto-selection regression is masked.

## Recommended Remediation (order matters)

1. **Revert / disable the auto-selection feature for now** — activate the prior config blob:

   ```
   POST /api/admin/config/pipeline/default/activate
   X-Admin-Key: …
   { "contentHash": "cab527bd6b6240a3160fd8b5a079f4a03a6e8a4687ee8ffe3b5166a417a7e214",
     "reason": "Disable auto-selection until Sonnet schema-compliance fixed (regression vs 22.Apr deploy)" }
   ```

   This stops the `selector_failed` failure path immediately.

2. **Hard-restart BOTH dev processes** (web *and* .NET API) and clear `.next`. Hot-reload alone cannot evict the captured closures and default-parameter constants identified in §E:

   ```powershell
   # Stop the dotnet-watch host (parent dotnet process — PID 53488 today) AND the web dev (PID 65268)
   # Then for each:
   Remove-Item -Recurse -Force apps\web\.next
   cd apps\api; dotnet watch run   # restart .NET API
   cd apps\web; npm run dev        # restart web dev
   ```

   After restart, verify with `curl -s http://localhost:5000/v1/jobs?limit=1` — newly created jobs should have `pipelineVariant=claimboundary`, not `claimboundary-v2`.

3. **Then re-enable auto-selection only after fixing the schema mismatch**. Options, ordered by safety:
   - Relax `recommendationRationale` to ≤ 240 chars and `rationale` to ≤ 360 chars; the prompt rule lines should match. Sonnet's natural rationale length consistently exceeds 160. Empirically cheap, no semantic loss.
   - Move the `redundancyWithClaimIds` validation out of the strict schema into a post-parse normalizer (Sonnet sometimes emits empty objects vs. empty arrays).
   - Drop `.strict()` to plain object mode and white-list only required keys; tolerate unknown fields.
   - Add an LLM-level structured-output retry that down-shifts to Haiku 4.5 if Sonnet fails twice — Haiku is more compliant with tight schemas.

4. **Add a guard in `runJobBackground`** that asserts `result.resultJson.meta.pipeline === "claimboundary"` before PUT-ing back to the API. If a hot-cached V2 module ever returns a precutover envelope again, the runner refuses to persist it and the job fails loudly instead of silently looking like a `report_damaged` analysis. (Defense-in-depth for stale-cache class of bugs.)

## Budget used

- Local: 2 of 4 (`da35fbb768…` — L1; `9e9488ec…` — L2). L1 confirmed the V2-envelope intercept. L2 was the advisor-suggested discriminating test that ruled out "stale `.next` cache alone" — the in-process state of the dev processes themselves is the actual culprit. The auto-selection regression is already established from historical metrics on `c6732cd4…` and `4f794e2c…`, so no additional jobs were spent on it.
- Deployed: 0 of 4. Historical successes (`e2f5862b`, `7e2eb661`, `57aca91d` from 2026-05-24) on the same/equivalent inputs are already the A/B mirror.

L3–L4 and all deployed slots remain available for fix verification after the remediation runs.

## Files / line refs

- [apps/web/configs/pipeline.default.json:133-135](apps/web/configs/pipeline.default.json) — flag flip
- [apps/web/src/lib/analyzer/claimboundary-pipeline.ts:786-968](apps/web/src/lib/analyzer/claimboundary-pipeline.ts) — Stage 1.5 dispatch + failure path
- [apps/web/src/lib/analyzer/claim-selection-recommendation.ts:34-194](apps/web/src/lib/analyzer/claim-selection-recommendation.ts) — strict schema + 2-attempt LLM call
- [apps/web/prompts/claimboundary.prompt.md:728-815](apps/web/prompts/claimboundary.prompt.md) — `CLAIM_SELECTION_RECOMMENDATION` prompt
- [apps/web/src/lib/internal-runner-queue.ts:190-242](apps/web/src/lib/internal-runner-queue.ts) — runner dispatch (calls V1 only in current source)
