# Lead Architect Handoff — ClaimBoundary Architecture Full Update

**Date:** 2026-02-16
**From:** Captain (via Captain Deputy + External Advisor consolidated input)
**To:** Lead Architect
**Action:** Update `ClaimBoundary_Pipeline_Architecture_2026-02-15.md` — full revision incorporating all agreed v1 features, decisions, and compliance requirements.

---

## 1. Captain's Decisions (Final)

### Round 1 (Brainstorming Review)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **D1: Claim Quality Gate** | **A — Merged** | `groundingQuality` assessed by Pass 2 Sonnet, validated in Gate 1. No separate Haiku call. Log Gate 1 rejection reasons per claim for auditability. |
| **D2: Self-Consistency Modes** | **A — Two modes (full / disabled)** | No "lightweight" Haiku mode. Haiku measures model capability differences, not verdict instability — misleading signal. Full = 2 Sonnet re-runs. Disabled = skip entirely. |
| **D3: Architecture Doc Update** | **A — Full update now** | All decisions are closed. The architecture doc must be the single definitive implementation reference. |

### Round 2 (Captain Comments)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **D4: EvidenceScope Structure** | **B — Named core + extensible `additionalDimensions`** | Keep `methodology` (required), `temporal` (required), `boundaries` (optional), `geographic` (optional) as stable core. Add `additionalDimensions: Record<string, string>` for domain-specific scope data the LLM can populate (e.g., `standard_of_proof`, `sample_size`). Core fields drive clustering; additional dimensions enrich it. Consider fully generic (Option A) for v2. |
| **D5: Qualitative Field Granularity** | **A — Field-by-field** | `probativeValue`: keep 3 levels. `harmPotential`: expand to 4 (D9). `centrality`: keep 3. `groundingQuality`: 4 levels (strong/moderate/weak/none). `scopeQuality`: 3 levels (complete/partial/incomplete). `specificityScore`: keep continuous 0-1. Rule: categorical for LLM classification, continuous for LLM assessment. |
| **D6: claimDirection "neutral"** | **B — Rename to "contextual"** | "neutral" is dead code in decision-making — never checked specifically, only used as fallback. Rename to "contextual" to signal clear semantics: evidence that provides relevant background without directional stance. |
| **D7: Structured VerdictNarrative** | **A — Yes** | Add `VerdictNarrative` type with `headline`, `evidenceBaseSummary`, `keyFinding`, `boundaryDisagreements[]`, `limitations`. Makes overall verdict meaningful for readers instead of a bare number. LLM-generated (Sonnet, 1 call in aggregation stage). |
| **D8: Rules Audit Timing** | **A — Lead Architect as Step 0** | Lead Architect audits AGENTS.md + Multi_Agent_Collaboration_Rules.md for AnalysisContext-specific rules BEFORE implementation. Deliverable: diff of rule changes needed. |
| **D9: harmPotential 4 Levels** | **A — Expand to critical/high/medium/low** | Addresses inflation problem: `critical` = direct death/injury allegation (1.5× weight), `high` = serious but not life-threatening (1.2× weight), `medium` = moderate impact (1.0×), `low` = minimal (1.0×). Creates space so truly dangerous claims get their own tier without inflating "high." |

**Status: All 9 decisions closed. No open items remain.**

---

## 2. Agreed v1 Feature Set (13 items)

All three reviewers (Lead Architect, Lead Developer, Senior Architect) aligned on these:

| # | Feature | Origin | LLM Cost | Code Est. | Notes |
|---|---------|--------|----------|-----------|-------|
| 1 | Two-pass evidence-grounded extraction | Architecture §8.1 | 3–5 Haiku | ~200 lines | Pass 2 includes `groundingQuality` field (Decision 1) |
| 2 | Mandatory EvidenceScope | Architecture §8.2 | 0 (prompt) | ~30 lines (Zod) | `methodology` + `temporal` required, non-empty |
| 3 | Congruence-focused clustering | Architecture §11 | 1 Sonnet | ~150 lines | Merge-vs-separate based on scope congruence |
| 4 | LLM debate pattern (advocate/challenger/reconciliation) | Idea B | +2 Sonnet | ~200 lines | 3-step sequential: advocate → challenger → reconciliation |
| 5 | Source triangulation scoring | Idea C | 0 | ~50 lines | Deterministic, plugs into aggregation weight chain |
| 6 | Multi-perspective verdict (quantitative signals only) | Idea D (scoped) | 0 (in verdict prompt) | ~80 lines | Per-boundary truth%, confidence, direction. NO per-boundary narratives in v1. |
| 7 | Self-consistency check (configurable: full/disabled) | Idea E + D2 | 0–2 Sonnet | ~60 lines | Re-run advocate call only (not full debate). Skip in deterministic mode. Two UCM modes only (Decision 2). |
| 8 | `isDerivative` flag + weight reduction | Idea A (v1 slice) | 0 (prompt) | ~20 lines | `derivativeMultiplier` in AggregationWeights. Use `derivedFromSourceUrl` (not internal evidence IDs). |
| 9 | Claim coverage matrix | Idea F | 0 | ~20 lines | Claims × boundaries matrix. Computed after Stage 3, before Stage 4. Logged to job events. |
| 10 | Verdict stage module (`verdict-stage.ts`) | Idea G | 0 | Architecture | Extract entire §8.4 as separate module. Do NOT add to orchestrated.ts. |
| 11 | Gate 1 enhancement (grounding quality + retry) | R1/P1 merged | 0 extra | ~30 lines | `groundingQuality` required from Pass 2. If >50% claims fail Gate 1, re-run preliminary search + Pass 2 once. |
| 12 | Verdict consistency check (structural) | P2 | 0 | ~10 lines | Structural checks ONLY — see §4 compliance constraints below. |
| 13 | Derivative validation | Senior Architect | 0 | ~10 lines | Verify `derivedFromSourceUrl` exists in fetched sources. Add `derivativeClaimUnverified` flag if not found. |

**Total extra LLM cost per run:** ~$0.60 (2 debate Sonnet + 0–2 self-consistency Sonnet)

---

## 3. v2 Deferred Items (Do NOT include in v1 design)

| Item | Why Deferred |
|------|-------------|
| Full evidence relationship graph (Idea A) | High complexity, graph data structure, noisy LLM relationships. v1's `isDerivative` flag captures the highest-value relationship. |
| Per-boundary narrative verdicts (Idea D full) | Per-boundary `reasoning` text multiplies LLM output by `boundaries × claims`. v1 quantitative signals provide the analytical value. |
| Per-boundary adversarial challenges | O(boundaries) extra LLM calls. v1 challenger targets overall verdict only. |
| Empirical threshold recalibration | Requires v1 data collection first. Plan as post-v1 calibration phase. |

---

## 4. Compliance Constraints (AGENTS.md — flagged by External Advisor)

These MUST be explicitly addressed in the updated architecture doc:

### 4.1 Verdict Consistency Check — Structural Only (R2 constraint)

The "deterministic consistency check" added after Step 4 (Feature #12) must be **structural invariant checks only**:

**Allowed (deterministic):**
- Evidence IDs referenced in verdicts exist in the evidence pool
- Boundary IDs in `boundaryFindings` are valid boundary IDs
- No cross-boundary evidence references unless explicitly flagged
- Claim coverage matrix completeness (every claim has ≥1 evidence or is flagged)
- Truth percentage within 0–100 range
- Verdict label matches truth percentage band

**NOT allowed (would require LLM):**
- Judging whether a verdict's reasoning is semantically consistent with its truth%
- Assessing whether boundary findings narratively support the overall verdict
- Any check that interprets text meaning

If semantic consistency checking is desired in the future, it must be routed through an LLM call and made a UCM-toggled quality gate.

### 4.2 Terminology / Schema Contract Change

ClaimBoundary replaces AnalysisContext in the new pipeline, but:
- The terminology reference (`WebHome.xwiki`) still defines AnalysisContext as the top-level structure
- UI components assume AnalysisContext-shaped data
- The API response contract currently uses `contextId` throughout (5 linked structures)

**Required in architecture doc:**
- Explicit section documenting this as a **schema and UI contract change**
- List of affected contracts: API response, UI components, xWiki terminology page
- Note: this is a **clean break** (Captain's earlier decision) — no backward compatibility needed, but the contracts must be documented so all layers are updated together.

### 4.3 UCM Enforcement — String Usage Boundary

Per AGENTS.md: "All text that goes into LLM prompts must be managed in UCM, not hardcoded inline in code."

Every new prompt introduced by the v1 features must be UCM-managed:

| New Prompt | Feature | UCM Key (suggested) |
|------------|---------|-------------------|
| Pass 1 quick extraction | #1 | `CLAIM_EXTRACTION_PASS1` |
| Pass 2 grounded extraction | #1 | `CLAIM_EXTRACTION_PASS2` |
| EvidenceScope extraction guidance | #2 | Part of existing evidence extraction prompt |
| Congruence clustering | #3 | `BOUNDARY_CLUSTERING` |
| Advocate verdict | #4 | `VERDICT_ADVOCATE` |
| Challenger | #4 | `VERDICT_CHALLENGER` |
| Reconciliation | #4 | `VERDICT_RECONCILIATION` |
| Gate 1 grounding check | #11 | Part of existing Gate 1 prompt |

These prompts live in `apps/web/prompts/` and are referenced from UCM config. No inline prompt strings in `.ts` code files.

### 4.4 Multilingual Robustness

Per AGENTS.md: "Analysis behavior must be robust across languages. Do not force translation as a prerequisite."

All new prompts must:
- Not assume English input text
- Preserve the original language of claims and evidence
- Use language-agnostic instructions (no English-specific patterns, regex, or word-order assumptions)
- Be tested with non-English scenarios in the integration test plan

---

## 5. Revised §8.4 Stage Design (Lead Developer's detailed proposal)

The verdict stage (§8.4) is the most heavily modified section. Here is the converged design integrating Features #4, #6, #7, and #12:

```
§8.4 VERDICT STAGE (5 steps, implemented as verdict-stage.ts module)

Step 1 — Advocate Verdict (Sonnet):
  Input:  AtomicClaim[] + EvidenceItem[] organized by ClaimBoundary
  Output: ClaimVerdict[] with per-boundary findings (truth%, confidence, direction, evidenceCount)
  Notes:  This is the base verdict. Per-boundary findings are QUANTITATIVE only (Feature #6).
          Evidence presented grouped by boundary so LLM understands methodological context.

Step 2 — Self-Consistency Check (Sonnet × 2, PARALLEL with Step 3):
  Input:  Same prompt as Step 1
  Run:    Re-execute Step 1 prompt 2× at selfConsistencyTemperature (UCM, default 0.3, floor 0.1, ceiling 0.7)
  Output: ConsistencyResult[] per claim: { average, spread, stable: boolean, assessed: boolean }
  Skip:   If UCM mode = "disabled" OR deterministic mode → return { assessed: false } for all claims
  Notes:  Re-runs the ADVOCATE call only, not the full debate.
          Uses same model tier as Step 1 (Sonnet). NOT Haiku (Decision 2).

Step 3 — Adversarial Challenge (Sonnet, PARALLEL with Step 2):
  Input:  Step 1 output (advocate verdicts + per-boundary breakdown)
  Prompt: "Argue strongest case against emerging verdicts. Assess:
           1. What assumptions does the evidence rely on?
           2. What evidence would we expect if the claim were FALSE — was it looked for?
           3. Are there methodological weaknesses in the supporting evidence?
           4. Is the evidence base truly independent?
           Cite evidence items by ID. Assess evidence COVERAGE, not just interpretation."
  Output: ChallengeDocument with per-claim challenges

Step 4 — Reconciliation (Sonnet):
  Input:  Step 1 verdicts + Step 3 challenges + Step 2 consistency data
  Output: Final ClaimVerdict[] with:
          - Revised truth% and confidence (incorporating challenge responses)
          - Consistency-adjusted confidence (high spread → confidence reduction)
          - Per-boundary findings retained from Step 1
          - Explicit response to each challenge point in reasoning field
  Notes:  The reconciliation sees the consistency data and can note instability in reasoning.

Step 5 — Verdict Validation (Haiku × 2, existing design):
  Check A: Grounding — does reasoning cite actual evidence items?
  Check B: Direction — does truth% align with evidence direction?
  Retry:  If validation fails for some verdicts, retry those in smaller batch.

THEN — Structural Consistency Check (deterministic, Feature #12):
  - Verify all evidence IDs in verdicts exist in evidence pool
  - Verify all boundary IDs in boundaryFindings are valid
  - Verify truth% is 0–100 and verdict label matches band
  - Verify claim coverage matrix completeness
  - Log any failures as warnings (do not block pipeline)
```

**Parallelism:** Steps 2 and 3 run in parallel (both need only Step 1 output). Step 4 waits for both.
**Critical path latency:** Step 1 → max(Step 2, Step 3) → Step 4 → Step 5.
**LLM calls:** 4–6 Sonnet (1 advocate + 0–2 consistency + 1 challenger + 1 reconciliation) + 2 Haiku (validation).

---

## 6. Revised §8.5 Aggregation Changes

Two additions to the aggregation stage:

### 6.1 Triangulation Scoring (Feature #5)

Computed BEFORE calling `calculateWeightedVerdictAverage()`. Pre-computed per claim and attached as `claim.triangulationFactor`:

| Triangulation Level | Condition | Factor |
|---------------------|-----------|--------|
| Strong | ≥3 boundaries pointing same direction | UCM `strongAgreementBoost` (default +0.15) |
| Moderate | 2 boundaries agreeing, 1 dissenting | UCM `moderateAgreementBoost` (default +0.05) |
| Weak | All evidence from 1 boundary only | UCM `singleBoundaryPenalty` (default -0.10) |
| Conflicted | Boundaries evenly split | Flag as contested |

All thresholds are UCM-configurable in CalcConfig:
```json
{
  "triangulation": {
    "strongAgreementBoost": 0.15,
    "moderateAgreementBoost": 0.05,
    "singleBoundaryPenalty": -0.10,
    "conflictedFlag": true
  }
}
```

### 6.2 Derivative Weight Reduction (Feature #8)

Evidence items with `isDerivative: true` get reduced weight via `derivativeMultiplier` (UCM, default 0.5) in AggregationWeights. This prevents 5 articles citing the same UN report from counting as 5 independent sources.

### 6.3 Aggregation Weight Formula (revised)

```
weight = centrality × harm × (confidence/100) × contestation × triangulationFactor × derivativeFactor
```

Where `derivativeFactor` adjusts based on the proportion of derivative evidence supporting the claim.

---

## 7. New UCM Parameters

All new tunable parameters introduced by v1 features:

| Parameter | Default | Section | Feature |
|-----------|---------|---------|---------|
| `selfConsistencyMode` | `"full"` | PipelineConfig | #7 |
| `selfConsistencyTemperature` | `0.3` | PipelineConfig | #7 |
| `selfConsistencyTemperatureFloor` | `0.1` | Hardcoded (structural) | #7 |
| `selfConsistencyTemperatureCeiling` | `0.7` | Hardcoded (structural) | #7 |
| `selfConsistencySpreadThresholds` | `[5, 12, 20]` | CalcConfig | #7 |
| `triangulation.strongAgreementBoost` | `0.15` | CalcConfig | #5 |
| `triangulation.moderateAgreementBoost` | `0.05` | CalcConfig | #5 |
| `triangulation.singleBoundaryPenalty` | `-0.10` | CalcConfig | #5 |
| `triangulation.conflictedFlag` | `true` | CalcConfig | #5 |
| `derivativeMultiplier` | `0.5` | CalcConfig (AggregationWeights) | #8 |
| `gate1GroundingRetryThreshold` | `0.5` | PipelineConfig | #11 |

Floor/ceiling for temperature are hardcoded (structural constants per AGENTS.md — "fixed design decisions that should not be tunable").

---

## 8. Claim Coverage Matrix (Feature #9)

Computed once after Stage 3 (boundaries created), before Stage 4 (verdict):

```
         CB_01   CB_02   CB_03
AC_01:   4       2       3       ← well-covered across boundaries
AC_02:   1       0       0       ← under-researched, single-boundary
AC_03:   0       3       1       ← boundary-specific coverage
```

**Uses:**
- Input to triangulation scoring (Feature #5) — determines boundary count per claim
- Input to sufficiency check (§8.2 step 10) — identifies under-researched claims
- Logged to job events for debugging and post-run analysis
- Structural consistency check (Feature #12) uses it for completeness validation

---

## 9. Single-Boundary Display Rule

When `claimBoundaries.length === 1`:
- Do NOT show "Perspective 1 of 1" or multi-boundary UI chrome
- Show boundary scope metadata inline beneath the verdict as contextual info:
  > **Evidence base:** Well-to-wheel analyses, 2019–2024, primarily European data
- Code detects single-boundary case and renders a simpler layout
- Note for UI spec (not architecture doc scope, but flag it)

---

## 10. Round 2 Decisions — Implementation Details (D4–D9)

### 10.1 D4: EvidenceScope — Named Core + Extensible Extras

Update the `EvidenceScope` interface:

```typescript
interface EvidenceScope {
  name: string;                              // Short label
  methodology: string;                       // REQUIRED — always meaningful
  temporal: string;                          // REQUIRED — always meaningful
  boundaries?: string;                       // What's included/excluded
  geographic?: string;                       // Source data geography
  sourceType?: SourceType;
  additionalDimensions?: Record<string, string>;  // LLM-populated domain-specific scope data
}
```

**`additionalDimensions` examples by domain:**
- Legal: `{ "standard_of_proof": "beyond reasonable doubt", "jurisdiction_level": "federal" }`
- Medical: `{ "sample_size": "N=12,000", "blinding": "double-blind" }`
- Economic: `{ "denomination": "2023 USD PPP", "sector_coverage": "all sectors" }`

**Clustering impact:** The congruence assessment prompt (§11) should be updated: "Also consider `additionalDimensions` when assessing scope compatibility. Dimensions present in one scope but absent in another are not grounds for separation — only contradictory dimension values indicate non-congruence."

**Sections to update:** §8.2 (extraction prompt guidance), §9.1 (EvidenceScope schema), §11.3 (congruence prompt), §11.5 (examples — add one showing additionalDimensions).

### 10.2 D5: Qualitative Field Granularity

| Field | Levels | Values | Gate/Formula Usage |
|-------|--------|--------|-------------------|
| `probativeValue` | 3 | high / medium / low | low = filter out; high = quality metric numerator |
| `harmPotential` | **4** | **critical** / high / medium / low | See D9 below |
| `centrality` | 3 | high / medium / low | Weight: 3.0 / 2.0 / 1.0 (UCM) |
| `groundingQuality` | **4** | **strong / moderate / weak / none** | Gate 1: ≥moderate = pass. strong = fully grounded in preliminary evidence. none = cold extraction. |
| `scopeQuality` | **3** | **complete / partial / incomplete** | complete = all fields meaningful. partial = methodology+temporal present but vague. incomplete = missing required fields. |
| `specificityScore` | continuous | 0.0–1.0 | Gate 1: ≥0.6 = pass |
| `claimDirection` | 3 | supports / contradicts / **contextual** | See D6 below |

**Rule for LLM prompts:** "Use categorical labels for classification outputs (the LLM chooses a category). Use continuous 0–1 for assessment outputs (the LLM rates on a scale). Never ask for '0.73 probativeValue' when you mean 'high.'"

**Sections to update:** §9.1 (all affected type definitions), §8.1 (groundingQuality in Pass 2 output + Gate 1), §8.2 (scopeQuality in extraction), all prompts referencing these fields.

### 10.3 D6: claimDirection — Rename "neutral" to "contextual"

Replace throughout:
- Schema: `claimDirection: "supports" | "contradicts" | "contextual"`
- Prompt guidance: "Use `contextual` for evidence that provides relevant background — temporal context, definitional facts, process descriptions — without supporting or contradicting the claim. Do NOT use `contextual` as a fallback when direction is unclear; assess direction first."
- Default/fallback: Change `|| "neutral"` to `|| "contextual"` in normalization code (implementation detail, but note it).

**Sections to update:** §9.1 (EvidenceItem type), §9.2 (retained types note), §8.2 (extraction guidance), any verdict prompt that labels evidence by direction.

### 10.4 D7: Structured VerdictNarrative

Add to `OverallAssessment`:

```typescript
interface VerdictNarrative {
  headline: string;              // "Evidence consistently shows X, though Y"
  evidenceBaseSummary: string;   // "14 items, 9 sources, 3 perspectives"
  keyFinding: string;            // Main synthesis (2-3 sentences)
  boundaryDisagreements?: string[]; // Where and why boundaries diverge
  limitations: string;           // What the analysis couldn't determine
}
```

**Generation:** Single Sonnet call at the end of §8.5 (after aggregation, before report assembly). Input: all claim verdicts, boundary structure, triangulation scores, coverage matrix. This replaces the current free-form `narrative: string`.

**Sections to update:** §8.5 (add narrative generation step), §9.1 (VerdictNarrative type, update OverallAssessment), §7.2 (add 1 Sonnet call to LLM budget).

### 10.5 D8: Rules Audit — Step 0

**Task:** Before implementation, the Lead Architect audits these documents for AnalysisContext-specific rules:

| Document | Check For |
|----------|-----------|
| `AGENTS.md` | Terminology table, Architecture section line references, Key Files table |
| `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` | Area-to-document mapping, role reading lists, any AnalysisContext-specific guidance |
| xWiki terminology page (`WebHome.xwiki`) | AnalysisContext definition → replace with ClaimBoundary |
| `apps/web/prompts/orchestrated.prompt.md` | Entire file is for old pipeline — note what carries forward vs new prompt file |

**Deliverable:** A short diff/change list showing rules to update, remove, or add. Captain reviews before implementation begins.

### 10.6 D9: harmPotential — 4 Levels

| Level | Definition | Weight Multiplier (UCM) |
|-------|-----------|------------------------|
| `critical` | The claim ITSELF alleges death, severe physical injury, imminent safety hazards, or major fraud (>$1M) | **1.5×** |
| `high` | Serious but not life-threatening: significant legal consequences, major reputational damage, substantial economic harm | **1.2×** |
| `medium` | Moderate impact: procedural fairness, policy criticism, moderate economic/legal effects. **DEFAULT when uncertain.** | **1.0×** |
| `low` | Minimal real-world impact: routine updates, factual descriptions, low-stakes claims | **1.0×** |

**Prompt examples (include in extraction prompt):**
- "The drug caused 12 deaths" → `critical` (directly alleges death)
- "The trial violated due process" → `high` (serious legal consequence, not life-threatening)
- "The regulatory approval was rushed" → `medium` (process criticism)
- "The study was published in 2023" → `low` (factual description)

**UCM parameters:** Add `harmPotentialMultipliers` to CalcConfig:
```json
{
  "harmPotentialMultipliers": {
    "critical": 1.5,
    "high": 1.2,
    "medium": 1.0,
    "low": 1.0
  }
}
```

**Sections to update:** §8.1 (extraction prompt examples), §8.5 (aggregation weight formula), §9.1 (AtomicClaim type), §13 (UCM parameters).

---

## 11. Captain Comment Actions (Non-Decision Items)

These are documentation/design requirements from the Captain that don't need a decision — just implementation:

| # | Captain Comment | Action for Lead Architect |
|---|----------------|--------------------------|
| 7 | Tag [LLM]/[Search]/[Ext] in diagrams | Update all diagrams (§4.1, §6, §7, §11.2) to tag each step |
| 8 | State LLM/Search inputs and outputs | Add I/O contract blocks for every [LLM] and [Search] call in §8.1–§8.5 |
| 9 | Evidence-informed claim granularity | Update §8.1 Pass 2 guidance: "Match claim specificity to the evidence level. Don't force artificial atomicity. A claim too atomic to research is worse than a compound claim that evidence naturally engages with." Update Gate 1: specificity assessed relative to evidence landscape, not in absolute terms. |
| 10 | Key Factors removal | Already handled (§10) — no action |

---

## 12. Sections to Update in Architecture Doc (Complete)

| Section | Changes (Round 1) | Changes (Round 2) |
|---------|-------------------|-------------------|
| **§8.1** | `groundingQuality` + Gate 1 retry | Evidence-informed granularity rule (D9 comment). `harmPotential` 4-level examples. `groundingQuality` 4-level definition. |
| **§8.2** | `isDerivative` + `derivedFromSourceUrl` | `additionalDimensions` on EvidenceScope (D4). `scopeQuality` 3-level (D5). `claimDirection` rename neutral→contextual (D6). |
| **§8.4** | 5-step verdict stage | (no additional Round 2 changes) |
| **§8.5** | Triangulation + derivative weight + coverage matrix | Add `VerdictNarrative` generation step (D7). Update harmPotential weights to 4-level (D9). |
| **§9.1** | New types from Round 1 | `EvidenceScope.additionalDimensions` (D4). `VerdictNarrative` type (D7). `harmPotential` → 4 values (D9). `groundingQuality` → 4 values (D5). `scopeQuality` → 3 values (D5). `claimDirection` → rename neutral→contextual (D6). |
| **§9.2** | EvidenceItem additions | Note `claimDirection` value change (D6). |
| **§11** | (Round 1 changes) | Update congruence prompt to handle `additionalDimensions` (D4). Add example. |
| **§12** | Gate 1 + structural check | Gate 1 uses `groundingQuality` 4-level scale (D5). |
| **§13** | UCM parameters from Round 1 | Add `harmPotentialMultipliers` 4-level (D9). |
| **All diagrams** | — | Tag [LLM], [Search], [Ext] (Captain comment 7). |
| **All §8 LLM calls** | — | Add I/O contract blocks (Captain comment 8). |
| **New: Step 0** | — | Rules audit specification (D8). |

---

## 13. Constraints and Reminders

- **AGENTS.md compliance** is non-negotiable: LLM Intelligence rule, String Usage Boundary, Multilingual Robustness, No Hardcoded Keywords.
- **All prompts** go in `apps/web/prompts/` and are referenced from UCM. No inline prompt strings in `.ts` files.
- **Verdict stage** is a separate module (`verdict-stage.ts`), not additions to `orchestrated.ts`.
- **v2 items** should be mentioned as "future work" but NOT designed in detail — avoid over-engineering v1 for v2 extensibility.
- **Testing strategy** for each feature should be noted (deterministic unit tests vs. expensive integration tests).
- **Categorical for classification, continuous for assessment** — the qualitative field design rule (D5).
- **Evidence-informed claim granularity** — don't force artificial atomicity (Captain comment 9).
- **Rules audit (Step 0)** must complete before implementation begins (D8).

---

*Handoff document complete. All 9 decisions are final. No open items remain. Lead Architect may proceed with full architecture document update (Round 2).*

---

*Handoff document complete. All decisions are final. Lead Architect may proceed with full architecture document update.*
