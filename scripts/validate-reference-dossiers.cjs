#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_DIR = path.join(REPO_ROOT, 'Docs', 'AGENTS', 'Reference_Dossiers');
const SCHEMA_FILE = 'reference-dossier.schema.json';

const INPUT_CLASSIFICATIONS = new Set([
  'single_atomic_claim',
  'ambiguous_single_claim',
  'multi_assertion_input',
  'question',
  'article',
]);

const DETERMINABILITY_VALUES = new Set([
  'determinable',
  'partial',
  'indeterminable',
]);

const DETERMINABILITY_STATUSES = new Set([
  'settled',
  'contested',
  'needs_adjudication',
]);

const ROOT_REQUIRED = [
  'id',
  'version',
  'inputSlug',
  'captainInputValue',
  'language',
  'status',
  'expectedInputClassification',
  'ambiguityPolicy',
  'curation',
  'validityWindow',
  'sourceSnapshots',
  'interpretationFrames',
  'benchmarkCoherence',
];

const ALLOWED_ROOT = new Set(ROOT_REQUIRED);

function usage() {
  console.log(`Usage: node scripts/validate-reference-dossiers.cjs [file-or-dir ...]

Validates structural constraints for Docs/AGENTS/Reference_Dossiers/*.json.
Semantic claim/evidence alignment is intentionally out of scope.
`);
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

function assertSchemaReadable() {
  const schemaPath = path.join(DEFAULT_DIR, SCHEMA_FILE);
  try {
    JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  } catch (error) {
    throw new Error(`Schema file is missing or invalid: ${schemaPath} (${error.message})`);
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireObject(value, label, errors) {
  if (!isObject(value)) {
    errors.push(`${label} must be an object`);
    return false;
  }
  return true;
}

function requireArray(value, label, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return false;
  }
  return true;
}

function requireString(value, label, errors) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${label} must be a non-empty string`);
  }
}

function validateBand(band, label, errors) {
  if (!requireObject(band, label, errors)) {
    return;
  }
  for (const key of ['min', 'max']) {
    const value = band[key];
    if (value !== null && typeof value !== 'number') {
      errors.push(`${label}.${key} must be number or null`);
    }
  }
  if (typeof band.min === 'number' && typeof band.max === 'number' && band.min > band.max) {
    errors.push(`${label}.min must be <= ${label}.max`);
  }
}

function validateDossier(dossier) {
  const errors = [];
  if (!requireObject(dossier, 'dossier', errors)) {
    return errors;
  }

  for (const field of ROOT_REQUIRED) {
    if (!(field in dossier)) {
      errors.push(`missing root field: ${field}`);
    }
  }
  for (const field of Object.keys(dossier)) {
    if (!ALLOWED_ROOT.has(field)) {
      errors.push(`unexpected root field: ${field}`);
    }
  }
  if ('atomicityPolicy' in dossier) {
    errors.push('root atomicityPolicy is forbidden; use interpretationFrames[].atomicityProfile');
  }

  requireString(dossier.id, 'id', errors);
  requireString(dossier.version, 'version', errors);
  requireString(dossier.inputSlug, 'inputSlug', errors);
  requireString(dossier.captainInputValue, 'captainInputValue', errors);
  requireString(dossier.language, 'language', errors);

  if (!INPUT_CLASSIFICATIONS.has(dossier.expectedInputClassification)) {
    errors.push(`expectedInputClassification must be one of: ${[...INPUT_CLASSIFICATIONS].join(', ')}`);
  }

  if (!requireObject(dossier.validityWindow, 'validityWindow', errors)) {
    return errors;
  }
  if (typeof dossier.validityWindow.currentSnapshot !== 'boolean') {
    errors.push('validityWindow.currentSnapshot must be boolean');
  }
  if (dossier.validityWindow.currentSnapshot === true && !dossier.validityWindow.referenceTime) {
    errors.push('validityWindow.currentSnapshot is true but validityWindow.referenceTime is missing');
  }

  if (!requireArray(dossier.sourceSnapshots, 'sourceSnapshots', errors)) {
    return errors;
  }
  const sourceIds = new Set();
  dossier.sourceSnapshots.forEach((source, index) => {
    const label = `sourceSnapshots[${index}]`;
    if (!requireObject(source, label, errors)) {
      return;
    }
    requireString(source.id, `${label}.id`, errors);
    if (sourceIds.has(source.id)) {
      errors.push(`duplicate source id: ${source.id}`);
    }
    sourceIds.add(source.id);
  });

  if (!requireArray(dossier.interpretationFrames, 'interpretationFrames', errors)) {
    return errors;
  }
  dossier.interpretationFrames.forEach((frame, frameIndex) => {
    const frameLabel = `interpretationFrames[${frameIndex}]`;
    if (!requireObject(frame, frameLabel, errors)) {
      return;
    }
    requireString(frame.id, `${frameLabel}.id`, errors);
    if (!requireObject(frame.atomicityProfile, `${frameLabel}.atomicityProfile`, errors)) {
      return;
    }
    if (!DETERMINABILITY_VALUES.has(frame.atomicityProfile.determinability)) {
      errors.push(`${frameLabel}.atomicityProfile.determinability must be one of: ${[...DETERMINABILITY_VALUES].join(', ')}`);
    }
    if (!DETERMINABILITY_STATUSES.has(frame.atomicityProfile.determinabilityStatus)) {
      errors.push(`${frameLabel}.atomicityProfile.determinabilityStatus must be one of: ${[...DETERMINABILITY_STATUSES].join(', ')}`);
    }

    const truthConditions = frame.atomicityProfile.distinctTruthConditions;
    if (!requireArray(truthConditions, `${frameLabel}.atomicityProfile.distinctTruthConditions`, errors)) {
      return;
    }
    const truthConditionIds = new Set();
    truthConditions.forEach((truthCondition, tcIndex) => {
      const tcLabel = `${frameLabel}.atomicityProfile.distinctTruthConditions[${tcIndex}]`;
      if (!requireObject(truthCondition, tcLabel, errors)) {
        return;
      }
      requireString(truthCondition.id, `${tcLabel}.id`, errors);
      if (truthConditionIds.has(truthCondition.id)) {
        errors.push(`${frameLabel} duplicate truth condition id: ${truthCondition.id}`);
      }
      truthConditionIds.add(truthCondition.id);
      if ('coversReferenceAssertionIds' in truthCondition) {
        errors.push(`${tcLabel}.coversReferenceAssertionIds is forbidden; use referenceAssertions[].truthConditionId`);
      }
      if (typeof truthCondition.independentAssessabilityRequired !== 'boolean') {
        errors.push(`${tcLabel}.independentAssessabilityRequired must be boolean`);
      }
    });

    if (!requireArray(frame.referenceAssertions, `${frameLabel}.referenceAssertions`, errors)) {
      return;
    }
    frame.referenceAssertions.forEach((assertion, raIndex) => {
      const raLabel = `${frameLabel}.referenceAssertions[${raIndex}]`;
      if (!requireObject(assertion, raLabel, errors)) {
        return;
      }
      requireString(assertion.id, `${raLabel}.id`, errors);
      requireString(assertion.truthConditionId, `${raLabel}.truthConditionId`, errors);
      if (!truthConditionIds.has(assertion.truthConditionId)) {
        errors.push(`${raLabel}.truthConditionId does not resolve in same frame: ${assertion.truthConditionId}`);
      }
      validateBand(assertion.truthBand, `${raLabel}.truthBand`, errors);
      validateBand(assertion.confidenceBand, `${raLabel}.confidenceBand`, errors);
      for (const sourceField of ['evidenceSourceIds', 'knownCounterEvidenceSourceIds']) {
        if (!requireArray(assertion[sourceField], `${raLabel}.${sourceField}`, errors)) {
          continue;
        }
        for (const sourceId of assertion[sourceField]) {
          if (!sourceIds.has(sourceId)) {
            errors.push(`${raLabel}.${sourceField} references unknown source id: ${sourceId}`);
          }
        }
      }
      if (assertion.freshnessRequirement === 'current_snapshot' && !dossier.validityWindow.referenceTime) {
        errors.push(`${raLabel} is current_snapshot but validityWindow.referenceTime is missing`);
      }
      if (assertion.freshnessRequirement === 'current_snapshot' && dossier.validityWindow.currentSnapshot !== true) {
        errors.push(`${raLabel} is current_snapshot but validityWindow.currentSnapshot is not true`);
      }
    });

    for (const truthCondition of truthConditions) {
      if (truthCondition.independentAssessabilityRequired !== true) {
        continue;
      }
      const hasAssertion = frame.referenceAssertions.some((assertion) =>
        assertion.truthConditionId === truthCondition.id && assertion.role === 'required'
      );
      if (!hasAssertion) {
        errors.push(`${frameLabel} strict truth condition has no required reference assertion: ${truthCondition.id}`);
      }
    }
  });

  validateBand(dossier.benchmarkCoherence?.familyTruthBand, 'benchmarkCoherence.familyTruthBand', errors);
  validateBand(dossier.benchmarkCoherence?.familyConfidenceBand, 'benchmarkCoherence.familyConfidenceBand', errors);
  return errors;
}

function main() {
  assertSchemaReadable();
  const files = collectTargets(process.argv.slice(2));
  if (files.length === 0) {
    console.log('No reference dossier files found.');
    return;
  }

  let failed = false;
  for (const file of files) {
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      console.error(`${file}: invalid JSON: ${error.message}`);
      failed = true;
      continue;
    }
    const errors = validateDossier(parsed);
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
