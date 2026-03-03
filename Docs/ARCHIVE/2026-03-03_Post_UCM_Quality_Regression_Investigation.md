# Post-UCM Quality Regression Investigation and Stabilization Plan (2026-03-03)

**Author:** Senior Developer (Codex, GPT-5)
**Status:** P0 IMPLEMENTED LOCALLY (pending deployment validation)
**Scope:** Post-deployment quality concerns after `2026-03-03_UCM_Defaults_Alignment.md`, including "many Quality Issues/errors" reports and job `ab2beed39af946d283ef3ff6ea9d5396`

---

## 1. Executive conclusion

1. **No evidence that UCM defaults alignment itself caused broad quality degradation.**
2. **There is a real quality risk in the current sufficiency gate:** claims can be forced to `UNVERIFIED` despite strong evidence volume/domain diversity if source-type diversity is low.
3. **Most "many quality issues" are warning-volume noise (operational fetch failures), not hard quality failures.**
4. **The `a.map is not a function` crash is a separate reliability bug and must be handled as a fail-open pipeline error path.**

---

## 2. Evidence collected

### 2.1 Timeline (absolute dates)

- `2026-03-03 09:16:31 +0100`: `3085b91` (`fix(ucm): align pipeline defaults with runtime behavior`)
- `2026-03-03 09:57:46 +0100`: `5c3909f` (`refine(prompt): add ambiguous_single_claim`)

### 2.2 Job-level evidence (`apps/api/factharbor.db`)

- Job `ab2beed39af946d283ef3ff6ea9d5396` is **SUCCEEDED** (created `2026-03-03 14:11:38`, completed `14:18:20`).
- Warnings: 6 total (`info`: 4, `warning`: 2, `error`: 0).
- Main quality warning:
  - `insufficient_evidence`: `26 items (min 3), 1 source types (min 2)` -> verdict forced to `UNVERIFIED`.
- For claim `AC_01`:
  - Evidence items: 26
  - Distinct source domains: **9**
  - Distinct source types: **1** (`other`)

Interpretation: evidence quantity and domain diversity are good, but source-type diversity gate is over-blocking.

### 2.3 Warning volume pattern

Across 2026-03-01..2026-03-03 (succeeded jobs):

- `source_fetch_failure`: **233 warnings** (53.6% of all warnings)
- `source_fetch_degradation`: 40 (9.2%)
- Combined fetch-related: **62.8%** of warnings

This is the main reason users perceive "so many issues".

### 2.4 UCM alignment correlation check

For 2026-03-03 jobs split by timestamp:

- Before `09:16:31` (pre-UCM-commit): 8 jobs, avg warnings 12.75
- After `09:57:46` (post-prompt): 4 jobs, avg warnings 9.5

Small sample, but this does **not** support "UCM alignment caused more warnings".

---

## 3. Root causes

### RC-1 (HIGH): Sufficiency gate can produce false `UNVERIFIED`

**File:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (Stage 3/4 boundary: D5 Control 1)

Current rule fails claim when:
- `claimEvidence < minItems` **OR**
- `distinctSourceTypes < minSourceTypes`

Risk:
- Strong evidence from many domains but one source-type bucket (e.g., legal-heavy topics) is downgraded.

### RC-2 (HIGH): Source-type extraction is under-constrained

**Files:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/prompts/claimboundary.prompt.md`

Current extraction schema accepts `sourceType: z.string().optional()` (not enum).
Any non-canonical value maps to `other`, collapsing diversity.

### RC-3 (MEDIUM): Warning flood from per-query fetch failures

**File:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`

A separate `source_fetch_failure` warning is emitted for each query with partial fetch failure.
Operationally normal events dominate visible warning counts.

### RC-4 (MEDIUM): Pre-contrarian imbalance warning can be stale/misleading

**File:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`

`evidence_pool_imbalance` is emitted before contrarian retrieval; post-contrarian rebalance is only logged, not reflected in warning state.

### RC-5 (MEDIUM): SR prefetch severity is too aggressive for partial success

**File:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`

`source_reliability_error` becomes `warning` for small localized failures that often do not materially degrade report quality.

### RC-6 (HIGH): Hard runtime crash path (`a.map is not a function`) lacks fail-open guard

**Impact:** Whole job fails at verdict stage.

Local DB does not contain this exact crash; production stack trace indicates unchecked array-shape assumptions in server execution path.

---

## 4. Why you see "so many Quality Issues/errors"

1. **Operational fetch warnings dominate counts** (over half of all warnings).
2. **One strict gate (`min source types`) can convert good evidence into a quality warning + `UNVERIFIED`.**
3. **Some warnings are emitted before corrective steps (contrarian retrieval), so UI can look worse than final evidence state.**
4. **Real crashes (`a.map`) are mixed into the same user experience, increasing perceived instability.**

---

## 5. Fix plan (prioritized)

## 5.1 P0 - Stabilize true quality regressions (same-day)

1. **Patch sufficiency logic to avoid false `UNVERIFIED` on domain-diverse evidence.**
   - Files:
     - `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
     - `apps/web/src/lib/config-schemas.ts`
     - `apps/web/configs/calculation.default.json`
   - Add config keys:
     - `evidenceSufficiencyMinDistinctDomains` (default `3`)
   - New pass condition:
     - `items >= minItems` AND (`sourceTypes >= minSourceTypes` OR `distinctDomains >= minDistinctDomains`)

2. **Constrain `sourceType` output to enum at schema/prompt boundary.**
   - Files:
     - `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (Stage1 + Stage2 evidence schemas)
     - `apps/web/prompts/claimboundary.prompt.md` (`EXTRACT_EVIDENCE` section)
   - Use enum: `peer_reviewed_study | fact_check_report | government_report | legal_document | news_primary | news_secondary | expert_statement | organization_report | other`
   - Prompt rule: choose one enum value only; use `other` only when none fit.

3. **Add fail-open wrapper for verdict-stage crashes.**
   - File: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
   - Wrap `generateVerdicts(...)` in try/catch.
   - On exception: emit `analysis_generation_failed` warning with stack fingerprint and create explicit fallback verdicts rather than failing whole job.

## 5.2 P1 - Reduce warning noise without hiding real degradation (1-2 days)

1. **Aggregate fetch failures into stage summaries.**
   - File: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
   - Replace many per-query `source_fetch_failure` entries with one summarized warning per stage (`preliminary_fetch`, `research_fetch`) containing counts and top examples.

2. **Emit imbalance warning after contrarian pass result is known.**
   - File: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
   - If contrarian resolves skew below threshold, downgrade to info note or suppress warning.

3. **Tune SR prefetch warning severity by impact ratio.**
   - File: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
   - Suggestion:
     - `info` if failed-domain ratio < 0.25
     - `warning` if 0.25-0.5
     - `error` if >0.5 or evidence collapse indicators present

## 5.3 P2 - UX clarity for quality messaging (1 day)

1. **Group operational notes in UI by type and occurrence count.**
   - Files:
     - `apps/web/src/components/FallbackReport.tsx`
     - `apps/web/src/app/jobs/[id]/page.tsx`
   - Display: `source fetch failures (12 occurrences across 8 queries)` instead of 12 rows.

2. **Separate “Operational Notes” from “Report Quality Degradation”.**
   - Keep hard quality signals prominent (`insufficient_evidence`, `no_successful_sources`, `analysis_generation_failed`).
   - Keep routine recoverable events collapsed by default.

---

## 6. Temporary production mitigations (until code patch lands)

1. In UCM Calculation config, reduce false positives by temporarily setting:
   - `evidenceSufficiencyMinSourceTypes: 1`
2. In UCM Pipeline config, reduce timeout-driven fetch noise on VPS:
   - increase `sourceFetchTimeoutMs` from `20000` to `25000` (or `30000` if acceptable runtime increase)
3. Monitor two metrics daily:
   - jobs with `insufficient_evidence`
   - jobs with provider/error-level warnings

---

## 7. Validation plan and acceptance criteria

1. **Regression set:** rerun at least 12 known inputs (EN/DE, including legal and science-heavy claims).
2. **Quality criteria:**
   - No false `UNVERIFIED` where evidence count >= 10 and distinct domains >= 3.
   - `insufficient_evidence` rate <= 5% on the regression set.
3. **Noise criteria:**
   - Average warnings/job reduced by >= 30%.
   - Operational warnings grouped (no long repetitive lists).
4. **Reliability criteria:**
   - Zero job failures from array-shape runtime errors (`*.map is not a function`) across 100 consecutive analyses.

---

## 8. Recommended execution order

1. Implement P0.1 + P0.3 first (quality + stability).
2. Implement P0.2 (source-type enum hardening).
3. Implement P1 warning aggregation.
4. Implement P2 UI grouping.
5. Re-run validation set and compare before/after metrics.

---

## 9. Decision needed from Captain

1. Approve temporary mitigation (`evidenceSufficiencyMinSourceTypes: 1`) until P0 code fix is deployed.
2. Confirm whether to treat low-ratio SR failures as `info` (recommended) or keep as `warning`.
3. Approve fail-open fallback behavior for verdict-stage runtime exceptions.

### 9.1 Captain decisions (2026-03-03)

1. **Approved:** temporary mitigation `evidenceSufficiencyMinSourceTypes: 1` until P0 code fix is deployed.
2. **Decided:** low-ratio/normal SR partial failures should be **silent** (not `info`, not `warning`) because they are routine.
3. **Approved:** fail-open fallback behavior for verdict-stage runtime exceptions.

---

## 10. Review package (for Gemini / Claude)

### 10.1 Review objective

Validate that the proposed P0-P2 changes:

1. Restore report quality (no false `UNVERIFIED` when evidence is strong).
2. Reduce warning-noise without hiding true degradation.
3. Preserve current localhost-quality behavior except explicit fixes.
4. Maintain multilingual and generic-by-design constraints.

### 10.2 Scope reviewers should inspect

1. Root-cause analysis correctness (RC-1..RC-6).
2. P0 design correctness and risk (especially sufficiency gate update + fail-open behavior).
3. P1/P2 warning-signal design (noise reduction vs observability).
4. Validation criteria adequacy and measurability.
5. Any missing critical controls before implementation.

### 10.3 Required reviewer output format

Use this exact structure:

1. **Verdict:** `APPROVED` | `APPROVED WITH CHANGES` | `BLOCKED`
2. **Findings table:** `Severity (BLOCKER/HIGH/MEDIUM/LOW) | Section | Risk if unresolved | Concrete fix`
3. **P0 code-level corrections:** exact change proposals (field names, conditions, and where to apply)
4. **Quality-preservation check:** explicit statement whether proposed fixes can alter report quality beyond intended remediation
5. **Go-live checklist:** minimal checks required before merging

### 10.4 Constraints to enforce during review

1. No domain-specific hardcoding.
2. No deterministic semantic decision logic beyond structural checks.
3. No hidden weakening of quality gates; only reduce false positives/noise.
4. No writes/side effects in read-only diagnostics paths.
5. Keep behavioral changes minimal and explainable.

---

## 11. External review log

### 11.1 Gemini review (2026-03-03)

**Reviewer verdict:** APPROVED WITH CHANGES

**Accepted findings to apply:**

1. **HIGH (RC-1):** Sufficiency gate over-blocks high-quality reports.
   - Apply gate condition:
   - `(items >= minItems) AND (types >= minTypes OR domains >= minDomains)`

2. **HIGH (RC-2):** `sourceType` extraction unconstrained -> collapses to `other`.
   - Harden Stage 1 and Stage 2 evidence schemas to strict enum values.
   - Align `EXTRACT_EVIDENCE` prompt JSON contract with exact enum values.

3. **HIGH (RC-6):** Runtime shape errors can fail whole job.
   - Add fail-open catch at verdict-stage call site and return explicit fallback `UNVERIFIED` claim verdicts with structured warning.

4. **MEDIUM (RC-4):** Imbalance warning timing can be misleading.
   - Emit/summarize imbalance only after contrarian outcome is known.

**Implementation note (scope correction):**

- Fail-open catch should be applied around the verdict-stage invocation in the pipeline flow (the `generateVerdicts(...)` call site), not as a blanket catch that masks all internals in unrelated paths. Preserve explicit warning telemetry (`analysis_generation_failed`) and include error fingerprint.

### 11.2 Review status after Gemini

1. P0 direction is validated and should proceed.
2. Claude review remains required before final Captain merge decision.
3. Minimal go-live checklist from Gemini is adopted as pre-merge criteria.

### 11.3 Claude review (2026-03-03)

**Reviewer verdict:** APPROVED WITH CHANGES (2 critical implementation constraints)

**Critical findings accepted:**

1. **F1 (HIGH): Do not enforce `sourceType` with raw `z.enum()` at extraction boundary.**
   - Risk: non-canonical but semantically valid LLM values can be rejected and evidence items can be dropped.
   - Required approach:
   - Keep prompt contract strict (enumerated canonical values).
   - Parse `sourceType` permissively, then normalize with explicit mapper (`mapSourceType`) via transform/safe normalization path.
   - Preserve evidence item ingestion; never fail evidence extraction solely due to non-canonical sourceType token.

2. **F2 (HIGH): Define deterministic domain normalization for distinct-domain sufficiency.**
   - Risk: inconsistent domain counting (`www.` variants, malformed URLs) can produce unstable gate outcomes.
   - Required approach:
   - Add `extractDomain()` helper with documented rules (minimum: lowercase hostname + strip leading `www.`).
   - Ignore invalid/empty URLs in domain-count numerator.
   - Document exact meaning of config key `evidenceSufficiencyMinDistinctDomains`.

**Review convergence note:** Claude and Gemini are aligned on core P0 direction (sufficiency gate + source-type hardening + fail-open reliability), with Claude adding boundary-safety constraints for implementation.

---

## 12. Consolidated review decisions (Gemini + Claude)

### 12.1 Final accepted P0 implementation rules

1. **Sufficiency gate update (accepted):**
   - Pass condition becomes:
   - `(items >= minItems) AND (sourceTypes >= minSourceTypes OR distinctDomains >= minDistinctDomains)`
   - Add `evidenceSufficiencyMinDistinctDomains` (default `3`) to calculation config/schema/docs.

2. **SourceType hardening (accepted with Claude constraint):**
   - Prompt-level enum contract is mandatory.
   - Extraction parsing must remain fail-soft for non-canonical sourceType strings.
   - Normalize to canonical internal type via explicit mapping (no evidence-row drops because of sourceType token mismatch).

3. **Fail-open verdict safety (accepted):**
   - Wrap verdict-stage execution in pipeline flow with targeted try/catch.
   - Emit `analysis_generation_failed` warning with error fingerprint.
   - Return explicit fallback verdict objects instead of failing full job.

4. **Domain normalization contract (accepted):**
   - Implement and document `extractDomain()` normalization rules.
   - Use normalized distinct domains for sufficiency gate fallback only.

### 12.2 Items deferred to P1/P2 (unchanged)

1. Warning aggregation for `source_fetch_failure` noise.
2. Post-contrarian timing for `evidence_pool_imbalance`.
3. SR partial-failure visibility tuning (Captain policy: routine low-ratio failures should be unsurfaced).
4. UI grouping of operational notes.

---

## 13. Implementation status (2026-03-03)

### 13.1 P0 implemented

1. Sufficiency gate updated to allow domain-diversity fallback:
   - `(items >= minItems) AND (sourceTypes >= minSourceTypes OR distinctDomains >= minDistinctDomains)`
2. Added config key `evidenceSufficiencyMinDistinctDomains`:
   - `DEFAULT_CALC_CONFIG`: `3`
   - `calculation.default.json`: `3`
3. `sourceType` hardening applied with fail-soft normalization:
   - Prompt contract tightened to canonical sourceType list
   - Extraction schemas remain permissive; normalization maps non-canonical values to canonical set (fallback `other`)
4. Verdict-stage fail-open fallback implemented:
   - Runtime exceptions in verdict generation now emit `analysis_generation_failed` and produce explicit `UNVERIFIED` fallback claim verdicts
5. Captain policy applied:
   - Routine low-ratio SR partial failures are now unsurfaced
   - Temporary mitigation default set: `evidenceSufficiencyMinSourceTypes = 1`

### 13.2 Local verification completed

1. `npm -w apps/web run test -- test/unit/lib/config-schemas.test.ts` -> passed (70/70)
2. `npm -w apps/web run test -- test/unit/lib/analyzer/claimboundary-pipeline.test.ts` -> passed (211/211)
3. `npm -w apps/web run build` -> passed
