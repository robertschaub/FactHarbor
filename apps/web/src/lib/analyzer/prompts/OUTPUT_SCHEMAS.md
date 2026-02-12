# LLM Output Schemas Reference

Centralized JSON schema documentation for all LLM prompt phases.

**Version**: 3.1
**Last Updated**: 2026-02-05

---

## Terminology

| Term | Definition |
|------|------------|
| **AnalysisContext** | Top-level analytical frame requiring separate verdict (e.g., "System A" vs "System B") |
| **EvidenceScope** | Per-evidence source methodology metadata (boundaries, jurisdiction, time period) |
| **Evidence Item** | Extracted statement from source with metadata (uses `evidenceItems[]` array) |

---

## 1. UNDERSTAND Phase Output

**Purpose**: Extract claims, detect AnalysisContexts, generate search queries.

### Schema

```typescript
interface UnderstandOutput {
  impliedClaim: string;              // Neutral summary of input claim
  articleThesis: string;             // What input asserts (neutral language)
  backgroundDetails: string | null;  // Background info (NOT an AnalysisContext)

  subClaims: SubClaim[];
  researchQueries: ResearchQuery[];
  analysisContexts: AnalysisContext[];
  requiresSeparateAnalysis: boolean;
}

interface SubClaim {
  id: string;                        // "C1", "C2", etc.
  text: string;                      // Atomic claim text
  claimRole: "attribution" | "source" | "timing" | "core";
  centrality: "high" | "medium" | "low";
  isCentral: boolean;                // true if centrality is "high"
  thesisRelevance: "direct" | "tangential" | "irrelevant";
  checkWorthiness: "high" | "medium" | "low";
  harmPotential: "high" | "medium" | "low";
  dependsOn?: string[];              // Claim IDs this depends on
}

interface ResearchQuery {
  query: string;
  contextHint?: string;              // AnalysisContext hint (e.g., "CTX:A - ...")
}

interface AnalysisContext {
  id: string;                        // "CTX_A", "CTX_B", etc.
  name: string;                      // Human-readable name
  type: "legal" | "scientific" | "methodological" | "general";
}
```

### Field Rules

| Field | Constraint |
|-------|------------|
| `subClaims` | 3-6 claims typical; compound claims MUST be split |
| `researchQueries` | 4-6 diverse queries |
| `harmPotential` | Default to "medium" if uncertain |
| `thesisRelevance` | Most claims should be "direct" |

---

## 2. EXTRACT_EVIDENCE Phase Output

**Purpose**: Extract evidence items from sources with metadata.

### Schema

```typescript
interface ExtractEvidenceOutput {
  evidenceItems: EvidenceItem[];
}

interface EvidenceItem {
  id: string;                        // "E1", "E2", etc. (E-prefix required)
  statement: string;                 // One sentence, ≤100 chars
  category: EvidenceCategory;
  specificity: "high" | "medium";    // LOW not allowed in output
  sourceExcerpt: string;             // 50-200 chars, verbatim from source
  claimDirection: "supports" | "contradicts" | "neutral";
  contextId: string;                 // AnalysisContext ID or ""
  probativeValue: "high" | "medium"; // LOW items should not be extracted
  sourceAuthority: "primary" | "secondary" | "opinion";
  evidenceBasis: "scientific" | "documented" | "anecdotal" | "theoretical" | "pseudoscientific";
  evidenceScope: EvidenceScope | null;
}

type EvidenceCategory =
  | "direct_evidence"   // PREFERRED - general evidence
  | "evidence"          // Legacy (accepted but prefer direct_evidence)
  | "expert_quote"      // Statement from expert/authority
  | "statistic"         // Numbers, percentages, quantitative data
  | "event"             // Historical occurrence with date/place
  | "legal_provision"   // Law, ruling, regulation text
  | "criticism";        // Counter-argument or opposing view

interface EvidenceScope {
  name: string;                      // Short label for analytical boundary
  methodology: string;               // Standard/framework used
  boundaries: string;                // What's included/excluded
  geographic?: string;               // Geographic scope
  temporal?: string;                 // Time period
  sourceType?: SourceType;           // Classification of source type
}

type SourceType =
  | "peer_reviewed_study"
  | "fact_check_report"
  | "government_report"
  | "legal_document"
  | "news_primary"
  | "news_secondary"
  | "expert_statement"
  | "organization_report"
  | "other";
```

### Field Rules

| Field | Constraint |
|-------|------------|
| `evidenceItems` | 3-8 items per source |
| `id` | Must use E-prefix (E1, E2, not F1, F2) |
| `statement` | ≤100 characters |
| `sourceExcerpt` | 50-200 characters, verbatim |
| `probativeValue` | Only "high" or "medium" allowed |
| `evidenceScope` | Extract only when material boundary exists (see decision tree) |

### EvidenceScope Decision Tree

1. **Boundary Signal Present?** Does source explicitly state methodology/boundary?
   - NO → Do NOT extract EvidenceScope
   - YES → Continue

2. **Changes the Question?** Would evidence answer a different analytical question?
   - NO → Do NOT extract EvidenceScope
   - YES → Continue

3. **Material Impact?** Does boundary materially change conclusions?
   - NO → Do NOT extract EvidenceScope
   - YES → Extract EvidenceScope

**Expected frequency**: 0-3 EvidenceScopes per analysis. If >3, likely over-extracting.

---

## 3. VERDICT Phase Output

**Purpose**: Generate verdicts per AnalysisContext and per claim.

### Schema

```typescript
interface VerdictOutput {
  contextVerdicts: ContextVerdict[];
  claimVerdicts: ClaimVerdict[];
}

interface ContextVerdict {
  contextId: string;                 // Must match AnalysisContext ID
  answer: number;                    // Truth percentage 0-100
  shortAnswer: string;               // Complete sentence about evidence
  keyFactors: KeyFactor[];           // 3-5 factors
}

interface KeyFactor {
  factor: string;                    // ≤12 words
  explanation: string;               // ≤1 sentence
  supports: "yes" | "no" | "neutral";
  isContested: boolean;
  contestedBy?: string;              // SPECIFIC group (not "some people")
  factualBasis: "established" | "disputed" | "opinion" | "unknown";
}

interface ClaimVerdict {
  claimId: string;                   // From claims list
  verdict: number;                   // 0-100 truth percentage
  ratingConfirmation: "claim_supported" | "claim_refuted" | "mixed";
  reasoning: string;                 // ≤2 sentences
  supportingEvidenceIds: string[];   // Evidence item IDs (E1, E2, etc.)
  evidenceQuality?: EvidenceQualitySummary;
}

interface EvidenceQualitySummary {
  counts: Record<string, number>;    // Count per evidenceBasis type
  weightedQuality: number;
  strongestBasis: string;
  diversity: number;
}
```

### Verdict Scale (7-Point Symmetric)

| Range | Label | Description |
|-------|-------|-------------|
| 86-100% | TRUE | Strong support, no credible counter-evidence |
| 72-85% | MOSTLY TRUE | Predominantly correct, minor caveats |
| 58-71% | LEANING TRUE | More support than contradiction |
| 43-57% | MIXED/UNVERIFIED | Balanced evidence (MIXED) or insufficient (UNVERIFIED) |
| 29-42% | LEANING FALSE | More counter-evidence than support |
| 15-28% | MOSTLY FALSE | Predominantly incorrect |
| 0-14% | FALSE | Direct contradiction |

### Rating Confirmation Validation

| ratingConfirmation | Valid Verdict Range |
|--------------------|---------------------|
| `claim_supported` | 58-100% |
| `claim_refuted` | 0-42% |
| `mixed` | 43-57% |

**Critical**: `ratingConfirmation` MUST match verdict range. Mismatch = validation error.

### Field Rules

| Field | Constraint |
|-------|------------|
| `keyFactors` | 3-5 per AnalysisContext |
| `keyFactors.factor` | ≤12 words |
| `keyFactors.explanation` | ≤1 sentence |
| `reasoning` | ≤2 sentences |
| `contestedBy` | Must be specific group, not "some people" |

### Contestation Rules

- **established**: Documented counter-evidence (audits, logs, reports)
- **disputed**: Some factual counter-evidence, debatable
- **opinion**: No factual counter-evidence, just claims/rhetoric
- **unknown**: Cannot determine

**No Circular Contestation**: The entity being evaluated cannot contest its own decision.

---

## Common Validation Errors

| Error | Fix |
|-------|-----|
| Evidence ID uses F-prefix | Use E-prefix (E1, E2) |
| probativeValue is "low" | Do not extract low-probative items |
| sourceExcerpt <50 or >200 chars | Adjust excerpt length |
| ratingConfirmation mismatches verdict | Align confirmation with verdict range |
| contestedBy is generic ("some people") | Use specific group name |
| EvidenceScope over-extracted | Apply decision tree; expect 0-3 max |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.1 | 2026-02-05 | Added EvidenceScope decision tree, sourceType classification |
| 3.0 | 2025-10 | Renamed to evidenceItems, E-prefix IDs, added evidenceBasis |
| 2.8 | 2025-08 | Added ratingConfirmation field |
