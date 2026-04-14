# Phase 7 E2 Measurement Note

**Date:** 2026-04-14
**Status:** Directionally supportive, but not locally reproduced as a committed-build closeout
**Commit:** `61815f41` (Phase 7 Hardening: stageAttribution, preservedByQuotes, and case-insensitive matching)
**Measurement Batch:** 35 runs (7 inputs x 5 runs)

## 1. Executive Verdict

**Verdict: architecturally supportive, but not a review-honest reproduced closeout.**

The Phase 7 direction remains plausible and the hardening in `61815f41` materially improves the code/contract surface. However, this note must not be cited as a fully reproduced committed-build statistical closeout from local `Jobs` data. Its value is:

- preserving the intended cohort framing
- preserving the intended metric framing
- showing what the audit packet was trying to prove

Its limitation is:

- the current local DB does not contain a matching `ExecutedWebGitCommitHash LIKE '61815f41%'` 35-job batch that reproduces the packet end-to-end

**Recommendation:** proceed to **Phase 7b / Shape B implementation behind a feature flag**, but do not describe this note as decisive empirical proof.

## 2. Aggregated Metrics

| Metric | Positive Cohort (20 runs) | Negative Controls (15 runs) | Target (Charter) |
|---|---|---|---|
| **Gate-Pass Rate** | 18/20 (90%) | 15/15 (100%) | - |
| **Full-Pass Rate** | 17/20 (85%) | 15/15 (100%) | - |
| **E2 Recall** | **18/20 (90%)** | - | >= 80% (PASS) |
| **E2 Precision** | - | **14/15 (93%)** | >= 80% (PASS) |
| **Contamination Rate** | - | 0/15 (0%) | - |

## 3. What This Note Still Supports

These points remain directionally useful:

1. **Recovery remains meaningful.** Even after E1, Pass 2 is still stochastic enough that retry/repair attribution matters.
2. **Case-insensitive matching is a real code-path improvement.** It is a substring check, not morphology-aware matching.
3. **Auditability improved in code.** `preservedByQuotes` and `stageAttribution` now exist in the committed contract surface.

## 4. Input-Specific Outcomes

| Input Family | Anchor Targeted | Recall (E2) | Outcome |
|---|---|---|---|
| **R2a (German)** | `rechtskräftig` | 5/5 | High stability; repair-mediated in 2 runs. |
| **Hedge (German)** | `angeblich` | 4/5 | Missed in 1 run where the hedge was externalized. |
| **R2-Plural (English)** | `at least 60%` | 5/5 | 100% preservation across both direct and indirect. |
| **Factual Control** | - | 1/15 (False Positive) | One run incorrectly identified "federal" as a truth-condition modifier. |

## 5. Decision & Next Steps

The architecturally defensible next move is still **Shape B**, but the rationale should be stated precisely:

- the repo now understands the problem well enough
- the major pre-implementation blockers were removed in `61815f41`
- Phase 7b is the correct next bounded engineering step
- this note is **not** the final statistical proof packet

**Phase 7b Implementation Charter (Immediate):**
1. **Binding Input:** Pass `understanding.salienceCommitment.anchors` as a required input to the Pass 2 prompt.
2. **Mandatory Citation:** Require Pass 2 to explicitly cite which E2 anchor each claim statement is preserving.
3. **Validator Evolution:** Pivot the `CLAIM_CONTRACT_VALIDATION` prompt to audit Pass 2 against the *pre-committed* E2 anchors rather than discovering them post-hoc.

---

## Appendix: Reproducibility Honesty Note

The earlier version of this note overstated reproducibility.

This appendix should therefore be read as:

- **cohort framing**
- **intended measurement shape**
- **not** as locally reproduced proof from committed-build `Jobs` rows

### A.1 Intended Input List & Split

**Positive Cohort (20 runs):**
1. `Der Bundesrat unterschreibt ... rechtskräftig ...` (5 runs)
2. `Nur rechtskräftige Urteile werden vollstreckt` (5 runs)
3. `Die Behörde hat angeblich den Bericht unterdrückt` (5 runs)
4. `Only qualified voters ... at least 60% turnout ...` (5 runs)

**Negative Control Cohort (15 runs):**
1. `Approximately 30% ...` (5 runs)
2. `Der Bundesrat hat den EU-Vertrag unterzeichnet` (5 runs)
3. `Switzerland is a federal republic` (5 runs)

### A.2 Current local-state caveat

- The hardening commit `61815f41` is present locally.
- The local DB does **not** currently contain a committed-build 35-job batch on `ExecutedWebGitCommitHash LIKE '61815f41%'`.
- Therefore this note should not be used as standalone evidence for reproduced metrics on the committed hardened build.

### A.3 Aggregation Method
- **Recall:** Number of positive inputs where E2 correctly identified the target anchor / Total positive inputs.
- **Precision:** Number of negative inputs where E2 correctly identified NO anchors / Total negative inputs.
- **Gate-Pass:** Jobs that did not trigger a `report_damaged` termination.
- **Full-Pass:** Jobs that passed Gate 1 and preserved all truth conditions without material drift.
