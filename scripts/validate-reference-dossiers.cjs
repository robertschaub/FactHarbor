#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Ajv2020 = require('ajv/dist/2020');
const {
  normalizeVerdictSet,
  sameStringSet,
  sortedSetValues,
} = require('./lib/reference-dossier-routing.cjs');

const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_DIR = path.join(REPO_ROOT, 'Docs', 'AGENTS', 'Reference_Dossiers');
const SCHEMA_FILE = 'reference-dossier.schema.json';
const BENCHMARK_FILE = path.join(REPO_ROOT, 'Docs', 'AGENTS', 'benchmark-expectations.json');

const VERDICT_BANDS = [
  { label: 'FALSE', min: 0, max: 14 },
  { label: 'MOSTLY-FALSE', min: 15, max: 28 },
  { label: 'LEANING-FALSE', min: 29, max: 42 },
  { label: 'MIXED', min: 43, max: 57 },
  { label: 'UNVERIFIED', min: 43, max: 57 },
  { label: 'LEANING-TRUE', min: 58, max: 71 },
  { label: 'MOSTLY-TRUE', min: 72, max: 85 },
  { label: 'TRUE', min: 86, max: 100 },
];

function usage() {
  console.log(`Usage: node scripts/validate-reference-dossiers.cjs [file-or-dir ...]

Validates Docs/AGENTS/Reference_Dossiers/*.json against the JSON Schema, then
applies cross-field contract checks that JSON Schema cannot express cleanly.
Semantic claim/evidence alignment is intentionally out of scope.
`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function collectTargets(args) {
  if (args.includes('--help') || args.includes('-h')) {
    usage();
    process.exit(0);
  }

  const roots = args.length > 0 ? args.map((arg) => path.resolve(process.cwd(), arg)) : [DEFAULT_DIR];
  const files = [];
  for (const target of roots) {
    if (!fs.existsSync(target)) {
      throw new Error(`Target does not exist: ${target}`);
    }
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(target)) {
        if (!entry.endsWith('.json') || entry === SCHEMA_FILE) {
          continue;
        }
        files.push(path.join(target, entry));
      }
    } else if (target.endsWith('.json') && path.basename(target) !== SCHEMA_FILE) {
      files.push(target);
    }
  }
  return files;
}

function buildSchemaValidator() {
  const schemaPath = path.join(DEFAULT_DIR, SCHEMA_FILE);
  const schema = readJson(schemaPath);
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  return ajv.compile(schema);
}

function loadBenchmarkFamilies() {
  const benchmark = readJson(BENCHMARK_FILE);
  if (!Array.isArray(benchmark.families)) {
    throw new Error(`Expected ${BENCHMARK_FILE} to contain a families[] array`);
  }
  const bySlug = new Map();
  for (const family of benchmark.families) {
    if (!family.slug) {
      continue;
    }
    if (bySlug.has(family.slug)) {
      throw new Error(`Duplicate benchmark family slug in ${BENCHMARK_FILE}: ${family.slug}`);
    }
    bySlug.set(family.slug, family);
  }
  return bySlug;
}

function formatSchemaError(error) {
  const where = error.instancePath || '(root)';
  if (error.keyword === 'additionalProperties') {
    return `${where} unexpected property: ${error.params.additionalProperty}`;
  }
  if (error.keyword === 'required') {
    return `${where} missing required property: ${error.params.missingProperty}`;
  }
  return `${where} ${error.message}`;
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseSha256Hash(value) {
  if (!nonEmptyString(value)) {
    return null;
  }
  const match = value.trim().match(/^sha256:([a-f0-9]{64})$/i);
  return match ? match[1].toLowerCase() : null;
}

function normalizeVerdictLabel(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toUpperCase().replace(/_/g, '-');
  return VERDICT_BANDS.some((band) => band.label === normalized) ? normalized : null;
}

function bandForLabel(label) {
  return VERDICT_BANDS.find((band) => band.label === label) ?? null;
}

function formatBand(band) {
  if (!band) {
    return '(missing)';
  }
  return `${band.min}-${band.max}`;
}

function bandsOverlap(left, right) {
  return left.min <= right.max && right.min <= left.max;
}

function bandsEqual(left, right) {
  return Boolean(left && right && left.min === right.min && left.max === right.max);
}

function formatStringSet(set) {
  return `[${sortedSetValues(set).join(', ')}]`;
}

function hasBandException(assertion) {
  return typeof assertion.notes === 'string' && assertion.notes.trim().startsWith('BAND_EXCEPTION:');
}

function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function approxEqual(left, right, tolerance = 0.001) {
  return Math.abs(left - right) <= tolerance;
}

function validateBandOrder(band, label, errors) {
  if (!band || typeof band.min !== 'number' || typeof band.max !== 'number') {
    return;
  }
  if (band.min > band.max) {
    errors.push(`${label}.min must be <= ${label}.max`);
  }
}

function validateVerdictBandConsistency(assertion, label, errors) {
  const truthBand = assertion.truthBand;
  if (
    !truthBand ||
    typeof truthBand.min !== 'number' ||
    typeof truthBand.max !== 'number' ||
    !Array.isArray(assertion.acceptedVerdictLabels) ||
    assertion.acceptedVerdictLabels.length === 0
  ) {
    return;
  }

  for (const verdict of assertion.acceptedVerdictLabels) {
    const normalized = normalizeVerdictLabel(verdict);
    if (!normalized) {
      errors.push(`${label}.acceptedVerdictLabels contains unknown verdict label: ${verdict}`);
      continue;
    }
    const verdictBand = bandForLabel(normalized);
    if (!bandsOverlap(verdictBand, truthBand) && !hasBandException(assertion)) {
      errors.push(
        `${label}.acceptedVerdictLabels ${normalized} does not overlap truthBand ` +
        `${truthBand.min}-${truthBand.max}; add assertion.notes starting with BAND_EXCEPTION: only for an explicit exception`
      );
    }
  }
}

function validateBenchmarkCoherence(dossier, benchmarkFamily, file, errors) {
  if (!benchmarkFamily) {
    return;
  }
  if (!bandsEqual(dossier.benchmarkCoherence.familyTruthBand, benchmarkFamily.truthPercentageBand)) {
    errors.push(
      `benchmarkCoherence.familyTruthBand ${formatBand(dossier.benchmarkCoherence.familyTruthBand)} ` +
      `must match benchmark truthPercentageBand ${formatBand(benchmarkFamily.truthPercentageBand)} for ${dossier.inputSlug}`
    );
  }
  if (!bandsEqual(dossier.benchmarkCoherence.familyConfidenceBand, benchmarkFamily.confidenceBand)) {
    errors.push(
      `benchmarkCoherence.familyConfidenceBand ${formatBand(dossier.benchmarkCoherence.familyConfidenceBand)} ` +
      `must match benchmark confidenceBand ${formatBand(benchmarkFamily.confidenceBand)} for ${dossier.inputSlug}`
    );
  }

  const referenceDossier = benchmarkFamily.referenceDossier;
  const relPath = file ? path.relative(REPO_ROOT, file).replace(/\\/g, '/') : null;
  if (!referenceDossier || typeof referenceDossier !== 'object') {
    errors.push(`benchmark family ${dossier.inputSlug} is missing referenceDossier link`);
    return;
  }
  if (referenceDossier.id !== dossier.id) {
    errors.push(`benchmark family ${dossier.inputSlug}.referenceDossier.id must equal dossier id ${dossier.id}`);
  }
  if (referenceDossier.version !== dossier.version) {
    errors.push(`benchmark family ${dossier.inputSlug}.referenceDossier.version must equal dossier version ${dossier.version}`);
  }
  if (referenceDossier.status !== dossier.status) {
    errors.push(`benchmark family ${dossier.inputSlug}.referenceDossier.status must equal dossier status ${dossier.status}`);
  }
  if (relPath && referenceDossier.path !== relPath) {
    errors.push(`benchmark family ${dossier.inputSlug}.referenceDossier.path must equal ${relPath}`);
  }
}

function validateLocalSnapshot(source, errors) {
  const hasLocalPath = nonEmptyString(source.localPath);
  const hasLocalHash = nonEmptyString(source.localHash);
  if (!hasLocalPath && hasLocalHash) {
    errors.push(`${source.id}.localHash is set but localPath is missing`);
    return;
  }
  if (!hasLocalPath) {
    return;
  }
  const expectedHash = parseSha256Hash(source.localHash);
  if (!expectedHash) {
    errors.push(`${source.id}.localHash must be sha256:<64 hex chars> when localPath is set`);
    return;
  }
  const resolvedPath = path.resolve(REPO_ROOT, source.localPath);
  if (!resolvedPath.startsWith(`${REPO_ROOT}${path.sep}`)) {
    errors.push(`${source.id}.localPath must resolve inside the repository: ${source.localPath}`);
    return;
  }
  if (!fs.existsSync(resolvedPath)) {
    errors.push(`${source.id}.localPath does not exist: ${source.localPath}`);
    return;
  }
  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(resolvedPath)).digest('hex');
  if (actualHash !== expectedHash) {
    errors.push(`${source.id}.localHash mismatch for ${source.localPath}: expected ${expectedHash}, got ${actualHash}`);
  }
}

function validateTopLineLikeLabels(routeLabel, truthBand, acceptedVerdictLabels, errors) {
  if (
    !truthBand ||
    typeof truthBand.min !== 'number' ||
    typeof truthBand.max !== 'number' ||
    !Array.isArray(acceptedVerdictLabels)
  ) {
    return;
  }
  for (const verdict of acceptedVerdictLabels) {
    const normalized = normalizeVerdictLabel(verdict);
    if (!normalized) {
      errors.push(`${routeLabel}.acceptedVerdictLabels contains unknown verdict label: ${verdict}`);
      continue;
    }
    const verdictBand = bandForLabel(normalized);
    if (!bandsOverlap(verdictBand, truthBand)) {
      errors.push(
        `${routeLabel}.acceptedVerdictLabels ${normalized} does not overlap truthBand ` +
        `${truthBand.min}-${truthBand.max}`
      );
    }
  }
}

function validateAssertionRouting(dossier, assertionById, assertionContextById, frameById, benchmarkFamily, errors) {
  const routingFields = [
    'topLineAssertionIds',
    'coverageGuardAssertionIds',
    'contextAssertionIds',
  ];
  const usedByField = new Map();

  for (const field of routingFields) {
    const values = dossier.benchmarkCoherence[field];
    if (!Array.isArray(values)) {
      continue;
    }
    const seen = new Set();
    for (const assertionId of values) {
      if (seen.has(assertionId)) {
        errors.push(`benchmarkCoherence.${field} contains duplicate assertion id: ${assertionId}`);
      }
      seen.add(assertionId);
      const assertion = assertionById.get(assertionId);
      if (!assertion) {
        errors.push(`benchmarkCoherence.${field} references unknown assertion id: ${assertionId}`);
        continue;
      }
      if (field === 'topLineAssertionIds') {
        const context = assertionContextById.get(assertionId);
        if (context?.frame?.frameRole !== 'primary') {
          errors.push(`benchmarkCoherence.${field} ${assertionId} must route from a primary frame`);
        }
        const dominanceRole = context?.truthCondition?.dominanceRole;
        if (!['dominant', 'aggregate_topline'].includes(dominanceRole)) {
          errors.push(
            `benchmarkCoherence.${field} ${assertionId} must reference a dominant or aggregate_topline truth condition`
          );
        }
        if (!bandsEqual(assertion.truthBand, dossier.benchmarkCoherence.familyTruthBand)) {
          errors.push(
            `benchmarkCoherence.${field} ${assertionId} truthBand ${formatBand(assertion.truthBand)} ` +
            `must match familyTruthBand ${formatBand(dossier.benchmarkCoherence.familyTruthBand)}`
          );
        }
        if (!bandsEqual(assertion.confidenceBand, dossier.benchmarkCoherence.familyConfidenceBand)) {
          errors.push(
            `benchmarkCoherence.${field} ${assertionId} confidenceBand ${formatBand(assertion.confidenceBand)} ` +
            `must match familyConfidenceBand ${formatBand(dossier.benchmarkCoherence.familyConfidenceBand)}`
          );
        }
        if (assertion.role !== 'required') {
          errors.push(`benchmarkCoherence.${field} ${assertionId} must reference a required assertion`);
        }
      }
      if (field === 'contextAssertionIds' && assertion.role !== 'tolerated_context') {
        errors.push(`benchmarkCoherence.${field} ${assertionId} must reference a tolerated_context assertion`);
      }
      if (field === 'contextAssertionIds') {
        const context = assertionContextById.get(assertionId);
        if (context?.truthCondition?.dominanceRole !== 'context') {
          errors.push(`benchmarkCoherence.${field} ${assertionId} must reference a context truth condition`);
        }
      }
    }
    usedByField.set(field, seen);
  }

  const topLineIds = usedByField.get('topLineAssertionIds') ?? new Set();
  for (const field of ['coverageGuardAssertionIds', 'contextAssertionIds']) {
    const values = usedByField.get(field) ?? new Set();
    for (const assertionId of values) {
      if (topLineIds.has(assertionId)) {
        errors.push(`benchmarkCoherence.${field} must not overlap topLineAssertionIds: ${assertionId}`);
      }
    }
  }

  if (benchmarkFamily && topLineIds.size > 0) {
    const familyLabels = normalizeVerdictSet(benchmarkFamily.expectedVerdictLabels);
    const topLineLabels = new Set();
    for (const assertionId of topLineIds) {
      const assertion = assertionById.get(assertionId);
      for (const label of normalizeVerdictSet(assertion?.acceptedVerdictLabels)) {
        topLineLabels.add(label);
      }
    }
    if (!sameStringSet(topLineLabels, familyLabels)) {
      errors.push(
        `benchmarkCoherence.topLineAssertionIds acceptedVerdictLabels ${formatStringSet(topLineLabels)} ` +
        `must match benchmark expectedVerdictLabels ${formatStringSet(familyLabels)}`
      );
    }
  }

  const alternativeRoutes = Array.isArray(dossier.benchmarkCoherence.alternativeTopLineRoutes)
    ? dossier.benchmarkCoherence.alternativeTopLineRoutes
    : [];
  const alternativeRouteIds = new Set();
  for (const [routeIndex, route] of alternativeRoutes.entries()) {
    const routeLabel = `benchmarkCoherence.alternativeTopLineRoutes[${routeIndex}]`;
    if (alternativeRouteIds.has(route.routeId)) {
      errors.push(`${routeLabel}.routeId is duplicated: ${route.routeId}`);
    }
    alternativeRouteIds.add(route.routeId);

    validateBandOrder(route.truthBand, `${routeLabel}.truthBand`, errors);
    validateBandOrder(route.confidenceBand, `${routeLabel}.confidenceBand`, errors);
    validateTopLineLikeLabels(routeLabel, route.truthBand, route.acceptedVerdictLabels, errors);

    const frame = frameById.get(route.frameId);
    if (!frame) {
      errors.push(`${routeLabel}.frameId references unknown frame: ${route.frameId}`);
      continue;
    }
    if (frame.frameRole !== 'secondary') {
      errors.push(`${routeLabel}.frameId must reference a secondary frame`);
    }

    const seenAssertions = new Set();
    for (const assertionId of route.assertionIds) {
      if (seenAssertions.has(assertionId)) {
        errors.push(`${routeLabel}.assertionIds contains duplicate assertion id: ${assertionId}`);
      }
      seenAssertions.add(assertionId);
      if (topLineIds.has(assertionId)) {
        errors.push(`${routeLabel}.assertionIds must not overlap primary topLineAssertionIds: ${assertionId}`);
      }
      const assertion = assertionById.get(assertionId);
      const context = assertionContextById.get(assertionId);
      if (!assertion || !context) {
        errors.push(`${routeLabel}.assertionIds references unknown assertion id: ${assertionId}`);
        continue;
      }
      if (context.frame?.id !== route.frameId) {
        errors.push(`${routeLabel}.assertionIds ${assertionId} does not belong to frame ${route.frameId}`);
      }
      if (assertion.role !== 'required') {
        errors.push(`${routeLabel}.assertionIds ${assertionId} must reference a required assertion`);
      }
      if (!bandsEqual(assertion.truthBand, route.truthBand)) {
        errors.push(
          `${routeLabel}.assertionIds ${assertionId} truthBand ${formatBand(assertion.truthBand)} ` +
          `must match route truthBand ${formatBand(route.truthBand)}`
        );
      }
      if (!bandsEqual(assertion.confidenceBand, route.confidenceBand)) {
        errors.push(
          `${routeLabel}.assertionIds ${assertionId} confidenceBand ${formatBand(assertion.confidenceBand)} ` +
          `must match route confidenceBand ${formatBand(route.confidenceBand)}`
        );
      }
      if (!sameStringSet(normalizeVerdictSet(assertion.acceptedVerdictLabels), normalizeVerdictSet(route.acceptedVerdictLabels))) {
        errors.push(
          `${routeLabel}.assertionIds ${assertionId} acceptedVerdictLabels ` +
          `${formatStringSet(normalizeVerdictSet(assertion.acceptedVerdictLabels))} must match route labels ` +
          `${formatStringSet(normalizeVerdictSet(route.acceptedVerdictLabels))}`
        );
      }
      if (!['dominant', 'aggregate_topline'].includes(context.truthCondition?.dominanceRole)) {
        errors.push(`${routeLabel}.assertionIds ${assertionId} must reference a dominant or aggregate_topline truth condition`);
      }
    }
  }
}

function validateCrossFields(dossier, benchmarkFamilies, file) {
  const errors = [];

  validateBandOrder(dossier.benchmarkCoherence.familyTruthBand, 'benchmarkCoherence.familyTruthBand', errors);
  validateBandOrder(dossier.benchmarkCoherence.familyConfidenceBand, 'benchmarkCoherence.familyConfidenceBand', errors);

  const benchmarkFamily = benchmarkFamilies.get(dossier.inputSlug);
  if (!benchmarkFamily) {
    errors.push(`inputSlug does not match any benchmark family slug: ${dossier.inputSlug}`);
  } else {
    validateBenchmarkCoherence(dossier, benchmarkFamily, file, errors);
  }

  if (dossier.interpretationFrames.length >= 2 && dossier.ambiguityPolicy === 'commit_allowed') {
    if (!nonEmptyString(dossier.ambiguityPolicyRationale)) {
      errors.push('ambiguityPolicy=commit_allowed with multiple frames requires ambiguityPolicyRationale');
    }
  }

  if (dossier.validityWindow.currentSnapshot === true && !nonEmptyString(dossier.validityWindow.referenceTime)) {
    errors.push('validityWindow.currentSnapshot is true but validityWindow.referenceTime is missing');
  }

  const sourceIds = new Set();
  for (const source of dossier.sourceSnapshots) {
    if (sourceIds.has(source.id)) {
      errors.push(`duplicate source id: ${source.id}`);
    }
    sourceIds.add(source.id);
    validateLocalSnapshot(source, errors);
  }

  const frameIds = new Set();
  const frameById = new Map();
  const assertionIds = new Set();
  const assertionById = new Map();
  const assertionContextById = new Map();
  let primaryFrameCount = 0;

  for (const [frameIndex, frame] of dossier.interpretationFrames.entries()) {
    const frameLabel = `interpretationFrames[${frameIndex}]`;
    const truthConditionIds = new Set();
    if (frameIds.has(frame.id)) {
      errors.push(`duplicate frame id: ${frame.id}`);
    }
    frameIds.add(frame.id);
    frameById.set(frame.id, frame);
    if (frame.frameRole === 'primary') {
      primaryFrameCount += 1;
    }
    if (frame.frameRole === 'caveat' && frame.admissibility === 'excluded') {
      errors.push(`${frameLabel}.frameRole=caveat should not be combined with admissibility=excluded`);
    }

    let weightedTruthConditionTotal = 0;
    let dominantTruthConditionCount = 0;
    for (const [truthIndex, truthCondition] of frame.atomicityProfile.distinctTruthConditions.entries()) {
      const truthLabel = `${frameLabel}.atomicityProfile.distinctTruthConditions[${truthIndex}]`;
      if (truthConditionIds.has(truthCondition.id)) {
        errors.push(`${frameLabel} duplicate truth condition id: ${truthCondition.id}`);
      }
      truthConditionIds.add(truthCondition.id);
      if ('coversReferenceAssertionIds' in truthCondition) {
        errors.push(`${truthLabel}.coversReferenceAssertionIds is forbidden; use referenceAssertions[].truthConditionId`);
      }
      if (['dominant', 'supporting', 'aggregate_topline'].includes(truthCondition.dominanceRole)) {
        if (!isPositiveNumber(truthCondition.dominanceWeight)) {
          errors.push(`${truthLabel}.dominanceWeight must be > 0 for dominanceRole=${truthCondition.dominanceRole}`);
        }
      }
      if (['caveat', 'context'].includes(truthCondition.dominanceRole)) {
        if (!(truthCondition.dominanceWeight === null || truthCondition.dominanceWeight === 0)) {
          errors.push(`${truthLabel}.dominanceWeight must be null or 0 for dominanceRole=${truthCondition.dominanceRole}`);
        }
      }
      if (truthCondition.dominanceRole === 'aggregate_topline' && frame.frameRole === 'caveat') {
        errors.push(`${truthLabel}.dominanceRole=aggregate_topline is not allowed in a caveat frame`);
      }
      if (truthCondition.dominanceRole === 'dominant') {
        dominantTruthConditionCount += 1;
      }
      if (['dominant', 'supporting'].includes(truthCondition.dominanceRole)) {
        weightedTruthConditionTotal += truthCondition.dominanceWeight;
      }
    }

    if (['primary', 'secondary'].includes(frame.frameRole)) {
      if (dominantTruthConditionCount === 0) {
        errors.push(`${frameLabel}.frameRole=${frame.frameRole} requires at least one dominant truth condition`);
      }
      if (!approxEqual(weightedTruthConditionTotal, 1)) {
        errors.push(
          `${frameLabel} dominant/supporting dominanceWeight values must sum to 1.0; got ${weightedTruthConditionTotal.toFixed(3)}`
        );
      }
    }

    for (const [truthIndex, truthCondition] of frame.atomicityProfile.distinctTruthConditions.entries()) {
      const truthLabel = `${frameLabel}.atomicityProfile.distinctTruthConditions[${truthIndex}]`;
      for (const mergeTarget of truthCondition.mergeAllowedWith) {
        if (!truthConditionIds.has(mergeTarget)) {
          errors.push(`${truthLabel}.mergeAllowedWith references unknown truth condition: ${mergeTarget}`);
        }
      }
    }

    for (const [assertionIndex, assertion] of frame.referenceAssertions.entries()) {
      const assertionLabel = `${frameLabel}.referenceAssertions[${assertionIndex}]`;
      if (assertionIds.has(assertion.id)) {
        errors.push(`duplicate reference assertion id: ${assertion.id}`);
      }
      assertionIds.add(assertion.id);
      assertionById.set(assertion.id, assertion);
      assertionContextById.set(assertion.id, { frame, truthCondition: null });

      if (!truthConditionIds.has(assertion.truthConditionId)) {
        errors.push(`${assertionLabel}.truthConditionId does not resolve in same frame: ${assertion.truthConditionId}`);
      }
      const truthCondition = frame.atomicityProfile.distinctTruthConditions.find((candidate) =>
        candidate.id === assertion.truthConditionId
      );
      assertionContextById.set(assertion.id, { frame, truthCondition });
      if (assertion.separability === 'strict' && truthCondition?.independentAssessabilityRequired !== true) {
        errors.push(`${assertionLabel}.separability=strict requires an independently assessable truth condition`);
      }
      if (assertion.role === 'required' && assertion.evidenceSourceIds.length === 0) {
        errors.push(`${assertionLabel}.role=required requires at least one evidenceSourceId`);
      }

      for (const sourceField of ['evidenceSourceIds', 'knownCounterEvidenceSourceIds']) {
        for (const sourceId of assertion[sourceField]) {
          if (!sourceIds.has(sourceId)) {
            errors.push(`${assertionLabel}.${sourceField} references unknown source id: ${sourceId}`);
          }
        }
      }

      if (assertion.freshnessRequirement === 'current_snapshot') {
        if (dossier.validityWindow.currentSnapshot !== true) {
          errors.push(`${assertionLabel} is current_snapshot but validityWindow.currentSnapshot is not true`);
        }
        if (!nonEmptyString(dossier.validityWindow.referenceTime)) {
          errors.push(`${assertionLabel} is current_snapshot but validityWindow.referenceTime is missing`);
        }
      }

      validateBandOrder(assertion.truthBand, `${assertionLabel}.truthBand`, errors);
      validateBandOrder(assertion.confidenceBand, `${assertionLabel}.confidenceBand`, errors);
      validateVerdictBandConsistency(assertion, assertionLabel, errors);
    }

    for (const truthCondition of frame.atomicityProfile.distinctTruthConditions) {
      if (truthCondition.independentAssessabilityRequired !== true) {
        continue;
      }
      const hasRequiredAssertion = frame.referenceAssertions.some((assertion) =>
        assertion.truthConditionId === truthCondition.id && assertion.role === 'required'
      );
      if (!hasRequiredAssertion) {
        errors.push(`${frameLabel} strict truth condition has no required reference assertion: ${truthCondition.id}`);
      }
    }
  }

  if (primaryFrameCount === 0) {
    errors.push('interpretationFrames must contain at least one frameRole=primary frame');
  }
  if (dossier.ambiguityPolicy !== 'must_cover_all' && primaryFrameCount !== 1) {
    errors.push(`ambiguityPolicy=${dossier.ambiguityPolicy} requires exactly one frameRole=primary frame`);
  }

  validateAssertionRouting(dossier, assertionById, assertionContextById, frameById, benchmarkFamily, errors);

  return errors;
}

function main() {
  const files = collectTargets(process.argv.slice(2));
  const validateSchema = buildSchemaValidator();
  const benchmarkFamilies = loadBenchmarkFamilies();

  if (files.length === 0) {
    console.log('No reference dossier files found.');
    return;
  }

  let failed = false;
  for (const file of files) {
    let dossier;
    try {
      dossier = readJson(file);
    } catch (error) {
      console.error(`${file}: invalid JSON: ${error.message}`);
      failed = true;
      continue;
    }

    const schemaOk = validateSchema(dossier);
    const schemaErrors = schemaOk ? [] : validateSchema.errors.map(formatSchemaError);
    const crossFieldErrors = schemaOk ? validateCrossFields(dossier, benchmarkFamilies, file) : [];
    const errors = [...schemaErrors, ...crossFieldErrors];

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
