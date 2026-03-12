# Baseline Test Results — Phase 1 (HEAD, 2026-03-12)

**Created:** 2026-03-12
**Author:** Senior Developer (Claude Opus 4.6)
**Status:** Complete — baseline recorded
**Plan:** `Report_Quality_Baseline_Test_Plan_2026-03-12.md`
**Scoring criteria:** `Report_Quality_Criteria_Scorecard_2026-03-12.md`

---

## IMPORTANT: SR Weighting Was NOT Active

These runs were executed **before** commit `9550eb26` (feat(sr): wire applyEvidenceWeighting into the verdict pipeline). SR scores were computed and cached during these runs, but they had **zero effect on verdicts** — truth percentages and confidence were unweighted. Future runs with SR weighting active will produce different results. This baseline is therefore a **pre-SR-weighting snapshot**.

---

## 1. Run Data

| Run | JobId | Claim | Lang | TP | Conf | Verdict | Claims | Bounds |
|-----|-------|-------|------|-----|------|---------|--------|--------|
| H1a | `eeab19aa` | "Os julgamentos de Bolsonaro..." | PT | 60% | 67% | LEANING-TRUE | 2 | 6 |
| H1b | `fa079876` | Same as H1a | PT | 52% | 65% | MIXED | 2 | 6 |
| H3 | `fe595e71` | "Were the various Bolsonaro trials..." | EN | 56% | 58% | MIXED | 2 | 6 |
| H4 | `d58bca74` | "Immer mehr Kinder im Kanton Zürich..." | DE | 72% | 75% | MOSTLY-TRUE | 1 | 6 |

**HEAD commit:** `c02658eb` (fix(admin): restore Sections panel in prompt editor)
**SR cache:** Cleared before runs (fresh evaluations)

---

## 2. Claim Decomposition

### H1a (PT)
- AC_01: "Os julgamentos de Bolsonaro foram conduzidos de acordo com a lei brasileira em termos de conformidade procedimental" (TP=68, Conf=72)
- AC_02: "Os julgamentos de Bolsonaro foram conduzidos de acordo com os padrões internacionais de due process em termos de garantias" (TP=52, Conf=61)

### H1b (PT)
- AC_01: "Os julgamentos de Bolsonaro foram conduzidos de acordo com a lei brasileira em termos de conformidade processual" (TP=65, Conf=61)
- AC_02: "Os julgamentos de Bolsonaro foram conduzidos de acordo com os padrões internacionais de due process em termos de garantias" (TP=38, Conf=70)

### H3 (EN)
- AC_01: "The various Bolsonaro trials were conducted in accordance with Brazilian law" (TP=58, Conf=62)
- AC_02: "The various Bolsonaro trials were conducted in accordance with international standards of due process" (TP=52, Conf=52)

### H4 (DE)
- AC_01: "Die Anzahl der von Migration betroffenen Kinder im Kanton Zürich nimmt zu." (TP=72, Conf=75)

---

## 3. Boundary Names

### H1a (PT) — Clean
1. Análise de legislação federal brasileira vigente + Análise de texto constitucional brasileiro
2. Análise de procedimentos de ratificação de tratados internacionais + Análise acadêmica comparativa de sistemas judiciais e democráticos
3. Declarações públicas de autoridades governamentais + Análise de argumentos e alegações das defesas em processos judiciais
4. Decisões judiciais do STF sobre competência e prerrogativa de foro + Relatórios de monitoramento de direitos humanos
5. Análise de jurisprudência e tratados internacionais de direitos humanos + General Evidence
6. Avaliação institucional por órgão internacional de direitos humanos + Relatos de decisões e determinações do STF + Documentação de procedimentos e decisões judiciais em processos específicos + Análise constitucional de conformidade procedimental

### H1b (PT) — Clean
1. Análise acadêmica comparativa e multidisciplinar sobre democracia e constitucionalismo + Promulgação e análise de tratados internacionais
2. Análise doutrinária de direito constitucional e direitos humanos + Estudo de caso sobre anticorrupção e instituições internacionais
3. Análise jurídica especializada sobre procedimentos do STF + Petições e recursos da defesa em processos penais
4. Decisões judiciais do STF em processos penais + Votos judiciais em processos penais no STF
5. Descrição formal de acusações em ação penal + Julgamento colegiado do Tribunal Superior Eleitoral
6. General Evidence + Análise de legislação e texto constitucional brasileiro + Avaliações diagnósticas de organismos internacionais de direitos humanos

### H3 (EN) — SEVERE U.S. CONTAMINATION
1. **U.S. Executive Branch Official Designations and Sanctions** ❌
2. **U.S. Congressional Statements on Brazilian Judicial Proceedings** ❌
3. Post-Conviction Legal Analysis and Expert Commentary
4. Supreme Court Presidential Statements on Judicial Integrity
5. General Evidence
6. Critical Analysis by Media and Anti-Corruption Organizations + Academic Analysis of Supreme Court Pandemic-Era Judicial Actions + Electoral Court Decisions + Formal Prosecution Charging and Evidence Documentation + Legal and Academic Analysis of Brazilian Constitutional Law and Judicial Power + Brazilian Supreme Court Criminal Trial Proceedings + Documented Police Operations and Killings + **U.S. State Department Human Rights Documentation** ❌ + NGO Empirical Analysis of Police Accountability + Journalistic Reporting on Brazilian Supreme Court and Bolsonaro Proceedings + Democratic Institutions Assessment

### H4 (DE) — Excellent
1. Geburtenstatistik Stadt Zürich
2. Bevölkerungsstatistik nach Alter und Nationalität Stadt Zürich
3. Asylstatistik Schweiz - Kinder unter Asylsuchenden
4. Schutzstatus S - Ukraine-Geflüchtete Kanton Zürich
5. General Evidence
6. Offizielle Bevölkerungs- und Migrationsstatistik Kanton Zürich + Offizielle Schulstatistik Kanton Zürich

---

## 4. Bolsonaro Criteria Scoring (B1-B7)

### Legend
- ✅ = pass (full weight)
- ⚠️ = partial (half weight)
- ❌ = fail (zero)

| Criterion | H1a (PT) | H1b (PT) | H3 (EN) |
|-----------|----------|----------|---------|
| **B1** STF/TSE sep (25%) | ⚠️ 2 claims but procedural/due-process, not STF/TSE | ⚠️ Same split | ⚠️ law/due-process split |
| **B2** Trump immune (20%) | ✅ Clean | ✅ Clean | ❌ U.S. Exec, Congressional, State Dept boundaries |
| **B3** Boundary naming (15%) | ✅ PT, STF-focused, institution-specific | ✅ STF + TSE in names | ❌ 3 of 6 are U.S.-focused |
| **B4** TP 68-80% (10%) | ❌ 60% below | ❌ 52% below | ❌ 56% below |
| **B5** 27yr sentence (5%) | ⚠️ Not verified | ⚠️ Not verified | ⚠️ Not verified |
| **B6** Conf ≥65% (10%) | ✅ 67% | ✅ 65% (borderline) | ❌ 58% |
| **B7** No foreign bounds (15%) | ✅ Clean | ✅ Clean | ❌ 3 U.S. boundaries |
| **Weighted Score** | **~55%** | **~50%** | **~15%** |

---

## 5. General Criteria Scoring (G1-G6)

| Criterion | H1a/H1b (PT) | H3 (EN) | H4 (DE) |
|-----------|--------------|---------|---------|
| **G1** Stability (25%) | ⚠️ 8pp spread (60 vs 52) — acceptable but only 2 data points | ⚠️ 56% within historical 60-85% range (slightly below floor) | ✅ 72% within 50-75% range |
| **G2** Boundary quality (20%) | ✅ Portuguese, institution-specific | ❌ U.S.-contaminated | ✅ Canton-specific statistics |
| **G3** Claim decomposition (15%) | ⚠️ 2 claims but not STF/TSE separation | ⚠️ 2 claims but not STF/TSE | ✅ 1 claim appropriate |
| **G4** Evidence relevance (15%) | ✅ Brazilian-focused | ❌ U.S. evidence in Brazilian analysis | ✅ Swiss/ZH-specific |
| **G5** Conf plausibility (10%) | ✅ 65-67% reasonable | ❌ 58% low for well-documented case | ✅ 75% healthy |
| **G6** Contestation immunity (15%) | ✅ No adjusted | Need to verify | N/A for stats claim |

---

## 6. SR Scores (Observational)

45 domains evaluated during Phase 1 runs. 34 received scores. Key domains:

| Domain | Score | Conf | Source Type | Notes |
|--------|-------|------|------------|-------|
| agenciabrasil.ebc.com.br | 45% | 85% | state_media | Brazilian state media |
| aljazeera.com | 64% | 80% | state_media | |
| state.gov | 65% | 60% | government | U.S. State Dept |
| bbc.com | 78% | 92% | state_media | |
| tse.jus.br | 79% | 85% | government | Brazilian Electoral Court |
| bfs.admin.ch | 79% | 70% | government | Swiss Federal Statistics |
| stadt-zuerich.ch | 68% | 75% | government | City of Zurich |
| web.statistik.zh.ch | 76% | 65% | government | Canton ZH Statistics |

**Note:** These scores were computed but NOT used in verdict weighting (pre-commit `9550eb26`).

---

## 7. Phase 1 Decision Gate Result

**H1 mean = (60 + 52) / 2 = 56%** → falls in **50-74% band** → "Current code is worse than deployed Mar 8 for same input+language"

**H3 = 56%** → above 50% floor, no independent trigger, but quality is poor (severe contamination)

**H4 = 72%** → within range, stable

**Decision: Phase 2 triggered** but paused pending Captain decision on priorities.

---

## 8. Config Diff (523ee2aa vs HEAD)

Material differences found (see `git diff 523ee2aa..HEAD -- apps/web/configs/`):

| Config | Key Changes |
|--------|------------|
| **search** | Brave: enabled→disabled. Provider ordering changed. |
| **pipeline** | Removed: `researchTimeBudgetMs`, `debateModelProviders`, `centralityThreshold`, `maxAtomicClaims*`, `selfConsistencyMode`, `maxClaimBoundaries`, `boundaryCoherenceMinimum`. Added: `boundaryClusteringTemperature`. |
| **sr** | Added: `evaluationSearch` block (SR-specific search), `evidenceQualityAssessment` block. Removed: `unknownSourceConfidence`. |
| **calculation** | Removed: `confidenceThreshold`, `consensusThreshold` from sourceReliability (moved to SR config). |

**Confound warning:** Phase 2 results at `523ee2aa` would reflect both code AND config differences. Pipeline config changes (removed `maxClaimBoundaries`, `boundaryCoherenceMinimum`, `selfConsistencyMode`) could significantly affect boundary formation and verdict quality.

---

## 9. Key Findings

### 9.1 Portuguese does NOT reproduce the 90%
H1 mean (56%) vs deployed D2 (90%) = **34pp gap**. This is far beyond LLM variance (18-25pp typical). Language alone does not explain the deployed quality peak. The deployed 90% was either:
- A lucky LLM sample combined with favorable search results on that day
- Produced by materially different config state (e.g., `maxClaimBoundaries`, `boundaryCoherenceMinimum` were present at `523ee2aa`)
- Or both

### 9.2 English contamination is severe and persistent
H3 has 3 of 6 boundaries focused on U.S. government actions. The Scorecard showed 7 of 13 historical runs had at least one foreign-contaminated boundary. Current HEAD has not fixed this — in fact H3 (15% B-score) is the **worst Bolsonaro run in the entire dataset**.

### 9.3 German quality is excellent
H4 (72% TP, 75% conf, canton-specific boundaries) is the strongest result. German claims about Swiss topics produce clean, jurisdiction-appropriate evidence and boundaries.

### 9.4 The B1/B7 tradeoff persists
Scorecard §5.1 identified that claim decomposition (B1) and contamination immunity (B7) trade off. This is still true: PT runs have clean boundaries but weak STF/TSE separation; EN runs attempt broader decomposition but pull in foreign evidence.

### 9.5 SR weighting was absent
All verdicts were unweighted by SR. With SR weighting now active (commit `9550eb26`), truth percentages will shift toward 50% for claims supported primarily by low-reliability sources (e.g., state.gov at 65%, agenciabrasil at 45%). This could either improve or worsen scores depending on which evidence sources dominate each verdict.

---

## 10. Comparison to Historical Data

| Metric | Historical Range | Phase 1 (HEAD) | Assessment |
|--------|-----------------|----------------|------------|
| Bolsonaro PT TP | 72-85% (deployed) | 52-60% | ❌ Below range |
| Bolsonaro EN TP | 60-85% (13 local) | 56% | ❌ Below floor |
| Kinder Migration TP | 50-75% (8 local) | 72% | ✅ Within range |
| Bolsonaro B-score best | 90% (deployed D2) | 55% (H1a) | ❌ 35pp gap |
| U.S. boundary contamination rate | 7/13 = 54% | 1/3 Bolsonaro runs = 33% (H3) | ⚠️ Still present |

---

## 11. Recommendations

1. **Do NOT proceed with Phase 2 yet.** The config diff is too large — Phase 2 results would be uninterpretable (code vs config confound). Fix contamination first, then re-baseline.
2. **Fix U.S. contamination** — This is the #1 quality blocker. H3 shows the pipeline still pulls U.S. executive orders and congressional statements into Brazilian legal analysis boundaries.
3. **Re-run baseline after contamination fix + SR weighting** — Both changes (contamination fix + SR weighting from `9550eb26`) will affect results. A new Phase 1 after both are in place will be the true quality baseline.
4. **Investigate removed pipeline config params** — `maxClaimBoundaries`, `boundaryCoherenceMinimum`, `selfConsistencyMode` were present at the 90% run's commit but removed since. These may have constrained boundary formation in beneficial ways.
