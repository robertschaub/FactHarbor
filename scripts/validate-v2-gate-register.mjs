#!/usr/bin/env node
/**
 * validate-v2-gate-register.mjs
 *
 * Structural validator for Docs/AGENTS/V2_Gate_Register.json.
 * The register is an audit view only. It must never become a runtime
 * authority, approval source, or live-job gate.
 */

import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REGISTER_PATH = "Docs/AGENTS/V2_Gate_Register.json";
const GATEWAY_POLICY_PATH = "apps/web/src/lib/analyzer-v2/gateway/policy.ts";
const GATEWAY_TYPES_PATH = "apps/web/src/lib/analyzer-v2/gateway/types.ts";
const MODEL_POLICY_PATH = "apps/web/src/lib/analyzer-v2/gateway/model-policy-registry.ts";
const TASK_CONTRACT_TYPES_PATH = "apps/web/src/lib/analyzer-v2/evidence-lifecycle/task-contracts/types.ts";
const CLAIM_UNDERSTANDING_TYPES_PATH = "apps/web/src/lib/analyzer-v2/claim-understanding/types.ts";

const REGISTER_SCHEMA_VERSION = "v2-gate-register.v0";
const REGISTER_AUTHORITY = "audit_only";
const GATEWAY_STATUSES = new Set([
  "notImplemented",
  "blockedUntilPromptApproved",
  "executable",
]);
const LIVE_JOB_ELIGIBILITY = new Set(["blocked", "not_applicable"]);
const APPROVAL_SOURCE_BY_TOKEN = new Map([
  ["ANALYZER_V2_7L1_CAPTAIN_APPROVAL", "ANALYZER_V2_7L1_CAPTAIN_APPROVAL@2026-05-15T20:43:42.6482362Z"],
  ["MISSING_APPROVAL", "missing"],
  ["PENDING_APPROVAL", "pending"],
  ["null", "not_applicable"],
]);
const CACHE_POLICY_BY_SELECTOR = {
  claimUnderstandingCache: {
    policyId: "v2.semantic.claim-understanding",
    approvalSource: "pending",
  },
  queryPlanningCache: {
    policyId: "v2.semantic.evidence-query-planning",
    approvalSource: "ANALYZER_V2_7L1_CAPTAIN_APPROVAL@2026-05-15T20:43:42.6482362Z",
  },
  sourceAware: {
    policyId: "v2.semantic.source-aware",
    approvalSource: "pending",
  },
  base: {
    policyId: "v2.semantic.base",
    approvalSource: "pending",
  },
  none: {
    policyId: "not_applicable",
    approvalSource: "not_applicable",
  },
};

const REQUIRED_ENTRY_KEYS = [
  "id",
  "sliceId",
  "gateType",
  "taskId",
  "owner",
  "state",
  "status",
  "executionAuthoritySource",
  "registerGrantsExecution",
  "promptProfile",
  "promptSectionId",
  "outputSchemaVersion",
  "observedGatewayStatus",
  "gatewayPolicyStatus",
  "observedPromptApprovalSource",
  "promptApprovalId",
  "observedModelPolicyId",
  "observedModelApprovalSource",
  "modelApprovalId",
  "observedCachePolicyId",
  "observedCacheApprovalSource",
  "cacheApprovalId",
  "sourceOfTruthRefs",
  "sourcePackage",
  "approvalPointer",
  "implementationCommit",
  "allowedFiles",
  "blockedSurfaces",
  "blockedSurfaceFlags",
  "verifierCommands",
  "liveJobEligibility",
  "liveJobBlockReason",
  "lastVerifiedBy",
  "notes",
];
const ALLOWED_ENTRY_KEYS = new Set([
  ...REQUIRED_ENTRY_KEYS,
  "knownDrift",
]);
const REQUIRED_BLOCKED_SURFACE_FLAGS = [
  "productWiring",
  "publicExposure",
  "liveJobs",
  "cacheIo",
  "sourceReliability",
  "v1Reuse",
  "realByteParserConsumption",
];
const REPAIRED_QUERY_PLANNING_DRIFT_MARKERS = [
  "static_task_policy_symbolic_not_executable",
  "prompt_frontmatter_required_sections_lag",
];
const QUERY_PLANNING_CURRENT_SLICE_ID = "X7-S";
const QUERY_PLANNING_CURRENT_STATE =
  "implemented_hidden_product_internal_query_planning_execution";
const QUERY_PLANNING_X7S_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-17_V2_Slice_X7-S_Product_Internal_Query_Planning_Execution_Package.md";
const REQUIRED_QUERY_PLANNING_REFS = [
  "Docs/WIP/2026-05-15_V2_Slice_7L1_Query_Planning_Source_Approval_Package.md",
  "Docs/WIP/2026-05-17_V2_Slice_X3-B_Query_Planning_Prompt_Frontmatter_Text_Approval_Package.md",
  QUERY_PLANNING_X7S_SOURCE_PACKAGE,
];
const REQUIRED_QUERY_PLANNING_ALLOWED_FILES = [
  "apps/web/src/lib/analyzer-v2/orchestrator.ts",
  "apps/web/src/lib/analyzer-v2/run-context.ts",
  "apps/web/src/lib/analyzer-v2/execution-selection.ts",
  "apps/web/src/lib/internal-runner-queue.ts",
  "apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts/route.ts",
  "apps/web/src/lib/analyzer-v2-runtime/evidence-query-planning-provider-runtime-config.contract.ts",
  "apps/web/src/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory.ts",
  "apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink.ts",
];
const REQUIRED_QUERY_PLANNING_BLOCKED_SURFACES = [
  "source fetch execution",
  "search provider execution",
  "candidate provider network execution",
  "parser execution",
  "Source Reliability",
  "cache IO",
  "EvidenceItem generation",
  "EvidenceCorpus generation",
  "public API result",
  "UI/report/export",
  "live jobs",
  "ACS/direct URL execution",
  "V1 reuse or cleanup",
];
const REQUIRED_QUERY_PLANNING_NOTE_TOKENS = [
  "hidden product-internal direct-text Query Planning execution",
  "separate default-closed activation gate",
  "bounded admin-only internal artifacts",
  "Source/search/fetch/parser/SR/cache IO",
  "public API/UI/report/export exposure",
  "live jobs",
  "ACS/direct URL execution",
  "V1 reuse",
  "V1 cleanup",
  "audit-only",
];
const RESEARCH_ACQUISITION_CURRENT_SLICE_ID = "X7-W2";
const RESEARCH_ACQUISITION_CURRENT_STATE =
  "implemented_product_internal_candidate_provider_network_hidden_no_source_material";
const RESEARCH_ACQUISITION_CURRENT_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-17_V2_Slice_X7-W2_Product_Internal_Candidate_Provider_Network_Source_Package.md";
const RESEARCH_ACQUISITION_CURRENT_IMPLEMENTATION_COMMIT = null;
const RESEARCH_ACQUISITION_X7_W1C_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-17_V2_Slice_X7-W1C_Source_Acquisition_Path_Consolidation_And_Pre_IO_Fence_Package.md";
const RESEARCH_ACQUISITION_7N3B2_T1_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-17_V2_Slice_7N3B2-T1_Network_Attempt_Telemetry_Projection_Source_Package.md";
const RESEARCH_ACQUISITION_X7_W1B_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-17_V2_Slice_X7-W1B_Product_Internal_Closed_Candidate_Runtime_Loop_Source_Package.md";
const RESEARCH_ACQUISITION_X7_W1A_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-17_V2_Slice_X7-W1A_Product_Internal_Candidate_Runtime_Admission_Source_Package.md";
const RESEARCH_ACQUISITION_X7_V_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-17_V2_Slice_X7-V_Product_Internal_Source_Acquisition_Intake_Boundary_Source_Package.md";
const RESEARCH_ACQUISITION_C0_S1_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-C0-S1_P0_Parser_Worker_Admission_Source_Package.md";
const RESEARCH_ACQUISITION_C0_S2_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-C0-S2_Parser_Admission_Provenance_Source_Package.md";
const RESEARCH_ACQUISITION_C0_S3_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-C0-S3_Parser_Admission_Parsed_Material_Denial_Source_Package.md";
const REQUIRED_RESEARCH_ACQUISITION_REFS = [
  RESEARCH_ACQUISITION_CURRENT_SOURCE_PACKAGE,
  RESEARCH_ACQUISITION_7N3B2_T1_SOURCE_PACKAGE,
  RESEARCH_ACQUISITION_X7_W1C_SOURCE_PACKAGE,
  RESEARCH_ACQUISITION_X7_W1B_SOURCE_PACKAGE,
  RESEARCH_ACQUISITION_X7_W1A_SOURCE_PACKAGE,
  RESEARCH_ACQUISITION_X7_V_SOURCE_PACKAGE,
  "Docs/WIP/2026-05-16_V2_Slice_X7-F_Hidden_No_IO_Source_Acquisition_Execution_Gate_Source_Package.md",
  "Docs/WIP/2026-05-16_V2_Slice_X7-E_Hidden_Source_Acquisition_Composition_X6_Provenance_Gate_Source_Package.md",
  "Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B2_OCI_Parser_Isolation_Proof_Source_Package.md",
  "Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B3_Provisioned_OCI_Deployment_Candidate_Proof_Package.md",
  "Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-C0_Parser_Worker_Architecture_And_Provisional_Isolation.md",
  RESEARCH_ACQUISITION_C0_S1_SOURCE_PACKAGE,
  RESEARCH_ACQUISITION_C0_S2_SOURCE_PACKAGE,
  RESEARCH_ACQUISITION_C0_S3_SOURCE_PACKAGE,
];
const REQUIRED_RESEARCH_ACQUISITION_ALLOWED_FILES = [
  "apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.ts",
  "apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.ts",
  "apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.ts",
  "apps/web/src/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.ts",
  "apps/web/src/lib/analyzer-v2/orchestrator.ts",
  "apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts",
  "apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.test.ts",
  "apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.test.ts",
  "apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.test.ts",
  "apps/web/test/unit/lib/analyzer-v2/orchestrator.test.ts",
  "apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts",
  "Docs/AGENTS/V2_Gate_Register.json",
  "scripts/validate-v2-gate-register.mjs",
  "Docs/STATUS/Current_Status.md",
  "Docs/STATUS/Backlog.md",
];
const FORBIDDEN_RESEARCH_ACQUISITION_ALLOWED_FILE_TOKENS = [
  "**",
  "*",
  "source-acquisition-network-",
  "source-acquisition-content-",
  "hidden-direct-text-candidate-acquisition-harness",
  "hidden-direct-text-source-acquisition-readiness-composition",
  "hidden-direct-text-source-acquisition-execution-gate",
  "source-acquisition-provider-network-readiness",
  "source-material",
  "evidence-corpus",
  "pre-io-fence",
  "structural-executor.ts",
  "execution-contract.ts",
];
const REQUIRED_RESEARCH_ACQUISITION_BLOCKED_SURFACES = [
  "live provider-network jobs",
  "provider endpoints beyond Wikimedia Core REST Search page search",
  "credentialed or paid provider execution",
  "content dereference",
  "source-material population",
  "extraction input creation",
  "EvidenceCorpus generation",
  "parsed-material creation",
  "parser-output creation",
  "real fetched-byte parser consumption",
  "parser-worker execution",
  "2D-C parser source implementation",
  "runner/API/UI/report/export public wiring beyond hidden internal artifact inspection",
  "cache IO",
  "Source Reliability integration",
  "evidence/report/verdict/warning/confidence generation",
  "ACS/direct URL execution",
  "X6/X7-D forward-path reuse",
  "V1 reuse or cleanup",
  "live jobs",
];
const REQUIRED_RESEARCH_ACQUISITION_NOTE_TOKENS = [
  "X7-W2",
  "implemented_product_internal_candidate_provider_network_hidden_no_source_material",
  "latest product-route Source Acquisition proof",
  "wikimedia_core",
  "ep_wikimedia_core_page_search",
  "api.wikimedia.org",
  "/core/v1/wikipedia/en/search/page",
  "q-only",
  "no limit parameter",
  "not_required_for_approved_network_provider",
  "redirect policy exactly deny",
  "fixedDollarCost 0",
  "cost/timing/outcome/byte telemetry",
  "bounded admin-only artifacts",
  "X7-W1C",
  "pre-IO fence context",
  "X7-W1B",
  "closed-loop prerequisite",
  "X7-W1A",
  "admission_ready_no_runtime_execution",
  "X7-V",
  "intake_ready_not_executable",
  "X7-F",
  "gate_closed_no_io",
  "X6/X7-D/X7-E/X7-F/X7-G1/X7-G2",
  "regression/historical context",
  "parser_isolation_unavailable",
  "B3",
  "C0-S1",
  "C0-S2",
  "C0-S3",
  "no parsed material",
  "P0",
  "2D-C remains blocked",
  "Source material",
  "content dereference",
  "EvidenceCorpus",
  "live jobs remain blocked",
  "Wikimedia Core REST Search",
  "time-bound hidden proof dependency",
  "audit-only",
];

function makeDriftCollector() {
  const drifts = [];
  return {
    drifts,
    drift: (where, message) => drifts.push(`DRIFT: ${where} - ${message}`),
  };
}

async function readRepoFile(relativePath) {
  return readFile(resolve(REPO_ROOT, relativePath), "utf8");
}

function unwrapExpression(expression) {
  let current = expression;
  while (
    ts.isAsExpression(current)
    || ts.isSatisfiesExpression(current)
    || ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function propertyNameText(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text;
  }
  return null;
}

function findProperty(objectLiteral, propertyName) {
  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }
    if (propertyNameText(property.name) === propertyName) {
      return property;
    }
  }
  return null;
}

function stringFromExpression(expression, constants) {
  const current = unwrapExpression(expression);
  if (ts.isStringLiteral(current)) {
    return current.text;
  }
  if (ts.isIdentifier(current)) {
    return constants.get(current.text) ?? null;
  }
  if (
    ts.isPropertyAccessExpression(current)
    && ts.isIdentifier(current.expression)
    && ts.isIdentifier(current.name)
  ) {
    return constants.get(`${current.expression.text}.${current.name.text}`) ?? null;
  }
  return null;
}

function stringProperty(objectLiteral, propertyName, constants = new Map()) {
  const property = findProperty(objectLiteral, propertyName);
  if (!property) {
    return null;
  }
  return stringFromExpression(property.initializer, constants);
}

function booleanProperty(objectLiteral, propertyName) {
  const property = findProperty(objectLiteral, propertyName);
  if (!property) {
    return false;
  }
  const value = unwrapExpression(property.initializer);
  return value.kind === ts.SyntaxKind.TrueKeyword;
}

function initializerToken(objectLiteral, propertyName) {
  const property = findProperty(objectLiteral, propertyName);
  if (!property) {
    return null;
  }
  const initializer = unwrapExpression(property.initializer);
  if (ts.isIdentifier(initializer)) {
    return initializer.text;
  }
  if (initializer.kind === ts.SyntaxKind.NullKeyword) {
    return "null";
  }
  return null;
}

function sourceFile(relativePath, source) {
  return ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function findVariableArray(source, variableName, relativePath) {
  const file = sourceFile(relativePath, source);
  let found = null;
  function visit(node) {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text === variableName
      && node.initializer
    ) {
      const initializer = unwrapExpression(node.initializer);
      if (ts.isArrayLiteralExpression(initializer)) {
        found = initializer;
      }
    }
    if (!found) {
      ts.forEachChild(node, visit);
    }
  }
  visit(file);
  return found;
}

function findObjectLiteralFromCallOrObject(element) {
  const expression = unwrapExpression(element);
  if (
    ts.isCallExpression(expression)
    && ts.isIdentifier(expression.expression)
    && expression.expression.text === "task"
    && expression.arguments.length === 1
    && ts.isObjectLiteralExpression(expression.arguments[0])
  ) {
    return expression.arguments[0];
  }
  if (ts.isObjectLiteralExpression(expression)) {
    return expression;
  }
  return null;
}

function extractStringConstants(source, relativePath) {
  const constants = new Map();
  const file = sourceFile(relativePath, source);

  function visit(node) {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.initializer
    ) {
      const initializer = unwrapExpression(node.initializer);
      if (ts.isStringLiteral(initializer)) {
        constants.set(node.name.text, initializer.text);
      }
      if (ts.isIdentifier(initializer) && constants.has(initializer.text)) {
        constants.set(node.name.text, constants.get(initializer.text));
      }
      if (ts.isObjectLiteralExpression(initializer)) {
        for (const property of initializer.properties) {
          if (!ts.isPropertyAssignment(property)) {
            continue;
          }
          const key = propertyNameText(property.name);
          const value = unwrapExpression(property.initializer);
          if (key && ts.isStringLiteral(value)) {
            constants.set(`${node.name.text}.${key}`, value.text);
          }
          if (key && ts.isIdentifier(value) && constants.has(value.text)) {
            constants.set(`${node.name.text}.${key}`, constants.get(value.text));
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);

  const claimUnderstandingResult = constants.get("CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION");
  if (claimUnderstandingResult) {
    constants.set("CLAIM_UNDERSTANDING_GATEWAY_OUTPUT_SCHEMA_VERSION", claimUnderstandingResult);
  }
  return constants;
}

function extractGatewayTaskIds(typesSource) {
  const match = typesSource.match(/export type AnalyzerV2GatewayTaskId =([\s\S]*?);/);
  if (!match) {
    throw new Error("AnalyzerV2GatewayTaskId union not found");
  }
  return [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
}

function parseModelPolicies(modelPolicySource) {
  const array = findVariableArray(
    modelPolicySource,
    "ANALYZER_V2_TASK_MODEL_POLICIES",
    MODEL_POLICY_PATH,
  );
  if (!array) {
    throw new Error("ANALYZER_V2_TASK_MODEL_POLICIES array not found");
  }
  const byTaskId = new Map();
  for (const element of array.elements) {
    const objectLiteral = unwrapExpression(element);
    if (!ts.isObjectLiteralExpression(objectLiteral)) {
      continue;
    }
    const gatewayTaskId = stringProperty(objectLiteral, "gatewayTaskId");
    const policyId = stringProperty(objectLiteral, "policyId");
    const approvalToken = initializerToken(objectLiteral, "approval") ?? "MISSING_APPROVAL";
    if (gatewayTaskId && policyId) {
      byTaskId.set(gatewayTaskId, {
        policyId,
        approvalSource: APPROVAL_SOURCE_BY_TOKEN.get(approvalToken) ?? approvalToken,
      });
    }
  }
  return byTaskId;
}

function cachePolicyForTask(objectLiteral) {
  if (booleanProperty(objectLiteral, "claimUnderstandingCache")) {
    return CACHE_POLICY_BY_SELECTOR.claimUnderstandingCache;
  }
  if (booleanProperty(objectLiteral, "queryPlanningCache")) {
    return CACHE_POLICY_BY_SELECTOR.queryPlanningCache;
  }
  if (booleanProperty(objectLiteral, "sourceAware")) {
    return CACHE_POLICY_BY_SELECTOR.sourceAware;
  }
  return CACHE_POLICY_BY_SELECTOR.base;
}

function promptApprovalSourceForTask(objectLiteral) {
  const token = initializerToken(objectLiteral, "promptApproval") ?? "MISSING_APPROVAL";
  return APPROVAL_SOURCE_BY_TOKEN.get(token) ?? token;
}

function approvalIdFromSource(source) {
  if (typeof source !== "string") {
    return null;
  }
  if (source.startsWith("ANALYZER_V2_7L1_CAPTAIN_APPROVAL@")) {
    return "ANALYZER_V2_7L1_CAPTAIN_APPROVAL";
  }
  return source;
}

function parseGatewayTasks(params) {
  const {
    policySource,
    gatewayTaskIds,
    modelPolicies,
    constants,
  } = params;
  const array = findVariableArray(policySource, "ANALYZER_V2_GATEWAY_TASKS", GATEWAY_POLICY_PATH);
  if (!array) {
    throw new Error("ANALYZER_V2_GATEWAY_TASKS array not found");
  }

  const tasks = [];
  for (const element of array.elements) {
    const objectLiteral = findObjectLiteralFromCallOrObject(element);
    if (!objectLiteral) {
      throw new Error("Unsupported ANALYZER_V2_GATEWAY_TASKS element shape");
    }
    const id = stringProperty(objectLiteral, "id", constants);
    if (!id) {
      throw new Error("Gateway task without literal/resolved id");
    }
    const modelPolicy = modelPolicies.get(id) ?? {
      policyId: "unregistered",
      approvalSource: "missing",
    };
    const hasPromptPolicy = findProperty(objectLiteral, "promptPolicy") === null
      || initializerToken(objectLiteral, "promptPolicy") !== "null";
    const cachePolicy = hasPromptPolicy ? cachePolicyForTask(objectLiteral) : CACHE_POLICY_BY_SELECTOR.none;

    tasks.push({
      id,
      knownInTypes: gatewayTaskIds.includes(id),
      owner: stringProperty(objectLiteral, "owner", constants),
      status: stringProperty(objectLiteral, "status", constants) ?? "blockedUntilPromptApproved",
      promptProfile: hasPromptPolicy ? "claimboundary-v2" : null,
      promptSectionId: hasPromptPolicy ? stringProperty(objectLiteral, "promptSectionId", constants) : null,
      outputSchemaVersion: stringProperty(objectLiteral, "outputSchemaVersion", constants),
      promptApprovalSource: hasPromptPolicy ? promptApprovalSourceForTask(objectLiteral) : "not_applicable",
      promptApprovalId: hasPromptPolicy ? approvalIdFromSource(promptApprovalSourceForTask(objectLiteral)) : "not_applicable",
      modelPolicyId: hasPromptPolicy ? modelPolicy.policyId : "not_applicable",
      modelApprovalSource: hasPromptPolicy ? modelPolicy.approvalSource : "not_applicable",
      modelApprovalId: hasPromptPolicy ? approvalIdFromSource(modelPolicy.approvalSource) : "not_applicable",
      cachePolicyId: cachePolicy.policyId,
      cacheApprovalSource: cachePolicy.approvalSource,
      cacheApprovalId: approvalIdFromSource(cachePolicy.approvalSource),
    });
  }
  return tasks;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonBlankString(value) {
  return typeof value === "string" && value.trim() === value && value.length > 0;
}

function isNullableString(value) {
  return value === null || isNonBlankString(value);
}

function isStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isNonBlankString);
}

function validateBlockedSurfaceFlags(flags, where, drift) {
  if (!isObject(flags)) {
    drift(where, "blockedSurfaceFlags must be an object");
    return;
  }
  const keys = Object.keys(flags).sort();
  if (keys.join("|") !== [...REQUIRED_BLOCKED_SURFACE_FLAGS].sort().join("|")) {
    drift(where, `blockedSurfaceFlags keys must be exactly ${REQUIRED_BLOCKED_SURFACE_FLAGS.join(", ")}`);
  }
  for (const key of REQUIRED_BLOCKED_SURFACE_FLAGS) {
    if (typeof flags[key] !== "boolean") {
      drift(where, `blockedSurfaceFlags.${key} must be boolean`);
    }
  }
}

function validateEntryShape(entry, index, drift) {
  const where = `${REGISTER_PATH}:entries[${index}]`;
  if (!isObject(entry)) {
    drift(where, "entry must be an object");
    return;
  }
  for (const key of Object.keys(entry)) {
    if (!ALLOWED_ENTRY_KEYS.has(key)) {
      drift(where, `unknown key ${key}`);
    }
  }
  for (const key of REQUIRED_ENTRY_KEYS) {
    if (!(key in entry)) {
      drift(where, `missing required key ${key}`);
    }
  }
  for (const key of [
    "id",
    "sliceId",
    "gateType",
    "taskId",
    "owner",
    "state",
    "status",
    "executionAuthoritySource",
    "outputSchemaVersion",
    "observedGatewayStatus",
    "gatewayPolicyStatus",
    "observedPromptApprovalSource",
    "promptApprovalId",
    "observedModelPolicyId",
    "observedModelApprovalSource",
    "modelApprovalId",
    "observedCachePolicyId",
    "observedCacheApprovalSource",
    "cacheApprovalId",
    "sourcePackage",
    "approvalPointer",
    "liveJobBlockReason",
    "lastVerifiedBy",
    "notes",
  ]) {
    if (!isNonBlankString(entry[key])) {
      drift(where, `${key} must be a non-empty string`);
    }
  }
  if (entry.gateType !== "gateway_task") {
    drift(where, "V0 only accepts gateType gateway_task");
  }
  if (entry.registerGrantsExecution !== false) {
    drift(where, "registerGrantsExecution must be false");
  }
  if (entry.status !== entry.state) {
    drift(where, "status must mirror state");
  }
  if (entry.gatewayPolicyStatus !== entry.observedGatewayStatus) {
    drift(where, "gatewayPolicyStatus must mirror observedGatewayStatus");
  }
  if (!isNullableString(entry.promptProfile)) {
    drift(where, "promptProfile must be a string or null");
  }
  if (!isNullableString(entry.promptSectionId)) {
    drift(where, "promptSectionId must be a string or null");
  }
  if (!isNullableString(entry.implementationCommit)) {
    drift(where, "implementationCommit must be a string or null");
  }
  if (isNonBlankString(entry.implementationCommit) && !/^[0-9a-f]{7,40}$/.test(entry.implementationCommit)) {
    drift(where, "implementationCommit must be a git SHA or null");
  }
  if (!GATEWAY_STATUSES.has(entry.observedGatewayStatus)) {
    drift(where, `observedGatewayStatus ${entry.observedGatewayStatus} is not a known gateway status`);
  }
  for (const key of ["allowedFiles", "blockedSurfaces", "sourceOfTruthRefs", "verifierCommands"]) {
    if (!isStringArray(entry[key])) {
      drift(where, `${key} must be a non-empty array of strings`);
    }
  }
  validateBlockedSurfaceFlags(entry.blockedSurfaceFlags, where, drift);
  if (!LIVE_JOB_ELIGIBILITY.has(entry.liveJobEligibility)) {
    drift(where, "liveJobEligibility must be blocked or not_applicable in V0");
  }
  if (entry.liveJobEligibility !== "blocked") {
    drift(where, "V0 must not mark any gate live-job eligible");
  }
  if (entry.knownDrift !== undefined && !isStringArray(entry.knownDrift)) {
    drift(where, "knownDrift must be a non-empty string array when present");
  }
}

function validateRegisterRoot(register, drift) {
  if (!isObject(register)) {
    drift(REGISTER_PATH, "register root must be an object");
    return false;
  }
  const allowedTopLevelKeys = new Set([
    "schemaVersion",
    "lastUpdated",
    "authority",
    "canApproveExecution",
    "consumedByRuntime",
    "notes",
    "entries",
  ]);
  for (const key of Object.keys(register)) {
    if (!allowedTopLevelKeys.has(key)) {
      drift(REGISTER_PATH, `unknown top-level key ${key}`);
    }
  }
  if (register.schemaVersion !== REGISTER_SCHEMA_VERSION) {
    drift(REGISTER_PATH, `schemaVersion must be ${REGISTER_SCHEMA_VERSION}`);
  }
  if (register.authority !== REGISTER_AUTHORITY) {
    drift(REGISTER_PATH, `authority must be ${REGISTER_AUTHORITY}`);
  }
  if (register.canApproveExecution !== false) {
    drift(REGISTER_PATH, "canApproveExecution must be false");
  }
  if (register.consumedByRuntime !== false) {
    drift(REGISTER_PATH, "consumedByRuntime must be false");
  }
  if (!isNonBlankString(register.lastUpdated)) {
    drift(REGISTER_PATH, "lastUpdated must be a non-empty string");
  }
  if (!isStringArray(register.notes)) {
    drift(REGISTER_PATH, "notes must be a non-empty array of strings");
  }
  if (!Array.isArray(register.entries)) {
    drift(REGISTER_PATH, "entries must be an array");
    return false;
  }
  return true;
}

function compareEntryToGateway(entry, gatewayTask, index, drift) {
  const where = `${REGISTER_PATH}:entries[${index}]`;
  const comparisons = [
    ["owner", gatewayTask.owner],
    ["promptProfile", gatewayTask.promptProfile],
    ["promptSectionId", gatewayTask.promptSectionId],
    ["outputSchemaVersion", gatewayTask.outputSchemaVersion],
    ["observedGatewayStatus", gatewayTask.status],
    ["gatewayPolicyStatus", gatewayTask.status],
    ["observedPromptApprovalSource", gatewayTask.promptApprovalSource],
    ["promptApprovalId", gatewayTask.promptApprovalId],
    ["observedModelPolicyId", gatewayTask.modelPolicyId],
    ["observedModelApprovalSource", gatewayTask.modelApprovalSource],
    ["modelApprovalId", gatewayTask.modelApprovalId],
    ["observedCachePolicyId", gatewayTask.cachePolicyId],
    ["observedCacheApprovalSource", gatewayTask.cacheApprovalSource],
    ["cacheApprovalId", gatewayTask.cacheApprovalId],
  ];
  for (const [field, expected] of comparisons) {
    if (entry[field] !== expected) {
      drift(where, `${field} ${entry[field]} does not match source value ${expected}`);
    }
  }
}

function validateRegisterAgainstGateway(register, gatewayTasks, gatewayTaskIds, drift) {
  const taskById = new Map(gatewayTasks.map((task) => [task.id, task]));
  const entriesByTaskId = new Map();

  for (const task of gatewayTasks) {
    if (!task.knownInTypes) {
      drift(GATEWAY_POLICY_PATH, `gateway task ${task.id} is not declared in AnalyzerV2GatewayTaskId`);
    }
  }

  register.entries.forEach((entry, index) => {
    if (!isObject(entry) || !isNonBlankString(entry.taskId)) {
      return;
    }
    if (entriesByTaskId.has(entry.taskId)) {
      drift(`${REGISTER_PATH}:entries[${index}]`, `duplicate taskId ${entry.taskId}`);
      return;
    }
    entriesByTaskId.set(entry.taskId, { entry, index });

    const gatewayTask = taskById.get(entry.taskId);
    if (!gatewayTask) {
      drift(`${REGISTER_PATH}:entries[${index}]`, `taskId ${entry.taskId} is not in ANALYZER_V2_GATEWAY_TASKS`);
      return;
    }
    compareEntryToGateway(entry, gatewayTask, index, drift);
  });

  for (const gatewayTaskId of gatewayTaskIds) {
    if (!entriesByTaskId.has(gatewayTaskId)) {
      drift(REGISTER_PATH, `gateway task ${gatewayTaskId} is missing from the register`);
    }
  }

  for (const task of gatewayTasks) {
    if (task.status !== "executable") {
      continue;
    }
    const found = entriesByTaskId.get(task.id);
    if (!found) {
      drift(REGISTER_PATH, `executable gateway task ${task.id} is missing from the register`);
      continue;
    }
    if (found.entry.observedGatewayStatus !== "executable") {
      drift(REGISTER_PATH, `executable gateway task ${task.id} is not mirrored as executable`);
    }
  }

  for (const [taskId, { entry, index }] of entriesByTaskId.entries()) {
    const task = taskById.get(taskId);
    if (entry.observedGatewayStatus === "executable" && task?.status !== "executable") {
      drift(`${REGISTER_PATH}:entries[${index}]`, "row claims executable gateway status for a non-executable task");
    }
  }

  const queryPlanning = entriesByTaskId.get("evidence_query_planning")?.entry;
  if (queryPlanning?.observedGatewayStatus === "executable") {
    const driftMarkers = Array.isArray(queryPlanning.knownDrift) ? queryPlanning.knownDrift : [];
    for (const marker of REPAIRED_QUERY_PLANNING_DRIFT_MARKERS) {
      if (driftMarkers.includes(marker)) {
        drift(
          `${REGISTER_PATH}:evidence_query_planning`,
          `known drift marker ${marker} was repaired by X3-A and must not remain in the register`,
        );
      }
    }
  }
  validateQueryPlanningAuditState(queryPlanning, drift);

  const researchAcquisition = entriesByTaskId.get("research_acquisition")?.entry;
  validateResearchAcquisitionAuditState(researchAcquisition, drift);
}

function requireArrayIncludes(value, expected, where, field, drift) {
  if (!Array.isArray(value) || !value.includes(expected)) {
    drift(where, `${field} must include ${expected}`);
  }
}

function requireTextIncludes(value, token, where, field, drift) {
  if (typeof value !== "string" || !value.includes(token)) {
    drift(where, `${field} must mention ${token}`);
  }
}

function validateQueryPlanningAuditState(entry, drift) {
  const where = `${REGISTER_PATH}:evidence_query_planning`;
  if (!entry) {
    drift(where, "evidence_query_planning row is required");
    return;
  }

  if (entry.sliceId !== QUERY_PLANNING_CURRENT_SLICE_ID) {
    drift(where, `sliceId must be ${QUERY_PLANNING_CURRENT_SLICE_ID}`);
  }
  if (entry.state !== QUERY_PLANNING_CURRENT_STATE) {
    drift(where, `state must be ${QUERY_PLANNING_CURRENT_STATE}`);
  }
  if (entry.status !== QUERY_PLANNING_CURRENT_STATE) {
    drift(where, `status must be ${QUERY_PLANNING_CURRENT_STATE}`);
  }
  if (entry.sourcePackage !== QUERY_PLANNING_X7S_SOURCE_PACKAGE) {
    drift(where, `sourcePackage must be ${QUERY_PLANNING_X7S_SOURCE_PACKAGE}`);
  }
  if (entry.liveJobEligibility !== "blocked") {
    drift(where, "liveJobEligibility must remain blocked");
  }

  for (const ref of REQUIRED_QUERY_PLANNING_REFS) {
    requireArrayIncludes(entry.sourceOfTruthRefs, ref, where, "sourceOfTruthRefs", drift);
  }
  for (const allowedFile of REQUIRED_QUERY_PLANNING_ALLOWED_FILES) {
    requireArrayIncludes(entry.allowedFiles, allowedFile, where, "allowedFiles", drift);
  }
  for (const blockedSurface of REQUIRED_QUERY_PLANNING_BLOCKED_SURFACES) {
    requireArrayIncludes(entry.blockedSurfaces, blockedSurface, where, "blockedSurfaces", drift);
  }
  for (const flag of [
    "productWiring",
    "publicExposure",
    "liveJobs",
    "cacheIo",
    "sourceReliability",
    "v1Reuse",
    "realByteParserConsumption",
  ]) {
    if (entry.blockedSurfaceFlags?.[flag] !== true) {
      drift(where, `blockedSurfaceFlags.${flag} must remain true for X7-S audit state`);
    }
  }
  for (const token of REQUIRED_QUERY_PLANNING_NOTE_TOKENS) {
    requireTextIncludes(entry.notes, token, where, "notes", drift);
  }
  requireTextIncludes(entry.approvalPointer, "Captain-approved X7-S", where, "approvalPointer", drift);
  requireTextIncludes(entry.liveJobBlockReason, "no live-smoke gate", where, "liveJobBlockReason", drift);
}

function validateResearchAcquisitionAuditState(entry, drift) {
  const where = `${REGISTER_PATH}:research_acquisition`;
  if (!entry) {
    drift(where, "research_acquisition row is required");
    return;
  }

  if (entry.sliceId !== RESEARCH_ACQUISITION_CURRENT_SLICE_ID) {
    drift(where, `sliceId must be ${RESEARCH_ACQUISITION_CURRENT_SLICE_ID}`);
  }
  if (entry.state !== RESEARCH_ACQUISITION_CURRENT_STATE) {
    drift(where, `state must be ${RESEARCH_ACQUISITION_CURRENT_STATE}`);
  }
  if (entry.status !== RESEARCH_ACQUISITION_CURRENT_STATE) {
    drift(where, `status must be ${RESEARCH_ACQUISITION_CURRENT_STATE}`);
  }
  if (entry.sourcePackage !== RESEARCH_ACQUISITION_CURRENT_SOURCE_PACKAGE) {
    drift(where, `sourcePackage must be ${RESEARCH_ACQUISITION_CURRENT_SOURCE_PACKAGE}`);
  }
  if (entry.implementationCommit !== RESEARCH_ACQUISITION_CURRENT_IMPLEMENTATION_COMMIT) {
    drift(where, `implementationCommit must be ${RESEARCH_ACQUISITION_CURRENT_IMPLEMENTATION_COMMIT}`);
  }
  requireTextIncludes(entry.approvalPointer, "X7-W2", where, "approvalPointer", drift);
  requireTextIncludes(entry.approvalPointer, "product-internal hidden candidate-provider network", where, "approvalPointer", drift);
  requireTextIncludes(entry.approvalPointer, "Wikimedia Core REST Search", where, "approvalPointer", drift);
  requireTextIncludes(entry.approvalPointer, "no live jobs", where, "approvalPointer", drift);

  for (const requiredRef of REQUIRED_RESEARCH_ACQUISITION_REFS) {
    requireArrayIncludes(entry.sourceOfTruthRefs, requiredRef, where, "sourceOfTruthRefs", drift);
  }
  for (const allowedFile of REQUIRED_RESEARCH_ACQUISITION_ALLOWED_FILES) {
    requireArrayIncludes(entry.allowedFiles, allowedFile, where, "allowedFiles", drift);
  }
  for (const allowedFile of Array.isArray(entry.allowedFiles) ? entry.allowedFiles : []) {
    for (const token of FORBIDDEN_RESEARCH_ACQUISITION_ALLOWED_FILE_TOKENS) {
      if (allowedFile.includes(token)) {
        drift(where, `allowedFiles must not retain broad or executable source-acquisition path ${allowedFile}`);
      }
    }
  }
  for (const blockedSurface of REQUIRED_RESEARCH_ACQUISITION_BLOCKED_SURFACES) {
    requireArrayIncludes(entry.blockedSurfaces, blockedSurface, where, "blockedSurfaces", drift);
  }
  for (const noteToken of REQUIRED_RESEARCH_ACQUISITION_NOTE_TOKENS) {
    requireTextIncludes(entry.notes, noteToken, where, "notes", drift);
  }
  requireTextIncludes(entry.liveJobBlockReason, "X7-W2", where, "liveJobBlockReason", drift);
  requireTextIncludes(entry.liveJobBlockReason, "live jobs", where, "liveJobBlockReason", drift);
  requireTextIncludes(entry.liveJobBlockReason, "Wikimedia Core REST Search", where, "liveJobBlockReason", drift);
  requireTextIncludes(entry.liveJobBlockReason, "research_acquisition gateway task remains notImplemented", where, "liveJobBlockReason", drift);
}

function validateRegister(register, context) {
  const { drifts, drift } = makeDriftCollector();
  if (validateRegisterRoot(register, drift)) {
    register.entries.forEach((entry, index) => validateEntryShape(entry, index, drift));
    validateRegisterAgainstGateway(register, context.gatewayTasks, context.gatewayTaskIds, drift);
  }
  return drifts;
}

async function loadValidationContext() {
  const [
    registerRaw,
    policySource,
    gatewayTypesSource,
    modelPolicySource,
    taskContractTypesSource,
    claimUnderstandingTypesSource,
  ] = await Promise.all([
    readRepoFile(REGISTER_PATH),
    readRepoFile(GATEWAY_POLICY_PATH),
    readRepoFile(GATEWAY_TYPES_PATH),
    readRepoFile(MODEL_POLICY_PATH),
    readRepoFile(TASK_CONTRACT_TYPES_PATH),
    readRepoFile(CLAIM_UNDERSTANDING_TYPES_PATH),
  ]);
  const constants = new Map([
    ...extractStringConstants(taskContractTypesSource, TASK_CONTRACT_TYPES_PATH),
    ...extractStringConstants(claimUnderstandingTypesSource, CLAIM_UNDERSTANDING_TYPES_PATH),
  ]);
  const gatewayTaskIds = extractGatewayTaskIds(gatewayTypesSource);
  const modelPolicies = parseModelPolicies(modelPolicySource);
  return {
    register: JSON.parse(registerRaw),
    gatewayTaskIds,
    gatewayTasks: parseGatewayTasks({
      policySource,
      gatewayTaskIds,
      modelPolicies,
      constants,
    }),
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectMutationFails(name, baseRegister, context, mutate) {
  const candidate = clone(baseRegister);
  mutate(candidate);
  const drifts = validateRegister(candidate, context);
  if (drifts.length === 0) {
    throw new Error(`self-test mutation did not fail: ${name}`);
  }
}

async function runSelfTest(context) {
  const base = context.register;
  const mutations = [
    [
      "reintroduced prompt metadata drift marker",
      (candidate) => {
        candidate.entries.find((entry) => entry.taskId === "evidence_query_planning").knownDrift = [
          "prompt_frontmatter_required_sections_lag",
        ];
      },
    ],
    [
      "repaired static policy drift marker retained",
      (candidate) => {
        candidate.entries.find((entry) => entry.taskId === "evidence_query_planning").knownDrift = [
          "static_task_policy_symbolic_not_executable",
          "prompt_frontmatter_required_sections_lag",
        ];
      },
    ],
    [
      "missing executable row",
      (candidate) => {
        candidate.entries = candidate.entries.filter((entry) => entry.taskId !== "evidence_query_planning");
      },
    ],
    [
      "duplicate row",
      (candidate) => {
        candidate.entries.push(clone(candidate.entries[0]));
      },
    ],
    [
      "wrong prompt section",
      (candidate) => {
        candidate.entries.find((entry) => entry.taskId === "evidence_query_planning").promptSectionId = "WRONG";
      },
    ],
    [
      "wrong model approval",
      (candidate) => {
        candidate.entries.find((entry) => entry.taskId === "evidence_query_planning").observedModelApprovalSource = "missing";
      },
    ],
    [
      "wrong model approval id",
      (candidate) => {
        candidate.entries.find((entry) => entry.taskId === "evidence_query_planning").modelApprovalId = "missing";
      },
    ],
    [
      "wrong cache approval",
      (candidate) => {
        candidate.entries.find((entry) => entry.taskId === "evidence_query_planning").observedCacheApprovalSource = "pending";
      },
    ],
    [
      "wrong gateway policy status alias",
      (candidate) => {
        candidate.entries.find((entry) => entry.taskId === "evidence_query_planning").gatewayPolicyStatus = "blockedUntilPromptApproved";
      },
    ],
    [
      "live jobs allowed",
      (candidate) => {
        candidate.entries.find((entry) => entry.taskId === "evidence_query_planning").liveJobEligibility = "allowed";
      },
    ],
    [
      "unknown schema version",
      (candidate) => {
        candidate.schemaVersion = "wrong";
      },
    ],
    [
      "register grants execution",
      (candidate) => {
        candidate.entries.find((entry) => entry.taskId === "evidence_query_planning").registerGrantsExecution = true;
      },
    ],
    [
      "query planning drifts from X7-S",
      (candidate) => {
        candidate.entries.find((entry) => entry.taskId === "evidence_query_planning").sourcePackage =
          "Docs/WIP/2026-05-15_V2_Slice_7L1_Query_Planning_Source_Approval_Package.md";
      },
    ],
    [
      "query planning drops X7-S package ref",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "evidence_query_planning");
        row.sourceOfTruthRefs = row.sourceOfTruthRefs.filter((ref) => ref !== QUERY_PLANNING_X7S_SOURCE_PACKAGE);
      },
    ],
    [
      "query planning drops hidden artifact route",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "evidence_query_planning");
        row.allowedFiles = row.allowedFiles.filter((file) =>
          file !== "apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-runtime-artifacts/route.ts"
        );
      },
    ],
    [
      "query planning unblocks cache IO",
      (candidate) => {
        candidate.entries.find((entry) => entry.taskId === "evidence_query_planning").blockedSurfaceFlags.cacheIo = false;
      },
    ],
    [
      "query planning drops default-closed note",
      (candidate) => {
        candidate.entries.find((entry) => entry.taskId === "evidence_query_planning").notes =
          "X7-S records bounded admin-only internal artifacts.";
      },
    ],
    [
      "research acquisition drifts from X7-W2",
      (candidate) => {
        candidate.entries.find((entry) => entry.taskId === "research_acquisition").sourcePackage =
          RESEARCH_ACQUISITION_X7_V_SOURCE_PACKAGE;
      },
    ],
    [
      "research acquisition drops X7-W2 package ref",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.sourceOfTruthRefs = row.sourceOfTruthRefs.filter((ref) =>
          ref !== RESEARCH_ACQUISITION_CURRENT_SOURCE_PACKAGE
        );
      },
    ],
    [
      "research acquisition drops telemetry projection context package ref",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.sourceOfTruthRefs = row.sourceOfTruthRefs.filter((ref) =>
          ref !== RESEARCH_ACQUISITION_7N3B2_T1_SOURCE_PACKAGE
        );
      },
    ],
    [
      "research acquisition drops X7-W1C context package ref",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.sourceOfTruthRefs = row.sourceOfTruthRefs.filter((ref) =>
          ref !== RESEARCH_ACQUISITION_X7_W1C_SOURCE_PACKAGE
        );
      },
    ],
    [
      "research acquisition drops X7-W1B context package ref",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.sourceOfTruthRefs = row.sourceOfTruthRefs.filter((ref) =>
          ref !== RESEARCH_ACQUISITION_X7_W1B_SOURCE_PACKAGE
        );
      },
    ],
    [
      "research acquisition drops X7-W1A context package ref",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.sourceOfTruthRefs = row.sourceOfTruthRefs.filter((ref) =>
          ref !== RESEARCH_ACQUISITION_X7_W1A_SOURCE_PACKAGE
        );
      },
    ],
    [
      "research acquisition keeps broad source-acquisition glob",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.allowedFiles.push("apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/**");
      },
    ],
    [
      "research acquisition keeps provider network allowed file",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.allowedFiles.push("apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-transport.ts");
      },
    ],
    [
      "research acquisition keeps content transport allowed file",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.allowedFiles.push("apps/web/src/lib/analyzer-v2-runtime/source-acquisition-content-transport.ts");
      },
    ],
    [
      "research acquisition keeps W1C runtime owner allowed file",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.allowedFiles.push("apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/pre-io-fence.ts");
      },
    ],
    [
      "research acquisition drops boundary guard allowed file",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.allowedFiles = row.allowedFiles.filter((file) =>
          file !== "apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts"
        );
      },
    ],
    [
      "research acquisition drops gate register allowed file",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.allowedFiles = row.allowedFiles.filter((file) =>
          file !== "Docs/AGENTS/V2_Gate_Register.json"
        );
      },
    ],
    [
      "research acquisition drops validator allowed file",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.allowedFiles = row.allowedFiles.filter((file) =>
          file !== "scripts/validate-v2-gate-register.mjs"
        );
      },
    ],
    [
      "research acquisition drops live provider-network job blocker",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.blockedSurfaces = row.blockedSurfaces.filter((surface) =>
          surface !== "live provider-network jobs"
        );
      },
    ],
    [
      "research acquisition drops endpoint-scope blocker",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.blockedSurfaces = row.blockedSurfaces.filter((surface) =>
          surface !== "provider endpoints beyond Wikimedia Core REST Search page search"
        );
      },
    ],
    [
      "research acquisition drops credentialed provider blocker",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.blockedSurfaces = row.blockedSurfaces.filter((surface) =>
          surface !== "credentialed or paid provider execution"
        );
      },
    ],
    [
      "research acquisition drops content dereference blocker",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.blockedSurfaces = row.blockedSurfaces.filter((surface) =>
          surface !== "content dereference"
        );
      },
    ],
    [
      "research acquisition drops X7-W2 state note",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.notes = row.notes.replace(
          "implemented_product_internal_candidate_provider_network_hidden_no_source_material",
          "candidate_provider_network_pending",
        );
      },
    ],
    [
      "research acquisition drops Wikimedia provider note",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.notes = row.notes.replaceAll("wikimedia_core", "generic_provider");
      },
    ],
    [
      "research acquisition drops endpoint path note",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.notes = row.notes.replace("/core/v1/wikipedia/en/search/page", "/search/page");
      },
    ],
    [
      "research acquisition drops no-limit note",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.notes = row.notes.replace("no limit parameter", "limited parameter");
      },
    ],
    [
      "research acquisition drops redirect deny note",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.notes = row.notes.replace("redirect policy exactly deny", "redirect cap");
      },
    ],
    [
      "research acquisition drops old-path family note",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.notes = row.notes.replace("X6/X7-D/X7-E/X7-F/X7-G1/X7-G2", "X6/X7-D");
      },
    ],
    [
      "research acquisition drops live-job blocked note",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.notes = row.notes.replace("live jobs remain blocked", "live jobs pending");
      },
    ],
    [
      "research acquisition drops live block provider endpoint",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.liveJobBlockReason = row.liveJobBlockReason.replace(
          "Wikimedia Core REST Search",
          "provider path",
        );
      },
    ],
    [
      "research acquisition drops B2 parser blocker",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.sourceOfTruthRefs = row.sourceOfTruthRefs.filter((ref) =>
          ref !== "Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B2_OCI_Parser_Isolation_Proof_Source_Package.md"
        );
      },
    ],
    [
      "research acquisition drops C0-S1 parser admission source package",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.sourceOfTruthRefs = row.sourceOfTruthRefs.filter((ref) =>
          ref !== RESEARCH_ACQUISITION_C0_S1_SOURCE_PACKAGE
        );
      },
    ],
    [
      "research acquisition drops C0-S2 parser admission provenance source package",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.sourceOfTruthRefs = row.sourceOfTruthRefs.filter((ref) =>
          ref !== RESEARCH_ACQUISITION_C0_S2_SOURCE_PACKAGE
        );
      },
    ],
    [
      "research acquisition drops C0-S3 parsed-material denial source package",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.sourceOfTruthRefs = row.sourceOfTruthRefs.filter((ref) =>
          ref !== RESEARCH_ACQUISITION_C0_S3_SOURCE_PACKAGE
        );
      },
    ],
    [
      "research acquisition drops parser-worker execution blocker",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.blockedSurfaces = row.blockedSurfaces.filter((surface) =>
          surface !== "parser-worker execution"
        );
      },
    ],
    [
      "research acquisition drops parsed-material creation blocker",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.blockedSurfaces = row.blockedSurfaces.filter((surface) =>
          surface !== "parsed-material creation"
        );
      },
    ],
    [
      "research acquisition drops C0-S1 note token",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.notes = row.notes.replace("C0-S1", "C0 parser");
      },
    ],
    [
      "research acquisition drops C0-S2 note token",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.notes = row.notes.replace("C0-S2", "parser provenance");
      },
    ],
    [
      "research acquisition drops C0-S3 note token",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.notes = row.notes.replace("C0-S3", "parser denial");
      },
    ],
    [
      "research acquisition drops parsed-material denial note",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.notes = row.notes.replace("no parsed material", "blocked output");
      },
    ],
    [
      "research acquisition drops P0 note token",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.notes = row.notes.replace("P0", "provisional");
      },
    ],
    [
      "research acquisition drops 2D-C blocked note",
      (candidate) => {
        const row = candidate.entries.find((entry) => entry.taskId === "research_acquisition");
        row.notes = row.notes.replace("2D-C remains blocked", "parser work is deferred");
      },
    ],
  ];

  for (const [name, mutate] of mutations) {
    expectMutationFails(name, base, context, mutate);
  }
}

async function main() {
  try {
    const context = await loadValidationContext();
    const drifts = validateRegister(context.register, context);
    if (drifts.length > 0) {
      for (const issue of drifts) {
        process.stderr.write(`${issue}\n`);
      }
      process.exit(1);
    }
    if (process.argv.includes("--self-test")) {
      await runSelfTest(context);
    }
  } catch (error) {
    process.stderr.write(`validate-v2-gate-register: error - ${error?.message ?? error}\n`);
    process.exit(2);
  }
}

main();
