# Agent Outputs Log -- Active Index

This file is a **triage-weight index**, not a full log. Each entry is a 3-line summary
with a link to the full handoff file in `Docs/AGENTS/Handoffs/`.

Full protocol: `Docs/AGENTS/Policies/Handoff_Protocol.md`.
Archived entries: `Docs/ARCHIVE/Agent_Outputs_YYYY-MM.md` + `Docs/ARCHIVE/Handoffs/YYYY-MM/`.

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | ACS Session Preparation Challenger Review -- [Standard] [open-items: yes]
**For next agent:** Block cross-session prepared-result reuse for now: current Stage 1 semantics still include live URL fetch plus live preliminary search, and `PreparedStage1Snapshot` only persists `resolvedInputText` + `preparedUnderstanding`, so exact public-URL equality is not a safe reuse contract. Narrow current scope to attribution cleanup in `internal-runner-queue.ts` / analyzer logging and truthful prep wording in `page.tsx` / `page-helpers.ts` without weakening the per-draft token boundary.
→ Docs/AGENTS/Handoffs/2026-04-24_Unassigned_ACS_Session_Preparation_Challenger_Review.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Fragment Root-Cause Debate -- [Standard] [open-items: yes]
**For next agent:** Full-tier debate result was `MODIFY`: the live Grander ACS case does prove fragment URL expansion into duplicated whole-page FAQ text before Stage 1, and it does rule out recommendation tuning as the first fix for that incident. But the current bundle still does not prove fragment-aware bounded extraction should ship ahead of Stage 1 final revalidation hardening without an exact same-URL A/B rerun.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Fragment_Root_Cause_Debate.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Slow Dialog Real Issue: Fragment URL Expansion -- [Standard] [open-items: yes]
**For next agent:** The main defect behind the “slow checkworthiness dialog” is not recommendation itself. Fragment-scoped FAQ URLs are currently expanded into whole-page duplicated article text before Stage 1. On the live Grander case, a `#fragment` subsection of about `1332` chars became a `7364`-char whole-article input, producing `20` candidate claims and a late Stage 1 revalidation failure before recommendation started.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Slow_Dialog_Real_Issue_Fragment_URL_Expansion.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Live Monitoring Grander Draft -- [Standard] [open-items: yes]
**For next agent:** Live monitoring of draft `6f18f926e2a2443f96afa097429ec146` confirmed the observability patch is working end to end: `lastEventMessage` persisted during prep, failure state carried `draftStateJson.observability`, and the run died in Stage 1 after Gate 1 when final contract revalidation returned no usable result twice. Measured prep time was ~`330s`, all effectively Stage 1; recommendation never started.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Live_Monitoring_Grander_Draft.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Claim Selection Draft Observability Implementation -- [Significant] [open-items: yes]
**For next agent:** ACS draft prep now persists live milestone text via `LastEventMessage` and canonical prep telemetry via `ClaimSelectionDraftState.observability`; Stage 1 contract validation / retry / repair are split into distinct progress milestones and timed separately. Restart the services and run a fresh 5+ claim draft to verify the live UI path end to end, because only build/targeted-test verification was completed here.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Claim_Selection_Draft_Observability_Implementation.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Draft Slowness Challenger Position -- [Standard] [open-items: yes]
**For next agent:** Prefer a no-schema first slice: instrument `prepareStage1Snapshot(...)` and expose a derived draft-preparation projection from `DraftStateJson.observability` rather than adding a `LastEventMessage` row column. Main anchors: `internal-runner-queue.ts`, `claim-extraction-stage.ts`, `ClaimSelectionDraftService.cs`, and ACS spec section 5.6.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Draft_Slowness_Challenger_Position.md

---
### 2026-04-22 | Unassigned | GitHub Copilot (GPT-5.4) | Internal Agent Knowledge Query Layer CLI-First Realignment -- [Standard] [open-items: yes]
**For next agent:** The active spec at [Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md) now matches the multi-model debate result: shared query core, local cache, and committed index substrate remain, but v1 is CLI-first and both the MCP adapter and `publish_handoff` are deferred.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Internal_Agent_Knowledge_Query_Layer_CLI_First_Realignment.md

---
### 2026-04-22 | Unassigned | GitHub Copilot (GPT-5.4) | Internal Agent Knowledge MCP v1 Publish Handoff Atomicity Pass -- [Standard] [open-items: yes]
**For next agent:** The active spec at [Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md) now has an explicit Section 9.4 for `publish_handoff`: required `topics` frontmatter, publish-lock plus idempotency check, handoff temp-write before `Agent_Outputs.md` rewrite, best-effort rollback on second-write failure, and immediate cache/index refresh so newly published handoffs are discoverable right away.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Internal_Agent_Knowledge_MCP_V1_Publish_Handoff_Atomicity_Pass.md

---
### 2026-04-22 | Unassigned | GitHub Copilot (GPT-5.4) | Internal Agent Knowledge MCP v1 Review Refinement -- [Standard] [open-items: yes]
**For next agent:** The active spec at [Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md) now replaces `scaffold_handoff` with protocol-complete `publish_handoff`, adds authoritative source coverage for analyzer/model-tier inputs, strengthens cache freshness tracking, and assumes a root `/.cache/` ignore rule.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Internal_Agent_Knowledge_MCP_V1_Review_Refinement.md

---
### 2026-04-22 | Unassigned | GitHub Copilot (GPT-5.4) | Internal Agent Knowledge MCP v1 Spec -- [Standard] [open-items: yes]
**For next agent:** New WIP spec at [Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md) turns the earlier indexing/MCP discussions into a concrete rollout shape: shared query core in a new `packages/fh-agent-knowledge/`, MCP plus first-class CLI adapters, gitignored local cache as primary serving layer, and current `Docs/AGENTS/index/*.json` files kept only as rollout-time compatibility inputs.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Internal_Agent_Knowledge_MCP_V1_Spec.md

---
### 2026-04-22 | Senior Developer | GitHub Copilot (GPT-5.4) | Build Index Parser Regression Tests -- [Standard] [open-items: no]
**For next agent:** [scripts/build-index.mjs](scripts/build-index.mjs) now exports `parseHandoff(...)` behind an `IS_MAIN` guard, and [apps/web/test/unit/lib/build-index.test.ts](apps/web/test/unit/lib/build-index.test.ts) locks in the role/topic fallback cases that previously dropped slug tokens like `captain` from `handoff-index.json`.
→ Docs/AGENTS/Handoffs/2026-04-22_Senior_Developer_Build_Index_Parser_Regression_Tests.md

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | Report Review e95bd017 Non-Inspectable Hosted Job -- [Standard] [open-items: yes]
**For next agent:** Exact-job inspection failed cleanly: hosted job `e95bd017e955433d897fab04342f45e1` serves the `/jobs/<id>` shell but both public JSON endpoints return `404 {"error":"Job not found"}`, local `apps/api/factharbor.db` has no matching row, and no local artifact was found. No substantive report-quality diagnosis is confirmed until the exact payload is made inspectable.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Report_Review_e95bd017_Non_Inspectable_Hosted_Job.md

---
### 2026-04-22 | Senior Developer | GitHub Copilot (GPT-5.4) | Article Gate1 Contract Preservation And Iran URL Rerun -- [Standard] [open-items: yes]
**For next agent:** Stage 1 now uses `selectClaimsForGate1(...)` in `apps/web/src/lib/analyzer/claim-extraction-stage.ts` to keep clean contract-approved article claim sets intact for Gate 1; commit `424b9652` is live and rerun `9164bcf79cb04df2a0f308d933aed8ac` is running on that commit for the Iran URL.
→ Docs/AGENTS/Handoffs/2026-04-22_Senior_Developer_Article_Gate1_Contract_Preservation_And_Iran_URL_Rerun.md

---
### 2026-04-21 | Senior Developer | GitHub Copilot (GPT-5.4) | Unverified Validator Retry Hardening -- [Standard] [open-items: yes]
**For next agent:** Stage 1 now retries contract-validator structured-output once at every validation seam in [apps/web/src/lib/analyzer/claim-extraction-stage.ts](apps/web/src/lib/analyzer/claim-extraction-stage.ts#L2602). This targets the new `validator_unavailable` UNVERIFIED jobs (`d433c56e...`, `bc6325e6...`) and also stops exact-match retry salience from reordering an already-authoritative anchor inventory. Residual PDF/article drift remains open.
→ Docs/AGENTS/Handoffs/2026-04-21_Senior_Developer_Unverified_Validator_Retry_Hardening.md

---
### 2026-04-21 | Lead Architect | GitHub Copilot (GPT-5.4) | Skill-Level Failed Attempt Recovery Reinforcement -- [Standard] [open-items: yes]
**For next agent:** The new Failed-Attempt Recovery rule was reinforced in [.claude/skills/report-review/SKILL.md](/c:/DEV/FactHarbor/.claude/skills/report-review/SKILL.md), [.claude/skills/debug/SKILL.md](/c:/DEV/FactHarbor/.claude/skills/debug/SKILL.md), and [.claude/skills/pipeline/SKILL.md](/c:/DEV/FactHarbor/.claude/skills/pipeline/SKILL.md). `report-review` is the most important copy because its Phase 4 sub-agents inherit the non-negotiable constraints verbatim.
→ Docs/AGENTS/Handoffs/2026-04-21_Lead_Architect_Skill_Level_Failed_Attempt_Recovery_Reinforcement.md

---
### 2026-04-21 | Lead Architect | GitHub Copilot (GPT-5.4) | Failed Attempt Recovery Rule Draft -- [Standard] [open-items: yes]
**For next agent:** [AGENTS.md](/c:/DEV/FactHarbor/AGENTS.md) now carries a narrow Failed-Attempt Recovery rule: after failed focused validation, classify the earlier attempt as `keep`, `quarantine`, or `revert`, and broaden scope only with a verifier-backed reason. Copilot summary guidance was synced in [.github/copilot-instructions.md](/c:/DEV/FactHarbor/.github/copilot-instructions.md).
→ Docs/AGENTS/Handoffs/2026-04-21_Lead_Architect_Failed_Attempt_Recovery_Rule_Draft.md

---
### 2026-04-21 | Lead Architect | GitHub Copilot (GPT-5.4) | Additive Repair Drift Grounded Review -- [Standard] [open-items: yes]
**For next agent:** [2026-04-21_Additive_Repair_Drift_Problem_Statement.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-21_Additive_Repair_Drift_Problem_Statement.md) was tightened to better match the evidence bundle behind it: the problem is locally relevant, but prevalence remains unquantified and the “broader than one repo” claim now rests explicitly on external signals rather than repo-local proof.
→ Docs/AGENTS/Handoffs/2026-04-21_Lead_Architect_Additive_Repair_Drift_Grounded_Review.md

---
### 2026-04-21 | Lead Architect | Codex (GPT-5) | Additive Repair Drift Problem Statement -- [Standard] [open-items: yes]
**For next agent:** New reference doc at [2026-04-21_Additive_Repair_Drift_Problem_Statement.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-21_Additive_Repair_Drift_Problem_Statement.md) explains the workflow failure mode behind agents stacking failed code/prompt attempts instead of retiring them. Keep the final framing precise: the problem is real, but the better-supported response is verifier-gated bounded backtracking, hunk quarantine, and explicit scope-approval controls, not automatic rollback-first behavior.
→ Docs/AGENTS/Handoffs/2026-04-21_Lead_Architect_Additive_Repair_Drift_Problem_Statement.md

---
### 2026-04-19 | Unassigned | Claude Opus 4.6 | Exclusivity Claim Atomicity Fix -- [Significant] [open-items: yes]
**For next agent:** Uniqueness/exclusivity claims ("the only X that Y") were not decomposed — AC_01 was a verbatim copy of the full input. Added "Exclusivity/uniqueness override" to both Pass 1 and Pass 2 in `apps/web/prompts/claimboundary.prompt.md`. Prompt reseeded (hash `44867b58`); restart dev server and rerun job `01dfef57` to verify decomposition. All 1721 tests pass.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Report_Review_01dfef57_Exclusivity_Claim_Atomicity_Fix.md

---
### 2026-04-17 | Lead Developer | Codex (GPT-5) | Freshness Contract And Lane-Aware Retrieval Slice -- [Significant] [open-items: yes]
**For next agent:** The current-evidence slice is now implemented end to end without reopening recency-penalty architecture: Stage 1 emits `AtomicClaim.freshnessRequirement`, Stage 2 query generation and relevance classification consume it, claim-acquisition telemetry mirrors it into `claimAcquisitionLedger.*.iterations[*]`, and search now supports `supplementaryProviders.mode = "demote_on_freshness"` to keep supplementaries last but bounded to 1 result for `current_snapshot` claims. Prompt storage was reseeded to `claimboundary` hash `4803f2db...`; safe verification passed via `npm -w apps/web run build` and `npm test`. Remaining next step is live reruns of jobs `83747b8b` and `866e2c83`.
→ Docs/AGENTS/Handoffs/2026-04-17_Lead_Developer_Freshness_Contract_And_Lane_Aware_Retrieval_Slice.md

---
### 2026-04-17 | Lead Developer | GitHub Copilot (GPT-5.4) | Follow-up Review Fixes For Read Gating And Script Hardening -- [Significant] [open-items: no]
**For next agent:** Follow-up review blockers are closed. Job detail plus both event read paths now validate `jobId`, treat hidden jobs as admin-only, and the Next.js event proxies forward `X-Admin-Key` for admin reads. Stage 1 regression coverage now includes direct retry-failure protection assertions, protected carriers sort ahead of same-tier peers under the centrality cap, and the retry-preservation loop asserts a bounded 7-call path. Tooling hardening landed too: `install-hooks.mjs` backs up differing hooks before overwrite, `build-index.mjs` degrades safely on Tier 1 read failures, hook indexer failures append to `.git/hooks/factharbor-index.log`, the quality-drift scanner now parses typed object blocks without the old broad regex, temp validation scripts carry delete-by notes, and `CLAUDE.md` documents the `bypassPermissions` rationale. Verified with targeted Vitest (`416 passed | 1 skipped`), `npm -w apps/web run build`, `dotnet build apps/api/FactHarbor.Api.csproj -o temp/verify-api-build-review2`, and the touched Node maintenance scripts.
→ Docs/AGENTS/Handoffs/2026-04-17_Lead_Developer_Followup_Review_Fixes_For_Read_Gating_And_Script_Hardening.md

---
### 2026-04-17 | Lead Developer | GitHub Copilot (GPT-5.4) | Code Review Fixes For Events And Retry Anchor Preservation -- [Significant] [open-items: no]
**For next agent:** Terminal `/jobs/[id]` pages now hydrate the Events tab through `/api/fh/jobs/[id]/events/history` instead of relying on SSE replay, Stage 1 now protects valid anchor carriers for both retry- and repair-approved sets via `shouldProtectValidatedAnchorCarriers(...)`, the VS Code `build` task is repaired and lock-safe via `dotnet msbuild ... /t:Compile`, and `restart-clean.ps1` now clears stale API listeners so route-level browser checks hit current code. Verified live on completed job `ff97448210f8475faf6bf0c2eba921d4`: `/events/history` fetched once, `EventSource` opened zero times, and the Events tab rendered 55 entries.
→ Docs/AGENTS/Handoffs/2026-04-17_Lead_Developer_Code_Review_Fixes_For_Events_And_Retry_Anchor_Preservation.md


---
### 2026-04-17 | Lead Developer | Codex (GPT-5) | Asylum 235000 Prompt Generalization Follow-up -- [Standard] [open-items: yes]
**For next agent:** After user review, the new prompt rules were generalized away from asylum/current-administrative wording and reframed as a generic source-native compositional-evidence pattern: decisive propositions may be established either by one headline figure or by aligned component figures within one analytical window. Prompt storage was reseeded again from `d25a32e5...` to `e1403475...`; the focused prompt-contract suite still passes. No new live rerun was required for this wording-only generalization.
→ Docs/AGENTS/Handoffs/2026-04-17_Lead_Developer_Asylum_235000_Report_Review_Prompt_Stability_Fix.md

---
### 2026-04-17 | Lead Developer | Codex (GPT-5) | Asylum 235000 Report Review Prompt Stability Fix -- [Significant] [open-items: yes]
**For next agent:** Investigated bad job `09ce888778764cda9ddd53e06a68983a` (`UNVERIFIED | 47 | 32`) for the approved asylum input and confirmed it was a prompt-behavior stability failure, not prompt-rollout drift and not a Stage 5 aggregation bug. `claimboundary.prompt.md` is now hardened for current official aggregate claims: stronger `expectedEvidenceProfile`, umbrella-preserving queries, first-class extraction of same-timepoint partition counts, and verdict/narrative rules that allow compositional support instead of treating "no printed headline total" as automatic `UNVERIFIED`. Prompt storage was reseeded from `977aaac7...` to `d25a32e5...`; focused prompt tests and web build passed; fresh live rerun `93e4056f082047a69eb158a6b7aea243` finished `LEANING-TRUE | 68 | 47`.
→ Docs/AGENTS/Handoffs/2026-04-17_Lead_Developer_Asylum_235000_Report_Review_Prompt_Stability_Fix.md

---
### 2026-04-16 | Lead Developer + LLM Expert | Claude (Opus 4.7, 1M) | Report-Review Skill Systematic Review and Improvements -- [Significant] [open-items: yes]
**For next agent:** `/report-review` hardened end-to-end across four amendments: (1) initial systematic review (~17 edits, Phase 3i regression analysis); (2) 5-panel internal debate (17 more fixes, structural rubrics, sub-agent brief template); (3) cross-model GPT-5.4 review (7 more fixes — selector-validation gate, rule-9 self-contradiction, FH_RUNNER_MAX_CONCURRENCY env-var fix, Phase 8 HEAD-level overlap gate removed, role filter broadened); (4) quality-expectations extraction — new `Docs/AGENTS/report-quality-expectations.json` (31 Q-code checks + dimensionMap) referenced by skill, 12 new canonical Q-codes accepted (HF1/HF4/HF6 pre/post-gates; S1.1/S1.3/S1.6, EV5/EV6, V1/V6/V7, new Phase 3j stability with ST1–ST6). Still open: isolated reruns of Bundesrat-rechtskräftig + Plastic-en; annotation-dependent Q-codes (anchorTokens, minDistinctEvents, trueButMisleading, crossLanguageVariantOf) are inert until benchmark-expectations families gain those fields; two unrelated unit-test-drift failures; prompt rollout reseed pending; Phase 8 propose-only mode deferred per GPT review.
→ Docs/AGENTS/Handoffs/2026-04-16_Lead_Developer_LLM_Expert_Report_Review_Skill_Improvements.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Report Review Skill Review And Expectation Alignment -- [Standard] [open-items: yes]
**For next agent:** `/report-review` now has its concrete schema/config gaps closed: the Phase 1 SQL example uses `JobId`, slug scoping prefers exact matches with unique-prefix fallback only, the dead `MEMORY.md` reference is gone, `plastic-en` replaces the inconsistent `plastik-en` slug, and the missing WWII asylum benchmark input is now present in `AGENTS.md` and `.github/copilot-instructions.md`.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Report_Review_Skill_Review_And_Expectation_Alignment.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Benchmark Report Quality Status Matrix -- [Standard] [open-items: yes]
**For next agent:** A new WIP doc now captures the current solved / partly solved / unresolved judgment for the Captain’s eight benchmark inputs, grounded in current live jobs and recent fixes. The highest-value remaining reruns are the exact WWII-comparison asylum variant, the Portuguese Bolsonaro variant on the final strongest backstop, and one fresh current-stack asylum `235 000` rerun with source inspection.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Benchmark_Report_Quality_Status_Matrix.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Bolsonaro Foreign Assessment Backstop Verification -- [Standard] [open-items: yes]
**For next agent:** The stronger backstop is verified live. Prompt hash `af6ebf88...` removed all cited `state.gov` / U.S.-like evidence from Bolsonaro rerun `ec9840ff97994392a7ea9784beb5d79a`; compared with `a3ef...`, cited `state.gov` ids dropped from `7` to `0`. Residual risk: four uncited `state.gov`-domain items still survive in the evidence pool, so inspect source attribution if contamination reappears.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Bolsonaro_Foreign_Assessment_Backstop_Verification.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Bolsonaro Foreign Assessment Leak Diagnosis And Applicability Prompt Fix -- [Standard] [open-items: yes]
**For next agent:** The old contamination fix is still present; the current leak was seeded-evidence applicability misclassification, not prompt rollout drift. Bad job `b48440718d3e4f428de5fbef8c2a45b3` cited seeded `state.gov` items `EV_021` and `EV_022` against `AC_01` and `AC_02`. `APPLICABILITY_ASSESSMENT` now explicitly keeps foreign government fair-trial/human-rights assessments as `foreign_reaction`, the prompt DB was reseeded to hash `3cacb809...`, focused tests are green, and verification rerun `d763f9507de4430681a471447b12d0fe` is still running.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Bolsonaro_Foreign_Assessment_Leak_Diagnosis_And_Applicability_Prompt_Fix.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Analyzer Review Follow-up And Safe Suite Green -- [Standard] [open-items: yes]
**For next agent:** Addressed the two concrete review blockers by updating `llm-routing.test.ts` to Anthropic Sonnet 4.6 and `claimboundary-pipeline.test.ts` to expect the legitimate Stage 2 refinement pass (`main` + `refinement`, 5 mocked LLM calls). `npm test` is now green (`83 passed`, `1684 passed | 1 skipped`). Live Bundesrat rerun `b92201bb47454f7498a1919c4a82c567` completed `SUCCEEDED` with `MIXED | 48 | 72` and Gate 4 passed. I did **not** revert `24b26016`; on the current evidence that is a cleanup/scope decision, not a defect fix.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Analyzer_Review_Followup_And_Safe_Suite_Green.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 1 Repair Anchor Selection And Live Bundesrat Rerun -- [Standard] [open-items: yes]
**For next agent:** Stage 1 now has a salience-backed `selectRepairAnchorText(...)` helper and focused tests/build checks passed. Fresh live Bundesrat rerun `b92201bb47454f7498a1919c4a82c567` no longer dies at `UNVERIFIED 50/0`: SSE shows it clearing Pass 2, contract validation/repair, Gate 1, and entering Stage 2 research. The remaining nuance is that the live repair event still logs the broad clause anchor, so inspect the completed job’s final claim shape before deciding whether more Stage 1 tightening is needed.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Stage1_Repair_Anchor_Selection_And_Live_Bundesrat_Rerun.md

---
### 2026-04-16 | Unassigned | Codex (GPT-5) | Daily Bug Scan State Recheck -- [Standard] [open-items: yes]
**For next agent:** No new git-level changes were visible on this rerun. `npm test` is still green, and the only remaining concrete issue is unchanged prompt/UCM drift: active `prompt/claimboundary` hash `977aaac7...` vs current file hash `db42b6c7...`.
→ Docs/AGENTS/Handoffs/2026-04-16_Unassigned_Daily_Bug_Scan_State_Recheck.md

---
### 2026-04-16 | Unassigned | Codex (GPT-5) | Daily Bug Scan Prompt Propagation Drift -- [Standard] [open-items: yes]
**For next agent:** Code/tests are green, but local runtime prompt state is stale: `apps/web/config.db` still has active `prompt/claimboundary` hash `977aaac7...` from `2026-04-16T15:43:12.915Z`, while the current `claimboundary.prompt.md` file hashes to `db42b6c7...` after later prompt commits. Reseed/build is required before local runs will use the new prompt text.
→ Docs/AGENTS/Handoffs/2026-04-16_Unassigned_Daily_Bug_Scan_Prompt_Propagation_Drift.md

---
### 2026-04-16 | Unassigned | Codex (GPT-5) | Daily Bug Scan Rerun After Analyzer Changes -- [Standard] [open-items: yes]
**For next agent:** The new Stage 1 anchor-selection patch (`24b26016`) passed its focused tests; the safe suite is still blocked only by the same two stale tests as before: Anthropic default-model drift in `llm-routing.test.ts:30` and pre-refinement search-count expectations in `claimboundary-pipeline.test.ts:3526`.
→ Docs/AGENTS/Handoffs/2026-04-16_Unassigned_Daily_Bug_Scan_Rerun_After_Analyzer_Changes.md

---
### 2026-04-16 | Unassigned | Codex (GPT-5) | Daily Bug Scan Analyzer Test Drift -- [Standard] [open-items: yes]
**For next agent:** Safe verification is currently blocked by two stale unit tests, not a confirmed new runtime bug: `llm-routing.test.ts:30` still expects Anthropic Sonnet 4.5 while `model-resolver.ts` now resolves Sonnet 4.6 by default, and `claimboundary-pipeline.test.ts:3526` still expects one Stage-2 search query even though `runResearchIteration(...)` now performs a legitimate refinement pass for the default metric-bearing fixture.
→ Docs/AGENTS/Handoffs/2026-04-16_Unassigned_Daily_Bug_Scan_Analyzer_Test_Drift.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Refinement Gate Restoration And Test Realignment -- [Standard] [open-items: yes]
**For next agent:** `claimNeedsPrimarySourceRefinement(...)` now matches the immediate pre-`308d00cf` gate again: no refinement when `expectedMetrics` is empty, the asylum-only fallback helper is gone, and the focused refinement + Stage 1 contract tests plus `tsc --noEmit` all passed. The next step is the live rerun of the three previously `UNVERIFIED` jobs.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Refinement_Gate_Restoration_And_Test_Realignment.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Asylum Refinement Regression Fix -- [Standard] [open-items: yes]
**For next agent:** The asylum regression was traced to the new first-pass Stage 2 refinement branch, not to Stage 4 thresholds. `claimNeedsPrimarySourceRefinement(...)` now skips redundant refinement when a metric-bearing claim already has rich non-seeded institutional numeric coverage, and the focused `primary-source-refinement.test.ts` file passed with a new asylum-style regression case.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Asylum_Refinement_Regression_Fix.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 1 Contract Repair Prompt Hardening -- [Standard] [open-items: yes]
**For next agent:** `CLAIM_CONTRACT_REPAIR` now treats the anchor as possibly the original predicate itself, requires one thesis-direct non-proxy restatement, and keeps dimension claims predicate-faithful. Focused repair tests passed, but the hydrogen/Bundesrat regressions still need fresh live reruns and the broader Stage 1 suite still shows one unrelated Stage 2 query-count failure at `claimboundary-pipeline.test.ts:3526`.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Stage1_Contract_Repair_Prompt_Hardening.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 2 Review Fixes -- [Standard] [open-items: yes]
**For next agent:** The handed-over review findings were addressed on the current tree: refinement telemetry now records `rawEvidenceItems` and `iterationType` on the correct refinement entry, source-type-only claims can trigger refinement without `expectedMetrics`, WTT/WTW/LCA survive narrative highlighting, and the targeted Stage 2 + Stage 5 safe tests passed.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Stage2_Review_Fixes.md

---
### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Hydrogen Boundary And Asylum Refinement Followup -- [Standard] [open-items: yes]
**For next agent:** Hydrogen is now structurally separated into TTW/WTW on the live submitted run `a2e57bbb...`; asylum retrieval is improved through canonicalized source types and stricter primary-source refinement, but the queued live rerun `bc825742...` still needs confirmation and a future generic table-extraction step may be needed for one direct official aggregate total.
→ Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Hydrogen_Boundary_And_Asylum_Refinement_Followup.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 2 Primary-Source Refinement Fresh Live Verification -- [Standard] [open-items: yes]
**For next agent:** Fresh approved-input rerun `ad4c0c1ba8bc4094849d2e3e9e0b1ef9` completed `SUCCEEDED` on commit `6bfffbba` with `LEANING-TRUE | 60 | 60`, source count back to `24`, and focus counts `preliminary=2`, `main=3`, `contradiction=3`, `contrarian=2`, `refinement=0`. `claimAcquisitionLedger.AC_01` still has no refinement entry and all `laneReason` values are empty, so the live refinement branch still did not activate; the 2025 SEM archive page/PDF are also still absent.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Stage2_Primary_Source_Refinement_Fresh_Live_Verification.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 2 Primary-Source Refinement Rerun After Review Follow-up -- [Standard] [open-items: yes]
**For next agent:** The fresh approved-input rerun is complete and still shows no stored refinement activation. Job `6aa4dc3e2c2d46f99fe83544b214c546` finished `SUCCEEDED` with focus counts `preliminary=2`, `main=3`, `contradiction=3`, `refinement=0`; `claimAcquisitionLedger.AC_01` has only `main` and `contradiction` iterations with empty `laneReason`. Compared with earlier current-code run `141cfe945d8540caaddb970d271317f2`, this rerun also regressed in persisted official-source breadth: 13 sources instead of 24 and no 2025 SEM archive page.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Stage2_Primary_Source_Refinement_Rerun_After_Review_Followup.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 2 Primary-Source Refinement Review Follow-up -- [Standard] [open-items: yes]
**For next agent:** The review follow-up is now landed. The prompt explicitly maps `expectedSourceTypes` to retrieval lanes, refinement metadata omission now warns at runtime, refinement writes separate claim-acquisition telemetry via `laneReason`, and the focused Stage 2 guard-case tests were expanded. Focused tests and full web build both passed after a small build-only `NonNullable<...>` typing fix in `research-orchestrator.ts`.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Stage2_Primary_Source_Refinement_Review_Followup.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 2 Primary-Source Refinement Regression Check -- [Standard] [open-items: yes]
**For next agent:** Two live runs were completed for the approved asylum input after landing the Stage 2 refinement slice. Result: partial retrieval improvement only. Baseline remained `0/6` exact 2025 commentary-PDF hits; current runs are `0/2` exact PDF hits, `1/2` persisted 2025 archive-page hits, and `0/2` `refinement` query activations. The implementation also needed a small compatibility fix: `research-orchestrator.ts` now initializes `researchedIterationsByClaim` defensively, and `generateResearchQueries(...)` only emits retrieval metadata when the LLM actually returns it.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Stage2_Primary_Source_Refinement_Regression_Check.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Stage 2 Primary-Source Refinement Implementation -- [Standard] [open-items: yes]
**For next agent:** The low-risk retrieval slice is now implemented in Stage 2. Query generation returns `retrievalLane`/`freshnessWindow`, the orchestrator can spend one bounded first-pass `refinement` query when only seeded or secondary coverage exists for metric-bearing primary-evidence claims, and freshness-sensitive searches can bypass stale cache entries. Targeted Vitest coverage and `npm -w apps/web run build` both passed.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Stage2_Primary_Source_Refinement_Implementation.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Asylum 235000 Evidence Gap Investigation -- [Standard] [open-items: yes]
**For next agent:** The recent `235 000` asylum-family runs are missing the SEM 2025 commentary PDF upstream of verdicting. The target job `7333cb1f1ee6472b9c782e94e4aa7b0e` and the five newest comparators never include `stat-jahr-2025-kommentar...` in `resultJson.sources`, even though the SEM 2025 archive page explicitly links it. Current diagnosis: broad query generation + 8-result search budget + top-5 fetch cap + occasional 7-day cached search results steer the pipeline toward NZZ, press releases, generic SEM landing pages, and older PDFs instead of the direct annual-total source.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Asylum_235000_Evidence_Gap_Investigation.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Validator-Side Success-False Fallback Test -- [Standard] [open-items: no]
**For next agent:** The last missing Phase 7b `success=false` verification seam is now covered. `claimboundary-pipeline.test.ts` includes a validator-side behavioral test proving that binding mode with `success=false` still falls back to base validator behavior while passing the failed-binding context into `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX`.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Validator_Side_Success_False_Fallback_Test.md

---
### 2026-04-15 | Unassigned | Codex (GPT-5) | LLM Prompt System Explanation -- [Standard] [open-items: yes]
**For next agent:** The prompt-system walkthrough now exists as `Docs/WIP/2026-04-15_LLM_Prompt_System_Explanation.md`. It includes the high-level DB-first/UCM flow, ClaimBoundary runtime section loading, provenance path, and the current SR/inverse-check exceptions.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_LLM_Prompt_System_Explanation.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Phase 7b Success-False Coverage And Two Canaries -- [Standard] [open-items: yes]
**For next agent:** The minimal `success=false` verification slice is now executed: a Pass 2 prompt-contract assertion and a Pass 2 runtime-plumbing test were added, focused Stage 1 tests passed (`390 passed | 1 skipped`), prompt reseeding/build passed, and the two Captain-approved Bundesrat canaries both succeeded on the current commit.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Phase7b_Success_False_Coverage_And_Two_Canaries.md

---
### 2026-04-15 | Unassigned | Codex (GPT-5) | Prompt System Architecture Issues Report -- [Standard] [open-items: yes]
**For next agent:** The prompt-system findings are now written up in `Docs/WIP/2026-04-15_Prompt_System_Architecture_Issues_Report.md` and linked from backlog item `PROMPT-ARCH-1`. Core issue: ClaimBoundary is UCM-backed and coherent, but SR core evaluation, the inverse-check micro-prompt, and the stale `text-analysis` profile/docs still do not follow one truthful prompt-governance model.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_Prompt_System_Architecture_Issues_Report.md

---
### 2026-04-15 | Unassigned | Codex (GPT-5) | Explain Code LLM Prompts -- [Standard] [open-items: yes]
**For next agent:** Prompt architecture explanation is now grounded in the live runtime path. ClaimBoundary and the input-policy gate are DB-first/UCM-backed via `config-loader` and `prompt-loader`, but source reliability still uses `sr-eval-prompts.ts` for core evaluation and `paired-job-audit.ts` still reads its inverse-check prompt directly from disk.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_Explain_Code_LLM_Prompts.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Captain-Defined Analysis Inputs Rule -- [Standard] [open-items: yes]
**For next agent:** `AGENTS.md` now explicitly forbids inventing or paraphrasing analysis inputs and lists the current Captain-approved inputs. `.github/copilot-instructions.md` was synced to carry the same rule for Copilot workspace guidance.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Captain_Defined_Analysis_Inputs_Rule.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Phase 7b Overlap Check And Plan Rebase -- [Standard] [open-items: yes]
**For next agent:** The prompt-only slice described in the April 15 charter is already landed in the live prompt file. Current local verification passed for `claim-extraction-prompt-contract.test.ts`, `claim-contract-validation.test.ts`, and `claimboundary-pipeline.test.ts` (3 files, 389 tests passed, 1 skipped). The charter was rebased: do not reopen the prompt edits; remaining work is optional `success=false` coverage tightening plus prompt reseed and minimum canary spot-checks if fresh live validation is desired.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Phase7b_Overlap_Check_And_Plan_Rebase.md

---
### 2026-04-15 | Lead Architect + Senior Developer + Code Reviewer | GitHub Copilot (GPT-5.4) | Phase 7b Charter Debate Consolidation -- [Standard] [open-items: yes]
**For next agent:** Review-board pass converged on approve-with-changes. The Phase 7b charter remains valid, but it was tightened to reflect current repo state and reviewer concerns: the slice is now explicitly prompt-and-focused-test, `success=false` handling is framed as tighten-and-verify rather than missing-from-zero, and runtime appendix-loading changes remain a separate debated follow-up unless focused tests prove them necessary.
→ Docs/AGENTS/Handoffs/2026-04-15_Review_Board_Phase7b_Charter_Debate_Consolidation.md

---
### 2026-04-15 | Code Reviewer | Codex (GPT-5) | Skeptical Review Of Proposed Prompt Fixes -- [Standard] [open-items: yes]
**For next agent:** The April 14/15 prompt-fix proposals are mostly governance-safe, but `ISSUE-14` as written assumes nonexistent output/runtime state; `ISSUE-06`, `ISSUE-07`, and `ISSUE-18` are not prompt-only; and any Opus/model-tier escalation would hit shared task routes unless a new salience-specific task key is introduced.
→ Docs/AGENTS/Handoffs/2026-04-15_Code_Reviewer_Prompt_Fixes_Skeptical_Review.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Phase 7b Prompt-Blocker Charter -- [Standard] [open-items: yes]
**For next agent:** A new WIP execution charter now exists for the first bounded Phase 7b slice. It keeps the review note intact and scopes implementation to the three prompt-only blockers already validated on current code and current-build jobs: thesis-direct precedence in the validator, explicit `success=false` handling in both binding appendices, and explicit single-source anchor audit in the binding validator.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Phase7b_Prompt_Blocker_Charter.md

### 2026-04-15 | LLM Expert | Codex (GPT-5) | Phase 7 Prompt-Quality Issue Investigation -- [Standard] [open-items: yes]
**For next agent:** Static review confirms four live areas: rule-11 thesis-direct/verbatim mismatch, missing `success=false` semantics in both binding appendices, binding-validator override ambiguity, and real-but-deferred salience-definition drift. Salience model tiering is not an accidental miswire; it is intentionally on `getModelForTask("understand")` and should only change via an explicit config/task decision.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Phase7_Prompt_Quality_Issue_Investigation.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Prompt Audit Validation Review -- [Standard] [open-items: yes]
**For next agent:** The 2026-04-14 prompt audit was revalidated against the live prompt/runtime. ISSUE-01, ISSUE-14, ISSUE-15, and ISSUE-06 are confirmed exactly where reported. ISSUE-02 is also real but should stay deferred under the current E2 freeze because it touches CLAIM_SALIENCE_COMMITMENT. Highest-value next move is prompt-only work in apps/web/prompts/claimboundary.prompt.md plus focused tests for binding mode with salience success false.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Prompt_Audit_Validation_Review.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Prompt Caching Debate Consolidation -- [Standard] [open-items: yes]
**For next agent:** The Anthropic caching proposal was consolidated into a phased recommendation: do not touch claimboundary-pipeline.ts, patch the two uncached grounding-check calls if implementation is desired, and defer any broad prompt-boundary refactor unless measured Anthropic cost telemetry justifies it. Main technical finding: the core stages already use getPromptCachingOptions(), but cache payoff is muted because dynamic job payload is rendered into system prompts.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Prompt_Caching_Debate_Consolidation.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Grounding Prompt Caching Implementation And Review -- [Standard] [open-items: yes]
**For next agent:** The narrow grounding-check caching patch is now implemented and verified. `grounding-check.ts` uses `getPromptCachingOptions()` on both LLM calls, the grounding-check unit tests were updated to cover the new `providerOptions` path, `npm -w apps/web run build` passed, and the targeted grounding-check Vitest file passed. Final review found no regression in the caching change; only pre-existing grounding-check issues remain.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Grounding_Prompt_Caching_Implementation_And_Review.md

---
### 2026-04-14 | LLM Expert | Claude Sonnet 4.6 (Cowork) | Full Codebase Prompt Audit — 18 Issues, 4 Phase 7b Blockers Identified -- [Significant] [open-items: yes]
**For next agent:** All 5 prompt files and all inline prompt content were reviewed. 18 issues found across 7 categories. 4 are Phase 7b / Shape B pre-launch blockers: (1) CONTRACT_VALIDATION literal-substring rule must be tightened to only accept thesis-direct claims as anchor carriers (ISSUE-01); (2) PASS2_BINDING_APPENDIX needs salience-failure-mode handling defined (ISSUE-14); (3) VALIDATION_BINDING_APPENDIX needs an override notice so the base anchor-discovery rules don't compete with the precommitted anchor list (ISSUE-15); (4) SALIENCE_COMMITMENT anchor definition should be aligned with the validator's truth-condition test (ISSUE-02). High-value non-blocker: inline FACT_CHECK_CONTEXT and retry guidance text should be moved into the prompt system (ISSUE-06). IMPORTANT: do NOT touch CLAIM_SALIENCE_COMMITMENT or CLAIM_EXTRACTION_PASS2 before the next E2 measurement batch closes.
→ Docs/AGENTS/Handoffs/2026-04-14_LLM_Expert_Prompt_Review_and_Improvement_Proposals.md

---
### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7 Final Reviewer Constraints Folded Into Plan -- [Standard] [open-items: yes]
**For next agent:** A final external reviewer agreed with the Shape B direction but required stricter slice-1 constraints. `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md` now reflects that Shape B is a go only with explicit mode separation, full salience persistence, durable recovery attribution, validator precedence cleanup, and typed anchor mapping in the first implementation slice.
→ Docs/AGENTS/Handoffs/2026-04-14_lead_developer_lead_architect_phase_7_final_reviewer_constraints_folded_into_plan.md

---
### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7 Docs Corrected For Shape B Start Signal -- [Standard] [open-items: yes]
**For next agent:** The Phase 7 docs were corrected to separate three things clearly: (1) the first deep review’s still-valid architectural reasoning, (2) the blockers materially fixed in `61815f41`, and (3) the remaining honesty gap that the current E2 note is not a locally reproduced committed-build statistical closeout. Current architect position: proceed to Phase 7b / Shape B behind a feature flag, but do not overstate the current measurement note.
→ Docs/AGENTS/Handoffs/2026-04-14_lead_developer_lead_architect_phase_7_docs_corrected_for_shape_b_start_signal.md

---
### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7 Working Baseline Consolidated Through Step 4 -- [Standard] [open-items: yes]
**For next agent:** `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md` was rewritten into a shorter Phase 7 working baseline for humans and agents. It now carries the durable Step 1 summary, Step 2 root-cause summary, Step 3 root fixes/specification, and Step 4 implementation/verification plan. Code/prompt-specific detail remains in `Docs/WIP/2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md`. Next step is the hardened-surface E2 measurement report.
→ Docs/AGENTS/Handoffs/2026-04-14_lead_developer_lead_architect_phase_7_working_baseline_consolidated_through_step_4.md

---
### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7 Code / Prompt Deep Review And Debate Consolidation -- [Standard] [open-items: yes]
**For next agent:** Use `Docs/WIP/2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md` as the current code/prompt review note for Phase 7. It consolidates direct code inspection plus a two-reviewer debate and concludes that E2 is still worth measuring, but only as an anchor-recognition audit unless the measurement surface is tightened.
→ Docs/AGENTS/Handoffs/2026-04-14_lead_developer_lead_architect_phase_7_code_prompt_deep_review_debate_consolidation.md

---
### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7 Step 2 Issues / Root Causes Consolidation -- [Standard] [open-items: yes]
**For next agent:** `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md` now contains both Step 1 and Step 2. The summary tables were rewritten after two reviewer-agent challenges: explicit `Pain/Need/Expectation`, explicit provenance, explicit confidence/caveat, plus Step 2 root-cause tables separating proven causes from hypotheses. Next step is Step 3: root fixes and specification.
→ Docs/AGENTS/Handoffs/2026-04-14_lead_developer_lead_architect_phase_7_step_2_issues_root_causes_consolidation.md

---
### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7 Step 1 Pains / Issues / Needs Consolidation -- [Standard] [open-items: yes]
**For next agent:** Use `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md` as the Step 1 source of truth. It consolidates current HEAD job evidence, direct user statements preserved in docs, and the earlier Bundesrat expectation trail (`094e88fc`, `0afb2d88`, `b843fe70`) while explicitly separating proven facts from inference. Next step is Step 2: root causes and specification ambiguities.
→ Docs/AGENTS/Handoffs/2026-04-14_lead_developer_lead_architect_phase_7_step_1_pains_issues_needs_consolidation.md

---
### 2026-04-13 | LLM Expert | Claude Code (Opus 4.6) | Trim root AI-instruction files -- [Significant] [open-items: yes]
**For next agent:** Full context in `Docs/AGENTS/Handoffs/2026-04-13_LLM_Expert_Root_Instruction_File_Trim.md`. Code Reviewer approved with one staging fix and two non-blocking notes. To extend handoff protocol, edit `Docs/AGENTS/Policies/Handoff_Protocol.md` directl...
→ Docs/AGENTS/Handoffs/2026-04-13_LLM_Expert_Root_Instruction_File_Trim.md

---
### 2026-04-17 | Senior Developer + LLM Expert | GitHub Copilot (GPT-5.4) | Bundesrat Live Rerun And Jobs Page SSE Gating -- [Significant] [open-items: yes]
**For next agent:** The dominant Bundesrat hard-failure mode is fixed end-to-end: Stage 1 repair-approved anchor carriers are preserved, the `/jobs/[id]` page now waits for `job.status` and only subscribes to SSE for active jobs, and fresh local rerun `a2642a8d42ac4149a5fef7d10529a777` completed `SUCCEEDED` with a full report (`LEANING-TRUE | 71 | 79`, 43 evidence items, 5 boundaries). Remaining open question is calibration, not collapse.
→ Docs/AGENTS/Handoffs/2026-04-17_Senior_Developer_LLM_Expert_Bundesrat_Live_Rerun_And_Jobs_Page_SSE_Gating.md

---

### 2026-04-11 | Lead Architect + LLM Expert | Claude Opus 4.6 (1M) | Phase 2 Gate G2 Rev 4 Approved — Execution Beginning -- [Standard] [open-items: yes]
**For next agent:** Phase 2 execution begins immediately after the commit sequence lands. If the replay results land cleanly (no stop-rule triggers, no quota issues, statistically separable deltas per per-input criteria), Phase 3 Change Impact Ledger is the next step...
→ Docs/AGENTS/Handoffs/2026-04-11_lead_architect_llm_expert_phase_2_gate_g2_rev_4_approved_exe.md

---

### 2026-04-11 | Lead Architect + LLM Expert | Claude Opus 4.6 (1M) | Report Quality Restoration — Master Plan + Phase 1 Complete -- [Standard] [open-items: yes]
**For next agent:** Wait for Gate G1 answers from the user. Once received: begin Phase 2 (Historical Baseline Map) by (1) inventorying validation artefacts in `apps/web/test/output/` and `test-output/validation/`, (2) building the run-to-commit map, (3) presenting th...
→ Docs/AGENTS/Handoffs/2026-04-11_lead_architect_llm_expert_report_quality_restoration_master.md

---

### 2026-04-11 | Lead Developer | Cline | Claim Clarification Gate Design Review -- [Standard] [open-items: yes]
**For next agent:** Start Phase 1 with low-risk, unit-testable seams: add `clarificationAssessment` to Pass 2 schema + prompt contract tests, add `isClaimAnalyzable` as a pure helper with parity tests against current Gate 1 outcomes, then add `evaluateClarificationGa...
→ Docs/AGENTS/Handoffs/2026-04-11_lead_developer_claim_clarification_gate_design_review.md

---

### 2026-04-10 | Lead Architect | Codex (GPT-5) | Rev B Tightened After Lead Developer Review -- [Significant] [open-items: yes]
**For next agent:** Use Rev B directly as the implementation source of truth. The Lead Developer's required tightenings are now incorporated into the plan rather than living only in review commentary.
→ Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Report_Quality_Implementation_Plan_RevB.md

---

### 2026-04-10 | Lead Architect | Codex (GPT-5) | Rev B Prepared For Lead Developer Review -- [Significant] [open-items: yes]
**For next agent:** Use `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Report_Quality_Implementation_Plan_RevB.md` directly for Lead Developer review.
→ Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Report_Quality_Implementation_Plan_RevB.md

---

### 2026-04-10 | Lead Architect | Codex (GPT-5) | Report Quality Implementation Plan Rev B -- [Significant] [open-items: yes]
**For next agent:** Use `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Report_Quality_Implementation_Plan_RevB.md` as the implementation source of truth.
→ Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Report_Quality_Implementation_Plan_RevB.md

---

### 2026-04-10 | Lead Architect + Senior Developer | Codex (GPT-5) | Implementation Refresh Review -- [Significant] [open-items: yes]
**For next agent:** Full review in `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Implementation_Refresh_Review.md`.
→ Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Implementation_Refresh_Review.md

---

### 2026-04-10 | Lead Architect | GitHub Copilot (GPT-5.4) | Handoff Status Update After Implementation -- [Significant] [open-items: yes]
**For next agent:** Start from the updated deep investigation handoff. It now separates implemented code changes from still-open validation and UI/trust work.
→ Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Report_Quality_Deep_Investigation.md

---

### 2026-04-10 | Lead Architect | GitHub Copilot (GPT-5.4) | Factual Correction Propagation -- [Significant] [open-items: yes]
**For next agent:** If another agent starts from the consolidated plan, review board, or current-state handoff instead of the deep investigation, they will now see the corrected factual baseline on the retry path and the Wave 2B seam.
→ Docs/AGENTS/Handoffs/2026-04-10_Report_Quality_Consolidated_Review_Plan.md

---

### 2026-04-10 | Lead Architect | GitHub Copilot (GPT-5.4) | LLM Expert Review Incorporation -- [Significant] [open-items: yes]
**For next agent:** Use the revised handoff as the current source of truth. The document now reflects both the architect consolidation and the LLM Expert's empirical refinements.
→ Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Report_Quality_Deep_Investigation.md

---

### 2026-04-10 | Lead Architect | GitHub Copilot (GPT-5.4) | Review-Ready Plan Consolidation -- [Significant] [open-items: yes]
**For next agent:** Use `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Report_Quality_Deep_Investigation.md` as the review-ready source of truth for this task. Supporting April 10 handoffs remain relevant only for deeper evidence.
→ Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Report_Quality_Deep_Investigation.md

---

### 2026-04-10 | Review Board: Lead Architect + Senior Developer + LLM Expert + Adversarial Reviewer | GitHub Copilot (GPT-5.4) | Multi-Agent Review Board Consolidation -- [Significant] [open-items: yes]
**For next agent:** Use `Docs/AGENTS/Handoffs/2026-04-10_Report_Quality_Multi_Agent_Review_Board.md` as the latest review-board source of truth. Use the earlier April 10 handoffs only as supporting evidence.
→ Docs/AGENTS/Handoffs/2026-04-10_Report_Quality_Multi_Agent_Review_Board.md

---

### 2026-04-10 | Lead Architect + Senior Developer + LLM Expert | GitHub Copilot (GPT-5.4) | Consolidated Review Plan -- [Significant] [open-items: yes]
**For next agent:** Use `Docs/AGENTS/Handoffs/2026-04-10_Report_Quality_Consolidated_Review_Plan.md` as the review-ready source of truth. Fall back to the supporting April 10 handoffs only for raw evidence or deeper rationale.
→ Docs/AGENTS/Handoffs/2026-04-10_Report_Quality_Consolidated_Review_Plan.md

---

### 2026-04-10 | LLM Expert | GitHub Copilot (GPT-5.4) | Empirical Addendum On Four Same-Input Runs -- [Significant] [open-items: yes]
**For next agent:** Read `Docs/AGENTS/Handoffs/2026-04-10_LLM_Expert_Report_Quality_Prompt_And_Behavior_Investigation_Empirical_Addendum.md` after the original LLM handoff. Use the addendum as the current source of truth on F2, the retry path, and the recommended min...
→ Docs/AGENTS/Handoffs/2026-04-10_LLM_Expert_Report_Quality_Prompt_And_Behavior_Investigation_Empirical_Addendum.md

---

### 2026-04-10 | Lead Architect + Senior Developer | GitHub Copilot (GPT-5.4) | Current-State Report Quality Investigation -- [Significant] [open-items: yes]
**For next agent:** Start with `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Current_State_Report_Quality_Investigation.md`. Highest-value first move is P0 final-claim contract enforcement in Stage 1, then P2 matrix honesty cleanup, then a removal-...
→ Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Current_State_Report_Quality_Investigation.md

---

### 2026-04-10 | Lead Architect + Senior Developer | Codex (GPT-5) | Report Quality Deep Investigation -- [Significant] [open-items: yes]
**For next agent:** (no For-next-agent field)
→ Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Report_Quality_Deep_Investigation.md

---

### 2026-04-10 | Lead Architect + Senior Developer | Codex (GPT-5) | Overarching Report Quality Investigation -- [Significant] [open-items: yes]
**For next agent:** Full report and implementation plan in `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Overarching_Report_Quality_Investigation.md`. If implementing, start with the Stage-1 contract-acceptance fix and the Coverage Matrix semantic ...
→ Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Overarching_Report_Quality_Investigation.md

---

### 2026-04-10 | LLM Expert | Claude Opus 4.6 (1M) | Report Quality — Prompt & LLM-Behavior Investigation -- [Significant] [open-items: yes]
**For next agent:** Start at F1, F2, F3 in the handoff. NP1 (control-flow branch) + NP2 (Gate 1 anchor data flow) + PR3 (Gate 1 anchor exemption) is the smallest combined change that fixes the user's primary complaint without adding new prompt scar tissue. Phase orde...
→ Docs/AGENTS/Handoffs/2026-04-10_LLM_Expert_Report_Quality_Prompt_And_Behavior_Investigation.md

---

### 2026-04-10 | Senior Developer | Claude Code (Opus 4.6) | Option G Live Validation -- [Significant] [open-items: yes]
**For next agent:** Full report at `Docs/AGENTS/Handoffs/2026-04-10_Senior_Developer_Option_G_Validation_Report.md`. Recommendation: GO for promotion review.
→ Docs/AGENTS/Handoffs/2026-04-10_Senior_Developer_Option_G_Validation_Report.md

---

### 2026-04-10 | Lead Architect + LLM Expert | Claude Opus 4.6 (1M) | Claim Clarification Gate — Design for FR1.x -- [Standard] [open-items: yes]
**For next agent:** Lead Developer should read `Docs/WIP/2026-04-10_Claim_Clarification_Gate_Design.md` end-to-end, focus on §6 (pipeline orchestration), §5 (data model), §7 (API surface), and §16 (file list). Produce a Phase 1 implementation plan starting with the s...
→ Docs/AGENTS/Handoffs/2026-04-10_lead_architect_llm_expert_claim_clarification_gate_design_fo.md

---

### 2026-04-10 | Lead Architect | GitHub Copilot (GPT-5.4) | Architect Review Recheck Against Current Source -- [Standard] [open-items: yes]
**For next agent:** Treat the architect review as substantively accurate. The strongest remaining gaps are report-honesty in the matrix and missing directness context in contract validation, not a re-opened silent fail-open bug.
→ Docs/AGENTS/Handoffs/2026-04-10_lead_architect_architect_review_recheck_against_current_sour.md

---

### 2026-04-10 | Lead Architect | GitHub Copilot (GPT-5.4) | Seven-Run Contract Failure Review -- [Standard] [open-items: yes]
**For next agent:** Start with `Docs/Investigations/2026-04-10_Claim_Contract_Run_Review.md`. The key implementation target is the whole-anchor substring requirement inside `evaluateClaimContractValidation(...)`, which is over-rejecting coordinated actor decompositions.
→ Docs/AGENTS/Handoffs/2026-04-10_lead_architect_seven_run_contract_failure_review.md

---

### 2026-04-09 | LLM Expert | Claude Code (Opus 4.6) | Bolsonaro Evidence-Mix Regression Investigation -- [Significant] [open-items: yes]
**For next agent:** See full handoff at `Docs/AGENTS/Handoffs/2026-04-09_LLM_Expert_Bolsonaro_Evidence_Mix_Regression_Investigation.md`. Core follow-up: RELEVANCE_CLASSIFICATION / APPLICABILITY_ASSESSMENT prompt policy for historical precedent.
→ Docs/AGENTS/Handoffs/2026-04-09_LLM_Expert_Bolsonaro_Evidence_Mix_Regression_Investigation.md

---

### 2026-04-09 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Claim Plan Marked Ready For Implementation Review -- [Significant] [open-items: yes]
**For next agent:** Use `Docs/AGENTS/Handoffs/2026-04-09_Lead_Architect_LLM_Expert_Dominant_Claim_Implementation_Plan_RevA.md` as the authoritative implementation-review artifact.
→ Docs/AGENTS/Handoffs/2026-04-09_Lead_Architect_LLM_Expert_Dominant_Claim_Implementation_Plan_RevA.md

---

### 2026-04-09 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Claim Plan Tightening After Senior Developer Review -- [Significant] [open-items: yes]
**For next agent:** Use the updated Rev A handoff, not the earlier April 9 snapshot. The current review-ready plan now contains the predicate, gating, and multiplier policy requested by the Senior Developer review.
→ Docs/AGENTS/Handoffs/2026-04-09_Lead_Architect_LLM_Expert_Dominant_Claim_Implementation_Plan_RevA.md

---

### 2026-04-09 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Claim Plan Revision For Re-Review -- [Significant] [open-items: yes]
**For next agent:** Review `Docs/AGENTS/Handoffs/2026-04-09_Lead_Architect_LLM_Expert_Dominant_Claim_Implementation_Plan_RevA.md` as the current implementation plan. Older April 8 handoffs are now background context, not the final execution order.
→ Docs/AGENTS/Handoffs/2026-04-09_Lead_Architect_LLM_Expert_Dominant_Claim_Implementation_Plan_RevA.md

---

### 2026-04-09 | Lead Architect | Codex (GPT-5) | Deterministic Analysis Hotspots Review -- [Standard] [open-items: yes]
**For next agent:** Start with `Docs/WIP/2026-04-09_Deterministic_Analysis_Hotspots_Review.md`. If this work is picked up, prioritize Stage 1 anchor preservation and Stage 4 direction rescue before lower-severity routing/quality labels.
→ Docs/AGENTS/Handoffs/2026-04-09_lead_architect_deterministic_analysis_hotspots_review.md

---

### 2026-04-09 | Lead Architect + LLM Expert | Claude Code (Opus 4.6) | Option G Review Incorporation -- [Standard] [open-items: yes]
**For next agent:** Full reviewed design at `Docs/WIP/2026-04-09_LLM_Led_Article_Adjudication_Redesign.md`. Section 7 has the review findings table. Section 8 has the migration path. Start with Phase 1 (tests + types + config).
→ Docs/AGENTS/Handoffs/2026-04-09_lead_architect_llm_expert_option_g_review_incorporation.md

---

### 2026-04-09 | Lead Architect + LLM Expert | Claude Code (Opus 4.6) | Stage-5 LLM-Led Article Adjudication Redesign -- [Standard] [open-items: yes]
**For next agent:** Full design at `Docs/WIP/2026-04-09_LLM_Led_Article_Adjudication_Redesign.md`. Option G is section 5. Review questions below in the GPT Lead Architect review request.
→ Docs/AGENTS/Handoffs/2026-04-09_lead_architect_llm_expert_stage_5_llm_led_article_adjudicati.md

---

### 2026-04-09 | Lead Architect | Codex (GPT-5) | Review Option G LLM-Led Article Adjudication -- [Standard] [open-items: yes]
**For next agent:** If implementing Option G, refine the conflict predicate before coding: use verdict bands or a minimum margin/confidence rule so borderline mixed claims do not trigger adjudication. Prefer a single cap of `30` on the conflict path unless live valid...
→ Docs/AGENTS/Handoffs/2026-04-09_lead_architect_review_option_g_llm_led_article_adjudication.md

---

### 2026-04-08 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Claim Debate Consolidation -- [Significant] [open-items: yes]
**For next agent:** Main decision record: `Docs/AGENTS/Handoffs/2026-04-08_Lead_Architect_LLM_Expert_Dominant_Claim_Debate_Consolidation.md`. Use Swiss target `11a8f75c...`, Swiss sibling `67a3d07d...`, hydrogen `a0c5e51e...`, and plastic control `70a3963c...` as the...
→ Docs/AGENTS/Handoffs/2026-04-08_Lead_Architect_LLM_Expert_Dominant_Claim_Debate_Consolidation.md

---

### 2026-04-08 | Lead Architect | GitHub Copilot (GPT-5.4) | Quality Plan Hardening Review -- [Significant] [open-items: yes]
**For next agent:** See `Docs/AGENTS/Handoffs/2026-04-08_Lead_Architect_Quality_Plan_Hardening_Review.md`.
→ Docs/AGENTS/Handoffs/2026-04-08_Lead_Architect_Quality_Plan_Hardening_Review.md

---

### 2026-04-08 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Claim Aggregation Investigation -- [Significant] [open-items: yes]
**For next agent:** Read `Docs/AGENTS/Handoffs/2026-04-08_Lead_Architect_Dominant_Claim_Aggregation_Investigation.md` and implement Phase 1 there first: dominance assessment output, dominance-aware aggregate, persisted observability, then the narrative/adjudication p...
→ Docs/AGENTS/Handoffs/2026-04-08_Lead_Architect_Dominant_Claim_Aggregation_Investigation.md

---

### 2026-04-08 | Code Reviewer | GitHub Copilot (GPT-5.4) | Post-Approval Low-Finding Cleanup -- [Standard] [open-items: yes]
**For next agent:** This cleanup is naming/formatting only; behavior was verified unchanged with the focused verdict-stage tests and a successful web build.
→ Docs/AGENTS/Handoffs/2026-04-08_code_reviewer_post_approval_low_finding_cleanup.md

---

### 2026-04-08 | Lead Architect | GitHub Copilot (GPT-5.4) | Code Review Blockers Resolved -- [Standard] [open-items: yes]
**For next agent:** If further review follows, validate the new aggregation baseline with fresh jobs rather than stale stored results. The semantic contracts restored here are covered by targeted tests in `verdict-stage.test.ts` and `claimboundary-pipeline.test.ts`.
→ Docs/AGENTS/Handoffs/2026-04-08_lead_architect_code_review_blockers_resolved.md

---

### 2026-04-08 | Senior Developer | Claude Code (Opus 4.6) | Complete Quality Assessment — Revised Per LLM Expert Review -- [Standard] [open-items: yes]
**For next agent:** The schema fix target is `claim-extraction-stage.ts:1655` — add `truthConditionAnchor` and `antiInferenceCheck` to `ClaimContractOutputSchema`, then wire the retry logic to read them. Full plan: `Docs/WIP/2026-04-08_Complete_Quality_Assessment_and...
→ Docs/AGENTS/Handoffs/2026-04-08_senior_developer_complete_quality_assessment_revised_per_llm.md

---

### 2026-04-08 | Senior Developer | Claude Code (Opus 4.6) | Fix 1 Strengthened Measurement — Modifier Preservation Still Failing + CH Regression -- [Standard] [open-items: yes]
**For next agent:** Full measurement data in this entry. The decision is: revert the strengthening, keep the first Fix 1 (which had anti-inference working + 1/3 preservation), and consider whether a code-level structural check is needed for modifier preservation.
→ Docs/AGENTS/Handoffs/2026-04-08_senior_developer_fix_1_strengthened_measurement_modifier_pre.md

---

### 2026-04-08 | LLM Expert | GitHub Copilot (GPT-5.4) | Fix 1 Prompt Strengthening for Proposition Anchoring -- [Standard] [open-items: yes]
**For next agent:** Measure against the same Fix 1 invariants: modifier preserved in direct claims, no normative injection on chronology-only variants, stable direction on the anchored claim, zero validator hallucinations.
→ Docs/AGENTS/Handoffs/2026-04-08_llm_expert_fix_1_prompt_strengthening_for_proposition_anchor.md

---

### 2026-04-08 | Senior Developer | Claude Code (Opus 4.6) | f1a372bf-to-HEAD Consolidated Investigation -- [Standard] [open-items: yes]
**For next agent:** The consolidated document supersedes both the primary investigation and the cross-review for decision-making. Source docs remain as audit trail. Priority 1 fix target: `apps/web/prompts/claimboundary.prompt.md` CLAIM_EXTRACTION_PASS2 section.
→ Docs/AGENTS/Handoffs/2026-04-08_senior_developer_f1a372bf_to_head_consolidated_investigation.md

---

### 2026-04-08 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Claim Aggregation Follow-Up -- [Standard] [open-items: yes]
**For next agent:** Reuse the existing handoff as the main architecture note, but carry forward these extra validation anchors: Swiss target `11a8f75c...`, Swiss sibling override `67a3d07d...`, hydrogen `a0c5e51e...`, and plastic control `70a3963c...`.
→ Docs/AGENTS/Handoffs/2026-04-08_lead_architect_llm_expert_dominant_claim_aggregation_follow.md

---

### 2026-04-07 | Senior Developer | Claude Code (Opus 4.6) | f1a372bf-to-HEAD Investigation — Final with Bundesrat Failures -- [Standard] [open-items: yes]
**For next agent:** Full investigation with all findings: `Docs/WIP/2026-04-07_f1a372bf_to_HEAD_Job_Quality_Investigation.md`. The three Bundesrat critical findings are documented with exact job IDs, per-claim evidence, and root-cause analysis. The fix targets are: (...
→ Docs/AGENTS/Handoffs/2026-04-07_senior_developer_f1a372bf_to_head_investigation_final_with_b.md

---

### 2026-04-07 | Senior Developer | Claude Code (Opus 4.6) | f1a372bf-to-HEAD Job Quality Investigation -- [Standard] [open-items: yes]
**For next agent:** Full investigation: `Docs/WIP/2026-04-07_f1a372bf_to_HEAD_Job_Quality_Investigation.md`. Priority: Phase C > deploy Phase B > grounding monitoring.
→ Docs/AGENTS/Handoffs/2026-04-07_senior_developer_f1a372bf_to_head_job_quality_investigation.md

---

### 2026-04-07 | Senior Developer | Claude Code (Opus 4.6) | UPQ-1 Phase B Canary Measurement — `helps` -- [Standard] [open-items: yes]
**For next agent:** Phase B is validated and should be kept. The ledger proves the forced iterations are productive. Next target: Stage 3 clustering behavior with larger evidence pools. Full data: `Docs/WIP/2026-04-07_UPQ1_Phase_B_Canary_Measurement.md`.
→ Docs/AGENTS/Handoffs/2026-04-07_senior_developer_upq_1_phase_b_canary_measurement_helps.md

---

### 2026-04-07 | Senior Developer | Claude Code (Opus 4.6) | UPQ-1 Phase B — Per-Claim Researched-Iteration Floor -- [Standard] [open-items: yes]
**For next agent:** The fix targets the exact pattern from Phase A-2 ledger: Plastik AC_01 had 41 seeded/0 researched. After this change, AC_01 must receive at least 1 targeted iteration. The `claimAcquisitionLedger` will show whether the forced iteration produces us...
→ Docs/AGENTS/Handoffs/2026-04-07_senior_developer_upq_1_phase_b_per_claim_researched_iteratio.md

---

### 2026-04-07 | Senior Developer | Claude Code (Opus 4.6) | UPQ-1 Phase A-2 Telemetry Canary Measurement -- [Standard] [open-items: yes]
**For next agent:** The ledger data is in `resultJson.claimAcquisitionLedger`. Key fields: `seededEvidenceItems`, `iterations[].admittedEvidenceItems`, `iterations[].directionCounts`, `finalEvidenceItems`, `finalDirectionCounts`, `maxBoundaryShare`. Full analysis: `D...
→ Docs/AGENTS/Handoffs/2026-04-07_senior_developer_upq_1_phase_a_2_telemetry_canary_measuremen.md

---

### 2026-04-07 | Senior Developer | Codex (GPT-5) | Implement UPQ-1 Phase A-2 Claim-Level Acquisition Telemetry -- [Standard] [open-items: yes]
**For next agent:** The main analysis surface is now `resultJson.claimAcquisitionLedger`. The most relevant code paths are `runResearchIteration()` and `maybeRunSupplementaryEnglishLane()` in `research-orchestrator.ts`, the post-research applicability filter in `clai...
→ Docs/AGENTS/Handoffs/2026-04-07_senior_developer_implement_upq_1_phase_a_2_claim_level_acqui.md

---

### 2026-04-07 | Senior Developer | Codex (GPT-5) | Compare UPQ-1 A-2 Local Canaries Against Deployed And Update Docs -- [Standard] [open-items: yes]
**For next agent:** Use `Docs/WIP/2026-04-07_UPQ1_Phase_A2_Canary_Measurement.md` as the current source of truth. The deployed comparators referenced in this pass are `8ec681050e844becb4ec616eb426731e` (Swiss), `2cf4682c5c914834ac5a58b318c3fc0e` (Plastik), `eb02cd2e5...
→ Docs/AGENTS/Handoffs/2026-04-07_senior_developer_compare_upq_1_a_2_local_canaries_against_de.md

---

### 2026-04-07 | Senior Developer | Codex (GPT-5) | Diagnose Local-vs-Deployed Swiss-EU Treaty Claim Polarity Split -- [Standard] [open-items: yes]
**For next agent:** Focus on Stage 4 prompt/contract calibration, not Stage 2 query tuning. Best root fix is: truthPercentage must stay anchored to the explicit proposition; omitted-context or "normal procedure" arguments should affect `misleadingness`, `limitations`...
→ Docs/AGENTS/Handoffs/2026-04-07_senior_developer_diagnose_local_vs_deployed_swiss_eu_treaty.md

---

### 2026-04-07 | Lead Architect | Codex (GPT-5) | Cross-Review f1a372bf To HEAD Job Quality Investigation -- [Standard] [open-items: yes]
**For next agent:** Start with `Docs/WIP/2026-04-07_f1a372bf_to_HEAD_Job_Quality_Cross_Review.md`. The main corrections to preserve are: do not cite 39/74 as the strict post-baseline range; do not treat deployed `f1a372bf` as a runtime delta commit; do not frame Plas...
→ Docs/AGENTS/Handoffs/2026-04-07_lead_architect_cross_review_f1a372bf_to_head_job_quality_inv.md

---

### 2026-04-07 | Lead Architect | Codex (GPT-5) | Cross-Review Addendum For Hidden Deployed Bundesrat Jobs -- [Standard] [open-items: yes]
**For next agent:** The updated cross-review now reflects the correct combined position: public-visible strict range remains `21` local / `6` deployed, but the deployed analytical record for the Bundesrat family is larger because of the hidden addendum. Use that spli...
→ Docs/AGENTS/Handoffs/2026-04-07_lead_architect_cross_review_addendum_for_hidden_deployed_bun.md

---

### 2026-04-06 | Senior Developer | Claude Code (Sonnet 4.6) | UPQ-1 Cross-Review — Resequenced Phase A Soundness -- [Standard] [open-items: yes]
**For next agent:** Required plan change: `generateResearchQueries()` must filter `existingEvidence` to items where `relevantClaimIds.includes(claim.id)` before building the summary. This is a one-liner but critical for correctness. Full review text is in the chat re...
→ Docs/AGENTS/Handoffs/2026-04-06_senior_developer_upq_1_cross_review_resequenced_phase_a_soun.md

---

### 2026-04-06 | Senior Developer | Claude Code (Opus 4.6) | Cross-Boundary Tension Investigation -- [Standard] [open-items: yes]
**For next agent:** Fix 1: `aggregation-stage.ts:388` — add `aggregation` and `evidenceSummary` variables. Fix 2: `verdict-stage.ts:1022` — either have reconciler return updated boundaryFindings, or derive post-reconciliation boundary summary. Fix 3: tighten VERDICT_...
→ Docs/AGENTS/Handoffs/2026-04-06_senior_developer_cross_boundary_tension_investigation.md

---

### 2026-04-06 | Research | Claude Code (Sonnet 4.6) | Cross-Boundary Tension Analysis — All Deployed Jobs -- [Standard] [open-items: no]
**For next agent:** See Section 4 of the report below for the comparison finding. Short version: average tensions are higher on the current commit (2.00 vs 0.44), but this is almost certainly topic-driven rather than a pipeline regression — the previous commit's 9 jo...
→ Docs/AGENTS/Handoffs/2026-04-06_research_cross_boundary_tension_analysis_all_deployed_jobs.md

---

### 2026-04-06 | Senior Developer | Codex (GPT-5) | Compare Live Deployed `2ec54047` Jobs vs `b7783872` Baseline -- [Standard] [open-items: yes]
**For next agent:** If you need higher confidence on `2ec54047`, submit fresh deployed reruns for the Apr 5 baseline families (`Plastik`, `Bolsonaro EN`, `Earth`, `Meta`, `Swiss vs Germany`) and compare against the `b7783872` batch already documented in `Docs/WIP/202...
→ Docs/AGENTS/Handoffs/2026-04-06_senior_developer_compare_live_deployed_2ec54047_jobs_vs_b778.md

---

### 2026-04-06 | Senior Developer | Codex (GPT-5) | Trace Cross-Boundary Tensions Code Path And Regression Risk -- [Standard] [open-items: yes]
**For next agent:** Highest-leverage fixes are: align the Stage 5 prompt contract with actual variables and add a Stage 5 prompt-contract test; stop using stale advocate `boundaryFindings` for final narrative generation by either recomputing them after reconciliation...
→ Docs/AGENTS/Handoffs/2026-04-06_senior_developer_trace_cross_boundary_tensions_code_path_and.md

---

### 2026-04-06 | Generalist | Codex (GPT-5) | Local Current Commit Tension Investigation -- [Standard] [open-items: yes]
**For next agent:** Anchor jobs: current `bf502af1`, `02891ccb`, `f712efca`, `ff198492`; comparisons `7d2b91b5`, `da3f0cea`, `e65b9591`, `c4a4c606`, `345d6487`, `da1180ed`, `5e93d734`, `52fcb624`, `703c261d`. Key references are the optional concise `boundaryDisagreem...
→ Docs/AGENTS/Handoffs/2026-04-06_generalist_local_current_commit_tension_investigation.md

---

### 2026-04-06 | Senior Developer | Codex (GPT-5) | Consolidate Current vs Previous Deployment Cross-Boundary Tensions Investigation -- [Standard] [open-items: yes]
**For next agent:** Start from `Docs/WIP/2026-04-06_Cross_Boundary_Tensions_Current_vs_Previous_Deployment_Investigation.md`. The three supporting debate threads already concluded: deployed current jobs do show more visible tensions; local current jobs do not show a ...
→ Docs/AGENTS/Handoffs/2026-04-06_senior_developer_consolidate_current_vs_previous_deployment.md

---

### 2026-04-06 | Senior Developer | Codex (GPT-5) | Review Stage-5 Tension Fix Follow-Ups And Update Docs -- [Standard] [open-items: yes]
**For next agent:** The docs now consistently point to `08220154` + `2acc4545` as the shipped Stage-5 first-pass cleanup. Start measurement from the two WIP files dated 2026-04-06 and the new `NARR-1` backlog entry.
→ Docs/AGENTS/Handoffs/2026-04-06_senior_developer_review_stage_5_tension_fix_follow_ups_and_u.md

---

### 2026-04-06 | Senior Developer | Codex (GPT-5) | Close Stage-5 Fix 2 As Deferred And Propose Upstream Quality Workstream -- [Standard] [open-items: yes]
**For next agent:** Start from `Docs/WIP/2026-04-06_Upstream_Report_Quality_Workstream_Proposal.md`. The active question is no longer narrative calibration; it is how to instrument and improve Stage 2/3 claim-level evidence quality without reopening rejected heuristi...
→ Docs/AGENTS/Handoffs/2026-04-06_senior_developer_close_stage_5_fix_2_as_deferred_and_propose.md

---

### 2026-04-06 | Senior Developer | Codex (GPT-5) | Investigate Current Wikipedia Integration Status And Next Steps -- [Standard] [open-items: yes]
**For next agent:** Source of truth is the live code, not the older concept doc. Start with `apps/web/src/lib/web-search.ts`, `apps/web/src/lib/search-wikipedia.ts`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, `apps/web/src/lib/analyzer/claim-extraction-sta...
→ Docs/AGENTS/Handoffs/2026-04-06_senior_developer_investigate_current_wikipedia_integration_s.md

---

### 2026-04-05 | Senior Developer | Claude Code (Opus 4.6) | sufficiencyMinMainIterations Experiment + AC_02 Check — Deploy -- [Standard] [open-items: yes]
**For next agent:** AC_02 check confirms genuine source scarcity, not starvation. AC_02 gets zero seeded items in both local AND deployed. Its 14 vs 21 item gap is proportional to iteration count (4 vs 6), driven by Stage 1 event-count variance (5 vs 7 distinct event...
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_sufficiencyminmainiterations_experiment_ac.md

---

### 2026-04-05 | LLM Expert | Codex (GPT-5) | Review Keep-or-Revert Decision for 07cb2e0d -- [Standard] [open-items: yes]
**For next agent:** If you need to resolve the remaining uncertainty efficiently, run one controlled same-input multi-jurisdiction A/B canary with this line toggled and compare only the generated queries plus first-iteration retrieval coverage per listed jurisdiction...
→ Docs/AGENTS/Handoffs/2026-04-05_llm_expert_review_keep_or_revert_decision_for_07cb2e0d.md

---

### 2026-04-05 | Senior Developer | Claude Code (Opus 4.6) | Bolsonaro EN & Plastik DE Local Quality Investigation + Fix -- [Standard] [open-items: yes]
**For next agent:** Fix is committed (`cbb364ec`). Next step is rerunning local Bolsonaro EN and Plastik DE canaries to validate. If grounding warnings disappear and verdicts are stable, Plastik is deployment-ready; Bolsonaro needs the retrieval-depth check.
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_bolsonaro_en_plastik_de_local_quality_inves.md

---

### 2026-04-05 | Senior Developer | Claude Code (Opus 4.6) | Post-Review Fixes (3 items) -- [Standard] [open-items: no]
**For next agent:** All three fixes are self-contained. No follow-up work needed unless validation runs reveal regression.
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_post_review_fixes_3_items.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Refine Grounding Validator Prompt for Remaining False Positives -- [Standard] [open-items: yes]
**For next agent:** After prompt rollout, re-run the Swiss-vs-Germany canary and one of the previously affected production claims (`38d576...` or `d0c115...` family) and compare the warning text against the three false-positive buckets documented in WIP section 5.10....
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_refine_grounding_validator_prompt_for_remai.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Fix Residual Grounding Noise: Source Backfill, Validator Context, Citation Repair -- [Standard] [open-items: yes]
**For next agent:** Start with fresh local canaries on the current branch before any deploy decision. Watch especially for the prior `isdglobal.org` empty-`sourceId` pattern and the Plastik AC_02 reasoning/array mismatch family. Verification passed: `npm -w apps/web ...
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_fix_residual_grounding_noise_source_backfil.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Replace Citation Repair with Single-Citation-Channel Root Fix -- [Standard] [open-items: yes]
**For next agent:** Fresh local canaries on prompt hash `79f7e76fa9c624f8256464739b2eb73d9b0ab065f9462190b8e7aa0e50ee1bd4` succeeded: `51751fbc88bb4489a9955f4baf011945` (Meta) finished `TRUE 92/85` with no `verdict_grounding_issue`; `c4a4c60612ff48f0a3dbb8da764fb0ab`...
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_replace_citation_repair_with_single_citatio.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Align Challenger and Grounding Prompts with Single-Citation-Channel Contract -- [Standard] [open-items: yes]
**For next agent:** The prompt contract tests now explicitly cover challenger prose and the defensive legacy wording in grounding validation. Verification passed: `npm -w apps/web exec vitest run test/unit/lib/analyzer/verdict-prompt-contract.test.ts`, `npm test`, an...
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_align_challenger_and_grounding_prompts_with.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Update Status Docs After Grounding Root Fix -- [Standard] [open-items: yes]
**For next agent:** If these doc updates are committed, keep `GRND-1` in MONITOR status until the first 7+ runs and deployed validation are reviewed. The next substantive plan/doc changes should likely focus on the Stage 2/3 boundary-concentration track.
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_update_status_docs_after_grounding_root_fix.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Run 5-Input Local-vs-Deployed Quality Gate -- [Standard] [open-items: yes]
**For next agent:** Batch job IDs were local `7849614707f941a4822120a8c32976a4`, `345d6487f2344923b0eeeb3b7ce1ca4d`, `52fcb6244a0145a999d9a5279b019912`, `e65b95916b594a90bfe72f31b04304cd`, `039b105677a54ccdbc7ef0e5da9c03d2`; deployed `3e1253cb79a44389b86d0c47ab734f13...
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_run_5_input_local_vs_deployed_quality_gate.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Reframe Batch as Build-over-Build Comparison -- [Standard] [open-items: yes]
**For next agent:** Local current-build batch: Earth `78496147`, Plastik `345d6487`, Bolsonaro `52fcb624`, Swiss/DE `e65b9591`, Meta `039b1056`. Deployed current-build batch: Earth `3e1253cb`, Plastik `80bbcc3d`, Bolsonaro `eb02cd2e`, Swiss/DE `9042bb73`, Meta `3f00b...
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_reframe_batch_as_build_over_build_compariso.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Write WIP Build Comparison Note -- [Standard] [open-items: yes]
**For next agent:** Use the WIP note as the canonical comparison reference for this batch instead of rephrasing from memory. It already contains the exact current job IDs and the comparator caveats.
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_write_wip_build_comparison_note.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Add Traffic-Light Status to WIP Comparison Note -- [Standard] [open-items: no]
**For next agent:** If this note is migrated into status docs, preserve both the legend and the separation between build-over-build and current local-vs-deployed sections.
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_add_traffic_light_status_to_wip_comparison.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Make WIP Comparison Colors Visible in Plain Markdown -- [Standard] [open-items: no]
**For next agent:** If you need real colored boxes later, this will need xWiki macros or HTML/CSS in a different rendering context rather than plain markdown tables.
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_make_wip_comparison_colors_visible_in_plain.md

---

### 2026-04-05 | Senior Developer | Codex (GPT-5) | Check Whether Older Ahead-of-Deploy Commits Caused Local Quality Decline -- [Standard] [open-items: yes]
**For next agent:** The main conclusion is negative attribution: none of the older commits ahead of deployed currently has evidence of causing the local quality decline. If further causality work is needed, investigate later commits (`81e7ddc4`, `07cb2e0d`) only wher...
→ Docs/AGENTS/Handoffs/2026-04-05_senior_developer_check_whether_older_ahead_of_deploy_commits.md

---

### 2026-04-05 | Senior Developer | Claude Code (Opus 4.6) | Grounding Alias Fix — Validated -- [Significant] [open-items: yes]
**For next agent:** Full handoff: `Docs/AGENTS/Handoffs/2026-04-05_Senior_Developer_Grounding_Alias_Fix_Validation.md`. Clean canary jobs: Bolsonaro `703c261d05744fdf8ddc70ce3afa5145` (LEANING-TRUE 64/58, zero grounding/direction warnings), Plastik `da1180edfae445f8a...
→ Docs/AGENTS/Handoffs/2026-04-05_Senior_Developer_Grounding_Alias_Fix_Validation.md

---

### 2026-04-04 | Lead Architect | Claude Code (Opus 4.6) | Source Provenance Tracking Design -- [Standard] [open-items: yes]
**For next agent:** Read `Docs/WIP/2026-04-04_Source_Provenance_Tracking_Design.md` for the full design. Start with Phase 1 (section 4, "Phase 1 — Provenance Extraction + Telemetry"). Key integration points: `research-extraction-stage.ts` (extraction schema), `verdic...
→ Docs/AGENTS/Handoffs/2026-04-04_lead_architect_source_provenance_tracking_design.md

---

### 2026-04-04 | Product Strategist | Codex (GPT-5) | Funding Presentation Rewrite -- [Standard] [open-items: yes]
**For next agent:** Keep this page short and donor/partner-facing. Detailed partner sequencing, funder timing, and internal readiness notes belong in `Cooperation Opportunities`, `Academic Cooperation`, `Docs/Knowledge`, and `Docs/WIP`, not back in this presentation.
→ Docs/AGENTS/Handoffs/2026-04-04_product_strategist_funding_presentation_rewrite.md

---

### 2026-04-04 | Code Reviewer | Codex (GPT-5) | Documentation Currency Check For Solution And Plan Docs -- [Standard] [open-items: yes]
**For next agent:** If asked to update docs, start with `Docs/WIP/2026-03-26_Plastik_UNVERIFIED_Solution_Proposal.md`, `Docs/WIP/README.md`, `Docs/STATUS/Current_Status.md`, and `Docs/STATUS/Backlog.md`. Preserve the historical analysis, but add a clear outcome/super...
→ Docs/AGENTS/Handoffs/2026-04-04_code_reviewer_documentation_currency_check_for_solution_and.md

---

### 2026-04-04 | Product Strategist | Codex (GPT-5) | Tighten Funding Presentation Around Immediate Support Routes -- [Standard] [open-items: yes]
**For next agent:** If you expand this work, keep this page donor-facing and concise. Put detailed opportunity tracking, eligibility nuance, and call calendars on `Docs/xwiki-pages/FactHarbor/Organisation/Strategy/Cooperation Opportunities/WebHome.xwiki`. If you need...
→ Docs/AGENTS/Handoffs/2026-04-04_product_strategist_tighten_funding_presentation_around_immed.md

---

### 2026-04-04 | Product Strategist | Codex (GPT-5) | Sync Internal Cooperation Plan And Knowledge Summary -- [Standard] [open-items: yes]
**For next agent:** If another doc still says `Full Fact` is the immediate `#1` cooperation target or `NLnet` is already closed as of April 2026, treat that as stale unless it is clearly marked as historical background. The current internal source of truth is `Cooper...
→ Docs/AGENTS/Handoffs/2026-04-04_product_strategist_sync_internal_cooperation_plan_and_knowle.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Boundary Concentration vs Grounding Priority Plan -- [Standard] [open-items: yes]
**For next agent:** Start with `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md`. Review whether the ordering is right: validation gate first, Stage 2/3 root-cause track second, grounding containment third. If approved, the first concre...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_boundary_concentration_vs_grounding_priorit.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Apply Sonnet Review To Boundary/Grounding Plan -- [Standard] [open-items: yes]
**For next agent:** Use the revised ordering in the WIP plan: `validation gate -> Track A root-cause stabilization + Track B grounding containment in parallel`. Do not revert to a strictly sequential order unless new evidence disproves the independent grounding failu...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_apply_sonnet_review_to_boundary_grounding_p.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Execute First Local Same-Commit Validation Gate Pass -- [Standard] [open-items: yes]
**For next agent:** Resume from the WIP plan’s new execution-status section. Restore Anthropic credits first, then rerun the exact same local canary matrix from a cleared-cache starting point: Bolsonaro EN, Plastik DE, `Ist die Erde rund?`, then the warm pass. Only a...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_execute_first_local_same_commit_validation.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Resume Validation Batch After Credit Restoration -- [Standard] [open-items: yes]
**For next agent:** Start from the WIP doc’s new rerun-status sections. The next step is not more analytical comparison; it is stabilizing the local run environment so a serial batch can execute on one fixed build/commit. Once that is achieved, rerun the same canary ...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_resume_validation_batch_after_credit_restor.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Priority Debate On Verdict Grounding Vs Retrieval/Clustering -- [Standard] [open-items: yes]
**For next agent:** Start with `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/src/lib/analyzer/warning-display.ts`, `apps/web/src/components/FallbackReport.tsx`, `apps/web/src/lib/config-schemas.ts`, `Docs/STATUS/Current_Status.md`, and `Docs/WIP/2026-03-30_...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_priority_debate_on_verdict_grounding_vs_ret.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Source Provenance Tracking Design Review -- [Standard] [open-items: yes]
**For next agent:** Start with `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/analyzer/research-extraction-stage.ts`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, `apps/web/src/lib/analyzer/aggregation-stage.ts`, `apps/web/src/lib/analyzer/verdict-s...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_source_provenance_tracking_design_review.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Audit Provenance Documentation Currency -- [Standard] [open-items: yes]
**For next agent:** If asked to make the docs current, update `Docs/WIP/README.md` under future proposals, add a short “historical review input, not the active plan” note for `Docs/WIP/2026-04-04_Source_Provenance_GPT_Review_Prompt.md`, and optionally clean minor dri...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_audit_provenance_documentation_currency.md

---

### 2026-04-04 | LLM Expert | Codex (GPT-5) | Retrieval Documentation Currency Check -- [Standard] [open-items: yes]
**For next agent:** If asked to refresh docs, focus first on `Docs/Specification/Multi_Source_Evidence_Retrieval.md` and `Docs/WIP/2026-03-26_Next_Workstream_Decision.md`. Preserve the current April docs as the canonical retrieval planning sources unless newer design...
→ Docs/AGENTS/Handoffs/2026-04-04_llm_expert_retrieval_documentation_currency_check.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Make Commit Hash Live And Visible Across API/Web -- [Standard] [open-items: yes]
**For next agent:** Local verification succeeded with both endpoints reporting the same live build id: `http://localhost:5000/version` and `http://localhost:3000/api/version` now return `git_sha = 5f666979...+469a7968`. Use this patch as the current provenance baseli...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_make_commit_hash_live_and_visible_across_ap.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Investigate Executed Web Commit Hash Confusion -- [Standard] [open-items: yes]
**For next agent:** If the team wants to repair this, the right fix is not "make the hash more stable" globally. It is to add a second, analysis-scoped execution fingerprint for validation use, while keeping the existing visible hash for whole-repo build provenance. ...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_investigate_executed_web_commit_hash_confus.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Assess Whether Latest Deployment Caused Observed Degradation -- [Standard] [open-items: yes]
**For next agent:** If asked whether to revert the Wikipedia supplementary deployment, the best current answer is no. The current priority should remain Stage 2/3 retrieval-boundary stabilization plus narrow verdict-grounding containment, while local execution stabil...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_assess_whether_latest_deployment_caused_obs.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Compare Newest Local And Deployed Quality Jobs -- [Standard] [open-items: yes]
**For next agent:** Treat `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md` as updated. If asked what to fix next, the best answer is still: stabilize local execution enough to satisfy the validation gate, then pursue Stage 2/3 retrieva...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_compare_newest_local_and_deployed_quality_j.md

---

### 2026-04-04 | LLM Expert | Codex (GPT-5) | Refresh Stale Retrieval Docs -- [Standard] [open-items: yes]
**For next agent:** Treat the current retrieval planning sources as `Docs/WIP/2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md`, `Docs/WIP/2026-04-03_Wikipedia_Supplementary_Completion_Plan.md`, `Docs/STATUS/Backlog.md`, and `Docs/STATUS/Current_Status.md`...
→ Docs/AGENTS/Handoffs/2026-04-04_llm_expert_refresh_stale_retrieval_docs.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Check Boundary/Grounding Documentation Currency -- [Standard] [open-items: yes]
**For next agent:** Treat `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md` as current. Use `Docs/WIP/README.md` as the discovery entry point; it now points to the plan. Do not infer from older `Agent_Outputs` entries that grounding is ...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_check_boundary_grounding_documentation_curr.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Complete Same-Commit Local Validation Gate -- [Standard] [open-items: yes]
**For next agent:** Use the three same-commit jobs above as the current local baseline. Treat `verdict_grounding_issue` as the most clearly reproduced local defect on the current build. Treat earlier local mega-boundary outliers as historical/noisy signals unless the...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_complete_same_commit_local_validation_gate.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Refresh Provenance Doc Labels And Index -- [Standard] [open-items: yes]
**For next agent:** Treat `Docs/WIP/2026-04-04_Source_Provenance_Tracking_Design.md` as the current plan and `Docs/WIP/2026-04-04_Source_Provenance_GPT_Review_Prompt.md` as review history only.
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_refresh_provenance_doc_labels_and_index.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Refresh Status And xWiki Planning Docs -- [Standard] [open-items: yes]
**For next agent:** Treat `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, and the two updated xWiki pages as the refreshed top-level references. If further doc cleanup is requested, next targets should be older deep-dive/spec pages rather than these entry-...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_refresh_status_and_xwiki_planning_docs.md

---

### 2026-04-04 | Agents Supervisor | Codex (GPT-5) | Close Agent Rules Cleanup Documentation Gap -- [Standard] [open-items: yes]
**For next agent:** If governance-history docs are referenced in future reviews, use `Docs/ARCHIVE/2026-04-04_Agent_Rules_Cleanup_Closure_Summary.md` first, then the archived plan/report for underlying rationale.
→ Docs/AGENTS/Handoffs/2026-04-04_agents_supervisor_close_agent_rules_cleanup_documentation_ga.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | WIP Consolidation #9 -- [Standard] [open-items: yes]
**For next agent:** Treat the archived remap/direction/fetch/Wikipedia docs as historical records under `Docs/ARCHIVE/`. Treat `Docs/WIP/2026-03-27_Internet_Outage_Resilience_Plan.md` and `Docs/WIP/2026-03-27_Bolsonaro_efc5e66f_Single_Source_Flooding_Investigation.md...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_wip_consolidation_9.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Fix Comparative Geography Evidence Starvation -- [Standard] [open-items: yes]
**For next agent:** After deployment or local queue drain, re-run the exact Swiss-vs-Germany claim and confirm that AC_02 now receives Germany evidence, the `evidence_applicability_filter` warning drops or disappears, and the article no longer collapses to `UNVERIFIE...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_fix_comparative_geography_evidence_starvati.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Make Job/API Commit Hash Live Per New Commit -- [Standard] [open-items: yes]
**For next agent:** Verify production picks this up after the next deploy/restart by checking `/version` and one freshly created job. If future validation needs analyzer-only provenance, add a second scoped fingerprint rather than changing this whole-repo build id ag...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_make_job_api_commit_hash_live_per_new_commi.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Scope Grounding Validation to Claim-Local Context -- [Standard] [open-items: yes]
**For next agent:** Re-run the Swiss-vs-Germany local success case (`c3a19e4ca612445a8e32cb330da604f8`) or a fresh equivalent and inspect whether the prior `S_015/S_016`-style warning is gone. If any grounding warning remains, compare it against the new three-tier ru...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_scope_grounding_validation_to_claim_local_c.md

---

### 2026-04-04 | Senior Developer | Codex (GPT-5) | Document Local vs Deployed Grounding Canary Results -- [Standard] [open-items: yes]
**For next agent:** Use the new section 6 in `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md` as the current source of truth for the local/deployed status split. The next operational step is a fresh production rerun of the same claim a...
→ Docs/AGENTS/Handoffs/2026-04-04_senior_developer_document_local_vs_deployed_grounding_canary.md

---

### 2026-04-03 | Senior Developer | Claude Code (Opus) | Wikipedia Supplementary Completion -- [Standard] [open-items: yes]
**For next agent:** Feature is complete. If deeper Wikipedia-specific behavior is desired (reference extraction, provider-specific query variants), see `Docs/WIP/2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md` §2-3.
→ Docs/AGENTS/Handoffs/2026-04-03_senior_developer_wikipedia_supplementary_completion.md

---

### 2026-04-03 | Product Strategist | Codex (GPT-5) | Cooperation Opportunities Strategy Rewrite -- [Standard] [open-items: yes]
**For next agent:** Treat `Cooperation Opportunities` as the decision page and keep detailed partner/funder background in the funding presentation, academic cooperation presentation, and `Docs/Knowledge`. If new partner evidence arrives, update the short tables and s...
→ Docs/AGENTS/Handoffs/2026-04-03_product_strategist_cooperation_opportunities_strategy_rewrit.md

---

### 2026-04-03 | Senior Developer | Codex (GPT-5) | Fix False Orphan Requeue On Local Runner -- [Standard] [open-items: yes]
**For next agent:** Start with one fresh local job, not a batch. If a new duplicate run appears, inspect `JobEvents` first. `Done -> Re-queued after application restart (previous execution lost)` should now be much harder to reproduce locally. If you ever see that se...
→ Docs/AGENTS/Handoffs/2026-04-03_senior_developer_fix_false_orphan_requeue_on_local_runner.md

---

### 2026-04-03 | Senior Developer | Codex (GPT-5) | Fix Misleading Repeated Phase Blocks In Job Timeline -- [Standard] [open-items: yes]
**For next agent:** If the user still reports "restart-like" visuals, query the specific job in `factharbor.db` before touching runner code. Count `Runner started`, `Re-queued after application restart%`, and `Job interrupted by server restart.%` for that job. If tho...
→ Docs/AGENTS/Handoffs/2026-04-03_senior_developer_fix_misleading_repeated_phase_blocks_in_job.md

---

### 2026-04-03 | Senior Developer | Codex (GPT-5) | Fix Stage-4 Advocate Parse Failure From Unescaped Inner Quotes -- [Standard] [open-items: yes]
**For next agent:** If another `VERDICT_ADVOCATE` parse failure appears, fetch `/api/fh/metrics/{jobId}` with `X-Admin-Key` and check `parseFailureArtifact.recoveriesAttempted`. New quote-family failures should now show `inner_quote_repair` in the attempted chain and...
→ Docs/AGENTS/Handoffs/2026-04-03_senior_developer_fix_stage_4_advocate_parse_failure_from_une.md

---

### 2026-04-03 | Senior Developer | Codex (GPT-5) | Refresh Wikipedia WIP Scope And Add Narrow Completion Plan -- [Standard] [open-items: yes]
**For next agent:** Start from `Docs/WIP/2026-04-03_Wikipedia_Supplementary_Completion_Plan.md`, not from the archived large architecture doc. Keep the reopening narrow: no reference extraction, no Semantic Scholar redesign, no special aggregation heuristics. Validat...
→ Docs/AGENTS/Handoffs/2026-04-03_senior_developer_refresh_wikipedia_wip_scope_and_add_narrow.md

---

### 2026-04-03 | Senior Developer | Codex (GPT-5) | Add Supplementary Provider Usage Recommendations To WIP Docs -- [Standard] [open-items: yes]
**For next agent:** If implementation proceeds, preserve the distinction now documented in WIP: Wikipedia is the bounded default-on supplementary source; Semantic Scholar and Google Fact Check remain targeted optional discovery providers until their deeper integratio...
→ Docs/AGENTS/Handoffs/2026-04-03_senior_developer_add_supplementary_provider_usage_recommenda.md

---

### 2026-04-03 | Senior Developer | Codex (GPT-5) | Implement Bounded Default-On Wikipedia Supplementary Search -- [Standard] [open-items: yes]
**For next agent:** Validate serially on German Plastik, English Plastik, and one stable control. Check whether Wikipedia contributes bounded additional domains without flooding and whether disabling `search.providers.wikipedia.enabled` cleanly restores the pre-chang...
→ Docs/AGENTS/Handoffs/2026-04-03_senior_developer_implement_bounded_default_on_wikipedia_supp.md

---

### 2026-04-02 | Lead Architect | Codex (GPT-5) | Stage-4 Payload Simplification -- [Standard] [open-items: yes]
**For next agent:** Verify advocate `promptTokens`, `schemaCompliant`, retry firing, and final verdict/confidence on the live reruns. If parse failures persist after this simplification, the next investigation should focus on remaining Stage-4 output-shape failure ar...
→ Docs/AGENTS/Handoffs/2026-04-02_lead_architect_stage_4_payload_simplification.md

---

### 2026-04-02 | Investigator | Codex (GPT-5) | Plastik DE Stage-4 Prompt/Contract Parse Failure Review -- [Standard] [open-items: yes]
**For next agent:** Inspect [claimboundary.prompt.md](C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md#L879), [verdict-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-stage.ts#L580), [verdict-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyz...
→ Docs/AGENTS/Handoffs/2026-04-02_investigator_plastik_de_stage_4_prompt_contract_parse_failur.md

---

### 2026-04-02 | Investigator | Codex (GPT-5) | Plastik Stage-4 Runtime/Artifact Failure Review -- [Standard] [open-items: yes]
**For next agent:** Most relevant runtime anchors are the DB rows/events/metrics for `b4678284c7e042f986211a5311aaa828`, `d460554f6b9549008a1f6e00c542b508`, `a695d0bc0fb745a2a6ebeccc0f8ec206`, `0ee67d3d3285418a813ed0dcf8ab06a4`, `d64adbaf52eb4953ba1bea596015a52d`, `7...
→ Docs/AGENTS/Handoffs/2026-04-02_investigator_plastik_stage_4_runtime_artifact_failure_review.md

---

### 2026-04-02 | Lead Architect | Codex (GPT-5) | German Plastik Stage-4 Parse Failure Reassessment -- [Standard] [open-items: yes]
**For next agent:** Anchor evidence: failing jobs `d460554f6b9549008a1f6e00c542b508`, `f279d6d32ccf49fb9d4843cee487e9bb`, `b4678284c7e042f986211a5311aaa828`; successful comparators `a695d0bc0fb745a2a6ebeccc0f8ec206`, `0ee67d3d3285418a813ed0dcf8ab06a4`, `513e99539b3b4...
→ Docs/AGENTS/Handoffs/2026-04-02_lead_architect_german_plastik_stage_4_parse_failure_reassess.md

---

### 2026-04-02 | Lead Architect | Codex (GPT-5) | German Plastik Variability Split Diagnosis -- [Standard] [open-items: yes]
**For next agent:** Anchor jobs for comparison: `974a754643d747c78de620558f26dd32`, `c86a3e4bb02349e3b316ea8e7dff095c`, `bc7f2cafc8fb4ea09267e18cf2a5f409`, `22c950cba66c4f18bfc280466c8f57d2`. Inspect `resultJson.searchQueries`, `resultJson.sources`, `resultJson.claim...
→ Docs/AGENTS/Handoffs/2026-04-02_lead_architect_german_plastik_variability_split_diagnosis.md

---

### 2026-04-02 | Investigator | Codex (GPT-5) | Funding Section Expansion and Reframe -- [Standard] [open-items: yes]
**For next agent:** Relevant section now lives in `Docs/xwiki-pages/FactHarbor/Organisation/Strategy/Cooperation Opportunities/WebHome.xwiki` around the `3. FUNDING OPPORTUNITIES` block. If continuing, the highest-value follow-up is editorial tightening, not more lis...
→ Docs/AGENTS/Handoffs/2026-04-02_investigator_funding_section_expansion_and_reframe.md

---

### 2026-04-02 | Investigator | Codex (GPT-5) | Funding Section Editorial Pass -- [Standard] [open-items: yes]
**For next agent:** If you continue editing the same section, protect the current separation between `Funding Opportunities`, `Funding Precedents`, and `Community Funding`. The section is now easier to scan; additional expansion will quickly make it too dense unless ...
→ Docs/AGENTS/Handoffs/2026-04-02_investigator_funding_section_editorial_pass.md

---

### 2026-04-02 | Senior Developer | Claude Code (Opus 4.6) | Stage-4 Parse Failure Diagnostic Artifact Capture -- [Standard] [open-items: yes]
**For next agent:** After the next failing Plastik run, inspect the artifacts via `GET /api/fh/metrics/{jobId}` and search for `parseFailureArtifact` in the `llmCalls` array. The `rawPrefix` and `rawSuffix` should reveal whether the failure is trailing commentary, in...
→ Docs/AGENTS/Handoffs/2026-04-02_senior_developer_stage_4_parse_failure_diagnostic_artifact_c.md

---

### 2026-04-02 | Senior Developer | Claude Code (Opus 4.6) | Metrics API Admin-Key Enforcement -- [Standard] [open-items: yes]
**For next agent:** The metrics API is now admin-only. If you add new metrics endpoints, follow the same pattern: `if (!AuthHelper.IsAdminKeyValid(Request)) return Unauthorized(...)`.
→ Docs/AGENTS/Handoffs/2026-04-02_senior_developer_metrics_api_admin_key_enforcement.md

---

### 2026-04-02 | Senior Developer | Codex (GPT-5) | German Plastik Reproduction Reset + Rubric Contract Fix -- [Standard] [open-items: yes]
**For next agent:** Start with one fresh single German Plastik run on current code after the last build/reseed. Check `/api/fh/metrics/{jobId}` with `X-Admin-Key` for `taskType='verdict' AND schemaCompliant=false`. If `EXPLANATION_QUALITY_RUBRIC` still shows `${narra...
→ Docs/AGENTS/Handoffs/2026-04-02_senior_developer_german_plastik_reproduction_reset_rubric_co.md

---

### 2026-04-02 | Senior Developer | Codex (GPT-5) | Restore Local Runner Serial Mode For Debugging -- [Standard] [open-items: yes]
**For next agent:** Assume the currently running local web stack is serial (`FH_RUNNER_MAX_CONCURRENCY=1`). Do not interpret improvements from the next Plastik runs as proof that the underlying concurrency issue is fixed globally; they only remove one local confound....
→ Docs/AGENTS/Handoffs/2026-04-02_senior_developer_restore_local_runner_serial_mode_for_debugg.md

---

### 2026-04-01 | LLM Expert | Codex (GPT-5) | Multilingual Docs Sync After Review Fixes -- [Significant] [open-items: yes]
**For next agent:** Use `Docs/AGENTS/Handoffs/2026-04-01_LLM_Expert_Multilingual_Output_Search_Review_Validation_Status.md` as the current validation gate. Earlier review findings in the prior 2026-04-01 entry are historical and no longer open.
→ Docs/AGENTS/Handoffs/2026-04-01_LLM_Expert_Multilingual_Output_Search_Review_Validation_Status.md

---

### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7 Status And E2 Measurement Plan — [Standard] [open-items: yes]
**For next agent:** Phase 7 is already past planning: E1 V5 and E2 log-only are both on `main`. Do not keep changing prompts/stages. Write the missing E1 status note and run/document the E2 35-run batch from current HEAD before any Shape B or Opus decision.
→ Docs/AGENTS/Handoffs/2026-04-14_lead_developer_lead_architect_current_work_and_plan_takeover.md

---

### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Current Work And Plan Takeover — [Standard] [open-items: yes]
**For next agent:** Active workstream is Phase 7. E1 V5 and E2 log-only stage are already on `main`; no committed Phase 7 measurement doc exists yet. Next recommended step is to stop changing code, write the missing measurement ledger, then run and record the E2 35-run batch on current HEAD.
→ Docs/AGENTS/Handoffs/2026-04-14_lead_developer_lead_architect_current_work_and_plan_takeover.md

---

### 2026-04-13 | Lead Architect + LLM Expert | Codex (GPT-5) | Phase 7 Salience-First Charter Review — [Standard] [open-items: yes]
**For next agent:** Before executing E1, fix two charter issues: E1 currently claims "no schema/code change" while requiring a new Pass 2 reasoning field, and the E2 precision metric has no negative-control inputs in the proposed corpus.
→ Docs/AGENTS/Handoffs/2026-04-13_lead_architect_llm_expert_phase7_salience_first_charter_review.md

---

### 2026-04-13 | Lead Architect + LLM Expert | Codex (GPT-5) | C16 Replay Review Round 2 — [Standard] [open-items: yes]
**For next agent:** The corrected doc math now matches the DB, but `Docs/WIP/2026-04-13_C16_R2_Combined_Replay_Analysis.md` still has one internal mismatch: line 66 says extractor anchor loss is `4/6`, while the partition table correctly shows `3/6` with `d5a7dc33` counted as `validator_unavailable`.
→ Docs/AGENTS/Handoffs/2026-04-13_lead_architect_llm_expert_c16_replay_review_round2.md

---

### 2026-04-13 | Lead Architect + LLM Expert | Codex (GPT-5) | C16 Combined Replay Review — [Standard] [open-items: yes]
**For next agent:** Recompute `Docs/WIP/2026-04-13_C16_R2_Combined_Replay_Analysis.md` using the exact locked R2 input only. The current doc mixes `unterschreibt` and `unterschrieb`, mislabels `0ce78ee9` as a full pass, and overstates the pre-C16 delta.
→ Docs/AGENTS/Handoffs/2026-04-13_lead_architect_llm_expert_c16_combined_replay_review.md

---

### 2026-04-01 | LLM Expert | Codex (GPT-5) | Multilingual Output/Search Review + Validation Plan + Status Sync -- [Significant] [open-items: yes]
**For next agent:** Use `Docs/AGENTS/Handoffs/2026-04-01_LLM_Expert_Multilingual_Output_Search_Review_Validation_Status.md` as the main summary of residual risks and the validation gate. The most important next work is validation and Stage-2 hardening, not additional...
→ Docs/AGENTS/Handoffs/2026-04-01_LLM_Expert_Multilingual_Output_Search_Review_Validation_Status.md

---

### 2026-04-01 | Lead Architect | Gemini 3.1 Pro | Stage 1 Narrow Hardening - Code Review -- [Standard] [open-items: yes]
**For next agent:** The repository is clean. Proceed to the next item since the narrow hardening has officially merged into the post-rollback baseline.
→ Docs/AGENTS/Handoffs/2026-04-01_lead_architect_stage_1_narrow_hardening_code_review.md

---

### 2026-04-01 | Lead Architect | Gemini 3.1 Pro | Stage 1 Narrow Hardening - Architect Review -- [Standard] [open-items: yes]
**For next agent:** Read Docs/WIP/2026-04-01_Stage1_Narrow_Hardening_Architect_Review.md and implement both changes simultaneously in claim-extraction-stage.ts.
→ Docs/AGENTS/Handoffs/2026-04-01_lead_architect_stage_1_narrow_hardening_architect_review.md

---

### 2026-04-01 | Senior Developer | Claude Code (Opus 4.6) | Multilingual Output/Search Policy (Proposal 2) -- [Standard] [open-items: no]
**For next agent:** (no For-next-agent field)
→ Docs/AGENTS/Handoffs/2026-04-01_senior_developer_multilingual_output_search_policy_proposal.md

---

### 2026-04-01 | Senior Developer | Claude Code (Opus 4.6) | Post-Rollback Live Validation (17 runs) -- [Standard] [open-items: no]
**For next agent:** (no For-next-agent field)
→ Docs/AGENTS/Handoffs/2026-04-01_senior_developer_post_rollback_live_validation_17_runs.md

---

### 2026-04-01 | Lead Architect | Codex (GPT-5) | Clean Replay of `fff7a508` Rollback -- [Standard] [open-items: no]
**For next agent:** (no For-next-agent field)
→ Docs/AGENTS/Handoffs/2026-04-01_lead_architect_clean_replay_of_fff7a508_rollback.md

---

### 2026-04-15 | Lead Developer + LLM Expert | Codex (GPT-5) | Delegated Review And Consolidated Plan -- [Standard] [open-items: yes]
**For next agent:** The delegated review split the work into three tracks: prompt rollout/verification (UCM-active prompt state matters more than file state), narrow test hygiene/additions, and a separate salience-routing design slice. Do not blend the salience model-tier question into the prompt patch; it needs dedicated task/config plumbing if pursued.
→ Docs/AGENTS/Handoffs/2026-04-15_Lead_Developer_LLM_Expert_Delegated_Review_And_Plan.md

---

### 2026-04-15 | Lead Developer + LLM Expert | Codex (GPT-5) | Prompt Issue Review Consolidation -- [Standard] [open-items: yes]
**For next agent:** Current repo already had the April 14 P0 repair-pass fix; this follow-up consolidated the newer prompt issue report, landed the safe prompt-only slice in `apps/web/prompts/claimboundary.prompt.md`, and rejected the salience-tier proposal as under-scoped. Next work, if any, should split into prompt-governance cleanup vs. dedicated salience routing/UCM design rather than mixing them.
→ Docs/AGENTS/Handoffs/2026-04-15_Lead_Developer_LLM_Expert_Prompt_Issue_Review_Consolidation.md

---

### 2026-04-01 | Senior Developer | Codex (GPT-5) | Stage 1 Narrow Hardening Implementation -- [Standard] [open-items: yes]
**For next agent:** Treat this as a narrow Stage-1 patch on top of the Apr 1 rollback baseline. If continuing, run live SRG/SRF/Plastik validation first; do not expand this into a broader Stage-1 package. If needed later, clean up the noisy mock sequencing in the two...
→ Docs/AGENTS/Handoffs/2026-04-01_senior_developer_stage_1_narrow_hardening_implementation.md

---

### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7b Slice 1 Mode Separation + Persistence Hardening -- [Standard] [open-items: yes]
**For next agent:** `ba150b4d` consolidated the Phase 7 docs; this follow-up slice hardens the runtime surface for Shape B. `salienceCommitment` now has explicit `audit` vs `binding` mode in config/defaults, the full salience status is persisted on success and disabled paths, and final contract-summary refresh preserves `stageAttribution`. Next step is to wire binding-mode anchors into Pass 2/validator behavior behind the new mode flag without removing the existing V5 scaffold.
Warnings: Current E2 remains audit-only at runtime; binding mode is config-visible and persisted, but not yet consumed by Pass 2. Do not claim Shape B is active until the next slice lands. `npm -w apps/web run build` reseeded prompt/config storage as part of postbuild; that is expected.
Learnings: The persisted interface being optional masked a local runtime type hole; using `NonNullable<CBClaimUnderstanding["salienceCommitment"]>` in Stage 1 keeps compile-time expectations honest. Stage attribution after final revalidation must be preserved explicitly because the refreshed summary replaces the prior object.

---

### 2026-04-15 | Unassigned | Codex (GPT-5) | Salience Model-Tier Design Review -- [Standard] [open-items: yes]
**For next agent:** Salience is already a dedicated Stage 1 call, but it still borrows the shared `understand` lane. Recommended next step is a dedicated UCM-backed salience task/model key in pipeline config, defaulted to the current budget behavior, while keeping `salienceCommitment.enabled/mode` in calculation config. Check `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, `apps/web/src/lib/analyzer/llm.ts`, `apps/web/src/lib/config-schemas.ts`, `apps/web/configs/pipeline.default.json`, `apps/web/configs/calculation.default.json`, plus admin/calibration surfaces if the new lane must be visible.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_Salience_Model_Tier_Design_Review.md

---

### 2026-04-15 | Unassigned | Codex (GPT-5) | CLAIM_CONTRACT_REPAIR P0 Investigation -- [Standard] [open-items: yes]
**For next agent:** Current repo state does not match the old P0 report anymore. `CLAIM_CONTRACT_REPAIR` exists with a loader-compatible header, `${...}` variables, and a narrow `atomicClaims` repair schema. There is still no section-level fallback prompt if repair loading/rendering fails, but an unresolved contract violation now propagates through `contractValidationSummary` and can terminate early as `report_damaged` instead of silently shipping an invalid analysis. Check `apps/web/prompts/claimboundary.prompt.md`, `apps/web/src/lib/analyzer/prompt-loader.ts`, `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, and `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_CLAIM_CONTRACT_REPAIR_P0_investigation.md

---

### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7b Slice 2 Binding Prompt Wiring -- [Standard] [open-items: yes]
**For next agent:** `f48af7bf` established honest audit-vs-binding mode separation; this follow-up slice wires binding mode into Pass 2 and contract validation prompts without changing audit-mode behavior. `CLAIM_EXTRACTION_PASS2` now stays untouched for audit mode, while binding mode appends `CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX` and constrains extraction to the precommitted salience anchor set. Contract validation similarly appends `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX` and audits against the provided anchor inventory instead of discovering a fresh one.
Warnings: `stageAttribution` remains contract-recovery-only provenance. D1 / MT-5(C) reprompts can still change the final accepted set without changing `stageAttribution`, so do not use it as full claim-set provenance in the first Shape B measurement closeout. `npm -w apps/web run build` reseeded prompt/config storage as part of postbuild; that is expected.
Learnings: The cleanest rollback boundary was prompt layering, not prompt mutation. Keeping audit mode on the exact existing `CLAIM_EXTRACTION_PASS2` / `CLAIM_CONTRACT_VALIDATION` sections and appending binding-only sections avoided contaminating the audit baseline while still making the precommitted anchors operational.

---

### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7b Slice 2 Review Follow-Up -- [Standard] [open-items: yes]
**For next agent:** Closed the only concrete regression gap from the post-`4adf6f17` review by adding explicit audit-mode non-loading coverage for `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX` in `claimboundary-pipeline.test.ts`. Also made the provenance limit explicit in `Docs/WIP/2026-04-14_Phase7_E2_Measurement.md`: `stageAttribution` is contract-recovery provenance only and must not be used as full final-claim-set provenance in the first binding-mode closeout.
Warnings: The provenance caveat remains active. If the first binding-mode measurement packet needs full final-set provenance, extend the persisted model before making that claim. This follow-up only closes the regression-test and documentation gap; it does not change runtime provenance semantics.
Learnings: Positive-path coverage on a binding-only branch was not enough; audit-mode isolation needs an explicit negative assertion too, otherwise the rollback boundary can erode silently in later prompt wiring changes.

---

### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7b P0 Repair-Pass Fix -- [Standard] [open-items: yes]
**For next agent:** Stopped the first bounded binding-mode verification attempt after confirming a real P0: `CLAIM_CONTRACT_REPAIR` had been broken since `61815f41` because the prompt file section header was not loader-compatible, it used legacy `{{...}}` placeholders instead of `${...}`, and the runtime was still expecting a full `Pass2OutputSchema` even though the repair prompt is a narrow claim-set editor. Fixed all three together: the prompt section now loads, the variables render, and the runtime accepts a narrow repair output (`atomicClaims` only) while merging it back into the existing Pass 2 envelope.
Warnings: The five binding-mode verification jobs submitted for the corrected corpus were cancelled and deleted after the bug was confirmed. Active calculation config was reverted back to the pre-run audit hash before the fix landed. Do not resume binding-mode verification until this commit is in place on the running stack.
Learnings: Mocked pipeline tests were insufficient for prompt-file integrity. A real-file prompt contract test now guards `CLAIM_CONTRACT_REPAIR` so malformed section headers and stale placeholder syntax fail at `npm test` cost instead of surfacing only during live runs.

---

### 2026-04-15 | Unassigned | Codex (GPT-5) | ClaimBoundary Prompt UCM Propagation Review -- [Standard] [open-items: yes]
**For next agent:** Runtime prompt loading is DB-first. `claimboundary.prompt.md` changed to `1.0.1`, but local `apps/web/config.db` still shows active `prompt/claimboundary` at `seed-v1.0.0` / `system-seed`. Next step is per-environment verification of active prompt metadata, then CLI reseed for system-seeded envs and manual compare/import/activate for admin-managed envs. Avoid the Admin “Load from File” flow if you want to preserve future auto-refresh semantics.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_ClaimBoundary_Prompt_UCM_Propagation_Review.md

---

### 2026-04-15 | Lead Developer + LLM Expert | Codex (GPT-5) | Narrow Claim Contract Test Cleanup -- [Standard] [open-items: yes]
**For next agent:** The stale `claim-contract-validation.test.ts` expectations are now aligned to the current Stage 1 source shape (`contractGuidance` inline fallback branch; case-insensitive anchor repair gate), and the narrow prompt/runtime regressions for `truthConditionAnchor` plus `antiInferenceCheck` are covered. The next step is live runtime verification of the reseeded prompt, not more unit-test churn.
→ Docs/AGENTS/Handoffs/2026-04-15_Lead_Developer_LLM_Expert_Narrow_Claim_Contract_Test_Cleanup.md

---

### 2026-04-15 | Lead Developer + LLM Expert | Codex (GPT-5) | Live Prompt Runtime Verification -- [Standard] [open-items: yes]
**For next agent:** Local live verification succeeded. Probe job `00f9ad972d854b24b2de5d292ed9ab20` is enough to inspect prompt usage and later report output. The job-specific `claimboundary` snapshot already proves runtime activation of hash `f17e326e48536f4acc71de296ee5e22d3aa883cb3d07d5829f2bfa2486883bc9`; if you continue, inspect this same job rather than creating another prompt probe.
→ Docs/AGENTS/Handoffs/2026-04-15_Lead_Developer_LLM_Expert_Live_Prompt_Runtime_Verification.md

---
### 2026-04-17 | Unassigned | Codex (GPT-5) | MT5C Contract-Approved Skip Fix -- [Standard] [open-items: yes]
**For next agent:** `claim-extraction-stage.ts` now extends the existing sacred-set rule into `MT-5(C)`: if a 1-claim post-Gate-1 set is already contract-approved, the multi-event reprompt is skipped instead of regenerating it. Regression coverage lives at `claimboundary-pipeline.test.ts:9891` and proves the branch stops after the initial contract validation + Gate 1 path.
→ Docs/AGENTS/Handoffs/2026-04-17_Unassigned_MT5C_Contract_Approved_Skip_Fix.md

---
### 2026-04-17 | Unassigned | Codex (GPT-5) | Report Review d816e2e8 Stage1 Multi-Event Reprompt -- [Standard] [open-items: yes]
**For next agent:** Job `d816e2e8abf14fa6a0c5f63a20e9b4a8` is a real benchmark miss for `bundesrat-rechtskraftig`, but the strongest cause is not Stage 2 or concurrency. Compare `claim-extraction-stage.ts:647-649` vs `:775-839`: the generic reprompt loop protects contract-approved sets, while `MT-5(C)` can still reprompt a repaired 1-claim set and destroy the preserved `rechtskräftig` anchor. Evidence anchor jobs: failed `d816e2e8...`, failed `1d9d9389...`, healthy `0f3696d0...`.
→ Docs/AGENTS/Handoffs/2026-04-17_Unassigned_Report_Review_d816e2e8_Stage1_Multi_Event_Reprompt.md

---

### 2026-04-15 | Lead Developer + LLM Expert | Codex (GPT-5) | Job Review On Prompt Effectiveness -- [Standard] [open-items: yes]
**For next agent:** Real job review says the prompt fixes should stay: the latest treaty runs on prompt hash `f17e326e...` clearly repaired the `rechtskräftig` / chronology anchor failure. But there is still a separate Stage 1 bug: Gate 1 flags extra claims as fidelity-failed and the pipeline keeps them anyway, which can still distort downstream verdicts. If continuing, start from `claim-extraction-stage.ts:2817-2825` and the two jobs `85843ef4f98144f2afa7a088b9371dd9` / `0a533220d8a24bc2ae6335c96a013352`.
→ Docs/AGENTS/Handoffs/2026-04-15_Lead_Developer_LLM_Expert_Job_Review_On_Prompt_Effectiveness.md

---

### 2026-04-15 | Lead Developer + LLM Expert | Codex (GPT-5) | Submitted Job Effectiveness Review -- [Standard] [open-items: yes]
**For next agent:** Existing user-submitted jobs confirm the prompt fixes should stay: the treaty runs on `f17e326e...` repaired the old `rechtskräftig`/chronology failure. The new narrow Stage 1 pruning patch is also still the right change, but it has not yet been exercised by a qualifying live current-build job; only tests and old-job pathology support it so far. The Bolsonaro and plastic jobs are controls on the old prompt hash and do not argue for rollback.
→ Docs/AGENTS/Handoffs/2026-04-15_Lead_Developer_LLM_Expert_Submitted_Job_Effectiveness_Review.md

---

### 2026-04-15 | Lead Developer + LLM Expert | Codex (GPT-5) | New Report Investigation -- [Standard] [open-items: yes]
**For next agent:** The new live treaty reports finally exercised the current Stage 1 pruning patch. Both still used prompt hash `f17e326e...`, but the newer worktree hash `+b95e6294` reduced accepted Stage 1 claims from 3 to 1 and removed the inflated extra claim verdicts. Keep the prompt fixes and the pruning patch. The remaining gap is only observability: persisted `gate1Stats.filteredCount` does not currently reveal that pruning happened.
→ Docs/AGENTS/Handoffs/2026-04-15_Lead_Developer_LLM_Expert_New_Report_Investigation.md

---

### 2026-04-15 | Unassigned | Codex (GPT-5) | Daily Bug Scan Metrics Pricing Fix -- [Standard] [open-items: yes]
**For next agent:** Scanned the last 24h commits and found one concrete regression from `e7be34b4d614e65a9941629061d70e2e5dd83815`: `apps/web/src/lib/analyzer/model-resolver.ts` now emits `claude-sonnet-4-6`, but `apps/web/src/lib/analyzer/metrics.ts` lacked a matching pricing entry and undercounted estimated cost via the generic fallback. Fixed by adding `claude-sonnet-4-6` pricing and a regression test in `apps/web/test/unit/lib/analyzer/metrics.test.ts`. The Phase 7 prompt/claim-extraction tests I sampled passed; remaining recent changes are in a dirty worktree, so treat other possible issues as unconfirmed until isolated from local WIP.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_Daily_Bug_Scan_Metrics_Pricing_Fix.md

---

### 2026-04-15 | Unassigned | Codex (GPT-5) | WIP Archive Cleanup -- [Standard] [open-items: yes]
**For next agent:** Archived four high-confidence historical/supporting docs out of `Docs/WIP` and rewired the live references. The current README now reflects the active Phase 7 forward path better, but this was intentionally not a full archive sweep. If you continue, review mixed-status WIP files one at a time rather than batch-moving older plans.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_WIP_Archive_Cleanup.md

---
### 2026-04-17 | Unassigned | Codex (GPT-5) | Daily Bug Scan Prompt Drift Persists -- [Standard] [open-items: yes]
**For next agent:** Safe verification is green again on this tree (`npm test` passed twice cleanly), and the new Stage 1 repair-anchor coverage also passed. The only reproducible current bug-scan finding is still local `claimboundary` prompt activation drift: active UCM hash `977aaac7...` vs current file hash `db42b6c7...` in `apps/web/prompts/claimboundary.prompt.md`.
→ Docs/AGENTS/Handoffs/2026-04-17_Unassigned_Daily_Bug_Scan_Prompt_Drift_Persists.md

---
### 2026-04-17 | Senior Developer | Codex (GPT-5) | Search Cache Review Followups -- [Standard] [open-items: yes]
**For next agent:** `search-cache.ts` now fingerprints against `DEFAULT_SEARCH_CONFIG` defaults instead of duplicated inline fallback values, and `search-cache.test.ts` now covers provider, `detectedLanguage`, and implicit-vs-explicit default equivalence. `JobsController.EventsSse` also now has `[EnableRateLimiting("ReadPerIp")]`. Remaining review leftovers are the historical commit-subject issue, the self-healing orphaned cache rows, and the older Stage 1 carry-forwards in `claim-extraction-stage.ts`.
→ Docs/AGENTS/Handoffs/2026-04-17_Senior_Developer_Search_Cache_Review_Followups.md

---
### 2026-04-15 | Unassigned | Codex (GPT-5) | Agent Outputs Crosslink Normalization -- [Standard] [open-items: yes]
**For next agent:** Normalized the last six active Phase 7 rows that still pointed directly at `Docs/WIP/...`. `Docs/AGENTS/Agent_Outputs.md` now uses canonical handoff links for those rows. The only remaining mixed references are narrative body mentions, mainly in the archived March index, not active arrow-link targets.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_Agent_Outputs_Crosslink_Normalization.md

---
### 2026-04-15 | Unassigned | Codex (GPT-5) | WIP Section Archive Cleanup -- [Standard] [open-items: yes]
**For next agent:** Moved clearly obsolete Phase 7 review/planning sections out of active WIP docs into two new `_arch` companions. The active Phase 7 deep review and working baseline now keep only still-live forward-looking guidance; fixed `61815f41` blocker detail lives in `Docs/ARCHIVE/2026-04-14_Phase7_*_arch.md`.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_WIP_Section_Archive_Cleanup.md

---
### 2026-04-15 | Unassigned | Codex (GPT-5) | Status And Backlog Refresh -- [Standard] [open-items: yes]
**For next agent:** Rebased `Current_Status.md` and `Backlog.md` from the stale April 7/9 baseline to the actual April 15 repo state. Phase 7 is now the explicit active workstream; April 14–15 shipped work is captured; and the next canonical backlog items are the next bounded Shape B slice, Phase 7 observability/prompt rollout, and dedicated salience routing.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_Status_And_Backlog_Refresh.md

---
### 2026-04-15 | Lead Architect + LLM Expert | Codex (GPT-5) | Prompt Diagnosis Skill Review -- [Standard] [open-items: yes]
**For next agent:** Review found the skill is useful but currently overclaims prompt exactness, is not runnable as written in PowerShell, uses a wrong confidence threshold for current report JSONs, and should anchor on `promptContentHash` / UCM blobs rather than only `executedWebGitCommitHash`.
→ Docs/AGENTS/Handoffs/2026-04-15_Lead_Architect_LLM_Expert_Prompt_Diagnosis_Skill_Review.md

---
### 2026-04-15 | Lead Architect + LLM Expert | Codex (GPT-5) | Prompt Diagnosis Skill Rewrite -- [Standard] [open-items: yes]
**For next agent:** The skill and companion docs are now rewritten around runtime prompt-hash provenance, PowerShell-compatible execution, current `test-output/` artifact patterns, and stricter register-update rules. Main file: `.claude/skills/prompt-diagnosis/SKILL.md`.
→ Docs/AGENTS/Handoffs/2026-04-15_Lead_Architect_LLM_Expert_Prompt_Diagnosis_Skill_Rewrite.md

---
### 2026-04-15 | Lead Architect + LLM Expert | Codex (GPT-5) | Prompt Diagnosis 7333cb1f -- [Standard] [open-items: yes]
**For next agent:** Job `7333cb1f1ee6472b9c782e94e4aa7b0e` is not a prompt-drift or prompt-schema-failure case. Exact runtime blob `f17e326e...` matches the active `claimboundary` prompt, while the stronger explanation is retrieval caps/cache (`maxSourcesPerIteration=8`, `relevanceTopNFetch=5`, `7d` search cache). One secondary `P2` query-generation gap remains in `apps/web/prompts/claimboundary.prompt.md` for current aggregate-total claims, but I intentionally did not add it to the prompt issue register yet.
→ Docs/AGENTS/Handoffs/2026-04-15_Lead_Architect_LLM_Expert_Prompt_Diagnosis_7333cb1f.md

---
### 2026-04-15 | Unassigned | Codex (GPT-5) | Skill Cross-Tool Availability -- [Standard] [open-items: no]
**For next agent:** Shared workflow discovery is now aligned across Codex/GPT and Gemini. `AGENTS.md` and `GEMINI.md` list all nine `.claude/skills/*` workflows, the reviewed `docs-update` and `wip-update` skills are PowerShell/cross-tool friendly, and `.gemini/skills/factharbor-agent/SKILL.md` plus `factharbor-agent.skill` now point Gemini at the shared workflow library.
→ Docs/AGENTS/Handoffs/2026-04-15_Unassigned_Skill_Cross_Tool_Availability.md

---
### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Primary-Source Discovery Refinement Design -- [Standard] [open-items: yes]
**For next agent:** Implement a bounded Stage-2 refinement lane, not a parallel retrieval subsystem. Start with `apps/web/src/lib/analyzer/types.ts`, `claim-extraction-stage.ts`, `research-query-stage.ts`, `research-orchestrator.ts`, `research-extraction-stage.ts`, `apps/web/src/lib/web-search.ts`, `apps/web/src/lib/search-cache.ts`, `apps/web/src/lib/config-schemas.ts`, and `apps/web/prompts/claimboundary.prompt.md`. The key idea is LLM-derived retrieval intent + query lanes + coverage assessment + fresh-query cache policy, all generic and UCM-backed.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Primary_Source_Discovery_Refinement_Design.md

---
### 2026-04-17 | Unassigned | Codex (GPT-5) | Asylum WWII Report Review Retrieval And Verdict Gap -- [Standard] [open-items: yes]
**For next agent:** Retrieval is materially fixed for the asylum/WWII report-review input: Stage 2 now reaches the official SEM 2025 commentary PDF and extracts `235.057 Personen aus dem Asylbereich` on later live runs, but the aggregate article still stops at `LEANING-FALSE` because the historical-comparison subclaim (`CV_AC_02`) keeps treating the WWII comparator as methodologically incompatible. Start from jobs `f74597c548e84c0db9dad158e17da05e` and `23d05e2f16d9493d9a2a37a215d9813c`, plus [apps/web/src/lib/retrieval.ts](/c:/DEV/FactHarbor/apps/web/src/lib/retrieval.ts), [research-acquisition-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/research-acquisition-stage.ts), and [claimboundary.prompt.md](/c:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md).
→ Docs/AGENTS/Handoffs/2026-04-17_Unassigned_Asylum_WWII_Report_Review_Retrieval_And_Verdict_Gap.md

---
### 2026-04-18 | Senior Developer | Codex (GPT-5) | Asylum WWII Stage4 Comparator Reconstruction Prompt Fix -- [Standard] [open-items: yes]
**For next agent:** `23d05e2f16d9493d9a2a37a215d9813c` already proves the remaining blocker is Stage 4 reasoning, not missing comparison structure in Stage 1: `AC_02` exists, but `CV_AC_02` is dragged down by a hand-built lower historical comparator from selected subgroups and assumed simultaneity. The prompt now blocks that pattern in Stage 4 and keeps it in confidence/misleadingness territory instead. Validate next on the approved asylum/WWII input with the reseeded prompt hash from the latest build and only revisit Stage 1 claim-merging if `CV_AC_02` still underperforms.
→ Docs/AGENTS/Handoffs/2026-04-18_Senior_Developer_Asylum_WWII_Stage4_Comparator_Reconstruction_Prompt_Fix.md

---
### 2026-04-18 | Senior Developer | Codex (GPT-5) | Asylum WWII Discovered Follow-Up Relevance Gating -- [Standard] [open-items: yes]
**For next agent:** Concern A from the Lead Developer re-review is now closed in code: discovered same-family follow-ups no longer bypass Stage 2 relevance gating. `fetchSources(...)` now classifies discovered candidates before fetch, re-applies per-parent selection, and stores the accepted `relevanceScore` on `FetchedSource`. Main anchors: `apps/web/src/lib/analyzer/research-acquisition-stage.ts`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, and the regression test in `apps/web/test/unit/lib/analyzer/research-acquisition-stage.test.ts`. Next step is a live rerun of the approved asylum/WWII input to confirm the decisive SEM PDF remains reachable with lower fan-out; Stage 4 comparator reasoning remains separate.
→ Docs/AGENTS/Handoffs/2026-04-18_Senior_Developer_Asylum_WWII_Discovered_Followup_Relevance_Gating.md

---
### 2026-04-18 | Senior Developer | Codex (GPT-5) | Asylum WWII Post-Gating Live Rerun -- [Standard] [open-items: yes]
**For next agent:** Valid exact-input rerun is job `25dea04fb0da4ab5ad12fd5dbf76896a` on commit `7b9dec65d4dcab86a0314fec4ac559f9e5abdae8`. It finished `MIXED 45/65`, merged to one claim, and did **not** reach the SEM 2025 commentary PDF. Compare it against `23d05e2f16d9493d9a2a37a215d9813c` before changing Stage 4 again. The main unresolved question is whether the new discovery gate over-rejected same-family follow-ups or whether the changed Stage 1/query shape never re-opened the prior golden path. Ignore job `d87c15b0ffba42b7a21520fd9cb331e7`; it was submitted through a PowerShell path that corrupted `Flüchtlinge`.
→ Docs/AGENTS/Handoffs/2026-04-18_Senior_Developer_Asylum_WWII_Post_Gating_Live_Rerun.md

---
### 2026-04-18 | LLM Expert | Codex (GPT-5) | Report-Review Skill Prompt Debate And Provenance Review -- [Standard] [open-items: yes]
**For next agent:** `/report-review` is structurally strong in Phase 4, but three skill-level gaps remain: (1) autonomous `/validate` still verifies intended input, not persisted `job.inputValue`, so a transport-encoding corruption can be treated as valid evidence; (2) the prompt-rollout drift gate is stricter than necessary because it does not use the repo's existing canonical prompt hash path to compare current files to `config.db.active_hash`; (3) panel context omits provenance/language state, so panels can analyze an invalid live run without seeing that it failed exact-input integrity. If Captain wants this tightened, patch the skill with LLM Expert + Senior Developer + Lead Architect lenses, then re-use `/report-review` on fresh multilingual live reruns.
→ Docs/AGENTS/Handoffs/2026-04-18_LLM_Expert_Report_Review_Skill_Prompt_Debate_And_Provenance_Review.md

---
### 2026-04-18 | Unassigned | Codex (GPT-5) | Current Official Data Discovery Prioritization -- [Standard] [open-items: yes]
**For next agent:** Stage 2 acquisition now gives capped same-family follow-up slots to direct document/data artifacts before feed/listing hops, so the newest official source-native files are less likely to be dropped behind navigation pages. Main anchors are `apps/web/src/lib/analyzer/research-acquisition-stage.ts` and the new regression in `apps/web/test/unit/lib/analyzer/research-acquisition-stage.test.ts`. Verify next with an exact-input live rerun of the asylum/WWII claim and compare against jobs `25dea04fb0da4ab5ad12fd5dbf76896a` and `23d05e2f16d9493d9a2a37a215d9813c`.
→ Docs/AGENTS/Handoffs/2026-04-18_Unassigned_Current_Official_Data_Discovery_Prioritization.md

---
### 2026-04-18 | Unassigned | Codex (GPT-5) | Discovered Document Gate Bridge -- [Standard] [open-items: yes]
**For next agent:** Stage 2 acquisition now preserves one top-priority same-family document artifact per already-relevant parent even when the discovered-item classifier omits it. The classifier still gates the remaining discovered URLs; only the first prioritized document inherits the parent relevance score as a fetch-time bridge. Main anchors are `apps/web/src/lib/analyzer/research-acquisition-stage.ts` and the new regression in `apps/web/test/unit/lib/analyzer/research-acquisition-stage.test.ts`. Validate next with a fresh exact-input asylum/WWII rerun and compare against miss `25dea04fb0da4ab5ad12fd5dbf76896a`.
→ Docs/AGENTS/Handoffs/2026-04-18_Unassigned_Discovered_Document_Gate_Bridge.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Broad Current Total Comparison Prompt Fix -- [Standard] [open-items: yes]
**For next agent:** Stage 1 and Stage 2 prompt contracts now keep a broad public-language current-versus-historical comparison anchored to the broadest authoritative current-side umbrella total instead of letting all official queries collapse onto a narrower formal subset. Main anchors are `apps/web/prompts/claimboundary.prompt.md`, `claim-extraction-prompt-contract.test.ts`, and `verdict-prompt-contract.test.ts`. Validate next with a fresh exact-input rerun of `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.` and compare against jobs `c9b04f5b74d645dea5f24459869a22ad` and `d1045764077f4012a4a4aa9463fc106b`.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Broad_Current_Total_Comparison_Prompt_Fix.md

---
### 2026-04-19 | Code Reviewer | Codex (GPT-5) | Indexing Recommendation Accuracy Review -- [Standard] [open-items: no]
**For next agent:** Review outcome: the recommendation is directionally right that Phase 2 MCP would improve adoption, but several premises are overstated. `AGENTS.md`, `Handoff_Protocol.md`, `Multi_Agent_Meta_Prompt.md`, and `report-review/SKILL.md` already instruct index-first usage; `docs-update`, `wip-update`, and `handoff` skills maintain the system; `build-index.mjs` is 255 lines and `handoff-index.json` is 213 entries today. Keep automation; if follow-up is wanted, add a query surface or MCP without claiming repo-wide ~0% bypass.
→ Docs/AGENTS/Handoffs/2026-04-19_Code_Reviewer_Indexing_Recommendation_Accuracy_Review.md

---
### 2026-04-19 | Code Reviewer | Codex (GPT-5) | Indexing Improvement Options Debate -- [Standard] [open-items: no]
**For next agent:** Ranked the next-step options for a `Claude + GPT/Codex first, Gemini second` workflow after a three-position debate. Conclusion: best immediate step is wrapper/skill alignment around one concrete index-first path; best target architecture is a shared query core with CLI first and optional Claude MCP second. MCP-only is too tool-skewed; CLI-only is too optional; minimum-change-only is cheap but may plateau.
→ Docs/AGENTS/Handoffs/2026-04-19_Code_Reviewer_Indexing_Improvement_Options_Debate.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | CH-DE Ecosystem Adjacency Guard Fix -- [Standard] [open-items: yes]
**For next agent:** Fixed the `69cbbf4b318e477ca740b63a45f1f5d5` failure mode with a prompt-only comparative-ecosystem adjacency guard. `apps/web/prompts/claimboundary.prompt.md` now blocks broader policy-problem governance/legal-framework material from counting as direct ecosystem evidence unless it explicitly inventories/governs/certifies/funds/structurally describes the named activity ecosystem itself, and query generation now requires more concrete actor/network/roster/program signals. Focused prompt-contract tests passed, and the fresh rerun `48e1dc1c6e2b416584a3539de947f6fc` improved from `UNVERIFIED 48/22` to `LEANING-TRUE 70/40` with a much better acquisition path (multiple main iterations, `22` evidence items, concrete IFCN/inventory/desk/roster queries). The latest changes are still uncommitted, so the rerun recorded a dirty suffix on the execution SHA.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_CH_DE_Ecosystem_Adjacency_Guard_Fix.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Current Aggregate Metric Refinement Fix -- [Standard] [open-items: yes]
**For next agent:** Implemented the consolidated asylum fix across Stage 1, Stage 2, and Stage 4. `apps/web/prompts/claimboundary.prompt.md` now carries a positive `primaryMetric` / `componentMetrics` contract for current aggregate metric claims, and `apps/web/src/lib/analyzer/research-orchestrator.ts` now triggers the one-time primary-source refinement only while the direct aggregate metric is still missing. Focused prompt-contract tests, the refinement unit suite, and `npm -w apps/web run build` all passed. The remaining live check is a clean rerun of `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz` on the committed build to confirm recovery of the decisive umbrella-total source path.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Current_Aggregate_Metric_Refinement_Fix.md

---
### 2026-04-19 | Code Reviewer | Codex (GPT-5) | Wrapper Index-First Alignment -- [Standard] [open-items: no]
**For next agent:** Implemented the approved wrapper-only fix. `GEMINI.md`, `.github/copilot-instructions.md`, `.clinerules/00-factharbor-rules.md`, and `.cursor/rules/factharbor-core.mdc` now all point agents to `Docs/AGENTS/index/handoff-index.json`, `stage-map.json`, and `stage-manifest.json` before scanning `Docs/AGENTS/Handoffs/` by filename, while preserving the rule that code locations still use grep/search.
→ Docs/AGENTS/Handoffs/2026-04-19_Code_Reviewer_Wrapper_Index_First_Alignment.md

---
### 2026-04-19 | LLM Expert | Codex (GPT-5) | Claim-Extraction Atomicity Review -- [Standard] [open-items: no]
**For next agent:** Reviewed the prompt-only exclusivity narrowing in `apps/web/prompts/claimboundary.prompt.md` and the focused contract assertions in `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`. The semantic conclusion is to keep `sole` / `only` / `unique` inside the multi-assertion override, and keep `first` / `last` outside it by default because Stage 1 should usually preserve ordering/ranking as one atomic claim.
→ Docs/AGENTS/Handoffs/2026-04-19_LLM_Expert_Claim_Extraction_Atomicity_Review.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Report Review e8777ef2 CH DE Fact-Checking Comparison -- [Standard] [open-items: yes]
**For next agent:** Job `e8777ef27ee74b649f80daf11d22ddcf` is not a prompt-drift case; active and runtime `claimboundary` hash both equal `99aa2a94...`. The main quality failure is prompt/runtime behavior: broad topical queries, off-target direct evidence admission, and loss of Swiss institutional extraction that was present in comparator `99550cfbf6c94b519758551707aaa183`. Start with `apps/web/prompts/claimboundary.prompt.md:279-285`, `:654-669`, `:799-818`, `:893-912`, `:1391-1396`, and `apps/web/src/lib/analyzer/research-query-stage.ts:181-185`.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Report_Review_e8777ef2_CH_DE_Fact_Checking_Comparison.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Report Review CH DE Fact-Checking Prompt Fix -- [Standard] [open-items: yes]
**For next agent:** The prompt-only fix for job `e8777ef27ee74b649f80daf11d22ddcf` is now in `apps/web/prompts/claimboundary.prompt.md`. It hardens qualitative institutional-comparison handling across Pass 1, Pass 2, Stage 2 query/relevance/extraction/applicability, and Stage 4 verdict logic so topical-adjacent mentions no longer stand in for ecosystem evidence. Safe verification passed on the prompt-contract and frontmatter-drift tests; live validation still needs reseed + restart before rerunning the target input.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Report_Review_CH_DE_Fact_Checking_Prompt_Fix.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Daily Bug Scan No Confirmed Regression -- [Standard] [open-items: no]
**For next agent:** Reviewed commit-backed analyzer changes in `3a13dbb9`, `bfc48338`, `01aa3203`, `1c7bd96e`, and `9479376d` and re-ran both the targeted retrieval/acquisition/prompt-contract suites and the full safe suite. No concrete post-last-run regression was reproduced; `apps/web/src/lib/analyzer/research-acquisition-stage.ts` and `apps/web/src/lib/retrieval.ts` remain the main surfaces if later runtime evidence contradicts this scan.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Daily_Bug_Scan_No_Confirmed_Regression.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Analysis Of Job 5e1e8697 Asylum Current Total Rerun -- [Standard] [open-items: yes]
**For next agent:** Job `5e1e8697c9ac45c29e59c3058e22b172` ran on clean commit `b94c158973717b1dade12a5f9c816a115d5d35bb` with prompt hash `34bdfaa2e5cb3fca1215967865a3d5d2720d429abdb211a862f911518a6440a7`, but it did **not** validate the asylum fix. It finished `MOSTLY-FALSE 22/72`, which is worse than both `7be084ee2c52441894a0d4a5c67213ec` (`LEANING-FALSE 38/62`) and the earlier good comparator `c95d00114cc54e6da201237d1ab59218` (`MOSTLY-TRUE 78/72`). The important distinction is that the failure is no longer just generic prompt bleed: this run reached current-source-family material (`Asylstatistik Februar 2026`, `2026-02-grafiken-asylstatistik-d`) but still **missed** the decisive umbrella-total source `stat-jahr-2025-kommentar-d.pdf` that `c95...` admitted as supporting evidence. Stage 1/early Stage 2 still reframed the claim too compositionally: `expectedEvidenceProfile` now centers `Aggregation von Bestandszahlen nach Asylstatus`, and the generated queries shifted to category-sum routes like `Staatssekretariat Migration Bestandszahlen anerkannte Flüchtlinge vorläufig Aufgenommene aktuell` instead of the older source-native umbrella route `Staatssekretariat Migration SEM Asylstatistik Bestand`.
**For next agent:** The strongest next seam is Stage 1/Stage 2 handling for current aggregate metrics: preserve the authoritative umbrella-total metric as the primary expected metric, and force refinement when only component/category current figures are admitted without a direct current total artifact. Contradiction iteration in `5e...` fetched zero new sources, and there was no refinement iteration at all, unlike `c95...`.
→ Investigated live jobs `5e1e8697c9ac45c29e59c3058e22b172`, `7be084ee2c52441894a0d4a5c67213ec`, `c95d00114cc54e6da201237d1ab59218`

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Prompt Diagnosis 7be084ee Asylum Current Total Regression -- [Standard] [open-items: yes]
**For next agent:** Job `7be084ee2c52441894a0d4a5c67213ec` is prompt drift, not analyzer code drift. The key comparator is `c95d00114cc54e6da201237d1ab59218` on prompt hash `5b34870a...` versus the failing run on prompt hash `53232e79...`. `git diff --stat caa03914..3add5697` over the runtime path shows only one changed file: `apps/web/prompts/claimboundary.prompt.md`. The runtime blob diff confirms the only changes were the CH/DE comparative-ecosystem bullets added to `CLAIM_EXTRACTION_PASS1`, `CLAIM_EXTRACTION_PASS2`, and `GENERATE_QUERIES`. The asylum run then lost the broad current-total route and fell onto 2024/component framing. Recommended direction is a **partial undo / narrowing** of that prompt expansion, not a full revert and not analyzer-code surgery.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Prompt_Diagnosis_7be084ee_Asylum_Current_Total_Regression.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | CH-DE Fact-Checking Query Seeding Stabilization -- [Standard] [open-items: yes]
**For next agent:** The fix for `bcfcaa1f99304c83a8ee3676170444dd` is committed as `3add5697` and lives in `apps/web/prompts/claimboundary.prompt.md` plus the prompt-contract tests. Root cause was upstream query/evidence seeding drift, not rollout drift: Stage 1 had become too generic for this ecosystem-comparison family. Prompt reseed activated `claimboundary` hash `53232e79...`, and pending jobs are now demonstrably binding to the fixed build because `12efc9df...` completed on `3add5697...+bdb0bd8a` and queued jobs `ef358963...` and `3a8dfd60...` then entered `RUNNING` on that same executed SHA. Exact Swiss rerun `f59f64d739be47fa9d5192c9d7fefc34` is still queued and remains the clean behavioral confirmation target.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_CH_DE_Fact_Checking_Query_Seeding_Stabilization.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Report Review a99d1780 CH DE Fact-Checking Stage1 Filter And Grounding Fix -- [Standard] [open-items: yes]
**For next agent:** Job `a99d17807c1c47dea23270bc8b1880b3` was not rollout drift; it already used active prompt hash `626f17c0...`. The implemented fix adds a Stage-1 LLM relevance gate before preliminary fetch/extraction in [claim-extraction-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts) and tightens [claimboundary.prompt.md](/c:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md) against different-sector lexical overlaps, omission-as-evidence from unrelated pages, and uncited verdict world knowledge. Fix review found and I corrected the missing Pass-1 geography handoff into the new relevance gate. Live confirmation still needs prompt reseed + restart + rerun of the exact input.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Report_Review_a99d1780_CH_DE_Fact_Checking_Stage1_Filter_And_Grounding_Fix.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | ZHAW Meeting Prep Refinement -- [Standard] [open-items: yes]
**For next agent:** [2026-04-21_ZHAW_Meeting_Prep.md](/c:/DEV/FactHarbor/Docs/Meetings/2026-04-21_ZHAW_Meeting_Prep.md) is the current briefing version. It was rewritten for clearer discovery-first framing and then corrected to the actual meeting slot (`Dienstag, 21. April 2026, 10:15-11:00 Uhr`), with the filename renamed to match. If you continue, the best follow-up is a short live speaking sheet rather than further expanding the main prep note.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_ZHAW_Meeting_Prep_Refinement.md

---
### 2026-04-19 | LLM Expert | Codex (GPT-5) | Exclusivity Guard Prompt Review -- [Standard] [open-items: no]
**For next agent:** Reviewed the current working-tree refinement in `apps/web/prompts/claimboundary.prompt.md` and the paired contract test in `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`. Consolidated verdict: keep the prompt change; it is generic and multilingual-safe enough under AGENTS.md. The only nit is that the new test couples the contract to exact English wording (`sole/only/unique`, `first/last`) rather than the semantic distinction.
→ Docs/AGENTS/Handoffs/2026-04-19_LLM_Expert_Exclusivity_Guard_Prompt_Review.md

---
### 2026-04-19 | LLM Expert | Codex (GPT-5) | Exclusivity Override Semantic Rewrite -- [Standard] [open-items: yes]
**For next agent:** The interim token-shaped exclusivity rule was replaced with the reviewed semantic-structure version in `apps/web/prompts/claimboundary.prompt.md`, and the paired prompt-contract test now locks the semantic boundary instead of exact English cue words. Final rule shape: subject-specific proposition + comparison-class exclusivity proposition => `multi_assertion_input`, extract at least those two claims, do not force exactly two, do not add claims just because verification uses multiple evidence routes, keep anti-verbatim protection, and return order/rank cases to the normal classification rules instead of hard-forcing `single_atomic_claim`. Focused tests passed and prompt reseed activated `claimboundary` hash `8298884f...`; latest changes are still uncommitted and a fresh live rerun of the Swiss motivating input remains optional.
→ Docs/AGENTS/Handoffs/2026-04-19_LLM_Expert_Exclusivity_Override_Semantic_Rewrite.md

---
### 2026-04-19 | LLM Expert | Codex (GPT-5) | Prompt Diagnosis 4c5218a2 CH DE Fact-Checking -- [Standard] [open-items: yes]
**For next agent:** Job `4c5218a2960444c29baccff13f21cb38` is not prompt drift; runtime `promptContentHash` exactly matches active `claimboundary` hash `8298884f...` and current prompt content. Main live prompt weakness is `VERDICT_RECONCILIATION`: it lacks a hard per-side direct-evidence sufficiency step for comparative institutional/ecosystem claims, so Germany-direct evidence plus Swiss proxy/omission signals can still settle above `UNVERIFIED`. Separate `verdict_grounding_issue` is a known recurring grounding-validator false-positive class on the current active prompt, likely due to rule-order weakness in `VERDICT_GROUNDING_VALIDATION`, not rollout. Start with `apps/web/prompts/claimboundary.prompt.md:1399-1414` and `:1484-1507`, plus `apps/web/src/lib/analyzer/research-orchestrator.ts:934-1015` and `apps/web/src/lib/analyzer/verdict-stage.ts:1216-1335`.
→ Docs/AGENTS/Handoffs/2026-04-19_LLM_Expert_Prompt_Diagnosis_4c5218a2_CH_DE_Fact_Checking.md

---
### 2026-04-19 | LLM Expert | Codex (GPT-5) | Prompt Diagnosis Fix 4c5218a2 Comparative Ecosystem Grounding -- [Standard] [open-items: yes]
**For next agent:** Implemented the prompt-side fix for the `4c5218a2960444c29baccff13f21cb38` diagnosis. `apps/web/prompts/claimboundary.prompt.md` now forces per-side direct ecosystem evidence sufficiency before resolving comparative institutional/ecosystem claims and clarifies that `citedEvidenceRegistry` validates only directional citation arrays while claim-local context governs uncited reasoning references. Focused prompt-contract tests passed. Runtime activation is already current at `claimboundary` hash `c77cb6e8...`, and loader pointer refresh means no restart is required. The remaining gap is behavioral confirmation on a live rerun, which was not done because the Swiss motivating input is not on the current Captain-defined list.
→ Docs/AGENTS/Handoffs/2026-04-19_LLM_Expert_Prompt_Diagnosis_Fix_4c5218a2_Comparative_Ecosystem_Grounding.md

---
### 2026-04-19 | LLM Expert | Codex (GPT-5) | Atomicity Decomposition Integrity Fix -- [Standard] [open-items: yes]
**For next agent:** Job `edbfd9e61b154db98ec6b3199a6bf987` proved the earlier exclusivity override did not solve the atomicity problem: `AC_01` still reproduced the whole input while `AC_02`/`AC_03` carried narrower propositions. The fix removes the dedicated `Exclusivity/uniqueness override` from `CLAIM_EXTRACTION_PASS1` and `CLAIM_EXTRACTION_PASS2` and replaces it with a generic decomposition-integrity contract plus a validator rule that rejects any decomposed set containing the whole proposition plus one of its parts. Focused prompt-contract tests passed, the active `claimboundary` hash is now `9696f877...`, and services were restarted. No post-fix live rerun has been done yet.
→ Docs/AGENTS/Handoffs/2026-04-19_LLM_Expert_Atomicity_Decomposition_Integrity_Fix.md

---
### 2026-04-19 | LLM Expert | Codex (GPT-5) | CH-DE Fact-Checking Forward Fix -- [Standard] [open-items: yes]
**For next agent:** The regression from `MOSTLY-TRUE` / `LEANING-TRUE` runs to `UNVERIFIED` on `7ff65fb0557d483e84c9192bef141998` is not explained by analyzer code diffs; the only relevant git-caused change in the window from strong run `02dc8880...` (`8f3ca9dd...`) to current is the stricter comparative-ecosystem reconciliation rule added in `1e206930`. I did not revert it. The forward fix narrows that Stage 4 guard and strengthens Stage 2 instead: query generation now requires an enumerative ecosystem route per side, extraction now allows multiple actor/network pages to collectively evidence an ecosystem, and reconciliation now still blocks one-sided proxy wins but no longer forces `UNVERIFIED` when both sides have convergent close-ecosystem coverage without a single formal registry. Focused prompt-contract tests passed and active `claimboundary` hash is now `5b34870a...`. Fresh rerun `df612169dab34eb788beb66384ace691` was submitted but remained queued due local runner backlog / unrelated 404/401/credit issues, so live behavioral confirmation is still pending.
→ Docs/AGENTS/Handoffs/2026-04-19_LLM_Expert_CH_DE_Fact_Checking_Forward_Fix.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Report Review 8f3ca9dd Revert Assessment -- [Standard] [open-items: yes]
**For next agent:** Do not treat `8f3ca9dd55471881d69bf4c0b7f1c97c5790109b+8d56a484` as a clean rollback target. `8d56a484` is a dirty-worktree fingerprint, not a commit, and only four stored jobs ran on that state. The evidence supports a narrow partial prompt rollback/modification for the CH/DE comparative-ecosystem path, not a full revert: CH/DE regressed after later prompt commits (`1e206930`, then spillover around `3add5697`), while other families improved or remained healthy later (`13b8f97b...` asylum-current-total on clean `92143261`, `32f00bb3...` plastic, stable hydrogen, Bundesrat best runs elsewhere). Preserve `76f57b59` and today’s uncommitted prompt/test fixes; if acting, either commit the current forward fixes and rerun, or selectively narrow the implicated comparative-ecosystem prompt sections instead of resetting the whole stack.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Report_Review_8f3ca9dd_Revert_Assessment.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Post-Commit Targeted Reruns Validation -- [Standard] [open-items: yes]
**For next agent:** Preserved the current prompt/test work in clean commit `fc4c657f`, restarted the stack, and ran four clean exact-input reruns. Results on `fc4c657f`: `cb2361aa...` Bundesrat `UNVERIFIED 50/0` with `report_damaged` and zero evidence; `87e6e04e...` asylum-current-total `LEANING-TRUE 68/70`; `f8235a23...` asylum-WWII `MOSTLY-FALSE 25/74`; `850da2e6...` plastic `MOSTLY-FALSE 26/66`. Conclusion: do not partially roll back the comparative-ecosystem / aggregate-metric prompt line. Three families validate the current direction; the remaining broken family is Bundesrat, and its clean failure is still the known Stage-1 contract/decomposition issue rather than a later prompt-regression signal.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Post_Commit_Targeted_Reruns_Validation.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Prompt Audit Schema Contract Findings -- [Standard] [open-items: yes]
**For next agent:** `input-policy-gate` is already runtime-sanitized before use, so most prompt-output contract claims there are weaker than they look. The stronger SR seam is not the prompt file alone but the combination of permissive runtime schemas (`sourceType`/bias are free strings) and cap logic that only understands a subset, plus the fact that the live SR engine currently builds prompts in `sr-eval-prompts.ts` instead of loading `source-reliability.prompt.md`. Missing frontmatter on `inverse-claim-verification.prompt.md` is not a current runtime defect because `paired-job-audit.ts` reads that file directly from disk and parses only its JSON response.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Prompt_Audit_Schema_Contract_Findings.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Consolidated Prompt Audit Adjudication -- [Standard] [open-items: yes]
**For next agent:** Runtime-loading review confirmed the full `claimboundary` file is not sent to production LLM calls; the real hotspots are large individual sections such as `CLAIM_EXTRACTION_PASS2`, `GENERATE_QUERIES`, and `EXTRACT_EVIDENCE`. The consolidated view is: keep the ecosystem-duplication concern but treat it as a section-governance problem, not a full-file efficiency emergency; treat SR as a runtime schema/prompt-surface problem rather than a markdown-only prompt problem; and prioritize semantic hardening of `inverse-claim-verification.prompt.md` over frontmatter or metadata cleanup.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Consolidated_Prompt_Audit_Adjudication.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Consolidated Prompt Audit Implementation Plan -- [Standard] [open-items: yes]
**For next agent:** The written execution plan now lives in `Docs/WIP/2026-04-19_Consolidated_Prompt_Audit_Implementation_Plan.md`. Follow the bounded order: Workstream 1 inverse-verification hardening, then Workstream 2 SR schema tightening/prompt-surface decision, then Workstream 3 `claimboundary` ecosystem governance. Do not start with full-file `claimboundary` splitting or loader refactors unless the governance pass proves insufficient.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Consolidated_Prompt_Audit_Implementation_Plan.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Bundesrat Repair Anchor Narrowing Fix -- [Standard] [open-items: yes]
**For next agent:** The live hard-failure path for the exact Captain-defined Bundesrat input is no longer the old `MT-5(C)` branch; the remaining Stage-1 seam was `selectRepairAnchorText(...)` narrowing the repair target to the temporal clause when only that sub-span was still missing. `claim-extraction-stage.ts` now keeps the validator's broader anchor unless the lone missing narrowed span is modifier/predicate-like, and `repair-anchor-selection.test.ts` locks the Bundesrat temporal-sub-anchor case. Fresh rerun `e26048eb15b042f5ba9f0b42a59e35c3` on executed build `88126439...+5814ca8f` completed `SUCCEEDED` with `LEANING-TRUE 62.9 / 73` instead of `report_damaged`, but its stored contract summary still notes a whole-claim-plus-`Volk` decomposition concern.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Bundesrat_Repair_Anchor_Narrowing_Fix.md

---
### 2026-04-19 | Unassigned | Codex (GPT-5) | Inverse Verification And SR Contract Hardening -- [Standard] [open-items: yes]
**For next agent:** `paired-job-audit.ts` now treats inverse verification as a validated degraded path instead of a throw-on-parse-failure path, and `inverse-claim-verification.prompt.md` now defines strict inverse boundaries explicitly for quantifiers, modality, scope, timeframe, identical claims, empty claims, and multilingual pairs. `sr-eval-types.ts` now canonicalizes SR `sourceType`/bias outputs to enum-backed values with one explicit legacy alias (`political_party` -> `advocacy`), `sr-eval-engine.ts` preserves canonical `biasIndicator` tokens, and `sr-eval-prompts.ts` no longer teaches the off-contract `political_party` example. Focused tests and `npm -w apps/web run build` passed; unrelated dirty `claimboundary` files were left untouched.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Inverse_Verification_And_SR_Contract_Hardening.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Compound Subject Decomposition Prompt Fix -- [Standard] [open-items: yes]
**For next agent:** `claimboundary.prompt.md` now explicitly forbids splitting a compound subject/object that shares one joint temporal or conditional anchor, and its contract-repair section now allows redundant sub-claims to be merged away instead of forcing a broken fixed-count output. The focused Stage-1 prompt contract test passed. This was committed only; restart the stack before using it for clean commit-linked job runs.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Compound_Subject_Decomposition_Prompt_Fix.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Coordinated Branch Atomicity Prompt Fix -- [Standard] [open-items: yes]
**For next agent:** The previous compound-anchor exception over-corrected and could force a non-atomic single claim for coordinated temporal inputs like `... bevor Volk und Parlament ...`. `claimboundary.prompt.md` now uses a `Coordinated branch rule`: split only into independently verifiable branches, preserve the shared anchor in each branch, never keep the whole unsplit sentence alongside them, and do not merge those branches back together during repair. The focused prompt-contract test passed; runtime confirmation still depends on the queued clean Bundesrat rerun after restart.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Coordinated_Branch_Atomicity_Prompt_Fix.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Coordinated Branch Repair-Pass Gating And Atomicity Debug -- [Standard] [open-items: yes]
**For next agent:** The C11b repair pass was mutating contract-approved coordinated-branch sets by forcing the full literal anchor back into one claim. `claim-extraction-stage.ts` now skips repair on contract-approved sets and `repair-anchor-selection.test.ts` covers that gate. This removed the structural collapse: dirty-build rerun `06706852...` produced the desired Parliament/Volk split with `rechtskräftig` preserved in both branches. However the final clean rerun `447cc942...` on `fd4d6abf` still regressed to one bundled claim at `stageAttribution: initial`, so the remaining problem is now unstable initial extraction / validation, not repair.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Coordinated_Branch_Repair_Pass_Gating_And_Atomicity_Debug.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Single-Claim Atomicity Enforcement Fix -- [Standard] [open-items: yes]
**For next agent:** Added a dedicated Stage-1 single-claim atomicity audit and then tightened its override semantics so any bundled coordinated-branch finding or explicit non-atomic judgment forces retry. The first clean rerun on `adff6e0b` still failed with one bundled claim, but the follow-up contradiction-guard fix succeeded on clean commit `4bdef2c1`: job `8537313effa74c98a0945636c69dbd42` finished `LEANING-TRUE 58/74` with `claimCount: 2`, both `Volk` and `Parlament` claims preserving `rechtskräftig`, and `contractValidationSummary.stageAttribution: "retry"`.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Single_Claim_Atomicity_Enforcement_Fix.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Daily Bug Scan Atomicity Gating Fix -- [Standard] [open-items: no]
**For next agent:** Post-run bug scan found one concrete regression from the new single-claim atomicity audit (`6edbc457`, tightened in `f287e427`): `test/unit/lib/analyzer/claimboundary-pipeline.test.ts` failed because Stage 1 was making an extra atomicity LLM call even when salience commitment was disabled. `apps/web/src/lib/analyzer/claim-extraction-stage.ts` now gates `shouldRunSingleClaimAtomicityValidation(...)` on successful salience commitment with at least one anchor, and `apps/web/test/unit/lib/analyzer/claim-contract-validation.test.ts` locks that behavior. Verification passed on the focused atomicity suites and the full pipeline unit suite; `apps/web/prompts/claimboundary.prompt.md` remained dirty from prior work and was not modified here.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Daily_Bug_Scan_Atomicity_Gating_Fix.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Bundesrat Stage 1 Prompt Review -- [Standard] [open-items: yes]
**For next agent:** Treat the safest prompt-only change as a cross-section `priority-anchor` invariant: order salience anchors by preservation priority, rank any truth-condition-bearing modifier on the thesis-defining main act ahead of branch-only temporal/conditional spans, and require Pass 2 / contract validation / single-claim atomicity to repeat that same modifier-bearing main-act wording in every in-scope branch claim while keeping the existing two-claim split. Do not remove runtime enforcement; the current prompt already says most of this, so the remaining instability is model variance that still needs `claim-extraction-stage.ts` contract/atomicity stabilization.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Bundesrat_Stage1_Prompt_Review.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Bundesrat Priority-Anchor Contract Fix -- [Significant] [open-items: yes]
**For next agent:** The narrow generic fix is now implemented: salience can emit priority anchors for truth-condition-bearing finality/binding-effect qualifiers, the contract validator and single-claim atomicity validator both receive the same salience payload, and the single-claim binding challenger only runs after the existing atomicity pass succeeds. The unsafe detached-modifier repair preference was removed. Local verification passed on the focused Stage 1 suites, the full `claimboundary-pipeline.test.ts` suite, and `npm -w apps/web run build`. The fix is committed at `ccb5336e`, with clean runtime `HEAD` `8e3d9542` after a separate housekeeping commit for the pre-existing lockfile diff. Clean reruns on `8e3d9542` confirmed the exact `rechtskräftig` input now splits into two claims twice (`7810fa9f1a0d4e10bc89f929fc5c3166`, `0487ca351dbb40948ece1b70ca31dfc3`), both preserving `rechtskräftig` in each branch claim. The sibling input rerun `46e6eec5b373489287136193bf2f181b` failed in Pass 1 because the Anthropic API reported insufficient credit, and the completed exact-input jobs later fell back to `UNVERIFIED` in Stage 4 for the same billing reason.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Bundesrat_Priority_Anchor_Contract_Fix.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Stage 2 Extraction Normalization Diagnostics -- [Standard] [open-items: yes]
**For next agent:** The local Stage 2 extraction observability patch was kept, but rewritten to use honest metric names. `research-extraction-stage.ts` now logs `Extraction normalizations` with structured counters for `claimIdMismatches`, `categoryNormalizations`, `categoryFallbackToEvidence`, `missingSourceUrlAssignments`, `unmatchedSourceUrlFallbacks`, and `contextualMappedToNeutral`, rather than the earlier vague `coercions` labels. `research-extraction-stage.test.ts` now locks the counter semantics with one focused extraction test. Verification passed on `npm -w apps/web exec vitest run test/unit/lib/analyzer/research-extraction-stage.test.ts` and `npm -w apps/web run build`. An unrelated pre-existing local edit in `apps/web/src/lib/input-policy-gate.ts` was left untouched and should not be bundled into this commit unless separately reviewed.

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Bolsonaro Target-Proceeding Scope Hardening -- [Standard] [open-items: yes]
**For next agent:** The remaining clean-commit English Bolsonaro `UNVERIFIED` regression was traced to same-system scope bleed, not a stale runtime and not primarily a foreign-government leak. `claimboundary.prompt.md` now forces the narrowest same-matter/same-proceeding-path reading for broad "the proceedings/the verdict" inputs, requires target-case artifact queries for legality/fair-trial claims, and keeps earlier or parallel proceedings, collateral inquiries, sanctions, impeachment efforts, and broader institutional controversies involving the same actors contextual unless the source explicitly bridges them into the target proceeding. Prompt-contract coverage was added in `claim-extraction-prompt-contract.test.ts` and `verdict-prompt-contract.test.ts`. Verification passed on the two focused prompt suites, `tsc --noEmit`, and `npm -w apps/web run build`. Still pending: commit, reseed on that commit, and submit a fresh live Bolsonaro EN rerun.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Bolsonaro_Target_Proceeding_Scope_Hardening.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Stage 2 File-Only Normalization Logging -- [Standard] [open-items: yes]
**For next agent:** The Stage 2 `Extraction normalizations` diagnostic no longer writes to stdout. `apps/web/src/lib/analyzer/debug.ts` now exposes `debugLogFileOnly(...)`, and `apps/web/src/lib/analyzer/research-extraction-stage.ts` uses it for the structured normalization counters so they still land in `debug-analyzer.log` without polluting console output. `apps/web/test/unit/lib/analyzer/research-extraction-stage.test.ts` now asserts the normalization diagnostic goes through the file-only path and not `debugLog(...)`. Verification passed on `npm -w apps/web exec vitest run test/unit/lib/analyzer/research-extraction-stage.test.ts` and `npm -w apps/web run build`. The unrelated pre-existing edit in `apps/web/src/lib/input-policy-gate.ts` remains out of scope and uncommitted.

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Daily Bug Scan No Confirmed Regression -- [Standard] [open-items: no]
**For next agent:** Scanned post-run commits `6e393155`, `ccb5336e`, `0bab97c4`, `2fe4f8eb`, `25e87e8d`, `bd7d8e32`, and `1324c0a6`. Targeted verification passed on `claim-contract-validation.test.ts`, `claimboundary-pipeline.test.ts`, `research-extraction-stage.test.ts`, `claim-extraction-prompt-contract.test.ts`, `verdict-prompt-contract.test.ts`, and `npm -w apps/web run build`, so there is no confirmed behavioral regression in this window. The only concrete diff issue was trailing whitespace in `apps/web/src/lib/analyzer/research-extraction-stage.ts` from `git diff --check`, which was intentionally skipped as non-behavioral.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Daily_Bug_Scan_No_Confirmed_Regression.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Bolsonaro Target-Object Applicability Guard Fix -- [Significant] [open-items: yes]
**For next agent:** The forward fix for the remaining Bolsonaro `UNVERIFIED` atomic claims is ready but not yet live-rerun-verified. `claimboundary.prompt.md` no longer reuses benchmark-shaped `"the proceedings" / "the case" / "the verdict"` steering language from commit `39c2d222`; the relevant Stage 1/2/4 rules now use generic target-object / target-path wording. `verdict-stage.ts` now forwards `applicability` into Stage 4 verdict prompting and direction validation/repair, rejects explicitly non-direct directional citations in `isVerdictDirectionPlausible(...)`, emits deterministic direction issues for them, and strips them from directional arrays before repair/revalidation. Focused verification passed on the Stage 1/4 suites, `tsc --noEmit`, and `npm -w apps/web run build`. Still pending: commit, restart services, and rerun the approved English Bolsonaro input so the new job records the committed hash.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Bolsonaro_Target_Object_Applicability_Guard_Fix.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Stage 2 Console Noise Cleanup -- [Standard] [open-items: yes]
**For next agent:** `research-extraction-stage.ts` no longer emits Stage 2 diagnostics through `console.warn`, `console.info`, or `debugLog(...)`. Relevance classification summaries, discard summaries, extraction fail-open notices, applicability summaries, and applicability fail-open notices now all route through `debugLogFileOnly(...)`, so they land in `debug-analyzer.log` without polluting stdout. `research-extraction-stage.test.ts` now also locks the applicability summary onto the file-only logger. Focused verification passed on `npm -w apps/web exec vitest run test/unit/lib/analyzer/research-extraction-stage.test.ts`; `npm -w apps/web run build` still prints unrelated SR-Eval/config startup lines outside this module. The unrelated pre-existing edit in `apps/web/src/lib/input-policy-gate.ts` remains out of scope and uncommitted.

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Dominant Proposition Aggregation And Reporting Review -- [Standard] [open-items: yes]
**For next agent:** Reviewed the proposed `dominantProposition` + independently checkable component-claim model as an aggregation/reporting problem. Current Stage 5 in `aggregation-stage.ts` is still a flat weighted-average system with a narrow Option G LLM adjudication path that only fires on mixed-direction direct claims, so it cannot correctly express `all_must_hold` parent semantics for same-direction component claims. The report/result shape is also flat: `CBClaimUnderstanding` stores only `atomicClaims`, `OverallAssessment` stores only `claimVerdicts`, `claimboundary-pipeline.ts` persists those directly, and both the jobs page and HTML export render a flat atomic-claim list / coverage matrix keyed only by claim IDs. Best recommendation: do not overload current `articleAdjudication`/`dominanceAssessment` for this concept. Introduce parent semantics as a new optional Stage-1 contract first (`dominantProposition: null | proposition` plus component-claim linkage and parent logic such as `all_must_hold`), then add a thin Stage-5 aggregator path that computes top-level truth from the parent when present while leaving child verdict generation unchanged. Only after that should report/UI surfaces expose the parent as the top-level verdict target with child claims beneath it.

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Dominant Proposition Architecture Plan — [Standard] [open-items: yes]
**For next agent:** Wrote the consolidated reviewed plan to [2026-04-20_Dominant_Proposition_Architecture_Plan.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-20_Dominant_Proposition_Architecture_Plan.md) and indexed it in [README.md](/c:/DEV/FactHarbor/Docs/WIP/README.md). The agreed shape is: optional `topLevelProposition` outside `atomicClaims`, child-only research/verdicting, internal-only soft checkability disposition for now, and a separate Stage-5 `all_must_hold` path when/if aggregation is enabled. Use the short Sonnet/Gemini prompts from the plan doc for external review, and do not treat the parent as another peer claim.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Dominant_Proposition_Architecture_Plan.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Dominant Proposition Plan Review Adjudication — [Standard] [open-items: yes]
**For next agent:** External review tightened the plan materially. Keep the core model, but use a safer rollout: Phase A is detection-only by default with `topLevelPropositionAggregationEnabled = false`, `evaluationMode` is dropped from the Phase A contract, `componentClaimIds` must be validated against the final post-retry `atomicClaims` set, and the prompt must explicitly block `topLevelProposition` on alternative-dimension inputs such as `Plastic recycling is pointless`. If parent-aware aggregation is added later, it must bypass the existing `dominanceAssessment` path and record `aggregationMode` plus `constrainingClaimId` in the adjudication trail. `articleThesis` and `topLevelProposition` must be documented as separate fields with distinct semantics.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Dominant_Proposition_Architecture_Plan.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Dominant Proposition Plan Review Findings Addressed — [Standard] [open-items: yes]
**For next agent:** The plan now addresses the lead-architect review directly. `topLevelProposition` must not only survive post-retry ID validation; it must also be semantically re-authorized during the final Stage 1 contract-validation refresh over the final accepted child set. Phase B now explicitly says any required child that is `UNVERIFIED`, `INSUFFICIENT`, confidence-`0`, or otherwise non-publishable forces the parent to a non-publishable `UNVERIFIED` outcome. The plan also now defines the needed parent-aware persistence/audit shape: `AdjudicationPath.path = "parent_all_must_hold"` plus a `parentAggregation` block with `aggregationMode`, `componentClaimIds`, `constrainingClaimId`, `unresolvedRequiredClaimIds`, and `publishable`. `articleThesis` is no longer implicitly hidden; keep it in diagnostics/export/admin surfaces even when `topLevelProposition` becomes the report headline.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Dominant_Proposition_Plan_Review_Adjudication.md

---
### 2026-04-20 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Proposition Plan Review — [Standard] [open-items: yes]
**For next agent:** Revise the plan before coding. The three blockers are: final parent validity must be re-LLM-authorized against the final post-Gate-1 child set; `all_must_hold` must define `UNVERIFIED`/non-publishable child behavior; and Phase B needs an explicit new `OverallAssessment`/`AdjudicationPath` contract rather than overloading Option G shapes.
→ Docs/AGENTS/Handoffs/2026-04-20_Lead_Architect_LLM_Expert_Dominant_Proposition_Plan_Review.md

---
### 2026-04-20 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Proposition Plan Re-Review — [Standard] [open-items: yes]
**For next agent:** The three original blockers are addressed. The only remaining note is non-blocking: when Phase B types are formalized, treat the `adjudicationPath` example as an extension to the current Option G contract unless you intentionally redesign that contract in the same change.
→ Docs/AGENTS/Handoffs/2026-04-20_Lead_Architect_LLM_Expert_Dominant_Proposition_Plan_Rereview.md

---
### 2026-04-20 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Proposition Final Assessment — [Standard] [open-items: yes]
**For next agent:** The plan is approved for Phase A. Only one optional docs refinement remains: make the Phase B `AdjudicationPath` example explicitly additive to the current Option G contract unless a deliberate migration is specified.
→ Docs/AGENTS/Handoffs/2026-04-20_Lead_Architect_LLM_Expert_Dominant_Proposition_Final_Assessment.md

---
### 2026-04-20 | Lead Architect + LLM Expert | Codex (GPT-5) | Dominant Proposition Proceed Recommendation — [Standard] [open-items: yes]
**For next agent:** Phase A is still safe to proceed. The only remaining downstream-risk item is contract wording: the Phase B `adjudicationPath` snippet in [2026-04-20_Dominant_Proposition_Architecture_Plan.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-20_Dominant_Proposition_Architecture_Plan.md) must explicitly say whether it extends the live Option G `AdjudicationPath` fields in [types.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/types.ts:1403) or replaces them as part of the same change. Make that additive-vs-replacement decision explicit before Phase B coding.
→ Docs/AGENTS/Handoffs/2026-04-20_Lead_Architect_LLM_Expert_Dominant_Proposition_Proceed_Recommendation.md

---
### 2026-04-20 | Lead Developer + LLM Expert | Codex (GPT-5) | Dominant Proposition Phase B Migration Semantics -- [Standard] [open-items: yes]
**For next agent:** The dominant-proposition plan now includes an explicit `Phase B Migration Semantics` subsection in `Docs/WIP/2026-04-20_Dominant_Proposition_Architecture_Plan.md`: non-parent runs keep the live Option G `AdjudicationPath` unchanged, parent-aware runs use `path = "parent_all_must_hold"` plus `parentAggregation`, `articleAdjudication` stays absent there, and `directionConflict`, `llmAdjudication`, and `guardsApplied` cannot be dropped implicitly.
→ Docs/AGENTS/Handoffs/2026-04-20_Lead_Developer_LLM_Expert_Dominant_Proposition_PhaseB_Migration_Semantics.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Unverified Stage 1 Contract Stability Fix -- [Significant] [open-items: yes]
**For next agent:** `/report-review` confirmed the reports-page `UNVERIFIED` badges were real Stage 1 regressions, not UI drift. `claimboundary.prompt.md` now preserves explicit conjuncts in `multi_assertion_input` cases and keeps broad efficiency claims inside efficiency/system-boundary frames instead of operational proxies; `claim-extraction-stage.ts` now treats claim-set equivalence as order-insensitive and can carry forward a prior contract approval after final revalidation failure only when the final set is a subset of previously validated claims and all validated anchor carriers remain. Verification passed on `claim-contract-validation.test.ts`, `claim-extraction-prompt-contract.test.ts`, new `contract-revalidation-fallback.test.ts`, `tsc --noEmit`, and `npm -w apps/web run build`. Still pending: rerun jobs `8497c447cbf54ddbb11680cdab4ae906`, `a2be703ddd014cf69cdb345f0c076fb9`, and `f1afe3ad61754067bd4f1d8742bae7c6` on the current stack.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Unverified_Stage1_Contract_Stability_Fix.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Unverified Review Follow-up Fix -- [Standard] [open-items: yes]
**For next agent:** The two review findings on the Stage 1 stability patch are resolved. `canCarryForwardValidatedContractApproval(...)` now requires every previously validated thesis-direct claim to survive, not just anchor carriers, and the prompt’s efficiency guard was rewritten to generic wording without hydrogen/vehicle-shaped proxy examples. Verification passed on the same focused analyzer suites (`73 passed`), `tsc --noEmit`, and `npm -w apps/web run build`; `postbuild` reseeded active prompt state to hash `79442a030aca...`.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Unverified_Review_Followup_Fix.md

---
### 2026-04-20 | Lead Developer + LLM Expert | Codex (GPT-5) | Dominant Proposition Opus Follow-up -- [Standard] [open-items: yes]
**For next agent:** The dominant-proposition plan now incorporates the remaining useful Opus follow-ups without changing architecture: prompt work is ordered before validation/re-authorization, `topLevelProposition` requires at least two `componentClaimIds`, the prompt doctrine now distinguishes `articleThesis` from a falsifiable parent proposition, and Phase A explicitly monitors Pass 2 prompt-token/caching impact instead of treating prompt budget as a blocker.
→ Docs/AGENTS/Handoffs/2026-04-20_Lead_Developer_LLM_Expert_Dominant_Proposition_Opus_Followup.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Global Rule For Commit-Before-Batch And Runtime Refresh -- [Standard] [open-items: no]
**For next agent:** Root `AGENTS.md` now requires agents to commit before submitting any live analysis batch so job records map to a concrete revision, and to restart or reseed before submission whenever the runtime would otherwise still be stale. Apply this to future live reruns, validation batches, and report-review verification runs.

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Unverified Stage 1 Live Rerun Fix -- [Significant] [open-items: yes]
**For next agent:** The two current `UNVERIFIED` Stage 1 regressions are fixed forward and verified live on committed runtime `5f1a7446`: Swiss comparison rerun `9382cb2dc3714267b2bb9f24d8b20bbb` now finishes `LEANING-FALSE | 65`, and Portuguese Bolsonaro rerun `2d5db7022b944dca8cc72f2bc8ca5aae` now finishes `LEANING-TRUE | 55`. The concrete fix split is: comparison-side repair fidelity in `CLAIM_CONTRACT_REPAIR`, clean-only repair adoption in `claim-extraction-stage.ts`, and Gate 1 anchor-carrier restoration widened to contract-approved `initial` sets so thesis-direct conjuncts are not lost before flaky final revalidation.
→ Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Unverified_Stage1_Live_Rerun_Fix.md

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Report Review Overfit Scrub And Prompt Rule Clarification -- [Standard] [open-items: no]
**For next agent:** Root `AGENTS.md` now clarifies that concrete failing analyses are for diagnosis only and do not license benchmark-shaped prompt wording. `/report-review` now requires an explicit abstract-mechanism line plus a trigger-vocabulary scrub before a fix can survive, and the self-check now drops any proposal that reuses wording from the triggering job/input instead of the abstract failure mechanism.

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Prompt Audit Overfit Check Alignment -- [Standard] [open-items: no]
**For next agent:** `/prompt-audit` now checks the same diagnosis-vs-fix discipline: motivating cases are for diagnosis only, generic-hygiene now flags trigger-vocabulary reuse even when the wording is superficially generic, and each proposed fix must state an abstract mechanism. The audit table now treats benchmark-shaped reuse as a rule-1 violation.

---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Bolsonaro AC_02 CB_01 Contradicting Evidence Audit -- [Standard] [open-items: yes]
**For next agent:** Narrow-audited live job `2369faac2e464221a124a2bf97c5916e` at the evidence-item level for `AC_02` inside `CB_01`. Only three `CB_01` items mapped to `AC_02` actually carry `claimDirection="contradicts"`: `EV_006` (Wikipedia broader Moraes controversy), `EV_032` (CSMonitor broader unilateral-decision / due-process concern), and `EV_024` (Al Jazeera panel-composition fact). `EV_006` and `EV_032` are already labeled `applicability="contextual"` and look correctly contextual rather than direct. `EV_024` is the only contradict row still labeled `direct`, but the statement itself only documents that Justice de Moraes sat on the panel; the stronger suspicion there is directional over-read, not a foreign-assessment leak. No `foreign_reaction` items were mapped to `AC_02`, and no U.S. State Department item was mapped into the `AC_02 / CB_01` subset despite the broader boundary description mentioning it. The strongest target-specific cautionary material in this boundary is actually carried by `direct` but `neutral` items such as `EV_015`, `EV_028`, and `EV_034` (Justice Fux dissent / jurisdiction objections). Current takeaway: this audit does **not** justify a broad applicability rewrite. If anything is tightened, it should be a narrow generic prompt refinement so target-specific descriptive facts about panel composition or forum assignment are not auto-read as contradiction unless the source explicitly ties them to a procedural/fairness defect in the target proceeding.

---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Daily Bug Scan No Confirmed Regression -- [Standard] [open-items: yes]
**For next agent:** This scan covered the post-`2026-04-20T09:24:03Z` window and found no confirmed regression after reviewing verdict commits `f8ae0d44`, `a1353b82`, `f874e62e`, `c2f68884`, `972eb1c4`, `ace3c114` plus Stage 1 commits `08b3d771` and `5f1a7446`. Verification passed on `test/unit/lib/analyzer/verdict-stage.test.ts`, `test/unit/lib/analyzer/verdict-prompt-contract.test.ts`, and `npm -w apps/web run build`. If a later signal appears, start in `apps/web/src/lib/analyzer/verdict-stage.ts` around `validateVerdicts(...)` and `isVerdictDirectionPlausible(...)`.
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Daily_Bug_Scan_No_Confirmed_Regression.md

---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Report Review Skill Restore Exact-Job-First -- [Standard] [open-items: yes]
**For next agent:** `/report-review` once again accepts full job URLs, inspects the exact requested jobs before comparators, and requires inspected-job evidence before prompt edits can be proposed as confirmed fixes.
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Report_Review_Skill_Restore_Exact_Job_First.md

---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Report Review Cross-Tool Publication -- [Standard] [open-items: yes]
**For next agent:** `/report-review` is now published across the shared non-Claude discovery surfaces: `GEMINI.md`, `.gemini/skills/factharbor-agent/SKILL.md`, and `Docs/DEVELOPMENT/Claude_Code_Skills.md`. The canonical workflow remains `.claude/skills/report-review/SKILL.md`.
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Report_Review_Cross_Tool_Publication.md

---
### 2026-04-22 | Senior Developer | Codex (GPT-5) | SR Contract Risk Benefit Review -- [Significant] [open-items: yes]
**For next agent:** The April 20 SR contract-hardening commit should be kept, but not treated as the whole SR quality story. A live four-domain before/after comparison saved to `Docs/AGENTS/Handoffs/2026-04-22_Senior_Developer_SR_Contract_Risk_Benefit_Comparison.json` shows the patch correctly eliminates unsupported runtime tokens like `educational_platform`, `corporate_publisher`, and `corporate_interest`, while also exposing a separate unresolved issue: current SR classification still mis-buckets some corporate/educational sources into `unknown` or `collaborative_reference`, so score changes are partly live-evidence variance and partly broader semantic classification drift.
→ Docs/AGENTS/Handoffs/2026-04-22_Senior_Developer_SR_Contract_Risk_Benefit_Review.md

---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Daily Bug Scan Report Review Publication No Regression -- [Standard] [open-items: no]
**For next agent:** Commit `51ede468` is the only post-`2026-04-21T06:00:17Z` change in scope and it is docs/workflow-only. `git show`, `git diff --check`, and cross-file reference checks found no concrete regression to fix; excluded uncommitted analyzer/test work remains out of scope for this run.
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Daily_Bug_Scan_Report_Review_Publication_No_Regression.md

---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Report Review e5e6ec8d Anchor Override Fix -- [Standard] [open-items: yes]
**For next agent:** Hosted job `e5e6ec8da824491c8984a18505481ba7` and local job `ae6b54e96bda4a54a685731fddc099bc` were confirmed to be the same PDF URL on the same prompt hash/commit family. The bad hosted run died in Stage 1 because `evaluateClaimContractValidation(...)` treated an uncited article-level limitation anchor as a hard provenance failure and flipped `preservesContract` to false. `claim-extraction-stage.ts` now only fires that structural override when the validator actually cites anchor carrier IDs and none survive structural validation; a new focused regression test covers the uncited-meta-anchor case.
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Report_Review_e5e6ec8d_Anchor_Override_Fix.md

---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Daily Bug Scan Uncommitted Anchor Override Fix Verified -- [Standard] [open-items: yes]
**For next agent:** Including uncommitted changes changes the scan result: the working tree contains a concrete Stage 1 bug fix already in progress in `claim-extraction-stage.ts`. The narrowed `noValidIds` guard and the new focused regression test are both validated locally; the only remaining step is a fresh rerun of the affected job/current stack.
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Daily_Bug_Scan_Uncommitted_Anchor_Override_Fix_Verified.md

---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Benchmark Rerun Wave Five Candidates -- [Standard] [open-items: yes]
**For next agent:** Five approved benchmark inputs were rerun on committed runtime `eaacd9ce` to probe expectation gaps and challenging families. `asylum-235000-de` landed cleanly inside Captain's bands (`LEANING-TRUE | 70 | 68`), `asylum-wwii-de` now has its first current-stack result (`LEANING-FALSE | 38 | 65`), `plastic-en` avoided the old collapse but still drifted high on truth (`MIXED | 44 | 65`), and both Bundesrat variants remain materially out of band (`MOSTLY-TRUE | 72 | 76` and `TRUE | 97 | 89`).
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Benchmark_Rerun_Wave_Five_Candidates.md

---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Report Review 1b52c739 Contract Retry Binding Fix -- [Standard] [open-items: yes]
**For next agent:** Exact job `1b52c73913634990b7cb99224e9d56cc` was a real Stage 1 collapse on the same commit/prompt that previously handled the same Iran input successfully. The forward fix in `claim-extraction-stage.ts` now escalates anchor-driven contract retries into salience-binding mode whenever the validator says a truth-condition anchor is present in the input but preserved by no claim IDs, so the retry Pass 2 cannot free-drift back into proxy background claims.
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Report_Review_1b52c739_Contract_Retry_Binding_Fix.md

---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Report Review 1b52c739 Binding Retry Redesign Assessment -- [Standard] [open-items: yes]
**For next agent:** The expert review findings on the uncommitted binding-retry patch are valid. Do not ship the current boolean helper. Replace it with a builder that keys off `validPreservedIds` from the evaluated contract result and merges the validator-discovered anchor into the binding inventory before retry if the original salience list omitted it.
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Report_Review_1b52c739_Binding_Retry_Redesign_Assessment.md

---
### 2026-04-21 | Unassigned | Codex (GPT-5) | Report Review 1b52c739 Retry Salience Plan Fix -- [Standard] [open-items: yes]
**For next agent:** The unsafe raw-payload retry-binding helper is gone. Stage 1 now plans retry salience from the evaluated contract result: zero `validPreservedIds` on a present-in-input truth-condition anchor yields either merged binding-mode retry (when trustworthy upstream salience anchors exist) or audit-mode guidance-only retry (when they do not). The old `contractResult.inputAssessment.rePromptRequired = true` mutation was removed; retry gating now reads `evaluatedContract.effectiveRePromptRequired` directly.
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Report_Review_1b52c739_Retry_Salience_Plan_Fix.md

---
### 2026-04-21 | LLM Expert | Codex (GPT-5) | Debate Skill Structural Hardening -- [Significant] [open-items: yes]
**For next agent:** `/debate` now keeps its core adversarial architecture but adds a mandatory intake/structural-audit layer, manifest-based routing instead of proposition-keyword routing, structural-first role outputs, and auditable final sections (`Structural Audit`, `Rejected Arguments`, `Skipped Roles`). If another workflow calls it, pass `CONTEXT_MANIFEST` with evidence IDs and known gaps rather than a free-form context blob.
→ Docs/AGENTS/Handoffs/2026-04-21_LLM_Expert_Debate_Skill_Structural_Hardening.md

---
### 2026-04-22 | Senior Developer | Claude (Opus 4.7) | SR Contract Controlled Replay Stage 1 -- [Significant] [open-items: no]
**For next agent:** Plan v2.1 Stage 1 (Lite-Replay) executed. 54 runs (4 report domains × A2/B2 × 2 modes × 3 reps, plus `encyclopedia.ushmm.org` canonical × A2 × 2 modes × 3 reps) against the patched engine with frozen evidence packs and an isolated SR cache. Canonical control held at `highly_reliable` every run with score spread **0.03** (at the declared noise floor, zero category oscillation) — so the Stage 1 gate closes: **keep `403e905a`, do not escalate to Stage 2**. All 54 runs returned contract-valid payloads (canonical `sourceType` and `biasIndicator` tokens only). A2↔B2 deltas are pack-driven, not code-driven (`theglobeandmail.com` A2→B2 delta +0.02 in both modes, category match). Engine change is minimal and additive: `evaluateSourceWithPinnedEvidencePack` is now exported from `sr-eval-engine.ts`; `evaluateSourceWithConsensus` delegates after `buildEvidencePack` + enrichment (no production behavior change). Residual uncertainty: prompt-correction vs. evidence-change attribution requires Stage 2 (pre-patch worktree) and is deferred.
→ Docs/AGENTS/Handoffs/2026-04-22_Senior_Developer_SR_Contract_Replay_Stage1_Outcome.md

---
### 2026-04-22 | Lead Architect / LLM Expert | Codex (GPT-5) | Atomic Claim Selection Requirement Refinement -- [Standard] [open-items: yes]
**For next agent:** The improved requirement now fixes the main ambiguities: the chooser sits after today’s final Stage 1 claim set and before Stage 2, its candidates must be the exact current `understanding.atomicClaims`, LLM recommendation drives semantic preselection (max 3), user selection is capped at 5, and `Other` is a restart-before-claim-extraction path. Use hosted job `a59e4a6e1e184c22ad8055e34a52beeb` as the main acceptance anchor because the current live run produced 22 claims but only 6 non-`UNVERIFIED` verdicts.
→ Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_LLM_Expert_Atomic_Claim_Selection_Requirement_Refinement.md

---
### 2026-04-22 | Lead Architect / LLM Expert | Codex (GPT-5) | Atomic Claim Selection Debate -- [Standard] [open-items: yes]
**For next agent:** `/debate` resolved the architecture as `MODIFY`: keep the requirement semantics, but do not make the chooser a live post-Stage-1 job wait state. The safer v1 baseline is a pre-job draft/intake selection step over the exact current final `atomicClaims`. Important caveat from validation: the debate did not fully justify “non-interactive default,” only that interactive default is not yet proven.
→ Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_LLM_Expert_Atomic_Claim_Selection_Debate.md

---
### 2026-04-22 | Lead Architect | GitHub Copilot (GPT-5.4) | Atomic Claim Selection Interactive Default Resolved -- [Standard] [open-items: yes]
**For next agent:** Treat the earlier default-choice open item as settled: v1 is interactive by default, with `automatic` mode available only as an explicit non-interactive override. Keep the debate baseline intact: pre-job/intake chooser over the exact final `CBClaimUnderstanding.atomicClaims`, no live post-Stage-1 wait state, and `Other` as a fresh pre-Stage-1 restart.
→ Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Atomic_Claim_Selection_Interactive_Default.md

---
### 2026-04-22 | Lead Architect | GitHub Copilot (GPT-5.4) | Atomic Claim Selection Implementation Spec -- [Standard] [open-items: yes]
**For next agent:** The April 22 handovers are now consolidated into one build-ready design: a pre-job `ClaimSelectionDraftEntity`, shared Stage 1 preparation reused by both draft prep and cold-start analysis, browser-local automatic-mode preference, same-draft `Other` restarts, invite-slot claim at draft creation, and prepared jobs that start at Stage 2 with persisted selection provenance. Start with `Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md` and implement backend draft scaffolding before touching the UI.
→ Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Atomic_Claim_Selection_Implementation_Spec.md

---
### 2026-04-22 | Lead Architect | GitHub Copilot (GPT-5.4) | Atomic Claim Selection Implementation Spec Debate -- [Standard] [open-items: yes]
**For next agent:** A full-tier `/debate` on adopting the implementation spec as-is returned `MODIFY`. The baseline architecture stands, but the spec is now tightened to use one authoritative draft payload, minimal job-side selection metadata, explicit active-input typing on `Other` restarts, a 24-hour draft TTL, retry-within-same-quota semantics, and shared runner concurrency without requiring a full queue-generalization refactor.
→ Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Atomic_Claim_Selection_Implementation_Spec_Debate.md

---
### 2026-04-22 | Senior Developer / DevOps Expert | GitHub Copilot (GPT-5.4) | Runner Admin Reads For Hidden Jobs -- [Standard] [open-items: yes]
**For next agent:** `internal-runner-queue.ts` now forwards `X-Admin-Key` on every runner-owned `/v1/jobs` read, closing the hidden-job 404 gap both at execution start and in queue recovery/orphan refresh paths. After rollout, restart the web runner and retry the exact failed asylum job; if it still fails, verify deployed `FH_ADMIN_KEY` first.
→ Docs/AGENTS/Handoffs/2026-04-22_Senior_Developer_DevOps_Expert_Runner_Admin_Reads_For_Hidden_Jobs.md

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | Atomic Claim Selection Check-Worthiness Proposal -- [Standard] [open-items: yes]
**For next agent:** The spec now makes current `AtomicClaim.checkWorthiness` advisory only and replaces “use check-worthiness for preselection” with a dedicated batched LLM triage in section 8.2 of `Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md`. Implement recommendation as FCW/FNC/OPN-style triage plus ranking, not as a binary scalar or deterministic fallback.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Atomic_Claim_Selection_Check_Worthiness_Proposal.md

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | Atomic Claim Selection Check-Worthiness Review Follow-up -- [Standard] [open-items: yes]
**For next agent:** The spec was narrowed after review: current Gate 1 is now described accurately, the four-label triage is explicitly provisional rather than a direct ZHAW transfer, the separate post-Gate-1 batched call is justified on audit/contract grounds, and the full recommendation snapshot must persist into `ClaimSelectionJson`.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Atomic_Claim_Selection_Check_Worthiness_Review_Followup.md

---
### 2026-04-22 | Lead Architect | Codex (GPT-5) | Implementation Order For Check-Worthiness Atomic Claim Selection And Dominant Claim -- [Standard] [open-items: yes]
**For next agent:** Treat the dependency chain as asymmetric: current Dominant Atomic Claim work is the most independent item because Stage 5 `articleAdjudication`/`dominanceAssessment` already exists in [aggregation-stage.ts](apps/web/src/lib/analyzer/aggregation-stage.ts) and the matching prompt/config surfaces already exist; Atomic Claim Selection is a new draft/prepared-job intake path over the exact current `CBClaimUnderstanding.atomicClaims`; and the approved Check-worthiness improvement is not a standalone Gate 1 rewrite but a post-Gate-1 batched ACS recommendation layer over that final candidate set. If “Dominant Atomic Claim” actually means the separate `topLevelProposition` proposal, move that to the end because ACS v1 explicitly excludes it.
→ Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Implementation_Order_CheckWorthiness_AtomicClaimSelection_DominantClaim.md

---
### 2026-04-22 | Lead Architect | Codex (GPT-5) | Clarified Order For ACS Check-Worthiness And TopLevelProposition -- [Standard] [open-items: yes]
**For next agent:** The ambiguity is now resolved: “Dominant Atomic Claim” means the separate `topLevelProposition` proposal, not the existing Stage 5 `dominanceAssessment` path. The recommended order is therefore [Atomic Claim Selection](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md) first, Check-worthiness recommendation second as the ACS ranking layer, and [topLevelProposition](/c:/DEV/FactHarbor/Docs/WIP/2026-04-20_Dominant_Proposition_Architecture_Plan.md) third in Phase A detection-only form. Keep parent-aware aggregation out of the first wave.
→ Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Clarified_Order_ACS_CheckWorthiness_TopLevelProposition.md

---
### 2026-04-22 | Lead Architect | Codex (GPT-5) | Debate On Check-Worthiness Before ACS -- [Standard] [open-items: yes]
**For next agent:** `/debate` returned `MODIFY`, not `ADOPT`: keep the non-Gate-1 part, reject the separately shipped pre-ACS service part. The winning shape is: recommendation remains a post-Stage-1 batched signal over final `CBClaimUnderstanding.atomicClaims`, but it should ship inside the ACS draft/prepared-job flow rather than as a standalone external contract; any earlier work should stay internal telemetry/prototyping only.
→ Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Debate_CheckWorthiness_Before_ACS.md

---
### 2026-04-22 | Lead Architect | Codex (GPT-5) | Documentation Update For ACS Check-Worthiness And TopLevelProposition -- [Standard] [open-items: yes]
**For next agent:** The canonical docs are now aligned: the ACS spec explicitly says automatic mode makes the recommendation layer the effective post-Stage-1 selection filter while keeping Gate 1 authority unchanged; the same spec now rejects a standalone pre-ACS external Check-worthiness rollout; the dominant-proposition plan now explicitly follows ACS + recommendation rather than preceding it; and [Backlog.md](Docs/STATUS/Backlog.md) now carries the staged work as `ACS-1`, `ACS-CW-1`, and `TOPPROP-1`.
→ Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Documentation_Update_ACS_CheckWorthiness_TopLevelProposition.md

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | Atomic Claim Selection Spec Sequencing Reconcile -- [Standard] [open-items: yes]
**For next agent:** The spec was re-aligned with the newer ACS planning docs: it now treats itself as the canonical design for `ACS-1` plus in-flow `ACS-CW-1`, makes the internal build order foundation-first then recommendation-second, and keeps `TOPPROP-1` explicitly later and out of ACS semantics.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Atomic_Claim_Selection_Spec_Sequencing_Reconcile.md

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | Check-Worthiness Recommendation Design Consolidation -- [Standard] [open-items: yes]
**For next agent:** A new consolidated design doc now exists at [2026-04-22_Check_Worthiness_Recommendation_Design.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Check_Worthiness_Recommendation_Design.md). It fixes the topic around `ACS-CW-1`: advisory live field, post-Gate-1 ACS recommendation contract, `ACS-1` foundation as prerequisite, fail-closed behavior, and `TOPPROP-1` explicitly later.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Check_Worthiness_Recommendation_Design_Consolidation.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Fragment-Aware HTML Extraction Fix -- [Standard] [open-items: yes]
**For next agent:** The shared retrieval path now preserves `#fragment` scope for HTML pages by bounding extraction to the first meaningful ancestor inside the main-content root and collapsing adjacent duplicate lines, which fixes the real Grander FAQ failure class without site-specific rules. Unit test `apps/web/test/unit/lib/retrieval.test.ts` and `next build` both passed, and a live retrieval-only probe on the Grander URL dropped extracted text to `1249` chars with only one copy of the targeted heading and no earlier FAQ entries.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Fragment_Aware_HTML_Extraction_Fix.md

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | Check-Worthiness Service Reuse Refinement -- [Standard] [open-items: yes]
**For next agent:** The consolidated check-worthiness doc now explicitly says the new ACS recommendation module should be shaped as an internal reusable service for later Atomic Claim Extraction reuse, and it now makes the semantic mapping to ZHAW/ViClaim FCW/FNC/OPN explicit while keeping `unclear` as a FactHarbor control state and preserving the ACS-first rollout.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Check_Worthiness_Service_Reuse_Refinement.md

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | Check-Worthiness Lead Developer Review Disposition -- [Standard] [open-items: yes]
**For next agent:** The consolidated design doc was tightened after Lead Developer review: field wording now says “coarse extraction-time signal” rather than “advisory only,” model-tier use of `context_refinement` now carries an escalation gate, inputs now explicitly require full `AtomicClaim` objects, automatic `max 3` vs interactive `max 5` is now justified, `unclear` promotion now uses an uncovered-dimension rule, and retry is now bounded. I did not rewrite the doc around `applyGate1Lite()` as an active path because repo search found no live call sites for that helper.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Check_Worthiness_Lead_Developer_Review_Disposition.md

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | Check-Worthiness Senior Architect LLM Expert Findings Disposition -- [Standard] [open-items: yes]
**For next agent:** The consolidated design doc now hardens fail-closed behavior at the contract level: the recommendation module must enforce one assessment per candidate, a full ranked permutation of candidate ids, ordered-subset rules for `recommendedClaimIds`, and non-empty rationales before persistence or downstream use. Soft-refusal-shaped empty/partial outputs now explicitly count as recommendation failure and follow the bounded retry/fail-closed path.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Check_Worthiness_Senior_Architect_LLM_Expert_Findings_Disposition.md

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | Check-Worthiness Review Disposition Appendix -- [Standard] [open-items: no]
**For next agent:** The consolidated design doc now includes a short in-document review-disposition appendix summarizing accepted findings, resulting contract changes, the intentional flexibility around empty `recommendedClaimIds`, and links to the full review-disposition handoffs.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Check_Worthiness_Review_Disposition_Appendix.md

---
### 2026-04-22 | Lead Architect | Codex (GPT-5) | Final Review Of ACS Check-Worthiness And TopLevelProposition Documentation -- [Standard] [open-items: yes]
**For next agent:** The high-level sequencing is now coherent across the ACS spec, dominant-proposition plan, and backlog: ACS foundation first, Check-worthiness as the in-flow recommendation layer second, and `topLevelProposition` later. Two document-level gaps remain before implementation starts: the ACS spec lists a public `/retry` draft route but omits the matching Next.js proxy route in section 7.2, and the backlog now places the new medium-urgency `ACS-1` / `ACS-CW-1` rows below a low-urgency architecture row despite declaring urgency-sorted ordering.
→ review references: [2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md), [2026-04-20_Dominant_Proposition_Architecture_Plan.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-20_Dominant_Proposition_Architecture_Plan.md), [Backlog.md](/c:/DEV/FactHarbor/Docs/STATUS/Backlog.md)

---
### 2026-04-22 | Lead Architect | Codex (GPT-5) | Review Findings Disposition For ACS Docs -- [Standard] [open-items: no]
**For next agent:** The two final-review findings are now closed. The ACS spec now mirrors the documented public retry endpoint with `app/api/fh/claim-selection-drafts/[id]/retry/route.ts` in section 7.2, and the backlog’s technical-debt section now places `ACS-1` / `ACS-CW-1` ahead of the low-urgency architecture rows so the file’s stated urgency ordering is true again.
→ updated docs: [2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md), [Backlog.md](/c:/DEV/FactHarbor/Docs/STATUS/Backlog.md)

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | Atomic Claim Selection Lead Developer Review Disposition -- [Standard] [open-items: yes]
**For next agent:** The Lead Developer implementation review is now reflected in the ACS spec: Stage 1 prep is defined as the full cold-start boundary, prepared jobs must persist and reuse `PreparedStage1Snapshot.resolvedInputText`, draft-row lifecycle columns are the queryable truth while `DraftStateJson` is the rich-detail store, expiry is lazy in v1, and the spec now explicitly warns that draft-time invite-slot claiming cannot reuse the current jobs-only hourly count in `TryClaimInviteSlotAsync(...)` unchanged. The ACS spec and CW design doc also now point to `apps/web/src/lib/analyzer/types.ts` as the canonical home for recommendation contract types.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Atomic_Claim_Selection_Lead_Developer_Review_Disposition.md

---
### 2026-04-22 | Unassigned | Codex (GPT-5) | ACS-1 Implementation Takeover Fixes -- [Standard] [open-items: yes]
**For next agent:** The ACS-1 takeover patch replaces the draft worker TODO with a real Stage 1 preparation path, adds prepared-job reuse via `PreparedStage1Snapshot`, makes draft confirm/job creation transactional, validates selected IDs against `preparedStage1.preparedUnderstanding.atomicClaims`, and splits `PreparedStage1Json` from `ClaimSelectionJson` correctly. Invite hourly accounting now counts draft creations plus direct jobs without double-counting confirmed drafts. Remaining intentional gap: `ACS-CW-1` still needs to replace the temporary automatic-mode fallback for drafts with more than 5 surviving claims.
→ Docs/AGENTS/Handoffs/2026-04-22_Unassigned_ACS1_Implementation_Takeover_Fixes.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Claim Selection Dialog Slow Path Diagnosis -- [Standard] [open-items: yes]
**For next agent:** The current ACS dialog slowdown is upstream of recommendation. Live draft `2698064e48b446aa8b6a7d69d40ce504` stayed at progress `24` for >200s on the Iran Wikipedia URL while Stage 1 contract validation failed twice and forced a conservative Pass 2 retry; recommendation does not start until progress `32` in `internal-runner-queue.ts`.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Claim_Selection_Dialog_Slow_Path_Diagnosis.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Automatic Mode Auto-Confirm And Safe Source Reuse -- [Significant] [open-items: yes]
**For next agent:** Automatic mode now skips the chooser UI after recommendation when a non-empty recommended set exists, empty extracted PDFs classify as `pdf_parse_failure`, and same-job exact-match reuse is enabled only for document/data sources while HTML refetch still preserves follow-up discovery. The first review found two regressions in the new code path; both were fixed, and the reviewer re-pass reported no remaining findings.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Automatic_Mode_Auto_Confirm_And_Safe_Source_Reuse.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Claim Selection Slow Path Debate -- [Standard] [open-items: yes]
**For next agent:** Debate result was `MODIFY`: keep Stage 1 retry cost plus coarse progress visibility as the primary root cause, but widen the first fix to measure both Stage 1 sub-steps and recommendation in the same patch while surfacing Stage 1 milestones in the UI.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Claim_Selection_Slow_Path_Debate.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Claude Opus Slow Path Review Verification -- [Standard] [open-items: yes]
**For next agent:** Claude Opus was directionally right on the root cause, but one review claim was too optimistic: `recordLLMCall(...)` exists in the recommendation module, yet draft preparation does not run inside `runWithMetrics(...)`, so persisted recommendation timings are not established for drafts. More importantly, draft `eventMessage` text is accepted by the internal API but dropped by `ClaimSelectionDraftService.UpdateStatusAsync(...)`, so milestone visibility requires API/service/UI work, not just progress-bar tuning.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Claude_Opus_Slow_Path_Review_Verification.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Claim Selection Slow Path Implementation Plan Review -- [Standard] [open-items: yes]
**For next agent:** The debated plan landed as `MODIFY`: keep the instrumentation-first slice, but make `ClaimSelectionDraftState.observability` the authoritative prep-telemetry contract and keep row-level `LastEventMessage` as live UI convenience only. First patch should add truthful Stage 1 milestones, separated draft timings, and a surfaced latest milestone message, while deferring recommendation optimization and polling/SSE changes until measurements exist.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Claim_Selection_Slow_Path_Implementation_Plan_Review.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Deferred Stage 2 URL Content Reuse Note -- [Standard] [open-items: yes]
**For next agent:** The backlog now records Stage 2 URL/content reuse as a deferred production optimization, not an Alpha verification change. The first allowed slice is tightly scoped: UCM-gated and default-off, exact canonical-URL matches only within the same job, reuse limited to fetched raw content and parsed artifacts, required hit/miss observability, and explicit exclusion of cross-job cache plus heuristic/semantic dedupe in v1.
→ updated backlog: [Backlog.md](/c:/DEV/FactHarbor/Docs/STATUS/Backlog.md)

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Auto-Continue Recovery Fix -- [Significant] [open-items: yes]
**For next agent:** Drafts with four or fewer prepared claims no longer stop on the selection page if they leak into `AWAITING_CLAIM_SELECTION`. The page now auto-confirms once on load and redirects into the job, and only shows a retry continuation button if that automatic continuation actually fails. The broader Grander follow-up options are documented in `Docs/WIP/2026-04-23_Grander_Runtime_Followup_Options.md`.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Auto_Continue_Recovery_Fix.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS UCM Selection Cap -- [Significant] [open-items: no]
**For next agent:** `pipeline.claimSelectionCap` is now the single runtime knob for ACS manual-review threshold, max selected claims, and max LLM recommendations. The resolved value is persisted in `ClaimSelectionDraftState.selectionCap`, consumed by [internal-runner-queue.ts](/c:/DEV/FactHarbor/apps/web/src/lib/internal-runner-queue.ts), [page.tsx](/c:/DEV/FactHarbor/apps/web/src/app/analyze/select/[draftId]/page.tsx), and enforced on confirm in [ClaimSelectionDraftService.cs](/c:/DEV/FactHarbor/apps/api/Services/ClaimSelectionDraftService.cs).
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_UCM_Selection_Cap.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Runner Queue Split For Session Preparation -- [Significant] [open-items: yes]
**For next agent:** Session preparation no longer shares the exact same runner lane as full report jobs. [internal-runner-queue.ts](/c:/DEV/FactHarbor/apps/web/src/lib/internal-runner-queue.ts) now resolves separate job and prep concurrency budgets, with the prep lane defaulting to `1` unless `FH_RUNNER_PREP_MAX_CONCURRENCY` says otherwise. This means queued sessions can start Stage 1 preparation even while the report-job lane is saturated. Remember that this is a runtime/env change: restart the web runner to activate it, and if total parallel load should stay tighter than “jobs + 1 prep lane”, set the explicit split env vars rather than relying on legacy fallback behavior.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Runner_Queue_Split_For_Session_Preparation.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Code Review Disposition - Claim Selection And Check Worthiness -- [Standard] [open-items: no]
**For next agent:** External code review for the Claim Selection Draft and Check-Worthiness slices came back as approve-only with low-severity positive observations and no actionable defects. No product code changes were needed; this handoff is the repository-local approval record.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Code_Review_Disposition_Claim_Selection_Check_Worthiness.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Auto-Confirm And Job Progress Polling Fix -- [Significant] [open-items: no]
**For next agent:** Auto-continue drafts no longer commit a leaked `AWAITING_CLAIM_SELECTION` stop state before creating the final job. The runner now uses the internal atomic auto-confirm path, and the jobs list/detail pages merge polled snapshots defensively so stale responses cannot drag visible progress backward or keep it pinned at `0%`.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Auto_Confirm_And_Job_Progress_Polling_Fix.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Bundesrat MT-5(C) Recovery And Preparing UI Copy -- [Significant] [open-items: yes]
**For next agent:** The Bundesrat under-splitting was not caused by ACS. The live failure path was Stage 1 skipping `MT-5(C)` after a contract-approved one-claim set, even though `distinctEvents` stayed high. `claim-extraction-stage.ts` now reopens that path only when salience commitment succeeded, reruns the retry in binding mode, and accepts the expanded set only after clean contract revalidation. The `/analyze/select/[draftId]` page also now uses `Preparing Analysis` during `PREPARING`/auto-continue states and reserves `Atomic Claim Selection` for true manual selection.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Bundesrat_MT5C_Recovery_And_Preparing_UI_Copy.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Preparation UI Info And Utility Pass -- [Significant] [open-items: yes]
**For next agent:** The preparation page now exposes the active analysis input, basic session metadata, copy actions, and a raw JSON viewer. Draft-token holders can read the input text again, not just admins. The next meaningful UX step would be a real draft-event history API if the page should gain an `Events` view comparable to the job screen.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Preparation_UI_Info_And_Utility_Pass.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Preparation UI Header Parity With Job Page -- [Significant] [open-items: yes]
**For next agent:** The preparation page’s custom hero was removed. The upper section now reuses the job page’s action-row and report-surface header pattern, drops visible `mode` fields, and uses the shared `InputBanner` for the active analysis input. No fake draft `hide` action was added; only real draft actions (`retry`, `cancel`) were surfaced in the top-right control cluster.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Preparation_UI_Header_Parity_With_Job_Page.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Draft Hide From Start -- [Significant] [open-items: yes]
**For next agent:** Hide now exists at the claim-selection draft layer and propagates into the eventual job. The preparation page shows an admin-only eye toggle from the start, `ClaimSelectionDraftEntity` persists `IsHidden`, and linked jobs inherit or mirror that state. The first EF-generated migration for this change was wrong and was manually corrected to a minimal `ADD COLUMN IsHidden` migration plus matching SQL.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Draft_Hide_From_Start.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Idle Auto-Proceed Timer -- [Significant] [open-items: yes]
**For next agent:** Manual atomic-claim selection sessions can now auto-continue after a UCM-configurable idle window via `pipeline.claimSelectionIdleAutoProceedMs` (default `180000`, `0` disables). The session page fetches the normalized timeout from `/api/fh/claim-selection-settings`, resets the countdown on every checkbox interaction attempt, and auto-confirms the last valid selection when the timer expires.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Idle_Auto_Proceed_Timer.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Idle Auto-Proceed Timer Server-Owned Finalization -- [Significant] [open-items: no]
**For next agent:** The idle auto-proceed path is now server-owned, so manual claim-selection sessions can continue even after the browser closes. `ClaimSelectionDraftState` persists `selectionIdleAutoProceedMs`, `lastSelectionInteractionUtc`, and the last valid `selectedClaimIds`; the public session API accepts selection-activity pings; and the runner watchdog sweeps due `AWAITING_CLAIM_SELECTION` sessions through the internal auto-confirm path. This supersedes the earlier page-only timer design.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Idle_Auto_Proceed_Timer.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Session Code Review Disposition -- [Significant] [open-items: yes]
**For next agent:** External review found two real idle-timeout issues and one residual test-gap note. The code now blocks stale due-snapshot auto-confirms via timestamp compare-and-confirm in `ClaimSelectionDraftService`, starts the manual inactivity timer when the selection screen is actually opened, and keeps legacy sessions visually honest by disabling the countdown when no persisted timeout exists. The remaining low-risk gap is missing direct backend tests because this repo still has no API test project.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Session_Code_Review_Disposition.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | FactHarbor Statutes Challenger Position -- [Standard] [open-items: yes]
**For next agent:** The challenger conclusion is that the statutes are not "ready as-is" mainly because [Docs/Legal/DRAFT_Vereinsstatuten_FactHarbor_DE.md](/c:/DEV/FactHarbor/Docs/Legal/DRAFT_Vereinsstatuten_FactHarbor_DE.md) `Art. 24` overreaches beyond the evidence-backed minimum: no official Zurich blessing of the exact open-by-default IP wording, no assignment-template implementation path, and `URG Art. 16-17` cuts against broad automatic vesting. `Art. 18` is comparatively defensible if kept tightly tied to recusal and reasonable compensation controls.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_FactHarbor_Statutes_Challenger_Position.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | FactHarbor Statutes Art. 18 / Art. 24 Hardening -- [Standard] [open-items: yes]
**For next agent:** [DRAFT_Vereinsstatuten_FactHarbor_DE.md](/c:/DEV/FactHarbor/Docs/Legal/DRAFT_Vereinsstatuten_FactHarbor_DE.md) and [DRAFT_Vereinsstatuten_FactHarbor_EN.md](/c:/DEV/FactHarbor/Docs/Legal/DRAFT_Vereinsstatuten_FactHarbor_EN.md) now narrow `Art. 24` from automatic ownership to rights acquisition / written assignment-or-licence mechanics, keep `Open by Default` only where the association actually holds the necessary rights, and harden `Art. 18` with written-contract, pricing, and full-lifecycle recusal guardrails for paid board-member roles. The remaining legal follow-up is contractual implementation, not another statutes-only rewrite.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_FactHarbor_Statutes_Art18_Art24_Hardening.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Session Review Follow-Up: Locale And Visibility Route Coverage -- [Standard] [open-items: yes]
**For next agent:** A later external review turned out to be partly stale after the server-owned idle-timeout fixes, but two follow-ups were still worth landing. [page.tsx](/c:/DEV/FactHarbor/apps/web/src/app/analyze/select/[draftId]/page.tsx) no longer hardcodes `en-GB` for preparation-page timestamps and now uses the browser locale, while [claim-selection-drafts-routes.test.ts](/c:/DEV/FactHarbor/apps/web/test/unit/app/api/fh/claim-selection-drafts-routes.test.ts) now covers the `hide` and `unhide` proxy routes explicitly. The remaining residual risk is still the same one noted in the earlier review disposition: there is no dedicated API-side test harness yet for direct backend coverage of the session idle auto-proceed state machine.

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Verdict Citation Sanitation And SR Sparse Early Exit -- [Significant] [open-items: yes]
**For next agent:** Two deferred Grander follow-ups were revisited as low-hanging slices. [verdict-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-stage.ts) now reverts a challenge-adjusted verdict to the advocate state when phantom-ID cleanup empties the decisive citation side, instead of carrying a partially grounded adjustment forward. [sr-eval-engine.ts](/c:/DEV/FactHarbor/apps/web/src/lib/source-reliability/sr-eval-engine.ts) now skips sequential refinement only for primary `insufficient_data` / `score = null` cases with effectively sparse grounding (empty pack, single item, or zero grounded citations). The cache layer discussed in the original SR idea was intentionally not implemented because it is not low-hanging.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Verdict_Citation_Sanitation_And_SR_Sparse_Early_Exit.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | FactHarbor Statutes Remove Paid Board Operational Roles -- [Standard] [open-items: yes]
**For next agent:** [DRAFT_Vereinsstatuten_FactHarbor_DE.md](/c:/DEV/FactHarbor/Docs/Legal/DRAFT_Vereinsstatuten_FactHarbor_DE.md) and [DRAFT_Vereinsstatuten_FactHarbor_EN.md](/c:/DEV/FactHarbor/Docs/Legal/DRAFT_Vereinsstatuten_FactHarbor_EN.md) no longer permit paid operational board-member roles. `Art. 18(4)` now states the opposite rule: during their term, board members may not perform paid operational activities for the association outside the board function under employment, contractor, or comparable arrangements. This removes the main Zurich-focused dual-role filing risk identified in the second debate, but it does not by itself resolve any separate question about whether the board minimum should remain at `2`.

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | FactHarbor Statutes Finalization And Draft-Status Removal -- [Standard] [open-items: yes]
**For next agent:** The statutes were finalized as separate governing documents and renamed to [Vereinsstatuten_FactHarbor_DE.md](/c:/DEV/FactHarbor/Docs/Legal/Vereinsstatuten_FactHarbor_DE.md) and [Vereinsstatuten_FactHarbor_EN.md](/c:/DEV/FactHarbor/Docs/Legal/Vereinsstatuten_FactHarbor_EN.md). The embedded founding-record and draft-review sections were removed from the statutes because the founding protocol now lives separately in [Gruendungsprotokoll_FactHarbor_2026-04-23.md](/c:/DEV/FactHarbor/Docs/Legal/Gruendungsprotokoll_FactHarbor_2026-04-23.md) / `.pdf`, the German file no longer carries `ENTWURF`, and the English reference translation now points to the final German filename and has the adopted date filled in. Live references in the legal/checklist/xwiki docs were updated to the final filenames and post-founding status. Remaining legal follow-up is limited to operational matters such as Handelsregister / tax filing package completeness and whether the 2-person board should later be expanded for governance resilience.

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | FactHarbor Statutes PDF Export And Signature Clarification -- [Standard] [open-items: yes]
**For next agent:** PDF exports were generated at [Vereinsstatuten_FactHarbor_DE.pdf](/c:/DEV/FactHarbor/Docs/Legal/Vereinsstatuten_FactHarbor_DE.pdf) and [Vereinsstatuten_FactHarbor_EN.pdf](/c:/DEV/FactHarbor/Docs/Legal/Vereinsstatuten_FactHarbor_EN.pdf), with the checklist status kept aligned to the already-held founding package. Zurich Handelsregister guidance confirms that the statutes must be dated and signed by one board member for filing, but it does not require every page to be signed; the remaining practical follow-up is whether to add a visible signature block to the statutes source or sign the printed/PDF final version manually before submission.

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | FactHarbor Statutes Signature Block And Updated DE PDF -- [Standard] [open-items: yes]
**For next agent:** The binding German statutes now include a formal end-of-document signature block in [Vereinsstatuten_FactHarbor_DE.md](/c:/DEV/FactHarbor/Docs/Legal/Vereinsstatuten_FactHarbor_DE.md). The original `Vereinsstatuten_FactHarbor_DE.pdf` could not be overwritten because another process had the file open, so the refreshed PDF with the signature block was emitted as [Vereinsstatuten_FactHarbor_DE_unterschriftsfassung.pdf](/c:/DEV/FactHarbor/Docs/Legal/Vereinsstatuten_FactHarbor_DE_unterschriftsfassung.pdf). If the canonical filename matters later, close the open PDF handle and re-render or rename deliberately.

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | NPO Formation Checklist International Recognition Update -- [Standard] [open-items: yes]
**For next agent:** [NPO_Formation_Checklist.md](/c:/DEV/FactHarbor/Docs/Legal/NPO_Formation_Checklist.md) now states the actual recognition stack explicitly: Zurich commercial-register entry, Zurich tax exemption, then Goodstack / TechSoup / Candid, with NGOsource ED only when U.S. foundation fundraising becomes relevant. The checklist now includes an exact ordered next-step section from the current post-founding state, updates the Handelsregister filing details to match the official Zurich process more closely, and adds a compact official-source block at the end.

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | NPO Formation Checklist Handelsregister Filing Pack -- [Standard] [open-items: yes]
**For next agent:** [NPO_Formation_Checklist.md](/c:/DEV/FactHarbor/Docs/Legal/NPO_Formation_Checklist.md) now includes a concrete Zurich Handelsregister submission pack for FactHarbor under the official-registration phase: exact required / conditional documents, explicit use of the current statutes and protocol file paths, and a recommended assembly order for finalizing signatures, acceptance declarations, board-constitution minutes, signature certifications, and the registration form. The remaining operational question is whether the founders want to rely on the existing founding protocol for board election acceptance or create a separate acceptance declaration to reduce filing risk.

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Session And Job Read-Route Queue Recoverability -- [Significant] [open-items: yes]
**For next agent:** The queue hang was not normal capacity pressure. In the live Next runtime, the background drain/watchdog path was not sufficient on its own, so queued sessions and stale running jobs could sit indefinitely. The fix was to make the UI-polled read routes kick recovery opportunistically: [claim-selection-drafts/[draftId]/route.ts](/c:/DEV/FactHarbor/apps/web/src/app/api/fh/claim-selection-drafts/[draftId]/route.ts) now triggers `drainDraftQueue()`, and [jobs/route.ts](/c:/DEV/FactHarbor/apps/web/src/app/api/fh/jobs/route.ts) plus [jobs/[id]/route.ts](/c:/DEV/FactHarbor/apps/web/src/app/api/fh/jobs/[id]/route.ts) now trigger `drainRunnerQueue()`. This recovered the real stuck session `5a6162785b434263852b513d37a159de` and resumed progress on job `a5f79bc1d8e545ceab8d80dc3df0fe12`. The remaining queued final jobs are expected because the local env still has `FH_RUNNER_MAX_CONCURRENCY=1`.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Session_And_Job_Read_Route_Queue_Recoverability.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Session Preparation Text-First Follow-On Debate -- [Standard] [open-items: yes]
**For next agent:** Debate result was `MODIFY`: pursue a text-first session-preparation path only as a post-`ACS-1` architecture track, not as an ACS v1 semantic change. The target design is text-first extraction + bounded retry + Gate 1 + recommendation/selection, with preliminary evidence retained only as a structural validator-triggered Stage 1 rescue and universal rollout gated on shadow parity for both Stage 1 claim quality and downstream report quality.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Session_Preparation_Text_First_Follow_On_Debate.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Session Preparation Text-First Proposal Document -- [Standard] [open-items: yes]
**For next agent:** The debate result is now documented as a concrete `ACS-vNext` proposal in [2026-04-23_Session_Preparation_Text_First_Follow_On_Proposal.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-23_Session_Preparation_Text_First_Follow_On_Proposal.md). The key guard is unchanged: text-first default plus bounded structural rescue is a follow-on design track only, with shadow validation required before any rollout.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Session_Preparation_Text_First_Proposal_Document.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Session Preparation Semantics-Preserving Async Proposal -- [Standard] [open-items: yes]
**For next agent:** The active recommendation has changed. Keep current evidence-seeded Stage 1 semantics unchanged and solve the user problem with async session UX, a private active-sessions surface, readiness notifications, exact-result reuse under an identical analytical contract, and same-semantics Stage 1 hardening. The text-first redesign note remains only as retired historical context.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Session_Preparation_Semantics_Preserving_Async_Proposal.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Session Preparation Semantics-Preserving Async Proposal Review -- [Standard] [open-items: yes]
**For next agent:** The proposal holds up as the right direction for the async user-interaction problem because it builds on the current draft/prepared-job path and leaves Stage 1 semantics untouched. The main guard is Phase 2 reuse for URL inputs: exact URL alone is not semantics-complete because prepared snapshots depend on `resolvedInputText`, so reuse must include resolved-content identity or a freshness revalidation rule. Also keep the first inbox scoped honestly as same-browser resumability, not cross-device recovery.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Session_Preparation_Semantics_Preserving_Async_Proposal_Review.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | Selection Readiness Root Cause Plan Review Disposition -- [Significant] [open-items: yes]
**For next agent:** The active selection-readiness plan is now in [Docs/WIP/2026-04-24_Selection_Readiness_Root_Cause_And_Fix_Plan.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-24_Selection_Readiness_Root_Cause_And_Fix_Plan.md) and has been review-tightened. The key correction is sequencing: the strongest currently measured blocker is Stage 1 latency before selection, not repeated broad-input contract-preservation failure. Broad-input Stage 1 quality remains a real secondary investigation track, but only on concrete failing packets. The final priority order is latency first, quality investigation second, log attribution third.
→ Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Selection_Readiness_Root_Cause_Plan_Review_Disposition.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | ACS Default Interactive Mode via UCM -- [Significant] [open-items: yes]
**For next agent:** The `/analyze` web submit path no longer hardcodes `automatic` claim-selection mode. A new pipeline UCM field, `claimSelectionDefaultMode`, now controls the effective default and currently defaults to `interactive`. The draft-create proxy resolves the effective mode server-side and returns it to the client, so sessions created from `/analyze` now surface the manual AC Selection dialog again when the candidate-claim threshold is reached, while still preserving 15-minute idle auto-continue.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_ACS_Default_Interactive_Mode_UCM.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Session Preparation Semantics-Preserving Async Proposal Finalized After Review Debate -- [Standard] [open-items: yes]
**For next agent:** The async-preparation plan is now implementation-ready and review-narrowed. Phase 1 is explicitly same-browser async resumability only: private active-session surface, readiness signaling, and inbox safeguards while keeping Stage 1 semantics unchanged and draft access tokens in `sessionStorage`. Cross-draft prepared-result reuse and browser-persistent resume are now explicitly deferred to separate correctness/privacy review tracks instead of being treated as default follow-ons.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Session_Preparation_Semantics_Preserving_Async_Proposal.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Session Preparation Async Proposal Review Cleanup -- [Standard] [open-items: yes]
**For next agent:** The follow-up review cleanup fixed two traceability issues without changing direction: the finalized AGENTS output now points to the primary proposal handoff, and the Phase 2 acceptance criteria in the active async proposal are now expressed as observable checks instead of soft wording. Read this as a documentation precision pass on the async-proposal slice only, not as a statement that the entire repo is otherwise clean.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Session_Preparation_Async_Proposal_Review_Cleanup.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Session Browser-Close Recovery Review -- [Significant] [open-items: yes]
**For next agent:** The same-browser/browser-close session-resume slice has now had a proper code review pass. The main hardening was privacy and churn control: the persistent local session registry no longer stores actual input previews, only generic `Text session` / `URL session` labels, and the `/analyze` resume surface no longer rewrites that registry on every polling cycle when nothing changed. Browser-close recovery still depends on the scoped HttpOnly draft-access cookie plus authenticated re-fetch, and the idle auto-continue default is now 15 minutes via the existing `claimSelectionIdleAutoProceedMs` UCM path.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Session_Browser_Close_Recovery_Review.md

---
### 2026-04-23 | Lead Architect | Codex (GPT-5) | Internal Agent Knowledge CLI-First Implementation Slice -- [Significant] [open-items: yes]
**For next agent:** The CLI-first internal knowledge layer now exists at `packages/fh-agent-knowledge/` with a working cache and query surface. Use `npm run fh-knowledge -- preflight-task --task "..." [--role ...]` as the default entry point, not ad hoc file hunting. The key retrieval bug found during smoke testing is already fixed: `preflight-task` no longer hides the MCP thread when a role is supplied, and `search-handoffs` now resolves role aliases through the parsed role table and returns field-level reasons. The next step is adoption/documentation, not another redesign; the MCP adapter itself remains deferred by the active spec.
→ Docs/AGENTS/Handoffs/2026-04-23_Lead_Architect_Internal_Agent_Knowledge_CLI_First_Implementation_Slice.md

---
### 2026-04-23 | Lead Architect | Codex (GPT-5) | Internal Agent Knowledge Review Fixes -- [Standard] [open-items: yes]
**For next agent:** The three Senior Architect review items on `@factharbor/fh-agent-knowledge` are now addressed. Query commands auto-refresh stale cache and expose `cacheRefreshed: true`, `health`/`refresh` still report stale state without mutating it, Windows cache writes no longer rely on temp-file rename replacement semantics, and missing optional source files no longer crash manifest snapshotting. This leaves the package ready for adoption wiring rather than more package-internal debugging.
→ Docs/AGENTS/Handoffs/2026-04-23_Lead_Architect_Internal_Agent_Knowledge_Review_Fixes.md

---
### 2026-04-23 | Lead Architect | Codex (GPT-5) | Internal Agent Knowledge MCP Documentation Realignment -- [Standard] [open-items: yes]
**For next agent:** The current governing docs now explicitly supersede the old CLI-first-only deferral. [2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md) and [Docs/WIP/README.md](/c:/DEV/FactHarbor/Docs/WIP/README.md) now say the shared core and CLI are implemented and that the thin MCP adapter is the active next slice. Reviewer consolidation is: do not spend another cycle on adoption-vs-MCP debate; implement the MCP slice in this order: package dependency ownership, `scripts/fh-knowledge-mcp.mjs`, `src/adapters/mcp.mjs`, parity tests, then client wiring.
→ Docs/AGENTS/Handoffs/2026-04-23_Lead_Architect_Internal_Agent_Knowledge_MCP_Documentation_Realignment.md

---
### 2026-04-24 | Lead Architect | Codex (GPT-5) | Internal Agent Knowledge MCP Execution Checklist -- [Standard] [open-items: yes]
**For next agent:** The architecture did not need another planning round, but the first MCP coding slice now has an explicit execution freeze in [2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md): `stdio` only, exact tool names, direct `@modelcontextprotocol/sdk` ownership, thin-adapter-only responsibilities, and parity tests as the completion gate. Next is implementation, not more planning.
→ Docs/AGENTS/Handoffs/2026-04-24_Lead_Architect_Internal_Agent_Knowledge_MCP_Execution_Checklist.md

---
### 2026-04-24 | Lead Architect | Codex (GPT-5) | Internal Agent Knowledge MCP Adapter Implementation -- [Significant] [open-items: yes]
**For next agent:** The thin MCP adapter is now implemented in the repo. `@factharbor/fh-agent-knowledge` now owns direct MCP runtime dependencies, `scripts/fh-knowledge-mcp.mjs` launches a stdio server, `src/adapters/mcp.mjs` exposes the frozen 9-tool surface, and CLI/MCP parity is enforced through a shared operation registry plus real stdio tests. The next step is rollout and client wiring, not more retrieval-layer implementation.
→ Docs/AGENTS/Handoffs/2026-04-24_Lead_Architect_Internal_Agent_Knowledge_MCP_Adapter_Implementation.md

---
### 2026-04-24 | Lead Architect | Codex (GPT-5) | Internal Agent Knowledge MCP Omitted Arguments Fix -- [Standard] [open-items: no]
**For next agent:** The MCP interop regression is fixed. Zero-arg tools and the all-optional `refresh_knowledge` path in [mcp.mjs](/c:/DEV/FactHarbor/packages/fh-agent-knowledge/src/adapters/mcp.mjs) now accept omitted `arguments`, and [mcp-parity.test.mjs](/c:/DEV/FactHarbor/packages/fh-agent-knowledge/test/mcp-parity.test.mjs) covers the omitted-arguments case explicitly for `bootstrap_knowledge`, `check_knowledge_health`, and `refresh_knowledge`.
→ Docs/AGENTS/Handoffs/2026-04-24_Lead_Architect_Internal_Agent_Knowledge_MCP_Omitted_Arguments_Fix.md

---
### 2026-04-24 | Lead Architect | Codex (GPT-5) | Internal Agent Knowledge MCP Rollout Setup -- [Significant] [open-items: yes]
**For next agent:** The rollout surface is now in place. `Docs/DEVELOPMENT/Agent_Knowledge_MCP_Setup.md` is the central setup guide, `.cursor/mcp.json` and `.vscode/mcp.json` are committed project-scoped configs, and the main wrapper docs now tell agents to use `fhAgentKnowledge` `preflight_task` first with the CLI as fallback. The governing MCP spec and WIP index now reflect that rollout docs/configs are landed; the next step is real client validation and adoption, not more adapter logic.
→ Docs/AGENTS/Handoffs/2026-04-24_Lead_Architect_Internal_Agent_Knowledge_MCP_Rollout_Setup.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Dominant Proposition Senior Architect Review Disposition -- [Standard] [open-items: yes]
**For next agent:** The latest dominant-proposition plan was already aligned with most of the Senior Architect review. The remaining pass was a narrow clarification update: stronger `topLevelProposition` / `dominanceAssessment` orthogonality wording, explicit Stage 1 finalization-time `componentClaimIds` cross-reference validation language, a clearer “not a restatement exemption” prompt rule, and a clearer UI rule that `articleThesis` should not sit alongside `topLevelProposition` in the main headline surface. No implementation work was done in this slice.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Dominant_Proposition_Senior_Architect_Review_Disposition.md

---
### 2026-04-23 | Unassigned | Codex (GPT-5) | Session Resume Review Follow-up -- [Significant] [open-items: yes]
**For next agent:** The session-resume review follow-up closed the two real browser-close UX bugs. `ActiveClaimSelectionSessions.tsx` now keeps the `Open report` path available from persisted `lastKnownFinalJobId` even after the draft-access cookie is cleared, and the polling loop no longer remounts on every status transition. Added focused regressions for completed-session resume helpers and cancel-route cookie clearance.
→ Docs/AGENTS/Handoffs/2026-04-23_Unassigned_Session_Resume_Review_Followup.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | Stage 1 Preliminary Fetch Reuse For Selection Readiness -- [Significant] [open-items: yes]
**For next agent:** Phase 1 of the selection-readiness plan now has a concrete same-semantics latency reduction in code. [claim-extraction-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts) now reuses exact in-flight and successful URL fetches during Stage 1 preliminary search so duplicate query results do not re-download/re-parse the same source before AC selection becomes available. Review forced one important correction: failed and underlength fetches are evicted from the cache so later duplicates can retry, and focused regressions now cover both failure and short-body recovery paths.
→ Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Stage1_Preliminary_Fetch_Reuse_For_Selection_Readiness.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | ACS Recommendation Order Normalization -- [Standard] [open-items: no]
**For next agent:** The ACS recommendation validator no longer fails interactive sessions for order-only mismatch between `recommendedClaimIds` and `rankedClaimIds`. [claim-selection-recommendation.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-selection-recommendation.ts) now preserves all real set/cardinality invariants but normalizes the recommended subset into ranked order before returning it, and [claim-selection-recommendation.test.ts](/c:/DEV/FactHarbor/apps/web/test/unit/lib/analyzer/claim-selection-recommendation.test.ts) covers both direct validator normalization and the live generator path.
→ Docs/AGENTS/Handoffs/2026-04-24_Unassigned_ACS_Recommendation_Order_Normalization.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | Selection Readiness Debate Consolidation And Implementation -- [Significant] [open-items: yes]
**For next agent:** The three-item follow-up was debate-reviewed and narrowed before code landed. Live cross-session prepared-snapshot reuse remains deferred, but forward-only `preparedStage1.preparationProvenance` is now embedded for future exact/auditable reuse decisions. The shippable fixes in this slice are concurrent draft/job log attribution via async-scoped prefixes in [debug.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/debug.ts) and [internal-runner-queue.ts](/c:/DEV/FactHarbor/apps/web/src/lib/internal-runner-queue.ts), plus preparation-page wording that now explains the true order: Stage 1 first, then recommendation, then manual selection when needed.
→ Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Selection_Readiness_Debate_Consolidation_And_Impl.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | Selection Readiness Living Plan Sync -- [Standard] [open-items: yes]
**For next agent:** The living plan in [2026-04-24_Selection_Readiness_Root_Cause_And_Fix_Plan.md](/c:/DEV/FactHarbor/Docs/WIP/2026-04-24_Selection_Readiness_Root_Cause_And_Fix_Plan.md) now matches what actually shipped. It explicitly records that cross-session prepared reuse is still deferred for live behavior, that provenance-only groundwork landed, that recommendation order-only mismatch is fixed, and that log attribution plus preparation-copy clarification are already implemented. Treat that WIP note, not just the handoff, as the current source of truth for what remains next on selection readiness.
→ Docs/WIP/2026-04-24_Selection_Readiness_Root_Cause_And_Fix_Plan.md

---
### 2026-04-24 | Lead Architect | Codex (GPT-5) | Internal Agent Knowledge MCP Schema Validation And Parity Hardening -- [Standard] [open-items: yes]
**For next agent:** Required-input MCP tools in [packages/fh-agent-knowledge/src/adapters/mcp.mjs](/c:/DEV/FactHarbor/packages/fh-agent-knowledge/src/adapters/mcp.mjs) now fail at the schema boundary instead of falling through to downstream `requireOption(...)`, while zero-arg tools still tolerate omitted `arguments`. [packages/fh-agent-knowledge/test/mcp-parity.test.mjs](/c:/DEV/FactHarbor/packages/fh-agent-knowledge/test/mcp-parity.test.mjs) now keeps `cacheSource` and `warnings` strict and treats only `cacheRefreshed` as volatile for query parity; the Claude setup guide and the local `C:/Users/rober/.claude.json` config both use direct `node` launch instead of `cmd /c`.
→ Docs/AGENTS/Handoffs/2026-04-24_Lead_Architect_Internal_Agent_Knowledge_MCP_Schema_Validation_And_Parity_Hardening.md

---
### 2026-04-24 | Senior Developer | Codex (GPT-5) | Code Review Findings Fix -- [Standard] [open-items: yes]
**For next agent:** The actionable review findings were fixed locally: trusted-header-only draft IP forwarding in [claim-selection-draft-proxy.ts](/c:/DEV/FactHarbor/apps/web/src/lib/claim-selection-draft-proxy.ts), bounded/cancel-safe draft restart in [ClaimSelectionDraftService.cs](/c:/DEV/FactHarbor/apps/api/Services/ClaimSelectionDraftService.cs), `IsHidden` bootstrap repair in [Program.cs](/c:/DEV/FactHarbor/apps/api/Program.cs), and metadata-only source refetch in [research-acquisition-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/research-acquisition-stage.ts). [claimboundary-pipeline.test.ts](/c:/DEV/FactHarbor/apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts) now matches the updated acquisition contract. Open item: DevOps must configure and strip the trusted client-IP header before relying on per-client API draft rate limiting behind Next.js.
→ Docs/AGENTS/Handoffs/2026-04-24_Senior_Developer_Code_Review_Findings_Fix.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | Pipeline Quality, Speed, And Cost Improvement Plan -- [Significant] [open-items: yes]
**For next agent:** Use [2026-04-24_Unassigned_Pipeline_Quality_Speed_Cost_Improvement_Plan.md](/c:/DEV/FactHarbor/Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Pipeline_Quality_Speed_Cost_Improvement_Plan.md) as the current reconciled plan. First slice should be baseline/observability plus Stage 2 relevance/applicability fail-open counters and handling, then Stage 3 ClaimAssessmentBoundary concentration stabilization; safe cost work is limited to exact reuse, telemetry, default-off experiments, and structurally validated retry reduction.
→ Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Pipeline_Quality_Speed_Cost_Improvement_Plan.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | SerpApi Starter Sufficiency Investigation -- [Standard] [open-items: yes]
**For next agent:** SerpApi is not currently active in local or deployed search ordering; both use Google CSE first, Serper second, Wikipedia supplementary. Starter is enough as a Google fallback for one regular user based on local telemetry, but not enough as primary search for frequent daily full analyses. Relevant anchors: [web-search.ts](/c:/DEV/FactHarbor/apps/web/src/lib/web-search.ts), [search.default.json](/c:/DEV/FactHarbor/apps/web/configs/search.default.json), deployed admin `/api/version`, and `apps/api/factharbor.db` `ResultJson.searchQueries`.
→ Docs/AGENTS/Handoffs/2026-04-24_Unassigned_SerpApi_Starter_Sufficiency_Investigation.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | Verdict Citation Integrity Guard -- [Standard] [open-items: yes]
**For next agent:** [verdict-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-stage.ts) now runs `enforceVerdictCitationIntegrity(...)` after phantom cleanup and before spread/validation, removing structurally invalid/non-direct final citations and moving bucket-mismatched direct citations based on existing `claimDirection`. Verify live only after commit/restart; full `npm test` had runner timeouts that passed in isolated rerun.
→ Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Verdict_Citation_Integrity_Guard.md

---
### 2026-04-24 | Unassigned | Codex (GPT-5) | Verdict Citation Integrity Guard Review Follow-up -- [Standard] [open-items: yes]
**For next agent:** The two follow-up review findings are addressed in [verdict-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-stage.ts): explicit neutral `claimDirection` citations are removed from final directional buckets, including post-validation repair output, and decisive-side citation collapse now emits `verdict_citation_integrity_guard` with `error` severity. Focused verdict/warning tests and the web build passed; live jobs still require commit/restart first.
→ Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Verdict_Citation_Integrity_Guard.md
