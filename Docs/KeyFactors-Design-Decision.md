# KeyFactors Design Decision

**Date**: January 2026
**Version**: 2.6.18
**Status**: Design Decision Document

## Executive Summary

This document captures the design decisions around **KeyFactors** in FactHarbor's fact-checking architecture. After analysis, we concluded that:

1. **KeyFactors are decomposition questions** that break down a thesis into verifiable dimensions
2. **KeyFactors should be optional and emergent**, not forced templates
3. **KeyFactors are discovered during understanding**, not verdict generation
4. **Scenario was rejected** as a first-class entity (derivable from existing data)

---

## 1. What is a KeyFactor?

### Definition

A **KeyFactor** is an **evaluation dimension** - a question that must be answered to verify a thesis. It represents a structured decomposition of "what must be true for the thesis to be true?"

### Examples

| Thesis | KeyFactors (Decomposition Questions) |
|--------|--------------------------------------|
| "The Bolsonaro trial was fair" | Was due process followed? Was evidence properly considered? Was the judge impartial? Was the outcome proportionate? |
| "Vaccine X causes autism" | Is there a documented causal mechanism? Do controlled studies support this? What does scientific consensus say? |
| "Company Y committed fraud" | Were financial statements misrepresented? Was there intent to deceive? Were stakeholders harmed? |

### KeyFactor vs Claim

```
┌─────────────────────────────────────────────────────────────────┐
│                         THESIS                                   │
│              "The Bolsonaro trial was fair"                     │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│    KEY FACTOR     │ │    KEY FACTOR     │ │    KEY FACTOR     │
│  "Due process     │ │  "Evidence basis" │ │  "Impartiality"   │
│   followed?"      │ │                   │ │                   │
└───────────────────┘ └───────────────────┘ └───────────────────┘
         │                    │                      │
    ┌────┴────┐          ┌────┴────┐           ┌────┴────┐
    ▼         ▼          ▼         ▼           ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐  ┌───────┐ ┌───────┐
│ Claim │ │ Claim │ │ Claim │ │ Claim │  │ Claim │ │ Claim │
│  SC1  │ │  SC2  │ │  SC3  │ │  SC4  │  │  SC5  │ │  SC6  │
└───────┘ └───────┘ └───────┘ └───────┘  └───────┘ └───────┘
```

| Entity | Level | What it represents |
|--------|-------|-------------------|
| **Thesis** | Highest | The main assertion to verify |
| **KeyFactor** | Middle | Evaluation dimension / decomposition question |
| **Claim** | Lowest | Atomic verifiable assertion |

---

## 2. Entity Relationship Model

```mermaid
erDiagram
    ANALYSIS ||--o| ARTICLE : "analyzes"
    ANALYSIS ||--|| THESIS : "has"
    ANALYSIS ||--o{ KEY_FACTOR : "decomposes into"
    ANALYSIS ||--|| OVERALL_VERDICT : "produces"

    ARTICLE ||--|{ CLAIM : "contains"

    THESIS ||--o{ KEY_FACTOR : "decomposed by"

    KEY_FACTOR ||--o{ CLAIM : "answered by"
    KEY_FACTOR ||--o| CONTESTATION : "may have"
    KEY_FACTOR ||--|| FACTOR_VERDICT : "has"

    CLAIM ||--o{ EVIDENCE : "supported by"
    CLAIM ||--|| CLAIM_VERDICT : "has"

    EVIDENCE }o--|| SOURCE : "from"

    FACTOR_VERDICT }o--o{ CLAIM_VERDICT : "aggregates"
    OVERALL_VERDICT }o--o{ FACTOR_VERDICT : "derived from"
    OVERALL_VERDICT }o--o{ CLAIM_VERDICT : "also considers"

    ANALYSIS {
        string id PK
        string inputType "text|url"
        string inputValue
        datetime createdAt
    }

    ARTICLE {
        string id PK
        string url
        string title
        string fullText
    }

    THESIS {
        string id PK
        string statement "main claim or question"
        string impliedClaim "what YES would confirm"
    }

    KEY_FACTOR {
        string id PK
        string question "decomposition question"
        string factor "short label"
        string category "procedural|evidential|methodological"
    }

    FACTOR_VERDICT {
        string id PK
        string supports "yes|no|neutral"
        string explanation
    }

    CLAIM {
        string id PK
        string text
        string type "legal|procedural|factual|evaluative"
        string role "core|attribution|source|timing"
        boolean isCentral
        string keyFactorId FK "which factor this answers"
    }

    EVIDENCE {
        string id PK
        string fact
        string category
        string sourceExcerpt
        boolean isContestedClaim
    }

    SOURCE {
        string id PK
        string url
        string title
        float trackRecordScore
    }

    CONTESTATION {
        string id PK
        string contestedBy
        string factualBasis "established|disputed|opinion|unknown"
        string reason
    }

    CLAIM_VERDICT {
        string id PK
        string verdict "7-point scale"
        int truthPercentage
        string reasoning
    }

    OVERALL_VERDICT {
        string id PK
        string verdict
        int truthPercentage
        string verdictReason
    }
```

---

## 3. Data Flow

```mermaid
flowchart TD
    subgraph "Step 1: Understand"
        INPUT[User Input] --> DETECT[Detect Input Type]
        DETECT --> THESIS_EXT[Extract Thesis]
        THESIS_EXT --> DECOMPOSE[Decompose into KeyFactors]
        DECOMPOSE --> CLAIMS_EXT[Extract Claims per Factor]
    end

    subgraph "Step 2: Research"
        CLAIMS_EXT --> SEARCH[Search for Evidence]
        SEARCH --> FETCH[Fetch Sources]
        FETCH --> EXTRACT[Extract Facts]
    end

    subgraph "Step 3: Verdict Generation"
        EXTRACT --> CLAIM_EVAL[Evaluate Each Claim]
        CLAIM_EVAL --> FACTOR_AGG[Aggregate by KeyFactor]
        FACTOR_AGG --> CONTEST[Identify Contestations]
        CONTEST --> OVERALL[Generate Overall Verdict]
    end

    subgraph "Output"
        OVERALL --> RESULT[Analysis Result]
        RESULT --> KF_OUT[KeyFactors with verdicts]
        RESULT --> CV_OUT[Claim Verdicts]
        RESULT --> OV_OUT[Overall Verdict]
    end
```

---

## 4. Design Decisions

### Decision 1: KeyFactors are Optional and Emergent

**Rejected Approach**: Force a fixed template of 5 factors for every analysis.

**Adopted Approach**: KeyFactors emerge from thesis decomposition. The number and type depend on the specific claim being analyzed.

```typescript
// BAD: Forced template
const FACTORS = ["Process", "Evidence", "Impartiality", "Proportionality", "Compliance"];

// GOOD: Emergent from thesis
const factors = await decomposeThesis(thesis);
// Could return 2 factors, 5 factors, or none
```

**Rationale**:
- Different claims require different evaluation dimensions
- Forcing irrelevant factors creates noise
- LLM can identify what dimensions actually matter

### Decision 2: KeyFactors are Discovered During Understanding

**Rejected Approach**: Generate KeyFactors during verdict generation.

**Adopted Approach**: Discover KeyFactors in Step 1 (Understand), so research can be directed toward answering them.

```mermaid
flowchart LR
    subgraph "Understanding Phase"
        T[Thesis] --> KF[KeyFactors]
        KF --> C[Claims mapped to factors]
    end

    subgraph "Research Phase"
        C --> R[Research guided by factors]
    end

    subgraph "Verdict Phase"
        R --> V[Verdicts per factor]
    end
```

**Rationale**:
- KeyFactors guide what evidence to search for
- Claims should be organized by the factor they address
- Verdict is aggregation, not discovery

### Decision 3: Scenario Rejected as First-Class Entity

**Rejected**: Creating a `Scenario` entity to represent competing narratives.

**Rationale**:
- Scenarios are derivable from existing data (contestation metadata)
- Adding Scenario increases schema complexity
- Risk of creating false equivalence between well-supported and poorly-supported interpretations
- Contestation already captures "who disputes what"

**Alternative**: Display "Competing Interpretations" as a derived view when relevant.

### Decision 4: KeyFactor Contestation Structure

Contestation attaches to KeyFactors (not Claims) because:
- Political disputes are usually about evaluation dimensions ("was it fair?")
- Not about atomic facts ("court met on date X")

```typescript
interface KeyFactor {
  factor: string;
  question: string;
  supports: "yes" | "no" | "neutral";
  explanation: string;

  // Contestation
  isContested: boolean;
  contestedBy: string;           // "Bolsonaro supporters", "Trump administration"
  factualBasis: "established" | "disputed" | "opinion" | "unknown";
}
```

**factualBasis Rules**:
| Value | Meaning | Example |
|-------|---------|---------|
| `established` | Opposition has documented counter-evidence | Court transcripts showing bias |
| `disputed` | Some factual counter-evidence, debatable | Conflicting expert opinions |
| `opinion` | No factual counter-evidence, just rhetoric | "Critics say it was unfair" |
| `unknown` | Cannot determine | Insufficient information |

---

## 5. Relationship to Claims

KeyFactors and Claims have a **parent-child relationship**:

```mermaid
graph TD
    KF1[KeyFactor: Due Process] --> C1[Claim: Court followed procedures]
    KF1 --> C2[Claim: Defendant had legal representation]
    KF1 --> C3[Claim: Appeals process was available]

    KF2[KeyFactor: Evidence Basis] --> C4[Claim: Ruling cited documented evidence]
    KF2 --> C5[Claim: Video evidence was authenticated]

    KF3[KeyFactor: Impartiality] --> C6[Claim: Judge had no conflicts of interest]
    KF3 --> C7[Claim: Judge served on both cases]

    style KF1 fill:#e1f5fe
    style KF2 fill:#e1f5fe
    style KF3 fill:#e1f5fe
    style C1 fill:#fff3e0
    style C2 fill:#fff3e0
    style C3 fill:#fff3e0
    style C4 fill:#fff3e0
    style C5 fill:#fff3e0
    style C6 fill:#fff3e0
    style C7 fill:#fff3e0
```

**KeyFactor verdict** = Aggregation of claim verdicts that address that factor.

---

## 6. Implementation Notes

### Current State (v2.6.18)

- KeyFactors generated for procedural/legal topics via `detectProceduralTopic()`
- Fixed set of 5 factors in prompt template
- KeyFactors stored in `ArticleAnalysis.keyFactors` and `QuestionAnswer.keyFactors`

### Future Improvements

1. **Move KeyFactor discovery to Understanding phase**
   - Add `keyFactors` to `ClaimUnderstanding` interface
   - Map claims to factors via `claim.keyFactorId`

2. **Make factors emergent**
   - Remove fixed factor templates
   - Let LLM decompose thesis into relevant dimensions

3. **Add factor-claim mapping**
   - Each claim knows which factor(s) it addresses
   - Factor verdict computed from mapped claim verdicts

4. **Simplify schema**
   - Remove `isProceduralTopic` check
   - All analyses can have 0-N factors based on content

---

## 7. Summary

| Aspect | Decision |
|--------|----------|
| **What is KeyFactor?** | Evaluation dimension / decomposition question |
| **When discovered?** | During Understanding phase |
| **Required?** | No - optional, 0-N per analysis |
| **Fixed template?** | No - emergent from thesis |
| **Contestation?** | Attaches to KeyFactors |
| **Scenario entity?** | Rejected - derivable from contestation |
| **Relationship to Claims** | Parent-child (factor answered by claims) |

---

## References

- [FactHarbor POC1 Architecture](./FactHarbor%20POC1%20Architecture%20Analysis.md)
- [Source Reliability Bundle](./Source%20Reliability%20Bundle.md)
