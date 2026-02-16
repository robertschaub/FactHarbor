# ClaimBoundary Pipeline Implementation Plan — Review Prompt

**Document Purpose:** Review prompt for evaluating the ClaimBoundary pipeline implementation plan (Phases 5a-5k).

**Reviewer Role:** As Lead Architect or As Code Reviewer

**Documents to Review:**
1. `Docs/WIP/CB_Implementation_Plan_2026-02-17.md` (808 lines)
2. `Docs/WIP/CB_Implementation_Prompts.md` (1452 lines)
3. `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md` (reference spec)

**Review Context:**
- Migration Phases 0-4 are COMPLETE (AnalysisContext removed, ClaimBoundary infrastructure in place)
- Phase 5 (implementation) is being planned
- Plan was expanded to address: Monolithic Dynamic changes, comprehensive documentation, test coverage, and UI adaptations
- Total effort: 14-22 sessions (30-50 hours) over 3-4 weeks

---

## Review Checklist

### 1. Completeness: Are All Requirements Covered?

**Core Pipeline Implementation (Phases 5a-5e):**
- [ ] Stage 1 (extractClaims): Two-pass extraction with preliminary search, centrality filter, Gate 1 validation?
- [ ] Stage 2 (researchEvidence): Claim-driven iteration, EvidenceScope validation, sufficiency check, contradiction search?
- [ ] Stage 3 (clusterBoundaries): LLM clustering, coherence assessment, over-cap merge, evidence assignment?
- [ ] Stage 4 (generateVerdicts): Production LLM wrapper, tier selection, error handling?
- [ ] Stage 5 (aggregateAssessment): Triangulation, weighted average, VerdictNarrative, quality gates?

**Documentation (Phase 5g — REQUIRED):**
- [ ] Status docs: Current_Status.md, KNOWN_ISSUES.md, Backlog.md updates planned?
- [ ] xWiki pages: Architecture status, pipeline diagrams, testing strategy updates planned?
- [ ] Governance: AGENTS.md and CLAUDE.md updates (remove [NEW] tags, fix orchestrated refs)?
- [ ] Addresses V-03 through V-08 from final verification?

**Test Coverage (Phase 5h — optional but recommended):**
- [ ] Neutrality tests: Statement vs question pairs planned?
- [ ] Performance benchmarks: Time/cost targets defined?
- [ ] Adversarial tests: Opinion mix, conflicting evidence scenarios planned?
- [ ] Coverage report: ≥80% target for Stage 1-5 code?

**Cleanup (Phase 5i — REQUIRED):**
- [ ] V-01: Remove contextId from AnalysisWarning?
- [ ] V-09: Fix/remove 8 skipped budget tests?
- [ ] Final verification commands provided?

**Monolithic Dynamic (Phase 5j):**
- [ ] Correctly identifies MD as COMPLETE (no implementation needed)?
- [ ] Evidence provided that Phase 3b already updated MD?

**UI Adaptations (Phase 5k — REQUIRED):**
- [ ] Admin UI: All 24 CB parameters editable, organized by stage?
- [ ] Results page: Coverage matrix, verdictNarrative, qualityGates components planned?
- [ ] Triangulation scores in ClaimCard?
- [ ] xWiki diagrams: CB pipeline detail (new), system architecture (updated), obsolete docs marked?

### 2. Correctness: Is the Technical Approach Sound?

**Stage Implementation:**
- [ ] Stage 1 preliminary search: Should this be lightweight or full extraction? (Plan says lightweight)
- [ ] Stage 2 claim-driven targeting: Min-heap or sort by evidence count? (Plan says "find claim with fewest")
- [ ] Stage 3 boundary clustering: One LLM call or iterative? (Plan says one Sonnet call)
- [ ] Stage 4 LLM wiring: Uses `loadAndRenderSection()` pattern from monolithic-dynamic? ✓
- [ ] Stage 5 triangulation: Cross-boundary agreement logic matches architecture doc §8.5.2?
- [ ] Stage 5 weighted average: Reuses existing `aggregation.ts` functions? ✓

**Testing Strategy:**
- [ ] Neutrality tests: 4% tolerance is consistent with orchestrated tests? (Verify from git history)
- [ ] Performance benchmarks: Time/cost targets realistic? (60s/$0.30 for 1 claim seems reasonable)
- [ ] Test markers: All expensive tests marked `.skip()` to prevent accidental CI runs? ✓

**UI Design:**
- [ ] Admin UI: Uses existing UCM config API endpoints? (Plan references `/api/fh/config`)
- [ ] Coverage matrix heatmap: Color scheme (gray/yellow/green) intuitive? ✓
- [ ] Component integration: Uses existing page.tsx patterns (isCBSchema check)? ✓

**Documentation:**
- [ ] xWiki diagram creation: Uses Mermaid syntax? (Plan shows flowchart example)
- [ ] Obsolete doc marking: Clear warning at top of orchestrated pipeline detail? ✓

### 3. Feasibility: Can This Be Implemented?

**Effort Estimates:**
- [ ] Stage 1 (300-400 lines, 1-2 sessions): Realistic given two-pass extraction + search + Gate 1?
- [ ] Stage 2 (500-600 lines, 2-3 sessions): Realistic given iteration loop + extraction + filtering?
- [ ] Stage 3 (200-250 lines, 1-2 sessions): Realistic given LLM clustering + deterministic validation?
- [ ] Stage 4 (80-100 lines, 1 session): Realistic given it's mostly LLM wrapper boilerplate?
- [ ] Stage 5 (300-400 lines, 2 sessions): Realistic given triangulation + weighted avg + VerdictNarrative?
- [ ] Total 1500-1850 lines over 10-15 sessions: Does this align with Stage complexity?

**Dependencies:**
- [ ] Are stage dependencies clearly stated? (1→2→3→4→5 sequential)
- [ ] Are reusable modules identified? (web-search, retrieval, evidence-filter, aggregation, source-reliability)
- [ ] Are UCM prompts verified to exist? (All 8 CB prompts seeded in Phase 1c ✓)

**Risk Mitigation:**
- [ ] LLM prompt quality issues: Mitigated by UCM prompt editing (no code changes)?
- [ ] Budget overruns: Mitigated by UCM-configurable limits?
- [ ] Integration failures: Mitigated by mocked tests per stage before integration?
- [ ] Performance: Optimization deferred to after functional correctness? ✓
- [ ] Schema mismatches: Validated against existing `resultJson` schema in claimboundary-pipeline.ts?

### 4. Clarity: Are the Prompts Actionable?

**Prompt Quality (CB_Implementation_Prompts.md):**
- [ ] Each phase has clear role assignment? (Senior Developer, LLM Expert, Code Reviewer, Technical Writer)
- [ ] Prerequisite reading lists complete? (Architecture doc, plan doc, relevant source files)
- [ ] Implementation requirements: Step-by-step with code snippets where helpful?
- [ ] Testing strategies: Clear guidance on what to test and how?
- [ ] Verification steps: Build, test, manual checks specified?
- [ ] Commit message format: Includes conventional commit type, summary, details, co-author?
- [ ] Handover instructions: Update CB_Execution_State.md after each phase?

**Code Examples:**
- [ ] Phase 5a prompt: Shows LLM call pattern, preliminary search flow?
- [ ] Phase 5b prompt: Shows iteration loop structure, evidence extraction pattern?
- [ ] Phase 5c prompt: Shows clustering output schema, validation logic?
- [ ] Phase 5d prompt: Shows `createProductionLLMCall()` function signature and implementation?
- [ ] Phase 5e prompt: Shows triangulation scoring calculation, VerdictNarrative LLM call?
- [ ] Phase 5h prompt: Shows complete test file structure for neutrality/performance/adversarial?
- [ ] Phase 5k prompt: Shows React component structure for coverage matrix, verdictNarrative, qualityGates?

**Anti-Patterns Avoided:**
- [ ] No "figure it out yourself" gaps in critical logic?
- [ ] No ambiguous requirements (e.g., "improve performance" without metrics)?
- [ ] No missing error handling guidance?
- [ ] No assumption that agent knows project patterns (patterns explicitly referenced)?

### 5. Alignment: Does This Match Architecture Doc?

**Cross-Reference Checks:**
- [ ] Stage 1: Matches §8.1 (Two-Pass Extraction with Evidence Grounding)?
- [ ] Stage 2: Matches §8.2 (Claim-Driven Evidence Research with Sufficiency Targeting)?
- [ ] Stage 3: Matches §8.3 (EvidenceScope Clustering into ClaimBoundaries)?
- [ ] Stage 4: Matches §8.4 (5-Step Verdict Debate per Boundary)?
- [ ] Stage 5: Matches §8.5 (Cross-Boundary Aggregation with Triangulation)?
- [ ] UCM config: All 24 parameters from §13.1 included in Phase 5k UI?
- [ ] Deferred items: Matches architecture doc §20 (Gate 1 retry, CLAIM_GROUPING, derivative detection)?

**Terminology Consistency:**
- [ ] Uses `ClaimBoundary` not `AnalysisContext`?
- [ ] Uses `AtomicClaim` not `ClaimUnderstanding.claim`?
- [ ] Uses `EvidenceScope` not `context` or `scope`?
- [ ] Uses `BoundaryFinding` not `ContextVerdict`?
- [ ] Uses `CBClaimVerdict` not `ClaimVerdict` (to distinguish from orchestrated)?

**Quality Gates:**
- [ ] Gate 1 (Stage 1): Opinion + specificity checks match architecture §8.1.5?
- [ ] Gate 4 (Stage 5): Confidence classification (high/medium/low) matches §8.5.7?
- [ ] No reference to Gate 2 or Gate 3 (not used in CB pipeline)?

### 6. Execution Order: Is the Sequence Logical?

**Sequential Dependencies:**
- [ ] Phase 5a before 5b: Stage 1 must complete before Stage 2 (preliminary evidence)?
- [ ] Phase 5b before 5c: Stage 2 must complete before Stage 3 (EvidenceScopes populated)?
- [ ] Phase 5c before 5d: Stage 3 must complete before Stage 4 (boundaries exist)?
- [ ] Phase 5d before 5e: Stage 4 must complete before Stage 5 (claim verdicts exist)?
- [ ] Phase 5g after 5e: Documentation updates reference completed implementation?
- [ ] Phase 5i after 5g: Final cleanup verifies documentation done?
- [ ] Phase 5k after 5e: UI needs working CB pipeline to test against?

**Parallel Opportunities:**
- [ ] Phase 5f (integration tests) can run in parallel with 5g (docs) — but plan shows sequential?
- [ ] Phase 5h (test coverage) can run in parallel with 5k (UI) — but plan shows sequential?
- [ ] Is sequential execution preference justified? (Plan notes: avoid integration issues)

**Milestone Markers:**
- [ ] Week 1: Stages 1-3 complete → pipeline can extract, research, cluster?
- [ ] Week 2: Stages 4-5 complete → full pipeline functional?
- [ ] Week 2-3: Docs, tests, UI complete → production-ready?

### 7. Success Criteria: Are Exit Conditions Clear?

**Core Implementation (5a-5e):**
- [ ] No `throw new Error` stubs remain?
- [ ] 100+ new unit tests pass?
- [ ] Build and safe tests pass?
- [ ] At least 1 end-to-end analysis run successful?
- [ ] Schema version `3.0.0-cb` validated?

**Documentation (5g):**
- [ ] All status docs updated?
- [ ] All xWiki pages updated?
- [ ] All governance docs updated?
- [ ] V-03 through V-08 resolved?

**Testing (5h — optional):**
- [ ] Neutrality tests created or deferred documented?
- [ ] Performance benchmarks recorded or deferred documented?
- [ ] Adversarial tests created or deferred documented?
- [ ] Coverage ≥80% or gaps documented?

**Cleanup (5i):**
- [ ] V-01 through V-09 all resolved?
- [ ] Zero AC/contextId refs in active code?
- [ ] Zero skipped tests or skips documented?

**UI (5k):**
- [ ] All 24 CB parameters editable in admin UI?
- [ ] All report components display correctly?
- [ ] All diagrams updated?
- [ ] Manual UI testing complete?

**Production Readiness:**
- [ ] Performance baseline established?
- [ ] Error handling complete?
- [ ] Quality baseline: 5+ human-reviewed analyses?
- [ ] Known issues documented?

### 8. Risks & Gaps: What Could Go Wrong?

**Potential Issues:**
- [ ] **Stage 1 preliminary search**: If preliminary evidence is poor quality, does Pass 2 have enough context?
  - Mitigation in plan: Preliminary search is lightweight, Pass 2 can still extract without it
- [ ] **Stage 2 iteration budget**: If maxResearchIterations is too low, will claims have sufficient evidence?
  - Mitigation in plan: UCM-configurable, start conservative and tune up
- [ ] **Stage 3 clustering quality**: If LLM returns incoherent boundaries, does fallback handle it?
  - Mitigation in plan: Fallback to single "General" boundary if clustering fails
- [ ] **Stage 4 LLM failures**: If verdict LLM call fails mid-debate, what happens?
  - Mitigation in plan: Fail fast (no fallback) for v1 — verdict quality is critical
- [ ] **Stage 5 triangulation**: If only 1 boundary exists, is penalty applied correctly?
  - Check: Plan mentions singleBoundaryPenalty (-0.10) applied — ✓
- [ ] **UI state management**: If admin UI config changes don't persist, how to debug?
  - Gap: No debugging guidance in Phase 5k prompt
- [ ] **xWiki diagram complexity**: If diagrams are too detailed, will they be maintainable?
  - Gap: No guidance on diagram complexity/level of detail

**Missing Considerations:**
- [ ] Backward compatibility: Old CB jobs (schema 3.0.0-cb from skeleton) vs new jobs (with Stage 1-5 data)?
  - Note: CB pipeline is new, no old jobs exist yet — not a concern
- [ ] Migration path: If Stage 1-3 are implemented but 4-5 fail, can partial pipeline run?
  - Gap: No partial pipeline fallback specified
- [ ] Multi-language support: Do prompts need translation for non-English inputs?
  - Note: Architecture doc §7 says multilingual by design — prompts already generic
- [ ] Rate limiting: If LLM provider rate-limits during Stage 2 (8-12 calls), does retry logic exist?
  - Gap: No retry logic specified in prompts
- [ ] Config validation: If admin UI allows invalid config (e.g., claimSpecificityMinimum = 2.0), does server reject it?
  - Covered: UCM schemas (config-schemas.ts) validate server-side ✓

### 9. Documentation Quality: Are Plan Docs Well-Structured?

**CB_Implementation_Plan_2026-02-17.md:**
- [ ] Clear executive summary at top?
- [ ] Current state clearly documented (what exists vs what's missing)?
- [ ] Sequential strategy explained and justified?
- [ ] Each phase has: owner, deliverables, checklist, dependencies, estimated effort?
- [ ] Risk mitigation for each identified risk?
- [ ] Success criteria for each phase and overall?
- [ ] Deferred items list (v1.1+) present?

**CB_Implementation_Prompts.md:**
- [ ] One ready-to-paste prompt per phase?
- [ ] Each prompt: role, prerequisites, task, requirements, testing, verification, commit format, handover?
- [ ] Code examples indented/formatted correctly?
- [ ] Prompts reference correct line numbers (or "~line" for approximate)?
- [ ] Final checklist for Captain review present?

**Cross-References:**
- [ ] Plan doc references prompts doc?
- [ ] Prompts doc references plan doc?
- [ ] Both reference architecture doc?
- [ ] Both reference CB_Execution_State.md?

### 10. Review Output: What Should Reviewers Deliver?

**Required Outputs:**
1. **APPROVE** or **REJECT** verdict with clear reasoning
2. **Blocking issues** (must fix before proceeding) — numbered B-01, B-02, etc.
3. **Non-blocking suggestions** (improvements, not blockers) — numbered S-01, S-02, etc.
4. **Effort estimate validation**: Is 14-22 sessions (30-50 hours) realistic?
5. **Risk assessment**: Are mitigations sufficient or do additional risks need addressing?
6. **Execution recommendation**: Should phases run sequentially as planned, or are there safe parallelization opportunities?

**Output Format:**
```markdown
# ClaimBoundary Implementation Plan Review

**Reviewer:** [Name/Role]
**Review Date:** [YYYY-MM-DD]
**Verdict:** APPROVE / APPROVE WITH CONDITIONS / REJECT

## Summary
[2-3 sentence overall assessment]

## Blocking Issues (must fix before execution)
- **B-01**: [Issue description]
  - Location: [File, section, or line]
  - Impact: [Why this blocks execution]
  - Fix: [Suggested resolution]

## Non-Blocking Suggestions (improvements)
- **S-01**: [Suggestion description]
  - Location: [File, section]
  - Benefit: [Why this would improve the plan]
  - Fix: [Suggested enhancement]

## Effort Estimate Assessment
- Estimated: 14-22 sessions (30-50 hours)
- Realistic: YES / NO / PARTIAL
- Reasoning: [Why estimate is or isn't realistic]

## Risk Assessment
- Identified risks: [Count]
- Mitigations adequate: YES / NO / PARTIAL
- Additional risks: [Any risks not covered in plan]

## Execution Recommendation
- Sequential execution: AGREE / DISAGREE
- Parallel opportunities: [List any safe parallel phases]
- Start with: [Which phase should begin first]

## Conclusion
[Final recommendation: proceed as-is, proceed with fixes, or revise plan]
```

---

## Example Review Issues

**Example Blocking Issue:**
```
B-01: Stage 2 lacks retry logic for LLM extraction failures
  - Location: CB_Implementation_Prompts.md Phase 5b, Step 2g
  - Impact: If LLM fails during evidence extraction (network error, timeout),
    iteration fails silently and research continues with incomplete evidence
  - Fix: Add error handling in prompt: "Wrap LLM extraction in try/catch.
    On failure, log error, skip source, continue to next source.
    If all sources fail, mark iteration as failed but don't abort pipeline."
```

**Example Non-Blocking Suggestion:**
```
S-01: Add guidance on LLM prompt iteration for poor quality extraction
  - Location: CB_Implementation_Plan.md Phase 5a
  - Benefit: If Pass 2 extraction quality is poor (too many/few claims, low specificity),
    developers may not know how to debug/improve prompts without code changes
  - Fix: Add note: "If extraction quality is poor, use UCM to edit CLAIM_EXTRACTION_PASS2
    prompt. Try adding examples, adjusting instructions, or changing temperature.
    Re-run test inputs and compare results before committing prompt changes."
```

---

## Final Reviewer Checklist

Before submitting review:
- [ ] Read both plan documents completely (808 + 1452 = 2260 lines)
- [ ] Verified all 10 review sections above
- [ ] Identified all blocking issues (if any)
- [ ] Provided constructive suggestions for improvements
- [ ] Validated effort estimates against complexity
- [ ] Assessed risk mitigations
- [ ] Recommended execution approach (sequential/parallel)
- [ ] Written clear, actionable review output

**When review complete:** Post review output to Captain and update `CB_Execution_State.md` with review entry.

---

**Document Version:** 1.0
**Created:** 2026-02-17
**Author:** Lead Architect (Claude Sonnet 4.5)
**Purpose:** Guide reviewers in evaluating CB implementation plan before execution begins
