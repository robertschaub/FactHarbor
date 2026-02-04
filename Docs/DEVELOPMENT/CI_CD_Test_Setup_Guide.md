# CI/CD Test Setup Guide

**Purpose**: Configure continuous integration for FactHarbor pipeline regression tests
**Date**: 2026-01-16
**Target**: GitHub Actions / GitLab CI / Other CI providers

---

## Overview

The Pipeline Redesign regression tests require:
- LLM API access (OpenAI, Anthropic, or Google)
- ~40-60 minutes for full suite
- Test result artifacts for debugging

This guide covers CI/CD setup for automated test execution.

---

## GitHub Actions Setup (Recommended)

### 1. Create Workflow File

**File**: `.github/workflows/pipeline-tests.yml`

```yaml
name: Pipeline Regression Tests

on:
  # Run on main branch commits
  push:
    branches: [main]
  # Run on PRs to main
  pull_request:
    branches: [main]
  # Manual trigger
  workflow_dispatch:
  # Nightly runs
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily

jobs:
  unit-tests:
    name: Unit Tests (Fast)
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: apps/web

      - name: Run unit tests
        run: npm test -- --run normalization-contract
        working-directory: apps/web

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: unit-test-results
          path: apps/web/test/output/

  integration-tests-fast:
    name: Integration Tests (Single Pair)
    runs-on: ubuntu-latest
    timeout-minutes: 10
    # Only on main branch or manual trigger (save API costs)
    if: github.ref == 'refs/heads/main' || github.event_name == 'workflow_dispatch'

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: apps/web

      - name: Run single integration test
        env:
          FH_DETERMINISTIC: 'true'
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GOOGLE_GENERATIVE_AI_API_KEY: ${{ secrets.GOOGLE_GENERATIVE_AI_API_KEY }}
        run: npm test -- --run -t "court-judgment"
        working-directory: apps/web

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-results-fast
          path: apps/web/test/output/

  integration-tests-full:
    name: Integration Tests (Full Suite)
    runs-on: ubuntu-latest
    timeout-minutes: 90
    # Only on schedule (nightly) or manual trigger
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: apps/web

      - name: Run full regression suite
        env:
          FH_DETERMINISTIC: 'true'
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GOOGLE_GENERATIVE_AI_API_KEY: ${{ secrets.GOOGLE_GENERATIVE_AI_API_KEY }}
        run: npm test -- --run
        working-directory: apps/web

      - name: Parse test results
        if: always()
        run: |
          echo "## Test Results" >> $GITHUB_STEP_SUMMARY
          if [ -f apps/web/test/output/neutrality/aggregate-results.json ]; then
            echo "### Input Neutrality" >> $GITHUB_STEP_SUMMARY
            cat apps/web/test/output/neutrality/aggregate-results.json | jq -r '"- Average divergence: \(.avgDivergence) points\n- p95 divergence: \(.p95Divergence) points\n- Pairs completed: \(.pairsCompleted)/\(.pairsTotal)"' >> $GITHUB_STEP_SUMMARY
          fi

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-test-results-full
          path: apps/web/test/output/
          retention-days: 30

      - name: Comment PR with results
        if: github.event_name == 'pull_request' && always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const path = 'apps/web/test/output/neutrality/aggregate-results.json';
            if (fs.existsSync(path)) {
              const results = JSON.parse(fs.readFileSync(path, 'utf8'));
              const comment = `## Pipeline Regression Tests

              - Average Q/S divergence: ${results.avgDivergence.toFixed(2)} points (target: ≤4)
              - p95 divergence: ${results.p95Divergence.toFixed(2)} points
              - Tests completed: ${results.pairsCompleted}/${results.pairsTotal}
              - Status: ${results.passed ? '✅ PASSED' : '❌ FAILED'}

              [Full results artifact](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID})`;

              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: comment
              });
            }
```

### 2. Configure Secrets

In GitHub repository settings → Secrets and variables → Actions:

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...
```

### 3. Branch Protection Rules (Optional)

Settings → Branches → Add rule for `main`:
- ✅ Require status checks to pass
- Select: "Unit Tests (Fast)"
- ⚠️ Don't require full integration tests (too slow/expensive)

---

## GitLab CI Setup

### 1. Create Pipeline File

**File**: `.gitlab-ci.yml`

```yaml
stages:
  - test-unit
  - test-integration-fast
  - test-integration-full

variables:
  FH_DETERMINISTIC: 'true'

unit-tests:
  stage: test-unit
  image: node:20
  cache:
    paths:
      - node_modules/
      - apps/web/node_modules/
  script:
    - cd apps/web
    - npm ci
    - npm test -- --run normalization-contract
  artifacts:
    when: always
    paths:
      - apps/web/test/output/
    expire_in: 7 days
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

integration-tests-fast:
  stage: test-integration-fast
  image: node:20
  timeout: 10m
  cache:
    paths:
      - node_modules/
      - apps/web/node_modules/
  script:
    - cd apps/web
    - npm ci
    - npm test -- --run -t "court-judgment"
  artifacts:
    when: always
    paths:
      - apps/web/test/output/
    expire_in: 7 days
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

integration-tests-full:
  stage: test-integration-full
  image: node:20
  timeout: 90m
  cache:
    paths:
      - node_modules/
      - apps/web/node_modules/
  script:
    - cd apps/web
    - npm ci
    - npm test -- --run
  artifacts:
    when: always
    paths:
      - apps/web/test/output/
    reports:
      junit: apps/web/test/output/junit.xml
    expire_in: 30 days
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
    - if: $CI_PIPELINE_SOURCE == "web"
```

### 2. Configure Variables

Settings → CI/CD → Variables:
```
OPENAI_API_KEY (masked, protected)
ANTHROPIC_API_KEY (masked, protected)
GOOGLE_GENERATIVE_AI_API_KEY (masked, protected)
```

### 3. Schedule Pipeline

CI/CD → Schedules → New schedule:
- Description: "Nightly regression tests"
- Interval pattern: `0 2 * * *`
- Target branch: `main`

---

## Cost Management

### API Cost Estimates

**Single test pair** (~2 LLM calls):
- OpenAI gpt-4o-mini: ~$0.01
- Anthropic Claude Haiku: ~$0.01
- Google Gemini Flash: ~$0.005

**Full suite** (~20-30 LLM calls):
- Per run: ~$0.10 - $0.30
- Daily (nightly): ~$3 - $9/month
- Per PR (fast test): ~$0.01

### Cost Reduction Strategies

1. **Tiered Testing**
   ```yaml
   # PRs: Unit tests only (free)
   # Main commits: Fast integration (1 test, ~$0.01)
   # Nightly: Full suite (~$0.30)
   ```

2. **Use Cheaper Models**
   ```bash
   # In CI pipeline config (UCM)
   modelUnderstand=gpt-4o-mini
   modelExtractEvidence=gpt-4o-mini
   ```

3. **Parallel Execution Limits**
   ```yaml
   # Limit concurrent test jobs
   concurrency:
     group: integration-tests
     cancel-in-progress: false
   ```

4. **Skip on Draft PRs**
   ```yaml
   if: github.event.pull_request.draft == false
   ```

---

## Test Result Analysis

### Automated Metrics Collection

Add to workflow:
```yaml
- name: Extract metrics
  run: |
    mkdir -p metrics
    jq -r '{
      timestamp: .timestamp,
      avgDivergence: .avgDivergence,
      p95Divergence: .p95Divergence,
      passed: .passed
    }' apps/web/test/output/neutrality/aggregate-results.json \
      > metrics/neutrality-${{ github.run_id }}.json

- name: Upload metrics
  uses: actions/upload-artifact@v4
  with:
    name: metrics
    path: metrics/
```

### Trend Tracking

Use GitHub Actions + Grafana/DataDog:
```yaml
- name: Push metrics to monitoring
  run: |
    curl -X POST https://monitoring.example.com/api/metrics \
      -H "Authorization: Bearer ${{ secrets.MONITORING_TOKEN }}" \
      -d @metrics/neutrality-${{ github.run_id }}.json
```

---

## Troubleshooting

### Issue: Tests Timeout

**Solution**: Increase timeout or reduce test scope
```yaml
timeout-minutes: 120  # Increase from 90
```

### Issue: API Rate Limits

**Solution**: Add retry logic
```bash
npm test -- --run --retry=2
```

### Issue: Flaky Tests

**Solution**: Run multiple times and average
```yaml
- name: Run tests (3 attempts)
  run: |
    for i in 1 2 3; do
      npm test -- --run -t "court-judgment" || true
    done
```

### Issue: High Costs

**Solution**: Implement budget controls
```yaml
- name: Check budget
  run: |
    if [ $(date +%d) -gt 15 ]; then
      echo "Budget exhausted for this month"
      exit 0
    fi
```

---

## Local Development Workflow

### Pre-Commit Hook

**File**: `.git/hooks/pre-commit`
```bash
#!/bin/bash
# Run unit tests before commit
cd apps/web
npm test -- --run normalization-contract

if [ $? -ne 0 ]; then
  echo "❌ Unit tests failed. Commit aborted."
  exit 1
fi
```

### Pre-Push Hook

**File**: `.git/hooks/pre-push`
```bash
#!/bin/bash
# Run fast integration test before push
cd apps/web
npm test -- --run -t "court-judgment"

if [ $? -ne 0 ]; then
  echo "❌ Integration test failed. Push aborted."
  echo "Run 'npm test -- --run' for full details"
  exit 1
fi
```

---

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use fresh environment per test
- Clean up test artifacts

### 2. Deterministic Execution
- Always set `FH_DETERMINISTIC=true` in CI
- Use fixed random seeds where applicable
- Pin LLM model versions

### 3. Failure Investigation
- Upload test output as artifacts
- Include logs in failure reports
- Add GitHub issue links in failures

### 4. Performance Monitoring
- Track test duration trends
- Alert on >20% latency increase
- Monitor API costs weekly

### 5. Security
- Never log API keys
- Use masked variables
- Rotate keys quarterly

---

## Example: Complete GitHub Actions Workflow

See `.github/workflows/pipeline-tests.yml` above for a production-ready example that includes:
- ✅ Unit tests on every PR
- ✅ Fast integration on main commits
- ✅ Full suite nightly
- ✅ Cost optimization (tiered execution)
- ✅ Artifact upload
- ✅ PR comments with results
- ✅ Metrics extraction

---

## Next Steps

1. Create `.github/workflows/pipeline-tests.yml`
2. Add API keys to GitHub Secrets
3. Push changes and verify workflow runs
4. Monitor first nightly run
5. Adjust timeouts/budgets as needed
6. Set up metrics dashboard (optional)

---

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [Vitest CI Integration](https://vitest.dev/guide/ci.html)
- Pipeline Redesign history: `Docs/DEVELOPMENT/Pipeline_Redesign_History.md`
