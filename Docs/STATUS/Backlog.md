# FactHarbor Backlog

**Purpose**: Single canonical task list for FactHarbor. Keep this list current; keep `Docs/STATUS/Current_Status.md` high-level and link here.

**Last Updated**: February 8, 2026

**Ordering**: Sorted by **Urgency** (high → med → low), then **Importance** (high → med → low).

**Phase note**: FactHarbor is transitioning from POC to Alpha. During POC/Alpha, **security/cost-control items are tracked as low urgency** (but often **high importance**). Reclassify to **high urgency** before any production/public exposure.

**See Also**: `Docs/STATUS/Improvement_Recommendations.md` for detailed analysis and implementation guidance.

---

## Recently Completed (February 2, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **UCM Phase 1: Analyzer Integration**: Analyzer now loads pipeline/search/calc from UCM (hot-reloadable). Env-based analysis settings removed. `LLM_PROVIDER` deprecated. | Architecture / Config | 2026-02-02 | [UCM Implementation Review](../ARCHIVE/REVIEWS/Unified_Configuration_Management_Implementation_Review.md) |
| ✅ **UCM Phase 2: Save-to-File Functionality**: Bidirectional sync allows saving DB configs back to default JSON files (dev mode only). Atomic writes with backup. | Architecture / Config | 2026-02-02 | [UCM User Guide](../xwiki-pages/FactHarbor/Product%20Development/DevOps/Subsystems%20and%20Components/Unified%20Config%20Management/WebHome.xwiki) |
| ✅ **UCM Phase 2: Job Config Snapshots**: `job_config_snapshots` capture pipeline/search + SR summary per job for auditability. | Architecture / Config | 2026-02-02 | [UCM Implementation Review](../ARCHIVE/REVIEWS/Unified_Configuration_Management_Implementation_Review.md) |
| ✅ **UCM Phase 3: SR Modularity Interface**: SR config is separate UCM domain; SR service config wired and isolated from pipeline config. | Architecture / Config | 2026-02-02 | [UCM Implementation Review](../ARCHIVE/REVIEWS/Unified_Configuration_Management_Implementation_Review.md) |
| ✅ **UCM Phase 4: Admin UI Polish**: Split routes to `/admin/quality/*` (FactHarbor) and `/admin/sr/*` (SR standalone). Added validation warnings for dangerous config combos and snapshot viewer. | Web UI / Config | 2026-02-02 | [UCM Implementation Review](../ARCHIVE/REVIEWS/Unified_Configuration_Management_Implementation_Review.md) |
| ✅ **Drift Detection & Health Validation**: New endpoint `GET /api/admin/config/:type/drift`. Health check includes config validation. | Architecture / Config | 2026-02-02 | [UCM User Guide](../xwiki-pages/FactHarbor/Product%20Development/DevOps/Subsystems%20and%20Components/Unified%20Config%20Management/WebHome.xwiki) |
| ✅ **Terminology cleanup**: Context vs EvidenceScope naming cleanup in admin UI + schema (legacy keys supported). | Analyzer / Docs | 2026-02-02 | [Terminology Migration Summary](../ARCHIVE/REVIEWS/Terminology_Migration_SUMMARY.md) |
| ✅ **UCM Pre-Validation Sprint (v2.10.0)**: Toast notifications, Export All Configs, Active Config Dashboard, Config Diff View, Default Value Indicators, Config Search by Hash. | Web UI / Config | 2026-01-31 | [CHANGELOG](../CHANGELOG.md) |
| ✅ **Unified Configuration Management Foundation (v2.9.0)**: Extended config system to all core types (prompt, search, calculation, pipeline, sr) plus lexicons. Added prompt import/export/reseed APIs. 158 unit tests. Admin UI complete. | Architecture / Testing | 2026-01-30 | [Implementation Review](../ARCHIVE/REVIEWS/Unified_Configuration_Management_Implementation_Review.md) |
| ✅ **LLM Text Analysis Pipeline**: Implemented 4 analysis points with hybrid LLM/heuristic architecture. Bug fix in v2.8.1 removed counter-claim detection from verdict prompt. | Analyzer / LLM | 2026-01-30 | [Deep Analysis](../ARCHIVE/REVIEWS/LLM_Text_Analysis_Pipeline_Deep_Analysis.md) |
| ✅ **Promptfoo Test Coverage for Text Analysis**: Created 26 test cases covering all 4 text-analysis prompts (input classification, evidence quality, context similarity, verdict validation). Total promptfoo coverage now 38 test cases across 6 prompts. | Testing / LLM | 2026-01-30 | [Promptfoo Testing Guide](../xwiki-pages/FactHarbor/Product%20Development/DevOps/Tooling/Promptfoo%20Testing/WebHome.xwiki) |

---

## Core Functionality & Quality

| Description | Domain | Urgency | Importance | Reference |
|---|---|---|---|---|
| **LLM Text Analysis A/B Testing**: Run promptfoo text-analysis tests and compare heuristic vs LLM modes to validate quality improvements. Test infrastructure ready (26 cases). | Analyzer / Testing | med | high | [Promptfoo Testing](../xwiki-pages/FactHarbor/Product%20Development/DevOps/Tooling/Promptfoo%20Testing/WebHome.xwiki) |
| **Edge case test coverage**: 15+ tests for ambiguous harm, circular contestation, opinion vs evidence, mixed quality, missing fields. Create `llm-classification-edge-cases.test.ts`. ~4-6h. | Analyzer / Testing | med | high | [Robustness Proposals](../ARCHIVE/Post-Migration_Robustness_Proposals.md) #2 |
| Inverse-input symmetry hardening: keep `scripts/inverse-scope-regression.ps1` green; add 2–3 more inverse pairs; define "strict context symmetry" vs "best-effort" per test. | Analyzer | med | high | Existing |
| Evidence-driven context refinement guardrails: add lightweight instrumentation (how often refine is applied/rejected + reason) to prevent over-splitting into non-context "dimensions". | Analyzer | med | high | Existing |
| Central-claim evidence coverage pass: bounded "missing-evidence" retrieval pass for central claims with zero supporting/counter facts (best-effort; no loops; respect search budgets). | Analyzer / Search | med | high | Existing |
| **Parallel verdict generation**: Process claim verdicts in parallel (with concurrency limit) instead of sequentially. 50-80% speed improvement for multi-claim analyses. | Analyzer / Performance | med | high | Improvements #5 |
| **Tiered LLM model routing**: Use cheaper models (Haiku) for extraction tasks, premium models (Sonnet) for reasoning. 50-70% cost savings on LLM calls. ✅ **Enabled** (v2.9.0: Haiku 3.5 for extract/understand, Sonnet 4 for verdict/context refinement). | Analyzer / Cost | ~~med~~ done | high | Improvements #3 |
| **Claim-level caching**: Cache normalized claim verdicts to reuse across analyses. 30-50% cost savings on repeat claims. Requires normalized DB schema. | Analyzer / Cost | med | high | Improvements #4 |
| **Quality Gate UI display**: Show Gate 1 and Gate 4 statistics and per-item failure reasons in the results UI. Core transparency requirement. | Web UI | med | high | Improvements #6 |
| Context guidelines note: short dev note defining what qualifies as a distinct "Context" vs a dimension; keep aligned with `AGENTS.md`. | Analyzer / Docs | med | med | Existing |
| **Classification confidence scoring**: Add `factualBasisConfidence`, `harmPotentialConfidence`, `classificationConfidence` (0-100) to types. Reduce weights for low-confidence; flag high-harm + low-confidence for review. ~3-4h. | Analyzer / Quality | low | med | [Robustness Proposals](../ARCHIVE/Post-Migration_Robustness_Proposals.md) #4 |
| **Anti-hallucination strategy review**: Evaluate external anti-hallucination strategies for FactHarbor applicability — particularly multi-model cross-verification (run verdict through 2 models, flag discrepancies), structured "I don't know" prompting, and negative prompting techniques. Assess ROI vs. cost/latency impact. | Analyzer / Quality | low | med | [Anti-Hallucination Strategies](../WIP/Anti_Hallucination_Strategies.md) |
| **Doc Audit Phase 2: `opposingEvidenceIds` + `biasIndicator`**: Add `opposingEvidenceIds` to ClaimVerdict (split from misleading `supportingEvidenceIds`). Surface `biasIndicator` from SR cache to FetchedSource + report UI. Update Core Data Model ERD after code changes. | Analyzer / Types | med | med | [Implementation Plan](../WIP/Documentation_Diagram_Audit_Implementation_Plan.md) Phase 2 |
| **Doc Audit Phase 3: Target data model alignment**: Replace "Scenario" with AnalysisContext, replace `likelihood_range` with 7-point scale, update source scoring architecture to match LLM+Cache (docs only, no code). | Docs | low | low | [Implementation Plan](../WIP/Documentation_Diagram_Audit_Implementation_Plan.md) Phase 3 |

---

## Security & Cost Control
*(All items LOW urgency during POC/Alpha phase; HIGH urgency before production)*

| Description | Domain | Urgency | Importance | Reference |
|---|---|---|---|---|
| **SSRF protections for URL fetching**: Block private IP ranges, cap redirects, cap response size, enforce timeouts. *(POC: low urgency)* | Security | low | high | Improvements #1 |
| **Secure admin endpoints**: Protect `/admin/test-config` and any endpoints that can trigger paid API calls with FH_ADMIN_KEY authentication. *(POC: low urgency)* | Security / Cost-Control | low | high | Improvements #1 |
| **Rate limiting / quotas**: Per-IP and/or per-key throttling; protect search + LLM calls. Prevent runaway costs. *(POC: low urgency)* | Security / Cost-Control | low | high | Improvements #2 |
| **Cost quotas and estimates**: Track per-job and per-day LLM/search quotas. Reject jobs exceeding limits. Show cost estimates before running. *(POC: low urgency)* | Cost-Control | low | high | Improvements #2 |

---

## User Experience Enhancements

| Description | Domain | Urgency | Importance | Reference |
|---|---|---|---|---|
| **Config admin: auto-save drafts to localStorage**: Protect against accidental page refresh. Recover unsaved drafts on reload. *(Skipped: medium risk of stale draft confusion)* | Web UI / UX | low | low | UCM UX Review |
| **Analysis templates/presets**: Domain-specific templates (health, legal, political) with curated search whitelists and KeyFactor hints. | Web UI / UX | low | med | Improvements #8 |
| **Interactive analysis refinement**: Allow users to add sources, challenge claims, refine searches, or add contexts as child jobs extending existing analysis. | Web UI / UX | low | med | Improvements #7 |
| **Comparative analysis mode**: Side-by-side comparison of two articles/claims. Show shared claims, unique claims, contradictions, consensus areas. | Analyzer / UX | low | med | Improvements #9 |
| **Real-time source quality feedback**: Extend current LLM+Cache source reliability with additional signals (MBFC, NewsGuard, Wikipedia citations, HTTPS, domain age). | Analyzer / Quality | low | med | Improvements #10 |
| **PDF report export**: Generate professional PDF reports with charts, graphs, confidence bars, optional branding. | Reporting | low | low | Improvements #12 |
| **Browser extension**: Right-click extension for "Analyze with FactHarbor", floating button on news sites. | Web UI / UX | low | low | Improvements #13 |
| **Multi-language support**: Support ES, DE, FR, PT with language-specific search and extraction. | Analyzer / i18n | low | med | Improvements #11 |

---

## Monitoring & Operations

| Description | Domain | Urgency | Importance | Reference |
|---|---|---|---|---|
| **Classification monitoring**: Track fallback rates/distributions per field (harmPotential, factualBasis, etc.). Admin endpoint `GET /api/admin/classification-metrics`. Alert on fallback rate >5%. ~3-4h. | Observability / Analyzer | med | med | [Classification Monitoring Spec](../ARCHIVE/P2_Classification_Monitoring_Backlog.md) |
| **Observability dashboard**: Real-time metrics dashboard showing performance (p50/p95/p99), costs (LLM/search), quality (gate pass rates), usage (success rate), and errors. | Observability | low | high | Improvements #17 |
| **Error pattern detection & auto-recovery**: Automatically categorize errors, suggest fixes, apply recovery actions (retry with shorter prompt, skip source, fallback model). | Observability / Reliability | low | med | Improvements #18 |
| Persist metrics and cost estimates: tokens/search calls/cost estimation stored per job; basic admin view. | Observability | low | med | Existing |
| Error pattern tracking: persist structured error categories and frequency to inform prompt/code fixes. | Observability | low | med | Existing |

---

## Technical Debt & Architecture

| Description | Domain | Urgency | Importance | Reference |
|---|---|---|---|---|
| **Config storage seeding race condition**: `saveConfigBlob()` uses check-then-insert without transaction. Use `INSERT OR IGNORE` for multi-instance safety. *(POC: low urgency; HIGH before multi-worker deployment)* | Architecture / Reliability | low | high | UCM Review |
| **Cross-profile content hash policy**: Document or change behavior where identical content cannot exist across different profiles (may block copy/paste workflows). | Architecture / UX | low | med | UCM Review |
| **Remove dead API prompt tracking columns**: `PromptContentHash` and `PromptLoadedUtc` in `Jobs` table are never populated (web uses `config_usage` instead). Remove columns and migration 002, or decide to populate them. | Architecture / Cleanup | low | low | UCM Review |
| **Normalized database schema**: Create proper tables for Claims, Verdicts, Sources, Facts, ClaimFactSupport. Enables cross-analysis queries, trend analysis, citation networks. | Architecture / Data | low | med | Improvements #15 |
| **Comprehensive testing**: Unit tests (80% coverage), integration tests, E2E tests (Playwright), API tests (xUnit). | Testing / Quality | low | high | Improvements #16 |
| Analyzer modularization plan: `apps/web/src/lib/analyzer.ts` is monolithic (8234 lines); do incremental extraction only with safety rails. Split into understanding, research, verdict-generation, aggregation, report-generation modules. | Architecture | low | low | Improvements #14 |
| **LLM classification system docs**: Update Analyzer_Pipeline.md (remove pattern-based refs), create LLM_Classification_System.md, update Testing_Guide.md with edge case test examples. ~2-3h. | Docs / Architecture | low | low | [Robustness Proposals](../ARCHIVE/Post-Migration_Robustness_Proposals.md) #5 |

---

## Future Research

| Description | Domain | Status | Reference |
|---|---|---|---|
| **Shadow Mode: Self-learning prompt optimization**: Observe LLM behavior across thousands of cases, detect inconsistencies, propose prompt improvements, A/B test variations. Requires 3+ months production data. | Analyzer / LLM | Design complete | [Shadow Mode Architecture](../WIP/Shadow_Mode_Architecture.md) |
| **Vector database integration**: Optional embeddings store for similarity detection and clustering beyond text-hash matches. Deferred pending evidence of need. | Architecture / Data | Assessment complete | [Vector DB Assessment](../WIP/Vector_DB_Assessment.md) |

---

## Notes

- **Quick wins** (combined):
  1. Parallel verdict generation → 50-80% faster
  2. Quality Gate UI display → transparency
  3. Cost quotas → financial safety *(low urgency for POC)*
  4. Admin authentication → security *(low urgency for POC)*

- **Cost optimization** (combined 70-85% reduction):
  - Tiered LLM routing: 50-70% savings
  - Claim caching: 30-50% savings on repeat claims
  - Parallel processing: Time savings = cost savings

- **Security items**: All marked LOW urgency while local POC, but HIGH importance. Must be HIGH urgency before any public deployment.

---

## References

- **Detailed Analysis**: `Docs/STATUS/Improvement_Recommendations.md`
- **Current Status**: `Docs/STATUS/Current_Status.md`
- **Architecture**: `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/System%20Design/WebHome.xwiki`
- **Coding Guidelines**: `Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Guidelines/Coding Guidelines/WebHome.xwiki`
