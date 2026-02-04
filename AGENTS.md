# AGENTS.md

## Purpose

This file defines how AI coding agents should operate in the FactHarbor repository.

## Scope

- Applies to all paths under this repo unless a closer AGENTS.md overrides it.

---

## Fundamental Rules

### Generic by Design
- **No domain-specific hardcoding**: Code, prompts, and logic must work for ANY topic
- **No hardcoded keywords**: Avoid lists like `['bolsonaro', 'trump', 'vaccine']`
- **Parameterize, don't specialize**: Use configuration over conditionals
- **No test-case terms in prompts**: LLM prompt examples must NOT contain terms, phrases, or patterns from known test cases or verification inputs. Examples must be abstract/generic (e.g., "Entity A did X" not "Country built industry"). This prevents "teaching to the test" and ensures genuine generalization.

### Do not optimize prompts just for some test-case(s)
- **Do not enforce** to find Contexts (AnalysisContext) or Scope (EvidenceScope) by using non generic terms in prompts.
- **Do not enforce** to find different AnlysisContexts by date-periods or regions, such AnlysisContexts must be found naturally by LLM (Such boundaries could be found in evidence documentation).

### Context vs Scope - NEVER CONFUSE
- **AnalysisContext** = Top-level analytical frame requiring separate analysis
- **EvidenceScope** = Per-evidence source metadata (methodology, temporal bounds, boundaries of evidence)
- **NEVER** use "scope" when referring to AnalysisContext - always say "context"
- **NEVER** use "context" when referring to source metadata - always say "evidenceScope"
- Variables: Use `context`/`analysisContext` for top-level frames, `evidenceScope` for evidence metadata
- UI: Display "Context" cards, never "Scope" cards (unless specifically about evidence scope)

### EvidenceItem (formerly ExtractedFact)
- **EvidenceItem** = Extracted evidence from a source (NOT a verified fact)
- **Legacy name**: `ExtractedFact` - removed in v3.1 breaking change
- **Key fields**:
  - `statement` (legacy: `fact`) - the extracted statement text
  - `category` - type of evidence (direct_evidence, statistic, expert_quote, etc.)
  - `claimDirection` - whether evidence supports/contradicts/neutral to thesis
  - `evidenceScope` - source methodology metadata
  - `probativeValue` - quality assessment (high/medium/low)
  - `sourceType` - classification of source (peer_reviewed_study, news_primary, etc.)
- **NEVER** call these "facts" in new code - always "evidence" or "evidence items"

### probativeValue Field
- **probativeValue** = Quality assessment of evidence item (high/medium/low)
- Assigned during extraction by LLM based on:
  - Statement specificity
  - Source attribution quality
  - Verifiability
- Used for verdict weighting - high probative evidence has more influence
- **Layer 2 filter**: evidence-filter.ts removes items that fail deterministic checks

### SourceType Enum
- **SourceType** = Classification of evidence source
- Values: peer_reviewed_study, fact_check_report, government_report, legal_document,
  news_primary, news_secondary, expert_statement, organization_report, other
- Used in EvidenceScope for source reliability calibration
- Different types may receive different weight adjustments in aggregation

### Input Neutrality
- **Question ≈ Statement**: "Was X fair?" must yield same analysis as "X was fair"
- **Format independence**: Input phrasing must NOT affect analysis depth or structure
- **Tolerance**: Verdict difference between formats should be ≤4%

### Pipeline Integrity
- **No stage skipping**: Understand → Research → Verdict (all required)
- **Evidence transparency**: Every verdict must cite supporting or opposing evidence items
- **Quality gates**: Gate 1 (claim validation) and Gate 4 (confidence) are mandatory

---

## Architecture Quick Reference

```
┌─────────────────────────────────────────────────────────────┐
│                        USER INPUT                           │
│              (question / statement / URL)                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  apps/web (Next.js)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  src/lib/analyzer.ts - Main analysis engine         │   │
│  │  - understandClaim() → Research → generateVerdicts()│   │
│  │  - Multi-scope detection & canonicalization         │   │
│  │  - LLM calls via AI SDK (OpenAI/Anthropic/etc)      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  src/app/api/fh/* - API routes                      │   │
│  │  src/app/jobs/[id]/page.tsx - Results display       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  apps/api (ASP.NET Core)                    │
│  - Job persistence (SQLite: factharbor.db)                  │
│  - Controllers: Jobs, Analyze, Health, Version              │
│  - Swagger: http://localhost:5000/swagger                   │
└─────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/analyzer/orchestrated.ts` | Main orchestrated pipeline (~9000 lines) |
| `apps/web/src/lib/analyzer/monolithic-canonical.ts` | Monolithic canonical pipeline |
| `apps/web/src/lib/analyzer/types.ts` | TypeScript types and interfaces |
| `apps/web/src/lib/analyzer/aggregation.ts` | Verdict aggregation logic |
| `apps/web/src/lib/analyzer/scopes.ts` | Scope detection and handling |
| `apps/web/src/lib/analyzer/source-reliability.ts` | Source reliability: prefetch, lookup, weighting |
| `apps/web/src/lib/source-reliability-cache.ts` | SQLite cache for source scores |
| `apps/web/src/lib/config-storage.ts` | Unified Config Management: SQLite storage layer |
| `apps/web/src/lib/config-loader.ts` | Config caching and effective config resolution |
| `apps/web/src/app/jobs/[id]/page.tsx` | Job results UI |
| `apps/api/Controllers/JobsController.cs` | Job CRUD API |
| `Docs/ARCHITECTURE/Calculations.md` | Verdict calculation documentation |
| `Docs/ARCHITECTURE/Source_Reliability.md` | Source reliability documentation |

---

## Workflow

1. Read relevant files before editing
2. Use existing scripts and tooling; avoid inventing new workflows
3. If a required command is unknown, ask or leave a TODO note
4. Prefer small, focused changes that are easy to review
5. Preserve existing style and conventions
6. Avoid refactors unless explicitly requested

---

## Commands

| Action | Command |
|--------|---------|
| Quick start | `powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1` |
| Restart services | `.\scripts\restart-clean.ps1` |
| Stop services | `.\scripts\stop-services.ps1` |
| Web dev server | `cd apps/web; npm run dev` |
| API dev server | `cd apps/api; dotnet watch run` |
| Build web | `cd apps/web; npm run build` |
| Tests | `npm test` (placeholder) |
| Lint | `npm run lint` (placeholder) |

---

## Safety

- Do not access production systems or real customer data
- Do not change secrets/credentials or commit them
- Do not modify generated files or dependencies (e.g., `node_modules`) unless requested
- Avoid destructive git commands unless explicitly asked
- Do not overwrite `apps/api/factharbor.db` unless asked

---

## Authentication

| Key | Environment Variable | Purpose |
|-----|---------------------|---------|
| Admin Key | `FH_ADMIN_KEY` | Admin endpoints |
| Runner Key | `FH_INTERNAL_RUNNER_KEY` | Internal job execution |

Default placeholders in `appsettings.Development.json` - replace for security.

---

## Current State (v2.6.41)

### Working Features
- ✅ Multi-scope detection and display
- ✅ Input neutrality (question ≈ statement within ±5%)
- ✅ Scope/context extraction from sources
- ✅ Temporal reasoning (current date awareness)
- ✅ Claim deduplication for fair aggregation
- ✅ KeyFactors aggregation
- ✅ Triple-path pipeline (Orchestrated, Monolithic Canonical, Monolithic Dynamic)
- ✅ Source Reliability (LLM evaluation with multi-model consensus, caching, evidence weighting, entity-level evaluation)
- ✅ Source Reliability Hardening (SOURCE TYPE CAPS, asymmetric confidence gating, brand variant matching)
- ✅ Unified Configuration Management (database-backed version control for search, calculation, and prompt configs)

### Key Environment Variables

Analysis configuration (pipeline/search/calculation/SR) is managed in UCM (Admin → Config). Env vars are reserved for infra/runtime concerns.

| Variable | Default | Purpose |
|----------|---------|---------|
| `FH_RUNNER_MAX_CONCURRENCY` | `3` | Max parallel analysis jobs |
| `FH_CONFIG_DB_PATH` | `./config.db` | UCM SQLite location (optional) |
| `FH_SR_CACHE_PATH` | `./source-reliability.db` | SR cache database path |

---

## Output

- Summarize changes and list files touched
- Note any assumptions or follow-up steps
- If tests were not run, say why
