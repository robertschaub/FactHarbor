# V2 HighJump HJ83 Report-Primary Selected-Claim Result

## Classification

`PASS_X7_HJ83_SELECTED_CLAIM_PRIMARY_FULL_REPORT_STILL_LEANING_FALSE`

## Runtime And Job

- Implementation commit: `259b6eef52195fc3589a234e1b0289bf6d451ddd`
- Job: `0f282532282046659320db02bdfbd4f5`
- Input: `Using hydrogen for cars is more efficient than using electricity`
- Pipeline: `claimboundary-v2`
- Created git commit hash: `259b6eef52195fc3589a234e1b0289bf6d451ddd`
- Executed Web git commit hash: `259b6eef52195fc3589a234e1b0289bf6d451ddd`
- Status: `SUCCEEDED`
- Admin report markdown length: `6211` characters

## Local Verification Before Job

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`: passed, `10` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-report-writer.test.ts`: passed, `4` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts --runInBand`: passed, `96` tests.
- `npm -w apps/web run build`: passed.
- `npm run debt:sensors`: `advisory_warn` only. Salient warnings remain existing V2 footprint, boundary-guard size, WIP docs volume, historical net-mechanism telemetry, and consolidation-marker warnings.
- `git diff --check`: passed.
- Runtime preflight before job: Web and API both reported `259b6eef52195fc3589a234e1b0289bf6d451ddd`; git status was clean; API/Web health passed; runner route probe returned `400`; admin probe returned `200`.
- Runtime note: the normal restart script still launched the API with stale git provenance. The API was relaunched from the built executable with `GIT_COMMIT=259b6eef52195fc3589a234e1b0289bf6d451ddd`; direct `/version` and proxied `/api/fh/version` then matched HEAD before submission.

## Result Evidence

- The run produced a complete internal V2 report, not a stop summary.
- Source-chain attribution showed:
  - Query Planning status: `completed` / accepted, `5` query entries.
  - Candidate Provider Network status: `candidate_provider_network_completed`, `15` candidates and `46894` total bytes.
  - Source Material status: `source_material_page_summary_completed`.
  - Source Material records: `9`, with `19025` bounded text bytes.
  - Source Material kinds: `3` bounded linked-page records, `2` Wikimedia page summaries, `2` OpenAlex abstracts, `2` search-preview records.
  - W5 execution status: `hidden_evidence_item_extraction_completed`.
  - EvidenceItems: `4`.
  - Report writer status: `internal_report_writer_draft_created`.
- Public/default containment stayed closed:
  - public report markdown absent;
  - public verdict/truth/confidence absent;
  - public `adminDiagnostics` absent;
  - result schema `4.0.0-cb-precutover`;
  - public cutover status `blocked_precutover`.

## Quality Assessment

HJ83 passes the targeted report-primary repair. The internal report now opens
with the selected comparison and makes the direct EV/HFCV comparison the primary
verdict. Outside-baseline gasoline/hybrid evidence is moved to a contextual
verdict and explicitly marked as not resolving the selected comparison.

This is still not a strict hydrogen-family quality pass. The primary selected
claim verdict remains `LEANING-FALSE 35/62`, while accepted hydrogen-family
expectations target `FALSE` / `MOSTLY-FALSE`, truth `5-25` plus tolerance, and
confidence `65-85`. However, the report is now coherent enough to review and
improve from the selected-claim evidence instead of fighting report ordering.

The next single bar should be verdict calibration over direct selected-endpoint
opposition and measurement-frame caveats: the report has direct contrary
evidence but still leaves truth at `35` and confidence at `62` because of medium
probative value and caveats. A narrow W7 calibration repair may be justified
now, but it must not repeat HJ81's adjacent-comparator overreach.

## Information Yield

`report_quality_improved_selected_claim_primary`

## Debt-Guard Result

Classification: `incomplete-existing-mechanism` after HJ82 report-quality
evidence.

Chosen option: amend existing Aggregation Narrative prompt guidance in place.

Rejected path and why:

- Deterministic section ordering in code: would add machinery and risks
  language/semantic leakage.
- W7 relaxation: HJ81 proved that broad path over-promotes adjacent comparators.
- Source/provider expansion: HJ82/HJ83 both had sufficient source material and
  report prose to expose report-composition and verdict-calibration owners.
- Report candidate omission: would violate the current exact cardinality
  contract.

What was removed/simplified: no code removed; no new mechanism added.

What was added: topic-neutral report-primary ordering guidance in the existing
Aggregation Narrative prompt, plus prompt-contract assertions.

Net mechanism count: unchanged.

Budget reconciliation: actual files matched the small-change plan: prompt,
prompt-contract test, package/result docs, ledger/current-lane docs.

Verification: local verifier set passed before commit; live job ran against
clean committed runtime and produced a complete report.

Debt accepted and removal trigger: no structural debt accepted.

Residual debt: hydrogen-family selected-claim verdict calibration remains too
weak by about one truth band/tolerance margin.

## Full Internal Report

## Efficiency Comparison: Electric Vehicles vs. Hydrogen Fuel Cell Vehicles

### Executive Summary

Direct evidence indicates battery electric vehicles generally outperform hydrogen fuel cell vehicles on performance and cost efficiency, contradicting claims of hydrogen superiority. A simulation-based comparison shows HFCV advantages over gasoline and hybrid vehicles but does not address the EV-HFCV comparison required by the claim. Material uncertainty remains due to comparator mismatch, measurement-frame ambiguity, and limited evidence scope. Sufficiency is caveated.

### Primary Verdict: Direct EV-HFCV Comparison

The selected claim asserts that hydrogen is more efficient than electricity. Direct evidence establishes the opposite: electric vehicles generally outperform hydrogen fuel cell vehicles on performance and cost efficiency [EVI_001_EV_OUTPERFORM_HFCV]. This evidence directly compares the two vehicle technologies on the same measurement frame as the selected claim, producing a **LEANING-FALSE** verdict (35% truth, 62% confidence).

The evidence uses moderate strength with medium probative value and includes two documented limitations. The language indicates typical but not universal EV superiority. Confidence is constrained by medium probative value and documented scope limitations. The broader evidence base sufficiency is caveated, indicating material gaps that require refinement.

### Contextual Verdict: HFCV Simulation Advantage Over Gasoline and Hybrid Vehicles

Simulation results show hydrogen fuel cell vehicles achieve fuel economy superiority over gasoline vehicles (2-3x) and hybrid vehicles (1.66-2.0x) [EVI_003_HFCV_FUEL_ECONOMY_COMPARISON]. However, this evidence compares hydrogen to gasoline and hybrid vehicles, not to battery electric vehicles as required by the selected claim. The comparator mismatch is material: the claim asks whether hydrogen is more efficient than electricity; this evidence establishes HFCV advantage over different baseline technologies. The evidence does not bridge from the gasoline/HEV comparison back to the EV comparison. Four documented limitations further constrain confidence. This produces an **UNVERIFIED** verdict (48% truth, 45% confidence) because the evidence is useful but does not directly establish the selected claim relation.

### Material Uncertainty and Tension

Multiple uncertainty signals complicate the overall assessment:

- **Adjacent-comparator tension**: The simulation evidence shows HFCV superiority over gasoline and hybrid vehicles, creating tension with the direct EV-HFCV comparison that favors EVs [EVI_003_HFCV_FUEL_ECONOMY_COMPARISON].
- **One-sided hydrogen context**: Hydrogen fuel cell efficiency ranges 40-80% under optimal conditions with combined heat and power optimization [EVI_002_HFC_EFFICIENCY_RANGE]. This one-sided context may partially support hydrogen efficiency claims in specific scenarios, but does not include EV efficiency data for direct comparison.
- **Measurement-frame ambiguity**: The selected claim uses categorical language ('more efficient') without specifying vehicle class, use case, or measurement frame. Evidence may apply only to specific contexts (e.g., long-haul vs. urban driving, specific vehicle classes).
- **Market context**: Hydrogen fuel cell vehicles show limited market adoption as of the 2020s, with only a few models available (Toyota Mirai, Hyundai Nexo) [EVI_004_HFCV_MARKET_STATUS]. This does not resolve the efficiency comparison but suggests competitive disadvantage for HFCVs.

### Boundary Scope and Evidence Limitations

**Direct EV-HFCV Comparison Boundary**: The primary direct-comparison evidence [EVI_001_EV_OUTPERFORM_HFCV] establishes the same comparison relation as the selected claim, with moderate strength and medium probative value. Two documented limitations reduce absolute confidence in the comparison strength.

**Hydrogen Efficiency Context Boundary**: One-sided technical context on hydrogen efficiency [EVI_002_HFC_EFFICIENCY_RANGE] informs the efficiency range for hydrogen (40-80%) but does not directly establish the comparative claim. Three documented limitations constrain this boundary's scope.

**HFCV Simulation Boundary**: Simulation-based fuel economy comparison [EVI_003_HFCV_FUEL_ECONOMY_COMPARISON] uses adjacent comparators (gasoline, hybrid) rather than battery electric vehicles. The comparison relation and measurement frame differ materially from the selected claim's direct EV-HFCV comparison. Four documented limitations further constrain generalizability.

**Market Context Boundary**: Market adoption and availability context [EVI_004_HFCV_MARKET_STATUS] provides competitive positioning information but does not address efficiency or performance comparison. Limited strength with low probative value and three documented limitations.

### Limitations

- Direct EV-HFCV comparison evidence has medium probative value and two documented scope limitations.
- Simulation-based HFCV comparison uses adjacent comparators (gasoline, hybrid) rather than battery electric vehicles.
- Selected claim lacks specified measurement frame, vehicle class, or use case; evidence may apply only to specific contexts.
- Hydrogen efficiency context is one-sided and does not include EV efficiency data for direct comparison.
- Broader evidence base sufficiency is caveated, indicating material gaps requiring refinement.

### Evidence References

- **EVI_001_EV_OUTPERFORM_HFCV**: Direct evidence that EVs generally outperform HFCVs on performance and cost efficiency, forming the primary verdict for the selected claim.
- **EVI_002_HFC_EFFICIENCY_RANGE**: One-sided hydrogen efficiency context showing 40-80% range under optimal conditions; informs material uncertainty about hydrogen efficiency in specific scenarios.
- **EVI_003_HFCV_FUEL_ECONOMY_COMPARISON**: Simulation-based HFCV fuel economy advantage over gasoline and hybrid vehicles; establishes adjacent-comparator evidence that does not directly resolve EV-HFCV comparison.
- **EVI_004_HFCV_MARKET_STATUS**: Market adoption context showing limited HFCV availability and sales; provides competitive positioning context but does not address efficiency comparison.
