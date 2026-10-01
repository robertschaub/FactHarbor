# Promptfoo Testing Guide for FactHarbor

This guide explains how to use <a href="https://promptfoo.dev" rel="noopener" target="_blank">Promptfoo</a> to test and evaluate FactHarbor's LLM prompts.

## Overview

Promptfoo is an open-source tool for testing LLM prompts. We use it to:

-   **Compare providers** - Test the same prompt across Claude, GPT-4o, etc.
-   **Validate behavior** - Ensure prompts produce correct outputs (score caps, ratings, etc.)
-   **Catch regressions** - Detect when prompt changes break expected behavior
-   **Optimize costs** - Compare quality vs. cost across different models

## Installation

Promptfoo is already installed as a dev dependency. If you need to reinstall:

```
cd apps/web
npm install promptfoo --save-dev
```

## Prerequisites

1.  **API Keys** - You need valid API keys in `apps/web/.env.local`:

```
# Copy from example if needed
cp apps/web/.env.example apps/web/.env.local

# Edit and add your keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

1.  **Verify setup**:

```
npm run promptfoo:list
```

You should see available test configurations.

## Running Tests

### From Repository Root

```
# Run source reliability tests (default)
npm run promptfoo:sr

# Run verdict generation tests
npm run promptfoo:verdict

# Run all prompt tests
npm run promptfoo:all

# List available test configs
npm run promptfoo:list

# View results in browser
npm run promptfoo:view
```

### Using the Script Directly

```
node scripts/promptfoo-sr.js sr          # Source reliability
node scripts/promptfoo-sr.js verdict     # Verdict generation
node scripts/promptfoo-sr.js all         # All tests
node scripts/promptfoo-sr.js --list      # List configs
node scripts/promptfoo-sr.js sr --view   # Run then open viewer
```

<span id="from-apps-web-directory"></span>

### From apps/web Directory

```
cd apps/web
npm run promptfoo:sr
npm run promptfoo:view
```

## Available Test Configurations

| Config | Command | Description | Test Cases |
|----|----|----|----|
| `sr` | `npm run promptfoo:sr` | Source Reliability evaluation prompts | 7 |
| `verdict` | `npm run promptfoo:verdict` | Verdict generation prompts | 5 |
| `text-analysis` | `npm run promptfoo:text-analysis` | LLM Text Analysis Pipeline prompts (v2.9) | 26 |

**Total Test Coverage**: 38 test cases across 6 prompts

## Understanding Results

### Terminal Output

After running tests, you'll see a table showing:

-   **Vars** - Input variables for each test case
-   **Provider outputs** - What each model returned
-   **Pass/Fail** - Whether assertions passed

### Web Viewer

Run `npm run promptfoo:view` to open an interactive dashboard showing:

-   Test results by provider
-   Pass rates and metrics
-   Full model outputs
-   Cost breakdown

### Results Files

Raw results are saved to `apps/web/prompts/promptfoo-results/`:

```
prompts/promptfoo-results/
├── source-reliability.json   # Source reliability test results
├── verdict.json              # Verdict generation test results
└── text-analysis.json        # Text analysis pipeline test results
```

## Test Configuration Files

### Location

```
apps/web/
├── promptfooconfig.yaml                      # Verdict tests
├── promptfooconfig.source-reliability.yaml   # Source reliability tests
├── promptfooconfig.text-analysis.yaml        # Text analysis pipeline tests (26 cases)
└── prompts/promptfoo/
    ├── verdict-prompt.txt
    ├── source-reliability-prompt.txt
    ├── text-analysis-input-prompt.txt        # Input classification tests
    ├── text-analysis-evidence-prompt.txt     # Evidence quality tests
    ├── text-analysis-context-prompt.txt      # Context similarity tests
    └── text-analysis-verdict-prompt.txt      # Verdict validation tests
```

### Config Structure

```
description: "Test description"

# Prompt template file
prompts:
  - file://prompts/promptfoo/my-prompt.txt

# LLM providers to test
providers:
  - id: anthropic:claude-3-5-haiku-20241022
    label: Claude Haiku
    config:
      temperature: 0

  - id: openai:gpt-4o
    label: GPT-4o
    config:
      temperature: 0

# Test cases
tests:
  - description: "Test case description"
    vars:
      domain: "example.com"
      currentDate: "2026-01-25"
      evidencePack: |
        [E1] Evidence item 1
        [E2] Evidence item 2
    assert:
      - type: is-json
      - type: javascript
        value: |
          const data = JSON.parse(output);
          return data.score >= 0.5;
        metric: score_check
```

## Adding New Test Cases

Edit the relevant config file and add a new test under `tests:`:

```
tests:
  # ... existing tests ...

  - description: "My new test case"
    vars:
      domain: "new-source.example"
      currentDate: "2026-01-25"
      evidencePack: |
        [E1] First evidence item
        [E2] Second evidence item
    assert:
      - type: is-json
      - type: javascript
        value: |
          const data = JSON.parse(output);
          return data.score !== null && data.score >= 0.72;
        metric: expected_reliable
```

### Assertion Types

| Type         | Description                     |
|--------------|---------------------------------|
| `is-json`    | Output must be valid JSON       |
| `contains`   | Output contains a string        |
| `javascript` | Custom JS function returns true |

### JavaScript Assertions

```
- type: javascript
  value: |
    const data = JSON.parse(output);
    // Your validation logic
    return data.score >= 0.5 && data.score <= 1.0;
  metric: my_metric_name  # Shows in results
```

## Adding New Prompt Configurations

### 1. Create the prompt template

```
# Create new prompt file
apps/web/prompts/promptfoo/my-new-prompt.txt
```

### 2. Create the config file

```
# Create new config
apps/web/promptfooconfig.my-feature.yaml
```

### 3. Register in the script

Edit `scripts/promptfoo-sr.js` and add to `CONFIGS`:

```
const CONFIGS = {
  'sr': { ... },
  'verdict': { ... },
  'myfeature': {
    name: 'My Feature',
    file: 'promptfooconfig.my-feature.yaml',
    description: 'Tests my feature prompts'
  }
};
```

### 4. Add npm script (optional)

Edit root `package.json`:

```
{
  "scripts": {
    "promptfoo:myfeature": "node scripts/promptfoo-sr.js myfeature"
  }
}
```

## Source Reliability Test Cases

The source reliability tests (`promptfooconfig.source-reliability.yaml`) validate:

| Test | What It Checks |
|----|----|
| Reliable Wire Service | Score 0.72-1.0, rating `reliable`/`highly_reliable` |
| Unreliable Source | Score \<=0.42, rating in unreliable category |
| State-Controlled Media | `sourceType` = `state_controlled_media`, score \<=0.42 |
| Propaganda Outlet | `sourceType` = `propaganda_outlet`, score \<=0.14 |
| Insufficient Data | `score` = null, `factualRating` = `insufficient_data` |
| Biased but Reliable | Bias noted but score \>=0.58 (not penalized) |
| Evidence Citation | All claims cite evidence IDs (E1, E2, etc.) |

## Text Analysis Pipeline Test Cases

The text analysis tests (`promptfooconfig.text-analysis.yaml`) validate the LLM Text Analysis Pipeline (v2.9) across four analysis points:

### Input Classification Tests (8 cases)

| Test | What It Checks |
|----|----|
| Simple Factual Claim | `isComparative=false`, `isCompound=false`, `claimType=factual`, `complexity=simple` |
| Comparative Claim | `isComparative=true` - detects "more efficient than" pattern |
| Compound (semicolon) | `isCompound=true`, multiple `decomposedClaims` |
| Compound (and) | Splits independent predicates joined by "and" |
| Non-compound (and) | Single predicate with multiple subjects NOT split |
| Evaluative Claim | `claimType=evaluative` for opinions/judgments |
| Predictive Claim | `claimType=predictive` for future predictions |
| Complex Claim | `complexity=complex` for multi-context claims |

### Evidence Quality Tests (5 cases)

| Test | What It Checks |
|----|----|
| High Quality Stats | Specific numbers, sources → `qualityAssessment=high` |
| Vague Attribution | "Some say", "many believe" → `qualityAssessment=low/filter` |
| Medium Quality | Partial criteria met → `qualityAssessment=medium` |
| Irrelevant Evidence | Off-topic evidence → `qualityAssessment=filter` |
| Expert Quote Check | Named expert + credentials → `high`; anonymous → `low/filter` |

### Context Similarity Tests (5 cases)

| Test | What It Checks |
|----|----|
| Duplicate Contexts | Same entity → `similarity>=0.85`, `shouldMerge=true` |
| Different Jurisdictions | US vs EU → `similarity<0.85`, `shouldMerge=false` |
| Production Phase | Manufacturing contexts → `phaseBucket=production` |
| Usage Phase | Operating contexts → `phaseBucket=usage` |
| Mixed Phases | Production vs Usage → different phase buckets, no merge |

### Verdict Validation Tests (8 cases)

| Test | What It Checks |
|----|----|
| Inversion Detection | Reasoning contradicts verdict → `isInverted=true`, correction suggested |
| Non-Inverted | Reasoning matches verdict → `isInverted=false` |
| High Harm (death) | Death/injury keywords → `harmPotential=high` |
| Medium Harm | Standard claims → `harmPotential=medium` |
| Contested (evidence) | Documented counter-evidence → `isContested=true`, `factualBasis=established/disputed` |
| Opinion Only | Political criticism → `factualBasis=opinion` or `isContested=false` |
| Causal Contestation | Methodology criticism on causal claim → `factualBasis=established` |
| Fraud High Harm | Fraud accusations → `harmPotential=high` |

### Configuration Note

Text analysis is **LLM-only** and no longer uses per-point env feature flags or heuristic fallback. Prompt tests always target the LLM text-analysis prompts configured in Unified Config Management.

## Troubleshooting

### "API key not set"

Ensure your `.env.local` has valid API keys:

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

### "Config file not found"

Run from the repository root, not from `apps/web`:

```
cd /path/to/FactHarbor
npm run promptfoo:sr
```

### JSON Parse Errors

If models wrap output in markdown code blocks, the config includes a transform to strip them. If you still see errors, check the prompt instructs "no markdown".

### Tests Failing on Confidence

The confidence calculation is mechanistic. If tests fail on confidence:

1.  Check `independentAssessmentsCount` in evidence
2.  Verify evidence is marked as recent
3.  Consider lowering the threshold in assertions

## Cost Considerations

Typical costs per 100 source reliability evaluations:

| Provider                   | Cost/100 calls |
|----------------------------|----------------|
| Claude Haiku + GPT-4o      | ~\$0.96        |
| Claude Haiku + GPT-4o-mini | ~\$0.32        |
| Claude Haiku only          | ~\$0.28        |

Set SR config `openaiModel` in UCM (Admin → Config → Source Reliability) to switch between `gpt-4o` (quality) and `gpt-4o-mini` (cost savings).

## Best Practices

1.  **Run before merging** - Run `npm run promptfoo:all` before merging prompt changes
2.  **Add regression tests** - When fixing a bug, add a test case that would have caught it
3.  **Use descriptive metrics** - Name your assertion metrics clearly (e.g., `score_capped_correctly`)
4.  **Keep evidence realistic** - Use evidence that mirrors real fact-checker outputs
5.  **Avoid hardcoded dates** - Use relative terms like "last 6 months" instead of "2025"

## Further Reading

-   <a href="https://promptfoo.dev/docs/intro" rel="noopener" target="_blank">Promptfoo Documentation</a>
-   <a href="https://promptfoo.dev/docs/configuration/expected-outputs" rel="noopener" target="_blank">Assertion Reference</a>
-   <a href="https://promptfoo.dev/docs/providers" rel="noopener" target="_blank">Provider Configuration</a>
