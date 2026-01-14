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
  proceedingTypeRank,
} from "./config";

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
    const ar = proceedingTypeRank(al);
    const br = proceedingTypeRank(bl);
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
    let newId = inst ? `CTX_${inst}` : `CTX_${idx + 1}`;
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
    const ar = proceedingTypeRank(al);
    const br = proceedingTypeRank(bl);
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
    let newId = inst ? `CTX_${inst}` : `CTX_${idx + 1}`;
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
  return {
    ...understanding,
    distinctProceedings: [
      {
        id: "CTX_1",
        name: understanding.impliedClaim
          ? understanding.impliedClaim.substring(0, 100)
          : "General context",
        shortName: "GEN",
        subject: understanding.impliedClaim || "",
        temporal: "",
        status: "unknown",
        outcome: "unknown",
        metadata: {},
      },
    ],
    requiresSeparateAnalysis: false,
  };
}

