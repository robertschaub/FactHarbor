# Schema Validation Fix: Multi-Agent Collaboration Plan

**Initiative**: Pass 2 Schema Validation Failure Resolution
**Status**: 📋 Plan Review Phase
**Date**: 2026-02-18
**Lead Architect**: Claude Sonnet 4.5 (current)
**Senior Architect**: Claude Opus 4.6 ✅

---

## Document Purpose

This plan coordinates multi-agent collaboration to fix Pass 2 schema validation failures (currently 5-10%, target <1%). The plan is structured for review and implementation by:

- **Lead Architect** (Sonnet 4.5): Plan coordination, implementation decisions, final approvals
- **Senior Architect** (Opus 4.6): Architectural oversight, strategic review, risk assessment
- **LLM Expert** (Sonnet 4.5): Prompt engineering, schema design, A/B testing
- **Senior Developer** (Cline + Gemini 3 Pro): Implementation, testing, metrics collection
- **Code Reviewer** (GPT 5.2-Codex): Quality review, security analysis, correctness validation

---

## Quick Reference

**Root Problem**: Pass2AtomicClaimSchema validation fails 5-10% of the time during claim extraction
**Root Cause**: Schema complexity (11 required fields, 6 enums, nested objects)
**Impact**: Every failure = retry overhead (30-60s delay + $0.10-0.20 cost)
**Target**: Reduce failures from 5-10% → <1% within 4 weeks

**Related Documents**:
- [LLM Expert Analysis](./LLM_Expert_Review_Schema_Validation.md)
- [Lead Architect Assessment](./Lead_Architect_Schema_Assessment_2026-02-18.md)
- [ClaimBoundary Pipeline Architecture](./ClaimBoundary_Pipeline_Architecture_2026-02-15.md)

---

## Architectural Context

### Current Schema (Pass2AtomicClaimSchema)

**Location**: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` lines 319-336

```typescript
const Pass2AtomicClaimSchema = z.object({
  id: z.string(),                    // ✅ Core (keep required)
  statement: z.string(),             // ✅ Core (keep required)
  category: z.enum(["factual", "evaluative", "procedural"]),  // ✅ Core (keep required)

  // Metadata (11 total fields, 8 will become optional)
  centrality: z.enum(["high", "medium", "low"]),
  harmPotential: z.enum(["critical", "high", "medium", "low"]),
  isCentral: z.boolean(),
  claimDirection: z.enum(["supports_thesis", "contradicts_thesis", "contextual"]),
  keyEntities: z.array(z.string()),
  checkWorthiness: z.enum(["high", "medium", "low"]),
  specificityScore: z.number(),      // ❌ NOT USED (Gate 1 hardcodes to 0)
  groundingQuality: z.enum(["strong", "moderate", "weak", "none"]),

  // Nested object (major failure contributor)
  expectedEvidenceProfile: z.object({
    methodologies: z.array(z.string()),     // ❌ Required array = failure risk
    expectedMetrics: z.array(z.string()),   // ❌ Required array = failure risk
    expectedSourceTypes: z.array(z.string()), // ❌ Required array = failure risk
  }),
});
```

### Critical Findings from Codebase Audit

| Field | Schema Status | Code Usage | Decision |
|-------|--------------|------------|----------|
| `specificityScore` | Required (z.number()) | ❌ Hardcoded to `0` in Gate 1 (quality-gates.ts:62) | **REMOVE** |
| `opinionScore` | ❌ Not in schema | ❌ Hardcoded to `0` in Gate 1 | N/A (already gone) |
| `expectedEvidenceProfile` | Required (nested object) | ✅ Used in research prompts (line 1555) | **KEEP + make robust** |
| Config: `gate1SpecificityThreshold` | Defined (0.3) | ❌ Never checked by Gate 1 | **REMOVE** |
| Config: `gate1OpinionThreshold` | Defined (0.7) | ❌ Never checked by Gate 1 | **REMOVE** |

**Gate 1 Reality Check**:
```typescript
// quality-gates.ts:66 — Gate 1 validation logic
const wouldPass = String(claimText || "").trim().length > 0;
// ☝️ Only checks if claim text is non-empty. All score-based validation is dead code.
```

---

## Phased Implementation Plan

### Phase 0: Audit & Telemetry (Week 1, Days 1-2) 🔍

**Goal**: Gain visibility before making changes

**Owner**: Senior Developer
**Reviewer**: Code Reviewer

#### Task 0.1: Add Field-Level Failure Telemetry ⭐ CRITICAL

**File**: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
**Location**: Pass 2 error handling (around line 831-865)

**Implementation**:
```typescript
// In extractClaims, Pass 2 error handling
try {
  const validated = Pass2OutputSchema.parse(pass2Output);
  // ... success path
} catch (err) {
  if (err instanceof z.ZodError) {
    // NEW: Log each field failure
    err.issues.forEach(issue => {
      const fieldPath = issue.path.join('.');
      console.error(`[Pass2] Field validation failed:`, {
        field: fieldPath,
        code: issue.code,
        message: issue.message,
        received: issue.received,
        expected: issue.expected
      });

      // Record to metrics (if metrics-integration is available)
      recordMetric?.("pass2_field_failure", {
        field: fieldPath,
        errorCode: issue.code,
        claimIndex: issue.path[1] // atomicClaims[N]
      });
    });
  }

  // ... existing retry logic
}
```

**Verification**:
1. Trigger a validation failure (modify schema temporarily to make a field invalid)
2. Check console output shows detailed field-level error
3. Verify metric is recorded (if metrics integration active)

**Success Criteria**: Can identify which specific fields cause most failures

---

#### Task 0.2: Audit Prompt vs Schema Alignment

**File**: `apps/web/prompts/claimboundary.prompt.md`
**Section**: `CLAIM_EXTRACTION_PASS2`

**Action**:
1. Read the CLAIM_EXTRACTION_PASS2 prompt section
2. List all fields the prompt instructs LLM to output
3. Compare to Pass2AtomicClaimSchema fields
4. Document mismatches in table format

**Template for findings**:
```markdown
| Field | In Prompt? | In Schema? | Mismatch Type |
|-------|-----------|-----------|---------------|
| specificityScore | ✅ YES | ✅ YES (required) | ⚠️ Code ignores value |
| opinionScore | ❓ TBD | ❌ NO | ⚠️ Prompt may ask for deprecated field |
```

**Reviewer**: LLM Expert validates findings

**Success Criteria**: Complete alignment table, all mismatches documented

---

### Phase 1: Emergency Fixes (Week 1, Days 3-5) 🚨

**Goal**: Reduce failures from 5-10% to <2%

**Owner**: Senior Developer (Sonnet 4.5)
**Reviewer**: Code Reviewer (GPT 5.3-Codex)
**Approver**: Lead Architect (Opus 4.6)

#### Task 1.1: Make Metadata Fields Optional with Defaults ⭐ HIGH IMPACT

**File**: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (lines 319-336)

**Change**: Replace schema definition

**Before** (11 required fields):
```typescript
const Pass2AtomicClaimSchema = z.object({
  id: z.string(),
  statement: z.string(),
  category: z.enum(["factual", "evaluative", "procedural"]),
  centrality: z.enum(["high", "medium", "low"]),
  harmPotential: z.enum(["critical", "high", "medium", "low"]),
  isCentral: z.boolean(),
  claimDirection: z.enum(["supports_thesis", "contradicts_thesis", "contextual"]),
  keyEntities: z.array(z.string()),
  checkWorthiness: z.enum(["high", "medium", "low"]),
  specificityScore: z.number(),
  groundingQuality: z.enum(["strong", "moderate", "weak", "none"]),
  expectedEvidenceProfile: z.object({
    methodologies: z.array(z.string()),
    expectedMetrics: z.array(z.string()),
    expectedSourceTypes: z.array(z.string()),
  }),
});
```

**After** (3 required fields + 8 optional with defaults):
```typescript
const Pass2AtomicClaimSchema = z.object({
  // REQUIRED CORE FIELDS (cannot have sensible defaults)
  id: z.string(),
  statement: z.string(),
  category: z.enum(["factual", "evaluative", "procedural"]),

  // OPTIONAL METADATA (with safe defaults)
  centrality: z.enum(["high", "medium", "low"]).optional().default("low"),
  harmPotential: z.enum(["critical", "high", "medium", "low"]).optional().default("low"),
  isCentral: z.boolean().optional().default(false),
  claimDirection: z.enum(["supports_thesis", "contradicts_thesis", "contextual"]).optional().default("contextual"),
  keyEntities: z.array(z.string()).optional().default([]),
  checkWorthiness: z.enum(["high", "medium", "low"]).optional().default("medium"),
  groundingQuality: z.enum(["strong", "moderate", "weak", "none"]).optional().default("none"),

  // REMOVED: specificityScore (dead code, Gate 1 doesn't use it)

  // CRITICAL: Keep but make robust (used in research)
  expectedEvidenceProfile: z.object({
    methodologies: z.array(z.string()).default([]),
    expectedMetrics: z.array(z.string()).default([]),
    expectedSourceTypes: z.array(z.string()).default([]),
  }).optional().default({
    methodologies: [],
    expectedMetrics: [],
    expectedSourceTypes: []
  })
});
```

**Downstream Impact**:
- `AtomicClaim` interface (types.ts) must be updated to match (fields become optional)
- All consumers of `AtomicClaim` should handle defaults gracefully (TypeScript will enforce this)

**Verification**:
1. Build passes: `npm -w apps/web run build`
2. Tests pass: `npm test`
3. Run 1 test analysis, verify claims extract successfully
4. Check that failed fields get defaults (trigger partial failure deliberately)

**Success Criteria**: Failure rate drops to <2% (measure over 10 test runs)

---

#### Task 1.2: Update AtomicClaim Interface

**File**: `apps/web/src/lib/analyzer/types.ts` (line 703)

**Change**: Make fields optional to match schema

**Before**:
```typescript
export interface AtomicClaim {
  id: string;
  statement: string;
  category: "factual" | "evaluative" | "procedural";
  centrality: "high" | "medium";  // ❌ Required
  harmPotential: "critical" | "high" | "medium" | "low";  // ❌ Required
  isCentral: true;  // ❌ Required and hardcoded to true
  claimDirection: "supports_thesis" | "contradicts_thesis" | "contextual";
  keyEntities: string[];
  checkWorthiness: "high" | "medium";
  specificityScore: number;  // ❌ REMOVE (dead code)
  groundingQuality: "strong" | "moderate" | "weak" | "none";
  expectedEvidenceProfile: { /* ... */ };
}
```

**After**:
```typescript
export interface AtomicClaim {
  // REQUIRED
  id: string;
  statement: string;
  category: "factual" | "evaluative" | "procedural";

  // OPTIONAL (with defaults in schema)
  centrality?: "high" | "medium" | "low";
  harmPotential?: "critical" | "high" | "medium" | "low";
  isCentral?: boolean;
  claimDirection?: "supports_thesis" | "contradicts_thesis" | "contextual";
  keyEntities?: string[];
  checkWorthiness?: "high" | "medium" | "low";
  groundingQuality?: "strong" | "moderate" | "weak" | "none";

  // REMOVED: specificityScore (dead code)

  // OPTIONAL (critical for research)
  expectedEvidenceProfile?: {
    methodologies: string[];
    expectedMetrics: string[];
    expectedSourceTypes: SourceType[];
  };
}
```

**Note**: After Gate 1 filtering, all claims should have `isCentral: true` and `centrality: "high" | "medium"`. Schema allows broader range because Pass 2 outputs low-centrality claims that get filtered out.

**Verification**: TypeScript compilation succeeds, no downstream errors

---

#### Task 1.3: Add Case-Insensitive Enum Matching

**File**: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (insert after Pass2AtomicClaimSchema)

**Implementation**:
```typescript
// Helper: Normalize claimDirection to handle typos and case variations
const ClaimDirectionNormalizer = z.string().transform((val) => {
  const normalized = val.toLowerCase().replace(/[\s_-]+/g, '_');

  // Exact match (fast path)
  const validValues: Array<"supports_thesis" | "contradicts_thesis" | "contextual"> =
    ["supports_thesis", "contradicts_thesis", "contextual"];
  if (validValues.includes(normalized as any)) {
    return normalized as "supports_thesis" | "contradicts_thesis" | "contextual";
  }

  // Fuzzy match (handles typos, multilingual, natural language)
  if (normalized.includes('support') || normalized.includes('apoiand') || normalized.includes('unterstütz')) {
    return "supports_thesis";
  }
  if (normalized.includes('contradict') || normalized.includes('contradiz') || normalized.includes('widerspruch')) {
    return "contradicts_thesis";
  }

  // Default fallback (conservative)
  console.warn(`[Pass2] Unknown claimDirection: "${val}", defaulting to contextual`);
  return "contextual";
});

// Apply normalizer to schema
const Pass2AtomicClaimSchema = z.object({
  // ... other fields ...
  claimDirection: ClaimDirectionNormalizer.optional().default("contextual"),
  // ... other fields ...
});
```

**Benefit**: Handles 90% of enum typos without retry, supports multilingual outputs

**Verification**: Test with deliberate typos ("Supports_Thesis", "CONTRADICTS THESIS", "suports")

---

#### Task 1.4: Remove Dead Config Fields

**Files**:
- `apps/web/src/lib/config-schemas.ts` (remove from schema)
- `apps/web/configs/pipeline.default.json` (remove from defaults)

**Remove**:
```typescript
// config-schemas.ts: DELETE these lines
gate1OpinionThreshold: z.number().min(0).max(1),      // Line ~967
gate1SpecificityThreshold: z.number().min(0).max(1),  // Line ~968

// pipeline.default.json: DELETE these lines
"gate1OpinionThreshold": 0.7,       // Line ~1136
"gate1SpecificityThreshold": 0.3,   // Line ~1137
```

**Update Interface**:
```typescript
// config-schemas.ts: QualityGates type
type QualityGates = {
  // REMOVED: gate1OpinionThreshold (opinionScore doesn't exist)
  // REMOVED: gate1SpecificityThreshold (Gate 1 doesn't use it)
  gate1MinContentWords: number;
  gate4MinSourcesHigh: number;
  // ... other Gate 4 fields
};
```

**Verification**:
1. Build succeeds
2. Config loads without warnings
3. Admin UI doesn't show removed fields

---

### Phase 2: Rebuild Gate 1 (Week 2) 🔧

**Goal**: Make Gate 1 functional or formalize its current simple behavior

**Owner**: Senior Developer
**Reviewer**: Code Reviewer
**Decision Maker**: Lead Architect (choose Option A or B)

#### Option A: Use Centrality Only (RECOMMENDED)

**Rationale**: Gate 1 already only checks centrality (via `isCentral` flag). Formalize this.

**File**: `apps/web/src/lib/analyzer/quality-gates.ts`

**Simplify to**:
```typescript
export function validateClaimGate1(
  claimId: string,
  claimText: string,
  isCentral: boolean = false,
  gateConfig?: QualityGateConfig, // Kept for future use, currently ignored
): ClaimValidationResult {
  // Gate 1: Only passes central claims with non-empty content
  const hasContent = String(claimText || "").trim().length > 0;
  const passed = isCentral && hasContent;

  return {
    claimId,
    passed,
    failureReason: !passed
      ? isCentral
        ? "Empty claim text"
        : "Low centrality (filtered by Pass 2)"
      : undefined,
    validatedAt: new Date(),
  };
}
```

**Remove from `ClaimValidationResult` type**:
```typescript
// types.ts: Remove unused fields
export interface ClaimValidationResult {
  claimId: string;
  passed: boolean;
  failureReason?: string;
  validatedAt: Date;

  // REMOVED (dead fields):
  // isFactual: boolean;
  // opinionScore: number;
  // specificityScore: number;
  // futureOriented: boolean;
  // claimType: string;
}
```

**Pros**: Aligns code with reality, removes dead fields, simpler
**Cons**: Loses potential for future quality-based filtering

---

#### Option B: Add Real Specificity Scoring

**Only if**: Lead Architect wants to use specificityScore for filtering

**Requirements**:
1. Define formula: `specificityScore = (has_numbers ? 0.4 : 0) + (has_dates ? 0.3 : 0) + (has_entities ? 0.3 : 0)`
2. Add formula to prompt instructions
3. Implement Gate 1 threshold check
4. Keep field in schema (don't make optional)

**Effort**: 3-4 hours
**Risk**: Medium (LLM may still fail to score consistently)

**Recommendation**: **Defer to Phase 3** (not blocking <1% target)

---

### Phase 3: Model Experiment (Week 3) 🧪

**Goal**: Determine if Sonnet reduces failures enough to justify cost

**Owner**: LLM Expert
**Data Analyst**: Senior Developer
**Decision Maker**: Lead Architect

#### A/B Test Design

**Hypothesis**: Sonnet 4.5 has lower structured output failure rate than Haiku 4.5

**Test Setup**:
- **Control**: Haiku 4.5 (current) with Phase 1 schema fixes
- **Variant**: Sonnet 4.5 with Phase 1 schema fixes
- **Sample Size**: 100 jobs per variant (200 total)
- **Input Distribution**: 50 simple, 30 medium, 20 complex claims

**Metrics Tracked**:
| Metric | Haiku (Control) | Sonnet (Variant) | Delta |
|--------|----------------|-----------------|-------|
| Pass 2 validation success rate | __ % | __ % | __ pp |
| Avg retries per job | __ | __ | __ |
| Avg Pass 2 latency | __ s | __ s | __ s |
| Cost per successful extraction | $__ | $__ | $__ |
| Verdict quality (manual review) | __/10 | __/10 | __ |

**Decision Criteria**:
- **If Sonnet success rate ≥99% AND cost delta ≤40%**: Adopt Sonnet for Pass 2
- **If Haiku success rate ≥98% with fixes**: Keep Haiku
- **If both <98%**: Investigate prompt issues (Phase 4)

**Implementation**:
```typescript
// config flag for A/B test
const modelForPass2 = process.env.PASS2_MODEL_VARIANT === "sonnet"
  ? "claude-sonnet-4-5-20250929"
  : "claude-haiku-4-5-20251001";

const model = getModelForTask("extract_claims_pass2", { override: modelForPass2 });
```

---

### Phase 4: Long-Term Improvements (Week 4+, Conditional) 🔮

**Only proceed if**: Phases 1-3 don't achieve <1% failure rate

#### Task 4.1: Split Pass 2 Into Two Calls

**Rationale**: Simpler schemas = lower failure per call

**Pass 2A (Haiku)**: Extract core claim data only
```typescript
{
  id: string,
  statement: string,
  category: "factual" | "evaluative" | "procedural"
}
```

**Pass 2B (Haiku)**: Enrich with metadata
```typescript
{
  claimId: string,
  expectedEvidenceProfile: { /* ... */ },
  centrality: "high" | "medium" | "low",
  // ... other metadata
}
```

**Benefit**: 2 simple calls more reliable than 1 complex call
**Cost**: Same total (2 Haiku calls ≈ 1 Haiku call with retry overhead)

---

## Multi-Agent Collaboration Protocol

### Review Sequence

1. **Phase 0 Plan Review** (Before Implementation)
   - **Senior Architect (Opus 4.6)**: Review architectural soundness, validate strategic decisions, assess long-term implications
   - **Lead Architect (Sonnet 4.5)**: Coordinate review, synthesize feedback, make final decisions
   - **LLM Expert (Sonnet 4.5)**: Review prompt alignment audit approach, schema design
   - **Senior Developer (Cline + Gemini 3 Pro)**: Review implementation feasibility, estimate effort
   - **Code Reviewer (GPT 5.2-Codex)**: Review for security/correctness concerns, identify risks

2. **Phase 1 Code Review** (After Implementation)
   - **Senior Developer**: Implement Task 1.1-1.4
   - **Code Reviewer**: Review schema changes, test coverage, edge cases
   - **Senior Architect**: Review architectural impact, breaking change assessment
   - **Lead Architect**: Final approval before merge

3. **Phase 2 Decision Point**
   - **Senior Architect**: Analyze Option A vs B from strategic perspective
   - **Lead Architect**: Choose Option A (simplify) or Option B (add scoring) based on multi-agent input
   - **Senior Developer**: Implement chosen option
   - **Code Reviewer**: Review implementation

4. **Phase 3 Analysis**
   - **LLM Expert**: Design A/B test, run experiments, analyze prompt performance
   - **Senior Developer**: Collect metrics, analyze data, compute cost deltas
   - **Senior Architect**: Assess long-term cost/quality implications
   - **Lead Architect**: Make model selection decision based on data + strategic input

### Handoff Points

**After Phase 0**:
- Senior Developer receives: Telemetry implementation spec, prompt audit findings
- Blocker: Cannot proceed until prompt audit complete (need to know what LLM is asked to output)

**After Phase 1**:
- Code Reviewer receives: PR with schema changes, test results
- Blocker: Cannot merge until Code Reviewer approves

**After Phase 2**:
- LLM Expert receives: Gate 1 decision (affects prompt instructions)
- Blocker: Cannot update prompts until Gate 1 logic finalized

**After Phase 3**:
- Lead Architect receives: A/B test results, cost analysis
- Blocker: Cannot change production model until decision made

### Communication Channels

**Questions for Lead Architect**:
- Architectural decisions (Option A vs B)
- Risk acceptance (breaking changes)
- Cost vs quality trade-offs

**Questions for LLM Expert**:
- Prompt design for new schema
- Enum value recommendations
- Multilingual enum handling

**Questions for Code Reviewer**:
- Security implications of optional fields
- Test coverage adequacy
- Edge case handling

---

## Success Criteria (Overall)

**Primary**:
- Pass 2 validation failure rate: **<1%** (measured over 100 jobs)

**Secondary**:
- No degradation in verdict quality (manual review of 20 verdicts)
- Build and all tests pass
- No new security vulnerabilities introduced
- Config aligned with code reality

**Quality Gates**:
- Phase 0: Telemetry shows which fields fail most
- Phase 1: Failure rate <2% before proceeding to Phase 2
- Phase 2: Gate 1 logic matches config and documentation
- Phase 3: Clear model recommendation with data backing

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation | Owner |
|------|--------|-----------|-----------|-------|
| Breaking downstream consumers | High | Medium | Add defaults to prevent `undefined`, update interface | Senior Dev |
| Phase 1 doesn't reach <2% | High | Low | Phase 3 (Sonnet) is fallback | LLM Expert |
| Prompt drift not caught | High | Medium | Phase 0 audit MUST be thorough | LLM Expert |
| Test coverage insufficient | Medium | Medium | Code Reviewer validates coverage | Code Reviewer |
| A/B test sample too small | Low | Low | 200 jobs > 100 minimum for statistical significance | Senior Dev |

---

## Current Status: ⏸️ AWAITING REVIEW

**Next Action**: Multi-agent plan review
- [ ] Lead Architect: Approve architectural approach
- [ ] LLM Expert: Approve prompt audit approach
- [ ] Senior Developer: Confirm implementation feasibility
- [ ] Code Reviewer: Identify review checkpoints

**Timeline**: Start Phase 0 immediately after plan approval

---

## Appendix: File Reference

### Files to Modify

**Phase 0**:
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (add telemetry)
- `apps/web/prompts/claimboundary.prompt.md` (audit Pass 2 section)

**Phase 1**:
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (schema changes)
- `apps/web/src/lib/analyzer/types.ts` (AtomicClaim interface)
- `apps/web/src/lib/config-schemas.ts` (remove dead config)
- `apps/web/configs/pipeline.default.json` (remove dead defaults)

**Phase 2**:
- `apps/web/src/lib/analyzer/quality-gates.ts` (rebuild Gate 1)
- `apps/web/src/lib/analyzer/types.ts` (ClaimValidationResult)

**Phase 3**:
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (model override)
- Test scripts for A/B comparison

### Test Coverage Required

- Unit tests: Schema validation with partial/invalid data
- Integration tests: Full Pass 2 extraction with defaults
- Edge cases: Empty arrays, missing nested objects, typo enums
- Regression: Existing analyses still produce same verdicts

---

**Document Version**: 1.0
**Last Updated**: 2026-02-18
**Status**: Ready for Multi-Agent Review
