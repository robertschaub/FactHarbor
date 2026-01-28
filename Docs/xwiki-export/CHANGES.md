# Terminology Fix - Change Summary

## Critical Changes

### 1. Entity Name: `EXTRACTED_FACT` → `EVIDENCE`

**Data Usage ERD (lines 215-302)**
```diff
- ANALYSIS_RESULT ||--o{ EXTRACTED_FACT : "contains"
- CLAIM_VERDICT }o--o{ EXTRACTED_FACT : "supported by"
- FETCHED_SOURCE ||--o{ EXTRACTED_FACT : "provides"
+ ANALYSIS_RESULT ||--o{ EVIDENCE : "contains"
+ CLAIM_VERDICT }o--o{ EVIDENCE : "supported by"
+ FETCHED_SOURCE ||--o{ EVIDENCE : "provides"

- EXTRACTED_FACT {
+ EVIDENCE {
```

**Data Objects ERD** already used `EVIDENCE` — no change needed.

### 2. Field Name: `fact` → `statement`

**Both ERDs (lines 188, 291)**
```diff
EVIDENCE {
    string id PK "S1-F1, S1-F2 format"
-   string fact "The factual statement extracted"
+   string statement "The extracted statement text"
    string category "..."
}
```

### 3. Category Value: `"evidence"` → `"direct_evidence"`

**Both ERDs (lines 189, 292)**
```diff
EVIDENCE {
-   string category "legal_provision | evidence | expert_quote | statistic | event | criticism"
+   string category "legal_provision | direct_evidence | expert_quote | statistic | event | criticism"
}
```

### 4. Field Name in CLAIM_VERDICT: `supportingFactIds` → `supportingEvidenceIds`

**Data Objects ERD (line 158), Data Usage ERD (line 273)**
```diff
CLAIM_VERDICT {
-   string_array supportingFactIds "Evidence IDs supporting this"
+   string_array supportingEvidenceIds "Evidence IDs supporting this"
}
```

### 5. Added Terminology Note

**Top of document (lines 8-10)**
```diff
+ {{info}}
+ **Terminology Note:** This document uses "Evidence" as the entity name for extracted information from sources. In the current POC1 codebase, this is implemented as `ExtractedFact` (TypeScript interface). The term "Evidence" more accurately reflects that these items are extracted material to be evaluated, not verified facts. See `Docs/REVIEWS/Terminology_Audit_Fact_Entity.md` for migration plans.
+ {{/info}}
```

### 6. Updated Last Modified Date

**Header (line 6)**
```diff
**Document Purpose:** Technical diagrams, gap analysis, and optimization recommendations
+ **Last Updated:** 2026-01-28 (Terminology corrections applied)
```

## Files Created/Modified

| File | Type | Description |
|------|------|-------------|
| `Docs/FactHarbor POC1 Architecture Analysis.xwiki` | Modified | Source xWiki file with corrections |
| `Docs/FactHarbor POC1 Architecture Analysis.md` | Created | Markdown conversion |
| `Docs/REVIEWS/Terminology_Audit_Fact_Entity.md` | Modified | Added Section 2.2 documenting xWiki inconsistency |
| `Docs/xwiki-export/FactHarbor-POC1-Architecture-Terminology-Fix.xar` | Created | Delta export (5.1 KB) |
| `Docs/xwiki-export/README.md` | Created | Import instructions |
| `Docs/xwiki-export/CHANGES.md` | Created | This file |

## Impact

- **Documentation:** Fixed internal inconsistency (2 names for 1 entity)
- **Code:** No changes (TypeScript still uses `ExtractedFact`)
- **Next Steps:** See Terminology Audit Section 6 for phased code migration plan

## Verification

```bash
# View ERD changes
grep -A 20 "erDiagram" "Docs/FactHarbor POC1 Architecture Analysis.xwiki"

# Check for remaining "EXTRACTED_FACT" references (should be 0)
grep -c "EXTRACTED_FACT" "Docs/FactHarbor POC1 Architecture Analysis.xwiki"

# Check for "EVIDENCE" references (should be multiple)
grep -c "EVIDENCE" "Docs/FactHarbor POC1 Architecture Analysis.xwiki"
```
