# Prompt System Architecture Issues Report

**Date:** 2026-04-15  
**Scope:** Prompt-system issues found while tracing the live LLM prompt architecture in `apps/web/`

---

## Executive Summary

The main ClaimBoundary prompt path is coherent: prompt files seed UCM, runtime loads prompt content from `config_blobs`, sections are rendered via `prompt-loader.ts`, and job-level prompt usage is tracked.

The prompt system is not uniform outside that path. Four issues were verified:

1. **Source-reliability core evaluation is still driven by TypeScript prompt builders, not by the UCM/file-backed prompt file that docs describe as authoritative.**
2. **The inverse-claim verification micro-prompt bypasses UCM and provenance entirely via direct disk reads.**
3. **The `text-analysis` prompt architecture is stale/inconsistent across runtime types, seeding rules, files on disk, and docs.**
4. **Prompt-system documentation currently overstates architectural consistency and no longer matches the live repository in several places.**

These are not all user-visible runtime bugs today, but they are real architecture and governance problems: they weaken prompt provenance, reduce admin editability, and make the repo harder to reason about correctly.

---

## Findings Table

| ID | Severity | Issue | Short impact |
|---|---|---|---|
| PSA-1 | High | Source-reliability core prompt path bypasses UCM/file prompt | Admin-edited prompt file is not the real source of truth for the main SR evaluation path |
| PSA-2 | Medium | Inverse-claim verification prompt bypasses prompt infrastructure | No prompt hash/provenance, no admin editability, different template conventions |
| PSA-3 | Medium | `text-analysis` prompt contract is stale/inconsistent | Runtime types, seeding rules, and docs point to a prompt surface that no longer exists cleanly |
| PSA-4 | Medium | Prompt docs/runtime drift | Developers and agents can make wrong assumptions about where prompt authority really lives |

---

## PSA-1: Source-Reliability Core Evaluation Bypasses the File/UCM Prompt Path

### What was verified

- The prompt docs say the source-reliability prompt file is authoritative:
  - [apps/web/prompts/README.md](../../apps/web/prompts/README.md)
- The enrichment path does load sections from the file/UCM-backed prompt:
  - [apps/web/src/lib/source-reliability/sr-eval-enrichment.ts](../../apps/web/src/lib/source-reliability/sr-eval-enrichment.ts)
- But the core SR evaluation/refinement path still imports and uses large TypeScript prompt builders:
  - [apps/web/src/lib/source-reliability/sr-eval-engine.ts](../../apps/web/src/lib/source-reliability/sr-eval-engine.ts)
  - [apps/web/src/lib/source-reliability/sr-eval-prompts.ts](../../apps/web/src/lib/source-reliability/sr-eval-prompts.ts)

### Why this is a problem

- The docs currently imply that editing `apps/web/prompts/source-reliability.prompt.md` changes the source-reliability evaluation logic. That is not fully true for the main evaluation/refinement path.
- Prompt provenance is uneven. The main analyzer records prompt usage via `config_usage`, but the SR core path is not obviously governed by the same DB-backed prompt content.
- The repo now has two sources of truth for SR prompt semantics:
  - the markdown prompt file
  - the TypeScript prompt builder constants/templates
- This creates drift risk for rating bands, caps, wording, and examples.

### Recommended direction

Choose one and make it explicit:

1. **Preferred:** migrate SR primary/refinement prompts into `source-reliability.prompt.md` sections and load them through the same UCM-backed path as ClaimBoundary.
2. **Fallback:** if SR is intentionally staying code-built for now, update the docs so they stop claiming the markdown file is fully authoritative.

---

## PSA-2: Inverse-Claim Verification Prompt Bypasses UCM and Provenance

### What was verified

- The micro-prompt exists on disk only:
  - [apps/web/prompts/text-analysis/inverse-claim-verification.prompt.md](../../apps/web/prompts/text-analysis/inverse-claim-verification.prompt.md)
- The caller reads it directly from disk and manually substitutes `{{CLAIM_A}}` / `{{CLAIM_B}}`:
  - [apps/web/src/lib/calibration/paired-job-audit.ts](../../apps/web/src/lib/calibration/paired-job-audit.ts)
- The code comment says it is UCM-managed, but the implementation does not use `config-loader.ts` or `prompt-loader.ts`.

### Why this is a problem

- No `config_usage` record or prompt hash is captured for this prompt.
- Admin-side prompt editing and reseeding do not govern this call path.
- It uses a different placeholder convention (`{{...}}`) than the main prompt system (`${...}`), which increases conceptual drift.
- This is a small path, but it weakens the repo-wide claim that prompts are centrally managed and auditable.

### Recommended direction

Either:

1. move this micro-prompt onto a real UCM-backed prompt profile/section, or
2. explicitly classify it as a local disk-only calibration helper and remove the misleading “UCM-managed” wording.

---

## PSA-3: `text-analysis` Prompt Architecture Is Stale/Inconsistent

### What was verified

- `prompt-loader.ts` still exposes a `text-analysis` pipeline:
  - [apps/web/src/lib/analyzer/prompt-loader.ts](../../apps/web/src/lib/analyzer/prompt-loader.ts)
- `config-schemas.ts` still treats `text-analysis` as a valid prompt pipeline in frontmatter validation:
  - [apps/web/src/lib/config-schemas.ts](../../apps/web/src/lib/config-schemas.ts)
- But prompt seeding does **not** treat `text-analysis` as a valid seedable prompt profile:
  - [apps/web/src/lib/config-storage.ts](../../apps/web/src/lib/config-storage.ts)
- On disk, there is no `apps/web/prompts/text-analysis.prompt.md` profile file. The folder currently contains only:
  - `inverse-claim-verification.prompt.md`
- `apps/web/prompts/README.md` points to a missing file:
  - `text-analysis/README.md`

### Why this is a problem

- The code advertises a prompt profile that the seeding layer does not support.
- The docs describe a prompt family that is not represented cleanly in the current prompt storage model.
- This creates a trap for future maintainers: the runtime types suggest “just use `text-analysis` through the prompt loader,” but the seeding/storage layer and actual files disagree.

### Recommended direction

Pick one architecture and remove the half-state:

1. **Formalize text-analysis prompts** as real prompt profiles/sections with UCM seeding and clear files, or
2. **Delete the stale `text-analysis` prompt-profile references** from shared runtime/schema/docs and treat the remaining inverse-check file as a standalone helper.

---

## PSA-4: Prompt Documentation Overstates Consistency

### What was verified

- [apps/web/prompts/README.md](../../apps/web/prompts/README.md) states:
  - prompts are the authoritative source of truth
  - `source-reliability.prompt.md` is fully authoritative
  - `text-analysis/README.md` exists
- [Docs/STATUS/Current_Status.md](../STATUS/Current_Status.md) still describes a fuller LLM text-analysis prompt layout with README-backed prompt files.

### Why this is a problem

- The current docs make the architecture look more uniform than it is.
- That raises the odds of incorrect engineering decisions, especially around:
  - prompt rollout expectations
  - prompt provenance expectations
  - admin editability expectations
  - where to fix behavior when SR or text-analysis logic changes

### Recommended direction

After the architectural decision for PSA-1 and PSA-3 is made:

1. update `apps/web/prompts/README.md`
2. update `Docs/STATUS/Current_Status.md`
3. remove references to missing `text-analysis/README.md`
4. document the remaining exceptions explicitly if they are intentional

---

## Suggested Backlog Shape

These findings fit best as one architecture/technical-debt item, not four separate immediate priorities:

- **Prompt-system architecture cleanup**
  - unify the real source of truth for source-reliability prompts
  - migrate or explicitly exempt the inverse-claim verification helper
  - remove or formalize the stale `text-analysis` prompt profile
  - bring docs back into alignment with the chosen architecture

---

## Bottom Line

The ClaimBoundary prompt system is in good shape. The broader prompt architecture is not yet internally consistent.

The main correction needed is not “rewrite all prompts.” It is to decide whether FactHarbor wants one real prompt-governance model across analyzer surfaces, then make the SR path, micro-prompt exceptions, prompt profile types, and docs tell the same story.
