# FactHarbor Prompts

This directory contains LLM prompt source files. Prompts are stored in the database (`config_blobs`) for versioning and tracked by content hash. The files here are the authoritative source that gets reseeded into the database.

## Prompt Architecture

**Prompts are the single source of truth** for evaluation criteria. Code should NOT duplicate or override prompt logic.

| Principle | Description |
|-----------|-------------|
| **Prompt Authoritative** | All evaluation criteria, bands, caps, and patterns are defined in prompts |
| **Code Validates** | Code ensures structural alignment but does NOT override LLM decisions |
| **Database Versioned** | Prompts stored in `config_blobs` with content hashes for tracking |
| **Admin Editable** | Edit via Admin UI at `/admin/config?type=prompt` |

## Prompt Files (current)

| Profile | File | Purpose |
|---------|------|---------|
| `claimboundary` | `claimboundary.prompt.md` | **Primary pipeline.** All five ClaimBoundary stages (extraction, contract validation, research, clustering, verdict, narrative, article adjudication, grouping). Single source of truth for the live pipeline. |
| `source-reliability` | `source-reliability.prompt.md` | Source reliability evaluation prompts (per-source rating). |
| `text-analysis-*` | `text-analysis/*.prompt.md` | Lightweight LLM text analysis helpers used outside the main pipeline. |
| `input-policy-gate` | `input-policy-gate.prompt.md` | Input policy gate prompts. |

## Legacy / DB-only profiles

| Profile | File on disk? | Notes |
|---------|---------------|-------|
| `orchestrated` | **No file.** | DB-only legacy profile from the removed Orchestrated pipeline. The only remaining runtime reference is `apps/web/src/lib/analyzer/grounding-check.ts`, which loads two sections (`GROUNDING_KEY_TERMS_BATCH_USER`, `GROUNDING_ADJUDICATION_BATCH_USER`) via `loadAndRenderSection("orchestrated", ...)`. The profile is kept in the database for those two grounding-check calls; do not re-add a file under this name. |

When the `grounding-check.ts` dependency is migrated to `claimboundary.prompt.md` (or replaced), the `orchestrated` profile can be removed from the database and `prompt-loader.ts` together.

## Authoritative ClaimBoundary sections

The `claimboundary.prompt.md` frontmatter `requiredSections` list is the contract between the file and the runtime. A test (`prompt-frontmatter-drift.test.ts`) asserts that every `## SECTION` heading in the body is listed in frontmatter and vice versa, so any drift fails the build.

## Split Manifest Support

Prompt source files may be split for maintainability, but UCM still stores one composite prompt per profile. If `prompts/<profile>/manifest.json` exists, reseeding assembles the composite from the manifest's `frontmatterPath` plus ordered `files` entries before saving `prompt|<profile>` to `config_blobs`.

Manifest constraints:

- `schemaVersion` is `1`.
- `profile` must match the requested prompt profile.
- `frontmatterPath` points to the YAML frontmatter source.
- Each ordered file entry lists its relative `path` and the exact `## SECTION` headings it owns.
- The ordered section list from all files must exactly match frontmatter `requiredSections`.
- Manifest paths must stay inside the manifest directory.
- Parts are joined with one blank line by default; an explicit `joiner` may override this only when equivalence tests prove the composite is valid.

Admin diff/export/job provenance continue to operate on the composite prompt blob and content hash. Section-level admin profiles are intentionally not introduced by the split source layout.

## Source Reliability

The source-reliability prompt is **fully authoritative** for:
- Rating scale bands (0.86–1.00 = highly_reliable, etc.)
- Source type score caps
- Source type classification criteria
- Evidence quality hierarchy
- Recognized assessor tiers

To change evaluation criteria, edit `source-reliability.prompt.md` and reseed the database.

Code reference values in `source-reliability-config.ts` are for validation warnings only and do NOT override LLM output.

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
