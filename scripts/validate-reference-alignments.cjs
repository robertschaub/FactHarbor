#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DOSSIER_DIR = path.join(REPO_ROOT, 'Docs', 'AGENTS', 'Reference_Dossiers');
const ALIGNMENTS_DIR = path.join(DOSSIER_DIR, 'alignments');
const DOSSIER_SCHEMA_FILE = 'reference-dossier.schema.json';

const ALIGNMENT_SCHEMA_VERSION = 'reference-alignment-score.v0.3';

const VERDICT_LABELS = new Set([
  'FALSE',
  'MOSTLY-FALSE',
  'LEANING-FALSE',
  'MIXED',
  'UNVERIFIED',
  'LEANING-TRUE',
  'MOSTLY-TRUE',
  'TRUE',
]);

const ALIGNMENT_MODES = new Set(['manual', 'llm_judge']);
const GOLD_USES = new Set([
  'manual_alignment_gold_positive',
  'manual_alignment_gold_negative',
  'manual_alignment_calibration_only',
]);
const OVERALL_ALIGNMENT_STATUSES = new Set(['pass', 'partial', 'fail', 'needs_human_review']);
const INPUT_EXACTNESS = new Set(['exact', 'variant', 'unknown']);
const FRAME_ROLES = new Set(['primary', 'secondary', 'caveat']);
const FRAME_AGGREGATION_MODES = new Set(['dominance_weighted', 'balanced_composite', 'no_topline']);
const FRAME_DECISIONS = new Set(['active_clear', 'active_ambiguous', 'no_admissible_frame']);
const CLAIM_MAPPING_STATUSES = new Set([
  'addressed',
  'partial',
  'not_addressed',
  'contradicted',
  'tolerated_context',
  'unsupported_extra',
]);
const TRUTH_CONDITION_MAPPING_STATUSES = new Set([
  'separately_represented',
  'merged_but_visible',
  'hidden_or_missing',
  'waived',
]);
const ASSERTION_COVERAGE_STATUSES = new Set(['addressed', 'partial', 'not_addressed', 'contradicted']);
const EXTRA_CLAIM_STATUSES = new Set(['tolerated_context', 'unsupported_extra', 'forbidden']);
const VERDICT_BAND_FITS = new Set([
  'in_band',
  'adjacent',
  'same_side_out_of_band',
  'direction_flip',
  'unverified',
  'no_verdict',
]);
const CONFIDENCE_FITS = new Set(['in_band', 'above_band', 'below_band', 'absent']);
const HARMFUL_ERRORS = new Set(['none', 'confident_wrong', 'harmful_miss']);
const PRIMARY_ROUTE_FITS = new Set(['pass', 'miss', 'partial', 'needs_human_review']);

function usage() {
  console.log(`Usage: node scripts/validate-reference-alignments.cjs [file-or-dir ...]

Validates reference-alignment-score.v0.3 artifacts under:
  Docs/AGENTS/Reference_Dossiers/alignments/

The checks are structural and cross-reference only: schema version, dossier
links, IDs, enum values, score domains, and C4 pass/miss consistency. Semantic
alignment remains a manual or LLM-judge responsibility.
`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPct(value) {
  return isNumber(value) && value >= 0 && value <= 100;
}

function isNullablePct(value) {
  return value === null || isPct(value);
}

function isScore01(value) {
  return value === null || (isNumber(value) && value >= 0 && value <= 1);
}

function approxEqual(left, right, tolerance = 0.001) {
  return isNumber(left) && isNumber(right) && Math.abs(left - right) <= tolerance;
}

function normalizeVerdictLabel(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toUpperCase().replace(/_/g, '-');
  return VERDICT_LABELS.has(normalized) ? normalized : null;
}

function normalizeVerdictSet(values) {
  const labels = new Set();
  if (!Array.isArray(values)) {
    return labels;
  }
  for (const value of values) {
    const normalized = normalizeVerdictLabel(value);
    if (normalized) {
      labels.add(normalized);
    }
  }
  return labels;
}

function sameStringSet(left, right) {
  if (left.size !== right.size) {
    return false;
  }
  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }
  return true;
}

function formatSet(set) {
  return `[${Array.from(set).sort().join(', ')}]`;
}

function sameBand(left, right) {
  return isPlainObject(left) &&
    isPlainObject(right) &&
    left.min === right.min &&
    left.max === right.max;
}

function inBand(value, band) {
  return isPct(value) && isPlainObject(band) && isPct(band.min) && isPct(band.max) && value >= band.min && value <= band.max;
}

function observedInExpectedRoute(observed, expected) {
  if (!isPlainObject(observed) || !isPlainObject(expected)) {
    return false;
  }
  const observedLabel = normalizeVerdictLabel(observed.verdict);
  return Boolean(observedLabel) &&
    normalizeVerdictSet(expected.acceptedVerdictLabels).has(observedLabel) &&
    inBand(observed.truthPercentage, expected.truthBand) &&
    inBand(observed.confidence, expected.confidenceBand);
}

function collectJsonFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }
  const stat = fs.statSync(root);
  if (stat.isFile()) {
    return root.endsWith('.json') ? [root] : [];
  }
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const resolved = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsonFiles(resolved));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(resolved);
    }
  }
  return files.sort();
}

function collectTargets(args) {
  if (args.includes('--help') || args.includes('-h')) {
    usage();
    process.exit(0);
  }

  const roots = args.length > 0 ? args.map((arg) => path.resolve(process.cwd(), arg)) : [ALIGNMENTS_DIR];
  const files = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) {
      throw new Error(`Target does not exist: ${root}`);
    }
    files.push(...collectJsonFiles(root));
  }
  return Array.from(new Set(files)).sort();
}

function addIfMissing(errors, object, field, label) {
  if (!Object.prototype.hasOwnProperty.call(object, field)) {
    errors.push(`${label}.${field} is missing`);
    return true;
  }
  return false;
}

function checkEnum(errors, value, allowed, label) {
  if (!allowed.has(value)) {
    errors.push(`${label} must be one of ${formatSet(allowed)}; got ${String(value)}`);
  }
}

function checkStringArray(errors, value, label) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return;
  }
  for (const [index, item] of value.entries()) {
    if (!nonEmptyString(item)) {
      errors.push(`${label}[${index}] must be a non-empty string`);
    }
  }
}

function checkUniqueStringArray(errors, value, label) {
  checkStringArray(errors, value, label);
  if (!Array.isArray(value)) {
    return;
  }
  const seen = new Set();
  for (const item of value) {
    if (seen.has(item)) {
      errors.push(`${label} contains duplicate value: ${item}`);
    }
    seen.add(item);
  }
}

function compareNullableWeight(actual, expected) {
  if (actual === null || expected === null) {
    return actual === expected;
  }
  return approxEqual(actual, expected);
}

function buildDossierIndex() {
  const byKey = new Map();
  const errors = [];
  for (const file of collectJsonFiles(DOSSIER_DIR)) {
    if (path.basename(file) === DOSSIER_SCHEMA_FILE || file.includes(`${path.sep}alignments${path.sep}`)) {
      continue;
    }
    let dossier;
    try {
      dossier = readJson(file);
    } catch (error) {
      errors.push(`${file}: invalid JSON: ${error.message}`);
      continue;
    }
    if (!nonEmptyString(dossier.id) || !nonEmptyString(dossier.version)) {
      errors.push(`${file}: dossier id and version are required`);
      continue;
    }
    const key = `${dossier.id}@${dossier.version}`;
    if (byKey.has(key)) {
      errors.push(`${file}: duplicate dossier key ${key}`);
      continue;
    }
    byKey.set(key, buildSingleDossierIndex(file, dossier));
  }
  return { byKey, errors };
}

function buildSingleDossierIndex(file, dossier) {
  const frameById = new Map();
  const assertionById = new Map();
  const assertionContextById = new Map();
  const truthConditionById = new Map();
  const truthConditionContextById = new Map();
  const indexErrors = [];

  for (const frame of Array.isArray(dossier.interpretationFrames) ? dossier.interpretationFrames : []) {
    if (frameById.has(frame.id)) {
      indexErrors.push(`duplicate frame id: ${frame.id}`);
    }
    frameById.set(frame.id, frame);

    const truthConditions = frame?.atomicityProfile?.distinctTruthConditions;
    for (const truthCondition of Array.isArray(truthConditions) ? truthConditions : []) {
      if (truthConditionById.has(truthCondition.id)) {
        indexErrors.push(`duplicate truth condition id: ${truthCondition.id}`);
      }
      truthConditionById.set(truthCondition.id, truthCondition);
      truthConditionContextById.set(truthCondition.id, { frame, truthCondition });
    }

    for (const assertion of Array.isArray(frame.referenceAssertions) ? frame.referenceAssertions : []) {
      if (assertionById.has(assertion.id)) {
        indexErrors.push(`duplicate reference assertion id: ${assertion.id}`);
      }
      assertionById.set(assertion.id, assertion);
      assertionContextById.set(assertion.id, {
        frame,
        assertion,
        truthCondition: truthConditionById.get(assertion.truthConditionId) ?? null,
      });
    }
  }

  return {
    file,
    dossier,
    frameById,
    assertionById,
    assertionContextById,
    truthConditionById,
    truthConditionContextById,
    indexErrors,
  };
}

function reportClaimIdExists(reportClaimId, directReportClaimIds) {
  if (!nonEmptyString(reportClaimId)) {
    return false;
  }
  if (directReportClaimIds.has(reportClaimId)) {
    return true;
  }
  if (!reportClaimId.includes('+')) {
    return false;
  }
  return reportClaimId.split('+').every((part) => directReportClaimIds.has(part));
}

function assertReportClaimIdsResolve(errors, reportClaimIds, directReportClaimIds, label) {
  if (!Array.isArray(reportClaimIds)) {
    errors.push(`${label} must be an array`);
    return;
  }
  for (const [index, reportClaimId] of reportClaimIds.entries()) {
    if (!reportClaimIdExists(reportClaimId, directReportClaimIds)) {
      errors.push(`${label}[${index}] references unknown report claim id or compound id: ${String(reportClaimId)}`);
    }
  }
}

function assertReportClaimIdResolves(errors, reportClaimId, directReportClaimIds, label) {
  if (!reportClaimIdExists(reportClaimId, directReportClaimIds)) {
    errors.push(`${label} references unknown report claim id or compound id: ${String(reportClaimId)}`);
  }
}

function buildExpectedPrimaryRoute(dossierIndex) {
  const topLineIds = dossierIndex.dossier?.benchmarkCoherence?.topLineAssertionIds;
  const acceptedVerdictLabels = new Set();
  for (const assertionId of Array.isArray(topLineIds) ? topLineIds : []) {
    const assertion = dossierIndex.assertionById.get(assertionId);
    for (const label of normalizeVerdictSet(assertion?.acceptedVerdictLabels)) {
      acceptedVerdictLabels.add(label);
    }
  }
  return {
    acceptedVerdictLabels,
    truthBand: dossierIndex.dossier?.benchmarkCoherence?.familyTruthBand,
    confidenceBand: dossierIndex.dossier?.benchmarkCoherence?.familyConfidenceBand,
  };
}

function validateObservedSnapshotConsistency(errors, alignment) {
  const snapshot = alignment.reportSnapshot;
  const observed = alignment.c4Note?.observed;
  if (!isPlainObject(snapshot) || !isPlainObject(observed)) {
    return;
  }
  if (nonEmptyString(snapshot.overallVerdict) && normalizeVerdictLabel(snapshot.overallVerdict) !== normalizeVerdictLabel(observed.verdict)) {
    errors.push('c4Note.observed.verdict must match reportSnapshot.overallVerdict');
  }
  if (Object.prototype.hasOwnProperty.call(snapshot, 'truthPercentage') && !approxEqual(snapshot.truthPercentage, observed.truthPercentage)) {
    errors.push('c4Note.observed.truthPercentage must match reportSnapshot.truthPercentage');
  }
  if (Object.prototype.hasOwnProperty.call(snapshot, 'confidence') && !approxEqual(snapshot.confidence, observed.confidence)) {
    errors.push('c4Note.observed.confidence must match reportSnapshot.confidence');
  }
}

function validateAlignment(file, alignment, dossierIndexByKey) {
  const errors = [];
  const topLevelRequired = [
    'schemaVersion',
    'dossierId',
    'dossierVersion',
    'inputSlug',
    'reportJobId',
    'alignmentMode',
    'goldUse',
    'overallAlignmentStatus',
    'benchmarkPass',
    'manualGoldApproved',
    'reportSnapshot',
    'c1',
    'c3',
    'c4Note',
  ];
  for (const field of topLevelRequired) {
    addIfMissing(errors, alignment, field, 'alignment');
  }

  if (alignment.schemaVersion !== ALIGNMENT_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${ALIGNMENT_SCHEMA_VERSION}; got ${String(alignment.schemaVersion)}`);
  }
  if (!nonEmptyString(alignment.dossierId)) {
    errors.push('dossierId must be a non-empty string');
  }
  if (!nonEmptyString(alignment.dossierVersion)) {
    errors.push('dossierVersion must be a non-empty string');
  }
  if (!nonEmptyString(alignment.inputSlug)) {
    errors.push('inputSlug must be a non-empty string');
  }
  if (alignment.reportJobId !== null && !nonEmptyString(alignment.reportJobId)) {
    errors.push('reportJobId must be null or a non-empty string');
  }
  checkEnum(errors, alignment.alignmentMode, ALIGNMENT_MODES, 'alignmentMode');
  checkEnum(errors, alignment.goldUse, GOLD_USES, 'goldUse');
  checkEnum(errors, alignment.overallAlignmentStatus, OVERALL_ALIGNMENT_STATUSES, 'overallAlignmentStatus');
  if (alignment.benchmarkPass !== null && typeof alignment.benchmarkPass !== 'boolean') {
    errors.push('benchmarkPass must be boolean or null');
  }
  if (typeof alignment.manualGoldApproved !== 'boolean') {
    errors.push('manualGoldApproved must be boolean');
  }
  if (alignment.goldUse === 'manual_alignment_gold_positive' && alignment.benchmarkPass !== true) {
    errors.push('manual_alignment_gold_positive requires benchmarkPass=true');
  }
  if (alignment.goldUse === 'manual_alignment_gold_negative' && alignment.benchmarkPass !== false) {
    errors.push('manual_alignment_gold_negative requires benchmarkPass=false');
  }

  const key = `${alignment.dossierId}@${alignment.dossierVersion}`;
  const dossierIndex = dossierIndexByKey.get(key);
  if (!dossierIndex) {
    errors.push(`dossierId/dossierVersion does not resolve to a known dossier: ${key}`);
    return errors;
  }
  for (const indexError of dossierIndex.indexErrors) {
    errors.push(`linked dossier ${key} index error: ${indexError}`);
  }
  const dossier = dossierIndex.dossier;
  if (alignment.inputSlug !== dossier.inputSlug) {
    errors.push(`inputSlug must match linked dossier inputSlug ${dossier.inputSlug}`);
  }
  const alignmentFolder = path.basename(path.dirname(file));
  if (alignmentFolder !== alignment.inputSlug) {
    errors.push(`alignment folder ${alignmentFolder} must match inputSlug ${alignment.inputSlug}`);
  }

  const directReportClaimIds = validateReportSnapshot(errors, alignment, dossier);
  validateC1(errors, alignment, dossierIndex, directReportClaimIds);
  validateC3(errors, alignment, dossierIndex, directReportClaimIds);
  validateC4(errors, alignment, dossierIndex);
  validateObservedSnapshotConsistency(errors, alignment);

  return errors;
}

function validateReportSnapshot(errors, alignment, dossier) {
  const snapshot = alignment.reportSnapshot;
  const directReportClaimIds = new Set();
  if (!isPlainObject(snapshot)) {
    errors.push('reportSnapshot must be an object');
    return directReportClaimIds;
  }

  if (snapshot.inputValue !== null && !nonEmptyString(snapshot.inputValue)) {
    errors.push('reportSnapshot.inputValue must be null or a non-empty string');
  }
  if (snapshot.canonicalInputValue !== null && !nonEmptyString(snapshot.canonicalInputValue)) {
    errors.push('reportSnapshot.canonicalInputValue must be null or a non-empty string');
  }
  checkEnum(errors, snapshot.inputExactness, INPUT_EXACTNESS, 'reportSnapshot.inputExactness');
  if (snapshot.canonicalInputValue !== null && snapshot.canonicalInputValue !== dossier.captainInputValue) {
    errors.push('reportSnapshot.canonicalInputValue must match linked dossier captainInputValue');
  }
  if (snapshot.inputExactness === 'exact' && snapshot.inputValue !== dossier.captainInputValue) {
    errors.push('reportSnapshot.inputExactness=exact requires inputValue to match linked dossier captainInputValue');
  }
  if (nonEmptyString(snapshot.overallVerdict) && !normalizeVerdictLabel(snapshot.overallVerdict)) {
    errors.push(`reportSnapshot.overallVerdict is not a known verdict label: ${snapshot.overallVerdict}`);
  }
  if (Object.prototype.hasOwnProperty.call(snapshot, 'truthPercentage') && !isPct(snapshot.truthPercentage)) {
    errors.push('reportSnapshot.truthPercentage must be in [0,100]');
  }
  if (Object.prototype.hasOwnProperty.call(snapshot, 'confidence') && !isPct(snapshot.confidence)) {
    errors.push('reportSnapshot.confidence must be in [0,100]');
  }

  if (!Array.isArray(snapshot.reportAtomicClaims)) {
    errors.push('reportSnapshot.reportAtomicClaims must be an array');
    return directReportClaimIds;
  }

  for (const [index, claim] of snapshot.reportAtomicClaims.entries()) {
    const label = `reportSnapshot.reportAtomicClaims[${index}]`;
    if (!isPlainObject(claim)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    if (!nonEmptyString(claim.id)) {
      errors.push(`${label}.id must be a non-empty string`);
    } else if (directReportClaimIds.has(claim.id)) {
      errors.push(`${label}.id duplicates report claim id ${claim.id}`);
    } else {
      directReportClaimIds.add(claim.id);
    }
    if (!nonEmptyString(claim.statement)) {
      errors.push(`${label}.statement must be a non-empty string`);
    }
    if (Object.prototype.hasOwnProperty.call(claim, 'verdict') && claim.verdict !== null && !normalizeVerdictLabel(claim.verdict)) {
      errors.push(`${label}.verdict is not a known verdict label: ${String(claim.verdict)}`);
    }
    if (Object.prototype.hasOwnProperty.call(claim, 'truthPercentage') && !isNullablePct(claim.truthPercentage)) {
      errors.push(`${label}.truthPercentage must be null or in [0,100]`);
    }
    if (Object.prototype.hasOwnProperty.call(claim, 'confidence') && !isNullablePct(claim.confidence)) {
      errors.push(`${label}.confidence must be null or in [0,100]`);
    }
    if (Object.prototype.hasOwnProperty.call(claim, 'evidenceIds')) {
      checkUniqueStringArray(errors, claim.evidenceIds, `${label}.evidenceIds`);
    }
  }

  return directReportClaimIds;
}

function validateC1(errors, alignment, dossierIndex, directReportClaimIds) {
  const c1 = alignment.c1;
  if (!isPlainObject(c1)) {
    errors.push('c1 must be an object');
    return;
  }

  checkEnum(errors, c1.frameDecision, FRAME_DECISIONS, 'c1.frameDecision');

  const activeFrame = c1.activeFrameId === null ? null : dossierIndex.frameById.get(c1.activeFrameId);
  if (c1.frameDecision !== 'no_admissible_frame' && !activeFrame) {
    errors.push(`c1.activeFrameId must resolve to a linked dossier frame; got ${String(c1.activeFrameId)}`);
  }
  if (activeFrame) {
    if (c1.activeFrameRole !== activeFrame.frameRole) {
      errors.push(`c1.activeFrameRole must match active frame role ${activeFrame.frameRole}`);
    }
    if (c1.activeFrameAggregationMode !== activeFrame.frameAggregationMode) {
      errors.push(`c1.activeFrameAggregationMode must match active frame aggregation mode ${activeFrame.frameAggregationMode}`);
    }
  } else {
    checkEnum(errors, c1.activeFrameRole, FRAME_ROLES, 'c1.activeFrameRole');
    checkEnum(errors, c1.activeFrameAggregationMode, FRAME_AGGREGATION_MODES, 'c1.activeFrameAggregationMode');
  }
  if (c1.runnerUpFrameId !== null && !dossierIndex.frameById.has(c1.runnerUpFrameId)) {
    errors.push(`c1.runnerUpFrameId does not resolve to a linked dossier frame: ${String(c1.runnerUpFrameId)}`);
  }

  validateAxisScores(errors, c1.axisScores);
  validateClaimMappings(errors, c1, dossierIndex, activeFrame, directReportClaimIds);
  validateTruthConditionMappings(errors, c1, dossierIndex, activeFrame, directReportClaimIds);
  validateAssertionCoverage(errors, c1, dossierIndex, activeFrame, directReportClaimIds);
  validateExtraClaims(errors, c1, directReportClaimIds);
  if (Object.prototype.hasOwnProperty.call(c1, 'reviewFlags')) {
    checkStringArray(errors, c1.reviewFlags, 'c1.reviewFlags');
  }
  validateDirectReportClaimCoverage(errors, c1, directReportClaimIds);
}

function validateAxisScores(errors, axisScores) {
  if (!isPlainObject(axisScores)) {
    errors.push('c1.axisScores must be an object');
    return;
  }
  for (const field of [
    'inputClassificationFit',
    'frameAdmissibility',
    'assertionCoverage',
    'atomicityFidelity',
    'disclosureFidelity',
  ]) {
    if (!Object.prototype.hasOwnProperty.call(axisScores, field)) {
      errors.push(`c1.axisScores.${field} is missing`);
    } else if (!isScore01(axisScores[field])) {
      errors.push(`c1.axisScores.${field} must be null or in [0,1]`);
    }
  }
}

function validateClaimMappings(errors, c1, dossierIndex, activeFrame, directReportClaimIds) {
  if (!Array.isArray(c1.claimMappings)) {
    errors.push('c1.claimMappings must be an array');
    return;
  }
  for (const [index, mapping] of c1.claimMappings.entries()) {
    const label = `c1.claimMappings[${index}]`;
    if (!isPlainObject(mapping)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    assertReportClaimIdResolves(errors, mapping.reportClaimId, directReportClaimIds, `${label}.reportClaimId`);
    checkEnum(errors, mapping.status, CLAIM_MAPPING_STATUSES, `${label}.status`);
    checkUniqueStringArray(errors, mapping.referenceAssertionIds, `${label}.referenceAssertionIds`);
    checkUniqueStringArray(errors, mapping.truthConditionIds, `${label}.truthConditionIds`);

    const truthConditionIds = new Set(Array.isArray(mapping.truthConditionIds) ? mapping.truthConditionIds : []);
    for (const assertionId of Array.isArray(mapping.referenceAssertionIds) ? mapping.referenceAssertionIds : []) {
      const context = dossierIndex.assertionContextById.get(assertionId);
      if (!context) {
        errors.push(`${label}.referenceAssertionIds references unknown assertion id: ${assertionId}`);
        continue;
      }
      if (activeFrame && context.frame.id !== activeFrame.id) {
        errors.push(`${label}.referenceAssertionIds ${assertionId} does not belong to active frame ${activeFrame.id}`);
      }
      if (!truthConditionIds.has(context.assertion.truthConditionId)) {
        errors.push(`${label}.truthConditionIds must include ${context.assertion.truthConditionId} for assertion ${assertionId}`);
      }
    }
    for (const truthConditionId of truthConditionIds) {
      const context = dossierIndex.truthConditionContextById.get(truthConditionId);
      if (!context) {
        errors.push(`${label}.truthConditionIds references unknown truth condition id: ${truthConditionId}`);
      } else if (activeFrame && context.frame.id !== activeFrame.id) {
        errors.push(`${label}.truthConditionIds ${truthConditionId} does not belong to active frame ${activeFrame.id}`);
      }
    }
  }
}

function validateTruthConditionMappings(errors, c1, dossierIndex, activeFrame, directReportClaimIds) {
  if (!Array.isArray(c1.truthConditionMappings)) {
    errors.push('c1.truthConditionMappings must be an array');
    return;
  }
  const seen = new Set();
  for (const [index, mapping] of c1.truthConditionMappings.entries()) {
    const label = `c1.truthConditionMappings[${index}]`;
    if (!isPlainObject(mapping)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    if (seen.has(mapping.truthConditionId)) {
      errors.push(`${label}.truthConditionId duplicates ${mapping.truthConditionId}`);
    }
    seen.add(mapping.truthConditionId);
    checkEnum(errors, mapping.status, TRUTH_CONDITION_MAPPING_STATUSES, `${label}.status`);
    assertReportClaimIdsResolve(errors, mapping.reportClaimIds, directReportClaimIds, `${label}.reportClaimIds`);

    const context = dossierIndex.truthConditionContextById.get(mapping.truthConditionId);
    if (!context) {
      errors.push(`${label}.truthConditionId references unknown truth condition id: ${String(mapping.truthConditionId)}`);
      continue;
    }
    if (activeFrame && context.frame.id !== activeFrame.id) {
      errors.push(`${label}.truthConditionId ${mapping.truthConditionId} does not belong to active frame ${activeFrame.id}`);
    }
    if (mapping.dominanceRole !== context.truthCondition.dominanceRole) {
      errors.push(`${label}.dominanceRole must match linked truth condition role ${context.truthCondition.dominanceRole}`);
    }
    if (!compareNullableWeight(mapping.dominanceWeight, context.truthCondition.dominanceWeight)) {
      errors.push(`${label}.dominanceWeight must match linked truth condition weight ${context.truthCondition.dominanceWeight}`);
    }
  }
}

function validateAssertionCoverage(errors, c1, dossierIndex, activeFrame, directReportClaimIds) {
  if (!Array.isArray(c1.assertionCoverage)) {
    errors.push('c1.assertionCoverage must be an array');
    return;
  }
  const seen = new Set();
  for (const [index, coverage] of c1.assertionCoverage.entries()) {
    const label = `c1.assertionCoverage[${index}]`;
    if (!isPlainObject(coverage)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    if (seen.has(coverage.referenceAssertionId)) {
      errors.push(`${label}.referenceAssertionId duplicates ${coverage.referenceAssertionId}`);
    }
    seen.add(coverage.referenceAssertionId);
    checkEnum(errors, coverage.status, ASSERTION_COVERAGE_STATUSES, `${label}.status`);
    assertReportClaimIdsResolve(errors, coverage.reportClaimIds, directReportClaimIds, `${label}.reportClaimIds`);

    const context = dossierIndex.assertionContextById.get(coverage.referenceAssertionId);
    if (!context) {
      errors.push(`${label}.referenceAssertionId references unknown assertion id: ${String(coverage.referenceAssertionId)}`);
      continue;
    }
    if (activeFrame && context.frame.id !== activeFrame.id) {
      errors.push(`${label}.referenceAssertionId ${coverage.referenceAssertionId} does not belong to active frame ${activeFrame.id}`);
    }
  }

  if (activeFrame) {
    const requiredAssertionIds = activeFrame.referenceAssertions
      .filter((assertion) => assertion.role === 'required')
      .map((assertion) => assertion.id);
    for (const assertionId of requiredAssertionIds) {
      if (!seen.has(assertionId)) {
        errors.push(`c1.assertionCoverage is missing required active-frame assertion ${assertionId}`);
      }
    }
  }
}

function validateExtraClaims(errors, c1, directReportClaimIds) {
  if (!Array.isArray(c1.extraClaims)) {
    errors.push('c1.extraClaims must be an array');
    return;
  }
  for (const [index, extraClaim] of c1.extraClaims.entries()) {
    const label = `c1.extraClaims[${index}]`;
    if (!isPlainObject(extraClaim)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    assertReportClaimIdResolves(errors, extraClaim.reportClaimId, directReportClaimIds, `${label}.reportClaimId`);
    checkEnum(errors, extraClaim.status, EXTRA_CLAIM_STATUSES, `${label}.status`);
  }
}

function validateDirectReportClaimCoverage(errors, c1, directReportClaimIds) {
  const covered = new Set();
  const addClaim = (reportClaimId) => {
    if (!nonEmptyString(reportClaimId)) {
      return;
    }
    for (const part of reportClaimId.split('+')) {
      covered.add(part);
    }
  };

  for (const mapping of Array.isArray(c1.claimMappings) ? c1.claimMappings : []) {
    addClaim(mapping.reportClaimId);
  }
  for (const mapping of Array.isArray(c1.truthConditionMappings) ? c1.truthConditionMappings : []) {
    for (const reportClaimId of Array.isArray(mapping.reportClaimIds) ? mapping.reportClaimIds : []) {
      addClaim(reportClaimId);
    }
  }
  for (const coverage of Array.isArray(c1.assertionCoverage) ? c1.assertionCoverage : []) {
    for (const reportClaimId of Array.isArray(coverage.reportClaimIds) ? coverage.reportClaimIds : []) {
      addClaim(reportClaimId);
    }
  }
  for (const extraClaim of Array.isArray(c1.extraClaims) ? c1.extraClaims : []) {
    addClaim(extraClaim.reportClaimId);
  }

  for (const reportClaimId of directReportClaimIds) {
    if (!covered.has(reportClaimId)) {
      errors.push(`report claim ${reportClaimId} is neither mapped nor marked extra/context in c1`);
    }
  }
}

function validateC3(errors, alignment, dossierIndex, directReportClaimIds) {
  const c3 = alignment.c3;
  if (!isPlainObject(c3)) {
    errors.push('c3 must be an object');
    return;
  }
  if (!Array.isArray(c3.assertionVerdictFits)) {
    errors.push('c3.assertionVerdictFits must be an array');
  } else {
    const activeFrameId = alignment.c1?.activeFrameId;
    for (const [index, fit] of c3.assertionVerdictFits.entries()) {
      const label = `c3.assertionVerdictFits[${index}]`;
      if (!isPlainObject(fit)) {
        errors.push(`${label} must be an object`);
        continue;
      }
      const context = dossierIndex.assertionContextById.get(fit.referenceAssertionId);
      if (!context) {
        errors.push(`${label}.referenceAssertionId references unknown assertion id: ${String(fit.referenceAssertionId)}`);
      } else if (activeFrameId && context.frame.id !== activeFrameId) {
        errors.push(`${label}.referenceAssertionId ${fit.referenceAssertionId} does not belong to active frame ${activeFrameId}`);
      }
      assertReportClaimIdResolves(errors, fit.reportClaimId, directReportClaimIds, `${label}.reportClaimId`);
      if (fit.claimVerdictId !== null && !nonEmptyString(fit.claimVerdictId)) {
        errors.push(`${label}.claimVerdictId must be null or a non-empty string`);
      }
      checkEnum(errors, fit.verdictBandFit, VERDICT_BAND_FITS, `${label}.verdictBandFit`);
      checkEnum(errors, fit.confidenceFit, CONFIDENCE_FITS, `${label}.confidenceFit`);
      checkEnum(errors, fit.harmfulError, HARMFUL_ERRORS, `${label}.harmfulError`);
    }
  }
  if (!Array.isArray(c3.evidenceMappings)) {
    errors.push('c3.evidenceMappings must be an array');
  }
  if (!Array.isArray(c3.harmFlags)) {
    errors.push('c3.harmFlags must be an array');
  } else {
    checkStringArray(errors, c3.harmFlags, 'c3.harmFlags');
  }
  if (!Array.isArray(c3.reviewFlags)) {
    errors.push('c3.reviewFlags must be an array');
  } else {
    checkStringArray(errors, c3.reviewFlags, 'c3.reviewFlags');
  }
}

function validateC4(errors, alignment, dossierIndex) {
  const c4Note = alignment.c4Note;
  if (!isPlainObject(c4Note)) {
    errors.push('c4Note must be an object');
    return;
  }

  checkEnum(errors, c4Note.primaryRouteFit, PRIMARY_ROUTE_FITS, 'c4Note.primaryRouteFit');
  const observed = c4Note.observed;
  const expected = c4Note.expectedPrimaryRoute;
  if (!isPlainObject(observed)) {
    errors.push('c4Note.observed must be an object');
  } else {
    if (!normalizeVerdictLabel(observed.verdict)) {
      errors.push(`c4Note.observed.verdict is not a known verdict label: ${String(observed.verdict)}`);
    }
    if (!isPct(observed.truthPercentage)) {
      errors.push('c4Note.observed.truthPercentage must be in [0,100]');
    }
    if (!isPct(observed.confidence)) {
      errors.push('c4Note.observed.confidence must be in [0,100]');
    }
  }
  if (!isPlainObject(expected)) {
    errors.push('c4Note.expectedPrimaryRoute must be an object');
    return;
  }

  const linkedExpected = buildExpectedPrimaryRoute(dossierIndex);
  const artifactLabels = normalizeVerdictSet(expected.acceptedVerdictLabels);
  if (!sameStringSet(artifactLabels, linkedExpected.acceptedVerdictLabels)) {
    errors.push(
      `c4Note.expectedPrimaryRoute.acceptedVerdictLabels ${formatSet(artifactLabels)} ` +
      `must match linked dossier primary route labels ${formatSet(linkedExpected.acceptedVerdictLabels)}`
    );
  }
  if (!sameBand(expected.truthBand, linkedExpected.truthBand)) {
    errors.push('c4Note.expectedPrimaryRoute.truthBand must match linked dossier benchmarkCoherence.familyTruthBand');
  }
  if (!sameBand(expected.confidenceBand, linkedExpected.confidenceBand)) {
    errors.push('c4Note.expectedPrimaryRoute.confidenceBand must match linked dossier benchmarkCoherence.familyConfidenceBand');
  }

  const routeIsInBand = observedInExpectedRoute(observed, expected);
  if (c4Note.primaryRouteFit === 'pass' && !routeIsInBand) {
    errors.push('c4Note.primaryRouteFit=pass requires observed verdict/truth/confidence to be inside expectedPrimaryRoute');
  }
  if (c4Note.primaryRouteFit === 'miss' && routeIsInBand) {
    errors.push('c4Note.primaryRouteFit=miss contradicts observed verdict/truth/confidence inside expectedPrimaryRoute');
  }
  if (alignment.benchmarkPass === true && c4Note.primaryRouteFit !== 'pass') {
    errors.push('benchmarkPass=true requires c4Note.primaryRouteFit=pass');
  }
  if (alignment.benchmarkPass === false && c4Note.primaryRouteFit === 'pass') {
    errors.push('benchmarkPass=false cannot use c4Note.primaryRouteFit=pass');
  }
}

function main() {
  const files = collectTargets(process.argv.slice(2));
  const { byKey: dossierIndexByKey, errors: dossierErrors } = buildDossierIndex();
  if (dossierErrors.length > 0) {
    for (const error of dossierErrors) {
      console.error(error);
    }
    process.exit(1);
  }

  if (files.length === 0) {
    console.log('No reference alignment files found.');
    return;
  }

  let failed = false;
  for (const file of files) {
    let alignment;
    try {
      alignment = readJson(file);
    } catch (error) {
      console.error(`${file}: invalid JSON: ${error.message}`);
      failed = true;
      continue;
    }

    const errors = validateAlignment(file, alignment, dossierIndexByKey);
    if (errors.length > 0) {
      failed = true;
      console.error(`${file}:`);
      for (const error of errors) {
        console.error(`  - ${error}`);
      }
    } else {
      console.log(`${file}: ok`);
    }
  }

  if (failed) {
    process.exit(1);
  }
}

main();
