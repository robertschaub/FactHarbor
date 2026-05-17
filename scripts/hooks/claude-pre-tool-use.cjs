#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { evaluateCommand, extractCommand } = require('./fh-safety-policy.cjs');

try {
  const raw = fs.readFileSync(0, 'utf8');
  const input = raw.trim() ? JSON.parse(raw) : {};
  const decision = evaluateCommand(extractCommand(input));

  if (!decision.allowed) {
    console.error(`BLOCKED by FactHarbor safety hook [${decision.id}]: ${decision.reason}`);
    process.exit(2);
  }
} catch (error) {
  console.error(
    `FactHarbor safety hook failed closed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(2);
}
