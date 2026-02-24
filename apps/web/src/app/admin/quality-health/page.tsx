'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import styles from './quality-health.module.css';

// -- Types -------------------------------------------------------------------

interface F4Data {
  insufficientClaims: number;
  totalClaims: number;
  rejectionRate: number;
}

interface F5Data {
  baselessBlocked: number;
  totalAdjustments: number;
  blockRate: number;
}

interface F6Data {
  partitioningActive: boolean;
  institutionalCount: number;
  generalCount: number;
  poolImbalanceDetected: boolean;
  balanceRatio: number | null;
}

interface TimeSeriesEntry {
  jobId: string;
  timestamp: string;
  f4: F4Data;
  f5: F5Data;
  f6: F6Data;
}

interface Aggregates {
  f4_avgRejectionRate: number;
  f5_avgBlockRate: number;
  f6_partitioningActiveRate: number;
  f6_poolImbalanceRate: number;
}

interface QualityHealthData {
  count: number;
  timeSeries: TimeSeriesEntry[];
  aggregates: Aggregates;
}

interface SummaryStats {
  count: number;
  avgDuration: number;
  avgCost: number;
  avgTokens: number;
  schemaComplianceRate: number;
  gate1PassRate: number;
  gate4HighConfidenceRate: number;
  failureModes?: {
    totalWarnings: number;
    totalRefusalEvents: number;
    totalDegradationEvents: number;
    avgRefusalRatePer100LlmCalls: number;
    avgDegradationRatePer100LlmCalls: number;
    byProvider: Record<string, { refusalCount: number; degradationCount: number; totalEvents: number }>;
    byStage: Record<string, { refusalCount: number; degradationCount: number; totalEvents: number }>;
    byTopic: Record<string, { refusalCount: number; degradationCount: number; totalEvents: number }>;
  };
}

// -- Helpers -----------------------------------------------------------------

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function statusClass(
  value: number,
  green: number,
  red: number,
  lowerIsBetter = true,
): string {
  if (lowerIsBetter) {
    if (value <= green) return styles.statusGood;
    if (value >= red) return styles.statusBad;
    return styles.statusOk;
  }
  if (value >= green) return styles.statusGood;
  if (value <= red) return styles.statusBad;
  return styles.statusOk;
}

function statusDot(
  value: number,
  green: number,
  red: number,
  lowerIsBetter = true,
): string {
  if (lowerIsBetter) {
    if (value <= green) return '#10b981';
    if (value >= red) return '#ef4444';
    return '#f59e0b';
  }
  if (value >= green) return '#10b981';
  if (value <= red) return '#ef4444';
  return '#f59e0b';
}

function pctStatusClass(value: number, good: number, ok: number): string {
  if (value >= good) return styles.statusGood;
  if (value >= ok) return styles.statusOk;
  return styles.statusBad;
}

function pctBarColor(value: number, good: number, ok: number): string {
  if (value >= good) return '#10b981';
  if (value >= ok) return '#f59e0b';
  return '#ef4444';
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

function formatTokens(tokens: number): string {
  if (tokens < 1000) return `${Math.round(tokens)}`;
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${(tokens / 1000000).toFixed(2)}M`;
}

function topEntries(
  counters: Record<string, { refusalCount: number; degradationCount: number; totalEvents: number }> | undefined,
  max = 5,
) {
  if (!counters) return [];
  return Object.entries(counters)
    .sort((a, b) => b[1].totalEvents - a[1].totalEvents)
    .slice(0, max);
}

// -- Sub-components ----------------------------------------------------------

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, { refusalCount: number; degradationCount: number; totalEvents: number }]>;
}) {
  return (
    <div className={styles.breakdownBlock}>
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className={styles.chartDescription}>No events</p>
      ) : (
        <table className={styles.breakdownTable}>
          <thead>
            <tr>
              <th>Key</th>
              <th>Refusal</th>
              <th>Degradation</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, val]) => (
              <tr key={key}>
                <td>{key}</td>
                <td>{val.refusalCount}</td>
                <td>{val.degradationCount}</td>
                <td>{val.totalEvents}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// -- Component ---------------------------------------------------------------

export default function QualityHealthPage() {
  const [data, setData] = useState<QualityHealthData | null>(null);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('7d');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Clear previous data to avoid stale sections on range change or partial failure
      setData(null);
      setStats(null);

      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '24h': startDate.setHours(startDate.getHours() - 24); break;
        case '7d': startDate.setDate(startDate.getDate() - 7); break;
        case '30d': startDate.setDate(startDate.getDate() - 30); break;
        case '90d': startDate.setDate(startDate.getDate() - 90); break;
      }

      const qhParams = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: '200',
      });

      // Summary endpoint supports uncapped mode with limit=0 so totals/averages
      // represent all matching records in the selected date range.
      const summaryParams = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: '0',
      });

      // Fetch both endpoints via Next.js proxy (same-origin, no CORS issues).
      // Use allSettled so partial data still renders if one endpoint fails.
      const [qhResult, summaryResult] = await Promise.allSettled([
        fetch(`/api/fh/metrics/quality-health?${qhParams}`).then(async (r) => {
          if (!r.ok) throw new Error(`Quality health API returned ${r.status}`);
          return r.json();
        }),
        fetch(`/api/fh/metrics/summary?${summaryParams}`).then(async (r) => {
          if (!r.ok) throw new Error(`Summary API returned ${r.status}`);
          return r.json();
        }),
      ]);

      if (qhResult.status === 'fulfilled') setData(qhResult.value);
      if (summaryResult.status === 'fulfilled') setStats(summaryResult.value);

      // Only show error if both failed
      if (qhResult.status === 'rejected' && summaryResult.status === 'rejected') {
        throw new Error(`${qhResult.reason?.message || 'Quality health failed'}; ${summaryResult.reason?.message || 'Summary failed'}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch monitoring data');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // -- Chart data transforms -------------------------------------------------

  const rateChartData = data?.timeSeries.map((entry) => ({
    timestamp: shortDate(entry.timestamp),
    jobId: entry.jobId,
    'F4 Sufficiency Rejection': entry.f4.rejectionRate,
    'F5 Baseless Block': entry.f5.blockRate,
  })) ?? [];

  const partitionChartData = data?.timeSeries.map((entry) => ({
    timestamp: shortDate(entry.timestamp),
    jobId: entry.jobId,
    Institutional: entry.f6.institutionalCount,
    General: entry.f6.generalCount,
    active: entry.f6.partitioningActive,
  })) ?? [];

  const balanceChartData = data?.timeSeries
    .filter((e) => e.f6.balanceRatio !== null)
    .map((entry) => ({
      timestamp: shortDate(entry.timestamp),
      jobId: entry.jobId,
      'Balance Ratio': entry.f6.balanceRatio,
    })) ?? [];

  const hasQhData = data && data.count > 0;
  const hasStats = stats && stats.count > 0;
  const hasAnyData = hasQhData || hasStats;

  // -- Render ----------------------------------------------------------------

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Analysis Monitoring</h1>
        <div className={styles.controls}>
          <Link href="/admin" className={styles.navLink}>Admin</Link>
          <select
            className={styles.select}
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className={styles.refreshButton} onClick={fetchData}>
            Refresh
          </button>
        </div>
      </div>

      {loading && <div className={styles.loading}>Loading monitoring data...</div>}
      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button className={styles.retryButton} onClick={fetchData}>Retry</button>
        </div>
      )}

      {!loading && !error && !hasAnyData && (
        <div className={styles.empty}>
          <p>No monitoring data available for the selected period.</p>
          <p style={{ fontSize: '0.875rem' }}>Run analyses to populate monitoring data.</p>
        </div>
      )}

      {!loading && !error && hasAnyData && (
        <>
          {/* ── Operational Summary ─────────────────────────────────── */}
          {hasStats && (
            <>
              <h2 className={styles.sectionHeading}>Operational Summary</h2>
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
            </>
          )}

          {/* ── Quality Gates ──────────────────────────────────────── */}
          {hasStats && (
            <>
              <h2 className={styles.sectionHeading}>Quality Gates</h2>
              <div className={styles.metricsRow}>
                <div className={styles.metricCard}>
                  <div className={styles.metricHeader}>
                    <span className={styles.metricTitle}>Schema Compliance</span>
                    <span className={pctStatusClass(stats.schemaComplianceRate, 95, 85)}>
                      {stats.schemaComplianceRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${stats.schemaComplianceRate}%`,
                        backgroundColor: pctBarColor(stats.schemaComplianceRate, 95, 85),
                      }}
                    />
                  </div>
                  <p className={styles.metricDescription}>Valid schema-compliant outputs</p>
                </div>

                <div className={styles.metricCard}>
                  <div className={styles.metricHeader}>
                    <span className={styles.metricTitle}>Gate 1 Pass Rate</span>
                    <span className={pctStatusClass(stats.gate1PassRate, 70, 50)}>
                      {stats.gate1PassRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${stats.gate1PassRate}%`,
                        backgroundColor: pctBarColor(stats.gate1PassRate, 70, 50),
                      }}
                    />
                  </div>
                  <p className={styles.metricDescription}>Claims passing quality validation</p>
                </div>

                <div className={styles.metricCard}>
                  <div className={styles.metricHeader}>
                    <span className={styles.metricTitle}>Gate 4 High Confidence</span>
                    <span className={pctStatusClass(stats.gate4HighConfidenceRate, 60, 40)}>
                      {stats.gate4HighConfidenceRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${stats.gate4HighConfidenceRate}%`,
                        backgroundColor: pctBarColor(stats.gate4HighConfidenceRate, 60, 40),
                      }}
                    />
                  </div>
                  <p className={styles.metricDescription}>Verdicts with 3+ sources, 5+ evidence items</p>
                </div>
              </div>
            </>
          )}

          {/* ── Quality Health (F4/F5/F6) ──────────────────────────── */}
          {hasQhData && (
            <>
              <h2 className={styles.sectionHeading}>Quality Health (F4 / F5 / F6)</h2>
              <div className={styles.summary}>
                <div className={styles.summaryCard}>
                  <div className={styles.cardLabel}>F4: Sufficiency Rejection</div>
                  <div className={`${styles.cardValue} ${statusClass(data.aggregates.f4_avgRejectionRate, 0.10, 0.25)}`}>
                    <span className={styles.statusIndicator} style={{ backgroundColor: statusDot(data.aggregates.f4_avgRejectionRate, 0.10, 0.25) }} />
                    {pct(data.aggregates.f4_avgRejectionRate)}
                  </div>
                  <div className={styles.cardHint}>Claims lacking sufficient evidence</div>
                </div>

                <div className={styles.summaryCard}>
                  <div className={styles.cardLabel}>F5: Baseless Block Rate</div>
                  <div className={`${styles.cardValue} ${statusClass(data.aggregates.f5_avgBlockRate, 0.20, 0.50)}`}>
                    <span className={styles.statusIndicator} style={{ backgroundColor: statusDot(data.aggregates.f5_avgBlockRate, 0.20, 0.50) }} />
                    {pct(data.aggregates.f5_avgBlockRate)}
                  </div>
                  <div className={styles.cardHint}>Verdict adjustments reverted as baseless</div>
                </div>

                <div className={styles.summaryCard}>
                  <div className={styles.cardLabel}>F6: Partitioning Active</div>
                  <div className={`${styles.cardValue} ${statusClass(data.aggregates.f6_partitioningActiveRate, 0.80, 0.50, false)}`}>
                    <span className={styles.statusIndicator} style={{ backgroundColor: statusDot(data.aggregates.f6_partitioningActiveRate, 0.80, 0.50, false) }} />
                    {pct(data.aggregates.f6_partitioningActiveRate)}
                  </div>
                  <div className={styles.cardHint}>Analyses with active evidence partitioning</div>
                </div>

                <div className={styles.summaryCard}>
                  <div className={styles.cardLabel}>F6: Pool Imbalance</div>
                  <div className={`${styles.cardValue} ${statusClass(data.aggregates.f6_poolImbalanceRate, 0.15, 0.30)}`}>
                    <span className={styles.statusIndicator} style={{ backgroundColor: statusDot(data.aggregates.f6_poolImbalanceRate, 0.15, 0.30) }} />
                    {pct(data.aggregates.f6_poolImbalanceRate)}
                  </div>
                  <div className={styles.cardHint}>Evidence pools skewed to one direction</div>
                </div>
              </div>

              {/* Charts Row */}
              <div className={styles.charts}>
                <div className={styles.chartSection}>
                  <h2>F4 + F5: Rate Trends</h2>
                  <p className={styles.chartDescription}>
                    Per-analysis rejection and block rates. Dashed lines show threshold boundaries.
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={rateChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 1]} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                      <Tooltip formatter={(v) => pct(Number(v))} />
                      <Legend />
                      <ReferenceLine y={0.25} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'F4 red', fontSize: 10, fill: '#ef4444' }} />
                      <ReferenceLine y={0.50} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'F5 red', fontSize: 10, fill: '#f59e0b' }} />
                      <Line type="monotone" dataKey="F4 Sufficiency Rejection" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="F5 Baseless Block" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className={styles.chartSection}>
                  <h2>F6: Evidence Partitioning</h2>
                  <p className={styles.chartDescription}>
                    Institutional (advocate) vs. general (challenger) evidence counts per analysis.
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={partitionChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Institutional" fill="#6366f1" stackId="partition" />
                      <Bar dataKey="General" fill="#a5b4fc" stackId="partition" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Evidence Balance Trend */}
              {balanceChartData.length > 0 && (
                <div className={styles.chartSectionFull}>
                  <h2>Evidence Balance Ratio</h2>
                  <p className={styles.chartDescription}>
                    Ratio of supporting vs. contradicting evidence. Values near 0.5 indicate balanced evidence; above 0.8 signals skew.
                  </p>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={balanceChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 1]} tickFormatter={(v: number) => v.toFixed(1)} />
                      <Tooltip formatter={(v) => Number(v).toFixed(3)} />
                      <Legend />
                      <ReferenceLine y={0.8} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Skew threshold', fontSize: 10, fill: '#ef4444' }} />
                      <Line type="monotone" dataKey="Balance Ratio" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}

          {/* ── Failure Modes ──────────────────────────────────────── */}
          {hasStats && stats.failureModes && (
            <>
              <h2 className={styles.sectionHeading}>Failure Modes (C18)</h2>
              <div className={styles.chartSectionFull}>
                <div className={styles.failureStatsRow}>
                  <div className={styles.failureStat}>
                    <span className={styles.failureStatLabel}>Total Warnings</span>
                    <span className={styles.failureStatValue}>{stats.failureModes.totalWarnings}</span>
                  </div>
                  <div className={styles.failureStat}>
                    <span className={styles.failureStatLabel}>Refusal Events</span>
                    <span className={styles.failureStatValue}>{stats.failureModes.totalRefusalEvents}</span>
                  </div>
                  <div className={styles.failureStat}>
                    <span className={styles.failureStatLabel}>Degradation Events</span>
                    <span className={styles.failureStatValue}>{stats.failureModes.totalDegradationEvents}</span>
                  </div>
                  <div className={styles.failureStat}>
                    <span className={styles.failureStatLabel}>Avg Refusal Rate</span>
                    <span className={styles.failureStatValue}>{stats.failureModes.avgRefusalRatePer100LlmCalls.toFixed(1)} / 100</span>
                  </div>
                  <div className={styles.failureStat}>
                    <span className={styles.failureStatLabel}>Avg Degradation Rate</span>
                    <span className={styles.failureStatValue}>{stats.failureModes.avgDegradationRatePer100LlmCalls.toFixed(1)} / 100</span>
                  </div>
                </div>

                <div className={styles.breakdownGrid}>
                  <BreakdownTable title="By Provider" rows={topEntries(stats.failureModes.byProvider)} />
                  <BreakdownTable title="By Stage" rows={topEntries(stats.failureModes.byStage)} />
                  <BreakdownTable title="By Topic" rows={topEntries(stats.failureModes.byTopic)} />
                </div>
              </div>
            </>
          )}

          {/* ── Performance & Cost ─────────────────────────────────── */}
          {hasStats && (
            <>
              <h2 className={styles.sectionHeading}>Performance &amp; Cost</h2>
              <div className={styles.chartSectionFull}>
                <div className={styles.failureStatsRow}>
                  <div className={styles.failureStat}>
                    <span className={styles.failureStatLabel}>Total Cost (Period)</span>
                    <span className={styles.failureStatValue}>{formatCost(stats.avgCost * stats.count)}</span>
                  </div>
                  <div className={styles.failureStat}>
                    <span className={styles.failureStatLabel}>Total Tokens (Period)</span>
                    <span className={styles.failureStatValue}>{formatTokens(stats.avgTokens * stats.count)}</span>
                  </div>
                  <div className={styles.failureStat}>
                    <span className={styles.failureStatLabel}>Total Duration (Period)</span>
                    <span className={styles.failureStatValue}>{formatDuration(stats.avgDuration * stats.count)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className={styles.footer}>
            Showing data for the last {timeRange}
            {hasStats && <> &middot; {stats.count} analyses</>}
            {hasQhData && hasStats && data.count !== stats.count && <> ({data.count} with quality health)</>}
          </div>
        </>
      )}
    </div>
  );
}
