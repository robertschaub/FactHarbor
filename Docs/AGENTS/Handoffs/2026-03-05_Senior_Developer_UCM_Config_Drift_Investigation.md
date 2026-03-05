---
### 2026-03-05 | Senior Developer | Claude Code (Opus 4.6) | UCM Configuration Drift Investigation
**Task:** Investigate UCM settings drift during ClaimAssessmentBoundary pipeline development; review defaults for quality; ensure pre-release deployment can be fixed.
**Files touched:** This report only (investigation — no source/config changes).
**Key decisions:** N/A — read-only investigation.
**Open items:** Fix plan below requires implementation + Captain approval on quality tuning values.
**Warnings:** SR `openaiModel` mismatch affects deployed pre-release NOW. Calc config JSON missing 17+ fields.
**For next agent:** See Fix Plan §7 for prioritized, phased remediation.
**Learnings:** Appended to Role_Learnings.md? No (will append after implementation).

---

# UCM Configuration Drift Investigation Report

## 1. Executive Summary

Three categories of issues found:

1. **`domainBlacklist` was NEVER populated in git.** The user's memory of ~13 items most likely refers to `skipPlatforms` (4) + `skipTlds` (10) = 14 items in the SR config, which are intact. If items were ever in `domainBlacklist`, they were set via Admin UI (DB only) and lost when the DB was recreated.

2. **Significant JSON ↔ TypeScript default drift.** During ClaimBoundary pipeline development, many fields were added to TypeScript defaults but never synced to JSON files. Pipeline config was explicitly aligned (commit `3085b91d`), but **calculation, search, and SR configs were not**.

3. **The deployed pre-release is affected.** JSON files take precedence over TS constants in deployment. The SR config is running `gpt-4o-mini` (JSON) instead of `gpt-4.1-mini` (TS intent). Fixing JSON files and redeploying will propagate to the live system automatically.

---

## 2. domainBlacklist Investigation

### Git History — Never Populated

| Date | Commit | Value | Source |
|------|--------|-------|--------|
| 2026-01-28 | `0d8e703` | `[]` | `config-schemas.ts` — UCM creation |
| 2026-02-02 | `9403932` | `[]` | `search.default.json` created |
| 2026-02-04 | `b467e65` | `[]` | v3.0 schema version bump only |
| 2026-02-15 | `b6752d7` | `[]` | Phase 8a — maxResults/maxSourcesPerIteration changed |
| 2026-03-05 | HEAD | `[]` | Both JSON file and TS constant |

No commit in the entire git history has ever set `domainBlacklist` to a non-empty array. No env var (`FH_SEARCH_DOMAIN_BLACKLIST`) exists or was ever referenced.

### Most Likely Confusion: SR Config skip-lists (14 items)

The SR config's `skipPlatforms` (4) + `skipTlds` (10) = **14 items** have been present since SR config creation and serve a similar purpose (filtering low-quality domains). These live in the SR config, not the search config, and are still intact.

---

## 3. JSON ↔ TypeScript Default Drift Audit

### 3.1 Pipeline Config — NO DRIFT ✓

Fully synchronized (60+ fields match). Explicitly aligned in commit `3085b91d` on 2026-03-03.

### 3.2 Search Config — MODERATE DRIFT (low severity)

JSON has 10 fields; TS constant has ~47 fields. The 37 missing fields are all in nested objects (`queryGeneration`, `cache`, `providers`, `factCheckApi`, `circuitBreaker`). These were intentionally kept out of the JSON skeleton — the config system merges TS defaults for missing fields.

**Risk:** Low. Missing fields get TS defaults via Zod `.default()` or `?? fallback` in code.

### 3.3 Calculation Config — SIGNIFICANT DRIFT

**17+ fields present in TypeScript but missing from JSON:**

| Missing Field Group | Fields | Added During |
|---------------------|--------|-------------|
| `probativeValueWeights` | `{ high: 1.0, medium: 0.9, low: 0.5 }` | B-sequence |
| `verdictStage.*` | spreadMultipliers (4 values), institutionalSourceTypes (5), generalSourceTypes (4) | Verdict calibration |
| `evidenceFilter.*` | minStatementLength, maxVaguePhraseCount, requireSourceExcerpt, minExcerptLength, requireSourceUrl | Evidence quality |
| `articleVerdictOverride.*` | misleadingTarget, maxBlendStrength, centralRefutedRatioThreshold | Article verdict |
| `claimDecomposition.*` | 5 params for claim decomposition | Claim decomposition |
| `tangentialPruning.*` | minEvidenceForTangential | Tangential claims |
| `claimClustering.*` | jaccardSimilarityThreshold, duplicateWeightShare | Clustering |
| `processing.*` | similarityBatchSize, maxEvidenceSelection, maxContextsPerClaim | Processing |
| `contextSimilarity` extras | nearDuplicateNameGuardThreshold (0.4), anchorRecoveryThreshold (0.6) | Dedup guards |

**Risk:** MEDIUM. Fields get TS defaults via code fallback, but they are:
- Invisible in Admin UI "default comparison" view
- Not captured in config snapshots unless code explicitly reads them
- Cannot be tuned by admin without editing code

### 3.4 Source Reliability Config — VALUE MISMATCH (HIGH)

| Field | JSON File | TS Constant | Impact |
|-------|-----------|-------------|--------|
| `openaiModel` | `gpt-4o-mini` | `gpt-4.1-mini` | **DEPLOYED IS USING WRONG MODEL** |
| `defaultScore` | `0.45` | Not in SR schema | **ORPHANED** — stripped by Zod validation |
| `evalConcurrency` | missing | 5 | TS default used |
| `evalTimeoutMs` | missing | 90000 | TS default used |
| `defaultConfidence` | missing | 0.8 | TS default used |
| `unknownSourceConfidence` | missing | 0.5 | TS default used |

#### `openaiModel` Mismatch Explained

- **2026-02-02**: SR config created with `openaiModel: "gpt-4o-mini"` (both JSON and TS)
- **2026-02-21**: Commit `2c5ffa4b` changed TS constant to `"gpt-4.1-mini"` — JSON file was NOT updated
- **Today**: JSON still says `gpt-4o-mini`, TS says `gpt-4.1-mini`

**Since deployed pre-release reads JSON first**, the live system is using `gpt-4o-mini` for SR multi-model evaluation.

#### `defaultScore: 0.45` is Orphaned

The `defaultScore` field was removed from the SR Zod schema (it moved to `CalcConfig.sourceReliability.defaultScore`). The value `0.45` in `sr.default.json` is harmlessly stripped during Zod validation. The effective fallback score for unknown sources comes from `CalcConfig.sourceReliability.defaultScore = 0.4` (both JSON and TS agree).

---

## 4. Deployment Config Resolution (Pre-Release Impact)

### How the Deployed System Resolves Configs

```
Config Resolution Priority:
1. config.db active config (if user-customized → preserved)
2. config.db system default (if created by "system" → refreshable)
   ↑ Seeded from:
3. JSON file (apps/web/configs/*.default.json) — FIRST CHOICE
4. TS constant (config-schemas.ts DEFAULT_*) — FALLBACK if JSON missing/invalid
```

### Key Facts for Pre-Release Fix

1. **JSON files ARE in the standalone build** — verified: `apps/web/.next/standalone/apps/web/configs/` contains identical copies
2. **`postbuild` reseeds automatically** — runs after every `npm run build`, including during deployment
3. **Reseed respects user customizations** — only overwrites system-created defaults (created_by="system")
4. **Fix workflow**: Edit JSON files → `git push main` → `deploy.sh` pulls, builds, reseeds → live system updated
5. **If active config was user-customized** (unlikely but check): use `--force` flag on reseed script

### Risk: Lost User Customizations

If someone customized configs via Admin UI on the pre-release:
- `ensureDefaultConfig()` skips those (protected)
- Reseed also skips them (normal mode)
- To override: `npx tsx scripts/reseed-all-prompts.ts --force --configs`
- **Recommend: Check Admin UI on pre-release BEFORE redeploying** to see if any user customizations exist

---

## 5. Default Value Quality Review

### Values That Should Be Improved

#### 5.1 HIGH PRIORITY — Fix Immediately (broken or clearly wrong)

| Config | Field | Current | Recommended | Rationale |
|--------|-------|---------|-------------|-----------|
| SR | `openaiModel` | `gpt-4o-mini` (JSON) | `gpt-4.1-mini` | Align with TS intent. gpt-4.1-mini is the current generation model. |
| SR | `defaultScore` | `0.45` (orphaned) | Remove from sr.default.json | Field doesn't exist in SR schema — it's vestigial. Effective value comes from calc config (0.4). |

#### 5.2 MEDIUM PRIORITY — Improve Report Quality

| Config | Field | Current | Recommended | Rationale |
|--------|-------|---------|-------------|-----------|
| Search | `domainBlacklist` | `[]` | See §5.3 below | Pre-filter known low-quality domains at search stage |
| Calc | `evidenceSufficiencyMinSourceTypes` | 1 | 2 | Temporary mitigation (comment says so). Require minimum genre diversity. |
| Calc | `gate4QualityThresholdHigh` | 0.7 | 0.75-0.8 | Stricter final quality gate for high-centrality claims |
| Calc | `mixedConfidenceThreshold` | 40 | 45-50 | Align closer to `highHarmMinConfidence: 50` to prevent gap |
| Pipeline | `selfConsistencyTemperature` | 0.4 | 0.2-0.3 | Lower temp better isolates evidence-driven instability from sampling noise |
| SR | `defaultScore` (in calc config) | 0.4 | 0.45 | True neutral is 0.5; 0.4 is overly skeptical for unknown sources. 0.45 is a reasonable conservative-neutral. |

#### 5.3 domainBlacklist — Recommended Initial Population

Domains that consistently produce low-quality evidence for fact-checking analysis. These are **search-stage filters** (complement SR's `skipPlatforms` which only affect SR evaluation):

```json
"domainBlacklist": [
  "facebook.com",
  "twitter.com",
  "x.com",
  "reddit.com",
  "instagram.com",
  "tiktok.com",
  "pinterest.com",
  "quora.com"
]
```

**Rationale:** Social media platforms are opinion-heavy, ephemeral, and rarely contain verifiable factual evidence suitable for fact-checking. They should be excluded from search results. 8 items — close to the user's memory of ~13.

**Note:** Content farms and known misinformation sites (naturalnews.com, beforeitsnews.com, etc.) are also candidates but more controversial to hardcode — better as UCM admin additions post-launch.

#### 5.4 LOWER PRIORITY — Investigate Further Before Changing

| Config | Field | Current | Consideration |
|--------|-------|---------|---------------|
| Search | `maxResults` | 10 | Could increase to 12 for more search candidates. Low cost impact. |
| Search | `maxSourcesPerIteration` | 8 | Could increase to 10. Helps multi-claim analyses. ~25% more API calls. |
| Calc | `contestationWeights.established` | 0.5 | May over-suppress contested claims (double penalty with truthPercentage). Consider 0.6-0.65. |
| Pipeline | `analysisMode` | "quick" | "deep" produces better reports but costs more. Policy decision. |
| Pipeline | `modelExtractEvidence` | "haiku" | Sonnet would catch more subtle evidence quality issues but costs 3-4x more. |

---

## 6. Summary of All Issues Found

| # | Issue | Severity | Deployed? | Fix Difficulty |
|---|-------|----------|-----------|----------------|
| 1 | SR `openaiModel` JSON≠TS (`gpt-4o-mini` vs `gpt-4.1-mini`) | **HIGH** | Yes — using old model | Easy: update JSON |
| 2 | SR `defaultScore: 0.45` orphaned in JSON | **LOW** | Harmless — stripped by Zod | Easy: remove field |
| 3 | Calc JSON missing 17+ fields vs TS | **MEDIUM** | Partial — TS fallbacks work but invisible to admin | Medium: add fields to JSON |
| 4 | Search JSON minimal (missing nested objects) | **LOW** | No impact — TS fallbacks work | Medium: add fields to JSON |
| 5 | SR JSON missing 4 fields vs TS | **MEDIUM** | Partial — TS fallbacks work | Easy: add fields to JSON |
| 6 | `domainBlacklist` empty (never populated) | **MEDIUM** | Yes — no domain filtering | Easy: add domains to JSON |
| 7 | `evidenceSufficiencyMinSourceTypes: 1` temporary | **MEDIUM** | Yes — weak genre diversity | Easy: change to 2 (when ready) |
| 8 | `selfConsistencyTemperature: 0.4` may be too high | **LOW** | Yes — may inflate spread | Easy: lower to 0.2-0.3 |
| 9 | No drift CI check | **LOW** | N/A — prevention | Medium: add test |

---

## 7. Fix Plan (Prioritized, Phased)

### Phase 1: Critical Alignment (P0 — do first)

**Goal:** Fix the deployed pre-release NOW. Align JSON files with TS constants.

| Step | Action | Files |
|------|--------|-------|
| 1a | Update `sr.default.json`: `openaiModel` → `gpt-4.1-mini`, remove orphaned `defaultScore`, add 4 missing fields | `apps/web/configs/sr.default.json` |
| 1b | Update `calculation.default.json`: add all 17+ missing fields from `DEFAULT_CALC_CONFIG` | `apps/web/configs/calculation.default.json` |
| 1c | Update `search.default.json`: add missing nested objects from `DEFAULT_SEARCH_CONFIG` | `apps/web/configs/search.default.json` |
| 1d | Verify: `npm test` + `npm -w apps/web run build` | — |
| 1e | Deploy to pre-release (standard deploy.sh) | — |

### Phase 2: Quality Improvements (P1 — Captain approval needed)

**Goal:** Improve report quality with evidence-backed default changes.

| Step | Action | Needs Approval |
|------|--------|---------------|
| 2a | Populate `domainBlacklist` with social media domains | Yes — which domains |
| 2b | Adjust `selfConsistencyTemperature` 0.4 → 0.2 | Yes — may change spread classifications |
| 2c | Adjust `gate4QualityThresholdHigh` 0.7 → 0.75 or 0.8 | Yes — may flag more claims as UNVERIFIED |
| 2d | Align `mixedConfidenceThreshold` closer to `highHarmMinConfidence` | Yes — affects verdict labeling |
| 2e | Raise `evidenceSufficiencyMinSourceTypes` 1 → 2 (remove temp mitigation) | Yes — needs domain-diversity fallback stability |
| 2f | Consider `sourceReliability.defaultScore` 0.4 → 0.45 (calc config) | Yes — affects unknown source treatment |

### Phase 3: Prevention (P2 — after fix)

| Step | Action |
|------|--------|
| 3a | Add vitest test that compares JSON defaults against TS constants for all 4 config types |
| 3b | Fail build if JSON file is missing fields that exist in the TS default constant |
| 3c | Document the JSON-is-authoritative convention in AGENTS.md |

### Deployment Notes

- **Standard deploy** (`deploy.sh`): pulls git, builds, postbuild reseeds from JSON → config.db. Automatic.
- **If pre-release has user-customized configs**: check Admin UI first. Use `--force` flag to override.
- **No downtime needed**: config refresh happens on next DB connection (app restart via systemd).
- **Verify after deploy**: use Admin UI → Config → "Active Config" tab for each type, or `GET /api/admin/config/{type}/drift`.
