/**
 * FactHarbor Analysis Metrics Collection
 * 
 * Tracks performance, quality, and cost metrics for each analysis.
 * Part of Phase 1: Measurement Infrastructure
 * 
 * @version 1.0.0
 * @date 2026-01-19
 */

// ============================================================================
// TYPES
// ============================================================================

export type LLMTaskType =
  | 'understand'
  | 'extract_evidence'
  | 'context_refinement'
  | 'verdict'
  | 'supplemental'
  | 'other';

export interface LLMCallMetric {
  taskType: LLMTaskType;
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

export interface SearchQueryMetric {
  query: string;
  provider: 'google-cse' | 'serpapi' | 'gemini-grounded';
  resultsCount: number;
  durationMs: number;
  success: boolean;
  timestamp: Date;
}

export interface Gate1Metric {
  totalClaims: number;
  passedClaims: number;
  filteredClaims: number;
  filteredReasons: Record<string, number>; // reason -> count
  centralClaimsKept: number;
}

export interface Gate4Metric {
  totalVerdicts: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  insufficient: number;
  unpublishable: number;
}

export interface SchemaComplianceMetric {
  understand: {
    success: boolean;
    retries: number;
    errorType?: string;
  };
  extractEvidence: Array<{
    sourceId: string;
    success: boolean;
    retries: number;
    errorType?: string;
  }>;
  verdict: {
    success: boolean;
    retries: number;
    errorType?: string;
  };
}

export interface AnalysisMetrics {
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
    evidenceItemsExtracted: number;
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

// ============================================================================
// METRICS COLLECTOR
// ============================================================================

export class MetricsCollector {
  private metrics: Partial<AnalysisMetrics>;
  private startTime: number;
  private phaseStartTimes: Map<string, number>;

  constructor(jobId: string, pipelineVariant: AnalysisMetrics['pipelineVariant']) {
    this.startTime = Date.now();
    this.phaseStartTimes = new Map();
    this.metrics = {
      jobId,
      pipelineVariant,
      schemaVersion: '2.6.33',
      timestamp: new Date(),
      llmCalls: [],
      searchQueries: [],
      phaseTimings: {
        understand: 0,
        research: 0,
        verdict: 0,
        summary: 0,
        report: 0,
      },
    };
  }

  /**
   * Start timing a phase
   */
  startPhase(phase: keyof AnalysisMetrics['phaseTimings']): void {
    this.phaseStartTimes.set(phase, Date.now());
  }

  /**
   * End timing a phase
   */
  endPhase(phase: keyof AnalysisMetrics['phaseTimings']): void {
    const startTime = this.phaseStartTimes.get(phase);
    if (startTime) {
      this.metrics.phaseTimings![phase] = Date.now() - startTime;
      this.phaseStartTimes.delete(phase);
    }
  }

  /**
   * Record an LLM call
   */
  recordLLMCall(call: LLMCallMetric): void {
    this.metrics.llmCalls!.push({
      ...call,
      taskType: call.taskType,
    });
  }

  /**
   * Record a search query
   */
  recordSearchQuery(query: SearchQueryMetric): void {
    this.metrics.searchQueries!.push(query);
  }

  /**
   * Set Gate 1 statistics
   */
  setGate1Stats(stats: Gate1Metric): void {
    this.metrics.gate1Stats = stats;
  }

  /**
   * Set Gate 4 statistics
   */
  setGate4Stats(stats: Gate4Metric): void {
    this.metrics.gate4Stats = stats;
  }

  /**
   * Set schema compliance data
   */
  setSchemaCompliance(compliance: SchemaComplianceMetric): void {
    this.metrics.schemaCompliance = compliance;
  }

  /**
   * Set output quality metrics
   */
  setOutputQuality(quality: AnalysisMetrics['outputQuality']): void {
    this.metrics.outputQuality = quality;
  }

  /**
   * Set configuration
   */
  setConfig(config: AnalysisMetrics['config']): void {
    this.metrics.config = config;
  }

  /**
   * Calculate and return final metrics
   */
  finalize(): AnalysisMetrics {
    // Calculate total duration
    this.metrics.totalDurationMs = Date.now() - this.startTime;

    // Calculate token counts
    const promptTokens = this.metrics.llmCalls!.reduce((sum, call) => sum + call.promptTokens, 0);
    const completionTokens = this.metrics.llmCalls!.reduce((sum, call) => sum + call.completionTokens, 0);
    
    this.metrics.tokenCounts = {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };

    // Estimate cost (rough estimates based on common pricing)
    this.metrics.estimatedCostUSD = this.estimateCost();

    return this.metrics as AnalysisMetrics;
  }

  /**
   * Estimate cost based on token usage and providers
   */
  private estimateCost(): number {
    let totalCost = 0;

    for (const call of this.metrics.llmCalls!) {
      const costPer1M = this.getCostPer1MTokens(call.provider, call.modelName);
      const promptCost = (call.promptTokens / 1_000_000) * costPer1M.input;
      const completionCost = (call.completionTokens / 1_000_000) * costPer1M.output;
      totalCost += promptCost + completionCost;
    }

    // Add search costs (rough estimate: $5 per 1000 queries for most providers)
    const searchCost = (this.metrics.searchQueries!.length / 1000) * 5;
    totalCost += searchCost;

    return totalCost;
  }

  /**
   * Get cost per 1M tokens for a model
   */
  private getCostPer1MTokens(provider: string, modelName: string): { input: number; output: number } {
    // Pricing as of Jan 2026 (approximate)
    const pricing: Record<string, { input: number; output: number }> = {
      // Anthropic
      'claude-sonnet-4-20250514': { input: 3, output: 15 },
      'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
      'claude-3-5-haiku-20241022': { input: 1, output: 5 },
      'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
      
      // OpenAI
      'gpt-4o': { input: 2.5, output: 10 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
      'gpt-4-turbo': { input: 10, output: 30 },
      
      // Google
      'gemini-1.5-pro': { input: 1.25, output: 5 },
      'gemini-1.5-flash': { input: 0.075, output: 0.3 },
      
      // Mistral
      'mistral-large-latest': { input: 3, output: 9 },
      'mistral-small-latest': { input: 0.2, output: 0.6 },
    };

    return pricing[modelName] || { input: 2, output: 6 }; // Default fallback
  }

  /**
   * Export metrics to JSON string
   */
  toJSON(): string {
    return JSON.stringify(this.finalize(), null, 2);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a metrics collector for an analysis job
 */
export function createMetricsCollector(
  jobId: string,
  pipelineVariant: AnalysisMetrics['pipelineVariant']
): MetricsCollector {
  return new MetricsCollector(jobId, pipelineVariant);
}

/**
 * Send metrics to API for persistence
 */
export async function persistMetrics(metrics: AnalysisMetrics): Promise<void> {
  try {
    const response = await fetch('/api/fh/metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metrics),
    });

    if (!response.ok) {
      console.error('Failed to persist metrics:', response.statusText);
    }
  } catch (error) {
    console.error('Error persisting metrics:', error);
    // Don't throw - metrics persistence should not break analysis
  }
}

/**
 * Calculate summary statistics from multiple metrics
 */
export function calculateSummaryStats(metricsArray: AnalysisMetrics[]): {
  avgDuration: number;
  avgCost: number;
  avgTokens: number;
  schemaComplianceRate: number;
  gate1PassRate: number;
  gate4HighConfidenceRate: number;
} {
  if (metricsArray.length === 0) {
    return {
      avgDuration: 0,
      avgCost: 0,
      avgTokens: 0,
      schemaComplianceRate: 0,
      gate1PassRate: 0,
      gate4HighConfidenceRate: 0,
    };
  }

  const avgDuration = metricsArray.reduce((sum, m) => sum + m.totalDurationMs, 0) / metricsArray.length;
  const avgCost = metricsArray.reduce((sum, m) => sum + m.estimatedCostUSD, 0) / metricsArray.length;
  const avgTokens = metricsArray.reduce((sum, m) => sum + m.tokenCounts.totalTokens, 0) / metricsArray.length;

  // Schema compliance rate (understand + verdict must succeed)
  const compliantCount = metricsArray.filter(m => 
    m.schemaCompliance.understand.success && m.schemaCompliance.verdict.success
  ).length;
  const schemaComplianceRate = (compliantCount / metricsArray.length) * 100;

  // Gate 1 pass rate
  const gate1PassRate = metricsArray.reduce((sum, m) => {
    if (m.gate1Stats.totalClaims === 0) return sum;
    return sum + (m.gate1Stats.passedClaims / m.gate1Stats.totalClaims);
  }, 0) / metricsArray.length * 100;

  // Gate 4 high confidence rate
  const gate4HighConfidenceRate = metricsArray.reduce((sum, m) => {
    if (m.gate4Stats.totalVerdicts === 0) return sum;
    return sum + (m.gate4Stats.highConfidence / m.gate4Stats.totalVerdicts);
  }, 0) / metricsArray.length * 100;

  return {
    avgDuration,
    avgCost,
    avgTokens,
    schemaComplianceRate,
    gate1PassRate,
    gate4HighConfidenceRate,
  };
}
