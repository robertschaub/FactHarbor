# Context vs Scope: Critical Terminology Distinction

## Overview

FactHarbor uses two distinct concepts that must **NEVER** be confused:

1. **AnalysisContext** - Top-level analytical frames
2. **EvidenceScope** - Per-evidence source metadata

This document explains the difference and why it matters.

---

## AnalysisContext (Top-Level Analytical Frame)

### What It Is
An **AnalysisContext** is a bounded analytical frame that requires separate analysis and produces its own verdict.

### Examples
- **Legal domain**: Different court cases (TSE Electoral vs STF Criminal)
- **Scientific domain**: Different methodologies (Well-to-Wheel vs Tank-to-Wheel)
- **Regulatory domain**: Different jurisdictions (US EPA vs EU REACH)
- **Temporal domain**: Different time periods (2020 study vs 2024 study)
- **Geographic domain**: Different regions (California vs Texas laws)

### Key Characteristics
- Each context gets its own verdict/assessment
- Contexts are shown as separate cards in the UI
- Contexts answer potentially different questions
- Contexts cannot be directly compared (apples vs oranges)
- Stored in `analysisContexts` array (plural)

### Type Definition
```typescript
export interface AnalysisContext {
  id: string;                    // e.g., "CTX_TSE", "CTX_WTW"
  name: string;                  // e.g., "Electoral proceeding (TSE)"
  shortName: string;             // e.g., "TSE Electoral"
  subject: string;               // What's being analyzed
  temporal: string;              // Time period
  status: "concluded" | "ongoing" | "pending" | "unknown";
  outcome: string;               // Result/conclusion
  assessedStatement?: string;    // What is being assessed
  metadata: {                    // Domain-specific details
    institution?: string;
    methodology?: string;
    boundaries?: string;
    geographic?: string;
    // ... other domain-specific fields
  };
}
```

### When to Create Multiple AnalysisContexts
Split into multiple contexts when:
- Evidence references different formal authorities (courts, institutions)
- Evidence uses different system boundaries (full-cycle vs use-phase)
- Evidence covers different regulatory frameworks
- Evidence analyzes different time periods that aren't comparable
- Combining verdicts would be misleading

**Do NOT split** when:
- Different viewpoints on same event (pro vs con)
- Different evidence types (quotes vs statistics)
- Incidental geographic/temporal mentions
- Same analytical frame with different perspectives

---

## EvidenceScope (Per-Evidence Source Metadata)

### What It Is
An **EvidenceScope** describes the methodology, boundaries, geography, and timeframe that a **SOURCE DOCUMENT** used when producing its evidence.

### Examples
- A study measured "full lifecycle emissions" (EvidenceScope: methodology="ISO 14040", boundaries="cradle to grave")
- A report covered "European Union data" (EvidenceScope: geographic="EU", temporal="2020-2023")
- An analysis used "direct use only" (EvidenceScope: boundaries="tank to wheel")

### Key Characteristics
- Attached to individual evidence items (not to contexts)
- Describes how the SOURCE computed/bounded its data
- Used to ensure apples-to-apples comparisons
- Multiple evidence items can share the same EvidenceScope
- Stored in `evidenceItem.evidenceScope` (singular, per-item)

### Type Definition
```typescript
export interface EvidenceScope {
  name: string;           // e.g., "WTW", "TTW", "EU-LCA"
  methodology?: string;   // e.g., "ISO 14040", "EU RED II"
  boundaries?: string;    // e.g., "Primary energy to wheel"
  geographic?: string;    // e.g., "European Union", "California"
  temporal?: string;      // e.g., "2020-2025", "FY2024"
  sourceType?: SourceType; // e.g., "peer_reviewed_study"
}
```

### When to Use EvidenceScope
- Documenting source methodology
- Capturing system boundaries from studies
- Recording geographic/temporal scope of data
- Ensuring evidence compatibility during comparison
- Calibrating source reliability based on type

---

## Critical Distinction

| Aspect | AnalysisContext | EvidenceScope |
|--------|----------------|---------------|
| **Level** | Top-level | Per-evidence item |
| **Purpose** | Separate analysis frames | Source methodology metadata |
| **Gets verdict?** | Yes | No |
| **UI display** | Context cards | Metadata badges |
| **Quantity** | Few (1-5 typically) | Many (one per evidence item) |
| **Field name** | `analysisContexts[]` | `evidenceItem.evidenceScope` |
| **Assignment** | `factContextAssignments` | N/A (attached directly) |

---

## Terminology Rules (CRITICAL)

### ✅ CORRECT Usage

- **"Context" or "AnalysisContext"** - when referring to top-level analytical frames
- **"EvidenceScope"** - when referring to per-evidence source metadata
- **`factContextAssignments`** - mapping evidence to contexts
- **`claimContextAssignments`** - mapping claims to contexts

### ❌ INCORRECT Usage (NEVER DO THIS)

- ~~"Scope"~~ when you mean AnalysisContext
- ~~"Context"~~ when you mean EvidenceScope (unless fully qualified as "EvidenceScope")
- ~~`factScopeAssignments`~~ (old name, renamed in v2.9)
- ~~`claimScopeAssignments`~~ (old name, renamed in v2.9)

### Variable Naming Conventions

```typescript
// ✅ GOOD
const contexts = understanding.analysisContexts;
const evidenceScope = extractedFact.evidenceScope;
const assignments = refinement.factContextAssignments;

// ❌ BAD
const scopes = understanding.analysisContexts;  // Confusing!
const context = extractedFact.evidenceScope;   // Wrong!
const assignments = refinement.factScopeAssignments; // Old name!
```

---

## Examples

### Example 1: Legal Domain

**User Input**: "Was Politician X convicted in the corruption trial?"

**AnalysisContexts** (2):
1. `CTX_CRIMINAL` - Federal Criminal Court proceedings
2. `CTX_ELECTORAL` - Electoral Court proceedings

Each context gets its own verdict because they evaluate different legal questions.

**EvidenceScopes** (attached to individual evidence items):
- Evidence #1: `evidenceScope: { methodology: "Federal criminal procedure", temporal: "2023-2024" }`
- Evidence #2: `evidenceScope: { methodology: "Electoral law framework", temporal: "2024" }`

### Example 2: Scientific Domain

**User Input**: "Is electric vehicle A more efficient than vehicle B?"

**AnalysisContexts** (2):
1. `CTX_WTW` - Well-to-Wheel analysis (full energy chain)
2. `CTX_TTW` - Tank-to-Wheel analysis (use phase only)

Each context gets its own verdict because they measure different things.

**EvidenceScopes** (attached to individual evidence items):
- Evidence #1: `evidenceScope: { methodology: "ISO 14040", boundaries: "Primary energy to wheel", geographic: "EU" }`
- Evidence #2: `evidenceScope: { methodology: "SAE J2841", boundaries: "Fuel tank to wheel motion", geographic: "US" }`

---

## Migration Notes (v2.9)

### What Changed
- `factScopeAssignments` → `factContextAssignments`
- `claimScopeAssignments` → `claimContextAssignments`

### Why Changed
The old names violated AGENTS.md terminology rules by using "Scope" to refer to AnalysisContexts. The new names correctly indicate that these assignments map to **contexts**, not scopes.

### Impact
- **Code changes**: Updated in orchestrated.ts and all LLM provider prompts
- **Backward compatibility**: JSON field names changed; old analyses may need migration
- **LLM behavior**: Prompts now use consistent terminology, reducing confusion

---

## References

- [AGENTS.md](../../AGENTS.md) - Core terminology rules
- [types.ts](../../apps/web/src/lib/analyzer/types.ts) - Type definitions
- [scope-refinement-base.ts](../../apps/web/src/lib/analyzer/prompts/base/scope-refinement-base.ts) - Prompt template

---

**Last Updated**: v2.9 (2026-02-01)
**Author**: Copilot Agent (terminology clarification initiative)
