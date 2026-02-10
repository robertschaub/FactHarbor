# FactHarbor Development History

**Last Updated**: February 8, 2026
**Current Version**: 2.10.2 (Code) | 2.7.0 (Schema Output)
**Schema Version**: 2.7.0

---

**Terminology Note**: Historical entries may use the legacy term "scope" when referring to AnalysisContext. Current terminology is **Context** for top-level analysis frames and **EvidenceScope** for per-evidence metadata.

## Table of Contents

- [Project Genesis](#project-genesis)
- [Architectural Decisions](#architectural-decisions)
- [Major Investigations & Fixes](#major-investigations--fixes)
- [Technical Debt & Known Issues](#technical-debt--known-issues)

> **Version History**: Detailed version-by-version changelog has been archived to `Docs/ARCHIVE/STATUS/HISTORY_version_log_arch.md`.

---

## Project Genesis

### Vision

A world where decisions and public debate are grounded in evidence, so people can move forward with clarity and confidence.

### Mission

FactHarbor brings clarity and transparency to a world full of unclear, contested, and misleading information by shedding light on the context, assumptions, and evidence behind claims.

### Initial Architecture Decisions

**Separated Services Architecture**:
- **.NET API** (ASP.NET Core 8.0): Job persistence, status tracking, SSE events
- **Next.js Web App**: UI and analysis engine

**Core Principles** (from AGENTS.md):
1. **Generic by Design**: No domain-specific hardcoding
2. **Input Neutrality**: Question ≈ Statement (within ±5%)
3. **Pipeline Integrity**: No stage skipping (Understand → Research → Verdict)
4. **Evidence Transparency**: Every verdict cites supporting facts
5. **Context Detection**: Identify and analyze distinct bounded analytical frames

---

## Architectural Decisions

### ADR-001: Scope/Context Terminology Refactoring (v2.7.0)

**Context**: The codebase used multiple overlapping terms: "context", "proceeding", "scope", "event", creating confusion.

**Decision**: Unified terminology around three concepts:
1. **ArticleFrame**: Narrative background/overview (article-level context)
2. **AnalysisContext**: Top-level bounded analytical frame with defined boundaries, methodology, temporal period, subject
3. **EvidenceScope**: Per-fact source scope metadata (methodology/boundaries of individual sources)

**Rationale**:
- Clear separation of concerns
- Distinct scopes = different legal cases, methodologies, temporal periods, regulatory frameworks
- NOT distinct = different perspectives on same event

**Impact**: Major refactor of schema, prompts, and UI. Legacy field names kept for backward compatibility.

---

### Twin-Path Pipeline Architecture (v2.6.33, updated v2.10.x)

**Context**: Different use cases require different trade-offs between quality, speed, and cost.

**Decision**: Implemented two user-selectable analysis modes (originally three; Monolithic Canonical removed in v2.10.x as redundant):

1. **Orchestrated Pipeline** (default):
   - TypeScript-orchestrated staged pipeline (Understand -> Research -> Verdict)
   - Highest quality, explicit multi-scope detection
   - Produces canonical result schema, full budget control

2. **Monolithic Dynamic**:
   - Experimental LLM tool-loop, flexible LLM-defined output
   - Minimum safety contract (citations required)

**Architecture Principles**:
- Shared primitives: Normalization, budgets, search/fetch, provenance validation
- Isolated orchestration: Each pipeline has separate logic to prevent cross-contamination
- Result envelope: Common metadata (variant, budgets, warnings, providerInfo)
- Per-job variant persistence: Reproducible results

**Status**: Implemented and operational. Pipeline variant selector available on analyze page.

---

### Configuration Tuning for Better Analysis (v2.8.2)

**Context**: January quality regression showed budget constraints were limiting research quality.

**Quick Mode** (v2.8.2): `maxResearchIterations`: 4, `maxSourcesPerIteration`: 4, `maxTotalSources`: 12
**Deep Mode**: `maxResearchIterations`: 5, `maxSourcesPerIteration`: 4, `maxTotalSources`: 20

**Budget System**: Per-scope iteration limits, total iteration caps, token budget tracking, hard enforcement mode (configurable).

**Rationale**: Balance between cost control and research thoroughness. Quality regression showed that too-strict limits harm evidence collection.

**Status**: Active configuration in `apps/web/src/lib/analyzer/config.ts` and `budgets.ts`

---

### LLM Prompting Improvements (Multiple Phases)

**Decision**: Optimize prompts per LLM provider instead of one-size-fits-all.

**Provider-Specific Adaptations**:
1. **Claude (Anthropic)**: XML structure tags, thinking blocks, prefill hints
2. **GPT (OpenAI)**: Few-shot examples, calibration tables, JSON mode hints
3. **Gemini (Google)**: Strict length limits, numbered processes, schema checklists
4. **Mistral**: Step-by-step instructions, validation checklists, field templates

**Key Prompt Principles**:
- Evidence-based analysis (no model knowledge when `pipeline.allowModelKnowledge=false`)
- Provenance validation (URL + excerpt required)
- Scope detection with generic terminology
- Input neutrality (question ≈ statement)
- Fail closed on ambiguity

**Status**: ❌ NEVER VALIDATED - No A/B testing performed, no real API calls to measure actual token reduction or quality impact.

---

### Quality Gates Design (v2.6.18+)

**Decision**: Two mandatory quality gates:
- **Gate 1** (Claim Validation): Filters opinions, predictions, low-specificity claims before research
- **Gate 4** (Verdict Confidence): Requires minimum sources, quality, and agreement

**Thresholds**: Gate 1: Opinion ≤30%, Specificity ≥30%. Gate 4: MEDIUM requires ≥2 sources, ≥60% quality/agreement.

**Status**: Implemented, stats tracked in JSON, but per-item reasons not displayed in UI yet.

---

### KeyFactors Implementation (v2.6.18+)

**Decision**: Implement emergent, optional KeyFactors discovered during Understanding phase.

- KeyFactors are decomposition questions (e.g., "Was due process followed?")
- Claims map to KeyFactors via `keyFactorId`
- KeyFactor verdicts aggregate from mapped claim verdicts

**Status**: Implemented, aggregation fixed (v2.6.18), displayed in reports.

---

## Major Investigations & Fixes

### Quality Regression (January 13-19, 2026)

**Problem**: Reports showed significant quality degradation: Confidence 77%→50%, Searches 16→9, Claims 12→7, Input neutrality broken (28% divergence).

**Root Causes**:
1. Budget constraints limiting research (PR 6 enforcement too strict) → Fixed in v2.8.2
2. Input normalization not reaching LLM (different classification → different research paths) → Fixed in v2.6.30
3. Quick mode too restrictive (2 iterations) → Enhanced to 4
4. Gate 1 changes letting opinions through → Stricter filtering restored
5. v2.8 prompt changes deployed unvalidated → Still pending validation

**Lessons Learned**:
1. Never deploy unvalidated optimizations
2. Measure everything before and after changes
3. Input neutrality is fragile and requires continuous validation
4. Budget constraints have non-obvious quality impacts

---

### Input Neutrality Issues (v2.6.23 - v2.6.30)

**Problem**: Question vs statement phrasing yielded different verdicts, violating core requirement.

**Issues Fixed**: Scope canonicalization using wrong input variable; LLM classifying normalized input differently; different classification triggering different research patterns.

**Status**: ✅ RESOLVED. Current implementation forces identical pipeline paths.

---

### Scope Detection Hardcoded Names (January 19, 2026)

**Problem**: Recency detection used hardcoded political figure names, violating "Generic by Design" principle.

**Fix**: Replaced with generic temporal and news indicators (keywords + proper noun detection).

**Status**: ✅ FIXED in v2.6.23

---

### Prompt Optimization Validation (Pending)

**Problem**: v2.8 prompt optimizations (provider-specific formatting, budget model optimization) deployed without A/B testing. All 83 tests validate syntax only, not LLM behavior.

**Status**: ❌ NEVER VALIDATED. Infrastructure ready (baseline suite, A/B framework, metrics). Awaiting budget approval ($20-50 baseline, $100-200 A/B).

---

## Measurements & Testing Infrastructure (v2.8.1)

**Built But Not Integrated**:
1. Metrics Collection System (`apps/web/src/lib/analyzer/metrics.ts`)
2. Observability Dashboard (`/admin/metrics` route)
3. Baseline Test Suite (30 test cases across 7 categories)
4. A/B Testing Framework
5. Schema Retry Logic
6. Parallel Verdict Generation (50-80% speed improvement)
7. Tiered LLM Routing (50-70% cost reduction)

**Status**: Infrastructure complete, database migration ready, but not integrated into analyzer.ts. Tests not executed (require $20-200 API budget).

---

## Technical Debt & Known Issues

### Critical Issues

**1. v2.8 Prompts Never Validated** (CRITICAL)
- **Impact**: Unknown quality impact of large optimization work
- **Solution**: Run baseline + A/B tests ($120-250 in API calls)

**2. Metrics Not Integrated** (HIGH)
- **Impact**: No observability into analysis quality/performance
- **Solution**: Add metrics hooks to analyzer.ts (15-30 minutes)

**3. SSRF Protection Missing** (SECURITY)
- **Priority**: LOW for local POC, HIGH before public deployment

**4. Admin Endpoint Security** (SECURITY)
- **Priority**: LOW for local POC, HIGH before public deployment

**5. Rate Limiting Missing** (SECURITY)
- **Priority**: LOW for local POC, HIGH before public deployment

---

### High Priority

**6. Quality Gate Display** (UX) - Gate decisions exist in JSON but not shown in UI
**7. Model Knowledge Toggle** (QUALITY) - `pipeline.allowModelKnowledge=false` not fully respected

---

### Medium Priority

**8. Claim Caching** (PERFORMANCE) - 30-50% savings on repeat claims, not implemented
**9. Normalized Data Model** (ARCHITECTURE) - JSON blobs, no relational queries
**10. Error Pattern Tracking** (OBSERVABILITY) - Not implemented

---

### Low Priority

**11. URL Highlighting** (UX) - Minor issue
**12. LLM Fallback** (RESILIENCE) - Not implemented
**13. Rich Report Mode** (UX) - Not implemented

---

### Unimplemented Planned Features

Claim-level caching, separated architecture for claim reuse, historical source track record, provenance chain tracking, multi-language support, interactive refinement, comparative analysis mode, analysis templates.

**Status**: Moved to backlog.

---

## Breaking Changes

### v2.6.21
- `DistinctProceeding` → `AnalysisContext` (deprecated alias kept)
- `sourceScope` → `evidenceScope` (field renamed)

### v2.6.23
- Scope canonicalization uses `analysisInput` instead of original input

### v2.6.24
- Rating direction: Verdicts rate original claim direction

### v2.7.0
- Schema version bump to 2.7.0
- Primary field names changed to `analysisContexts`/`contextId` (legacy fields supported)

---

## Contributors

This history reflects work by the FactHarbor development team and AI coding assistants following AGENTS.md guidelines.

---

**Document Status**: Comprehensive history compiled from 45+ source documents
**Consolidation Date**: January 19, 2026
**Source Documents**: CHANGELOG.md, EVOLUTION.md, investigation reports, bug fix reports, implementation summaries, architecture reviews
