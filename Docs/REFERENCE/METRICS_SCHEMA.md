# FactHarbor Metrics Schema

## Overview

The FactHarbor metrics system collects comprehensive performance, quality, and cost data for every analysis job. This enables:

- Performance monitoring and optimization
- Cost tracking and forecasting
- Quality assurance and regression detection
- A/B testing and validation

## Database Schema

### AnalysisMetrics Table

```sql
CREATE TABLE AnalysisMetrics (
  Id UNIQUEIDENTIFIER PRIMARY KEY,
  JobId UNIQUEIDENTIFIER NOT NULL,
  MetricsJson NVARCHAR(MAX) NOT NULL,
  CreatedUtc DATETIME2 NOT NULL,
  FOREIGN KEY (JobId) REFERENCES Jobs(JobId)
);

CREATE INDEX IX_Metrics_JobId ON AnalysisMetrics(JobId);
CREATE INDEX IX_Metrics_Created ON AnalysisMetrics(CreatedUtc);
```

## JSON Schema

### AnalysisMetrics

```typescript
interface AnalysisMetrics {
  // Identification
  jobId: string;
  schemaVersion: string;
  pipelineVariant: 'orchestrated' | 'monolithic-canonical' | 'monolithic-dynamic';
  timestamp: Date;
  
  // Performance
  totalDurationMs: number;
  phaseTimings: {
    understand: number;
    research: number;
    verdict: number;
    summary: number;
    report: number;
  };
  llmCalls: LLMCallMetric[];
  searchQueries: SearchQueryMetric[];
  
  // Quality Gates
  gate1Stats: Gate1Metric;
  gate4Stats: Gate4Metric;
  
  // Schema Compliance
  schemaCompliance: SchemaComplianceMetric;
  
  // Output Quality
  outputQuality: {
    claimsExtracted: number;
    claimsWithVerdicts: number;
    scopesDetected: number;
    sourcesFound: number;
    factsExtracted: number;
    averageConfidence: number;
  };
  
  // Costs (estimated)
  estimatedCostUSD: number;
  tokenCounts: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  
  // Configuration
  config: {
    llmProvider: string;
    searchProvider: string;
    allowModelKnowledge: boolean;
    isLLMTiering: boolean;
    isDeterministic: boolean;
  };
}
```

### LLMCallMetric

```typescript
interface LLMCallMetric {
  taskType: 'understand' | 'extract_facts' | 'verdict' | 'scope_refinement' | 'supplemental' | 'other';
  provider: string;
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  success: boolean;
  schemaCompliant: boolean;
  retries: number;
  errorMessage?: string;
  timestamp: Date;
}
```

### SearchQueryMetric

```typescript
interface SearchQueryMetric {
  query: string;
  provider: 'google-cse' | 'serpapi' | 'gemini-grounded';
  resultsCount: number;
  durationMs: number;
  success: boolean;
  timestamp: Date;
}
```

### Gate1Metric

```typescript
interface Gate1Metric {
  totalClaims: number;
  passedClaims: number;
  filteredClaims: number;
  filteredReasons: Record<string, number>; // reason -> count
  centralClaimsKept: number;
}
```

### Gate4Metric

```typescript
interface Gate4Metric {
  totalVerdicts: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  insufficient: number;
  unpublishable: number;
}
```

## API Endpoints

### POST /api/fh/metrics

Store metrics for an analysis job.

**Request Body:**
```json
{
  "jobId": "uuid",
  "schemaVersion": "2.6.33",
  "totalDurationMs": 45000,
  ...
}
```

**Response:**
```json
{
  "id": "metrics-uuid",
  "jobId": "job-uuid"
}
```

### GET /api/fh/metrics/{jobId}

Retrieve metrics for a specific job.

**Response:** Full AnalysisMetrics JSON

### GET /api/fh/metrics/summary

Get summary statistics for a date range.

**Query Parameters:**
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date
- `limit` (optional): Max records to analyze (default: 100)

**Response:**
```json
{
  "count": 50,
  "avgDuration": 42000,
  "avgCost": 0.15,
  "avgTokens": 75000,
  "schemaComplianceRate": 96.5,
  "gate1PassRate": 72.3,
  "gate4HighConfidenceRate": 58.7,
  "startDate": "2026-01-15T00:00:00Z",
  "endDate": "2026-01-19T23:59:59Z"
}
```

### DELETE /api/fh/metrics/cleanup

Delete metrics older than specified days.

**Query Parameters:**
- `daysOld` (optional): Age threshold in days (default: 90)

**Response:**
```json
{
  "deleted": 150
}
```

## Usage in Code

### Collecting Metrics

```typescript
import { createMetricsCollector, persistMetrics } from '@/lib/analyzer/metrics';

// Create collector at start of analysis
const metrics = createMetricsCollector(jobId, 'orchestrated');

// Track phases
metrics.startPhase('understand');
// ... do understanding work ...
metrics.endPhase('understand');

// Record LLM calls
metrics.recordLLMCall({
  taskType: 'understand',
  provider: 'anthropic',
  modelName: 'claude-sonnet-4-20250514',
  promptTokens: 5000,
  completionTokens: 1500,
  totalTokens: 6500,
  durationMs: 2500,
  success: true,
  schemaCompliant: true,
  retries: 0,
  timestamp: new Date(),
});

// Set quality gate stats
metrics.setGate1Stats({
  totalClaims: 8,
  passedClaims: 6,
  filteredClaims: 2,
  filteredReasons: { 'opinion': 1, 'low-specificity': 1 },
  centralClaimsKept: 2,
});

// Finalize and persist
const finalMetrics = metrics.finalize();
await persistMetrics(finalMetrics);
```

### Querying Metrics

```typescript
// Get metrics for a job
const response = await fetch(`/api/fh/metrics/${jobId}`);
const metrics: AnalysisMetrics = await response.json();

// Get summary stats
const params = new URLSearchParams({
  startDate: '2026-01-01',
  endDate: '2026-01-31',
});
const summaryResponse = await fetch(`/api/fh/metrics/summary?${params}`);
const summary = await summaryResponse.json();
```

## Dashboard

The metrics dashboard is available at `/admin/metrics`.

Features:
- Real-time summary statistics
- Schema compliance tracking
- Quality gate pass rates
- Cost and performance trends
- Time range selection

## Best Practices

1. **Always collect metrics**: Metrics should be collected for 100% of analyses
2. **Async persistence**: Metrics persistence should not block analysis completion
3. **Error handling**: Failed metrics collection should not fail the analysis
4. **Privacy**: Metrics do not include sensitive input data
5. **Retention**: Configure cleanup schedule (default: 90 days)

## Cost Estimation

Costs are estimated based on token usage and provider pricing:

| Provider | Model | Input (per 1M) | Output (per 1M) |
|----------|-------|----------------|-----------------|
| Anthropic | Sonnet-4 | $3 | $15 |
| Anthropic | Haiku | $0.25 | $1.25 |
| OpenAI | GPT-4o | $2.50 | $10 |
| OpenAI | GPT-4o-mini | $0.15 | $0.60 |
| Google | Gemini Pro | $1.25 | $5 |
| Google | Gemini Flash | $0.075 | $0.30 |

**Note:** Prices as of January 2026, subject to change.

## Related Documentation

- [Testing Strategy](../DEVELOPMENT/TESTING_STRATEGY.md)
- [Baseline Results](./BASELINE_RESULTS.md)
- [A/B Test Results](./AB_TEST_RESULTS.md)
