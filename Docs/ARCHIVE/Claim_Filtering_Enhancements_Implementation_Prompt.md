# Implementation Prompt: Claim Filtering Enhancements

> **✅ STATUS: COMPLETE** (2026-02-02)
> - Enhancement 1 (thesisRelevanceConfidence): ✅ Implemented
> - Enhancement 2 (MIN_EVIDENCE_FOR_TANGENTIAL=2): ✅ Implemented
> - Enhancement 3 (monitorOpinionAccumulation): ✅ Implemented
> - Unit Tests: ✅ 30 tests in `claim-filtering-enhancements.test.ts`
> - Config docs extracted to: [Unified_Config_Management.md](../../USER_GUIDES/Unified_Config_Management.md#54-pipelineconfig)

**Date:** 2026-02-02
**Context:** Minor enhancements to strengthen claim filtering system
**Reference:** [Baseless_Tangential_Claims_Investigation_2026-02-02.md](Baseless_Tangential_Claims_Investigation_2026-02-02.md)
**Priority:** Medium (enhancements, not critical fixes)
**Estimated Effort:** 6-8 hours

---

## Task Overview

Implement three enhancements to the claim filtering system to address minor gaps identified in the investigation:

1. **Enhancement 1 (Medium Priority):** Add confidence scoring to `thesisRelevance` classification
2. **Enhancement 2 (Low Priority):** Increase tangential evidence threshold and add quality checks
3. **Enhancement 3 (Low Priority):** Add opinion accumulation monitoring and thresholds

**Current Status:** System already properly prevents baseless/tangential claims from influencing verdicts. These enhancements add defense-in-depth and operator visibility.

**Note:** The user has already addressed the hardcoded pipeline timeout issue by adding `monolithicCanonicalTimeoutMs` and `monolithicDynamicTimeoutMs` to [pipeline.default.json:32-33](../configs/pipeline.default.json#L32-L33). No action needed on that front.

---

## Enhancement 1: Thesis Relevance Confidence Scoring

### Problem
The `thesisRelevance` field ("direct" | "tangential" | "irrelevant") is determined by LLM during claim understanding. If the LLM misclassifies a tangential claim as "direct", it will influence the verdict. There's no deterministic validation or confidence scoring to catch borderline classifications.

**Current Risk:** Low (LLM is usually accurate, but no safeguard for edge cases)

### Solution
Add `thesisRelevanceConfidence` field to track LLM's confidence in relevance classification. Flag low-confidence classifications for review or additional validation.

### Implementation Steps

#### Step 1: Update Schema

**File:** `apps/web/src/lib/analyzer/orchestrated.ts`

**Location:** Around line 1500-1600 (ClaimVerdictSchema definition)

**Change:**
```typescript
const ClaimVerdictSchema = z.object({
  claimId: z.string(),
  claimText: z.string(),
  truthPercentage: z.number().int().min(0).max(100),
  confidence: z.number().int().min(0).max(100),
  thesisRelevance: z.enum(["direct", "tangential", "irrelevant"]),

  // NEW FIELD
  thesisRelevanceConfidence: z.number().int().min(0).max(100).optional()
    .describe("LLM's confidence in the thesisRelevance classification (0-100). Low values (<70) indicate borderline cases that may need review."),

  // ... rest of fields
});
```

**Also update TypeScript interfaces:**
```typescript
export interface ClaimVerdict {
  claimId: string;
  claimText: string;
  truthPercentage: number;
  confidence: number;
  thesisRelevance: "direct" | "tangential" | "irrelevant";
  thesisRelevanceConfidence?: number;  // NEW
  // ... rest of fields
}
```

#### Step 2: Update LLM Prompt

**File:** `apps/web/prompts/orchestrator/understand-claims-decomposition.prompt.md`

**Location:** In the output schema section

**Add to instructions:**
```markdown
For each claim, you must classify its relationship to the user's thesis:

- **direct**: The claim directly addresses or tests the user's thesis
- **tangential**: The claim is related but peripheral (e.g., opinions about the thesis, tangential context)
- **irrelevant**: The claim is unrelated to the thesis

**IMPORTANT**: Also provide your confidence (0-100) in this classification:
- **thesisRelevanceConfidence: 90-100**: Very clear classification
- **thesisRelevanceConfidence: 70-89**: Reasonably confident
- **thesisRelevanceConfidence: 50-69**: Borderline case, could go either way
- **thesisRelevanceConfidence: 0-49**: Uncertain classification

Examples:
- User thesis: "The trial was fair"
  - Claim: "The defendant's evidence was excluded" → direct, confidence=95
  - Claim: "Critics said the trial was unfair" → tangential, confidence=85
  - Claim: "The judge graduated from Harvard" → irrelevant, confidence=90
  - Claim: "The process followed standard procedure" → direct OR tangential?, confidence=60 (borderline)
```

**Update JSON schema example:**
```json
{
  "claimId": "claim-1",
  "claimText": "The defendant's evidence was excluded",
  "thesisRelevance": "direct",
  "thesisRelevanceConfidence": 95,
  ...
}
```

#### Step 3: Add Validation Logic

**File:** `apps/web/src/lib/analyzer/orchestrated.ts`

**Location:** After claim understanding, before verdict generation (around line 9700-9750)

**Add new function:**
```typescript
/**
 * Validate thesis relevance classifications and flag low-confidence borderline cases.
 *
 * For low-confidence classifications (confidence < 70), log a warning and optionally
 * apply conservative handling (e.g., downgrade "direct" to "tangential" if confidence < 60).
 *
 * @param claims - Claims with relevance classifications
 * @returns Claims with validated relevance (potentially adjusted)
 */
function validateThesisRelevance(
  claims: Array<{
    claimId: string;
    claimText: string;
    thesisRelevance: "direct" | "tangential" | "irrelevant";
    thesisRelevanceConfidence?: number;
  }>
): typeof claims {
  const LOW_CONFIDENCE_THRESHOLD = 70;
  const VERY_LOW_CONFIDENCE_THRESHOLD = 60;

  return claims.map(claim => {
    const confidence = claim.thesisRelevanceConfidence ?? 100; // Default to high confidence if not provided

    // Flag low-confidence classifications
    if (confidence < LOW_CONFIDENCE_THRESHOLD) {
      console.warn(
        `[Relevance] Low-confidence thesisRelevance: "${claim.claimText.substring(0, 60)}..." ` +
        `classified as "${claim.thesisRelevance}" with confidence ${confidence}%`
      );

      // Conservative handling for very low confidence
      if (confidence < VERY_LOW_CONFIDENCE_THRESHOLD && claim.thesisRelevance === "direct") {
        console.warn(
          `[Relevance] Downgrading "direct" to "tangential" due to very low confidence (${confidence}%)`
        );
        return {
          ...claim,
          thesisRelevance: "tangential" as const,
        };
      }
    }

    return claim;
  });
}
```

**Integrate into pipeline:**
```typescript
// After claim understanding (around line 9750)
const claims = await understandAndDecomposeClaims(...);

// NEW: Validate thesis relevance classifications
const validatedClaims = validateThesisRelevance(claims);

// Continue with validatedClaims instead of claims
```

#### Step 4: Add Configuration Control

**File:** `apps/web/src/lib/config-schemas.ts`

**Location:** In `PipelineConfigSchema` (around line 100-200)

**Add fields:**
```typescript
export const PipelineConfigSchema = z.object({
  // ... existing fields

  // Thesis Relevance Validation
  thesisRelevanceValidationEnabled: z.boolean().optional()
    .describe("Enable validation of thesis relevance classifications"),
  thesisRelevanceLowConfidenceThreshold: z.number().int().min(0).max(100).optional()
    .describe("Threshold for flagging low-confidence relevance classifications (default: 70)"),
  thesisRelevanceAutoDowngradeThreshold: z.number().int().min(0).max(100).optional()
    .describe("Threshold for auto-downgrading 'direct' to 'tangential' (default: 60)"),

  // ... rest of fields
});
```

**Update defaults:**
```typescript
export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  // ... existing defaults
  thesisRelevanceValidationEnabled: true,
  thesisRelevanceLowConfidenceThreshold: 70,
  thesisRelevanceAutoDowngradeThreshold: 60,
  // ... rest of defaults
};
```

**File:** `apps/web/configs/pipeline.default.json`

**Add fields:**
```json
{
  "schemaVersion": "2.1.0",
  ...
  "thesisRelevanceValidationEnabled": true,
  "thesisRelevanceLowConfidenceThreshold": 70,
  "thesisRelevanceAutoDowngradeThreshold": 60,
  ...
}
```

#### Step 5: Update Admin UI (Optional)

**File:** `apps/web/src/app/admin/config/page.tsx`

Add form fields for the new config options with tooltip explanations.

### Acceptance Criteria

- [ ] `thesisRelevanceConfidence` field added to schema (optional)
- [ ] LLM prompt updated to request confidence scores
- [ ] Validation function logs warnings for low-confidence classifications
- [ ] Very low confidence (<60) auto-downgrades "direct" to "tangential"
- [ ] Configuration controls added to pipeline config
- [ ] Backward compatible (confidence=100 assumed if not provided)
- [ ] Build passes: `npm -w apps/web run build`
- [ ] Test with borderline claims to verify logging

### Testing

**Test Case 1:** Borderline classification
```typescript
// Input: User thesis: "The trial was fair"
// Claim: "The court followed standard procedures"
// Expected: thesisRelevance="direct" OR "tangential", confidence=60-70
// Verify: Warning logged, potentially downgraded to tangential
```

**Test Case 2:** Clear classification
```typescript
// Input: User thesis: "The trial was fair"
// Claim: "The defendant's evidence was excluded"
// Expected: thesisRelevance="direct", confidence=90+
// Verify: No warning, kept as direct
```

---

## Enhancement 2: Tangential Evidence Threshold Increase

### Problem
Current threshold: `MIN_EVIDENCE_FOR_TANGENTIAL = 1`
- Tangential claims with 1 dubious fact appear in report (but have weight=0, so no verdict influence)
- No quality check on the single supporting fact

**Current Risk:** Very Low (cosmetic issue only, doesn't affect verdicts)

### Solution
Increase threshold to 2 AND add quality check for supporting facts.

### Implementation Steps

#### Step 1: Update Threshold Constant

**File:** `apps/web/src/lib/analyzer/aggregation.ts`

**Location:** Line 368

**Change:**
```typescript
/**
 * Minimum evidence threshold for tangential claims.
 * Claims with fewer supporting evidence items than this are considered "low evidence".
 *
 * v2.9.0: Increased from 1 to 2 to prevent single dubious facts from justifying
 * tangential claims in reports. Tangential claims need at least 2 independent facts.
 */
const MIN_EVIDENCE_FOR_TANGENTIAL = 2;  // Changed from 1
```

#### Step 2: Add Quality Check (Optional Enhancement)

**File:** `apps/web/src/lib/analyzer/aggregation.ts`

**Add new function before `pruneTangentialBaselessClaims`:**
```typescript
/**
 * Check if a claim has sufficient high-quality evidence.
 * Used to determine if tangential claims should be kept in the report.
 *
 * @param claim - Claim to check
 * @param facts - All available facts
 * @returns true if claim has sufficient quality evidence
 */
function hasSufficientQualityEvidence(
  claim: {
    supportingFactIds?: string[];
    thesisRelevance?: "direct" | "tangential" | "irrelevant";
  },
  facts: Array<{
    id: string;
    probativeValue?: "high" | "medium" | "low";
    sourceQuality?: number; // 0-100
  }>
): boolean {
  const evidenceCount = claim.supportingFactIds?.length ?? 0;

  // Direct claims always pass (never prune direct claims)
  if (!claim.thesisRelevance || claim.thesisRelevance === "direct") {
    return true;
  }

  // Tangential/irrelevant need minimum count
  if (evidenceCount < MIN_EVIDENCE_FOR_TANGENTIAL) {
    return false;
  }

  // Enhanced check: At least one fact must be high/medium probative value
  // OR from a high-quality source (sourceQuality >= 70)
  const supportingFacts = facts.filter(f => claim.supportingFactIds?.includes(f.id));
  const hasQualityFact = supportingFacts.some(
    f => f.probativeValue === "high" ||
         f.probativeValue === "medium" ||
         (f.sourceQuality !== undefined && f.sourceQuality >= 70)
  );

  if (!hasQualityFact) {
    console.log(
      `[Prune] Tangential claim has ${evidenceCount} facts but none are high-quality: ` +
      `"${(claim as any).claimText?.substring(0, 60)}..."`
    );
  }

  return hasQualityFact;
}
```

**Update `pruneTangentialBaselessClaims` signature (optional):**
```typescript
export function pruneTangentialBaselessClaims<T extends PrunableClaimVerdict>(
  claims: T[],
  facts?: Array<{
    id: string;
    probativeValue?: "high" | "medium" | "low";
    sourceQuality?: number;
  }>
): T[] {
  return claims.filter(claim => {
    // Direct claims are never pruned
    if (!claim.thesisRelevance || claim.thesisRelevance === "direct") {
      return true;
    }

    // Use quality check if facts provided, otherwise just count
    if (facts) {
      return hasSufficientQualityEvidence(claim, facts);
    }

    // Fallback: count-based check
    const evidenceCount = claim.supportingFactIds?.length ?? 0;
    if (evidenceCount < MIN_EVIDENCE_FOR_TANGENTIAL) {
      console.log(
        `[Prune] Dropping tangential claim with insufficient evidence: ` +
        `"${(claim.claimText || claim.claimId || "unknown").substring(0, 60)}..." ` +
        `(${evidenceCount} evidence items)`
      );
      return false;
    }

    return true;
  });
}
```

#### Step 3: Update Integration Points

**File:** `apps/web/src/lib/analyzer/orchestrated.ts`

**Locations:** Lines 7599, 8159, 8927

**Update calls to pass facts (if implementing quality check):**
```typescript
// Before (current):
const prunedClaimVerdicts = pruneTangentialBaselessClaims(weightedClaimVerdicts);

// After (with quality check):
const prunedClaimVerdicts = pruneTangentialBaselessClaims(
  weightedClaimVerdicts,
  allExtractedFacts  // Need to pass facts for quality check
);
```

#### Step 4: Add Configuration Control (Optional)

**File:** `apps/web/src/lib/config-schemas.ts`

**Add field:**
```typescript
minEvidenceForTangential: z.number().int().min(0).max(10).optional()
  .describe("Minimum supporting facts required for tangential claims to appear in report (default: 2)"),
tangentialEvidenceQualityCheckEnabled: z.boolean().optional()
  .describe("Require at least one high/medium quality fact for tangential claims (default: false)"),
```

**Update defaults:**
```typescript
export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  // ...
  minEvidenceForTangential: 2,
  tangentialEvidenceQualityCheckEnabled: false,  // Start conservative, enable later
  // ...
};
```

### Acceptance Criteria

- [ ] `MIN_EVIDENCE_FOR_TANGENTIAL` increased from 1 to 2
- [ ] Tangential claims with 0-1 facts are pruned from reports
- [ ] (Optional) Quality check function implemented
- [ ] (Optional) Quality check integrated with facts passed to pruning function
- [ ] (Optional) Configuration controls added
- [ ] Build passes
- [ ] Existing tests pass (if count threshold breaks tests, update test expectations)

### Testing

**Test Case 1:** Tangential with 1 fact
```typescript
// Input: Claim with thesisRelevance="tangential", supportingFactIds=["fact-1"]
// Expected: Pruned (removed from report)
// Verify: Console log shows pruning message
```

**Test Case 2:** Tangential with 2 facts
```typescript
// Input: Claim with thesisRelevance="tangential", supportingFactIds=["fact-1", "fact-2"]
// Expected: Kept (appears in report)
// Verify: No pruning message
```

**Test Case 3:** Direct with 0 facts
```typescript
// Input: Claim with thesisRelevance="direct", supportingFactIds=[]
// Expected: Kept (direct claims never pruned)
// Verify: No pruning message
```

---

## Enhancement 3: Opinion Accumulation Monitoring

### Problem
Claims with `factualBasis="opinion"` contestation keep full weight (by design in v2.8). However, if many opinion-based keyFactors accumulate, they could clutter the report even though they don't influence the verdict.

**Current Risk:** Very Low (rare edge case, working as designed)

### Solution
Add monitoring and optional threshold for opinion-based keyFactors. Log warnings when opinion count exceeds threshold; optionally prune excess opinions.

### Implementation Steps

#### Step 1: Add Opinion Count Tracking

**File:** `apps/web/src/lib/analyzer/aggregation.ts`

**Add after `pruneOpinionOnlyFactors`:**
```typescript
/**
 * Monitor and optionally limit opinion-based factors in report.
 *
 * v2.9.0: While opinion-based factors don't reduce claim weight (by design),
 * excessive accumulation can clutter reports. This function tracks opinion count
 * and optionally prunes excess opinions if threshold exceeded.
 *
 * @param keyFactors - KeyFactors to monitor/limit
 * @param maxOpinionCount - Maximum opinion factors to keep (0 = unlimited)
 * @returns Potentially limited keyFactors with monitoring logs
 */
export function monitorOpinionAccumulation<T extends PrunableKeyFactor>(
  keyFactors: T[],
  maxOpinionCount: number = 0  // 0 = unlimited (just monitor)
): T[] {
  const opinionFactors = keyFactors.filter(
    kf => kf.factualBasis === "opinion" || kf.factualBasis === "unknown"
  );
  const documentedFactors = keyFactors.filter(
    kf => kf.factualBasis === "established" || kf.factualBasis === "disputed"
  );

  const opinionCount = opinionFactors.length;
  const documentedCount = documentedFactors.length;
  const opinionRatio = keyFactors.length > 0
    ? Math.round(100 * opinionCount / keyFactors.length)
    : 0;

  // Log statistics
  console.log(
    `[Opinion Monitor] KeyFactors: ${opinionCount} opinion, ${documentedCount} documented ` +
    `(${opinionRatio}% opinion-based)`
  );

  // Warn if opinion ratio exceeds 70%
  if (opinionRatio > 70 && documentedCount > 0) {
    console.warn(
      `[Opinion Monitor] ⚠️ High opinion ratio: ${opinionRatio}% of keyFactors are opinion-based ` +
      `(${opinionCount} opinion vs ${documentedCount} documented). ` +
      `Consider investigating if documented evidence is being missed.`
    );
  }

  // Warn if all factors are opinion-based
  if (documentedCount === 0 && opinionCount > 0) {
    console.warn(
      `[Opinion Monitor] ⚠️ All ${opinionCount} keyFactors are opinion-based. ` +
      `No documented evidence found for contestation.`
    );
  }

  // Optional: Enforce maximum opinion count
  if (maxOpinionCount > 0 && opinionCount > maxOpinionCount) {
    console.warn(
      `[Opinion Monitor] Limiting opinion factors from ${opinionCount} to ${maxOpinionCount} ` +
      `(keeping all ${documentedCount} documented factors)`
    );

    // Keep all documented factors + top N opinion factors (by supports="yes" first)
    const sortedOpinions = opinionFactors.sort((a, b) => {
      // Prioritize "yes" (supporting) opinions over "no" (opposing)
      if (a.supports === "yes" && b.supports !== "yes") return -1;
      if (b.supports === "yes" && a.supports !== "yes") return 1;
      return 0;
    });

    const limitedOpinions = sortedOpinions.slice(0, maxOpinionCount);
    return [...documentedFactors, ...limitedOpinions] as T[];
  }

  return keyFactors;
}
```

#### Step 2: Integrate Monitoring

**File:** `apps/web/src/lib/analyzer/orchestrated.ts`

**Locations:** After `pruneOpinionOnlyFactors` calls (lines ~7555, ~8078, ~8930)

**Add monitoring calls:**
```typescript
// After pruning opinion-only factors
const prunedKeyFactors = pruneOpinionOnlyFactors(validatedKeyFactors);

// NEW: Monitor opinion accumulation
const monitoredKeyFactors = monitorOpinionAccumulation(
  prunedKeyFactors,
  pipelineConfig?.maxOpinionFactors ?? 0  // 0 = unlimited (just monitor)
);

// Use monitoredKeyFactors instead of prunedKeyFactors
```

#### Step 3: Add Configuration Control

**File:** `apps/web/src/lib/config-schemas.ts`

**Add field:**
```typescript
maxOpinionFactors: z.number().int().min(0).max(20).optional()
  .describe("Maximum opinion-based keyFactors to include in report (0 = unlimited, just monitor). Default: 0 (unlimited)"),
opinionAccumulationWarningThreshold: z.number().int().min(0).max(100).optional()
  .describe("Warn if opinion-based keyFactors exceed this percentage (default: 70)"),
```

**Update defaults:**
```typescript
export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  // ...
  maxOpinionFactors: 0,  // Start with monitoring only, no pruning
  opinionAccumulationWarningThreshold: 70,
  // ...
};
```

**File:** `apps/web/configs/pipeline.default.json`

**Add fields:**
```json
{
  ...
  "maxOpinionFactors": 0,
  "opinionAccumulationWarningThreshold": 70,
  ...
}
```

#### Step 4: Add Metrics Tracking (Optional)

**File:** `apps/web/src/lib/analyzer/metrics-integration.ts`

**Add metrics:**
```typescript
interface AnalysisMetrics {
  // ... existing metrics

  // NEW: Opinion tracking
  opinionFactorCount?: number;
  documentedFactorCount?: number;
  opinionFactorRatio?: number;  // 0-100
  opinionWarningTriggered?: boolean;
}
```

**Update metrics collection:**
```typescript
// In orchestrated.ts, after opinion monitoring
metrics.opinionFactorCount = opinionCount;
metrics.documentedFactorCount = documentedCount;
metrics.opinionFactorRatio = opinionRatio;
metrics.opinionWarningTriggered = opinionRatio > 70;
```

### Acceptance Criteria

- [ ] `monitorOpinionAccumulation` function implemented
- [ ] Opinion count and ratio logged for each verdict aggregation
- [ ] Warning logged when opinion ratio > 70%
- [ ] Warning logged when all factors are opinion-based
- [ ] (Optional) Opinion limiting works when maxOpinionFactors > 0
- [ ] Configuration controls added
- [ ] (Optional) Metrics tracking added
- [ ] Build passes
- [ ] No change in verdict calculations (monitoring only, unless maxOpinionFactors set)

### Testing

**Test Case 1:** Balanced factors
```typescript
// Input: 3 documented factors, 2 opinion factors
// Expected: Log shows "40% opinion-based", no warning
```

**Test Case 2:** High opinion ratio
```typescript
// Input: 1 documented factor, 5 opinion factors
// Expected: Log shows "83% opinion-based", warning logged
```

**Test Case 3:** All opinion
```typescript
// Input: 0 documented factors, 4 opinion factors
// Expected: Warning logged about no documented evidence
```

**Test Case 4:** Opinion limiting (if maxOpinionFactors=3)
```typescript
// Input: 2 documented, 5 opinion factors, maxOpinionFactors=3
// Expected: Result has 2 documented + 3 opinion = 5 total
```

---

## Implementation Order

Recommended implementation sequence:

1. **Enhancement 1 (Medium Priority):** ~3-4 hours
   - Highest value: Catches LLM misclassifications
   - Start here

2. **Enhancement 2 (Low Priority):** ~1-2 hours
   - Quick win: Just change constant + add config
   - Optional quality check: +1 hour

3. **Enhancement 3 (Low Priority):** ~2-3 hours
   - Monitoring only (no behavior change)
   - Lowest priority but useful for operators

**Total Effort:** 6-10 hours depending on optional enhancements

---

## Testing Strategy

### Unit Tests

**File:** `apps/web/test/unit/lib/analyzer/claim-filtering-enhancements.test.ts` (NEW)

```typescript
import { describe, it, expect } from "vitest";
import {
  validateThesisRelevance,
  pruneTangentialBaselessClaims,
  monitorOpinionAccumulation
} from "@/lib/analyzer/aggregation";

describe("Claim Filtering Enhancements", () => {
  describe("validateThesisRelevance", () => {
    it("should flag low-confidence classifications", () => {
      const claims = [
        {
          claimId: "c1",
          claimText: "Borderline claim",
          thesisRelevance: "direct" as const,
          thesisRelevanceConfidence: 65,
        },
      ];

      const result = validateThesisRelevance(claims);
      // Should log warning (check console.warn spy)
    });

    it("should downgrade very low confidence direct to tangential", () => {
      const claims = [
        {
          claimId: "c1",
          claimText: "Very uncertain claim",
          thesisRelevance: "direct" as const,
          thesisRelevanceConfidence: 55,
        },
      ];

      const result = validateThesisRelevance(claims);
      expect(result[0].thesisRelevance).toBe("tangential");
    });
  });

  describe("pruneTangentialBaselessClaims (threshold=2)", () => {
    it("should prune tangential claims with 1 fact", () => {
      const claims = [
        {
          claimId: "c1",
          thesisRelevance: "tangential" as const,
          supportingFactIds: ["f1"],
        },
      ];

      const result = pruneTangentialBaselessClaims(claims);
      expect(result).toHaveLength(0);  // Pruned
    });

    it("should keep tangential claims with 2 facts", () => {
      const claims = [
        {
          claimId: "c1",
          thesisRelevance: "tangential" as const,
          supportingFactIds: ["f1", "f2"],
        },
      ];

      const result = pruneTangentialBaselessClaims(claims);
      expect(result).toHaveLength(1);  // Kept
    });
  });

  describe("monitorOpinionAccumulation", () => {
    it("should log warning for high opinion ratio", () => {
      const keyFactors = [
        { factualBasis: "opinion" as const },
        { factualBasis: "opinion" as const },
        { factualBasis: "opinion" as const },
        { factualBasis: "established" as const },
      ];

      const result = monitorOpinionAccumulation(keyFactors);
      // Should log warning: 75% opinion-based
    });

    it("should limit opinions if maxOpinionFactors set", () => {
      const keyFactors = [
        { factualBasis: "established" as const },
        { factualBasis: "opinion" as const, supports: "yes" },
        { factualBasis: "opinion" as const, supports: "yes" },
        { factualBasis: "opinion" as const, supports: "no" },
      ];

      const result = monitorOpinionAccumulation(keyFactors, 2);
      expect(result).toHaveLength(3);  // 1 documented + 2 opinions
    });
  });
});
```

### Integration Test

**File:** `apps/web/test/integration/claim-filtering-enhancements.test.ts` (NEW)

```typescript
import { describe, it, expect } from "vitest";
import { analyzeOrchestrated } from "@/lib/analyzer/orchestrated";

describe("Claim Filtering Enhancements Integration", () => {
  it("should handle borderline thesis relevance", async () => {
    const input = {
      userInput: "The trial was fair",
      // Test with claim that could be direct or tangential
    };

    const result = await analyzeOrchestrated(input);

    // Check that low-confidence classifications are flagged in logs
    // Check that verdicts are calculated correctly
  });

  it("should prune tangential claims with insufficient evidence", async () => {
    const input = {
      userInput: "Electric vehicles are cleaner",
      // Include tangential claim with 1 weak fact
    };

    const result = await analyzeOrchestrated(input);

    // Verify tangential claim is pruned if only 1 fact
  });
});
```

### Manual Testing

1. **Test borderline relevance:**
   - Input: "The trial was fair"
   - Check logs for low-confidence warnings
   - Verify auto-downgrade works for confidence < 60

2. **Test tangential pruning:**
   - Input with tangential claim
   - Verify pruning at threshold=2
   - Check console logs for pruning messages

3. **Test opinion accumulation:**
   - Input that generates many opinion-based keyFactors
   - Check logs for opinion ratio statistics
   - Verify warning triggers at 70%

---

## Backward Compatibility

All enhancements maintain backward compatibility:

1. **Enhancement 1:**
   - `thesisRelevanceConfidence` is optional
   - Defaults to 100 if not provided by LLM
   - Existing analyses without field will continue to work

2. **Enhancement 2:**
   - Increases pruning threshold (more aggressive filtering)
   - Existing direct claims unaffected (never pruned)
   - May prune more tangential claims (intended behavior)

3. **Enhancement 3:**
   - Default `maxOpinionFactors=0` (unlimited, monitoring only)
   - No behavior change unless explicitly configured
   - Logs provide visibility but don't affect verdicts

---

## Configuration Summary

After implementation, these new controls will be available via Admin UI:

### Pipeline Config
```json
{
  // Enhancement 1: Thesis Relevance Validation
  "thesisRelevanceValidationEnabled": true,
  "thesisRelevanceLowConfidenceThreshold": 70,
  "thesisRelevanceAutoDowngradeThreshold": 60,

  // Enhancement 2: Tangential Evidence Threshold
  "minEvidenceForTangential": 2,
  "tangentialEvidenceQualityCheckEnabled": false,

  // Enhancement 3: Opinion Accumulation Monitoring
  "maxOpinionFactors": 0,
  "opinionAccumulationWarningThreshold": 70
}
```

---

## Success Metrics

After implementation, monitor these metrics:

1. **Relevance Validation:**
   - Count of low-confidence warnings logged
   - Count of auto-downgrades (direct→tangential)
   - False positive rate (legitimate "direct" claims downgraded)

2. **Tangential Pruning:**
   - Count of additional claims pruned (threshold 1→2)
   - User feedback on report quality

3. **Opinion Monitoring:**
   - Frequency of high-opinion-ratio warnings
   - Average opinion ratio across analyses
   - Correlation with source quality

---

## Deployment Notes

1. **Roll out gradually:**
   - Week 1: Deploy with monitoring only (maxOpinionFactors=0)
   - Week 2: Enable auto-downgrade (after reviewing false positives)
   - Week 3: Enable tangential quality check (after testing)

2. **Monitor logs:**
   - Watch for excessive low-confidence warnings (may indicate prompt issue)
   - Watch for excessive opinion ratio warnings (may indicate source quality issue)

3. **User communication:**
   - Document new config options in UCM guide
   - Update admin interface tooltips
   - Add release notes explaining enhancements

---

## Documentation Updates Required

After implementation, update:

1. **Architecture docs:**
   - [Overview.md](../ARCHITECTURE/Overview.md): Add confidence scoring section
   - [Evidence_Quality_Filtering.md](../ARCHITECTURE/Evidence_Quality_Filtering.md): Update thresholds

2. **User guides:**
   - [Unified_Config_Management.md](../USER_GUIDES/Unified_Config_Management.md): Add new config options
   - [Admin_Interface.md](../USER_GUIDES/Admin_Interface.md): Document new controls

3. **Status docs:**
   - [Current_Status.md](../STATUS/Current_Status.md): Mark enhancements as complete
   - [HISTORY.md](../STATUS/HISTORY.md): Add changelog entry

---

## Questions for Clarification

Before implementing, consider:

1. **Enhancement 1:** Should auto-downgrade be enabled by default, or start disabled?
   - Recommendation: Start enabled (conservative, prevents false positives)

2. **Enhancement 2:** Should quality check be implemented initially, or just threshold increase?
   - Recommendation: Start with just threshold increase (simpler), add quality check in v2.10

3. **Enhancement 3:** Should opinion limiting be exposed in Admin UI, or keep as config-file-only?
   - Recommendation: Config-file-only for now (advanced feature)

---

**Ready to implement?** Start with Enhancement 1, then 2, then 3. Test thoroughly between each enhancement. Good luck!
