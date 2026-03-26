# Local vs Deployed Parity Investigation

**Date:** 2026-03-26
**Role:** Senior Developer
**Agent:** Claude Code (Opus 4.6)
**Deployed commit:** `840e58d61fc06843c78e51417f4aa0b21ce7a905`
**Local HEAD:** `37d9f90c` (22 commits ahead of deployed)
**Deployment method:** `deploy-remote.ps1 -ForceConfigs`

---

## 1. Executive Summary

Local is 22 commits ahead of deployed. The meaningful runtime differences are:

1. **Prompt (QLT-3):** Local has 3 additional facet-consistency rules in the `claimboundary` prompt that production does NOT have. This is the single largest behavioral difference.
2. **Metrics (OBS-1):** Local uses per-job `AsyncLocalStorage` metrics isolation. Production uses the old module-global collector. No verdict impact, but concurrent jobs on production still corrupt each other's metrics.
3. **VAL-2:** Local gates verdict badge on terminal status and enforces monotonic progress. Production does not — non-terminal jobs can still show premature verdicts.
4. **Non-prompt UCM configs:** Identical file defaults → production was force-reseeded at deployment → **likely same**.
5. **QLT-4:** Net-zero. Added and reverted locally — never deployed, no residue.

---

## 2. Proven Facts

| Fact | Evidence |
|------|----------|
| Deployed commit is `840e58d6` | User-provided |
| Local HEAD is `37d9f90c`, 22 commits ahead | `git log --oneline 840e58d6..HEAD` |
| QLT-3 prompt commit (`317319fb`) is NOT ancestor of deployed | `git merge-base --is-ancestor` → NO |
| All 4 config default files (pipeline/search/calc/sr) are IDENTICAL between deployed and local | `git diff 840e58d6..HEAD` shows zero diff on all `.default.json` and `config-schemas.ts` |
| `config-schemas.ts` is IDENTICAL | QLT-4 schema fields were added then reverted → net zero |
| Deploy used `-ForceConfigs` | User-provided; maps to `reseed-all-prompts.ts --force --configs` |
| Local UCM drift was cleaned | Pipeline config reseeded from file default (stale experiment keys removed) |

---

## 3. High-Confidence Inferences

| Inference | Basis | Confidence |
|-----------|-------|------------|
| Production non-prompt configs match file defaults | `-ForceConfigs` force-reseeded at deployment; file defaults are identical | **High** |
| Production `claimboundary` prompt does NOT have QLT-3 | QLT-3 commit is not ancestor of deployed; deploy reseeded prompts normally (skip if unchanged) | **High** |
| Production `claimboundary` prompt matches the deployed commit's file | Normal prompt reseed updates if file hash changed; the file at `840e58d6` is the pre-QLT-3 version | **High** |
| Production metrics use module-global collector | OBS-1 commit (`6e402208`) is not in deployed | **High** |
| Production jobs list shows premature verdicts | VAL-2 commit (`f86811fe`) is not in deployed | **High** |

---

## 4. Unknowns (require prod admin access)

| Unknown | Why | How to verify |
|---------|-----|---------------|
| Exact production `config.db` active hashes | Cannot inspect remote DB without SSH | `ssh` + `sqlite3 /opt/factharbor/data/config.db "SELECT ..."` |
| Whether prod admin manually customized any config after deployment | Deploy force-reseeds, but admin could change afterward via UI | Check `config_active.activated_utc` > deployment time |
| Whether prod `claimboundary` prompt was admin-edited post-deploy | Unlikely but possible | Compare prod active prompt hash vs deployed file hash |

---

## 5. Code Parity Table

| Component | File(s) | Deployed (840e58d6) | Local (37d9f90c) | Status | Impact |
|-----------|---------|--------------------|--------------------|--------|--------|
| **Monotonic progress guard** | `JobService.cs` | Missing | Present (VAL-2) | **Different** | UX: prod can show backward progress |
| **Verdict badge terminal gate** | `jobs/page.tsx` | Missing | Present (VAL-2) | **Different** | UX: prod shows premature verdicts |
| **Metrics isolation** | `metrics-integration.ts` | Module-global | AsyncLocalStorage (OBS-1) | **Different** | Observability: prod metrics corrupted under concurrency |
| **Pipeline metrics wrapping** | `claimboundary-pipeline.ts` | `initializeMetrics()` | `runWithMetrics()` | **Different** | Follows from OBS-1 |
| **Trailing newline** | `research-extraction-stage.ts` | Missing | Present | Same (whitespace) | None |
| **Prompt: QLT-3 rules** | `claimboundary.prompt.md` | Missing 3 rules | Has QLT-3 rules | **Different** | Analysis: facet consistency for comparative inputs |
| **Config schemas** | `config-schemas.ts` | Identical | Identical | **Same** | QLT-4 added+reverted = net zero |
| **Config defaults** | `*.default.json` | Identical | Identical | **Same** | — |
| **QLT-4 experiment** | Multiple files | Never present | Added+reverted = absent | **Same** | Net zero |

---

## 6. UCM Parity Table

| Config Type | Local Active Hash | Local Source | Prod Likely State | Parity |
|-------------|-------------------|-------------|-------------------|--------|
| `pipeline/default` | `86c66ac6...` | File default (reseeded today) | File default (force-reseeded at deploy) | **Likely same** (same file) |
| `search/default` | `68ba57b6...` | Activated 2026-03-19 | Force-reseeded at deploy from same file | **Likely same** |
| `calculation/default` | `b6226d0a...` | Reseeded today (QLT-4 cleanup) | Force-reseeded at deploy from same file | **Likely same** |
| `sr/default` | `9072cfa7...` | Activated 2026-03-11 | Force-reseeded at deploy from same file | **Likely same** |
| `prompt/claimboundary` | `e44e511a...` | File default (includes QLT-3) | File default at `840e58d6` (pre-QLT-3) | **Different** |

---

## 7. Prompt Parity — `claimboundary`

| Source | Content | QLT-3 Rules |
|--------|---------|-------------|
| Deployed file (`840e58d6:apps/web/prompts/claimboundary.prompt.md`) | Pre-QLT-3 | **Missing** |
| Local file (`apps/web/prompts/claimboundary.prompt.md`) | Post-QLT-3 | **Present** (3 rules: no counter-narrative, facet convergence, claim count stability) |
| Local active UCM (`prompt/claimboundary` hash `e44e511a...`) | Post-QLT-3 | **Present** (reseeded from local file) |
| Prod active UCM (inferred) | Pre-QLT-3 | **Missing** (reseeded from deployed file at deploy time) |

**The prompt is the single meaningful analytical difference between local and production.** QLT-3 added 3 rules that stabilize facet decomposition for comparative/evaluative inputs (Muslims-family claim count 2-3→3-3, direction S+C/X→all S, spread 27→21pp).

---

## 8. Final Judgment

### Clearly different (local has, production does not)

| Change | Commit | Impact | Deploy priority |
|--------|--------|--------|----------------|
| **QLT-3 prompt rules** | `317319fb` | Analytical: reduces facet instability for Muslims-type inputs | **High** — improves quality |
| **VAL-2 verdict badge gate** | `f86811fe` | UX: prevents premature verdict display | **High** — improves trust |
| **VAL-2 monotonic progress** | `f86811fe` | UX: prevents backward progress | **Medium** |
| **OBS-1 metrics isolation** | `6e402208` | Observability: fixes concurrent metrics corruption | **Medium** |

### Likely same

| Area | Reason |
|------|--------|
| Non-prompt UCM configs (pipeline/search/calc/sr) | Same file defaults; both force-reseeded |
| Config schemas | Identical (QLT-4 net zero) |
| Article-level contrarian (D5) | Unchanged |

### Unknown (require prod admin access)

| Item | How to verify |
|------|---------------|
| Exact prod prompt/config active hashes | SSH + sqlite3 |
| Whether admin edited configs post-deploy | Check `activated_utc` timestamps |

---

## 9. Deployment Recommendation

The next deploy should include all local-only changes. Suggested deploy command:

```bash
.\scripts\deploy-remote.ps1 -ForceConfigs
```

This would:
1. Deploy the QLT-3 prompt fix (the most impactful change)
2. Deploy VAL-2 UI/API fixes
3. Deploy OBS-1 metrics isolation
4. Force-reseed non-prompt configs (already matching, but ensures parity)
5. Reseed prompts (would pick up the QLT-3 claimboundary change)

No risk of deploying QLT-4 — it's fully reverted.

---

*Investigation based on git diff, local UCM inspection, and deploy script analysis. No production mutations performed.*
