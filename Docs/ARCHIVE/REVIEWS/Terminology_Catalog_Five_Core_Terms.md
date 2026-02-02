# Terminology Catalog: Five Core Terms

> **Purpose**: Catalog of all descriptions, definitions, and uses of the five core terms in the codebase.
> **Status**: ✅ **REVIEWED** - See [Review Summary](#review-complete) for decisions.
> **Generated**: 2026-02-01
> **Reviewed**: 2026-02-01

---

## Table of Contents

1. [AnalysisContext (aka Context)](#1-analysiscontext-aka-context)
2. [EvidenceScope (aka Scope)](#2-evidencescope-aka-scope)
3. [ArticleFrame](#3-articleframe)
4. [KeyFactor](#4-keyfactor)
5. [Fact (aka Evidence, EvidenceItem, ExtractedFact)](#5-fact-aka-evidence-evidenceitem-extractedfact)

---

## 1. AnalysisContext (aka Context)

> **Review Status:** `[FIX]` Examples made generic per review feedback.

### 1.1 Canonical Definition (types.ts:129-179)

```typescript
/**
 * AnalysisContext: A bounded analytical frame requiring separate analysis.
 *
 * Formerly called "Proceeding".
 * This is a GENERIC interface that works across ALL domains (legal, scientific, regulatory, etc.)
 * Domain-specific details are stored in the flexible `metadata` object.
 *
 * Examples (generic):
 * - Legal: Different cases (Court A vs Court B proceedings)
 * - Scientific: Different methodologies (Full-cycle vs Partial-cycle analysis)
 * - Regulatory: Different jurisdictions (Region A standards vs Region B standards)
 * - Temporal: Different time periods (Study Year X vs Study Year Y)
 * - Geographic: Different regions (State A laws vs State B laws)
 *
 * Note: Shown in UI as "Contexts".
 * @see EvidenceScope for per-evidence source-defined scope metadata (different concept!)
 */
export interface AnalysisContext {
  id: string;                    // Stable ID (e.g., "CTX_COURT_A", "CTX_FULL_CYCLE")
  name: string;                  // Full name (e.g., "Court A Proceeding", "Full-Cycle Analysis")
  shortName: string;             // Short label (e.g., "Court A", "Full-Cycle")
  subject: string;               // What's being analyzed
  temporal: string;              // Time period or date
  status: "concluded" | "ongoing" | "pending" | "unknown";
  outcome: string;               // Result/conclusion/finding
  assessedStatement?: string;    // v2.6.39: What is being assessed in this context
  metadata: { ... };             // Flexible domain-specific metadata
}
```

### 1.2 Occurrences in Documentation (.md files)


| File                                   | Line    | Description/Usage                                                                                        |
| ---------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| AGENTS.md                              | 26      | Definition: "Top-level analytical frame requiring separate analysis"                                     |
| AGENTS.md                              | 28      | Rule: "NEVER use 'scope' when referring to AnalysisContext - always say 'context'"                       |
| Calculations.md                        | 71-79   | Section: "AnalysisContext (Bounded Analytical Frame)" with full description                              |
| Calculations.md                        | 87      | Lists AnalysisContext types                                                                              |
| Calculations.md                        | 101     | Interface definition                                                                                     |
| Calculations.md                        | 124-133 | Section: "EvidenceScope vs AnalysisContext" distinguishing the two                                       |
| Context_Detection_via_EvidenceScope.md | 20      | Definition: "Top-level bounded analytical frame requiring separate analysis"                             |
| Context_Detection_via_EvidenceScope.md | 30      | Problem: "Important distinct AnalysisContexts are sometimes missed"                                      |
| Context_Detection_via_EvidenceScope.md | 140-177 | How to extract AnalysisContext candidates from EvidenceScope patterns                                    |
| Scope_Definition_Guidelines.md         | 28      | Comparison table: AnalysisContext = "Bounded analytical frame"                                           |
| Scope_Definition_Guidelines.md         | 31-32   | Key distinction: AnalysisContext = "What DISTINCT FRAMES should we analyze SEPARATELY?"                  |
| Scope_Definition_Guidelines.md         | 190-243 | Extensive section on when to use AnalysisContext                                                         |
| TERMINOLOGY.md                         | 22      | Mapping table:`AnalysisContext` → `analysisContexts` → `distinctProceedings`                           |
| TERMINOLOGY.md                         | 49-59   | Level 3: "AnalysisContexts (Verdict Spaces)"                                                             |
| TERMINOLOGY.md                         | 79-119  | Section: "AnalysisContext (Top-Level Analytical Frame)" with interface                                   |
| TERMINOLOGY.md                         | 369-387 | Decision tree: "Should I create a new AnalysisContext?"                                                  |
| TERMINOLOGY.md                         | 391-407 | Decision tree: "Is this an EvidenceScope or AnalysisContext?"                                            |
| LLM_Schema_Mapping.md                  | 20      | Mapping:`AnalysisContext` → prompt term → JSON field                                                   |
| LLM_Schema_Mapping.md                  | 266-273 | Section: "AnalysisContext Bridges"                                                                       |
| LLM_Schema_Mapping.md                  | 334-340 | Error example: using "Scope" when meaning AnalysisContext                                                |

### 1.3 Occurrences in Source Code (.ts files)


| File            | Line      | Context                                                                                         |
| ----------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| types.ts        | 103-145   | Canonical definition and interface                                                              |
| types.ts        | 229-232   | `DistinctProceeding = AnalysisContext` (deprecated alias)                                       |
| types.ts        | 253-268   | `ContextAnswer` - verdict for a single AnalysisContext                                          |
| types.ts        | 307-313   | `analysisContexts: AnalysisContext[]` field                                                     |
| orchestrated.ts | 212-247   | SCOPE_REFINEMENT prompt: extensive AnalysisContext guidance                                     |
| orchestrated.ts | 2035-2037 | Comment: "AnalysisContext = A bounded analytical frame"                                         |
| orchestrated.ts | 2087      | Comment: "ContextAnswer: verdict for a single AnalysisContext"                                  |
| orchestrated.ts | 2152      | Comment: "analysisContext: string; // ArticleFrame (legacy field name, NOT an AnalysisContext)" |
| orchestrated.ts | 3021      | Comment: "Generic AnalysisContext schema (replaces legal-specific DISTINCT_PROCEEDING_SCHEMA)"  |
| orchestrated.ts | 3335-3360 | UNDERSTAND prompt: AnalysisContext detection guidance                                           |
| orchestrated.ts | 3756-3837 | Comparative claim AnalysisContext splitting logic                                               |
| orchestrated.ts | 4616-4619 | Claim must be tied to a single AnalysisContext via contextId                                    |
| orchestrated.ts | 4757-4778 | Function: detect multiple distinct AnalysisContexts                                             |
| config.ts       | 277-331   | Functions for AnalysisContext handling:`inferScopeTypeLabel`, `detectInstitutionCode`           |
| scopes.ts       | 204-206   | LLM prompt: "Detect distinct AnalysisContexts for:"                                             |
| scopes.ts       | 349-352   | Seed AnalysisContexts instruction                                                               |

### 1.4 Occurrences in Prompts (.prompt.md files)


| File                           | Line    | Usage                                                         |
| -------------------------------- | --------- | --------------------------------------------------------------- |
| monolithic-canonical.prompt.md | 22-42   | Terminology section with AnalysisContext definition           |
| monolithic-canonical.prompt.md | 511-588 | SCOPE_REFINEMENT section with AnalysisContext rules           |
| orchestrated.prompt.md         | 32-64   | SCOPE_REFINEMENT role with AnalysisContext guidance           |
| orchestrated.prompt.md         | 75-77   | UNDERSTAND terminology definitions                            |
| orchestrated-2.6.44.prompt.md  | 32-66   | Same as above, versioned prompt                               |
| orchestrated-compact.prompt.md | 32-51   | Compact version of AnalysisContext guidance                   |
| text-analysis-scope.prompt.md  | 21-26   | Definition and distinction from EvidenceScope                 |

### 1.5 Issues Found

> **Review Status:** `[DEFER]` - All issues below require backward-compatible aliases before renaming. Breaking changes deferred to future cleanup phase.

| Location                | Issue                            | Correct Usage                       | Status    |
| ----------------------- | -------------------------------- | ----------------------------------- | --------- |
| scopes.ts:26            | `DetectedScope` type name        | Should be `DetectedAnalysisContext` | `[DEFER]` |
| scopes.ts:83,165,230    | `detectScopes*()` function names | Should be `detectContexts*()`       | `[DEFER]` |
| config-schemas.ts       | `scopeDetection*` config keys    | Should be `contextDetection*`       | `[DEFER]` |
| orchestrated.ts:178-183 | `*ScopeAssignments` field names  | Should be `*ContextAssignments`     | `[DEFER]` |

---

## 2. EvidenceScope (aka Scope)

> **Review Status:** `[CORRECT]` - Usage is largely correct throughout the codebase.

### 2.1 Canonical Definition (types.ts:182-207)

```typescript
/**
 * EvidenceScope: Per-evidence source methodology metadata defined BY a source document
 *
 * This is DIFFERENT from AnalysisContext! EvidenceScope describes the methodology,
 * boundaries, geography, and timeframe that a SOURCE DOCUMENT used when producing
 * its evidence. It's attached to individual evidence items as `evidenceItem.evidenceScope`.
 *
 * Critical for comparing apples-to-apples:
 * Example: A study saying "Technology A efficiency is 40%" using full-cycle methodology
 * cannot be directly compared to a partial-cycle study (different calculation boundaries).
 *
 * @see AnalysisContext for top-level analysis contexts (different concept!)
 */
export interface EvidenceScope {
  name: string;           // Short label (e.g., "WTW", "TTW", "EU-LCA", "US jurisdiction")
  methodology?: string;   // Standard referenced (e.g., "ISO 14040", "EU RED II")
  boundaries?: string;    // What's included/excluded (e.g., "Primary energy to wheel")
  geographic?: string;    // Geographic scope OF THE SOURCE'S DATA
  temporal?: string;      // Time period OF THE SOURCE'S DATA
  sourceType?: SourceType; // NEW v2.8: Source type classification
}
```

### 2.2 Occurrences in Documentation (.md files)


| File                                   | Line    | Description/Usage                                                                                 |
| ---------------------------------------- | --------- | --------------------------------------------------------------------------------------------------- |
| AGENTS.md                              | 27      | Definition: "Per-evidence source metadata (methodology, temporal bounds, boundaries of evidence)" |
| AGENTS.md                              | 58      | "Used in EvidenceScope for source reliability calibration"                                        |
| Calculations.md                        | 75      | Note: "EvidenceScope is the*per-evidence* source methodology/boundaries"                          |
| Calculations.md                        | 121     | "Evidence extraction: Sources may define their own EvidenceScope via`evidenceScope`"              |
| Calculations.md                        | 124-133 | Section: "EvidenceScope vs AnalysisContext"                                                       |
| Context_Detection_via_EvidenceScope.md | 1-361   | Entire document about using EvidenceScope for context detection                                   |
| Context_Detection_via_EvidenceScope.md | 21      | Definition: "Per-Evidence source methodology metadata (boundaries)"                               |
| Context_Detection_via_EvidenceScope.md | 38-47   | "Principle-Based EvidenceScope Detection"                                                         |
| Context_Detection_via_EvidenceScope.md | 83-104  | Current EvidenceScope capture interface                                                           |
| Scope_Definition_Guidelines.md         | 27      | Table: "EvidenceScope = Source methodology metadata"                                              |
| Scope_Definition_Guidelines.md         | 31      | Key distinction: "EvidenceScope = 'What methodology/boundaries does THIS source use?'"            |
| Scope_Definition_Guidelines.md         | 48-138  | Extensive section on EvidenceScope usage with examples                                            |
| TERMINOLOGY.md                         | 23      | Mapping:`EvidenceScope` → `evidenceScope`                                                        |
| TERMINOLOGY.md                         | 62-77   | "Level 5: EvidenceScope (Source Methodology - NOT Currently Displayed)"                           |
| TERMINOLOGY.md                         | 123-179 | Section: "EvidenceScope (Per-Evidence Source Metadata)" with interface                            |
| TERMINOLOGY.md                         | 506-528 | "Example 2: EvidenceScope Extraction"                                                             |
| LLM_Schema_Mapping.md                  | 21      | Mapping:`EvidenceScope` → `evidenceScope`                                                        |
| LLM_Schema_Mapping.md                  | 23      | CRITICAL: "'Scope' refers to EvidenceScope (per-evidence metadata), NOT AnalysisContext"          |
| LLM_Schema_Mapping.md                  | 276-282 | Section: "EvidenceScope Bridges"                                                                  |
| Terminology_Migration_Plan_UPDATED.md  | 705-711 | EvidenceScope interface definition                                                                |
| Terminology_Migration_Plan_UPDATED.md  | 820-889 | "EvidenceScope Evolution" section                                                                 |

### 2.3 Occurrences in Source Code (.ts files)


| File            | Line      | Context                                                                              |
| ----------------- | ----------- | -------------------------------------------------------------------------------------- |
| types.ts        | 113-121   | Terminology comment distinguishing from AnalysisContext                              |
| types.ts        | 182-207   | Canonical interface definition                                                       |
| types.ts        | 212-226   | `SourceType` enum used in EvidenceScope                                              |
| types.ts        | 414-416   | `evidenceScope?: EvidenceScope` in evidence item                                     |
| types.ts        | 467-469   | Same as above                                                                        |
| index.ts        | 32-33     | Export: "EvidenceScope, SourceType - Evidence source methodology metadata"           |
| orchestrated.ts | 184       | String formatting: "EvidenceScope: ${esBits.join('; ')}"                             |
| orchestrated.ts | 217       | Terminology: "EvidenceScope: per-evidence-item source scope"                         |
| orchestrated.ts | 348       | Comment: "merge near-duplicate EvidenceScopes deterministically"                     |
| orchestrated.ts | 519-591   | EvidenceScope signal detection for context splitting                                 |
| orchestrated.ts | 2235      | Comment: "EvidenceScope: Captures the methodology/boundaries of the source document" |
| orchestrated.ts | 5805-5822 | EXTRACT_FACTS prompt: "EVIDENCE SCOPE EXTRACTION (per-evidence EvidenceScope)"       |
| orchestrated.ts | 6476-6514 | VERDICT prompt: EvidenceScope compatibility checking                                 |

### 2.4 Occurrences in Prompts (.prompt.md files)


| File                           | Line    | Usage                                                                       |
| -------------------------------- | --------- | ----------------------------------------------------------------------------- |
| monolithic-canonical.prompt.md | 27      | Definition: "Per-fact source methodology metadata"                          |
| monolithic-canonical.prompt.md | 239     | EXTRACT_FACTS: EvidenceScope capture guidance                               |
| monolithic-canonical.prompt.md | 265     | Incompatibility test: "YES -> Extract EvidenceScope"                        |
| monolithic-canonical.prompt.md | 337     | VERDICT: "EvidenceScope (or 'Scope'): Per-fact source methodology metadata" |
| monolithic-canonical.prompt.md | 392-395 | EvidenceScope compatibility checking                                        |
| monolithic-canonical.prompt.md | 517-538 | SCOPE_REFINEMENT: EvidenceScope pattern detection                           |
| orchestrated.prompt.md         | 37      | Definition in SCOPE_REFINEMENT                                              |
| orchestrated.prompt.md         | 406-408 | EXTRACT_FACTS: "EVIDENCE SCOPE EXTRACTION (per-evidence EvidenceScope)"     |
| orchestrated.prompt.md         | 455-458 | VERDICT: EvidenceScope alignment checks                                     |
| text-analysis-scope.prompt.md  | 26      | Clarification: "EvidenceScope = per-evidence source metadata"               |

### 2.5 Issues Found

| Location           | Issue                                  | Notes                                                    | Status      |
| ------------------ | -------------------------------------- | -------------------------------------------------------- | ----------- |
| (none significant) | EvidenceScope usage is largely correct | The term is used appropriately for per-evidence metadata | `[CORRECT]` |

---

## 3. ArticleFrame

> **Review Status:** `[DEFER]` - Known field name collision. Cannot rename without breaking changes.

### 3.1 Canonical Definition (types.ts:109-111)

```typescript
/**
 * "ArticleFrame"
 *   = Broader frame or topic of the input article.
 *   = Stored in `analysisContext` field (singular - legacy name, NOT an AnalysisContext!).
 */
```

### 3.2 Occurrences in Documentation (.md files)


| File                                 | Line    | Description/Usage                                                           |
| -------------------------------------- | --------- | ----------------------------------------------------------------------------- |
| TERMINOLOGY.md                       | 25      | Mapping:`ArticleFrame` → `analysisContext` (singular, legacy name)         |
| TERMINOLOGY.md                       | 35-47   | "Level 1: ArticleFrame (Optional Context)"                                  |
| TERMINOLOGY.md                       | 184-217 | Section: "ArticleFrame (Narrative Background)" with full explanation        |
| TERMINOLOGY.md                       | 212-217 | Warnings: "CRITICAL: This is NOT a 'context' in the AnalysisContext sense!" |
| TERMINOLOGY.md                       | 407     | Decision tree: If no separate verdicts needed → "ArticleFrame"             |
| TERMINOLOGY.md                       | 430     | Pitfall: "Conflating ArticleFrame with AnalysisContext"                     |
| Coding Agent Prompts.md              | 111     | "Make sure displayed labels...show label 'Frame' for ArticleFrame data"     |
| Coding Agent Prompts.md              | 136     | "We use ArticleFrame for article narrative/background framing"              |
| Prompt_Role_Descriptions_Revision.md | 8       | Definition: "Broader narrative or topic of the input article"               |
| Prompt_Role_Descriptions_Revision.md | 94      | "Identifies ArticleFrame if present"                                        |
| Prompt_Role_Descriptions_Revision.md | 98      | Output: "`analysisContext` (legacy field name storing **ArticleFrame**)"    |
| Prompt_Role_Descriptions_Revision.md | 240     | "Orchestrated: outputs...`analysisContext` (**ArticleFrame**, legacy name)" |
| LLM_Schema_Mapping.md                | 150-151 | Base prompts include ArticleFrame definition                                |

### 3.3 Occurrences in Source Code (.ts files)


| File                       | Line    | Context                                                                                                    |
| ---------------------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| types.ts                   | 109-111 | Terminology comment: ArticleFrame stored in`analysisContext` (singular)                                    |
| types.ts                   | 122     | Summary: "'ArticleFrame' = broader topic (stored in`analysisContext` singular - naming collision!)"        |
| types.ts                   | 317-321 | Field doc: "ArticleFrame: Broader frame or topic of the input article"                                     |
| orchestrated.ts            | 215     | Prompt terminology: "ArticleFrame: Broader frame or topic of the input article"                            |
| orchestrated.ts            | 2152    | Interface comment: "analysisContext: string; // ArticleFrame (legacy field name, NOT an AnalysisContext)"  |
| orchestrated.ts            | 3066    | Schema comment: "analysisContext: z.string(), // ArticleFrame (legacy field name, NOT an AnalysisContext)" |
| orchestrated.ts            | 3129    | Same schema comment                                                                                        |
| orchestrated.ts            | 3338    | UNDERSTAND prompt: "ArticleFrame: Broader frame or topic of the input article"                             |
| dynamic-plan-base.ts       | 11      | Terminology: "ArticleFrame: Broader frame or topic of the input article"                                   |
| dynamic-analysis-base.ts   | 11      | Same terminology                                                                                           |
| verdict-base.ts            | 26      | Same terminology                                                                                           |
| extract-facts-base.ts      | 27      | Same terminology                                                                                           |
| understand-base.ts         | 25      | Same terminology                                                                                           |
| orchestrated-understand.ts | 48      | Same terminology                                                                                           |
| scope-refinement-base.ts   | 20      | Same terminology                                                                                           |

### 3.4 Occurrences in Prompts (.prompt.md files)


| File                           | Line  | Usage                                                                                                        |
| -------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| monolithic-canonical.prompt.md | 28    | Definition: "Broader frame or topic of the input article"                                                    |
| monolithic-canonical.prompt.md | 30-32 | ArticleFrame guidance: "Do NOT create separate AnalysisContexts from framing"                                |
| monolithic-canonical.prompt.md | 211   | Output field: "`analysisContext`: the ArticleFrame" with NOTE about legacy naming                            |
| monolithic-canonical.prompt.md | 240   | EXTRACT_FACTS: ArticleFrame definition                                                                       |
| monolithic-canonical.prompt.md | 338   | VERDICT: ArticleFrame definition                                                                             |
| monolithic-canonical.prompt.md | 518   | SCOPE_REFINEMENT: ArticleFrame definition                                                                    |
| orchestrated.prompt.md         | 35    | "ArticleFrame: narrative/background framing of the article or input"                                         |
| orchestrated.prompt.md         | 75    | UNDERSTAND: ArticleFrame definition                                                                          |
| orchestrated.prompt.md         | 304   | Output: "`analysisContext`: the ArticleFrame...NOTE: despite the field name, this is NOT an AnalysisContext" |
| orchestrated-2.6.44.prompt.md  | 36-37 | Same as orchestrated.prompt.md                                                                               |

### 3.5 Issues Found

> **Review Status:** `[DEFER]` - Known legacy collision. Maintain backward compatibility; UI labels "Frame".

| Location            | Issue                                            | Notes                                                                     | Status    |
| ------------------- | ------------------------------------------------ | ------------------------------------------------------------------------- | --------- |
| types.ts field name | `analysisContext` (singular) stores ArticleFrame | Naming collision with AnalysisContext type. Well-documented but confusing | `[DEFER]` |
| General             | Field name vs type name collision                | Cannot rename without breaking changes                                    | `[DEFER]` |

---

## 4. KeyFactor

> **Review Status:** `[CORRECT]` - Usage is consistent and well-documented.

### 4.1 Canonical Definition (types.ts:234-242)

```typescript
export interface KeyFactor {
  factor: string;
  supports: "yes" | "no" | "neutral";
  explanation: string;
  isContested: boolean;
  contestedBy: string;
  contestationReason: string;
  factualBasis: "established" | "disputed" | "opinion" | "unknown";
}
```

### 4.2 Occurrences in Documentation (.md files)


| File                 | Line      | Description/Usage                                                                    |
| ---------------------- | ----------- | -------------------------------------------------------------------------------------- |
| AGENTS.md            | 180       | Mention: "KeyFactors aggregation"                                                    |
| README.md            | 42        | Link: "KeyFactors Design - KeyFactors implementation details"                        |
| README.md            | 79        | "KeyFactors: Emergent decomposition questions for complex analyses"                  |
| KeyFactors_Design.md | 1-397     | Entire document about KeyFactors design                                              |
| KeyFactors_Design.md | 11-13     | Core decisions about KeyFactors                                                      |
| KeyFactors_Design.md | 18-26     | "What is a KeyFactor?" - evaluation dimension, decomposition question                |
| KeyFactors_Design.md | 32-59     | KeyFactor vs Claim comparison                                                        |
| KeyFactors_Design.md | 178-197   | Mermaid diagram showing KeyFactor flow                                               |
| KeyFactors_Design.md | 207-261   | Decisions: "KeyFactors are Optional and Emergent", "Discovered During Understanding" |
| KeyFactors_Design.md | 277-288   | "KeyFactor Contestation Structure" with interface                                    |
| KeyFactors_Design.md | 317-343   | KeyFactors and Claims parent-child relationship                                      |
| KeyFactors_Design.md | 352-358   | Current implementation status                                                        |
| Overview.md          | 213       | "Discovers KeyFactors (optional decomposition questions)"                            |
| Overview.md          | 225-226   | "Aggregates claim verdicts into KeyFactor verdicts"                                  |
| Overview.md          | 518       | Implementation status: "KeyFactors implemented"                                      |
| Overview.md          | 534       | Completeness: "KeyFactors aggregation"                                               |
| Overview.md          | 590       | v2.6.33: "KeyFactors aggregation fixed"                                              |
| HISTORY.md           | 674       | "validateContestation() (orchestrated): KeyFactor-level validation"                  |
| HISTORY.md           | 878-883   | "KeyFactors Aggregation Fixed" with details                                          |
| HISTORY.md           | 1206-1217 | "KeyFactors Implementation (v2.6.18+)" section                                       |
| TERMINOLOGY.md       | 245-246   | "validateContestation(keyFactors: KeyFactor[])"                                      |

### 4.3 Occurrences in Source Code (.ts files)


| File            | Line      | Context                                                                                   |
| ----------------- | ----------- | ------------------------------------------------------------------------------------------- |
| types.ts        | 234-242   | Canonical interface definition                                                            |
| types.ts        | 266       | `keyFactors: KeyFactor[]` in ContextAnswer                                                |
| types.ts        | 350       | Comment: "KeyFactors discovered during understanding phase"                               |
| index.ts        | 34        | Export: "KeyFactor"                                                                       |
| config.ts       | 28-136    | `parseKeyFactorHints()` function and `keyFactorHints` config                              |
| aggregation.ts  | 46-72     | `ContestableKeyFactor` interface and `validateContestation()`                             |
| aggregation.ts  | 355-418   | `PrunableKeyFactor` interface and `pruneOpinionOnlyFactors()`                             |
| orchestrated.ts | 2069-2087 | `KeyFactor` interface definition (local copy)                                             |
| orchestrated.ts | 2097      | `keyFactors: KeyFactor[]` in ContextAnswer                                                |
| orchestrated.ts | 2184      | Comment: "KeyFactors discovered during understanding phase"                               |
| orchestrated.ts | 2288      | `keyFactorId?: string` - maps claim to KeyFactor                                          |
| orchestrated.ts | 2314      | `keyFactors: KeyFactor[]` in VerdictSummary                                               |
| orchestrated.ts | 3081      | Schema comment: "KeyFactors discovered during understanding phase (emergent, not forced)" |
| orchestrated.ts | 3880-3912 | UNDERSTAND prompt: KeyFactor generation guidance                                          |
| orchestrated.ts | 6166-6216 | Default KeyFactor definitions                                                             |
| orchestrated.ts | 6714      | VERDICT prompt: "keyFactors: provide 3 items max"                                         |
| orchestrated.ts | 7113-7520 | KeyFactor validation and pruning in multiScope verdict                                    |
| orchestrated.ts | 7990-8076 | KeyFactor validation and pruning in singleScope verdict                                   |
| orchestrated.ts | 8784-8871 | KeyFactor aggregation in aggregated verdict                                               |

### 4.4 Occurrences in Prompts (.prompt.md files)


| File                                        | Line    | Usage                                                      |
| --------------------------------------------- | --------- | ------------------------------------------------------------ |
| orchestrated.prompt.md                      | 277     | "KeyFactors are OPTIONAL and EMERGENT"                     |
| orchestrated.prompt.md                      | 309     | Output: "keyFactors: Array of KeyFactors (or empty array)" |
| orchestrated-2.6.44.prompt.md               | 263     | Same as above                                              |
| orchestrated-2.6.44.prompt.md               | 285     | Output: "keyFactors: Array of KeyFactors"                  |
| orchestrated-2.6.37-GoodBolsonaro.prompt.md | 277     | Same KeyFactor guidance                                    |
| orchestrated-understand.ts                  | 38-42   | KeyFactor hints injection                                  |
| orchestrated-understand.ts                  | 187-190 | "KeyFactors are OPTIONAL and EMERGENT"                     |

### 4.5 Issues Found

| Location           | Issue                         | Notes                                 | Status      |
| ------------------ | ----------------------------- | ------------------------------------- | ----------- |
| (none significant) | KeyFactor usage is consistent | Well-documented and consistently used | `[CORRECT]` |

---

## 5. Fact (aka Evidence, EvidenceItem, ExtractedFact)

> **Review Status:** `[DEFER]` - Migration in progress. Maintain backward compatibility for JSON fields.

### 5.1 Canonical Definition (types.ts:370-424)

```typescript
/**
 * EvidenceItem: An extracted statement from a source document.
 *
 * CRITICAL: This is NOT a verified fact. It is unverified material (statement,
 * statistic, quote, etc.) extracted from a source to be evaluated against claims.
 *
 * The name "EvidenceItem" clarifies this semantic distinction:
 * - "Evidence" = material to be evaluated (correct)
 * - "Fact" = verified truth (incorrect for this entity)
 *
 * IMPORTANT:
 * - The system verifies claims; it does not assume extracted items are true.
 * - JSON field names (like "fact") are kept for backward compatibility.
 *
 * @since v2.8 (Phase 2 of terminology migration)
 */
export interface EvidenceItem {
  id: string;
  /**
   * The extracted statement text (legacy field name: `fact`).
   * This represents an unverified evidence statement from a source.
   */
  fact: string;
  category: "legal_provision" | "evidence" | "direct_evidence" | "expert_quote" | "statistic" | "event" | "criticism";
  specificity: "high" | "medium";
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceExcerpt: string;
  contextId?: string;
  claimDirection?: "supports" | "contradicts" | "neutral";
  fromOppositeClaimSearch?: boolean;
  evidenceScope?: EvidenceScope;
  probativeValue?: "high" | "medium" | "low";
  extractionConfidence?: number;
}

/**
 * @deprecated Use `EvidenceItem` instead. The name "ExtractedFact" is misleading
 * because these are unverified evidence items, not verified facts.
 */
export interface ExtractedFact extends EvidenceItem { ... }
```

### 5.2 Terminology Evolution


| Era               | Type Name       | Field Name   | Status          |
| ------------------- | ----------------- | -------------- | ----------------- |
| Legacy (pre-v2.8) | `ExtractedFact` | `fact`       | Deprecated      |
| Current (v2.8+)   | `EvidenceItem`  | `fact`       | **Preferred**   |
| Future            | `EvidenceItem`  | `statement`? | Not yet planned |

**Key Issue**: The name "Fact" implies verified truth, but these are **unverified extracted evidence** to be evaluated. The prompts already use "Evidence" terminology correctly, but internal types and fields still use "Fact".

### 5.3 Occurrences in Documentation (.md files)


| File                                          | Line    | Description/Usage                                                                              |
| ----------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------ |
| AGENTS.md                                     | 33-35   | "EvidenceItem (formerly ExtractedFact)" - correct definition                                   |
| FactHarbor POC1 Architecture Analysis.md      | 8       | Terminology note: "Evidence" vs "ExtractedFact"                                                |
| Calculations.md                               | 173-188 | "Fact Categorization" section with ExtractedFact interface                                     |
| LLM_Schema_Mapping.md                         | 24      | Mapping:`ExtractedFact` → "Fact" → `facts`                                                   |
| LLM_Schema_Mapping.md                         | 128     | "Zod Validation: ExtractedFactSchema"                                                          |
| TERMINOLOGY.md                                | 145-146 | "Attached to evidence items (EvidenceItem, legacy name: ExtractedFact)"                        |
| Schema_Migration_Strategy.md                  | 54-94   | EvidenceItem interface evolution                                                               |
| Schema_Migration_Strategy.md                  | 454-479 | "ExtractedFact Alias" section                                                                  |
| Terminology_Audit_Fact_Entity.md              | 1-163   | **Entire document** about "Fact" terminology issues                                            |
| Terminology_Audit_Fact_Entity.md              | 11      | Problem: "`ExtractedFact` is the core type name...these are not verified facts"                |
| Terminology_Audit_Fact_Entity.md              | 50      | Issue: "`ExtractedFact.category` enum includes 'evidence'" (circular naming)                   |
| Terminology_Audit_Fact_Entity.md              | 97      | Migration: "ExtractedFact -> ExtractedEvidence (or Evidence)"                                  |
| Terminology_Audit_Evidence_Entity_Proposal.md | 43-53   | "`ExtractedFact` is the current 'evidence item' entity (despite the name)"                     |
| Terminology_Audit_Evidence_Entity_Proposal.md | 68-94   | "Why 'Fact' harms both model behavior and UI interpretation"                                   |
| Terminology_Migration_Compliance_Audit.md     | 12      | "Phase 0-2.5 of the Terminology Migration (ExtractedFact → EvidenceItem)"                     |
| Baseline_Quality_Measurements.md              | 63      | "The legacy category value 'evidence' is tautological when the entity is called`EvidenceItem`" |

### 5.4 Occurrences in Source Code (.ts files)


| File                        | Line      | Context                                                                        |
| ----------------------------- | ----------- | -------------------------------------------------------------------------------- |
| types.ts                    | 370-424   | `EvidenceItem` canonical interface (preferred)                                 |
| types.ts                    | 426-477   | `ExtractedFact` deprecated alias                                               |
| types.ts                    | 389       | Field:`fact: string` (legacy name, kept for backward compat)                   |
| types.ts                    | 392-393   | Category:`"evidence"` legacy, `"direct_evidence"` preferred                    |
| index.ts                    | 32-34     | Exports: EvidenceItem, EvidenceScope, SourceType, KeyFactor                    |
| orchestrated.ts             | 2208-2290 | `ExtractedFact` interface definition (local copy)                              |
| orchestrated.ts             | 2205      | `factsExtracted: number` field                                                 |
| orchestrated.ts             | 5805-5822 | EXTRACT_FACTS prompt: "EVIDENCE SCOPE EXTRACTION (per-evidence EvidenceScope)" |
| text-analysis-types.ts      | 97        | `EvidenceItemInput` interface                                                  |
| source-reliability.ts       | 273-277   | Local`EvidenceItem` interface                                                  |
| measure-evidence-quality.ts | 29-34     | Local`EvidenceItem` interface                                                  |

### 5.5 Occurrences in Prompts (.prompt.md files)


| File                           | Line    | Usage                                                                     |
| -------------------------------- | --------- | --------------------------------------------------------------------------- |
| orchestrated.prompt.md         | 37      | "EvidenceItem.evidenceScope, legacy name: ExtractedFact"                  |
| orchestrated-2.6.44.prompt.md  | 37      | Same as above                                                             |
| orchestrated-compact.prompt.md | 34      | "EvidenceScope = per-evidence source metadata (attached to EvidenceItem)" |
| monolithic-canonical.prompt.md | 233-265 | EXTRACT_FACTS phase - uses "Evidence" terminology                         |
| extract-facts-base.ts          | 5-77    | Base prompt - uses "Evidence" terminology correctly                       |

### 5.6 Issues Found

> **Review Status:** `[DEFER]` - Phased migration: (1) Internal usages → EvidenceItem, (2) UI labels → "Evidence", (3) JSON field `fact` kept for backward compat.

| Location             | Issue                           | Correct Usage                                                                | Status    |
| -------------------- | ------------------------------- | ---------------------------------------------------------------------------- | --------- |
| types.ts:389         | Field `fact: string`            | Should conceptually be `statement: string` (but keep `fact` for JSON compat) | `[DEFER]` |
| types.ts:392         | Category `"evidence"`           | Tautological - use `"direct_evidence"` instead                               | `[DEFER]` |
| orchestrated.ts:2208 | Local `ExtractedFact` interface | Should use imported `EvidenceItem`                                           | `[DEFER]` |
| JSON output          | Field name `facts[]`            | Semantic mismatch - these are evidence items, not facts                      | `[DEFER]` |
| Multiple test files  | Use `ExtractedFact` type        | Should migrate to `EvidenceItem`                                             | `[DEFER]` |

### 5.7 Migration Status


| Phase     | Description                                               | Status               |
| ----------- | ----------------------------------------------------------- | ---------------------- |
| Phase 0   | Add EvidenceItem type, keep ExtractedFact alias           | ✅ Complete          |
| Phase 1   | Prompts use "Evidence" terminology                        | ✅ Complete          |
| Phase 2   | Add probativeValue, sourceType to EvidenceItem            | ✅ Complete          |
| Phase 2.1 | File-by-file migration from ExtractedFact to EvidenceItem | 🔄 In Progress       |
| Phase 3   | Remove deprecated ExtractedFact alias                     | ⏳ Future            |
| Phase 4   | Rename JSON field`fact` to `statement`                    | ⏳ Future (breaking) |

---

## Summary: Terminology Confusion Matrix

| Term                  | Correct Usage                  | Common Misuse                            | Files Affected                                | Status      |
| --------------------- | ------------------------------ | ---------------------------------------- | --------------------------------------------- | ----------- |
| **AnalysisContext**   | Top-level analytical frame     | Called "Scope" in ~40+ locations         | scopes.ts, config-schemas.ts, orchestrated.ts | `[DEFER]`   |
| **EvidenceScope**     | Per-evidence source metadata   | (used correctly)                         | N/A                                           | `[CORRECT]` |
| **ArticleFrame**      | Broader topic of input article | Field named `analysisContext` (singular) | types.ts, orchestrated.ts                     | `[DEFER]`   |
| **KeyFactor**         | Evaluation dimension           | (used correctly)                         | N/A                                           | `[CORRECT]` |
| **Fact/EvidenceItem** | Unverified extracted evidence  | Called "Fact" (implies verified truth)   | types.ts, orchestrated.ts, JSON fields        | `[DEFER]`   |

## Primary Issues to Correct

> **Review Status:** `[DEFER]` - All issues below require backward-compatible migration. Breaking changes deferred to future cleanup phase.

### Issue 1: "Scope" Used for AnalysisContext `[DEFER]`

The following identifiers use "Scope" when they actually refer to AnalysisContext:

```
scopes.ts:
- DetectedScope → DetectedAnalysisContext
- detectScopesHeuristic() → detectContextsHeuristic()
- detectScopesLLM() → detectContextsLLM()
- detectScopesHybrid() → detectContextsHybrid()
- formatDetectedScopesHint() → formatDetectedContextsHint()

config-schemas.ts:
- scopeDetectionMethod → contextDetectionMethod
- scopeDetectionEnabled → contextDetectionEnabled
- scopeDetectionMinConfidence → contextDetectionMinConfidence
- scopeDetectionMaxScopes → contextDetectionMaxContexts
- scopeDedupThreshold → contextDedupThreshold

orchestrated.ts:
- seedScopes → seedContexts
- preDetectedScopes → preDetectedContexts
- factScopeAssignments → factContextAssignments
- claimScopeAssignments → claimContextAssignments
```

### Issue 2: `analysisContext` (singular) Field Name `[DEFER]`

The field `analysisContext` (singular) stores **ArticleFrame**, not an AnalysisContext.
This is well-documented but creates confusion. Cannot rename without breaking changes.

### Issue 3: Prompt Legacy Field Names `[DEFER]`

Some prompts reference legacy field names:

- `detectedScopes` contains AnalysisContext objects (not EvidenceScopes)
- `distinctProceedings` is deprecated alias for `analysisContexts`

### Issue 4: "Fact" Terminology for Unverified Evidence `[DEFER]`

The term "Fact" implies verified truth, but these are **unverified extracted evidence**:

```
types.ts:
- ExtractedFact interface (deprecated) → use EvidenceItem instead
- fact: string field → semantic mismatch (kept for JSON backward compat)
- category: "evidence" → tautological, use "direct_evidence" instead

orchestrated.ts:
- Local ExtractedFact interface → should use imported EvidenceItem
- factsExtracted variable → semantically should be "evidenceExtracted"

JSON output:
- facts[] array → semantically should be "evidence[]" (breaking change)

Test files:
- 24+ occurrences of ExtractedFact → migrate to EvidenceItem
```

**Migration Status**: Phase 2 complete (EvidenceItem exists, ExtractedFact is deprecated alias). Phase 2.1 (file-by-file migration) in progress.

---

## Review Complete

**Review Date:** 2026-02-01

### Review Summary

| Term                  | Status      | Action                                                              |
| --------------------- | ----------- | ------------------------------------------------------------------- |
| **AnalysisContext**   | `[DEFER]`   | Scope→Context renames require backward-compat aliases first         |
| **EvidenceScope**     | `[CORRECT]` | No changes needed                                                   |
| **ArticleFrame**      | `[DEFER]`   | Field name collision kept for backward compat; UI shows "Frame"     |
| **KeyFactor**         | `[CORRECT]` | No changes needed                                                   |
| **Fact/EvidenceItem** | `[DEFER]`   | Continue phased migration; JSON field `fact` kept for compat        |

### Completed Actions
- `[FIX]` Made AnalysisContext examples generic (removed domain-specific acronyms)

### Legend

- `[CORRECT]` - Usage is correct, no change needed
- `[FIX]` - Usage fixed in this review
- `[CLARIFY]` - Usage clarified
- `[DEFER]` - Known issue, deferred to maintain backward compatibility
