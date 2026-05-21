# ACS Fragment Root-Cause Debate

Date: 2026-04-23  
Role: Unassigned  
Model: Codex (GPT-5)

## Task

Run a structured adversarial debate on the newly identified ACS slowness defect:

> The primary real issue behind the ACS claim-selection dialog slowness on the live Grander case is fragment URL expansion into whole-page duplicated FAQ text before Stage 1, so the first fix should be generic fragment-aware bounded extraction rather than further recommendation tuning.

Tier used: `full`

## Structural Audit

- Evidence inventory: `8`
- Opposition explicitly present: `yes`
- Known gaps:
  - no fragment-aware rerun yet on the same URL
  - no prevalence estimate across all ACS slow drafts
  - no proof that bounded extraction alone removes the Stage 1 collapse
- Optional state:
  - live ACS draft-preparation observability patch already deployed
  - live draft used `selectionMode=automatic`
  - recommendation never started on the live case
- Intake status: `debate-ready`

## Debate Result

Reconciler verdict: `MODIFY`

### Thesis

For the live Grander case, fragment expansion is a well-evidenced upstream amplifier and recommendation tuning is not the right first move, but the current bundle does **not** yet prove fragment-aware bounded extraction is the primary confirmed first fix over Stage 1 revalidation hardening plus an exact-URL A/B rerun.

### Point-by-Point

1. `Advocate` won on mechanism reality.
   - The bundle directly shows fragment loss, whole-page extraction, duplicated FAQ text, and a large bounded-extraction opportunity on the live page.

2. `Advocate` won on recommendation ordering.
   - The live draft never reached recommendation, so recommendation tuning is not the first fix for this incident.

3. `Challenger` won on direct failure-location evidence.
   - The strongest observed failing seam is still late Stage 1 contract revalidation after Gate 1.

4. `Challenger` won on first-fix certainty.
   - Without a rerun on the exact same URL, the bundle does not close causality enough to prove bounded extraction should ship *before* Stage 1 seam hardening.

## Stability Outcome

Both consistency probes returned `STABLE = no`.

- Cost-first:
  - fragment-aware extraction looks promising, but expected payoff is still unpriced without a same-URL rerun or prevalence signal
- Alternatives-first:
  - “not recommendation tuning first” remained stable
  - “therefore bounded extraction must be first” did not remain stable

This caps practical confidence to a bounded, implementation-oriented reading.

## Validation

Validator result: `PASS-WITH-CAVEATS`

- Structural alignment: `PASS`
- Grounding: all reconciler points `PASS`
- Direction: `PARTIAL`

Main caveat:
- The decision is sound for live-case triage and fix ordering against recommendation tuning, but still depends on inferred prioritization rather than direct A/B confirmation.

## Practical Conclusion

Keep:

- fragment URL expansion is a real bug on the live Grander case
- it materially inflates Stage 1 input
- recommendation tuning is not the right first fix for this incident

Change:

- do **not** state yet that bounded extraction is the fully confirmed primary first fix
- first patch should target the observed Stage 1 final revalidation seam and then rerun the exact same URL with fragment-aware bounded extraction for A/B confirmation

## Recommended Next Step

1. Add explicit timing / hardening around final contract revalidation in Stage 1.
2. Implement generic fragment-aware bounded extraction for HTML URL inputs.
3. Rerun the exact Grander URL in an A/B comparison:
   - current extraction
   - fragment-aware bounded extraction
4. Decide first-fix ordering from measured results instead of inference.

## Warnings

- No product code changed in this debate pass.
- The decision applies to the live anchored-URL Grander case and the ordering against recommendation tuning.
- It does **not** establish a universal explanation for all ACS slow drafts.

## For Next Agent

- Treat the fragment-expansion diagnosis as established bug evidence, not yet as fully closed root-cause primacy.
- If you implement next, pair any bounded-extraction patch with an exact same-URL rerun so the causal link becomes measured rather than inferred.
