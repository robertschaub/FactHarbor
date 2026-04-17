#!/usr/bin/env node
/**
 * validate-quality-expectations-drift.mjs
 *
 * Structural drift guard for the quality-expectations triad:
 *   Docs/AGENTS/Captain_Quality_Expectations.md   (human-readable narrative)
 *   Docs/AGENTS/benchmark-expectations.json       (per-family bands)
 *   Docs/AGENTS/report-quality-expectations.json  (Q-code check catalog)
 *   Docs/AGENTS/Prompt_Issue_Register.md          (consumed by /report-review Phase 8)
 *
 * v1 — three checks, narrow, zero dependencies:
 *   1. Register-schema: entries dated after the A7 cutover (2026-04-16) must
 *      carry a `qCode:` line. Legacy pre-cutover entries are exempt.
 *   2. JSON field paths: every dotted token in `checks[*].structuralCheck`
 *      rooted in a known runtime object (meta, claimVerdicts, ...) must
 *      resolve to a field declared in apps/web/src/lib/analyzer/types.ts.
 *      v1 is intentionally narrow: prose references to aggregation-stage.ts,
 *      contestationWeights, etc. are ignored.
 *   3. MD-vs-JSON bands: every benchmark-family row in
 *      Captain_Quality_Expectations.md must match the JSON truthPercentageBand,
 *      confidenceBand, and minBoundaryCount.
 *
 * Exit 0 silent on pass; exit 1 with `DRIFT: ...` lines on stderr on failure.
 *
 * Usage:  node scripts/validate-quality-expectations-drift.mjs
 * NPM:    npm run validate:quality-drift
 */

import { readFile, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ────────── Config ──────────

const REGISTER_CUTOVER = "2026-04-16"; // A7 cutover — entries with max date > this must carry qCode

const PATHS = {
  // Type-source files scanned for field declarations. Pipeline-local types
  // (e.g. RuntimeRoleModels, fallbackUsed) live in claimboundary-pipeline.ts,
  // not types.ts, so both are scanned. Kept narrow: no all-of-apps/web scan.
  typeSources: [
    "apps/web/src/lib/analyzer/types.ts",
    "apps/web/src/lib/analyzer/claimboundary-pipeline.ts",
  ],
  reportQe: "Docs/AGENTS/report-quality-expectations.json",
  benchmark: "Docs/AGENTS/benchmark-expectations.json",
  captainMd: "Docs/AGENTS/Captain_Quality_Expectations.md",
  registerMd: "Docs/AGENTS/Prompt_Issue_Register.md",
};

// Roots of runtime objects whose field paths we validate against types.ts.
// Prose tokens NOT rooted in one of these (e.g. `aggregation-stage.ts`,
// `contestationWeights`) are ignored by design.
const RUNTIME_ROOTS = [
  "meta",
  "claimVerdicts",
  "analysisWarnings",
  "evidenceItems",
  "sources",
  "searchQueries",
  "languageIntent",
  "claimBoundaries",
];

// ────────── Utilities ──────────

const drifts = [];
const drift = (where, msg) => drifts.push(`DRIFT: ${where} — ${msg}`);

async function readRepoFile(rel) {
  return readFile(resolve(REPO_ROOT, rel), "utf8");
}

async function fileExists(rel) {
  try {
    await stat(resolve(REPO_ROOT, rel));
    return true;
  } catch {
    return false;
  }
}

// ────────── Check 1: Register schema ──────────

async function checkRegisterSchema() {
  if (!(await fileExists(PATHS.registerMd))) return; // silent pass — nothing to check

  const text = await readRepoFile(PATHS.registerMd);
  // Split into entries: each entry starts with `## ` at column 0 and runs to the next `## ` or EOF.
  const entries = [];
  const lines = text.split("\n");
  let current = null;
  let startLine = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^## /.test(line)) {
      if (current !== null) entries.push({ body: current, startLine });
      current = line + "\n";
      startLine = i + 1;
    } else if (current !== null) {
      current += line + "\n";
    }
  }
  if (current !== null) entries.push({ body: current, startLine });

  for (const { body, startLine } of entries) {
    // Extract all ISO-like dates (YYYY-MM-DD) from the body
    const dates = [...body.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)].map((m) => m[1]);
    if (dates.length === 0) continue; // undatable entry — cannot decide, skip silently
    const maxDate = dates.sort().at(-1); // lexicographic works for YYYY-MM-DD
    if (maxDate <= REGISTER_CUTOVER) continue; // pre-cutover entry — exempt from qCode requirement

    // Post-cutover entry: must carry a qCode: line
    if (!/^\s*[-*]?\s*\*?\*?qCode:/im.test(body)) {
      const heading = body.split("\n")[0].trim();
      drift(
        `${PATHS.registerMd}:${startLine}`,
        `post-cutover register entry (max date ${maxDate}) lacks "qCode:" line — ${heading}`
      );
    }
  }
}

// ────────── Check 2: JSON field paths vs types.ts ──────────

function extractKnownFieldNames(src) {
  const known = new Set();
  const lines = src.split("\n");
  let inTypeBlock = false;
  let braceDepth = 0;

  for (const line of lines) {
    if (!inTypeBlock) {
      if (
        /^\s*(?:export\s+)?interface\s+\w+/.test(line)
        || /^\s*(?:export\s+)?type\s+\w+\s*=.*\{/.test(line)
        || /^\s*(?:export\s+)?function\s+\w+\([^)]*:\s*\{\s*$/.test(line)
      ) {
        inTypeBlock = true;
        braceDepth = (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
      }
    } else {
      const fieldMatch = line.match(/^\s*([A-Za-z_][\w]*)\s*\??\s*:/);
      if (fieldMatch) known.add(fieldMatch[1]);
      braceDepth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
      if (braceDepth <= 0) {
        inTypeBlock = false;
        braceDepth = 0;
      }
    }
  }

  return known;
}

/**
 * Extract dotted field-path tokens rooted in RUNTIME_ROOTS from a
 * structuralCheck prose string. Returns an array of { root, segments } pairs.
 * Tokens not rooted in RUNTIME_ROOTS are ignored (by design — v1 avoids
 * free-text noise).
 */
function extractFieldPaths(prose) {
  const rootsAlt = RUNTIME_ROOTS.join("|");
  // Match: <root>([.field | [anything]])+
  // Accept bracket indexers like [i], [*], [j], [0] — we just strip them.
  const re = new RegExp(
    `\\b(${rootsAlt})((?:\\s*\\[[^\\]]*\\]|\\.[A-Za-z_][\\w]*)+)\\b`,
    "g"
  );
  const out = [];
  let m;
  while ((m = re.exec(prose))) {
    const root = m[1];
    const tail = m[2];
    // Split tail into segments: drop brackets, keep .field tokens.
    const segments = [];
    const segRe = /\.([A-Za-z_][\w]*)/g;
    let s;
    while ((s = segRe.exec(tail))) segments.push(s[1]);
    if (segments.length > 0) out.push({ root, segments, token: m[0] });
  }
  return out;
}

async function checkJsonFieldPaths() {
  const known = new Set();
  for (const rel of PATHS.typeSources) {
    const src = await readRepoFile(rel);
    for (const name of extractKnownFieldNames(src)) known.add(name);
  }

  const qeRaw = await readRepoFile(PATHS.reportQe);
  const qe = JSON.parse(qeRaw);
  const checks = qe?.checks ?? {};

  for (const [qCode, spec] of Object.entries(checks)) {
    const prose = spec?.structuralCheck;
    if (typeof prose !== "string") continue;

    const paths = extractFieldPaths(prose);
    for (const { root, segments, token } of paths) {
      // The root itself is a field name (e.g. `meta`) — treat it as implicitly valid
      // since we enumerated RUNTIME_ROOTS explicitly. Only verify child segments.
      for (const seg of segments) {
        if (!known.has(seg)) {
          drift(
            `${PATHS.reportQe}:${qCode}`,
            `structuralCheck token "${token}" references field "${seg}" not declared in any of [${PATHS.typeSources.join(", ")}]`
          );
        }
      }
    }
  }
}

// ────────── Check 3: MD bands vs JSON bands ──────────

/**
 * Parse the benchmark-families table in Captain_Quality_Expectations.md.
 * Expected columns: | Slug | Intent | Exact input | Bands |
 * Returns [{ slug, bandsProse, mdLine }].
 */
function parseMdFamilies(mdText) {
  const rows = [];
  const lines = mdText.split("\n");
  let inTable = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Table rows start with `|`. Header + separator precede data rows.
    if (/^\s*\|.*\|.*\|.*\|.*\|\s*$/.test(line)) {
      // Skip header and separator rows
      if (/^\s*\|\s*Slug\s*\|/i.test(line)) { inTable = true; continue; }
      if (/^\s*\|[\s\-:|]+\|\s*$/.test(line)) continue;
      if (!inTable) continue;

      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.length < 4) continue;
      const slugCell = cells[0];
      const bandsCell = cells[3];
      // Slug cell typically wraps the slug in backticks: `bundesrat-rechtskraftig`
      const slugMatch = slugCell.match(/`([\w\-]+)`/);
      if (!slugMatch) { inTable = false; continue; } // table ended; next row isn't a family
      rows.push({ slug: slugMatch[1], bandsProse: bandsCell, mdLine: i + 1 });
    } else if (inTable && line.trim() === "") {
      // Blank line — table ended
      inTable = false;
    }
  }
  return rows;
}

function parseBandsProse(prose) {
  // Returns { truthMin, truthMax, confMin, confMax, minBoundary } or null fields if not found.
  // Accept en-dash (–, U+2013), em-dash (—, U+2014), hyphen-minus (-), and minus-sign (−, U+2212).
  const dash = "[\\u2012\\u2013\\u2014\\u2212-]";
  const reTruth = new RegExp(`truth\\s+(\\d+)\\s*${dash}\\s*(\\d+)`, "i");
  const reConf = new RegExp(`conf(?:idence)?\\s+(\\d+)\\s*${dash}\\s*(\\d+)`, "i");
  const reMinBoundary = /min(?:imum)?\s+(\d+)\s+boundar/i;

  const t = prose.match(reTruth);
  const c = prose.match(reConf);
  const b = prose.match(reMinBoundary);

  return {
    truthMin: t ? Number(t[1]) : null,
    truthMax: t ? Number(t[2]) : null,
    confMin: c ? Number(c[1]) : null,
    confMax: c ? Number(c[2]) : null,
    minBoundary: b ? Number(b[1]) : null,
    hasNoBands: /no bands|not (?:yet )?valid|no band(s)?\s+until/i.test(prose),
  };
}

async function checkMdVsJsonBands() {
  const mdText = await readRepoFile(PATHS.captainMd);
  const benchRaw = await readRepoFile(PATHS.benchmark);
  const bench = JSON.parse(benchRaw);
  const families = Object.fromEntries((bench?.families ?? []).map((f) => [f.slug, f]));

  const rows = parseMdFamilies(mdText);
  for (const { slug, bandsProse, mdLine } of rows) {
    const fam = families[slug];
    if (!fam) {
      drift(
        `${PATHS.captainMd}:${mdLine}`,
        `family "${slug}" appears in MD table but not in ${PATHS.benchmark}`
      );
      continue;
    }

    const md = parseBandsProse(bandsProse);

    // Families legitimately without bands (e.g. asylum-wwii-de) — silently skip if both sides agree.
    const jsonHasNoBands =
      fam.truthPercentageBand == null &&
      fam.confidenceBand == null &&
      fam.minBoundaryCount == null;

    if (md.hasNoBands && jsonHasNoBands) continue;
    if (md.hasNoBands !== jsonHasNoBands) {
      drift(
        `${PATHS.captainMd}:${mdLine}`,
        `family "${slug}" band-presence disagrees: MD ${md.hasNoBands ? "no bands" : "has bands"} vs JSON ${jsonHasNoBands ? "null bands" : "has bands"}`
      );
      continue;
    }

    // truthPercentageBand
    if (fam.truthPercentageBand) {
      if (md.truthMin !== fam.truthPercentageBand.min) {
        drift(
          `${PATHS.captainMd}:${mdLine}`,
          `family "${slug}" truth min: MD ${md.truthMin} ≠ JSON ${fam.truthPercentageBand.min}`
        );
      }
      if (md.truthMax !== fam.truthPercentageBand.max) {
        drift(
          `${PATHS.captainMd}:${mdLine}`,
          `family "${slug}" truth max: MD ${md.truthMax} ≠ JSON ${fam.truthPercentageBand.max}`
        );
      }
    }

    // confidenceBand
    if (fam.confidenceBand) {
      if (md.confMin !== fam.confidenceBand.min) {
        drift(
          `${PATHS.captainMd}:${mdLine}`,
          `family "${slug}" conf min: MD ${md.confMin} ≠ JSON ${fam.confidenceBand.min}`
        );
      }
      if (md.confMax !== fam.confidenceBand.max) {
        drift(
          `${PATHS.captainMd}:${mdLine}`,
          `family "${slug}" conf max: MD ${md.confMax} ≠ JSON ${fam.confidenceBand.max}`
        );
      }
    }

    // minBoundaryCount
    if (fam.minBoundaryCount != null && md.minBoundary !== fam.minBoundaryCount) {
      drift(
        `${PATHS.captainMd}:${mdLine}`,
        `family "${slug}" min boundaries: MD ${md.minBoundary} ≠ JSON ${fam.minBoundaryCount}`
      );
    }
  }
}

// ────────── Main ──────────

async function main() {
  try {
    await checkRegisterSchema();
    await checkJsonFieldPaths();
    await checkMdVsJsonBands();
  } catch (err) {
    process.stderr.write(`validate-quality-expectations-drift: error — ${err?.message ?? err}\n`);
    process.exit(2);
  }

  if (drifts.length === 0) process.exit(0);
  for (const d of drifts) process.stderr.write(d + "\n");
  process.exit(1);
}

main();
