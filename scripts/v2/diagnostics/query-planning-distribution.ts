import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  buildClaimUnderstandingStageHandoff,
} from "@/lib/analyzer-v2/claim-understanding/stage-handoff";
import {
  runClaimUnderstandingRuntimeStage,
} from "@/lib/analyzer-v2/claim-understanding/runtime-stage";
import {
  buildEvidenceQueryPlanningInspection,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection";
import {
  runEvidenceQueryPlanningRuntime,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";
import {
  buildClaimBoundaryV2RunContext,
  CLAIM_UNDERSTANDING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT,
  QUERY_PLANNING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT,
} from "@/lib/analyzer-v2/run-context";
import {
  buildClaimUnderstandingRuntimeActivation,
} from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-activation";
import {
  createClaimUnderstandingRuntimeInMemoryArtifactSink,
} from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink";
import {
  buildEvidenceQueryPlanningProviderFactory,
} from "@/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory";
import {
  buildEvidenceQueryPlanningProviderRuntimeConfigSnapshot,
  validateEvidenceQueryPlanningProviderRuntimeConfigSnapshot,
} from "@/lib/analyzer-v2-runtime/evidence-query-planning-provider-runtime-config.contract";

export const QUERY_PLANNING_DISTRIBUTION_DIAGNOSTIC_VERSION =
  "v2.x7-w2-qc2.query-planning-distribution.0";
export const STOP_AFTER_QUERY_PLANNING_INSPECTION =
  "STOP_AFTER_QUERY_PLANNING_INSPECTION";

export const CAPTAIN_DEFINED_INPUTS = {
  swiss_asylum_population: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
  bolsonaro_fair_trial:
    "Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?",
  hydrogen_cars_efficiency: "Using hydrogen for cars is more efficient than using electricity",
} as const;

export type CaptainDefinedInputKey = keyof typeof CAPTAIN_DEFINED_INPUTS;

type ProviderTelemetrySummary = {
  providerId: string | null;
  modelId: string | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
};

type StageSummary = {
  status: string;
  blockedReason: string | null;
  damagedReason: string | null;
  attemptStatuses: readonly string[];
  failureMessage: string | null;
  promptContentHash: string | null;
  renderedPromptHash: string | null;
  configSnapshotHash: string | null;
  modelPolicyId: string | null;
  telemetry: ProviderTelemetrySummary;
};

export type QueryPlanningDistributionDiagnosticResult = {
  diagnosticVersion: typeof QUERY_PLANNING_DISTRIBUTION_DIAGNOSTIC_VERSION;
  stopMarker: typeof STOP_AFTER_QUERY_PLANNING_INSPECTION;
  inputKey: CaptainDefinedInputKey;
  inputText: string;
  inputTextHash: string;
  commit: string;
  generatedUtc: string;
  runId: string;
  modelPolicySnapshotHash: string;
  claimUnderstanding: StageSummary & {
    handoffStatus: string;
    selectedAtomicClaimCount: number;
    artifactCount: number;
  };
  queryPlanning: StageSummary & {
    inspectionStatus: string | null;
    queryEntryCount: number | null;
    selectedAtomicClaimCount: number | null;
    queryEntryTargetAtomicClaimCount: number | null;
    compatibleWithW2CurrentCap: boolean | null;
  };
  downstreamExecutionCalled: false;
};

type CliOptions =
  | { mode: "help" | "list" }
  | { mode: "run"; inputKey: CaptainDefinedInputKey };

const W2_CURRENT_QUERY_ENTRY_CAP = 2;

function readEnvAssignment(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return null;
  }

  const rawValue = trimmed.slice(separatorIndex + 1).trim();
  const quote = rawValue[0];
  const value = (quote === "\"" || quote === "'") && rawValue.at(-1) === quote
    ? rawValue.slice(1, -1)
    : rawValue;
  return [key, value];
}

function loadAppEnvironment(): void {
  const appDir = path.basename(process.cwd()).toLowerCase() === "web"
    && path.basename(path.dirname(process.cwd())).toLowerCase() === "apps"
    ? process.cwd()
    : path.resolve(__dirname, "../../../apps/web");
  const envPath = path.join(appDir, ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const assignment = readEnvAssignment(line);
    if (!assignment) {
      continue;
    }
    const [key, value] = assignment;
    process.env[key] ??= value;
  }
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function currentCommit(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "git_commit_unavailable";
  }
}

function buildIngress(inputKey: CaptainDefinedInputKey, inputText: string): ClaimBoundaryV2Ingress {
  return {
    runIdHint: `v2-x7-w2-qc2-${inputKey}-${Date.now()}`,
    submitted: {
      kind: "text",
      value: inputText,
    },
    preparedSeed: null,
    selectedAtomicClaimIds: [],
  };
}

function emptyTelemetry(): ProviderTelemetrySummary {
  return {
    providerId: null,
    modelId: null,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    durationMs: 0,
  };
}

function summarizeClaimUnderstandingArtifacts(
  records: ReturnType<typeof createClaimUnderstandingRuntimeInMemoryArtifactSink>["records"],
): Pick<StageSummary, "attemptStatuses" | "failureMessage" | "promptContentHash" | "renderedPromptHash" | "configSnapshotHash" | "modelPolicyId" | "telemetry"> {
  const latest = records.at(-1) ?? null;
  const attempts = latest?.adapterAttemptDiagnostics ?? [];
  const telemetry = latest?.providerTelemetry ?? null;
  return {
    attemptStatuses: attempts.map((attempt) => attempt.status),
    failureMessage: latest?.failureState.failureMessage ?? attempts.at(-1)?.failureMessage ?? null,
    promptContentHash: latest?.promptContentHash ?? attempts.at(-1)?.promptContentHash ?? null,
    renderedPromptHash: latest?.renderedPromptHash ?? null,
    configSnapshotHash: latest?.configSnapshotHash ?? null,
    modelPolicyId: "v2.model.claim_understanding.0",
    telemetry: telemetry
      ? {
        providerId: telemetry.providerId,
        modelId: telemetry.modelId,
        inputTokens: telemetry.inputTokens,
        outputTokens: telemetry.outputTokens,
        totalTokens: telemetry.totalTokens,
        durationMs: telemetry.durationMs,
      }
      : emptyTelemetry(),
  };
}

function summarizeQueryPlanning(
  runtimeResult: Awaited<ReturnType<typeof runEvidenceQueryPlanningRuntime>>,
): StageSummary {
  const telemetry = runtimeResult.adapterOutcome?.telemetry ?? null;
  const attempts = runtimeResult.adapterOutcome?.attempts ?? [];
  return {
    status: runtimeResult.result.status,
    blockedReason: runtimeResult.result.blockedReason ?? runtimeResult.blockedReason,
    damagedReason: runtimeResult.result.damagedReason,
    attemptStatuses: attempts.map((attempt) => attempt.status),
    failureMessage: attempts.at(-1)?.failureMessage ?? null,
    promptContentHash: runtimeResult.promptProvenance?.promptContentHash ?? null,
    renderedPromptHash: runtimeResult.promptProvenance?.renderedPromptHash ?? null,
    configSnapshotHash: runtimeResult.promptProvenance?.configSnapshotHash ?? telemetry?.configSnapshotHash ?? null,
    modelPolicyId: telemetry?.modelPolicyId ?? null,
    telemetry: telemetry
      ? {
        providerId: telemetry.providerId,
        modelId: telemetry.modelId,
        inputTokens: telemetry.tokenUsage.inputTokens,
        outputTokens: telemetry.tokenUsage.outputTokens,
        totalTokens: telemetry.tokenUsage.totalTokens,
        durationMs: telemetry.durationMs,
      }
      : emptyTelemetry(),
  };
}

function buildSkippedQueryPlanningSummary(
  status: string,
  reason: string | null,
): QueryPlanningDistributionDiagnosticResult["queryPlanning"] {
  return {
    status,
    blockedReason: reason,
    damagedReason: null,
    attemptStatuses: [],
    failureMessage: reason,
    promptContentHash: null,
    renderedPromptHash: null,
    configSnapshotHash: null,
    modelPolicyId: null,
    telemetry: emptyTelemetry(),
    inspectionStatus: null,
    queryEntryCount: null,
    selectedAtomicClaimCount: null,
    queryEntryTargetAtomicClaimCount: null,
    compatibleWithW2CurrentCap: null,
  };
}

export async function runQueryPlanningDistributionDiagnostic(
  inputKey: CaptainDefinedInputKey,
): Promise<QueryPlanningDistributionDiagnosticResult> {
  loadAppEnvironment();
  const inputText = CAPTAIN_DEFINED_INPUTS[inputKey];
  const generatedUtc = new Date().toISOString();
  const ingress = buildIngress(inputKey, inputText);
  const context = buildClaimBoundaryV2RunContext(ingress, {
    runtimeActivationStatus: CLAIM_UNDERSTANDING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT,
    queryPlanningRuntimeActivationStatus: QUERY_PLANNING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT,
  });
  const artifactSink = createClaimUnderstandingRuntimeInMemoryArtifactSink(context.observabilityLedger.ledgerId);
  const activation = buildClaimUnderstandingRuntimeActivation(context, { artifactSink });
  const claimUnderstandingState = await runClaimUnderstandingRuntimeStage(
    ingress,
    context,
    { activation },
  );
  const claimUnderstandingHandoff = buildClaimUnderstandingStageHandoff(context, claimUnderstandingState);
  const claimUnderstandingArtifacts = summarizeClaimUnderstandingArtifacts(artifactSink.records);
  const base = {
    diagnosticVersion: QUERY_PLANNING_DISTRIBUTION_DIAGNOSTIC_VERSION,
    stopMarker: STOP_AFTER_QUERY_PLANNING_INSPECTION,
    inputKey,
    inputText,
    inputTextHash: sha256Text(inputText),
    commit: currentCommit(),
    generatedUtc,
    runId: context.runId,
    modelPolicySnapshotHash: context.modelPolicy.snapshotHash,
    claimUnderstanding: {
      status: claimUnderstandingState.result?.status ?? claimUnderstandingState.status,
      blockedReason: claimUnderstandingState.result?.blockedReason ?? claimUnderstandingState.blockedReason,
      damagedReason: claimUnderstandingState.result?.damagedReason ?? null,
      ...claimUnderstandingArtifacts,
      handoffStatus: claimUnderstandingHandoff.status,
      selectedAtomicClaimCount: claimUnderstandingHandoff.selectedAtomicClaimIds.length,
      artifactCount: artifactSink.records.length,
    },
    downstreamExecutionCalled: false,
  } satisfies Omit<QueryPlanningDistributionDiagnosticResult, "queryPlanning">;

  if (claimUnderstandingHandoff.status !== "accepted") {
    return {
      ...base,
      queryPlanning: buildSkippedQueryPlanningSummary(
        "skipped_claim_understanding_not_accepted",
        claimUnderstandingHandoff.blockedReason ?? claimUnderstandingHandoff.damagedReason,
      ),
    };
  }

  const runtimeConfigSnapshot = buildEvidenceQueryPlanningProviderRuntimeConfigSnapshot(context);
  if (!runtimeConfigSnapshot) {
    return {
      ...base,
      queryPlanning: buildSkippedQueryPlanningSummary(
        "skipped_query_planning_config_snapshot_missing",
        "query_planning_config_snapshot_missing",
      ),
    };
  }

  const configValidation = validateEvidenceQueryPlanningProviderRuntimeConfigSnapshot(runtimeConfigSnapshot);
  if (configValidation.status === "blocked") {
    return {
      ...base,
      queryPlanning: buildSkippedQueryPlanningSummary(
        "skipped_query_planning_config_snapshot_blocked",
        configValidation.blockedReasons.join(","),
      ),
    };
  }

  const providerFactory = buildEvidenceQueryPlanningProviderFactory(runtimeConfigSnapshot);
  const selectedAtomicClaimIds = claimUnderstandingHandoff.claimContract.input.selectedAtomicClaimIds;
  const queryPlanningRuntimeResult = await runEvidenceQueryPlanningRuntime({
    claimContract: claimUnderstandingHandoff.claimContract,
    selectedAtomicClaimIds,
    currentDate: context.currentDate,
    configSnapshotHash: providerFactory.configSnapshotHash,
    providerId: providerFactory.providerId,
    modelId: providerFactory.modelId,
    providerCall: providerFactory.providerCall,
  });
  const inspection = buildEvidenceQueryPlanningInspection({
    runtimeResult: queryPlanningRuntimeResult,
    selectedAtomicClaimIds,
    selectedAtomicClaimSnapshotSource: "7l1_input_envelope",
  });
  const queryPlanningSummary = summarizeQueryPlanning(queryPlanningRuntimeResult);
  const inspectedSummary = inspection.status === "inspected" ? inspection.summary : null;

  return {
    ...base,
    queryPlanning: {
      ...queryPlanningSummary,
      inspectionStatus: inspection.status,
      queryEntryCount: inspectedSummary?.queryEntryCount ?? null,
      selectedAtomicClaimCount: inspectedSummary?.selectedAtomicClaimIds.length ?? null,
      queryEntryTargetAtomicClaimCount: inspectedSummary?.queryEntryTargetAtomicClaimIds.length ?? null,
      compatibleWithW2CurrentCap: typeof inspectedSummary?.queryEntryCount === "number"
        ? inspectedSummary.queryEntryCount <= W2_CURRENT_QUERY_ENTRY_CAP
        : null,
    },
  };
}

function parseArgs(argv: readonly string[]): CliOptions {
  if (argv.includes("--help") || argv.includes("-h")) {
    return { mode: "help" };
  }
  if (argv.includes("--list-inputs")) {
    return { mode: "list" };
  }

  const keyIndex = argv.findIndex((arg) => arg === "--input-key");
  if (keyIndex < 0) {
    throw new Error("Missing required --input-key. Use --list-inputs to inspect available keys.");
  }

  const inputKey = argv[keyIndex + 1] as CaptainDefinedInputKey | undefined;
  if (!inputKey || !(inputKey in CAPTAIN_DEFINED_INPUTS)) {
    throw new Error(`Invalid --input-key. Use one of: ${Object.keys(CAPTAIN_DEFINED_INPUTS).join(", ")}`);
  }

  return { mode: "run", inputKey };
}

function printHelp(): void {
  console.log([
    "Usage:",
    "  npx tsx ../../scripts/v2/diagnostics/query-planning-distribution.ts --input-key <key>",
    "  npx tsx ../../scripts/v2/diagnostics/query-planning-distribution.ts --list-inputs",
    "",
    "Run from apps/web so the application tsconfig resolves internal path aliases.",
  ].join("\n"));
}

async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  if (options.mode === "help") {
    printHelp();
    return;
  }
  if (options.mode === "list") {
    console.log(JSON.stringify(Object.keys(CAPTAIN_DEFINED_INPUTS), null, 2));
    return;
  }

  const result = await runQueryPlanningDistributionDiagnostic(options.inputKey);
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
