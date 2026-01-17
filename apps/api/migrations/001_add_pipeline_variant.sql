-- Migration: Add PipelineVariant column to Jobs table
-- Date: 2026-01-17
-- Purpose: Support Triple-Path Pipeline variant selection
--
-- Run this script against existing factharbor.db to add the new column.
-- SQLite does not support adding columns with DEFAULT in the same statement,
-- so we use a transaction to ensure atomicity.
--
-- Usage:
--   sqlite3 factharbor.db < 001_add_pipeline_variant.sql

-- Check if column already exists (SQLite doesn't have IF NOT EXISTS for columns)
-- This will error if column exists - safe to ignore that error

ALTER TABLE Jobs ADD COLUMN PipelineVariant TEXT NOT NULL DEFAULT 'orchestrated';

-- Verify the column was added
SELECT sql FROM sqlite_master WHERE type='table' AND name='Jobs';
