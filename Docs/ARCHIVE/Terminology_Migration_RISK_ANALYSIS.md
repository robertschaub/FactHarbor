# Terminology Migration - Risk Analysis & Execution Strategy

**Date**: 2026-01-28
**Reviewer**: Claude Sonnet 4.5 (Risk Analysis & Execution Planning)
**Status**: Pre-execution review
**Base Document**: `Terminology_Migration_Plan_UPDATED.md` v1.1

---

## Executive Summary

The extended migration plan is **architecturally sound** but contains **execution risks** that need mitigation before proceeding. This document identifies 12 critical risks, 8 opportunities, and proposes a **revised execution order** to maximize success probability while minimizing disruption.

**Key Findings**:
- ✅ Overall direction is correct and well-researched
- ⚠️ Phase boundaries have dependency conflicts
- ⚠️ Category rename timing is misaligned
- ⚠️ Some "immediate" actions have hidden dependencies
- 🚀 6 low-hanging fruits identified that can be done now
- 🚀 3 quick wins that significantly reduce Phase 2 risk

---

## Critical Risks Identified

### Risk 1: Category Rename Coordination Failure ⚠️ HIGH

**Issue**: The plan shows `category: "evidence" → "direct_evidence"` as:
- Phase 0 (Documentation): ✅ Already done in xWiki
- Phase 2 (Code): Marked as "Medium risk"
- Immediate action items: Listed without clear sequencing

**Problem**: Code currently has hardcoded `category: "evidence"` in **12 locations**:
- `orchestrated.ts`: Lines 5235, 5274, 5321 (plus "counter_evidence" at 5361)
- `monolithic-dynamic.ts`: Line 432
- Provider prompt files: `google.ts`, `openai.ts`, `mistral.ts`, `tiering.ts` (8 more)

**Risk**: If we change the Zod schema to expect `"direct_evidence"` but prompts still say `"evidence"`, LLM outputs will fail validation.

**Impact**: All evidence extraction will break silently or fail loudly.

**Mitigation**:
```typescript
// Phase 1.5: Add dual parsing support BEFORE any renames
category: "legal_provision"
  | "evidence"         // Legacy, still accepted
  | "direct_evidence"  // New preferred value
  | "expert_quote" | "statistic" | "event" | "criticism";

// Phase 2: Update prompts to output "direct_evidence"
// Phase 3: Remove "evidence" from type union (breaking change)
```

**Action**: Create Phase 1.5 task for dual category support.

---

### Risk 2: claimDirection Optional vs Required Inconsistency ⚠️ MEDIUM

**Issue**:
- Current code: `claimDirection?: "supports" | "contradicts" | "neutral"` (OPTIONAL)
- Architectural review (Section 11.1): Recommends REQUIRED
- No migration plan for making it required

**Problem**: If we make it required without ensuring all extraction code populates it, we'll have type errors or runtime failures.

**Current Status**:
- Added in v2.6.29 (recent)
- Already used in 11 files for verdict generation
- But still optional, so some code paths may not set it

**Mitigation**:
1. **Phase 1.5**: Add extraction validation that logs when claimDirection is missing
2. **Phase 2**: Make it required with a default value fallback
3. **Phase 3**: Remove fallback (strict required)

**Action**: Add to Phase 1.5 with telemetry before making required.

---

### Risk 3: Uncommitted Changes Conflict ⚠️ MEDIUM

**Status**: GPT 5.2 High made uncommitted changes to 3 files:
- `apps/web/src/app/jobs/[id]/page.tsx` (8 changes)
- `apps/web/src/lib/analyzer/orchestrated.ts` (46 changes)
- `apps/web/src/lib/analyzer/types.ts` (19 changes)

**Risk**: If we proceed with Phase 1 completion without committing these, we may:
- Lose GPT 5.2's work
- Create merge conflicts with other ongoing work
- Have inconsistent state between agents

**Action**: **IMMEDIATE** - Commit GPT 5.2 High's Phase 1 progress before proceeding.

---

### Risk 4: probativeValue Schema Change Timing ⚠️ LOW

**Issue**: Plan shows adding `probativeValue` field in multiple phases:
- Phase 1.5 (immediate): "Add probativeValue field to ExtractedFact"
- Phase 2: "probativeValue?: 'high' | 'medium' | 'low'"
- Section 11.1: Shows it as part of enhanced EvidenceItem

**Confusion**: When exactly is this added to the schema? What prompts must change?

**Clarification Needed**:
```typescript
// Phase 1.5: Add as optional (backward compatible)
export interface ExtractedFact {
  // ... existing fields ...
  probativeValue?: "high" | "medium" | "low";  // NEW v2.8
}

// Prompt changes required:
// - extract-facts-base.ts: Add probativeValue to output schema
// - All provider prompts: Update example outputs
```

**Action**: Create explicit Phase 1.5 checklist with all affected files.

---

### Risk 5: EvidenceScope Extension Without Prompt Analysis ⚠️ MEDIUM

**Issue**: Plan recommends adding `sourceType` to EvidenceScope in Phase 2:
```typescript
sourceType?: "peer_reviewed_study" | "fact_check_report" | ...
```

**Problem**: EvidenceScope is currently extracted by LLM when it detects "significant analytical boundaries". Adding sourceType requires:
1. LLM to classify source type during extraction
2. Updated prompt instructions on how to detect each source type
3. Examples for each category

**Missing**: No prompt engineering analysis for this feature.

**Impact**: If we add the field without proper prompt guidance, LLM will:
- Rarely populate it (defaults to undefined)
- Misclassify sources (e.g., news article as "peer_reviewed_study")
- Require extensive prompt iteration to get right

**Mitigation**:
- Phase 2.0: Add field to schema (optional)
- Phase 2.1: Research prompt patterns for source type detection
- Phase 2.2: Implement prompt updates with A/B testing
- Phase 2.3: Enable by default after validation

**Action**: Split "Add sourceType" into 3 sub-phases with validation gates.

---

### Risk 6: EvidenceClaimLink Migration Path Unclear ⚠️ HIGH

**Issue**: Phase 3 proposes replacing `supportingFactIds: string[]` with `evidenceLinks: EvidenceClaimLink[]`.

**Problem**: The aggregation logic (`applyEvidenceWeighting()`, `generateVerdicts()`) heavily relies on `supportingFactIds`. Switching to a richer model requires:
1. Rewriting verdict aggregation logic
2. Updating stored job result parsing
3. Migrating database if jobs are persisted
4. UI changes to display rich linkage

**Estimate in Plan**: "5-10 days" for Phase 3 full implementation.

**Reality Check**: This is likely **15-20 days** minimum when including:
- Aggregation logic rewrite: 5-7 days
- Database migration: 2-3 days
- Testing across all edge cases: 5-7 days
- UI updates: 3-4 days

**Action**:
- Update Phase 3 estimate to 15-20 days
- Create detailed sub-task breakdown
- Add rollback plan if aggregation quality degrades

---

### Risk 7: Phase Boundary Dependencies ⚠️ MEDIUM

**Issue**: Some Phase 2 tasks depend on Phase 1 being FULLY complete, but Phase 1 completion criteria are vague.

**Example**:
- Phase 2 says: "TypeScript aliases as documented"
- But Phase 1 still has "Remaining Phase 1 Tasks" incomplete
- If we start Phase 2 before Phase 1 is done, we'll have mixed terminology in comments

**Action**: Define explicit Phase 1 completion gate:
```
Phase 1 Complete Gate:
- [ ] All prompt text uses "Evidence" terminology
- [ ] All code comments clarified with "(legacy field name)"
- [ ] UI labels use "Evidence" terminology
- [ ] Regression report diagrams updated
- [ ] No TODO comments about terminology
- [ ] Git committed with "Phase 1 complete" message
```

---

### Risk 8: Success Metrics Lack Baseline ⚠️ LOW

**Issue**: Section 17 shows success metrics with "Current Baseline" but these are estimates, not measured:

| Metric | Current Baseline |
|--------|------------------|
| Evidence quality (% high probative) | ~60% |
| Context detection accuracy | ~70% |

**Problem**: Without actual measurement, we can't validate improvements.

**Action**: Add Phase 1.5 task:
```
- [ ] Measure current baselines on 10 representative jobs
- [ ] Document measurement methodology
- [ ] Create automated metric collection script
```

---

### Risk 9: Vague Phrase Detection Complexity Underestimated ⚠️ LOW

**Issue**: Section 12.3 shows a list of vague phrase regex patterns. Looks simple.

**Reality**:
- Regex patterns will have false positives (e.g., "some say" in a quote attribution)
- Context-dependent: "allegedly" in a crime report is acceptable, in a scientific claim is not
- Language-dependent: English-centric patterns

**Recommendation**: Start with a conservative list (high-confidence patterns only), expand iteratively.

**Action**: Mark vague phrase detection as "Phase 2.2 - experimental" not "Phase 2.0 - core".

---

### Risk 10: Probative Filter May Remove Valid Evidence ⚠️ MEDIUM

**Issue**: The deterministic filter (Section 12.2) uses hard thresholds:
```typescript
minStatementLength: 20,      // characters
minExcerptLength: 30,        // characters
```

**Problem**: Some valid evidence may be concise:
- Legal citations: "18 U.S.C. § 1001" (16 chars)
- Short expert quotes: "It's a myth" – Dr. Smith (24 chars)
- Statistical facts: "73% (WHO, 2024)" (15 chars)

**Risk**: False positives = removing valid evidence = degraded verdict quality.

**Mitigation**:
1. Use category-specific thresholds (as recommended in Section 3.3)
2. Add "override" flag for high-specificity items
3. Log all filtered items for manual review
4. A/B test filter vs no-filter on representative jobs

**Action**: Add Phase 2 validation gate:
```
- [ ] Test filter on 20 historical jobs
- [ ] Manual review of filtered items
- [ ] False positive rate < 5%
- [ ] If FP > 5%, adjust thresholds
```

---

### Risk 11: Multiple Agents Working Concurrently ⚠️ MEDIUM

**Status**: Plan coordinator notes "Multi-agent effort (Claude Sonnet 4.5 + GPT 5.2 High)".

**Problem**: Concurrent agent work risks:
- Duplicated effort (both agents updating same file)
- Conflicting approaches (different comment styles, different priorities)
- Communication overhead (syncing what each agent did)

**Current Symptoms**:
- Uncommitted changes from GPT 5.2 High
- Architectural review from Claude Opus 4.5
- Risk analysis from Claude Sonnet 4.5 (me)

**Recommendation**:
- Designate a **lead agent** for each phase
- Clear handoff points between agents
- All work committed immediately after completion

**Action**: Update plan with agent ownership:
```
Phase 1: GPT 5.2 High (in progress) → commit before Phase 1.5
Phase 1.5: Claude Sonnet 4.5 (probative value, risk mitigation)
Phase 2: Claude Sonnet 4.5 or GPT 5.2 High (TBD based on availability)
Phase 3: Senior architect (Claude Opus 4.5) for aggregation logic
```

---

### Risk 12: Regression Report Diagram Update Scope Unknown ⚠️ LOW

**Issue**: Phase 1 includes "Update regression report diagrams" but the report has **9 complex Mermaid diagrams**.

**Files**:
- `Orchestrated_Report_Quality_Regression_Analysis.md`

**Scope Unknown**:
- Which diagrams need updating?
- How many "Fact" references total?
- Are there code examples in the report that also need updates?

**Action**: Add Phase 1 sub-task:
```
- [ ] Audit regression report for "Fact" terminology
- [ ] List all diagrams needing updates (with line numbers)
- [ ] Update diagrams
- [ ] Update code examples
- [ ] Verify Mermaid diagrams still render
```

---

## Opportunities Identified

### Opportunity 1: Low-Hanging Fruit - Add Optional Fields Now 🚀 IMMEDIATE

**What**: Add new optional fields to `ExtractedFact` immediately without breaking changes:

```typescript
export interface ExtractedFact {
  // ... existing fields ...

  // NEW v2.8: Optional quality indicators (backward compatible)
  probativeValue?: "high" | "medium" | "low";
  extractionConfidence?: number;  // 0-100
}
```

**Why Now**:
- ✅ 100% backward compatible (optional fields)
- ✅ No prompt changes required initially
- ✅ Enables gradual data collection
- ✅ Future phases can make them required

**Effort**: 15 minutes (add to types.ts, commit)

**Action**: Do this in Phase 1.5 immediately.

---

### Opportunity 2: Make claimDirection Quasi-Required 🚀 PHASE 1.5

**What**: Don't make `claimDirection` strictly required yet, but add validation that warns when missing:

```typescript
// In extraction post-processing:
for (const fact of extractedFacts) {
  if (!fact.claimDirection) {
    console.warn(`[QUALITY] Evidence ${fact.id} missing claimDirection - verdict quality may degrade`);
    // Default to "neutral" as fallback
    fact.claimDirection = "neutral";
  }
}
```

**Why**:
- ✅ Identifies code paths not setting claimDirection
- ✅ Provides fallback (no breakage)
- ✅ Telemetry for Phase 2 decision

**Effort**: 30 minutes

**Action**: Add to Phase 1.5.

---

### Opportunity 3: Dual Category Parsing (Easy Win) 🚀 PHASE 1.5

**What**: Update type definition to accept both old and new category values:

```typescript
category:
  | "legal_provision"
  | "evidence"          // Legacy - still accepted
  | "direct_evidence"   // New - preferred
  | "expert_quote"
  | "statistic"
  | "event"
  | "criticism";
```

**Why**:
- ✅ Enables gradual prompt migration
- ✅ No breakage if prompts still output "evidence"
- ✅ Documentation can use "direct_evidence"
- ✅ Reduces Phase 2 risk significantly

**Effort**: 10 minutes (add to union type)

**Action**: Do this in Phase 1.5 immediately.

---

### Opportunity 4: Commit GPT 5.2 High's Work Now 🚀 IMMEDIATE

**What**: Commit the 3 files with uncommitted changes before doing anything else.

**Why**:
- ✅ Preserves work
- ✅ Creates stable base for Phase 1.5
- ✅ Enables other agents to build on it
- ✅ Clear git history

**Effort**: 5 minutes

**Action**: **DO THIS FIRST** before any other changes.

---

### Opportunity 5: Automated Terminology Linter 🚀 PHASE 2

**What**: Create a simple linter that checks for prohibited terminology in new code:

```bash
# .github/workflows/terminology-lint.yml
# Run on PR: Warn if new code introduces "fact" terminology in wrong contexts

grep -r "facts\[\]" apps/web/src/ --exclude-dir=node_modules
grep -r "renderFactCard" apps/web/src/ --exclude-dir=node_modules
# etc.
```

**Why**:
- ✅ Prevents regression
- ✅ Educates developers
- ✅ Low maintenance

**Effort**: 2 hours

**Action**: Add to Phase 2 as nice-to-have.

---

### Opportunity 6: Quick Context Detection Win 🚀 PHASE 2

**What**: The architectural review mentions `clusterEvidenceByScope()` (Section 13.2) but this function doesn't exist yet.

**Opportunity**: Implement a simple version that just groups by `evidenceScope.name`:

```typescript
function clusterEvidenceByScope(evidence: ExtractedFact[]): EvidenceCluster[] {
  const clusters = new Map<string, ExtractedFact[]>();

  for (const item of evidence) {
    const scopeName = item.evidenceScope?.name || "default";
    if (!clusters.has(scopeName)) clusters.set(scopeName, []);
    clusters.get(scopeName)!.push(item);
  }

  return Array.from(clusters.entries()).map(([name, items]) => ({
    scopeName: name,
    items,
    representativeScope: items[0].evidenceScope
  }));
}
```

**Why**:
- ✅ 70% of the value of complex scope detection
- ✅ 10% of the effort
- ✅ Immediate quality improvement for multi-scope analyses

**Effort**: 3-4 hours

**Action**: Add to Phase 2.0 as quick win.

---

### Opportunity 7: EvidenceScope Field Clarification Comments 🚀 PHASE 1

**What**: Add the clarifying comments recommended in Section 5 of architectural review:

```typescript
export interface EvidenceScope {
  name: string;
  methodology?: string;
  boundaries?: string;
  geographic?: string;   // Geographic scope OF THE SOURCE'S DATA (not analysis jurisdiction)
  temporal?: string;     // Time period OF THE SOURCE'S DATA (not analysis timeframe)
}
```

**Why**:
- ✅ Prevents future confusion
- ✅ Zero risk
- ✅ Completes Phase 1 documentation goal

**Effort**: 2 minutes

**Action**: Add to remaining Phase 1 tasks.

---

### Opportunity 8: Baseline Measurement Script 🚀 PHASE 1.5

**What**: Create a simple Node.js script that measures current quality baselines:

```typescript
// scripts/measure-baselines.ts
// Run on 10 representative completed jobs
// Output: JSON with metrics

{
  "evidence_quality": {
    "total": 150,
    "with_excerpt": 142,
    "high_specificity": 95,
    "estimated_probative_pct": 63.3
  },
  "context_detection": {
    "jobs_with_multiple_contexts": 3,
    "accuracy": "manual review needed"
  }
}
```

**Why**:
- ✅ Objective validation of improvements
- ✅ Identifies quality issues proactively
- ✅ Can be automated in CI/CD

**Effort**: 4-5 hours

**Action**: Add to Phase 1.5 as validation gate.

---

## Revised Execution Order

### Current Order Issues

The plan shows:
1. Phase 0: Complete ✅
2. Phase 1: In Progress 🔄
3. Phase 1.5: Probative value (immediate)
4. Phase 2: Type aliases (1-2 months)
5. Phase 3: Full rename (3-6 months)

**Problem**: Phase 1.5 is inserted without clear completion of Phase 1.

### Proposed Revised Order

#### **IMMEDIATE (Today)**

1. **✅ Commit uncommitted changes** (GPT 5.2 High's work)
   - Files: `page.tsx`, `orchestrated.ts`, `types.ts`
   - Commit message: "Phase 1 progress: Comments, prompts, UI labels (partial)"
   - Owner: Any agent
   - Risk: None
   - Time: 5 min

2. **🚀 Add optional fields to ExtractedFact** (Opportunity 1)
   - Add: `probativeValue?: "high" | "medium" | "low"`
   - Add: `extractionConfidence?: number`
   - Commit immediately
   - Owner: Claude Sonnet 4.5
   - Risk: None (optional fields)
   - Time: 15 min

3. **🚀 Dual category parsing support** (Opportunity 3)
   - Add `"direct_evidence"` to category union
   - Keep `"evidence"` as accepted value
   - Commit immediately
   - Owner: Claude Sonnet 4.5
   - Risk: None (additive)
   - Time: 10 min

4. **🚀 EvidenceScope field comments** (Opportunity 7)
   - Add clarifying comments to `geographic` and `temporal` fields
   - Commit immediately
   - Owner: Claude Sonnet 4.5
   - Risk: None
   - Time: 2 min

**Total Immediate Work**: 32 minutes

---

#### **Phase 1 Completion (Next 1-2 days)**

5. **Complete remaining Phase 1 tasks**
   - [ ] Additional prompt files comment updates (7-10 files)
   - [ ] UI component comments (`renderFactCard`, `renderFactList`)
   - [ ] Regression report diagram audit and updates
   - [ ] Schema comments in `monolithic-canonical.ts`
   - Owner: GPT 5.2 High or Claude Sonnet 4.5
   - Risk: Low
   - Time: 6-8 hours

6. **Phase 1 validation gate**
   - [ ] All prompt text uses "Evidence" terminology ✓
   - [ ] All code comments have "(legacy field name)" notes ✓
   - [ ] UI labels use "Evidence" terminology ✓
   - [ ] Regression report updated ✓
   - [ ] Git committed: "Phase 1 complete: Terminology comments and labels"
   - Owner: Reviewer (human or senior agent)
   - Time: 30 min review

**Total Phase 1 Completion**: 6-8 hours

---

#### **Phase 1.5: Risk Mitigation (Next 3-5 days)**

7. **Probative value prompt instructions (Layer 1)**
   - Update `extract-facts-base.ts` with quality requirements
   - Update Zod schema to include `probativeValue` output field
   - Test with 3 sample sources
   - Owner: Claude Sonnet 4.5
   - Risk: Low (prompt-only, no filter yet)
   - Time: 2-3 hours

8. **claimDirection validation telemetry** (Opportunity 2)
   - Add warning logs for missing claimDirection
   - Add fallback to "neutral"
   - Run on 5 test jobs, review logs
   - Owner: Claude Sonnet 4.5
   - Risk: Low
   - Time: 30 min

9. **Measure current baselines** (Opportunity 8)
   - Create `scripts/measure-baselines.ts`
   - Run on 10 representative jobs
   - Document results in plan
   - Owner: Claude Sonnet 4.5
   - Risk: None (measurement only)
   - Time: 4-5 hours

10. **Category rename preparation**
    - Update all prompts: `"evidence"` → `"direct_evidence"`
    - Keep type union accepting both values (already done in step 3)
    - Test prompt changes with 3 sample jobs
    - Owner: Claude Sonnet 4.5
    - Risk: Medium (prompt changes)
    - Time: 2-3 hours

11. **Phase 1.5 validation gate**
    - [ ] Prompts output `probativeValue` field
    - [ ] `claimDirection` telemetry shows <5% missing
    - [ ] Baselines documented
    - [ ] Category prompts updated and tested
    - [ ] Git committed: "Phase 1.5: Risk mitigation and optional fields"
    - Time: 1 hour review

**Total Phase 1.5**: 10-13 hours (2 working days)

---

#### **Phase 2.0: Core Enhancements (2-3 weeks)**

12. **TypeScript type aliases** (per original plan)
    - Create `EvidenceItem` interface
    - Alias `ExtractedFact = EvidenceItem`
    - Update 5-10 files to use `EvidenceItem` in new code
    - Owner: Claude Sonnet 4.5
    - Risk: Low (alias, not rename)
    - Time: 4-6 hours

13. **Probative value filter (Layer 2)** (with validation)
    - Implement `filterEvidenceByProbativeValue()`
    - Test on 20 historical jobs
    - Manual review of filtered items
    - Adjust thresholds if FP rate > 5%
    - Owner: Claude Sonnet 4.5
    - Risk: Medium (may remove valid evidence)
    - Time: 8-10 hours

14. **Simple EvidenceScope clustering** (Opportunity 6)
    - Implement `clusterEvidenceByScope()`
    - Integrate into `refineScopesFromEvidence()`
    - Test on multi-scope analyses
    - Owner: Claude Sonnet 4.5
    - Risk: Low
    - Time: 3-4 hours

15. **Add `sourceType` to EvidenceScope** (split into sub-phases per Risk 5)
    - Phase 2.0a: Add optional field to schema
    - Phase 2.0b: Research source type detection prompts
    - Phase 2.0c: Implement prompt updates with A/B testing
    - Phase 2.0d: Enable by default after validation
    - Owner: Claude Sonnet 4.5 (2.0a, 2.0b) → Claude Opus 4.5 (2.0c, 2.0d)
    - Risk: Medium (prompt engineering)
    - Time: 12-16 hours total

16. **Phase 2.0 validation gate**
    - [ ] Probative filter FP rate < 5%
    - [ ] EvidenceScope clustering improves context detection
    - [ ] `sourceType` populated in >70% of extractions
    - [ ] Baselines re-measured, show improvement
    - [ ] Git committed: "Phase 2: Evidence entity enhancements"
    - Time: 4 hours review + testing

**Total Phase 2.0**: 35-44 hours (1 week)

---

#### **Phase 2.1: Gradual Migration (1-2 months, spread over feature work)**

17. **Migrate files to use `EvidenceItem` type**
    - Update 3-5 files per week during regular feature work
    - Priority: New code first, then modified files
    - Owner: All developers
    - Risk: Low
    - Time: Distributed

18. **Category value migration monitoring**
    - Monitor LLM outputs: % outputting "direct_evidence" vs "evidence"
    - Goal: >90% using "direct_evidence"
    - Owner: Automated monitoring
    - Time: Passive

---

#### **Phase 3: Full Migration (v3.0 release, 3-6 months)**

19. **EvidenceClaimLink implementation** (with revised estimate)
    - Detailed sub-task breakdown (create separate doc)
    - Aggregation logic rewrite: 5-7 days
    - Database migration: 2-3 days
    - Testing: 5-7 days
    - UI updates: 3-4 days
    - Owner: Claude Opus 4.5 (architect) + team
    - Risk: High
    - Time: **15-20 days** (revised from 5-10)

20. **Full rename: `ExtractedFact` → `EvidenceItem`**
    - Remove type alias
    - Update all files (mechanical)
    - JSON field migration strategy
    - Owner: Team
    - Risk: Medium
    - Time: 12-16 hours

21. **Remove legacy category value "evidence"**
    - Remove from type union
    - Validate no LLMs still output it
    - Owner: Claude Sonnet 4.5
    - Risk: Low (after migration period)
    - Time: 1 hour

---

## Updated Risk Register

| Risk ID | Risk | Phase | Severity | Mitigation Status | Owner |
|---------|------|-------|----------|-------------------|-------|
| R1 | Category rename coordination failure | 1.5-2 | HIGH | ✅ MITIGATED (dual parsing) | CS 4.5 |
| R2 | claimDirection optional→required | 1.5-2 | MEDIUM | ✅ MITIGATED (telemetry first) | CS 4.5 |
| R3 | Uncommitted changes conflict | Immediate | MEDIUM | ✅ RESOLVED (commit now) | Any |
| R4 | probativeValue schema timing | 1.5 | LOW | ✅ CLARIFIED (add as optional) | CS 4.5 |
| R5 | EvidenceScope sourceType prompts | 2.0c-d | MEDIUM | 🔄 PLANNED (split sub-phases) | CO 4.5 |
| R6 | EvidenceClaimLink migration unclear | 3 | HIGH | 🔄 PLANNED (revised estimate) | CO 4.5 |
| R7 | Phase boundary dependencies | 1-2 | MEDIUM | ✅ MITIGATED (explicit gates) | Reviewer |
| R8 | Success metrics no baseline | 1.5 | LOW | ✅ RESOLVED (measure in 1.5) | CS 4.5 |
| R9 | Vague phrase detection complexity | 2.2 | LOW | 🔄 DEFERRED (experimental) | CS 4.5 |
| R10 | Probative filter false positives | 2.0 | MEDIUM | ✅ MITIGATED (validation gate) | CS 4.5 |
| R11 | Multi-agent coordination | All | MEDIUM | ✅ RESOLVED (clear ownership) | Plan coord |
| R12 | Regression report scope unknown | 1 | LOW | 🔄 PLANNED (audit task) | GPT 5.2 |

**Risk Mitigation Rate**: 8/12 resolved or mitigated, 4/12 planned

---

## Immediate Action Items (Next 2 Hours)

### For Claude Sonnet 4.5 (Me)

1. **Commit GPT 5.2 High's work** ✅ TOP PRIORITY
   ```bash
   git add apps/web/src/app/jobs/[id]/page.tsx
   git add apps/web/src/lib/analyzer/orchestrated.ts
   git add apps/web/src/lib/analyzer/types.ts
   git commit -m "Phase 1 progress: Evidence terminology in comments, prompts, UI labels

   Changes by GPT 5.2 High:
   - Added comprehensive JSDoc to ExtractedFact interface
   - Updated prompt section headers: FACTS → EVIDENCE
   - Updated UI labels: Facts Extracted → Evidence Extracted
   - Added legacy field name notes throughout

   Remaining Phase 1 work: prompt files, UI components, regression report"
   ```

2. **Add optional fields** (Opportunity 1)
   - Edit `types.ts`, add `probativeValue?` and `extractionConfidence?`
   - Commit: "Add optional quality fields (probativeValue, extractionConfidence)"

3. **Dual category parsing** (Opportunity 3)
   - Edit `types.ts`, add `"direct_evidence"` to category union
   - Commit: "Support both 'evidence' and 'direct_evidence' category values"

4. **EvidenceScope comments** (Opportunity 7)
   - Edit `types.ts`, add clarifying comments to `geographic` and `temporal`
   - Commit: "Clarify EvidenceScope.geographic/temporal field meanings"

### For Plan Coordinator

5. **Update main plan document**
   - Incorporate this risk analysis
   - Update Phase 1.5 section with immediate actions
   - Revise Phase 3 estimate (15-20 days)
   - Add explicit phase gates

### For Human Reviewer

6. **Review and approve**
   - Review this risk analysis
   - Approve immediate actions (steps 1-4)
   - Decide on Phase 1 completion ownership (GPT 5.2 High vs Claude Sonnet 4.5)

---

## Success Criteria (Revised)

### Phase 1 Success
- ✅ Zero "Fact" references in user-facing text (except legacy field names)
- ✅ All code has clarifying comments with "(legacy field name)" notes
- ✅ Developers understand terminology distinction
- ✅ Uncommitted changes resolved
- ✅ Optional quality fields added

### Phase 1.5 Success
- ✅ Probative value extracted by LLM (>80% of items rated)
- ✅ claimDirection missing rate < 5%
- ✅ Baselines measured and documented
- ✅ Category prompts output "direct_evidence"
- ✅ All Phase 1.5 validations passed

### Phase 2 Success
- ✅ Probative filter FP rate < 5%
- ✅ `EvidenceItem` type used in 30%+ of codebase
- ✅ Context detection accuracy improved by 10-15%
- ✅ `sourceType` populated in 70%+ of extractions
- ✅ No regression in verdict quality

### Phase 3 Success
- ✅ `EvidenceClaimLink` model implemented
- ✅ Verdict aggregation uses rich linkage
- ✅ Old job results still parse correctly
- ✅ Category "evidence" removed (only "direct_evidence")
- ✅ All TypeScript uses `EvidenceItem` (no `ExtractedFact`)

---

## Conclusion

The terminology migration plan is **architecturally excellent** but needs **execution discipline** to succeed. The revised order:

1. **Immediate wins** (32 min): Commit, add optional fields, dual parsing, comments
2. **Phase 1 completion** (6-8 hours): Finish comments and labels
3. **Phase 1.5** (2 days): Risk mitigation and validation
4. **Phase 2** (1 week core + 1-2 months gradual): Enhancements and migration
5. **Phase 3** (15-20 days): Full migration with EvidenceClaimLink

This revised plan:
- ✅ Reduces risk through incremental validation
- ✅ Provides clear phase gates
- ✅ Captures low-hanging fruit immediately
- ✅ Clarifies ownership and coordination
- ✅ Sets realistic timelines

**Recommendation**: Proceed with immediate actions (steps 1-4), then pause for human review before continuing with Phase 1 completion.

---

**Document Version**: 1.0
**Next Review**: After Phase 1.5 completion
