# Agent Outputs Log -- Active Index

This file is a **triage-weight index**, not a full log. Each entry is a 3-line summary
with a link to the full handoff file in `Docs/AGENTS/Handoffs/`.

Full protocol: `Docs/AGENTS/Policies/Handoff_Protocol.md`.
Archived entries: `Docs/ARCHIVE/Agent_Outputs_YYYY-MM.md` + `Docs/ARCHIVE/Handoffs/YYYY-MM/`.

---
### 2026-06-17 | Senior Developer | Codex (GPT-5) | Clean Main WIP + F2 Smoke + Reviewed Plan -- [Significant] [open-items: yes]
**For next agent:** Start with `Docs/WIP/2026-06-17_Clean_Main_Next_Cleanup_Plan.md`; first code target is Stage 4 citation/grounding integrity (`verdict-stage.ts`, `grounding-check.ts`), not a Stage 1 F2 rewrite. Fresh smoke jobs: `efa8c4e8`, `d8dcec2f`, `24e71d7e`.
→ Docs/AGENTS/Handoffs/2026-06-17_Senior_Developer_Clean_Main_WIP_F2_Plan.md

---
### 2026-06-17 | Senior Developer | Codex (GPT-5) | Project Cleanup Recovery -- [Standard] [open-items: yes]
**For next agent:** Clean baseline is `main` after recovery commits `a56fed6f4` and `209eca35d`, plus docs cleanup `688ef241` and this follow-up handoff/index cleanup. Verification already passed after the revert: targeted diff against baseline `6d76b28a4` was empty for analyzer/prompts/configs/target test, `npm test` passed, `npm -w apps/web run build` passed, and GitHub Main Guardrail CI run `27678603312` passed. Use the snapshot branch only as a reference, not as a merge source.
→ Docs/AGENTS/Handoffs/2026-06-17_Senior_Developer_Project_Cleanup_Recovery.md

---
### 2026-06-11 | Lead Developer | Claude (Fable 5) | F2 Surgical Per-Claim Contract Repair -- [Standard] [open-items: yes]
**For next agent:** Live validation is not done. Measure the expected report_damaged drop with `scripts/diag/checkworthy-unverified-census.cjs` after fresh runs on Captain-defined inputs, stop after 3 jobs if there is a clear regression, and verify production UCM contains claimboundary prompt 1.0.12 / `CLAIM_CONTRACT_SURGICAL_REPAIR` before relying on the repair.
→ Docs/AGENTS/Handoffs/2026-06-11_Lead_Developer_F2_Surgical_Contract_Repair.md

---
### 2026-06-09 | Lead Developer | Codex/Claude | Lead Developer Handoff — Reference Alignment Validator -- [Standard] [open-items: yes]
**For next agent:** Lead Developer Handoff — Reference Alignment Validator
→ Docs/AGENTS/Handoffs/2026-06-09_Lead_Developer_Reference_Alignment_Validator.md

---
### 2026-06-09 | Lead Developer | Codex/Claude | Lead Developer Handoff — Plastic Pointless Manual Alignment -- [Standard] [open-items: yes]
**For next agent:** Lead Developer Handoff — Plastic Pointless Manual Alignment
→ Docs/AGENTS/Handoffs/2026-06-09_Lead_Developer_Plastic_Pointless_Manual_Alignment.md

---
### 2026-06-09 | Lead Developer | Codex/Claude | Lead Developer Handoff — Bundesrat-Rechtskräftig Positive Local Alignment -- [Standard] [open-items: yes]
**For next agent:** Lead Developer Handoff — Bundesrat-Rechtskräftig Positive Local Alignment
→ Docs/AGENTS/Handoffs/2026-06-09_Lead_Developer_Bundesrat_Rechtskraftig_Positive_Local_Alignment.md

---
### 2026-06-09 | Lead Developer | Codex/Claude | Lead Developer Handoff — Bundesrat-Rechtskräftig Diverse Review Remediation -- [Standard] [open-items: yes]
**For next agent:** Lead Developer Handoff — Bundesrat-Rechtskräftig Diverse Review Remediation
→ Docs/AGENTS/Handoffs/2026-06-09_Lead_Developer_Bundesrat_Rechtskraftig_Diverse_Review_Remediation.md

---
### 2026-06-09 | Lead Developer | Codex/Claude | Lead Developer Handoff — Bolsonaro EN Manual Alignment -- [Standard] [open-items: yes]
**For next agent:** Lead Developer Handoff — Bolsonaro EN Manual Alignment
→ Docs/AGENTS/Handoffs/2026-06-09_Lead_Developer_Bolsonaro_EN_Manual_Alignment.md

---
### 2026-06-08 | Lead Developer | Codex/Claude | Lead Developer Handoff — Reference Dossier Frame/Dominance Extension -- [Standard] [open-items: yes]
**For next agent:** Lead Developer Handoff — Reference Dossier Frame/Dominance Extension
→ Docs/AGENTS/Handoffs/2026-06-08_Lead_Developer_Reference_Dossier_Frame_Dominance_Extension.md

---
### 2026-06-08 | Lead Developer | Codex/Claude | Lead Developer Handoff — Reference Dossier Frame Aggregation Mode -- [Standard] [open-items: yes]
**For next agent:** Lead Developer Handoff — Reference Dossier Frame Aggregation Mode
→ Docs/AGENTS/Handoffs/2026-06-08_Lead_Developer_Reference_Dossier_Frame_Aggregation_Mode.md

---
### 2026-06-08 | Lead Developer | Codex/Claude | Lead Developer Handoff — Bundesrat-Rechtskräftig Manual Alignment Pilot -- [Standard] [open-items: yes]
**For next agent:** Lead Developer Handoff — Bundesrat-Rechtskräftig Manual Alignment Pilot
→ Docs/AGENTS/Handoffs/2026-06-08_Lead_Developer_Bundesrat_Rechtskraftig_Manual_Alignment_Pilot.md

---
### 2026-06-05 | Lead Developer | Codex (GPT-5) | Report Quality Phase 0 + Phase 1 Scorer -- [Standard] [open-items: yes]
**For next agent:** Main command: `npx tsx scripts/measure-report-quality.ts`. Useful filters: `--family <slug>`, `--limit <n>`, `--build <prefix>`, `--compare <a> <b>`, `--json`. Verified full local DB dry-run: 514 exact benchmark reports, 0 parse failures, no live jobs/LLM calls. Full-run headline output at this point: C4 harm-adjusted mean 67.0, in-band 49%, average coarse cost 38.4 `llmCalls`, rich-cost coverage 99% over headline-eligible rows.
→ Docs/AGENTS/Handoffs/2026-06-05_Lead_Developer_Report_Quality_Phase0_Phase1_Scorer.md

---
### 2026-06-04 | Lead Developer + LLM Expert | Codex (GPT-5) | Independent Report-Quality Concept Review -- [Standard] [open-items: yes]
**For next agent:** - Start with the review brief, then patch the concept around sections 2, 4a-4c, 5a-5f, 6, 8, 9, and Appendix A. Cross-check against `apps/web/src/lib/analyzer/aggregation-stage.ts:130-267`, `types.ts:840-878`, `types.ts:1035-1075`, `types.ts:1376-1424`, `report-quality-expectations.json:35-88`, `benchmark-expectations.json:11-12`, and `scripts/diag/benchmark-band-era-check.cjs:27-45`.
→ Docs/AGENTS/Handoffs/2026-06-04_Lead_Developer_LLM_Expert_Report_Quality_Concept_Review.md

---
### 2026-06-04 | Lead Architect | Claude Code (Opus 4.8, 1M) | Report-Quality Measurement, Rating & Build-Comparison Concept -- [Standard] [open-items: yes]
**For next agent:** Start at `Docs/WIP/2026-06-04_Report_Quality_Measurement_And_Build_Comparison_Concept.md`. It is the measurement layer for the era-comparison study (`Docs/WIP/2026-06-04_Pipeline_Era_Comparison_Worktree_Study_Plan.md`, Phase 3). Phase 1 is implementable with zero spend over stored `ResultJson` using existing assets: `report-quality-expectations.json` (the checks), `best-commit-phase1.cjs` (severity-weighted 0–100 scoring already aligned to Q-code tiers), `checkworthy-unverified-census.cjs`, `benchmark-band-*.cjs`, `compare-evidence-pools.cjs`, `verdict-direction-instability.cjs`. Appendix A maps every component → `types.ts` field → Q-code → reference mode.
→ Docs/AGENTS/Handoffs/2026-06-04_Lead_Architect_Report_Quality_Measurement_Concept.md

---
### 2026-06-04 | Lead Architect | Claude Code (Opus 4.8, 1M) | Multi-Variant Pipeline Architecture + Spec + Plan -- [Standard] [open-items: yes]
**For next agent:** Start at Architecture §11 (review the 5 open questions) and the Plan's Phase 0 (registry + dispatcher, pure refactor, zero behavior change). The `pipelineVariant` field already exists end-to-end (`AnalyzeController` → `JobService.CreateJobAsync` → `JobEntity`); the hardcoded allowlist `["claimboundary"]` (~AnalyzeController.cs:57) is the first thing to replace with `listActiveVariantIds()`. Entry point to wrap: `runClaimBoundaryAnalysis` (`claimboundary-pipeline.ts:632`); config-load lines to redirect: ~638–642.
→ Docs/AGENTS/Handoffs/2026-06-04_Lead_Architect_Multi_Variant_Pipeline_Architecture.md

---
### 2026-06-02 | Lead Architect | Claude Opus 4.8 (1M) | Best-Commit & Report-Regression — Consolidation (resumes the paused investigation) -- [Standard] [open-items: yes]
**For next agent:** Resume `2026-06-01_Senior_Architect_BestCommit_Investigation_Pause.md` and consolidate: which commit/range produced the best ClaimBoundary reports; rate quality vs Captain's documented bar; investigate local+deployed job history; document regression-causing changes; get agent help; write a new findings doc.
→ Docs/AGENTS/Handoffs/2026-06-02_Lead_Architect_BestCommit_Regression_Consolidation.md

---
### 2026-06-01 | Unassigned | Codex (GPT-5) | Pipeline Telemetry Plan Source Refresh -- [Standard] [open-items: yes]
**For next agent:** Use the refreshed plan as the baseline. Do not treat `verdictDirection` telemetry as a proxy for broader rerun stability; that needs controlled rerun measurement. For D5, split `insufficient_evidence`, `insufficient_direct_evidence`, and applicability-classifier degradation under `qualityHealth` before using rates for architecture decisions.
→ Docs/AGENTS/Handoffs/2026-06-01_Unassigned_Pipeline_Telemetry_Plan_Source_Refresh.md

---
### 2026-06-01 | Senior Architect | Claude Opus 4.8 (1M) | Best-Commit Investigation — PAUSE & resumption handoff -- [Standard] [open-items: yes]
**For next agent:** Identify which commit (or commit-range) produced the best ClaimBoundary reports "so far," better than prior attempts. **Status: PAUSED at user request; likely to continue.** This handoff is the resumption point.
→ Docs/AGENTS/Handoffs/2026-06-01_Senior_Architect_BestCommit_Investigation_Pause.md

---
### 2026-06-01 | Lead Architect | Codex/Claude | Lead Architect — Quality-Lever Consolidation (2026-06-01) -- [Standard] [open-items: yes]
**For next agent:** Lead Architect — Quality-Lever Consolidation (2026-06-01)
→ Docs/AGENTS/Handoffs/2026-06-01_Lead_Architect_Quality_Lever_Consolidation.md
