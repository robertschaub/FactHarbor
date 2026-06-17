# 2026-05-29 - Lead Architect - Bolsonaro Live Monitoring After Sufficiency Gate Alignment

## Context

Captain asked to run the recommended post-fix Bolsonaro-family validation with live monitoring, analyze during monitoring, and stop submitting after two clearly bad reports. The code fix under test was `9114c443` (`fix(analyzer): align research sufficiency gates`), executed as current `main` at `0a27ecf5` after the docs/index commit.

Runtime was refreshed before submission: services restarted, prompts/configs reseeded, API and web health checked. Anthropic prompt caching remained locked off in UCM/default config; search-cache hits observed in logs are web-search cache hits, not Anthropic prompt caching.

## Jobs Submitted

| Label | Job | Result | Quality classification |
|---|---|---:|---|
| inverse | `a8dbb7642956496e9c6b061ec27bccbd` | `LEANING-FALSE` 32/40 | materially suspect, not stop-counted |
| positive | `fd7c255589c84766bcca1756c4db9e35` | `UNVERIFIED` 56/44 | clearly bad, bad counter 1/2 |
| question | `7c343475c7cd413bb53a99e89afcd377` | `MIXED` 55/48 | imperfect diagnostic, not stop-counted |
| portuguese | `354fbaaf151b4048ada074867e88e2da` | `LEANING-TRUE` 62/51 | comparatively healthy |

No second clearly bad report occurred, so all four variants were submitted.

## Live Findings

### Inverse Variant

Input:
`The legal proceedings against Jair Bolsonaro regarding the attempted coup d'etat did not comply with Brazilian and international procedural law, and the proceedings and the subsequent verdict did not meet international standards for a fair trial`

Outcome:
- 3 claims, 28 evidence items, 24 sources, 28 searches.
- No `query_budget_exhausted`.
- Gate 4: 0/3 publishable, all low confidence.
- Claim verdicts:
  - AC_01 `LEANING-FALSE` 38/48.
  - AC_03 `MOSTLY-FALSE` 28/28.
  - AC_02 `MOSTLY-FALSE` 27/38.

Interpretation:
The sufficiency/budget fix worked for the targeted old failure mode: the report no longer burned the shared budget chasing artificial diversity. Remaining weakness is Stage 4: AC_02 had a direction-validator conflict accepted through stable self-consistency rescue.

### Positive Variant

Input:
`The legal proceedings against Jair Bolsonaro regarding the attempted coup d'etat complied with Brazilian and international procedural law, and the proceedings and the subsequent verdict met international standards for a fair trial`

Outcome:
- 4 claims after contract-guided Pass 2 retry.
- Aggregate `UNVERIFIED` 56/44.
- Gate 4: 1/4 publishable, 1 insufficient.
- `query_budget_exhausted`: unresolved `AC_04`, while `AC_03` still had main budget but was already sufficient.
- `insufficient_evidence`: AC_04 had 1 item, 0 directional items, 1 source type, 1 domain.
- AC_04 statement: `The subsequent verdict in the legal proceedings against Jair Bolsonaro regarding the attempted coup d'etat met international standards for a fair trial.`

Interpretation:
This is a clear quality fail and the most important new signal. The new logic avoided retargeting the already-sufficient claim and surfaced the actual unresolved claim. The remaining root issue is not simply the old diversity gate. The positive English wording decomposed into a separate "subsequent verdict met fair-trial standards" claim that acquisition could not satisfy directionally.

### Question Variant

Input:
`Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`

Outcome:
- 3 claims, no contract retry.
- Aggregate `MIXED` 55/48.
- 63 evidence items, 36 sources, 26 searches.
- `query_budget_exhausted` emitted when all claims reached the main-loop reserve boundary: usage AC_01=6, AC_02=6, AC_03=7 with per-claim budget 8 and reserve 2.
- No insufficient-evidence warning.
- Gate 4: 1/3 publishable.

Interpretation:
This is diagnostic rather than clearly bad. It shows the same topic can collect a large evidence pool without stranding a claim, but confidence/publishability remains weak and Stage 4 still rescues direction issues.

### Portuguese Variant

Input:
`O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas`

Outcome:
- 3 claims, no contract retry.
- Aggregate `LEANING-TRUE` 62/51.
- 67 evidence items, 45 sources, 18 searches.
- No `query_budget_exhausted`.
- Main research exited after 3 iterations, then contradiction search ran.
- Gate 4: 2/3 publishable.

Interpretation:
This is the healthiest run. It strongly suggests the sufficiency alignment is not broadly over-constraining research. The English positive wording's extra AC_04 split is the outlier.

## Root-Cause Signals

1. The committed sufficiency gate alignment is a useful root fix for the prior artificial-diversity/budget waste. It removed the inverse variant's budget exhaustion and gave better diagnostics for the positive variant.
2. Increasing `perClaimQueryBudget` alone is not the best next root fix. It may reduce warnings, but the positive variant's failure is caused by a claim decomposition/acquisition mismatch: a verdict-specific fair-trial claim was split out and then received almost no directional evidence.
3. Stage 4 remains a separate root issue. Multiple reports still accept verdicts through `direction_rescue_plausible` even when direction/grounding validators identify claim-local citation or applicability inconsistencies.
4. Input phrasing still materially changes decomposition: positive English -> 4 claims with stranded AC_04; question/PT -> 3 claims and better research behavior.

## Recommended Next Work

1. Add a focused root fix for Stage 1 decomposition stability on legal-proceeding/fair-trial conjunctions, expressed generically: avoid splitting a proceeding-level fair-trial assessment and subsequent-verdict fair-trial assessment into separate claims unless the model can identify distinct, independently verifiable truth conditions and expected evidence routes.
2. Improve Stage 2 acquisition targeting for verdict-specific procedural/fairness claims: when a claim is below sufficiency because directional evidence is zero, query generation should explicitly target the missing claim-level directional predicate instead of continuing broad topic searches. This must stay LLM-driven and UCM prompt/config based.
3. Separately review Stage 4 rescue policy: self-consistency should not automatically override direction/grounding validator findings that point to non-direct applicability or citation-bucket misuse.

## Warnings

- Do not count this four-job set as deployment-ready. It provides good diagnostics, but positive English remains a release-blocking quality fail.
- Do not re-enable Anthropic prompt caching. The observed `cached` events are search-cache hits.
- Do not stack a larger budget change before deciding whether AC_04 should exist as a separate claim and why acquisition failed to target it.
