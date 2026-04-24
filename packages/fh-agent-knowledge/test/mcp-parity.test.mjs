import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createKnowledgeMcpServer } from "../src/adapters/mcp.mjs";
import { PATHS } from "../src/utils/paths.mjs";

const EXPECTED_TOOL_NAMES = [
  "bootstrap_knowledge",
  "check_knowledge_health",
  "get_doc_section",
  "get_role_context",
  "lookup_model_task",
  "lookup_stage",
  "preflight_task",
  "refresh_knowledge",
  "search_handoffs",
];

function createClient() {
  return new Client({
    name: "fh-agent-knowledge-test-client",
    version: "0.1.0",
  });
}

function runCliJson(args) {
  const stdout = execFileSync(
    process.execPath,
    [join(PATHS.repoRoot, "scripts", "fh-knowledge.mjs"), ...args],
    {
      cwd: PATHS.repoRoot,
      encoding: "utf8",
    },
  );

  return JSON.parse(stdout);
}

function stripScores(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => stripScores(entry));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "score")
      .map(([key, entryValue]) => [key, stripScores(entryValue)]),
  );
}

function stripKeys(value, keysToStrip) {
  if (Array.isArray(value)) {
    return value.map((entry) => stripKeys(entry, keysToStrip));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !keysToStrip.has(key))
      .map(([key, entryValue]) => [key, stripKeys(entryValue, keysToStrip)]),
  );
}

async function withStdioClient(run) {
  const client = createClient();
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(PATHS.repoRoot, "scripts", "fh-knowledge-mcp.mjs")],
    cwd: PATHS.repoRoot,
    stderr: "pipe",
  });

  try {
    await client.connect(transport);
    return await run(client);
  } finally {
    await client.close();
  }
}

const VOLATILE_CACHE_FIELDS = new Set(["builtAt"]);

test("mcp server exposes the exact frozen tool set", async () => {
  const server = createKnowledgeMcpServer();
  const client = createClient();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  try {
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const { tools } = await client.listTools();
    const toolNames = tools.map((tool) => tool.name).sort();

    assert.deepEqual(toolNames, [...EXPECTED_TOOL_NAMES].sort());
  } finally {
    await client.close();
    await server.close();
  }
});

test("stdio mcp preflight_task matches CLI preflight-task output", async () => {
  runCliJson(["refresh", "--force"]);

  const cliResult = runCliJson([
    "preflight-task",
    "--task",
    "Continue the internal knowledge layer MCP implementation",
    "--role",
    "Senior Architect",
  ]);

  const mcpResult = await withStdioClient(async (client) => {
    const response = await client.callTool({
      name: "preflight_task",
      arguments: {
        task: "Continue the internal knowledge layer MCP implementation",
        role: "Senior Architect",
      },
    });

    return response.structuredContent;
  });

  assert.deepEqual(stripScores(mcpResult), stripScores(cliResult));
});

test("stdio mcp check_knowledge_health matches CLI health output", async () => {
  const cliResult = runCliJson(["health"]);

  const mcpResult = await withStdioClient(async (client) => {
    const response = await client.callTool({
      name: "check_knowledge_health",
    });

    return response.structuredContent;
  });

  assert.deepEqual(mcpResult, cliResult);
});

test("stdio mcp zero-arg tools tolerate omitted arguments", async () => {
  const cliBootstrap = runCliJson(["bootstrap"]);
  const cliHealth = runCliJson(["health"]);
  const cliRefresh = runCliJson(["refresh"]);

  const { bootstrapResult, healthResult, refreshResult } = await withStdioClient(async (client) => {
    const bootstrapResponse = await client.callTool({
      name: "bootstrap_knowledge",
    });
    const healthResponse = await client.callTool({
      name: "check_knowledge_health",
    });
    const refreshResponse = await client.callTool({
      name: "refresh_knowledge",
    });

    return {
      bootstrapResult: bootstrapResponse.structuredContent,
      healthResult: healthResponse.structuredContent,
      refreshResult: refreshResponse.structuredContent,
    };
  });

  assert.deepEqual(
    stripKeys(bootstrapResult, VOLATILE_CACHE_FIELDS),
    stripKeys(cliBootstrap, VOLATILE_CACHE_FIELDS),
  );
  assert.deepEqual(
    stripKeys(healthResult, VOLATILE_CACHE_FIELDS),
    stripKeys(cliHealth, VOLATILE_CACHE_FIELDS),
  );
  assert.deepEqual(
    stripKeys(refreshResult, VOLATILE_CACHE_FIELDS),
    stripKeys(cliRefresh, VOLATILE_CACHE_FIELDS),
  );
});
