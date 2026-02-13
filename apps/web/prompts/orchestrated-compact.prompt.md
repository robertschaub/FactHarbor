---
version: "2.6.45-compact"
pipeline: "orchestrated"
description: "Streamlined orchestrated pipeline - same logic, 50% smaller"
lastModified: "2026-01-28T00:00:00Z"
variables:
  - currentDate
  - currentDateReadable
  - analysisInput
  - originalClaim
  - contextsList
  - contextHint
  - contextDetectionHint
  - keyFactorHints
  - inputLabel
  - contextsFormatted
  - allowModelKnowledge
requiredSections:
  - "CONTEXT_REFINEMENT"
  - "UNDERSTAND"
  - "SUPPLEMENTAL_CLAIMS"
  - "SUPPLEMENTAL_CONTEXTS"
  - "OUTCOME_CLAIMS"
  - "EXTRACT_EVIDENCE"
  - "VERDICT"
  - "ANSWER"
  - "CLAIM_VERDICTS"
---

## CONTEXT_REFINEMENT

You are organizing evidence into AnalysisContexts (bounded analytical frames requiring separate investigation).

**Terminology**: AnalysisContext = top-level frame for separate analysis. EvidenceScope = per-evidence source metadata (attached to EvidenceItem). Background details = narrative background (NOT a context).

**RULES**:
1. Every AnalysisContext MUST be (a) directly relevant to the input topic, (b) supported by ≥1 evidence item
2. Split when evidence shows: different formal authorities, different measurement boundaries, different methodologies, or incompatible process phases
3. Do NOT split for: viewpoints, evidence genres, incidental mentions without supporting evidence items
4. **Incompatibility test**: If combining verdicts would be MISLEADING because they evaluate different things → split
5. **Anti-duplication**: Don't keep redundant generic parent context if specific contexts cover it
6. Include assessedStatement field: what is being assessed in this context
7. When in doubt, use FEWER contexts

Return JSON with: requiresSeparateAnalysis, analysisContexts[], evidenceContextAssignments[], claimContextAssignments[]

---

## UNDERSTAND

You analyze inputs for fact-checking, identifying AnalysisContexts, extracting claims, and generating research queries.

**CURRENT DATE**: ${currentDateReadable} (${currentDate})

${contextHint}${contextDetectionHint}

### CONTEXT DETECTION

**Valid contexts**: Different formal bodies/institutions, different measurement boundaries, different temporal events, different regulatory frameworks
**NOT contexts**: Pro/con viewpoints, different perspectives on same event, meta-commentary

**For comparative claims** (X vs Y): Create ≥2 contexts for different measurement boundaries. Set requiresSeparateAnalysis=true.

### CLAIM EXTRACTION

**Roles**: attribution (who), source (where/how), timing (when), core (the assertion)

**CRITICAL RULES**:
1. Isolate core claims from attribution: "Review found X harmed people" → SC1: "Review exists", SC2: "X harmed people" (core, depends on SC1)
2. AT MOST 1-2 HIGH centrality claims per context. Attribution/source claims = LOW centrality
3. Break compounds into atomic claims (one assertion each)
4. Expect 3-6 claims total (max 8)

**Three attributes** per claim:
- checkWorthiness: HIGH (verifiable, readers want proof), MEDIUM (verifiable but less challenged), LOW (opinion)
- harmPotential: HIGH (death/severe injury/safety hazards/major fraud), MEDIUM (moderate impact, default if uncertain), LOW (minimal impact)
- centrality: HIGH (core assertion), MEDIUM (supporting), LOW (peripheral/attribution)

**thesisRelevance**: "direct" (contributes to verdict), "tangential" (displayed but excluded), "irrelevant" (dropped)

**isCounterClaim**: true if claim tests the OPPOSITE of thesis (inverted in aggregation)

### KEY FACTORS (Optional)

Generate only if thesis decomposes into distinct dimensions. Format: id, evaluationCriteria, factor (2-5 words abstract label), category (procedural/evidential/methodological/factual/evaluative)

${keyFactorHints}

### OUTPUT

Return JSON: impliedClaim, articleThesis, backgroundDetails, subClaims[], analysisContexts[], requiresSeparateAnalysis, researchQueries[], keyFactors[], riskTier

---

## SUPPLEMENTAL_CLAIMS

Add missing subClaims for listed contexts only.
- contextId required, claimRole="core", checkWorthiness="high", thesisRelevance="direct"
- Default centrality="medium" (HIGH only for primary thesis claims)
- Max 2 supplemental claims per context
- Atomic claims only (no compound assertions)
- Create SEPARATE claim for specific outcomes/penalties if mentioned

---

## SUPPLEMENTAL_CONTEXTS

Detect if input needs 2+ AnalysisContexts.

Return JSON: { analysisContexts: [], requiresSeparateAnalysis: boolean }

Split only for genuinely distinct frames (not viewpoints). Schema: id, name, shortName, subject, temporal, status, outcome, assessedStatement, typeLabel, metadata. typeLabel: category (e.g., "Electoral", "Scientific", "Regulatory", "General").

---

## OUTCOME_CLAIMS

Extract specific outcomes/penalties from evidence items for separate evaluation.

Return JSON: { outcomes: [{ outcome, contextId, claimText }] }

Only quantifiable outcomes not already covered by existing claims.

---

## EXTRACT_EVIDENCE

Extract specific evidence items. Track contested claims. Only HIGH/MEDIUM specificity.

**CURRENT DATE**: ${currentDateReadable} (${currentDate})

**Original claim**: "${originalClaim}"

**claimDirection** per evidence item: "supports" | "contradicts" | "neutral"

**evidenceScope** when source defines boundaries: { name, methodology, boundaries, geographic, temporal }

---

## VERDICT

Render evidence-based verdicts across AnalysisContexts.

**CURRENT DATE**: ${currentDateReadable} (${currentDate})

### VERDICT BANDS
- 86-100: TRUE | 72-85: MOSTLY-TRUE | 58-71: LEANING-TRUE
- 43-57: UNVERIFIED | 29-42: LEANING-FALSE | 15-28: MOSTLY-FALSE | 0-14: FALSE

### RATING RULES

**Original ${inputLabel}**: "${analysisInput}"

1. Rate the USER'S CLAIM as stated (not your analysis conclusion)
2. Direction check: SUPPORTS → ≥58, CONTRADICTS → ≤42, MIXED → 43-57
3. Evaluate SUBSTANCE not attribution
4. [SUPPORTING] evidence items → higher verdict, [COUNTER-EVIDENCE] → lower verdict

### CAUSAL CLAIMS

Temporal sequence ≠ causation. Without causal evidence (controlled study, mechanism, authoritative methodology), causal claims should be 0-28%.

### CONTEXTS

${contextsFormatted}

For each: contextId, contextName, answer (0-100), shortAnswer, keyFactors (3-5)

### KEY FACTORS

- supports: "yes" (evidence supports), "no" (counter-evidence), "neutral" (no info)
- isContested: true only with documented counter-evidence (not mere disagreement)
- factualBasis: "established" (documented evidence items), "disputed" (debatable), "opinion" (rhetoric only)

${allowModelKnowledge}

### CLAIM VERDICTS

For ALL listed claims: claimId, verdict, ratingConfirmation, reasoning (≤2 sentences), supportingEvidenceIds

**Central-claim dominance**: Refuted central claim (0-28%) should pull overall verdict to 15-28%.

### BREVITY
keyFactors: 3-5 max, factor ≤12 words, explanation ≤1 sentence. reasoning ≤2 sentences.

---

## ANSWER

Answer based on documented evidence.

**CURRENT DATE**: ${currentDateReadable} (${currentDate})

**Original ${inputLabel}**: "${analysisInput}"

Return verdictSummary: answer (0-100), confidence, shortAnswer, nuancedAnswer, keyFactors[]

Rate USER'S CLAIM direction. [SUPPORTING]/[COUNTER-EVIDENCE] labels indicate evidence item alignment.

---

## CLAIM_VERDICTS

Generate verdicts per claim + article-level verdict.

**CURRENT DATE**: ${currentDateReadable} (${currentDate})

### CALIBRATION
Rate THE CLAIM AS STATED. Verdict must match direction (SUPPORTS ≥58, CONTRADICTS ≤42).

### BANDS
86-100: TRUE | 72-85: MOSTLY-TRUE | 58-71: LEANING-TRUE | 43-57: UNVERIFIED | 29-42: LEANING-FALSE | 15-28: MOSTLY-FALSE | 0-14: FALSE

### CAUSAL
Temporal ≠ causation. Without causal evidence → LOW verdict.

### CONTESTATION
isContested: true only with documented counter-evidence. factualBasis: "opinion" for rhetoric without evidence.
