/**
 * Job Config Snapshots
 *
 * Captures and stores complete resolved configuration (UCM + defaults)
 * for each analysis job to enable full auditability.
 *
 * Part of UCM v2.9.0 Phase 2: Job Config Snapshots
 *
 * @module config-snapshots
 * @version 1.0.0
 * @date 2026-01-30
 */

import type { PipelineConfig, SearchConfig, SourceReliabilityConfig } from "./config-schemas";
import { getDb } from "./config-storage";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Complete config snapshot for a job
 */
export interface JobConfigSnapshot {
  jobId: string;
  schemaVersion: string;

  // Full resolved configs (after UCM resolution)
  pipelineConfig: PipelineConfig;
  searchConfig: SearchConfig;

  // SR summary (maintains SR modularity per review Rec #22)
  srEnabled: boolean;
  srDefaultScore: number;
  srConfidenceThreshold: number;

  // Metadata
  capturedUtc: string;
  analyzerVersion: string;
}

interface JobConfigSnapshotRow {
  id: number;
  job_id: string;
  schema_version: string;
  pipeline_config: string; // JSON
  search_config: string; // JSON
  sr_enabled: number; // SQLite boolean (0 or 1)
  sr_default_score: number;
  sr_confidence_threshold: number;
  captured_utc: string;
  analyzer_version: string;
}

// ============================================================================
// CAPTURE
// ============================================================================

/**
 * Capture and persist config snapshot for a job
 *
 * This should be called at the START of analysis (before processing begins)
 * to capture the exact config that will be used.
 *
 * @param jobId - Unique job identifier
 * @param pipelineConfig - Resolved pipeline config (UCM + defaults)
 * @param searchConfig - Resolved search config (UCM + defaults)
 * @param srSummary - SR configuration summary (maintains modularity)
 */
export async function captureConfigSnapshot(
  jobId: string,
  pipelineConfig: PipelineConfig,
  searchConfig: SearchConfig,
  srSummary: {
    enabled: boolean;
    defaultScore: number;
    confidenceThreshold: number;
  },
): Promise<void> {
  const database = await getDb();
  const now = new Date().toISOString();

  try {
    await database.run(
      `INSERT INTO job_config_snapshots (
        job_id,
        schema_version,
        pipeline_config,
        search_config,
        sr_enabled,
        sr_default_score,
        sr_confidence_threshold,
        captured_utc,
        analyzer_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        jobId,
        "1.0", // Snapshot schema version
        JSON.stringify(pipelineConfig, null, 2),
        JSON.stringify(searchConfig, null, 2),
        srSummary.enabled ? 1 : 0,
        srSummary.defaultScore,
        srSummary.confidenceThreshold,
        now,
        "2.9.0", // Analyzer version
      ],
    );
  } catch (error) {
    // If snapshot fails, log but don't break analysis
    console.error(`[ConfigSnapshot] Failed to capture snapshot for job ${jobId}:`, error);
    // Don't throw - config snapshots should never break analysis
  }
}

/**
 * Capture config snapshot asynchronously (non-blocking)
 *
 * Use this to capture config in the background without blocking analysis start.
 * The promise can be awaited later to ensure snapshot was saved.
 *
 * @returns Promise that resolves when snapshot is saved
 */
export async function captureConfigSnapshotAsync(
  jobId: string,
  pipelineConfig: PipelineConfig,
  searchConfig: SearchConfig,
  srSummary: {
    enabled: boolean;
    defaultScore: number;
    confidenceThreshold: number;
  },
): Promise<void> {
  // Wrap in try-catch to prevent unhandled rejections
  try {
    await captureConfigSnapshot(jobId, pipelineConfig, searchConfig, srSummary);
  } catch (error) {
    console.error(`[ConfigSnapshot] Async capture failed for job ${jobId}:`, error);
  }
}

// ============================================================================
// RETRIEVAL
// ============================================================================

/**
 * Get config snapshot for a specific job
 *
 * @param jobId - Job identifier
 * @returns Config snapshot or null if not found
 */
export async function getConfigSnapshot(
  jobId: string,
): Promise<JobConfigSnapshot | null> {
  const database = await getDb();

  try {
    const row = await database.get<JobConfigSnapshotRow>(
      "SELECT * FROM job_config_snapshots WHERE job_id = ?",
      [jobId],
    );

    if (!row) {
      return null;
    }

    return {
      jobId: row.job_id,
      schemaVersion: row.schema_version,
      pipelineConfig: JSON.parse(row.pipeline_config) as PipelineConfig,
      searchConfig: JSON.parse(row.search_config) as SearchConfig,
      srEnabled: row.sr_enabled === 1,
      srDefaultScore: row.sr_default_score,
      srConfidenceThreshold: row.sr_confidence_threshold,
      capturedUtc: row.captured_utc,
      analyzerVersion: row.analyzer_version,
    };
  } catch (error) {
    console.error(`[ConfigSnapshot] Failed to retrieve snapshot for job ${jobId}:`, error);
    return null;
  }
}

/**
 * Check if a config snapshot exists for a job
 *
 * @param jobId - Job identifier
 * @returns true if snapshot exists
 */
export async function hasConfigSnapshot(jobId: string): Promise<boolean> {
  const database = await getDb();

  try {
    const result = await database.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM job_config_snapshots WHERE job_id = ?",
      [jobId],
    );

    return (result?.count ?? 0) > 0;
  } catch (error) {
    console.error(`[ConfigSnapshot] Failed to check snapshot for job ${jobId}:`, error);
    return false;
  }
}

/**
 * Get all jobs that have config snapshots
 *
 * @param limit - Max number of jobs to return
 * @returns Array of job IDs with snapshots
 */
export async function getJobsWithSnapshots(limit: number = 100): Promise<string[]> {
  const database = await getDb();

  try {
    const rows = await database.all<Array<{ job_id: string }>>(
      "SELECT job_id FROM job_config_snapshots ORDER BY captured_utc DESC LIMIT ?",
      [limit],
    );

    return rows.map((row: { job_id: string }) => row.job_id);
  } catch (error) {
    console.error("[ConfigSnapshot] Failed to get jobs with snapshots:", error);
    return [];
  }
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Get SR configuration summary for snapshot
 *
 * This maintains SR modularity by only capturing summary stats,
 * not the full SR config (per review Rec #22).
 *
 * @returns SR summary for snapshot
 */
export function getSRConfigSummary(srConfig: SourceReliabilityConfig): {
  enabled: boolean;
  defaultScore: number;
  confidenceThreshold: number;
} {
  return {
    enabled: srConfig.enabled,
    defaultScore: srConfig.defaultScore,
    confidenceThreshold: srConfig.confidenceThreshold,
  };
}

/**
 * Format snapshot for display in admin UI
 *
 * @param snapshot - Config snapshot
 * @returns Formatted string for display
 */
export function formatSnapshotForDisplay(snapshot: JobConfigSnapshot): string {
  const lines: string[] = [];

  lines.push(`# Config Snapshot for Job ${snapshot.jobId}`);
  lines.push("");
  lines.push(`**Captured**: ${snapshot.capturedUtc}`);
  lines.push(`**Analyzer Version**: ${snapshot.analyzerVersion}`);
  lines.push(`**Schema Version**: ${snapshot.schemaVersion}`);
  lines.push("");

  lines.push("## Pipeline Configuration");
  lines.push("```json");
  lines.push(JSON.stringify(snapshot.pipelineConfig, null, 2));
  lines.push("```");
  lines.push("");

  lines.push("## Search Configuration");
  lines.push("```json");
  lines.push(JSON.stringify(snapshot.searchConfig, null, 2));
  lines.push("```");
  lines.push("");

  lines.push("## Source Reliability Summary");
  lines.push(`- **Enabled**: ${snapshot.srEnabled}`);
  lines.push(`- **Default Score**: ${snapshot.srDefaultScore}`);
  lines.push(`- **Confidence Threshold**: ${snapshot.srConfidenceThreshold}`);

  return lines.join("\n");
}
