# Unified Configuration Management Plan

**Version:** 1.3.0
**Date:** 2026-01-30
**Status:** Proposed
**Author:** Architecture Review

## Executive Summary

This document proposes a unified approach to managing FactHarbor configuration settings. Currently, settings are scattered across `.env` files, hardcoded in TypeScript, and stored in the database (prompts). This plan establishes a clear architecture for which settings belong where and how they should be managed.

## Current State Analysis

### Configuration Sources (As-Is)

| Source | Count | Reload Behavior | Editable By |
|--------|-------|-----------------|-------------|
| `.env.local` / `.env.example` | ~45 settings | Requires restart | Developer/DevOps |
| Hardcoded in TypeScript | ~15 thresholds | Requires deployment | Developer |
| Database (`config_blobs`) | ~7 prompts | Hot-reloadable | Admin UI |

### Problems with Current Approach

1. **Operator friction**: Changing analysis behavior requires server restart or redeployment
2. **No audit trail**: `.env` changes aren't tracked or versioned
3. **Inconsistent patterns**: Some settings are env vars, others are hardcoded, others are in DB
4. **Testing difficulty**: Hard to test different configurations without restart

## Proposed Architecture

### Three-Tier Configuration Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TIER 1: INFRASTRUCTURE                          │
│            (Environment Variables - Restart Required)               │
├─────────────────────────────────────────────────────────────────────┤
│ • API keys and secrets (ANTHROPIC_API_KEY, etc.)                   │
│ • Service URLs (FH_API_BASE_URL)                                   │
│ • Authentication keys (FH_ADMIN_KEY, FH_INTERNAL_RUNNER_KEY)       │
│ • File system paths (FH_DEBUG_LOG_PATH, FH_SR_CACHE_PATH)          │
│ • Process configuration (FH_RUNNER_MAX_CONCURRENCY)                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     TIER 2: OPERATIONAL                             │
│           (Database Config - Hot-Reloadable via Admin UI)           │
├─────────────────────────────────────────────────────────────────────┤
│ • Pipeline settings (analysis mode, budgets, thresholds)           │
│ • Model selection (tiering, model per task)                        │
│ • Feature flags (LLM text analysis toggles)                        │
│ • Search configuration (max results, date restrict, whitelist)     │
│ • Source reliability tuning (thresholds, multi-model toggle)       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     TIER 3: BEHAVIORAL                              │
│              (Database Prompts - Hot-Reloadable via Admin UI)       │
├─────────────────────────────────────────────────────────────────────┤
│ • Pipeline prompts (orchestrated, monolithic-canonical, etc.)      │
│ • Source reliability evaluation criteria                            │
│ • Text analysis prompts (input, evidence, scope, verdict)          │
│ • Rating bands, score caps, classification rules                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Detailed Setting Classification

### Tier 1: Infrastructure (Environment Variables)

These settings MUST remain as environment variables because they:
- Contain secrets that should never be in a database
- Configure infrastructure that can't change at runtime
- Are deployment-specific (different per environment)

| Setting | Restart Type | Reason |
|---------|--------------|--------|
| `FH_API_BASE_URL` | Web | Service endpoint |
| `FH_ADMIN_KEY` | Web | Auth credential |
| `FH_INTERNAL_RUNNER_KEY` | Web | Auth credential |
| `ANTHROPIC_API_KEY` | Web | Secret |
| `OPENAI_API_KEY` | Web | Secret |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Web | Secret |
| `MISTRAL_API_KEY` | Web | Secret |
| `GOOGLE_CSE_API_KEY` | Web | Secret |
| `GOOGLE_CSE_ID` | Web | Secret |
| `SERPAPI_API_KEY` | Web | Secret |
| `LLM_PROVIDER` | Web | Provider client init |
| `FH_LLM_FALLBACKS` | Web | Fallback chain init |
| `FH_RUNNER_MAX_CONCURRENCY` | Server | Worker pool size |
| `FH_DEBUG_LOG_PATH` | Web | File system |
| `FH_SR_CACHE_PATH` | Web | SQLite path |
| `FH_DEBUG_LOG_FILE` | Web | Debug toggle |
| `FH_DEBUG_LOG_CLEAR_ON_START` | Web | Debug behavior |

### Tier 2: Operational (Database - Pipeline Config)

These settings should move to Admin UI because they:
- Affect analysis quality/cost tradeoffs
- Need to be tuned without restarts
- Benefit from audit trails and versioning

#### 2.1 Pipeline Config Blob

**Type:** `pipeline-config`
**Profile:** `default`

```typescript
interface PipelineConfig {
  // === Model Selection ===
  llmTiering: boolean;              // FH_LLM_TIERING (default: true)
  modelUnderstand: string;          // FH_MODEL_UNDERSTAND
  modelExtractFacts: string;        // FH_MODEL_EXTRACT_FACTS
  modelVerdict: string;             // FH_MODEL_VERDICT

  // === LLM Feature Flags ===
  llmInputClassification: boolean;  // FH_LLM_INPUT_CLASSIFICATION (default: true)
  llmEvidenceQuality: boolean;      // FH_LLM_EVIDENCE_QUALITY (default: true)
  llmScopeSimilarity: boolean;      // FH_LLM_SCOPE_SIMILARITY (default: true)
  llmVerdictValidation: boolean;    // FH_LLM_VERDICT_VALIDATION (default: true)

  // === Analysis Settings ===
  analysisMode: "quick" | "deep";   // FH_ANALYSIS_MODE (default: "deep")
  allowModelKnowledge: boolean;     // FH_ALLOW_MODEL_KNOWLEDGE (default: true)
  deterministic: boolean;           // FH_DETERMINISTIC (default: true)
  scopeDedupThreshold: number;      // FH_SCOPE_DEDUP_THRESHOLD (default: 0.70)

  // === Budget Controls ===
  maxIterationsPerScope: number;    // FH_MAX_ITERATIONS_PER_SCOPE (default: 5)
  maxTotalIterations: number;       // FH_MAX_TOTAL_ITERATIONS (default: 20)
  maxTotalTokens: number;           // FH_MAX_TOTAL_TOKENS (default: 750000)
  enforceBudgets: boolean;          // FH_ENFORCE_BUDGETS (default: false)
}
```

#### 2.2 Search Config Blob

**Type:** `search-config`
**Profile:** `default`

```typescript
interface SearchConfig {
  provider: "auto" | "google-cse" | "serpapi";  // FH_SEARCH_PROVIDER
  enabled: boolean;                              // FH_SEARCH_ENABLED (default: true)
  maxResults: number;                            // FH_SEARCH_MAX_RESULTS (default: 6)
  dateRestrict: "" | "d" | "w" | "m" | "y";     // FH_SEARCH_DATE_RESTRICT
  domainWhitelist: string[];                     // FH_SEARCH_DOMAIN_WHITELIST
}
```

#### 2.3 Source Reliability Config Blob

**Type:** `source-reliability-config`
**Profile:** `default`

```typescript
interface SourceReliabilityConfig {
  enabled: boolean;                  // FH_SR_ENABLED (default: true)
  multiModel: boolean;               // FH_SR_MULTI_MODEL (default: true)
  openaiModel: string;               // FH_SR_OPENAI_MODEL (default: "gpt-4o-mini")
  confidenceThreshold: number;       // FH_SR_CONFIDENCE_THRESHOLD (default: 0.8)
  consensusThreshold: number;        // FH_SR_CONSENSUS_THRESHOLD (default: 0.20)
  defaultScore: number;              // FH_SR_DEFAULT_SCORE (default: 0.5)
  cacheTtlDays: number;              // FH_SR_CACHE_TTL_DAYS (default: 90)
  filterEnabled: boolean;            // FH_SR_FILTER_ENABLED (default: true)
  skipPlatforms: string[];           // FH_SR_SKIP_PLATFORMS
  skipTlds: string[];                // FH_SR_SKIP_TLDS
}
```

### Tier 3: Behavioral (Database - Prompts)

Already implemented via `config_blobs` table:

| Profile | Description | Status |
|---------|-------------|--------|
| `orchestrated` | Main pipeline prompt | ✅ Implemented |
| `monolithic-canonical` | Single-call pipeline | ✅ Implemented |
| `monolithic-dynamic` | Flexible output pipeline | ✅ Implemented |
| `source-reliability` | Source evaluation criteria | ✅ Implemented |
| `text-analysis-input` | Input classification | ✅ Implemented |
| `text-analysis-evidence` | Evidence quality | ✅ Implemented |
| `text-analysis-scope` | Scope similarity | ✅ Implemented |
| `text-analysis-verdict` | Verdict validation | ✅ Implemented |

### Settings That Should Stay Hardcoded

These settings should NOT be configurable because:
- They define fundamental quality contracts
- Changing them requires understanding complex validation logic
- They're part of the core algorithm, not tuning parameters

| Setting | Location | Reason |
|---------|----------|--------|
| Gate 1 opinion threshold (0.5) | quality-gates.ts:165 | Core quality definition |
| Gate 1 specificity threshold (0.3) | quality-gates.ts:167 | Core quality definition |
| Gate 4 tier boundaries | quality-gates.ts:264-272 | Foundational confidence tiers |
| Pattern lists (OPINION_MARKERS, etc.) | quality-gates.ts:26-97 | Complex regex, better as code |
| Confidence requirements per rating | source-reliability-config.ts:139-147 | Asymmetric gating logic |

## Analysis Quality Management System

### Overview

The **Analysis Quality Management** system provides a **unified, holistic interface** for viewing, analyzing, and tuning ALL configurable elements that influence analysis quality. This includes pipeline settings, source reliability settings, prompts, and their interrelationships.

**Core Principles:**
1. **Single Source of Truth**: One interface to see everything affecting quality
2. **Holistic View**: Settings and prompts shown together with their quality impact
3. **Job-Centric Audit**: Every job links to its exact configuration snapshot
4. **Impact Visualization**: Clear indication of how each element affects quality metrics

**Capabilities:**
- View ALL settings (Tier 1, 2, and 3) and prompts active for any job
- Understand quality impact of each configurable element
- Compare complete configurations between jobs
- Tune any hot-reloadable setting or prompt with immediate feedback
- Track all configuration changes over time
- Monitor quality metrics correlated with configuration versions
- Simulate impact of proposed changes before applying

### Quality-Influencing Settings Map

Every setting that can affect report quality is documented with its impact:

#### Pipeline Quality Settings

| Setting | Tier | Impact on Quality | Tunable |
|---------|------|-------------------|---------|
| `analysisMode` | 2 | deep=more claims investigated | ✅ Hot |
| `maxIterationsPerScope` | 2 | Higher=more evidence gathered | ✅ Hot |
| `maxTotalIterations` | 2 | Higher=more claims fully researched | ✅ Hot |
| `maxTotalTokens` | 2 | Higher=research doesn't stop early | ✅ Hot |
| `enforceBudgets` | 2 | false=allows exceeding limits for important claims | ✅ Hot |
| `scopeDedupThreshold` | 2 | Lower=more distinct scopes detected | ✅ Hot |
| `allowModelKnowledge` | 2 | true=more comprehensive analysis | ✅ Hot |
| `deterministic` | 2 | true=reproducible outputs | ✅ Hot |
| `llmTiering` | 2 | Affects model quality per task | ✅ Hot |
| `modelVerdict` | 2 | Better model=better verdicts | ✅ Hot |
| `llmInputClassification` | 2 | LLM=better claim decomposition | ✅ Hot |
| `llmEvidenceQuality` | 2 | LLM=better evidence filtering | ✅ Hot |
| `llmScopeSimilarity` | 2 | LLM=better scope detection | ✅ Hot |
| `llmVerdictValidation` | 2 | LLM=catches inversions/harm | ✅ Hot |
| `searchMaxResults` | 2 | More results=more evidence sources | ✅ Hot |
| `searchDomainWhitelist` | 2 | Restricts to trusted sources | ✅ Hot |
| Pipeline prompts | 3 | Controls LLM behavior | ✅ Hot |
| Text analysis prompts | 3 | Pattern matching rules | ✅ Hot |
| `LLM_PROVIDER` | 1 | Provider capabilities differ | ❌ Restart |
| `FH_LLM_FALLBACKS` | 1 | Fallback quality varies | ❌ Restart |
| Gate 1/4 thresholds | Code | Core quality contract | ❌ Deploy |

#### Source Reliability Quality Settings

| Setting | Tier | Impact on Quality | Tunable |
|---------|------|-------------------|---------|
| `srEnabled` | 2 | false=no source scoring | ✅ Hot |
| `srMultiModel` | 2 | true=reduces hallucination | ✅ Hot |
| `srOpenaiModel` | 2 | Better model=better refinement | ✅ Hot |
| `srConfidenceThreshold` | 2 | Higher=stricter acceptance | ✅ Hot |
| `srConsensusThreshold` | 2 | Lower=stricter model agreement | ✅ Hot |
| `srDefaultScore` | 2 | Score for unknown sources | ✅ Hot |
| `srFilterEnabled` | 2 | Skips low-value domains | ✅ Hot |
| Source reliability prompt | 3 | Evaluation criteria, caps, bands | ✅ Hot |
| Confidence requirements | Code | Asymmetric gating per rating | ❌ Deploy |
| Rating band boundaries | Code | Score-to-rating mapping | ❌ Deploy |

### Configuration Snapshotting

Every analysis job captures a **config snapshot** at execution time, stored alongside the job record.

#### Snapshot Schema

```typescript
interface JobConfigSnapshot {
  // Metadata
  snapshotId: string;           // UUID
  jobId: string;                // Foreign key to jobs table
  capturedAt: Date;             // When snapshot was taken

  // Tier 1: Infrastructure (read-only reference)
  infrastructure: {
    llmProvider: string;        // LLM_PROVIDER value
    apiBaseUrl: string;         // FH_API_BASE_URL (sanitized)
    runnerConcurrency: number;  // FH_RUNNER_MAX_CONCURRENCY
  };

  // Tier 2: Operational (JSON configs)
  pipelineConfig: PipelineConfig;
  searchConfig: SearchConfig;
  sourceReliabilityConfig: SourceReliabilityConfig;

  // Tier 3: Behavioral (prompt hashes for reference)
  promptHashes: {
    orchestrated?: string;
    monolithicCanonical?: string;
    sourceReliability?: string;
    textAnalysisInput?: string;
    textAnalysisEvidence?: string;
    textAnalysisScope?: string;
    textAnalysisVerdict?: string;
  };

  // Code version for reference
  codeVersion: string;          // From package.json or git commit
}
```

#### Storage

- **Table:** `job_config_snapshots`
- **Retention:** Same as job retention policy
- **Size:** ~2-5 KB per job (JSON compressed)

### Unified Quality Dashboard

**Route:** `/admin/quality`

The central hub for all analysis quality management:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Analysis Quality Management                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ CURRENT QUALITY PROFILE                                    [Edit All]   │ │
│ │                                                                         │ │
│ │ Active Since: 2026-01-30 14:32  •  Jobs Run: 47  •  Avg Quality: 72%   │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ┌───────────────────┬───────────────────┬───────────────────────────────┐  │
│ │ PIPELINE          │ SOURCE RELIABILITY │ PROMPTS                      │  │
│ ├───────────────────┼───────────────────┼───────────────────────────────┤  │
│ │ Mode: deep        │ Multi-Model: ✅    │ orchestrated: v2.8.3        │  │
│ │ Iterations: 5/20  │ Confidence: 0.80   │ source-reliability: v2.8.3  │  │
│ │ Budget: soft      │ Consensus: 0.20    │ text-analysis-*: v1.2.0     │  │
│ │ LLM Analysis: ✅  │ Filter: ✅         │                              │  │
│ │ Tiering: ✅       │                    │ [View All 8 Prompts]         │  │
│ │                   │                    │                              │  │
│ │ [Configure]       │ [Configure]        │ [Configure]                  │  │
│ └───────────────────┴───────────────────┴───────────────────────────────┘  │
│                                                                             │
│ ═══════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│ QUALITY METRICS BY CONFIG VERSION                                           │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Version    │ Period      │ Jobs │ Claims │ Confidence │ SR Consensus │  │ │
│ │ ────────────────────────────────────────────────────────────────────── │ │
│ │ current    │ Jan 30      │  47  │  6.2   │    72%     │     94%      │ │ │
│ │ previous   │ Jan 28-30   │ 123  │  4.1   │    65%     │     91%      │ │ │
│ │ v2.8.2     │ Jan 20-28   │  89  │  3.8   │    61%     │     88%      │ │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ QUICK ACTIONS                                                               │
│ ┌───────────────┬───────────────┬───────────────┬───────────────────────┐  │
│ │ [Audit Job]   │ [Compare]     │ [History]     │ [Apply Preset]        │  │
│ │ View any job's│ Diff configs  │ All changes   │ Quality/Cost presets  │  │
│ │ full config   │ between jobs  │ over time     │                       │  │
│ └───────────────┴───────────────┴───────────────┴───────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Holistic Job Audit View

**Route:** `/admin/quality/job/[id]`

Complete view of ALL settings and prompts active for a specific job:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Job Quality Audit                                          Job: abc-123    │
│ Analyzed: 2026-01-30 14:32  •  Duration: 4m 23s  •  Cost: $1.84           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ JOB RESULTS SUMMARY                                                         │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Claims Found: 8  │  Verdicts: 6  │  Confidence: 72%  │  Sources: 12    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ═══════════════════════════════════════════════════════════════════════════ │
│ COMPLETE CONFIGURATION AT EXECUTION TIME                                    │
│ ═══════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│ ▼ PIPELINE SETTINGS (Tier 2 - Hot Reloadable)                              │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │ Setting                  │ Value                    │ Quality Impact  │ │
│   │ ─────────────────────────────────────────────────────────────────────│ │
│   │ analysisMode             │ deep                     │ +claims         │ │
│   │ maxIterationsPerScope    │ 5                        │ +evidence       │ │
│   │ maxTotalIterations       │ 20                       │ +coverage       │ │
│   │ maxTotalTokens           │ 750,000                  │ +depth          │ │
│   │ enforceBudgets           │ false (soft)             │ +quality        │ │
│   │ scopeDedupThreshold      │ 0.70                     │ +scopes         │ │
│   │ allowModelKnowledge      │ true                     │ +comprehensive  │ │
│   │ deterministic            │ true                     │ +reproducible   │ │
│   │ llmTiering               │ true                     │ cost savings    │ │
│   │ modelUnderstand          │ claude-3-5-haiku         │ cost vs quality │ │
│   │ modelExtractFacts        │ claude-3-5-haiku         │ cost vs quality │ │
│   │ modelVerdict             │ claude-sonnet-4          │ +accuracy       │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ▼ LLM TEXT ANALYSIS (Tier 2 - Hot Reloadable)                              │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │ Analysis Point           │ Mode  │ Prompt Version │ Quality Impact   │ │
│   │ ─────────────────────────────────────────────────────────────────────│ │
│   │ Input Classification     │ ✅ LLM │ v1.1.0         │ +decomposition   │ │
│   │ Evidence Quality         │ ✅ LLM │ v1.2.0         │ +filtering       │ │
│   │ Scope Similarity         │ ✅ LLM │ v1.2.0         │ +scope detection │ │
│   │ Verdict Validation       │ ✅ LLM │ v1.2.0         │ +inversion catch │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ▼ SEARCH SETTINGS (Tier 2 - Hot Reloadable)                                │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │ provider: auto  │  maxResults: 6  │  dateRestrict: none              │ │
│   │ domainWhitelist: (none - all domains allowed)                        │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ▼ SOURCE RELIABILITY SETTINGS (Tier 2 - Hot Reloadable)                    │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │ Setting                  │ Value           │ Quality Impact           │ │
│   │ ─────────────────────────────────────────────────────────────────────│ │
│   │ enabled                  │ true            │ source scoring           │ │
│   │ multiModel               │ true            │ -hallucination           │ │
│   │ openaiModel              │ gpt-4o-mini     │ cost vs quality          │ │
│   │ confidenceThreshold      │ 0.80            │ acceptance strictness    │ │
│   │ consensusThreshold       │ 0.20            │ model agreement          │ │
│   │ defaultScore             │ 0.50            │ unknown source handling  │ │
│   │ filterEnabled            │ true            │ skip low-value domains   │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ▼ PROMPTS USED (Tier 3 - Hot Reloadable)                                   │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │ Profile                  │ Hash      │ Version │ [Actions]            │ │
│   │ ─────────────────────────────────────────────────────────────────────│ │
│   │ orchestrated             │ a1b2c3d4  │ v2.8.3  │ [View] [Diff]       │ │
│   │ source-reliability       │ e5f6g7h8  │ v2.8.3  │ [View] [Diff]       │ │
│   │ text-analysis-input      │ 34309de4  │ v1.1.0  │ [View] [Diff]       │ │
│   │ text-analysis-evidence   │ 5f1b551d  │ v1.2.0  │ [View] [Diff]       │ │
│   │ text-analysis-scope      │ 76a16acb  │ v1.2.0  │ [View] [Diff]       │ │
│   │ text-analysis-verdict    │ ea27d6d0  │ v1.2.0  │ [View] [Diff]       │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ▼ INFRASTRUCTURE (Tier 1 - Read Only)                                      │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │ LLM Provider: anthropic  │  Code Version: 2.8.3  │  Runner: 4 slots  │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ▼ SOURCE RELIABILITY EVALUATIONS (12 sources evaluated)                    │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │ Domain           │ Score │ Rating          │ Confidence │ Consensus  │ │
│   │ ─────────────────────────────────────────────────────────────────────│ │
│   │ reuters.com      │ 0.92  │ highly_reliable │ 0.95       │ ✅ passed  │ │
│   │ bbc.com          │ 0.88  │ highly_reliable │ 0.91       │ ✅ passed  │ │
│   │ nature.com       │ 0.94  │ highly_reliable │ 0.97       │ ✅ passed  │ │
│   │ example-blog.xyz │ 0.35  │ leaning_unrelia │ 0.72       │ ✅ passed  │ │
│   │ [View All 12 Evaluations]                                            │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ═══════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│ [Compare with Another Job]  [Compare with Current Config]  [Re-run Job]    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Holistic Configuration Comparison

**Route:** `/admin/quality/compare?job1=abc&job2=xyz` or `/admin/quality/compare?job=abc&current=true`

Comprehensive side-by-side diff of ALL configurable elements:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Quality Configuration Comparison                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Job abc-123 (2026-01-28)              vs    Job xyz-789 (2026-01-30)       │
│ Claims: 4.1  Confidence: 65%                Claims: 6.2  Confidence: 72%   │
│                                                                             │
│ ═══════════════════════════════════════════════════════════════════════════ │
│ DIFFERENCES FOUND: 8 settings, 2 prompts                                    │
│ ═══════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│ PIPELINE SETTINGS (5 differences)                                           │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Setting                │ Job abc-123        │ Job xyz-789      │ Impact │ │
│ │ ───────────────────────────────────────────────────────────────────────│ │
│ │ analysisMode           │ quick              │ deep        ⬆️   │ +claims│ │
│ │ maxIterationsPerScope  │ 3                  │ 5           ⬆️   │ +evid  │ │
│ │ maxTotalIterations     │ 12                 │ 20          ⬆️   │ +cover │ │
│ │ enforceBudgets         │ true (hard)        │ false (soft)⬆️   │ +qual  │ │
│ │ llmVerdictValidation   │ false (heuristic)  │ true (LLM)  ⬆️   │ +catch │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ SOURCE RELIABILITY SETTINGS (1 difference)                                  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ consensusThreshold     │ 0.15               │ 0.20        ⬇️   │ +agree │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ PROMPTS (2 differences)                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Profile                │ Job abc-123        │ Job xyz-789      │ Change │ │
│ │ ───────────────────────────────────────────────────────────────────────│ │
│ │ text-analysis-evidence │ v1.1.0 (abc123)    │ v1.2.0 (5f1b55) │ [Diff] │ │
│ │ text-analysis-verdict  │ v1.1.0 (def456)    │ v1.2.0 (ea27d6) │ [Diff] │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ UNCHANGED (16 settings, 6 prompts)                         [Show Unchanged] │
│                                                                             │
│ ═══════════════════════════════════════════════════════════════════════════ │
│ IMPACT ANALYSIS                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ The configuration changes between these jobs likely explain:            │ │
│ │ • +51% more claims investigated (4.1 → 6.2)                            │ │
│ │ • +7% higher average confidence (65% → 72%)                            │ │
│ │ • +100% cost increase ($0.92 → $1.84)                                  │ │
│ │                                                                         │ │
│ │ Key factors: Budget relaxation (iterations, soft enforcement)          │ │
│ │              LLM verdict validation catching inversions                │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ [Export Diff as JSON]  [Apply xyz-789 Config to Current]                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Unified Configuration Editor

**Route:** `/admin/quality/configure`

Single interface to edit ALL quality-influencing settings and prompts:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Quality Configuration Editor                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ QUICK PRESETS                                                           │ │
│ │                                                                         │ │
│ │ ○ Cost Optimized   - quick mode, strict budgets, haiku only, SR off    │ │
│ │ ● Quality Focus    - deep mode, soft budgets, tiered models, SR on     │ │
│ │ ○ Maximum Quality  - deep mode, no limits, sonnet for all, full LLM    │ │
│ │ ○ Custom           - manual configuration below                         │ │
│ │                                                                         │ │
│ │ [Apply Preset]  [Preview Changes]  [Simulate Impact]                   │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ ═══════════════════════════════════════════════════════════════════════════ │
│ ALL QUALITY SETTINGS                                          [Expand All] │
│ ═══════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│ ▼ PIPELINE SETTINGS                                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Analysis Mode        [deep ▼]              More claims investigated │   │
│   │ Max Iter/Scope       [5    ]               Evidence depth per claim │   │
│   │ Max Total Iter       [20   ]               Total research capacity  │   │
│   │ Max Tokens           [750000]              Token budget limit       │   │
│   │ Enforce Budgets      [○ Hard  ● Soft]      Strict vs flexible       │   │
│   │ Scope Dedup          [0.70 ]               Lower = more scopes      │   │
│   │ Model Knowledge      [✓]                   Use LLM training data    │   │
│   │ Deterministic        [✓]                   Reproducible outputs     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ▼ MODEL SELECTION                                                           │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ LLM Tiering          [✓]                   Cost optimization        │   │
│   │ Model (Understand)   [claude-3-5-haiku ▼]  Cheaper for simple tasks │   │
│   │ Model (Extract)      [claude-3-5-haiku ▼]  Cheaper for extraction   │   │
│   │ Model (Verdict)      [claude-sonnet-4  ▼]  Best for final verdicts  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ▼ LLM TEXT ANALYSIS                                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Input Classification [✓ LLM ○ Heuristic]   Claim decomposition      │   │
│   │ Evidence Quality     [✓ LLM ○ Heuristic]   Evidence filtering       │   │
│   │ Scope Similarity     [✓ LLM ○ Heuristic]   Scope detection          │   │
│   │ Verdict Validation   [✓ LLM ○ Heuristic]   Inversion catching       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ▼ SEARCH SETTINGS                                                           │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Provider             [auto ▼]              Search provider          │   │
│   │ Max Results          [6    ]               Results per search       │   │
│   │ Date Restrict        [none ▼]              Recency filter           │   │
│   │ Domain Whitelist     [                  ]  Trusted domains only     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ▼ SOURCE RELIABILITY                                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Enabled              [✓]                   Enable source scoring    │   │
│   │ Multi-Model          [✓]                   Claude + OpenAI          │   │
│   │ OpenAI Model         [gpt-4o-mini ▼]       Refinement model         │   │
│   │ Confidence Threshold [0.80 ]               Acceptance strictness    │   │
│   │ Consensus Threshold  [0.20 ]               Max model disagreement   │   │
│   │ Default Score        [0.50 ]               Unknown source score     │   │
│   │ Filter Enabled       [✓]                   Skip low-value domains   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ▼ PROMPTS                                                                   │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ orchestrated           v2.8.3 (a1b2c3)    [Edit] [History] [Reseed]│   │
│   │ source-reliability     v2.8.3 (e5f6g7)    [Edit] [History] [Reseed]│   │
│   │ text-analysis-input    v1.1.0 (34309d)    [Edit] [History] [Reseed]│   │
│   │ text-analysis-evidence v1.2.0 (5f1b55)    [Edit] [History] [Reseed]│   │
│   │ text-analysis-scope    v1.2.0 (76a16a)    [Edit] [History] [Reseed]│   │
│   │ text-analysis-verdict  v1.2.0 (ea27d6)    [Edit] [History] [Reseed]│   │
│   │ monolithic-canonical   v2.8.3 (789abc)    [Edit] [History] [Reseed]│   │
│   │ monolithic-dynamic     v2.8.3 (def012)    [Edit] [History] [Reseed]│   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ═══════════════════════════════════════════════════════════════════════════ │
│ PENDING CHANGES: 3 settings modified                                        │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ • maxIterationsPerScope: 5 → 6                                         │ │
│ │ • consensusThreshold: 0.20 → 0.15                                      │ │
│ │ • text-analysis-evidence prompt updated                                │ │
│ │                                                                         │ │
│ │ Estimated Impact: +8% claims, +3% confidence, +15% cost               │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ [Discard Changes]  [Save as Draft]  [Apply Changes]                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Source Reliability Deep Dive

**Route:** `/admin/quality/source-reliability`

Detailed view of source reliability evaluations within the unified quality system:

#### SR Evaluation Viewer

View individual source reliability evaluations:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Source Reliability Evaluations                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Filter: [Job: abc-123 ▼] [Rating: All ▼] [Date: Last 7 days ▼]     │
│                                                                     │
│ ┌───────────────────────────────────────────────────────────────┐  │
│ │ Domain          │ Score │ Rating        │ Confidence │ Source │  │
│ │ ────────────────────────────────────────────────────────────── │  │
│ │ reuters.com     │ 0.92  │ highly_reliable │ 0.95    │ cached │  │
│ │ bbc.com         │ 0.88  │ highly_reliable │ 0.91    │ cached │  │
│ │ example-blog.xyz│ 0.35  │ leaning_unrelia │ 0.72    │ fresh  │  │
│ │ rt.com          │ 0.28  │ leaning_unrelia │ 0.88    │ cached │  │
│ └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ [Export CSV]  [Clear Cache for Selected]                            │
└─────────────────────────────────────────────────────────────────────┘
```

Click any row to see evaluation details:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Evaluation Details: example-blog.xyz                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ▼ Evaluation Result                                                 │
│   Score: 0.35 → Rating: leaning_unreliable                         │
│   Confidence: 0.72                                                  │
│   Source Type: platform_ugc                                         │
│   Caveats: ["Low domain authority", "No fact-check history"]       │
│                                                                     │
│ ▼ Model Responses                                                   │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │ Claude (Primary):                                           │  │
│   │   Score: 0.38, Confidence: 0.75                            │  │
│   │   Reasoning: "Unknown blog domain, no editorial standards" │  │
│   │                                                             │  │
│   │ GPT-4o-mini (Secondary):                                    │  │
│   │   Score: 0.32, Confidence: 0.70                            │  │
│   │   Reasoning: "Personal blog, unverified claims"            │  │
│   │                                                             │  │
│   │ Consensus: ✅ Passed (diff: 0.06 < threshold: 0.20)        │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ▼ Config Used                                                       │
│   Multi-Model: enabled                                              │
│   Confidence Threshold: 0.80                                        │
│   Consensus Threshold: 0.20                                         │
│   Prompt Hash: e5f6g7h8... (v2.8.3) [View Prompt]                  │
│                                                                     │
│ ▼ Evidence Cited                                                    │
│   - MBFC: Not listed                                                │
│   - NewsGuard: Not rated                                            │
│   - Wikipedia: No article                                           │
│   - Domain Age: 6 months                                            │
│                                                                     │
│ [Re-evaluate with Current Config]  [Override Score]                 │
└─────────────────────────────────────────────────────────────────────┘
```

#### 6.2 SR Quality Metrics Dashboard

**Route:** `/admin/source-reliability/metrics`

Track source reliability evaluation quality over time:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Source Reliability Quality Metrics                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Period: [Last 30 days ▼]  Config Version: [All ▼]                  │
│                                                                     │
│ ▼ Evaluation Statistics                                             │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │ Total Evaluations:     1,247                                │  │
│   │ Cache Hit Rate:        78%                                  │  │
│   │ Multi-Model Consensus: 94%                                  │  │
│   │ Low Confidence (<0.7): 12%                                  │  │
│   │ Insufficient Data:     8%                                   │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ▼ Rating Distribution                                               │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │ highly_reliable:     ████████████░░░░░░░░  32%             │  │
│   │ reliable:            ██████████░░░░░░░░░░  28%             │  │
│   │ leaning_reliable:    ████░░░░░░░░░░░░░░░░  12%             │  │
│   │ mixed:               ███░░░░░░░░░░░░░░░░░  10%             │  │
│   │ leaning_unreliable:  ██░░░░░░░░░░░░░░░░░░   8%             │  │
│   │ unreliable:          █░░░░░░░░░░░░░░░░░░░   5%             │  │
│   │ highly_unreliable:   █░░░░░░░░░░░░░░░░░░░   3%             │  │
│   │ insufficient_data:   █░░░░░░░░░░░░░░░░░░░   2%             │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ▼ Model Agreement Analysis                                          │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │ Avg Score Difference (Claude vs GPT): 0.08                  │  │
│   │ Consensus Failures: 47 (6%)                                 │  │
│   │ Most Disagreement: news aggregators, opinion blogs          │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ▼ Quality Alerts                                                    │
│   ⚠️ 12 domains scored >0.7 but have MBFC "questionable" rating   │
│   ⚠️ 5 state media sources scored above expected cap               │
│   ✅ No propaganda outlets scored above 0.14 cap                   │
│                                                                     │
│ [Export Report]  [Configure Alerts]                                 │
└─────────────────────────────────────────────────────────────────────┘
```

#### 6.3 SR Config Tuning

**Route:** `/admin/source-reliability/tuning`

Tune source reliability settings with quality feedback:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Source Reliability Tuning                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Current Configuration                          [Edit] [History]     │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Multi-Model:          enabled (Claude + GPT-4o-mini)           ││
│ │ Confidence Threshold: 0.80                                      ││
│ │ Consensus Threshold:  0.20                                      ││
│ │ Default Score:        0.50                                      ││
│ │ Filter Enabled:       yes (skipping blogspot, etc.)            ││
│ │ Prompt Version:       e5f6g7h8... (v2.8.3)                     ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ Impact Simulation                                                   │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Change confidence threshold to: [0.70    ]                     ││
│ │                                                                 ││
│ │ Simulated Impact (based on last 1000 evaluations):             ││
│ │   - Evaluations passing threshold: 78% → 89% (+11%)            ││
│ │   - Low-confidence now accepted: 112 sources                   ││
│ │   - Risk: May accept less certain evaluations                  ││
│ │                                                                 ││
│ │ [Apply Change]  [Preview Affected Sources]                     ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ Prompt Editor                                                       │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Current prompt defines:                                         ││
│ │   - 7 rating bands (0.00-1.00)                                 ││
│ │   - 4 source type caps                                          ││
│ │   - Evidence quality hierarchy                                  ││
│ │   - Classification criteria                                     ││
│ │                                                                 ││
│ │ [Edit Prompt]  [View Diff from Previous]  [Reseed from File]   ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ Test Evaluation                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Test domain: [reuters.com                    ]  [Evaluate]     ││
│ │                                                                 ││
│ │ Result: Score 0.92, Rating: highly_reliable, Confidence: 0.95 ││
│ │ [Compare with Cached]  [View Full Response]                    ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 6.4 SR Evaluation History per Domain

**Route:** `/admin/source-reliability/domain/[domain]`

Track how a specific domain's evaluation has changed:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Domain History: example-news.com                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Current Status                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Score: 0.68 → Rating: leaning_reliable                         ││
│ │ Last Evaluated: 2026-01-30 14:32                               ││
│ │ Cache Expires: 2026-04-30                                       ││
│ │ Times Used: 23 jobs                                             ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ Evaluation History                                                  │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Date       │ Score │ Rating          │ Config Hash │ Action    ││
│ │ ──────────────────────────────────────────────────────────────  ││
│ │ 2026-01-30 │ 0.68  │ leaning_reliable│ abc123...  │ [Compare] ││
│ │ 2026-01-15 │ 0.62  │ leaning_reliable│ def456...  │ [Compare] ││
│ │ 2025-12-20 │ 0.71  │ reliable        │ ghi789...  │ [Compare] ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ Score Change Analysis                                               │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ 2026-01-15 → 2026-01-30: +0.06                                 ││
│ │ Reason: Config change (consensus threshold 0.15 → 0.20)        ││
│ │                                                                 ││
│ │ 2025-12-20 → 2026-01-15: -0.09                                 ││
│ │ Reason: Prompt update added stricter editorial standards check ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ [Force Re-evaluate]  [Clear from Cache]  [Add to Watchlist]        │
└─────────────────────────────────────────────────────────────────────┘
```

### Tuning Workflow

#### Typical Quality Tuning Flow

```
1. Identify Issue
   └─→ Job abc-123 has unexpectedly low confidence scores

2. View Job Config
   └─→ /admin/jobs/abc-123/config
   └─→ Notice: enforceBudgets=true, maxIterations=3

3. Compare with Good Job
   └─→ /admin/config/compare?job1=abc-123&job2=xyz-good
   └─→ See diff: budget settings were stricter

4. Adjust Configuration
   └─→ /admin/config/tuning
   └─→ Apply "Quality Focus" preset

5. Verify Improvement
   └─→ Re-run similar analysis
   └─→ Compare results with original job
```

#### A/B Testing Configuration Changes

```
1. Create Test Configuration
   └─→ Save current config as "baseline"
   └─→ Modify settings for "experiment"

2. Run Parallel Jobs
   └─→ Same input, different configs
   └─→ Track via config snapshot

3. Compare Results
   └─→ /admin/config/compare?job1=baseline-job&job2=experiment-job
   └─→ Analyze quality/cost tradeoffs

4. Promote or Rollback
   └─→ If experiment wins, activate
   └─→ If not, rollback to baseline
```

### Unified Quality API

All quality management APIs are consolidated under `/api/admin/quality/`:

#### Get/Update Complete Configuration

```
GET /api/admin/quality/config
Authorization: Bearer <admin-token>

Response:
{
  "current": {
    "pipeline": { analysisMode: "deep", maxIterationsPerScope: 5, ... },
    "search": { provider: "auto", maxResults: 6, ... },
    "sourceReliability": { enabled: true, multiModel: true, ... },
    "prompts": {
      "orchestrated": { hash: "a1b2c3", version: "2.8.3" },
      "source-reliability": { hash: "e5f6g7", version: "2.8.3" },
      ...
    }
  },
  "metadata": {
    "lastModified": "2026-01-30T14:32:00Z",
    "modifiedBy": "admin@example.com",
    "jobsUsingCurrentConfig": 47
  }
}

PUT /api/admin/quality/config
Body:
{
  "pipeline": { ... },           // Partial updates supported
  "sourceReliability": { ... },
  "changeDescription": "Increased iteration limits for better coverage"
}
```

#### Get Job Quality Snapshot (All Settings + Prompts + Results)

```
GET /api/admin/quality/job/:jobId
Authorization: Bearer <admin-token>

Response:
{
  "job": {
    "id": "job-abc123",
    "input": "...",
    "analyzedAt": "2026-01-30T14:32:00Z",
    "duration": 263,  // seconds
    "cost": 1.84
  },
  "results": {
    "claimsFound": 8,
    "verdicts": 6,
    "avgConfidence": 0.72,
    "sourcesEvaluated": 12
  },
  "configSnapshot": {
    "infrastructure": { llmProvider: "anthropic", codeVersion: "2.8.3" },
    "pipeline": { ... },
    "search": { ... },
    "sourceReliability": { ... },
    "prompts": { ... }   // Full content available via expand=prompts
  },
  "srEvaluations": [
    { domain: "reuters.com", score: 0.92, rating: "highly_reliable", ... },
    ...
  ]
}
```

#### Compare Configurations (Holistic)

```
GET /api/admin/quality/compare?job1=abc&job2=xyz
GET /api/admin/quality/compare?job=abc&current=true
Authorization: Bearer <admin-token>

Response:
{
  "left": {
    "source": "job",
    "id": "abc",
    "date": "2026-01-28",
    "metrics": { claims: 4.1, confidence: 0.65 }
  },
  "right": {
    "source": "job",
    "id": "xyz",
    "date": "2026-01-30",
    "metrics": { claims: 6.2, confidence: 0.72 }
  },
  "differences": {
    "pipeline": [
      { path: "analysisMode", left: "quick", right: "deep", impact: "+claims" },
      { path: "maxIterationsPerScope", left: 3, right: 5, impact: "+evidence" }
    ],
    "sourceReliability": [
      { path: "consensusThreshold", left: 0.15, right: 0.20, impact: "+agreement" }
    ],
    "prompts": [
      { profile: "text-analysis-verdict", leftHash: "def456", rightHash: "ea27d6" }
    ]
  },
  "impactAnalysis": {
    "claimsChange": "+51%",
    "confidenceChange": "+7%",
    "costChange": "+100%",
    "keyFactors": ["Budget relaxation", "LLM verdict validation"]
  }
}
```

#### Configuration History (All Changes)

```
GET /api/admin/quality/history?limit=20
Authorization: Bearer <admin-token>

Response:
{
  "history": [
    {
      "timestamp": "2026-01-30T14:32:00Z",
      "changedBy": "admin@example.com",
      "changeType": "pipeline",
      "summary": "Enabled LLM verdict validation",
      "details": { "llmVerdictValidation": { from: false, to: true } },
      "jobsAffected": 47
    },
    {
      "timestamp": "2026-01-30T09:15:00Z",
      "changedBy": "admin@example.com",
      "changeType": "prompt",
      "summary": "Updated text-analysis-evidence prompt to v1.2.0",
      "details": { "profile": "text-analysis-evidence", "oldHash": "abc123", "newHash": "5f1b55" },
      "jobsAffected": 23
    },
    ...
  ]
}
```

#### Quality Metrics (Aggregated)

```
GET /api/admin/quality/metrics?days=30&groupBy=configVersion
Authorization: Bearer <admin-token>

Response:
{
  "period": { "start": "2026-01-01", "end": "2026-01-30" },
  "overall": {
    "totalJobs": 259,
    "avgClaims": 5.2,
    "avgConfidence": 0.68,
    "avgCost": 1.42,
    "srConsensusRate": 0.92
  },
  "byConfigVersion": [
    {
      "configHash": "current",
      "period": "2026-01-30",
      "jobs": 47,
      "metrics": { claims: 6.2, confidence: 0.72, cost: 1.84, srConsensus: 0.94 }
    },
    {
      "configHash": "abc123...",
      "period": "2026-01-28 - 2026-01-30",
      "jobs": 123,
      "metrics": { claims: 4.1, confidence: 0.65, cost: 0.92, srConsensus: 0.91 }
    }
  ],
  "alerts": [
    { "type": "improvement", "message": "Quality up 7% after latest config change" },
    { "type": "warning", "message": "Cost increased 100% - monitor budget" }
  ]
}
```

#### Simulate Impact of Changes

```
POST /api/admin/quality/simulate
Authorization: Bearer <admin-token>
Content-Type: application/json

Body:
{
  "proposedChanges": {
    "pipeline": { "maxIterationsPerScope": 6 },
    "sourceReliability": { "confidenceThreshold": 0.70 }
  },
  "sampleSize": 100  // Recent jobs to analyze
}

Response:
{
  "currentConfig": { ... },
  "proposedConfig": { ... },
  "estimatedImpact": {
    "claims": { current: 6.2, projected: 6.8, change: "+10%" },
    "confidence": { current: 0.72, projected: 0.74, change: "+3%" },
    "cost": { current: 1.84, projected: 2.12, change: "+15%" },
    "srAcceptanceRate": { current: 0.78, projected: 0.89, change: "+14%" }
  },
  "riskAssessment": {
    "level": "low",
    "factors": [
      "Minor iteration increase - low risk",
      "SR threshold decrease may accept uncertain scores"
    ]
  },
  "recommendation": "Changes look safe. Consider monitoring first 10 jobs."
}
```

#### Apply Preset Configuration

```
POST /api/admin/quality/presets/apply
Authorization: Bearer <admin-token>
Content-Type: application/json

Body:
{
  "preset": "quality-focus",  // or "cost-optimized", "maximum-quality"
  "description": "Switching to quality focus preset"
}

Response:
{
  "success": true,
  "appliedPreset": "quality-focus",
  "changes": {
    "pipeline": { "analysisMode": "deep", "enforceBudgets": false, ... },
    "sourceReliability": { "multiModel": true, ... }
  },
  "previousConfig": { ... }  // For rollback
}
```

## Implementation Plan

### Phase 1: Infrastructure (Week 1)

#### 1.1 Create Config Type System

**File:** `apps/web/src/lib/config-types.ts`

```typescript
// Type definitions for all config blobs
export interface PipelineConfig { ... }
export interface SearchConfig { ... }
export interface SourceReliabilityConfig { ... }

// Schema validators using zod
export const pipelineConfigSchema = z.object({ ... });
export const searchConfigSchema = z.object({ ... });
export const sourceReliabilityConfigSchema = z.object({ ... });
```

#### 1.2 Extend Config Storage

**File:** `apps/web/src/lib/config-storage.ts`

```typescript
// Add new config types
export const VALID_CONFIG_TYPES = ["prompt", "pipeline-config", "search-config", "sr-config"] as const;

// Generic getter with env fallback
export async function getConfig<T>(type: string, profile: string): Promise<T> {
  const blob = await getConfigBlob(type, profile);
  if (blob?.content) {
    return JSON.parse(blob.content) as T;
  }
  return getDefaultsFromEnv(type, profile) as T;
}
```

#### 1.3 Create Migration Script

**File:** `apps/web/scripts/migrate-env-to-db.ts`

Script to seed initial config values from current `.env.local` into database.

### Phase 2: Admin UI (Week 2)

#### 2.1 Config Editor Components

**Files:**
- `apps/web/src/components/admin/PipelineConfigEditor.tsx`
- `apps/web/src/components/admin/SearchConfigEditor.tsx`
- `apps/web/src/components/admin/SourceReliabilityConfigEditor.tsx`

Features:
- Form-based editing with validation
- Default value indicators
- Diff view before saving
- Rollback capability

#### 2.2 Admin Routes

**Files:**
- `apps/web/src/app/admin/config/pipeline/page.tsx`
- `apps/web/src/app/admin/config/search/page.tsx`
- `apps/web/src/app/admin/config/source-reliability/page.tsx`

Navigation structure:
```
/admin
├── /quality                      (NEW - Unified Quality Management)
│   ├── /                         Dashboard with current profile & metrics
│   ├── /configure                All settings & prompts in one editor
│   ├── /job/[id]                 Complete config snapshot for any job
│   ├── /compare                  Holistic config comparison
│   ├── /history                  All config changes over time
│   ├── /source-reliability       SR evaluations, metrics, domain history
│   └── /simulate                 Impact simulation for proposed changes
│
├── /config                       (Simplified - redirects to /quality/configure)
│   └── /prompts                  (existing - direct prompt editing)
│
└── /jobs
    └── /[id]
        └── /quality              (link to /admin/quality/job/[id])
```

### Phase 3: Integration (Week 3)

#### 3.1 Update Analyzer to Use Config Blobs

**File:** `apps/web/src/lib/analyzer/analyzer.ts`

```typescript
// Before (env vars at module init)
const analysisMode = process.env.FH_ANALYSIS_MODE || "deep";

// After (hot-reloadable)
async function runAnalysis(...) {
  const config = await getConfig<PipelineConfig>("pipeline-config", "default");
  const analysisMode = config.analysisMode;
  // ...
}
```

#### 3.2 Update Text Analysis Service

**File:** `apps/web/src/lib/analyzer/text-analysis-service.ts`

```typescript
// Before (env vars at module init)
const FEATURE_FLAGS = {
  inputClassification: process.env.FH_LLM_INPUT_CLASSIFICATION !== "false",
  // ...
};

// After (hot-reloadable)
async function getFeatureFlags(): Promise<FeatureFlags> {
  const config = await getConfig<PipelineConfig>("pipeline-config", "default");
  return {
    inputClassification: config.llmInputClassification,
    // ...
  };
}
```

#### 3.3 Update Search Service

**File:** `apps/web/src/lib/search/search-service.ts`

Similar pattern - load config per request instead of at module init.

### Phase 4: Analysis Audit System (Week 4)

#### 4.1 Config Snapshot Infrastructure

**File:** `apps/web/src/lib/config-snapshot.ts`

```typescript
export interface JobConfigSnapshot { ... }

export async function captureConfigSnapshot(jobId: string): Promise<JobConfigSnapshot> {
  // Capture all three tiers at job start
}

export async function getConfigSnapshot(jobId: string): Promise<JobConfigSnapshot | null> {
  // Retrieve snapshot for a job
}

export async function compareSnapshots(
  snapshot1: JobConfigSnapshot,
  snapshot2: JobConfigSnapshot
): Promise<ConfigDiff> {
  // Generate detailed diff
}
```

#### 4.2 Database Schema

**Migration:** `add_job_config_snapshots_table`

```sql
CREATE TABLE job_config_snapshots (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Tier 1 (reference only)
  infrastructure_json TEXT NOT NULL,

  -- Tier 2 (full configs)
  pipeline_config_json TEXT NOT NULL,
  search_config_json TEXT NOT NULL,
  sr_config_json TEXT NOT NULL,

  -- Tier 3 (prompt hashes)
  prompt_hashes_json TEXT NOT NULL,

  -- Metadata
  code_version TEXT NOT NULL,

  UNIQUE(job_id)
);

CREATE INDEX idx_snapshots_job_id ON job_config_snapshots(job_id);
CREATE INDEX idx_snapshots_captured_at ON job_config_snapshots(captured_at);
```

#### 4.3 Integration with Analyzer

**File:** `apps/web/src/lib/analyzer/analyzer.ts`

```typescript
async function runAnalysis(jobId: string, input: string, ...) {
  // Capture config snapshot at job start
  const snapshot = await captureConfigSnapshot(jobId);

  // Use snapshotted config for entire job (ensures consistency)
  const config = snapshot.pipelineConfig;

  // ... rest of analysis
}
```

#### 4.4 Unified Quality Management UI

**Pages:**
- `apps/web/src/app/admin/quality/page.tsx` - Dashboard
- `apps/web/src/app/admin/quality/configure/page.tsx` - Unified config editor
- `apps/web/src/app/admin/quality/job/[id]/page.tsx` - Job audit view
- `apps/web/src/app/admin/quality/compare/page.tsx` - Holistic comparison
- `apps/web/src/app/admin/quality/history/page.tsx` - Config change timeline
- `apps/web/src/app/admin/quality/source-reliability/page.tsx` - SR deep dive
- `apps/web/src/app/admin/quality/simulate/page.tsx` - Impact simulation

**Components:**
- `apps/web/src/components/admin/quality/QualityDashboard.tsx` - Dashboard widget
- `apps/web/src/components/admin/quality/UnifiedConfigEditor.tsx` - All settings editor
- `apps/web/src/components/admin/quality/JobAuditView.tsx` - Job config snapshot
- `apps/web/src/components/admin/quality/ConfigComparison.tsx` - Holistic diff
- `apps/web/src/components/admin/quality/ConfigHistoryTimeline.tsx` - Change history
- `apps/web/src/components/admin/quality/QualityMetricsChart.tsx` - Metrics visualization
- `apps/web/src/components/admin/quality/ImpactSimulator.tsx` - Change impact preview
- `apps/web/src/components/admin/quality/PromptEditor.tsx` - Inline prompt editing
- `apps/web/src/components/admin/quality/SREvaluationList.tsx` - SR evaluations
- `apps/web/src/components/admin/quality/SRDomainHistory.tsx` - Domain tracking

#### 4.5 Unified Quality API Routes

**Files:**
- `apps/web/src/app/api/admin/quality/config/route.ts` - Get/update all configs
- `apps/web/src/app/api/admin/quality/job/[id]/route.ts` - Get job snapshot
- `apps/web/src/app/api/admin/quality/compare/route.ts` - Compare configs
- `apps/web/src/app/api/admin/quality/history/route.ts` - Config history
- `apps/web/src/app/api/admin/quality/metrics/route.ts` - Quality metrics
- `apps/web/src/app/api/admin/quality/simulate/route.ts` - Impact simulation
- `apps/web/src/app/api/admin/quality/sr/evaluations/route.ts` - SR evaluations
- `apps/web/src/app/api/admin/quality/sr/domain/[domain]/route.ts` - Domain history
- `apps/web/src/app/api/admin/quality/presets/route.ts` - Config presets

#### 4.8 SR Evaluation Logging

**File:** `apps/web/src/lib/source-reliability-logger.ts`

Log detailed evaluation data for audit purposes:

```typescript
interface SREvaluationLog {
  domain: string;
  url: string;
  jobId: string;

  // Results
  finalScore: number;
  finalRating: string;
  confidence: number;

  // Model responses
  claudeResponse: { score: number; confidence: number; reasoning: string };
  openaiResponse?: { score: number; confidence: number; reasoning: string };
  consensusPassed: boolean;

  // Config snapshot
  configHash: string;
  promptHash: string;

  // Metadata
  evaluatedAt: Date;
  fromCache: boolean;
  processingTimeMs: number;
}

export async function logSREvaluation(log: SREvaluationLog): Promise<void>;
export async function getSREvaluationsForJob(jobId: string): Promise<SREvaluationLog[]>;
export async function getSREvaluationHistory(domain: string): Promise<SREvaluationLog[]>;
```

### Phase 5: Documentation & Cleanup (Week 5)

#### 5.1 Update .env.example

Add clear section markers:

```bash
# =============================================================================
# TIER 1: INFRASTRUCTURE (Environment Variables - Restart Required)
# =============================================================================
# These settings CANNOT be changed via Admin UI.
# They configure infrastructure, secrets, and deployment-specific values.

# =============================================================================
# TIER 2: OPERATIONAL (Defaults - Overridden by Admin UI)
# =============================================================================
# These settings provide DEFAULTS that can be overridden via Admin UI.
# Changes in Admin UI take effect immediately without restart.
# To change defaults for new deployments, edit these values.
```

#### 5.2 Create Admin Documentation

**File:** `Docs/GUIDES/Admin_Configuration.md`

- How to use Admin UI for configuration
- Explanation of each setting
- Impact on analysis quality/cost
- Rollback procedures

**File:** `Docs/GUIDES/Analysis_Audit.md`

- How to view job configuration snapshots
- Comparing configurations between jobs
- Using the tuning dashboard
- A/B testing configuration changes
- Troubleshooting with config history

## Migration Path

### For Existing Deployments

1. Deploy new code with config blob support
2. Run `migrate-env-to-db.ts` to seed current env values
3. Admin UI becomes available with current values
4. Env vars continue to work as fallbacks

### Backwards Compatibility

- All env vars remain supported as fallbacks
- If no config blob exists, env var value is used
- If env var is also unset, hardcoded default is used

```
Priority: Config Blob > Environment Variable > Hardcoded Default
```

## Reload Behavior Summary

| Tier | Storage | Reload | Admin UI | Use Case |
|------|---------|--------|----------|----------|
| 1 - Infrastructure | `.env` | Restart | ❌ | Secrets, URLs, paths |
| 2 - Operational | `config_blobs` (JSON) | Hot | ✅ | Tuning, toggles, budgets |
| 3 - Behavioral | `config_blobs` (Markdown) | Hot | ✅ | Prompts, evaluation criteria |

## Success Metrics

1. **Operator efficiency**: Time to change analysis settings reduced from ~5min (restart) to <30s
2. **Audit compliance**: All config changes tracked with timestamps and content hashes
3. **Testing velocity**: QA can test different configurations without deployment
4. **Incident response**: Can adjust budgets/thresholds in production without downtime
5. **Reproducibility**: Any job can be fully explained by its config snapshot
6. **Debugging speed**: Time to identify config-related issues reduced from hours to minutes
7. **Quality tuning**: Operators can measure impact of config changes on analysis metrics

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Config corruption | JSON schema validation, rollback capability |
| Performance impact | Cache config with short TTL (e.g., 60s) |
| Breaking changes | Backwards-compatible with env fallbacks |
| Operator confusion | Clear Admin UI with documentation |
| Snapshot storage growth | Compression, retention policy aligned with jobs |
| Snapshot capture overhead | Async capture, minimal impact on job start time |
| Stale comparison data | Always fetch fresh data, clear timestamps |

## Open Questions

1. Should config changes require approval workflow (like PRs)?
2. Should we support per-job config overrides (e.g., user requests "deep" analysis)?
3. How long to keep config history? (Currently: indefinite via content_hash)
4. Should config snapshots be compressed for storage efficiency?
5. Should we provide a "re-run with different config" feature directly from the audit UI?
6. Should there be alerts when config changes cause significant metric changes?

## Appendix A: Complete Setting Inventory

### Tier 1 Settings (16 total)

| Setting | Default | Description |
|---------|---------|-------------|
| `FH_API_BASE_URL` | `http://localhost:5000` | API server URL |
| `FH_ADMIN_KEY` | (required) | Admin authentication key |
| `FH_INTERNAL_RUNNER_KEY` | (required) | Runner authentication key |
| `LLM_PROVIDER` | `anthropic` | Primary LLM provider |
| `FH_LLM_FALLBACKS` | (none) | Fallback provider order |
| `ANTHROPIC_API_KEY` | (required) | Anthropic API key |
| `OPENAI_API_KEY` | (optional) | OpenAI API key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | (optional) | Google AI key |
| `MISTRAL_API_KEY` | (optional) | Mistral API key |
| `GOOGLE_CSE_API_KEY` | (optional) | Google CSE key |
| `GOOGLE_CSE_ID` | (optional) | Google CSE ID |
| `SERPAPI_API_KEY` | (optional) | SerpAPI key |
| `FH_RUNNER_MAX_CONCURRENCY` | `4` | Max concurrent jobs |
| `FH_DEBUG_LOG_PATH` | `./debug-analyzer.log` | Debug log path |
| `FH_SR_CACHE_PATH` | `./source-reliability.db` | SR cache path |
| `FH_DEBUG_LOG_FILE` | `true` | Enable file logging |

### Tier 2 Settings (22 total)

| Setting | Default | Config Blob |
|---------|---------|-------------|
| `FH_LLM_TIERING` | `on` | `pipeline-config` |
| `FH_MODEL_UNDERSTAND` | `claude-3-5-haiku-20241022` | `pipeline-config` |
| `FH_MODEL_EXTRACT_FACTS` | `claude-3-5-haiku-20241022` | `pipeline-config` |
| `FH_MODEL_VERDICT` | `claude-sonnet-4-20250514` | `pipeline-config` |
| `FH_LLM_INPUT_CLASSIFICATION` | `true` | `pipeline-config` |
| `FH_LLM_EVIDENCE_QUALITY` | `true` | `pipeline-config` |
| `FH_LLM_SCOPE_SIMILARITY` | `true` | `pipeline-config` |
| `FH_LLM_VERDICT_VALIDATION` | `true` | `pipeline-config` |
| `FH_ANALYSIS_MODE` | `deep` | `pipeline-config` |
| `FH_ALLOW_MODEL_KNOWLEDGE` | `true` | `pipeline-config` |
| `FH_DETERMINISTIC` | `true` | `pipeline-config` |
| `FH_SCOPE_DEDUP_THRESHOLD` | `0.70` | `pipeline-config` |
| `FH_MAX_ITERATIONS_PER_SCOPE` | `5` | `pipeline-config` |
| `FH_MAX_TOTAL_ITERATIONS` | `20` | `pipeline-config` |
| `FH_MAX_TOTAL_TOKENS` | `750000` | `pipeline-config` |
| `FH_ENFORCE_BUDGETS` | `false` | `pipeline-config` |
| `FH_SEARCH_PROVIDER` | `auto` | `search-config` |
| `FH_SEARCH_ENABLED` | `true` | `search-config` |
| `FH_SEARCH_MAX_RESULTS` | `6` | `search-config` |
| `FH_SEARCH_DATE_RESTRICT` | (none) | `search-config` |
| `FH_SEARCH_DOMAIN_WHITELIST` | (none) | `search-config` |
| `FH_SR_ENABLED` | `true` | `sr-config` |
| `FH_SR_MULTI_MODEL` | `true` | `sr-config` |
| `FH_SR_OPENAI_MODEL` | `gpt-4o-mini` | `sr-config` |
| `FH_SR_CONFIDENCE_THRESHOLD` | `0.8` | `sr-config` |
| `FH_SR_CONSENSUS_THRESHOLD` | `0.20` | `sr-config` |
| `FH_SR_DEFAULT_SCORE` | `0.5` | `sr-config` |
| `FH_SR_CACHE_TTL_DAYS` | `90` | `sr-config` |
| `FH_SR_FILTER_ENABLED` | `true` | `sr-config` |

### Tier 3 Settings (Prompts - 8 total)

| Profile | Type | Description |
|---------|------|-------------|
| `orchestrated` | `prompt` | Main pipeline prompt |
| `monolithic-canonical` | `prompt` | Single-call pipeline |
| `monolithic-dynamic` | `prompt` | Flexible output pipeline |
| `source-reliability` | `prompt` | Evaluation criteria |
| `text-analysis-input` | `prompt` | Input classification |
| `text-analysis-evidence` | `prompt` | Evidence quality |
| `text-analysis-scope` | `prompt` | Scope similarity |
| `text-analysis-verdict` | `prompt` | Verdict validation |

---

**Next Steps:**
1. Review and approve this plan
2. Create implementation tickets
3. Begin Phase 1 implementation

---

## Senior Architect Review

**Reviewer:** Claude Opus 4.5
**Review Date:** 2026-01-30
**Review Type:** Deep Architecture Analysis

---

### Executive Assessment

**Overall Rating:** ✅ APPROVED WITH RECOMMENDATIONS

This is a well-structured and comprehensive plan that addresses real operational pain points. The three-tier model is sound, the UI mockups are detailed, and the API design is thorough. However, the plan is **over-scoped for a v1 implementation** and contains some architectural decisions that need refinement.

**Key Strengths:**
1. Clear separation of concerns (Tier 1/2/3 model)
2. Excellent audit trail design via config snapshots
3. Comprehensive API design with impact simulation
4. Strong backwards compatibility story (env fallbacks)

**Key Concerns:**
1. 5-week implementation timeline is optimistic
2. Unified Quality Dashboard is feature-complete but may overwhelm operators
3. Missing cache invalidation strategy for hot-reloadable configs
4. No consideration of multi-tenant or multi-instance deployments

---

### Section-by-Section Analysis

#### 1. Current State Analysis (Lines 12-27)

**Assessment:** ✅ Accurate

The problem statement is accurate. The current scattered configuration approach does cause operator friction and lacks audit trails.

**Minor Correction:**
- Line 20: "~7 prompts" is now 8 prompts (added `monolithic-dynamic`)
- The count of ~45 env settings is accurate based on `.env.example`

---

#### 2. Three-Tier Model (Lines 29-66)

**Assessment:** ✅ Sound Architecture

The tier classification is correct and follows industry best practices:

| Tier | Classification Logic | Verdict |
|------|---------------------|---------|
| Tier 1 (Infrastructure) | Secrets, URLs, paths, process config | ✅ Correct |
| Tier 2 (Operational) | Tunable parameters, feature flags | ✅ Correct |
| Tier 3 (Behavioral) | LLM prompts, evaluation criteria | ✅ Correct |

**Recommendation 1: Add Tier 2 Sub-categories**

Tier 2 conflates different types of operational settings. Consider:
- **Tier 2a: Pipeline Config** - Analysis behavior
- **Tier 2b: Search Config** - External service config
- **Tier 2c: Source Reliability Config** - SR-specific tuning

This already exists implicitly in the config blob structure but isn't called out in the tier diagram.

---

#### 3. Detailed Setting Classification (Lines 69-201)

**Assessment:** ⚠️ Mostly Correct, Some Gaps

**Tier 1 Issues:**

| Setting | Current Classification | Recommendation |
|---------|----------------------|----------------|
| `FH_LLM_FALLBACKS` | Tier 1 | ✅ Correct (affects client initialization) |
| `FH_DEBUG_LOG_FILE` | Tier 1 | ⚠️ Could be Tier 2 (toggleable at runtime) |
| `FH_DEBUG_LOG_CLEAR_ON_START` | Tier 1 | ✅ Correct (startup behavior) |

**Tier 2 Issues:**

| Setting | Current Classification | Recommendation |
|---------|----------------------|----------------|
| `llmTiering` | Tier 2 | ⚠️ Actually Tier 1 (model client initialization) |
| `modelUnderstand/Extract/Verdict` | Tier 2 | ⚠️ Tier 1 if tiering affects client setup |

**Recommendation 2: Clarify Model Selection Tier**

Model selection needs careful analysis:
- If models are selected per-request via AI SDK: ✅ Tier 2 (hot-reloadable)
- If models require client pre-initialization: ❌ Tier 1 (restart required)

Current FactHarbor code uses AI SDK's `generateText()` with model selection per-call, so Tier 2 is correct. Document this assumption explicitly.

**Hardcoded Settings (Lines 188-201):**

**Assessment:** ✅ Excellent Judgment

The decision to keep Gate 1/4 thresholds and pattern lists hardcoded is correct. These are **quality contracts**, not tuning parameters. Changing them requires understanding validation logic and regression testing.

---

#### 4. Analysis Quality Management System (Lines 203-267)

**Assessment:** ✅ Well-Designed

The Quality-Influencing Settings Map is excellent for operator training. The impact annotations (+claims, +evidence, etc.) will help operators understand tradeoffs.

**Recommendation 3: Add Cost Impact Column**

The table at lines 230-252 shows quality impact but not cost impact. Add a third column:

| Setting | Quality Impact | Cost Impact |
|---------|---------------|-------------|
| `analysisMode: deep` | +claims | +50-100% |
| `maxIterationsPerScope: 5→10` | +evidence | +30-60% |
| `llmVerdictValidation: true` | +inversion catch | +$0.01/job |

This helps operators make informed cost/quality tradeoffs.

---

#### 5. Configuration Snapshotting (Lines 269-322)

**Assessment:** ✅ Critical Feature, Well-Designed

This is the **most valuable part of the plan**. The ability to see exactly what config produced a specific result is essential for debugging and compliance.

**Schema Review:**

```typescript
interface JobConfigSnapshot {
  // ...
  promptHashes: { ... };  // ✅ Good - just hashes, not full content
  codeVersion: string;    // ✅ Essential for reproducibility
}
```

**Recommendation 4: Add Schema Version Field**

The snapshot should include the schema version of the snapshot format itself:

```typescript
interface JobConfigSnapshot {
  schemaVersion: "1.0";  // ADD THIS
  // ...
}
```

This allows future migrations of the snapshot format without breaking old snapshots.

**Recommendation 5: Consider Prompt Content Option**

Storing only prompt hashes is space-efficient but requires the `config_blobs` table to have the corresponding version. Consider:
- Option A: Store hashes only (current plan) - requires blob retention policy
- Option B: Store full content - larger but self-contained
- Option C: Store hash + compressed delta from previous version

Recommend Option A with **explicit blob retention policy**: "Prompt blobs referenced by job snapshots MUST NOT be deleted until all referencing jobs are purged."

---

#### 6. Unified Quality Dashboard (Lines 316-364)

**Assessment:** ⚠️ Over-Engineered for v1

The mockup is comprehensive but may overwhelm operators. The dashboard tries to show:
- Current quality profile
- Active settings summary
- Quality metrics by config version
- Quick actions

**Recommendation 6: Simplify v1 Dashboard**

For v1, focus on:
1. Current config summary (3 cards)
2. Recent changes list
3. Link to full config editor

Defer quality metrics and comparison to v2. Reason: quality metrics require sufficient job history and statistical significance.

---

#### 7. Holistic Job Audit View (Lines 366-467)

**Assessment:** ✅ Excellent Design

This is the **second most valuable feature**. Being able to click any job and see its complete configuration is essential for debugging.

**Minor Enhancement:**
Add a "Copy Config" button to easily apply a job's config to current settings.

---

#### 8. Holistic Configuration Comparison (Lines 469-528)

**Assessment:** ✅ Well-Designed

The diff view with impact analysis is valuable. The example at lines 515-523 showing "+51% claims, +7% confidence, +100% cost" is exactly what operators need.

**Recommendation 7: Clarify Impact Analysis Methodology**

The plan doesn't specify how impact analysis is calculated. Options:
- Option A: Heuristic rules (e.g., "deep mode typically increases claims by 50%")
- Option B: Statistical analysis of historical job data
- Option C: Both with confidence indicators

Recommend Option C with clear labeling when estimates are heuristic vs. data-driven.

---

#### 9. Unified Configuration Editor (Lines 530-628)

**Assessment:** ⚠️ Complex but Necessary

The preset system (Cost Optimized, Quality Focus, Maximum Quality) is excellent for operator onboarding.

**Recommendation 8: Add Validation Warnings**

Before applying changes, validate for dangerous combinations:
- `enforceBudgets: true` + `maxIterationsPerScope: 2` = likely incomplete analysis
- `srEnabled: false` + analysis of unverified claims = no source scoring
- `llmVerdictValidation: false` + high-harm claims = no inversion protection

Show warnings, don't block changes.

---

#### 10. Source Reliability Deep Dive (Lines 630-846)

**Assessment:** ⚠️ Valuable but Deprioritize for v1

The SR evaluation viewer, metrics dashboard, and domain history are valuable features but represent significant implementation effort (~30% of total).

**Recommendation 9: Phase SR Features**

| Feature | Priority | Phase |
|---------|----------|-------|
| SR Evaluation List (view only) | High | v1 |
| SR Config in Unified Editor | High | v1 |
| SR Metrics Dashboard | Medium | v2 |
| SR Domain History | Low | v2 |
| SR Impact Simulation | Low | v2 |

The core value is visibility into evaluations and config, not the advanced analytics.

---

#### 11. Unified Quality API (Lines 893-1135)

**Assessment:** ✅ Well-Designed REST API

The API design follows RESTful conventions and provides comprehensive coverage.

**Recommendation 10: Add Rate Limiting**

The `/api/admin/quality/simulate` endpoint could be computationally expensive (analyzing 100+ jobs). Add:
- Rate limit: 10 simulations per minute per admin
- Queue system for large sample sizes
- Progress indicator for long-running simulations

**Recommendation 11: Add Webhook Support**

For enterprise deployments, add webhooks for config changes:

```typescript
POST /api/admin/quality/webhooks
{
  "url": "https://ops.example.com/config-change",
  "events": ["config.changed", "config.preset.applied"],
  "secret": "webhook-secret"
}
```

This enables integration with change management systems.

---

#### 12. Implementation Plan (Lines 1137-1411)

**Assessment:** ⚠️ Underestimated Timeline

The 5-week timeline is aggressive. Realistic estimates:

| Phase | Original | Revised | Reason |
|-------|----------|---------|--------|
| Phase 1: Infrastructure | 1 week | 1.5 weeks | Schema design needs iteration |
| Phase 2: Admin UI | 1 week | 2 weeks | UI complexity |
| Phase 3: Integration | 1 week | 1.5 weeks | Testing hot-reload edge cases |
| Phase 4: Audit System | 1 week | 2 weeks | Most complex feature |
| Phase 5: Documentation | 1 week | 0.5 weeks | Actually feasible |
| **Total** | **5 weeks** | **7.5 weeks** | |

**Recommendation 12: Implement in 3 Milestones**

**Milestone 1: Core Config Management (3 weeks)**
- Phase 1: Config type system + storage
- Phase 3 (partial): Integration with analyzer (read from DB)
- Basic Admin UI (edit configs, no comparison)

**Milestone 2: Audit & Comparison (3 weeks)**
- Phase 4: Config snapshots + job audit view
- Phase 2 (full): Comparison and history views
- API endpoints for audit

**Milestone 3: Advanced Features (2 weeks)**
- Impact simulation
- Quality metrics
- SR deep dive features

---

#### 13. Migration Path (Lines 1451-1468)

**Assessment:** ✅ Sound Strategy

The priority chain `Config Blob > Environment Variable > Hardcoded Default` is correct and ensures backwards compatibility.

**Recommendation 13: Add Migration Verification**

After running `migrate-env-to-db.ts`, add verification:

```bash
npm run verify-config-migration
```

This should:
1. Compare effective config (from DB) with env vars
2. Report any discrepancies
3. Confirm all settings are accessible via Admin UI

---

#### 14. Open Questions (Lines 1500-1508)

**Assessment:** Good Questions, Answers Provided

| Question | Recommendation |
|----------|----------------|
| 1. Approval workflow for config changes? | v2 - Not needed for single-operator POC |
| 2. Per-job config overrides? | v2 - Complexity not justified yet |
| 3. Config history retention? | Indefinite for prompts (hashed), 90 days for JSON configs |
| 4. Compress config snapshots? | No - 2-5KB is negligible, compression adds complexity |
| 5. Re-run with different config? | v2 - Useful but not critical |
| 6. Alerts on metric changes? | v2 - Requires metrics collection first |

---

### Critical Gap Analysis

#### Gap 1: Cache Invalidation Strategy

**Problem:** The plan mentions hot-reloading but doesn't specify how config changes propagate.

**Recommendation 14: Add Config Cache Layer**

```typescript
// apps/web/src/lib/config-cache.ts
const CONFIG_CACHE_TTL_MS = 60_000; // 1 minute

interface CachedConfig<T> {
  value: T;
  fetchedAt: number;
  hash: string;
}

export async function getCachedConfig<T>(
  type: string,
  profile: string
): Promise<T> {
  const cached = cache.get(cacheKey(type, profile));
  if (cached && Date.now() - cached.fetchedAt < CONFIG_CACHE_TTL_MS) {
    return cached.value;
  }
  const fresh = await fetchConfigFromDb(type, profile);
  cache.set(cacheKey(type, profile), {
    value: fresh,
    fetchedAt: Date.now(),
    hash: computeHash(fresh)
  });
  return fresh;
}

export function invalidateConfigCache(type?: string, profile?: string): void {
  // Called after Admin UI saves changes
  if (type && profile) {
    cache.delete(cacheKey(type, profile));
  } else {
    cache.clear();
  }
}
```

**Requirement:** Admin UI save handlers MUST call `invalidateConfigCache()` after successful save.

---

#### Gap 2: Concurrent Config Modification

**Problem:** Two admins editing the same config simultaneously could cause overwrites.

**Recommendation 15: Add Optimistic Locking**

```typescript
// PUT /api/admin/config/pipeline/default
{
  "content": { ... },
  "expectedHash": "abc123...",  // Hash of the version being edited
  "versionLabel": "..."
}

// Response if hash doesn't match current:
{
  "error": "Config was modified by another user",
  "currentHash": "def456...",
  "modifiedAt": "2026-01-30T15:00:00Z",
  "modifiedBy": "other-admin@example.com"
}
```

---

#### Gap 3: Multi-Instance Deployment

**Problem:** In production with multiple web instances, config changes on one instance won't propagate to others immediately.

**Recommendation 16: Document Cache Consistency**

For multi-instance deployments, document:
- Config changes take up to `CONFIG_CACHE_TTL_MS` to propagate
- For immediate propagation, consider Redis-backed cache with pub/sub
- For POC single-instance deployment, this is not a concern

---

#### Gap 4: Testing Hot-Reload Behavior

**Problem:** No test strategy for hot-reload behavior.

**Recommendation 17: Add Integration Tests**

```typescript
// apps/web/test/integration/config-hot-reload.test.ts
describe("Config Hot Reload", () => {
  test("analyzer uses updated config after save", async () => {
    // 1. Start analysis with maxIterations=3
    // 2. Mid-analysis, update config to maxIterations=10
    // 3. Verify next iteration uses new config
    // OR
    // 3. Verify current job completes with original config (snapshot behavior)
  });
});
```

**Design Decision Needed:** Should mid-flight jobs use snapshotted config or live config?

**Recommendation:** Snapshot at job start. A job should be reproducible by its snapshot.

---

### Security Review

#### Security Assessment: ✅ Adequate for POC

| Concern | Status | Notes |
|---------|--------|-------|
| Admin authentication | ✅ | Uses existing `FH_ADMIN_KEY` |
| Sensitive data exposure | ✅ | API keys not exposed in snapshots |
| SQL injection | ✅ | Uses parameterized queries |
| Config tampering | ⚠️ | No signing of config blobs |
| Audit log integrity | ⚠️ | Logs can be deleted by admin |

**Recommendation 18: Add Config Signing (v2)**

For compliance-sensitive deployments, consider signing config blobs:

```typescript
interface SignedConfigBlob {
  content: string;
  contentHash: string;
  signature: string;  // HMAC-SHA256 with server-side key
  signedAt: string;
}
```

This prevents tampering with historical configs.

---

### Performance Review

#### Performance Assessment: ✅ Acceptable

| Operation | Expected Latency | Concern |
|-----------|------------------|---------|
| Config fetch (cached) | <1ms | None |
| Config fetch (uncached) | <50ms | Acceptable |
| Config save | <100ms | None |
| Snapshot capture | <200ms | May add to job start time |
| Comparison (2 jobs) | <500ms | None |
| Simulation (100 jobs) | 5-10s | Needs progress indicator |

**Recommendation 19: Async Snapshot Capture**

Capture config snapshots asynchronously to not block job start:

```typescript
async function runAnalysis(jobId: string, input: string) {
  // Start snapshot capture in background
  const snapshotPromise = captureConfigSnapshot(jobId);

  // Begin analysis immediately
  const result = await performAnalysis(input);

  // Wait for snapshot before completing
  await snapshotPromise;

  return result;
}
```

---

### Final Recommendations Summary

| # | Recommendation | Priority | Effort |
|---|---------------|----------|--------|
| 1 | Add Tier 2 sub-categories to documentation | Low | 0.5h |
| 2 | Clarify model selection tier assumptions | Medium | 1h |
| 3 | Add cost impact column to settings map | Medium | 2h |
| 4 | Add schemaVersion to snapshot interface | High | 0.5h |
| 5 | Define blob retention policy for snapshots | High | 1h |
| 6 | Simplify v1 dashboard (defer metrics) | High | -10h saved |
| 7 | Clarify impact analysis methodology | Medium | 2h |
| 8 | Add validation warnings for dangerous combos | Medium | 4h |
| 9 | Phase SR features to v2 | High | -15h saved |
| 10 | Add rate limiting to simulation endpoint | Medium | 2h |
| 11 | Add webhook support for config changes | Low | 8h |
| 12 | Revise timeline to 3 milestones / 7.5 weeks | High | N/A |
| 13 | Add migration verification script | Medium | 4h |
| 14 | Add config cache layer with invalidation | High | 4h |
| 15 | Add optimistic locking for concurrent edits | Medium | 4h |
| 16 | Document multi-instance cache behavior | Medium | 1h |
| 17 | Add hot-reload integration tests | High | 8h |
| 18 | Add config signing (v2) | Low | 8h |
| 19 | Async snapshot capture | Medium | 2h |

**Net Effect:** Following recommendations 6 and 9 saves ~25h of implementation effort, offsetting the additional work from other recommendations.

---

### Approval Decision

**Status:** ✅ **APPROVED FOR IMPLEMENTATION**

**Conditions:**
1. Implement recommendations #4, #5, #6, #9, #12, #14, #17 before starting
2. Update timeline to reflect 3-milestone approach
3. Add cache invalidation strategy to Phase 1

**Not Required for Approval (Defer to v2):**
- Recommendations #10, #11, #18 (advanced features)
- SR deep dive features beyond basic evaluation list

---

**Reviewer Signature:**
Claude Opus 4.5
Senior Architect Review
2026-01-30
