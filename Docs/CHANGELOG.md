# FactHarbor Changelog

## 2026-02-04 - Prompt Optimization v2.8.0-2.8.1 Complete

### Changed
- Anthropic provider variant slimmed to format-only (~84 lines, 52% reduction)
- All prompt examples genericized (replaced domain-specific terms with placeholders)
- AnalysisContext vs EvidenceScope terminology clarified in all base prompts
- Provider variants now contain only formatting guidance (Phase 3 format-only principle)

### Added
- Terminology cleanup documentation (`analysisContexts`, `evidenceItems`, `supportingEvidenceIds`)
- Lead Developer verification for all prompt changes

### Documentation
- Created consolidated [Prompt Optimization Summary](WIP/Prompt_Optimization_Investigation.md)
- Archived detailed reviews to [ARCHIVE/REVIEWS/](ARCHIVE/REVIEWS/)
  - Prompt_Optimization_Code_Review.md
  - Prompt_Optimization_Architecture_Review.md

---

## 2026-02-02 - UCM Terminology Cleanup + Phase 2

### Added
- Unified Config Management (UCM) with file-backed defaults
- Schema versioning for all config types
- Save-to-file functionality (development mode)
- Drift detection endpoint (GET /api/admin/config/:type/drift)
- Health check config validation (GET /api/health includes configValidation)
- Concurrency warnings with updatedBy tracking
- Monolithic pipeline timeouts now configurable via UCM

### Changed
- LLM provider selection moved from env to UCM pipeline config
- SR evaluation search settings moved to SR UCM config
- PDF parse timeout moved to pipeline UCM config
- Terminology: AnalysisContext is "Context" (not "Scope") throughout

### Deprecated
- `LLM_PROVIDER` environment variable (use UCM `pipeline.llmProvider`)

### Fixed
- Aggregation-lexicon keywords refined to prevent false evidence classification

### Removed
- Hardcoded config constants for pipeline/SR settings (migrated to UCM)
- `LLM_PROVIDER` from `.env.example`

---

## 2026-01-31 - UCM Pre-Validation Sprint

### Added
- Toast notifications replacing browser alerts (22 instances)
- Export All Configs functionality (timestamped backup)
- Active Config Dashboard (visual overview)
- Config Diff View (field-by-field comparison)
- Default Value Indicators (customization tracking)
- Config Search by Hash (debugging support)

### Changed
- Admin UI now uses `react-hot-toast` for all notifications
- Config management UX significantly improved

---

## 2026-01-30 - UCM Phase 1-4 Complete

### Added
- Pipeline and Source Reliability config types in UCM
- Prompt import/export/reseed APIs
- Job config snapshots (full resolved config per job)
- SR modularity interface (ISRService contract)
- Config validation warnings (7 pipeline + 5 search + 2 cross-config)
- Admin page reorganization (FactHarbor Quality vs SR sections)

### Changed
- 13 unique settings now hot-reloadable via UCM
- Model selection (`llmTiering`, `modelUnderstand`, `modelExtractEvidence`, `modelVerdict`)
- LLM flags (`llmInputClassification`, `llmEvidenceQuality`, etc.)
- Budget controls (`maxIterationsPerContext`, `maxTotalIterations`, etc.)
- Analysis settings (`analysisMode`, `deterministic`, `allowModelKnowledge`, etc.)

### Fixed
- `SOURCE_TYPE_EXPECTED_CAPS` constant naming
- `getBudgetConfig()` respects `DEFAULT_BUDGET.enforceHard`
- Budget test uses explicit values

---

## 2026-01-29 - LLM Text Analysis Pipeline

### Added
- LLM-only text analysis for 4 analysis points
- ITextAnalysisService interface with multiple implementations
- Per-analysis-point feature flags
- Multi-pipeline support (Orchestrated, Canonical, Dynamic)

### Changed
- Search provider documentation clarified (all pipelines require credentials)
- Pipeline architecture docs updated (Section 8)

---

## 2026-01-26 - Context Overlap Detection

### Added
- LLM-driven context merge heuristics
- Context count warnings (5+ threshold)
- Claim assignment validation
- UI reliability signals (`articleVerdictReliability`)

### Changed
- Temporal guidance clarification in prompts
- Overall average de-emphasized when reliability is low
- Individual context verdicts emphasized in UI

---

## 2026-01-24 - Source Reliability Hardening

### Added
- Entity-level source evaluation
- SOURCE TYPE SCORE CAPS (deterministic enforcement)
- Adaptive evidence queries (negative-signal detection)
- Brand variant matching
- Asymmetric confidence gating
- Unified SR configuration

### Changed
- SR prompt improvements (quantified thresholds, mechanistic confidence)
- Evidence quality hierarchy and recency weighting
- Organization type context handling

### Fixed
- 46+ new SR tests for scoring calibration

---

**Last Updated**: 2026-02-04
**Document Status**: Active changelog, updated with each significant release
