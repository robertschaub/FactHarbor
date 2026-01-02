# FactHarbor Source Reliability Bundle

FactHarbor uses configurable source reliability scores to assess the credibility of sources during fact-checking. These scores come from [Media Bias/Fact Check (MBFC)](https://mediabiasfactcheck.com), a scientifically validated media bias database.

## Quick Start

### Option 1: Use Sample Bundle (50 sources)

A sample bundle with 50 common sources is included:

```powershell
# Copy sample bundle to project root
copy source-bundle-sample.json source-bundle.json

# Add to .env.local
echo FH_SOURCE_BUNDLE_PATH=./source-bundle.json >> apps\web\.env.local
```

### Option 2: Full MBFC Database (9,500+ sources)

For comprehensive coverage, fetch the full MBFC database via RapidAPI:

```powershell
# 1. Get RapidAPI key from https://rapidapi.com/mbfcnews/api/media-bias-fact-check-ratings-api2

# 2. Set environment variable and run loader
set RAPIDAPI_KEY=your_key_here
npx ts-node apps\web\src\lib\mbfc-loader.ts ./source-bundle.json

# 3. Configure FactHarbor to use the bundle
echo FH_SOURCE_BUNDLE_PATH=./source-bundle.json >> apps\web\.env.local
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FH_SOURCE_BUNDLE_PATH` | Path to source bundle JSON file | None (no scores) |
| `RAPIDAPI_KEY` | RapidAPI key for MBFC loader | None |

### Score Interpretation

| Score Range | MBFC Rating | Interpretation |
|-------------|-------------|----------------|
| 0.90 - 0.99 | Very High | Wire services, fact-checkers (Reuters, AP, FactCheck.org) |
| 0.80 - 0.89 | High | Quality journalism (BBC, NPR, Economist) |
| 0.70 - 0.79 | Mostly Factual | Generally reliable with some issues |
| 0.50 - 0.69 | Mixed | Verify claims independently |
| 0.30 - 0.49 | Low | Unreliable, often misleading |
| 0.05 - 0.29 | Very Low | Conspiracy, fake news, pseudoscience |

## Bundle Format

The source bundle is a JSON file with this structure:

```json
{
  "version": "1.0.0",
  "generated": "2026-01-01T00:00:00.000Z",
  "sourceCount": 50,
  "provider": "Media Bias/Fact Check",
  "providerUrl": "https://mediabiasfactcheck.com",
  "sources": {
    "reuters.com": 0.95,
    "apnews.com": 0.95,
    "bbc.com": 0.85,
    "foxnews.com": 0.30
  },
  "metadata": {
    "reuters.com": {
      "name": "Reuters",
      "factual": "very high",
      "bias": "least biased"
    }
  }
}
```

## Why MBFC?

Media Bias/Fact Check was chosen because:

1. **Scientifically Validated**: Studies show "almost perfect" inter-rater reliability when compared to independent fact-checking datasets
2. **Comprehensive**: 9,500+ sources rated
3. **Transparent Methodology**: Clear criteria for bias and factual reporting ratings
4. **API Available**: Programmatic access via RapidAPI
5. **Regularly Updated**: Ratings are reviewed and updated

## Design Decisions

### No Hard-coded Defaults

FactHarbor does **not** include hard-coded source reliability scores. All scores must come from the configured bundle. This ensures:

- **Transparency**: All scoring is traceable to the bundle
- **Configurability**: Organizations can use their own ratings
- **No Hidden Bias**: No implicit assumptions about source reliability

### Sources Without Scores

If a source is not in the bundle, it returns `null` (unknown reliability). The analyzer will still use the source but won't apply a reliability weight.

## Updating the Bundle

To refresh the bundle with latest MBFC data:

```powershell
set RAPIDAPI_KEY=your_key_here
npx ts-node apps\web\src\lib\mbfc-loader.ts ./source-bundle.json
```

Consider scheduling this monthly to capture MBFC rating updates.

## References

- [MBFC Methodology](https://mediabiasfactcheck.com/methodology/)
- [MBFC API on RapidAPI](https://rapidapi.com/mbfcnews/api/media-bias-fact-check-ratings-api2)
- [Wikipedia: Media Bias/Fact Check](https://en.wikipedia.org/wiki/Media_Bias/Fact_Check)
