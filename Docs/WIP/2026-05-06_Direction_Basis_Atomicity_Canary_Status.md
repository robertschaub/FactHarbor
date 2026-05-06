# Direction Basis + Atomicity Canary Status (2026-05-06)

## Current branch state

- Branch: `main`
- Latest local commit under test: `9c5e43b0 fix(stage2): distinguish recorded positions from direct records`
- Local `main` is ahead of `origin/main`.
- No push performed in this slice.
- Jobs budget consumed in this slice: 10 of 12. Remaining budget: 2.

## Implemented commits

| Commit | Purpose | Current disposition |
|---|---|---|
| `a62e60b6` | Adds `directionBasis` / `directnessJustification` contract and structural self-consistency normalization for claim-local evidence direction. | Keep. Tests/build pass. The telemetry is useful and the normalization is structurally correct, but this alone did not solve Bolsonaro EN. |
| `33d347ca` | Tightens multi-claim atomicity audit so input-authored process/result bundles can trigger high-confidence repair. | Keep. It changed Bolsonaro EN preparation from 2 claims to 3 claims, matching the expected claim split. |
| `f683a605` | Prevents the atomicity audit from treating extractor-generated submetrics, broad standards, or requirement classes as input-authored split bases. | Keep. It fixed Stage 1 preparation failures for Bolsonaro PT and Plastic. |
| `9c5e43b0` | Tightens Stage 2 direction-basis taxonomy: records of allegations, objections, criticism, or non-controlling positions should not be `direct_record`. | Keep for now, but needs further validation. It improved Plastic from `LEANING-TRUE` to `MIXED`, but Bolsonaro EN still failed. |

## Verification commands

- `npm test` after `a62e60b6`: passed.
- `npm -w apps/web run build` after each committed change: passed.
- Focused prompt/stage tests after `33d347ca`, `f683a605`, `9c5e43b0`: passed.
- `git diff --check`: passed before commits.
- Services restarted and health checked before live canaries after committed prompt/config changes.

## Live canaries

| Label | Draft | Job | Commit | Result | Prepared / selected | Assessment |
|---|---|---|---|---|---|---|
| Bolsonaro EN diagnostic | `d569a9b52...` | `dad71208...` | `a62e60b6` | Cancelled | 2 / 2 | Failed Stage 1 expectation. Audit saw medium findings only, so AC_02 still bundled proceedings and verdicts. Cancelled as invalid diagnostic. |
| Bolsonaro EN after process/result fix | `61abd4ba...` | `cdcc9bcd...` | `33d347ca` | `MIXED` 43 / 48 | 3 / 3 | Stage 1 fixed. Stage 2/4 still not positive-side. AC_02 `LEANING-FALSE`; AC_03 `UNVERIFIED`. |
| Bolsonaro PT first control | `76f41e50...` | none | `33d347ca` | Stage 1 failed | 3 / 0 | Atomicity repair over-split generated/broad requirement dimensions and then failed contract preservation. Fixed by `f683a605`. |
| Hydrogen control | `d4b6752c...` | `9cd04065...` | `33d347ca` | `FALSE` 8 / 80 | 2 / 1 | Good negative control. Direct contradiction preservation works for this input. |
| Plastic first control | `d3d4c3f...` | none | `33d347ca` | Stage 1 failed | 3 / 0 | Same over-splitting failure class as PT. Fixed by `f683a605`. |
| Asylum 235000 DE | `a3984522...` | `9d96f92e...` | `f683a605` | `LEANING-FALSE` 30 / 72 | 1 / 1 | Bad relative to expectation. Separate numeric/source-route quality issue remains. |
| Bolsonaro PT rerun | `e2208a8f...` | `b7a1c85d...` | `f683a605` | `LEANING-TRUE` 69 / 67 | 3 / 2 | Stage 1 fixed and verdict direction acceptable. Open: ACS selected 2 of 3, omitting the sentence-justice claim. |
| Plastic rerun | `28f2df18...` | `7e688876...` | `f683a605` | `LEANING-TRUE` 60 / 72 | 3 / 3 | Bad negative control. The system still leans toward "plastic recycling is pointless." |
| Bolsonaro EN after direction taxonomy fix | `cc6d2b2d...` | `7050df80...` | `9c5e43b0` | `LEANING-FALSE` 38 / 43 | 3 / 3 | Bad. Direction-basis taxonomy neutralized more collateral material, but the remaining evidence pool lacked enough operative support and still produced a false-side low-confidence result. |
| Plastic after direction taxonomy fix | `4d87b0f0...` | `7b0d4c56...` | `9c5e43b0` | `MIXED` 48 / 70 | 3 / 3 | Improved from `LEANING-TRUE`, but still not the expected false-side verdict. |

## Evidence from completed reports

### Bolsonaro EN

Expected:
- 3 AtomicClaims:
  1. Brazilian-law compliance.
  2. Proceedings met international fair-trial standards.
  3. Verdicts met international fair-trial standards.
- Positive-side overall verdict, comparable to earlier good jobs.

Observed:
- `33d347ca` produced the correct 3-claim split, but final result was `MIXED` 43 / 48.
- `9c5e43b0` also produced the correct 3-claim split, but final result worsened to `LEANING-FALSE` 38 / 43.
- `zeroTargetedSelectedClaimCount` remained `0`, so selected-claim acquisition starvation is not the issue.
- The direction-basis distribution improved structurally: many allegations/positions moved to neutral. However, AC_02 and AC_03 still lacked enough target-specific operative support, and AC_02 retained 4 `contradicts / operative_finding` items.

Current root-cause assessment:
- Stage 1 atomicity is now fixed for this input.
- Stage 2 direction-basis normalization is useful but insufficient.
- The next likely root cause is acquisition/directness quality: after collateral material is neutralized, the pipeline does not retrieve or preserve enough target-specific legal/fair-trial support evidence for AC_02 and AC_03.
- Stage 4 should remain held until Stage 2 produces a healthier support/contradiction pool.

### Plastic

Expected:
- False-side result: "Plastic recycling is pointless" should be contradicted by evidence that recycling has at least some practical/environmental/economic value.

Observed:
- `f683a605`: `LEANING-TRUE` 60 / 72.
- `9c5e43b0`: `MIXED` 48 / 70.
- `9c5e43b0` improved the evidence direction balance, especially for AC_02, but AC_01 and AC_03 still had many `supports / direct_record` items for claims framed as "pointless in terms of practical effectiveness" and "pointless in terms of environmental impact."

Current root-cause assessment:
- The issue is not zero-search starvation.
- The likely issue is claim framing and adjudication of broad evaluative predicates: low recycling rates and practical limitations are being treated as support for "pointless", while evidence of partial benefit is not weighted enough to refute the absolute predicate.
- This is a separate Stage 1/Stage 4 quality lane, not the Bolsonaro Stage 2 collateral-material lane.

### Asylum 235000 DE

Expected:
- Earlier expectation was that the claim should not be false-side merely because of category/stock-route confusion.

Observed:
- `f683a605`: `LEANING-FALSE` 30 / 72.
- `zeroTargetedSelectedClaimCount` was `0`.

Current root-cause assessment:
- Separate numeric/source-route quality issue. Do not use this as evidence for or against the Bolsonaro direction-basis lane.

## Recommendations

1. Keep the four local commits for now. The first three clearly fix observed Stage 1 / structural contract issues. The fourth improves Plastic and moves the taxonomy in the correct architectural direction, but it needs more work.
2. Do not run more jobs until the next hypothesis is implemented. Two jobs remain in the current budget.
3. Next implementation lane should target Stage 2 acquisition/directness for rule-governed compliance claims:
   - Require operative support searches/sources for target-path standards, not just neutralizing collateral concerns.
   - Add observability for directness basis by claim and source family so canaries can show whether support evidence was absent or discarded.
   - Keep the code generic and LLM-led; no topic-specific rules.
4. Keep Stage 4 repair held. Current failures can still be explained by poor evidence pools and broad-predicate framing.
5. Treat Plastic and Asylum as separate quality lanes. They should not block the Bolsonaro direction-basis work, but they prove the current branch is not broadly release-ready.

