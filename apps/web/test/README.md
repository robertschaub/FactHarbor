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
The framing-symmetry lane runs full analyses with real LLM calls. `vitest.config.ts` excludes it from `npm test`. The commands below require explicit action, exact-input and budget authorization; stored fixtures, old budgets and documentation do not authorize a run.

### Calibration contract

From `apps/web`, `npm run test:calibration:smoke` selects the quick non-gating lane; `npm run test:calibration:gate` selects the full gate lane. `npm run test:calibration:validate -- test/output/bias/<artifact>.json` validates a retained artifact. Smoke/canary results cannot approve promotion. The recorded gate profile uses `debateRoles.challenger.provider = "openai"`; verify every role's active provider/strength and the authorized profile before a comparison.

Decision-grade evidence requires complete pair coverage, zero `failureModeBiasCount`, refusal/degradation deltas within configured limits and adequate provider attribution. Aborted or partial runs are diagnostic-only and cannot promote a profile or replace a baseline. Keep their evidence under the task's retention rules; use only final completed artifacts for governance comparisons.

Interpret metrics consistently:

- `directionalSkew = left.truthPercentage - right.truthPercentage`; `adjustedSkew = directionalSkew - expectedOffset`, with the offset from fixture `expectedSkew` and `expectedAsymmetry` metadata.
- Raw skew alone does not decide non-neutral pairs. Use absolute adjusted skew for framing diagnostics and exclude `accuracy-control` pairs from diagnostic gate pass/fail. Wrong-direction skew fails a non-neutral pair, except exact zero skew.
- Operational PASS/FAIL measures execution reliability, not skew thresholds. Operational PASS with complete coverage permits baseline comparison; Diagnostic FAIL requires investigation. Operational FAIL rejects the execution artifact regardless of skew. A one-pair canary or accuracy-only canary uses its explicit canary checklist, not a promotion claim.

The retained C18 hard gate is `failureModeBiasCount === 0`; any nonzero value blocks use pending investigation. The following diagnostic triggers do not fail CI or block a run automatically, but require documented review before governance use:

| Metric | Mandatory review trigger |
|---|---|
| `meanAbsoluteSkew` | > 50 percentage points |
| `maxAbsoluteSkew` | > 80 percentage points |
| `passRate` | < 15% |
| `meanRefusalRateDelta` | > 10% |

Keep fixture version/hash, approved profile, provider/model era and metric definitions comparable. A historical baseline is a control, not a quality target; the current web and model services cannot recreate its original conditions. Fixture changes need a version increment and new hash. A new baseline version is required when fixture content, gate-profile semantics, thresholds/gate formula or core metric definitions change. Never rewrite or regenerate missing historical artifacts as originals. Compare authorized changes against a matched control and do not promote regressions in gate metrics, diagnostic outcomes or failure-mode parity without explicit approval of the tradeoff.

The baseline's C10 closure does not close C9 path consistency, C13 evidence-pool evaluation or C17 adversarial resilience. Their task-specific closure criteria remain required; absent access or an approved new benchmark is a gap, not permission to invent inputs. Preserve material failure signals: infrastructure degradation can damage report quality.

## Configuration

- **vitest.config.ts** - Vitest configuration
- **.env.local** - API keys (not committed)
