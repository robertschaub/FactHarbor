---
### 2026-04-15 | Lead Architect + LLM Expert | Codex (GPT-5) | Prompt Diagnosis 7333cb1f
**Task:** Run `/prompt-diagnosis` for `http://localhost:3000/jobs/7333cb1f1ee6472b9c782e94e4aa7b0e` and determine whether the visible report problem is a prompt defect.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-15_Lead_Architect_LLM_Expert_Prompt_Diagnosis_7333cb1f.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:**
- Treated `resultJson.meta.promptContentHash = f17e326e48536f4acc71de296ee5e22d3aa883cb3d07d5829f2bfa2486883bc9` as the primary prompt provenance anchor. Confirmed that `apps/web/config.db` has an active `prompt/claimboundary` row with the same hash and that runtime prompt loading is DB-backed via `loadPromptConfig()` and `loadPromptFile()`.
- Concluded that this is not prompt rollout drift and not a prompt schema/runtime failure. The job has no `analysisIssueCode`, no `analysisIssueMessage`, and no log evidence of parse/schema/contract failure.
- Concluded that the dominant root cause is retrieval/search-budget behavior. Active search runtime still uses `maxSourcesPerIteration = 8`, `relevanceTopNFetch = 5`, and search cache TTL `7d`. The job-minute log shows repeated 8-result relevance batches followed by capped fetch selection. Prior asylum-family investigation already established that the direct SEM 2025 commentary PDF never entered the retrieved source pool.
- Recorded one secondary prompt finding only: `F01`, `SYSTEMIC`, `P2`, `MEDIUM`, `INFERRED`, `BLOB-EXACT`. `GENERATE_QUERIES` lacks an explicit generic rule telling current aggregate-total claims to spend at least one query on direct primary-source totals, source-native archive/navigation pages, or official metric labels. That gap can amplify retrieval caps, but it does not explain the run by itself.
- Did not create or update `Docs/AGENTS/Prompt_Issue_Register.md`. The prompt-side evidence is real but still secondary to retrieval caps/cache/ranking, so I did not treat it as a durable register-grade prompt root cause yet.
**Open items:**
- If this class should be hardened, test a bounded generic query-generation change for current-total claims and a separate retrieval-budget experiment.
- Consider bypassing or tightening the 7-day search cache for current-statistics claims where stale ranking can suppress newly published primary sources.
- If higher confidence on `F01` is needed, rerun this input with only the prompt change while holding retrieval budgets constant.
**Warnings:**
- The job executed on dirty-state commit `c7a5ed7839e4e380fcb74812935fe94ca09dd2f4+b95e6294`; code-history reconstruction is approximate, though the prompt blob match is exact.
- No tests were run. This was diagnosis only.
- For these rows, reliable prompt provenance is in `ResultJson.meta.promptContentHash`, not the top-level `Jobs.PromptContentHash` column.
**For next agent:**
- High-signal refs are [claimboundary.prompt.md](/c:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md:63), [claimboundary.prompt.md](/c:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md:105), [claimboundary.prompt.md](/c:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md:628), [claimboundary.prompt.md](/c:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md:641), [research-query-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/research-query-stage.ts:53), [research-query-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/research-query-stage.ts:87), [research-orchestrator.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/research-orchestrator.ts:917), [research-orchestrator.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/research-orchestrator.ts:979), [search-cache.ts](/c:/DEV/FactHarbor/apps/web/src/lib/search-cache.ts:22), [config-loader.ts](/c:/DEV/FactHarbor/apps/web/src/lib/config-loader.ts:442), [prompt-loader.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/prompt-loader.ts:656), and [2026-04-15_LLM_Expert_Asylum_235000_Evidence_Gap_Investigation.md](/c:/DEV/FactHarbor/Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Asylum_235000_Evidence_Gap_Investigation.md:7).
- The comparable asylum job `9e8033b9b1ed4990b355f34437d97abc` used the same prompt hash `f17e326e...` but landed at `MOSTLY-TRUE 72`, which is why the prompt finding stayed secondary instead of becoming a primary prompt-regression claim.
**Learnings:** no

## Prompt-Diagnosis Report

`KNOWN-ISSUES: empty`

`JOB:` `7333cb1f1ee6472b9c782e94e4aa7b0e`  
`PROMPT HASH:` `f17e326e48536f4acc71de296ee5e22d3aa883cb3d07d5829f2bfa2486883bc9` `[COVERAGE: BLOB-EXACT]`  
`COMMIT:` `c7a5ed7839e4e380fcb74812935fe94ca09dd2f4` `[DIRTY-STATE: yes]`  
`INPUT:` `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`  
`VERDICT:` `LEANING-FALSE` `(truth: 35, confidence: 40, status: SUCCEEDED)`  
`ISSUE:` `none`

`STRUCTURED SIGNALS:`
- `analysisIssueCode = null`
- `analysisIssueMessage = null`
- No prompt/runtime-failure warning payload was present. The report only carried informational evidence-partition telemetry.

`LOG CORROBORATION:`
- [debug-analyzer.log](/c:/DEV/FactHarbor/apps/web/debug-analyzer.log:1708843) shows Stage 2 relevance classification on exactly `8` search results.
- [debug-analyzer.log](/c:/DEV/FactHarbor/apps/web/debug-analyzer.log:1708947), [debug-analyzer.log](/c:/DEV/FactHarbor/apps/web/debug-analyzer.log:1709045), [debug-analyzer.log](/c:/DEV/FactHarbor/apps/web/debug-analyzer.log:1709170), [debug-analyzer.log](/c:/DEV/FactHarbor/apps/web/debug-analyzer.log:1709292), and [debug-analyzer.log](/c:/DEV/FactHarbor/apps/web/debug-analyzer.log:1709384) show fetch selection capped at `topN=5`.
- No minute-window lines named a schema, parse, contract, or prompt-section failure.

`PROMPT RUNTIME STATE:`
- [claimboundary-pipeline.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claimboundary-pipeline.ts:381) records prompt usage at job start.
- [config-loader.ts](/c:/DEV/FactHarbor/apps/web/src/lib/config-loader.ts:442) resolves prompt config from the DB-backed unified config system.
- [prompt-loader.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/prompt-loader.ts:656) loads prompt content from `config_blobs`, not directly from the markdown file.
- `apps/web/config.db` currently has active `prompt/claimboundary = f17e326e...`, matching the job exactly.

`PROMPT / MODEL DIFFS:`
- No material prompt-drift evidence. The same prompt hash also appears on other asylum jobs with materially different outcomes, including `9e8033b9b1ed4990b355f34437d97abc` at `MOSTLY-TRUE 72`.
- The strongest repeated difference remains upstream retrieval composition, not prompt content.

`FINDINGS:`
- `[F01]` `P2` `MEDIUM` `INFERRED` - `claimboundary.prompt.md`, `GENERATE_QUERIES`
  `Observed:` Broad claim-level queries never targeted the direct official total/archive document path; the direct SEM 2025 commentary PDF is absent across the compared asylum-family jobs.
  `Cause:` [claimboundary.prompt.md](/c:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md:628) asks for targeted queries, but [claimboundary.prompt.md](/c:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md:641) still stops short of requiring that current aggregate-total claims allocate at least one query to direct primary-source totals, source-native archive/navigation pages, or official metric labels. That under-constraint amplifies the tight runtime caps enforced by [research-query-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/research-query-stage.ts:53), [research-orchestrator.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/research-orchestrator.ts:917), and [research-orchestrator.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/research-orchestrator.ts:979).
  `Fixed now:` `no`
  `Status:` `NEW (not added to register)`

## Priority Fix Candidate

`[F01]` `MEDIUM` | `apps/web/prompts/claimboundary.prompt.md`

`Change:` Add a generic rule in `GENERATE_QUERIES`: when `expectedEvidenceProfile` implies a current official total or aggregate metric, at least one query must target a direct primary-source document, source-native archive/navigation page, or official metric label, not only broad topical phrasing.

`Generic test:` `yes` - this applies beyond the asylum report to other current-total/statistical claims.

`Regression test:` `yes` - with only `2-3` queries, over-concentrating on primary statistics pages could reduce contradiction coverage for broader evaluative or multi-dimension claims. Validate against asylum/current-statistics families before adopting.

`Runtime test:` `prompt-text + stage-budget` - this is not a prompt-only fix. Retrieval caps and cache behavior still need separate evaluation.

`Expected improvement:` Direct official totals should enter the fetched pool earlier, reducing verdict variance caused by missing the primary-source anchor.
