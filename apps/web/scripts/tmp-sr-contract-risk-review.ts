import fs from "fs/promises";
import path from "path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

type OriginalRow = {
  domain: string;
  score: number | null;
  confidence: number;
  evaluated_at: string;
  expires_at: string;
  model_primary: string;
  model_secondary: string | null;
  consensus_achieved: number;
  reasoning: string | null;
  category: string | null;
  bias_indicator: string | null;
  evidence_cited: string | null;
  evidence_pack: string | null;
  fallback_used: number;
  fallback_reason: string | null;
  identified_entity: string | null;
  source_type: string | null;
};

const SAMPLE_DOMAINS = [
  "deeplearning.ai",
  "siemens.com",
  "accelerazero.com",
  "theglobeandmail.com",
] as const;

function resolveSrDbPath(): string {
  if (process.env.FH_SR_CACHE_PATH) {
    return path.resolve(process.cwd(), process.env.FH_SR_CACHE_PATH);
  }
  return path.resolve(process.cwd(), "source-reliability.db");
}

function buildSrSearchConfigFromEvalSearch(
  evalSearch: any,
  defaultSrConfig: any,
) {
  const cfg = evalSearch ?? defaultSrConfig.evaluationSearch;
  return {
    enabled: true,
    provider: cfg.provider,
    mode: "standard",
    autoMode: "accumulate",
    maxResults: cfg.maxResultsPerQuery,
    maxSourcesPerIteration: cfg.maxResultsPerQuery,
    timeoutMs: cfg.timeoutMs,
    dateRestrict: cfg.dateRestrict,
    domainWhitelist: [],
    domainBlacklist: [],
    providers: {
      googleCse: {
        ...defaultSrConfig.evaluationSearch.providers.googleCse,
        ...cfg.providers.googleCse,
        dailyQuotaLimit:
          cfg.providers.googleCse.dailyQuotaLimit ??
          defaultSrConfig.evaluationSearch.providers.googleCse.dailyQuotaLimit ??
          0,
      },
      serpapi: {
        ...defaultSrConfig.evaluationSearch.providers.serpapi,
        ...cfg.providers.serpapi,
        dailyQuotaLimit:
          cfg.providers.serpapi.dailyQuotaLimit ??
          defaultSrConfig.evaluationSearch.providers.serpapi.dailyQuotaLimit ??
          0,
      },
      brave: {
        ...defaultSrConfig.evaluationSearch.providers.brave,
        ...cfg.providers.brave,
        dailyQuotaLimit:
          cfg.providers.brave.dailyQuotaLimit ??
          defaultSrConfig.evaluationSearch.providers.brave.dailyQuotaLimit ??
          0,
      },
      serper: {
        ...defaultSrConfig.evaluationSearch.providers.serper,
        ...cfg.providers.serper,
        dailyQuotaLimit:
          cfg.providers.serper.dailyQuotaLimit ??
          defaultSrConfig.evaluationSearch.providers.serper.dailyQuotaLimit ??
          0,
      },
    },
    cache: { enabled: true, ttlDays: 7 },
  };
}

async function loadOriginalRows(dbPath: string) {
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  try {
    const rows = await Promise.all(
      SAMPLE_DOMAINS.map((domain) =>
        db.get<OriginalRow>(
          `SELECT *
           FROM source_reliability
           WHERE domain = ? AND evaluated_at < ?
           ORDER BY evaluated_at DESC
           LIMIT 1`,
          [domain, "2026-04-20T00:04:25"],
        ),
      ),
    );

    return rows.map((row, index) => {
      if (!row) {
        throw new Error(`Missing historical row for ${SAMPLE_DOMAINS[index]}`);
      }

      return {
        domain: row.domain,
        score: row.score,
        confidence: row.confidence,
        evaluatedAt: row.evaluated_at,
        expiresAt: row.expires_at,
        modelPrimary: row.model_primary,
        modelSecondary: row.model_secondary,
        consensusAchieved: row.consensus_achieved === 1,
        reasoning: row.reasoning,
        category: row.category,
        biasIndicator: row.bias_indicator,
        evidenceCited: row.evidence_cited ? JSON.parse(row.evidence_cited) : null,
        evidencePack: row.evidence_pack ? JSON.parse(row.evidence_pack) : null,
        fallbackUsed: row.fallback_used === 1,
        fallbackReason: row.fallback_reason,
        identifiedEntity: row.identified_entity,
        sourceType: row.source_type,
      };
    });
  } finally {
    await db.close();
  }
}

async function main() {
  const dbPath = resolveSrDbPath();
  const originalRows = await loadOriginalRows(dbPath);

  const configStorageModule = await import("../src/lib/config-storage.ts");
  const schemasModule = await import("../src/lib/config-schemas.ts");
  const srConfigModule = await import("../src/lib/source-reliability-config.ts");
  const srEnrichmentModule = await import("../src/lib/source-reliability/sr-eval-enrichment.ts");
  const srEngineModule = await import("../src/lib/source-reliability/sr-eval-engine.ts");

  const getConfig = (configStorageModule as any).getConfig ?? (configStorageModule as any).default?.getConfig;
  const DEFAULT_SR_CONFIG = (schemasModule as any).DEFAULT_SR_CONFIG ?? (schemasModule as any).default?.DEFAULT_SR_CONFIG;
  const DEFAULT_CONFIDENCE_THRESHOLD =
    (srConfigModule as any).DEFAULT_CONFIDENCE_THRESHOLD ??
    (srConfigModule as any).default?.DEFAULT_CONFIDENCE_THRESHOLD;
  const normalizeEvidenceQualityAssessmentConfig =
    (srEnrichmentModule as any).normalizeEvidenceQualityAssessmentConfig ??
    (srEnrichmentModule as any).default?.normalizeEvidenceQualityAssessmentConfig;
  const evaluateSourceWithConsensus =
    (srEngineModule as any).evaluateSourceWithConsensus ??
    (srEngineModule as any).default?.evaluateSourceWithConsensus;

  if (
    !getConfig ||
    !DEFAULT_SR_CONFIG ||
    !normalizeEvidenceQualityAssessmentConfig ||
    !evaluateSourceWithConsensus
  ) {
    throw new Error("Failed to resolve one or more SR runtime imports.");
  }

  const srConfigResult = await getConfig("sr", "default");
  const liveSrConfig = srConfigResult.config;
  const evalSearch = liveSrConfig.evaluationSearch || DEFAULT_SR_CONFIG.evaluationSearch;
  const searchConfig = buildSrSearchConfigFromEvalSearch(evalSearch, DEFAULT_SR_CONFIG);
  const evidenceQualityAssessmentConfig = normalizeEvidenceQualityAssessmentConfig(
    liveSrConfig.evidenceQualityAssessment,
    DEFAULT_SR_CONFIG.evidenceQualityAssessment,
  );

  const reevaluated = [];
  for (const original of originalRows) {
    const requestStartedAtMs = Date.now();
    const requestBudgetMs = liveSrConfig.evalTimeoutMs ?? DEFAULT_SR_CONFIG.evalTimeoutMs ?? 90000;
    const config = {
      openaiModel: liveSrConfig.openaiModel,
      searchConfig,
      evalUseSearch: liveSrConfig.evalUseSearch ?? (DEFAULT_SR_CONFIG.evalUseSearch ?? true),
      evalMaxResultsPerQuery: evalSearch.maxResultsPerQuery,
      evalMaxEvidenceItems: evalSearch.maxEvidenceItems,
      evalDateRestrict: evalSearch.dateRestrict,
      rateLimitPerIp: liveSrConfig.rateLimitPerIp ?? (DEFAULT_SR_CONFIG.rateLimitPerIp ?? 10),
      domainCooldownSec: liveSrConfig.domainCooldownSec ?? (DEFAULT_SR_CONFIG.domainCooldownSec ?? 60),
      evidenceQualityAssessment: evidenceQualityAssessmentConfig,
      requestStartedAtMs,
      requestBudgetMs,
    };

    const result = await evaluateSourceWithConsensus(
      original.domain,
      liveSrConfig.multiModel,
      liveSrConfig.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD,
      config,
    );

    reevaluated.push({
      domain: original.domain,
      success: result.success,
      data: result.success ? result.data : null,
      error: result.success ? null : result.error,
    });
  }

  const paired = originalRows.map((original) => {
    const rerun = reevaluated.find((item) => item.domain === original.domain);
    const current = rerun?.data ?? null;

    return {
      domain: original.domain,
      original,
      current,
      error: rerun?.error ?? null,
      diff: current ? {
        scoreDelta: current.score === null || original.score === null
          ? null
          : Number((current.score - original.score).toFixed(4)),
        confidenceDelta: Number((current.confidence - original.confidence).toFixed(4)),
        categoryChanged: current.category !== original.category,
        sourceTypeChanged: current.sourceType !== original.sourceType,
        biasIndicatorChanged: current.biasIndicator !== original.biasIndicator,
      } : null,
    };
  });

  const output = {
    generatedAt: new Date().toISOString(),
    changeUnderReview: {
      commit: "403e905ad6b4d0713ee283b758cdfc433b327375",
      title: "fix(calibration): harden inverse verification and SR contracts",
      sourceReliabilityFocus: [
        "Enum-normalize sourceType/politicalBias/otherBias",
        "Map legacy alias political_party -> advocacy",
        "Fallback unsupported values to canonical safe defaults",
        "Preserve canonical biasIndicator tokens",
        "Repair off-contract few-shot example",
      ],
    },
    sampleDomains: [...SAMPLE_DOMAINS],
    comparisons: paired,
  };

  const outputPath = path.resolve(
    process.cwd(),
    "../../Docs/AGENTS/Handoffs/2026-04-22_Senior_Developer_SR_Contract_Risk_Benefit_Comparison.json",
  );
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
