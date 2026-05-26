# Telemetry Observation Plan — First 4 Jobs Post-Deploy

**Status:** Active. Scope reduced from the planned 50 jobs to 4 per user request (early signal).
**Gate for:** the routing decisions parked from the 2026-05-26 review (validation tier, Pass 2 lane, reconciler tier).
**Commits this depends on:** `b03f9587` (Phase A — ID schema), `ec0a9655` (Phase B — counters), now on `origin/main`.

---

## 1. What we are measuring

Three counters, all surfaced via `resultJson.analysisWarnings[]` on each completed job:

| Counter | Warning type(s) | Rate to compute | Decides |
|---|---|---|---|
| A — contract-validation retry rate | `contract_validation_retry_triggered`, `contract_repair_pass_fired` | # of jobs with at least one occurrence ÷ # of jobs | Whether Pass 2 should default to standard tier (the "add a `modelClaimAtomization` lane" decision) |
| B — direction-validation downgrade & overturn | `verdict_direction_issue` (flagged), `direction_rescue_plausible` (overturned), `verdict_integrity_failure` with `details.integrityFailureType: "direction"` (downgraded) | (flagged − rescued) / flagged per claim, aggregated | Whether `debateRoles.validation` should upgrade to standard |
| C — OpenAI TPM-guard firing rate | `llm_tpm_guard_fallback` with `details.guardPhase: "tpm_guard_precheck"` or `"tpm_guard_retry"` | # of challenger calls hitting the guard ÷ # of total challenger calls | Whether the cross-provider standard rationale is being silently undermined |

Plus a bonus signal from the D5 architectural-review doc (`2026-05-26_D5_Evidence_Partitioning_Architectural_Review.md`):

| Signal | Warning type | What to record |
|---|---|---|
| D5 partition activity | `evidence_partition_stats` | `details.partitioningActive` (bool) and `details.institutionalCount` / `details.generalCount` per job |

## 2. The first data point — local verification job

This entry is the verification run from 2026-05-26 confirming Phase A + B are wired correctly. It is the first data point in the observation window.

| Field | Value |
|---|---|
| Job ID | `7467c381e81e4fd19dabeb8fe64bf668` |
| Input | "Plastik recycling bringt nichts" (DE) |
| Status | SUCCEEDED |
| Evidence items | 44 (all EV_001-EV_044, no timestamp IDs) |
| Counter A — retry triggered | YES (3 failing claims) |
| Counter A — repair fired | NO |
| Counter B — `verdict_direction_issue` count | 0 in warnings (only one direction event, the rescue) |
| Counter B — `direction_rescue_plausible` count | 1 (AC_02, stable consistency, spread 0pp) |
| Counter B — `verdict_integrity_failure` (direction) count | 0 |
| Counter C — `llm_tpm_guard_fallback` count | 0 |
| D5 — `partitioningActive` | TRUE |
| D5 — institutional / general | 41 / 3 (highly imbalanced — flag to D5 review doc §4) |

## 3. How to pull per-job warnings

For each new job ID `$jobId`, the data lives in two places:

**A) `resultJson.analysisWarnings` on the job record (preferred for warning rates):**
```powershell
$result = Invoke-RestMethod -Uri "http://localhost:5000/v1/jobs/$jobId" -Method Get
$parsed = $result.resultJson | ConvertFrom-Json
$parsed.analysisWarnings | Where-Object { $_.type -match "contract_validation|contract_repair|verdict_direction|direction_rescue|verdict_integrity|llm_tpm|evidence_partition" }
```

The admin web UI (`http://localhost:3000/jobs/{id}`) renders the same warnings list.

**B) `/api/fh/metrics/{jobId}` (admin-only, includes LLM call counts for Counter C denominator):**
```powershell
$headers = @{ "X-Admin-Key" = $env:FH_ADMIN_KEY }  # value from apps/web/.env.local
Invoke-RestMethod -Uri "http://localhost:5000/api/fh/metrics/$jobId" -Headers $headers -Method Get
```

The LLM call records have `debateRole: "challenger"` so the Counter C denominator (total challenger calls) is queryable. The numerator (TPM-guard firings) is in the warnings.

**C) `/api/fh/metrics/quality-health` (cross-job D5 aggregate, already wired pre-2026-05-26):**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/fh/metrics/quality-health?limit=10" -Headers $headers -Method Get
```

This returns the `f6_partitioningActive`, `f6_institutionalCount`, `f6_generalCount`, `f6_balanceRatio` per job — the D5 data feeds directly into the architectural-review doc's §4 metrics table.

## 4. What to record per job

For each of the next 3 production jobs (data points 2, 3, 4), capture:

```yaml
jobId: <id>
input: <claim or article — log enough to identify the kind of input>
language: <auto-detected language, from understanding.detectedLanguage>
claimCount: <length of understanding.atomicClaims after Gate 1>
evidenceCount: <length of evidenceItems>
counterA:
  retryTriggered: <bool>
  repairFired: <bool>
  failingClaimCount: <from warning details if retryTriggered>
counterB:
  flagged: <# of verdict_direction_issue warnings>
  rescued: <# of direction_rescue_plausible warnings>
  downgraded: <# of verdict_integrity_failure with integrityFailureType=direction>
counterC:
  precheckFired: <# of llm_tpm_guard_fallback with guardPhase=tpm_guard_precheck>
  retryFired: <# of llm_tpm_guard_fallback with guardPhase=tpm_guard_retry>
  totalChallengerCalls: <from llmCalls[] filter by debateRole=challenger>
d5:
  partitioningActive: <bool>
  institutionalCount: <int>
  generalCount: <int>
  balanceRatio: <int|null>
```

Append to a running table at the bottom of this doc, or extract via a one-liner once we have 4 data points.

## 5. Decision thresholds — when to re-open the routing conversation

After data points 1–4 are collected, the early-signal decisions become:

| Observed rate | Interpretation | Action |
|---|---|---|
| Counter A retry > 50% of jobs | Pass 2 drift is the common case | Strong case for `modelClaimAtomization = standard` default. Open follow-up. |
| Counter A retry 20–50% | Drift fires sometimes | Lane-split with `budget` default holds. Re-evaluate after 50-job window. |
| Counter A retry < 20% | Drift is rare | The 4-step rescue chain isn't a hot path. Lane-split likely unnecessary. |
| Counter B downgrades / flagged > 30% | Direction validation is acting often AND FP rate unknown | Need full 50-job window + FP audit before upgrading validation. Don't act on 4 points alone. |
| Counter B rescued / flagged > 70% | Rescue path catches most flags | Validation tier upgrade is low-leverage — most issues self-correct. |
| Counter C TPM fallback fires on ≥1 of 4 jobs | Challenger silently downgraded on 25%+ of traffic at small N — likely much higher under load | F8 escalates from Medium to Critical. Architectural change needed: explicit hard-fail under TPM pressure rather than silent budget fallback. |
| D5 partitioningActive < 50% of jobs | Partition rarely fires; structural-bias concern is moot in practice | Drop or simplify D5 (option C from the D5 architectural review doc). |
| D5 partitioningActive ≥ 50% but institutional/general ratio routinely > 5:1 | Partition fires AND is highly imbalanced (verification job was 41:3) | Strong case for option B or D (claim-direction partition, or hybrid by evidence volume). |

**Important:** N=4 is too small to definitively settle any of these. The thresholds above are *early signal* — they tell us whether to keep watching, or whether to escalate to a full 50-job audit faster. No code change ships from N=4 data alone.

## 6. Running data table

| # | Date | Job ID | Input summary | C-A retry | C-A repair | C-B flagged | C-B rescued | C-B downgraded | C-C precheck | C-C retry | D5 active | D5 inst/gen |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 2026-05-26 | `7467c381…` | DE "Plastik recycling bringt nichts" | YES (3) | NO | 0 | 1 | 0 | 0 | 0 | TRUE | 41/3 |
| 2 | _pending_ | | | | | | | | | | | |
| 3 | _pending_ | | | | | | | | | | | |
| 4 | _pending_ | | | | | | | | | | | |

After row 4 is filled, the next step is a tight summary (one paragraph) calling out which of the §5 thresholds tripped, and either (a) sticking with the existing parked-decision posture or (b) escalating to a full 50-job audit on the specific counter that surprised.
