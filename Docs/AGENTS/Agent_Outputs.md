# Agent Outputs Log -- Active Index

This file is a **triage-weight index**, not a full log. Each entry is a 3-line summary
with a link to the full handoff file in `Docs/AGENTS/Handoffs/`.

Full protocol: `Docs/AGENTS/Policies/Handoff_Protocol.md`.
Archived entries: `Docs/ARCHIVE/Agent_Outputs_YYYY-MM.md` + `Docs/ARCHIVE/Handoffs/YYYY-MM/`.

---
### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7 Final Reviewer Constraints Folded Into Plan -- [Standard] [open-items: yes]
**For next agent:** A final external reviewer agreed with the Shape B direction but required stricter slice-1 constraints. `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md` now reflects that Shape B is a go only with explicit mode separation, full salience persistence, durable recovery attribution, validator precedence cleanup, and typed anchor mapping in the first implementation slice.
→ Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md

---
### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7 Docs Corrected For Shape B Start Signal -- [Standard] [open-items: yes]
**For next agent:** The Phase 7 docs were corrected to separate three things clearly: (1) the first deep review’s still-valid architectural reasoning, (2) the blockers materially fixed in `61815f41`, and (3) the remaining honesty gap that the current E2 note is not a locally reproduced committed-build statistical closeout. Current architect position: proceed to Phase 7b / Shape B behind a feature flag, but do not overstate the current measurement note.
→ Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md

---
### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7 Working Baseline Consolidated Through Step 4 -- [Standard] [open-items: yes]
**For next agent:** `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md` was rewritten into a shorter Phase 7 working baseline for humans and agents. It now carries the durable Step 1 summary, Step 2 root-cause summary, Step 3 root fixes/specification, and Step 4 implementation/verification plan. Code/prompt-specific detail remains in `Docs/WIP/2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md`. Next step is the hardened-surface E2 measurement report.
→ Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md

---
### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7 Code / Prompt Deep Review And Debate Consolidation -- [Standard] [open-items: yes]
**For next agent:** Use `Docs/WIP/2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md` as the current code/prompt review note for Phase 7. It consolidates direct code inspection plus a two-reviewer debate and concludes that E2 is still worth measuring, but only as an anchor-recognition audit unless the measurement surface is tightened.
→ Docs/WIP/2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md

---
### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7 Step 2 Issues / Root Causes Consolidation -- [Standard] [open-items: yes]
**For next agent:** `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md` now contains both Step 1 and Step 2. The summary tables were rewritten after two reviewer-agent challenges: explicit `Pain/Need/Expectation`, explicit provenance, explicit confidence/caveat, plus Step 2 root-cause tables separating proven causes from hypotheses. Next step is Step 3: root fixes and specification.
→ Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md

---
### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7 Step 1 Pains / Issues / Needs Consolidation -- [Standard] [open-items: yes]
**For next agent:** Use `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md` as the Step 1 source of truth. It consolidates current HEAD job evidence, direct user statements preserved in docs, and the earlier Bundesrat expectation trail (`094e88fc`, `0afb2d88`, `b843fe70`) while explicitly separating proven facts from inference. Next step is Step 2: root causes and specification ambiguities.
→ Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md

---
### 2026-04-13 | LLM Expert | Claude Code (Opus 4.6) | Trim root AI-instruction files -- [Significant] [open-items: yes]
**For next agent:** Full context in `Docs/AGENTS/Handoffs/2026-04-13_LLM_Expert_Root_Instruction_File_Trim.md`. Code Reviewer approved with one staging fix and two non-blocking notes. To extend handoff protocol, edit `Docs/AGENTS/Policies/Handoff_Protocol.md` directl...
→ Docs/AGENTS/Handoffs/2026-04-13_LLM_Expert_Root_Instruction_File_Trim.md

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

### 2026-04-01 | Senior Developer | Codex (GPT-5) | Stage 1 Narrow Hardening Implementation -- [Standard] [open-items: yes]
**For next agent:** Treat this as a narrow Stage-1 patch on top of the Apr 1 rollback baseline. If continuing, run live SRG/SRF/Plastik validation first; do not expand this into a broader Stage-1 package. If needed later, clean up the noisy mock sequencing in the two...
→ Docs/AGENTS/Handoffs/2026-04-01_senior_developer_stage_1_narrow_hardening_implementation.md

---

### 2026-04-14 | Lead Developer + Lead Architect | Codex (GPT-5) | Phase 7b Slice 1 Mode Separation + Persistence Hardening -- [Standard] [open-items: yes]
**For next agent:** `ba150b4d` consolidated the Phase 7 docs; this follow-up slice hardens the runtime surface for Shape B. `salienceCommitment` now has explicit `audit` vs `binding` mode in config/defaults, the full salience status is persisted on success and disabled paths, and final contract-summary refresh preserves `stageAttribution`. Next step is to wire binding-mode anchors into Pass 2/validator behavior behind the new mode flag without removing the existing V5 scaffold.
Warnings: Current E2 remains audit-only at runtime; binding mode is config-visible and persisted, but not yet consumed by Pass 2. Do not claim Shape B is active until the next slice lands. `npm -w apps/web run build` reseeded prompt/config storage as part of postbuild; that is expected.
Learnings: The persisted interface being optional masked a local runtime type hole; using `NonNullable<CBClaimUnderstanding["salienceCommitment"]>` in Stage 1 keeps compile-time expectations honest. Stage attribution after final revalidation must be preserved explicitly because the refreshed summary replaces the prior object.

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
