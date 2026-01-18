# FactHarbor Terminology Reference

**Version**: 2.0  
**Date**: 2026-01-18  
**Audience**: Developers, Prompt Engineers, LLM Systems  
**Status**: Pre-Refactoring (Field mappings show CURRENT → TARGET)

---

## Purpose

This document provides the **authoritative glossary** for FactHarbor's scope/context terminology across all layers: TypeScript code, JSON schema, database storage, and LLM prompts. Use this as the single source of truth when encountering ambiguous terms.

---

## Field Mapping Table (CURRENT → TARGET)

**Breaking Changes Approved**: See [ADR_001](../ARCHITECTURE/ADR_001_Scope_Context_Terminology_Refactoring.md)

| Concept | TypeScript Type | JSON Field (CURRENT) | JSON Field (TARGET) | Code Reference (CURRENT) | Code Reference (TARGET) | Prompt Term |
|---------|----------------|---------------------|--------------------|-----------------------|----------------------|-------------|
| Top-level context | `AnalysisContext` | `distinctProceedings` | `analysisContexts` | `relatedProceedingId` | `contextId` | AnalysisContext |
| Per-fact metadata | `EvidenceScope` | `evidenceScope` | `evidenceScope` | `evidenceScope` | `evidenceScope` | EvidenceScope |
| Context answer | `ContextAnswer` | (embedded) | (embedded) | `proceedingId` | `contextId` | (internal) |
| Narrative frame | `ArticleFrame` | `proceedingContext` | `analysisContext` | `proceedingContext` | `analysisContext` | ArticleFrame |

**Migration Status**: 🔴 Not yet applied (planned for v2.7.0)

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

**JSON field name** (legacy):
```json
{
  "distinctProceedings": [
    { "id": "CTX_TSE", "name": "TSE Electoral Ruling" },
    { "id": "CTX_SCOTUS", "name": "SCOTUS Colorado Case" }
  ]
}
```

**Prompt terminology**:
- Preferred: "AnalysisContext"
- Acceptable: "Scope" (when context makes it clear it's top-level)
- Legacy: "Proceeding" (avoid in new prompts)

**Common confusion**:
- ❌ NOT the same as EvidenceScope (per-fact metadata)
- ❌ NOT the same as ArticleFrame (narrative background)

---

### 2. EvidenceScope (Per-Fact Source Metadata)

**What it is**: Metadata attached to individual facts describing the methodology, boundaries, geography, and time period that **the source document** used when producing that evidence.

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

// Attached to facts
export interface ExtractedFact {
  id: string;
  fact: string;
  evidenceScope?: EvidenceScope;
  // ...
}
```

**JSON field name**:
```json
{
  "facts": [
    {
      "id": "F1",
      "fact": "Hydrogen achieves 40% WTW efficiency",
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
- In explanations: "Per-fact EvidenceScope" (to distinguish from AnalysisContext)

**Common confusion**:
- ❌ NOT a top-level scope requiring separate verdicts
- ❌ Multiple facts can have the same EvidenceScope (many sources use WTW methodology)
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
  proceedingContext: string; // ⚠️ LEGACY NAME - actually stores ArticleFrame
  // ...
}
```

**JSON field name** (misleading!):
```json
{
  "proceedingContext": "Article frames case as political persecution"
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

## Terminology Mapping Tables

### Table 1: Primary Entities

| Concept | TypeScript Name | JSON Field | Prompt Term | UI Label | Database Column |
|---------|-----------------|------------|-------------|----------|-----------------|
| Top-level analytical frame | `AnalysisContext` | `distinctProceedings` | "AnalysisContext" | "Contexts" | `ResultJson.distinctProceedings` |
| Per-fact source metadata | `EvidenceScope` | `evidenceScope` | "evidenceScope" | (not displayed separately) | `ResultJson.facts[].evidenceScope` |
| Narrative background | (no interface) | `proceedingContext` | "ArticleFrame" | "Article Context" | `ResultJson.understanding.proceedingContext` |

### Table 2: Reference Fields

| Field Purpose | TypeScript Field | JSON Field | Prompt Term | Valid Values |
|---------------|------------------|------------|-------------|--------------|
| Fact → AnalysisContext | `relatedProceedingId?: string` | `relatedProceedingId` | "proceedingId" or "scopeId" | Must match `AnalysisContext.id` |
| Claim → AnalysisContext | `relatedProceedingId?: string` | `relatedProceedingId` | "proceedingId" | Must match `AnalysisContext.id` |
| Verdict → AnalysisContext | `proceedingId: string` | `proceedingId` | "proceedingId" | Must match `AnalysisContext.id` |

### Table 3: Special Constants

| Constant | Value | Meaning | When to Use |
|----------|-------|---------|-------------|
| `UNSCOPED_ID` | `"CTX_UNSCOPED"` | Fact doesn't map to any detected scope | When fact is general/background |
| `CTX_MAIN` | `"CTX_MAIN"` | Fallback scope for single-scope analysis | When no distinct scopes detected |
| `CTX_GENERAL` | `"CTX_GENERAL"` | General scope (cross-cutting) | When fact applies to all scopes |

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
  distinctProceedings: z.array(AnalysisContextSchema),
  proceedingContext: z.string(),
});

// ⚠️ NOTE: Field names are legacy but must match database
```

### In LLM Prompts

```typescript
// ✅ CORRECT (with glossary)
const prompt = `
## TERMINOLOGY

**AnalysisContext**: Top-level bounded analytical frame (stored as distinctProceedings)
**EvidenceScope**: Per-fact source metadata (stored as fact.evidenceScope)
**ArticleFrame**: Narrative background (stored as proceedingContext)

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
function getEvidenceScope(fact: ExtractedFact): EvidenceScope | null { ... }
```

### Pitfall 2: Conflating ArticleFrame with AnalysisContext

**Problem**:
```json
{
  "distinctProceedings": [
    { "name": "Article frames as conspiracy theory" }
  ]
}
```

**Solution**:
```json
{
  "proceedingContext": "Article frames as conspiracy theory",
  "distinctProceedings": [
    { "name": "Central Bank Policy Proceeding" }
  ]
}
```

### Pitfall 3: Missing `relatedProceedingId` Validation

**Problem**:
```typescript
// No check that ID exists
fact.relatedProceedingId = "CTX_FAKE";
```

**Solution**:
```typescript
const validIds = new Set(contexts.map(c => c.id));
if (fact.relatedProceedingId && !validIds.has(fact.relatedProceedingId)) {
  throw new Error(`Invalid context reference: ${fact.relatedProceedingId}`);
}
```

### Pitfall 4: Silent Fallbacks Hide Errors

**Problem**:
```typescript
// LLM fails to return scopes, code silently uses default
const scopes = llmOutput.detectedScopes || [{ id: "CTX_MAIN" }];
```

**Solution**:
```typescript
const scopes = llmOutput.detectedScopes;
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
  relatedProceedingId: inferScopeForFact(f, finalScopes), // Maps to AnalysisContext.id
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

**Future State (Target v2.7.0)**: Aggressive refactoring with breaking changes (see [ADR_001](../ARCHITECTURE/ADR_001_Scope_Context_Terminology_Refactoring.md)). All legacy field names will be replaced in a single migration.

**For New Code**:
- Use `AnalysisContext` type in TypeScript
- Await migration completion before implementing new features requiring schema changes
- Follow established field names until migration is complete
- Add glossary to any new prompt files
- Use "context" (not "framework") when referring to `AnalysisContext` in prompts

**For Legacy Code**:
- Understand that `distinctProceedings` = array of `AnalysisContext`
- Don't rename fields without coordination with migration plan
- Add comments explaining field name discrepancy

---

## FAQ

**Q: Why are TypeScript names different from JSON field names?**

A: Backward compatibility. The codebase evolved from "Proceeding" terminology to "AnalysisContext", but changing JSON field names would break existing database records. An aggressive refactoring migration is approved and planned for v2.7.0 (see [ADR_001](../ARCHITECTURE/ADR_001_Scope_Context_Terminology_Refactoring.md)).

**Q: When should I use EvidenceScope vs AnalysisContext?**

A: If the information describes **how a source document computed its data** (methodology, boundaries), it's EvidenceScope. If it describes **a distinct analytical frame requiring separate verdicts**, it's AnalysisContext.

**Q: What's the difference between CTX_UNSCOPED and CTX_GENERAL?**

A: `CTX_UNSCOPED` means the fact doesn't map to any detected scope (background info). `CTX_GENERAL` means the fact applies across all scopes (cross-cutting evidence). In practice, both are grouped together in display.

**Q: Can a fact have BOTH relatedProceedingId AND evidenceScope?**

A: Yes! `relatedProceedingId` says **which AnalysisContext the fact supports**, while `evidenceScope` says **how the source computed the data**. They're orthogonal concepts.

**Q: Should prompts say "AnalysisContext", "Context", or "Framework"?**

A: Use "AnalysisContext" for precision or "context" for brevity. **NEVER use "framework"** when referring to the architectural concept of `AnalysisContext`. The term "framework" is reserved for descriptive English phrases like "regulatory frameworks" or "procedural framework" (methodology descriptions).

---

## Related Documentation

- [Scope_Context_Terminology_Architecture_Analysis.md](Scope_Context_Terminology_Architecture_Analysis.md) - Full architectural audit
- [AGENTS.md](../../AGENTS.md) - High-level rules for scope detection
- [types.ts](../../apps/web/src/lib/analyzer/types.ts) - TypeScript interface definitions
- [Pipeline_TriplePath_Architecture.md](../ARCHITECTURE/Pipeline_TriplePath_Architecture.md) - Pipeline design

---

**Document Maintainer**: Lead Developer
**Last Reviewed**: 2026-01-18 (Framework terminology fix applied)
**Next Review**: 2026-04 (or after migration Phase 1)
