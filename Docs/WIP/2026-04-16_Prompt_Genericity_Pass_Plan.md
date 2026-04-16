# Prompt Genericity Pass — Plan

**Date:** 2026-04-16
**Author:** LLM Expert (review) + Captain (direction)
**Target file:** `apps/web/prompts/claimboundary.prompt.md`
**Related contract test:** `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`

## Goal

Remove residual input-shaped wording (asylum-statistics family; Bolsonaro/US-State-Department family; legal-proceedings family) from the `claimboundary` prompt without changing any of the intended behaviors. Keep actor-class and safety-boundary language explicit where it is load-bearing.

## Decision table

| # | Area | Current prompt (line) | Decision | Applied wording |
|---|------|----------------------|----------|-----------------|
| 1 | Publication artifact wording | L639 | Accept | `When the decisive figure is published in a source-native data artifact or update stream rather than in summary prose, prefer queries that target the artifact carrying the figure itself instead of only the overview or landing page.` |
| 2 | Present-state freshness rule | L641 | Accept with fix (keep markers) | `When the claim is explicitly about the present or current state (for example: current, currently, now, today, aktuell, derzeit, zurzeit, en ce moment), prioritize the newest source-native route intended to reflect the current state before falling back to historical or retrospective summaries.` |
| 3 | Adjacent-number examples | L643 | Accept | `If existing evidence already provides nearby or partial quantitative context but not the decisive figure implied by expectedEvidenceProfile, tighten the next queries toward the missing total, threshold, or components instead of repeating the same broad source family.` |
| 4 | Distinct-events example | L710 (and L704 rule above) | Accept + broaden | L710 → `Example pattern (abstract): if distinctEvents contains multiple separately named events, generate one query for each event rather than a single merged topical query.` **Also** L704: `events, proceedings, or time-bounded episodes` → `events or time-bounded episodes`. |
| 5 | foreign_reaction def — relevance | L770, L772-773 | Accept | Def: `foreign_reaction: Evidence produced by foreign governments or their legislative or executive bodies about the claim's jurisdiction, including official actions, resolutions, or formal assessments. These are political reactions, not evidence about the claim's substance. Score at most 0.3.` Example: `Foreign news coverage whose substantive evidence is a foreign government's own action or formal assessment about the jurisdiction is foreign_reaction.` |
| 6 | foreign_reaction def — applicability | L1909, L1923 | Accept | Def (L1909): `foreign_reaction: Evidence produced by foreign governments or their legislative or executive bodies about the claim's jurisdiction, including official actions, resolutions, or formal assessments. These are political reactions, not evidence about the claim's substance.` Framing-immunity rule (L1923): `Foreign government assessments, rankings, monitoring reports, or official evaluations about the jurisdiction remain foreign_reaction even when framed as neutral or standards-based analysis.` |
| 7 | (new) Contextual example "27 years" | L772 | Add to pass | Replace `"Country A sentences leader to 27 years"` with `"Country A court rules on senior official"` (no specific sentence number). |
| 8 | (new) distinctEvents sanctions example | L292, L296 | Sweep for consistency | Keep actor-class references; lightly generalize the enumerations so they match the vocabulary of #5/#6 (remove the stray "sanctions" listing item at L292 if it duplicates; keep L296's "foreign reaction" worked example but soften "sanctions"). Exact wording decided at edit time; behavior unchanged. |
| 9 | (new) VERDICT_ADVOCATE parallel enum | L1157 | Align wording | The same `"governance, integrity, safety, or institutional performance"` enumeration appears here. Soften to match #6 so the prompt is internally consistent: `...even when framed as neutral, standards-based, or institutional analysis.` |
| 10 | (new) Hardened applicability rule | L1921 | Align wording | The hardened line added by today's earlier Applicability fix still contains the same heavy enumeration (`court events, procedural concerns, rights conditions, institutional performance, governance, integrity, or standards`). Soften to: `...even when they summarize local events, procedures, or institutional conditions.` Behavior preserved: foreign-government summary ≠ contextual upgrade. |

Items 7–10 are *not* in the captain-approved proposal table; they are required for consistency with the accepted proposals and to fully remove the Bolsonaro fingerprint. Captain should approve or reject each before edit.

## Contract tests that will need updating

The prompt-contract test already locks some of the exact strings we are about to change. Without updating the test, the edits will fail CI.

| Test | File / line | Current expectation | New expectation (aligned with this plan) |
|------|-------------|---------------------|------------------------------------------|
| `advocate treats foreign government assessment reports as positional outputs requiring corroboration` | `verdict-prompt-contract.test.ts:270` | `"Foreign government-issued country reports, monitoring reports, scorecards, or official assessments"` | Assert the semantic invariants only: actor class + "positional outputs" + "not … independent high-probative contradiction unless … corroborated". Drop the exact enumeration string. |
| `keeps foreign government assessments as foreign_reaction even when framed as substantive analysis` | `verdict-prompt-contract.test.ts:549` | `"governance, rights, safety, integrity, performance, or standards"` | Replace with an assertion on the generalized framing-immunity wording (`"neutral or standards-based analysis"`) and on the example sentence that the worked case still classifies as `foreign_reaction`. |

**Do NOT extend** the forbidden-terms list at `verdict-prompt-contract.test.ts:567-576`. Adding new string-match locks as mitigation for this pass is the wrong shape of guardrail (see Risks below). Existing forbidden-terms stay as-is.

No other contract tests should need changes. The `proceeding` references in tests at lines 423/446/479/484/527/536/551/563 are in places where the word is semantically correct (comparator-evidence rules about legal cases are still legitimate; we are not banning "proceeding" as a word — only removing it from slots where any multi-instance noun would do).

## Implementation order

1. **Edit prompt** (`claimboundary.prompt.md`) — items 1–6 first, then 7–10 as one follow-up section. One commit.
2. **Edit contract tests** (`verdict-prompt-contract.test.ts`) — update the three tests listed above. Same commit or immediate follow-up commit.
3. **Reseed prompts:** `npm -w apps/web run reseed:prompts` to refresh the `config_active` prompt hash.
4. **Run focused tests:**
   - `npm -w apps/web run test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts`
   - `npm -w apps/web run test -- test/unit/lib/analyzer/research-extraction-stage.test.ts`
5. **Run full safe test suite:** `npm test` (no `test:llm` / `test:expensive`).
6. **Record new prompt hash** in the commit message so future agents can diff against it.

## Verification (behavioral, not just mechanical)

Because these are prompt changes, passing tests is necessary but not sufficient. After the reseed, run one live replay to confirm the behavior is preserved:

- Replay the Bolsonaro input (`Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`) — the same input used by the applicability fix earlier today.
- Check `resultJson.meta.promptContentHash` matches the new active hash.
- Confirm `state.gov` foreign-assessment evidence is still classified `foreign_reaction` and is not cited as contradicting evidence.

If that behavior regresses, the edits in items 5, 6, 9, 10 went too far and we tighten back one step.

## Risks and mitigations

Mitigations are **prompt-side** (better examples, contrastive pairs) or **workflow-side** (split commits, live-replay gate). No new code-side string matching: per repo rule, prompt-behavior guardrails belong in the prompt and in live replay, not in expanded `.toContain()` / forbidden-term tests.

- **Risk 1 — foreign-assessment classification regression.** Removing the `"governance, rights, safety, integrity, performance, or standards"` enumeration is a semantic loss. Mitigations, combined:
  1. **Keep the worked example at L1923** (`Foreign government report rates Country A institutions as failing core standards → foreign_reaction`) when removing the enumeration — the example carries the semantic content the list was pinning down.
  2. **Add a contrastive pair in the prompt** alongside the existing positive case: negative counterpart `Foreign academic study rates Country A institutions as failing core standards → contextual`. Contrastive pairs teach the actor-class boundary more robustly than enumerations.
  3. **Split commits** — items 1–4 (query-generation wording, low-risk) as one commit; items 5/6/9/10 (foreign_reaction semantics, high-risk) as a separate commit. Blast-radius isolation.
  4. **Bolsonaro replay as a hard gate.** The foreign_reaction commit lands only if the replay of the `state.gov` seeded evidence still classifies as `foreign_reaction` and the item is not cited as contradicting. If it leaks, revert and re-edit with a softer middle-ground wording (e.g., add back a short 2–3-word phrase like `"standards-based or rights-based analysis"`).

- **Risk 2 — marker-list drift.** Item #2 preserves the multilingual present-state markers, but a future edit could trim them. Accepted risk: any drop will surface in a current-state replay, not in a test. Documented here so the next editor sees the intent.

- **Risk 3 — contract-test loosening.** Replacing two exact-string assertions ([L270](apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts#L270), [L549](apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts#L549)) with assertions on the generalized wording is a small loosening of the lock. Accepted: these tests exist to prevent silent regression of the *semantic invariant* (actor class + framing immunity), not to freeze exact wording. We do not compensate by adding new string-match tests elsewhere.

## Out of scope for this pass

- Line 768 (`direct: Evidence produced by institutions, courts, agencies, or researchers…`) — the enumeration is there for a reason (tells the model what counts as in-jurisdiction); not input-shaped.
- Line 1917 (`International bodies (UN, ICC, ECHR)`) — standard international bodies, not input-shaped.
- Any other stage-5 or reconciliation prompt. Scope is `claimboundary.prompt.md` only per captain's ask.
