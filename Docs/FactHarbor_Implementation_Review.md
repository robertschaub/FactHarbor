# FactHarbor Implementation Review (Updated)

**Date**: 2026-01-06
**Scope**: Review updated after `Docs/KeyFactors-Design-Decision.md` and current implementation in `apps/web/src/lib/analyzer.ts`.

## Sources Reviewed
- `Docs/KeyFactors-Design-Decision.md`
- `apps/web/src/lib/analyzer.ts`
- `apps/web/src/lib/analyzer/quality-gates.ts`
- `apps/web/src/lib/analyzer/truth-scale.ts`
- `apps/web/src/lib/analyzer/source-reliability.ts`
- `apps/web/src/components/ClaimHighlighter.tsx`
- `apps/web/src/app/jobs/[id]/page.tsx`
- `LLM_REPORTING.md`

## Findings (Ordered by Severity)

### High
1) **KeyFactors in article mode are discarded by schema**
   - The claim-verdict schema does not define `keyFactors`, but the prompt requires them and the code reads `parsed.keyFactors`. This guarantees factors are dropped even if the model outputs them.
   - Impact: KeyFactors effectively never surface for articles, regardless of prompts.
   - Locations: `apps/web/src/lib/analyzer.ts:2880`, `apps/web/src/lib/analyzer.ts:4346`

2) **Prompt allows `FALSE`, schema rejects it**
   - The claim-verdict prompt tells the model to use `FALSE` in rare cases, but the schema only accepts `WELL-SUPPORTED | PARTIALLY-SUPPORTED | UNCERTAIN | REFUTED`.
   - Impact: Any `FALSE` response fails schema parsing and triggers fallback (all claims UNCERTAIN).
   - Locations: `apps/web/src/lib/analyzer.ts:3834`, `apps/web/src/lib/analyzer.ts:2880`

3) **Source reliability scale mismatch breaks Gate 4**
   - Source scores are documented as 0-1 but Gate 4 divides by 100, collapsing quality to ~0-0.01. This pushes verdicts toward LOW/INSUFFICIENT.
   - Impact: publishability stats are distorted and claims are unfairly downgraded.
   - Locations: `apps/web/src/lib/analyzer/quality-gates.ts:217`, `apps/web/src/lib/analyzer.ts:494`, `Docs/Source Reliability Bundle.md`

4) **`FH_REPORT_STYLE=rich` not implemented**
   - The docs describe a second LLM pass for a rich report, but implementation only toggles icons.
   - Impact: configuration promises behavior that does not exist.
   - Locations: `LLM_REPORTING.md`, `apps/web/src/lib/analyzer.ts:4401`

### Medium
1) **KeyFactors design mismatches implementation**
   - Design decision: KeyFactors should be emergent, optional, and discovered in Understanding; claims should map to factors and factor verdicts should aggregate claims.
   - Current: KeyFactors are generated during verdicts, forced into a fixed 5-factor template, only for procedural topics, and there is no claim-to-factor mapping.
   - Impact: research is not guided by factors; non-procedural topics that should have factors (for example medical causation) get none.
   - Locations: `Docs/KeyFactors-Design-Decision.md`, `apps/web/src/lib/analyzer.ts:1824`, `apps/web/src/lib/analyzer.ts:4022`

2) **Evidence agreement penalizes unrelated criticism**
   - Gate 4 counts any fact with `category === "criticism"` as a contradiction for every verdict.
   - Impact: agreement metrics can be artificially low even when critiques are unrelated to the claim.
   - Location: `apps/web/src/lib/analyzer/quality-gates.ts:369`

3) **`FH_ALLOW_MODEL_KNOWLEDGE=false` is not respected in Step 1**
   - Understanding prompt instructs the model to use background knowledge regardless of the toggle.
   - Impact: "grounded only" mode is violated during claim extraction.
   - Location: `apps/web/src/lib/analyzer.ts:1837`

4) **7-point highlight colors do not map to UI**
   - Analyzer emits `light-green`, `orange`, etc., but UI only supports `green | yellow | red`.
   - Impact: many highlights render without styles.
   - Locations: `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/components/ClaimHighlighter.tsx`

### Low
1) **URL analyses highlight the URL string, not fetched article text**
   - Impact: highlight view is misleading for URL input.
   - Location: `apps/web/src/app/jobs/[id]/page.tsx`

2) **`clampConfidence` test mismatch**
   - Tests expect clamp to 0-1 but implementation clamps to 0.1-1.
   - Impact: tests fail if enabled.
   - Locations: `apps/web/src/lib/analyzer.ts:5075`, `apps/web/src/lib/analyzer.test.ts:7`

3) **LLM fallback config documented but not implemented**
   - `FH_LLM_FALLBACKS` is described but unused in model selection.
   - Impact: ops expectations will not match behavior.
   - Locations: `LLM_REPORTING.md`, `apps/web/src/lib/analyzer/llm.ts`

## KeyFactors Guidance (Updated)
To align with `Docs/KeyFactors-Design-Decision.md`, the implementation should shift to:
- **Understanding phase**: extract `keyFactors` alongside thesis and claims.
- **Emergent factors**: remove fixed 5-factor templates and allow 0-N factors for any topic.
- **Claim mapping**: add `claim.keyFactorId` (or array) linking claims to factors.
- **Aggregation**: compute factor verdicts by aggregating mapped claim verdicts.
- **Contestation**: keep contestation at the factor level, derived from disputes around the dimension, not individual atomic claims.

## Provider Switching Guidance (Updated)
- **Shorter, prioritized prompts** for Gemini/Mistral; avoid long, legal-heavy system prompts.
- **Strict JSON framing** for Mistral/Gemini to reduce stray text.
- **Provider-specific profiles** (temperature, max tokens, prompt variants) to keep parity across OpenAI/Anthropic/Google/Mistral.
- **Centralize knowledge toggle** so `FH_ALLOW_MODEL_KNOWLEDGE=false` affects all steps (understanding, extraction, verdicts, reporting).

## Additional Recommendations
1) Add `keyFactors` to the article verdict schema or remove it from prompts until supported.
2) Reconcile `FALSE` guidance with the allowed schema; either allow `FALSE` or remove it from the prompt.
3) Fix the source reliability scale to a single unit (0-1 or 0-100) across gates and reporting.
4) Implement the `rich` report writer or remove the documented option.
5) Adjust Gate 4 to count contradictions per-claim rather than global "criticism."
6) Align highlight colors to the 7-point scale or normalize to 3 colors before rendering.

## Tests
No tests run (review only).
