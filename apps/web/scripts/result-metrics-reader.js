function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asString(value) {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function unwrapResult(result) {
  const record = asRecord(result);
  const resultJson = record.resultJson;

  if (typeof resultJson === 'string') {
    try {
      return asRecord(JSON.parse(resultJson));
    } catch {
      return record;
    }
  }

  if (resultJson && typeof resultJson === 'object') {
    return asRecord(resultJson);
  }

  return record;
}

function readSchemaVersion(result) {
  const meta = asRecord(result.meta);
  return asString(result._schemaVersion) || asString(meta.schemaVersion);
}

function getResultSchemaKind(input) {
  const result = unwrapResult(input);
  const meta = asRecord(result.meta);
  const schemaVersion = readSchemaVersion(result);
  const pipeline = asString(meta.pipeline);

  if (
    (schemaVersion === '4.0.0-cb-precutover' || schemaVersion === '4.0.0-cb') &&
    pipeline === 'claimboundary-v2'
  ) {
    return 'v2';
  }

  if (schemaVersion === '3.2.0-cb' && pipeline === 'claimboundary') {
    return 'legacy-v1';
  }

  return 'unknown';
}

function extractV2Metrics(result) {
  const verdict = asRecord(result.verdict);
  const claims = asRecord(result.claims);
  const boundaries = asRecord(result.boundaries);

  return {
    verdict: asString(verdict.label),
    truthPercentage: asNumber(verdict.truthPercentage),
    confidence: asNumber(verdict.confidence),
    claimsCount: normalizeArray(claims.atomicClaims).length,
    contextsCount: normalizeArray(boundaries.claimAssessmentBoundaries).length,
  };
}

function extractLegacyV1Metrics(result) {
  const understanding = asRecord(result.understanding);
  const atomicClaims = normalizeArray(understanding.atomicClaims);
  const oldClaims = normalizeArray(result.claims);
  const claimBoundaries = normalizeArray(result.claimBoundaries);
  const oldContexts = normalizeArray(result.analysisContexts);

  return {
    verdict: asString(result.verdict),
    truthPercentage: asNumber(result.truthPercentage),
    confidence: asNumber(result.confidence),
    claimsCount: atomicClaims.length > 0 ? atomicClaims.length : oldClaims.length,
    contextsCount: claimBoundaries.length > 0 ? claimBoundaries.length : oldContexts.length,
  };
}

function extractUnknownMetrics(result) {
  const verdictSummary = asRecord(result.verdictSummary);
  const claims = normalizeArray(result.claims);
  const contexts = normalizeArray(result.analysisContexts);

  return {
    verdict:
      asString(result.articleVerdict) ||
      asString(result.verdict) ||
      asString(verdictSummary.displayText),
    truthPercentage:
      asNumber(result.articleTruthPercentage) ??
      asNumber(result.truthPercentage) ??
      asNumber(verdictSummary.truthPercentage) ??
      asNumber(verdictSummary.answer),
    confidence:
      asNumber(result.articleVerdictConfidence) ??
      asNumber(result.confidence) ??
      asNumber(verdictSummary.confidence),
    claimsCount: claims.length,
    contextsCount: contexts.length,
  };
}

function extractRunnerResultMetrics(input) {
  const result = unwrapResult(input);
  const schemaKind = getResultSchemaKind(result);

  if (schemaKind === 'v2') {
    return extractV2Metrics(result);
  }

  if (schemaKind === 'legacy-v1') {
    return extractLegacyV1Metrics(result);
  }

  return extractUnknownMetrics(result);
}

module.exports = {
  extractRunnerResultMetrics,
  getResultSchemaKind,
};
