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
// INPUT CANONICALIZATION FOR SCOPE DETECTION (v2.8.2)
// ============================================================================

/**
 * Canonicalize input text for scope detection to ensure consistent scope
 * identification regardless of input phrasing (question vs statement).
 *
 * This addresses the input neutrality issue where:
 * - "Was the Bolsonaro judgment fair?" detected 3 scopes
 * - "The Bolsonaro judgment was fair" detected 4 scopes
 *
 * The function normalizes both phrasings to the same canonical form for
 * scope detection purposes.
 *
 * @param input - Raw or pre-normalized input text
 * @returns Canonical form for scope detection
 */
export function canonicalizeInputForScopeDetection(input: string): string {
  let text = input.trim();

  // 1. Remove question marks and trailing punctuation
  text = text.replace(/[?!.]+$/, '').trim();

  // 2. Normalize auxiliary verb questions to statements
  // Uses the same robust approach as normalizeYesNoQuestionToStatement in analyzer.ts
  const auxMatch = text.match(
    /^(was|were|is|are|did|do|does|has|have|had|can|could|will|would|should|may|might)\s+(.+)$/i
  );
  if (auxMatch) {
    const aux = auxMatch[1].toLowerCase();
    const rest = auxMatch[2].trim();

    if (rest) {
      // Try to split on clear subject boundaries first (parentheses, comma)
      const lastParen = rest.lastIndexOf(")");
      if (lastParen > 0 && lastParen < rest.length - 1) {
        const subject = rest.slice(0, lastParen + 1).trim();
        const predicate = rest.slice(lastParen + 1).trim();
        text = `${subject} ${aux} ${predicate}`.replace(/\s+/g, " ").trim();
      } else {
        const commaIdx = rest.indexOf(",");
        if (commaIdx > 0 && commaIdx < rest.length - 1) {
          const subject = rest.slice(0, commaIdx).trim();
          const predicate = rest.slice(commaIdx + 1).trim();
          text = `${subject} ${aux} ${predicate}`.replace(/\s+/g, " ").trim();
        } else {
          // Heuristic: split before common predicate starters (adjectives, verbs)
          const predicateStarters = [
            // Evaluation adjectives
            "fair", "true", "false", "accurate", "correct", "legitimate", "legal",
            "valid", "based", "justified", "reasonable", "biased", "efficient",
            "effective", "successful", "proper", "appropriate", "proportionate",
            "consistent", "compliant", "constitutional", "lawful", "unlawful",
            // Past participles (for "Were X applied/followed?" patterns)
            "applied", "followed", "implemented", "enforced", "violated", "upheld",
            "overturned", "dismissed", "granted", "denied", "approved", "rejected",
            // Common verbs for "Did X verb Y?" patterns
            "cause", "causes", "caused", "increase", "increases", "increased",
            "decrease", "decreases", "decreased", "improve", "improves", "improved",
            "reduce", "reduces", "reduced", "prevent", "prevents", "prevented",
            "lead", "leads", "led", "result", "results", "resulted",
            "follow", "follows", "produce", "produces", "produced",
            "affect", "affects", "affected", "create", "creates", "created",
            "apply", "applies", "implement", "implements", "violate", "violates",
          ];
          const starterRe = new RegExp(`\\b(${predicateStarters.join("|")})\\b`, "i");
          const starterMatch = rest.match(starterRe);
          
          if (starterMatch && typeof starterMatch.index === "number" && starterMatch.index > 0) {
            const subject = rest.slice(0, starterMatch.index).trim();
            const predicate = rest.slice(starterMatch.index).trim();
            if (subject && predicate) {
              text = `${subject} ${aux} ${predicate}`.replace(/\s+/g, " ").trim();
            }
          } else {
            // Safe fallback: use grammatical form that preserves meaning
            // "Did the court follow procedures?" → "It is the case that the court follow procedures"
            const copulas = new Set(["is", "are", "was", "were"]);
            text = copulas.has(aux)
              ? `it ${aux} the case that ${rest}`
              : `it is the case that ${rest}`;
          }
        }
      }
    }
  }

  // 3. Remove filler words that don't affect scope detection
  const fillers = /\b(really|actually|truly|basically|essentially|simply|just|very|quite|rather)\b/gi;
  text = text.replace(fillers, ' ').replace(/\s+/g, ' ').trim();

  // 4. Extract core semantic entities BEFORE lowercasing
  // This preserves proper nouns for entity detection
  const coreEntities = extractCoreEntities(text);

  // 5. Normalize case for consistency (lowercase for comparison)
  const scopeKey = text.toLowerCase();

  console.log(`[Scope Canonicalization] Input: "${input.substring(0, 60)}..."`);
  console.log(`[Scope Canonicalization] Canonical: "${scopeKey.substring(0, 60)}..."`);
  console.log(`[Scope Canonicalization] Core entities: ${coreEntities.join(', ')}`);

  return scopeKey;
}

/**
 * Extract core semantic entities from text for scope matching.
 * These are the key nouns/proper nouns that define what the input is about.
 *
 * CRITICAL: This function MUST receive the original-case text (before lowercasing)
 * to properly detect proper nouns via capitalization patterns.
 *
 * Generic by Design: Uses regex patterns, not hardcoded keyword lists.
 */
function extractCoreEntities(text: string): string[] {
  const entities: string[] = [];

  // Look for proper nouns (capitalized words that aren't sentence-start)
  // Matches single words (Einstein) and multi-word names (Angela Merkel)
  const properNouns = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  entities.push(...properNouns.map(n => n.toLowerCase()));

  // Look for legal/institutional terms (case-insensitive)
  const legalTerms = text.match(/\b(court|trial|judgment|ruling|verdict|sentence|conviction|case|proceeding|tribunal|commission|appeal|hearing|indictment)\b/gi) || [];
  entities.push(...legalTerms.map(t => t.toLowerCase()));

  // Look for country/jurisdiction indicators (case-insensitive)
  const jurisdictions = text.match(/\b(brazil|brazilian|eu|european|uk|british|us|usa|american|federal|supreme|electoral|constitutional|stf|tse|tst|cnj)\b/gi) || [];
  entities.push(...jurisdictions.map(j => j.toLowerCase()));

  // Deduplicate
  return [...new Set(entities)];
}

/**
 * Generate a scope detection hint based on the original input text.
 * This helps guide the LLM to detect consistent scopes regardless of phrasing.
 *
 * IMPORTANT: Pass the ORIGINAL text (not lowercased) so proper nouns are detected.
 */
export function generateScopeDetectionHint(originalInput: string): string {
  const entities = extractCoreEntities(originalInput);

  if (entities.length === 0) {
    return '';
  }

  // Build a hint that emphasizes what scopes to look for
  const hint = `
SCOPE DETECTION HINT (for input neutrality):
Focus on detecting scopes related to these core entities: ${entities.join(', ')}.
Do NOT detect scopes based on:
- Whether the input is phrased as a question or statement
- Public perception/opinion scopes (unless explicitly mentioned in input)
- Meta-level scopes about "trust" or "confidence" in institutions (unless core topic)
Focus on concrete, factual scopes (legal proceedings, regulatory reviews, methodological frameworks).
`;
  return hint;
}

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
  const contexts = Array.isArray(understanding.analysisContexts)
    ? understanding.analysisContexts
    : [];
  if (contexts.length === 0) return understanding;

  // Stable ordering to prevent run-to-run drift in labeling and downstream selection.
  // Use a lightweight, mostly-provider-invariant key: inferred type + institution code + court string.
  const sorted = [...contexts].sort((a: any, b: any) => {
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

  const canonicalContexts = sorted.map((p: any, idx: number) => {
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
    const rp = c.contextId;
    return {
      ...c,
      contextId: rp && idRemap.has(rp) ? idRemap.get(rp) : rp,
    };
  });

  return {
    ...understanding,
    analysisContexts: canonicalContexts,
    subClaims: remappedClaims,
  };
}

export function canonicalizeScopesWithRemap(
  input: string,
  understanding: any,
): { understanding: any; idRemap: Map<string, string> } {
  if (!understanding) return { understanding, idRemap: new Map() };
  const contexts = Array.isArray(understanding.analysisContexts)
    ? understanding.analysisContexts
    : [];
  if (contexts.length === 0) return { understanding, idRemap: new Map() };

  // Stable ordering to prevent run-to-run drift in labeling and downstream selection.
  const sorted = [...contexts].sort((a: any, b: any) => {
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

  const canonicalContexts = sorted.map((p: any, idx: number) => {
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
    const rp = c.contextId;
    return {
      ...c,
      contextId: rp && idRemap.has(rp) ? idRemap.get(rp) : rp,
    };
  });

  return {
    understanding: {
      ...understanding,
      analysisContexts: canonicalContexts,
      subClaims: remappedClaims,
    },
    idRemap,
  };
}

export function ensureAtLeastOneScope(
  understanding: any,
): any {
  if (!understanding) return understanding;
  const contexts = Array.isArray(understanding.analysisContexts)
    ? understanding.analysisContexts
    : [];
  if (contexts.length > 0) return understanding;
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
    analysisContexts: [
      {
        ...fallbackScope,
        id: generateDeterministicScopeId(fallbackScope, null, 0),
      },
    ],
    requiresSeparateAnalysis: false,
  };
}

