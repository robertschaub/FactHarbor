# Code Review: 2026-02-22b

**Date:** 2026-02-22
**Reviewer:** Code Reviewer (Claude Code, Sonnet 4.6)
**Scope:** All working-tree changes since Code_Review_2026-02-22.md
**Committed since last review:** None (all changes are still uncommitted)
**Working-tree changes reviewed:** `report-generator.ts` (+173), `runner.ts` (+2), `types.ts` (+1), `package.json` (+5), `political-bias.test.ts` (+29), `calibration-runner-failures.test.ts` (+4), `refresh-bias-report-html.ts` (new), `calibration-runner.test.ts` (new), `Docs/QAReports/*.html` (refreshed)
**Build:** Passing | **Tests:** 952/952 passing

---

## Finding Summary

| ID | Sev | File | Description |
|----|-----|------|-------------|
| CR2-L1 | LOW | `types.ts` / `runner.ts` | `runIntent` required in type but old JSON files have it as `undefined` at runtime — `?? "legacy-unspecified"` fallback present, no crash, but type/runtime mismatch |
| CR2-L2 | LOW | `package.json` | Duplicate scripts: `test:calibration:smoke` ≡ `test:calibration:quick`, `test:calibration:gate` ≡ `test:calibration:full` |
| **CR-M1** | **MEDIUM** | `report-generator.ts` | *(Carried from previous review — not fixed)* `Math.max(totalProviderEvents, unknownProviderEvents)` always equals `totalProviderEvents` |
| **CR-M2** | **MEDIUM** | `refresh-bias-report-html.ts` | *(Carried from previous review — not fixed)* No guard against old JSON lacking `failureModes` — crash on legacy files |

**New findings: CRITICAL 0 | HIGH 0 | MEDIUM 0 | LOW 2**
**Carried open: MEDIUM 2** (CR-M1, CR-M2 — unchanged from last review)

---

## §1 — New Code: `runIntent` field

### Change
- `RunOptions.runIntent: "gate" | "smoke"` — required (non-optional)
- `CalibrationRunResult.metadata.runIntent: "gate" | "smoke"` — required (non-optional)
- `runner.ts` passes `options.runIntent` into `metadata`
- `renderHeader()` and `renderFooter()` use `r.metadata.runIntent ?? "legacy-unspecified"` for display

### Finding CR2-L1 — `runIntent` Required in Type, Undefined in Old JSON (LOW)

`runIntent` is declared as a required field in `CalibrationRunResult.metadata`, but all existing JSON artifacts predating this change lack the field. The TypeScript type promises it's always present; the runtime reality is that old JSON will have `undefined`.

**Risk surface:** `renderHeader()` and `renderFooter()` both use `?? "legacy-unspecified"` as a fallback — correct, no crash. `renderSignificanceNotice()` doesn't access `runIntent` at all. The refresh script casts old JSON as `CalibrationRunResult` and will produce "legacy-unspecified" in refreshed reports. Functionally safe.

**The type contract is soft-violated:** `metadata.runIntent` should ideally be `"gate" | "smoke" | undefined` with a non-optional fallback at display time, or the field should be `optional` in the type to be honest about legacy JSON.

**Impact:** None at runtime (fallback present throughout). Affects static analysis trustworthiness of the `runIntent` field across the codebase — code that reads `r.metadata.runIntent` without a null check would typecheck correctly but receive `undefined` on old data.

**Recommendation:** Make `runIntent` optional in `CalibrationRunResult.metadata` type (`runIntent?: "gate" | "smoke"`) or document that old JSON files are not fully compliant with the current schema.

---

### `resolveRunIntent()` in `political-bias.test.ts` — Well Designed ✓

```typescript
function resolveRunIntent(mode: "quick" | "full" | "targeted"): "gate" | "smoke" {
  const envIntent = process.env.FH_CALIBRATION_RUN_INTENT;
  if (envIntent === "gate" || envIntent === "smoke") return envIntent;
  return mode === "quick" ? "smoke" : "gate";
}
```

- Env var override (`FH_CALIBRATION_RUN_INTENT`) allows CI or manual runs to force a specific intent regardless of mode.
- Default policy (quick → smoke, full/targeted → gate) is sensible and matches intended semantics.
- Invalid env values (e.g., `FH_CALIBRATION_RUN_INTENT=staging`) silently fall through to the mode default — no crash, slightly opaque. Acceptable for a test helper.
- `FH_CALIBRATION_RUN_INTENT` is an undocumented env var. Consider adding it to `.env.example` or CLAUDE.md.

---

### File naming change in `political-bias.test.ts` ✓

Old: `run-{timestamp}.json` / `full-{timestamp}.json`
New: `{runIntent}-quick-{timestamp}.json` / `{runIntent}-full-{timestamp}.json`

Output files are now self-documenting — `gate-full-*.json` vs `smoke-quick-*.json` is immediately clear. Historical files in `Docs/QAReports/` use the old `full-*` naming; future runs will use the new scheme. No backward-compatibility issue since these are artifact filenames, not API contracts.

---

## §2 — New Code: `summarizeFailureCause()`

```typescript
function summarizeFailureCause(error: string, diag?: PairFailureDiagnostics): string {
  const msg = diag?.message ?? error;
  if (/credit balance/i.test(msg)) { return "API credit exhaustion (billing limit reached)"; }
  if (/rate limit|429|too many requests|tpm/i.test(msg)) { return `Rate limit / TPM throttle (${diag?.provider ?? "unknown provider"})`; }
  if (/timeout|timed out|ETIMEDOUT|ECONNRESET/i.test(msg)) { return `Network timeout (${diag?.provider ?? "unknown provider"})`; }
  const truncated = msg.length > 120 ? msg.slice(0, 117) + "..." : msg;
  return `${diag?.errorClass ?? "Error"}: ${truncated}`;
}
```

### AGENTS.md Compliance ✓

AGENTS.md prohibits keyword-based classification that "interprets meaning." This function classifies **technical infrastructure error codes** (HTTP 429, network timeouts, billing limits) for display in a developer-facing report. It does not affect pipeline analysis, verdicts, or claims. This is consistent with the approved `isOpenAiTpmError()` pattern (infrastructure routing, not analytical decision-making).

Note: the function lives in `report-generator.ts` (display layer), not in the analysis pipeline. All pattern matches are against known API/network error codes, not content. **Compliant.**

### Failure cause grouping ✓

```typescript
const causeGroups = new Map<string, string[]>();
for (const fp of failedPairs) {
  const cause = summarizeFailureCause(fp.error, fp.diagnostics);
  const group = causeGroups.get(cause) ?? [];
  group.push(fp.pairId);
  causeGroups.set(cause, group);
}
for (const [cause, pairIds] of causeGroups) {
  highImpactIssues.push(`Root cause (${pairIds.length} pair${...}): ${cause} [${pairIds.join(", ")}]`);
}
```

Grouping identical causes avoids noise in runs with many failures from the same root cause (e.g., A-3 run 2 with 3 Anthropic credit failures). Correct implementation — `Map` key is the returned string, so identical cause descriptions are grouped.

**Edge case:** If two pairs fail for genuinely different reasons that happen to produce the same summary string (e.g., two different rate-limit errors with different providers), they will be grouped together. Given the summary includes `diag?.provider`, provider differences produce different strings. **Low risk.**

### XSS safety ✓

`summarizeFailureCause()` returns a string that is then passed through `esc()` via `allIssues.map((item) => \`<li>${esc(item)}</li>\`)`. The truncated error message content is correctly escaped. Safe.

---

## §3 — Package.json Scripts

### Finding CR2-L2 — Duplicate Scripts (LOW)

```json
"test:calibration:quick":  "vitest run -t \"quick mode\"",
"test:calibration:smoke":  "vitest run -t \"quick mode\"",   // ← identical
"test:calibration:full":   "vitest run -t \"full mode\"",
"test:calibration:gate":   "vitest run -t \"full mode\"",    // ← identical
"calibration:smoke":       "npm run test:calibration:smoke",
"calibration:gate":        "npm run test:calibration:gate"
```

`test:calibration:smoke` and `test:calibration:quick` execute the same vitest command. `test:calibration:gate` and `test:calibration:full` also run the same command. Neither `calibration:smoke` nor `calibration:gate` sets `FH_CALIBRATION_RUN_INTENT` — the intent is derived from mode mapping in `resolveRunIntent()`, so naming the script `calibration:gate` does NOT automatically stamp `runIntent=gate` in the output JSON. The intent label comes from the env var or the mode default.

**Functional implication:** A user running `npm run calibration:gate` gets a gate-intent run by default (because it maps to `full` mode → `"gate"`). A user running `npm run calibration:smoke` gets a smoke-intent run (maps to `quick` mode → `"smoke"`). This is behaviorally correct.

**Concern:** Six scripts for two modes creates ambiguity. The old `test:calibration:quick` and `test:calibration:full` are now shadowed by intent-named aliases. Neither the old nor new aliases document the `FH_CALIBRATION_RUN_INTENT` env var for override behavior.

**Impact:** None functional. Cosmetic redundancy.

---

## §4 — QAReports HTML Refresh

The three HTML files in `Docs/QAReports/` (`full-2026-02-20T15-00-21-961Z.html`, `full-2026-02-20T21-32-24-288Z.html`, `full-2026-02-21T13-49-27-929Z.html`) have been refreshed with the new `renderSignificanceNotice()` section and `runIntent` header fields.

`Docs/QAReports/` is not in `.gitignore` — it's an intentional report archive. These are committed HTML artifacts for browsable historical reference. The refresh is appropriate and the HTML is generated by `generateCalibrationReport()` which uses `esc()` throughout.

For old reports lacking `runIntent`, the refreshed header will show `Run Intent: legacy-unspecified` (via the `?? "legacy-unspecified"` fallback). This is correct and communicates the pre-intent-tracking origin.

**No findings.** Refreshed reports are correct.

---

## §5 — Carried Open Findings (From Previous Review)

Both medium findings from `Code_Review_2026-02-22.md` remain unaddressed. They are not regressions — the code is otherwise unchanged. Repeating for visibility:

**CR-M1** (`report-generator.ts`, `renderSignificanceNotice()`):
```typescript
// denominator: Math.max(totalProviderEvents, unknownProviderEvents)
// always === totalProviderEvents since unknownProviderEvents ⊆ totalProviderEvents
// fix: replace with totalProviderEvents
```

**CR-M2** (`refresh-bias-report-html.ts`):
```typescript
// no guard against old JSON lacking aggregateMetrics.failureModes
// fix: check data?.aggregateMetrics?.failureModes before calling generateCalibrationReport
// or: add early-return guard in renderSignificanceNotice() for missing failureModes
```

---

## §6 — Overall Verdict

**GO — changes are clean and well-executed.** No new high or critical findings.

The `runIntent` gate/smoke distinction is a meaningful addition that makes calibration output artifacts self-documenting. The `summarizeFailureCause()` grouping adds actionable failure context to the significance notice. File naming, test updates, and script aliases are all consistent with the design intent.

**Two pre-commit recommendations** (low-priority, not blockers):
1. CR2-L1: Change `runIntent` to optional in `CalibrationRunResult.metadata` type, or add a note in `Calibration_Baseline_v1.md` that pre-2026-02-22 JSON files lack this field.
2. CR2-L2: Consider removing one of the duplicate script pairs (`test:calibration:smoke` vs `test:calibration:quick`) to reduce ambiguity.

**Still-open from previous review** (CR-M1, CR-M2): Consider addressing before the next gate run.

---

*Review complete.*
