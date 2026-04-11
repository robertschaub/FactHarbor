# 2026-04-10 Claim Contract Run Review

## Scope

Seven local runs were submitted after commit `02d8c3b1eea576d30f2470828e82794928f5f9de`.

- Anchored input, 4x: `Der Bundesrat unterschreibt den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`
- Non-anchor input, 3x: `Der Bundesrat unterschreibt den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`

This note records which runs are good reference outputs, which runs degraded, and why the degraded runs failed.

## Reference Jobs

### Best user-facing anchored output

- Job: `c72d7b65829246bbb5dfe51655a2acfc`
- URL: http://localhost:3000/jobs/c72d7b65829246bbb5dfe51655a2acfc
- Result: `MOSTLY-FALSE`, truth 21, confidence 79
- Why keep as reference:
  - User-facing verdict is correct for the `rechtskräftig` proposition.
  - Narrative clearly distinguishes true chronology from false legal-effect framing.
  - Claim verdict split is useful as a reference pattern: chronology claims true, legal-effect claim false.
- Important nuance:
  - Stage 1 shape is not ideal. The run externalized `rechtskräftig` into a separate legal-effect claim instead of keeping it fused inside the direct temporal claims.
  - Despite that, the final article verdict was still correct.

### Best user-facing non-anchor output

- Job: `0fff0633e3f6419bbe7515e84c445334`
- URL: http://localhost:3000/jobs/0fff0633e3f6419bbe7515e84c445334
- Result: `TRUE`, truth 96, confidence 89
- Why keep as reference:
  - Clean two-claim decomposition.
  - Strong, stable factual result for the non-anchor proposition.
  - Useful baseline for comparing anchored vs non-anchored behavior.
- Important nuance:
  - `contractValidationSummary` ended as `fail-open: final accepted claims could not be re-validated`.
  - That did not harm the outcome here, but it is still a robustness gap and should not be treated as an ideal runtime path.

### Acceptable but not ideal anchored output

- Job: `8bbc2e2f263a42a3a87d3d724f6fb2ba`
- URL: http://localhost:3000/jobs/8bbc2e2f263a42a3a87d3d724f6fb2ba
- Result: `MOSTLY-FALSE`, truth 21, confidence 69
- Why it is useful:
  - This is the cleanest Stage 1 extraction shape of the anchored family.
  - Both extracted claims keep `rechtskräftig` fused into the direct temporal proposition.
- Why it is not the best overall reference:
  - Lower confidence and weaker user-facing narrative quality than `c72d7b...`.

## Failed Runs

### Failure class A: true anchor loss / legal-effect injection

- Jobs:
  - `19fcb8015e644e75a0ce312ca8a60b03`
  - `5429ca2a3b1645f6b0f7cf639d1f23d8`
- Observable result:
  - Both ended `UNVERIFIED`, truth 50, confidence 0.
  - Both persisted `analysisWarnings.type = report_damaged`.
- Root cause:
  - The extraction path did not preserve `rechtskräftig` inside any direct extracted claim.
  - In `19fcb80...`, the modifier disappeared entirely.
  - In `5429ca...`, the modifier was reified into a separate claim: `Die Unterzeichnung des EU-Vertrags durch den Bundesrat ist rechtskräftig erfolgt.`
  - Runtime contract validation correctly rejected both shapes.
- Contract summary evidence:
  - `summary`: anchor missing or legal-effect injection
  - `anchorRetryReason`: `anchor_omission ...` and, for `5429ca...`, `normative_injection`

### Failure class B: validator false negative on coordinated temporal anchor preservation

- Jobs:
  - `9a5f7f40913d416487f4ac6818a27c09`
  - `4d93d97291eb4ffa822d90cb44123772`
- Observable result:
  - Both ended `UNVERIFIED`, truth 50, confidence 0.
  - Both persisted `analysisWarnings.type = report_damaged`.
- Root cause:
  - These runs decomposed the coordinated phrase `bevor Volk und Parlament darueber entschieden haben` into two faithful claims, one for Parliament and one for the people.
  - The validator itself reported success signals:
    - `summary` says the temporal-precedence modifier is preserved.
    - `preservedInClaimIds` and `validPreservedIds` both contain the extracted claims.
    - `honest quotes` count is 2.
  - Runtime still rejected the run because `evaluateClaimContractValidation(...)` requires either:
    - full-anchor substring inclusion in one accepted claim, or
    - a quote that textually contains the full anchor string.
  - Coordinated decomposition preserves the meaning across multiple claims, but fails that whole-string test.
- This is a runtime false negative, not a prompt failure.

## Exact Runtime Seams

### Coordinated-anchor false negative

In `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, `evaluateClaimContractValidation(...)` computes:

- `validPreservedIds`
- `honestQuotes`
- `claimContainsAnchor`
- `anchorQuotedHonestly`

It then forces retry when:

`validPreservedIds.length === 0 || honestQuotes.length === 0 || (!claimContainsAnchor && !anchorQuotedHonestly)`

That logic is correct for dropped anchors like `rechtskräftig`, but it is too strict for coordinated anchors that are intentionally distributed across multiple faithful claims.

### Final revalidation fail-open

In `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, if the final accepted claim set cannot be revalidated after Gate 1, the code currently records:

- `preservesContract: true`
- `summary: fail-open: final accepted claims could not be re-validated`

This did not cause the degraded runs here, but it is visible in the otherwise good non-anchor reference run `0fff063...` and should be hardened.

## Proposed Fixes

### Fix 1: Accept distributed preservation for coordinated anchors

Change runtime contract evaluation so coordinated anchors can be preserved across multiple accepted claims.

Recommended rule:

- If the validator marks claims as preserved via `preservedInClaimIds` and those claims jointly cover the coordinated subparts reported in `preservedByQuotes`, do not require the full original anchor string to appear inside a single claim.
- Treat this as contract-preserving when:
  - `validPreservedIds` is non-empty,
  - `honestQuotes` is non-empty,
  - the preserved quotes are distributed across the cited valid claims in a way that covers the coordinated actor split.

Why this matters:

- It fixes `9a5f7f...` and `4d93d9...` without weakening protection against real anchor drops like `rechtskräftig`.

### Fix 2: Keep `rechtskraeftig` fused to the direct temporal proposition

Tighten Stage 1 extraction and retry guidance so `rechtskräftig` cannot be externalized into a standalone legal-effect claim when the user input expresses one temporal proposition.

Recommended rule:

- At least one thesis-direct extracted claim must preserve `rechtskräftig` inside the same clause as the signing action and the `before` relation.
- A standalone claim such as `Die Unterzeichnung ... ist rechtskraeftig erfolgt` should not count as sufficient preservation for this proposition shape.

Why this matters:

- It prevents `5429ca...` style legal-effect injection.
- It improves Stage 1 shape consistency and reduces reliance on later adjudication rescue.

### Fix 3: Remove final accepted-claims fail-open as a success state

When final accepted claims cannot be revalidated after Gate 1, do not stamp `preservesContract: true`.

Recommended behavior:

- Carry forward the last successful contract summary if the accepted claim set is unchanged.
- Otherwise mark the result as unknown or degraded, not implicitly preserved.

Why this matters:

- It avoids silent success semantics on a path that explicitly failed revalidation.

## Practical Follow-up Order

1. Fix the coordinated-anchor false negative in runtime validation.
2. Tighten `rechtskräftig` fusion enforcement in Stage 1 extraction and retry.
3. Remove final revalidation fail-open success semantics.
4. Re-run the same 4 plus 3 battery and confirm:
   - anchored runs no longer degrade to `UNVERIFIED`
   - non-anchor runs no longer depend on fail-open revalidation
   - anchored runs converge on `MOSTLY-FALSE` with narrow spread
