# Quality Issues — Consolidated Implementation Plan

**Date:** 2026-02-12
**Role:** Senior Developer (Claude Sonnet 4.5)
**Status:** Ready for Approval
**Based on:** Multi-agent investigation synthesis + Senior Developer review

---

## Executive Summary

Analysis of two production jobs (Epstein/Fox article + Bolsonaro trial) revealed three systematic quality issues affecting all analyses:

| Issue | Current Impact | Root Cause | Target After Fix |
|-------|---------------|------------|------------------|
| **Classification Fallbacks** | 22 per analysis (~25% of evidence) | Runtime prompt missing field instructions | <2 per analysis (<5%) |
| **Low Grounding Ratios** | 30-35% | Missing citations (28.6%) + ~~substring matching~~ → LLM adjudication | 60-80% (**fix applied**) |
| **Verdict Direction Mismatches** | Frequent auto-corrections (some wrong) | Scope mismatch: evidence direction relative to wrong claim | Warning-only, accurate detection |

**Critical Discovery:** The orchestrated pipeline uses `prompts/orchestrated.prompt.md` at runtime, NOT `prompts/base/extract-evidence-base.ts`. Classification field instructions exist in the base file but were never migrated to the runtime prompt profile. This is prompt-schema drift from architecture consolidation.

**Total Estimated Effort:** 12-17 hours across 4 phased steps

---

## Issue 1: Classification Fallbacks (CRITICAL)

### Current State
- **evidenceBasis**: 22 fallbacks per analysis (27.3% and 19.2% in test jobs)
- **Across 120 jobs**: 189 total evidenceBasis fallbacks
- **Target**: <5% fallback rate per [Evidence_Quality_Filtering.md:1245](../ARCHITECTURE/Evidence_Quality_Filtering.md)
- **Default value**: "anecdotal" (weakest evidence type)

### Root Cause Analysis

**Primary:** Runtime prompt missing instructions
- File: [prompts/orchestrated.prompt.md:476](../../apps/web/prompts/orchestrated.prompt.md) (EXTRACT_EVIDENCE section)
- Fields `sourceAuthority`, `evidenceBasis`, `probativeValue` are NOT mentioned in prompt
- Instructions exist in [prompts/base/extract-evidence-base.ts:126-200](../../apps/web/src/lib/analyzer/prompts/base/extract-evidence-base.ts) but that file is **legacy/unused**
- LLM receives no guidance → omits fields → defaults applied

**Secondary:** Schema allows omission
- File: [orchestrated.ts:6124-6130](../../apps/web/src/lib/analyzer/orchestrated.ts)
- All three fields marked `.optional()` in Zod schema
- Structured output mode doesn't enforce them
- Even when LLM tries to provide them, validation passes when missing

**Consequence:** Official records, legal documents, and government reports systematically misclassified as "anecdotal", biasing analysis toward lower confidence.

### Implementation Plan

**Part A: Prompt Profile Alignment** (Requires human approval per AGENTS.md)
```markdown
File: apps/web/prompts/orchestrated.prompt.md
Section: EXTRACT_EVIDENCE (around line 476)

Add after existing field definitions:

## EVIDENCE CLASSIFICATION (REQUIRED FIELDS)

For EACH evidence item, classify these fields:

**sourceAuthority** (WHO produced this evidence):
- **primary**: Original research, official records, court documents, audited datasets
  - Example: "Supreme Court ruling in United States v. Smith (2024)"
  - Example: "Published peer-reviewed study in Journal of Science"
- **secondary**: News reporting or analysis summarizing primary sources
  - Example: "New York Times article citing court documents"
  - Example: "Reuters report on quarterly earnings"
- **opinion**: Editorials, advocacy statements, public commentary without concrete evidence
  - Example: "Senator's press statement criticizing policy"
  - Example: "Op-ed arguing for position change"
- **contested**: The source itself is disputed or unreliable within the AnalysisContext
  - Example: "Unverified social media claim"
  - Example: "Document whose authenticity is disputed"

**CRITICAL**: Opinion sources are NOT documented evidence even if they use evidence-like language. If source lacks concrete records, measurements, or verifiable documentation → classify as **opinion** → mark probativeValue as **low** → DO NOT extract.

**evidenceBasis** (HOW was this evidence established):
- **scientific**: Empirical studies, experiments, measured data with methodology
  - Example: Clinical trial results with control groups
  - Example: Laboratory analysis with measurement instruments
- **documented**: Official records, audits, legal findings, verified logs, filed documents
  - Example: Court records, government filings, certified audits
  - Example: Timestamped transaction logs, notarized documents
- **anecdotal**: Personal accounts or testimonials without broader verification
  - Example: Witness statement without corroboration
  - Example: Individual testimony or personal experience
- **theoretical**: Logical arguments without empirical confirmation
  - Example: Legal reasoning about hypothetical scenarios
  - Example: Economic models without real-world validation
- **pseudoscientific**: Claims that conflict with established scientific principles
  - Example: Claims violating known physics or biology

**Decision tree**:
1. Does source contain measurements/experiments with documented methodology? → **scientific**
2. Does source contain official records, filings, audits, or certified documents? → **documented**
3. Does source contain personal accounts, testimony, or unverified observations? → **anecdotal**
4. Does source contain logical reasoning without empirical data? → **theoretical**
5. Does source contradict established scientific consensus? → **pseudoscientific**

**Non-examples**:
- Court documents referencing scientific studies → **documented** (not scientific)
- News article citing official records → **secondary** + **documented**
- Expert opinion without supporting data → **opinion** + **anecdotal**

**probativeValue** (STRENGTH of this evidence for claims):
- **high**: Strong attribution, specific content, directly relevant to claims
  - Quantitative data with clear source citation
  - Named expert quotes with credentials and specific statements
  - Official documents with exact dates/locations/parties
- **medium**: Moderate attribution, some specificity, reasonably relevant
  - General trends or observations with attribution
  - Expert statements with context but less specificity
  - Secondary sources summarizing primary evidence
- **low**: Weak/missing attribution, vague content, or marginal relevance
  - DO NOT EXTRACT items with low probativeValue
  - Vague assertions ("some say", "many believe")
  - Unattributed claims or speculation

**CRITICAL**: All three fields are REQUIRED. If unclear which category applies, use these defaults:
- sourceAuthority: "secondary" for news/analysis, "primary" for official docs
- evidenceBasis: "documented" for official sources, "anecdotal" for informal
- probativeValue: If you cannot determine high/medium → DO NOT EXTRACT the item
```

**Part B: Schema Enforcement** (Code change, must follow Part A)
```typescript
File: apps/web/src/lib/analyzer/orchestrated.ts
Lines: 6124-6130

// BEFORE:
sourceAuthority: z.enum(["primary", "secondary", "opinion"]).optional(),
evidenceBasis: z.enum(["scientific", "documented", "anecdotal", "theoretical", "pseudoscientific"]).optional(),
probativeValue: z.enum(["high", "medium", "low"]).optional(),

// AFTER:
sourceAuthority: z.enum(["primary", "secondary", "opinion"]),
evidenceBasis: z.enum(["scientific", "documented", "anecdotal", "theoretical", "pseudoscientific"]),
probativeValue: z.enum(["high", "medium", "low"]),
// Removed .optional() - fields are now required per prompt instructions
```

**CRITICAL:** Part B MUST NOT be deployed without Part A completion. Making fields required before adding prompt instructions will cause extraction failures.

**Expected Outcome:**
- evidenceBasis fallbacks: 22/analysis → <1/analysis
- Total classification fallbacks: 10-12/analysis → <2/analysis
- Evidence quality: Accurate classification improves confidence calibration

---

## Issue 2: Low Grounding Ratios (HIGH)

### Current State
- **Grounding ratio**: 30-35% (should be 60-80%)
- **Missing citations**: 28.6% of claims have empty `supportingEvidenceIds`
- **Warnings**: "Claim has N key terms but no cited evidence"

### Root Cause Analysis

**A. Missing Citations (Primary, 28.6% of claims)**
- File: [orchestrated.ts:6780, 6819, 6912, 6947](../../apps/web/src/lib/analyzer/orchestrated.ts)
- Field `supportingEvidenceIds` marked `.optional()` in verdict schemas
- LLM writes reasoning without citing evidence IDs
- Prompt lists field in output spec but doesn't emphasize it as critical
- **Result**: Claims with zero citations automatically score 0% grounding

**B. Substring Matching Too Strict (Secondary)**
- File: [grounding-check.ts:213](../../apps/web/src/lib/analyzer/grounding-check.ts)
- Code: `corpus.includes(term.toLowerCase())`
- No stemming, no synonyms, no semantic equivalence
- LLM reasoning: "controversial plea deal"
- Evidence text: "pleaded guilty to soliciting prostitution"
- **Result**: Semantically equivalent but lexically different → no match

**C. Vocabulary Mismatch (Inherent)**
- LLM writes verdict reasoning using synthesized/paraphrased language
- Evidence items contain raw source excerpts with different vocabulary
- Key terms extracted from reasoning perspective, not evidence perspective
- **Result**: Even well-grounded verdicts show low match rates

### Implementation Plan

**Phase 1: Citation Hydration** (Structural, immediate)
```typescript
File: apps/web/src/lib/analyzer/grounding-check.ts
Add before checkVerdictGrounding():

/**
 * Hydrate missing supportingEvidenceIds from reasoning text citations.
 * Scans reasoning for evidence ID patterns (S\d+-E\d+) and adds to array.
 * This is structural plumbing (regex for IDs), not semantic analysis.
 */
function hydrateCitationsFromReasoning(
  claimVerdicts: ClaimVerdict[],
  allEvidence: EvidenceItem[]
): ClaimVerdict[] {
  const validEvidenceIds = new Set(allEvidence.map(e => e.id));

  return claimVerdicts.map(verdict => {
    if (!verdict.supportingEvidenceIds || verdict.supportingEvidenceIds.length === 0) {
      // Extract evidence ID patterns: S1-E5, S10-E2, etc.
      const reasoning = verdict.reasoning || "";
      const idPattern = /S\d+-E\d+/g;
      const foundIds = reasoning.match(idPattern) || [];
      const validIds = foundIds.filter(id => validEvidenceIds.has(id));

      if (validIds.length > 0) {
        return {
          ...verdict,
          supportingEvidenceIds: [...new Set(validIds)] // deduplicate
        };
      }
    }
    return verdict;
  });
}

// Then update checkVerdictGrounding() to hydrate first:
export async function checkVerdictGrounding(
  claimVerdicts: ClaimVerdict[],
  allEvidence: EvidenceItem[],
): Promise<GroundingCheckResult> {
  // Hydrate missing citations before grounding check
  const hydratedVerdicts = hydrateCitationsFromReasoning(claimVerdicts, allEvidence);

  // ... rest of existing logic uses hydratedVerdicts
}
```

**Phase 2: LLM-Powered Grounding** (Proper fix, aligns with AGENTS.md) **✅ IMPLEMENTED**
```typescript
// HISTORICAL — this was the proposed approach. Actual implementation uses
// adjudicateGroundingBatch() in grounding-check.ts with batched LLM call
// returning AdjudicationBatchResult { ratios: number[], degraded: boolean }.
// Degraded fallback: 0.5 (conservative), not 1.0.
File: apps/web/src/lib/analyzer/grounding-check.ts
Replace lines 208-216 (substring matching):

// BEFORE:
for (const term of keyTerms) {
  if (corpus.includes(term.toLowerCase())) {
    groundedCount++;
  }
}

// AFTER:
// Use LLM to assess semantic grounding (batched call)
const groundingPrompt = `
For this verdict reasoning and cited evidence, assess if the key claims are semantically supported:

Verdict reasoning: ${verdict.reasoning}

Cited evidence:
${buildEvidenceCorpus(evidenceIds, allEvidence)}

Key terms to verify: ${keyTerms.join(", ")}

For each key term, respond "grounded" if semantically present in evidence, "ungrounded" if not.
Return JSON: { "term": "status", ... }
`;

const result = await generateText({
  model: getModelForTask("extract_evidence").model, // Haiku - cheap + fast
  messages: [{ role: "user", content: groundingPrompt }],
  temperature: 0.1
});

// Parse LLM response and count grounded terms
const parsed = JSON.parse(result.text);
const groundedCount = Object.values(parsed).filter(s => s === "grounded").length;
```

**Phase 3: UCM Configuration**
```typescript
File: apps/web/src/lib/config-storage.ts
Add to CalcConfig schema:

grounding: {
  warningThreshold: 0.3,  // Warn if ratio < 30%
  penaltyThreshold: 0.5,  // Apply confidence penalty if < 50%
  reductionFactor: 0.3,   // How much to reduce confidence
  floorRatio: 0.1         // Minimum before max penalty
}
```

**Expected Outcome:**
- Grounding ratio: 30-35% → 60-80%
- Missing citation warnings: Reduced by ~28% (hydration fixes)
- False positives: Eliminated (LLM semantic matching)
- Confidence penalties: Accurate (based on real grounding issues)

---

## Issue 3: Verdict Direction Mismatch (HIGH)

### Current State
- **Auto-correction frequency**: Multiple per analysis
- **Example**: SC16 auto-corrected 38% → 65% despite low verdict being potentially correct
- **Warning text**: Misleading ("% contradicts" even when evidence supports)

### Root Cause Analysis

**A. Scope Mismatch (Critical design flaw)**
- File: [types.ts:477](../../apps/web/src/lib/analyzer/types.ts)
- `claimDirection` defined: "Direction relative to **original user claim**"
- File: [orchestrated.ts:3509](../../apps/web/src/lib/analyzer/orchestrated.ts)
- Validation uses: Evidence claimDirection to validate **sub-claim verdict**
- **Problem**: Sub-claims can have different truth direction than original claim

**Example:**
- Original claim: "Trump exposed Epstein"
- Sub-claim SC16: "3M pages = substantial transparency compliance"
- Evidence confirms factual release → `claimDirection: "supports"` (original claim)
- But SC16 verdict should be low if release was incomplete
- Validator sees "supports" evidence + low verdict → flags as mismatch → wrong flip

**B. Auto-Correct Always Enabled**
- Files: [orchestrated.ts:8009, 8596, 9306](../../apps/web/src/lib/analyzer/orchestrated.ts)
- All three verdict paths: `autoCorrect: true`
- When scope mismatch makes detection wrong → auto-correction flips incorrectly
- No way to disable this behavior

**C. Warning Message Misleading**
- File: [orchestrated.ts:3592](../../apps/web/src/lib/analyzer/orchestrated.ts)
- Text always: "% of evidence contradicts it"
- Doesn't account for: evidence supports + verdict low (opposite case)
- Details field doesn't include which evidence items were counted

**D. LLM Conflates "Contested" with "False"**
- SC16: Evidence confirmed factual release (all support)
- LLM scored low because stakeholders contested completeness
- Verdict treated contestation as counter-evidence
- Correct behavior: contested → affects confidence, not direction

### Implementation Plan

**Phase 1: Disable Auto-Correct + Fix Messages** (Immediate, code-only)

```typescript
File: apps/web/src/lib/analyzer/orchestrated.ts
Lines: 8009, 8596, 9306

// BEFORE:
const { validatedVerdicts, mismatches } = validateVerdictDirections(
  withSR,
  state.evidenceItems,
  { autoCorrect: true, majorityThreshold: 0.6, minEvidenceCount: 2 }
);

// AFTER:
const { validatedVerdicts, mismatches } = validateVerdictDirections(
  withSR,
  state.evidenceItems,
  {
    autoCorrect: false,  // DISABLED until scope mismatch fixed
    majorityThreshold: 0.6,
    minEvidenceCount: 2
  }
);

// Line 3592 - Fix warning message:
// BEFORE:
message: `Verdict for "${verdict.claimText?.substring(0, 50)}..." was ${verdict.truthPercentage}% but ${Math.round(contradictRatio * 100)}% of evidence contradicts it. Auto-corrected to ${correctedPct}%.`,

// AFTER:
const direction = evidenceSuggestsHigh ? "supports" : "contradicts";
const mismatchType = evidenceSuggestsHigh ? "low verdict despite supporting evidence" : "high verdict despite contradicting evidence";
message: `Verdict for "${verdict.claimText?.substring(0, 50)}..." ${mismatchType}. Verdict: ${verdict.truthPercentage}%, Evidence: ${Math.round(supportRatio * 100)}% support, ${Math.round(contradictRatio * 100)}% contradict. Manual review recommended.`,
details: {
  claimId: verdict.claimId,
  verdictPct: verdict.truthPercentage,
  supportRatio: Math.round(supportRatio * 100),
  contradictRatio: Math.round(contradictRatio * 100),
  neutralRatio: Math.round(neutralRatio * 100),
  evidenceIds: evidenceIds.slice(0, 10), // Include which evidence was counted
  expectedDirection: direction,
  reason: "Evidence direction relative to original claim may not match sub-claim direction"
}
```

**Phase 2: LLM-Based Per-Claim Validation** (Proper fix)

```typescript
File: apps/web/src/lib/analyzer/orchestrated.ts
Replace validateVerdictDirections() logic:

/**
 * Validate verdict direction using LLM to assess per-claim evidence direction.
 * This resolves scope mismatch by evaluating each sub-claim independently.
 */
async function validateVerdictDirectionsWithLLM(
  claimVerdicts: ClaimVerdict[],
  evidenceItems: EvidenceItem[]
): Promise<{ validatedVerdicts: ClaimVerdict[], mismatches: AnalysisWarning[] }> {

  // Batch prompt for all verdicts
  const validationPrompt = claimVerdicts.map((verdict, idx) => {
    const citedEvidence = evidenceItems.filter(e =>
      verdict.supportingEvidenceIds?.includes(e.id)
    );

    return `
[Verdict ${idx}]
Claim: ${verdict.claimText}
Verdict: ${verdict.truthPercentage}% (${verdict.truthPercentage >= 72 ? "HIGH" : verdict.truthPercentage < 43 ? "LOW" : "MIXED"})

Cited Evidence (${citedEvidence.length} items):
${citedEvidence.map(e => `- ${e.statement} [${e.claimDirection}]`).join("\n")}

Question: Does the verdict direction make sense given this evidence?
- If evidence mostly supports the claim → verdict should be ≥50%
- If evidence mostly contradicts → verdict should be <50%
- If evidence is mixed or insufficient → any verdict acceptable

Respond: { "verdict_id": ${idx}, "makes_sense": true/false, "reason": "..." }
`;
  }).join("\n---\n");

  const result = await generateText({
    model: getModelForTask("verdict").model, // Sonnet - needs reasoning
    messages: [{ role: "user", content: validationPrompt }],
    temperature: 0.2
  });

  // Parse and flag mismatches
  const validations = JSON.parse(result.text);
  const mismatches: AnalysisWarning[] = [];

  validations.forEach((v: any) => {
    if (!v.makes_sense) {
      mismatches.push({
        type: "verdict_direction_mismatch",
        severity: "warning",
        message: `Claim verdict ${v.verdict_id} direction questionable: ${v.reason}`,
        details: { claimId: claimVerdicts[v.verdict_id].claimId, reason: v.reason }
      });
    }
  });

  return { validatedVerdicts: claimVerdicts, mismatches };
}
```

**Phase 3: Strengthen Verdict Prompt** (Prompt change, needs approval)

Add to `prompts/orchestrated.prompt.md` VERDICT section:

```markdown
## CRITICAL: CONTESTED vs FALSE

**Do NOT conflate contestation with falsity:**

❌ WRONG: "Stakeholders dispute completeness → verdict = 30% (Leaning False)"
✅ RIGHT: "Evidence confirms factual release but completeness contested → verdict = 65% (Leaning True) with medium confidence"

**Guidance:**
- If evidence confirms the factual claim BUT interpretation/completeness is contested:
  - Verdict should be ≥50% (evidence supports the facts)
  - Confidence should be reduced (contestation creates uncertainty)
- If evidence refutes the factual claim:
  - Verdict should be <50% (evidence contradicts)
  - Confidence based on evidence strength

**Examples:**
- Claim: "Company released 3M pages of documents"
  - Evidence: Company released 3M pages (confirmed)
  - Contestation: "Only half of what was expected"
  - Verdict: 70% (Mostly True - factual claim confirmed)
  - Confidence: 65% (reduced due to completeness dispute)

- Claim: "Trial was fair"
  - Evidence: Multiple procedural violations documented
  - Verdict: 25% (Mostly False - evidence contradicts fairness)
  - Confidence: 80% (strong evidence of violations)
```

**Expected Outcome:**
- Auto-corrections: Eliminated (warning-only mode)
- Direction validation: Accurate (per-claim LLM assessment)
- Warning text: Informative (shows actual evidence distribution)
- Contested claims: Properly scored (high verdict + reduced confidence)

---

## Implementation Roadmap

### Step 1: Immediate Code Fixes (5-7 hours) ✅ DONE
**No prompt changes, no approval needed**

| Task | File | Lines | Risk | Time |
|------|------|-------|------|------|
| Disable auto-correct in 3 verdict paths | orchestrated.ts | 8009, 8596, 9306 | Low | 30min |
| Fix misleading warning message + details | orchestrated.ts | 3592 | Low | 30min |
| Add citation hydration function | grounding-check.ts | New function | Low | 1.5h |
| Integrate hydration into grounding check | grounding-check.ts | 157-246 | Low | 30min |
| Add prompt hash to result meta | orchestrated.ts | 11895 | Low | 30min |
| Add historical context comment to extract-evidence-base.ts | extract-evidence-base.ts | Top of file | Low | 15min |

**Testing:**
- Build: `npm run build`
- Tests: `npm test`
- Manual: Run 2 known analyses, verify no auto-corrections, check citations hydrated

**Deliverable:** PR with code-only fixes, no behavior changes to LLM calls

---

### Step 2: Prompt Profile Alignment (2-3 hours) ✅ DONE
**Approved and implemented**

| Task | File | Risk | Time |
|------|------|------|------|
| Port classification instructions to orchestrated prompt | orchestrated.prompt.md | Medium | 1.5h |
| Add anti-pattern examples to VERDICT section | orchestrated.prompt.md | Medium | 45min |
| Strengthen supportingEvidenceIds requirement | orchestrated.prompt.md | Low | 30min |
| Reseed prompts after changes | Run `npm run reseed:prompts` | Low | 5min |

**Testing:**
- Run 2-3 test analyses (Epstein, Bolsonaro, new case)
- Compare fallback rates: expect 22 → <5 per analysis
- Verify evidenceBasis classifications: expect "documented" for official sources
- Check supportingEvidenceIds: expect fewer empty arrays

**Deliverable:** Prompt change PR with before/after analysis comparison

---

### Step 3: Schema Enforcement (30 minutes) ✅ DONE
**Deployed after Step 2 completion**

| Task | File | Lines | Risk | Time |
|------|------|-------|------|------|
| Remove .optional() from 3 classification fields | orchestrated.ts | 6124-6130 | Low | 15min |
| Test build + run analysis | | | Low | 15min |

**Testing:**
- Verify structured output providers enforce required fields
- Check normalization fallback layer handles edge cases
- Run test suite: `npm test`

**Deliverable:** Schema change PR (deploy ONLY after Step 2 is live)

---

### Step 4: LLM-Powered Replacements (5-7 hours) ✅ DONE
**Implemented with degraded mode for LLM failures**

| Task | File | Risk | Time | Status |
|------|------|------|------|--------|
| Replace substring grounding with LLM adjudication | grounding-check.ts | Medium | 2-3h | ✅ `adjudicateGroundingBatch()` |
| Implement LLM per-claim direction validation | orchestrated.ts | Medium | 2-3h | ✅ `batchDirectionValidationLLM()` |
| Add grounding config to UCM schema | config-schemas.ts + calculation.default.json | Low | 1h | ✅ `groundingPenalty` section |
| Add grounding UCM loading to analyzer | orchestrated.ts | Low | 30min | ✅ |
| Add degraded mode for LLM failures | grounding-check.ts + orchestrated.ts + types.ts | Medium | — | ✅ Fallback 0.5 + warning types |

**Cost Impact:**
- Grounding LLM: ~1 Haiku call per analysis (~$0.001)
- Direction validation: ~1 Sonnet call per analysis (~$0.015)
- Total: ~$0.016 per analysis increase

**Testing:**
- A/B test: Old vs new grounding on 10 analyses
- Verify grounding ratios: expect 30-35% → 60-80%
- Check direction validation: expect accurate per-claim assessment
- Regression tests: Verify no quality degradation

**Deliverable:** Feature PR with A/B test results, cost analysis

---

### Step 5: Telemetry & Hardening (2-3 hours) — NOT STARTED

| Task | File | Risk | Time |
|------|------|------|------|
| Add telemetry: fallback rate, citation rate, grounding ratio | orchestrated.ts | Low | 1h |
| Add regression tests for classification scenarios | test/unit/ | Low | 1h |
| Add deprecation notice to extract-evidence-base.ts | extract-evidence-base.ts | Low | 15min |
| Update documentation | Various | Low | 45min |

**Metrics to track:**
- `classification_fallback_rate`: Target <5%
- `missing_citation_rate`: Target <10%
- `grounding_ratio_avg`: Target 60-80%
- `direction_mismatch_rate`: Target <5%

**Deliverable:** Monitoring PR + updated documentation

---

## Success Criteria

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| evidenceBasis fallbacks per analysis | 22 (~25%) | <2 (<5%) | FallbackTracker summary |
| Total classification fallbacks | 10-12 | <2 | FallbackTracker summary |
| Grounding ratio | 30-35% | 60-80% | GroundingCheckResult |
| Claims with missing citations | 28.6% | <10% | Verdict schema validation |
| Verdict auto-corrections | Multiple | 0 (warning-only) | AnalysisWarnings count |
| Direction validation accuracy | ~60% (scope mismatch) | >90% | Manual review |

**Verification Plan:**
1. Run 10 diverse analyses (trials, policies, events, science)
2. Track all metrics above
3. Manual review of 3 analyses for qualitative assessment
4. Compare before/after confidence calibration accuracy

---

## Risk Assessment

| Risk | Impact | Mitigation | Status |
|------|--------|------------|--------|
| Schema change breaks non-structured providers | HIGH | Deploy only after prompt update; keep normalization fallback | Mitigated |
| LLM grounding adds latency | MEDIUM | Use Haiku (fast); batch all verdicts in 1 call | Acceptable |
| Direction validation changes behavior | HIGH | Phase 1 warning-only; Phase 2 LLM validation after testing | Mitigated |
| Prompt changes affect all future analyses | HIGH | A/B test on 10+ cases before full rollout | Mitigated |
| Cost increase from new LLM calls | LOW | ~$0.016/analysis; Haiku + batching minimizes cost | Acceptable |

---

## Open Questions for User

1. **Step 2 Prompt Changes**: Review the proposed classification instructions (lines 44-99 of this plan). Approve specific wording or request changes?

2. **Auto-Correct Decision**: Confirmed disabled in Phase 1. Should it remain permanently disabled, or re-enable after Phase 2 (LLM per-claim validation)?

3. **Cost Tolerance**: New LLM calls add ~$0.016/analysis. Acceptable trade-off for quality improvement?

4. **Rollout Strategy**:
   - Option A: Deploy all steps sequentially (4-6 weeks)
   - Option B: Deploy Step 1+2 immediately, defer Step 4 (LLM replacements) to later sprint
   - Preferred approach?

5. **Legacy File**: Mark `extract-evidence-base.ts` as deprecated, or delete entirely after Step 2 completion?

---

## Appendix: Historical Context

**Why does extract-evidence-base.ts exist if it's unused?**

The file contains comprehensive classification instructions from the pre-prompt-profile architecture (before v2.9). When the orchestrated pipeline was consolidated to use a single runtime prompt profile (`orchestrated.prompt.md`), these instructions were not migrated. This created prompt-schema drift.

**Timeline:**
- Pre-v2.9: Multiple prompt files, extract-evidence-base.ts actively used
- v2.9: Prompt profile consolidation → orchestrated.prompt.md becomes single source
- Classification instructions NOT migrated → schema still expects fields
- Result: LLM receives no guidance, fields marked optional, fallbacks triggered

**Lesson:** When consolidating architecture, verify all critical instructions are migrated, not just structure.

---

**Document Status:** Steps 1-4 Complete. Step 5 (Telemetry & Hardening) not started.
**Next Action:** Step 5 implementation (telemetry gates, regression tests, deprecation notices)
**Last Updated:** 2026-02-12
