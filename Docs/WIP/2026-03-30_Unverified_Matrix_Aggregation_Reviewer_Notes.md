# UNVERIFIED Claims UI & Aggregation Review (Rev 2)

**Date:** 2026-03-30
**Role:** Code/Architecture Reviewer
**Subject:** `11c5295a` Excluded UNVERIFIED matrix claims and the shift to LLM-driven Stage 5

---

## 1. Executive Summary

A review of job `11c5295a` demonstrates regressions stemming from the recent `2705/e407` integrity patch: `UNVERIFIED` claims (those failing the D5 gate) are entirely hidden from the UI Coverage Matrix and inherently discarded from the article's overall truth-percentage and confidence math, yielding falsely confident articles.

While an initial proposal suggested using a deterministic math penalty (`unresolvedShare`), a deeper architectural review by the Captain and Architect rightly rejects that approach. Under `AGENTS.md` guidelines, analyzing the holistic meaning of missing evidence is a semantic task, not an arithmetic one. 

The revised, correct architectural path is to **decouple the UI matrix** to ensure visibility of unverified claims, and **replace deterministic Stage 5 math with an LLM adjudication step** that explicitly considers the impact of `UNVERIFIED` claims on overall article confidence.

## 2. Code-Level Assessment

### The Problem
*   **The Matrix Problem:** `claimboundary-pipeline.ts` explicitly restricts the `coverageMatrix` input strictly to `assessableClaims` (D5 sufficient) to avoid "ghost columns." Thus, insufficient claims physically vanish from the UI.
*   **The Arithmetic Problem:** `aggregation-stage.ts` builds the article score using deterministic math where `weight = baseWeight * (verdict.confidence / 100)`. Because UNVERIFIED claims get `confidence = 0`, their mathematical `weight` is exactly `0`. They vanish from the denominator. This allows an article with 1 verified true claim and 9 unverified claims to surface as `TRUE` with High Confidence.

### Evaluating the New Fix Path

1.  **Split the matrices (UI Visibility):** *Strongly Supported.* The pipeline needs a structural split.
    *   `coverageMatrix` (Internal): Built *only* from `assessableClaims` for Stage 4 research orchestration.
    *   `reportMatrix` (Output/UI): Constructed right before pipeline termination mapping *all final atomic claims* (including UNVERIFIED) to feed the frontend.
2.  **Reject Arithmetic Aggregation:** *Strongly Supported.* Inventing a hand-tuned penalty formula for unverified claims violates the principle of using LLM intelligence for semantic scaling and creates rigid edge cases.
3.  **Elevate Stage 5 to LLM Adjudication:** *Strongly Supported.* Moving the overall verdict generation to an LLM step aligns with core pipeline philosophy. The prompt must explicitly instruct the model to synthesize the final verdict by evaluating *both* assessed claims and the unresolved (UNVERIFIED) direct claims, recognizing that unresolved assertions structurally throttle overall confidence.

## 3. Implementation Cautions

### What to Move to LLM (Stage 5 Rewrite)
*   **Final Article Verdict:** The interpretation of supporting claims, contradicting claims, unverified direct claims, and overall uncertainty must be handled via a Stage 5 LLM prompt.
*   **Confidence Capping:** Instruct the LLM that a high proportion of UNVERIFIED central claims necessitates low overall article confidence, regardless of how strong the few verified claims are.

### What MUST Stay Deterministic
*   **Integrity Rules:** Duplicate claim checks, pipeline invariants, and schema validations.
*   **Matrix Construction:** The structural build of `reportMatrix` vs `coverageMatrix`.
*   **Gate D5 Rules:** Deterministic thresholds for whether a claim has enough evidence to pass to Stage 4.

## 4. Final Judgment

`Approved design shift to LLM Aggregation`

The revised architectural direction cleanly solves the `11c5295a` visibility bug while properly shifting the burden of epistemological confidence from a rigid, deterministic math formula (which is brittle) to the LLM (which can interpret semantics). It completely aligns with `AGENTS.md` mandates.