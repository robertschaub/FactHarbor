-- Migration: Add job_config_snapshots table for full config auditability
-- Date: 2026-01-30
-- Purpose: UCM v2.9.0 Phase 2 - Store complete resolved config (DB + env overrides) per job
--
-- Usage:
--   sqlite3 factharbor.db < 003_add_job_config_snapshots.sql

-- Create job_config_snapshots table
CREATE TABLE IF NOT EXISTS job_config_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL UNIQUE,
  schema_version TEXT NOT NULL,           -- e.g., "1.0"

  -- Full resolved configs (JSON blobs after env override resolution)
  pipeline_config TEXT NOT NULL,          -- PipelineConfig JSON
  search_config TEXT NOT NULL,            -- SearchConfig JSON

  -- SR summary (not full config - maintains SR modularity)
  sr_enabled BOOLEAN NOT NULL,
  sr_default_score REAL NOT NULL,
  sr_confidence_threshold REAL NOT NULL,

  -- Metadata
  captured_utc TEXT NOT NULL,
  analyzer_version TEXT NOT NULL          -- e.g., "2.9.0"
);

-- Index for querying snapshots by job_id
CREATE INDEX IF NOT EXISTS idx_job_config_snapshots_job
  ON job_config_snapshots(job_id);

-- Verify table was created
SELECT sql FROM sqlite_master WHERE type='table' AND name='job_config_snapshots';
