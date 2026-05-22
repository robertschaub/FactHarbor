export type ResultSchemaKind = "v2" | "legacy-v1" | "unknown";
export type V2PublicCutoverStatus = "blocked_precutover" | "approved";

export const V2_PUBLIC_CUTOVER_BLOCKED_ISSUE_CODE = "v2_public_cutover_blocked";
export const V2_PUBLIC_CUTOVER_BLOCKED_ISSUE_MESSAGE =
  "Analyzer V2 result is not approved for public cutover.";

export type CompatibilityWarning = {
  type: string;
  severity: string | null;
  displaySeverity: string | null;
  visibility: string | null;
  message: string | null;
  primaryIssueEligible: boolean;
  details?: Record<string, unknown>;
};

export type CompatibilityClaim = {
  id: string;
  statement: string;
  selected: boolean | null;
};

export type CompatibilityPrimaryIssue = {
  code: string;
  message: string | null;
};

export type ResultCompatibilityView = {
  schemaKind: ResultSchemaKind;
  schemaVersion: string | null;
  pipeline: string | null;
  publicCutoverStatus: V2PublicCutoverStatus | null;
  verdictLabel: string | null;
  truthPercentage: number | null;
  confidence: number | null;
  confidenceTier: string | null;
  selectedAtomicClaimIds: string[];
  claims: CompatibilityClaim[];
  claimBoundaries: unknown[];
  claimVerdicts: unknown[];
  evidenceItems: unknown[];
  sources: unknown[];
  citedSources: unknown[];
  searchQueries: unknown[];
  coverageMatrix: unknown | null;
  qualityGates: unknown | null;
  warnings: CompatibilityWarning[];
  primaryIssue: CompatibilityPrimaryIssue | null;
  narrative: {
    markdown: string | null;
    headline: string | null;
    keyFinding: string | null;
    evidenceBaseSummary: string | null;
    limitations: string | null;
  };
};

export type JobQuickFields = {
  schemaKind: ResultSchemaKind;
  verdictLabel: string | null;
  truthPercentage: number | null;
  confidence: number | null;
  analysisIssueCode: string | null;
  analysisIssueMessage: string | null;
};

export type LegacyReportSurfaceModel = {
  _schemaVersion: string | null;
  meta: Record<string, unknown> & {
    schemaVersion: string | null;
    pipeline: string | null;
  };
  truthPercentage: number | null;
  verdict: string | null;
  confidence: number | null;
  verdictNarrative: ResultCompatibilityView["narrative"];
  understanding: {
    atomicClaims: CompatibilityClaim[];
  };
  claimBoundaries: unknown[];
  claimVerdicts: unknown[];
  coverageMatrix: unknown | null;
  evidenceItems: unknown[];
  sources: unknown[];
  citedSources: unknown[];
  searchQueries: unknown[];
  qualityGates: unknown | null;
  analysisWarnings: CompatibilityWarning[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function readSchemaVersion(result: Record<string, unknown>): string | null {
  const meta = asRecord(result.meta);
  return asString(result._schemaVersion) ?? asString(meta?.schemaVersion);
}

function readV2PublicCutoverStatus(meta: Record<string, unknown>): V2PublicCutoverStatus | null {
  const status = asString(meta.publicCutoverStatus);
  return status === "blocked_precutover" || status === "approved" ? status : null;
}

function isV2PublicCutoverApproved(
  schemaVersion: string | null,
  meta: Record<string, unknown>,
): boolean {
  return schemaVersion === "4.0.0-cb" &&
    asString(meta.pipeline) === "claimboundary-v2" &&
    readV2PublicCutoverStatus(meta) === "approved";
}

export function getResultSchemaKind(resultJson: unknown): ResultSchemaKind {
  const result = asRecord(resultJson);
  if (!result) return "unknown";

  const schemaVersion = readSchemaVersion(result);
  const meta = asRecord(result.meta);
  const pipeline = asString(meta?.pipeline);

  if (
    (schemaVersion === "4.0.0-cb-precutover" || schemaVersion === "4.0.0-cb") &&
    pipeline === "claimboundary-v2"
  ) {
    return "v2";
  }

  if (schemaVersion === "3.2.0-cb" && pipeline === "claimboundary") {
    return "legacy-v1";
  }

  return "unknown";
}

function toStringArray(values: unknown): string[] {
  return asArray(values).filter((value): value is string => typeof value === "string" && value.length > 0);
}

function readV2FallbackFields(result: Record<string, unknown>): Record<string, unknown> {
  const compatibility = asRecord(result.compatibility);
  const v1 = asRecord(compatibility?.v1);
  return asRecord(v1?.fallbackFields) ?? {};
}

function mapV2Warnings(warnings: unknown[]): CompatibilityWarning[] {
  return warnings.map((warning) => {
    const item = asRecord(warning) ?? {};
    const nestedDetails = asRecord(item.details) ?? {};
    const details: Record<string, unknown> = { ...nestedDetails };
    for (const key of ["category", "stage", "owner", "affected", "recoveryState", "damagedReportRelation"]) {
      if (item[key] !== undefined) details[key] = item[key];
    }
    return {
      type: asString(item.type) ?? "unknown",
      severity: asString(item.severity),
      displaySeverity: asString(item.displaySeverity),
      visibility: asString(item.visibility),
      message: asString(item.message) ?? asString(item.materialityRationale),
      primaryIssueEligible: item.primaryIssueEligible === true,
      details: Object.keys(details).length > 0 ? details : undefined,
    };
  });
}

function mapLegacyWarnings(warnings: unknown[]): CompatibilityWarning[] {
  return warnings.map((warning) => {
    const item = asRecord(warning) ?? {};
    const details = asRecord(item.details) ?? undefined;
    return {
      type: asString(item.type) ?? "unknown",
      severity: asString(item.severity),
      displaySeverity: asString(item.severity),
      visibility: null,
      message: asString(item.message),
      primaryIssueEligible: asString(item.type) === "analysis_generation_failed",
      details,
    };
  });
}

function firstPrimaryIssue(warnings: CompatibilityWarning[]): CompatibilityPrimaryIssue | null {
  const primary = warnings.find((warning) => warning.primaryIssueEligible);
  return primary ? { code: primary.type, message: primary.message } : null;
}

function blockedV2PrimaryIssue(warnings: CompatibilityWarning[]): CompatibilityPrimaryIssue {
  return firstPrimaryIssue(warnings) ?? {
    code: V2_PUBLIC_CUTOVER_BLOCKED_ISSUE_CODE,
    message: V2_PUBLIC_CUTOVER_BLOCKED_ISSUE_MESSAGE,
  };
}

function mapV2Claims(claims: unknown[]): CompatibilityClaim[] {
  return claims.map((claim) => {
    const item = asRecord(claim) ?? {};
    return {
      id: asString(item.id) ?? "",
      statement: asString(item.statement) ?? "",
      selected: typeof item.selected === "boolean" ? item.selected : null,
    };
  }).filter((claim) => claim.id.length > 0);
}

function mapLegacyClaims(claims: unknown[]): CompatibilityClaim[] {
  return claims.map((claim) => {
    const item = asRecord(claim) ?? {};
    return {
      id: asString(item.id) ?? "",
      statement: asString(item.statement) ?? "",
      selected: null,
    };
  }).filter((claim) => claim.id.length > 0);
}

function mapV2BoundaryToLegacy(boundary: unknown): unknown {
  const item = asRecord(boundary);
  if (!item) return boundary;
  const label = asString(item.label);
  const evidenceIds = asArray(item.evidenceIds);

  return {
    id: asString(item.id),
    name: label,
    shortName: label,
    description: asString(item.scopeSummary),
    constituentScopes: [],
    internalCoherence: null,
    evidenceCount: evidenceIds.length,
  };
}

function mapV2ClaimVerdictsFromFallback(fallbackFields: Record<string, unknown>): unknown[] {
  return asArray(fallbackFields.claimVerdicts);
}

function mapV2CoverageMatrixToLegacy(matrix: unknown): unknown | null {
  const source = asRecord(matrix);
  if (!source) return null;

  const claims = toStringArray(source.rows);
  const boundaries = toStringArray(source.columns);
  const cells = asArray(source.cells);
  if (claims.length === 0 || boundaries.length === 0) return null;

  const counts = claims.map((claimId) => boundaries.map((boundaryId) => {
    const cell = cells
      .map((value) => asRecord(value))
      .find((value) => value?.claimId === claimId && value?.boundaryId === boundaryId);
    return asArray(cell?.evidenceIds).length;
  }));

  return { claims, boundaries, counts };
}

function buildEmptyCompatibilityView(): ResultCompatibilityView {
  return {
    schemaKind: "unknown",
    schemaVersion: null,
    pipeline: null,
    publicCutoverStatus: null,
    verdictLabel: null,
    truthPercentage: null,
    confidence: null,
    confidenceTier: null,
    selectedAtomicClaimIds: [],
    claims: [],
    claimBoundaries: [],
    claimVerdicts: [],
    evidenceItems: [],
    sources: [],
    citedSources: [],
    searchQueries: [],
    coverageMatrix: null,
    qualityGates: null,
    warnings: [],
    primaryIssue: null,
    narrative: {
      markdown: null,
      headline: null,
      keyFinding: null,
      evidenceBaseSummary: null,
      limitations: null,
    },
  };
}

function buildV2CompatibilityView(
  result: Record<string, unknown>,
  reportMarkdown?: string | null,
): ResultCompatibilityView {
  const meta = asRecord(result.meta) ?? {};
  const schemaVersion = readSchemaVersion(result);
  const publicCutoverApproved = isV2PublicCutoverApproved(schemaVersion, meta);
  const publicCutoverStatus = readV2PublicCutoverStatus(meta);
  const input = asRecord(result.input) ?? {};
  const claimsGroup = asRecord(result.claims) ?? {};
  const evidenceGroup = asRecord(result.evidence) ?? {};
  const sourcesGroup = asRecord(result.sources) ?? {};
  const boundariesGroup = asRecord(result.boundaries) ?? {};
  const verdict = asRecord(result.verdict) ?? {};
  const narrative = asRecord(result.narrative) ?? {};
  const narrativeSections = asRecord(narrative.sections) ?? {};
  const fallbackFields = readV2FallbackFields(result);
  const warnings = mapV2Warnings(asArray(result.warnings));
  const selectedAtomicClaimIds = toStringArray(input.selectedAtomicClaimIds);
  const claims = mapV2Claims(asArray(claimsGroup.atomicClaims));

  if (!publicCutoverApproved) {
    return {
      schemaKind: "v2",
      schemaVersion,
      pipeline: asString(meta.pipeline),
      publicCutoverStatus,
      verdictLabel: null,
      truthPercentage: null,
      confidence: null,
      confidenceTier: null,
      selectedAtomicClaimIds,
      claims,
      claimBoundaries: [],
      claimVerdicts: [],
      evidenceItems: [],
      sources: [],
      citedSources: [],
      searchQueries: [],
      coverageMatrix: null,
      qualityGates: null,
      warnings,
      primaryIssue: blockedV2PrimaryIssue(warnings),
      narrative: {
        markdown: asString(reportMarkdown),
        headline: null,
        keyFinding: null,
        evidenceBaseSummary: null,
        limitations: null,
      },
    };
  }

  const sources = asArray(sourcesGroup.items);
  const fallbackBoundaries = asArray(fallbackFields.claimBoundaries);
  const boundaries = fallbackBoundaries.length > 0
    ? fallbackBoundaries
    : asArray(boundariesGroup.claimAssessmentBoundaries).map(mapV2BoundaryToLegacy);
  const fallbackCoverageMatrix = fallbackFields.coverageMatrix ?? null;

  return {
    schemaKind: "v2",
    schemaVersion,
    pipeline: asString(meta.pipeline),
    publicCutoverStatus,
    verdictLabel: asString(verdict.label),
    truthPercentage: asNumber(verdict.truthPercentage),
    confidence: asNumber(verdict.confidence),
    confidenceTier: asString(verdict.confidenceTier),
    selectedAtomicClaimIds: toStringArray(input.selectedAtomicClaimIds),
    claims: mapV2Claims(asArray(claimsGroup.atomicClaims)),
    claimBoundaries: boundaries,
    claimVerdicts: mapV2ClaimVerdictsFromFallback(fallbackFields),
    evidenceItems: asArray(evidenceGroup.evidenceItems),
    sources,
    citedSources: sources,
    searchQueries: asArray(fallbackFields.searchQueries),
    coverageMatrix: fallbackCoverageMatrix ?? mapV2CoverageMatrixToLegacy(boundariesGroup.coverageMatrix),
    qualityGates: fallbackFields.qualityGates ?? result.qualityGates ?? null,
    warnings,
    primaryIssue: firstPrimaryIssue(warnings),
    narrative: {
      markdown: asString(narrative.markdown),
      headline: asString(narrativeSections.headline),
      keyFinding: asString(narrativeSections.keyFinding),
      evidenceBaseSummary: asString(narrativeSections.evidenceBaseSummary),
      limitations: asString(narrativeSections.limitations),
    },
  };
}

function buildLegacyCompatibilityView(result: Record<string, unknown>, reportMarkdown?: string | null): ResultCompatibilityView {
  const meta = asRecord(result.meta) ?? {};
  const understanding = asRecord(result.understanding) ?? {};
  const narrative = asRecord(result.verdictNarrative) ?? {};
  const warnings = mapLegacyWarnings(asArray(result.analysisWarnings));

  return {
    schemaKind: "legacy-v1",
    schemaVersion: readSchemaVersion(result),
    pipeline: asString(meta.pipeline),
    publicCutoverStatus: null,
    verdictLabel: asString(result.verdict),
    truthPercentage: asNumber(result.truthPercentage),
    confidence: asNumber(result.confidence),
    confidenceTier: null,
    selectedAtomicClaimIds: [],
    claims: mapLegacyClaims(asArray(understanding.atomicClaims)),
    claimBoundaries: asArray(result.claimBoundaries),
    claimVerdicts: asArray(result.claimVerdicts),
    evidenceItems: asArray(result.evidenceItems),
    sources: asArray(result.sources),
    citedSources: asArray(result.citedSources),
    searchQueries: asArray(result.searchQueries),
    coverageMatrix: result.coverageMatrix ?? null,
    qualityGates: result.qualityGates ?? null,
    warnings,
    primaryIssue: firstPrimaryIssue(warnings),
    narrative: {
      markdown: reportMarkdown ?? null,
      headline: asString(narrative.headline),
      keyFinding: asString(narrative.keyFinding),
      evidenceBaseSummary: asString(narrative.evidenceBaseSummary),
      limitations: asString(narrative.limitations),
    },
  };
}

export function toResultCompatibilityView(
  resultJson: unknown,
  options: { reportMarkdown?: string | null } = {},
): ResultCompatibilityView {
  const result = asRecord(resultJson);
  if (!result) return buildEmptyCompatibilityView();

  const schemaKind = getResultSchemaKind(result);
  if (schemaKind === "v2") return buildV2CompatibilityView(result, options.reportMarkdown);
  if (schemaKind === "legacy-v1") return buildLegacyCompatibilityView(result, options.reportMarkdown);

  return buildEmptyCompatibilityView();
}

export function toJobQuickFields(
  resultJson: unknown,
  options: { reportMarkdown?: string | null } = {},
): JobQuickFields {
  const view = toResultCompatibilityView(resultJson, options);
  return {
    schemaKind: view.schemaKind,
    verdictLabel: view.verdictLabel,
    truthPercentage: view.truthPercentage,
    confidence: view.confidence,
    analysisIssueCode: view.primaryIssue?.code ?? null,
    analysisIssueMessage: view.primaryIssue?.message ?? null,
  };
}

export function toLegacyReportSurfaceModel(
  resultJson: unknown,
  options: { reportMarkdown?: string | null } = {},
): LegacyReportSurfaceModel {
  const result = asRecord(resultJson);
  const originalMeta = asRecord(result?.meta) ?? {};
  const view = toResultCompatibilityView(resultJson, options);

  return {
    _schemaVersion: view.schemaVersion,
    meta: {
      ...originalMeta,
      schemaVersion: view.schemaVersion,
      pipeline: view.pipeline,
    },
    truthPercentage: view.truthPercentage,
    verdict: view.verdictLabel,
    confidence: view.confidence,
    verdictNarrative: view.narrative,
    understanding: {
      atomicClaims: view.claims,
    },
    claimBoundaries: view.claimBoundaries,
    claimVerdicts: view.claimVerdicts,
    coverageMatrix: view.coverageMatrix,
    evidenceItems: view.evidenceItems,
    sources: view.sources,
    citedSources: view.citedSources,
    searchQueries: view.searchQueries,
    qualityGates: view.qualityGates,
    analysisWarnings: view.warnings,
  };
}
