-- Migration 004: Add VerdictLabel and TruthPercentage to Jobs table
-- Purpose: Support fast display of analysis results in job lists

-- Add VerdictLabel column (Nullable)
ALTER TABLE Jobs ADD COLUMN VerdictLabel TEXT;

-- Add TruthPercentage column (Nullable)
ALTER TABLE Jobs ADD COLUMN TruthPercentage INTEGER;
