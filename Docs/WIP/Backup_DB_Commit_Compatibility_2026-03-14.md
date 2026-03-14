# Backup DB Commit Compatibility Analysis

**Generated:** 2026-03-14
**Subject:** `C:\DEV\FactHarbor_Backups\factharbor.db`

## DB Fingerprint

| Property | Value |
|----------|-------|
| Tables | `Jobs`, `JobEvents` (NO `AnalysisMetrics`) |
| Jobs columns | JobId, Status, Progress, CreatedUtc, UpdatedUtc, InputType, InputValue, InputPreview, ResultJson, ReportMarkdown, **PipelineVariant**, **PromptContentHash**, **PromptLoadedUtc** |
| Index | `IX_Jobs_PromptContentHash` |
| Job count | 6 |
| Data date | 2026-02-04 (10:53–11:01 UTC) |
| Pipeline variants used | orchestrated, monolithic_canonical, monolithic_dynamic |
| Schema version in results | "2.7.0" / "2.6.41" |

## Key Commits

| Question | Commit | Date | Description |
|----------|--------|------|-------------|
| **(a) Best schema match** | `f360367d` | 2026-02-04 07:20 | "Docs changed" — HEAD when DB data was created. Entity has exactly the same columns. |
| **(b) Newest usable (schema)** | `720a944b` | 2026-02-18 12:27 | "Merge Phase 4: Search infrastructure hardening" — next commit (`2d1acd68`) adds ParentJobId/RetryCount to JobEntity → EF Core SELECT/INSERT fails. |
| **(c) Newest same results** | `f360367d` | 2026-02-04 07:20 | Same as (a). The very next analysis commit (`4569d980`, 4h later) changes prompt text and schema defaults. |

### Why `4569d980` breaks result equivalence

- Changes "ArticleFrame" → "Background details: ...NOT a reason to split analysis" in inline prompt
- Changes `.default([])` → `.optional()` on schema fields (different empty-vs-undefined behavior)
- Changes `backgroundDetails` field name (output schema change)

### Why `2d1acd68` breaks schema compatibility

- Adds `ParentJobId`, `RetryCount`, `RetriedFromUtc`, `RetryReason` to `JobEntity`
- EF Core generates SQL referencing ALL mapped properties → "no such column" on old DB
- `EnsureCreated()` is no-op on existing DBs (doesn't add missing columns)

---

## Analysis-Affecting Changes: `f360367d` → `720a944b`

384 commits total. ~220 touch analysis-affecting code. Grouped by date:

| Date | Analysis/Total | Key Changes |
|------|:-:|-------------|
| **2026-02-04** | **8/10** | v3/v3.1 terminology cleanup (prompt text, config renames, `supportingFactIds` removal) |
| **2026-02-05** | **14/20** | Third-party reactions rule, probativeValue filtering, URL dedup, parallel extraction, recency enhancement, dead code removal |
| **2026-02-06** | **6/27** | Search quality hardening, LLM relevance classification (auto mode), recency cue terms to UCM |
| **2026-02-07** | **4/10** | Normalization heuristics to UCM, yes-no claim canonicalization, context-aware retrieval, relevance fallback |
| **2026-02-08** | **1/15** | Docs dedup (minor analyzer reference cleanup) |
| **2026-02-09** | **6/39** | Confidence calibration, graduated recency penalty, context drift guards, evidence fallback bypass fix |
| **2026-02-10** | **6/38** | **monolithic-canonical pipeline removed entirely**, Monolithic Dynamic promoted, parameter tuning, grounding check |
| **2026-02-11** | **1/19** | Anthropic SDK schema compat fix |
| **2026-02-12** | **13/34** | LLM grounding + direction adjudication, hardcoded keywords removed, LLM typeLabel, evidence processor extraction, deterministic semantic fallbacks removed |
| **2026-02-13** | **12/31** | harmPotential narrowing, context ID stabilization, verdict direction auto-correction, prompt externalization, Anthropic prompt caching |
| **2026-02-14** | **12/20** | harmPotential examples, verdict calibration, research budget scaling, evidence grounding for contestation, maxOutputTokens increase |
| **2026-02-15** | **9/23** | Source selection funnel, batch verdict retry, claim decomposition stabilization, context cap enforcement |
| **2026-02-16** | **18/37** | **ClaimAssessmentBoundary pipeline created**, orchestrated pipeline deleted, orchestrated prompts deleted, CB wired as default, AnalysisContext type definitions deleted |
| **2026-02-17** | **13/43** | CB Stages 1–5 implemented, ClaimBoundary → ClaimAssessmentBoundary rename, verdict switched to Sonnet, pipeline defaults tuned |
| **2026-02-18** | **19/47** | Multi-provider search fallback (Brave), circuit breaker, search infrastructure hardening, pipeline abort checks |

### Summary of pipeline evolution in this range

```
Feb 4:   orchestrated + monolithic_canonical + monolithic_dynamic (Triple-Path)
Feb 10:  orchestrated + monolithic_dynamic (canonical removed)
Feb 16:  ClaimAssessmentBoundary replaces orchestrated as default
Feb 17:  CB pipeline v1.0 complete (5 stages)
Feb 18:  Search infrastructure hardened (Brave fallback, circuit breaker)
```

### Magnitude of changes

Between `f360367d` and `720a944b` (14 days):
- **~220 analysis-affecting commits** across prompts, analyzer modules, config, and pipeline routing
- The entire pipeline architecture changed (orchestrated → ClaimAssessmentBoundary)
- Two pipeline variants were removed (canonical on Feb 10, orchestrated on Feb 16)
- Evidence filtering, verdict generation, and search infrastructure were overhauled

**Re-running any analysis from this DB against code newer than `f360367d` will produce fundamentally different results.**
