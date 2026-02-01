# When Are AnalysisContexts Defined?

**Version**: 2.8.3  
**Last Updated**: February 1, 2026  
**Status**: Active Documentation

---

## Quick Answer

**AnalysisContexts are defined in TWO phases:**

1. **UNDERSTAND Phase** (Step 1) - Initial detection from input text
2. **SCOPE_REFINEMENT Phase** (Step 4) - Refinement based on research evidence

Both phases use LLM calls, but the second phase is optional and only runs when sufficient evidence is available.

---

## Timeline: When Detection Happens

```mermaid
flowchart TB
    START[User Input] --> NORMALIZE[Input Normalization]
    NORMALIZE --> UNDERSTAND[Step 1: UNDERSTAND]
    
    subgraph Phase1["Phase 1: Initial Detection"]
        UNDERSTAND --> HEURISTIC[Heuristic Pre-detection<br/>detectScopes()]
        HEURISTIC --> LLM1[LLM Call: understandClaim<br/>🤖 Context Detection]
        LLM1 --> CANON[Canonicalization<br/>canonicalizeScopes()]
        CANON --> INITIAL[Initial AnalysisContexts]
    end
    
    INITIAL --> RESEARCH[Steps 2-3: RESEARCH]
    RESEARCH --> FACTS[Evidence Collection]
    
    subgraph Phase2["Phase 2: Evidence-Based Refinement (Optional)"]
        FACTS --> CHECK{Sufficient Evidence?<br/>≥6-8 facts}
        CHECK -->|No| SKIP[Skip Refinement]
        CHECK -->|Yes| LLM2[LLM Call: refineScopesFromEvidence<br/>🤖 Context Discovery from EvidenceScope]
        LLM2 --> MERGE[Merge/Split Logic]
        MERGE --> FINAL[Final AnalysisContexts]
        SKIP --> FINAL
    end
    
    FINAL --> VERDICT[Steps 5-7: VERDICT & REPORT]
```

---

## Phase 1: Initial Detection (UNDERSTAND)

### When It Runs
- **Pipeline Step**: Step 1 (UNDERSTAND phase)
- **Function**: `understandClaim()` in `apps/web/src/lib/analyzer/orchestrated.ts`
- **Line**: ~3374-4532
- **Trigger**: Always runs (required for all analyses)

### What It Does

**1. Heuristic Pre-detection** (before LLM):
```typescript
// apps/web/src/lib/analyzer/scopes.ts
const preDetectedScopes = detectScopes(analysisInput);
```
- Looks for patterns in input text (comparisons, jurisdictions, methodologies)
- Provides "hints" to the LLM
- Example: "X vs Y" → suggests 2 contexts

**2. LLM Context Detection**:
```typescript
// LLM prompt includes:
"Identify distinct AnalysisContexts requiring separate evaluation"
```
- LLM analyzes input for distinct analytical frames
- Considers: comparisons, multiple jurisdictions, different methodologies
- Returns: `analysisContexts` array (can be empty for single-context analyses)

**3. Canonicalization**:
```typescript
// apps/web/src/lib/analyzer/scopes.ts
parsed = canonicalizeScopes(analysisInput, parsed);
```
- Standardizes context IDs (e.g., "TSE" → "CTX_TSE")
- Ensures consistency
- Handles edge cases (empty array → default "CTX_MAIN")

### Example Output

For input: **"Was the TSE trial fair?"**

```json
{
  "analysisContexts": [
    {
      "id": "CTX_TSE",
      "name": "TSE Electoral Ruling",
      "shortName": "TSE",
      "subject": "Electoral proceeding fairness",
      "temporal": "2023",
      "status": "concluded"
    }
  ]
}
```

For input: **"Is hydrogen more efficient than electric?"**

```json
{
  "analysisContexts": [
    {
      "id": "CTX_HYDROGEN",
      "name": "Hydrogen Efficiency",
      "shortName": "Hydrogen"
    },
    {
      "id": "CTX_ELECTRIC", 
      "name": "Electric Efficiency",
      "shortName": "Electric"
    }
  ]
}
```

---

## Phase 2: Evidence-Based Refinement (SCOPE_REFINEMENT)

### When It Runs
- **Pipeline Step**: Step 4 (between RESEARCH and VERDICT)
- **Function**: `refineScopesFromEvidence()` in `apps/web/src/lib/analyzer/orchestrated.ts`
- **Line**: ~116-587
- **Trigger**: Only if ≥6-8 facts collected (threshold varies by mode)

### What It Does

**1. Checks Evidence Threshold**:
```typescript
const config = getActiveConfig(state.pipelineConfig);
const minRefineFacts = Math.min(8, config.minFactsRequired);
if (facts.length < minRefineFacts) {
  // Skip refinement - not enough evidence
  return { updated: false, llmCalls: 0 };
}
```

**2. Analyzes EvidenceScope Patterns**:
- Looks at `fact.evidenceScope` metadata from all extracted facts
- Identifies incompatible boundaries/methodologies
- Example: Some facts have `evidenceScope.name = "WTW"`, others have `"TTW"`

**3. LLM Refinement**:
```typescript
// LLM prompt includes:
"Look for patterns in fact.evidenceScope that suggest distinct analytical frames"
"Create separate AnalysisContexts when EvidenceScope patterns show 
Evidence answering DIFFERENT QUESTIONS"
```

**4. Validation & Application**:
- Ensures each context has supporting facts
- Reconciles any orphaned fact assignments
- Updates `state.understanding.analysisContexts`

### Example: When Refinement Adds Contexts

**Initial (Phase 1)**: Input "Is hydrogen more efficient?"
```json
{
  "analysisContexts": [
    { "id": "CTX_MAIN", "name": "Hydrogen Efficiency" }
  ]
}
```

**After Research**: Evidence shows two distinct methodologies:
```json
{
  "facts": [
    { 
      "statement": "Hydrogen achieves 40% efficiency",
      "evidenceScope": { "name": "WTW", "methodology": "Well-to-Wheel" }
    },
    {
      "statement": "Hydrogen achieves 85% efficiency",
      "evidenceScope": { "name": "TTW", "methodology": "Tank-to-Wheel" }
    }
  ]
}
```

**After Refinement (Phase 2)**:
```json
{
  "analysisContexts": [
    {
      "id": "CTX_WTW",
      "name": "Well-to-Wheel Analysis",
      "shortName": "WTW"
    },
    {
      "id": "CTX_TTW",
      "name": "Tank-to-Wheel Analysis",
      "shortName": "TTW"
    }
  ]
}
```

---

## When NOT to Create Separate AnalysisContexts

The system follows these rules to avoid over-splitting:

### Single Context (Phase 1)
- Input has no comparison keywords ("vs", "compared to")
- Input mentions single jurisdiction/methodology
- LLM determines one analytical frame is sufficient

### Skip Refinement (Phase 2)
- Insufficient evidence collected (< 6-8 facts)
- EvidenceScope patterns are compatible
- Evidence doesn't reveal new incompatible boundaries

### Example: Same Context Despite Multiple Sources

**Input**: "Was the TSE trial fair?"

**Evidence from multiple sources**:
```json
{
  "facts": [
    { "statement": "TSE applied standard procedures", "source": "Legal analysis" },
    { "statement": "Defense had adequate time", "source": "Court records" },
    { "statement": "Judge followed protocol", "source": "News report" }
  ]
}
```

**Result**: Single context maintained (all evidence relates to same proceeding)

---

## Configuration & Thresholds

### Refinement Thresholds

```typescript
// apps/web/src/lib/analyzer/config.ts
const config = {
  quick: {
    minFactsRequired: 6  // Refinement needs ≥6 facts
  },
  deep: {
    minFactsRequired: 8  // Refinement needs ≥8 facts
  }
};
```

### Environment Variables

| Variable | Default | Effect on Context Detection |
|----------|---------|----------------------------|
| `FH_DETERMINISTIC` | `true` | Enforces seed scopes for comparisons |
| `FH_ENABLE_SCOPE_NAME_ALIGNMENT` | `true` | Aligns context names with EvidenceScope |
| `FH_ANALYSIS_MODE` | `quick` | Sets minimum facts for refinement |

---

## Decision Tree: Will Context Be Created?

```
START: User provides input
  │
  ├─ PHASE 1: Initial Detection (always runs)
  │   │
  │   ├─ Heuristic detects comparison? (e.g., "X vs Y")
  │   │   └─ YES → Seed 2+ contexts
  │   │
  │   ├─ LLM detects distinct frames? (from input text)
  │   │   └─ YES → Create multiple contexts
  │   │
  │   └─ Fallback: Single context (CTX_MAIN)
  │
  └─ PHASE 2: Refinement (conditional)
      │
      ├─ Research collected < 6-8 facts?
      │   └─ YES → Skip refinement, use Phase 1 contexts
      │
      ├─ EvidenceScope patterns show incompatible boundaries?
      │   │
      │   ├─ YES → LLM may split/merge contexts
      │   │   └─ Validation: Each context must have ≥1 fact
      │   │
      │   └─ NO → Keep Phase 1 contexts unchanged
      │
      └─ RESULT: Final AnalysisContexts for verdict generation
```

---

## Code References

### Key Files

| File | Function | Purpose |
|------|----------|---------|
| `apps/web/src/lib/analyzer/orchestrated.ts` | `understandClaim()` | Phase 1: Initial detection |
| `apps/web/src/lib/analyzer/orchestrated.ts` | `refineScopesFromEvidence()` | Phase 2: Evidence-based refinement |
| `apps/web/src/lib/analyzer/scopes.ts` | `detectScopes()` | Heuristic pre-detection |
| `apps/web/src/lib/analyzer/scopes.ts` | `canonicalizeScopes()` | ID standardization |

### Key Prompts

| Prompt File | Purpose |
|-------------|---------|
| `apps/web/src/lib/analyzer/prompts/base/orchestrated-understand.ts` | Phase 1 context detection instructions |
| `apps/web/src/lib/analyzer/prompts/base/scope-refinement-base.ts` | Phase 2 refinement instructions |

### Pipeline Flow (High-Level)

```typescript
// Step 1: UNDERSTAND (Phase 1)
const understanding = await understandClaim(input, model);
// understanding.analysisContexts = initial contexts

// Steps 2-3: RESEARCH
const facts = await doResearch(understanding);

// Step 4: SCOPE_REFINEMENT (Phase 2)
const refinement = await refineScopesFromEvidence(state, model);
// May update state.understanding.analysisContexts

// Steps 5-7: VERDICT & REPORT
// Use final analysisContexts for verdict generation
```

---

## Frequently Asked Questions

### Q: Can contexts be merged during refinement?

**A**: Yes. If Phase 1 created separate contexts but evidence shows they're actually the same, Phase 2 can merge them. However, this is rare because Phase 1 is generally conservative.

### Q: Can contexts be added after refinement?

**A**: No. Once verdict generation starts (Step 5), contexts are locked. All context changes must happen in Phase 1 or Phase 2.

### Q: What if no contexts are detected?

**A**: The system always creates at least one default context (`CTX_MAIN`) to ensure verdicts can be generated.

### Q: How does this differ from EvidenceScope?

**A**: 
- **AnalysisContexts** = Top-level frames defined in Phases 1-2, require separate verdicts
- **EvidenceScope** = Per-fact metadata extracted during research (Steps 2-3)
- **Timing**: EvidenceScope is collected *during* research, AnalysisContexts are defined *before* (Phase 1) and *after* (Phase 2) research

### Q: Why two phases instead of one?

**A**: 
- **Phase 1** uses input text alone → may miss contexts that only become clear from evidence
- **Phase 2** uses evidence patterns → discovers contexts revealed by source methodology differences
- **Together**: Balanced approach - initial structure from input, refinement from evidence

---

## Related Documentation

- [Context Detection via EvidenceScope](Context_Detection_via_EvidenceScope.md) - Principle-based detection approach
- [TERMINOLOGY.md](../REFERENCE/TERMINOLOGY.md) - AnalysisContext vs EvidenceScope definitions
- [Scope Definition Guidelines](../DEVELOPMENT/Scope_Definition_Guidelines.md) - When to create contexts
- [Overview.md](Overview.md) - Pipeline architecture
- [types.ts](../../apps/web/src/lib/analyzer/types.ts) - AnalysisContext interface definition

---

## Examples

### Example 1: Single Context (No Refinement)

**Input**: "Is climate change real?"

**Phase 1 Output**:
```json
{
  "analysisContexts": [
    { "id": "CTX_MAIN", "name": "Climate Change Reality" }
  ]
}
```

**Research**: 10 facts collected, all compatible methodologies

**Phase 2**: Skipped (no incompatible boundaries detected)

**Final**: Single context maintained

---

### Example 2: Comparison (Initial Split)

**Input**: "Hydrogen vs electric: which is more efficient?"

**Phase 1 Output**:
```json
{
  "analysisContexts": [
    { "id": "CTX_HYDROGEN", "name": "Hydrogen Efficiency" },
    { "id": "CTX_ELECTRIC", "name": "Electric Efficiency" }
  ]
}
```

**Research**: 12 facts collected

**Phase 2**: Refinement runs, validates both contexts have supporting evidence

**Final**: Two contexts maintained

---

### Example 3: Hidden Split (Refinement Discovers)

**Input**: "Is hydrogen efficient?"

**Phase 1 Output**:
```json
{
  "analysisContexts": [
    { "id": "CTX_MAIN", "name": "Hydrogen Efficiency" }
  ]
}
```

**Research**: 15 facts collected, mix of WTW and TTW data with incompatible boundaries

**Phase 2**: Refinement detects EvidenceScope patterns, splits into:
```json
{
  "analysisContexts": [
    { "id": "CTX_WTW", "name": "Well-to-Wheel Efficiency" },
    { "id": "CTX_TTW", "name": "Tank-to-Wheel Efficiency" }
  ]
}
```

**Final**: Two contexts created by refinement

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-01 | Initial documentation creation |

---

**Document Status**: Active - answers "When are AnalysisContexts defined?" with clear timeline and examples
