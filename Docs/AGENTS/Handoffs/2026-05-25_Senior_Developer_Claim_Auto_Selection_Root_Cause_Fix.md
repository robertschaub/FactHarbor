---
date: 2026-05-25
role: Senior Developer + LLM Expert
agent: Codex (GPT-5)
status: implemented
open_items: yes
---

# Claim Auto-Selection Root-Cause Fix Implementation

## Summary

Implemented the approved Stage 1.5 automatic claim-selection root-cause fix on `main`.

The selector now uses a tolerant provider-facing wire schema and strict FactHarbor post-parse validation. Optional transparency prose no longer decides whether Stage 2 research can run.

## Files Changed

- `apps/web/src/lib/analyzer/claim-selection-recommendation.ts`
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/lib/config-schemas.ts`
- `apps/web/configs/pipeline.default.json`
- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/test/unit/lib/analyzer/claim-selection-recommendation.test.ts`
- `apps/web/test/integration/claim-auto-selection-pipeline.test.ts`
- `apps/web/test/unit/lib/config-schemas.test.ts`

Existing generated index files were already dirty before implementation and remain outside the core code change.

## Implementation Details

- Replaced the strict selector output schema with a tolerant wire schema:
  - no `.strict()`;
  - rationale fields optional;
  - `null` optional fields normalize as absent;
  - `redundancyWithClaimIds: null` normalizes to `[]`;
  - extra fields are ignored.
- Kept strict FactHarbor validation after parse:
  - `rankedClaimIds` must cover every evaluated candidate exactly once;
  - `recommendedClaimIds` must be known, unique, ordered by rank, and within cap;
  - assessments must cover every evaluated candidate;
  - redundancy references must be known and non-self.
- Added structural enum normalization for selector labels:
  - casing drift;
  - hyphen/space/underscore drift;
  - camelCase drift.
- Kept semantic label drift rejected, for example `mostly_check_worthy`.
- Made per-assessment rationale optional and truncated only for display when present.
- Added generated fallback dropped-claim rationales from selector triage/rank/redundancy when LLM prose is absent.
- Added bounded redacted selector diagnostics:
  - admin/metrics-only via `recordLLMCall.errorMessage`;
  - base error text and diagnostic preview are redacted and capped;
  - preview priority is structured output, result text, error payload/cause, then error.
- Lowered `claimAutoSelectionCandidateCap` default from 25 to 12 while keeping the UCM maximum at 25.
- Updated `CLAIM_SELECTION_RECOMMENDATION` so rationales are optional transparency metadata, not mandatory execution fields.

## Failed-Attempt Recovery

First focused validation failed one new diagnostic test because the diagnostic preview was capped but the base error message remained unbounded. Classification: keep the implementation, amend the diagnostic formatter. The fix now caps/redacts both the base error text and the appended preview.

## Verification

Passed:

- `npm -w apps/web test -- claim-selection-recommendation.test.ts claim-auto-selection-pipeline.test.ts config-schemas.test.ts`
- `npm -w apps/web run build`
- `npm test`
- `git diff --check`

Build also ran the postbuild prompt/config reseed hook:

- `claimboundary` prompt refreshed from file with hash prefix `79a85162b1d8`
- default pipeline config refreshed

## Open Items

- Commit is not created yet.
- Live canary jobs were not submitted in this implementation step.
- If real selector failures persist after this fix, inspect the new diagnostics first. If the remaining failure is ID coverage drift, reduce the default candidate cap toward 8. If it is mostly label-shape drift under load, consider a narrow Stage 1.5 model-route adjustment as a follow-up.

