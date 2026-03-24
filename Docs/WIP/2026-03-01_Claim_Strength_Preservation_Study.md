# Claim Strength Preservation Study (2026-03-01)

## Status: Investigation — Multi-Agent Study Required

**Filed by:** Senior Developer (Claude Opus 4.6)
**Trigger:** 6 analysis jobs for near-identical German inputs produced 32%–75% variance
**Related:** Inverse Claim Asymmetry Plan (`../ARCHIVE/2026-02-27_Inverse_Claim_Asymmetry_Plan.md`)
**Scope boundary:** This document covers a NEW issue distinct from ICA Plan's verdict integrity gating. ICA Plan addresses post-verdict integrity; this issue occurs EARLIER at Stage 1 claim extraction.

---

## 1. Observed Problem

Six jobs submitted on 2026-03-01 with variants of the same German claim:

| Input | Stage 1 Claim `statement` | Evidence sup:contra | Truth% | Verdict |
|-------|--------------------------|---------------------|--------|---------|
| "Homosexualität ist genetisch bedingt" | "hat eine genetische **Komponente**" | **23:1** (96%) | **75%** | MOSTLY-TRUE |
| "...bei Menschen ist genetisch bedingt" | Split: "hat Komponente" + "ist primärer Faktor" | 18:8 (69%) | **45%** | MIXED |
| "...bei Männern ist genetisch bedingt" | "ist genetisch **bedingt**" | 10:9 (53%) | **35%** | LEANING-FALSE |
| "...bei Frauen ist genetisch bedingt" | "ist genetisch **bedingt**" | 3:16 (16%) | **32%** | LEANING-FALSE |
| "...bei Säugetieren ist genetisch bedingt" | "ist genetisch **bedingt**" | 6:8 (43%) | **35%** | LEANING-FALSE |
| "...ist **nicht** genetisch bedingt" | "ist nicht genetisch bedingt" | 18:9 (67%) | **22%** | MOSTLY-FALSE |

**Job IDs** (current DB `factharbor.db`):

| Label | JobId |
|-------|-------|
| GENERAL | `dd8513f3ba1b498ea45b4360344b2166` |
| MENSCHEN | `42aa6a4c34a34373bc477bfeaab976da` |
| MÄNNER | `7448e54ca2bd48608b0fbe5ff5a9e099` |
| FRAUEN | `a69e9602f77e4285b3602bee35131092` |
| SÄUGETIERE | `059f9598a5f24b149ba9e5009afa58fa` |
| NICHT | `c1835061d55c4bb78cecf878abedbc93` |

**Key observation:** Adding "bei Menschen" (in humans) — a qualifier that doesn't change the core meaning — drops the result from 75% to 45%. Adding "bei Männern" or "bei Frauen" drops it to 32-35%. This exceeds the ≤4% input neutrality tolerance by an order of magnitude.

---

## 2. Root Cause Analysis

### 2.1 Primary: Claim Strength Softening at Stage 1

The LLM rewrote the GENERAL claim from `"genetisch bedingt"` (genetically determined/conditioned) to `"hat eine genetische Komponente"` (has a genetic component). This is a **semantic weakening**:

- "bedingt" (determined/conditioned) → "Komponente" (component)
- A claim about genetic **determination** became a claim about a genetic **component**
- This weaker claim is trivially supported by ALL genetic evidence, producing a 23:1 evidence ratio

The qualified variants ("bei Männern", "bei Frauen", "bei Säugetieren") kept the original stronger wording "genetisch bedingt", producing balanced or opposing evidence ratios because the evidence actually DOES NOT support full genetic determination.

The "bei Menschen" variant is the most revealing: the LLM explicitly recognized the ambiguity and split into two atomic claims:
- AC_01: "hat eine genetische Komponente" → 82% (weak reading, easy to support)
- AC_02: "ist der primäre oder ausschließliche Faktor" → 18% (strong reading, contradicted)
- Aggregated: ~45%

### 2.2 Why Existing Fidelity Checks Don't Catch This

The pipeline has strong fidelity protections (Pass 2 prompt contract, Gate 1 `passedFidelity` check, evidence compression). But these target a DIFFERENT problem:

- **What they catch:** Evidence-derived contamination (study names, metrics, dates imported into claims)
- **What they miss:** Claim STRENGTH modification where the topic stays the same but the assertion strength changes

The Gate 1 fidelity check asks: "Is the claim traceable to the original input's meaning without importing evidence-derived assertions?" The answer for "hat eine genetische Komponente" is YES — it IS traceable to "genetisch bedingt". It's just a weaker version of the same assertion. The fidelity check catches additions but not weakening.

### 2.3 Secondary: Evidence Direction Cascade

Once the claim is softened/preserved, evidence classification follows correctly:
- For "has a component" (weak): evidence showing 20-50% heritability → SUPPORTS
- For "is determined" (strong): same evidence showing 20-50% heritability → CONTRADICTS

This is **correct behavior given the claim as stated**. The problem is upstream in claim extraction.

### 2.4 Tertiary: Source Fetch Degradation (amplifier)

3 of 5 qualified runs had 67% source fetch degradation on at least one query. MÄNNER had only 9 sources vs 20 for GENERAL. This amplifies the base asymmetry but is not the root cause.

---

## 3. Scope Boundary: What This Is NOT

This is NOT the same issue as the Inverse Claim Asymmetry Plan:
- **ICA Plan** addresses verdict-level integrity (grounding/direction validation) after claims and evidence are established
- **This issue** occurs at Stage 1 extraction, before evidence is gathered
- ICA Plan's integrity policies (now active) correctly fire on some of these jobs (direction warnings on MÄNNER, FRAUEN, SÄUGETIERE) but cannot fix the upstream claim softening
- The GENERAL claim at 75% passes ALL integrity checks because the softened claim genuinely IS supported

---

## 4. Proposed Multi-Agent Investigation Plan

### Phase A: Characterize (Research — no code changes)

**Goal:** Understand the scope, frequency, and linguistic patterns of claim strength modification.

#### A1. Linguistic Analysis (LLM Expert)
- Analyze how German "bedingt" (determined/conditioned by) is interpreted by Haiku and Sonnet across different syntactic frames
- Test whether the same softening occurs in English ("is genetically determined" vs "has a genetic component")
- Test French and other languages for equivalent ambiguity
- Classify: Is this a translation/interpretation problem specific to ambiguous German verbs, or a systematic tendency to soften strong claims?

#### A2. Evidence Direction Audit (Lead Developer or Senior Developer)
- For the GENERAL job (75%): manually audit 10+ evidence items classified as "supports". Would they still be "supports" if the claim were "ist genetisch bedingt" (literal) instead of "hat eine Komponente"?
- For the FRAUEN job (32%): audit the 16 "contradicts" items. Are they correctly classified given the literal claim?
- Quantify: How many evidence items switch direction based solely on the claim statement wording?

#### A3. Broader Claim Fidelity Audit (Code Reviewer or Senior Developer)
- Query the backup DB for ALL jobs with single-input claims and check how often Stage 1 modifies claim strength
- Categorize modifications: weakening, strengthening, neutral rephrasing, decomposition
- Check whether the fidelity gate (`passedFidelity`) ever catches strength modifications

### Phase B: Design Solutions (Lead Architect)

Based on Phase A findings, design one or more of:

#### B1. Claim Strength Preservation Constraint
Add a **strength preservation check** to Gate 1 validation:
- Compare the extracted claim's assertive strength against the original input
- Use LLM to assess: "Does the extracted claim preserve the strength/specificity of the original assertion, or does it weaken/strengthen it?"
- New gate dimension: `passedStrength` alongside existing `passedFidelity`

Key design question: Should this be a hard gate (reject weakened claims) or a soft correction (flag and re-extract)?

#### B2. Claim Canonicalization
Instead of allowing free-form extraction, add a constraint:
- For single-assertion inputs, the extracted `statement` MUST preserve the original wording unless structural reformulation is needed (e.g., question → assertion)
- Only decompose into multiple claims when the input genuinely contains multiple assertions

Key design question: When is decomposition legitimate vs harmful? The MENSCHEN split into "component" + "primary factor" was arguably the best result.

#### B3. Semantic Equivalence Validation
After extraction, validate with a dedicated LLM call:
- "Is this extracted claim semantically equivalent IN STRENGTH to the original input?"
- Not just "traceable to" (current fidelity check) but "equivalent in assertive force"

#### B4. Evidence-Direction Anchoring
If the claim wording changes, re-anchor evidence direction classification to the ORIGINAL input text, not the extracted claim statement. This prevents the cascade where softening changes all downstream evidence directions.

### Phase C: Implement and Validate (Senior Developer + calibration)

- Implement the chosen solution(s)
- Run the 6 German variants as a regression suite
- Expected outcome: all positive variants produce results within ≤10pp of each other
- Add to calibration fixtures as a "claim strength preservation" test category

---

## 5. Data Preserved for Study

All 6 jobs are in the current `factharbor.db`. For cross-reference, the backup DB at `C:\DEV\FactHarbor_Backups\factharbor_Backup_20260326.db` contains 4 historical runs of the GENERAL and NICHT claims showing 32-75% variance even within the same input.

### Key comparison matrix (current DB):

| Metric | GENERAL | MENSCHEN | MÄNNER | FRAUEN | SÄUGETIERE |
|--------|---------|----------|--------|--------|------------|
| Sources | 20 | 21 | 9 | 13 | 10 |
| Evidence | 61 | 76 | 61 | 66 | 47 |
| Sup:Contra | 23:1 | 18:8 | 10:9 | 3:16 | 6:8 |
| Balance ratio | 0.96 | 0.69 | 0.53 | 0.16 | 0.43 |
| Atomic claims | 1 | 2 | 1 | 1 | 1 |
| Fetch degradation | No | Yes (67%) | Yes (67%) | No | Yes (67%) |
| Search providers | CSE+Brave | CSE+Brave | CSE+Brave | CSE+Brave | CSE only |
| Grounding warning | No | Yes | No | No | Yes |
| Direction warning | No | Yes (AC_02) | Yes | No | Yes |

### Evidence for claim softening:

```
GENERAL input:  "Homosexualität ist genetisch bedingt"
GENERAL AC_01:  "Homosexualität hat eine genetische Komponente"    ← SOFTENED

MÄNNER input:   "Homosexualität bei Männern ist genetisch bedingt"
MÄNNER AC_01:   "Homosexualität bei Männern ist genetisch bedingt" ← PRESERVED

MENSCHEN input: "Homosexualität bei Menschen ist genetisch bedingt"
MENSCHEN AC_01: "Homosexualität bei Menschen hat eine genetische Komponente"    ← SOFTENED
MENSCHEN AC_02: "Die genetische Komponente ist der primäre/ausschließliche Faktor" ← STRENGTHENED (new claim)
```

---

## 6. Relationship to Existing Work

| Existing mechanism | Does it address this issue? | Why/why not |
|--------------------|----------------------------|-------------|
| Pass 2 fidelity contract | Partially | Prohibits evidence contamination; does NOT prohibit strength weakening |
| Gate 1 `passedFidelity` | No | Checks traceability to input, not equivalence in assertive strength |
| Evidence compression (120-char) | No | Prevents evidence → claim contamination, unrelated to softening |
| ICA Phase 1 integrity policies | Partially | Catches downstream direction inconsistencies but cannot undo upstream softening |
| ICA Phase 2 calibration | No | Measures cross-job consistency, not within-job claim fidelity |

---

## 7. Priority Assessment

**Impact: HIGH** — This affects ANY claim where the LLM chooses to interpret the assertion at a different strength level. It's not specific to German or to genetics — any ambiguous claim (and most natural language claims have ambiguity) could be affected.

**Frequency: Unknown** — Phase A3 audit needed to quantify.

**User-visibility: HIGH** — Users submitting near-identical inputs and getting 30-43pp different results will lose trust.

**Urgency: MEDIUM** — The integrity policies (ICA Phase 1) partially mitigate the worst outcomes, but the core issue remains.

---

## 8. Recommended Agent Assignments

| Phase | Agent/Role | Model Tier | Estimated Effort |
|-------|-----------|------------|-----------------|
| A1: Linguistic analysis | LLM Expert | Opus | 1-2 sessions |
| A2: Evidence direction audit | Senior Developer | Sonnet | 1 session |
| A3: Broader fidelity audit | Code Reviewer | Sonnet | 1 session |
| B: Solution design | Lead Architect | Opus | 1-2 sessions |
| C: Implementation | Senior Developer | Sonnet/Opus | 2-3 sessions |

**Minimum viable start:** A1 + A2 can run in parallel. B depends on A findings.
