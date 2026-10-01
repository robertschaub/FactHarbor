# Prompt Issue Register

These four issue identities remain open with their recorded `unconfirmed` resolution status. A mitigation or offline test is not a verified post-fix live outcome. The Q-code associations below identify related review contracts; they do not reclassify the original finding or prove a particular structural check failed. Full analytical review must respect each check's observability limits.

## PI-001 — Insufficient reasoning scaffold for comparative ecosystem asymmetry (P6)

- **Type:** SYSTEMIC
- **Severity:** HIGH
- **Confidence:** INFERRED
- **Prompt:** `claimboundary.prompt.md`, section: `VERDICT_RECONCILIATION` (`1399-1414`)
- **Prompt hash:** `8298884f5ede80863fe2a9195cfb4d33aec0aa86f26c0b1c1f8f8f3a5127ff0f`
- **Coverage:** BLOB-EXACT
- **First seen:** commit `8626424acd16f1850212c7c64eb1b2dede8f7b2a` — 2026-04-19
- **Last confirmed:** commit `8626424acd16f1850212c7c64eb1b2dede8f7b2a` — 2026-04-19
- **Status:** unconfirmed
- qCode: Q-HF6
- Constraint: evaluate evidence for each side and explain material omissions without converting asymmetric coverage into an unsupported conclusion. Prior mitigation does not establish closure; verify against the exact authorized comparison and applicable evidence.
- Check limitation: The recorded observation had confidence 32; Q-HF6 flags that low-confidence signal. Q-V1 would pass the recorded supporting/opposing alignment. Neither proxy proves the comparative-reasoning cause, and Q-HF6 must be interpreted with the report's publishability state.

## PI-002 — Grounding validator still overweights cited registry wording (P9)

- **Type:** SYSTEMIC
- **Severity:** MEDIUM
- **Confidence:** CONFIRMED
- **Prompt:** `claimboundary.prompt.md`, section: `VERDICT_GROUNDING_VALIDATION` (`1484-1507`)
- **Prompt hash:** `8298884f5ede80863fe2a9195cfb4d33aec0aa86f26c0b1c1f8f8f3a5127ff0f`
- **Coverage:** BLOB-EXACT
- **First seen:** commit `8626424acd16f1850212c7c64eb1b2dede8f7b2a` — 2026-04-19
- **Last confirmed:** commit `8626424acd16f1850212c7c64eb1b2dede8f7b2a` — 2026-04-19
- **Status:** unconfirmed
- qCode: Q-V_REASON_CITATION
- Constraint: distinguish evidence relied on directionally from permitted claim-local or challenge context. Do not treat every contextual or rejected citation as contamination. The Q-code is a related check, not proof its simplified structural proxy captures this issue correctly.
- Check limitation: This related citation check may not capture contextual or rejected-citation misclassification; assess the original observation rather than treating a structural pass as closure.

## PI-003 — Section-order spillover from unrelated comparative prompt expansion (P9)

- **Type:** REPORT-SPECIFIC
- **Severity:** HIGH
- **Confidence:** INFERRED
- **Prompt:** `claimboundary.prompt.md`, sections: `CLAIM_EXTRACTION_PASS1`, `CLAIM_EXTRACTION_PASS2`, `GENERATE_QUERIES`
- **Prompt hash:** `53232e79991d6005dbd19415edf0bd9cadafedc39a87c17ee07523acf5a47530`
- **Coverage:** BLOB-EXACT
- **First seen:** commit `3add5697b2c0f93d0cb348859dea72e8c9a08723` — 2026-04-19
- **Last confirmed:** commit `3add5697b2c0f93d0cb348859dea72e8c9a08723` — 2026-04-19
- **Status:** unconfirmed
- qCode: Q-REG1
- Constraint: generic comparative instructions must not lose evidence needed for a non-comparative claim. Prompt-contract tests alone do not establish unchanged report quality; use only authorized exact inputs for any future observation.
- Check limitation: Compare the recorded regression with prior-better run `c95d00114cc54e6da201237d1ab59218` under Q-REG1. Q-EV6 can pass when evidence was researched for the wrong total; it does not capture this failure.

## PI-004 — Reconciler accepted missing-evidence challenges without full acquired evidence (P8/P6)

- **Type:** SYSTEMIC
- **Severity:** HIGH
- **Confidence:** CONFIRMED
- **Prompt:** `claimboundary.prompt.md`, section: `VERDICT_RECONCILIATION`; code path: `apps/web/src/lib/analyzer/verdict-stage.ts`
- **Prompt hash:** `2418aef34257ba45ccef94131ace6124925f5fb89e5bc1302dfb0678f3e69c90`
- **Coverage:** BLOB-EXACT
- **First seen:** commit `0d97a7a6412fe7d2794391a36860723840279680+4985483c` — 2026-05-28
- **Last confirmed:** commit `0d97a7a6412fe7d2794391a36860723840279680+4985483c` — 2026-05-29
- **Status:** unconfirmed
- qCode: Q-V7
- Constraint: assess a challenge against the available claim-local evidence before changing a verdict. A missing citation is not automatically missing evidence. Later payload/citation fixes do not close this specific issue without verified observations.
- Check limitation: Q-V7 is a related reasoning-consistency contract. Its result alone does not establish whether the reconciler considered all relevant acquired evidence.
