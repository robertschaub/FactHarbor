/**
 * Scope canonicalization helpers.
 *
 * Extracted from the monolithic `analyzer.ts` to keep responsibilities separated.
 *
 * @module analyzer/scopes
 */

import {
  detectInstitutionCode,
  extractAllCapsToken,
  inferScopeTypeLabel,
  inferToAcronym,
  contextTypeRank,
} from "./config";

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Reserved scope ID for facts that don't map to any detected scope.
 * Exported for use in tests and other modules.
 */
export const UNSCOPED_ID = "CTX_UNSCOPED";

// ============================================================================
// DETERMINISTIC SCOPE ID GENERATION
// ============================================================================

/**
 * Simple deterministic hash function for scope IDs.
 * Returns a consistent 8-character hex string for the same input.
 *
 * @param str - Input string to hash
 * @returns 8-character hex hash
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive hex string
  const hexHash = (hash >>> 0).toString(16).padStart(8, '0');
  return hexHash;
}

/**
 * Generate a deterministic scope ID from scope properties.
 * Format: {INST}_{hash} or SCOPE_{hash}
 *
 * Examples:
 * - TSE_a3f2 (has institution code)
 * - WTW_d9e8 (methodology acronym)
 * - SCOPE_f7a29b3c (no clear institution)
 *
 * @param scope - Scope object with name, description, metadata
 * @param inst - Institution code (if detected)
 * @param idx - Index for fallback (only used if no other identifier available)
 * @returns Deterministic scope ID
 */
function generateDeterministicScopeId(
  scope: any,
  inst: string | null,
  idx: number
): string {
  // Create stable input for hashing
  const hashInput = JSON.stringify({
    name: String(scope.name || "").toLowerCase().trim(),
    description: String(scope.description || "").toLowerCase().trim().slice(0, 100),
    court: String(scope.metadata?.court || "").toLowerCase().trim(),
    institution: String(scope.metadata?.institution || "").toLowerCase().trim(),
    subject: String(scope.subject || "").toLowerCase().trim().slice(0, 100),
  });

  // Generate 8-char hash
  const fullHash = simpleHash(hashInput);
  const shortHash = fullHash.slice(0, 4); // Use first 4 chars for readability

  // Return hybrid format: preserve institution code + short hash for uniqueness
  if (inst && inst.length > 0) {
    return `${inst}_${shortHash}`;
  }

  // Fallback: SCOPE_{hash}
  return `SCOPE_${fullHash}`;
}

export function canonicalizeScopes(
  input: string,
  understanding: any,
): any {
  if (!understanding) return understanding;
  const procs = Array.isArray(understanding.distinctProceedings)
    ? understanding.distinctProceedings
    : [];
  if (procs.length === 0) return understanding;

  // Stable ordering to prevent run-to-run drift in labeling and downstream selection.
  // Use a lightweight, mostly-provider-invariant key: inferred type + institution code + court string.
  const sorted = [...procs].sort((a: any, b: any) => {
    const al = inferScopeTypeLabel(a);
    const bl = inferScopeTypeLabel(b);
    const ar = contextTypeRank(al);
    const br = contextTypeRank(bl);
    if (ar !== br) return ar - br;

    const ak = `${detectInstitutionCode(a)}|${String(a.metadata?.court || a.metadata?.institution || "").toLowerCase()}|${String(a.name || "").toLowerCase()}`;
    const bk = `${detectInstitutionCode(b)}|${String(b.metadata?.court || b.metadata?.institution || "").toLowerCase()}|${String(b.name || "").toLowerCase()}`;
    return ak.localeCompare(bk);
  });

  const idRemap = new Map<string, string>();
  const usedIds = new Set<string>();
  const hasExplicitYear = /\b(19|20)\d{2}\b/.test(input);
  const inputLower = input.toLowerCase();
  const hasExplicitStatusAnchor =
    /\b(sentenced|convicted|acquitted|indicted|charged|ongoing|pending|concluded)\b/.test(
      inputLower,
    );

  const canonicalProceedings = sorted.map((p: any, idx: number) => {
    const typeLabel = inferScopeTypeLabel(p);
    const inst = detectInstitutionCode(p);
    // Generate deterministic ID (PR 3: Pipeline Redesign)
    let newId = generateDeterministicScopeId(p, inst, idx);
    // Handle collisions (extremely rare with hash-based IDs)
    if (usedIds.has(newId)) newId = `${newId}_${idx + 1}`;
    usedIds.add(newId);
    idRemap.set(p.id, newId);
    const rawName = String(p?.name || "").trim();
    const rawShort = String(p?.shortName || "").trim();
    const inferredShortFromName = extractAllCapsToken(rawName);
    const toAcronym = inferToAcronym(rawName);

    // Preserve meaningful scope names from the model/evidence. Only synthesize a fallback
    // when the name is missing or obviously generic.
    const isGenericName =
      rawName.length === 0 ||
      /^(general|analytical|methodological|criminal|civil|regulatory|electoral)\s+(proceeding|context|scope)$/i.test(
        rawName,
      ) ||
      /^general$/i.test(rawName);

    const subj = String(p?.subject || "").trim();
    const fallbackName = subj
      ? subj.substring(0, 120)
      : inst
        ? `${typeLabel} context (${inst})`
        : `${typeLabel} context`;
    const name = isGenericName ? fallbackName : rawName;

    // Prefer institution codes for legal scopes; otherwise infer an acronym from the name.
    const shortName =
      (rawShort && rawShort.length <= 12 ? rawShort : "") ||
      (inst ? inst : toAcronym || inferredShortFromName) ||
      `CTX${idx + 1}`;
    return {
      ...p,
      id: newId,
      // Keep human-friendly labels, but avoid overwriting meaningful model-provided names.
      name,
      shortName,
      // Avoid presenting unanchored specifics as facts.
      date: hasExplicitYear ? p.date : "",
      status: hasExplicitStatusAnchor ? p.status : "unknown",
    };
  });

  const remappedClaims = (understanding.subClaims || []).map((c: any) => {
    const rp = c.relatedProceedingId;
    return {
      ...c,
      relatedProceedingId: rp && idRemap.has(rp) ? idRemap.get(rp) : rp,
    };
  });

  return {
    ...understanding,
    distinctProceedings: canonicalProceedings,
    subClaims: remappedClaims,
  };
}

export function canonicalizeScopesWithRemap(
  input: string,
  understanding: any,
): { understanding: any; idRemap: Map<string, string> } {
  if (!understanding) return { understanding, idRemap: new Map() };
  const procs = Array.isArray(understanding.distinctProceedings)
    ? understanding.distinctProceedings
    : [];
  if (procs.length === 0) return { understanding, idRemap: new Map() };

  // Stable ordering to prevent run-to-run drift in labeling and downstream selection.
  const sorted = [...procs].sort((a: any, b: any) => {
    const al = inferScopeTypeLabel(a);
    const bl = inferScopeTypeLabel(b);
    const ar = contextTypeRank(al);
    const br = contextTypeRank(bl);
    if (ar !== br) return ar - br;

    const ak = `${detectInstitutionCode(a)}|${String(a.metadata?.court || a.metadata?.institution || "").toLowerCase()}|${String(a.name || "").toLowerCase()}`;
    const bk = `${detectInstitutionCode(b)}|${String(b.metadata?.court || b.metadata?.institution || "").toLowerCase()}|${String(b.name || "").toLowerCase()}`;
    return ak.localeCompare(bk);
  });

  const idRemap = new Map<string, string>();
  const usedIds = new Set<string>();
  const hasExplicitYear = /\b(19|20)\d{2}\b/.test(input);
  const inputLower = input.toLowerCase();
  const hasExplicitStatusAnchor =
    /\b(sentenced|convicted|acquitted|indicted|charged|ongoing|pending|concluded)\b/.test(
      inputLower,
    );

  const canonicalProceedings = sorted.map((p: any, idx: number) => {
    const typeLabel = inferScopeTypeLabel(p);
    const inst = detectInstitutionCode(p);
    // Generate deterministic ID (PR 3: Pipeline Redesign)
    let newId = generateDeterministicScopeId(p, inst, idx);
    // Handle collisions (extremely rare with hash-based IDs)
    if (usedIds.has(newId)) newId = `${newId}_${idx + 1}`;
    usedIds.add(newId);
    idRemap.set(p.id, newId);
    const rawName = String(p?.name || "").trim();
    const rawShort = String(p?.shortName || "").trim();
    const inferredShortFromName = extractAllCapsToken(rawName);
    const toAcronym = inferToAcronym(rawName);
    const isGenericName =
      rawName.length === 0 ||
      /^(general|analytical|methodological|criminal|civil|regulatory|electoral)\s+(proceeding|context|scope)$/i.test(
        rawName,
      ) ||
      /^general$/i.test(rawName);
    const subj = String(p?.subject || "").trim();
    const fallbackName = subj
      ? subj.substring(0, 120)
      : inst
        ? `${typeLabel} context (${inst})`
        : `${typeLabel} context`;
    const name = isGenericName ? fallbackName : rawName;
    const shortName =
      (rawShort && rawShort.length <= 12 ? rawShort : "") ||
      (inst ? inst : toAcronym || inferredShortFromName) ||
      `CTX${idx + 1}`;
    return {
      ...p,
      id: newId,
      name,
      shortName,
      date: hasExplicitYear ? p.date : "",
      status: hasExplicitStatusAnchor ? p.status : "unknown",
    };
  });

  const remappedClaims = (understanding.subClaims || []).map((c: any) => {
    const rp = c.relatedProceedingId;
    return {
      ...c,
      relatedProceedingId: rp && idRemap.has(rp) ? idRemap.get(rp) : rp,
    };
  });

  return {
    understanding: {
      ...understanding,
      distinctProceedings: canonicalProceedings,
      subClaims: remappedClaims,
    },
    idRemap,
  };
}

export function ensureAtLeastOneScope(
  understanding: any,
): any {
  if (!understanding) return understanding;
  const procs = Array.isArray(understanding.distinctProceedings)
    ? understanding.distinctProceedings
    : [];
  if (procs.length > 0) return understanding;
  // Generate a deterministic ID even for the fallback scope
  const fallbackScope = {
    name: understanding.impliedClaim
      ? understanding.impliedClaim.substring(0, 100)
      : "General context",
    shortName: "GEN",
    subject: understanding.impliedClaim || "",
    temporal: "",
    status: "unknown",
    outcome: "unknown",
    metadata: {},
  };

  return {
    ...understanding,
    distinctProceedings: [
      {
        ...fallbackScope,
        id: generateDeterministicScopeId(fallbackScope, null, 0),
      },
    ],
    requiresSeparateAnalysis: false,
  };
}

