# Agent Outputs Log -- Active Index

This file is a **triage-weight index**, not a full log. Each entry is a 3-line summary
with a link to the full handoff file in `Docs/AGENTS/Handoffs/`.

Full protocol: `Docs/AGENTS/Policies/Handoff_Protocol.md`.
Archived entries: `Docs/ARCHIVE/Agent_Outputs_YYYY-MM.md` + `Docs/ARCHIVE/Handoffs/YYYY-MM/`.

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
### 2026-04-18 | Unassigned | Codex (GPT-5) | Current Official Data Discovery Prioritization -- [Standard] [open-items: yes]
**For next agent:** Stage 2 acquisition now gives capped same-family follow-up slots to direct document/data artifacts before feed/listing hops, so the newest official source-native files are less likely to be dropped behind navigation pages. Main anchors are `apps/web/src/lib/analyzer/research-acquisition-stage.ts` and the new regression in `apps/web/test/unit/lib/analyzer/research-acquisition-stage.test.ts`. Verify next with an exact-input live rerun of the asylum/WWII claim and compare against jobs `25dea04fb0da4ab5ad12fd5dbf76896a` and `23d05e2f16d9493d9a2a37a215d9813c`.
→ Docs/AGENTS/Handoffs/2026-04-18_Unassigned_Current_Official_Data_Discovery_Prioritization.md
