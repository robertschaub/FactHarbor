#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020');

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

function loadBenchmarkSlugs() {
  const benchmark = readJson(BENCHMARK_FILE);
  if (!Array.isArray(benchmark.families)) {
    throw new Error(`Expected ${BENCHMARK_FILE} to contain a families[] array`);
  }
  return new Set(benchmark.families.map((family) => family.slug).filter(Boolean));
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

function bandsOverlap(left, right) {
  return left.min <= right.max && right.min <= left.max;
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
    if (!bandsOverlap(verdictBand, truthBand) && !nonEmptyString(assertion.notes)) {
      errors.push(
        `${label}.acceptedVerdictLabels ${normalized} does not overlap truthBand ` +
        `${truthBand.min}-${truthBand.max}; add assertion.notes only for an explicit exception`
      );
    }
  }
}

function validateCrossFields(dossier, benchmarkSlugs) {
  const errors = [];

  validateBandOrder(dossier.benchmarkCoherence.familyTruthBand, 'benchmarkCoherence.familyTruthBand', errors);
  validateBandOrder(dossier.benchmarkCoherence.familyConfidenceBand, 'benchmarkCoherence.familyConfidenceBand', errors);

  if (!benchmarkSlugs.has(dossier.inputSlug)) {
    errors.push(`inputSlug does not match any benchmark family slug: ${dossier.inputSlug}`);
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
  }

  for (const [frameIndex, frame] of dossier.interpretationFrames.entries()) {
    const frameLabel = `interpretationFrames[${frameIndex}]`;
    const truthConditionIds = new Set();

    for (const [truthIndex, truthCondition] of frame.atomicityProfile.distinctTruthConditions.entries()) {
      const truthLabel = `${frameLabel}.atomicityProfile.distinctTruthConditions[${truthIndex}]`;
      if (truthConditionIds.has(truthCondition.id)) {
        errors.push(`${frameLabel} duplicate truth condition id: ${truthCondition.id}`);
      }
      truthConditionIds.add(truthCondition.id);
      if ('coversReferenceAssertionIds' in truthCondition) {
        errors.push(`${truthLabel}.coversReferenceAssertionIds is forbidden; use referenceAssertions[].truthConditionId`);
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

      if (!truthConditionIds.has(assertion.truthConditionId)) {
        errors.push(`${assertionLabel}.truthConditionId does not resolve in same frame: ${assertion.truthConditionId}`);
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

  return errors;
}

function main() {
  const files = collectTargets(process.argv.slice(2));
  const validateSchema = buildSchemaValidator();
  const benchmarkSlugs = loadBenchmarkSlugs();

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
    const crossFieldErrors = schemaOk ? validateCrossFields(dossier, benchmarkSlugs) : [];
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
