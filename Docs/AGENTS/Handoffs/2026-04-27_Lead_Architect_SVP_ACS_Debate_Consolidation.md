# 2026-04-27 - Lead Architect - SVP ACS Debate Consolidation

**Role:** Lead Architect
**Agent:** Codex (GPT-5) with FULL-tier `/debate` reviewers
**Status:** Consolidated decision complete; implementation not started
**Source investigation:** `Docs/AGENTS/Handoffs/2026-04-27_Lead_Architect_SVP_ACS_Research_Waste_Investigation.md`

## Proposition Debated

Adopt the staged improvement path for broad-input ACS research waste:

1. instrument selected-vs-dropped preliminary work,
2. persist/reuse a bounded selected preliminary source bundle from draft preparation into the final selected job,
3. reserve research time for contradiction work,
4. make ACS recommendation budget-aware so it may recommend fewer than 5 claims when justified,
5. defer the larger two-lane Stage 1 redesign,
6. do not restore a blind hard cap on article-like candidate extraction.

## Debate Panel

- Advocate: argued for the staged path.
- Challenger: argued against immediate reuse/prompt changes and proposed gated shadow instrumentation first.
- Consistency Probe 1: cost-first framing.
- Consistency Probe 2: alternatives-first framing.
- Reconciler: final decision.
- Validator: structural/grounding/direction check.

## Evidence Envelope

- Draft-backed final jobs validate `selectedClaimIds` and filter prepared understanding before Stage 2, so the main waste is not direct post-ACS research on dropped claims.
- SVP job `b8def4575c0749288a76c138838934d9` ended `UNVERIFIED` with `38` LLM calls, `4` main iterations, `0` contradiction iterations, `0` contradiction sources, `41` evidence items, and `0` contradicting evidence items.
- Its draft had `18` candidates, `5` selected claims, `339159ms` total preparation time, `298938ms` Stage 1 time, and `40205ms` recommendation time. Same-URL drafts varied across `18`, `25`, `34`, `38`, and `50` candidates.
- `PreparedStage1Snapshot` and `ClaimSelectionDraftState` do not persist fetched source records/full text.
- Stage 1 preliminary search runs before ACS.
- Article-like contract-preserving inputs bypass the centrality cap.
- Existing same-job source reuse guidance supports exact document/data source reuse more readily than HTML reuse, which must preserve same-family discovery.

Known gaps remain:

- no selected-vs-dropped preliminary work metrics,
- no measured Stage 1 to Stage 2 source-overlap metrics,
- no approved source-bundle format/provenance/invalidation design,
- no live rerun,
- unresolved same-URL candidate-count variance.

## Reconciler Verdict

**Verdict:** `MODIFY`.

Adopt the staged direction, but do not treat all five steps as implementation-approved. The source-bundle reuse and budget-aware ACS behavior must be gated behind shadow instrumentation, safety design, and LLM Expert review.

## Point-By-Point Resolution

| Point | Winner | Resolution |
| --- | --- | --- |
| Diagnosis scope | Advocate | The evidence narrows waste away from unselected final Stage 2 work and toward pre-selection Stage 1 work, missing final-job source reuse, and contradiction starvation. |
| Instrumentation first | Challenger | Selected-vs-dropped preliminary cost and source-overlap value are unproven; instrumentation must precede broad reuse. |
| Source bundle reuse | Challenger | The reuse hypothesis is plausible, but immediate persistence/reuse is blocked by missing overlap metrics and missing bundle safety design. |
| Contradiction reservation | Advocate | The inspected job used the budget with zero contradiction iterations; contradiction capacity must be protected through UCM-configurable admission/reservation. |
| Budget-aware ACS | Challenger | The idea is valid, but it needs LLM Expert review and explicit budget-fit/defer semantics; no silent fewer-than-5 rule. |
| Two-lane Stage 1 redesign | Advocate | Defer the larger redesign until instrumentation and candidate-variance data prove it is necessary. |
| Blind article-like cap | Advocate | Do not restore a blind cap; it risks broad-input claim-contract coverage. |

## Consolidated Architecture Decision

Proceed with a gated plan:

1. **Implement shadow instrumentation first.** Track selected-vs-dropped preliminary queries, fetches, evidence, source URLs, source text bytes, and Stage 2 overlap. This is the first implementation slice.
2. **Protect contradiction work as a first-class admission constraint.** Do not merely reserve a nominal iteration. Add UCM-configurable budget/admission behavior so main research cannot consume the entire run before contradiction research. If minimum contradiction work cannot run, surface a degrading research-incomplete signal.
3. **Design source reuse before enabling it.** Initially persist only provenance hashes and exact selected-source URL references in shadow metrics. Enable full bounded document/data source artifact reuse only after overlap metrics show value and the safety design covers format, size limits, content hash, stale invalidation, source family, and HTML discovery semantics.
4. **Make ACS budget-aware only through reviewed prompt/config work.** Require LLM Expert review. ACS may recommend fewer than 5 only with explicit budget-fit rationale and a "defer remaining claims" state; no deterministic semantic filtering or hidden claim dropping.
5. **Do not cap article-like candidate extraction blindly.** Preserve claim-contract coverage; solve budget pressure with selection, scheduling, reuse, and later Stage 1 redesign if evidence warrants it.
6. **Defer the two-lane Stage 1 redesign.** Keep it as the architectural fallback if instrumentation shows pre-ACS preliminary evidence search is the dominant waste source or same-URL candidate variance remains unacceptable.

## Validator Result

**Result:** `PASS-WITH-CAVEATS`.

The modified decision respects the structural evidence and project constraints. It is valid as a gated plan, not as approval to implement source reuse or ACS prompt/config changes immediately.

## Warnings

- No code changes were made.
- No live rerun or expensive validation was performed.
- `/debt-guard` is required before any implementation because this is a bugfix/performance-quality path.
- LLM Expert review is required before changing ACS recommendation prompt/config behavior.
- Source reuse must preserve the document/data vs HTML safety boundary from the 2026-04-23 source reuse handoff.

## Learnings

- The reviewers agreed that selected final jobs are already filtered; the architecture target is pre-selection work, lost handoff state, and final research budget/admission behavior.
- The source-bundle idea survives only as a gated hypothesis, not as an immediate implementation item.
- The next implementation should be instrumentation plus contradiction admission, not a broad Stage 1 rewrite.
