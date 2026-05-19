#!/usr/bin/env node
/**
 * Advisory mechanical debt sensors for FactHarbor agent governance.
 *
 * Default mode prints a human-readable report and exits 0. Use --json for
 * machine-readable output or --fail-on-warn once the Captain promotes a sensor
 * from advisory to enforced.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const THIS_FILE = fileURLToPath(import.meta.url);
const REPO = resolve(dirname(THIS_FILE), '..');

const args = new Set(process.argv.slice(2));
const JSON_OUTPUT = args.has('--json');
const FAIL_ON_WARN = args.has('--fail-on-warn');

const EXCLUDED_DIRS = new Set([
  '.git',
  '.next',
  'bin',
  'node_modules',
  'obj',
]);

function threshold(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const THRESHOLDS = {
  v2SourceLines: threshold('FH_DEBT_SENSOR_V2_SOURCE_LINES_WARN', 30000),
  v2TestLines: threshold('FH_DEBT_SENSOR_V2_TEST_LINES_WARN', 40000),
  boundaryGuardLines: threshold('FH_DEBT_SENSOR_BOUNDARY_GUARD_LINES_WARN', 6000),
  wipMarkdownFiles: threshold('FH_DEBT_SENSOR_WIP_MARKDOWN_WARN', 180),
  handoffMarkdownFiles: threshold('FH_DEBT_SENSOR_HANDOFF_MARKDOWN_WARN', 650),
  v2ConsolidationSince: process.env.FH_DEBT_SENSOR_V2_CONSOLIDATION_SINCE || '2026-05-19',
};

function toRepoPath(path) {
  return relative(REPO, path).replaceAll('\\', '/');
}

function walkFiles(root, predicate = () => true) {
  const absRoot = join(REPO, root);
  if (!existsSync(absRoot)) return [];

  const out = [];
  const stack = [absRoot];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) stack.push(join(current, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;
      const file = join(current, entry.name);
      if (predicate(file)) out.push(file);
    }
  }

  return out.sort((a, b) => toRepoPath(a).localeCompare(toRepoPath(b)));
}

function readText(path) {
  return readFileSync(path, 'utf8');
}

function countLines(path) {
  const text = readText(path);
  if (text.length === 0) return 0;
  return text.split(/\r?\n/).length;
}

function countMatches(text, pattern) {
  return Array.from(text.matchAll(pattern)).length;
}

function topFilesByLineCount(files, limit = 8) {
  return files
    .map((file) => ({ path: toRepoPath(file), lines: countLines(file) }))
    .sort((a, b) => b.lines - a.lines)
    .slice(0, limit);
}

function warnIf(report, condition, sensor, message, detail = {}) {
  if (!condition) return;
  report.warnings.push({ sensor, message, ...detail });
}

function collectDebtGuardTelemetry() {
  const files = [
    ...walkFiles('Docs/AGENTS/Handoffs', (file) => file.endsWith('.md')),
    join(REPO, 'Docs/AGENTS/Agent_Outputs.md'),
  ].filter((file) => existsSync(file));

  let debtGuardBlocks = 0;
  let failedAttemptMentions = 0;
  let netMechanismIncreases = 0;
  let acceptedDebtMentions = 0;
  let missingRemovalTriggerMentions = 0;

  const netIncreaseFiles = [];

  for (const file of files) {
    const text = readText(file);
    const debtBlocks = countMatches(
      text,
      /\b(?:DEBT-GUARD(?: COMPACT)? RESULT|COMPACT DEBT-GUARD|Debt-Guard Result)\b/gi,
    );
    const failedAttempts = countMatches(text, /\bfailed-attempt recovery\b|\bFailed-Attempt Recovery\b/g);
    const netIncreases = countMatches(text, /\bnet mechanisms?\s*:\s*increases\b|\bnet mechanism count\s*:\s*increases\b/gi);

    debtGuardBlocks += debtBlocks;
    failedAttemptMentions += failedAttempts;
    netMechanismIncreases += netIncreases;
    acceptedDebtMentions += countMatches(text, /\bDebt accepted\b|\baccepted temporary debt\b|\bremoval trigger\b/gi);
    missingRemovalTriggerMentions += countMatches(text, /\bmissing removal trigger\b|\bno removal trigger\b/gi);

    if (netIncreases > 0) {
      netIncreaseFiles.push({ path: toRepoPath(file), count: netIncreases });
    }
  }

  return {
    filesScanned: files.length,
    debtGuardBlocks,
    failedAttemptMentions,
    netMechanismIncreases,
    acceptedDebtMentions,
    missingRemovalTriggerMentions,
    netIncreaseFiles: netIncreaseFiles.slice(0, 20),
  };
}

function collectV2Footprint() {
  const sourceFiles = [
    ...walkFiles('apps/web/src/lib/analyzer-v2', (file) => file.endsWith('.ts')),
    ...walkFiles('apps/web/src/lib/analyzer-v2-runtime', (file) => file.endsWith('.ts')),
  ];
  const testFiles = [
    ...walkFiles('apps/web/test/unit/lib/analyzer-v2', (file) => file.endsWith('.ts')),
    ...walkFiles('apps/web/test/unit/lib/analyzer-v2-runtime', (file) => file.endsWith('.ts')),
  ];

  const sourceLines = sourceFiles.reduce((sum, file) => sum + countLines(file), 0);
  const testLines = testFiles.reduce((sum, file) => sum + countLines(file), 0);
  const boundaryGuard = join(REPO, 'apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts');

  return {
    sourceFiles: sourceFiles.length,
    sourceLines,
    testFiles: testFiles.length,
    testLines,
    boundaryGuardLines: existsSync(boundaryGuard) ? countLines(boundaryGuard) : 0,
    largestSourceFiles: topFilesByLineCount(sourceFiles),
    largestTestFiles: topFilesByLineCount(testFiles),
  };
}

function collectDocFootprint() {
  const wipFiles = walkFiles('Docs/WIP', (file) => file.endsWith('.md'));
  const handoffFiles = walkFiles('Docs/AGENTS/Handoffs', (file) => file.endsWith('.md'));
  return {
    wipMarkdownFiles: wipFiles.length,
    handoffMarkdownFiles: handoffFiles.length,
  };
}

function collectV2ConsolidationMarkers() {
  const files = [
    ...walkFiles('Docs/WIP', (file) => file.endsWith('.md')),
    ...walkFiles('Docs/AGENTS/Handoffs', (file) => file.endsWith('.md')),
  ];

  const expansionPattern = /\b(?:Source Acquisition|source acquisition|EvidenceCorpus|Evidence Corpus|evidence corpus)\b/;
  const consolidationPattern = /\b(?:retire|retired|retirement|merge|merged|consolidat|obsolete|demote|demotion|unlock)\b/i;
  const candidates = [];

  for (const file of files) {
    const text = readText(file);
    const path = toRepoPath(file);
    const datedName = path.match(/(20\d{2}-\d{2}-\d{2})/)?.[1];
    if (datedName && datedName < THRESHOLDS.v2ConsolidationSince) continue;
    if (!path.includes('V2') && !/\bV2\b/.test(text.slice(0, 800))) continue;
    if (!expansionPattern.test(path) && !expansionPattern.test(text)) continue;
    if (consolidationPattern.test(text)) continue;
    candidates.push(path);
  }

  return {
    effectiveSince: THRESHOLDS.v2ConsolidationSince,
    filesNeedingConsolidationReview: candidates.slice(0, 25),
    totalFilesNeedingConsolidationReview: candidates.length,
  };
}

function buildReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    status: 'ok',
    thresholds: THRESHOLDS,
    sensors: {
      v2Footprint: collectV2Footprint(),
      docsFootprint: collectDocFootprint(),
      debtGuardTelemetry: collectDebtGuardTelemetry(),
      v2ConsolidationMarkers: collectV2ConsolidationMarkers(),
    },
    warnings: [],
  };

  warnIf(
    report,
    report.sensors.v2Footprint.sourceLines > THRESHOLDS.v2SourceLines,
    'v2_footprint',
    `V2 source lines exceed advisory threshold ${THRESHOLDS.v2SourceLines}.`,
    { sourceLines: report.sensors.v2Footprint.sourceLines },
  );
  warnIf(
    report,
    report.sensors.v2Footprint.testLines > THRESHOLDS.v2TestLines,
    'v2_footprint',
    `V2 test lines exceed advisory threshold ${THRESHOLDS.v2TestLines}.`,
    { testLines: report.sensors.v2Footprint.testLines },
  );
  warnIf(
    report,
    report.sensors.v2Footprint.boundaryGuardLines > THRESHOLDS.boundaryGuardLines,
    'boundary_guard_size',
    `Boundary guard exceeds advisory threshold ${THRESHOLDS.boundaryGuardLines}.`,
    { boundaryGuardLines: report.sensors.v2Footprint.boundaryGuardLines },
  );
  warnIf(
    report,
    report.sensors.docsFootprint.wipMarkdownFiles > THRESHOLDS.wipMarkdownFiles,
    'docs_footprint',
    `Docs/WIP markdown file count exceeds advisory threshold ${THRESHOLDS.wipMarkdownFiles}.`,
    { wipMarkdownFiles: report.sensors.docsFootprint.wipMarkdownFiles },
  );
  warnIf(
    report,
    report.sensors.docsFootprint.handoffMarkdownFiles > THRESHOLDS.handoffMarkdownFiles,
    'docs_footprint',
    `Handoff markdown file count exceeds advisory threshold ${THRESHOLDS.handoffMarkdownFiles}.`,
    { handoffMarkdownFiles: report.sensors.docsFootprint.handoffMarkdownFiles },
  );
  warnIf(
    report,
    report.sensors.debtGuardTelemetry.netMechanismIncreases > 0,
    'debt_guard_telemetry',
    'Debt-guard telemetry contains net mechanism increases; review for removal triggers.',
    { netMechanismIncreases: report.sensors.debtGuardTelemetry.netMechanismIncreases },
  );
  warnIf(
    report,
    report.sensors.v2ConsolidationMarkers.totalFilesNeedingConsolidationReview > 0,
    'v2_consolidation_markers',
    'Some V2 Source Acquisition/EvidenceCorpus docs lack consolidation markers.',
    {
      totalFilesNeedingConsolidationReview:
        report.sensors.v2ConsolidationMarkers.totalFilesNeedingConsolidationReview,
    },
  );

  report.status = report.warnings.length > 0 ? 'advisory_warn' : 'ok';
  return report;
}

function printHuman(report) {
  console.log('# Debt Sensor Report');
  console.log(`Status: ${report.status}`);
  console.log(`Generated: ${report.generatedAt}`);
  console.log('');

  const { v2Footprint, docsFootprint, debtGuardTelemetry, v2ConsolidationMarkers } = report.sensors;
  console.log('## V2 footprint');
  console.log(`Source: ${v2Footprint.sourceFiles} files / ${v2Footprint.sourceLines} lines`);
  console.log(`Tests: ${v2Footprint.testFiles} files / ${v2Footprint.testLines} lines`);
  console.log(`Boundary guard: ${v2Footprint.boundaryGuardLines} lines`);
  console.log('');

  console.log('## Docs footprint');
  console.log(`Docs/WIP markdown files: ${docsFootprint.wipMarkdownFiles}`);
  console.log(`Handoff markdown files: ${docsFootprint.handoffMarkdownFiles}`);
  console.log('');

  console.log('## Debt-guard telemetry');
  console.log(`Files scanned: ${debtGuardTelemetry.filesScanned}`);
  console.log(`Debt-guard blocks: ${debtGuardTelemetry.debtGuardBlocks}`);
  console.log(`Failed-attempt mentions: ${debtGuardTelemetry.failedAttemptMentions}`);
  console.log(`Net mechanism increases: ${debtGuardTelemetry.netMechanismIncreases}`);
  console.log(`Accepted debt/removal-trigger mentions: ${debtGuardTelemetry.acceptedDebtMentions}`);
  console.log('');

  console.log('## V2 consolidation markers');
  console.log(`Effective since: ${v2ConsolidationMarkers.effectiveSince}`);
  console.log(
    `Files needing consolidation-marker review: ${v2ConsolidationMarkers.totalFilesNeedingConsolidationReview}`,
  );
  for (const file of v2ConsolidationMarkers.filesNeedingConsolidationReview.slice(0, 10)) {
    console.log(`- ${file}`);
  }
  console.log('');

  if (report.warnings.length > 0) {
    console.log('## Advisory warnings');
    for (const warning of report.warnings) {
      console.log(`- [${warning.sensor}] ${warning.message}`);
    }
  }
}

const report = buildReport();
if (JSON_OUTPUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printHuman(report);
}

if (FAIL_ON_WARN && report.warnings.length > 0) {
  process.exitCode = 1;
}
