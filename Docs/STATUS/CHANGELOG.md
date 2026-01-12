# FactHarbor Changelog

This document tracks version history, bug fixes, and feature enhancements for FactHarbor POC1.

---

## v2.6.25 (January 2026)

### Features
- **Question-to-Statement Handling**: Improved normalization and handling
- **ArticleSummary Generation**: Explicit logic for generating article summaries based on input type
- **UI Layout Improvements**: Enhanced summary page layout and consistency

### Bug Fixes
- Unified display of verdicts and confidence across different input types
- Removed redundant "Question asked" and "Implied Claim" displays
- Improved scope header naming consistency

### Files Modified
- `apps/web/src/lib/analyzer.ts`
- `apps/web/src/app/jobs/[id]/page.tsx`

### Documentation
- Created `Docs/ARCHIVE/fix-tasks-in-progress-v2.6.25.md`

---

## v2.6.24 (January 10, 2026)

### Critical Fixes
- **🔥 Rating Inversion Fixed**: Verdicts now rate the ORIGINAL user claim AS STATED (not the analysis conclusion)
  - Added explicit "CRITICAL: RATING DIRECTION" section to verdict prompts
  - Preserves comparative/superlative/directional aspects of original claim
  - Example: If user claims "X is better than Y" and evidence shows Y is better, verdict is FALSE/LOW percentage

- **🔥 Centrality Over-Marking Fixed**: Methodology validation claims excluded from central marking
  - Added explicit examples: "The methodology used is scientifically valid" → centrality: LOW
  - Added guidance: Methodology claims are meta-claims, not subject matter
  - Expected outcome: ≤2 central claims per analysis

- **🔥 Critical Bug Fixed**: `isValidImpliedClaim is not defined` error
  - Renamed variable not updated everywhere (hotfix v2.6.24.1)
  - Fixed at line 6280 in analyzer.ts

### Enhancements
- **Article Summary Display**: Uses LLM-synthesized `articleThesis` instead of raw input verbatim
- **Question Label Fix**: Only shown for actual questions (not statements ending with "?")
  - Added `wasOriginallyQuestion` field to `ClaimUnderstanding`
  - Updated `isQuestionLike` logic

### Files Modified
- `apps/web/src/lib/analyzer.ts`: Rating prompts, centrality guidance, display logic, question detection

### Schema Changes
- Schema version: 2.6.24
- Added `wasOriginallyQuestion` to `ClaimUnderstanding` interface

### Documentation
- Created `Docs/ARCHIVE/fix-ui-issues-v2.6.24.md`
- Created `Docs/ARCHIVE/test-results-v2.6.24.md`

### Testing Status
- ⏳ Pending validation with hydrogen/electricity and Venezuela oil examples
- ✅ Input neutrality regression test passed (<2% divergence)

---

## v2.6.23 (January 10, 2026)

### Critical Fixes
- **🔥 Input Neutrality Fixed**: Question vs statement divergence reduced from 4% to 1%
  - Fixed `canonicalizeScopes()` to use `analysisInput` instead of original input (lines 3176, 3203)
  - Fixed supplemental scope detection to use `analysisInput` instead of `trimmedInput` (line 3195)
  - Pattern matching now uses normalized input consistently

### Enhancements
- **Centrality Logic Enhanced**: Strengthened with explicit NON-central examples
  - Added "EXPECT 0-2 CENTRAL CLAIMS MAXIMUM" guidance
  - Clarified that source/attribution/timing claims are NEVER central
  - Added explicit examples of what NOT to mark as central

- **Generic by Design Compliance**: Removed domain-specific person names
  - Removed: 'bolsonaro', 'putin', 'trump' from `newsIndicatorKeywords`
  - Kept generic temporal and news indicators (trial, verdict, sentence, election)

### Test Results
- ✅ Bolsonaro trial: 1% divergence (statement: 76%, question: 72%)
- ✅ Centrality reduction validated

### Files Modified
- `apps/web/src/lib/analyzer.ts`: Scope canonicalization, centrality prompts, recency detection

### Schema Changes
- Schema version: 2.6.23

### Documentation
- Created `Docs/ARCHIVE/input-neutrality-fix-v2.6.23.md`
- Created `Docs/ARCHIVE/test-plan-v2.6.23.md`

---

## v2.6.22 (January 10, 2026)

### Features
- **Enhanced Recency Detection**: Improved `isRecencySensitive()` with news-related keywords
  - Added: trial, verdict, sentence, election, investigation, court, ruling, etc.
  - Detects legal/court outcomes, political events, announcements

- **Date-Aware Query Variants**: ALL search types now get date-specific queries when recency matters
  - Added `recencyMatters` flag to `ResearchDecision` interface
  - Ensures consistent date filtering across all queries in a topic

- **Gemini Grounded Search**: New optional search mode
  - Added `FH_SEARCH_MODE=grounded` environment variable
  - Uses Gemini's built-in Google Search (when `LLM_PROVIDER=gemini`)
  - Created `search-gemini-grounded.ts` module

### Files Modified
- `apps/web/src/lib/analyzer.ts`: Recency detection, query generation
- `apps/web/src/lib/search-gemini-grounded.ts`: New module
- `apps/web/src/lib/analyzer/config.ts`: Added `searchMode` config

### Schema Changes
- Schema version: 2.6.22
- Added `recencyMatters` to `ResearchDecision` interface

---

## v2.6.21 (January 10, 2026)

### Features
- **Generic AnalysisContext**: Replaced legal-specific `DistinctProceeding` with domain-agnostic `AnalysisContext`
  - Flexible `metadata` object for domain-specific fields
  - Works across legal, scientific, regulatory, temporal, geographic domains

- **EvidenceScope**: Renamed `sourceScope` to `EvidenceScope` for clarity
  - Captures methodology/boundaries of source documents (WTW vs TTW, EU vs US standards)

### Enhancements
- **UI Improvements**:
  - Added contested badge to single-scope question displays
  - Added factor summary counts (positive/negative/neutral)
  - Aligned single-scope and multi-scope UI features

- **Centrality Logic Enhancement**:
  - Added "CRITICAL HEURISTIC": "If only ONE claim could be investigated, which would readers most want verified?"
  - Clarified high centrality requires PRIMARY thesis AND would invalidate conclusion if false

- **Quality Gates Review**:
  - Reviewed Gate 1 thresholds: Opinion ≤30%, Specificity ≥30% (appropriate)
  - Reviewed Gate 4 thresholds: MEDIUM requires ≥2 sources, ≥60% quality/agreement (balanced)

### Files Modified
- `apps/web/src/lib/analyzer.ts`: Generic prompts, UI enhancements
- `apps/web/src/lib/analyzer/types.ts`: Interface changes

### Schema Changes
- Replaced `DistinctProceeding` with `AnalysisContext` (kept alias for compatibility)
- Renamed `sourceScope` to `evidenceScope`

---

## v2.6.18-v2.6.20 (January 6-9, 2026)

### Critical Fixes
- **KeyFactors Aggregation Fixed** (January 6):
  - Added `keyFactorId?: string` to `ClaimVerdict` interface
  - Preserved `keyFactorId` in all 3 verdict creation paths (fallback, normal, multi-proceeding)
  - Files: `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/analyzer.ts`

- **Evidence Agreement Bug Fixed** (January 6):
  - Gate 4 now only counts claim-specific criticism
  - Uses proceeding context or source-based filtering
  - Prevents unrelated criticism from penalizing verdicts
  - File: `apps/web/src/lib/analyzer/quality-gates.ts`

- **PDF Fetch Errors Fixed**:
  - Enhanced PDF buffer validation
  - Increased timeout values (5 seconds per source)
  - Added redirect following
  - Improved User-Agent header
  - Set `max: 0` option for `pdf-parse` to prevent external test file access
  - File: `apps/web/src/lib/retrieval.ts`

### Features
- **KeyFactors Display**: Added to article mode reports (lines 4742-4755)
- **Temporal Error Sanitization**: Remove false "temporal error" comments from LLM output
- **Input Neutrality Foundation**: Standardized verdict prompts to use neutral "STATEMENT" label

### Infrastructure
- **Runner Resilience**: Exponential backoff retry with jitter in `RunnerClient.cs`
- **Job Lifecycle Tests**: Added `apps/web/src/lib/job-lifecycle.test.ts`
- **Job Status Unified**: Standardized on `QUEUED` status across API and UI
- **Analyzer Modularization**: Created modules in `apps/web/src/lib/analyzer/`:
  - types.ts, config.ts, quality-gates.ts, truth-scale.ts
  - pseudoscience.ts, source-reliability.ts, llm.ts, index.ts

### Schema Fixes
- FALSE verdict prompt/schema mismatch fixed (removed FALSE from prompt, using REFUTED only)
- Highlight colors normalized to 3-color UI system (`green | yellow | red`)
- Source reliability scale bug fixed (removed erroneous /100 division in Gate 4)

### Documentation
- Created `Docs/ARCHIVE/PDF_Fetch_Fix.md`
- Updated `Docs/FactHarbor_Code_Spec_Review.md` with January 5-6 fixes
- Documented `FH_REPORT_STYLE=rich` as NOT IMPLEMENTED
- Documented `FH_LLM_FALLBACKS` as NOT IMPLEMENTED

---

## Pre-v2.6.18 (Before January 2026)

### Initial POC1 Implementation

**Core Features Implemented:**
- AKEL pipeline (Understand → Research → Verdict)
- Multi-LLM provider support (Anthropic, OpenAI, Google, Mistral)
- Multi-search provider support (Google CSE, SerpAPI)
- 7-point verdict scale (TRUE to FALSE)
- Dependency tracking between claims
- Pseudoscience detection and escalation
- Quality Gates (Gate 1: Claim Validation, Gate 4: Verdict Confidence)
- Source reliability scoring (static bundle)
- Job lifecycle management (QUEUED → RUNNING → SUCCEEDED/FAILED)
- Server-Sent Events (SSE) for real-time progress
- PDF and HTML content extraction
- Markdown report generation
- Two-panel summary format

**Architecture:**
- Next.js web app (TypeScript, React, Tailwind CSS)
- .NET API (ASP.NET Core 8.0, C#)
- SQLite database (local development)
- Separated architecture (API for persistence, Web for analysis)

**Documentation:**
- Specification exported from XWiki (86 pages)
- Architecture analysis and gap analysis
- Coding guidelines and rules
- Installation and first-run checklists

---

## Version History Summary

| Version | Date | Key Changes |
|---------|------|-------------|
| **v2.6.25** | Jan 2026 | Question-to-statement handling, ArticleSummary logic, UI layout |
| **v2.6.24** | Jan 10 | Rating inversion fix, centrality fix, display improvements |
| **v2.6.23** | Jan 10 | Input neutrality fix (4%→1%), generic recency detection |
| **v2.6.22** | Jan 10 | Enhanced recency detection, Gemini Grounded Search |
| **v2.6.21** | Jan 10 | Generic AnalysisContext, EvidenceScope, UI improvements |
| **v2.6.18-20** | Jan 6-9 | KeyFactors aggregation fix, evidence agreement fix, PDF fixes |
| **<v2.6.18** | Before Jan | Initial POC1 implementation |

---

## Breaking Changes

### v2.6.21
- **DistinctProceeding → AnalysisContext**: `DistinctProceeding` is now a deprecated alias. Use `AnalysisContext` for new code.
- **sourceScope → evidenceScope**: Field renamed in `ExtractedFact` interface.

### v2.6.23
- **Scope Canonicalization**: Now uses `analysisInput` instead of original input. May affect custom integrations that relied on original input matching.

### v2.6.24
- **Rating Direction**: Verdicts now rate original claim direction. May change verdict values for comparative claims that were previously inverted.

---

## Known Issues (Tracked)

### Critical
- SSRF protection not implemented (URL fetching)
- Admin endpoints publicly accessible (`/admin/test-config`)
- No rate limiting or quota enforcement

### High
- Quality Gate decisions not displayed in UI (stats in JSON only)
- Metrics tracking not persisted (LLM tokens, search API calls, costs)
- Error pattern tracking not implemented

### Medium
- `FH_ALLOW_MODEL_KNOWLEDGE=false` not fully respected in Understanding phase
- Provider-specific prompt optimization not implemented
- Claim caching (separated architecture) not implemented
- Normalized data model not implemented (job blobs only)

### Low
- URL highlighting shows URL instead of fetched content
- `clampConfidence` test mismatch (0.1-1 vs 0-1)
- LLM fallback config documented but not implemented
- Rich report mode documented but not implemented

---

## Migration Notes

### Upgrading from Pre-v2.6.18

1. **Database**: No schema changes required (job blobs compatible)
2. **Environment Variables**: No new required variables
3. **API**: No breaking API changes
4. **UI**: No breaking UI changes

### Upgrading from v2.6.18 to v2.6.21+

1. **Code**: Update references from `DistinctProceeding` to `AnalysisContext`
2. **Code**: Update references from `sourceScope` to `evidenceScope`
3. **No database migration required** (backward compatible)

### Upgrading from v2.6.23 to v2.6.24+

1. **Review verdicts**: Comparative claims may have different verdict values (now correctly rating original claim direction)
2. **Review centrality**: Expect fewer central claims (methodology validation excluded)
3. **No database migration required**

---

## Deprecation Warnings

### Currently Deprecated
- `DistinctProceeding` (use `AnalysisContext`) - will be removed in v3.0
- `sourceScope` field name (use `evidenceScope`) - will be removed in v3.0

### Planned Deprecations
- 4-scale verdict (WELL-SUPPORTED, etc.) - already replaced by 7-scale + truth percentage
- Legacy highlight colors (4-color system) - replaced by 3-color system

---

## Contributors

This changelog reflects work by the FactHarbor development team and AI coding assistants following AGENTS.md guidelines.

---

**Last Updated**: January 2026  
**Changelog Format**: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
