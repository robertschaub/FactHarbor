# Senior Developer + LLM Expert Handoff

## Task

Investigate why the Captain-defined input `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben` was failing locally most of the time, compare against the freshly deployed system, and fix the root cause.

## Findings

- Local history on 2026-04-17 was genuinely unstable for the exact input, not just noisy UI.
- Recent local runs included healthy outputs (`MIXED`, `LEANING-FALSE`) and multiple hard failures with `report_damaged`, `0` evidence, `0` boundaries, and `UNVERIFIED 50/0` job summaries.
- Failed jobs inspected: `1d9d9389c98249c59bed17d4633a52cc`, `4ede21198ace49858be28cc0afdab2d2`, `ebb1a0f8c3704adb94df317d613484ac`.
- Successful comparison jobs inspected: `c9657f31586c492c8ab130cf5b8dc98d`, `d803d53a75684cf5ab52a8e15688e3d6`, `ea0238551af44a9793d27afa0fde5cb0`.
- The common failure shape was Stage 1 contract collapse around the truth-condition-bearing modifier `rechtskräftig`.
- Root cause was structural, not prompt drift: after a repair-approved claim set restored the anchor carrier, later structural filters could still silently drop that repaired carrier.
- There were two drop points:
  - `filterByCentrality(...)` could remove a repair-produced anchor carrier if it was lower-centrality or exceeded the cap.
  - Gate 1 could remove that same carrier on specificity, and the post-Gate-1 reconciliation helper had an early return that discarded restored carriers whenever there were no fidelity failures.

## Changes

### Code

Updated `apps/web/src/lib/analyzer/claim-extraction-stage.ts`:

- Added optional `requiredClaimIds` support to `filterByCentrality(...)`.
- When Stage 1 has a contract-approved repair result (`stageAttribution === "repair"`, `preservesContract === true`, `rePromptRequired === false`), the valid anchor-carrier claim IDs are now protected through centrality capping.
- Extended the post-Gate-1 reconciliation helper so repair-approved anchor carriers are restored after structural filtering.
- Fixed the helper's stale early-return path that previously threw away restored carriers when Gate 1 reported zero fidelity failures.

### Tests

Updated `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`:

- Added unit coverage proving `filterByCentrality(...)` preserves required repair carrier claims through the cap.
- Added an extractClaims regression test reproducing the Bundesrat-style path where a repaired low-centrality anchor carrier would otherwise be lost by centrality + Gate 1 filtering.

## Validation

- `npm test -- claimboundary-pipeline.test.ts`
  - Result: passed (`349` passed, `1` skipped)
- `npm -w apps/web run build`
  - Result: passed

## Deployed Notes

- Inspected `https://app.factharbor.ch/jobs` after the morning deploy.
- The deployed history still shows older Bundesrat variants with earlier overly-true outcomes (`TRUE` / `MOSTLY TRUE`) from 2026-04-09.
- No fresh live rerun of the exact Captain-defined Bundesrat input was executed on deployed during this session.
- Local browser inspection also surfaced a separate UI/runtime issue: completed job pages keep an `EventSource` open against `/api/fh/jobs/[id]/events`, which can later produce repeated `ERR_INCOMPLETE_CHUNKED_ENCODING` noise. That issue was not part of this fix.

## Warnings

- Direct SQLite inspection via local Node was blocked by a `better-sqlite3` ABI mismatch on this machine, so job comparisons were done via the web/API layer instead of raw DB queries.
- This fix targets the dominant local hard-failure mode (`report_damaged` after anchor loss). It does not by itself resolve all verdict variability for this family.

## Learnings

- A repair-approved claim set is not safe unless later structural filters are explicitly prevented from dropping the repaired anchor carrier.
- For this family, the key failure was not “repair prompt weak again” but “repair output can still be structurally discarded afterward.”
- When diagnosing Bundesrat regressions, inspect recent job summaries first: the coexistence of healthy and `report_damaged` runs is a strong sign of Stage 1 instability rather than a global provider outage.
