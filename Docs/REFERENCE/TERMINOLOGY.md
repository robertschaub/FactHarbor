# FactHarbor Terminology Reference

**Version**: 2.6.42
**Date**: 2026-02-02
**Audience**: Developers, Prompt Engineers, LLM Systems
**Status**: Phase 2 Complete (probativeValue, sourceType, evidenceFilter integrated; EvidenceItem type active; legacy names preserved for backward compatibility)

---

## Purpose

This document provides the **authoritative glossary** for FactHarbor's scope/context terminology across all layers: TypeScript code, JSON schema, database storage, and LLM prompts. Use this as the single source of truth when encountering ambiguous terms.

---

## Field Mapping Table (v2.7 → Legacy)

**Breaking Changes Approved**: Documented in code comments (types.ts) - legacy JSON field names preserved for backward compatibility

| Concept | TypeScript Type | JSON Field (v2.7) | JSON Field (Legacy) | Code Reference (v2.7) | Code Reference (Legacy) | Prompt Term |
|---------|----------------|---------------------|--------------------|-----------------------|----------------------|-------------|
| Top-level context | `AnalysisContext` | `analysisContexts` | `distinctProceedings` | `contextId` | `relatedProceedingId` | AnalysisContext |
| Per-fact metadata | `EvidenceScope` | `evidenceScope` | `evidenceScope` | `evidenceScope` | `evidenceScope` | EvidenceScope |
| Context answer | `ContextAnswer` | (embedded) | (embedded) | `contextId` | `proceedingId` | (internal) |
| Narrative frame | `ArticleFrame` | `analysisContext` | `proceedingContext` | `analysisContext` | `proceedingContext` | ArticleFrame |

**Migration Status**: ✅ Applied in v2.7.0 (legacy field names accepted for backward compatibility)

---

## Field Hierarchy: Understanding the Layers

FactHarbor uses multiple "framing" concepts that work together hierarchically:

### Level 1: ArticleFrame (Optional Context)
- **What:** Broader topic or narrative setting of the article
- **When:** Only for articles with clear thematic frame (can be empty)
- **Display:** Optional banner in UI showing general topic area
- **Example:** "Climate policy and decarbonization", "Brazilian democratic crisis 2023-2024"
- **JSON field:** `analysisContext` (singular) - *Note: confusing name, consider renaming to `articleFrame` in v3.0*

### Level 2: ArticleThesis (Main Claim)
- **What:** What the article/input specifically asserts
- **When:** Always present (the claim being fact-checked)
- **Display:** Prominent display in summary section
- **Example:** "Hydrogen is more efficient than electric", "Bolsonaro trials were politically motivated"
- **JSON field:** `articleThesis`

### Level 3: AnalysisContexts (Verdict Spaces)
- **What:** Distinct analytical frames requiring separate, independent verdicts
- **When:** 1+ contexts detected (typically 1-3 per input)
- **Display:** Primary grouping in UI - each context gets its own verdict section
- **Example:** [TSE electoral case, STF criminal case], [WTW methodology, TTW methodology]
- **JSON field:** `analysisContexts` (plural array)

### Level 4: Evidence Items (Supporting Evidence)
- **What:** Individual evidence items extracted from sources
- **When:** Found during research phase
- **Display:** Listed under each AnalysisContext with supporting/opposing indicators
- **Assigned to:** One AnalysisContext via `contextId`

### Level 5: EvidenceScope (Source Methodology - NOT Currently Displayed)
- **What:** The analytical frame/methodology used BY THE SOURCE when producing evidence
- **When:** Optional per-evidence metadata (not all evidence items have this)
- **Display:** *Should be shown via tooltips or sub-grouping (currently hidden)*
- **Example:** "ISO 14040 LCA", "GREET Model", "Brazilian Electoral Law", "Journalistic reporting"
- **JSON field:** `evidenceItem.evidenceScope` (optional object)

**Key Distinction:**
- **AnalysisContext** = "WHAT we're analyzing" (user's question: "Was TSE fair?")
- **EvidenceScope** = "HOW sources analyzed it" (source metadata: "Using electoral law framework")

**UI Grouping Rule:** Always group by AnalysisContext (uncomparable verdict spaces), then show EvidenceScope as metadata within each context.

---

## Core Concepts

### 1. AnalysisContext (Top-Level Analytical Frame)

**What it is**: A bounded analytical frame that requires separate, independent analysis and verdict.

**Why it matters**: When a user's input involves multiple distinct analytical frames (e.g., different legal jurisdictions, different scientific methodologies), each must be analyzed separately to avoid conflating evidence.

**Examples**:
- Different legal proceedings: "TSE Electoral Case" vs "STF Criminal Case"
- Different methodologies: "Well-to-Wheel Analysis" vs "Tank-to-Wheel Analysis"
- Different regulatory frameworks: "EU REACH Standards" vs "US EPA Standards"

**Code representation**:
```typescript
// TypeScript interface name
export interface AnalysisContext {
  id: string;
  name: string;
  shortName: string;
  subject: string;
  // ...
}
```

**JSON field name** (v2.7):
```json
{
  "analysisContexts": [
    { "id": "CTX_TSE", "name": "TSE Electoral Ruling" },
    { "id": "CTX_SCOTUS", "name": "SCOTUS Colorado Case" }
  ]
}
```

**Prompt terminology**:
- Preferred: "AnalysisContext" or "Context"
- Avoid: "Scope" (reserved for EvidenceScope)
- Legacy: "Proceeding" (avoid in new prompts)

**Common confusion**:
- ❌ NOT the same as EvidenceScope (per-evidence metadata)
- ❌ NOT the same as ArticleFrame (narrative background)

---

### 2. EvidenceScope (Per-Evidence Source Metadata)

**What it is**: Metadata attached to individual evidence items describing the methodology, boundaries, geography, and time period that **the source document** used when producing that evidence.

**Why it matters**: A fact saying "40% efficiency" from a Well-to-Wheel study (includes full energy chain) cannot be directly compared to a Tank-to-Wheel study (only vehicle operation). EvidenceScope captures these methodological differences.

**Examples**:
- Methodology: "ISO 14040 LCA", "EU RED II", "GREET Model"
- Boundaries: "Primary energy to wheel", "Tank to wheel only"
- Geographic: "European Union", "California", "China"
- Temporal: "2020-2025 data", "FY2024 projections"

**Code representation**:
```typescript
export interface EvidenceScope {
  name: string;
  methodology?: string;
  boundaries?: string;
  geographic?: string;
  temporal?: string;
}

// Attached to evidence items (EvidenceItem, legacy name: ExtractedFact)
export interface EvidenceItem {
  id: string;
  statement: string;
  evidenceScope?: EvidenceScope;
  // ...
}
```

**JSON field name**:
```json
{
  "evidenceItems": [
    {
      "id": "E1",
      "statement": "Hydrogen achieves 40% WTW efficiency",
      "evidenceScope": {
        "name": "WTW",
        "methodology": "Well-to-Wheel",
        "boundaries": "Primary energy to vehicle motion",
        "geographic": "EU",
        "temporal": "2024"
      }
    }
  ]
}
```

**Prompt terminology**:
- Always: "evidenceScope" (lowercase, as field name)
- In explanations: "Per-evidence EvidenceScope" (to distinguish from AnalysisContext)

**Common confusion**:
- ❌ NOT a top-level scope requiring separate verdicts
- ❌ Multiple evidence items can have the same EvidenceScope (many sources use WTW methodology)
- ✅ IS metadata about **how the source computed** the data

---

### 3. ArticleFrame (Narrative Background)

**What it is**: The narrative/rhetorical framing or background context of the input article. This describes **how the article presents** the information, but is NOT a reason to split into separate AnalysisContexts.

**Why it matters**: Helps understand the user's intent and article structure, but does NOT affect verdict logic.

**Examples**:
- "Article frames as political conspiracy"
- "Journalistic investigation format"
- "Opinion piece with legal commentary"

**Code representation**:
```typescript
// No dedicated interface, stored as string
export interface ClaimUnderstanding {
  analysisContext: string; // Narrative ArticleFrame
  // ...
}
```

**JSON field name**:
```json
{
  "analysisContext": "Article frames case as political persecution"
}
```

**Prompt terminology**:
- Preferred: "ArticleFrame"
- Legacy: "proceedingContext" (only when referencing JSON field)
- ⚠️ **CRITICAL**: This is NOT a "context" in the AnalysisContext sense!

**Common confusion**:
- ❌ NOT an AnalysisContext (not a reason to split analysis)
- ❌ Does NOT get its own verdict
- ✅ IS purely descriptive/informational

---

### 4. Doubted vs Contested (Contestation Classification) - v2.8

**What it is**: A distinction between two types of opposition to a claim, which affects how the opposition impacts the verdict weight.

**Why it matters**: Not all criticism is equal. Political statements without evidence shouldn't reduce a claim's weight as much as documented counter-evidence. This ensures:
- **Evidence-based contestation** appropriately reduces certainty
- **Opinion-based doubt** doesn't unfairly penalize well-evidenced claims

**Two Categories**:

| Category | factualBasis | Weight Multiplier | Example |
|----------|--------------|-------------------|---------|
| **DOUBTED** | `"opinion"` | 1.0x (full) | "Government says trial was unfair" (no specifics) |
| **DOUBTED** | `"alleged"` | 1.0x (full) | "Critics claim bias" (no evidence cited) |
| **CONTESTED** | `"disputed"` | 0.5x (reduced) | "Defense presented conflicting expert testimony" |
| **CONTESTED** | `"established"` | 0.3x (heavily reduced) | "Audit found violation of Regulation 47(b)" |

**Code implementation** (v2.8):

```typescript
// In aggregation.ts

// Orchestrated: KeyFactor-level validation
export function validateContestation(keyFactors: KeyFactor[]): KeyFactor[];

// Canonical: Claim-level heuristic detection  
export function detectClaimContestation(claimText: string, reasoning?: string): ClaimContestationResult;
```

**Weight calculation** (in `getClaimWeight()`):
```typescript
if (claim.isContested) {
  if (basis === "established") weight *= 0.3;  // Strong counter-evidence
  else if (basis === "disputed") weight *= 0.5; // Some counter-evidence
  // "opinion"/"alleged"/"unknown" → full weight (just doubted)
}
```

**Prompt guidance** (in verdict prompts):
```
- factualBasis: "opinion" for political criticism without specifics
- factualBasis: "established" for documented violations with specific citations
- factualBasis: "disputed" for counter-evidence that is debatable
```

**Common confusion**:
- ❌ "contested" does NOT mean "disputed politically" (that's "doubted")
- ✅ "contested" means there IS documented counter-evidence
- ❌ Political statements alone do NOT reduce claim weight
- ✅ Only factual counter-evidence reduces claim weight

---

## Terminology Mapping Tables

### Table 1: Primary Entities

| Concept | TypeScript Name | JSON Field | Prompt Term | UI Label | Database Column |
|---------|-----------------|------------|-------------|----------|-----------------|
| Top-level analytical frame | `AnalysisContext` | `analysisContexts` | "AnalysisContext" | "Contexts" | `ResultJson.analysisContexts` |
| Per-fact source metadata | `EvidenceScope` | `evidenceScope` | "evidenceScope" | (not displayed separately) | `ResultJson.facts[].evidenceScope` |
| Narrative background | (no interface) | `analysisContext` | "ArticleFrame" | "Article Context" | `ResultJson.understanding.analysisContext` |

### Table 2: Reference Fields

| Field Purpose | TypeScript Field | JSON Field | Prompt Term | Valid Values |
|---------------|------------------|------------|-------------|--------------|
| Fact → AnalysisContext | `contextId?: string` | `contextId` | "contextId" | Must match `AnalysisContext.id` |
| Claim → AnalysisContext | `contextId?: string` | `contextId` | "contextId" | Must match `AnalysisContext.id` |
| Verdict → AnalysisContext | `contextId: string` | `contextId` | "contextId" | Must match `AnalysisContext.id` |

### Table 3: Special Constants

| Constant | Value | Meaning | When to Use |
|----------|-------|---------|-------------|
| `UNSCOPED_ID` | `"CTX_UNSCOPED"` | Fact doesn't map to any detected context | When fact is general/background |
| `CTX_MAIN` | `"CTX_MAIN"` | Fallback context for single-context analysis | When no distinct contexts detected |
| `CTX_GENERAL` | `"CTX_GENERAL"` | General context (cross-cutting) | When fact applies to all contexts |

---

## Quick Reference: "Which term should I use?"

### In TypeScript Code

```typescript
// ✅ CORRECT
import { AnalysisContext, EvidenceScope } from './types';

function processContexts(contexts: AnalysisContext[]) {
  // ...
}

// ❌ AVOID (legacy)
function processProceedings(procs: DistinctProceeding[]) {
  // ...
}
```

### In JSON Schema (Zod)

```typescript
// ✅ CORRECT (matches persisted format)
const schema = z.object({
  analysisContexts: z.array(AnalysisContextSchema),
  analysisContext: z.string(),
});

// ✅ v2.7.0 field names; legacy names are accepted for backward compatibility
```

### In LLM Prompts

```typescript
// ✅ CORRECT (with glossary)
const prompt = `
## TERMINOLOGY

**AnalysisContext**: Top-level bounded analytical frame (stored as analysisContexts)
**EvidenceScope**: Per-fact source metadata (stored as fact.evidenceScope)
**ArticleFrame**: Narrative background (stored as analysisContext)

Your task: Identify AnalysisContexts from evidence...
`;

// ❌ AVOID (ambiguous)
const prompt = `Identify scopes from evidence...`;
// ^ Which "scope"? AnalysisContext or EvidenceScope?
```

### In UI/Documentation

```typescript
// ✅ CORRECT
<h2>Analysis Contexts</h2>
<p>This analysis involves 2 distinct analytical frames:</p>

// ❌ AVOID (confusing)
<h2>Proceedings</h2>
// ^ Users don't know what "proceeding" means in non-legal domains
```

---

## Decision Trees

### "Should I create a new AnalysisContext?"

```
START: Do the facts involve distinct analytical frames?
  │
  ├─ YES → Are the methodologies/boundaries INCOMPATIBLE?
  │   │
  │   ├─ YES → CREATE separate AnalysisContexts
  │   │   └─ Example: WTW vs TTW (different system boundaries)
  │   │
  │   └─ NO → SINGLE AnalysisContext
  │       └─ Example: Multiple studies using same WTW methodology
  │
  └─ NO → Are they different LEGAL proceedings analyzing different matters?
      │
      ├─ YES → CREATE separate AnalysisContexts
      │   └─ Example: TSE electoral case vs STF criminal case
      │
      └─ NO → SINGLE AnalysisContext
          └─ Example: Different viewpoints on same legal case
```

### "Is this an EvidenceScope or AnalysisContext?"

```
START: Where does this information come from?
  │
  ├─ FROM SOURCE DOCUMENT → EvidenceScope
  │   └─ Example: "Study used ISO 14040 methodology"
  │   └─ Attach to fact.evidenceScope
  │
  └─ FROM INPUT/USER → AnalysisContext?
      │
      ├─ Does it define a DISTINCT analytical frame?
      │   │
      │   ├─ YES → AnalysisContext
      │   │   └─ Example: "Compare US EPA vs EU REACH"
      │   │
      │   └─ NO → ArticleFrame
      │       └─ Example: "Article is written as opinion piece"
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Using "Scope" Without Qualifier

**Problem**:
```typescript
// Ambiguous - which scope?
function getScope(id: string) { ... }
```

**Solution**:
```typescript
// Explicit
function getAnalysisContext(id: string): AnalysisContext { ... }
function getEvidenceScope(evidence: EvidenceItem): EvidenceScope | null { ... }
```

### Pitfall 2: Conflating ArticleFrame with AnalysisContext

**Problem**:
```json
{
  "analysisContexts": [
    { "name": "Article frames as conspiracy theory" }
  ]
}
```

**Solution**:
```json
{
  "analysisContext": "Article frames as conspiracy theory",
  "analysisContexts": [
    { "name": "Central Bank Policy Proceeding" }
  ]
}
```

### Pitfall 3: Missing `relatedProceedingId` Validation

**Problem**:
```typescript
// No check that ID exists
fact.contextId = "CTX_FAKE";
```

**Solution**:
```typescript
const validIds = new Set(contexts.map(c => c.id));
if (fact.contextId && !validIds.has(fact.contextId)) {
  throw new Error(`Invalid context reference: ${fact.contextId}`);
}
```

### Pitfall 4: Silent Fallbacks Hide Errors

**Problem**:
```typescript
// LLM fails to return scopes, code silently uses default
const scopes = llmOutput.analysisContexts || [{ id: "CTX_MAIN" }];
```

**Solution**:
```typescript
const scopes = llmOutput.analysisContexts;
if (!scopes || scopes.length === 0) {
  agentLog("WARN", "LLM did not detect scopes, using fallback CTX_MAIN");
  return [{ id: "CTX_MAIN", name: "General Analysis" }];
}
```

---

## Examples from Real Code

### Example 1: Correct Multi-Context Handling

```typescript
// From: monolithic-canonical.ts
const finalScopes = params.verdictData?.detectedScopes?.map((s: any) => ({
  id: s.id,              // AnalysisContext ID
  name: s.name,          // Human-readable name
  subject: s.subject,    // What's being analyzed
  metadata: { type: s.type }, // Domain-specific details
})) || [{ id: "CTX_MAIN", name: "Main Analysis" }];

// Each fact references its AnalysisContext
facts.map(f => ({
  ...f,
  contextId: inferScopeForFact(f, finalScopes), // Maps to AnalysisContext.id
}));
```

### Example 2: EvidenceScope Extraction

```typescript
// From: extract-facts-base.ts prompt
`For EACH fact, extract the source's analytical frame when present:

**evidenceScope** (attach to fact):
- name: Short label (e.g., "WTW", "TTW")
- methodology: Standard referenced (e.g., "ISO 14040")
- boundaries: What's included/excluded
- geographic: Geographic scope
- temporal: Time period`
```

### Example 3: Terminology Glossary in Prompt

```typescript
// From: scope-refinement-base.ts
`## TERMINOLOGY (CRITICAL)

- **AnalysisContext**: Bounded analytical frame requiring separate analysis (output as distinctProceedings)
- **ArticleFrame**: Narrative background framing - NOT a reason to split
- **EvidenceScope**: Per-fact source methodology/boundaries - DIFFERENT from AnalysisContext`
```

---

## Validation Checklist

Use this checklist when reviewing code that involves scopes/contexts:

- [ ] Is "scope" qualified as AnalysisContext or EvidenceScope?
- [ ] Do JSON field names match legacy format (`distinctProceedings`, not `analysisContexts`)?
- [ ] Does prompt include terminology glossary header?
- [ ] Are `relatedProceedingId` values validated against `distinctProceedings[]`?
- [ ] Are fallbacks logged (not silent)?
- [ ] Does EvidenceScope capture source methodology (not create new AnalysisContexts)?
- [ ] Is ArticleFrame separate from AnalysisContexts?
- [ ] Are provider-specific prompts using consistent core terminology?

---

## Migration Notes

**Current State (2026-01-18)**: Legacy field names (`distinctProceedings`, `proceedingContext`) coexist with modern conceptual names (`AnalysisContext`, `ArticleFrame`).

**Recent Fixes**:
- **2026-01-18**: Eliminated "framework" terminology confusion in prompts. The term "framework" is now only used in descriptive English phrases (e.g., "regulatory frameworks", "procedural framework") and never as a reference to `AnalysisContext`. All architectural references now correctly use "context".

**Current State (v2.7.0)**: Refactor applied. New field names are active, with legacy names accepted for backward compatibility.

**For New Code**:
- Use `AnalysisContext` type in TypeScript
- Use v2.7.0 field names in new work
- Preserve backward compatibility for legacy records and older jobs
- Add glossary to any new prompt files
- Use "context" (not "framework") when referring to `AnalysisContext` in prompts

**For Legacy Code**:
- Understand that `analysisContexts` = array of `AnalysisContext`
- Keep legacy-field fallbacks when reading older data
- Add comments explaining backward compatibility when needed

---

## FAQ

**Q: Why are TypeScript names different from JSON field names?**

A: Backward compatibility. The codebase evolved from "Proceeding" terminology to "AnalysisContext", so v2.7.0 introduced new JSON field names while still accepting legacy records (documented in types.ts comments).

**Q: When should I use EvidenceScope vs AnalysisContext?**

A: If the information describes **how a source document computed its data** (methodology, boundaries), it's EvidenceScope. If it describes **a distinct analytical frame requiring separate verdicts**, it's AnalysisContext.

**Q: What's the difference between CTX_UNSCOPED and CTX_GENERAL?**

A: `CTX_UNSCOPED` means the fact doesn't map to any detected context (background info). `CTX_GENERAL` means the fact applies across all contexts (cross-cutting evidence). In practice, both are grouped together in display.

**Q: Can a fact have BOTH relatedProceedingId AND evidenceScope?**

A: Yes! `contextId` says **which AnalysisContext the fact supports**, while `evidenceScope` says **how the source computed the data**. They're orthogonal concepts.

**Q: Should prompts say "AnalysisContext", "Context", or "Framework"?**

A: Use "AnalysisContext" for precision or "context" for brevity. **NEVER use "framework"** when referring to the architectural concept of `AnalysisContext`. The term "framework" is reserved for descriptive English phrases like "regulatory frameworks" or "procedural framework" (methodology descriptions).

---

## Known Issues & Migration Status

> **Source**: Extracted from [Terminology_Catalog_Five_Core_Terms.md](../ARCHIVE/REVIEWS/Terminology_Catalog_Five_Core_Terms.md)

### Terminology Status Matrix

| Term | Status | Notes |
|------|--------|-------|
| **AnalysisContext** | `[DEFER]` | ~40 locations use "Scope" when referring to AnalysisContext. Requires backward-compat aliases before renaming. |
| **EvidenceScope** | `[CORRECT]` | Usage is correct throughout the codebase. No changes needed. |
| **ArticleFrame** | `[DEFER]` | Field name `analysisContext` (singular) stores ArticleFrame. Known collision kept for backward compat; UI shows "Frame". |
| **KeyFactor** | `[CORRECT]` | Well-documented and consistently used throughout. No changes needed. |
| **EvidenceItem** | `[DEFER]` | Continue phased migration from `ExtractedFact`. JSON field `fact` kept for backward compat. |

### Deferred Renames (Backward Compatibility Required)

```
scopes.ts:
├─ DetectedScope → DetectedAnalysisContext
├─ detectScopesHeuristic() → detectContextsHeuristic()
├─ detectScopesLLM() → detectContextsLLM()
└─ formatDetectedScopesHint() → formatDetectedContextsHint()

config-schemas.ts:
├─ scopeDetectionMethod → contextDetectionMethod
├─ scopeDetectionEnabled → contextDetectionEnabled
├─ scopeDetectionMinConfidence → contextDetectionMinConfidence
└─ scopeDedupThreshold → contextDedupThreshold

orchestrated.ts:
├─ seedScopes → seedContexts
├─ preDetectedScopes → preDetectedContexts
└─ factScopeAssignments → factContextAssignments
```

### EvidenceItem Migration Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 0 | Add `EvidenceItem` type, keep `ExtractedFact` alias | ✅ Complete |
| Phase 1 | Prompts use "Evidence" terminology | ✅ Complete |
| Phase 2 | Add `probativeValue`, `sourceType` to EvidenceItem | ✅ Complete |
| Phase 2.1 | File-by-file migration from ExtractedFact to EvidenceItem | 🔄 In Progress |
| Phase 3 | Remove deprecated `ExtractedFact` alias | ⏳ Future |
| Phase 4 | Rename JSON field `fact` to `statement` | ⏳ Future (breaking) |

### Legend

- `[CORRECT]` - Usage is correct, no change needed
- `[DEFER]` - Known issue, deferred to maintain backward compatibility
- `[FIX]` - Issue identified and corrected

---

## Related Documentation

- [Scope Definition Guidelines](../DEVELOPMENT/Scope_Definition_Guidelines.md) - EvidenceScope vs AnalysisContext decision guide
- [AGENTS.md](../../AGENTS.md) - High-level rules for context detection
- [types.ts](../../apps/web/src/lib/analyzer/types.ts) - TypeScript interface definitions
- [Pipeline_TriplePath_Architecture.md](../ARCHITECTURE/Pipeline_TriplePath_Architecture.md) - Pipeline design
- [Provider Prompt Formatting](Provider_Prompt_Formatting.md) - Provider-specific prompt optimizations
- [Evidence Quality Filtering](../ARCHITECTURE/Evidence_Quality_Filtering.md) - Two-layer probative value enforcement

---

**Document Maintainer**: Lead Developer
**Last Reviewed**: 2026-02-02 (Added Known Issues & Migration Status from catalog)
**Next Review**: 2026-04 (or after migration Phase 1)
