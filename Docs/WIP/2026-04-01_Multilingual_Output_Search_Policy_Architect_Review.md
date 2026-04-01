# Multilingual Output & Search Policy — Architect Review

**Date:** 2026-04-01
**Role:** Lead Architect (Senior Architect)
**Status:** APPROVED

## Review Summary
I reviewed `Docs/WIP/2026-04-01_Multilingual_Output_Search_Policy_Investigation.md` and the associated handoff proposals.

**Decision: Proposal 2 is APPROVED for implementation.**

Separating report-language policy from retrieval-language policy, while explicitly keeping full UI/chrome localization out of scope, is architecturally sound. It isolates core analysis-pipeline behavior from presentation-tier i18n concerns and protects evidence auditability.

## Architectural Notes & Constraints

### 1. State and Schema Evolution
Introducing explicit `LanguageIntent` into the top-level pipeline state is approved.

- **Constraint:** `reportLanguage` must become a strongly typed, cross-stage contract in `apps/web/src/lib/analyzer/types.ts`.
- **Constraint:** `retrievalLanguages` must be explicit runtime state rather than implicit prompt behavior.
- **Constraint:** All Stage 4 and Stage 5 prompt paths that produce persisted analytical prose must take `reportLanguage` explicitly.

### 2. Evidence Chain of Custody
Preserving source-authored evidence text in its original language is a hard requirement.

- **Constraint:** Excerpts, quotes, and source-derived evidence text must remain original-language.
- **Constraint:** Dynamic translation of source-derived evidence during extraction or verdict generation is not allowed.

### 3. Retrieval Policy
The failed March 22 supplementary-language experiment showed that language expansion and evidential direction must remain separate.

- **Constraint:** English retrieval supplementation is permitted only as a coverage-expansion lane.
- **Constraint:** It must never be used as a proxy for contrarian, opposing, or balancing evidence.
- **Constraint:** Triggering should depend on source coverage scarcity or a similarly explicit coverage rationale, not on evidential direction.

### 4. Presentation / Chrome Boundary
Deferring broader UI localization is the correct scope boundary.

- **Constraint:** Full UI, warning, and export chrome localization stays out of scope for this track.
- **Constraint:** Stage 5 fallback narratives should respect `reportLanguage` where feasible, or be explicitly documented if they remain English-only.

## Approved Implementation Shape

1. Add explicit `LanguageIntent` state with at least:
   - `inputLanguage`
   - `reportLanguage`
   - `retrievalLanguages`
2. Thread `reportLanguage` through Stage 4 and Stage 5 prompt payloads.
3. Keep source-authored evidence original-language.
4. Implement original-language-first retrieval with optional English supplementation only as a coverage-expansion lane.
5. Defer full UI/chrome/export localization.

## Risks Converted Into Constraints

### Loss of Evidence Transparency
Addressed by the hard requirement to keep source-authored evidence original-language.

### March 22 Regression Reappearing
Addressed by prohibiting English retrieval from acting as a balancing proxy.

### Scope Creep
Addressed by explicitly deferring full UI/chrome/export localization to a separate i18n project.

### Mixed-Language Fallback Drift
Addressed by requiring `reportLanguage` to be an explicit Stage 4/5 contract and by requiring fallback paths to honor it where feasible.

## Next Steps for the Implementer

1. Update `apps/web/src/lib/analyzer/types.ts` with explicit `LanguageIntent` state.
2. Thread `reportLanguage` through Stage 4 and Stage 5 prompt payloads in:
   - `apps/web/src/lib/analyzer/verdict-stage.ts`
   - `apps/web/src/lib/analyzer/aggregation-stage.ts`
   - `apps/web/prompts/claimboundary.prompt.md`
3. Implement explicit Stage 2 retrieval-lane handling in:
   - `apps/web/src/lib/analyzer/research-query-stage.ts`
   - `apps/web/src/lib/analyzer/research-orchestrator.ts`
4. Keep UI/chrome/export localization out of scope for this implementation.
