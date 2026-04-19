# Prompt Issue Register

Living register of diagnosed LLM prompting deficiencies. Updated by `/prompt-diagnosis`.
Entries with `status: resolved` are retained for historical context.
Entries not re-confirmed under newer prompt/runtime provenance become `status: unconfirmed`.

---

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
- **Description:** Comparative institutional/ecosystem verdicting lacks an explicit per-side direct-evidence sufficiency step. When one side is directly evidenced and the other side is represented only by contextual proxies or omission-signals, the reconciler can still settle above `UNVERIFIED` instead of preserving unresolved asymmetry.
- **Observed behavior:** Job `4c5218a2960444c29baccff13f21cb38` finished with claim verdict `LEANING-TRUE 58/32` even though its own reasoning says there is no direct Swiss ecosystem evidence and the final pool is `3` supports / `0` contradicts / `6` neutral, with Swiss-side evidence mostly proxy/contextual.
- **Recommended fix:** Add a generic per-side sufficiency step in `VERDICT_RECONCILIATION` for systematic/institutionalized/organized comparative claims: assess direct ecosystem evidence on each side separately; if one side lacks direct ecosystem evidence and only contextual proxies or omission-signals exist, keep truthPercentage in the `UNVERIFIED` band unless the proxy source is itself enumerative/auditing for the target activity.
- **Mitigation applied:** 2026-04-19 prompt revision on active hash `c77cb6e8ca4671a0a3a26552f69cf94150723a440c152d003b4d530114aab8e3` adds the per-side direct-evidence sufficiency rule plus omission-scope guard in `VERDICT_RECONCILIATION`. No post-fix live rerun yet, so the issue is downgraded to `unconfirmed`, not `resolved`.

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
- **Description:** The grounding validator prompt still leads with registry-focused checks strongly enough that later allowances for uncited-but-claim-local evidence and challenge-context references are sometimes ignored. This recreates an older false-positive class even on the current active prompt hash.
- **Observed behavior:** Job `4c5218a2960444c29baccff13f21cb38` emitted `verdict_grounding_issue` claiming `EV_1776602553386-3388` were invalid because they were absent from `citedEvidenceRegistry`, even though they existed in `evidencePool` and were discussed as claim-local context.
- **Recommended fix:** Move the three-tier rule about claim-local context ahead of the registry-focused task bullets, or rewrite the task so `citedEvidenceRegistry` validates only directional citation arrays while `evidencePool` / `challengeContext` explicitly govern uncited reasoning references.
- **Mitigation applied:** 2026-04-19 prompt revision on active hash `c77cb6e8ca4671a0a3a26552f69cf94150723a440c152d003b4d530114aab8e3` rewrites `VERDICT_GROUNDING_VALIDATION` so claim-local context is validated before hallucination is flagged and registry membership is explicitly limited to directional citation arrays. No post-fix live rerun yet, so the issue is downgraded to `unconfirmed`, not `resolved`.

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
- **Description:** An unrelated prompt expansion for comparative institutional/ecosystem claims was added to generic shared sections and appears to have displaced attention from the existing broad-current-total retrieval rules for the asylum current-snapshot benchmark.
- **Observed behavior:** Benchmark job `7be084ee2c52441894a0d4a5c67213ec` regressed from recent successful run `c95d00114cc54e6da201237d1ab59218` even though the runtime path had no analyzer code changes. The good run preserved the SEM 2025 umbrella-total path and found `stat-jahr-2025-kommentar-d.pdf`; the bad run instead collapsed onto 2024 yearly stats, under-threshold framing, and partial status counts.
- **Recommended fix:** Narrow or relocate the comparative-ecosystem bullets introduced in `3add5697` so they remain effective for CH/DE ecosystem comparisons without living as broad, high-salience additions in the generic Stage 1 / Stage 2 prompt path. Pair that with a slightly harder current-total reacquisition rule for thresholded `current_snapshot` population claims.
- **Mitigation applied:** 2026-04-19 prompt revision wraps the comparative-ecosystem instructions in `CLAIM_EXTRACTION_PASS1`, `CLAIM_EXTRACTION_PASS2`, and `GENERATE_QUERIES` behind explicit `ONLY for comparative ecosystem claims` gates, adds generic negative exclusions for present-state metrics / rankings / threshold comparisons / other current measurable values, and moves the present-state metric query guards ahead of the ecosystem block in `GENERATE_QUERIES`. Focused prompt-contract tests pass, but no post-fix live rerun has completed yet, so the issue is downgraded to `unconfirmed`, not `resolved`.
