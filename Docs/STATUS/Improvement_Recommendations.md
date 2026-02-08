# FactHarbor Improvement Recommendations

**Version**: 2.6.21  
**Last Updated**: January 14, 2026  
**Status**: Analysis based on source code and xWiki specifications

---

## Executive Summary

This document provides comprehensive improvement recommendations for FactHarbor based on analysis of the current codebase (v2.6.21), xWiki specifications, and comparison with chatbot fact-checking approaches.

**Key Areas**:
- Security & Cost Control (Critical for production)
- Performance & Cost Optimization (50-85% potential savings)
- User Experience Enhancements
- Technical Debt Reduction
- Monitoring & Operations

**Note**: Security items marked as LOW urgency while FactHarbor remains a local POC. All security items become HIGH urgency before any public deployment.

---

## Table of Contents

1. [Critical (Pre-Production)](#critical-pre-production)
2. [High Priority (Quality & Performance)](#high-priority-quality--performance)
3. [Medium Priority (User Experience)](#medium-priority-user-experience)
4. [Low Priority (Nice to Have)](#low-priority-nice-to-have)
5. [Technical Debt & Architecture](#technical-debt--architecture)
6. [Monitoring & Operations](#monitoring--operations)
7. [Cost Optimization Summary](#cost-optimization-summary)
8. [Implementation Roadmap](#implementation-roadmap)

---

## Critical (Pre-Production)

### 1. Security Hardening

**Current State**: Public endpoints, no rate limiting, SSRF vulnerabilities

**Recommendations**:

```typescript
// A. SSRF Protection (apps/web/src/lib/retrieval.ts)
interface SSRFConfig {
  maxRedirects: 3;
  maxSize: 10 * 1024 * 1024; // 10MB
  timeout: 30000;
  blockedIPs: [
    '127.0.0.0/8',      // Localhost
    '10.0.0.0/8',       // Private
    '172.16.0.0/12',    // Private
    '192.168.0.0/16'    // Private
  ];
  allowedSchemes: ['http', 'https'];
}

// B. Rate Limiting Middleware
interface RateLimitConfig {
  windowMs: 15 * 60 * 1000; // 15 minutes
  max: 10; // 10 analyses per window
  skipSuccessfulRequests: false;
  standardHeaders: true;
}

// C. Admin Endpoint Authentication
// apps/web/src/app/admin/test-config/page.tsx
// Add middleware to verify FH_ADMIN_KEY before allowing access
```

**Priority**: 🔴 CRITICAL (for production)  
**Urgency**: LOW (while POC/local only)  
**Importance**: HIGH  
**Added to Backlog**: Yes

---

### 2. Cost Control & Quotas

**Current State**: No spending limits, potential runaway costs

**Recommendations**:

```typescript
// apps/web/src/lib/cost-control.ts (NEW FILE)

interface CostQuota {
  maxLLMCallsPerJob: 50;
  maxLLMCallsPerDay: 1000;
  maxSearchQueriesPerJob: 10;
  maxSearchQueriesPerDay: 500;
  alertThreshold: 0.8; // Alert at 80% of quota
}

interface JobCostEstimate {
  estimatedLLMCalls: number;
  estimatedSearchQueries: number;
  estimatedCostUSD: number;
  quotaStatus: 'ok' | 'warning' | 'exceeded';
}

// Features:
// - Track per-user and global quotas
// - Reject jobs that would exceed quotas
// - Provide cost estimates before running analysis
// - Alert when approaching quota limits
```

**Priority**: 🔴 CRITICAL (for production)  
**Urgency**: LOW (while POC/local only)  
**Importance**: HIGH  
**Added to Backlog**: Yes

---

## High Priority (Quality & Performance)

### 3. Tiered LLM Model Routing

**Current State**: Same expensive model (Claude Sonnet) for all tasks

**Problem**: Extraction tasks don't need premium models

**Recommendations**:

```typescript
// apps/web/src/lib/analyzer/model-router.ts (NEW FILE)

const MODEL_ROUTING = {
  // EXTRACTION TASKS (cheap, fast)
  understandClaim: {
    model: 'claude-3-haiku-20240307',     // $0.25/$1.25 per M tokens
    cost: 0.05
  },
  extractFacts: {
    model: 'claude-3-haiku-20240307',
    cost: 0.03
  },
  
  // REASONING TASKS (premium)
  generateVerdicts: {
    model: 'claude-3-5-sonnet-20241022',  // $3/$15 per M tokens
    cost: 0.50
  },
  
  // SYNTHESIS TASKS (balanced)
  generateSummary: {
    model: 'claude-3-5-haiku-20241022',   // $1/$5 per M tokens
    cost: 0.10
  }
};
```

**Benefits**:
- **50-70% reduction in LLM costs**
- No degradation in verdict quality (premium model still used for reasoning)
- Faster extraction phases

**Priority**: 🟠 HIGH  
**Urgency**: MEDIUM  
**Importance**: HIGH  
**Added to Backlog**: Yes

---

### 4. Claim-Level Caching

**Current State**: Every analysis recomputes all claims from scratch

**Problem**: Common claims ("Was the 2020 election secure?") re-researched every time

**Recommendations**:

```typescript
// apps/web/src/lib/claim-cache.ts (NEW FILE)

interface CachedClaimVerdict {
  claimFingerprint: string;     // SHA-256 of normalized text
  verdict: ClaimVerdict;
  supportingEvidenceIds: string[];
  sources: string[];            // Source URLs
  computedAt: Date;
  expiresAt: Date;             // Claims expire after 90 days
  reusedCount: number;
}

// Example workflow:
// 1. Normalize claim: "Was X true?" → "X was true"
// 2. Generate fingerprint: sha256(normalize(claim))
// 3. Check cache: if hit and not expired, reuse verdict
// 4. If miss, research and cache result
```

**Database Schema**:

```sql
CREATE TABLE ClaimVerdictCache (
  Id UNIQUEIDENTIFIER PRIMARY KEY,
  ClaimFingerprint VARCHAR(64) UNIQUE NOT NULL,
  NormalizedText NVARCHAR(1000) NOT NULL,
  VerdictJson NVARCHAR(MAX) NOT NULL,
  SourceUrls NVARCHAR(MAX) NOT NULL,
  ComputedAt DATETIME2 NOT NULL,
  ExpiresAt DATETIME2 NOT NULL,
  ReusedCount INT DEFAULT 0,
  LastReusedAt DATETIME2,
  INDEX IX_ClaimCache_Fingerprint (ClaimFingerprint),
  INDEX IX_ClaimCache_ExpiresAt (ExpiresAt)
);
```

**Benefits**:
- **30-50% reduction in costs** for repeat claims
- **Faster analysis** (skip research for cached claims)
- **Consistency** across analyses

**Priority**: 🟠 HIGH  
**Urgency**: MEDIUM  
**Importance**: HIGH  
**Added to Backlog**: Yes

---

### 5. Parallel Verdict Generation

**Current State**: Claims processed sequentially

**Problem**: 10 claims × 3 seconds each = 30 seconds (unnecessary waiting)

**Recommendations**:

```typescript
// apps/web/src/lib/analyzer.ts - Modify generateVerdicts()

// CURRENT (Sequential):
for (const claim of claims) {
  const verdict = await generateClaimVerdict(claim);
  verdicts.push(verdict);
}
// Time: N claims × 2-5 seconds = 10-50 seconds for 10 claims

// PROPOSED (Parallel):
import pLimit from 'p-limit';

const VERDICT_CONCURRENCY = 5;
const limit = pLimit(VERDICT_CONCURRENCY);

const verdictPromises = claims.map(claim => 
  limit(() => generateClaimVerdict(claim))
);
const verdicts = await Promise.all(verdictPromises);
// Time: ~5 seconds regardless of claim count (up to limit)
```

**Benefits**:
- **50-80% faster** for multi-claim analyses
- No additional cost (same number of API calls)
- Respects API rate limits via concurrency control

**Priority**: 🟠 HIGH  
**Urgency**: MEDIUM  
**Importance**: HIGH  
**Added to Backlog**: Yes

---

### 6. Quality Gate UI Display

**Current State**: Gate stats exist in JSON but not shown to users

**Problem**: Users can't see why claims were filtered or confidence assessment

**Recommendations**:

```tsx
// apps/web/src/app/jobs/[id]/page.tsx - Add Quality Gates Section

function QualityGatesSection({ gate1Stats, gate4Stats }) {
  return (
    <div className={styles.qualityGates}>
      <h3>Quality Assurance</h3>
      
      <div className={styles.gateCard}>
        <h4>Gate 1: Claim Validation</h4>
        <div className={styles.gateStats}>
          <span className={styles.passed}>
            {gate1Stats.passed}/{gate1Stats.total} passed
          </span>
          <span className={styles.filtered}>
            {gate1Stats.filtered} filtered (opinions/predictions)
          </span>
          {gate1Stats.centralKept > 0 && (
            <span className={styles.centralKept}>
              {gate1Stats.centralKept} central claims kept despite issues
            </span>
          )}
        </div>
        
        {/* Show per-claim reasons */}
        <details>
          <summary>View filtered claims</summary>
          <ul>
            {filteredClaims.map(c => (
              <li key={c.id}>
                <strong>{c.text}</strong>
                <span className={styles.reason}>{c.failureReason}</span>
              </li>
            ))}
          </ul>
        </details>
      </div>
      
      <div className={styles.gateCard}>
        <h4>Gate 4: Verdict Confidence</h4>
        <div className={styles.confidenceBars}>
          <ConfidenceBar tier="HIGH" count={gate4Stats.highConfidence} />
          <ConfidenceBar tier="MEDIUM" count={gate4Stats.mediumConfidence} />
          <ConfidenceBar tier="LOW" count={gate4Stats.lowConfidence} />
          <ConfidenceBar tier="INSUFFICIENT" count={gate4Stats.insufficient} />
        </div>
      </div>
    </div>
  );
}
```

**Benefits**:
- **Transparency** (core FactHarbor value)
- Users understand quality assessment
- Debugging aid for developers

**Priority**: 🟠 HIGH  
**Urgency**: MEDIUM  
**Importance**: HIGH  
**Added to Backlog**: Yes

---

## Medium Priority (User Experience)

### 7. Interactive Analysis Refinement

**Current State**: Batch-only, no user feedback loop

**Concept**:

```typescript
// apps/web/src/lib/interactive-analysis.ts (NEW CONCEPT)

interface AnalysisRefinement {
  jobId: string;
  refinementType: 'add-source' | 'challenge-claim' | 'add-scope' | 'refine-search';
  userInput: string;
  estimatedCost: number;
}

// User interactions:
// 1. "Add source: https://example.com/article"
// 2. "This claim is missing context about X"
// 3. "Analyze this in the context of EU regulations"
// 4. "Search for more recent information (last week)"

// Creates child job that extends analysis incrementally
```

**Priority**: 🟡 MEDIUM  
**Urgency**: LOW  
**Importance**: MEDIUM  
**Added to Backlog**: Yes

---

### 8. Analysis Templates & Presets

**Current State**: Every analysis uses same generic configuration

**Recommendations**:

```typescript
// apps/web/src/lib/analyzer/templates.ts (NEW FILE)

const TEMPLATES = [
  {
    id: 'health-claim',
    name: 'Health/Medical Claim',
    domain: 'health',
    config: {
      searchDomainWhitelist: [
        'pubmed.ncbi.nlm.nih.gov',
        'nih.gov',
        'cdc.gov',
        'who.int',
        'thelancet.com',
        'nejm.org'
      ],
      minSourcesRequired: 4,
      keyFactorHints: [
        { factor: 'Clinical Evidence', category: 'scientific' },
        { factor: 'Study Quality', category: 'methodological' },
        { factor: 'Peer Review Status', category: 'procedural' }
      ]
    }
  },
  {
    id: 'legal-proceeding',
    name: 'Legal Proceeding Analysis',
    domain: 'legal',
    config: {
      searchDomainWhitelist: [
        'supremecourt.gov',
        'uscourts.gov',
        'justia.com'
      ],
      keyFactorHints: [
        { factor: 'Due Process', category: 'procedural' },
        { factor: 'Evidence Admissibility', category: 'legal' }
      ]
    }
  }
];
```

**Benefits**:
- Better results for domain-specific analyses
- Faster setup for common use cases
- Still maintains generic-by-design principle

**Priority**: 🟡 MEDIUM  
**Urgency**: LOW  
**Importance**: MEDIUM  
**Added to Backlog**: Yes

---

### 9. Comparative Analysis Mode

**Current State**: Can't directly compare two claims/articles

**Recommendations**:

```typescript
// apps/web/src/lib/analyzer/comparative.ts (NEW FILE)

interface ComparativeAnalysis {
  inputA: AnalysisInput;
  inputB: AnalysisInput;
  comparisonMode: 'side-by-side' | 'differential' | 'synthesis';
  
  // Results
  sharedClaims: ClaimMapping[];      // Claims both sources make
  uniqueClaimsA: Claim[];            // Only A makes
  uniqueClaimsB: Claim[];            // Only B makes
  contradictions: Contradiction[];    // Conflicting claims
  consensus: ConsensusArea[];        // Agreement areas
}

// Example: Compare two articles about same event
// - NY Times article vs Fox News article on same trial
// - Identify bias indicators
// - Show where they agree/disagree
```

**Priority**: 🟡 MEDIUM  
**Urgency**: LOW  
**Importance**: MEDIUM  
**Added to Backlog**: Yes

---

### 10. Real-Time Source Quality Feedback

**Current State**: Source reliability bundle disabled

**Problem**: No vendor lock-in, need multiple quality signals

**Recommendations**:

```typescript
// apps/web/src/lib/source-quality-live.ts (NEW FILE)

interface LiveSourceQuality {
  url: string;
  domain: string;
  
  // Multiple signal sources
  mbfcRating?: number;              // Media Bias/Fact Check
  newsGuardRating?: number;         // NewsGuard
  wikiCitations: number;            // Wikipedia citation count
  academicCitations: number;        // Google Scholar citations
  
  // Real-time signals
  httpsEnabled: boolean;
  certificateValid: boolean;
  hasContactInfo: boolean;
  hasCorrectionsPolicy: boolean;
  domainAge: number;                // Years old
  
  // Computed
  compositeScore: number;           // 0-1 scale
  confidenceInScore: number;        // How confident in score
}

// Aggregate multiple signals, no single point of failure
```

**Priority**: 🟡 MEDIUM  
**Urgency**: LOW  
**Importance**: MEDIUM  
**Added to Backlog**: Yes

---

## Low Priority (Nice to Have)

### 11. Multi-Language Support

**Current State**: English only

**Recommendations**:

```typescript
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', llmSupport: 'native' },
  { code: 'es', name: 'Spanish', llmSupport: 'native' },
  { code: 'de', name: 'German', llmSupport: 'native' },
  { code: 'fr', name: 'French', llmSupport: 'native' },
  { code: 'pt', name: 'Portuguese', llmSupport: 'native' }
];

// Challenges:
// - Search queries in target language
// - Source extraction in multiple languages
// - Cross-language evidence synthesis
```

**Priority**: 🟢 LOW  
**Urgency**: LOW  
**Importance**: MEDIUM  
**Added to Backlog**: Yes

---

### 12. PDF Report Export

**Current State**: Markdown only

**Recommendations**: Use jsPDF or Puppeteer for professional PDFs with charts, graphs, confidence bars, optional branding.

**Priority**: 🟢 LOW  
**Urgency**: LOW  
**Importance**: LOW  
**Added to Backlog**: Yes

---

### 13. Browser Extension

**Current State**: Must copy URL/text to web interface

**Recommendations**: Right-click extension for "Analyze with FactHarbor", floating button on news sites.

**Challenges**: Permissions, API auth, cost control

**Priority**: 🟢 LOW  
**Urgency**: LOW  
**Importance**: LOW  
**Added to Backlog**: Yes

---

## Technical Debt & Architecture

### 14. Modularize `analyzer.ts`

**Current State**: 8,234 lines in single file

**Proposed Structure**:

```
apps/web/src/lib/analyzer/
  ├── index.ts                  // Main orchestrator (~500 lines)
  ├── understanding.ts          // understandClaim() (~1000 lines)
  ├── research.ts               // Research loop (~800 lines)
  ├── verdict-generation.ts     // generateVerdicts() (~1500 lines)
  ├── aggregation.ts            // Aggregation logic (~800 lines)
  ├── report-generation.ts      // Markdown reports (~600 lines)
  ├── quality-gates.ts          // ✅ Already separated
  ├── truth-scale.ts            // ✅ Already separated
  ├── config.ts                 // ✅ Already separated
  ├── types.ts                  // ✅ Already separated
  └── utils/
      ├── deduplication.ts      // Claim deduplication (~300 lines)
      ├── dependency-tracking.ts // Dependencies (~200 lines)
      └── temporal-awareness.ts  // Date handling (~200 lines)
```

**Priority**: 🔧 TECHNICAL DEBT  
**Urgency**: LOW  
**Importance**: LOW  
**Added to Backlog**: Yes (already tracked)

---

### 15. Normalized Database Schema

**Current State**: Job blobs only (JSON in ResultJson column)

**Proposed Schema**:

```sql
-- Enable querying across analyses
CREATE TABLE Claims (
  Id UNIQUEIDENTIFIER PRIMARY KEY,
  JobId UNIQUEIDENTIFIER NOT NULL,
  ClaimId VARCHAR(20) NOT NULL,
  Text NVARCHAR(2000) NOT NULL,
  Type VARCHAR(50),
  IsCentral BIT NOT NULL,
  FOREIGN KEY (JobId) REFERENCES Jobs(JobId)
);

CREATE TABLE Verdicts (
  Id UNIQUEIDENTIFIER PRIMARY KEY,
  ClaimId UNIQUEIDENTIFIER NOT NULL,
  Verdict VARCHAR(20) NOT NULL,
  TruthPercentage INT NOT NULL,
  Confidence INT NOT NULL,
  Reasoning NVARCHAR(MAX),
  FOREIGN KEY (ClaimId) REFERENCES Claims(Id)
);

-- Similar for Sources, Facts, ClaimFactSupport (many-to-many)
```

**Benefits**:
- Query across analyses: "Show all claims about topic X"
- Trend analysis: "How has verdict changed over time?"
- Source reputation tracking
- Citation network analysis

**Priority**: 🔧 TECHNICAL DEBT  
**Urgency**: LOW  
**Importance**: MEDIUM  
**Added to Backlog**: Yes

---

### 16. Comprehensive Testing

**Current State**: Partial unit tests, manual integration tests

**Proposed Coverage**:

```
Unit Tests (80% target):
  - understanding.test.ts
  - research.test.ts
  - verdict-generation.test.ts
  - aggregation.test.ts
  - quality-gates.test.ts (✅ exists)
  - truth-scale.test.ts (✅ exists)

Integration Tests:
  - full-analysis-flow.test.ts
  - multi-scope-detection.test.ts
  - input-neutrality.test.ts (✅ exists, manual)
  - claim-dependency.test.ts

E2E Tests (Playwright):
  - submit-analysis.spec.ts
  - view-results.spec.ts
  - error-handling.spec.ts

API Tests (C# xUnit):
  - JobsController.Tests.cs
  - AnalyzeController.Tests.cs
  - RunnerClient.Tests.cs
```

**Priority**: 🔧 TECHNICAL DEBT  
**Urgency**: LOW  
**Importance**: HIGH  
**Added to Backlog**: Yes

---

## Monitoring & Operations

### 17. Observability Dashboard

**Current State**: Logs only, no metrics dashboard

**Recommendations**:

```typescript
interface SystemMetrics {
  // Performance
  avgAnalysisTime: number;
  p50AnalysisTime: number;
  p95AnalysisTime: number;
  
  // Costs
  totalLLMCalls: number;
  totalLLMCost: number;
  avgCostPerAnalysis: number;
  
  // Quality
  gate1PassRate: number;
  gate4PublishableRate: number;
  avgConfidenceTier: string;
  
  // Usage
  totalAnalyses: number;
  successRate: number;
  
  // Errors
  topErrors: ErrorPattern[];
  errorRate: number;
}

// Real-time dashboard with charts
// Export to Prometheus/Grafana
```

**Priority**: 🔧 OPERATIONS  
**Urgency**: LOW  
**Importance**: HIGH  
**Added to Backlog**: Yes

---

### 18. Error Pattern Detection & Auto-Recovery

**Current State**: Errors logged but not analyzed

**Recommendations**:

```csharp
// apps/api/Services/ErrorPatternService.cs (NEW FILE)

var patterns = new[] {
  new ErrorPattern {
    Category = "LLM_TIMEOUT",
    Pattern = new Regex(@"Request timed out"),
    AutoRecoveryAction = "RETRY_WITH_SHORTER_PROMPT",
    FallbackModel = "claude-3-haiku" // Faster model
  },
  new ErrorPattern {
    Category = "SOURCE_FETCH_FAILED",
    Pattern = new Regex(@"403 Forbidden"),
    AutoRecoveryAction = "SKIP_SOURCE"
  },
  new ErrorPattern {
    Category = "SEARCH_QUOTA_EXCEEDED",
    Pattern = new Regex(@"Rate limit exceeded"),
    AutoRecoveryAction = "FALLBACK_TO_CACHED_SEARCH"
  }
};
```

**Priority**: 🔧 OPERATIONS  
**Urgency**: LOW  
**Importance**: MEDIUM  
**Added to Backlog**: Yes

---

## Cost Optimization Summary

| Optimization | Savings | Effort | Priority |
|--------------|---------|--------|----------|
| **Tiered LLM Routing** | 50-70% on LLM costs | 🟠 HIGH |
| **Claim Caching** | 30-50% on repeat claims | 🟠 HIGH |
| **Parallel Verdicts** | 50-80% faster (time = $) | 🟠 HIGH |
| **Cost Quotas** | Prevents runaway costs | 🔴 CRITICAL |
| **Search Optimization** | 20-30% on search costs | 2 days | 🟡 MEDIUM |

**Combined Potential**: **70-85% cost reduction** with all optimizations implemented.

---

## Implementation Roadmap

### Phase 1: Security & Stability
*Note: LOW urgency while POC/local, becomes HIGH before production*

1. SSRF Protection
2. Rate Limiting
3. Admin Authentication
4. Cost Quotas
5. Error Pattern Detection

**Backlog Status**: Items added with appropriate urgency levels

### Phase 2: Performance & Cost

6. Tiered LLM Routing (HIGH priority)
7. Parallel Verdict Generation (HIGH priority)
8. Claim Caching (HIGH priority)
9. Observability Dashboard

### Phase 3: User Experience

10. Quality Gate UI Display
11. Analysis Templates
12. Live Source Quality
13. Interactive Refinement

### Phase 4: Scale & Maturity

14. Normalized Database Schema
15. Comprehensive Testing
16. Modularize analyzer.ts
17. Comparative Analysis Mode

---

## Quick Wins (Can Implement This Week)

1. **Parallel Verdict Generation** → 50-80% speed improvement
2. **Quality Gate UI Display** → Transparency
3. **Cost Quotas** → Financial safety (low urgency for POC)
4. **Admin Authentication** (1 day) → Security (low urgency for POC)

  
**Impact**: Massive improvement in speed, security, and transparency

---

## References

- **Current Status**: `Docs/STATUS/Current_Status.md`
- **Backlog**: `Docs/STATUS/Backlog.md`
- **Architecture**: `Docs/xwiki-pages/FactHarbor/Specification/Implementation/Architecture Overview/WebHome.xwiki`
- **Calculations**: `Docs/ARCHITECTURE/Calculations.md`
- **Coding Guidelines**: `Docs/xwiki-pages/FactHarbor/Specification/Development/Guidelines/Coding Guidelines/WebHome.xwiki`

---

**Document Status**: Comprehensive analysis based on v2.6.21 codebase  
**Next Steps**: Prioritize items in backlog, implement quick wins first
