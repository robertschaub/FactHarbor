# Post-Deploy Parity Verification

**Date:** 2026-03-26
**Role:** Senior Developer
**Agent:** Claude Code (Opus 4.6)
**Deployed with:** `deploy-remote.ps1 -ForceConfigs`

---

## 1. Executive Summary

**Full parity confirmed.** Production matches the intended local baseline on all meaningful runtime dimensions: code provenance, non-prompt UCM configs, and prompt content (including QLT-3).

---

## 2. Verified Code Provenance

| Item | Value | Method |
|------|-------|--------|
| Production commit | `cbc4cde47c2b` | Probe job `gitCommitHash` field (admin endpoint) |
| Commit identity | `refactor(metrics): remove deprecated initializeMetrics and update example` | `git log --oneline` |
| Contains QLT-3 (`317319fb`) | **YES** | `git merge-base --is-ancestor` |
| Contains VAL-2 (`f86811fe`) | **YES** | `git merge-base --is-ancestor` |
| Contains OBS-1 (`6e402208`) | **YES** | `git merge-base --is-ancestor` |
| Contains QLT-4 (`b3e85c54`) | **NO** (unpushed, never deployed) | Not ancestor of `cbc4cde4` |

Production is at `cbc4cde4`, which is 3 docs-only commits behind `origin/main` (`26e3a7a4`). The 5 unpushed local commits (QLT-4 add+revert+docs) are net-zero for runtime. **No code parity gap.**

---

## 3. Non-Prompt UCM Config Parity — Directly Verified

| Config | Production Hash | Local Hash | Match |
|--------|----------------|------------|-------|
| `pipeline/default` | `86c66ac67f2dd152...` | `86c66ac67f2dd152...` | **MATCH** |
| `search/default` | `68ba57b606210487...` | `68ba57b606210487...` | **MATCH** |
| `calculation/default` | `b6226d0a5e1b0186...` | `b6226d0a5e1b0186...` | **MATCH** |
| `sr/default` | `9072cfa7e59ba8df...` | `9072cfa7e59ba8df...` | **MATCH** |

All 4 config hashes match exactly. Verified via production admin config API.

---

## 4. Prompt Parity — Directly Verified (Critical)

| Item | Value |
|------|-------|
| Production `prompt/claimboundary` hash | `e44e511a105e161d...` |
| Local `prompt/claimboundary` hash | `e44e511a105e161d...` |
| **Match** | **YES** |
| QLT-3 rules present in production content | **YES** — verified by string search for "counter-narrative", "Facet convergence", "Claim count stability" |

**Prompt parity is proven, not inferred.** The production prompt contains the QLT-3 additions.

---

## 5. Behavioral Spot Checks

| Check | Method | Result |
|-------|--------|--------|
| Probe job created | `POST /api/fh/analyze` with `SELF-TEST` invite | Job `13b4586d` created successfully |
| Commit hash on probe job | Admin endpoint `GET /api/fh/jobs/{id}` with `X-Admin-Key` | `cbc4cde4` — correct |
| System health | `GET /api/fh/system-health` | `systemPaused: false`, LLM circuit closed, no failures |
| VAL-2 verdict badge gate | Code-level verified (commit present) | Not runtime-tested (would require observing a race condition) |
| OBS-1 metrics isolation | Code-level verified (commit present) | Not runtime-tested (would require concurrent jobs + metrics inspection) |

---

## 6. Remaining Unknowns

| Item | Status |
|------|--------|
| Whether probe job will produce correct results | Running — not yet complete at verification time |
| VAL-2 behavioral verification | Would require catching a non-terminal job mid-flight — deferred |
| OBS-1 behavioral verification | Would require concurrent job run + metrics DB inspection — deferred |

These are all code-level verified. Runtime behavioral verification is deferred as low-priority since the commits are confirmed present.

---

## 7. Final Judgment

**Full parity confirmed.**

| Dimension | Status | Method |
|-----------|--------|--------|
| Code | **Match** | Probe job `gitCommitHash` + ancestor checks |
| Non-prompt UCM | **Match** | Direct hash comparison via admin API |
| Prompt (`claimboundary`) | **Match** | Direct hash comparison + content verification via admin API |
| QLT-3 presence | **Confirmed** | String search in production prompt content |

Production is running the correct code (`cbc4cde4`) with the correct configs and the correct prompt. All 4 intended changes (QLT-3, VAL-2, OBS-1, non-prompt config alignment) are confirmed deployed.

---

*Verification performed via production admin API endpoints, git ancestry checks, and probe job submission. No production mutations other than one probe job.*
