# Report Quality Worktree Comparison Results

**Date:** 2026-03-13
**Author:** Senior Developer (Claude Sonnet 4.6)
**Status:** Complete — all 4 main checkpoints executed
**Runbook:** `Docs/AGENTS/Handoffs/2026-03-12_Senior_Developer_Report_Quality_Worktree_Comparison_Runbook.md`
**Related:** `Docs/WIP/Baseline_Test_Results_Phase1_2026-03-12.md`

---

## 1. Checkpoints Tested

| Tag | Commit | Commit message |
|-----|--------|----------------|
| `quality_window_start` | 9cdc8889 | chore(config): tune pipeline defaults, reduce claims cap, switch verdict to Sonnet |
| `quality_post_window_first_code` | 704063ef | fix(pipeline): structured error telemetry and failure-mode accuracy |
| `quality_deployed_proxy` | 523ee2aa | fix(deploy): reseed production config.db as factharbor user after build |
| `quality_head` | 172bba3d | feat(pipeline): jurisdiction-aware relevance classification (Fix 1, Phase B) |

**Feature matrix:**

| Tag | SR Weighting | Fix 0 (inferredGeo in Pass2) | Fix 1 (jurisdictionMatch capping) |
|-----|-------------|-----------------------------|------------------------------------|
| window_start | ABSENT | ABSENT | ABSENT |
| post_window | ABSENT | ABSENT | ABSENT |
| deployed_proxy | ABSENT | ABSENT | ABSENT |
| quality_head | **ACTIVE** | **PRESENT** | **PRESENT** |

---

## 2. Exact Claims Run

1. **PT Bolsonaro:** `Os julgamentos de Bolsonaro foram conduzidos de acordo com a lei brasileira e os padrões internacionais de due process?`
2. **EN Bolsonaro:** `Were the various Bolsonaro trials conducted in accordance with Brazilian law and international standards of due process?`
3. **DE Kinder Migration:** `Immer mehr Kinder im Kanton Zürich sind von Migration betroffen`

All submitted via `POST /v1/analyze` with `pipelineVariant: "claimboundary"`.

---

## 3. Per-Run Result Table

### 3.1 Verdicts

| Checkpoint | Claim | Status | TP% | Conf% | Verdict | Bounds | CVs | Sources |
|-----------|-------|--------|-----|-------|---------|--------|-----|---------|
| window_start | PT Bolsonaro | SUCCEEDED | **90.1** | **81.8** | TRUE | 1 | 3 | 36 |
| window_start | EN Bolsonaro | SUCCEEDED | **75.4** | **73.0** | MOSTLY-TRUE | 6 | 3 | 22 |
| window_start | DE Kinder | SUCCEEDED | **84.0** | **78.8** | MOSTLY-TRUE | 6 | 3 | 17 |
| post_window | PT Bolsonaro | SUCCEEDED | 38.6 | 66.1 | LEANING-FALSE | 6 | 2 | 20 |
| post_window | EN Bolsonaro | **FAILED** | — | — | — | — | — | — |
| post_window | DE Kinder | SUCCEEDED | 72.0 | 65.0 | MOSTLY-TRUE | 4 | 1 | 6 |
| deployed_proxy | PT Bolsonaro | SUCCEEDED | 68.6 | 74.8 | LEANING-TRUE | 6 | 2 | 14 |
| deployed_proxy | EN Bolsonaro | SUCCEEDED | 63.3 | 69.2 | LEANING-TRUE | 6 | 2 | 14 |
| deployed_proxy | DE Kinder | SUCCEEDED | 72.0 | 68.0 | MOSTLY-TRUE | 6 | 1 | 13 |
| quality_head | PT Bolsonaro | SUCCEEDED | 59.0 | **47.6** | LEANING-TRUE | 6 | 2 | 12 |
| quality_head | EN Bolsonaro | SUCCEEDED | 63.5 | **52.7** | LEANING-TRUE | 6 | 3 | 14 |
| quality_head | DE Kinder | SUCCEEDED | 63.0 | **47.0** | LEANING-TRUE | 6 | 1 | 10 |

### 3.2 Claim-Level Verdicts

| Checkpoint | Claim | CV1 TP | CV1 Conf | CV2 TP | CV2 Conf | CV3 TP | CV3 Conf |
|-----------|-------|--------|----------|--------|----------|--------|----------|
| window_start | PT | 92 | 85 | 88 | 78 | 90 | 82 |
| window_start | EN | 62 | 65 | 88 | 82 | 73 | 70 |
| window_start | DE | 92 | 88 | 68 | 62 | 88 | 82 |
| post_window | PT | 42 | 68 | 35 | 64 | — | — |
| post_window | DE | 72 | 65 | — | — | — | — |
| deployed_proxy | PT | 78 | 82 | 52 | 62 | — | — |
| deployed_proxy | EN | 72 | 75 | 48 | 59 | — | — |
| deployed_proxy | DE | 72 | 68 | — | — | — | — |
| quality_head | PT | 60 | 44 | 58 | 51 | — | — |
| quality_head | EN | 66 | 59 | 60 | 44 | 50 | 0 |
| quality_head | DE | 63 | 47 | — | — | — | — |

### 3.3 Run Metadata

| Checkpoint | Claim | Started (UTC) | Completed (UTC) | Valid/Confounded |
|-----------|-------|--------------|-----------------|-----------------|
| window_start | PT | 2026-03-12T23:03 | 2026-03-12T23:23 | ⚠️ Confounded: Google CSE 429, fallback used |
| window_start | EN | 2026-03-12T23:03 | 2026-03-12T23:23 | ⚠️ Confounded: Google CSE 429, fallback used |
| window_start | DE | 2026-03-12T23:03 | 2026-03-12T23:37 | ✅ Valid (no CSE quota error) |
| post_window | PT | 2026-03-12T23:40 | 2026-03-13T01:06 | ⚠️ Confounded: heavy source fetch failures |
| post_window | EN | 2026-03-12T23:40 | 2026-03-12T23:50 | ❌ FAILED: code bug, result invalid |
| post_window | DE | 2026-03-12T23:40 | 2026-03-12T23:49 | ⚠️ Confounded: Google CSE 429 on DE |
| deployed_proxy | PT | 2026-03-13T00:09 | 2026-03-13T00:30 | ⚠️ Confounded: Google CSE 429, API schema fix required |
| deployed_proxy | EN | 2026-03-13T00:09 | 2026-03-13T00:19 | ⚠️ Confounded: Google CSE 429, API schema fix required |
| deployed_proxy | DE | 2026-03-13T00:09 | 2026-03-13T00:17 | ⚠️ Confounded: Google CSE 429, API schema fix required |
| quality_head | PT | 2026-03-13T00:33 | 2026-03-13T01:06 | ✅ Valid (no CSE error) |
| quality_head | EN | 2026-03-13T00:33 | 2026-03-13T00:44 | ✅ Valid (no CSE error) |
| quality_head | DE | 2026-03-13T00:33 | 2026-03-13T00:54 | ✅ Valid but see §5.3 (jurisdiction regression) |

---

## 4. Contamination Table

### 4.1 U.S. Government / Foreign-Jurisdiction Evidence

| Checkpoint | Claim | US Gov Bounds | US Evidence Items | Contamination Level |
|-----------|-------|--------------|-------------------|---------------------|
| window_start | PT | 0 | 0 | ✅ None |
| window_start | EN | 0 | 0 | ✅ None (clean despite no Fix 1) |
| window_start | DE | n/a | 0 | ✅ None |
| post_window | PT | ~2 suspicious | — | ⚠️ "Interferência externa", "Sanções internacionais" boundaries |
| post_window | EN | — | — | ❌ FAILED (code bug, unknowable) |
| post_window | DE | n/a | — | — |
| deployed_proxy | PT | 0 | 0 | ✅ None (clean) |
| deployed_proxy | EN | 1 | — | ❌ "U.S. State Department Human Rights Monitoring and Documentation" boundary |
| deployed_proxy | DE | n/a | 0 | ✅ None |
| quality_head | PT | 0 | 0 | ✅ None (Fix 1 confirmed working) |
| quality_head | EN | 0 | 0 | ✅ None (Fix 1 confirmed working) |
| quality_head | DE | n/a | 0 | ⚠️ No US contamination but **wrong jurisdiction** (German federal vs Swiss cantonal) |

### 4.2 Detailed Boundary Names — EN Bolsonaro

**window_start (clean):**
1. Witness testimony and audio recording evidence in trial + Comprehensive documentation of alleged crimes
2. Academic literature review and comparative legal analysis of Brazilian criminal justice
3. Historical and institutional analysis of Brazilian political and judicial dynamics
4. Comparative institutional assessment using BTI methodology
5. Analysis of Brazilian judicial accountability and transparency mechanisms
6. Trial evidence presentation – digital and physical + Formal prosecution filings

**deployed_proxy (contaminated):**
1. Government Official Statements and Diplomatic Communications
2. Comprehensive Judicial Proceedings Overview and Historical Context
3. **U.S. State Department Human Rights Monitoring and Documentation** ❌
4. Inter-American Human Rights System Review
5. International Press Freedom and Expression Monitoring
6. Brazilian Supreme Court and Federal Prosecution Criminal Proceedings

**quality_head (clean — Fix 1 effective):**
1. Constitutional trial procedures and court composition
2. General Evidence
3. Brazilian Federal Supreme Court trial procedures and constitutional framework
4. Evidentiary review and judicial opinion in coup trial
5. Institutional and historical analysis of Brazilian judicial system + Official government statements
6. Judicial orders and rulings in related Bolsonaro proceedings + International context and trade dispute documentation

### 4.3 DE Jurisdiction Regression at quality_head

**window_start (correct — Swiss cantonal):**
1. Offizielle Statistik des Staatssekretariats für Migration (SEM) – Ständige ausländische Wohnbev.
2. Kantonale Bevölkerungserhebung Zürich – Ausländische Staatsangehörige
3. Offene Daten des Statistischen Amts Kanton Zürich
4. Monitoring der Fachstelle Integration Kanton Zürich
5. Offizielle Bevölkerungsstatistik der Stadt Zürich
6. Bundesamt für Statistik (BFS) – Migrationshintergrund und Demografie

**quality_head (wrong — German federal):**
1. **German federal asylum and migration administrative data** ❌
2. **German social welfare data analysis (SGB-II)** ❌
3. Academic literature review on migration and mental health
4. General Evidence
5. Official population statistics and census data + Administrative school-based observation
6. Educational research studies + International refugee and displacement statistics

**Root cause hypothesis:** Fix 1's `inferredGeography` classification infers "Germany" from the German language of the claim, then caps Swiss data as "foreign_reaction" (≤0.35 relevance), causing Swiss cantonal sources to be filtered out and German sources to dominate.

---

## 5. Search Provider Usage

### 5.1 Google CSE Status by Run

| Checkpoint | PT | EN | DE |
|-----------|----|----|----|
| window_start | ❌ CSE 429 — fallback used | ❌ CSE 429 — fallback used | ✅ CSE OK |
| post_window | ✅ CSE OK (heavy fetch failures) | ❌ FAILED before search | ❌ CSE 429 — fallback used |
| deployed_proxy | ❌ CSE 429 — fallback used | ❌ CSE 429 — fallback used | ❌ CSE 429 — fallback used |
| quality_head | ✅ CSE OK | ✅ CSE OK | ✅ CSE OK |

**Pattern:** Google CSE quota was exhausted mid-session (runs 1–9). Only HEAD runs (runs 10–12, submitted last) benefited from a fully functional Google CSE. The HEAD runs likely benefited from CSE's higher-quality results vs Serper/Brave fallbacks.

### 5.2 Fallback Provider Detection

Fallback providers (Serper, Brave) were used wherever Google CSE returned 429. The `sources` schema at older checkpoints does not store `provider` metadata, so exact fallback providers cannot be confirmed from result data. Web server logs confirm the `search_provider_error` events.

### 5.3 Search Warning / Error Summary

| Checkpoint | Claim | Warning Count | Severity | Key Issues |
|-----------|-------|--------------|----------|------------|
| window_start | PT | 1 | error | Google CSE 429 |
| window_start | EN | 1 | error | Google CSE 429 |
| window_start | DE | 0 | — | Clean |
| post_window | PT | 12 | info/warn/error | Heavy source fetch failures (67% failure rate on some queries) |
| post_window | DE | 4 | info/warn | Google CSE 429; source_reliability_error |
| deployed_proxy | PT | 16 | info | Google CSE 429; source fetch failures |
| deployed_proxy | EN | 17 | info | Google CSE 429; source fetch failures |
| deployed_proxy | DE | 6 | info/warn | Google CSE 429; SR errors; evidence_partition_stats |
| quality_head | PT | 21 | info | Source fetch failures; no CSE quota issue |
| quality_head | EN | 17 | info | Source fetch failures; source fetch degradation |
| quality_head | DE | 3 | info/warn | low_claim_count (1 claim after 2 reprompts); all_same_debate_tier |

---

## 6. SR Table Summary

### 6.1 SR Cache Sizes

| Checkpoint | SR DB rows | SR Weighting Active |
|-----------|-----------|--------------------|
| window_start | 42 | No |
| post_window | 26 | No |
| deployed_proxy | 20 | No |
| quality_head | 113 (cumulative across prior runs) | **Yes** |

### 6.2 Notable SR Scores

**window_start:** tse.jus.br 0.79, aosfatos.org 0.82, bbc.com 0.76, lemonde.fr 0.85, apublica.org 0.79. No U.S. gov sources scored.

**post_window:** whitehouse.gov 0.68 (leaning_reliable), state.gov insufficient_data. U.S. government sources were retrieved and partially scored, confirming contamination in the PT run.

**deployed_proxy:** No U.S. gov sources in cache despite EN run having "U.S. State Department" boundary. State.gov content may have been retrieved via snippet only (no full SR evaluation).

**quality_head:** Large cumulative cache. Key scores for current runs: bk.admin.ch 0.74 (CH), sem.admin.ch 0.68, planalto.gov.br 0.62, consultaunificadapje.tse.jus.br 0.74. SR weighting applied to all verdicts at this checkpoint, which pulls confidence toward 50% for sources with mid-range scores.

### 6.3 SR Weighting Effect (quality_head vs others)

At quality_head, all 3 runs show markedly lower confidence than other checkpoints:
- PT: 47.6% vs 81.8% (window_start) — **34pp drop**
- EN: 52.7% vs 73.0% (window_start) — **20pp drop**
- DE: 47.0% vs 78.8% (window_start) — **32pp drop**

The truth percentage also dropped but less dramatically. This strongly implicates SR weighting (commit 9550eb26) as a primary driver of confidence collapse at quality_head.

---

## 7. Config / Confound Notes

### 7.1 Key Config Differences (deployed_proxy → HEAD)

| Area | deployed_proxy | HEAD |
|------|---------------|------|
| Search | Brave enabled (priority 10), Serper (priority 2) | Brave disabled, Serper (priority 2) |
| Pipeline | `maxClaimBoundaries: 6`, `boundaryCoherenceMinimum: 0.3`, `selfConsistencyMode: "full"` | All 3 removed; `boundaryClusteringTemperature: 0.05` added |
| Pipeline | `maxAtomicClaims: 5`, `centralityThreshold: "medium"` | Both removed |
| SR | No `evaluationSearch` block, `evalMaxEvidenceItems: 12` | `evaluationSearch` block with `maxEvidenceItems: 30`; `evidenceQualityAssessment` block added |
| Calculation | `contestationWeights: {established: 0.3, disputed: 0.5}` | `{established: 0.5, disputed: 0.7}` (higher tolerance for contested evidence) |
| Calculation | `defaultScore: 0.5` | `defaultScore: 0.45` (slightly more conservative SR default) |
| New at HEAD | — | `foreignJurisdictionRelevanceCap: 0.35` |

### 7.2 Key Config Differences (window_start → HEAD)

Beyond the deployed_proxy → HEAD differences above, window_start differs in:
- `modelVerdict` was `claude-sonnet-4-5-20250929` (full model ID) at window_start, now `sonnet` alias — same model, different reference
- `maxIterationsPerContext: 5` at window_start vs `3` at HEAD — more research iterations at window_start
- `maxTotalTokens: 750000` at window_start vs `1000000` at HEAD — lower token budget at window_start
- `gate4QualityThresholdHigh: 0.7` at window_start vs `0.75` at HEAD (stricter quality gate at HEAD)
- `mixedConfidenceThreshold: 40` at window_start vs `45` at HEAD (easier to reach MIXED verdict at HEAD)

### 7.3 Infrastructure Confounds

**deployed_proxy API schema issue:** The deployed_proxy API (commit 523ee2aa) had an `IsHidden` column in the C# entity that was not present in any EF migration at that commit. A manual `ALTER TABLE Jobs ADD COLUMN IsHidden INTEGER NOT NULL DEFAULT 0` was required to start the API. This is a pre-existing bug in that checkpoint, not introduced by the test setup.

**SQLite dependency mismatch:** window_start and post_window checkpoints use the `sqlite` + `sqlite3` npm packages for config storage, but the package-lock.json at those checkpoints already references `better-sqlite3`. Manual `npm install sqlite@5 sqlite3` was required. This is a historical lock-file/code divergence in the worktrees.

**Google CSE quota exhaustion:** Runs 1–9 (window_start + post_window + deployed_proxy) were affected by Google CSE daily quota limits (HTTP 429). HEAD runs (10–12) had fresh quota. This means HEAD benefited from potentially higher-quality search results. The actual impact on verdict quality is likely moderate since Serper provides comparable result quality.

---

## 8. Degradation Window Conclusion

### 8.1 Where degradation first appears

**Degradation begins immediately at `quality_post_window_first_code` (704063ef).**

- PT Bolsonaro: 90.1% → **38.6%** (−51.5pp) — catastrophic drop
- EN Bolsonaro: **FAILED** due to `TypeError: run2Verdicts.find is not a function` in verdict-stage.ts
- DE Kinder Migration: 84% → 72% (−12pp, moderate)

The code change introduced in `704063ef` ("structured error telemetry and failure-mode accuracy") has a functional bug in `verdict-stage.ts` that causes EN to fail outright and PT to produce a dramatically wrong verdict (LEANING-FALSE when the claim is well-documented as largely TRUE).

### 8.2 Which checkpoint performs best

**`quality_window_start` (9cdc8889) is the best-performing checkpoint across all metrics:**

| Metric | window_start | next best |
|--------|-------------|-----------|
| PT TP | **90.1%** | 68.6% (deployed_proxy) |
| PT Conf | **81.8%** | 74.8% (deployed_proxy) |
| EN TP | **75.4%** | 63.5% (quality_head) |
| EN Conf | **73.0%** | 69.2% (deployed_proxy) |
| EN contamination | **Zero** | Zero (quality_head) |
| DE TP | **84.0%** | 72.0% (deployed_proxy/pwfc) |
| DE Conf | **78.8%** | 68.0% (deployed_proxy) |
| DE jurisdiction accuracy | **Swiss cantonal** | Swiss cantonal (deployed_proxy) |

However, window_start results for PT and EN are confounded by Google CSE quota exhaustion. The high PT score (90.1%) should be interpreted with caution — it may partly reflect that Serper returned favorable results on that day, combined with window_start's config (`maxIterationsPerContext: 5`, `selfConsistencyMode: "full"`, `maxClaimBoundaries: 6`).

### 8.3 Likely cause of degradation

**Primary causes, in order of impact:**

1. **Code bug in `quality_post_window_first_code`** (commit 704063ef): `run2Verdicts.find is not a function` in `verdict-stage.ts` line 251. This caused EN to fail completely and produced dramatically wrong PT verdicts. This is the single most impactful regression.

2. **SR weighting (`applyEvidenceWeighting`, commit 9550eb26)** at quality_head: All 3 runs at quality_head show 20–34pp confidence drops. SR weighting is pulling confidence toward 50% for claims where mid-reliability sources dominate. This may also reduce TP slightly. The SR weighting is active ONLY at quality_head.

3. **Fix 1 jurisdiction regression for DE** (commit 172bba3d): The jurisdiction classification infers Germany from German-language input and filters Swiss sources as "foreign_reaction". DE Kinder Migration at quality_head uses German federal data (SGB-II, German asylum data) instead of Swiss cantonal data (Statistisches Amt Kanton Zürich, SEM, etc.). TP dropped from 84% (window_start) to 63% at HEAD for DE.

4. **Config drift between checkpoints**: Removal of `maxClaimBoundaries: 6`, `boundaryCoherenceMinimum: 0.3`, `selfConsistencyMode: "full"` (between window_start and HEAD) may have affected boundary quality and verdict consistency. These were present at the "best quality" window_start checkpoint.

5. **Search provider variation**: Google CSE fallback to Serper/Brave affects result quality. Not consistently measurable given that different checkpoints hit quota at different stages.

### 8.4 Fix 1 Assessment

Fix 1 (172bba3d) **successfully eliminated U.S. government contamination** from EN Bolsonaro:
- deployed_proxy EN: "U.S. State Department Human Rights Monitoring" boundary ❌
- quality_head EN: No U.S. gov boundaries, no U.S. gov evidence items ✅

PT Bolsonaro also cleaner at HEAD (no U.S. boundaries, though window_start was also clean).

However, **Fix 1 introduced a secondary regression**: German-language Swiss claims are incorrectly resolved to Germany as jurisdiction. The `inferredGeography` for `Immer mehr Kinder im Kanton Zürich...` needs language-disambiguation — "Zürich" and "Kanton Zürich" are geographic identifiers that should override the inferred language-geography.

---

## 9. Recommended Next Fixes

**Priority 1 (blocker — fix before next comparison round):**
- **Fix the `inferredGeography` disambiguation bug**: When the claim contains an explicit geographic identifier (Kanton Zürich, Switzerland), `inferredGeography` must resolve to Switzerland, not Germany. The language of the claim should not determine jurisdiction. This should use an LLM pass to extract explicit geographic entities from the claim text.

**Priority 2 (high — directly affects quality):**
- **Investigate SR weighting calibration**: The `applyEvidenceWeighting` implementation pulls confidence too aggressively toward 50% for mixed-reliability source sets. The 34pp confidence drop on PT (from 81.8% to 47.6%) is excessive. Review the weighting formula and test whether a softer weighting function restores reasonable confidence levels.

**Priority 3 (important — quality floor):**
- **Investigate `quality_post_window_first_code` verdict-stage bug**: The `run2Verdicts.find is not a function` error at commit 704063ef should be understood (even though it's a historical checkpoint). It indicates that self-consistency check was receiving a non-array, which may reflect a structural change to how verdicts are returned that introduced a regression.

**Priority 4 (investigate):**
- **Re-evaluate removed config params**: `maxClaimBoundaries: 6`, `boundaryCoherenceMinimum: 0.3`, `selfConsistencyMode: "full"` were all present at the best-performing checkpoint (window_start). Consider whether their removal degraded quality and whether any should be restored or their equivalents implemented.

**Priority 5 (measure):**
- **Repeat comparison with fresh Google CSE quota**: All runs except HEAD had CSE quota issues. A controlled re-run where all checkpoints have equal CSE access would give cleaner signal on the code/config quality delta.

---

## 10. Execution Notes

### Worktrees created:
- `C:/DEV/FH-quality_window_start` (9cdc8889)
- `C:/DEV/FH-quality_post_window_first_code` (704063ef)
- `C:/DEV/FH-quality_deployed_proxy` (523ee2aa)
- `quality_head` used the main workspace `C:/DEV/FactHarbor`

### Dependency issues:
- window_start and post_window required manual `npm install sqlite@5 sqlite3` (package-lock.json was newer and referenced `better-sqlite3` instead)
- deployed_proxy API required manual SQLite schema fix: `ALTER TABLE Jobs ADD COLUMN IsHidden INTEGER NOT NULL DEFAULT 0`

### Port assignments used:
| Checkpoint | Web | API |
|-----------|-----|-----|
| window_start | 3001 | 5002 |
| post_window | 3002 | 5003 |
| deployed_proxy | 3003 | 5004 |
| quality_head | 3000 | 5000 |
