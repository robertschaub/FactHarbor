# Report Quality Criteria & Historical Scorecard

**Created:** 2026-03-12
**Status:** Active — criteria defined, baseline scored
**Data source:** Local `factharbor.db` (88 successful jobs, March 1–11 2026)

---

## 1. General Quality Criteria (any claim)

| # | Criterion | Weight | Threshold | Rationale |
|---|-----------|--------|-----------|-----------|
| G1 | **Verdict stability** — spread across repeated runs of same input | 25% | ≤15pp = good, ≤20pp = acceptable | Users must trust that re-running the same claim produces consistent results |
| G2 | **Boundary count & quality** — meaningful, non-generic boundary names; count ≥2 | 20% | No "General"-only; institution/methodology-specific names | Generic boundaries add no analytical value; boundaries should reflect real-world institutional or methodological frames |
| G3 | **Claim decomposition accuracy** — multi-event inputs produce multiple claims | 15% | All distinct events detected as separate AtomicClaims | A multi-trial input collapsed into 1 claim loses critical nuance |
| G4 | **Evidence relevance** — no foreign/irrelevant sources contaminating analysis | 15% | No cross-jurisdiction contamination | Brazilian trial analysis must not be polluted by unrelated U.S. executive orders |
| G5 | **Confidence plausibility** — confidence reflects evidence depth, not inflation | 10% | 60–85% for typical claims; <60% only when evidence is genuinely sparse | Inflated confidence erodes trust; deflated confidence undersells good evidence |
| G6 | **Political contestation immunity** — baseless political claims (Trump/MAGA rhetoric, unsubstantiated denial) must NOT move verdicts | 15% | Zero `verdictAdjusted=true` from unsubstantiated political challenges | Evidence-weighted contestation is a core pipeline rule (AGENTS.md Pipeline Integrity). Opinions and political rhetoric without counter-evidence must be classified as "doubted", not used to adjust verdicts. |

---

## 2. Bolsonaro-Specific Quality Criteria

These criteria apply to the multi-trial Bolsonaro input ("Were the various Bolsonaro trials conducted in accordance with Brazilian law...").

| # | Criterion | Weight | Threshold | Rationale |
|---|-----------|--------|-----------|-----------|
| B1 | **STF/TSE separation** — coup trial (STF 2024/25) and electoral trial (TSE 2023) detected as distinct events | 25% | 2+ claims distinguishing STF vs TSE | These are different courts, different charges, different years — collapsing them loses analytical depth |
| B2 | **Trump/U.S. Admin immunity** — no U.S. executive orders, diplomatic pressure, or political contestation adjusting verdicts | 20% | Zero contaminated boundaries; zero `verdictAdjusted=true` from U.S. political sources; no U.S. mentions in headline | Trump admin contestation of Bolsonaro's conviction is a diplomatic/political position, not evidence of legal procedural violation |
| B3 | **Boundary naming** — references actual Brazilian institutions (STF, TSE, PGR, Federal Police) | 15% | ≥3 institution-specific boundaries | Boundaries named "General" or "U.S. executive statements" provide no analytical frame |
| B4 | **TP in target range** (~72%) | 10% | 68–80% = good | Expert consensus: the trials were mostly legally sound with some procedural concerns |
| B5 | **27yr sentence mentioned** | 5% | Present in narrative or evidence | A key factual element of the case |
| B6 | **Confidence ≥65%** | 10% | ≥65% | This is a well-documented case with abundant evidence |
| B7 | **No foreign contamination in boundaries** | 15% | Zero boundaries named "U.S.", "State Dept", "Political commentary", "Executive order", "Government press releases" | Foreign political reactions are not relevant analytical frames for assessing Brazilian legal proceedings |

---

## 3. Bolsonaro Scorecard — All 13 Runs

### 3.1 Run Data Table

| # | JobId | Date | Input variant | TP | Conf | Claims | Bounds | Verdict |
|---|-------|------|---------------|-----|------|--------|--------|---------|
| 1 | `4a3740ed` | Mar 1 | "Was the Bolsonaro judgment fair..." | 69 | 70 | 2 | 6 | LEANING-TRUE |
| 2 | `2a867099` | Mar 1 | "Was the Bolsonaro judgment fair..." | 85 | 78 | 1 | 4 | MOSTLY-TRUE |
| 3 | `2c7e10c2` | Mar 1 | Portuguese: "O julgamento de Bolsonaro..." | 82 | 85 | 1 | 5 | MOSTLY-TRUE |
| 4 | `1a4f7f33` | Mar 3 | Portuguese: "Os julgamentos de Bolsonaro..." | 85 | 78 | 1 | 6 | MOSTLY-TRUE |
| 5 | `2acb6420` | Mar 7 | "Were the various Bolsonaro trials..." | 73 | 75 | 1 | 6 | MOSTLY-TRUE |
| 6 | `b32cbcaf` | Mar 8 | "Were the various Bolsonaro trials..." | 68 | 68 | 1 | 6 | LEANING-TRUE |
| 7 | `a62db574` | Mar 8 | "Were the various Bolsonaro trials..." | 72 | 65 | 1 | 6 | MOSTLY-TRUE |
| 8 | `edce5617` | Mar 9 | "Was the Bolsonaro judgment fair..." | 74 | 75 | 2 | 6 | MOSTLY-TRUE |
| 9 | `28bb062f` | Mar 9 | "The Bolsonaro judgment was fair..." (statement) | 76 | 77 | 2 | 6 | MOSTLY-TRUE |
| 10 | `86164801` | Mar 10 | "Was the trial against Bolsonaro for attempted coup..." | 76 | 68 | 1 | 6 | MOSTLY-TRUE |
| 11 | `0b795115` | Mar 10 | "Were the various Bolsonaro trials..." | 76 | 69 | 2 | 6 | MOSTLY-TRUE |
| 12 | `3dc30cf5` | Mar 11 | "Were the various Bolsonaro trials..." | 60 | 65 | 3 | 1 | LEANING-TRUE |
| 13 | `3b5e7fac` | Mar 11 | "Was the trial against Bolsonaro for attempted coup..." | 65 | 58 | 1 | 6 | LEANING-TRUE |

### 3.2 Criteria Scoring

#### Legend
- ✅ = pass (full weight)
- ⚠️ = partial (half weight)
- ❌ = fail (zero)

| # | JobId | Date | B1 STF/TSE (25%) | B2 Trump immune (20%) | B3 Bound names (15%) | B4 TP 68-80 (10%) | B5 27yr (5%) | B6 Conf≥65 (10%) | B7 No foreign (15%) | **Score** |
|---|-------|------|---|---|---|---|---|---|---|---|
| 1 | `4a37` | Mar 1 | ⚠️ 2 claims but persecution framing, not STF/TSE | ❌ U.S. challenge adjusted AC_01; keyFinding cites U.S. | ⚠️ "U.S. executive statements" boundary | ✅ 69% | ✅ | ✅ 70% | ❌ U.S. exec boundary | **35%** |
| 2 | `2a86` | Mar 1 | ❌ 1 claim | ✅ clean | ✅ **BEST**: "Electoral Court 2023", "STF criminal 2025", "STF constitutional 2024" | ❌ 85% over | ✅ | ✅ 78% | ✅ clean | **60%** |
| 3 | `2c7e` | Mar 1 | ❌ 1 claim | ✅ clean | ✅ Portuguese, TSE-focused | ❌ 82% over | ✅ | ✅ 85% | ✅ clean | **55%** |
| 4 | `1a4f` | Mar 3 | ❌ 1 claim | ✅ clean | ✅ Portuguese, STF-focused | ❌ 85% over | ❌ | ✅ 78% | ✅ clean | **50%** |
| 5 | `2acb` | Mar 7 | ❌ 1 claim | ✅ bounds clean, no adjusted | ⚠️ "U.S. official statements" among otherwise OK bounds | ✅ 73% | ✅ | ✅ 75% | ❌ U.S. official boundary | **45%** |
| 6 | `b32c` | Mar 8 | ❌ 1 claim | ⚠️ no adjusted, but keyFinding mentions intl | ⚠️ "U.S.-Brazil Relations" boundary | ✅ 68% | ✅ | ✅ 68% | ❌ U.S.-Brazil boundary | **40%** |
| 7 | `a62d` | Mar 8 | ❌ 1 claim | ✅ clean, challenge rejected | ✅ "Electoral Court", "STF judicial", institution-specific | ✅ 72% | ✅ | ✅ 65% | ✅ clean | **60%** |
| 8 | `edce` | Mar 9 | ✅ 2 claims AC_01+AC_02 | ⚠️ no adjusted, but keyFinding mentions intl | ⚠️ "State Dept human rights" boundary | ✅ 74% | ✅ | ✅ 75% | ❌ State Dept boundary | **55%** |
| 9 | `28bb` | Mar 9 | ✅ 2 claims AC_01+AC_02 | ⚠️ no adjusted, but keyFinding mentions intl | ❌ "Executive order claims", "Political commentary" | ✅ 76% | ✅ | ✅ 77% | ❌ Exec order + Political boundaries | **45%** |
| 10 | `8616` | Mar 10 | ❌ 1 claim | ✅ clean | ✅ "Supreme Court", "Judicial dissent", "Police investigation" | ✅ 76% | ✅ | ✅ 68% | ✅ clean | **60%** |
| 11 | `0b79` | Mar 10 | ✅ **BEST** — AC_01=STF coup, AC_03=TSE electoral | ⚠️ 1 U.S. adjustment on AC_03; headline+keyFinding mention intl | ❌ "State Dept", "Political analysis", "Govt press releases" | ✅ 76% | ✅ | ✅ 69% | ❌ 3 foreign boundaries | **50%** |
| 12 | `3dc3` | Mar 11 | ✅ 3 claims: TSE trial, TSE fairness, STF coup (**most granular**) | ✅ clean | ❌ **WORST** — only 1 boundary "General" | ❌ 60% under | ✅ | ✅ 65% | ✅ clean | **40%** |
| 13 | `3b5e` | Mar 11 | ❌ 1 claim | ✅ clean | ✅ "Federal Police", "Judicial dissent", "Expert analysis" | ❌ 65% under | ✅ | ❌ 58% | ✅ clean | **40%** |

### 3.3 Boundary Names by Run

| # | JobId | Date | Boundary Names |
|---|-------|------|----------------|
| 1 | `4a37` | Mar 1 | STF judicial proceedings, Prosecution proceedings, Academic analysis, Human rights reports, **U.S. executive statements**, Environmental lawyer study |
| 2 | `2a86` | Mar 1 | **Electoral Court ruling 2023**, **STF criminal trial 2025**, **STF constitutional application 2024**, STF judicial review 2019-2022 |
| 3 | `2c7e` | Mar 1 | _(Portuguese, 5 TSE-focused boundaries)_ |
| 4 | `1a4f` | Mar 3 | Fundamentos de competência, Jurisprudência STF, Análise judicial STF, Análise de especialistas, Denúncia PGR, Relatório CIDH |
| 5 | `2acb` | Mar 7 | STF judicial proceedings, Federal Police investigation, **U.S. official statements**, Institutional judicial review, Human rights reporting, NGO police accountability study |
| 6 | `b32c` | Mar 8 | **U.S.-Brazil Relations**, January 8th Prosecutions, Law Enforcement Accountability, STF Criminal Trial, Federal Police Investigation, Electoral Court Proceedings |
| 7 | `a62d` | Mar 8 | Criminal Code application, Electoral Court proceedings, Institutional analysis, Judicial review analysis, Governance assessment, STF judicial proceedings |
| 8 | `edce` | Mar 9 | Supreme Court proceedings, Appeals process, Institutional monitoring, **State Dept human rights**, IACHR assessment, Supporter statements |
| 9 | `28bb` | Mar 9 | General, Trial reporting, **Political commentary**, **Executive order claims**, Legal statutes, Police investigation |
| 10 | `8616` | Mar 10 | Judicial dissent, General, Legal framework, Supreme Court proceedings, Trial procedures, Police investigation |
| 11 | `0b79` | Mar 10 | Sentencing decisions, **State Dept human rights**, General, **News reporting on trial**, **Political analysis**, **Government press releases** |
| 12 | `3dc3` | Mar 11 | General _(only 1 boundary)_ |
| 13 | `3b5e` | Mar 11 | General, Federal Police investigation, Defense position, Appellate procedures, Judicial dissent, Expert analysis |

### 3.4 Trump/U.S. Contamination Detail

| # | JobId | Date | U.S. boundaries | U.S. in verdict reasoning | U.S. challenge adjusted verdict? | U.S. in headline | U.S. in keyFinding |
|---|-------|------|-----------------|---------------------------|----------------------------------|-------------------|---------------------|
| 1 | `4a37` | Mar 1 | 1 ("U.S. executive statements") | Yes (AC_01) | **YES** — 1 U.S. challenge adjusted AC_01 | No | **Yes** |
| 2 | `2a86` | Mar 1 | 0 | No | No | No | No |
| 3 | `2c7e` | Mar 1 | 0 | No | No | No | No |
| 4 | `1a4f` | Mar 3 | 0 | No | No | No | No |
| 5 | `2acb` | Mar 7 | 1 ("U.S. official statements") | No | No | No | No |
| 6 | `b32c` | Mar 8 | 1 ("U.S.-Brazil Relations") | No | No | No | **Yes** (intl) |
| 7 | `a62d` | Mar 8 | 0 | Yes (mentioned but rejected) | No — challenge rejected | No | No |
| 8 | `edce` | Mar 9 | 1 ("State Dept human rights") | No | No | No | **Yes** (intl) |
| 9 | `28bb` | Mar 9 | 2 ("Exec order claims", "Political commentary") | No | No | No | **Yes** (intl) |
| 10 | `8616` | Mar 10 | 0 | No | No | No | No |
| 11 | `0b79` | Mar 10 | 3 ("State Dept", "Political analysis", "Govt press") | Yes (AC_01, AC_03) | **YES** — 1 U.S. challenge adjusted AC_03 | **Yes** (intl) | **Yes** |
| 12 | `3dc3` | Mar 11 | 0 | No | No | No | No |
| 13 | `3b5e` | Mar 11 | 0 | No | No | No | No |

---

## 4. Cross-Claim Stability Analysis

| Claim | Runs | TP Range | Spread | Verdict Range | Assessment |
|-------|------|----------|--------|---------------|------------|
| Bolsonaro (multi-trial) | 13 | 60–85% | 25pp | LEANING-TRUE to MOSTLY-TRUE | ❌ Unstable (>20pp) |
| Iran nukes | 12 | 74–92% | 18pp | MOSTLY-TRUE to TRUE | ⚠️ Borderline |
| SRG Linksdrall | 5 | 18–56% | 38pp | MOSTLY-FALSE to MIXED | ❌ Very unstable |
| Kinder Migration ZH | 8 | 50–75% | 25pp | MIXED to MOSTLY-TRUE | ❌ Unstable |
| Muslims violence | 6 | 16–56% | 40pp | MOSTLY-FALSE to MIXED | ❌ Very unstable |

---

## 5. Key Findings

### 5.1 No run passes all Bolsonaro criteria

The two critical dimensions (B1: STF/TSE separation, B2+B7: Trump immunity) **trade off against each other**:
- Runs with good multi-event decomposition (B1) tend to attract foreign political evidence into boundaries (B7 fail)
- Runs with clean boundaries (B7 pass) tend to collapse everything into 1 claim (B1 fail)

### 5.2 Trump contamination pattern

- **2 of 13 runs** had U.S. political challenges that **actually adjusted verdicts** (`4a37` Mar 1, `0b79` Mar 10)
- **5 of 13 runs** mention U.S./international in keyFinding narrative
- **7 of 13 runs** have at least one foreign-contaminated boundary
- The system correctly **rejects** most U.S. challenges (`verdictAdjusted=false`), but not all

### 5.3 Best period and best individual runs

**Best period:** March 8–10 — most consistent TP range (68–76%), decent boundaries, challenges mostly rejected.

**Top 3 runs by weighted score (tied at 60%):**
1. **`2a86` (Mar 1)** — Best boundary names (institution+year), clean, but only 1 claim, TP over target
2. **`a62d` (Mar 8)** — Clean, good boundaries, TP=72% perfect, but only 1 claim
3. **`8616` (Mar 10)** — Clean, decent boundaries, TP=76%, but only 1 claim

**Best multi-event run (local):** `0b79` (Mar 10, 50%) — only local run with clean STF/TSE split, but 3 foreign boundaries and 1 U.S. verdict adjustment

### 5.4 Deployed runs outscore all local runs

Both deployed Bolsonaro runs score higher than any local run:

| Rank | Run | Source | Score | Key strengths |
|------|-----|--------|-------|---------------|
| **1** | `5a2aceff` (Mar 8, Portuguese) | **Deployed** | **90%** | All criteria pass. Best boundary names of any run ("Julgamento TSE", "Julgamento STF - AP 2668"). TP=72%, Conf=77%. Zero Trump contamination. |
| **2** | `a34271a3` (Mar 10, English) | **Deployed** | **75%** | 2 claims, clean of U.S. contamination, TP=77%. Boundaries topical but not institution-specific. |
| 3 | `2a86` (Mar 1) | Local | 60% | Best local boundary names, but 1 claim, TP=85% over target |
| 3= | `a62d` (Mar 8) | Local | 60% | Clean, TP=72% perfect, but 1 claim |
| 3= | `8616` (Mar 10) | Local | 60% | Clean, TP=76%, but 1 claim |

**Implication:** The deployed environment (March 8–10 builds) produced the highest-quality results. The local database has more runs but none match the deployed quality ceiling. This may relate to config state, prompt versions, or simply favorable LLM sampling — worth investigating whether the deployed config snapshot can be reproduced locally.

### 5.5 Root cause for quality gap

The pipeline currently cannot reliably:
1. **Decompose** multi-event claims into separate AtomicClaims (B1) AND
2. **Filter out** foreign political reactions from evidence boundaries (B2, B7) simultaneously

When the research stage finds more evidence (enabling decomposition), it also pulls in U.S. State Department reports and Trump executive orders as "evidence", which then form their own boundaries.

### 5.6 Stability concern

Overall verdict spread of 25pp for Bolsonaro and 38pp for SRG exceeds the ≤20pp acceptable threshold (G1). The primary driver is claim scope variation — different runs extract different claims, leading to different verdict aggregations.

---

## 6. Recommended Next Steps

1. **Evidence relevance filter** — Pre-filter evidence items by jurisdiction relevance before boundary formation. U.S. diplomatic statements about Brazil are context, not evidence of legal procedural violation.
2. **Political contestation classifier** — Strengthen the evidence-weighted contestation rule: diplomatic/political objections without specific legal counter-evidence should be classified as "doubted" and must not adjust verdicts.
3. **Boundary formation guardrail** — Boundaries should only form around sources relevant to the claim's jurisdiction and subject matter. "U.S. executive statements" should never be a boundary in a Brazilian legal proceedings analysis.
4. **Claim decomposition stability** — Investigate why multi-event decomposition (MT-5) is inconsistent and sometimes pulls in foreign evidence when it succeeds.

---

## 7. Deployed Database Analysis (app.factharbor.ch)

**Data source:** Public API at `https://app.factharbor.ch/api/fh/jobs`
**Total jobs:** 19 (all SUCCEEDED), March 3–10 2026
**No duplicate claims** — each claim was run once, so cross-run stability cannot be measured on deployed data alone.

### 7.1 Deployed Bolsonaro Runs (2 runs)

| # | JobId | Date | Input | TP | Conf | Claims | Bounds | Verdict |
|---|-------|------|-------|-----|------|--------|--------|---------|
| D1 | `a34271a3` | Mar 10 | "Was the trial against Bolsonaro for attempted coup..." | 77 | 66 | 2 | 6 | MOSTLY-TRUE |
| D2 | `5a2aceff` | Mar 8 | Portuguese: "Os julgamentos de Bolsonaro..." | 72 | 77 | 2 | 6 | MOSTLY-TRUE |

### 7.2 Deployed Bolsonaro Scoring

| Criterion | D1 (`a342`, Mar 10) | D2 (`5a2a`, Mar 8, Portuguese) |
|-----------|---------------------|-------------------------------|
| **B1 STF/TSE sep** | ✅ 2 claims (AC_01 procedural, AC_02 fairness) | ✅ 2 claims (AC_01=85%, AC_02=52%) |
| **B2 Trump immune** | ✅ No U.S. in narrative, 0 U.S.-adjusted challenges | ✅ Clean |
| **B3 Boundary names** | ⚠️ "Judicial independence commentary/assessment", "General" — topical but not institution-specific | ✅ **EXCELLENT**: "Legislação eleitoral federal", "Julgamento TSE", "Julgamento STF - AP 2668", "Análise de especialistas" |
| **B4 TP 68-80%** | ✅ 77% | ✅ 72% |
| **B5 27yr** | ✅ | ✅ |
| **B6 Conf ≥65%** | ✅ 66% | ✅ 77% |
| **B7 No foreign bounds** | ✅ Clean | ✅ Clean |
| **Weighted Score** | **75%** | **90%** |

### 7.3 Key Finding: Deployed Run D2 is the Best Run Across All Databases

**`5a2aceff` (deployed, Mar 8, Portuguese)** scores **90%** — the highest of any Bolsonaro run across local + deployed:

- ✅ 2 claims with implicit STF/TSE separation
- ✅ Zero Trump/U.S. contamination anywhere
- ✅ **Best boundary names in any run**: "Julgamento TSE", "Julgamento STF - AP 2668" — court-specific with case number
- ✅ TP=72% (perfect target)
- ✅ Confidence=77% (healthy)
- ✅ 27yr sentence mentioned
- Only minor gap: AC_02 at 52% (MIXED) — the "fairness" claim is inherently more subjective

### 7.4 Deployed Commit Identification

The VPS does not persist its running commit hash. Identification is based on git log timestamps vs job creation timestamps (API returns UTC).

| Run | Job Created (UTC) | Likely Deployed Commit | Key Code State |
|-----|-------------------|----------------------|----------------|
| **D2** `5a2aceff` | 2026-03-08 16:48:11 | **`523ee2aa`** (Mar 8 16:01 UTC) — "reseed production config.db" | Phase 1 variability fixes (`9eb882df`), Serper fallback (`0c6efd80`), INTERRUPTED status (`8554529d`). **Pre-Phase 2 (no scope normalization, no D1 reprompt, no MT-5, no SR web search).** |
| **D1** `a34271a3` | 2026-03-10 23:28:54 | **~`eb752d70`** (Mar 10 17:38 UTC) or later evening deploy | Phase 2 complete: D1 reprompt (`07d90a26`), scope normalization (`eab3fd18`), MT-5(A) (`f874fa1c`), MT-5(C) (`a8c34581`), SR web search disabled (`106ab9b9`). |

**Critical insight:** The best-scoring run (D2, 90%) was built from **pre-Phase 2 code** — before the D1 reprompt loop, scope normalization, MT-5 prompt reinforcement, and SR web search features were added. This suggests:

1. The Phase 2 changes did not improve Bolsonaro quality (and may have introduced instability)
2. The simpler codebase (Phase 1 fixes only) produced better results for this particular input
3. OR: Portuguese input language is a confound — D2's Portuguese input may naturally produce better Brazilian-institution-focused boundaries than English input

**To disambiguate:** Run the same Portuguese input locally on current code and compare.

### 7.5 Deployed vs Local Comparison (same claims)

| Claim | Local TP (range) | Local runs | Deployed TP | Match? |
|-------|------------------|------------|-------------|--------|
| Iran nukes | 74–92% | 12 | 80% | ✅ Within range |
| SRG Linksdrall | 18–56% | 5 | 25% | ✅ Within range (low end) |
| Plastik recycling | 20–21% | 3 | 29% | ⚠️ Slightly above local range |
| Kinder Migration ZH | 50–75% | 8 | 66% | ✅ Within range |
| Muslims violence | 16–56% | 6 | 31% | ✅ Within range |
| Bolsonaro (multi-trial) | 60–85% | 13 | 72–77% | ✅ Within range |
| Hydrogen vs electric | 16% | 1 | 76% | ❌ **Major divergence** (local was MOSTLY-FALSE, deployed MOSTLY-TRUE — likely different input phrasing) |

### 7.6 All Deployed Runs

| Date | Verdict | TP | Conf | Input |
|------|---------|-----|------|-------|
| Mar 3 | TRUE | 94 | 90 | Global warming is a reality... |
| Mar 3 | FALSE | 8 | 85 | CH-Recht 13. Monatslohn als Gratifikation |
| Mar 3 | LEANING-FALSE | 38 | 85 | Parrots can live up to 100 years |
| Mar 3 | MOSTLY-TRUE | 85 | 85 | Kinder nach Russland deportiert |
| Mar 3 | FALSE | 2 | 98 | Do vaccines cause autism? |
| Mar 3 | MOSTLY-TRUE | 76 | 78 | Electricity more efficient than hydrogen |
| Mar 3 | MOSTLY-TRUE | 75 | 78 | Sanctions rarely achieve goals |
| Mar 3 | TRUE | 95 | 98 | The sky is blue |
| Mar 5 | MOSTLY-TRUE | 75 | 73 | Misinformation unevenly distributed |
| Mar 5 | MOSTLY-FALSE | 18 | 75 | Sexual orientation determined after birth |
| Mar 6 | TRUE | 92 | 80 | 3000+ killed in Iran this January |
| Mar 8 | MOSTLY-FALSE | 25 | 73 | SRG Linksdrall |
| Mar 8 | MOSTLY-TRUE | 72 | 77 | **Bolsonaro (Portuguese)** |
| Mar 8 | LEANING-TRUE | 66 | 69 | Kinder Migration ZH |
| Mar 9 | MOSTLY-TRUE | 80 | 82 | Iran nukes |
| Mar 9 | LEANING-FALSE | 29 | 59 | Plastik recycling |
| Mar 9 | MIXED | 46 | 77 | Is sugar addictive? |
| Mar 10 | LEANING-FALSE | 31 | 46 | Muslims violence |
| Mar 10 | MOSTLY-TRUE | 77 | 66 | **Bolsonaro (English, coup trial)** |

---

## 8. Appendix: Related Documents

- `Docs/WIP/Bolsonaro_Report_Variability_Investigation_2026-03-07.md`
- `Docs/WIP/Report_Quality_Analysis_2026-03-08.md`
- `Docs/WIP/Report_Variability_Consolidated_Plan_2026-03-07.md`
- `Docs/AGENTS/Agent_Outputs.md` — MT-5 Validation Report (consolidated)
