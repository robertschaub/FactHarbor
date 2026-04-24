#!/usr/bin/env node

import { runMcpServer } from "../packages/fh-agent-knowledge/src/adapters/mcp.mjs";

runMcpServer().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
