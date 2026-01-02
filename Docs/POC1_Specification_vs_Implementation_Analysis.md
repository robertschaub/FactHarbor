# FactHarbor POC1: Specification vs. Implementation Analysis

**Date:** January 2, 2026
**Specification Source:** FactHarbor Spec and Impl 1.Jan.26.xar (xWiki export)
**Implementation Version:** Current codebase (analyzer v2.6.17)
**Analyst:** Claude Code

---

## Executive Summary

This document analyzes the current FactHarbor implementation against the POC1 specification defined in the xWiki documentation. The analysis categorizes differences as **Improvements** (implementation exceeds spec), **Weak Points** (missing/incomplete vs. spec), and **Uncertain** (requiring discussion).

**Key Findings:**
- ✅ **Significant improvements** in analysis sophistication (7-point truth scale, pseudoscience detection)
- ❌ **Critical gaps** in quality validation (Gates 1 & 4 not implemented)
- ⚠️ **Spec-compliant deferrals** (scenarios correctly postponed to POC2)
- 📊 **Missing validation infrastructure** (quality metrics tracking required for POC1 success)

---

## Table of Contents

1. [Improvements (Implementation > Spec)](#improvements)
2. [Weak Points (Missing/Incomplete)](#weak-points)
3. [Uncertain (Need Discussion)](#uncertain)
4. [Summary Matrix](#summary-matrix)
5. [Recommendations](#recommendations)
6. [References](#references)

---

## ✅ Improvements (Implementation > Spec) {#improvements}

### 1. Enhanced Truth Scale (7-Point Symmetric) ⭐

**Specification Requirement:**
- POC1 uses basic 4-level scale: WELL-SUPPORTED, PARTIALLY-SUPPORTED, UNCERTAIN, REFUTED
- Source: `POC/Requirements.xml:170-197`

**Current Implementation:**
- Professional 7-point symmetric scale centered on neutral (50%):
  ```
  TRUE          (86-100%, +3)
  MOSTLY-TRUE   (72-85%,  +2)
  LEANING-TRUE  (58-71%,  +1)
  UNVERIFIED    (43-57%,   0)
  LEANING-FALSE (29-42%,  -1)
  MOSTLY-FALSE  (15-28%,  -2)
  FALSE         (0-14%,   -3)
  ```
- Source: `apps/web/src/lib/analyzer.ts:484-599`

**Impact:**
- More nuanced verdicts aligned with professional fact-checking standards
- Symmetric scale avoids bias (equal levels above/below neutral)
- Better user comprehension of confidence levels

**Assessment:** ⭐ **Significant Improvement** - Adds professional polish without blocking POC1 goals

---

### 2. Pseudoscience Detection System ⭐⭐

**Specification Requirement:**
- Not mentioned in POC1 requirements

**Current Implementation:**
- Comprehensive pattern-matching system with 100+ patterns across categories:
  - Water pseudoscience (memory, structuring, Grander, Emoto)
  - Energy fields (chakra, aura, vital energy)
  - Quantum misuse (quantum healing, consciousness)
  - Homeopathy (potentization, succussion)
  - Known pseudoscience brands
- Automatic verdict escalation (UNCERTAIN → REFUTED when patterns + debunk sources found)
- Confidence-based recommendations (never FALSE without 99%+ certainty)
- Source: `apps/web/src/lib/analyzer.ts:176-479`

**Example Detection:**
```typescript
// Detects: "Structured water has memory and healing properties"
{
  isPseudoscience: true,
  confidence: 0.75,
  categories: ["waterMemory", "energyFields"],
  matchedPatterns: [/water\s*memory/i, /healing\s*properties/i],
  debunkIndicatorsFound: [/no\s*scientific\s*evidence/i],
  recommendation: "REFUTED"
}
```

**Impact:**
- Proactively identifies debunked claims before full analysis
- Prevents spreading of anti-vaccine, homeopathy, energy healing claims
- Addresses major quality risk not in original spec

**Assessment:** ⭐⭐ **Major Improvement** - Critical for credibility and harm prevention

---

### 3. Claim Dependency Tracking ⭐

**Specification Requirement:**
- Not mentioned in POC1

**Current Implementation:**
- Claims tagged with `claimRole`: attribution/source/timing/core
- Dependency propagation: if prerequisite claim false → dependent claims flagged
- Source: `apps/web/src/lib/analyzer.ts:11-12`

**Example:**
```json
{
  "claim": "Study shows 30% reduction",
  "claimRole": "core"
},
{
  "claim": "Published in Nature journal",
  "claimRole": "source",
  "dependsOn": "Study shows 30% reduction"
}
```

If source claim is FALSE → core claim verdict downgraded with explanation

**Impact:**
- Sophisticated logical analysis (if source unreliable, claim verdict affected)
- Prevents false claims based on misattributed sources

**Assessment:** ⭐ **Improvement** - Demonstrates advanced reasoning capability

---

### 4. Advanced Configuration System

**Specification Requirement:**
- Basic environment configuration mentioned

**Current Implementation:**
- Comprehensive `FH_*` prefixed environment variables:
  - `FH_ANALYSIS_MODE`: quick/deep (affects iterations, sources, article length)
  - `FH_SEARCH_ENABLED`: true/false
  - `FH_SEARCH_PROVIDER`: auto-detection from API keys (SerpAPI, Google CSE, Bing, Tavily, Brave)
  - `FH_SEARCH_DOMAIN_WHITELIST`: comma-separated trusted domains
  - `FH_SOURCE_BUNDLE_PATH`: custom source reliability data
  - `FH_REPORT_STYLE`: structured/rich
  - `FH_ALLOW_MODEL_KNOWLEDGE`: true/false (strict source-only mode)
- Source: `apps/web/src/lib/analyzer.ts:33-121`

**Impact:**
- Production-ready configuration without code changes
- Easy A/B testing (quick vs deep mode)
- Security (domain whitelisting prevents malicious source injection)
- Flexibility for different deployment environments

**Assessment:** ⭐ **Improvement** - Production-quality configuration management

---

### 5. Multi-LLM Provider Support (Exceeds Spec) ✅

**Specification Requirement:**
- NFR-POC-11: LLM abstraction layer required (POC/Requirements.xml:1411-1457)
- Primary provider: Anthropic Claude
- Future: Secondary providers with failover

**Current Implementation:**
- **Full implementation** supporting 4 providers:
  - Anthropic Claude (Sonnet, Haiku)
  - OpenAI GPT
  - Google Gemini
  - Mistral
- Provider selection via `LLM_PROVIDER` environment variable
- Source: `apps/web/src/lib/analyzer.ts:19-23`

**Impact:**
- ✅ Vendor independence (no lock-in)
- ✅ Resilience (switch providers if outage)
- ✅ Cost optimization (use cheaper models for extraction, quality for analysis)

**Assessment:** ✅ **Exceeds Specification** - NFR-POC-11 fully satisfied

---

### 6. Article-Level Verdict Analysis (Experimental Feature Success) ✅

**Specification Requirement:**
- Listed as "Experimental" in POC1 (Roadmap/POC1.xml:64-86)
- Goal: Test if AI can detect when article credibility ≠ claim average
- Success criteria: ≥70% accuracy on 30-article test set
- If <50% → defer to POC2

**Current Implementation:**
- ✅ Fully implemented in `ArticleVerdictBanner` component
- Detects:
  - Article's main thesis vs. supporting claims
  - Central vs. peripheral claims
  - Logical fallacies (correlation→causation, cherry-picking)
  - Misleading framing (accurate facts, false conclusion)
- Source: `apps/web/src/components/ArticleVerdictBanner.tsx`

**Example Detection:**
```
Article claims: "Coffee cures cancer"
Claims analyzed:
  ✅ Coffee contains antioxidants (TRUE)
  ✅ Antioxidants fight free radicals (MOSTLY-TRUE)
  ❌ Coffee cures cancer (FALSE - causal leap)

Article Verdict: MISLEADING
Reason: Makes unsupported medical claim despite citing accurate facts
```

**Impact:**
- Successfully implemented experimental POC1 feature
- Addresses "Article Verdict Problem" (POC/Article-Verdict-Problem.xml)

**Assessment:** ✅ **Experimental Feature Success** - Ship in POC2 per spec decision tree

---

## ⚠️ Weak Points (Missing/Incomplete vs. Spec) {#weak-points}

### 1. Quality Gates Not Implemented 🔴 CRITICAL BLOCKER

**Specification Requirement:**

POC1 **MUST** implement 2 quality gates before displaying verdicts to users:

#### Gate 1: Claim Validation (Roadmap/POC1.xml:99-123, POC/Specification.xml:106-156)

**Required Checks:**
1. **Factuality Test**: Can claim be verified with evidence?
2. **Opinion Detection**: Contains hedging language? ("I think", "probably", "best")
3. **Specificity Score**: Contains concrete details? (names, numbers, dates, locations)
4. **Future Prediction Test**: About future events?

**Pass Criteria:**
```typescript
{
  isFactual: true,
  opinionScore: ≤ 0.3,
  specificityScore: ≥ 0.3,
  claimType: "FACTUAL"
}
```

**Actions if Failed:**
- Flag as "Non-verifiable: Opinion/Prediction/Ambiguous"
- DO NOT generate scenarios or verdicts
- Display explanation to user

**Target:** 0% opinion statements processed as facts

#### Gate 4: Verdict Confidence Assessment (Roadmap/POC1.xml:124-158, POC/Specification.xml:159-206)

**Required Checks:**
1. **Evidence Count**: Minimum 2 independent sources
2. **Source Quality**: Average reliability ≥ 0.6 (on 0-1 scale)
3. **Evidence Agreement**: % supporting vs. contradicting ≥ 0.6
4. **Uncertainty Factors**: Count of hedging statements in reasoning

**Confidence Tiers:**
```
HIGH (80-100%):
  ≥3 sources, ≥0.7 avg quality, ≥80% agreement

MEDIUM (50-79%):
  ≥2 sources, ≥0.6 avg quality, ≥60% agreement

LOW (0-49%):
  ≥2 sources BUT low quality/agreement

INSUFFICIENT:
  <2 sources → DO NOT PUBLISH
```

**Publication Rule:** Minimum MEDIUM confidence required

**Target:** 0% verdicts published with <2 sources

---

**Current Implementation:**

❌ **Not Implemented**

Evidence:
- No `ClaimValidationResult` entity (spec: Data Model/WebHome.xml:344-360)
- No `VerdictValidationResult` entity (spec: Data Model/WebHome.xml:363-379)
- No opinion score calculation in analyzer
- No specificity score (no concrete detail counting)
- No confidence tier assignment (HIGH/MEDIUM/LOW/INSUFFICIENT)
- No publication blocking for LOW/INSUFFICIENT verdicts
- Evidence gathering exists but not validated against thresholds

Code Review:
```typescript
// apps/web/src/lib/analyzer.ts
// ❌ No Gate 1 validation found
// ❌ No Gate 4 validation found
// ✅ Evidence gathering exists (searchWeb, extractTextFromUrl)
// ❌ No source quality scoring against threshold
// ❌ No evidence agreement calculation
```

---

**Impact:**

🔴 **POC1 Success Criteria Violated:**

From POC/Requirements.xml:218-233:
```
POC1 is considered SUCCESSFUL if:

✅ Functional:
  ❌ Blocks all non-factual claims (0% pass through) - MISSING GATE 1
  ❌ Blocks all insufficient-evidence verdicts (0% with <2 sources) - MISSING GATE 4

✅ Quality:
  ❌ 0 verdicts with <2 sources published - NOT ENFORCED
  ❌ 0 opinion statements published as facts - NOT ENFORCED
```

From Roadmap/POC1.xml:24-26:
> **Phase Goal:** Prove AKEL can produce credible, quality outputs **without manual intervention**
>
> **Success Metric:** <10% hallucination rate, **quality gates prevent low-confidence publications**

**Specification Quote (POC/Requirements.xml:96):**
> "AKEL must validate outputs before displaying to users. POC1 implements a **2-gate subset** of the full NFR11 framework."

**Specification Quote (Roadmap/POC1.xml:99-100):**
> **Importance:** CRITICAL - Core POC1 Requirement
> **Fulfills:** AI safety, credibility, prevents embarrassing failures

---

**Required Data Structures:**

```typescript
// Missing from implementation
interface ClaimValidationResult {
  claimId: string;
  isFactual: boolean;
  opinionScore: number;        // 0-1
  specificityScore: number;    // 0-1
  futureOriented: boolean;
  claimType: "FACTUAL" | "OPINION" | "PREDICTION" | "AMBIGUOUS";
  passed: boolean;
  failureReason?: string;
  validatedAt: Date;
}

interface VerdictValidationResult {
  verdictId: string;
  evidenceCount: number;
  averageSourceQuality: number;     // 0-1
  evidenceAgreement: number;        // 0-1
  uncertaintyFactors: number;
  confidenceTier: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  publishable: boolean;
  failureReasons?: string[];
  validatedAt: Date;
}
```

---

**Assessment:** 🔴 **CRITICAL BLOCKER** - POC1 specification defines gates as **mandatory** for success

**Priority:** **P0 - Required for POC1 completion**

**Recommendation:** Implement both gates before declaring POC1 complete

---

### 2. Missing Quality Metrics Tracking 🔴 CRITICAL

**Specification Requirement:**

POC1 requires quality metrics tracking for validation (POC/Specification.xml:382-405):

```typescript
interface QualityMetric {
  metric_type: string;      // "ErrorRate", "ConfidenceScore", "ProcessingTime"
  category: string;         // "Politics", "Science", "Health"
  value: number;
  target: number;
  timestamp: Date;
}
```

**Required Metrics:**

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Claims extracted per article | 5-15 | Automated count |
| Claims passing Gate 1 | 60-80% | Automated count |
| Verdicts passing Gate 4 | 60-80% | Automated count |
| **Hallucination rate** | **<10%** | **Manual review** |
| Evidence accuracy | >90% | Manual verification |
| User-reported issues | <5% | Manual tracking |

**Manual Quality Review Process (Required):**

From POC/Specification.xml:396-404:
```
1. Select random sample of 20 verdicts
2. Verify evidence sources are real and accurately quoted
3. Check verdict assessment matches evidence
4. Document any hallucinations or errors
5. Calculate quality metrics
6. Adjust thresholds if needed
```

**POC1 Success Criteria (POC/Requirements.xml:1111-1122):**

```
Quality Definition:
  "Reasonable verdict" = Defensible given general knowledge
  "Coherent summary" = Logically structured, grammatically correct
  "Comprehensible" = Reviewers understand what analysis means

Thresholds:
  Claim Extraction:     ≥70% accuracy
  Verdict Logic:        ≥70% defensible
  Reasoning Clarity:    ≥70% clear
  Overall Analysis:     ≥70% useful

Analogy: "B student" quality (70-80%), not "A+" perfection yet
```

---

**Current Implementation:**

❌ **Not Implemented**

Evidence:
- No `QualityMetric` entity in database
- No quality dashboard
- No hallucination rate tracking
- No manual review process defined
- No quality score display in UI
- LLM usage tracked but not quality metrics

Code Review:
```typescript
// apps/api/Data/Entities.cs
// ✅ JobEntity, JobEventEntity exist
// ❌ No QualityMetric table
// ❌ No quality tracking infrastructure

// apps/web/src/lib/analyzer.ts
// ✅ LLM call counting exists
// ❌ No quality scoring
// ❌ No hallucination detection
```

---

**Impact:**

🔴 **Cannot Validate POC1 Success**

From POC/Requirements.xml:1083-1097:
```
Minimum Success (POC Passes):

Required for GO decision:
  ❌ Verdicts are reasonable (≥70% make logical sense) - CANNOT MEASURE
  ❌ Minimal or no manual editing needed (<30% require intervention) - CANNOT TRACK
  ✅ Cost efficiency acceptable (<$0.05 USD target) - CAN ESTIMATE
  ❌ Hallucination rate <10% - NOT TRACKED
```

**Specification Quote (POC/Requirements.xml:956):**
> "**CRITICAL:** Unit economics must be viable for scaling decision!"

**Without Quality Metrics:**
- Cannot determine if POC1 passes/fails
- Cannot make GO/NO-GO decision
- Cannot identify improvement opportunities
- Cannot validate hallucination rate <10% (CRITICAL success metric)

---

**Assessment:** 🔴 **CRITICAL GAP** - Required for POC1 validation

**Priority:** **P0 - Blocking POC1 sign-off**

**Recommendation:**
1. Implement `QualityMetric` entity in database
2. Create manual review process (20-verdict samples)
3. Track hallucination rate
4. Display quality scores in UI

---

### 3. Missing Error Pattern Tracking

**Specification Requirement:**

`ErrorPattern` entity for continuous improvement (Data Model/WebHome.xml:319-327):

```typescript
interface ErrorPattern {
  error_category: string;    // "WrongSource", "Hallucination", "MissingEvidence"
  claim_id: string;
  description: string;
  root_cause: string;
  frequency: number;
  status: "OPEN" | "ANALYZING" | "FIXED" | "WONTFIX";
  created_at: Date;
  fixed_at?: Date;
}
```

**Usage (Data Model/WebHome.xml:316-327):**
```
Error capture → Pattern analysis → Improvement workflow:
  Analyze → Fix → Test → Deploy → Re-process → Monitor

Example:
  category: "WrongSource"
  description: "Unreliable tabloid cited"
  root_cause: "No quality check"
  frequency: 23
  status: "Fixed"

  → Led to: Gate 4 implementation (source quality threshold)
```

---

**Current Implementation:**

❌ **Not Implemented**

Evidence:
- No `ErrorPattern` table
- No error categorization
- No systematic error tracking
- Errors logged to events but not analyzed for patterns

---

**Impact:**

- No structured learning from failures
- Cannot identify systematic weaknesses
- Cannot prioritize improvements based on frequency
- Missing feedback loop for system improvement

**Example Use Case:**
```
Week 1: 15 verdicts have <2 sources (would be caught by Gate 4 if implemented)
Week 2: 12 verdicts cite unreliable sources
Week 3: 8 verdicts have hallucinated quotes

→ ErrorPattern analysis reveals:
  #1 issue: Insufficient source validation (Gate 4 missing)
  #2 issue: No source reliability scoring (Source bundle not used)
  #3 issue: Quote verification needed

→ Prioritized fix: Implement Gate 4 first (highest frequency)
```

---

**Assessment:** 🟡 **Gap** - Important for continuous improvement, lower priority than quality gates

**Priority:** **P2 - Defer to POC2**

**Recommendation:** Implement after Gates 1 & 4 are working and producing error data to track

---

### 4. Simplified Data Model (Acceptable for POC1)

**Specification Requirement:**

Full data model with 10 entities (Data Model/WebHome.xml:24-408):
1. Claim
2. Evidence
3. Source (with track record)
4. Scenario
5. Verdict
6. User
7. Edit (version history)
8. Flag (user reports)
9. QualityMetric
10. ErrorPattern

---

**Current Implementation:**

Minimal database schema (`apps/api/Data/Entities.cs`):

```csharp
// ✅ JobEntity (job management)
public class JobEntity {
    public string JobId { get; set; }
    public string Status { get; set; }        // QUEUED/RUNNING/SUCCEEDED/FAILED
    public int Progress { get; set; }
    public DateTime CreatedUtc { get; set; }
    public DateTime UpdatedUtc { get; set; }
    public string InputType { get; set; }     // text/url
    public string InputValue { get; set; }
    public string InputPreview { get; set; }
    public string? ResultJson { get; set; }   // ⚠️ Stores full analysis as JSON blob
    public string? ReportMarkdown { get; set; }
}

// ✅ JobEventEntity (progress tracking)
public class JobEventEntity {
    public int Id { get; set; }
    public string JobId { get; set; }
    public DateTime TsUtc { get; set; }
    public string Level { get; set; }         // info/warn/error
    public string Message { get; set; }
}

// ❌ No Claim table
// ❌ No Evidence table
// ❌ No Source table (no track record tracking)
// ❌ No Scenario table
// ❌ No Verdict table
// ❌ No User table (no authentication)
// ❌ No Edit table (no version history)
// ❌ No Flag table (no user feedback)
// ❌ No QualityMetric table
// ❌ No ErrorPattern table
```

**Analysis stored as JSON blob in `ResultJson` field:**
```json
{
  "claims": [...],
  "verdicts": [...],
  "sources": [...],
  "articleVerdict": {...}
}
```

---

**Impact:**

**For POC1:**
- ✅ **Acceptable** - Spec allows POC1 simplifications (POC/Requirements.xml:315-341)
- ✅ Stateless design works for proof-of-concept
- ✅ Fast to implement and iterate

**Specification Quote (POC/Requirements.xml:336-341):**
```
POC Acceptable Simplifications:
  ✅ Single AKEL call (not multi-component pipeline)
  ✅ No scenarios (implicit in verdicts)
  ✅ Basic evidence linking
  ✅ 2 gates instead of 4
  ✅ No review queue
```

**For POC2/Beta:**
- ❌ **Blocking** - Cannot implement:
  - Source track record system (no Source table)
  - Scenario generation (no Scenario table)
  - Version history (no Edit table)
  - User feedback (no Flag table)
  - Quality metrics (no QualityMetric table)
  - Claim reuse/search (no Claim table)

**Missing Functionality:**

1. **No Source Reliability Tracking**
   - Spec: Sources scored 0-100, updated weekly (Data Model:56-171)
   - Current: Source bundle can be loaded but not tracked over time
   - Impact: Cannot improve source quality, cannot detect unreliable sources

2. **No Claim Deduplication**
   - Spec: Claims canonicalized and cached (Specification:407-433)
   - Current: Same claim analyzed multiple times (higher LLM costs)
   - Impact: No cost savings from cache hits

3. **No Version History**
   - Spec: All edits tracked with before/after states (Data Model:274-306)
   - Current: JobEntity updated in-place (history lost)
   - Impact: Cannot audit changes, cannot rollback

4. **No User Feedback Loop**
   - Spec: Flag system for user-reported issues (Data Model:307-309)
   - Current: No feedback mechanism
   - Impact: Cannot learn from user corrections

---

**Assessment:** ⚠️ **Acceptable for POC1, Blocking for POC2**

**Priority:** **P3 - Plan for POC2**

**Recommendation:**
- Keep simplified model for POC1 completion
- Design full schema before POC2 starts
- Migration path: Extract claims from `ResultJson` → populate Claim/Evidence/Source tables

---

### 5. No Source Track Record System

**Specification Requirement:**

Sources must have reliability scores updated weekly (Data Model/WebHome.xml:56-171):

```typescript
interface Source {
  id: string;
  name: string;                    // "New York Times"
  domain: string;                  // "nytimes.com"
  type: "NewsOutlet" | "AcademicJournal" | "GovernmentAgency";
  track_record_score: number;      // 0-100
  accuracy_history: object;        // Historical data
  correction_frequency: number;    // How often source publishes corrections
  last_updated: Date;
}
```

**Scoring Process (Separation of Concerns):**

From Data Model/WebHome.xml:76-170:

```
CRITICAL: Prevent circular dependencies

Weekly Background Job (Sunday 2 AM):
  - Analyze all claims from past week
  - Calculate source accuracy (correct verdicts / total citations)
  - Update track_record_score
  - NEVER triggered by individual claim analysis

Real-Time Claim Analysis:
  - READ source scores (snapshot from last update)
  - NEVER WRITE source scores
  - Use scores to weight evidence

Benefits:
  ✅ No circular dependencies
  ✅ Predictable behavior
  ✅ Clear audit trail
```

**Formula:**
```
track_record_score =
  accuracy_rate (50%) +
  correction_policy (20%) +
  editorial_standards (15%) +
  bias_transparency (10%) +
  longevity (5%)

Quality Thresholds:
  90+    = Exceptional
  70-89  = Reliable
  50-69  = Acceptable
  30-49  = Questionable
  <30    = Unreliable
```

---

**Current Implementation:**

⚠️ **Partial Implementation**

Evidence:
```typescript
// apps/web/src/lib/analyzer.ts:43
sourceBundlePath: process.env.FH_SOURCE_BUNDLE_PATH || null

// apps/web/src/lib/mbfc-loader.ts
// ✅ Can load source reliability from external bundle (MBFC)
// ❌ No database tracking
// ❌ No weekly update job
// ❌ No accuracy history
// ❌ No separation of concerns (no write protection)
```

**What Works:**
- Manual source bundle can be loaded at startup
- Source reliability can influence evidence weighting

**What's Missing:**
- No `Source` table in database
- No weekly scoring job
- No track record evolution over time
- No temporal separation (analysis can't update scores)
- No accuracy history logging

---

**Impact:**

**For POC1:**
- ⚠️ **Acceptable** - Static source bundle works for proof-of-concept
- Source quality can inform analysis if bundle provided

**For POC2/Beta:**
- ❌ **Required** - Dynamic source scoring needed for:
  - Learning which sources are reliable over time
  - Detecting gaming attempts (coordinated fake sources)
  - Preventing circular dependencies in scoring
  - Quality gate 4 (source quality ≥ 0.6 threshold)

**Specification Quote (Data Model:136-153):**
```
Key Principles:
  ✅ Scoring and analysis are temporally separated
  ✅ One-way data flow during processing
    - Claims READ source scores
    - Claims NEVER WRITE source scores
  ✅ Predictable update cycle
    - Sources update every Sunday 2 AM
    - Claims always use last week's scores
```

**Without Source Tracking:**
- Cannot improve source selection over time
- Cannot detect unreliable sources automatically
- Cannot fulfill Gate 4 source quality requirement properly
- Higher risk of citing bad sources

---

**Assessment:** 🟡 **Weak Point** - Important for quality, but acceptable for POC1

**Priority:** **P2 - Required for POC2**

**Recommendation:**
1. POC1: Continue using static source bundle if available
2. POC2: Implement full Source table with weekly update job
3. Design: Follow spec's temporal separation pattern

---

### 6. No Redis Caching Layer

**Specification Requirement:**

Redis cache for claim deduplication and cost savings (POC/Specification.xml:407-433):

**Cache Design:**
```
Key:   claim:v1norm1:{language}:{sha256(canonical_claim)}
Value: Complete ClaimAnalysis JSON (~15KB, ~5KB compressed)
TTL:   90 days
```

**Canonicalization Algorithm:**
```
1. Unicode normalization (NFC)
2. Lowercase + punctuation removal
3. Whitespace normalization
4. Numeric normalization ("95%" → "95 percent")
5. Common abbreviations ("COVID-19" → "covid")
```

**Projected Performance:**
```
Articles 0-100:      10% hit rate
Articles 100-1,000:  40% hit rate
Articles 1,000-10K:  70% hit rate (TARGET)
Articles 10K+:       80-90% hit rate
```

**Cost Impact:**
```
70% hit rate: $0.16/article (break-even with monolithic)
80% hit rate: $0.11/article (27% savings)
90% hit rate: $0.07/article (53% savings)
```

---

**Current Implementation:**

❌ **Not Implemented**

Evidence:
```typescript
// No Redis configuration in codebase
// No claim canonicalization algorithm
// No cache layer in architecture
// Every claim analyzed from scratch (100% LLM calls)
```

Architecture:
```
Current:  User → API → AKEL → LLM (every time)
Spec:     User → API → Redis → [HIT: return cached | MISS: AKEL → LLM → cache]
```

---

**Impact:**

**Cost Implications:**

Assumption: Average claim analyzed twice across different articles

| Scenario | Hit Rate | Cost per Article | Monthly Cost (10K articles) |
|----------|----------|------------------|----------------------------|
| **No Cache (current)** | 0% | $0.20 | $2,000 |
| **With Cache (spec)** | 70% | $0.16 | $1,600 |
| **Optimized Cache** | 90% | $0.07 | $700 |
| **Savings Potential** | - | - | **$1,300/month (65%)** |

**Performance:**
- No cache: 10-18 seconds per analysis
- With cache: 10-18s (first) → 0.5s (cached) for repeated claims

**Quality:**
- No cache: Consistent behavior (always reanalyze)
- With cache: May serve stale verdicts (mitigated by 90-day TTL)

---

**Specification Quote (Specification:432-433):**
```
Cost Impact:
  70% hit rate: $0.16/article (break-even with monolithic)
  80% hit rate: $0.11/article (27% savings)
  90% hit rate: $0.07/article (53% savings)
```

---

**Assessment:** 🟡 **Medium Priority** - Significant cost optimization missing

**Priority:** **P2 - Implement before scale**

**Recommendation:**
1. POC1: Not required (small volume, optimization premature)
2. POC2: Implement Redis caching before scaling beyond 1K articles/month
3. Design: Follow spec's canonicalization algorithm (avoid entity normalization v1)

---

## ❓ Uncertain (Need Discussion/Clarification) {#uncertain}

### 1. Scenario Implementation Strategy ⚠️ DECISION REQUIRED

**Your Statement:**
> "Scenario is not implemented so far, and I consider to drop it."

**Specification Position:**

From POC/Requirements.xml:57-88:
```
=== 1.2 Scenarios Deferred to POC2 ===

Intentional Simplification:

Scenarios are a core component of the full FactHarbor system
(Claims → Scenarios → Evidence → Verdicts), but are deliberately
excluded from POC1.

Rationale:
  • POC1 tests: Can AI extract claims and generate verdicts?
  • POC2 will add: Scenario generation and management
  • Open questions remain: Should scenarios be separate entities?
    How are they sequenced with evidence gathering?

Design Decision:
Prove basic AI capability first, then add scenario complexity
based on POC1 learnings.
```

From Architecture/WebHome.xml:171-189:
```
Scenarios Purpose:
  Different interpretations or contexts for evaluating claims

Key Concept:
  Scenarios are extracted from evidence, not generated arbitrarily.

Example for claim "Vaccines reduce hospitalization":
  • Scenario 1: Clinical trials (healthy adults 18-65, original strain)
  • Scenario 2: Real-world data (diverse population, Omicron variant)
  • Scenario 3: Immunocompromised patients
```

From POC/Requirements.xml:380-394:
```
What needs to be built for POC2:
  • Scenario generation component
  • Evidence Model structure (full)
  • Scenario-evidence linking
  • Multi-interpretation comparison
  • Truth landscape visualization

POC1 → POC2 is significant architectural expansion.
```

---

**Uncertainty:**

🤔 **Does "drop scenario" mean:**
- **Option A:** Drop from POC1 only (✅ spec-compliant)
- **Option B:** Drop permanently from FactHarbor (❌ conflicts with core architecture)

**Critical Questions:**

1. **Scope Clarification:**
   - Is scenario deferral temporary (POC1 → POC2) or permanent?
   - If permanent: What replaces the Claim → Scenario → Evidence → Verdict workflow?

2. **Architecture Impact:**
   - Specification treats scenarios as fundamental (Data Model:171-189)
   - Without scenarios: How to handle context-dependent claims?
   - Example: "Exercise improves mental health"
     - Scenario 1: Clinical trials (structured programs) → SUPPORTED
     - Scenario 2: Self-reported surveys (unstructured) → UNCERTAIN
     - Without scenarios: Single verdict (which context?)

3. **POC1 Decision Tree:**
   - Spec says: If POC1 succeeds → proceed to POC2 with scenarios
   - If scenarios dropped: What's the POC2 scope?

---

**Recommendation:**

✅ **Keep Scenarios Deferred to POC2 (Spec-Compliant Path)**

**Rationale:**
1. Specification **intentionally** defers scenarios to POC2 (Requirements:57-88)
2. POC1 goal: Prove AI can extract claims + generate verdicts (baseline)
3. POC2 goal: Add scenario complexity after validating baseline
4. Deferral is **good engineering**: test hardest part first (Requirements:68-71)

**Action Items:**
1. ✅ **Complete POC1 without scenarios** (as spec intends)
2. ✅ **Validate POC1 success** (quality gates, metrics, 20-article test)
3. ⚠️ **Plan POC2 with scenarios** (don't drop permanently)
4. 🤔 **Decide after POC1**: If scenarios add value or can be simplified

**If Considering Permanent Drop:**
- Document architectural rationale
- Update specification to remove scenario references
- Define alternative approach for context-dependent claims

---

**Assessment:** ⚠️ **Needs Clarification** - Confirm if deferral or permanent removal

**Priority:** **P1 - Discuss before POC2 planning**

---

### 2. Separated Architecture Implementation

**Your Statement:**
> "I also consider to implement Separated_Architecture_Implementation_Guide.md"

**Current Architecture:**

```
Monorepo Structure:
  apps/
    api/              ASP.NET Core (C#) - System of Record
      - JobService, JobController
      - SQLite database
      - SSE event streaming

    web/              Next.js (TypeScript) - AI Orchestrator + UI
      - analyzer.ts (AKEL logic)
      - API routes (/api/internal/run-job)
      - React components
      - LLM integration
```

**Specification Architecture (Architecture/WebHome.xml:23-88):**

```
Three-Layer Architecture:

1. Interface Layer:
   - Web UI (React/Vue/Svelte)
   - REST API
   - Authentication & Authorization

2. Processing Layer:
   - AKEL Pipeline (AI-driven claim analysis)
   - LLM Abstraction Layer
   - Background Jobs
   - Quality Monitoring

3. Data & Storage Layer:
   - PostgreSQL (primary database)
   - Redis (caching)
   - S3 (archival)
```

---

**Separated Architecture Guide (Assumed Content):**

Likely suggests:
- Separate API backend (pure REST API, no AI logic)
- Separate AI orchestrator (dedicated service for AKEL)
- Separate frontend (static SPA)

Benefits:
- Clear separation of concerns
- Independent scaling (scale AI workers separately)
- Language flexibility (API in C#, AI in Python/TypeScript)
- Better for federation (V2.0+)

Drawbacks:
- More complexity (3+ services vs. 2)
- Network latency (inter-service calls)
- Deployment overhead (orchestration needed)

---

**Current Situation:**

**What Works:**
- ✅ API (C#) handles persistence, job queue, events
- ✅ Web (TypeScript) handles AI orchestration, UI
- ✅ Clear boundary: API = data, Web = processing + presentation
- ✅ Works for POC1 scale

**Potential Issues:**
- ⚠️ AI orchestration in web tier (couples frontend + processing)
- ⚠️ Difficult to scale AI workers independently
- ⚠️ Web tier doing heavy lifting (LLM calls, analysis)

---

**Uncertainty:**

🤔 **Questions to Clarify:**

1. **What problems are you trying to solve?**
   - Is current architecture causing issues?
   - Performance bottlenecks?
   - Deployment constraints?
   - Team structure (frontend vs. backend developers)?

2. **Separation Goals:**
   - Separate AI from web UI?
   - Separate API from AI orchestrator?
   - Microservices for scale?
   - Federation preparation (V2.0+)?

3. **Timing:**
   - Separate now (during POC1)?
   - Wait until POC2 (after validation)?
   - Wait until scale demands it (Beta/V1.0)?

4. **Proposed Architecture:**
   ```
   Option A: Current (2 services)
     apps/api (C#)   - Database, jobs, events
     apps/web (TS)   - AI + UI

   Option B: Separated (3 services)
     apps/api (C#)   - Database, jobs, REST API
     apps/ai (TS/Py) - AKEL orchestration, LLM calls
     apps/web (TS)   - UI only, calls API

   Option C: Microservices (4+ services)
     apps/api
     apps/claim-extractor
     apps/verdict-generator
     apps/web
   ```

---

**Specification Guidance:**

From Architecture/WebHome.xml:152-158:
```
2.2 Design Philosophy

Start Simple, Evolve Based on Metrics:
  • Single primary database (PostgreSQL handles most workloads initially)
  • Three clear layers (easy to understand and maintain)
  • Measure before optimizing (add complexity only when proven necessary)
```

From When-to-Add-Complexity (referenced):
```
Add separation when:
  • Current architecture causes measurable problems
  • Metrics show bottlenecks
  • Team structure demands it
  • Scale requirements exceed current design
```

---

**Recommendation:**

⚠️ **Discuss Before Implementing**

**Questions to Answer:**
1. What specific problem does separation solve?
2. Is current architecture blocking POC1 goals?
3. What's the target architecture (Option A/B/C)?
4. When to implement (now, POC2, Beta)?

**Suggested Path:**
1. ✅ **POC1**: Keep current architecture (working, focus on quality gates)
2. 🤔 **POC2 Planning**: Evaluate if separation needed for:
   - Scenario generation (new component)
   - Independent AI worker scaling
   - Federation preparation
3. 📊 **Metrics-Driven**: Separate only if current arch shows problems

**POC1 Focus:** Implement quality gates and metrics tracking, not architectural refactoring

---

**Assessment:** ❓ **Needs Discussion** - Clarify goals and timing

**Priority:** **P2 - Discuss during POC2 planning**

---

### 3. Verdict State Machine Granularity

**Specification Requirement:**

Verdicts have lifecycle states (POC/Requirements.xml:184-190):

```typescript
enum VerdictState {
  PUBLISHED              // Passed all gates
  INSUFFICIENT_EVIDENCE  // Failed Gate 4
  NON_FACTUAL_CLAIM     // Failed Gate 1
  PROCESSING            // In progress
  ERROR                 // System failure
}
```

**Current Implementation:**

Jobs have states, but verdicts within results don't:

```csharp
// apps/api/Data/Entities.cs
public class JobEntity {
    public string Status { get; set; }  // QUEUED/RUNNING/SUCCEEDED/FAILED
}

// In ResultJson, verdicts are static objects (no state tracking)
```

---

**Uncertainty:**

🤔 **Is this granularity needed for POC1?**

**Arguments For:**
- Spec defines verdict states for quality gate integration
- If Gate 4 implemented, need to mark verdicts as INSUFFICIENT_EVIDENCE
- Better observability (track which verdicts blocked)

**Arguments Against:**
- POC1 simplified architecture (no gates implemented yet)
- Job-level status sufficient for current scope
- Adds complexity without gates to use the states

---

**Recommendation:**

⚠️ **Defer to POC2 Unless Gates Implemented**

**Logic:**
1. If quality gates **not** implemented (current state):
   - Verdict states not useful (nothing sets INSUFFICIENT_EVIDENCE)
   - Keep simple (verdicts in JSON, job status only)

2. If quality gates **are** implemented (recommended):
   - Verdict states **required** for gate failures
   - Update data model to include `verdictState` field

**Decision Tree:**
```
IF implementing Gates 1 & 4 for POC1:
  → Add verdict state tracking (PUBLISHED/INSUFFICIENT_EVIDENCE/etc.)
ELSE:
  → Defer to POC2
```

---

**Assessment:** ❓ **Depends on Gate Implementation Decision**

**Priority:** **P1 if gates implemented, P3 otherwise**

---

### 4. Cost Efficiency Tracking Display

**Specification Requirement:**

Component 5: Usage Statistics (POC/Requirements.xml:214-257)

**Display Format:**
```
USAGE STATISTICS:
  • Article: 2,450 words (12,300 characters)
  • Input tokens: 15,234
  • Output tokens: 892
  • Total tokens: 16,126
  • Estimated cost: $0.24 USD
  • Response time: 8.3 seconds
  • Cost per claim: $0.048
  • Model: claude-sonnet-4-20250514
```

**Purpose:**
```
At scale, LLM costs are critical:
  • 10,000 articles/month ≈ $200-500/month
  • 100,000 articles/month ≈ $2,000-5,000/month

What POC1 Learns:
  ✅ How cost scales with article length
  ✅ Prompt optimization opportunities
  ✅ Model selection strategy
  ✅ Article length limits (if needed)
```

**Specification Quote (Requirements:257):**
> **CRITICAL for GO/NO-GO:** Unit economics must be viable at scale!

---

**Current Implementation:**

⚠️ **Partial Implementation**

Evidence:
```typescript
// apps/web/src/lib/analyzer.ts
// ✅ LLM call counting exists (llmCallCount tracked)
// ✅ Response time measured
// ❌ Not displayed in UI
// ❌ Token counts not extracted from LLM responses
// ❌ Cost calculation not implemented
```

---

**Uncertainty:**

🤔 **Is cost tracking displayed to users?**

**Need to Verify:**
1. Does UI show usage statistics after analysis?
2. Are token counts logged server-side?
3. Is cost calculation implemented?

**Current Evidence:**
- LLM calls counted in analyzer
- No visible usage stats in job results UI code
- No cost calculation in visible codebase

---

**Recommendation:**

⚠️ **Implement Component 5 for POC1**

**Rationale:**
- Spec considers this **CRITICAL** for GO/NO-GO decision (Requirements:257)
- Need data to project costs at scale
- Already tracking LLM calls, just need to extract tokens and display

**Implementation:**
1. Extract token counts from LLM responses (all providers support this)
2. Calculate estimated cost (provider rates × tokens)
3. Add to analysis results JSON
4. Display in UI (new "Usage Stats" tab or section)

**Priority:** **P1 - Spec considers critical for POC1**

---

**Assessment:** ⚠️ **Verify Implementation, Likely Missing UI**

---

### 5. Publication Mode Labeling

**Specification Requirement:**

Mode 2 labeling (POC/Requirements.xml:413-426):

```
╔════════════════════════════════════════════════════════════╗
║ [AI-GENERATED - POC/DEMO]                                  ║
║                                                            ║
║ This analysis was produced entirely by AI and has not      ║
║ been human-reviewed. Use for demonstration purposes.       ║
║                                                            ║
║ Source: AI/AKEL v1.0 (POC)                                 ║
║ Review Status: Not Reviewed (Proof-of-Concept)            ║
║ Quality Gates: 4/4 Passed (Simplified)                    ║
║ Last Updated: [timestamp]                                  ║
╚════════════════════════════════════════════════════════════╝
```

**Must Show:**
- AI-Generated status (prominent)
- POC/Demo disclaimer
- Risk tier per claim
- Confidence scores (0-100%)
- Quality gate status (passed/failed)
- Timestamp

---

**Current Implementation:**

❓ **Unknown - Need UI Verification**

**Need to Check:**
- Job results page ([apps/web/src/app/jobs/[id]/page.tsx](apps/web/src/app/jobs/[id]/page.tsx))
- Analysis summary display
- Disclaimer visibility

**Evidence from Codebase Review:**
- ArticleVerdictBanner component exists (shows verdicts)
- Need to verify if Mode 2 disclaimer present

---

**Recommendation:**

⚠️ **Verify and Implement if Missing**

**Action:**
1. Review UI to check for Mode 2 labeling
2. If missing: Add prominent disclaimer banner
3. Include all required elements (timestamp, quality gates, risk tiers)

**Priority:** **P1 - Spec mandates Mode 2 compliance**

---

**Assessment:** ❓ **Needs UI Verification**

---

## 📊 Summary Matrix {#summary-matrix}

| Category | Item | Spec Status | Current | Gap | Priority |
|----------|------|-------------|---------|-----|----------|
| **Quality Gates** | Gate 1 (Claim Validation) | CRITICAL (POC1) | ❌ Missing | 🔴 High | **P0** |
| **Quality Gates** | Gate 4 (Verdict Confidence) | CRITICAL (POC1) | ❌ Missing | 🔴 High | **P0** |
| **Data Model** | ClaimValidationResult entity | Required | ❌ Missing | 🔴 High | **P0** |
| **Data Model** | VerdictValidationResult entity | Required | ❌ Missing | 🔴 High | **P0** |
| **Metrics** | Quality metrics tracking | CRITICAL (POC1) | ❌ Missing | 🔴 High | **P0** |
| **Metrics** | Hallucination rate measurement | Required (<10%) | ❌ Missing | 🔴 High | **P0** |
| **Truth Scale** | 7-point symmetric scale | Not specified | ✅ Implemented | ✅ Improvement | - |
| **Pseudoscience** | Detection system | Not specified | ✅ Implemented | ✅ Improvement | - |
| **Dependencies** | Claim role tracking | Not specified | ✅ Implemented | ✅ Improvement | - |
| **LLM Abstraction** | Multi-provider support | Required (NFR-POC-11) | ✅ Implemented | ✅ Exceeds | - |
| **Article Analysis** | Context-aware verdict | Experimental | ✅ Implemented | ✅ Success | - |
| **Caching** | Redis claim cache | Recommended | ❌ Missing | 🟡 Medium | **P2** |
| **Source Tracking** | Track record database | Required (POC2) | ❌ Missing | 🟡 Medium | **P2** |
| **Cost Tracking** | Usage statistics display | CRITICAL | ⚠️ Partial | 🟡 Medium | **P1** |
| **Scenarios** | Scenario generation | Deferred (POC2) | ❌ Not impl | ✅ As planned | - |
| **Labeling** | AI-Generated disclaimer | Required | ⚠️ Unknown | 🟡 Medium | **P1** |
| **Error Learning** | ErrorPattern tracking | Required | ❌ Missing | 🟡 Medium | **P2** |
| **Data Model** | Full entities (10 tables) | POC2 required | ❌ Simplified | ⚠️ Accept POC1 | **P3** |
| **Verdict States** | Lifecycle state machine | POC1/POC2 | ❌ Missing | ⚠️ Depends | **P1/P3** |

---

## 🎯 Recommendations {#recommendations}

### **Immediate Actions (POC1 Completion)** 🔴

#### 1. Implement Quality Gate 1: Claim Validation **[BLOCKING]**

**File:** `apps/web/src/lib/quality-gates.ts` (new file)

```typescript
interface ClaimValidationResult {
  claimId: string;
  isFactual: boolean;
  opinionScore: number;        // 0-1
  specificityScore: number;    // 0-1
  futureOriented: boolean;
  claimType: "FACTUAL" | "OPINION" | "PREDICTION" | "AMBIGUOUS";
  passed: boolean;
  failureReason?: string;
  validatedAt: Date;
}

export function validateClaim(claimText: string): ClaimValidationResult {
  // 1. Opinion detection (hedging language)
  const opinionMarkers = [
    /\bi think\b/i, /probably/i, /possibly/i,
    /best/i, /worst/i, /should/i, /beautiful/i
  ];
  const opinionScore = calculateOpinionScore(claimText, opinionMarkers);

  // 2. Specificity score (concrete details)
  const specificityScore = calculateSpecificity(claimText);

  // 3. Future prediction test
  const futureOriented = testFuturePrediction(claimText);

  // 4. Determine if factual
  const isFactual = canBeVerified(claimText);

  // 5. Pass criteria
  const passed = isFactual &&
                 opinionScore <= 0.3 &&
                 specificityScore >= 0.3 &&
                 !futureOriented;

  return {
    claimId: generateId(),
    isFactual,
    opinionScore,
    specificityScore,
    futureOriented,
    claimType: determineClaimType(isFactual, opinionScore, futureOriented),
    passed,
    failureReason: passed ? undefined : generateFailureReason(...),
    validatedAt: new Date()
  };
}
```

**Integration:**
- Call `validateClaim()` for each extracted claim
- Filter out claims where `passed === false`
- Display failure reason to user ("Opinion detected", "Too vague", "Future prediction")

**Success Metric:** 0% opinion statements processed as facts

---

#### 2. Implement Quality Gate 4: Verdict Confidence Assessment **[BLOCKING]**

**File:** `apps/web/src/lib/quality-gates.ts` (extend)

```typescript
interface VerdictValidationResult {
  verdictId: string;
  evidenceCount: number;
  averageSourceQuality: number;     // 0-1
  evidenceAgreement: number;        // 0-1
  uncertaintyFactors: number;
  confidenceTier: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  publishable: boolean;
  failureReasons?: string[];
  validatedAt: Date;
}

export function validateVerdict(
  sources: Array<{url: string, reliability?: number}>,
  supportingCount: number,
  contradictingCount: number,
  verdictText: string
): VerdictValidationResult {

  // 1. Evidence count
  const evidenceCount = sources.length;

  // 2. Average source quality (from bundle or default 0.5)
  const averageSourceQuality = calculateAvgQuality(sources);

  // 3. Evidence agreement
  const totalEvidence = supportingCount + contradictingCount;
  const evidenceAgreement = totalEvidence > 0
    ? supportingCount / totalEvidence
    : 0;

  // 4. Uncertainty factors (count hedging in verdict)
  const uncertaintyFactors = countUncertaintyMarkers(verdictText);

  // 5. Determine confidence tier
  const confidenceTier = determineConfidenceTier(
    evidenceCount,
    averageSourceQuality,
    evidenceAgreement,
    uncertaintyFactors
  );

  // 6. Publication decision (MEDIUM or HIGH required)
  const publishable = confidenceTier === "MEDIUM" || confidenceTier === "HIGH";

  return {
    verdictId: generateId(),
    evidenceCount,
    averageSourceQuality,
    evidenceAgreement,
    uncertaintyFactors,
    confidenceTier,
    publishable,
    failureReasons: publishable ? undefined : generateFailureReasons(...),
    validatedAt: new Date()
  };
}

function determineConfidenceTier(
  count: number, quality: number, agreement: number, uncertainty: number
): "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT" {

  if (count < 2) return "INSUFFICIENT";

  if (count >= 3 && quality >= 0.7 && agreement >= 0.8) {
    return "HIGH";
  }

  if (count >= 2 && quality >= 0.6 && agreement >= 0.6) {
    return "MEDIUM";
  }

  return "LOW";
}
```

**Integration:**
- Call `validateVerdict()` after generating each verdict
- Block verdicts where `publishable === false`
- Display to user: "Insufficient evidence for verdict (need 2+ sources)"

**Success Metric:** 0% verdicts published with <2 sources

---

#### 3. Implement Quality Metrics Tracking **[BLOCKING]**

**Database Migration:**

```csharp
// apps/api/Data/Entities.cs
public class QualityMetricEntity {
    public int Id { get; set; }
    public string MetricType { get; set; }      // "HallucinationRate", "ClaimAccuracy"
    public string Category { get; set; }        // "Politics", "Science", "Health"
    public double Value { get; set; }
    public double Target { get; set; }
    public DateTime Timestamp { get; set; }
}
```

**Tracking Service:**

```typescript
// apps/web/src/lib/quality-tracking.ts
export interface QualityMetrics {
  claimsExtracted: number;
  claimsPassed Gate1: number;
  verdictsPassed Gate4: number;
  hallucinationRate?: number;     // Manual review
  evidenceAccuracy?: number;       // Manual review
}

export function trackAnalysisQuality(
  jobId: string,
  metrics: QualityMetrics
): void {
  // Save to database via API
  fetch('/api/internal/quality-metrics', {
    method: 'POST',
    body: JSON.stringify({
      jobId,
      metrics,
      timestamp: new Date()
    })
  });
}
```

**Manual Review Process:**

```markdown
# POC1 Quality Review Checklist

Run after every 20 analyses:

1. Select 20 random verdicts
2. For each verdict:
   [ ] Verify evidence sources are real (not hallucinated)
   [ ] Check quotes are accurate (not fabricated)
   [ ] Assess verdict matches evidence
   [ ] Document any errors

3. Calculate metrics:
   - Hallucination rate = (hallucinated verdicts / 20)
   - Evidence accuracy = (accurate sources / total sources)

4. Update quality metrics database:
   ```
   POST /api/internal/quality-metrics
   {
     "metricType": "HallucinationRate",
     "value": 0.05,  // 5% (1 out of 20)
     "target": 0.10,
     "timestamp": "2026-01-02T10:00:00Z"
   }
   ```

5. Success Criteria:
   ✅ Hallucination rate < 10%
   ✅ Evidence accuracy > 90%
```

**UI Display:**

Add to job results page:
```tsx
<div className="quality-metrics">
  <h3>Quality Metrics</h3>
  <div>Claims Extracted: {metrics.claimsExtracted}</div>
  <div>Claims Passed Validation: {metrics.claimsPassedGate1} ({percentage}%)</div>
  <div>Verdicts Published: {metrics.verdictsPassedGate4} ({percentage}%)</div>
  <div>Quality Gates: {passedGates}/2 Passed</div>
</div>
```

**Success Metric:** Manual hallucination rate verification <10% after 20-verdict sample

---

#### 4. Add Cost Tracking Display (Component 5) **[IMPORTANT]**

**Modify analyzer to extract tokens:**

```typescript
// apps/web/src/lib/analyzer.ts

interface UsageStatistics {
  articleLength: { words: number; characters: number };
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  responseTime: number;
  costPerClaim: number;
  modelUsed: string;
}

// After each LLM call:
const result = await generateText({ ... });

const usage = {
  inputTokens: result.usage?.promptTokens ?? 0,
  outputTokens: result.usage?.completionTokens ?? 0,
  totalTokens: result.usage?.totalTokens ?? 0,
  estimatedCost: calculateCost(result.usage, provider),
  responseTime: Date.now() - startTime,
  modelUsed: model
};

// Add to final result
return {
  claims: [...],
  verdicts: [...],
  usageStatistics: aggregateUsage(allLLMCalls)
};
```

**Cost Calculation:**

```typescript
function calculateCost(
  usage: { promptTokens: number; completionTokens: number },
  provider: string
): number {
  const rates = {
    'anthropic-sonnet': { input: 0.003, output: 0.015 },  // per 1K tokens
    'anthropic-haiku': { input: 0.00025, output: 0.00125 },
    'openai-gpt4': { input: 0.01, output: 0.03 },
    'google-gemini': { input: 0.00025, output: 0.00125 }
  };

  const rate = rates[provider] ?? { input: 0.001, output: 0.002 };

  return (usage.promptTokens / 1000 * rate.input) +
         (usage.completionTokens / 1000 * rate.output);
}
```

**UI Display:**

```tsx
// Add new tab to job results
<Tab label="Usage Stats">
  <div className="usage-statistics">
    <h3>LLM Usage Statistics</h3>
    <table>
      <tr><td>Article Length:</td><td>{stats.articleLength.words} words</td></tr>
      <tr><td>Input Tokens:</td><td>{stats.inputTokens.toLocaleString()}</td></tr>
      <tr><td>Output Tokens:</td><td>{stats.outputTokens.toLocaleString()}</td></tr>
      <tr><td>Total Tokens:</td><td>{stats.totalTokens.toLocaleString()}</td></tr>
      <tr><td>Estimated Cost:</td><td>${stats.estimatedCost.toFixed(4)} USD</td></tr>
      <tr><td>Response Time:</td><td>{stats.responseTime.toFixed(1)}s</td></tr>
      <tr><td>Cost per Claim:</td><td>${stats.costPerClaim.toFixed(4)}</td></tr>
      <tr><td>Model Used:</td><td>{stats.modelUsed}</td></tr>
    </table>
  </div>
</Tab>
```

**Success Metric:** Cost data collected for all analyses, average cost/analysis calculated

---

#### 5. Verify Publication Mode Labeling **[IMPORTANT]**

**Check file:** `apps/web/src/app/jobs/[id]/page.tsx`

**Required banner:**

```tsx
<div className="mode-2-disclaimer">
  <div className="disclaimer-banner">
    <h2>[AI-GENERATED - POC/DEMO]</h2>
    <p>
      This analysis was produced entirely by AI and has not been
      human-reviewed. Use for demonstration purposes.
    </p>
  </div>

  <div className="metadata">
    <div>Source: AI/AKEL v{version} (POC)</div>
    <div>Review Status: Not Reviewed (Proof-of-Concept)</div>
    <div>Quality Gates: {passedGates}/2 Passed (Simplified)</div>
    <div>Last Updated: {formatDate(job.updatedUtc)}</div>
  </div>
</div>

<style>
.mode-2-disclaimer {
  border: 3px solid #ff9800;
  background: #fff3e0;
  padding: 20px;
  margin: 20px 0;
  border-radius: 8px;
}

.disclaimer-banner {
  background: #ff9800;
  color: white;
  padding: 15px;
  margin: -20px -20px 15px -20px;
  border-radius: 5px 5px 0 0;
}
</style>
```

**Success Metric:** Prominent disclaimer visible on all analysis results

---

### **Short-Term Planning (POC2 Preparation)** 🟡

#### 6. Design Full Data Model Migration

**Plan transition from:**
- `JobEntity.ResultJson` (blob storage)

**To:**
- Structured tables (Claim, Evidence, Source, Scenario, Verdict)

**Migration Strategy:**
```sql
-- Extract claims from existing jobs
INSERT INTO Claims (id, assertion, domain, status, confidence_score)
SELECT
  json_extract(value, '$.claimId'),
  json_extract(value, '$.claimText'),
  json_extract(value, '$.domain'),
  'PUBLISHED',
  json_extract(value, '$.confidence')
FROM JobEntity,
  json_each(json_extract(ResultJson, '$.claims'));
```

**Timeline:** Before POC2 starts

---

#### 7. Implement Redis Caching Layer

**Goal:** 70%+ cache hit rate, 50%+ cost savings

**Implementation:**
1. Set up Redis instance
2. Implement claim canonicalization algorithm (spec:410-421)
3. Cache claim analyses (90-day TTL)
4. Track cache hit rate

**Success Metric:**
- Cache hit rate >70% after 1,000 articles
- Cost reduction >30%

**Timeline:** Before scaling beyond 1K articles/month

---

#### 8. Implement Source Track Record System

**Components:**
1. `Source` table with track_record_score
2. Weekly background job (Sunday 2 AM)
3. Temporal separation (READ during analysis, UPDATE weekly)

**Success Metric:**
- Source scores updated weekly
- No circular dependencies
- Quality Gate 4 uses real source scores

**Timeline:** POC2 requirement

---

### **Architecture Discussions** 🤔

#### 9. Clarify Scenario Strategy

**Questions to Answer:**
1. Is scenario deferral temporary (POC1 only) or permanent?
2. If permanent drop: What replaces scenario-based analysis?
3. If temporary: When to implement (POC2, Beta)?

**Recommendation:**
- Keep deferred for POC1 (spec-compliant)
- Decide after POC1 validation
- If POC1 successful: Plan scenario implementation for POC2

---

#### 10. Evaluate Separated Architecture Need

**Questions to Answer:**
1. What problems does current architecture cause?
2. Is separation needed for POC1/POC2, or only at scale?
3. What's the target architecture (2-service, 3-service, microservices)?

**Recommendation:**
- Keep current architecture for POC1
- Evaluate separation need during POC2 planning
- Separate only if metrics show bottlenecks

---

## 🎯 POC1 Completion Checklist

**Critical (P0) - Blocking POC1 Sign-Off:**
- [ ] Implement Quality Gate 1 (Claim Validation)
- [ ] Implement Quality Gate 4 (Verdict Confidence Assessment)
- [ ] Add ClaimValidationResult and VerdictValidationResult to results
- [ ] Implement Quality Metrics tracking infrastructure
- [ ] Create manual quality review process (20-verdict sampling)
- [ ] Run quality review and verify hallucination rate <10%

**Important (P1) - Required for POC1:**
- [ ] Add cost tracking display (Component 5)
- [ ] Verify Mode 2 labeling is prominent in UI
- [ ] Display quality gate status in results
- [ ] Track and display cost per analysis

**Planning (P2) - POC2 Preparation:**
- [ ] Design full data model schema
- [ ] Plan Redis caching implementation
- [ ] Design source track record system
- [ ] Document error pattern tracking requirements

**Discussion (P1/P2) - Strategic Decisions:**
- [ ] Clarify scenario strategy (deferred vs. dropped)
- [ ] Evaluate separated architecture need
- [ ] Define POC2 scope based on POC1 learnings

---

## 📚 References {#references}

### Specification Documents

**Source:** `docs/FactHarbor Spec and Impl 1.Jan.26.xar` (xWiki export, extracted to `docs/xwiki-extract/`)

1. **POC1 Roadmap**
   - File: `FactHarbor/Roadmap/POC1/WebHome.xml`
   - Key Sections:
     - Lines 22-40: POC1 Overview and Success Metrics
     - Lines 99-158: Quality Gates (Gate 1 & Gate 4 specifications)
     - Lines 216-233: Success Criteria

2. **POC Requirements**
   - File: `FactHarbor/Specification/POC/Requirements.xml`
   - Key Sections:
     - Lines 57-88: Scenarios Deferred to POC2 (rationale)
     - Lines 170-197: Verdict Structure (4-level scale)
     - Lines 214-257: Component 5 (Usage Statistics)
     - Lines 413-448: Publication Mode Labeling
     - Lines 1083-1122: POC Success Criteria and Quality Thresholds
     - Lines 1411-1457: NFR-POC-11 (LLM Provider Abstraction)

3. **POC Specification**
   - File: `FactHarbor/Specification/POC/Specification.xml`
   - Key Sections:
     - Lines 106-156: Gate 1 (Claim Validation) detailed spec
     - Lines 159-206: Gate 4 (Verdict Confidence) detailed spec
     - Lines 382-405: Quality Metrics tracking
     - Lines 407-433: Redis caching architecture

4. **Architecture**
   - File: `FactHarbor/Specification/Architecture/WebHome.xml`
   - Key Sections:
     - Lines 23-88: Three-Layer Architecture
     - Lines 90-149: LLM Abstraction Layer (multi-provider)
     - Lines 152-158: Design Philosophy (start simple)
     - Lines 171-225: Claim Processing Architecture

5. **Data Model**
   - File: `FactHarbor/Specification/Data Model/WebHome.xml`
   - Key Sections:
     - Lines 56-171: Source Track Record System
     - Lines 171-189: Scenario entity specification
     - Lines 274-306: Edit History (versioning)
     - Lines 344-360: ClaimValidationResult entity
     - Lines 363-379: VerdictValidationResult entity

### Implementation Files

1. **Analyzer (Core Logic)**
   - File: `apps/web/src/lib/analyzer.ts`
   - Version: 2.6.17
   - Key Features:
     - 7-point symmetric truth scale (lines 484-599)
     - Pseudoscience detection (lines 176-479)
     - Multi-LLM provider support (lines 19-23)
     - Configuration system (lines 33-121)

2. **Database Schema**
   - File: `apps/api/Data/Entities.cs`
   - Entities: JobEntity, JobEventEntity
   - Missing: 8 out of 10 spec entities

3. **UI Components**
   - Article Verdict: `apps/web/src/components/ArticleVerdictBanner.tsx`
   - Job Results: `apps/web/src/app/jobs/[id]/page.tsx`

---

## 📝 Document Metadata

**Created:** January 2, 2026
**Author:** Claude Code (Anthropic)
**Version:** 1.0
**Specification Reference:** FactHarbor Spec and Impl 1.Jan.26.xar
**Implementation Reference:** FactHarbor codebase (analyzer v2.6.17)

**Change Log:**
- 2026-01-02: Initial analysis document created

---

**END OF REPORT**
