# Deep Analysis: UI Grouping Strategy & ArticleFrame Purpose
## FactHarbor v2.7 Architecture Decisions

**Date:** 2026-01-19  
**Topic:** Critical UI/UX and Data Architecture Questions  
**Status:** Analysis & Recommendations

---

## Part 1: UI Grouping - AnalysisContext vs EvidenceScope

### Executive Summary

**Current:** UI groups verdicts by **AnalysisContext** ✅ CORRECT  
**Question:** Should we group by **EvidenceScope** instead?  
**Answer:** **NO** - AnalysisContext is the correct top-level grouping  
**But:** EvidenceScope should be **displayed** (currently hidden)

### The Fundamental Difference

#### AnalysisContext: "WHAT We're Analyzing"
- **Purpose:** Top-level verdict space requiring separate analysis
- **Cardinality:** 1-5 per input (typically)
- **Example:** TSE electoral case vs STF criminal case
- **User Question:** "Was TSE fair?" (separate from "Was STF fair?")
- **Verdict:** Each context gets its own truth percentage

#### EvidenceScope: "HOW Sources Analyzed It"
- **Purpose:** Methodology/frame used BY A SOURCE when producing evidence
- **Cardinality:** Many per input (one per fact, potentially)
- **Example:** A study using "Well-to-Wheel" methodology
- **User Question:** "What methodology did this source use?"
- **Verdict:** No separate verdict - this is metadata about evidence

### Current Architecture (Verified from Code)

**From `types.ts`, lines 146-179:**
```typescript
export interface AnalysisContext {
  id: string;                    // e.g., "CTX_TSE"
  name: string;                  // e.g., "TSE Electoral Case"
  subject: string;               // What's being analyzed
  // ... verdict is computed per AnalysisContext
}
```

**From `types.ts`, lines 194-200:**
```typescript
export interface EvidenceScope {
  name: string;           // e.g., "WTW", "ISO 14040"
  methodology?: string;   // e.g., "Well-to-Wheel"
  boundaries?: string;    // e.g., "Primary energy to wheel"
  geographic?: string;    // e.g., "European Union"
  temporal?: string;      // e.g., "2020-2025"
}
```

**How they connect:**
```typescript
// ExtractedFact interface
interface ExtractedFact {
  id: string;
  fact: string;
  contextId: string;           // ← Assigned to AnalysisContext
  evidenceScope?: EvidenceScope;  // ← Source's methodology (optional)
  // ... other fields
}
```

### Why AnalysisContext is the Correct Grouping

#### Reason 1: Verdict Spaces Are Defined by Context, Not Scope

**Example: Legal Proceedings**
```
Input: "Were the Bolsonaro trials fair?"

AnalysisContext 1: TSE Electoral Case
  Verdict: 75% TRUE
  Facts:
    - F1: "TSE applied electoral law correctly" (EvidenceScope: Legal analysis)
    - F2: "TSE followed due process" (EvidenceScope: Journalistic report)
    - F3: "8-year ban is standard penalty" (EvidenceScope: Legal statute)

AnalysisContext 2: STF Criminal Case
  Verdict: 60% UNCERTAIN
  Facts:
    - F4: "STF investigation ongoing" (EvidenceScope: News report)
    - F5: "Criminal charges filed" (EvidenceScope: Court document)
```

**If we grouped by EvidenceScope instead:**
```
EvidenceScope: Legal Analysis
  - F1 (from TSE)
  - F3 (from TSE)
  → What verdict do we show? Combined TSE+STF? Makes no sense!

EvidenceScope: Journalistic Report  
  - F2 (from TSE)
  - F4 (from STF)
  → User doesn't care about journalistic vs legal sources
  → They care about TSE vs STF proceedings!
```

**Problem:** EvidenceScope grouping mixes uncomparable verdict spaces.

#### Reason 2: User Mental Model

**What users want to know:**
- ✅ "Was the TSE case fair?" → One verdict per legal proceeding
- ✅ "Does hydrogen beat electric in WTW analysis?" → One verdict per methodology
- ✅ "Is the FTC likely to approve?" → One verdict per regulatory body

**What users DON'T care about:**
- ❌ "What do journalistic sources say vs legal sources?"
- ❌ "What do 2023 studies say vs 2024 studies?"
- ❌ "What do US-based sources say vs EU-based sources?"

EvidenceScope is **metadata about sources**, not **questions users are asking**.

#### Reason 3: When They Align vs When They Don't

**Case A: AnalysisContext and EvidenceScope ALIGN**

**Example: Hydrogen Efficiency**
```
Input: "Is hydrogen more efficient than electric cars?"

AnalysisContext 1: Well-to-Wheel (WTW) Analysis
  Facts with EvidenceScope.methodology = "WTW"
  Verdict: 40% efficiency

AnalysisContext 2: Tank-to-Wheel (TTW) Analysis
  Facts with EvidenceScope.methodology = "TTW"
  Verdict: 75% efficiency
```

In this case:
- AnalysisContext IS DEFINED BY methodology
- Each context's facts naturally have matching EvidenceScope
- Grouping by either would work

**Case B: AnalysisContext and EvidenceScope DIFFER**

**Example: Legal Proceedings**
```
Input: "Were the Bolsonaro trials fair?"

AnalysisContext 1: TSE Electoral Case
  Facts from multiple EvidenceScopes:
    - EvidenceScope.geographic = "Brazil"
    - EvidenceScope.temporal = "2023"
    - EvidenceScope.methodology = "Electoral law analysis" OR "News reporting" OR "Legal scholarship"

AnalysisContext 2: STF Criminal Case  
  Facts from multiple EvidenceScopes:
    - EvidenceScope.geographic = "Brazil"
    - EvidenceScope.temporal = "2024"
    - EvidenceScope.methodology = "Criminal law analysis" OR "News reporting"
```

In this case:
- AnalysisContext is about WHICH TRIAL
- EvidenceScope is about HOW SOURCES analyzed it
- **Grouping by EvidenceScope would mix TSE and STF facts!**

**Conclusion:** AnalysisContext is the ONLY correct top-level grouping.

### BUT: EvidenceScope Should Be Displayed!

**The Real Problem:** Not that we're grouping wrong, but that **EvidenceScope is invisible**.

### Options for Showing EvidenceScope

#### Option 1: Per-Fact Inline Badge (Minimal)

**Implementation:** Add small badge next to each fact in UI

```
┌─ AnalysisContext: TSE Electoral Case (Verdict: 75% TRUE)
│
├─ Fact F1: "TSE applied electoral law correctly"
│  📊 Legal Analysis | Brazil | 2023
│
├─ Fact F2: "TSE followed due process standards"
│  📰 News Report | Brazil | 2023
│
└─ Fact F3: "8-year ban is standard under Brazilian electoral code"
   ⚖️ Legal Statute | Brazil | Art. 22, Electoral Code
```

**Pros:**
- ✅ Lightweight - doesn't change layout
- ✅ Shows methodology clearly
- ✅ Easy to scan

**Cons:**
- ❌ Can be visually cluttered with many facts
- ❌ Doesn't help user understand methodology differences

#### Option 2: Expandable Tooltip (User-Initiated)

**Implementation:** Hoverable info icon on each fact

```
Fact F1: "TSE applied electoral law correctly" ℹ️
[Hover to see Evidence Scope]

[Tooltip appears]
┌─────────────────────────────────────┐
│ 📊 Evidence Scope                   │
│ Methodology: Legal analysis         │
│ Geography: Brazil                   │
│ Temporal: 2023                      │
│ Boundaries: Electoral law framework │
│ Source: Legal scholar review        │
└─────────────────────────────────────┘
```

**Pros:**
- ✅ Clean UI - no clutter
- ✅ Detailed info available on demand
- ✅ Preserves current layout

**Cons:**
- ❌ Requires user action (not visible by default)
- ❌ Mobile users may not discover tooltips

#### Option 3: Methodology Sub-Grouping (Hierarchical)

**Implementation:** Group facts by EvidenceScope WITHIN each AnalysisContext

```
┌─ AnalysisContext: Well-to-Wheel Analysis (Verdict: 40% efficiency)
│
├─ 📊 Methodology: GREET Model (US DOE)
│  ├─ Fact F1: "WTW efficiency is 38-42% for hydrogen FCEVs"
│  └─ Fact F2: "Includes upstream emissions from H2 production"
│
├─ 📊 Methodology: JRC-EU Well-to-Wheel Study
│  ├─ Fact F3: "WTW efficiency 35-45% depending on H2 source"
│  └─ Fact F4: "Assumes European grid mix for electrolysis"
│
└─ 📰 General Reporting (no specific methodology)
   └─ Fact F5: "Industry experts report 40% typical WTW efficiency"
```

**Pros:**
- ✅ Shows methodology patterns clearly
- ✅ Helps user compare different source methodologies
- ✅ Makes evidence quality more transparent

**Cons:**
- ❌ More complex layout
- ❌ May over-emphasize methodology differences
- ❌ Not all facts have EvidenceScope (would need "Other" category)

#### Option 4: Evidence Quality Matrix (Advanced)

**Implementation:** Show EvidenceScope as a quality indicator matrix

```
┌─ AnalysisContext: TSE Electoral Case (Verdict: 75% TRUE)
│
│ Evidence Quality Breakdown:
│ ┌────────────────────────────────────────────────┐
│ │ Source Type    │ Count │ Methodology          │
│ ├────────────────────────────────────────────────┤
│ │ Legal Analysis │   5   │ Brazilian electoral  │
│ │ Court Documents│   3   │ Official TSE records │
│ │ News Reports   │   7   │ Journalistic         │
│ │ Academic       │   2   │ Legal scholarship    │
│ └────────────────────────────────────────────────┘
│
│ Supporting Facts: [expand to see details]
```

**Pros:**
- ✅ Shows evidence diversity at a glance
- ✅ Helps assess verdict reliability
- ✅ Professional/scholarly presentation

**Cons:**
- ❌ Most complex implementation
- ❌ May be too technical for general users
- ❌ Requires significant UI redesign

### Recommended Approach: **Hybrid (Options 2 + 3)**

**Recommendation:** Combine tooltip and sub-grouping

**Phase 1 (Immediate):** Add tooltips (Option 2)
- Low effort, high value
- Makes EvidenceScope visible without layout changes
- Users can explore on demand

**Phase 2 (v2.8):** Add methodology sub-grouping (Option 3) - BUT ONLY when relevant
- If an AnalysisContext has facts from 3+ distinct methodologies, show sub-groups
- Otherwise, just show tooltips
- Adaptive UI based on data

**Implementation:**
```typescript
// Pseudo-code for adaptive display
const methodologies = getUniqueMethodologies(facts);

if (methodologies.length >= 3) {
  // Show hierarchical grouping
  return <MethodologySubGroups facts={facts} />;
} else {
  // Show flat list with tooltips
  return <FactList facts={facts} showTooltips={true} />;
}
```

### Key Insight: The Two-Level Hierarchy

**Correct Mental Model:**

```
User Question: "What's the verdict?"
    ↓
AnalysisContext: "Which context?" (WHAT we're analyzing)
    ↓
Verdict: Truth percentage per context
    ↓
Supporting Evidence: "What facts support this?"
    ↓
EvidenceScope: "How did sources analyze this?" (HOW they studied it)
```

**AnalysisContext = Top-level question**  
**EvidenceScope = Evidence quality/methodology metadata**

---

## Part 2: ArticleFrame - Purpose, Need, and Implementation

### Current State

**Field Name:** `analysisContext` (singular string)  
**Type Definition:** (from `types.ts`, lines 291-297)
```typescript
/**
 * ArticleFrame: Narrative/background framing of the input.
 * This is NOT an AnalysisContext - it's just background information.
 * NOT a reason to split into separate analysis contexts.
 *
 * JSON field name "analysisContext".
 */
analysisContext: string;
```

**Problem:** Confusing name (`analysisContext` singular vs `analysisContexts` plural)

### What Fields Do We Already Have?

**Let's map out all the "context" and "framing" fields:**

```typescript
interface ClaimUnderstanding {
  // 1. What the user asked (normalized)
  impliedClaim: string;
  
  // 2. ArticleFrame - narrative background
  analysisContext: string;  // <-- THIS FIELD
  
  // 3. What the article asserts
  articleThesis: string;
  
  // 4. Analytical frames requiring separate verdicts
  analysisContexts: AnalysisContext[];
  
  // Also:
  detectedInputType: "claim" | "question" | "article" | "url";
}
```

**Example values for each:**

**Input:** "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?"

```
impliedClaim: "The Bolsonaro judgment (trial) was fair and based on Brazil's law"
analysisContext: ???  // <-- What goes here?
articleThesis: ???    // <-- What goes here?
analysisContexts: [
  { id: "CTX_TSE", name: "TSE Electoral Case", ... },
  { id: "CTX_STF", name: "STF Criminal Case", ... }
]
```

**This is confusing! Let's think about ACTUAL examples:**

### Concrete Examples

#### Example 1: News Article

**Input (URL):** News article titled "Brazilian Democracy Under Threat: Bolsonaro Faces Multiple Legal Challenges"

**Article content:** "In the aftermath of the January 8 coup attempt, former President Jair Bolsonaro faces legal proceedings in both the Electoral Court (TSE) and the Supreme Federal Court (STF)..."

**Field values:**
```
impliedClaim: "Bolsonaro faces legal proceedings in TSE and STF following January 8 events"

analysisContext (ArticleFrame): "Brazilian democratic crisis 2023-2024"
OR: "Post-January 8 legal accountability"  
OR: "Brazilian judicial system response to coup attempt"

articleThesis: "Bolsonaro faces multiple legal challenges that threaten Brazilian democracy"

analysisContexts: [
  CTX_TSE: "TSE Electoral Ineligibility Case",
  CTX_STF: "STF Criminal Investigation"
]
```

**Purpose of ArticleFrame:** Captures the broader narrative/editorial frame in which the article is written.

#### Example 2: Scientific Paper

**Input (URL):** Academic paper titled "Life-Cycle Assessment of Hydrogen Fuel Cell Vehicles: A Comprehensive Review"

**Field values:**
```
impliedClaim: "Hydrogen fuel cell vehicles have varying environmental impact depending on analysis methodology"

analysisContext (ArticleFrame): "Life-cycle environmental assessment of transportation alternatives"
OR: "Decarbonization of road transport - comparative analysis"

articleThesis: "Hydrogen FCEVs show different efficiency and emissions profiles under WTW vs TTW methodologies"

analysisContexts: [
  CTX_WTW: "Well-to-Wheel Life-Cycle Analysis",
  CTX_TTW: "Tank-to-Wheel Direct Emissions Analysis"
]
```

#### Example 3: Simple Claim (No Article)

**Input (Text):** "Hydrogen cars are more efficient than electric cars"

**Field values:**
```
impliedClaim: "Hydrogen cars are more efficient than electric cars"

analysisContext (ArticleFrame): ""  // <-- EMPTY!
(No article, so no framing)

articleThesis: "Hydrogen cars are more efficient than electric cars"

analysisContexts: [
  CTX_WTW: "Well-to-Wheel Analysis",
  CTX_TTW: "Tank-to-Wheel Analysis"
]
```

### So What IS ArticleFrame For?

**After analyzing examples, the purpose becomes clearer:**

**ArticleFrame captures:**
1. **The broader topic/theme** of the article (not just what it claims)
2. **The editorial/narrative frame** in which claims are presented
3. **The "setting" or "backdrop"** for understanding the analysis

**ArticleFrame is NOT:**
- ❌ The main claim (`impliedClaim`)
- ❌ What the article asserts (`articleThesis`)
- ❌ An analytical frame requiring separate verdict (`AnalysisContext`)

**ArticleFrame is:**
- ✅ Context for the reader ("What's the bigger story?")
- ✅ Editorial framing ("How is the topic being presented?")
- ✅ Topical scope ("What's the subject area?")

### Is ArticleFrame Actually Needed?

**Case FOR keeping ArticleFrame:**

1. **Helps LLM understand context**
   - When extracting claims, knowing "this is about climate policy" vs "this is about legal proceedings" helps
   - Provides semantic grounding for interpretation

2. **Could improve UI context**
   - Showing "Article Topic: Climate policy debate" helps users understand scope
   - Especially useful for long URLs or complex articles

3. **Separates editorial framing from factual claims**
   - Important to distinguish: "Article is framed as political crisis" (frame) vs "Legal proceedings occurred" (fact)

4. **Useful for multi-article analysis** (future feature)
   - If we ever support analyzing multiple articles on the same topic
   - ArticleFrame helps group articles by theme

**Case AGAINST ArticleFrame:**

1. **Redundant with existing fields**
   - `articleThesis` often captures the same information
   - `detectedInputType` already tells us if it's an article
   - First `AnalysisContext`'s subject field often matches ArticleFrame

2. **Not shown in UI**
   - If it's not displayed, is it providing value?
   - Adds complexity for no visible benefit

3. **Confusing naming**
   - `analysisContext` (singular) vs `analysisContexts` (plural)
   - High risk of developer errors

4. **No clear usage guidelines**
   - When should LLM populate it?
   - How detailed should it be?
   - What's the difference from `articleThesis`?

### My Assessment: **Keep It, But Clarify and Rename**

**Recommendation:** ArticleFrame serves a valid purpose, but needs:

1. **Rename field** to `articleFrame` (eliminate naming confusion)
2. **Clear definition** with explicit examples
3. **LLM prompt guidance** on when/how to populate
4. **UI display** (or acknowledge it's internal-only)

### Proposed Implementation

#### Step 1: Rename Field (Breaking Change for v3.0)

```typescript
interface ClaimUnderstanding {
  impliedClaim: string;              // Normalized claim
  articleFrame: string;              // NEW NAME (narrative background)
  articleThesis: string;             // Main assertion
  analysisContexts: AnalysisContext[]; // Analytical frames
}
```

**Migration:**
```typescript
// migrate-terminology-v3.0.ts
const KEY_RENAMES = {
  analysisContext: "articleFrame",  // Rename singular field
  // analysisContexts stays the same (already correct)
};
```

#### Step 2: Define Clear Guidelines

**Add to LLM prompts:**

```
## ArticleFrame vs ArticleThesis vs AnalysisContext

**articleFrame** (optional string):
  - The broader topic or narrative setting of the article
  - Editorial/thematic framing
  - Answer: "What's the general subject area?"
  - Examples:
    * "Climate policy and decarbonization"
    * "Brazilian post-coup legal accountability"
    * "US-EU antitrust coordination"
  - Leave empty for simple claim inputs (no article)

**articleThesis** (required string):
  - What the article/input specifically asserts or claims
  - The main argument being made
  - Answer: "What is being claimed?"
  - Examples:
    * "Hydrogen FCEVs are more efficient than BEVs"
    * "Bolsonaro's trials were politically motivated"
    * "The FTC will approve the merger"

**analysisContexts** (required array):
  - Distinct analytical frames requiring separate verdicts
  - Uncomparable verdict spaces
  - Answer: "What distinct contexts need separate analysis?"
  - Examples:
    * [WTW analysis, TTW analysis]
    * [TSE case, STF case]
    * [FTC review, EC review]

KEY RULE: If you can't clearly distinguish articleFrame from articleThesis,
leave articleFrame empty. It's optional.
```

#### Step 3: Decide on UI Display

**Option A: Show as Page-Level Context (Recommended)**

```
┌───────────────────────────────────────────────┐
│ 📄 Article Topic                              │
│ Climate policy and decarbonization debate     │
└───────────────────────────────────────────────┘

Main Claim: "Hydrogen fuel cell vehicles are more 
efficient than battery electric vehicles"

Analysis Results (2 Distinct Methodologies):
┌─ Well-to-Wheel Analysis
│  Verdict: 40% efficiency → UNCERTAIN
└─ Tank-to-Wheel Analysis
   Verdict: 75% efficiency → MOSTLY TRUE
```

**Option B: Don't Display (Keep Internal)**

If ArticleFrame is primarily for LLM context understanding:
- Keep it in JSON
- Don't show in UI
- Use internally to inform analysis

**My recommendation:** **Option A** - Show it if populated, helps users understand scope

#### Step 4: Make It Optional

```typescript
interface ClaimUnderstanding {
  articleFrame?: string;  // Optional - only for articles with clear framing
  articleThesis: string;  // Required
  analysisContexts: AnalysisContext[];  // Required
}
```

**Guideline:** Only populate `articleFrame` when there's a clear broader context distinct from the thesis.

### Comparison Table: Three "Framing" Fields

| Field | Purpose | When to Use | Example (Bolsonaro) | Display in UI? |
|-------|---------|-------------|---------------------|----------------|
| `articleFrame` | Broader topic/theme | Complex articles with clear editorial frame | "Brazilian democratic crisis 2023-2024" | Optional banner |
| `articleThesis` | Main claim/assertion | Always (what article asserts) | "Bolsonaro's trials were politically motivated" | Yes, prominently |
| `analysisContexts` | Distinct verdict spaces | When multiple uncomparable frames detected | [TSE case, STF case] | Yes, primary grouping |

### When NOT to Use ArticleFrame

**Don't populate ArticleFrame when:**
1. Input is a simple claim (no article background)
2. Article frame is identical to thesis (redundant)
3. Unclear how to distinguish frame from thesis

**Examples of when to SKIP:**

```
Input: "Water is wet"
articleFrame: ""  // <-- Empty (no article context)
articleThesis: "Water is wet"

Input: "Study shows hydrogen is 40% efficient"
articleFrame: ""  // <-- Could be "energy efficiency research" but adds no value
articleThesis: "Hydrogen is 40% efficient"

Input: Article titled "Hydrogen Efficiency Study"
  Content: "Our study found hydrogen is 40% efficient using WTW methodology"
articleFrame: ""  // <-- Frame === Thesis, no added value
articleThesis: "Hydrogen is 40% efficient (WTW methodology)"
```

### Implementation Roadmap

**v2.7.1 (No Breaking Changes):**
- [ ] Add ArticleFrame documentation to LLM prompts
- [ ] Add examples of when to populate vs leave empty
- [ ] Update TERMINOLOGY.md with clarification

**v2.8 (Minor Changes):**
- [ ] Add UI display for ArticleFrame (optional banner)
- [ ] Add EvidenceScope tooltips (Option 2)
- [ ] Test with real-world articles

**v3.0 (Breaking Changes):**
- [ ] Rename `analysisContext` → `articleFrame`
- [ ] Database migration
- [ ] Update all code references

---

## Summary: Recommendations

### 1. UI Grouping Strategy

**Keep current approach:** ✅ Group by AnalysisContext  
**Add:** Display EvidenceScope within each context

**Implementation:**
- **Phase 1:** Tooltips on facts (hoverable info icon)
- **Phase 2:** Methodology sub-grouping (when 3+ methodologies present)

**Rationale:** AnalysisContext represents user questions ("Was TSE fair?"), while EvidenceScope is source metadata. Correct hierarchy is Context → Facts → Scope.

### 2. ArticleFrame Purpose & Implementation

**Keep field:** ✅ Yes, but with clarifications  
**Rename:** ✅ `analysisContext` → `articleFrame` (v3.0)  
**Display:** ✅ Optional page-level context banner

**Clear Definition:**
- **ArticleFrame:** Broader topic/narrative setting (optional)
- **ArticleThesis:** Main claim being made (required)
- **AnalysisContexts:** Distinct verdict spaces (required array)

**Usage Rule:** Only populate ArticleFrame when there's a clear editorial frame distinct from the thesis. When in doubt, leave empty.

---

## Documentation Updates

### Update 1: TERMINOLOGY.md - Add Section

```markdown
## Field Hierarchy: Understanding the Layers

### Level 1: ArticleFrame (Optional Context)
What: Broader topic or narrative setting
When: Only for articles with clear thematic frame
Display: Optional banner in UI
Example: "Climate policy and decarbonization"

### Level 2: ArticleThesis (Main Claim)
What: What the article/input asserts
When: Always present
Display: Prominent display in summary
Example: "Hydrogen is more efficient than electric"

### Level 3: AnalysisContexts (Verdict Spaces)
What: Distinct analytical frames requiring separate verdicts
When: 1+ contexts (uncomparable verdict spaces)
Display: Primary grouping in results
Example: [WTW methodology, TTW methodology]

### Level 4: Facts (Supporting Evidence)
What: Individual pieces of evidence
When: Extracted during research
Display: Listed under each context

### Level 5: EvidenceScope (Source Methodology)
What: How sources analyzed the topic
When: Optional per-fact metadata
Display: Tooltips or sub-grouping
Example: "ISO 14040 LCA", "GREET Model"
```

### Update 2: LLM_Prompt_Improvements.md - Add Guidance

```markdown
## Critical: ArticleFrame Usage Guidelines

When to populate `articleFrame`:
✅ Complex article with clear broader theme
✅ Editorial framing distinct from specific claims
✅ Useful context for understanding the topic

When to leave empty:
❌ Simple claim inputs (no article)
❌ Frame is identical to thesis (redundant)
❌ Unclear how frame differs from thesis

Examples:
- Input: "Bolsonaro trial was unfair" → articleFrame: "" (empty)
- Input: News article about Brazilian crisis → articleFrame: "Post-coup legal accountability" ✓
- Input: Scientific paper on hydrogen → articleFrame: "Transportation decarbonization pathways" ✓
```

### Update 3: README/FAQ - Add Explanation

```markdown
## How are results organized?

Results are organized hierarchically:

1. **Article Topic** (if applicable) - The broader context
2. **Main Claim** - What's being fact-checked
3. **Contexts** - Distinct analytical frames
   - Each context gets its own verdict
   - Examples: Different court cases, different methodologies
4. **Evidence** - Facts supporting each context
   - Tooltips show source methodology (EvidenceScope)

This ensures you get clear, separated verdicts when analyzing
topics that involve multiple uncomparable frames.
```

---

**END OF ANALYSIS**

*This analysis provides concrete recommendations for both UI grouping strategy and ArticleFrame implementation.*
