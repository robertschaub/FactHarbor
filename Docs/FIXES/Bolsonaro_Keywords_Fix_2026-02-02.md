# Fix: Aggregation Lexicon Keyword Refinement (Bolsonaro Trial Fairness Bug)

**Date:** 2026-02-02
**Issue:** Overly broad `documentedEvidenceKeywords` matched skeptical/legal-discussion language and incorrectly promoted opinion contestations to `factualBasis: established`.
**References:**
- `Docs/ARCHIVE/REVIEWS/Bolsonaro_Doubted_Factor_Bug_Analysis.md`
- `Docs/ARCHIVE/REVIEWS/Bolsonaro_Verdict_Analysis_2026-02-02.md`

## Summary of Changes
Updated the `aggregation-lexicon` config (default file + active DB config) to remove ambiguous legal-citation terms and add more specific evidence indicators.

## Keyword Changes
### Removed (too broad / legal-citation terms)
- `determination`
- `ruling`
- `procedure`
- `article`
- `section`
- `regulation`
- `statute`
- `unverified` (ambiguous in contestation context)

### Added / Refined (evidence-specific indicators)
- Evidence specificity: `metric`, `statistic`, `percentage`
- Review/investigation signals: `inquiry`, `review found`, `examination`
- Documentation variants: `recorded`, `documented`
- Strong evidence terms: `evidence`, `proof`, `verification`, `corroboration`
- Regex patterns for explicit findings:
  - `re:violation(s)? (found|documented|confirmed)`
  - `re:non-compliance (found|documented|confirmed)`
  - `re:breach(es)? (found|documented|confirmed)`

### Note on suggested removals
The terms `doubt`, `question`, `concern`, `raise`, `dispute` were **not** present in `documentedEvidenceKeywords`, so no removal was needed.

## Files Updated
- `apps/web/configs/aggregation-lexicon.default.json`
- `apps/web/src/lib/config-schemas.ts` (fallback default)
- Active UCM DB config: `aggregation-lexicon` / `default`

## Expected Impact
- Contestation phrased as skepticism (e.g., “doubted fairness”, “questioned impartiality”) should no longer be classified as documented evidence.
- Opinion-based contestations should remain `factualBasis: opinion`.

## Validation
- Manual query re-run for the Bolsonaro fairness claim: **not executed** (requires running the full analysis pipeline).
- Build/test: see commit notes for this fix.

## Follow-up (Optional)
- Add a small regression test to assert skeptical language does not match documented evidence keywords.
- Consider a future `opinionIndicatorPatterns` field if broader disambiguation is needed.
