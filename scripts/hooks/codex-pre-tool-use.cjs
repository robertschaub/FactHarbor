#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { evaluateCommand, extractCommand } = require('./fh-safety-policy.cjs');

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
}

try {
  const raw = fs.readFileSync(0, 'utf8');
  const input = raw.trim() ? JSON.parse(raw) : {};
  const toolName = input.tool_name || input.toolName || '';
  if (toolName && !/^bash$/i.test(toolName)) process.exit(0);

  const decision = evaluateCommand(extractCommand(input));
  if (!decision.allowed) {
    deny(`BLOCKED by FactHarbor safety hook [${decision.id}]: ${decision.reason}`);
  }
} catch (error) {
  deny(`FactHarbor safety hook failed closed: ${error instanceof Error ? error.message : String(error)}`);
}
