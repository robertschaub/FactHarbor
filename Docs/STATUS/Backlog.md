# FactHarbor Backlog

**Purpose**: Single canonical task list for FactHarbor. Keep this list current; keep `Docs/STATUS/Current_Status.md` high-level and link here.

**Last Updated**: January 30, 2026

**Ordering**: Sorted by **Urgency** (high → med → low), then **Importance** (high → med → low).

**POC note**: While FactHarbor is a local POC, **security/cost-control items are tracked as low urgency** (but often **high importance**). Reclassify to **high urgency** before any production/public exposure.

**See Also**: `Docs/STATUS/Improvement_Recommendations.md` for detailed analysis and implementation guidance.

---

## Recently Completed (January 30, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **Unified Configuration Management Foundation (v2.9.0)**: Extended config system to all 5 types (prompt, search, calculation, pipeline, sr). Added prompt import/export/reseed APIs. 158 unit tests. Admin UI complete. **Foundation only (~40%)** - analyzer integration and job snapshots pending. | Architecture / Testing | 2026-01-30 | [Implementation Review](../REVIEWS/Unified_Configuration_Management_Implementation_Review.md) |
| ✅ **LLM Text Analysis Pipeline**: Implemented 4 analysis points with hybrid LLM/heuristic architecture. Bug fix in v2.8.1 removed counter-claim detection from verdict prompt. | Analyzer / LLM | 2026-01-30 | [Deep Analysis](../REVIEWS/LLM_Text_Analysis_Pipeline_Deep_Analysis.md) |
| ✅ **Promptfoo Test Coverage for Text Analysis**: Created 26 test cases covering all 4 text-analysis prompts (input classification, evidence quality, scope similarity, verdict validation). Total promptfoo coverage now 38 test cases across 6 prompts. | Testing / LLM | 2026-01-30 | [Promptfoo Testing Guide](../USER_GUIDES/Promptfoo_Testing.md) |

---

## Core Functionality & Quality

| Description | Domain | Urgency | Importance | Effort | Reference |
|---|---|---|---|---|---|
| **🔴 UCM Phase 1: Analyzer Integration**: Create config-loader.ts abstraction to replace 87 `process.env.FH_*` reads in analyzer. Enable hot-reload of settings without restart. **CRITICAL for operational value**. | Architecture / Config | high | high | 2 weeks | [UCM Review §Phase 1](../REVIEWS/Unified_Configuration_Management_Implementation_Review.md) |
| **🟠 UCM Phase 2: Job Config Snapshots**: Implement `job_config_snapshots` table and async capture. Enable viewing complete config that produced any job. **Critical for auditability**. | Architecture / Config | high | high | 1 week | [UCM Review §Phase 2](../REVIEWS/Unified_Configuration_Management_Implementation_Review.md) |
| **🟡 UCM Phase 3: SR Modularity Interface**: Define SRServiceInterface contract and ensure analyzer uses interface (not direct SR config access). Enable future SR extraction. | Architecture / Config | med | med | 1 week | [UCM Review §Phase 3](../REVIEWS/Unified_Configuration_Management_Implementation_Review.md) |
| **LLM Text Analysis A/B Testing**: Run promptfoo text-analysis tests and compare heuristic vs LLM modes to validate quality improvements. Test infrastructure ready (26 cases). | Analyzer / Testing | med | high | 1-2 days + $20-50 API | [Promptfoo Testing](../USER_GUIDES/Promptfoo_Testing.md) |
| Inverse-input symmetry hardening: keep `scripts/inverse-scope-regression.ps1` green; add 2–3 more inverse pairs; define "strict symmetry" vs "best-effort" per test. | Analyzer | med | high | 3-4 days | Existing |
| Evidence-driven scope refinement guardrails: add lightweight instrumentation (how often refine is applied/rejected + reason) to prevent over-splitting into non-scope "dimensions". | Analyzer | med | high | 2-3 days | Existing |
| Central-claim evidence coverage pass: bounded "missing-evidence" retrieval pass for central claims with zero supporting/counter facts (best-effort; no loops; respect search budgets). | Analyzer / Search | med | high | 3-5 days | Existing |
| **Parallel verdict generation**: Process claim verdicts in parallel (with concurrency limit) instead of sequentially. 50-80% speed improvement for multi-claim analyses. | Analyzer / Performance | med | high | 1-2 days | Improvements #5 |
| **Tiered LLM model routing**: Use cheaper models (Haiku) for extraction tasks, premium models (Sonnet) for reasoning. 50-70% cost savings on LLM calls. | Analyzer / Cost | med | high | 3-4 days | Improvements #3 |
| **Claim-level caching**: Cache normalized claim verdicts to reuse across analyses. 30-50% cost savings on repeat claims. Requires normalized DB schema. | Analyzer / Cost | med | high | 5-7 days | Improvements #4 |
| **Quality Gate UI display**: Show Gate 1 and Gate 4 statistics and per-item failure reasons in the results UI. Core transparency requirement. | Web UI | med | high | 2-3 days | Improvements #6 |
| Scope guidelines note: short dev note defining what qualifies as a distinct "Scope" vs a dimension; keep aligned with `AGENTS.md`. | Analyzer / Docs | med | med | 1 day | Existing |

---

## Security & Cost Control
*(All items LOW urgency while POC/local only; HIGH urgency before production)*

| Description | Domain | Urgency | Importance | Effort | Reference |
|---|---|---|---|---|---|
| **SSRF protections for URL fetching**: Block private IP ranges, cap redirects, cap response size, enforce timeouts. *(POC: low urgency)* | Security | low | high | 2-3 days | Improvements #1 |
| **Secure admin endpoints**: Protect `/admin/test-config` and any endpoints that can trigger paid API calls with FH_ADMIN_KEY authentication. *(POC: low urgency)* | Security / Cost-Control | low | high | 1 day | Improvements #1 |
| **Rate limiting / quotas**: Per-IP and/or per-key throttling; protect search + LLM calls. Prevent runaway costs. *(POC: low urgency)* | Security / Cost-Control | low | high | 2-3 days | Improvements #2 |
| **Cost quotas and estimates**: Track per-job and per-day LLM/search quotas. Reject jobs exceeding limits. Show cost estimates before running. *(POC: low urgency)* | Cost-Control | low | high | 2-3 days | Improvements #2 |

---

## User Experience Enhancements

| Description | Domain | Urgency | Importance | Effort | Reference |
|---|---|---|---|---|---|
| **🟢 UCM Phase 4: Admin UI Polish**: Split routes to `/admin/quality/*` (FactHarbor) and `/admin/sr/*` (SR standalone). Add validation warnings for dangerous config combos. API route consistency. | Web UI / Config | low | low | 3 days | [UCM Review §Phase 4](../REVIEWS/Unified_Configuration_Management_Implementation_Review.md) |
| **Config admin: auto-save drafts to localStorage**: Protect against accidental page refresh. Recover unsaved drafts on reload. *(Skipped: medium risk of stale draft confusion)* | Web UI / UX | low | low | 0.5 day | UCM UX Review |
| **Config admin: diff view**: Side-by-side comparison of current edit vs active version before saving. | Web UI / UX | low | low | 2-3 days | UCM UX Review |
| **Analysis templates/presets**: Domain-specific templates (health, legal, political) with curated search whitelists and KeyFactor hints. | Web UI / UX | low | med | 3-4 days | Improvements #8 |
| **Interactive analysis refinement**: Allow users to add sources, challenge claims, refine searches, or add scopes as child jobs extending existing analysis. | Web UI / UX | low | med | 7-10 days | Improvements #7 |
| **Comparative analysis mode**: Side-by-side comparison of two articles/claims. Show shared claims, unique claims, contradictions, consensus areas. | Analyzer / UX | low | med | 10-14 days | Improvements #9 |
| **Real-time source quality feedback**: Aggregate multiple quality signals (MBFC, NewsGuard, Wikipedia citations, HTTPS, domain age) instead of single vendor. | Analyzer / Quality | low | med | 5-7 days | Improvements #10 |
| **PDF report export**: Generate professional PDF reports with charts, graphs, confidence bars, optional branding. | Reporting | low | low | 3-5 days | Improvements #12 |
| **Browser extension**: Right-click extension for "Analyze with FactHarbor", floating button on news sites. | Web UI / UX | low | low | 7-10 days | Improvements #13 |
| **Multi-language support**: Support ES, DE, FR, PT with language-specific search and extraction. | Analyzer / i18n | low | med | 14-21 days | Improvements #11 |

---

## Monitoring & Operations

| Description | Domain | Urgency | Importance | Effort | Reference |
|---|---|---|---|---|---|
| **Observability dashboard**: Real-time metrics dashboard showing performance (p50/p95/p99), costs (LLM/search), quality (gate pass rates), usage (success rate), and errors. | Observability | low | high | 5-7 days | Improvements #17 |
| **Error pattern detection & auto-recovery**: Automatically categorize errors, suggest fixes, apply recovery actions (retry with shorter prompt, skip source, fallback model). | Observability / Reliability | low | med | 3-5 days | Improvements #18 |
| Persist metrics and cost estimates: tokens/search calls/cost estimation stored per job; basic admin view. | Observability | low | med | 3-4 days | Existing |
| Error pattern tracking: persist structured error categories and frequency to inform prompt/code fixes. | Observability | low | med | 2-3 days | Existing |

---

## Technical Debt & Architecture

| Description | Domain | Urgency | Importance | Effort | Reference |
|---|---|---|---|---|---|
| **Config storage seeding race condition**: `saveConfigBlob()` uses check-then-insert without transaction. Use `INSERT OR IGNORE` for multi-instance safety. *(POC: low urgency; HIGH before multi-worker deployment)* | Architecture / Reliability | low | high | 0.5 day | UCM Review |
| **Cross-profile content hash policy**: Document or change behavior where identical content cannot exist across different profiles (may block copy/paste workflows). | Architecture / UX | low | med | 0.5 day | UCM Review |
| **Remove dead API prompt tracking columns**: `PromptContentHash` and `PromptLoadedUtc` in `Jobs` table are never populated (web uses `config_usage` instead). Remove columns and migration 002, or decide to populate them. | Architecture / Cleanup | low | low | 0.5 day | UCM Review |
| **Normalized database schema**: Create proper tables for Claims, Verdicts, Sources, Facts, ClaimFactSupport. Enables cross-analysis queries, trend analysis, citation networks. | Architecture / Data | low | med | 10-14 days | Improvements #15 |
| **Comprehensive testing**: Unit tests (80% coverage), integration tests, E2E tests (Playwright), API tests (xUnit). | Testing / Quality | low | high | 14-21 days | Improvements #16 |
| Analyzer modularization plan: `apps/web/src/lib/analyzer.ts` is monolithic (8234 lines); do incremental extraction only with safety rails. Split into understanding, research, verdict-generation, aggregation, report-generation modules. | Architecture | low | low | 5-7 days | Improvements #14 |

---

## Notes

- **Quick wins** (6-9 days total effort):
  1. Parallel verdict generation (1-2 days) → 50-80% faster
  2. Quality Gate UI display (2-3 days) → transparency
  3. Cost quotas (2-3 days) → financial safety *(low urgency for POC)*
  4. Admin authentication (1 day) → security *(low urgency for POC)*

- **Cost optimization** (combined 70-85% reduction):
  - Tiered LLM routing: 50-70% savings
  - Claim caching: 30-50% savings on repeat claims
  - Parallel processing: Time savings = cost savings

- **Security items**: All marked LOW urgency while local POC, but HIGH importance. Must be HIGH urgency before any public deployment.

---

## References

- **Detailed Analysis**: `Docs/STATUS/Improvement_Recommendations.md`
- **Current Status**: `Docs/STATUS/Current_Status.md`
- **Architecture**: `Docs/ARCHITECTURE/Overview.md`
- **Coding Guidelines**: `Docs/DEVELOPMENT/Coding_Guidelines.md`

