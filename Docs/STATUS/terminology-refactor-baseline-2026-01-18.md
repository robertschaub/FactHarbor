# Terminology Refactor Baseline Metrics (2026-01-18)

## Baseline metrics
- Jobs count: 1022
- DB size (bytes): 97697792

## Test dataset
- File: `apps/web/test-fixtures/terminology-refactor-jobs.json`
- Count: 10 inputs

## Parallel test instance (optional)
- API + Web (custom ports):
  - `.\scripts\restart-clean.ps1 -ApiUrls "https://localhost:5003;http://localhost:5002" -WebPort 3001 -ApiDbPath ".\apps\api\factharbor-test.db" -RunnerBaseUrl "http://localhost:3001" -ApiBaseUrl "http://localhost:5002"`

## Dry-run migration (test DB)
- Command: `$env:DB_PATH="apps/api/factharbor-test.db"; npx ts-node apps/api/scripts/migrate-terminology-v2.7.ts`
- Result: Migrated 862, skipped 30, errors 0 (of 892 non-null ResultJson rows)
- Validation counts:
  - `oldFields`: 0
  - `newFields`: 862
  - `nonNull`: 892
