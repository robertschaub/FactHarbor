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
| `orchestrated` | `orchestrated.prompt.md` | Orchestrated pipeline — all phases (40+ sections) |
| `monolithic-dynamic` | `monolithic-dynamic.prompt.md` | Monolithic Dynamic pipeline — plan, analysis, structured output (7 sections) |
| `source-reliability` | `source-reliability.prompt.md` | Source reliability evaluation |
| `text-analysis-*` | `text-analysis/*.prompt.md` | LLM text analysis (4 prompts) |

## Orchestrated Pipeline Sections

The `orchestrated.prompt.md` file contains 40+ named sections loaded via `loadAndRenderSection()`. Key section groups:

| Group | Sections | Phase |
|-------|----------|-------|
| Understand | `UNDERSTAND`, `UNDERSTAND_USER`, `UNDERSTAND_JSON_FALLBACK_SYSTEM`, `UNDERSTAND_STRUCTURED_RETRY_SYSTEM` | Step 1 |
| Supplemental | `SUPPLEMENTAL_CLAIMS`, `SUPPLEMENTAL_CONTEXTS`, `OUTCOME_CLAIMS`, `OUTCOME_ENRICH_*` | Step 1 |
| Context Refinement | `CONTEXT_REFINEMENT`, `CONTEXT_REFINEMENT_CANDIDATES_BLOCK`, `CONTEXT_REFINEMENT_USER` | Post-Research |
| Evidence Extraction | `EXTRACT_EVIDENCE`, `EXTRACT_EVIDENCE_USER`, `EXTRACT_EVIDENCE_HIGH_IMPACT_FILTER_USER` | Step 2 |
| Search Relevance | `SEARCH_RELEVANCE_MODE_STRICT/MODERATE/RELAXED`, `SEARCH_RELEVANCE_BATCH_SYSTEM`, `SEARCH_RELEVANCE_BATCH_USER` | Step 2 |
| Grounding | `GROUNDED_SEARCH_REQUEST`, `GROUNDING_KEY_TERMS_BATCH_USER`, `GROUNDING_ADJUDICATION_BATCH_USER` | Step 2-3 |
| Verdict | `VERDICT`, `VERDICT_USER`, `VERDICT_BREVITY_RULES`, `VERDICT_DIRECTION_VALIDATION_BATCH_USER` | Step 3 |
| Claim Verdicts | `CLAIM_VERDICTS`, `CLAIM_VERDICTS_USER`, `CLAIM_VERDICTS_KEY_FACTORS_APPEND` | Step 3 |
| Knowledge Config | `KNOWLEDGE_RECENCY_GUIDANCE`, `KNOWLEDGE_INSTRUCTION_ALLOW_MODEL`, `KNOWLEDGE_INSTRUCTION_EVIDENCE_ONLY` | Cross-cutting |
| Provider Hints | `PROVIDER_HINT_OPENAI/ANTHROPIC/GOOGLE/MISTRAL` | Cross-cutting |

## Monolithic Dynamic Pipeline Sections

The `monolithic-dynamic.prompt.md` file contains 7 sections:

| Section | Purpose | Variables |
|---------|---------|-----------|
| `DYNAMIC_PLAN` | System prompt for planning/research phase | `${currentDate}` |
| `DYNAMIC_ANALYSIS` | System prompt for analysis/verdict phase | `${currentDate}` |
| `DYNAMIC_ANALYSIS_USER` | User message with input + sources | `${TEXT_TO_ANALYZE}`, `${SOURCE_SUMMARY}` |
| `STRUCTURED_OUTPUT_ANTHROPIC` | JSON output guidance for Claude | — |
| `STRUCTURED_OUTPUT_OPENAI` | JSON output guidance for GPT | — |
| `STRUCTURED_OUTPUT_GOOGLE` | JSON output guidance for Gemini | — |
| `STRUCTURED_OUTPUT_MISTRAL` | JSON output guidance for Mistral | — |

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
