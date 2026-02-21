import fs from "node:fs";
import path from "node:path";

type Severity = "info" | "warning" | "error";

interface CalibrationWarning {
  type: string;
  severity: Severity | string;
  message: string;
  details?: Record<string, unknown>;
}

interface SideResult {
  warnings?: CalibrationWarning[];
}

interface PairResult {
  pairId?: string;
  status?: string;
  left?: SideResult;
  right?: SideResult;
}

interface CalibrationRun {
  pairResults?: PairResult[];
  aggregateMetrics?: {
    failureModes?: {
      meanRefusalRateDelta?: number;
      maxRefusalRateDelta?: number;
      meanDegradationRateDelta?: number;
      maxDegradationRateDelta?: number;
      asymmetryPairCount?: number;
      byProvider?: Record<string, unknown>;
      byStage?: Record<string, unknown>;
    };
  };
}

interface CollectedWarning extends CalibrationWarning {
  pairId: string;
  side: "left" | "right";
}

interface CheckResult {
  name: string;
  status: "PASS" | "WARN" | "FAIL";
  details: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function listJsonFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .map((f) => path.join(dirPath, f));
}

function latestFileByMtime(filePaths: string[]): string | null {
  if (filePaths.length === 0) return null;
  const sorted = [...filePaths].sort((a, b) => {
    const aTime = fs.statSync(a).mtimeMs;
    const bTime = fs.statSync(b).mtimeMs;
    return bTime - aTime;
  });
  return sorted[0] ?? null;
}

function parseArgs(argv: string[]): { targetPath?: string; prevPath?: string } {
  let targetPath: string | undefined;
  let prevPath: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--prev") {
      prevPath = argv[i + 1];
      i++;
      continue;
    }
    if (!token.startsWith("--") && !targetPath) {
      targetPath = token;
    }
  }

  return { targetPath, prevPath };
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function collectWarnings(run: CalibrationRun): CollectedWarning[] {
  const pairResults = Array.isArray(run.pairResults) ? run.pairResults : [];
  const out: CollectedWarning[] = [];

  for (const pair of pairResults) {
    if (pair.status !== "completed") continue;
    const pairId = pair.pairId ?? "unknown-pair";
    for (const side of ["left", "right"] as const) {
      const warnings = pair[side]?.warnings;
      if (!Array.isArray(warnings)) continue;
      for (const warning of warnings) {
        if (!warning || typeof warning.type !== "string") continue;
        out.push({
          pairId,
          side,
          type: warning.type,
          severity: warning.severity ?? "info",
          message: warning.message ?? "",
          details: isRecord(warning.details) ? warning.details : undefined,
        });
      }
    }
  }

  return out;
}

function countByType(warnings: CollectedWarning[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const w of warnings) {
    counts[w.type] = (counts[w.type] ?? 0) + 1;
  }
  return counts;
}

function validateProviderWarningStructure(warnings: CollectedWarning[]): CheckResult {
  const searchWarnings = warnings.filter((w) => w.type === "search_provider_error");
  if (searchWarnings.length === 0) {
    return {
      name: "search_provider_error carries occurrences/stageCounts",
      status: "WARN",
      details: ["No search_provider_error warnings observed in this run."],
    };
  }

  const failures: string[] = [];
  for (const warning of searchWarnings) {
    const details = warning.details ?? {};
    const occurrences = asNumber(details.occurrences);
    const stageCounts = details.stageCounts;
    if (!occurrences || occurrences < 1) {
      failures.push(`${warning.pairId}/${warning.side}: missing or invalid details.occurrences`);
    }
    if (!isRecord(stageCounts) || Object.keys(stageCounts).length === 0) {
      failures.push(`${warning.pairId}/${warning.side}: missing or empty details.stageCounts`);
    }
  }

  if (failures.length > 0) {
    return {
      name: "search_provider_error carries occurrences/stageCounts",
      status: "FAIL",
      details: failures,
    };
  }

  return {
    name: "search_provider_error carries occurrences/stageCounts",
    status: "PASS",
    details: [`Validated ${searchWarnings.length} search provider warning(s).`],
  };
}

function validateSourceReliabilitySeparation(warnings: CollectedWarning[]): CheckResult {
  const srWarnings = warnings.filter((w) => w.type === "source_reliability_error");
  if (srWarnings.length === 0) {
    return {
      name: "source_reliability_error separates errorCount vs noConsensusCount",
      status: "WARN",
      details: ["No source_reliability_error warnings observed in this run."],
    };
  }

  const failures: string[] = [];
  for (const warning of srWarnings) {
    const details = warning.details ?? {};
    if (asNumber(details.errorCount) === undefined) {
      failures.push(`${warning.pairId}/${warning.side}: missing details.errorCount`);
    }
    if (asNumber(details.noConsensusCount) === undefined) {
      failures.push(`${warning.pairId}/${warning.side}: missing details.noConsensusCount`);
    }
    if (!isRecord(details.errorByType) || Object.keys(details.errorByType).length === 0) {
      failures.push(`${warning.pairId}/${warning.side}: missing details.errorByType`);
    }
  }

  if (failures.length > 0) {
    return {
      name: "source_reliability_error separates errorCount vs noConsensusCount",
      status: "FAIL",
      details: failures,
    };
  }

  return {
    name: "source_reliability_error separates errorCount vs noConsensusCount",
    status: "PASS",
    details: [`Validated ${srWarnings.length} source reliability warning(s).`],
  };
}

function validateSourceFetchWarningStructure(warnings: CollectedWarning[]): CheckResult {
  const fetchWarnings = warnings.filter((w) => w.type === "source_fetch_failure");
  const degrWarnings = warnings.filter((w) => w.type === "source_fetch_degradation");

  if (fetchWarnings.length === 0 && degrWarnings.length === 0) {
    return {
      name: "source_fetch warnings expose attempted/failed/failureRatio",
      status: "WARN",
      details: ["No source_fetch_failure/source_fetch_degradation warnings observed in this run."],
    };
  }

  const failures: string[] = [];
  for (const warning of fetchWarnings) {
    const details = warning.details ?? {};
    if (asNumber(details.attempted) === undefined) {
      failures.push(`${warning.pairId}/${warning.side}: source_fetch_failure missing details.attempted`);
    }
    if (asNumber(details.failed) === undefined) {
      failures.push(`${warning.pairId}/${warning.side}: source_fetch_failure missing details.failed`);
    }
    if (asNumber(details.failureRatio) === undefined) {
      failures.push(`${warning.pairId}/${warning.side}: source_fetch_failure missing details.failureRatio`);
    }
    if (asNumber(details.occurrences) === undefined) {
      failures.push(`${warning.pairId}/${warning.side}: source_fetch_failure missing details.occurrences`);
    }
  }
  for (const warning of degrWarnings) {
    const details = warning.details ?? {};
    if (asNumber(details.failureRatio) === undefined) {
      failures.push(`${warning.pairId}/${warning.side}: source_fetch_degradation missing details.failureRatio`);
    }
  }

  if (failures.length > 0) {
    return {
      name: "source_fetch warnings expose attempted/failed/failureRatio",
      status: "FAIL",
      details: failures,
    };
  }

  return {
    name: "source_fetch warnings expose attempted/failed/failureRatio",
    status: "PASS",
    details: [
      `Validated ${fetchWarnings.length} source_fetch_failure and ${degrWarnings.length} source_fetch_degradation warning(s).`,
    ],
  };
}

function validateFailureModesAggregation(run: CalibrationRun): CheckResult {
  const failureModes = run.aggregateMetrics?.failureModes;
  if (!isRecord(failureModes)) {
    return {
      name: "aggregateMetrics.failureModes is present",
      status: "FAIL",
      details: ["Missing aggregateMetrics.failureModes."],
    };
  }

  const byProvider = failureModes.byProvider;
  const byStage = failureModes.byStage;
  const hasProvider = isRecord(byProvider);
  const hasStage = isRecord(byStage);

  if (!hasProvider || !hasStage) {
    return {
      name: "aggregateMetrics.failureModes is present",
      status: "FAIL",
      details: ["failureModes.byProvider or failureModes.byStage is missing."],
    };
  }

  return {
    name: "aggregateMetrics.failureModes is present",
    status: "PASS",
    details: [
      `byProvider keys: ${Object.keys(byProvider).length}, byStage keys: ${Object.keys(byStage).length}`,
    ],
  };
}

function compareFailureModeDeltas(current: CalibrationRun, previous: CalibrationRun): string[] {
  const currentFm = current.aggregateMetrics?.failureModes;
  const previousFm = previous.aggregateMetrics?.failureModes;
  if (!isRecord(currentFm) || !isRecord(previousFm)) {
    return ["Previous/current failureModes missing; delta comparison skipped."];
  }

  const numericFields = [
    "meanRefusalRateDelta",
    "maxRefusalRateDelta",
    "meanDegradationRateDelta",
    "maxDegradationRateDelta",
    "asymmetryPairCount",
  ] as const;

  const lines: string[] = [];
  for (const field of numericFields) {
    const curr = asNumber(currentFm[field]);
    const prev = asNumber(previousFm[field]);
    if (curr === undefined || prev === undefined) {
      lines.push(`${field}: n/a`);
      continue;
    }
    const delta = curr - prev;
    const sign = delta > 0 ? "+" : "";
    lines.push(`${field}: ${prev.toFixed(2)} -> ${curr.toFixed(2)} (${sign}${delta.toFixed(2)})`);
  }
  return lines;
}

function printResult(result: CheckResult): void {
  const icon = result.status === "PASS" ? "[PASS]" : result.status === "WARN" ? "[WARN]" : "[FAIL]";
  console.log(`${icon} ${result.name}`);
  for (const detail of result.details) {
    console.log(`  - ${detail}`);
  }
}

function main(): void {
  const { targetPath, prevPath } = parseArgs(process.argv.slice(2));
  const biasDir = path.resolve(process.cwd(), "test", "output", "bias");
  const resolvedTarget = targetPath
    ? path.resolve(process.cwd(), targetPath)
    : latestFileByMtime(listJsonFiles(biasDir));

  if (!resolvedTarget || !fs.existsSync(resolvedTarget)) {
    console.error(`[FAIL] Could not locate calibration JSON. Checked: ${resolvedTarget ?? biasDir}`);
    process.exit(1);
  }

  const raw = readJsonFile(resolvedTarget);
  if (!isRecord(raw)) {
    console.error(`[FAIL] Invalid JSON root in ${resolvedTarget}`);
    process.exit(1);
  }

  const run = raw as CalibrationRun;
  const warnings = collectWarnings(run);
  const warningTypeCounts = countByType(warnings);

  console.log(`Calibration JSON: ${resolvedTarget}`);
  console.log(`Collected warnings: ${warnings.length}`);
  console.log(`Warning types: ${Object.keys(warningTypeCounts).length}`);

  const keyTypes = [
    "source_reliability_error",
    "source_fetch_failure",
    "source_fetch_degradation",
    "search_provider_error",
  ];
  for (const t of keyTypes) {
    const count = warningTypeCounts[t] ?? 0;
    console.log(`  - ${t}: ${count}`);
  }

  const checks: CheckResult[] = [
    validateFailureModesAggregation(run),
    validateProviderWarningStructure(warnings),
    validateSourceReliabilitySeparation(warnings),
    validateSourceFetchWarningStructure(warnings),
  ];

  console.log("");
  for (const check of checks) {
    printResult(check);
  }

  if (prevPath) {
    const resolvedPrev = path.resolve(process.cwd(), prevPath);
    if (fs.existsSync(resolvedPrev)) {
      const prevRaw = readJsonFile(resolvedPrev);
      if (isRecord(prevRaw)) {
        const deltaLines = compareFailureModeDeltas(run, prevRaw as CalibrationRun);
        console.log("");
        console.log("Failure-mode deltas vs previous run:");
        for (const line of deltaLines) {
          console.log(`  - ${line}`);
        }
      }
    } else {
      console.log("");
      console.log(`[WARN] --prev file not found: ${resolvedPrev}`);
    }
  }

  const failCount = checks.filter((c) => c.status === "FAIL").length;
  const warnCount = checks.filter((c) => c.status === "WARN").length;
  console.log("");
  console.log(`Summary: ${checks.length - failCount - warnCount} PASS, ${warnCount} WARN, ${failCount} FAIL`);

  process.exit(failCount > 0 ? 1 : 0);
}

main();
