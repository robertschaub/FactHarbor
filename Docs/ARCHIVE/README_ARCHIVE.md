# FactHarbor Documentation Archive

**Purpose**: This directory contains historical documents that are no longer actively referenced but may be useful for context or historical review.

**Last Updated**: 2026-02-22 (WIP consolidation — code reviews, quality map reviews, process docs archived)

---

## Content Extraction Log

The following documents had valuable content extracted and merged into active documentation:

| Archived Document | Extracted Content | Merged Into |
|-------------------|-------------------|-------------|
| `REVIEWS/Claim_Filtering_Enhancements_Implementation_Prompt.md` | Config options table | [Unified_Config_Management.md](../USER_GUIDES/Unified_Config_Management.md#54-pipelineconfig) |
| `REVIEWS/Terminology_Catalog_Five_Core_Terms.md` | Known Issues & Migration Status | [TERMINOLOGY.md](../REFERENCE/TERMINOLOGY.md#known-issues--migration-status) |
| `REVIEWS/Baseless_Tangential_Claims_Investigation_2026-02-02.md` | 7-Layer Defense System | [Evidence_Quality_Filtering.md](../ARCHITECTURE/Evidence_Quality_Filtering.md#2-multi-layer-claim-filtering-defense) |

---

## What's Archived

### WIP Consolidation (2026-02-22) — Code Reviews, Quality Map Reviews, Process Docs

**Description**: Archived 17 completed/superseded WIP files. All code review findings addressed in subsequent commits. Quality Map reviews consumed by Captain Decision doc. Process and execution docs completed.

**Code Reviews** (8 files — all reviewed, GO verdicts, findings addressed in code):
1. `Code_Review_23h_2026-02-19.md` — 46 findings across ~40 commits (Feb 18-19). Sprint closure verified (886 tests). All priority fixes committed.
2. `Code_Review_2026-02-21.md` — 53 findings across 24 commits. Key concerns (baseless enforcement, rangeReporting, calibration thresholds) addressed in Phase 1 A-1/A-2 execution.
3. `Code_Review_2026-02-21b.md` — 11 findings (1 CRITICAL: committed test blobs). R2-C1 addressed. Remaining items tracked in subsequent reviews.
4. `Code_Review_Pre_A3_Phase1_2026-02-21.md` — Pre-gate review for A-3. GO verdict. Gate executed.
5. `Code_Review_2026-02-22.md` — Report significance notice review. CR-M1/CR-M2 fixed in Plan_Pause pass.
6. `Code_Review_2026-02-22b.md` — runIntent + summarizeFailureCause review. All carried findings (CR-M1, CR-M2) fixed.
7. `Code_Review_B6_B7_B8_B5b_i18n_2026-02-22.md` — B-sequence + i18n review. GO verdict. B8-M1 (UCM cost documentation) addressed in commit `231ff13`.
8. `Code_Review_B4_Query_Strategy_2026-02-22.md` — B-4 pro/con query strategy review. B-4 implemented.

**Quality Map Reviews** (3 files — SUPERSEDED by `Decision_QualityMap_B4-B8_2026-02-22.md`):
9. `Review_QualityMap_R1_LLMExpert_2026-02-22.md` — R1 LLM Expert review
10. `Review_QualityMap_R2_LeadDev_2026-02-22.md` — R2 Lead Developer review
11. `Review_QualityMap_R3_LeadDev_Codex_2026-02-22.md` — R3 Lead Developer (Codex) delta review

**Process and Execution Docs** (6 files — DONE):
12. `Political_Bias_Mitigation_2026-02-19.md` — All 5 Stammbach/Ash actions complete. Superseded by execution-phase docs.
13. `GhPages_Alignment_Report_2026-02-21.md` — Viewer & deploy alignment completed (commits `9ef9a78`..`da84394`).
14. `Implementation_Review_Circles_Execution_2026-02-21.md` — Review circles process doc. Circles executed.
15. `Implementation_Review_Circles_Result_2026-02-21.md` — Circle results consumed by Pre-A3 review.
16. `CrossProvider_Calibration_Execution_Report_2026-02-21.md` — Superseded by `A3_CrossProvider_Gate1_Result_2026-02-22.md`.
17. `Review_Codex_84aad35_PreSwitch_Hardening.md` — Pre-switch hardening review. Good to go, no blockers.

**Remaining WIP (17 files — forward-looking):**
Architecture reference, cost strategy, test/tuning designs, runtime issues, calibration harness, claim fidelity, cross-provider separation, debate plans, decision logs, quality map, A3 gate result, cost optimization plan, pause status.

---

### WIP Consolidation (2026-02-21)

**Description**: Superseded review-prep packet archived after D1-D5 decisions were locked and execution shifted to active decision/spec documents.

**Files**:
1. `Review_Round_Packet_Calibration_Debate_2026-02-21.md` — Superseded by:
   - `Docs/WIP/Decision_Log_D1-D5_Calibration_Debate_2026-02-21.md`
   - `Docs/WIP/Phase1_Immediate_Execution_Spec_2026-02-21.md`
   - `Docs/WIP/Debate_System_Continuation_Plan_2026-02-21.md`

### Review & Audit Documents

**Location**: `REVIEWS/`

**Description**: Historical review documents (UCM, terminology migration, analysis quality, SR investigations). These are no longer actively edited but remain as reference and audit trail.

**Current Documentation**: Active guidance lives in `Docs/STATUS/` and `Docs/ARCHITECTURE/`.

---

### Status Changelogs & Reports

**Location**: `STATUS/`

**Description**: Historical status snapshots and changelogs that are superseded by current status/history docs.

**Examples**:
1. `Changelog_v2.6.38_to_v2.6.40.md`
2. `Changelog_v2.6.41_Unified_Config.md`
3. `Documentation_Inconsistencies.md`

---

### Historical Reports & Summaries

**Location**: Root of `ARCHIVE/`

**Examples**:
1. `FactHarbor POC1 Architecture Analysis.md`
2. `WORKSHOP_REPORT_2026-01-21.md`
3. `Mermaid_Fix_Summary.md`
4. `Analysis_Quality_Issues_2026-02-13.md`
5. `Report_Issues_Review_and_Fix_Plan_2026-02-13.md`
6. `Phase2_Prompt_Approval_Patch_2026-02-13.md`

### WIP Consolidation (2026-02-13)

**Description**: Documents archived during WIP consolidation — completed proposals, superseded reports, and historical working documents.

**Files**:
1. `Phase1_Implementation_Plan.md` - Jaccard Phase 1 implementation spec (DONE — 14/14 tests, all items complete; tracked in Jaccard v2)
2. `Jaccard_Similarity_AGENTS_Violations.md` - v1 violations report (SUPERSEDED — replaced by v2 after reviewer corrections)
3. `Quality Issues Investigations and Plan.md` - Multi-agent raw investigation findings (SUPERSEDED — synthesized into Quality_Issues_Consolidated_Implementation_Plan.md)
4. `WIP_Documentation_Audit_2026-02-12.md` - WIP cleanup audit (DONE — actions executed in Feb 12-13 cleanups; remaining "Triple-Path" refs added to Backlog)
5. `POC_Approval_Readiness_Assessment_2026-02-07.md` - POC readiness snapshot from Feb 7 (STALE — findings captured in Current_Status.md known issues)
6. `Reporting_Improvement_Exchange.md` - 30-session paired-programming exchange log (DONE — all sessions complete; outcomes reflected in code and status docs)
7. `Generic_Evidence_Quality_Principles.md` - 5 evidence quality principles (DONE — all 5 principles implemented in evidence-filter.ts, types.ts, prompts, orchestrated.ts)

### Phase 8/9 Pipeline Quality Consolidation (2026-02-15)

**Description**: Documents archived after Phase 8 completion and Phase 9 approval. All Phase 8 work is implemented (6 commits). Phase 9 proposal is approved and Phase 9a is implemented. Forward-looking content consolidated into `Docs/REVIEWS/Phase9_Pipeline_Status_and_Plan_2026-02-15.md`.

**From REVIEWS/** (Phase 8 review cycle — complete):
1. `Phase8_Systematic_Analysis_2026-02-15.md` — Funnel data analysis, before/after comparisons (DONE — findings acted on)
2. `Phase8_Pipeline_Redesign_Proposal_2026-02-15.md` — Phase 8 proposal with 3 changes + UCM params (DONE — all implemented)
3. `Phase8_Senior_Developer_Review_2026-02-15.md` — §1-12: Phase 8 review + post-run analysis. §13: Phase 9 Senior Dev review (DONE — all conditions satisfied/accepted)
4. `Code_Review_2026-02-14.md` — Pre-Phase 8 code review (SUPERSEDED by Phase 8 analysis)
5. `Review_Packet_Summary_2026-02-15.md` — Review cycle summary (DONE — review complete)

**From WIP/** (pipeline quality phases — superseded by Phase 8/9):
1. `Pipeline_Quality_Investigation_2026-02-13.md` — Phase 1-4 hub document (SUPERSEDED)
2. `Pipeline_Quality_Investigation_Report_SeniorDeveloper_ClaudeCode.md` — Implementation log (DONE)
3. `Pipeline_Quality_Phase5_Research_Budget_and_Calibration.md` — Phase 5 work (DONE)
4. `Pipeline_Quality_Phase6_Verdict_and_HarmPotential.md` — Phase 6 investigation (SUPERSEDED by Phase 8/9)
5. `Pipeline_Quality_Phase7_Post_Fix_Validation.md` — Phase 7 validation (SUPERSEDED by Phase 8 comparison data)
6. `Phase4_Context_ID_Stability_Handoff.md` — Context ID fix handoff (DONE — commit 61050da)
7. `Quality_Issues_Consolidated_Implementation_Plan.md` — Quality plan (DONE)
8. `Consolidated_Report_Quality_Execution_Plan.md` — Report quality plan (SUPERSEDED)
9. `Jaccard_Similarity_AGENTS_Violations_v2.md` — AGENTS violations audit (DONE)

### ClaimBoundary Architecture Consolidation (2026-02-16)

**Description**: Documents archived during ClaimBoundary consolidation. The ClaimBoundary pipeline redesign (replacing AnalysisContext with evidence-emergent ClaimBoundary) supersedes all old pipeline improvement plans. The single definitive implementation reference is `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md`.

**ClaimBoundary design process** (DONE — all decisions closed, integrated into architecture doc):
1. `ClaimBoundary_Brainstorming_Ideas_2026-02-16.md` — 8 brainstorming ideas assessed by 3 reviewers (DONE — decisions D1-D9 made)
2. `Decision_Memo_ClaimBoundary_2026-02-16.md` — 9 architectural decisions with rationale (DONE — all integrated into architecture doc header)
3. `ClaimBoundary_LeadArchitect_Handoff_2026-02-16.md` — Captain-to-Lead-Architect handoff with implementation details (DONE — Round 1 + Round 2 updates executed)
4. `Captain_Comments_Consolidated_2026-02-16.md` — 10 Captain comments with analysis and options (DONE — all 10 addressed in architecture doc Round 2)

**Old pipeline improvement plans** (SUPERSEDED by ClaimBoundary clean break):
5. `Pipeline_Phase2_Plan.md` — Phase 2 advanced orchestration for AnalysisContext pipeline (SUPERSEDED — features absorbed into ClaimBoundary design)
6. `Efficient_LLM_Intelligence_Migration_Plan.md` — 19 deterministic function migrations (SUPERSEDED — ClaimBoundary code is LLM-first from scratch; Phase 0 was done)
7. `LLM_Prompt_Improvement_Plan.md` — Anti-hallucination prompt gaps F1-F9 (SUPERSEDED — all CB prompts designed from scratch per architecture doc)
8. `Report_Evidence_Calculation_Review_2026-02-05.md` — Evidence calculation design decisions (SUPERSEDED — pending decisions addressed in CB §8.5 aggregation + triangulation scoring)
9. `Generic Evidence Quality Enhancement Plan.md` — Evidence quality phases 1-3 (SUPERSEDED — solved principles carried forward in CB; remaining phases target old pipeline)
10. `Documentation_Cleanup_Plan.md` — .md + xWiki cleanup for old pipeline docs (SUPERSEDED — CB requires complete doc rewrite; 16 xWiki pages were updated before supersession)

**Captain-decided archives:**
11. `Anti_Hallucination_Strategies.md` — Risk matrix R1-R10 + mitigations M1-M10 (principles absorbed into CB design; generic principles in AGENTS.md)
12. `LLM_Call_Optimization_Goals_Proposal.md` — Goal framework + guardrails (SUPERSEDED — guardrails in AGENTS.md; specific targets for old pipeline)

---

### WIP Consolidation (2026-02-19) — POC Closure

**Description**: WIP cleaned down to forward-looking Alpha work only. All completed assessments, delivered plans, and resolved audits archived. The FactHarbor POC is declared complete (`v1.0.0-poc`).

**Completed assessments and audits** (DONE — findings implemented or decisions made):
1. `UCM_Configuration_Audit_2026-02-17.md` — All 24 CB pipeline parameters added to UCM (✅ 2026-02-17)
2. `UCM_AutoForm_Schema_Driven_Config_UI_2026-02-14.md` — Design complete, feature on `feature/ucm-autoform` awaiting code review (Backlog item remains)

**Schema validation analysis group** (emergency fixes implemented; remaining items tracked in Backlog):
3. `LLM_Schema_Validation_Failures_Analysis.md` — Root cause analysis for Pass 2 validation failures
4. `LLM_Expert_Review_Schema_Validation.md` — 9 prioritized LLM Expert recommendations
5. `Lead_Architect_Schema_Assessment_2026-02-18.md` — Architectural decisions and Gate 1 finding
6. `Schema_Validation_Fix_Multi_Agent_Plan.md` — Multi-agent 4-phase implementation plan
7. `Schema_Validation_Implementation_Status_2026-02-18.md` — Status tracker (remaining: Gate 1 rebuild #4, telemetry #5, Pass 2 split #6 — see Backlog)

**Code quality** (findings tracked in Backlog):
8. `QA_Review_Findings_2026-02-12.md` — Priority 1: 879 lines dead code across 7 files; Priority 2: config migration to UCM (Backlog item "Dead Code Removal" remains)

**Future research** (design complete, far-future work — tracked in Backlog Future Research):
9. `Shadow_Mode_Architecture.md` — Self-learning prompt optimisation system (requires 3+ months production data)
10. `Vector_DB_Assessment.md` — Vector DB assessment; recommendation: stay SQLite-only initially

**Architecture decisions made — defer agreed**:
11. `Storage_DB_Caching_Strategy.md` — Database/caching strategy; decisions deferred to Alpha (SQLite stays, PostgreSQL migration timing TBD)

**Remaining WIP (kept forward-looking):** `ClaimBoundary_Pipeline_Architecture_2026-02-15.md` (definitive reference), `Lead_Developer_Companion_Claim_Fidelity_2026-02-18.md` (Phases 3+4 pending), `API_Cost_Reduction_Strategy_2026-02-13.md` (Alpha priority), `TestTuning_Mode_Design/UI_2026-02-17.md` (Alpha feature), `Runtime_Issues_Analysis_2026-02-17.md` (Alpha input).

---

### Post-CB Implementation Consolidation (2026-02-18)

**Description**: Documents archived after CB pipeline v1.0 completion and code review sprint. CB implementation is fully operational (all stages, 853 tests). Code review sprint (45 findings) and search hardening features are complete and committed.

**CB implementation process** (DONE — all phases complete, pipeline operational):
1. `CB_Execution_State.md` — Phase-by-phase execution tracker (all phases 5a-5k complete)
2. `CB_Implementation_Plan_2026-02-17.md` — Stage implementation plan (DONE)
3. `CB_Implementation_Plan_REVIEW_PROMPT.md` — Review prompt for implementation plan (process doc)
4. `CB_Phase_Prompts.md` — Phase-specific prompt drafts (DONE — prompts in `claimboundary.prompt.md`)
5. `CB_Implementation_Prompts.md` — Agent prompt templates for implementation (process doc)
6. `CB_Review_Fixes_2026-02-17.md` — First-round review fixes (DONE)
7. `CB_Codex_Review_Fixes_2026-02-17.md` — Codex review fixes round 1 (DONE)
8. `CB_Codex_Review_Fixes_3_2026-02-17.md` — Codex review fixes round 3 (DONE)
9. `CB_Codex_Review_Fixes_4_2026-02-17.md` — Codex review fixes round 4 (DONE)
10. `CB_Codex_Review_Fixes_5_2026-02-17.md` — Codex review fixes round 5 (DONE)

**Code review sprint** (DONE — all 5 phases, 45 findings fixed):
11. `Code_Review_Fixes_2026-02-18.md` — Main tracker: phases, commits, tests (DONE)
12. `Code_Review_Fixes_Agent_Prompts.md` — Agent prompts for each phase (process doc)

**Search hardening** (DONE — cache, multi-provider, circuit breaker shipped):
13. `Search_Cache_MultiProvider_Implementation.md` — Cache + multi-provider design (DONE — committed)
14. `Search_Provider_Testing_Integration.md` — Test-config and health banner integration (DONE)
15. `Brave_Search_Setup.md` — Brave Search API quick-start guide (implementation done; key configured via `.env.local`)

**Feature implementations** (DONE):
16. `Job_Cancellation_Delete_Implementation.md` — Job cancel/delete plan (DONE — implemented)

**Superseded analysis** (SUPERSEDED):
17. `Pass2_Claim_Quality_Issues_2026-02-18.md` — LLM Expert analysis of impliedClaim overexpansion (SUPERSEDED by `Lead_Developer_Companion_Claim_Fidelity_2026-02-18.md` which covers the same issue with a fuller fix plan)

---

### Source Reliability Service Reviews

**Location**: `Source_Reliability_Service_Reviews/` (Note: Files are at root of ARCHIVE for now)

**Description**: Historical review documents from the Source Reliability Service implementation (v2.6.17-v2.6.33 timeframe). These documents tracked the development, architecture review, security review, and implementation validation of the source reliability scoring system.

**Files**:
1. `Source_Reliability_Service_Proposal.md` - Initial proposal for source reliability system
2. `Source_Reliability_Service_Proposal.LeadDevReview.md` - Lead developer review of proposal
3. `Source_Reliability_Service_Architecture_Review.md` - Architecture review
4. `Source_Reliability_Service_Final_Review.md` - Final pre-implementation review
5. `Source_Reliability_Service_Security_Review.md` - Security considerations
6. `Source_Reliability_Service_Project_Lead_Review.md` - Project lead approval
7. `Source_Reliability_Implementation_Review.md` - Post-implementation review
8. `Source_Reliability_Review_Summary.md` - Summary of all reviews

**Why Archived**:
- Implementation complete (v2.6.33)
- System is operational and documented in current architecture docs
- Reviews were part of development process, no longer needed for day-to-day reference
- Kept for historical context and audit trail

**Current Documentation**: See `Docs/ARCHITECTURE/Source_Reliability.md` for active documentation

---

### Documentation Cleanup (2026-02-19)

**Description**: Historical content archived during comprehensive documentation cleanup. Criteria: archive anything that describes only completed/removed work with no future relevance. Split pages containing both current and historical content.

**MD archives** (STATUS/):
1. `STATUS/Documentation_Updates_2026-02-03.md` — Feb 2026 documentation initiative completion report. References files that no longer exist (`Pipeline_TriplePath_Architecture.md`, `Quality_Gates_Reference.md`, `Context_and_EvidenceScope_Detection_Guide.md`). Pure historical record.
2. `STATUS/Current_Status_arch.md` — Historical changelog extracted from `Current_Status.md`: entries v2.10.2 (2026-02-04) and earlier. Split boundary: 2026-02-13 (everything before the current sprint kept in archive).

**xWiki archives** (in `Docs/xwiki-pages-ARCHIVE/`):
3. `FactHarbor/Product Development/Specification/Architecture/Deep Dive/Orchestrated Pipeline/WebHome.xwiki` — Full Orchestrated Pipeline reference page. Pipeline removed in v2.11.0 (2026-02-17); ~18,400 lines of code deleted. All content is historical.
4. `FactHarbor/Product Development/Specification/Architecture/Deep Dive/Pipeline Variants/WebHome_arch.xwiki` — Orchestrated-era sections extracted from the Pipeline Variants page: variant comparison table, decision tree, canonical payload spec, UCM config with orchestrated as default, performance data, and navigation links. The live Pipeline Variants page was updated to reflect ClaimAssessmentBoundary as the current default.

---

### Phase 9 Pipeline Quality (2026-02-19) — Superseded by CB Pipeline

**Description**: Phase 9 work was abandoned when the ClaimAssessmentBoundary pipeline replaced the Orchestrated architecture in v2.11.0. The issues Phase 9 targeted (context explosion, budget starvation) no longer apply under the CB design.

**Files**:
1. `Phase9_Pipeline_Status_and_Plan_2026-02-15.md` — Phase 9a validation results and Phase 9b plan (SUPERSEDED — CB pipeline solved the underlying AnalysisContext issues)
2. `Phase9_Research_Loop_Proposal_2026-02-15.md` — Research loop redesign proposal (SUPERSEDED — never implemented; CB pipeline uses claims-driven research)

---

## Archive Policy

### When to Archive

Documents should be moved to ARCHIVE when:
1. ✅ Implementation is complete and stable
2. ✅ Active documentation exists for the feature
3. ✅ Document is no longer referenced by current development
4. ✅ Document is useful for historical context but not operational needs

### When NOT to Archive

Keep documents in main directory if:
1. ❌ Actively referenced by current development
2. ❌ Part of onboarding or daily operations
3. ❌ Required for understanding current architecture
4. ❌ Updated in last 3 months (unless superseded)

### Retrieval

If you need to reference archived documents:
- Check this README for file list and locations
- All archived documents remain in git history
- Links from active docs to archived docs are updated to include `/ARCHIVE/` path

---

## Related Directories

- **`Docs/ARCHITECTURE/`** - Current architecture documentation
- **`Docs/ARCHIVE/REVIEWS/`** - Archived reviews and audits
- **`Docs/ARCHIVE/STATUS/`** - Archived changelogs and resolved audits
- **`Docs/STATUS/`** - Current status and known issues
- **`Docs/REFERENCE/`** - Reference documentation and guides

---

**Archive Maintainer**: Plan Coordinator
**Last Review**: 2026-02-19 (Documentation Cleanup — Historical Content Archival)
**Next Review**: Quarterly (or when major features complete)
