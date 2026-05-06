# Bolsonaro EN Downstream Diagnosis Review Packet

Date: 2026-05-06

Branch under review: `main`

Primary job: `febfd467d0f24a339827267b5ea77851`

Captain input:

> Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?

## Executive Summary

The latest Stage 1 atomicity work fixed the primary claim-shape defect for the English Bolsonaro input. The current canary now produces the expected three AtomicClaims:

| Claim | Statement |
| --- | --- |
| `AC_01` | The legal proceedings against Jair Bolsonaro complied with Brazilian law. |
| `AC_02` | The legal proceedings against Jair Bolsonaro met international standards for a fair trial. |
| `AC_03` | The verdicts issued in the legal proceedings against Jair Bolsonaro met international standards for a fair trial. |

The remaining report failure is downstream. The job still ends `LEANING-FALSE 39/44` because Stage 2 / applicability and the verdict layer treat collateral STF inquiry material, IACHR confidentiality concerns, dissenting positions, and Moraes-related controversy as direct contradiction for the target proceeding and verdict claims.

This is not selected-claim starvation:

- selected claims: `3 / 3`
- `zeroTargetedSelectedClaimCount`: `0`
- every selected claim has targeted main research and nonzero provider search attempts

## Current Canary Details

| Field | Value |
| --- | --- |
| Job | `febfd467d0f24a339827267b5ea77851` |
| Created | 2026-05-06 09:05 UTC-ish local DB row |
| Executed commit | `5a744b1ef0c2ff0b6d5ef97f19f8d7d3d8b22bea` |
| Runtime prompt hash | `36898dc4f879...` |
| Overall verdict | `LEANING-FALSE` |
| Truth / confidence | `39 / 44` |
| Final evidence items | `40` |
| LLM calls | `43` |

Claim verdicts:

| Claim | Verdict | Truth / confidence | Supporting IDs | Contradicting IDs |
| --- | --- | --- | --- | --- |
| `AC_01` | `UNVERIFIED` | `48 / 42` | `4` | `3` |
| `AC_02` | `LEANING-FALSE` | `35 / 50` | `0` | `7` |
| `AC_03` | `UNVERIFIED` | `35 / 42` | `3` | `6` |

Warnings include:

- `evidence_applicability_filter:info`
- `verdict_direction_issue:info`
- `verdict_grounding_issue:info`
- repeated fetch/cap info warnings

## Key Evidence Pattern

### Current `AC_02`

`AC_02` has no surviving supporting citation IDs and seven contradicting citation IDs. Dominant contradictions:

- `S_008` IACHR Special Rapporteurship report, with extracted statements about STF inquiries `4781` and `4784` being confidential and limiting public scrutiny.
- `S_017` NPR, with Justice Fux dissent and Justice Moraes / Trump-administration sanction context.
- `S_018` Engelsberg Ideas, with Moraes as both overseeing justice and alleged target.

The problem is not that these sources are irrelevant context. The problem is that they are promoted to `direct|contradicts` for the target claim. Several items concern broader/collateral proceedings, public-scrutiny concerns, non-controlling dissents, sanctions, or overlapping actors. They do not necessarily establish a target-specific fair-trial violation for this proceeding.

### Current `AC_03`

`AC_03` receives some supporting citations from Lawfare source material about STF jurisdiction and criminal-code provisions. That material is more directly relevant to jurisdiction and lawfulness than to whether the verdicts themselves met international fair-trial standards. It also receives direct contradictions from the same IACHR/Moraes controversy cluster.

This suggests both sides of the verdict are polluted:

- some supports are target-adjacent but not verdict-specific;
- contradictions are often target-adjacent or concern-like rather than operative standards outcomes.

## Comparator

Best exact structural comparator:

| Field | Value |
| --- | --- |
| Job | `91bf6083d26e407c98a474d89d2e618f` |
| Created | 2026-05-01 03:57 |
| Executed commit | `b5421841ea7f608ddb30906a0de785f365231b12` |
| Runtime prompt hash | `8e05b0f943cc...` |
| Overall verdict | `LEANING-TRUE` |
| Truth / confidence | `63 / 52` |
| Claims | 3 final claims: Brazilian law, proceedings fair-trial standards, verdicts fair-trial standards |

Comparator claim verdicts:

| Claim | Verdict | Truth / confidence | Supporting IDs | Contradicting IDs |
| --- | --- | --- | --- | --- |
| `AC_01` | `LEANING-TRUE` | `70 / 62` | `17` | `0` |
| `AC_02` | `LEANING-TRUE` | `58 / 52` | `11` | `0` |
| `AC_03` | `LEANING-TRUE` | `58 / 52` | `9` | `0` |

Notable comparator behavior:

- It uses some similar source families, including IACHR, Lawfare, HRW, and procedural reporting.
- IACHR material about state-provided access / defense safeguards is used as support or neutral context.
- Confidentiality/publicity material and actor controversy do not dominate the contradiction buckets.
- No `state.gov` residue was observed in the local documented comparator review.

## Branch / Commit Context

`b5421841` is not current `main`. It belongs to the preserved regression-snapshot work and was explicitly held from wholesale promotion. It is a useful quality comparator, not an automatic cherry-pick target.

Diff inspection between current canary commit and `b5421841` shows a broad held stack:

- Stage 4 verdict repair and citation adjudication commits.
- Stage 2 evidence direction-basis commits.
- Prompt hardening for target-bound evidence profiles and rule-governed compliance claims.

Relevant held mechanisms visible in the diff:

- `directionBasis` added to evidence extraction and applicability output.
- `claimDirectionByClaimId` entries carry both `claimDirection` and `directionBasis`.
- non-directional bases are normalized so they cannot silently persist as `supports` or `contradicts`.
- applicability prompt rules distinguish:
  - target-specific safeguards and operative standards outcomes;
  - concern-only / allegation-only / non-controlling-position material;
  - broader institution, upstream inquiry, collateral investigation, sanction, or adjacent procedural controversy;
  - public/media transparency concerns vs participant safeguards.

Candidate held commits / mechanisms to inspect, not blindly cherry-pick:

| Commit | Subject | Initial disposition |
| --- | --- | --- |
| `89a0c8e8` | persist evidence direction basis | likely prerequisite |
| `c897a71a` | require directional basis for evidence polarity | likely prerequisite |
| `d722bd0c` | keep evidence profiles target-bound | likely relevant, prompt approval required |
| `3424dd06` | treat limited review paths as caveats | likely relevant, prompt approval required |
| `025d1d6d` | repair support-dominant compliance claims | hold until Stage 2 direction-basis retest |
| `3d20e789` | normalize one-sided repair bands | hold until Stage 2 direction-basis retest |
| `b5421841` | repair late citation adjudication | hold until Stage 2 direction-basis retest |

## Current Root-Cause Assessment

| Candidate cause | Likelihood | Evidence |
| --- | --- | --- |
| Stage 1 atomicity still broken | Low for this exact current canary | Current canary has the expected three claims. |
| ACS selected-claim starvation | Low | `zeroTargetedSelectedClaimCount = 0`; all selected claims searched. |
| Stage 2 applicability / claim-local direction drift | High | Current report promotes collateral or concern-like material to `direct|contradicts`; comparator does not. |
| Stage 4 verdict repair / aggregation weakness | Medium | Stage 4 follows the skewed direct evidence buckets and emits grounding/direction warnings. It may amplify but is probably not first cause. |
| Source availability variance | Medium-low | Comparator and current run share some source families; the main difference is classification/direction, not only retrieval. |

## Proposed Next Lane

Do not run more canaries yet. More runs will likely reproduce variance around the same unresolved downstream mechanism.

Do not revert:

- Stage 1 multi-claim atomicity audit;
- Lane 2 / Lane 3 ACS admission and selected-claim coverage.

Open a narrow downstream quality lane:

1. Re-author, not cherry-pick, claim-local evidence direction basis.
   - Add an LLM-emitted `directionBasis` to evidence extraction / applicability direction outputs.
   - Keep the basis generic and multilingual.
   - Treat it as a structural contract, not deterministic text interpretation.

2. Re-author rule-governed compliance directness.
   - Direct support/contradiction for legality, procedure, fairness, compliance, verdict, or standards claims should require either:
     - target-specific safeguard record; or
     - operative standards outcome.
   - Concern-only, allegation-only, non-controlling dissent, broader institutional controversy, collateral inquiry, public-access issue, or sanction context should normally be neutral/contextual unless the LLM identifies a target-specific standards bridge.

3. Add structural normalization.
   - If the LLM emits a non-directional `directionBasis`, the stored claim-local direction must become neutral even if an earlier field says `supports` or `contradicts`.
   - This is structural handling of the LLM's own semantic classification, not keyword-based source-code semantics.

4. Retest before Stage 4 repair.
   - Only if `AC_02` / `AC_03` still receive support-only or contradiction-only distorted verdicts after direction-basis cleanup, inspect the held Stage 4 one-sided/support-dominant repair chain.

## Verification Gate

Required tests before live jobs:

- targeted unit tests for applicability output schema and direction-basis normalization;
- tests proving non-directional bases normalize to neutral;
- tests proving direct evidence with directional basis still survives as support/contradiction;
- prompt contract tests for generic rule-governed compliance directness, without Bolsonaro-specific terms;
- `npm test`;
- `npm -w apps/web run build`.

Live canaries after commit/restart/reseed:

| Input | Purpose |
| --- | --- |
| Bolsonaro EN exact | Main regression target: expect 3 claims and positive-side or mixed verdict, not false from collateral contradictions. |
| Bolsonaro PT exact | Multilingual transfer / no degradation. |
| Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz | Numeric/source-route control; should not regress. |
| Using hydrogen for cars is more efficient than using electricity | Comparison/dimension decomposition control; should not over-neutralize direct numeric evidence. |
| SVP PDF | Optional broad-input admission/acquisition smoke only if budget remains. |

## Open Review Questions

1. Is the root-cause attribution sound from the exact current job, or is Stage 4 the primary culprit?
2. Which held mechanisms are true prerequisites for a minimal re-author?
3. Should `directionBasis` live on `EvidenceItem`, only on claim-local mappings, or both?
4. Is structural normalization based on an LLM-emitted basis compliant with AGENTS.md's no deterministic semantic logic rule?
5. Should Stage 4 repair be held until after the direction-basis canary, or shipped together?
6. What is the smallest test matrix that gives enough confidence without spending unnecessary live-job budget?

## Three-Review Consolidation

Disposition: approve implementation of a narrow Stage 2 applicability / direction-basis slice, with amendments.

All three reviewers agree on the core diagnosis:

- Stage 1 is no longer the primary defect for the current canary because the expected three AtomicClaims are present.
- Lane 2 / Lane 3 ACS admission and selected-claim coverage are not the cause.
- Stage 2 applicability / claim-local direction is the first faulty layer for the current canary.
- Stage 4 is a secondary amplifier and must remain held until after Stage 2 emits a cleaner evidence pool.
- Do not cherry-pick `b5421841` or the held verdict-repair stack. Read held commits for design intent only.

### Required Amendments Before Implementation

1. Add `directnessJustification`.
   - The current `APPLICABILITY_ASSESSMENT` prompt already says collateral inquiry / broader institutional controversy material is contextual unless it directly documents the target path or states that the criticized/supportive procedure governed that same target.
   - The failure shows that this rule is under-enforced by the schema.
   - Add a required `directnessJustification` field to the applicability output. For every item classified `direct`, the LLM must state what target-specific path, safeguard, proceeding, decision, or outcome the evidence evaluates. If it cannot state one, the item should be contextual.

2. Use a closed, coarse `directionBasis` enum.
   - Avoid free-text basis values.
   - Start coarser than the held branch's full taxonomy to reduce multilingual reliability risk.
   - First-slice enum:
     - `target_safeguard_record` — directional-capable
     - `operative_standards_outcome` — directional-capable
     - `target_process_documentation` — directional-capable only when paired with a directional LLM claimDirection and a direct target path
     - `concern_or_position` — non-directional
     - `collateral_context` — non-directional
     - `contextual_background` — non-directional
     - `ambiguous_or_insufficient` — non-directional default
   - Use `.catch("ambiguous_or_insufficient")` for parse safety.

3. Frame normalization as LLM-output self-consistency enforcement.
   - Code must never inspect evidence text, source URL, title, publisher, or natural-language content to decide direction.
   - The LLM remains the sole semantic authority.
   - Code may enforce internal consistency of the LLM's structured output: if the LLM says the basis is non-directional, that same item cannot be stored as direct support or direct contradiction.
   - Log every normalization override for observability and future false-positive review.
   - Prompt text must instruct the model that non-directional bases must pair with neutral `claimDirection`; code normalization is a safety net, not the primary classifier.

4. Normalize before companion cloning.
   - `assessEvidenceApplicability()` currently clones neutral evidence into directional claim-local companions when `claimDirectionByClaimId` includes a directional entry.
   - Basis normalization must run before this clone path so collateral/concern material cannot be amplified into synthetic directional evidence IDs.

5. Scope prompt edits narrowly.
   - Keep the existing collateral-target rule.
   - Extend only the output contract and the minimal instruction needed for `directnessJustification`, `directionBasis`, and self-consistency.
   - Do not broadly rewrite the applicability prompt before the first canary.

### Implementation Plan

1. Update applicability schema in `apps/web/src/lib/analyzer/research-extraction-stage.ts`.
   - Add `directnessJustification: z.string()`.
   - Add `directionBasis` on each `claimDirectionByClaimId` entry with the closed enum and safe catch.
   - Add `directionBasis` to `EvidenceItem` only as claim-local observability / primary mapping convenience; the authoritative direction basis is claim-local.

2. Update `APPLICABILITY_ASSESSMENT` in `apps/web/prompts/claimboundary.prompt.md`.
   - Add output contract instructions for directness justification and direction basis.
   - Add self-consistency instruction: non-directional bases require neutral direction.
   - Keep wording generic and multilingual; no Bolsonaro, Brazil, STF, IACHR, or named benchmark terms.

3. Add structural normalization in `assessEvidenceApplicability()`.
   - Normalize non-directional bases to neutral before existing claim-local companion clone logic.
   - Preserve directional bases when directness and direction are internally consistent.
   - Log normalization override counts and enough structured metadata for admin/debug review without adding semantic code decisions.

4. Tests.
   - Schema parses valid `directnessJustification` and `directionBasis`.
   - Invalid/missing direction basis falls back to `ambiguous_or_insufficient`.
   - `{ claimDirection: "contradicts", directionBasis: "collateral_context" }` normalizes to neutral before cloning.
   - Directional basis preserves support/contradiction.
   - Companion clone path carries the normalized basis per claim.
   - Prompt contract contains the generic output fields and self-consistency rule without benchmark/domain terms.
   - Run targeted tests, `npm test`, and `npm -w apps/web run build`.

5. Commit, reseed, restart, then canaries.
   - Follow live-job discipline: commit first, reseed prompts/config if needed, restart affected services.
   - Mandatory live canaries:
     1. Bolsonaro EN exact.
     2. Bolsonaro PT exact.
     3. Hydrogen EN.
     4. Plastic EN.
     5. Asylum 235000 DE.
   - Optional if budget remains and the first five are interpretable: SVP PDF.

### Expected Fixed Behavior

- Bolsonaro EN should keep the expected three AtomicClaims.
- `AC_02` and `AC_03` should no longer be dominated by collateral concern / controversy material as direct contradictions.
- Legitimate direct contradiction must still survive on controls such as plastic.
- The target is not necessarily zero contradictions; a balanced evidence pool with grounded target-specific contradictions is acceptable.
- Stage 4 should be evaluated only after Stage 2 evidence buckets are cleaner.

## Detailed Prompt For Second Claude Reviewer

Use this prompt with Claude Opus or Sonnet:

```text
Role: Independent Senior Architect + LLM Expert + Report Quality Reviewer.

Repository: C:\DEV\FactHarbor, branch main.

Task:
Review the proposed downstream quality lane after the Stage 1 multi-claim atomicity fix. Do not implement. Produce findings by severity and an implementation-ready recommendation.

Primary exact job:
febfd467d0f24a339827267b5ea77851

Captain input:
Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?

Current canary facts:
- Executed commit: 5a744b1ef0c2ff0b6d5ef97f19f8d7d3d8b22bea
- Prompt hash: 36898dc4f879...
- Overall: LEANING-FALSE 39/44
- Stage 1 now produces the expected three claims:
  AC_01 Brazilian-law compliance.
  AC_02 proceedings met international fair-trial standards.
  AC_03 verdicts met international fair-trial standards.
- ACS coverage is healthy: selected 3/3, zeroTargetedSelectedClaimCount = 0, each selected claim has targeted main research and nonzero search attempts.
- Claim verdicts:
  AC_01 UNVERIFIED 48/42 with 4 supports and 3 contradictions.
  AC_02 LEANING-FALSE 35/50 with 0 supports and 7 contradictions.
  AC_03 UNVERIFIED 35/42 with 3 supports and 6 contradictions.
- Dominant AC_02/AC_03 contradictions come from IACHR confidentiality findings about STF inquiries 4781/4784 and Moraes / controversy material. These appear to be collateral or concern-like material promoted to direct contradiction.
- Warnings include evidence_applicability_filter, verdict_direction_issue, and verdict_grounding_issue.

Comparator:
- Job 91bf6083d26e407c98a474d89d2e618f on commit b5421841ea7f608ddb30906a0de785f365231b12, prompt 8e05b0f...
- Overall: LEANING-TRUE 63/52
- Same 3 final claims.
- Claim verdicts all LEANING-TRUE:
  AC_01 70/62 with 17 supports, 0 contradictions.
  AC_02 58/52 with 11 supports, 0 contradictions.
  AC_03 58/52 with 9 supports, 0 contradictions.
- It uses similar source families including IACHR/Lawfare/HRW, but IACHR state-response/full-access material is support/neutral and confidentiality/publicity material does not dominate as direct contradiction.

Important branch context:
- b5421841 is a held snapshot commit, not current main. Do not recommend wholesale cherry-pick.
- Diff from current to b542 shows held mechanisms:
  directionBasis added to extraction/applicability outputs;
  claimDirectionByClaimId carries directionBasis;
  non-directional bases are normalized to neutral;
  APPLICABILITY_ASSESSMENT includes generic rules for rule-governed compliance claims:
    allegations, concerns, controversies, and dissents are neutral unless they apply the relevant rule/standard to the directly evaluated target and state an operative violation/compliance/safeguard/remedy;
    collateral inquiries, broader institutional controversies, sanctions, and public/media transparency concerns do not transfer to the target proceeding/verdict without a target-specific standards bridge.

Draft recommendation to review:
1. Do not run more canaries yet.
2. Do not revert Stage 1 atomicity or Lane 2/3 ACS admission/coverage.
3. Open a narrow Stage 2/Stage 4 downstream quality lane:
   - re-author claim-local evidence direction basis;
   - re-author generic rule-governed compliance directness in APPLICABILITY_ASSESSMENT;
   - structurally normalize LLM-emitted non-directional bases to neutral;
   - only then decide whether Stage 4 one-sided/support-dominant repair is still needed.

Review questions:
1. Is Stage 2 applicability/direction the primary root cause, or is Stage 4 the primary culprit?
2. Which held mechanisms/commits are true prerequisites?
3. Is LLM-emitted directionBasis plus structural normalization compliant with the no deterministic semantic logic rule?
4. Should Stage 4 repair be held until after a direction-basis canary?
5. What tests and live canaries should gate implementation?

Constraints:
- No domain-specific hardcoding or Bolsonaro-specific terms.
- No deterministic text analysis.
- Prompt changes require explicit Captain approval and generic prompt-contract tests.
- Preserve multilingual robustness.
- Do not propose wholesale merge/cherry-pick of the snapshot branch.
```
