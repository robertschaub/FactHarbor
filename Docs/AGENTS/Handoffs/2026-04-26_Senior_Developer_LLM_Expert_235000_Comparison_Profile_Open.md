# 2026-04-26 - Senior Developer / LLM Expert - 235000 Comparison Profile Follow-up

## Status

Open. The current monitor-session issue is improved but not proven fixed.

Captain-approved input:

`235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.`

## Changes Landed

- `b7712b0c fix(prompt): prevent triplet retry guidance`
  - Kept. Prevents the validator from recommending side A + standalone side B + separate whole relation for approximate comparison decomposition.
- `558f08cd fix(prompt): require current-side profile on comparisons`
  - Kept but insufficient. Adds a generic validator rule that a comparison companion referencing a current/present/freshness-sensitive side must carry that side's route/metric class and fail if freshness/profile is lost.
- `987dc115 fix(stage1): give contract repair validator context`
  - Kept but insufficient. Passes the validator summary into `CLAIM_CONTRACT_REPAIR` so repair can address corrected shape/profile/freshness failures, not just insert the anchor text.
- `8666e27c fix(prompt): require side routes for comparison companions`
  - Safe-local verified, not live-rerun verified yet. Tightens Pass 2, contract validation, and contract repair so a ratio/approximation/relation metric does not count as a current-side source-native route, and freshness follows the freshest side needed for evidence.

Safe verification passed:

- `git diff --check`
- `npm -w apps/web run test -- test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts test/unit/lib/analyzer/claim-contract-validation.test.ts test/unit/lib/analyzer/research-extraction-stage.test.ts test/unit/lib/analyzer/verdict-prompt-contract.test.ts test/unit/lib/analyzer/verdict-stage.test.ts`
- `npm -w apps/web run build`

## Live Validation Used

Current phase max was 6 reruns; all 6 were used. Last two important runs:

- `6851f5ef9c3446ea9da2f217e0e9b803` under `558f08cd+8fc9561c`
  - Result: `UNVERIFIED`, `report_damaged`.
  - Good: validator correctly identified AC_02 as inventing standalone historical-side `235000` and missing current-side profile/freshness.
  - Bad: repair did not produce a valid claim set.
- `05bfb421753a4e98948ac76f308bcda8` under `987dc115+af0bdf9a`
  - Result: `SUCCEEDED`, `LEANING-TRUE`, truth ~62, confidence 24.
  - Good: no damaged preparation; Stage 1 reached research with two claims. SEM 2025 evidence `Total Personen aus dem Asylbereich (inkl. RU) am Ende 2025: 235 057 Personen` was found and cited for AC_01.
  - Bad: AC_02 still emitted `verdict_citation_integrity_guard` and `verdict_integrity_failure`; AC_02 ended `UNVERIFIED` with no surviving decisive citations.

## Current Root Cause

The issue has moved from Stage 1 damaged preparation to Stage 1/4 contract and citation alignment for comparison companions.

In the final run, AC_02 was:

`Die Zahl von 235000 Flüchtlingen in der Schweiz ist fast so viel wie am Ende des Zweiten Weltkrieges.`

Its `expectedEvidenceProfile` still prioritized the historical route and did not carry a concrete current-side source-native route comparable to AC_01's SEM route. The contract validator nevertheless approved it, saying `freshnessRequirement: "none"` was acceptable because AC_02's primary evidence route is historical and the profile contains a ratio relation back to `235000`.

That contradicts the intended rule from `558f08cd`: a companion claim that depends on a current/present side must carry that side's evidence route/metric class in its own profile. Because that did not happen, Stage 4 could reason about the comparison but citation sanitation left AC_02 without the decisive side needed for its downgraded verdict.

## Recommended Next Step

Do not add Stage 4 rescue first. After `8666e27c`, the next step is live validation with a fresh Captain-approved rerun budget:

1. Reseed/restart first.
2. Re-run the exact Captain-approved input once or twice.
3. Inspect AC_02 before Stage 4 conclusions: it should have concrete side-specific source-native routes/metric classes for both current and comparator sides, and it should not use `freshnessRequirement: "none"` when current-side evidence is needed.

If Stage 1 then produces a correct AC_02 profile but Stage 4 still loses citations, move to `verdict-stage.ts`/evidence-direction analysis. At that point the evidence would show the problem is no longer extraction/profile.

## Browser Tooling

Browser-use tooling was still not exposed in this resumed context. `tool_search` only exposed automation, so monitoring was done via API and job URLs were shared for manual in-app viewing.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`, failed-attempt recovery.

Chosen option: amend existing Stage 1 validation/repair mechanisms.

Rejected paths: revert `558f08cd`/`987dc115` (they improved safety/progress), Stage 4 citation rescue before Stage 1 emits a correct profile, and more live reruns without approval.

Net mechanism count: unchanged; no new fallback/parallel path.

Residual debt: Rule 20 in `CLAIM_CONTRACT_VALIDATION` is dense and should be consolidated after this comparison-profile path stabilizes.
