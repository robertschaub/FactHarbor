/**
 * Migrate Environment Variables to Database
 *
 * Reads current environment variables and creates corresponding database
 * config records. This enables the transition from env-var-only config
 * to the unified configuration management system.
 *
 * Usage: npx tsx scripts/migrate-env-to-db.ts [--dry-run] [--force]
 *
 * Options:
 *   --dry-run  Show what would be created without making changes
 *   --force    Overwrite existing configs (normally skipped if exists)
 *
 * @module scripts/migrate-env-to-db
 */

import {
  saveConfigBlob,
  activateConfig,
  getActiveConfig,
  closeConfigDb,
} from "../src/lib/config-storage";
import {
  DEFAULT_SEARCH_CONFIG,
  DEFAULT_CALC_CONFIG,
  DEFAULT_PIPELINE_CONFIG,
  DEFAULT_SR_CONFIG,
  type SearchConfig,
  type CalcConfig,
  type PipelineConfig,
  type SourceReliabilityConfig,
} from "../src/lib/config-schemas";

// Parse command line args
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");

/**
 * Read search config from environment variables
 */
function readSearchConfigFromEnv(): SearchConfig {
  const config = { ...DEFAULT_SEARCH_CONFIG };

  if (process.env.FH_SEARCH_ENABLED !== undefined) {
    config.enabled = process.env.FH_SEARCH_ENABLED !== "false";
  }
  if (process.env.FH_SEARCH_PROVIDER) {
    config.provider = process.env.FH_SEARCH_PROVIDER as "auto" | "google-cse" | "serpapi";
  }
  if (process.env.FH_SEARCH_MAX_RESULTS) {
    config.maxResults = parseInt(process.env.FH_SEARCH_MAX_RESULTS, 10);
  }
  if (process.env.FH_SEARCH_DATE_RESTRICT) {
    const val = process.env.FH_SEARCH_DATE_RESTRICT;
    config.dateRestrict = val === "y" || val === "m" || val === "w" ? val : null;
  }
  if (process.env.FH_SEARCH_DOMAIN_WHITELIST) {
    config.domainWhitelist = process.env.FH_SEARCH_DOMAIN_WHITELIST.split(",").map(s => s.trim()).filter(Boolean);
  }

  return config;
}

/**
 * Read calculation config from environment variables
 */
function readCalcConfigFromEnv(): CalcConfig {
  const config = { ...DEFAULT_CALC_CONFIG };

  if (process.env.FH_HIGH_CONFIDENCE_THRESHOLD) {
    config.highConfidenceThreshold = parseFloat(process.env.FH_HIGH_CONFIDENCE_THRESHOLD);
  }
  if (process.env.FH_MEDIUM_CONFIDENCE_THRESHOLD) {
    config.mediumConfidenceThreshold = parseFloat(process.env.FH_MEDIUM_CONFIDENCE_THRESHOLD);
  }
  if (process.env.FH_MAX_SOURCES_PER_CLAIM) {
    config.maxSourcesPerClaim = parseInt(process.env.FH_MAX_SOURCES_PER_CLAIM, 10);
  }
  if (process.env.FH_MIN_FACTS_FOR_VERDICT) {
    config.minFactsForVerdict = parseInt(process.env.FH_MIN_FACTS_FOR_VERDICT, 10);
  }
  if (process.env.FH_SOURCE_RELIABILITY_WEIGHT) {
    config.sourceReliabilityWeight = parseFloat(process.env.FH_SOURCE_RELIABILITY_WEIGHT);
  }

  return config;
}

/**
 * Read pipeline config from environment variables
 */
function readPipelineConfigFromEnv(): PipelineConfig {
  const config = { ...DEFAULT_PIPELINE_CONFIG };

  // Model selection
  if (process.env.FH_LLM_TIERING !== undefined) {
    config.llmTiering = process.env.FH_LLM_TIERING === "on" || process.env.FH_LLM_TIERING === "true";
  }
  if (process.env.FH_MODEL_UNDERSTAND) {
    config.modelUnderstand = process.env.FH_MODEL_UNDERSTAND;
  }
  if (process.env.FH_MODEL_EXTRACT_EVIDENCE) {
    config.modelExtractEvidence = process.env.FH_MODEL_EXTRACT_EVIDENCE;
  }
  if (process.env.FH_MODEL_VERDICT) {
    config.modelVerdict = process.env.FH_MODEL_VERDICT;
  }

  // LLM Text Analysis feature flags
  if (process.env.FH_LLM_INPUT_CLASSIFICATION !== undefined) {
    config.llmInputClassification = process.env.FH_LLM_INPUT_CLASSIFICATION !== "false";
  }
  if (process.env.FH_LLM_EVIDENCE_QUALITY !== undefined) {
    config.llmEvidenceQuality = process.env.FH_LLM_EVIDENCE_QUALITY !== "false";
  }
  if (process.env.FH_LLM_CONTEXT_SIMILARITY !== undefined) {
    config.llmContextSimilarity = process.env.FH_LLM_CONTEXT_SIMILARITY !== "false";
  }
  if (process.env.FH_LLM_VERDICT_VALIDATION !== undefined) {
    config.llmVerdictValidation = process.env.FH_LLM_VERDICT_VALIDATION !== "false";
  }

  // Analysis behavior
  if (process.env.FH_ANALYSIS_MODE) {
    config.analysisMode = process.env.FH_ANALYSIS_MODE as "quick" | "deep";
  }
  if (process.env.FH_ALLOW_MODEL_KNOWLEDGE !== undefined) {
    config.allowModelKnowledge = process.env.FH_ALLOW_MODEL_KNOWLEDGE === "true";
  }
  if (process.env.FH_DETERMINISTIC !== undefined) {
    config.deterministic = process.env.FH_DETERMINISTIC !== "false";
  }
  if (process.env.FH_CONTEXT_DEDUP_THRESHOLD) {
    config.contextDedupThreshold = parseFloat(process.env.FH_CONTEXT_DEDUP_THRESHOLD);
  }

  // Budget controls
  if (process.env.FH_MAX_ITERATIONS_PER_CONTEXT) {
    config.maxIterationsPerContext = parseInt(process.env.FH_MAX_ITERATIONS_PER_CONTEXT, 10);
  }
  if (process.env.FH_MAX_TOTAL_ITERATIONS) {
    config.maxTotalIterations = parseInt(process.env.FH_MAX_TOTAL_ITERATIONS, 10);
  }
  if (process.env.FH_MAX_TOTAL_TOKENS) {
    config.maxTotalTokens = parseInt(process.env.FH_MAX_TOTAL_TOKENS, 10);
  }
  if (process.env.FH_ENFORCE_BUDGETS !== undefined) {
    config.enforceBudgets = process.env.FH_ENFORCE_BUDGETS !== "false";
  }

  // Pipeline selection
  if (process.env.FH_DEFAULT_PIPELINE_VARIANT) {
    config.defaultPipelineVariant = process.env.FH_DEFAULT_PIPELINE_VARIANT as
      | "orchestrated"
      | "monolithic_canonical"
      | "monolithic_dynamic";
  }

  return config;
}

/**
 * Read SR config from environment variables
 */
function readSRConfigFromEnv(): SourceReliabilityConfig {
  const config = { ...DEFAULT_SR_CONFIG };

  if (process.env.FH_SR_ENABLED !== undefined) {
    config.enabled = process.env.FH_SR_ENABLED !== "false";
  }
  if (process.env.FH_SR_MULTI_MODEL !== undefined) {
    config.multiModel = process.env.FH_SR_MULTI_MODEL !== "false";
  }
  if (process.env.FH_SR_OPENAI_MODEL) {
    config.openaiModel = process.env.FH_SR_OPENAI_MODEL;
  }
  if (process.env.FH_SR_CONFIDENCE_THRESHOLD) {
    config.confidenceThreshold = parseFloat(process.env.FH_SR_CONFIDENCE_THRESHOLD);
  }
  if (process.env.FH_SR_CONSENSUS_THRESHOLD) {
    config.consensusThreshold = parseFloat(process.env.FH_SR_CONSENSUS_THRESHOLD);
  }
  if (process.env.FH_SR_DEFAULT_SCORE) {
    config.defaultScore = parseFloat(process.env.FH_SR_DEFAULT_SCORE);
  }
  if (process.env.FH_SR_CACHE_TTL_DAYS) {
    config.cacheTtlDays = parseInt(process.env.FH_SR_CACHE_TTL_DAYS, 10);
  }
  if (process.env.FH_SR_FILTER_ENABLED !== undefined) {
    config.filterEnabled = process.env.FH_SR_FILTER_ENABLED !== "false";
  }
  if (process.env.FH_SR_SKIP_PLATFORMS) {
    config.skipPlatforms = process.env.FH_SR_SKIP_PLATFORMS.split(",").map(s => s.trim()).filter(Boolean);
  }
  if (process.env.FH_SR_SKIP_TLDS) {
    config.skipTlds = process.env.FH_SR_SKIP_TLDS.split(",").map(s => s.trim()).filter(Boolean);
  }
  if (process.env.FH_SR_RATE_LIMIT_PER_IP) {
    config.rateLimitPerIp = parseInt(process.env.FH_SR_RATE_LIMIT_PER_IP, 10);
  }
  if (process.env.FH_SR_RATE_LIMIT_DOMAIN_COOLDOWN) {
    config.domainCooldownSec = parseInt(process.env.FH_SR_RATE_LIMIT_DOMAIN_COOLDOWN, 10);
  }

  return config;
}

interface MigrationResult {
  configType: string;
  profileKey: string;
  action: "created" | "skipped" | "overwritten" | "error" | "dry-run";
  contentHash?: string;
  error?: string;
}

async function migrateConfig(
  configType: "search" | "calculation" | "pipeline" | "sr",
  profileKey: string,
  content: object,
): Promise<MigrationResult> {
  const contentStr = JSON.stringify(content, null, 2);

  // Check if config already exists
  const existing = await getActiveConfig(configType, profileKey);
  if (existing && !FORCE) {
    return {
      configType,
      profileKey,
      action: "skipped",
      contentHash: existing.contentHash,
    };
  }

  if (DRY_RUN) {
    console.log(`  Would create ${configType}/${profileKey}:`);
    console.log(`    ${JSON.stringify(content).substring(0, 100)}...`);
    return {
      configType,
      profileKey,
      action: "dry-run",
    };
  }

  try {
    const { blob, isNew } = await saveConfigBlob(
      configType,
      profileKey,
      contentStr,
      "migrated-from-env",
      "migration-script",
    );

    await activateConfig(
      configType,
      profileKey,
      blob.contentHash,
      "migration-script",
      "initial-migration",
    );

    return {
      configType,
      profileKey,
      action: existing ? "overwritten" : "created",
      contentHash: blob.contentHash,
    };
  } catch (err) {
    return {
      configType,
      profileKey,
      action: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  console.log("=".repeat(70));
  console.log("Environment Variables to Database Migration");
  console.log("=".repeat(70));
  console.log();

  if (DRY_RUN) {
    console.log("** DRY RUN MODE - No changes will be made **");
    console.log();
  }
  if (FORCE) {
    console.log("** FORCE MODE - Existing configs will be overwritten **");
    console.log();
  }

  const results: MigrationResult[] = [];

  // 1. Migrate Search Config
  console.log("1. Search Config");
  const searchConfig = readSearchConfigFromEnv();
  results.push(await migrateConfig("search", "default", searchConfig));

  // 2. Migrate Calculation Config
  console.log("2. Calculation Config");
  const calcConfig = readCalcConfigFromEnv();
  results.push(await migrateConfig("calculation", "default", calcConfig));

  // 3. Migrate Pipeline Config
  console.log("3. Pipeline Config");
  const pipelineConfig = readPipelineConfigFromEnv();
  results.push(await migrateConfig("pipeline", "default", pipelineConfig));

  // 4. Migrate SR Config (kept separate per SR modularity)
  console.log("4. Source Reliability Config");
  const srConfig = readSRConfigFromEnv();
  results.push(await migrateConfig("sr", "default", srConfig));

  // Summary
  console.log();
  console.log("=".repeat(70));
  console.log("Migration Summary");
  console.log("=".repeat(70));
  console.log();

  const created = results.filter(r => r.action === "created").length;
  const skipped = results.filter(r => r.action === "skipped").length;
  const overwritten = results.filter(r => r.action === "overwritten").length;
  const errors = results.filter(r => r.action === "error").length;
  const dryRun = results.filter(r => r.action === "dry-run").length;

  for (const result of results) {
    const status =
      result.action === "created" ? "✓ Created" :
      result.action === "skipped" ? "- Skipped (exists)" :
      result.action === "overwritten" ? "↻ Overwritten" :
      result.action === "dry-run" ? "○ Would create" :
      "✗ Error";

    console.log(`  ${result.configType}/${result.profileKey}: ${status}`);
    if (result.contentHash) {
      console.log(`    Hash: ${result.contentHash.substring(0, 16)}...`);
    }
    if (result.error) {
      console.log(`    Error: ${result.error}`);
    }
  }

  console.log();
  console.log(`Total: ${results.length} configs`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Overwritten: ${overwritten}`);
  console.log(`  Errors: ${errors}`);
  if (dryRun > 0) {
    console.log(`  Would create (dry-run): ${dryRun}`);
  }

  if (!DRY_RUN) {
    console.log();
    console.log("Migration complete. Environment variables will still override DB values.");
    console.log("To disable env overrides, set FH_CONFIG_ENV_OVERRIDES=off");
  }

  await closeConfigDb();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
