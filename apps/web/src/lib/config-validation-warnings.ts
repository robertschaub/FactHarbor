/**
 * Config Validation Warnings
 *
 * Detects dangerous or suboptimal configuration combinations
 * and provides actionable warnings to admins.
 *
 * Part of UCM v2.9.0 Phase 4: Admin UI
 *
 * @module config-validation-warnings
 * @version 1.0.0
 * @date 2026-01-30
 */

import type { PipelineConfig, SearchConfig } from "./config-schemas";

export interface ConfigWarning {
  level: "warning" | "danger" | "info";
  title: string;
  message: string;
  suggestion: string;
  affectedFields: string[];
}

// ============================================================================
// PIPELINE CONFIG WARNINGS
// ============================================================================

/**
 * Check for dangerous pipeline config combinations
 */
export function validatePipelineConfig(config: PipelineConfig): ConfigWarning[] {
  const warnings: ConfigWarning[] = [];

  // Warning 1: Deep mode with low budget
  if (config.analysisMode === "deep" && config.maxTotalTokens < 500000) {
    warnings.push({
      level: "warning",
      title: "Deep Mode with Low Token Budget",
      message: `Deep mode is enabled but maxTotalTokens is only ${config.maxTotalTokens.toLocaleString()}. Deep analysis typically requires 500K-1M tokens.`,
      suggestion: "Increase maxTotalTokens to at least 750,000 or switch to quick mode",
      affectedFields: ["analysisMode", "maxTotalTokens"],
    });
  }

  // Warning 2: LLM tiering disabled (higher cost)
  if (!config.llmTiering) {
    warnings.push({
      level: "info",
      title: "LLM Tiering Disabled",
      message: "All analysis tasks will use premium models (Sonnet/GPT-4), increasing costs by 50-70%.",
      suggestion: "Enable llmTiering to use budget models (Haiku/Mini) for extraction tasks",
      affectedFields: ["llmTiering"],
    });
  }

  // Warning 3: Model knowledge without deterministic mode
  if (config.allowModelKnowledge && !config.deterministic) {
    warnings.push({
      level: "warning",
      title: "Non-Deterministic Model Knowledge",
      message: "Model knowledge is enabled without deterministic mode. Results may vary between runs.",
      suggestion: "Enable deterministic mode for reproducible results, or disable model knowledge for strict grounding",
      affectedFields: ["allowModelKnowledge", "deterministic"],
    });
  }

  // Warning 4: Aggressive scope deduplication
  if (config.scopeDedupThreshold < 0.75) {
    warnings.push({
      level: "warning",
      title: "Aggressive Scope Deduplication",
      message: `Scope dedup threshold is ${config.scopeDedupThreshold} (recommended: ≥0.85). This may incorrectly merge distinct contexts.`,
      suggestion: "Increase scopeDedupThreshold to 0.85 or higher to avoid context loss",
      affectedFields: ["scopeDedupThreshold"],
    });
  }

  // Warning 5: Very high iteration limits (cost risk)
  if (config.maxTotalIterations > 30) {
    warnings.push({
      level: "danger",
      title: "Very High Iteration Limit",
      message: `maxTotalIterations is ${config.maxTotalIterations}. This could lead to very long analysis times and high costs.`,
      suggestion: "Reduce to 20-25 for most use cases, or enable enforceBudgets for hard limits",
      affectedFields: ["maxTotalIterations", "enforceBudgets"],
    });
  }

  // Warning 6: Budget enforcement disabled with high limits
  if (!config.enforceBudgets && (config.maxTotalIterations > 25 || config.maxTotalTokens > 1000000)) {
    warnings.push({
      level: "warning",
      title: "Soft Budget Limits with High Caps",
      message: "Budget enforcement is soft (enforceBudgets=false) but limits are high. Important claims may exceed budgets.",
      suggestion: "Enable enforceBudgets for hard limits, or reduce maxTotalIterations/maxTotalTokens",
      affectedFields: ["enforceBudgets", "maxTotalIterations", "maxTotalTokens"],
    });
  }

  // Warning 7: All LLM text analysis disabled (lower quality)
  const allLLMDisabled =
    !config.llmInputClassification &&
    !config.llmEvidenceQuality &&
    !config.llmScopeSimilarity &&
    !config.llmVerdictValidation;

  if (allLLMDisabled) {
    warnings.push({
      level: "warning",
      title: "All LLM Text Analysis Disabled",
      message: "All LLM text analysis features are disabled. Analysis will use heuristics only, reducing quality.",
      suggestion: "Enable at least llmEvidenceQuality and llmVerdictValidation for better results",
      affectedFields: [
        "llmInputClassification",
        "llmEvidenceQuality",
        "llmScopeSimilarity",
        "llmVerdictValidation",
      ],
    });
  }

  return warnings;
}

// ============================================================================
// SEARCH CONFIG WARNINGS
// ============================================================================

/**
 * Check for dangerous search config combinations
 */
export function validateSearchConfig(config: SearchConfig): ConfigWarning[] {
  const warnings: ConfigWarning[] = [];

  // Warning 1: Search disabled
  if (!config.enabled) {
    warnings.push({
      level: "danger",
      title: "Search Disabled",
      message: "Search is disabled. The analyzer cannot fetch sources or evidence. Most analyses will fail.",
      suggestion: "Enable search unless testing offline mode",
      affectedFields: ["enabled"],
    });
  }

  // Warning 2: Very low max results
  if (config.enabled && config.maxResults < 4) {
    warnings.push({
      level: "warning",
      title: "Low Search Result Limit",
      message: `maxResults is only ${config.maxResults}. The analyzer may not find enough sources for thorough analysis.`,
      suggestion: "Increase maxResults to at least 6 for better coverage",
      affectedFields: ["maxResults"],
    });
  }

  // Warning 3: Grounded search without proper provider
  if (config.mode === "grounded" && config.provider !== "auto" && config.provider !== "google-cse") {
    warnings.push({
      level: "warning",
      title: "Grounded Search with Incompatible Provider",
      message: `Grounded search mode requires Google CSE provider, but provider is set to "${config.provider}".`,
      suggestion: 'Set provider to "auto" or "google-cse" for grounded search',
      affectedFields: ["mode", "provider"],
    });
  }

  // Warning 4: Very short timeout
  if (config.enabled && config.timeoutMs < 8000) {
    warnings.push({
      level: "warning",
      title: "Short Search Timeout",
      message: `Search timeout is ${config.timeoutMs}ms (<8s). Many searches may fail or return incomplete results.`,
      suggestion: "Increase timeoutMs to at least 12000ms (12 seconds)",
      affectedFields: ["timeoutMs"],
    });
  }

  // Warning 5: Both whitelist and blacklist
  if (config.domainWhitelist.length > 0 && config.domainBlacklist.length > 0) {
    warnings.push({
      level: "info",
      title: "Whitelist and Blacklist Both Set",
      message: "Both domain whitelist and blacklist are configured. Whitelist takes precedence.",
      suggestion: "Consider using only whitelist for explicit allowed domains, or only blacklist for exclusions",
      affectedFields: ["domainWhitelist", "domainBlacklist"],
    });
  }

  return warnings;
}

// ============================================================================
// CROSS-CONFIG WARNINGS
// ============================================================================

/**
 * Check for warnings across multiple config types
 */
export function validateCrossConfig(
  pipeline: PipelineConfig,
  search: SearchConfig
): ConfigWarning[] {
  const warnings: ConfigWarning[] = [];

  // Warning 1: Deep mode with low search results
  if (pipeline.analysisMode === "deep" && search.maxResults < 8) {
    warnings.push({
      level: "warning",
      title: "Deep Mode with Few Search Results",
      message: `Deep mode is enabled but search maxResults is only ${search.maxResults}. Deep mode benefits from more sources.`,
      suggestion: "Increase search maxResults to 10-15 for deep mode",
      affectedFields: ["pipeline.analysisMode", "search.maxResults"],
    });
  }

  // Warning 2: High iteration budget with search disabled
  if (!search.enabled && pipeline.maxTotalIterations > 10) {
    warnings.push({
      level: "danger",
      title: "High Iterations with Search Disabled",
      message: "Search is disabled but iteration limits are high. The analyzer will repeatedly fail to find sources.",
      suggestion: "Enable search or reduce iteration limits to 1-2",
      affectedFields: ["search.enabled", "pipeline.maxTotalIterations"],
    });
  }

  return warnings;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all warnings for a complete analyzer config
 */
export function getAllConfigWarnings(
  pipeline: PipelineConfig,
  search: SearchConfig
): ConfigWarning[] {
  return [
    ...validatePipelineConfig(pipeline),
    ...validateSearchConfig(search),
    ...validateCrossConfig(pipeline, search),
  ];
}

/**
 * Group warnings by severity
 */
export function groupWarningsBySeverity(warnings: ConfigWarning[]): {
  danger: ConfigWarning[];
  warning: ConfigWarning[];
  info: ConfigWarning[];
} {
  return {
    danger: warnings.filter(w => w.level === "danger"),
    warning: warnings.filter(w => w.level === "warning"),
    info: warnings.filter(w => w.level === "info"),
  };
}

/**
 * Check if any critical warnings exist
 */
export function hasCriticalWarnings(warnings: ConfigWarning[]): boolean {
  return warnings.some(w => w.level === "danger");
}
