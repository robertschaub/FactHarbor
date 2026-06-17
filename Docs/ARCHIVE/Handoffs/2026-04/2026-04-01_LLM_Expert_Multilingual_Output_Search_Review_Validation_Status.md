---
### 2026-04-01 | LLM Expert | Codex (GPT-5) | Multilingual Output/Search Review, Validation Gate, and Status
**Task:** Sync the multilingual review handoff after implementation hardening completed, record the final review state, and define the remaining promotion gate for the experimental EN supplementary lane.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-01_LLM_Expert_Multilingual_Output_Search_Review_Validation_Status.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Proposal 2 is now implemented in a review-clean experimental state. `LanguageIntent` and `reportLanguage` are explicit pipeline contracts, Stage 4 and Stage 5 are threaded, and the UCM-controlled EN supplementary lane is implemented and hardened. The earlier review findings are closed by follow-up commits `8f9d4fae` and `ac51975c`. The feature should remain default-off pending live multilingual A/B validation.
**Open items:** Run live multilingual A/B validation with the EN lane `OFF` vs `ON`, then make a promotion decision. Deferred scope remains deferred: full UI/chrome/export localization and any remaining deterministic fallback localization work.
**Warnings:** This handoff reflects code review plus the implementer-reported verification state (`1502` tests passed, build clean). I did not rerun the suite or build myself.
**For next agent:** Treat this document as the current multilingual validation gate. The important question is no longer whether the implementation is structurally sound; it is whether enabling the EN lane improves multilingual coverage without reintroducing verdict-direction regressions.
**Learnings:** no

## Review Status

- **Implementation review status:** clean
- **Runtime posture:** shipped in experimental form, `default off`
- **Remaining gate:** live multilingual validation and promotion decision

## Resolved Review Findings

### 1. Scarcity gate semantics aligned with evidence yield
- The EN-lane trigger no longer keys off raw search-result counts.
- Scarcity now evaluates primary-lane evidence yield, which matches the actual coverage-expansion intent more closely.
- Fixed in `8f9d4fae`.

### 2. EN lane now uses the standard relevance and warning path
- EN supplementary retrieval now routes through `classifyRelevance(...)` rather than using a fixed relevance score.
- Provider issues now flow through the normal warning path and also record search failures for circuit-breaker parity.
- Fixed across `8f9d4fae` and `ac51975c`.

### 3. Positive firing-path coverage added
- Targeted tests now cover the positive case where the EN lane is allowed to fire under scarcity.
- The review no longer depends on inferred behavior from negative-path-only coverage.
- Fixed in `8f9d4fae`.

### 4. Dead config removed
- The stale `minPrimaryRelevantResults` field is removed from schema/defaults so UCM no longer advertises obsolete semantics.
- Fixed in `ac51975c`.

## Current Scope Boundaries

- `reportLanguage` governs report-authored analytical prose.
- Source-authored evidence text stays in original language.
- EN supplementation is a coverage-expansion lane only, never a balancing proxy.
- Full UI/chrome/export localization remains out of scope for this track.

## Validation Plan

### Goal
Validate that:
- non-English report-authored prose follows `reportLanguage`
- source-authored evidence remains original-language
- the EN supplementary lane fires only under intended scarcity
- enabling the EN lane does not introduce verdict-direction or confidence regressions

### Live A/B Validation
Keep `supplementaryEnglishLane.enabled`:
- `OFF` for baseline
- `ON` for experimental comparison

Run the same scenario set under both configurations.

Recommended initial set:
1. Plastik recycling — German input
2. Plastik recycling — French input
3. Bolsonaro / legal-process family — Portuguese input
4. One German factual/news control
5. One English control where the EN lane must never fire

Recommended first pass:
- 1 baseline run and 1 experimental run per scenario
- rerun only scenarios with material direction or confidence shifts

### Metrics To Record Per Run
- detected input language
- `reportLanguage`
- whether EN lane fired
- number of primary-lane queries/results/evidence items
- number of EN-lane queries/results/evidence items
- final verdict direction and truth%
- final confidence
- whether source-authored evidence stayed original-language
- whether report-authored text stayed in the input language

## Promotion Gate

Do **not** promote beyond default-off unless:
- report-language purity improves or holds
- source-language evidence preservation holds
- EN lane fires only on intended scarcity cases
- no scenario shows an unexplained verdict-direction regression
- no scenario suggests the EN lane is acting as a balancing proxy

## Status Implication

- Proposal 2 is now implemented and review-clean in experimental form.
- Report-language coherency is shipped.
- EN supplementary retrieval exists, is hardened, and should remain default-off until live validation is complete.
