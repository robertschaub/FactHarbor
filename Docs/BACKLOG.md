# FactHarbor Development Backlog

**Last Updated**: 2026-02-04
**Status**: Active backlog items extracted from WIP folder cleanup
**Owner**: Development Team

---

## Overview

This document consolidates all pending development tasks, proposals, and future work items. Items are prioritized P0 (Critical) through P3 (Low priority).

---

## P1: Edge Case Test Coverage

**Priority**: P1 (High)
**Estimated Effort**: 4-6 hours
**Status**: Backlog
**Risk**: Unknown behavior in production edge cases

### Description

Current test suite validates basic LLM behavior but lacks edge case coverage for:
- Ambiguous classifications (borderline high/medium harm)
- Conflicting evidence (scientific + pseudoscientific)
- Low-confidence LLM outputs
- Circular contestation scenarios
- Missing required fields

### Test Categories Required

1. **Harm Potential - Ambiguous Cases**
   - Economic harm to businesses (should be high/medium)
   - Reputational harm without specifics (should be medium/low)
   - Mental health claims (should be high)

2. **Factual Basis - Circular Contestation**
   - Entity cannot contest its own decision (must be marked "opinion" not "established")
   - Third party can provide documented counter-evidence

3. **Source Authority - Opinion vs Evidence**
   - Executive orders are opinion not evidence
   - Court rulings with documented findings are primary evidence
   - Dissenting opinions are opinion not evidence

4. **Evidence Basis - Mixed Quality**
   - Claims with both scientific and pseudoscientific evidence
   - Verdict should lean toward scientific evidence

5. **Missing Fields - Fallback Behavior**
   - Handles missing harmPotential with fallback
   - Handles missing factualBasis with fallback to unknown

### Implementation Location

Create `apps/web/test/unit/lib/analyzer/llm-classification-edge-cases.test.ts`

### Acceptance Criteria

- [ ] All 15+ edge case tests pass
- [ ] Coverage includes: ambiguous harm, circular contestation, opinion vs evidence, mixed quality, missing fields
- [ ] Tests run in CI/CD pipeline
- [ ] No unexpected failures in edge cases

### Related Documents

- [Post-Migration_Robustness_Proposals.md](ARCHIVE/Post-Migration_Robustness_Proposals.md) - Proposal 2

---

## P2: Classification Monitoring System

**Priority**: P2 (Medium)
**Estimated Effort**: 3-4 hours
**Status**: Backlog
**Risk**: No visibility into LLM classification behavior in production

### Description

Add telemetry and monitoring for LLM classification behavior to track fallback rates, classification distributions, and identify potential issues over time.

### Requirements

#### 1. Telemetry Collection

Track the following metrics per analysis:
- Total fallbacks by field (harmPotential, factualBasis, sourceAuthority, evidenceBasis, isContested)
- Fallback rate (fallbacks / total classifications attempted)
- Classification value distributions for each field
- Processing time and cost estimates

#### 2. Storage

**Recommended approach**: Extend existing `classificationFallbacks` in analysis result JSON, migrate to separate telemetry table if volume requires.

#### 3. Admin Endpoint

Create API endpoint for monitoring data:
```
GET /api/admin/classification-metrics?period=last_7_days
```

Response should include:
- Total analyses
- Fallback statistics by field
- Classification distributions
- Fallback rate trends

#### 4. Alerting (Optional)

Consider alerts when:
- Fallback rate exceeds 5%
- Classification distribution shifts significantly
- Specific field has unusually high fallback rate

### Implementation Approach

**Phase 1**: Data Collection (2 hours)
1. Extend `FallbackSummary` to include classification distributions
2. Add distribution tracking to normalization functions
3. Store in analysis result JSON

**Phase 2**: Admin Endpoint (1-2 hours)
1. Create `/api/admin/classification-metrics` endpoint
2. Aggregate data from recent analyses
3. Return summary statistics

**Phase 3**: Dashboard (Optional - Future)
1. Add classification metrics section to admin UI
2. Show trends over time
3. Highlight anomalies

### Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/lib/analyzer/classification-fallbacks.ts` | Add distribution tracking |
| `apps/web/src/lib/analyzer/orchestrated.ts` | Collect distributions during normalization |
| `apps/web/src/pages/api/admin/classification-metrics.ts` | NEW - Admin endpoint |
| Admin UI components | Display metrics (Phase 3, optional) |

### Acceptance Criteria

- [ ] Classification distributions tracked per analysis
- [ ] Admin endpoint returns aggregated metrics
- [ ] Fallback rate calculated correctly
- [ ] Documentation updated

### Related Documents

- [P2_Classification_Monitoring_Backlog.md](WIP/P2_Classification_Monitoring_Backlog.md) - Detailed specification
- [Post-Migration_Robustness_Proposals.md](ARCHIVE/Post-Migration_Robustness_Proposals.md) - Proposal 3

---

## P3: Confidence Scoring System

**Priority**: P3 (Low)
**Estimated Effort**: 3-4 hours
**Status**: Backlog - Deferred
**Risk**: Cannot identify low-confidence classifications that may need review

### Description

Add confidence fields to classification outputs and adjust aggregation logic to account for LLM uncertainty in borderline cases.

### Requirements

#### 1. Schema Updates

Add confidence fields to:
- `KeyFactor.factualBasisConfidence` (0-100)
- `Claim.harmPotentialConfidence` (0-100)
- `EvidenceItem.classificationConfidence` (0-100)

#### 2. Prompt Updates

Request confidence scores in all classification prompts:
- 90-100: Very confident, clear indicators
- 70-89: Confident, some ambiguity
- 50-69: Moderate confidence, borderline case
- 30-49: Low confidence, significant ambiguity
- 0-29: Very uncertain, insufficient information

If confidence < 50, prefer conservative classifications.

#### 3. Aggregation Adjustments

Reduce claim weights for low-confidence classifications:
- factualBasisConfidence < 50: reduce weight by 20%
- harmPotentialConfidence < 50: reduce weight by 10%

#### 4. Admin Flagging

Flag articles for human review when:
- High-harm claim has low-confidence classification (< 60)
- Multiple contested claims with low factualBasis confidence

### Acceptance Criteria

- [ ] All classifications include confidence scores
- [ ] Low-confidence cases flagged for review
- [ ] Aggregation weights adjusted for uncertainty
- [ ] Confidence distribution tracked in telemetry
- [ ] Prompts explicitly request confidence scores

### Future Enhancements

Full confidence-weighted aggregation system with probabilistic reasoning (Beta phase).

### Related Documents

- [Post-Migration_Robustness_Proposals.md](ARCHIVE/Post-Migration_Robustness_Proposals.md) - Proposal 4

---

## P3: Documentation System Improvements

**Priority**: P3 (Low)
**Estimated Effort**: 2-3 hours
**Status**: Backlog - Deferred
**Risk**: Team lacks complete understanding of LLM-based classification system

### Documentation Updates Needed

#### 1. Update: `Docs/ARCHITECTURE/Analyzer_Pipeline.md`

Remove references to pattern-based classification. Add comprehensive section on:
- LLM-based classification system
- Claim-level and evidence-level classifications
- Fallback strategy
- Explicitly state "No Pattern-Based Intelligence" with version references

#### 2. Create: `Docs/ARCHITECTURE/LLM_Classification_System.md`

Comprehensive guide covering:
- Overview of LLM-based classification
- Classification fields with examples and decision criteria
- Prompt engineering best practices
- Classification prompt structure
- Preventing over-classification with counter-examples
- Monitoring & quality control
- Telemetry and fallback behavior
- Comparison: Pattern-Based vs LLM-Based

#### 3. Update: `Docs/DEVELOPMENT/Testing_Guide.md`

Add section on testing LLM classifications:
- Edge case test suite location and coverage
- Running classification tests
- Template for new edge case tests

### Acceptance Criteria

- [ ] Architecture docs updated (no pattern references)
- [ ] LLM Classification System doc created
- [ ] Testing guide includes edge case examples
- [ ] Team trained on new system
- [ ] All docs reviewed and approved

### Related Documents

- [Post-Migration_Robustness_Proposals.md](ARCHIVE/Post-Migration_Robustness_Proposals.md) - Proposal 5

---

## Future Proposals: Shadow Mode & Vector DB

**Priority**: Future Research
**Status**: Design/Proposal Phase
**Estimated Effort**: Multiple weeks

### Shadow Mode: Self-Learning Prompt Optimization

**Description**: Self-learning system that analyzes how LLMs understand and respond to prompts, then proposes prompt improvements based on empirical evidence.

**Status**: Design document complete, awaiting prioritization

**Key Features**:
- Observes LLM behavior across thousands of cases
- Learns patterns of consistent vs inconsistent classifications
- Proposes prompt improvements (new examples, rephrasing, constraints)
- A/B tests prompt variations
- Measures improvement in consistency and quality

**Phases**:
1. **Phase 1: Logging** (0-4 weeks)
   - Implement ClassificationLog table in SQLite
   - Wire logging in text-analysis service layer
   - Define Shadow Mode analysis job runner

2. **Phase 2: Analysis** (1-3 months)
   - Build consistency analyzer
   - Build edge case detector
   - Build prompt element mapper
   - Generate improvement proposals

3. **Phase 3: Testing** (1-2 months)
   - Implement A/B testing framework
   - Validate prompt improvements
   - Deploy successful changes

**Related Documents**:
- [Shadow_Mode_Architecture.md](WIP/Shadow_Mode_Architecture.md)
- [Vector_DB_Assessment.md](WIP/Vector_DB_Assessment.md)

**Decision Criteria**: Proceed only after:
- P1 and P2 backlog items completed
- 3+ months of production LLM classification data collected
- Clear evidence of prompt improvement opportunities

### Vector Database Integration

**Description**: Optional embeddings store for offline analysis to improve similarity detection and clustering beyond exact text-hash matches.

**Status**: Assessment complete, deferred pending evidence of need

**Use Cases**:
- Consistency analyzer: group paraphrases and near-duplicates
- Edge case detector: cluster low-confidence cases
- Prompt element mapper: retrieve similar cases for evaluation
- A/B testing: assemble representative corpora via clustering

**Decision Criteria**: Proceed with vectors only if:
- Offline analyzers show meaningful volume of near-duplicates not captured by textHash
- Incremental lift in edge case detection justifies additional storage complexity

**Recommendation**: Stay SQLite-only initially, invest in prompt evaluation and A/B testing discipline.

**Related Documents**:
- [Vector_DB_Assessment.md](WIP/Vector_DB_Assessment.md)

---

## Completed Work (Archived)

The following items have been completed and moved to ARCHIVE:

### ✅ P0: Fallback Strategy (COMPLETE)
- **Status**: Implemented and deployed
- **Completion Date**: 2026-02-03
- **Details**: [P0_Implementation_Status.md](ARCHIVE/P0_Implementation_Status.md)

### ✅ Lexicon-to-LLM Migration (COMPLETE)
- **Status**: All 4 phases complete
- **Completion Date**: 2026-02-03
- **Details**: [lexicon-to-llm-migration.md](ARCHIVE/lexicon-to-llm-migration.md)

### ✅ Prompt Optimization v2.8.0-2.8.1 (COMPLETE)
- **Status**: All phases approved and deployed
- **Completion Date**: 2026-02-04
- **Details**: [Prompt_Optimization_Investigation.md](ARCHIVE/Prompt_Optimization_Investigation.md)

### ✅ Documentation Improvement Plan (COMPLETE)
- **Status**: Phases 1-4 complete
- **Completion Date**: 2026-02-04
- **Details**: [Documentation_Improvement_Plan_2026-02-03.md](ARCHIVE/Documentation_Improvement_Plan_2026-02-03.md)

---

## Priority Guidelines

**P0 (Critical)**: Must have for production readiness. Blocks deployment.
**P1 (High)**: Should have for quality assurance. Validates production behavior.
**P2 (Medium)**: Nice to have for observability. Enables monitoring and optimization.
**P3 (Low)**: Future enhancements. Improves system over time.

---

**Maintenance**: Review and update this backlog monthly. Move completed items to ARCHIVE with completion notes.
