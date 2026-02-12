# P2: Classification Monitoring - Backlog Item

**Date Created:** 2026-02-03
**Priority:** P2 (Nice-to-have)
**Status:** Backlog
**Estimated Effort:** 3-4 hours

---

## Overview

Add telemetry and monitoring for LLM classification behavior to track fallback rates, classification distributions, and identify potential issues over time.

---

## Background

With the LLM-based classification system (replacing pattern-based lexicons), we need visibility into:
1. How often the LLM fails to classify (fallback rate)
2. Distribution of classification values across analyses
3. Trends that might indicate prompt degradation or model issues

---

## Requirements

### 1. Telemetry Collection

Track the following metrics per analysis:
- Total fallbacks by field (harmPotential, factualBasis, sourceAuthority, evidenceBasis, isContested)
- Fallback rate (fallbacks / total classifications attempted)
- Classification value distributions:
  - harmPotential: {high: N, medium: N, low: N}
  - factualBasis: {established: N, disputed: N, opinion: N, unknown: N}
  - sourceAuthority: {primary: N, secondary: N, opinion: N}
  - evidenceBasis: {scientific: N, documented: N, anecdotal: N, theoretical: N, pseudoscientific: N}
  - isContested: {true: N, false: N}

### 2. Storage

Options to consider:
- **Option A:** Append to analysis result JSON (already have `classificationFallbacks`)
- **Option B:** Separate telemetry table in database
- **Option C:** External metrics service (Prometheus, etc.)

Recommendation: Start with Option A (extend existing fallback summary), migrate to Option B if volume requires.

### 3. Admin Endpoint

Create API endpoint for monitoring data:
```
GET /api/admin/classification-metrics
```

Response:
```json
{
  "period": "last_7_days",
  "totalAnalyses": 150,
  "fallbackStats": {
    "totalFallbacks": 23,
    "fallbackRate": 0.02,
    "byField": {
      "harmPotential": 8,
      "factualBasis": 10,
      "sourceAuthority": 2,
      "evidenceBasis": 3,
      "isContested": 0
    }
  },
  "distributions": {
    "harmPotential": {"high": 45, "medium": 80, "low": 25},
    "factualBasis": {"established": 30, "disputed": 40, "opinion": 50, "unknown": 30}
  }
}
```

### 4. Alerting (Optional)

Consider alerts when:
- Fallback rate exceeds threshold (e.g., > 5%)
- Classification distribution shifts significantly
- Specific field has unusually high fallback rate

---

## Implementation Approach

### Phase 1: Data Collection
1. Extend `FallbackSummary` to include classification distributions
2. Add distribution tracking to normalization functions
3. Store in analysis result JSON

### Phase 2: Admin Endpoint
1. Create `/api/admin/classification-metrics` endpoint
2. Aggregate data from recent analyses
3. Return summary statistics

### Phase 3: Dashboard (Optional)
1. Add classification metrics section to admin UI
2. Show trends over time
3. Highlight anomalies

---

## Files to Modify

| File | Change |
|------|--------|
| `classification-fallbacks.ts` | Add distribution tracking |
| `orchestrated.ts` | Collect distributions during normalization |
| `apps/web/src/pages/api/admin/classification-metrics.ts` | NEW - Admin endpoint |
| Admin UI components | Display metrics (optional) |

---

## Dependencies

- ✅ P0 Fallback Strategy (COMPLETE)
- ✅ FallbackTracker module exists
- ✅ Fallback summary in result JSON

---

## Acceptance Criteria

- [ ] Classification distributions tracked per analysis
- [ ] Admin endpoint returns aggregated metrics
- [ ] Fallback rate calculated correctly
- [ ] Documentation updated

---

## Notes

- This is a monitoring/observability feature, not critical for core functionality
- Can be implemented incrementally
- Start simple, expand based on actual needs
- Consider privacy implications if tracking article content

---

## Related Documents

- [P0_Implementation_Status.md](./P0_Implementation_Status.md) - Fallback strategy implementation
- [Post-Migration_Robustness_Proposals.md](./Post-Migration_Robustness_Proposals.md) - Original proposal

---

**Status:** Ready for future implementation when prioritized
