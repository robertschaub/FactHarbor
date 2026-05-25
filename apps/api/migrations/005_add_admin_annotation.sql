-- Migration 005: Add AdminAnnotation to Jobs table
-- Purpose: Support admin-only job annotations shown in job detail and overview pages.

ALTER TABLE Jobs ADD COLUMN AdminAnnotation TEXT;
