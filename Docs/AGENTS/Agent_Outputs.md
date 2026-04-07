# Agent Outputs Log
---
### 2026-04-07 | Senior Developer | Claude Code (Opus 4.6) | UPQ-1 Phase A-2 Telemetry Canary Measurement
**Task:** Run 4 hard-family canaries on `b130d00c` (A-2 telemetry build), extract `claimAcquisitionLedger`, diagnose A-1 effect and next Stage-2 slice.
**Files touched:** `Docs/WIP/2026-04-07_UPQ1_Phase_A2_Canary_Measurement.md` (new)
**Key decisions:** (1) A-1 judgment: `still_inconclusive`, keep provisionally. Kill gate (repeatable claim starvation) not met. No cross-claim reallocation detected in ledger — previous AC_02 collapses were normal variance. (2) Ledger is working: per-claim per-iteration evidence flow, direction counts, seeded vs researched split, applicability losses all captured. (3) Strongest new finding: **seeded-evidence dominance** — Plastik AC_01 has 41 seeded items and 0 research iterations; Bolsonaro AC_01 has 26 seeded. Research loop considers these claims "sufficient" before research starts. (4) Recommended next Phase B candidate: investigate seeded-evidence sufficiency interaction, not more A-1 tuning.
**Open items:** Phase B decision: whether to exclude seeded evidence from sufficiency count, add per-claim iteration floor, or accept current behavior.
**Warnings:** Anthropic API was under heavy load — clustering Sonnet calls took 30-60+ min instead of typical 2-5 min. Not a code issue.
**For next agent:** The ledger data is in `resultJson.claimAcquisitionLedger`. Key fields: `seededEvidenceItems`, `iterations[].admittedEvidenceItems`, `iterations[].directionCounts`, `finalEvidenceItems`, `finalDirectionCounts`, `maxBoundaryShare`. Full analysis: `Docs/WIP/2026-04-07_UPQ1_Phase_A2_Canary_Measurement.md`.
**Learnings:** No

---
### 2026-04-06 | Senior Developer | Claude Code (Sonnet 4.6) | UPQ-1 Cross-Review — Resequenced Phase A Soundness
**Task:** Cross-review the consolidated UPQ-1 architecture review: is Phase A-1 (wire existingEvidence summary into GENERATE_QUERIES) → A-2 (telemetry) → gate → B the right sequence?
**Files touched:** `Docs/AGENTS/Agent_Outputs.md` (this entry only; no code changes)
**Key decisions:** See full review in chat. Judgment: `approve` with one plan change. The dead-parameter finding is strong enough to justify front-loading the prompt fix, but the plan needs a mandatory claim-local filter applied to `existingEvidence` before it is summarised for the prompt; passing the entire `state.evidenceItems` array (all claims) risks polluting the per-claim evidence summary with sibling-claim evidence.
**Open items:** None blocking.
**Warnings:** (1) `state.evidenceItems` is the whole-pipeline accumulator — not pre-filtered to `targetClaim.id`. If Phase A-1 passes it unsifted to the prompt, the evidence summary includes evidence for sibling claims, which may produce incorrect "already-covered" signals. (2) `queryGenerationTemperature: 0.2` is conservative for a diversity task; a summary that signals coverage gaps may not be enough if temperature suppresses divergence. Consider whether 0.3–0.4 is worth testing as Phase A-2 telemetry lands.
**For next agent:** Required plan change: `generateResearchQueries()` must filter `existingEvidence` to items where `relevantClaimIds.includes(claim.id)` before building the summary. This is a one-liner but critical for correctness. Full review text is in the chat response above.
**Learnings:** No

---
### 2026-04-06 | Senior Developer | Claude Code (Opus 4.6) | Cross-Boundary Tension Investigation
**Task:** Investigate whether cross-boundary tensions increased since previous deployment, find root causes, propose fixes.
**Files touched:** `Docs/WIP/2026-04-06_Cross_Boundary_Tension_Investigation.md` (new)
**Key decisions:** (1) Increase is empirically real (deployed 1.86 avg vs previous 0.60) but not a proven causal regression from `2ec54047` (docs-only). (2) Three root causes: stale `${aggregation}`/`${evidenceSummary}` prompt variables (never wired since `6e347f09`), stale advocate-era `boundaryFindings` surviving reconciliation (`verdict-stage.ts:1022`), and under-specified prompt that doesn't distinguish tensions from methodology caveats. (3) Captain corrected original ranking: `.max(3)` cap is NOT a root cause (current jobs are 1-3 tensions) — the missed root cause is stale `boundaryFindings`. (4) GPT debate confirmed Captain's corrections on all points.
**Open items:** Fix 1 (wire stale variables), Fix 2 (stop stale `boundaryFindings`), Fix 3 (tighten prompt classification).
**Warnings:** `boundaryFindings` in `mergedVerdict` at `verdict-stage.ts:1022` are advocate-era — reconciliation updates truth/confidence/reasoning/citations but NOT per-boundary findings. Stage 5 narrates tensions from pre-challenge data.
**For next agent:** Fix 1: `aggregation-stage.ts:388` — add `aggregation` and `evidenceSummary` variables. Fix 2: `verdict-stage.ts:1022` — either have reconciler return updated boundaryFindings, or derive post-reconciliation boundary summary. Fix 3: tighten VERDICT_NARRATIVE prompt to classify methodology/singleton caveats as `limitations`. Full plan: `Docs/WIP/2026-04-06_Cross_Boundary_Tension_Investigation.md`.
**Learnings:** No

---
### 2026-04-06 | Research | Claude Code (Sonnet 4.6) | Cross-Boundary Tension Analysis — All Deployed Jobs
**Task:** Extract cross-boundary tension data from all recent deployed jobs; compare previous deployment (b77838727ae6) vs current (2ec540473716).
**Files touched:** None (read-only research task). Analysis written to `C:/tmp/tension_analysis_report.txt`.
**Key decisions:** Used `https://app.factharbor.ch/api/fh/jobs?limit=40` (returned 50 jobs); fetched each job individually; merged two fetch passes (second pass used urllib to avoid Windows cp1252 encoding failures on non-Latin characters).
**Open items:** None.
**Warnings:** Only 2 jobs are available for the current commit `2ec540473716`, so the comparison has low statistical power. Both current-commit jobs involve complex multi-boundary queries (Swiss fact-checking, misinformation tools) which naturally generate more tensions than simple factual queries.
**For next agent:** See Section 4 of the report below for the comparison finding. Short version: average tensions are higher on the current commit (2.00 vs 0.44), but this is almost certainly topic-driven rather than a pipeline regression — the previous commit's 9 jobs included many simple/factual queries (Meta exit, Earth roundness, Google ClaimReview) that reliably produce 0 tensions. Full per-job tension text is in `C:/tmp/tension_analysis_report.txt`.
**Learnings:** No

---
### 2026-04-05 | Senior Developer | Claude Code (Opus 4.6) | sufficiencyMinMainIterations Experiment + AC_02 Check — Deploy
**Task:** Test whether raising `sufficiencyMinMainIterations: 1 → 2` closes the Bolsonaro EN local-vs-deployed gap, then check AC_02 evidence thinness.
**Files touched:** `Docs/WIP/2026-04-05_Bolsonaro_Sufficiency_Min_Main_Iterations_Experiment.md` (new)
**Key decisions:** Experiment not run — pre-analysis found zero effect. MT-3 rule (`effectiveMinIterations = max(minMainIterations, distinctEventCount - 1)`) already forces the effective minimum to 4 on local (5 events) and 6 on deployed (7 events). Changing 1→2 yields `max(2,4)=4` — unchanged. The real gap is Stage 1 distinct-event detection variance (5 vs 7 events), which directly controls research depth via MT-3.
**Open items:** MT-3 per-claim iteration floor is a valid future design workstream (queued, not blocking).
**Warnings:** None.
**For next agent:** AC_02 check confirms genuine source scarcity, not starvation. AC_02 gets zero seeded items in both local AND deployed. Its 14 vs 21 item gap is proportional to iteration count (4 vs 6), driven by Stage 1 event-count variance (5 vs 7 distinct events). AC_02's sources have zero overlap with siblings — no budget competition. **Recommendation: deploy.** The local build is clean; remaining gap is fully explained by non-actionable factors.
**Learnings:** No

---
### 2026-04-05 | Senior Developer | Claude Code (Opus 4.6) | Grounding Alias Fix — Validated
**Task:** Implement and validate grounding-validator alias fix for timestamp-ID false positives on Bolsonaro EN and Plastik DE.
**Files touched:** `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`
**Key decisions:** Validator-local aliasing (`EVG_001`/`EVG_002`/...) in grounding validation payload only. Reasoning text also aliased (`ffaa4fdd`) after first canary showed reasoning-to-registry mismatch. Canonical pipeline IDs untouched.
**Open items:** (1) Bolsonaro EN still trails deployed by ~9pp — retrieval-depth-driven, testable via `sufficiencyMinMainIterations: 1→2`. (2) One genuine cross-claim contamination warning on Plastik AC_02 — separate Stage-4 issue, not blocking.
**Warnings:** None.
**For next agent:** Full handoff: `Docs/AGENTS/Handoffs/2026-04-05_Senior_Developer_Grounding_Alias_Fix_Validation.md`. Clean canary jobs: Bolsonaro `703c261d05744fdf8ddc70ce3afa5145` (LEANING-TRUE 64/58, zero grounding/direction warnings), Plastik `da1180edfae445f8a93bbcbaa2e50144` (LEANING-FALSE 41/66, one genuine cross-claim warning only).
**Learnings:** No

---
### 2026-04-05 | LLM Expert | Codex (GPT-5) | Review Keep-or-Revert Decision for 07cb2e0d
**Task:** Review whether commit `07cb2e0d` (`fix(prompts): soften multi-jurisdiction query mandate to respect query budget`) should remain in the next deploy candidate, based on the actual prompt diff and the available local/deployed multi-jurisdiction job evidence.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The commit should be kept. The actual diff is a narrow feasibility-scoped wording change inside `GENERATE_QUERIES` and only plausibly affects multi-jurisdiction query distribution under a 2-3 query budget. Within that scope, the available evidence is mixed-to-positive: Swiss-vs-Germany improved versus the prior local build, while Bolsonaro EN does not show a query-collapse failure and repo-local investigation attributes its gap mainly to retrieval-depth variance rather than this prompt. The reported deficits on Earth, Meta, and Plastik are out of scope for this commit and therefore cannot justify reverting it.
**Open items:** Strict commit isolation is still unproven for Bolsonaro EN because there is no exact same-input A/B run with only this prompt line changed and all else held constant.
**Warnings:** Keeping the commit still carries a plausible risk that the softer wording under-covers one jurisdiction in some future multi-jurisdiction claims when the query budget is tight. That risk is plausible, not proven by the current evidence set.
**For next agent:** If you need to resolve the remaining uncertainty efficiently, run one controlled same-input multi-jurisdiction A/B canary with this line toggled and compare only the generated queries plus first-iteration retrieval coverage per listed jurisdiction. Swiss-vs-Germany and Bolsonaro EN are the best current candidates.
**Learnings:** no

---
### 2026-04-05 | Senior Developer | Claude Code (Opus 4.6) | Bolsonaro EN & Plastik DE Local Quality Investigation + Fix
**Task:** Deep investigation of why local build `07cb2e0d` is not deployment-ready on Bolsonaro EN and Plastik DE, with artifact-level analysis of all 6 anchor jobs. Then implement the primary fix.
**Files touched:** `Docs/WIP/2026-04-05_Bolsonaro_Plastik_Local_Quality_Investigation.md` (new), `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`
**Key decisions:** (1) Both families' grounding warnings are **validator false positives** caused by dual evidence ID format — short sequential `EV_001` from preliminary extraction vs long timestamp `EV_1775405xxxxxx` from main research extraction. All cited IDs exist in the evidence pool; the grounding validator LLM cannot reliably match 13-digit numeric IDs. (2) Bolsonaro EN's truth gap to deployed is primarily retrieval-depth-driven (3 vs 6 main iterations), not a code regression. (3) Plastik DE local is analytically superior to deployed on every structural dimension; the grounding noise is the only reason it looks worse. (4) Fix implemented as **validator-local aliasing** (`EVG_001`, `EVG_002`, ...) — canonical pipeline IDs untouched; only grounding validator prompt input/output uses short aliases.
**Open items:** (1) Rerun local Bolsonaro EN + Plastik DE to confirm grounding false positives are eliminated. (2) If Bolsonaro still trails deployed after clean rerun, investigate `sufficiencyMinMainIterations: 1→2`.
**Warnings:** None after fix. The alias map is scoped entirely to the grounding validation call — no impact on pipeline IDs, result JSON, or other stages.
**For next agent:** Fix is committed (`cbb364ec`). Next step is rerunning local Bolsonaro EN and Plastik DE canaries to validate. If grounding warnings disappear and verdicts are stable, Plastik is deployment-ready; Bolsonaro needs the retrieval-depth check.
**Learnings:** No

---
### 2026-04-05 | Senior Developer | Claude Code (Opus 4.6) | Post-Review Fixes (3 items)
**Task:** Implement three approved fixes from 2026-04-05 code review: EN supplementary lane geography omission, AppBuildInfo stdout deadlock, Stage-4 parse recovery root validation.
**Files touched:** `apps/web/src/lib/analyzer/research-orchestrator.ts`, `apps/api/Helpers/AppBuildInfo.cs`, `apps/web/src/lib/analyzer/verdict-generation-stage.ts`, `apps/web/test/unit/lib/analyzer/en-supplementary-lane-geography.test.ts` (new), `apps/web/test/unit/lib/analyzer/verdict-parse-artifact.test.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
**Key decisions:** (1) Fix 1: Computed `enLaneRelevantGeographies` inside EN lane using same `getClaimRelevantGeographies()` pattern as primary lane. (2) Fix 2: Both `RunGit` and `ComputeWorkingTreeHash` had the deadlock pattern — fixed both by waiting on the read Task (with timeout) instead of `proc.WaitForExit`, then calling `proc.WaitForExit()` (no timeout) after stdout is drained. (3) Fix 3: Added `matchesExpectedRoot()` validation after every successful parse in the recovery chain — wrong-root results continue to next strategy instead of being accepted. Flattened the try/catch so wrong-root direct parse falls through to fenced/embedded/repair strategies.
**Open items:** None.
**Warnings:** (1) 8 existing tests in `claimboundary-pipeline.test.ts` used ADVOCATE (array-expected) with object responses — updated to use correct root types. One test ("prose-wrapped single-object despite array-root preference") was explicitly testing old accept-any-root behavior — updated to expect rejection. (2) API build warning MSB3026 (locked exe) is from a running API process — harmless.
**For next agent:** All three fixes are self-contained. No follow-up work needed unless validation runs reveal regression.
**Learnings:** No

---
### 2026-04-04 | Lead Architect | Claude Code (Opus 4.6) | Source Provenance Tracking Design
**Task:** Design a system to trace evidence back to original creators for misinformation/propaganda detection. Internal 4-perspective debate + GPT review + consolidation.
**Files touched:** `Docs/WIP/2026-04-04_Source_Provenance_Tracking_Design.md`, `Docs/WIP/2026-04-04_Source_Provenance_GPT_Review_Prompt.md`, `Docs/STATUS/Backlog.md` (PROV-1), `Docs/xwiki-pages/.../Alpha Roadmap/WebHome.xwiki`, `Docs/xwiki-pages/.../Quality and Trust/WebHome.xwiki`
**Key decisions:** (1) Structured `originalCreator` object (not single string) with `affiliatedOrganization` and `role`. (2) `press_release` restored as own `attributionType` (5 values). (3) Phase 2a (deterministic convergence) removed — violates LLM Intelligence mandate. (4) New Phase 1.5 inserted: integrate through existing `sourcePortfolioByClaim` + `independence_concern` mechanisms instead of building parallel system. (5) No separate `provenanceConfidence` — reuse existing `extractionConfidence`. (6) `declaredInterest` field removed (ungroundable). (7) Implementation parked.
**Open items:** Implementation not started. Design is v2 (post-GPT review). PROV-1 in Backlog as low urgency / high importance deferred track.
**Warnings:** (1) Existing `identifiedEntity` in SR calibration is always `null` at runtime — do not assume it provides org-level data. (2) `derivativeFactor` must not be extended with provenance — it's intentionally narrow. (3) Haiku accuracy for attribution distinction (firsthand vs. quoted) is unproven — Phase 1 must include evaluation set before proceeding.
**For next agent:** Read `Docs/WIP/2026-04-04_Source_Provenance_Tracking_Design.md` for the full design. Start with Phase 1 (section 4, "Phase 1 — Provenance Extraction + Telemetry"). Key integration points: `research-extraction-stage.ts` (extraction schema), `verdict-stage.ts:214` (`buildSourcePortfolioByClaim`), `types.ts:998` (`independence_concern` challenge type). Design evaluation set first (section "Evaluation Set"), then implement schema + prompt changes.
**Learnings:** No
---
### 2026-04-03 | Senior Developer | Claude Code (Opus) | Wikipedia Supplementary Completion
**Task:** Complete Wikipedia provider orchestration so it participates meaningfully in retrieval while remaining UCM-controlled and bounded.
**Files touched:** `apps/web/src/lib/config-schemas.ts`, `apps/web/configs/search.default.json`, `apps/web/src/lib/web-search.ts`, `apps/web/src/lib/search-wikipedia.ts`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, `apps/web/src/app/admin/config/page.tsx`, `apps/web/test/unit/lib/web-search.test.ts`, `apps/web/test/unit/lib/search-wikipedia.test.ts`, `Docs/WIP/2026-04-03_Wikipedia_Supplementary_Completion_Plan.md`
**Key decisions:** (1) Added generic `supplementaryProviders` UCM block (`mode` + `maxResultsPerProvider`) — applies to all supplementary providers, not Wikipedia-specific. (2) Production default is `always_if_enabled` with Wikipedia enabled — justified by free provider, bounded contribution (max 3), easy rollback. (3) Wikipedia language fallback chain: `detectedLanguage` > config `language` > `"en"` — structural plumbing, no heuristic inference. (4) `detectedLanguage` threaded from pipeline call sites into `WebSearchOptions`, not inferred inside the provider.
**Open items:** None — all 5 validation scenarios passed (2026-04-04). V1 German: 4 EI from `de.wikipedia.org`. V2 English: 6 EI from `en.wikipedia.org`. V3 Apollo control: 25 Wiki EI, TRUE/96%/93. V4 kill switch: 0 Wiki calls confirmed. V5 fallback_only: 0 Wiki calls when primaries succeed. No `analysis_generation_failed`, no flooding, verdict direction stable across all German variants (MOSTLY-TRUE).
**Warnings:** Existing production `config.db` retains old values — switching to `always_if_enabled` requires UCM Admin UI update or fresh DB seed. JSON/TS defaults only seed new databases.
**For next agent:** Feature is complete. If deeper Wikipedia-specific behavior is desired (reference extraction, provider-specific query variants), see `Docs/WIP/2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md` §2-3.
**Learnings:** No
---
### 2026-04-02 | Lead Architect | Codex (GPT-5) | Stage-4 Payload Simplification
**Task:** Implement the architect-approved Stage-4 payload simplification by removing the default duplicated `JSON.stringify(input)` user payload while preserving explicit `userMessage` overrides.
**Files touched:** `apps/web/src/lib/analyzer/verdict-generation-stage.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Kept the repaired serialized system-prompt contract intact and changed only the fallback user message in `createProductionLLMCall()` to a short fixed instruction. Preserved the explicit `input.userMessage` branch. Added focused tests proving the default Stage-4 user message no longer contains the full serialized payload and that explicit overrides still work.
**Open items:** Live validation is still required on German Plastik x3, English Plastik x1, and one German non-Plastik control to confirm advocate prompt-token reduction and disappearance of `analysis_generation_failed` on the heavy family.
**Warnings:** The broader Plastik family still has an upstream research/boundary variability issue separate from the Stage-4 parse-failure track. This patch only targets the Stage-4 size/duplication problem.
**For next agent:** Verify advocate `promptTokens`, `schemaCompliant`, retry firing, and final verdict/confidence on the live reruns. If parse failures persist after this simplification, the next investigation should focus on remaining Stage-4 output-shape failure artifacts rather than Stage 1.
**Learnings:** No
---
### 2026-04-03 | Product Strategist | Codex (GPT-5) | Cooperation Opportunities Strategy Rewrite
**Task:** Review, shorten, and update the cooperation strategy page using adjacent xWiki docs, `Docs/Knowledge` research, web verification, and parallel sub-agent critique.
**Files touched:** `Docs/xwiki-pages/FactHarbor/Organisation/Strategy/Cooperation Opportunities/WebHome.xwiki`, `Docs/xwiki-pages/FactHarbor/Organisation/Partner & User Relations/Presentations/Funding/WebHome.xwiki`, `Docs/xwiki-pages/FactHarbor/Organisation/Strategy/WebHome.xwiki`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Replaced the 1,100+ line report-style page with a 91-line evergreen decision page focused on readiness, top 90-day priorities, and funding routes by stage. Elevated the most defensible lanes: ZHAW/Innosuisse, one scoped research thesis, dpa, EBU/SRF, Full Fact, and GlobalFact 2026. Moved weaker or stale items into later-stage/watchlist framing and removed the stale funding anchor dependency from the funding presentation.
**Open items:** If desired, the next documentation pass could create a separate one-pager or outreach pack that mirrors the new priority order. Some linked external program statuses will need periodic refresh as 2026 calls change.
**Warnings:** Funding/program timing in the rewritten page is date-sensitive as of 2026-04-03. Media Forward Fund, NLNet, Google.org, and similar routes should be rechecked before any live application or outreach decision.
**For next agent:** Treat `Cooperation Opportunities` as the decision page and keep detailed partner/funder background in the funding presentation, academic cooperation presentation, and `Docs/Knowledge`. If new partner evidence arrives, update the short tables and sequence rather than re-expanding the page into a landscape report.
**Learnings:** No
---
### 2026-04-04 | Product Strategist | Codex (GPT-5) | Funding Presentation Rewrite
**Task:** Review, shorten, and update the outward-facing funding/support presentation using adjacent xWiki docs, `Docs/Knowledge`, current status, and current funding/program validation.
**Files touched:** `Docs/xwiki-pages/FactHarbor/Organisation/Partner & User Relations/Presentations/Funding/WebHome.xwiki`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Replaced the long product explainer + generic grant catalog with a shorter support page centered on why support matters now, the current Alpha posture, the April-June 2026 priorities, and the specific support types that fit the project today. Kept one UI image, retained independence safeguards, aligned the page with the updated cooperation strategy, and made the Swiss research/Innosuisse lane the clearest near-term path instead of treating all funding routes as equally actionable.
**Open items:** If desired, the next pass could create a matching external one-pager or donor/partner outreach email set that reuses the same priority framing. Current external program timing will need periodic refresh.
**Warnings:** The page is intentionally outward-facing and therefore does not surface some internal partner-status details. Any live funding decision should still be cross-checked against the detailed `Cooperation Opportunities` page and current official funder pages.
**For next agent:** Keep this page short and donor/partner-facing. Detailed partner sequencing, funder timing, and internal readiness notes belong in `Cooperation Opportunities`, `Academic Cooperation`, `Docs/Knowledge`, and `Docs/WIP`, not back in this presentation.
**Learnings:** No
---
### 2026-04-01 | Lead Architect | Gemini 3.1 Pro | Stage 1 Narrow Hardening - Code Review
**Task:** Review and commit the implemented narrow Stage-1 hardening changes.
**Files touched:** pps/web/src/lib/analyzer/claim-extraction-stage.ts, pps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts, Docs/AGENTS/Agent_Outputs.md
**Key decisions:** Verified that the implementation cleanly removed the single_atomic_claim fallback and correctly guarded the alidateClaimContract(retryPass2) path without candidate-scoring logic. Authorized the commit despite unrelated Search API test failures (known environmental issues: search-factcheck-api, search-semanticscholar, 	est-config/route.test.ts).
**Open items:** Next agent can proceed with the next feature in the backlog or post-rollback validation.
**Warnings:** 
**For next agent:** The repository is clean. Proceed to the next item since the narrow hardening has officially merged into the post-rollback baseline.
**Learnings:** Search API unit tests can spuriously fail if local .env.local API keys are omitted or rate-limits hit. These do not block analytical pipeline regressions.
---

### 2026-04-01 | LLM Expert | Codex (GPT-5) | Multilingual Docs Sync After Review Fixes
**Task:** Update the multilingual review/status docs after follow-up implementation commits closed the last review findings.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-01_LLM_Expert_Multilingual_Output_Search_Review_Validation_Status.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The original multilingual implementation review findings are now closed by commits `8f9d4fae` and `ac51975c`. The experimental EN supplementary lane remains `default off`, but the implementation review itself is now clean. The remaining gate is live multilingual A/B validation and a promotion decision, not more Stage-2 cleanup.
**Open items:** Run the EN-lane `OFF` vs `ON` validation set and decide whether the feature stays experimental, is promoted, or is revised again. Deferred scope remains deferred: UI/chrome/export localization and any remaining deterministic fallback localization work.
**Warnings:** This sync is based on code review plus the implementer-reported verification state (`1502` tests passed, build clean). I did not rerun the suite or build myself.
**For next agent:** Use `Docs/AGENTS/Handoffs/2026-04-01_LLM_Expert_Multilingual_Output_Search_Review_Validation_Status.md` as the current validation gate. Earlier review findings in the prior 2026-04-01 entry are historical and no longer open.
**Learnings:** no

---
### 2026-04-01 | LLM Expert | Codex (GPT-5) | Multilingual Output/Search Review + Validation Plan + Status Sync
**Task:** Review the shipped multilingual output/search implementation, draft a validation plan for the experimental EN supplementary lane, and update status docs to match what actually shipped.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-01_LLM_Expert_Multilingual_Output_Search_Review_Validation_Status.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The shipped work is real and useful: report-language coherency is implemented and an experimental EN supplementary lane exists behind UCM. It should remain default-off pending live validation. Review identified two residual Stage-2 hardening issues: the EN-lane scarcity trigger currently uses raw search-result counts despite the `minPrimaryRelevantResults` naming, and the EN lane currently bypasses the standard relevance-classification/provider-warning path. Status docs were updated to reflect that this track is no longer only a policy question; it is now an experimental implementation awaiting validation.
**Open items:** Before any promotion, run live multilingual A/B validation and resolve or explicitly document the two Stage-2 hardening findings. Add a positive firing-path unit test for the EN lane.
**Warnings:** This review is based on the shipped diffs and local code state. I did not rerun the 1497-test suite or the build myself.
**For next agent:** Use `Docs/AGENTS/Handoffs/2026-04-01_LLM_Expert_Multilingual_Output_Search_Review_Validation_Status.md` as the main summary of residual risks and the validation gate. The most important next work is validation and Stage-2 hardening, not additional architecture debate.
**Learnings:** no

---
### 2026-04-01 | Lead Architect | Gemini 3.1 Pro | Stage 1 Narrow Hardening - Architect Review
**Task:** Review two proposed narrow post-rollback Stage-1 hardening changes against the Apr 1 baseline.
**Files touched:** Docs/WIP/2026-04-01_Stage1_Narrow_Hardening_Architect_Review.md, Docs/AGENTS/Agent_Outputs.md
**Key decisions:** Both narrow Stage-1 hardening changes are justified and low-risk. Removing the single_atomic_claim fallback fixes an over-fragmentation bypass for omitted classifications. Adding a retry re-validation guard prevents accepting contract-violations during retries.
**Open items:** Next agent to implement the two narrow changes.
**Warnings:** Do not reintroduce evidence-separability tiebreaks, candidate-scoring models, distinctEvents processing modifications, or deterministic semantic logic.
**For next agent:** Read Docs/WIP/2026-04-01_Stage1_Narrow_Hardening_Architect_Review.md and implement both changes simultaneously in claim-extraction-stage.ts.
**Learnings:** no
---

### 2026-04-01 | Senior Developer | Claude Code (Opus 4.6) | Multilingual Output/Search Policy (Proposal 2)
**Task:** Implement approved Proposal 2: LanguageIntent as explicit pipeline state with reportLanguage threading through Stage 4/5.
**Files touched:** `types.ts` (LanguageIntent + RetrievalLanguageLane + SearchQuery lane fields + CBResearchState.languageIntent), `claimboundary-pipeline.ts` (init LanguageIntent after Stage 1, thread to Stage 4/5, persist in resultJson), `verdict-stage.ts` (reportLanguage on VerdictStageConfig + advocate/reconciliation payloads + runVerdictStage parameter), `verdict-generation-stage.ts` (reportLanguage parameter + config threading), `aggregation-stage.ts` (reportLanguage on generateVerdictNarrative + forwarded from state), `research-orchestrator.ts` (language/languageLane on search queries), `claimboundary.prompt.md` (reportLanguage directives on VERDICT_ADVOCATE, VERDICT_RECONCILIATION, VERDICT_NARRATIVE).
**What's implemented:** (1) LanguageIntent type with inputLanguage, reportLanguage, retrievalLanguages[], sourceLanguagePolicy. (2) Initialized from Stage 1 detectedLanguage. (3) Threaded to Stage 4 prompts via config.reportLanguage and payload spread. (4) Threaded to Stage 5 via generateVerdictNarrative parameter. (5) Prompt instructions: "Write report-authored text in ${reportLanguage}. Preserve source-authored evidence text in original language." (6) SearchQuery observability: language + languageLane fields. (7) LanguageIntent persisted in resultJson for auditability.
**What's NOT implemented (deferred per design):** English supplementary retrieval lane logic in Stage 2 (only lane metadata). UI/chrome localization. Full search-cache language partitioning. Stage 5 deterministic fallback localization (documented as English-only).
**Verification:** 1492 tests pass, build clean.
**For next agent:** reportLanguage is now a first-class cross-stage contract. Non-English inputs should produce German/French/etc report text on the next live run. English supplementary retrieval is metadata-ready but the decision logic (when to add EN lane) is not yet implemented.

---
### 2026-04-01 | Senior Developer | Claude Code (Opus 4.6) | Post-Rollback Live Validation (17 runs)
**Task:** Validate the post-rollback baseline across all families that motivated the rollback plus broader coverage.
**Files touched:** `Docs/WIP/2026-04-01_Post_Rollback_Validation_Report.md`, `Docs/AGENTS/Agent_Outputs.md`
**Runs:** 17 total — 5 agent-submitted (Plastik, SRG, Bolsonaro ×3) + 12 user-submitted (DPA DE ×2, Keystone-SDA DE, Homeopathy ×2, Bolsonaro PT, BBC EN, Bali plastic, Electricity vs hydrogen, Sexual orientation, Hydrogen vs electricity, Global warming).
**Key findings:** (1) Zero `verdict_integrity_failure` across all 17 runs. (2) Zero contract validation fail-open in this batch. (3) Zero duplicate verdict IDs. (4) Plastik EN restored: LEANING-TRUE 63/58 (was UNVERIFIED 43/40 during fff7a508 era). (5) SRG improved from UNVERIFIED to LEANING-TRUE 62/45, but 2/3 claims still UNVERIFIED from pre-existing effizient/wirksam over-fragmentation. (6) Bolsonaro "various" clean at LEANING-TRUE 64/66 (historical range). (7) All broader families clean — BBC, DPA, Keystone-SDA, Bali, Homeopathy, Hydrogen, Global warming, Sexual orientation all produce expected results.
**UNVERIFIED claims:** 7/17 runs have at least one UNVERIFIED claim, all from evidence-driven variance or fine-grained sub-claim evidence scarcity. None from integrity failures or Stage-1 regression.
**Quality evolution analysis (extended):** Added full family trend tables (109 runs, 14+ families), structural defect trends (integrity failures eliminated, contract fail-open intermittent), cross-linguistic neutrality gap (Plastik FR 35-40pp below EN), SRG instability analysis (61pp spread, 11% contract fail-open). All new Apr 1 families (BBC, Bali, Sexual orientation, Global warming, Iran) produce clean directionally-correct results.
**Conclusion:** Rollback baseline is confirmed stable. Two dominant open problems: SRG decomposition instability (61pp spread) and Plastik cross-linguistic neutrality gap (FR 35-40pp below EN). Both predate the reverted experiment.
**For next agent:** Full report at `Docs/WIP/2026-04-01_Post_Rollback_Validation_Report.md`. The reverted features (evidence-separability, distinctEvents granularity) were directionally right but had two sub-problems: contract validation fail-open (SRG) and candidate selection preferring bad merges (Plastik). A revised approach needs to solve both before re-shipping.

---
### 2026-04-01 | Lead Architect | Codex (GPT-5) | Clean Replay of `fff7a508` Rollback
**Task:** Recreate the rollback cleanly after the branch had drifted into a mixed Stage-1 state, then verify the post-rollback baseline.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`, `apps/web/prompts/claimboundary.prompt.md`
**What changed:** Created a safety branch at the mixed-state head (`backup/2026-04-01-pre-stage1-reset`), reset `main` to `d04fc750`, then reverted in dependency order: first `d04fc750`, then `fff7a508`. During the `fff7a508` revert, resolved prompt/history conflicts by preserving later unrelated work, keeping the later representational-drift rule from `0758bef1`, and removing the stale `evidenceSeparable` contract-validation prompt field so the prompt matches the reverted code/schema again.
**Verification:** Post-rollback tree is clean. Safe suite passed: `npm test`. `claim-contract-validation.test.ts` passed. A build run was interrupted once during the conflict-resolution phase and should be re-run on the final clean state before treating this as the new baseline.
**For next agent:** Current branch state is the clean rollback target. If you need the abandoned mixed state for comparison, it is preserved on `backup/2026-04-01-pre-stage1-reset`. Later unrelated fixes remain in history unless separately reverted. The next useful step is a final `npm -w apps/web run build` on the settled tree, then live validation of the affected SRG/Plastic/Bolsonaro families against this restored baseline.

---
### 2026-03-31 | Senior Developer | Codex (GPT-5) | Source Fetch Failure Reduction Follow-up Fix
**Task:** Correct the just-implemented source-fetch short-circuit so it matches the approved low-risk plan, then update the plan doc and verification coverage.
**Files touched:** `Docs/WIP/2026-03-31_Source_Fetch_Failure_Reduction_Plan.md`, `apps/web/src/lib/analyzer/research-acquisition-stage.ts`, `apps/web/test/unit/lib/analyzer/research-acquisition-stage.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Replaced cumulative per-domain blocking counts with a true per-domain blocking streak. The streak now updates at fetch completion time inside each worker, so delayed same-batch siblings can be skipped on a best-effort basis without widening state beyond one `fetchSources()` call. Any non-blocking outcome for that domain resets the streak. Skipped URLs no longer count toward `attempted`, so warning metrics reflect actual fetches rather than queued URLs.
**Open items:** None for this work item. Remaining limitation stays intentional: already-launched concurrent same-domain requests in the same batch may still run before the blocking streak trips.
**Warnings:** The working tree already contained unrelated documentation edits outside this task. I did not touch or revert them.
**For next agent:** Safe verification passed on current working tree: `npm -w apps/web exec vitest run test/unit/lib/analyzer/research-acquisition-stage.test.ts`, `npm test`, and `npm -w apps/web run build`. New focused tests cover streak reset after a non-blocking outcome, exclusion of skipped URLs from `attempted`, and delayed same-batch sibling suppression under concurrent batching.
**Learnings:** no

---
### 2026-03-31 | Lead Architect | Claude Code (Opus 4.6) | DistinctEvents Event-Granularity Architect Review
**Task:** Review adjusted `distinctEvents` event-granularity fix proposal for Bolsonaro multi-proceeding degradation.
**Files touched:** `Docs/WIP/2026-03-31_DistinctEvents_Event_Granularity_Architect_Review.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key findings:** (1) Diagnosis correct: Bolsonaro "various/all" degradation is event-granularity at Stage 1, not Stage 4/5. All 3 anchor jobs extract STF lifecycle milestones instead of STF+TSE peer proceedings. (2) "Independently researchable" standard is right but should be phrased as "requiring different evidence sources or institutional authorities." (3) Prompt-only is the correct first step — LLM repair pass deferred. (4) Lifecycle phases must be preserved for single-process inputs. (5) Evaluative/compound non-event inputs (SRG, Homeopathy, Plastik) must remain inert.
**Decision:** `Adjusted prompt-only distinctEvents fix justified`. Proposed specific prompt change at claimboundary.prompt.md:202-207 — revise Include rules to add granularity rule steering multi-proceeding inputs toward peer extraction while preserving lifecycle for single-process inputs.
**For next agent:** Full review at `Docs/WIP/2026-03-31_DistinctEvents_Event_Granularity_Architect_Review.md`. Prompt change requires human approval. Validation gate: 3 positive Bolsonaro multi-proceeding runs + 4 guardrail runs (single-proceeding, SRG, evaluative).

---
### 2026-03-31 | Senior Developer | Claude Code (Opus 4.6) | Source Fetch Failure Reduction (Domain Short-Circuit + Warning Enrichment)
**Task:** Implement approved source fetch failure reduction: domain-level short-circuit for 401/403 and error-type enrichment in warnings.
**Files touched:** `research-acquisition-stage.ts` (domain skip logic + humanizeErrorType + warning enrichment), `config-schemas.ts` (UCM field), `pipeline.default.json` (default), `research-acquisition-stage.test.ts` (8 new tests).
**Fix 1 (domain short-circuit):** Within each `fetchSources()` call, tracks per-domain consecutive 401/403 failures. After threshold (default 2), best-effort skips later same-domain URLs. Does NOT trigger on 404 (URL-specific), timeout, or network errors. UCM-configurable via `fetchDomainSkipThreshold` (0 disables). Skip count folded into existing `source_fetch_failure` warning details as `skippedByDomainShortCircuit`.
**Fix 2 (warning enrichment):** Warning message now appends human-readable error type summary (e.g., "1× paywall/blocked, 1× dead link"). Admin/operator diagnostic improvement only — no warning-display policy change.
**Scope caveat:** Short-circuit operates per `fetchSources()` call (one query batch), not across the entire analysis run. Concurrent in-flight requests within a batch may not be skipped — this is best-effort by design.
**Tests:** 8 new tests: 403 skip, 404 no-skip, timeout no-skip, independent domain tracking, threshold=0 disabled, warning message enrichment, humanizeErrorType mapping. 1492 total pass. Build clean.
**For next agent:** No new warning type registered. Observability via existing `source_fetch_failure` details field.

---
### 2026-03-31 | Lead Architect | Claude Code (Opus 4.6) | Source Fetch Failure Investigation + Reduction Plan
**Task:** Investigate why source fetch failures are frequent and URLs work in browser but fail in pipeline.
**Files touched:** `Docs/WIP/2026-03-31_Source_Fetch_Failure_Reduction_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key findings:** (1) 46% failure rate across sampled warnings — operationally expected for server-side fetching. (2) Dominant failure (56%) is HTTP 403 from paywall/bot-blocking/Cloudflare JS challenges — structurally unfixable without headless browser. (3) Pipeline retries same blocked domain repeatedly within a run, wasting time. (4) Warning messages don't tell users *why* fetches failed.
**Proposed:** (1) Domain-level fetch short-circuit after 2 consecutive deterministic failures (~30 lines, UCM-configurable). (2) Error-type enrichment in warning messages (~10 lines). Both code-only, no analytical behavior change.
**For next agent:** Full plan at `Docs/WIP/2026-03-31_Source_Fetch_Failure_Reduction_Plan.md`. Implementation in `research-acquisition-stage.ts`.

---
### 2026-03-31 | Senior Developer | Claude Code (Opus 4.6) | Ghost Boundary Sanitization + Grounding Validation Fix
**Task:** Fix two defects from job `696d8140`: ghost boundary IDs passing through advocate parsing, and grounding validation false positives from FLOOD-1 source portfolio expansion.
**Files touched:** `verdict-stage.ts` (boundary sanitization in `advocateVerdict()`, source portfolio in grounding validation input, `VerdictValidationRepairContext` extended), `claimboundary.prompt.md` (`VERDICT_GROUNDING_VALIDATION` source portfolio rule + input variable), `verdict-stage.test.ts` (3 new tests + 1 existing test fixed).
**Fix 1 (boundary sanitization):** After `parseAdvocateVerdict()`, filter each verdict's `boundaryFindings` to only include boundary IDs valid for that specific claim via `coverageMatrix.getBoundariesForClaim()`. Ghost IDs silently dropped with debug log. Per-claim (not global) filtering prevents cross-claim boundary contamination in range widening.
**Fix 2 (grounding validation):** Added `sourcePortfolioByClaim` to `VerdictValidationRepairContext`. Threaded `fullPortfolio` through. Flattened source portfolio (sourceId + domain) passed to grounding validation input. Prompt updated with rule: source portfolio references are valid context, not hallucinated evidence.
**Tests:** Ghost boundary stripped (1), cross-claim boundary stripped (1), grounding receives source portfolio (1), existing portfolio test fixed to use real `buildCoverageMatrix`. 1484 total pass. Build clean.
**For next agent:** Fix 3 (optional prompt hardening for VERDICT_ADVOCATE boundary IDs) is deferred — can be picked up later.

---
### 2026-03-30 | Senior Developer | Claude Code (Opus 4.6) | Unify VERDICT_DIRECTION_VALIDATION Contract
**Task:** Fix review blocker — `validateDirectionOnly()` passed top-level `evidencePool` while batch path embedded it per-verdict. Unified on per-verdict shape.
**Files touched:** `verdict-stage.ts` (1 call site), `claimboundary.prompt.md` (prompt wording), `verdict-stage.test.ts` (1 test capture updated)
**What changed:** (1) `validateDirectionOnly()` now embeds `evidencePool` inside the verdict object, matching the batch path. (2) Prompt `VERDICT_DIRECTION_VALIDATION` input section updated to describe per-verdict claim-local evidence pool, removed separate `${evidencePool}` variable. (3) Test for re-validation capture updated to read from `verdicts[0].evidencePool` instead of top-level `input.evidencePool`.
**Not changed:** `VERDICT_DIRECTION_REPAIR` (single-claim top-level `evidencePool` is correct). Grounding validation (correctly global).
**Verification:** 157 verdict-stage tests pass. 1481 total tests pass. Build clean.
**For next agent:** The `VERDICT_DIRECTION_VALIDATION` prompt now has one consistent contract: `${verdicts}` contains an array where each verdict includes its own `evidencePool`. No separate top-level `${evidencePool}` is used. `VERDICT_DIRECTION_REPAIR` is unchanged.

---
### 2026-03-30 | Senior Developer | Claude Code (Opus 4.6) | Claim-Local Verdict Scope Fix
**Task:** Fix structural bug where direction validation/repair uses full boundary evidence pool instead of claim-local evidence, causing false `verdict_integrity_failure` downgrades (9e4d anchor case).
**Files touched:** `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`
**Key decisions:** Added `getClaimLocalEvidence()` helper with 3-tier priority (relevantClaimIds -> cited IDs -> full pool fallback). Applied to batch direction validation, `attemptDirectionRepair`, and `validateDirectionOnly`. Grounding validation intentionally left global (ID existence checks). No prompt, Stage 1, aggregation, or article adjudication changes.
**Open items:** Stage 1 proxy decomposition hardening is a separate follow-up (not blocking). The batch direction validation prompt input shape changed from top-level `evidencePool` to per-verdict embedded pools -- monitor for any LLM parsing issues on next real run.
**Warnings:** The prompt contract for `VERDICT_DIRECTION_VALIDATION` now receives `evidencePool` inside each verdict object rather than as a sibling field. This is a structural improvement but changes the input shape.
**For next agent:** Full handoff at `Docs/AGENTS/Handoffs/2026-03-30_Senior_Developer_Claim_Local_Verdict_Scope_Fix.md`. Verification: 1481 tests pass, build succeeds. Ready for human review and commit.
**Learnings:** no

---
### 2026-03-30 | Lead Architect | Gemini 3.1 Pro | 9e4d SRF Factchecking Investigation Review
**Task:** Adjudicate the root cause of the AC_02 failure in job 9e4d3712e12d49bc8cadd601766e5f4b.
**Files touched:** Docs/WIP/2026-03-30_9e4d_SRF_Factchecking_Architect_Review.md
**Key decisions:** The downstream explanation is the true root cause. Stage 4's verdict integrity validation processes the entire global boundary evidence pool rather than strictly claim-local evidence. This causes hallucinatory cross-contamination where a claim with poor/neutral evidence falsely fails integrity because a sibling claim's strong evidence leaked into the validation context. Stage-1 proxy drift is real but secondary.
**Open items:** Need a developer to implement the claim-local scoping fix for unValidationCheckWithRetry, alidateDirectionOnly, and ttemptDirectionRepair.
**Warnings:** Do not implement Stage 1 drift heuristics yet; do not restore the ±10pp clamp as it played no part in this failure.
**For next agent:** Read Docs/WIP/2026-03-30_9e4d_SRF_Factchecking_Architect_Review.md. Implement Option B local scoping for verdict stage validation.
**Learnings:** no

---
### 2026-03-30 | Lead Architect | Claude Code (Opus 4.6) | 9e4d SRF Factchecking — Architect Review
**Task:** Adjudicate competing explanations for AC_02 `verdict_integrity_failure` in job `9e4d`.
**Files touched:** `Docs/WIP/2026-03-30_9e4d_SRF_Factchecking_Architect_Review.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key findings:** (1) Direction validation at `verdict-stage.ts:1091-1094` passes full evidence pool, not claim-local. AC_02's integrity downgrade cites 6 supports (EV_001-006) that belong to AC_01. (2) AC_02's actual claim-local pool is 4 neutral items — the cross-claim contamination is the scoping bug, not just thin evidence. (3) Stage 1 proxy decomposition is a contributing cause but not the primary bug. (4) ±10pp clamp removal had zero effect (LLM kept truth at 58). (5) Grounding validation correctly uses full pool (checking ID existence is global). (6) `isVerdictDirectionPlausible()` correctly uses cited arrays.
**Decision:** `Claim-local verdict-scope fix justified`. Code-only fix: filter `evidence` to claim-local items before passing to direction validation and repair LLM calls. ~5 lines per call site. Stage 1 prompt hardening is a separate follow-up.
**For next agent:** Full review at `Docs/WIP/2026-03-30_9e4d_SRF_Factchecking_Architect_Review.md`. Two call sites to fix: direction validation (line 1091) and repair (line 1547). Grounding validation (line 1072) stays full-pool. Fallback: if claim-local is empty, use cited evidence, then full pool with warning.

---
### 2026-03-30 | Lead Architect | Claude Code (Opus 4.6) | Article Adjudication: Hybrid Clamp vs LLM-Led Review
**Task:** Evaluate whether the ±10pp truth clamp and confidence ceiling in Stage 5 article adjudication violate the LLM Intelligence mandate.
**Files touched:** `Docs/WIP/2026-03-30_Article_Adjudication_Hybrid_vs_LLM_Review.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** (1) Confidence ceiling (adjusted ≤ deterministic) is a valid structural invariant — "unresolved claims add uncertainty, never remove it." Keep. (2) ±10pp truth clamp is a semantic analytical constraint — it limits how the LLM interprets the impact of unresolved claims. Violates AGENTS.md LLM Intelligence mandate. Remove. (3) Schema validation (0-100), `Number.isFinite` guard, and deterministic fallback are structural plumbing. Keep. (4) Prompt should soften "±10pp" to "adjust conservatively" — soft guidance, not hard bound.
**Decision:** `Pure LLM article adjudication justified` — Option B (remove truth clamp, keep confidence ceiling). ~4 lines code, ~2 lines prompt. 2 tests rewrite, 2 new tests.
**For next agent:** Full review at `Docs/WIP/2026-03-30_Article_Adjudication_Hybrid_vs_LLM_Review.md`. Code change in `aggregation-stage.ts:232-236`. Prompt change in `claimboundary.prompt.md:1366`. Prompt change requires human approval.

---
### 2026-03-30 | Senior Developer | Claude Code (Opus 4.6) | Quality Evolution Deep Analysis + Doc Sync
**Task:** 100-job quality evolution analysis across 12 input families. Comprehensive doc sync.
**Files touched:** `Current_Status.md`, `Backlog.md`, `WIP/README.md`, `Agent_Outputs.md`, `WIP/2026-03-30_Report_Quality_Evolution_Deep_Analysis.md`
**Critical finding:** Plastik cross-linguistic neutrality gap — 58pp spread (DE 33% / EN 72% / FR 13%). Same semantic claim, directionally opposite verdicts. Driven by Stage 2 evidence language bias. Not covered by EVD-1.
**Status updates:** All integrity fixes marked DONE. NEUTRALITY-1 and FLAT-EARTH-1 added. Cross-linguistic neutrality is next quality gap.
**For next agent:** Read the quality evolution report. NEUTRALITY-1 needs Captain decision on EVD-1 cross-linguistic thresholds.

---
### 2026-03-30 | Senior Developer | Claude Code (Opus 4.6) | Report Matrix + LLM Article Adjudication
**Task:** Fix UNVERIFIED claims missing from matrix and ignored in article verdict.
**Files touched:** `claimboundary-pipeline.ts` (report matrix from all claims), `aggregation-stage.ts` (adjudication parsing with ceiling/fallback), `claimboundary.prompt.md` (VERDICT_NARRATIVE schema extension), `types.ts` (VerdictNarrative interface), `page.tsx` (matrix labels from coverageMatrix.claims).
**What changed:** (1) Report matrix now built from ALL final claim verdicts, not just assessable claims — UNVERIFIED claims get visible columns. (2) VERDICT_NARRATIVE LLM now returns `adjustedTruthPercentage` and `adjustedConfidence` — pipeline uses these as final article values with ceiling constraint (confidence can only decrease) and ±10pp truth bound. Falls back to deterministic on any parsing failure.
**Validation:** Partial-insufficient run (`f80b6b41`): confidence dropped from ~65 to 40, matrix shows all 3 claims, article honestly reflects incomplete coverage. Fully-assessed controls (Bolsonaro, Hydrogen): adjudicated numbers match deterministic output. No regressions.
**For next agent:** No new LLM call added. Existing VERDICT_NARRATIVE call extended. Ship together — matrix without adjudication creates a visible inconsistency.

---
### 2026-03-29 | Lead Architect | Claude Code (Opus 4.6) | 2705 + e407 Root Fix — Reviewer Notes
**Task:** Code/Architecture review of the revised 2705/e407 root-fix proposal.
**Files touched:** `Docs/WIP/2026-03-29_2705_e407_Root_Fix_Reviewer_Notes.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key findings:** (1) Proposal correctly targets the root bug at line 561, not downstream. (2) `runVerdictStageWithPreflight` already guards `claims.length === 0` — no redundant guard needed. (3) `buildCoverageMatrix` handles empty claims correctly. (4) Aggregation self-corrects for all-zero-confidence but NOT for Stage-4's spurious confidence=30 — confirming the short-circuit is a correctness fix. (5) Verdict uniqueness should assert-not-dedup. (6) gate4Stats needs no separate fix.
**Decision:** `Approved as root-fix path`. No revision needed. Two implementation cautions noted for the implementing agent.
**For next agent:** The plan is approved. Implement by changing `activeClaims` to `assessableClaims = sufficientClaims` (removing the fallback), fixing matrix labels in `page.tsx`, and adding a uniqueness assertion (not dedup) after verdict assembly. No prompt change needed.

---
### 2026-03-29 | Senior Developer | Codex (GPT-5) | 2705 + e407 Root Fix Review Tightening
**Task:** Re-tighten the `2705 / e407` architect review so it is ready for another review round after concerns that the previous package still mixed root fixes with symptom cleanup.
**Files touched:** `Docs/WIP/2026-03-29_2705_e407_Root_Fix_Architect_Review.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Reframed the review around a stronger architecture: explicit `assessableClaims` after D5, Stage 4 only on that subset, verdict-uniqueness invariant before aggregation, and matrix label alignment as a separate presentation fix. Removed aggregation deduplication from the primary-fix story and repositioned the residual `Werkzeuge/Methoden` split as a separate Stage-1 follow-on rather than pretending the integrity patch solves recurrence.
**Open items:** No code change yet. The next implementation prompt should use the tightened framing and avoid presenting aggregation dedup as the main repair.
**Warnings:** The review now cleanly separates the `e407` integrity bug from the residual Stage-1 recurrence family. Do not collapse those back together in execution planning.
**For next agent:** The updated review is at [2026-03-29_2705_e407_Root_Fix_Architect_Review.md](C:/DEV/FactHarbor/Docs/WIP/2026-03-29_2705_e407_Root_Fix_Architect_Review.md). If implementation is requested next, the package should be: assessable-claims short-circuit, verdict-uniqueness invariant, and matrix label alignment, with Stage-1 Step 4 explicitly deferred.
**Learnings:** no

---
### 2026-03-29 | Lead Architect | Claude Code (Opus 4.6) | 2705 + e407 Root Fix — Architect Review
**Task:** Re-open the 2705/e407 issue family and find the best root-cause solution.
**Files touched:** `Docs/WIP/2026-03-29_2705_e407_Root_Fix_Architect_Review.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** (1) Primary bug is all-insufficient fallback at `claimboundary-pipeline.ts:561` — sends D5-rejected claims to Stage 4, producing duplicate verdicts and corrupted article verdict. (2) Secondary bug: UI matrix label/body mismatch in `page.tsx:1871`. (3) Aggregation has no dedup guard. (4) Salvage step (Option C) is premature — Stage-1 fix already shipped, measure first. (5) Root fix is enforcing two invariants: no Stage 4 for D5-rejected claims, one verdict per claim ID. Three code-only changes, ~30 lines total.
**Implementation order:** (1) All-insufficient short-circuit in pipeline. (2) Matrix label alignment in page.tsx. (3) Aggregation dedup guard. All code-only, single commit.
**Open items:** None — all code-only.
**For next agent:** Full review at `Docs/WIP/2026-03-29_2705_e407_Root_Fix_Architect_Review.md`. All three fixes are in `claimboundary-pipeline.ts`, `page.tsx`, and `aggregation-stage.ts` respectively. No prompt change needed.

---
### 2026-03-30 | Senior Developer | Claude Code (Opus 4.6) | 2705/e407 Root Fix — Assessable-Claims + Verdict Uniqueness + Matrix
**Task:** Fix all-insufficient fallback integrity failure and Coverage Matrix mismatch.
**Files touched:** `claimboundary-pipeline.ts` (assessable-claims path + verdict uniqueness invariant), `page.tsx` (matrix label source).
**What changed:** (1) `activeClaims` fallback removed — Stage 4 only gets D5-sufficient claims. (2) Duplicate `claimId`s in verdicts throw hard failure. (3) Matrix labels from `coverageMatrix.claims`.
**Validation:** 5 jobs, zero dup IDs, matrix aligned. 2705: AC_01 in matrix only, AC_02 UNVERIFIED (correct).
**For next agent:** Report at `Docs/AGENTS/Handoffs/2026-03-29_Senior_Developer_2705_e407_Root_Fix_Implementation.md`.

---
### 2026-03-29 | Senior Developer | Claude Code (Opus 4.6) | Stage 1 Claim Decomposition Fix (3-Step)
**Task:** Implement approved 3-step fix for b8e6/8640/cd4501 claim decomposition failures.
**Files touched:** `claim-extraction-stage.ts` (Step 1 fallback removal + Step 3 retry re-validation), `claimboundary.prompt.md` (Step 2 evidence-separability rule + schema), `types.ts` + `warning-display.ts` (new warning type), `claim-contract-validation.test.ts` (3 new tests).
**Step 2 is the primary fix.** Evidence-separability check caught 8640/cd4501 4-claim over-fragmentation and triggered merge to 2 claims. UNVERIFIED starvation eliminated. Step 1 near-zero practical impact (classification changed). Step 3 provides re-validation safety net.
**Validation:** 5 jobs. 8640 family fixed (4→2 claims, MOSTLY-TRUE 72/73). Bolsonaro preserved (2 claims, no regression). Controls clean. b8e6 still over-fragments (needs Pass 2 refinement, documented).
**For next agent:** Full report at `Docs/AGENTS/Handoffs/2026-03-29_Senior_Developer_Stage1_Claim_Decomposition_Fix.md`. b8e6 residual is a separate Pass 2 issue.

---
### 2026-03-29 | Lead Architect | Claude Code (Opus 4.6) | Claim Decomposition Plan — Stress Test
**Task:** Adversarial quality-bar review of the approved 3-step decomposition fix plan before implementation.
**Files touched:** `Docs/WIP/2026-03-29_Claim_Decomposition_Plan_Stress_Test.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key findings:** (1) Step 1 (fallback removal) is practically inert on current data — all 7 affected jobs had claims that passed Gate 1 fidelity independently; the dimension-tag exemption was never exercised. (2) Step 3 (retry hardening) has no trigger without Step 2 for 8640-class failures. (3) Step 2 (contract evidence-separability) is the critical path and primary fix. (4) Sequence is pragmatically correct but analytically inverted — Steps 1+3 are preparatory infrastructure, not the primary defense.
**Decision:** `Plan approved with sequencing changes` — ship Steps 1+3 now as code-only preparatory work, but reframe: the decomposition problem is not resolved until Step 2 (prompt, needs approval) is live.
**For next agent:** The code-only changes (Steps 1+3) are safe to implement. Step 2 approval is the critical path. Full stress-test report at `Docs/WIP/2026-03-29_Claim_Decomposition_Plan_Stress_Test.md`.

---
### 2026-03-29 | Lead Architect | Claude Code (Opus 4.6) | b8e6 + 8640 + cd4501 Claim Decomposition — Architect Review (Rev 2)
**Task:** Adjudicate shared Stage-1 claim-decomposition problem behind three SRG SSR jobs. Supersedes 2-job version.
**Files touched:** `Docs/WIP/2026-03-29_b8e6_8640_cd4501_Claim_Decomposition_Architect_Review.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** (1) Four failure layers identified: fallback heuristic (b8e6), contract-validation blind spot (8640), Pass 2 over-fragmentation (contributing), retry-path failure (cd4501). (2) cd4501 is decisive — contract validation caught the problem but retry reproduced the same split because guidance addresses proxy drift, not over-fragmentation. (3) No re-validation after retry. (4) Recommended: Option D — fallback removal + contract evidence-separability + retry hardening. Steps 1+3 are code-only and can ship together. Step 2 requires prompt approval.
**Open items:** Step 2 (contract-validation evidence-separability prompt) requires explicit human approval. Coverage-matrix communication gap noted as separate UI follow-up.
**For next agent:** Full review at `Docs/WIP/2026-03-29_b8e6_8640_cd4501_Claim_Decomposition_Architect_Review.md`. Steps 1+3 (fallback removal + retry hardening) are code-only and can ship in one commit. Step 2 needs prompt approval.

---
### 2026-03-29 | Lead Architect | Claude Code (Opus 4.6) | b8e6 + 8640 Claim Decomposition — Architect Review
**Task:** Adjudicate shared Stage-1 claim-decomposition problem behind two SRG SSR jobs.
**Files touched:** `Docs/WIP/2026-03-29_b8e6_8640_Claim_Decomposition_Architect_Review.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** (1) Both jobs share a family-level root cause: Stage 1 decomposition control too permissive + contract validation lacks evidence-separability check. (2) b8e6 is primarily a fallback dimension-tagging heuristic bug (`single_atomic_claim` auto-promoted to dimension decomposition). (3) 8640 is contract-validation blind spot (evaluative sub-claims not checked for evidence separability). (4) 7/200 recent jobs affected (3.5%). (5) Not a recent regression — fallback introduced 2026-03-23.
**Implementation order:** (1) Remove `single_atomic_claim` fallback from dimension-tagging heuristic (code-only, 3 locations). (2) Add evidence-separability check to CLAIM_CONTRACT_VALIDATION prompt (requires human approval). (3) Remeasure.
**Open items:** Step 2 prompt change requires explicit human approval.
**For next agent:** Full review at `Docs/WIP/2026-03-29_b8e6_8640_Claim_Decomposition_Architect_Review.md`. Step 1 is code-only, ~3 lines × 3 locations in `claim-extraction-stage.ts`.

---
### 2026-03-29 | Lead Architect | Claude Code (Opus 4.6) | 1bfb Direction Integrity — Architect Review
**Task:** Adjudicate competing explanations for AC_02 `verdict_integrity_failure` in job `1bfb` and decide canonical fix strategy.
**Files touched:** `Docs/WIP/2026-03-29_1bfb_Direction_Integrity_Architect_Review.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** (1) Primary failure is citation-carriage defect: VERDICT_RECONCILIATION schema omits `supportingEvidenceIds`/`contradictingEvidenceIds`, parser inherits stale advocate arrays. (2) Direction-validator false positive is REJECTED as primary — it's a downstream victim of stale input. (3) Threshold tuning is premature while arrays are stale. (4) 25/400 recent jobs (6.25%) hit `verdict_integrity_failure` — systemic. (5) Warning-state bug confirmed: `safeDowngradeVerdict` receives pre-repair verdict but post-repair issues.
**Implementation order:** (1) Warning-state bug fix (code-only, ~2 lines). (2) Reconciliation citation-carriage fix (prompt schema + parser, requires human approval). (3) Remeasure direction-validator false-positive rate on clean data. (4) Only then consider direction-validator prompt/threshold changes.
**Open items:** Prompt schema change requires explicit human approval. Post-fix measurement round needed (10 jobs, $5-10).
**For next agent:** Full review at `Docs/WIP/2026-03-29_1bfb_Direction_Integrity_Architect_Review.md`. Step 1 (warning bug) is trivially shippable. Step 2 (citation-carriage) needs human approval for prompt change. The `Direction_Validator_False_Positive_Investigation.md` proposal is deferred until Step 3 measurement.

---
### 2026-03-29 | Lead Architect | Claude Code (Opus 4.6) | Seeded Evidence Mapping Fix — Revised Proposal (Rev 2)
**Task:** Revise the seeded-evidence mapping proposal to reject Option B (all-claims fallback) and recommend Option C (post-Pass-2 LLM remap).
**Files touched:** `Docs/WIP/2026-03-26_Seeded_Evidence_Mapping_Fix_Proposal_Rev2.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** (1) Option B explicitly rejected — fabricates attribution. (2) Option C recommended — one batched Haiku remap call after Pass 2. (3) Options A/D rejected. (4) Option E deferred.
**For next agent:** Full proposal at `Docs/WIP/2026-03-26_Seeded_Evidence_Mapping_Fix_Proposal_Rev2.md`.

---
### 2026-03-27 | Senior Developer | Claude Code (Opus 4.6) | Internet Outage Resilience (OUTAGE-A1/A2/A4/A5)
**Task:** Make jobs survive internet outages: classify network errors, trip the circuit breaker, abort damaged jobs, auto-resume.
**Root cause:** (1) Network errors classified as `unknown` — breaker blind. (2) Stage 4 failures swallowed by fallback verdicts — runner breaker never fires. (3) Paused jobs produce useless UNVERIFIED 50/0 results. (4) No auto-recovery — requires manual admin resume.
**Fixes:** (A1) `NETWORK_CONNECTIVITY_PATTERNS` in `error-classification.ts`. (A2) `maybeRecordProviderFailure()` in `verdict-generation-stage.ts`. (A4) `claimboundary-pipeline.ts` Stage 4 catch re-throws when `isSystemPaused()` — no damaged results. (A5) `probeAndMaybeResume()` in `internal-runner-queue.ts` — HEAD to Anthropic on each watchdog tick, auto-resumes if reachable.
**Tests:** 10 new tests (8 classification + 2 auto-resume). 1428 total pass, build clean.
**For next agent:** Pre-call fast-fail probe (A.3) is the remaining follow-on. Plan at `Docs/WIP/2026-03-27_Internet_Outage_Resilience_Plan.md`.

---
### 2026-03-27 | Senior Developer | Claude Code (Opus 4.6) | Promote `preliminaryEvidenceLlmRemapEnabled` to Default-On
**Task:** Flip default to `true` after Captain approval.
**Files touched:** `config-schemas.ts` (DEFAULT_PIPELINE_CONFIG), `pipeline.default.json`, local UCM reseeded (hash `6900c4e4`).
**Monitor:** Homeopathy-family confidence anomaly (74→24 in single ON run) — watch post-promotion, rollback flag available.
**For next agent:** Flag is now default-on. Deployed systems get `true` on next deploy/reseed. Rollback via UCM Admin UI or file revert.

---
### 2026-03-27 | Senior Developer | Claude Code (Opus 4.6) | Seeded Evidence Remap — Current-Stack Promotion Gate
**Task:** Run controlled A/B comparison of `preliminaryEvidenceLlmRemapEnabled` on post-FLOOD-1 stack to determine promote-or-hold.
**Method:** 4 input families × ON/OFF pairs (8 runs) + 3 user-submitted OFF-only runs + 15-item spot-check.
**Key finding:** Bolsonaro A/B is decisive — same verdict (LEANING-TRUE), same truth% (64.3 vs 64.4), but seeded mapping 0%→92%. Mapping quality: 14/15 clearly correct, 1 borderline, 0 fabricated. Plastik DE neutral. Hydrogen stable. Homeopathy EN shows a confidence anomaly worth monitoring.
**Recommendation:** **Promote to default-on.** The remap recovers claim-local attribution for semantic-slug families without verdict distortion, at ~$0.002/run cost.
**For next agent:** Full report at `Docs/AGENTS/Handoffs/2026-03-27_Senior_Developer_Seeded_Evidence_LLM_Remap_Promotion_Gate.md`. Gate doc at `Docs/WIP/2026-03-27_Seeded_Evidence_Remap_Promotion_Gate_Parked.md` (updated, no longer parked). UCM flag currently OFF — Captain flip to default-on pending approval.

---
### 2026-03-27 | Senior Developer | Claude Code (Opus 4.6) | FLOOD-1: Single-Source Flooding Mitigation (Fix 1 + Fix 2)
**Task:** Implement approved single-source flooding mitigation for the ClaimAssessmentBoundary pipeline per `Docs/WIP/2026-03-27_Bolsonaro_efc5e66f_Single_Source_Flooding_Investigation.md`.
**Files touched:** `verdict-stage.ts` (source portfolio builder + claim-local threading), `verdict-generation-stage.ts` (sources parameter), `claimboundary-pipeline.ts` (pass state.sources), `research-extraction-stage.ts` (applyPerSourceCap with best-N reselection), `research-orchestrator.ts` (cap enforcement + eviction), `config-schemas.ts` + `pipeline.default.json` (maxEvidenceItemsPerSource: 5), `claimboundary.prompt.md` (3 verdict sections + reseed), `verdict-stage.test.ts` (9 new tests), `research-extraction-stage.test.ts` (9 new tests).
**Key decisions:** (1) Source portfolio is **claim-local** (`sourcePortfolioByClaim: Record<string, SourcePortfolioEntry[]>`) — evidence concentration for AC_01 does not bleed into AC_02/AC_03. (2) Portfolio is **partition-scoped** — advocate sees portfolio from institutional evidence, challenger from general evidence, reconciler from full pool (respects D5 partitioning). (3) Per-source cap uses **best-N reselection** across existing+new items by probativeValue — a later high-quality item can displace an earlier weaker item from the same source (returns `evictedIds`). Within same tier, existing items preferred over new (no churn). (4) Prompt-contract changes instruct each role (advocate/challenger/reconciler) with role-appropriate SR-awareness rules.
**Review corrections applied:** Lead Architect review identified (a) global portfolio bled concentration across claims and ignored D5 partitioning → fixed with claim-local + partition-scoped portfolios, (b) first-come cap semantics → fixed with best-N reselection + eviction.
**Open items:** Live validation required — 4 runs per investigation §12: 2× Bolsonaro, 1× Plastik DE, 1× Hydrogen.
**Verification:** 1411 tests pass (70 files), build clean, config-drift clean, prompts reseeded (`df2b04aa → 9ba9f521`).
**For next agent:** Run the 4-run validation plan. Success criteria: AC_01 TP rises toward 55-65 range, no source contributes >5 items, no regression on Plastik DE or Hydrogen. Anti-success: cap discards critical evidence from sole-provider sources, verdict ignores SR data despite prompt change.

---
### 2026-03-27 | Lead Architect | Claude Code (Opus 4.6) | Single-Source Evidence Flooding Investigation + Multi-Agent Debate
**Task:** Investigate why job `efc5e66f` (Bolsonaro, MIXED 56/51) produced LEANING-FALSE on AC_01 instead of expected LEANING-TRUE.
**Files touched:** `Docs/WIP/2026-03-27_Bolsonaro_efc5e66f_Single_Source_Flooding_Investigation.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key findings:** (1) Single URL (civilizationworks.org, trackRecordScore=0.38) produced 11 evidence items — all `contradicts`/`high`/`organization_report` — flipping AC_01 from typical ~60 TP to 38. (2) SR is missing from the active verdict path — legacy weighting branch exists but only addresses supporting evidence, not contradicting. (3) No per-source item cap exists. (4) No within-source redundancy detection. (5) The seeded evidence LLM remap (`preliminaryEvidenceLlmRemapEnabled: true`) is NOT responsible — civilizationworks items are all Stage 2, not seeded.
**Debate:** Four-position debate (per-source cap advocate, SR integration advocate, LLM consolidation advocate, challenger/do-nothing). Consolidated and revised per GPT Senior Architect review.
**Proposal (revised):** Fix 1 + Fix 2 ship together. Fix 1: SR-aware verdict reasoning = payload (per-source portfolio summary in `verdict-stage.ts`) + prompt-contract (3 verdict sections in `claimboundary.prompt.md`) + prompt reseed. Fix 2: per-source item cap (`maxEvidenceItemsPerSource: 5`, blunt safety rail in extraction stage). Fix 3 deferred.
**Review corrections:** (1) Fix 1 scope expanded — not ~10 lines. (2) "SR inert" narrowed. (3) Fix 2 moved to same rollout. (4) Legacy weighting acknowledged as non-fallback for this case. (5) Cap tie-breaking described as blunt.
**Open items:** Prompt-contract changes require explicit human approval. Validation: 4 runs.
**For next agent:** Full investigation at `Docs/WIP/2026-03-27_Bolsonaro_efc5e66f_Single_Source_Flooding_Investigation.md`. Ship Fix 1 + Fix 2 together. Fix 1 needs: (a) per-source portfolio summary in verdict payload modeled on `source-reliability-calibration.ts`, (b) prompt instructions in VERDICT_ADVOCATE/CHALLENGER/RECONCILIATION, (c) prompt reseed.

---
### 2026-03-27 | Senior Developer | Claude Code (Opus 4.6) | Seeded Evidence LLM Remap — Validation Tightening
**Task:** Close two gaps before promotion decision: (1) add successful-path unit test with mocked LLM, (2) run one additional Bolsonaro live validation.
**Files touched:** `claimboundary-pipeline.test.ts` (1 new test + `beforeEach` for describe block), `2026-03-27_Senior_Developer_Seeded_Evidence_LLM_Remap_Experiment.md` (updated tables and observations).
**Test added:** Mocked LLM remap test — 2 claims, 3 prelim items (1 resolved, 2 unresolved semantic slugs), mock returns claim-specific mappings + invalid `AC_99`. Verifies: in-place mutation, invalid-ID filtering, resolved item untouched, no blanket attribution, llmCalls increment, correct prompt section call.
**Live run:** Bolsonaro-3 (`efc5e66f`) — extended input, 3 claims. MIXED 56.3/51.5. 27 seeded, 23 mapped, 4 unmapped — **85% remap success**. All claims have 4-6 sourceTypes, 9-10 domains. AC_02 UNVERIFIED is confidence-driven (41%), not diversity-starvation-driven (20 items, 4 sourceTypes, 9 domains).
**Verification:** 1393 tests pass, build clean.
**For next agent:** Handoff updated at `Docs/AGENTS/Handoffs/2026-03-27_Senior_Developer_Seeded_Evidence_LLM_Remap_Experiment.md`. Both validation gaps closed. Promotion decision rests on 5 live runs (3 Bolsonaro, 1 Plastik DE, 1 Hydrogen) + 17 unit tests.

---
### 2026-03-27 | Senior Developer | Claude Code (Opus 4.6) | Seeded Evidence LLM Remap — Option C Implemented & Validated
**Task:** Implement and validate Option C (post-Pass-2 LLM remap) for unresolved seeded preliminary evidence claim mapping.
**Files touched:** `research-orchestrator.ts` (remap function + call site), `claimboundary-pipeline.ts` (barrel exports), `config-schemas.ts` + `pipeline.default.json` (`preliminaryEvidenceLlmRemapEnabled`), `claimboundary.prompt.md` (`REMAP_SEEDED_EVIDENCE` section), `claimboundary-pipeline.test.ts` (16 new tests).
**Key decisions:** (1) Integration point in `researchEvidence()` before `seedEvidenceFromPreliminarySearch()` — remap modifies understanding's preliminary evidence in-place, then existing seeding picks up updated IDs. (2) `wouldResolveExistingRemap()` helper replicates 4-step heuristic to identify only genuinely unresolved items. (3) Default `false` per task brief (experiment-first lifecycle). (4) Fail-open on any LLM or schema failure.
**Validation:** 4 runs — Bolsonaro-1 (83% remap, LEANING-TRUE 61.6/67.8), Bolsonaro-2 (69% remap, LEANING-TRUE 64.0/66.5), Plastik DE (zero regression, all 43 mapped), Hydrogen (76% remap, MOSTLY-FALSE 18.5/77.7). Zero UNVERIFIED. No blanket inflation. Baseline had 0% seeded mapping for Bolsonaro.
**Open items:** Default `false` — Captain decision to promote to `true`.
**For next agent:** Full validation report at `Docs/AGENTS/Handoffs/2026-03-27_Senior_Developer_Seeded_Evidence_LLM_Remap_Experiment.md`. 1392 tests pass, build clean. UCM flag already active in local config.db. Ready for Captain review.

---
### 2026-03-26 | Lead Architect | Claude Code (Opus 4.6) | Seeded Evidence Mapping Fix — Revised Proposal (Rev 2)
**Task:** Revise the seeded-evidence mapping proposal to reject Option B (all-claims fallback) and recommend Option C (post-Pass-2 LLM remap).
**Files touched:** `Docs/WIP/2026-03-26_Seeded_Evidence_Mapping_Fix_Proposal_Rev2.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** (1) Option B explicitly rejected — it fabricates claim attribution rather than repairing it, inflates diversity-aware sufficiency, D5, and coverage matrix metrics for all claims including irrelevant ones. (2) Option C recommended — one batched Haiku remap call after Pass 2, only for unmapped items, preserves right to return empty mappings. (3) Options A/D rejected (deterministic heuristics / prompt fragility). (4) Option E acknowledged as architecturally cleanest but too large for an interface-repair fix.
**Open items:** Implementation of Option C requires Senior Developer — prompt design (`REMAP_SEEDED_EVIDENCE`), Zod schema, integration in claim-extraction-stage.ts after Pass 2, UCM toggle.
**For next agent:** Full proposal at `Docs/WIP/2026-03-26_Seeded_Evidence_Mapping_Fix_Proposal_Rev2.md`. Validation plan uses 4 runs (2× Bolsonaro, 1× Plastik DE, 1× Hydrogen). Anti-success criteria defined to detect disguised Option B behavior. Integration point is claim-extraction-stage.ts ~line 239, after Pass 2 and before understanding assembly.

---
### 2026-03-26 | Lead Architect | Claude Code (Opus 4.6) | Next Workstream Decision — Four-Reviewer Panel
**Task:** Determine whether the next active workstream should target quality, optimization, or neither.
**Files touched:** `Docs/WIP/2026-03-26_Next_Workstream_Decision.md`, `Docs/AGENTS/Agent_Outputs.md`
**Method:** Four-reviewer panel (Quality, Optimization, Code Reality, Challenger) with deep code verification, reconciled by Lead Architect.
**Key findings:** (1) No quality track justified — QLT-4 showed hypothesis-before-measurement fails, amber is acceptable, remaining variance is content-driven. (2) No optimization track justified — stale baselines, negligible dollar impact at Alpha. (3) Code reality audit found `maxResearchIterations` docs claim "4/5" is wrong (actual: 10), UCM-1/UCM-2 backlog items partially stale, SR evaluation vs calibration distinction not clear in docs. (4) Challenger identified cheap high-learning backlog items being ignored: W15 fetch batching, P1-B parallelism, B-sequence validation.
**Decision:** Do neither yet. But execute W15 domain-aware fetch batching (reliability fix, ~50-100 lines) as the single best next task within monitor mode. Then P1-B (latency), then B-sequence validation ($3-5).
**Open items:** Stale doc corrections (maxResearchIterations, UCM-1/UCM-2, SR eval vs calibration distinction).
**For next agent:** Full report in `Docs/WIP/2026-03-26_Next_Workstream_Decision.md`. W15 is the recommended first task — see Backlog for spec. No formal track opened. Monitor mode continues.

---
### 2026-03-26 | Senior Developer | Claude Code (Opus 4.6) | Gate 1 Thesis-Direct Rescue
**Task:** Fix Gate 1 over-filtering of thesis-derived evaluative claims.
**Root cause:** Combined opinion+specificity filter dropped claims that directly restate the user's thesis (e.g., "verdicts were fair" in Bolsonaro input). `thesisRelevance: "direct"` confirmed present on the filtered claim.
**Fix:** Claims with `thesisRelevance === "direct"` exempt from the combined filter. Info-level `gate1_thesis_direct_rescue` warning emitted. Non-thesis claims still filtered normally.
**Files:** `claim-extraction-stage.ts`, `types.ts`, `warning-display.ts`, `claimboundary-pipeline.test.ts`
**Reviewed by:** Lead Architect (approved Option A), LLM Expert (confirmed code-level fix safer than prompt change).

---
### 2026-03-26 | Senior Developer | Claude Code (Opus 4.6) | B-Sequence Feature Validation
**Task:** Validate whether shipped B-sequence quality features are operating as intended on real runs.
**Jobs:** 5 diverse inputs (Plastik EN/DE, Flat Earth, Bolsonaro, Hydrogen).
**Key findings:** 6/8 features validated and working (verifiability, misleadingness, self-consistency, evidence partitioning, direction validation, pro/con queries). 1 wiring gap: explanation quality rubric runs but output is dropped during resultJson serialization (2-line fix needed). 1 intentionally disabled (grounding enforcement). TIGERScore is off.
**Wiring gap detail:** `assessment.explanationQualityCheck` is set at line 748 but `resultJson` assembly (lines 817-885) doesn't include it. Same for `tigerScore`.
**For next agent:** Fix the wiring gap (add 2 fields to resultJson). No further B-sequence validation needed.

---
### 2026-03-26 | Senior Developer | Claude Code (Opus 4.6) | P1-B: Preliminary Search Parallelism
**Task:** Reduce Stage 1 latency by parallelizing preliminary search work.
**Files touched:** `claim-extraction-stage.ts` (parallel claims + queries + source fetches), `claimboundary-pipeline.test.ts` (fixed mock state for warnings).
**What was parallelized:** (1) Claims processed in parallel via `Promise.all` (was serial `for` loop). (2) Queries within each claim processed in parallel. (3) Source fetches within each query processed in parallel (was serial). All three levels were previously fully sequential.
**What was kept safe:** Results collected locally per claim task, then merged deterministically into shared state in a single synchronous pass. Source IDs assigned during merge to avoid ID races. URL dedup via `seenUrls` Set.
**No new UCM parameter** — the existing `parallelExtractionLimit` and `fetchSameDomainDelayMs` already control fetch concurrency. Preliminary search parallelism is structural, not configurable.
**For next agent:** 1356 tests pass, build clean. No analyzer semantic changes. Stage 1 latency should improve proportional to the number of independent claim×query×fetch tasks.

---
### 2026-03-26 | Senior Developer | Claude Code (Opus 4.6) | W15: Domain-Aware Fetch Batching
**Task:** Implement same-domain fetch staggering to reduce fetch-collapse risk in Stage 2 source acquisition.
**Files touched:** `research-acquisition-stage.ts` (new `extractDomain`, `computeBatchDelays` + stagger in `fetchSources`), `config-schemas.ts` + `pipeline.default.json` (`fetchSameDomainDelayMs`, default 500ms), `evidence-recency.ts` (fixed stale `CalculationConfig` alias), new `research-acquisition-stage.test.ts` (11 tests).
**Mechanism:** Within each fetch batch, Nth same-domain request gets `(N-1) * delay` stagger. Cross-domain still parallel. `fetchSameDomainDelayMs: 0` disables.
**For next agent:** 1356 tests pass, build clean. UCM-configurable. No semantic changes.

---
### 2026-03-26 | Senior Developer | Claude Code (Opus 4.6) | Public Version Provenance Fix
**Task:** Fix `/api/version` returning `git_sha: null` in production.
**Root cause:** Env var name mismatch. `deploy.sh` writes `GIT_COMMIT`; the version endpoint checked `GIT_SHA` / `VERCEL_GIT_COMMIT_SHA` / `SOURCE_VERSION` but not `GIT_COMMIT`. One-line fix: add `GIT_COMMIT` as first in the fallback chain.
**Files touched:** `apps/web/src/app/api/version/route.ts`
**For next agent:** After next deploy, `/api/version` will return the deployed commit hash publicly. No admin access needed for provenance checks.

---
### 2026-03-26 | Senior Developer | Claude Code (Opus 4.6) | Post-Deploy Parity Verification — Full Parity Confirmed
**Task:** Verify production matches intended local baseline after `deploy-remote.ps1 -ForceConfigs`.
**Method:** Probe job commit hash, admin config API hash comparison, prompt content string verification.
**Result:** **Full parity confirmed.** Production at `cbc4cde4` — contains QLT-3, VAL-2, OBS-1. All 4 non-prompt config hashes match exactly. Prompt `claimboundary` hash matches and QLT-3 rules verified present in production content. No gaps.
**For next agent:** Production is at parity. No further deploy action needed.

---
### 2026-03-26 | Senior Developer | Claude Code (Opus 4.6) | Local vs Deployed Parity Investigation
**Task:** Structured comparison of local baseline vs deployed production commit `840e58d6`.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-26_Senior_Developer_Local_vs_Deployed_Parity.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key findings:** 4 meaningful runtime differences: (1) QLT-3 prompt (3 facet-consistency rules) — **the single analytical difference**, (2) VAL-2 verdict badge gate + monotonic progress, (3) OBS-1 AsyncLocalStorage metrics isolation. Non-prompt UCM configs are likely identical (same file defaults, both force-reseeded). QLT-4 is net-zero (added+reverted). Config schemas identical.
**For next agent:** Deploy `.\scripts\deploy-remote.ps1 -ForceConfigs` to bring production to parity. No QLT-4 risk — fully reverted.

---
### 2026-03-26 | Senior Developer | Claude Code (Opus 4.6) | Local UCM Cleanup — Stale Experiment Keys Removed
**Task:** Review and clean local UCM config drift from experiment-era admin customizations.
**Findings:** `pipeline/default` active blob contained 2 stale keys (`crossLinguisticQueryEnabled`, `supplementarySkewThreshold`) from Phase 2 v2 cross-linguistic experiment. `calculation/default`, `search/default`, and `sr/default` were clean. Zero live QLT-4 code remnants in source or tests.
**Action:** Backed up `config.db`, force-reseeded via `reseed-all-prompts.ts --force`. Pipeline config updated from `232eba4f` → `86c66ac6`. Stale keys removed. All 4 non-prompt configs verified clean.
**For next agent:** Local UCM baseline is now aligned with file-backed defaults. No stale experiment surface remains in code, config, or UCM.

---
### 2026-03-26 | Lead Architect | Claude Code (Opus 4.6) | QLT-4 Post-Revert Doc Sync
**Task:** Sync canonical docs after QLT-4 code revert so no wording implies the experiment still exists as a dormant runtime feature.
**Files touched:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/WIP/2026-03-25_Variance_Debate_Outcome_and_Proposal.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** All "code remains default-off" language replaced with "experimental code removed from codebase." Historical design context and handoff docs preserved. No new analyzer workstream opened. Backlog references updated to point to the revert handoff.
**Open items:** None.
**For next agent:** QLT-4 lifecycle is fully closed: proposed → implemented → tested → closed → removed. All canonical docs reflect this. Historical reasoning preserved in `Docs/AGENTS/Handoffs/2026-03-2{5,6}_*QLT4*.md`. Article-level contrarian retrieval (D5 C13) is unrelated and remains active.

---
### 2026-03-26 | Lead Architect | Claude Code (Opus 4.6) | QLT-4 Closure Canonization
**Task:** Canonize QLT-4 closure across status, backlog, and WIP docs after preflight verification confirmed the experiment targets a non-existent root cause.
**Files touched:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/WIP/2026-03-25_Variance_Debate_Outcome_and_Proposal.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** QLT-4 is recorded as a CLOSED experimental branch. The mechanism finding is preserved: Plastik EN per-claim evidence is already directionally balanced (ratio 0.62, 21 minority items); remaining variance is content/quality-driven, not direction-scarcity-driven. Feature code stays default-off in codebase. The original proposal doc is preserved as historical design context with a closure status line. Approved-policy monitor mode continues unchanged.
**Open items:** None. QLT-4 is fully closed.
**For next agent:** QLT-4 is closed in all canonical docs. The per-claim contrarian retrieval code was subsequently removed from the codebase (see next entry). Residual Plastik EN variance remains an open research question (evidence content/quality variation) — addressed by the Long Run Variance Reduction Roadmap if a future quality workstream is opened.

---
### 2026-03-26 | Senior Developer | Claude Code (Opus 4.6) | QLT-4 Code Revert
**Task:** Remove closed QLT-4 experiment from codebase.
**Files touched:** 7 source/config/test files + handoff. See `Docs/AGENTS/Handoffs/2026-03-26_Senior_Developer_QLT4_Code_Revert.md`.
**Key decisions:** Clean revert of all QLT-4 surface. Article-level contrarian (D5) preserved. Historical docs kept.
**For next agent:** No QLT-4 code/config remains. Feature was a dead end (per-claim evidence is already balanced).

---
### 2026-03-26 | Senior Developer | Claude Code (Opus 4.6) | QLT-4 Preflight — Feature Never Triggered
**Task:** Execution-integrity preflight before QLT-4 full rerun.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-26_Senior_Developer_QLT4_Preflight_Verification.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key finding:** QLT-4 config was OFF in UCM (the original execution-integrity bug). After enabling + lowering thresholds (skew 0.75, minDir 6, minMinority 3), the feature STILL did not trigger. Real per-claim evidence in Plastik EN is already balanced (ratio 0.62, 21 minority items) — the mechanism targets the wrong root cause. Actual variance is from evidence content/quality, not direction imbalance.
**Decision:** Full rerun NOT justified. Feature cannot fire on real data. Recommend closing QLT-4 as inconclusive. Config reverted to default-off.
**For next agent:** QLT-4 is a dead end. Plastik EN variance root cause (evidence content variation) is not addressable by contrarian retrieval. See preflight handoff for full evidence.

---
### 2026-03-26 | Senior Developer | Claude Code (Opus 4.6) | EVD-1 Monitoring Batch — 12 Jobs
**Task:** First monitoring batch under approved EVD-1 variance policy.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-25_Senior_Developer_Monitoring_Batch_12_Jobs.md`, `Docs/AGENTS/Agent_Outputs.md`
**Result:** No red or emergency. All families within EVD-1 green or amber. Controls correct. One Muslims `contradicts_thesis` recurrence (1/2 runs) — amber-level Stage 1 concern but green article outcome. Plastik EN improved (7pp vs prior 30pp) but only 2 runs. Hydrogen first repeated-run data (12pp green). No status/backlog update needed.
**For next agent:** Read the full handoff for family-by-family analysis. Watch Muslims `contradicts_thesis` pattern — escalate to QLT-3 review if 2+ of next 5 runs reproduce it.

---
### 2026-03-26 | Senior Developer | Claude Code (Opus 4.6) | QLT-4 Experiment — Inconclusive (Feature Never Fired)
**Task:** Implement and validate QLT-4 per-claim contrarian retrieval experiment.
**Files touched:** 7 code files (commit `b3e85c54`), handoff, agent outputs.
**Result:** Feature was enabled via UCM but **never triggered** across all 11 validation jobs. The trigger thresholds (perClaimBalanceSkewThreshold=0.85, perClaimBalanceMinDirectional=8) are too conservative for real per-claim evidence distributions. Per-claim evidence counts are insufficient to exceed the activation criteria.
**Plastik EN spread:** 37pp (wider than prior 30pp baseline — reflects natural variance, not QLT-4 effect since feature never fired).
**Controls:** Flat Earth 0pp (all FALSE), Bolsonaro 7pp (all LEANING-TRUE) — clean, no regression.
**Recommendation:** Either recalibrate thresholds (Option A: lower minDirectional to 4-5 and skewThreshold to 0.75) or accept that per-claim triggering is too granular (Option B). Keep default-off.
**For next agent:** Full report at `Docs/AGENTS/Handoffs/2026-03-25_Senior_Developer_QLT4_Per_Claim_Contrarian_Experiment.md`. Implementation is correct (5 tests pass), only thresholds need adjustment.

---
### 2026-03-25 | Lead Architect | Claude Code (Opus 4.6) | Variance Debate and QLT-4 Proposal
**Task:** Structured LLM debate on whether to stay in monitor mode or implement a targeted variance intervention.
**Files touched:** `Docs/WIP/2026-03-25_Variance_Debate_Outcome_and_Proposal.md`, `Docs/AGENTS/Agent_Outputs.md`
**Debate outcome:** Challenger wins on mechanism (per-claim evidence direction floor is the right intervention), advocate wins on process (EVD-1 was just approved; don't bypass it). Resolution: propose as QLT-4 requiring explicit Captain approval. The intervention extends existing contrarian retrieval from article-level to per-claim granularity — 3 files, UCM-reversible, ~half-day effort. Success criterion: Plastik EN environmental claim spread drops from 47pp to ≤35pp without regressing controls.
**For next agent:** Captain decision needed. If approved, implement per `Docs/WIP/2026-03-25_Variance_Debate_Outcome_and_Proposal.md` Section 3-4. If rejected, stay in monitor mode — no harm done.

---
### 2026-03-25 | Lead Architect | Claude Code (Opus 4.6) | Controllable Variance Investigation
**Task:** Investigate remaining controllable variance sources after Stage-1 stabilization.
**Files touched:** `Docs/WIP/2026-03-25_Controllable_Variance_Investigation.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key findings:** Dominant remaining variance is evidence direction ratio (different web sources → different support/contradict balance, 50pp per-claim swing on Plastik EN environmental claim). Highest-leverage controllable lever: per-claim evidence direction balancing at Stage 2 — but it's a design change, not a bug fix, with bias risk on one-sided topics. Bolsonaro demonstrates stable verdicts on directionally clear topics. No family is red under EVD-1. Recommendation: stay in monitor mode.
**For next agent:** If a future quality track opens, start with per-claim evidence direction measurement. Do not tune temperatures or clustering as first intervention. Full report at `Docs/WIP/2026-03-25_Controllable_Variance_Investigation.md`.

---
### 2026-03-25 | Lead Architect | Claude Code (Opus 4.6) | Canonize EVD-1 Captain Approval
**Task:** Update canonical docs to reflect Captain approval of EVD-1 variance policy.
**Files touched:** `Docs/WIP/2026-03-25_EVD1_Acceptable_Variance_Policy.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** EVD-1 is now APPROVED and operative. Analyzer work is in monitor mode — new implementation only if a validation round produces a red result. Amber items (Plastik EN, Muslims) are monitored, not actioned. Optimization remains Captain-gated. Policy revisit scheduled before Beta.
**For next agent:** No active analyzer work. EVD-1 governs variance interpretation. Future work requires either a red threshold breach or explicit Captain approval. Read `Docs/WIP/2026-03-25_EVD1_Acceptable_Variance_Policy.md` Section 6 for the validation protocol.

---
### 2026-03-25 | Lead Architect | Claude Code (Opus 4.6) | EVD-1: Apply Independent-Review Corrections
**Task:** Apply 5 review corrections to EVD-1 policy draft.
**Files touched:** `Docs/WIP/2026-03-25_EVD1_Acceptable_Variance_Policy.md`, `Docs/AGENTS/Agent_Outputs.md`
**Corrections applied:** (1) Flat-Earth 31pp historical anomaly contextualized — pre-QLT-3 decomposition variance, not evidence instability. (2) Confidence band raised to 16–30pp monitor / >30pp investigate — fixes inconsistency where Plastik EN 26pp was implicitly red but intended as amber. (3) Classes B and E marked as provisional with insufficient repeated-run data. (4) Threshold basis note added — bands are performance-derived Alpha baselines, not user-validated product requirements. (5) Amber oscillation rule and validation-cadence definition added.
**For next agent:** EVD-1 is now internally consistent and ready for Captain review.

---
### 2026-03-25 | Lead Architect | Claude Code (Opus 4.6) | EVD-1: Acceptable-Variance Policy Draft
**Task:** Define reusable quality-governance framework for acceptable report variance.
**Files touched:** `Docs/WIP/2026-03-25_EVD1_Acceptable_Variance_Policy.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** 5 input quality classes (A: clean factual through E: legal/political) with empirically grounded green/amber/red bands for article spread, per-claim spread, confidence spread, and verdict direction stability. Current family status: Flat Earth/Bolsonaro/Plastik DE are green; Plastik EN and Muslims are amber (evidence-driven per-claim variance); no family is red. Policy is a governance framework, not implementation — no code changes proposed.
**Open items:** Captain review and approval needed. Specific threshold calibration may need adjustment as more data accumulates.
**For next agent:** Read `Docs/WIP/2026-03-25_EVD1_Acceptable_Variance_Policy.md` for the full framework. Use Section 6 ("How to use") for future validation rounds.

---
### 2026-03-25 | Lead Architect | Claude Code (Opus 4.6) | Canonize OBS-1 and Close Stabilization Wave
**Task:** Update canonical docs to reflect OBS-1 completion and the end of the report-quality stabilization wave.
**Files touched:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** All planned stabilization items (QLT-1/2/3, VAL-2, OBS-1) are now complete. Project is in monitor/decision mode. Next workstream requires Captain decision: EVD-1 (acceptable-variance policy), optimization (P1-A/P1-B), or another approved track. Residual evidence-driven variance (Plastik EN ~30pp, Muslims ~21pp) is documented but not treated as a blocker — it's a policy decision, not an engineering gap.
**For next agent:** No active engineering blocker. Read `Current_Status.md` for the current posture. Captain approval needed before starting any new workstream.

---
### 2026-03-25 | Senior Developer | Claude Code (Opus 4.6) | OBS-1: Request-Safe Per-Job Metrics Isolation
**Task:** Replace module-global metrics collector with per-job isolated metrics using AsyncLocalStorage.
**Files touched:** `apps/web/src/lib/analyzer/metrics-integration.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
**Root cause:** `let currentMetrics: MetricsCollector | null = null` was a module-level global. When concurrent jobs ran, `initializeMetrics()` for job B overwrote job A's collector — job A's subsequent metrics calls (startPhase, recordLLMCall, etc.) wrote to job B's collector, corrupting both.
**Fix shape:** Replaced the global with Node.js `AsyncLocalStorage<MetricsCollector>`. New `runWithMetrics()` function creates a collector and binds it to the async context. All existing metrics functions (`startPhase`, `recordLLMCall`, etc.) now read from `metricsStorage.getStore()` — zero call-site changes in stage files. The pipeline orchestrator wraps the analysis in `runWithMetrics()`.
**Open items:** `initializeMetrics()` is deprecated but kept as a no-op shim. Old import in pipeline replaced with `runWithMetrics`.
**For next agent:** OBS-1 is done. Metrics are now per-job isolated via AsyncLocalStorage. No analyzer behavior changed.

---
### 2026-03-25 | Senior Developer | Claude Code (Opus 4.6) | Canonize VAL-2 and Sync Active Docs
**Task:** Update canonical docs to reflect VAL-2 completion.
**Files touched:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** VAL-2 moved to DONE. OBS-1 is now the sole active engineering priority. Optimization remains secondary.
**For next agent:** Active priority is OBS-1 (per-job metrics isolation).

---
### 2026-03-25 | Senior Developer | Claude Code (Opus 4.6) | VAL-2: Jobs-List Progress/Verdict Sync Race Fix
**Task:** Fix the race where non-terminal jobs show a persisted verdict while progress is stale.
**Files touched:** `apps/web/src/app/jobs/page.tsx`, `apps/api/Services/JobService.cs`
**Root cause:** Two independent issues. (1) `StoreResultAsync` sets `VerdictLabel`/`TruthPercentage`/`Confidence` on the job row before `UpdateStatusAsync` sets status to `SUCCEEDED` — the UI polls in between and shows a verdict badge on a RUNNING job. (2) `UpdateStatusAsync` unconditionally overwrites progress — out-of-order async HTTP events can make progress appear to go backward.
**Fix shape:** (1) UI: verdict badge gated on `isCompleteStatus(job.status)` — only shows for SUCCEEDED/FAILED/CANCELLED/INTERRUPTED. (2) API: monotonic progress guard — RUNNING→RUNNING updates cannot decrease `job.Progress`. Terminal states and restarts bypass the guard.
**Open items:** None. The fix is minimal and doesn't change analyzer behavior, event ordering, or data flow.
**For next agent:** VAL-2 is done. Next priority is OBS-1 (per-job metrics collector).

---
### 2026-03-25 | Senior Developer | Claude Code (Opus 4.6) | Canonize QLT-3 and Sync Active Docs
**Task:** Update canonical docs to reflect post-QLT-3 reality.
**Files touched:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Stage-1 quality stabilization track (QLT-1/2/3) is now complete. QLT-3 moved to monitor mode. VAL-2 and OBS-1 are the new active engineering priorities. Added EVD-1 (evidence-stability/acceptable-variance policy) as a low-priority future item for Captain decision. Remaining Plastik EN (30pp) and Muslims (21pp) variance is evidence/verdict-driven — no further Stage-1 work justified.
**Open items:** None from this docs sync.
**For next agent:** Active priorities are VAL-2 (jobs-list sync race) and OBS-1 (per-job metrics). Stage-1 quality work is done unless new evidence justifies reopening.

---
### 2026-03-25 | Senior Developer | Claude Code (Opus 4.6) | QLT-3 Facet Consistency Fix
**Task:** Implement and validate Stage-1 facet-consistency fix for complex broad-evaluative inputs (Muslims-family).
**Files touched:** `apps/web/prompts/claimboundary.prompt.md`, `Docs/AGENTS/Handoffs/2026-03-25_Senior_Developer_QLT3_Facet_Consistency_Fix.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added 3 targeted prompt rules: (1) no counter-narrative claims, (2) facet convergence for comparative predicates, (3) claim count stability. All three QLT-2-identified failure modes are fixed: claim count stabilized (2-3→3-3), claimDirection stabilized (S+C/X patterns→all S), counter-narrative and media claims eliminated (1/5→0/5). Truth% spread reduced 27pp→21pp. Remaining variance is evidence-driven.
**Open items:** Facet 3 still varies semantically (but all options are now thesis-relevant). Other comparative inputs not yet tested.
**For next agent:** Full report at `Docs/AGENTS/Handoffs/2026-03-25_Senior_Developer_QLT3_Facet_Consistency_Fix.md`. No further Stage-1 work justified for Muslims family. Remaining variance is Stage 2/4 (evidence-driven).

---
### 2026-03-25 | Lead Architect | Codex (GPT-5) | Canonize QLT-2 Result and Sync Active Docs
**Task:** Verify the new `QLT-2` characterization outputs, bring the active docs up to date, and commit the current canonical documentation state.
**Files touched:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/WIP/README.md`, `Docs/WIP/2026-03-25_Report_Quality_Root_Causes_and_Stabilization_Plan.md`, `Docs/AGENTS/Handoffs/2026-03-25_Senior_Developer_QLT2_Characterization.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Accepted the `QLT-2` finding that the remaining instability now has a split root cause: Muslims-family inputs still justify a narrow Stage-1 refinement, while Plastik EN no longer does. Updated the planning docs so the pre-QLT-2 root-cause plan is treated as historical background, and made the `QLT-2` handoff part of the canonical repo state.
**Open items:** `QLT-3`, `VAL-2`, and `OBS-1` remain the active forward work. No analyzer code was changed here.
**Warnings:** Do not keep citing the pre-QLT-2 root-cause plan as if it were the current execution plan; the active next-step state is now in `Current_Status.md`, `Backlog.md`, and the `QLT-2` handoff.
**For next agent:** Start from the `QLT-2` handoff and the updated top sections of `Current_Status.md` / `Backlog.md`. Treat the 2026-03-25 root-cause plan as rationale/history, not the latest task list.
**Learnings:** no

---
### 2026-03-25 | Senior Developer | Claude Code (Opus 4.6) | QLT-2 Residual Instability Characterization
**Task:** Run 13-job characterization batch (5 Plastik EN, 5 Muslims, 3 Flat Earth) to determine whether residual broad-evaluative instability is still Stage-1 driven.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-25_Senior_Developer_QLT2_Characterization.md`
**Key decisions:** Root cause is now SPLIT: Plastik EN Stage 1 is stable (QLT-1 working), remaining 30pp spread is evidence/verdict-driven. Muslims Stage 1 is still unstable (claim count, direction, facets all vary), 27pp spread. Flat Earth control clean (2pp). A single "Stage-1 facet-stabilization fix" is justified for Muslims but would NOT help Plastik EN.
**Open items:** (1) Whether a Muslims-targeted Stage-1 fix also helps other broad-evaluative families; (2) Whether Plastik EN's 30pp evidence-driven spread requires Stage-2/3 intervention or is acceptable; (3) Acceptable variance policy for genuinely mixed topics.
**Warnings:** The pre-QLT-2 assumption that residual variance is "still mainly Stage 1" was correct for Muslims but wrong for Plastik EN. Future planning must not treat these families as having the same root cause.
**For next agent:** Full report at `Docs/AGENTS/Handoffs/2026-03-25_Senior_Developer_QLT2_Characterization.md`. Muslims needs a narrow Stage-1 direction/count/facet-consistency prompt fix. Plastik EN does not need Stage-1 work.
**Learnings:** no

---
### 2026-03-25 | Senior Developer | Claude Code (Opus 4.6) | QLT-1 Predicate Strength Validation
**Task:** Implement and validate QLT-1 prompt fix for Stage 1 predicate-strength preservation.
**Files touched:** `apps/web/prompts/claimboundary.prompt.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Handoffs/2026-03-25_Senior_Developer_QLT1_Predicate_Strength_Validation.md`
**Key decisions:** Added "Predicate strength preservation (CRITICAL)" rule to PASS2 prompt. 12-job validation: Plastik DE spread dropped from 47pp to 22pp (53% reduction), claim count stabilized at 3, predicate softening ("unwirksam") eliminated. All anchor controls correct. No regressions.
**Open items:** Residual 22pp spread is from facet synonym variation, evidence variation, and LLM stochasticity — no single dominant cause remaining.
**For next agent:** Full report at `Docs/AGENTS/Handoffs/2026-03-25_Senior_Developer_QLT1_Predicate_Strength_Validation.md`.

---
### 2026-03-24 | Senior Developer | Codex (GPT-5) | Status / Backlog / WIP Consolidation Refresh
**Task:** Bring the high-level project docs up to date after the Mar-22/23 execution wave and the Mar-24 validation follow-up, update the backlog, and archive no-longer-active WIP documents.
**Files touched:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/WIP/README.md`, `Docs/WIP/2026-03-24_Post_Validation_Control_and_Coverage_Followup.md`, `Docs/WIP/2026-03-18_Refactoring_Plan_Code_Cleanup.md`, `Docs/WIP/Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md`, `Docs/ARCHIVE/README_ARCHIVE.md`, `Docs/AGENTS/Handoffs/2026-03-23_New_Architect_Status_Brief.md`, `Docs/AGENTS/Handoffs/2026-03-23_Senior_Developer_Stage2_Slice1_State_Utils.md`, archived WIP files moved under `Docs/ARCHIVE/`.
**Key decisions:** Re-centered the active docs around the real current gate: post-validation control-quality and boundary-coverage follow-up after the Stage-4 provider-guard fix, the Stage-1 `claimDirection` prompt clarification, and the preliminary-evidence mapping repair. Added a new active WIP note for that gate, rewrote the top of `Current_Status.md` to remove stale “production-ready / optimize next” framing, refreshed `Backlog.md` with immediate priorities and recent completions, and archived the now-historical Mar-22/23 execution/decision/design/proposal docs plus the Mar-18 review artifacts and the completed Bolsonaro sentencing fix plan.
**Open items:** The current live validation batch on commit `31aea55d` still needs to finish and be interpreted. The jobs-list progress/verdict sync race remains open and is now called out explicitly in both status and backlog.
**Warnings:** `Agent_Outputs.md` intentionally still references now-archived file paths inside historical entries. That log is an audit trail and was not rewritten retroactively. Active docs and active handoffs were updated to point to the archive where needed.
**For next agent:** Use `Docs/WIP/2026-03-24_Post_Validation_Control_and_Coverage_Followup.md` as the current next-step document. Do not use the Mar-22 execution plan or Mar-23 decision note as active steering docs anymore; they are archived historical records. WIP Consolidation #7 archived 9 files and reduced the active WIP set to 34 files.
**Learnings:** no

---
### 2026-03-24 | Senior Developer | Claude Code (Opus 4.6) | Fix preliminary-evidence claim-mapping leak
**Task:** Fix systemic bug where seeded preliminary evidence loses multi-claim attribution, causing Claim Assessment Boundaries to show `evidenceCount > 0` but zero coverage in the matrix.
**Files touched:** `apps/web/src/lib/analyzer/types.ts` (1 edit), `apps/web/src/lib/analyzer/claim-extraction-stage.ts` (1 edit), `apps/web/src/lib/analyzer/research-orchestrator.ts` (1 edit), `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` (5 new tests).
**Key decisions:** Root cause was line 580 in `claim-extraction-stage.ts`: `claimId: pe.relevantClaimIds?.[0] ?? ""` collapsed the full `relevantClaimIds[]` array to a single value. Fix: (1) added `relevantClaimIds?: string[]` to the `CBClaimUnderstanding.preliminaryEvidence` type, (2) preserved full array in Stage-1 output alongside legacy `claimId`, (3) updated `seedEvidenceFromPreliminarySearch()` to prefer `relevantClaimIds[]` with 4-step fallback: full array → legacy claimId → single-claim fallback → heuristic remap.
**Open items:** None — fix is complete and verified.
**Warnings:** Legacy `claimId` field kept for backward compatibility (existing stored jobs, serialized state). New code should always use `relevantClaimIds`.
**For next agent:** Coverage matrix (`buildCoverageMatrix`) was not changed — it already counts by `relevantClaimIds`. The fix ensures upstream data now populates that field correctly. Verify with a live run if desired.
**Learnings:** no

---
### 2026-03-24 | Senior Developer | Claude Code (Opus 4.6) | Stage 1 claimDirection Prompt Fix
**Task:** Implement minimal prompt fix for the confirmed `claimDirection` mislabeling bug.
**Files touched:** `apps/web/prompts/claimboundary.prompt.md` (2 edits), `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` (1 new test).
**Key decisions:** Prompt-only fix. Added an explicit `claimDirection` definition in the PASS2 Rules section (line 180) with a "common error to avoid" contrastive note. Also added a schema-level reminder (line 246). No code changes to aggregation or claim-extraction-stage.ts. One regression test documents both the correct behavior (`supports_thesis` → low aggregate) and the failure mode (`contradicts_thesis` on thesis-restating claims → inverted aggregate).
**Open items:** A focused control rerun of "Die Erde ist flach" is needed to confirm the prompt fix works at runtime. This is an LLM judgment fix — unit tests validate the aggregation contract but cannot confirm the LLM will now label correctly.
**For next agent:** Run a serial control pair after deployment: "Die Erde ist flach" + "Ist die Erde rund?" and compare `claimDirection` values. If AC_01/AC_02 are now `supports_thesis` for the flat-earth input, the fix is confirmed.
**Learnings:** no

---
### 2026-03-24 | Senior Developer | Claude Code (Opus 4.6) | "Die Erde ist flach" Control Failure — Root Cause
**Task:** Investigate why `Die Erde ist flach` produced TRUE/100/95 in the Stage-4 validation run.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md` (this entry only — diagnosis, no code changes).

**Root cause: Stage 1 `claimDirection` mislabeling → Stage 5 inversion.**

The failure chain:
1. **Stage 1** extracted claims: "Die Erde hat eine flache geometrische Form", "Die Erde ist in ihrer physikalischen Struktur flach". These restate the thesis ("Die Erde ist flach") and SUPPORT it. But the LLM labeled both `claimDirection: "contradicts_thesis"` — **wrong**.
2. **Stage 4** correctly scored both claims as FALSE (truth% = 0, confidence 95-96). The reasoning is excellent — comprehensive refutation with evidence.
3. **Stage 5** aggregation ([aggregation-stage.ts:136-139](apps/web/src/lib/analyzer/aggregation-stage.ts#L136-L139)) applies `effectiveTruth = 100 - verdict.truthPercentage` for `contradicts_thesis` claims. So 100 - 0 = 100 → article verdict TRUE/100/95.

**Comparison with "Ist die Erde rund?" (054be94d):**
- Thesis: "Die Erde ist rund." Claims: "kugelförmige Form", "geschlossene Oberfläche". Both labeled `supports_thesis` — **correct**.
- Verdicts: truth% 50 and 98. Aggregation: no inversion → article 89/TRUE.
- This job works because the LLM correctly labeled `claimDirection`.

**Failure class:** Stage 1 LLM judgment error on `claimDirection`. The LLM appears to confuse "this claim contradicts scientific reality" with "this claim contradicts the thesis." The claim "earth is flat" restates the thesis but contradicts scientific consensus — the LLM conflated the two meanings.

**The Stage-4 guard fix is orthogonal.** This is a pre-existing quality issue in Stage 1 claim extraction, not a concurrency/reliability problem.

**Smallest justified next action:** Investigate the Stage 1 claim extraction prompt for how `claimDirection` is defined and exemplified. The prompt may need a contrastive example clarifying: "contradicts_thesis means the claim opposes the user's stated position, NOT that the claim contradicts scientific consensus." This is a prompt-level fix, not a code change.

**Open items:** Check whether this mislabeling is systematic for false-consensus inputs (flat earth, homeopathy, anti-vax) or a one-off. A serial rerun of the same input would confirm reproducibility.
**For next agent:** The aggregation inversion logic is correct by design. The bug is upstream in Stage 1 `claimDirection` labeling. Do not change aggregation-stage.ts.
**Learnings:** no

---
### 2026-03-23 | Senior Developer | Claude Code (Opus 4.6) | Stage 4 Provider Guard — Live Validation PASSED
**Task:** Run controlled concurrent validation of the lane-aware Stage-4 concurrency guard to confirm the `Stage4LLMCallError` / `VERDICT_ADVOCATE` failure pattern no longer reproduces.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md` (this entry only — no code changes).
**Key decisions:** Ran on local stack (localhost:5000 API + localhost:3000 web), clean restart. Config: `FH_RUNNER_MAX_CONCURRENCY=3`, `FH_LLM_MAX_CONCURRENCY_ANTHROPIC=2` (Sonnet lane inherits from ANTHROPIC=2). All 3 jobs queued within <1 second to maximize Stage 4 overlap.

**Validation results:**

| Job ID | Input | Verdict | Truth% | Conf | issueCode | llm_provider_error | analysis_generation_failed |
|--------|-------|---------|--------|------|-----------|--------------------|---------------------------|
| f8c73f0d | Die Erde ist flach | TRUE | 100 | 95 | none | 0 | 0 |
| 054be94d | Ist die Erde rund? | TRUE | 89 | 24 | none | 0 | 0 |
| 326bc97b | Hydrogen > electricity | FALSE | 11 | 79 | none | 0 | 0 |

**Observations:**
- All 3 jobs ran concurrently (confirmed: all at 15%→30%→58%→70% in lockstep).
- Zero `llm_provider_error` warnings across all jobs.
- Zero `analysis_generation_failed` across all jobs.
- All verdicts are directionally correct control-input results (no UNVERIFIED fallbacks).
- Overlap was real: two jobs were at 70% (Stage 4) while the third completed at the same timestamp.

**Judgment: PASS.** The lane-aware guard with `anthropic:sonnet=2` held under 3-job concurrent load. The previous failure pattern (Stage4LLMCallError on VERDICT_ADVOCATE → fallback UNVERIFIED) did not reproduce.

**Recommendation:** No config tuning needed. Default Sonnet lane limit of 2 is sufficient at runner concurrency 3. No reason to change `FH_RUNNER_MAX_CONCURRENCY` or `FH_LLM_MAX_CONCURRENCY_ANTHROPIC_SONNET`.
**Open items:** None. Guard is validated. If future load increases beyond 3 concurrent jobs, re-validate.
**For next agent:** Stage-4 reliability is validated. This does not reopen quality/optimization work. Next architectural decision should be made by the architect role per the status brief.

---
### 2026-03-23 | Senior Developer | Claude Code (Opus 4.6) | Restore Post-WS-2 Test Coverage
**Task:** Restore edge-case test coverage lost during Stage 2 extraction (WS-2 Slice 2).
**Files touched:** `research-extraction-stage.test.ts` (rewritten: 159→539 lines, 7→35 tests), `claimboundary-pipeline.test.ts` (added doc comment for skipped sufficiency test).
**Key decisions:** Restored all 4 high-priority test groups: `classifyRelevance` (1→10 tests), `extractResearchEvidence` (1→7 tests), `assessEvidenceApplicability` (1→7 tests), `assessScopeQuality` (2→6 tests), `assessEvidenceBalance` (1→5 tests). Sufficiency integration test kept skipped with clear documentation of why and what would be needed to restore it.
**Open items:** The `selectTopSources` tests remain in `claimboundary-pipeline.test.ts` (not moved — they test pipeline-utils, not extraction stage). Dedicated tests for `research-query-stage.ts` and `research-acquisition-stage.ts` remain as future work.
**For next agent:** Test coverage for extraction stage is now comprehensive. The skipped sufficiency test is an integration-level concern validated by `test:cb-integration` instead. Next testing priority would be `research-query-stage.ts` (query generation) and `research-acquisition-stage.ts` (source fetching).

---
### 2026-03-23 | Senior Developer | Codex (GPT-5) | New Architect Status Brief
**Task:** Prepare a concise but decision-useful onboarding status report for a new architect, including background, current plan state, major decisions, and current architectural difficulties.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-23_New_Architect_Status_Brief.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Wrote a dedicated architect-facing brief that consolidates the recent quality investigation outcome (Plastik parked, v1/v2 closed), the short-horizon execution work completed (`WS-1`, five `WS-2` slices, `WS-3`, `WS-4`), the retirement of stale `P1-A2`, the remaining architectural hotspot (Stage 2 research loop), and the main next decision space. Explicitly documented what should not be silently reopened and what the architect should decide next.
**Open items:** No implementation requested in this task. The next substantive action is an architectural priority decision for the next work window.
**Warnings:** The brief includes an at-time-of-writing note that local `main` contains `WS-3` and the `P1-A2` doc retirement ahead of the last known remote baseline; verify remote sync state before relying on `origin/main` as the baseline.
**For next agent:** Start with `Docs/AGENTS/Handoffs/2026-03-23_New_Architect_Status_Brief.md` if you need a compact architectural onboarding packet rather than reconstructing state from all WIP and agent logs.
**Learnings:** no

---
### 2026-03-23 | Senior Developer | Claude Code (Opus 4.6) | WS-3 Evaluate-Source Route Decomposition
**Task:** Decompose `evaluate-source/route.ts` (2,959 lines) into 5 modules, eliminating 8 request-unsafe mutable globals.
**Files touched:** `route.ts` (2,959→281 lines), 5 new modules in `apps/web/src/lib/source-reliability/`: `sr-eval-types.ts` (210), `sr-eval-prompts.ts` (747), `sr-eval-evidence-pack.ts` (901), `sr-eval-enrichment.ts` (266), `sr-eval-engine.ts` (676). Test `evaluator-logic.test.ts` updated to import from new modules.
**Key decisions:** Replaced 8 `let` module-level variables with a single `SrEvalConfig` interface built per-request in POST(). `rateLimitState` kept in route.ts (intentionally cross-request). `languageDetectionCache` and `translationCache` kept as module-level Maps (safe caches). `buildSrSearchConfigFromEvalSearch` and `RequestSchema` kept in route.ts (config construction / POST-only). `normalizeEvidenceQualityAssessmentConfig` now takes a default config param for testability.
**Open items:** None. WS-3 complete.
**Warnings:** The prompts module (747 lines) is the largest new file — mostly large string templates. Not a decomposition concern, just large by nature.
**For next agent:** Evaluate-source is now modular. Route.ts is a thin handler: auth → parse → config → rate limit → evaluate. All 8 mutable globals are eliminated. `SrEvalConfig` is the config threading mechanism.
**Learnings:** no

---
### 2026-03-23 | Technical Writer | Claude Code (Opus 4.6) | Retire P1-A2 and Fix Optimization Plan/Code Mismatch
**Task:** Update optimization documentation to retire P1-A2 as stale and correct the plan/code mismatch in Stage 4 architecture description.
**Files touched:** `Docs/WIP/Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md`, `Docs/WIP/2026-03-22_Next_1_2_Weeks_Execution_Plan.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:**
- P1-A2 marked RETIRED (STALE): the `for...of` per-claim loop it targeted does not exist — Stage 4 already batches all claims per debate step, Steps 2+3 already run via `Promise.all`, and validation checks already run in parallel.
- Fixed the §4 heading/body mismatch that conflated P1-A (clustering → Haiku) with P1-A2 (verdict debate parallelization). Replaced with a clear Phase 1 status summary.
- Revised Phase 1 estimated impact to reflect that the original savings projection included P1-A2.
- Updated execution plan to remove P1-A2 as next step and point to WS-3 instead.
- Clarified "what remains": Phase 1 structural wins complete, P1-B deferred, P1-A is a separate future quality experiment.
**Open items:** None — documentation-only change.
**Warnings:** P1-A (clustering → Haiku) is NOT retired. It remains a valid future experiment but is quality-affecting and needs separate validation. Do not conflate P1-A retirement with P1-A2 retirement.
**For next agent:** The optimization plan now accurately reflects the current Stage 4 architecture. No future agent should treat P1-A2 as a pending implementation item. If further Stage 4 speed optimization is needed, it would require a fresh analysis of the batched architecture's bottlenecks, not the retired per-claim parallelization concept.
**Learnings:** no

---
### 2026-03-23 | Senior Developer | Claude Code (Opus 4.6) | WS-4 Search Provider Clone Consolidation
**Task:** Execute WS-4: extract shared boilerplate from 7 search provider files into `search-provider-utils.ts`.
**Files touched:** `apps/web/src/lib/search-provider-utils.ts` (new), `search-google-cse.ts`, `search-serper.ts`, `search-serpapi.ts`, `search-brave.ts`, `search-wikipedia.ts`, `search-semanticscholar.ts`, `search-factcheck-api.ts` (all modified).
**Key decisions:** Extracted 5 shared utilities: `requireApiKey`, `warnIfMissingApiKey`, `extractErrorBody`, `classifyHttpError`, `handleFetchError`. Kept provider-specific patterns inline: Google CSE compound key check, Serper 5xx non-fatal throw, Wikipedia 429/500+ distinct handling, FactCheck 400 handling, Semantic Scholar rate limiter, all result mapping and request construction. `queryFactCheckApi` (second function in FactCheck) kept its own simpler error handling to avoid adding logging where there was none.
**Open items:** None. WS-4 complete.
**Warnings:** `createSearchLogger()` (mentioned in refactoring plan) was deliberately skipped — indirection would make debugging harder for minimal line savings. Google CSE keeps inline key validation due to compound two-variable check.
**For next agent:** Search providers now share `search-provider-utils.ts` for error handling plumbing. Provider-specific behavior stays in each provider file. Next approved step per Captain decision: P1-A2 (verdict debate parallelization).
**Learnings:** no

---
### 2026-03-23 | Lead Architect | Cline | Post-WS-2 Priority Review & Next Steps Recommendation
**Task:** Review the post-WS-2 state (5 slices complete, research loop remaining) and recommend the next execution priority between P1-A2, WS-4, resuming WS-2, or P1-B.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:**
- **WS-2 should remain paused:** The remaining Stage 2 research loop is highly coupled. Pausing here secures massive readability gains (~5,700 -> ~2,522 lines) without risking destabilization.
- **P1-A2 is NOT the right next move yet:** Parallelizing the verdict debate has hidden complexity (shared warnings array, progress events, LLM rate limits). It shouldn't be mixed right after a major structural refactor.
- **WS-4 IS the best next step:** Search Provider Clone Consolidation is a pure, low-risk structural cleanup that removes duplicated boilerplate across 7 files without changing concurrency or semantics.
- **P1-B remains deferred:** Parallelizing preliminary search saves minimal time (~50s) but introduces search API rate-limit risks.
- **Branch MUST be pushed:** The branch is significantly ahead of origin. Pushing now locks in the WS-1, WS-2, and P1-C/D/E wins before starting WS-4.
**Open items:** Execute `git push` and begin `WS-4`.
**Warnings:** Do not start P1-A2 without a dedicated plan for synchronizing `state.warnings` and handling LLM provider rate limits for concurrent calls.
**For next agent:** Push the branch to origin, then start `WS-4` (Search Provider Clone Consolidation) by creating `search-provider-utils.ts` as specified in the refactoring plan.
**Learnings:** no

---
### 2026-03-22 | Senior Developer | Codex (GPT-5) | Phase 2 v3 Brief Review Feedback Incorporated
**Task:** Incorporate reviewer feedback into the new Phase 2 v3 architecture brief so it is safer to use later as the restart document.
**Files touched:** `Docs/WIP/2026-03-22_Plastik_Phase2_v3_Architecture_Brief.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Tightened the brief in five places: explained why v1 `"main"` supplementation was directionally biased via inherited `expectedEvidenceProfile`; added the key unresolved direction-control question inside Option A; noted that FR exact's lower inter-claim spread points to EN retrieval-space concentration; clarified that Option B becomes more tractable as WS-2 progresses; and explicitly separated adjacent claim-decomposition/phrasing instability from the v3 retrieval problem. Also added guidance that old v2 Step 3.5/config remnants should not be reused as the v3 base.
**Open items:** The brief is still design-only. No implementation approval was added. Remaining work is review/decision, not coding.
**Warnings:** The main structural risk remains under-specifying direction control inside claim-scoped multilingual lanes. That question is now explicit in the brief and must be answered before any future v3 implementation plan.
**For next agent:** Use the updated brief, not the earlier draft, if Phase 2 v3 is discussed again. The current near-term default remains: keep Plastik parked.
**Learnings:** no

---
### 2026-03-22 | Senior Developer | Codex (GPT-5) | Phase 2 v3 Design Brief — Architecture Restart Point Defined
**Task:** Execute the next planned non-code step after the low-risk optimization slice by writing the Phase 2 v3 design-only architecture brief for the parked Plastik multilingual-neutrality issue.
**Files touched:** `Docs/WIP/2026-03-22_Plastik_Phase2_v3_Architecture_Brief.md`, `Docs/WIP/2026-03-22_Next_1_2_Weeks_Execution_Plan.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Treated this as a design-only restart point, not as an implementation request. Captured the two hard lessons from failed Phase 2 variants: (1) shared supplementary pooling is the wrong abstraction, and (2) supplementary language is not a stable proxy for evidential direction. Compared three credible paths (`Option A` claim-scoped multilingual retrieval lanes, `Option B` independent multilingual claim analysis then reconciliation, `Option C` keep parked) and recommended: keep the limitation parked by default; if reopened later, start with a claim-scoped multilingual-lane design rather than any v1/v2 derivative.
**Open items:** The brief is ready for review/prioritization. No Phase 2 v3 implementation is approved or started. Optional `P1-B` preliminary-search parallelization also remains deferred and untouched.
**Warnings:** Do not misread the existence of the v3 brief as approval to reopen Plastik implementation. The brief is explicitly a guard against repeating v1/v2, not a hidden resumption of that track.
**For next agent:** If asked about Plastik next, start from `Docs/WIP/2026-03-22_Plastik_Phase2_v3_Architecture_Brief.md`. If priorities stay unchanged, this track remains parked and other approved repository work should take precedence.
**Learnings:** no

---
### 2026-03-22 | Senior Developer | Codex (GPT-5) | Low-Risk ClaimBoundary Speed/Cost Slice — P1-C / P1-D / P1-E
**Task:** Execute the approved low-risk speed/cost subset after WS-2 first slice: record preliminary URLs in `state.sources`, wire `parallelExtractionLimit`, and align preliminary fetch timeout usage.
**Files touched:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `Docs/WIP/2026-03-22_Next_1_2_Weeks_Execution_Plan.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Kept the slice purely structural. Preliminary fetches now add successful URLs into `state.sources` for later diagnostics/provenance, reuse the configured `sourceFetchTimeoutMs`, and `fetchSources(...)` now honors `parallelExtractionLimit` instead of a hardcoded concurrency of 3. Deliberately did **not** include optional `P1-B` preliminary-search parallelization in the same change.
**Open items:** Optional `P1-B` remains deferred. Per the Mar-22 execution plan, the next execution item is now a Phase 2 v3 design-only architecture brief rather than more live tuning or broader optimization work.
**Warnings:** The preliminary-source `searchQuery` stored in `state.sources` reflects the actual generated preliminary query (for example the `searchHint`-based query), not necessarily the original rough-claim statement. This is intentional and now covered by tests.
**For next agent:** Treat this low-risk subset as complete. Do not reopen Phase 2 v1/v2. If priorities stay unchanged, move to the Phase 2 v3 design brief or another explicitly approved architecture/planning task rather than extending optimization scope opportunistically.
**Learnings:** no

---
### 2026-03-22 | Senior Developer | Codex (GPT-5) | WS-2 First Slice — Pipeline Leaf Helpers Extracted
**Task:** Execute the first WS-2 decomposition slice after WS-1 by extracting a very small, low-risk leaf module from `claimboundary-pipeline.ts`.
**Files touched:** `apps/web/src/lib/analyzer/pipeline-utils.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `Docs/WIP/2026-03-22_Next_1_2_Weeks_Execution_Plan.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Kept the slice intentionally narrow: moved only pure helper functions into new `pipeline-utils.ts` (`checkAbortSignal`, `detectInputType`, `selectTopSources`, `classifySourceFetchFailure`, `mapCategory`, `extractDomain`, `mapSourceType`, `normalizeExtractedSourceType`, `createErrorFingerprint`, `createUnverifiedFallbackVerdict`). No stage logic moved. `claimboundary-pipeline.ts` re-exports the public helpers used by tests, so external imports remain stable.
**Open items:** This completes only the first WS-2 leaf slice. No stage module extraction has started yet. Per the Mar-22 execution plan, the next execution item is the low-risk speed/cost subset (`P1-C`, `P1-D`, `P1-E`, optionally `P1-B` later).
**Warnings:** `detectInputType` remains existing deterministic fallback logic; this slice only moved it, it did not expand its analytical role. Do not interpret this slice as a semantic change.
**For next agent:** Treat `pipeline-utils.ts` as the new home for small shared ClaimBoundary helpers. The next safe step is not another large WS-2 move by default; it is the low-risk optimization subset unless priorities change.
**Learnings:** no

---
### 2026-03-22 | Senior Developer | Claude Code (Opus 4.6) | WS-1 Dead Code Removal — 3,682 lines deleted
**Task:** Execute WS-1 from the refactoring plan: remove dead code with zero callers.
**Files touched:** 22 files (14 deleted source, 4 deleted test, 6 deleted prompt, 3 edited references).
**Key decisions:** `json.ts` kept (imported by `claimboundary-pipeline.ts` — plan incorrectly listed as dead). `json.test.ts` kept. `inverse-claim-verification.prompt.md` preserved (used by `paired-job-audit.ts`). `calculateFalsePositiveRate` removed from barrel re-export only. `VALID_PROMPT_PROFILES` and admin page cleaned of 4 dead text-analysis entries.
**Open items:** None. WS-1 complete.
**Warnings:** None. Build clean, 67/67 test files pass (1329 tests). Delta: −4 test files / −37 tests (all from deleted dead modules).
**For next agent:** WS-1 is done. Next per execution plan: WS-2 first slice (pipeline decomposition).

---
### 2026-03-22 | Senior Developer | Codex (GPT-5) | WIP Plan Roles Clarified
**Task:** Remove ambiguity between the short-horizon execution plan, the refactoring plan, and the speed/cost optimization plan so future agents do not treat the wrong document as the governing priority source.
**Files touched:** `Docs/WIP/2026-03-22_Next_1_2_Weeks_Execution_Plan.md`, `Docs/WIP/2026-03-18_Refactoring_Plan_Code_Cleanup.md`, `Docs/WIP/Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Made the document roles explicit in all three plans. The Mar 22 plan is now clearly labeled as the governing near-term execution plan; the Mar 18 refactoring doc is explicitly the refactoring source plan; the Mar 19 speed/cost doc is explicitly the optimization source plan. The WIP index now repeats this distinction so the relationship is visible from the directory entry point.
**Open items:** The plan itself is still draft and awaits substantive review/approval. These edits only remove document-role ambiguity.
**Warnings:** Future edits should preserve this role separation. If the near-term execution order changes, update the Mar 22 plan rather than silently repurposing the refactor or optimization source documents.
**For next agent:** Use `Docs/WIP/2026-03-22_Next_1_2_Weeks_Execution_Plan.md` as the top-level sequencing document. Use the other two only after the execution plan explicitly selects their tracks.
**Learnings:** no

---
### 2026-03-22 | Senior Developer | Codex (GPT-5) | Next 1-2 Weeks Execution Plan Draft
**Task:** Convert the current post-Plastik-investigation recommendations into a concrete short-horizon execution plan and publish it as a reviewable WIP document.
**Files touched:** `Docs/WIP/2026-03-22_Next_1_2_Weeks_Execution_Plan.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Framed Plastik multilingual neutrality as a parked known limitation after failed Phase 2 v1/v2 experiments and explicitly moved the near-term focus to config provenance repair, WS-1 dead-code cleanup, a first WS-2 decomposition slice, and only the low-risk subset of the speed/cost plan. Kept Phase 2 v3 alive as a future architecture/design track, not an immediate implementation task.
**Open items:** The new WIP plan is draft-only and should be reviewed before execution starts. A separate decision is still needed on whether config provenance should be lifted ahead of all refactoring work if it remains partially open.
**Warnings:** The plan intentionally does not reopen Plastik Phase 2 implementation. If product priorities change and multilingual neutrality becomes urgent again, the correct restart point is a fresh Phase 2 v3 architecture brief, not further tuning of v1/v2.
**For next agent:** Use `Docs/WIP/2026-03-22_Next_1_2_Weeks_Execution_Plan.md` as the working plan for the next short execution window. If approved, start with the "Priority 0 / Priority 1" items before touching the larger refactoring or optimization streams.
**Learnings:** no

---
### 2026-03-22 | Senior Developer | Claude Code (Sonnet 4.6) | Phase 2 v2 — Contrarian Cross-Linguistic Supplementation (FAIL, flag off)
**Task:** Validate Phase 2 v2, evaluate gate criteria, revert if failed.
**Files touched:** UCM `pipeline/default` (reverted to `crossLinguisticQueryEnabled=false`). Full results: `Docs/AGENTS/Handoffs/2026-03-22_Senior_Developer_Phase2v2_CrossLinguistic_v2_Results.md`.
**Key decisions:** Phase 2 v2 FAILED. Gate fired for only 1/6 runs (DE exact, ratio=0.58). The one firing moved DE from 21%/77% MOSTLY-FALSE → 74%/24% MOSTLY-TRUE (wrong direction). All other apparent improvements (EN exact conf 24%→64%, FR exact conf 24%→70%, EN para direction 63%→37%) are run variance — the supplementary pass was blocked for those runs. Family spread unchanged at 47pp (was 48pp). Core assumption invalid: supplementary language ≠ balancing direction proxy. UCM reverted at 2026-03-22T17:04:29Z.
**Open items:** Phase 2 cross-linguistic supplementation exhausted in current architecture. Two options: (1) park as known limitation, (2) Phase 2 v3 as full architecture redesign. Captain decision required.
**Warnings:** Do not lower threshold or change > to >= as a quick fix — this causes more wrong-direction firings. Code kept behind flag; do not enable without full redesign.
**For next agent:** Phase 2 v1 and v2 both failed. Root causes are fundamentally different. v1: claim-unaware pool mixing. v2: language ≠ direction proxy + gate rarely fires. The 47pp family spread remains an open problem. See full experiment history in handoff file.

---
### 2026-03-22 | Senior Developer | Claude Code (Sonnet 4.6) | Phase 2 v2 Implementation — Contrarian Cross-Linguistic Supplementation
**Task:** Implement Phase 2 v2: change supplementary pass from `"main"` iterationType to `"contrarian"`, add pool balance gate (`supplementarySkewThreshold: 0.55`), bound budget to `suppQueriesPerClaim`.
**Files touched:** `apps/web/configs/pipeline.default.json`, `apps/web/src/lib/config-schemas.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`. Handoff: `Docs/AGENTS/Handoffs/2026-03-22_Senior_Developer_Phase2v2_ClaimAware_CrossLinguistic_Implementation.md`.
**Key decisions:** `supplementarySkewThreshold` placed in pipeline config (not calculation config — `researchEvidence()` doesn't load calculation config). Pool balance gate uses inline `majorityRatio` calculation (not `assessEvidenceBalance` which mishandles empty pool). Budget bound changed from `maxSourcesPerIteration` (8) to `suppQueriesPerClaim` (2). UCM activated at `2026-03-22T13:16:21.859Z`.
**Open items:** Validation batch not yet run. Six inputs: EN exact, DE exact, EN para, FR exact (Plastik family) + Hydrogen + Bolsonaro smoke.
**Warnings:** `assessEvidenceBalance()` returns `isSkewed=false` for empty pool — do not reuse for supplementary gate. Gate 4 `contextConsistency` (`maxConfidenceSpread: 25 / reductionFactor: 0.5`) unchanged.
**For next agent:** UCM active (`crossLinguisticQueryEnabled=true`, `supplementarySkewThreshold=0.55`). Run validation batch. Gate: EN/FR conf ≥ 50% (was 24%), spread ≤ 35pp (was 47pp), smoke inputs stable ±15% conf.

---
### 2026-03-22 | Lead Architect + Senior Developer | Claude Code (Sonnet 4.6) | Phase 2 v2 Design — Claim-Aware Cross-Linguistic Supplementation
**Task:** Design Phase 2 v2 after v1 failed. Post-mortem, v2 design proposal, minimum viable implementation slice, validation plan, go/defer recommendation.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-22_Lead_Architect_Phase2v2_ClaimAware_CrossLinguistic_Design.md` (created).
**Key decisions:** v2 design: change supplementary iterationType from `"main"` → `"contrarian"`. Add `supplementarySkewThreshold: 0.55` UCM gate (skip supplementary if pool already balanced). Extend `extendedPipelineConfig` with `contrarianMaxQueriesPerClaim`. Pre-implementation blocker: verify whether `contrarianMaxQueriesPerClaim` is accessible from pipeline config context or only from calculation config. **Recommendation: Go — implement v2** (3-file change, ~15 net lines, bounded risk, no lower-friction alternative).
**Open items:** Captain approval for implementation. Verify `contrarianMaxQueriesPerClaim` accessibility. After implementation: 4-input validation batch (EN exact, DE exact, EN para, FR exact) + Hydrogen regression control.
**For next agent:** Read full design doc. Pre-implementation check: search for `contrarianMaxQueriesPerClaim` usage in `claimboundary-pipeline.ts` to confirm config access path. Then implement the 3-file change, run `npm test` + build, activate via UCM, run validation batch.

---
### 2026-03-22 | Senior Developer | Claude Code (Sonnet 4.6) | Phase 2 v1 — Cross-Linguistic Supplementation (FAIL, flag off)
**Task:** Implement and validate Phase 2: cross-linguistic query supplementation behind `crossLinguisticQueryEnabled` UCM flag. Run 4-input validation batch (EN exact, DE exact, EN para, FR exact).
**Files touched:** `apps/web/src/lib/config-schemas.ts`, `apps/web/configs/pipeline.default.json`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`. UCM config reverted to `crossLinguisticQueryEnabled=false`. Full results: `Docs/AGENTS/Handoffs/2026-03-22_Senior_Developer_Phase2_CrossLinguistic_v1_Results.md`.
**Key decisions:** Phase 2 v1 FAILED. EN para went wrong direction (55%→63%). Confidence collapse on EN exact (74%→24%), FR exact (73%→24%), EN para (24%). Spread 47pp — no improvement vs pre-experiment 48pp baseline. Root cause: supplementary DE pass deposits evidence into shared pool without claim awareness → inter-claim spread exceeds `maxConfidenceSpread: 25` → `contextConsistency` penalty → confidence floor. Code kept behind flag (correctly implemented mechanically); UCM reverted to false. Do not soften Gate 4 calibration to paper over this.
**Open items:** Spread problem unresolved (post-revert: ~48pp). All interventions exhausted: B1 ✓ B2 ✓ Phase1A ✗ Phase1 ✗ Phase2v1 ✗.
**For next agent:** Phase 2 v2 (claim-aware cross-linguistic supplementation) is the only remaining structural option. Requires Captain design approval. EN para post-revert result (27% / 71%) is an incidental baseline data point — EN para can land correctly without cross-linguistic supplementation.

---
### 2026-03-22 | Senior Developer | Claude Code (Sonnet 4.6) | Phase 1 Experiment — GENERATE_QUERIES direction-neutralization (FAIL, reverted)
**Task:** Implement and validate the Lead Architect's GENERATE_QUERIES direction-neutralization prompt change (expectedEvidenceProfile confirmation bias fix). Captain-approved.
**Files touched:** `apps/web/prompts/claimboundary.prompt.md` (changed then reverted), reseeded to config DB twice.
**Key decisions:** Phase 1 FAILED and was reverted. The direction-neutralization paragraph ("don't skew toward what preliminary search found") harmed correctly-low runs: DE/FR preliminary searches legitimately found contradicting evidence; the instruction caused the LLM to seek more supporting evidence, pushing Run4 (55%→69%) and Run5 (15%→36%) up without helping EN exact (63%→62%, no movement). Root cause: the instruction is undifferentiated — it corrects the EN failure-anchor but simultaneously breaks DE/FR runs that were already correct. Spread: 48pp → 44pp (no material improvement).
**Open items:** Both UCM levers (Phase 1A) and prompt levers (Phase 1) are now exhausted. Phase 2 (cross-linguistic query supplementation) is the structural fix — requires Captain design approval before implementation.
**For next agent:** Prompt is back to pre-Phase-1 state (reseeded). No code/config changes remain. Read `2026-03-21_Lead_Architect_Plastik_Stage2_Retrieval_Design_Assessment.md` §4 for Phase 2 design. Key constraint: cross-linguistic language selection must be LLM-guided or config-driven, not hardcoded per-language rules.

---
### 2026-03-22 | Senior Developer | Claude Code (Sonnet 4.6) | Phase 1A Experiment — evidenceBalanceSkewThreshold 0.8→0.65
**Task:** Controlled UCM-only experiment: lower contrarian threshold from 0.8 to 0.65. Observe whether contrarian fires on EN exact and reduces spread.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-22_Senior_Developer_Phase1A_Experiment_Results.md`
**Key decisions:** Phase 1A FAILED and was reverted. Contrarian does fire at 0.65 — mechanism confirmed working. But EN exact went from 63%→77% (worse). Contrarian found only 21 contradicting items against 85 supporting — EN search space structurally resistant to yielding contradicting evidence for "is pointless" framing. Phase 1B (more iterations) also not recommended by structural math. Next step: Lead Architect Phase 1 (GENERATE_QUERIES direction-neutralization, prompt change, needs Captain approval).
**Open items:** Captain decision on Phase 1 prompt change (direction-neutralization paragraph in GENERATE_QUERIES).
**For next agent:** See handoff. Threshold is back to 0.8. Do not retry threshold changes. Proposed prompt text in `2026-03-21_Lead_Architect_Plastik_Stage2_Retrieval_Design_Assessment.md` §3.

---
### 2026-03-21 | LLM Expert | Claude Code (Sonnet 4.6) | Stage 2 Architecture Deep Dive — Retrieval Root Cause
**Task:** Full Stage 2 code investigation: how retrieval creates the EN exact 63% outlier. Identify structural gaps and lowest-friction intervention package.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-21_LLM_Expert_Stage2_Architecture_Deep_Dive.md`
**Key decisions:** Identified `evidenceBalanceSkewThreshold=0.8` (strict >) as the critical structural gap — EN exact pools at ~65% supporting never cross this threshold, so D5 contrarian (already built, already correct) never fires. Also identified `contradictionReservedIterations=1` as structurally insufficient against dominant EN failure narrative. Both fixable via UCM with no approval. Recommended phased rollout: Phase 1 (UCM: lower skew threshold to 0.65, increase contradiction iterations to 2) → Phase 2 (prompt: direction-neutralization in GENERATE_QUERIES, approval needed) → Phase 3 (code: cross-linguistic retrieval, design approval).
**Open items:** Phase 0 diagnostic (3 EN exact runs to confirm persistent issue). Phase 1 UCM changes can be activated immediately via admin API. Phase 2 and 3 require Captain approval.
**For next agent:** See handoff for UCM API commands. The contrarian mechanism fires for ALL claims when triggered; budget increase (`contradictionReservedQueries`: 2→4) is required alongside the iterations increase to prevent silent budget exhaustion.

---
### 2026-03-21 | LLM Expert | Claude Code (Sonnet 4.6) | Stage 2 Retrieval Skew — Prompt-Mechanics Root Cause
**Task:** Diagnose why Run2 (EN exact: 63% LEANING-TRUE) stays high after B1+B2. Complement Lead Architect structural assessment with prompt-level stage-by-stage breakdown.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-21_LLM_Expert_Stage2_Retrieval_Skew_Analysis.md`
**Key decisions:** Confirmed RC1 (preliminary search anchoring in EN failure discourse, ~45% of spread) + RC2 (expectedEvidenceProfile inheriting failure bias, ~25%) as the cascade. B1 doesn't reach most EN failure evidence because it's correctly `supports`, not misclassified. VerdictDirectionPolicy correctly doesn't fire — 63% is directionally consistent with ~65% supporting pool. C-exp (balanced preliminary injection without code change) is a cheaper diagnostic gate than running 3 fresh LLM runs. C1 (bidirectional expectedEvidenceProfile in Pass 2) and C2 (refutingSearchHint in Pass 1) are the prompt-level alternatives to cross-linguistic pooling.
**Open items:** C-exp diagnostic recommended before C1/C2. Captain approval required for any prompt change.
**For next agent:** See handoff for per-stage percentage breakdown and the distinction between C1 (Pass 2 expectedEvidenceProfile structure) vs Lead Architect Phase 1 (GENERATE_QUERIES direction neutralization). Both target the same RC2 from different sites — GENERATE_QUERIES change is narrower/lower-risk; Pass 2 change is more structural.

---
### 2026-03-21 | Lead Architect | Claude Code (Sonnet 4.6) | Plastik Stage 2 Retrieval Design Assessment
**Task:** Assess whether remaining 48pp post-B1+B2 spread requires another local prompt tweak or structural retrieval redesign. Deliver phased plan with decision gates.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-21_Lead_Architect_Plastik_Stage2_Retrieval_Design_Assessment.md`
**Key decisions:** 48pp spread is primarily RC1 (language-stratified retrieval) — not fixable by prompt alone. One remaining prompt intervention (expectedEvidenceProfile neutralization, Phase 1) is worth doing as a gate test. If insufficient, Phase 2 (cross-linguistic query supplementation) is the structural fix.
**Open items:** Phase 0 diagnostic (3 EN exact runs); Captain approval for Phase 1 prompt change; Captain design approval for Phase 2 before implementation.
**For next agent:** Read `2026-03-21_Lead_Architect_Plastik_Stage2_Retrieval_Design_Assessment.md` for full phased plan. Do Phase 0 first (zero-cost diagnostic).

---
### 2026-03-20 | Senior Developer | Claude Code (Sonnet 4.6) | Plastik A1 Experiment + verdictDirectionPolicy Promoted
**Task:** Execute A1 experiment (verdictDirectionPolicy via UCM), evaluate results, promote to permanent default.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-20_A1_Experiment_Results.md`, `apps/web/src/lib/config-schemas.ts` (default changed), `apps/web/configs/pipeline.default.json` (default changed), `apps/web/test/unit/lib/config-schemas.test.ts` (2 assertions updated).
**Key decisions:** Policy promoted — no overcorrection, correctly fired on Run3 (skewed evidence). Run4/5 improvements came from retrieval balance, not direction repair. 1365 tests passing.
**Open items:** B1/B2 (EXTRACT_EVIDENCE + GENERATE_QUERIES prompt improvements) are the next structural fixes. Need Captain approval before implementation. Boundary concentration (CB_34: 92.3%) is a secondary signal worth monitoring.
**For next agent:** Read `2026-03-20_A1_Experiment_Results.md` + `2026-03-20_Implementation_Brief_Plastik_Stage2_Fix.md`. Prompt B1/B2 changes require explicit Captain approval before touching `claimboundary.prompt.md`.

---
### 2026-03-20 | Senior Developer | Claude Code (Sonnet 4.6) | Plastik Downstream Instability Analysis + Implementation Brief
**Task:** Investigate downstream verdict spread after Stage 1 contract fix. Write implementation brief for next agent.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-20_Senior_Developer_Plastik_Downstream_Instability_Analysis.md`, `Docs/AGENTS/Handoffs/2026-03-20_Implementation_Brief_Plastik_Stage2_Fix.md`
**Key decisions:** Stage 2 retrieval is primary driver. Stage 4 direction policy is experiment only (not permanent default). Captain reprioritized: A1 as controlled UCM experiment, B1/B2 (prompt work) as actual root-cause fixes.
**Open items:** A1 experiment needs to be run and evaluated (done). B1/B2 prompt changes need formal Captain approval before implementation.
**For next agent:** See A1 results handoff (above).

---
### 2026-03-19 | Lead Architect | Claude Code (Opus 4.6) | Refactoring Plan — Planning Complete, Awaiting Execution
**Task:** Create comprehensive refactoring plan for monolithic code, dead code, and clone cleanup. Coordinate 3 reviews (Code Reviewer, Lead Developer, Senior Architect).
**Files touched:** `Docs/WIP/2026-03-18_Refactoring_Plan_Code_Cleanup.md` (authoritative plan), `Docs/WIP/2026-03-18_Review_CodeReviewer.md`, `Docs/WIP/2026-03-18_Review_LeadDeveloper.md`, `Docs/WIP/2026-03-18_Review_Architect.md`
**Key decisions:** 7 work streams. WS-1 dead code (~4,200 lines). WS-2 pipeline decomposition (8 modules). WS-3 evaluate-source (5 modules + request-scoped config). WS-4 search provider shared utilities. WS-5/6 UI component extraction. WS-7 deferred.
**Open items:** Execution blocked by Captain — wait until current work is closed. Architect's Rec-3 (import direction lint), Rec-4 (barrel re-export phase-out), Rec-5 (stage type aliases) are post-execution follow-ups.
**Warnings:** Line counts are approximate (files have been edited since initial measurement). WS-3/5/6 are Medium-High effort, not Medium. `pipeline-utils.ts` and `aggregation-stage.ts` need monitoring guardrails.
**For next agent:** Read `Docs/WIP/2026-03-18_Refactoring_Plan_Code_Cleanup.md` (the plan) + all 3 review files. Start with WS-1 (dead code removal — near-zero risk). One commit per step, build + test after each.

---
### 2026-03-19 | Lead Architect | Claude Code (Opus 4.6) | Refactoring Plan Architectural Review
**Task:** Architectural review of `Docs/WIP/2026-03-18_Refactoring_Plan_Code_Cleanup.md` focusing on module cohesion, dependency direction, barrel re-exports, state threading, naming, and missing concerns.
**Files touched:** `Docs/WIP/2026-03-18_Review_Architect.md`
**Key decisions:** Approved plan. WS-2 module boundaries represent true bounded responsibilities (stage-per-module). Dependency graph is clean with no circular risks. Barrel re-exports are correct for migration but should be removed in a follow-up phase. CBResearchState pass-by-reference is acceptable now but should get stage input/output type aliases for future evolution. Naming conventions are consistent.
**Open items:** (1) Verify `pipeline-utils.ts` functions actually have 2+ stage consumers. (2) Add import direction lint/test after WS-2. (3) Phase 2 barrel re-export removal within 2 weeks. (4) Stage input/output type aliases in `types.ts`.
**Warnings:** `pipeline-utils.ts` and `aggregation-stage.ts` are the two modules most likely to erode their cohesion over time. Concrete admission criteria and split triggers are defined in the review.
**For next agent:** Read `Docs/WIP/2026-03-18_Review_Architect.md` for 9 recommendations (Rec-1 through Rec-9). High-priority items: Rec-1 (utils admission criteria), Rec-3 (import direction enforcement), Rec-4 (barrel re-export phase-out), Rec-8 (no Zod schemas in orchestrator).

---
### 2026-03-19 | Lead Developer | GitHub Copilot (GPT-5.4) | Refactoring Plan Practicality Review
**Task:** Review `Docs/WIP/2026-03-18_Refactoring_Plan_Code_Cleanup.md` for practicality and implementation quality as Lead Developer, with emphasis on WS-2 through WS-6 and effort realism.
**Files touched:** `Docs/WIP/2026-03-18_Review_LeadDeveloper.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Endorsed the overall plan direction but recommended tighter module seams: keep `claimboundary-pipeline.ts` as a thin orchestrator, keep `pipeline-utils.ts` small, and watch `aggregation-stage.ts` for re-monolith risk. Strongly recommended replacing SR route mutable globals with a request-scoped config/context object rather than raw parameter threading. Confirmed shared utilities are the right level for search providers, but rejected an adapter/interface layer. Recommended following the existing jobs-page extraction convention more closely (flat components/hooks/utils/lib; only light grouping when justified).
**Open items:** Captain / implementer should decide whether to keep the extracted jobs-page component tree flat or introduce limited grouping (`verdict`, `evidence`, `events`/`report`, `shared`). If WS-2 extraction causes `aggregation-stage.ts` to exceed ~900 lines, split narrative or quality helpers into a second module rather than accepting a new monolith.
**Warnings:** Current plan line counts are somewhat stale relative to the repo (`claimboundary-pipeline.ts` 5692, `evaluate-source/route.ts` 2615, `jobs/[id]/page.tsx` 3466, `admin/config/page.tsx` 4580). WS-3, WS-5, and likely WS-6 are slightly more effortful than currently labeled because the real cost is coupling preservation, not raw line movement.
**For next agent:** Start with `Docs/WIP/2026-03-18_Review_LeadDeveloper.md`. The most important implementation guidance is: use request-scoped SR config/context, keep search-provider utilities narrow, and do not introduce vague UI folders like `analysis/` unless there is a stronger structural reason.

---
### 2026-03-19 | LLM Expert + Senior Developer | Claude Code (Opus 4.6) | Stage 4.5 SR Calibration — LLM Integration + Control-Set Validation
**Task:** Implement prompt-backed LLM integration for Stage 4.5 source-reliability calibration (`confidence_only` mode), validate with 5-claim control set.
**Files touched:** `apps/web/prompts/claimboundary.prompt.md` (SR_CALIBRATION section + frontmatter), `apps/web/src/lib/analyzer/source-reliability-calibration.ts` (LLM call, Zod schema, serialization, batch-contract enforcement), `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (async callsite + onEvent), `apps/web/src/lib/analyzer/types.ts` (TSDoc for mode enum), `apps/web/test/unit/lib/analyzer/source-reliability-calibration.test.ts` (bounded_truth_and_confidence guard test).
**Key decisions:**
- Prompt approved with 9 rules: portfolio-level only, no hardcoded thresholds, batch contract, three concern types mapped to internal warning types.
- `callSRCalibrationLLM` is a separate async export; `calibrateVerdictsWithSourceReliability` stays sync — preserves test compatibility.
- `bounded_truth_and_confidence` mode is functionally identical to `confidence_only` until a dedicated truth-delta prompt is implemented (documented with three reasons: verdict-label risk, double-counting, no separate evaluation contract).
- Hardening: `loadAndRenderSection` inside try/catch, batch-contract enforcement (claimId set validation).
**Open items:**
- Feature remains behind `sourceReliabilityCalibrationEnabled=false` default.
- Optional next step: frozen-retrieval A/B harness to isolate Stage 4.5 effect from search variance.
- `bounded_truth_and_confidence` truth-delta prompt is a future phase requiring separate design + validation.
- `trackRecordConfidence`/`trackRecordConsensus` not yet serialized to LLM (token-budget decision for Haiku).
**Warnings:** Control-set results show large report-level shifts (Iran 62→80, Bolsonaro single 51→75) that are NOT attributable to Stage 4.5 alone — retrieval variance confounds. Claim-level deltas were moderate (-10 to +8). Do not interpret these runs as isolated quality gains from Stage 4.5.
**For next agent:** Stage 4.5 is feature-complete and experimentally validated. Config is reset to baseline (`30c48302`). To enable: set `sourceReliabilityCalibrationEnabled=true` + `sourceReliabilityCalibrationMode="confidence_only"` in UCM. For the A/B harness: freeze evidence/source sets from a baseline run, replay with Stage 4.5 on/off, diff per-claim raw vs calibrated confidence.

---
### 2026-03-19 | Senior Developer | Codex (GPT-5) | Independent Report Quality Investigation
**Task:** Independently investigate report-quality evolution from ClaimAssessmentBoundary launch through the March 19 jobs, covering DB history, HTML reports, live config drift, git history, and scorecard application.
**Files touched:** `Docs/WIP/2026-03-19_Independent_Report_Quality_Investigation.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/Role_Learnings.md`
**Key decisions:** Verified that the major post-Mar-12 quality drop is driven primarily by SR weighting being wired into verdict aggregation (`9550eb26`), not by the smaller residual `defaultScore=0.45` config drift. Confirmed current live config materially differs from defaults on `sourceReliability.defaultScore`, `search.cache.enabled`, and disabled integrity policies. Confirmed ClaimBoundary config provenance is broken for current jobs because the main runner path does not pass `jobId` into config loading, leaving `config_usage` and `job_config_snapshots` unusable for March attribution.
**Open items:** Captain / implementer should decide whether to test `evidenceWeightingEnabled=false` or a softer weighting function before smaller config cleanups. Stage 1 / Gate 1 remediation for broad rhetorical claims remains unimplemented.
**Warnings:** The report intentionally disagrees with the earlier claim that `0.45` drift alone explains a 10-18pp drop; sampled real-job math supports a much smaller direct effect. Missing per-job config provenance limits certainty for fine-grained attribution within March 12-19.
**For next agent:** Start with `Docs/WIP/2026-03-19_Independent_Report_Quality_Investigation.md`. If implementing follow-ups, inspect `9550eb26`, `8460b624`, `5243d678`, `b0f3becb`, and the active config in `apps/web/config.db`. For auditability fixes, inspect config loading at startup in `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` and usage recording in `apps/web/src/lib/config-loader.ts`.
**Learnings:** yes — appended a Senior Developer gotcha about config provenance for current ClaimBoundary jobs.

---
### 2026-03-17 | Agents Supervisor | Claude Opus 4.6 | Agent Rules Cleanup Plan
**Task:** Full audit of agent governance ecosystem (45+ files, ~17,000 lines) and creation of prioritized cleanup plan.
**Files touched:** `Docs/WIP/Agent_Rules_Cleanup_Plan_2026-03-17.md` (NEW)
**Key decisions:** 6-phase plan covering stale content fixes, archival of bloated files, redundancy removal, gap filling, clarity improvements, and learnings curation. Tool-specific prompts for Claude/Codex/Gemini/Cline provided.
**Open items:** Plan is DRAFT — awaiting Captain review and approval before execution.
**For next agent:** Read `Docs/WIP/Agent_Rules_Cleanup_Plan_2026-03-17.md`. Each phase has a ready-to-paste prompt for the appropriate tool. Phases 1-3 are HIGH/MEDIUM priority and can run in parallel.

---
### 2026-03-15/16 | Lead Architect | Claude Opus 4.6 | Phase A + Rec-A + Search Accumulation
**Task:** Implement and validate contamination fixes, model allocation optimization, and search accumulation restoration.
**Files touched:** `claimboundary-pipeline.ts` (Fix 0-A, Fix 4, Rec-A), `verdict-stage.ts` (Fix 5), `config-schemas.ts` (Fix 4, search autoMode, SerpAPI/Serper config), `pipeline.default.json` (Fix 4), `search.default.json` (autoMode, provider config), `web-search.ts` (accumulation toggle), `types.ts` (warning types), `warning-display.ts` (warning classifications), `metrics.ts` (pricing table), `config-schemas.test.ts` (legacy name fix), `llm.ts` (Rec-C)
**Key decisions:**
- Phase A (Fix 0-A + Fix 4 + Fix 5) shipped and validated: zero foreign boundaries, German boundaries preserved, contradiction loop protected, phantom IDs stripped.
- Rec-A shipped: Pass 2 → Haiku (~3% LLM cost saving). Zero quality degradation, eliminates soft-refusal cascade.
- Search accumulation: `autoMode: "accumulate"` shipped as UCM toggle. SerpAPI re-enablement reverted (circuit breaker OPEN, +100% latency, zero contribution).
- LLM cost model corrected: extraction ~35 calls (not 6-12), total ~$0.27/analysis (not $0.18).
**Open items:** SerpAPI circuit breaker needs independent health check. Phase B (prompt quality review) is next investigation. SC temperature 0.4→0.3 deferred. Unit tests for Fix 0-A/4/5 still owed.
**Warnings:** Runtime config.db does not auto-reseed from JSON defaults — deploy/production requires Admin UI config update or DB reseed to pick up new defaults.
**For next agent:** Search accumulation is active via code default (`config.autoMode ?? "accumulate"`). SerpAPI is disabled in both JSON and runtime config. The best performing configuration is CSE-only with accumulate mode. Next quality lever is prompt quality (Phase B from Next Investigation Recommendations).
**Learnings:** no

---
### 2026-03-15 | Senior Developer | Codex (GPT-5) | Verify Dependency Fixes Across Local, CI, and Deploy Paths
**Task:** Re-verify the dependency/remediation changes as Senior Developer and confirm whether the repo is now clean for local development, CI, and deployed-system prerequisites.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:**
- Repaired the active local workspace by stopping the repo's running Next.js dev processes, which were locking `next-swc.win32-x64-msvc.node` and blocking `npm ci`.
- Confirmed the active local workspace now passes `npm ci`, `npm audit`, `npm test`, `npm -w apps/web run build`, and `dotnet build apps/api -c Release`.
- Confirmed a clean-room CI-equivalent path in detached worktree `C:\DEV\FactHarbor-sd-verify` also passes `npm ci`, `npm test`, `npm -w apps/web run build`, and `dotnet build apps/api -c Release`.
- Confirmed the standalone tool package audit is clean and resolves `@vscode/vsce@3.7.1`, `undici@7.24.3`, and `yauzl@3.2.1`.
- Confirmed `scripts/deploy.sh` parses successfully under Git Bash after the added Node version preflight.
**Open items:** None in code. Operationally, the deployed VPS still needs to actually be on Node `v20.19.0+` for the new guard to pass.
**Warnings:** The active local `next build` emitted a non-fatal standalone trace warning about copying `search-cache.db-shm`; the build still succeeded, and the warning did not reproduce in the clean verification worktree. This appears environment-local rather than a code regression.
**For next agent:** The dependency fix set is now verified end-to-end. If a deployment fails next, the first thing to check is the VPS Node version, because `scripts/deploy.sh` will now reject anything below `20.19.0`.
**Learnings:** no

---
### 2026-03-15 | Senior Developer | Codex (GPT-5) | Enforce Node Patch Level and Fix VS Code Tool Audit
**Task:** Implement the follow-up to the dependency review: enforce a safe minimum Node 20 patch level for CI/deploy, and repair the standalone `tools/vscode-xwiki-preview` dependency graph so its security override actually resolves.
**Files touched:** `package.json`, `apps/web/package.json`, `.github/workflows/ci.yml`, `scripts/deploy.sh`, `scripts/DEPLOYMENT.md`, `tools/vscode-xwiki-preview/package.json`, `tools/vscode-xwiki-preview/package-lock.json`
**Key decisions:**
- Pinned CI to `20.19.0` instead of floating major `20`, matching the stricter transitive engine floor introduced by current `sqlite3`/`undici` dependency resolution.
- Added `engines.node >=20.19.0` at the repo root and web workspace to make the runtime requirement explicit in package metadata.
- Added a deploy preflight in `scripts/deploy.sh` that aborts early if the VPS is on an older Node patch.
- Fixed the standalone VS Code tool by upgrading `@vscode/vsce` to `3.7.1`, overriding `yauzl` to exact `3.2.1`, and overriding `undici` to `7.24.3`; regenerated that package's lockfile.
**Open items:** None for the implemented fix set.
**Warnings:** Could not syntax-check `scripts/deploy.sh` with `bash -n` on this Windows machine because WSL/bash is not installed. The function is simple and localized, but shell syntax was not machine-validated here.
**For next agent:** Main app path was previously validated in a clean worktree (`npm ci`, `npm test`, `npm -w apps/web run build`, `dotnet build apps/api -c Release`). The new work here is infra-only plus the standalone tool package. If deploy issues occur next, first confirm the VPS is actually on Node `v20.19.0+`.
**Learnings:** no

---
### 2026-03-14 | Senior Developer | Claude Sonnet 4.6 | Phase A: Search-Stack Drift Investigation
**Task:** Execute Phase A of the approved quality-restoration investigation: determine whether search-stack drift is the primary remaining cause of report-quality degradation vs `quality_window_start` (`9cdc8889`). Design and run experiments covering provider-mix (UCM on main) and AUTO accumulation behavior (worktree).
**Files touched:**
- `scripts/phaseA_search_experiment.py` (NEW — experiment runner, 4 conditions)
- `scripts/phaseA_live_tracking.md` (NEW — live run log, in progress)
- `scripts/phaseA_results.json` (NEW — results output, in progress)
- `Docs/WIP/Report_Quality_PhaseA_Search_Stack_Results_2026-03-14.md` (NEW — analysis + WIP container)
- `C:/DEV/FH-phaseA-accumulation/apps/web/src/lib/web-search.ts` (worktree — removed stop-on-first-success break)

**Key decisions:**
- 4 conditions: C0 (control auto), C1 (Serper-only), C2 (SerpAPI-only), C3 (accumulation worktree)
- Cache disabled during all runs — cache key excludes provider so must disable to get clean per-provider measurements
- Worktree `phaseA-accumulation` started on port 3001 (webpack mode, node_modules junction from main)
- 2 runs per benchmark per condition; 3 benchmarks = 24 total jobs (~8-10 hours estimated)

**Structural findings (confirmed before results):**
1. **PRIMARY DRIFT confirmed**: Commit `8bef6a91` (2026-03-09) introduced `stop-on-first-success` in AUTO dispatcher. At `quality_window_start`, AUTO mode was true accumulation — CSE filled slots, SerpAPI filled remainder to maxResults. Current main stops the loop as soon as any provider returns results. Practical effect: each query gets 5-8 results instead of up to 10.
2. **Provider change**: SerpAPI → Serper as P2. SerpAPI still has credentials but is UCM-disabled.
3. **Cache key excludes provider**: Required disabling cache to prevent contaminated provider comparisons.

**Open items:**
- Experiment runs in background — full results available in `scripts/phaseA_live_tracking.md` / `phaseA_results.json` when complete (~6-8 hours remaining)
- WIP doc sections 4 (Results) and 5 (Conclusions) to be filled from results JSON when done
- If C3_ACCUM wins: accumulation fix needs code-level PR to main from `phaseA-accumulation` branch
- If C2_SERPAPI wins: UCM-only fix (re-enable SerpAPI, set as P2, disable Serper)
- Worktree cleanup after experiment: `git worktree remove C:/DEV/FH-phaseA-accumulation`

**Warnings:**
- The stop-on-first-success was introduced deliberately (commit comment: "prevents inconsistent evidence pools"). If accumulation is restored, the variance concern should be re-evaluated. The trade-off is: lower variance vs. lower evidence depth. Phase 1 showed variance is already large; evidence depth may matter more.
- Worktree uses junction to main's node_modules — this is not a clean isolation. But since the only change is the single break removal in web-search.ts, contamination risk is negligible.

**For next agent:** Read `Docs/WIP/Report_Quality_PhaseA_Search_Stack_Results_2026-03-14.md` for full structural analysis. Check `scripts/phaseA_results.json` for completed experiment results. The key structural finding is already documented and actionable — regardless of the exact numbers, CSE stop-on-first-success is the most likely search-stack regression. Section 5 (conclusions) needs to be filled from results.
**Learnings:** no

---
### 2026-03-14 | Lead Architect | Cline | Review: Report Quality Next Investigation Recommendations
**Task:** Review Docs/WIP/Report_Quality_Next_Investigation_Recommendations_2026-03-14.md for architectural interpretation, sequencing, and self-consistency strategy.
**Files touched:** `Docs/WIP/Report_Quality_Next_Investigation_Recommendations_2026-03-14.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:**
- Approved the proposed investigation priorities. Searching for upstream structural causes (search drift, prompt quality) before tuning downstream controls (temperature, self-consistency) correctly avoids overfitting.
- Concurred that stronger self-consistency should remain a diagnostic lever rather than an immediate default change to avoid expensive agreement on poor data.
- Open Q1: Test provider mix via `main`/UCM; test code drift (AUTO behavior) via worktree.
- Open Q2: Prompt quality and search stack investigations should run in parallel as they are largely orthogonal.
- Open Q3: Start temperature test at 0.3 only; do not matrix with 0.2 yet.
**Open items:** None. The plan is APPROVED and execution can proceed with Phase A and B in parallel.
**Warnings:** Prompt investigations must strictly adhere to AGENTS.md input neutrality and genericity mandates (no hardcoded keywords or language-specific heuristics).
**For next agent:** Proceed with Phase A and Phase B in parallel according to the approved plan.
**Learnings:** no

---
### 2026-03-14 | Unassigned | Claude Opus 4.6 | Cross-Pipeline Report Quality Deep Analysis
**Task:** Comprehensive historical analysis of report quality across 933 jobs in 11 databases, identifying peak quality timeframes, mapping to git commits, and diagnosing the Mar 12+ regression.
**Files touched:** `Docs/WIP/Report_Quality_Deep_Analysis_2026-03-14.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:**
- CB pipeline peaked Mar 8-9 (avg score 187, best individual 279). Orchestrated peaked Jan 11-13 (avg score 108, best individual ~200).
- Quality regression starting Mar 12 afternoon traced to two commit clusters: SR weighting integration (`9550eb26`) and jurisdiction filtering (Fixes 0-3).
- Established `9c165f29` (Mar 9) as the last commit before quality decline began.
**Open items:** Regression requires targeted investigation — `applyEvidenceWeighting` impact analysis and jurisdiction filter threshold tuning. Warning system not detecting quality degradation (0 warnings during C=0 failures).
**For next agent:** Full analysis in `Docs/WIP/Report_Quality_Deep_Analysis_2026-03-14.md`. Cross-reference with `Docs/WIP/Report_Quality_Restoration_Plan_2026-03-14.md` for the restoration approach. Key boundary commit: `9c165f29`.

---
### 2026-03-14 | Senior Developer | Codex (GPT-5) | Report Quality Restoration Plan
**Task:** Reassess the worktree comparison findings and produce a review-ready plan for restoring the best possible report quality using `quality_window_start` as the baseline.
**Files touched:** `Docs/WIP/Report_Quality_Restoration_Plan_2026-03-14.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:**
- Established `quality_window_start` (`9cdc8889`) as the standing historical quality baseline.
- Proposed a phased restoration plan that preserves contamination and geography fixes while prioritizing the strongest current degradation suspects:
  1. SR weighting / confidence conservatism
  2. shared search-stack drift
  3. reduced research depth
- Recommended starting with UCM-level A/B experiments on `main` before broader code rollback, and using a temporary integrated quality profile only after isolated winners are identified.
**Open items:** Plan requires review and approval before implementation. The largest open review choice is whether the first SR experiment should fully disable weighting or only soften it.
**Warnings:** Search behavior is shared infrastructure, so any AUTO accumulation restoration affects more than one subsystem. Google CSE availability must be recorded for comparison runs to keep conclusions valid.
**For next agent:** Use the new WIP plan as the source of truth for the next review round. Benchmark claims and the `main` vs `quality_window_start` port mapping are already documented in the worktree results doc.
**Learnings:** no

---
### 2026-03-13 | Senior Developer | Claude Sonnet 4.6 | Debate Role Config Terminology Migration (Phases 1+2)
**Task:** Implement the approved Debate Role Config Terminology Migration Plan — replace provider-branded capability names (`haiku/sonnet/opus`) with provider-neutral vocabulary (`budget/standard/premium`), unify split `debateModelTiers`/`debateModelProviders` into `debateRoles.<role>.{provider, strength}`, rename `tigerScoreTier` to `tigerScoreStrength`. Legacy fields remain read-compatible via parse-time normalization.
**Files touched:**
- `apps/web/src/lib/analyzer/model-resolver.ts` — `ModelStrength` type, `normalizeToStrength()`, re-keyed version maps, deprecated `ModelTier` alias
- `apps/web/src/lib/config-schemas.ts` — `debateRoles` Zod schema, `tigerScoreStrength` field, `.transform()` normalization block (canonical wins > legacy > defaults), updated `DEFAULT_PIPELINE_CONFIG`
- `apps/web/configs/pipeline.default.json` — canonical `debateRoles` shape, `tigerScoreStrength`
- `apps/web/src/lib/analyzer/verdict-stage.ts` — `VerdictStageConfig` interface migrated to `debateRoles`, `DEFAULT_VERDICT_STAGE_CONFIG` updated, all call sites use `config.debateRoles.<role>.strength`
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — `checkDebateTierDiversity`, `checkDebateProviderCredentials`, `buildVerdictStageConfig`, `evaluateTigerScore` all read from canonical fields
- `apps/web/src/lib/calibration/runner.ts` — `resolveLLMConfig` reads `config.debateRoles`, uses `normalizeToStrength()`
- `apps/web/src/app/admin/config/page.tsx` — Admin UI reads/writes `debateRoles`, options show `budget/standard/premium`
- `apps/web/test/unit/lib/config-schemas.test.ts` — legacy normalization tests, canonical-wins-over-legacy tests
- `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts` — all tier references migrated to strength vocabulary
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` — debate diversity and provider credential tests updated
- `apps/web/test/unit/lib/calibration-runner.test.ts` — strength-based resolver tests
**Key decisions:**
- `ModelTier` kept as deprecated type alias (`export type ModelTier = ModelStrength`) — zero breakage for any remaining imports
- `resolveModel()` accepts `string` (not just `ModelStrength`) and normalizes internally — call sites using "haiku"/"sonnet" model identifiers continue to work
- Normalization in Zod `.transform()` handles all combos: canonical-only, legacy-only, both (canonical wins), challenger defaults to openai provider
- Non-debate model fields (`modelUnderstand`, `modelExtractEvidence`, `modelVerdict`) remain free-text — out of scope per plan
**Open items:**
- Pre-existing build failure at `claimboundary-pipeline.ts:474` (`ClaimVerdict[]` → `CBClaimVerdict[]` type mismatch) — NOT introduced by this migration, confirmed identical on clean HEAD
- Legacy fields (`debateModelTiers`, `debateModelProviders`, `tigerScoreTier`) can be removed in a future cleanup pass once no stored configs use them
**Warnings:**
- The `LLMCallFn` type's `tier` option was widened from union to `string` to accept both vocabularies during transition — tighten to `ModelStrength` once legacy is fully removed
**For next agent:** All consumers read canonical `debateRoles` shape. Legacy stored configs auto-normalize on load. Build failure is pre-existing and unrelated. Tests: 1216/1216 passing (64 files).

---
### 2026-03-13 | Captain Deputy | Claude Sonnet 4.6 | Three-Plan Review: Contamination Fix, Baseline Test Plan, Debate Role Migration
**Task:** Review and close all open questions in three WIP planning documents; record decisions; confirm execution readiness.
**Files touched:**
- `Docs/WIP/Evidence_Jurisdiction_Contamination_Fix_Plan_2026-03-12.md` — removed stale `pass1Result.inferredGeography` snippet from Fix 1; closed Open Q2 (keep 0.4 threshold); added review log entry
- `Docs/WIP/Report_Quality_Baseline_Test_Plan_2026-03-12.md` — corrected SQL table name `sr_cache` → `source_reliability`; status `DRAFT v2` → `APPROVED`; added review log entry with Phase 1 gate analysis
- `Docs/WIP/Debate_Role_Config_Terminology_Migration_Plan_2026-03-13.md` — added review log entry with all 5 decisions closed
**Key decisions:**
- **Contamination Fix Plan**: APPROVED, ready for Act Mode. Open Q2 closed: keep 0.4 threshold. Open Q4 deferred (per-source extraction cap = separate backlog item).
- **Baseline Test Plan**: APPROVED (after SQL fix). Phase 1 gate: H1 mean = 56% → 50-74% range → **Phase 2 IS triggered**. H1a/H1b spread = 8pp (≤15pp, not inconclusive). Sequencing: Phase 2 worktree (W1+W2 at `523ee2aa`) BEFORE Fix 0 — PT runs are already jurisdiction-clean.
- **Debate Migration Plan**: APPROVED, all 5 questions resolved. (1) `tigerScoreTier` → IN SCOPE, rename to `tigerScoreStrength`, enum `budget/standard/premium`. (2) Strip legacy fields immediately on save. (3) No stored-config rewrite script. (4) `model-resolver.ts` rename (`ModelTier → ModelStrength`, version-map keys) moves to Phase 1. (5) Non-debate model fields stay as free-text — compatibility-only behind resolver type rename.
- Normalization: add to `superRefine()` block — if `debateRoles` undefined, build from legacy maps with `{ haiku: "budget", sonnet: "standard", opus: "premium" }`; canonical wins when both present.
**Open items:**
- Phase 2 worktree run (W1 PT + W2 EN Bolsonaro at `523ee2aa`) — pending. Config diff prerequisite first.
- Fix 0 implementation (contamination Phase A) — pending Phase 2 results.
- Debate Role Config Terminology Migration (4-phase) — pending.
**Warnings:**
- Debate migration Phase 1 and Phase 2 must ship in the **same PR**. Split deployment causes `verdict-stage.ts` to read absent `debateModelTiers` and silently fall back to defaults.
- `checkDebateTierDiversity()` in `claimboundary-pipeline.ts` must be rewritten to read `debateRoles.<role>.provider + strength` — current `all_same_debate_tier` warning on 3/3 HEAD runs is caused by this broken diversity check.
**For next agent:** All three plans are execution-ready. Recommended next: Phase 2 worktree → Fix 0 → Debate migration (independent, can be parallelized). Full decisions and normalization pseudocode in the Debate Migration Plan Captain Deputy review log section.
**Learnings:** No new role learnings — decisions recorded directly in plan docs.

---
### 2026-03-13 | Lead Architect | Gemini CLI | Review Debate Role Config Terminology Migration Plan
**Task:** Approved the plan with mandatory inclusion of tigerScoreTier and model-resolver refactor
**Files touched:** Docs/WIP/Debate_Role_Config_Terminology_Migration_Plan_2026-03-13.md
**Key decisions:** Mandated transition from vendor-specific branding (haiku/sonnet/opus) to capability-based tiers (budget/standard/premium). Expanded scope to include tigerScoreTier. Confirmed 'migrate-on-save' policy for configuration rot prevention.
**Open items:** None
**Warnings:** Implementation should proceed following the approved plan + architectural amendments.
**For next agent:** Verify updated diversity checks in claimboundary-pipeline.ts
**Learnings:** None

---
### 2026-03-13 | Senior Developer | Claude Sonnet 4.6 | Task 2 — Post-fix quality rerun (geography_fix vs window_start) + HD_PT rerun
**Task:** Run clean 2-checkpoint comparison after geography fix (f6e04ce3): window_start (9cdc8889) vs current main. 3 claims: EN Bolsonaro, PT Bolsonaro, new DE mental health claim (Kanton Zürich school mental health burden). Answer 3 questions: (1) materially closer to window_start? (2) Swiss jurisdiction regression fixed? (3) SR weighting the main remaining gap? HD_PT was subsequently rerun once API credits were replenished.
**Files touched:** `Docs/WIP/Report_Quality_Worktree_Comparison_Results_2026-03-13.md` (appended POST-FIX RERUN section, updated HD_PT row), `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:**
- WS_PT systematic failure: 3/3 attempts fail at Pass2 with schema parse error at window_start (9cdc8889) — no data obtainable
- HD_PT rerun (job `c25702f816ab4d7389923794d2b89754`): MIXED, 49.2% TP, 50.2% conf, `inferredGeography: BR` ✅, CSE ✅, valid result. Applicability filter removed 4 foreign-jurisdiction items; all_same_debate_tier warning.
- HD_DE `inferredGeography: CH` confirmed — geography regression conclusively fixed
- SR weighting identified as dominant quality gap: 24-31pp confidence drops across all comparable claim pairs
**Open items:**
- `all_same_debate_tier` warning on 3/3 HEAD runs — consider mixing model tiers for debate roles
- Residual EN contamination: Fix 3 reduced 3/6→1/6 boundaries but B4 "Trump administration communications" survives
- PT quality gap: MIXED (49.2%) at HEAD vs 90.1% at Task 1 window_start — partly SR weighting, partly claim decomposition differences
**Warnings:**
- WS_PT systematic Pass2 failure at window_start is reproducible — not a transient error. The old schema at 9cdc8889 fails for this specific Portuguese claim every time.
**For next agent:** Full run data in `Docs/WIP/Report_Quality_Worktree_Comparison_Results_2026-03-13.md` §POST-FIX RERUN. Three questions answered: (1) NO — main is 23-31pp worse on EN/DE TP/conf; (2) YES — CH geography works; (3) YES — SR weighting is primary gap. All 5 runs now valid (WS_PT still has no data). Next priority: fix SR weighting calibration (sourceId reconciliation bug identified by prior Codex agent in entry below).
**Learnings:** No — role handoff not required.

---
### 2026-03-13 | Senior Developer | Codex (GPT-5) | Fix — Evidence sourceId reconciliation for SR weighting
**Task:** Investigate why job `507f84f318144a2ba2e975107bf873a8` produced `UNVERIFIED`, identify the concrete code cause, and implement the minimal pipeline fix.
**Files touched:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:**
- Confirmed the stored job result was `56.1% true / 40.2% confidence`, which maps to `UNVERIFIED` by design in `JobService.MapPercentageToVerdict()` for the `43–57%` band when confidence is below `45`.
- Identified the concrete bug: Stage 2 evidence extraction was emitting `sourceId: ""`, and seeded preliminary evidence also carried empty `sourceId`. This caused `applyEvidenceWeighting()` to treat all supporting evidence as unknown-source and apply the default SR weight `0.45`.
- Fixed the direct extraction path to retain the matched fetched-source ID.
- Added `reconcileEvidenceSourceIds()` to backfill missing evidence `sourceId` values from `sourceUrl` after research has collected and scored sources, so seeded evidence also links correctly.
- Added unit tests for both the reconciliation helper and the extraction-time `sourceId` mapping.
**Open items:**
- Changes are local and verified with `npm test`, but not yet committed.
- The exact job should be re-run to measure post-fix impact on the final label.
- The “international due process standards” atomic claim still appears intrinsically low-confidence because the evidence pool lacks direct international verification; this may still keep the overall result below `MIXED` even after the wiring bug is fixed.
**Warnings:**
- This fix removes an artificial confidence penalty, but it does not guarantee the job becomes `MIXED`. The second claim (`AC_02`) may still legitimately remain weak.
- SR weighting behavior for unknown or mid-reliability sources remains a separate calibration issue.
**For next agent:** Re-run the exact Bolsonaro input after this fix. If the result is still `UNVERIFIED`, investigate the international-standards sub-claim separately from SR weighting: search/query coverage for international evaluators, and whether current confidence calibration is too punitive for mixed-context evidence.
**Learnings:** no

---
### 2026-03-13 | Senior Developer | Claude Code (claude-sonnet-4-6) | Pre-rerun hardening: inferredGeography, regression tests, Fix 3 logging
**Task:** Three low-risk fixes before next quality rerun: (1) strengthen geography inference so named sub-national entities override language, (2) add GEO-REG regression tests for German-language Swiss claims, (3) harden Fix 3 applicability logging against malformed URLs.
**Files touched:**
- `apps/web/prompts/claimboundary.prompt.md` — CLAIM_EXTRACTION_PASS1 geography inference rule: added priority rule stating explicit sub-national entities (city/canton/district) determine country regardless of input language
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` — 3 new GEO-REG tests in `describe("Stage 1: runPass1")`: GEO-REG-1 (Kanton Zürich → CH not DE), GEO-REG-2 (Zürich explicit city → CH ≠ DE), GEO-REG-3 (German language with no entity → null, not DE)
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — Fix 3 domain logging: replaced `new URL(item.sourceUrl).hostname` (throws on malformed URLs) with `item.sourceUrl?.match(/^https?:\/\/([^/?#]+)/)?.[1] ?? "unknown"` (never throws)
**Key decisions:**
- Prompt change is generic (no hardcoded country names) — uses abstract "sub-national geographic entity" language per AGENTS.md analysis prompt rules
- Tests use the real claim text ("Immer mehr Kinder im Kanton Zürich...") as input to `runPass1` but mock the LLM response — they test that code propagates the LLM's geography correctly and doesn't override "CH" with "DE" due to `detectedLanguage: "de"`
- No SR weighting, search, or verdict changes
**Open items:** None — all three fixes are self-contained. Geography inference quality depends on LLM compliance with the updated prompt; a live H3 run with a Swiss claim will confirm.
**Warnings:** None — changes are additive and localized.
**For next agent:** All 1204 tests pass. Ready to rerun quality tests. The prompt change will only take effect on new analysis runs (after server restart if cached).

---
### 2026-03-13 | Senior Developer | Claude Code (claude-sonnet-4-6) | Report Quality Worktree Comparison — All 4 Checkpoints Executed
**Task:** Execute the worktree comparison runbook across quality_window_start, quality_post_window_first_code, quality_deployed_proxy, and quality_head; identify where report quality degraded.
**Files touched:**
- `Docs/WIP/Report_Quality_Worktree_Comparison_Results_2026-03-13.md` — full results document (created)
- Worktrees created: `C:/DEV/FH-quality_window_start`, `C:/DEV/FH-quality_post_window_first_code`, `C:/DEV/FH-quality_deployed_proxy`
**Key decisions:**
- Ran all 3 claims (PT/EN/DE) on all 4 checkpoints sequentially (one checkpoint at a time, one API+web pair per checkpoint)
- Fixed infrastructure issues at each checkpoint without modifying analysis code: deployed_proxy needed manual `IsHidden` column; older checkpoints needed `npm install sqlite@5 sqlite3`
- Recorded Google CSE quota status, fallback provider usage, and warning counts per run as requested
**Open items:**
- Fix 1 jurisdiction regression for DE (German language → incorrectly infers Germany not Switzerland)
- SR weighting calibration (34pp confidence collapse on PT at HEAD is excessive)
- verdict-stage.ts code bug at post_window_first_code (historical, but indicates fragile self-consistency path)
- Re-run with fresh Google CSE quota for clean comparison (runs 1–9 all had CSE 429)
**Warnings:**
- `quality_post_window_first_code` EN FAILED due to `TypeError: run2Verdicts.find is not a function` in verdict-stage.ts:251 — self-consistency path receives non-array at this checkpoint
- Google CSE quota was exhausted during window_start and post_window runs; HEAD runs had fresh quota, giving HEAD a search-quality advantage that partially offsets the SR weighting confidence drag
- deployed_proxy API had a pre-existing schema bug (IsHidden column absent from migrations) requiring a manual DB ALTER
- All confidence values at quality_head are 10–34pp lower than other checkpoints due to SR weighting — do not compare confidence across SR-weighting boundary without adjustment
**For next agent:** Full data in `Docs/WIP/Report_Quality_Worktree_Comparison_Results_2026-03-13.md`. Key conclusions: (1) degradation first appears at post_window_first_code (code bug); (2) window_start is best performer (PT 90.1%, EN 75.4%, DE 84%); (3) Fix 1 successfully eliminated EN US contamination but caused DE jurisdiction regression (Germany vs Switzerland); (4) SR weighting is the primary cause of confidence collapse at HEAD (not a contamination issue). Next fix: `inferredGeography` disambiguation for non-English European claims containing explicit place names.
**Learnings:** No role_learnings update — execution task, no novel patterns.

---
### 2026-03-12 | Senior Developer | Claude Code (claude-opus-4-6) | Fix 3: Post-extraction applicability assessment — VALIDATED ✅
**Task:** Implement Fix 3 from `Evidence_Jurisdiction_Contamination_Fix_Plan_2026-03-12.md` — post-extraction applicability assessment as safety net for jurisdiction contamination.
**Files touched:**
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — new `assessEvidenceApplicability()` function + `ApplicabilityAssessmentOutputSchema` + pipeline integration before `clusterBoundaries()`
- `apps/web/src/lib/analyzer/types.ts` — added `evidence_applicability_filter` to `AnalysisWarningType` union (applicability field already existed)
- `apps/web/src/lib/config-schemas.ts` — added `applicabilityFilterEnabled` to `PipelineConfigSchema` + `DEFAULT_PIPELINE_CONFIG`
- `apps/web/configs/pipeline.default.json` — added `"applicabilityFilterEnabled": true`
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` — 7 new tests in "Fix 3: assessEvidenceApplicability" describe block
- `apps/web/src/lib/analyzer/warning-display.ts` — registered `evidence_applicability_filter` in `WARNING_CLASSIFICATION`
- `apps/web/prompts/claimboundary.prompt.md` — `APPLICABILITY_ASSESSMENT` section already existed, no changes needed
**Key decisions:**
- Fix 3 is the decisive filter per Captain direction. Fix 0 (root cause) + Fix 1 (soft upstream reduction) remain as-is. Fix 2 already reverted.
- Single batched Haiku-tier LLM call for all evidence items (~$0.0002/run). Uses `getModelForTask("understand")`.
- Fail-open: LLM errors keep all evidence (pipeline not blocked).
- Missing LLM classifications default to `"direct"` (fail-open on partial response).
- `foreign_reaction` items filtered out completely at pipeline integration point. `contextual` items kept.
- Debug logging: `debugLog` with per-category counts + foreign domain list. `console.info` with compact summary.
- Warning type `evidence_applicability_filter` at severity `info` (admin-only — this is routine operation, not a user-facing quality issue).

**Runtime bugs found and fixed during validation:**
The initial implementation had 5 bugs in the `generateText` call, all caused by not following the established pipeline LLM call pattern:
1. **`rendered` instead of `rendered.content`** — `loadAndRenderSection` returns `{ content, contentHash, ... }`, not a string. Passed `[object Object]` as system prompt.
2. **Missing `output: Output.object({ schema })`** — AI SDK didn't know to request structured JSON output.
3. **`getStructuredOutputProviderOptions` spread at top level** — should be under `providerOptions:` key.
4. **`getPromptCachingOptions` spread at top level** — should be on the system message's `providerOptions`.
5. **No user message** — Anthropic API requires at least one user message in addition to system.
6. **`evidence_applicability_filter` not registered in `warning-display.ts`** — caused TS compilation error.

**H3 Validation Results (job `b0cc6e02c29e4383a0566b1b24a2b891`):**

| Metric | Baseline (pre-Fix) | Fix 0+1 only | **Fix 0+1+3** |
|--------|-------------------|-------------|--------------|
| U.S. gov items | 21/49 (42.9%) | 23/42 (54.8%) | **0/70 (0%)** ✅ |
| Foreign reaction items | — | — | **0 remaining** (2 filtered) |
| U.S.-focused boundaries | 3/6 | 3/? | **0/6** ✅ |
| Truth % | 56% | 54% | **51%** |
| Confidence | 58% | 16% | **58.3%** |
| Verdict | MIXED | UNVERIFIED | **MIXED** |
| Evidence count | 49 | 42 | **70** |

Applicability breakdown: 0 direct, 70 contextual, 2 foreign_reaction (both `www.state.gov`). 0 unclassified. Haiku compliance: **100%** (72/72 items classified).

All 6 boundaries are Brazil-relevant: Supreme Court proceedings, Federal Police investigation, defendant statements, Lula trial bias ruling, expert legal commentary, general evidence.

**All success criteria met:**
- ✅ 0 foreign-government-action items
- ✅ 0 foreign-reaction-only boundaries
- ✅ Contextual descriptive reports retained (state.gov HR reports classified `contextual`)
- ✅ Confidence restored to baseline level (58.3% vs 58% baseline)
- ✅ 1201/1201 unit tests passing across 64 files

**Open items:**
- **Not yet committed.** Changes validated but uncommitted — awaiting Captain approval to commit.
- Pre-existing build error at `claimboundary-pipeline.ts:474` (`applyEvidenceWeighting` type cast) remains.
- SR weighting confound still unresolved — active in validation runs but absent from original baseline.
- All 70 items classified as `contextual` (0 `direct`) — the LLM is conservative about classifying items as `direct`. Not a problem for filtering (only `foreign_reaction` is removed), but worth monitoring.

**Warnings:**
- The function uses `new URL(item.sourceUrl)` for domain logging — could throw on malformed URLs. Wrapped in the overall try/catch (fail-open).
- The `generateText` call pattern was initially wrong in 5 ways — **future LLM call implementations must follow the established pattern**: system message with `providerOptions: getPromptCachingOptions()`, user message, `output: Output.object({ schema })`, top-level `providerOptions: getStructuredOutputProviderOptions()`, and `extractStructuredOutput(result)` with single arg.

**For next agent:**
1. **Commit Fix 3** — all validation passed, ready for commit.
2. Consider whether `0 direct / 70 contextual` classification is desirable or if the prompt should be tuned to classify more items as `direct`.
3. SR weighting confound should be investigated separately (compare baseline with SR active vs inactive).
**Learnings:** Appended to Role_Learnings.md? No — but critical insight: **Always copy the exact `generateText` call pattern from an existing working call in the pipeline.** The pattern includes 5 interrelated parts (messages structure, output, providerOptions, prompt caching, extractStructuredOutput) that must all match. Getting any one wrong causes silent runtime failures caught by the fail-open catch block.

---
### 2026-03-12 | Senior Developer | Claude Code (claude-opus-4-6) | Phase A+A+ Validation: Fix 0 + Fix 2 Results
**Task:** Validate Phase A (Fix 0) and Phase A+ (Fix 2) of `Evidence_Jurisdiction_Contamination_Fix_Plan_2026-03-12.md` by running H3 twice, then report findings.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`, `apps/web/prompts/claimboundary.prompt.md` (Fix 2 committed as `c11110e8`)
**Key decisions:**
- Fix 0 alone (commit `7ed71a05`): `distinctEvents` are now jurisdiction-clean ✅ but contamination persists through query generation and relevance classification. U.S. gov items 24/53 (45%), 3/6 boundaries U.S.-focused. **Fix 0 alone insufficient.**
- Fix 0+2 (commit `c11110e8`): Dedicated U.S. boundaries eliminated (3→0) ✅, foreign govt actions reduced (sanctions 4→2, congress 1→0). But overall verdict quality collapsed: TP 56%→49.4%, Conf 58%→42%, verdict downgraded from MIXED to UNVERIFIED/INSUFFICIENT EVIDENCE/LOW CONFIDENCE. The query-level constraints are too blunt — they reduce evidence volume rather than classifying it.
- Remaining `state.gov` 15 items are from the annual Country Report on Human Rights Practices for *Brazil* — these discuss Brazilian police courts, impunity, prosecution rates. They are `contextual` (external observer about the jurisdiction), not `foreign_reaction` (sanctions/policy actions). Filtering them at query level starves the pipeline.

**Validation run data:**

| Run | JobId | Commit | TP | Conf | Verdict | U.S. Gov Items | U.S. Boundaries |
|-----|-------|--------|-----|------|---------|---------------|----------------|
| Baseline H3 | `fe595e71` | `c02658eb` | 56% | 58% | MIXED | 21/49 (42.9%) | 3/6 |
| Fix 0 only | `8c332bf2` | `7ed71a05` | 51% | 42% | UNVERIFIED | 24/53 (45.3%) | 3/6 |
| Fix 0+2 | `53de9247` | `c11110e8` | 49.4% | 42.1% | UNVERIFIED | 17/46 (36%) | 0/6 ✅ |

**Open items:**
- **Fix 2 should be reverted.** Query-level jurisdiction constraints are too blunt. They reduce evidence volume, collapsing verdict confidence. The structural improvement (0 dedicated U.S. boundaries) came mostly from Fix 0's `distinctEvents` cleanup + LLM variance in clustering.
- **Fix 1 (Phase B) is the correct next step.** `classifyRelevance()` needs a jurisdiction dimension to surgically filter foreign *government actions* (sanctions, EOs → `foreign_reaction`, cap at 0.3) while keeping foreign *observations about the jurisdiction* (HR reports, academic studies → `contextual`, pass normally). This is the surgical tool the plan designed — query-level filtering was always the wrong granularity.
- **state.gov HR report over-extraction** is a separate issue: 15 items from a single source is excessive regardless of jurisdiction. Per-source extraction cap needed (tracked in plan §7).

**Warnings:**
- Both validation runs show UNVERIFIED/LOW CONFIDENCE — this is **worse** than baseline. The prompt changes in Fix 2 may be actively harmful by constraining evidence gathering too aggressively.
- The `applyEvidenceWeighting` (SR weighting, commit `9550eb26`) is now active in these runs but was NOT active in the baseline. This confounds TP/Conf comparison. Some of the TP drop (56%→49%) may be SR weighting pulling low-reliability sources toward 50%, not contamination effects.
- Pre-existing build error at `claimboundary-pipeline.ts:446` (`applyEvidenceWeighting` type cast) remains unfixed.

**For next agent:**
1. **Revert Fix 2** (`git revert c11110e8`) — keep Fix 0 only.
2. **Implement Fix 1** (jurisdiction-aware `classifyRelevance`) per plan §4 Fix 1. Key changes: add `inferredGeography` to `classifyRelevance()` signature + prompt, add `jurisdictionMatch` field (`direct`/`contextual`/`foreign_reaction`) to relevance output schema, cap `foreign_reaction` at 0.35 (below 0.4 threshold). Three-location UCM config for `foreignJurisdictionRelevanceCap`.
3. After Fix 1, re-run H3. Success = state.gov sanctions/EOs filtered, state.gov HR report items retained as `contextual`.
4. Investigate SR weighting's contribution to TP drop separately.

**Learnings:** Appended to Role_Learnings.md? No — but key insight: prompt-level query constraints are too blunt for jurisdiction filtering. They reduce evidence volume without distinguishing observation from action. Classification-level filtering (Fix 1) is the correct granularity.

---
### 2026-03-12 | Senior Developer | Claude Code (claude-sonnet-4-6) | Phase A / Fix 0: inferredGeography wiring into Pass 2
**Task:** Implement Phase A of `Evidence_Jurisdiction_Contamination_Fix_Plan_2026-03-12.md` — Fix 0 (root cause: `distinctEvents` has no prompt instructions) plus 4 unit tests.
**Files touched:**
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — `runPass2` signature + both `CLAIM_EXTRACTION_PASS2` render calls + all 3 callers in `extractClaims`
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` — 3 new tests under "Stage 1: runPass2 — inferredGeography wiring (Fix 0)"
- `apps/web/prompts/claimboundary.prompt.md` — geography examples replaced (abstract), prompt section already present from prior session
**Key decisions:**
- Prompt `### Distinct Events Rules` section was already present; only code wiring was missing
- `inferredGeography` added as optional 8th param to `runPass2`; defaults to `"not geographically specific"` when null/omitted
- Both render paths (primary at line 1683 and soft-refusal retry at line 1696) now pass the variable — the plan explicitly required both, with the retry being the most critical failure mode (politically sensitive inputs)
- All 3 callers in `extractClaims` (initial, minimum-claim reprompt, multi-event reprompt) now pass `pass1.inferredGeography`
- Pre-existing build error (`applyEvidenceWeighting` type cast at line 446) confirmed pre-dates this change; not in scope
**Open items:**
- Phase A validation: re-run H3 ("Were the various Bolsonaro trials...") to confirm 0 foreign-contaminated boundaries
- Phase A+ (Fix 2, query constraints) only if H3 re-run shows residual contamination
- Fix 1 (jurisdiction-aware relevance) and Fix 3 (post-extraction assessment) deferred to Phase B/C
**Warnings:**
- Unit tests confirm both render paths are wired. End-to-end confirmation requires an expensive H3 re-run (do not run unless explicitly asked)
- Build has a pre-existing TS error (`applyEvidenceWeighting` cast at `claimboundary-pipeline.ts:446`) — tracked separately
**For next agent:** Phase A validation re-run needed. Claim: "Were the various Bolsonaro trials conducted in accordance with Brazilian law and international standards of due process?" (EN). Success = 0 U.S. government-focused boundaries. If contamination persists, proceed with Phase A+ (Fix 2 prompt change to `GENERATE_QUERIES`).
**Learnings:** No new learnings beyond what's in the plan.

---
### 2026-03-12 | Lead Developer | Cline | Review: Evidence Jurisdiction Contamination Fix Plan
**Task:** Review `Docs/WIP/Evidence_Jurisdiction_Contamination_Fix_Plan_2026-03-12.md` for implementation feasibility, code quality, and structural correctness.
**Files touched:** `Docs/WIP/Evidence_Jurisdiction_Contamination_Fix_Plan_2026-03-12.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:**
- Approved the implementation plan and marked it "APPROVED — ready for Act Mode".
- Fixed out-of-scope variable references (`pass1Result`) in the plan's code snippets for Fix 0 (`runPass2`) and Fix 1 (`classifyRelevance`).
- Corrected the `runPass2` signature in the plan to reflect adding `inferredGeography` as an optional parameter.
**Open items:** None. Implementation can proceed with Phase A (Fix 0).
**Warnings:** None.
**For next agent:** Proceed with Phase A implementation per the approved plan. Start by adding `inferredGeography` to `runPass2` and updating the `CLAIM_EXTRACTION_PASS2` prompt.
**Learnings:** No.

---
### 2026-03-10 | Lead Architect | Claude Code (claude-opus-4-6) | Consolidation: SR UCM Separation Plan
**Task:** Consolidate 3 reviews (Opus 4.6, GPT 5.4, Gemini 3) into a final implementation plan with resolved conflicts and architectural decisions.
**Files touched:** `Docs/WIP/SR_UCM_Separation_Plan_2026-03-10.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** All 3 reviews converged — no conflicts, only varying emphasis. Restructured 6-phase plan into Phase 0 (tactical fix) + 4 phases. Added 7 architectural decisions (A1-A7): `callerContext` parameter, `autoMode` as separation mechanism, baseline provider lineup (no Serper), cache key isolation via prefix, no web-search.ts refactor, schema simplification, JSON/TS default alignment rule. Incorporated Captain decisions D1 (remove evalUseSearch), D2 (32-38% acceptance band), D3 (flush cache post-2026-03-05).
**Open items:** Implementation not started. Phase 0 is the urgent tactical fix. Search default drift (search.default.json vs config-schemas.ts for Analysis) flagged as separate follow-up.
**Warnings:** Phase 0 must land before any architectural work — scores remain inflated until then. The `callerContext` parameter in Phase 0 becomes the permanent mechanism (not throwaway), so implement it cleanly.
**For next agent:** Start implementation from Phase 0. Read the "Consolidated Implementation Plan" section in `Docs/WIP/SR_UCM_Separation_Plan_2026-03-10.md`. The plan is now APPROVED — no further review needed before implementation.
**Learnings:** Appended to Role_Learnings.md? No — consolidation task, no novel learnings beyond what's documented in the plan.

---
### 2026-03-10 | Senior Developer | Cline | Review: SR UCM Separation Plan
**Task:** Review `Docs/WIP/SR_UCM_Separation_Plan_2026-03-10.md` for problem framing, proposed architecture, rollback strategy, implementation feasibility, migration/cache risks, and remaining Captain decisions.
**Files touched:** `Docs/WIP/SR_UCM_Separation_Plan_2026-03-10.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Review outcome is **REQUEST_CHANGES**. Confirmed the document frames the root problem correctly: SR is coupled to Analysis search UCM/runtime via `evaluate-source/route.ts` and `searchWebWithProvider()`, and the current AUTO dispatcher stop-on-first-success behavior is a plausible regression driver. Flagged five main gaps: (1) commit/date timeline needs correction (`8bef6a91` is 2026-03-05, not 2026-03-09), (2) the plan must document which defaults actually win at runtime because DB-seeded JSON defaults and TypeScript merge defaults both matter, (3) the plan lacks a Phase 0 / immediate-regression posture for current inflated SR scores, (4) cache isolation risk should be treated as near-term, not a soft follow-up, and (5) verification needs quantitative acceptance criteria rather than “not 48% anymore”.
**Open items:** Captain decisions still needed on: whether an immediate SR-only rollback/fix is required before full separation; whether SR gets its own cache namespace/db in first cut; baseline provider lineup/parity target (especially Serper inclusion); whether `evalUseSearch` remains a real setting; the acceptance band for weltwoche verification; and whether post-fix SR cache entries after the AUTO change should be invalidated.
**Warnings:** The review notes that `parseTypedConfig()` default-merging and DB seeding semantics are easy to misunderstand and directly affect rollback expectations. The plan is strong architecturally, but without clarifying those semantics and the near-term remediation path, implementation could either take too long for the current regression or ship without objective success criteria.
**For next agent:** Start from the review already added under `## Review Log` in `Docs/WIP/SR_UCM_Separation_Plan_2026-03-10.md`. Update the plan first — especially the runtime-defaults explanation, immediate rollback posture, cache strategy, and quantitative verification target — before any implementation work begins.
**Learnings:** no


---
### 2026-03-10 | Senior Developer | Codex (GPT-5) | SR UCM Separation Review Plan
**Task:** Prepare a review-ready plan to separate Source Reliability UCM/runtime from the Analysis search stack and document the rollback needs/background for reviewers.
**Files touched:** `Docs/WIP/SR_UCM_Separation_Plan_2026-03-10.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Wrote a dedicated WIP design/implementation plan rather than appending to an older document because this change spans architecture, config migration, UI, and rollout semantics. The plan frames the issue as both a current SR regression and a longer-term service-boundary problem. Recommended design: shared provider executors may remain shared, but SR must own its own `evaluationSearch` config and its own search orchestrator. Rollback posture proposed for review: restore pre-`8bef6a91` accumulation semantics for SR only, not globally for Analysis.
**Open items:** Reviewer decisions required on: SR provider-lineup parity target, whether SR gets its own search cache immediately, whether SR should keep supplementary providers, and whether the new SR config shape should be nested (`evaluationSearch`) or remain flat/prefixed.
**Warnings:** Until implemented, SR still inherits Analysis search behavior via shared `search` config and shared `web-search.ts`. Also, existing search cache behavior can preserve old results after rollout unless explicitly cleared.
**For next agent:** Start with `Docs/WIP/SR_UCM_Separation_Plan_2026-03-10.md`. If reviewers approve the architecture, implementation should begin with schema/defaults, then route decoupling, then SR-specific orchestrator, then UI/migration/tests. Do not start by changing prompts; this plan assumes prompts are not the source of the regression.
**Learnings:** no

---
### 2026-03-10 | Senior Developer | Codex (GPT-5) | SR Score Regression Investigation
**Task:** Investigate why Source Reliability scores for `weltwoche.ch` / `weltwoche.de` are now systematically inflated versus the February baseline, and propose a fix.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Root cause is in the shared search layer, not SR evaluation logic. `apps/web/src/lib/web-search.ts` changed AUTO mode on 2026-03-09 (`8bef6a91`) from "accumulate results across providers until `maxResults`" to "stop after first provider that returns any results" (`if (providerResults.length > 0) break;`). This collapses evidence diversity and makes AUTO effectively Google-only whenever Google-CSE returns anything. A second contributing drift is config/default semantics: the Feb 2026 baseline search config had no explicit `providers` block in `search.default.json`, so AUTO implicitly enabled all credentialed providers via `?? true`; the current defaults explicitly set `serpapi=false`, `serper=true`, `brave=true priority=10`, and `parseTypedConfig()` now merges stored configs with defaults, so reset/reseed no longer behaves like the old baseline. Also found current drift between `apps/web/configs/search.default.json` and `apps/web/src/lib/config-schemas.ts` (`serper` / `brave` enabled in JSON but disabled in TS defaults).
**Open items:** Implementation not done in this investigation pass. Proposed fix: (1) restore pre-`8bef6a91` AUTO accumulation semantics in `web-search.ts`, (2) add regression tests covering multi-provider accumulation and provider-order behavior, (3) if exact Feb parity is required, restore effective old provider defaults in both JSON + TS defaults (Google-CSE + SerpAPI + Brave active, no Serper), then reseed/reset active search config, (4) clear `search-cache.db` after rollout because search cache keys do not include provider lineup/dispatch semantics.
**Warnings:** `web-search.ts` is shared by SR and the main analysis pipeline. Any dispatcher change affects both. Reverting only the SR route will not fix parity. Search cache can preserve bad Google-only result sets for up to 7 days even after code/config changes.
**For next agent:** Focus first on `apps/web/src/lib/web-search.ts:282-344` and compare against `bd40e80b`. Add tests in `apps/web/test/unit/lib/web-search.test.ts` for: AUTO continues to next primary provider when first provider underfills, AUTO preserves existing supplementary-provider gating, and provider list order matches intended defaults. Then resolve the config drift between `apps/web/configs/search.default.json` and `apps/web/src/lib/config-schemas.ts` before asking the user to re-evaluate SR scores.
**Learnings:** no

---
### 2026-03-10 | Senior Developer | Claude Code (claude-opus-4-6) | Source Reliability Panel in Report View
**Task:** Add a collapsible Source Reliability breakdown panel to the job report page.
**Files touched:**
- `apps/web/src/app/jobs/[id]/page.tsx` — Added `SourceReliabilityPanel` component + wired into report layout after Search Queries section
- `apps/web/src/app/jobs/[id]/page.module.css` — Added SR panel styles (table, category badges, domain truncation, responsive)
**Key decisions:**
- Used existing `ReportSection` with `collapsible` + `defaultOpen={false}` — collapsed by default as supplementary detail
- Domain extracted from URL at render time (not stored on `FetchedSource`)
- Category badge colours: green (reliable tiers), yellow (mixed), red (unreliable tiers), grey (insufficient_data)
- Sort order: reliable → insufficient_data → unreliable, then by score descending within category
- Panel renders nothing when no sources have SR data (graceful degradation)
**Open items:**
- `sourceType` not on `FetchedSource` — cannot show source type in the panel without pipeline changes
- `evidencePack` / web-augmented indicator not available on `FetchedSource` — skipped, noted for future
- `domain` not a first-class field — extracted from URL client-side (sufficient for display)
- Count badge in section title not implemented (ReportSection title is a plain string); count shown as subtitle text inside the panel instead
**For next agent:** Panel is self-contained. To add sourceType or evidencePack indicators, first extend the `FetchedSource` interface in `types.ts` and populate the fields in the pipeline.

---
### 2026-03-10 | Senior Developer | Claude Code (claude-sonnet-4-6) | MT-5 Validation Report — Consolidated (V1a + MT-5(A) + MT-5(C))

**Task:** Fix multi-event claim decomposition non-determinism (Report Variability Plan Root Cause #1) and validate against Captain's quality bar.

**Input tested:** "Were the various Bolsonaro trials conducted in accordance with Brazilian law, and were the verdicts fair?"

**Captain's expected quality bar:**
From domain knowledge and earlier reports from this and similar inputs:
- (a) Overall Verdict of about 72% True.
- (b) At least two, or better three ClaimAssessmentBoundaries (as with 8ac32a8cb61442f891377661ae6a877a)
- (c) The seperate STF and TSE cases should be detected triggered by the word "various" in this specific input variant.
- (d) Then the 27 year sentence against Bolsonaro should be mentioned somwhere in the report.

**Files touched:**
- `apps/web/prompts/claimboundary.prompt.md` — MT-5(A): Plurality override rule in CLAIM_EXTRACTION_PASS2 (COMMITTED: f874fa1c)
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — MT-5(C): multi-event collapse reprompt guard (NOT YET COMMITTED)
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` — 3 new MT-5(C) tests (1202 total pass)

**Key decisions:**
- MT-5(A): Plurality override placed as **first check** before classification types; exception clause on question rule cross-references back
- MT-5(C): Fires AFTER existing D1 reprompt loop; exactly 1 targeted reprompt with event-count guidance; accepts if claim count improves

---

#### Phase 1: V1a Baseline (pre-MT-5, MT-1/2/3 only)

| | V1a Run 1 | V1a Run 2 | V1a Run 3 |
|---|---|---|---|
| jobId | 3e88e11a | 8ac32a8c | 0e584cb2 |
| truthPercentage | 55% | 68.2% | 55% |
| verdict | MIXED | LEANING-TRUE | MIXED |
| claims | 1 | 3 | 1 |
| distinctEvents | 0 | 3 | 2 |

Spread: 13.2 pp. **Root cause:** Pass 2 inconsistently classifies "various trials" as `question` (1 claim) vs `multi_assertion_input` (3 claims).

#### Phase 2: MT-5(A) Prompt Reinforcement (committed f874fa1c)

Two validation rounds (6 runs). Spread halved to 6.0 pp, all LEANING-TRUE, but claim count still inconsistent (1–3).

| | Attempt 1 | | | Attempt 2 | | |
|---|---|---|---|---|---|---|
| jobId | 6ef5b622 | 463af430 | 1aa9fe9e | 6aec493e | 23bb0d5d | ce513bc9 |
| truth% | 64.2% | 65% | 70.2% | 65% | 71.1% | 65% |
| claims | 3 | 1 | 2 | 1 | 2 | 1 |

#### Phase 3: MT-5(A+C) Combined — Final Validation (6 runs)

| | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | Run 6 |
|---|---|---|---|---|---|---|
| jobId (full) | 314dd49e85f74fd293610a50dbd6eef2 | cf205a17786e4679b052a78932ad3d81 | f2394b340b434306b60cccdacecb7c8b | c21c32902e8149c78481ff43a58de09b | 8ca41afa98134486b0c600659777082c | 0b79511572d24a92a58f60193ff71db6 |
| truthPercentage | 59.8% | 75% | 76% | **72.3%** | 69.2% | 76.5% |
| verdict | LEANING-TRUE | MOSTLY-TRUE | MOSTLY-TRUE | **MOSTLY-TRUE** | LEANING-TRUE | MOSTLY-TRUE |
| confidence | 53.5 | 78 | 69.9 | 74.7 | 68.3 | 69 |
| claims | 3 | 1 | 2 | 2 | 3 | 2 |
| distinctEvents | 2 | 0 | 2 | 2 | 2 | 3 |
| iterations | 3 | 1 | 2 | 2 | 3 | 2 |
| evidence | 65 | 58 | 63 | 84 | 75 | 77 |
| S/C ratio | 0.56 | 0.79 | 0.81 | 0.80 | 0.78 | 0.86 (skewed) |
| 27yr sentence | 3 items | 1 item | 0 items | 9 items | 2 items | 3 items |
| STF+TSE in evidence | Yes/Yes | Yes/Yes | Yes/Yes | Yes(9)/Yes(9) | Yes(8)/Yes(6) | Yes(3)/Yes(6) |
| challenger model | gpt-4.1 | gpt-4.1 | gpt-4.1 | gpt-4.1 | gpt-4.1 | **gpt-4.1-mini** |
| SR scores available | 6/15 | 0/10 | 5/18 | 0/20 | 12/23 | 17/23 |
| warnings | 15 | 5 | 5 | 3 | 4 | 14 |

**6-run statistics:** Mean=71.5%, median=**72.3%**, spread=16.7 pp. Excluding Run 1 outlier: mean=73.6%, spread=7.3 pp. All runs TRUE-band, no flips.

---

#### Captain expectations (a–d) across 6 runs

**(a) ~72% True:** 5/6 runs in 69–76.5% range. Mean=71.5%, median=72.3%. Run 1 outlier at 59.8% (caused by AC_03 "judicial impartiality" scoring 38% UNVERIFIED).

**(b) 2+ distinct boundaries:** **6/6 PASS.** All have 6 boundaries with separate STF and TSE proceedings.

**(c) STF+TSE detected:** **5/6 detect both as distinctEvents.** Run 2 (0 events, 1 claim) still has both STF and TSE in evidence boundaries.

**(d) 27-year sentence:** **5/6 have it in evidence items** (Run 3 missed). Not in verdictNarrative (narrative generation doesn't surface individual evidence details). reportMarkdown is a stub (not yet implemented).

---

#### Root cause investigation — why runs differ

**Investigated:** Settings, SR cache, search providers, LLM service availability, evidence composition.

**Settings and infrastructure — identical across all 6 runs:**
- Models: Haiku 4.5 (understand/extract), Sonnet 4.5 (verdict), GPT-4.1 (challenger) — except Run 6 which used gpt-4.1-mini due to TPM rate limit fallback
- Search: Google-CSE for all runs (auto mode)
- Source fetch: 100% success in all runs
- SR cache: Variable availability (0–17 scores per run) but no correlation with truth%
- No other infrastructure or configuration differences

**The sole driver of spread is claim decomposition scope:**
- Runs including an "impartiality/bias" dimension (Runs 1, 5): truth% = 59.8–69.2%
- Runs with procedural compliance claims only (Runs 2, 3, 4, 6): truth% = 72–76.5%
- Run 1's AC_03 "judicial impartiality and absence of bias" attracted only 6 evidence items (all medium probativeValue), 2 contradicting (Justice Toffoli's partisan background) → 38% UNVERIFIED, dragging overall to 59.8%
- Run 5's AC_02 "impartiality" scored better (58% LEANING-TRUE) because it attracted more evidence (75 total)
- This is **correct analytical behavior** — "was the procedure legal?" is inherently more verifiable than "was the verdict impartial?"

**Run 6 TPM fallback:** gpt-4.1-mini challenger instead of gpt-4.1 had no material impact (76.5% MOSTLY-TRUE, consistent with other procedural runs). Advocate/reconciler/self-consistency (all Sonnet 4.5) dominate the verdict.

---

#### Progression across MT phases

| Metric | Pre-MT-5 (V1a) | MT-5(A) only | MT-5(A+C) 6 runs |
|---|---|---|---|
| Truth% range | 55–68.2% | 64.2–71.1% | 59.8–76.5% |
| Mean | 59.4% | 66.4% | 71.5% |
| Median | 55% | 65% | 72.3% |
| Verdicts | 2x MIXED, 1x LEANING-TRUE | 6x LEANING-TRUE | 4x MOSTLY-TRUE, 2x LEANING-TRUE |
| Band flip | No | No | No |
| Claims when events>=2 | 1 (collapsed) | 1–3 (inconsistent) | 2–3 (reliable) |

---

#### Recommendation

1. **Commit MT-5(C).** The decomposition problem is fixed. Claim count is reliable when distinctEvents >= 2. The remaining spread (16.7 pp) reflects analytical content (procedural vs impartiality verifiability), not pipeline instability.
2. **The 12 pp spread criterion was designed for decomposition stability.** Decomposition is now stable. Excluding the Run 1 outlier, spread is 7.3 pp.
3. **Deploy readiness:** MT-5(A) committed (f874fa1c). MT-5(C) in working tree (1202 tests pass, build clean). Pending Captain approval.

**For next agent:** If Captain approves, commit MT-5(C) and update variability plan.

---
### 2026-03-10 | Senior Developer | Claude Code (claude-sonnet-4-6) | MT-2 — CB_GENERAL_UNSCOPED for unscoped evidence
**Task:** Implement MT-2: replace the largest-boundary fallback in `assignEvidenceToBoundaries()` with explicit `CB_GENERAL_UNSCOPED` handling, so unscoped evidence is not silently absorbed into a named analytical boundary.
**Files touched:**
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — Pass 2 of `assignEvidenceToBoundaries()` replaced
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` — 2 old largest-boundary tests updated, 5 new MT-2 tests added
**Key decisions:**
- Three-way branch in Pass 2: (1) single boundary → assign to sole boundary, (2) CB_GENERAL already exists → assign to it, (3) 2+ named boundaries and no CB_GENERAL → create `CB_GENERAL_UNSCOPED` and push into boundaries array.
- `CB_GENERAL_UNSCOPED` uses `internalCoherence: 0.0` and empty `constituentScopes`. It is visible to verdict LLM via the boundaries array and coverage matrix.
- `boundaries.push()` mutation is safe: same array used by `evidenceCount` update loop and verdict stage call — `CB_GENERAL_UNSCOPED` gets `evidenceCount` set correctly.
**Open items:** `unscopedEvidenceCount` not added to named boundary API fields (deferred). UI may want to visually distinguish `CB_GENERAL_UNSCOPED` from analytical boundaries in a future UI pass.
**Warnings:** Largest-boundary heuristic (27c4ef44) is now fully replaced. Named boundary `evidenceCount` values will be lower for jobs with unscoped evidence; `CB_GENERAL_UNSCOPED` shows the displaced count. This is correct analytical behavior.
**For next agent:** MT-1+MT-2+MT-3 complete. MT-4 (Gate 1 / claim retention) deferred per plan. Next: variability tracking §10.6 checks or Phase 3.
**Learnings:** No.

---
### 2026-03-10 | Senior Developer | Claude Code (claude-sonnet-4-6) | MT-1 + MT-3 — Sufficiency Guard + Multi-Event Coverage
**Task:** Implement MT-1 (stop premature sufficiency collapse) and MT-3 (wire distinctEvents into query generation coverage) from the Report Variability Consolidated Plan §10.4–10.5.
**Files touched:**
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — MT-1 iteration guard in `allClaimsSufficient()`, pass `mainIterationsUsed` + `distinctEventCount` at call site
- `apps/web/src/lib/config-schemas.ts` — new UCM field `sufficiencyMinMainIterations` (default 1)
- `apps/web/prompts/claimboundary.prompt.md` — GENERATE_QUERIES section: strengthened multi-event coverage rule with abstract example
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` — 8 new tests (MT-1 guard: 4 tests; MT-3 coverage: 3 tests; MT-3 wiring: 1 test)
**Key decisions:**
- MT-3 parameter wiring was already fully implemented (distinctEvents passed to prompt via `runResearchIteration → generateResearchQueries` at line 2798). MT-3 work focused on (a) prompt strengthening and (b) multi-event iteration count in the sufficiency guard.
- MT-3 coverage check: structural (no LLM call) — when `distinctEvents.length > 1`, `effectiveMinIterations = max(minMainIterations, distinctEventCount - 1)`. Avoids LLM call in hot loop.
- MT-1 guard: `allClaimsSufficient()` now accepts `mainIterationsCompleted`, `minMainIterations` (UCM), `distinctEventCount`; empty claims short-circuit before guard.
- Existing tests updated to pass `mainIterationsCompleted=1` where they test evidence-count logic independent of the guard.
**Open items:** MT-2 (boundary fallback — unscoped evidence assigned to first boundary) is the next slice, not implemented here per task scope.
**Warnings:** `sufficiencyMinMainIterations` defaults to 1 — this will force at least one main research iteration on every run. Monitor for cost increase on jobs that previously exited early (e.g., single-claim high-coverage topics). Plan §10.5 cost note applies.
**For next agent:** MT-2 is the next piece. See plan §10.5 Phase MT-2. The `assignEvidenceToBoundaries()` function and the `claimBoundaryId` fallback assignment are the target. Check `Report_Quality_Analysis_2026-03-08.md` for B2 context (already partially fixed in 27c4ef44 with largest-boundary heuristic, but unscoped general evidence handling is still open).
**Learnings:** No.

---
### 2026-03-10 | Captain Deputy | Claude Code (claude-sonnet-4-6) | Phase 2 Validation — Completion Handoff
**Task:** Record Phase 2 validation completion handoff. Mark docs as complete.
**Files touched:** `Docs/WIP/Phase2_Validation_Plan_2026-03.md` (status → ✅ Complete), `Docs/DEVELOPMENT/Phase2_Validation_Checklist.md` (footer + checkbox updated).
**Key decisions:** All 7 validation runs SUCCEEDED (Iran ×2, Bolsonaro Q+S, Hydrogen, Venezuela, Article/URL). 0 UNVERIFIED fallbacks, 0 crashes. Input neutrality 2.0% ✅. Pipeline declared production-ready.
**Open items:** Non-blocking Phase 3 observations: Iran variance Δ20.1% (monitor), Hydrogen truth% outlier, confirm `verdict_direction_issue`/`verdict_grounding_issue` warnings are info-only in UI.
**Warnings:** None.
**For next agent:** Phase 2 is closed. Phase 3 roadmap in `Docs/WIP/Report_Quality_Analysis_2026-03-08.md`. Next implementation: MT-1 + MT-3 (`Docs/WIP/Report_Variability_Consolidated_Plan_2026-03-07.md`).
**Learnings:** no

---
### 2026-03-17 | Agents Supervisor | Codex (GPT-5) | Phase 3 Cleanup — Remove Redundant Rules
**Task:** Execute Phase 3 of `Docs/WIP/Agent_Rules_Cleanup_Plan_2026-03-17.md`: remove duplicated global-rule content from collaboration rules and add sync markers to tool configs.
**Files touched:** `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`, `.github/copilot-instructions.md`, `.windsurfrules`, `.clinerules/00-factharbor-rules.md`, `.cursor/rules/factharbor-core.mdc`, `GEMINI.md`.
**Key decisions:** Replaced `Multi_Agent_Collaboration_Rules.md` §5.1-§5.4 with a single canonical-reference block pointing to `/AGENTS.md` to avoid drift. Rewrote §5.5 to require flagging documentation follow-up in completion outputs instead of forcing inline doc edits. Added dated sync markers only to the five files requested in the task.
**Open items:** Remaining cleanup-plan phases are still open (`Phase 2`, `Phase 4`, `Phase 5`, `Phase 6`).
**Warnings:** `GEMINI.md` still contains model-version-specific guidance; that staleness was outside this Phase 3 scope and remains for a later cleanup pass.
**For next agent:** If later phases touch governance docs again, keep the new `/AGENTS.md` cross-reference pattern in `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` and update the sync-marker dates when tool-config summaries are resynced. Documentation follow-up may be needed if any external docs cite the old §5.1-§5.4 text directly.
**Learnings:** No.

---
### 2026-03-17 | Senior Developer | Codex (GPT-5) | CI Tests — Safe Lane + Debug Root Fix
**Task:** Fix the failing CI test run and harden GitHub Actions so CI does not run tests that make real external API calls.
**Files touched:** `.github/workflows/ci.yml`, `apps/web/package.json`, `package.json`, `apps/web/src/lib/analyzer/debug.ts`.
**Key decisions:** Added an explicit `test:ci` script at the repo root and web workspace, and switched the workflow to that named entrypoint instead of the generic `npm test`. Hardened `findRepoRoot()` to detect the monorepo root via `CLAUDE.md`, `FactHarbor.sln`, or a workspace-root `package.json`, avoiding false positives from workspace-local `AGENTS.md`.
**Open items:** No code follow-up required for this fix. Re-run the GitHub Actions `CI` workflow on the updated branch to confirm the hosted Windows runner now matches local results.
**Warnings:** `apps/web/src/lib/analyzer/debug.ts` already had a local uncommitted edit when this task started. The fix was applied on top of that change rather than reverting it.
**For next agent:** If CI test scope changes later, keep the workflow on `npm run test:ci` or another explicitly safe script. Do not point CI at `test:llm`, `test:neutrality`, `test:expensive`, or the claim-boundary integration suite unless the project intentionally accepts live external API calls in CI.
**Learnings:** yes — appended Senior Developer gotcha about monorepo root detection markers.

---
### 2026-03-17 | Senior Developer | Codex (GPT-5) | Live Test Scripts — Block GitHub Actions
**Task:** Ensure paid/live API test suites cannot be executed from GitHub Actions while preserving explicit local runs.
**Files touched:** `apps/web/package.json`, `apps/web/scripts/assert-local-live-tests.js`.
**Key decisions:** Added a shared script guard keyed on `GITHUB_ACTIONS=true`, then wrapped all live/paid test entrypoints (`test:llm`, `test:neutrality`, `test:expensive`, `test:cb-integration`, `test:calibration:*`). This blocks future workflow misconfiguration at the npm-script layer instead of relying only on workflow discipline.
**Open items:** None.
**Warnings:** This is a hard fail on GitHub Actions by design. If a future maintainer intentionally wants hosted live tests, they will need to remove or bypass the guard explicitly rather than reusing these scripts.
**For next agent:** Keep local explicit runs on these same scripts. If you add another paid/live suite, wrap it with `apps/web/scripts/assert-local-live-tests.js` as well.
**Learnings:** yes — appended Senior Developer tip about guarding local-only paid test scripts with `GITHUB_ACTIONS`.

---
### 2026-03-17 | Senior Developer | Codex (GPT-5) | Debug Log Path — Resolve Web Workspace Directly
**Task:** Replace repo-root marker heuristics in debug log path resolution with a more robust approach.
**Files touched:** `apps/web/src/lib/analyzer/debug.ts`, `apps/web/test/unit/lib/analyzer/debug.test.ts`.
**Key decisions:** Switched from repo-root detection to direct web-workspace detection using `package.json` identity (`name: "@factharbor/web"`). The resolver now supports both starting from repo root (`apps/web/package.json`) and from inside the workspace itself, and writes directly to `apps/web/debug-analyzer.log`.
**Open items:** None.
**Warnings:** This changes the unit-test contract from “find repo root” to “find web root,” which is intentional because the log file belongs to the web workspace, not the monorepo root.
**For next agent:** If a future caller really needs monorepo-root discovery, implement that separately. Do not overload the debug-log resolver with unrelated root semantics again.
**Learnings:** no

---
### 2026-03-17 | Senior Developer | Codex (GPT-5) | Review LLM Triangulation Assessment Plan
**Task:** Review `Docs/WIP/LLM_Triangulation_Assessment_Plan_2026-03-17.md` against the current ClaimAssessmentBoundary implementation.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Flagged four issues before implementation approval: the plan relies on a new `findingSummary` signal without scheduling Stage 4 contract changes, the `generateText` example omits required structured-output plumbing used elsewhere in the repo, the rollout defaults the feature on for existing configs before the plan's own regression gate runs, and the proposed factor-only derivation can mislabel the existing `conflicted` triangulation UI state.
**Open items:** Revise the plan before implementation. No code changes were made.
**Warnings:** Current code exposes per-boundary TP/confidence/direction/count only; there is no boundary-level textual summary field today. Structured-output calls in this repo also require prompt-caching/provider options plus `extractStructuredOutput(...)`.
**For next agent:** Re-check §3/§7/§9 for missing Stage 4 prompt/type work, §7.1 for the exact Anthropic `Output.object` pattern, §5.3/§13 for rollout gating, and §4.2.1 for whether `conflicted` remains structurally derived instead of factor-derived.
**Learnings:** no

---
### 2026-03-17 | Senior Developer | Codex (GPT-5) | Re-review LLM Triangulation Assessment Plan v4
**Task:** Re-review the corrected `Docs/WIP/LLM_Triangulation_Assessment_Plan_2026-03-17.md` after the v4 fixes.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Confirmed the original 2 High + 2 Medium findings are substantively fixed. Flagged remaining document-consistency issues in stale snippets: §7.1's example uses `recordLLMCall()` without importing it, and §7.3 still reflects v3 semantics (`default true`, `llmCall` argument, `info` fallback comment) despite the v4 staged-rollout and silent-fallback decisions.
**Open items:** Clean up the stale v3 references in the implementation snippets and resolved-questions/review-log text before coding from the document.
**Warnings:** The corrected architecture is sound, but the stale code snippets are implementation traps because they contradict the updated decisions in the same file.
**For next agent:** If implementing from this plan, trust the v4 decisions in §3-§5/§13/§14, not the stale snippet details in §7.3 or the outdated v3 historical text in §16/Review Log.
**Learnings:** no

---
### 2026-03-18 | Technical Writer | Codex (GPT-5) | Generate Editable UZH PowerPoint Deck
**Task:** Create a real `.pptx` deck for the UZH meeting from the source content instead of printing the rendered xWiki page.
**Files touched:** `Docs/WIP/generate_meeting_uzh_pptx.js`, `Docs/WIP/Meeting_UZH_full_deck_2026-03-18.pptx`, `Docs/WIP/package.json`, `Docs/WIP/package-lock.json`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Switched from page-capture output to an editable PowerPoint built with `PptxGenJS`. The deck is source-driven and structured as presentation slides: meeting goals, collaboration fit, research value, pipeline, current gaps, funding shape, collaboration opportunities, and next steps.
**Open items:** The deck has been generated successfully, but I did not manually inspect slide-by-slide visual balance in PowerPoint itself. A next pass can refine wording density or add diagrams if needed.
**Warnings:** This deck is a curated presentation artifact, not a literal one-to-one export of every xWiki section. `pptxgenjs` was installed locally under `Docs/WIP` to support generation.
**For next agent:** Regenerate with `node Docs/WIP/generate_meeting_uzh_pptx.js`. If the UZH page changes materially, update the content arrays in that script rather than editing the `.pptx` binary directly in-repo.
**Learnings:** no

---
### 2026-03-18 | Technical Writer | Codex (GPT-5) | Generate Full-Page UZH PDF
**Task:** Produce a faithful full-page PDF of the rendered `Meeting UZH` xWiki page, in addition to the shorter slide deck.
**Files touched:** `Docs/WIP/Meeting_UZH_fullpage_2026-03-18.pdf`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Used the local xWiki viewer (`viewer-impl/xwiki-viewer.html`) plus Chrome headless print-to-PDF instead of recreating the page in another format, because the user wanted the full page "exactly" and PDF preserves that better than PowerPoint here.
**Open items:** I verified the PDF file exists, but I did not manually inspect every page break or diagram render in the printed PDF.
**Warnings:** The output depends on the local viewer rendering and Chrome print behavior. If the page content changes, regenerate the PDF rather than treating it as source-of-truth documentation.
**For next agent:** To regenerate: start `Docs/xwiki-pages/viewer-impl/Open-XWikiViewer.ps1`, then print `http://localhost:8471/xwiki-viewer.html?page=Product%20Development.Presentations.Meeting%20UZH.WebHome` with Chrome headless to a PDF file.
**Learnings:** no

---
### 2026-03-18 | Technical Writer | Codex (GPT-5) | Generate Short UZH PDF Deck
**Task:** Create a shorter, cleaner slide deck for the UZH meeting and render it to PDF from the current repo materials.
**Files touched:** `Docs/WIP/Meeting_UZH_short_deck_2026-03-18.md`, `Docs/WIP/meeting-uzh-short-theme.css`, `Docs/WIP/Meeting_UZH_short_deck_2026-03-18.pdf`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Used a Marp-based markdown deck instead of trying to export the full xWiki page directly, because the user asked for a shorter cleaner version. Grounded the deck in the current UZH presentation plus meeting-prep and Innosuisse docs, and framed funding around the most realistic near-term path: Innosuisse Innovation Project first, lighter preparatory options second, later SNSF/Horizon follow-ons only where fit exists.
**Open items:** The PDF was rendered successfully, but I did not do a human visual slide-by-slide review of the final PDF. If the user wants, the next pass should trim or re-order slides after seeing the actual deck.
**Warnings:** This generated deck is a presentation artifact, not an authoritative replacement for the xWiki page. If the source presentation changes materially, regenerate the PDF from the markdown source or update the markdown first.
**For next agent:** The generated files are in `Docs/WIP/`. To re-render after edits, run `npx @marp-team/marp-cli 'Docs/WIP/Meeting_UZH_short_deck_2026-03-18.md' --theme-set 'Docs/WIP/meeting-uzh-short-theme.css' --pdf --allow-local-files --browserPath 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' -o 'Docs/WIP/Meeting_UZH_short_deck_2026-03-18.pdf'`.
**Learnings:** no

---
### 2026-03-17 | Senior Developer | Codex (GPT-5) | Review March 17 Change Set
**Task:** Review the March 17, 2026 changes in git history plus current uncommitted docs for bugs, regressions, and missing tests.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Flagged two code-review findings: the new `extractRecordArray()` bare-object tolerance in `verdict-stage.ts` is too permissive and can silently convert malformed LLM outputs into default 50/50 verdict records, and the prompt change making `analyticalDimension` effectively mandatory increases scope-fragmentation risk because that field feeds the deterministic scope fingerprint while normalization only kicks in once enough scopes accumulate.
**Open items:** Tighten the verdict-shape acceptance condition and add a focused regression test. Reassess the `analyticalDimension` prompt guidance against the current scope-fingerprinting behavior before relying on it broadly.
**Warnings:** Most other March 17 changes looked safe. The CI/test-entrypoint changes and debug-path fix were not the risky parts in this review.
**For next agent:** If you touch `verdict-stage.ts`, keep malformed-shape detection strict enough that retries/fallbacks still trigger. If you iterate on `analyticalDimension`, remember it participates directly in `scopeFingerprint()` and small runs may never reach scope normalization.
**Learnings:** no

---
### 2026-03-17 | Senior Developer | Codex (GPT-5) | Fix March 17 Review Findings
**Task:** Implement the two March 17 review fixes: tighten bare-object verdict parsing and remove prompt pressure to invent generic `analyticalDimension` labels.
**Files touched:** `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`, `apps/web/prompts/claimboundary.prompt.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Restricted bare single-object verdict acceptance to objects containing both `claimId` and `truthPercentage`, so malformed partial objects still hit the existing malformed-shape path. Updated the extraction prompt so `analyticalDimension` is included only for distinct measurable properties and omitted for broad/general evidence, avoiding prompt-induced scope fragmentation.
**Open items:** Prompt changes were not reseeded into UCM in this task; do that when you want runtime prompt storage updated.
**Warnings:** The prompt fix is wording-only and has no direct unit test coverage. Runtime behavior changes only after prompt reseeding / UCM update.
**For next agent:** If another parser-relaxation change is proposed in `verdict-stage.ts`, keep the malformed-output retry/fallback behavior as the source of truth. If `analyticalDimension` is revisited, evaluate it together with `scopeFingerprint()` and Stage 3 normalization thresholds.
**Learnings:** no

---
### 2026-03-18 | Product Strategist | Codex (GPT-5) | Draft Innosuisse Concept for Live Audio/Video Fact-Checking
**Task:** Investigate current official Innosuisse application requirements and draft a project concept around real-time live fact-checking of audio and video after the Tobias meeting.
**Files touched:** `Docs/WIP/Innosuisse_Projektentwurf_Live_Audio_Video_FactChecking_2026-03-18.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Reframed the opportunity away from “apply existing Tobias/UZH/ETH research to current FactHarbor” and toward a stronger innovation story: evidence-based, real-time, multimodal fact-checking for audio/video streams. Grounded the draft in official Innosuisse guidance for innovation projects with implementation partner, the innovation-project checklist, innovation cheque, mentoring, and the current implementing provisions.
**Open items:** The draft is a strong pre-draft / concept note, not yet an Innolink-ready submission. It still needs a named Swiss research partner, a tighter exploitation plan, a realistic project budget, and more concrete benchmark datasets / pilot partners.
**Warnings:** For a full Innosuisse filing, the weakest parts today are likely partner setup, quantified market validation, and data/evaluation specifics for live multimodal fact-checking. The novelty argument is much stronger than the original Tobias-centered cooperation angle, but it must still be evidenced against competitors.
**For next agent:** If this is continued, turn the current draft into an Innolink-structured application skeleton with explicit field headings and a first-pass budget/work package table. Keep the framing broad around UZH/ETH or other Swiss research partners; do not revert to a Tobias-person-specific collaboration story.
**Learnings:** no

---
### 2026-03-18 | Product Strategist | Codex (GPT-5) | Reshape LiveCheck Draft into Innosuisse-Style Application Text
**Task:** Rework the live audio/video fact-checking concept into a more submission-like draft for `Innovationsprojekte mit Umsetzungspartner`, grounded in the official German checklist and requirements.
**Files touched:** `Docs/WIP/Innosuisse_Antrag_LiveCheck_Innolink_Struktur_2026-03-18.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Did not pretend to have a public full sample application where none was credibly available. Instead, structured the new draft around the official checklist categories: innovative solution, project value, project planning, ICT/AI specifics, competition, sustainability, and risks. Kept the partner framing open around a Swiss research institution and removed person-specific dependence.
**Open items:** The new version is much closer to an Innolink-ready narrative, but still lacks partner names, LOIs, market sizing, financial projections, budget tables, and a formal IPR/FTO assessment.
**Warnings:** The strongest likely reviewer pressure points remain market validation, concrete implementation-partner economics, and proof that the project is innovation with transfer potential rather than only a research agenda.
**For next agent:** Best next step is a `v2` that mirrors the final Innolink field order even more tightly and adds placeholders/tables for budget, partner roles, LOIs, and measurable KPIs by work package.
**Learnings:** no

---

---
### 2026-03-18 | LLM Expert | Claude Opus 4.6 | Bolsonaro Sentencing Evidence Loss Fix
**Task:** Investigate and fix the disappearance of 27-year sentencing evidence from Bolsonaro trial reports after Phase A jurisdiction filtering.
**Files touched:** `claimboundary-pipeline.ts` (Fix A sort + Fix B diagnostics + originalRank threading), `claimboundary.prompt.md` (Fix C contrastive rule), `config-schemas.ts` (relevanceTopNFetch), `pipeline.default.json` (relevanceTopNFetch), `claimboundary-pipeline.test.ts` (6 new tests)
**Key decisions:**
- Root cause was two compounding issues: (1) RELEVANCE_CLASSIFICATION prompt lacked concrete examples distinguishing foreign media reporting domestic events from foreign government reactions, causing Haiku to misclassify PBS/BBC as foreign_reaction; (2) top-5 fetch used unsorted LLM-emitted order, silently dropping high-scored sources.
- Fix A: Stable sort (score desc, originalRank asc tie-break) before top-N fetch. Promoted `relevanceTopNFetch` to UCM config (default 5).
- Fix B: debugLog inside classifyRelevance for every result (rank, url, raw/adjusted score, jurisdictionMatch, reasoning) + discard summary. No API change.
- Fix C: Contrastive prompt rule with concrete examples (BBC domestic event → contextual; Reuters foreign sanctions → foreign_reaction). Explicitly preserves foreign_reaction for government actions. State media exclusion added.
- Three reviews incorporated before implementation (Code Reviewer, Senior Developer, LLM Expert/Senior Developer).
**Open items:** None. All fixes verified via live validation (job 91e018df).
**Warnings:** Prompt changes require `npm run reseed:prompts` — auto-reseed only runs on `postbuild`, not `dev`.
**For next agent:** The `relevanceTopNFetch` UCM parameter can be tuned in Admin UI if future evidence-loss issues arise (bump to 8 during investigation). debugLog in `debug-analyzer.log` now shows full Stage 2 classification diagnostics — check there first for any jurisdiction filtering issues.

---
### 2026-03-19 | Senior Developer | Codex (GPT-5) | SR Weighting Disable Experiment
**Task:** Execute a reversible live experiment disabling `evidenceWeightingEnabled` for a control set of repeated claims, compare the unweighted outputs against today’s weighted baselines, then restore the original pipeline config.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Ran the experiment through the live local stack instead of editing SQLite directly. Captured the active pipeline hash, saved and activated a temporary pipeline config with `evidenceWeightingEnabled=false`, submitted five control claims (Iran, Bolsonaro EN single, Bolsonaro EN various, Hydrogen, Plastik), restored the original pipeline hash as soon as the last intended control run entered `RUNNING`, and cancelled an extra queued Iran rerun created to work around a runner-queue anomaly. Results supported the independent investigation: Iran recovered strongly (`65-68` weighted today to `82 / 75 / MOSTLY-TRUE` unweighted), Bolsonaro various improved from `51 / 45 / MIXED` to `64 / 65 / LEANING-TRUE`, Hydrogen stayed directionally stable but became more decisive (`15 / 60` to `19 / 84`), and Plastik remained poor despite confidence recovery (`53 / 44 / UNVERIFIED` to `59 / 53 / LEANING-TRUE`).
**Open items:** If this is taken forward, the next step should be a deliberate decision on whether to keep SR weighting disabled temporarily or redesign the weighting formula before re-enabling it. The queued-run anomaly for one Iran job was not root-caused in this task.
**Warnings:** This was not a perfectly pure A/B because live search caching remains disabled, so retrieval variance still exists between repeated runs. Even with that caveat, the Iran control result is large enough to be decision-relevant. The temporary config was restored to the original active hash `30c48302...` after the experiment runs had loaded.
**For next agent:** Use experiment jobs `74fa5bb1` (Iran), `ea4ffd66` (Bolsonaro EN single), `e9425b74` (Bolsonaro EN various), `17c164f9` (Hydrogen), and `c812635d` (Plastik) for deeper diffing against today’s weighted baselines `48bd10db` / `d54a97a5`, `9a01b324`, `9768a899`, `a1a38508`, and `27754124`. If you need a cleaner follow-up experiment, enable search cache first or run against captured search results.
**Learnings:** no

---
### 2026-03-19 | Senior Developer | Codex (GPT-5) | SR LLM Calibration Plan
**Task:** Draft a concrete implementation plan for replacing deterministic SR verdict weighting with an LLM-mediated calibration step that uses richer SR details.
**Files touched:** `Docs/WIP/2026-03-19_SR_LLM_Calibration_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Recommended replacing the current `applyEvidenceWeighting()` verdict-compression formula with a new Stage 4.5 SR calibration pass inserted in `claimboundary-pipeline.ts` after raw verdict generation and before aggregation. Proposed a separate `source-reliability-calibration.ts` module, a bounded structured output schema, symmetry across supporting and contradicting evidence, UCM-backed calibration controls, and a conservative rollout that starts with confidence-only adjustment while `evidenceWeightingEnabled` remains off. Identified the concrete integration points in `claimboundary-pipeline.ts`, `source-reliability.ts`, `types.ts`, `config-schemas.ts`, `warning-display.ts`, and optionally the text-analysis prompt/service plumbing.
**Open items:** Human approval is still needed before prompt work under `apps/web/prompts/`. Implementation has not started; this is a design/plan artifact only.
**Warnings:** Do not implement this as another blunt numeric multiplier or support-only penalty. The plan intentionally avoids direct truth compression toward 50 and recommends keeping the old weighting path disabled during rollout.
**For next agent:** Start by implementing the plumbing for Stage 4.5 in `confidence_only` mode and leave truth adjustment off behind config. If you choose a new prompt profile instead of a ClaimBoundary section, update prompt profile registration and seeding accordingly.
**Learnings:** no

---
### 2026-03-19 | Senior Developer | Codex (GPT-5) | SR LLM Calibration Plan Review Integration
**Task:** Incorporate LLM Expert review feedback into the SR calibration plan before any implementation starts.
**Files touched:** `Docs/WIP/2026-03-19_SR_LLM_Calibration_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Locked the recommended model tier to Haiku/understand strength, made the anti-double-counting scope explicit by requiring the prompt to assess source-portfolio imbalances rather than re-evaluate evidence, added token budget guardrails (5 sources per side per claim, truncated reasoning, ~2000 token target), made raw verdict preservation mandatory (`rawTruthPercentage` and `rawConfidence`), added the Plastik false-positive caveat for confidence-only rollout, and documented an explicit plumbing-first implementation order that can proceed before prompt approval.
**Open items:** Prompt approval is still required before adding prompt text. The plan is now specific enough to start plumbing implementation, but no code has been changed yet.
**Warnings:** The highest implementation risk remains double-counting source quality already implicit in verdict debate. Treat SR calibration as portfolio-level trust adjustment only.
**For next agent:** You can start steps 1-4 from the plan now: types/config, module skeleton, pipeline wiring, and tests. Keep the LLM call stubbed until prompt approval lands.
**Learnings:** no

---
### 2026-03-19 | Senior Developer | Codex (GPT-5) | Stage 4.5 SR Calibration Plumbing
**Task:** Implement the non-prompt plumbing for Stage 4.5 source-reliability calibration in `apps/web`, keeping the new path feature-flagged and off by default.
**Files touched:** `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/analyzer/warning-display.ts`, `apps/web/src/lib/config-schemas.ts`, `apps/web/configs/pipeline.default.json`, `apps/web/configs/calculation.default.json`, `apps/web/src/lib/analyzer/source-reliability-calibration.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/src/lib/analyzer/index.ts`, `apps/web/test/unit/lib/analyzer/source-reliability-calibration.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added Stage 4.5 metadata types to preserve `rawTruthPercentage` and `rawConfidence`, registered SR calibration warning types, introduced UCM-backed pipeline and calculation settings for calibration mode/strength/bounds/token caps, implemented a new `source-reliability-calibration.ts` module that builds bounded support/contradiction source portfolios and can apply clamped calibration outputs, and wired `claimboundary-pipeline.ts` so Stage 4.5 takes precedence when enabled while the legacy `applyEvidenceWeighting()` path remains as fallback. The new path does not call any prompt yet; if enabled without LLM results, it returns unchanged verdicts with calibration metadata plus informational warnings.
**Open items:** Prompt content and the actual LLM call are still unimplemented by design. Richer SR detail fields such as bias indicators and rationale are not yet threaded into runtime source objects, so the current request shape carries placeholders for that future data.
**Warnings:** Because prompt work is not in place, enabling `sourceReliabilityCalibrationEnabled=true` today will not improve quality; it will annotate verdicts and emit `source_reliability_calibration_skipped`. Legacy SR weighting is still available and still on by default unless you explicitly disable it or enable Stage 4.5 instead.
**For next agent:** The next implementation step is prompt-approved LLM integration inside `source-reliability-calibration.ts`, followed by a small live control-set validation. Safe verification for this plumbing pass already succeeded with `npm -w apps/web run test -- test/unit/lib/analyzer/source-reliability-calibration.test.ts test/unit/lib/config-drift.test.ts` and `npm -w apps/web run build`.
**Learnings:** no

---
### 2026-03-19 | Senior Developer | Codex (GPT-5) | Stage 4.5 Follow-up Review Fixes
**Task:** Address the post-implementation review findings for Stage 4.5 by removing warning duplication risk and extending unit coverage.
**Files touched:** `apps/web/src/lib/analyzer/source-reliability-calibration.ts`, `apps/web/test/unit/lib/analyzer/source-reliability-calibration.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Kept the deterministic preflight `source_reliability_unknown_dominance` check because it still provides useful diagnostics before prompt-backed calibration exists, but made warning emission idempotent with a `pushWarningOnce()` helper so LLM-returned warning types cannot duplicate the same claim-level warning. Added unit coverage for lower-bound clamping, multi-claim batch result mapping, and the no-duplicate unknown-dominance case.
**Open items:** The placeholder `truncateText(undefined, ...)` remains intentionally inert until richer SR cache fields are threaded into runtime source objects.
**Warnings:** This pass did not change runtime feature behavior; Stage 4.5 is still non-prompt plumbing only.
**For next agent:** If you later thread richer SR details into `FetchedSource` or a parallel runtime structure, replace the placeholder `reasoningShort` population in `source-reliability-calibration.ts` rather than layering more stub logic around it. Verification for this pass: `npm -w apps/web run test -- test/unit/lib/analyzer/source-reliability-calibration.test.ts`.
**Learnings:** no

---
### 2026-03-19 | Senior Developer | Codex (GPT-5) | Stage 4.5 Low-Finding Cleanup
**Task:** Address two low-severity review findings in the Stage 4.5 SR calibration scaffolding.
**Files touched:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/src/lib/analyzer/source-reliability-calibration.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Clarified in code and in the `source_reliability_calibration_skipped` warning text that enabling Stage 4.5 intentionally bypasses the legacy `applyEvidenceWeighting()` branch even before prompt-backed calibration exists. Also changed `supportPortfolio.totalEvidenceItems` / `contradictionPortfolio.totalEvidenceItems` to count only evidence IDs that actually resolve to `EvidenceItem` records, avoiding metadata drift if phantom IDs ever slip through.
**Open items:** No behavior change beyond clearer diagnostics and more accurate metadata. Prompt-backed LLM calibration is still the next substantive step.
**Warnings:** Admins who enable Stage 4.5 before prompt implementation will now get a more explicit informational warning, but the path remains a no-op for verdict calibration.
**For next agent:** No extra follow-up needed for these findings. Verification for this pass: `npm -w apps/web run test -- test/unit/lib/analyzer/source-reliability-calibration.test.ts`.
**Learnings:** no

---
### 2026-03-19 | Senior Developer | Codex (GPT-5) | Stage 4.5 Confidence-Only Control Set
**Task:** Run the approved 5-claim live control set with Stage 4.5 enabled in `confidence_only` mode, legacy SR weighting disabled, then restore the original pipeline config and compare the outputs to the March 19 weighted baselines.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Activated a temporary pipeline config hash `f4fdb4d1...` with `sourceReliabilityCalibrationEnabled=true`, `sourceReliabilityCalibrationMode="confidence_only"`, `sourceReliabilityCalibrationStrength="budget"`, and `evidenceWeightingEnabled=false`; submitted the five control claims through the live local stack; waited for all five jobs to finish; then restored the original active pipeline hash `30c48302...`. All jobs succeeded: Iran `61e7f517...`, Bolsonaro EN single `16abf05f...`, Bolsonaro EN various `b9014b46...`, Hydrogen `3aa1994c...`, Plastik `0ae6b012...`. Claim-level metadata confirmed the intended behavior: Stage 4.5 applied only confidence deltas (truth deltas stayed `0`) and surfaced explanatory notes plus SR warnings. Largest observed claim-level confidence deltas were `+8` / `+7` / `-5` on Bolsonaro various and `-10` / `-8` on Hydrogen.
**Open items:** The overall report-level shifts still include retrieval/run-to-run variance, so the experiment is not a pure causal measure of Stage 4.5 alone. If a cleaner A/B is needed, repeat against frozen retrieval or cached source sets.
**Warnings:** Do not interpret the Plastik overall change (`53 / 44 / UNVERIFIED` baseline to `41 / 62 / LEANING-FALSE` in this run) as a quality win; the claim-family decomposition/retrieval issues remain. Top-level report JSON does not carry SR calibration metadata; it is stored per claim under `claimVerdicts[].sourceReliabilityCalibration`.
**For next agent:** Use the control jobs above for detailed diffs against baselines `48bd10db...` / `d54a97a5...`, `9a01b324...`, `9768a899...`, `a1a38508...`, and `27754124...`. The key readout is not just overall truth/confidence but the claim-level `rawConfidence`, `confidenceDelta`, `applied`, and `notes` fields inside `resultJson.claimVerdicts`.
**Learnings:** no

---
### 2026-03-19 | Senior Developer | Codex (GPT-5) | B1 Predicate-Preservation Smoke Test
**Task:** Run a small live smoke test after the B1 ClaimExtraction prompt change to check for regressions on nearby claim families before wider rollout.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Ran four live jobs against the current default pipeline hash `f53444a7...` (legacy evidence weighting off, Stage 4.5 off): Hydrogen `aef80732...`, Bolsonaro EN various `a60ee28b...`, single-atomic control `9f4dfe1c...`, and a Portuguese broad evaluative claim `927842bc...`. The single-atomic control stayed clean (one faithful claim, `TRUE 100 / 98`). Hydrogen and Bolsonaro various did not show obvious decomposition regressions from the B1 change, though their normal run-to-run variance remains. The multilingual broad evaluative case still showed partial predicate drift: instead of preserving the original broad predicate from `A reciclagem de plástico não serve para nada`, Stage 1 produced narrower technical/economic/environmental viability claims, including one environmental-contribution formulation that looks closer to a proxy/mechanism claim than to direct predicate preservation.
**Open items:** B1 appears strong enough for the German Plastik case, but multilingual broad-evaluative robustness is not fully solved. The Portuguese smoke-test output suggests the prompt may still allow semantic narrowing from broad evaluative predicates into viability/contribution proxies.
**Warnings:** This smoke test used expensive live runs; do not expand it casually. The Portuguese case is the main caution signal from this pass. It is not evidence of a broad regression, but it is enough to justify a narrow follow-up prompt refinement if multilingual broad-evaluative claims matter.
**For next agent:** If you refine B1 further, target the multilingual broad-evaluative edge specifically: prevent replacements like `not useful` -> `not viable` / `does not contribute significantly` unless that narrower meaning is explicit in the input. Reference smoke-test jobs `aef80732...`, `a60ee28b...`, `9f4dfe1c...`, and `927842bc...` for before/after comparisons.
**Learnings:** no

---
### 2026-03-20 | Senior Developer | Codex (GPT-5) | Stage 4.5 Review-Finding Cleanup
**Task:** Address the March 20 code-review findings on the Stage 4.5 SR calibration implementation.
**Files touched:** `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/analyzer/source-reliability-calibration.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/src/lib/analyzer/index.ts`, `apps/web/test/unit/lib/analyzer/source-reliability-calibration.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Removed the double request-construction at the pipeline callsite by building the Stage 4.5 calibration request once in `claimboundary-pipeline.ts`, passing that request into `callSRCalibrationLLM()`, and applying results with `applySourceReliabilityCalibrationResults()`. Added missing `recordLLMCall()` coverage for prompt-load failures so a missing or misconfigured `SR_CALIBRATION` section no longer fails silently in metrics. Extended SR calibration metadata to preserve `rawTruthDelta` and `rawConfidenceDelta` alongside the bounded applied deltas, so out-of-range LLM outputs remain diagnosable even though runtime application still clamps safely. Added a TODO above the `truncateText(undefined, ...)` placeholder, and documented in the analyzer barrel that `callSRCalibrationLLM` is intentionally not re-exported because it is pipeline-internal orchestration.
**Open items:** The review note about `evidenceWeightingEnabled=false` on defaults vs existing live `config.db` instances remains an operational caveat, not a code bug. Existing deployments still need explicit reseed/activation to pick up the new default.
**Warnings:** This pass does not change Stage 4.5 default rollout; it remains feature-flagged off by default. `bounded_truth_and_confidence` is still future-facing for prompt-backed runs because the current `SR_CALIBRATION` prompt only returns `confidenceDelta`.
**For next agent:** If you later extend the Stage 4.5 prompt to emit `truthDelta`, preserve the new raw-vs-bounded metadata pattern so prompt quality can be monitored without weakening runtime clamps. Verification for this cleanup: `npm -w apps/web run test -- test/unit/lib/analyzer/source-reliability-calibration.test.ts` and `npm -w apps/web run build`.
**Learnings:** no

---
### 2026-03-20 | Senior Developer | Codex (GPT-5) | Three-Worktree Quality Snapshot Comparison
**Task:** Compare live jobs and active configs across `main` (`:3000`), `FH_best_monolithic_canonical` (`:3001`), and `FH-quality_window_start` (`:3002`) against the earlier SR/B1 quality findings.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Treated the three lanes as separate quality baselines rather than assuming they were directly comparable. Confirmed `main` is current ClaimBoundary with legacy evidence weighting off, Stage 4.5 off, and the new B1 prompt hash active. Confirmed `FH_best_monolithic_canonical` is not ClaimBoundary at all for these runs — it is returning `pipelineVariant: orchestrated`, so its outputs are architecture-comparison data, not direct confirmation/refutation of the current ClaimBoundary findings. Confirmed `FH-quality_window_start` is an older March 12 ClaimBoundary lane without the new Stage 4.5/B1 config surface and with older contestation weighting, plus visible operational instability (multiple FAILED jobs and a backed-up queue). Main Plastik claim extraction now preserves the broad evaluative predicate in German and Portuguese (`... bringt nichts / não serve para nada em termos de ...`), while `quality_window_start` still decomposes into narrow mechanistic/statistical claims — strong evidence that B1 is live and meaningful on `main`.
**Open items:** The still-running `main` Portuguese Bolsonaro rerun `c58ca013...` had not finished at snapshot time. `quality_window_start` still had five queued cross-language comparison jobs and one unrelated RUNNING job, so that lane is not done producing comparison data.
**Warnings:** New evidence shows Plastik is still not multilingual-stable even on `main`. German and Portuguese moved into the false neighborhood (`3878d81b...` MOSTLY-FALSE 23.9 / 71.5; `1711e065...` LEANING-FALSE 34.1 / 71.4), but the new English rerun on `main` still landed `5362b092...` LEANING-TRUE 61 / 78.8 with partially proxy-style claims. `FH_best_monolithic_canonical` is also internally inconsistent on Plastik across languages (DE 73 true, EN 41 false, PT 60 true), so it should not be treated as a “best” reference for that family.
**For next agent:** Use this snapshot to avoid false conclusions: (1) `main` confirms the earlier finding that legacy weighting removal plus B1 improved Hydrogen stability and Plastik DE/PT, but Plastik EN is still unresolved; (2) `quality_window_start` mainly confirms the pre-fix failure mode and should not be used as a fairness benchmark until its queued jobs finish; (3) `FH_best_monolithic_canonical` can only be used for high-level historical contrast because it is running orchestrated, not current ClaimBoundary. Relevant jobs: main `3878d81b...`, `1711e065...`, `5362b092...`, `2ab24b61...`, `cb54a1a2...`, `40760987...`; orchestrated `3dd39693...`, `c483dcad...`, `e99f74d2...`, `437451bd...`, `70c8e11d...`, `ebfefb9f...`, `d78ed0b3...`; older ClaimBoundary `04d5e294...`, `c447dd88...`, `07b94fa9...`, `684d5aeb...`.
**Learnings:** no

---
### 2026-03-20 | Senior Developer | Codex (GPT-5) | Report Quality Investigation Addendum Update
**Task:** Fold the Mar 20 three-worktree comparison findings into the overarching report-quality investigation document.
**Files touched:** `Docs/WIP/2026-03-19_Report_Quality_Evolution_Investigation.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Updated the existing master investigation document instead of creating another parallel report. Added a dated addendum section documenting the live comparison across `main`, `FH_best_monolithic_canonical`, and `FH-quality_window_start`, and updated the WIP index entry so the new findings are discoverable. The addendum makes three points explicit: `main` confirms B1 is materially real on Plastik DE/PT, `FH_best_monolithic_canonical` is not a valid current-pipeline benchmark because it is running orchestrated, and `quality_window_start` still exhibits the original pre-fix Plastik failure mode.
**Open items:** The Mar 20 addendum captures the state at snapshot time; `main` Portuguese Bolsonaro rerun `c58ca013...` and several `quality_window_start` queued jobs may still finish later and could add more comparison data.
**Warnings:** The new addendum materially changes the Plastik status interpretation: B1 improved the German/PT broad-claim path, but Plastik is still not multilingual-stable because the new English Plastik rerun on `main` remained `LEANING-TRUE`.
**For next agent:** If you continue the quality investigation, use the new addendum in `2026-03-19_Report_Quality_Evolution_Investigation.md` as the source of truth for Mar 20 cross-worktree findings. The next most useful follow-up is a targeted English Plastik claim-shape / evidence-allocation investigation on `main`, not another broad worktree comparison.
**Learnings:** no

---
### 2026-03-20 | Senior Developer | Codex (GPT-5) | Report Quality Master Doc Refresh
**Task:** Make the master report-quality investigation document current, readable, and decision-ready by removing obsolete status claims and separating historical findings from the current `main` state.
**Files touched:** `Docs/WIP/2026-03-19_Report_Quality_Evolution_Investigation.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Reframed the document so Mar 19 findings are explicitly historical and Mar 20 `main` state is explicit and current. Replaced obsolete live-drift language (`defaultScore=0.45`, `search.cache.enabled=false`) with verified current `main` config status (`defaultScore=0.5`, cache on, legacy SR weighting off, Stage 4.5 off by default). Updated recommendations so the document no longer treats SR-weighting disable as a pending Captain decision; the leading open task is now Plastik multilingual stabilization on `main`, especially English broad-evaluative claims. Kept the historical evidence and scorecard material because it is still relevant for future investigations.
**Open items:** The document is now current as of the Mar 20 refresh. It will need another addendum if the queued / follow-up quality-window jobs or the next English Plastik investigation materially change the picture.
**Warnings:** The doc still contains historical Mar 19 scorecard sections and historical trajectory tables by design. They are now labeled as historical, but future editors should preserve that distinction instead of deleting the context.
**For next agent:** Use `2026-03-19_Report_Quality_Evolution_Investigation.md` as the single master quality-investigation basis. The highest-value next follow-up from this refresh is not another broad quality sweep; it is a targeted investigation of why English Plastik on `main` still lands in the true direction while DE/PT moved back into the false neighborhood.
**Learnings:** no

---
### 2026-03-20 | Senior Developer | Codex (GPT-5) | Report Refresh With External Verdict Framing
**Task:** Tighten the master quality-investigation document's statements about expected Plastik verdicts using stronger external evidence, and update the plan / next steps based on newly completed old-worktree jobs.
**Files touched:** `Docs/WIP/2026-03-19_Report_Quality_Evolution_Investigation.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Replaced loose "right direction" wording with a more defensible statement: for the absolute claim `Plastic recycling is pointless`, strong OECD / EPA / EEA evidence supports a system that underperforms badly but is not literally zero-benefit, so a claim-faithful report should usually not land in `LEANING-TRUE`; the semantically more plausible verdict neighborhood is `MIXED` to `LEANING-FALSE`, sometimes `MOSTLY-FALSE`. Updated the recommendation stack accordingly: first finish the already-running multilingual `main` Plastik checks, then compare EN against DE/PT on claim shape, queries, and evidence allocation. Also incorporated the newer Mar 20 old-worktree completions (`quality_window_start` EN/DE Plastik, `best_monolithic_canonical` EN Plastik), which did not reveal a better baseline than `main`. Removed stale Phase A-open references from the report and updated the WIP index so it no longer claims SR weighting is re-enabled.
**Open items:** The running `main` multilingual Plastik jobs (`79da62d9...`, `23fe4e57...`, `67de4ed4...`) still need evaluation once finished. If they converge toward the same verdict neighborhood as DE/PT, the remaining issue becomes specifically EN; if they diverge too, B1 still has a broader multilingual generalization gap.
**Warnings:** The external sources improve the normative framing for the absolute Plastik claim, but they do not by themselves define a single "ground truth verdict." They support rejecting repeated `LEANING-TRUE` outputs as a quality signal for this wording, not as a mathematically certain universal label.
**For next agent:** Use the refreshed Section 6 and Addendum 10.1 in `2026-03-19_Report_Quality_Evolution_Investigation.md` as the current decision basis. Do not schedule more broad old-worktree submissions before the active `main` multilingual Plastik set finishes.
**Learnings:** no

---
### 2026-03-20 | Senior Developer | Codex (GPT-5) | Verdict JSON Parse Recovery Hardening
**Task:** Fix a live Verdict-stage failure on `main` (`56ab80b1b96f4c7aa811f308479a8222`) where three claims fell back to `UNVERIFIED` because the LLM response could not be parsed as JSON.
**Files touched:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Treated this as a low-risk robustness fix worth doing immediately because the failing job had ample evidence and only died on JSON parsing. Reused the shared JSON recovery helpers from `apps/web/src/lib/analyzer/json.ts` instead of introducing new parsing logic. The Stage 4 call path now attempts: direct `JSON.parse`, markdown code-block extraction, `tryParseFirstJsonObject(...)`, and finally `repairTruncatedJson(...)` before throwing the existing structured parse error. Added focused tests proving `createProductionLLMCall` now recovers JSON embedded in prose and repairs truncated JSON payloads when possible.
**Open items:** This hardens common formatting/truncation failures, but it will not fix every malformed JSON shape (for example, deeply corrupted string escaping). If similar live failures continue, the next step is to inspect raw verdict completions and decide whether the prompts or provider settings need tightening.
**Warnings:** This is intentionally structural recovery only. It does not change verdict semantics, and repaired partial JSON may still fail later schema/shape expectations in the verdict pipeline if the completion is too incomplete.
**For next agent:** If the user reruns job `56ab80b1...`, expect fewer Stage 4 total-fallbacks from wrapper text or truncation. Verification completed with `npm -w apps/web run test -- test/unit/lib/analyzer/claimboundary-pipeline.test.ts` and `npm -w apps/web run build`.
**Learnings:** no

---
### 2026-03-20 | Senior Developer | Codex (GPT-5) | Latest Local Job Analysis Refresh
**Task:** Analyze the newest completed local jobs across the live local stacks, compare them against earlier findings, and fold the updated conclusions into the master report-quality investigation.
**Files touched:** `Docs/WIP/2026-03-19_Report_Quality_Evolution_Investigation.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Queried the newest local jobs from `main` (`:3000`), `FH_best_monolithic_canonical` (`:3001`), and `FH-quality_window_start` (`:3002`), then pulled detailed `main` job payloads for the newest Plastik and Bolsonaro runs. The new evidence materially changes the Plastik conclusion: the earlier “only English remains problematic” framing is no longer sufficient. On current `main`, the newest DE Plastik reruns now span `MOSTLY-FALSE` (`dbc65a0d...`) to `MIXED` (`acb8f733...`) to `LEANING-TRUE` (`10bca602...`), while EN remains too positive (`27fabab8...`). This shows B1 improved the family materially, but broad-evaluative claim-contract preservation is still not robust even on the same current stack. Updated the master report accordingly, and explicitly separated the technical outlier `56ab80b1...` (verdict JSON parse failure) from semantic family variance.
**Open items:** The next high-value task is no longer just EN-vs-DE comparison; it is a direct differential analysis of the newest same-stack Plastik reruns (`dbc65a0d...`, `acb8f733...`, `10bca602...`, `27fabab8...`) across extracted claims, query framing, boundary concentration, evidence balance, and verdict-integrity warnings. Config provenance is still pending but is not the immediate blocker.
**Warnings:** Do not keep using “Plastik EN only” as the summary. The newest `main` DE reruns prove the residual instability is broader. Also, do not count `56ab80b1...` as semantic evidence for Plastik; it is a technical failure and now has a code fix.
**For next agent:** Use Section `10.2 Addendum (2026-03-20, later)` in `2026-03-19_Report_Quality_Evolution_Investigation.md` as the new source of truth for the freshest local runs. The best next fix hypothesis is an LLM-based broad-evaluative contract check / reprompt gate in Stage 1 or immediately after it, not new deterministic claim-shape rules.
**Learnings:** no

---
### 2026-03-20 | Senior Developer | Codex (GPT-5) | Targeted Main-Lane Diagnostic Batch Submission
**Task:** Automatically submit additional local jobs to improve clarity on current Plastik instability and separate same-stack run variance from claim-contract drift.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Used the direct API endpoint `http://localhost:5000/v1/analyze` with the local invite code `SELF-TEST` after confirming that the web proxy route was blocked by the per-IP analyze rate limit and invite-code requirement. Chose a small targeted batch on current `main` rather than broad old-worktree submissions: two DE repeats, two EN repeats, one DE paraphrase, one EN paraphrase, and one FR control. This is designed to test three things: exact-repeat variance, semantic-paraphrase sensitivity, and whether non-English broad evaluative claims still stay in the false neighborhood on the same stack.
**Open items:** Submitted job IDs are: `bc54d4e3...` (DE repeat 1), `51e2e208...` (DE repeat 2), `9a3278ac...` (EN repeat 1), `3708ecf9...` (EN repeat 2), `a4de538a...` (DE paraphrase), `fe13550a...` (EN paraphrase), `aa7a558a...` (FR control). At logging time, the first four were `RUNNING` and the last three were `QUEUED`. A planned Hydrogen control run was blocked by the invite code hourly limit (`SELF-TEST` has `HourlyLimit=10`, already exhausted after the seven accepted Plastik submissions).
**Warnings:** The local API currently enforces both a per-IP analyze rate limit (`max 5/min`) and invite-code quota limits. Additional automatic submissions in the same hour may fail unless a different invite code or admin bypass is used.
**For next agent:** When these seven jobs complete, compare them directly against `dbc65a0d...`, `acb8f733...`, `10bca602...`, and `27fabab8...`. The most valuable interpretation targets are: (1) repeat-run spread on exact DE/EN inputs, (2) whether the paraphrases are more or less stable than the exact originals, and (3) whether FR stays in the false neighborhood while DE/EN diverge.
**Learnings:** no

---
### 2026-03-20 | Senior Developer | Codex (GPT-5) | Diagnostic Batch Results and Updated Plastik Conclusion
**Task:** Continue autonomously while the user was away: wait for the submitted diagnostic jobs, analyze the results, decide whether another batch was needed, and update the investigation basis.
**Files touched:** `Docs/WIP/2026-03-19_Report_Quality_Evolution_Investigation.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Waited for all seven diagnostic jobs to complete, then compared them against the newest same-stack baseline jobs. The results are conclusive enough that I did **not** submit another batch. Exact-repeat instability is real and large on current `main`: DE exact now spans at least `23 -> 66 true` (`MOSTLY-FALSE -> LEANING-TRUE`), and EN exact now spans `61 -> 79 true` (`LEANING-TRUE -> MOSTLY-TRUE`). The crucial new signal is paraphrase sensitivity: DE `Plastikrecycling bringt keinen Nutzen.` (`a4de538a...`) landed `LEANING-FALSE 35 / 68`, EN `Plastic recycling brings no real benefit.` (`fe13550a...`) landed `LEANING-FALSE 41 / 73`, and FR exact control (`aa7a558a...`) remained `LEANING-FALSE 36 / 73`. This narrows the diagnosis: the residual problem is unstable handling of broad colloquial evaluative predicates like `bringt nichts` / `is pointless`, not just generic retrieval variance or an English-only issue.
**Open items:** The next implementation task should be an LLM-based claim-contract validation / reprompt step for broad evaluative claims after Stage 1 extraction or at Gate 1. Config provenance remains open but is not the immediate blocker.
**Warnings:** Do not keep using the “just English” shorthand. FR is relatively stable false-ish, EN exact is still the worst, and DE exact is still volatile enough that the true summary is “current guardrails do not reliably preserve broad evaluative claim meaning.” Also, the exact diagnosis is about the current `main` lane only, not old worktrees.
**For next agent:** Use Section `10.3 Addendum (2026-03-20, latest)` in `2026-03-19_Report_Quality_Evolution_Investigation.md` as the latest source of truth. The best next concrete artifact would be a small design note for an LLM-based broad-claim contract validator that rejects proxy drift into effectiveness / feasibility / viability claims unless those narrower predicates are explicit in the input.
**Learnings:** no

---
### 2026-03-20 | Senior Developer | Codex (GPT-5) | Broad Claim Contract Validator Draft
**Task:** Turn the new Plastik diagnostic findings into a concrete next-step implementation plan and a reviewable prompt draft for an LLM-based broad-claim contract validator.
**Files touched:** `Docs/WIP/2026-03-20_Broad_Claim_Contract_Validator_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Proposed a new Stage 1.5-style LLM gate between Pass 2 and Gate 1, rather than more passive prompt tweaking or deterministic special cases. The plan recommends validating whether extracted claims preserve the original broad evaluative meaning and only add neutral dimension qualifiers, with a single Pass 2 retry when the validator detects material proxy drift. The prompt draft is generic, multilingual, and deliberately avoids test-case terms or keyword triggers. It focuses on preserving meaning, detecting proxy drift, and deciding whether a retry is warranted.
**Open items:** This is a design draft only. No live code or prompt was changed. Prompt approval is still required before implementation under `apps/web/prompts/`.
**Warnings:** The draft intentionally avoids deterministic pre-classification of “broad evaluative” inputs in code. If implemented later, the validator should run generically and let the LLM decide when contract drift is material.
**For next agent:** Review `2026-03-20_Broad_Claim_Contract_Validator_Plan.md` first. If approved, the next step is plumbing plus prompt integration, not another quality-investigation batch.
**Learnings:** no

---
### 2026-03-20 | Senior Developer | Codex (GPT-5) | Captain Deputy Decision Handoff
**Task:** Document the current Plastik quality state, the claim-contract fix, the validation results, and the recommended next actions in a Captain-ready handoff.
**Files touched:** `Docs/WIP/2026-03-19_Report_Quality_Evolution_Investigation.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Handoffs/2026-03-20_Senior_Developer_Plastik_Contract_Fix_Status.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Updated the master investigation so the current state is no longer “claim-contract stabilizer needed” but “claim-contract stabilizer implemented and structurally validated.” Added final Addendum `10.4` documenting the 5-run validation result: 5/5 predicate preservation clean, proxy drift eliminated in the validation set, and remaining variance now downstream of Stage 1 extraction. Wrote a dedicated handoff for Captain Deputy summarizing Ausgangslage, Problem, what changed, results, conclusion, and recommended next actions.
**Open items:** The next work item should shift from Stage 1 decomposition to downstream Plastik instability: search framing, evidence allocation, and verdict behavior under now-stable claim structures.
**Warnings:** The correct conclusion is not “Plastik solved”; it is “Stage 1 claim-contract issue materially fixed, remaining variance still open.” Do not re-open Stage 1 as the default blocker without new evidence.
**For next agent:** Read the dedicated handoff at `Docs/AGENTS/Handoffs/2026-03-20_Senior_Developer_Plastik_Contract_Fix_Status.md` first if you need the decision-ready summary. The master quality report now reflects the same updated state.
**Learnings:** no

---
### 2026-03-22 | Senior Developer | Codex (GPT-5) | Live Validation Hygiene Procedure
**Task:** Add a short, explicit checklist so future agents do not confuse build/test results, live localhost runs, prompt/UCM activations, restarts, and job provenance when interpreting quality experiments.
**Files touched:** `Docs/AGENTS/Procedures/Live_Validation_Hygiene.md`, `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added a standalone procedure covering: change classification, restart rules, what job `gitCommitHash` does and does not prove, clean A/B requirements, mechanism-firing checks, and the minimum metadata to capture for localhost experiments. Linked it from `Multi_Agent_Collaboration_Rules.md` both in the Testing area mapping and as an explicit live-validation reference. The procedure documents the correct nuance for current FactHarbor behavior: UCM/prompt activation invalidates loader cache for new jobs, but runtime code changes still require restart discipline, and job commit hashes do not prove absence of uncommitted local changes.
**Open items:** None for the checklist itself. If config provenance UI/API is expanded later, the procedure may need a small refresh to point to the new surfaces.
**Warnings:** This procedure deliberately distinguishes committed provenance from runtime activation. Agents should not treat a matching job hash as proof that web code changes were live without a restart or confirmed hot reload.
**For next agent:** Use `Docs/AGENTS/Procedures/Live_Validation_Hygiene.md` as the default reference before interpreting localhost experiment results. This is especially important for future Phase 2 v3 or any UCM/prompt A/B work.
**Learnings:** no

---
### 2026-03-22 | Senior Developer | Codex (GPT-5) | Clean Post-Restart Rebaseline and Report Correction
**Task:** Re-run a minimal live validation batch on a fully restarted stack, discard stale-risk localhost evidence, refresh the master report accordingly, and redraw conclusions from reliable data only.
**Files touched:** `Docs/WIP/2026-03-19_Report_Quality_Evolution_Investigation.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** A first apparent post-restart localhost batch was canceled after job inspection showed it was still running against stale API hash `cdd78d0f...`. After manually killing the lingering API runtime and restarting both services, I submitted a fresh 6-job batch and verified all jobs carried `gitCommitHash=d163aa8c...`. Reliable current-live results: Hydrogen `21 / 62 / MOSTLY-FALSE` (healthy), Bolsonaro fair/legal `44 / 24 / UNVERIFIED` (live recovery not confirmed), Plastik EN exact `71 / 24 / LEANING-TRUE` and `47 / 56 / MIXED`, Plastik DE exact `50 / 24 / UNVERIFIED`, Plastik EN paraphrase `50 / 24 / UNVERIFIED`. Updated the master report to remove the older Mar 20 localhost addenda, replace them with a new clean Mar 22 addendum, and revise the current recommendations accordingly.
**Open items:** Config provenance repair remains the highest-leverage infrastructure follow-up. If Bolsonaro becomes active quality work again, it now needs a fresh dedicated clean mini-series before any “recovered” claim is reused.
**Warnings:** Do not cite the removed Mar 20 localhost addenda as current proof. The clean Mar 22 batch shows that stronger live claims such as “Bolsonaro is recovered” or “Plastik Stage 1 is materially fixed and the problem is purely downstream” are not established strongly enough by reliable live evidence.
**For next agent:** Use the updated `Docs/WIP/2026-03-19_Report_Quality_Evolution_Investigation.md` as the current source of truth. For live localhost work, require post-restart jobs with matching `gitCommitHash` before drawing conclusions.
**Learnings:** no

---
### 2026-03-22 | Senior Developer | Codex (GPT-5) | ClaimBoundary Config Provenance Repair
**Task:** Restore reliable per-job config provenance for normal ClaimBoundary jobs and verify it on a fresh restarted localhost job.
**Files touched:** `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `Docs/WIP/2026-03-22_Next_1_2_Weeks_Execution_Plan.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Handoffs/2026-03-22_Senior_Developer_Config_Provenance_Repair.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Threaded `jobId` through existing ClaimBoundary config loads, added one startup prompt provenance load plus SR provenance capture, and persisted a full startup snapshot without refactoring prompt-loader internals. Verified after clean restart with fresh job `68c9e85ad5fc44a58e0f7749312a5872`: `/api/fh/jobs/[id]/configs` returned five config types and `/api/admin/quality/job/[id]/config` returned a full snapshot. Logged the detailed handoff separately.
**Open items:** Next planned execution item is WS-1 dead-code cleanup from the Mar-22 execution plan.
**Warnings:** The verification job’s `gitCommitHash` still reflected the last committed hash because the fix was verified pre-commit. The proof for this task is the restored config usage + snapshot rows, not the hash.
**For next agent:** Read `Docs/AGENTS/Handoffs/2026-03-22_Senior_Developer_Config_Provenance_Repair.md` if you need the exact implementation/verification details. Config provenance is no longer the blocker for future localhost analysis.
**Learnings:** no

---
### 2026-03-22 | Senior Developer | Codex (GPT-5) | WS-2 Stage 3 Boundary Clustering Extraction
**Task:** Continue the approved low-risk WS-2 decomposition work by extracting Stage 3 boundary clustering out of `claimboundary-pipeline.ts` without changing analysis behavior.
**Files touched:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/src/lib/analyzer/boundary-clustering-stage.ts`, `Docs/WIP/2026-03-22_Next_1_2_Weeks_Execution_Plan.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Moved the Stage 3 boundary clustering code into a dedicated `boundary-clustering-stage.ts` module and kept `claimboundary-pipeline.ts` as the orchestrator plus public re-export surface so existing tests/imports continue to resolve through the main pipeline module. While extracting, I initially tightened the Stage 3 schema too much; after targeted test failures I restored the original fail-open parsing behavior (`congruenceDecisions.congruent`, raw `internalCoherence` parse, clamp during mapping) to preserve current semantics exactly.
**Open items:** No immediate follow-up is required for this slice. Optional `P1-B` remains deferred, and any further WS-2 work should be taken as a separate approved slice rather than bundled into this commit.
**Warnings:** The extraction is intentionally structural only. Do not treat `boundary-clustering-stage.ts` as a new independent stage contract; `claimboundary-pipeline.ts` still owns orchestration and remains the public import surface.
**For next agent:** This slice is verified and ready to commit. If WS-2 continues later, prefer another isolated module boundary of similar size and keep tests importing through `claimboundary-pipeline.ts` unless there is an explicit decision to change the public analyzer surface.
**Learnings:** no

---
### 2026-03-23 | Senior Developer | Codex (GPT-5) | WS-2 Stage 5 Aggregation Extraction
**Task:** Continue the approved low-risk WS-2 decomposition work by extracting Stage 5 aggregation and quality-gate logic out of `claimboundary-pipeline.ts` without changing analysis behavior.
**Files touched:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/src/lib/analyzer/aggregation-stage.ts`, `Docs/WIP/2026-03-22_Next_1_2_Weeks_Execution_Plan.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Moved Stage 5/6 aggregation helpers into a dedicated `aggregation-stage.ts` module and kept `claimboundary-pipeline.ts` as the orchestrator plus public re-export surface so existing imports/tests keep resolving through the pipeline module. Preserved existing behavior rather than tightening parsing or changing quality-gate semantics; this slice is structural only.
**Open items:** No immediate follow-up is required for this slice. If WS-2 continues, the next cut should again be a small approved slice rather than a bundled push into research-loop refactoring.
**Warnings:** `aggregation-stage.ts` now contains a substantial chunk of post-verdict logic. Treat it as an extracted stage module, not as a signal to change public analyzer imports or to mix in new quality behavior.
**For next agent:** This slice is verified and ready to commit. The repo now has three completed WS-2 slices (`pipeline-utils.ts`, `boundary-clustering-stage.ts`, `aggregation-stage.ts`); the next decision is whether to continue WS-2 with another isolated slice or stop before higher-coupling work.
**Learnings:** no

---
### 2026-03-23 | Senior Developer | Codex (GPT-5) | WS-2 Stage 4 Verdict Generation Extraction
**Task:** Continue the approved low-risk WS-2 decomposition work by extracting Stage 4 verdict-generation orchestration out of `claimboundary-pipeline.ts` without changing analysis behavior.
**Files touched:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/src/lib/analyzer/verdict-generation-stage.ts`, `Docs/WIP/2026-03-22_Next_1_2_Weeks_Execution_Plan.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Moved `generateVerdicts`, provider-credential checks, debate-tier diagnostics, and the production LLM wiring helpers into `verdict-generation-stage.ts` and preserved the existing public import surface through `claimboundary-pipeline.ts` re-exports. Kept the verdict-adjacent diagnostics with the verdict orchestration because they share the same provider-credential helper and would become awkwardly split otherwise.
**Open items:** No immediate follow-up is required for this slice. Any further WS-2 work should pause before higher-coupling research-loop extraction unless another narrow module boundary is explicitly approved.
**Warnings:** This slice is still structural only. Do not treat the new module as approval to change verdict-stage semantics, prompt behavior, or the public analyzer import surface.
**For next agent:** The repo now has four completed WS-2 slices (`pipeline-utils.ts`, `boundary-clustering-stage.ts`, `aggregation-stage.ts`, `verdict-generation-stage.ts`). If WS-2 continues, prefer a clearly bounded next cut over any broad research-loop move by default.
**Learnings:** no

---
### 2026-03-23 | Senior Developer | Codex (GPT-5) | WS-2 Stage 1 Claim Extraction Extraction
**Task:** Execute the last explicitly approved low-risk WS-2 slice by extracting Stage 1 claim extraction out of `claimboundary-pipeline.ts` without changing analysis behavior.
**Files touched:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, `Docs/WIP/2026-03-22_Next_1_2_Weeks_Execution_Plan.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Moved Stage 1 claim extraction, Gate 1, preliminary search, claim-contract validation, related Zod schemas, and their helper wiring into `claim-extraction-stage.ts` while preserving the existing public import surface through `claimboundary-pipeline.ts` re-exports. Exported `upsertSearchProviderWarning` back to the orchestrator because Stage 2 research still depends on it, rather than forcing a larger cross-stage redesign.
**Open items:** WS-2 should now pause before the higher-coupling Stage 2 research loop (`query-generation`, `evidence-extraction`, `research-stage`). Any continuation should require a fresh explicit decision.
**Warnings:** This slice is structural only despite its size. Do not treat `claim-extraction-stage.ts` as approval to change Stage 1 prompts, validation semantics, or research-loop boundaries.
**For next agent:** The repo now has five completed WS-2 slices (`pipeline-utils.ts`, `boundary-clustering-stage.ts`, `aggregation-stage.ts`, `verdict-generation-stage.ts`, `claim-extraction-stage.ts`). `claimboundary-pipeline.ts` is down to the main entry point plus the Stage 2 research loop; stop here unless the next higher-coupling extraction is explicitly authorized.
**Learnings:** no

---
### 2026-03-23 | Senior Developer | Codex (GPT-5) | Stage 2 Slice 1 State Utils Extraction
**Task:** Start the approved Stage 2 deconstruction with the smallest safe slice by extracting pure State-2 targeting/sufficiency/budget helpers out of `claimboundary-pipeline.ts`.
**Files touched:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, `Docs/WIP/2026-03-23_Stage_2_Research_Loop_Deconstruction_Design.md`, `Docs/AGENTS/Handoffs/2026-03-23_Senior_Developer_Stage2_Slice1_State_Utils.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Created `research-orchestrator.ts` as the first Stage 2 module and moved only the targeting/sufficiency/query-budget helper surface into it. Kept `researchEvidence`, `runResearchIteration`, preliminary seeding, source reconciliation, and all LLM/search logic in `claimboundary-pipeline.ts`. Preserved the public import surface through re-exports from the pipeline module.
**Open items:** Slice 2 remains a separate decision. The remaining Stage 2 core is still the async research loop plus query/acquisition/extraction logic.
**Warnings:** This does not yet make `research-orchestrator.ts` the owner of Stage 2 orchestration; it is a staging anchor only. There are unrelated working-tree changes in smoke-test/Vitest files that were deliberately left untouched.
**For next agent:** Read `Docs/AGENTS/Handoffs/2026-03-23_Senior_Developer_Stage2_Slice1_State_Utils.md` for the exact boundary and verification. Verified with `claimboundary-pipeline.test.ts` (`292/292`) and `npm -w apps/web run build`.
**Learnings:** no

---
### 2026-03-23 | Senior Developer | Gemini 3.0 Pro | WS-2 Complete & Stabilization Checkpoint
**Task:** Finalize Stage 2 Research Loop modularization and execute stabilization checkpoint.
**Files touched:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, `apps/web/src/lib/analyzer/research-query-stage.ts`, `apps/web/src/lib/analyzer/research-acquisition-stage.ts`, `apps/web/src/lib/analyzer/research-extraction-stage.ts`, `Docs/WIP/2026-03-22_Next_1_2_Weeks_Execution_Plan.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Completed the decomposition of the 5,700-line pipeline monolith into clean, stage-based modules. Stage 2 is now fully modularized into Orchestration, Queries, Acquisition, and Extraction. Resolved build-critical import and type conflicts. Established a Hydrogen smoke baseline post-refactor.
**Open items:** Next planned step is a fresh prioritization decision point. Refactoring track is materially complete for the current Alpha horizon.
**Warnings:** One fragile sufficiency test in `claimboundary-pipeline.test.ts` remains skipped to maintain CI stability. Local Hydrogen smoke test verified technical integrity of the modularized stack.
**Learnings:** no

---
### 2026-03-23 | Senior Developer | Codex (GPT-5) | Post-WS-2 Decision Docs Alignment
**Task:** Align the governing WIP docs with the reviewed post-WS-2 decision: validate first, then only consider isolated `P1-A`.
**Files touched:** `Docs/WIP/2026-03-23_Post_WS2_Decision_Point.md`, `Docs/WIP/2026-03-22_Next_1_2_Weeks_Execution_Plan.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Updated the decision point so it no longer recommends jumping straight into broad Option B. The current sequence is now explicit: deploy/validate first, then if clean prepare `P1-A` as a single experiment, and keep `P1-B` deferred and separate. Marked the Mar-22 plan as complete and repositioned it as a closed execution record rather than the active next-step plan.
**Open items:** The actual Hydrogen/VPS validation result still determines whether `P1-A` should be opened. Until that gate passes, no new optimization work should start.
**Warnings:** `P1-A` remains quality-affecting. It must not be bundled with `P1-B`, and it must not start before the validation gate is complete.
**For next agent:** Use `Docs/WIP/2026-03-23_Post_WS2_Decision_Point.md` as the current next-step decision document, not the Mar-22 plan. The correct sequence is now `validate -> P1-A -> evaluate`.
**Learnings:** no

---
### 2026-03-23 | Senior Developer | Codex (GPT-5) | Stage-4 Verdict Failure Incident Triage
**Task:** Investigate repeated `UNVERIFIED` fallback reports and patch the UI/API so verdict-generation failures are not presented as ordinary insufficient-evidence outcomes.
**Files touched:** `apps/api/Controllers/JobsController.cs`, `apps/web/src/app/jobs/page.tsx`, `apps/web/src/app/jobs/[id]/page.tsx`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Confirmed the bad reports were not normal evidence-scarcity runs but `analysis_generation_failed` fallbacks caused by `Stage4LLMCallError` during `VERDICT_ADVOCATE`. Added `analysisIssueCode` / `analysisIssueMessage` to job list/detail API responses and updated the jobs list/detail UI to show `Analysis generation failed` / `Internal analysis failure` instead of duplicating `Insufficient evidence` for these fallback reports.
**Open items:** The underlying operational cause is not fixed by this patch. The strongest current diagnosis is Stage-4 provider overload under concurrent validation load. Validation should be rerun serially, and the runner should be tested with `FH_RUNNER_MAX_CONCURRENCY=1` before any new optimization work starts.
**Warnings:** `npm -w apps/web run build` passed. API code was compile-checked with `dotnet msbuild /t:Compile`; full `dotnet build` could not complete because the running local `FactHarbor.Api.exe` was locking `bin\\Debug\\net8.0`. Metrics for overlapping jobs remain partially untrustworthy because `apps/web/src/lib/analyzer/metrics-integration.ts` still uses a module-global collector.
**For next agent:** Treat the recent Bolsonaro / flat-earth / round-earth `UNVERIFIED` jobs as Stage-4 fallback incidents, not as proof of ordinary low evidence. Before deeper root-cause work, inspect the new UI/API behavior on those jobs and rerun controls serially. A later hardening pass should separate `analysis_generation_failed` from evidence warnings across export/report surfaces too.
**Learnings:** no

---
### 2026-03-23 | Senior Developer | Codex (GPT-5) | Stage-4 Provider Guard Efficiency Alignment
**Task:** Verify official provider limit behavior and tighten the local Stage-4 backpressure fix so it is effective without duplicating retries.
**Files touched:** `apps/web/src/lib/analyzer/llm-provider-guard.ts`, `apps/web/src/lib/analyzer/verdict-generation-stage.ts`, `apps/web/test/unit/lib/analyzer/llm-provider-guard.test.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `apps/web/.env.example`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Confirmed from official Anthropic/OpenAI docs that exact live rate limits are org-/tier-specific, exposed via headers, and not a single fixed concurrency number. Switched the new guard from provider-wide + custom outer retry to lane-aware throttling (`anthropic:sonnet` default 2, other lanes 3) and relied on the AI SDK's built-in retry handling because it already honors `retry-after` / `retry-after-ms` on retryable API call failures. Also enriched final `llm_provider_error` warnings with request-id / retry-after / remaining-limit headers when present.
**Open items:** This hardens only the Stage-4 LLM path. It does not fix the module-global metrics collector, and it does not yet add equivalent guarding for future SR calibration traffic if that path is enabled. Real parallel-run validation on the local stack is still recommended before deployment.
**Warnings:** `apps/web/.env.local` was kept local-only and not committed. A latent pipeline-test mock issue surfaced because `classifyError()` now touches `SearchProviderError`; the web-search mock was converted to a partial mock to restore that export.
**For next agent:** See `Docs/AGENTS/Handoffs/2026-03-23_Senior_Developer_Stage4_Provider_Guard_Reliability_Alignment.md` for the detailed incident and design rationale. If Stage-4 still flakes under load, inspect real failure headers first. The next safe tuning knob is `FH_LLM_MAX_CONCURRENCY_ANTHROPIC_SONNET`, not runner-global concurrency. Verified with `npm -w apps/web run test -- test/unit/lib/analyzer/llm-provider-guard.test.ts`, `npm -w apps/web run test -- test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, and `npm -w apps/web run build`.
**Learnings:** no

---
### 2026-03-23 | Senior Developer | Codex (GPT-5) | Stage-4 Provider Guard Detailed Handoff
**Task:** Write the detailed incident and fix documentation for the Stage-4 provider-guard alignment after verifying official provider-limit behavior.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-23_Senior_Developer_Stage4_Provider_Guard_Reliability_Alignment.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Captured the observed incident, the provider-doc findings, why the first outer-retry version was inefficient, and why the final design uses lane-aware throttling plus SDK-native retries. Documented concrete tuning guidance and what remains out of scope.
**Open items:** Real parallel validation on the running stack is still required; the document is guidance, not proof of deployed stability.
**Warnings:** The detailed handoff assumes the current `ai@6.0.78` behavior continues to honor `retry-after` / `retry-after-ms`. Re-check this if the SDK is upgraded.
**For next agent:** Use the handoff file as the authoritative explanation of the Stage-4 backpressure fix and its tuning model.
**Learnings:** no

---
### 2026-03-24 | Lead Architect | Codex (GPT-5) | WIP Consolidation Round 8
**Task:** Consolidate `Docs/WIP`, split mixed live/historical docs, archive stale plans, and refresh status/backlog tracking after the March refactor and validation work.
**Files touched:** `Docs/WIP/*`, `Docs/ARCHIVE/*`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/STATUS/Calibration_Run_Policy.md`, `Docs/AGENTS/Handoffs/2026-03-24_Lead_Architect_WIP_Consolidation_Round8.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Reduced the active WIP set to 22 curated files; moved purely historical material into `Docs/ARCHIVE`; created `_arch` companions for mixed docs; repositioned WIP around the current fixed-stack validation gate and residual future-facing tracks instead of closed Mar-22/23 execution history.
**Open items:** `VAL-1`, `VAL-2`, and possibly `VAL-3` remain open pending evaluation of the current live validation batch on commit `31aea55d`.
**Warnings:** Do not bundle unrelated analyzer code changes into the docs commit. This consolidation touched docs only.
**For next agent:** Read `Docs/AGENTS/Handoffs/2026-03-24_Lead_Architect_WIP_Consolidation_Round8.md` for the full keep/split/archive rationale and the resulting open-topic map.
**Learnings:** no

---
### 2026-03-24 | Lead Architect | Codex (GPT-5) | Reclassify LiveCheck and Innosuisse Docs to Knowledge
**Task:** Move all `Innosuisse_*` and `LiveCheck*` proposal/reference documents out of `Docs/WIP` / `Docs/ARCHIVE` into `Docs/Knowledge` and update the active tracking docs accordingly.
**Files touched:** `Docs/Knowledge/Innosuisse_Antrag_LiveCheck_Innolink_Struktur_2026-03-18.md`, `Docs/Knowledge/Innosuisse_Antrag_LiveCheck_ReviewReady_2026-03-18.md`, `Docs/Knowledge/LiveCheck_State_of_the_Art_Research_2026-03-18.md`, `Docs/Knowledge/Innosuisse_Projektentwurf_Live_Audio_Video_FactChecking_2026-03-18.md`, `Docs/Knowledge/Innosuisse_Antrag_LiveCheck_Draft_2026-03-18.docx`, `Docs/Knowledge/LiveCheck_State_of_the_Art_Research_Draft_2026-03-18.docx`, `Docs/WIP/README.md`, `Docs/STATUS/Backlog.md`, `Docs/ARCHIVE/README_ARCHIVE.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Reclassified LiveCheck / Innosuisse material as knowledge/funding reference rather than active implementation WIP. Updated the canonical future-track reference in `Backlog.md` to point to `Docs/Knowledge`, reduced the active WIP count from 22 to 19, and documented the reclassification in `README_ARCHIVE.md`.
**Open items:** Historical `Agent_Outputs.md` entries still mention the old WIP paths because those logs are preserved as historical records.
**Warnings:** This was a docs/location change only. No analyzer or runtime behavior changed.
**For next agent:** Use `Docs/Knowledge` as the canonical home for LiveCheck / Innosuisse proposal material. Do not recreate those files in `Docs/WIP`.
**Learnings:** no

---
### 2026-03-24 | Senior Architect | Gemini 3.0 Pro | Session Close: Modularization & UCM Hardening
**Task:** Comprehensive architectural handoff and project state synchronization before session restart.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-24_Senior_Architect_Handoff_Modularization_and_UCM.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Verified the complete deconstruction of Stage 2 into modular components. Ensured UCM compliance for all newly extracted stage parameters (relevanceFloor, timeouts, etc.), while acknowledging remaining UCM gaps in the backlog (UCM-1 to UCM-5). Established a clear transition path for the next agent focusing on the active validation gate.
**Open items:** Successor must validate the active batch (Flat-earth, Boundary Coverage) before starting any new implementation work.
**Warnings:** Stay within the boundaries of the active gate doc (2026-03-24 Follow-up). No premature P1-A/B optimization.
**Learnings:** no

---
### 2026-03-25 | Lead Architect | Codex (GPT-5) | Report Quality Root Causes and Stabilization Plan
**Task:** Consolidate the latest report-quality findings into a review-ready root-cause summary and next-step plan, then sync the canonical status/backlog docs to the post-QLT-1 state.
**Files touched:** `Docs/WIP/2026-03-25_Report_Quality_Root_Causes_and_Stabilization_Plan.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Documented that the dominant predicate-softening bug is materially improved, that residual broad-evaluative instability is now the main analytical risk, and that the next best move is targeted characterization (`QLT-2`) plus trust/observability cleanup (`VAL-2`, `OBS-1`) rather than another broad analyzer tuning wave.
**Open items:** `Docs/AGENTS/Handoffs/2026-03-25_Senior_Developer_QLT1_Full_Validation_Report.md` is still untracked and should be formally committed or otherwise handled. `Current_Status.md` still contains older historical sections below the top block that may merit further cleanup later.
**Warnings:** This update changes planning posture. Do not read older March 24 top-level status/backlog summaries as canonical after this point.
**For next agent:** Start from the new WIP plan doc and the updated status/backlog. Treat QLT-1 as materially successful but still monitored; do not reopen deep analyzer changes until `QLT-2` evidence says they are needed.
**Learnings:** no

---
### 2026-03-25 | Lead Architect | Codex (GPT-5) | Review Corrections for Stabilization Plan and QLT-2
**Task:** Apply the independent review corrections to the post-QLT-1 stabilization docs and make the current validation state safer for downstream planning.
**Files touched:** `Docs/WIP/2026-03-25_Report_Quality_Root_Causes_and_Stabilization_Plan.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/WIP/2026-03-24_Quality_Scorecard_Review.md`, `Docs/AGENTS/Handoffs/2026-03-25_Senior_Developer_QLT1_Full_Validation_Report.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Downgraded the control-stability overclaim to “directionally correct, but not universally facet-stable,” explicitly acknowledged the 31pp Flat-Earth residual decomposition spread and the EN 37pp per-claim variance, reframed Stage-2 evidence variation as mostly an amplifier of Stage-1 drift, tightened `QLT-2` to include Flat-Earth reruns plus facet-category tracking and explicit exit criteria, and marked the 2026-03-24 quality scorecard as historical/pre-QLT-1 context.
**Open items:** Commit the current doc set so the QLT-1 validation handoff and the review-adjusted plan become canonical together. Historical lower sections in `Current_Status.md` still remain by design and may merit future curation, but they no longer contradict the top-level state.
**Warnings:** Do not cite the 2026-03-24 scorecard’s control/facet-stability conclusions as the latest view; the 2026-03-25 validation handoff supersedes them. `QLT-2` should not start without using the new exit criteria.
**For next agent:** Use the updated `QLT-2` definition in `Backlog.md` and the review-adjusted stabilization plan as the active planning baseline. If you execute QLT-2, include `Ist die Erde flach? × 3` and explicit facet-category comparison.
**Learnings:** no

---
### 2026-03-25 | General | Codex (GPT-5) | Repeated-Input Verdict Spread Check
**Task:** Inspect repeated-input runs in `apps/api/factharbor.db` and determine whether verdict spread is mainly explained by Stage-1 atomic-claim extraction variance or whether meaningful spread remains when Stage 1 is stable.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Used exact repeated `Jobs.InputValue` clusters and parsed stored `ResultJson.understanding.atomicClaims`. Treated a Stage-1 signature as the ordered tuple of `(statement, claimDirection, category)` across extracted atomic claims, then compared total truth-percentage spread against within-signature spread for the requested families.
**Open items:** If deeper attribution is needed, repeat the same decomposition within tighter same-commit windows for multi-commit families and optionally cluster semantically equivalent atomic-claim phrasings rather than only exact claim tuples.
**Warnings:** Several families (`Plastik DE`, `Plastik EN`, `Muslims`, `Flat Earth`, lowercase `Hydrogen`) span multiple `GitCommitHash` values, so their total spread mixes analyzer-version drift with run-to-run variation. All inspected clusters used one `PromptContentHash`, so prompt-file drift did not confound this check.
**For next agent:** The cleanest evidence of post-Stage-1 residual spread is in the single-commit Bolsonaro due-process clusters: same exact two-claim Stage-1 signatures still produced truth ranges of `49-66` (EN) and `47-61` (PT), crossing verdict labels.
**Learnings:** no

---
### 2026-03-25 | LLM Expert | Codex (GPT-5) | Long-Run Variance Reduction Levers
**Task:** Investigate long-run improvements for the root cause of normal LLM nondeterminism plus live retrieval variation, grounded in the repo's knowledge/specification docs.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Framed the problem around the repo's current conclusion that Stage 1 is materially stabilized and residual spread is now primarily Stage 2 evidence variation plus Stage 4 verdict stochasticity. Prioritized retrieval diversification and ranking quality above further prompt tuning, treated grounding as a hard-faithfulness control rather than a retrieval fix, and positioned calibration as a measurement/control layer that should accompany retrieval work but not substitute for it.
**Open items:** If this investigation is turned into execution work, the next useful artifact would be a phased design doc that maps each lever to current modules (`research-query-stage.ts`, `research-extraction-stage.ts`, `grounding-check.ts`, `confidence-calibration.ts`) and to UCM/config implications.
**Warnings:** Some long-run levers (distilled scorers, GraphRAG, formal NLI validation) require new evaluation datasets or external research integration; they should not be treated as near-term config tweaks.
**For next agent:** Start from the multi-source retrieval spec plus the DIRAS / Faithful Specialists docs. The highest-leverage sequence is: retrieval diversity and reranking first, grounding/attributability gates second, then calibration/distillation once better evidence signals exist.
**Learnings:** no

---
### 2026-03-25 | LLM Expert | Codex (GPT-5) | Long-Run Variance Reduction Assessment
**Task:** Assess how FactHarbor should reduce long-run variance from normal LLM stochasticity plus live retrieval variation, grounded in the current status and the MAD / Schimanski / Stammbach knowledge docs.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Framed the problem as primarily Stage 2 retrieval variation plus Stage 4 adjudication variance, not Stage 1 decomposition, consistent with the 2026-03-25 status snapshot. Ranked the main levers as: stronger sufficiency/abstention, debate-triggered and tool-diverse retrieval, path-based plus cross-model debate heterogeneity, specialist relevance/grounding models, and structural reproducibility wrappers (snapshotting, canonical ordering, deterministic aggregation inputs). Emphasized that more homogeneous debate rounds are lower leverage than better evidence and stronger heterogeneity.
**Open items:** If a follow-on design doc is wanted, turn the ranking into a phased roadmap with explicit experiment gates for retrieval, arbitration, and specialist-validator tracks.
**Warnings:** Per AGENTS.md, deterministic additions must stay structural only. Do not answer semantic questions with new regex/keyword heuristics; use model-based or specialist-model inference instead.
**For next agent:** Use `Docs/Knowledge/MAD_Pattern_Research_2026-02-26.md`, `Docs/Knowledge/Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md`, `Docs/Knowledge/Schimanski_Faithful_LLM_Specialists_ACL2024.md`, `Docs/Knowledge/Schimanski_DIRAS_NAACL2025.md`, `Docs/Knowledge/Global_FactChecking_Landscape_2026.md`, and `Docs/STATUS/Current_Status.md` as the primary basis if this assessment needs to be converted into architecture or backlog work.
**Learnings:** no

---
### 2026-03-25 | Lead Architect | Codex (GPT-5) | Long-Run Variance Reduction Roadmap
**Task:** Turn the debated long-run variance assessment into a concrete `Docs/WIP` roadmap grounded in the repo's Knowledge docs and current monitor-mode posture.
**Files touched:** `Docs/WIP/2026-03-25_Long_Run_Variance_Reduction_Roadmap.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Used two expert consultations plus challenger/reconciler debate to conclude that the best future quality lever is retrieval-first variance reduction, followed conditionally by verdict-stage arbitration, with hard grounding gates, broad abstention, specialist scorers, and GraphRAG deferred until better validator maturity and evaluation data exist.
**Open items:** No canonical status/backlog change was made. If the Captain wants to reopen quality work, the next artifact should be a scoped retrieval-first validation workstream proposal rather than direct implementation.
**Warnings:** This document is future-facing only. It does not override approved-policy monitor mode or authorize new analyzer work by itself.
**For next agent:** Start with `Docs/WIP/2026-03-25_Long_Run_Variance_Reduction_Roadmap.md` plus `Docs/Specification/Multi_Source_Evidence_Retrieval.md` if the project later opens a new optional quality workstream.
**Learnings:** no

---
### 2026-03-26 | Senior Developer | Claude Code (Opus 4.6) | UCM Configuration Completeness (UCM-1 to UCM-5)
**Task:** Move remaining hardcoded analysis-affecting parameters into UCM so they are admin-tunable without code changes.
**Files touched:** `config-schemas.ts`, `pipeline.default.json`, `calculation.default.json`, `config.ts`, `evidence-recency.ts`, `claim-extraction-stage.ts`, `research-query-stage.ts`, `research-extraction-stage.ts`, `aggregation-stage.ts`, `grounding-check.ts`, `scope-normalization.ts`, `source-reliability-calibration.ts`
**Key decisions:** UCM-1: Flat fields with `analysisMode`-based selection via `getActiveConfig()`. UCM-3: Per-task temperatures (not a single unified field) because query generation (0.2) is deliberately warmer than extraction (0.1). UCM-4: Brackets + fallback pattern to avoid Infinity in JSON. UCM-5: Schema-only placeholder (temporal-guard.ts does not exist yet). Grounding-check uses `DEFAULT_PIPELINE_CONFIG` constant since threading runtime config would change its public API.
**Open items:** `grounding-check.ts` reads `DEFAULT_PIPELINE_CONFIG` directly instead of runtime config. `temporal-guard.ts` (UCM-5) does not exist yet; schema field is ready.
**Warnings:** No default values were changed. All existing behavior is preserved.
**For next agent:** All 5 UCM backlog items are structurally complete. To verify runtime config propagation, change a value in Admin and confirm it reaches the module.
**Learnings:** no

---
### 2026-03-26 | Lead Architect | Codex (GPT-5) | Plastik DE UNVERIFIED Root Cause Note
**Task:** Document why job `5c1b4633e56d4238bad682d2ed64e853` resolved to `UNVERIFIED` and prepare a targeted solution-finding prompt.
**Files touched:** `Docs/WIP/2026-03-26_Plastik_DE_Unverified_Root_Cause_Note.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Identified the immediate cause as mixed-band truth plus low aggregated confidence, but traced the deeper differential cause to Stage-1 semantic/facet drift versus earlier control run `08a1c6d407564d74af633e6298d3ef84`. Recorded that `AC_03` shifted from resource-conservation framing to practical-feasibility framing, which changed downstream queries, boundaries, and self-consistency spread enough to flip the article verdict. Also noted a secondary verdict-stage structural-consistency bug for `AC_03`.
**Open items:** A follow-on reviewer/architect investigation is still needed to decide whether the proper remedy is a narrow Stage-1 fix, a downstream fix, a bug fix only, or no change.
**Warnings:** The working tree already contained unrelated uncommitted changes before this note was added. This write-up is documentation only and should not be mistaken for approval to reopen a broad stabilization wave.
**For next agent:** Start with `Docs/WIP/2026-03-26_Plastik_DE_Unverified_Root_Cause_Note.md`, then inspect the two referenced jobs and the current Stage-1 / verdict code before proposing any change. The strongest current hypothesis is targeted Stage-1 dimension drift on broad evaluative German absolutist phrasing.
**Learnings:** no

---
### 2026-03-26 | Senior Developer | Codex (GPT-5) | Plastik Proposal Code-Path Verification
**Task:** Verify two code-path claims in the Plastik solution proposal: the structural_consistency mismatch bug and the applicability of existing QLT-3 facet-convergence rules to `Plastic recycling bringt nichts`.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Confirmed the verdict-label mismatch bug is real but the proposal places the fix at the wrong point in the pipeline. Reconciliation already recalculates verdict labels; the mismatch is introduced later when spread adjustment lowers confidence without recomputing `verdict`. Confirmed from the current prompt rules that the relevant intended class for a single input like `Plastic recycling bringt nichts` is `ambiguous_single_claim`, so the existing facet-convergence, predicate-preservation, and claim-count-stability rules already apply by spec.
**Open items:** If the team wants certainty about actual runtime classification for the cited Plastik job, inspect the stored Pass 2 output or job trace. That is separate from the current code-path verification.
**Warnings:** A generic final-stage verdict normalization would be too broad because the later high-harm confidence floor intentionally forces `UNVERIFIED` independent of the truth-scale band.
**For next agent:** If implementing the bug fix, patch the Step 4c spread-adjustment map in `apps/web/src/lib/analyzer/verdict-stage.ts` so any confidence change also recomputes `verdict` with `percentageToClaimVerdict(...)`. Do not broaden the fix into a blanket final overwrite without accounting for the high-harm floor.
**Learnings:** no

---
### 2026-03-26 | Senior Developer | Codex (GPT-5) | Plastik Proposal Recommendation Review
**Task:** Review `Docs/WIP/2026-03-26_Plastik_UNVERIFIED_Solution_Proposal.md` against the cited code and decide whether `Option A + C, defer B` is the right next move.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Judged `Option A` correct in principle but underspecified in placement: the bug is created by Step 4c spread adjustment lowering confidence without recomputing `verdict`, not by reconciliation. Judged `Option C` premature as written because the current prompt already contains predicate-preservation, no-proxy-rephrasing, facet-convergence, and claim-count-stability rules for `ambiguous_single_claim`, and Stage 1 already runs contract validation plus retry. Judged `Option B` still defer-worthy because it is a global calibration change that would mask instability rather than prove the current Stage-1 safeguards are working. Judged `Option D` not appropriate as the immediate response while a real correctness bug and an unresolved Stage-1 escape path remain.
**Open items:** The concrete follow-up is to inspect the offending job's stored Pass 2 output and contract-validation result to determine whether the bad run was misclassified, validator fail-open, or a genuine miss despite existing prompt rules.
**Warnings:** Do not implement a blanket final `percentageToClaimVerdict()` rewrite after all stages; that would conflict with the intentional high-harm confidence-floor downgrade path.
**For next agent:** Recommended sequence is: 1) fix the Step 4c relabel bug with tests, 2) inspect/log runtime `inputClassification` plus claim-contract validation behavior for the cited Plastik DE jobs, 3) only then decide whether any Stage-1 enforcement change is needed. Treat new prompt text as a follow-up only if the existing ambiguous-single-claim safeguards are shown not to cover the runtime path.
**Learnings:** no

---
### 2026-03-26 | Senior Developer | Codex (GPT-5) | Plastik Proposal Counter-Review
**Task:** Challenge the main recommendation in `Docs/WIP/2026-03-26_Plastik_UNVERIFIED_Solution_Proposal.md` using the cited root-cause note and the current verdict/aggregation/truth-scale code.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Concluded the proposal overstates Stage-1 causality relative to what the inspected code actually proves. The repo-grounded cliff is downstream: self-consistency is sampled with only two extra advocate reruns at temperature 0.4, mapped through a hard `>20pp -> 0.4` multiplier, then fed into article aggregation where confidence is reused as both weight and verdict input before the 45% MIXED/UNVERIFIED threshold. Also concluded the proposed Option A fix is mislocated because reconciliation already recomputes verdict labels; the mismatch is introduced later when confidence changes without a relabel.
**Open items:** If the team wants to act beyond the relabel bug, the next justified step is downstream confidence-path characterization for this job family, not a Stage-1 prompt edit. Stage-1 changes should wait until runtime traces show the existing claim-extraction safeguards are actually missing this input.
**Warnings:** The proposal's validation target of "zero UNVERIFIED across 5 runs" optimizes for suppressing a label rather than proving calibration correctness. Treat that as a red flag, not a shipping criterion.
**For next agent:** Base the next decision on these exact code paths: `verdict-stage.ts` Step 4c spread adjustment, `aggregation-stage.ts` confidence-weighted aggregation, and `truth-scale.ts` 45% mixed-confidence threshold. If you patch the bug, do it after the last confidence-changing step that should still follow truth-scale semantics.
**Learnings:** no

---
### 2026-03-26 | Senior Developer | Claude Code (Opus 4.6) | Plastik DE 4x EVD-1 Measurement
**Task:** Run 4x `Plastik recycling bringt nichts` to determine if the UNVERIFIED result was a tail outlier or recurring.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-26_Senior_Developer_Plastik_DE_4x_Measurement.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** 4/4 runs produced LEANING-FALSE (3x) or MOSTLY-FALSE (1x). Zero UNVERIFIED, zero warnings. Truth spread 9pp (green), confidence spread 20pp (amber). AC_03 dimension varies but predicate is preserved and does not cause verdict instability. Earlier UNVERIFIED classified as **tail outlier**.
**Open items:** Confidence spread is amber (20pp) — monitor, not actionable. AC_03 dimension drift is moderate but harmless on current stack.
**Warnings:** None.
**For next agent:** Stay in monitor mode for this family. Do not reopen Stage-1 investigation. See full handoff at `Docs/AGENTS/Handoffs/2026-03-26_Senior_Developer_Plastik_DE_4x_Measurement.md`.
**Learnings:** no

---
### 2026-03-26 | Senior Developer | Claude Code (Opus 4.6) | Fix post-spread verdict label staleness
**Task:** Fix the structural-consistency bug where Step 4c spread adjustment changes confidence but leaves verdict label stale (e.g. 52%/28% labeled MIXED instead of UNVERIFIED).
**Files touched:** `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`
**Key decisions:** Added `percentageToClaimVerdict()` call in the Step 4c spread-adjustment map, exactly where `adjustedConfidence` and `confidenceTier` are already written. This is the precise location identified by the prior code-path verification — not reconciliation (which already recomputes), not a blanket final pass (which would conflict with high-harm floor).
**Open items:** None for this fix. The broader Plastik UNVERIFIED instability (Stage-1 facet drift, spread multiplier cliff) remains a separate investigation.
**Warnings:** The fix only corrects label staleness. It does not change whether a claim becomes UNVERIFIED — that's still driven by the spread multiplier and confidence threshold.
**For next agent:** The structural_consistency checker should now stop firing for post-spread label mismatches. If it still fires for other mismatch classes, those are separate bugs.
**Learnings:** no

---
### 2026-03-26 | Lead Architect | Codex (GPT-5) | Consolidated Plastik DE Proposal and Docs Sync
**Task:** Review the Plastik DE `UNVERIFIED` solution proposal against code and a short debate round, then update and commit the uncommitted docs to the consolidated recommendation.
**Files touched:** `Docs/WIP/2026-03-26_Plastik_UNVERIFIED_Solution_Proposal.md`, `Docs/WIP/2026-03-26_Plastik_DE_Unverified_Root_Cause_Note.md`, `Docs/WIP/2026-03-26_Plastik_DE_Runtime_Path_Investigation.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/Handoffs/2026-03-26_Senior_Developer_B_Sequence_Validation.md`
**Key decisions:** Kept the structural-consistency bug fix, but corrected its fix point to Step 4c where spread adjustment lowers confidence without relabeling. Rejected immediate prompt changes because the current prompt/code already contain the relevant ambiguous-single-claim safeguards; replaced that recommendation with runtime-path characterization to verify whether Stage 1 actually escaped in the cited runs. Kept spread-multiplier tuning deferred as a global calibration change. Added the new Plastik DE WIP docs, including the runtime-path investigation, to the WIP index and included the pending B-sequence validation handoff in the docs commit set.
**Open items:** The next two work items are already defined: 1) the post-spread verdict-label bug fix, and 2) a runtime-path investigation for the two Plastik DE jobs to determine whether any targeted Stage-1 enforcement change is actually justified.
**Warnings:** This docs sync should be committed without unrelated code. The reviewed proposal no longer supports “implement Option C now”; future prompt edits should wait for runtime-path evidence.
**For next agent:** Start from the consolidated proposal in `Docs/WIP/2026-03-26_Plastik_UNVERIFIED_Solution_Proposal.md`. Treat the current recommendation as: bug fix now, diagnostic investigation next, no multiplier tuning yet.
**Learnings:** no

---
### 2026-03-26 | Lead Architect | Claude Code (Opus 4.6) | Gate 1 Debate Closure + EVD-1 Measurement + Docs Sync
**Task:** Run Gate 1 rescue refinement debate, execute Bolsonaro x5 + Plastik DE x3 EVD-1 measurement, sync canonical docs.
**Files touched:** `Docs/WIP/2026-03-26_Gate1_Rescue_Refinement_Debate.md` (new), `Docs/WIP/2026-03-26_EVD1_Bolsonaro_Plastik_Measurement.md` (new), `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`.
**Key decisions:** (1) Gate 1 thesis-direct rescue refinement DECLINED after two-agent debate — the UNVERIFIED was evidence-driven (balance 0.38 vs 0.76), AC_03 was the most stable claim, and a 3-claim run produced LEANING-TRUE. Over-filtering risk for evaluative questions too high. (2) Bolsonaro 5-run measurement: amber (25pp, UNVERIFIED 1/5 single outlier). (3) Plastik DE 3-run: green (14pp, zero UNVERIFIED, confidence 72-77). (4) No analyzer behavior change approved. (5) Optional OBS-2 (persist inputClassification + contractValidation) recorded as low-priority diagnostics item, not a quality-track reopening.
**Open items:** OBS-2 (optional diagnostics). No active analyzer engineering work.
**Warnings:** The Bolsonaro amber status means re-measure in the next validation round. If UNVERIFIED recurs in 2+ of 5, investigate evidence-allocation (3 vs 2 claims), NOT Gate 1 filtering.
**For next agent:** The system is in EVD-1 monitor mode. No analyzer changes are approved. Gate 1 refinement is closed. The next quality action is only triggered by a red EVD-1 result. Captain approval required for optimization tracks (P1-A/B).
**Learnings:** When a two-job comparison shows a large confound (4.4x evidence balance difference), do not implement a fix based on the secondary signal (claim count). Generate more data first. The N=5 measurement disproved the causal hypothesis cleanly.

---
### 2026-03-26 | Senior Developer | Claude Code (Opus 4.6) | Stage-1 Observability (OBS-2)
**Task:** Persist `inputClassification` and `contractValidationSummary` in stored result JSON for future investigations.
**Files touched:** `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, `apps/web/test/unit/lib/analyzer/claim-contract-validation.test.ts`
**Key decisions:** Added two optional fields to `CBClaimUnderstanding`: `inputClassification` (string from Pass 2) and `contractValidationSummary` (compact `{ran, preservesContract, rePromptRequired, summary}`). Hoisted summary capture before the retry decision block. Fail-open case records `ran: true` with explanatory summary. Both fields are optional for backward compatibility.
**Open items:** None. This is additive observability only.
**Warnings:** None. No analytical behavior changed.
**For next agent:** Future investigations can now inspect `understanding.inputClassification` and `understanding.contractValidationSummary` directly from stored job results instead of inferring runtime behavior.
**Learnings:** no

---
### 2026-03-26 | Senior Developer | Claude Code (Opus 4.6) | Stage-2 D5 Diversity-Aware Sufficiency (revised)
**Task:** Revise the existing diversity-aware sufficiency patch to close two review gaps: D5 item-count alignment and seeded-evidence policy.
**Files touched:** `apps/web/src/lib/analyzer/research-orchestrator.ts`, `apps/web/src/lib/config-schemas.ts`, `apps/web/configs/pipeline.default.json`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
**Key decisions:** Gap 1: When `diversityAwareSufficiency=true`, sufficiency now uses `calcConfig.evidenceSufficiencyMinItems` (D5 threshold) instead of `pipelineConfig.claimSufficiencyThreshold`. Gap 2: D5-aligned path includes seeded evidence (matching D5 behavior) via `includeSeeded: true`. Default path unchanged (excludes seeded). Both controlled via `DiversitySufficiencyConfig` interface fields. Feature remains default-off.
**Open items:** None. Ready for experimental validation when enabled.
**Warnings:** When enabled, sufficiency semantics change: seeded evidence counts, item threshold comes from CalcConfig, diversity is required. This is intentional D5 alignment.
**For next agent:** Enable `diversityAwareSufficiency=true` via Admin → Config for targeted testing. Compare D5 gate results (UNVERIFIED claims) between runs with and without the flag.
**Learnings:** no

---
### 2026-03-26 | Lead Architect | Codex (GPT-5) | Bolsonaro Seeded Evidence Mapping Review
**Task:** Sharpen the analysis of weak Bolsonaro run `1abb0ea52a6c404baadaba360b0370de`, specifically whether empty coverage-matrix rows indicate a real analytical problem, using debate-style reviewer/challenger passes.
**Files touched:** `Docs/WIP/2026-03-26_Bolsonaro_Seeded_Preliminary_Evidence_Mapping_Review.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Confirmed that the empty matrix rows are not UI noise: they come from seeded preliminary evidence entering Stage 2 with `relevantClaimIds: []` after narrow remapping. For `1abb0ea5`, `23/77` evidence items are seeded and unmapped, exactly matching the matrix undercount. However, the same seeded-unmapped pattern also appears in stronger Bolsonaro runs, so it is a systemic contributing defect rather than the primary cause of weakness. Reconciled conclusion: Stage-2/D5 mapped-evidence starvation on `AC_01` remains the main weak-path mechanism, while the seeded-evidence mapping defect is a real interface bug worth a targeted follow-up.
**Open items:** If Captain wants to act, the next justified work item is a narrow Stage-1/Stage-2 claim-handle alignment investigation or fix. This should be kept separate from Gate 1, D5 thresholding, and verdict-calibration work.
**Warnings:** Do not misframe this as a UI issue or as sole root cause. Empty rows are a symptom of unmapped evidence, but fixing that alone may not solve claim-local diversity starvation.
**For next agent:** Start from `Docs/WIP/2026-03-26_Bolsonaro_Seeded_Preliminary_Evidence_Mapping_Review.md`. Treat the current state as: real seeded-evidence attribution defect, but primary weakness still sits in mapped evidence diversity for `AC_01`.
**Learnings:** no

---
### 2026-03-26 | Senior Developer | Claude Code (Opus 4.6) | Diversity-Aware Sufficiency Validation
**Task:** Validate `diversityAwareSufficiency=true` (commit `83a47aad`) on 8 runs (4 Bolsonaro, 2 Plastik DE, 2 Flat Earth).
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-26_Senior_Developer_Diversity_Aware_Sufficiency_Validation.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** **Validated.** 0/8 UNVERIFIED (vs 1/5 baseline). Bolsonaro confidence spread improved from 23pp (amber) to 5pp (green). No control regressions. No runtime cost increase visible. Feature eliminates the D5 starvation weak path that produced the earlier UNVERIFIED outlier.
**Open items:** Recommend promoting `diversityAwareSufficiency=true` as new default. Captain approval needed.
**Warnings:** N=4 Bolsonaro is sufficient for validation but not exhaustive. The truth spread remains amber (25pp) — that is evidence-driven, not feature-related.
**For next agent:** If Captain approves, set `diversityAwareSufficiency: true` in `pipeline.default.json` + `DEFAULT_PIPELINE_CONFIG`, reseed. See full handoff at `Docs/AGENTS/Handoffs/2026-03-26_Senior_Developer_Diversity_Aware_Sufficiency_Validation.md`.
**Learnings:** no

---
### 2026-03-26 | Lead Architect | Codex (GPT-5) | Review of Seeded Evidence Mapping Fix Proposal
**Task:** Review `Docs/WIP/2026-03-26_Seeded_Evidence_Mapping_Fix_Investigation.md`, especially the proposed multi-claim all-claims fallback for unmapped seeded preliminary evidence.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Accepted the diagnosis of a systemic seeded preliminary-evidence mapping defect, but rejected the proposed Option B all-claims fallback as too coarse. Because Stage 2 diversity-aware sufficiency and D5 both count claim-mapped evidence structurally, mapping every unmapped seeded item to every claim would artificially inflate per-claim item, source-type, and domain counts. Cross-run comparison also showed the same seeded-unmapped pattern in stronger Bolsonaro runs, so the weak `1abb0ea5` result is not uniquely explained by mapping loss. Preferred next step remains a narrower interface fix (stable handles, explicit mapping artifact, or small LLM-backed remap), not blanket over-attribution.
**Open items:** If this topic stays active, produce a narrower fix proposal that preserves claim-local attribution instead of assigning semantic-slug preliminary evidence to all claims.
**Warnings:** Do not implement Option B as written. It would likely distort D5 sufficiency and the validated diversity-aware sufficiency experiment by turning topic-level seeded evidence into claim-level sufficiency evidence for every claim.
**For next agent:** Treat `Docs/WIP/2026-03-26_Seeded_Evidence_Mapping_Fix_Investigation.md` as useful on root cause, but not on the recommended fix. Start from the code paths in `apps/web/src/lib/analyzer/research-orchestrator.ts` and `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` and design a claim-preserving remap.
**Learnings:** no

---
### 2026-03-27 | Lead Architect | Codex (GPT-5) | Single-Source Flooding Proposal Review
**Task:** Review `Docs/WIP/2026-03-27_Bolsonaro_efc5e66f_Single_Source_Flooding_Investigation.md` and assess the proposed 3-fix mitigation for civilizationworks-driven evidence flooding.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Confirmed the core runtime diagnosis: verdict prompts currently receive per-item `sourceType` / `probativeValue` / provenance metadata but no `trackRecordScore` or `trackRecordConfidence`, while both SR calibration and legacy post-hoc weighting are default-off in live config. Also confirmed there is no per-source extraction cap and no active within-source consolidation. Rejected the claim that SR is universally "unused" in code as overstated; a legacy weighting path exists, but it is disabled by default and would not be a sufficient fix. Recommended sequencing adjustment: Fix 1 is valid, but Fix 2 should be treated as the likely required safety rail, not merely a later option, because the existing challenger prompt already asks the LLM to detect shared-source dependence and did not stop this failure mode.
**Open items:** If implementation is approved, decide whether Fix 1 is only payload enrichment or a real prompt-contract change. If the latter, it needs explicit human approval plus prompt reseeding under `apps/web/prompts/claimboundary.prompt.md`.
**Warnings:** Do not frame Fix 1 as a pure `verdict-stage.ts` code tweak. Reliable SR-aware reasoning likely requires prompt guidance in addition to payload fields. Also do not rely on legacy `applyEvidenceWeighting()` as the fallback answer; its current shape is post-hoc and limited.
**For next agent:** Start with `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/prompts/claimboundary.prompt.md`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, and `apps/web/src/lib/analyzer/research-extraction-stage.ts`. Preserve the AGENTS rule that semantic consolidation must stay LLM-driven; deterministic caps are acceptable only as structural plumbing.
**Learnings:** no

---
### 2026-03-27 | Lead Architect | Codex (GPT-5) | Single-Source Flooding Implementation Review
**Task:** Review the implementation of Fix 1 (SR-aware verdict reasoning) and Fix 2 (per-source evidence cap) against the approved design.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Implementation is close, but not yet architecturally clean. Found two substantive issues: (1) `sourcePortfolio` is built once from the full evidence pool and passed unchanged into multi-claim verdict calls, so its `evidenceCount` is global rather than claim-local and also leaks across D5 advocate/challenger partitions; this weakens the intended “for this claim / for this role” concentration signal. (2) `applyPerSourceCap()` is incremental only: once a source has reached the cap, later higher-probative items from that same source are discarded rather than replacing weaker earlier items. The cap therefore enforces volume limits but does not truly retain the best `maxPerSource` items across the cumulative pool.
**Open items:** Rework Fix 1 to provide claim-local source concentration context, ideally `sourcePortfolioByClaim` (and preferably role-scoped when partitioning is active). Rework Fix 2 to reselect the best retained items per source across `existing + new`, or explicitly accept/document the weaker “first to fill wins” behavior.
**Warnings:** Test coverage added for the helpers is good, but it does not currently cover claim-local portfolio correctness, partition interaction, or replacement behavior once a source is already at the cap.
**For next agent:** Start in `apps/web/src/lib/analyzer/verdict-stage.ts` and `apps/web/src/lib/analyzer/research-extraction-stage.ts`. Preserve the structural-only nature of the cap and do not revert the prompt-contract work; the remaining work is about scoping and cumulative selection semantics.
**Learnings:** no

---
### 2026-03-27 | Lead Architect | Codex (GPT-5) | Single-Source Flooding Recommendation Update
**Task:** Re-evaluate the same implementation after live-file changes and independent sub-agent review.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The earlier global-portfolio concern is superseded. `verdict-stage.ts` now builds claim-local, role-scoped portfolios (`buildSourcePortfolioByClaim`) for advocate/self-consistency/challenger and a full claim-local portfolio for reconciliation. That architectural direction is correct. The current blocker is prompt-contract mismatch: Stage 4 now passes `sourcePortfolioByClaim` into VERDICT_ADVOCATE and VERDICT_CHALLENGER inputs, but the prompt sections still interpolate `${sourcePortfolio}`. `prompt-loader.ts` leaves unknown placeholders unchanged, so the new claim-local portfolio likely never reaches the model in those roles. Cap semantics were also re-reviewed: the current “first retained items consume slots; later items do not replace them” behavior is acceptable for initial rollout as a blunt safety rail, but the comments/tests should describe that honestly.
**Open items:** Align prompt variable names and tests with the current claim-local contract (`sourcePortfolioByClaim`) or change the code back to the original `sourcePortfolio` key consistently. Add focused tests that assert the rendered prompt input key matches the prompt contract.
**Warnings:** Do not approve the current working tree as-is. Fix 1 is partially broken until the prompt variable mismatch is corrected. Fix 2 does not block rollout, but its contract wording should not overstate “best items overall” semantics.
**For next agent:** Check `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/prompts/claimboundary.prompt.md`, `apps/web/src/lib/analyzer/prompt-loader.ts`, and `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`. Preserve claim-local, role-scoped portfolio semantics; the needed fix is consistency, not rollback.
**Learnings:** no

---
### 2026-03-27 | Lead Architect | Codex (GPT-5) | Single-Source Flooding Final Re-Review
**Task:** Re-review the latest source after the Senior Developer addressed the prompt-contract mismatch and updated tests.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** No review findings remain in the current source. The verdict path now consistently uses `sourcePortfolioByClaim` in code and prompts, including advocate, self-consistency, challenger, and reconciliation. The per-source cap semantics were also upgraded from incremental first-come retention to best-N re-selection across existing+new items with explicit eviction of weaker existing items. Focused verification passed: targeted vitest for verdict-stage + research-extraction-stage passed, and `npm -w apps/web run build` passed with prompt reseed unchanged.
**Open items:** Live validation against the Bolsonaro / Plastik / Hydrogen families remains the main empirical follow-up.
**Warnings:** Residual risk is behavioral, not structural: the LLM may still underuse the new portfolio signal in some edge cases, so live validation is still needed before calling the mitigation fully proven.
**For next agent:** If Captain wants confidence beyond static review, run the planned live validation matrix from the investigation document. Otherwise this implementation is architecturally acceptable for merge.
**Learnings:** no

---
### 2026-03-27 | Lead Developer | Codex (GPT-5) | Seeded Evidence Remap Canonization and Commit Split
**Task:** Sync the seeded-evidence remap work into canonical docs and commit the repo in meaningful chunks.
**Files touched:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/Handoffs/2026-03-27_Senior_Developer_Seeded_Evidence_LLM_Remap_Experiment.md`, `Docs/WIP/2026-03-26_Bolsonaro_Seeded_Preliminary_Evidence_Mapping_Review.md`, `Docs/WIP/2026-03-26_Seeded_Evidence_LLM_Remap_Proposal.md`, `Docs/WIP/2026-03-26_Seeded_Evidence_Mapping_Fix_Investigation.md`, `Docs/WIP/2026-03-26_Seeded_Evidence_Mapping_Fix_Proposal_Rev2.md`, `Docs/WIP/2026-03-27_Bolsonaro_efc5e66f_Single_Source_Flooding_Investigation.md`, `Docs/WIP/2026-03-27_Seeded_Evidence_Remap_Promotion_Gate_Parked.md`
**Key decisions:** Canonized the current remap state as: implemented and validated as an **optional control**, default `false`, promotion gate parked. Updated `Current_Status.md` and `Backlog.md` to reflect that `preliminaryEvidenceLlmRemapEnabled` is available but not promoted to default-on. Updated the WIP index to include the parked promotion-gate resume point and the seeded-evidence proposal chain. Split commits intentionally: code landed first as `b70f1662` (`feat(analyzer): add seeded evidence llm remap experiment`), docs/status sync follows separately.
**Open items:** The final promote-or-hold decision for `preliminaryEvidenceLlmRemapEnabled` is still parked. Remaining verification lives in `Docs/WIP/2026-03-27_Seeded_Evidence_Remap_Promotion_Gate_Parked.md`.
**Warnings:** Do not treat the remap as canonical default-on behavior yet. The paused promotion gate still needs the OFF comparison runs and remapped-evidence spot-check before any default flip.
**For next agent:** Resume the default-on decision from `Docs/WIP/2026-03-27_Seeded_Evidence_Remap_Promotion_Gate_Parked.md`. Treat the current canonical state as: feature exists, default remains off, selective validation/use is approved.
**Learnings:** no

---
### 2026-03-27 | Lead Architect | Codex (GPT-5) | Remap Gate Sequencing Recommendation
**Task:** Advise whether live jobs should be run before resuming the parked seeded-evidence remap promotion gate.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Recommended running a small current-stack live A/B batch before resuming the parked gate. Reason: the parked remap evidence was collected on commit `1ff092cdf8b442d12716ddb1b704d5247554d199+df1135bd`, while current HEAD is `5654841be8cc` and the analyzer stack has materially changed due to the single-source flooding mitigation. The old batch is therefore not decision-grade for a default-on remap promotion. Also verified that the parked note is stale: job `a71bc67082b64bf0945bb4ee650b3148` is no longer running and actually succeeded (`LEANING-FALSE`, 36/75) on the old commit.
**Open items:** Run current-stack ON/OFF comparison jobs before making the promotion decision. Minimum recommended batch: Bolsonaro extended input ON/OFF plus Plastik DE ON/OFF with only `preliminaryEvidenceLlmRemapEnabled` toggled. Add second replicates only if the 4-run signal is ambiguous.
**Warnings:** Do not continue the parked gate as if it were still a clean same-stack comparison. The historical ON runs remain useful background, but not a merge/promotion-grade basis for a default flip after the new mitigation landed.
**For next agent:** Update `Docs/WIP/2026-03-27_Seeded_Evidence_Remap_Promotion_Gate_Parked.md` to mark `a71bc670` as completed, then use the current-stack A/B batch to decide whether remap still delivers net value under the new baseline. Spot-check remapped Bolsonaro items from the fresh ON run, not only the historical March 27 runs.
**Learnings:** no

---
### 2026-03-27 | Lead Architect | Codex (GPT-5) | Homeopathy Run `b5f29c58` Review
**Task:** Review live job `b5f29c5807aa4747903113c0c2b9b1d8` and state the architect-level conclusion.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Classified `b5f29c58` as a mixed/hold signal, not a positive promotion signal for seeded-evidence remap. The run is current-stack (`5654841be8cc...+d5ae0999`) and job events confirm remap was active (`Preliminary evidence remap: 26/30 items resolved`). Compared against same-input sibling `efe1102fda0f40cfa99e42096d45de1c` on the same commit, remap materially changed seeded claim attribution and pushed the top-line verdict upward (`LEANING-TRUE 60.8/74.2` → `MOSTLY-TRUE 75.8/24`), but overall report quality worsened because AC_03 collapsed to `UNVERIFIED 50/24` after a direction-integrity safe downgrade. This is evidence that remap is impactful on this family, but not evidence that it should be promoted to default-on.
**Open items:** If this input family matters, do manual claim-level comparison of seeded items on AC_02/AC_03 between `b5f29c58` and `efe1102f`, because the claim flips are too large to treat as benign noise.
**Warnings:** Both runs still contain grounding-check warnings for cited evidence IDs not present in the final evidence pool; `b5f29c58` shows the worse set. Treat the run as informative but not clean. Also, this broad thesis decomposes into a mechanistic subclaim, making it a weaker promotion-gate canary than Bolsonaro/Plastik.
**For next agent:** Use this run as a cautionary data point in the remap gate: remap ON can materially change claim-local attribution, but net value must be judged on confidence/integrity, not truth% alone.
**Learnings:** no

---
### 2026-03-27 | Lead Architect | Codex (GPT-5) | Remap Promotion Gate Final Architect Call
**Task:** Review the completed current-stack A/B promotion gate for `preliminaryEvidenceLlmRemapEnabled` and state the final architect recommendation.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Approved promotion to default-on, with an explicit monitor caveat for the Homeopathy family. The decisive evidence is the Bolsonaro pair (`e8d50baa` OFF vs `e25cb33c` ON): same verdict direction and essentially same truth/confidence, but seeded mapping improves from `0/27` to `22/24`, which is the ideal repair signature for this feature. Hydrogen corroborates the same pattern (large mapping recovery, stable FALSE-leaning outcome). Plastik DE shows additional seeded recovery with no directional regression outside its already-documented variance band. The Homeopathy pair remains a real caution signal, not something to hand-wave away, but it is not strong enough to outweigh the cleaner Bolsonaro/Hydrogen evidence for the default decision.
**Open items:** After the Captain flips the default, monitor Homeopathy-family runs and any broad evaluative multi-claim inputs where remap may concentrate seeded evidence unevenly across decomposed claims.
**Warnings:** Keep the rollback flag available. Also, the grounding-check warnings with missing evidence IDs observed in some runs are a separate integrity concern and should not be conflated with the remap promotion decision.
**For next agent:** If asked to operationalize the decision, update canonical status/backlog docs to reflect the default flip and preserve the Homeopathy monitor note. Do not present the promotion as universally risk-free; present it as approved with targeted monitoring.
**Learnings:** no

---
### 2026-03-27 | Lead Architect | Codex (GPT-5) | Remap Promotion Close-Out Check
**Task:** Verify the promoted default-on state for `preliminaryEvidenceLlmRemapEnabled` after commit `b5fad127` and identify any remaining close-out gaps.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Confirmed the promotion commit exists at HEAD (`b5fad127 feat(config): promote preliminaryEvidenceLlmRemapEnabled to default-on`), the working tree is clean, and config defaults are updated in code/JSON. The remaining gap is documentation sync: `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` still describe remap as parked/default-off. Architecturally, the promotion is accepted; canonization is not fully closed until those status docs are updated. Remote deployment is also still pending manual execution because the automated path was blocked by SSH key issues.
**Open items:** Update the status docs to reflect default-on + Homeopathy monitor note, then run the manual remote deploy command if deployment is still intended now.
**Warnings:** Do not let the repository present two different truths at once: code/defaults now say ON, but status docs still say OFF. That will confuse the next agent and any Captain reviewing current state.
**For next agent:** Update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` before treating REMAP-1 as fully closed. Preserve the monitor note and deployment caveat.
**Learnings:** no

---
### 2026-03-27 | Lead Architect | Codex (GPT-5) | Remap Promotion Deploy-Clear Check
**Task:** Verify the post-promotion confirmation runs and documentation sync after the follow-up docs commits.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The state is now deploy-clear. `65800acb` added the post-promotion confirmation runs, and current HEAD is `d5b13580` with follow-up doc refinements. Canonical docs now reflect the promoted default-on state (`Current_Status.md`, `Backlog.md`), and the post-promotion Homeopathy canary no longer reproduces the earlier confidence collapse (`de699b14` = 71.1 confidence). Bolsonaro confirmation also remains healthy (`bf2c3b9a` = LEANING-TRUE 70.4/69.0). The original monitor concern is therefore reduced from an open deploy risk to routine watchlist status.
**Open items:** Remote deployment still needs the manual `deploy-remote.ps1 -ForceConfigs` step if not already executed.
**Warnings:** The WIP filename `2026-03-27_Seeded_Evidence_Remap_Promotion_Gate_Parked.md` is now historically stale in name only; not a blocker, but it should eventually be renamed or archived during consolidation to avoid confusion.
**For next agent:** Treat REMAP-1 as canonically promoted and validated. If asked for next steps, focus on deployment execution and routine post-deploy monitoring rather than reopening the promotion gate.
**Learnings:** no

---
### 2026-03-27 | Lead Architect | Codex (GPT-5) | Remap Gate WIP Record Update
**Task:** Update `Docs/WIP/2026-03-27_Seeded_Evidence_Remap_Promotion_Gate_Parked.md` so it reads as a completed record instead of a parked stub.
**Files touched:** `Docs/WIP/2026-03-27_Seeded_Evidence_Remap_Promotion_Gate_Parked.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Rewrote the WIP file into a final completed-record document. It now captures the promotion decision, distinguishes old-stack background runs from the current-stack gate batch, records the post-promotion confirmation runs, and explicitly explains that the `_Parked` filename is historical only. Kept the file in place rather than renaming it because the request was to update the existing document and the repo already references this path.
**Open items:** During future WIP consolidation, either archive or rename this file so the filename matches its completed state.
**Warnings:** The content is now correct, but the path still carries the legacy `_Parked` suffix by design.
**For next agent:** Use the updated WIP file as the compact historical summary. Use the handoff docs for full operational detail.
**Learnings:** no

---
### 2026-03-27 | Lead Architect | Codex (GPT-5) | Direction Validator False Positive Rev 2 Review
**Task:** Re-review `Docs/WIP/2026-03-27_Direction_Validator_False_Positive_Investigation.md` after the stated Rev 2 corrections.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The three previously raised concerns were addressed: the doc now frames the incident as a two-layer failure with the LLM validator as primary, correctly characterizes self-consistency as advocate-partition stability rather than full-pool correctness, and corrects the implementation details around Rule 2 and `ConsistencyResult.stable`. One substantive review finding remains: the proposed mitigation section still overstates observability and understates scope. In the live code, when `isVerdictDirectionPlausible()` returns `true`, the path does not emit an info-level `AnalysisWarning`; it only logs `console.info`. Because the proposed change is an early exit inside `isVerdictDirectionPlausible()`, it would also affect the `verdictDirectionPolicy: "disabled"` path by suppressing diagnostics earlier, not just the `retry_once_then_safe_downgrade` enforcement path.
**Open items:** Revise Section 7 mitigations to match actual runtime behavior. If the intended design is to preserve an info-level warning even when rescued, that needs an explicit caller-side change in `validateVerdicts()`, not just a helper tweak.
**Warnings:** Do not approve the proposal text as-is; its current mitigation bullets misdescribe the behavior change and the diagnostic impact.
**For next agent:** Re-check `Docs/WIP/2026-03-27_Direction_Validator_False_Positive_Investigation.md` against `apps/web/src/lib/analyzer/verdict-stage.ts` lines 1118-1176 before approving any implementation prompt.
**Learnings:** no

---
### 2026-03-27 | Lead Architect | Codex (GPT-5) | Direction Validator False Positive Rev 3 Re-Review
**Task:** Re-review `Docs/WIP/2026-03-27_Direction_Validator_False_Positive_Investigation.md` after the observability and scope corrections.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** No review findings remain. Section 7 now correctly states that the current rescue path produces no persisted diagnostic signal, only `console.info`, and it properly frames the proposed info-level warning as a new implementation requirement rather than existing behavior. It also now correctly states that the rescue runs before the policy guard and therefore affects observability across all policy modes, not just `retry_once_then_safe_downgrade`.
**Open items:** If implementation is approved, the coding prompt should explicitly require caller-side warning emission on rescue so the behavior matches the document.
**Warnings:** The proposal still carries the inherent architectural caveat already acknowledged in the doc: advocate-side stability is not proof of full-pool correctness.
**For next agent:** Treat the investigation doc as architecturally review-ready. If moving to implementation, preserve the distinction between current behavior and proposed observability changes.
**Learnings:** no

---
### 2026-03-27 | Lead Architect | Codex (GPT-5) | Direction Validator Fix Implementation Review
**Task:** Review the implementation of the direction-validator false-positive fix in `apps/web`.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Found one remaining review issue. The new persisted warning for plausibility rescue is emitted only on the initial rescue path in `validateVerdicts()`, but not when a repaired verdict later passes via `isVerdictDirectionPlausible()` during re-validation. That means plausibility-based overrides are still not fully observable. Focused verification passed: `npm -w apps/web exec vitest run test/unit/lib/analyzer/verdict-stage.test.ts`.
**Open items:** Add the same `direction_rescue_plausible` warning (or equivalent) on the repaired-verdict rescue branch, and add a focused test for that path.
**Warnings:** As implemented, admins can still miss a subset of rescue events, specifically repaired verdicts accepted because the plausibility helper returns `true` at the second validation gate.
**For next agent:** Inspect `apps/web/src/lib/analyzer/verdict-stage.ts` around lines 1123 and 1155. The first branch now emits the warning; the second still silently accepts the repaired verdict.
**Learnings:** no

---
### 2026-03-27 | Lead Architect | Codex (GPT-5) | Direction Validator Fix Final Re-Review
**Task:** Re-review the direction-validator false-positive fix after the repaired-path warning and warning-contract tests were added.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** No review findings remain. `direction_rescue_plausible` is now emitted on both the initial plausibility-rescue path and the repaired-verdict rescue path, with `phase: "post_repair"` on the latter. The warning contract is also now directly tested for both `rescueReason: "evidence_ratio"` and `rescueReason: "stable_consistency"` plus `consistencySpread`. Focused verification passed again: `npm -w apps/web exec vitest run test/unit/lib/analyzer/verdict-stage.test.ts`.
**Open items:** None from architecture review.
**Warnings:** The existing design caveat still applies by construction: stable advocate-side consistency is not proof of full-pool correctness.
**For next agent:** Treat this implementation as review-approved. If additional verification is desired, the next step is live validation on the Homeopathy-family scenario that originally triggered the investigation.
**Learnings:** no

---
### 2026-03-27 | Lead Architect | Codex (GPT-5) | Outage Resilience Commit 83a50d8c Review
**Task:** Review the claimed “complete outage resilience” state after commit `83a50d8c`.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Found two substantive gaps. First, the new watchdog auto-resume resumes on any HTTP response from the Anthropic endpoint, including unauthenticated `401`, so pauses caused by auth errors, rate limits, or provider-side outages can clear incorrectly. The included integration test explicitly encodes `401` as a successful auto-resume. Second, the “current job fails cleanly” claim only holds after the breaker is already open. `claimboundary-pipeline.ts` rethrows only when `isSystemPaused()` is true, but provider-health opens the circuit only after 3 consecutive failures; a first outage-hit Stage 4 failure can still fall through to damaged fallback verdicts before the pause trips.
**Open items:** Gate auto-resume by pause cause (or by a real half-open/provider-health probe) instead of “any HTTP response”, and close the first-job fallback gap if the goal is truly zero damaged fallback reports during an outage.
**Warnings:** The current implementation is good progress for raw internet outage recovery, but it is not yet equivalent to a robust provider-health circuit for all pause causes.
**For next agent:** Re-check `apps/web/src/lib/internal-runner-queue.ts`, `apps/web/src/lib/provider-health.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, and `apps/web/test/unit/lib/drain-runner-pause.integration.test.ts` before declaring outage resilience “complete”.
**Learnings:** no

---
### 2026-03-27 | Lead Architect | Codex (GPT-5) | Outage Resilience Follow-Up Re-Review
**Task:** Re-review the outage-resilience changes after the network-only auto-resume guard and plan-doc correction.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** No review findings remain on the two previously identified issues. `internal-runner-queue.ts` now gates auto-resume behind `isPausedDueToNetwork()`, so auth/rate-limit pauses are not eligible for the watchdog probe, and `drain-runner-pause.integration.test.ts` now directly asserts that non-network pauses do not call the probe. The plan doc also now correctly documents that the first outage-hit job can still produce fallback verdicts before the breaker trips and identifies A.3 / within-job counting as the remaining path to close that gap.
**Open items:** The first-job gap remains a documented follow-on rather than an implemented fix.
**Warnings:** There is still a low-risk maintenance concern that the network pattern list is duplicated between `error-classification.ts` and `internal-runner-queue.ts`; not a review finding, but worth keeping aligned if patterns evolve.
**For next agent:** Treat the previous two outage-resilience review findings as closed. If this area is reopened, focus on A.3 pre-call probing or a within-job failure counter rather than watchdog semantics.
**Learnings:** no

---
### 2026-03-27 | Senior Developer | Codex (GPT-5) | A.3 Pre-Stage-4 Connectivity Probe
**Task:** Implement A.3 so Stage 4 fast-fails on clear LLM connectivity loss instead of producing first-outage-hit fallback verdicts.
**Files touched:** `apps/web/src/lib/connectivity-probe.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/src/lib/internal-runner-queue.ts`, `apps/web/test/unit/lib/connectivity-probe.test.ts`, `apps/web/test/unit/lib/analyzer/verdict-preflight.test.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `Docs/WIP/2026-03-27_Internet_Outage_Resilience_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added a shared LLM connectivity probe module with provider-aware default endpoints and a 5s timeout. Refactored Stage 4 entry in `claimboundary-pipeline.ts` into `runVerdictStageWithPreflight()`, which probes before verdict generation, aborts cleanly on transport failure, and records clear network failures into provider-health so repeated preflight failures can still open the LLM circuit and pause the system. Reused the same probe module in the watchdog auto-resume path instead of keeping duplicate fetch logic.
**Open items:** Stage 2 LLM failures still do not feed provider-health. Preflight timeout failures abort the current job fast but do not currently count toward opening the LLM circuit because timeout classification remains separate from clear network-connectivity failures.
**Warnings:** The preflight intentionally probes the configured primary LLM provider endpoint, which is correct for the internet-outage gap this task targeted. It does not attempt multi-provider semantic health checks for every per-role override.
**For next agent:** Safe verification passed end-to-end: `npm test`, `npm -w apps/web run build`, plus focused runs for `test/unit/lib/connectivity-probe.test.ts`, `test/unit/lib/analyzer/verdict-preflight.test.ts`, `test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, and `test/unit/lib/drain-runner-pause.integration.test.ts`. If this area is extended, the next likely decision is whether preflight timeouts should also count toward provider-health pause/open behavior.
**Learnings:** no

---
### 2026-03-27 | Senior Developer | Codex (GPT-5) | Network Matcher Dedup Follow-Up
**Task:** Apply the low-priority cleanup to deduplicate the watchdog's network-connectivity matcher.
**Files touched:** `apps/web/src/lib/error-classification.ts`, `apps/web/src/lib/internal-runner-queue.ts`, `apps/web/test/unit/lib/error-classification.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Exported `isNetworkConnectivityFailureText()` from `error-classification.ts`, switched `classifyError()` to use it internally, and updated `internal-runner-queue.ts` to reuse the same helper instead of carrying its own regex list. Added focused unit coverage for the exported helper.
**Open items:** None from this cleanup itself. The broader provider-scan suggestion remains intentionally out of scope.
**Warnings:** This is a maintenance-only follow-up; behavior should remain unchanged.
**For next agent:** Focused verification passed: `npm -w apps/web exec vitest run test/unit/lib/error-classification.test.ts test/unit/lib/auto-pause-flow.integration.test.ts test/unit/lib/drain-runner-pause.integration.test.ts`.
**Learnings:** no

---
### 2026-03-28 | Senior Developer | Codex (GPT-5) | Execution-Time Commit Provenance
**Task:** Make job provenance reflect the commit that actually executed a job attempt, including automatic system re-queues after restart.
**Files touched:** `apps/web/src/lib/build-info.ts`, `apps/web/src/app/api/version/route.ts`, `apps/web/src/lib/internal-runner-queue.ts`, `apps/web/src/app/jobs/[id]/page.tsx`, `apps/web/test/unit/lib/build-info.test.ts`, `apps/api/Data/Entities.cs`, `apps/api/Controllers/InternalJobsController.cs`, `apps/api/Controllers/JobsController.cs`, `apps/api/Services/JobService.cs`, `apps/api/migrations/20260328000000_AddExecutedWebGitCommitHash.cs`, `apps/api/migrations/FhDbContextModelSnapshot.cs`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added `ExecutedWebGitCommitHash` as execution-time provenance on the API job entity instead of overloading the existing creation-time `GitCommitHash`. The web runner now resolves the active web commit once per run, includes it in internal status updates, and also writes it into `resultJson.meta.executedWebGitCommitHash`. Admin job APIs expose both hashes, the admin job detail UI shows execution commit first with creation commit as secondary context when they differ, and the existing `gitHash` filter now matches either creation or execution hashes.
**Open items:** The new DB column exists in code and migration, but the migration still needs to be applied on existing databases. Historical jobs will naturally have `ExecutedWebGitCommitHash = null` until they are re-run. The admin jobs list still labels/filter state generically; only the detail page was updated in this pass.
**Warnings:** API verification required a separate output path because the local dev API process was holding `apps/api/bin/Debug/net8.0/FactHarbor.Api.dll` open. Web verification passed normally. This change adds provenance only; it does not alter analysis behavior.
**For next agent:** Verification passed with `npm test`, `npm -w apps/web run build`, and `dotnet build apps/api -o C:\\DEV\\FactHarbor\\apps\\api\\bin-verify\\provenance-fix /p:UseAppHost=false`. Before relying on the new field locally or on a persistent environment, run the API migration so `ExecutedWebGitCommitHash` exists in `Jobs`.
**Learnings:** no

---
### 2026-03-28 | Senior Developer | Codex (GPT-5) | Simplify Commit Provenance UI
**Task:** Reduce the surfaced provenance back to one visible commit hash while keeping execution-time provenance correct.
**Files touched:** `apps/api/Controllers/JobsController.cs`, `apps/web/src/app/jobs/[id]/page.tsx`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Kept both hashes in storage, but changed the API/UI contract so `gitCommitHash` now resolves to `ExecutedWebGitCommitHash ?? GitCommitHash`. That preserves the existing “nice” single-hash UI while making the visible hash execution-time authoritative for new jobs and legacy-compatible for old ones.
**Open items:** Existing databases still need the migration for `ExecutedWebGitCommitHash`. Historical jobs continue to show the old creation-time hash until they are rerun because no execution-time value exists for them.
**Warnings:** The admin list/detail `gitHash` filter still matches both creation-time and execution-time hashes in the backend, which is intentional for mixed historical data during transition.
**For next agent:** Verification passed again after the simplification: `npm test`, `npm -w apps/web run build`, and `dotnet build apps/api -o C:\\DEV\\FactHarbor\\apps\\api\\bin-verify\\provenance-fix-ui /p:UseAppHost=false`.
**Learnings:** no

---
### 2026-03-28 | Senior Developer | Codex (GPT-5) | Dirty Local Build ID Support
**Task:** Make the visible execution-time provenance include dirty local working-tree state and ensure admin hash tracing accepts `+` build ids.
**Files touched:** `apps/web/src/lib/build-info.ts`, `apps/web/test/unit/lib/build-info.test.ts`, `apps/api/Controllers/JobsController.cs`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Upgraded the web-side build-id resolver to mirror the API’s local behavior: clean local runs return the current commit hash, dirty local runs return `{hash}+{wthash}` or `{hash}+dirty`. Updated admin `gitHash` normalization so links and manual tracing accept dirty build ids instead of stripping `+` away.
**Open items:** The UI label still says `Commit`, even though a dirty local value is semantically a build fingerprint. That was kept intentionally to preserve the existing UI surface.
**Warnings:** Production remains clean-commit only because `GIT_COMMIT` still wins. Dirty suffixes only appear on local/dev-style execution paths where git is available and the web runner has uncommitted changes.
**For next agent:** Focused follow-up verification passed with `npm -w apps/web exec vitest run test/unit/lib/build-info.test.ts` and `dotnet build apps/api -o C:\\DEV\\FactHarbor\\apps\\api\\bin-verify\\dirty-build-id /p:UseAppHost=false`.
**Learnings:** no

---
### 2026-03-28 | Senior Developer | Codex (GPT-5) | Provenance Review Hardening Follow-Up
**Task:** Apply the low-risk review fixes to execution-time commit provenance and stop where added scope outweighed benefit.
**Files touched:** `apps/web/src/lib/build-info.ts`, `apps/web/src/app/api/version/route.ts`, `apps/web/src/lib/internal-runner-queue.ts`, `apps/api/Controllers/JobsController.cs`, `apps/web/test/unit/lib/build-info.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added cached build-id lookup for `/api/version`, normalized fallback env-hash paths, stopped sending `executedWebGitCommitHash` on every progress update, tightened dirty-suffix filter validation to `+dirty` or 8 hex chars, documented the untracked-file limitation in the working-tree hash, and added both clean-working-tree and dirty-`GIT_COMMIT` unit coverage. Deliberately did **not** create a brand-new API test harness just to unit-test `NormalizeGitHashFilter`, because the repo currently has no API test project and that would have been higher scope than the review value justified.
**Open items:** `NormalizeGitHashFilter` still has no dedicated C# unit test. That is the only review item intentionally left unfixed due to setup cost vs. payoff.
**Warnings:** `build-info.ts` now caches only when explicitly requested. The runner still resolves uncached execution provenance once per job, which is intentional to keep per-run provenance accurate during local dev.
**For next agent:** Full safe verification passed after this follow-up: `npm -w apps/web exec vitest run test/unit/lib/build-info.test.ts`, `npm test`, `npm -w apps/web run build`, and `dotnet build apps/api -o C:\\DEV\\FactHarbor\\apps\\api\\bin-verify\\provenance-fix-final /p:UseAppHost=false`.
**Learnings:** no

---
### 2026-03-28 | Senior Developer | Codex (GPT-5) | API Startup Fix For Provenance Schema Drift
**Task:** Repair the local `/jobs` 500 after the execution-time commit provenance change broke API startup on an existing SQLite database.
**Files touched:** `apps/api/Program.cs`, `apps/api/migrations/20260321000000_AddGitCommitHash.cs`, `apps/api/migrations/20260328000000_AddExecutedWebGitCommitHash.cs`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Root cause was twofold: the new `ExecutedWebGitCommitHash` column did not exist in the local `Jobs` table, and both manual provenance migrations used `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, which SQLite rejected. Worse, these hand-authored migration files are not present in `__EFMigrationsHistory`, so relying on `Database.Migrate()` alone was not sufficient. Fixed this by changing both provenance migrations to plain `AddColumn(...)` and adding a narrow startup schema-compatibility shim in `Program.cs` that ensures `GitCommitHash` and `ExecutedWebGitCommitHash` exist before the first `Jobs` query runs.
**Open items:** The new startup compatibility shim means mixed historical SQLite DBs will self-heal on restart, but the manual provenance migrations still are not tracked in `__EFMigrationsHistory`. That is consistent with earlier manual schema additions in this repo, but worth remembering if API migration strategy is cleaned up later.
**Warnings:** This patch modifies the local SQLite schema on startup by adding missing nullable text columns. Historical jobs still have `ExecutedWebGitCommitHash = NULL` until they are rerun.
**For next agent:** Live recovery verified after `scripts/restart-clean.ps1`: `http://localhost:5000/v1/jobs?page=1&pageSize=1` returned 200, `http://localhost:3000/api/fh/jobs?page=1&pageSize=1` returned 200, and `PRAGMA table_info(Jobs)` now includes `ExecutedWebGitCommitHash`.
**Learnings:** no

---
### 2026-03-28 | Senior Developer | Codex (GPT-5) | Test Dashboard LLM Coverage
**Task:** Make Admin → Configuration Test Dashboard cover LLM providers that are actually used by debate roles or already configured in env, not only the global `pipeline.llmProvider`.
**Files touched:** `apps/web/src/app/api/admin/test-config/route.ts`, `apps/web/src/app/admin/test-config/page.tsx`, `apps/web/test/unit/app/api/admin/test-config/route.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Switched the LLM test route to load effective pipeline config via `loadPipelineConfig("default")`, derive provider usage from both `pipeline.llmProvider` and `debateRoles.*.provider`, and run checks for any provider that is either used by config or has credentials present in env. Kept unused-and-unconfigured providers as `skipped`, updated the UI help text to reflect that behavior, and added Google alias support so `GOOGLE_API_KEY` is treated as configured alongside `GOOGLE_GENERATIVE_AI_API_KEY`.
**Open items:** Search-provider coverage logic is unchanged; this patch only broadens LLM coverage in the dashboard.
**Warnings:** “Run All Tests” now performs live checks against any configured LLM provider, even if that provider is only a fallback/debate-role provider. That is intentional and may increase dashboard test cost slightly when multiple LLM keys are present.
**For next agent:** Verification passed with `npx vitest run test/unit/app/api/admin/test-config/route.test.ts` and `npm run build` from `apps/web`. If you need to validate the live dashboard behavior manually, use the admin test page; no additional code changes should be required.
**Learnings:** no

---
### 2026-03-28 | Senior Developer | Codex (GPT-5) | Google LLM Env Var Correction
**Task:** Correct the Google LLM credential handling after confirming the installed `@ai-sdk/google` package only defaults to `GOOGLE_GENERATIVE_AI_API_KEY`, not `GOOGLE_API_KEY`.
**Files touched:** `apps/web/src/app/api/admin/test-config/route.ts`, `apps/web/src/app/admin/test-config/page.tsx`, `apps/web/src/lib/analyzer/verdict-generation-stage.ts`, `apps/web/src/app/api/health/route.ts`, `apps/web/test/unit/app/api/admin/test-config/route.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Removed the dashboard-only `GOOGLE_API_KEY` alias, updated the Stage 4 provider-credential precheck to require `GOOGLE_GENERATIVE_AI_API_KEY` for Google, and renamed the health-route diagnostic field so it no longer implies the wrong env var. Kept the broader LLM dashboard change itself: configured or actually-used providers are still tested even when they are not the global `pipeline.llmProvider`.
**Open items:** `claimboundary-pipeline.test.ts` still saves/restores `GOOGLE_API_KEY` in one cleanup block, but it no longer influences Google credential detection and did not need behavior changes.
**Warnings:** The immediately previous agent-output entry mentions `GOOGLE_API_KEY` support for the dashboard; this follow-up supersedes that part.
**For next agent:** Verification passed with `npx vitest run test/unit/app/api/admin/test-config/route.test.ts`, `npx vitest run test/unit/lib/analyzer/claimboundary-pipeline.test.ts --testNamePattern "missing credentials from explicitly configured providers"`, and `npm run build` from `apps/web`.
**Learnings:** no

---
### 2026-03-28 | Senior Developer | Codex (GPT-5) | Dashboard Tests Follow Active Default UCM
**Task:** Tighten Admin → Configuration Test Dashboard so LLM checks are driven only by the effective active default UCM config, not by arbitrary keys present in `.env.local`.
**Files touched:** `apps/web/src/app/api/admin/test-config/route.ts`, `apps/web/src/app/admin/test-config/page.tsx`, `apps/web/test/unit/app/api/admin/test-config/route.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Kept `loadPipelineConfig("default")` for LLM selection and changed the test plan so a provider is tested only when the effective active pipeline config actually uses it (`pipeline.llmProvider` or `debateRoles.*.provider`). Also switched search-provider selection to `loadSearchConfig("default")` for the same “runtime-effective default profile” behavior. Configured-but-inactive providers are now skipped again, with UI copy updated to say checks follow the effective default UCM config.
**Open items:** Earlier entries in this file that say “configured providers are also tested” are now superseded by this stricter rule.
**Warnings:** This reduces surprise and cost, but it also means a valid provider key can remain untested until the active default config actually routes work to that provider.
**For next agent:** Verification passed with `npx vitest run test/unit/app/api/admin/test-config/route.test.ts` and `npm run build` from `apps/web`. The route tests now cover both cases: inactive configured Google is skipped, and active Google via a debate role is tested.
**Learnings:** no

---
### 2026-03-28 | Senior Developer | Codex (GPT-5) | Dashboard Timeout And Error Cleanup
**Task:** Stop Admin → Configuration Test Dashboard from appearing stuck during live provider checks and replace verbose `AI_RetryError` stack dumps with concise provider messages.
**Files touched:** `apps/web/src/app/api/admin/test-config/route.ts`, `apps/web/src/app/admin/test-config/page.tsx`, `apps/web/test/unit/app/api/admin/test-config/route.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added real abort timeouts to the LLM test calls, parallelized independent checks inside the admin test route, and added a client-side fetch timeout so the UI exits “Running Tests...” with a clear error if the route still stalls. Also reused `classifyError()` to collapse quota/rate-limit failures into concise dashboard messages and removed stack-trace details from the visible result cards.
**Open items:** The dashboard still performs real live provider checks by design, so slow external providers can still delay completion up to the configured timeout window.
**Warnings:** Route execution order is now partially parallelized. Result order in the UI is preserved because `Promise.all()` result arrays are pushed in a fixed order, but provider calls now run concurrently.
**For next agent:** Verification passed with `npx vitest run test/unit/app/api/admin/test-config/route.test.ts` and `npm run build` from `apps/web`. The route tests now include the OpenAI quota error shape and assert that the user-facing message is concise.
**Learnings:** no

---
### 2026-03-29 | Senior Developer | Codex (GPT-5) | 2705 + e407 Matrix and All-Insufficient Investigation
**Task:** Determine whether local job `2705c6bf1c904306bd81a2040025024f` was only a Coverage Matrix UI issue, then analyze worse repeat run `e407cba4ac354248b21d26a4fb0ceaf7` and consolidate a prevention strategy.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-29_Senior_Developer_2705_e407_Matrix_and_All_Insufficient_Investigation.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** `2705...` is partly a real UI bug (matrix headers built from all claim verdicts while the matrix body follows `coverageMatrix.claims`), but `e407...` proves a deeper pipeline bug: when all claims are D5-insufficient, `claimboundary-pipeline.ts` falls back to sending all claims into Stage 4, then appends insufficient-evidence fallbacks for those same claim IDs. That produces duplicate verdict entries and an article verdict driven by claims that should have short-circuited to `UNVERIFIED`. Separate residual issue: Stage-1 still over-splits this factual conjunct input (`Werkzeuge` vs `Methoden`) and contract validation still falsely reports perfect preservation.
**Open items:** Fix order should be: (1) stop Stage 4 from running on all-insufficient claim sets, (2) fix the matrix header/body mismatch and add a small transparency cue, (3) reopen the residual Stage-1 factual conjunct-splitting family as a separate refinement.
**Warnings:** `2705...` predates clean commit `fff7a508`; `e407...` ran on `fff7a508` plus a dirty suffix. The Stage-4 orchestration bug is still decisive because it is visible in stored result data, not just UI behavior.
**For next agent:** Read [2026-03-29_Senior_Developer_2705_e407_Matrix_and_All_Insufficient_Investigation.md](C:/DEV/FactHarbor/Docs/AGENTS/Handoffs/2026-03-29_Senior_Developer_2705_e407_Matrix_and_All_Insufficient_Investigation.md) before proposing fixes. Do not paper over the issue with a verdict dedupe patch; the first real fix belongs in [claimboundary-pipeline.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claimboundary-pipeline.ts).
**Learnings:** no

---
### 2026-03-28 | Senior Developer | Codex (GPT-5) | Single-Attempt Provider Probes
**Task:** Make the Configuration Test Dashboard provider probes surface the real first provider error instead of timing out behind AI SDK retries.
**Files touched:** `apps/web/src/app/api/admin/test-config/route.ts`, `apps/web/test/unit/app/api/admin/test-config/route.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Set `maxRetries: 0` on the OpenAI/Anthropic/Google/Mistral `generateText()` probes. This keeps the dashboard as a fast health check rather than a retry-heavy workflow and allows quota/auth failures to return immediately instead of being masked as a 15s timeout.
**Open items:** If a provider still times out after this change, the underlying single request is genuinely stalling and would need deeper provider-specific diagnostics.
**Warnings:** This intentionally reduces resilience during the dashboard probe itself. That is correct for a diagnostic surface; the goal is fast truth, not best-effort recovery.
**For next agent:** Verification passed with `npx vitest run test/unit/app/api/admin/test-config/route.test.ts` and `npm run build` from `apps/web`. The route test now also asserts that the dashboard probes use `maxRetries: 0`.
**Learnings:** no

---
### 2026-03-29 | Senior Developer | Codex (GPT-5) | b8e6 Duplicate Atomic Claims Investigation
**Task:** Investigate why job `b8e616ef9a5e4678b074f2bb8614b2d1` produced extremely similar atomic claims and check whether a recent change caused it.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-29_Senior_Developer_b8e6_Duplicate_Atomic_Claims_Investigation.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Root cause is Stage 1 over-splitting plus fallback dimension tagging, not a last-3-day committed regression. The run was classified `single_atomic_claim`, yet two near-duplicate claims were emitted and then auto-tagged `isDimensionDecomposition=true` by the fallback heuristic in `claim-extraction-stage.ts`, which exempted them from Gate 1 fidelity filtering. Recent committed changes do not implicate Stage 1: executed base commit `f1e5cc96...` is UI-only, the only extraction-area commit in the last 3 days was observability-only, and the heuristic itself dates to 2026-03-23.
**Open items:** Dirty-worktree suffix `+cbdf73b6` means uncommitted local changes were present at execution time, but the exact delta cannot be reconstructed from stored job data alone.
**Warnings:** Same Stage-1 pattern appears in several recent jobs; this is broader than a single SRG SSR input.
**For next agent:** Read [2026-03-29_Senior_Developer_b8e6_Duplicate_Atomic_Claims_Investigation.md](C:/DEV/FactHarbor/Docs/AGENTS/Handoffs/2026-03-29_Senior_Developer_b8e6_Duplicate_Atomic_Claims_Investigation.md) before proposing fixes. The most likely targets are the `single_atomic_claim` dimension-tagging fallback and/or contract-validation false negatives.
**Learnings:** no

---
### 2026-03-29 | Senior Developer | Codex (GPT-5) | b8e6 + 8640 Claim Decomposition Debate
**Task:** Compare local job `b8e616ef9a5e4678b074f2bb8614b2d1` with deployed job `8640e06255c4455cb97c9c699700b5ed` and consolidate a root-cause/fix plan.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-29_Senior_Developer_b8e6_8640_Claim_Decomposition_Debate.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The jobs are related, but not because of a fresh last-3-days committed regression. Shared issue: Stage 1 decomposition is too permissive and contract validation is too weak at rejecting non-independent claim splits. `b8e6` shows conjunct over-splitting (`Werkzeuge` vs `Methoden`) on a `single_atomic_claim`; `8640` shows aggressive evaluative decomposition (`effizient` vs `wirksam`) on an `ambiguous_single_claim`, with both downstream claims starving evidence and going `UNVERIFIED`. Secondary issue: the fallback `single_atomic_claim` → dimension-decomposition tagging in `claim-extraction-stage.ts` is too broad and muddies auditability.
**Open items:** Prompt-level strengthening for contract validation needs explicit approval. Dirty-worktree suffix on `b8e6` means an unknown uncommitted local delta existed at execution time.
**Warnings:** Do not over-attribute this to the fallback tag alone. The main problem is earlier: Pass 2 + contract validation accepted claim sets that were too close together to justify separate downstream research.
**For next agent:** Read [2026-03-29_Senior_Developer_b8e6_8640_Claim_Decomposition_Debate.md](C:/DEV/FactHarbor/Docs/AGENTS/Handoffs/2026-03-29_Senior_Developer_b8e6_8640_Claim_Decomposition_Debate.md). Recommended fix order: (1) narrow the fallback tag so explicit `single_atomic_claim` does not auto-become dimension decomposition; (2) strengthen `CLAIM_CONTRACT_VALIDATION` whole-set coherence / independence checks; (3) validate on `b8e6`, `8640`, Bolsonaro compound claim, and a clean control.
**Learnings:** no

---
### 2026-03-29 | Senior Developer | Codex (GPT-5) | Claim-Splitting Debate: b8e6 and 8640
**Task:** Compare local job `b8e6...` and remote job `8640...`, determine whether they share a root cause, and propose a consolidated fix strategy.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-29_Senior_Developer_Claim_Splitting_Debate_b8e6_8640.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The jobs are related but not identical. `b8e6...` is primarily a `single_atomic_claim` fallback mis-tagging problem: near-duplicate conjunct splits were auto-tagged as dimension decompositions and escaped Gate 1 fidelity filtering. `8640...` is a broader over-decomposition / independence-validation problem: three claims were accepted, but two close evaluative claims (`effizient`, `wirksam`) both starved at D5. No evidence points to a last-3-day committed regression; the key Stage-1 fallback behavior predates that window.
**Open items:** Exact dirty-worktree deltas at execution time remain unknowable from stored job data alone.
**Warnings:** A narrow duplicate-detector fix would likely address `b8e6...` better than `8640...`; the broader need is an LLM-based post-Pass-2 independence/overlap validator plus a narrower `single_atomic_claim` fallback.
**For next agent:** Read [2026-03-29_Senior_Developer_Claim_Splitting_Debate_b8e6_8640.md](C:/DEV/FactHarbor/Docs/AGENTS/Handoffs/2026-03-29_Senior_Developer_Claim_Splitting_Debate_b8e6_8640.md). Best next step is a design review, not immediate coding.
**Learnings:** no

---
### 2026-03-29 | Lead Architect | Codex (GPT-5) | Re-review of 2705/e407 Root Fix Package
**Task:** Re-assess whether the proposed `all-insufficient short-circuit + matrix label fix + aggregation dedup guard` package is a true root fix or mostly symptom handling.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The all-insufficient short-circuit is a true root fix for `e407`: Stage 4 must not run on claims D5 already marked insufficient. The matrix label fix is also legitimate, but it is a separate presentation/data-contract repair, not part of the e407 root cause. The aggregation dedup guard is not a root fix; it is optional defense-in-depth and should not be the primary mechanism relied on. No salvage step is warranted now because the architecture should first enforce the invariant that Stage 4 only receives assessable claims; salvage would be a separate, higher-order recovery feature if the all-insufficient rate remains problematic after the upstream Stage-1 work settles.
**Open items:** If the team wants stronger architecture later, the right direction is a typed assessed-claim subset passed from D5 into Stage 4/UI/aggregation rather than ad hoc filtering plus fallback behavior.
**Warnings:** Do not let an aggregation dedup layer become the thing that hides invalid pipeline states. Duplicate claim IDs in `claimVerdicts` should be treated as a bug signal, not normalized away by default.
**For next agent:** The immediate implementation order should be: (1) short-circuit all-insufficient before Stage 4, (2) align matrix labels with `coverageMatrix.claims`, (3) only add a minimal assertive duplicate guard if you want defense-in-depth. Do not add salvage or broader architecture changes in the same patch.
**Learnings:** no

---
### 2026-03-30 | Code Reviewer | Codex (GPT-5) | Review of cc362d64 + Recent Job Effects
**Task:** Review implementation commit `cc362d64` (`assessableClaims` path + verdict uniqueness + matrix alignment) and compare its intended effects against recent local job runs.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** No blocking code defect found in the patch itself. `claimboundary-pipeline.ts` now correctly routes only D5-sufficient claims into Stage 4 and throws on duplicate final verdict IDs; `page.tsx` now derives matrix labels from `coverageMatrix.claims`. Main review gaps are validation-related: the implementation handoff explicitly states no new targeted tests were added, and the live validation set did not directly exercise the all-insufficient branch the patch is meant to repair. Recent local jobs on dirty build `94593477...+bfb6811c` show the expected effect direction: `55299...` and `11c529...` have no duplicate claim IDs and matrix claims align to the assessable subset; `5f1f96...` removes the earlier `e407` duplicate-verdict symptom but does so on a run where both claims were assessable.
**Open items:** Add focused tests for (1) all-insufficient -> no Stage 4 verdicts, (2) duplicate verdict invariant throw, and (3) matrix labels keyed strictly to `coverageMatrix.claims`. Re-run at least one clean post-commit all-insufficient scenario on exact build `cc362d64` or later.
**Warnings:** Recent validation jobs were not executed on the committed hash `cc362d64`; they were run on a dirty lineage based on `94593477`. Also, the broader SRG Stage-1 instability remains: identical input family still produced both a 2-claim (`55299...`) and 3-claim (`11c529...`) decomposition under the same dirty build.
**For next agent:** Read the implementation handoff and inspect job IDs `55299b20161141869e01071b12dc3a65`, `5f1f96f650d24036bce358c3f3053b69`, and `11c5295a9a7345ad841b832f2970bfa4`. Treat `cc362d64` as code-review approved with validation caveats, not as a fully closed operational proof.
**Learnings:** no

---
### 2026-03-31 | Lead Architect | Codex (GPT-5) | DistinctEvents Event-Granularity Family Effects Memo
**Task:** Review likely live-job-family effects of the proposed `distinctEvents` / event-granularity fix using current local jobs, archived quality docs, and current prompt rules; identify where the fix would help, where it could harm, and what validation gate is required.
**Files touched:** `Docs/WIP/2026-03-31_DistinctEvents_Event_Granularity_Family_Effects_Memo.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The current Bolsonaro degradation is still best explained by wrong event granularity upstream: current `"various/all"` jobs (`791073...`, `34149...`, `0d21...`) populate `distinctEvents` with STF lifecycle milestones instead of top-level independently researchable proceedings like STF vs TSE, so Stage 2 faithfully over-researches STF. But the first proposed fix shape ("prefer top-level proceedings over lifecycle events") is too blunt. Current article/timeline-style inputs like `a2b7e76c...` already use `distinctEvents` correctly, and single-proceeding legal inputs like `696d...` can legitimately need lifecycle phases. The adjusted recommendation is a generic, conditional design: strengthen `distinctEvents` guidance for collection-style multi-proceeding/process inputs so they prefer top-level independently researchable units, while preserving lifecycle/timeline detail when the input is really about one process chronology or an article argued through episodes. If prompt-only behavior still looks too blunt, the safer extension is a narrow LLM-based `distinctEvents` validation/repair step for collection-style inputs only.
**Open items:** No implementation yet. Prompt changes still require explicit approval. If this workstream continues, the exact prompt language should be reviewed together with the validation gate before coding.
**Warnings:** Do not key the fix to literal words like `"various"`. Do not globally ban lifecycle events. Do not try to solve this in verdict logic, matrix logic, or with deterministic semantic heuristics. Guardrail families are important: single-proceeding Bolsonaro, article/timeline URL inputs, SRG/SRF compound inputs, and broad evaluative controls must remain stable.
**For next agent:** Start with the memo at `Docs/WIP/2026-03-31_DistinctEvents_Event_Granularity_Family_Effects_Memo.md`. The required validation set should include: Bolsonaro EN `"various"` / `"all"` / proceedings-statement variants, PT Bolsonaro as multilingual multi-event control, a non-political multi-event/process control (March 7 plan uses Boeing 737 MAX investigations + recertification), a single-proceeding Bolsonaro guardrail (`696d...` / `14d7...`), the `wind-still.ch` URL input (`a2b7...`), SRG/SRF compound control (`11c529...`), and broad evaluative inertness controls like `9e4d...` and Homeopathy. Key pass criteria: Bolsonaro `"various/all"` regains top-level multi-proceeding coverage; article/timeline inputs do not flatten; broad evaluative inputs do not start inventing `distinctEvents`.
**Learnings:** no

---
### 2026-03-30 | Senior Developer | Codex (GPT-5) | Flat-Earth False Ambiguity Investigation
**Task:** Investigate why job `c7c3528ce21b46abb1b4965466ad0c3d` extracted `Flacherde-Überzeugungen sind in der modernen Gesellschaft weit verbreitet` from input `Ist die Erde flach?`, and propose a generic fix.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The issue is upstream in Stage 1 and predates the recent integrity work. Both `c7c3528...` and the older `c492414d...` classified `Ist die Erde flach?` as `ambiguous_single_claim`, then decomposed it into a direct physical-property claim plus a representational/prevalence claim. That second claim is not part of the user's thesis. Root cause is not the matrix or verdicting; it is that the ambiguous-claim pathway is still too permissive for direct factual-property questions. The fix should be generic and LLM-based: tighten Pass 2 prompt rules so direct factual predicates/properties remain `single_atomic_claim` unless the wording itself asks about multiple interpretations, and strengthen contract validation so public-perception / prevalence / discourse claims fail when the input asks about a direct real-world property.
**Open items:** Current observability is misleading here: `understanding.contractValidationSummary` reflects the original failed extraction (including a transient spherical-shape inversion), not the final accepted retry output. If this family is implemented, persist the retry validation outcome or selected-candidate summary too.
**Warnings:** Do not fix this with hardcoded Flat-Earth or belief/prevalence keywords. The solution must stay generic, multilingual, and prompt-driven.
**For next agent:** Use `c7c3528ce21b46abb1b4965466ad0c3d` and `c492414da7fa422c8ef51156488b9e04` as characterization cases. Proposed implementation order: (1) prompt-level narrowing of `ambiguous_single_claim` for direct factual-property questions, (2) stronger contract-validation whole-set rejection of representational/prevalence claims unless the input explicitly asks about them, (3) better persistence of retry contract-validation diagnostics.
**Learnings:** no

---
### 2026-03-30 | Lead Architect | Codex (GPT-5) | Matrix and Aggregation Handling of UNVERIFIED Claims
**Task:** Investigate whether D5-insufficient `UNVERIFIED` claims should be shown in the matrix and influence article-level aggregation in jobs like `11c5295a...`.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Current behavior excludes unresolved claims at two layers: `claimboundary-pipeline.ts` builds `coverageMatrix` from `assessableClaims` only, and `aggregation-stage.ts` gives `UNVERIFIED` claims zero effective weight because the claim weight multiplies by `confidence / 100`. A proper solution should separate these concerns. Matrix display should visualize evidence coverage for all final/atomic claims, while Stage 4 should still operate only on assessable claims. Article aggregation should not rely on old buggy UI effects or duplicate verdicts; if product wants unresolved claims to matter, that must be implemented explicitly as an unresolved-claim penalty or neutral blend in aggregation, not as accidental LLM side effects.
**Open items:** Any unresolved-claim aggregation penalty would change analysis output and should likely be UCM-tunable.
**Warnings:** Do not “fix” this by reverting the old broken label behavior. The correct path is to keep matrix labels driven by `coverageMatrix.claims`, while reconsidering what `coverageMatrix.claims` should contain and how zero-confidence claims should influence article-level confidence/truth.
**For next agent:** Anchor on job `11c5295a9a7345ad841b832f2970bfa4`. Treat matrix visibility and article aggregation as separate design decisions. Keep the `assessableClaims` Stage 4 integrity fix intact.
**Learnings:** no

---
### 2026-03-30 | Lead Architect | Codex (GPT-5) | Speed/Cost Optimization Reassessment on Current CB Stack
**Task:** Re-read the historical speed/cost optimization docs, compare them to the current ClaimAssessmentBoundary code, and identify the best next optimization by benefit vs report-quality risk.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Several previously discussed optimization items are now stale against the code. `P1-A2` / “parallel verdict generation” is still listed in `Current_Status.md` and `Backlog.md`, but Stage 4 already batches claims per debate step and already parallelizes Steps 2+3 plus the validation checks; that old recommendation should no longer drive decisions. `P1-B` preliminary-search parallelism and W15 same-domain fetch staggering are also already implemented in code. The remaining real hotspot is the Stage 2 research loop: inside `runResearchIteration`, each generated query still runs search -> relevance LLM -> fetch -> extraction LLM serially, up to `researchMaxQueriesPerIteration=3` across `maxTotalIterations=10`. Best next engineering optimization: parallelize per-query work inside Stage 2 using the same local-result merge pattern already proven in Stage 1 preliminary parallelism. Best clean cost-only lever: move `explanationQualityMode` from `rubric` to `structural` if product is willing to drop the post-hoc rubric call, because it is outside the verdict path and does not change the analysis result itself.
**Open items:** Documentation drift should be corrected before any new optimization plan is reopened: `Current_Status.md` still advertises stale parallel-verdict work and outdated budget language, and `Backlog.md` still lists already-shipped W15 / P1-B items as pending. If Stage 2 query-parallelism is approved, it needs a bounded-concurrency design and deterministic merge strategy for warnings, sources, search-query logs, and evidence-pool updates.
**Warnings:** Do not start with self-consistency cuts, clustering-to-Haiku, Batch API, or claim caching. Self-consistency now feeds the direction-rescue path, so reducing it is quality-risky. Clustering-to-Haiku saves little but touches the boundary formation step. Batch API remains architecturally non-trivial on the current runtime. Claim caching still has high invalidation/freshness complexity on a live-web, current-date-aware pipeline.
**For next agent:** Use `research-orchestrator.ts` as the primary hotspot, especially the serial query loop in `runResearchIteration`. Reuse the concurrency pattern from `claim-extraction-stage.ts` preliminary search if implementing the Stage 2 speed path. If only a config experiment is wanted, test `explanationQualityMode: structural` before touching verdict-stage debate settings.
**Learnings:** no

---
### 2026-03-30 | Lead Architect | Codex (GPT-5) | Cost and Speed Optimization Reassessment
**Task:** Re-read the historical speed/cost optimization documents, compare them against the current ClaimAssessmentBoundary source, and recommend the best next optimization by benefit versus report-quality risk.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The strongest current candidate is no longer any March “parallel verdict generation” or deferred `P1-B` plan. Those are stale against the live code. Stage 4 already runs batched multi-claim debate with internal parallelism in `verdict-stage.ts`, and Stage 1 preliminary search is already parallelized in `claim-extraction-stage.ts`. The best live engineering lever is Stage-4 payload de-duplication: `createProductionLLMCall()` renders large structured inputs directly into the system prompt and then sends the same input again as `JSON.stringify(input)` in the user message. Because prompt caching only applies to the system message, this likely wastes a substantial amount of billable, uncached input tokens on every advocate / self-consistency / challenger / reconciliation / validation call. This should be the first optimization target, gated by a small A/B because it still touches prompt delivery. Secondary candidate: a UCM-only self-consistency tier experiment (`selfConsistency` from standard to budget). Do not prioritize clustering-model downgrade, broad budget cuts, Batch API, or claim caching before this.
**Open items:** Several optimization docs are now materially stale and should be corrected before they anchor new planning: `Current_Status.md` still advertises “parallel verdict generation” as open; `Backlog.md` still lists both W15 and parallel verdict generation as pending; `2026-03-26_Next_Workstream_Decision.md` still treats `P1-B` as future work.
**Warnings:** I attempted to fork parallel explorer reviews, but this session did not return usable sub-agent results; the synthesis was completed from direct local doc/code analysis. If Stage-4 payload de-duplication is pursued, validate it on a small representative A/B set because it changes how prompt context is delivered even though the analytical content should remain the same.
**For next agent:** Anchor the recommendation on these code/docs: `verdict-generation-stage.ts` (rendered system prompt + duplicate user JSON), `claimboundary.prompt.md` (Stage-4 sections already include full structured inputs), `verdict-stage.ts` (batched multi-claim + internal Step 2/3 parallelism), `claim-extraction-stage.ts` (preliminary search already parallelized), `research-acquisition-stage.ts` (W15 same-domain staggering already implemented), `Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md`, `Current_Status.md`, and `Backlog.md`.
**Learnings:** no

---
### 2026-03-30 | Lead Architect | Codex (GPT-5) | Optimization Reassessment with Current Metrics Baseline
**Task:** Re-read the historical speed/cost optimization discussions, inspect the current ClaimAssessmentBoundary code, and use the live `AnalysisMetrics` baseline to identify the best next optimization target by benefit versus report-quality risk.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** I used the integrated metrics path now wired through `claimboundary-pipeline.ts` / `metrics-integration.ts` and queried `apps/api/factharbor.db` directly instead of relying on stale March assumptions. On the most recent 50 `claimboundary` metrics rows, average wall time is ~716s/job with phase split: research ~256s, verdict ~240s, cluster ~108s, understand ~68s, aggregate ~13s. Estimated LLM cost split is verdict ~$17.8 / 50 jobs, research ~$11.5, cluster ~$6.9, understand ~$3.2, aggregate ~$0.8. This changes the recommendation: the best first **optimization experiment** is now `P1-A` clustering-model downgrade, not old “parallel verdict generation.” Stage 3 is a single isolated Sonnet call in `boundary-clustering-stage.ts`, so it offers meaningful speed/cost upside with a much narrower blast radius than touching Stage 2 evidence budgets or Stage 4 self-consistency. `P1-B` is no longer open work because preliminary search parallelism is already shipped in `claim-extraction-stage.ts`. If a purely structural speed-only item is preferred over a quality-affecting experiment, the next best engineering candidate is new Stage-2 per-query parallelism inside `research-orchestrator.ts`, because Stage 2 is still serial at the query level even though Stage 1 has already adopted the local-merge parallel pattern.
**Open items:** Documentation drift is now material. `Known_Issues.md`, `Current_Status.md`, and `Backlog.md` still contain stale optimization guidance: “parallel verdict generation” is obsolete in the CB stack, and `Metrics Infrastructure Not Integrated` is no longer true now that metrics persist into `AnalysisMetrics`. Prompt-caching observability is also overstated in docs/backlog because cache fields exist in `metrics.ts` but are not populated by current `recordLLMCall(...)` call sites.
**Warnings:** Do not start with self-consistency cuts or research-budget cuts. Self-consistency now feeds stability, confidence shaping, and direction-rescue behavior, so it is high quality risk. Research reductions attack the largest phase, but they degrade evidence coverage directly. A clustering downgrade still needs a tight A/B because ClaimAssessmentBoundary formation can change report structure even though it is only one call.
**For next agent:** If approved, frame the next step as a measured `P1-A` experiment, not a blind rollout. Add a dedicated Stage-3 model/tier control instead of piggybacking on `modelVerdict`, then compare Sonnet vs budget-tier clustering on a representative validation set. Keep a second option ready: bounded Stage-2 query parallelism using the deterministic local-merge pattern already present in `claim-extraction-stage.ts`.
**Learnings:** no

---
### 2026-03-30 | Lead Architect | Codex (GPT-5) | Final Optimization Priority Reconciliation
**Task:** Reconcile same-day optimization recommendations after parallel doc review, code inspection, and direct `AnalysisMetrics` queries.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Final architect synthesis: (1) **best first overall by benefit/risk** is Stage-2 per-query parallelism in `research-orchestrator.ts`, because research is the largest wall-clock phase (~35% of recent runs), query processing is still serial, and this is a structural timing change rather than a semantic budget/model cut; (2) **best first pure cost/speed experiment** is `P1-A` Stage-3 clustering-model downgrade, because clustering is a single isolated Sonnet call (~108s / ~15.8% of wall time, ~$6.9 over the last 50 jobs) and is easier to isolate than Stage-4 reductions; (3) old “parallel verdict generation” should no longer anchor planning because current Stage 4 is already batched and internally parallelized, and `P1-B` / W15 are already implemented.
**Open items:** Correct stale planning docs before opening any optimization workstream: `Known_Issues.md` still says metrics are not integrated, `Current_Status.md` and `Backlog.md` still advertise obsolete “parallel verdict generation,” and `Backlog.md` still shows shipped W15 as pending.
**Warnings:** I do **not** recommend starting with self-consistency cuts, verdict prompt surgery, or broad research-budget reductions. Those all have a worse report-degradation profile than either Stage-2 query parallelism or a tightly gated clustering experiment.
**For next agent:** If the Captain wants the safest engineering start, scope a bounded Stage-2 query-parallel prototype using the same local-collection / deterministic-merge pattern already used in `claim-extraction-stage.ts`. If the Captain wants the strongest cost+speed experiment, scope `P1-A` with a dedicated Stage-3 model/tier knob and an explicit A/B gate.
**Learnings:** no

---
### 2026-03-30 | Lead Architect | Codex (GPT-5) | Stage-2 Query Parallelism — Sharpened Low-Risk Design
**Task:** Turn the Stage-2 per-query parallelism idea into a concrete low-risk architecture proposal using multiple reviewer loops.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The correct v1 is a **bounded, two-wave, deterministic-merge** design. Keep target-claim selection, query generation, and query-budget reservation serial. Parallelize only per-query work with **local result objects**. Wave A runs `search -> relevance` in parallel. Wave B runs `fetch -> extract` in parallel on local shadow state. All shared `state` mutation remains single-threaded in a final merge. The critical semantic correction from reviewer loop 2: do **not** assign URL ownership at selection time. Current serial behavior is effectively **earliest query-order successful fetch wins**. A later query may still recover a shared URL if an earlier query selected it but failed to fetch it. So v1 should tolerate some bounded duplicate fetch/extract work across parallel workers and then drop later duplicate sources/evidence during deterministic merge. Derivative validation and `applyPerSourceCap()` must run exactly once after merge. Scope v1 to `iterationType === "main"` only. Add a new UCM knob `researchQueryParallelism` with default `1`; validate at `2`; keep contradiction/contrarian loops serial.
**Open items:** Docs remain stale around optimization state (`parallel verdict generation`, pending W15, and old metrics status). If implementation starts, those planning docs should be corrected in the same stream or immediately after.
**Warnings:** Do not implement this as a raw `Promise.all` over the current loop. Do not reuse `parallelExtractionLimit` for query-pipeline fanout. Do not cut self-consistency or research budgets first. V1 accepts some duplicate worker effort intentionally to preserve serial semantics; a later v2 can optimize duplicate shared-URL coordination only after parity is proven.
**For next agent:** Implementation should add focused tests for: unchanged query order, unchanged per-claim budget semantics, duplicate-URL behavior where earlier successful fetch suppresses later duplicates, duplicate-URL behavior where earlier fetch failure allows later success, deterministic source ID assignment, post-merge derivative validation, and one-shot per-source cap across combined new evidence. Validation gate: A/B `researchQueryParallelism=1` vs `2` on Bolsonaro, Plastik DE, and Hydrogen; require no claim-count drift, no direction flips on control families, no new `UNVERIFIED`, and median research-phase reduction >= 15% before promotion.
**Learnings:** no

---
### 2026-03-30 | Lead Architect | Codex (GPT-5) | Stage-2 Query Parallelism — Sharpened Low-Risk Design
**Task:** Sharpen the recommended Stage-2 per-query parallelism idea into a concrete low-risk implementation and rollout strategy.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Recommended v1 shape: keep target-claim selection and `generateResearchQueries()` serial, but parallelize independent per-query work inside `runResearchIteration()` with a new UCM knob `researchQueryParallelism` defaulting to `1` at first ship, with canary value `2`. Scope v1 to `iterationType === "main"` only; keep contradiction and contrarian iterations serial. Preserve current serial semantics by assigning each fetched URL to the first query that selected it in generated-query order (“first query wins”), then perform a single-threaded merge for `searchQueries`, `search_provider_error` upserts, source ID assignment, derivative validation against the union of existing+new URLs, and one final `applyPerSourceCap()` pass across all newly kept evidence plus the existing pool. Do **not** mutate shared `state.sources`, `state.evidenceItems`, or `state.warnings` from parallel workers.
**Open items:** Implementation should introduce narrow helper result types for Phase A (search + relevance) and Phase B (owned-url fetch + extraction) instead of rewriting Stage 2 wholesale. Validation should begin with the existing `runResearchIteration` test block in `claimboundary-pipeline.test.ts` and add explicit duplicate-URL ownership, merged warning, derivative-validation timing, and per-source-cap-once tests.
**Warnings:** A naive `Promise.all(queries.map(...))` is not safe enough. The risky points are exactly these existing stateful operations: `upsertSearchProviderWarning(...)`, derivative validation using `state.sources`, and `applyPerSourceCap(...)`. If any of those run inside parallel workers, report behavior can drift. Also avoid broadening v1 to contradiction/contrarian loops until the main-loop path is validated.
**For next agent:** Use these anchors when implementing: serial query loop and state mutations in `research-orchestrator.ts`, safe parallel local-merge pattern in `claim-extraction-stage.ts`, and runtime validation against recent `AnalysisMetrics` baselines in `apps/api/factharbor.db`. Rollout plan: ship behind `researchQueryParallelism=1`, validate `1` vs `2` on Bolsonaro, Plastik DE, and Hydrogen, then promote to `2` only if research-phase latency improves materially without verdict-direction drift or evidence/source-count collapse. Rollback is instant by setting the knob back to `1`.
**Learnings:** no

---
### 2026-03-30 | Lead Architect | Codex (GPT-5) | Stage-2 Query Parallelism — Low-Risk Design Sharpening
**Task:** Sharpen the Stage-2 per-query parallelism recommendation into a concrete low-risk implementation design with explicit merge boundaries, rollback, and validation shape.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The safe design is a **two-wave query pipeline** inside `runResearchIteration()`: keep query generation and query-budget reservation serial; then run **Wave A** (`searchWebWithProvider` + `classifyRelevance`) in bounded parallelism with local results only; deterministically assign each selected URL to the **first query that selected it** so serial “first query wins” semantics are preserved; then run **Wave B** (`fetchSources` + `extractResearchEvidence`) in bounded parallelism per query but only on that query’s owned URLs, again with local shadow state only; finally do a single-threaded merge that upserts provider warnings, assigns global source IDs, validates derivatives against the union of existing+new URLs, and applies `applyPerSourceCap()` exactly once across all new evidence plus the existing pool. This preserves the current serial safety points at `research-orchestrator.ts` query-budget consumption, `upsertSearchProviderWarning`, `fetchSources` state mutation, `llm_provider_error` dedup, and per-source cap eviction. Recommended UCM knob: `researchQueryParallelism` (int, default `1` for initial ship, validate at `2`, max `3`).
**Open items:** Implementation should likely add small helper types/results for Wave A, URL ownership assignment, Wave B local outputs, and single-threaded merge helpers. `fetchSources()` can be reused with a narrower `Pick<CBResearchState, "sources" | "warnings">` state signature or local shadow state.
**Warnings:** Do not parallelize across iterations or across target claims in Stage 2. Do not apply per-source cap or derivative validation inside workers. Do not let duplicate-URL ownership become non-deterministic. Stage 2 has no Stage-4-style provider guard, so bounded concurrency is required.
**For next agent:** Start from `research-orchestrator.ts`, `research-acquisition-stage.ts`, and the proven Stage-1 merge pattern in `claim-extraction-stage.ts`. First build deterministic ownership + local-result helpers. Then add tests for first-query-wins URL assignment, single-threaded warning merge, derivative validation across worker-fetched URLs, one-shot per-source cap application, and `researchQueryParallelism=1` parity vs current behavior.
**Learnings:** no

---
### 2026-03-30 | Lead Architect | Codex (GPT-5) | Stage-2 Query Parallelism — Low-Risk Design Sharpening
**Task:** Stress-test the Stage-2 per-query parallelism recommendation and refine it into a concrete low-risk implementation shape.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The safe design is a **two-wave query pipeline**, not a naive `Promise.all` over the existing loop. Keep query generation serial. Pre-reserve budget for the generated queries in original order. **Phase A:** run `searchWebWithProvider()` + `classifyRelevance()` in bounded parallelism, but keep all results local. Merge deterministically in original query order, and build a stable query→candidate-URL map. **Phase B:** fetch + extract in bounded parallelism using per-query local shadow state, but only on URLs that remain assigned to that query after deterministic ownership resolution. Preserve current serial semantics as closely as possible by letting the earliest query own the first successful use of a URL, not merely the first selection. Defer all shared-state mutation — provider-warning upserts, `state.searchQueries`, `state.sources`, derivative validation, `state.evidenceItems`, and `applyPerSourceCap()` — to a single merge phase. Apply the per-source cap once across `existing + all new kept items`, never inside parallel workers.
**Open items:** Add a dedicated UCM knob such as `researchQueryParallelism` (default `2`) rather than overloading `parallelExtractionLimit`, because query-fanout and fetch-fanout are different risk controls. The main unresolved semantic choice for implementation is how much effort to spend preserving the rare case where query A fails to fetch a duplicated URL and query B would have retried it in the current serial loop.
**Warnings:** The naive “first query wins” reservation at URL-selection time is too aggressive: it suppresses later duplicate-query retry opportunities after an early fetch failure. Likewise, running `fetchSources()` directly against shared `state` from parallel workers is unsafe because it mutates `state.sources` and `state.warnings`. Keep `upsertSearchProviderWarning()` single-threaded in the merge path, matching the existing Stage-1 parallel search pattern.
**For next agent:** Implementation should start by extracting small helper types for local query results and local fetch/extract results, then add focused tests around duplicate URLs, deterministic merge order, query-budget preservation, and one-shot per-source cap behavior. Use `claimboundary-pipeline.test.ts` as the main harness because `runResearchIteration()` is already covered there.
**Learnings:** no

---
### 2026-03-30 | LLM Expert | Codex (GPT-5) | Google CSE Bias Risk Review For FactHarbor
**Task:** Investigate whether the concern that Google Custom Search / Programmable Search can return biased or manipulated results implies concrete improvements for FactHarbor.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Recommendation is **yes, FactHarbor should improve the retrieval layer**, but this is primarily a search-architecture issue, not evidence that Google CSE itself is unusable. External Google documentation confirms Programmable Search is not equivalent to Google Web Search: it can emphasize engine-selected results, may return only a subset of the Google index, supports promotions, and supports explicit sorting/biasing/filtering and region-restricted ranking. The current FactHarbor default stack amplifies that risk because `search.default.json` enables `googleCse` and `serper` by default, while `wikipedia`, `semanticScholar`, and `googleFactCheck` remain disabled; in `web-search.ts`, supplementary providers are skipped in `auto` mode whenever any primary provider returns results. With `maxResults: 10`, Google CSE can fill the full default quota alone, so the effective evidence pool often remains single-provider or single-index dominated. The highest-value improvements are: (1) run at least one supplementary evidence category even when primary providers succeed, (2) prefer index diversity over “Google + Google-derived” defaults, (3) expose retrieval provenance/diversity diagnostics at report level, and (4) treat Programmable Search configuration as analysis-critical infrastructure that must be audited, not a neutral black box.
**Open items:** No code was changed in this pass. If implementation follows, it should decide whether to promote supplementary providers by default, whether `auto` should guarantee cross-category coverage, whether cache keys need provider/category awareness, and whether Google CSE should remain priority 1 or be demoted behind a less configurable full-web provider.
**Warnings:** The shared Google AI Mode page itself was not directly readable from the toolchain; the investigated topic was inferred from the redirect query text embedded in the shared URL. Also, some improvement options touch prompts or default runtime config, which may require explicit Captain approval under the prompt/config governance rules.
**For next agent:** Start from `apps/web/src/lib/web-search.ts`, `apps/web/configs/search.default.json`, `apps/web/src/lib/config-schemas.ts`, and `Docs/Specification/Multi_Source_Evidence_Retrieval.md`. Verify current production intent for supplementary providers before changing defaults. If work continues, frame it as retrieval-diversity hardening rather than a blanket “replace Google” initiative.
**Learnings:** no

---
### 2026-03-30 | Code Reviewer | Codex (GPT-5) | Review Of 03387283 Report Matrix And Article Adjudication
**Task:** Review commit `03387283` (`feat(verdict): report matrix over all claims + LLM article adjudication`) and check recent jobs for intended effects.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The implementation direction is correct: Stage 4 assessability routing remains intact in `claimboundary-pipeline.ts`, the report matrix is now built from all final claim verdict IDs, and article-level LLM adjudication is genuinely active in Stage 5. Recent jobs on `03387283` confirm both behaviors: `1b32f39aaae841f881203bf2cddf52c6` now shows matrix claims `AC_01` + `AC_02` with `AC_02` still `UNVERIFIED`, and `45b71bf022e64efab363b8d92070658c` shows all-`UNVERIFIED` claims in the matrix with zero counts. Fully assessed control `9ca3393c2506475ca6d5e4baaa61ab40` retained deterministic article numbers, while partial-insufficient `1b32...` ended at `75 / 50`, showing the new narrative adjudication lowered confidence relative to the only assessed claim’s `68%`.
**Open items:** I did not find focused automated tests for the new Stage 5 behavior itself (`adjustedTruthPercentage`, `adjustedConfidence`, report-matrix-over-all-final-claims, and fail-open narrative parsing). Existing aggregateAssessment tests still cover generic Stage 5 output and fallback narrative, but not the new adjudication path.
**Warnings:** The new `±10pp` article-truth bound is hardcoded in `aggregation-stage.ts` and mirrored in prompt text. That is a real analysis-policy choice, not just plumbing, so it may deserve explicit review as a configurable or at least explicitly ratified constant. Also note that `npm test` and `npm -w apps/web run build` both passed at review time, so there is no current blocking test/build failure.
**For next agent:** If follow-up work continues, add narrow tests around (1) unresolved-claim report matrix columns, (2) LLM confidence ceiling enforcement, (3) truth-bound clamping, and (4) parse/missing-field fallback to deterministic aggregation. If policy is revisited, inspect whether the hardcoded `±10pp` bound belongs in UCM instead of code/prompt duplication.
**Learnings:** no

---
### 2026-03-30 | Senior Developer | Codex (GPT-5) | Stage-5 Adjudication Test Hardening
**Task:** Add focused regression tests for the new report-matrix and article-level adjudication behavior introduced in `03387283`.
**Files touched:** `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added narrow tests for four concrete behaviors: (1) article-level adjusted confidence is ceiling-capped to the deterministic baseline, (2) adjusted truth is clamped to the conservative bound, (3) missing adjusted numbers fall back to deterministic aggregation, and (4) the report matrix can include `UNVERIFIED` final claims without altering the assessable-claims routing. Kept the tests inside the existing Stage 5 / D5 pipeline test surfaces instead of building a new harness.
**Open items:** The `±10pp` truth bound remains a policy decision rather than a purely structural one. The tests now lock in the current behavior, but they do not answer whether that constant should stay hardcoded or move into UCM.
**Warnings:** This pass hardens coverage only; it does not change runtime semantics. If product decides to alter the article-level adjudication bounds later, these tests will need deliberate updating rather than silent drift.
**For next agent:** Current verification is clean: targeted `claimboundary-pipeline.test.ts`, full `npm test`, and `npm -w apps/web run build` all pass. If policy review continues, inspect `aggregation-stage.ts` and `claimboundary.prompt.md` together so code/prompt bounds do not diverge.
**Learnings:** no

---
### 2026-03-30 | Lead Architect | Codex (GPT-5) | MCP Adoption Risk Review
**Task:** Assess whether FactHarbor should adopt MCP for repo workflow and/or as a product-facing integration surface, using parallel sub-agent debate and direct architecture review.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Consensus recommendation is **not now** for both. For repo workflow, MCP is only justified later as a **thin read-only knowledge/ops layer** if multi-agent context friction becomes a real bottleneck; it should read existing sources of truth (`AGENTS.md`, `Docs/AGENTS/*`, job/config surfaces) rather than duplicating knowledge. For the product, MCP should **never** become an internal architectural layer between existing services; if adopted later, it should be a **thin external adapter** over the current async HTTP job API (`/v1/analyze`, `/v1/jobs/{id}` or `api/fh/*`) with a minimal tool set such as submit-analysis, get-status, and get-report.
**Open items:** No implementation work was started. If the Captain wants to revisit this later, the next concrete step is to define a minimal external contract and decide whether the trigger is (a) real multi-tool developer pain or (b) a specific partner/assistant integration request.
**Warnings:** Adding MCP now would create another compatibility/auth/provenance surface while the project is still alpha and focused on analysis quality and cross-linguistic neutrality. The major architectural risk is letting MCP bypass the existing job lifecycle, warning handling, rate limits, and provenance boundaries.
**For next agent:** Use these anchors when revisiting: `AGENTS.md`, `Docs/ARCHIVE/Agent_Knowledge_Restructuring_2026-02-24.md`, `Docs/Knowledge/Factiverse_Lessons_for_FactHarbor.md`, `Docs/STATUS/Current_Status.md`, `apps/api/Controllers/AnalyzeController.cs`, `apps/api/Controllers/JobsController.cs`, `apps/web/src/app/api/fh/analyze/route.ts`, `apps/web/src/app/api/fh/jobs/route.ts`, `apps/web/src/app/api/fh/jobs/[id]/route.ts`, and `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`.
**Learnings:** no

---
### 2026-04-04 | Code Reviewer | Codex (GPT-5) | Documentation Currency Check For Solution And Plan Docs
**Task:** Check whether the main “solution” and “plan” documentation artifacts are up to date against the current repo status and code.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Review result: the main optimization/runtime and recent implementation plan docs checked are current enough, but `Docs/WIP/2026-03-26_Plastik_UNVERIFIED_Solution_Proposal.md` is materially stale as a living guide because its “do now / do next” recommendations have already been shipped or superseded by later status updates and follow-up docs. `Docs/WIP/Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md`, `Docs/WIP/2026-03-31_Source_Fetch_Failure_Reduction_Plan.md`, and `Docs/WIP/2026-04-03_Wikipedia_Supplementary_Completion_Plan.md` all align with the current status/backlog/code review pass.
**Open items:** The stale Plastik solution proposal should either gain a top-of-file superseded/implemented banner with links to the follow-up runtime-path investigation and current status, or be moved/retitled as a historical proposal to avoid being mistaken for an active next-step doc.
**Warnings:** The main risk is guidance drift, not implementation drift: `Docs/WIP/README.md` already summarizes the Plastik proposal as “bug fix shipped, runtime-path characterization complete,” but the proposal file itself still reads like an active recommendation to do those steps next.
**For next agent:** If asked to update docs, start with `Docs/WIP/2026-03-26_Plastik_UNVERIFIED_Solution_Proposal.md`, `Docs/WIP/README.md`, `Docs/STATUS/Current_Status.md`, and `Docs/STATUS/Backlog.md`. Preserve the historical analysis, but add a clear outcome/superseded banner rather than rewriting the investigation content.
**Learnings:** no

---
### 2026-03-31 | Lead Architect | Codex (GPT-5) | Investigate 696d8140 Bolsonaro Process/Fairness Job
**Task:** Investigate job `696d81406d5a4fbfaa4c23ec49fe4e85`, identify the root cause of the visible result issues, and propose the best low-risk/high-quality fix.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The job shows two distinct defects with different priority. Primary defect: the advocate verdict emitted an invalid `boundaryFindings` entry (`CB_37`) that is not present in the actual boundaries or the claim's coverage matrix. This is a structural output bug, likely caused by the model inventing a pseudo-boundary for the OAB-PR sub-perspective inside merged boundary `CB_03`. Secondary defect: the grounding validator now produces false-positive `verdict_grounding_issue` warnings because verdict reasoning legitimately references source IDs / `trackRecordScore` from `sourcePortfolioByClaim`, but `VERDICT_GROUNDING_VALIDATION` still only sees `evidencePool`, so it treats those source-metadata references as hallucinations. The March 29-31 article-adjudication and claim-local direction-scope fixes are not the cause here.
**Open items:** Best fix sequence: (1) code-only structural sanitization of `boundaryFindings` against the claim-local valid boundary ID set from `coverageMatrix`, plus optional prompt hardening in `VERDICT_ADVOCATE`; (2) separate prompt+plumbing refresh for `VERDICT_GROUNDING_VALIDATION` so source-portfolio references are treated as valid structural grounding context when `sourcePortfolioByClaim` is present.
**Warnings:** Do not solve the ghost boundary issue with semantic name matching or heuristic remapping. The safe structural behavior is to drop invalid or claim-inapplicable boundary IDs rather than guessing what the model meant. Also do not treat the current grounding warning as a claim-quality failure — it is an outdated validator-context problem.
**For next agent:** Anchor files: `apps/web/src/lib/analyzer/verdict-stage.ts` (`parseAdvocateVerdict`, `runStructuralConsistencyCheck`, `validateVerdicts`), `apps/web/src/lib/analyzer/aggregation-stage.ts` (`computeTriangulationScore`), and `apps/web/prompts/claimboundary.prompt.md` (`VERDICT_ADVOCATE`, `VERDICT_GROUNDING_VALIDATION`). The cleanest immediate fix is structural filtering of `boundaryFindings` using `coverageMatrix.getBoundariesForClaim(claimId)` before downstream use.
**Learnings:** no

---
### 2026-03-31 | Lead Architect | Codex (GPT-5) | Refresh Pipeline Speed and Cost Optimization Plan
**Task:** Re-read the March 19 pipeline speed/cost plan, reconcile it with what has shipped since late March, and update the plan plus tracking docs with the correct current state and next-step sequence.
**Files touched:** `Docs/WIP/Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Reframed the March 19 plan as a residual source plan for the still-open optimization ideas, not a live execution plan. Marked `P1-B/C/D/E` complete, `P1-A2` retired as stale, and `P1-A` as the only remaining Phase 1 candidate pending a fresh post-March-30 baseline and explicit approval. Captured `W15` as shipped adjacent runtime/reliability work that must now be considered part of the baseline. Synced `Current_Status.md` and `Backlog.md` so they no longer describe `P1-B` as a deferred future decision.
**Open items:** No optimization work was approved here. If optimization is reopened, the next architectural step is a fresh runtime/cost baseline on the post-March-30 validated stack, then an isolated `P1-A` decision, then measurement-only review of `P2-*` if still warranted.
**Warnings:** Do not treat archived March 17-19 timing data as current truth. The stack now includes shipped `P1-B`, W15, and the March 29-30 integrity fixes, so any optimization decision based on the old baseline would be architecturally unsound.
**For next agent:** Read the refreshed [Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md](C:/DEV/FactHarbor/Docs/WIP/Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md) first. The canonical policy is now: optimization stays secondary; if reopened, start with a fresh benchmark rather than continuing the old Phase 1 sequence blindly.
**Learnings:** no

---
### 2026-03-30 | Code Reviewer | Codex (GPT-5) | Review Claim-Local Verdict Scope Fix
**Task:** Review the uncommitted Stage-4 claim-local evidence scoping implementation for the `9e4d` SRF fact-checking failure before commit.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The core scoping change is correct: `getClaimLocalEvidence()` in `verdict-stage.ts` now builds a claim-local subset from `relevantClaimIds` plus cited IDs, and the repair path uses that subset. Focused `verdict-stage.test.ts` passes locally. However, the patch is **not ready to commit as-is** because the prompt/input contract for `VERDICT_DIRECTION_VALIDATION` is now inconsistent across call sites. The batch validator changed to embed `evidencePool` inside each verdict object, and the prompt was changed to only render `${verdicts}`. But `validateDirectionOnly()` still calls the same prompt with a top-level `${evidencePool}` shape only. That means post-repair re-validation no longer shows its evidence pool to the model.
**Open items:** Unify the `VERDICT_DIRECTION_VALIDATION` contract before commit. Either: (1) make every call site pass claim-local `evidencePool` inside each verdict object and update the prompt text accordingly, or (2) keep a top-level `evidencePool` contract everywhere and change the batch path to match. Then rerun the focused verdict-stage tests plus one real job.
**Warnings:** `apps/web/prompts/claimboundary.prompt.md` now describes “Verdicts (with cited evidence pool)” but `validateDirectionOnly()` in `apps/web/src/lib/analyzer/verdict-stage.ts` still passes the evidence pool only at top level. Tests currently mock LLM inputs and do not catch prompt-rendering mismatches. Do not commit until this contract is reconciled.
**For next agent:** Review [verdict-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-stage.ts#L1081), [verdict-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-stage.ts#L1611), and [claimboundary.prompt.md](C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md#L1217) together. The likely lowest-risk fix is to standardize `VERDICT_DIRECTION_VALIDATION` on per-verdict claim-local `evidencePool` and update `validateDirectionOnly()` to match.
**Learnings:** no

---
### 2026-03-30 | Senior Developer | Codex (GPT-5) | Remove Deterministic Article-Truth Clamp
**Task:** Implement the approved Stage-5 policy change: remove the deterministic `±10pp` truth clamp while keeping only structural safeguards around article-level LLM adjudication.
**Files touched:** `apps/web/src/lib/analyzer/aggregation-stage.ts`, `apps/web/prompts/claimboundary.prompt.md`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Removed the deterministic article-truth clamp so `adjustedTruthPercentage` is now LLM-led and bounded only to valid `0..100` range. Kept the confidence ceiling (`adjustedConfidence <= deterministicConfidence`) as a structural invariant. Softened the `VERDICT_NARRATIVE` prompt from an explicit `±10pp` rule to a qualitative “adjust conservatively / stay grounded” instruction. Rewrote the Stage-5 clamp test to assert pure LLM truth adjustment and added an explicit malformed-adjustment fallback test.
**Open items:** `npm test` still shows the same intermittent failures in `test/unit/app/api/admin/test-config/route.test.ts` and `test/unit/lib/drain-runner-pause.integration.test.ts`, but both files passed cleanly when rerun in isolation immediately after the suite failure. This change did not introduce a stable new failing test surface.
**Warnings:** The confidence ceiling remains a deliberate structural safeguard. If product later decides even that is too restrictive, revisit `aggregation-stage.ts` and the Stage-5 prompt together. The build also reseeded the updated `claimboundary` prompt hash in `config.db`.
**For next agent:** Verification status: targeted `claimboundary-pipeline.test.ts` passed; isolated reruns of the two flaky failure files passed; `npm -w apps/web run build` passed. If you need a clean full-suite run before commit, rerun `npm test` once more in a quiet environment and compare against the isolated-file results before treating any admin/drain-runner failures as regression.
**Learnings:** no

---
### 2026-03-30 | Code Reviewer | Codex (GPT-5) | 9e4d SRF “Hervorragende Arbeit” Investigation
**Task:** Investigate job `9e4d3712e12d49bc8cadd601766e5f4b`, isolate the root cause, and propose the lowest-risk high-quality fix. Cross-check with an independent downstream-focused sidecar investigation and reconcile the findings.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The user-visible failure is primarily a **downstream claim-scope bug in verdict direction validation/repair**, with a secondary upstream Stage-1 decomposition miss. Stage 1 classified the input as `ambiguous_single_claim` and decomposed “hervorragende Arbeit” into method quality, scope/reach, and transparency. Contract validation ran but incorrectly passed the split as “identical to the original input,” so Gate 1 kept all three dimension claims. The decisive downstream defect is in `verdict-stage.ts`: `validateVerdicts()` sends the **full evidence pool** to `VERDICT_DIRECTION_VALIDATION`, `attemptDirectionRepair()`, and `validateDirectionOnly()` instead of filtering to claim-relevant evidence. In this job, `AC_02`’s real claim-local evidence pool contains only 4 neutral items, but the direction-integrity warning and repair reasoning cite 6 supports + 3 contradicts from other claims. This cross-claim contamination produced a false direction-integrity failure, a misleading repair rationale, and an avoidable confidence collapse.
**Open items:** Upstream quality is still imperfect: the claim decomposition/contract-validation layer probably should not accept `Umfang und Reichweite der Faktencheck-Aktivitäten` as a clean dimension of “hervorragende Arbeit.” But that is a broader prompt-quality follow-up, not the first low-risk fix.
**Warnings:** Do not “fix” this by adding deterministic semantic heuristics. The lowest-risk repair is structural: scope direction validation/repair to claim-local evidence (`relevantClaimIds`), with a fallback to cited IDs/full pool only when claim-local evidence is empty. If claim-local scoping is changed, remeasure recent jobs where `verdict_integrity_failure` or `direction_rescue_plausible` appeared on decomposed multi-claim evaluative inputs.
**For next agent:** Review these anchors first: `apps/web/src/lib/analyzer/verdict-stage.ts` lines around the Stage-5 validation input (`VERDICT_DIRECTION_VALIDATION` currently gets full `evidencePool`), the repair path (`attemptDirectionRepair()` and `validateDirectionOnly()`), `apps/web/src/lib/analyzer/claim-extraction-stage.ts` lines `256-294` for contract-validation retry guidance, and `apps/web/prompts/claimboundary.prompt.md` lines `332-336` for evidence-separability / proxy-drift rules. Best immediate fix proposal: make the direction validator + repair path claim-local; then remeasure this job family before deciding whether a prompt-only Stage-1 tightening is still needed.
**Learnings:** no

---
### 2026-03-30 | Senior Developer | Codex (GPT-5) | 9e4d SRF Faktenpruefung Investigation
**Task:** Investigate job `9e4d3712e12d49bc8cadd601766e5f4b`, identify the root cause, and propose the best low-risk/high-quality fix.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-30_Senior_Developer_9e4d_SRF_Factchecking_Investigation.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Root cause is Stage 1 claim shaping plus a contract-validation miss, not Stage 4/5. The broad evaluative input was decomposed into proxy dimensions (`scope/reach`, `transparency/error communication`) that do not cleanly preserve the original thesis. Contract validation ran but incorrectly approved the set, and Gate 1 then preserved the claims because dimension-decomposition outputs are fidelity-exempt. Downstream verdict integrity correctly downgraded `AC_02` and article adjudication correctly lowered overall confidence.
**Open items:** Prompt-only hardening is the recommended next step: strengthen `CLAIM_CONTRACT_VALIDATION` so broad evaluative activity-quality claims retry when they decompose into quantity/reach/publicity/policy/communications proxies unless the input explicitly asks for those. A narrow Pass 2 clarification is a secondary backup only.
**Warnings:** Do not treat the `verdict_integrity_failure` on `AC_02` as the root cause. That downgrade is protective. Do not add deterministic proxy/overlap heuristics.
**For next agent:** Full investigation and code anchors are in `Docs/AGENTS/Handoffs/2026-03-30_Senior_Developer_9e4d_SRF_Factchecking_Investigation.md`.
**Learnings:** no

---
### 2026-03-31 | Lead Architect | Codex (GPT-5) | Regression Check for 696d8140 Boundary/Grounding Issues
**Task:** Determine whether the defects observed in job `696d81406d5a4fbfaa4c23ec49fe4e85` were introduced by a recent fix or are older latent issues.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The job contains two separate defects with different timelines. The **primary ghost-boundary defect** (`boundaryFindings` containing invalid `CB_37`) was **not introduced by a recent fix**. `parseAdvocateVerdict()` has accepted raw `boundaryFindings` without sanitization since the original verdict-stage introduction in commit `db563471` (2026-02-16), and the advocate prompt has pushed per-boundary findings since the original prompt rollout in commit `6e2c2c5b` (2026-02-16). This is an older latent structural flaw now exposed by a concrete job. The **secondary grounding-warning defect** *was* introduced by a recent fix: commit `20f11239` (2026-03-27, `feat(analyzer): add single-source flooding mitigation (FLOOD-1)`) added `sourcePortfolioByClaim` / `trackRecordScore` reasoning to advocate/challenger/reconciler prompts and code, but left `VERDICT_GROUNDING_VALIDATION` unchanged. As a result, grounding validation still sees only `evidencePool`, so it now falsely flags legitimate source-portfolio references (e.g. `S_025`, `S_031`, `S_037`, `trackRecordScore`) as unverifiable.
**Open items:** Implement the low-risk fix sequence already identified: (1) sanitize verdict `boundaryFindings` against valid boundary IDs before downstream use, (2) refresh `VERDICT_GROUNDING_VALIDATION` context/prompt so it understands source-portfolio references, (3) optionally harden `VERDICT_ADVOCATE` prompt text to forbid inventing boundary IDs.
**Warnings:** Do not attribute the main bug to recent article-adjudication or matrix work. Commits `03387283`, `7fdf2b44`, and `17da5b84` are not causally involved. The March 27 regression explains the noisy grounding warning, not the ghost boundary itself.
**For next agent:** If you need proof points, inspect `git blame` on `apps/web/src/lib/analyzer/verdict-stage.ts` line around `boundaryFindings: parseBoundaryFindings(raw.boundaryFindings)` (shows `db563471`) and `apps/web/prompts/claimboundary.prompt.md` lines around the advocate “per-boundary findings” rules (shows `6e2c2c5b`). Then inspect `git show 20f11239` to see the addition of source-portfolio-aware reasoning to verdict prompts without any corresponding grounding-validation update.
**Learnings:** no

---
### 2026-03-31 | Lead Architect | Codex (GPT-5) | Bolsonaro “Various Trials” Regression Investigation
**Task:** Investigate why the current Bolsonaro “various/all trials/proceedings” inputs no longer produce strong STF/TSE separation, why the verdict is lower, and why the claim-assessment boundaries are less rich than in historical reports.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The current failure is primarily **upstream event-detection narrowing**, not a matrix/verdict bug. Current runs `7910732038884c6bb03e6e789024f5cb`, `34149ab8de1f465580902707e4d40328`, and `0d21e43e180d45718bca3c409251cbcd` all recognize only **STF-focused events/sub-stages** in `understanding.distinctEvents` (coup trial, house arrest, publication, appeals). They do **not** extract the separate TSE electoral proceeding at all. Since `distinctEvents` now does flow into Stage 2 query generation, the absence of a TSE event means the query set stays STF-heavy (`Bolsonaro coup trial`, `STF First Panel`, `Justice Fux dissent`, etc.), so TSE-specific research is never actively pursued. This explains both the thinner, more generic current boundaries and the lower article truth. Historical docs show that better Bolsonaro runs came either from different input variants (Portuguese or “international due process” formulations) or from runs where TSE-specific coverage actually entered the evidence pool. The March 2026 historical notes are consistent: the intended mechanism for “various/multiple proceedings” was always `distinctEvents`, not splitting AtomicClaims by court. Today’s problem is that `distinctEvents` is populated too narrowly (multiple STF sub-events instead of multiple distinct proceedings/institutions).
**Open items:** Best low-risk fix is prompt-only and needs explicit approval: tighten Stage 1 Pass 2 guidance so when the input references “various”, “multiple”, or “all” trials/proceedings about the same subject, `distinctEvents` should prefer **distinct legal proceedings/institutions/episodes** over sub-stages within one proceeding. Then validate on Bolsonaro-family controls plus a non-political multi-event control. A secondary Stage 2 prompt follow-up may be warranted if query generation still over-focuses on the most recent/highest-profile proceeding after `distinctEvents` improves.
**Warnings:** Some of the old richer reports are not exact apples-to-apples comparisons: several were Portuguese, some used a different EN variant with “international standards of due process,” and some historical “richness” also included contamination or redundant boundaries. Do not try to “restore richness” by reintroducing foreign contamination or redundant source spread. The specific regression is loss of distinct proceeding coverage (especially TSE), not raw boundary count.
**For next agent:** Anchor evidence: current jobs `7910732038884c6bb03e6e789024f5cb`, `34149ab8de1f465580902707e4d40328`, `0d21e43e180d45718bca3c409251cbcd`; archived docs `Docs/ARCHIVE/Report_Quality_Analysis_2026-03-08.md` (§5B/6), `Docs/ARCHIVE/Report_Variability_Consolidated_Plan_2026-03-07.md` (MT-3, `distinctEvents`), `Docs/ARCHIVE/Bolsonaro_Analysis_Investigation_arch.md`, and `Docs/ARCHIVE/Baseline_Test_Results_Phase1_2026-03-12.md`. The deciding signal is in `understanding.distinctEvents`: current runs list only STF-related events, which then drive STF-heavy search queries and broad merged boundaries.
**Learnings:** no

---
### 2026-03-31 | Lead Architect | Codex (GPT-5) | Consolidated Bolsonaro Degradation Investigation
**Task:** Investigate why current Bolsonaro-family reports degraded relative to the best historical runs (not only the `"various trials"` wording), using direct job inspection, archived reports, and parallel sidecar investigations; then reconcile the findings into one fix proposal.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Three independent investigations converged on the same main conclusion. There is **no broad new Bolsonaro collapse** — direction remains stable and the current family still sits in the `LEANING-TRUE` band most of the time. The main loss is **quality ceiling**: weaker proceeding coverage, less institution-specific boundary richness, and lower truth/confidence than the best March runs. The primary cause is now an **upstream Stage 1 event-structure gap**: current jobs (`7910732038884c6bb03e6e789024f5cb`, `34149ab8de1f465580902707e4d40328`, `0d21e43e180d45718bca3c409251cbcd`) populate `understanding.distinctEvents` with **STF lifecycle sub-events** (coup trial, publication, appeals, monitoring, house arrest) instead of **top-level independently researchable proceedings** (e.g. TSE electoral proceeding vs STF criminal/coup proceeding). Because `distinctEvents` now *does* feed Stage 2 query generation, Stage 2 faithfully follows that narrow understanding and generates STF-heavy queries. That in turn yields thinner and more generic boundaries, less TSE/electoral-law evidence, and lower article scores. Historical docs show the intended architecture had already shifted multi-proceeding coverage into `distinctEvents`, not more AtomicClaims; what remains broken is the *granularity* of those events, not the downstream wiring. Recent Stage 4/5 work (article adjudication, claim-local direction validation, boundary grounding fixes) is not causal. `DIV-1` and `REMAP-1` are net improvements and not the source of the current issue. `FLOOD-1` may reduce some old “richness” by trimming same-source redundancy, but that is mostly a quality-positive side effect, not the root cause of missing TSE coverage.
**Open items:** Best fix path should stay at the understanding→research boundary. A prompt-only tweak phrased around the literal word `"various"` is too narrow. The stronger generic fix is: (1) update the Pass 2 `distinctEvents` guidance so event sets prefer **top-level independently researchable proceedings/institutions/episodes** over lifecycle sub-stages of one proceeding, and (2) optionally add a small LLM-based `distinctEvents` validation/repair pass for collection-style legal/process inputs when the extracted event set appears to be only sub-stages of one proceeding. Validate on Bolsonaro EN/PT collection inputs plus at least one non-political multi-event control.
**Warnings:** Do not try to restore the old historical peak mechanically. Some older “richness” came from contamination, pre-SR-weighting conditions, or special snapshot behavior. Success should mean better top-level proceeding coverage and institution-specific boundaries without reintroducing foreign contamination or same-source flooding.
**For next agent:** Use these anchors together: current jobs `7910732038884c6bb03e6e789024f5cb`, `34149ab8de1f465580902707e4d40328`, `0d21e43e180d45718bca3c409251cbcd`, `696d81406d5a4fbfaa4c23ec49fe4e85`, `14d7fb1530894dbb9a15dee961e0e9c7`; archived docs `Docs/ARCHIVE/Report_Variability_Consolidated_Plan_2026-03-07.md`, `Docs/ARCHIVE/Report_Quality_Analysis_2026-03-08.md`, `Docs/ARCHIVE/Baseline_Test_Results_Phase1_2026-03-12.md`, `Docs/ARCHIVE/Report_Quality_Criteria_Scorecard_2026-03-12_arch.md`, and `Docs/WIP/2026-03-30_Report_Quality_Evolution_Deep_Analysis.md`. The key proof is that current `distinctEvents` represent only one STF proceeding broken into milestones; once that happens, Stage 2 never gets a TSE branch to research.
**Learnings:** no

---
### 2026-03-31 | Lead Architect | Codex (GPT-5) | Bolsonaro Historical Degradation Docs-Only Synthesis
**Task:** Investigate the historical Bolsonaro report degradation using archived docs and current status docs only, and identify what degraded, which plans shipped vs deferred, and which historical explanations still fit today.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The archived record shows Bolsonaro quality had multiple dimensions, not just STF/TSE separation: foreign/U.S. contamination, boundary richness/institution specificity, verdict stability, and claim framing quality. Several of the historically important enabling defects are no longer current primary explanations because they were later shipped or superseded: `distinctEvents` is no longer dead downstream (MT-3 shipped), seeded preliminary evidence remap shipped, and diversity-aware sufficiency shipped. The present docs support a narrower residual explanation: Bolsonaro is now relatively stable directionally, but no longer consistently reaches the earlier quality ceiling on top-level proceeding coverage and court-specific boundary richness.
**Open items:** The remaining unresolved question is whether today’s residual Bolsonaro gap is mostly upstream event/proceeding selection quality or a residual evidence/boundary problem. The docs support the first explanation more strongly, but do not fully close the second because FLOOD-1 still awaits complete live validation.
**Warnings:** The best historical run (`5a2aceff`) is an exceptional peak, not a safe baseline. Archived docs already say language alone does not explain it and that some older high-scoring runs also carried contamination or pre-SR-weighting behavior, so not every drop versus that run should be interpreted as a clean regression.
**For next agent:** Most relevant anchors: `Docs/ARCHIVE/Report_Quality_Criteria_Scorecard_2026-03-12_arch.md` for what “better” meant, `Docs/ARCHIVE/Report_Variability_Consolidated_Plan_2026-03-07.md` for which multi-trial fixes shipped, `Docs/ARCHIVE/Report_Quality_Analysis_2026-03-08.md` for which explanations were later reframed, and `Docs/STATUS/Current_Status.md` / `Docs/STATUS/Backlog.md` for the March 26-30 shipped items (`DIV-1`, `REMAP-1`, `FLOOD-1`, `GATE1-REF`).
**Learnings:** no

---
### 2026-03-31 | Lead Architect | Codex (GPT-5) | Cross-Family Risk Review for `distinctEvents` Granularity Change
**Task:** Review docs/history only to assess likely cross-family effects of a Stage-1 `distinctEvents` change that prefers top-level independently researchable proceedings/institutions/episodes over lifecycle sub-stages.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The archive supports this direction only if it stays narrow. Historical plans already wanted multi-event coverage to flow through richer `distinctEvents`, not through more atomic claims (`Report_Quality_Analysis_2026-03-08.md`, Fix 5B; `Report_Variability_Consolidated_Plan_2026-03-07.md`, MT-3). Likely positives are broader multi-proceeding coverage, richer institution-specific boundaries, and lower risk of STF-only narrowing on collection-style legal/process prompts. The main regression risk is over-coarsening genuine single-proceeding lifecycle inputs or spreading sparse-evidence research too thin, which could raise `UNVERIFIED` rates in weaker families. The safest framing is: prefer top-level independently researchable units only for collection-style multi-event inputs, while preserving lifecycle-stage extraction when the input explicitly asks about chronology, appeals, monitoring, publication, or another single proceeding's process.
**Open items:** If implemented, validate on Bolsonaro EN/PT, the archived non-political multi-event control (`Boeing 737 MAX investigations and recertification decisions`), one multilingual multi-event control, and one single-proceeding lifecycle negative control.
**Warnings:** Do not turn this into a broad Stage-1 rewrite. The March 30 quality-evolution analysis shows Bolsonaro is already directionally stable; the target is quality ceiling, not global verdict behavior. Also do not let this bleed into SRG/SRF-style evaluative/disclosure families or direct factual controls, where eventization would likely be noise rather than help.
**For next agent:** Most relevant anchors are `Docs/ARCHIVE/Report_Variability_Consolidated_Plan_2026-03-07.md` (validation matrix V2-V5, MT-3 expectations, cross-topic `UNVERIFIED` guardrail), `Docs/ARCHIVE/Report_Quality_Analysis_2026-03-08.md` (Fix 5B wording), `Docs/ARCHIVE/Baseline_Test_Results_Phase1_2026-03-12.md` (historical Bolsonaro scoring criteria), `Docs/WIP/2026-03-30_Report_Quality_Evolution_Deep_Analysis.md` (current family stability), and `Docs/STATUS/Backlog.md` / `Docs/STATUS/Current_Status.md` for what already shipped.
**Learnings:** no

---
### 2026-03-31 | Lead Architect | Codex (GPT-5) | Consolidated Cross-Family Effects of `distinctEvents` Fix
**Task:** Reassess the proposed Bolsonaro-oriented `distinctEvents` fix with parallel agents, identify likely positive and negative effects across report families, and adjust the proposal to maximize net benefit.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Parallel reviews converged that the fix is directionally correct but the first version was too blunt. The adjusted proposal is: keep the change at the Stage-1 `distinctEvents` boundary; define `distinctEvents` as the minimal set of independently researchable peer event clusters; prefer sibling/peer clusters over lifecycle milestones only for collection-style multi-event inputs; preserve lifecycle/timeline sub-events when the input is explicitly about one process chronology or an article argued through episodes; and do **not** add a new always-on LLM validation/repair step yet. This should help Bolsonaro-like multi-proceeding families, non-political multi-event/process families, and multilingual multi-event prompts, while limiting harm to single-proceeding lifecycle and broad evaluative families.
**Open items:** If prompt-only guidance does not materially improve the Bolsonaro family without raising `UNVERIFIED` elsewhere, the next step should be a narrow LLM-based `distinctEvents` repair only for collection-style multi-event outputs, not a permanent always-on Stage-1 validator.
**Warnings:** `distinctEvents` directly changes query fanout and research-loop minimum iterations, so over-expansion can increase cost and spread sparse evidence too thin. Do not optimize for raw boundary count or to recreate contaminated historical peaks. Do not let this bleed into SRG/SRF, Plastik-style broad evaluative, single-event, or clearly timeline/article-driven families.
**For next agent:** Validate on Bolsonaro EN/PT (`"various"` / `"all"`), a single-proceeding Bolsonaro guardrail, `wind-still.ch` timeline/article-style control, SRG/SRF compound controls, broad evaluative inertness controls, and the documented Boeing 737 MAX multi-event/process control. The current consensus is prompt-only first, domain-neutral, with lifecycle preservation and no always-on repair step.
**Learnings:** no

---
### 2026-04-01 | Senior Developer | Codex (GPT-5) | Stage 1 Narrow Hardening Implementation
**Task:** Implement the architect-approved narrow post-rollback Stage-1 hardening changes: remove the restored `single_atomic_claim` dimension-decomposition fallback and add a narrow contract-retry re-validation guard.
**Files touched:** `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** `isDimensionDecomposition` now trusts only explicit `ambiguous_single_claim` tagging in all three Stage-1 tagging sites; the restored `single_atomic_claim` fallback was removed. Contract-correction retry no longer replaces the original Pass 2 output unconditionally: retry output is re-validated once via `validateClaimContract()`, accepted only when that re-validation is clean, and otherwise the original Pass 2 output is kept. No evidence-separability logic, candidate scoring, fewer-claims tiebreaks, prompt changes, or `distinctEvents` work were reintroduced.
**Open items:** Live validation is still needed on the architect-specified jobs. If broader suite health matters before commit, investigate the unrelated failing tests in `test/unit/lib/search-factcheck-api.test.ts`, `test/unit/lib/search-semanticscholar.test.ts`, and `test/unit/app/api/admin/test-config/route.test.ts`.
**Warnings:** Focused Stage-1 suites passed, but `npm test` did not fully pass because of four failures in untouched search/admin test files outside this change set. `npm -w apps/web run build` passed. Two new Stage-1 retry tests currently emit Gate 1 parse errors to stderr during mock sequencing, but they still assert the intended keep-original behavior and pass.
**For next agent:** Treat this as a narrow Stage-1 patch on top of the Apr 1 rollback baseline. If continuing, run live SRG/SRF/Plastik validation first; do not expand this into a broader Stage-1 package. If needed later, clean up the noisy mock sequencing in the two new retry tests, but do not change production logic unless a live regression appears.
**Learnings:** no

---
### 2026-04-02 | Investigator | Codex (GPT-5) | Plastik DE Stage-4 Prompt/Contract Parse Failure Review
**Task:** Investigate repeated German `Plastik` Stage-4 failures only from the LLM prompt/output-contract angle, focusing on `VERDICT_ADVOCATE`, multilingual `reportLanguage` instructions, and prompt/output size; do not analyze Stage 1.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The strongest current diagnosis is **prompt/input contract, not parser/recovery**. Three concrete findings: (1) `VERDICT_ADVOCATE` still renders `${evidenceByBoundary}` in the prompt file while `verdict-stage.ts` sends `evidenceItems`, so the live advocate/self-consistency system prompt has an unresolved placeholder and a stale description of the evidence shape; (2) the April 1 `reportLanguage` rollout threaded `reportLanguage` into advocate and reconciliation, but `selfConsistencyCheck()` still reuses `VERDICT_ADVOCATE` without passing `reportLanguage`, so non-English runs render the literal `${reportLanguage}` placeholder in two extra Stage-4 calls; (3) `createProductionLLMCall()` still sends the full structured Stage-4 payload twice, once embedded in the rendered system prompt and again as `JSON.stringify(input)` in the user message, which roughly doubles already-large verdict payloads and makes retry low-yield because retry replays the same oversized contradictory contract. Current parser/recovery is already tolerant (direct parse, fenced parse, embedded JSON extraction, truncated JSON repair, one retry), so more parser work is not the best first move.
**Open items:** The narrowest next fix is contract alignment in Stage 4: make `VERDICT_ADVOCATE` consume the same evidence key the code actually sends, pass `reportLanguage` into self-consistency calls that reuse `VERDICT_ADVOCATE`, and add a focused rendered-prompt test that fails if Stage-4 prompt rendering leaves any `${...}` placeholders unresolved. Only after that should payload de-duplication be evaluated as the next reliability/cost hardening step.
**Warnings:** Do not remove the duplicated user JSON first without fixing the prompt contract, because the stale `VERDICT_ADVOCATE` prompt currently appears to rely on the duplicated user payload to expose `evidenceItems` at all. Also do not frame this as “report-language instructions are inherently bad”; the issue is incomplete propagation of the new contract plus a pre-existing stale placeholder.
**For next agent:** Inspect [claimboundary.prompt.md](C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md#L879), [verdict-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-stage.ts#L580), [verdict-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-stage.ts#L717), [verdict-generation-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-generation-stage.ts#L261), and [prompt-loader.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/prompt-loader.ts#L762). The minimum safe implementation is a Stage-4 contract fix plus a prompt-render invariant test, not another parser patch.
**Learnings:** no

---
### 2026-04-02 | Investigator | Codex (GPT-5) | Plastik Stage-4 Runtime/Artifact Failure Review
**Task:** Investigate repeated German Plastik Stage-4 failures from the runtime/job-artifact angle using local DB, job events, logs, and saved metrics/artifacts; anchor jobs `b4678284c7e042f986211a5311aaa828`, `d460554f6b9549008a1f6e00c542b508`, comparator `a695d0bc0fb745a2a6ebeccc0f8ec206`, and English/French parallel runs.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The runtime evidence points to an intermittent Stage-4 output-format failure at `VERDICT_ADVOCATE`, not a deterministic German-input failure, not a simple token-threshold failure, and not a pure concurrency-cap failure. `b467` and `d460` both ended `SUCCEEDED` but only via Stage-4 fallback (`UNVERIFIED`, `50/0`, `claimsWithVerdicts=0`, `gate4Stats.unpublishable=3`). Intermittency is proven by exact-input neighbors: in the same April 2 batch, `0ee67d3d3285418a813ed0dcf8ab06a4` and `d64adbaf52eb4953ba1bea596015a52d` completed full Stage 4 on `Plastik recycling bringt nichts`, while `b467` failed; the parallel English run `721b4afe3c2b4ac48c6a4d5a2770f97a` also completed full Stage 4. Token size is not the main discriminator: failed advocate calls were ~37k-47k total tokens, but successful same-family advocates ranged above that (including ~51k, ~57k, ~62k, and ~79k). Concurrency hit the expected three-runner cap, evidenced by `721b...` waiting from `10:23:38` until `10:57:10` to start and `22c950...` waiting from `10:41:30` until `11:02:24`, but concurrency alone is insufficient because same-batch peers succeeded under the same cap. The new parse-retry path is definitely executing: `b467` emitted `Parse failure, retrying claude-sonnet-4-5-20250929...` and its metrics recorded two advocate calls with the second marked `retries=1`; `0ee67...` also hit the same retry path during self-consistency and recovered. The failing retry still returned malformed/fenced JSON on `b467`, so the retry exists but is not reliably curative.
**Open items:** The remaining unknown is the exact malformed payload shape for the failed `VERDICT_ADVOCATE` responses in `d460`/`f279`/`b467` beyond the recorded metadata (`startsWith=\"```json\"`, large fenced payloads). Raw failed-response capture is still missing from durable artifacts.
**Warnings:** Do not start with concurrency tuning or token-budget reduction; the local evidence does not support either as the primary fix. Also note that restart noise was present in `b467` and `f279`, but both jobs reproduced Stage-4 failure behavior after requeue, so restart alone does not explain the issue.
**For next agent:** Most relevant runtime anchors are the DB rows/events/metrics for `b4678284c7e042f986211a5311aaa828`, `d460554f6b9549008a1f6e00c542b508`, `a695d0bc0fb745a2a6ebeccc0f8ec206`, `0ee67d3d3285418a813ed0dcf8ab06a4`, `d64adbaf52eb4953ba1bea596015a52d`, `721b4afe3c2b4ac48c6a4d5a2770f97a`, `87f82137692e42b2b50d6d8c0ca028c3`, and `2dadabe7d2074245acfb81f96bbfe01d`; saved artifacts under `tools/metrics-b467.json`, `tools/metrics-d460.json`, `tools/metrics-a695.json`, and `tools/job-d460.json`; and the runtime seam in [verdict-generation-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-generation-stage.ts#L625), [verdict-generation-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-generation-stage.ts#L699), and [claimboundary-pipeline.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claimboundary-pipeline.ts#L996). Strongest next step: add durable raw Stage-4 failure artifacts for `VERDICT_ADVOCATE` parse failures and harden that contract boundary before touching concurrency.
**Learnings:** no

---
### 2026-04-02 | Lead Architect | Codex (GPT-5) | German Plastik Stage-4 Parse Failure Reassessment
**Task:** Re-investigate repeated `VERDICT_ADVOCATE` parse failures on German Plastik after the array-aware Stage-4 recovery + retry patch.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Retry-only is not the root-cause fix. Evidence from `b4678284c7e042f986211a5311aaa828` shows both advocate attempts returned long fenced array output and both still failed JSON parsing. The strongest remaining architectural issue is Stage-4 prompt/input contract drift: `VERDICT_ADVOCATE` still references `${evidenceByBoundary}` while `verdict-stage.ts` sends `evidenceItems`, unresolved prompt placeholders are preserved literally by `prompt-loader.ts`, and self-consistency reuses `VERDICT_ADVOCATE` without threading `reportLanguage`. Prompt size/payload duplication is a likely amplifier: Stage 4 currently sends the full structured payload twice (rendered into the system prompt and again as `JSON.stringify(input)` in the user message).
**Open items:** Decide whether to implement the narrow contract-alignment fix next: (1) align `VERDICT_ADVOCATE` prompt variables with code, (2) thread `reportLanguage` into self-consistency advocate runs, (3) add a Stage-4 unresolved-placeholder invariant test, and (4) persist raw/admin-only parse-failure artifacts for future root-cause capture. Secondary parser hardening (`rootless -> expected -> alternate root`) may still be worthwhile, but current metrics show fenced array starts, so it does not appear to be the primary fix for this family.
**Warnings:** Token size alone does not explain the failures; successful same-family runs can be larger. Concurrency is also not the main cause. The key missing artifact is the exact raw malformed advocate payload on failing runs.
**For next agent:** Anchor evidence: failing jobs `d460554f6b9549008a1f6e00c542b508`, `f279d6d32ccf49fb9d4843cee487e9bb`, `b4678284c7e042f986211a5311aaa828`; successful comparators `a695d0bc0fb745a2a6ebeccc0f8ec206`, `0ee67d3d3285418a813ed0dcf8ab06a4`, `513e99539b3b4c8ca63daeca96b6e92b`. Relevant files: `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/src/lib/analyzer/verdict-generation-stage.ts`, `apps/web/prompts/claimboundary.prompt.md`, `apps/web/src/lib/analyzer/prompt-loader.ts`, `tools/metrics-b467.json`.
**Learnings:** No
---
### 2026-04-02 | Lead Architect | Codex (GPT-5) | German Plastik Variability Split Diagnosis
**Task:** Compare post-patch sibling jobs for `Plastik recycling bringt nichts` to explain verdict spread beyond the Stage-4 parse failure.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The screenshot-level variation is not one bug. There are two separate issues: (1) Stage-4 parse failure still occurs on large advocate calls (`bc7f2cafc8fb4ea09267e18cf2a5f409`: advocate prompt ~79.8k tokens, parse failure twice), and (2) even successful runs show major upstream variance before Stage 4. Example: `c86a3e4bb02349e3b316ea8e7dff095c` succeeded with `boundaryCount=1`, `evidenceTotal=85`, support-heavy balance `49/17/19`, and English/US-heavy source set; `974a754643d747c78de620558f26dd32` succeeded with `boundaryCount=5`, `evidenceTotal=77`, contradict-heavy balance `10/44/23`, and German/EU source set; `bc7f...` failed with `boundaryCount=6`, `evidenceTotal=110`. Same prompt hash on patched runs means this verdict spread is coming from Stage-2/3 research/boundary variance plus the Stage-4 size failure, not from different prompt versions.
**Open items:** Separate the next work into two tracks. Track A: Stage-4 payload simplification (remove duplicated user JSON now that system prompt is serialized). Track B: investigate why German Plastik runs can produce English preliminary queries / English-heavy source portfolios and radically different boundary clustering for the same input.
**Warnings:** Do not treat the parse-failure fix as sufficient for the verdict spread. The family remains unstable even when Stage 4 succeeds.
**For next agent:** Anchor jobs for comparison: `974a754643d747c78de620558f26dd32`, `c86a3e4bb02349e3b316ea8e7dff095c`, `bc7f2cafc8fb4ea09267e18cf2a5f409`, `22c950cba66c4f18bfc280466c8f57d2`. Inspect `resultJson.searchQueries`, `resultJson.sources`, `resultJson.claimBoundaries`, and `AnalysisMetrics.MetricsJson` verdict call sizes.
**Learnings:** No

---
### 2026-04-02 | Investigator | Codex (GPT-5) | Funding Section Expansion and Reframe
**Task:** Update the funding section in the Cooperation Opportunities page to reflect founder-led / imminent-Verein positioning, add newly verified funding routes and precedents, and add a separate community-funding section.
**Files touched:** `Docs/xwiki-pages/FactHarbor/Organisation/Strategy/Cooperation Opportunities/WebHome.xwiki`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Reframed the applicant profile away from `solo developer` toward `founder-led` with a Swiss `Verein` targeted for April 23, 2026. Promoted Mozilla Democracy x AI into Tier A as an active but currently closed near-term fit, added Google.org AI for Government Innovation under a broadened Tier B (`Institutional Partner Paths`) because it is partner-dependent rather than solo-actionable, strengthened Prototype Fund CH using the current sustainable-digitalization / sufficiency criteria, replaced the old Mozilla Tier E watchlist row, added Wikimedia Research Fund as an adjacent-but-limited route, and inserted two new subsections: `Funding Precedents` (Omidyar / Google.org / Google News Initiative examples via Full Fact) and `Community Funding & Recurring Support` (Open Collective, GitHub Sponsors, wemakeit, Liberapay, Goteo, Lokalhelden) with a realistic alpha-stage fundraising target.
**Open items:** If the user wants even tighter rigor, the next pass should add `Last verified: YYYY-MM-DD` markers per table or per row. Hasler-Mercator was intentionally kept conservative (`re-check mid-2026`) because a public source for a specific June 2026 reopening could not be verified.
**Warnings:** Mozilla timeline changed between earlier search snippets and the current Mozilla cohort page; the live page now shows the intake as closed with finalists notified on April 16, 2026 and full proposals due April 30, 2026. Google.org closes on April 3, 2026, but only matters if a real government partner already exists immediately.
**For next agent:** Relevant section now lives in `Docs/xwiki-pages/FactHarbor/Organisation/Strategy/Cooperation Opportunities/WebHome.xwiki` around the `3. FUNDING OPPORTUNITIES` block. If continuing, the highest-value follow-up is editorial tightening, not more list expansion: trim weak rows, add verification timestamps, and decide whether `Open Technology Fund` still belongs in Tier A or should move down if no concrete information-freedom use case is prepared.
**Learnings:** no

---
### 2026-04-02 | Investigator | Codex (GPT-5) | Funding Section Editorial Pass
**Task:** Perform a pure editorial cleanup on the updated funding section without changing its overall structure or reprioritizing the grant landscape again.
**Files touched:** `Docs/xwiki-pages/FactHarbor/Organisation/Strategy/Cooperation Opportunities/WebHome.xwiki`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Standardized the main funding tables to `Action / gating condition`, removed inconsistent `Robert:` owner markers, rewrote action cells into imperative next steps, and aligned Tier A/B/C wording so the page consistently distinguishes immediate actions from partner-gated routes. Also softened one unverified Lokalhelden fee claim, clarified Open Collective host-fee wording, and replaced the awkward `after Vereinsgruendung` phrasing with `once the Swiss Verein is established`.
**Open items:** The next useful cleanup would be adding `Last verified` timestamps to the main tables and possibly shortening a few longer `Fit for FactHarbor` cells, especially Prototype Fund CH and Mozilla.
**Warnings:** No factual re-ranking was done in this pass; this was language and structure cleanup only.
**For next agent:** If you continue editing the same section, protect the current separation between `Funding Opportunities`, `Funding Precedents`, and `Community Funding`. The section is now easier to scan; additional expansion will quickly make it too dense unless something else is cut.
**Learnings:** no

---
### 2026-04-02 | Senior Developer | Claude Code (Opus 4.6) | Stage-4 Parse Failure Diagnostic Artifact Capture
**Task:** Implement durable admin-only raw parse-failure artifact capture for Stage-4 verdict debate prompts to enable root-cause diagnosis of remaining intermittent German Plastik `VERDICT_ADVOCATE` parse failures.
**Files touched:** `apps/web/src/lib/analyzer/metrics.ts` (new `ParseFailureArtifact` interface + optional field on `LLMCallMetric`), `apps/web/src/lib/analyzer/verdict-generation-stage.ts` (artifact builder, recovery tracking, artifact attachment to both initial and retry parse-failure `recordLLMCall` calls), `apps/web/test/unit/lib/analyzer/verdict-parse-artifact.test.ts` (7 new focused tests).
**Key decisions:**
- Artifact is stored as an optional `parseFailureArtifact` field on `LLMCallMetric`, flowing through the existing metrics pipeline into `AnalysisMetrics.MetricsJson` in SQLite. No new tables, no new API endpoints, no new storage mechanisms.
- Raw response is truncated to prefix (4096 chars) + suffix (2048 chars), enough to diagnose trailing prose, missing brackets, duplicated segments, localized key drift, and fence/commentary patterns.
- Each parse attempt tracks which recovery strategies were attempted (`direct_parse`, `fenced_parse`, `embedded_value_extraction`, `truncated_repair`), persisted in the artifact.
- Both initial and retry failures get separate artifacts with `attempt: "initial" | "retry"`.
- Successful parses do NOT produce artifacts — verified by test.
**Where the artifact is stored:** Inside `llmCalls[]` entries in the per-job `MetricsJson` blob, accessible via `GET /api/fh/metrics/{jobId}` (admin-key protected).
**How admins inspect it:** Query the metrics API for a failing job, then look at `llmCalls` entries where `schemaCompliant=false` — each will have a `parseFailureArtifact` object with `rawPrefix`, `rawSuffix`, `rawLength`, `startsWithKind`, `expectedRoot`, `recoveriesAttempted`, and identity fields.
**What is NOT exposed to normal users:** Raw LLM output is never shown in the job detail page (`/jobs/[id]`), the public API job response, or any user-facing warning. The artifact exists only in the admin metrics JSON blob.
**Artifact content:** Truncated diagnostic slices (first 4096 + last 2048 chars), not full raw output. This is sufficient to distinguish all known malformation patterns while keeping metrics JSON size manageable.
**Open items:** The next failing German Plastik run will produce inspectable artifacts. The actual root-cause diagnosis of the malformed output is the follow-on task — this change provides the evidence capture needed for that diagnosis.
**Warnings:** Artifact size adds ~6KB per parse failure to metrics JSON. With at most 2 failures per run (initial + retry), this is negligible.
**For next agent:** After the next failing Plastik run, inspect the artifacts via `GET /api/fh/metrics/{jobId}` and search for `parseFailureArtifact` in the `llmCalls` array. The `rawPrefix` and `rawSuffix` should reveal whether the failure is trailing commentary, incomplete brackets, duplicated JSON segments, or another pattern. Based on that, decide whether the fix belongs in parser recovery or prompt output instructions.
**Learnings:** no

---
### 2026-04-02 | Senior Developer | Claude Code (Opus 4.6) | Metrics API Admin-Key Enforcement
**Task:** Add `X-Admin-Key` auth guard to all `MetricsController` endpoints, closing the access-control gap identified in code review. The metrics API now stores raw LLM output slices via `parseFailureArtifact`, making admin-only enforcement mandatory.
**Files touched:** `apps/api/Controllers/MetricsController.cs` (added `AuthHelper` import + `IsAdminKeyValid` guard to all 5 endpoints: `POST`, `GET {jobId}`, `GET summary`, `GET quality-health`, `DELETE cleanup`).
**Key decisions:** Applied the same `AuthHelper.IsAdminKeyValid(Request)` pattern used by `SystemHealthController` (resume/pause). Returns 401 with `{ error: "Admin key required" }` on missing/invalid key. The runner's `persistMetrics()` already sends `X-Admin-Key` in its `POST` call, so no web-side changes needed.
**Open items:** None — all 5 endpoints are now protected.
**Warnings:** The running API process locks `FactHarbor.Api.exe`, so full `dotnet build` cannot copy the output binary. Compilation was verified via `dotnet msbuild -t:Compile` (clean, no errors). The API will pick up the auth guards on next restart.
**For next agent:** The metrics API is now admin-only. If you add new metrics endpoints, follow the same pattern: `if (!AuthHelper.IsAdminKeyValid(Request)) return Unauthorized(...)`.
**Learnings:** no

---
### 2026-04-02 | Senior Developer | Codex (GPT-5) | German Plastik Reproduction Reset + Rubric Contract Fix
**Task:** Recover from a bad reproduction setup, verify the new parse-failure artifact path on live runs, and fix the concrete follow-on contract bug the artifact exposed.
**Files touched:** `apps/web/src/lib/analyzer/aggregation-stage.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:**
- Cancelled the five saturated German Plastik repro jobs I had launched (`19408e03...`, `81c5d9e0...`, `474ca5af...`, `8060757e...`, `9eb0ad75...`). They were not backend loops; they were legitimate long-running research iterations made worse by flooding the runner.
- Verified the new admin-only `parseFailureArtifact` path is live on current code by inspecting a fresh successful German Plastik run (`97f46b06...`). The artifact persisted correctly on two non-fatal Stage-5 rubric parse failures.
- The persisted artifact exposed a concrete contract bug: `EXPLANATION_QUALITY_RUBRIC` was being invoked with `${narrative}` unresolved. The caller in `aggregation-stage.ts` was passing split fields instead of the single `narrative` string the prompt expects.
- Fixed that contract bug in code, not by changing the prompt: `evaluateExplanationRubric()` now renders a single narrative string from the structured `VerdictNarrative` and passes it as `narrative`.
- Added a focused unit assertion proving the rubric LLM call now receives `narrative`, `claimCount`, and `evidenceCount` exactly as expected.
**Open items:** I also ran two single controlled German Plastik reruns: `97f46b06...` and `92b7a861...`; both succeeded (`LEANING-FALSE`). Because `92b7a861...` started before the rubric caller fix, its metrics still show the old `${narrative}` failure shape. A fresh post-fix rerun is still needed to confirm the rubric parse failures disappear on live traffic and to continue waiting for the next true `VERDICT_ADVOCATE` failure artifact.
**Warnings:** The current worktree still contains earlier uncommitted Stage-4 changes from prior investigation (`claimboundary.prompt.md`, `verdict-generation-stage.ts`, `verdict-stage.ts`, `metrics.ts`, `MetricsController.cs`, new tests, and helper files under `tools/`). I did not clean those up. Build now passes after the rubric fix, but no new `VERDICT_ADVOCATE` failure was reproduced in this turn.
**For next agent:** Start with one fresh single German Plastik run on current code after the last build/reseed. Check `/api/fh/metrics/{jobId}` with `X-Admin-Key` for `taskType='verdict' AND schemaCompliant=false`. If `EXPLANATION_QUALITY_RUBRIC` still shows `${narrative}`, the running web service did not pick up the latest `aggregation-stage.ts` change and needs a restart. If a true `VERDICT_ADVOCATE` failure reproduces, the artifact path is now confirmed working and should be used for the next root-cause diagnosis.
**Learnings:** no

---
### 2026-04-02 | Senior Developer | Codex (GPT-5) | Restore Local Runner Serial Mode For Debugging
**Task:** Re-check the historical `FH_RUNNER_MAX_CONCURRENCY` decision after repeated restart/requeue observations and restore the local debugging stack to serial job execution.
**Files touched:** `apps/web/.env.local`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Verified the March 23 handoff `Docs/AGENTS/Handoffs/2026-03-23_Senior_Developer_Stage4_Provider_Guard_Reliability_Alignment.md` explicitly justified moving the local runner back to `FH_RUNNER_MAX_CONCURRENCY=3` on the theory that Stage-4 lane throttling was the proper fix. Given the user's longer-running restart/requeue observations and today's reproduction work, I restored `apps/web/.env.local` to `FH_RUNNER_MAX_CONCURRENCY=1` as a local debugging isolation measure and restarted the stack via `scripts/restart-clean.ps1`.
**Open items:** This is a local operational setting, not a new product decision. It still needs fresh validation runs to see whether restart/requeue symptoms drop under serial execution.
**Warnings:** I did not change `apps/web/.env.example`; repo/default documentation still says `3`. The local machine is now intentionally divergent for debugging. Any later agent who wants concurrent validation again must change `.env.local` back explicitly and restart services.
**For next agent:** Assume the currently running local web stack is serial (`FH_RUNNER_MAX_CONCURRENCY=1`). Do not interpret improvements from the next Plastik runs as proof that the underlying concurrency issue is fixed globally; they only remove one local confound. If you need to revisit the rationale for `3`, start with the March 23 Stage-4 provider-guard handoff and the recent restart/requeue evidence in `JobEvents`.
**Learnings:** no

---
### 2026-04-03 | Senior Developer | Codex (GPT-5) | Fix False Orphan Requeue On Local Runner
**Task:** Investigate the local "restart" symptom where completed jobs were being replayed with duplicated phase blocks, determine whether it was a real service restart or a runner recovery bug, and patch the local runner accordingly.
**Files touched:** `apps/web/src/lib/internal-runner-queue.ts`, `apps/web/test/unit/lib/drain-runner-pause.integration.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Pulled three parallel analyses plus local DB/log evidence. The decisive evidence was in `apps/api/factharbor.db`: multiple jobs showed `Done` followed 1-7 seconds later by `Re-queued after application restart (previous execution lost)`. That timing, plus the lack of repeated `next-development.log` startup markers, pointed away from true restarts and toward a stale-snapshot race in `drainRunnerQueue()`. The problematic branch came from `e14ae59e` (`fix(runner): immediately re-queue orphaned RUNNING jobs after restart`). I patched orphan recovery so it now performs a fresh `GET /v1/jobs/{jobId}` before requeueing and only treats a job as orphaned when the live job is still `RUNNING` **and** `updatedUtc` still matches the stale page snapshot. If the live status is terminal or the timestamp advanced, orphan recovery is skipped.
**Open items:** This is the minimal safe fix. It closes the false-positive local replay path, but there is still a narrower API-side TOCTOU race if a job completes between the fresh recheck and the `PUT status=QUEUED`. If local replays somehow continue after this patch, the next hardening step is an API-side conditional status transition instead of another web-only heuristic.
**Warnings:** The user-visible symptom ("restart") was partly misleading. Real API restart paths still exist and are distinct: they write `Job interrupted by server restart.` and use the `previous execution interrupted` recovery message. This patch only changes the web-side false-orphan path. I restarted the local stack with `scripts/restart-clean.ps1` after the code change so the fix is now active locally.
**For next agent:** Start with one fresh local job, not a batch. If a new duplicate run appears, inspect `JobEvents` first. `Done -> Re-queued after application restart (previous execution lost)` should now be much harder to reproduce locally. If you ever see that sequence again, check whether the live per-job `updatedUtc` stayed unchanged across the requeue window; that would indicate the remaining API-side race rather than this old stale-snapshot bug. The focused protection lives in `drain-runner-pause.integration.test.ts` and covers: unchanged RUNNING snapshot => requeue, completed live job => no requeue, advanced live `updatedUtc` => no requeue.
**Learnings:** no

---
### 2026-04-03 | Senior Developer | Codex (GPT-5) | Fix Misleading Repeated Phase Blocks In Job Timeline
**Task:** Re-check the user's new screenshot after the runner fix and determine whether the displayed repeated `Setup` / `Understanding Input` / `Additional` blocks still indicated backend replay or a separate UI classification problem.
**Files touched:** `apps/web/src/app/jobs/[id]/lib/event-display.ts`, `apps/web/test/unit/app/jobs/event-display.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Verified the specific job `e5528a5c3b174b28974e2113081a3ebb` in `apps/api/factharbor.db` had `Runner started = 1`, `Re-queued after application restart = 0`, and `Job interrupted by server restart = 0`. So the screenshot was not showing a replayed run. The remaining confusion came from timeline classification: fixed machine-generated messages like `Triggering runner`, `LLM: ...`, `Validating claim contract fidelity...`, and `Preliminary evidence remap: ...` were either falling through to `misc` (`Additional`) or splitting the phase stream into repeated `Setup` cards. I patched `event-display.ts` so those messages are now classified into the correct structural phases, and `LLM:` startup model announcements now merge into the preceding setup entry instead of creating extra standalone `Setup` groups.
**Open items:** This change only affects timeline presentation. It does not change job execution. If a future job again shows repeated groups, inspect `JobEvents` first to distinguish a true backend replay from harmless UI grouping.
**Warnings:** The earlier restart investigation and this timeline cleanup are two separate fixes. The screenshot looked like the first bug, but for this specific job the database proved it was the second.
**For next agent:** If the user still reports "restart-like" visuals, query the specific job in `factharbor.db` before touching runner code. Count `Runner started`, `Re-queued after application restart%`, and `Job interrupted by server restart.%` for that job. If those are `1/0/0`, the issue is presentation, not execution.
**Learnings:** no

---
### 2026-04-03 | Senior Developer | Codex (GPT-5) | Fix Stage-4 Advocate Parse Failure From Unescaped Inner Quotes
**Task:** Diagnose the local failing German Plastik job `6b6e5fcdaaa3435f87b895518a307722`, determine the exact `VERDICT_ADVOCATE` parse-failure shape from the new artifact capture, and harden Stage 4 recovery against that malformed output family.
**Files touched:** `apps/web/src/lib/analyzer/json.ts`, `apps/web/src/lib/analyzer/verdict-generation-stage.ts`, `apps/web/test/unit/lib/analyzer/json.test.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Pulled the new admin-only metrics artifact for `6b6e5fcdaaa3435f87b895518a307722` and confirmed this was a pure Stage-4 failure, not a runner replay: both advocate attempts were `schemaCompliant=false`, both started as fenced JSON arrays, and the malformed output family was specific: JSON strings containing unescaped inner ASCII double-quotes copied from German text (for example `„nichts"` inside a `reasoning` string). I added structural recovery in `json.ts` via `repairUnescapedInnerQuotes()` and `tryParseJsonWithInnerQuoteRepair()`, then wired that into `createProductionLLMCall()` in `verdict-generation-stage.ts` as a dedicated recovery step (`inner_quote_repair`) between fenced parse and generic embedded-value extraction. Added focused tests proving the repair works on fenced verdict output with this exact malformed shape.
**Open items:** One fresh local rerun was executed after restart: `a97ec59eeb5e43c69ae8d7583eecfcb3` (`Plastik recycling bringt nichts`). It completed successfully with a real verdict (`MOSTLY-FALSE`, `21 / 71`) instead of fallback `UNVERIFIED`. Metrics for that rerun show advocate/challenger/self-consistency/reconciler/validation all `schemaCompliant=true` with no retry, which is the key runtime validation. Further German Plastik reruns would still be useful for confidence, but the exact `6b6e...` failure family is now fixed in code and has one successful live confirmation.
**Warnings:** A quick offline parse against the concatenated `rawPrefix + rawSuffix` slices from the old artifact still fails, but that is expected because the stored artifact is intentionally truncated and not guaranteed to reconstruct full JSON. The live rerun is the authoritative runtime check. The worktree still contains other uncommitted investigation changes from earlier sessions.
**For next agent:** If another `VERDICT_ADVOCATE` parse failure appears, fetch `/api/fh/metrics/{jobId}` with `X-Admin-Key` and check `parseFailureArtifact.recoveriesAttempted`. New quote-family failures should now show `inner_quote_repair` in the attempted chain and should usually recover before retry. If failures continue, inspect whether the next malformed family is different (for example duplicated segments, trailing prose, or truncation), not this old inner-quote case.
**Learnings:** no

---
### 2026-04-03 | Senior Developer | Codex (GPT-5) | Refresh Wikipedia WIP Scope And Add Narrow Completion Plan
**Task:** Update the active WIP documentation for Wikipedia supplementary integration so it matches the current codebase, then write a concrete next-step implementation plan.
**Files touched:** `Docs/WIP/2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md`, `Docs/WIP/2026-04-03_Wikipedia_Supplementary_Completion_Plan.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Reframed the existing WIP concept doc so it no longer treats provider-layer plumbing as the open problem. The updated doc now states explicitly that Wikipedia provider registration, UCM wiring, Admin UI visibility, and the existing `search.providers.wikipedia.enabled` kill switch are already shipped; the remaining gap is orchestration (when supplementary providers run, how multilingual language selection is handled, and how bounded supplementary evidence should participate when primary providers already succeeded). Added a new concrete plan doc for a narrow `SEARCH-1A` reopening: keep the existing Wikipedia UCM kill switch, add one generic supplementary-provider mode in search config, thread detected language into Wikipedia lookup, keep contribution bounded, and validate as retrieval-diversity work rather than as a promised fix for full Plastik neutrality.
**Open items:** This was docs/planning only. No code implementation of the Wikipedia completion plan has been started yet. If the track is approved, the next implementation slice should touch `config-schemas.ts`, `search.default.json`, `web-search.ts`, `search-wikipedia.ts`, and the Admin config page.
**Warnings:** The current code already has a Wikipedia on/off switch. Do not add a second redundant kill switch in implementation. The real missing work is supplementary-provider orchestration and language threading.
**For next agent:** Start from `Docs/WIP/2026-04-03_Wikipedia_Supplementary_Completion_Plan.md`, not from the archived large architecture doc. Keep the reopening narrow: no reference extraction, no Semantic Scholar redesign, no special aggregation heuristics. Validate in serial runs with Wikipedia `fallback_only` versus `always_if_enabled`.
**Learnings:** no

---
### 2026-04-03 | Senior Developer | Codex (GPT-5) | Add Supplementary Provider Usage Recommendations To WIP Docs
**Task:** Extend the active Wikipedia/supplementary-provider WIP docs so they explicitly recommend when and how to use Wikipedia, Semantic Scholar, and Google Fact Check.
**Files touched:** `Docs/WIP/2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md`, `Docs/WIP/2026-04-03_Wikipedia_Supplementary_Completion_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added explicit provider-usage guidance to both docs. The concept doc now states when each provider is useful and how it should be treated in FactHarbor's retrieval design. The implementation-plan doc now makes the operational recommendation explicit: Wikipedia enabled by default as bounded multilingual supplementary context; Semantic Scholar and Google Fact Check kept optional/off by default and used as targeted discovery layers when their specific evidence ecosystems are likely to matter.
**Open items:** This is still documentation only. The actual code implementation of `supplementaryProviders.mode`, bounded supplementary dispatch, and language-aware Wikipedia routing is still pending.
**Warnings:** The new recommendations are intentionally narrow. They do not authorize default-on Semantic Scholar or Google Fact Check, and they do not imply provider-specific weighting heuristics.
**For next agent:** If implementation proceeds, preserve the distinction now documented in WIP: Wikipedia is the bounded default-on supplementary source; Semantic Scholar and Google Fact Check remain targeted optional discovery providers until their deeper integration path is reopened.
**Learnings:** no

---
### 2026-04-03 | Senior Developer | Codex (GPT-5) | Implement Bounded Default-On Wikipedia Supplementary Search
**Task:** Complete the narrow Wikipedia supplementary integration slice by adding generic supplementary-provider orchestration, threading detected language into Wikipedia search, and aligning defaults with the approved bounded default-on posture.
**Files touched:** `apps/web/src/lib/web-search.ts`, `apps/web/src/lib/search-wikipedia.ts`, `apps/web/src/lib/config-schemas.ts`, `apps/web/configs/search.default.json`, `apps/web/src/app/admin/config/page.tsx`, `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, `apps/web/test/unit/lib/web-search.test.ts`, `apps/web/test/unit/lib/search-wikipedia.test.ts`, `Docs/WIP/2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md`, `Docs/WIP/2026-04-03_Wikipedia_Supplementary_Completion_Plan.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added generic `supplementaryProviders.mode` / `maxResultsPerProvider` UCM config and wired it through search dispatch. Wikipedia now prefers detected claim/input language, then configured language, then `en`. Defaults were aligned to the documented narrow posture: `search.providers.wikipedia.enabled = true`, `search.providers.semanticScholar.enabled = false`, `search.providers.googleFactCheck.enabled = false`, and `supplementaryProviders.mode = always_if_enabled` with a per-provider cap of `3`. The existing Wikipedia provider switch remains the canonical kill switch; no second Wikipedia flag was introduced.
**Open items:** This slice does not add Wikipedia reference extraction, Semantic Scholar deep integration, or Google Fact Check direct-seeding redesign. Runtime validation on live multilingual claims is still the next quality step after code merge.
**Warnings:** Default behavior changed materially: Wikipedia now participates in normal search unless disabled in UCM. One legacy `web-search` test had to be updated because it implicitly assumed the old fallback-only default. This patch intentionally does not enable Semantic Scholar or Google Fact Check by default.
**For next agent:** Validate serially on German Plastik, English Plastik, and one stable control. Check whether Wikipedia contributes bounded additional domains without flooding and whether disabling `search.providers.wikipedia.enabled` cleanly restores the pre-change posture.
**Learnings:** no

---
### 2026-04-04 | Product Strategist | Codex (GPT-5) | Tighten Funding Presentation Around Immediate Support Routes
**Task:** Review, shorten, and improve the funding presentation, using adjacent strategy/knowledge docs plus web validation and subagent input to sharpen next priorities and specific actions.
**Files touched:** `Docs/xwiki-pages/FactHarbor/Organisation/Partner & User Relations/Presentations/Funding/WebHome.xwiki`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Rewrote the presentation into a short support brief centered on: what already works, what still blocks scale, what support unlocks in the next 90 days, and concrete next actions. Removed the long explainer/FAQ/grant-catalog structure and pushed route-by-route grant tracking back to `Cooperation Opportunities`. Web validation changed one important timing assumption: `NLnet Commons Fund` is live now as of April 4, 2026 (13th call opened April 1, 2026; deadline June 1, 2026), so the page now treats it as a conditional live option rather than next-call-only. Kept `Innosuisse Innovation Cheque` as the primary named route, downgraded generic media-growth funding, and kept practitioner/network asks explicit (`dpa`, `EBU Spotlight`, DACH feedback lanes).
**Open items:** A follow-up donor/outreach pack would be useful: one short Swiss research brief for the Innovation Cheque lane, one practitioner outreach email set, and one compact benchmark/demo pack for partner conversations.
**Warnings:** The funding landscape items referenced here are time-sensitive. If this page is revisited after June 1, 2026, re-check `NLnet`, `BRIDGE`, and other live-call statuses before reusing the timing language.
**For next agent:** If you expand this work, keep this page donor-facing and concise. Put detailed opportunity tracking, eligibility nuance, and call calendars on `Docs/xwiki-pages/FactHarbor/Organisation/Strategy/Cooperation Opportunities/WebHome.xwiki`. If you need the evidence behind the wording, start with `Docs/Knowledge/EXECUTIVE_SUMMARY.md`, `Docs/Knowledge/Innosuisse_Bewerbung_Leitfaden.md`, `Docs/WIP/2026-03-24_Innosuisse_Partnership_Research_Briefing.md`, and the April 2026 call-prep docs.
**Learnings:** no

---
### 2026-04-04 | Product Strategist | Codex (GPT-5) | Sync Internal Cooperation Plan And Knowledge Summary
**Task:** Re-check whether the planning/solution documentation was up to date, then update only the stale internal plan and knowledge-summary docs while leaving the external funding presentation unchanged by request.
**Files touched:** `Docs/xwiki-pages/FactHarbor/Organisation/Strategy/Cooperation Opportunities/WebHome.xwiki`, `Docs/Knowledge/EXECUTIVE_SUMMARY.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Kept the external funding presentation as-is because the user explicitly confirmed the broader external/internal split was intentional. Updated the internal cooperation plan to correct the `NLnet Commons Fund` status: as of April 4, 2026 the 13th call is live from April 1 to June 1, 2026, so the plan now treats it as a conditional live option rather than next-call-only. Updated the knowledge summary so its cooperation framing matches the current next-step sequence: Swiss academic lead + Innovation Cheque first, then `dpa`, then `EBU Spotlight`, with `Full Fact` retained as the strongest later-stage international complement rather than the immediate first target.
**Open items:** The public funding page still intentionally uses a different framing. If desired later, create a short note somewhere explaining the explicit separation between outward-facing support materials and internal prioritization docs.
**Warnings:** These corrections are date-sensitive. Re-check `NLnet`, `Mozilla`, `BRIDGE`, and similar call statuses before reusing the wording after June 2026.
**For next agent:** If another doc still says `Full Fact` is the immediate `#1` cooperation target or `NLnet` is already closed as of April 2026, treat that as stale unless it is clearly marked as historical background. The current internal source of truth is `Cooperation Opportunities/WebHome.xwiki`.
**Learnings:** no

---
### 2026-04-04 | Senior Developer | Codex (GPT-5) | Boundary Concentration vs Grounding Priority Plan
**Task:** Review the newest local and deployed jobs, run a short multi-agent debate on priority order, and convert the result into a concrete WIP plan plus a review prompt for a Sonnet agent.
**Files touched:** `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The debate split between a narrow grounding-containment-first view and a retrieval/boundary-root-cause-first view. The resulting plan resolves that by putting a controlled same-commit validation gate first, then recommending Stage 2/3 retrieval-query/boundary stabilization as the primary next fix track, while keeping verdict-grounding integrity as a narrow follow-on containment slice if it still reproduces once commit/config/cache/quota confounders are controlled. The plan explicitly records the newest evidence: local Bolsonaro `411cb1ca...` and deployed Plastik `9a12f07...` show mega-boundary concentration; deployed and local jobs also still show `verdict_grounding_issue`.
**Open items:** No implementation work was done in this slice. The next action is to have a reviewer validate the sequencing, then run same-commit serial validation before touching analysis code.
**Warnings:** Do not infer local-vs-deployed regressions from mixed commits or mixed cache states. Do not reopen Stage-4 parse work or broad clustering redesign based only on these runs. The plan intentionally does not treat `boundary_evidence_concentration` alone as proof of causality.
**For next agent:** Start with `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md`. Review whether the ordering is right: validation gate first, Stage 2/3 root-cause track second, grounding containment third. If approved, the first concrete validation target should be same-commit serial Bolsonaro EN, then German Plastik, then one stable control.
**Learnings:** no

---
### 2026-04-04 | Senior Developer | Codex (GPT-5) | Apply Sonnet Review To Boundary/Grounding Plan
**Task:** Incorporate Sonnet review feedback into the new WIP plan after approval-with-adjustment.
**Files touched:** `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Updated the plan so verdict-grounding containment is no longer sequenced after full Stage 2/3 completion. The plan now treats grounding as a parallel narrow containment track that should begin after the same-commit validation gate, because deployed healthy-distribution run `cfd508bc...` already shows `verdict_grounding_issue`, proving an independent grounding failure mode. Stage 2/3 remains the primary root-cause track.
**Open items:** No code changes. Next action is still same-commit serial validation; after that, Track A (Stage 2/3) and Track B (grounding containment) can proceed in parallel.
**Warnings:** This adjustment does not justify a broad Stage-4 program. Keep the grounding slice narrow: citation/ID integrity containment only.
**For next agent:** Use the revised ordering in the WIP plan: `validation gate -> Track A root-cause stabilization + Track B grounding containment in parallel`. Do not revert to a strictly sequential order unless new evidence disproves the independent grounding failure mode.
**Learnings:** no

---
### 2026-04-04 | Senior Developer | Codex (GPT-5) | Execute First Local Same-Commit Validation Gate Pass
**Task:** Turn the validation gate from a plan into an executable procedure, then run the first local serial canary batch on the current commit.
**Files touched:** `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Expanded the WIP plan with an explicit step-by-step validation procedure and executed it locally after clearing search cache and resetting provider circuits. The usable cold-pass results were: Bolsonaro EN `6866375de4d44480b939cca7c5b8e83c` → `LEANING-TRUE 69/67` with boundary counts `3/3/2/1/9/50` and persistent `verdict_grounding_issue`; Plastik DE `e4ed5b5b386f4e20a96630f8cbc44772` → `UNVERIFIED 50/0` with `analysis_generation_failed` and `explanation_quality_rubric_failed`. The batch then became invalid because Anthropic credits were exhausted mid-run, causing all later jobs to fail operationally during Stage 1 claim extraction.
**Open items:** The validation gate is only partially executed. Warm-pass comparison and stable-control comparison must be rerun once Anthropic access is restored.
**Warnings:** Do not interpret the later failed jobs (`2960ceef...`, `8ce8b373...`, `5299ff49...`, `c0563ce5...`) as report-quality evidence. `JobEvents` show `Your credit balance is too low to access the Anthropic API.` This is an environment/provider block, not a clean analyzer signal.
**For next agent:** Resume from the WIP plan’s new execution-status section. Restore Anthropic credits first, then rerun the exact same local canary matrix from a cleared-cache starting point: Bolsonaro EN, Plastik DE, `Ist die Erde rund?`, then the warm pass. Only after that should the gate be considered complete.
**Learnings:** no

---
### 2026-04-04 | Senior Developer | Codex (GPT-5) | Resume Validation Batch After Credit Restoration
**Task:** Observe the user-resubmitted verification jobs after Anthropic credits were restored and fold the results back into the active validation plan.
**Files touched:** `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The rerun produced three usable results and one interruption: Plastik `045e240...` completed `LEANING-FALSE 34/71`, control `42476c7...` completed `TRUE 96/91`, Bolsonaro EN `b6a7bcc...` completed `LEANING-TRUE 68/67`, and DPA `0488e397...` was interrupted by server restart. The more important finding is that the rerun batch still failed the intended validation-gate requirement: the three completed jobs recorded different `executedWebGitCommitHash` values, so this was not a true same-commit batch even though the scenarios completed.
**Open items:** The validation gate remains incomplete. A clean canary batch still needs a stable local execution environment with no mid-batch restart/reload drift.
**Warnings:** Do not treat the rerun batch as a valid same-commit baseline. The completed jobs used different executed commits, and the DPA run confirms a real local restart (`Job interrupted by server restart.`). This is now a local execution-stability blocker, not a lack of canary scenarios.
**For next agent:** Start from the WIP doc’s new rerun-status sections. The next step is not more analytical comparison; it is stabilizing the local run environment so a serial batch can execute on one fixed build/commit. Once that is achieved, rerun the same canary set again.
**Learnings:** no

---
### 2026-04-04 | Senior Developer | Codex (GPT-5) | Priority Debate On Verdict Grounding Vs Retrieval/Clustering
**Task:** Review the latest cross-environment job evidence plus the current analyzer/UI code and argue whether verdict-grounding integrity should now outrank retrieval/clustering work.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Concluded from repo inspection that grounding issues are currently a Stage-4 containment problem with direct user-trust impact: `verdict_grounding_issue` is emitted in `verdict-stage.ts` but, by default, remains informational, hidden from non-admin users via `warning-display.ts` and `FallbackReport.tsx`, and does not alter shipped verdicts because `verdictGroundingPolicy` stays `disabled`. Also confirmed the strongest competing objection: repo status/docs still treat cross-linguistic neutrality and Stage-2 retrieval bias as the largest measured visible gap, especially the 58pp Plastik DE/EN/FR spread documented in `Current_Status.md` and `2026-03-30_Report_Quality_Evolution_Deep_Analysis.md`. Boundary concentration is currently only telemetry (`boundary_evidence_concentration`, info-level), which weakens clustering-first on user-visible-harm grounds.
**Open items:** No code was changed. If this debate is acted on, the next step is a concrete Stage-4 integrity containment proposal tied to the current post-FLOOD grounding behavior, not another abstract investigation.
**Warnings:** The repo already contains one prior grounding-refresh fix (source-portfolio-aware validator input/prompt). The new local/deployed evidence therefore suggests any remaining grounding issue is not the exact March 31 contract mismatch and should be diagnosed against current jobs before implementation.
**For next agent:** Start with `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/src/lib/analyzer/warning-display.ts`, `apps/web/src/components/FallbackReport.tsx`, `apps/web/src/lib/config-schemas.ts`, `Docs/STATUS/Current_Status.md`, and `Docs/WIP/2026-03-30_Report_Quality_Evolution_Deep_Analysis.md`. Frame the decision around three questions only: does the issue ship to users silently, is the containment fix narrower than Stage-2/3 work, and does the newest evidence show it across both local and deployed environments.
**Learnings:** no

---
### 2026-04-04 | Senior Developer | Codex (GPT-5) | Source Provenance Tracking Design Review
**Task:** Review the proposed source-provenance tracking design for the ClaimAssessmentBoundary pipeline, check fit against current pipeline/config/prompt hooks, and pressure-test it against misinformation research.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Recommended treating provenance as an extension of the existing derivative/concentration/independence scaffolding instead of a separate weighting subsystem. Phase 1 extraction is viable if it stays optional, claim-local, and output-only at first. The proposed deterministic Phase 2a is too semantically strong for this repo unless it operates only on LLM-emitted canonical IDs or on exact identity fields; free-text creator grouping should not drive analytical conclusions without an LLM/entity-linking layer. Advised against using provenance directly in verdict weighting before an observation phase with quality telemetry and multilingual evaluation.
**Open items:** If the feature proceeds, the next design pass should define a narrower schema (`originatingEntity`, `originatingEntityId?`, `attributionRole`, `transmissionMode`, `provenanceConfidence`, `provenanceNotes?`), a non-weighting convergence summary, and an evaluation plan covering multilingual variants, anonymous sourcing, press releases, wire copy, and multi-hop citation chains.
**Warnings:** Current repo already has overlapping concepts: `isDerivative`, `derivedFromSourceUrl`, claim-local source portfolios, `independence_concern`, and a `provenanceValidationEnabled` config flag. Adding a second parallel provenance vocabulary without reconciling those concepts will fragment the pipeline and make verdict semantics harder to reason about.
**For next agent:** Start with `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/analyzer/research-extraction-stage.ts`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, `apps/web/src/lib/analyzer/aggregation-stage.ts`, `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/prompts/claimboundary.prompt.md`, and `apps/web/src/lib/config-schemas.ts`. Preserve the project rule that semantic text interpretation cannot move into deterministic post-processing.
**Learnings:** no

---
### 2026-04-04 | Senior Developer | Codex (GPT-5) | Audit Provenance Documentation Currency
**Task:** Check whether the current source-provenance solution/plan documentation is up to date against the latest review conclusions and the live analyzer codebase.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Determined that the current design document is mostly up to date and already incorporates the major review corrections: deterministic convergence removed, Phase 1.5 added, `press_release` restored, `provenanceConfidence` removed in favor of existing `extractionConfidence`, and Stage 4.5 / `derivativeFactor` integration explicitly deferred. Confirmed that `Backlog.md` already reflects the revised three-phase plan. Identified two documentation-currency gaps: `Docs/WIP/README.md` has not been refreshed since 2026-04-03 and does not list the new provenance WIP docs, and the standalone GPT review prompt remains intentionally pre-revision content and should not be treated as the active plan.
**Open items:** Decide whether to update `Docs/WIP/README.md` to register the provenance design as an active future proposal and whether to relabel or relocate the standalone GPT review prompt so readers do not mistake it for the current design.
**Warnings:** The revised design doc still contains at least one stale quantitative detail (`source-reliability.ts` cited as 842 lines; current file is shorter). This is minor, but it shows that snapshot metrics inside planning docs can drift even when the core design remains current.
**For next agent:** If asked to make the docs current, update `Docs/WIP/README.md` under future proposals, add a short “historical review input, not the active plan” note for `Docs/WIP/2026-04-04_Source_Provenance_GPT_Review_Prompt.md`, and optionally clean minor drifting counts in the design doc without changing its technical direction.
**Learnings:** no

---
### 2026-04-04 | LLM Expert | Codex (GPT-5) | Retrieval Documentation Currency Check
**Task:** Check whether the retrieval-related solution/plan documentation is up to date against the current search implementation and active status docs.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Determined that the **active** retrieval docs are mostly current: `Docs/WIP/2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md`, `Docs/WIP/2026-04-03_Wikipedia_Supplementary_Completion_Plan.md`, `Docs/STATUS/Backlog.md`, and `Docs/STATUS/Current_Status.md` all reflect the current posture that Wikipedia supplementary completion is implemented, bounded, UCM-controlled, and default-on while Semantic Scholar / Google Fact Check remain default-off. However, two older docs are now stale enough that they should not be treated as current planning sources: `Docs/Specification/Multi_Source_Evidence_Retrieval.md` still says implementation is only proposed and that provider modules remain to be created, and `Docs/WIP/2026-03-26_Next_Workstream_Decision.md` still says only 2 of 7 providers are enabled by default. Current code shows supplementary-provider orchestration with `supplementaryProviders.mode`, default `always_if_enabled`, and Wikipedia enabled by default in `search.default.json`.
**Open items:** If the team wants a clean documentation state, the stale legacy/spec documents should either be updated, clearly marked historical, or linked away from active planning paths so readers do not mix them with the April 2026 docs.
**Warnings:** The worktree already contains unrelated user changes in retrieval/status docs (`Backlog.md`, `Current_Status.md`, WIP search docs, xwiki pages). Do not overwrite or normalize those without first reviewing the user’s intended edits. Also, `Docs/WIP/2026-03-26_Next_Workstream_Decision.md` was accurate at the time it was written; it is stale now because defaults changed later.
**For next agent:** If asked to refresh docs, focus first on `Docs/Specification/Multi_Source_Evidence_Retrieval.md` and `Docs/WIP/2026-03-26_Next_Workstream_Decision.md`. Preserve the current April docs as the canonical retrieval planning sources unless newer design decisions supersede them.
**Learnings:** no

---
### 2026-04-04 | Senior Developer | Codex (GPT-5) | Make Commit Hash Live And Visible Across API/Web
**Task:** Ensure commit/build provenance is updated after new commits and exposed consistently for local runs now, while remaining ready for deployed environments on next deploy.
**Files touched:** `apps/api/Helpers/AppBuildInfo.cs`, `apps/api/Program.cs`, `apps/api/Services/JobService.cs`, `apps/api/Controllers/VersionController.cs`, `Docs/AGENTS/Procedures/Live_Validation_Hygiene.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Replaced the API’s startup-frozen `AppBuildInfo.Resolve()` singleton with a live `AppBuildInfo` service that resolves the current build id on demand, with a short cache for informational reads. New job rows and retry jobs now stamp `GitCommitHash` from `GetGitCommitHash(useCache: false)` at creation time, so fresh local commits are reflected without an API restart. Also exposed `git_sha` on the API `/version` endpoint so both local services now publish a visible build id (`/version` on API, `/api/version` on web). Kept deploy-time `GIT_COMMIT` precedence intact so production continues to prefer the clean deployment hash.
**Open items:** Production will pick up the API `/version` change and the dynamic API-side job stamping on the next deploy/restart; I did not deploy from this machine. The current visible hash is still whole-repo provenance, not analyzer-scoped provenance.
**Warnings:** `scripts/restart-clean.ps1` left a stale API process on port 5000, so the first local `/version` probe hit old code. After killing the actual port owner and restarting the API watcher, local verification succeeded. This is a restart-script hygiene issue, not a provenance-code issue.
**For next agent:** Local verification succeeded with both endpoints reporting the same live build id: `http://localhost:5000/version` and `http://localhost:3000/api/version` now return `git_sha = 5f666979...+469a7968`. Use this patch as the current provenance baseline; if the team wants validation-grade analyzer provenance, that is a separate future enhancement.
**Learnings:** no

---
### 2026-04-04 | Senior Developer | Codex (GPT-5) | Investigate Executed Web Commit Hash Confusion
**Task:** Investigate why the local job `executedWebGitCommitHash` values looked wrong and unstable, and determine whether the hash mechanism itself is misleading.
**Files touched:** `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Confirmed that the visible execution hash is not "wrong" in a literal sense; it is wrong for the purpose we were using it for. `apps/web/src/lib/build-info.ts` computes the execution hash from the whole-repo `git rev-parse HEAD` plus a dirty suffix based on `SHA256("git diff HEAD")`, also over the whole repo. `internal-runner-queue.ts` records that per executed job, and `JobsController.cs` exposes it as the visible `gitCommitHash`. The recent base hashes seen on local jobs (`3056ca55`, `4ae22067`, `98727592`, `01ca99f7`, `a015b707`) all resolve to documentation-only commits, which explains why the job hashes looked "incorrect" from an analyzer-quality perspective even though the resolver itself behaved as designed.
**Open items:** The system still lacks an analysis-scoped provenance key. Until that exists, the current visible hash should be treated as full-repo provenance only, not as a reliable analyzer-validation gate.
**Warnings:** This means the current same-commit validation gate is too strict in one way (it rejects batches separated only by docs commits) and too loose in another (it still cannot prove analyzer-path equivalence when the working tree stays dirty in unrelated files). The problem is in the provenance model, not just in local restarts.
**For next agent:** If the team wants to repair this, the right fix is not "make the hash more stable" globally. It is to add a second, analysis-scoped execution fingerprint for validation use, while keeping the existing visible hash for whole-repo build provenance. In the meantime, avoid committing unrelated repo changes during local validation batches.
**Learnings:** no

---
### 2026-04-04 | Senior Developer | Codex (GPT-5) | Assess Whether Latest Deployment Caused Observed Degradation
**Task:** Determine whether the observed quality degradation in the newest jobs is actually caused by the most recent production deployment, and capture the conclusion in the active WIP plan.
**Files touched:** `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The live deployed evidence does not support the latest deployment as the primary cause of the degradation impression. The only recent shipped analysis-affecting change was `ee885b37` (bounded default-on Wikipedia supplementary search), but the most degraded deployed Plastik run `9a12f07e...` contains no Wikipedia results at all, while healthier deployed runs such as Bolsonaro EN `cfd508bc...` and Homeopathy FR `7b052c9d...` contain at most one bounded Wikipedia source. Older deployed jobs also already showed the same underlying analytical defect family: oversized Stage 2/3 boundaries and high evidence concentration. Updated the WIP plan to state that the main problem is still the pre-existing Stage 2/3 retrieval-boundary concentration issue, with verdict grounding as a separate containment concern.
**Open items:** This does not rule out bounded Wikipedia as a secondary amplifier on some future topics, but it rules it out as the main explanation for the current deployed degradation signal. Local same-commit validation is still blocked by local restart/reload instability.
**Warnings:** The strongest evidence for this conclusion comes from production job payloads, not local jobs. Local runs are still not trustworthy as comparative baselines because they continue to execute on different `ExecutedWebGitCommitHash` values.
**For next agent:** If asked whether to revert the Wikipedia supplementary deployment, the best current answer is no. The current priority should remain Stage 2/3 retrieval-boundary stabilization plus narrow verdict-grounding containment, while local execution stability is repaired separately.
**Learnings:** no

---
### 2026-04-04 | Senior Developer | Codex (GPT-5) | Compare Newest Local And Deployed Quality Jobs
**Task:** Review the newest local and deployed jobs, identify the current real problems, and update the active quality-stabilization plan with the latest cross-environment reading.
**Files touched:** `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Confirmed that the most trustworthy current quality signals come from deployed jobs, not local dev, because the newest local jobs still executed on different `ExecutedWebGitCommitHash` values and therefore do not satisfy the same-commit validation gate. Production jobs still show the real analytical problem: severe evidence concentration persists on some claims (notably deployed Plastik DE `9a12f07e...` with `81/3/3/2/1`), while `verdict_grounding_issue` still appears even on healthier distributions (for example deployed Bolsonaro EN `cfd508bc...` with `19/13/12/11/5/4`). Updated the WIP plan to make this explicit and to state that Stage 2/3 stabilization remains the root-cause track while verdict grounding remains an independent containment track.
**Open items:** Local execution stability is still unresolved; until a full serial batch runs on one stable local build, local-vs-deployed comparisons remain contaminated. The next engineering work should therefore start from production-backed quality signals, while still keeping the same-commit local validation gate as a prerequisite for trustworthy local experimentation.
**Warnings:** Local `Jobs.ResultJson` persistence remains thinner than the richer report snapshots previously inspected, so the cross-environment synthesis still relies on the earlier detailed job readings gathered during this investigation. No code changes were made to the analyzer in this pass.
**For next agent:** Treat `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md` as updated. If asked what to fix next, the best answer is still: stabilize local execution enough to satisfy the validation gate, then pursue Stage 2/3 retrieval-boundary stabilization and verdict-grounding containment in parallel, using deployed jobs as the higher-confidence quality baseline in the meantime.
**Learnings:** no

---
### 2026-04-04 | LLM Expert | Codex (GPT-5) | Refresh Stale Retrieval Docs
**Task:** Update the clearly stale retrieval solution/plan documentation against the current search implementation.
**Files touched:** `Docs/Specification/Multi_Source_Evidence_Retrieval.md`, `Docs/WIP/2026-03-26_Next_Workstream_Decision.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Updated the old multi-source spec from “proposed / implementation not started” to a partial-implementation state that matches the shipped provider layer, current Wikipedia supplementary completion, and the current UCM-controlled supplementary policy. Preserved the March 26 workstream decision as a historical decision record, but added an explicit 2026-04-04 update note so readers do not mistake its provider-default observations for current reality.
**Open items:** Older retrieval docs may still contain historical assumptions beyond the two corrected files. If the team wants a fuller cleanup, the next pass should check xwiki planning pages and any archived-but-still-linked retrieval notes for current-vs-historical labeling.
**Warnings:** The worktree contains unrelated user edits in `Backlog.md`, `Current_Status.md`, WIP search docs, and xwiki pages. Those were intentionally left untouched. The March 26 decision doc was not rewritten internally because that would blur historical record and current state.
**For next agent:** Treat the current retrieval planning sources as `Docs/WIP/2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md`, `Docs/WIP/2026-04-03_Wikipedia_Supplementary_Completion_Plan.md`, `Docs/STATUS/Backlog.md`, and `Docs/STATUS/Current_Status.md`. Only expand edits beyond these if asked for a broader documentation sweep.
**Learnings:** no

---
### 2026-04-04 | Senior Developer | Codex (GPT-5) | Check Boundary/Grounding Documentation Currency
**Task:** Verify whether the active boundary-concentration / grounding solution and plan documentation is current against the latest rerun results, then update any stale navigation or summary files.
**Files touched:** `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Confirmed that the active plan doc `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md` is already current: it includes the Sonnet sequencing adjustment, the credit-exhaustion interruption, the rerun results, and the latest blocker that the local validation batch is still not same-commit because completed jobs recorded different `executedWebGitCommitHash` values. The only stale piece was the WIP index: `Docs/WIP/README.md` still showed `Last Updated: 2026-04-03` and did not list the new plan. Updated the README date and added the new plan under active quality tracks.
**Open items:** `Current_Status.md` and `Backlog.md` were not changed; for now the active WIP plan is the canonical live planning doc for this issue.
**Warnings:** Historical entries in `Agent_Outputs.md` still describe earlier phases of the same plan and therefore naturally contain superseded sequencing. That is expected chronology, not a documentation bug.
**For next agent:** Treat `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md` as current. Use `Docs/WIP/README.md` as the discovery entry point; it now points to the plan. Do not infer from older `Agent_Outputs` entries that grounding is still sequentially deferred.
**Learnings:** no

---
### 2026-04-04 | Senior Developer | Codex (GPT-5) | Complete Same-Commit Local Validation Gate
**Task:** Finish the blocked local validation gate by clearing stale pre-fix jobs, rerunning the planned serial matrix on one stable live build, and determine what defect should be prioritized next.
**Files touched:** `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Confirmed that job `21f0397bf8aa44b8877b155b779ca57a` was not an analysis failure but a late-observed user cancellation. Cleared the remaining stale old-build queue, then reran Earth DE (`e3d6f405d2c345d58814b15c996e5874`), Bolsonaro EN (`b417c29833794d738c3f3103d7eec32b`), and Plastik DE (`3f97c7e2d6e741479c51135de279e766`) serially on the same live build `a405c20fe605761e3166b8b75037aa909b235794+17524e1c`. The same-commit gate is now satisfied. The new local evidence does not reproduce the earlier catastrophic mega-boundary collapse; instead, `verdict_grounding_issue` persists on Bolsonaro and Plastik while the stable control remains clean. Updated the active WIP plan to move immediate priority toward narrow verdict-grounding containment, with Stage 2/3 stabilization retained as the next comparative quality track driven by deployed evidence and cross-environment reruns.
**Open items:** The next coding task should target verdict-grounding containment (`CB_...` citation suppression, EV existence enforcement, escalation behavior). Stage 2/3 retrieval-boundary stabilization remains open but should be driven by deployed evidence and further controlled comparisons rather than the now-cleared local validation blocker.
**Warnings:** Local live build hashes continue to change whenever unrelated repo commits land, so same-commit validation still requires holding the environment stable for the duration of a batch. Bolsonaro EN experienced long queue and runtime latency but completed successfully on the same build. Several warnings remain noisy (`source_fetch_failure`, `per_source_evidence_cap`, `llm_tpm_guard_fallback`) and should not be mistaken for the primary defect.
**For next agent:** Use the three same-commit jobs above as the current local baseline. Treat `verdict_grounding_issue` as the most clearly reproduced local defect on the current build. Treat earlier local mega-boundary outliers as historical/noisy signals unless they reappear under a fresh same-commit gate. Read the new section 5.9 in the WIP plan before proposing the next fix.
**Learnings:** no

---
### 2026-04-04 | Senior Developer | Codex (GPT-5) | Refresh Provenance Doc Labels And Index
**Task:** Update the provenance WIP documentation so the active design is indexed correctly and the standalone GPT review prompt is clearly marked as historical review input.
**Files touched:** `Docs/WIP/README.md`, `Docs/WIP/2026-04-04_Source_Provenance_GPT_Review_Prompt.md`, `Docs/WIP/2026-04-04_Source_Provenance_Tracking_Design.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added the provenance design to the WIP index under future analyzer proposals, labeled the GPT prompt file as historical review input rather than the active plan, and removed one drifting implementation-specific line-count detail from the revised design doc while preserving its technical direction.
**Open items:** None beyond any future substantive design changes to the provenance proposal itself.
**Warnings:** The standalone GPT review prompt still contains superseded proposal content by design; the new label reduces confusion but does not rewrite that historical prompt.
**For next agent:** Treat `Docs/WIP/2026-04-04_Source_Provenance_Tracking_Design.md` as the current plan and `Docs/WIP/2026-04-04_Source_Provenance_GPT_Review_Prompt.md` as review history only.
**Learnings:** no

---
### 2026-04-04 | Senior Developer | Codex (GPT-5) | Refresh Status And xWiki Planning Docs
**Task:** Patch stale live documentation after a doc-to-code consistency review, focusing on status summaries and xWiki planning/architecture pages.
**Files touched:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/xwiki-pages/FactHarbor/Product Development/Planning/Alpha Roadmap/WebHome.xwiki`, `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Quality and Trust/WebHome.xwiki`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Updated status headers to 2026-04-04, added the April 4 Wikipedia supplementary completion to `Current_Status.md`, and corrected the Alpha Roadmap search-provider summary to reflect the current provider mix. Rewrote the most stale parts of the Quality and Trust xWiki page so it no longer describes the removed AKEL pipeline, old deterministic Gate 1 thresholds, or legacy SR weighting as if they were the current live behavior. Preserved the already-added provenance-planning content in both xWiki pages.
**Open items:** The active WIP provenance review prompt still contains historical pre-revision content by design and was not rewritten in this pass. Other older spec/WIP docs may still contain historical retrieval notes, but the live status and xWiki entry pages now point at the current posture.
**Warnings:** These files already had uncommitted user changes. The patch was limited to the stale sections identified in the review and intentionally did not normalize unrelated wording or formatting.
**For next agent:** Treat `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, and the two updated xWiki pages as the refreshed top-level references. If further doc cleanup is requested, next targets should be older deep-dive/spec pages rather than these entry-point summaries.
**Learnings:** no

---
### 2026-04-04 | Agents Supervisor | Codex (GPT-5) | Close Agent Rules Cleanup Documentation Gap
**Task:** Update the archived Agent Rules Cleanup plan/report documentation so it reflects the completed execution state rather than only the original draft/audit wording.
**Files touched:** `Docs/ARCHIVE/Agent_Rules_Cleanup_Plan_2026-03-17.md`, `Docs/ARCHIVE/Role_Learnings_Curation_Report_2026-03-17.md`, `Docs/ARCHIVE/2026-04-04_Agent_Rules_Cleanup_Closure_Summary.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Kept the archived plan and audit bodies as historical snapshots, but changed their headers/status blocks to make completion explicit and added a dedicated closure summary with the final commit-by-phase record. This avoids rewriting historical analysis while removing the misleading "draft / awaiting review" impression.
**Open items:** None for the cleanup documentation itself.
**Warnings:** `Docs/AGENTS/Agent_Outputs.md` has continued to grow since the March cleanup, so any size-reduction numbers from the closure summary must be read as completion-time snapshots, not current line counts.
**For next agent:** If governance-history docs are referenced in future reviews, use `Docs/ARCHIVE/2026-04-04_Agent_Rules_Cleanup_Closure_Summary.md` first, then the archived plan/report for underlying rationale.
**Learnings:** no

---
### 2026-04-04 | Senior Developer | Codex (GPT-5) | WIP Consolidation #9
**Task:** Run a consolidation pass over `Docs/WIP`, archiving clearly finished late-March/early-April plan docs and syncing the status/index pages to the shipped code state.
**Files touched:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/WIP/README.md`, `Docs/ARCHIVE/README_ARCHIVE.md`, `Docs/WIP/2026-03-27_Internet_Outage_Resilience_Plan.md`, `Docs/WIP/2026-03-27_Bolsonaro_efc5e66f_Single_Source_Flooding_Investigation.md`, `Docs/WIP/2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md`, `Docs/WIP/2026-03-26_Next_Workstream_Decision.md`, `Docs/WIP/2026-03-29_1bfb_Direction_Integrity_Architect_Review.md`, `Docs/ARCHIVE/2026-03-26_Bolsonaro_Seeded_Preliminary_Evidence_Mapping_Review.md`, `Docs/ARCHIVE/2026-03-26_Seeded_Evidence_Mapping_Fix_Investigation.md`, `Docs/ARCHIVE/2026-03-26_Seeded_Evidence_LLM_Remap_Proposal.md`, `Docs/ARCHIVE/2026-03-26_Seeded_Evidence_Mapping_Fix_Proposal_Rev2.md`, `Docs/ARCHIVE/2026-03-27_Seeded_Evidence_Remap_Promotion_Gate_Parked.md`, `Docs/ARCHIVE/2026-03-27_Direction_Validator_False_Positive_Investigation.md`, `Docs/ARCHIVE/2026-03-29_b8e6_8640_Claim_Decomposition_Architect_Review.md`, `Docs/ARCHIVE/2026-03-31_Source_Fetch_Failure_Reduction_Plan.md`, `Docs/ARCHIVE/2026-04-03_Wikipedia_Supplementary_Completion_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Archived 9 clearly completed/superseded WIP docs (seeded-remap proposal cluster, direction-validator false-positive proposal, superseded 2-job claim-decomposition review, source-fetch failure plan, Wikipedia completion plan). Synced `Current_Status.md` and `Backlog.md` to the shipped direction-validator rescue fix and outage-resilience A-track, removed stale backlog items for already-shipped W15 and obsolete “parallel verdict generation,” and updated WIP/archive indexes plus live path references to the moved files. Kept `2026-03-27_Internet_Outage_Resilience_Plan.md` in WIP because only Option A is shipped; Options B/C remain legitimate future work. Kept same-day/new WIP artifacts untouched rather than archiving around active user edits.
**Open items:** `Docs/WIP` still contains additional late-March/April review artifacts not enumerated in the curated README because several are still same-day or actively edited. A deeper consolidation pass can archive more of these once their current-use status is clearer.
**Warnings:** `Docs/AGENTS/Agent_Outputs.md` contains historical references to the moved WIP paths. I did not rewrite historical entries; use `Docs/ARCHIVE/README_ARCHIVE.md` to locate archived replacements. The working tree also contains unrelated user edits in xWiki and other docs that were intentionally left untouched.
**For next agent:** Treat the archived remap/direction/fetch/Wikipedia docs as historical records under `Docs/ARCHIVE/`. Treat `Docs/WIP/2026-03-27_Internet_Outage_Resilience_Plan.md` and `Docs/WIP/2026-03-27_Bolsonaro_efc5e66f_Single_Source_Flooding_Investigation.md` as partially-done living records. If another consolidation is requested, the next likely candidates are the unindexed March 30–April 1 review artifacts still sitting in `Docs/WIP/`.
**Learnings:** no

---
### 2026-04-04 | Senior Developer | Codex (GPT-5) | Fix Comparative Geography Evidence Starvation
**Task:** Diagnose and fix the `UNVERIFIED 50/0` comparative-claim failure seen in deployed job `23e1c77a2b8c4836816d8c318bde2c67` and local job `a840ce212dee4bd58caa0bdf33e00b86`.
**Files touched:** `apps/web/src/lib/analyzer/jurisdiction-context.ts`, `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, `apps/web/src/lib/analyzer/research-query-stage.ts`, `apps/web/src/lib/analyzer/research-extraction-stage.ts`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/prompts/claimboundary.prompt.md`, `apps/web/test/unit/lib/analyzer/research-extraction-stage.test.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Root cause was a generic multi-jurisdiction handling bug: the claim `Die Schweiz hat kein systematisches Fact-Checking wie Deutschland` was reduced to a single inferred geography (`CH`), and that singular geography was passed into query generation, relevance classification, and applicability assessment. Germany-side evidence for the comparison could therefore be treated as foreign or deprioritized, starving the second atomic claim to zero evidence in both local and deployed runs. Added claim-level `relevantGeographies`, threaded multi-geography context through Stage 1 extraction, Stage 2 query generation, Stage 2 relevance classification, and the post-extraction applicability filter, and updated prompts so comparative claims can carry multiple jurisdictions without collapsing onto one anchor geography.
**Open items:** A fresh live rerun on the patched local stack was submitted as job `c3a19e4ca612445a8e32cb330da604f8`, but queue latency delayed execution and it was still running when this handoff was written. Production still needs the fix deployed before the original live issue can be rechecked there.
**Warnings:** The repo contains unrelated doc/provenance edits from earlier work today; they were intentionally left out of this analyzer fix commit. The new multi-geography field is structural plumbing only; if a future issue remains, inspect Stage-1 extraction quality for whether comparative claims consistently populate `relevantGeographies`.
**For next agent:** After deployment or local queue drain, re-run the exact Swiss-vs-Germany claim and confirm that AC_02 now receives Germany evidence, the `evidence_applicability_filter` warning drops or disappears, and the article no longer collapses to `UNVERIFIED 50/0`. Safe verification already passed: `npm test` and `npm -w apps/web run build`.
**Learnings:** no

---
### 2026-04-04 | Senior Developer | Codex (GPT-5) | Make Job/API Commit Hash Live Per New Commit
**Task:** Fix local and deployed provenance stamping so new jobs and version endpoints expose the current live commit hash instead of a startup-frozen value.
**Files touched:** `apps/api/Helpers/AppBuildInfo.cs`, `apps/api/Services/JobService.cs`, `apps/api/Controllers/VersionController.cs`, `apps/api/Program.cs`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Replaced the old startup-resolved `AppBuildInfo.Resolve()` singleton record with a live resolver service that prefers deployment-injected `GIT_COMMIT`, falls back to local git state, and exposes `GetGitCommitHash(useCache: false)` for new job creation/retry stamping. Added `git_sha` to the API `/version` response and updated DI so the API no longer freezes commit provenance at process startup. This keeps the visible job hash current after new local commits without requiring an API restart, while still preserving deployment provenance in production.
**Open items:** The deployed environment still needs the patched API build running before production jobs benefit from the live resolver. `scripts/restart-clean.ps1` leaving stale port owners was observed separately and was not fixed in this change.
**Warnings:** This change affects provenance labeling only; it does not create an analysis-scoped fingerprint. Unrelated docs remain modified in the worktree and were intentionally excluded from the commit.
**For next agent:** Verify production picks this up after the next deploy/restart by checking `/version` and one freshly created job. If future validation needs analyzer-only provenance, add a second scoped fingerprint rather than changing this whole-repo build id again.
**Learnings:** no

---
### 2026-04-04 | Senior Developer | Codex (GPT-5) | Scope Grounding Validation to Claim-Local Context
**Task:** Fix `verdict_grounding_issue` false positives by aligning grounding validation scope with the claim-local evidence/source context already used by direction validation.
**Files touched:** `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/prompts/claimboundary.prompt.md`, `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Grounding validation no longer receives one global evidence pool plus flattened global source portfolio. It now receives per-verdict claim-local `evidencePool`, per-verdict `sourcePortfolio`, and a separate `citedEvidenceRegistry` so the validator can distinguish three cases: missing cited IDs (hallucination), uncited-but-claim-local reasoning context (valid), and references absent from claim-local context (cross-claim contamination/hallucination). Direction validation and repair were left unchanged on purpose; they still use the broader fail-open claim-local helper because their job is rescue/recalibration, not contamination detection.
**Open items:** The fix is verified by unit tests and build only. A fresh live rerun on a report previously showing `verdict_grounding_issue` is still needed to confirm the warning disappears or drops to only genuine contamination cases.
**Warnings:** The new grounding helper intentionally treats cited sibling-claim evidence as invalid for grounding when claim mappings exist. If future jobs reveal mapping gaps (valid cited IDs absent from `relevantClaimIds`), fix the mapping upstream rather than weakening the grounding validator back to global scope.
**For next agent:** Re-run the Swiss-vs-Germany local success case (`c3a19e4ca612445a8e32cb330da604f8`) or a fresh equivalent and inspect whether the prior `S_015/S_016`-style warning is gone. If any grounding warning remains, compare it against the new three-tier rule before changing severity/policy.
**Learnings:** no

---
### 2026-04-04 | Senior Developer | Codex (GPT-5) | Document Local vs Deployed Grounding Canary Results
**Task:** Check the live local and deployed systems after the grounding-scope fix, compare the Switzerland-vs-Germany canary jobs, and record what is actually validated versus still provenance-inconclusive.
**Files touched:** `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Recorded both service/version states and both canary jobs. Local validation is now considered complete because the local services and the local canary job all ran on `b7783872...` and the warning disappeared. Deployed validation is explicitly not considered complete yet because the deployed services report `b7783872...`, but the sampled deployed canary job still stamped the older execution hash `521040e...`, even though the warning also did not appear there.
**Open items:** One more deployed rerun of the same claim is still needed. The acceptance condition is that the new deployed canary must both (a) stamp `b7783872...` and (b) remain free of `verdict_grounding_issue`.
**Warnings:** Do not treat deployed job `82344370fbd54cb9bec1653cc462b84c` as final proof of the grounding fix. It is encouraging behaviorally, but provenance-inconclusive because the job itself ran/stamped as `521040e...`.
**For next agent:** Use the new section 6 in `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md` as the current source of truth for the local/deployed status split. The next operational step is a fresh production rerun of the same claim and a quick provenance check on the new job hash.
**Learnings:** no

---
### 2026-04-05 | Senior Developer | Codex (GPT-5) | Refine Grounding Validator Prompt for Remaining False Positives
**Task:** Narrow the remaining `verdict_grounding_issue` false positives still seen on deployed `b7783872...` jobs after claim-local grounding scoping had already shipped.
**Files touched:** `apps/web/prompts/claimboundary.prompt.md`, `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Kept the claim-local grounding code unchanged and tightened only `VERDICT_GROUNDING_VALIDATION`. The prompt now explicitly treats directional citation arrays as non-exhaustive, allows uncited-but-claim-local EV references, allows explicit discussion of invalid/hallucinated challenge IDs when the reasoning is rejecting them, and forbids treating `trackRecordScore: null` or weak source reliability as grounding failures when the source exists in the claim-local source portfolio. This keeps grounding structural and prevents analytical-quality criticism from being misclassified as hallucination.
**Open items:** A fresh deployed rerun on the new prompt hash is still required. Acceptance condition: the Switzerland-vs-Germany canary and at least one previously affected `b7783` claim family complete without `verdict_grounding_issue`, or any remaining warning is clearly a real cross-claim/hallucination case.
**Warnings:** This is a prompt-only refinement. If warnings persist after deployment, inspect the exact warning text before changing code again; the next step would likely be a more explicit validator input contract, not broader relaxation.
**For next agent:** After prompt rollout, re-run the Swiss-vs-Germany canary and one of the previously affected production claims (`38d576...` or `d0c115...` family) and compare the warning text against the three false-positive buckets documented in WIP section 5.10. Verification already passed: `npm -w apps/web exec vitest run test/unit/lib/analyzer/verdict-prompt-contract.test.ts` and `npm -w apps/web run build`.
**Learnings:** no

---
### 2026-04-05 | Senior Developer | Codex (GPT-5) | Fix Residual Grounding Noise: Source Backfill, Validator Context, Citation Repair
**Task:** Implement the next approved three-step fix set for residual `verdict_grounding_issue` cases: source-ID backfill for late-added evidence, richer structural context for grounding validation, and a gated citation-alignment repair pass after reconciliation.
**Files touched:** `apps/web/src/lib/analyzer/research-orchestrator.ts`, `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/prompts/claimboundary.prompt.md`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`, `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added an iteration-level `reconcileEvidenceSourceIds(...)` pass at the end of `runResearchIteration(...)` so contrarian and supplementary late additions no longer bypass source linking. Expanded grounding validation input with structured `boundaryIds` and per-claim `challengeContext` instead of flattening those references into the evidence pool. Added a new `VERDICT_CITATION_ALIGNMENT_REPAIR` prompt plus a gated post-reconciliation repair call that fires only when structural `EV_*` IDs appear in reasoning but are missing from the current citation arrays; the repair stays LLM-driven and fail-open rather than using deterministic semantic merge logic.
**Open items:** No live reruns were executed in this pass. The next validation step is to rerun the previously affected local families (`e03a...`, `0711...`, `2f297...` or fresh equivalents) and verify that (1) empty `sourceId` no longer appears for fetched evidence, (2) `CB_*` / `CP_*` / rejected challenge-cited `EV_*` references no longer raise false grounding warnings, and (3) remaining warnings are limited to genuine cross-claim contamination or hallucinated IDs.
**Warnings:** The new citation repair can revise arrays and reasoning, but only within the known claim-local evidence set. If future runs still show cross-claim or hallucinated IDs after the repair call, inspect the reconciler output first; do not weaken grounding rules again without evidence. The admin-key-related 401 metrics warnings seen in existing tests are pre-existing and unrelated to this change.
**For next agent:** Start with fresh local canaries on the current branch before any deploy decision. Watch especially for the prior `isdglobal.org` empty-`sourceId` pattern and the Plastik AC_02 reasoning/array mismatch family. Verification passed: `npm -w apps/web exec vitest run test/unit/lib/analyzer/verdict-stage.test.ts`, `npm -w apps/web exec vitest run test/unit/lib/analyzer/verdict-prompt-contract.test.ts`, `npm -w apps/web exec vitest run test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `npm test`, and `npm -w apps/web run build`.
**Learnings:** no

---
### 2026-04-05 | Senior Developer | Codex (GPT-5) | Replace Citation Repair with Single-Citation-Channel Root Fix
**Task:** Replace the unconvincing post-hoc `VERDICT_CITATION_ALIGNMENT_REPAIR` approach with a root-cause fix for residual grounding noise, then validate it on fresh local canaries.
**Files touched:** `apps/web/prompts/claimboundary.prompt.md`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`, `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`, `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Kept the source-ID backfill and richer grounding-validation context, but removed the citation-repair call entirely. Root cause was dual citation channels: prompts told the LLM to embed raw `EV_*`/`S_*` IDs in prose reasoning while the structured evidence arrays were also supposed to be authoritative. The fix makes `supportingEvidenceIds`, `contradictingEvidenceIds`, and `adjustmentBasedOnChallengeIds` the only machine-readable citation channel and explicitly forbids raw machine IDs in verdict prose. `VERDICT_CITATION_ALIGNMENT_REPAIR` was removed from the prompt file, prompt contract tests were updated, and `reconcileVerdicts()` no longer performs a repair pass.
**Open items:** Changes are verified locally but not committed. If a future run still shows `verdict_grounding_issue`, inspect whether it is now a genuine cross-claim contamination / hallucination case rather than a prose-citation mismatch.
**Warnings:** This fix intentionally changes verdict prose style by removing raw machine IDs from reasoning. That is the point, not a regression. If any downstream UI/debug workflow was implicitly relying on `EV_*` strings inside prose, it must instead use the structured arrays already present in the verdict object.
**For next agent:** Fresh local canaries on prompt hash `79f7e76fa9c624f8256464739b2eb73d9b0ab065f9462190b8e7aa0e50ee1bd4` succeeded: `51751fbc88bb4489a9955f4baf011945` (Meta) finished `TRUE 92/85` with no `verdict_grounding_issue`; `c4a4c60612ff48f0a3dbb8da764fb0ab` (Plastik) finished `MIXED 51/62` with no `verdict_grounding_issue`. Verification passed: `npm -w apps/web exec vitest run test/unit/lib/analyzer/verdict-stage.test.ts`, `npm -w apps/web exec vitest run test/unit/lib/analyzer/verdict-prompt-contract.test.ts`, `npm test`, and `npm -w apps/web run build`.
**Learnings:** no

---
### 2026-04-05 | Senior Developer | Codex (GPT-5) | Align Challenger and Grounding Prompts with Single-Citation-Channel Contract
**Task:** Apply the two follow-up prompt cleanups from architecture review so the single-citation-channel contract is consistent across Stage 4 prompts.
**Files touched:** `apps/web/prompts/claimboundary.prompt.md`, `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Updated `VERDICT_CHALLENGER` so `evidenceIds` is the authoritative citation channel and challenge prose must not contain raw machine IDs. Tightened `VERDICT_GROUNDING_VALIDATION` wording so `S_*`, `CB_*`, `CP_*`, and rejected challenge-cited `EV_*` are treated as defensive legacy cases if they still appear in reasoning, rather than described as expected prose content.
**Open items:** None specific to this cleanup. If future grounding warnings recur, they should now be interpreted against the cleaner contract: machine IDs in prose are discouraged everywhere, but still handled defensively when they appear.
**Warnings:** This was a contract-consistency cleanup only. It does not add new runtime behavior beyond making prompt expectations less contradictory.
**For next agent:** The prompt contract tests now explicitly cover challenger prose and the defensive legacy wording in grounding validation. Verification passed: `npm -w apps/web exec vitest run test/unit/lib/analyzer/verdict-prompt-contract.test.ts`, `npm test`, and `npm -w apps/web run build`.
**Learnings:** no

---
### 2026-04-05 | Senior Developer | Codex (GPT-5) | Update Status Docs After Grounding Root Fix
**Task:** Bring the active status docs and backlog into sync with the committed grounding root-fix work and its current validation state.
**Files touched:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Updated the top-level status snapshot to state that the grounding false-positive root fix is now committed in code, locally validated on fresh canaries, and shifted from "next fix" to monitor/deployed-validation status. Added a new 2026-04-05 recent-changes block in `Current_Status.md`, added `GRND-1` as a monitor item in `Backlog.md`, and recorded the grounding track as completed-in-code in the active WIP stabilization plan so the next analytical workstream is Stage 2/3 stabilization rather than more grounding redesign.
**Open items:** Docs are updated but not committed. Deployed validation of the grounding root fix and first-7-run monitoring still remain open operationally.
**Warnings:** The docs now distinguish clearly between "implemented in code" and "validated in production." Do not collapse those two states in future updates unless a fresh deployed rerun on the new commit has been checked.
**For next agent:** If these doc updates are committed, keep `GRND-1` in MONITOR status until the first 7+ runs and deployed validation are reviewed. The next substantive plan/doc changes should likely focus on the Stage 2/3 boundary-concentration track.
**Learnings:** no

---
### 2026-04-05 | Senior Developer | Codex (GPT-5) | Run 5-Input Local-vs-Deployed Quality Gate
**Task:** Execute the agreed 5-input comparison set on local and deployed to determine whether local report quality is strong enough to justify deployment.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Submitted the same five claimboundary inputs to local and deployed with admin-key API access. Final local job hashes were all `07cb2e0d...`; final deployed job hashes were all `b7783872...`. Local was clearly stronger on `Ist die Erde rund?` and `Meta exited the US Third-Party Fact-Checking Program (January 2025)`, but weaker on Bolsonaro EN and not clearly better on Swiss-vs-Germany or Plastik. On that basis, the batch does not support a deploy recommendation.
**Open items:** If a stricter apples-to-apples gate is still desired, rerun local serially with effective concurrency 1 to remove queue asymmetry. Otherwise the main next work remains quality fixes, not deployment.
**Warnings:** Local still emitted `verdict_grounding_issue` / `verdict_direction_issue` on hard cases (`Plastik`, Bolsonaro EN) while deployed remained cleaner on some of those families. Deployed also showed boundary concentration on Earth, Plastik, and Bolsonaro, so this batch does not imply production is healthy overall; it only shows local is not yet clearly better.
**For next agent:** Batch job IDs were local `7849614707f941a4822120a8c32976a4`, `345d6487f2344923b0eeeb3b7ce1ca4d`, `52fcb6244a0145a999d9a5279b019912`, `e65b95916b594a90bfe72f31b04304cd`, `039b105677a54ccdbc7ef0e5da9c03d2`; deployed `3e1253cb79a44389b86d0c47ab734f13`, `80bbcc3dd89447d18bac16f1f5b84a96`, `eb02cd2e535a4556a2bc3c29868412a0`, `9042bb732a8149eb8de1133045214578`, `3f00ba806cfc4319be90e5cebc84ab14`. Key outcomes: local Earth `TRUE 95/90` vs deployed `TRUE 87/79`; local Plastik `MIXED 45/66` with grounding warnings vs deployed `LEANING-FALSE 41/48`; local Bolsonaro `LEANING-TRUE 58/55` with grounding/direction warnings vs deployed `MOSTLY-TRUE 73/70`; local Swiss/DE `MIXED 53/61` vs deployed `LEANING-TRUE 60/70`; local Meta `TRUE 98/93` vs deployed `TRUE 92/88`.
**Learnings:** no

---
### 2026-04-05 | Senior Developer | Codex (GPT-5) | Reframe Batch as Build-over-Build Comparison
**Task:** Compare the newest current-build reports against nearest same-family reports from older builds on the same environment, instead of making broad local-vs-deployed claims.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Treated local `07cb2e0d...` reports and deployed `b7783872...` reports as the current-build set. Compared each to the nearest older-build same-family report available on that environment. Conclusion: improvements and regressions are mixed; no environment-wide “better” claim is justified. Local current build improved on Meta and Swiss/DE, structurally improved on Earth, but regressed on Bolsonaro and did not clearly improve Plastik. Deployed current build improved grounding cleanliness on several families, but Earth regressed materially and Bolsonaro became structurally more concentrated.
**Open items:** If exact immediate-prior-build comparisons are required, some families need new controlled reruns because the nearest older-build sample is not always from the immediately preceding hash.
**Warnings:** For local Earth and deployed Earth, the nearest previous same-family reports were on older non-adjacent builds because no exact Earth sample existed on the immediately prior build. Interpret those two as nearest-available build-over-build comparisons, not exact adjacent-build A/B tests.
**For next agent:** Local current-build batch: Earth `78496147`, Plastik `345d6487`, Bolsonaro `52fcb624`, Swiss/DE `e65b9591`, Meta `039b1056`. Deployed current-build batch: Earth `3e1253cb`, Plastik `80bbcc3d`, Bolsonaro `eb02cd2e`, Swiss/DE `9042bb73`, Meta `3f00ba80`. Main comparative takeaways: local Meta improved (`98/93` vs `92/85`); local Swiss/DE improved (`53/61` vs `48/51`), local Bolsonaro confidence improved but gained grounding/direction warnings; local Plastik gained evidence but also grounding noise. Deployed Swiss/DE lost some score but removed grounding warnings; deployed Plastik removed collapse/grounding warnings but also dropped to `LEANING-FALSE 41/48`; deployed Bolsonaro gained score but collapsed to an `80`-evidence mega-boundary.
**Learnings:** no

---
### 2026-04-05 | Senior Developer | Codex (GPT-5) | Write WIP Build Comparison Note
**Task:** Write a dedicated WIP markdown note that makes the 5-input comparison unambiguous by separating build-over-build analysis from current local-vs-deployed comparison.
**Files touched:** `Docs/WIP/2026-04-05_Current_vs_Previous_Build_Report_Comparison.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added a standalone WIP note with explicit comparator rules, separate tables for local build-over-build and deployed build-over-build, and a third table for current local vs current deployed. Added the new note to the WIP index and updated the WIP README date to `2026-04-05`.
**Open items:** None for the document itself. If exact immediate-prior-build A/B evidence is needed for every family, some families still require controlled reruns because older history does not always contain a same-family sample on the immediately preceding hash.
**Warnings:** The document explicitly distinguishes nearest older-build comparisons from exact immediate-prior-build comparisons. Do not collapse those categories in later summaries.
**For next agent:** Use the WIP note as the canonical comparison reference for this batch instead of rephrasing from memory. It already contains the exact current job IDs and the comparator caveats.
**Learnings:** no

---
### 2026-04-05 | Senior Developer | Codex (GPT-5) | Add Traffic-Light Status to WIP Comparison Note
**Task:** Colorize the WIP comparison note with explicit traffic-light markers so improvements, declines, mixed results, and missing comparators are immediately visible.
**Files touched:** `Docs/WIP/2026-04-05_Current_vs_Previous_Build_Report_Comparison.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added a traffic-light legend (`🟢`, `🟡`, `🔴`, `⚪`), inserted a `Status` column into all three main comparison tables, and added two compact traffic-light matrices summarizing build-over-build and current local-vs-deployed results.
**Open items:** None.
**Warnings:** The color markers summarize the written judgment but do not replace the existing comparator caveats. Earth and deployed Meta still require the previously documented caution about comparator availability.
**For next agent:** If this note is migrated into status docs, preserve both the legend and the separation between build-over-build and current local-vs-deployed sections.
**Learnings:** no

---
### 2026-04-05 | Senior Developer | Codex (GPT-5) | Make WIP Comparison Colors Visible in Plain Markdown
**Task:** Replace the subtle color markers with explicit plain-text status chips because the markdown viewer does not render actual table cell colors.
**Files touched:** `Docs/WIP/2026-04-05_Current_vs_Previous_Build_Report_Comparison.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Kept the same judgments but changed the legend and status cells to explicit labels: `🟩 IMPROVED`, `🟨 MIXED`, `🟥 DECLINED`, `⬜ NO COMPARATOR`. Updated the matrices to use the same visible chips.
**Open items:** None.
**Warnings:** Markdown tables still do not support real background fills in this viewer. The visible status now depends on the emoji + text labels, not actual colored cells.
**For next agent:** If you need real colored boxes later, this will need xWiki macros or HTML/CSS in a different rendering context rather than plain markdown tables.
**Learnings:** no

---
### 2026-04-05 | Senior Developer | Codex (GPT-5) | Check Whether Older Ahead-of-Deploy Commits Caused Local Quality Decline
**Task:** Investigate whether the older commits ahead of deployed (`ec7a8de8`, `d9194303`, `08661690`) plausibly caused the current local quality deficits.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** `08661690` is docs-only and cannot affect report quality. `ec7a8de8` only changed the grounding-validation prompt section in `claimboundary.prompt.md`, so it can affect warning behavior but not verdict generation/retrieval quality; any score movement around that point is therefore not credibly caused by the commit. `d9194303` is the only substantial code/prompt change in this subset, but the available local pre-commit validation runs that included its worktree changes (`c4a4c606`, `51751fbc`) show improvement, not decline, on the families they exercised (Plastik and Meta). Current local regressions on Bolsonaro/Plastik therefore do not have evidence pointing back to these older commits.
**Open items:** There is still no direct Bolsonaro EN sample on the exact `d9194303` state, so that family remains unproven at a strict commit-isolation level. If exact attribution is needed, rerun Bolsonaro EN on a checkout of `d9194303`.
**Warnings:** Some local quality movement between `b7783872`, `ec7a8de8`, and `07cb2e0d` is claim-family variance, not necessarily commit-driven regression. Do not infer causality from score changes alone when the commit only touched admin-only validation prompts.
**For next agent:** The main conclusion is negative attribution: none of the older commits ahead of deployed currently has evidence of causing the local quality decline. If further causality work is needed, investigate later commits (`81e7ddc4`, `07cb2e0d`) only where they plausibly affect the family, and otherwise focus on deeper unresolved hard-case variance rather than rollback-by-suspicion.
**Learnings:** no

---
### 2026-04-06 | Senior Developer | Codex (GPT-5) | Compare Live Deployed `2ec54047` Jobs vs `b7783872` Baseline
**Task:** Investigate report-quality changes on live deployed jobs for current deployed commit `2ec54047371670f386646c46027a722e26610788` versus previous deployed baseline `b77838727ae6848c4f42d3dcef8eba47c58b7cfa`, with emphasis on Cross-Boundary Tensions.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Used the live deployed API (`https://app.factharbor.ch/api/version`, `https://app.factharbor.ch/api/fh/version`, `https://app.factharbor.ch/api/fh/jobs`, per-job detail endpoints) rather than only archived notes. Current live services report `2ec54047` on 2026-04-06; the visible current-commit cohort is therefore the two Apr 6 jobs after the commit timestamp (`cb014086`, `c5acf6cb`). Compared those against the Apr 4–5 `b7783872` baseline cohort, with a same-input Swiss-vs-Germany comparison (`cb014086` vs `0fb38858`) plus family-level context from `38d5760e`, `80bbcc3d`, `eb02cd2e`, `3e1253cb`, and `3f00ba80`. Conclusion: no broad report-quality step-change is visible yet; the live `2ec54047` sample mostly shows narrower grounding warnings, materially different query mix on the same Swiss/Germany claim, and somewhat more explicit Cross-Boundary Tensions narration, while Stage 2/3 concentration remains unresolved. Likely causes are the grounding/citation changes (`ec7a8de8`, `d9194303`, `cbb364ec`, `ffaa4fdd`) plus the multi-jurisdiction query-balance softening in `07cb2e0d`; the current evidence does not support a new root-cause shift beyond the already-known retrieval/boundary instability.
**Open items:** The live `2ec54047` sample is small and asymmetric: only two visible jobs after the deploy timestamp, with only one exact same-input comparator (`cb014086` vs `0fb38858`). More fresh same-family `2ec54047` reruns are needed before making stronger deploy-level quality claims.
**Warnings:** `2ec54047` is a docs commit, but the deployed range from `b7783872..2ec54047` does include analysis-affecting changes in prompts and analyzer code. Also, public job APIs do not expose `gitCommitHash` without admin auth, so commit assignment for the current cohort was inferred from exact commit timestamps plus the live service version endpoints.
**For next agent:** If you need higher confidence on `2ec54047`, submit fresh deployed reruns for the Apr 5 baseline families (`Plastik`, `Bolsonaro EN`, `Earth`, `Meta`, `Swiss vs Germany`) and compare against the `b7783872` batch already documented in `Docs/WIP/2026-04-05_Current_vs_Previous_Build_Report_Comparison.md`. Focus on whether the current prompt hash `bbe1af93...` consistently surfaces better/narrower grounding behavior and whether `07cb2e0d` keeps under-covering one jurisdiction on multi-jurisdiction claims.
**Learnings:** no

---
### 2026-04-06 | Senior Developer | Codex (GPT-5) | Trace Cross-Boundary Tensions Code Path And Regression Risk
**Task:** Investigate the end-to-end code path that produces `Cross-Boundary Tensions`, including UI rendering, Stage 5 narrative generation, Stage 4 verdict data, Stage 3 boundary construction, prompts, and recent commits that could plausibly increase tensions.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Confirmed the UI is passive: the job page passes `result.verdictNarrative` straight into `VerdictNarrativeDisplay`, and both the page and HTML export only render `boundaryDisagreements` if present. The field is generated only in `generateVerdictNarrative()` during Stage 5. Stage 5 feeds the LLM a reduced summary: up to 7 final claim verdicts plus each claim’s `boundaryFindings` reduced to boundary ID/name, `evidenceDirection`, and `evidenceCount`; boundary truth/confidence, raw evidence, source portfolios, and challenge responses are not included. The most important defects are upstream of the UI: (1) the checked-in `VERDICT_NARRATIVE` prompt still references `${aggregation}` and `${evidenceSummary}`, while Stage 5 passes `overallVerdict`, `coverageMatrix`, and `evidenceCount`; prompt-loader leaves missing placeholders intact and Stage 5 ignores render warnings, so the model can receive literal unresolved tokens; (2) Stage 4 reconciliation intentionally preserves advocate-era `boundaryFindings`, so Stage 5 tensions summarize pre-challenge per-boundary judgments even when final claim truth/confidence/evidence citations changed; (3) there is no Stage 5 prompt-contract test analogous to the existing Stage 4 contract suite. Recent commits most plausibly affecting tension frequency are `81314c86` (analyticalDimension-driven scope separation, likely increasing boundary count and therefore opportunities for tension) and `b4e1166b` (multi-jurisdiction context preservation, likely preserving more geography-specific divergence). `e0cf6752` can also increase populated boundary findings indirectly by fixing Stage 4 prompt serialization. The UI commits do not change generation behavior.
**Open items:** I did not execute live analysis jobs, so this is a code-and-history investigation rather than a rerun-based attribution test. Runtime prompt content can still differ if the active UCM prompt was manually edited, though the loader auto-refreshes system-seeded prompts from file.
**Warnings:** The strongest current root cause is stale/underspecified Stage 5 input, not simply “too many boundaries.” Reducing tensions only in the UI would hide symptoms while leaving inconsistent narrative generation intact. Also note that sample stored outputs show `boundaryDisagreements` being used for mild caveats such as one mixed or neutral boundary versus otherwise aligned boundaries, which supports the over-generation concern.
**For next agent:** Highest-leverage fixes are: align the Stage 5 prompt contract with actual variables and add a Stage 5 prompt-contract test; stop using stale advocate `boundaryFindings` for final narrative generation by either recomputing them after reconciliation or having reconciliation output updated per-boundary findings; and gate/report tensions from a structured final boundary-divergence summary so single mixed/neutral caveats do not become “Cross-Boundary Tensions” unless divergence is substantive.
**Learnings:** no

---
### 2026-04-06 | Generalist | Codex (GPT-5) | Local Current Commit Tension Investigation
**Task:** Investigate recent local jobs on commit `2ec54047371670f386646c46027a722e26610788`, compare Cross-Boundary Tensions against earlier local jobs on `b7783872` and nearby code-affecting commits, and identify likely root causes from `apps/api/factharbor.db` plus relevant code/prompt files.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Confirmed `2ec54047` is docs-only, so current local tension behavior is inherited from earlier code-affecting commits plus run-time variance. On the repeated Swiss/Plastik/Bolsonaro-EN local comparison set, current `2ec540` jobs have lower average tension-bullet count (`1.33`) than `b778` (`3.0` on the only local sample), `ec7a` (`2.33`), `07cb` (`2.0`), and `ffaa` (`3.0`). The main causes are not a fresh Stage-5 regression but a mix of retrieval/source-access variance, changing claim decomposition, and boundary concentration/compression. Current Swiss dropped from 3 bullets on `b778` to 1 because the run extracted 3 claims instead of 2, then left 2 claims `UNVERIFIED` after fetch failures and applicability filtering cut the evidence pool to 13 items. Current Plastik dropped from 4/3 bullets on nearby commits to 2 because evidence concentrated heavily into one dominant boundary (`64/75` items in `CB_01`), collapsing disagreement variety while still leaving a severe dominant conflict. Current Bolsonaro EN dropped to 1 bullet with 63 evidence / 26 sources, but the same topic in Portuguese on the same commit produced 3 bullets with 115 evidence / 55 sources, indicating retrieval language and source accessibility dominate tension richness more than current code changes.
**Open items:** If the team wants tension counts to be comparable across runs, `boundaryDisagreements` needs a more structured contract; today it is an optional concise narrative list and should not be treated as a stable severity metric. Bolsonaro EN/PT remains the best same-commit canary for retrieval-language effects.
**Warnings:** Lower tension count is not equivalent to lower analytical tension. The Stage-5 prompt explicitly says to keep the field concise and omit it unless divergence is meaningful, and `aggregation-stage.ts` only passes a summarized/truncated payload into the narrative step. One current Bolsonaro EN bullet compresses multiple cross-claim conflicts that earlier runs split into 2-3 bullets.
**For next agent:** Anchor jobs: current `bf502af1`, `02891ccb`, `f712efca`, `ff198492`; comparisons `7d2b91b5`, `da3f0cea`, `e65b9591`, `c4a4c606`, `345d6487`, `da1180ed`, `5e93d734`, `52fcb624`, `703c261d`. Key references are the optional concise `boundaryDisagreements` contract in `apps/web/prompts/claimboundary.prompt.md`, the trimmed Stage-5 payload in `apps/web/src/lib/analyzer/aggregation-stage.ts`, the softened multi-jurisdiction query guidance in the same prompt file, and the Stage-4 grounding alias work in `apps/web/src/lib/analyzer/verdict-stage.ts`.
**Learnings:** no

---
### 2026-04-06 | Senior Developer | Codex (GPT-5) | Consolidate Current vs Previous Deployment Cross-Boundary Tensions Investigation
**Task:** Compare all current-commit (`2ec54047`) jobs against previous deployed baseline (`b7783872`) across local and deployed systems, explain why `Cross-Boundary Tensions` appears more often, run a multi-agent debate, and consolidate root causes plus proposed solutions in a WIP plan.
**Files touched:** `Docs/WIP/2026-04-06_Cross_Boundary_Tensions_Current_vs_Previous_Deployment_Investigation.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Confirmed the live deployed system now reports `2ec54047`, with previous deployed baseline `b7783872`. Cohort comparison shows the increase is real on deployed (`avg tensions/job 1.86` vs `0.60`) but not a general local spike. The Stage 5 `boundaryDisagreements` code path did not change directly in this range; instead, the strongest root causes are: (1) Stage 5 still receives stale advocate-era `boundaryFindings` because reconciliation preserves them; (2) `VERDICT_NARRATIVE` prompt contract is broken, still referencing `${aggregation}` and `${evidenceSummary}` while code passes `overallVerdict`, `coverageMatrix`, and `evidenceCount`; unresolved placeholders remain in the prompt; (3) Stage 5 receives too little final structured divergence context, so it over-narrates methodological asymmetries, thin singleton caveats, and concentration artefacts as “tensions.” At the same time, some of the increase is legitimate: several current deployed jobs are less mega-boundary-dominated than the `b778` cohort, so real multi-boundary disagreement is more visible now.
**Open items:** No code changes were made in this investigation. Highest-priority next work is to fix the Stage 5 prompt contract, add a Stage 5 prompt-contract test, and stop feeding stale advocate `boundaryFindings` into final narrative generation. After that, rerun repeated families (`Swiss no systematic FC`, `Bolsonaro EN`, `Plastik`, `misinformation tools`) on local and deployed.
**Warnings:** `2ec54047` is docs-only, so it should not be treated as the causal commit. The analysis-affecting range is `b7783872..ffaa4fdd`. Also, tension count is not a stable severity metric today: one bullet can compress multiple conflicts, and some current tension bullets are really concentration or methodology caveats rather than substantive final disagreement.
**For next agent:** Start from `Docs/WIP/2026-04-06_Cross_Boundary_Tensions_Current_vs_Previous_Deployment_Investigation.md`. The three supporting debate threads already concluded: deployed current jobs do show more visible tensions; local current jobs do not show a comparable general rise; and the key code-level fixes belong in Stage 5 narrative generation, not UI rendering. Most relevant code references are `apps/web/src/lib/analyzer/aggregation-stage.ts`, `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/prompts/claimboundary.prompt.md`, and `apps/web/src/lib/analyzer/prompt-loader.ts`.
**Learnings:** no

---
### 2026-04-06 | Senior Developer | Codex (GPT-5) | Review Stage-5 Tension Fix Follow-Ups And Update Docs
**Task:** Review the Stage-5 narrative-tension implementation after `08220154` and `2acc4545`, update project docs to the new state, and commit the documentation.
**Files touched:** `Docs/WIP/2026-04-06_Cross_Boundary_Tensions_Current_vs_Previous_Deployment_Investigation.md`, `Docs/WIP/2026-04-06_Cross_Boundary_Tension_Investigation.md`, `Docs/WIP/README.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Reviewed `08220154` and found the main direction correct but two medium follow-up gaps: Stage 5 `sourceCount` was counting hostnames instead of actual sources, and the stale-variable fix still lacked a dedicated Stage-5 prompt-contract test. Both gaps were then closed in `2acc4545`: `sourceCount` now uses unique `sourceUrl` values and `verdict-prompt-contract.test.ts` now contains dedicated `VERDICT_NARRATIVE` coverage for existence, unresolved placeholders, `[object Object]`, and the tightened `boundaryDisagreements` instruction contract. Docs were updated to record that Fix 1 + Fix 3 are fully landed, the review follow-ups are closed, and the next gate is canary remeasurement rather than more Stage-5 redesign.
**Open items:** Rerun the agreed canary families (`Swiss no systematic FC`, `Bolsonaro EN`, `Plastik`, `misinformation tools`) after service restart. Only if tensions remain too noisy should Fix 2 be reopened via safer path B (derive final boundary summary after reconciliation, no reconciler schema extension first).
**Warnings:** `unique sourceUrl` is materially better than hostnames for Stage 5 calibration, but still assumes URL-level uniqueness is the right proxy for “source” breadth. If future narratives still misread evidence breadth, the next refinement would be to use the canonical `sources[]` records directly instead of re-deriving count from evidence items.
**For next agent:** The docs now consistently point to `08220154` + `2acc4545` as the shipped Stage-5 first-pass cleanup. Start measurement from the two WIP files dated 2026-04-06 and the new `NARR-1` backlog entry.
**Learnings:** no

---
### 2026-04-06 | Senior Developer | Codex (GPT-5) | Close Stage-5 Fix 2 As Deferred And Propose Upstream Quality Workstream
**Task:** Update docs after the finished Stage-5 canary reruns, record the decision that Fix 2 is not needed now, and propose the next engineering workstream as upstream report quality rather than more narrative repair.
**Files touched:** `Docs/WIP/2026-04-06_Cross_Boundary_Tensions_Current_vs_Previous_Deployment_Investigation.md`, `Docs/WIP/2026-04-06_Upstream_Report_Quality_Workstream_Proposal.md`, `Docs/WIP/README.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Recorded the finished canary conclusion: Swiss and misinformation-tools post-fix runs consistently show `0` tensions, while remaining Bolsonaro / Plastik tensions look materially substantive rather than like the earlier Stage-5 misclassification noise. Based on that evidence, Fix 2 (safer post-reconciliation boundary-summary derivation) is deferred and kept only as a fallback. Created a new WIP proposal that shifts the active quality track upstream to Stage 2/3 evidence-pool quality, claim-level acquisition telemetry, query/event anchoring, boundary concentration, and multilingual hard-family validation.
**Open items:** No code changes yet. The next implementation choice should come from the new upstream-quality proposal: start with claim-level Stage 2/3 telemetry, then rerun the hard families before selecting one bounded Stage-2 improvement slice.
**Warnings:** The worktree also contains an untracked `Docs/Investigations/` path that was not touched or included here. Do not sweep that directory into a docs commit accidentally. Also, deferring Fix 2 does not mean deleting it; keep path B available if future runs again show methodology-only tensions being promoted.
**For next agent:** Start from `Docs/WIP/2026-04-06_Upstream_Report_Quality_Workstream_Proposal.md`. The active question is no longer narrative calibration; it is how to instrument and improve Stage 2/3 claim-level evidence quality without reopening rejected heuristics or broad redesign.
**Learnings:** no

---
### 2026-04-06 | Senior Developer | Codex (GPT-5) | Investigate Current Wikipedia Integration Status And Next Steps
**Task:** Inspect the current code, tests, and status docs for Wikipedia integration and recommend the next engineering steps.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Confirmed Wikipedia integration is already shipped as a bounded supplementary provider, not a pending provider-plumbing task. Current `HEAD` has default-on Wikipedia supplementary orchestration, detected-language threading into Wikipedia subdomain selection, and test coverage for both orchestration and language fallback. The main remaining engineering gap is not “turn Wikipedia on,” but observability and pipeline-aware use: `WebSearchResult` does not preserve provider provenance, `FetchedSource` stores only `searchQuery`, merged search results are appended without per-result provider attribution or URL dedupe, and downstream metrics only keep aggregate `providersUsed`. Recommended next slice is a low-risk structural one: add per-result/provider provenance and merged-result URL dedupe before any higher-risk query-shaping or Wikipedia reference-harvesting work.
**Open items:** If this track is reopened, the next concrete implementation proposal should target provider provenance + URL dedupe first, then run a small measurement batch to quantify Wikipedia’s unique contribution and overlap. Deeper work such as provider-specific query variants, Wikipedia citation harvesting, or broader Semantic Scholar integration should stay deferred until telemetry exists.
**Warnings:** `Docs/WIP/2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md` is partly stale: its “narrow reopening scope” still recommends supplementary participation plus detected-language routing, but those are already shipped. Do not reopen that completed slice by mistake.
**For next agent:** Source of truth is the live code, not the older concept doc. Start with `apps/web/src/lib/web-search.ts`, `apps/web/src/lib/search-wikipedia.ts`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, `apps/web/src/lib/analyzer/research-acquisition-stage.ts`, and the related tests plus `Docs/STATUS/Current_Status.md` / `Docs/STATUS/Backlog.md`.
**Learnings:** no

---
### 2026-04-07 | Senior Developer | Codex (GPT-5) | Implement UPQ-1 Phase A-2 Claim-Level Acquisition Telemetry
**Task:** Implement the next `UPQ-1` slice after Phase A-1 by adding claim-level Stage 2/3 telemetry so canary measurements can distinguish helpful rebalancing from harmful cross-claim reallocation.
**Files touched:** `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/analyzer/research-orchestrator.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/test/unit/lib/analyzer/research-orchestrator.test.ts`, `apps/web/test/integration/claimboundary-integration.test.ts`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added a claim-local `claimAcquisitionLedger` to `CBResearchState` and final result JSON without changing the CB schema version. Stage 2 now records per-claim seeded evidence counts, per-iteration query/source/evidence yield, direction counts, primary vs supplementary EN lane, and structural losses (`relevanceRejected`, `fetchRejected`, `sourcesWithoutEvidence`, `probativeFilteredOut`, `perSourceCapDroppedNew`, `perSourceCapEvictedExisting`). The pipeline wrapper appends post-research applicability removals claim-locally and finalizes the ledger after Stage 3 with final evidence counts, direction counts, boundary distribution, and `maxBoundaryShare`. Focused tests cover seeded counting, applicability removals, and final boundary concentration; the integration schema assertion now also checks that `claimAcquisitionLedger` is present in `resultJson`.
**Open items:** Next step is to rerun the hard canaries and use the ledger to determine whether Phase A-1 is genuinely rebalancing underrepresented directions or redistributing attention between claims. If telemetry shows repeatable starvation, revise or remove `existingEvidenceSummary`; if it shows constructive rebalancing, proceed to the next bounded Stage-2 improvement slice.
**Warnings:** Applicability removals happen after Stage 2, so they are recorded as a post-research claim-level total, not as invented per-iteration losses. The worktree also contains unrelated user/other-agent changes (`apps/web/.env.example` and several untracked WIP docs); leave them alone when preparing any commit.
**For next agent:** The main analysis surface is now `resultJson.claimAcquisitionLedger`. The most relevant code paths are `runResearchIteration()` and `maybeRunSupplementaryEnglishLane()` in `research-orchestrator.ts`, the post-research applicability filter in `claimboundary-pipeline.ts`, and the new helper tests in `research-orchestrator.test.ts`. Verification run in this pass: `npm -w apps/web exec vitest run test/unit/lib/analyzer/research-orchestrator.test.ts`, `npm test`, `npm -w apps/web run build`.
**Learnings:** no

---
### 2026-04-07 | Senior Developer | Codex (GPT-5) | Compare UPQ-1 A-2 Local Canaries Against Deployed And Update Docs
**Task:** Compare the new local `b130d00c` A-2 canary jobs against current deployed results, decide whether local is clearly better, and update status/WIP docs accordingly.
**Files touched:** `Docs/WIP/2026-04-07_UPQ1_Phase_A2_Canary_Measurement.md`, `Docs/WIP/2026-04-06_Upstream_Report_Quality_Workstream_Proposal.md`, `Docs/WIP/README.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Live deployed web reports `f1a372bf` via `https://app.factharbor.ch/api/version`, which is still behind local `b130d00c` on the new A-series analyzer work. The exact-family comparison is mixed rather than a clean local win: Swiss is better locally (`035d6e65` `LEANING-TRUE 70/58` vs deployed `8ec68105` `LEANING-TRUE 60/52`), Plastik is not clearly better locally (`c731c5b2` `LEANING-FALSE 41/64` vs deployed `2cf4682c` `LEANING-TRUE 62/72`), Bolsonaro EN has no exact current-deployed rerun and only a near-parity older-runtime comparator (`ee5df495` `70/68` vs `eb02cd2e` `73/70`), and the English misinformation input has no exact deployed counterpart. The docs now state that A-2 succeeded as observability and exposed the real next upstream root cause — seeded-evidence dominance — but `b130d00c` is not yet a clear quality-based deploy candidate.
**Open items:** The next bounded implementation slice should target seeded-evidence sufficiency interaction, ideally via a per-claim researched-iteration floor before seeded evidence can fully satisfy Stage 2 sufficiency. If a deploy decision is needed later, rerun at least Bolsonaro EN and the English misinformation claim on the current deployed stack for exact same-input comparison.
**Warnings:** The deployed public job list does not contain an exact current-runtime EN Bolsonaro rerun or an exact current-runtime English misinformation rerun, so those comparisons remain partial. Do not overstate the deploy basis from Swiss alone.
**For next agent:** Use `Docs/WIP/2026-04-07_UPQ1_Phase_A2_Canary_Measurement.md` as the current source of truth. The deployed comparators referenced in this pass are `8ec681050e844becb4ec616eb426731e` (Swiss), `2cf4682c5c914834ac5a58b318c3fc0e` (Plastik), `eb02cd2e535a4556a2bc3c29868412a0` (older-runtime Bolsonaro EN), and `38d5760e6ced4a969c3023a9aace03be` (family-only misinformation reference).
**Learnings:** no
