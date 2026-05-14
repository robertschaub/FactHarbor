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
const analyzerV2IndexPath = path.resolve(v2AnalyzerRoot, "index.ts");
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
const analyzerV2CacheGovernancePath = path.resolve(v2AnalyzerRoot, "gateway/cache-governance.ts");
const analyzerV2GatewayPolicyPath = path.resolve(v2AnalyzerRoot, "gateway/policy.ts");
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
  "index.ts",
  "orchestrator.ts",
  "pipeline-shell.ts",
  "runner-ingress.ts",
].map((fileName) => path.resolve(v2AnalyzerRoot, fileName));
const dispatchForbiddenProductPaths = [
  ...adapterForbiddenProductPaths,
  claimUnderstandingRuntimeStagePath,
];
const noDispatchRuntimePaths = [
  ...dispatchForbiddenProductPaths,
  claimUnderstandingDispatchFramePath,
  claimUnderstandingDispatchReadinessContractPath,
  claimUnderstandingRuntimeDispatchPath,
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
const forbiddenProviderSdkSpecifiers = [
  "ai",
  "openai",
  "@ai-sdk/",
  "@anthropic-ai/",
  "@google/generative-ai",
  "@mistralai/",
];

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

function hasExecutableStatusMutation(sourceFile: ts.SourceFile): boolean {
  let found = false;

  function visit(node: ts.Node): void {
    if (
      ts.isPropertyAssignment(node)
      && propertyNameText(node.name) === "status"
      && ts.isStringLiteral(node.initializer)
      && node.initializer.text === "executable"
    ) {
      found = true;
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
      found = true;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return found;
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

  it("keeps 6B.3c-0 no-dispatch runtime paths free of dispatch-capable imports", () => {
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

  it("keeps product execution paths from reaching dispatch-readiness or runtime-dispatch internals", () => {
    const violations: string[] = [];

    for (const sourcePath of dispatchForbiddenProductPaths) {
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

  it("keeps product execution paths without transitive reachability to dispatch-capable internals", () => {
    const forbiddenTransitiveTargets = new Set([
      claimUnderstandingModelAdapterPath,
      claimUnderstandingPromptLoaderPath,
      claimUnderstandingDispatchReadinessContractPath,
      claimUnderstandingRuntimeDispatchPath,
    ].map(toPosix));
    const violations: string[] = [];

    for (const sourcePath of dispatchForbiddenProductPaths) {
      const transitiveImports = collectTransitiveAnalyzerV2Imports(sourcePath);
      for (const importedPath of transitiveImports) {
        if (forbiddenTransitiveTargets.has(toPosix(importedPath))) {
          violations.push(`${toPosix(path.relative(webRoot, sourcePath))} transitively reaches ${toPosix(path.relative(webRoot, importedPath))}`);
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

  it("keeps the 6B.3c-3 runtime-dispatch owner contract free of dispatch side-effect imports", () => {
    const sourceFile = parseSource(claimUnderstandingRuntimeDispatchPath);
    const violations: string[] = [];

    for (const specifier of collectModuleSpecifiers(sourceFile)) {
      if (isV1AnalyzerImport(claimUnderstandingRuntimeDispatchPath, specifier)) {
        violations.push(`runtime dispatch imports V1 analyzer ${specifier}`);
      }
      if (isClaimUnderstandingModelAdapterImport(claimUnderstandingRuntimeDispatchPath, specifier)) {
        violations.push(`runtime dispatch imports model adapter ${specifier}`);
      }
      if (isClaimUnderstandingPromptLoaderImport(claimUnderstandingRuntimeDispatchPath, specifier)) {
        violations.push(`runtime dispatch imports prompt loader ${specifier}`);
      }
      if (isAnalyzerV2CacheGovernanceImport(claimUnderstandingRuntimeDispatchPath, specifier)) {
        violations.push(`runtime dispatch imports cache governance ${specifier}`);
      }
      if (isAnalyzerV2GatewayPolicyImport(claimUnderstandingRuntimeDispatchPath, specifier)) {
        violations.push(`runtime dispatch imports gateway policy ${specifier}`);
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

  it("keeps production source from constructing executable gateway task state", () => {
    const violations: string[] = [];

    for (const sourcePath of v2SourceFiles) {
      if (hasExecutableStatusMutation(parseSource(sourcePath))) {
        violations.push(`${toPosix(path.relative(webRoot, sourcePath))} constructs executable gateway task state`);
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
