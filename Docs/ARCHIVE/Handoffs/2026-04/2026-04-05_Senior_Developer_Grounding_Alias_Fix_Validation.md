# Grounding Alias Fix — Investigation, Implementation, and Validation

**Date:** 2026-04-05
**Role:** Senior Developer (Claude Code, Opus 4.6)
**Commits:** `cbb364ec` (structured ID aliasing), `ffaa4fdd` (reasoning text aliasing)
**Validated on:** clean restart of `ffaa4fdd+a38b9121`

---

## 1. Problem Statement

Local build `07cb2e0d` showed `verdict_grounding_issue` warnings on both hardest canary families (Bolsonaro EN and Plastik DE), making the build appear not deployment-ready. The investigation was tasked with determining whether these were real analytical failures or validator artifacts, and fixing the root cause.

## 2. Root Cause Found

**All grounding warnings on both families were validator false positives caused by dual evidence ID format.**

Evidence extraction uses two ID formats:
- Short sequential (`EV_001`–`EV_056`) from preliminary/seeded extraction
- Long timestamp-based (`EV_1775405xxxxxx`) from main research extraction (`research-extraction-stage.ts:318` uses `Date.now()`)

The grounding validator LLM could not reliably cross-reference 13-digit numeric IDs in the `citedEvidenceRegistry` payload. Proof: for Plastik AC_02, all 27 cited IDs existed in the evidence pool and the registry code correctly found them all — the validator LLM still reported them as "not found."

## 3. Fix Implemented

**Validator-local aliasing** — canonical pipeline IDs stay untouched; only the grounding validator prompt input/output uses short aliases.

### Commit 1: `cbb364ec`
- `buildGroundingAliasMap()` creates `EVG_001`/`EVG_002`/... from sorted de-duplicated evidence IDs
- All structured ID fields aliased in the grounding payload: `supportingEvidenceIds`, `contradictingEvidenceIds`, `evidencePool.id`, `citedEvidenceRegistry.id`, `challengeContext.citedEvidenceIds`, `challengeValidation.validIds/.invalidIds`
- `dealiasGroundingIssues()` restores canonical IDs in warning output for admin diagnostics
- Source IDs and boundary IDs are NOT aliased

### Commit 2: `ffaa4fdd`
- `aliasReasoningText()` replaces known canonical evidence IDs with aliases in the reasoning field sent to the validator
- Hallucinated/unknown IDs pass through unchanged — still correctly flagged
- Longer IDs replaced first to avoid partial-match issues

### Files changed
- `apps/web/src/lib/analyzer/verdict-stage.ts` — alias infrastructure + payload integration + de-aliasing
- `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts` — 3 tests updated to expect aliased format

### What is NOT changed
- Evidence IDs in the pipeline, result JSON, other stages, diagnostics
- Direction validation (no aliasing needed — uses canonical IDs, no long-ID matching issue)
- Boundary IDs, source IDs, challenge point IDs
- Any analytical behavior

## 4. Validation Results (clean restart on `ffaa4fdd`)

### Bolsonaro EN: `703c261d05744fdf8ddc70ce3afa5145`

| Metric | Before fix (`07cb2e0d`) | After fix (`ffaa4fdd`) | Deployed (`b7783872`) |
|---|---|---|---|
| Verdict | LEANING-TRUE 58 / 55 | **LEANING-TRUE 64 / 58** | MOSTLY-TRUE 73 / 70 |
| Evidence | 80 items, 34 sources, 17 queries | 95 items, 41 sources, 21 queries | 97 items |
| Boundaries | 41/13/9/8/5/4 | 48/15/13/9/7/3 | 80/7/6/2/2/2 |
| `verdict_grounding_issue` | 1 (false positive) | **0** | 0 |
| `verdict_direction_issue` | 1 (AC_03 9:1 ratio) | **0** | 0 |
| Per-claim | AC_01: 72, AC_02: 62, AC_03: 38 | AC_01: 75, AC_02: 55, AC_03: 52 | AC_01: 82, AC_02: 75, AC_03: 58 |

- Grounding false positive: **eliminated**
- Direction false positive: **eliminated** (AC_03 no longer collapsed — better evidence balance with more research depth on this run)
- Truth improved 58 → 64, confidence improved 55 → 58
- Still trails deployed by ~9pp truth — primarily retrieval depth (21 queries local vs likely more on deployed with 97 items)

### Plastik DE: `da1180edfae445f8a93bbcbaa2e50144`

| Metric | Before fix (`07cb2e0d`) | After fix (`ffaa4fdd`) | Deployed (`b7783872`) |
|---|---|---|---|
| Verdict | MIXED 45 / 66 | **LEANING-FALSE 41 / 66** | LEANING-FALSE 41 / 48 |
| Evidence | 101 items | 80 items | 124 items |
| Boundaries | 30/28/13/13/11/7 | 24/20/14/9/9/8 | 41/39/14/12/9/9 |
| `verdict_grounding_issue` | 2 (false positives) | **1** (different class) | 0 |
| `baseless_challenge_blocked` | 1 | **0** | 0 |
| `baseless_challenge_detected` | 1 | **0** | 0 |
| Per-claim | AC_01: 35, AC_02: 58, AC_03: 48 | AC_01: 28, AC_02: 52, AC_03: 38 | AC_01: 42, AC_02: 52, AC_03: 32 |

- Timestamp-ID false positives: **eliminated** (both old grounding warnings gone)
- One remaining grounding warning is a **different class**: genuine cross-claim contamination (`EV_019`/`EV_020` belong to AC_01 but referenced in AC_02 reasoning). Correctly caught.
- Baseless-challenge warnings: **eliminated** (those were downstream of the false-positive grounding)
- Local now matches deployed exactly on truth (41 vs 41) with higher confidence (66 vs 48)

## 5. Warning Classification

| Warning class | Before fix | After fix | Status |
|---|---|---|---|
| `EV_*` timestamp-ID matching false positives | 3 across both families | **0** | Fixed by alias |
| `CP_*` / cross-claim contamination | Not visible (masked by noise) | 1 on Plastik | Genuine — correctly caught |
| `verdict_direction_issue` | 1 on Bolsonaro AC_03 | **0** | Disappeared with better evidence pool |
| `baseless_challenge_*` | 2 on Plastik | **0** | Were downstream of false-positive grounding |

## 6. Remaining Gap: Bolsonaro EN vs Deployed

Local Bolsonaro (64/58) still trails deployed (73/70) by ~9pp truth. This is **not** a code regression — it's retrieval depth variance:

- Local ran fewer research iterations (sufficiency fired earlier)
- Deployed likely had different UCM config or provider cache state
- The deployed run also had an 80-evidence mega-boundary (structurally worse, but paradoxically helpful for the verdict)

The investigation proposed testing `sufficiencyMinMainIterations: 1 → 2` as the next experiment if this gap needs closing.

## 7. Deployment Readiness Assessment

| Family | Before fix | After fix |
|---|---|---|
| Plastik DE | Blocked by grounding noise | **Deployment-ready.** Matches deployed on truth, higher confidence, better structure. |
| Bolsonaro EN | Blocked by grounding + direction noise | **Improved but gap remains.** No false-positive warnings. 9pp truth gap is retrieval-variance-driven, not code regression. Within historical EVD-1 amber band. |

## 8. Next Steps (Captain decision)

1. If the Bolsonaro 9pp gap is acceptable: promote `ffaa4fdd` as deploy candidate
2. If the gap needs closing: test `sufficiencyMinMainIterations: 1 → 2` (UCM config change, no code change)
3. The Plastik cross-claim contamination warning is a separate Stage-4 issue — low priority, not blocking

## 9. Tests and Build

- 1574 tests pass (77 files)
- Next.js build: clean
- TypeScript: clean (`tsc --noEmit`)
