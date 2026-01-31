# Unified Config Management (UCM) User Guide

**Version**: 2.10.0
**Date**: 2026-01-31
**Audience**: Administrators, Power Users
**Related**: [Evidence Quality Filtering](../ARCHITECTURE/Evidence_Quality_Filtering.md), [Provider Prompt Formatting](../REFERENCE/Provider_Prompt_Formatting.md)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Configuration Profiles](#2-configuration-profiles)
3. [Profile Management](#3-profile-management)
4. [Configuration Types](#4-configuration-types)
5. [Common Use Cases](#5-common-use-cases)
6. [Troubleshooting](#6-troubleshooting)
7. [New in v2.10: Admin Tools](#7-new-in-v210-admin-tools)

---

## 1. Introduction

### What is UCM?

**Unified Config Management (UCM)** is FactHarbor's system for managing analysis configurations through **reusable profiles**. Instead of tweaking settings every time you run an analysis, create named profiles for different scenarios.

### Why Use UCM?

**Without UCM**:
- Manually set search parameters, prompt templates, and calculation thresholds for each analysis
- Inconsistent settings across analyses
- No way to share configurations with team members

**With UCM**:
- ✅ Save configurations as named profiles ("High-Stakes Fact-Checking", "Exploratory Research")
- ✅ Switch between profiles with one click
- ✅ Import/export profiles for team sharing
- ✅ Version control for configuration changes
- ✅ Rollback to previous configurations easily

### Key Concepts

**Profile**: A named set of configurations (search settings + prompts + calculation parameters)

**Configuration Types**:
- **SearchConfig** - Web search behavior (provider, max results, timeouts)
- **PromptConfig** - LLM prompts and templates
- **CalcConfig** - Calculation thresholds and verdict bands

**Default Profile**: Built-in profile used when no custom profile selected

---

## 2. Configuration Profiles

### Profile Structure

Each profile contains 3 configuration objects:

```typescript
interface Profile {
  id: string;                    // Unique identifier (UUID)
  name: string;                  // Display name ("High-Stakes Fact-Checking")
  description: string;           // Purpose description
  isDefault: boolean;            // Whether this is the default profile
  searchConfig: SearchConfig;    // Search settings
  promptConfig: PromptConfig;    // Prompt templates
  calcConfig: CalcConfig;        // Calculation parameters
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
}
```

### Profile List View

**Location**: Navigate to `/admin/config`

**Features**:
- View all available profiles
- See which profile is active (highlighted)
- Quick switch between profiles
- Create new profile
- Import/export profiles

**Example Profiles**:

| Profile Name | Description | Use Case |
|--------------|-------------|----------|
| **Default** | Standard balanced settings | General fact-checking |
| **High-Stakes** | Strict quality gates, conservative verdicts | Legal, medical, high-impact claims |
| **Exploratory** | Lenient filters, more evidence | Research, hypothesis generation |
| **Budget** | Minimal searches, token limits | Cost-sensitive analyses |

---

## 3. Profile Management

### Creating a New Profile

**Steps**:
1. Navigate to `/admin/config`
2. Click **"Create New Profile"** button
3. Enter profile details:
   - **Name**: Descriptive name (e.g., "Medical Claims Analysis")
   - **Description**: Purpose and use case
4. Configure settings:
   - **Search**: Provider, max results, timeouts, domain filters
   - **Prompts**: LLM provider, temperature, token limits
   - **Calculation**: Verdict bands, quality gates, evidence filters
5. Click **"Save Profile"**
6. Profile appears in profile list

**Tips**:
- Start from an existing profile (duplicate it first)
- Use descriptive names that indicate the use case
- Document any non-standard settings in the description

### Editing a Profile

**Steps**:
1. Navigate to `/admin/config`
2. Click on profile name to open
3. Modify settings in any of the 3 config sections
4. Click **"Save Changes"**
5. System creates a new version (version history preserved)

**Version Control**:
- Each save creates a new version timestamp
- Previous versions preserved for rollback
- View version history via **"History"** button

### Duplicating a Profile

**Use Case**: Create a variation of an existing profile

**Steps**:
1. Navigate to `/admin/config`
2. Select profile to duplicate
3. Click **"Duplicate"** button
4. Enter new profile name
5. System creates copy with suffix " (Copy)"
6. Edit as needed

### Deleting a Profile

**Steps**:
1. Navigate to `/admin/config`
2. Select profile to delete
3. Click **"Delete"** button
4. Confirm deletion

**Restrictions**:
- ❌ Cannot delete the Default profile
- ❌ Cannot delete active profile (switch to another first)
- ⚠️ Deletion is permanent (no undo)

### Importing a Profile

**Use Case**: Load a profile shared by a team member or from backup

**Steps**:
1. Navigate to `/admin/config`
2. Click **"Import Profile"** button
3. Select profile JSON file
4. System validates profile structure
5. If valid, profile appears in list
6. If invalid, error message shows what's wrong

**Profile JSON Format**:
```json
{
  "name": "Medical Claims Analysis",
  "description": "Strict settings for medical fact-checking",
  "searchConfig": { ... },
  "promptConfig": { ... },
  "calcConfig": { ... }
}
```

### Exporting a Profile

**Use Case**: Share profile with team members or create backup

**Steps**:
1. Navigate to `/admin/config`
2. Select profile to export
3. Click **"Export"** button
4. System downloads JSON file (e.g., `profile-medical-claims.json`)
5. Share file via email, Slack, or version control

**Best Practices**:
- Export after major configuration changes (backup)
- Include version number in filename (e.g., `profile-medical-v2.json`)
- Store exported profiles in version control (Git)

---

## 4. Configuration Types

### 4.1 SearchConfig

**Purpose**: Controls web search behavior

**Key Settings**:

| Setting | Description | Default | Range |
|---------|-------------|---------|-------|
| **provider** | Search provider (auto/google/bing/serper) | `auto` | - |
| **mode** | Search mode (standard/deep/quick) | `standard` | - |
| **maxResults** | Max search results per query | `6` | 1-20 |
| **maxSourcesPerIteration** | Max sources to fetch per iteration | `4` | 1-10 |
| **timeoutMs** | Search timeout in milliseconds | `12000` | 1000-60000 |
| **dateRestrict** | Filter by date (e.g., "m6" for 6 months) | `null` | - |
| **domainWhitelist** | Only search these domains (empty = all) | `[]` | - |
| **domainBlacklist** | Exclude these domains | `[]` | - |

**Example SearchConfig**:
```json
{
  "provider": "google",
  "mode": "deep",
  "maxResults": 12,
  "maxSourcesPerIteration": 6,
  "timeoutMs": 20000,
  "dateRestrict": "y1",
  "domainWhitelist": ["nih.gov", "cdc.gov", "nature.com"],
  "domainBlacklist": []
}
```

**Use Case**: Medical claims requiring peer-reviewed sources only

### 4.2 PromptConfig

**Purpose**: Controls LLM behavior and prompt templates

**Key Settings**:

| Setting | Description | Default | Range |
|---------|-------------|---------|-------|
| **provider** | LLM provider (anthropic/openai/google) | `anthropic` | - |
| **model** | Specific model (sonnet-4/gpt-4/gemini-1.5-pro) | Provider default | - |
| **temperature** | Creativity level (lower = more deterministic) | `0.2` | 0.0-1.0 |
| **maxTokens** | Max output tokens per LLM call | `8000` | 1000-200000 |
| **systemPrompt** | Custom system prompt (optional) | `""` | - |
| **tier** | Budget tier (premium/standard/budget) | `standard` | - |
| **knowledgeMode** | Use model knowledge (with/without) | `without` | - |

**Example PromptConfig**:
```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4",
  "temperature": 0.0,
  "maxTokens": 16000,
  "systemPrompt": "",
  "tier": "premium",
  "knowledgeMode": "without"
}
```

**Use Case**: High-stakes fact-checking with deterministic output

### 4.3 CalcConfig

**Purpose**: Controls verdict calculation, evidence filtering, and aggregation

**Key Settings** (Phase 2 additions highlighted):

#### Verdict Bands
```typescript
verdictBands: {
  true: [86, 100],          // 86-100% confidence = "True"
  mostlyTrue: [72, 85],     // 72-85% = "Mostly True"
  leaningTrue: [58, 71],    // 58-71% = "Leaning True"
  mixed: [43, 57],          // 43-57% = "Mixed"
  leaningFalse: [29, 42],   // 29-42% = "Leaning False"
  mostlyFalse: [15, 28],    // 15-28% = "Mostly False"
  false: [0, 14],           // 0-14% = "False"
}
```

#### Aggregation Weights
```typescript
aggregation: {
  centralityWeights: { high: 3.0, medium: 2.0, low: 1.0 },
  harmPotentialMultiplier: 1.5,
  contestationWeights: { established: 0.3, disputed: 0.5, opinion: 1.0 },
}
```

#### **🆕 Phase 2: probativeValue Weights**
```typescript
probativeValueWeights: {
  high: 1.0,    // Well-attributed, specific evidence (100% weight)
  medium: 0.8,  // Moderately specific evidence (80% weight)
  low: 0.5,     // Vague evidence (50% weight, usually filtered)
}
```

#### **🆕 Phase 2: sourceType Calibration**
```typescript
sourceTypeCalibration: {
  peer_reviewed_study: 1.0,    // Academic research (baseline)
  fact_check_report: 1.05,     // Fact-checking orgs (+5% boost)
  government_report: 1.0,      // Official gov sources (baseline)
  legal_document: 1.0,         // Court rulings (baseline)
  news_primary: 1.0,           // Primary journalism (baseline)
  news_secondary: 0.95,        // News aggregation (-5%)
  expert_statement: 0.9,       // Expert opinions (-10%)
  organization_report: 0.95,   // NGO/think tank reports (-5%)
  other: 0.8,                  // Unclassified sources (-20%)
}
```

#### **🆕 Phase 2: Evidence Filter Rules**
```typescript
evidenceFilter: {
  minStatementLength: 20,           // Min characters for evidence statement
  maxVaguePhraseCount: 2,           // Max vague phrases allowed
  requireSourceExcerpt: true,       // Must have source excerpt
  minExcerptLength: 30,             // Min excerpt characters
  requireSourceUrl: true,           // Must have source URL
  deduplicationThreshold: 0.85,     // Jaccard similarity (0-1)
}
```

**Use Cases**:
- **High-Stakes**: Lower thresholds, stricter filters
- **Exploratory**: Higher thresholds, lenient filters
- **Budget**: Moderate settings, balance cost vs quality

---

## 5. Common Use Cases

### 5.1 High-Stakes Fact-Checking

**Scenario**: Verifying claims that could impact policy, health, or legal decisions

**Profile Configuration**:

**SearchConfig**:
- Provider: `google` (highest quality)
- Mode: `deep` (exhaustive search)
- maxResults: `12` (gather more evidence)
- domainWhitelist: Trusted sources only (nih.gov, gov, .edu, nature.com, etc.)

**PromptConfig**:
- Provider: `anthropic` (strongest reasoning)
- Model: `claude-sonnet-4`
- Temperature: `0.0` (deterministic)
- Tier: `premium` (no limits)
- knowledgeMode: `without` (sources-only)

**CalcConfig**:
- Verdict bands: Conservative (shift thresholds higher)
  ```typescript
  true: [90, 100],        // Require 90%+ for "True" (vs default 86%)
  mostlyTrue: [78, 89],   // Higher bar for "Mostly True"
  ```
- probativeValueWeights: Strict
  ```typescript
  high: 1.0,
  medium: 0.7,    // Reduce medium weight (vs default 0.8)
  low: 0.3,       // Low evidence almost ignored
  ```
- evidenceFilter: Strict
  ```typescript
  minStatementLength: 30,         // Longer statements required
  maxVaguePhraseCount: 1,         // Only 1 vague phrase allowed
  requireSourceExcerpt: true,
  minExcerptLength: 50,           // Longer excerpts required
  deduplicationThreshold: 0.90,   // More aggressive dedup
  ```

**Result**: Conservative verdicts with high confidence thresholds

### 5.2 Exploratory Research

**Scenario**: Exploring a topic to generate hypotheses, not making definitive verdicts

**Profile Configuration**:

**SearchConfig**:
- Provider: `auto` (any available)
- Mode: `standard`
- maxResults: `10`
- domainWhitelist: `[]` (no restrictions)

**PromptConfig**:
- Provider: `google` (good for exploration)
- Model: `gemini-1.5-pro`
- Temperature: `0.3` (slightly more creative)
- Tier: `standard`
- knowledgeMode: `with` (allow model knowledge for context)

**CalcConfig**:
- Verdict bands: Standard (default)
- probativeValueWeights: Lenient
  ```typescript
  high: 1.0,
  medium: 0.9,    // Increase medium weight (vs default 0.8)
  low: 0.6,       // Tolerate low-quality evidence
  ```
- evidenceFilter: Lenient
  ```typescript
  minStatementLength: 15,         // Shorter statements OK
  maxVaguePhraseCount: 3,         // Allow more vague phrases
  requireSourceExcerpt: false,    // Optional excerpts
  minExcerptLength: 20,           // Shorter excerpts OK
  deduplicationThreshold: 0.80,   // Less aggressive dedup
  ```

**Result**: More evidence collected, broader perspective, exploratory verdicts

### 5.3 Budget-Constrained Analysis

**Scenario**: Minimize API costs while maintaining acceptable quality

**Profile Configuration**:

**SearchConfig**:
- Provider: `bing` (lower cost than Google)
- Mode: `quick`
- maxResults: `4` (minimal)
- maxSourcesPerIteration: `2`
- timeoutMs: `8000` (shorter timeout)

**PromptConfig**:
- Provider: `anthropic`
- Model: `claude-haiku-3.5` (cheapest, still good)
- Temperature: `0.2`
- maxTokens: `4000` (reduced)
- Tier: `budget` (enforces token limits)

**CalcConfig**:
- Verdict bands: Standard
- probativeValueWeights: Standard (default)
- evidenceFilter: Standard (default)

**Result**: Lower cost (~40% reduction), acceptable quality for non-critical analyses

### 5.4 Domain-Specific Analyses

**Scenario**: Legal claim analysis requiring case law and statutes

**Profile Configuration**:

**SearchConfig**:
- domainWhitelist: `["supremecourt.gov", "law.cornell.edu", "justia.com", "courtlistener.com"]`
- maxResults: `8`
- dateRestrict: `null` (include historical cases)

**PromptConfig**:
- Provider: `anthropic`
- Model: `claude-sonnet-4` (best for legal reasoning)
- systemPrompt: `"You are analyzing legal claims. Focus on case law, statutes, and court rulings. Cite specific cases and provisions."`

**CalcConfig**:
- sourceTypeCalibration: Boost legal sources
  ```typescript
  legal_document: 1.10,  // +10% for case law (vs default 1.0)
  government_report: 1.05,  // +5% for official gov
  other: 0.6,  // Penalize non-legal sources
  ```
- evidenceFilter: Require citations
  ```typescript
  // Custom category rule enforcement
  legal_provision: { requireCitation: true }
  ```

**Result**: Legal-focused evidence with proper citations

---

## 6. Troubleshooting

### Profile Not Saving

**Symptoms**: Click "Save", but changes don't persist

**Causes**:
1. **Invalid JSON**: Config contains syntax errors
2. **Missing required fields**: Essential fields (name, description) empty
3. **Schema validation failure**: Values outside allowed ranges

**Solutions**:
1. Check browser console for validation errors (F12 → Console tab)
2. Verify all required fields have values
3. Check value ranges:
   - maxResults: 1-20
   - temperature: 0.0-1.0
   - timeoutMs: 1000-60000

### Profile Import Fails

**Symptoms**: Error message when importing profile JSON

**Causes**:
1. **Malformed JSON**: Syntax error in file
2. **Incompatible version**: Profile from older/newer FactHarbor version
3. **Missing fields**: Required fields not present

**Solutions**:
1. Validate JSON using online validator (jsonlint.com)
2. Check FactHarbor version compatibility
3. Compare with exported profile from current version to identify missing fields

### Analysis Using Wrong Profile

**Symptoms**: Analysis results don't match expected profile settings

**Causes**:
1. **Profile not set as active**: Default profile still selected
2. **Cache issue**: Browser cached old profile
3. **Job queue used old profile**: Job created before profile switch

**Solutions**:
1. Verify active profile highlighted in profile list
2. Hard refresh browser (Ctrl+Shift+R)
3. Create new analysis job (don't reuse old job)

### Evidence Filter Too Strict

**Symptoms**: Most evidence filtered out, verdicts unreliable due to insufficient evidence

**Indicators**:
- Filter stats show >50% filtered
- FP rate >20% (filtering valid evidence)
- Verdict confidence very low

**Solutions**:
1. Check evidenceFilter settings:
   - Increase `minStatementLength` if filtering valid short statements
   - Increase `maxVaguePhraseCount` if filtering contextually valid evidence
   - Decrease `deduplicationThreshold` if filtering distinct evidence
2. Review filter logs to identify most common filter reasons
3. Consider using "Exploratory" profile template as starting point

### Evidence Filter Too Lenient

**Symptoms**: Low-quality evidence passing through, verdicts unreliable

**Indicators**:
- Evidence contains many vague phrases
- sourceExcerpts are LLM-generated ("Based on...")
- Duplicate evidence items
- FP rate <5% (filter not catching enough)

**Solutions**:
1. Check evidenceFilter settings:
   - Decrease `minStatementLength` if allowing too-short statements
   - Decrease `maxVaguePhraseCount` to catch vague evidence
   - Increase `deduplicationThreshold` for more aggressive dedup
2. Enable `requireSourceExcerpt` and `requireSourceUrl` if disabled
3. Consider using "High-Stakes" profile template as starting point

---

## 7. New in v2.10: Admin Tools

### 7.1 Active Config Dashboard

**Location**: Top of `/admin/config` page

**Purpose**: Visual overview of all currently active configurations at a glance.

**Features**:
- Color-coded cards for each config type (Search, Calculation, Pipeline, Prompts, SR)
- Shows version label for each active config
- Displays activation timestamp
- Grouped by profile key

**Use Case**: Quickly understand current system state before making changes.

### 7.2 Config Search by Hash

**Location**: Top of `/admin/config` page

**Purpose**: Find configs by content hash for debugging and traceability.

**How to Use**:
1. Enter full or partial hash (minimum 4 characters)
2. Press Enter or click "Search"
3. Results show matching configs across all types
4. Click result to navigate directly to that config version

**Use Case**: When debugging a job report that shows a config hash, quickly find the exact config that was used.

### 7.3 Version Comparison (Diff View)

**Location**: History tab in `/admin/config`

**Purpose**: Compare any two config versions side-by-side.

**How to Use**:
1. Go to History tab
2. Check boxes next to two versions to compare
3. Click "Compare Selected"
4. Diff view shows:
   - JSON configs: Field-by-field changes with added/removed/modified indicators
   - Prompts: Side-by-side text comparison

**Color Coding**:
- Green: Added fields/lines
- Red: Removed fields/lines
- Yellow: Modified fields

**Use Case**: Understand what changed between versions when reviewing history.

### 7.4 Default Value Indicators

**Location**: Active Config view (when viewing active config for JSON types)

**Purpose**: Identify which settings are customized from defaults.

**Visual Indicators**:
- **Green banner**: "Using default configuration" - no customizations
- **Yellow banner**: Shows count of customized fields with percentage

**Expandable Details**: Click to see exact field paths that differ from defaults.

**Use Case**: Quickly identify if a config has been customized and which fields changed.

### 7.5 Export All Configs

**Location**: `/admin` page (main admin dashboard)

**Purpose**: Create complete backup of all active configurations.

**How to Use**:
1. Navigate to Admin Dashboard
2. Click "Export All Configurations"
3. Downloads JSON file with all configs

**Export Format**:
```json
{
  "exportedAt": "2026-01-31T14:30:00Z",
  "analyzerVersion": "2.10.0",
  "schemaVersion": "1.0",
  "configs": {
    "pipeline": { "default": { ... } },
    "search": { "default": { ... } },
    "calculation": { "default": { ... } },
    "prompt": { "default": { ... } }
  }
}
```

**Use Cases**:
- Disaster recovery backup
- Environment migration
- Version control of configurations

### 7.6 Toast Notifications

**Behavior**: All admin operations now use professional toast notifications instead of browser alerts.

**Toast Types**:
- **Success** (green): Operation completed successfully
- **Error** (red): Operation failed - includes error details
- **Info** (default): Informational feedback

**Features**:
- Non-blocking (can continue working while notification shows)
- Auto-dismiss after 3-5 seconds
- Errors persist until dismissed
- Multiple toasts stack properly

---

## Appendix A: Default Profile Settings

### Default SearchConfig
```json
{
  "enabled": true,
  "provider": "auto",
  "mode": "standard",
  "maxResults": 6,
  "maxSourcesPerIteration": 4,
  "timeoutMs": 12000,
  "dateRestrict": null,
  "domainWhitelist": [],
  "domainBlacklist": []
}
```

### Default PromptConfig
```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-3.5",
  "temperature": 0.2,
  "maxTokens": 8000,
  "systemPrompt": "",
  "tier": "standard",
  "knowledgeMode": "without"
}
```

### Default CalcConfig
```json
{
  "verdictBands": {
    "true": [86, 100],
    "mostlyTrue": [72, 85],
    "leaningTrue": [58, 71],
    "mixed": [43, 57],
    "leaningFalse": [29, 42],
    "mostlyFalse": [15, 28],
    "false": [0, 14]
  },
  "aggregation": {
    "centralityWeights": { "high": 3.0, "medium": 2.0, "low": 1.0 },
    "harmPotentialMultiplier": 1.5,
    "contestationWeights": { "established": 0.3, "disputed": 0.5, "opinion": 1.0 }
  },
  "probativeValueWeights": {
    "high": 1.0,
    "medium": 0.8,
    "low": 0.5
  },
  "sourceTypeCalibration": {
    "peer_reviewed_study": 1.0,
    "fact_check_report": 1.05,
    "government_report": 1.0,
    "legal_document": 1.0,
    "news_primary": 1.0,
    "news_secondary": 0.95,
    "expert_statement": 0.9,
    "organization_report": 0.95,
    "other": 0.8
  },
  "evidenceFilter": {
    "minStatementLength": 20,
    "maxVaguePhraseCount": 2,
    "requireSourceExcerpt": true,
    "minExcerptLength": 30,
    "requireSourceUrl": true,
    "deduplicationThreshold": 0.85
  }
}
```

---

## Appendix B: Related Documents

- [Evidence Quality Filtering](../ARCHITECTURE/Evidence_Quality_Filtering.md) - Evidence filter details
- [Provider Prompt Formatting](../REFERENCE/Provider_Prompt_Formatting.md) - Prompt configuration
- [Schema Migration Strategy](../ARCHITECTURE/Schema_Migration_Strategy.md) - Backward compatibility
- [Admin Config Implementation](../../apps/web/src/app/admin/config/page.tsx) - UI code

---

**Document Version**: 2.0
**Last Updated**: 2026-01-31
**Changes**: Added Section 7 - New Admin Tools (v2.10.0 features)
**Next Review**: When adding new configuration options
**Maintained by**: Plan Coordinator
