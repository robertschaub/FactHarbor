#!/usr/bin/env node
/**
 * Monthly prune of Docs/AGENTS/Handoffs/ and Agent_Outputs.md (steady-state).
 *
 * Usage:
 *   node scripts/monthly-prune-handoffs.mjs --dry-run
 *   node scripts/monthly-prune-handoffs.mjs
 *   node scripts/monthly-prune-handoffs.mjs --month 2026-04
 *
 * Handles the steady-state case where Agent_Outputs.md is already in
 * arrow-link index format. The one-off migration from inline format is
 * handled by migrate-agent-outputs.mjs.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, renameSync, existsSync, appendFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const HANDOFFS_DIR = join(REPO_ROOT, 'Docs/AGENTS/Handoffs');
const AGENT_OUTPUTS = join(REPO_ROOT, 'Docs/AGENTS/Agent_Outputs.md');
const ARCHIVE_BASE = join(REPO_ROOT, 'Docs/ARCHIVE');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const monthIdx = args.indexOf('--month');
let month;
if (monthIdx !== -1) {
    month = args[monthIdx + 1];
} else {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - 1);
    month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
if (!/^\d{4}-\d{2}$/.test(month)) {
    console.error(`Invalid month: ${month} (expected YYYY-MM)`);
    process.exit(1);
}

console.log(`Target month: ${month}`);
if (dryRun) console.log('[DRY RUN -- no files will be modified]');

const archiveHandoffsDir = join(ARCHIVE_BASE, 'Handoffs', month);
const archiveOutputsFile = join(ARCHIVE_BASE, `Agent_Outputs_${month}.md`);

// 1. Find handoff files to move
let handoffFiles = [];
if (existsSync(HANDOFFS_DIR)) {
    handoffFiles = readdirSync(HANDOFFS_DIR)
        .filter(f => f.startsWith(`${month}-`) && f.endsWith('.md'));
}
console.log(`\nHandoff files in ${month}: ${handoffFiles.length}`);

// 2. Parse Agent_Outputs.md index rows for target month
let raw = '';
if (existsSync(AGENT_OUTPUTS)) {
    raw = readFileSync(AGENT_OUTPUTS, 'utf8');
}

const monthEscaped = month.replace(/-/g, '\\-');
const entryRegex = new RegExp(
    `^### ${monthEscaped}-\\d{2} \\|[^\\n]*\\n(?:(?!^### \\d{4}-\\d{2}-\\d{2} \\|)[\\s\\S])*?(?=^### \\d{4}-\\d{2}-\\d{2} \\||^---\\s*$|\\Z)`,
    'gm'
);

const archivedRows = [];
let remaining = raw;
if (raw) {
    const matches = [...raw.matchAll(entryRegex)];
    console.log(`Index rows in ${month}: ${matches.length}`);
    for (const m of matches) {
        const row = m[0].trimEnd();
        // Rewrite every Docs/AGENTS/Handoffs/ -> Docs/ARCHIVE/Handoffs/<month>/
        const rewritten = row.replaceAll('Docs/AGENTS/Handoffs/', `Docs/ARCHIVE/Handoffs/${month}/`);
        archivedRows.push(rewritten);
    }
    // Remove matched rows from active content
    remaining = raw.replace(entryRegex, '');
    // Collapse 3+ blank lines
    remaining = remaining.replace(/(\r?\n){3,}/g, '\n\n');
}

console.log('\n--- Plan ---');
console.log(`Move ${handoffFiles.length} handoff file(s) to: ${archiveHandoffsDir}`);
console.log(`Archive ${archivedRows.length} index row(s) to: ${archiveOutputsFile}`);
console.log(`Update active: ${AGENT_OUTPUTS}`);

if (dryRun) {
    console.log('\n[DRY RUN complete]');
    if (handoffFiles.length > 0) {
        console.log('\nSample handoff files:');
        handoffFiles.slice(0, 5).forEach(f => console.log(`  ${f}`));
    }
    if (archivedRows.length > 0) {
        console.log('\nFirst rewritten row:');
        console.log(archivedRows[0].split('\n').slice(0, 3).join('\n'));
    }
    process.exit(0);
}

// --- Live execution ---
console.log('\n--- Executing ---');

// 3a. Move handoff files
if (handoffFiles.length > 0) {
    mkdirSync(archiveHandoffsDir, { recursive: true });
    for (const f of handoffFiles) {
        renameSync(join(HANDOFFS_DIR, f), join(archiveHandoffsDir, f));
    }
    console.log(`Moved ${handoffFiles.length} file(s) to ${archiveHandoffsDir}`);
}

// 3b. Append to archive file
if (archivedRows.length > 0) {
    const archiveHeader = existsSync(archiveOutputsFile)
        ? ''
        : `# Agent Outputs Log -- Archive ${month}\n\nArchived entries from ${month}. Handoff links point to Docs/ARCHIVE/Handoffs/${month}/.\n\n`;
    const body = archivedRows.join('\n\n---\n\n');
    appendFileSync(archiveOutputsFile, archiveHeader + body + '\n');
    console.log(`Appended ${archivedRows.length} row(s) to ${archiveOutputsFile}`);
}

// 3c. Update active Agent_Outputs.md
if (raw && archivedRows.length > 0) {
    writeFileSync(AGENT_OUTPUTS, remaining, 'utf8');
    console.log(`Updated ${AGENT_OUTPUTS}`);
}

// 4. Validate
console.log('\n--- Summary ---');
console.log(`Month: ${month}`);
console.log(`Handoff files moved: ${handoffFiles.length}`);
console.log(`Index rows archived: ${archivedRows.length}`);

if (existsSync(archiveOutputsFile)) {
    const archiveContent = readFileSync(archiveOutputsFile, 'utf8');
    const brokenCount = (archiveContent.match(new RegExp(`Docs/AGENTS/Handoffs/${month}-`, 'g')) || []).length;
    if (brokenCount > 0) {
        console.warn(`WARN: archive still contains ${brokenCount} Docs/AGENTS/Handoffs/${month}- reference(s)`);
    }
}

// Rebuild handoff index so agents see the updated corpus immediately
try {
    const indexScript = join(REPO_ROOT, 'scripts/build-index.mjs');
    if (existsSync(indexScript)) {
        execSync('node scripts/build-index.mjs --tier=2', { cwd: REPO_ROOT, stdio: 'pipe' });
        console.log('Rebuilt handoff-index.json');
    }
} catch (e) {
    console.warn('WARN: could not rebuild handoff index:', e.message);
}

console.log('\nDone.');
