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
const REQUIRED_QUERY_PLANNING_DRIFT_MARKERS = [
  "prompt_frontmatter_required_sections_lag",
];
const REPAIRED_QUERY_PLANNING_DRIFT_MARKERS = [
  "static_task_policy_symbolic_not_executable",
];
const RESEARCH_ACQUISITION_CURRENT_SLICE_ID = "X7-F";
const RESEARCH_ACQUISITION_CURRENT_STATE =
  "implemented_hidden_direct_text_execution_gate_closed_no_io";
const RESEARCH_ACQUISITION_CURRENT_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-16_V2_Slice_X7-F_Hidden_No_IO_Source_Acquisition_Execution_Gate_Source_Package.md";
const RESEARCH_ACQUISITION_CURRENT_IMPLEMENTATION_COMMIT = null;
const REQUIRED_RESEARCH_ACQUISITION_REFS = [
  RESEARCH_ACQUISITION_CURRENT_SOURCE_PACKAGE,
  "Docs/WIP/2026-05-16_V2_Slice_X7-E_Hidden_Source_Acquisition_Composition_X6_Provenance_Gate_Source_Package.md",
  "Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B2_OCI_Parser_Isolation_Proof_Source_Package.md",
  "Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B3_Provisioned_OCI_Deployment_Candidate_Proof_Package.md",
  "Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-C0_Parser_Worker_Architecture_And_Provisional_Isolation.md",
];
const REQUIRED_RESEARCH_ACQUISITION_BLOCKED_SURFACES = [
  "source-acquisition execution admission",
  "provider-network execution",
  "real network/search/fetch execution",
  "source-material population",
  "evidence-corpus building",
  "real fetched-byte parser consumption",
  "2D-C parser source implementation",
  "product/orchestrator/runner/API/UI/report/export wiring",
  "live jobs",
];
const REQUIRED_RESEARCH_ACQUISITION_NOTE_TOKENS = [
  "X7-F",
  "gate_closed_no_io",
  "parser_isolation_unavailable",
  "B3",
  "2D-C remains blocked",
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
    for (const marker of REQUIRED_QUERY_PLANNING_DRIFT_MARKERS) {
      if (!driftMarkers.includes(marker)) {
        drift(
          `${REGISTER_PATH}:evidence_query_planning`,
          `known drift marker ${marker} must be present until X3 repairs query-planning policy drift`,
        );
      }
    }
    for (const marker of REPAIRED_QUERY_PLANNING_DRIFT_MARKERS) {
      if (driftMarkers.includes(marker)) {
        drift(
          `${REGISTER_PATH}:evidence_query_planning`,
          `known drift marker ${marker} was repaired by X3-A and must not remain in the register`,
        );
      }
    }
  }

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
  requireTextIncludes(entry.approvalPointer, "X7-F", where, "approvalPointer", drift);
  requireTextIncludes(entry.approvalPointer, "source execution remains blocked", where, "approvalPointer", drift);

  for (const requiredRef of REQUIRED_RESEARCH_ACQUISITION_REFS) {
    requireArrayIncludes(entry.sourceOfTruthRefs, requiredRef, where, "sourceOfTruthRefs", drift);
  }
  for (const blockedSurface of REQUIRED_RESEARCH_ACQUISITION_BLOCKED_SURFACES) {
    requireArrayIncludes(entry.blockedSurfaces, blockedSurface, where, "blockedSurfaces", drift);
  }
  for (const noteToken of REQUIRED_RESEARCH_ACQUISITION_NOTE_TOKENS) {
    requireTextIncludes(entry.notes, noteToken, where, "notes", drift);
  }
  requireTextIncludes(entry.liveJobBlockReason, "X7-F", where, "liveJobBlockReason", drift);
  requireTextIncludes(entry.liveJobBlockReason, "not implemented", where, "liveJobBlockReason", drift);
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
      "missing prompt metadata drift marker",
      (candidate) => {
        candidate.entries.find((entry) => entry.taskId === "evidence_query_planning").knownDrift = [];
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
      "research acquisition drifts from X7-F",
      (candidate) => {
        candidate.entries.find((entry) => entry.taskId === "research_acquisition").sourcePackage =
          "Docs/WIP/2026-05-16_V2_Slice_X7-E_Hidden_Source_Acquisition_Composition_X6_Provenance_Gate_Source_Package.md";
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
