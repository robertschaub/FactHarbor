#!/usr/bin/env node
/**
 * One-off migration for the Agent_Outputs.md redesign (2026-04-13).
 * See Docs/WIP/2026-04-13_Agent_Outputs_Purpose_Review.md for the full design.
 *
 * Usage:
 *   node scripts/migrate-agent-outputs.mjs --dry-run
 *   node scripts/migrate-agent-outputs.mjs --case-c-decisions <path>
 *   node scripts/migrate-agent-outputs.mjs --current-month 2026-04 --dry-run
 *
 * Phases 0, 1 (no-op for this dataset), 1.5, 2, 3, 5.
 * Phase 4 (Handoff_Protocol.md edits) is NOT handled here -- manual per the design.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const HANDOFFS_DIR = join(REPO_ROOT, 'Docs/AGENTS/Handoffs');
const AGENT_OUTPUTS = join(REPO_ROOT, 'Docs/AGENTS/Agent_Outputs.md');
const ARCHIVE_BASE = join(REPO_ROOT, 'Docs/ARCHIVE');
const WIP_DIR = join(REPO_ROOT, 'Docs/WIP');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const caseCIdx = args.indexOf('--case-c-decisions');
const caseCDecisionsPath = caseCIdx !== -1 ? args[caseCIdx + 1] : null;
const currentMonthIdx = args.indexOf('--current-month');
const currentMonth = currentMonthIdx !== -1 ? args[currentMonthIdx + 1]
    : `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}`;

if (!/^\d{4}-\d{2}$/.test(currentMonth)) {
    console.error(`Invalid currentMonth: ${currentMonth}`);
    process.exit(1);
}
const [cy, cm] = currentMonth.split('-').map(Number);
const priorDate = new Date(Date.UTC(cy, cm - 2, 1));
const priorMonth = `${priorDate.getUTCFullYear()}-${String(priorDate.getUTCMonth() + 1).padStart(2, '0')}`;

console.log(`Current month (warm): ${currentMonth}`);
console.log(`Prior month (archive): ${priorMonth}`);
if (dryRun) console.log('[DRY RUN -- no files will be modified]\n');

const raw = readFileSync(AGENT_OUTPUTS, 'utf8');

// --- Parse entries ---
// Entry starts at "### YYYY-MM-DD |" and runs until the next such header or EOF.
const headerRe = /^### (\d{4}-\d{2}-\d{2}) \| ([^|]+) \| ([^|]+) \| (.+?)\s*$/gm;
const headerMatches = [...raw.matchAll(headerRe)];
const entries = [];
for (let i = 0; i < headerMatches.length; i++) {
    const start = headerMatches[i].index;
    const end = i + 1 < headerMatches.length ? headerMatches[i + 1].index : raw.length;
    const body = raw.slice(start, end).replace(/\n---\s*\n\s*$/, '\n').trimEnd();
    const [, date, role, tool, title] = headerMatches[i];
    entries.push({
        date,
        role: role.trim(),
        tool: tool.trim(),
        title: title.trim(),
        body,
        month: date.slice(0, 7)
    });
}
console.log(`Total entries parsed: ${entries.length}`);

// --- Bucket by month ---
const byMonth = new Map();
for (const e of entries) {
    if (!byMonth.has(e.month)) byMonth.set(e.month, []);
    byMonth.get(e.month).push(e);
}
const months = [...byMonth.keys()].sort();
console.log('Per-month counts:');
months.forEach(m => console.log(`  ${m}: ${byMonth.get(m).length}`));

const cold = entries.filter(e => e.month < priorMonth);
const prior = entries.filter(e => e.month === priorMonth);
const warm = entries.filter(e => e.month === currentMonth);
const orphan = entries.filter(e => e.month > currentMonth);

console.log(`\nPhase 0 partition: cold=${cold.length}, prior=${prior.length}, warm=${warm.length}, orphan=${orphan.length}`);
if (orphan.length > 0) {
    console.error(`ERROR: ${orphan.length} entries dated after current month (${currentMonth}). Aborting.`);
    process.exit(1);
}

// --- Phase 2 classification ---
function classify(body) {
    // A = handoff path appears inside the **Files touched:** field block
    const filesTouchedBlock = /^\*\*Files touched:\*\*([\s\S]*?)(?=^\*\*|\Z)/m.exec(body);
    const inFilesTouched = filesTouchedBlock
        ? /Docs\/AGENTS\/Handoffs\/[^\s,`)]+\.md/.test(filesTouchedBlock[1])
        : false;
    if (inFilesTouched) return 'A';
    const anywhere = /Docs\/AGENTS\/Handoffs\/[^\s,`)]+\.md/.test(body);
    if (!anywhere) return 'B';
    return 'C';
}

function firstHandoffPath(text) {
    const m = /Docs\/AGENTS\/Handoffs\/[^\s,`)]+\.md/.exec(text);
    return m ? m[0] : null;
}

function firstHandoffInFilesTouched(body) {
    const block = /^\*\*Files touched:\*\*([\s\S]*?)(?=^\*\*|\Z)/m.exec(body);
    if (!block) return null;
    return firstHandoffPath(block[1]);
}

function forNextAgentLine(body) {
    const m = /^\*\*For next agent[^:]*:\*\*\s*([\s\S]*?)(?=^\*\*|\Z)/m.exec(body);
    if (!m) return '(no For-next-agent field)';
    let s = m[1].trim().replace(/\s+/g, ' ');
    if (s.length > 250) s = s.slice(0, 247) + '...';
    return s;
}

function openItemsFlag(body) {
    const m = /^\*\*Open items:\*\*\s*([\s\S]*?)(?=^\*\*|\Z)/m.exec(body);
    if (!m) return 'no';
    const txt = m[1].trim().toLowerCase();
    if (/^none[. ]?$/.test(txt) || txt === 'no' || txt === 'n/a' || txt === '-' || txt === '') return 'no';
    return 'yes';
}

function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60).replace(/_+$/, '');
}

const classified = { A: [], B: [], C: [] };
for (const e of warm) {
    const cls = classify(e.body);
    const refPath = firstHandoffPath(e.body);
    classified[cls].push({ ...e, cls, refPath });
}

console.log('\nPhase 2 warm classification:');
console.log(`  A (link existing):       ${classified.A.length}`);
console.log(`  B (materialize new):     ${classified.B.length}`);
console.log(`  C (manual review):       ${classified.C.length}`);

// --- Case C report (skip regeneration if decisions file was provided) ---
let caseCReportPath = null;
if (classified.C.length > 0 && !caseCDecisionsPath) {
    const lines = [
        '# Case C -- Ambiguous Entries Requiring Manual Classification',
        '',
        `Generated: ${new Date().toISOString()}`,
        '',
        'These entries reference a Handoffs/ path OUTSIDE the Files touched field.',
        'Decide for each whether the referenced handoff is the canonical detailed version of THIS task',
        '(same-task -> Significant, link existing) or a DIFFERENT task this entry merely cites',
        '(different-task -> Standard, materialize new file).',
        '',
        'Mark each entry below with: **DECISION: Significant** or **DECISION: Standard**',
        'Then pass this file via --case-c-decisions to the live run.',
        ''
    ];
    for (const item of classified.C) {
        lines.push('---');
        lines.push(`## ${item.date} :: ${item.role} :: ${item.title}`);
        lines.push('');
        lines.push(`**Referenced handoff (outside Files touched):** ${item.refPath}`);
        lines.push('');
        lines.push('**DECISION:** _(fill in: Significant | Standard)_');
        lines.push('');
        lines.push('Entry excerpt:');
        lines.push('```');
        let excerpt = item.body;
        if (excerpt.length > 1500) excerpt = excerpt.slice(0, 1500) + '\n... (truncated)';
        lines.push(excerpt);
        lines.push('```');
        lines.push('');
    }
    caseCReportPath = join(WIP_DIR, '2026-04-13_Migration_Case_C_Review.md');
    writeFileSync(caseCReportPath, lines.join('\n'), 'utf8');
    console.log(`\nCase C review report: ${caseCReportPath}`);
}

// --- Load Case C decisions if provided ---
const caseCDecisions = new Map();  // key: "date::title" -> decision
if (caseCDecisionsPath && existsSync(caseCDecisionsPath)) {
    const dr = readFileSync(caseCDecisionsPath, 'utf8');
    const decRe = /^## (\d{4}-\d{2}-\d{2}) :: [^:]+:: (.+?)\s*$[\s\S]*?^\*\*DECISION:\*\*\s*(Significant|Standard)\b/gm;
    for (const m of dr.matchAll(decRe)) {
        caseCDecisions.set(`${m[1]}::${m[2].trim()}`, m[3]);
    }
    console.log(`Loaded ${caseCDecisions.size} Case-C decision(s)`);
}

// --- Live-run precondition: all Case C resolved ---
if (!dryRun && classified.C.length > 0) {
    const unresolved = classified.C.filter(i => !caseCDecisions.has(`${i.date}::${i.title}`));
    if (unresolved.length > 0) {
        console.error(`\nCannot proceed live -- ${unresolved.length} Case-C entries unresolved:`);
        unresolved.forEach(i => console.error(`  ${i.date} :: ${i.title}`));
        console.error('\nReview the Case-C report, fill in DECISION fields, then re-run with --case-c-decisions.');
        process.exit(1);
    }
}

// --- Build index rows and new-file list ---
function buildIndexRow({ date, role, tool, title }, tier, forNext, openItems, handoffRel) {
    return [
        `### ${date} | ${role} | ${tool} | ${title} -- [${tier}] [open-items: ${openItems}]`,
        `**For next agent:** ${forNext}`,
        `→ ${handoffRel}`
    ].join('\n');
}

const indexRows = [];
const newHandoffFiles = [];

for (const item of classified.A) {
    const path = firstHandoffInFilesTouched(item.body) || item.refPath;
    indexRows.push(buildIndexRow(item, 'Significant', forNextAgentLine(item.body), openItemsFlag(item.body), path));
}

for (const item of classified.B) {
    const slug = slugify(`${item.role}_${item.title}`);
    const filename = `${item.date}_${slug}.md`;
    const handoffRel = `Docs/AGENTS/Handoffs/${filename}`;
    newHandoffFiles.push({ path: join(HANDOFFS_DIR, filename), body: item.body });
    indexRows.push(buildIndexRow(item, 'Standard', forNextAgentLine(item.body), openItemsFlag(item.body), handoffRel));
}

for (const item of classified.C) {
    const decision = caseCDecisions.get(`${item.date}::${item.title}`);
    if (!decision) continue;  // dry-run with no decisions
    if (decision === 'Significant') {
        indexRows.push(buildIndexRow(item, 'Significant', forNextAgentLine(item.body), openItemsFlag(item.body), item.refPath));
    } else {
        const slug = slugify(`${item.role}_${item.title}`);
        const filename = `${item.date}_${slug}.md`;
        const handoffRel = `Docs/AGENTS/Handoffs/${filename}`;
        newHandoffFiles.push({ path: join(HANDOFFS_DIR, filename), body: item.body });
        indexRows.push(buildIndexRow(item, 'Standard', forNextAgentLine(item.body), openItemsFlag(item.body), handoffRel));
    }
}

// --- Phase 1.5 prior-month handoff files + archived inline entries ---
let priorHandoffFiles = [];
if (existsSync(HANDOFFS_DIR)) {
    priorHandoffFiles = readdirSync(HANDOFFS_DIR)
        .filter(f => f.startsWith(`${priorMonth}-`) && f.endsWith('.md'));
}

const archivedPriorEntries = prior.map(e =>
    e.body.replaceAll('Docs/AGENTS/Handoffs/', `Docs/ARCHIVE/Handoffs/${priorMonth}/`)
);

// --- Plan summary ---
console.log('\n--- Plan ---');
console.log(`Phase 1 cold bulk archive: ${cold.length} entries (no-op if 0)`);
console.log(`Phase 1.5 prior-month (${priorMonth}):`);
console.log(`  Handoff files to move:    ${priorHandoffFiles.length}`);
console.log(`  Inline entries to archive: ${archivedPriorEntries.length}`);
console.log(`Phase 2 warm (${currentMonth}):`);
console.log(`  New handoff files to create: ${newHandoffFiles.length}`);
console.log(`  Index rows to write:         ${indexRows.length}`);

if (dryRun) {
    console.log('\n[DRY RUN complete]');
    if (classified.C.length > 0 && caseCDecisions.size === 0) {
        console.log(`\nNext: review ${caseCReportPath}, annotate DECISION fields, re-run with --case-c-decisions.`);
    } else if (classified.C.length > 0) {
        console.log('\nNext: re-run without --dry-run to execute live.');
    }
    process.exit(0);
}

// =============================================================================
// LIVE EXECUTION
// =============================================================================
console.log('\n--- Executing ---');

// Phase 1 cold bulk archive (if any)
if (cold.length > 0) {
    const coldArchive = join(ARCHIVE_BASE, `Agent_Outputs_pre-${priorMonth}.md`);
    const header = `# Agent Outputs Log -- Archive (pre-${priorMonth})\n\nBulk archive of entries older than the prior-month boundary at migration time.\n\n`;
    const body = cold.map(e => e.body).join('\n\n---\n\n');
    writeFileSync(coldArchive, header + body + '\n', 'utf8');
    console.log(`Wrote ${cold.length} cold entries to ${coldArchive}`);
}

// Phase 1.5a move prior-month handoff files
if (priorHandoffFiles.length > 0) {
    const priorArchiveDir = join(ARCHIVE_BASE, 'Handoffs', priorMonth);
    mkdirSync(priorArchiveDir, { recursive: true });
    for (const f of priorHandoffFiles) {
        renameSync(join(HANDOFFS_DIR, f), join(priorArchiveDir, f));
    }
    console.log(`Moved ${priorHandoffFiles.length} handoff file(s) to ${priorArchiveDir}`);
}

// Phase 1.5b archived prior-month inline entries
if (archivedPriorEntries.length > 0) {
    const priorArchiveFile = join(ARCHIVE_BASE, `Agent_Outputs_${priorMonth}.md`);
    const header = `# Agent Outputs Log -- Archive ${priorMonth}\n\nArchived inline entries from ${priorMonth}. Embedded Handoffs/ paths have been rewritten to Docs/ARCHIVE/Handoffs/${priorMonth}/.\n\n`;
    const body = archivedPriorEntries.join('\n\n---\n\n');
    writeFileSync(priorArchiveFile, header + body + '\n', 'utf8');
    console.log(`Wrote ${archivedPriorEntries.length} archived entries to ${priorArchiveFile}`);
}

// Phase 2 create new handoff files
let createdCount = 0;
const seenPaths = new Set();
for (const nf of newHandoffFiles) {
    if (seenPaths.has(nf.path)) {
        console.warn(`Skipping duplicate target path: ${nf.path}`);
        continue;
    }
    seenPaths.add(nf.path);
    if (existsSync(nf.path)) {
        console.warn(`Skipping existing file: ${nf.path}`);
        continue;
    }
    writeFileSync(nf.path, nf.body, 'utf8');
    createdCount++;
}
console.log(`Created ${createdCount} new handoff file(s) in ${HANDOFFS_DIR}`);

// Phase 3 rewrite active Agent_Outputs.md as index
const indexHeader = [
    '# Agent Outputs Log -- Active Index',
    '',
    'This file is a **triage-weight index**, not a full log. Each entry is a 3-line summary',
    'with a link to the full handoff file in `Docs/AGENTS/Handoffs/`.',
    '',
    'Full protocol: `Docs/AGENTS/Policies/Handoff_Protocol.md`.',
    'Archived entries: `Docs/ARCHIVE/Agent_Outputs_YYYY-MM.md` + `Docs/ARCHIVE/Handoffs/YYYY-MM/`.',
    '',
    '---',
    ''
].join('\n');

// Sort newest first
indexRows.sort((a, b) => {
    const da = a.slice(4, 14);
    const db = b.slice(4, 14);
    return db.localeCompare(da);
});
const indexBody = indexRows.join('\n\n---\n\n');
writeFileSync(AGENT_OUTPUTS, indexHeader + indexBody + '\n', 'utf8');
console.log(`Rewrote ${AGENT_OUTPUTS} with ${indexRows.length} index row(s)`);

// --- Phase 5 validate ---
console.log('\n--- Validation ---');
const priorArchiveFile = join(ARCHIVE_BASE, `Agent_Outputs_${priorMonth}.md`);
if (existsSync(priorArchiveFile)) {
    const content = readFileSync(priorArchiveFile, 'utf8');
    const brokenCount = (content.match(/Docs\/AGENTS\/Handoffs\//g) || []).length;
    if (brokenCount > 0) {
        console.warn(`WARN: archive still contains ${brokenCount} Docs/AGENTS/Handoffs/ reference(s)`);
    } else {
        console.log('OK: archive has 0 Docs/AGENTS/Handoffs/ references');
    }
}
const activeLines = readFileSync(AGENT_OUTPUTS, 'utf8').split('\n').length;
console.log(`Active Agent_Outputs.md line count: ${activeLines}`);
if (activeLines > 600) {
    console.warn(`WARN: active line count > 600 (target ~100-500 for 132 warm entries)`);
}

console.log('\nMigration complete.');
console.log('Next manual steps:');
console.log('  1. Edit Docs/AGENTS/Policies/Handoff_Protocol.md per Phase 4 of the design.');
console.log('  2. Git review the diff before committing.');
console.log('  3. Commit as a separate PR after the root-trim PR lands.');
