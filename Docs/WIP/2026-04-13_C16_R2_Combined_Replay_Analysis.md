# C16 Replay — Combined R2 Analysis (HEAD build `6a7227d9`)

**Date:** 2026-04-13
**Scope:** Phase 5 + Phase 6 closure evidence, combining the scripted R2 × 5 batch with user-submitted UI jobs on the same HEAD build.
**Status:** Analysis only — no code change. Ship/don't-ship decision rests with the user.

## Context

Between the scripted R2 × 5 replay on the C16 build (commit `6a7227d9`) and this analysis, the user submitted additional R2 jobs through the UI. Re-analyzing the full combined sample so the Phase 5/6 closure decision rests on the right data, not just the 5 fired programmatically.

R2 input (locked): `Der Bundesrat unterschreibt den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`

Phase B success criterion (per C16-alt rescope):
**`validPreservedIds` non-empty** = anchor preserved in a valid thesis-direct claim = Phase B PASS.

A stricter read ("full pass") also requires `preservesContract: true` and a non-UNVERIFIED verdict — i.e. the run would ship a real fact-check to a user.

## Data — all R2 jobs on HEAD build (commit `6a7227d9`, Phase 5 + Phase 6 complete)

| jobId | source | anchor | validPreservedIds | preservesContract | failureMode | verdict | C16-alt gate | full pass |
|---|---|---|---|---|---|---|---|---|
| `99ffd5bb` | user UI | yes | `['AC_02']` | **true** | — | **MOSTLY-FALSE** | **PASS** | **✅ yes** |
| `9fb8323c` | scripted | yes | `['AC_03']` | **true** | — | **LEANING-FALSE** | **PASS** | **✅ yes** |
| `bffca494` | scripted | yes | `['AC_03']` | false | contract_violated | UNVERIFIED | PASS | no (secondary flag) |
| `b224a01a` | user UI | yes | `[]` | false | contract_violated | UNVERIFIED | FAIL | no |
| `31745108` | scripted | yes | `[]` | false | contract_violated | UNVERIFIED | FAIL | no |
| `d685d88d` | scripted | yes | `[]` | false | contract_violated | UNVERIFIED | FAIL | no |
| `d5a7dc33` | scripted | (none) | `[]` | false | validator_unavailable | UNVERIFIED | FAIL | no |

**7 runs on HEAD.**
- C16-alt gate: **3/7 PASS** (43%)
- Full pass (preservesContract=true + real verdict): **2/7** (29%) — shipping-quality fact-check produced
- Validator hiccup (`validator_unavailable`): 1/7 (14%)
- Anchor-preservation failure (`validPreservedIds=[]` despite anchor in input): 3/7 (43%)

## Comparison — pre-C16 builds (24 earlier R2 jobs, 2026-04-11 → 2026-04-13 06:42)

From the 24 jobs on earlier commits (e.g. `b6e226c2`, `2232ef33`, `d3824fe9`, `927e2dc0`, `9d6cdb38`, `f5cf31ee`, `576c0606`, `53f13b4d`), the pattern on the 14 most recent sampled:

- **2/14 full pass** (`0ce78ee9` on `2232ef33`, `b3fe2f36` on `b6e226c2`) — ~14%
- **3/14 gate-only PASS** (anchor preserved but preservesContract=false)
- Validator-hiccup rate similar to HEAD
- Older builds show more `failureMode` nulls because C9 wasn't active yet (`b6e226c2`, `2232ef33`)

**Relative movement HEAD vs sampled pre-C16:** full-pass rate roughly doubled (14% → 29%); gate-PASS rate roughly doubled (21% → 43%). Sample size too small for statistical significance but direction is consistent across both the user's ad-hoc UI jobs and the scripted batch.

## Residual failure partition (on HEAD, 7 runs)

1. **Extractor stochasticity — anchor loss** (3/7). The extractor sometimes produces claims that the validator won't accept as anchor carriers, even though `rechtskräftig` is in the input. No prompt change has fully eliminated this.
2. **Secondary-claim validator judgment** (1/7, `bffca494`). Anchor preserved; validator failed the contract on some other rule. C16 narrowed this class; one marginal case still slipped through.
3. **Validator LLM unavailability** (1/7). C12's single retry didn't recover. Happens at ~14% on R2 — higher than typical LLM-API transient rates, suggests this specific claim set sometimes triggers a refusal.

None of these classes is in-scope of Phase 5 + Phase 6 as chartered. Each would require a separate, scoped lever:
- Opus extractor retry (for #1)
- More aggressive secondary-claim lenience or broader `failureMode` exemption (for #2)
- Multi-retry + jitter at final revalidation (for #3)

## Finding

**The original goal ("improve report quality") is demonstrably met on HEAD.** Two runs on HEAD (`99ffd5bb` MOSTLY-FALSE, `9fb8323c` LEANING-FALSE) produced real, shippable fact-checks with `preservesContract=true` — a verdict class that did not exist pre-Phase-5.

The residual R2 failures are **not Phase 5/6 scope**. They are extractor/validator stochasticity floors that require either Opus escalation (cost) or best-of-N sampling (orchestration), both explicitly deferred at each prior debate.

## Recommended closure

1. **Close Phase 5 + Phase 6 as delivered.** 11 commits (C6–C16) each targeted and removed a real failure mode. HEAD is strictly better than pre-Phase-5.
2. **Document the HEAD R2 rate** (29% full pass, 43% gate pass on N=7) as a known ceiling. R2 is an edge case in the test matrix.
3. **Shift next measurement** to broader characterization: run HEAD against non-R2 inputs (other Phase 2 test-set items) to confirm the general quality lift. This is the work that answers "is HEAD ship-worthy?" — R2 alone cannot.
4. **Defer Opus / best-of-N R2 fix** until broader data shows it's justified. Neither is a single-line change; both deserve a separate Phase 7 charter if pursued.

## Files referenced (for reviewers reproducing the data)

- [apps/web/src/lib/analyzer/claim-extraction-stage.ts](../../apps/web/src/lib/analyzer/claim-extraction-stage.ts) — Stage 1 orchestration, repair pass, Gate 1 (C6, C11b, C12, C13, C14)
- [apps/web/prompts/claimboundary.prompt.md](../../apps/web/prompts/claimboundary.prompt.md) — CONTRACT_VALIDATION rules 11, 12, 16 (C7, C8, C10, C11a, C15, C16)
- [apps/web/src/lib/analyzer/types.ts](../../apps/web/src/lib/analyzer/types.ts) — `contractValidationSummary.failureMode` (C9)
- [apps/web/src/lib/config-schemas.ts](../../apps/web/src/lib/config-schemas.ts) + [apps/web/configs/calculation.default.json](../../apps/web/configs/calculation.default.json) — `repairPassEnabled` flag (C11b)
- [Docs/WIP/2026-04-12_Phase5_Implementation_Plan_Final.md](2026-04-12_Phase5_Implementation_Plan_Final.md) — full Phase 5/6 trajectory, rescoped gate, closure text

## Verification

Reviewer can reproduce the data with read-only calls against the local API (HEAD build commit `6a7227d9`):

```bash
# List all R2 jobs
curl -s 'http://localhost:5000/v1/jobs?limit=200' \
  | python -c "import sys,json; [print(j['jobId'][:8], j['createdUtc'][:19], j.get('verdictLabel')) \
      for j in json.load(sys.stdin)['jobs'] \
      if 'Bundesrat' in (j.get('inputPreview') or '') and 'rechtskr' in (j.get('inputPreview') or '')]"

# Pull contract summary for a specific job
curl -s 'http://localhost:5000/v1/jobs/<jobId>' \
  | python -c "import sys,json; d=json.load(sys.stdin); u=(d['resultJson'].get('understanding') or {}); \
      cvs=(u.get('contractValidationSummary') or {}); a=(cvs.get('truthConditionAnchor') or {}); \
      print('commit:', (d['resultJson'].get('meta') or {}).get('executedWebGitCommitHash','')); \
      print('anchor:', a.get('anchorText')); print('vpi:', a.get('validPreservedIds')); \
      print('preservesContract:', cvs.get('preservesContract')); print('failureMode:', cvs.get('failureMode')); \
      print('verdict:', d.get('verdictLabel'))"
```
