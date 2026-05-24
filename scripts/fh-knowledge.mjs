#!/usr/bin/env node

import { runCli } from "../packages/fh-agent-knowledge/src/adapters/cli.mjs";

process.exitCode = runCli(process.argv.slice(2));
