# Fragment-Aware HTML Extraction Fix

Date: 2026-04-23  
Role: Unassigned  
Model: Codex (GPT-5)

## Task

Fix the real upstream defect behind the ACS claim-selection slowness incident: fragment-scoped FAQ URLs were being expanded into whole-page HTML text before Stage 1, inflating candidate claims and contract-validation cost.

## Files Touched

- `apps/web/src/lib/retrieval.ts`
- `apps/web/test/unit/lib/retrieval.test.ts`

## What Changed

### 1. Fragment-aware HTML extraction

`extractTextFromHtml(...)` now accepts the original requested URL and, when a `#fragment` is present, attempts bounded extraction from the smallest meaningful ancestor that contains the fragment target and sits inside the selected main-content root.

The implementation is generic and structural:

- preserve the current main-content root selection (`article`, `main`, role=main, common content containers, then `body`)
- look up fragment targets by `id` / `name` using raw and decoded hash values
- walk from the fragment target outward through ancestors inside the main-content root
- choose the first ancestor whose extracted text is meaningfully smaller than the full root and large enough to represent a real section rather than a naked anchor or heading

No site-specific selectors or domain-specific rules were added.

### 2. Duplicate FAQ heading suppression

HTML extraction now builds text in block-like units and collapses adjacent duplicate lines. This removes common accordion serialization noise where the clickable heading and the rendered content heading both become text.

### 3. URL path integration

`extractTextFromUrl(...)` now passes the original requested URL into HTML extraction so fragment semantics survive the fact that HTTP fetches do not carry `#hash`.

## Why This Fix Is Correct

Before this patch, fragment-scoped URLs always lost the user’s intended subsection because the server only returned the full page and the extractor then took the whole `article` / `body` text.

After this patch:

- the fragment is preserved from the user input
- the DOM is scoped after fetch
- the result is bounded to the fragment’s structural container when that container is meaningful
- full-page fallback still applies when no fragment target exists

## Validation

### Automated

- `vitest run test/unit/lib/retrieval.test.ts`
  - passed
- `next build`
  - passed

### Real-page verification

Ran a retrieval-only live check on the original Grander fragment URL:

- fragment strategy selected: `fragment:div`
- extracted text length: `1249`
- earlier whole-page extraction had been about `7364` to `7383`
- targeted FAQ headline occurrence count: `1`
- unrelated earlier FAQ entry `"Wie funktioniert die GRANDER®-Wasserbelebung?"`: `absent`

This confirms the live page is now being bounded to the intended subsection instead of the whole FAQ article.

## Risks / Open Items

- This fixes the proven retrieval defect, but it does not by itself prove that every late Stage 1 revalidation failure is eliminated.
- Some pages may still lack a meaningful fragment-bounded ancestor; those correctly fall back to the primary content root.
- The next high-value validation is an exact same-URL ACS draft rerun to measure the downstream Stage 1 impact on candidate-claim count and preparation time.

## Warnings

- No live ACS analysis job was rerun in this patch pass.
- The worktree already contains unrelated uncommitted ACS observability changes from earlier work; this patch was limited to the retrieval layer and its unit test.

## Learnings

- On the live Grander page, the fragment target resolves to a useful bounded `div` container without any site-specific markup assumptions.
- Adjacent-line deduplication is sufficient to remove duplicated FAQ headings in the observed failure class.

## For Next Agent

Run an A/B ACS draft preparation check on the same Grander URL:

1. compare `resolvedInputText` length before/after this patch
2. compare candidate-claim count before/after
3. check whether Stage 1 now reaches recommendation instead of failing inside late contract revalidation
