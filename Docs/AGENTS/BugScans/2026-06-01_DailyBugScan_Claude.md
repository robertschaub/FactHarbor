# Daily Bug Scan — 2026-06-01 (Claude Opus 4.7)

**Scope:** Commits since 2026-05-31 (last 24h). Code-bearing commits only:
`2395f494` (sufficiency alignment), `8c2799fb` (env-export script fix), `66bcdca3`/`7fdf78d0`/`a4338753`/`716de649` (diagnostic scripts, read-only), `f1afdeef` (hooks scope fix).

**Method:** Grounded — git log + source-line verification + test-coverage check. No new jobs run.

---

## Finding 1 — CRITICAL: Degraded-path inversion in `2395f494` is fail-CLOSED, not fail-open (claimed)

**Status:** Already documented in [`Docs/WIP/2026-06-01_Review_Codex_2395f494_Direct_Sufficiency.md`](../../WIP/2026-06-01_Review_Codex_2395f494_Direct_Sufficiency.md) — re-confirming here because it is an unfixed regression and the test names actively assert the wrong contract.

**Evidence (verified line-by-line):**
- [`research-extraction-stage.ts:525`](../../../apps/web/src/lib/analyzer/research-extraction-stage.ts:525): prompt-section-missing path returns items with `applicabilityAssessed: true` and no `applicability`.
- [`research-extraction-stage.ts:636`](../../../apps/web/src/lib/analyzer/research-extraction-stage.ts:636): LLM-error catch path same shape: `applicabilityAssessed: true`, no `applicability`.
- [`verdict-stage.ts:1933-1938`](../../../apps/web/src/lib/analyzer/verdict-stage.ts:1933) `isDirectForCitation`: when `applicability` is undefined AND `applicabilityAssessed === true`, returns **false** (non-direct).
- [`verdict-stage.ts:1944` `getHardCitationIntegrityIssues`](../../../apps/web/src/lib/analyzer/verdict-stage.ts:1944) classifies non-direct citations as **hard** integrity issues — not guarded by `relevantGeographies`, so every claim (geo + non-geo) flips to structural-integrity failure → mass UNVERIFIED.
- [`research-extraction-stage.test.ts:824`](../../../apps/web/test/unit/lib/analyzer/research-extraction-stage.test.ts:824) is **literally named** "should fail-open on LLM error" yet asserts the exact state (`applicabilityAssessed: true`, `applicability: undefined`) that the downstream gate treats as fail-CLOSED. The unit test misses this because it never runs the citation gate.

**Why this matters:** On a concurrent-load day with applicability-LLM degradation (documented `[Fix3]` timeouts on 467 calls), the **entire job collapses** to UNVERIFIED instead of degrading gracefully as the warning text claims.

**Minimal fix (≈3 lines of code + 1 test):**

In [`research-extraction-stage.ts:525`](../../../apps/web/src/lib/analyzer/research-extraction-stage.ts:525) and `:636`, return the legacy fail-open shape on classifier degradation:

```ts
// :525 and :636
return evidenceItems.map((item) => ({ ...item, applicabilityAssessed: false }));
```

`applicabilityAssessed: false` makes `isDirectForCitation` fall to the `applicabilityAssessed !== true` branch (line 1937) → returns `true` → legacy "missing = direct" behaviour preserved when classification did not actually succeed.

This is the right design boundary: the contract should bite when classification **succeeded** and produced no label, not when infra failed.

Add one test in `verdict-stage.test.ts` (or pipeline test): given a verdict citing evidence with `applicabilityAssessed:false`, assert `hasStructuralCitationIntegrity` is true. Rename the misleading `research-extraction-stage.test.ts:824` test or add an explicit downstream-semantics assertion.

**Confidence:** High — directly traced through three source files and one test file.

---

## Finding 2 — MODERATE: Job-wide `directApplicabilityRequiredForD5` applied per-claim in mixed jobs

**Status:** Also flagged in the WIP review; included here because it has a one-line fix.

**Evidence:**
- [`claimboundary-pipeline.ts:1179`](../../../apps/web/src/lib/analyzer/claimboundary-pipeline.ts:1179) computes `applicabilityRelevantGeographies` once via `getClaimsRelevantGeographies(...)` — [`jurisdiction-context.ts:36-44`](../../../apps/web/src/lib/analyzer/jurisdiction-context.ts:36) confirms this **merges** geographies across all claims.
- [`claimboundary-pipeline.ts:1183-1186`](../../../apps/web/src/lib/analyzer/claimboundary-pipeline.ts:1183) sets a single job-wide boolean.
- [`claimboundary-pipeline.ts:1254`](../../../apps/web/src/lib/analyzer/claimboundary-pipeline.ts:1254) and `:1259`/`:1267`/`:1286` apply the same boolean to every claim inside the per-claim sufficiency loop.

**Result:** In a mixed job (one geo claim + one non-geo plastic/hydrogen claim), the non-geo claim inherits `requireDirect = true` because the geo claim's geography contributed to the merged list. The non-geo claim can then spuriously fail D5 as `insufficient_direct_evidence`.

**Minimal fix (≈2 lines):** Move the gate into the per-claim loop. Replace the use of `directApplicabilityRequiredForD5` on line 1254 with a fresh per-iteration check:

```ts
const claimGeos = getClaimRelevantGeographies(claim); // already imported via jurisdiction-context
const requireDirectForClaim =
  (initialPipelineConfig.applicabilityFilterEnabled ?? true)
  && claimGeos.length > 0
  && state.evidenceItems.length > 0;
```

Then thread `requireDirectForClaim` into the four use-sites (lines 1254, 1259, 1267, 1286) instead of the job-wide boolean. The job-wide variable can be kept only as input to the applicability classifier prompt (which legitimately runs once for the whole job).

**Confidence:** High — straightforward control-flow read; matches the WIP review independently.

---

## Items checked and cleared

- **`8c2799fb` (restart-clean.ps1 env re-export):** Fix replaces an unsafe loop with a curated allow-list of runtime vars. No new bug introduced; the rationale (Trim() doesn't strip `\r`, single-quote interpolation unsafe) is concrete and the change is strictly narrower.
- **`f1afdeef` (hook scope fix):** Single-line JSON change scoping the sqlite3 guard to write ops only. The new regex blocks `DROP|DELETE|UPDATE|INSERT|.import|.restore` plus redirect-overwrite and `rm`. Author validated reads pass and writes still block. No bug.
- **`66bcdca3` / `7fdf78d0` / `a4338753` / `716de649` (diagnostic scripts):** Read-only census/drill `.cjs` scripts under `scripts/diag/`. Not on any runtime path; out of scope.
- **`2395f494` happy-path (classifier succeeds):** Confirmed sound by the WIP review and code inspection; the new `.optional().catch(undefined)` schema correctly stops the code inventing a "direct" label.

---

## Recommendation

Apply **Finding 1** fix first (one-line revert of the degraded-path shape) — it is the load-day production hazard and unblocks confidence-tier comparisons across runs.
Apply **Finding 2** fix alongside or immediately after (one-line gate scope change).
Then proceed with the multi-family validation called for in the WIP review §REFINE #3 — these two code fixes are prerequisites, not alternatives, to that validation.

**No new bugs identified beyond what `f5bdda03` already flagged.** This scan re-confirms those findings against current HEAD source so they don't get lost.
