# Text Analysis Prompts

LLM prompts for the Text Analysis Pipeline. These prompts are used when the corresponding feature flags are enabled (`FH_LLM_*`).

## Prompt Files

| File | Version | Description | Last Modified |
|------|---------|-------------|---------------|
| `text-analysis-input.prompt.md` | 1.0.0 | Input classification and claim decomposition | 2026-01-29 |
| `text-analysis-evidence.prompt.md` | 1.0.0 | Evidence quality assessment for filtering | 2026-01-29 |
| `text-analysis-scope.prompt.md` | 1.0.0 | Scope similarity and phase bucket analysis | 2026-01-29 |
| `text-analysis-verdict.prompt.md` | 1.1.0 | Verdict validation (inversion/harm/contestation) | 2026-01-30 |

## Database Content Hashes (Active)

As of 2026-01-30:

| Profile | Content Hash |
|---------|--------------|
| text-analysis-input | `5daeb5327b0a...` |
| text-analysis-evidence | `4fc7afb24c6e...` |
| text-analysis-scope | `94d867f24657...` |
| text-analysis-verdict | `5cf3ea03e472...` |

## Feature Flags

To enable LLM-based analysis for each point:

```bash
FH_LLM_INPUT_CLASSIFICATION=true   # Use LLM for input classification
FH_LLM_EVIDENCE_QUALITY=true       # Use LLM for evidence quality
FH_LLM_SCOPE_SIMILARITY=true       # Use LLM for scope similarity
FH_LLM_VERDICT_VALIDATION=true     # Use LLM for verdict validation
```

When disabled, the heuristic fallback is used instead (see `text-analysis-heuristic.ts`).

## Reseeding Prompts

To reload prompts from files into the database:

```bash
cd apps/web
npx tsx scripts/reseed-text-analysis-prompts.ts
```

## Promptfoo Testing

All text-analysis prompts have comprehensive promptfoo test coverage (v2.8.2):

```bash
# Run text-analysis tests only
npm run promptfoo:text-analysis

# Or from apps/web
cd apps/web
npx promptfoo eval -c promptfooconfig.text-analysis.yaml
```

### Test Coverage (26 test cases)

| Prompt | Test Cases | Key Assertions |
|--------|------------|----------------|
| `text-analysis-input` | 8 | Comparative, compound, claim types, complexity |
| `text-analysis-evidence` | 5 | Quality levels (high/medium/low/filter), expert attribution |
| `text-analysis-scope` | 5 | Similarity thresholds, phase buckets, merge recommendations |
| `text-analysis-verdict` | 8 | Inversion detection, harm potential, contestation |

### Test Configuration Files

```
apps/web/
├── promptfooconfig.text-analysis.yaml           # Test configuration
└── prompts/promptfoo/
    ├── text-analysis-input-prompt.txt           # Input classification template
    ├── text-analysis-evidence-prompt.txt        # Evidence quality template
    ├── text-analysis-scope-prompt.txt           # Scope similarity template
    └── text-analysis-verdict-prompt.txt         # Verdict validation template
```

See: [Promptfoo Testing Guide](../../../../Docs/USER_GUIDES/Promptfoo_Testing.md)

## Version History

### text-analysis-verdict.prompt.md

- **v1.1.0** (2026-01-30): Removed counter-claim detection to avoid overriding better detection from understand phase
- **v1.0.0** (2026-01-29): Initial version

### Other prompts

- **v1.0.0** (2026-01-29): Initial versions
