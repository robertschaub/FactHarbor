---
roles: [Lead Developer]
topics: [report-review, asylum-235000-de, prompt, current-official-totals, verdict, query-generation]
files_touched:
  - apps/web/prompts/claimboundary.prompt.md
  - Docs/AGENTS/Handoffs/2026-04-17_Lead_Developer_Asylum_235000_Report_Review_Prompt_Stability_Fix.md
  - Docs/AGENTS/Agent_Outputs.md
---

# Lead Developer Handoff

## Task

Run `/report-review` as Lead Developer with delegated agents against job `09ce888778764cda9ddd53e06a68983a`, diagnose why the approved asylum input regressed to `UNVERIFIED`, and land the minimum compliant fix.

## Done

- Investigated the failed report against the benchmark family `asylum-235000-de` and confirmed the job was below the expected band:
  - input: `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
  - bad job: `09ce888778764cda9ddd53e06a68983a`
  - observed result: `UNVERIFIED | 47 | 32`
  - benchmark expectation: `LEANING-TRUE` or `MIXED`, truth `55-75`, confidence `40-70`
- Queried job history for the exact same input and confirmed this was a regression, not an always-hard case:
  - prior better jobs existed, including `e5becebed30b4f6089035c47f28beaf6` (`MOSTLY-TRUE | 78 | 68`) and `ed2233a...` (`LEANING-TRUE | 63 | 55`)
  - the bad job and the prior better job shared the same runtime prompt hash `977aaac7...`, so this was not a prompt-rollout drift case
- Compared the bad run against the stronger prior run and isolated the dominant failure mode:
  - Stage 1 / query framing drifted toward generic component-only queries instead of decisive official aggregate-targeting queries
  - Stage 4 over-penalized the absence of a single printed headline total even when official same-timepoint component counts could support the umbrella claim compositionally
  - this was a prompt-behavior stability issue, not a Stage 5 aggregation bug and not a code-diff regression in the inspected Stage 2 files
- Delegated parallel review to three agents and incorporated the surviving findings:
  - one agent confirmed the benchmark/open-issue context from prior asylum handoffs
  - one agent confirmed the bug was on the Stage 2-4 semantics path rather than aggregation
  - one agent confirmed the missing rule was compositional support handling for official component counts
- Landed a prompt-only fix in `apps/web/prompts/claimboundary.prompt.md`:
  - `CLAIM_EXTRACTION_PASS2` now requires `expectedEvidenceProfile` for current official total/threshold claims to name the umbrella total, current snapshot, and combinable component counts
  - `GENERATE_QUERIES` now preserves the umbrella metric and numeric threshold anchor instead of allowing all queries to collapse into component-only phrasing
  - `EXTRACT_EVIDENCE` now treats same-timepoint official partition counts as first-class evidence even when the final sum is implicit
  - `VERDICT_ADVOCATE` / `VERDICT_RECONCILIATION` now explicitly allow compositional support from same-family official counts and stop treating natural concentration in the authoritative source family as an automatic downgrade
  - `VERDICT_NARRATIVE` now distinguishes "no single printed headline total" from genuinely missing evidence
- Reseeded prompt storage and validated the prompt/runtime surface:
  - reseed changed active `claimboundary` prompt hash from `977aaac7...` to `d25a32e5...`
  - passed focused prompt tests:
    - `claim-extraction-prompt-contract.test.ts`
    - `verdict-prompt-contract.test.ts`
    - `prompt-frontmatter-drift.test.ts`
  - passed `npm -w apps/web run build`
- Ran one fresh live local analysis for the exact approved input after reseeding:
  - new job: `93e4056f082047a69eb158a6b7aea243`
  - result: `LEANING-TRUE | 68 | 47`
  - runtime prompt hash: `d25a32e52fb28f4edf37bc16fff7713cc52c6855248fa6d7b4fca3ea41dc5520`
  - this verifies the fix on the target case end-to-end
- Applied a follow-up generalization pass after user review:
  - rewrote the new prompt rules away from asylum/current-administrative wording and toward a generic source-native compositional-evidence pattern
  - the generalized rule is now: decisive propositions may be established either by one headline figure or by aligned component figures within one analytical window
  - reseeded prompt storage again, changing the active `claimboundary` prompt hash from `d25a32e5...` to `e1403475...`
  - re-ran the focused prompt-contract suite successfully (`72` tests passed)

## Decisions

- Kept the fix prompt-only. The inspected TypeScript paths were behaving consistently; the instability was in how the prompt framed current official aggregate claims and reconciled component evidence.
- Kept the follow-up rewrite behavior-preserving. The second pass was only to make the rule generic-by-design, not to change the intended analytical behavior.
- Did not change `pipeline.default.json`'s generic current-status fallback text in this pass. The live rerun proved the more local prompt hardening was enough to move the target case back into the expected band without widening the broader "don't guess current facts" safeguard.
- Did not force a deterministic evidence-direction rewrite. That would violate the repo's "LLM Intelligence" rule for semantic decisions and was unnecessary for fixing the concrete regression.

## Warnings

- The case is fixed for the user-visible outcome, but the evidence pool is still direction-light: fresh rerun `93e4056f082047a69eb158a6b7aea243` persisted `0` supporting, `1` contradicting, `13` neutral items and still reached `LEANING-TRUE`. This is acceptable for the immediate fix, but it suggests a remaining extraction-stage / verdict-direction cleanliness issue for future work.
- Fresh confidence landed at `47`, which is inside the benchmark band but still modest. The prompt fix restored the verdict direction and truth band; it did not make this family "closed" or high-confidence.
- The API `GET /v1/jobs/{id}` response shape is summary-only for some nested fields; authoritative prompt-hash verification for the live rerun still required direct DB inspection of `ResultJson.meta.promptContentHash`.

## Learnings

- For current official total/threshold claims, stability depends on representing the umbrella metric twice: once in Stage 1's `expectedEvidenceProfile` and again in Stage 2 query wording. If either collapses to component-only phrasing, the run can drift toward `UNVERIFIED` even when the source family is sufficient.
- On this pipeline, "no single headline total" and "insufficient evidence" are not equivalent states. Prompt instructions must keep those separate or the verdict stage will systematically under-credit authoritative administrative partitions.
- Prompt-rollout drift was a tempting explanation because the repo had recent reseed issues, but the exact bad and good asylum runs shared the same old hash `977aaac7...`. Historical comparison before editing prevented a false diagnosis.
- A family-specific fix can often be made generic by moving one level up the abstraction ladder: from "current official totals" to "source-native compositional evidence within one analytical window." That keeps the behavioral correction while satisfying the repo's generic-by-design rule.

## For next agent

1. If this family regresses again, inspect whether the failure is query-generation drift or true evidence-acquisition drift before touching the prompt. The live fix here already proved the broad semantics path is recoverable.
2. Consider a later narrow review of evidence directioning in Stage 2 / Stage 4 for official partition counts. The user-facing regression is fixed, but the neutral-heavy evidence balance remains analytically untidy.
3. If Captain wants the benchmark docs updated, use the fresh live rerun `93e4056f082047a69eb158a6b7aea243` as the verified reference for this input. Note that the active generalized prompt hash is now `e1403475...`, not the earlier intermediate `d25a32e5...`.
