# V2 HighJump HJ80 Comparison Query Directness Result

## Classification

`PARTIAL_X7_HJ80_HYDROGEN_DIRECT_COMPARISON_REPORT_STILL_TOO_WEAK`

## Runtime And Job

- Implementation commit: `b320a3ab12fde36910e028ef1445561d8d728dd9`
- Job: `2e3c8862b6d042fcb3a07a4cbb063cf7`
- Input: `Using hydrogen for cars is more efficient than using electricity`
- Pipeline: `claimboundary-v2`
- Created git commit hash: `b320a3ab12fde36910e028ef1445561d8d728dd9`
- Executed Web git commit hash: `b320a3ab12fde36910e028ef1445561d8d728dd9`
- Status: `SUCCEEDED`
- Admin report markdown length: `9173` characters

## Local Verification Before Job

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`: passed, `10` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts --runInBand`: passed, `96` tests.
- `npm -w apps/web run build`: passed.
- `npm run debt:sensors`: `advisory_warn` only. Salient warnings remain existing V2 footprint, boundary-guard size, WIP docs volume, historical net-mechanism telemetry, and consolidation-marker warnings.
- `git diff --check`: passed.
- Runtime preflight before job: Web and API both reported `b320a3ab12fde36910e028ef1445561d8d728dd9`; git status was clean; runner route probe returned `400`; admin probe returned `200`.

## Result Evidence

- The run produced a complete internal V2 report, not a stop summary.
- Source-chain attribution showed:
  - Source Material status: `source_material_page_summary_completed`.
  - Source Material records: `9`.
  - Source Material kinds: `3` bounded linked-page records, `2` Wikimedia page summaries, `2` OpenAlex abstracts, `2` preview records.
  - W5 execution status: `hidden_evidence_item_extraction_completed`.
  - EvidenceItems: `4`.
  - Report writer status: `internal_report_writer_draft_created`.
- Verdict candidates:
  - `LEANING-FALSE`, truth `35`, confidence `62`.
  - `MIXED`, truth `48`, confidence `52`.
  - `UNVERIFIED`, truth `45`, confidence `48`.
- Public/default containment stayed closed:
  - public report markdown absent;
  - public verdict/truth/confidence absent;
  - result schema `4.0.0-cb-precutover`;
  - public cutover status `blocked_precutover`.

## Quality Assessment

This is a complete report and a useful information-yield step, but not a
hydrogen-family pass. The accepted hydrogen expectation is `FALSE` or
`MOSTLY-FALSE`, truth `5-25` with repository tolerance, confidence `65-85`.
HJ80 kept the top verdict at `LEANING-FALSE 35/62`, essentially the same
calibration as HJ79.

The evidence mix improved: the report now has a direct EV-vs-HFCV comparative
EvidenceItem and correctly treats hydrogen-side fuel-economy and production
context as limited or contextual. The remaining defect is narrower: either the
source-material path still needs stronger quantitative direct-comparison
material, or W7 is still over-dampening a direct qualitative comparative
opposition item because one-sided context exists. The next repair should choose
between those owners from this report evidence before spending another job.

## Information Yield

`same_quality_stop_repeated_with_new_direct_comparison_evidence`

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`.

Chosen option: amend existing query-planning prompt guidance for comparison
claims in place.

Rejected path and why:

- New provider/source machinery: not justified before checking whether query
  intent could produce better direct-comparison material.
- Report-writer recomputation: report writer should render supplied verdicts,
  not override W7.
- Deterministic comparator rules: would violate LLM-intelligence and
  multilingual rules.

What was removed/simplified: no code removed; no new mechanism added.

What was added: one topic-neutral query-planning prompt clause and contract-test
assertions.

Net mechanism count: unchanged.

Budget reconciliation: actual files matched the small-change plan: prompt,
prompt-contract test, package/result docs, ledger/status docs.

Verification: local verifier set passed before commit; live job ran against
clean committed runtime and produced a complete report.

Debt accepted and removal trigger: none.

Residual debt: the hydrogen report-quality owner is now narrowed but unresolved.

## Full Internal Report

# Internal Alpha Aggregation Narrative: Hydrogen vs. Electric Vehicle Efficiency

## Executive Summary

Direct evidence comparing EVs and HFCVs indicates EVs generally outperform hydrogen vehicles on efficiency (LEANING-FALSE, 35%, confidence 62%). One-sided HFCV efficiency data without EV baselines yields mixed assessment (MIXED, 48%, confidence 52%). Hydrogen production emissions context remains unverified for vehicle-level comparison (UNVERIFIED, 45%, confidence 48%). Overall evidence base is caveated with material gaps.

## Verdict: Direct Comparative Evidence

**Verdict Label:** LEANING-FALSE  
**Truth Percentage:** 35%  
**Confidence:** 62%

Direct comparative evidence concludes that EVs 'generally outperform' HFCVs on performance and cost efficiency [EVI_001_EV_HFCV_COMPARATIVE], directly contradicting the claim that hydrogen is more efficient than electricity. The evidence addresses the same compared entities and property domain, making it the most claim-aligned direct comparison available. Moderate confidence reflects that the evidence uses comparative language ('generally outperform') rather than providing specific quantitative efficiency thresholds, and probative value is marked medium.

### Caveats

- Evidence uses 'generally outperform' rather than providing specific quantitative efficiency metrics or thresholds.
- Probative value marked as medium; evidence strength marked as moderate.
- Evidence scope includes three limitations that may narrow applicability.
- Upstream sufficiency assessment is caveated, indicating material gaps or refinement needs in the broader evidence base.

### Material Uncertainty Signals

- Direct comparison evidence exists but does not provide detailed quantitative efficiency measurements for both technologies under identical conditions.
- The claim uses absolute categorical language ('more efficient') while evidence uses comparative language ('generally outperform'), leaving some ambiguity in threshold crossing.
- Upstream assessment status is 'caveated' rather than 'sufficient', signaling material uncertainty in the overall evidence sufficiency.

## Verdict: HFCV Efficiency Context

**Verdict Label:** MIXED  
**Truth Percentage:** 48%  
**Confidence:** 52%

HFCV efficiency data demonstrates high fuel economy metrics: simulation results show 2-3x gasoline and 1.66-2.0x hybrid efficiency [EVI_002_HFCV_FUEL_ECONOMY_SIMULATION], and the Toyota Mirai achieves 152 MPGe and 420+ mpg equivalent under hypermiling [EVI_003_MIRAI_EFFICIENCY_RECORD]. However, these boundaries provide one-sided hydrogen context without direct EV efficiency comparison. EVI_002 is marked 'mixed' claimDirection and 'limited' evidenceStrength. Without corresponding battery electric vehicle baselines, these metrics cannot independently verify the claim's comparative assertion.

### Caveats

- Evidence establishes HFCV efficiency in isolation but does not include direct comparison to battery electric vehicle efficiency.
- EVI_002 is simulation-based with four scope limitations; EVI_003 includes hypermiling conditions which are not representative of typical driving.
- EVI_002 marked as 'mixed' claimDirection and 'limited' evidenceStrength, indicating ambiguous or weak probative value.
- Comparison to gasoline and hybrid baselines does not resolve the hydrogen-vs-electricity comparison required by the selected claim.
- Upstream sufficiency assessment is caveated, indicating the evidence base has material gaps.

### Material Uncertainty Signals

- One-sided efficiency data for hydrogen vehicles without corresponding electric vehicle efficiency metrics prevents direct comparison.
- Simulation results and hypermiling conditions may not reflect real-world comparative performance.
- The selected claim requires a direct hydrogen-vs-electricity comparison; these boundaries provide only hydrogen-side context.
- Material uncertainty remains about whether EV efficiency is higher, lower, or comparable to the reported HFCV metrics.

## Verdict: Hydrogen Production Limitation

**Verdict Label:** UNVERIFIED  
**Truth Percentage:** 45%  
**Confidence:** 48%

Hydrogen production context shows that 98% of current hydrogen relies on steam methane reforming, which emits carbon dioxide, with alternative methods available but not yet dominant [EVI_004_HYDROGEN_PRODUCTION_EMISSIONS]. This addresses system-level efficiency and environmental impact rather than the direct vehicle-level efficiency comparison stated in the claim. Evidence is marked 'contextual' claimDirection and 'limited' evidenceStrength with low probative value. It raises material questions about well-to-wheel efficiency but does not independently establish the claim's truth or falsity without corresponding electricity generation data.

### Caveats

- Evidence addresses hydrogen production methods and emissions, not direct vehicle efficiency comparison.
- Marked as 'contextual' claimDirection and 'limited' evidenceStrength with low probative value.
- Does not establish corresponding electricity generation efficiency or emissions for comparison.
- Upstream sufficiency assessment is caveated, indicating broader evidence gaps.

### Material Uncertainty Signals

- Hydrogen production emissions context suggests potential system-level efficiency disadvantage, but does not quantify the impact on vehicle-level efficiency comparison.
- Alternative hydrogen production methods exist but are not yet dominant, leaving uncertainty about future efficiency scenarios.
- No corresponding electricity generation emissions or efficiency data provided to enable well-to-wheel comparison.
- The claim focuses on vehicle-level efficiency; production-method context is relevant but not dispositive.

## Boundary: Direct Comparative Efficiency

This boundary establishes direct comparison between electric vehicles and hydrogen fuel cell vehicles on performance and cost efficiency [EVI_001_EV_HFCV_COMPARATIVE]. It addresses the same compared entities and property domain as the selected claim, making it the primary direct-comparison boundary. The evidence concludes that EVs 'generally outperform' HFCVs, directly contradicting the claim that hydrogen is more efficient than electricity.

## Boundary: HFCV Fuel Economy Simulation

This boundary provides simulation-based fuel economy measurements for hydrogen fuel cell vehicles compared to gasoline internal combustion engines and hybrid electric vehicles [EVI_002_HFCV_FUEL_ECONOMY_SIMULATION]. It quantifies HFCV efficiency relative to conventional and hybrid powertrains but does not include direct comparison to battery electric vehicles, representing one-sided context on HFCV efficiency without addressing the EV-vs-HFCV comparative claim.

## Boundary: Toyota Mirai Real-World Efficiency

This boundary documents EPA and manufacturer-reported efficiency metrics for the Toyota Mirai hydrogen fuel cell vehicle, including standard EPA range and hypermiling performance data [EVI_003_MIRAI_EFFICIENCY_RECORD]. It establishes specific HFCV efficiency performance but does not include direct comparison to electric vehicles, providing one-sided context on hydrogen vehicle capability without addressing the comparative claim.

## Boundary: Hydrogen Production Methods and Emissions

This boundary provides contextual information about hydrogen production efficiency and emissions, including steam methane reforming dominance and alternative production pathways [EVI_004_HYDROGEN_PRODUCTION_EMISSIONS]. It does not directly address vehicle-level efficiency comparison between hydrogen and electric powertrains but is relevant to overall system efficiency assessment and well-to-wheel analysis.

## Limitations

- Direct EV efficiency baseline data is absent from one-sided HFCV boundaries, preventing independent verification of the comparative claim.
- Upstream evidence sufficiency is caveated, indicating material gaps in the broader evidence base.
- Hydrogen production emissions context does not include corresponding electricity generation data for well-to-wheel comparison.
- Simulation results and hypermiling conditions may not reflect real-world comparative performance.
- Evidence uses comparative language ('generally outperform') rather than absolute quantitative thresholds, leaving some ambiguity in claim verification.

## Evidence References

- **EVI_001_EV_HFCV_COMPARATIVE:** Direct comparison concluding EVs generally outperform HFCVs on performance and cost efficiency, contradicting the claim that hydrogen is more efficient than electricity.
- **EVI_002_HFCV_FUEL_ECONOMY_SIMULATION:** Simulation-based HFCV fuel economy metrics (2-3x gasoline, 1.66-2.0x hybrid) without direct EV comparison, providing one-sided hydrogen efficiency context.
- **EVI_003_MIRAI_EFFICIENCY_RECORD:** Toyota Mirai efficiency data (152 MPGe, 420+ mpg equivalent hypermiling) establishing HFCV capability without direct EV baseline for comparative assessment.
- **EVI_004_HYDROGEN_PRODUCTION_EMISSIONS:** Hydrogen production context showing 98% reliance on steam methane reforming with carbon emissions, relevant to system-level efficiency but not dispositive for vehicle-level comparison.
