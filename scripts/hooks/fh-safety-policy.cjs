#!/usr/bin/env node
'use strict';

const CLAUDE_WRAPPER_PATH = 'scripts/agents/invoke-claude.cjs';

const COMMAND_POLICIES = [
  { id: 'git-reset-hard', pattern: /\bgit\s+reset\s+--hard\b/i, reason: 'git reset --hard is blocked by FactHarbor safety policy.' },
  { id: 'git-push-force', pattern: /\bgit\s+push\b(?=[\s\S]*--force\b)(?![\s\S]*--force-with-lease\b)/i, reason: 'git push --force is blocked; use --force-with-lease only when explicitly approved.' },
  { id: 'git-clean-force', pattern: /\bgit\s+clean\s+-[A-Za-z]*f[A-Za-z]*\b/i, reason: 'git clean -f variants are blocked by FactHarbor safety policy.' },
  { id: 'checkout-all', pattern: /\bgit\s+checkout\s+--\s+\.(?:\s|$)/i, reason: 'git checkout -- . is blocked because it can discard user work.' },
  { id: 'factharbor-db-delete', pattern: /(?:\brm\b|\bdel\b|\berase\b|\bRemove-Item\b)\s+[\s\S]*factharbor\.db\b/i, reason: 'Deleting factharbor.db is blocked by FactHarbor safety policy.' },
  { id: 'factharbor-db-sqlite', pattern: /\bsqlite3(?:\.exe)?\b[\s\S]*factharbor\.db\b/i, reason: 'Direct sqlite3 access to factharbor.db is blocked by FactHarbor safety policy.' },
  { id: 'expensive-npm-test', pattern: /\bnpm(?:\s+(?:-w|--workspace)\s+\S+)*\s+run\s+test:(llm|neutrality|cb-integration|expensive|calibration)\b/i, reason: 'Expensive real-LLM test suites are blocked unless explicitly authorized.' },
  { id: 'expensive-vitest', pattern: /\b(?:npx\s+|npm(?:\s+(?:-w|--workspace)\s+\S+)*\s+exec\s+)?vitest\b[\s\S]*\b(llm-integration|input-neutrality|claimboundary-integration)\b/i, reason: 'Expensive real-LLM vitest suites are blocked unless explicitly authorized.' },
];

function normalizeCommand(command) {
  return String(command || '').replace(/\r\n/g, '\n');
}

function normalizedPathText(command) {
  return normalizeCommand(command).replace(/\\/g, '/').toLowerCase();
}

function isClaudeWrapperCommand(command) {
  return normalizedPathText(command).includes(CLAUDE_WRAPPER_PATH);
}

function hasBareClaudeInvocation(command) {
  if (isClaudeWrapperCommand(command)) return false;
  return /(^|[\s"'`;&|()])(?:[^\s"'`;&|()]*[\\/])?claude(?:\.exe)?(?=$|[\s"'`;&|()])/i.test(
    normalizeCommand(command),
  );
}

function evaluateCommand(command) {
  const normalized = normalizeCommand(command);
  for (const policy of COMMAND_POLICIES) {
    if (policy.pattern.test(normalized)) {
      return { allowed: false, id: policy.id, reason: policy.reason };
    }
  }

  if (hasBareClaudeInvocation(normalized)) {
    return {
      allowed: false,
      id: 'bare-claude',
      reason:
        'Bare claude invocations are blocked. Use: node scripts/agents/invoke-claude.cjs ... so .claude/settings.json env is applied.',
    };
  }

  return { allowed: true };
}

function extractCommand(hookInput) {
  if (!hookInput || typeof hookInput !== 'object') return '';
  return hookInput.tool_input?.command || hookInput.toolInput?.command || hookInput.command || '';
}

module.exports = {
  COMMAND_POLICIES,
  CLAUDE_WRAPPER_PATH,
  evaluateCommand,
  extractCommand,
  hasBareClaudeInvocation,
  isClaudeWrapperCommand,
};
