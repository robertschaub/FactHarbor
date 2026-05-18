# Lead Developer Handoff - V2 X7-W3-A Safe Locator Materialization Preview Source Package

**Date:** 2026-05-18
**Role:** Lead Developer / Captain Deputy
**Task:** Prepare a narrow W3-A implementation package for Steering Board review only.
**Status:** Review package prepared; no implementation and no live jobs authorized.

## Summary

Prepared `Docs/WIP/2026-05-18_V2_Slice_X7-W3-A_Safe_Locator_Materialization_Preview_Source_Package.md`.

The package narrows the amended W3 direction to Tier 0 only: safe locator materialization from provider-owned Wikimedia search candidates already present during W2 response handling, plus bounded hidden/admin-only preview diagnostics.

It explicitly keeps W3-A diagnostic-only. W3-A may produce `source_candidate_preview` diagnostics and opaque locator refs, but must not create Source Material records, make an extra HTTP call, fetch page summaries, parse content, populate EvidenceCorpus or EvidenceItems, generate reports/verdicts/warnings/confidence, write public output, use cache/SR/storage, add retries, add a second provider, or touch V1.

## Key Package Decisions

- W3-A should use a projection-hook architecture rather than returning raw candidate objects from transport.
- Candidate materialization must happen inside the provider-owned W2 response handling call stack.
- Raw page keys, URLs, provider JSON, headers, secrets, source text, evidence text, report text, verdicts, and confidence values are forbidden in artifacts.
- Raw page keys are hash/ref only; bounded title/excerpt/description previews may be hidden/admin-only if structurally accepted and sanitized.
- Tier 0 search-result preview remains not Source Material.
- W3-B page-summary fetch remains blocked until a later reviewed package.

## Files Changed

- `Docs/WIP/2026-05-18_V2_Slice_X7-W3-A_Safe_Locator_Materialization_Preview_Source_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W3-A_Safe_Locator_Materialization_Preview_Source_Package.md`
- `Docs/AGENTS/index/handoff-index.json`

## Verification

- Official Wikimedia reference was checked: the current page-search endpoint documents `limit` as a GET query parameter and search result examples with `id`, `key`, `title`, `excerpt`, and `description`.
- No source implementation was made.
- No live job was run.
- Planned local checks for this docs-only package: `npm run index`, `git diff --check`, and final git status.

## Warnings

Do not implement from the broader W3 steering package alone. W3-A still requires Steering Board approval of the specific W3-A package before source edits.

Do not treat W3-A preview diagnostics as Source Material. Search-result excerpts are provider search previews, not fetched source bodies.

Do not run the optional W3-A canary until after W3-A is approved, implemented, verified, committed, runtime-refreshed, and route-preflighted. The canary would consume 1 of the 6-job tranche.

## Learnings

The safest bridge from W2 candidates to Source Material is not "return candidate objects downstream." It is an immediate bounded projection while the provider-owned candidate object is still in the W2 response handler, followed by dropping the raw candidate. This keeps W3-A useful for human diagnostics without creating a raw provider-payload propagation path.
