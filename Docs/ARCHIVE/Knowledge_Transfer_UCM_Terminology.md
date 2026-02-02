# Knowledge Transfer - UCM + Terminology Cleanup (Last ~4 Days)

Date: 2026-02-02
Repo: FactHarbor
Author: Codex (handoff)

## Purpose
This doc captures implementation changes and context from the last ~4 days of work related to Unified Config Management (UCM) and the terminology cleanup (Context vs EvidenceScope). It also summarizes what was done in this chat and earlier related work, so a new agent can continue without re-tracing history.

---

## High-Level Goals (as implemented)
- Move analysis-impacting configuration out of hardcoded or env-based settings and into UCM.
- Keep Source Reliability (SR) config as a separate UCM domain from main pipeline/search/calc.
- Fix terminology confusion: AnalysisContext is "Context"; EvidenceScope is "evidenceScope".
- Ensure defaults are seeded into UCM and remain consistent with the pre-UCM hardcoded behavior.
- Update admin UI and docs to reflect UCM as the source of truth.

---

## What Was Implemented (Core Code)

### 1) Pipeline LLM provider moved into UCM
- New `pipeline.llmProvider` field added to `pipeline.v1` schema.
- Provider selection now comes from pipeline config (UCM), not `LLM_PROVIDER` env.
- Affects:
  - LLM routing (`apps/web/src/lib/analyzer/llm.ts`)
  - Orchestrated + monolithic analyzers (model selection and provider capabilities)
  - Health/test-config endpoints and admin UI messaging
  - Grounded search availability uses provider param (google/gemini)

### 2) SR evaluation settings moved to SR UCM config
- SR config remains separate domain (`sr.v1`).
- Added SR evaluation search fields:
  - `evalUseSearch`, `evalSearchMaxResultsPerQuery`, `evalMaxEvidenceItems`, `evalSearchDateRestrict`
- `/api/internal/evaluate-source` uses SR config for evaluation search behavior.

### 3) PDF parse timeout moved into pipeline UCM
- `pipeline.pdfParseTimeoutMs` added (default 60000).
- Retrieval uses pipeline config rather than hardcoded value.

### 4) Context terminology cleanup
- UI and schema descriptions updated to use "Context" for AnalysisContext, not "Scope".
- Deprecated legacy keys are preserved for backward compatibility:
  - `llmScopeSimilarity` -> `llmContextSimilarity`
  - `scopeDedupThreshold` -> `contextDedupThreshold`
  - `scopeDetection*` -> `contextDetection*`
  - `maxIterationsPerScope` -> `maxIterationsPerContext`
- Runtime migration logic in schema translates legacy keys and logs warnings.

### 5) UCM default seeding and refresh
- Default configs seeded on DB init if missing.
- If active config is a system default and defaults have changed, system refreshes the default entry.
- Prompts are seeded from files only if prompt config is missing.

### 6) SR config modularity preserved
- SR config is loaded via `getConfig("sr")` and set via `setSourceReliabilityConfig`.
- Job config snapshots include SR summary only (enabled/defaultScore/confidenceThreshold) to preserve modularity.

---

## Key Files Updated (Code)
- UCM schema + defaults:
  - `apps/web/src/lib/config-schemas.ts`
- Analyzer LLM routing and provider selection:
  - `apps/web/src/lib/analyzer/llm.ts`
  - `apps/web/src/lib/analyzer/orchestrated.ts`
  - `apps/web/src/lib/analyzer/monolithic-canonical.ts`
  - `apps/web/src/lib/analyzer/monolithic-dynamic.ts`
- Text analysis service wiring:
  - `apps/web/src/lib/analyzer/text-analysis-llm.ts`
  - `apps/web/src/lib/analyzer/text-analysis-service.ts`
- Retrieval + grounded search:
  - `apps/web/src/lib/retrieval.ts`
  - `apps/web/src/lib/search-gemini-grounded.ts`
- Admin UI and API
  - `apps/web/src/app/admin/config/page.tsx`
  - `apps/web/src/app/admin/test-config/page.tsx`
  - `apps/web/src/app/api/admin/test-config/route.ts`
  - `apps/web/src/app/api/health/route.ts`
  - `apps/web/src/app/api/version/route.ts`
- SR evaluation endpoint
  - `apps/web/src/app/api/internal/evaluate-source/route.ts`
- Config validation tooling
  - `scripts/validate-config.ps1`

---

## Docs Updated
- UCM and LLM configuration guides
- SR architecture doc (now references UCM fields, not env)
- Admin interface guide
- Coding guidelines and status docs
- AGENTS.md environment variable section

Docs (examples):
- `Docs/USER_GUIDES/Unified_Config_Management.md`
- `Docs/USER_GUIDES/LLM_Configuration.md`
- `Docs/ARCHITECTURE/Source_Reliability.md`
- `Docs/ARCHITECTURE/Overview.md`
- `Docs/ARCHITECTURE/Calculations.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/DEVELOPMENT/Coding_Guidelines.md`
- `AGENTS.md`

---

## Tests Updated
- LLM routing tests now build `PipelineConfig` instead of env usage:
  - `apps/web/test/unit/lib/analyzer/llm-routing.test.ts`
- LLM integration test now uses temporary config DB + pipeline llmProvider for each provider:
  - `apps/web/test/unit/lib/llm-integration.test.ts`

---

## Terminology Rules (Current State)
- AnalysisContext is always "Context" in UI and variable naming.
- EvidenceScope is always "evidenceScope" (source metadata) and must not be called "context".
- Legacy "scope" keys are only for backward compatibility; new UI and schema uses Context naming.

---

## Current Behavior Checklist (Post-Changes)
- Pipeline LLM provider is determined by UCM `pipeline.llmProvider`.
- SR evaluation search behavior is controlled by SR config, not env.
- `apps/web/.env.example` no longer includes LLM_PROVIDER; only API keys remain.
- Health endpoint reports provider from UCM, not env.
- UCM defaults exist for pipeline, search, calc, SR, and lexicons.

---

## Known Constraints / Notes
- Source Reliability config is separate from the main UCM domain by design.
- Some older docs in `Docs/ARCHIVE` (including `Docs/ARCHIVE/REVIEWS`) may mention deprecated env vars; these are archival and not updated.
- If you switch between Codex versions, ensure the repo has no pending uncommitted changes.

---

## Commits in This Chat
- ucm: wire pipeline and SR configs into analysis
  - Moves LLM provider selection and SR eval search into UCM
  - Updates analyzer, admin endpoints, health/test-config, retrieval
  - Updates tests and config validation script
- docs: align UCM and SR guidance
  - Updates UCM/LLM/SR docs for new behavior
  - Fixes terminology and env references

---

## Recommended Next Steps (for new agent)
1) Run `npm -w apps/web run build` to confirm Next.js build passes.
2) Run targeted tests:
   - `npm -w apps/web test -- test/unit/lib/analyzer/llm-routing.test.ts`
   - `npm -w apps/web test -- test/unit/lib/llm-integration.test.ts`
3) Verify config defaults in DB if running locally.
4) Spot-check admin UI (Config page) for Context naming and SR config separation.

---

## Contact / Ownership Notes
- SR config is owned by SR service; do not merge SR fields into pipeline config.
- Pipeline/search/calc configs are main analysis domain.
- Keep prompt files as backup only; DB is the active source.

---

End of transfer.
