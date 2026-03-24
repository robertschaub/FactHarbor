# LLM-Assessed Aggregation Weight Factors — Implementation Plan

**Created:** 2026-03-17
**Status:** Draft v4 — post-implementation-review corrections
**Original Author:** Senior Developer (Claude Code)
**Revised by:** Lead Architect (Claude Code, Opus 4.6)
**Reviewed by:** LLM Expert (Claude Code, Opus 4.6), Lead Developer (Claude Code, Opus 4.6)
**Trigger:** §4.3 of `../ARCHIVE/SR_Evidence_Weighting_Investigation_2026-03-16.md` flagged triangulation and derivative factor as deterministic heuristics making analytical judgments, violating the LLM Intelligence mandate in AGENTS.md.

---

## 1. Problem Statement

Two aggregation weight factors in Stage 5 are deterministic heuristics making analytical judgments about evidence quality and claim relationships. Both violate the AGENTS.md "LLM Intelligence (MANDATORY)" rule.

### 1.1 Triangulation (`computeTriangulationScore`, `claimboundary-pipeline.ts:5733`)

Hardcoded decision tree classifies cross-boundary evidence agreement:

```
≤1 boundary       → "weak"   (factor = -0.10)
≥3 supporting     → "strong" (factor = +0.15)
≥2 sup, ≤1 contra → "moderate" (factor = +0.05)
sup ≈ contra (±1) → "conflicted" (factor = 0)
sup > contra      → "moderate" (factor = +0.05)
else              → "weak"   (factor = -0.10)
```

**What it cannot distinguish:**

1. **Independent corroboration vs echo chamber** — 3 boundaries all citing the same original study score "strong", identical to 3 boundaries with genuinely independent methodologies.
2. **Fundamental contradiction vs scoping disagreement** — A boundary contradicting on temporal scope (pre-2020 vs post-2020) scores the same as one contradicting on substance.
3. **Authoritative single-boundary evidence** — One peer-reviewed meta-analysis in a single boundary gets the same -10% penalty as one opinion blog post.
4. **Mixed/neutral boundary semantics** — `"mixed"` and `"neutral"` evidence directions are ignored, losing information.

### 1.2 Derivative Factor (`computeDerivativeFactor`, `claimboundary-pipeline.ts:5790`)

Deterministic ratio calculation penalizes evidence redundancy:

```typescript
derivativeRatio = derivativeCount / supportingEvidence.length
derivativeFactor = 1.0 - (derivativeRatio × (1.0 - derivativeMultiplier))
// Range: [derivativeMultiplier, 1.0] — default [0.5, 1.0]
```

**What it cannot distinguish:**

1. **Genuinely additive derivative** — A systematic review that synthesizes 50 primary studies adds analytical value beyond any individual study, but is penalized as "derivative" because `isDerivative=true`.
2. **Mere repackaging** — A blog post that quotes a news article verbatim is correctly penalized, but gets the same penalty as the systematic review above.
3. **Partial derivative** — An evidence item that derives some conclusions from an existing source but adds new analysis is binary: either `isDerivative=true` or `false`.

### 1.3 Combined Impact

Both factors enter the final weight formula multiplicatively:

```
weight = centrality × harm × confidence × (1 + triangulationFactor) × derivativeFactor × probative
```

- Triangulation: multiplier range **0.90 to 1.15** (±15% swing)
- Derivative: multiplier range **0.50 to 1.00** (up to 50% reduction)
- Combined worst case: **0.45x** (weak triangulation + all derivative evidence)
- Combined best case: **1.15x** (strong triangulation + no derivative evidence)

For a central, high-harm claim, the absolute weight difference between worst and best case is **~70%** — not negligible.

---

## 2. Architectural Decision: Combined LLM Assessment

### 2.1 Decision: Batch both factors into one LLM call

**Rationale:** Both factors assess evidence quality/diversity for the same claims using overlapping evidence metadata. Separate calls would be wasteful (violates "batch aggressively" mandate) and would see the same data twice. A single `AGGREGATION_QUALITY_ASSESSMENT` prompt assesses both triangulation quality and derivative-evidence informativeness per claim.

**Renamed from** `TRIANGULATION_ASSESSMENT` to `AGGREGATION_QUALITY_ASSESSMENT` to reflect the expanded scope.

### 2.2 What changes

| Component | Before | After |
|-----------|--------|-------|
| **Triangulation level** | Deterministic threshold tree | **Unchanged** — remains structurally derived from boundary counts (preserves UI semantics) |
| **Triangulation factor** | Lookup from level (fixed values) | LLM-produced continuous value, clamped to UCM bounds |
| **Derivative factor** | Deterministic ratio `derivativeCount/total` | LLM-assessed informativeness, clamped to UCM bounds |
| **`TriangulationScore` type** | 5 fields | +2 fields: `rationale`, `assessmentSource` |
| **New type** | — | `DerivativeAssessment` with `factor`, `rationale`, `assessmentSource` |
| **UCM config** | Separate threshold configs | Unified bounds + `llmAssessment` toggle |
| **Prompt** | N/A | New `AGGREGATION_QUALITY_ASSESSMENT` section |
| **LLM calls** | 0 | +1 batched Haiku call |

### 2.3 What stays deterministic (per AGENTS.md "KEEP")

- Counting supporting/contradicting boundaries from pre-classified `evidenceDirection` labels
- Counting `isDerivative` flags on evidence items (structural metadata, not interpretation)
- Clamping LLM-produced factors within UCM min/max bounds
- The `(1 + triangulationFactor) × derivativeFactor` multiplication in the weight formula
- Fallback to current deterministic logic on LLM failure
- `thesisRelevance` filtering (weight=0 for non-direct claims)
- `probativeFactor` average computation (probativeValue is LLM-assigned upstream)

---

## 3. Data Flow Analysis

### 3.1 What data is already available at Stage 5

When `aggregateAssessment()` runs, these are populated:

| Data | Source | Available in Stage 5 |
|------|--------|---------------------|
| `verdict.boundaryFindings[]` | LLM (Stage 4 advocate verdict) | ✅ Per-claim boundary-level TP, confidence, direction, evidence count |
| `verdict.supportingEvidenceIds[]` | LLM (Stage 4) | ✅ IDs of cited evidence |
| `verdict.contradictingEvidenceIds[]` | LLM (Stage 4) | ✅ IDs of counter-evidence |
| `evidence[].isDerivative` | LLM (Stage 2 extraction) | ✅ Boolean flag |
| `evidence[].derivedFromSourceUrl` | LLM (Stage 2 extraction) | ✅ Original source URL |
| `evidence[].derivativeClaimUnverified` | LLM (Stage 2 extraction) | ✅ Whether derivative claim was verified |
| `evidence[].sourceType` | LLM (Stage 2 extraction) | ✅ peer_reviewed, news_primary, etc. |
| `evidence[].source.url` | Fetch result (Stage 2) | ✅ Source domain |
| `coverageMatrix` | Deterministic (Stage 3) | ✅ Which boundaries cover which claims |
| `boundaries[].name` | LLM (Stage 3 clustering) | ✅ Human-readable boundary description |
| `boundaries[].methodology` | LLM (Stage 3 clustering) | ✅ Dominant methodology |

### 3.2 What additional context enriches the LLM assessment

For the LLM to assess **independence** (triangulation) and **informativeness** (derivative), it needs:

1. **Source domain diversity per boundary** — Are 3 supporting boundaries pulling from 3 different domains, or do they all cite `reuters.com`? Computed from evidence items linked to each boundary via coverageMatrix.

2. **Source type distribution** — `peer_reviewed_study` + `government_report` + `news_primary` is stronger triangulation than `news_primary` × 3. Already in `evidence[].sourceType`.

3. **Derivative source lineage** — For derivative evidence, the `derivedFromSourceUrl` tells the LLM whether a "derivative" is a meaningful synthesis or a mere repackaging.

**Key insight:** All of this data is already available. The current deterministic functions simply don't use it. The LLM can.

### 3.3 Input construction for the LLM call

```typescript
// Per-claim enriched input
{
  claimId: string,
  claimStatement: string,        // The claim text (needed for independence-type assessment)
  boundaryFindings: {
    boundaryId: string,
    boundaryName: string,        // "Peer-reviewed studies (2020-2024)"
    methodology: string,         // "Meta-analysis of clinical trials"
    evidenceDirection: string,   // "supports" | "contradicts" | "mixed" | "neutral"
    evidenceCount: number,
    sourceDomains: string[],     // NEW enrichment: unique domains in this boundary for this claim
    sourceTypes: string[],       // NEW enrichment: source types in this boundary for this claim
  }[],
  supportingEvidence: {
    id: string,
    isDerivative: boolean,
    derivedFromSourceUrl?: string,
    sourceType: string,
    sourceDomain: string,
  }[],
  derivativeRatio: number,       // Pre-computed structural stat (the LLM interprets, not decides)
  boundaryCount: number,
  supportingCount: number,       // Pre-counted (structural)
  contradictingCount: number,    // Pre-counted (structural)
}
```

> **IMPORTANT — Anchoring prevention (LLM Expert review finding):** The input deliberately EXCLUDES `truthPercentage` and `confidence` from `boundaryFindings`. Including numerical assessments from Stage 4 creates a documented LLM anchoring effect where the model correlates the factor with prior TP values instead of assessing structural independence. The LLM should assess evidence *quality and independence*, not whether boundaries "got the right answer."

> **IMPORTANT — No `findingSummary` field (v4 correction):** The v3 plan introduced a `findingSummary` field for "scoping vs substantive disagreement" distinction, but `BoundaryFinding` in `types.ts` carries only `boundaryId`, `boundaryName`, `truthPercentage`, `confidence`, `evidenceDirection`, `evidenceCount`. There is no textual summary in the Stage 4 contract. Adding one would require Stage 4 prompt/schema/parsing changes not scheduled in this plan — and synthesizing one deterministically from verdict reasoning text would violate the AGENTS.md semantic-heuristic prohibition. Instead, the LLM must infer disagreement type from the available structural signals: `boundaryName` (often encodes scope, e.g., "European studies 2020-2024"), `methodology`, `evidenceDirection`, and `sourceTypes`. This is a **known limitation** — if regression testing shows Haiku cannot reliably distinguish scoping from substantive disagreement with these signals alone, the mitigation is (a) upgrade to Sonnet via UCM, or (b) plan a separate Stage 4 enhancement to add `findingSummary` to `BoundaryFinding`.

**Token estimate per claim:** ~150-300 tokens input. For 5 claims: ~750-1500 tokens total. `maxTokens` for the call: **2000** (prevents runaway generation).

---

## 4. Prompt Design: `AGGREGATION_QUALITY_ASSESSMENT`

### 4.1 Prompt structure (in `apps/web/prompts/claimboundary.prompt.md`)

**System context (lean):**
- You are assessing the quality of evidence corroboration and source independence for fact-checking claims.
- You receive pre-counted structural statistics (boundary counts, derivative ratios). Your job is to interpret what these patterns mean, not to re-count.

**Assessment instructions (abstract, per AGENTS.md — no domain terms):**

For each claim, assess two dimensions:

**A. Triangulation Quality** — How much should cross-boundary agreement boost or penalize this claim's weight?

Evidence direction values are: `"supports"`, `"contradicts"`, `"mixed"`, `"neutral"`. All four carry information — do not treat `"mixed"` or `"neutral"` as absent data.

Consider:
- Do supporting boundaries represent **genuinely independent** methodological approaches, or do they share upstream sources/data?
- When boundaries disagree, is it a **substantive** disagreement or a **scoping** difference (different time periods, geographies, definitions)? Use `boundaryName` and `methodology` to infer this.
- Is a single boundary with **authoritative**, high-evidence-count evidence more trustworthy than multiple shallow boundaries?
- Does **source domain diversity** (different websites/publishers) indicate independence, or could different outlets report the same wire story?
- What **source type diversity** exists across boundaries (academic, government, journalistic, statistical)?

Assess based on structural metadata, not language of the evidence.

Output: `triangulationFactor` (number, bounded by min/max), `triangulationRationale` (1-2 sentences maximum).

> **Note:** The LLM produces only the continuous `triangulationFactor`. The categorical `level` ("strong"/"moderate"/"weak"/"conflicted") is derived **structurally** from the pre-counted supporting/contradicting boundary counts — the same logic as the current deterministic function. This preserves the existing UI semantics where `"conflicted"` specifically means "both supporting and contradicting boundary evidence are present" (shown in red with ⚠ icon and an explanatory tooltip). The LLM cannot change a structurally-conflicted case into "moderate" or vice versa — it only determines how much the factor boosts or penalizes the claim weight within the level's semantic frame.

**B. Derivative Evidence Informativeness** — How much should derivative evidence reduce this claim's weight?

Consider:
- Does derivative evidence **add analytical value** (e.g., a review synthesizing many primary sources) or merely **repackage** the same information?
- Is the `derivedFromSourceUrl` the same across multiple derivative items (pure echo) or different (independent synthesis)?
- What proportion of supporting evidence is derivative, and does the remaining primary evidence alone substantiate the claim?

Output: `derivativeFactor` (number 0.3-1.0), `derivativeRationale` (1 sentence maximum).

Each rationale must be 1-2 sentences. Do not elaborate beyond the key reason for your assessment.

### 4.2 Output schema (Zod)

```typescript
const AggregationQualitySchema = z.object({
  assessments: z.array(z.object({
    claimId: z.string(),
    // Factor only — level is derived deterministically from factor using UCM bands
    triangulationFactor: z.number(),
    triangulationRationale: z.string(),
    derivativeFactor: z.number(),
    derivativeRationale: z.string(),
  })),
});
```

### 4.2.1 Structural level classification (v4 correction — preserves UI semantics)

The `level` is **NOT derived from the factor**. It is derived from the structural supporting/contradicting counts using the existing deterministic logic — the same `computeTriangulationScoreDeterministic()` classification tree:

```typescript
// Level is always structurally derived (same logic as current production)
function classifyTriangulationLevel(
  boundaryCount: number,
  supporting: number,
  contradicting: number,
  config: TriangulationConfig,
): TriangulationScore["level"] {
  if (boundaryCount <= 1) return "weak";
  if (supporting >= 3) return "strong";
  if (supporting >= 2 && contradicting <= 1) return "moderate";
  if (supporting > 0 && contradicting > 0 && Math.abs(supporting - contradicting) <= 1) return "conflicted";
  if (supporting > contradicting) return "moderate";
  return "weak";
}
```

**Why this matters:** `"conflicted"` is shown in the UI with a red badge, ⚠ icon, and a user-facing tooltip: *"Conflicted: X evidence approaches support and Y contradict this claim..."* (`page.tsx:2810-2811`). This label means "both supporting and contradicting boundary evidence exist" — a structural fact about the evidence distribution. Deriving it from a continuous factor would break this semantic contract: a weak single-boundary case could land in the "conflicted" band, or a genuinely conflicted case could be relabeled "moderate."

**The LLM controls only the `factor`** — how much the claim weight is boosted or penalized. The `level` is the structural classification; the `factor` is the quality-aware magnitude.

### 4.3 What the prompt must NOT do

Per AGENTS.md analysis prompt rules:
- No domain-specific examples (no "climate studies", "political polls", etc.)
- No terminology that guides the LLM toward specific boundary groupings
- The LLM must NOT see the current truth percentages of the overall assessment (anchoring risk) — it only sees per-boundary findings, which are already LLM-determined in Stage 4

---

## 5. UCM Config Changes

### 5.1 Schema changes (`config-schemas.ts`)

```typescript
// Expanded triangulation config
triangulation: z.object({
  // Master toggle: true = LLM assessment, false = deterministic fallback
  llmAssessment: z.boolean(),
  // Bounds for LLM-produced triangulation factor (clamped post-LLM)
  factorMin: z.number().min(-0.3).max(0),
  factorMax: z.number().min(0).max(0.5),
  // Legacy deterministic thresholds (used when llmAssessment=false)
  strongAgreementBoost: z.number().min(0).max(0.5),
  moderateAgreementBoost: z.number().min(0).max(0.2),
  singleBoundaryPenalty: z.number().min(-0.3).max(0),
  conflictedFlag: z.boolean(),
}).optional(),

// Expanded derivative config (replaces bare `derivativeMultiplier`)
derivativeAssessment: z.object({
  // When llmAssessment is true (triangulation toggle controls both), LLM assesses informativeness
  factorMin: z.number().min(0).max(1),
  factorMax: z.number().min(0).max(1),
  // Legacy deterministic multiplier (used when llmAssessment=false)
  deterministicMultiplier: z.number().min(0).max(1),
}).optional(),

// Keep derivativeMultiplier as alias for backward compatibility
derivativeMultiplier: z.number().min(0).max(1).optional(),
```

### 5.2 Default values (`calculation.default.json`)

```json
"triangulation": {
  "llmAssessment": false,
  "factorMin": -0.15,
  "factorMax": 0.20,
  "strongAgreementBoost": 0.15,
  "moderateAgreementBoost": 0.05,
  "singleBoundaryPenalty": -0.10,
  "conflictedFlag": true
},
"derivativeAssessment": {
  "factorMin": 0.3,
  "factorMax": 1.0,
  "deterministicMultiplier": 0.5
}
```

### 5.3 Config migration and staged rollout (v4 correction)

**Existing `config.db` instances will have the old triangulation shape.** Per feedback memory `feedback_deploy_config_state.md`: code defaults only seed new DBs — production `config.db` retains old values.

The `mergeWithDefaults()` function in `config-loader.ts:193-209` automatically fills missing fields from TypeScript/JSON defaults. This means old config.db instances will get `llmAssessment` injected from the JSON defaults.

**Resolution (AD-4 revised again — staged rollout):**

The JSON default is `llmAssessment: false`. This means:
- Old config.db instances: `mergeWithDefaults` injects `false` → deterministic (no behavior change)
- New installations: start deterministic
- After step 11 (regression benchmarks) passes acceptance criteria → change JSON default to `true` and update the TypeScript constant

This ensures the **regression gate is a real gate** — the behavior change cannot land before benchmarks confirm it is safe. The alternative (defaulting `true` before benchmarks run) puts the acceptance gate after the fact.

Schema approach: `.optional()` on new fields. The `mergeWithDefaults` mechanism handles the rest. No dedicated migration function needed in `config-storage.ts`.

### 5.4 Level remains structurally derived (v4 correction)

The `level` field on `TriangulationScore` is **NOT derived from the LLM-produced factor**. It is derived from the structural supporting/contradicting counts using the same logic as the current deterministic function. See §4.2.1 for details.

No `levelBands` UCM config is needed. The existing `strongAgreementBoost`/`moderateAgreementBoost`/`singleBoundaryPenalty` thresholds continue to control both level classification AND the factor value when `llmAssessment: false`.

---

## 6. Type Changes

### 6.1 `TriangulationScore` (`types.ts`)

```typescript
export interface TriangulationScore {
  boundaryCount: number;
  supporting: number;
  contradicting: number;
  level: "strong" | "moderate" | "weak" | "conflicted";
  factor: number;
  rationale?: string;                        // NEW: LLM or fallback explanation
  assessmentSource?: "llm" | "deterministic"; // NEW: provenance tracking
}
```

### 6.2 New `DerivativeAssessment` field on `CBClaimVerdict`

```typescript
// Add to CBClaimVerdict interface:
derivativeAssessment?: {
  factor: number;                            // 0.3-1.0 (LLM) or computed (deterministic)
  rationale?: string;                        // LLM explanation
  assessmentSource: "llm" | "deterministic";
};
```

The existing `derivativeFactor` computation in `aggregateAssessment` now reads from `verdict.derivativeAssessment?.factor` when available, falling back to `computeDerivativeFactorDeterministic()`.

---

## 7. Code Changes

### 7.1 New function: `assessAggregationQuality()` (async, LLM)

```typescript
export async function assessAggregationQuality(
  claimVerdicts: CBClaimVerdict[],
  claims: AtomicClaim[],
  evidence: EvidenceItem[],
  boundaries: ClaimAssessmentBoundary[],
  coverageMatrix: CoverageMatrix,
  calcConfig: CalcConfig,
  pipelineConfig: PipelineConfig,
): Promise<Map<string, { triangulation: TriangulationScore; derivative: DerivativeAssessment }>>
```

**Location:** New `apps/web/src/lib/analyzer/aggregation-quality.ts` module (Lead Developer review: confirmed extraction). The pipeline file is 6159 lines — adding 200-300 lines of LLM call infrastructure would push it past maintainability limits. Follows the `verdict-stage.ts` extraction precedent.

**This module also contains** the renamed deterministic fallback functions (`computeTriangulationScoreDeterministic`, `computeDerivativeFactorDeterministic`) and the `deriveTriangulationLevel()` band mapper — keeping all aggregation quality logic co-located.

**LLM call pattern (Lead Developer review finding):** Use `generateText()` + `Output.object()` directly (same as `generateVerdictNarrative()`), NOT `createProductionLLMCall()`. The latter carries Stage 4-specific assumptions (error naming, warning collector). Model resolution via `getModelForTask("aggregation_quality", ...)` — register new task type mapped to Haiku tier.

**Full codebase-compliant call pattern** (matches `generateVerdictNarrative` at `claimboundary-pipeline.ts:5889`):

```typescript
import { generateText, Output } from "ai";
import {
  getModelForTask,
  extractStructuredOutput,
  getStructuredOutputProviderOptions,
  getPromptCachingOptions,
} from "./llm";
import { recordLLMCall } from "./metrics-integration";
import { loadAndRenderSection } from "./prompt-loader";

// Inside assessAggregationQuality():
const rendered = await loadAndRenderSection("claimboundary", "AGGREGATION_QUALITY_ASSESSMENT", {
  claims: JSON.stringify(enrichedClaims, null, 2),
});
if (!rendered) {
  throw new Error("Stage 5: Failed to load AGGREGATION_QUALITY_ASSESSMENT prompt section");
}

const model = getModelForTask("aggregation_quality", undefined, pipelineConfig);
const llmCallStartedAt = Date.now();

const result = await generateText({
  model: model.model,
  messages: [
    {
      role: "system",
      content: rendered.content,
      providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
    },
    {
      role: "user",
      content: `Assess aggregation quality factors for ${enrichedClaims.length} claims.`,
    },
  ],
  temperature: 0.1,
  maxTokens: 2000,
  output: Output.object({ schema: AggregationQualitySchema }),
  providerOptions: getStructuredOutputProviderOptions(
    pipelineConfig.llmProvider ?? "anthropic",
  ),
});

const parsed = extractStructuredOutput(result);
if (!parsed) {
  throw new Error("Stage 5: LLM returned no structured output for AggregationQuality");
}
const validated = AggregationQualitySchema.parse(parsed);

recordLLMCall({
  taskType: "aggregate",
  provider: model.provider,
  modelName: model.modelName,
  promptTokens: result.usage?.inputTokens ?? 0,
  completionTokens: result.usage?.outputTokens ?? 0,
  totalTokens: result.usage?.totalTokens ?? 0,
  durationMs: Date.now() - llmCallStartedAt,
  success: true,
  schemaCompliant: true,
});
```

This includes prompt caching on the system message (`getPromptCachingOptions`), Anthropic structured-output mode forcing (`getStructuredOutputProviderOptions` → `jsonTool`), proper output extraction (`extractStructuredOutput`), Zod validation (`.parse`), and LLM call recording (`recordLLMCall`).

### 7.2 Renamed functions

| Current name | New name | Purpose |
|-------------|----------|---------|
| `computeTriangulationScore` | `computeTriangulationScoreDeterministic` | Deterministic fallback (same logic) |
| `computeDerivativeFactor` | `computeDerivativeFactorDeterministic` | Deterministic fallback (same logic) |

Both are kept as-is for the fallback path and `llmAssessment: false` mode.

### 7.3 Integration in `aggregateAssessment()`

```typescript
// Stage 5, Step 1: Quality assessment (replaces current triangulation loop)
const triangulationConfig = calcConfig.aggregation?.triangulation;
const useLLMAssessment = triangulationConfig?.llmAssessment === true; // default false until step 12

let qualityAssessments: Map<string, { triangulation, derivative }> | null = null;

if (useLLMAssessment) {
  try {
    qualityAssessments = await assessAggregationQuality(
      claimVerdicts, claims, evidence, boundaries, coverageMatrix, calcConfig, pipelineConfig,
    );
  } catch (err) {
    // Fallback — silent severity (deterministic is current production behavior, fully recovers)
    console.warn(`[Pipeline] LLM aggregation quality assessment failed, using deterministic fallback: ${err}`);
  }
}

// Apply per-verdict
for (const verdict of claimVerdicts) {
  const qa = qualityAssessments?.get(verdict.claimId);
  if (qa) {
    verdict.triangulationScore = qa.triangulation;
    verdict.derivativeAssessment = qa.derivative;
  } else {
    // Deterministic fallback
    verdict.triangulationScore = computeTriangulationScoreDeterministic(verdict, coverageMatrix, calcConfig);
    verdict.derivativeAssessment = {
      factor: computeDerivativeFactorDeterministic(verdict, evidence, derivativeMultiplier),
      assessmentSource: "deterministic",
    };
  }
}
```

### 7.4 Sequencing constraint (corrected — Lead Developer review finding)

> **CORRECTION from v2:** The original plan proposed parallelizing quality assessment with `generateVerdictNarrative()`. This is **incorrect** — there is a sequencing dependency:
>
> Quality assessment → affects `triangulationFactor` and `derivativeFactor` → affects `weightsData` computation (line 5525-5607) → affects `weightedTruthPercentage` → which is an input to `generateVerdictNarrative()`.
>
> **The quality assessment must complete before weight computation, which must complete before narrative generation.**

Execution order in Stage 5:
```
1. assessAggregationQuality()        — LLM call (~0.5-1.5s Haiku)
2. Apply factors to weightsData      — deterministic (instant)
3. computeWeightedAverages           — deterministic (instant)
4. generateVerdictNarrative()        — LLM call (~2-4s Sonnet)
```

Net latency impact: **~0.5-1.5s additional** (one Haiku call). This is acceptable relative to total pipeline runtime (30-90s) and the existing Stage 4 verdict debate (~15-30s).

---

## 8. Fallback Strategy

### 8.1 Failure modes and responses

| Failure | Severity | Response |
|---------|----------|----------|
| LLM call timeout | `silent` (recovered by fallback) | Use deterministic functions |
| LLM returns malformed JSON | `silent` | Use deterministic functions |
| LLM returns partial results (some claims missing) | `silent` | Deterministic for missing claims only |
| LLM returns out-of-range factors | N/A | Clamp to UCM bounds (not a failure) |
| `llmAssessment: false` in UCM config | N/A | Deterministic path (by design) |
| `assessmentSource` tracking | N/A | Always set: `"llm"` or `"deterministic"` |

### 8.2 Warning severity justification

`silent` (not `info`) because:
- Triangulation factor range is ±15% of claim weight → ~2-4pp TP impact in typical scenarios
- Derivative factor only fires when `isDerivative` evidence exists, which is a minority of cases
- The deterministic fallback is the current production behavior — it's not degraded, it's baseline
- Per AGENTS.md: "If a fallback or default fully recovers the situation [...] it is `silent`"

---

## 9. Files Touched

| File | Change |
|------|--------|
| **`apps/web/src/lib/analyzer/aggregation-quality.ts`** | **NEW** — `assessAggregationQuality()`, `computeTriangulationScoreDeterministic()`, `computeDerivativeFactorDeterministic()`, `classifyTriangulationLevel()` (structural), Zod schema, enrichment helpers |
| `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | Remove `computeTriangulationScore()` and `computeDerivativeFactor()` (moved), update `aggregateAssessment()` to call new module |
| `apps/web/src/lib/analyzer/types.ts` | Extend `TriangulationScore` (+`rationale`, `assessmentSource`), add `derivativeAssessment` to `CBClaimVerdict` |
| `apps/web/src/lib/analyzer/model-tiering.ts` | Register `"aggregation_quality"` task type mapped to Haiku |
| `apps/web/src/lib/config-schemas.ts` | Expanded triangulation config (+ `llmAssessment`, `factorMin`, `factorMax`), new `derivativeAssessment` schema |
| `apps/web/configs/calculation.default.json` | Updated defaults with all new fields |
| `apps/web/prompts/claimboundary.prompt.md` | New `AGGREGATION_QUALITY_ASSESSMENT` section |
| `apps/web/test/unit/lib/analyzer/aggregation-quality.test.ts` | **NEW** — unit tests for LLM path, fallback, clamping, level derivation |
| `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` | Update existing triangulation/derivative tests (import from new module) |
| `apps/web/src/lib/config-schemas.test.ts` | Config drift verification (automatic) |

**UI changes (deferred, not in this plan):**
- `page.tsx` — rationale display in tooltip
- `generateHtmlReport.ts` — rationale in report

---

## 10. Test Strategy

### 10.1 Unit tests (safe, no LLM calls)

1. **Deterministic fallback regression** — `computeTriangulationScoreDeterministic()` produces identical results to current `computeTriangulationScore()` (existing tests unchanged, just rename)
2. **Derivative fallback regression** — `computeDerivativeFactorDeterministic()` produces identical results to current `computeDerivativeFactor()` (existing tests unchanged, just rename)
3. **Factor clamping** — LLM returns factor outside bounds → clamped to UCM min/max
4. **Fallback on LLM failure** — Mock LLM that throws → deterministic results returned with `assessmentSource: "deterministic"`
5. **Partial fallback** — LLM returns assessments for claims 1-3 but not 4 → claim 4 gets deterministic, claims 1-3 get LLM
6. **Config toggle** — `llmAssessment: false` → LLM never called, deterministic for all
7. **Input shape validation** — Verify the input construction includes enriched data (source domains, source types, methodology) and EXCLUDES `truthPercentage`/`confidence`
8. **Zod parsing** — Malformed LLM output → graceful fallback (not crash)
9. **Config drift** — Existing `config-drift.test.ts` covers JSON↔TS sync automatically
10. **Backward compatibility** — Old config shape (no `llmAssessment`) → `mergeWithDefaults` injects `false` → deterministic behavior unchanged
11. **Level classification** — `classifyTriangulationLevel()` produces same structural results as current `computeTriangulationScore()` level output; LLM factor does NOT affect level
12. **Empty claims list** — `claimVerdicts = []` → returns empty map, no LLM call made
13. **Single claim** — Batched call with one claim works correctly
14. **Mismatched claimId** — LLM returns a `claimId` not in the verdict list → that claim silently gets deterministic fallback
15. **`derivativeMultiplier` alias precedence** — `derivativeAssessment.deterministicMultiplier` takes precedence over legacy `aggregation.derivativeMultiplier` when both present
16. **`assessmentSource` on both paths** — Both LLM and deterministic paths set `assessmentSource` on both triangulation and derivative results

### 10.2 Integration tests (expensive — run only on explicit request)

1. **Echo chamber detection** — 3 boundaries sharing source domains → expect factor < `factorMax`
2. **Independent corroboration** — 3 boundaries with diverse source types → expect `level: "strong"`
3. **Nuanced disagreement** — Boundaries contradicting on scope, not substance → expect `"moderate"` or `"conflicted"`
4. **Meaningful derivative** — Systematic review marked `isDerivative` → expect higher factor than mere repackaging
5. **Multilingual stability** — Same evidence structure with French vs English boundary names → consistent factor range (per multilingual robustness mandate)

### 10.3 Regression comparison

Run 3 benchmark scenarios with:
1. `llmAssessment: false` (current deterministic behavior)
2. `llmAssessment: true` (new LLM-assessed behavior)

**Acceptance criteria:**
- No TP regression >3pp on any benchmark
- No verdict label change (e.g., MOSTLY-TRUE → LEANING-TRUE) on any benchmark
- Per-claim weight variance within ±20% of deterministic baseline

---

## 11. Cost & Performance

| Metric | Estimate |
|--------|----------|
| Additional LLM calls per analysis | **1** (batched, all claims — triangulation + derivative combined) |
| Model tier | Haiku via `getModelForTask("aggregation_quality")` |
| `maxTokens` | 2000 |
| Estimated input tokens | ~750-1500 (5 claims × ~150-300 tokens each, including enrichment) |
| Estimated output tokens | ~300-800 (5 claims × ~60-160 tokens each) |
| Estimated cost per analysis | **~$0.002-0.005** (negligible vs existing ~$0.50-1.00 per analysis) |
| Net latency impact | **~0.5-1.5s sequential** (cannot parallelize with narrative — see §7.4) |
| Token budget guard | If estimated input >4000 tokens (>12 claims), truncate `sourceDomains` to top 5 per boundary |

---

## 12. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| LLM produces out-of-range factor | Medium | None | Clamp to UCM bounds (AD-5) |
| LLM diverges from deterministic baseline | Low | Medium | A/B regression comparison; UCM toggle to disable |
| Prompt teaches to the test | Low | High | Abstract examples only (AGENTS.md rule) |
| Haiku insufficient for scoping vs substantive disagreement | Medium | Low | Known limitation (no `findingSummary` in Stage 4 contract). LLM infers from `boundaryName`/`methodology`. Mitigation: upgrade to Sonnet via `"aggregation_quality"` task (AD-13), or plan Stage 4 enhancement (see §3.3). |
| Latency regression in Stage 5 | Low | Low | ~0.5-1.5s sequential Haiku call (acceptable vs 30-90s total pipeline) |
| Config migration breaks existing UCM | Low | Low | `mergeWithDefaults` injects `false` default — no behavior change until explicitly enabled (AD-4 v4) |
| Derivative assessment accuracy | Low | Low | Factor range [0.3, 1.0] limits downside |
| Level↔factor inconsistency | None | None | **Eliminated** — LLM produces factor only; level is structurally derived from boundary counts (AD-10 v4) |
| Anchoring on per-boundary TP | None | None | **Eliminated** — TP excluded from input (AD-9) |
| Token budget overrun (>12 claims) | Low | Low | Guard truncates enrichment (§11) |

---

## 13. Implementation Order (revised v4)

1. **Type changes** — Extend `TriangulationScore` (+`rationale`, `assessmentSource`), add `derivativeAssessment` to `CBClaimVerdict`
2. **Config changes** — Schema + defaults for expanded triangulation + new `derivativeAssessment`. JSON default: `llmAssessment: false`.
3. **Create `aggregation-quality.ts`** — Move existing functions as `computeTriangulationScoreDeterministic()` and `computeDerivativeFactorDeterministic()` + add `classifyTriangulationLevel()` (structural, same logic)
4. **Unit tests for renames** — Verify zero behavior change (import from new module)
5. **Integration stub** — Wire `assessAggregationQuality` into `aggregateAssessment()` returning `null` (always falls through to deterministic). Verify build + existing tests still pass. **Green build checkpoint.**
6. **Register model task** — Add `"aggregation_quality"` to model-tiering mapped to Haiku
7. **Prompt** — Write `AGGREGATION_QUALITY_ASSESSMENT` section in `claimboundary.prompt.md`
8. **Core logic** — Implement `assessAggregationQuality()` in `aggregation-quality.ts` with enrichment, full codebase LLM call pattern (§7.1), factor clamping, structural level classification
9. **Unit tests for LLM path** — All 16 tests from §10.1
10. **Build verification** — `npm -w apps/web run build` + `npm test`
11. **Regression gate** — Run benchmarks with `llmAssessment` manually set to `true` via Admin UI. Compare results. Requires explicit user approval. **Acceptance criteria must pass before step 12.**
12. **Enable by default** — Change JSON default from `false` to `true`. This is a separate commit after regression signoff.

---

## 14. Architectural Decisions Log

| # | Decision | Rationale | Alternatives considered |
|---|----------|-----------|------------------------|
| **AD-1** | Batch triangulation + derivative in one LLM call | Both assess evidence quality for the same claims using overlapping data. AGENTS.md: "Batch aggressively." | Separate calls (wasteful), unified weight assessment (too risky, replaces all factors) |
| **AD-2** | Haiku tier, not Sonnet | Classification + brief rationale, not deep reasoning. Factor range is bounded — errors are clamped. Start here; upgrade via UCM if needed. | Sonnet (overkill for bounded classification) |
| ~~**AD-3**~~ | ~~Parallelize with narrative generation~~ **CORRECTED → Sequential execution** | Quality assessment affects weight computation, which feeds narrative generation. Sequencing dependency. Net latency: ~0.5-1.5s (acceptable). | Parallel (incorrect — data dependency) |
| **AD-4** | `llmAssessment: false` as JSON default; flip to `true` after regression gate passes (v4) | Ensures the regression gate (step 11) is real — behavior change cannot land before benchmarks confirm safety. `mergeWithDefaults` injects the JSON default into old configs, so `false` means no old config silently changes behavior. | `true` default (v3 — deploys before its own acceptance gate runs) |
| **AD-5** | Factor clamping, not rejection | Out-of-range LLM output is a calibration issue, not a failure. Clamping is safe because the bounded range is small. | Reject + fallback (loses LLM rationale unnecessarily) |
| **AD-6** | Store rationale in job result JSON | Low token overhead (~50 tokens/claim), high diagnostic value. Rationale also acts as lightweight chain-of-thought improving factor accuracy. | Debug-only (loses value, since re-running is expensive) |
| **AD-7** | `silent` severity for fallback, not `info` | Fallback is current production behavior. No verdict impact. Per AGENTS.md: "If fallback fully recovers, it is silent." | `info` (clutters admin logs with non-actionable events) |
| **AD-8** | Enrich boundary findings with source domains/types (v4: no `findingSummary`) | Source domains and types are already available in `evidence[]`. Without them, LLM cannot assess methodological independence. `findingSummary` dropped — does not exist in Stage 4 contract; adding it would require unscheduled changes. | Minimal input (LLM guesses from boundary names — unreliable), `findingSummary` (v3 — ghost data not in Stage 4 contract) |
| **AD-9** | Exclude `truthPercentage`/`confidence` from LLM input | Anchoring risk: LLM correlates factor with prior TP values. (LLM Expert finding) | Include TP (anchoring risk documented in LLM literature) |
| **AD-10** | Factor from LLM, level structurally derived from boundary counts (v4 revision) | `"conflicted"` has specific UI semantics (red badge, ⚠ icon, explanatory tooltip) meaning "both supporting and contradicting evidence present." Deriving it from a continuous factor would break this contract — a weak case could map to "conflicted" or a truly conflicted case to "moderate." Level = structural fact; factor = quality magnitude. | Level from factor via UCM bands (v3 — breaks UI semantic contract for `conflicted`) |
| **AD-11** | Extract to `aggregation-quality.ts` module | Pipeline at 6159 lines. Follows `verdict-stage.ts` precedent. Co-locates all quality assessment logic. (Lead Developer finding) | Keep in pipeline (maintainability concern) |
| **AD-12** | Use `generateText` + `Output.object` pattern, not `createProductionLLMCall` | `createProductionLLMCall` carries Stage 4 assumptions. `generateVerdictNarrative` precedent is cleaner. (Lead Developer finding) | Thread `createProductionLLMCall` (wrong abstraction layer) |
| **AD-13** | Register `"aggregation_quality"` model task | Allows independent model tier adjustment via UCM without code changes. (Lead Developer + LLM Expert) | Reuse `"understand"` task (loses independent configurability) |

---

## 15. Out of Scope

| Item | Why out of scope | Tracking |
|------|-----------------|----------|
| **Confidence calibration (Proposal B)** | Higher risk, moves TP directly, needs separate validation | Backlog |
| **Unified weight assessment (Proposal C)** | Replaces all aggregation factors — much higher blast radius | Backlog |
| **SR weighting formula asymmetry** | §4.2 of SR investigation, independent issue | Backlog |
| **Wikipedia SR scoring** | §4.4 of SR investigation, prompt quality issue | Backlog |
| **UI display of rationale** | Low priority, deferred to post-implementation | Backlog |

---

## 16. Resolved Questions (from v2 review)

All 6 open questions from v2 have been resolved by the multi-role review:

| # | Question | Resolution | AD |
|---|----------|------------|----|
| Q1 | Is Haiku sufficient? | **Yes**, with enriched input. Start Haiku; upgrade via UCM `"aggregation_quality"` task if needed. | AD-2, AD-13 |
| Q2 | Include per-boundary TP? | **No** — anchoring risk. Excluded. LLM infers from structural signals (`boundaryName`, `methodology`, `sourceTypes`). | AD-9, AD-8 |
| Q3 | Level + factor or factor only? | **Factor from LLM, level structurally derived** from boundary counts (v4: preserves UI semantics for `conflicted`). | AD-10 |
| Q4 | Module location? | **New `aggregation-quality.ts`** — follows `verdict-stage.ts` precedent. | AD-11 |
| Q5 | `createProductionLLMCall` needed? | **No** — use `generateText` + `Output.object` pattern (like narrative). | AD-12 |
| Q6 | Config migration approach? | **`.optional()` + `mergeWithDefaults`** — no migration function needed. Default `false` until regression gate passes (v4). | AD-4 |

---

## 17. Related Documents

- `Docs/ARCHIVE/SR_Evidence_Weighting_Investigation_2026-03-16.md` — §4.3 flagged this issue
- `Docs/WIP/Combined_Claim_and_Boundary_Quality_Remediation_Plan_2026-03-16.md`
- `Docs/ARCHITECTURE/Calculations.md` — §7 Triangulation Scoring, §4 Aggregation
- `AGENTS.md` — LLM Intelligence mandate, String Usage Boundary, Multilingual Robustness
- `apps/web/prompts/claimboundary.prompt.md` — prompt file to extend

---

## REVIEW LOG

### Lead Architect Review (v2, 2026-03-17)

**Changes from v1:**
1. **Expanded scope** — Derivative factor included (was "out of scope" in v1). Both factors batched into single `AGGREGATION_QUALITY_ASSESSMENT` call (AD-1).
2. **Data flow analysis** — Added §3 documenting what data is available and what enrichment is needed. Original plan assumed minimal input; enriched input (source domains, types, methodology) is critical for the LLM to assess independence.
3. **Resolved all open questions from v1** (parallelization, derivative batching, rationale storage).
4. **Config migration concern** — Added §5.3 addressing existing config.db backward compatibility.
5. **Warning severity** — Changed from `info` to `silent` with justification (AD-7).
6. **Added AD log** (§14) — 8 architectural decisions with rationale and alternatives.
7. **Enriched test strategy** — Added backward compatibility, Zod parsing, multilingual, partial fallback tests.

---

### LLM Expert Review (2026-03-17) — APPROVE WITH CHANGES

**Verdict:** Approve with 2 required changes, 6 recommended improvements.

**Required (applied in v3, refined in v4):**
1. ✅ **Remove `truthPercentage`/`confidence` from input schema** — anchoring risk → AD-9. *(v4: `findingSummary` also removed — not in Stage 4 contract.)*
2. ✅ **Factor-only LLM output** → AD-10. *(v4: level remains structurally derived from boundary counts, not from factor bands — preserves `conflicted` UI semantics.)*

**Recommended (applied in v3, some revised in v4):**
3. ~~Add `findingSummary` per boundary~~ *(v4: removed — data does not exist in Stage 4 contract. See §3.3.)*
4. ✅ Specify `maxTokens: 2000` (§11)
5. ✅ Enumerate all `evidenceDirection` values in prompt (§4.1)
6. ✅ Register `"aggregation_quality"` model task → AD-13
7. ✅ Explicit rationale length constraints in prompt (§4.1)
8. ✅ Prompt instruction: "Assess based on structural metadata, not language of the evidence" (multilingual)

**Key insight:** Rationale field acts as lightweight chain-of-thought improving factor accuracy — worth the ~50 tokens/claim overhead.

**AGENTS.md compliance:** PASS on all 7 rules checked (LLM Intelligence, Batch, No test-case terms, Multilingual, String Boundary, Config Placement, Warning Severity).

---

### Lead Developer Review (2026-03-17) — APPROVE WITH CHANGES

**Verdict:** Approve with 4 required changes, 4 recommended improvements.

**Required (applied in v3, refined in v4):**
1. ✅ **Fix parallelization error** — sequential dependency chain. → AD-3 corrected, §7.4 rewritten.
2. ✅ **Resolve `llmAssessment` default conflict** *(v4: revised to `false` default with staged rollout — see AD-4 v4, §5.3.)*
3. ✅ **Extract to `aggregation-quality.ts`** — confirmed as target module → AD-11.
4. ✅ **Use `generateText` + `Output.object` pattern** — not `createProductionLLMCall` → AD-12.

**Recommended (applied in v3):**
5. ✅ Register `"aggregation_quality"` model task → AD-13
6. ✅ Token budget guard for large claim counts (§11)
7. ✅ 6 additional test cases (§10.1, tests 11-16)
8. ✅ Revised implementation order with integration stub step (§13, step 5)

**Critical finding:** `aggregateAssessment()` does not currently receive `pipelineConfig` — but loads it internally. The new module receives it as a parameter from `aggregateAssessment()` (no signature change needed on the pipeline function).

**Config finding:** `derivativeMultiplier` alias precedence must be explicit in consumer code: read `derivativeAssessment.deterministicMultiplier` first, fall back to `aggregation.derivativeMultiplier`.

---

### Consolidated (v3, 2026-03-17) — Lead Architect

**All 6 reviewer questions resolved.** 13 architectural decisions documented. Plan upgraded from 8 ADs to 13 ADs, 10 unit tests to 16, corrected 1 sequencing error, and resolved 1 config migration conflict.

---

### Implementation Review (v4, 2026-03-17) — Lead Architect

**Trigger:** External review identified 2 High and 2 Medium issues in v3.

**High 1 — `findingSummary` ghost data (FIXED):**
v3 introduced `findingSummary` as a core LLM input, claiming the data was "already available." It is not — `BoundaryFinding` in `types.ts` has no textual summary field. Adding one would require Stage 4 prompt, schema, and parsing changes not scheduled in this plan. Synthesizing one deterministically from verdict reasoning would violate the AGENTS.md semantic-heuristic prohibition. **Resolution:** Removed `findingSummary` entirely. The LLM infers disagreement type from `boundaryName`, `methodology`, `evidenceDirection`, and `sourceTypes`. This is a **known limitation** flagged in §3.3 with explicit mitigation paths (Sonnet upgrade or separate Stage 4 enhancement).

**High 2 — Incomplete LLM call pattern (FIXED):**
v3 showed a simplified `generateText(... Output.object(...))` that omits three required elements of the codebase pattern: `getPromptCachingOptions()` on the system message, `getStructuredOutputProviderOptions()` at top level (forces Anthropic `jsonTool` mode), and `extractStructuredOutput()` + Zod `.parse()` + `recordLLMCall()` afterward. An implementer following the v3 sketch literally would get prompt caching failures and output extraction bugs. **Resolution:** §7.1 now shows the full codebase-compliant call pattern matching `generateVerdictNarrative` at `claimboundary-pipeline.ts:5889`.

**Medium 1 — Rollout before regression gate (FIXED):**
v3 set `llmAssessment: true` as the JSON default (AD-4 revised), but the regression comparison was deferred to step 11 requiring explicit approval. Since `mergeWithDefaults` injects the JSON default into all configs (including old ones), the behavior change would land before its own acceptance gate ran. **Resolution:** JSON default is now `false`. Step 11 runs benchmarks with `llmAssessment` manually enabled via Admin UI. Step 12 (separate commit) flips the default to `true` only after regression signoff.

**Medium 2 — `conflicted` level semantic change (FIXED):**
v3 derived the triangulation `level` purely from the LLM-returned factor using UCM-configurable bands. But `"conflicted"` has specific UI semantics in `page.tsx:2771-2811`: red badge, ⚠ icon, and a tooltip explaining "X support and Y contradict." This label means "both supporting and contradicting boundary evidence are present" — a structural fact. Factor-band derivation could map a weak single-boundary case to "conflicted" or relabel a genuinely conflicted case as "moderate." **Resolution:** Level remains **structurally derived** from supporting/contradicting counts (same logic as current production). The LLM controls only the `factor` (quality-aware magnitude). `levelBands` UCM config removed. AD-10 updated.

**ADs updated:** AD-4 (staged rollout), AD-8 (no `findingSummary`), AD-9 (no `findingSummary` replacement), AD-10 (structural level).

**Plan status: Ready for implementation approval.**

Remaining risks are low-impact and fully mitigated:
- Haiku quality on scoping vs substantive disagreement → known limitation with explicit mitigation paths (§3.3)
- Config migration → `mergeWithDefaults` injects `false` default → no surprise behavior change (AD-4 v4)
- Factor accuracy → clamped, fallback, toggle (AD-5, AD-7)
- Latency → ~0.5-1.5s sequential, acceptable (AD-3 corrected)
- `conflicted` UI semantics → preserved by structural level derivation (AD-10 v4)

**Implementation can proceed with any Mid-tier model agent (Senior Developer recommended).** Steps 1-5 are mechanical (types, config, rename, tests, stub) and produce a green build checkpoint. Steps 6-10 are the substantive work (prompt, LLM call, tests). Step 11 is a hard gate: regression benchmarks must pass before step 12 enables the feature by default.
