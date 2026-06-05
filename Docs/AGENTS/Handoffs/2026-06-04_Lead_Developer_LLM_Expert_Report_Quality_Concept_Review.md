---
### 2026-06-04 | Lead Developer + LLM Expert | Codex (GPT-5) | Independent Report-Quality Concept Review
**Task:** Critical independent review of `Docs/WIP/2026-06-04_Report_Quality_Measurement_And_Build_Comparison_Concept.md` according to `Docs/WIP/2026-06-04_Report_Quality_Concept_Review_Brief.md`.
**Files touched:**
- `Docs/AGENTS/Handoffs/2026-06-04_Lead_Developer_LLM_Expert_Report_Quality_Concept_Review.md`
- `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:**
- Verdict: not Captain-ready as-is. The architecture is directionally sound, but it needs premise-level amendments before Captain is asked to decide section 9 weights/spend.
- Highest-risk premise findings: self-grading circularity is under-controlled; C1/C3 partial reference annotations are mis-framed as optional; N=5 is only a pilot/gross-regression sample, not enough for calibration or small deltas; Pareto dominance is unlikely to decide real build comparisons without a pre-registered default rule.
- Highest-risk mechanical finding: the proposed C4 aggregation-faithfulness recompute does not match active `aggregation-stage.ts`. Current Stage 5 uses centrality, four-level harm multipliers, confidence, triangulation, derivative, anchor, and probative factors; it excludes tangential and zero-citation insufficient claims. It does not visibly apply `contestationWeights` in `aggregateAssessment()`, despite those weights existing in `aggregation.ts` and config.
**Open items:**
- Amend the concept before Captain sign-off: independence taxonomy for metrics; mandatory cheap partial references; statistical test/power plan; default build decision rule; versioned adapters for era-schema drift; corrected aggregation-faithfulness formula.
- Verify whether the absence of contestation weighting in active `aggregateAssessment()` is intentional or code drift before building any C4 faithfulness metric.
**Warnings:**
- Do not implement `measure-report-quality.ts` straight from the current concept; the aggregation formula will produce false positives/negatives.
- Confidence-band tolerance is inconsistent: `report-quality-expectations.json` says Q-BE3 uses `noiseTolerancePct`, while `benchmark-band-*.cjs` scripts keep confidence strict and `benchmark-expectations.json` describes the tolerance as truth-percentage variance.
- `TIGERScore` and rubric-mode `explanationQualityCheck` are optional pipeline outputs; stored reports and older era arms may lack them.
**For next agent:**
- Start with the review brief, then patch the concept around sections 2, 4a-4c, 5a-5f, 6, 8, 9, and Appendix A. Cross-check against `apps/web/src/lib/analyzer/aggregation-stage.ts:130-267`, `types.ts:840-878`, `types.ts:1035-1075`, `types.ts:1376-1424`, `report-quality-expectations.json:35-88`, `benchmark-expectations.json:11-12`, and `scripts/diag/benchmark-band-era-check.cjs:27-45`.
**Learnings:** Not appended to `Role_Learnings.md`; no durable role-level rule beyond the concrete review findings.
