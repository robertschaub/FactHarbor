# Test Directory

This directory contains all test files for the FactHarbor web application.

## Structure

```
test/
├── unit/                    # Unit tests (mirrors src/ structure)
│   ├── app/
│   │   ├── api/internal/    # API endpoint tests
│   │   └── jobs/[id]/       # Jobs page component tests
│   └── lib/
│       └── analyzer/        # Analyzer module tests
│           └── prompts/     # Prompt-related tests
├── config/                  # Test configuration files
│   └── llm-providers.json   # LLM provider test config
├── fixtures/                # Test fixture data
│   ├── neutrality-pairs.json
│   └── terminology-refactor-jobs.json
├── helpers/                 # Shared test utilities
│   ├── test-helpers.ts      # Common test utilities
│   └── test-cases.ts        # Shared test case data
├── scripts/                 # Test runner scripts
│   └── regression-test.js
├── output/                  # Test output (gitignored)
└── test-budget.ts           # Manual budget tracking test
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --run analyzer.test.ts

# Run tests matching pattern
npm test -- --run -t "normalization"

# Run LLM integration tests (requires API keys)
npm run test:llm

# Run job lifecycle tests (requires API running)
npm run test:jobs
```

## Path Aliases

Tests use path aliases defined in `vitest.config.ts`:

- `@/` - Maps to `src/` (source code)
- `@test/` - Maps to `test/` (test utilities)

Example:
```typescript
import { runFactHarborAnalysis } from "@/lib/analyzer";
import { loadEnvFile } from "@test/helpers/test-helpers";
```

## Test Categories

### Unit Tests (`test/unit/`)
Fast tests that don't require external services or API keys.

### Integration Tests
Tests that require LLM API keys or the .NET API running:
- `llm-integration.test.ts` - Multi-provider LLM tests
- `input-neutrality.test.ts` - Q/S neutrality tests
- `job-lifecycle.test.ts` - Full job flow tests

## Configuration

- **vitest.config.ts** - Vitest configuration
- **test/config/** - Runtime test configuration
- **.env.local** - API keys (not committed)
