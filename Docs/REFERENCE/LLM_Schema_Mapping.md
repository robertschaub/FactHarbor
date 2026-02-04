# LLM Schema Mapping Reference

**Version**: 2.6.33  
**Date**: 2026-01-20  
**Purpose**: Complete mapping of TypeScript → LLM Prompts → JSON Schemas  
**Audience**: Prompt Engineers, LLM System Developers  

---

## Overview

This document maps how FactHarbor's TypeScript objects are presented to LLMs (via prompts) and how LLM outputs are validated (via Zod schemas). Use this as the authoritative reference when writing or updating prompts.

---

## Master Mapping Table

| TypeScript Type | Prompt Term | LLM Output Field (v3.1) | LLM Output Field (Legacy) | Zod Schema |
|----------------|-------------|---------------------------|--------------------------|------------|
| `AnalysisContext` | "AnalysisContext" or "Context" | `analysisContexts` | `distinctProceedings` | `AnalysisContextSchema` |
| `EvidenceScope` | "EvidenceScope" or "Scope" | `evidenceScope` | `evidenceScope` | `EvidenceScopeSchema` |

> **CRITICAL TERMINOLOGY (v2.6.39)**: "Scope" refers to `EvidenceScope` (per-evidence metadata), NOT `AnalysisContext`. Use "Context" for top-level analytical frames.
| `EvidenceItem` | "Evidence" | `evidenceItems` | (none) | `EvidenceItemSchema` |
| `ContextAnswer` | "Verdict" | (embedded in result) | (embedded in result) | `ContextAnswerSchema` |

---

## Phase-by-Phase Mappings

### UNDERSTAND Phase

**Purpose**: Extract claims and detect preliminary AnalysisContexts

**Input to LLM**:
```typescript
// Variables passed to prompt
{
  currentDate: string;  // e.g., "2026-01-18"
  isRecent: boolean;    // Temporal relevance flag
}
```

**Prompt Terms Used**:
- "AnalysisContext" or "Context" for top-level analytical frames
- "Multi-Context Detection" for identifying distinct frames
- "Claim Extraction" for factual assertions

**LLM Output Schema (v2.7)**:
```json
{
  "impliedClaim": "string",
  "articleThesis": "string",
  "subClaims": [
    {
      "id": "string",
      "text": "string",
      "claimRole": "attribution" | "source" | "timing" | "core",
      "centrality": "HIGH" | "MEDIUM" | "LOW",
      "isCentral": boolean
    }
  ],
  "researchQueries": ["string"],
  "analysisContexts": [
    {
      "id": "string",
      "name": "string",
      "type": "legal" | "scientific" | "methodological" | "general"
    }
  ],
  "requiresSeparateAnalysis": boolean
}
```

**Zod Validation**: `UnderstandingSchema` (in `analyzer.ts`)

**Key Mappings**:
- Prompt: "AnalysisContext" → Output: `analysisContexts` array
- Prompt: "requiresSeparateAnalysis" → Output: `requiresSeparateAnalysis` boolean

---

### EXTRACT_EVIDENCE Phase

**Purpose**: Extract verifiable evidence items from fetched sources

**Input to LLM**:
```typescript
{
  currentDate: string;
  originalClaim: string;      // User's input
  contextsList: string;       // Stringified list of detected AnalysisContexts
}
```

**Prompt Terms Used**:
- "EvidenceScope" for per-evidence methodology metadata (NOT an AnalysisContext)
- "contextId" for AnalysisContext assignment
- "claimDirection" for support/contradict/neutral assessment

**LLM Output Schema (v2.7)**:
```json
{
  "evidenceItems": [
    {
      "id": "string",
      "statement": "string",
      "category": "evidence" | "expert_quote" | "statistic" | "event" | "legal_provision" | "criticism",
      "specificity": "high" | "medium",
      "sourceExcerpt": "string (50-200 chars)",
      "claimDirection": "supports" | "contradicts" | "neutral",
      "contextId": "string (e.g., CTX_TSE)",
      "evidenceScope": {
        "name": "string",
        "methodology": "string?",
        "boundaries": "string?",
        "geographic": "string?",
        "temporal": "string?"
      } | null
    }
  ]
}
```

**Legacy Compatibility**:
- Legacy field `relatedProceedingId` is still accepted when reading older jobs.

**Zod Validation**: `EvidenceItemSchema` (in `types.ts`)

**Key Mappings**:
- Prompt: "EvidenceScope" → Output: `evidenceScope` object (nullable)
- Prompt: "contextId" → Output: `contextId` (legacy: `relatedProceedingId`)

---

### CONTEXT_REFINEMENT Phase

**Purpose**: Identify final AnalysisContexts from evidence

**Input to LLM**:
```typescript
{
  evidenceItems: EvidenceItem[];              // All extracted evidence items
  preliminaryContexts: AnalysisContext[];     // From UNDERSTAND phase
}
```

**Prompt Terms Used**:
- "AnalysisContext" or "Context" (primary term for top-level frames)
- "ArticleFrame" (what NOT to split on)
- "EvidenceScope" (per-evidence metadata - NOT an AnalysisContext)
- "analysisContexts" (output field name)

**LLM Output Schema (v2.7)**:
```json
{
  "requiresSeparateAnalysis": boolean,
  "analysisContexts": [
    {
      "id": "string",
      "name": "string",
      "shortName": "string",
      "subject": "string",
      "temporal": "string",
      "status": "concluded" | "ongoing" | "pending" | "unknown",
      "outcome": "string",
      "metadata": {
        "institution": "string?",
        "jurisdiction": "string?",
        "methodology": "string?",
        "boundaries": "string?",
        "geographic": "string?",
        "dataSource": "string?"
      }
    }
  ],
  "evidenceContextAssignments": [
    {
      "evidenceId": "string",
      "contextId": "string"    // References AnalysisContext.id
    }
  ],
  "claimContextAssignments": [
    {
      "claimId": "string",
      "contextId": "string"
    }
  ]
}
```

**Legacy Compatibility**:
- Legacy fields `distinctProceedings` and `proceedingId` are still accepted when reading older jobs.

**Zod Validation**: `ContextRefinementSchema` (legacy: `ScopeRefinementSchema`) in `analyzer.ts`

**Key Mappings**:
- Prompt: "AnalysisContext" → Output: `analysisContexts` (legacy: `distinctProceedings`)
- Prompt: "ArticleFrame" → (explicitly NOT included in output)
- Prompt: "EvidenceScope" → (per-evidence metadata, not top-level context)

---

### VERDICT Phase

**Purpose**: Generate truth verdicts per context per claim

**Input to LLM**:
```typescript
{
  currentDate: string;
  originalClaim: string;
  claimsList: string;          // Stringified claims
  contextsList: string;        // Stringified AnalysisContexts
  factsList: string;           // Stringified facts
}
```

**Prompt Terms Used**:
- "contextId" for verdict assignment
- "answer" for truth percentage (0-100)
- "keyFactors" for evidence summary

**LLM Output Schema (v2.7)**:
```json
{
  "verdicts": [
    {
      "contextId": "string",
      "contextName": "string",
      "claimId": "string",
      "answer": number (0-100),
      "confidence": number (0-100),
      "truthPercentage": number (0-100),
      "shortAnswer": "string",
      "keyFactors": [
        {
          "factor": "string",
          "explanation": "string",
          "supports": "strongly_supports" | "supports" | "neutral" | "contradicts" | "strongly_contradicts",
          "weight": "high" | "medium" | "low",
          "isContested": boolean,
          "contestedBy": "string?",
          "factualBasis": "established" | "disputed" | "opinion" | "alleged" | "unknown"
        }
      ]
    }
  ]
}
```

**Contestation Fields (v2.8):**
- `isContested`: Whether there is opposition to this factor
- `contestedBy`: Who opposes (e.g., "opposition party", "industry group")
- `factualBasis`: Type of opposition evidence
  - `established` = Strong documented counter-evidence (weight: 0.3x)
  - `disputed` = Some factual counter-evidence (weight: 0.5x)
  - `opinion`/`alleged`/`unknown` = DOUBTED, no evidence (weight: 1.0x)

See `Docs/REFERENCE/TERMINOLOGY.md` for "Doubted vs Contested" distinction.

**Legacy Compatibility**:
- Legacy fields `proceedingId`/`proceedingName` are still accepted when reading older jobs.

**Zod Validation**: `VerdictSchema` (in `analyzer.ts`)

---

## Terminology Bridges (Prompt ↔ Code)

### AnalysisContext Bridges

| Layer | Term | Notes |
|-------|------|-------|
| Prompt | "AnalysisContext" or "Context" | Primary prompt term (NEVER "Scope") |
| LLM Output (v2.7) | `analysisContexts` | JSON field name |
| LLM Output (Legacy) | `distinctProceedings` | Backward compatibility |
| TypeScript | `AnalysisContext` | Interface name |
| Database | (embedded in ResultJson) | Stored as JSON blob |

### EvidenceScope Bridges

| Layer | Term | Notes |
|-------|------|-------|
| Prompt | "EvidenceScope" or "Scope" | Per-fact metadata (NOT an AnalysisContext) |
| LLM Output | `evidenceScope` | Consistent across versions |
| TypeScript | `EvidenceScope` | Interface name |
| Database | (embedded in fact objects) | Part of ResultJson |

---

## Validation Flow

```mermaid
graph TD
    A[TypeScript Input] -->|Variables| B[Prompt Template]
    B -->|Prompt String| C[LLM API Call]
    C -->|JSON String| D[Parse Response]
    D -->|Raw Object| E[Zod Validation]
    E -->|Valid?| F{Schema Match?}
    F -->|Yes| G[TypeScript Output]
    F -->|No| H[Validation Error]
    H --> I[Fallback or Retry]
```

### Schema Validation Checkpoints

1. **Pre-LLM**: Variables validated (type-safe TypeScript)
2. **Post-LLM**: JSON parsed and Zod-validated
3. **Post-Validation**: TypeScript types enforced
4. **Runtime**: Additional business logic validation (e.g., `contextId` exists in context list)

---

## Common Pitfalls

### Pitfall 1: Field Name Mismatch

❌ **Wrong** (Prompt says one thing, schema expects another):
```typescript
// Prompt says: "Output as 'analysisContexts'"
// But Zod schema expects: distinctProceedings

// Result: Validation fails
```

✅ **Correct** (Prompt and schema aligned):
```typescript
// Prompt says: "Output as 'distinctProceedings'" (CURRENT)
// Zod schema expects: distinctProceedings
// Result: Validation succeeds
```

### Pitfall 2: Terminology Confusion in Prompts

❌ **Wrong** (Confusing "scope" with "context"):
```
"Identify the distinct scopes..."
// WRONG: "Scope" means EvidenceScope (per-evidence metadata), not AnalysisContext
```

✅ **Correct** (Clear terminology):
```
"Identify AnalysisContexts (or Contexts)..."
// "Scope" reserved for EvidenceScope (per-evidence source methodology)
```

### Pitfall 3: Missing Glossary

❌ **Wrong** (No term definitions in prompt):
```
"Extract the scopes from evidence."
// Ambiguous: Does "scope" mean AnalysisContext or EvidenceScope?
```

✅ **Correct** (Explicit glossary with CRITICAL distinction):
```
## TERMINOLOGY (CRITICAL)
- **AnalysisContext** (or "Context"): Top-level analytical frame requiring separate verdict
- **EvidenceScope** (or "Scope"): Per-fact source methodology metadata (NOT an AnalysisContext)
```

---

## Migration Notes (v2.6 → v2.7)

### Phase 1: Update Prompts
- Search for all instances of "distinctProceedings" in prompts
- Replace with "analysisContexts"
- Update prompt glossaries to use new terminology

### Phase 2: Update Zod Schemas
```typescript
// Before (v2.6) - legacy naming
const ScopeSchema = z.object({  // Note: "Scope" here meant AnalysisContext (legacy)
  distinctProceedings: z.array(AnalysisContextSchema),
  // ...
});

// After (v2.7+) - clear naming
const ContextRefinementSchema = z.object({  // Renamed for clarity
  analysisContexts: z.array(AnalysisContextSchema),
  // ...
});
```

> **Note (v2.6.39)**: Legacy code may still use "Scope" to mean AnalysisContext. New code should use "Context" for AnalysisContext and "Scope" only for EvidenceScope.

### Phase 3: Update LLM Output Parsing
```typescript
// Before
const contexts = llmOutput.distinctProceedings;

// After
const contexts = llmOutput.analysisContexts;
```

---

## Testing Checklist

When updating prompts or schemas:

- [ ] Prompt terminology matches Zod field names exactly
- [ ] Glossary section present in all base prompts
- [ ] Provider-specific variants use same core terms
- [ ] Example outputs in prompts match schema structure
- [ ] Validation errors are descriptive (mention expected vs actual field names)
- [ ] Documentation updated (this file, TERMINOLOGY.md)

---

## References

- [TERMINOLOGY.md](./TERMINOLOGY.md) - Core definitions
- [Prompt_Engineering_Standards.md](./Prompt_Engineering_Standards.md) - How to write prompts
- [types.ts](../../apps/web/src/lib/analyzer/types.ts) - TypeScript interfaces
- Migration decision documented in `types.ts` comments and `TERMINOLOGY.md`

---

**Maintainer**: LLM Expert, Prompt Engineering Team  
**Last Updated**: 2026-01-20  
**Next Review**: After next major version
