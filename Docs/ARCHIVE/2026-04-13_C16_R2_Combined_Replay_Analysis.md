# C16 Replay — Combined R2 Analysis (HEAD build `6a7227d9`)

**Date:** 2026-04-13
**Status:** Analysis only — no code change. Ship/don't-ship decision rests with the user.

## Revision history

- **2026-04-13 initial:** claimed HEAD 2/7 full pass, 3/7 gate pass vs sampled pre-C16 2/14 full pass. See corrections below.
- **2026-04-13 rev B (this file):** reviewer caught three substantive errors:
  1. Cohort leaked the past-tense variant (`unterschrieb`) of the R2 input into the HEAD sample (job `99ffd5bb`). That job uses a different input string from the locked one and should not be in the R2 cohort.
  2. Pre-C16 "full pass" count wrongly included `0ce78ee9` (verdict = `UNVERIFIED`, truthPercentage = 50, confidence = 0), violating the doc's own "full pass = non-UNVERIFIED verdict" definition.
  3. Pre-C16 baseline was computed against a cherry-picked subset (14 of the 25 exact-input succeeded runs) rather than the full window.
- All three findings were independently reproduced by fetching full `inputValue` and `resultJson.*` for every R2 candidate job from the local API. Corrected numbers and the reproduction script are below.

## Corrected data (exact-locked-input, sourced from `GET /v1/jobs/{id}.inputValue`)

**Locked input:** `Der Bundesrat unterschreibt den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`

**Full pass (strict)** = `validPreservedIds` non-empty AND `preservesContract` is `true` AND `verdictLabel` is not `UNVERIFIED`.
**C16-alt gate pass** = `validPreservedIds` non-empty.

### HEAD (commit `6a7227d9`), exact-input, SUCCEEDED

| jobId | created (UTC) | validPreservedIds | preservesContract | verdict | gate | full |
|---|---|---|---|---|---|---|
| `9fb8323c` | 2026-04-13 10:53 | `['AC_03']` | true | LEANING-FALSE | PASS | **YES** |
| `31745108` | 2026-04-13 11:03 | `[]` | false | UNVERIFIED | FAIL | no |
| `d685d88d` | 2026-04-13 11:14 | `[]` | false | UNVERIFIED | FAIL | no |
| `bffca494` | 2026-04-13 11:24 | `['AC_03']` | false | UNVERIFIED | PASS | no |
| `d5a7dc33` | 2026-04-13 11:30 | `[]` | false | UNVERIFIED | FAIL | no |
| `b224a01a` | 2026-04-13 13:01 | `[]` | false | UNVERIFIED | FAIL | no |

**HEAD totals: 2/6 gate PASS (33%), 1/6 full pass (17%).**

`99ffd5bb` (past-tense `unterschrieb`) is excluded — it does not match the locked input and should not be counted in R2 cohort statistics.

### Pre-C16, exact-input, SUCCEEDED (full window 2026-04-11 → 2026-04-13 06:42)

25 runs across commits `02d8c3b1`, `894294f4`, `442a5450`, `b943ee42`, `b6e226c2`, `2232ef33`, `53f13b4d`, `576c0606`, `d3824fe9`, `f5cf31ee`, `9d6cdb38`, `927e2dc0`.

| Bucket | Count |
|---|---|
| Total succeeded, exact-input | 25 |
| `validPreservedIds` non-empty (**gate PASS**) | **10 / 25** (40%) |
| Full pass (`preservesContract=true` AND verdict non-UNVERIFIED) | **4 / 25** (16%) |

The 4 full-pass pre-C16 runs: `b661c8be` (MOSTLY-FALSE, `894294f4`), `d7056186` (FALSE, `b943ee42`), `1e720b89` (LEANING-FALSE, `b943ee42`), `b3fe2f36` (MOSTLY-FALSE, `b6e226c2`).

`0ce78ee9` on `2232ef33` has `preservesContract=true` but `verdict=UNVERIFIED, truth=50, confidence=0` — downgraded to "gate PASS, not full pass."

`4e83b9a0` on `442a5450` has `verdict=FALSE` but `validPreservedIds=[]` (anchor not preserved in a valid thesis-direct claim) — gate FAIL despite a decisive verdict. Flagged for follow-up: the verdict was produced without the contract-anchor carrier, which is exactly the failure mode Phase 5 existed to prevent at the contract stage.

## Comparison

| Cohort | N | Gate PASS | Full pass |
|---|---|---|---|
| HEAD (commit `6a7227d9`) | 6 | 2 (33%) | 1 (17%) |
| Pre-C16 (full window) | 25 | 10 (40%) | 4 (16%) |

**There is no measurable R2-cohort improvement of HEAD over the pre-C16 baseline** at these sample sizes. The prior "roughly doubled" conclusion was an artifact of the mis-cohorted sample and cherry-picked comparator.

The two failure modes that HEAD clearly closes on R2 are:
- `normative_injection` false positives on verbatim input (C14→C15): observable by inspection of the validator's `anchorRetryReason` field in pre-C16 runs, not by the aggregate gate rate.
- Validator unavailability carry-forward (C12): surfaces in pre-C16 as `validator_unavailable`-equivalent hiccups that wedge Wave 1A; C12's one-retry recovers a subset.

These are real improvements, but they don't translate into a higher gate-pass rate because R2's dominant failure is **extractor anchor loss** (`validPreservedIds=[]` AND `failureMode != validator_unavailable`): 13 of 25 pre-C16 runs and 3 of 6 HEAD runs. The other `validPreservedIds=[]` cases (2 pre-C16, 1 HEAD) are `validator_unavailable` hiccups, classified separately in the residual table below. That anchor-loss class was explicitly deferred (Opus / best-of-N) at each prior debate and is not touched by C6–C16.

## Revised finding

**The original goal ("improve report quality") is met on individual runs but not reflected in aggregate R2 cohort rates at this sample size.** HEAD run `9fb8323c` (LEANING-FALSE, preservesContract=true) demonstrates the pipeline can produce a shippable fact-check on R2; pre-C16 runs `b661c8be`, `d7056186`, `1e720b89`, `b3fe2f36` show the same pipeline could do so *before* C6–C16 as well, on the same locked input.

The Phase 5/6 work removed specific failure classes (modifier omission in the retry path; validator over-reach on verbatim input; Gate 1 fidelity contradictions; reprompt destruction of contract-approved sets). Those are real, targeted fixes worth keeping. They just do not add up to a measurable R2-cohort gate-pass delta.

## Residual failure partition (HEAD, 6 runs)

| Class | Count | In-scope of C6–C16? |
|---|---|---|
| Extractor anchor loss (`validPreservedIds=[]`) | 3/6 | No — requires Opus/best-of-N |
| Validator secondary-claim judgment (`bffca494`) | 1/6 | Partially — C16 narrowed, one case slipped |
| Validator LLM unavailability (`d5a7dc33`) | 1/6 | Partially — C12 retried once, did not recover |
| Full pass | 1/6 | — |

## Recommended closure (revised)

1. **Phase 5 + Phase 6 are closed on their own terms.** Every commit (C6–C16) is a targeted, reversible fix for a real failure mode. HEAD ships those fixes without regression.
2. **Do NOT claim a measurable R2 improvement from aggregate rates.** The corrected numbers do not support that claim at N≈6 HEAD vs N≈25 pre-C16. Report the specific failure-class closures instead.
3. **R2 remains an edge case.** The dominant failure mode on R2 (extractor anchor loss) was explicitly deferred; its prevalence did not change.
4. **Next measurement should be broader** — non-R2 inputs, larger N per cohort, and an exact-input filter gate before counting. R2 alone cannot answer "is HEAD ship-worthy for general users."
5. **Do not ship the original "2/7 full pass, doubled vs baseline" message** — it is wrong and reviewer caught it. Send the corrected numbers if a Phase 5/6 summary is circulated.

## Files referenced (for reviewers reproducing the data)

- [apps/web/src/lib/analyzer/claim-extraction-stage.ts](../../apps/web/src/lib/analyzer/claim-extraction-stage.ts)
- [apps/web/prompts/claimboundary.prompt.md](../../apps/web/prompts/claimboundary.prompt.md)
- [apps/web/src/lib/analyzer/types.ts](../../apps/web/src/lib/analyzer/types.ts)
- [apps/web/src/lib/config-schemas.ts](../../apps/web/src/lib/config-schemas.ts) + [apps/web/configs/calculation.default.json](../../apps/web/configs/calculation.default.json)
- [Docs/WIP/2026-04-12_Phase5_Implementation_Plan_Final.md](2026-04-12_Phase5_Implementation_Plan_Final.md)

## Verification (exact-input cohort, correct method)

The prior snippet used substring matching on `inputPreview`, which mixed the `unterschreibt` and `unterschrieb` variants and truncated at the preview boundary. Correct reproduction uses `GET /v1/jobs/{id}` and compares the full `inputValue` field:

```bash
# List candidate ids (pre-filter by preview; still fetch full to verify)
curl -s 'http://localhost:5000/v1/jobs?limit=200' \
  | python -c "import sys,json; [print(j['jobId']) for j in json.load(sys.stdin)['jobs'] \
      if 'Bundesrat' in (j.get('inputPreview') or '') and 'rechtskr' in (j.get('inputPreview') or '') \
      and j.get('status')=='SUCCEEDED']"

# For each id, fetch and filter to the exact locked string:
curl -s 'http://localhost:5000/v1/jobs/<jobId>' | python -c "
import sys, json
LOCK = 'Der Bundesrat unterschreibt den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben'
d = json.load(sys.stdin)
if d.get('inputValue','') != LOCK:
    print('SKIP: non-locked variant'); sys.exit(0)
r = d.get('resultJson',{}) or {}
meta = r.get('meta',{}) or {}
u = r.get('understanding',{}) or {}
cvs = u.get('contractValidationSummary') or {}
a = cvs.get('truthConditionAnchor') or {}
vpi = a.get('validPreservedIds') or []
pc = cvs.get('preservesContract')
v = d.get('verdictLabel','')
gate = 'PASS' if len(vpi)>0 else 'FAIL'
full = 'YES' if (len(vpi)>0 and pc is True and v not in ('UNVERIFIED','',None)) else 'NO'
print(f\"{d['jobId'][:8]} commit={(meta.get('executedWebGitCommitHash') or '-')[:8]} vpi={vpi} pc={pc} verdict={v} gate={gate} full={full}\")
"
```
