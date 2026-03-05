# UCM Configuration Drift — Review & Fix Plan

**Date:** 2026-03-05
**Status:** Ready for team review
**Investigated by:** Senior Developer (Claude Code, Opus 4.6)
**Scope:** All 4 UCM config types (search, calculation, pipeline, SR)
**Action required:** Approve Phase 1 (critical alignment) + decide on Phase 2 (quality tuning)

---

## TL;DR

During ClaimAssessmentBoundary pipeline development, the TypeScript default constants grew with new fields but the JSON default files were not kept in sync — except for pipeline config, which was explicitly aligned on 2026-03-03.

**Impact on deployed pre-release:**
- SR evaluation is using **`gpt-4o-mini`** instead of intended **`gpt-4.1-mini`**
- 17+ calculation config fields are invisible in Admin UI (only exist in code)
- `domainBlacklist` was never populated (search has no domain filtering)

**Fix path:** Update JSON files → push → deploy. The build system propagates automatically.

---

## 1. Issues Found

### 1.1 Issue Summary Table

| # | Issue | Severity | Pre-release affected? | Fix |
|---|-------|----------|-----------------------|-----|
| 1 | SR `openaiModel`: JSON=`gpt-4o-mini`, TS=`gpt-4.1-mini` | **HIGH** | Yes — wrong model in production | Update JSON |
| 2 | Calc JSON missing 17+ fields vs TS defaults | **MEDIUM** | Functionally OK (TS fallbacks work), but invisible to admin | Add fields to JSON |
| 3 | SR JSON: orphaned `defaultScore: 0.45` | **LOW** | No — stripped by Zod validation | Remove from JSON |
| 4 | SR JSON missing 4 fields vs TS | **MEDIUM** | TS fallbacks work, but not tunable | Add fields to JSON |
| 5 | Search JSON minimal (missing nested objects) | **LOW** | No impact — TS fallbacks work | Add fields to JSON |
| 6 | `domainBlacklist` empty — no search domain filtering | **MEDIUM** | Yes — social media pollutes search results | Populate |
| 7 | `evidenceSufficiencyMinSourceTypes: 1` (temp mitigation) | **MEDIUM** | Yes — allows single-genre evidence | Raise to 2 when ready |
| 8 | `selfConsistencyTemperature: 0.4` may inflate spread | **LOW** | Yes — may mis-classify verdict stability | Lower to 0.2–0.3 |
| 9 | No CI check for JSON ↔ TS drift | **LOW** | N/A — prevention | Add test |

### 1.2 Root Cause

Pipeline config was explicitly aligned in commit `3085b91d` ("fix(ucm): align pipeline defaults with runtime behavior"). **The same alignment pass was never done for calculation, search, or SR configs.** As features were added, developers updated `DEFAULT_*_CONFIG` in TypeScript but forgot to sync the JSON files.

### 1.3 `domainBlacklist` — Was It Ever Populated?

**No.** Full git history confirms `domainBlacklist` has been `[]` since UCM creation (2026-01-28). No commit has ever set it to a non-empty array.

The remembered "~13 items" most likely refers to the **SR config's** `skipPlatforms` (4 items) + `skipTlds` (10 items) = **14 items**. These are intact and serve a similar purpose (filtering low-quality domains from source reliability evaluation).

---

## 2. How Config Resolution Works

```
Deployed system loads configs in this order:

1. config.db (SQLite)  ←  active config for each type
     ↑ seeded from:
2. JSON file             ←  apps/web/configs/*.default.json   (FIRST CHOICE)
3. TS constant           ←  config-schemas.ts DEFAULT_*       (FALLBACK if JSON missing)
```

- **Postbuild auto-reseeds:** Every `npm run build` triggers reseed from JSON → config.db
- **User customizations protected:** Reseed skips configs where `created_by ≠ "system"`
- **JSON files ARE in standalone build:** Verified in `.next/standalone/apps/web/configs/`

**Fix deployment path:** Edit JSON → push to main → deploy.sh → build → postbuild reseeds → service restart → fixed.

---

## 3. Fix Plan

### Phase 1: Critical Alignment (P0)

No behavioral changes — purely syncing JSON files with what the TS code already defines.

| Step | What | Files | Risk |
|------|------|-------|------|
| 1a | Fix SR `openaiModel` → `gpt-4.1-mini`, remove orphaned `defaultScore`, add 4 missing fields | `configs/sr.default.json` | None — aligns with existing TS |
| 1b | Add 17+ missing fields to calculation defaults | `configs/calculation.default.json` | None — values match TS |
| 1c | Add missing nested objects to search defaults | `configs/search.default.json` | None — values match TS |
| 1d | Verify: `npm test` + `npm -w apps/web run build` | — | — |
| 1e | Deploy to pre-release | — | Standard deploy |

**Expected outcome:** JSON files become the complete, authoritative source. Admin UI "default comparison" shows all fields. Pre-release SR switches to `gpt-4.1-mini`.

### Phase 2: Quality Improvements (P1) — Decisions needed

These change analysis behavior. Each needs explicit approval.

#### 2a. Populate `domainBlacklist`

**Proposal:** Add social media domains that consistently produce low-quality evidence:

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

**Why:** Social media is opinion-heavy, ephemeral, and rarely contains verifiable factual evidence. Currently all search results from these domains pass through to evidence extraction. The SR config's `skipPlatforms` only filters SR evaluation, not search.

**Risk:** May miss legitimate social media posts that contain newsworthy primary sources. Mitigated by: admin can remove domains via UCM at any time.

**Decision needed:** Approve this list? Add/remove domains?

---

#### 2b. Lower `selfConsistencyTemperature` from 0.4 to 0.2

**Why:** Self-consistency measures verdict stability. Higher temperature introduces random variance that gets confused with genuine evidence-driven instability. Lower temp isolates the signal we actually care about.

**Risk:** Spread thresholds (stable: 5pp, moderate: 12pp, unstable: 20pp) were calibrated at 0.4. At 0.2, fewer verdicts will be classified as "unstable" — this is correct (less noise), but existing reports will look more stable.

**Decision needed:** Approve? Or adjust spread thresholds simultaneously?

---

#### 2c. Raise `gate4QualityThresholdHigh` from 0.7 to 0.75 or 0.8

**Why:** Gate 4 is the final quality barrier before publication. Currently, a high-centrality claim passes with 70% of sources being high/medium probative. With only 3 minimum sources, that's 2.1 → 2 items. Raising to 0.8 requires 2.4 → 3 high-quality items for high-centrality claims.

**Risk:** Some borderline claims may be downgraded to UNVERIFIED. This is arguably correct behavior for a quality gate.

**Decision needed:** 0.75 or 0.8? Or keep 0.7?

---

#### 2d. Align `mixedConfidenceThreshold` from 40 to 45–50

**Why:** Currently there's a gap: claims at 40–49% confidence are labeled "Mixed" but NOT downgraded for high-harm scenarios (which requires `highHarmMinConfidence: 50`). Raising to 50 closes this gap.

**Risk:** More claims labeled "Mixed/Unverified" instead of receiving a directional verdict.

**Decision needed:** 45 or 50?

---

#### 2e. Raise `evidenceSufficiencyMinSourceTypes` from 1 to 2

**Why:** Currently `1` as a temporary mitigation (comment in code: "Temporary mitigation approved 2026-03-03"). This allows claims to be verified by a single source type (e.g., only news articles). Raising to 2 requires at least two different types (news + academic, or news + expert, etc.).

**Risk:** Claims with limited source diversity get flagged as UNVERIFIED. May need domain-diversity fallback to stabilize first.

**Decision needed:** Ready to raise, or keep temporary mitigation?

---

#### 2f. Consider `sourceReliability.defaultScore` from 0.4 to 0.45

**Why:** This is the fallback score for unknown/unrated sources. 0.4 is below neutral (0.5), meaning unknown sources are treated as slightly unreliable by default. 0.45 is "conservative-neutral" — slightly skeptical but less punishing. History: was 0.5, then 0.4, now proposed 0.45.

**Risk:** Unknown sources get slightly more influence in verdicts.

**Decision needed:** 0.4 (status quo), 0.45, or 0.5?

---

### Phase 3: Prevention (P2)

| Step | What |
|------|------|
| 3a | Add vitest test comparing JSON defaults against TS constants for all 4 config types |
| 3b | Fail build if JSON file is missing fields from the TS default constant |
| 3c | Document JSON-is-authoritative convention in AGENTS.md |

---

## 4. Detailed Drift Audit

### 4.1 Pipeline Config — ALIGNED ✓

Fully synchronized (60+ fields). Aligned in commit `3085b91d` (2026-03-03).

### 4.2 Search Config — Moderate drift (low severity)

JSON: 10 top-level fields. TS: ~47 fields including nested objects.

Missing from JSON (all have TS defaults via code fallback):
- `queryGeneration.*` — maxEntitiesPerClaim: 4, maxWordLength: 2, maxSearchTerms: 8, maxFallbackTerms: 6
- `cache.*` — enabled: true, ttlDays: 7
- `providers.*` — full provider configuration block
- `factCheckApi.*` — enabled: false, maxResultsPerClaim: 5, maxAgeDays: 365, fetchFullArticles: true
- `circuitBreaker.*` — enabled: true, failureThreshold: 3, resetTimeoutSec: 300

### 4.3 Calculation Config — Significant drift

17+ fields in TS but missing from JSON:

| Missing Field Group | Values |
|---------------------|--------|
| `probativeValueWeights` | high: 1.0, medium: 0.9, low: 0.5 |
| `verdictStage.spreadMultipliers` | highlyStable: 1.0, moderatelyStable: 0.9, unstable: 0.7, highlyUnstable: 0.4 |
| `verdictStage.institutionalSourceTypes` | peer_reviewed_study, fact_check_report, government_report, legal_document, organization_report |
| `verdictStage.generalSourceTypes` | news_primary, news_secondary, expert_statement, other |
| `evidenceFilter.*` | minStatementLength: 20, maxVaguePhraseCount: 2, requireSourceExcerpt: true, minExcerptLength: 30, requireSourceUrl: true |
| `articleVerdictOverride.*` | misleadingTarget: 35, maxBlendStrength: 0.8, centralRefutedRatioThreshold: 0.5 |
| `claimDecomposition.*` | minCoreClaimsPerContext: 2, minTotalClaimsWithSingleCore: 3, minDirectClaimsPerContext: 2, supplementalRepromptMaxAttempts: 2, shortSimpleInputMaxChars: 60 |
| `tangentialPruning.*` | minEvidenceForTangential: 2 |
| `claimClustering.*` | jaccardSimilarityThreshold: 0.6, duplicateWeightShare: 0.5 |
| `processing.*` | similarityBatchSize: 25, maxEvidenceSelection: 10, maxContextsPerClaim: 5 |
| `contextSimilarity` extras | nearDuplicateNameGuardThreshold: 0.4, anchorRecoveryThreshold: 0.6 |

### 4.4 Source Reliability Config — Value mismatches

| Field | JSON File | TS Constant | Status |
|-------|-----------|-------------|--------|
| `openaiModel` | `gpt-4o-mini` | `gpt-4.1-mini` | **MISMATCH — wrong model deployed** |
| `defaultScore` | `0.45` | Not in SR schema | **ORPHANED** — stripped by Zod (moved to CalcConfig) |
| `evalConcurrency` | missing | 5 | TS fallback used |
| `evalTimeoutMs` | missing | 90000 | TS fallback used |
| `defaultConfidence` | missing | 0.8 | TS fallback used |
| `unknownSourceConfidence` | missing | 0.5 | TS fallback used |

The `openaiModel` was changed in TS on 2026-02-21 (commit `2c5ffa4b`) but the JSON file was never updated.

---

## 5. Lower-Priority Considerations (Not in Fix Plan)

These warrant investigation but don't need immediate action:

| Parameter | Current | Consideration |
|-----------|---------|---------------|
| `maxResults` | 10 | Increase to 12 for more search candidates (+20%, minimal cost) |
| `maxSourcesPerIteration` | 8 | Increase to 10 for better evidence coverage (~25% more API calls) |
| `contestationWeights.established` | 0.5 | May double-penalize contested claims (weight reduction + truthPercentage). Consider 0.6–0.65. |
| `analysisMode` | "quick" | "deep" produces better reports but costs more. Policy decision. |
| `modelExtractEvidence` | "haiku" | Sonnet catches more subtle quality issues but costs 3–4x more |
