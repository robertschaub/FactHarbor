# Text Analysis Prompts

LLM prompts for the Text Analysis Pipeline. These prompts are used when the corresponding feature flags are enabled (`FH_LLM_*`).

## Prompt Files

| File | Version | Description | Last Modified |
|------|---------|-------------|---------------|
| `text-analysis-input.prompt.md` | 1.1.0 | Input classification and claim decomposition | 2026-01-30 |
| `text-analysis-evidence.prompt.md` | 1.2.0 | Evidence quality assessment for filtering | 2026-01-30 |
| `text-analysis-scope.prompt.md` | 1.3.0 | AnalysisContext similarity and phase bucket analysis | 2026-01-31 |
| `text-analysis-verdict.prompt.md` | 1.2.0 | Verdict validation (inversion/harm/contestation) | 2026-01-30 |

## Database Content Hashes (Active)

As of 2026-01-31:

| Profile | Content Hash |
|---------|--------------|
| text-analysis-input | `34309de4baf7...` |
| text-analysis-evidence | `5f1b551dd10d...` |
| text-analysis-scope | `76a16acb2dd9...` |
| text-analysis-verdict | `ea27d6d0f26b...` |

## Feature Flags

LLM-based analysis is **enabled by default** (v2.8.3+). To disable and use heuristics only:

```bash
FH_LLM_INPUT_CLASSIFICATION=false   # Disable LLM for input classification
FH_LLM_EVIDENCE_QUALITY=false       # Disable LLM for evidence quality
FH_LLM_SCOPE_SIMILARITY=false       # Disable LLM for scope similarity
FH_LLM_VERDICT_VALIDATION=false     # Disable LLM for verdict validation
```

When disabled, the heuristic fallback is used instead (see `text-analysis-heuristic.ts`).

## UCM Configuration (v2.9+)

As of v2.9, heuristic patterns referenced in these prompts are **configurable via UCM** (Unified Configuration Management). The patterns documented below are now stored in UCM lexicon configs rather than hardcoded in TypeScript.

**UCM Config Types:**
- `evidence-lexicon.v1`: Evidence filter patterns, quality gate patterns (vague phrases, citation patterns, opinion markers, etc.)
- `aggregation-lexicon.v1`: Aggregation patterns (harm keywords, contestation patterns, verdict correction patterns, counter-claim detection patterns)

**Default patterns are used when no UCM config is active.** To customize patterns:
1. Navigate to Admin → Configuration → UCM
2. Edit the relevant lexicon config (evidence-lexicon or aggregation-lexicon)
3. Modify patterns using UCM pattern syntax:
   - `re:<regex>` for regex patterns (e.g., `re:some (say|believe)`)
   - `<literal>` for literal string match (case-insensitive word boundary)

See [UCM Administrator Handbook](../../../../Docs/USER_GUIDES/UCM_Administrator_Handbook.md) for details.

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

### text-analysis-input.prompt.md

- **v1.1.0** (2026-01-30): Added specific claim type keywords from heuristic code
  - predictive: will, would, shall, going to, predict, forecast, expect
  - evaluative: best, worst, should, must, better, worse, good, bad, right, wrong
- **v1.0.0** (2026-01-29): Initial version

### text-analysis-evidence.prompt.md

- **v1.2.0** (2026-01-30): Added complete vague phrases list from evidence-filter.ts:73-87
  - Attribution without specifics: "some say/believe/argue/claim/think/suggest", "many people/experts/critics/scientists/researchers", "according to some"
  - Passive hedging: "it is said/believed/argued/thought/claimed", "purportedly", "supposedly"
  - Uncertainty markers: "opinions vary/differ", "the debate continues", "controversy exists", "it's unclear"
- **v1.1.0** (2026-01-30): Added specific thresholds and vague phrases from heuristic code
  - Vague phrases: "some say", "many believe", "it is said", "reportedly", "allegedly"
  - Statement minimum: 25 chars, Excerpt minimum: 20 chars
  - Statistics without numbers = filter
- **v1.0.0** (2026-01-29): Initial version

### text-analysis-scope.prompt.md

- **v1.3.0** (2026-01-31): Clarified AnalysisContext vs EvidenceScope terminology in scope similarity prompt

- **v1.2.0** (2026-01-30): Added phase bucket keyword patterns from heuristic code
  - production: manufactur*, production, factory, assembly, upstream, mining, extraction, refin*
  - usage: usage, use, operation, driving, consumption, downstream, running, operat*
- **v1.1.0** (2026-01-30): Aligned PRIMARY/SECONDARY keys with heuristic code (orchestrated.ts:861-876)
  - PRIMARY: court, institution, jurisdiction, methodology, definition, framework, boundaries
  - SECONDARY: geographic, timeframe, scale
- **v1.0.0** (2026-01-29): Initial version

### text-analysis-verdict.prompt.md

- **v1.2.0** (2026-01-30): Added detailed inversion patterns and extended evidence keywords
  - Inversion patterns from verdict-corrections.ts:41-134 (positive/negative claim patterns)
  - Extended documented evidence keywords from aggregation.ts:53
  - Scientific/methodological terms: control group, peer-review, meta-analysis, confound, bias
  - Pharmacovigilance terms: adverse event, safety signal, VAERS, passive surveillance
  - Extended causal claim patterns and methodology criticism keywords
- **v1.1.0** (2026-01-30): Removed counter-claim detection to avoid overriding better detection from understand phase
- **v1.0.0** (2026-01-29): Initial version
