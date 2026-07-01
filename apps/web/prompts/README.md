# FactHarbor Prompts

This directory contains LLM prompt source files. Prompts are stored in the database (`config_blobs`) for versioning and tracked by content hash. A file is authoritative only for runtime paths that actually load that profile and section; check the ownership notes below before editing.

## Prompt Architecture

**Prompts should be the single source of truth** for LLM evaluation criteria where the runtime loads them. Some legacy surfaces still have TypeScript-owned prompt builders; those are called out below.

| Principle | Description |
|-----------|-------------|
| **Prompt Authoritative** | Runtime-loaded prompt sections define the LLM instructions for that path |
| **Code Validates** | Code ensures structural alignment; any intentional post-processing must be documented with the runtime owner |
| **Database Versioned** | Prompts stored in `config_blobs` with content hashes for tracking |
| **Admin Editable** | Edit via Admin UI at `/admin/config?type=prompt` |

## Prompt Files (current)

| Profile | File | Purpose |
|---------|------|---------|
| `claimboundary` | `claimboundary.prompt.md` | **Primary pipeline.** All five ClaimBoundary stages (extraction, contract validation, research, clustering, verdict, narrative, article adjudication, grouping). Single source of truth for the live pipeline. |
| `source-reliability` | `source-reliability.prompt.md` | Runtime-read for source-reliability evidence-quality assessment sections. Main SR evaluation/refinement prompts are currently TypeScript-owned; see below. |
| `text-analysis-*` | `text-analysis/*.prompt.md` | Lightweight LLM text analysis helpers used outside the main pipeline. |
| `input-policy-gate` | `input-policy-gate.prompt.md` | Input policy gate prompts. |

## Legacy / DB-only profiles

| Profile | File on disk? | Notes |
|---------|---------------|-------|
| `orchestrated` | **No file.** | DB-only legacy profile from the removed Orchestrated pipeline. The only remaining runtime reference is `apps/web/src/lib/analyzer/grounding-check.ts`, which loads two sections (`GROUNDING_KEY_TERMS_BATCH_USER`, `GROUNDING_ADJUDICATION_BATCH_USER`) via `loadAndRenderSection("orchestrated", ...)`. The profile is kept in the database for those two grounding-check calls; do not re-add a file under this name. |

When the `grounding-check.ts` dependency is migrated to `claimboundary.prompt.md` (or replaced), the `orchestrated` profile can be removed from the database and `prompt-loader.ts` together.

## Authoritative ClaimBoundary sections

The `claimboundary.prompt.md` frontmatter `requiredSections` list is the contract between the file and the runtime. A test (`prompt-frontmatter-drift.test.ts`) asserts that every `## SECTION` heading in the body is listed in frontmatter and vice versa, so any drift fails the build.

## Source Reliability

Current ownership is split:

- Main SR evaluation and refinement prompts are TypeScript-owned in `src/lib/source-reliability/sr-eval-prompts.ts` and invoked by `sr-eval-engine.ts`.
- `source-reliability.prompt.md` is runtime-read by `sr-eval-enrichment.ts` for `EVIDENCE QUALITY ASSESSMENT TASK`, `EVIDENCE QUALITY ASSESSMENT OUTPUT FORMAT`, and the recognized-assessor section reused by that task.
- Source-type caps and score/rating alignment are enforced after LLM output by `source-reliability-config.ts` and `sr-eval-engine.ts`.

Do not edit `source-reliability.prompt.md` expecting the main SR evaluation prompt to change unless the runtime is first migrated to load that profile for the main evaluation path. Until that migration, behavior changes to main SR criteria must update the TypeScript prompt builder, post-processing code, and tests together.

## Text Analysis

Lightweight specialized prompts. See [text-analysis/README.md](text-analysis/README.md).

## Reseeding Prompts

Prompt files are reseeded into the database automatically by the postbuild hook (`scripts/reseed-all-prompts.ts`). To force a reseed manually:

```bash
cd apps/web
npx tsx scripts/reseed-all-prompts.ts
```

To reseed a specific prompt programmatically:

```bash
npx tsx -e "import { seedPromptFromFile } from './src/lib/config-storage'; seedPromptFromFile('source-reliability', true).then(console.log)"
```
