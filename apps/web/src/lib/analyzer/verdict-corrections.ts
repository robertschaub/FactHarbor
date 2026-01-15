/**
 * Verdict correction utilities (inversion detection, counter-claim detection)
 *
 * Extracted from the monolithic `analyzer.ts` to keep responsibilities separated.
 *
 * @module analyzer/verdict-corrections
 */

import type { ExtractedFact } from "./types";
import { debugLog } from "./debug";

/**
 * Detect and correct inverted verdicts.
 * The LLM sometimes rates "how correct is my analysis" (high) instead of "is the claim true" (low).
 * This function detects when reasoning contradicts the verdict and corrects it.
 *
 * @returns corrected truth percentage, or original if no inversion detected
 */
export function detectAndCorrectVerdictInversion(
  claimText: string,
  reasoning: string,
  verdictPct: number,
): { correctedPct: number; wasInverted: boolean; inversionReason?: string } {
  // Only check verdicts that are in the "true" range (>=50%)
  if (verdictPct < 50) {
    return { correctedPct: verdictPct, wasInverted: false };
  }

  // DEBUG: Log inputs to debug file
  debugLog("[INVERSION DEBUG] Input values", {
    claimText: claimText?.slice(0, 100),
    reasoning: reasoning?.slice(0, 150),
    verdictPct,
  });

  const claimLower = claimText.toLowerCase();
  const reasoningLower = reasoning.toLowerCase();

  // Pattern 1: Claim says "X was proportionate/justified/fair" but reasoning says "NOT proportionate/justified/fair"
  // Allow optional articles/words between verb and adjective: "were a proportionate", "was not a fair"
  const positiveClaimPatterns = [
    /\b(was|were|is|are)\s+(a\s+)?(proportionate|justified|fair|appropriate|reasonable|valid|correct|proper)\b/i,
    /\b(proportionate|justified|fair|appropriate|reasonable|valid|correct|proper)\s+(response|action|decision|measure|and\s+justified)\b/i,
    // Additional positive assertion patterns
    // Comparative positive assertions
    /\b(more|higher|better|superior|greater)\s+(efficient|effective|accurate|reliable)\b/i,
    // Positive state assertions
    /\b(has|have|had)\s+(sufficient|adequate|strong|solid)\s+(evidence|basis|support)\b/i,
    /\b(supports?|justifies?|warrants?|establishes?)\s+(the\s+)?(claim|assertion|conclusion)\b/i,
  ];

  const negativeReasoningPatterns = [
    // "were NOT proportionate", "was NOT a fair response"
    /\b(was|were|is|are)\s+not\s+(a\s+)?(proportionate|justified|fair|appropriate|reasonable|valid|correct|proper)\b/i,
    // "NOT proportionate to", "not a proportionate response"
    /\bnot\s+(a\s+)?(proportionate|justified|fair|appropriate|reasonable|valid|correct|proper)/i,
    // Negative adjectives
    /\b(disproportionate|unjustified|unfair|inappropriate|unreasonable|invalid|incorrect|improper)\b/i,
    // Legal/ethical violations
    /\bviolates?\s+(principles?|norms?|standards?|law|rights?)\b/i,
    /\blacks?\s+(factual\s+)?basis\b/i,
    /\brepresents?\s+(economic\s+)?retaliation\b/i,
    /\b(inappropriate|improper)\s+(interference|intervention)\b/i,
    // Interference patterns
    /\binterfere\s+with\b/i,
    /\bmaking\s+them\s+(disproportionate|inappropriate)\b/i,
    // Excessive patterns
    /\b(excessive|unwarranted|undue)\s+(economic\s+)?(punishment|pressure|retaliation)\b/i,
    // Additional denial patterns
    // Insufficiency patterns
    /\b(lacks?|lacking)\s+(sufficient\s+)?(evidence|basis|support|justification)\b/i,
    /\b(insufficient|inadequate)\s+(evidence|basis|support|justification)\b/i,
    /\bdoes\s+not\s+(support|justify|warrant|establish)\b/i,
    /\bfails?\s+to\s+(support|justify|demonstrate|establish|show)\b/i,
    // Contradiction patterns
    /\b(contradicts?|contradicted|contradicting)\s+(the\s+)?(claim|assertion|thesis)\b/i,
    /\bevidence\s+(shows?|indicates?|suggests?|demonstrates?)\s+(the\s+)?opposite\b/i,
    /\b(contrary|opposite)\s+to\s+(what|the\s+claim)\b/i,
    // Falsification patterns
    /\b(refutes?|refuted|disproves?|disproved|negates?|negated)\b/i,
    /\b(false|untrue|inaccurate|incorrect|wrong|erroneous)\s+(based\s+on|according\s+to)?\s*(the\s+)?evidence\b/i,
    // Efficiency/comparison denial for comparative claims
    /\b(less|lower|worse|inferior|reduced)\s+(efficient|effective|productive|performance)\b/i,
    /\bnot\s+(more|higher|better|superior)\s+(efficient|effective)\b/i,
  ];

  // Check if claim asserts something positive
  const claimAssertsPositive = positiveClaimPatterns.some((p) =>
    p.test(claimLower),
  );

  // Check if reasoning negates it
  const reasoningNegates = negativeReasoningPatterns.some((p) =>
    p.test(reasoningLower),
  );

  // DEBUG: Log pattern matching results
  debugLog("[INVERSION DEBUG] Pattern matching results", {
    claimAssertsPositive,
    reasoningNegates,
    shouldInvert: claimAssertsPositive && reasoningNegates && verdictPct >= 50,
  });

  debugLog("detectAndCorrectVerdictInversion: CHECK", {
    claimText: claimText.slice(0, 80),
    reasoningSnippet: reasoningLower.slice(0, 120),
    verdictPct,
    claimAssertsPositive,
    reasoningNegates,
  });

  if (claimAssertsPositive && reasoningNegates && verdictPct >= 50) {
    // Invert the verdict: 72% → 28%, 85% → 15%, etc.
    const correctedPct = 100 - verdictPct;
    debugLog("detectAndCorrectVerdictInversion: INVERTED", {
      claimText: claimText.slice(0, 100),
      originalPct: verdictPct,
      correctedPct,
      reason: "Reasoning contradicts claim assertion",
    });
    return {
      correctedPct,
      wasInverted: true,
      inversionReason:
        "Reasoning indicates claim is false but verdict was high - inverted",
    };
  }

  return { correctedPct: verdictPct, wasInverted: false };
}

/**
 * Detect if a sub-claim is a counter-claim (evaluates the opposite of the user's thesis).
 * Counter-claims are generated when the LLM creates sub-claims that test opposing positions,
 * or when claims are derived from counter-evidence search results.
 *
 * CRITICAL: A claim that semantically SUPPORTS the thesis should NEVER be marked as a
 * counter-claim, regardless of fact directions. Only claims that test the OPPOSITE
 * position (e.g., "was unfair" when thesis says "was fair") are counter-claims.
 *
 * @param claimText - The text of the sub-claim
 * @param userThesis - The user's original thesis/claim (normalized)
 * @param claimFacts - Facts supporting this claim (check if from counter-evidence search)
 * @returns true if this is a counter-claim
 */
export function detectCounterClaim(
  claimText: string,
  userThesis: string,
  claimTruthPercentage?: number,
  claimFacts?: ExtractedFact[],
): boolean {
  const claimLower = claimText.toLowerCase();
  const thesisLower = userThesis.toLowerCase();

  // =========================================================================
  // EARLY EXIT: Check if claim semantically SUPPORTS the thesis
  // If the claim is thesis-aligned, it cannot be a counter-claim.
  // =========================================================================

  // Common evaluative terms and their synonyms for alignment detection
  const POSITIVE_EVAL_SYNONYMS: Record<string, string[]> = {
    fair: ["fair", "just", "equitable", "impartial", "unbiased"],
    proportionate: ["proportionate", "proportional", "appropriate", "reasonable", "fitting"],
    justified: ["justified", "warranted", "legitimate", "valid", "well-founded"],
    proper: ["proper", "correct", "appropriate", "due", "right"],
    lawful: ["lawful", "legal", "legitimate", "constitutional", "valid"],
    true: ["true", "accurate", "correct", "valid", "factual"],
    efficient: ["efficient", "effective", "productive", "optimal"],
  };

  // Check if claim and thesis share aligned evaluative framing
  function hasAlignedEvalTerms(claim: string, thesis: string): boolean {
    for (const [, synonyms] of Object.entries(POSITIVE_EVAL_SYNONYMS)) {
      const claimHasTerm = synonyms.some((s) => claim.includes(s));
      const thesisHasTerm = synonyms.some((s) => thesis.includes(s));
      // If both contain terms from the same synonym group (both positive), they're aligned
      if (claimHasTerm && thesisHasTerm) {
        // Make sure neither is negated
        const claimNegated = synonyms.some((s) => {
          const idx = claim.indexOf(s);
          if (idx === -1) return false;
          const before = claim.slice(Math.max(0, idx - 10), idx);
          return /\bnot\b|\bno\b|\bun|\bin/.test(before);
        });
        const thesisNegated = synonyms.some((s) => {
          const idx = thesis.indexOf(s);
          if (idx === -1) return false;
          const before = thesis.slice(Math.max(0, idx - 10), idx);
          return /\bnot\b|\bno\b|\bun|\bin/.test(before);
        });
        // Both positive (neither negated) = aligned
        if (!claimNegated && !thesisNegated) return true;
        // Both negative = aligned (both saying "not fair")
        if (claimNegated && thesisNegated) return true;
      }
    }
    return false;
  }

  // Check if claim is about a supporting aspect of the thesis
  // e.g., thesis: "trial was fair" → claim: "due process was followed" (supports fairness)
  function isClaimAboutSupportingAspect(claim: string, thesis: string): boolean {
    // If thesis is about fairness/justice/propriety, and claim is about procedural/evidential
    // aspects that would SUPPORT such a conclusion, they're aligned
    const fairnessThesis =
      /\b(fair|just|equitable|impartial|proper|lawful|legal|constitutional)\b/.test(thesis);
    const supportingClaimPatterns = [
      /\b(due process|proper process|procedure|procedural)\b.*\b(follow|met|comply|observed)\b/,
      /\b(follow|met|comply|observed)\b.*\b(due process|proper process|procedure)\b/,
      /\b(evidence|evidentiary|proof)\b.*\b(proper|sufficient|adequate|considered|reviewed)\b/,
      /\b(proper|sufficient|adequate)\b.*\b(evidence|evidentiary|proof)\b/,
      /\b(based on|pursuant to|according to)\b.*\b(law|legal|statute|constitution)\b/,
      /\b(law|legal|statute|constitution)\b.*\b(applied|followed|observed|respected)\b/,
      /\b(charges|indictment|prosecution)\b.*\b(based on|supported by|grounded in)\b.*\b(law|evidence)\b/,
      /\b(constitutional|legal)\b.*\b(jurisdiction|authority|basis|foundation)\b/,
      /\b(sentence|penalty|punishment|fine)\b.*\b(proportionate|appropriate|justified|fair)\b/,
      /\b(proportionate|appropriate|justified|fair)\b.*\b(sentence|penalty|punishment|fine)\b/,
      /\b(judicial|judge|court)\b.*\b(independence|impartial|unbiased|free from)\b/,
    ];
    if (fairnessThesis) {
      for (const pattern of supportingClaimPatterns) {
        if (pattern.test(claim)) return true;
      }
    }
    return false;
  }

  /**
   * Check if a claim semantically supports/aligns with the thesis.
   * If aligned, the claim cannot be a counter-claim regardless of fact directions.
   */
  function isClaimAlignedWithThesis(claim: string, thesis: string): boolean {
    // Check 1: Both use the same positive evaluative framing
    if (hasAlignedEvalTerms(claim, thesis)) {
      debugLog("detectCounterClaim: Thesis-aligned (same eval terms)", {
        claim: claim.slice(0, 80),
        thesis: thesis.slice(0, 80),
      });
      return true;
    }

    // Check 2: Claim is about an aspect that SUPPORTS the thesis conclusion
    if (isClaimAboutSupportingAspect(claim, thesis)) {
      debugLog("detectCounterClaim: Thesis-aligned (supporting aspect)", {
        claim: claim.slice(0, 80),
        thesis: thesis.slice(0, 80),
      });
      return true;
    }

    return false;
  }

  if (isClaimAlignedWithThesis(claimLower, thesisLower)) {
    return false;
  }

  // =========================================================================
  // Text-based detection (preferred): compare claim text vs thesis text
  // =========================================================================

  const STOP_WORDS = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "of",
    "to",
    "in",
    "on",
    "for",
    "with",
    "at",
    "by",
    "from",
    "as",
    "into",
    "than",
    "over",
    "under",
    "using",
    "use",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
  ]);

  function tokenizePhrase(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
  }

  function overlapRatio(a: string, b: string): number {
    const aTokens = tokenizePhrase(a);
    const bTokens = tokenizePhrase(b);
    if (aTokens.length === 0 || bTokens.length === 0) return 0;
    const aSet = new Set(aTokens);
    const bSet = new Set(bTokens);
    let inter = 0;
    for (const t of aSet) if (bSet.has(t)) inter++;
    const denom = Math.min(aSet.size, bSet.size);
    return denom > 0 ? inter / denom : 0;
  }

  function phrasesMatch(a: string, b: string): boolean {
    // Containment-style match is more forgiving for short vs expanded phrases
    // (e.g., "Technology A" vs "Technology A-based vehicles")
    return overlapRatio(a, b) >= 0.75;
  }

  type ComparativeFrame =
    | { kind: "than"; left: string; comp: string; adj: string; right: string }
    | { kind: "over"; left: string; right: string }
    | null;

  function extractComparativeFrame(text: string): ComparativeFrame {
    const cleaned = text
      .replace(/["']/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Pattern A: "Using X ... is more/less/higher/... <adj> than (using) Y"
    const usingRe =
      /using\s+(.+?)\s+(?:for\s+.+?\s+)?(?:is|are|was|were)\s+(more|less|higher|lower|better|worse|greater|smaller)\s+(\w+)\s+than\s+(?:using\s+)?(.+?)(?:[.?!,;]|$)/i;
    const usingMatch = cleaned.match(usingRe);
    if (usingMatch) {
      const [, left, comp, adj, right] = usingMatch;
      return {
        kind: "than",
        left: left.trim(),
        comp: comp.trim().toLowerCase(),
        adj: adj.trim().toLowerCase(),
        right: right.trim(),
      };
    }

    // Pattern B: General: "X is more/less/... <adj> than Y"
    const thanRe =
      /^(.+?)\s+(?:is|are|was|were)\s+(more|less|higher|lower|better|worse|greater|smaller)\s+(\w+)\s+than\s+(.+?)(?:[.?!,;]|$)/i;
    const thanMatch = cleaned.match(thanRe);
    if (thanMatch) {
      const [, left, comp, adj, right] = thanMatch;
      return {
        kind: "than",
        left: left.trim(),
        comp: comp.trim().toLowerCase(),
        adj: adj.trim().toLowerCase(),
        right: right.trim(),
      };
    }

    // Pattern C: Preference-style: "favor/prefer X over Y"
    const overRe =
      /\b(favor|favour|prefer|prioritize|prioritise)\b\s+(.+?)\s+over\s+(.+?)(?:[.?!,;]|$)/i;
    const overMatch = cleaned.match(overRe);
    if (overMatch) {
      const [, , left, right] = overMatch;
      return { kind: "over", left: left.trim(), right: right.trim() };
    }

    return null;
  }

  // Pattern: Claim is testing the opposite direction of a comparative
  // User thesis: "X is more efficient than Y" → Counter-claim: "Y is more efficient than X"
  const thesisFrame = extractComparativeFrame(thesisLower);
  const claimFrame = extractComparativeFrame(claimLower);
  if (thesisFrame && claimFrame) {
    if (thesisFrame.kind === "than" && claimFrame.kind === "than") {
      const oppositeComparatives: Record<string, string> = {
        more: "less",
        less: "more",
        higher: "lower",
        lower: "higher",
        better: "worse",
        worse: "better",
        greater: "smaller",
        smaller: "greater",
      };

      const sameAdj = thesisFrame.adj === claimFrame.adj;

      // Opposite comparator ("more" vs "less") with same subject ordering
      if (
        sameAdj &&
        oppositeComparatives[thesisFrame.comp] === claimFrame.comp &&
        phrasesMatch(thesisFrame.left, claimFrame.left) &&
        phrasesMatch(thesisFrame.right, claimFrame.right)
      ) {
        return true;
      }

      // Swapped subjects (Y ... than X) with same comparator
      if (
        sameAdj &&
        thesisFrame.comp === claimFrame.comp &&
        phrasesMatch(thesisFrame.left, claimFrame.right) &&
        phrasesMatch(thesisFrame.right, claimFrame.left)
      ) {
        return true;
      }
    }

    if (thesisFrame.kind === "over" && claimFrame.kind === "over") {
      // "favor X over Y" → counter-claim: "favor Y over X"
      if (
        phrasesMatch(thesisFrame.left, claimFrame.right) &&
        phrasesMatch(thesisFrame.right, claimFrame.left)
      ) {
        return true;
      }
    }
  }

  // Pattern: Claim explicitly states the opposite of the thesis
  // Look for negation of key thesis terms
  // Conservative heuristic:
  // Only flag counter-claim when BOTH thesis and claim mention the same evaluative term,
  // but with opposite polarity (e.g., "fair" vs "not fair"/"unfair").
  const EVAL_TERMS = [
    "proportionate",
    "justified",
    "fair",
    "efficient",
    "effective",
    "true",
    "valid",
  ] as const;
  type EvalTerm = (typeof EVAL_TERMS)[number];

  const NEGATIVE_TO_POSITIVE: Record<string, EvalTerm> = {
    disproportionate: "proportionate",
    unjustified: "justified",
    unfair: "fair",
    inefficient: "efficient",
    ineffective: "effective",
    false: "true",
    untrue: "true",
    invalid: "valid",
  };

  function getPolarityByTerm(
    text: string,
  ): Partial<Record<EvalTerm, "positive" | "negative">> {
    const out: Partial<Record<EvalTerm, "positive" | "negative">> = {};
    const t = text.toLowerCase();

    // Detect explicit negation: "not <term>"
    for (const term of EVAL_TERMS) {
      const negRe = new RegExp(`\\bnot\\s+${term}\\b`, "i");
      if (negRe.test(t)) {
        out[term] = "negative";
      }
    }

    // Detect negative lexical forms: "unfair", "invalid", etc.
    for (const [negWord, posTerm] of Object.entries(NEGATIVE_TO_POSITIVE)) {
      const negWordRe = new RegExp(`\\b${negWord}\\b`, "i");
      if (negWordRe.test(t)) {
        out[posTerm] = "negative";
      }
    }

    // Detect positive mentions of the term only if we didn't already mark it negative.
    for (const term of EVAL_TERMS) {
      if (out[term]) continue;
      const posRe = new RegExp(`\\b${term}\\b`, "i");
      if (posRe.test(t)) {
        out[term] = "positive";
      }
    }

    return out;
  }

  const thesisPolarity = getPolarityByTerm(thesisLower);
  const claimPolarity = getPolarityByTerm(claimLower);
  for (const term of EVAL_TERMS) {
    const tp = thesisPolarity[term];
    const cp = claimPolarity[term];
    if (!tp || !cp) continue;
    if (tp !== cp) return true;
  }

  // =========================================================================
  // Evidence-based fallback (guarded):
  // Only use evidence direction when the claim itself is clearly true-ish or clearly false-ish.
  //
  // Rationale: `supportingFactIds` for a claim can include refuting evidence.
  // If the user's thesis is false, many refutations will be labeled "contradicts" relative
  // to the thesis, which MUST NOT automatically make same-direction (thesis-aligned) claims
  // look like counter-claims.
  // =========================================================================
  if (claimFacts && claimFacts.length > 0 && typeof claimTruthPercentage === "number") {
    const truthPct = claimTruthPercentage;
    const contradictCount = claimFacts.filter(
      (f) => f.claimDirection === "contradicts" || f.fromOppositeClaimSearch,
    ).length;
    const supportCount = claimFacts.filter((f) => f.claimDirection === "supports").length;

    const majorityContradicts = contradictCount > claimFacts.length / 2;
    const majoritySupports = supportCount > claimFacts.length / 2;

    // If claim is (leaning) true and its evidence contradicts the user's thesis,
    // it's likely evaluating the opposite position.
    if (truthPct >= 58 && majorityContradicts) return true;

    // If claim is (leaning) false and its evidence supports the user's thesis,
    // it's likely a counter-claim that was refuted.
    if (truthPct <= 42 && majoritySupports) return true;
  }

  return false;
}

