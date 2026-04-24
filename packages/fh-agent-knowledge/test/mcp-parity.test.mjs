import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

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
const TEST_CACHE_DIR = mkdtempSync(join(tmpdir(), "fh-agent-knowledge-mcp-parity-"));

process.on("exit", () => {
  rmSync(TEST_CACHE_DIR, { recursive: true, force: true });
});

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
      env: {
        ...process.env,
        FH_AGENT_KNOWLEDGE_CACHE_DIR: TEST_CACHE_DIR,
      },
    },
  );

  return JSON.parse(stdout);
}

function ensureFreshCache() {
  runCliJson(["bootstrap"]);
  const healthResult = runCliJson(["health"]);
  assert.equal(healthResult.stale, false);
  assert.equal(healthResult.cacheSource, "cache");
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
    env: {
      ...process.env,
      FH_AGENT_KNOWLEDGE_CACHE_DIR: TEST_CACHE_DIR,
    },
  });

  try {
    await client.connect(transport);
    return await run(client);
  } finally {
    await client.close();
  }
}

const VOLATILE_BOOTSTRAP_FIELDS = new Set(["builtAt"]);
const VOLATILE_QUERY_FIELDS = new Set(["cacheRefreshed"]);

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
  ensureFreshCache();

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

  assert.deepEqual(
    stripScores(stripKeys(mcpResult, VOLATILE_QUERY_FIELDS)),
    stripScores(stripKeys(cliResult, VOLATILE_QUERY_FIELDS)),
  );
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

  const bootstrapResult = await withStdioClient(async (client) => {
    const response = await client.callTool({
      name: "bootstrap_knowledge",
    });

    return response.structuredContent;
  });

  assert.deepEqual(
    stripKeys(bootstrapResult, VOLATILE_BOOTSTRAP_FIELDS),
    stripKeys(cliBootstrap, VOLATILE_BOOTSTRAP_FIELDS),
  );

  ensureFreshCache();
  const cliHealth = runCliJson(["health"]);

  const healthResult = await withStdioClient(async (client) => {
    const response = await client.callTool({
      name: "check_knowledge_health",
    });

    return response.structuredContent;
  });

  assert.deepEqual(healthResult, cliHealth);

  ensureFreshCache();
  const cliRefresh = runCliJson(["refresh"]);

  const refreshResult = await withStdioClient(async (client) => {
    const response = await client.callTool({
      name: "refresh_knowledge",
    });

    return response.structuredContent;
  });

  assert.deepEqual(refreshResult, cliRefresh);
});

test("stdio mcp surfaces missing required tool arguments as schema errors", async () => {
  const preflightResult = await withStdioClient((client) => client.callTool({
    name: "preflight_task",
  }));
  assert.equal(preflightResult.isError, true);
  assert.match(preflightResult.content[0]?.text ?? "", /preflight_task/i);
  assert.match(preflightResult.content[0]?.text ?? "", /(expected object|task)/i);

  const docSectionResult = await withStdioClient((client) => client.callTool({
    name: "get_doc_section",
    arguments: {},
  }));
  assert.equal(docSectionResult.isError, true);
  assert.match(docSectionResult.content[0]?.text ?? "", /get_doc_section/i);
  assert.match(docSectionResult.content[0]?.text ?? "", /(file|section)/i);
});
