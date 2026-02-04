/**
 * Admin Config Page
 *
 * Unified configuration management for search, calculation, and prompt configs.
 * Phase 2: Form-based editors with validation.
 *
 * @module admin/config
 */

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAdminAuth } from "../admin-auth-context";
import styles from "./config.module.css";
import toast from "react-hot-toast";

// ============================================================================
// TYPES
// ============================================================================

type ConfigType = "search" | "calculation" | "prompt" | "pipeline" | "sr";
type Tab = "active" | "history" | "edit" | "effective";

interface OverrideRecord {
  envVar: string;
  fieldPath: string;
  wasSet: boolean;
  appliedValue?: string | number | boolean;
}

interface EffectiveConfig {
  configType: string;
  profileKey: string;
  base: object;
  overrides: OverrideRecord[];
  effective: object;
  overridePolicy: string;
}

interface ConfigVersion {
  contentHash: string;
  configType: ConfigType;
  profileKey: string;
  schemaVersion: string;
  versionLabel: string;
  content: string;
  createdUtc: string;
  createdBy: string | null;
  updatedUtc?: string | null;
  updatedBy?: string | null;
  isActive: boolean;
  activatedUtc: string | null;
  activatedBy: string | null;
}

interface HistoryResponse {
  versions: ConfigVersion[];
  total: number;
  limit: number;
  offset: number;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  canonicalizedHash?: string;
}

interface ActiveConfigSummary {
  profileKey: string;
  hash: string;
  versionLabel: string;
  activatedUtc: string;
  activatedBy: string | null;
  createdUtc: string;
}

interface ActiveSummaryResponse {
  success: boolean;
  activeConfigs: Record<string, ActiveConfigSummary[]>;
  totalCount: number;
  timestamp: string;
}

interface CacheStatusResponse {
  entries: Array<{ key: string; hash: string; loadedAt: number; pointerCheckedAt: number }>;
  size: number;
  hitRate: string;
  lastPoll: string;
  storageCache?: {
    entries: number;
    keys: string[];
    ttlMs: number;
  };
}

// Search config type
interface SearchConfig {
  enabled: boolean;
  provider: "auto" | "google-cse" | "serpapi";
  mode: "standard" | "grounded";
  maxResults: number;
  maxSourcesPerIteration: number;
  timeoutMs: number;
  dateRestrict: "y" | "m" | "w" | null;
  domainWhitelist: string[];
  domainBlacklist: string[];
}

// Calculation config type (simplified for form)
interface CalcConfig {
  verdictBands: {
    true: [number, number];
    mostlyTrue: [number, number];
    leaningTrue: [number, number];
    mixed: [number, number];
    leaningFalse: [number, number];
    mostlyFalse: [number, number];
    false: [number, number];
  };
  aggregation: {
    centralityWeights: { high: number; medium: number; low: number };
    harmPotentialMultiplier: number;
    contestationWeights: { established: number; disputed: number; opinion: number };
  };
  sourceReliability: {
    confidenceThreshold: number;
    consensusThreshold: number;
    defaultScore: number;
  };
  qualityGates: {
    gate1OpinionThreshold: number;
    gate1SpecificityThreshold: number;
    gate1MinContentWords: number;
    gate4MinSourcesHigh: number;
    gate4MinSourcesMedium: number;
    gate4QualityThresholdHigh: number;
    gate4QualityThresholdMedium: number;
    gate4AgreementThresholdHigh: number;
    gate4AgreementThresholdMedium: number;
  };
  contestationPenalties: { established: number; disputed: number };
  deduplication: {
    evidenceScopeThreshold: number;
    claimSimilarityThreshold: number;
    contextMergeThreshold: number;
  };
  mixedConfidenceThreshold: number;
  // Evidence Quality Weighting (v2.6.41+)
  probativeValueWeights?: {
    high: number;     // Default: 1.0
    medium: number;   // Default: 0.8
    low: number;      // Default: 0.5
  };
  // Source Type Reliability Calibration (v2.6.41+)
  sourceTypeCalibration?: {
    peer_reviewed_study: number;    // Default: 1.0
    fact_check_report: number;      // Default: 1.05
    government_report: number;      // Default: 1.0
    legal_document: number;         // Default: 1.0
    news_primary: number;           // Default: 1.0
    news_secondary: number;         // Default: 0.95
    expert_statement: number;       // Default: 0.9
    organization_report: number;    // Default: 0.95
    other: number;                  // Default: 0.8
  };
  // Evidence Filter Configuration (v2.6.41+)
  evidenceFilter?: {
    minStatementLength: number;       // Default: 20
    maxVaguePhraseCount: number;      // Default: 2
    requireSourceExcerpt: boolean;    // Default: true
    minExcerptLength: number;         // Default: 30
    requireSourceUrl: boolean;        // Default: true
    deduplicationThreshold: number;   // Default: 0.85
  };
}

// Pipeline config type
interface PipelineConfig {
  // Model selection
  llmProvider: "anthropic" | "openai" | "google" | "mistral";
  llmTiering: boolean;
  modelUnderstand: string;
  modelExtractEvidence: string;
  modelVerdict: string;
  // LLM Text Analysis feature flags
  llmInputClassification: boolean;
  llmEvidenceQuality: boolean;
  llmContextSimilarity?: boolean;
  // Deprecated alias (legacy "scope" == AnalysisContext).
  llmScopeSimilarity?: boolean;
  llmVerdictValidation: boolean;
  // Analysis behavior
  analysisMode: "quick" | "deep";
  allowModelKnowledge: boolean;
  deterministic: boolean;
  contextDedupThreshold?: number;
  // Budget controls
  maxIterationsPerContext?: number;
  // Deprecated alias (legacy "scope" == AnalysisContext).
  maxIterationsPerScope?: number;
  maxTotalIterations: number;
  maxTotalTokens: number;
  enforceBudgets: boolean;
  // Retrieval
  pdfParseTimeoutMs?: number;
  // Pipeline selection
  defaultPipelineVariant?: "orchestrated" | "monolithic_canonical" | "monolithic_dynamic";
}

// Source Reliability config type
interface SRConfig {
  enabled: boolean;
  multiModel: boolean;
  openaiModel: string;
  confidenceThreshold: number;
  consensusThreshold: number;
  defaultScore: number;
  cacheTtlDays: number;
  filterEnabled: boolean;
  skipPlatforms: string[];
  skipTlds: string[];
  rateLimitPerIp?: number;
  domainCooldownSec?: number;
  evalUseSearch?: boolean;
  evalSearchMaxResultsPerQuery?: number;
  evalMaxEvidenceItems?: number;
  evalSearchDateRestrict?: "y" | "m" | "w" | null;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  enabled: true,
  provider: "auto",
  mode: "standard",
  maxResults: 6,
  maxSourcesPerIteration: 4,
  timeoutMs: 12000,
  dateRestrict: null,
  domainWhitelist: [],
  domainBlacklist: [],
};

const DEFAULT_CALC_CONFIG: CalcConfig = {
  verdictBands: {
    true: [86, 100],
    mostlyTrue: [72, 85],
    leaningTrue: [58, 71],
    mixed: [43, 57],
    leaningFalse: [29, 42],
    mostlyFalse: [15, 28],
    false: [0, 14],
  },
  aggregation: {
    centralityWeights: { high: 3.0, medium: 2.0, low: 1.0 },
    harmPotentialMultiplier: 1.5,
    contestationWeights: { established: 0.3, disputed: 0.5, opinion: 1.0 },
  },
  sourceReliability: {
    confidenceThreshold: 0.8,
    consensusThreshold: 0.2,
    defaultScore: 0.5,
  },
  qualityGates: {
    gate1OpinionThreshold: 0.7,
    gate1SpecificityThreshold: 0.3,
    gate1MinContentWords: 3,
    gate4MinSourcesHigh: 3,
    gate4MinSourcesMedium: 2,
    gate4QualityThresholdHigh: 0.7,
    gate4QualityThresholdMedium: 0.5,
    gate4AgreementThresholdHigh: 0.7,
    gate4AgreementThresholdMedium: 0.5,
  },
  contestationPenalties: { established: -12, disputed: -8 },
  deduplication: {
    evidenceScopeThreshold: 0.85,
    claimSimilarityThreshold: 0.85,
    contextMergeThreshold: 0.7,
  },
  mixedConfidenceThreshold: 60,
  probativeValueWeights: {
    high: 1.0,
    medium: 0.8,
    low: 0.5,
  },
  sourceTypeCalibration: {
    peer_reviewed_study: 1.0,
    fact_check_report: 1.05,
    government_report: 1.0,
    legal_document: 1.0,
    news_primary: 1.0,
    news_secondary: 0.95,
    expert_statement: 0.9,
    organization_report: 0.95,
    other: 0.8,
  },
  evidenceFilter: {
    minStatementLength: 20,
    maxVaguePhraseCount: 2,
    requireSourceExcerpt: true,
    minExcerptLength: 30,
    requireSourceUrl: true,
    deduplicationThreshold: 0.85,
  },
};

const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  llmProvider: "anthropic",
  llmTiering: false,
  modelUnderstand: "claude-3-5-haiku-20241022",
  modelExtractEvidence: "claude-3-5-haiku-20241022",
  modelVerdict: "claude-sonnet-4-20250514",
  llmInputClassification: true,
  llmEvidenceQuality: true,
  llmContextSimilarity: true,
  llmVerdictValidation: true,
  analysisMode: "quick",
  allowModelKnowledge: false,
  deterministic: true,
  contextDedupThreshold: 0.85,
  maxIterationsPerContext: 5,
  maxTotalIterations: 20,
  maxTotalTokens: 750000,
  enforceBudgets: false,
  pdfParseTimeoutMs: 60000,
  defaultPipelineVariant: "orchestrated",
};

const DEFAULT_SR_CONFIG: SRConfig = {
  enabled: true,
  multiModel: true,
  openaiModel: "gpt-4o-mini",
  confidenceThreshold: 0.8,
  consensusThreshold: 0.20,
  defaultScore: 0.5,
  cacheTtlDays: 90,
  filterEnabled: true,
  skipPlatforms: ["blogspot.", "wordpress.com", "medium.com", "substack.com"],
  skipTlds: ["xyz", "top", "club", "icu", "buzz", "tk", "ml", "ga", "cf", "gq"],
  rateLimitPerIp: 10,
  domainCooldownSec: 60,
  evalUseSearch: true,
  evalSearchMaxResultsPerQuery: 3,
  evalMaxEvidenceItems: 12,
  evalSearchDateRestrict: null,
};

/**
 * Get default config for a config type (for form initialization)
 */
function getDefaultConfigForType(type: ConfigType): SearchConfig | CalcConfig | PipelineConfig | SRConfig | null {
  switch (type) {
    case "search":
      return DEFAULT_SEARCH_CONFIG;
    case "calculation":
      return DEFAULT_CALC_CONFIG;
    case "pipeline":
      return DEFAULT_PIPELINE_CONFIG;
    case "sr":
      return DEFAULT_SR_CONFIG;
    default:
      return null; // Prompts and lexicons don't have a default form config (use JSON editor)
  }
}

// ============================================================================
// CONFIG TYPE DEFINITIONS
// ============================================================================

const CONFIG_TYPES: { type: ConfigType; title: string; description: string }[] = [
  {
    type: "search",
    title: "Web Search",
    description: "Search provider, max results, timeouts, domain filters",
  },
  {
    type: "calculation",
    title: "Calculation",
    description: "Verdict bands, centrality weights, quality gates",
  },
  {
    type: "pipeline",
    title: "Pipeline",
    description: "Analysis mode, LLM models, budget controls, feature flags",
  },
  {
    type: "sr",
    title: "Source Reliability",
    description: "Separate SR service config (consensus, thresholds, caching, filtering)",
  },
  {
    type: "prompt",
    title: "Prompts",
    description: "LLM prompts for analysis pipelines",
  },
];

// ============================================================================
// SEARCH CONFIG FORM COMPONENT
// ============================================================================

function SearchConfigForm({
  config,
  onChange,
}: {
  config: SearchConfig;
  onChange: (config: SearchConfig) => void;
}) {
  const updateField = <K extends keyof SearchConfig>(key: K, value: SearchConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className={styles.formSection}>
      <h3 className={styles.formSectionTitle}>Search Settings</h3>
      <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
        Controls web search behavior for evidence gathering. Higher values = more evidence but increased cost/time.
      </p>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => updateField("enabled", e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Enable Web Search
        </label>
        <div className={styles.formHelp}>When disabled, analysis uses only LLM knowledge (not recommended for fact-checking)</div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Provider</label>
        <select
          className={styles.formInput}
          value={config.provider}
          onChange={(e) => updateField("provider", e.target.value as SearchConfig["provider"])}
        >
          <option value="auto">Auto (prefer available)</option>
          <option value="google-cse">Google CSE</option>
          <option value="serpapi">SerpAPI</option>
        </select>
        <div className={styles.formHelp}>Search API to use. Auto selects first available based on configured API keys.</div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Search Mode</label>
        <select
          className={styles.formInput}
          value={config.mode}
          onChange={(e) => updateField("mode", e.target.value as SearchConfig["mode"])}
        >
          <option value="standard">Standard</option>
          <option value="grounded">Grounded (Gemini only)</option>
        </select>
        <div className={styles.formHelp}>Standard: Traditional search. Grounded: Uses Gemini's grounding API for inline citations.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Max Results</label>
          <input
            type="number"
            className={styles.formInput}
            value={config.maxResults}
            min={1}
            max={20}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              updateField("maxResults", isNaN(v) ? 6 : v);
            }}
          />
          <div className={styles.formHelp}>Search results per query (default: 6). Higher = more evidence but slower.</div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Sources per Iteration</label>
          <input
            type="number"
            className={styles.formInput}
            value={config.maxSourcesPerIteration}
            min={1}
            max={10}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              updateField("maxSourcesPerIteration", isNaN(v) ? 4 : v);
            }}
          />
          <div className={styles.formHelp}>Max sources fetched per research round (default: 4). Affects cost and depth.</div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Timeout (ms)</label>
          <input
            type="number"
            className={styles.formInput}
            value={config.timeoutMs}
            min={1000}
            max={60000}
            step={1000}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              updateField("timeoutMs", isNaN(v) ? 12000 : v);
            }}
          />
          <div className={styles.formHelp}>Max wait per source fetch (default: 12000ms). Lower = faster but may miss slow sites.</div>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Date Restrict</label>
        <select
          className={styles.formInput}
          value={config.dateRestrict || ""}
          onChange={(e) => updateField("dateRestrict", (e.target.value || null) as SearchConfig["dateRestrict"])}
        >
          <option value="">No restriction</option>
          <option value="y">Past year</option>
          <option value="m">Past month</option>
          <option value="w">Past week</option>
        </select>
        <div className={styles.formHelp}>Filter search results by recency. Useful for current events; leave open for historical claims.</div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Domain Whitelist (comma-separated)</label>
        <input
          type="text"
          className={styles.formInput}
          value={(config.domainWhitelist || []).join(", ")}
          placeholder="e.g., reuters.com, apnews.com"
          onChange={(e) => updateField("domainWhitelist", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
        />
        <div className={styles.formHelp}>Only search these domains. Leave empty to search all. Use for domain-specific analysis (e.g., .gov only).</div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Domain Blacklist (comma-separated)</label>
        <input
          type="text"
          className={styles.formInput}
          value={(config.domainBlacklist || []).join(", ")}
          placeholder="e.g., example.com, spam.net"
          onChange={(e) => updateField("domainBlacklist", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
        />
        <div className={styles.formHelp}>Never search these domains. Use to exclude known unreliable sources.</div>
      </div>
    </div>
  );
}

// ============================================================================
// CALCULATION CONFIG FORM COMPONENT
// ============================================================================

function CalcConfigForm({
  config,
  onChange,
}: {
  config: CalcConfig;
  onChange: (config: CalcConfig) => void;
}) {
  const updateNested = <K extends keyof CalcConfig>(
    key: K,
    nested: Partial<CalcConfig[K]>,
  ) => {
    onChange({
      ...config,
      [key]: { ...(config[key] as object), ...nested },
    });
  };

  // Guard against incomplete config structure
  if (!config?.aggregation?.centralityWeights) {
    return <div className={styles.formSection}>Loading configuration...</div>;
  }

  return (
    <div>
      {/* Centrality Weights */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Centrality Weights</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>High</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.aggregation.centralityWeights.high}
              min={1}
              max={10}
              step={0.1}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                updateNested("aggregation", {
                  centralityWeights: {
                    ...config.aggregation.centralityWeights,
                    high: isNaN(v) ? 3 : v,
                  },
                });
              }}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Medium</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.aggregation.centralityWeights.medium}
              min={1}
              max={10}
              step={0.1}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                updateNested("aggregation", {
                  centralityWeights: {
                    ...config.aggregation.centralityWeights,
                    medium: isNaN(v) ? 2 : v,
                  },
                });
              }}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Low</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.aggregation.centralityWeights.low}
              min={0.1}
              max={5}
              step={0.1}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                updateNested("aggregation", {
                  centralityWeights: {
                    ...config.aggregation.centralityWeights,
                    low: isNaN(v) ? 1 : v,
                  },
                });
              }}
            />
          </div>
        </div>
        <div className={styles.formHelp}>
          Must be monotonic: high &gt;= medium &gt;= low
        </div>
      </div>

      {/* Source Reliability */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Source Reliability</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Confidence Threshold</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.sourceReliability.confidenceThreshold}
              min={0}
              max={1}
              step={0.05}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                updateNested("sourceReliability", {
                  confidenceThreshold: isNaN(v) ? 0.8 : v,
                });
              }}
            />
            <div className={styles.formHelp}>Min LLM confidence (0-1)</div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Consensus Threshold</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.sourceReliability.consensusThreshold}
              min={0}
              max={1}
              step={0.05}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                updateNested("sourceReliability", {
                  consensusThreshold: isNaN(v) ? 0.2 : v,
                });
              }}
            />
            <div className={styles.formHelp}>Max disagreement (0-1)</div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Default Score</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.sourceReliability.defaultScore}
              min={0}
              max={1}
              step={0.05}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                updateNested("sourceReliability", {
                  defaultScore: isNaN(v) ? 0.5 : v,
                });
              }}
            />
            <div className={styles.formHelp}>For unknown sources (0-1)</div>
          </div>
        </div>
      </div>

      {/* Contestation Penalties */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Contestation Penalties</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Established (strong counter-evidence)</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.contestationPenalties.established}
              min={-50}
              max={0}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                updateNested("contestationPenalties", {
                  established: isNaN(v) ? -12 : v,
                });
              }}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Disputed (some counter-evidence)</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.contestationPenalties.disputed}
              min={-50}
              max={0}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                updateNested("contestationPenalties", {
                  disputed: isNaN(v) ? -8 : v,
                });
              }}
            />
          </div>
        </div>
        <div className={styles.formHelp}>
          Penalties should be negative. Established should be &lt;= disputed (more severe).
        </div>
      </div>

      {/* Mixed Confidence */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Other Settings</h3>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Mixed Confidence Threshold (%)</label>
          <input
            type="number"
            className={styles.formInput}
            value={config.mixedConfidenceThreshold}
            min={0}
            max={100}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              onChange({
                ...config,
                mixedConfidenceThreshold: isNaN(v) ? 60 : v,
              });
            }}
          />
          <div className={styles.formHelp}>
            Below this, MIXED becomes UNVERIFIED (0-100)
          </div>
        </div>
      </div>

      {/* Probative Value Weights */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Probative Value Weights</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>High</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.probativeValueWeights?.high ?? 1.0}
              min={0.1}
              max={2.0}
              step={0.1}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onChange({
                  ...config,
                  probativeValueWeights: {
                    ...config.probativeValueWeights,
                    high: isNaN(v) ? 1.0 : v,
                    medium: config.probativeValueWeights?.medium ?? 0.8,
                    low: config.probativeValueWeights?.low ?? 0.5,
                  },
                });
              }}
            />
            <div className={styles.formHelp}>Specific, well-attributed evidence</div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Medium</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.probativeValueWeights?.medium ?? 0.8}
              min={0.1}
              max={2.0}
              step={0.1}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onChange({
                  ...config,
                  probativeValueWeights: {
                    high: config.probativeValueWeights?.high ?? 1.0,
                    medium: isNaN(v) ? 0.8 : v,
                    low: config.probativeValueWeights?.low ?? 0.5,
                  },
                });
              }}
            />
            <div className={styles.formHelp}>Moderately specific evidence</div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Low</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.probativeValueWeights?.low ?? 0.5}
              min={0.0}
              max={1.0}
              step={0.1}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onChange({
                  ...config,
                  probativeValueWeights: {
                    high: config.probativeValueWeights?.high ?? 1.0,
                    medium: config.probativeValueWeights?.medium ?? 0.8,
                    low: isNaN(v) ? 0.5 : v,
                  },
                });
              }}
            />
            <div className={styles.formHelp}>Vague, unattributed evidence (filtered)</div>
          </div>
        </div>
        <div className={styles.formHelp}>
          How much to weight evidence by probativeValue (quality assessment). High should be &gt;= medium &gt;= low.
        </div>
      </div>

      {/* Source Type Calibration */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Source Type Calibration</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Peer Reviewed Study</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.sourceTypeCalibration?.peer_reviewed_study ?? 1.0}
              min={0.5}
              max={1.5}
              step={0.05}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onChange({
                  ...config,
                  sourceTypeCalibration: {
                    ...(config.sourceTypeCalibration || {}),
                    peer_reviewed_study: isNaN(v) ? 1.0 : v,
                  } as CalcConfig["sourceTypeCalibration"],
                });
              }}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Fact Check Report</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.sourceTypeCalibration?.fact_check_report ?? 1.05}
              min={0.5}
              max={1.5}
              step={0.05}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onChange({
                  ...config,
                  sourceTypeCalibration: {
                    ...(config.sourceTypeCalibration || {}),
                    fact_check_report: isNaN(v) ? 1.05 : v,
                  } as CalcConfig["sourceTypeCalibration"],
                });
              }}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Government Report</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.sourceTypeCalibration?.government_report ?? 1.0}
              min={0.5}
              max={1.5}
              step={0.05}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onChange({
                  ...config,
                  sourceTypeCalibration: {
                    ...(config.sourceTypeCalibration || {}),
                    government_report: isNaN(v) ? 1.0 : v,
                  } as CalcConfig["sourceTypeCalibration"],
                });
              }}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Legal Document</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.sourceTypeCalibration?.legal_document ?? 1.0}
              min={0.5}
              max={1.5}
              step={0.05}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onChange({
                  ...config,
                  sourceTypeCalibration: {
                    ...(config.sourceTypeCalibration || {}),
                    legal_document: isNaN(v) ? 1.0 : v,
                  } as CalcConfig["sourceTypeCalibration"],
                });
              }}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>News Primary</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.sourceTypeCalibration?.news_primary ?? 1.0}
              min={0.5}
              max={1.5}
              step={0.05}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onChange({
                  ...config,
                  sourceTypeCalibration: {
                    ...(config.sourceTypeCalibration || {}),
                    news_primary: isNaN(v) ? 1.0 : v,
                  } as CalcConfig["sourceTypeCalibration"],
                });
              }}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>News Secondary</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.sourceTypeCalibration?.news_secondary ?? 0.95}
              min={0.5}
              max={1.5}
              step={0.05}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onChange({
                  ...config,
                  sourceTypeCalibration: {
                    ...(config.sourceTypeCalibration || {}),
                    news_secondary: isNaN(v) ? 0.95 : v,
                  } as CalcConfig["sourceTypeCalibration"],
                });
              }}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Expert Statement</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.sourceTypeCalibration?.expert_statement ?? 0.9}
              min={0.5}
              max={1.5}
              step={0.05}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onChange({
                  ...config,
                  sourceTypeCalibration: {
                    ...(config.sourceTypeCalibration || {}),
                    expert_statement: isNaN(v) ? 0.9 : v,
                  } as CalcConfig["sourceTypeCalibration"],
                });
              }}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Organization Report</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.sourceTypeCalibration?.organization_report ?? 0.95}
              min={0.5}
              max={1.5}
              step={0.05}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onChange({
                  ...config,
                  sourceTypeCalibration: {
                    ...(config.sourceTypeCalibration || {}),
                    organization_report: isNaN(v) ? 0.95 : v,
                  } as CalcConfig["sourceTypeCalibration"],
                });
              }}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Other</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.sourceTypeCalibration?.other ?? 0.8}
              min={0.5}
              max={1.5}
              step={0.05}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onChange({
                  ...config,
                  sourceTypeCalibration: {
                    ...(config.sourceTypeCalibration || {}),
                    other: isNaN(v) ? 0.8 : v,
                  } as CalcConfig["sourceTypeCalibration"],
                });
              }}
            />
          </div>
        </div>
        <div className={styles.formHelp}>
          Reliability multipliers by source type (EvidenceScope.sourceType). Values above 1.0 increase weight, below decrease.
        </div>
      </div>

      {/* Evidence Filter Rules (Advanced) */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Evidence Filter Rules (Advanced)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Min Statement Length</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.evidenceFilter?.minStatementLength ?? 20}
              min={10}
              max={100}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                onChange({
                  ...config,
                  evidenceFilter: {
                    ...(config.evidenceFilter || {}),
                    minStatementLength: isNaN(v) ? 20 : v,
                  } as CalcConfig["evidenceFilter"],
                });
              }}
            />
            <div className={styles.formHelp}>Minimum characters (10-100)</div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Max Vague Phrase Count</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.evidenceFilter?.maxVaguePhraseCount ?? 2}
              min={0}
              max={10}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                onChange({
                  ...config,
                  evidenceFilter: {
                    ...(config.evidenceFilter || {}),
                    maxVaguePhraseCount: isNaN(v) ? 2 : v,
                  } as CalcConfig["evidenceFilter"],
                });
              }}
            />
            <div className={styles.formHelp}>Max allowed (&quot;some say&quot;, &quot;many believe&quot;)</div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <input
                type="checkbox"
                checked={config.evidenceFilter?.requireSourceExcerpt ?? true}
                onChange={(e) => {
                  onChange({
                    ...config,
                    evidenceFilter: {
                      ...(config.evidenceFilter || {}),
                      requireSourceExcerpt: e.target.checked,
                    } as CalcConfig["evidenceFilter"],
                  });
                }}
                style={{ marginRight: 8 }}
              />
              Require Source Excerpt
            </label>
            <div className={styles.formHelp}>Evidence must include source text</div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Min Excerpt Length</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.evidenceFilter?.minExcerptLength ?? 30}
              min={10}
              max={200}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                onChange({
                  ...config,
                  evidenceFilter: {
                    ...(config.evidenceFilter || {}),
                    minExcerptLength: isNaN(v) ? 30 : v,
                  } as CalcConfig["evidenceFilter"],
                });
              }}
            />
            <div className={styles.formHelp}>Minimum excerpt characters (10-200)</div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <input
                type="checkbox"
                checked={config.evidenceFilter?.requireSourceUrl ?? true}
                onChange={(e) => {
                  onChange({
                    ...config,
                    evidenceFilter: {
                      ...(config.evidenceFilter || {}),
                      requireSourceUrl: e.target.checked,
                    } as CalcConfig["evidenceFilter"],
                  });
                }}
                style={{ marginRight: 8 }}
              />
              Require Source URL
            </label>
            <div className={styles.formHelp}>Evidence must have valid source link</div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Deduplication Threshold</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.evidenceFilter?.deduplicationThreshold ?? 0.85}
              min={0.5}
              max={1.0}
              step={0.05}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onChange({
                  ...config,
                  evidenceFilter: {
                    ...(config.evidenceFilter || {}),
                    deduplicationThreshold: isNaN(v) ? 0.85 : v,
                  } as CalcConfig["evidenceFilter"],
                });
              }}
            />
            <div className={styles.formHelp}>Similarity threshold 0.5-1.0 (higher = stricter)</div>
          </div>
        </div>
        <div className={styles.formHelp}>
          Configure evidence quality filter rules. These are applied by evidence-filter.ts during extraction (Layer 2 filter).
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PIPELINE CONFIG FORM COMPONENT
// ============================================================================

function PipelineConfigForm({
  config,
  onChange,
}: {
  config: PipelineConfig;
  onChange: (config: PipelineConfig) => void;
}) {
  const updateField = <K extends keyof PipelineConfig>(key: K, value: PipelineConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className={styles.formSection}>
      {/* Model Selection */}
      <h3 className={styles.formSectionTitle}>Model Selection</h3>
      <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
        Choose LLM models for each analysis phase. Better models = higher quality but more cost.
        Examples: claude-sonnet-4, claude-haiku-3.5, gpt-4o, gpt-4o-mini
      </p>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>LLM Provider</label>
        <select
          className={styles.formInput}
          value={config.llmProvider}
          onChange={(e) => updateField("llmProvider", e.target.value as PipelineConfig["llmProvider"])}
        >
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="openai">OpenAI (GPT)</option>
          <option value="google">Google (Gemini)</option>
          <option value="mistral">Mistral</option>
        </select>
        <div className={styles.formHelp}>Primary provider used for analysis LLM calls</div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          <input
            type="checkbox"
            checked={config.llmTiering}
            onChange={(e) => updateField("llmTiering", e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Enable LLM Tiering (50-70% cost savings)
        </label>
        <div className={styles.formHelp}>Automatically use cheaper models (Haiku) for simpler tasks like extraction. Recommended ON.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Understand Model</label>
          <input
            type="text"
            className={styles.formInput}
            value={config.modelUnderstand}
            onChange={(e) => updateField("modelUnderstand", e.target.value)}
          />
          <div className={styles.formHelp}>Initial claim comprehension. Medium quality OK. Default: claude-sonnet-4</div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Extract Evidence Model</label>
          <input
            type="text"
            className={styles.formInput}
            value={config.modelExtractEvidence}
            onChange={(e) => updateField("modelExtractEvidence", e.target.value)}
          />
          <div className={styles.formHelp}>Evidence extraction from sources. Can use cheaper model. Default: claude-haiku-3.5</div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Verdict Model</label>
          <input
            type="text"
            className={styles.formInput}
            value={config.modelVerdict}
            onChange={(e) => updateField("modelVerdict", e.target.value)}
          />
          <div className={styles.formHelp}>Final reasoning - use best model. Default: claude-sonnet-4</div>
        </div>
      </div>

      {/* LLM Text Analysis Feature Flags */}
      <h3 className={styles.formSectionTitle}>LLM Text Analysis (v2.8.3)</h3>
      <div className={styles.formHelp} style={{ marginBottom: 12 }}>
        Replace hardcoded heuristics with LLM calls. Automatic fallback to heuristics on failure.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            <input
              type="checkbox"
              checked={config.llmInputClassification}
              onChange={(e) => updateField("llmInputClassification", e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Input Classification
          </label>
          <div className={styles.formHelp}>Claim decomposition & type detection</div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            <input
              type="checkbox"
              checked={config.llmEvidenceQuality}
              onChange={(e) => updateField("llmEvidenceQuality", e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Evidence Quality
          </label>
          <div className={styles.formHelp}>Vagueness & citation detection</div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            <input
              type="checkbox"
              checked={config.llmContextSimilarity ?? config.llmScopeSimilarity ?? true}
              onChange={(e) => {
                const next = e.target.checked;
                onChange({
                  ...config,
                  llmContextSimilarity: next,
                  llmScopeSimilarity: undefined,
                });
              }}
              style={{ marginRight: 8 }}
            />
            Context Similarity
          </label>
          <div className={styles.formHelp}>Context deduplication & phase inference</div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            <input
              type="checkbox"
              checked={config.llmVerdictValidation}
              onChange={(e) => updateField("llmVerdictValidation", e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Verdict Validation
          </label>
          <div className={styles.formHelp}>Harm/inversion/contestation detection</div>
        </div>
      </div>

      {/* Analysis Behavior */}
      <h3 className={styles.formSectionTitle}>Analysis Behavior</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Analysis Mode</label>
          <select
            className={styles.formInput}
            value={config.analysisMode}
            onChange={(e) => updateField("analysisMode", e.target.value as "quick" | "deep")}
          >
            <option value="quick">Quick (4 iterations, faster)</option>
            <option value="deep">Deep (5 iterations, more thorough)</option>
          </select>
          <div className={styles.formHelp}>Deep mode costs ~2-3x more but yields higher quality</div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Context Dedup Threshold</label>
          <input
            type="number"
            className={styles.formInput}
            value={config.contextDedupThreshold ?? 0.85}
            min={0.5}
            max={1.0}
            step={0.05}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onChange({
                ...config,
                contextDedupThreshold: isNaN(v) ? 0.7 : v,
              });
            }}
          />
          <div className={styles.formHelp}>Lower = more contexts (0.5-1.0)</div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            <input
              type="checkbox"
              checked={config.allowModelKnowledge}
              onChange={(e) => updateField("allowModelKnowledge", e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Allow Model Knowledge
          </label>
          <div className={styles.formHelp}>Use LLM training data (not just web sources)</div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            <input
              type="checkbox"
              checked={config.deterministic}
              onChange={(e) => updateField("deterministic", e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Deterministic Mode
          </label>
          <div className={styles.formHelp}>Temperature=0 for reproducible outputs</div>
        </div>
      </div>

      {/* Retrieval */}
      <h3 className={styles.formSectionTitle}>Retrieval</h3>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>PDF Parse Timeout (ms)</label>
        <input
          type="number"
          className={styles.formInput}
          value={config.pdfParseTimeoutMs ?? 60000}
          min={10000}
          max={300000}
          step={1000}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            updateField("pdfParseTimeoutMs", isNaN(v) ? 60000 : v);
          }}
        />
        <div className={styles.formHelp}>Timeout for PDF parsing during URL retrieval</div>
      </div>

      {/* Budget Controls */}
      <h3 className={styles.formSectionTitle}>Budget Controls</h3>
      <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
        Control analysis depth vs cost. Higher limits = more thorough but expensive.
      </p>
      <div className={styles.formHelp} style={{ marginBottom: 12, color: "#dc2626" }}>
        ⚠️ Too strict limits cause fewer claims investigated & lower confidence scores
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Max Iterations/Context</label>
          <input
            type="number"
            className={styles.formInput}
            value={config.maxIterationsPerContext ?? config.maxIterationsPerScope ?? 5}
            min={1}
            max={20}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              onChange({
                ...config,
                maxIterationsPerContext: isNaN(v) ? 5 : v,
                maxIterationsPerScope: undefined,
              });
            }}
          />
          <div className={styles.formHelp}>Research rounds per context. 5 is balanced, 8+ for deep analysis.</div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Max Total Iterations</label>
          <input
            type="number"
            className={styles.formInput}
            value={config.maxTotalIterations}
            min={1}
            max={50}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              updateField("maxTotalIterations", isNaN(v) ? 20 : v);
            }}
          />
          <div className={styles.formHelp}>Total research rounds across all contexts. 20 typical, 40+ for complex.</div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Max Total Tokens</label>
          <input
            type="number"
            className={styles.formInput}
            value={config.maxTotalTokens}
            min={10000}
            max={2000000}
            step={50000}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              updateField("maxTotalTokens", isNaN(v) ? 750000 : v);
            }}
          />
          <div className={styles.formHelp}>Token budget. 750K ≈ $2.25. 1.5M for thorough analysis.</div>
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          <input
            type="checkbox"
            checked={config.enforceBudgets}
            onChange={(e) => updateField("enforceBudgets", e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Enforce Hard Budget Limits
        </label>
        <div className={styles.formHelp}>OFF (soft limits) = may exceed slightly for quality. ON = strict stop at limit.</div>
      </div>

      {/* Pipeline Selection */}
      <h3 className={styles.formSectionTitle}>Default Pipeline</h3>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Default Pipeline Variant</label>
        <select
          className={styles.formInput}
          value={config.defaultPipelineVariant || "orchestrated"}
          onChange={(e) => updateField("defaultPipelineVariant", e.target.value as PipelineConfig["defaultPipelineVariant"])}
        >
          <option value="orchestrated">Orchestrated (highest quality)</option>
          <option value="monolithic_canonical">Monolithic Canonical (faster)</option>
          <option value="monolithic_dynamic">Monolithic Dynamic (experimental)</option>
        </select>
        <div className={styles.formHelp}>User can override per-job in UI</div>
      </div>
    </div>
  );
}

// ============================================================================
// SOURCE RELIABILITY CONFIG FORM COMPONENT
// ============================================================================

function SRConfigForm({
  config,
  onChange,
}: {
  config: SRConfig;
  onChange: (config: SRConfig) => void;
}) {
  const updateField = <K extends keyof SRConfig>(key: K, value: SRConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className={styles.formSection}>
      {/* Core Settings */}
      <h3 className={styles.formSectionTitle}>Core Settings</h3>
      <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
        Source Reliability evaluates domain credibility using LLM analysis. This config is owned by the SR service
        and is separate from the main pipeline/search configs.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => updateField("enabled", e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Enable Source Reliability
          </label>
          <div className={styles.formHelp}>LLM-powered domain evaluation. Evidence from low-scoring sources gets reduced weight.</div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            <input
              type="checkbox"
              checked={config.multiModel}
              onChange={(e) => updateField("multiModel", e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Multi-Model Consensus
          </label>
          <div className={styles.formHelp}>Uses both Claude + OpenAI. Higher accuracy but 2x cost per evaluation.</div>
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>OpenAI Model for Refinement</label>
        <select
          className={styles.formInput}
          value={config.openaiModel}
          onChange={(e) => updateField("openaiModel", e.target.value)}
        >
          <option value="gpt-4o">gpt-4o (best quality)</option>
          <option value="gpt-4o-mini">gpt-4o-mini (~15x cheaper)</option>
        </select>
        <div className={styles.formHelp}>Secondary model for consensus. gpt-4o-mini is usually sufficient.</div>
      </div>

      {/* Thresholds */}
      <h3 className={styles.formSectionTitle}>Thresholds</h3>
      <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
        Control quality gates for score acceptance. Higher thresholds = more conservative but may reject valid scores.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Confidence Threshold</label>
          <input
            type="number"
            className={styles.formInput}
            value={config.confidenceThreshold}
            min={0.5}
            max={0.95}
            step={0.05}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              updateField("confidenceThreshold", isNaN(v) ? 0.8 : v);
            }}
          />
          <div className={styles.formHelp}>Min LLM confidence to accept score. 0.8 = balanced. 0.9 = strict.</div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Consensus Threshold</label>
          <input
            type="number"
            className={styles.formInput}
            value={config.consensusThreshold}
            min={0.05}
            max={0.30}
            step={0.05}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              updateField("consensusThreshold", isNaN(v) ? 0.2 : v);
            }}
          />
          <div className={styles.formHelp}>Max allowed diff between models. 0.2 = 20% max disagreement.</div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Default Score</label>
          <input
            type="number"
            className={styles.formInput}
            value={config.defaultScore}
            min={0}
            max={1}
            step={0.1}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              updateField("defaultScore", isNaN(v) ? 0.5 : v);
            }}
          />
          <div className={styles.formHelp}>Fallback for unknown sources. 0.5 = neutral. Lower = more skeptical.</div>
        </div>
      </div>

      {/* Cache Settings */}
      <h3 className={styles.formSectionTitle}>Cache Settings</h3>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Cache TTL (days)</label>
        <input
          type="number"
          className={styles.formInput}
          value={config.cacheTtlDays}
          min={1}
          max={365}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            updateField("cacheTtlDays", isNaN(v) ? 90 : v);
          }}
        />
        <div className={styles.formHelp}>How long to cache reliability scores</div>
      </div>

      {/* Filtering */}
      <h3 className={styles.formSectionTitle}>Low-Value Filtering (60% cost savings)</h3>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          <input
            type="checkbox"
            checked={config.filterEnabled}
            onChange={(e) => updateField("filterEnabled", e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Enable Importance Filter
        </label>
        <div className={styles.formHelp}>Skip evaluation for blogs and spam domains</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Skip Platforms</label>
          <input
            type="text"
            className={styles.formInput}
            value={(config.skipPlatforms || []).join(", ")}
            onChange={(e) => updateField("skipPlatforms", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
          />
          <div className={styles.formHelp}>Comma-separated platform domains</div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Skip TLDs</label>
          <input
            type="text"
            className={styles.formInput}
            value={(config.skipTlds || []).join(", ")}
            onChange={(e) => updateField("skipTlds", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
          />
          <div className={styles.formHelp}>Comma-separated TLDs to skip</div>
        </div>
      </div>

      {/* Rate Limiting */}
      <h3 className={styles.formSectionTitle}>Rate Limiting</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Rate Limit per IP</label>
          <input
            type="number"
            className={styles.formInput}
            value={config.rateLimitPerIp ?? 10}
            min={1}
            max={100}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              updateField("rateLimitPerIp", isNaN(v) ? 10 : v);
            }}
          />
          <div className={styles.formHelp}>Max evaluations/minute per IP</div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Domain Cooldown (sec)</label>
          <input
            type="number"
            className={styles.formInput}
            value={config.domainCooldownSec ?? 60}
            min={0}
            max={3600}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              updateField("domainCooldownSec", isNaN(v) ? 60 : v);
            }}
          />
          <div className={styles.formHelp}>Cooldown before re-evaluating same domain</div>
        </div>
      </div>

      {/* Evaluation Search */}
      <h3 className={styles.formSectionTitle}>Evaluation Search</h3>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          <input
            type="checkbox"
            checked={config.evalUseSearch ?? true}
            onChange={(e) => updateField("evalUseSearch", e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Enable Search During Evaluation
        </label>
        <div className={styles.formHelp}>Uses web search results to ground SR evaluations</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Max Results per Query</label>
          <input
            type="number"
            className={styles.formInput}
            value={config.evalSearchMaxResultsPerQuery ?? 3}
            min={1}
            max={10}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              updateField("evalSearchMaxResultsPerQuery", isNaN(v) ? 3 : v);
            }}
          />
          <div className={styles.formHelp}>Upper bound per SR evaluation query</div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Max Evidence Items</label>
          <input
            type="number"
            className={styles.formInput}
            value={config.evalMaxEvidenceItems ?? 12}
            min={1}
            max={20}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              updateField("evalMaxEvidenceItems", isNaN(v) ? 12 : v);
            }}
          />
          <div className={styles.formHelp}>Total evidence items collected per evaluation</div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Date Restrict</label>
          <select
            className={styles.formInput}
            value={config.evalSearchDateRestrict ?? ""}
            onChange={(e) => {
              const v = e.target.value as "" | "y" | "m" | "w";
              updateField("evalSearchDateRestrict", v === "" ? null : v);
            }}
          >
            <option value="">Use search config</option>
            <option value="y">Past year</option>
            <option value="m">Past month</option>
            <option value="w">Past week</option>
          </select>
          <div className={styles.formHelp}>Override search recency for SR evaluation</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ConfigAdminPage() {
  // Admin auth for API requests
  const { getHeaders } = useAdminAuth();

  // Query params for deep linking from job reports
  // Note: We use window.location.search directly for reliability (useSearchParams may not have values during SSR/hydration)
  useSearchParams(); // Keep hook call for Next.js Suspense boundary requirement

  // Track if URL params have been applied (to handle Next.js hydration)
  const [urlParamsApplied, setUrlParamsApplied] = useState(false);

  // Store the initial URL params (used for profile injection and display)
  const [urlProfile, setUrlProfile] = useState<string | null>(null);

  // State - initialize with defaults, URL params applied via effect after mount
  const [selectedType, setSelectedType] = useState<ConfigType>("search");
  const [profileKey, setProfileKey] = useState<string>("default");
  const [activeTab, setActiveTab] = useState<Tab>("active");
  const [targetHash, setTargetHash] = useState<string | null>(null);

  // Sync URL params to state after mount - use window.location directly for reliability
  useEffect(() => {
    if (urlParamsApplied) return;

    // Use window.location.search directly - it's always available on client
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type") as ConfigType | null;
    const profile = params.get("profile");
    const hash = params.get("hash");
    const tab = params.get("tab") as Tab | null;

    // Store the URL profile for later use
    if (profile) setUrlProfile(profile);

    // Apply params if any exist
    if (type) setSelectedType(type);
    if (profile) setProfileKey(profile);
    if (hash) setTargetHash(hash);
    if (tab) setActiveTab(tab);

    setUrlParamsApplied(true);
  }, [urlParamsApplied]);
  const [activeConfig, setActiveConfig] = useState<ConfigVersion | null>(null);
  const [viewingVersion, setViewingVersion] = useState<ConfigVersion | null>(null); // Specific version from URL
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [effectiveConfig, setEffectiveConfig] = useState<EffectiveConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active config dashboard state
  const [dashboardData, setDashboardData] = useState<ActiveSummaryResponse | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Config cache diagnostics
  const [cacheStatus, setCacheStatus] = useState<CacheStatusResponse | null>(null);
  const [cacheLoading, setCacheLoading] = useState(false);

  // Diff comparison state
  const [selectedForDiff, setSelectedForDiff] = useState<string[]>([]);
  const [diffData, setDiffData] = useState<any>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  // Default comparison state
  const [defaultComparison, setDefaultComparison] = useState<{
    hasDefaults: boolean;
    customizedFields: string[];
    totalFields: number;
    customizedCount: number;
    percentageCustomized: number;
  } | null>(null);

  // Hash search state
  const [hashSearch, setHashSearch] = useState("");
  const [hashSearchResults, setHashSearchResults] = useState<ConfigVersion[] | null>(null);
  const [hashSearching, setHashSearching] = useState(false);

  // Edit state (for JSON configs)
  const [editConfig, setEditConfig] = useState<SearchConfig | CalcConfig | PipelineConfig | SRConfig | null>(null);
  const [versionLabel, setVersionLabel] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [fileWriteAllowed, setFileWriteAllowed] = useState(false);
  const [fileWriteChecking, setFileWriteChecking] = useState(false);
  const [savingToFile, setSavingToFile] = useState(false);

  // Prompt edit state
  const [promptContent, setPromptContent] = useState<string>("");
  const [promptDirty, setPromptDirty] = useState(false);

  // Track if JSON config has been modified (compare with activeConfig)
  // Only compare if activeConfig matches current type AND profile to prevent race conditions
  const hasUnsavedJsonChanges = useMemo(() => {
    if (!editConfig || selectedType === "prompt") return false;
    // Verify activeConfig is for the current type/profile before comparing
    if (
      !activeConfig?.content ||
      activeConfig.configType !== selectedType ||
      activeConfig.profileKey !== profileKey
    ) {
      // No valid activeConfig for comparison - treat as unsaved if we have edits
      return !!editConfig;
    }
    try {
      // Compare with same formatting used when saving (2-space indentation)
      const current = JSON.stringify(editConfig, null, 2);
      const active = activeConfig.content;
      return current !== active;
    } catch {
      return false;
    }
  }, [editConfig, activeConfig, selectedType, profileKey]);

  // Combined unsaved changes check
  const hasUnsavedChanges = promptDirty || hasUnsavedJsonChanges;

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Keyboard shortcut for save (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (activeTab !== "edit") return;

        // Trigger save based on config type
        if (selectedType === "prompt" && promptContent && promptDirty) {
          // Find and click the Save & Activate button for prompts
          const saveBtn = document.querySelector('[data-save-prompt-activate]') as HTMLButtonElement;
          if (saveBtn && !saveBtn.disabled) saveBtn.click();
        } else if (selectedType !== "prompt" && editConfig && hasUnsavedJsonChanges) {
          // Find and click the Save & Activate button for JSON configs
          const saveBtn = document.querySelector('[data-save-json-activate]') as HTMLButtonElement;
          if (saveBtn && !saveBtn.disabled) saveBtn.click();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, selectedType, promptContent, promptDirty, editConfig, hasUnsavedJsonChanges]);

  // Auto-validate prompts with debounce
  useEffect(() => {
    if (selectedType !== "prompt" || !promptContent) {
      return;
    }
    // Clear stale validation when content matches active (no unsaved changes)
    if (!promptDirty) {
      setValidation(null);
      return;
    }
    const abortController = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/config/prompt/${profileKey}/validate`, {
          method: "POST",
          headers: { ...getHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ content: promptContent }),
          signal: abortController.signal,
        });
        if (!res.ok) {
          // API error - don't set malformed data as validation state
          return;
        }
        const data = await res.json();
        setValidation(data);
      } catch (err) {
        // Silently fail - user can manually validate (or request was aborted)
        if (err instanceof Error && err.name !== "AbortError") {
          // Log non-abort errors for debugging if needed
        }
      }
    }, 800); // 800ms debounce
    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [selectedType, promptContent, promptDirty, profileKey, getHeaders]);

  // Auto-validate JSON configs with debounce
  useEffect(() => {
    if (selectedType === "prompt" || !editConfig) {
      return;
    }
    // Clear stale validation when content matches active (no unsaved changes)
    if (!hasUnsavedJsonChanges) {
      setValidation(null);
      return;
    }
    const abortController = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/config/${selectedType}/${profileKey}/validate`, {
          method: "POST",
          headers: { ...getHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ content: JSON.stringify(editConfig, null, 2) }),
          signal: abortController.signal,
        });
        if (!res.ok) {
          // API error - don't set malformed data as validation state
          return;
        }
        const data = await res.json();
        setValidation(data);
      } catch (err) {
        // Silently fail - user can manually validate (or request was aborted)
        if (err instanceof Error && err.name !== "AbortError") {
          // Log non-abort errors for debugging if needed
        }
      }
    }, 800); // 800ms debounce
    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [selectedType, editConfig, hasUnsavedJsonChanges, profileKey, getHeaders]);

  // Profile options
  // Fetch profile options from backend
  const [profileOptions, setProfileOptions] = useState<string[]>(
    selectedType === "prompt"
      ? ["orchestrated", "monolithic-canonical", "monolithic-dynamic", "source-reliability"]
      : ["default"]
  );
  const [profileNotFound, setProfileNotFound] = useState(false);

  useEffect(() => {
    // Fetch profiles from backend
    fetch(`/api/admin/config/${selectedType}/profiles`, { headers: getHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profiles?.length) {
          let profiles = data.profiles as string[];

          // If URL specifies a profile not in the list, inject it so dropdown works
          // (the config may still exist even if not in "known" profiles)
          if (urlProfile && !profiles.includes(urlProfile)) {
            profiles = [urlProfile, ...profiles];
            setProfileNotFound(true);
          } else {
            setProfileNotFound(false);
          }

          setProfileOptions(profiles);

          // If current profile is not in new list, and no URL profile, select first
          if (!urlProfile && !profiles.includes(profileKey)) {
            setProfileKey(profiles[0]);
          }
        }
      })
      .catch(() => {
        // Fallback to defaults on error
        const defaults = selectedType === "prompt"
          ? ["orchestrated", "monolithic-canonical", "monolithic-dynamic", "source-reliability"]
          : ["default"];
        // Still inject urlProfile if present
        if (urlProfile && !defaults.includes(urlProfile)) {
          setProfileOptions([urlProfile, ...defaults]);
          setProfileNotFound(true);
        } else {
          setProfileOptions(defaults);
          setProfileNotFound(false);
        }
      });
  }, [selectedType, getHeaders, urlProfile]);

  useEffect(() => {
    if (selectedType === "prompt") {
      setFileWriteAllowed(false);
      setFileWriteChecking(false);
      return;
    }

    let cancelled = false;
    setFileWriteChecking(true);
    fetch(`/api/admin/config/${selectedType}/${profileKey}/save-to-file`, { headers: getHeaders() })
      .then(async (res) => {
        let data: any = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }
        return { ok: res.ok, data };
      })
      .then(({ ok, data }) => {
        if (cancelled) return;
        setFileWriteAllowed(Boolean(ok && data?.fileWriteAllowed));
      })
      .catch(() => {
        if (!cancelled) {
          setFileWriteAllowed(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setFileWriteChecking(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedType, profileKey, getHeaders]);

  // Update profile when type changes (but not on initial load with URL params)
  useEffect(() => {
    if (!urlProfile && profileOptions.length > 0 && !profileOptions.includes(profileKey)) {
      setProfileKey(profileOptions[0]);
    }
    setEditConfig(null);
    setValidation(null);
    setPromptContent("");
    setPromptDirty(false);
  }, [selectedType, profileOptions, urlProfile, profileKey]);

  // Load specific version from URL hash (deep link from job report)
  useEffect(() => {
    // Wait for URL params to be applied before fetching (prevents race condition)
    if (!urlParamsApplied) {
      return;
    }

    if (targetHash && selectedType && profileKey) {
      setLoading(true);
      setError(null); // Clear any previous error
      setViewingVersion(null); // Clear previous version while loading
      fetch(`/api/admin/config/${selectedType}/${profileKey}/version/${targetHash}`, {
        headers: getHeaders(),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setViewingVersion(data);
            setError(null); // Ensure error is cleared on success
          } else {
            setViewingVersion(null);
            setError(`Version ${targetHash.slice(0, 8)}... not found`);
          }
        })
        .catch((err) => {
          setViewingVersion(null);
          setError(err.message);
        })
        .finally(() => setLoading(false));
    }
  }, [targetHash, selectedType, profileKey, getHeaders, urlParamsApplied]);

  // Initialize edit config when switching to edit tab
  // Only use activeConfig if it matches the current selectedType to prevent race conditions
  useEffect(() => {
    if (activeTab === "edit" && !editConfig && selectedType !== "prompt") {
      // Only initialize from activeConfig if it matches the current type
      if (activeConfig?.content && activeConfig.configType === selectedType) {
        try {
          setEditConfig(JSON.parse(activeConfig.content));
        } catch {
          // Use default on parse failure
          setEditConfig(getDefaultConfigForType(selectedType));
        }
      } else if (activeConfig === null && !loading) {
        // No config exists for this type/profile - use defaults
        setEditConfig(getDefaultConfigForType(selectedType));
      }
      // If activeConfig exists but wrong type, wait for fetchActiveConfig() to complete
    }
  }, [activeTab, activeConfig, editConfig, selectedType, loading]);

  // Fetch active config
  const fetchActiveConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/config/${selectedType}/${profileKey}`, {
        headers: getHeaders(),
      });
      if (res.status === 404) {
        setActiveConfig(null);
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setActiveConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setActiveConfig(null);
    } finally {
      setLoading(false);
    }
  }, [selectedType, profileKey, getHeaders]);

  // Fetch dashboard summary
  const fetchDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const res = await fetch("/api/admin/config/active-summary", {
        headers: getHeaders(),
      });
      if (!res.ok) {
        throw new Error("Failed to load dashboard");
      }
      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      console.error("[Dashboard] Error loading active configs:", err);
      setDashboardData(null);
    } finally {
      setDashboardLoading(false);
    }
  }, [getHeaders]);

  const fetchCacheStatus = useCallback(async () => {
    setCacheLoading(true);
    try {
      const res = await fetch("/api/admin/config/cache", {
        headers: getHeaders(),
      });
      if (!res.ok) {
        throw new Error("Failed to load cache status");
      }
      const data = await res.json();
      setCacheStatus(data);
    } catch (err) {
      console.error("[CacheStatus] Error loading cache status:", err);
      setCacheStatus(null);
    } finally {
      setCacheLoading(false);
    }
  }, [getHeaders]);

  // Fetch diff comparison
  const fetchDiff = useCallback(async (hash1: string, hash2: string) => {
    setDiffLoading(true);
    setDiffData(null);
    try {
      const res = await fetch(`/api/admin/config/diff?hash1=${hash1}&hash2=${hash2}`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate diff");
      }
      const data = await res.json();
      setDiffData(data);
    } catch (err) {
      toast.error(`Diff error: ${err instanceof Error ? err.message : String(err)}`);
      setDiffData(null);
    } finally {
      setDiffLoading(false);
    }
  }, [getHeaders]);

  // Fetch default comparison
  const fetchDefaultComparison = useCallback(async () => {
    if (selectedType === "prompt") {
      setDefaultComparison(null);
      return;
    }
    try {
      const res = await fetch(`/api/admin/config/default-comparison?type=${selectedType}&profile=${profileKey}`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        setDefaultComparison(null);
        return;
      }
      const data = await res.json();
      setDefaultComparison(data);
    } catch (err) {
      console.error("[DefaultComparison] Error:", err);
      setDefaultComparison(null);
    }
  }, [selectedType, profileKey, getHeaders]);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/config/${selectedType}/${profileKey}/history`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setHistory(null);
    } finally {
      setLoading(false);
    }
  }, [selectedType, profileKey, getHeaders]);

  // Fetch effective config (with overrides)
  const fetchEffectiveConfig = useCallback(async () => {
    if (selectedType === "prompt") {
      setEffectiveConfig(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/config/${selectedType}/${profileKey}/effective`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setEffectiveConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setEffectiveConfig(null);
    } finally {
      setLoading(false);
    }
  }, [selectedType, profileKey, getHeaders]);

  // Validate config
  const validateConfig = useCallback(async () => {
    if (!editConfig) return;

    try {
      const res = await fetch(`/api/admin/config/${selectedType}/${profileKey}/validate`, {
        method: "POST",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ content: JSON.stringify(editConfig, null, 2) }),
      });
      const data = await res.json();
      setValidation(data);
    } catch (err) {
      setValidation({
        valid: false,
        errors: [err instanceof Error ? err.message : String(err)],
        warnings: [],
      });
    }
  }, [editConfig, selectedType, profileKey, getHeaders]);

  // Save and activate config
  const saveConfig = async (activate: boolean) => {
    if (!editConfig) return;

    setSaving(true);
    setError(null);

    try {
      const content = JSON.stringify(editConfig, null, 2);
      const label = versionLabel || suggestVersionLabel();

      // Save
      const saveRes = await fetch(`/api/admin/config/${selectedType}/${profileKey}`, {
        method: "PUT",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ content, versionLabel: label }),
      });

      if (!saveRes.ok) {
        const data = await saveRes.json();
        throw new Error(data.error || "Failed to save");
      }

      const saveData = await saveRes.json();

      // Activate if requested
      if (activate) {
        const activateRes = await fetch(`/api/admin/config/${selectedType}/${profileKey}/activate`, {
          method: "POST",
          headers: { ...getHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ contentHash: saveData.contentHash }),
        });

        if (!activateRes.ok) {
          throw new Error("Saved but failed to activate");
        }
      }

      // Refresh data
      fetchActiveConfig();
      fetchHistory();
      setVersionLabel("");
      toast.success(activate ? "Config saved and activated!" : "Config saved as draft");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(`Save failed: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveToFile = useCallback(async (dryRun: boolean) => {
    if (selectedType === "prompt") return;

    setSavingToFile(true);
    try {
      const res = await fetch(`/api/admin/config/${selectedType}/${profileKey}/save-to-file`, {
        method: "POST",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Save to file failed");
      }

      if (dryRun) {
        toast.success("Preview ready");
        alert(
          `Preview:\n` +
          `File: ${data.filePath}\n` +
          `Checksum: ${data.checksum}\n` +
          `Schema: ${data.schemaVersion}`,
        );
      } else {
        toast.success("Saved to file");
      }

      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        toast((t) => (
          <span>
            Warnings: {data.warnings.join("; ")}
          </span>
        ));
      }
    } catch (err) {
      toast.error(`Save-to-file failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSavingToFile(false);
    }
  }, [selectedType, profileKey, getHeaders]);

  // Load data when tab/type/profile changes
  useEffect(() => {
    if (activeTab === "active") {
      fetchActiveConfig();
    } else if (activeTab === "history") {
      fetchHistory();
    } else if (activeTab === "effective") {
      fetchEffectiveConfig();
    } else if (activeTab === "edit" && selectedType === "prompt" && !promptContent && !promptDirty) {
      // Load prompt content for editing
      fetchActiveConfig();
    } else if (activeTab === "edit" && selectedType !== "prompt" && !editConfig) {
      // Load JSON config for editing (search/calculation)
      fetchActiveConfig();
    }
  }, [activeTab, selectedType, profileKey, fetchActiveConfig, fetchHistory, fetchEffectiveConfig, promptContent, promptDirty, editConfig]);

  // Load dashboard on mount
  useEffect(() => {
    fetchDashboard();
    fetchCacheStatus();
  }, [fetchDashboard, fetchCacheStatus]);

  // Load default comparison when viewing active or editing
  useEffect(() => {
    if (activeTab === "active" || activeTab === "edit") {
      fetchDefaultComparison();
    }
  }, [activeTab, selectedType, profileKey, fetchDefaultComparison]);

  // Initialize prompt content from active config when available
  // Only use activeConfig if it matches current type AND profile to prevent race conditions
  useEffect(() => {
    if (
      selectedType === "prompt" &&
      activeConfig?.content &&
      activeConfig.configType === "prompt" &&
      activeConfig.profileKey === profileKey &&
      !promptContent &&
      !promptDirty
    ) {
      setPromptContent(activeConfig.content);
    }
  }, [selectedType, activeConfig, profileKey, promptContent, promptDirty]);

  // Copy content to clipboard
  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  // Format date
  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString();
  };

  const isRecentlyUpdated = (iso?: string | null) => {
    if (!iso) return false;
    const delta = Date.now() - Date.parse(iso);
    return !Number.isNaN(delta) && delta < 60_000;
  };

  // Truncate hash for display
  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  // Generate suggested version label with timestamp
  const suggestVersionLabel = () => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const time = now.toTimeString().slice(0, 5).replace(":", ""); // HHMM
    return `v${date}-${time}`;
  };

  // Import JSON handler with schema validation
  const handleImport = async () => {
    // Check for unsaved changes before importing (consistent with Reset to Default)
    if (hasUnsavedJsonChanges && !confirm("You have unsaved changes. Import and overwrite anyway?")) {
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        // Validate structure matches expected config type
        if (selectedType === "search") {
          // Check required top-level keys for search config
          if (typeof parsed.enabled !== "boolean" || typeof parsed.provider !== "string") {
            throw new Error("Invalid search config: missing 'enabled' or 'provider' fields");
          }
        } else if (selectedType === "calculation") {
          // Check required top-level keys for calculation config
          if (!parsed.aggregation || !parsed.verdictBands || !parsed.sourceReliability) {
            throw new Error("Invalid calculation config: missing 'aggregation', 'verdictBands', or 'sourceReliability' fields");
          }
        }

        setEditConfig(parsed);
        setValidation(null);
      } catch (err) {
        toast.error(`Failed to import: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    input.click();
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Configuration Management</h1>
        <p className={styles.subtitle}>
          View and manage search, calculation, and prompt configurations
        </p>
      </div>

      {/* Hash Search */}
      <div style={{ marginBottom: 32, maxWidth: 800 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: "#374151" }}>
          🔎 Search by Config Hash
        </h2>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <input
            type="text"
            placeholder="Enter full or partial hash (min 4 chars)..."
            value={hashSearch}
            onChange={(e) => setHashSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && hashSearch.length >= 4) {
                setHashSearching(true);
                fetch(`/api/admin/config/search-hash?q=${encodeURIComponent(hashSearch)}`, {
                  headers: getHeaders(),
                })
                  .then((res) => res.json())
                  .then((data) => {
                    if (data.results) {
                      setHashSearchResults(data.results);
                      if (data.results.length === 0) {
                        toast("No configs found matching that hash");
                      }
                    } else {
                      toast.error("Search failed");
                      setHashSearchResults(null);
                    }
                  })
                  .catch((err) => {
                    toast.error(`Search failed: ${err.message}`);
                    setHashSearchResults(null);
                  })
                  .finally(() => setHashSearching(false));
              }
            }}
            style={{
              flex: 1,
              padding: "10px 14px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
              fontFamily: "monospace",
            }}
          />
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            disabled={hashSearch.length < 4 || hashSearching}
            onClick={() => {
              if (hashSearch.length >= 4) {
                setHashSearching(true);
                fetch(`/api/admin/config/search-hash?q=${encodeURIComponent(hashSearch)}`, {
                  headers: getHeaders(),
                })
                  .then((res) => res.json())
                  .then((data) => {
                    if (data.results) {
                      setHashSearchResults(data.results);
                      if (data.results.length === 0) {
                        toast("No configs found matching that hash");
                      }
                    } else {
                      toast.error("Search failed");
                      setHashSearchResults(null);
                    }
                  })
                  .catch((err) => {
                    toast.error(`Search failed: ${err.message}`);
                    setHashSearchResults(null);
                  })
                  .finally(() => setHashSearching(false));
              }
            }}
            style={{ padding: "10px 20px", fontSize: 14 }}
          >
            {hashSearching ? "Searching..." : "Search"}
          </button>
          {hashSearchResults && (
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={() => {
                setHashSearch("");
                setHashSearchResults(null);
              }}
              style={{ padding: "10px 16px", fontSize: 14 }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Search results */}
        {hashSearchResults && hashSearchResults.length > 0 && (
          <div style={{ marginTop: 16, border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ background: "#f9fafb", padding: 12, borderBottom: "1px solid #e5e7eb", fontWeight: 600, fontSize: 13 }}>
              Found {hashSearchResults.length} result{hashSearchResults.length !== 1 ? "s" : ""}
            </div>
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {hashSearchResults.map((result) => (
                <div
                  key={result.contentHash}
                  style={{
                    padding: 12,
                    borderBottom: "1px solid #f3f4f6",
                    cursor: "pointer",
                    background: "#fff",
                  }}
                  onClick={() => {
                    // Navigate to this specific config version
                    setSelectedType(result.configType as ConfigType);
                    setProfileKey(result.profileKey);
                    setTargetHash(result.contentHash);
                    setActiveTab("active");
                    setHashSearchResults(null);
                    setHashSearch("");
                    toast.success(`Loaded ${result.configType}/${result.profileKey} - ${result.versionLabel}`);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#fff";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        background: result.isActive ? "#d1fae5" : "#e5e7eb",
                        color: result.isActive ? "#065f46" : "#374151",
                        borderRadius: 4,
                        fontWeight: 600,
                      }}
                    >
                      {result.configType}
                    </span>
                    <strong style={{ fontSize: 13 }}>{result.profileKey}</strong>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>v{result.versionLabel}</span>
                    {result.isActive && (
                      <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>● ACTIVE</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#6b7280" }}>
                    {result.contentHash}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                    Created: {new Date(result.createdUtc).toLocaleDateString()} {new Date(result.createdUtc).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Config Dashboard */}
      <div style={{ marginBottom: 32, maxWidth: 1200 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "#374151" }}>
          📊 Active Configurations Overview
        </h2>
        {dashboardLoading ? (
          <div style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>Loading active configs...</div>
        ) : dashboardData ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {Object.entries(dashboardData.activeConfigs).map(([configType, configs]) => {
              const typeInfo = {
                search: { label: "Search Config", icon: "🔍", color: "#3b82f6" },
                calculation: { label: "Calculation Config", icon: "🧮", color: "#8b5cf6" },
                prompt: { label: "Prompts", icon: "📝", color: "#f59e0b" },
                pipeline: { label: "Pipeline Config", icon: "⚙️", color: "#10b981" },
                sr: { label: "SR Config", icon: "📊", color: "#ec4899" },
              }[configType] || { label: configType, icon: "📄", color: "#6b7280" };

              return (
                <div
                  key={configType}
                  style={{
                    border: `2px solid ${typeInfo.color}`,
                    borderRadius: 8,
                    padding: 16,
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>{typeInfo.icon}</span>
                    <strong style={{ fontSize: 14, color: typeInfo.color }}>{typeInfo.label}</strong>
                  </div>
                  {configs.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#9ca3af" }}>No active configs</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {configs.map((config) => (
                        <div
                          key={config.profileKey}
                          style={{
                            padding: 10,
                            background: "#f9fafb",
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: 4, color: "#1f2937" }}>
                            {config.profileKey}
                          </div>
                          <div style={{ color: "#6b7280", marginBottom: 2 }}>
                            v{config.versionLabel}
                          </div>
                          <div style={{ color: "#9ca3af", fontSize: 11 }}>
                            {new Date(config.activatedUtc).toLocaleDateString()} {new Date(config.activatedUtc).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: 20, textAlign: "center", color: "#ef4444" }}>
            Failed to load active configs
          </div>
        )}
      </div>

      {/* Config Cache Diagnostics */}
      <div style={{ marginBottom: 32, maxWidth: 1200 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "#374151" }}>
            🧠 Config Cache Diagnostics
          </h2>
          <button
            type="button"
            onClick={fetchCacheStatus}
            disabled={cacheLoading}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              background: cacheLoading ? "#f3f4f6" : "#fff",
              color: "#374151",
              fontSize: 12,
              cursor: cacheLoading ? "not-allowed" : "pointer",
            }}
          >
            {cacheLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {cacheLoading ? (
          <div style={{ padding: 16, textAlign: "center", color: "#6b7280" }}>Loading cache status...</div>
        ) : cacheStatus ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 14,
                background: "#fff",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8, color: "#111827" }}>Loader Cache</div>
              <div style={{ fontSize: 12, color: "#374151" }}>Entries: {cacheStatus.size}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                Keys: {cacheStatus.entries.length ? cacheStatus.entries.map((entry) => entry.key).join(", ") : "none"}
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                Last poll: {new Date(cacheStatus.lastPoll).toLocaleTimeString()}
              </div>
            </div>
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 14,
                background: "#fff",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8, color: "#111827" }}>Storage Cache</div>
              <div style={{ fontSize: 12, color: "#374151" }}>
                Entries: {cacheStatus.storageCache?.entries ?? 0}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                TTL: {cacheStatus.storageCache?.ttlMs ?? "N/A"} ms
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                Keys: {cacheStatus.storageCache?.keys?.length ? cacheStatus.storageCache.keys.join(", ") : "none"}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: 16, textAlign: "center", color: "#ef4444" }}>
            Failed to load cache status
          </div>
        )}
      </div>

      {/* Config Type Selector */}
      <div className={styles.typeSelector}>
        {CONFIG_TYPES.map((ct) => (
          <div
            key={ct.type}
            className={`${styles.typeCard} ${selectedType === ct.type ? styles.selected : ""}`}
            onClick={() => {
              if (ct.type === selectedType) return;
              if (hasUnsavedChanges) {
                if (!confirm("You have unsaved changes. Switch config type anyway?")) return;
              }
              setSelectedType(ct.type);
            }}
            role="button"
            tabIndex={0}
          >
            <div className={styles.typeCardTitle}>{ct.title}</div>
            <div className={styles.typeCardDesc}>{ct.description}</div>
          </div>
        ))}
      </div>

      {/* Profile Selector */}
      <div className={styles.profileSelector}>
        <label htmlFor="profile-select" style={{ marginRight: 8, fontWeight: 500 }}>
          Profile:
        </label>
        <select
          id="profile-select"
          className={styles.profileSelect}
          value={profileKey}
          onChange={(e) => {
            if (e.target.value === profileKey) return;
            if (hasUnsavedChanges) {
              if (!confirm("You have unsaved changes. Switch profile anyway?")) {
                // Reset the select to current value (user cancelled)
                e.target.value = profileKey;
                return;
              }
            }
            setProfileKey(e.target.value);
          }}
        >
          {profileOptions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        {profileNotFound && profileKey === urlProfile && (
          <span style={{
            marginLeft: 12,
            padding: "4px 8px",
            backgroundColor: "#fff3cd",
            color: "#856404",
            borderRadius: 4,
            fontSize: "0.85em",
          }}>
            Profile &quot;{urlProfile}&quot; not in known list (may still load)
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "active" ? styles.active : ""}`}
          onClick={() => setActiveTab("active")}
        >
          Active Config
        </button>
        <button
          className={`${styles.tab} ${activeTab === "history" ? styles.active : ""}`}
          onClick={() => setActiveTab("history")}
        >
          History
        </button>
        <button
          className={`${styles.tab} ${activeTab === "edit" ? styles.active : ""}`}
          onClick={() => setActiveTab("edit")}
        >
          Edit {hasUnsavedChanges && <span style={{ color: "#f59e0b", marginLeft: 4 }}>●</span>}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "effective" ? styles.active : ""}`}
          onClick={() => setActiveTab("effective")}
          disabled={selectedType === "prompt"}
          title={selectedType === "prompt" ? "N/A for prompts (no env overrides)" : "View config with environment overrides applied"}
        >
          Effective
        </button>
        {selectedType === "prompt" && (
          <>
            <button
              className={`${styles.tab}`}
              onClick={async () => {
                const url = `/api/admin/config/prompt/${profileKey}/export`;
                const res = await fetch(url, { headers: getHeaders() });
                if (!res.ok) {
                  toast.error("Export failed: " + (await res.json()).error);
                  return;
                }
                const blob = await res.blob();
                const defaultFilename = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || `${profileKey}.prompt.md`;

                // Try File System Access API for folder selection, fallback to download
                if ("showSaveFilePicker" in window) {
                  try {
                    const handle = await (window as any).showSaveFilePicker({
                      suggestedName: defaultFilename,
                      types: [{
                        description: "Prompt Markdown",
                        accept: { "text/markdown": [".md", ".prompt.md"] },
                      }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    toast.success(`Exported to: ${handle.name}`);
                  } catch (err: any) {
                    if (err.name !== "AbortError") {
                      toast.error(`Export failed: ${err.message}`);
                    }
                  }
                } else {
                  // Fallback: standard download
                  const a = document.createElement("a");
                  const objectUrl = URL.createObjectURL(blob);
                  a.href = objectUrl;
                  a.download = defaultFilename;
                  a.click();
                  URL.revokeObjectURL(objectUrl);
                }
              }}
            >
              Export
            </button>
            <button
              className={`${styles.tab}`}
              onClick={async () => {
                // Try File System Access API for folder selection, fallback to input
                if ("showOpenFilePicker" in window) {
                  try {
                    const [handle] = await (window as any).showOpenFilePicker({
                      types: [{
                        description: "Prompt Markdown",
                        accept: { "text/markdown": [".md"] },
                      }],
                    });
                    const file = await handle.getFile();
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("activateImmediately", "true");

                    const res = await fetch(`/api/admin/config/prompt/${profileKey}/import`, {
                      method: "POST",
                      headers: {
                        "x-admin-key": process.env.NEXT_PUBLIC_ADMIN_KEY || "",
                      },
                      body: formData,
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                      toast.success(`Import successful!\nVersion: ${data.versionLabel || "new"}\nActivated: ${data.activated ? "Yes" : "No"}`);
                      fetchActiveConfig();
                      fetchHistory();
                    } else {
                      toast.error(`Import failed: ${data.error || "Unknown error"}\n${data.errors?.join("\n") || ""}`);
                    }
                  } catch (err: any) {
                    if (err.name !== "AbortError") {
                      toast.error(`Import failed: ${err.message}`);
                    }
                  }
                } else {
                  // Fallback: hidden file input
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".md,.prompt.md";
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;

                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("activateImmediately", "true");

                    try {
                      const res = await fetch(`/api/admin/config/prompt/${profileKey}/import`, {
                        method: "POST",
                        headers: {
                          "x-admin-key": process.env.NEXT_PUBLIC_ADMIN_KEY || "",
                        },
                        body: formData,
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        toast.success(`Import successful!\nVersion: ${data.versionLabel || "new"}\nActivated: ${data.activated ? "Yes" : "No"}`);
                        fetchActiveConfig();
                        fetchHistory();
                      } else {
                        toast.error(`Import failed: ${data.error || "Unknown error"}\n${data.errors?.join("\n") || ""}`);
                      }
                    } catch (err) {
                      toast.error(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
                    }
                  };
                  input.click();
                }
              }}
            >
              Import
            </button>
          </>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className={styles.error}>
          Error: {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className={styles.loading}>
          Loading...
        </div>
      )}

      {/* Active Config Tab */}
      {activeTab === "active" && !loading && (
        <>
          {/* Show banner if viewing a specific version from URL */}
          {viewingVersion && targetHash && (
            <div style={{
              marginBottom: 16,
              padding: "12px 16px",
              background: "#dbeafe",
              border: "1px solid #93c5fd",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}>
              <div>
                <span style={{ fontWeight: 500 }}>📌 Viewing specific version from job report:</span>
                <span style={{ marginLeft: 8, fontFamily: "monospace", fontSize: 12 }}>
                  {truncateHash(targetHash)}
                </span>
                {viewingVersion.contentHash !== activeConfig?.contentHash && (
                  <span style={{ marginLeft: 8, color: "#92400e", fontSize: 12 }}>
                    (not the currently active version)
                  </span>
                )}
              </div>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={() => {
                  setTargetHash(null);
                  setViewingVersion(null);
                  // Clear URL params
                  window.history.replaceState({}, "", "/admin/config");
                }}
              >
                Clear &amp; show active
              </button>
            </div>
          )}

          {/* Show either the specific version or active config */}
          {(viewingVersion || activeConfig) ? (
            <div className={styles.configViewer}>
              <div className={styles.configHeader}>
                <div className={styles.configMeta}>
                  <div className={styles.configLabel}>
                    {(viewingVersion || activeConfig)!.versionLabel}
                    {viewingVersion && viewingVersion.contentHash === activeConfig?.contentHash ? (
                      <span className={`${styles.status} ${styles.statusActive}`} style={{ marginLeft: 8 }}>
                        Active
                      </span>
                    ) : viewingVersion ? (
                      <span className={styles.status} style={{ marginLeft: 8, background: "#dbeafe", color: "#1e40af" }}>
                        Historical
                      </span>
                    ) : (
                      <span className={`${styles.status} ${styles.statusActive}`} style={{ marginLeft: 8 }}>
                        Active
                      </span>
                    )}
                  </div>
                  <div className={styles.configHash} title={(viewingVersion || activeConfig)!.contentHash}>
                    Hash: {truncateHash((viewingVersion || activeConfig)!.contentHash)}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Schema: {(viewingVersion || activeConfig)!.schemaVersion} |
                    Created: {formatDate((viewingVersion || activeConfig)!.createdUtc)}
                    {(viewingVersion || activeConfig)!.createdBy && ` by ${(viewingVersion || activeConfig)!.createdBy}`}
                    {" | "}
                    Updated: {formatDate((viewingVersion || activeConfig)!.updatedUtc || (viewingVersion || activeConfig)!.createdUtc)}
                    {(viewingVersion || activeConfig)!.updatedBy && ` by ${(viewingVersion || activeConfig)!.updatedBy}`}
                    {isRecentlyUpdated((viewingVersion || activeConfig)!.updatedUtc || (viewingVersion || activeConfig)!.createdUtc) && (
                      <span style={{ color: "#d97706", marginLeft: 8 }}>⚠️ Recently modified</span>
                    )}
                  </div>
                </div>
                <div className={styles.configActions}>
                  <button
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    onClick={() => copyToClipboard((viewingVersion || activeConfig)!.content)}
                  >
                    Copy
                  </button>
                  <button
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    onClick={() => {
                      const cfg = viewingVersion || activeConfig;
                      const blob = new Blob([cfg!.content], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${selectedType}-${profileKey}-${cfg!.contentHash.slice(0, 8)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download
                  </button>
                  {selectedType !== "prompt" && (
                    <button
                      className={`${styles.button} ${styles.buttonPrimary}`}
                      onClick={() => {
                        try {
                          setEditConfig(JSON.parse((viewingVersion || activeConfig)!.content));
                          setActiveTab("edit");
                        } catch {
                          toast.error("Failed to parse config for editing");
                        }
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Default comparison indicator */}
              {defaultComparison && defaultComparison.hasDefaults && !viewingVersion && (
                <div
                  style={{
                    padding: 12,
                    marginBottom: 16,
                    background: defaultComparison.customizedCount > 0 ? "#fef3c7" : "#d1fae5",
                    borderLeft: `4px solid ${defaultComparison.customizedCount > 0 ? "#f59e0b" : "#10b981"}`,
                    borderRadius: 4,
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {defaultComparison.customizedCount === 0 ? (
                      <>✓ Using default configuration</>
                    ) : (
                      <>⚠️ {defaultComparison.customizedCount} field{defaultComparison.customizedCount > 1 ? "s" : ""} customized from defaults ({defaultComparison.percentageCustomized}%)</>
                    )}
                  </div>
                  {defaultComparison.customizedCount > 0 && (
                    <details style={{ marginTop: 8 }}>
                      <summary style={{ cursor: "pointer", color: "#92400e" }}>
                        Show customized fields ({defaultComparison.customizedFields.length})
                      </summary>
                      <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20, fontSize: 12, fontFamily: "monospace" }}>
                        {defaultComparison.customizedFields.slice(0, 20).map((field, idx) => (
                          <li key={idx} style={{ marginBottom: 2 }}>
                            {field}
                          </li>
                        ))}
                        {defaultComparison.customizedFields.length > 20 && (
                          <li style={{ color: "#6b7280" }}>... and {defaultComparison.customizedFields.length - 20} more</li>
                        )}
                      </ul>
                    </details>
                  )}
                </div>
              )}

              <pre className={styles.configContent}>
                {(viewingVersion || activeConfig)!.content}
              </pre>
            </div>
          ) : !error && !viewingVersion && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📋</div>
              <div className={styles.emptyText}>No active config found</div>
              <div className={styles.emptyHint}>
                Create a new config using the Edit tab
              </div>
              {selectedType !== "prompt" && (
                <button
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  style={{ marginTop: 16 }}
                  onClick={() => {
                    setEditConfig(getDefaultConfigForType(selectedType));
                    setActiveTab("edit");
                  }}
                >
                  Create Default Config
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* History Tab */}
      {activeTab === "history" && !loading && (
        <>
          {history && history.versions.length > 0 ? (
            <>
              {/* Diff comparison controls */}
              <div style={{ marginBottom: 16, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 14 }}>Compare Versions:</strong>
                  <button
                    className={`${styles.button} ${styles.buttonPrimary}`}
                    disabled={selectedForDiff.length !== 2 || diffLoading}
                    onClick={() => {
                      if (selectedForDiff.length === 2) {
                        fetchDiff(selectedForDiff[0], selectedForDiff[1]);
                      }
                    }}
                    style={{ fontSize: 13 }}
                  >
                    {diffLoading ? "Loading..." : "Compare Selected"}
                  </button>
                  {selectedForDiff.length > 0 && (
                    <button
                      className={`${styles.button} ${styles.buttonSecondary}`}
                      onClick={() => {
                        setSelectedForDiff([]);
                        setDiffData(null);
                      }}
                      style={{ fontSize: 13 }}
                    >
                      Clear Selection
                    </button>
                  )}
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    {selectedForDiff.length}/2 selected
                  </span>
                </div>
              </div>

              <div className={styles.historyList}>
                {history.versions.map((v) => (
                  <div key={v.contentHash} className={styles.historyItem}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <input
                        type="checkbox"
                        checked={selectedForDiff.includes(v.contentHash)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            if (selectedForDiff.length < 2) {
                              setSelectedForDiff([...selectedForDiff, v.contentHash]);
                            }
                          } else {
                            setSelectedForDiff(selectedForDiff.filter((h) => h !== v.contentHash));
                          }
                        }}
                        disabled={!selectedForDiff.includes(v.contentHash) && selectedForDiff.length >= 2}
                        style={{ width: 16, height: 16, cursor: "pointer" }}
                      />
                      <div className={styles.historyMeta} style={{ flex: 1 }}>
                        <div className={styles.historyLabel}>
                          {v.versionLabel}
                          {v.isActive && (
                            <span className={`${styles.status} ${styles.statusActive}`} style={{ marginLeft: 8 }}>
                              Active
                            </span>
                          )}
                        </div>
                        <div className={styles.historyHash} title={v.contentHash}>
                          {truncateHash(v.contentHash)}
                        </div>
                        <div className={styles.historyDate}>
                          Created: {formatDate(v.createdUtc)}
                          {v.createdBy && ` by ${v.createdBy}`}
                        </div>
                        {v.updatedUtc && (
                          <div className={styles.historyDate}>
                            Updated: {formatDate(v.updatedUtc)}
                            {v.updatedBy && ` by ${v.updatedBy}`}
                            {isRecentlyUpdated(v.updatedUtc) && (
                              <span style={{ color: "#d97706", marginLeft: 8 }}>⚠️ Recently modified</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.historyActions}>
                    <button
                      className={`${styles.button} ${styles.buttonSecondary}`}
                      onClick={async () => {
                        const res = await fetch(`/api/admin/config/${selectedType}/${profileKey}/version/${v.contentHash}`, {
                          headers: getHeaders(),
                        });
                        const data = await res.json();
                        if (data.content) {
                          const blob = new Blob([data.content], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          window.open(url, "_blank");
                        }
                      }}
                    >
                      View
                    </button>
                    {!v.isActive && (
                      <button
                        className={`${styles.button} ${styles.buttonPrimary}`}
                        onClick={async () => {
                          if (!confirm(`Activate version "${v.versionLabel}"?`)) return;
                          try {
                            const res = await fetch(`/api/admin/config/${selectedType}/${profileKey}/activate`, {
                              method: "POST",
                              headers: { ...getHeaders(), "Content-Type": "application/json" },
                              body: JSON.stringify({ contentHash: v.contentHash }),
                            });
                            if (!res.ok) throw new Error("Failed to activate");
                            fetchHistory();
                            fetchActiveConfig();
                          } catch (err) {
                            toast.error(`Error: ${err}`);
                          }
                        }}
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              ))}
                <div style={{ marginTop: 16, fontSize: 13, color: "#6b7280" }}>
                  Showing {history.versions.length} of {history.total} versions
                </div>
              </div>

              {/* Diff view */}
              {diffData && (
                <div style={{ marginTop: 24, padding: 16, background: "#f9fafb", borderRadius: 8 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                    Comparison: {diffData.version1.versionLabel} vs {diffData.version2.versionLabel}
                  </h3>

                  {diffData.diff.type === "json" ? (
                    <div>
                      {diffData.diff.totalChanges === 0 ? (
                        <div style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>
                          No differences found
                        </div>
                      ) : (
                        <div style={{ maxHeight: 500, overflowY: "auto" }}>
                          {diffData.diff.changes.map((change: any, idx: number) => (
                            <div
                              key={idx}
                              style={{
                                padding: 8,
                                marginBottom: 4,
                                borderLeft: `4px solid ${
                                  change.type === "added"
                                    ? "#10b981"
                                    : change.type === "removed"
                                    ? "#ef4444"
                                    : "#f59e0b"
                                }`,
                                background: "#fff",
                                fontSize: 12,
                                fontFamily: "monospace",
                              }}
                            >
                              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                {change.path} ({change.type})
                              </div>
                              {change.type === "modified" && (
                                <div>
                                  <div style={{ color: "#ef4444" }}>
                                    - {JSON.stringify(change.oldValue)}
                                  </div>
                                  <div style={{ color: "#10b981" }}>
                                    + {JSON.stringify(change.newValue)}
                                  </div>
                                </div>
                              )}
                              {change.type === "added" && (
                                <div style={{ color: "#10b981" }}>
                                  + {JSON.stringify(change.newValue)}
                                </div>
                              )}
                              {change.type === "removed" && (
                                <div style={{ color: "#ef4444" }}>
                                  - {JSON.stringify(change.oldValue)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <h4 style={{ fontSize: 14, marginBottom: 8 }}>
                          {diffData.version1.versionLabel}
                        </h4>
                        <pre style={{ fontSize: 11, whiteSpace: "pre-wrap", maxHeight: 400, overflowY: "auto" }}>
                          {diffData.version1.content}
                        </pre>
                      </div>
                      <div>
                        <h4 style={{ fontSize: 14, marginBottom: 8 }}>
                          {diffData.version2.versionLabel}
                        </h4>
                        <pre style={{ fontSize: 11, whiteSpace: "pre-wrap", maxHeight: 400, overflowY: "auto" }}>
                          {diffData.version2.content}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : !error ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📜</div>
              <div className={styles.emptyText}>No version history</div>
              <div className={styles.emptyHint}>
                Save a config to start tracking versions
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* Edit Tab - Prompt (Markdown Editor) */}
      {activeTab === "edit" && selectedType === "prompt" && (
        <div className={styles.editorSection}>
          {/* Toolbar */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="text"
                placeholder="Version label (optional)"
                className={styles.formInput}
                style={{ width: 200 }}
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setVersionLabel(suggestVersionLabel())}
                title="Generate timestamp-based version label"
                style={{
                  padding: "6px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  background: "#f9fafb",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                📅
              </button>
            </div>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={async () => {
                // Validate prompt
                const res = await fetch(`/api/admin/config/prompt/${profileKey}/validate`, {
                  method: "POST",
                  headers: { ...getHeaders(), "Content-Type": "application/json" },
                  body: JSON.stringify({ content: promptContent }),
                });
                const data = await res.json();
                setValidation(data);
              }}
            >
              Validate
            </button>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={async () => {
                // Save draft
                try {
                  setSaving(true);
                  const res = await fetch(`/api/admin/config/prompt/${profileKey}`, {
                    method: "PUT",
                    headers: { ...getHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({ content: promptContent, versionLabel: versionLabel || suggestVersionLabel() }),
                  });
                  if (!res.ok) throw new Error((await res.json()).error || "Save failed");
                  toast.success("Saved as draft");
                  setPromptDirty(false);
                  fetchHistory();
                } catch (err) {
                  toast.error(`Error: ${err}`);
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving || !promptContent}
            >
              Save Draft
            </button>
            <button
              data-save-prompt-activate
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={async () => {
                // Save and activate
                try {
                  setSaving(true);
                  const saveRes = await fetch(`/api/admin/config/prompt/${profileKey}`, {
                    method: "PUT",
                    headers: { ...getHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({ content: promptContent, versionLabel: versionLabel || suggestVersionLabel() }),
                  });
                  if (!saveRes.ok) throw new Error((await saveRes.json()).error || "Save failed");
                  const saveData = await saveRes.json();

                  const activateRes = await fetch(`/api/admin/config/prompt/${profileKey}/activate`, {
                    method: "POST",
                    headers: { ...getHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({ contentHash: saveData.contentHash }),
                  });
                  if (!activateRes.ok) throw new Error("Saved but failed to activate");

                  toast.success("Saved and activated!");
                  setPromptDirty(false);
                  setVersionLabel("");
                  fetchActiveConfig();
                  fetchHistory();
                } catch (err) {
                  toast.error(`Error: ${err}`);
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving || !promptContent}
              title="Ctrl+S"
            >
              {saving ? "Saving..." : "Save & Activate"}
            </button>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={() => {
                if (promptDirty && !confirm("Discard your changes and reset to the active version?")) {
                  return;
                }
                if (activeConfig?.content) {
                  setPromptContent(activeConfig.content);
                  setPromptDirty(false);
                }
              }}
              disabled={!activeConfig || !promptDirty}
            >
              Reset
            </button>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={async () => {
                // Load prompt from file via reseed endpoint
                if (promptContent && !confirm("This will replace current content with the file version. Continue?")) {
                  return;
                }
                try {
                  setSaving(true);
                  const res = await fetch(`/api/admin/config/prompt/${profileKey}/reseed`, {
                    method: "POST",
                    headers: { ...getHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({ force: true }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Reseed failed");
                  if (data.seeded || data.contentHash) {
                    // Clear current content so the effect can repopulate from activeConfig
                    setPromptContent("");
                    setPromptDirty(false);
                    // Refresh active config to get the new content
                    await fetchActiveConfig();
                    toast.success(`Loaded from file: ${data.fromFile || profileKey + ".prompt.md"}`);
                  } else {
                    toast(data.reason || "No changes made");
                  }
                } catch (err) {
                  toast.error(`Error: ${err instanceof Error ? err.message : err}`);
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              title="Load prompt content from the file on disk"
            >
              📂 Load from File
            </button>
          </div>

          {/* Validation results */}
          {validation && (
            <div style={{
              marginBottom: 16,
              padding: "12px 16px",
              background: validation.valid ? "#d1fae5" : "#fee2e2",
              border: `1px solid ${validation.valid ? "#10b981" : "#ef4444"}`,
              borderRadius: 8,
            }}>
              {validation.valid ? (
                <div style={{ color: "#065f46" }}>Valid prompt</div>
              ) : (
                <div>
                  {(validation.errors || []).map((e, i) => (
                    <div key={i} style={{ color: "#b91c1c" }}>Error: {e}</div>
                  ))}
                </div>
              )}
              {(validation.warnings || []).map((w, i) => (
                <div key={i} style={{ color: "#92400e" }}>Warning: {w}</div>
              ))}
            </div>
          )}

          {/* Markdown editor */}
          <div style={{ display: "flex", gap: 16, height: 600 }}>
            {/* Line numbers + editor */}
            <div style={{ flex: 1, display: "flex", border: "1px solid #d1d5db", borderRadius: 8, overflow: "hidden" }}>
              <div style={{
                width: 50,
                background: "#f3f4f6",
                borderRight: "1px solid #d1d5db",
                padding: "8px 0",
                fontFamily: "monospace",
                fontSize: 13,
                lineHeight: "1.5em",
                color: "#9ca3af",
                textAlign: "right",
                overflow: "hidden",
                userSelect: "none",
              }}>
                {promptContent.split("\n").map((_, i) => (
                  <div key={i} style={{ paddingRight: 8 }}>{i + 1}</div>
                ))}
              </div>
              <textarea
                value={promptContent}
                onChange={(e) => {
                  setPromptContent(e.target.value);
                  setPromptDirty(true);
                }}
                style={{
                  flex: 1,
                  border: "none",
                  resize: "none",
                  padding: 8,
                  fontFamily: "monospace",
                  fontSize: 13,
                  lineHeight: "1.5em",
                  outline: "none",
                }}
                spellCheck={false}
                placeholder="Load a prompt to edit, or paste content here..."
              />
            </div>

            {/* Section navigator */}
            <div style={{
              width: 200,
              background: "#f9fafb",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              padding: 12,
              overflow: "auto",
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Sections</div>
              {promptContent.split("\n").map((line, i) => {
                const match = line.match(/^## ([A-Z][A-Z0-9_]+)\s*$/);
                if (match) {
                  return (
                    <div
                      key={i}
                      style={{
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontSize: 12,
                        borderRadius: 4,
                        marginBottom: 2,
                      }}
                      onClick={() => {
                        // Scroll to section and position cursor
                        const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
                        if (textarea) {
                          // Calculate character position at start of target line
                          const lines = promptContent.split("\n");
                          let charPos = 0;
                          for (let j = 0; j < i; j++) {
                            charPos += lines[j].length + 1; // +1 for newline
                          }
                          // Set cursor position at the section header
                          textarea.focus();
                          textarea.setSelectionRange(charPos, charPos + lines[i].length);
                          // Scroll to show the selected line (estimate ~20px per line)
                          const lineHeight = 20;
                          const visibleLines = Math.floor(textarea.clientHeight / lineHeight);
                          textarea.scrollTop = Math.max(0, (i - Math.floor(visibleLines / 4)) * lineHeight);
                        }
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {match[1]}
                    </div>
                  );
                }
                return null;
              })}
              {!promptContent.includes("## ") && (
                <div style={{ color: "#9ca3af", fontSize: 11 }}>No sections found</div>
              )}
            </div>
          </div>

          {promptDirty && (
            <div style={{ marginTop: 8, color: "#92400e", fontSize: 13 }}>
              Unsaved changes
            </div>
          )}
        </div>
      )}

      {/* Edit Tab - JSON configs (search, calculation) */}
      {activeTab === "edit" && selectedType !== "prompt" && (
        <div>
          {/* Toolbar */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="text"
                placeholder="Version label (optional)"
                className={styles.formInput}
                style={{ width: 200 }}
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setVersionLabel(suggestVersionLabel())}
                title="Generate timestamp-based version label"
                style={{
                  padding: "6px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  background: "#f9fafb",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                📅
              </button>
            </div>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={validateConfig}
            >
              Validate
            </button>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={() => saveConfig(false)}
              disabled={saving}
            >
              Save Draft
            </button>
            <button
              data-save-json-activate
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={() => saveConfig(true)}
              disabled={saving}
              title="Ctrl+S"
            >
              {saving ? "Saving..." : "Save & Activate"}
            </button>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={handleImport}
            >
              Import JSON
            </button>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={() => {
                if (hasUnsavedJsonChanges && !confirm("Discard your changes and reset to defaults?")) {
                  return;
                }
                setEditConfig(getDefaultConfigForType(selectedType));
                setValidation(null);
              }}
            >
              Reset to Default
            </button>
          </div>

          {fileWriteAllowed && (
            <div style={{
              marginBottom: 20,
              padding: "12px 16px",
              background: "#fef3c7",
              border: "1px solid #fcd34d",
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 12, color: "#78350f", marginBottom: 8 }}>
                💾 Save active config back to file (development only)
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  onClick={() => handleSaveToFile(true)}
                  disabled={savingToFile || fileWriteChecking}
                >
                  Preview Save to File
                </button>
                <button
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  onClick={() => handleSaveToFile(false)}
                  disabled={savingToFile || fileWriteChecking}
                >
                  💾 Save to File
                </button>
                <span style={{ color: "#92400e", fontSize: 12 }}>
                  ⚠️ Creates a .bak backup before overwriting
                </span>
              </div>
            </div>
          )}

          {/* Validation results */}
          {validation && (
            <div style={{
              padding: 12,
              marginBottom: 20,
              borderRadius: 6,
              background: validation.valid ? "#dcfce7" : "#fef2f2",
              border: `1px solid ${validation.valid ? "#86efac" : "#fecaca"}`,
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {validation.valid ? "✓ Valid" : "✗ Invalid"}
              </div>
              {validation.errors?.length > 0 && (
                <ul style={{ margin: "8px 0", paddingLeft: 20, color: "#991b1b" }}>
                  {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
              {validation.warnings?.length > 0 && (
                <ul style={{ margin: "8px 0", paddingLeft: 20, color: "#92400e" }}>
                  {validation.warnings.map((w, i) => <li key={i}>Warning: {w}</li>)}
                </ul>
              )}
              {validation.canonicalizedHash && (
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
                  Hash: {validation.canonicalizedHash}
                </div>
              )}
            </div>
          )}

          {/* Form */}
          {editConfig && selectedType === "search" && (
            <SearchConfigForm
              config={editConfig as SearchConfig}
              onChange={(c) => {
                setEditConfig(c);
                setValidation(null);
              }}
            />
          )}
          {editConfig && selectedType === "calculation" && (
            <CalcConfigForm
              config={editConfig as CalcConfig}
              onChange={(c) => {
                setEditConfig(c);
                setValidation(null);
              }}
            />
          )}
          {editConfig && selectedType === "pipeline" && (
            <PipelineConfigForm
              config={editConfig as PipelineConfig}
              onChange={(c) => {
                setEditConfig(c);
                setValidation(null);
              }}
            />
          )}
          {editConfig && selectedType === "sr" && (
            <SRConfigForm
              config={editConfig as SRConfig}
              onChange={(c) => {
                setEditConfig(c);
                setValidation(null);
              }}
            />
          )}

          {/* JSON Preview */}
          {editConfig && (
            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>JSON Preview</h3>
              <pre className={styles.configContent} style={{ maxHeight: 300 }}>
                {JSON.stringify(editConfig, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Effective Config Tab */}
      {activeTab === "effective" && !loading && selectedType !== "prompt" && (
        <>
          {effectiveConfig ? (
            <div>
              {/* Override Policy Badge */}
              <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontWeight: 500 }}>Override Policy:</span>
                <span className={`${styles.status} ${effectiveConfig.overridePolicy === "off" ? styles.statusInactive : styles.statusActive}`}>
                  {effectiveConfig.overridePolicy}
                </span>
                {effectiveConfig.overrides.length > 0 && (
                  <span style={{ fontSize: 13, color: "#92400e" }}>
                    {effectiveConfig.overrides.length} override(s) applied
                  </span>
                )}
              </div>

              {/* Overrides List */}
              {effectiveConfig.overrides.length > 0 && (
                <div style={{
                  marginBottom: 20,
                  padding: 16,
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: 8,
                }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: 14 }}>Environment Variable Overrides</h4>
                  <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", borderBottom: "1px solid #fde68a" }}>
                        <th style={{ padding: "8px 12px" }}>Env Var</th>
                        <th style={{ padding: "8px 12px" }}>Field</th>
                        <th style={{ padding: "8px 12px" }}>Applied Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {effectiveConfig.overrides.map((o, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #fef3c7" }}>
                          <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{o.envVar}</td>
                          <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{o.fieldPath}</td>
                          <td style={{ padding: "8px 12px" }}>
                            {o.appliedValue !== undefined ? String(o.appliedValue) : "(complex value)"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Side-by-side comparison */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: 14 }}>Base Config (from DB)</h4>
                  <pre className={styles.configContent} style={{ maxHeight: 400 }}>
                    {JSON.stringify(effectiveConfig.base, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: 14 }}>
                    Effective Config (with overrides)
                    {effectiveConfig.overrides.length > 0 && (
                      <span style={{ marginLeft: 8, color: "#92400e", fontWeight: 400, fontSize: 12 }}>
                        modified
                      </span>
                    )}
                  </h4>
                  <pre className={styles.configContent} style={{ maxHeight: 400 }}>
                    {JSON.stringify(effectiveConfig.effective, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : !error && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>⚡</div>
              <div className={styles.emptyText}>No config to preview</div>
              <div className={styles.emptyHint}>
                Create a config first to see the effective values with overrides
              </div>
            </div>
          )}
        </>
      )}

      {/* Effective Tab - Prompt redirect */}
      {activeTab === "effective" && selectedType === "prompt" && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📝</div>
          <div className={styles.emptyText}>Effective config not available for prompts</div>
          <div className={styles.emptyHint}>
            Prompts don't support environment variable overrides
          </div>
        </div>
      )}
    </div>
  );
}
