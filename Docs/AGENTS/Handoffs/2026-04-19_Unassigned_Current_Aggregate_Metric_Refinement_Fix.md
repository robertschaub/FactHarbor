### 2026-04-19 | Unassigned | Codex (GPT-5) | Current Aggregate Metric Refinement Fix
**Task:** Implement the consolidated fix for the asylum current-total regression so the pipeline both preserves the comparative-ecosystem safeguards and restores strong handling of current aggregate metric claims such as `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`.

**Files touched:** `apps/web/prompts/claimboundary.prompt.md`, `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`, `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`, `apps/web/test/unit/lib/analyzer/primary-source-refinement.test.ts`, `Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Current_Aggregate_Metric_Refinement_Fix.md`, `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:** Kept the earlier comparative-ecosystem gating in `CLAIM_EXTRACTION_PASS1`, `CLAIM_EXTRACTION_PASS2`, and `GENERATE_QUERIES`, but added a positive contract for current aggregate metric claims instead of relying on exclusion alone. Stage 1 now carries `expectedEvidenceProfile.primaryMetric` and `componentMetrics`, Stage 2 query generation explicitly prioritizes the direct `primaryMetric` route before any component route, and Stage 4 verdict guidance now distinguishes between documented compositional synthesis and unsupported component arithmetic.

The research-loop change is intentionally narrow and generic. `research-orchestrator.ts` now treats the Stage-1 current-aggregate contract as a bounded refinement trigger **only while the direct primary metric is still missing**. It no longer fires refinement unconditionally for every such claim. Refinement is triggered when only component-rich or otherwise non-decisive official evidence is present, and skipped once a non-seeded evidence item already covers the direct `primaryMetric`.

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts test/unit/lib/analyzer/verdict-prompt-contract.test.ts test/unit/lib/analyzer/primary-source-refinement.test.ts test/unit/lib/analyzer/prompt-frontmatter-drift.test.ts`
- `npm -w apps/web run build`

Both passed. The build also refreshed the prompt seed in `apps/web/config.db` to `claimboundary` hash `62bd04e0...` before runtime restart.

**Warnings:** This fix improves the contract and the refinement trigger, but it does not prove behavioral success until a fresh exact-input rerun is inspected. If the next rerun still misses the decisive umbrella artifact, the next seam is likely Stage-2 acquisition/relevance behavior around official archive routes rather than another prompt rewrite.

**For next agent:** Judge the live fix on a clean rerun of `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz` after restart. Check whether Stage 1 emits `primaryMetric`, whether a refinement iteration runs only when the direct metric is still missing, and whether the rerun admits `stat-jahr-2025-kommentar-d.pdf` or an equivalent current SEM umbrella-total artifact instead of settling on category-only evidence.

**Learnings:** A negative exclusion rule is not enough for shared-path prompt hygiene when a benchmark depends on a very specific evidence shape. For current aggregate metric claims, the pipeline needs a positive cross-stage contract naming the decisive metric, the secondary component metrics, and the conditions under which components may or may not substitute for the direct metric.
