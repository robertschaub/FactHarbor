-- Cleanup Obsolete Lexicon Configs
--
-- The evidence-lexicon and aggregation-lexicon config types are obsolete since v2.9.0
-- when the system moved to LLM-only text analysis (no heuristic fallback).
--
-- The patterns in lexicon-utils.ts now use empty defaults and ignore any lexicon config.
--
-- This script removes the orphaned records from the UCM database.
--
-- Run with: sqlite3 apps/api/factharbor.db < apps/web/scripts/cleanup-obsolete-lexicons.sql

-- Show what will be deleted (for verification)
SELECT 'Will delete from config_active:' AS info;
SELECT config_type, profile_key, active_hash FROM config_active
WHERE config_type IN ('evidence-lexicon', 'aggregation-lexicon');

SELECT 'Will delete from config_blobs:' AS info;
SELECT config_type, profile_key, content_hash, version_label FROM config_blobs
WHERE config_type IN ('evidence-lexicon', 'aggregation-lexicon');

-- Delete active config pointers first (foreign key safety)
DELETE FROM config_active
WHERE config_type IN ('evidence-lexicon', 'aggregation-lexicon');

-- Delete the blob records
DELETE FROM config_blobs
WHERE config_type IN ('evidence-lexicon', 'aggregation-lexicon');

-- Delete any usage records (if they exist)
DELETE FROM config_usage
WHERE config_type IN ('evidence-lexicon', 'aggregation-lexicon');

SELECT 'Cleanup complete. Verify with:' AS info;
SELECT 'SELECT config_type, COUNT(*) FROM config_active GROUP BY config_type;' AS query;
