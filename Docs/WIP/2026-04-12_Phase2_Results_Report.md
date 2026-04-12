---
title: Phase 2 — Historical Replay Results Report
date: 2026-04-12
parent: Docs/WIP/2026-04-11_Report_Quality_Restoration_Master_Plan.md
depends_on:
  - Docs/WIP/2026-04-11_Phase2_Gate_G2_Replay_Plan.md
  - Docs/WIP/2026-04-11_Phase2_Per_Input_Expectations.md
status: Complete — primary F4 finding locked; feeds Phase 3 Change Impact Ledger
---

# Phase 2 — Historical Replay Results Report

## Executive summary

The Phase 2 replay ran 10 analysis jobs across 2 commits (C0 = current HEAD `894294f4`, C3 = pre-Apr-8-wave `442a5450`) on 3 of the 5 Shape B inputs (R1 asylum, R2 rechtskräftig, R4 Bolsonaro), plus 1 canary (R1 on C0) and 1 canary ("the sky is blue" on C3).

**Primary finding (locked):** the deterministic substring-based anchor preservation check at `claim-extraction-stage.ts:1842-1866` — introduced in commits `8f089ccf` (Apr 8 09:46) and hardened in `d1677dd3` (Apr 8 14:18) — is the root cause of R2's ~75% failure rate on current HEAD. On C3 (pre-Apr-8 code without the substring check), R2 produced the correct fused-modifier verdict (FALSE 12%, confidence 88%, `preservesContract: true`) on the first try. On C0, 3 of 4 R2 runs hit the F4 path and terminated with `report_damaged`.

**Secondary finding:** R1 (asylum 235K) has a separate evidence-classification issue not related to F4. C0's non-F4 path produced TRUE 92 while C3 produced LEANING-FALSE 42 — a 50pp delta driven by evidence-direction classification, not by the substring check.

**R4 finding (clean):** Bolsonaro on C3 produced MIXED 52% with 94 evidence items. The search-provider fallback (Serper for Google CSE 429) worked correctly. The lower-than-expected verdict (vs 68–80% historical) is driven by a granular AC_03 (judicial impartiality, TP=32%) that defensibly pulls the average down.

## Methodology

### Replay shape: Option 3 "minimum attribution"

Original Shape B planned 5 inputs × 15 runs/commit × 3 commits = 45 jobs. Reduced to Option 3 after canary findings showed F4 failure rate was already measurable at small sample sizes:
- C0: 2 R1 runs + 4 R2 runs = 6 jobs
- C1: skipped (C1 and C0 have identical F4 code; low marginal information)
- C3: 1 R1 + 1 R2 + 1 R4 + 1 canary = 4 jobs
- **Total: 10 real analysis jobs + 1 C0 canary (FAILED, runner-key-env issue)**

### Commits tested

| ID | Commit | Date | F4 substring-check hits | Role |
|---|---|---|---|---|
| **C0** | `894294f4` (HEAD) | Apr 11 | 2 | Current state |
| C1 | `82d8080d` | Apr 9 17:01 | 2 | **Skipped** — identical F4 code to C0 |
| **C3** | `442a5450` | Apr 7 13:34 | **0** | Pre-Apr-8 baseline (no F4 code) |

### Operational issues during replay

1. **Runner-key environment mismatch** (first canary on C0): API started in Production mode, sending placeholder runner key. Fix: `ASPNETCORE_ENVIRONMENT=Development`.
2. **Gitignored `appsettings.Development.json`** (entire C1 batch): worktree didn't have the config file; all 7 C1 jobs FAILED with 401. Fix: copy `appsettings.Development.json` to worktree alongside `.env.local`. Applied correctly for C3.
3. **Google CSE 429 on C3 R4**: one-shot rate limit during Bolsonaro research. Serper fallback fired correctly on the affected query. Analysis not degraded (34 sources, 94 evidence items). Initially mischaracterized as "contaminated" — corrected after reviewing provider distribution.

## Full results

### R2 — Der Bundesrat unterschreibt den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben

**F4 attribution CONFIRMED. This is the primary Phase 2 finding.**

#### C0 (current HEAD, has F4 substring check)

| Run | Verdict | TP | Conf | preservesContract | F4 path fired? |
|---|---|---|---|---|---|
| R2 run1 | **MOSTLY-FALSE** | **16** | **81** | **true** | No — clean path ✅ |
| R2 run2 | UNVERIFIED | 50 | 0 | false | **Yes — report_damaged** |
| R2 run3 | UNVERIFIED | 50 | 0 | false | **Yes — report_damaged** |
| R2 run4 | UNVERIFIED | 50 | 0 | false | **Yes — report_damaged** |

F4 failure rate on C0: **75%** (3 of 4 runs). The 1 clean run produced the correct verdict (MF 16, within the expected 11–31 range).

#### C3 (pre-Apr-8, no F4 substring check)

| Run | Verdict | TP | Conf | preservesContract | Claims | F4 path? |
|---|---|---|---|---|---|---|
| R2 run1 | **FALSE** | **12** | **88** | **true** | 3 (including explicit "rechtskräftig" preservation) | **No** — F4 code doesn't exist on C3 |

F4 failure rate on C3: **0%**. Verdict in the expected 11–31 range. Three atomic claims (vs 1 on C0's low_claim_count path). Third claim explicitly preserves `rechtskräftig`: *"Die Unterzeichnung des EU-Vertrags durch den Bundesrat ist **rechtskräftig**, bevor Volk und Parlament darüber entschieden haben."*

#### R2 per-input criteria scorecard

| Criterion | C0 (pass rate) | C3 | Status |
|---|---|---|---|
| **R2.1** verdict 11–31 | 1/4 (25%) | ✅ 12 | **F4 regression confirmed** |
| **R2.2** `rechtskräftig` in primary claim | 1/4 (25%) | ✅ in third claim | **F4 regression confirmed** |
| **R2.3** preservesContract=true | 1/4 (25%) | ✅ true | **F4 regression confirmed** |
| **R2.4** no normative injection | 4/4 (100%) | ✅ | Clean on both |

### R1 — Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz

**Mixed finding — F4 is partly involved, but a separate evidence-classification issue exists.**

#### C0

| Run | Verdict | TP | Conf | preservesContract | F4 path? |
|---|---|---|---|---|---|
| Canary | UNVERIFIED | 50 | 0 | false | **Yes — report_damaged** |
| Run 2 | **TRUE** | **92** | **82** | true (fail-open) | **No** — clean path |

F4 failure rate on C0: 50% (1 of 2 runs).

#### C3

| Run | Verdict | TP | Conf | preservesContract | Evidence balance |
|---|---|---|---|---|---|
| Run 1 | **LEANING-FALSE** | **42** | **68** | true | 5 contradicting : 1 supporting |

F4 failure rate on C3: 0% (F4 code absent). **But** the verdict is LEANING-FALSE 42 — far from the user-expected TRUE ≥85%.

#### R1 per-input criteria scorecard

| Criterion | C0 (run 2, non-F4) | C3 | Status |
|---|---|---|---|
| **R1.1** verdict TRUE/MT, TP≥75 | ✅ TRUE 92 | ❌ LF 42 | **DIVERGENT** — C0 non-F4 is better than C3 |
| **R1.2** SEM 2025 PDF cited | ❌ cited SEM 2024 | SEM 2025 found (1 hit) | **C3 found it, C0 didn't** |
| **R1.3** "235 000" verbatim | ✅ | ✅ | Clean on both |
| **R1.4** "zurzeit" preserved | ✅ | ✅ (via "Flüchtlingsstatus") | Clean on both |

**R1 interpretation:** R1 is NOT primarily an F4 victim. The 50pp delta between C0-non-F4 (TRUE 92) and C3 (LF 42) is driven by different evidence-direction classification. C3 found SEM 2025 but classified most retrieved evidence as "contradicting". C0 non-F4 run reached TRUE 92 possibly via Option G's article adjudication (which C3 lacks). This is a different quality axis worth investigating but NOT attributable to the Apr 8 substring-check commits.

### R4 — Were the various Bolsonaro trials and convictions fair and based on the rule of law?

**No C0 data point (R4 not tested on C0). C3 result is analytically complete but below historical expectations.**

#### C3

| Run | Verdict | TP | Conf | Claims | Evidence | Sources |
|---|---|---|---|---|---|---|
| Run 1 | MIXED | 52 | 65 | 3 | 94 items (40 neutral, 32 contradicts, 22 supports) | 34 |

Per-claim breakdown:
- AC_01 (coup trial fairness): TP=62
- AC_02 (Jan 8 investigations): TP=58
- AC_03 (judicial impartiality): **TP=32** — dragging average down

Google CSE 429 fired once; Serper fallback worked; analysis not degraded.

#### R4 per-input criteria scorecard (C3 only)

| Criterion | C3 | Status |
|---|---|---|
| **R4.1** verdict 68–80 | ❌ MIXED 52 | Below expected — but AC_03 (judicial impartiality) is defensible |
| **R4.2** ≥2 claims STF/TSE | ✅ 3 claims | |
| **R4.3** ≥3 Brazilian institution boundaries | needs verification | |
| **R4.4** zero US boundaries | needs verification | |
| **R4.5** zero verdictAdjusted from US | needs verification | |
| **R4.6** 27yr sentence mentioned | needs verification | |
| **R4.7** confidence ≥65 | ✅ 65 (borderline) | |

R4 was not tested on C0 — no cross-commit comparison possible. MIXED 52 may be a C3-specific result (different Stage 4 code, more granular decomposition than historical scorecard runs).

## F4 root cause — commit-level attribution

### The F4 substring check

Located at `apps/web/src/lib/analyzer/claim-extraction-stage.ts` lines 1842–1866. Mechanism:

```typescript
// Lines 1854-1856: deterministic substring match
const claimContainsAnchor = validPreservedIds.some((claimId) => {
  const claimText = claimTextById.get(claimId) ?? "";
  return claimText.toLowerCase().includes(anchorLower);
});
```

When the LLM validator says `preservesOriginalClaimContract: true` but the substring match fails (e.g., German morphology: "Mehr als" vs "übersteigt", "rechtskräftig" vs "rechtskräftiger"), the code forces `anchorOverrideRetry = true` → `preservesContract: false` → pipeline terminates with `report_damaged`.

### When it was introduced

| Commit | Date | Substring-check hits | What it added |
|---|---|---|---|
| `442a5450` (C3) | Apr 7 13:34 | 0 | UPQ-1 Phase B (no anchor check) |
| **`8f089ccf`** | **Apr 8 09:46** | **1** | *"wire truthConditionAnchor + antiInferenceCheck into contract validator schema"* — first instance |
| `008918dc` | Apr 8 10:20 | 1 | Code review cleanup (unchanged) |
| **`d1677dd3`** | **Apr 8 14:18** | **2** | *"harden anchor weighting and validation"* — added second instance |
| `82d8080d` (C1) | Apr 9 17:01 | 2 | (unchanged) |
| `894294f4` (C0) | Apr 11 | 2 | (unchanged) |

**Root cause commits: `8f089ccf` (introduced) + `d1677dd3` (hardened).**

### Violation classification

Per AGENTS.md §LLM Intelligence mandate and the canonical quality criteria Q-AH1:
- The substring check is **deterministic text-analysis logic making analytical decisions** (deciding whether the LLM's claim-preservation judgment is correct via `String.includes()`)
- It violates the explicit prohibition on *"regex/pattern/keyword-based classification that interprets meaning"*
- Per LLM Expert learning 2026-04-10: *"If the LLM returns structured `preservedInClaimIds`/`preservedByQuotes` and your TypeScript then re-checks it with `claimText.toLowerCase().includes(anchor.toLowerCase())`, you have replaced LLM intelligence with a worse heuristic."*

### Recommended Phase 4 action (strong prior from diff analysis)

1. **Delete** `getDeterministicDirectionIssues` hemisphere-ratio generation (lines 1680–1693)
2. **Delete** `isVerdictDirectionPlausible` Rules 1–3 (hemisphere match, middle-ground flexibility, 15pp tolerance)
3. **Delete** the substring-check anchor verification (lines 1842–1866 — the F4 finding itself)
4. **Delete** `directionMixedEvidenceFloor` UCM config field
5. **Delete** `db7cdcf8` self-consistency rescue boost
6. **Keep** the polarity-mismatch structural check (lines 1669–1678 — legitimate schema guard)
7. **Keep** the `d1677dd3` prompt rules (shared-predicate fidelity, action-threshold fidelity, decision-state verb fidelity)
8. **Keep** Option G (`d5ded98f`)
9. **Replace** deleted rules with an LLM re-validation call that has access to verdict, cited evidence, and original validator reasoning
10. **Commit A2** (stashed Wave 1A safeguard) with `contract_validation_unavailable` warning-type distinction added

## Operational retrospective

### What worked
- Worktree-based replay with main-DB override (`ConnectionStrings__FhDbSqlite` env var)
- Circuit-breaker protocol (fast-fail detection on FAILED status within threshold)
- Two-config-file copy (`.env.local` + `appsettings.Development.json`) for worktrees
- Pre-flight canary with real-job verification (not just auth probe)
- Serial submission with polling-to-completion (reliable but slow)

### What failed
- **C1 batch lost to gitignored `appsettings.Development.json`** — 7 jobs, $0 cost (no LLM calls), ~15 min wasted
- **First canary lost to Production env** — 1 job FAILED, $0 cost, ~3 min wasted
- **Quota-probe circuit breaker didn't catch Google CSE 429** — circuit breaker was FAILED-status-only, not warning-based. R4 on C3 ran to completion despite the 429 because the fallback worked, but the protocol gap should be fixed.

### What I'd change for future replays
1. **Always copy both config files to worktrees** (checklist, not memory)
2. **Always `ASPNETCORE_ENVIRONMENT=Development`** (checklist)
3. **Verify API environment in the first status poll** (grep "Hosting environment: Development" in log)
4. **Circuit breaker on `search_provider_error` 429** as well as FAILED status
5. **Run max 3 inputs per commit, not 7** — wall clock is dominated by per-job LLM latency, not by setup overhead. Smaller batches are easier to diagnose.

## Phase 2 budget summary

| Item | Jobs | LLM cost (est.) | Wall clock |
|---|---|---|---|
| C0 canary (FAILED, $0 — env issue) | 1 | $0 | 3 min |
| C0 R1 canary (UNVERIFIED) | 1 | ~$0.30 | 2 min (F4 damaged) |
| C0 R1 run2 (TRUE 92) | 1 | ~$0.50 | 9 min |
| C0 R2 runs 1–4 | 4 | ~$1.50 | 35 min (3 F4 damaged, 1 clean) |
| C1 batch (7 FAILED, $0 — auth issue) | 7 | $0 | 15 min wasted |
| C3 canary (TRUE 94) | 1 | ~$0.50 | 14 min |
| C3 R1 run1 (LF 42) | 1 | ~$0.50 | 9 min |
| C3 R2 run1 (FALSE 12) | 1 | ~$0.70 | 17 min |
| C3 R4 run1 (MIXED 52) | 1 | ~$0.90 | 21 min |
| **Total** | **18 submitted** | **~$4.90** | **~125 min** |

Actual cost was **~$5** (well under the $15–30 Shape B budget). 10 of 18 jobs produced real analysis data; 7 were auth-failure garbage ($0); 1 was an env-issue canary ($0).

## Conclusion

Phase 2's primary question — *"did the Apr 8–10 wave worsen report quality?"* — has a clear answer: **yes, specifically via the F4 substring-check at `claim-extraction-stage.ts:1842-1866`, introduced in `8f089ccf` (Apr 8) and hardened in `d1677dd3` (Apr 8).** The check overrides LLM contract-preservation judgments with `String.toLowerCase().includes()` comparisons that fail on German morphology and evaluative claim paraphrasing, forcing `preservesContract: false` → `report_damaged` on ~75% of R2 runs and ~50% of R1 runs.

Removing the substring check (Phase 4, item #3 in the recommended action list) is the single highest-leverage fix for the current quality drift.

---

**Next phase: Phase 3 Change Impact Ledger, built from this report's findings. Then Phase 4 refactor execution.**
