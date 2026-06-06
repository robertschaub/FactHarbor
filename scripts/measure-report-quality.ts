#!/usr/bin/env -S node --experimental-strip-types
'use strict';

/*
 * Report Quality Measurement - Phase 1 zero-spend scorer.
 *
 * Reads stored Jobs.ResultJson plus optional AnalysisMetrics.MetricsJson and
 * emits ReportQualityVector-style measurements for the Captain benchmark panel.
 * No LLM calls, no live jobs, no DB writes.
 *
 * Usage:
 *   npx tsx scripts/measure-report-quality.ts
 *   npx tsx scripts/measure-report-quality.ts --family hydrogen-en --limit 25
 *   npx tsx scripts/measure-report-quality.ts --compare <buildA-prefix> <buildB-prefix>
 *   npx tsx scripts/measure-report-quality.ts --json
 *
 * Env:
 *   FH_DB_PATH  override DB path (default apps/api/factharbor.db under repo root)
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const HARD_FAILURE_WARNINGS = new Set([
  'analysis_generation_failed',
  'llm_provider_error',
  'report_damaged',
]);

const VERDICT_ORDER = {
  FALSE: -3,
  'MOSTLY-FALSE': -2,
  'LEANING-FALSE': -1,
  MIXED: 0,
  UNVERIFIED: 0,
  'LEANING-TRUE': 1,
  'MOSTLY-TRUE': 2,
  TRUE: 3,
};

const VERDICT_BANDS = [
  { label: 'FALSE', min: 0, max: 14 },
  { label: 'MOSTLY-FALSE', min: 15, max: 28 },
  { label: 'LEANING-FALSE', min: 29, max: 42 },
  { label: 'MIXED', min: 43, max: 57 },
  { label: 'LEANING-TRUE', min: 58, max: 71 },
  { label: 'MOSTLY-TRUE', min: 72, max: 85 },
  { label: 'TRUE', min: 86, max: 100 },
];

const MIXED_CONFIDENCE_THRESHOLD = 45;
const INSUFFICIENT_CONFIDENCE_MAX = 24;
const COST_CALL_EPSILON = 0.01;
const CALIBRATION_BRIER_EPSILON = 0.02;
const CLAIM_JACCARD_EPSILON = 0.10;
const BOOTSTRAP_RESAMPLES = 1000;

const DEFAULT_AGGREGATION = {
  centralityWeights: { high: 3.0, medium: 2.0, low: 1.0 },
  harmPotentialMultiplier: 1.5,
  harmPotentialMultipliers: { critical: 1.5, high: 1.2, medium: 1.0, low: 1.0 },
  derivativeMultiplier: 0.5,
  anchorClaimMultiplier: 2.5,
  triangulation: {
    strongAgreementBoost: 0.15,
    moderateAgreementBoost: 0.05,
    singleBoundaryPenalty: -0.10,
    conflictedFlag: true,
  },
  articleAdjudication: {
    enabled: true,
    maxDeviationFromBaseline: 30,
    borderlineMargin: 10,
  },
};

const DEFAULT_PROBATIVE_VALUE_WEIGHTS = { high: 1.0, medium: 0.9, low: 0.5 };

const DEFAULT_BASELINE_RECOMPUTE_CONFIG = {
  aggregation: {
    centralityWeights: DEFAULT_AGGREGATION.centralityWeights,
    harmPotentialMultipliers: DEFAULT_AGGREGATION.harmPotentialMultipliers,
    derivativeMultiplier: DEFAULT_AGGREGATION.derivativeMultiplier,
    anchorClaimMultiplier: DEFAULT_AGGREGATION.anchorClaimMultiplier,
    triangulation: {
      strongAgreementBoost: DEFAULT_AGGREGATION.triangulation.strongAgreementBoost,
      moderateAgreementBoost: DEFAULT_AGGREGATION.triangulation.moderateAgreementBoost,
      singleBoundaryPenalty: DEFAULT_AGGREGATION.triangulation.singleBoundaryPenalty,
    },
  },
  probativeValueWeights: DEFAULT_PROBATIVE_VALUE_WEIGHTS,
};

const KNOWN_METRIC_TASK_TYPES = new Set([
  'understand',
  'claim_selection',
  'research',
  'cluster',
  'verdict',
  'aggregate',
  'supplemental',
  'other',
]);

const runtimeWarnings = [];

function repoRoot(startDir) {
  let dir = path.resolve(startDir);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'FactHarbor.sln'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

const ROOT = repoRoot(process.cwd());
let DB_PATH = process.env.FH_DB_PATH || path.join(ROOT, 'apps', 'api', 'factharbor.db');

function usage(exitCode) {
  const out = [
    'Report Quality Measurement - Phase 1 zero-spend scorer',
    '',
    'Usage:',
    '  npx tsx scripts/measure-report-quality.ts [options]',
    '',
    'Options:',
    '  --family <slug>              Score one benchmark family only',
    '  --limit <n>                  Limit queried reports after DB ordering',
    '  --build <prefix>             Keep rows whose executed/git build starts with prefix',
    '  --compare <a> <b>            Print a shadow matrix-diff for two build prefixes',
    '  --include-plastic-headline   Include plastic-en in headline aggregate',
    '  --json                       Emit JSON instead of the text report',
    '  --db <path>                  SQLite DB path override',
    '  --help                       Show this help',
    '',
    'No live jobs or LLM calls are made.',
  ].join('\n');
  (exitCode === 0 ? console.log : console.error)(out);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    family: null,
    limit: null,
    build: null,
    compare: null,
    json: false,
    includePlasticHeadline: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') usage(0);
    else if (a === '--family') args.family = requireValue(argv, ++i, '--family');
    else if (a === '--limit') args.limit = parsePositiveInt(requireValue(argv, ++i, '--limit'), '--limit');
    else if (a === '--build') args.build = requireValue(argv, ++i, '--build');
    else if (a === '--compare') {
      const left = requireValue(argv, ++i, '--compare <a>');
      const right = requireValue(argv, ++i, '--compare <b>');
      args.compare = [left, right];
    } else if (a === '--json') args.json = true;
    else if (a === '--include-plastic-headline') args.includePlasticHeadline = true;
    else if (a === '--db') DB_PATH = path.resolve(requireValue(argv, ++i, '--db'));
    else {
      console.error(`Unknown argument: ${a}`);
      usage(2);
    }
  }

  if (args.build && args.compare) {
    console.error('Use either --build or --compare, not both. --build filters to one build; --compare needs two unfiltered build prefixes.');
    usage(2);
  }

  return args;
}

function requireValue(argv, index, flag) {
  if (index >= argv.length || argv[index].startsWith('--')) {
    console.error(`Missing value for ${flag}`);
    usage(2);
  }
  return argv[index];
}

function parsePositiveInt(raw, flag) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    console.error(`${flag} must be a positive integer`);
    usage(2);
  }
  return value;
}

function readJsonFile(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function sqliteJson(query) {
  let out;
  try {
    out = execFileSync('sqlite3', ['-readonly', '-cmd', '.timeout 10000', '-json', DB_PATH, query], {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 1024,
    });
  } catch (error) {
    const detail = error && typeof error === 'object' && 'stderr' in error
      ? String(error.stderr || error.message || error)
      : String(error);
    throw new Error(`sqlite3 read failed for ${DB_PATH}: ${detail.trim() || 'unknown error'}`);
  }
  const trimmed = out.trim();
  return trimmed ? JSON.parse(trimmed) : [];
}

function sqlQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

function normalizeVerdict(label) {
  if (label == null) return null;
  return String(label).trim().toUpperCase().replace(/\s+/g, '-').replace(/_/g, '-');
}

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampPct(value, fallback = 0) {
  const n = finiteNumber(value);
  if (n == null) return fallback;
  return clamp(n, 0, 100);
}

function sameJsonValue(left, right) {
  if (left === right) return true;
  if (typeof left !== typeof right) return false;
  if (left == null || right == null) return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => sameJsonValue(value, right[index]));
  }
  if (typeof left === 'object') {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every((key, index) => key === rightKeys[index] && sameJsonValue(left[key], right[key]));
  }
  return false;
}

function normalizePercentage(value, fallback = 50) {
  const n = finiteNumber(value);
  if (n == null) return fallback;
  const normalized = n >= 0 && n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function mean(values) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length === 0) return null;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

function standardDeviation(values) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length < 2) return 0;
  const m = mean(nums);
  return Math.sqrt(nums.reduce((sum, v) => sum + (v - m) ** 2, 0) / nums.length);
}

function pct(count, total) {
  if (!total) return null;
  return count / total;
}

function fmtPct(value) {
  if (value == null || !Number.isFinite(value)) return 'n/a';
  return `${Math.round(value * 100)}%`;
}

function fmtNum(value, digits = 1) {
  if (value == null || !Number.isFinite(value)) return 'n/a';
  return Number(value).toFixed(digits);
}

function shortBuild(build) {
  if (!build) return 'unknown';
  const s = String(build);
  const plus = s.indexOf('+');
  const clean = plus >= 0 ? s.slice(0, plus) : s;
  const suffix = plus >= 0 ? `+${s.slice(plus + 1, plus + 7)}` : '';
  return `${clean.slice(0, 8)}${suffix}`;
}

function buildMatchesPrefix(build, prefix) {
  if (!prefix) return true;
  return String(build || '').toLowerCase().startsWith(String(prefix).toLowerCase());
}

function buildKey(row, result) {
  return row.executedWebGitCommitHash
    || row.gitCommitHash
    || result?.meta?.executedWebGitCommitHash
    || result?.meta?.gitCommitHash
    || 'unknown';
}

function confidenceTier(confidence) {
  const c = clampPct(confidence, 0);
  if (c >= 75) return 'HIGH';
  if (c >= 50) return 'MEDIUM';
  if (c >= 25) return 'LOW';
  return 'INSUFFICIENT';
}

function percentageToVerdict(truthPercentage, confidence) {
  const truth = normalizePercentage(truthPercentage, 50);
  const conf = normalizePercentage(confidence, 0);
  if (truth >= 86) return 'TRUE';
  if (truth >= 72) return 'MOSTLY-TRUE';
  if (truth >= 58) return 'LEANING-TRUE';
  if (truth >= 43) {
    return conf >= MIXED_CONFIDENCE_THRESHOLD ? 'MIXED' : 'UNVERIFIED';
  }
  if (truth >= 29) return 'LEANING-FALSE';
  if (truth >= 15) return 'MOSTLY-FALSE';
  return 'FALSE';
}

function verdictSide(label) {
  const v = normalizeVerdict(label);
  if (!v) return null;
  const order = VERDICT_ORDER[v];
  if (order == null) return null;
  if (v === 'UNVERIFIED') return null;
  if (order > 0) return 1;
  if (order < 0) return -1;
  return 0;
}

function expectedSide(family) {
  const labels = (family.expectedVerdictLabels || []).map(normalizeVerdict).filter(Boolean);
  const sides = [...new Set(labels.map(verdictSide).filter((v) => v === 1 || v === -1))];
  if (sides.length === 1) return sides[0];
  const band = family.truthPercentageBand;
  if (band && Number.isFinite(band.min) && Number.isFinite(band.max)) {
    const mid = (band.min + band.max) / 2;
    if (mid > 57) return 1;
    if (mid < 43) return -1;
  }
  return 0;
}

function truthBandDistance(truth, family, noise) {
  const n = finiteNumber(truth);
  const band = family.truthPercentageBand;
  if (n == null || !band) return null;
  const min = band.min - noise;
  const max = band.max + noise;
  if (n >= min && n <= max) return 0;
  return n < min ? min - n : n - max;
}

function confidenceBandDistance(confidence, family) {
  const n = finiteNumber(confidence);
  const band = family.confidenceBand;
  if (n == null || !band) return null;
  if (n >= band.min && n <= band.max) return 0;
  return n < band.min ? band.min - n : n - band.max;
}

function isInTruthBand(truth, family, noise) {
  const d = truthBandDistance(truth, family, noise);
  return d != null && d === 0;
}

function isInConfidenceBand(confidence, family) {
  const d = confidenceBandDistance(confidence, family);
  return d != null && d === 0;
}

function verdictAdjacent(observed, family) {
  const obs = normalizeVerdict(observed);
  if (!obs || obs === 'UNVERIFIED') return false;
  const observedOrder = VERDICT_ORDER[obs];
  if (!Number.isFinite(observedOrder)) return false;
  return (family.expectedVerdictLabels || [])
    .map(normalizeVerdict)
    .filter((v) => v && v !== 'UNVERIFIED' && v !== 'MIXED')
    .some((v) => Math.abs((VERDICT_ORDER[v] ?? 99) - observedOrder) === 1);
}

function computeC4Score({ family, result, row, noise }) {
  const label = normalizeVerdict(result?.verdict || row.verdictLabel);
  const truth = finiteNumber(result?.truthPercentage ?? row.truthPercentage);
  const confidence = finiteNumber(result?.confidence ?? row.confidence);
  const expectedLabels = new Set((family.expectedVerdictLabels || []).map(normalizeVerdict));
  const labelOK = label != null && expectedLabels.has(label);
  const truthOK = isInTruthBand(truth, family, noise);
  const confidenceOK = isInConfidenceBand(confidence, family);
  const truthLabelInBand = Boolean(labelOK && truthOK);
  const inBand = Boolean(labelOK && truthOK && confidenceOK);

  if (label === 'UNVERIFIED') {
    return {
      label,
      truth,
      confidence,
      labelOK,
      truthOK,
      confidenceOK,
      truthLabelInBand,
      inBand,
      baseTiered: 25,
      harmAdjustedC4: 25,
      mode: 'abstention',
      directionalFlip: false,
    };
  }

  if (inBand) {
    return {
      label,
      truth,
      confidence,
      labelOK,
      truthOK,
      confidenceOK,
      truthLabelInBand,
      inBand,
      baseTiered: 100,
      harmAdjustedC4: 100,
      mode: 'exact',
      directionalFlip: false,
    };
  }

  const expSide = expectedSide(family);
  const obsSide = verdictSide(label);
  const directionalFlip = expSide !== 0 && obsSide !== 0 && obsSide != null && obsSide !== expSide;

  if (directionalFlip) {
    const conf = clampPct(confidence, 0);
    return {
      label,
      truth,
      confidence,
      labelOK,
      truthOK,
      confidenceOK,
      truthLabelInBand,
      inBand,
      baseTiered: 0,
      harmAdjustedC4: 0 - conf,
      mode: 'directional_flip',
      directionalFlip: true,
    };
  }

  const adjacent = verdictAdjacent(label, family);
  if (adjacent) {
    return {
      label,
      truth,
      confidence,
      labelOK,
      truthOK,
      confidenceOK,
      truthLabelInBand,
      inBand,
      baseTiered: 70,
      harmAdjustedC4: 70,
      mode: 'adjacent',
      directionalFlip: false,
    };
  }

  const truthDistance = truthBandDistance(truth, family, noise);
  const confidenceDistance = confidenceBandDistance(confidence, family);
  const finiteDistances = [truthDistance, confidenceDistance].filter((v) => Number.isFinite(v));
  const distance = finiteDistances.length ? Math.max(...finiteDistances) : 70;
  const baseTiered = Math.max(0, 70 - distance);

  return {
    label,
    truth,
    confidence,
    labelOK,
    truthOK,
    confidenceOK,
    truthLabelInBand,
    inBand,
    baseTiered,
    harmAdjustedC4: baseTiered,
    mode: 'same_side_out_of_band',
    directionalFlip: false,
  };
}

function warningTypes(result) {
  return (Array.isArray(result?.analysisWarnings) ? result.analysisWarnings : [])
    .map((w) => w && w.type)
    .filter(Boolean);
}

function computeRuntimeIntegrity(row, result) {
  const hardWarnings = warningTypes(result).filter((type) => HARD_FAILURE_WARNINGS.has(type));
  const label = normalizeVerdict(result?.verdict || row.verdictLabel);
  const truth = finiteNumber(result?.truthPercentage ?? row.truthPercentage);
  const confidence = finiteNumber(result?.confidence ?? row.confidence);
  const missingVerdict = !label || truth == null || confidence == null;
  const passed = row.status === 'SUCCEEDED' && hardWarnings.length === 0 && !missingVerdict;
  return {
    role: 'GATE',
    passed,
    status: row.status,
    hardWarnings,
    missingVerdict,
    qCode: 'Q-HF1',
  };
}

function computeLabelTruthConsistency(row, result) {
  const label = normalizeVerdict(result?.verdict || row.verdictLabel);
  const truth = finiteNumber(result?.truthPercentage ?? row.truthPercentage);
  const confidence = finiteNumber(result?.confidence ?? row.confidence);
  const expected = percentageToVerdict(truth, confidence);
  return {
    role: 'GATE',
    passed: label === expected,
    observed: label,
    expected,
    truth,
    confidence,
  };
}

function evidenceIdSet(result) {
  return new Set((Array.isArray(result?.evidenceItems) ? result.evidenceItems : [])
    .map((e) => e && e.id)
    .filter(Boolean));
}

function extractEvidenceIds(text) {
  if (typeof text !== 'string' || text.length === 0) return [];
  const ids = new Set();
  const re = /\bEV_[A-Za-z0-9_-]+\b/g;
  let match;
  while ((match = re.exec(text)) != null) ids.add(match[0]);
  return [...ids];
}

function expandCompactEvidenceRange(token) {
  const match = /^EV_(\d{3})-(\d{3})$/.exec(token);
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isInteger(start) || !Number.isInteger(end) || end < start || end - start > 200) return null;
  const ids = [];
  for (let n = start; n <= end; n++) {
    ids.push(`EV_${String(n).padStart(3, '0')}`);
  }
  return ids;
}

function parseEvidenceReferences(text, knownEvidenceIds) {
  const exactKnownIds = new Set();
  const expandedRangeIds = new Set();
  const compactRanges = [];
  const invalidUnknownTokens = [];
  if (typeof text !== 'string' || text.length === 0) {
    return { exactKnownIds, expandedRangeIds, compactRanges, invalidUnknownTokens };
  }

  const re = /\bEV_[A-Za-z0-9]+(?:-[A-Za-z0-9]+)?\b/g;
  let match;
  while ((match = re.exec(text)) != null) {
    const token = match[0];
    if (knownEvidenceIds.has(token)) {
      exactKnownIds.add(token);
      continue;
    }

    const expanded = expandCompactEvidenceRange(token);
    if (expanded && expanded.every((id) => knownEvidenceIds.has(id))) {
      compactRanges.push({ token, expandedIds: expanded });
      for (const id of expanded) expandedRangeIds.add(id);
      continue;
    }

    invalidUnknownTokens.push(token);
  }

  return { exactKnownIds, expandedRangeIds, compactRanges, invalidUnknownTokens };
}

function computeCitationInSet(result) {
  const knownEvidenceIds = evidenceIdSet(result);
  const invalidArrayIds = [];
  const invalidKnownReasonIds = [];
  const invalidUnknownReasonTokens = [];
  const compactRanges = [];
  const verdicts = Array.isArray(result?.claimVerdicts) ? result.claimVerdicts : [];
  if (verdicts.length === 0) {
    return {
      role: 'GATE',
      passed: false,
      knownEvidenceCount: knownEvidenceIds.size,
      invalidArrayIds,
      invalidKnownReasonIds,
      invalidUnknownReasonTokens,
      compactRanges,
      reason: 'claimVerdicts is empty',
    };
  }

  for (const verdict of verdicts) {
    const cited = [
      ...(Array.isArray(verdict?.supportingEvidenceIds) ? verdict.supportingEvidenceIds : []),
      ...(Array.isArray(verdict?.contradictingEvidenceIds) ? verdict.contradictingEvidenceIds : []),
    ].filter(Boolean);
    const citedSet = new Set(cited);

    for (const id of cited) {
      if (!knownEvidenceIds.has(id)) {
        invalidArrayIds.push({ claimId: verdict?.claimId, id });
      }
    }

    const reasonText = `${verdict?.verdictReason || ''}\n${verdict?.reasoning || ''}`;
    const reasonRefs = parseEvidenceReferences(reasonText, knownEvidenceIds);
    for (const range of reasonRefs.compactRanges) compactRanges.push({ claimId: verdict?.claimId, ...range });
    for (const token of reasonRefs.invalidUnknownTokens) {
      invalidUnknownReasonTokens.push({ claimId: verdict?.claimId, token });
    }

    const knownReasonIds = new Set([
      ...reasonRefs.exactKnownIds,
      ...reasonRefs.expandedRangeIds,
    ]);
    for (const id of knownReasonIds) {
      if (!citedSet.has(id)) {
        invalidKnownReasonIds.push({ claimId: verdict?.claimId, id });
      }
    }
  }

  return {
    role: 'GATE',
    passed: invalidArrayIds.length === 0 && invalidKnownReasonIds.length === 0 && invalidUnknownReasonTokens.length === 0,
    knownEvidenceCount: knownEvidenceIds.size,
    invalidArrayIds,
    invalidKnownReasonIds,
    invalidUnknownReasonTokens,
    compactRanges,
    note: 'Compact ranges are accepted only when every expanded evidence ID exists and is cited by the verdict.',
  };
}

function coverageBoundariesForClaim(result, claimId) {
  const matrix = result?.coverageMatrix;
  if (!matrix || !Array.isArray(matrix.claims) || !Array.isArray(matrix.boundaries) || !Array.isArray(matrix.counts)) {
    return [];
  }
  const rowIndex = matrix.claims.indexOf(claimId);
  if (rowIndex < 0) return [];
  const counts = Array.isArray(matrix.counts[rowIndex]) ? matrix.counts[rowIndex] : [];
  const boundaryIds = [];
  for (let i = 0; i < matrix.boundaries.length; i++) {
    if (Number(counts[i]) > 0) boundaryIds.push(matrix.boundaries[i]);
  }
  return boundaryIds;
}

function computeTriangulationScoreForVerdict(verdict, result) {
  const cfg = DEFAULT_AGGREGATION.triangulation;
  const boundaryIds = coverageBoundariesForClaim(result, verdict?.claimId);
  const findings = Array.isArray(verdict?.boundaryFindings) ? verdict.boundaryFindings : [];
  let supporting = 0;
  let contradicting = 0;

  for (const boundaryId of boundaryIds) {
    const finding = findings.find((f) => f && f.boundaryId === boundaryId);
    if (!finding) continue;
    if (finding.evidenceDirection === 'supports') supporting++;
    else if (finding.evidenceDirection === 'contradicts') contradicting++;
  }

  const boundaryCount = boundaryIds.length;
  if (boundaryCount <= 1) {
    return { boundaryCount, supporting, contradicting, level: 'weak', factor: cfg.singleBoundaryPenalty };
  }
  if (supporting >= 3) {
    return { boundaryCount, supporting, contradicting, level: 'strong', factor: cfg.strongAgreementBoost };
  }
  if (supporting >= 2 && contradicting <= 1) {
    return { boundaryCount, supporting, contradicting, level: 'moderate', factor: cfg.moderateAgreementBoost };
  }
  if (supporting > 0 && contradicting > 0 && Math.abs(supporting - contradicting) <= 1) {
    return { boundaryCount, supporting, contradicting, level: 'conflicted', factor: 0 };
  }
  if (supporting > contradicting) {
    return { boundaryCount, supporting, contradicting, level: 'moderate', factor: cfg.moderateAgreementBoost };
  }
  return { boundaryCount, supporting, contradicting, level: 'weak', factor: cfg.singleBoundaryPenalty };
}

function computeDerivativeFactor(verdict, evidenceById) {
  const supportingIds = Array.isArray(verdict?.supportingEvidenceIds) ? verdict.supportingEvidenceIds : [];
  if (supportingIds.length === 0) return 1.0;
  const supportingEvidence = supportingIds.map((id) => evidenceById.get(id)).filter(Boolean);
  if (supportingEvidence.length === 0) return 1.0;
  const derivativeCount = supportingEvidence.filter((e) => e.isDerivative === true && e.derivativeClaimUnverified !== true).length;
  const derivativeRatio = derivativeCount / supportingEvidence.length;
  return 1.0 - derivativeRatio * (1.0 - DEFAULT_AGGREGATION.derivativeMultiplier);
}

function computeAnchorPreservedClaimIds(result) {
  const claims = Array.isArray(result?.understanding?.atomicClaims) ? result.understanding.atomicClaims : [];
  const anchor = result?.understanding?.contractValidationSummary?.truthConditionAnchor;
  const anchorText = typeof anchor?.anchorText === 'string' ? anchor.anchorText.trim() : '';
  const anchorTextLower = anchorText.toLowerCase();
  const reported = new Set(
    (Array.isArray(anchor?.validPreservedIds) && anchor.validPreservedIds.length > 0
      ? anchor.validPreservedIds
      : (Array.isArray(anchor?.preservedInClaimIds) ? anchor.preservedInClaimIds : []))
      .filter(Boolean),
  );

  const structural = new Set();
  if (anchorTextLower) {
    for (const claim of claims) {
      const statement = typeof claim?.statement === 'string' ? claim.statement.toLowerCase() : '';
      if (statement.includes(anchorTextLower)) structural.add(claim.id);
    }
  }

  return structural.size > 0 ? structural : reported;
}

function recomputeAggregationBaseline(result) {
  const claimVerdicts = Array.isArray(result?.claimVerdicts) ? result.claimVerdicts : [];
  const claims = Array.isArray(result?.understanding?.atomicClaims) ? result.understanding.atomicClaims : [];
  const evidence = Array.isArray(result?.evidenceItems) ? result.evidenceItems : [];
  const evidenceById = new Map(evidence.map((item) => [item && item.id, item]).filter(([id]) => Boolean(id)));
  const anchorPreservedClaimIds = computeAnchorPreservedClaimIds(result);

  const weightsData = [];
  for (const verdict of claimVerdicts) {
    const claim = claims.find((c) => c && c.id === verdict?.claimId);
    const centrality = claim?.centrality ?? 'low';
    const centralityWeight = DEFAULT_AGGREGATION.centralityWeights[centrality] ?? 1.0;
    const harmLevel = verdict?.harmPotential ?? 'medium';
    const harmWeight = DEFAULT_AGGREGATION.harmPotentialMultipliers[harmLevel] ?? 1.0;
    const confidenceFactor = clampPct(verdict?.confidence, 0) / 100;
    const triangulationFactor = computeTriangulationScoreForVerdict(verdict, result).factor ?? 0;
    const derivativeFactor = computeDerivativeFactor(verdict, evidenceById);
    const anchorFactor = anchorPreservedClaimIds.has(verdict?.claimId)
      ? DEFAULT_AGGREGATION.anchorClaimMultiplier
      : 1.0;

    const supportingIds = Array.isArray(verdict?.supportingEvidenceIds) ? verdict.supportingEvidenceIds : [];
    const probativeFactors = supportingIds
      .map((id) => evidenceById.get(id))
      .filter(Boolean)
      .map((item) => DEFAULT_PROBATIVE_VALUE_WEIGHTS[item.probativeValue ?? 'medium'] ?? 1.0);
    const probativeFactor = probativeFactors.length > 0
      ? probativeFactors.reduce((sum, value) => sum + value, 0) / probativeFactors.length
      : 1.0;

    const finalWeight = centralityWeight
      * harmWeight
      * confidenceFactor
      * (1 + triangulationFactor)
      * derivativeFactor
      * anchorFactor
      * probativeFactor;

    const isCounterClaim = claim?.claimDirection === 'contradicts_thesis';
    const rawTruth = clampPct(verdict?.truthPercentage, 50);
    const effectiveTruth = isCounterClaim ? 100 - rawTruth : rawTruth;
    const thesisRelevance = claim?.thesisRelevance;
    const supportingCount = supportingIds.length;
    const contradictingCount = Array.isArray(verdict?.contradictingEvidenceIds) ? verdict.contradictingEvidenceIds.length : 0;

    let weight = Math.max(0, finalWeight);
    if (thesisRelevance && thesisRelevance !== 'direct') weight = 0;
    if (verdict?.confidenceTier === 'INSUFFICIENT' && supportingCount + contradictingCount === 0) weight = 0;

    weightsData.push({
      claimId: verdict?.claimId,
      truthPercentage: effectiveTruth,
      confidence: clampPct(verdict?.confidence, 0),
      weight,
    });
  }

  const totalWeight = weightsData.reduce((sum, item) => sum + item.weight, 0);
  const weightedTruthPercentage = totalWeight > 0
    ? weightsData.reduce((sum, item) => sum + item.truthPercentage * item.weight, 0) / totalWeight
    : 50;
  const weightedConfidence = totalWeight > 0
    ? weightsData.reduce((sum, item) => sum + item.confidence * item.weight, 0) / totalWeight
    : 0;
  const hasIntegrityDowngrade = claimVerdicts.some((verdict) => verdict?.verdictReason === 'verdict_integrity_failure');
  const effectiveWeightedConfidence = hasIntegrityDowngrade
    ? Math.min(weightedConfidence, INSUFFICIENT_CONFIDENCE_MAX)
    : weightedConfidence;

  return {
    baselineAggregate: {
      truthPercentage: Math.round(weightedTruthPercentage),
      confidence: Math.round(effectiveWeightedConfidence),
    },
    totalWeight,
    weightsData,
  };
}

function pickConfigValue(source, fallback) {
  return source === undefined ? fallback : source;
}

function normalizeConsumedBaselineCalcConfig(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const calc = snapshot.calculation && typeof snapshot.calculation === 'object'
    ? snapshot.calculation
    : snapshot;
  const aggregation = calc.aggregation && typeof calc.aggregation === 'object'
    ? calc.aggregation
    : calc;
  if (!aggregation || typeof aggregation !== 'object') return null;
  const triangulation = aggregation.triangulation && typeof aggregation.triangulation === 'object'
    ? aggregation.triangulation
    : {};
  return {
    aggregation: {
      centralityWeights: pickConfigValue(aggregation.centralityWeights, DEFAULT_AGGREGATION.centralityWeights),
      harmPotentialMultipliers: pickConfigValue(aggregation.harmPotentialMultipliers, DEFAULT_AGGREGATION.harmPotentialMultipliers),
      derivativeMultiplier: pickConfigValue(aggregation.derivativeMultiplier, DEFAULT_AGGREGATION.derivativeMultiplier),
      anchorClaimMultiplier: pickConfigValue(aggregation.anchorClaimMultiplier, DEFAULT_AGGREGATION.anchorClaimMultiplier),
      triangulation: {
        strongAgreementBoost: pickConfigValue(
          triangulation.strongAgreementBoost,
          DEFAULT_AGGREGATION.triangulation.strongAgreementBoost,
        ),
        moderateAgreementBoost: pickConfigValue(
          triangulation.moderateAgreementBoost,
          DEFAULT_AGGREGATION.triangulation.moderateAgreementBoost,
        ),
        singleBoundaryPenalty: pickConfigValue(
          triangulation.singleBoundaryPenalty,
          DEFAULT_AGGREGATION.triangulation.singleBoundaryPenalty,
        ),
      },
    },
    probativeValueWeights: pickConfigValue(
      calc.probativeValueWeights ?? aggregation.probativeValueWeights,
      DEFAULT_PROBATIVE_VALUE_WEIGHTS,
    ),
  };
}

function computeAggregationFaithfulness(result) {
  const calcConfigSnapshot = result?.meta?.calcConfigSnapshot
    || result?.configSnapshot?.calc
    || result?.configSnapshots?.calc
    || null;
  if (!calcConfigSnapshot) {
    return {
      role: 'GATE',
      available: false,
      passed: null,
      reason: 'config-provenance-missing',
      note: 'ResultJson does not persist the calc config used by aggregation; recompute would be diagnostic only.',
    };
  }
  const consumedConfig = normalizeConsumedBaselineCalcConfig(calcConfigSnapshot);
  const usesDefaultConfig = sameJsonValue(consumedConfig, DEFAULT_BASELINE_RECOMPUTE_CONFIG);
  if (!usesDefaultConfig) {
    return {
      role: 'GATE',
      available: false,
      passed: null,
      reason: 'calc-config-provenance-not-consumable',
      consumedConfig,
      expectedConsumedConfig: DEFAULT_BASELINE_RECOMPUTE_CONFIG,
      note: 'ResultJson exposes calc config provenance, but this Phase 1 scorer only recomputes baseline aggregation when consumed weighting fields match source defaults.',
    };
  }

  const stored = result?.adjudicationPath?.baselineAggregate;
  if (!stored || !Number.isFinite(Number(stored.truthPercentage)) || !Number.isFinite(Number(stored.confidence))) {
    return {
      role: 'GATE',
      available: false,
      passed: null,
      reason: 'adjudicationPath.baselineAggregate absent',
    };
  }

  const recomputed = recomputeAggregationBaseline(result);
  const truthDelta = Math.abs(recomputed.baselineAggregate.truthPercentage - Number(stored.truthPercentage));
  const confidenceDelta = Math.abs(recomputed.baselineAggregate.confidence - Number(stored.confidence));
  const passed = truthDelta <= 1 && confidenceDelta <= 1;

  return {
    role: 'GATE',
    available: true,
    passed,
    stored,
    recomputed: recomputed.baselineAggregate,
    deltas: { truth: truthDelta, confidence: confidenceDelta },
    note: 'Compared to adjudicationPath.baselineAggregate; finalAggregate may be guard/narrative adjusted.',
  };
}

function claimStatements(result) {
  return (Array.isArray(result?.understanding?.atomicClaims) ? result.understanding.atomicClaims : [])
    .map((claim) => typeof claim?.statement === 'string' ? claim.statement : '')
    .filter(Boolean);
}

function includesAnchor(text, anchor) {
  if (typeof text !== 'string' || typeof anchor !== 'string') return false;
  return text.toLocaleLowerCase().includes(anchor.toLocaleLowerCase());
}

function computeFloors(result, family) {
  const statements = claimStatements(result);
  const claims = Array.isArray(result?.understanding?.atomicClaims) ? result.understanding.atomicClaims : [];
  const claimById = new Map(claims.map((claim) => [claim?.id, claim]).filter(([id]) => Boolean(id)));
  const verdicts = Array.isArray(result?.claimVerdicts) ? result.claimVerdicts : [];
  const claimCount = statements.length || finiteNumber(result?.meta?.claimCount) || verdicts.length || 0;
  const boundaryCount = finiteNumber(result?.meta?.boundaryCount) ?? (Array.isArray(result?.claimBoundaries) ? result.claimBoundaries.length : 0);

  const minDistinctEvents = finiteNumber(family.minDistinctEvents);
  const minBoundaryCount = finiteNumber(family.minBoundaryCount);
  const claimCountPass = minDistinctEvents == null ? null : claimCount >= minDistinctEvents;
  const boundaryCountPass = minBoundaryCount == null ? null : boundaryCount >= minBoundaryCount;

  const anchors = Array.isArray(family.anchorTokens) ? family.anchorTokens.filter(Boolean) : [];
  const joinedStatements = statements.join('\n');
  const missingAnchorsAnyClaim = anchors.filter((anchor) => !includesAnchor(joinedStatements, anchor));
  const primaryClaimId = verdicts[0]?.claimId || claims[0]?.id || null;
  const primaryStatement = (primaryClaimId && typeof claimById.get(primaryClaimId)?.statement === 'string')
    ? claimById.get(primaryClaimId).statement
    : (statements[0] || '');
  const missingAnchorsPrimaryClaim = anchors.filter((anchor) => !includesAnchor(primaryStatement, anchor));
  const sideClaimOnlyAnchors = anchors.filter(
    (anchor) => missingAnchorsPrimaryClaim.includes(anchor) && !missingAnchorsAnyClaim.includes(anchor),
  );
  const anchorPass = anchors.length === 0 ? null : missingAnchorsPrimaryClaim.length === 0;

  const perClaimCitationFailures = [];
  if (verdicts.length === 0) perClaimCitationFailures.push('no-claim-verdicts');
  for (const verdict of verdicts) {
    const directionalEvidenceCount =
      (Array.isArray(verdict?.supportingEvidenceIds) ? verdict.supportingEvidenceIds.length : 0)
      + (Array.isArray(verdict?.contradictingEvidenceIds) ? verdict.contradictingEvidenceIds.length : 0);
    if (directionalEvidenceCount <= 0) perClaimCitationFailures.push(verdict?.claimId || verdict?.id || 'unknown');
  }

  return {
    claimCount: {
      role: 'FLOOR',
      passed: claimCountPass,
      observed: claimCount,
      minimum: minDistinctEvents,
    },
    boundaryCount: {
      role: 'FLOOR',
      passed: boundaryCountPass,
      observed: boundaryCount,
      minimum: minBoundaryCount,
    },
    anchorSurvival: {
      role: 'FLOOR',
      passed: anchorPass,
      anchors,
      missingAnchorsAnyClaim,
      missingAnchorsPrimaryClaim,
      sideClaimOnlyAnchors,
      primaryClaimId,
      method: 'all anchors must appear in the primary claim path; side-claim-only preservation is reported but does not pass Q-S1.3',
    },
    perClaimCitationFloor: {
      role: 'FLOOR',
      passed: perClaimCitationFailures.length === 0,
      failedClaimIds: perClaimCitationFailures,
    },
  };
}

function computeColourSignals(result) {
  const evidence = Array.isArray(result?.evidenceItems) ? result.evidenceItems : [];
  const sourceType = {};
  const probativeValue = {};
  const evidenceBasis = {};
  const applicability = {};
  for (const item of evidence) {
    bump(sourceType, item?.sourceType || item?.evidenceScope?.sourceType || 'missing');
    bump(probativeValue, item?.probativeValue || 'missing');
    bump(evidenceBasis, item?.evidenceBasis || 'missing');
    bump(applicability, item?.applicability || 'missing');
  }

  const roleFallbacks = [];
  const runtimeRoleModels = result?.meta?.runtimeRoleModels || {};
  for (const [role, trace] of Object.entries(runtimeRoleModels)) {
    if (trace && trace.fallbackUsed === true) roleFallbacks.push(role);
  }

  return {
    role: 'COLOUR',
    sourceType,
    probativeValue,
    evidenceBasis,
    applicability,
    runtimeRoleModels,
    roleFallbacks,
    tigerScoreAvailability: result?.tigerScore ? 'available' : 'n/a',
    explanationQualityAvailability: result?.explanationQualityCheck ? 'available' : 'n/a',
  };
}

function bump(map, key, by = 1) {
  map[key] = (map[key] || 0) + by;
}

function summarizeMetrics(metrics) {
  if (!metrics) {
    return {
      available: false,
      richCost: null,
      taskTypes: {},
      unmappedTaskTypes: [],
    };
  }

  const taskTypes = {};
  const unmapped = new Set();
  for (const call of Array.isArray(metrics.llmCalls) ? metrics.llmCalls : []) {
    const taskType = KNOWN_METRIC_TASK_TYPES.has(call?.taskType) ? call.taskType : 'other';
    if (call?.taskType && !KNOWN_METRIC_TASK_TYPES.has(call.taskType)) unmapped.add(call.taskType);
    const bucket = taskTypes[taskType] || {
      calls: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      durationMs: 0,
      retries: 0,
      failures: 0,
      schemaNonCompliant: 0,
    };
    bucket.calls++;
    bucket.promptTokens += finiteNumber(call?.promptTokens) || 0;
    bucket.completionTokens += finiteNumber(call?.completionTokens) || 0;
    bucket.totalTokens += finiteNumber(call?.totalTokens) || 0;
    bucket.cacheReadInputTokens += finiteNumber(call?.cacheReadInputTokens) || 0;
    bucket.cacheCreationInputTokens += finiteNumber(call?.cacheCreationInputTokens) || 0;
    bucket.durationMs += finiteNumber(call?.durationMs) || 0;
    bucket.retries += finiteNumber(call?.retries) || 0;
    if (call?.success === false) bucket.failures++;
    if (call?.schemaCompliant === false) bucket.schemaNonCompliant++;
    taskTypes[taskType] = bucket;
  }

  return {
    available: true,
    richCost: {
      estimatedCostUSD: finiteNumber(metrics.estimatedCostUSD),
      totalDurationMs: finiteNumber(metrics.totalDurationMs),
      tokenCounts: metrics.tokenCounts || null,
      phaseTimings: metrics.phaseTimings || null,
    },
    taskTypes,
    unmappedTaskTypes: [...unmapped].sort(),
  };
}

function jobWallClockMs(row) {
  const created = Date.parse(row.createdUtc);
  const updated = Date.parse(row.updatedUtc);
  if (!Number.isFinite(created) || !Number.isFinite(updated) || updated < created) return null;
  return updated - created;
}

function computeEfficiency(row, result, metrics) {
  const coarseLlmCalls = finiteNumber(result?.meta?.llmCalls);
  const roleCalls = Object.values(result?.meta?.runtimeRoleModels || {})
    .reduce((sum, trace) => sum + (finiteNumber(trace?.callCount) || 0), 0);
  const metricsSummary = summarizeMetrics(metrics);

  return {
    role: 'RANK_TIE_BAND',
    coarseCost: {
      unit: 'ResultJson.meta.llmCalls',
      llmCalls: coarseLlmCalls,
    },
    richCost: metricsSummary.richCost,
    metricsAvailable: metricsSummary.available,
    jobWallClockMs: jobWallClockMs(row),
    taskTypes: metricsSummary.taskTypes,
    unmappedTaskTypes: metricsSummary.unmappedTaskTypes,
    roleTraceColour: {
      runtimeRoleModels: result?.meta?.runtimeRoleModels || {},
      roleTraceCallCount: roleCalls,
      note: 'runtimeRoleModels.callCount is role tracing only, not the total cost denominator.',
    },
  };
}

function computeCalibrationSignals(c4) {
  const confidence = clampPct(c4.confidence, 0) / 100;
  const hit = c4.truthLabelInBand ? 1 : 0;
  return {
    role: 'RANK_BUILD',
    hit,
    confidence,
    brierContribution: (confidence - hit) ** 2,
    note: 'Brier target is truth/label success only; confidence-band success is not part of the target.',
  };
}

function computeReportTier(vector) {
  if (!vector.integrity.runtime.passed) return 'BLOCK';
  const gateChecks = [
    vector.integrity.labelTruthConsistency,
    vector.integrity.citationInSet,
    vector.integrity.aggregationFaithfulness,
  ];
  const floorChecks = [
    vector.claims.claimCount,
    vector.claims.anchorSurvival,
    vector.evidence.boundaryCount,
    vector.evidence.perClaimCitationFloor,
  ];
  const gateFailure = gateChecks.some((check) => check.available !== false && check.passed === false);
  const floorFailure = floorChecks.some((check) => check.passed === false);
  if (gateFailure || floorFailure || !vector.overallVerdict.c4.inBand) return 'WATCH';
  return 'PASS';
}

function scoreReport(row, family, metrics, noise) {
  let result;
  try {
    result = JSON.parse(row.resultJson);
  } catch (error) {
    const vector = {
      jobId: row.jobId,
      familySlug: family.slug,
      build: row.executedWebGitCommitHash || row.gitCommitHash || 'unknown',
      integrity: {
        runtime: { role: 'GATE', passed: false, status: row.status, hardWarnings: [], qCode: 'Q-HF1' },
        parse: { passed: false, error: error.message },
      },
      reportTier: 'BLOCK',
    };
    return { vector, result: null, parseError: error };
  }

  const c4 = computeC4Score({ family, result, row, noise });
  const floors = computeFloors(result, family);
  const vector = {
    jobId: row.jobId,
    familySlug: family.slug,
    headlineEligible: family.slug !== 'plastic-en',
    inputValue: row.inputValue,
    createdUtc: row.createdUtc,
    updatedUtc: row.updatedUtc,
    build: buildKey(row, result),
    buildShort: shortBuild(buildKey(row, result)),
    promptContentHash: row.promptContentHash || result?.meta?.promptContentHash || null,
    schemaVersion: result?._schemaVersion || result?.meta?.schemaVersion || null,
    integrity: {
      runtime: computeRuntimeIntegrity(row, result),
      labelTruthConsistency: computeLabelTruthConsistency(row, result),
      citationInSet: computeCitationInSet(result),
      aggregationFaithfulness: computeAggregationFaithfulness(result),
    },
    claims: {
      claimCount: floors.claimCount,
      anchorSurvival: floors.anchorSurvival,
      stability: { available: false, reason: 'build-level signal; computed in rollup when n >= 2' },
    },
    evidence: {
      boundaryCount: floors.boundaryCount,
      perClaimCitationFloor: floors.perClaimCitationFloor,
      colour: computeColourSignals(result),
    },
    claimVerdicts: {
      structural: {
        verdictCount: Array.isArray(result?.claimVerdicts) ? result.claimVerdicts.length : 0,
      },
      judge: { available: false, reason: 'Phase 2 live judge' },
    },
    overallVerdict: {
      c4,
      observed: {
        label: c4.label,
        truthPercentage: c4.truth,
        confidence: c4.confidence,
      },
      expected: {
        labels: family.expectedVerdictLabels || [],
        truthPercentageBand: family.truthPercentageBand || null,
        confidenceBand: family.confidenceBand || null,
      },
    },
    narrative: {
      structuralAvailability: result?.explanationQualityCheck ? 'available' : 'n/a',
      judge: { available: false, reason: 'Phase 2 live judge' },
    },
    stability: { available: false, reason: 'requires grouped repeated reports' },
    calibrationSignals: computeCalibrationSignals(c4),
    efficiency: computeEfficiency(row, result, metrics),
    neutralitySignals: { available: false, reason: 'Phase 3 live/paired calibration runner' },
  };
  vector.reportTier = computeReportTier(vector);
  return { vector, result, parseError: null };
}

function parseMetricsRows(jobIds) {
  const metricsByJob = new Map();
  for (const ids of chunk(jobIds, 400)) {
    if (ids.length === 0) continue;
    const idList = ids.map(sqlQuote).join(',');
    let rows;
    try {
      rows = sqliteJson(
        `SELECT m.JobId AS jobId, m.CreatedUtc AS metricsCreatedUtc, m.MetricsJson AS metricsJson
         FROM AnalysisMetrics m
         JOIN (
           SELECT JobId, MAX(CreatedUtc) AS CreatedUtc
           FROM AnalysisMetrics
           WHERE JobId IN (${idList})
           GROUP BY JobId
         ) latest
         ON latest.JobId = m.JobId AND latest.CreatedUtc = m.CreatedUtc
         WHERE m.JobId IN (${idList})`,
      );
    } catch (error) {
      runtimeWarnings.push(`AnalysisMetrics unavailable; rich cost marked n/a. ${String(error.message || error)}`);
      return metricsByJob;
    }
    for (const row of rows) {
      try {
        metricsByJob.set(row.jobId, JSON.parse(row.metricsJson));
      } catch {
        metricsByJob.set(row.jobId, null);
      }
    }
  }
  return metricsByJob;
}

function queryJobs(families, args) {
  const inputValues = families.map((f) => f.inputValue).filter(Boolean);
  if (inputValues.length === 0) return [];
  const inList = inputValues.map(sqlQuote).join(',');
  const where = [
    'ResultJson IS NOT NULL',
    `InputValue IN (${inList})`,
  ];
  if (args.build) {
    const prefix = sqlQuote(`${args.build}%`);
    where.push(`(ExecutedWebGitCommitHash LIKE ${prefix} OR GitCommitHash LIKE ${prefix})`);
  }
  const limitClause = args.limit ? ` LIMIT ${args.limit}` : '';
  return sqliteJson(
    `SELECT JobId AS jobId,
            Status AS status,
            CreatedUtc AS createdUtc,
            UpdatedUtc AS updatedUtc,
            InputType AS inputType,
            InputValue AS inputValue,
            VerdictLabel AS verdictLabel,
            TruthPercentage AS truthPercentage,
            Confidence AS confidence,
            GitCommitHash AS gitCommitHash,
            ExecutedWebGitCommitHash AS executedWebGitCommitHash,
            PromptContentHash AS promptContentHash,
            ResultJson AS resultJson
     FROM Jobs
     WHERE ${where.join(' AND ')}
     ORDER BY CreatedUtc ASC${limitClause};`,
  );
}

function jaccard(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const value of setA) if (setB.has(value)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function normalizedClaimSet(vectorResult) {
  const statements = claimStatements(vectorResult);
  return new Set(statements.map((s) => s.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim()).filter(Boolean));
}

function computeGroupStability(scoredGroup) {
  if (scoredGroup.length < 2) {
    return { available: false, n: scoredGroup.length };
  }
  const truths = scoredGroup.map((item) => item.vector.overallVerdict.c4.truth).filter((v) => Number.isFinite(v));
  const confidences = scoredGroup.map((item) => item.vector.overallVerdict.c4.confidence).filter((v) => Number.isFinite(v));
  const tiers = new Set(confidences.map(confidenceTier));
  const claimSets = scoredGroup.map((item) => normalizedClaimSet(item.result));
  const pairwiseClaimJaccards = [];
  for (let i = 0; i < claimSets.length; i++) {
    for (let k = i + 1; k < claimSets.length; k++) {
      pairwiseClaimJaccards.push(jaccard(claimSets[i], claimSets[k]));
    }
  }
  return {
    available: true,
    n: scoredGroup.length,
    truthSpread: truths.length >= 2 ? Math.max(...truths) - Math.min(...truths) : null,
    confidenceTiers: [...tiers].sort(),
    claimJaccardMean: mean(pairwiseClaimJaccards),
    claimJaccardMin: pairwiseClaimJaccards.length ? Math.min(...pairwiseClaimJaccards) : null,
  };
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function bootstrapMeanCi(values, resamples = 1000, seed = 0xC4C4) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length === 0) return null;
  if (nums.length === 1) return { low: nums[0], high: nums[0], method: 'single' };
  const rnd = seededRandom(seed ^ nums.length);
  const samples = [];
  for (let i = 0; i < resamples; i++) {
    let sum = 0;
    for (let k = 0; k < nums.length; k++) {
      sum += nums[Math.floor(rnd() * nums.length)];
    }
    samples.push(sum / nums.length);
  }
  samples.sort((a, b) => a - b);
  return {
    low: samples[Math.floor(samples.length * 0.025)],
    high: samples[Math.floor(samples.length * 0.975)],
    method: 'bootstrap',
  };
}

function normalApproxCi(values) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length === 0) return null;
  const m = mean(nums);
  if (nums.length === 1) return { low: m, high: m, method: 'single' };
  const se = standardDeviation(nums) / Math.sqrt(nums.length);
  return { low: m - 1.96 * se, high: m + 1.96 * se, method: 'normal' };
}

function summarizeGroup(scoredItems, includePlasticHeadline) {
  const headlineItems = includePlasticHeadline
    ? scoredItems
    : scoredItems.filter((item) => item.vector.headlineEligible);
  const gateFloorFailureCount = headlineItems.filter((item) => hasGateOrFloorFailure(item.vector)).length;
  const c4Values = headlineItems.map((item) => item.vector.overallVerdict.c4.harmAdjustedC4).filter((v) => Number.isFinite(v));
  const inBandCount = headlineItems.filter((item) => item.vector.overallVerdict.c4.inBand).length;
  const coarseCosts = headlineItems.map((item) => item.vector.efficiency.coarseCost.llmCalls).filter((v) => Number.isFinite(v));
  const brierValues = headlineItems.map((item) => item.vector.calibrationSignals.brierContribution).filter((v) => Number.isFinite(v));
  const richCostValues = headlineItems.map((item) => item.vector.efficiency.richCost?.estimatedCostUSD).filter((v) => Number.isFinite(v));
  const wallClockValues = headlineItems.map((item) => item.vector.efficiency.jobWallClockMs).filter((v) => Number.isFinite(v));

  return {
    n: scoredItems.length,
    headlineN: headlineItems.length,
    families: [...new Set(headlineItems.map((item) => item.vector.familySlug))].sort(),
    allFamilies: [...new Set(scoredItems.map((item) => item.vector.familySlug))].sort(),
    gateFloorViolationRate: pct(gateFloorFailureCount, headlineItems.length),
    reportTierCounts: countBy(headlineItems.map((item) => item.vector.reportTier)),
    c4: {
      meanHarmAdjusted: mean(c4Values),
      ci: bootstrapMeanCi(c4Values),
      normalApproxCi: normalApproxCi(c4Values),
      inBandRate: pct(inBandCount, headlineItems.length),
      values: c4Values,
    },
    calibration: {
      meanBrier: mean(brierValues),
    },
    efficiency: {
      avgLlmCalls: mean(coarseCosts),
      avgEstimatedCostUSD: mean(richCostValues),
      avgWallClockMs: mean(wallClockValues),
      richCostCoverage: pct(richCostValues.length, headlineItems.length),
    },
  };
}

function countBy(values) {
  const out = {};
  for (const value of values) bump(out, value || 'unknown');
  return out;
}

function hasGateOrFloorFailure(vector) {
  const gateChecks = [
    vector.integrity.runtime,
    vector.integrity.labelTruthConsistency,
    vector.integrity.citationInSet,
    vector.integrity.aggregationFaithfulness,
  ];
  const floorChecks = [
    vector.claims.claimCount,
    vector.claims.anchorSurvival,
    vector.evidence.boundaryCount,
    vector.evidence.perClaimCitationFloor,
  ];
  return gateChecks.some((check) => check.available !== false && check.passed === false)
    || floorChecks.some((check) => check.passed === false);
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function buildRollups(scoredItems, includePlasticHeadline) {
  const byBuild = {};
  for (const [build, items] of groupBy(scoredItems, (item) => item.vector.build)) {
    byBuild[build] = summarizeGroup(items, includePlasticHeadline);
    byBuild[build].buildShort = shortBuild(build);
    byBuild[build].latestCreatedUtc = items.map((item) => item.vector.createdUtc).sort().at(-1) || null;
  }

  const byFamilyBuild = {};
  for (const [key, items] of groupBy(scoredItems, (item) => `${item.vector.familySlug}|${item.vector.build}`)) {
    const [familySlug, build] = key.split('|');
    byFamilyBuild[key] = {
      familySlug,
      build,
      buildShort: shortBuild(build),
      summary: summarizeGroup(items, true),
      stability: computeGroupStability(items),
    };
  }

  const overall = summarizeGroup(scoredItems, includePlasticHeadline);
  return { overall, byBuild, byFamilyBuild };
}

function resolveBuildPrefix(builds, rollups, prefix) {
  const normalizedPrefix = String(prefix).toLowerCase();
  const exact = builds.filter((build) => String(build).toLowerCase() === normalizedPrefix);
  if (exact.length === 1) return exact[0];

  const matches = builds
    .filter((build) => buildMatchesPrefix(build, prefix))
    .sort((a, b) => (rollups.byBuild[b].latestCreatedUtc || '').localeCompare(rollups.byBuild[a].latestCreatedUtc || ''));

  if (matches.length === 0) {
    throw new Error(`--compare prefix "${prefix}" did not match any selected build`);
  }
  if (matches.length > 1) {
    const sample = matches.slice(0, 5).map((build) => `${shortBuild(build)}:${build}`).join(', ');
    const suffix = matches.length > 5 ? `, ... ${matches.length - 5} more` : '';
    throw new Error(`--compare prefix "${prefix}" is ambiguous; matched ${matches.length} builds (${sample}${suffix})`);
  }
  return matches[0];
}

function selectComparedBuilds(rollups, args) {
  const builds = Object.keys(rollups.byBuild);
  if (args.compare) {
    const selected = args.compare.map((prefix) => resolveBuildPrefix(builds, rollups, prefix));
    if (selected[0] === selected[1]) {
      throw new Error(`--compare resolved both prefixes to the same build: ${selected[0]}`);
    }
    return selected;
  }
  if (builds.length < 2) return null;
  return builds
    .sort((a, b) => (rollups.byBuild[b].latestCreatedUtc || '').localeCompare(rollups.byBuild[a].latestCreatedUtc || ''))
    .slice(0, 2)
    .reverse();
}

function comparisonEligibleItems(scoredItems, includePlasticHeadline) {
  return includePlasticHeadline
    ? scoredItems
    : scoredItems.filter((item) => item.vector.headlineEligible);
}

function summarizeComparisonSide(items) {
  if (items.length === 0) return null;
  return {
    items,
    summary: summarizeGroup(items, true),
    stability: computeGroupStability(items),
  };
}

function buildComparisonCells(scoredItems, buildA, buildB, includePlasticHeadline, requiredFamilySlugs = null) {
  const items = comparisonEligibleItems(scoredItems, includePlasticHeadline)
    .filter((item) => item.vector.build === buildA || item.vector.build === buildB);
  const families = (Array.isArray(requiredFamilySlugs) && requiredFamilySlugs.length > 0
    ? [...new Set(requiredFamilySlugs)]
    : [...new Set(items.map((item) => item.vector.familySlug))])
    .sort();
  const cells = [];

  for (const familySlug of families) {
    const itemsA = items.filter((item) => item.vector.build === buildA && item.vector.familySlug === familySlug);
    const itemsB = items.filter((item) => item.vector.build === buildB && item.vector.familySlug === familySlug);
    cells.push({
      familySlug,
      a: summarizeComparisonSide(itemsA),
      b: summarizeComparisonSide(itemsB),
    });
  }

  return {
    cells,
    matchedCells: cells.filter((cell) => cell.a && cell.b),
    missingA: cells.filter((cell) => !cell.a && cell.b).map((cell) => cell.familySlug),
    missingB: cells.filter((cell) => cell.a && !cell.b).map((cell) => cell.familySlug),
    missingBoth: cells.filter((cell) => !cell.a && !cell.b).map((cell) => cell.familySlug),
  };
}

function sampleMeanWithReplacement(values, rnd) {
  if (values.length === 0) return null;
  if (values.length === 1) return values[0];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[Math.floor(rnd() * values.length)];
  }
  return sum / values.length;
}

function sortedCi(samples) {
  samples.sort((a, b) => a - b);
  return {
    low: samples[Math.floor(samples.length * 0.025)],
    high: samples[Math.floor(samples.length * 0.975)],
  };
}

function bootstrapMatchedItemDelta(cells, valueFn, resamples = BOOTSTRAP_RESAMPLES, seed = 0xB007) {
  const eligible = cells
    .map((cell) => {
      const valuesA = cell.a.items.map(valueFn).filter((value) => Number.isFinite(value));
      const valuesB = cell.b.items.map(valueFn).filter((value) => Number.isFinite(value));
      return { familySlug: cell.familySlug, valuesA, valuesB };
    })
    .filter((cell) => cell.valuesA.length > 0 && cell.valuesB.length > 0);

  if (eligible.length === 0) return null;
  const familyDeltas = eligible.map((cell) => mean(cell.valuesB) - mean(cell.valuesA));
  const deltaMean = mean(familyDeltas);
  if (eligible.length === 1 && eligible[0].valuesA.length === 1 && eligible[0].valuesB.length === 1) {
    return { mean: deltaMean, low: deltaMean, high: deltaMean, nFamilies: eligible.length, method: 'single-matched-cell' };
  }

  const rnd = seededRandom(seed ^ eligible.length);
  const samples = [];
  for (let i = 0; i < resamples; i++) {
    let sum = 0;
    for (let k = 0; k < eligible.length; k++) {
      const family = eligible[Math.floor(rnd() * eligible.length)];
      const meanA = sampleMeanWithReplacement(family.valuesA, rnd);
      const meanB = sampleMeanWithReplacement(family.valuesB, rnd);
      sum += meanB - meanA;
    }
    samples.push(sum / eligible.length);
  }
  const ci = sortedCi(samples);
  return { mean: deltaMean, low: ci.low, high: ci.high, nFamilies: eligible.length, method: 'clustered-family-bootstrap' };
}

function bootstrapMatchedCellDelta(cells, sideValueFn, resamples = BOOTSTRAP_RESAMPLES, seed = 0xCE11) {
  const eligible = cells
    .map((cell) => ({
      familySlug: cell.familySlug,
      valueA: sideValueFn(cell.a),
      valueB: sideValueFn(cell.b),
    }))
    .filter((cell) => Number.isFinite(cell.valueA) && Number.isFinite(cell.valueB));

  if (eligible.length === 0) return null;
  const familyDeltas = eligible.map((cell) => cell.valueB - cell.valueA);
  const deltaMean = mean(familyDeltas);
  if (eligible.length === 1) {
    return { mean: deltaMean, low: deltaMean, high: deltaMean, nFamilies: eligible.length, method: 'single-matched-cell' };
  }

  const rnd = seededRandom(seed ^ eligible.length);
  const samples = [];
  for (let i = 0; i < resamples; i++) {
    let sum = 0;
    for (let k = 0; k < eligible.length; k++) {
      const family = eligible[Math.floor(rnd() * eligible.length)];
      sum += family.valueB - family.valueA;
    }
    samples.push(sum / eligible.length);
  }
  const ci = sortedCi(samples);
  return { mean: deltaMean, low: ci.low, high: ci.high, nFamilies: eligible.length, method: 'family-bootstrap' };
}

function classifyHigherBetterDelta(delta, epsilon) {
  if (!delta || !Number.isFinite(delta.mean)) return null;
  if (delta.low > epsilon) return 'B-wins';
  if (delta.high < -epsilon) return 'A-wins';
  return null;
}

function classifyLowerBetterDelta(delta, epsilon) {
  if (!delta || !Number.isFinite(delta.mean)) return null;
  if (delta.high < -epsilon) return 'B-wins';
  if (delta.low > epsilon) return 'A-wins';
  return null;
}

function matchedSideMean(cells, side, valueFn) {
  const cellMeans = cells
    .map((cell) => mean(cell[side].items.map(valueFn).filter((value) => Number.isFinite(value))))
    .filter((value) => Number.isFinite(value));
  return mean(cellMeans);
}

function compareBuilds(scoredItems, rollups, buildA, buildB, noise, includePlasticHeadline, requiredFamilySlugs) {
  const a = rollups.byBuild[buildA];
  const b = rollups.byBuild[buildB];
  if (!a || !b) return null;

  const comparisonCells = buildComparisonCells(scoredItems, buildA, buildB, includePlasticHeadline, requiredFamilySlugs);
  const matchedCells = comparisonCells.matchedCells;
  const gateA = mean(matchedCells.map((cell) => cell.a.summary.gateFloorViolationRate ?? 0)) ?? 0;
  const gateB = mean(matchedCells.map((cell) => cell.b.summary.gateFloorViolationRate ?? 0)) ?? 0;
  const c4Delta = bootstrapMatchedItemDelta(
    matchedCells,
    (item) => item.vector.overallVerdict.c4.harmAdjustedC4,
    BOOTSTRAP_RESAMPLES,
    0xC4C4,
  );
  const calibrationBrierDelta = bootstrapMatchedItemDelta(
    matchedCells,
    (item) => item.vector.calibrationSignals.brierContribution,
    BOOTSTRAP_RESAMPLES,
    0xB12E,
  );
  const truthSpreadDelta = bootstrapMatchedCellDelta(
    matchedCells,
    (side) => side.stability.truthSpread,
    BOOTSTRAP_RESAMPLES,
    0x571A,
  );
  const claimJaccardDelta = bootstrapMatchedCellDelta(
    matchedCells,
    (side) => side.stability.claimJaccardMean,
    BOOTSTRAP_RESAMPLES,
    0x5ACC,
  );
  const costDelta = bootstrapMatchedItemDelta(
    matchedCells,
    (item) => item.vector.efficiency.coarseCost.llmCalls,
    BOOTSTRAP_RESAMPLES,
    0xC057,
  );
  const costA = matchedSideMean(matchedCells, 'a', (item) => item.vector.efficiency.coarseCost.llmCalls);
  const costB = matchedSideMean(matchedCells, 'b', (item) => item.vector.efficiency.coarseCost.llmCalls);

  let verdict = 'no-strict-order';
  let reason = 'quality/cost not comparable';

  if (comparisonCells.missingA.length > 0 || comparisonCells.missingB.length > 0 || comparisonCells.missingBoth.length > 0) {
    reason = `missing matched family coverage (A missing: ${comparisonCells.missingA.join(', ') || 'none'}; B missing: ${comparisonCells.missingB.join(', ') || 'none'}; both missing: ${comparisonCells.missingBoth.join(', ') || 'none'})`;
  } else if (matchedCells.length === 0) {
    reason = 'no matched family/build cells';
  } else if (gateA === 0 && gateB > 0) {
    verdict = 'A-wins';
    reason = 'B has gate/floor violations and A has none';
  } else if (gateB === 0 && gateA > 0) {
    verdict = 'B-wins';
    reason = 'A has gate/floor violations and B has none';
  } else if (gateA > 0 || gateB > 0) {
    reason = `both builds have unresolved gate/floor violations (A=${fmtPct(gateA)}, B=${fmtPct(gateB)}); cost tie-break blocked`;
  } else {
    const c4Winner = classifyHigherBetterDelta(c4Delta, noise);
    const calibrationWinner = classifyLowerBetterDelta(calibrationBrierDelta, CALIBRATION_BRIER_EPSILON);
    const spreadWinner = classifyLowerBetterDelta(truthSpreadDelta, noise);
    const jaccardWinner = classifyHigherBetterDelta(claimJaccardDelta, CLAIM_JACCARD_EPSILON);

    if (!c4Delta) {
      reason = 'missing C4 quality data';
    } else if (c4Winner) {
      verdict = c4Winner;
      reason = `C4 not tied: matched delta=${round1(c4Delta.mean)} CI=[${fmtNum(c4Delta.low, 1)}, ${fmtNum(c4Delta.high, 1)}]`;
    } else if (calibrationWinner) {
      verdict = calibrationWinner;
      reason = `C4 tied; calibration Brier not tied: delta=${fmtSigned(calibrationBrierDelta.mean, 3)} CI=[${fmtNum(calibrationBrierDelta.low, 3)}, ${fmtNum(calibrationBrierDelta.high, 3)}]`;
    } else if (spreadWinner) {
      verdict = spreadWinner;
      reason = `C4/calibration tied; truth-spread stability not tied: delta=${fmtSigned(truthSpreadDelta.mean, 1)} CI=[${fmtNum(truthSpreadDelta.low, 1)}, ${fmtNum(truthSpreadDelta.high, 1)}]`;
    } else if (jaccardWinner) {
      verdict = jaccardWinner;
      reason = `C4/calibration tied; claim-set stability not tied: delta=${fmtSigned(claimJaccardDelta.mean, 3)} CI=[${fmtNum(claimJaccardDelta.low, 3)}, ${fmtNum(claimJaccardDelta.high, 3)}]`;
    } else {
      if (Number.isFinite(costA) && Number.isFinite(costB) && Math.abs(costB - costA) > COST_CALL_EPSILON) {
        verdict = costB < costA ? 'B-wins' : 'A-wins';
        reason = `quality tied; lower matched coarse llmCalls wins (${round1(costA)} vs ${round1(costB)})`;
      } else {
        reason = 'quality tied and cost tied/unavailable';
      }
    }
  }

  const matrix = comparisonCells.cells.map((cell) => ({
    familySlug: cell.familySlug,
    a: cell.a ? summarizeCell(cell.a) : null,
    b: cell.b ? summarizeCell(cell.b) : null,
    delta: cell.a && cell.b ? {
      meanHarmAdjustedC4: subtract(cell.b.summary.c4.meanHarmAdjusted, cell.a.summary.c4.meanHarmAdjusted),
      inBandRate: subtract(cell.b.summary.c4.inBandRate, cell.a.summary.c4.inBandRate),
      avgLlmCalls: subtract(cell.b.summary.efficiency.avgLlmCalls, cell.a.summary.efficiency.avgLlmCalls),
    } : null,
  }));

  return {
    buildA,
    buildB,
    buildAShort: shortBuild(buildA),
    buildBShort: shortBuild(buildB),
    verdict,
    reason,
    coverage: {
      families: comparisonCells.cells.map((cell) => cell.familySlug),
      requiredFamilies: requiredFamilySlugs,
      matchedFamilies: matchedCells.map((cell) => cell.familySlug),
      missingA: comparisonCells.missingA,
      missingB: comparisonCells.missingB,
      missingBoth: comparisonCells.missingBoth,
    },
    gateFloor: { a: gateA, b: gateB },
    quality: {
      c4Delta,
      calibrationBrierDelta,
      truthSpreadDelta,
      claimJaccardDelta,
    },
    cost: {
      unit: 'ResultJson.meta.llmCalls',
      a: costA,
      b: costB,
      delta: costDelta,
    },
    summary: { a, b },
    matrix,
  };
}

function subtract(right, left) {
  if (!Number.isFinite(right) || !Number.isFinite(left)) return null;
  return right - left;
}

function summarizeCell(cell) {
  return {
    n: cell.summary.n,
    meanHarmAdjustedC4: cell.summary.c4.meanHarmAdjusted,
    inBandRate: cell.summary.c4.inBandRate,
    avgLlmCalls: cell.summary.efficiency.avgLlmCalls,
    gateFloorViolationRate: cell.summary.gateFloorViolationRate,
    stability: cell.stability,
  };
}

function fmtDeltaCi(delta, digits = 1) {
  if (!delta) return 'n/a';
  return `${fmtSigned(delta.mean, digits)} CI=[${fmtNum(delta.low, digits)}, ${fmtNum(delta.high, digits)}] (${delta.method}, families=${delta.nFamilies})`;
}

function textReport(payload) {
  const { args, stats, rollups, comparison, runtimeWarnings: warnings = [] } = payload;
  console.log('# REPORT QUALITY MEASUREMENT - PHASE 1 ZERO-SPEND');
  console.log(`DB: ${DB_PATH}`);
  console.log(`Reports scored: ${stats.scored} (parse failures: ${stats.parseFailures})`);
  console.log(`Families: ${stats.families.join(', ')}`);
  console.log(`Headline aggregate excludes plastic-en: ${args.includePlasticHeadline ? 'no' : 'yes'}\n`);
  if (warnings.length > 0) {
    console.log('## Runtime warnings');
    for (const warning of warnings) console.log(`  - ${warning}`);
    console.log('');
  }

  console.log('## Overall');
  printSummary(rollups.overall, 'all selected reports');

  console.log('\n## Build rollup');
  const buildEntries = Object.entries(rollups.byBuild)
    .sort(([, a], [, b]) => (b.latestCreatedUtc || '').localeCompare(a.latestCreatedUtc || ''));
  if (buildEntries.length === 0) console.log('  n/a');
  for (const [build, summary] of buildEntries.slice(0, 12)) {
    const line = [
      summary.buildShort.padEnd(18),
      `n=${String(summary.n).padStart(3)}`,
      `families=${String(summary.families.length).padStart(2)}`,
      `C4=${fmtNum(summary.c4.meanHarmAdjusted, 1).padStart(6)}`,
      `in-band=${fmtPct(summary.c4.inBandRate).padStart(5)}`,
      `gate/floor=${fmtPct(summary.gateFloorViolationRate).padStart(5)}`,
      `calls=${fmtNum(summary.efficiency.avgLlmCalls, 1).padStart(6)}`,
      `rich-cost=${fmtPct(summary.efficiency.richCostCoverage).padStart(5)}`,
      `latest=${summary.latestCreatedUtc || 'n/a'}`,
    ].join('  ');
    console.log(`  ${line}`);
    if (buildEntries.length <= 4) {
      console.log(`    build=${build}`);
    }
  }

  if (comparison) {
    console.log('\n## Shadow matrix-diff');
    console.log(`A=${comparison.buildAShort}  B=${comparison.buildBShort}`);
    console.log(`Tie-band verdict: ${comparison.verdict} (${comparison.reason})`);
    console.log(`Matched families: ${comparison.coverage.matchedFamilies.join(', ') || 'none'}`);
    if (comparison.coverage.missingA.length || comparison.coverage.missingB.length) {
      console.log(`Missing coverage: A=${comparison.coverage.missingA.join(', ') || 'none'}; B=${comparison.coverage.missingB.join(', ') || 'none'}; both=${comparison.coverage.missingBoth.join(', ') || 'none'}`);
    } else if (comparison.coverage.missingBoth.length) {
      console.log(`Missing coverage: A=none; B=none; both=${comparison.coverage.missingBoth.join(', ')}`);
    }
    console.log(`Gate/floor matched rate: A=${fmtPct(comparison.gateFloor.a)}  B=${fmtPct(comparison.gateFloor.b)}`);
    console.log(`Quality deltas (B-A): C4 ${fmtDeltaCi(comparison.quality.c4Delta, 1)}; calibration Brier ${fmtDeltaCi(comparison.quality.calibrationBrierDelta, 3)}`);
    console.log(`Stability deltas (B-A): truth spread ${fmtDeltaCi(comparison.quality.truthSpreadDelta, 1)}; claim Jaccard ${fmtDeltaCi(comparison.quality.claimJaccardDelta, 3)}`);
    console.log(`Cost delta (B-A ${comparison.cost.unit}): ${fmtDeltaCi(comparison.cost.delta, 1)}; matched means A=${fmtNum(comparison.cost.a, 1)} B=${fmtNum(comparison.cost.b, 1)}`);
    console.log('family                    A:C4/in/calls        B:C4/in/calls        deltaC4  deltaIn  deltaCalls');
    console.log('------------------------  -------------------  -------------------  -------  -------  ----------');
    for (const row of comparison.matrix) {
      const a = row.a ? `${fmtNum(row.a.meanHarmAdjustedC4, 1).padStart(6)} ${fmtPct(row.a.inBandRate).padStart(5)} ${fmtNum(row.a.avgLlmCalls, 1).padStart(6)}` : 'n/a'.padStart(19);
      const b = row.b ? `${fmtNum(row.b.meanHarmAdjustedC4, 1).padStart(6)} ${fmtPct(row.b.inBandRate).padStart(5)} ${fmtNum(row.b.avgLlmCalls, 1).padStart(6)}` : 'n/a'.padStart(19);
      const d = row.delta || {};
      console.log(`${row.familySlug.padEnd(24)}  ${a}  ${b}  ${fmtSigned(d.meanHarmAdjustedC4, 1).padStart(7)}  ${fmtSignedPct(d.inBandRate).padStart(7)}  ${fmtSigned(d.avgLlmCalls, 1).padStart(10)}`);
    }
  } else {
    console.log('\n## Shadow matrix-diff');
    console.log('  n/a - fewer than two builds, or --compare prefixes did not match two builds.');
  }

  console.log('\n## Notes');
  console.log('  - C4 truth uses benchmark noise; confidence is strict.');
  console.log('  - Cost tie-band uses ResultJson.meta.llmCalls. runtimeRoleModels is reported as colour only.');
  console.log('  - Rich token/$/latency cost is n/a unless AnalysisMetrics exists for the job.');
  console.log('  - Aggregation faithfulness is unavailable unless ResultJson carries consumable calc-config provenance.');
}

function printSummary(summary, label) {
  const ci = summary.c4.ci;
  const ciText = ci ? `[${fmtNum(ci.low, 1)}, ${fmtNum(ci.high, 1)}] ${ci.method}` : 'n/a';
  console.log(`  scope: ${label}`);
  console.log(`  reports: ${summary.n} (headline ${summary.headlineN})`);
  console.log(`  report tiers: ${JSON.stringify(summary.reportTierCounts)}`);
  console.log(`  gate/floor violation rate: ${fmtPct(summary.gateFloorViolationRate)}`);
  console.log(`  C4 harm-adjusted mean: ${fmtNum(summary.c4.meanHarmAdjusted, 1)}  CI ${ciText}`);
  console.log(`  C4 in-band rate: ${fmtPct(summary.c4.inBandRate)}`);
  console.log(`  calibration mean Brier: ${fmtNum(summary.calibration.meanBrier, 3)}`);
  console.log(`  avg coarse llmCalls: ${fmtNum(summary.efficiency.avgLlmCalls, 1)}`);
  console.log(`  rich-cost coverage: ${fmtPct(summary.efficiency.richCostCoverage)}`);
}

function fmtSigned(value, digits = 1) {
  if (value == null || !Number.isFinite(value)) return 'n/a';
  const rounded = Number(value).toFixed(digits);
  return value > 0 ? `+${rounded}` : rounded;
}

function fmtSignedPct(value) {
  if (value == null || !Number.isFinite(value)) return 'n/a';
  const pp = Math.round(value * 100);
  return pp > 0 ? `+${pp}pp` : `${pp}pp`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const benchmark = readJsonFile(path.join('Docs', 'AGENTS', 'benchmark-expectations.json'));
  const noise = finiteNumber(benchmark.noiseTolerancePct) ?? 8;
  let families = benchmark.families || [];
  if (args.family) {
    families = families.filter((f) => f.slug === args.family);
    if (families.length === 0) {
      console.error(`No benchmark family with slug: ${args.family}`);
      process.exit(1);
    }
  }

  const rows = queryJobs(families, args);
  const familyByInput = new Map(families.map((family) => [family.inputValue, family]));
  const metricsByJob = parseMetricsRows(rows.map((row) => row.jobId));
  const scoredItems = [];
  const parseFailureVectors = [];
  let parseFailures = 0;

  for (const row of rows) {
    const family = familyByInput.get(row.inputValue);
    if (!family) continue;
    const scored = scoreReport(row, family, metricsByJob.get(row.jobId), noise);
    if (scored.parseError) {
      parseFailures++;
      parseFailureVectors.push(scored.vector);
      continue;
    }
    if (args.build && !buildMatchesPrefix(scored.vector.build, args.build)) continue;
    scoredItems.push(scored);
  }

  const rollups = buildRollups(scoredItems, args.includePlasticHeadline);
  const compared = selectComparedBuilds(rollups, args);
  const requiredComparisonFamilySlugs = families
    .map((family) => family.slug)
    .filter((slug) => args.includePlasticHeadline || slug !== 'plastic-en');
  const comparison = compared
    ? compareBuilds(
      scoredItems,
      rollups,
      compared[0],
      compared[1],
      noise,
      args.includePlasticHeadline,
      requiredComparisonFamilySlugs,
    )
    : null;
  const payload = {
    args,
    stats: {
      dbPath: DB_PATH,
      queried: rows.length,
      scored: scoredItems.length,
      parseFailures,
      families: families.map((f) => f.slug),
      headlineFamilies: requiredComparisonFamilySlugs,
      noiseTolerancePct: noise,
    },
    runtimeWarnings,
    parseFailureVectors,
    vectors: scoredItems.map((item) => item.vector),
    rollups,
    comparison,
  };

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    textReport(payload);
  }
}

try {
  main();
} catch (error) {
  console.error(error && error.message ? error.message : String(error));
  process.exit(1);
}
