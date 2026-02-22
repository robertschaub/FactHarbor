# Code Review: 2026-02-22

**Date:** 2026-02-22
**Reviewer:** Code Reviewer (Claude Code, Sonnet 4.6)
**Scope:** All changes since `edb6a50` (Pre-A-3 Phase-1 focused review)
**Commits reviewed:** `af20656`, `913483d`, `df30245` (all docs-only — see §1)
**Working-tree changes reviewed:** `report-generator.ts`, `refresh-bias-report-html.ts`, `package.json`, `calibration-runner.test.ts` (uncommitted)
**Focus:** Report Significance Notice implementation and refresh utility

---

## §1 — Committed Changes (`af20656`, `913483d`, `df30245`)

All three commits are **documentation only**. No code changes.

| Commit | Subject | Verdict |
|--------|---------|---------|
| `af20656` | Knowledge docs consolidation and reorganization | Docs-only — no review required |
| `913483d` | Committed WIP code reviews, debate analysis, codex review | Docs-only — no review required |
| `df30245` | A-3 cross-provider Gate 1 result — NO-GO | Docs-only — no review required |

No code findings from committed changes.

---

## §2 — Uncommitted Code Changes (Working Tree)

### Files Changed
| File | Change | Lines |
|------|--------|-------|
| `apps/web/src/lib/calibration/report-generator.ts` | `renderSignificanceNotice()` + CSS | +128 |
| `apps/web/scripts/refresh-bias-report-html.ts` | New refresh utility script | +50 |
| `apps/web/package.json` | New `test:calibration:refresh-html` script | +1 |
| `apps/web/test/unit/lib/calibration-runner.test.ts` | New tests for `resolveLLMConfig` | +58 (untracked) |

**Test suite:** 952 tests passing (48 files) — no regressions.

---

## §3 — Findings

### Finding Summary

| ID | Severity | File | Description |
|----|----------|------|-------------|
| CR-M1 | MEDIUM | `report-generator.ts` | `Math.max()` denominator always equals `totalProviderEvents` — redundant defensive guard |
| CR-M2 | MEDIUM | `refresh-bias-report-html.ts` | No guard against old JSON lacking `failureModes` — crash risk on legacy files |
| CR-L1 | LOW | `calibration-runner.test.ts` | Test coverage narrow: only mistral and unknown-provider paths |
| CR-L2 | LOW | `report-generator.ts` | `decisionGrade` variable is logically redundant (equivalent to `highImpactIssues.length === 0`) |

**CRITICAL:** 0 | **HIGH:** 0 | **MEDIUM:** 2 | **LOW:** 2

---

### CR-M1 — Redundant `Math.max` in Unknown-Provider Percentage (MEDIUM)

**File:** `apps/web/src/lib/calibration/report-generator.ts` — `renderSignificanceNotice()`

**Code:**
```typescript
if (unknownProviderEvents > 0) {
  const pct = totalProviderEvents > 0
    ? (unknownProviderEvents / totalProviderEvents) * 100
    : 100;
  issues.push(
    `Provider attribution incomplete: ${unknownProviderEvents}/${Math.max(totalProviderEvents, unknownProviderEvents)} failure-mode event(s) ...`
  );
}
```

**Problem:** `Math.max(totalProviderEvents, unknownProviderEvents)` always equals `totalProviderEvents`. Reason: `unknownProviderEvents` is extracted from `fm.byProvider.unknown.totalEvents`, which is counted by the same loop that builds `totalProviderEvents`. The "unknown" bucket is therefore always a subset of `totalProviderEvents`, so `totalProviderEvents >= unknownProviderEvents` invariably.

The defensive use of `Math.max` implies a scenario (unknown > total) that cannot occur given the data model.

**Impact:** No functional effect — the denominator displayed is always correct. Cosmetic only.

**Fix:** Replace `Math.max(totalProviderEvents, unknownProviderEvents)` with `totalProviderEvents`.

---

### CR-M2 — Refresh Script Lacks Guard Against Legacy JSON (MEDIUM)

**File:** `apps/web/scripts/refresh-bias-report-html.ts`

**Code:**
```typescript
const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as CalibrationRunResult;
const html = generateCalibrationReport(data);
```

**Problem:** The `as CalibrationRunResult` cast provides no runtime validation. `generateCalibrationReport()` now calls `renderSignificanceNotice()`, which immediately accesses:
```typescript
const fm = am.failureModes;
// ...
fm.asymmetryPairCount   // TypeError if fm is undefined
```

The `failureModes` field was added to `AggregateMetrics` during the calibration harness feature. Any JSON generated before that feature (e.g., a pre-feature baseline run saved to the output directory) would lack `failureModes`, causing the refresh script to crash with an unhandled TypeError.

**Current risk:** Low in practice — all JSON files in `test/output/bias/` were generated post-feature. But the script is designed to process ALL JSON files in the directory and is intended to be reusable for future refresh operations, making this a latent correctness risk.

**Fix:** Add a guard in `renderSignificanceNotice()` or the refresh script itself:
```typescript
// Option A: in renderSignificanceNotice(), guard the failureModes access
const fm = am.failureModes;
if (!fm) {
  return `<section class="significance-banner significance-ok">
    <h2>Report Significance</h2>
    <p>Failure-mode metrics not available for this run (pre-feature baseline).</p>
  </section>`;
}
```
Or more narrowly, in the refresh script:
```typescript
if (!data?.aggregateMetrics?.failureModes) {
  console.warn(`  skipping ${path.basename(htmlPath)} — no failureModes (pre-feature JSON)`);
  continue;
}
```

---

### CR-L1 — Narrow Test Coverage for `resolveLLMConfig` (LOW)

**File:** `apps/web/test/unit/lib/calibration-runner.test.ts`

**Tests present:**
1. Mistral challenger, sonnet tier → `mistral-large-latest`
2. Mistral validation, haiku tier → `mistral-small-latest`
3. Unknown provider → anthropic fallback (`claude-haiku-*`)

**Missing paths:**
- Anthropic standard case (the default for most runs) — no explicit test that baseline config resolves correctly
- OpenAI standard case (`OPENAI_MODELS` premium/budget lookup)
- Google/Gemini case (`GOOGLE_MODELS` premium/budget lookup)
- Explicit `debateModelTiers` for a non-mistral provider (e.g., openai haiku → budget model)

The three tests exercise the correct paths they claim to test, and the assertions are accurate. Coverage is nonetheless narrow for a public function that is now stable enough to export and test.

**Severity rationale:** Low — the tested paths cover the edge cases that actually needed verification (mistral, unknown). The anthropic path was implicitly tested by existing pipeline tests.

---

### CR-L2 — `decisionGrade` Variable Is Logically Redundant (LOW)

**File:** `apps/web/src/lib/calibration/report-generator.ts` — `renderSignificanceNotice()`

**Code:**
```typescript
const decisionGrade =
  am.failedPairs === 0
  && am.completedPairs === am.totalPairs
  && fm.asymmetryPairCount === 0
  && fm.meanDegradationRateDelta <= t.maxDegradationRateDelta
  && fm.meanRefusalRateDelta <= t.maxRefusalRateDelta;
```

These four conditions are the exact logical negations of the four conditions that push to `highImpactIssues`. Since we only reach this code when `allIssues.length > 0`, `decisionGrade` is equivalent to `highImpactIssues.length === 0`. The two-condition structure (one for building the issue list, one for the boolean) is correct but produces no additional information — the variable could be eliminated by checking `highImpactIssues.length` directly.

**Impact:** Zero — the resulting rendered HTML is correct. Readability concern only.

**Note:** The logic is NOT wrong. I verified (De Morgan): `!(failedPairs > 0 || completedPairs < totalPairs)` ≡ `failedPairs === 0 && completedPairs === totalPairs`. All four pairings are consistent.

---

## §4 — Report Significance Notice: Quality Assessment

The user specifically asked for a quality check on the significance notice implementation. Assessment below.

### What It Does

`renderSignificanceNotice()` renders a prominently placed banner (after the header, before LLM config) that assesses whether a calibration run has decision-grade significance. Three visual states:
- `significance-ok` (green): No issues detected.
- `significance-warn` (amber): Only informational issues (unknown provider attribution, SR degradation) — decision-grade criteria still met.
- `significance-high` (red): High-impact issues present — decision-grade criteria NOT met.

### Correctness Checklist

| Condition | Implementation | Verdict |
|-----------|---------------|---------|
| Incomplete execution | `am.failedPairs > 0 \|\| am.completedPairs < am.totalPairs` | ✓ Correct |
| Failure-mode asymmetry | `fm.asymmetryPairCount > 0` | ✓ Correct |
| Degradation-rate delta threshold | `fm.meanDegradationRateDelta > t.maxDegradationRateDelta` | ✓ Correct — uses `r.thresholds` |
| Refusal-rate delta threshold | `fm.meanRefusalRateDelta > t.maxRefusalRateDelta` | ✓ Correct — uses `r.thresholds` |
| Unknown provider attribution | `fm.byProvider.unknown.totalEvents > 0` | ✓ Correct — informational |
| SR degradation events | `fm.byStage.research_sr?.degradationCount` | ✓ Correct — see detailed verification below |

### SR Degradation Verification (Deep-Checked)

The `fm.byStage.research_sr?.degradationCount` check requires multi-module tracing:

1. **Data source:** `r.aggregateMetrics` comes from `computeAggregateMetrics()` in `calibration/metrics.ts`.
2. **Stage key:** `calibration/metrics.ts` `extractStage()` has `case "source_reliability_error": return "research_sr"`. Since `source_reliability_error` warnings also include `details.stage: "research_sr"` (explicit), both the switch and the explicit path agree.
3. **Degradation classification:** `calibration/metrics.ts` `DEGRADATION_WARNING_TYPES` includes `source_reliability_error`, `source_fetch_failure`, and `source_fetch_degradation` — so SR errors ARE counted as `degradation = true`.
4. **Result:** `byStage.research_sr.degradationCount` is correctly populated when SR errors occur during calibration runs.

**Verdict: Correct.** The `research_sr` stage key and `degradationCount` field are both populated correctly by the calibration metrics pipeline.

> Note: `analyzer/metrics-integration.ts` has a diverging (smaller) `DEGRADATION_WARNING_TYPES` set — a pre-existing issue (flagged as A2-H1 in Code_Review_2026-02-21.md). This divergence does NOT affect the significance notice since it uses calibration aggregate metrics, not production pipeline metrics.

### Severity Classification Logic

The three-tier severity classification is logically consistent:
- `decisionGrade = true` iff `highImpactIssues.length === 0` (verified equivalent — see CR-L2)
- `severityClass = "significance-high"` iff `highImpactIssues.length > 0`
- `severityClass = "significance-warn"` iff `highImpactIssues.length === 0 && issues.length > 0`
- `significance-ok` returned early iff `allIssues.length === 0`

All four states are mutually exclusive and exhaustive. The `decisionText` accurately reflects the `decisionGrade` boolean.

### XSS Safety

All user-derived or computed values passed to the HTML template are wrapped with `esc()`:
- `esc(decisionText)` — unnecessary (hardcoded literal) but harmless
- `allIssues.map((item) => \`<li>${esc(item)}</li>\`)` — correct

Numeric values (`.toFixed()`, `.toFixed(0)`) are injected as strings built from safe arithmetic — no user content.

**XSS verdict: Safe.**

### CSS Implementation

Colors match the existing dark report theme:
- `significance-ok`: `background: #123226` (dark green) + `var(--pass)` border
- `significance-warn`: `background: #3a2a12` (dark amber) + `var(--warn)` border
- `significance-high`: `background: #3d1b1b` (dark red) + `var(--fail)` border

Consistent with `--pass`, `--warn`, `--fail` CSS variables used in verdict banners. ✓

### Refresh Utility

`refresh-bias-report-html.ts` is clean and single-purpose:
- Reads JSON, regenerates HTML, writes in-place — no other side effects
- Follows same `__dirname` pattern as the existing `backfill-bias-reports.ts` (which uses `npx tsx`, which provides `__dirname` in ESM context)
- `package.json` script name `test:calibration:refresh-html` follows existing naming conventions

Only concern: no validation of JSON structure before rendering (CR-M2).

---

## §5 — Overall Verdict

**GO — ready to commit.** The Report Significance Notice is well-implemented:
- Logic is correct and internally consistent
- SR degradation check (the most complex condition) is verified end-to-end
- XSS prevention is applied correctly
- Visual classification into three severity tiers is accurate
- Refresh utility is clean and minimal

**Pre-commit recommended fixes** (neither is blocking):
1. **CR-M1** (2 min): Replace `Math.max(totalProviderEvents, unknownProviderEvents)` → `totalProviderEvents` in the issue message string.
2. **CR-M2** (5 min): Add a `failureModes` presence guard in `renderSignificanceNotice()` or the refresh script to handle legacy JSON gracefully.

**Post-commit backlog:**
- CR-L1: Add anthropic standard, OpenAI, and Google test cases to `calibration-runner.test.ts`.
- CR-L2: Simplify `decisionGrade` to `highImpactIssues.length === 0`.
- Pre-existing: Unify `DEGRADATION_WARNING_TYPES` between `calibration/metrics.ts` and `analyzer/metrics-integration.ts` (A2-H1 from Code_Review_2026-02-21.md — add `source_reliability_error`, `source_fetch_failure`, `source_fetch_degradation` to the analyzer version).

---

*Review complete.*
