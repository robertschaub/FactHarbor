# FactHarbor Prompts

This directory contains all LLM prompts used by FactHarbor. Prompts are stored in the database for versioning and tracked via content hashes.

## Prompt Architecture (v2.8.3)

**Prompts are the single source of truth** for evaluation criteria. Code should NOT duplicate or override prompt logic.

| Principle | Description |
|-----------|-------------|
| **Prompt Authoritative** | All evaluation criteria, bands, caps, and patterns are defined in prompts |
| **Code Validates** | Code ensures score↔rating alignment but does NOT override LLM decisions |
| **Database Versioned** | Prompts stored in `config_blobs` with content hashes for tracking |
| **Admin Editable** | Edit via Admin UI at `/admin/config?type=prompt` |

## Prompt Files

| Profile | File | Description |
|---------|------|-------------|
| `orchestrated` | `orchestrated.prompt.md` | Main pipeline prompt (Understand phase) |
| `monolithic-canonical` | `monolithic-canonical.prompt.md` | Single-call pipeline prompt |
| `source-reliability` | `source-reliability.prompt.md` | Source reliability evaluation |
| `text-analysis-*` | `text-analysis/*.prompt.md` | LLM text analysis (4 prompts) |

## Source Reliability (v2.8.3)

The source-reliability prompt is **fully authoritative** for:
- Rating scale bands (0.86-1.00 = highly_reliable, etc.)
- Source type score caps (propaganda_outlet max 0.14, etc.)
- Source type classification criteria
- Evidence quality hierarchy
- Recognized assessor tiers

**To change evaluation criteria:** Edit `source-reliability.prompt.md` and reseed to database.

**Code reference values** in `source-reliability-config.ts` are for validation warnings only and do NOT override LLM output.

## Text Analysis (v2.8.3)

Four specialized prompts for LLM text analysis. See [text-analysis/README.md](text-analysis/README.md).

LLM enabled by default. Set `FH_LLM_*=false` to disable.

## Reseeding Prompts

To reload all prompts from files into the database:

```bash
cd apps/web
npx tsx -e "import { seedAllPromptsFromFiles } from './src/lib/config-storage'; seedAllPromptsFromFiles().then(console.log)"
```

To reseed a specific prompt:

```bash
npx tsx -e "import { seedPromptFromFile } from './src/lib/config-storage'; seedPromptFromFile('source-reliability', true).then(console.log)"
```

## Version History

### v2.8.3 (2026-01-30)
- Source-reliability prompt now authoritative (code caps removed)
- Text-analysis prompts aligned with heuristic code patterns
- LLM text analysis enabled by default

### v2.6.41 (2026-01-27)
- Unified configuration management for prompts
- Database-backed versioning with content hashes
