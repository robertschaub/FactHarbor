-- Migration 005: Add LastEventMessage to ClaimSelectionDrafts table
-- Purpose: Persist the latest draft-preparation milestone for live ACS UX

ALTER TABLE ClaimSelectionDrafts ADD COLUMN LastEventMessage TEXT;
