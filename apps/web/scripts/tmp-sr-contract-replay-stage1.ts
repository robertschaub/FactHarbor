/**
 * Stage 1 — SR Contract Controlled Replay (Lite)
 *
 * Scope: Plan v2.1, Stage 1.
 *
 * Runs the CURRENT (patched) SR engine against pinned evidence packs that
 * were captured in the Risk/Benefit comparison JSON. The live search step
 * and the evidence quality assessment step are bypassed so variance in the
 * result is attributable to:
 *   - LLM sampling non-determinism, AND
 *   - The patch bundle (enum normalization, few-shot correction, biasIndicator
 *     pass-through, etc.) applied in commit 403e905a
 * only — not search-provider drift.
 *
 * Lanes (per Plan v2.1):
 *   A2 = current code × ORIGINAL pre-change evidence pack
 *   B2 = current code × CURRENT post-change evidence pack
 *   (A1/B1 are Stage 2; they require the pre-change worktree.)
 *
 * For the canonical control (non-news, stable) we only have a pre-change
 * evaluation, so we run A2 only — 3 repeats × 2 multiModel modes = 6 runs.
 *
 * Repeats: 3 per cell, both multiModel modes. Score-delta noise floor 0.03.
 *
 * Cache isolation: FH_SR_CACHE_PATH is forced to a dedicated file BEFORE any
 * SR modules are imported so the production cache is neither read nor written.
 */

import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

// Load .env.local BEFORE importing SR modules so provider API keys are available.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const STAGE1_CACHE_RELATIVE = "./sr-replay-cache-stage1.db";
process.env.FH_SR_CACHE_PATH = path.resolve(process.cwd(), STAGE1_CACHE_RELATIVE);

const COMPARISON_JSON_REL =
  "../../Docs/AGENTS/Handoffs/2026-04-22_Senior_Developer_SR_Contract_Risk_Benefit_Comparison.json";
const CANONICAL_JSON_REL =
  "../../Docs/AGENTS/Handoffs/2026-04-22_Senior_Developer_SR_Contract_Replay_Canonical.json";
const FIXTURE_OUT_REL =
  "../../Docs/AGENTS/Handoffs/2026-04-22_Senior_Developer_SR_Contract_Replay_Stage1_Fixture.json";
const RESULTS_OUT_REL =
  "../../Docs/AGENTS/Handoffs/2026-04-22_Senior_Developer_SR_Contract_Replay_Stage1_Results.json";

const REPEATS_PER_CELL = 3;
const NOISE_FLOOR = 0.03;
const MODES: Array<{ label: "multi" | "single"; multiModel: boolean }> = [
  { label: "multi", multiModel: true },
  { label: "single", multiModel: false },
];

// Canonical pre-change pack to use as a non-news control.
const CANONICAL_DOMAIN = "encyclopedia.ushmm.org";

type PinnedPack = {
  enabled: boolean;
  providersUsed: string[];
  queries: string[];
  items: Array<Record<string, unknown>>;
  qualityAssessment?: Record<string, unknown>;
};

type FixtureEntry = {
  domain: string;
  isCanonicalControl: boolean;
  originalBaseline: {
    score: number | null;
    confidence: number;
    category: string | null;
    sourceType: string | null;
    biasIndicator: string | null;
    consensusAchieved: boolean;
    modelPrimary: string | null;
    modelSecondary: string | null;
    evaluatedAt: string | null;
  };
  currentBaseline: null | {
    score: number | null;
    confidence: number;
    category: string | null;
    sourceType: string | null;
    biasIndicator: string | null;
  };
  lanes: {
    A2?: PinnedPack; // current code × original pack
    B2?: PinnedPack; // current code × current pack
  };
};

type Fixture = {
  generatedAt: string;
  note: string;
  stage: 1;
  domains: FixtureEntry[];
};

type RunResult = {
  domain: string;
  lane: "A2" | "B2";
  mode: "multi" | "single";
  rep: number;
  success: boolean;
  score: number | null;
  confidence: number;
  category: string | null;
  sourceType: string | null;
  biasIndicator: string | null;
  refinementApplied: boolean | null;
  errorReason?: string;
  errorDetails?: string;
  startedAtMs: number;
  durationMs: number;
};

function normalizePack(rawPack: unknown): PinnedPack {
  const pack = (rawPack ?? {}) as Record<string, unknown>;
  return {
    enabled: true,
    providersUsed: Array.isArray(pack.providersUsed) ? (pack.providersUsed as string[]) : [],
    queries: Array.isArray(pack.queries) ? (pack.queries as string[]) : [],
    items: Array.isArray(pack.items) ? (pack.items as Array<Record<string, unknown>>) : [],
    qualityAssessment: (pack.qualityAssessment as Record<string, unknown>) ?? {
      status: "skipped",
      model: "unknown",
      skippedReason: "budget_guard",
    },
  };
}

async function loadFixture(): Promise<Fixture> {
  const comparisonRaw = await fs.readFile(path.resolve(process.cwd(), COMPARISON_JSON_REL), "utf8");
  const comparison = JSON.parse(comparisonRaw) as {
    comparisons: Array<{
      domain: string;
      original: {
        score: number | null;
        confidence: number;
        category?: string | null;
        sourceType?: string | null;
        biasIndicator?: string | null;
        consensusAchieved?: boolean;
        modelPrimary?: string | null;
        modelSecondary?: string | null;
        evaluatedAt?: string | null;
        evidencePack?: unknown;
      };
      current: null | {
        score: number | null;
        confidence: number;
        category?: string | null;
        sourceType?: string | null;
        biasIndicator?: string | null;
        evidencePack?: unknown;
      };
    }>;
  };

  const canonicalRaw = await fs.readFile(path.resolve(process.cwd(), CANONICAL_JSON_REL), "utf8");
  const canonicalArr = JSON.parse(canonicalRaw) as Array<{
    domain: string;
    score: number | null;
    confidence: number;
    evaluated_at: string;
    model_primary: string | null;
    model_secondary: string | null;
    consensus_achieved: number;
    category: string | null;
    bias_indicator: string | null;
    source_type: string | null;
    evidence_pack: string | null;
  }>;
  const canonicalRow = canonicalArr.find((r) => r.domain === CANONICAL_DOMAIN);
  if (!canonicalRow || !canonicalRow.evidence_pack) {
    throw new Error(`Missing canonical row for ${CANONICAL_DOMAIN}`);
  }
  const canonicalPack = normalizePack(JSON.parse(canonicalRow.evidence_pack));

  const entries: FixtureEntry[] = [];

  for (const cmp of comparison.comparisons) {
    const originalPack = normalizePack(cmp.original?.evidencePack);
    const currentPack = cmp.current?.evidencePack ? normalizePack(cmp.current.evidencePack) : undefined;

    entries.push({
      domain: cmp.domain,
      isCanonicalControl: false,
      originalBaseline: {
        score: cmp.original.score,
        confidence: cmp.original.confidence,
        category: cmp.original.category ?? null,
        sourceType: cmp.original.sourceType ?? null,
        biasIndicator: cmp.original.biasIndicator ?? null,
        consensusAchieved: cmp.original.consensusAchieved ?? false,
        modelPrimary: cmp.original.modelPrimary ?? null,
        modelSecondary: cmp.original.modelSecondary ?? null,
        evaluatedAt: cmp.original.evaluatedAt ?? null,
      },
      currentBaseline: cmp.current
        ? {
            score: cmp.current.score,
            confidence: cmp.current.confidence,
            category: cmp.current.category ?? null,
            sourceType: cmp.current.sourceType ?? null,
            biasIndicator: cmp.current.biasIndicator ?? null,
          }
        : null,
      lanes: {
        A2: originalPack,
        B2: currentPack,
      },
    });
  }

  entries.push({
    domain: CANONICAL_DOMAIN,
    isCanonicalControl: true,
    originalBaseline: {
      score: canonicalRow.score,
      confidence: canonicalRow.confidence,
      category: canonicalRow.category,
      sourceType: canonicalRow.source_type,
      biasIndicator: canonicalRow.bias_indicator,
      consensusAchieved: canonicalRow.consensus_achieved === 1,
      modelPrimary: canonicalRow.model_primary,
      modelSecondary: canonicalRow.model_secondary,
      evaluatedAt: canonicalRow.evaluated_at,
    },
    currentBaseline: null,
    lanes: {
      A2: canonicalPack,
      // No B2 for canonical — no post-change live run exists and we do not want
      // to spend a live search pass just to produce one for the lite stage.
    },
  });

  return {
    generatedAt: new Date().toISOString(),
    stage: 1,
    note: "Frozen fixture for Plan v2.1 Stage 1 (Lite-Replay). A1/B1 lanes require a pre-patch worktree and are not part of Stage 1.",
    domains: entries,
  };
}

function median(nums: number[]): number | null {
  const xs = nums.filter((n) => Number.isFinite(n));
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function range(nums: number[]): { min: number; max: number; spread: number } | null {
  const xs = nums.filter((n) => Number.isFinite(n));
  if (xs.length === 0) return null;
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  return { min, max, spread: Number((max - min).toFixed(4)) };
}

async function main(): Promise<void> {
  const fixture = await loadFixture();

  await fs.writeFile(
    path.resolve(process.cwd(), FIXTURE_OUT_REL),
    `${JSON.stringify(fixture, null, 2)}\n`,
    "utf8",
  );
  console.log(`[Stage1] Fixture written: ${FIXTURE_OUT_REL}`);

  // Import SR runtime AFTER FH_SR_CACHE_PATH is set.
  const configStorageModule = await import("../src/lib/config-storage.ts");
  const schemasModule = await import("../src/lib/config-schemas.ts");
  const srConfigModule = await import("../src/lib/source-reliability-config.ts");
  const srEnrichmentModule = await import("../src/lib/source-reliability/sr-eval-enrichment.ts");
  const srEngineModule = await import("../src/lib/source-reliability/sr-eval-engine.ts");

  const getConfig =
    (configStorageModule as any).getConfig ?? (configStorageModule as any).default?.getConfig;
  const DEFAULT_SR_CONFIG =
    (schemasModule as any).DEFAULT_SR_CONFIG ?? (schemasModule as any).default?.DEFAULT_SR_CONFIG;
  const DEFAULT_CONFIDENCE_THRESHOLD =
    (srConfigModule as any).DEFAULT_CONFIDENCE_THRESHOLD ??
    (srConfigModule as any).default?.DEFAULT_CONFIDENCE_THRESHOLD;
  const normalizeEvidenceQualityAssessmentConfig =
    (srEnrichmentModule as any).normalizeEvidenceQualityAssessmentConfig ??
    (srEnrichmentModule as any).default?.normalizeEvidenceQualityAssessmentConfig;
  const evaluateSourceWithPinnedEvidencePack =
    (srEngineModule as any).evaluateSourceWithPinnedEvidencePack ??
    (srEngineModule as any).default?.evaluateSourceWithPinnedEvidencePack;

  if (
    !getConfig ||
    !DEFAULT_SR_CONFIG ||
    !normalizeEvidenceQualityAssessmentConfig ||
    !evaluateSourceWithPinnedEvidencePack
  ) {
    throw new Error("Failed to resolve one or more SR runtime imports.");
  }

  const srConfigResult = await getConfig("sr", "default");
  const liveSrConfig = srConfigResult.config;
  const evidenceQualityAssessmentConfig = normalizeEvidenceQualityAssessmentConfig(
    liveSrConfig.evidenceQualityAssessment,
    DEFAULT_SR_CONFIG.evidenceQualityAssessment,
  );
  const confidenceThreshold =
    liveSrConfig.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;

  // Minimal SrEvalConfig — pinned-pack path only uses openaiModel.
  const baseConfig = {
    openaiModel: liveSrConfig.openaiModel,
    searchConfig: {} as any,
    evalUseSearch: false,
    evalMaxResultsPerQuery: 0,
    evalMaxEvidenceItems: 0,
    evalDateRestrict: null as "y" | "m" | "w" | null,
    rateLimitPerIp: 0,
    domainCooldownSec: 0,
    evidenceQualityAssessment: evidenceQualityAssessmentConfig,
    requestStartedAtMs: Date.now(),
    requestBudgetMs: null as number | null,
  };

  const runs: RunResult[] = [];

  // Build cell list.
  type Cell = { domain: string; lane: "A2" | "B2"; mode: "multi" | "single"; pack: PinnedPack; isCanonicalControl: boolean };
  const cells: Cell[] = [];
  for (const entry of fixture.domains) {
    for (const mode of MODES) {
      if (entry.lanes.A2) {
        cells.push({
          domain: entry.domain,
          lane: "A2",
          mode: mode.label,
          pack: entry.lanes.A2,
          isCanonicalControl: entry.isCanonicalControl,
        });
      }
      if (entry.lanes.B2) {
        cells.push({
          domain: entry.domain,
          lane: "B2",
          mode: mode.label,
          pack: entry.lanes.B2,
          isCanonicalControl: entry.isCanonicalControl,
        });
      }
    }
  }

  const totalRuns = cells.length * REPEATS_PER_CELL;
  console.log(`[Stage1] Executing ${totalRuns} runs across ${cells.length} cells...`);

  let runIndex = 0;
  for (const cell of cells) {
    for (let rep = 1; rep <= REPEATS_PER_CELL; rep++) {
      runIndex++;
      const multiModel = cell.mode === "multi";
      const startedAtMs = Date.now();
      process.stdout.write(
        `[Stage1] (${runIndex}/${totalRuns}) ${cell.domain} | lane=${cell.lane} | mode=${cell.mode} | rep=${rep} ... `,
      );
      try {
        const result = await evaluateSourceWithPinnedEvidencePack(
          cell.domain,
          cell.pack,
          multiModel,
          confidenceThreshold,
          { ...baseConfig, requestStartedAtMs: startedAtMs },
        );
        const durationMs = Date.now() - startedAtMs;

        if (result.success) {
          runs.push({
            domain: cell.domain,
            lane: cell.lane,
            mode: cell.mode,
            rep,
            success: true,
            score: result.data.score,
            confidence: result.data.confidence,
            category: result.data.category,
            sourceType: result.data.sourceType ?? null,
            biasIndicator: result.data.biasIndicator ?? null,
            refinementApplied: result.data.refinementApplied ?? null,
            startedAtMs,
            durationMs,
          });
          console.log(
            `score=${result.data.score} conf=${result.data.confidence.toFixed(2)} cat=${result.data.category} (${durationMs}ms)`,
          );
        } else {
          runs.push({
            domain: cell.domain,
            lane: cell.lane,
            mode: cell.mode,
            rep,
            success: false,
            score: null,
            confidence: 0,
            category: null,
            sourceType: null,
            biasIndicator: null,
            refinementApplied: null,
            errorReason: result.error.reason,
            errorDetails: result.error.details,
            startedAtMs,
            durationMs,
          });
          console.log(`FAILED reason=${result.error.reason}`);
        }
      } catch (err: unknown) {
        const durationMs = Date.now() - startedAtMs;
        const msg = err instanceof Error ? err.message : String(err);
        runs.push({
          domain: cell.domain,
          lane: cell.lane,
          mode: cell.mode,
          rep,
          success: false,
          score: null,
          confidence: 0,
          category: null,
          sourceType: null,
          biasIndicator: null,
          refinementApplied: null,
          errorReason: "exception",
          errorDetails: msg,
          startedAtMs,
          durationMs,
        });
        console.log(`EXCEPTION ${msg.slice(0, 80)}`);
      }
    }
  }

  // ==========================================================================
  // Summarize
  // ==========================================================================

  type CellSummary = {
    domain: string;
    lane: "A2" | "B2";
    mode: "multi" | "single";
    isCanonicalControl: boolean;
    runs: number;
    successes: number;
    score: {
      median: number | null;
      min: number | null;
      max: number | null;
      spread: number | null;
      values: Array<number | null>;
    };
    confidence: {
      median: number | null;
      values: number[];
    };
    categories: string[];
    sourceTypes: string[];
    biasIndicators: string[];
  };

  const summaries: CellSummary[] = [];
  for (const cell of cells) {
    const cellRuns = runs.filter(
      (r) => r.domain === cell.domain && r.lane === cell.lane && r.mode === cell.mode,
    );
    const successes = cellRuns.filter((r) => r.success);
    const scoreValues = successes.map((r) => (r.score === null ? Number.NaN : r.score));
    const finiteScores = scoreValues.filter((n) => Number.isFinite(n)) as number[];
    const confValues = successes.map((r) => r.confidence);
    const scoreRange = range(finiteScores);
    summaries.push({
      domain: cell.domain,
      lane: cell.lane,
      mode: cell.mode,
      isCanonicalControl: cell.isCanonicalControl,
      runs: cellRuns.length,
      successes: successes.length,
      score: {
        median: median(finiteScores),
        min: scoreRange?.min ?? null,
        max: scoreRange?.max ?? null,
        spread: scoreRange?.spread ?? null,
        values: successes.map((r) => r.score),
      },
      confidence: {
        median: median(confValues),
        values: confValues,
      },
      categories: [...new Set(successes.map((r) => r.category).filter(Boolean) as string[])],
      sourceTypes: [...new Set(successes.map((r) => r.sourceType).filter(Boolean) as string[])],
      biasIndicators: [...new Set(successes.map((r) => r.biasIndicator ?? "(null)"))],
    });
  }

  // Canonical gate: if canonical cells' score spread stays within noise floor AND
  // categories are stable, Stage 1 verdict is "Keep / do not escalate".
  const canonicalSummaries = summaries.filter((s) => s.isCanonicalControl);
  const canonicalWithinNoise = canonicalSummaries.every(
    (s) => s.score.spread !== null && s.score.spread <= NOISE_FLOOR && s.categories.length <= 1,
  );

  const escalationReasons: string[] = [];
  if (!canonicalWithinNoise) {
    for (const s of canonicalSummaries) {
      if (s.score.spread !== null && s.score.spread > NOISE_FLOOR) {
        escalationReasons.push(
          `Canonical ${s.domain} [lane=${s.lane}, mode=${s.mode}] score spread ${s.score.spread} exceeds noise floor ${NOISE_FLOOR}`,
        );
      }
      if (s.categories.length > 1) {
        escalationReasons.push(
          `Canonical ${s.domain} [lane=${s.lane}, mode=${s.mode}] categories oscillated: ${s.categories.join(", ")}`,
        );
      }
    }
  }

  // Cross-lane (A2 vs B2) delta for the 4 non-canonical domains — informational only in Stage 1.
  type LaneDelta = {
    domain: string;
    mode: "multi" | "single";
    medianA2: number | null;
    medianB2: number | null;
    delta: number | null;
    categoryStableA2: boolean;
    categoryStableB2: boolean;
    crossLaneCategoryMatch: boolean;
  };
  const laneDeltas: LaneDelta[] = [];
  for (const entry of fixture.domains) {
    if (entry.isCanonicalControl) continue;
    for (const mode of MODES) {
      const a2 = summaries.find(
        (s) => s.domain === entry.domain && s.lane === "A2" && s.mode === mode.label,
      );
      const b2 = summaries.find(
        (s) => s.domain === entry.domain && s.lane === "B2" && s.mode === mode.label,
      );
      const delta =
        a2?.score.median !== undefined &&
        a2?.score.median !== null &&
        b2?.score.median !== undefined &&
        b2?.score.median !== null
          ? Number((b2.score.median - a2.score.median).toFixed(4))
          : null;
      laneDeltas.push({
        domain: entry.domain,
        mode: mode.label,
        medianA2: a2?.score.median ?? null,
        medianB2: b2?.score.median ?? null,
        delta,
        categoryStableA2: (a2?.categories.length ?? 0) <= 1,
        categoryStableB2: (b2?.categories.length ?? 0) <= 1,
        crossLaneCategoryMatch:
          (a2?.categories[0] ?? null) === (b2?.categories[0] ?? null) &&
          (a2?.categories.length ?? 0) <= 1 &&
          (b2?.categories.length ?? 0) <= 1,
      });
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    plan: "Plan v2.1 Stage 1 — Lite-Replay (same-commit, pinned evidence packs)",
    commitUnderReview: "403e905ad6b4d0713ee283b758cdfc433b327375",
    cacheIsolatedAt: process.env.FH_SR_CACHE_PATH,
    config: {
      repeatsPerCell: REPEATS_PER_CELL,
      noiseFloor: NOISE_FLOOR,
      modes: MODES.map((m) => m.label),
      confidenceThreshold,
      openaiModel: baseConfig.openaiModel,
    },
    fixture: {
      path: FIXTURE_OUT_REL,
      domains: fixture.domains.map((d) => ({
        domain: d.domain,
        isCanonicalControl: d.isCanonicalControl,
        lanes: {
          A2: d.lanes.A2 ? { items: d.lanes.A2.items.length } : null,
          B2: d.lanes.B2 ? { items: d.lanes.B2.items.length } : null,
        },
      })),
    },
    runs,
    summaries,
    crossLaneDeltas: laneDeltas,
    canonicalGate: {
      withinNoiseFloor: canonicalWithinNoise,
      escalateToStage2: !canonicalWithinNoise,
      reasons: escalationReasons,
    },
  };

  await fs.writeFile(
    path.resolve(process.cwd(), RESULTS_OUT_REL),
    `${JSON.stringify(output, null, 2)}\n`,
    "utf8",
  );
  console.log(`\n[Stage1] Results written: ${RESULTS_OUT_REL}`);
  console.log(
    `[Stage1] Canonical within noise floor: ${canonicalWithinNoise ? "YES (stop — patch stable on canonical)" : "NO (escalate to Stage 2)"}`,
  );
  if (!canonicalWithinNoise) {
    for (const r of escalationReasons) console.log(`  - ${r}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
