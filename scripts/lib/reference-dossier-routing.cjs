const fs = require('fs');
const path = require('path');

const REFERENCE_DOSSIER_REL_DIR = path.join('Docs', 'AGENTS', 'Reference_Dossiers');
const REFERENCE_ALIGNMENT_GATE_REASON =
  'Phase 0b manual-vs-judge reliability gate has not passed; dossier-backed C1/C3 remains diagnostic colour.';

function normalizeRelPath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function normalizeVerdictLabel(value) {
  if (typeof value !== 'string') return null;
  return value.trim().toUpperCase().replace(/\s+/g, '-').replace(/_/g, '-');
}

function normalizeVerdictSet(values) {
  return new Set((Array.isArray(values) ? values : []).map(normalizeVerdictLabel).filter(Boolean));
}

function sortedSetValues(set) {
  return [...set].sort();
}

function sameStringSet(left, right) {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

function cloneBand(band) {
  if (!band || typeof band.min !== 'number' || typeof band.max !== 'number') return null;
  return { min: band.min, max: band.max };
}

function bandsEqual(left, right) {
  return Boolean(left && right && left.min === right.min && left.max === right.max);
}

function commonBand(assertions, fieldName) {
  const bands = assertions.map((assertion) => cloneBand(assertion?.[fieldName])).filter(Boolean);
  if (bands.length === 0) return null;
  const [first] = bands;
  return bands.every((band) => bandsEqual(band, first)) ? first : null;
}

function buildAssertionIndex(dossier) {
  const assertionById = new Map();
  const frameByAssertionId = new Map();
  const truthConditionByAssertionId = new Map();

  for (const frame of Array.isArray(dossier?.interpretationFrames) ? dossier.interpretationFrames : []) {
    const truthConditions = new Map(
      (Array.isArray(frame?.atomicityProfile?.distinctTruthConditions)
        ? frame.atomicityProfile.distinctTruthConditions
        : []
      ).map((truthCondition) => [truthCondition?.id, truthCondition]),
    );

    for (const assertion of Array.isArray(frame?.referenceAssertions) ? frame.referenceAssertions : []) {
      assertionById.set(assertion.id, assertion);
      frameByAssertionId.set(assertion.id, frame);
      truthConditionByAssertionId.set(assertion.id, truthConditions.get(assertion.truthConditionId) || null);
    }
  }

  return { assertionById, frameByAssertionId, truthConditionByAssertionId };
}

function summarizeAssertion(assertion, routeRole, index) {
  const frame = index.frameByAssertionId.get(assertion.id) || null;
  const truthCondition = index.truthConditionByAssertionId.get(assertion.id) || null;
  return {
    id: assertion.id,
    routeRole,
    assertionRole: assertion.role,
    frameId: frame?.id || null,
    frameRole: frame?.frameRole || null,
    truthConditionId: assertion.truthConditionId,
    truthConditionDescription: truthCondition?.description || null,
    dominanceRole: truthCondition?.dominanceRole || null,
    dominanceWeight: typeof truthCondition?.dominanceWeight === 'number' ? truthCondition.dominanceWeight : null,
    text: assertion.text,
    kind: assertion.kind,
    separability: assertion.separability,
    truthBand: cloneBand(assertion.truthBand),
    confidenceBand: cloneBand(assertion.confidenceBand),
    acceptedVerdictLabels: sortedSetValues(normalizeVerdictSet(assertion.acceptedVerdictLabels)),
    freshnessRequirement: assertion.freshnessRequirement,
    evidenceSourceIds: Array.isArray(assertion.evidenceSourceIds) ? [...assertion.evidenceSourceIds] : [],
    knownCounterEvidenceSourceIds: Array.isArray(assertion.knownCounterEvidenceSourceIds)
      ? [...assertion.knownCounterEvidenceSourceIds]
      : [],
    harmfulMissSeverity: assertion.harmfulMissCondition?.severity || null,
    contested: assertion.contested === true,
  };
}

function resolveAlternativeTopLineRoutes(dossier, index) {
  const routes = Array.isArray(dossier?.benchmarkCoherence?.alternativeTopLineRoutes)
    ? dossier.benchmarkCoherence.alternativeTopLineRoutes
    : [];
  return routes.map((route) => ({
    routeId: route.routeId,
    frameId: route.frameId,
    admissibilityCondition: route.admissibilityCondition,
    expectedVerdictLabels: sortedSetValues(normalizeVerdictSet(route.acceptedVerdictLabels)),
    truthPercentageBand: cloneBand(route.truthBand),
    confidenceBand: cloneBand(route.confidenceBand),
    assertions: (Array.isArray(route.assertionIds) ? route.assertionIds : [])
      .map((id) => index.assertionById.get(id))
      .filter(Boolean)
      .map((assertion) => summarizeAssertion(assertion, 'ALTERNATIVE_TOP_LINE', index)),
  }));
}

function resolveRoutedAssertions(dossier, routeField, routeRole, index) {
  const ids = Array.isArray(dossier?.benchmarkCoherence?.[routeField])
    ? dossier.benchmarkCoherence[routeField]
    : [];
  return ids
    .map((id) => index.assertionById.get(id))
    .filter(Boolean)
    .map((assertion) => summarizeAssertion(assertion, routeRole, index));
}

function buildTopLineScoring(topLineAssertions) {
  const labelSet = new Set();
  for (const assertion of topLineAssertions) {
    for (const label of assertion.acceptedVerdictLabels) labelSet.add(label);
  }
  return {
    source: 'reference-dossier-top-line',
    expectedVerdictLabels: sortedSetValues(labelSet),
    truthPercentageBand: commonBand(topLineAssertions, 'truthBand'),
    confidenceBand: commonBand(topLineAssertions, 'confidenceBand'),
    topLineAssertionIds: topLineAssertions.map((assertion) => assertion.id),
  };
}

function buildReferenceDossierRoute(dossier, relPath) {
  const index = buildAssertionIndex(dossier);
  const topLineAssertions = resolveRoutedAssertions(dossier, 'topLineAssertionIds', 'TOP_LINE', index);
  const coverageGuardAssertions = resolveRoutedAssertions(dossier, 'coverageGuardAssertionIds', 'COVERAGE_GUARD', index);
  const contextAssertions = resolveRoutedAssertions(dossier, 'contextAssertionIds', 'CONTEXT', index);
  const alternativeTopLineRoutes = resolveAlternativeTopLineRoutes(dossier, index);
  const frames = Array.isArray(dossier.interpretationFrames) ? dossier.interpretationFrames : [];
  const allAssertions = [...index.assertionById.values()];
  const strictTruthConditionCount = frames.reduce((sum, frame) => {
    const conditions = Array.isArray(frame?.atomicityProfile?.distinctTruthConditions)
      ? frame.atomicityProfile.distinctTruthConditions
      : [];
    return sum + conditions.filter((condition) => condition.independentAssessabilityRequired === true).length;
  }, 0);

  return {
    role: 'COLOUR',
    available: true,
    mode: 'diagnostic_only',
    rankingEligible: false,
    rankingEligibilityReason: REFERENCE_ALIGNMENT_GATE_REASON,
    dossierId: dossier.id,
    dossierVersion: dossier.version,
    dossierStatus: dossier.status,
    inputSlug: dossier.inputSlug,
    path: relPath,
    expectedInputClassification: dossier.expectedInputClassification,
    ambiguityPolicy: dossier.ambiguityPolicy,
    validityWindow: dossier.validityWindow || null,
    topLineScoring: buildTopLineScoring(topLineAssertions),
    alternativeTopLineScoring: alternativeTopLineRoutes,
    routing: {
      topLineAssertions,
      alternativeTopLineRoutes,
      coverageGuardAssertions,
      contextAssertions,
    },
    frames: frames.map((frame) => ({
      id: frame.id,
      frameRole: frame.frameRole || null,
      admissibility: frame.admissibility,
      ambiguityPolicy: frame.ambiguityPolicy,
      determinability: frame.atomicityProfile?.determinability || null,
      determinabilityStatus: frame.atomicityProfile?.determinabilityStatus || null,
    })),
    counts: {
      frames: frames.length,
      referenceAssertions: allAssertions.length,
      requiredAssertions: allAssertions.filter((assertion) => assertion.role === 'required').length,
      strictTruthConditions: strictTruthConditionCount,
      sourceSnapshots: Array.isArray(dossier.sourceSnapshots) ? dossier.sourceSnapshots.length : 0,
    },
  };
}

function collectReferenceDossierFiles(root) {
  const dir = path.join(root, REFERENCE_DOSSIER_REL_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((entry) => entry.endsWith('.json') && entry !== 'reference-dossier.schema.json')
    .sort()
    .map((entry) => path.join(dir, entry));
}

function loadReferenceDossierRoutes(root) {
  const byInputSlug = new Map();
  const byPath = new Map();
  const errors = [];

  for (const file of collectReferenceDossierFiles(root)) {
    const relPath = normalizeRelPath(path.relative(root, file));
    try {
      const route = buildReferenceDossierRoute(readJson(file), relPath);
      byInputSlug.set(route.inputSlug, route);
      byPath.set(route.path, route);
    } catch (error) {
      errors.push({ path: relPath, error: error?.message || String(error) });
    }
  }

  return { byInputSlug, byPath, errors };
}

function missingReferenceDossierSignal(family) {
  return {
    role: 'COLOUR',
    available: false,
    mode: 'n/a',
    rankingEligible: false,
    rankingEligibilityReason: REFERENCE_ALIGNMENT_GATE_REASON,
    reason: family?.referenceDossier
      ? `referenceDossier link did not resolve: ${family.referenceDossier.path || family.referenceDossier.id || 'unknown'}`
      : 'benchmark family has no referenceDossier link',
  };
}

function referenceDossierSignalForFamily(family, routes) {
  const linkedPath = family?.referenceDossier?.path;
  if (linkedPath && routes?.byPath?.has(linkedPath)) return routes.byPath.get(linkedPath);
  if (family?.slug && routes?.byInputSlug?.has(family.slug)) return routes.byInputSlug.get(family.slug);
  return missingReferenceDossierSignal(family);
}

function scoringFamilyFromReferenceDossier(family, referenceSignal) {
  if (!referenceSignal?.available) return family;
  const topLine = referenceSignal.topLineScoring;
  if (
    !Array.isArray(topLine?.expectedVerdictLabels) ||
    topLine.expectedVerdictLabels.length === 0 ||
    !topLine.truthPercentageBand ||
    !topLine.confidenceBand
  ) {
    return family;
  }
  return {
    ...family,
    expectedVerdictLabels: topLine.expectedVerdictLabels,
    truthPercentageBand: topLine.truthPercentageBand,
    confidenceBand: topLine.confidenceBand,
    scoringReference: {
      source: topLine.source,
      dossierId: referenceSignal.dossierId,
      dossierVersion: referenceSignal.dossierVersion,
      topLineAssertionIds: topLine.topLineAssertionIds,
    },
  };
}

module.exports = {
  REFERENCE_ALIGNMENT_GATE_REASON,
  REFERENCE_DOSSIER_REL_DIR,
  buildReferenceDossierRoute,
  loadReferenceDossierRoutes,
  missingReferenceDossierSignal,
  normalizeVerdictSet,
  referenceDossierSignalForFamily,
  sameStringSet,
  scoringFamilyFromReferenceDossier,
  sortedSetValues,
};
