#!/usr/bin/env node

import { runMcpServer } from "../src/adapters/mcp.mjs";

runMcpServer().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
