# UCM Administrator Handbook

**Unified Configuration Management for FactHarbor**

**Version**: 2.10.1
**Last Updated**: February 2, 2026
**Audience**: System Administrators, DevOps Engineers, Quality Analysts
**Document Type**: Operational Handbook

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Core Concepts](#2-core-concepts)
3. [Configuration Architecture](#3-configuration-architecture)
4. [Configuration Types Deep Dive](#4-configuration-types-deep-dive)
5. [The Admin Dashboard](#5-the-admin-dashboard)
6. [Workflow: Analyzing Reports with Configuration Context](#6-workflow-analyzing-reports-with-configuration-context)
7. [Workflow: Optimizing Configurations](#7-workflow-optimizing-configurations)
8. [Workflow: Troubleshooting with Config Diff](#8-workflow-troubleshooting-with-config-diff)
9. [Configuration Effects Matrix](#9-configuration-effects-matrix)
10. [Best Practices](#10-best-practices)
11. [Quick Reference](#11-quick-reference)

---

## 1. Introduction

### 1.1 What is UCM?

The **Unified Configuration Management** (UCM) system provides centralized control over all FactHarbor analysis parameters. Instead of scattered environment variables and hardcoded values, UCM offers:

- **Single source of truth** for all configuration
- **Version history** with one-click rollback
- **Hot-reload** without service restart
- **Audit trail** linking every job to its exact configuration
- **Validation** preventing invalid configurations from being deployed

### 1.2 Why UCM Matters

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BEFORE UCM                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   .env file          Code defaults         Runtime overrides            │
│   ┌─────────┐        ┌─────────────┐       ┌──────────────┐             │
│   │FH_MODE= │   +    │ mode:"quick"│   +   │ if(special)  │  = ???      │
│   │FH_MAX=  │        │ max: 5      │       │   max = 10   │             │
│   └─────────┘        └─────────────┘       └──────────────┘             │
│                                                                          │
│   Problem: Which value was actually used? Nobody knows.                  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        WITH UCM                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Database Config ──► Environment Override ──► Final Config ──► Snapshot │
│   ┌─────────────┐    ┌─────────────────┐     ┌────────────┐   ┌───────┐ │
│   │ Versioned   │ +  │ Optional local  │  =  │ Resolved   │ → │ Saved │ │
│   │ Validated   │    │ overrides       │     │ Complete   │   │ w/Job │ │
│   └─────────────┘    └─────────────────┘     └────────────┘   └───────┘ │
│                                                                          │
│   Solution: Every job records exactly which config was used.             │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Document Conventions

| Symbol | Meaning |
|--------|---------|
| `[SCREENSHOT]` | Placeholder for real screenshot |
| `►` | Click/action indicator |
| `⚠️` | Warning or important note |
| `💡` | Tip or best practice |

---

## 2. Core Concepts

### 2.1 The Configuration Lifecycle

```
                    ┌──────────────────────────────────────────┐
                    │           CONFIGURATION LIFECYCLE         │
                    └──────────────────────────────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        │                               │                               │
        ▼                               ▼                               ▼
   ┌─────────┐                    ┌─────────┐                    ┌─────────┐
   │ CREATE  │                    │ ACTIVATE│                    │  USE    │
   │         │                    │         │                    │         │
   │ Draft   │───────────────────►│ Active  │───────────────────►│Snapshot │
   │ Version │                    │ Version │                    │ in Job  │
   └─────────┘                    └─────────┘                    └─────────┘
        │                               │                               │
        │                               │                               │
        ▼                               ▼                               ▼
   ┌─────────┐                    ┌─────────┐                    ┌─────────┐
   │Stored in│                    │Pointer  │                    │Complete │
   │config_  │                    │in config│                    │config   │
   │blobs    │                    │_active  │                    │recorded │
   └─────────┘                    └─────────┘                    └─────────┘
```

**Key Terms:**

| Term | Definition |
|------|------------|
| **Config Blob** | Immutable, content-addressed storage of configuration content |
| **Content Hash** | SHA-256 hash that uniquely identifies config content |
| **Active Pointer** | Reference to which blob is currently "live" |
| **Profile** | Named configuration set (usually "default") |
| **Snapshot** | Complete resolved config captured at job start |

### 2.2 Resolution Order

When FactHarbor needs a configuration value, it resolves in this order:

```
┌─────────────────────────────────────────────────────────────────┐
│                     RESOLUTION PRIORITY                          │
│                     (highest to lowest)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           │
   ┌─────────────────────┐                          │
   │ 1. ENVIRONMENT VAR  │  (infra-only)            │
   │    (if allowed)     │  does not affect analysis │
   └─────────────────────┘                          │
        │                                           │
        ▼                                           │
   ┌─────────────────────┐                          │
   │ 2. DATABASE CONFIG  │  Active version from    │
   │    (if exists)      │  config_active table    │
   └─────────────────────┘                          │
        │                                           │
        ▼                                           │
   ┌─────────────────────┐                          │
   │ 3. SCHEMA DEFAULT   │  DEFAULT_PIPELINE_      │
   │                     │  CONFIG values          │
   └─────────────────────┘                          │
```

**Override Policy** (configurable via `FH_CONFIG_OVERRIDE_POLICY`):
- `prefer_env` (default): Environment variables take precedence
- `prefer_db`: Database config takes precedence
- `env_only`: Ignore database entirely

### 2.3 Content Addressing

Every configuration version is identified by its **content hash** - a SHA-256 fingerprint of the canonicalized content.

```
┌────────────────────────────────────────────────────────────────────┐
│                    CONTENT ADDRESSING                               │
└────────────────────────────────────────────────────────────────────┘

   Original Config              Canonicalized              Content Hash
   ┌─────────────┐             ┌─────────────┐           ┌────────────┐
   │{            │             │{            │           │            │
   │  "mode":    │  ────────►  │  "mode":    │  ──SHA──► │ a7f3b2c1.. │
   │    "deep",  │  (sort      │    "deep",  │   256     │            │
   │  "max": 10  │   keys)     │  "max": 10  │           │ (64 chars) │
   │}            │             │}            │           │            │
   └─────────────┘             └─────────────┘           └────────────┘
                                     │
                                     │ Same content = Same hash
                                     │ (deduplication built-in)
                                     ▼
                            ┌─────────────────┐
                            │ If you upload   │
                            │ identical config│
                            │ it reuses the   │
                            │ existing blob   │
                            └─────────────────┘
```

**Benefits:**
- **Deduplication**: Identical configs share storage
- **Integrity**: Hash proves content wasn't modified
- **Traceability**: Job reports include hash for exact reproducibility

---

## 3. Configuration Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        UCM SYSTEM ARCHITECTURE                               │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌─────────────────┐         ┌─────────────────┐        ┌────────────────┐
     │   ADMIN UI      │         │   ANALYZER      │        │   JOB REPORT   │
     │  /admin/config  │         │  orchestrated.ts│        │   JSON output  │
     └────────┬────────┘         └────────┬────────┘        └───────┬────────┘
              │                           │                         │
              │ CRUD                      │ Load                    │ Reference
              │                           │                         │
              ▼                           ▼                         ▼
     ┌────────────────────────────────────────────────────────────────────────┐
     │                          CONFIG-LOADER                                  │
     │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
     │  │ loadPipelineConfig│  │ loadSearchConfig │  │ loadCalcConfig   │      │
     │  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
     │                                │                                        │
     │                    ┌───────────┴───────────┐                           │
     │                    ▼                       ▼                           │
     │           ┌────────────────┐      ┌────────────────┐                   │
     │           │ DB Lookup      │      │ ENV Override   │                   │
     │           │ (config_active)│      │ Resolution     │                   │
     │           └────────────────┘      └────────────────┘                   │
     └────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
     ┌────────────────────────────────────────────────────────────────────────┐
     │                           SQLite DATABASE                               │
     │                                                                         │
     │  ┌──────────────┐    ┌──────────────┐    ┌───────────────────────┐     │
     │  │ config_blobs │    │config_active │    │ job_config_snapshots  │     │
     │  │              │    │              │    │                       │     │
     │  │ content_hash │◄───│ active_hash  │    │ job_id                │     │
     │  │ content      │    │ config_type  │    │ pipeline_config (JSON)│     │
     │  │ version_label│    │ profile_key  │    │ search_config (JSON)  │     │
     │  │ created_utc  │    │ activated_utc│    │ captured_utc          │     │
     │  └──────────────┘    └──────────────┘    └───────────────────────┘     │
     │                                                                         │
     └────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Database Schema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE RELATIONSHIPS                               │
└─────────────────────────────────────────────────────────────────────────────┘

  config_blobs                    config_active                config_usage
  ┌─────────────────┐            ┌─────────────────┐          ┌─────────────┐
  │ content_hash PK │◄───────────│ active_hash FK  │          │ job_id      │
  │ config_type     │            │ config_type PK  │          │ config_type │
  │ profile_key     │            │ profile_key PK  │          │ content_hash│
  │ schema_version  │            │ activated_utc   │          │ used_utc    │
  │ version_label   │            │ activated_by    │          │ overrides   │
  │ content (JSON)  │            └─────────────────┘          └─────────────┘
  │ created_utc     │                    │
  │ created_by      │                    │ 1:1 per type/profile
  └─────────────────┘                    ▼
         │                        Only ONE active
         │                        version at a time
         │
         │ Many versions can exist
         ▼ (history preserved)
```

---

## 4. Configuration Types Deep Dive

### 4.1 Configuration Type Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONFIGURATION TYPE HIERARCHY                              │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   SYSTEM    │
                              │  BEHAVIOR   │
                              └──────┬──────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           │                         │                         │
           ▼                         ▼                         ▼
    ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
    │  PIPELINE   │          │   SEARCH    │          │ CALCULATION │
    │   CONFIG    │          │   CONFIG    │          │   CONFIG    │
    │             │          │             │          │             │
    │ HOW we      │          │ WHERE we    │          │ HOW we      │
    │ analyze     │          │ find info   │          │ score       │
    └─────────────┘          └─────────────┘          └─────────────┘
           │                         │                         │
           │                         │                         │
           ▼                         ▼                         ▼
    ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
    │ • LLM model │          │ • Provider  │          │ • Verdict   │
    │   selection │          │ • Max       │          │   bands     │
    │ • Analysis  │          │   results   │          │ • Weights   │
    │   mode      │          │ • Timeout   │          │ • Quality   │
    │ • Budgets   │          │ • Domains   │          │   gates     │
    └─────────────┘          └─────────────┘          └─────────────┘
           │
           │
           ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                         PROMPTS                                  │
    │                                                                  │
    │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
    │  │Orchestr.│  │Monolith.│  │  Text   │  │  Source │            │
    │  │ prompts │  │ prompts │  │Analysis │  │Reliabil.│            │
    │  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
    │                                                                  │
    │  LLM instructions that control reasoning and output format      │
    └─────────────────────────────────────────────────────────────────┘
```

### 4.2 Pipeline Config Fields

| Field | Type | Default | Effect on Analysis |
|-------|------|---------|-------------------|
| `llmTiering` | boolean | false | Use different models for different tasks (cost optimization) |
| `modelUnderstand` | string | claude-3-5-haiku | Model for claim understanding phase |
| `modelExtractEvidence` | string | claude-3-5-haiku | Model for evidence extraction |
| `modelVerdict` | string | claude-sonnet-4 | Model for final verdict generation |
| `analysisMode` | "quick"/"deep" | quick | Research depth and iteration limits |
| `allowModelKnowledge` | boolean | false | Allow LLM to use training data vs evidence-only |
| `deterministic` | boolean | true | Use temperature=0 for reproducibility |
| `maxIterationsPerContext` | integer | 5 | Research iterations per analysis context |
| `maxTotalIterations` | integer | 20 | Total iterations across all scopes |
| `maxTotalTokens` | integer | 750000 | Token budget for entire analysis |

### 4.3 Search Config Fields

| Field | Type | Default | Effect on Analysis |
|-------|------|---------|-------------------|
| `enabled` | boolean | true | Enable/disable web search entirely |
| `provider` | enum | auto | Search provider selection |
| `maxResults` | integer | 6 | Results per search query |
| `maxSourcesPerIteration` | integer | 4 | Sources fetched per research iteration |
| `timeoutMs` | integer | 12000 | Fetch timeout per source |
| `domainWhitelist` | array | [] | Restrict to trusted domains only |
| `domainBlacklist` | array | [] | Exclude specific domains |

### 4.4 Calculation Config Fields

| Field | Type | Default | Effect on Analysis |
|-------|------|---------|-------------------|
| `verdictBands` | object | 7-band | Score ranges for TRUE/MOSTLY_TRUE/etc |
| `aggregation.centralityWeights` | object | high:3/med:2/low:1 | Claim importance weighting |
| `qualityGates.gate4MinSourcesHigh` | integer | 3 | Sources required for high confidence |
| `deduplication.claimSimilarityThreshold` | float | 0.85 | Threshold for claim deduplication |

### 4.5 Source Reliability Config Fields

| Field | Type | Default | Effect on Analysis |
|-------|------|---------|-------------------|
| `enabled` | boolean | true | Enable source reliability scoring |
| `multiModel` | boolean | true | Use model consensus (Claude + OpenAI) |
| `evaluationSearch.autoMode` | enum | accumulate | Multi-provider diversity vs cost-optimized search |
| `evaluationSearch.maxResultsPerQuery` | integer | 5 | Evidence items per query |
| `confidenceRequirements` | object | multi-band | Minimum confidence thresholds per rating band |

---

## 5. The Admin Dashboard

### 5.1 Dashboard Layout Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FactHarbor Admin > Unified Configuration Management                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ [SCREENSHOT: Hash Search Bar]                                          │ │
│  │                                                                        │ │
│  │ 🔎 Search by Config Hash                                               │ │
│  │ ┌──────────────────────────────────────────────────┐ ┌────────┐       │ │
│  │ │ Enter full or partial hash (min 4 chars)...      │ │ Search │       │ │
│  │ └──────────────────────────────────────────────────┘ └────────┘       │ │
│  │                                                                        │ │
│  │ 📸 TO CAPTURE: Navigate to /admin/config, capture the search bar      │ │
│  │    area at the top of the page (approx 100px height)                  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ [SCREENSHOT: Active Config Dashboard]                                  │ │
│  │                                                                        │ │
│  │ 📊 Active Configurations Overview                                      │ │
│  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │ │
│  │ │ 🔍 Search    │ │ 🧮 Calc      │ │ ⚙️ Pipeline  │ │ 📝 Prompts   │   │ │
│  │ │   Config     │ │   Config     │ │   Config     │ │              │   │ │
│  │ │              │ │              │ │              │ │ default      │   │ │
│  │ │ default      │ │ default      │ │ default      │ │ v2.1.0       │   │ │
│  │ │ v1.0.0       │ │ v1.0.0       │ │ v1.0.0       │ │ Jan 30       │   │ │
│  │ │ Jan 28       │ │ Jan 28       │ │ Jan 30       │ │              │   │ │
│  │ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │ │
│  │                                                                        │ │
│  │ 📸 TO CAPTURE: Show the color-coded config cards grid                 │ │
│  │    Screenshot width: full page, height: ~250px                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Config Type Selector Tabs                                              │ │
│  │ ┌────────┬────────────┬──────────┬──────────┬────────┐                │ │
│  │ │ Search │ Calculation│ Prompt   │ Pipeline │   SR   │                │ │
│  │ └────────┴────────────┴──────────┴──────────┴────────┘                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Tab Functions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TAB NAVIGATION                                     │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │  ACTIVE  │     │   EDIT   │     │ HISTORY  │     │EFFECTIVE │
  │          │     │          │     │          │     │          │
  │ View     │     │ Modify   │     │ Compare  │     │ See      │
  │ current  │     │ and save │     │ versions │     │ resolved │
  │ config   │     │ changes  │     │ rollback │     │ config   │
  └──────────┘     └──────────┘     └──────────┘     └──────────┘
       │                │                │                │
       ▼                ▼                ▼                ▼
  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │• JSON    │     │• Form    │     │• Timeline│     │• DB +    │
  │  view    │     │  editor  │     │• Diff    │     │  ENV     │
  │• Default │     │• Save as │     │• Activate│     │  merged  │
  │  badges  │     │  draft   │     │  old ver │     │• Final   │
  │• Export  │     │• Validate│     │• Compare │     │  values  │
  └──────────┘     └──────────┘     └──────────┘     └──────────┘
```

### 5.3 Active Config View with Default Indicators

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [SCREENSHOT: Active Config with Default Indicator]                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Active   Edit   History   Effective                                        │
│  ━━━━━━                                                                     │
│                                                                              │
│  Pipeline Config (default)                      Version: v1.0.0             │
│  Hash: a7f3b2c1d8e9f0a1b2c3d4e5f6a7b8c9...      [View] [Edit] [Export]      │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ ✓ Using default configuration                                          │ │
│  │   ─────────────────────────────────────────────────────────────────    │ │
│  │   All values match schema defaults. No customizations applied.         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  -- OR --                                                                    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ ⚠️ 3 fields customized from defaults (12%)                             │ │
│  │   ─────────────────────────────────────────────────────────────────    │ │
│  │   ▶ Show customized fields (3)                                         │ │
│  │     • analysisMode                                                     │ │
│  │     • maxIterationsPerContext                                            │ │
│  │     • llmTiering                                                       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  📸 TO CAPTURE: Two screenshots needed:                                     │
│     1. Config with ALL defaults (green banner) - use fresh install          │
│     2. Config with customizations (yellow banner) - modify 3+ fields        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 History View with Diff Comparison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [SCREENSHOT: History Tab with Diff Selection]                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Active   Edit   History   Effective                                        │
│                   ━━━━━━━                                                   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Compare Versions: [Compare Selected] [Clear Selection]  2/2 selected   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ ☑ v1.2.0                                          ● ACTIVE             │ │
│  │   a7f3b2c1...  Created: Jan 30, 2026 2:30 PM     [View] [Activate]     │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │ ☑ v1.1.0                                                               │ │
│  │   b8c4d3e2...  Created: Jan 28, 2026 10:15 AM    [View] [Activate]     │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │ ☐ v1.0.0                                                               │ │
│  │   c9d5e4f3...  Created: Jan 25, 2026 9:00 AM     [View] [Activate]     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  📸 TO CAPTURE: Select two versions with checkboxes visible                 │
│     Steps: 1) Go to History tab  2) Check two versions  3) Screenshot       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.5 Diff View Display

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [SCREENSHOT: Diff Comparison Results]                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Comparison: v1.1.0 vs v1.2.0                                               │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ ▌analysisMode (modified)                                               │ │
│  │ │  - "quick"                                                           │ │
│  │ │  + "deep"                                                            │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │ ▌maxIterationsPerContext (modified)                                      │ │
│  │ │  - 5                                                                 │ │
│  │ │  + 8                                                                 │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │ ▌llmTiering (modified)                                                 │ │
│  │ │  - false                                                             │ │
│  │ │  + true                                                              │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Color Key:  ▌Green = Added   ▌Red = Removed   ▌Yellow = Modified          │
│                                                                              │
│  📸 TO CAPTURE: After clicking "Compare Selected", capture the diff view   │
│     Prepare by creating two versions with different field values            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Workflow: Analyzing Reports with Configuration Context

### 6.1 The Investigation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│           WORKFLOW: INVESTIGATING A JOB'S CONFIGURATION                     │
└─────────────────────────────────────────────────────────────────────────────┘

  START: You have a job report with unexpected results
                           │
                           ▼
            ┌──────────────────────────────┐
            │ 1. FIND THE CONFIG HASH      │
            │                              │
            │ Look in job report JSON for: │
            │ • pipelineConfigHash         │
            │ • searchConfigHash           │
            └──────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │ 2. SEARCH BY HASH            │
            │                              │
            │ Go to /admin/config          │
            │ Enter hash in search bar     │
            │ Press Enter                  │
            └──────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │ 3. VIEW EXACT CONFIG         │
            │                              │
            │ Click result to load         │
            │ See all field values         │
            │ Compare to defaults          │
            └──────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │ 4. UNDERSTAND IMPACT         │
            │                              │
            │ Was deep mode enabled?       │
            │ What were the budgets?       │
            │ Which models were used?      │
            └──────────────────────────────┘
                           │
                           ▼
                        END
```

### 6.2 Using Job Config Snapshots

Every analysis job captures a complete configuration snapshot. Access it at:

```
/admin/quality/job/{JOB_ID}
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [SCREENSHOT: Job Config Snapshot Viewer]                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Job Config Snapshot                                                         │
│  ━━━━━━━━━━━━━━━━━━━━                                                       │
│                                                                              │
│  Job ID: abc123-def456-...                                                  │
│  Captured: January 30, 2026 14:32:15 UTC                                    │
│  Analyzer Version: 2.10.0                                                    │
│                                                                              │
│  ┌─ Pipeline Configuration ────────────────────────────────────────────────┐│
│  │ {                                                                       ││
│  │   "llmTiering": true,                                                   ││
│  │   "analysisMode": "deep",                                               ││
│  │   "maxIterationsPerContext": 8,                                           ││
│  │   ...                                                                   ││
│  │ }                                                                       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─ Search Configuration ──────────────────────────────────────────────────┐│
│  │ {                                                                       ││
│  │   "enabled": true,                                                      ││
│  │   "maxResults": 6,                                                      ││
│  │   ...                                                                   ││
│  │ }                                                                       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  📸 TO CAPTURE: Navigate to /admin/quality/job/{any-job-id}                 │
│     Run an analysis first to generate a job with snapshot                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Cross-Referencing Report and Config

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CROSS-REFERENCE CHECKLIST                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  Report Observation              Config Field to Check
  ─────────────────────────────   ────────────────────────────────────────

  Analysis seems shallow          ► pipeline.analysisMode = "quick"?
                                  ► pipeline.maxIterationsPerContext too low? (legacy: maxIterationsPerScope)

  Few sources cited               ► search.enabled = false?
                                  ► search.maxResults too low?
                                  ► search.domainWhitelist too restrictive?

  Unexpected model behavior       ► pipeline.allowModelKnowledge = true?
                                  ► pipeline.deterministic = false?

  Different models than expected  ► pipeline.llmTiering = true?
                                  ► pipeline.modelUnderstand changed?

  Verdict seems off               ► calculation.verdictBands modified?
                                  ► calculation.aggregation weights changed?

  Analysis timed out              ► pipeline.maxTotalTokens too low?
                                  ► search.timeoutMs too low?
```

---

## 7. Workflow: Optimizing Configurations

### 7.1 Optimization Decision Tree

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     OPTIMIZATION DECISION TREE                               │
└─────────────────────────────────────────────────────────────────────────────┘

                            ┌───────────────────┐
                            │ What's the goal?  │
                            └─────────┬─────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
   ┌─────────────┐            ┌─────────────┐            ┌─────────────┐
   │ REDUCE COST │            │IMPROVE SPEED│            │ IMPROVE     │
   │             │            │             │            │ QUALITY     │
   └──────┬──────┘            └──────┬──────┘            └──────┬──────┘
          │                          │                          │
          ▼                          ▼                          ▼
   ┌─────────────┐            ┌─────────────┐            ┌─────────────┐
   │• Enable LLM │            │• Use "quick"│            │• Use "deep" │
   │  tiering    │            │  mode       │            │  mode       │
   │• Use Haiku  │            │• Lower max  │            │• Higher     │
   │  for more   │            │  iterations │            │  iterations │
   │  phases     │            │• Reduce     │            │• More       │
   │• Reduce max │            │  sources    │            │  sources    │
   │  tokens     │            │             │            │• Sonnet for │
   └─────────────┘            └─────────────┘            │  all phases │
                                                         └─────────────┘
```

### 7.2 A/B Testing Configurations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      A/B TESTING WORKFLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  STEP 1: Create Baseline Config
  ┌──────────────────────────────────────────────────┐
  │ Save current config with descriptive version    │
  │ Example: "v1.0.0-baseline"                      │
  └──────────────────────────────────────────────────┘
                           │
                           ▼
  STEP 2: Create Variant Config
  ┌──────────────────────────────────────────────────┐
  │ Modify ONE parameter only                       │
  │ Save as: "v1.1.0-test-deep-mode"                │
  └──────────────────────────────────────────────────┘
                           │
                           ▼
  STEP 3: Run Parallel Tests
  ┌──────────────────────────────────────────────────┐
  │ Run same claims with each config                │
  │ Record: cost, time, verdict accuracy            │
  └──────────────────────────────────────────────────┘
                           │
                           ▼
  STEP 4: Compare Results
  ┌──────────────────────────────────────────────────┐
  │ Use config diff to see exact changes            │
  │ Correlate with result differences               │
  └──────────────────────────────────────────────────┘
                           │
                           ▼
  STEP 5: Promote or Rollback
  ┌──────────────────────────────────────────────────┐
  │ If better: Activate variant                     │
  │ If worse: Keep baseline (history preserved)     │
  └──────────────────────────────────────────────────┘
```

### 7.3 Configuration Presets

**Cost-Optimized Preset:**
```json
{
  "llmTiering": true,
  "analysisMode": "quick",
  "modelUnderstand": "claude-3-5-haiku-20241022",
  "modelExtractEvidence": "claude-3-5-haiku-20241022",
  "modelVerdict": "claude-3-5-haiku-20241022",
  "maxIterationsPerContext": 3,
  "maxTotalIterations": 10
}
```

**Quality-Optimized Preset:**
```json
{
  "llmTiering": false,
  "analysisMode": "deep",
  "modelUnderstand": "claude-sonnet-4-20250514",
  "modelExtractEvidence": "claude-sonnet-4-20250514",
  "modelVerdict": "claude-sonnet-4-20250514",
  "maxIterationsPerContext": 8,
  "maxTotalIterations": 30
}
```

**Balanced Preset:**
```json
{
  "llmTiering": true,
  "analysisMode": "deep",
  "modelUnderstand": "claude-3-5-haiku-20241022",
  "modelExtractEvidence": "claude-3-5-haiku-20241022",
  "modelVerdict": "claude-sonnet-4-20250514",
  "maxIterationsPerContext": 5,
  "maxTotalIterations": 20
}
```

---

## 8. Workflow: Troubleshooting with Config Diff

### 8.1 When to Use Diff

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     WHEN TO USE CONFIG DIFF                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  SCENARIO                          ACTION
  ────────────────────────────────  ─────────────────────────────────────────

  "Analysis behaved differently     Compare config from old job snapshot
   yesterday vs today"              with current active config

  "After updating config, results   Compare previous version with current
   got worse"                       in History tab

  "Different team members get       Compare their profile configs
   different results"               (if using multiple profiles)

  "Want to understand what          Compare any version with schema
   was customized"                  defaults (use Default Indicator)
```

### 8.2 Diff Interpretation Guide

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DIFF INTERPRETATION                                      │
└─────────────────────────────────────────────────────────────────────────────┘

  Change Type        Visual              Meaning
  ──────────────     ─────────────────   ──────────────────────────────────

  ADDED              ▌ + "newField"      Field exists only in version 2
                        (green)          (new feature or restored default)

  REMOVED            ▌ - "oldField"      Field exists only in version 1
                        (red)            (feature disabled or reset)

  MODIFIED           ▌ - "quick"         Value changed between versions
                     ▌ + "deep"          Upper line = old, lower line = new
                        (yellow)

  NESTED CHANGE      ▌ aggregation.      Dot notation shows path
                       weights.high      to nested field that changed
```

### 8.3 Common Diff Patterns

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     COMMON DIFF PATTERNS                                     │
└─────────────────────────────────────────────────────────────────────────────┘

  Pattern: Mode Switch
  ┌─────────────────────────────────────────────┐
  │ analysisMode (modified)                     │
  │   - "quick"                                 │
  │   + "deep"                                  │
  │                                             │
  │ maxIterationsPerContext (modified)            │
  │   - 5                                       │
  │   + 8                                       │
  └─────────────────────────────────────────────┘
  ► Indicates: Full quality mode upgrade


  Pattern: Cost Optimization
  ┌─────────────────────────────────────────────┐
  │ llmTiering (modified)                       │
  │   - false                                   │
  │   + true                                    │
  │                                             │
  │ modelVerdict (modified)                     │
  │   - "claude-sonnet-4-20250514"              │
  │   + "claude-3-5-haiku-20241022"             │
  └─────────────────────────────────────────────┘
  ► Indicates: Cost reduction (may affect quality)


  Pattern: Search Tuning
  ┌─────────────────────────────────────────────┐
  │ maxResults (modified)                       │
  │   - 6                                       │
  │   + 10                                      │
  │                                             │
  │ domainWhitelist (modified)                  │
  │   - []                                      │
  │   + ["reuters.com", "bbc.com"]              │
  └─────────────────────────────────────────────┘
  ► Indicates: More sources, but restricted to trusted
```

---

## 9. Configuration Effects Matrix

### 9.1 Pipeline Config Effects

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PIPELINE CONFIG EFFECTS MATRIX                            │
└─────────────────────────────────────────────────────────────────────────────┘

  Setting                  Cost     Speed    Quality   Reproducibility
  ───────────────────────  ───────  ───────  ────────  ───────────────

  llmTiering: true         ⬇️ 40%   ━        ⬇️ ~5%    ━
  llmTiering: false        ⬆️ 40%   ━        ⬆️ ~5%    ━

  analysisMode: quick      ⬇️ 50%   ⬆️ 60%   ⬇️ 15%    ━
  analysisMode: deep       ⬆️ 50%   ⬇️ 60%   ⬆️ 15%    ━

  deterministic: true      ━        ━        ━         ⬆️ HIGH
  deterministic: false     ━        ━        ⬆️ ~3%    ⬇️ LOW

  allowModelKnowledge:     ━        ⬆️ 10%   ⬆️⬇️ ??   ━
    true                            (less    (depends)
                                    search)

  Higher iterations        ⬆️       ⬇️       ⬆️        ━
  Lower iterations         ⬇️       ⬆️       ⬇️        ━

  Legend: ⬆️ Increases  ⬇️ Decreases  ━ No significant effect
```

### 9.2 Search Config Effects

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SEARCH CONFIG EFFECTS MATRIX                              │
└─────────────────────────────────────────────────────────────────────────────┘

  Setting                  Cost     Speed    Quality   Coverage
  ───────────────────────  ───────  ───────  ────────  ──────────

  enabled: false           ⬇️ 30%   ⬆️ 50%   ⬇️ 40%    ⬇️ 100%

  maxResults: low (3)      ⬇️ 20%   ⬆️ 30%   ⬇️ 20%    ⬇️ LOW
  maxResults: high (10)    ⬆️ 20%   ⬇️ 30%   ⬆️ 20%    ⬆️ HIGH

  domainWhitelist used     ━        ━        ⬆️ ~10%   ⬇️ ~50%
                                             (quality)  (coverage)

  timeoutMs: low           ━        ⬆️       ⬇️ ~10%   ⬇️
  timeoutMs: high          ━        ⬇️       ⬆️ ~10%   ⬆️
```

### 9.3 Calculation Config Effects

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  CALCULATION CONFIG EFFECTS MATRIX                           │
└─────────────────────────────────────────────────────────────────────────────┘

  Setting                      Effect on Verdicts
  ────────────────────────     ──────────────────────────────────────────

  verdictBands narrowed        More verdicts in extreme categories
                               (TRUE/FALSE less common, middle more common)

  verdictBands widened         Fewer verdicts in middle categories
                               (More TRUE/FALSE, less MIXED)

  centralityWeights.high ↑     Central claims dominate verdict more

  gate4MinSourcesHigh ↑        Harder to achieve "high confidence"
                               More verdicts marked as UNVERIFIED

  deduplication threshold ↓    More claims considered unique
                               Longer reports, potentially redundant
```

---

## 10. Best Practices

### 10.1 Version Labeling Convention

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VERSION LABELING CONVENTION                               │
└─────────────────────────────────────────────────────────────────────────────┘

  Format: MAJOR.MINOR.PATCH[-suffix]

  Examples:
  ─────────────────────────────────────────────────────────────────────────
  1.0.0              Initial production config
  1.0.1              Bug fix (typo correction)
  1.1.0              New feature (added domain whitelist)
  1.2.0-test         Experimental version (not for production)
  2.0.0              Breaking change (incompatible with previous)
  2.0.0-rollback     Emergency rollback to known good state

  Rules:
  ─────────────────────────────────────────────────────────────────────────
  • MAJOR: Increment when fundamentally changing behavior
  • MINOR: Increment when adding/changing settings
  • PATCH: Increment for small adjustments
  • suffix: Use for testing, rollback, or special cases
```

### 10.2 Change Management Checklist

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CHANGE MANAGEMENT CHECKLIST                               │
└───────────────────────────────────���─────────────────────────────────────────┘

  Before Making Changes:
  ☐ Document the reason for the change
  ☐ Note the current active version label
  ☐ Export backup of current config (Export All button)
  ☐ Plan rollback criteria

  When Making Changes:
  ☐ Use descriptive version label
  ☐ Change only what's necessary (minimal diff)
  ☐ Validate before activating
  ☐ Consider saving as draft first

  After Activating:
  ☐ Run test analysis to verify behavior
  ☐ Monitor for unexpected results
  ☐ Document outcome in team notes
  ☐ Keep old version available (don't delete)
```

### 10.3 Emergency Rollback Procedure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EMERGENCY ROLLBACK PROCEDURE                              │
└─────────────────────────────────────────────────────────────────────────────┘

  TIME-CRITICAL: Complete in under 2 minutes

  1. Navigate to /admin/config
     │
     ▼
  2. Select affected config type (Pipeline/Search/etc)
     │
     ▼
  3. Go to "History" tab
     │
     ▼
  4. Find last known good version (look for "ACTIVE" marker on old version)
     │
     ▼
  5. Click "Activate" on that version
     │
     ▼
  6. Confirm activation
     │
     ▼
  7. DONE - Previous config is now active


  💡 TIP: Note your current "good" version labels weekly
          so you know exactly what to roll back to.
```

---

## 11. Quick Reference

### 11.1 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Search by hash | Focus search box, type, Enter |
| Save config | Ctrl+S (in edit mode) |
| Toggle diff checkbox | Click checkbox in History |

### 11.2 URL Quick Access

| Page | URL |
|------|-----|
| Config Admin | `/admin/config` |
| Job Snapshot | `/admin/quality/job/{JOB_ID}` |
| Main Admin | `/admin` |

### 11.3 API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/config/active-summary` | GET | Dashboard data |
| `/api/admin/config/export-all` | GET | Backup all configs |
| `/api/admin/config/diff?hash1=&hash2=` | GET | Compare versions |
| `/api/admin/config/default-comparison?type=&profile=` | GET | Check customizations |
| `/api/admin/config/search-hash?q=` | GET | Find by hash |

### 11.4 Configuration Defaults Quick Reference

**Pipeline Config:**
```
llmTiering: false          analysisMode: "quick"
modelVerdict: claude-sonnet maxIterations: 5/20
deterministic: true        allowModelKnowledge: false
```

**Search Config:**
```
enabled: true              provider: "auto"
maxResults: 6              timeout: 12000ms
```

---

## Appendix: Screenshot Capture Instructions

### Required Screenshots

| # | Screenshot Name | How to Generate |
|---|-----------------|-----------------|
| 1 | Hash Search Bar | Go to `/admin/config`, capture top 100px |
| 2 | Active Config Dashboard | Scroll to dashboard cards, capture full grid |
| 3 | Default Indicator (Green) | Reset to defaults, view Active tab |
| 4 | Default Indicator (Yellow) | Modify 3+ fields, view Active tab |
| 5 | History with Checkboxes | Go to History, check 2 versions |
| 6 | Diff View | Click "Compare Selected" after selecting 2 |
| 7 | Job Snapshot | Run analysis, navigate to `/admin/quality/job/{id}` |

### Preparing Demo Data

To create meaningful screenshots:

1. **Create Multiple Versions:**
   ```
   Version 1.0.0: Default config (no changes)
   Version 1.1.0: analysisMode="deep", maxIterations=8
   Version 1.2.0: Add llmTiering=true
   ```

2. **Run a Sample Analysis:**
   - Submit any claim for analysis
   - Note the job ID from the result
   - Use for Job Snapshot screenshot

3. **Create Searchable Hash:**
   - After saving configs, note one hash (e.g., "a7f3b2c1...")
   - Use first 8 characters for hash search demo

---

**Document Version**: 1.0
**Author**: FactHarbor Documentation Team
**Review Cycle**: Quarterly
**Next Review**: April 2026

