# Test Directory

This directory contains all test files for the FactHarbor web application.

## Structure

```
test/
├── unit/                    # Unit tests (mirrors src/ structure)
│   ├── app/
│   │   ├── api/             # API route tests (admin, internal)
│   │   └── jobs/[id]/       # Jobs page component tests
│   ├── components/          # UI component tests
│   └── lib/
│       ├── analyzer/        # Analyzer module tests
│       └── source-reliability/
├── integration/             # Multi-stage tests with mocked LLM calls
├── calibration/             # Framing-symmetry calibration (real LLM calls)
├── fixtures/                # Test fixture data
│   ├── analysis-quality/
│   ├── framing-symmetry-pairs.json
│   └── terminology-refactor-jobs.json
├── helpers/                 # Shared test utilities
│   └── test-helpers.ts      # Common test utilities
└── output/                  # Test output (gitignored)
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --run analyzer.test.ts

# Run tests matching pattern
npm test -- --run -t "normalization"
```

## Path Aliases

Tests use path aliases defined in `vitest.config.ts`:

- `@/` - Maps to `src/` (source code)
- `@test/` - Maps to `test/` (test utilities)

Example:
```typescript
import { buildClaimBoundaryResultJson } from "@/lib/analyzer/claimboundary-pipeline";
import { loadEnvFile } from "@test/helpers/test-helpers";
```

## Test Categories

### Unit and Integration Tests (`test/unit/`, `test/integration/`)
Fast tests that don't require external services or API keys.

### Calibration (`test/calibration/`)
The framing-symmetry lane runs full analyses with real LLM calls. `vitest.config.ts` excludes it from `npm test`; run it only with `npm run test:calibration:*` and explicit approval (see `Docs/STATUS/Calibration_Run_Policy.md`).

## Configuration

- **vitest.config.ts** - Vitest configuration
- **.env.local** - API keys (not committed)
