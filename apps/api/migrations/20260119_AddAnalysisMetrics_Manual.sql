-- FactHarbor Database Migration: Add AnalysisMetrics Table
-- Date: 2026-01-19
-- Run this script manually if dotnet-ef is not available

-- Create AnalysisMetrics table
CREATE TABLE IF NOT EXISTS AnalysisMetrics (
    Id TEXT PRIMARY KEY NOT NULL,
    JobId TEXT NOT NULL,
    MetricsJson TEXT NOT NULL,
    CreatedUtc TEXT NOT NULL,
    FOREIGN KEY (JobId) REFERENCES Jobs(JobId) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS IX_AnalysisMetrics_JobId ON AnalysisMetrics(JobId);
CREATE INDEX IF NOT EXISTS IX_AnalysisMetrics_CreatedUtc ON AnalysisMetrics(CreatedUtc);

-- Verify table was created
SELECT name FROM sqlite_master WHERE type='table' AND name='AnalysisMetrics';
