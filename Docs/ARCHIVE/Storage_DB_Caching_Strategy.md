# Storage, Database & Caching Strategy

**Date**: February 2026
**Status**: 🧭 PARTIALLY APPROVED — DEFER decisions agreed (Redis, Vector DB); ADD decisions pending (URL cache, claim cache, PostgreSQL for Alpha)
**Purpose**: Re-evaluate the caching and database strategy given current implementation reality

---

## 1. Current Implementation (v2.10.2)

### 1.1 Three-Database Architecture

FactHarbor currently runs three separate SQLite databases:

| Database | Purpose | Access Layer | Key Tables |
|----------|---------|-------------|------------|
| `factharbor.db` | Jobs, events, analysis results | .NET API (Entity Framework) | `Jobs`, `JobEvents`, `AnalysisMetrics` |
| `config.db` | UCM configuration management | Next.js (better-sqlite3) | `config_blobs`, `config_active`, `config_usage`, `job_config_snapshots` |
| `source-reliability.db` | Source reliability cache | Next.js (better-sqlite3) | `source_reliability` |

```
              Next.js Web App                        .NET API
          ┌───────────────────┐              ┌──────────────────┐
          │  Orchestrated      │              │  AnalyzeController│
          │  Pipeline          │              │  JobsController   │
          │                    │              │  HealthController │
          │  Config Storage ───┼──► config.db │                   │
          │  SR Cache ─────────┼──► sr.db     │  FhDbContext ─────┼──► factharbor.db
          │  Analysis ─────────┼──► (via API) │                   │
          └───────────────────┘              └──────────────────┘
```

### 1.2 Current Caching Mechanisms

| What | Mechanism | TTL | Status |
|------|-----------|-----|--------|
| Source reliability scores | SQLite + batch prefetch to in-memory `Map` | 90 days (configurable via UCM) | IMPLEMENTED |
| UCM config values | In-memory `Map` with TTL-based expiry | 60 seconds | IMPLEMENTED |
| URL content (fetched pages) | Not cached | N/A | NOT IMPLEMENTED |
| Claim-level analysis results | Not cached | N/A | NOT IMPLEMENTED |
| LLM responses | Not cached | N/A | NOT IMPLEMENTED |
| Search query results | Not cached | N/A | NOT IMPLEMENTED |

### 1.3 Storage Patterns

- **Analysis results**: JSON blob in `ResultJson` column (per job), stored once by .NET API
- **Config blobs**: Content-addressable with SHA-256 hash as PK, history tracked
- **Job config snapshots**: Pipeline + search + SR config captured per job for auditability
- **SR cache**: Per-domain reliability assessment with multi-model consensus scores

**Current limitations**:
- No relational queries across claims, evidence, or sources from different analyses
- No full-text search on analysis content
- Single-writer limitation (SQLite) — fine for single-instance but blocks horizontal scaling
- Every analysis re-fetches URL content and recomputes all LLM calls from scratch

---

## 2. What Is Worth Caching?

### 2.1 Caching Value Analysis

| Cacheable Item | Estimated Savings | Latency Impact | Complexity | Recommendation |
|----------------|-------------------|----------------|------------|----------------|
| **Claim-level results** | 30-50% LLM cost on duplicate/similar claims | None (cache lookup) | MEDIUM — needs canonical claim hash + TTL + prompt-version awareness | YES — highest ROI |
| **URL content** | $0 API cost but 5-15s latency per source | Major — eliminates re-fetch | LOW — URL hash + content + timestamp | YES — simple, high value |
| **LLM responses** | Highest per-call savings (~$0.01-0.10 each) | None | HIGH — prompt hash + input hash, cache invalidation on prompt change | DEFER — claim-level caching captures most of the same benefit |
| **Search query results** | Marginal — search APIs are cheap | Minor | MEDIUM — results go stale quickly | NO — volatile, low ROI |
| **Job metadata** | None — SQLite reads are fast | None | LOW | NO — already fast |

### 2.2 Cost Impact Modeling

Assuming ~$0.10-$2.00 per analysis at current rates (depending on article complexity and model tier):

| Usage Level | Current Cost/day | With Claim Cache (-35%) | With URL Cache (-15% latency) |
|-------------|-----------------|------------------------|-------------------------------|
| 10 analyses/day | $1-20 | $0.65-13 | Same cost, 30-60s faster |
| 100 analyses/day | $10-200 | $6.50-130 | Same cost, 5-15 min faster |
| 1000 analyses/day | $100-2,000 | $65-1,300 | Same cost, 50-150 min faster |

**Key insight**: Claim caching and URL caching are independent wins. Claim caching saves money; URL caching saves time. Both follow the existing SQLite + in-memory pattern from source reliability.

### 2.3 Recommended Implementation

**Priority 1 — URL Content Cache** (LOW effort, HIGH impact on latency):
- SQLite table: `url_content_cache(url_hash TEXT PK, url TEXT, content TEXT, fetched_at TEXT, ttl_days INT)`
- Follow existing SR cache pattern (SQLite + in-memory Map)
- Default TTL: 7 days (news content changes; longer for reference/academic URLs)


**Priority 2 — Claim-Level Result Cache** (MEDIUM effort, HIGH impact on cost):
- SQLite table: `claim_cache(claim_hash TEXT PK, prompt_version_hash TEXT, result_json TEXT, created_at TEXT, ttl_days INT)`
- Requires canonical claim normalization (already exists in `claim-decomposition.ts`)
- Must invalidate when prompt versions change (use prompt config hash from UCM)

- **Note**: May need normalized DB schema first

---

## 3. Redis: Do We Still Need It?

### 3.1 Original Justification (from Storage Architecture xWiki page, V0.9.70)

The original roadmap assumed Redis for:
- Hot data caching (analysis results, config)
- Session management (user authentication)
- Rate limiting (per-IP throttling)
- Pub/sub (real-time updates across instances)

### 3.2 Current Reality

| Original Redis Use Case | Current Solution | Gap? |
|------------------------|-----------------|------|
| Hot data caching | In-memory `Map` (config), SQLite (SR) | No gap at current scale |
| Session management | No user auth = no sessions | Not needed until Beta 0 |
| Rate limiting | Not implemented | Can be in-process for single-instance |
| Pub/sub for real-time | SSE events work without Redis | No gap for single-instance |
| Claim caching | Not implemented | SQLite can handle this |

### 3.3 When Redis Becomes Necessary

Redis adds value when:
- **Multiple application instances** need shared cache/state (horizontal scaling)
- **Sub-millisecond cache lookups** required (SQLite is ~1-5ms, sufficient for current needs)
- **Pub/sub across instances** (e.g., config change notifications in a cluster)
- **Distributed rate limiting** (per-user across multiple servers)

**Trigger criteria** (following [When-to-Add-Complexity](../xwiki-pages/FactHarbor/Product%20Development/DevOps/Guidelines/When%20to%20Add%20Complexity/WebHome.xwiki) philosophy):
- Single-instance SQLite cache latency >100ms
- Need for >1 application instance
- Rate limiting required across instances

### 3.4 Recommendation

**DEFER Redis. Not needed for current or near-term development.**

SQLite + in-memory `Map` handles all current caching needs with the same pattern already proven in SR cache and UCM config. Adding Redis introduces operational complexity (separate process, connection management, deployment) without measurable benefit at single-instance scale.

---

## 4. PostgreSQL: When and Why?

### 4.1 Current SQLite Limitations

| Limitation | Impact | When It Hurts |
|-----------|--------|---------------|
| JSON blob storage (no relational queries) | Cannot query across analyses for claims/evidence/sources | When browse/search is needed |
| Single-writer | No concurrent writes from multiple processes | When horizontal scaling is needed |
| No complex aggregation queries | Cannot run analytics across all analyses | When quality metrics dashboard needs SQL-based analytics |
| No full-text search | Cannot search claim text or evidence content | When browse/search is needed |
| No ACID with concurrent access | Risk of corruption under heavy write load | When >1 instance writes simultaneously |

### 4.2 What PostgreSQL Enables

- **Browse/search claims** across all analyses (FR: not yet defined, but expected for public site)
- **Quality metrics dashboards** with SQL-based aggregation queries
- **Evidence deduplication** (FR54) with relational queries to find duplicates across analyses
- **User accounts and permissions** (Beta 0 requirement)
- **Multi-instance deployment** with proper concurrency
- **Full-text search** with PostgreSQL's built-in `tsvector`/`tsquery`

### 4.3 Migration Path

The .NET API already has PostgreSQL support:
- `appsettings.json` has PostgreSQL connection string configuration
- Entity Framework migrations work with both SQLite and PostgreSQL
- Switching is a configuration change, not a code rewrite

### 4.4 Recommendation

**Add PostgreSQL for Alpha/Beta 0 — not before.**

SQLite is sufficient for current single-user/single-instance POC. PostgreSQL should be added when:
- User accounts are implemented (Beta 0 requirement)
- Browse/search functionality is needed
- Evidence deduplication (FR54) requires relational queries
- Quality metrics dashboard needs persistent SQL analytics

**Note**: Keep SQLite for `config.db` (portable, no external dependency) and `source-reliability.db` (standalone, extractable per UCM Phase 3). Only `factharbor.db` needs PostgreSQL.

---

## 5. Vector Database Assessment

Full assessment: [Vector_DB_Assessment.md](Vector_DB_Assessment.md) (February 2, 2026)

### Summary

> "Vector search is not required to deliver the core Shadow Mode value [...] but it can improve similarity detection and clustering beyond exact text-hash matches. [...] vectors should remain optional and offline to preserve performance and pipeline determinism."

### Key Conclusions

- Vectors add value for: near-duplicate claim detection, edge case clustering, A/B test corpus assembly
- Vectors should NOT: replace deterministic caching, be on the critical analysis path, affect pipeline performance
- Best integration point: text-analysis service layer (offline analysis only)
- Keep off critical path to honor NFR1 (minimal performance impact)

### When to Add

- Only after Shadow Mode produces evidence that near-duplicate detection needs exceed text-hash capability
- Start with lightweight normalization + n-gram overlap (no vector DB needed)
- Introduce optional embeddings store only for offline analysis

### Recommendation

**DEFER vector DB. Re-evaluate after Shadow Mode data collection proves the need.**

Short-term: Implement Shadow Mode Phase 1 logging in SQLite. Add basic near-duplicate detector without vectors.

Long-term: If clustering data shows value, introduce optional embeddings store for offline analysis only.

---

## 6. Revised Storage Roadmap

### Original Roadmap (Outdated)

```
Phase 1: Add Redis for caching
Phase 2: Migrate to PostgreSQL for normalized data
Phase 3: Add S3 for archives and backups
```

### Revised Roadmap

```
Phase 1 (NOW → Alpha):
  ├── ADD URL content cache (SQLite, follows SR cache pattern)
  ├── ADD claim-level result cache (SQLite, with prompt-version awareness)
  ├── KEEP 3-DB architecture (factharbor.db, config.db, sr.db)
  └── KEEP in-memory Map caches for config + SR prefetch

Phase 2 (Alpha → Beta 0):
  ├── ADD PostgreSQL for factharbor.db (user data, normalized claims, search)
  ├── ADD normalized claim/evidence/source tables alongside JSON blobs
  ├── KEEP SQLite for config.db (portable, no external dependency)
  └── KEEP SQLite for sr.db (standalone, extractable)

Phase 3 (Beta 0 → V1.0):
  ├── ADD Redis ONLY IF multi-instance deployment required
  ├── PostgreSQL becomes primary for all production data
  └── SQLite retained for development/single-instance

Phase 4 (V1.0+):
  ├── ADD vector DB ONLY IF Shadow Mode data proves value
  └── ADD S3/blob storage ONLY IF storage exceeds ~50GB
```

---

## 7. Decision Summary

| Technology | Decision | When | Justification | Status |
|-----------|----------|------|---------------|--------|
| **SQLite URL cache** | EVALUATE | Alpha planning | Reduces latency 5-15s per source, follows SR cache pattern | Needs further analysis |
| **SQLite claim cache** | EVALUATE | Alpha planning | 30-50% LLM cost savings on duplicate claims | Needs further analysis |
| **Redis** | DEFER | Multi-instance | Not needed for single-instance; SQLite + in-memory `Map` suffices | Agreed |
| **PostgreSQL** | EVALUATE | Alpha/Beta 0 | When user accounts + search + evidence dedup needed | Needs further analysis |
| **Vector DB** | DEFER | Post-Shadow Mode | No evidence of value yet; start with n-gram overlap | Agreed |
| **S3** | DEFER | V1.0+ | Storage well under 50GB for foreseeable future | Agreed |

**Note**: DEFER items are agreed. EVALUATE items (URL cache, claim cache, PostgreSQL) require deeper analysis during Alpha release planning — scope, dependencies, and prioritization to be determined as part of Alpha milestones.

---

## Related Documents

- [Vector DB Assessment](Vector_DB_Assessment.md) — Full vector DB evaluation
- [Shadow Mode Architecture](Shadow_Mode_Architecture.md) — Offline analysis logging design
- [POC to Alpha Transition](POC_to_Alpha_Transition.md) — Phase redefinition (caching is Alpha milestone)
- `Docs/STATUS/Backlog.md` — Claim caching backlog item (#7)
- `Docs/STATUS/Current_Status.md` — Component health and known issues

---

**Document Status**: PARTIALLY APPROVED (February 2026) — DEFER decisions agreed; ADD items need Alpha-phase analysis
**xWiki Conversion**: ✅ Storage Architecture xWiki page rewritten (2026-02-07) — `Specification/Diagrams/Storage Architecture/WebHome.xwiki`
**Next Step**: Detailed analysis of URL cache, claim cache, and PostgreSQL timing during Alpha release planning
