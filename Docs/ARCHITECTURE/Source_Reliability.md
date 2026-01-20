# FactHarbor Source Reliability Bundle

## Current Status: OPTIONAL (disabled by default)

> **Note**: Source reliability scoring is **disabled by default** and only becomes active if you explicitly configure a local bundle via `FH_SOURCE_BUNDLE_PATH`.
>
> **Current implementation reality (v2.6.33)**:
> - **Local file only**: the code loads a bundle from `FH_SOURCE_BUNDLE_PATH` if present.
> - **No remote bundle fetch / integrity verification** is implemented yet.
>
> **POC stance**: Treat this as optional metadata. The primary driver remains evidence/counter-evidence, not authority.

---

## Overview

FactHarbor can use configurable source reliability scores to add context to sources during fact-checking. One possible data source is [Media Bias/Fact Check (MBFC)](https://mediabiasfactcheck.com), but the system is designed to accept user-supplied bundles (no hardcoded defaults).

## Design Principles

### Evidence Over Authority

**Important**: Source credibility is supplementary, not primary. The core principle is:

- **Only evidence and counter-evidence matter** - not who says it
- Authority or title (lawyer, government, expert) does NOT automatically give weight
- Source credibility provides context but doesn't override factual analysis
- A low-credibility source providing documented evidence should still be considered
- A high-credibility source making claims without evidence should be questioned

### Dynamic Credibility

Source credibility is not static:
- Organizations can gain or lose credibility over time
- Political changes can affect government source reliability
- Media outlets can change ownership, editorial standards, or bias
- The bundle should be updated regularly to reflect current assessments

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
| `FH_SOURCE_BUNDLE_PATH` | Path to source bundle JSON file | None (disabled) |
| `FH_SOURCE_BUNDLE_URLS` | Comma-separated URLs for dynamic fetch | None |
| `FH_SOURCE_BUNDLE_FETCH` | Enable/disable URL fetching | `false` |
| `FH_SOURCE_BUNDLE_SHA256` | SHA-256 checksum for integrity verification | None |
| `FH_SOURCE_BUNDLE_MAX_SOURCES` | Max sources to include per analysis | `6` |
| `FH_SOURCE_BUNDLE_EXCERPT_CHARS` | Max characters per source excerpt | `1200` |
| `RAPIDAPI_KEY` | RapidAPI key for MBFC loader script | None |

### .env.local Example (when enabled)

```bash
# Source bundle configuration (CURRENTLY DISABLED)
# Uncomment when reliable data source is available

# Path to local bundle file
FH_SOURCE_BUNDLE_PATH=./source-bundle.json

# Remote URLs for dynamic fetch (comma-separated, tried in order)
# FH_SOURCE_BUNDLE_URLS=https://example.com/mbfc.json

# Enable fetching from URLs (default: false)
# FH_SOURCE_BUNDLE_FETCH=true

# Optional: SHA-256 checksum for integrity verification
# FH_SOURCE_BUNDLE_SHA256=abc123...

# Optional: Limit sources per analysis
# FH_SOURCE_BUNDLE_MAX_SOURCES=6
# FH_SOURCE_BUNDLE_EXCERPT_CHARS=1200
```

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

## Source Code Reference

The source reliability feature is implemented in the following files:

### Types (`apps/web/src/lib/analyzer/types.ts`)

```typescript
// Source with reliability score
interface FetchedSource {
  id: string;
  url: string;
  title: string;
  trackRecordScore: number | null;  // Reliability score (0-1), null if unknown
  fullText: string;
  fetchedAt: string;
  category: string;
  fetchSuccess: boolean;
  searchQuery?: string;
}
```

### Core Functions (`apps/web/src/lib/analyzer/source-reliability.ts`)

| Function | Description |
|----------|-------------|
| `loadSourceBundle()` | Loads scores from `FH_SOURCE_BUNDLE_PATH` at startup |
| `getTrackRecordScore(url)` | Returns score for a URL (or `null` if unknown) |
| `applyEvidenceWeighting()` | Adjusts verdict confidence based on source scores |
| `calculateOverallCredibility()` | Returns average score and credibility level for an analysis |

### Bundle Loader (`apps/web/src/lib/mbfc-loader.ts`)

TypeScript types for the bundle format:

```typescript
interface SourceBundle {
  version: string;
  generated: string;
  sourceCount: number;
  provider: string;
  providerUrl: string;
  sources: Record<string, number>;      // domain -> score (0-1)
  metadata: Record<string, SourceMetadata>;
}

interface SourceMetadata {
  name: string;
  bias?: string;
  factual?: string;
  credibility?: string;
  category?: string;
  mbfcUrl?: string;
}
```

## Future Work

To enable this feature for production, the following needs to be resolved:

### 1. Reliable Data Source
- [ ] Evaluate MBFC RapidAPI for stability and update frequency
- [ ] Consider alternative sources (NewsGuard, Ad Fontes Media)
- [ ] Evaluate maintaining a curated FactHarbor-specific bundle

### 2. Integrity Verification
- [ ] Implement SHA-256 checksum verification for bundle files
- [ ] Add signature verification for remote bundles
- [ ] Version control for bundle updates

### 3. Dynamic Updates
- [ ] Scheduled refresh mechanism (monthly recommended)
- [ ] Change detection and logging
- [ ] Fallback handling if source becomes unavailable

### 4. UI Integration
- [ ] Show source credibility at claim level (not article level)
- [ ] Display credibility context without implying authority = truth
- [ ] Allow users to see why a source has a particular rating

## References

- [MBFC Methodology](https://mediabiasfactcheck.com/methodology/)
- [MBFC API on RapidAPI](https://rapidapi.com/mbfcnews/api/media-bias-fact-check-ratings-api2)
- [Wikipedia: Media Bias/Fact Check](https://en.wikipedia.org/wiki/Media_Bias/Fact_Check)
