# V2 HighJump HJ81 Categorical Comparison Verdict Calibration Result

## Classification

`REGRESSION_X7_HJ81_PROMPT_OVERREACH_ADJACENT_COMPARATOR_TRUE_SIDE`

## Runtime And Job

- Implementation commit: `75f92a572994663262262f7050cc0ccc65687348`
- Job: `1d46faadc2a74ff490172d3fd545faab`
- Input: `Using hydrogen for cars is more efficient than using electricity`
- Pipeline: `claimboundary-v2`
- Created git commit hash: `75f92a572994663262262f7050cc0ccc65687348`
- Executed Web git commit hash: `75f92a572994663262262f7050cc0ccc65687348`
- Status: `SUCCEEDED`
- Admin report markdown length: `7757` characters

## Local Verification Before Job

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`: passed, `10` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts --runInBand`: passed, `96` tests.
- `npm -w apps/web run build`: passed before the job.
- `npm run debt:sensors`: `advisory_warn` only. Salient warnings remain existing V2 source/test footprint, boundary-guard size, WIP docs volume, historical net-mechanism telemetry, and consolidation-marker warnings.
- Runtime preflight before job: Web and API both reported `75f92a572994663262262f7050cc0ccc65687348`; git status was clean; runner route probe returned `400`; admin probe returned `200`.

## Result Evidence

- The run produced a complete internal V2 report, not a stop summary.
- Source-chain attribution showed:
  - Source Material status: `source_material_page_summary_completed`.
  - Source Material records: `9`.
  - W5 execution status: `hidden_evidence_item_extraction_completed`.
  - EvidenceItems: `4`.
  - Report writer status: `internal_report_writer_draft_created`.
- Public/default containment stayed closed:
  - public report markdown absent;
  - public verdict/truth/confidence absent;
  - result schema `4.0.0-cb-precutover`;
  - public cutover status `blocked_precutover`.

## Quality Assessment

This is a full internal report but a regression. The primary report verdict is
`MOSTLY-TRUE`, truth `74`, confidence `72`, because the report treated
hydrogen-vs-conventional and hydrogen-vs-hybrid source material as direct
support for the selected hydrogen-vs-electricity claim. That violates the
accepted hydrogen family expectation and contradicts the comparator-identity
constraints added in earlier HighJump repairs.

Per the HJ81 package stop condition, this is prompt overreach. The attempted W7
categorical-comparison calibration paragraph was reverted after the live result.
The active source state should return to the HJ80 baseline, where the report was
too weak but at least false-side. The next owner is source-material,
query-planning, or W5 extraction comparator identity: the chain must not admit
or over-promote adjacent-comparator material as if it answered the selected
claim.

## Information Yield

`new_failure_with_prompt_overreach`

## Failed-Attempt Recovery

Prior attempt: `revert`.

Reason: HJ81 validation contradicted the hypothesis. The W7 prompt allowance was
intended to strengthen direct same-comparison evidence, but the live report used
it to over-promote adjacent comparator material.

Kept: HJ80 query-planning direct-comparison repair remains the active source
baseline.

Reverted: the HJ81 W7 categorical-comparison paragraph and its prompt-contract
assertions.

Next owner: no-live source-chain inspection and a narrow repair for comparator
identity before another hydrogen job.

## Post-Revert Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`: passed, `10` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts --runInBand`: passed, `96` tests.
- `npm -w apps/web run build`: passed after stopping the Web dev server and clearing generated `.next` cache; the first post-job build failed only because `.next/dev/types/routes.d.ts` was a corrupted generated dev-server artifact.

## Full Internal Report

# Internal Alpha Report: Hydrogen FCEV Efficiency vs. Conventional Vehicles

## Executive Summary

Direct simulation evidence supports that hydrogen FCEVs are more efficient than conventional ICE vehicles (2-3x fuel economy advantage), yielding a **MOSTLY-TRUE** verdict at 74% truth and 72% confidence. However, well-to-wheel efficiency varies widely (6.8%-29.2%) depending on hydrogen production method, with current common practice (steam methane reforming) at the lower end. This creates a **MIXED** verdict (50% truth, 58% confidence) when measurement frame and production assumptions are considered. The claim's categorical framing without specifying tank-to-wheel vs. well-to-wheel leaves material ambiguity unresolved.

## Verdict 1: Direct FCEV Efficiency Advantage (MOSTLY-TRUE)

### Finding

Direct evidence establishes that hydrogen FCEVs are more efficient than conventional ICE vehicles. EVI_001 asserts this efficiency advantage and notes zero harmful tailpipe emissions [EVI_001_AFDC_FCEV_EFFICIENCY]. EVI_002 quantifies the advantage through simulation results: FCEV equivalent fuel economy is 2-3 times higher than gasoline ICE vehicles of the same weight and road load, and 1.66-2.0 times higher than hybrid electric vehicles [EVI_002_OPENALEX_FCEV_HEV_COMPARISON].

### Rationale

Both items directly address the same comparison (hydrogen/FCEV vs. conventional ICE) on the same property (efficiency) and support the claim's categorical assertion. The **MOSTLY-TRUE** label reflects that:

- Evidence is simulation-based rather than empirical fleet data [EVI_001_AFDC_FCEV_EFFICIENCY, EVI_002_OPENALEX_FCEV_HEV_COMPARISON].
- The claim does not specify measurement frame (tank-to-wheel vs. well-to-wheel); cited evidence appears to use tank-to-wheel or drivetrain efficiency.
- No empirical operational efficiency data from deployed FCEV fleets is cited.
- Upstream sufficiency assessment is caveated, indicating potential gaps in evidence scope or source diversity.

### Material Uncertainty

Simulation-based evidence introduces model assumption uncertainty not fully detailed in the supplied statements. The claim's categorical assertion ('more efficient') lacks a specified threshold or measurement frame, creating ambiguity about whether tank-to-wheel, well-to-wheel, or other efficiency metrics are intended.

---

## Verdict 2: Well-to-Wheel Efficiency Context (MIXED)

### Finding

Well-to-wheel efficiency context introduces material ambiguity that qualifies the direct efficiency claim. EVI_003 presents a wide range of WTW efficiency for hydrogen FCEVs (6.8%-29.2%) with explicit dependence on hydrogen production method [EVI_003_LU_2022_WTW_EFFICIENCY_RANGE]. EVI_004 explains that this range depends on critical assumptions: the maximum efficiency assumes renewable hydrogen production, while the minimum assumes steam methane reforming, which is currently the most common method [EVI_004_WTW_METHODOLOGY_COMPLEXITY].

### Rationale

When the claim is interpreted as a categorical assertion without specifying production method or measurement frame, the wide range and the fact that current common practice (steam methane reforming) produces lower WTW efficiency create unresolved tension with the direct tank-to-wheel support. The **MIXED** label reflects this ambiguity: the claim's truth depends materially on measurement frame and hydrogen production assumptions not specified in the claim itself.

EVI_004 also contextualizes that 'ICE vehicles are not necessarily the most polluting' and notes that comparisons depend on assumption sets across vehicle types [EVI_004_WTW_METHODOLOGY_COMPLEXITY], indicating that the efficiency comparison may vary depending on the full lifecycle and production assumptions.

### Material Uncertainty

The claim's categorical assertion does not specify measurement frame (tank-to-wheel vs. well-to-wheel), and the evidence shows these frames produce materially different conclusions. Hydrogen production method is a critical variable; current common practice (steam methane reforming) produces lower WTW efficiency than renewable production. The claim compares hydrogen to 'electricity for cars' but the evidence compares hydrogen to ICE and HEV, not directly to battery electric vehicles (BEVs). The evidence does not establish a clear efficiency advantage for hydrogen under current common production methods when measured well-to-wheel.

---

## Boundary 1: Direct FCEV Efficiency Comparison

This boundary establishes direct comparative efficiency claims between hydrogen fuel cell electric vehicles and gasoline-powered internal combustion engine vehicles. EVI_001 asserts that FCEVs are more efficient than conventional ICE vehicles and produce no harmful tailpipe pollutants [EVI_001_AFDC_FCEV_EFFICIENCY]. EVI_002 provides quantified simulation results showing FCEV equivalent fuel economy is 2-3 times higher than gasoline ICE vehicles of the same weight and road load [EVI_002_OPENALEX_FCEV_HEV_COMPARISON]. Both items directly address the same comparison (hydrogen/FCEV vs. conventional ICE) on the same property (efficiency) and support the selected claim direction without specifying measurement frame or production method assumptions.

---

## Boundary 2: Well-to-Wheel Efficiency Variability and Methodology

This boundary establishes the well-to-wheel (WTW) efficiency measurement framework and the wide range of hydrogen efficiency outcomes dependent on hydrogen production method. EVI_003 presents a range of WTW efficiency for hydrogen FCEVs (6.8%-29.2%) with explicit dependence on hydrogen production method [EVI_003_LU_2022_WTW_EFFICIENCY_RANGE]. EVI_004 explains the WTW methodology, notes that the range depends on production assumptions (renewable vs. steam methane reforming, which is currently most common), and contextualizes the comparison across vehicle types [EVI_004_WTW_METHODOLOGY_COMPLEXITY]. These items establish important limitations and methodological context that qualify the direct efficiency comparison; they form a boundary addressing the measurement frame and assumption sensitivity underlying the claim.

---

## Limitations

- All quantified efficiency support is simulation-based; no empirical operational data from deployed FCEV fleets is cited.
- The claim does not specify measurement frame (tank-to-wheel vs. well-to-wheel); evidence shows these frames produce materially different conclusions.
- Hydrogen production method is a critical variable not specified in the claim; current common practice (steam methane reforming) produces lower WTW efficiency than renewable production.
- Evidence compares hydrogen to ICE and HEV, not directly to battery electric vehicles (BEVs), limiting direct support for the hydrogen-vs.-electricity framing.
- Upstream sufficiency assessment is caveated, indicating potential gaps in evidence scope or source diversity.

---

## Evidence References

- **EVI_001_AFDC_FCEV_EFFICIENCY**: Direct assertion that FCEVs are more efficient than conventional ICE vehicles with zero harmful tailpipe emissions; supports VERDICT_001 and BOUNDARY_001.
- **EVI_002_OPENALEX_FCEV_HEV_COMPARISON**: Quantified simulation results showing FCEV fuel economy 2-3x higher than gasoline ICE and 1.66-2.0x higher than HEV; directly supports VERDICT_001 and BOUNDARY_001.
- **EVI_003_LU_2022_WTW_EFFICIENCY_RANGE**: Well-to-wheel efficiency range (6.8%-29.2%) for hydrogen FCEVs dependent on production method; establishes variability context for VERDICT_002 and BOUNDARY_002.
- **EVI_004_WTW_METHODOLOGY_COMPLEXITY**: Explains WTW methodology, production-method dependence (renewable vs. steam methane reforming), and cross-vehicle comparison assumptions; contextualizes VERDICT_002 and BOUNDARY_002 material uncertainty.
