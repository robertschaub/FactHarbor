#!/usr/bin/env node
/**
 * Run Promptfoo Tests for FactHarbor
 *
 * Usage:
 *   node scripts/promptfoo-sr.js                    # Run source-reliability tests (default)
 *   node scripts/promptfoo-sr.js sr                 # Run source-reliability tests
 *   node scripts/promptfoo-sr.js verdict            # Run verdict tests
 *   node scripts/promptfoo-sr.js all                # Run all test configs
 *   node scripts/promptfoo-sr.js --list             # List available configs
 *   node scripts/promptfoo-sr.js --view             # Open results viewer
 *   node scripts/promptfoo-sr.js sr --view          # View after specific test
 *
 * Environment:
 *   Requires .env.local with API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY)
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Available test configurations
const CONFIGS = {
  'sr': {
    name: 'Source Reliability',
    file: 'promptfooconfig.source-reliability.yaml',
    description: 'Tests source reliability evaluation prompts'
  },
  'verdict': {
    name: 'Verdict Generation',
    file: 'promptfooconfig.yaml',
    description: 'Tests verdict generation prompts'
  }
};

const args = process.argv.slice(2);
const viewMode = args.includes('--view');
const listMode = args.includes('--list');

// Filter out flags to get config names
const configArgs = args.filter(a => !a.startsWith('--'));
const selectedConfigs = configArgs.length > 0 ? configArgs : ['sr'];

const webDir = path.join('apps', 'web');
const envPath = path.join(webDir, '.env.local');

// List available configs
if (listMode) {
  console.log('Available Promptfoo test configurations:\n');
  for (const [key, config] of Object.entries(CONFIGS)) {
    const configPath = path.join(webDir, config.file);
    const exists = fs.existsSync(configPath);
    const status = exists ? '✓' : '✗ (missing)';
    console.log(`  ${key.padEnd(12)} ${status}  ${config.name}`);
    console.log(`               ${config.description}`);
    console.log(`               File: ${config.file}\n`);
  }
  process.exit(0);
}

// View mode
if (viewMode && configArgs.length === 0) {
  console.log('Opening Promptfoo results viewer...');
  const child = spawn('npx', ['promptfoo', 'view'], {
    stdio: 'inherit',
    shell: true
  });
  child.on('error', (err) => {
    console.error('Failed to start viewer:', err.message);
    process.exit(1);
  });
  return;
}

// Check env file exists
if (!fs.existsSync(envPath)) {
  console.error(`Error: ${envPath} not found.`);
  console.error('Copy apps/web/.env.example to apps/web/.env.local and add your API keys.');
  process.exit(1);
}

// Run tests
function runConfig(key) {
  const config = CONFIGS[key];
  if (!config) {
    console.error(`Unknown config: ${key}`);
    console.error(`Available: ${Object.keys(CONFIGS).join(', ')}, all`);
    process.exit(1);
  }

  const configPath = path.join(webDir, config.file);
  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`);
    process.exit(1);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${config.name}`);
  console.log(`Config:  ${configPath}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    execSync(
      `npx promptfoo eval -c ${configPath} --env-file ${envPath}`,
      { stdio: 'inherit' }
    );
    return true;
  } catch (err) {
    console.error(`\nTests failed for ${config.name}`);
    return false;
  }
}

// Handle 'all' to run all configs
const configsToRun = selectedConfigs.includes('all')
  ? Object.keys(CONFIGS)
  : selectedConfigs;

let allPassed = true;
for (const key of configsToRun) {
  if (!runConfig(key)) {
    allPassed = false;
  }
}

// Summary
if (configsToRun.length > 1) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Summary: ${allPassed ? 'All tests completed' : 'Some tests failed'}`);
  console.log(`${'='.repeat(60)}\n`);
}

// Open viewer if requested
if (viewMode) {
  console.log('\nOpening results viewer...');
  spawn('npx', ['promptfoo', 'view'], {
    stdio: 'inherit',
    shell: true,
    detached: true
  });
}

process.exit(allPassed ? 0 : 1);
