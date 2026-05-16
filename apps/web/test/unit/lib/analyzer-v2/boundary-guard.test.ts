import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const webRoot = process.cwd();
const srcRoot = path.resolve(webRoot, "src");
const appRoot = path.resolve(srcRoot, "app");
const componentsRoot = path.resolve(srcRoot, "components");
const analyzerV2RuntimeArtifactInspectionRoutePath = path.resolve(
  appRoot,
  "api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.ts",
);
const v1AnalyzerRoot = path.resolve(srcRoot, "lib/analyzer");
const v2AnalyzerRoot = path.resolve(srcRoot, "lib/analyzer-v2");
const analyzerV2RuntimeRoot = path.resolve(srcRoot, "lib/analyzer-v2-runtime");
const analyzerV2IndexPath = path.resolve(v2AnalyzerRoot, "index.ts");
const analyzerV2ExecutionSelectionPath = path.resolve(v2AnalyzerRoot, "execution-selection.ts");
const analyzerV2HiddenIntegrationHarnessPath = path.resolve(v2AnalyzerRoot, "hidden-integration-harness.ts");
const analyzerV2OrchestratorPath = path.resolve(v2AnalyzerRoot, "orchestrator.ts");
const analyzerV2PipelineShellPath = path.resolve(v2AnalyzerRoot, "pipeline-shell.ts");
const analyzerV2RunnerIngressPath = path.resolve(v2AnalyzerRoot, "runner-ingress.ts");
const v2PipelineInputPath = path.resolve(v2AnalyzerRoot, "pipeline-input.ts");
const analyzerV2CompatibilityViewPath = path.resolve(v2AnalyzerRoot, "compatibility-view.ts");
const analyzerV2ResultEnvelopePath = path.resolve(v2AnalyzerRoot, "result-envelope.ts");
const claimUnderstandingModelAdapterPath = path.resolve(v2AnalyzerRoot, "claim-understanding/model-adapter.ts");
const claimUnderstandingPromptLoaderPath = path.resolve(v2AnalyzerRoot, "claim-understanding/prompt-loader.ts");
const claimUnderstandingRuntimeStagePath = path.resolve(v2AnalyzerRoot, "claim-understanding/runtime-stage.ts");
const claimUnderstandingDispatchFramePath = path.resolve(v2AnalyzerRoot, "claim-understanding/dispatch-frame.ts");
const claimUnderstandingDispatchReadinessContractPath = path.resolve(
  v2AnalyzerRoot,
  "claim-understanding/dispatch-readiness-contract.ts",
);
const claimUnderstandingRuntimeDispatchPath = path.resolve(v2AnalyzerRoot, "claim-understanding/runtime-dispatch.ts");
const analyzerV2CachePolicyRegistryPath = path.resolve(v2AnalyzerRoot, "gateway/cache-policy-registry.ts");
const analyzerV2CacheGovernancePath = path.resolve(v2AnalyzerRoot, "gateway/cache-governance.ts");
const analyzerV2GatewayPolicyPath = path.resolve(v2AnalyzerRoot, "gateway/policy.ts");
const evidenceLifecycleRoot = path.resolve(v2AnalyzerRoot, "evidence-lifecycle");
const evidenceLifecycleSourceAcquisitionRoot = path.resolve(evidenceLifecycleRoot, "source-acquisition");
const evidenceLifecycleSourceAcquisitionExecutionContractPath = path.resolve(
  evidenceLifecycleSourceAcquisitionRoot,
  "execution-contract.ts",
);
const evidenceLifecycleSourceAcquisitionStructuralExecutorPath = path.resolve(
  evidenceLifecycleSourceAcquisitionRoot,
  "structural-executor.ts",
);
const evidenceLifecycleTaskPolicyRoot = path.resolve(evidenceLifecycleRoot, "task-policy");
const evidenceLifecycleTaskContractsRoot = path.resolve(evidenceLifecycleRoot, "task-contracts");
const evidenceLifecycleExecutionReadinessRoot = path.resolve(evidenceLifecycleRoot, "execution-readiness");
const evidenceLifecycleQueryPlanningRoot = path.resolve(evidenceLifecycleRoot, "query-planning");
const evidenceLifecycleEvidenceCorpusRoot = path.resolve(evidenceLifecycleRoot, "evidence-corpus");
const evidenceLifecycleSourceMaterialRoot = path.resolve(evidenceLifecycleRoot, "source-material");
const evidenceLifecycleSourceAcquisitionPortRoot = path.resolve(evidenceLifecycleRoot, "source-acquisition-port");
const analyzerV2RuntimeProviderContractPath = path.resolve(
  analyzerV2RuntimeRoot,
  "claim-understanding-provider-boundary.contract.ts",
);
const analyzerV2RuntimeProviderConfigContractPath = path.resolve(
  analyzerV2RuntimeRoot,
  "claim-understanding-provider-runtime-config.contract.ts",
);
const analyzerV2RuntimeActivationContractPath = path.resolve(
  analyzerV2RuntimeRoot,
  "claim-understanding-runtime-activation.contract.ts",
);
const analyzerV2RuntimeActivationPath = path.resolve(
  analyzerV2RuntimeRoot,
  "claim-understanding-runtime-activation.ts",
);
const analyzerV2RuntimeArtifactSinkPath = path.resolve(
  analyzerV2RuntimeRoot,
  "claim-understanding-runtime-artifact-sink.ts",
);
const analyzerV2RuntimeProviderFactoryPath = path.resolve(
  analyzerV2RuntimeRoot,
  "claim-understanding-provider-factory.ts",
);
const analyzerV2RuntimeSourceAcquisitionAuthorityPath = path.resolve(
  analyzerV2RuntimeRoot,
  "source-acquisition-runtime-authority.ts",
);
const analyzerV2RuntimeSourceAcquisitionConfigContractPath = path.resolve(
  analyzerV2RuntimeRoot,
  "source-acquisition-runtime-config.contract.ts",
);
const analyzerV2RuntimeSourceAcquisitionProviderContractPath = path.resolve(
  analyzerV2RuntimeRoot,
  "source-acquisition-provider-boundary.contract.ts",
);
const analyzerV2RuntimeSourceAcquisitionCandidateEnvelopePath = path.resolve(
  analyzerV2RuntimeRoot,
  "source-acquisition-candidate-envelope.ts",
);
const analyzerV2RuntimeSourceAcquisitionCandidateRuntimePath = path.resolve(
  analyzerV2RuntimeRoot,
  "source-acquisition-candidate-runtime.ts",
);
const analyzerV2RuntimeHiddenDirectTextCandidateAcquisitionHarnessPath = path.resolve(
  analyzerV2RuntimeRoot,
  "hidden-direct-text-candidate-acquisition-harness.ts",
);
const analyzerV2RuntimeHiddenDirectTextSourceMaterialReadinessHarnessPath = path.resolve(
  analyzerV2RuntimeRoot,
  "hidden-direct-text-source-material-readiness-harness.ts",
);
const analyzerV2RuntimeSourceAcquisitionNetworkAuthorityPath = path.resolve(
  analyzerV2RuntimeRoot,
  "source-acquisition-network-authority.ts",
);
const analyzerV2RuntimeSourceAcquisitionNetworkEnvelopePath = path.resolve(
  analyzerV2RuntimeRoot,
  "source-acquisition-network-envelope.ts",
);
const analyzerV2RuntimeSourceAcquisitionNetworkTransportPath = path.resolve(
  analyzerV2RuntimeRoot,
  "source-acquisition-network-transport.ts",
);
const analyzerV2RuntimeSourceAcquisitionNetworkFactoryPath = path.resolve(
  analyzerV2RuntimeRoot,
  "source-acquisition-network-factory.ts",
);
const analyzerV2RuntimeSourceAcquisitionContentAuthorityPath = path.resolve(
  analyzerV2RuntimeRoot,
  "source-acquisition-content-authority.ts",
);
const analyzerV2RuntimeSourceAcquisitionContentEnvelopePath = path.resolve(
  analyzerV2RuntimeRoot,
  "source-acquisition-content-envelope.ts",
);
const analyzerV2RuntimeSourceAcquisitionContentTransportPath = path.resolve(
  analyzerV2RuntimeRoot,
  "source-acquisition-content-transport.ts",
);
const analyzerV2RuntimeSourceAcquisitionContentParserPath = path.resolve(
  analyzerV2RuntimeRoot,
  "source-acquisition-content-parser.ts",
);
const analyzerV2RuntimeSourceAcquisitionContentParserRunnerProtocolPath = path.resolve(
  analyzerV2RuntimeRoot,
  "source-acquisition-content-parser-runner-protocol.ts",
);
const analyzerV2RuntimeSourceAcquisitionContentParserIsolationProofPath = path.resolve(
  analyzerV2RuntimeRoot,
  "source-acquisition-content-parser-isolation-proof.ts",
);
const analyzerV2RuntimeSourceAcquisitionContentParserOciContainerProofPath = path.resolve(
  analyzerV2RuntimeRoot,
  "source-acquisition-content-parser-oci-container-proof.ts",
);
const analyzerV2RuntimeSourceAcquisitionContentParserRunnerWorkerPath = path.resolve(
  analyzerV2RuntimeRoot,
  "source-acquisition-content-parser-runner.worker.cjs",
);
const analyzerV2RuntimeSourceAcquisitionContentPacketSinkPath = path.resolve(
  analyzerV2RuntimeRoot,
  "source-acquisition-content-packet-sink.ts",
);
const analyzerV2UnitTestRoot = path.resolve(webRoot, "test/unit/lib/analyzer-v2");
const analyzerV2RuntimeUnitTestRoot = path.resolve(webRoot, "test/unit/lib/analyzer-v2-runtime");
const promptRoot = path.resolve(webRoot, "prompts");
const analyzerV2FixtureRoot = path.resolve(webRoot, "test/fixtures/analyzer-v2");
const repoRoot = path.resolve(webRoot, "../..");
const v2AgentsPath = path.resolve(v2AnalyzerRoot, "AGENTS.md");
const canonicalGuardrailsPath = path.resolve(repoRoot, "Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md");
const reportResultV2SchemaPath = path.resolve(analyzerV2FixtureRoot, "schemas/report-result-v2.schema.json");
const hiddenRuntimeKillSwitchEnvName = "FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME";

const fixtureDataExtensions = new Set([".json", ".md", ".txt"]);
const forbiddenV1ContractIdentifiers = new Set([
  "AnalysisInput",
  "AnalysisObservability",
  "AnalysisWarning",
  "ArticleAdjudication",
  "ArticleAnalysis",
  "CBClaimUnderstanding",
  "CBClaimVerdict",
  "CBResearchState",
  "ClaimSelectionDraftState",
  "ClaimSelectionMetadata",
  "ClaimSelectionRecommendation",
  "ClaimUnderstanding",
  "ClaimVerdict",
  "LegacySelectedClaimResearchSummary",
  "OverallAssessment",
  "PreparedStage1Snapshot",
  "PseudoscienceAnalysis",
  "ResearchDecision",
  "ResearchIteration",
  "ResearchState",
  "VerdictDirectionMismatch",
  "VerdictNarrative",
]);
const runnerBoundaryFieldNames = [
  "jobId",
  "inputType",
  "inputValue",
  "preparedStage1",
  "selectedClaimIds",
  "onEvent",
];
const adapterForbiddenProductPaths = [
  analyzerV2IndexPath,
  analyzerV2OrchestratorPath,
  analyzerV2PipelineShellPath,
  analyzerV2RunnerIngressPath,
];
const dispatchForbiddenDirectProductPaths = adapterForbiddenProductPaths;
const dispatchForbiddenTransitiveProductPaths = [
  analyzerV2RunnerIngressPath,
];
const dispatchScaffoldTransitiveProductPaths = [
  analyzerV2IndexPath,
  analyzerV2OrchestratorPath,
  analyzerV2PipelineShellPath,
  claimUnderstandingRuntimeStagePath,
];
const noDispatchRuntimePaths = [
  ...adapterForbiddenProductPaths,
  claimUnderstandingDispatchFramePath,
  claimUnderstandingDispatchReadinessContractPath,
];
const publicAnalyzerV2SurfacePaths = [
  analyzerV2IndexPath,
  analyzerV2CompatibilityViewPath,
  analyzerV2ResultEnvelopePath,
];
const ownerOnlyResultSurfaceTerms = [
  "ownerContract",
  "sideEffects",
  "providerTelemetry",
  "cacheDecision",
  "adapterAttemptDiagnostics",
  "keyParts",
  "renderedPrompt",
  "renderedPromptHash",
  "adapterCalled",
  "providerCallbackCreated",
  "cacheRead",
  "cacheWrite",
];
const forbiddenCacheIoSpecifiers = [
  "fs",
  "node:fs",
  "sqlite",
  "sqlite3",
  "better-sqlite3",
  "@/lib/config-storage",
  "@/lib/config-loader",
  "@/lib/search-cache",
  "@/lib/source-reliability-cache",
];
const forbiddenCacheIoSpecifierFragments = [
  "/config-storage",
  "/config-loader",
  "/search-cache",
  "/source-reliability-cache",
  "/db",
  "/database",
  "/persistence",
  "/storage",
];
const forbiddenProviderSdkSpecifiers = [
  "ai",
  "openai",
  "@ai-sdk/",
  "@anthropic-ai/",
  "@google/generative-ai",
  "@mistralai/",
];
const forbiddenSearchFetchProviderSpecifiers = [
  "@/lib/web-search",
  "@/lib/search-provider-utils",
];
const forbiddenSearchFetchProviderSpecifierFragments = [
  "/web-search",
  "/search-",
  "/research-acquisition-stage",
];
const forbiddenNetworkParserSpecifiers = [
  "node:http",
  "node:https",
  "http",
  "https",
  "undici",
  "node-fetch",
  "axios",
  "got",
  "ky",
  "cheerio",
  "jsdom",
  "pdf-parse",
  "playwright",
  "puppeteer",
];
const forbiddenSourceReliabilitySpecifiers = [
  "@/lib/source-reliability",
  "@/lib/source-reliability-cache",
  "@/lib/source-reliability-config",
  "@/lib/source-reliability-eval-helpers",
];
const forbiddenSourceReliabilitySpecifierFragments = [
  "/source-reliability",
  "/sr-service",
];
const forbiddenAcsDirectUrlSpecifierFragments = [
  "/claim-selection",
  "/prepared-snapshot",
  "/direct-url",
  "/url-resolver",
  "/retrieval",
];
const approvedProviderFactorySdkSpecifiers = new Set([
  "ai",
  "@ai-sdk/anthropic",
]);
const runtimeDispatchApprovedImports = new Map<string, Set<string>>([
  ["node:crypto", new Set(["createHash"])],
  [
    "@/lib/analyzer-v2/claim-understanding/dispatch-readiness-contract",
    new Set([
      "ClaimUnderstandingDispatchReadinessResult",
      "ClaimUnderstandingDispatchReadinessSideEffects",
    ]),
  ],
  [
    "@/lib/analyzer-v2/claim-understanding/prompt-loader",
    new Set([
      "ClaimUnderstandingPromptVariable",
      "loadAndRenderClaimUnderstandingGate1Prompt",
    ]),
  ],
  [
    "@/lib/analyzer-v2/claim-understanding/model-adapter",
    new Set([
      "ClaimUnderstandingModelAdapterOutcome",
      "ClaimUnderstandingProviderCall",
      "executeClaimUnderstandingModelAdapter",
    ]),
  ],
  [
    "@/lib/analyzer-v2/gateway/cache-governance",
    new Set(["buildAnalyzerV2ClaimUnderstandingRuntimeNoStoreCacheDecision"]),
  ],
  [
    "@/lib/analyzer-v2/gateway/policy",
    new Set(["canExecuteAnalyzerV2GatewayTask", "getAnalyzerV2GatewayTask"]),
  ],
  [
    "@/lib/analyzer-v2/gateway/types",
    new Set(["AnalyzerV2CacheDecision", "AnalyzerV2GatewayTask", "AnalyzerV2TaskModelPolicy"]),
  ],
]);
const runtimeScaffoldOptionOwnerPaths = new Set([
  path.resolve(v2AnalyzerRoot, "run-context.ts"),
  claimUnderstandingRuntimeStagePath,
  claimUnderstandingRuntimeDispatchPath,
  analyzerV2RuntimeActivationPath,
  analyzerV2RuntimeArtifactSinkPath,
  analyzerV2RuntimeSourceAcquisitionCandidateEnvelopePath,
  analyzerV2RuntimeSourceAcquisitionCandidateRuntimePath,
  analyzerV2RuntimeHiddenDirectTextCandidateAcquisitionHarnessPath,
].map(toPosix));
const runtimeScaffoldOptionTerms = [
  "claimUnderstandingRuntime",
  "directTextRuntimeDispatch",
  "providerBoundary",
];
const runtimeStageApprovedImports = new Map<string, Set<string>>([
  [
    "@/lib/analyzer-v2/claim-understanding/dispatch-frame",
    new Set(["ClaimUnderstandingDispatchFrame", "buildClaimUnderstandingDispatchFrame"]),
  ],
  [
    "@/lib/analyzer-v2/claim-understanding/dispatch-readiness-contract",
    new Set([
      "ClaimUnderstandingDispatchReadinessApprovalSnapshot",
      "ClaimUnderstandingDispatchReadinessProvenancePacket",
      "ClaimUnderstandingDispatchReadinessResult",
      "validateClaimUnderstandingDispatchReadinessContract",
    ]),
  ],
  [
    "@/lib/analyzer-v2/claim-understanding/prepared-snapshot",
    new Set(["migrateAcsPreparedSnapshotToClaimContract"]),
  ],
  [
    "@/lib/analyzer-v2/claim-understanding/runtime-dispatch",
    new Set([
      "ClaimUnderstandingRuntimeDispatchRequest",
      "ClaimUnderstandingRuntimeDispatchResult",
      "executeClaimUnderstandingRuntimeDispatch",
    ]),
  ],
  [
    "@/lib/analyzer-v2/claim-understanding/types",
    new Set([
      "CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION",
      "ClaimIntegrityEvent",
      "ClaimUnderstandingBlockedReason",
      "ClaimUnderstandingResult",
    ]),
  ],
  [
    "@/lib/analyzer-v2/pipeline-input",
    new Set(["ClaimBoundaryV2Ingress"]),
  ],
  [
    "@/lib/analyzer-v2/run-context",
    new Set(["PipelineRunContext", "getPipelineRunGatewayTask", "getPipelineRunTaskModelPolicy"]),
  ],
  [
    "@/lib/analyzer-v2/gateway/policy",
    new Set(["canExecuteAnalyzerV2GatewayTask", "getAnalyzerV2GatewayTask"]),
  ],
  [
    "@/lib/analyzer-v2/gateway/types",
    new Set(["AnalyzerV2GatewayTask", "AnalyzerV2GatewayTaskStatus", "AnalyzerV2PolicyApproval"]),
  ],
  [
    "@/lib/analyzer-v2/util",
    new Set(["sha256Json"]),
  ],
  [
    "@/lib/analyzer-v2-runtime/claim-understanding-runtime-activation",
    new Set([
      "ClaimUnderstandingRuntimeActivationState",
      "ClaimUnderstandingRuntimeProviderBoundary",
    ]),
  ],
  [
    "@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink",
    new Set([
      "CLAIM_UNDERSTANDING_RUNTIME_ARTIFACT_SINK_VERSION",
      "ClaimUnderstandingRuntimeArtifact",
      "ClaimUnderstandingRuntimeArtifactAttemptDiagnostic",
    ]),
  ],
]);
const analyzerV2RuntimeProviderContractApprovedImports = new Map<string, Set<string>>([
  [
    "@/lib/analyzer-v2/gateway/types",
    new Set([
      "AnalyzerV2GatewayTaskId",
      "AnalyzerV2ModelTask",
      "AnalyzerV2ModelTier",
      "AnalyzerV2PolicyApproval",
    ]),
  ],
]);
const analyzerV2RuntimeProviderConfigContractApprovedImports = new Map<string, Set<string>>([
  [
    "@/lib/analyzer-v2/gateway/types",
    new Set([
      "AnalyzerV2GatewayTaskId",
      "AnalyzerV2ModelTask",
      "AnalyzerV2ModelTier",
      "AnalyzerV2PolicyApproval",
    ]),
  ],
]);
const analyzerV2RuntimeActivationContractApprovedImports = new Map<string, Set<string>>([
  [
    "@/lib/analyzer-v2/gateway/types",
    new Set([
      "AnalyzerV2GatewayTaskId",
      "AnalyzerV2ModelTask",
      "AnalyzerV2PolicyApproval",
    ]),
  ],
]);
const analyzerV2RuntimeActivationApprovedImports = new Map<string, Set<string>>([
  [
    "@/lib/analyzer-v2/claim-understanding/model-adapter",
    new Set(["ClaimUnderstandingProviderCall"]),
  ],
  [
    "@/lib/analyzer-v2/claim-understanding/types",
    new Set(["CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION"]),
  ],
  [
    "@/lib/analyzer-v2/gateway/types",
    new Set(["AnalyzerV2GatewayTask", "AnalyzerV2PolicyApproval", "AnalyzerV2TaskModelPolicy"]),
  ],
  [
    "@/lib/analyzer-v2/run-context",
    new Set([
      "getPipelineRunGatewayTask",
      "getPipelineRunTaskModelPolicy",
      "PipelineRunClaimUnderstandingRuntimeActivationSnapshot",
      "PipelineRunContext",
    ]),
  ],
  [
    "@/lib/analyzer-v2-runtime/claim-understanding-provider-factory",
    new Set(["buildClaimUnderstandingProviderFactory", "ClaimUnderstandingProviderFactory"]),
  ],
  [
    "@/lib/analyzer-v2-runtime/claim-understanding-provider-runtime-config.contract",
    new Set([
      "CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_ALLOWED_SDK_IMPORTS",
      "CLAIM_UNDERSTANDING_PROVIDER_RUNTIME_FACTORY_SOURCE_PATH",
      "ClaimUnderstandingProviderRuntimeConfigSnapshot",
    ]),
  ],
  [
    "@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink",
    new Set(["createClaimUnderstandingRuntimeInMemoryArtifactSink", "ClaimUnderstandingRuntimeArtifactSink"]),
  ],
]);
const analyzerV2RuntimeArtifactSinkApprovedImports = new Map<string, Set<string>>([
  [
    "@/lib/analyzer-v2/claim-understanding/model-adapter",
    new Set(["ClaimUnderstandingProviderTelemetry"]),
  ],
  [
    "@/lib/analyzer-v2/gateway/types",
    new Set(["AnalyzerV2CacheDecision", "AnalyzerV2GatewayTaskId", "AnalyzerV2GatewayTaskStatus"]),
  ],
]);
const analyzerV2RuntimeProductImportApprovedPaths = new Map<string, Set<string>>([
  [
    toPosix(analyzerV2OrchestratorPath),
    new Set([
      "@/lib/analyzer-v2-runtime/claim-understanding-runtime-activation",
      "@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink",
    ]),
  ],
  [
    toPosix(claimUnderstandingRuntimeStagePath),
    new Set([
      "@/lib/analyzer-v2-runtime/claim-understanding-runtime-activation",
      "@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink",
    ]),
  ],
  [
    toPosix(analyzerV2RuntimeArtifactInspectionRoutePath),
    new Set([
      "@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink",
    ]),
  ],
]);
const sourceAcquisitionRuntimeAuthorityOwnerSpecifiers = new Set([
  "@/lib/analyzer-v2-runtime/source-acquisition-runtime-authority",
  "@/lib/analyzer-v2-runtime/source-acquisition-runtime-config.contract",
  "@/lib/analyzer-v2-runtime/source-acquisition-provider-boundary.contract",
  "@/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope",
  "@/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime",
  "@/lib/analyzer-v2-runtime/source-acquisition-network-authority",
  "@/lib/analyzer-v2-runtime/source-acquisition-network-envelope",
  "@/lib/analyzer-v2-runtime/source-acquisition-network-transport",
  "@/lib/analyzer-v2-runtime/source-acquisition-network-factory",
  "@/lib/analyzer-v2-runtime/source-acquisition-content-authority",
  "@/lib/analyzer-v2-runtime/source-acquisition-content-envelope",
  "@/lib/analyzer-v2-runtime/source-acquisition-content-transport",
  "@/lib/analyzer-v2-runtime/source-acquisition-content-parser",
  "@/lib/analyzer-v2-runtime/source-acquisition-content-parser-isolation-proof",
  "@/lib/analyzer-v2-runtime/source-acquisition-content-parser-oci-container-proof",
  "@/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner-protocol",
  "@/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink",
]);

function toPosix(value: string): string {
  return value.replace(/\\/g, "/");
}

function collectFiles(root: string, predicate: (filePath: string) => boolean): string[] {
  if (!existsSync(root)) {
    return [];
  }

  const collected: string[] = [];
  for (const entry of readdirSync(root)) {
    const fullPath = path.join(root, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collected.push(...collectFiles(fullPath, predicate));
    } else if (predicate(fullPath)) {
      collected.push(fullPath);
    }
  }
  return collected.sort();
}

function parseSource(filePath: string): ts.SourceFile {
  return ts.createSourceFile(
    filePath,
    readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function collectModuleSpecifiers(sourceFile: ts.SourceFile): string[] {
  const specifiers: string[] = [];

  function visit(node: ts.Node): void {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier
      && ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }

    if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length === 1
      && ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }

    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === "require"
      && node.arguments.length === 1
      && ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

function collectImportBindings(sourceFile: ts.SourceFile): Array<{ specifier: string; names: string[] }> {
  const imports: Array<{ specifier: string; names: string[] }> = [];

  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement)
      || !statement.moduleSpecifier
      || !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      continue;
    }

    const names: string[] = [];
    const importClause = statement.importClause;
    if (importClause?.name) {
      names.push(importClause.name.text);
    }

    const namedBindings = importClause?.namedBindings;
    if (namedBindings && ts.isNamespaceImport(namedBindings)) {
      names.push("*");
    } else if (namedBindings && ts.isNamedImports(namedBindings)) {
      for (const element of namedBindings.elements) {
        names.push(element.name.text);
      }
    }

    imports.push({
      specifier: statement.moduleSpecifier.text,
      names,
    });
  }

  return imports;
}

function collectExportBindings(sourceFile: ts.SourceFile): Array<{ specifier: string | null; names: string[] }> {
  const exports: Array<{ specifier: string | null; names: string[] }> = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement)) {
      continue;
    }

    const names: string[] = [];
    if (!statement.exportClause) {
      names.push("*");
    } else if (ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) {
        names.push(element.name.text);
      }
    }

    exports.push({
      specifier: statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
        ? statement.moduleSpecifier.text
        : null,
      names,
    });
  }

  return exports;
}

function collectExportedNames(sourceFile: ts.SourceFile): string[] {
  const names: string[] = [];

  for (const statement of sourceFile.statements) {
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    const isExported = modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    if (!isExported) {
      continue;
    }

    if (
      (ts.isFunctionDeclaration(statement)
        || ts.isTypeAliasDeclaration(statement)
        || ts.isInterfaceDeclaration(statement)
        || ts.isClassDeclaration(statement))
      && statement.name
    ) {
      names.push(statement.name.text);
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          names.push(declaration.name.text);
        }
      }
    }
  }

  return names.sort();
}

function propertyNameText(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

function callNameText(expression: ts.Expression): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  return null;
}

function collectPromptProfileLiterals(sourceFile: ts.SourceFile): string[] {
  const literals: string[] = [];
  const promptProfileProperties = new Set(["profile", "promptProfile", "ucmProfile"]);
  const promptProfileCallNames = new Set([
    "getActiveConfig",
    "getActiveConfigHash",
    "loadAndRenderSection",
    "refreshPromptFromFile",
    "seedPromptFromFile",
  ]);

  function visit(node: ts.Node): void {
    if (ts.isPropertyAssignment(node) && promptProfileProperties.has(propertyNameText(node.name) ?? "")) {
      if (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer)) {
        literals.push(node.initializer.text);
      }
    }

    if (ts.isCallExpression(node) && promptProfileCallNames.has(callNameText(node.expression) ?? "")) {
      const [firstArg, secondArg] = node.arguments;
      if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) {
        if (firstArg.text !== "prompt") {
          literals.push(firstArg.text);
        } else if (secondArg && (ts.isStringLiteral(secondArg) || ts.isNoSubstitutionTemplateLiteral(secondArg))) {
          literals.push(secondArg.text);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return literals;
}

function collectPromptFileLiterals(sourceFile: ts.SourceFile): string[] {
  const literals: string[] = [];

  function visit(node: ts.Node): void {
    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      && toPosix(node.text).includes(".prompt.")
    ) {
      literals.push(node.text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return literals;
}

function collectDirectFetchCallLocations(sourceFile: ts.SourceFile): string[] {
  const locations: string[] = [];

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === "fetch"
    ) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      locations.push(`${sourceFile.fileName}:${line + 1}:${character + 1}`);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return locations;
}

function collectIdentifiers(sourceFile: ts.SourceFile): string[] {
  const identifiers: string[] = [];

  function visit(node: ts.Node): void {
    if (ts.isIdentifier(node)) {
      identifiers.push(node.text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return identifiers;
}

function isV1AnalyzerImport(filePath: string, specifier: string): boolean {
  if (specifier === "@/lib/analyzer" || specifier.startsWith("@/lib/analyzer/")) {
    return true;
  }

  if (!specifier.startsWith(".")) {
    return false;
  }

  const resolved = toPosix(path.resolve(path.dirname(filePath), specifier));
  const analyzerRoot = toPosix(v1AnalyzerRoot);
  return resolved === analyzerRoot || resolved.startsWith(`${analyzerRoot}/`);
}

function isClaimUnderstandingModelAdapterImport(filePath: string, specifier: string): boolean {
  if (specifier === "@/lib/analyzer-v2/claim-understanding/model-adapter") {
    return true;
  }

  if (!specifier.startsWith(".")) {
    return false;
  }

  const resolved = toPosix(path.resolve(path.dirname(filePath), specifier));
  const adapterPath = toPosix(claimUnderstandingModelAdapterPath).replace(/\.ts$/, "");
  return resolved === adapterPath || resolved === `${adapterPath}.ts`;
}

function isClaimUnderstandingPromptLoaderImport(filePath: string, specifier: string): boolean {
  if (specifier === "@/lib/analyzer-v2/claim-understanding/prompt-loader") {
    return true;
  }

  if (!specifier.startsWith(".")) {
    return false;
  }

  const resolved = toPosix(path.resolve(path.dirname(filePath), specifier));
  const promptLoaderPath = toPosix(claimUnderstandingPromptLoaderPath).replace(/\.ts$/, "");
  return resolved === promptLoaderPath || resolved === `${promptLoaderPath}.ts`;
}

function isAnalyzerV2CacheGovernanceImport(filePath: string, specifier: string): boolean {
  if (specifier === "@/lib/analyzer-v2/gateway/cache-governance") {
    return true;
  }

  if (!specifier.startsWith(".")) {
    return false;
  }

  const resolved = toPosix(path.resolve(path.dirname(filePath), specifier));
  const cacheGovernancePath = toPosix(analyzerV2CacheGovernancePath).replace(/\.ts$/, "");
  return resolved === cacheGovernancePath || resolved === `${cacheGovernancePath}.ts`;
}

function isAnalyzerV2GatewayPolicyImport(filePath: string, specifier: string): boolean {
  if (specifier === "@/lib/analyzer-v2/gateway/policy") {
    return true;
  }

  if (!specifier.startsWith(".")) {
    return false;
  }

  const resolved = toPosix(path.resolve(path.dirname(filePath), specifier));
  const gatewayPolicyPath = toPosix(analyzerV2GatewayPolicyPath).replace(/\.ts$/, "");
  return resolved === gatewayPolicyPath || resolved === `${gatewayPolicyPath}.ts`;
}

function isCacheIoImport(specifier: string): boolean {
  const normalized = toPosix(specifier).toLowerCase();
  return forbiddenCacheIoSpecifiers.some((forbidden) =>
    normalized === forbidden || normalized.startsWith(`${forbidden}/`)
  )
    || forbiddenCacheIoSpecifierFragments.some((fragment) => normalized.includes(fragment));
}

function isClaimUnderstandingDispatchReadinessContractImport(filePath: string, specifier: string): boolean {
  if (specifier === "@/lib/analyzer-v2/claim-understanding/dispatch-readiness-contract") {
    return true;
  }

  if (!specifier.startsWith(".")) {
    return false;
  }

  const resolved = toPosix(path.resolve(path.dirname(filePath), specifier));
  const contractPath = toPosix(claimUnderstandingDispatchReadinessContractPath).replace(/\.ts$/, "");
  return resolved === contractPath || resolved === `${contractPath}.ts`;
}

function isClaimUnderstandingRuntimeDispatchImport(filePath: string, specifier: string): boolean {
  if (specifier === "@/lib/analyzer-v2/claim-understanding/runtime-dispatch") {
    return true;
  }

  if (!specifier.startsWith(".")) {
    return false;
  }

  const resolved = toPosix(path.resolve(path.dirname(filePath), specifier));
  const runtimeDispatchPath = toPosix(claimUnderstandingRuntimeDispatchPath).replace(/\.ts$/, "");
  return resolved === runtimeDispatchPath || resolved === `${runtimeDispatchPath}.ts`;
}

function isAnalyzerV2RuntimeImport(filePath: string, specifier: string): boolean {
  if (specifier === "@/lib/analyzer-v2-runtime" || specifier.startsWith("@/lib/analyzer-v2-runtime/")) {
    return true;
  }

  if (!specifier.startsWith(".")) {
    return false;
  }

  const resolved = resolveExistingTypeScriptFile(path.resolve(path.dirname(filePath), specifier));
  if (!resolved) {
    return false;
  }

  const runtimeRoot = toPosix(analyzerV2RuntimeRoot);
  const normalizedResolved = toPosix(resolved);
  return normalizedResolved === runtimeRoot || normalizedResolved.startsWith(`${runtimeRoot}/`);
}

function isDispatchCapableInternalImport(filePath: string, specifier: string): boolean {
  return isClaimUnderstandingModelAdapterImport(filePath, specifier)
    || isClaimUnderstandingPromptLoaderImport(filePath, specifier)
    || isAnalyzerV2CacheGovernanceImport(filePath, specifier)
    || isClaimUnderstandingDispatchReadinessContractImport(filePath, specifier)
    || isClaimUnderstandingRuntimeDispatchImport(filePath, specifier);
}

function resolveExistingTypeScriptFile(candidatePath: string): string | null {
  const candidates = [
    candidatePath,
    `${candidatePath}.ts`,
    `${candidatePath}.tsx`,
    path.join(candidatePath, "index.ts"),
    path.join(candidatePath, "index.tsx"),
  ];

  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}

function resolveAnalyzerV2SourceImport(filePath: string, specifier: string): string | null {
  if (specifier.startsWith("@/lib/analyzer-v2/")) {
    return resolveExistingTypeScriptFile(
      path.resolve(v2AnalyzerRoot, specifier.slice("@/lib/analyzer-v2/".length)),
    );
  }

  if (!specifier.startsWith(".")) {
    return null;
  }

  const resolved = resolveExistingTypeScriptFile(path.resolve(path.dirname(filePath), specifier));
  if (!resolved) {
    return null;
  }

  const normalizedRoot = toPosix(v2AnalyzerRoot);
  const normalizedResolved = toPosix(resolved);
  return normalizedResolved === normalizedRoot || normalizedResolved.startsWith(`${normalizedRoot}/`)
    ? resolved
    : null;
}

function collectTransitiveAnalyzerV2Imports(sourcePath: string, seen = new Set<string>()): string[] {
  const normalizedSourcePath = toPosix(sourcePath);
  if (seen.has(normalizedSourcePath)) {
    return [];
  }
  seen.add(normalizedSourcePath);

  const imports: string[] = [];
  for (const specifier of collectModuleSpecifiers(parseSource(sourcePath))) {
    const resolved = resolveAnalyzerV2SourceImport(sourcePath, specifier);
    if (!resolved) {
      continue;
    }
    imports.push(resolved);
    imports.push(...collectTransitiveAnalyzerV2Imports(resolved, seen));
  }

  return imports;
}

function resolveSrcImport(filePath: string, specifier: string): string | null {
  if (specifier.startsWith("@/")) {
    return resolveExistingTypeScriptFile(path.resolve(srcRoot, specifier.slice("@/".length)));
  }

  if (!specifier.startsWith(".")) {
    return null;
  }

  const resolved = resolveExistingTypeScriptFile(path.resolve(path.dirname(filePath), specifier));
  if (!resolved) {
    return null;
  }

  const normalizedRoot = toPosix(srcRoot);
  const normalizedResolved = toPosix(resolved);
  return normalizedResolved === normalizedRoot || normalizedResolved.startsWith(`${normalizedRoot}/`)
    ? resolved
    : null;
}

function collectTransitiveSrcImports(sourcePath: string, seen = new Set<string>()): string[] {
  const normalizedSourcePath = toPosix(sourcePath);
  if (seen.has(normalizedSourcePath)) {
    return [];
  }
  seen.add(normalizedSourcePath);

  const imports: string[] = [];
  for (const specifier of collectModuleSpecifiers(parseSource(sourcePath))) {
    const resolved = resolveSrcImport(sourcePath, specifier);
    if (!resolved) {
      continue;
    }
    imports.push(resolved);
    imports.push(...collectTransitiveSrcImports(resolved, seen));
  }

  return imports;
}

function collectNonLiteralDynamicImports(sourceFile: ts.SourceFile): string[] {
  const locations: string[] = [];

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && (node.arguments.length !== 1 || !ts.isStringLiteral(node.arguments[0]))
    ) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      locations.push(`${sourceFile.fileName}:${position.line + 1}:${position.character + 1}`);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return locations;
}

function collectExecutionApprovedTrueLiterals(sourceFile: ts.SourceFile): string[] {
  const locations: string[] = [];

  function visit(node: ts.Node): void {
    if (
      ts.isPropertyAssignment(node)
      && propertyNameText(node.name) === "executionApproved"
      && node.initializer.kind === ts.SyntaxKind.TrueKeyword
    ) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      locations.push(`${sourceFile.fileName}:${position.line + 1}:${position.character + 1}`);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return locations;
}

function collectForbiddenExecutableStatusMutations(sourceFile: ts.SourceFile): string[] {
  const locations: string[] = [];

  function record(node: ts.Node): void {
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    locations.push(`${sourceFile.fileName}:${position.line + 1}:${position.character + 1}`);
  }

  function visit(node: ts.Node): void {
    if (
      ts.isPropertyAssignment(node)
      && propertyNameText(node.name) === "status"
      && ts.isStringLiteral(node.initializer)
      && node.initializer.text === "executable"
    ) {
      record(node);
    }

    if (
      ts.isBinaryExpression(node)
      && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && ts.isStringLiteral(node.right)
      && node.right.text === "executable"
      && (
        (
          ts.isPropertyAccessExpression(node.left)
          && node.left.name.text === "status"
        )
        || (
          ts.isElementAccessExpression(node.left)
          && ts.isStringLiteral(node.left.argumentExpression)
          && node.left.argumentExpression.text === "status"
        )
      )
    ) {
      record(node);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return locations;
}

function isProviderSdkImport(specifier: string): boolean {
  return forbiddenProviderSdkSpecifiers.some((forbidden) =>
    specifier === forbidden || specifier.startsWith(forbidden)
  );
}

function isSearchFetchProviderImport(specifier: string): boolean {
  const normalized = toPosix(specifier);
  return forbiddenSearchFetchProviderSpecifiers.some((forbidden) =>
    normalized === forbidden || normalized.startsWith(`${forbidden}/`)
  )
    || forbiddenSearchFetchProviderSpecifierFragments.some((fragment) => normalized.includes(fragment));
}

function isNetworkParserImport(specifier: string): boolean {
  return forbiddenNetworkParserSpecifiers.some((forbidden) =>
    specifier === forbidden || specifier.startsWith(`${forbidden}/`)
  );
}

function isSourceReliabilityImport(specifier: string): boolean {
  const normalized = toPosix(specifier);
  return forbiddenSourceReliabilitySpecifiers.some((forbidden) =>
    normalized === forbidden || normalized.startsWith(`${forbidden}/`)
  )
    || forbiddenSourceReliabilitySpecifierFragments.some((fragment) => normalized.includes(fragment));
}

function isAcsDirectUrlRuntimeImport(specifier: string): boolean {
  const normalized = toPosix(specifier).toLowerCase();
  return forbiddenAcsDirectUrlSpecifierFragments.some((fragment) => normalized.includes(fragment));
}

function isApprovedProviderFactorySdkImport(filePath: string, specifier: string): boolean {
  return toPosix(path.resolve(filePath)) === toPosix(analyzerV2RuntimeProviderFactoryPath)
    && approvedProviderFactorySdkSpecifiers.has(specifier);
}

function isAnalyzerV2RuntimeProviderFactoryImport(filePath: string, specifier: string): boolean {
  if (specifier === "@/lib/analyzer-v2-runtime/claim-understanding-provider-factory") {
    return true;
  }

  if (!specifier.startsWith(".")) {
    return false;
  }

  const resolved = toPosix(path.resolve(path.dirname(filePath), specifier));
  const factoryPath = toPosix(analyzerV2RuntimeProviderFactoryPath).replace(/\.ts$/, "");
  return resolved === factoryPath || resolved === `${factoryPath}.ts`;
}

function isTestOrMockImport(specifier: string): boolean {
  const normalized = toPosix(specifier).toLowerCase();
  return normalized.includes("/test/")
    || normalized.includes("/tests/")
    || normalized.includes("/fixtures/")
    || normalized.includes("fixture")
    || normalized.includes("mock");
}

function isV2OwnedPromptFile(filePath: string): boolean {
  const rel = toPosix(path.relative(promptRoot, filePath));
  return rel.includes("-v2.") || rel.startsWith("v2/");
}

function collectLegacyPromptProfilesAndFiles(): {
  profiles: Set<string>;
  fileRefs: Set<string>;
} {
  const promptFiles = collectFiles(promptRoot, (filePath) =>
    filePath.endsWith(".prompt.md") && !isV2OwnedPromptFile(filePath)
  );
  const profiles = new Set<string>();
  const fileRefs = new Set<string>();

  for (const promptFile of promptFiles) {
    const rel = toPosix(path.relative(promptRoot, promptFile));
    const withoutExt = rel.slice(0, -".prompt.md".length);
    const stem = path.basename(promptFile, ".prompt.md");
    const content = readFileSync(promptFile, "utf8");

    profiles.add(stem);
    profiles.add(withoutExt);
    if (withoutExt.startsWith("text-analysis/")) {
      profiles.add(`text-analysis-${stem}`);
    }

    const pipelineMatch = content.match(/^pipeline:\s*["']?([^"'\r\n]+)["']?/m);
    if (pipelineMatch?.[1]) {
      profiles.add(pipelineMatch[1]);
    }

    fileRefs.add(rel);
    fileRefs.add(path.basename(promptFile));
    fileRefs.add(`apps/web/prompts/${rel}`);
  }

  return { profiles, fileRefs };
}

function findPromptReuseViolation(value: string, forbidden: ReturnType<typeof collectLegacyPromptProfilesAndFiles>): string | null {
  const normalized = toPosix(value);
  if (forbidden.profiles.has(normalized)) {
    return `legacy prompt profile "${normalized}"`;
  }

  for (const fileRef of forbidden.fileRefs) {
    if (normalized === fileRef || normalized.endsWith(`/${fileRef}`)) {
      return `legacy prompt file "${fileRef}"`;
    }
  }

  return null;
}

function findPromptFileReuseViolation(value: string, forbidden: ReturnType<typeof collectLegacyPromptProfilesAndFiles>): string | null {
  const normalized = toPosix(value);
  for (const fileRef of forbidden.fileRefs) {
    if (normalized === fileRef || normalized.endsWith(`/${fileRef}`)) {
      return `legacy prompt file "${fileRef}"`;
    }
  }
  return null;
}

describe("analyzer-v2 boundary guard", () => {
  const v2SourceFiles = collectFiles(v2AnalyzerRoot, (filePath) =>
    [".ts", ".tsx"].includes(path.extname(filePath))
  );
  const analyzerV2RuntimeSourceFiles = collectFiles(analyzerV2RuntimeRoot, (filePath) =>
    [".ts", ".tsx"].includes(path.extname(filePath))
  );
  const publicSurfaceFiles = Array.from(new Set([
    ...collectFiles(appRoot, (filePath) => [".ts", ".tsx"].includes(path.extname(filePath))),
    ...collectFiles(componentsRoot, (filePath) => [".ts", ".tsx"].includes(path.extname(filePath))),
    ...publicAnalyzerV2SurfacePaths.filter((filePath) => existsSync(filePath)),
  ])).sort();
  const v2PromptFiles = collectFiles(promptRoot, (filePath) =>
    filePath.endsWith(".prompt.md") && isV2OwnedPromptFile(filePath)
  );

  it("keeps local and canonical V2 implementation guardrails discoverable", () => {
    expect(existsSync(v2AgentsPath)).toBe(true);
    expect(existsSync(canonicalGuardrailsPath)).toBe(true);

    const localInstructions = readFileSync(v2AgentsPath, "utf8");
    const canonicalInstructions = readFileSync(canonicalGuardrailsPath, "utf8");

    expect(localInstructions).toContain("Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md");
    expect(localInstructions).toContain("fhAgentKnowledge.preflight_task");
    expect(localInstructions).toContain("Do not import, copy, alias, extend, or clone V1 analyzer code");
    expect(canonicalInstructions).toContain("Clean-Room Boundary");
    expect(canonicalInstructions).toContain("Report generation");
    expect(canonicalInstructions).toContain("Analysis Session");
  });

  it("does not import V1 analyzer pipeline modules", () => {
    const violations: string[] = [];

    for (const sourcePath of v2SourceFiles) {
      const sourceFile = parseSource(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isV1AnalyzerImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps the 6B.3b model adapter out of product execution paths", () => {
    const violations: string[] = [];

    for (const sourcePath of adapterForbiddenProductPaths) {
      const sourceFile = parseSource(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isClaimUnderstandingModelAdapterImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps non-scaffold runtime paths free of dispatch-capable imports", () => {
    const violations: string[] = [];

    for (const sourcePath of noDispatchRuntimePaths) {
      const sourceFile = parseSource(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isClaimUnderstandingModelAdapterImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports model adapter ${specifier}`);
        }
        if (isClaimUnderstandingPromptLoaderImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports prompt loader ${specifier}`);
        }
        if (isAnalyzerV2CacheGovernanceImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports cache governance ${specifier}`);
        }
        if (isProviderSdkImport(specifier) && !isApprovedProviderFactorySdkImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports provider SDK ${specifier}`);
        }
        if (isTestOrMockImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports test/mock/fixture module ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps product execution paths from directly reaching dispatch-readiness or runtime-dispatch internals except runtime-stage", () => {
    const violations: string[] = [];

    for (const sourcePath of dispatchForbiddenDirectProductPaths) {
      const sourceFile = parseSource(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isClaimUnderstandingDispatchReadinessContractImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports dispatch readiness ${specifier}`);
        }
        if (isClaimUnderstandingRuntimeDispatchImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports runtime dispatch ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps non-scaffold product execution paths without transitive reachability to dispatch-capable internals", () => {
    const forbiddenTransitiveTargets = new Set([
      claimUnderstandingModelAdapterPath,
      claimUnderstandingPromptLoaderPath,
      analyzerV2CacheGovernancePath,
      claimUnderstandingDispatchReadinessContractPath,
      claimUnderstandingRuntimeDispatchPath,
    ].map(toPosix));
    const violations: string[] = [];

    for (const sourcePath of dispatchForbiddenTransitiveProductPaths) {
      const transitiveImports = collectTransitiveAnalyzerV2Imports(sourcePath);
      for (const importedPath of transitiveImports) {
        if (forbiddenTransitiveTargets.has(toPosix(importedPath))) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} transitively reaches ${toPosix(path.relative(webRoot, importedPath))}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("limits scaffold transitive dispatch reachability to the approved runtime-stage chain", () => {
    const expectedScaffoldTargets = [
      claimUnderstandingDispatchFramePath,
      claimUnderstandingDispatchReadinessContractPath,
      claimUnderstandingRuntimeDispatchPath,
      claimUnderstandingPromptLoaderPath,
      claimUnderstandingModelAdapterPath,
      analyzerV2CacheGovernancePath,
    ].map(toPosix).sort();
    const scaffoldTargets = new Set(expectedScaffoldTargets);

    for (const sourcePath of dispatchScaffoldTransitiveProductPaths) {
      const transitiveImports = collectTransitiveAnalyzerV2Imports(sourcePath);
      const reachedScaffoldTargets = Array.from(new Set(transitiveImports
        .map(toPosix)
        .filter((importedPath) => scaffoldTargets.has(importedPath)))).sort();

      expect(reachedScaffoldTargets).toEqual(expectedScaffoldTargets);
    }
  });

  it("keeps the 6B.3c-4A runtime-stage scaffold imports limited to approved symbols", () => {
    const sourceFile = parseSource(claimUnderstandingRuntimeStagePath);
    const violations: string[] = [];

    for (const importBinding of collectImportBindings(sourceFile)) {
      const specifier = importBinding.specifier;
      const approvedNames = runtimeStageApprovedImports.get(specifier);

      if (!approvedNames) {
        violations.push(`runtime stage imports unapproved module ${specifier}`);
        continue;
      }

      for (const importedName of importBinding.names) {
        if (!approvedNames.has(importedName)) {
          violations.push(`runtime stage imports unapproved symbol ${importedName} from ${specifier}`);
        }
      }

      if (isV1AnalyzerImport(claimUnderstandingRuntimeStagePath, specifier)) {
        violations.push(`runtime stage imports V1 analyzer ${specifier}`);
      }
      if (isClaimUnderstandingModelAdapterImport(claimUnderstandingRuntimeStagePath, specifier)) {
        violations.push(`runtime stage imports model adapter ${specifier}`);
      }
      if (isClaimUnderstandingPromptLoaderImport(claimUnderstandingRuntimeStagePath, specifier)) {
        violations.push(`runtime stage imports prompt loader ${specifier}`);
      }
      if (isAnalyzerV2CacheGovernanceImport(claimUnderstandingRuntimeStagePath, specifier)) {
        violations.push(`runtime stage imports cache governance ${specifier}`);
      }
      if (isProviderSdkImport(specifier)) {
        violations.push(`runtime stage imports provider SDK ${specifier}`);
      }
      if (isTestOrMockImport(specifier)) {
        violations.push(`runtime stage imports test/mock/fixture module ${specifier}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps 6B.3c-4A scaffold runtime options out of production callers", () => {
    const violations: string[] = [];

    for (const sourcePath of collectFiles(srcRoot, (filePath) =>
      [".ts", ".tsx"].includes(path.extname(filePath))
    )) {
      if (runtimeScaffoldOptionOwnerPaths.has(toPosix(sourcePath))) {
        continue;
      }

      const content = readFileSync(sourcePath, "utf8");
      for (const term of runtimeScaffoldOptionTerms) {
        if (content.includes(term)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} references runtime scaffold option ${term}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps the 6B.3c-4B provider ownership contract imports inert and limited", () => {
    expect(existsSync(analyzerV2RuntimeProviderContractPath)).toBe(true);
    const sourceFile = parseSource(analyzerV2RuntimeProviderContractPath);
    const violations: string[] = [];

    for (const importBinding of collectImportBindings(sourceFile)) {
      const specifier = importBinding.specifier;
      const approvedNames = analyzerV2RuntimeProviderContractApprovedImports.get(specifier);

      if (!approvedNames) {
        violations.push(`provider ownership contract imports unapproved module ${specifier}`);
        continue;
      }

      for (const importedName of importBinding.names) {
        if (!approvedNames.has(importedName)) {
          violations.push(`provider ownership contract imports unapproved symbol ${importedName} from ${specifier}`);
        }
      }

      if (isV1AnalyzerImport(analyzerV2RuntimeProviderContractPath, specifier)) {
        violations.push(`provider ownership contract imports V1 analyzer ${specifier}`);
      }
      if (isClaimUnderstandingModelAdapterImport(analyzerV2RuntimeProviderContractPath, specifier)) {
        violations.push(`provider ownership contract imports model adapter ${specifier}`);
      }
      if (isClaimUnderstandingPromptLoaderImport(analyzerV2RuntimeProviderContractPath, specifier)) {
        violations.push(`provider ownership contract imports prompt loader ${specifier}`);
      }
      if (isAnalyzerV2CacheGovernanceImport(analyzerV2RuntimeProviderContractPath, specifier)) {
        violations.push(`provider ownership contract imports cache governance ${specifier}`);
      }
      if (isAnalyzerV2GatewayPolicyImport(analyzerV2RuntimeProviderContractPath, specifier)) {
        violations.push(`provider ownership contract imports gateway policy ${specifier}`);
      }
      if (isClaimUnderstandingRuntimeDispatchImport(analyzerV2RuntimeProviderContractPath, specifier)) {
        violations.push(`provider ownership contract imports runtime dispatch ${specifier}`);
      }
      if (isProviderSdkImport(specifier)) {
        violations.push(`provider ownership contract imports provider SDK ${specifier}`);
      }
      if (isTestOrMockImport(specifier)) {
        violations.push(`provider ownership contract imports test/mock/fixture module ${specifier}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps the 6B.3c-4C2a provider runtime config contract imports inert and limited", () => {
    expect(existsSync(analyzerV2RuntimeProviderConfigContractPath)).toBe(true);
    const sourceFile = parseSource(analyzerV2RuntimeProviderConfigContractPath);
    const violations: string[] = [];

    for (const importBinding of collectImportBindings(sourceFile)) {
      const specifier = importBinding.specifier;
      const approvedNames = analyzerV2RuntimeProviderConfigContractApprovedImports.get(specifier);

      if (!approvedNames) {
        violations.push(`provider runtime config contract imports unapproved module ${specifier}`);
        continue;
      }

      for (const importedName of importBinding.names) {
        if (!approvedNames.has(importedName)) {
          violations.push(`provider runtime config contract imports unapproved symbol ${importedName} from ${specifier}`);
        }
      }

      if (isV1AnalyzerImport(analyzerV2RuntimeProviderConfigContractPath, specifier)) {
        violations.push(`provider runtime config contract imports V1 analyzer ${specifier}`);
      }
      if (isClaimUnderstandingModelAdapterImport(analyzerV2RuntimeProviderConfigContractPath, specifier)) {
        violations.push(`provider runtime config contract imports model adapter ${specifier}`);
      }
      if (isClaimUnderstandingPromptLoaderImport(analyzerV2RuntimeProviderConfigContractPath, specifier)) {
        violations.push(`provider runtime config contract imports prompt loader ${specifier}`);
      }
      if (isAnalyzerV2CacheGovernanceImport(analyzerV2RuntimeProviderConfigContractPath, specifier)) {
        violations.push(`provider runtime config contract imports cache governance ${specifier}`);
      }
      if (isAnalyzerV2GatewayPolicyImport(analyzerV2RuntimeProviderConfigContractPath, specifier)) {
        violations.push(`provider runtime config contract imports gateway policy ${specifier}`);
      }
      if (isClaimUnderstandingRuntimeDispatchImport(analyzerV2RuntimeProviderConfigContractPath, specifier)) {
        violations.push(`provider runtime config contract imports runtime dispatch ${specifier}`);
      }
      if (isProviderSdkImport(specifier)) {
        violations.push(`provider runtime config contract imports provider SDK ${specifier}`);
      }
      if (isTestOrMockImport(specifier)) {
        violations.push(`provider runtime config contract imports test/mock/fixture module ${specifier}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps the 6B.3c-4C3a runtime activation contract inert and limited", () => {
    expect(existsSync(analyzerV2RuntimeActivationContractPath)).toBe(true);
    const sourceFile = parseSource(analyzerV2RuntimeActivationContractPath);
    const violations: string[] = [];

    for (const importBinding of collectImportBindings(sourceFile)) {
      const specifier = importBinding.specifier;
      const approvedNames = analyzerV2RuntimeActivationContractApprovedImports.get(specifier);

      if (!approvedNames) {
        violations.push(`runtime activation contract imports unapproved module ${specifier}`);
        continue;
      }

      for (const importedName of importBinding.names) {
        if (!approvedNames.has(importedName)) {
          violations.push(`runtime activation contract imports unapproved symbol ${importedName} from ${specifier}`);
        }
      }

      if (isV1AnalyzerImport(analyzerV2RuntimeActivationContractPath, specifier)) {
        violations.push(`runtime activation contract imports V1 analyzer ${specifier}`);
      }
      if (isClaimUnderstandingModelAdapterImport(analyzerV2RuntimeActivationContractPath, specifier)) {
        violations.push(`runtime activation contract imports model adapter ${specifier}`);
      }
      if (isClaimUnderstandingPromptLoaderImport(analyzerV2RuntimeActivationContractPath, specifier)) {
        violations.push(`runtime activation contract imports prompt loader ${specifier}`);
      }
      if (isAnalyzerV2CacheGovernanceImport(analyzerV2RuntimeActivationContractPath, specifier)) {
        violations.push(`runtime activation contract imports cache governance ${specifier}`);
      }
      if (isAnalyzerV2GatewayPolicyImport(analyzerV2RuntimeActivationContractPath, specifier)) {
        violations.push(`runtime activation contract imports gateway policy ${specifier}`);
      }
      if (isClaimUnderstandingRuntimeDispatchImport(analyzerV2RuntimeActivationContractPath, specifier)) {
        violations.push(`runtime activation contract imports runtime dispatch ${specifier}`);
      }
      if (isAnalyzerV2RuntimeProviderFactoryImport(analyzerV2RuntimeActivationContractPath, specifier)) {
        violations.push(`runtime activation contract imports provider factory ${specifier}`);
      }
      if (isProviderSdkImport(specifier)) {
        violations.push(`runtime activation contract imports provider SDK ${specifier}`);
      }
      if (isTestOrMockImport(specifier)) {
        violations.push(`runtime activation contract imports test/mock/fixture module ${specifier}`);
      }
    }

    const content = readFileSync(analyzerV2RuntimeActivationContractPath, "utf8");
    for (const forbiddenText of [
      "buildClaimUnderstandingProviderFactory",
      "executeClaimUnderstandingRuntimeDispatch",
      "status: \"executable\"",
      "execution_approved",
    ]) {
      if (content.includes(forbiddenText)) {
        violations.push(`runtime activation contract references forbidden activation text ${forbiddenText}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps the 6B.3c-4C3b runtime activation owner imports limited", () => {
    expect(existsSync(analyzerV2RuntimeActivationPath)).toBe(true);
    const sourceFile = parseSource(analyzerV2RuntimeActivationPath);
    const violations: string[] = [];

    for (const importBinding of collectImportBindings(sourceFile)) {
      const specifier = importBinding.specifier;
      const approvedNames = analyzerV2RuntimeActivationApprovedImports.get(specifier);

      if (!approvedNames) {
        violations.push(`runtime activation owner imports unapproved module ${specifier}`);
        continue;
      }

      for (const importedName of importBinding.names) {
        if (!approvedNames.has(importedName)) {
          violations.push(`runtime activation owner imports unapproved symbol ${importedName} from ${specifier}`);
        }
      }

      if (isV1AnalyzerImport(analyzerV2RuntimeActivationPath, specifier)) {
        violations.push(`runtime activation owner imports V1 analyzer ${specifier}`);
      }
      if (isCacheIoImport(specifier)) {
        violations.push(`runtime activation owner imports IO/storage dependency ${specifier}`);
      }
      if (isClaimUnderstandingPromptLoaderImport(analyzerV2RuntimeActivationPath, specifier)) {
        violations.push(`runtime activation owner imports prompt loader ${specifier}`);
      }
      if (isClaimUnderstandingRuntimeDispatchImport(analyzerV2RuntimeActivationPath, specifier)) {
        violations.push(`runtime activation owner imports runtime dispatch ${specifier}`);
      }
      if (isProviderSdkImport(specifier)) {
        violations.push(`runtime activation owner imports provider SDK ${specifier}`);
      }
      if (isTestOrMockImport(specifier)) {
        violations.push(`runtime activation owner imports test/mock/fixture module ${specifier}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps the 6B.3c-4C3b hidden artifact sink imports limited and non-public", () => {
    expect(existsSync(analyzerV2RuntimeArtifactSinkPath)).toBe(true);
    const sourceFile = parseSource(analyzerV2RuntimeArtifactSinkPath);
    const violations: string[] = [];

    for (const importBinding of collectImportBindings(sourceFile)) {
      const specifier = importBinding.specifier;
      const approvedNames = analyzerV2RuntimeArtifactSinkApprovedImports.get(specifier);

      if (!approvedNames) {
        violations.push(`runtime artifact sink imports unapproved module ${specifier}`);
        continue;
      }

      for (const importedName of importBinding.names) {
        if (!approvedNames.has(importedName)) {
          violations.push(`runtime artifact sink imports unapproved symbol ${importedName} from ${specifier}`);
        }
      }

      if (isV1AnalyzerImport(analyzerV2RuntimeArtifactSinkPath, specifier)) {
        violations.push(`runtime artifact sink imports V1 analyzer ${specifier}`);
      }
      if (isCacheIoImport(specifier)) {
        violations.push(`runtime artifact sink imports IO/storage dependency ${specifier}`);
      }
      if (isProviderSdkImport(specifier)) {
        violations.push(`runtime artifact sink imports provider SDK ${specifier}`);
      }
      if (isTestOrMockImport(specifier)) {
        violations.push(`runtime artifact sink imports test/mock/fixture module ${specifier}`);
      }
    }

    const content = readFileSync(analyzerV2RuntimeArtifactSinkPath, "utf8");
    if (!content.includes("visibility: \"internal_admin_only\"")) {
      violations.push("runtime artifact sink does not pin internal_admin_only visibility");
    }
    if (!content.includes("publicPointerExposure: \"forbidden\"")) {
      violations.push("runtime artifact sink does not forbid public pointer exposure");
    }

    expect(violations).toEqual([]);
  });

  it("keeps analyzer-v2-runtime contracts free of execution side effects and scaffold options", () => {
    const violations: string[] = [];

    expect(analyzerV2RuntimeSourceFiles.map((filePath) => toPosix(path.relative(webRoot, filePath)))).toContain(
      "src/lib/analyzer-v2-runtime/claim-understanding-provider-boundary.contract.ts",
    );
    expect(analyzerV2RuntimeSourceFiles.map((filePath) => toPosix(path.relative(webRoot, filePath)))).toContain(
      "src/lib/analyzer-v2-runtime/claim-understanding-provider-runtime-config.contract.ts",
    );
    expect(analyzerV2RuntimeSourceFiles.map((filePath) => toPosix(path.relative(webRoot, filePath)))).toContain(
      "src/lib/analyzer-v2-runtime/claim-understanding-runtime-activation.contract.ts",
    );
    expect(analyzerV2RuntimeSourceFiles.map((filePath) => toPosix(path.relative(webRoot, filePath)))).toContain(
      "src/lib/analyzer-v2-runtime/source-acquisition-runtime-authority.ts",
    );
    expect(analyzerV2RuntimeSourceFiles.map((filePath) => toPosix(path.relative(webRoot, filePath)))).toContain(
      "src/lib/analyzer-v2-runtime/source-acquisition-runtime-config.contract.ts",
    );
    expect(analyzerV2RuntimeSourceFiles.map((filePath) => toPosix(path.relative(webRoot, filePath)))).toContain(
      "src/lib/analyzer-v2-runtime/source-acquisition-provider-boundary.contract.ts",
    );
    expect(analyzerV2RuntimeSourceFiles.map((filePath) => toPosix(path.relative(webRoot, filePath)))).toContain(
      "src/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.ts",
    );
    expect(analyzerV2RuntimeSourceFiles.map((filePath) => toPosix(path.relative(webRoot, filePath)))).toContain(
      "src/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.ts",
    );

    for (const sourcePath of analyzerV2RuntimeSourceFiles) {
      const sourceFile = parseSource(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        const isApprovedParserRunnerProtocolFileImport =
          toPosix(sourcePath) === toPosix(analyzerV2RuntimeSourceAcquisitionContentParserRunnerProtocolPath)
          && specifier === "node:fs";
        if (isV1AnalyzerImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports V1 analyzer ${specifier}`);
        }
        if (isProviderSdkImport(specifier) && !isApprovedProviderFactorySdkImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports provider SDK ${specifier}`);
        }
        if (isCacheIoImport(specifier) && !isApprovedParserRunnerProtocolFileImport) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports IO/storage dependency ${specifier}`);
        }
        if (isClaimUnderstandingPromptLoaderImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports prompt loader ${specifier}`);
        }
        if (isClaimUnderstandingRuntimeDispatchImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports runtime dispatch ${specifier}`);
        }
      }
      for (const location of collectNonLiteralDynamicImports(sourceFile)) {
        violations.push(`nonliteral dynamic import at ${toPosix(path.relative(webRoot, location))}`);
      }

      const content = readFileSync(sourcePath, "utf8");
      if (!runtimeScaffoldOptionOwnerPaths.has(toPosix(sourcePath))) {
        for (const term of runtimeScaffoldOptionTerms) {
          if (content.includes(term)) {
            violations.push(`${toPosix(path.relative(webRoot, sourcePath))} references runtime scaffold option ${term}`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps the 7N-3A source-acquisition runtime authority contract-only and non-public", () => {
    const sourceAcquisitionRuntimeOwnerPaths = [
      analyzerV2RuntimeSourceAcquisitionAuthorityPath,
      analyzerV2RuntimeSourceAcquisitionConfigContractPath,
      analyzerV2RuntimeSourceAcquisitionProviderContractPath,
    ];
    const violations: string[] = [];

    for (const ownerPath of sourceAcquisitionRuntimeOwnerPaths) {
      expect(existsSync(ownerPath)).toBe(true);
      const sourceFile = parseSource(ownerPath);
      const relativeOwnerPath = toPosix(path.relative(webRoot, ownerPath));

      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        violations.push(`${relativeOwnerPath} imports ${specifier}`);
      }

      for (const location of collectDirectFetchCallLocations(sourceFile)) {
        violations.push(`direct fetch call at ${toPosix(path.relative(webRoot, location))}`);
      }

      const content = readFileSync(ownerPath, "utf8");
      for (const forbiddenText of [
        "from \"ai\"",
        "from \"@ai-sdk/",
        "from \"@/lib/web-search\"",
        "from \"@/lib/source-reliability\"",
        "from \"@/lib/analyzer/",
        "providerSdk: true",
        "searchFetch: true",
        "network: true",
        "parser: true",
        "cacheRead: true",
        "cacheWrite: true",
        "sourceReliability: true",
        "productRuntime: true",
        "publicExposure: true",
        "liveJobs: true",
      ]) {
        if (content.includes(forbiddenText)) {
          violations.push(`${relativeOwnerPath} references forbidden source-acquisition authority text ${forbiddenText}`);
        }
      }
    }

    const authorityContent = readFileSync(analyzerV2RuntimeSourceAcquisitionAuthorityPath, "utf8");
    if (!authorityContent.includes("new WeakSet<object>()")) {
      violations.push("source-acquisition runtime authority does not use a module-private WeakSet brand");
    }
    if (!authorityContent.includes("runtimeAuthorities.has(value)")) {
      violations.push("source-acquisition runtime authority validator does not require owner-created membership");
    }

    expect(violations).toEqual([]);
  });

  it("keeps the 7N-3B1 candidate runtime shell inside its exact source envelope", () => {
    const violations: string[] = [];
    const candidateRuntimePaths = [
      analyzerV2RuntimeSourceAcquisitionCandidateEnvelopePath,
      analyzerV2RuntimeSourceAcquisitionCandidateRuntimePath,
    ];
    const expectedEnvelopeExports = [
      "SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT",
      "SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH",
      "SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION",
      "SourceAcquisitionCandidateBudgetSnapshot",
      "SourceAcquisitionCandidateProviderAllowlistSnapshot",
      "SourceAcquisitionCandidateProviderAttemptRequest",
      "SourceAcquisitionCandidateProviderAttemptResult",
      "SourceAcquisitionCandidateProviderBoundary",
      "SourceAcquisitionCandidateProviderEndpointKind",
      "SourceAcquisitionCandidateProviderId",
      "SourceAcquisitionCandidateQueryOutcome",
      "SourceAcquisitionCandidateRunRequest",
      "SourceAcquisitionCandidateRuntimeApproval",
      "SourceAcquisitionCandidateRuntimeDecision",
      "SourceAcquisitionCandidateRuntimeStopReason",
      "SourceAcquisitionCandidateValidationResult",
      "SourceAcquisitionHiddenCandidateRecord",
      "sourceAcquisitionCandidateRuntimeDecisionHasExactQueryCoverage",
      "validateSourceAcquisitionCandidateBudgetSnapshot",
      "validateSourceAcquisitionCandidateProviderAllowlistSnapshot",
      "validateSourceAcquisitionCandidateProviderAttemptResult",
    ].sort();
    const expectedRuntimeExports = [
      "SOURCE_ACQUISITION_CANDIDATE_RUNTIME_AUTHORITY_VERSION",
      "SourceAcquisitionCandidateRuntimeAuthority",
      "SourceAcquisitionCandidateRuntimeAuthoritySnapshot",
      "createSourceAcquisitionCandidateRuntimeAuthority",
      "executeSourceAcquisitionCandidateRuntime",
      "isSourceAcquisitionCandidateRuntimeAuthority",
      "readSourceAcquisitionCandidateRuntimeAuthoritySnapshot",
    ].sort();
    const approvedRuntimeImports = new Map<string, string[]>([
      [
        "@/lib/analyzer-v2-runtime/source-acquisition-runtime-authority",
        [
          "SourceAcquisitionRuntimeAuthority",
          "SourceAcquisitionRuntimeAuthoritySnapshot",
          "isSourceAcquisitionRuntimeAuthority",
          "readSourceAcquisitionRuntimeAuthoritySnapshot",
        ].sort(),
      ],
      [
        "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff",
        [
          "QUERY_PLAN_SOURCE_ACQUISITION_HANDOFF_VERSION",
          "QueryPlanSourceAcquisitionHandoff",
          "QueryPlanSourceAcquisitionHandoffDecision",
          "QueryPlanSourceAcquisitionHandoffQueryEntry",
        ].sort(),
      ],
      [
        "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types",
        [
          "SOURCE_ACQUISITION_REQUEST_VERSION",
          "SourceAcquisitionRequest",
          "SourceAcquisitionStartDecision",
        ].sort(),
      ],
      [
        "./source-acquisition-candidate-envelope",
        [
          "SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT",
          "SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH",
          "SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION",
          "SourceAcquisitionCandidateBudgetSnapshot",
          "SourceAcquisitionCandidateProviderAllowlistSnapshot",
          "SourceAcquisitionCandidateProviderAttemptResult",
          "SourceAcquisitionCandidateQueryOutcome",
          "SourceAcquisitionCandidateRunRequest",
          "SourceAcquisitionCandidateRuntimeApproval",
          "SourceAcquisitionCandidateRuntimeDecision",
          "SourceAcquisitionCandidateRuntimeStopReason",
          "SourceAcquisitionHiddenCandidateRecord",
          "sourceAcquisitionCandidateRuntimeDecisionHasExactQueryCoverage",
          "validateSourceAcquisitionCandidateBudgetSnapshot",
          "validateSourceAcquisitionCandidateProviderAllowlistSnapshot",
          "validateSourceAcquisitionCandidateProviderAttemptResult",
        ].sort(),
      ],
    ]);

    for (const ownerPath of candidateRuntimePaths) {
      expect(existsSync(ownerPath)).toBe(true);
    }

    expect(collectExportedNames(parseSource(analyzerV2RuntimeSourceAcquisitionCandidateEnvelopePath))).toEqual(
      expectedEnvelopeExports,
    );
    expect(collectModuleSpecifiers(parseSource(analyzerV2RuntimeSourceAcquisitionCandidateEnvelopePath))).toEqual([]);
    expect(collectExportedNames(parseSource(analyzerV2RuntimeSourceAcquisitionCandidateRuntimePath))).toEqual(
      expectedRuntimeExports,
    );

    const runtimeImports = collectImportBindings(parseSource(analyzerV2RuntimeSourceAcquisitionCandidateRuntimePath));
    expect(runtimeImports.map((entry) => entry.specifier).sort()).toEqual(
      Array.from(approvedRuntimeImports.keys()).sort(),
    );
    for (const entry of runtimeImports) {
      expect(entry.names.sort()).toEqual(approvedRuntimeImports.get(entry.specifier));
    }

    for (const ownerPath of candidateRuntimePaths) {
      const sourceFile = parseSource(ownerPath);
      const relativeOwnerPath = toPosix(path.relative(webRoot, ownerPath));
      const content = readFileSync(ownerPath, "utf8");

      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isV1AnalyzerImport(ownerPath, specifier)) {
          violations.push(`${relativeOwnerPath} imports V1 analyzer ${specifier}`);
        }
        if (isProviderSdkImport(specifier)) {
          violations.push(`${relativeOwnerPath} imports provider SDK ${specifier}`);
        }
        if (isSearchFetchProviderImport(specifier)) {
          violations.push(`${relativeOwnerPath} imports search/fetch provider ${specifier}`);
        }
        if (isNetworkParserImport(specifier)) {
          violations.push(`${relativeOwnerPath} imports network/parser dependency ${specifier}`);
        }
        if (isCacheIoImport(specifier)) {
          violations.push(`${relativeOwnerPath} imports cache/storage dependency ${specifier}`);
        }
        if (isSourceReliabilityImport(specifier)) {
          violations.push(`${relativeOwnerPath} imports Source Reliability ${specifier}`);
        }
        if (isTestOrMockImport(specifier)) {
          violations.push(`${relativeOwnerPath} imports test/mock/fixture module ${specifier}`);
        }
      }

      for (const location of collectDirectFetchCallLocations(sourceFile)) {
        violations.push(`direct fetch call at ${toPosix(path.relative(webRoot, location))}`);
      }
      for (const location of collectNonLiteralDynamicImports(sourceFile)) {
        violations.push(`nonliteral dynamic import at ${toPosix(path.relative(webRoot, location))}`);
      }

      for (const forbiddenText of [
        "globalThis.fetch",
        "new Request",
        "XMLHttpRequest",
        "WebSocket",
        "EventSource",
        "node:http",
        "node:https",
        "node:http2",
        "node:dns",
        "node:net",
        "node:tls",
        "undici",
        "@/lib/web-search",
        "search-provider-utils",
        "research-acquisition-stage",
        "@/lib/retrieval",
        "claimboundary.prompt",
        "CBClaimUnderstanding",
        "PreparedStage1Snapshot",
      ]) {
        if (content.includes(forbiddenText)) {
          violations.push(`${relativeOwnerPath} references forbidden text ${forbiddenText}`);
        }
      }
    }

    for (const sourcePath of collectFiles(analyzerV2RuntimeRoot, (filePath) =>
      [".ts", ".tsx"].includes(path.extname(filePath))
    )) {
      if (toPosix(sourcePath) === toPosix(analyzerV2RuntimeSourceAcquisitionCandidateRuntimePath)) {
        continue;
      }
      if ([
        analyzerV2RuntimeSourceAcquisitionNetworkAuthorityPath,
        analyzerV2RuntimeSourceAcquisitionNetworkFactoryPath,
        analyzerV2RuntimeHiddenDirectTextCandidateAcquisitionHarnessPath,
      ].map(toPosix).includes(toPosix(sourcePath))) {
        continue;
      }

      for (const specifier of collectModuleSpecifiers(parseSource(sourcePath))) {
        if (
          specifier === "@/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope"
          || specifier === "@/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime"
          || specifier === "./source-acquisition-candidate-envelope"
          || specifier === "./source-acquisition-candidate-runtime"
        ) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} re-exports or imports candidate runtime ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps the 7N-3B2 provider-network source package inside its exact source envelope", () => {
    const violations: string[] = [];
    const networkPaths = [
      analyzerV2RuntimeSourceAcquisitionNetworkAuthorityPath,
      analyzerV2RuntimeSourceAcquisitionNetworkEnvelopePath,
      analyzerV2RuntimeSourceAcquisitionNetworkTransportPath,
      analyzerV2RuntimeSourceAcquisitionNetworkFactoryPath,
    ];
    const allowedNodeCoreTransportSpecifiers = new Set([
      "node:dns/promises",
      "node:https",
      "node:net",
      "node:url",
      "node:zlib",
    ]);
    const forbiddenNetworkFactorySpecifiers = new Set([
      "fetch",
      "undici",
      "node-fetch",
      "axios",
      "got",
      "ky",
      "proxy-agent",
      "http-proxy-agent",
      "https-proxy-agent",
      "socks-proxy-agent",
    ]);
    const expectedAuthorityExports = [
      "SOURCE_ACQUISITION_NETWORK_AUTHORITY_VERSION",
      "SourceAcquisitionNetworkAuthority",
      "SourceAcquisitionNetworkAuthoritySnapshot",
      "createSourceAcquisitionNetworkAuthority",
      "isSourceAcquisitionNetworkAuthority",
      "readSourceAcquisitionNetworkAuthoritySnapshot",
    ].sort();
    const expectedEnvelopeExports = [
      "SOURCE_ACQUISITION_NETWORK_PACKAGE_COMMIT",
      "SOURCE_ACQUISITION_NETWORK_PACKAGE_PATH",
      "SOURCE_ACQUISITION_NETWORK_RUNTIME_VERSION",
      "SourceAcquisitionNetworkApproval",
      "SourceAcquisitionNetworkBudgetSnapshot",
      "SourceAcquisitionNetworkEndpointSnapshot",
      "SourceAcquisitionNetworkHiddenDiagnostic",
      "SourceAcquisitionNetworkRequestEnvelope",
      "SourceAcquisitionNetworkRequestHeader",
      "SourceAcquisitionNetworkRequestParameter",
      "SourceAcquisitionNetworkStopReason",
      "SourceAcquisitionNetworkTransportOutcome",
      "SourceAcquisitionNetworkValidationResult",
      "buildSourceAcquisitionNetworkHiddenDiagnostic",
      "readSourceAcquisitionNetworkCandidateArray",
      "sourceAcquisitionNetworkApproval",
      "validateSourceAcquisitionNetworkBudgetSnapshot",
      "validateSourceAcquisitionNetworkEndpointSnapshot",
      "validateSourceAcquisitionNetworkRequestEnvelope",
    ].sort();
    const expectedTransportExports = [
      "SourceAcquisitionNetworkLowLevelRequest",
      "SourceAcquisitionNetworkLowLevelResponse",
      "SourceAcquisitionNetworkLowLevelTransport",
      "SourceAcquisitionNetworkResolvedAddress",
      "SourceAcquisitionNetworkTransportRequest",
      "classifySourceAcquisitionNetworkIpAddress",
      "executeSourceAcquisitionNetworkTransport",
      "normalizeSourceAcquisitionNetworkHostname",
    ].sort();
    const expectedFactoryExports = [
      "SourceAcquisitionCandidateNetworkProviderFactory",
      "buildSourceAcquisitionCandidateNetworkProviderBoundary",
    ].sort();
    const approvedImports = new Map<string, Map<string, string[]>>([
      [
        toPosix(analyzerV2RuntimeSourceAcquisitionNetworkAuthorityPath),
        new Map([
          [
            "@/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime",
            [
              "SourceAcquisitionCandidateRuntimeAuthority",
              "SourceAcquisitionCandidateRuntimeAuthoritySnapshot",
              "isSourceAcquisitionCandidateRuntimeAuthority",
              "readSourceAcquisitionCandidateRuntimeAuthoritySnapshot",
            ].sort(),
          ],
          [
            "./source-acquisition-network-envelope",
            [
              "SOURCE_ACQUISITION_NETWORK_PACKAGE_COMMIT",
              "SOURCE_ACQUISITION_NETWORK_PACKAGE_PATH",
              "SourceAcquisitionNetworkApproval",
              "SourceAcquisitionNetworkBudgetSnapshot",
              "SourceAcquisitionNetworkEndpointSnapshot",
              "sourceAcquisitionNetworkApproval",
              "validateSourceAcquisitionNetworkBudgetSnapshot",
              "validateSourceAcquisitionNetworkEndpointSnapshot",
            ].sort(),
          ],
        ]),
      ],
      [
        toPosix(analyzerV2RuntimeSourceAcquisitionNetworkTransportPath),
        new Map([
          ["node:dns/promises", ["lookup"]],
          ["node:https", ["httpsRequest"]],
          ["node:net", ["isIP"]],
          ["node:url", ["domainToASCII"]],
          ["node:zlib", ["createGunzip"]],
          [
            "./source-acquisition-network-envelope",
            [
              "SourceAcquisitionNetworkBudgetSnapshot",
              "SourceAcquisitionNetworkEndpointSnapshot",
              "SourceAcquisitionNetworkHiddenDiagnostic",
              "SourceAcquisitionNetworkRequestEnvelope",
              "SourceAcquisitionNetworkStopReason",
              "SourceAcquisitionNetworkTransportOutcome",
              "buildSourceAcquisitionNetworkHiddenDiagnostic",
              "readSourceAcquisitionNetworkCandidateArray",
              "validateSourceAcquisitionNetworkBudgetSnapshot",
              "validateSourceAcquisitionNetworkEndpointSnapshot",
              "validateSourceAcquisitionNetworkRequestEnvelope",
            ].sort(),
          ],
          [
            "./source-acquisition-network-authority",
            [
              "SourceAcquisitionNetworkAuthority",
              "isSourceAcquisitionNetworkAuthority",
              "readSourceAcquisitionNetworkAuthoritySnapshot",
            ].sort(),
          ],
        ]),
      ],
      [
        toPosix(analyzerV2RuntimeSourceAcquisitionNetworkFactoryPath),
        new Map([
          [
            "./source-acquisition-candidate-envelope",
            [
              "SourceAcquisitionCandidateProviderAttemptRequest",
              "SourceAcquisitionCandidateProviderAttemptResult",
              "SourceAcquisitionCandidateProviderBoundary",
              "SourceAcquisitionHiddenCandidateRecord",
            ].sort(),
          ],
          [
            "./source-acquisition-network-envelope",
            [
              "SourceAcquisitionNetworkBudgetSnapshot",
              "SourceAcquisitionNetworkEndpointSnapshot",
              "SourceAcquisitionNetworkRequestEnvelope",
              "SourceAcquisitionNetworkTransportOutcome",
              "validateSourceAcquisitionNetworkBudgetSnapshot",
              "validateSourceAcquisitionNetworkEndpointSnapshot",
              "validateSourceAcquisitionNetworkRequestEnvelope",
            ].sort(),
          ],
          [
            "./source-acquisition-network-authority",
            [
              "SourceAcquisitionNetworkAuthority",
              "isSourceAcquisitionNetworkAuthority",
              "readSourceAcquisitionNetworkAuthoritySnapshot",
            ].sort(),
          ],
          [
            "./source-acquisition-network-transport",
            [
              "SourceAcquisitionNetworkLowLevelTransport",
              "executeSourceAcquisitionNetworkTransport",
            ].sort(),
          ],
        ]),
      ],
    ]);

    for (const ownerPath of networkPaths) {
      expect(existsSync(ownerPath)).toBe(true);
    }

    expect(collectExportedNames(parseSource(analyzerV2RuntimeSourceAcquisitionNetworkAuthorityPath))).toEqual(
      expectedAuthorityExports,
    );
    expect(collectExportedNames(parseSource(analyzerV2RuntimeSourceAcquisitionNetworkEnvelopePath))).toEqual(
      expectedEnvelopeExports,
    );
    expect(collectModuleSpecifiers(parseSource(analyzerV2RuntimeSourceAcquisitionNetworkEnvelopePath))).toEqual([]);
    expect(collectExportedNames(parseSource(analyzerV2RuntimeSourceAcquisitionNetworkTransportPath))).toEqual(
      expectedTransportExports,
    );
    expect(collectExportedNames(parseSource(analyzerV2RuntimeSourceAcquisitionNetworkFactoryPath))).toEqual(
      expectedFactoryExports,
    );

    for (const ownerPath of [
      analyzerV2RuntimeSourceAcquisitionNetworkAuthorityPath,
      analyzerV2RuntimeSourceAcquisitionNetworkTransportPath,
      analyzerV2RuntimeSourceAcquisitionNetworkFactoryPath,
    ]) {
      const sourceFile = parseSource(ownerPath);
      const relativeOwnerPath = toPosix(path.relative(webRoot, ownerPath));
      const approved = approvedImports.get(toPosix(ownerPath));
      const importBindings = collectImportBindings(sourceFile);
      expect(importBindings.map((entry) => entry.specifier).sort()).toEqual(
        Array.from(approved?.keys() ?? []).sort(),
      );
      for (const entry of importBindings) {
        expect(entry.names.sort()).toEqual(approved?.get(entry.specifier));
      }
      for (const entry of collectExportBindings(sourceFile)) {
        if (entry.specifier) {
          violations.push(`${relativeOwnerPath} re-exports ${entry.names.join(",")} from ${entry.specifier}`);
        }
      }

      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isV1AnalyzerImport(ownerPath, specifier)) {
          violations.push(`${relativeOwnerPath} imports V1 analyzer ${specifier}`);
        }
        if (isProviderSdkImport(specifier)) {
          violations.push(`${relativeOwnerPath} imports provider SDK ${specifier}`);
        }
        if (isSearchFetchProviderImport(specifier)) {
          violations.push(`${relativeOwnerPath} imports search/fetch provider ${specifier}`);
        }
        if (isCacheIoImport(specifier)) {
          violations.push(`${relativeOwnerPath} imports cache/storage dependency ${specifier}`);
        }
        if (isSourceReliabilityImport(specifier)) {
          violations.push(`${relativeOwnerPath} imports Source Reliability ${specifier}`);
        }
        if (isTestOrMockImport(specifier)) {
          violations.push(`${relativeOwnerPath} imports test/mock/fixture module ${specifier}`);
        }
        if (
          isNetworkParserImport(specifier)
          && (
            toPosix(ownerPath) !== toPosix(analyzerV2RuntimeSourceAcquisitionNetworkTransportPath)
            || !allowedNodeCoreTransportSpecifiers.has(specifier)
          )
        ) {
          violations.push(`${relativeOwnerPath} imports unapproved network/parser dependency ${specifier}`);
        }
        if (
          forbiddenNetworkFactorySpecifiers.has(specifier)
          || Array.from(forbiddenNetworkFactorySpecifiers).some((forbidden) => specifier.startsWith(`${forbidden}/`))
        ) {
          violations.push(`${relativeOwnerPath} imports forbidden network abstraction ${specifier}`);
        }
      }
      for (const location of collectDirectFetchCallLocations(sourceFile)) {
        violations.push(`direct fetch call at ${toPosix(path.relative(webRoot, location))}`);
      }
      for (const location of collectNonLiteralDynamicImports(sourceFile)) {
        violations.push(`nonliteral dynamic import at ${toPosix(path.relative(webRoot, location))}`);
      }

      const content = readFileSync(ownerPath, "utf8");
      for (const forbiddenText of [
        "globalThis.fetch",
        "new Request",
        "XMLHttpRequest",
        "WebSocket",
        "EventSource",
        "from \"@/lib/web-search\"",
        "search-provider-utils",
        "research-acquisition-stage",
        "@/lib/retrieval",
        "claimboundary.prompt",
        "CBClaimUnderstanding",
        "PreparedStage1Snapshot",
        "sourceReliability: true",
        "cacheRead: true",
        "cacheWrite: true",
        "publicExposure: true",
        "liveJobs: true",
      ]) {
        if (content.includes(forbiddenText)) {
          violations.push(`${relativeOwnerPath} references forbidden text ${forbiddenText}`);
        }
      }
    }

    for (const sourcePath of collectFiles(analyzerV2RuntimeRoot, (filePath) =>
      [".ts", ".tsx"].includes(path.extname(filePath))
    )) {
      if (networkPaths.map(toPosix).includes(toPosix(sourcePath))) {
        continue;
      }
      if (toPosix(sourcePath) === toPosix(analyzerV2RuntimeSourceAcquisitionContentAuthorityPath)) {
        continue;
      }

      for (const specifier of collectModuleSpecifiers(parseSource(sourcePath))) {
        if (
          specifier === "@/lib/analyzer-v2-runtime/source-acquisition-network-authority"
          || specifier === "@/lib/analyzer-v2-runtime/source-acquisition-network-envelope"
          || specifier === "@/lib/analyzer-v2-runtime/source-acquisition-network-transport"
          || specifier === "@/lib/analyzer-v2-runtime/source-acquisition-network-factory"
          || specifier === "./source-acquisition-network-authority"
          || specifier === "./source-acquisition-network-envelope"
          || specifier === "./source-acquisition-network-transport"
          || specifier === "./source-acquisition-network-factory"
        ) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} re-exports or imports 7N-3B2 provider-network file ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps product and public surfaces from transitively reaching provider-network source-acquisition files", () => {
    const forbiddenTargetPaths = new Set([
      analyzerV2RuntimeSourceAcquisitionNetworkAuthorityPath,
      analyzerV2RuntimeSourceAcquisitionNetworkEnvelopePath,
      analyzerV2RuntimeSourceAcquisitionNetworkTransportPath,
      analyzerV2RuntimeSourceAcquisitionNetworkFactoryPath,
    ].map(toPosix));
    const filesToScan = Array.from(new Set([
      ...adapterForbiddenProductPaths,
      ...publicSurfaceFiles,
      analyzerV2RuntimeActivationPath,
      analyzerV2RuntimeArtifactInspectionRoutePath,
    ].filter((filePath) => existsSync(filePath))));
    const violations: string[] = [];

    for (const sourcePath of filesToScan) {
      const directAndTransitive = [
        ...collectModuleSpecifiers(parseSource(sourcePath))
          .map((specifier) => resolveSrcImport(sourcePath, specifier))
          .filter((resolved): resolved is string => resolved !== null),
        ...collectTransitiveSrcImports(sourcePath),
      ];

      for (const importedPath of directAndTransitive) {
        if (forbiddenTargetPaths.has(toPosix(importedPath))) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} reaches ${toPosix(path.relative(webRoot, importedPath))}`);
        }
      }
    }

    expect(violations).toEqual([]);
  }, 20000);

  it("keeps the 7N-3B3 content source packages inside their exact source envelopes", () => {
    const violations: string[] = [];
    const contentPaths = [
      analyzerV2RuntimeSourceAcquisitionContentAuthorityPath,
      analyzerV2RuntimeSourceAcquisitionContentEnvelopePath,
      analyzerV2RuntimeSourceAcquisitionContentTransportPath,
      analyzerV2RuntimeSourceAcquisitionContentParserPath,
      analyzerV2RuntimeSourceAcquisitionContentParserIsolationProofPath,
      analyzerV2RuntimeSourceAcquisitionContentParserOciContainerProofPath,
      analyzerV2RuntimeSourceAcquisitionContentParserRunnerProtocolPath,
      analyzerV2RuntimeSourceAcquisitionContentPacketSinkPath,
    ];
    const allowedNodeCoreTransportSpecifiers = new Set([
      "node:crypto",
      "node:dns/promises",
      "node:https",
      "node:net",
      "node:url",
      "node:zlib",
    ]);
    const forbiddenTransportSpecifiers = new Set([
      "fetch",
      "undici",
      "node-fetch",
      "axios",
      "got",
      "ky",
      "proxy-agent",
      "http-proxy-agent",
      "https-proxy-agent",
      "socks-proxy-agent",
      "cheerio",
      "jsdom",
      "pdf-parse",
      "playwright",
      "puppeteer",
    ]);
    const expectedAuthorityExports = [
      "SOURCE_ACQUISITION_CONTENT_AUTHORITY_VERSION",
      "SourceAcquisitionContentAuthoritySnapshot",
      "SourceAcquisitionContentDereferenceAuthority",
      "createSourceAcquisitionContentDereferenceAuthority",
      "isSourceAcquisitionContentDereferenceAuthority",
      "readSourceAcquisitionContentAuthoritySnapshot",
    ].sort();
    const expectedEnvelopeExports = [
      "SOURCE_ACQUISITION_CONTENT_PACKAGE_COMMIT",
      "SOURCE_ACQUISITION_CONTENT_PACKAGE_PATH",
      "SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION",
      "SourceAcquisitionContentApproval",
      "SourceAcquisitionContentBudgetSnapshot",
      "SourceAcquisitionContentHiddenDiagnostic",
      "SourceAcquisitionContentOpaqueReference",
      "SourceAcquisitionContentStopReason",
      "SourceAcquisitionContentTargetEnvelope",
      "SourceAcquisitionContentTransportOutcome",
      "SourceAcquisitionContentValidationResult",
      "buildSourceAcquisitionContentHiddenDiagnostic",
      "sourceAcquisitionContentApproval",
      "validateSourceAcquisitionContentBudgetSnapshot",
      "validateSourceAcquisitionContentRequestBinding",
      "validateSourceAcquisitionContentTargetEnvelope",
    ].sort();
    const expectedTransportExports = [
      "createSourceAcquisitionContentEphemeralTarget",
      "SourceAcquisitionContentEphemeralTarget",
      "SourceAcquisitionContentLowLevelRequest",
      "SourceAcquisitionContentLowLevelResponse",
      "SourceAcquisitionContentLowLevelTransport",
      "SourceAcquisitionContentTransportPacketHandoffOutcome",
      "SourceAcquisitionContentTransportPacketHandoffRequest",
      "SourceAcquisitionContentResolvedAddress",
      "SourceAcquisitionContentTransportRequest",
      "classifySourceAcquisitionContentIpAddress",
      "executeSourceAcquisitionContentTransportPacketHandoff",
      "executeSourceAcquisitionContentTransport",
      "normalizeSourceAcquisitionContentHostname",
    ].sort();
    const expectedParserExports = [
      "SOURCE_ACQUISITION_CONTENT_PARSER_VERSION",
      "SourceAcquisitionContentParserOutcome",
      "SourceAcquisitionContentParserRequest",
      "SourceAcquisitionContentParserStructuralStatus",
      "parseSourceAcquisitionContentFixturePacket",
    ].sort();
    const expectedParserRunnerProtocolExports = [
      "SOURCE_ACQUISITION_CONTENT_PARSER_RUNNER_PROTOCOL_VERSION",
      "SourceAcquisitionContentParserRunnerOutcome",
      "SourceAcquisitionContentParserRunnerRequest",
      "SourceAcquisitionContentParserRunnerResponse",
      "executeSourceAcquisitionContentParserRunnerProtocol",
    ].sort();
    const expectedParserIsolationProofExports = [
      "PARSER_ISOLATION_NODE_RESTRICTION_PROFILE_ID",
      "PARSER_ISOLATION_PROOF_CONTRACT_VERSION",
      "ParserIsolationDeniedAuthorityMap",
      "ParserIsolationProofApprovedOptions",
      "ParserIsolationProofOptionsValidation",
      "ParserIsolationProofResult",
      "ParserIsolationProofScope",
      "ParserIsolationProofStatus",
      "ParserIsolationRuntimeAuthority",
      "ParserIsolationRuntimeKind",
      "buildParserIsolationProofResult",
      "buildParserIsolationUnavailableResult",
      "mapParserIsolationProbeOutput",
      "validateParserIsolationProofOptions",
    ].sort();
    const expectedParserOciContainerProofExports = [
      "OCI_PARSER_ISOLATION_PROOF_VERSION",
      "OciParserIsolationChildProcess",
      "OciParserIsolationProcessSpawner",
      "OciParserIsolationProofRunOptions",
      "OciParserIsolationSpawnRequest",
      "runOciParserIsolationProof",
    ].sort();
    const expectedPacketSinkExports = [
      "SOURCE_ACQUISITION_CONTENT_PACKET_SINK_VERSION",
      "SOURCE_ACQUISITION_CONTENT_TRANSPORT_PACKET_SINK_VERSION",
      "SourceAcquisitionContentFixturePacket",
      "SourceAcquisitionContentPacketLifecycleStatus",
      "SourceAcquisitionContentPacketSinkAuthority",
      "SourceAcquisitionContentPacketSinkAuthoritySnapshot",
      "SourceAcquisitionContentPacketSinkOutcome",
      "SourceAcquisitionContentTransportOwnedByteFrame",
      "SourceAcquisitionContentTransportPacketDisposalOutcome",
      "SourceAcquisitionContentTransportPacketMaterializationOutcome",
      "SourceAcquisitionContentTransportPacketSealingOutcome",
      "SourceAcquisitionContentTransportPacketSinkAuthority",
      "SourceAcquisitionContentTransportPacketSinkAuthoritySnapshot",
      "consumeSourceAcquisitionContentFixturePacketForParserRunner",
      "createSourceAcquisitionContentFixturePacket",
      "createSourceAcquisitionContentPacketSinkAuthority",
      "createSourceAcquisitionContentTransportPacketSinkAuthority",
      "disposeSourceAcquisitionContentFixturePacket",
      "disposeSourceAcquisitionContentTransportOwnedPacket",
      "isSourceAcquisitionContentFixturePacket",
      "isSourceAcquisitionContentPacketSinkAuthority",
      "materializeSourceAcquisitionContentTransportOwnedPacket",
      "readSourceAcquisitionContentPacketSinkAuthoritySnapshot",
      "sealSourceAcquisitionContentTransportOwnedByteFrame",
      "sealSourceAcquisitionContentTransportOwnedByteFrameFromTransportSuccess",
    ].sort();
    const approvedImports = new Map<string, Map<string, string[]>>([
      [
        toPosix(analyzerV2RuntimeSourceAcquisitionContentAuthorityPath),
        new Map([
          ["node:crypto", ["createHash"]],
          [
            "./source-acquisition-network-authority",
            [
              "SourceAcquisitionNetworkAuthority",
              "SourceAcquisitionNetworkAuthoritySnapshot",
              "isSourceAcquisitionNetworkAuthority",
              "readSourceAcquisitionNetworkAuthoritySnapshot",
            ].sort(),
          ],
          [
            "./source-acquisition-content-envelope",
            [
              "SOURCE_ACQUISITION_CONTENT_PACKAGE_COMMIT",
              "SOURCE_ACQUISITION_CONTENT_PACKAGE_PATH",
              "SourceAcquisitionContentApproval",
              "SourceAcquisitionContentBudgetSnapshot",
              "SourceAcquisitionContentTargetEnvelope",
              "sourceAcquisitionContentApproval",
              "validateSourceAcquisitionContentBudgetSnapshot",
              "validateSourceAcquisitionContentRequestBinding",
              "validateSourceAcquisitionContentTargetEnvelope",
            ].sort(),
          ],
        ]),
      ],
      [
        toPosix(analyzerV2RuntimeSourceAcquisitionContentTransportPath),
        new Map([
          ["node:crypto", ["createHmac"]],
          ["node:dns/promises", ["lookup"]],
          ["node:https", ["httpsRequest"]],
          ["node:net", ["isIP"]],
          ["node:url", ["domainToASCII"]],
          ["node:zlib", ["createGunzip"]],
          [
            "./source-acquisition-content-envelope",
            [
              "SourceAcquisitionContentBudgetSnapshot",
              "SourceAcquisitionContentHiddenDiagnostic",
              "SourceAcquisitionContentOpaqueReference",
              "SourceAcquisitionContentStopReason",
              "SourceAcquisitionContentTargetEnvelope",
              "SourceAcquisitionContentTransportOutcome",
              "buildSourceAcquisitionContentHiddenDiagnostic",
              "validateSourceAcquisitionContentBudgetSnapshot",
              "validateSourceAcquisitionContentRequestBinding",
              "validateSourceAcquisitionContentTargetEnvelope",
            ].sort(),
          ],
          [
            "./source-acquisition-content-authority",
            [
              "SourceAcquisitionContentDereferenceAuthority",
              "isSourceAcquisitionContentDereferenceAuthority",
              "readSourceAcquisitionContentAuthoritySnapshot",
            ].sort(),
          ],
          [
            "./source-acquisition-content-packet-sink",
            [
              "SourceAcquisitionContentTransportOwnedByteFrame",
              "SourceAcquisitionContentTransportPacketDisposalOutcome",
              "SourceAcquisitionContentTransportPacketMaterializationOutcome",
              "SourceAcquisitionContentTransportPacketSealingOutcome",
              "SourceAcquisitionContentTransportPacketSinkAuthority",
              "disposeSourceAcquisitionContentTransportOwnedPacket",
              "materializeSourceAcquisitionContentTransportOwnedPacket",
              "sealSourceAcquisitionContentTransportOwnedByteFrame",
              "sealSourceAcquisitionContentTransportOwnedByteFrameFromTransportSuccess",
            ].sort(),
          ],
        ]),
      ],
      [
        toPosix(analyzerV2RuntimeSourceAcquisitionContentPacketSinkPath),
        new Map([
          ["node:crypto", ["createHash", "createHmac", "randomBytes"]],
          [
            "./source-acquisition-content-envelope",
            ["SOURCE_ACQUISITION_CONTENT_RUNTIME_VERSION"],
          ],
        ]),
      ],
      [
        toPosix(analyzerV2RuntimeSourceAcquisitionContentParserPath),
        new Map([
          [
            "./source-acquisition-content-packet-sink",
            [
              "SourceAcquisitionContentFixturePacket",
              "SourceAcquisitionContentPacketLifecycleStatus",
              "consumeSourceAcquisitionContentFixturePacketForParserRunner",
              "disposeSourceAcquisitionContentFixturePacket",
              "isSourceAcquisitionContentFixturePacket",
            ].sort(),
          ],
          [
            "./source-acquisition-content-parser-runner-protocol",
            [
              "executeSourceAcquisitionContentParserRunnerProtocol",
            ].sort(),
          ],
        ]),
      ],
      [
        toPosix(analyzerV2RuntimeSourceAcquisitionContentParserRunnerProtocolPath),
        new Map([
          ["node:child_process", ["spawn"]],
          ["node:fs", ["existsSync"]],
          ["node:url", ["fileURLToPath"]],
        ]),
      ],
      [
        toPosix(analyzerV2RuntimeSourceAcquisitionContentParserIsolationProofPath),
        new Map([
          ["node:crypto", ["createHash"]],
        ]),
      ],
      [
        toPosix(analyzerV2RuntimeSourceAcquisitionContentParserOciContainerProofPath),
        new Map([
          ["node:child_process", ["spawn"]],
          [
            "./source-acquisition-content-parser-isolation-proof",
            [
              "PARSER_ISOLATION_NODE_RESTRICTION_PROFILE_ID",
              "PARSER_ISOLATION_PROOF_CONTRACT_VERSION",
              "ParserIsolationProofApprovedOptions",
              "ParserIsolationProofResult",
              "buildParserIsolationProofResult",
              "buildParserIsolationUnavailableResult",
              "mapParserIsolationProbeOutput",
              "validateParserIsolationProofOptions",
            ].sort(),
          ],
        ]),
      ],
    ]);
    const contentProductionFiles = collectFiles(analyzerV2RuntimeRoot, (filePath) =>
      [".ts", ".tsx", ".cjs"].includes(path.extname(filePath))
      && path.basename(filePath).startsWith("source-acquisition-content-")
    ).map((filePath) => toPosix(path.relative(webRoot, filePath))).sort();
    const contentTestFiles = collectFiles(analyzerV2RuntimeUnitTestRoot, (filePath) =>
      [".ts", ".tsx"].includes(path.extname(filePath))
      && path.basename(filePath).startsWith("source-acquisition-content-")
    ).map((filePath) => toPosix(path.relative(webRoot, filePath))).sort();

    for (const ownerPath of contentPaths) {
      expect(existsSync(ownerPath)).toBe(true);
    }
    expect(contentProductionFiles).toEqual([
      "src/lib/analyzer-v2-runtime/source-acquisition-content-authority.ts",
      "src/lib/analyzer-v2-runtime/source-acquisition-content-envelope.ts",
      "src/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.ts",
      "src/lib/analyzer-v2-runtime/source-acquisition-content-parser-isolation-proof.ts",
      "src/lib/analyzer-v2-runtime/source-acquisition-content-parser-oci-container-proof.ts",
      "src/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner-protocol.ts",
      "src/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner.worker.cjs",
      "src/lib/analyzer-v2-runtime/source-acquisition-content-parser.ts",
      "src/lib/analyzer-v2-runtime/source-acquisition-content-transport.ts",
    ]);
    expect(contentTestFiles).toEqual([
      "test/unit/lib/analyzer-v2-runtime/source-acquisition-content-authority.test.ts",
      "test/unit/lib/analyzer-v2-runtime/source-acquisition-content-envelope.test.ts",
      "test/unit/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink.test.ts",
      "test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-isolation-proof.test.ts",
      "test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-oci-container-proof.test.ts",
      "test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner-protocol.test.ts",
      "test/unit/lib/analyzer-v2-runtime/source-acquisition-content-parser.test.ts",
      "test/unit/lib/analyzer-v2-runtime/source-acquisition-content-transport.test.ts",
    ]);

    expect(collectExportedNames(parseSource(analyzerV2RuntimeSourceAcquisitionContentAuthorityPath))).toEqual(
      expectedAuthorityExports,
    );
    expect(collectExportedNames(parseSource(analyzerV2RuntimeSourceAcquisitionContentEnvelopePath))).toEqual(
      expectedEnvelopeExports,
    );
    expect(collectModuleSpecifiers(parseSource(analyzerV2RuntimeSourceAcquisitionContentEnvelopePath))).toEqual([]);
    expect(collectExportedNames(parseSource(analyzerV2RuntimeSourceAcquisitionContentTransportPath))).toEqual(
      expectedTransportExports,
    );
    expect(collectExportedNames(parseSource(analyzerV2RuntimeSourceAcquisitionContentPacketSinkPath))).toEqual(
      expectedPacketSinkExports,
    );
    expect(readFileSync(analyzerV2RuntimeSourceAcquisitionContentPacketSinkPath, "utf8"))
      .not.toContain("createTransportSuccessByteState");
    expect(readFileSync(analyzerV2RuntimeSourceAcquisitionContentTransportPath, "utf8"))
      .not.toContain("createTransportSuccessByteState");
    expect(collectExportedNames(parseSource(analyzerV2RuntimeSourceAcquisitionContentParserPath))).toEqual(
      expectedParserExports,
    );
    expect(collectExportedNames(parseSource(analyzerV2RuntimeSourceAcquisitionContentParserRunnerProtocolPath))).toEqual(
      expectedParserRunnerProtocolExports,
    );
    expect(collectExportedNames(parseSource(analyzerV2RuntimeSourceAcquisitionContentParserIsolationProofPath))).toEqual(
      expectedParserIsolationProofExports,
    );
    expect(collectExportedNames(parseSource(analyzerV2RuntimeSourceAcquisitionContentParserOciContainerProofPath))).toEqual(
      expectedParserOciContainerProofExports,
    );

    for (const ownerPath of [
      analyzerV2RuntimeSourceAcquisitionContentAuthorityPath,
      analyzerV2RuntimeSourceAcquisitionContentTransportPath,
      analyzerV2RuntimeSourceAcquisitionContentPacketSinkPath,
      analyzerV2RuntimeSourceAcquisitionContentParserPath,
      analyzerV2RuntimeSourceAcquisitionContentParserIsolationProofPath,
      analyzerV2RuntimeSourceAcquisitionContentParserOciContainerProofPath,
      analyzerV2RuntimeSourceAcquisitionContentParserRunnerProtocolPath,
    ]) {
      const sourceFile = parseSource(ownerPath);
      const relativeOwnerPath = toPosix(path.relative(webRoot, ownerPath));
      const approved = approvedImports.get(toPosix(ownerPath));
      const importBindings = collectImportBindings(sourceFile);
      expect(importBindings.map((entry) => entry.specifier).sort()).toEqual(
        Array.from(approved?.keys() ?? []).sort(),
      );
      for (const entry of importBindings) {
        expect(entry.names.sort()).toEqual(approved?.get(entry.specifier));
      }
      for (const entry of collectExportBindings(sourceFile)) {
        if (entry.specifier) {
          violations.push(`${relativeOwnerPath} re-exports ${entry.names.join(",")} from ${entry.specifier}`);
        }
      }

      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        const isApprovedParserRunnerProtocolFileImport =
          toPosix(ownerPath) === toPosix(analyzerV2RuntimeSourceAcquisitionContentParserRunnerProtocolPath)
          && specifier === "node:fs";
        const isApprovedTransportToPacketSinkImport =
          toPosix(ownerPath) === toPosix(analyzerV2RuntimeSourceAcquisitionContentTransportPath)
          && specifier === "./source-acquisition-content-packet-sink";
        const isApprovedOciProofToIsolationProofImport =
          toPosix(ownerPath) === toPosix(analyzerV2RuntimeSourceAcquisitionContentParserOciContainerProofPath)
          && specifier === "./source-acquisition-content-parser-isolation-proof";
        if (isV1AnalyzerImport(ownerPath, specifier)) {
          violations.push(`${relativeOwnerPath} imports V1 analyzer ${specifier}`);
        }
        if (isProviderSdkImport(specifier)) {
          violations.push(`${relativeOwnerPath} imports provider SDK ${specifier}`);
        }
        if (isSearchFetchProviderImport(specifier)) {
          violations.push(`${relativeOwnerPath} imports search/fetch provider ${specifier}`);
        }
        if (isCacheIoImport(specifier) && !isApprovedParserRunnerProtocolFileImport) {
          violations.push(`${relativeOwnerPath} imports cache/storage dependency ${specifier}`);
        }
        if (isSourceReliabilityImport(specifier)) {
          violations.push(`${relativeOwnerPath} imports Source Reliability ${specifier}`);
        }
        if (isTestOrMockImport(specifier)) {
          violations.push(`${relativeOwnerPath} imports test/mock/fixture module ${specifier}`);
        }
        if (
          isNetworkParserImport(specifier)
          && (
            toPosix(ownerPath) !== toPosix(analyzerV2RuntimeSourceAcquisitionContentTransportPath)
            || !allowedNodeCoreTransportSpecifiers.has(specifier)
          )
        ) {
          violations.push(`${relativeOwnerPath} imports unapproved network/parser dependency ${specifier}`);
        }
        if (
          forbiddenTransportSpecifiers.has(specifier)
          || Array.from(forbiddenTransportSpecifiers).some((forbidden) => specifier.startsWith(`${forbidden}/`))
        ) {
          violations.push(`${relativeOwnerPath} imports forbidden content transport dependency ${specifier}`);
        }
        if (
          toPosix(ownerPath) !== toPosix(analyzerV2RuntimeSourceAcquisitionContentParserPath)
          && !isApprovedTransportToPacketSinkImport
          && !isApprovedOciProofToIsolationProofImport
          && (
            specifier === "./source-acquisition-content-parser"
            || specifier === "./source-acquisition-content-packet-sink"
            || specifier.includes("source-acquisition-content-parser")
            || specifier.includes("source-acquisition-content-packet-sink")
          )
        ) {
          violations.push(`${relativeOwnerPath} imports parser or packet sink ${specifier}`);
        }
        if (
          toPosix(ownerPath) === toPosix(analyzerV2RuntimeSourceAcquisitionContentParserPath)
          && (
            specifier === "./source-acquisition-content-authority"
            || specifier === "./source-acquisition-content-transport"
            || specifier.includes("source-acquisition-content-authority")
            || specifier.includes("source-acquisition-content-transport")
          )
        ) {
          violations.push(`${relativeOwnerPath} imports unapproved content dereference owner ${specifier}`);
        }
        if (
          toPosix(ownerPath) === toPosix(analyzerV2RuntimeSourceAcquisitionContentPacketSinkPath)
          && (
            specifier === "./source-acquisition-content-transport"
            || specifier.includes("source-acquisition-content-transport")
          )
        ) {
          violations.push(`${relativeOwnerPath} imports transport owner ${specifier}`);
        }
      }
      for (const location of collectDirectFetchCallLocations(sourceFile)) {
        violations.push(`direct fetch call at ${toPosix(path.relative(webRoot, location))}`);
      }
      for (const location of collectNonLiteralDynamicImports(sourceFile)) {
        violations.push(`nonliteral dynamic import at ${toPosix(path.relative(webRoot, location))}`);
      }

      const content = readFileSync(ownerPath, "utf8");
      for (const forbiddenText of [
        "globalThis.fetch",
        "new Request",
        "XMLHttpRequest",
        "WebSocket",
        "EventSource",
        "from \"@/lib/web-search\"",
        "search-provider-utils",
        "research-acquisition-stage",
        "@/lib/retrieval",
        "claimboundary.prompt",
        "CBClaimUnderstanding",
        "PreparedStage1Snapshot",
        "sourceReliability: true",
        "cacheRead: true",
        "cacheWrite: true",
        "publicExposure: true",
        "liveJobs: true",
        "parserPayloadIncluded: true",
        "evidenceItemIncluded: true",
        "warningIncluded: true",
        "verdictIncluded: true",
      ]) {
        if (content.includes(forbiddenText)) {
          violations.push(`${relativeOwnerPath} references forbidden text ${forbiddenText}`);
        }
      }
    }

    const workerSource = readFileSync(analyzerV2RuntimeSourceAcquisitionContentParserRunnerWorkerPath, "utf8");
    for (const forbiddenText of [
      "require(",
      "module.require",
      "import(",
      "eval(",
      "Function(",
      "process.env",
      "process.argv",
      "process.cwd",
      "node:fs",
      "node:http",
      "node:https",
      "undici",
      "child_process",
      "worker_threads",
      "node:vm",
      "@/lib/analyzer",
      "source-acquisition-content-transport",
      "sourceReliability",
      "claimboundary.prompt",
    ]) {
      if (workerSource.includes(forbiddenText)) {
        violations.push(`source-acquisition-content-parser-runner.worker.cjs references forbidden text ${forbiddenText}`);
      }
    }
    for (const processMember of workerSource.matchAll(/process\.([a-zA-Z0-9_]+)/g)) {
      if (!["stdin", "stdout", "stderr", "exitCode", "exit"].includes(processMember[1])) {
        violations.push(`source-acquisition-content-parser-runner.worker.cjs uses unapproved process member ${processMember[1]}`);
      }
    }

    for (const sourcePath of collectFiles(analyzerV2RuntimeRoot, (filePath) =>
      [".ts", ".tsx"].includes(path.extname(filePath))
    )) {
      if (contentPaths.map(toPosix).includes(toPosix(sourcePath))) {
        continue;
      }

      for (const specifier of collectModuleSpecifiers(parseSource(sourcePath))) {
        if (
          specifier === "@/lib/analyzer-v2-runtime/source-acquisition-content-authority"
          || specifier === "@/lib/analyzer-v2-runtime/source-acquisition-content-envelope"
          || specifier === "@/lib/analyzer-v2-runtime/source-acquisition-content-transport"
          || specifier === "@/lib/analyzer-v2-runtime/source-acquisition-content-parser"
          || specifier === "@/lib/analyzer-v2-runtime/source-acquisition-content-parser-runner-protocol"
          || specifier === "@/lib/analyzer-v2-runtime/source-acquisition-content-packet-sink"
          || specifier === "./source-acquisition-content-authority"
          || specifier === "./source-acquisition-content-envelope"
          || specifier === "./source-acquisition-content-transport"
          || specifier === "./source-acquisition-content-parser"
          || specifier === "./source-acquisition-content-parser-runner-protocol"
          || specifier === "./source-acquisition-content-packet-sink"
        ) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} re-exports or imports 7N-3B3 content source file ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps product and public surfaces from transitively reaching content-dereference source-acquisition files", () => {
    const forbiddenTargetPaths = new Set([
      analyzerV2RuntimeSourceAcquisitionContentAuthorityPath,
      analyzerV2RuntimeSourceAcquisitionContentEnvelopePath,
      analyzerV2RuntimeSourceAcquisitionContentTransportPath,
      analyzerV2RuntimeSourceAcquisitionContentParserPath,
      analyzerV2RuntimeSourceAcquisitionContentParserRunnerProtocolPath,
      analyzerV2RuntimeSourceAcquisitionContentPacketSinkPath,
    ].map(toPosix));
    const filesToScan = Array.from(new Set([
      ...adapterForbiddenProductPaths,
      ...publicSurfaceFiles,
      analyzerV2RuntimeActivationPath,
      analyzerV2RuntimeArtifactInspectionRoutePath,
    ].filter((filePath) => existsSync(filePath))));
    const violations: string[] = [];

    for (const sourcePath of filesToScan) {
      const directAndTransitive = [
        ...collectModuleSpecifiers(parseSource(sourcePath))
          .map((specifier) => resolveSrcImport(sourcePath, specifier))
          .filter((resolved): resolved is string => resolved !== null),
        ...collectTransitiveSrcImports(sourcePath),
      ];

      for (const importedPath of directAndTransitive) {
        if (forbiddenTargetPaths.has(toPosix(importedPath))) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} reaches ${toPosix(path.relative(webRoot, importedPath))}`);
        }
      }
    }

    expect(violations).toEqual([]);
  }, 20000);

  it("keeps product and public surfaces from transitively reaching candidate source-acquisition runtime files", () => {
    const forbiddenTargetPaths = new Set([
      analyzerV2RuntimeSourceAcquisitionCandidateEnvelopePath,
      analyzerV2RuntimeSourceAcquisitionCandidateRuntimePath,
    ].map(toPosix));
    const filesToScan = Array.from(new Set([
      ...adapterForbiddenProductPaths,
      ...publicSurfaceFiles,
      analyzerV2RuntimeActivationPath,
      analyzerV2RuntimeArtifactInspectionRoutePath,
    ].filter((filePath) => existsSync(filePath))));
    const violations: string[] = [];

    for (const sourcePath of filesToScan) {
      const directAndTransitive = [
        ...collectModuleSpecifiers(parseSource(sourcePath))
          .map((specifier) => resolveSrcImport(sourcePath, specifier))
          .filter((resolved): resolved is string => resolved !== null),
        ...collectTransitiveSrcImports(sourcePath),
      ];

      for (const importedPath of directAndTransitive) {
        if (forbiddenTargetPaths.has(toPosix(importedPath))) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} reaches ${toPosix(path.relative(webRoot, importedPath))}`);
        }
      }
    }

    expect(violations).toEqual([]);
  }, 20000);

  it("keeps the 4C2b provider factory as the only runtime provider SDK import location", () => {
    const violations: string[] = [];
    const providerSdkImports: Array<{ filePath: string; specifier: string }> = [];

    expect(existsSync(analyzerV2RuntimeProviderFactoryPath)).toBe(true);

    for (const sourcePath of analyzerV2RuntimeSourceFiles) {
      const sourceFile = parseSource(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (!isProviderSdkImport(specifier)) {
          continue;
        }
        providerSdkImports.push({ filePath: sourcePath, specifier });
        if (!isApprovedProviderFactorySdkImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports unapproved provider SDK ${specifier}`);
        }
      }
    }

    const factorySdkImports = providerSdkImports
      .filter((entry) => toPosix(path.resolve(entry.filePath)) === toPosix(analyzerV2RuntimeProviderFactoryPath))
      .map((entry) => entry.specifier)
      .sort();

    expect(violations).toEqual([]);
    expect(factorySdkImports).toEqual(["@ai-sdk/anthropic", "ai"]);
  });

  it("keeps analyzer-v2-runtime product imports limited to the 4C3b activation owners", () => {
    const violations: string[] = [];

    for (const sourcePath of collectFiles(srcRoot, (filePath) =>
      [".ts", ".tsx"].includes(path.extname(filePath))
    )) {
      if (toPosix(sourcePath).startsWith(`${toPosix(analyzerV2RuntimeRoot)}/`)) {
        continue;
      }

      const sourceFile = parseSource(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isAnalyzerV2RuntimeImport(sourcePath, specifier)) {
          const approved = analyzerV2RuntimeProductImportApprovedPaths.get(toPosix(sourcePath));
          if (!approved?.has(specifier)) {
            violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports analyzer-v2-runtime module ${specifier}`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps product and public surfaces from directly reaching source-acquisition runtime authority owners", () => {
    const forbiddenTargetPaths = new Set([
      analyzerV2RuntimeSourceAcquisitionAuthorityPath,
      analyzerV2RuntimeSourceAcquisitionConfigContractPath,
      analyzerV2RuntimeSourceAcquisitionProviderContractPath,
    ].map(toPosix));
    const filesToScan = Array.from(new Set([
      ...adapterForbiddenProductPaths,
      ...publicSurfaceFiles,
      analyzerV2RuntimeActivationPath,
      analyzerV2RuntimeArtifactInspectionRoutePath,
    ].filter((filePath) => existsSync(filePath))));
    const violations: string[] = [];

    for (const sourcePath of filesToScan) {
      const sourceFile = parseSource(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (sourceAcquisitionRuntimeAuthorityOwnerSpecifiers.has(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports source-acquisition runtime owner ${specifier}`);
          continue;
        }

        if (!specifier.startsWith(".")) {
          continue;
        }

        const resolved = resolveExistingTypeScriptFile(path.resolve(path.dirname(sourcePath), specifier));
        if (resolved && forbiddenTargetPaths.has(toPosix(resolved))) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} reaches source-acquisition runtime owner ${toPosix(path.relative(webRoot, resolved))}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps the 4C3b hidden runtime kill switch confined to product execution selection", () => {
    const violations: string[] = [];
    const approvedPath = toPosix(analyzerV2ExecutionSelectionPath);

    for (const sourcePath of collectFiles(srcRoot, (filePath) =>
      [".ts", ".tsx"].includes(path.extname(filePath))
    )) {
      const content = readFileSync(sourcePath, "utf8");
      if (
        content.includes(hiddenRuntimeKillSwitchEnvName)
        && toPosix(sourcePath) !== approvedPath
      ) {
        violations.push(`${toPosix(path.relative(webRoot, sourcePath))} references hidden runtime kill switch env`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps public app, report, and export surfaces from importing dispatch-capable internals", () => {
    const violations: string[] = [];

    for (const sourcePath of publicSurfaceFiles) {
      const sourceFile = parseSource(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isDispatchCapableInternalImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports dispatch-capable internal ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps product and public surfaces from reaching the source-acquisition structural executor", () => {
    const forbiddenTargets = new Set([
      evidenceLifecycleSourceAcquisitionExecutionContractPath,
      evidenceLifecycleSourceAcquisitionStructuralExecutorPath,
    ].map(toPosix));
    const scanRoots = Array.from(new Set([
      ...adapterForbiddenProductPaths,
      ...publicSurfaceFiles,
    ]));
    const violations: string[] = [];

    for (const sourcePath of scanRoots) {
      const sourceFile = parseSource(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        const resolved = resolveAnalyzerV2SourceImport(sourcePath, specifier);
        if (resolved && forbiddenTargets.has(toPosix(resolved))) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} directly reaches ${toPosix(path.relative(webRoot, resolved))}`);
        }
      }

      for (const importedPath of collectTransitiveAnalyzerV2Imports(sourcePath)) {
        if (forbiddenTargets.has(toPosix(importedPath))) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} transitively reaches ${toPosix(path.relative(webRoot, importedPath))}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps the hidden V2 integration harness internal and away from source execution", () => {
    const forbiddenTargets = new Set([
      evidenceLifecycleSourceAcquisitionExecutionContractPath,
      evidenceLifecycleSourceAcquisitionStructuralExecutorPath,
    ].map(toPosix));
    const scanRoots = Array.from(new Set([
      ...adapterForbiddenProductPaths,
      ...publicSurfaceFiles,
    ]));
    const violations: string[] = [];
    const sourceFile = parseSource(analyzerV2HiddenIntegrationHarnessPath);

    for (const specifier of collectModuleSpecifiers(parseSource(analyzerV2IndexPath))) {
      const resolved = resolveAnalyzerV2SourceImport(analyzerV2IndexPath, specifier);
      if (resolved && toPosix(resolved) === toPosix(analyzerV2HiddenIntegrationHarnessPath)) {
        violations.push(`analyzer-v2 barrel exports hidden harness ${specifier}`);
      }
    }

    for (const sourcePath of scanRoots) {
      for (const importedPath of collectTransitiveAnalyzerV2Imports(sourcePath)) {
        if (toPosix(importedPath) === toPosix(analyzerV2HiddenIntegrationHarnessPath)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} transitively reaches hidden harness`);
        }
      }
    }

    for (const specifier of collectModuleSpecifiers(sourceFile)) {
      const resolved = resolveAnalyzerV2SourceImport(analyzerV2HiddenIntegrationHarnessPath, specifier);
      if (resolved && forbiddenTargets.has(toPosix(resolved))) {
        violations.push(`hidden harness reaches source executor target ${toPosix(path.relative(webRoot, resolved))}`);
      }
      if (isV1AnalyzerImport(analyzerV2HiddenIntegrationHarnessPath, specifier)) {
        violations.push(`hidden harness imports V1 analyzer ${specifier}`);
      }
      if (isAnalyzerV2RuntimeImport(analyzerV2HiddenIntegrationHarnessPath, specifier)) {
        violations.push(`hidden harness imports analyzer-v2-runtime ${specifier}`);
      }
      if (isSearchFetchProviderImport(specifier)) {
        violations.push(`hidden harness imports search/fetch provider ${specifier}`);
      }
      if (isNetworkParserImport(specifier)) {
        violations.push(`hidden harness imports network/parser dependency ${specifier}`);
      }
      if (isSourceReliabilityImport(specifier)) {
        violations.push(`hidden harness imports Source Reliability ${specifier}`);
      }
      if (isCacheIoImport(specifier)) {
        violations.push(`hidden harness imports IO/storage dependency ${specifier}`);
      }
      if (isProviderSdkImport(specifier)) {
        violations.push(`hidden harness imports provider SDK ${specifier}`);
      }
      if (isTestOrMockImport(specifier)) {
        violations.push(`hidden harness imports test/mock/fixture module ${specifier}`);
      }
      if (specifier.startsWith("@/app") || specifier.startsWith("@/components")) {
        violations.push(`hidden harness imports public surface ${specifier}`);
      }
      if (
        specifier === "@/lib/analyzer-v2/orchestrator"
        || specifier === "@/lib/analyzer-v2/pipeline-shell"
        || specifier === "@/lib/analyzer-v2/runner-ingress"
        || specifier === "@/lib/analyzer-v2"
      ) {
        violations.push(`hidden harness imports product/orchestrator surface ${specifier}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps the X6 hidden candidate-acquisition harness runtime-owned and test-injected only", () => {
    const harnessPath = analyzerV2RuntimeHiddenDirectTextCandidateAcquisitionHarnessPath;
    const testPath = path.resolve(
      analyzerV2RuntimeUnitTestRoot,
      "hidden-direct-text-candidate-acquisition-harness.test.ts",
    );
    const allowedHarnessImports = new Set([
      "@/lib/analyzer-v2/result-envelope",
      "@/lib/analyzer-v2/hidden-integration-harness",
      "@/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime",
      "@/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope",
    ]);
    const scanRoots = Array.from(new Set([
      ...adapterForbiddenProductPaths,
      ...publicSurfaceFiles,
      analyzerV2RuntimeActivationPath,
      analyzerV2RuntimeArtifactInspectionRoutePath,
    ].filter((filePath) => existsSync(filePath))));
    const violations: string[] = [];

    expect(existsSync(harnessPath)).toBe(true);
    expect(existsSync(testPath)).toBe(true);

    for (const sourcePath of scanRoots) {
      for (const importedPath of collectTransitiveSrcImports(sourcePath)) {
        if (toPosix(importedPath) === toPosix(harnessPath)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} transitively reaches X6 hidden harness`);
        }
      }
    }

    const sourceFile = parseSource(harnessPath);
    for (const specifier of collectModuleSpecifiers(sourceFile)) {
      if (!allowedHarnessImports.has(specifier)) {
        violations.push(`X6 hidden harness imports unapproved module ${specifier}`);
      }
      if (isV1AnalyzerImport(harnessPath, specifier)) {
        violations.push(`X6 hidden harness imports V1 analyzer ${specifier}`);
      }
      if (isSearchFetchProviderImport(specifier)) {
        violations.push(`X6 hidden harness imports search/fetch provider ${specifier}`);
      }
      if (isNetworkParserImport(specifier) || specifier.includes("source-acquisition-network")) {
        violations.push(`X6 hidden harness imports network/parser dependency ${specifier}`);
      }
      if (specifier.includes("source-acquisition-content")) {
        violations.push(`X6 hidden harness imports content/parser owner ${specifier}`);
      }
      if (isSourceReliabilityImport(specifier)) {
        violations.push(`X6 hidden harness imports Source Reliability ${specifier}`);
      }
      if (isCacheIoImport(specifier)) {
        violations.push(`X6 hidden harness imports IO/storage dependency ${specifier}`);
      }
      if (isProviderSdkImport(specifier)) {
        violations.push(`X6 hidden harness imports provider SDK ${specifier}`);
      }
      if (isTestOrMockImport(specifier)) {
        violations.push(`X6 hidden harness imports test/mock/fixture module ${specifier}`);
      }
      if (specifier.startsWith("@/app") || specifier.startsWith("@/components")) {
        violations.push(`X6 hidden harness imports public surface ${specifier}`);
      }
      if (
        specifier === "@/lib/analyzer-v2/orchestrator"
        || specifier === "@/lib/analyzer-v2/pipeline-shell"
        || specifier === "@/lib/analyzer-v2/runner-ingress"
        || specifier === "@/lib/analyzer-v2"
      ) {
        violations.push(`X6 hidden harness imports product/orchestrator surface ${specifier}`);
      }
    }

    const harnessContent = readFileSync(harnessPath, "utf8");
    if (harnessContent.includes("runHiddenV2IntegrationHarness")) {
      violations.push("X6 hidden harness invokes X5 instead of accepting an upstream X5 result");
    }
    if (harnessContent.includes("providerCall") || harnessContent.includes("EvidenceQueryPlanningProviderCall")) {
      violations.push("X6 hidden harness exposes a query-planning/model callback path");
    }
    if (harnessContent.includes("candidate_search_api_future")) {
      violations.push("X6 hidden harness allows future network-capable candidate provider kind");
    }
    for (const location of collectDirectFetchCallLocations(sourceFile)) {
      violations.push(`direct fetch call at ${toPosix(path.relative(webRoot, location))}`);
    }

    const testFile = parseSource(testPath);
    for (const specifier of collectModuleSpecifiers(testFile)) {
      if (specifier.includes("source-acquisition-network")) {
        violations.push(`X6 test imports network owner ${specifier}`);
      }
      if (specifier.includes("source-acquisition-content")) {
        violations.push(`X6 test imports content/parser owner ${specifier}`);
      }
      if (isProviderSdkImport(specifier)) {
        violations.push(`X6 test imports provider SDK ${specifier}`);
      }
    }

    expect(violations).toEqual([]);
  }, 10_000);

  it("keeps X7-A source-material readiness runtime-adapted and non-executable", () => {
    const coreFiles = collectFiles(evidenceLifecycleSourceMaterialRoot, (filePath) =>
      [".ts", ".tsx"].includes(path.extname(filePath))
    );
    const harnessPath = analyzerV2RuntimeHiddenDirectTextSourceMaterialReadinessHarnessPath;
    const testPath = path.resolve(
      analyzerV2RuntimeUnitTestRoot,
      "hidden-direct-text-source-material-readiness-harness.test.ts",
    );
    const allowedHarnessImports = new Set([
      "@/lib/analyzer-v2/result-envelope",
      "@/lib/analyzer-v2/evidence-lifecycle/source-material/readiness",
      "@/lib/analyzer-v2/evidence-lifecycle/source-material/types",
      "@/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness",
    ]);
    const scanRoots = Array.from(new Set([
      ...adapterForbiddenProductPaths,
      ...publicSurfaceFiles,
      analyzerV2RuntimeActivationPath,
      analyzerV2RuntimeArtifactInspectionRoutePath,
    ].filter((filePath) => existsSync(filePath))));
    const violations: string[] = [];

    expect(coreFiles.map((filePath) => toPosix(path.relative(webRoot, filePath))).sort()).toEqual([
      "src/lib/analyzer-v2/evidence-lifecycle/source-material/contract.ts",
      "src/lib/analyzer-v2/evidence-lifecycle/source-material/readiness.ts",
      "src/lib/analyzer-v2/evidence-lifecycle/source-material/types.ts",
    ]);
    expect(existsSync(harnessPath)).toBe(true);
    expect(existsSync(testPath)).toBe(true);

    for (const sourcePath of coreFiles) {
      const sourceFile = parseSource(sourcePath);
      const sourceContent = readFileSync(sourcePath, "utf8");
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isV1AnalyzerImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports V1 analyzer ${specifier}`);
        }
        if (isAnalyzerV2RuntimeImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports analyzer-v2-runtime ${specifier}`);
        }
        if (isSearchFetchProviderImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports search/fetch provider ${specifier}`);
        }
        if (isNetworkParserImport(specifier) || specifier.includes("source-acquisition-network")) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports network/parser dependency ${specifier}`);
        }
        if (specifier.includes("source-acquisition-content")) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports content/parser owner ${specifier}`);
        }
        if (isSourceReliabilityImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports Source Reliability ${specifier}`);
        }
        if (isCacheIoImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports IO/storage dependency ${specifier}`);
        }
        if (isProviderSdkImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports provider SDK ${specifier}`);
        }
        if (isTestOrMockImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports test/mock/fixture module ${specifier}`);
        }
        if (specifier.startsWith("@/app") || specifier.startsWith("@/components")) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports public surface ${specifier}`);
        }
        if (
          specifier === "@/lib/analyzer-v2/orchestrator"
          || specifier === "@/lib/analyzer-v2/pipeline-shell"
          || specifier === "@/lib/analyzer-v2/runner-ingress"
          || specifier === "@/lib/analyzer-v2"
        ) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports product/orchestrator surface ${specifier}`);
        }
      }
      for (const location of collectDirectFetchCallLocations(sourceFile)) {
        violations.push(`direct fetch call at ${toPosix(path.relative(webRoot, location))}`);
      }
      for (const forbiddenTerm of [
        "EvidenceItem",
        "warning",
        "verdict",
        "truthPercentage",
        "confidence",
        "reportMarkdown",
        "sourceReliability",
        "cacheKey",
        "https://",
        "fetch(",
      ]) {
        if (sourceContent.includes(forbiddenTerm)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} contains forbidden X7-A term ${forbiddenTerm}`);
        }
      }
    }

    for (const sourcePath of scanRoots) {
      for (const importedPath of collectTransitiveSrcImports(sourcePath)) {
        if (toPosix(importedPath) === toPosix(harnessPath)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} transitively reaches X7-A hidden harness`);
        }
      }
    }

    const sourceFile = parseSource(harnessPath);
    for (const specifier of collectModuleSpecifiers(sourceFile)) {
      if (!allowedHarnessImports.has(specifier)) {
        violations.push(`X7-A hidden harness imports unapproved module ${specifier}`);
      }
      if (isV1AnalyzerImport(harnessPath, specifier)) {
        violations.push(`X7-A hidden harness imports V1 analyzer ${specifier}`);
      }
      if (isSearchFetchProviderImport(specifier)) {
        violations.push(`X7-A hidden harness imports search/fetch provider ${specifier}`);
      }
      if (isNetworkParserImport(specifier) || specifier.includes("source-acquisition-network")) {
        violations.push(`X7-A hidden harness imports network/parser dependency ${specifier}`);
      }
      if (specifier.includes("source-acquisition-content")) {
        violations.push(`X7-A hidden harness imports content/parser owner ${specifier}`);
      }
      if (isSourceReliabilityImport(specifier)) {
        violations.push(`X7-A hidden harness imports Source Reliability ${specifier}`);
      }
      if (isCacheIoImport(specifier)) {
        violations.push(`X7-A hidden harness imports IO/storage dependency ${specifier}`);
      }
      if (isProviderSdkImport(specifier)) {
        violations.push(`X7-A hidden harness imports provider SDK ${specifier}`);
      }
      if (isTestOrMockImport(specifier)) {
        violations.push(`X7-A hidden harness imports test/mock/fixture module ${specifier}`);
      }
      if (specifier.startsWith("@/app") || specifier.startsWith("@/components")) {
        violations.push(`X7-A hidden harness imports public surface ${specifier}`);
      }
      if (
        specifier === "@/lib/analyzer-v2/orchestrator"
        || specifier === "@/lib/analyzer-v2/pipeline-shell"
        || specifier === "@/lib/analyzer-v2/runner-ingress"
        || specifier === "@/lib/analyzer-v2"
      ) {
        violations.push(`X7-A hidden harness imports product/orchestrator surface ${specifier}`);
      }
    }

    const harnessContent = readFileSync(harnessPath, "utf8");
    for (const forbiddenCall of [
      "runHiddenV2IntegrationHarness",
      "runHiddenDirectTextCandidateAcquisitionHarness",
      "executeSourceAcquisitionCandidateRuntime",
      "buildSourceAcquisitionCandidateNetworkProviderBoundary",
      "executeSourceAcquisitionNetworkTransport",
      "fetch(",
    ]) {
      if (harnessContent.includes(forbiddenCall)) {
        violations.push(`X7-A hidden harness contains forbidden execution call ${forbiddenCall}`);
      }
    }

    const testFile = parseSource(testPath);
    for (const specifier of collectModuleSpecifiers(testFile)) {
      if (specifier.includes("source-acquisition-network")) {
        violations.push(`X7-A test imports network owner ${specifier}`);
      }
      if (specifier.includes("source-acquisition-content")) {
        violations.push(`X7-A test imports content/parser owner ${specifier}`);
      }
      if (isProviderSdkImport(specifier)) {
        violations.push(`X7-A test imports provider SDK ${specifier}`);
      }
    }

    expect(violations).toEqual([]);
  }, 10_000);

  it("keeps the Analyzer V2 barrel free of dispatch-capable internals", () => {
    const violations: string[] = [];
    const sourceFile = parseSource(analyzerV2IndexPath);

    for (const specifier of collectModuleSpecifiers(sourceFile)) {
      if (isDispatchCapableInternalImport(analyzerV2IndexPath, specifier)) {
        violations.push(`analyzer-v2 barrel exports dispatch-capable internal ${specifier}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps public V2 result schemas and result surfaces free of runtime-owner internals", () => {
    const filesToScan = [
      reportResultV2SchemaPath,
      analyzerV2CompatibilityViewPath,
      analyzerV2ResultEnvelopePath,
    ].filter((filePath) => existsSync(filePath));
    const violations: string[] = [];

    for (const sourcePath of filesToScan) {
      const content = readFileSync(sourcePath, "utf8");
      for (const term of ownerOnlyResultSurfaceTerms) {
        if (content.includes(term)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} exposes owner-only term ${term}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps the 6B.3c-1 dispatch frame free of dispatch side-effect imports", () => {
    const sourceFile = parseSource(claimUnderstandingDispatchFramePath);
    const violations: string[] = [];

    for (const specifier of collectModuleSpecifiers(sourceFile)) {
      if (isV1AnalyzerImport(claimUnderstandingDispatchFramePath, specifier)) {
        violations.push(`dispatch frame imports V1 analyzer ${specifier}`);
      }
      if (isClaimUnderstandingModelAdapterImport(claimUnderstandingDispatchFramePath, specifier)) {
        violations.push(`dispatch frame imports model adapter ${specifier}`);
      }
      if (isClaimUnderstandingPromptLoaderImport(claimUnderstandingDispatchFramePath, specifier)) {
        violations.push(`dispatch frame imports prompt loader ${specifier}`);
      }
      if (isAnalyzerV2CacheGovernanceImport(claimUnderstandingDispatchFramePath, specifier)) {
        violations.push(`dispatch frame imports cache governance ${specifier}`);
      }
      if (isAnalyzerV2GatewayPolicyImport(claimUnderstandingDispatchFramePath, specifier)) {
        violations.push(`dispatch frame imports gateway policy ${specifier}`);
      }
      if (isProviderSdkImport(specifier)) {
        violations.push(`dispatch frame imports provider SDK ${specifier}`);
      }
      if (isTestOrMockImport(specifier)) {
        violations.push(`dispatch frame imports test/mock/fixture module ${specifier}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps the 6B.3c-2 readiness contract free of dispatch side-effect imports", () => {
    const sourceFile = parseSource(claimUnderstandingDispatchReadinessContractPath);
    const violations: string[] = [];

    for (const specifier of collectModuleSpecifiers(sourceFile)) {
      if (isV1AnalyzerImport(claimUnderstandingDispatchReadinessContractPath, specifier)) {
        violations.push(`dispatch readiness imports V1 analyzer ${specifier}`);
      }
      if (isClaimUnderstandingModelAdapterImport(claimUnderstandingDispatchReadinessContractPath, specifier)) {
        violations.push(`dispatch readiness imports model adapter ${specifier}`);
      }
      if (isClaimUnderstandingPromptLoaderImport(claimUnderstandingDispatchReadinessContractPath, specifier)) {
        violations.push(`dispatch readiness imports prompt loader ${specifier}`);
      }
      if (isAnalyzerV2CacheGovernanceImport(claimUnderstandingDispatchReadinessContractPath, specifier)) {
        violations.push(`dispatch readiness imports cache governance ${specifier}`);
      }
      if (isAnalyzerV2GatewayPolicyImport(claimUnderstandingDispatchReadinessContractPath, specifier)) {
        violations.push(`dispatch readiness imports gateway policy ${specifier}`);
      }
      if (isProviderSdkImport(specifier)) {
        violations.push(`dispatch readiness imports provider SDK ${specifier}`);
      }
      if (isTestOrMockImport(specifier)) {
        violations.push(`dispatch readiness imports test/mock/fixture module ${specifier}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps Evidence Lifecycle intake contract-only before provider wiring", () => {
    const evidenceLifecycleFiles = collectFiles(evidenceLifecycleRoot, (filePath) =>
      [".ts", ".tsx"].includes(path.extname(filePath))
        && !toPosix(filePath).startsWith(`${toPosix(evidenceLifecycleSourceAcquisitionRoot)}/`)
        && !toPosix(filePath).startsWith(`${toPosix(evidenceLifecycleTaskPolicyRoot)}/`)
        && !toPosix(filePath).startsWith(`${toPosix(evidenceLifecycleTaskContractsRoot)}/`)
        && !toPosix(filePath).startsWith(`${toPosix(evidenceLifecycleExecutionReadinessRoot)}/`)
        && !toPosix(filePath).startsWith(`${toPosix(evidenceLifecycleQueryPlanningRoot)}/`)
        && !toPosix(filePath).startsWith(`${toPosix(evidenceLifecycleEvidenceCorpusRoot)}/`)
        && !toPosix(filePath).startsWith(`${toPosix(evidenceLifecycleSourceMaterialRoot)}/`)
        && !toPosix(filePath).startsWith(`${toPosix(evidenceLifecycleSourceAcquisitionPortRoot)}/`)
    );
    const violations: string[] = [];

    expect(evidenceLifecycleFiles.map((filePath) => toPosix(path.relative(webRoot, filePath))).sort()).toEqual([
      "src/lib/analyzer-v2/evidence-lifecycle/intake.ts",
      "src/lib/analyzer-v2/evidence-lifecycle/types.ts",
    ]);

    for (const sourcePath of evidenceLifecycleFiles) {
      const sourceFile = parseSource(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isV1AnalyzerImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports V1 analyzer ${specifier}`);
        }
        if (isClaimUnderstandingModelAdapterImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports model adapter ${specifier}`);
        }
        if (isClaimUnderstandingPromptLoaderImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports prompt loader ${specifier}`);
        }
        if (isAnalyzerV2CacheGovernanceImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports cache governance ${specifier}`);
        }
        if (isAnalyzerV2GatewayPolicyImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports gateway policy ${specifier}`);
        }
        if (isClaimUnderstandingRuntimeDispatchImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports runtime dispatch ${specifier}`);
        }
        if (isAnalyzerV2RuntimeImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports analyzer-v2-runtime ${specifier}`);
        }
        if (isCacheIoImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports IO/storage dependency ${specifier}`);
        }
        if (isProviderSdkImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports provider SDK ${specifier}`);
        }
        if (isTestOrMockImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports test/mock/fixture module ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps Evidence Lifecycle subdirectory ownership explicit", () => {
    const subdirectories = readdirSync(evidenceLifecycleRoot)
      .map((entry) => path.join(evidenceLifecycleRoot, entry))
      .filter((entryPath) => statSync(entryPath).isDirectory())
      .map((entryPath) => toPosix(path.relative(webRoot, entryPath)))
      .sort();

    expect(subdirectories).toEqual([
      "src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus",
      "src/lib/analyzer-v2/evidence-lifecycle/execution-readiness",
      "src/lib/analyzer-v2/evidence-lifecycle/query-planning",
      "src/lib/analyzer-v2/evidence-lifecycle/source-acquisition",
      "src/lib/analyzer-v2/evidence-lifecycle/source-acquisition-port",
      "src/lib/analyzer-v2/evidence-lifecycle/source-material",
      "src/lib/analyzer-v2/evidence-lifecycle/task-contracts",
      "src/lib/analyzer-v2/evidence-lifecycle/task-policy",
    ]);
  });

  it("keeps Evidence Lifecycle source-acquisition controlled-harness-only before provider wiring", () => {
    const sourceAcquisitionFiles = collectFiles(evidenceLifecycleSourceAcquisitionRoot, (filePath) =>
      [".ts", ".tsx"].includes(path.extname(filePath))
    );
    const violations: string[] = [];

    expect(sourceAcquisitionFiles.map((filePath) => toPosix(path.relative(webRoot, filePath))).sort()).toEqual([
      "src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/execution-contract.ts",
      "src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff.ts",
      "src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request.ts",
      "src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor.ts",
      "src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types.ts",
    ]);

    for (const sourcePath of sourceAcquisitionFiles) {
      const content = readFileSync(sourcePath, "utf8");
      if (content.includes("PLANNED_TASKS")
        || content.includes("RETRIEVAL_POLICY_CATALOG")
        || content.includes("buildPolicySnapshot")) {
        violations.push(`${toPosix(path.relative(webRoot, sourcePath))} owns private static policy constants`);
      }
      for (const forbiddenAuthorityFlag of [
        "productionRuntime: true",
        "providerSdk: true",
        "network: true",
        "parser: true",
        "searchFetch: true",
        "cacheStorage: true",
        "sourceReliability: true",
        "productRuntime: true",
        "publicExposure: true",
      ]) {
        if (content.includes(forbiddenAuthorityFlag)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} enables forbidden source-acquisition authority ${forbiddenAuthorityFlag}`);
        }
      }

      const sourceFile = parseSource(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isV1AnalyzerImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports V1 analyzer ${specifier}`);
        }
        if (isClaimUnderstandingModelAdapterImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports model adapter ${specifier}`);
        }
        if (isClaimUnderstandingPromptLoaderImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports prompt loader ${specifier}`);
        }
        if (isAnalyzerV2CacheGovernanceImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports cache governance ${specifier}`);
        }
        if (isAnalyzerV2GatewayPolicyImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports gateway policy ${specifier}`);
        }
        if (isClaimUnderstandingRuntimeDispatchImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports runtime dispatch ${specifier}`);
        }
        if (isAnalyzerV2RuntimeImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports analyzer-v2-runtime ${specifier}`);
        }
        if (isSearchFetchProviderImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports search/fetch provider ${specifier}`);
        }
        if (isNetworkParserImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports network/parser dependency ${specifier}`);
        }
        if (isSourceReliabilityImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports Source Reliability ${specifier}`);
        }
        if (isAcsDirectUrlRuntimeImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports ACS/direct URL runtime ${specifier}`);
        }
        if (isCacheIoImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports IO/storage dependency ${specifier}`);
        }
        if (isProviderSdkImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports provider SDK ${specifier}`);
        }
        if (isTestOrMockImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports test/mock/fixture module ${specifier}`);
        }
        if (specifier.startsWith("@/app") || specifier.startsWith("@/components")) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports public surface ${specifier}`);
        }
        if (
          specifier === "@/lib/analyzer-v2/orchestrator"
          || specifier === "@/lib/analyzer-v2/pipeline-shell"
          || specifier === "@/lib/analyzer-v2/runner-ingress"
          || specifier === "@/lib/analyzer-v2"
        ) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports product/orchestrator surface ${specifier}`);
        }
      }
      for (const location of collectDirectFetchCallLocations(sourceFile)) {
        violations.push(`direct fetch call at ${toPosix(path.relative(webRoot, location))}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps Evidence Lifecycle task-policy contract inert before UCM or runtime authority", () => {
    const taskPolicyFiles = collectFiles(evidenceLifecycleTaskPolicyRoot, (filePath) =>
      [".ts", ".tsx"].includes(path.extname(filePath))
    );
    const violations: string[] = [];

    expect(taskPolicyFiles.map((filePath) => toPosix(path.relative(webRoot, filePath))).sort()).toEqual([
      "src/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy.ts",
      "src/lib/analyzer-v2/evidence-lifecycle/task-policy/types.ts",
    ]);

    for (const sourcePath of taskPolicyFiles) {
      const sourceFile = parseSource(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isV1AnalyzerImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports V1 analyzer ${specifier}`);
        }
        if (isClaimUnderstandingModelAdapterImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports model adapter ${specifier}`);
        }
        if (isClaimUnderstandingPromptLoaderImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports prompt loader ${specifier}`);
        }
        if (isAnalyzerV2CacheGovernanceImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports cache governance ${specifier}`);
        }
        if (isAnalyzerV2GatewayPolicyImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports gateway policy ${specifier}`);
        }
        if (isClaimUnderstandingRuntimeDispatchImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports runtime dispatch ${specifier}`);
        }
        if (isAnalyzerV2RuntimeImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports analyzer-v2-runtime ${specifier}`);
        }
        if (isSearchFetchProviderImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports search/fetch provider ${specifier}`);
        }
        if (isSourceReliabilityImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports Source Reliability ${specifier}`);
        }
        if (isCacheIoImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports IO/storage dependency ${specifier}`);
        }
        if (isProviderSdkImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports provider SDK ${specifier}`);
        }
        if (isTestOrMockImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports test/mock/fixture module ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps Evidence Lifecycle task-result schemas inert before prompt or runtime execution", () => {
    const taskContractFiles = collectFiles(evidenceLifecycleTaskContractsRoot, (filePath) =>
      [".ts", ".tsx"].includes(path.extname(filePath))
    );
    const violations: string[] = [];

    expect(taskContractFiles.map((filePath) => toPosix(path.relative(webRoot, filePath))).sort()).toEqual([
      "src/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas.ts",
      "src/lib/analyzer-v2/evidence-lifecycle/task-contracts/types.ts",
    ]);

    for (const sourcePath of taskContractFiles) {
      const sourceFile = parseSource(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isV1AnalyzerImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports V1 analyzer ${specifier}`);
        }
        if (isClaimUnderstandingModelAdapterImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports model adapter ${specifier}`);
        }
        if (isClaimUnderstandingPromptLoaderImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports prompt loader ${specifier}`);
        }
        if (isAnalyzerV2CacheGovernanceImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports cache governance ${specifier}`);
        }
        if (isAnalyzerV2GatewayPolicyImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports gateway policy ${specifier}`);
        }
        if (isClaimUnderstandingRuntimeDispatchImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports runtime dispatch ${specifier}`);
        }
        if (isAnalyzerV2RuntimeImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports analyzer-v2-runtime ${specifier}`);
        }
        if (isSearchFetchProviderImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports search/fetch provider ${specifier}`);
        }
        if (isNetworkParserImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports network/parser dependency ${specifier}`);
        }
        if (isSourceReliabilityImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports Source Reliability ${specifier}`);
        }
        if (isCacheIoImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports IO/storage dependency ${specifier}`);
        }
        if (isProviderSdkImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports provider SDK ${specifier}`);
        }
        if (isTestOrMockImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports test/mock/fixture module ${specifier}`);
        }
        if (specifier.startsWith("@/app") || specifier.startsWith("@/components")) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports public surface ${specifier}`);
        }
        if (
          specifier === "@/lib/analyzer-v2/orchestrator"
          || specifier === "@/lib/analyzer-v2/pipeline-shell"
          || specifier === "@/lib/analyzer-v2/runner-ingress"
          || specifier === "@/lib/analyzer-v2"
        ) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports product/orchestrator surface ${specifier}`);
        }
      }
      for (const location of collectDirectFetchCallLocations(sourceFile)) {
        violations.push(`direct fetch call at ${toPosix(path.relative(webRoot, location))}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps Evidence Lifecycle execution-readiness contracts inert before runtime execution", () => {
    const readinessFiles = collectFiles(evidenceLifecycleExecutionReadinessRoot, (filePath) =>
      [".ts", ".tsx"].includes(path.extname(filePath))
    );
    const violations: string[] = [];

    expect(readinessFiles.map((filePath) => toPosix(path.relative(webRoot, filePath))).sort()).toEqual([
      "src/lib/analyzer-v2/evidence-lifecycle/execution-readiness/static-contract.ts",
      "src/lib/analyzer-v2/evidence-lifecycle/execution-readiness/types.ts",
    ]);

    for (const sourcePath of readinessFiles) {
      const sourceFile = parseSource(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isV1AnalyzerImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports V1 analyzer ${specifier}`);
        }
        if (isClaimUnderstandingModelAdapterImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports model adapter ${specifier}`);
        }
        if (isClaimUnderstandingPromptLoaderImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports prompt loader ${specifier}`);
        }
        if (isAnalyzerV2CacheGovernanceImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports cache governance ${specifier}`);
        }
        if (isAnalyzerV2GatewayPolicyImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports gateway policy ${specifier}`);
        }
        if (isClaimUnderstandingRuntimeDispatchImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports runtime dispatch ${specifier}`);
        }
        if (isAnalyzerV2RuntimeImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports analyzer-v2-runtime ${specifier}`);
        }
        if (isSearchFetchProviderImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports search/fetch provider ${specifier}`);
        }
        if (isNetworkParserImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports network/parser dependency ${specifier}`);
        }
        if (isSourceReliabilityImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports Source Reliability ${specifier}`);
        }
        if (isCacheIoImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports IO/storage dependency ${specifier}`);
        }
        if (isProviderSdkImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports provider SDK ${specifier}`);
        }
        if (isTestOrMockImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports test/mock/fixture module ${specifier}`);
        }
        if (specifier.startsWith("@/app") || specifier.startsWith("@/components")) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports public surface ${specifier}`);
        }
        if (
          specifier === "@/lib/analyzer-v2/orchestrator"
          || specifier === "@/lib/analyzer-v2/pipeline-shell"
          || specifier === "@/lib/analyzer-v2/runner-ingress"
          || specifier === "@/lib/analyzer-v2"
        ) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports product/orchestrator surface ${specifier}`);
        }
      }
      for (const location of collectDirectFetchCallLocations(sourceFile)) {
        violations.push(`direct fetch call at ${toPosix(path.relative(webRoot, location))}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps Evidence Lifecycle query-planning runtime inside the approved hidden execution boundary", () => {
    const queryPlanningFiles = collectFiles(evidenceLifecycleQueryPlanningRoot, (filePath) =>
      [".ts", ".tsx"].includes(path.extname(filePath))
    );
    const violations: string[] = [];

    expect(queryPlanningFiles.map((filePath) => toPosix(path.relative(webRoot, filePath))).sort()).toEqual([
      "src/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope.ts",
      "src/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection.ts",
      "src/lib/analyzer-v2/evidence-lifecycle/query-planning/model-adapter.ts",
      "src/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader.ts",
      "src/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime.ts",
    ]);

    for (const sourcePath of queryPlanningFiles) {
      const sourceFile = parseSource(sourcePath);
      const normalizedSourcePath = toPosix(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isV1AnalyzerImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports V1 analyzer ${specifier}`);
        }
        if (isClaimUnderstandingModelAdapterImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports Claim Understanding model adapter ${specifier}`);
        }
        if (isClaimUnderstandingPromptLoaderImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports Claim Understanding prompt loader ${specifier}`);
        }
        if (isClaimUnderstandingRuntimeDispatchImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports Claim Understanding runtime dispatch ${specifier}`);
        }
        if (isAnalyzerV2RuntimeImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports analyzer-v2-runtime ${specifier}`);
        }
        if (isSearchFetchProviderImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports search/fetch provider ${specifier}`);
        }
        if (isNetworkParserImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports network/parser dependency ${specifier}`);
        }
        if (isSourceReliabilityImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports Source Reliability ${specifier}`);
        }
        if (isAcsDirectUrlRuntimeImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports ACS/direct URL runtime ${specifier}`);
        }
        if (
          isCacheIoImport(specifier)
          && !(normalizedSourcePath.endsWith("/query-planning/prompt-loader.ts") && specifier === "node:fs/promises")
        ) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports IO/storage dependency ${specifier}`);
        }
        if (isProviderSdkImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports provider SDK ${specifier}`);
        }
        if (isTestOrMockImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports test/mock/fixture module ${specifier}`);
        }
        if (specifier.startsWith("@/app") || specifier.startsWith("@/components")) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports public surface ${specifier}`);
        }
        if (
          specifier === "@/lib/analyzer-v2/orchestrator"
          || specifier === "@/lib/analyzer-v2/pipeline-shell"
          || specifier === "@/lib/analyzer-v2/runner-ingress"
          || specifier === "@/lib/analyzer-v2"
        ) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports product/orchestrator surface ${specifier}`);
        }
      }
      for (const location of collectDirectFetchCallLocations(sourceFile)) {
        violations.push(`direct fetch call at ${toPosix(path.relative(webRoot, location))}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps Evidence Lifecycle evidence-corpus build decision contract-only before source execution", () => {
    const evidenceCorpusFiles = collectFiles(evidenceLifecycleEvidenceCorpusRoot, (filePath) =>
      [".ts", ".tsx"].includes(path.extname(filePath))
    );
    const violations: string[] = [];

    expect(evidenceCorpusFiles.map((filePath) => toPosix(path.relative(webRoot, filePath))).sort()).toEqual([
      "src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/build-decision.ts",
      "src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard.ts",
      "src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/types.ts",
    ]);

    for (const sourcePath of evidenceCorpusFiles) {
      const sourceFile = parseSource(sourcePath);
      const sourceContent = readFileSync(sourcePath, "utf8");
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isV1AnalyzerImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports V1 analyzer ${specifier}`);
        }
        if (isClaimUnderstandingModelAdapterImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports model adapter ${specifier}`);
        }
        if (isClaimUnderstandingPromptLoaderImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports prompt loader ${specifier}`);
        }
        if (isAnalyzerV2CacheGovernanceImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports cache governance ${specifier}`);
        }
        if (isAnalyzerV2GatewayPolicyImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports gateway policy ${specifier}`);
        }
        if (isClaimUnderstandingRuntimeDispatchImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports runtime dispatch ${specifier}`);
        }
        if (isAnalyzerV2RuntimeImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports analyzer-v2-runtime ${specifier}`);
        }
        if (isSearchFetchProviderImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports search/fetch provider ${specifier}`);
        }
        if (isSourceReliabilityImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports Source Reliability ${specifier}`);
        }
        if (isCacheIoImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports IO/storage dependency ${specifier}`);
        }
        if (isProviderSdkImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports provider SDK ${specifier}`);
        }
        if (isTestOrMockImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports test/mock/fixture module ${specifier}`);
        }
        if (specifier.startsWith("@/app") || specifier.startsWith("@/components")) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports public surface ${specifier}`);
        }
        if (
          specifier === "@/lib/analyzer-v2/orchestrator"
          || specifier === "@/lib/analyzer-v2/pipeline-shell"
          || specifier === "@/lib/analyzer-v2/runner-ingress"
          || specifier === "@/lib/analyzer-v2"
        ) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports product/orchestrator surface ${specifier}`);
        }
      }
      for (const location of collectDirectFetchCallLocations(sourceFile)) {
        violations.push(`direct fetch call at ${toPosix(path.relative(webRoot, location))}`);
      }
      for (const forbiddenTerm of [
        "EvidenceItem",
        "warning",
        "verdict",
        "truthPercentage",
        "confidence",
        "reportMarkdown",
        "sourceReliability",
        "cacheKey",
        "https://",
        "fetch(",
      ]) {
        if (sourceContent.includes(forbiddenTerm)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} contains forbidden evidence-corpus guard term ${forbiddenTerm}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps Evidence Lifecycle source-acquisition port contract inert before source execution", () => {
    const sourceAcquisitionPortFiles = collectFiles(evidenceLifecycleSourceAcquisitionPortRoot, (filePath) =>
      [".ts", ".tsx"].includes(path.extname(filePath))
    );
    const violations: string[] = [];

    expect(sourceAcquisitionPortFiles.map((filePath) => toPosix(path.relative(webRoot, filePath))).sort()).toEqual([
      "src/lib/analyzer-v2/evidence-lifecycle/source-acquisition-port/static-contract.ts",
      "src/lib/analyzer-v2/evidence-lifecycle/source-acquisition-port/types.ts",
    ]);

    for (const sourcePath of sourceAcquisitionPortFiles) {
      const sourceFile = parseSource(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isV1AnalyzerImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports V1 analyzer ${specifier}`);
        }
        if (isClaimUnderstandingModelAdapterImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports model adapter ${specifier}`);
        }
        if (isClaimUnderstandingPromptLoaderImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports prompt loader ${specifier}`);
        }
        if (isAnalyzerV2CacheGovernanceImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports cache governance ${specifier}`);
        }
        if (isAnalyzerV2GatewayPolicyImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports gateway policy ${specifier}`);
        }
        if (isClaimUnderstandingRuntimeDispatchImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports runtime dispatch ${specifier}`);
        }
        if (isAnalyzerV2RuntimeImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports analyzer-v2-runtime ${specifier}`);
        }
        if (isSearchFetchProviderImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports search/fetch provider ${specifier}`);
        }
        if (isNetworkParserImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports network/parser dependency ${specifier}`);
        }
        if (isSourceReliabilityImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports Source Reliability ${specifier}`);
        }
        if (isCacheIoImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports IO/storage dependency ${specifier}`);
        }
        if (isProviderSdkImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports provider SDK ${specifier}`);
        }
        if (isTestOrMockImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports test/mock/fixture module ${specifier}`);
        }
        if (specifier.startsWith("@/app") || specifier.startsWith("@/components")) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports public surface ${specifier}`);
        }
        if (
          specifier === "@/lib/analyzer-v2/orchestrator"
          || specifier === "@/lib/analyzer-v2/pipeline-shell"
          || specifier === "@/lib/analyzer-v2/runner-ingress"
          || specifier === "@/lib/analyzer-v2"
        ) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports product/orchestrator surface ${specifier}`);
        }
      }
      for (const location of collectDirectFetchCallLocations(sourceFile)) {
        violations.push(`direct fetch call at ${toPosix(path.relative(webRoot, location))}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps the 6B.3c-3B3 runtime-dispatch owner imports limited to approved symbols", () => {
    const sourceFile = parseSource(claimUnderstandingRuntimeDispatchPath);
    const violations: string[] = [];

    for (const importBinding of collectImportBindings(sourceFile)) {
      const specifier = importBinding.specifier;
      const approvedNames = runtimeDispatchApprovedImports.get(specifier);

      if (!approvedNames) {
        violations.push(`runtime dispatch imports unapproved module ${specifier}`);
        continue;
      }

      for (const importedName of importBinding.names) {
        if (!approvedNames.has(importedName)) {
          violations.push(`runtime dispatch imports unapproved symbol ${importedName} from ${specifier}`);
        }
      }

      if (isV1AnalyzerImport(claimUnderstandingRuntimeDispatchPath, specifier)) {
        violations.push(`runtime dispatch imports V1 analyzer ${specifier}`);
      }
      if (isCacheIoImport(specifier)) {
        violations.push(`runtime dispatch imports IO/storage dependency ${specifier}`);
      }
      if (isProviderSdkImport(specifier)) {
        violations.push(`runtime dispatch imports provider SDK ${specifier}`);
      }
      if (isTestOrMockImport(specifier)) {
        violations.push(`runtime dispatch imports test/mock/fixture module ${specifier}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps Analyzer V2 product source free of test, mock, and fixture imports", () => {
    const violations: string[] = [];

    for (const sourcePath of v2SourceFiles) {
      const sourceFile = parseSource(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isTestOrMockImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports test/mock/fixture module ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps Analyzer V2 product source free of provider SDK and nonliteral dynamic imports", () => {
    const violations: string[] = [];

    for (const sourcePath of v2SourceFiles) {
      const sourceFile = parseSource(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isProviderSdkImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports provider SDK ${specifier}`);
        }
      }
      for (const location of collectNonLiteralDynamicImports(sourceFile)) {
        violations.push(`nonliteral dynamic import at ${toPosix(path.relative(webRoot, location))}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps Analyzer V2 production source from enabling cache IO through executionApproved", () => {
    const violations: string[] = [];

    for (const sourcePath of v2SourceFiles) {
      for (const location of collectExecutionApprovedTrueLiterals(parseSource(sourcePath))) {
        violations.push(`executionApproved true literal at ${toPosix(path.relative(webRoot, location))}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps production source from constructing unapproved executable gateway task state", () => {
    const violations: string[] = [];

    for (const sourcePath of v2SourceFiles) {
      for (const location of collectForbiddenExecutableStatusMutations(parseSource(sourcePath))) {
        const normalizedLocation = toPosix(location);
        if (normalizedLocation.startsWith(toPosix(analyzerV2GatewayPolicyPath))) {
          continue;
        }
        violations.push(`${toPosix(path.relative(webRoot, location))} constructs executable gateway task state`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps analyzer-v2 cache governance free of IO and dispatch dependencies", () => {
    const sourceFile = parseSource(analyzerV2CacheGovernancePath);
    const violations: string[] = [];

    for (const specifier of collectModuleSpecifiers(sourceFile)) {
      if (isV1AnalyzerImport(analyzerV2CacheGovernancePath, specifier)) {
        violations.push(`cache governance imports V1 analyzer ${specifier}`);
      }
      if (isCacheIoImport(specifier)) {
        violations.push(`cache governance imports IO/storage dependency ${specifier}`);
      }
      if (isProviderSdkImport(specifier)) {
        violations.push(`cache governance imports provider SDK ${specifier}`);
      }
      if (isClaimUnderstandingPromptLoaderImport(analyzerV2CacheGovernancePath, specifier)) {
        violations.push(`cache governance imports prompt loader ${specifier}`);
      }
      if (isClaimUnderstandingModelAdapterImport(analyzerV2CacheGovernancePath, specifier)) {
        violations.push(`cache governance imports model adapter ${specifier}`);
      }
      if (isClaimUnderstandingRuntimeDispatchImport(analyzerV2CacheGovernancePath, specifier)) {
        violations.push(`cache governance imports runtime dispatch ${specifier}`);
      }
      if (isClaimUnderstandingDispatchReadinessContractImport(analyzerV2CacheGovernancePath, specifier)) {
        violations.push(`cache governance imports dispatch readiness ${specifier}`);
      }
      if (isTestOrMockImport(specifier)) {
        violations.push(`cache governance imports test/mock/fixture module ${specifier}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps analyzer-v2 cache policy metadata free of IO and dispatch dependencies", () => {
    const sourceFile = parseSource(analyzerV2CachePolicyRegistryPath);
    const violations: string[] = [];

    for (const specifier of collectModuleSpecifiers(sourceFile)) {
      if (isV1AnalyzerImport(analyzerV2CachePolicyRegistryPath, specifier)) {
        violations.push(`cache policy registry imports V1 analyzer ${specifier}`);
      }
      if (isCacheIoImport(specifier)) {
        violations.push(`cache policy registry imports IO/storage dependency ${specifier}`);
      }
      if (isProviderSdkImport(specifier)) {
        violations.push(`cache policy registry imports provider SDK ${specifier}`);
      }
      if (isClaimUnderstandingPromptLoaderImport(analyzerV2CachePolicyRegistryPath, specifier)) {
        violations.push(`cache policy registry imports prompt loader ${specifier}`);
      }
      if (isClaimUnderstandingModelAdapterImport(analyzerV2CachePolicyRegistryPath, specifier)) {
        violations.push(`cache policy registry imports model adapter ${specifier}`);
      }
      if (isClaimUnderstandingRuntimeDispatchImport(analyzerV2CachePolicyRegistryPath, specifier)) {
        violations.push(`cache policy registry imports runtime dispatch ${specifier}`);
      }
      if (isClaimUnderstandingDispatchReadinessContractImport(analyzerV2CachePolicyRegistryPath, specifier)) {
        violations.push(`cache policy registry imports dispatch readiness ${specifier}`);
      }
      if (isAnalyzerV2CacheGovernanceImport(analyzerV2CachePolicyRegistryPath, specifier)) {
        violations.push(`cache policy registry imports cache governance ${specifier}`);
      }
      if (isTestOrMockImport(specifier)) {
        violations.push(`cache policy registry imports test/mock/fixture module ${specifier}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps the 6B.3b model adapter and tests free of provider SDK imports", () => {
    const adapterTestFiles = collectFiles(analyzerV2UnitTestRoot, (filePath) =>
      toPosix(filePath).endsWith("/claim-understanding/model-adapter.test.ts")
    );
    const filesToScan = [claimUnderstandingModelAdapterPath, ...adapterTestFiles];
    const violations: string[] = [];

    for (const sourcePath of filesToScan) {
      const sourceFile = parseSource(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isProviderSdkImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports provider SDK ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("does not reference legacy prompt profiles or prompt files", () => {
    const forbidden = collectLegacyPromptProfilesAndFiles();
    const violations: string[] = [];

    for (const sourcePath of v2SourceFiles) {
      const sourceFile = parseSource(sourcePath);
      for (const literal of collectPromptProfileLiterals(sourceFile)) {
        const violation = findPromptReuseViolation(literal, forbidden);
        if (violation) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} references ${violation}`);
        }
      }
      for (const literal of collectPromptFileLiterals(sourceFile)) {
        const violation = findPromptFileReuseViolation(literal, forbidden);
        if (violation) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} references ${violation}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps V2 prompt source files clean-room and V2-owned", () => {
    const forbidden = collectLegacyPromptProfilesAndFiles();
    const violations: string[] = [];

    expect(v2PromptFiles.map((filePath) => toPosix(path.relative(webRoot, filePath)))).toContain(
      "prompts/claimboundary-v2.prompt.md",
    );

    for (const promptFile of v2PromptFiles) {
      const rel = toPosix(path.relative(webRoot, promptFile));
      const content = readFileSync(promptFile, "utf8");

      for (const fileRef of forbidden.fileRefs) {
        if (content.includes(fileRef)) {
          violations.push(`${rel} references legacy prompt file "${fileRef}"`);
        }
      }

      for (const profile of forbidden.profiles) {
        const escapedProfile = profile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const profilePattern = new RegExp(`(^|[\\s:"'\`])${escapedProfile}([\\s:"'\`]|$)`);
        if (profilePattern.test(content)) {
          violations.push(`${rel} references legacy prompt profile "${profile}"`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("does not use V1 contract type identifiers in V2 source", () => {
    const violations: string[] = [];

    for (const sourcePath of v2SourceFiles) {
      const sourceFile = parseSource(sourcePath);
      for (const identifier of collectIdentifiers(sourceFile)) {
        if (forbiddenV1ContractIdentifiers.has(identifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} uses V1 contract identifier ${identifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps the canonical V2 input contract free of current runner field names", () => {
    const source = readFileSync(v2PipelineInputPath, "utf8");
    const leakedFields = runnerBoundaryFieldNames.filter((fieldName) => source.includes(fieldName));

    expect(leakedFields).toEqual([]);
  });

  it("keeps analyzer-v2 fixtures data-only", () => {
    const files = collectFiles(analyzerV2FixtureRoot, () => true);
    const executableFiles = files.filter((filePath) => !fixtureDataExtensions.has(path.extname(filePath)));

    expect(executableFiles.map((filePath) => toPosix(path.relative(webRoot, filePath)))).toEqual([]);
  });

  it("requires report-generation provenance in the V2 report schema", () => {
    const schema = JSON.parse(readFileSync(reportResultV2SchemaPath, "utf8")) as {
      required?: string[];
      properties?: Record<string, { required?: string[] }>;
    };
    const reportGeneration = schema.properties?.reportGeneration;

    expect(schema.required).toContain("reportGeneration");
    expect(reportGeneration?.required).toEqual(expect.arrayContaining([
      "profileId",
      "profileVersion",
      "reportWriterVersion",
      "rendererVersion",
      "exportAdapterVersion",
      "sourceCommit",
    ]));
  });
});
