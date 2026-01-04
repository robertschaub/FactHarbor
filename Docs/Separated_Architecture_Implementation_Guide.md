# Separated Architecture Implementation Guide

**Document Version:** 1.0
**Date:** 2026-01-02
**Status:** Approved - Ready for Implementation
**Reference:** FactHarbor Roadmap - Architecture Analysis (Jan 2026)

---

## Executive Summary

This guide provides step-by-step instructions for implementing the **Separated Architecture** for FactHarbor POC1. This architecture separates claim verdict generation from article verdict generation, enabling **40-70% cost reduction** and **50%+ faster analysis** through intelligent caching.

**Key Benefits:**
- 40-70% reduction in LLM costs for repeated claims
- 50%+ improvement in analysis speed for cached claims
- Higher consistency across analyses
- Linear scalability improvements as user base grows

---

## Architecture Overview

### Current Monolithic Architecture (Problem)

```
Article Input
    ↓
Extract All Claims → Research Each Claim → Generate Verdicts
    ↓                      ↓                      ↓
  (15% cost)          (60% cost)            (25% cost)
    ↓
Article Verdict
```

**Issues:**
- No claim caching - every analysis re-processes all claims
- Tight coupling between article and claim processing
- Many articles share common claims but each analysis repeats full research

---

### Proposed Separated Architecture (Solution)

```
┌─────────────────────────────────────────────────┐
│           CLAIM VERDICT LAYER (Cached)          │
├─────────────────────────────────────────────────┤
│                                                 │
│  Input Claim → Hash Claim → Check Cache        │
│                                ↓                │
│                        ┌───────┴────────┐      │
│                        │                │      │
│                    Cache Hit       Cache Miss  │
│                        │                │      │
│                  Return Cached    Process Claim│
│                    Verdict              ↓      │
│                        │         Research (60%)│
│                        │         Generate (25%)│
│                        │         Cache Result  │
│                        │                │      │
│                        └────────┬───────┘      │
│                                 ↓              │
│                         Claim Verdict          │
│                         (7-day TTL)            │
└─────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│        ARTICLE VERDICT LAYER (Always Dynamic)   │
├─────────────────────────────────────────────────┤
│                                                 │
│  Aggregate Claim Verdicts → Apply Context      │
│  (claim relationships,       (author intent,   │
│   logical structure)         misleading use)   │
│                                 ↓              │
│                         Article Verdict        │
│                         (never cached)         │
└─────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Database Schema Changes

#### 1.1 Add ClaimVerdict Table

```sql
CREATE TABLE ClaimVerdict (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 of normalized claim text
    claim_text TEXT NOT NULL,                 -- Original claim text
    normalized_claim TEXT NOT NULL,           -- Normalized version for debugging
    verdict JSONB NOT NULL,                   -- Full verdict object
    confidence_score DECIMAL(3,2),            -- 0.00 to 1.00
    source_count INTEGER,                     -- Number of sources used
    processing_time_ms INTEGER,               -- Performance metric
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,                     -- NOW() + 7 days (TTL)
    last_accessed_at TIMESTAMP,               -- For cache analytics
    access_count INTEGER DEFAULT 0,           -- For cache analytics
    model_version VARCHAR(50),                -- e.g., "claude-sonnet-4.5"
    INDEX idx_claim_hash (claim_hash),
    INDEX idx_expires_at (expires_at)
);
```

#### 1.2 Add ClaimVerdictSource Table (for audit trail)

```sql
CREATE TABLE ClaimVerdictSource (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_verdict_id UUID REFERENCES ClaimVerdict(id) ON DELETE CASCADE,
    source_url TEXT NOT NULL,
    relevance_score DECIMAL(3,2),
    excerpt TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.3 Modify Claim Table (add verdict reference)

```sql
ALTER TABLE Claim ADD COLUMN claim_verdict_id UUID REFERENCES ClaimVerdict(id);
ALTER TABLE Claim ADD COLUMN used_cached_verdict BOOLEAN DEFAULT FALSE;
```

---

### Step 2: Implement Claim Normalization Function

**Purpose:** Generate consistent hash keys for semantically identical claims.

#### 2.1 Normalization Logic

```javascript
// Example in Node.js/TypeScript
import crypto from 'crypto';

function normalizeClaim(claimText: string): string {
    return claimText
        .toLowerCase()                          // Case insensitive
        .replace(/[^\w\s]/g, '')                // Remove punctuation
        .replace(/\s+/g, ' ')                   // Normalize whitespace
        .trim()
        // Optional: Add stemming in Phase 2
        // .split(' ').map(word => stem(word)).join(' ')
}

function hashClaim(claimText: string): string {
    const normalized = normalizeClaim(claimText);
    return crypto
        .createHash('sha256')
        .update(normalized)
        .digest('hex');
}

// Example usage:
// "COVID-19 vaccines are safe!" → hash: "a3f2e8..."
// "covid 19 vaccines are safe"  → hash: "a3f2e8..." (same)
```

#### 2.2 C# Implementation (if using .NET)

```csharp
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

public class ClaimNormalizer
{
    public static string NormalizeClaim(string claimText)
    {
        return Regex.Replace(
            Regex.Replace(
                claimText.ToLowerInvariant(),
                @"[^\w\s]", ""                   // Remove punctuation
            ),
            @"\s+", " "                          // Normalize whitespace
        ).Trim();
    }

    public static string HashClaim(string claimText)
    {
        var normalized = NormalizeClaim(claimText);
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(normalized));
        return BitConverter.ToString(bytes).Replace("-", "").ToLowerInvariant();
    }
}
```

---

### Step 3: Implement Claim Verdict Cache Service

#### 3.1 Cache Service Interface

```typescript
interface IClaimVerdictCache {
    // Get cached verdict or null if not found/expired
    get(claimText: string): Promise<ClaimVerdict | null>;

    // Store verdict with TTL
    set(claimText: string, verdict: ClaimVerdict, ttlDays?: number): Promise<void>;

    // Invalidate specific claim
    invalidate(claimText: string): Promise<void>;

    // Invalidate all claims from a specific source
    invalidateBySource(sourceUrl: string): Promise<number>;

    // Get cache statistics
    getStats(): Promise<CacheStats>;
}

interface ClaimVerdict {
    claimText: string;
    verdict: string;              // "TRUE" | "FALSE" | "MIXED" | "UNCERTAIN"
    confidenceScore: number;      // 0.00 to 1.00
    scenarios: Scenario[];
    sources: Source[];
    reasoning: string;
    modelVersion: string;
}

interface CacheStats {
    totalClaims: number;
    hitRate: number;              // Percentage
    avgProcessingTimeMs: number;
    totalCostSaved: number;       // Estimated $ saved
}
```

#### 3.2 PostgreSQL Implementation

```typescript
import { Pool } from 'pg';

export class ClaimVerdictCacheService implements IClaimVerdictCache {
    constructor(private db: Pool) {}

    async get(claimText: string): Promise<ClaimVerdict | null> {
        const hash = hashClaim(claimText);

        const result = await this.db.query(`
            SELECT
                claim_text,
                verdict,
                confidence_score,
                source_count,
                model_version
            FROM ClaimVerdict
            WHERE claim_hash = $1
              AND expires_at > NOW()
            LIMIT 1
        `, [hash]);

        if (result.rows.length === 0) {
            return null; // Cache miss
        }

        // Update access statistics
        await this.db.query(`
            UPDATE ClaimVerdict
            SET last_accessed_at = NOW(),
                access_count = access_count + 1
            WHERE claim_hash = $1
        `, [hash]);

        return {
            claimText: result.rows[0].claim_text,
            verdict: result.rows[0].verdict.verdict,
            confidenceScore: parseFloat(result.rows[0].confidence_score),
            scenarios: result.rows[0].verdict.scenarios,
            sources: result.rows[0].verdict.sources,
            reasoning: result.rows[0].verdict.reasoning,
            modelVersion: result.rows[0].model_version
        };
    }

    async set(claimText: string, verdict: ClaimVerdict, ttlDays: number = 7): Promise<void> {
        const hash = hashClaim(claimText);
        const normalized = normalizeClaim(claimText);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + ttlDays);

        await this.db.query(`
            INSERT INTO ClaimVerdict (
                claim_hash,
                claim_text,
                normalized_claim,
                verdict,
                confidence_score,
                source_count,
                expires_at,
                model_version
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (claim_hash) DO UPDATE
            SET verdict = EXCLUDED.verdict,
                confidence_score = EXCLUDED.confidence_score,
                source_count = EXCLUDED.source_count,
                expires_at = EXCLUDED.expires_at,
                last_accessed_at = NOW(),
                model_version = EXCLUDED.model_version
        `, [
            hash,
            claimText,
            normalized,
            JSON.stringify(verdict),
            verdict.confidenceScore,
            verdict.sources.length,
            expiresAt,
            verdict.modelVersion
        ]);
    }

    async invalidate(claimText: string): Promise<void> {
        const hash = hashClaim(claimText);
        await this.db.query(
            'DELETE FROM ClaimVerdict WHERE claim_hash = $1',
            [hash]
        );
    }

    async invalidateBySource(sourceUrl: string): Promise<number> {
        const result = await this.db.query(`
            DELETE FROM ClaimVerdict
            WHERE id IN (
                SELECT claim_verdict_id
                FROM ClaimVerdictSource
                WHERE source_url = $1
            )
        `, [sourceUrl]);

        return result.rowCount || 0;
    }

    async getStats(): Promise<CacheStats> {
        const result = await this.db.query(`
            SELECT
                COUNT(*) as total_claims,
                AVG(access_count) as avg_accesses,
                AVG(processing_time_ms) as avg_processing_time_ms
            FROM ClaimVerdict
            WHERE expires_at > NOW()
        `);

        // Estimate cost saved (assumes $0.003 per claim analysis)
        const totalAccesses = result.rows[0].avg_accesses * result.rows[0].total_claims;
        const costPerAnalysis = 0.003; // Average cost in $
        const totalCostSaved = (totalAccesses - result.rows[0].total_claims) * costPerAnalysis;

        return {
            totalClaims: parseInt(result.rows[0].total_claims),
            hitRate: 0, // Calculate separately from access logs
            avgProcessingTimeMs: parseFloat(result.rows[0].avg_processing_time_ms) || 0,
            totalCostSaved: totalCostSaved
        };
    }
}
```

---

### Step 4: Modify AKEL Pipeline

#### 4.1 Updated Claim Processing Flow

```typescript
async function processClaimWithCache(
    claimText: string,
    cache: IClaimVerdictCache,
    akelService: IAKELService
): Promise<ClaimVerdict> {

    // Step 1: Check cache
    const cachedVerdict = await cache.get(claimText);
    if (cachedVerdict) {
        console.log(`[CACHE HIT] ${claimText}`);
        return cachedVerdict;
    }

    console.log(`[CACHE MISS] ${claimText} - Processing...`);

    // Step 2: Process claim (research + verdict generation)
    const startTime = Date.now();
    const verdict = await akelService.analyzeClaimFull(claimText);
    const processingTime = Date.now() - startTime;

    // Step 3: Cache the result
    await cache.set(claimText, verdict);

    console.log(`[CACHED] ${claimText} (${processingTime}ms)`);

    return verdict;
}
```

#### 4.2 Article Analysis Flow (Always Dynamic)

```typescript
async function analyzeArticle(
    articleUrl: string,
    cache: IClaimVerdictCache,
    akelService: IAKELService
): Promise<ArticleVerdict> {

    // Step 1: Extract claims from article
    const claims = await akelService.extractClaims(articleUrl);

    // Step 2: Get verdict for each claim (using cache)
    const claimVerdicts = await Promise.all(
        claims.map(claim => processClaimWithCache(claim, cache, akelService))
    );

    // Step 3: Aggregate into article verdict (ALWAYS DYNAMIC)
    // This step is NEVER cached because same claims can lead to
    // different article conclusions depending on context
    const articleVerdict = await akelService.synthesizeArticleVerdict({
        articleUrl,
        claims: claimVerdicts,
        articleContext: await akelService.extractArticleContext(articleUrl)
    });

    return articleVerdict;
}
```

---

### Step 5: Implement Cache Invalidation Strategy

#### 5.1 Automatic TTL-based Expiration

```sql
-- Run daily to clean up expired claims
CREATE OR REPLACE FUNCTION cleanup_expired_claims()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ClaimVerdict WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule as cron job or background task
-- Example: Run daily at 2 AM
```

#### 5.2 Event-based Invalidation

```typescript
// Invalidate when major news breaks about a topic
async function invalidateClaimsByTopic(topic: string, cache: IClaimVerdictCache) {
    // Find all claims containing topic keywords
    const claims = await db.query(`
        SELECT claim_text
        FROM ClaimVerdict
        WHERE normalized_claim LIKE $1
    `, [`%${topic.toLowerCase()}%`]);

    for (const claim of claims.rows) {
        await cache.invalidate(claim.claim_text);
    }
}

// Invalidate when a source is retracted/updated
async function invalidateClaimsBySource(sourceUrl: string, cache: IClaimVerdictCache) {
    const count = await cache.invalidateBySource(sourceUrl);
    console.log(`Invalidated ${count} claims due to source change: ${sourceUrl}`);
}
```

---

### Step 6: Add Monitoring and Analytics

#### 6.1 Cache Performance Dashboard

```sql
-- Daily cache hit rate
SELECT
    DATE(created_at) as date,
    COUNT(*) as total_claims,
    SUM(access_count) as total_accesses,
    ROUND(100.0 * (SUM(access_count) - COUNT(*)) / SUM(access_count), 2) as hit_rate_pct
FROM ClaimVerdict
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;

-- Top cached claims (most reused)
SELECT
    claim_text,
    access_count,
    confidence_score,
    created_at
FROM ClaimVerdict
ORDER BY access_count DESC
LIMIT 20;

-- Cost savings estimate
SELECT
    SUM(access_count - 1) as cache_hits,
    ROUND(SUM(access_count - 1) * 0.003, 2) as estimated_savings_usd
FROM ClaimVerdict;
```

#### 6.2 Logging and Metrics

```typescript
interface CacheMetrics {
    timestamp: Date;
    operation: 'HIT' | 'MISS' | 'SET' | 'INVALIDATE';
    claimHash: string;
    processingTimeMs?: number;
    cacheSavingsMs?: number;
}

class CacheMetricsLogger {
    async logCacheHit(claimHash: string, savedTimeMs: number) {
        await this.log({
            timestamp: new Date(),
            operation: 'HIT',
            claimHash,
            cacheSavingsMs: savedTimeMs
        });
    }

    async logCacheMiss(claimHash: string, processingTimeMs: number) {
        await this.log({
            timestamp: new Date(),
            operation: 'MISS',
            claimHash,
            processingTimeMs
        });
    }

    private async log(metrics: CacheMetrics) {
        // Log to database, CloudWatch, Datadog, etc.
        console.log(JSON.stringify(metrics));
    }
}
```

---

## Testing Strategy

### Test 1: Cache Hit Rate

```typescript
describe('Claim Verdict Cache', () => {
    it('should return cached verdict on second request', async () => {
        const claim = "COVID-19 vaccines are safe and effective";

        // First request - cache miss
        const verdict1 = await processClaimWithCache(claim, cache, akel);
        expect(verdict1).toBeDefined();

        // Second request - cache hit
        const startTime = Date.now();
        const verdict2 = await processClaimWithCache(claim, cache, akel);
        const duration = Date.now() - startTime;

        expect(verdict2).toEqual(verdict1);
        expect(duration).toBeLessThan(100); // Should be fast (no LLM call)
    });

    it('should normalize similar claims to same hash', () => {
        const claim1 = "COVID-19 vaccines are safe!";
        const claim2 = "covid 19 vaccines are safe";
        const claim3 = "COVID-19 VACCINES ARE SAFE.";

        expect(hashClaim(claim1)).toBe(hashClaim(claim2));
        expect(hashClaim(claim2)).toBe(hashClaim(claim3));
    });
});
```

### Test 2: Cache Expiration

```typescript
it('should expire claims after TTL', async () => {
    const claim = "Test claim";
    const shortTTL = 1; // 1 day

    // Cache verdict
    await cache.set(claim, verdict, shortTTL);

    // Should be cached
    expect(await cache.get(claim)).toBeDefined();

    // Fast-forward time (or wait 1 day)
    await db.query(`UPDATE ClaimVerdict SET expires_at = NOW() - INTERVAL '1 hour'`);

    // Should be expired
    expect(await cache.get(claim)).toBeNull();
});
```

### Test 3: Article Verdict Independence

```typescript
it('should generate different article verdicts for same claims in different contexts', async () => {
    // Two articles with same claims but different conclusions
    const article1 = "https://example.com/vaccines-safe"; // Pro-vaccine
    const article2 = "https://example.com/vaccines-dangerous"; // Anti-vaccine (misleading)

    const verdict1 = await analyzeArticle(article1, cache, akel);
    const verdict2 = await analyzeArticle(article2, cache, akel);

    // Claim verdicts should be cached and identical
    // But article verdicts should differ based on context
    expect(verdict1.overallRating).not.toBe(verdict2.overallRating);
});
```

---

## Migration Plan

### Phase 1: Add Infrastructure (Week 1)
- [ ] Create ClaimVerdict table
- [ ] Create ClaimVerdictSource table
- [ ] Modify Claim table
- [ ] Implement normalization functions
- [ ] Implement cache service

### Phase 2: Integrate with AKEL (Week 2)
- [ ] Update claim processing to check cache first
- [ ] Modify article analysis to use cached claims
- [ ] Add cache metrics logging
- [ ] Add cache invalidation endpoints

### Phase 3: Testing (Week 3)
- [ ] Unit tests for normalization
- [ ] Integration tests for cache service
- [ ] End-to-end tests for article analysis
- [ ] Performance benchmarks

### Phase 4: Deploy and Monitor (Week 4)
- [ ] Deploy to staging
- [ ] Monitor cache hit rates
- [ ] Validate cost savings
- [ ] Deploy to production
- [ ] Set up alerts for cache performance

---

## Expected Results

### Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Cost per analysis** | $0.015 | $0.005-0.009 | **40-70%** reduction |
| **Analysis time** | 15s | 5-8s | **50%+** faster |
| **Cache hit rate** | 0% | 40-60% (after 1 month) | N/A |

### Cost Calculation Example

**Scenario:** 1000 analyses/month with 50% cache hit rate

- **Before:** 1000 × $0.015 = **$15.00**
- **After:** (500 × $0.015) + (500 × $0.001) = **$8.00**
- **Savings:** $7.00/month (47%)

At scale (10,000 analyses/month):
- **Before:** $150
- **After:** $80
- **Savings:** $70/month (47%)

---

## Troubleshooting

### Issue: Low Cache Hit Rate

**Symptoms:** Cache hit rate below 20%

**Causes:**
- Claims are too unique (no repeats)
- Normalization too strict (missing similar claims)
- TTL too short (claims expiring too fast)

**Solutions:**
1. Add stemming to normalization
2. Increase TTL from 7 to 14 days
3. Implement semantic similarity matching (Phase 2)

---

### Issue: Stale Verdicts

**Symptoms:** Cached verdicts don't reflect recent news

**Causes:**
- TTL too long
- No event-based invalidation

**Solutions:**
1. Reduce TTL for controversial topics
2. Implement topic-based invalidation triggers
3. Add manual invalidation UI for moderators

---

### Issue: Memory Usage Too High

**Symptoms:** Database growing too large

**Causes:**
- Too many cached claims
- Verdicts not expiring properly

**Solutions:**
1. Verify cleanup job is running
2. Reduce TTL
3. Implement LRU eviction (keep only top N accessed claims)

---

## Future Enhancements (Phase 2+)

### 1. Semantic Similarity Matching

Instead of exact hash matching, use embeddings to find similar claims:

```typescript
// Use vector similarity instead of exact hash
async function findSimilarClaim(claimText: string): Promise<ClaimVerdict | null> {
    const embedding = await generateEmbedding(claimText);

    // Find claims with cosine similarity > 0.95
    const result = await db.query(`
        SELECT claim_text, verdict
        FROM ClaimVerdict
        WHERE embedding <-> $1 < 0.05  -- pgvector syntax
        ORDER BY embedding <-> $1
        LIMIT 1
    `, [embedding]);

    return result.rows[0] || null;
}
```

### 2. Smart TTL Based on Topic Volatility

```typescript
function calculateTTL(claim: string): number {
    if (isBreakingNewsTopic(claim)) return 1;  // 1 day
    if (isCurrentEventsTopic(claim)) return 3; // 3 days
    if (isHistoricalFact(claim)) return 30;    // 30 days
    return 7; // Default
}
```

### 3. Distributed Cache with Redis

```typescript
// Add Redis as L1 cache, PostgreSQL as L2
class TieredCacheService {
    constructor(
        private redis: RedisClient,
        private postgres: Pool
    ) {}

    async get(claim: string): Promise<ClaimVerdict | null> {
        // Try Redis first (fast)
        const redisResult = await this.redis.get(`claim:${hashClaim(claim)}`);
        if (redisResult) return JSON.parse(redisResult);

        // Fallback to PostgreSQL
        const pgResult = await this.postgres.query(/* ... */);
        if (pgResult.rows.length > 0) {
            // Populate Redis for next time
            await this.redis.setex(
                `claim:${hashClaim(claim)}`,
                3600, // 1 hour
                JSON.stringify(pgResult.rows[0])
            );
            return pgResult.rows[0];
        }

        return null;
    }
}
```

---

## Success Criteria

- [ ] Cache hit rate reaches 40%+ within 1 month
- [ ] Average analysis time reduced by 50%+
- [ ] LLM costs reduced by 40%+
- [ ] No increase in verdict inconsistencies
- [ ] All tests pass
- [ ] Zero performance regressions for cache misses

---

## References

- Architecture Analysis Document: FactHarbor Roadmap - Architecture Analysis (Jan 2026) v2.6.17
- POC1 Requirements: FactHarbor Specification - POC Requirements
- AKEL Specification: FactHarbor Specification - AI Knowledge Extraction Layer (AKEL)

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-02 | Claude Code | Initial implementation guide |

