-- Migration: Add prompt tracking fields to Jobs table
-- Date: 2026-01-27
-- Purpose: External Prompt File System - track which prompt was used per analysis
--
-- Usage:
--   sqlite3 factharbor.db < 002_add_prompt_tracking.sql

-- Add PromptContentHash column (SHA-256 hash of prompt content used)
ALTER TABLE Jobs ADD COLUMN PromptContentHash TEXT;

-- Add PromptLoadedUtc column (when the prompt was loaded for this job)
ALTER TABLE Jobs ADD COLUMN PromptLoadedUtc TEXT;

-- Index for querying jobs by prompt version
CREATE INDEX IF NOT EXISTS IX_Jobs_PromptContentHash ON Jobs(PromptContentHash);

-- Verify columns were added
SELECT sql FROM sqlite_master WHERE type='table' AND name='Jobs';
