# Phase 7 E1 Status Note

**Date:** 2026-04-14
**Status:** Historical supporting note
**Commit:** `7e0fd20a` (initial), `ff08a0db` (V5)
**Source:** Consolidated from `Docs/WIP/2026-04-14_Phase7_Status_and_E2_Measurement_Plan.md` and commit history.

## Status Note

This note remains useful as a record of why E1 iteration stopped and E2 was promoted.

Use it as supporting context only.

For the current Phase 7 baseline and next-step plan, use:

- `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md`

## 1. Executive Summary

Phase 7 E1 (Prompt-only Salience First) has been implemented and iterated to **Version 5**. The intervention consists of a meaning-preservation scaffold embedded within the `CLAIM_EXTRACTION_PASS2` prompt. 

While E1 improved anchor handling compared to the Phase 6 baseline, it did not decisively close the product-quality gap on the primary `R2` canary. Consequently, E2 (Log-only Salience Stage) was promoted as the necessary structural move.

## 2. E1 V5 Configuration

- **Prompt:** `CLAIM_EXTRACTION_PASS2` in `apps/web/prompts/claimboundary.prompt.md`.
- **Mechanism:** Internal reasoning-step mandate ("Mandatory pre-decomposition meaning analysis").
- **Schema:** No change (internal LLM reasoning only).
- **Model:** Sonnet 3.5 (standard extraction tier).

## 3. Tripwire Results (R2 Canary)

The E1 V5 iteration was tested against the `R2` German locked input ("...rechtskräftig...").

| Metric | Result | Band |
|---|---|---|
| **Full Pass Rate** | 3/5 (60%) | **Ambiguous** |
| **Anchor Preservation** | 4/5 (80%) | Pass |
| **Fidelity / Drift** | 3/5 (60%) | Ambiguous |

**Note:** The `3/5` full pass rate fell into the Ambiguous band (defined as 40-80% in the charter). While anchor recognition was high, the *binding* of that anchor into the final claim statement remained stochastic.

## 4. Decision Rationale

The E1 results confirmed the following:
1. **Recognition is not Extraction:** The LLM can identify the anchor in its reasoning block but still omit or weaken it in the structured JSON output.
2. **Scaffold Ceiling:** Further prompt-only iterations on E1 are unlikely to reach the `>80%` decisive PASS threshold without a structural constraint.
3. **Promotion of E2:** To resolve the "Recognition vs. Binding" gap, E2 was implemented to provide a dedicated, auditable upstream salience commitment.

## 5. Next Steps

- **Keep E1 V5:** The current scaffold provides a baseline of meaning-preservation that will be augmented by E2.
- **Pivot to E2 Measurement:** The focus shifts to measuring the reliability of the dedicated Salience Stage (E2) on the newly hardened measurement surface.

---
**Status:** Closed for iteration. E1 V5 is the active baseline for the Phase 7 E2/Shape B transition.
