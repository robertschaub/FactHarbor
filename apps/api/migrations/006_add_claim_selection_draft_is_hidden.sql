-- Migration 006: Add IsHidden to ClaimSelectionDrafts table
-- Purpose: Allow admins to hide a claim-selection session before the final job exists.

ALTER TABLE ClaimSelectionDrafts
ADD COLUMN IsHidden INTEGER NOT NULL DEFAULT 0;
