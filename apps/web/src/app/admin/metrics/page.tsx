'use client';

import { useEffect, useState } from 'react';
import styles from './metrics.module.css';

interface SummaryStats {
  count: number;
  avgDuration: number;
  avgCost: number;
  avgTokens: number;
  schemaComplianceRate: number;
  gate1PassRate: number;
  gate4HighConfidenceRate: number;
  startDate?: string;
  endDate?: string;
}

export default function MetricsPage() {
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchMetrics();
  }, [timeRange]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: '1000',
      });

      const response = await fetch(`/api/fh/metrics/summary?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h1>Analysis Metrics</h1>
        <div className={styles.loading}>Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h1>Analysis Metrics</h1>
        <div className={styles.error}>Error: {error}</div>
        <button onClick={fetchMetrics} className={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  if (!stats || stats.count === 0) {
    return (
      <div className={styles.container}>
        <h1>Analysis Metrics</h1>
        <div className={styles.empty}>
          <p>No metrics available for the selected time range.</p>
          <p>Metrics will appear here after analyses are completed.</p>
        </div>
      </div>
    );
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens < 1000) return `${Math.round(tokens)}`;
    if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
    return `${(tokens / 1000000).toFixed(2)}M`;
  };

  const formatPercent = (pct: number) => {
    return `${pct.toFixed(1)}%`;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Analysis Metrics Dashboard</h1>
        <div className={styles.controls}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className={styles.select}
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button onClick={fetchMetrics} className={styles.refreshButton}>
            Refresh
          </button>
        </div>
      </header>

      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <div className={styles.cardLabel}>Total Analyses</div>
          <div className={styles.cardValue}>{stats.count}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.cardLabel}>Avg Duration</div>
          <div className={styles.cardValue}>{formatDuration(stats.avgDuration)}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.cardLabel}>Avg Cost</div>
          <div className={styles.cardValue}>{formatCost(stats.avgCost)}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.cardLabel}>Avg Tokens</div>
          <div className={styles.cardValue}>{formatTokens(stats.avgTokens)}</div>
        </div>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metricSection}>
          <h2>Quality Metrics</h2>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <h3>Schema Compliance Rate</h3>
              <span className={getStatusClass(stats.schemaComplianceRate, 95, 85)}>
                {formatPercent(stats.schemaComplianceRate)}
              </span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${stats.schemaComplianceRate}%`,
                  backgroundColor: getBarColor(stats.schemaComplianceRate, 95, 85),
                }}
              />
            </div>
            <p className={styles.metricDescription}>
              Percentage of analyses that produced valid schema-compliant outputs
            </p>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <h3>Gate 1 Pass Rate</h3>
              <span className={getStatusClass(stats.gate1PassRate, 70, 50)}>
                {formatPercent(stats.gate1PassRate)}
              </span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${stats.gate1PassRate}%`,
                  backgroundColor: getBarColor(stats.gate1PassRate, 70, 50),
                }}
              />
            </div>
            <p className={styles.metricDescription}>
              Percentage of extracted claims that passed quality validation (not opinions/predictions)
            </p>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <h3>Gate 4 High Confidence Rate</h3>
              <span className={getStatusClass(stats.gate4HighConfidenceRate, 60, 40)}>
                {formatPercent(stats.gate4HighConfidenceRate)}
              </span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${stats.gate4HighConfidenceRate}%`,
                  backgroundColor: getBarColor(stats.gate4HighConfidenceRate, 60, 40),
                }}
              />
            </div>
            <p className={styles.metricDescription}>
              Percentage of verdicts with high confidence (3+ sources, 5+ facts)
            </p>
          </div>
        </div>

        <div className={styles.metricSection}>
          <h2>Performance & Cost</h2>

          <div className={styles.costBreakdown}>
            <div className={styles.costItem}>
              <span className={styles.costLabel}>Total Cost (Period)</span>
              <span className={styles.costValue}>
                {formatCost(stats.avgCost * stats.count)}
              </span>
            </div>
            <div className={styles.costItem}>
              <span className={styles.costLabel}>Total Tokens (Period)</span>
              <span className={styles.costValue}>
                {formatTokens(stats.avgTokens * stats.count)}
              </span>
            </div>
            <div className={styles.costItem}>
              <span className={styles.costLabel}>Total Duration (Period)</span>
              <span className={styles.costValue}>
                {formatDuration(stats.avgDuration * stats.count)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {stats.startDate && stats.endDate && (
        <div className={styles.footer}>
          <p>
            Data from {new Date(stats.startDate).toLocaleDateString()} to{' '}
            {new Date(stats.endDate).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}

function getStatusClass(value: number, goodThreshold: number, okThreshold: number): string {
  if (value >= goodThreshold) return styles.statusGood;
  if (value >= okThreshold) return styles.statusOk;
  return styles.statusBad;
}

function getBarColor(value: number, goodThreshold: number, okThreshold: number): string {
  if (value >= goodThreshold) return '#10b981'; // green
  if (value >= okThreshold) return '#f59e0b'; // amber
  return '#ef4444'; // red
}
