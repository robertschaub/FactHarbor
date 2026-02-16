# ClaimBoundary Pipeline — Phase Prompt Playbook

> **For the Captain.** Copy-paste these prompts into the specified tool to launch each phase.
> Each prompt is self-contained: the agent reads the architecture doc and execution state to orient itself.

---

## Step 0: Rules Audit

**Tool:** Claude Code (VS Code)
**Model:** Opus
**Time estimate:** 30-60 min
**Captain action after:** Review changes, approve, then: `git tag cb-step0-rules-audit`

```
As Lead Architect, execute Step 0 of the ClaimBoundary Pipeline implementation.

Read these files first:
- Docs/WIP/CB_Execution_State.md (current state)
- Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md §22.3 (Step 0 details)

Your task:
1. Update AGENTS.md:
   - Add ClaimBoundary, AtomicClaim to terminology table
   - Add claimboundary-pipeline.ts, verdict-stage.ts to Key Files table
   - Mark orchestrated.ts as "being replaced by ClaimBoundary pipeline"
   - Update Architecture section with new pipeline file references
2. Update CLAUDE.md:
   - Add claimboundary-pipeline.ts to key files
   - Update "Primary data flow" to mention ClaimBoundary
3. Update Docs/AGENTS/Multi_Agent_Collaboration_Rules.md:
   - Add ClaimBoundary architecture doc to area-to-document mapping
   - Update role reading lists: add architecture doc for Lead Developer, Senior Developer, LLM Expert
4. Annotate xWiki Terminology page with "AnalysisContext is being replaced by ClaimBoundary" notice
5. Update CB_Execution_State.md: mark Step 0 complete, write handover entry

Commit: docs(claimboundary): Step 0 governance docs updated for CB pipeline
Verify: npm run build && npm test
Do NOT push. Do NOT start Phase 1.
```

---

## Phase 1: Pipeline + Types + Prompts

### Phase 1a: Types and Pipeline Skeleton

**Tool:** Claude Code (VS Code)
**Model:** Opus
**Time estimate:** 2-4 hours
**Captain action after:** Quick review of types and skeleton structure

```
As Senior Developer, execute Phase 1a of the ClaimBoundary Pipeline implementation.

Read these files first:
- Docs/WIP/CB_Execution_State.md (current state — verify Step 0 is complete)
- Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md §9 (types), §8 (stages), §15.2 (files to create)
- Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md §22.3.2 (confusion prevention rules)
- apps/web/src/lib/analyzer/evidence-filter.ts (pattern reference for new modules)

Your task:
1. Add new types to apps/web/src/lib/analyzer/types.ts:
   - AtomicClaim, ClaimBoundary, BoundaryFinding, ClaimVerdict (CB version), CoverageMatrix, VerdictNarrative
   - Per §9.1 type definitions exactly
2. Create apps/web/src/lib/analyzer/claimboundary-pipeline.ts:
   - Pipeline skeleton with Stage 1-5 function signatures
   - Main entry point: runClaimBoundaryAnalysis()
   - Import shared modules: evidence-filter, source-reliability, aggregation
   - Do NOT import from orchestrated.ts or analysis-contexts.ts
3. Create initial test file: test/unit/lib/analyzer/claimboundary-pipeline.test.ts
   - Test fixtures use CB types only
   - Skeleton tests for each stage

Commit: feat(claimboundary): add CB types and pipeline skeleton
Verify: npm run build && npm test
Update CB_Execution_State.md with progress.
```

### Phase 1b: Verdict Stage Module

**Tool:** Claude Code (VS Code)
**Model:** Opus
**Time estimate:** 2-3 hours

```
As Senior Developer, execute Phase 1b of the ClaimBoundary Pipeline implementation.

Read these files first:
- Docs/WIP/CB_Execution_State.md
- Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md §8.4 (verdict stage, all 5 steps)
- Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md §8.5 (aggregation formulas)
- apps/web/src/lib/analyzer/aggregation.ts (existing aggregation — reuse pattern)

Your task:
1. Create apps/web/src/lib/analyzer/verdict-stage.ts:
   - Step 1: advocateVerdict() — single Sonnet call, all claims
   - Step 2: selfConsistencyCheck() — 0 or 2 Sonnet calls, parallel with Step 3
   - Step 3: adversarialChallenge() — 1 Sonnet call, parallel with Step 2
   - Step 4: reconcileVerdicts() — 1 Sonnet call
   - Step 5: validateVerdicts() — 2 Haiku calls
   - Structural consistency check (deterministic)
   - Gate 4 confidence classification
   - Each step is an independently testable function
2. Wire verdict-stage into claimboundary-pipeline.ts Stage 4
3. Create test/unit/lib/analyzer/verdict-stage.test.ts
   - Mock LLM calls
   - Test each step independently
   - Test spread multiplier calculations (§8.5.5)

Commit: feat(claimboundary): verdict-stage module (5-step debate pattern)
Verify: npm run build && npm test
Update CB_Execution_State.md.
```

### Phase 1c: Prompts

**Tool:** Claude Code (VS Code)
**Model:** Opus
**Role:** LLM Expert
**Time estimate:** 2-3 hours

```
As LLM Expert, execute Phase 1c of the ClaimBoundary Pipeline implementation.

Read these files first:
- Docs/WIP/CB_Execution_State.md
- Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md §22.2 (UCM prompt registry)
- Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md §8.1 (extraction), §11 (clustering), §8.4 (verdict)
- Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md §22.3.2 (confusion prevention)
- AGENTS.md — Analysis Prompt Rules, String Usage Boundary

Your task:
1. Create apps/web/prompts/claimboundary.prompt.md with ALL pipeline prompts:
   - CLAIM_EXTRACTION_PASS1 (Haiku) — quick claim scan
   - CLAIM_EXTRACTION_PASS2 (Sonnet) — evidence-grounded extraction with groundingQuality
   - BOUNDARY_CLUSTERING (Sonnet) — congruence assessment with examples from §11.5
   - VERDICT_ADVOCATE (Sonnet) — boundary-organized evidence, "FIRST per-boundary, THEN synthesize"
   - VERDICT_CHALLENGER (Sonnet) — adversarial challenge prompt
   - VERDICT_RECONCILIATION (Sonnet) — final verdict incorporating challenges + consistency
   - VERDICT_NARRATIVE (Sonnet) — structured VerdictNarrative generation
   - CLAIM_GROUPING (Haiku) — optional post-verdict grouping for 4+ claims
2. Register all prompts in UCM (config-storage.ts)
3. All prompts MUST:
   - Be UCM-managed from day one (no inline strings)
   - Not assume English input
   - Use generic examples (no test-case terms)
   - Follow AGENTS.md Analysis Prompt Rules

Commit: feat(claimboundary): all pipeline prompts (UCM-managed)
Verify: npm run build && npm test
Update CB_Execution_State.md.
```

### Phase 1 Review

**Tool:** Claude Code (VS Code)
**Model:** Opus
**Role:** Code Reviewer

```
As Code Reviewer, review Phase 1 of the ClaimBoundary Pipeline implementation.

Read these files first:
- Docs/WIP/CB_Execution_State.md
- Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md §22.3.2 (confusion prevention)
- AGENTS.md — all rules

Review checklist:
1. AGENTS.md compliance: LLM Intelligence mandate, String Usage Boundary, terminology
2. No imports from orchestrated.ts, analysis-contexts.ts, evidence-context-utils.ts
3. All prompts UCM-managed (not inline strings)
4. No AnalysisContext/contextId in any new file
5. Test coverage for each pipeline stage and verdict-stage step
6. Type definitions match §9.1 exactly
7. Aggregation formula matches §8.5.4-8.5.5

Report findings. Do NOT fix issues — flag them for the Senior Developer.
Update CB_Execution_State.md with review outcome.
```

**Captain action:** If review passes → `git tag cb-phase1-pipeline`

---

## Phase 2: Cutover + First Cleanup

### Phase 2 Route Wiring

**Tool:** Claude Code (VS Code)
**Model:** Sonnet

```
As Senior Developer, execute Phase 2 route wiring for the ClaimBoundary Pipeline.

Read: Docs/WIP/CB_Execution_State.md (verify Phase 1 tagged)
Read: Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md §15 Phase 2

Your task:
1. Wire ClaimBoundary pipeline as default in apps/web/src/app/api/internal/run-job/route.ts
2. Define new resultJson schema (no AnalysisContext references)
3. Validate with a test job (if local API available) or verify build+test green

Commit: feat(claimboundary): wire CB pipeline as default route
Verify: npm run build && npm test
Update CB_Execution_State.md.
```

**Captain action:** `git tag cb-phase2-cutover` — this is the LAST POINT with old pipeline code

### Phase 2a-2c: Cleanup

**Tool:** Cline + GLM-5 (local worktree) OR Claude Code (Sonnet)

```
## MANDATORY CONTEXT
Read FIRST:
- /AGENTS.md (terminology, safety)
- /Docs/WIP/CB_Execution_State.md (current state)
- /Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md §22.3.2 (confusion prevention)

## TASK: Phase 2a — Delete unreachable orchestrated pipeline code

Step-by-step (commit after EACH step, verify build+test):

Step 1: Delete these files (they are no longer imported by any active code):
  - apps/web/src/lib/analyzer/orchestrated.ts (~13600 lines)
  - apps/web/src/lib/analyzer/analysis-contexts.ts (564 lines)
  - apps/web/src/lib/analyzer/evidence-context-utils.ts (86 lines)
  Fix any remaining imports in other files that referenced these.
  Commit: refactor(claimboundary): delete orchestrated pipeline + AC-only files
  Run: npm run build && npm test — MUST PASS

Step 2: Delete old prompt files:
  - apps/web/prompts/orchestrated.prompt.md
  - apps/web/prompts/orchestrated-compact.prompt.md
  - apps/web/src/lib/analyzer/prompts/base/orchestrated-understand.ts
  - apps/web/src/lib/analyzer/prompts/base/orchestrated-supplemental.ts
  - apps/web/src/lib/analyzer/prompts/base/context-refinement-base.ts
  Fix any remaining imports.
  Commit: refactor(claimboundary): delete orchestrated prompt files
  Run: npm run build && npm test — MUST PASS

Step 3: Remove AC config fields from:
  - apps/web/src/lib/config-schemas.ts (remove contextDetection*, contextDedupThreshold)
  - apps/web/src/lib/analyzer/config.ts (remove AC config accessors)
  Commit: refactor(claimboundary): remove AnalysisContext config fields
  Run: npm run build && npm test — MUST PASS

Step 4: Delete/update AC-only test files:
  - Delete test/unit/lib/analyzer/context-preservation.test.ts
  - Delete test/unit/lib/analyzer/adversarial-context-leak.test.ts
  - Update test/unit/lib/analyzer/confidence-calibration.test.ts (remove contextAnswers fixtures)
  Commit: test(claimboundary): remove AC-only tests, update mixed tests
  Run: npm run build && npm test — MUST PASS

Update Docs/WIP/CB_Execution_State.md after each step.

## ACCEPTANCE CRITERIA
- npm run build passes after EVERY step
- npm test passes after EVERY step
- grep -r "AnalysisContext" apps/web/src/lib/analyzer/orchestrated.ts returns "file not found"
```

**Captain action:** `git tag cb-phase2a-orchestrated-deleted`, `cb-phase2b-prompts-cleaned`, `cb-phase2c-config-cleaned`

### Phase 2 Docs

**Tool:** Claude Code (Sonnet) for xWiki rewrites, Cline/GLM-5 for batch updates

```
As Technical Writer, execute Phase 2 documentation updates for the ClaimBoundary Pipeline.

Read: Docs/WIP/CB_Execution_State.md
Read: Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md §22.3.4 Phase 2 docs
Read: Docs/AGENTS/TECH_WRITER_START_HERE.md
Read: Docs/AGENTS/GlobalMasterKnowledge_for_xWiki.md

Your task: Rewrite 5 PURE AC xWiki pages for ClaimBoundary:
1. Terminology page (81 AC refs) — replace AnalysisContext section with ClaimBoundary
2. Scope Definition Guidelines (63 refs) — rewrite AC vs EvidenceScope as CB vs EvidenceScope
3. Context Detection (31 refs) — rewrite as "Boundary Clustering" or archive with redirect
4. Context Detection Decision Tree (5 refs) — replace with boundary clustering decision logic
5. Context Detection Phases (3 refs) — replace with CB pipeline stage diagram

Also update:
- Docs/STATUS/Current_Status.md — mark Phase 2 complete
- Docs/STATUS/Backlog.md — mark Phase 2 steps done

Preserve xWiki 2.1 syntax. Use generic examples (no test-case terms).
Commit: docs(claimboundary): rewrite pure-AC xWiki pages for ClaimBoundary
Update CB_Execution_State.md.
```

---

## Phases 3, 3b, 4

(Same pattern — prompts follow the architecture doc §15 phases.
Each prompt references: CB_Execution_State.md, architecture doc section, confusion prevention rules.
Full prompts omitted for brevity — the pattern is established above.)

### Phase 3: UI

**Tool:** Claude Code (Sonnet) for BoundaryFindings component. Codex for ClaimsGroupedByContext replacement.
**Captain action:** `git tag cb-phase3-ui`

### Phase 3b: Monolithic Dynamic

**Tool:** Claude Code (Sonnet)
**Captain action:** `git tag cb-phase3b-monolithic`

### Phase 4: Final Sweep

**Tool:** Cline/GLM-5 for type cleanup + batch xWiki updates. Code Reviewer (Sonnet) for final review.
**Captain action:** `git tag cb-phase4-ac-removed`

---

## Captain Workflow (Your Part)

For each phase, your workflow is:

```
1. Open the right tool (Claude Code / Cline / Codex)
2. Paste the phase prompt from this file
3. Let the agent work
4. When done, quick check:
   - Did build + test pass? (agent should confirm)
   - Does CB_Execution_State.md look correct?
   - Any issues flagged?
5. If clean: git tag <tag-name>
6. Move to next phase prompt
```

**Estimated total Captain time: ~2-3 hours across all phases** (mostly waiting + quick reviews at tag points)
