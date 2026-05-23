# V2 HighJump HJ82 Comparator Identity Result

## Classification

`PARTIAL_X7_HJ82_COMPARATOR_IDENTITY_FULL_REPORT_OUTSIDE_BASELINE_STILL_FOREGROUNDED`

## Runtime And Job

- Implementation commit: `978e7839fa676706dd953fb2d6213f668fa1f7e6`
- Job: `ace31183fdae47889b7771ed5fdb92a1`
- Input: `Using hydrogen for cars is more efficient than using electricity`
- Pipeline: `claimboundary-v2`
- Created git commit hash: `978e7839fa676706dd953fb2d6213f668fa1f7e6`
- Executed Web git commit hash: `978e7839fa676706dd953fb2d6213f668fa1f7e6`
- Status: `SUCCEEDED`
- Admin report markdown length: `8074` characters

## Local Verification Before Job

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts`: passed, `12` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`: passed, `10` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts --runInBand`: passed, `96` tests.
- `npm -w apps/web run build`: passed.
- `npm run debt:sensors`: `advisory_warn` only. Salient warnings remain existing V2 footprint, boundary-guard size, WIP docs volume, historical net-mechanism telemetry, and consolidation-marker warnings.
- `git diff --check`: passed.
- Runtime preflight before job: Web and API both reported `978e7839fa676706dd953fb2d6213f668fa1f7e6`; git status was clean; API/Web health passed; runner route probe returned `400`; admin probe returned `200`.

## Result Evidence

- The run produced a complete internal V2 report, not a stop summary.
- Source-chain attribution showed:
  - Query Planning status: `completed` / accepted, `5` query entries.
  - Candidate Provider Network status: `candidate_provider_network_completed`, `15` candidates and `46168` total bytes.
  - Source Material status: `source_material_page_summary_completed`.
  - Source Material records: `9`, with `19025` bounded text bytes.
  - Source Material kinds: `3` bounded linked-page records, `2` Wikimedia page summaries, `2` OpenAlex abstracts, `2` search-preview records.
  - W5 execution status: `hidden_evidence_item_extraction_completed`.
  - EvidenceItems: `4`.
  - Report writer status: `internal_report_writer_draft_created`.
- Public/default containment stayed closed:
  - public report markdown absent;
  - public verdict/truth/confidence absent;
  - result schema `4.0.0-cb-precutover`;
  - public cutover status `blocked_precutover`.

## Quality Assessment

HJ82 is a useful progress step but not a hydrogen-family quality pass. It fixed
the HJ81 failure mode enough that the selected hydrogen-vs-electricity claim is
no longer reported as true. The internal report explicitly states that the
selected comparator remains unverified (`UNVERIFIED 48/45`) and that hydrogen
vs gasoline material does not bridge to the selected claim.

The remaining defect is report composition / upstream candidate admission:
outside-baseline material is still foregrounded as `Verdict 1: Hydrogen vs.
Gasoline - Leaning True` with `62/65`, ahead of the selected comparison. That
is better than HJ81's strong true-side claim result, but it still risks
misleading readers by elevating an adjacent baseline as a verdict section.

The next repair should not broaden W7 again. The lowest-complexity owner is the
existing report-writer or verdict/intake shaping rule that decides which
candidate verdicts are report-primary when a candidate does not answer the
selected AtomicClaim comparator. If the selected-claim verdict is `UNVERIFIED`,
outside-baseline context may be shown as context/caveat, but it should not be
the first or primary verdict.

## Information Yield

`report_produced_with_quality_gap_and_narrowed_owner`

## Debt-Guard Result

Classification: `incomplete-existing-mechanism` after HJ81 failed-attempt
recovery.

Chosen option: amend existing Claim Understanding and Evidence Extraction
prompt guidance in place to preserve comparison endpoints and prevent
outside-baseline EvidenceItems from being over-promoted as direct support.

Rejected path and why:

- Further W7 relaxation: HJ81 live validation contradicted that path and it was
  reverted.
- New source/provider machinery: HJ82 reached sufficient source material and
  W5 evidence extraction for a complete report.
- Hidden proof or route machinery: the job record already contains durable
  source-chain diagnostics and full report markdown for this decision.

What was removed/simplified: no code removed; no new mechanism added.

What was added: topic-neutral prompt guidance in existing Claim Understanding
and Evidence Extraction sections, plus prompt-contract assertions.

Net mechanism count: unchanged.

Budget reconciliation: actual files matched the small-change plan: prompt,
prompt-contract tests, package/result docs, ledger/current-lane docs.

Verification: local verifier set passed before commit; live job ran against
clean committed runtime and produced a complete report.

Debt accepted and removal trigger: no structural debt accepted. Report
composition still needs one targeted correction before another broader hydrogen
quality evaluation.

Residual debt: outside-baseline verdict sections can still be foregrounded over
the selected comparison in internal Alpha reports.

## Full Internal Report

# Internal Alpha: Hydrogen Fuel Cell Efficiency vs. Electricity-Caveated Verdict Report

## Executive Summary

Evidence directly comparing hydrogen fuel cell vehicles to gasoline supports a leaning-true verdict (62% truth, 65% confidence) that hydrogen is more efficient than a baseline energy source. However, the selected claim specifically compares hydrogen to electricity, which remains unverified (48% truth, 45% confidence). Direct evidence compares hydrogen to gasoline; bridge evidence connecting this advantage to electricity-based comparison is absent. Hydrogen production emissions and electric vehicle context provide partial information but do not establish the target claim relation.

## Verdict 1: Hydrogen vs. Gasoline-Leaning True

**Verdict Label:** LEANING-TRUE
**Truth Percentage:** 62%
**Confidence:** 65%

Simulation-based evidence shows hydrogen fuel cell vehicles achieve 2-3x higher equivalent fuel economy than gasoline internal combustion engines of equivalent weight and road load [EVI_002]. Hydrogen fuel cell efficiency ranges from 40-80% depending on design [EVI_001]. Together, these items establish that hydrogen is more efficient than a gasoline baseline. However, the selected claim compares hydrogen to electricity, not gasoline. The supplied direct evidence does not address the claim's specific comparator, creating a material gap between the evidence base and the claim target.

### Caveats

- Direct evidence compares hydrogen to gasoline, not to electricity as stated in the selected claim.
- Hydrogen efficiency is design-dependent (40-80% range), introducing material variation.
- The comparison in EVI_002 is simulation-based rather than empirical vehicle-level measurement.
- Sufficiency is caveated; caveat-level reporting is required rather than confident assertion.

### Material Uncertainty Signals

- Selected claim's comparator is electricity; supplied direct evidence compares hydrogen to gasoline. Bridge evidence is absent.
- EVI_003 opposes the claim by asserting electric vehicle superiority, creating unresolved tension.
- Hydrogen production emissions may affect well-to-wheel efficiency when compared to electricity from renewable grids, but this bridge is not established.
- Claim uses categorical language without specifying measurement frame, time period, or production method, while evidence is design- and method-dependent.

## Verdict 2: Hydrogen vs. Electricity-Unverified

**Verdict Label:** UNVERIFIED
**Truth Percentage:** 48%
**Confidence:** 45%

The selected claim directly compares hydrogen to electricity as energy sources. EVI_003 asserts that electric vehicles outperform hydrogen fuel cell vehicles from performance and cost efficiency standpoints, opposing the claim [EVI_003]. However, EVI_003 compares hydrogen fuel cell vehicles to electric vehicles as complete systems, not hydrogen to electricity as energy sources. EVI_004 provides context on hydrogen production methods and emissions but does not measure vehicle-level efficiency comparison [EVI_004]. Neither item establishes the target claim relation with sufficient directness. Evidence is either vehicle-system context or upstream production context rather than direct energy-source efficiency comparison.

### Caveats

- EVI_003 compares hydrogen fuel cell vehicles to electric vehicles as complete systems, not energy sources.
- EVI_004 addresses hydrogen production emissions and methods, which is upstream context rather than direct vehicle-level efficiency.
- No supplied evidence directly measures or compares hydrogen energy-source efficiency to electricity energy-source efficiency in equivalent vehicle applications.
- Claim's specific comparator (electricity) is not directly addressed by any single supplied evidence item.

### Material Uncertainty Signals

- Selected claim requires direct comparison of hydrogen efficiency to electricity efficiency; supplied evidence compares hydrogen fuel cell vehicles to electric vehicles (broader system comparison) or addresses hydrogen production context.
- EVI_003 opposes the claim but does not provide quantitative efficiency measurements for direct comparison.
- Well-to-wheel efficiency would require integrating hydrogen production emissions with vehicle-level efficiency, but this integration is not established.
- Claim's truth depends on measurement frame (tank-to-wheel vs. well-to-wheel), production method, and electricity grid composition, none fully specified or addressed.
- Sufficiency assessment indicates caveated status with recommendation for caveat-level reporting, signaling material gaps in direct evidence.

## Boundary 1: Direct Hydrogen Fuel Cell Efficiency Measurements and Comparisons

EVI_001 and EVI_002 form a coherent boundary addressing hydrogen efficiency compared to a baseline. EVI_001 establishes absolute hydrogen fuel cell efficiency range (40-80%) with design-dependent variation [EVI_001]. EVI_002 provides direct comparative evidence showing hydrogen fuel cell vehicles achieve 2-3x higher equivalent fuel economy than gasoline vehicles of equivalent weight and road load [EVI_002]. Both items target the same atomic claim and address the same compared entities and property, forming the strongest direct evidence base for hydrogen efficiency advantage.

## Boundary 2: Electric Vehicle Efficiency Context and Comparative Performance

EVI_003 introduces a different comparator structure: it compares hydrogen fuel cell vehicles to electric vehicles, not hydrogen to electricity as energy sources [EVI_003]. The evidence asserts electric vehicle superiority from performance and cost efficiency standpoints, opposing the selected claim. However, this represents a vehicle-system comparison rather than direct energy-source efficiency comparison. This boundary captures contextual information and potential contradiction but represents a materially adjacent comparison to the claim's target relation.

## Boundary 3: Hydrogen Production Methods and Emissions Context

EVI_004 provides contextual information about hydrogen production methods (98% via steam methane reforming with CO2 emissions) and alternative pathways (electrolysis, thermochemical, pyrolytic) [EVI_004]. While relevant to overall hydrogen system efficiency, it addresses production-stage efficiency rather than vehicle-level efficiency comparison between hydrogen and electricity. This boundary captures a limitation and contextual caveat on the direct efficiency claim, particularly for well-to-wheel analysis.

## Limitations

- Direct evidence compares hydrogen to gasoline, not electricity; bridge evidence is absent.
- Hydrogen efficiency is design-dependent (40-80% range); categorical claims lack specificity.
- No supplied evidence directly measures energy-source efficiency comparison (hydrogen vs. electricity).
- Well-to-wheel analysis would require integrating production emissions with vehicle efficiency; this integration is not established.
- Measurement frame (tank-to-wheel vs. well-to-wheel), production method, and electricity grid composition are not fully specified.

## Evidence References

- **EVI_001_HFC_EFFICIENCY_RANGE:** Establishes hydrogen fuel cell efficiency range (40-80%) with design-dependent variation; supports leaning-true verdict on hydrogen-vs-gasoline comparison.
- **EVI_002_HFC_VS_GASOLINE_BASELINE:** Provides simulation-based evidence that hydrogen fuel cell vehicles achieve 2-3x higher equivalent fuel economy than gasoline vehicles; primary support for leaning-true verdict but compares to gasoline, not electricity.
- **EVI_003_EV_EFFICIENCY_GENERAL:** Asserts electric vehicle superiority over hydrogen fuel cell vehicles from performance and cost efficiency standpoints; opposes claim but compares vehicle systems rather than energy sources; supports unverified verdict.
- **EVI_004_HYDROGEN_PRODUCTION_EMISSIONS:** Provides context on hydrogen production methods and emissions; addresses upstream production efficiency rather than vehicle-level comparison; supports unverified verdict and well-to-wheel limitation.
