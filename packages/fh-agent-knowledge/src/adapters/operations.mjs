import { buildCommandResult } from "../contracts/results.mjs";
import {
  bootstrapKnowledge,
  checkKnowledgeHealth,
  getDocSection,
  getRoleContext,
  loadKnowledgeContext,
  lookupModelTask,
  lookupStage,
  preflightTask,
  refreshKnowledge,
  searchHandoffs,
} from "../index.mjs";

function loadQueryKnowledgeContext() {
  return loadKnowledgeContext({ allowFallback: true, refreshIfStale: true });
}

function buildQueryResult(command, project) {
  const knowledgeContext = loadQueryKnowledgeContext();
  return buildCommandResult(command, {
    cacheSource: knowledgeContext.source,
    cacheRefreshed: knowledgeContext.refreshed,
    ...project(knowledgeContext),
  }, knowledgeContext.warnings);
}

export const KNOWLEDGE_OPERATION_DEFINITIONS = [
  {
    cliCommand: "preflight-task",
    mcpTool: "preflight_task",
    cliUsage: "fh-knowledge preflight-task --task \"...\" [--role ...] [--limit 5]",
    description: "Bundle the minimum startup context for a task from recent outputs, handoffs, stage anchors, role context, and doc anchors.",
    execute(input = {}) {
      return buildQueryResult("preflight-task", (knowledgeContext) => ({
        result: preflightTask(knowledgeContext, input),
      }));
    },
  },
  {
    cliCommand: "search-handoffs",
    mcpTool: "search_handoffs",
    cliUsage: "fh-knowledge search-handoffs --query \"...\" [--role ...] [--after YYYY-MM-DD] [--limit 10]",
    description: "Search historical handoffs with role/date filters and field-level match reasons.",
    execute(input = {}) {
      return buildQueryResult("search-handoffs", (knowledgeContext) => ({
        results: searchHandoffs(knowledgeContext, input),
      }));
    },
  },
  {
    cliCommand: "lookup-stage",
    mcpTool: "lookup_stage",
    cliUsage: "fh-knowledge lookup-stage --name \"...\" [--limit 5]",
    description: "Find likely owning analyzer stages and functions for a stage name or task phrase.",
    execute(input = {}) {
      return buildQueryResult("lookup-stage", (knowledgeContext) => ({
        results: lookupStage(knowledgeContext, input),
      }));
    },
  },
  {
    cliCommand: "lookup-model-task",
    mcpTool: "lookup_model_task",
    cliUsage: "fh-knowledge lookup-model-task --task \"...\" [--limit 5]",
    description: "Resolve model-tier ownership for a known analyzer task.",
    execute(input = {}) {
      return buildQueryResult("lookup-model-task", (knowledgeContext) => ({
        results: lookupModelTask(knowledgeContext, input),
      }));
    },
  },
  {
    cliCommand: "get-role-context",
    mcpTool: "get_role_context",
    cliUsage: "fh-knowledge get-role-context --role \"...\"",
    description: "Return the canonical role brief and alias-resolved context for a requested role.",
    execute(input = {}) {
      return buildQueryResult("get-role-context", (knowledgeContext) => ({
        role: getRoleContext(knowledgeContext, input),
      }));
    },
  },
  {
    cliCommand: "get-doc-section",
    mcpTool: "get_doc_section",
    cliUsage: "fh-knowledge get-doc-section --file \"...\" --section \"...\"",
    description: "Read one allowed documentation section by file and heading.",
    execute(input = {}) {
      return buildQueryResult("get-doc-section", (knowledgeContext) => ({
        section: getDocSection(knowledgeContext, input),
      }));
    },
  },
  {
    cliCommand: "bootstrap",
    mcpTool: "bootstrap_knowledge",
    cliUsage: "fh-knowledge bootstrap",
    description: "Build the local knowledge cache from repo sources and compatibility indexes.",
    execute() {
      return bootstrapKnowledge();
    },
  },
  {
    cliCommand: "refresh",
    mcpTool: "refresh_knowledge",
    cliUsage: "fh-knowledge refresh [--force]",
    description: "Refresh the local knowledge cache when stale, or force a rebuild.",
    execute(input = {}) {
      return refreshKnowledge(input);
    },
  },
  {
    cliCommand: "health",
    mcpTool: "check_knowledge_health",
    cliUsage: "fh-knowledge health",
    description: "Inspect cache freshness, source coverage, and current serving substrate without mutating cache state.",
    execute() {
      return checkKnowledgeHealth();
    },
  },
];

const OPERATIONS_BY_CLI_COMMAND = new Map(
  KNOWLEDGE_OPERATION_DEFINITIONS.map((operation) => [operation.cliCommand, operation]),
);
const OPERATIONS_BY_MCP_TOOL = new Map(
  KNOWLEDGE_OPERATION_DEFINITIONS.map((operation) => [operation.mcpTool, operation]),
);

export function getCliUsageLines() {
  return KNOWLEDGE_OPERATION_DEFINITIONS.map((operation) => operation.cliUsage);
}

export function getOperationByCliCommand(command) {
  return OPERATIONS_BY_CLI_COMMAND.get(command) ?? null;
}

export function getOperationByMcpTool(toolName) {
  return OPERATIONS_BY_MCP_TOOL.get(toolName) ?? null;
}

export function executeKnowledgeOperation(command, input = {}) {
  const operation = getOperationByCliCommand(command);
  if (!operation) {
    throw new Error(`Unknown command: ${command}`);
  }

  return operation.execute(input);
}
