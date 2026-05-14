import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const webRoot = process.cwd();
const srcRoot = path.resolve(webRoot, "src");
const appRoot = path.resolve(srcRoot, "app");
const componentsRoot = path.resolve(srcRoot, "components");
const v1AnalyzerRoot = path.resolve(srcRoot, "lib/analyzer");
const v2AnalyzerRoot = path.resolve(srcRoot, "lib/analyzer-v2");
const analyzerV2RuntimeRoot = path.resolve(srcRoot, "lib/analyzer-v2-runtime");
const analyzerV2IndexPath = path.resolve(v2AnalyzerRoot, "index.ts");
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
const analyzerV2RuntimeProviderContractPath = path.resolve(
  analyzerV2RuntimeRoot,
  "claim-understanding-provider-boundary.contract.ts",
);
const analyzerV2RuntimeProviderConfigContractPath = path.resolve(
  analyzerV2RuntimeRoot,
  "claim-understanding-provider-runtime-config.contract.ts",
);
const analyzerV2UnitTestRoot = path.resolve(webRoot, "test/unit/lib/analyzer-v2");
const promptRoot = path.resolve(webRoot, "prompts");
const analyzerV2FixtureRoot = path.resolve(webRoot, "test/fixtures/analyzer-v2");
const repoRoot = path.resolve(webRoot, "../..");
const v2AgentsPath = path.resolve(v2AnalyzerRoot, "AGENTS.md");
const canonicalGuardrailsPath = path.resolve(repoRoot, "Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md");
const reportResultV2SchemaPath = path.resolve(analyzerV2FixtureRoot, "schemas/report-result-v2.schema.json");

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
    new Set(["AnalyzerV2CacheDecision"]),
  ],
]);
const runtimeScaffoldOptionOwnerPaths = new Set([
  claimUnderstandingRuntimeStagePath,
  claimUnderstandingRuntimeDispatchPath,
].map(toPosix));
const runtimeScaffoldOptionTerms = [
  "claimUnderstandingRuntime",
  "directTextRuntimeDispatch",
  "providerBoundary",
];
const runtimeStageApprovedImports = new Map<string, Set<string>>([
  ["node:crypto", new Set(["createHash"])],
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
    new Set(["ClaimBoundaryV2RunContext"]),
  ],
  [
    "@/lib/analyzer-v2/gateway/policy",
    new Set(["canExecuteAnalyzerV2GatewayTask", "getAnalyzerV2GatewayTask"]),
  ],
  [
    "@/lib/analyzer-v2/gateway/types",
    new Set(["AnalyzerV2GatewayTask", "AnalyzerV2GatewayTaskStatus", "AnalyzerV2PolicyApproval"]),
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

  it("keeps analyzer-v2-runtime contracts free of execution side effects and scaffold options", () => {
    const violations: string[] = [];

    expect(analyzerV2RuntimeSourceFiles.map((filePath) => toPosix(path.relative(webRoot, filePath)))).toContain(
      "src/lib/analyzer-v2-runtime/claim-understanding-provider-boundary.contract.ts",
    );
    expect(analyzerV2RuntimeSourceFiles.map((filePath) => toPosix(path.relative(webRoot, filePath)))).toContain(
      "src/lib/analyzer-v2-runtime/claim-understanding-provider-runtime-config.contract.ts",
    );

    for (const sourcePath of analyzerV2RuntimeSourceFiles) {
      const sourceFile = parseSource(sourcePath);
      for (const specifier of collectModuleSpecifiers(sourceFile)) {
        if (isV1AnalyzerImport(sourcePath, specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports V1 analyzer ${specifier}`);
        }
        if (isProviderSdkImport(specifier)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports provider SDK ${specifier}`);
        }
        if (isCacheIoImport(specifier)) {
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
      for (const term of runtimeScaffoldOptionTerms) {
        if (content.includes(term)) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} references runtime scaffold option ${term}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps provider ownership contracts out of production callers until the next wiring gate", () => {
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
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} imports analyzer-v2-runtime contract ${specifier}`);
        }
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

  it("keeps production source from constructing executable gateway task state", () => {
    const violations: string[] = [];

    for (const sourcePath of v2SourceFiles) {
      for (const location of collectForbiddenExecutableStatusMutations(parseSource(sourcePath))) {
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
