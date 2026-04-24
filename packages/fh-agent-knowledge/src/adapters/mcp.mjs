import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

import { KNOWLEDGE_OPERATION_DEFINITIONS } from "./operations.mjs";

const SERVER_INFO = {
  name: "fh-agent-knowledge",
  version: "0.1.0",
};

const SERVER_INSTRUCTIONS = [
  "FactHarbor internal knowledge query server.",
  "Local-only and read-only except for local cache bootstrap or refresh.",
  "Do not use this server for job submission, report mutation, config writes, database writes, or arbitrary shell access.",
  "Tool outputs mirror the existing fh-knowledge CLI JSON responses via structuredContent.",
].join(" ");

function buildOptionalInputSchema(shape) {
  return z.object(shape).optional();
}

const MCP_INPUT_SCHEMAS = {
  preflight_task: buildOptionalInputSchema({
    task: z.string().describe("Free-text description of the task to preflight."),
    role: z.string().optional().describe("Optional active role or role alias."),
    limit: z.number().int().positive().optional().describe("Optional result limit."),
  }),
  search_handoffs: buildOptionalInputSchema({
    query: z.string().describe("Search query for handoff retrieval."),
    role: z.string().optional().describe("Optional role filter."),
    after: z.string().optional().describe("Optional lower date bound in YYYY-MM-DD format."),
    limit: z.number().int().positive().optional().describe("Optional result limit."),
  }),
  lookup_stage: buildOptionalInputSchema({
    name: z.string().describe("Stage name or task phrase to resolve."),
    limit: z.number().int().positive().optional().describe("Optional result limit."),
  }),
  lookup_model_task: buildOptionalInputSchema({
    task: z.string().describe("Analyzer task to resolve in the model-tier manifest."),
    limit: z.number().int().positive().optional().describe("Optional result limit."),
  }),
  get_role_context: buildOptionalInputSchema({
    role: z.string().describe("Role name or alias to resolve."),
  }),
  get_doc_section: buildOptionalInputSchema({
    file: z.string().describe("Allowed repo doc path."),
    section: z.string().describe("Section heading to retrieve."),
  }),
  bootstrap_knowledge: buildOptionalInputSchema({}),
  refresh_knowledge: buildOptionalInputSchema({
    force: z.boolean().optional().describe("Force a rebuild even if the cache is fresh."),
  }),
  check_knowledge_health: buildOptionalInputSchema({}),
};

function serializeResult(value) {
  return JSON.stringify(value, null, 2);
}

function buildToolSuccessResult(result) {
  return {
    content: [
      {
        type: "text",
        text: serializeResult(result),
      },
    ],
    structuredContent: result,
  };
}

function buildToolErrorResult(error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [
      {
        type: "text",
        text: message,
      },
    ],
    structuredContent: {
      ok: false,
      error: {
        message,
      },
    },
    isError: true,
  };
}

export function createKnowledgeMcpServer({
  serverInfo = SERVER_INFO,
  instructions = SERVER_INSTRUCTIONS,
} = {}) {
  const server = new McpServer(serverInfo, { instructions });

  for (const operation of KNOWLEDGE_OPERATION_DEFINITIONS) {
    server.registerTool(operation.mcpTool, {
      title: operation.mcpTool,
      description: operation.description,
      inputSchema: MCP_INPUT_SCHEMAS[operation.mcpTool] ?? {},
    }, async (args = {}) => {
      try {
        return buildToolSuccessResult(operation.execute(args));
      } catch (error) {
        return buildToolErrorResult(error);
      }
    });
  }

  return server;
}

export async function runMcpServer() {
  const server = createKnowledgeMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}
