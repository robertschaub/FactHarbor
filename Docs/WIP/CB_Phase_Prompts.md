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

## Phase 3: UI Adaptation + AC UI Cleanup

**Tool:** Claude Code (VS Code)
**Model:** Sonnet
**Time estimate:** 2-3 hours
**Captain action after:** Review UI changes, then: `git tag cb-phase3-ui`

```
As Senior Developer, execute Phase 3 of the ClaimBoundary Pipeline implementation.

Read these files first:
- Docs/WIP/CB_Execution_State.md (current state — verify Phase 2 complete)
- Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md §15 Phase 3, §18 Q9/Q10, §22.1
- Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md §22.3.2 (confusion prevention)
- apps/web/src/app/jobs/[id]/page.tsx (current UI — read AC display logic)
- apps/web/src/app/jobs/[id]/components/ClaimsGroupedByContext.tsx (to be replaced)
- apps/web/src/lib/analyzer/claimboundary-pipeline.ts (new resultJson schema)

## CONTEXT
The ClaimBoundary pipeline is now the default. The UI still displays results using
the old AnalysisContext schema (analysisContexts, contextId, ClaimsGroupedByContext).
The new resultJson uses claimBoundaries, claimVerdicts with boundaryFindings[], and
coverageMatrix. The UI must be updated to consume the new schema.

## TASK

### Step 1: Build new BoundaryFindings display (commit separately)

1. Create apps/web/src/app/jobs/[id]/components/BoundaryFindings.tsx:
   - Inline boundary findings within each claim verdict card (NOT separate tabs)
   - Each BoundaryFinding shows: boundary name, direction icon (✓/✗/⚖),
     truthPercentage, evidenceCount, confidence
   - Direction icons: ✓ for supporting, ✗ for refutes, ⚖ for mixed/contextual
   - Compact layout: one row per boundary within the claim card

2. Boundary suppression logic (§18 Q10):
   - If result has ≤ 2 boundaries: do NOT show boundary breakdown
   - Only show BoundaryFindings when boundaries.length > 2
   - Always show EvidenceScope tooltips regardless of boundary count

3. Hybrid tooltip (§18 Q10):
   - In boundary rows: show compact inline metadata (evidence count + temporal range)
   - On hover: full EvidenceScope details (methodology, boundaries, geographic, temporal)

4. Optional claim grouping (§18 Q1):
   - If UCM `ui.enableClaimGrouping` is true AND claims.length >= 4:
     show accordion grouping for claims (group labels from CLAIM_GROUPING prompt)
   - Default: off (flat list of claim verdicts)

Commit: feat(claimboundary): BoundaryFindings UI component
Run: npm run build && npm test — MUST PASS

### Step 2: Update page.tsx for CB resultJson (commit separately)

1. Update apps/web/src/app/jobs/[id]/page.tsx:
   - Read `result?.claimBoundaries` instead of `result?.analysisContexts`
   - Read `result?.claimVerdicts` (CB format with boundaryFindings[])
   - Remove `hasMultipleContexts` logic → replace with boundary count check
   - Remove `contextAnswers` display → replace with per-claim verdict display
   - Use new BoundaryFindings component for each claim verdict card
   - Update tooltip text: replace "AnalysisContext" explanations with "ClaimBoundary"
   - Keep backward compatibility: if old-format result (has analysisContexts),
     fall back to legacy display (some jobs may have old results in DB)

Commit: feat(claimboundary): update job results page for CB schema
Run: npm run build && npm test — MUST PASS

### Step 3: Cleanup 3a — delete AC UI code (commit separately)

1. Delete apps/web/src/app/jobs/[id]/components/ClaimsGroupedByContext.tsx (154 lines)
2. Remove its import from page.tsx (if not already removed in Step 2)
3. Verify no other files import ClaimsGroupedByContext

Commit: refactor(claimboundary): delete ClaimsGroupedByContext component
Run: npm run build && npm test — MUST PASS

Update CB_Execution_State.md after each step.

## ACCEPTANCE CRITERIA
- npm run build passes after EVERY step
- npm test passes after EVERY step
- New BoundaryFindings component renders claim verdicts with boundary details
- Boundary display suppressed for ≤ 2 boundaries
- ClaimsGroupedByContext.tsx deleted
- page.tsx has no analysisContexts references (except backward-compat fallback)
```

---

## Phase 3b: Monolithic Dynamic — Prompt Layer Cleanup

**Tool:** Claude Code (VS Code)
**Model:** Sonnet
**Time estimate:** 1-2 hours
**Captain action after:** Review changes, then: `git tag cb-phase3b-monolithic`

```
As Senior Developer, execute Phase 3b of the ClaimBoundary Pipeline implementation.

Read these files first:
- Docs/WIP/CB_Execution_State.md (current state)
- Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md §15 Phase 3b
- Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md §22.3.2 (confusion prevention)
- apps/web/src/lib/analyzer/monolithic-dynamic.ts (the MD pipeline — 780 lines)
- apps/web/src/lib/analyzer/prompts/prompt-builder.ts (check who consumes base prompts)

## CONTEXT
After Phase 2a deleted orchestrated.ts, several prompt infrastructure files may be
dead code. Monolithic Dynamic uses its OWN prompt file (monolithic-dynamic.prompt.md)
loaded via prompt-loader, NOT the base prompt files in prompts/base/. The base prompt
files were consumed by orchestrated.ts through prompt-builder.ts.

The ClaimBoundary pipeline uses its own prompts from claimboundary.prompt.md.

## TASK

### Step 1: Verify dead code — base prompt files (DO NOT DELETE YET)

Run a consumer analysis to confirm these files are only imported by prompt-builder.ts
and that prompt-builder's base prompt functions are NOT called by any active code:

Files to check:
  - apps/web/src/lib/analyzer/prompts/base/understand-base.ts (22 AC refs)
  - apps/web/src/lib/analyzer/prompts/base/verdict-base.ts (17 AC refs)
  - apps/web/src/lib/analyzer/prompts/base/extract-evidence-base.ts (10 AC refs)
  - apps/web/src/lib/analyzer/prompts/base/dynamic-analysis-base.ts (3 AC refs)
  - apps/web/src/lib/analyzer/prompts/base/dynamic-plan-base.ts (1 AC ref)

Verify: grep for all exported function names from these files across the codebase.
If they are ONLY imported by prompt-builder.ts, and prompt-builder's consuming
functions (buildSystemPrompt, buildBasePrompt, etc.) are NOT called by any active
code → they are dead code.

Also verify the provider adapter files:
  - apps/web/src/lib/analyzer/prompts/providers/openai.ts (18 AC refs)
  - apps/web/src/lib/analyzer/prompts/providers/mistral.ts (17 AC refs)
  - apps/web/src/lib/analyzer/prompts/providers/google.ts (16 AC refs)

Check if provider adapter functions with AC refs are called by any active code.

Report findings before proceeding.

### Step 2: Delete dead base prompt files (commit separately)

If Step 1 confirms they are dead code:
1. Delete the 5 base prompt files listed above
2. Remove their imports from prompt-builder.ts
3. Remove the dead functions from prompt-builder.ts that used them
   (keep detectProvider and any other functions still used by active code)
4. Fix any cascading import issues

Commit: refactor(claimboundary): delete orphaned base prompt files (53 AC refs removed)
Run: npm run build && npm test — MUST PASS

### Step 3: Clean provider adapter AC references (commit separately)

If Step 1 found dead AC code in provider adapters:
1. Remove AC-specific structured output schemas from provider files
2. Remove AC-specific prompt adaptation functions no longer called
3. Keep any functions still used by monolithic-dynamic or claimboundary pipeline

If the AC code in providers is still actively used by MD:
1. Update the AC terminology to CB terminology
2. Replace contextId → claimBoundaryId, analysisContexts → claimBoundaries in schemas

Commit: refactor(claimboundary): clean AC refs from provider adapters
Run: npm run build && npm test — MUST PASS

### Step 4: Update monolithic-dynamic.prompt.md (commit separately)

Read apps/web/prompts/monolithic-dynamic.prompt.md and check for AC terminology.
If found: update AnalysisContext references to ClaimBoundary terminology.

Also check prompt infra files for remaining AC refs:
  - apps/web/src/lib/analyzer/prompts/config-adaptations/tiering.ts
  - apps/web/src/lib/analyzer/prompts/config-adaptations/structured-output.ts
  - apps/web/src/lib/analyzer/prompts/prompt-testing.ts

Clean any AC refs in these files.

Commit: refactor(claimboundary): update MD prompts and prompt infra for CB terminology
Run: npm run build && npm test — MUST PASS

### Step 5: Update monolithic-dynamic.prompt.test.ts (commit with Step 4 or separately)

Update test/unit/lib/analyzer/monolithic-dynamic-prompt.test.ts:
- Remove any AC schema assertions
- Update test expectations for CB terminology if prompt text changed

Commit: test(claimboundary): update MD prompt tests for CB terminology
Run: npm run build && npm test — MUST PASS

Update CB_Execution_State.md after each step.

## ACCEPTANCE CRITERIA
- npm run build passes after EVERY step
- npm test passes after EVERY step
- All orphaned prompt files deleted (if confirmed dead)
- grep "AnalysisContext" apps/web/src/lib/analyzer/prompts/ returns ZERO hits
- monolithic-dynamic.prompt.md has no AC terminology
```

---

## Phase 4: Final Sweep

**Tool:** Claude Code (Sonnet)
**Model:** Sonnet
**Time estimate:** 1-2 hours
**Captain action after:** Review changes, run verification grep, then: `git tag cb-phase4-ac-removed`

```
As Senior Developer, execute Phase 4 (final sweep) of the ClaimBoundary Pipeline.

Read these files first:
- Docs/WIP/CB_Execution_State.md (current state — verify Phase 3 + 3b complete)
- Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md §15 Phase 4
- Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md §22.3.2 (confusion prevention)

## CONTEXT
Phases 3 and 3b have been completed. The remaining AnalysisContext references should
be limited to: type definitions in types.ts, a few utility modules, exports in index.ts,
and scattered comments. This phase removes them all.

## TASK

### Step 0: Audit remaining AC references

Run these greps and report the FULL picture before making any changes:
  grep -r "AnalysisContext" apps/web/src/ --include="*.ts" --include="*.tsx"
  grep -r "contextId" apps/web/src/ --include="*.ts" --include="*.tsx"
  grep -r "analysisContexts" apps/web/src/ --include="*.ts" --include="*.tsx"

Categorize each hit as: type definition | active code | comment | export | test fixture.
This audit drives the remaining steps.

### Step 1: Cleanup 4a — remove AC from shared types (commit separately)

1. Delete from apps/web/src/lib/analyzer/types.ts:
   - AnalysisContext interface (~35 lines)
   - ContextVerdict interface
   - EnrichedAnalysisContext interface
   - AnalysisContextAnswer interface
   - Remove analysisContexts field from ClaimUnderstanding (if still present)
   - Remove analysisContexts field from ArticleAnalysis (if still present)
2. Remove AC type exports from apps/web/src/lib/analyzer/index.ts
3. Fix any compilation errors from removed types

Commit: refactor(claimboundary): delete AnalysisContext type definitions
Run: npm run build && npm test — MUST PASS

### Step 2: Cleanup 4b — remove AC from utility modules (commit separately)

Clean remaining AC references in utility files:
1. apps/web/src/lib/analyzer/confidence-calibration.ts:
   - Remove AnalysisContextAnswer import
   - Remove contextAnswers parameter (already made optional in Phase 2a — now delete it)
   - Update any callers
2. apps/web/src/lib/analyzer/evidence-recency.ts:
   - Remove AnalysisContext import
   - Remove/replace context type cast
3. apps/web/src/lib/analyzer/claim-importance.ts:
   - Remove contextId grouping if present
4. apps/web/src/lib/analyzer/metrics-integration.ts:
   - Remove AC metrics if present
5. apps/web/src/lib/analyzer/text-analysis-types.ts:
   - Update comment referencing AnalysisContext
6. apps/web/src/lib/config-schemas.ts:
   - Update description strings mentioning AC
7. apps/web/src/lib/analyzer/config.ts:
   - Update comment references

Commit: refactor(claimboundary): remove AC from utility modules and config
Run: npm run build && npm test — MUST PASS

### Step 3: Cleanup 4c — remaining files (commit separately)

1. Clean any remaining files found in Step 0 audit
2. Update apps/web/src/lib/analyzer/prompts/OUTPUT_SCHEMAS.md (10 AC refs)
3. Clean budgets.ts if it has contextId references
4. Clean quality-gates.ts if it has contextId references
5. Clean evidence-normalization.ts if it has contextId references
6. Update test fixtures in any remaining test files

Commit: refactor(claimboundary): final AC reference cleanup
Run: npm run build && npm test — MUST PASS

### Step 4: Verification

Run the final verification:
  grep -r "AnalysisContext" apps/web/src/ --include="*.ts" --include="*.tsx"
  grep -r "contextId" apps/web/src/ --include="*.ts" --include="*.tsx" | grep -v claimBoundaryId
  grep -r "analysisContexts" apps/web/src/ --include="*.ts" --include="*.tsx"

GOAL: Zero hits (except comments that say "formerly AnalysisContext" or similar
historical notes, and backward-compat fallback in page.tsx if it exists).

If any hits remain, clean them. Do NOT leave AC references in active code.

Also update governance docs:
- AGENTS.md: remove orchestrated.ts from Key Files, remove [BEING REPLACED] tags,
  update architecture diagram to remove orchestrated.ts line
- CLAUDE.md: remove orchestrated.ts references, remove [BEING REPLACED] tag,
  remove migration-in-progress note (migration is done)

Commit: docs(claimboundary): final governance doc update — migration complete
Run: npm run build && npm test — MUST PASS

Update CB_Execution_State.md: mark Phase 4 complete. Set Current Phase to
"MIGRATION COMPLETE — ClaimBoundary pipeline is the sole active pipeline."

## ACCEPTANCE CRITERIA
- npm run build passes after EVERY step
- npm test passes after EVERY step
- grep "AnalysisContext" across apps/web/src/ returns ZERO active code hits
- grep "contextId" across apps/web/src/ returns only claimBoundaryId-related hits
- AGENTS.md and CLAUDE.md updated to reflect completed migration
- CB_Execution_State.md shows all phases complete
```

### Phase 4 Review (Optional)

**Tool:** Claude Code (VS Code)
**Model:** Sonnet
**Role:** Code Reviewer

```
As Code Reviewer, perform the final ClaimBoundary migration verification.

Read: Docs/WIP/CB_Execution_State.md (verify Phase 4 complete)
Read: AGENTS.md (verify updated)

Review checklist:
1. Run: grep -r "AnalysisContext" apps/web/src/ --include="*.ts" --include="*.tsx"
   → ZERO active code hits (comments with "formerly" OK)
2. Run: grep -r "contextId" apps/web/src/ --include="*.ts" --include="*.tsx"
   → Only claimBoundaryId-related hits
3. Run: npm run build → PASS
4. Run: npm test → PASS
5. Verify AGENTS.md has no orchestrated.ts in Key Files
6. Verify CLAUDE.md has no "BEING REPLACED" or migration notes
7. Verify ClaimBoundary pipeline builds and tests pass
8. Verify monolithic-dynamic pipeline builds and tests pass

Report: PASS or FAIL with details. Do NOT fix issues — flag them.
Update CB_Execution_State.md with review outcome.
```

**Captain action:** If review passes → `git tag cb-phase4-ac-removed`

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
