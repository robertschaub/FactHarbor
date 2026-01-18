# Scope/Context Terminology - Master Quick Reference

**Version**: 2.0 (Pre-v2.7.0)  
**Purpose**: Single-page quick lookup for developers  
**Print This**: Keep handy during development  

---

## 🎯 One-Sentence Definitions

| Term | Definition |
|------|------------|
| **AnalysisContext** | Top-level uncomparable verdict space requiring separate analysis |
| **EvidenceScope** | Per-fact source methodology metadata (how source computed data) |
| **ArticleFrame** | Narrative background framing (NOT a reason to split contexts) |
| **contextId** | Reference to which AnalysisContext a fact/verdict belongs to |

---

## 📊 Quick Lookup Table

| Concept | TypeScript Type | JSON Field (CURRENT) | JSON Field (TARGET v2.7) | Prompt Term |
|---------|----------------|---------------------|-------------------------|-------------|
| Top-level context | `AnalysisContext` | `distinctProceedings` | `analysisContexts` | "AnalysisContext" |
| Per-fact metadata | `EvidenceScope` | `evidenceScope` | `evidenceScope` | "EvidenceScope" |
| Context reference | `string` | `relatedProceedingId` | `contextId` | "contextId" |
| Verdict reference | `string` | `proceedingId` | `contextId` | "contextId" |

---

## 🚦 When to Use What

### Use AnalysisContext When:
✅ Different legal jurisdictions (TSE vs SCOTUS)  
✅ Different methodological boundaries (WTW vs TTW)  
✅ Different regulatory frameworks (EU vs US standards)  
✅ Verdicts are **uncomparable** (cannot be averaged or combined)  

### Use EvidenceScope When:
✅ Documenting **source methodology** (ISO 14040, GREET Model)  
✅ Noting **geographic boundaries** (EU, California, China)  
✅ Specifying **temporal period** (2020-2025 data)  
✅ Clarifying **analytical boundaries** (primary energy to wheel)  

### Do NOT Create Separate Contexts For:
❌ Different viewpoints (pro vs con - these are perspectives)  
❌ Different studies (multiple sources can analyze same context)  
❌ Different time periods alone (temporal differences aren't contexts)  
❌ Different narrative framings (political vs technical presentation)  

---

## 🎨 Example: Multi-Context Scenario

**User Input**: "Compare TSE Brazil electoral ruling on Bolsonaro to SCOTUS Colorado case on Trump ballot eligibility"

### AnalysisContexts (2):
```json
{
  "analysisContexts": [
    {
      "id": "CTX_TSE",
      "name": "TSE Electoral Proceeding - Bolsonaro",
      "shortName": "TSE Brazil",
      "metadata": {
        "institution": "Superior Electoral Court",
        "jurisdiction": "Brazil Federal",
        "temporal": "2022"
      }
    },
    {
      "id": "CTX_SCOTUS",
      "name": "SCOTUS Colorado Ballot Case - Trump",
      "shortName": "SCOTUS USA",
      "metadata": {
        "institution": "Supreme Court of the United States",
        "jurisdiction": "USA Federal",
        "temporal": "2024"
      }
    }
  ]
}
```

### EvidenceScope (on a fact):
```json
{
  "facts": [
    {
      "id": "F1",
      "fact": "TSE ruled Bolsonaro ineligible for 8 years",
      "contextId": "CTX_TSE",  // ⬅️ Which context this fact belongs to
      "evidenceScope": {       // ⬅️ Source methodology
        "name": "Brazilian Electoral Law",
        "methodology": "Lei 9.504/97",
        "geographic": "Brazil",
        "temporal": "2022"
      }
    }
  ]
}
```

---

## 🔍 Common Pitfalls Cheat Sheet

| ❌ Wrong | ✅ Right | Why |
|---------|---------|-----|
| "Scope" (ambiguous) | "AnalysisContext" or "EvidenceScope" (specify) | "Scope" is overloaded |
| `distinctProceedings` (legacy) | `analysisContexts` (v2.7+) | Field name mismatch |
| `relatedProceedingId` (legacy) | `contextId` (v2.7+) | Inconsistent naming |
| "framework" (architectural) | "context" | Framework = descriptive only |
| Creating context per study | One context, multiple sources | Studies often analyze same context |

---

## 🏗️ Architecture Hierarchy

```
FactHarbor Analysis Result
├── AnalysisContexts[]           ← TOP-LEVEL (uncomparable verdict spaces)
│   ├── CTX_TSE
│   └── CTX_SCOTUS
├── Facts[]
│   ├── fact.contextId           ← References which AnalysisContext
│   └── fact.evidenceScope       ← Source methodology metadata
└── Verdicts[]
    ├── verdict.contextId        ← Per-context verdict
    └── verdict.keyFactors[]
```

---

## 🛠️ Developer Quick Commands

### Search for Legacy Terms (Pre-v2.7)
```bash
# Find old field names
grep -r "distinctProceedings" apps/web/src
grep -r "relatedProceedingId" apps/web/src
grep -r "proceedingId" apps/web/src | grep -v "// legacy"
```

### Validate New Schema (Post-v2.7)
```bash
# Ensure no legacy terms remain
grep -r "distinctProceedings" apps/web/src && echo "FOUND LEGACY TERMS!" || echo "Clean!"
```

---

## 📝 Prompt Engineering Quick Rules

1. **Always include glossary** in base prompts
2. **Use "AnalysisContext"** not "Proceeding" or ambiguous "Scope"
3. **Distinguish AnalysisContext from EvidenceScope** explicitly
4. **Use "contextId"** not "proceedingId" (v2.7+)
5. **Never use "framework"** for architectural concepts

### Prompt Template Glossary Header
```markdown
## TERMINOLOGY (CRITICAL)

- **AnalysisContext**: Top-level uncomparable verdict space (output as analysisContexts)
- **EvidenceScope**: Per-fact source methodology metadata
- **ArticleFrame**: Narrative framing (NOT a reason to split contexts)
```

---

## 🧪 Testing Checklist

When writing/updating code:

- [ ] Used `AnalysisContext` type (not `DistinctProceeding`)
- [ ] Used `contextId` field (not `relatedProceedingId` or `proceedingId`)
- [ ] Used `analysisContexts` JSON field (not `distinctProceedings`)
- [ ] Included glossary in any new prompts
- [ ] Validated schema with Zod
- [ ] Tested with multi-context input

---

## 🎓 Decision Tree: Create New Context?

```
Is there a distinct analytical frame?
├─ YES: Different jurisdictions? → AnalysisContext
├─ YES: Different methodologies? → AnalysisContext
├─ YES: Different regulations? → AnalysisContext
└─ NO: Just different sources/viewpoints/times? → Same AnalysisContext

Is this about source methodology?
├─ YES: Document in EvidenceScope (per-fact)
└─ NO: Not an EvidenceScope
```

---

## 📚 Related Documentation

| Need | See Document |
|------|--------------|
| Full definitions | [TERMINOLOGY.md](./TERMINOLOGY.md) |
| LLM mappings | [LLM_Schema_Mapping.md](./LLM_Schema_Mapping.md) |
| Migration plan | [Database_Schema_Migration_v2.7.md](../ARCHITECTURE/Database_Schema_Migration_v2.7.md) |
| Review guide | [Architect_Review_Guide_Terminology.md](../DEVELOPMENT/Architect_Review_Guide_Terminology.md) |

---

## 🚨 Breaking Changes Alert (v2.6 → v2.7)

If upgrading from v2.6.x:

⚠️ **JSON Schema Changed**  
⚠️ **Database Migration Required**  
⚠️ **Old Jobs Must Be Migrated**  

See: [Database_Schema_Migration_v2.7.md](../ARCHITECTURE/Database_Schema_Migration_v2.7.md)

---

**Keep This Handy**: Bookmark this page or print for quick reference during development.

**Last Updated**: 2026-01-18  
**Maintained By**: Lead Developer, LLM Expert
