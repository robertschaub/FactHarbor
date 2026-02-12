# Plan: Migrate Pattern-Based Logic to LLM Intelligence

**Status:** Draft → **REVIEW READY**
**Date:** 2026-02-02
**Priority:** High
**Reviewer:** Claude Code (2026-02-02)

---

## Executive Summary

Replace all pattern-based "intelligence" with LLM intelligence. The LLM should make all semantic judgments - patterns should only be used for non-intelligent operations (string parsing, format validation).

**Principle:** If a human would need judgment to do it, the LLM should do it.

**✅ REVIEW VERDICT: Excellent plan. Strong architectural clarity, well-sequenced phases, good risk mitigation.**

**Key Strengths:**

- Clear separation of "intelligence" vs "structure" operations
- Phased approach prevents big-bang migration risk
- Preserves validation testing before code removal
- Good prompt engineering examples

**Areas for Enhancement:** (See inline comments below)

---

## Senior Engineer Review Addendum (2026-02-02)

**Review Focus:** Correctness under alpha constraints, terminology consistency, and prompt safety.

**Key Adjustments Proposed:**

1. **Defaults vs. Config Drift:** Ensure comparisons and tests use file-backed defaults (UCM defaults) rather than code constants to avoid false “customized fields.”
2. **Confidence & Safety Gating:** When LLM confidence is low, prefer `"unknown"` (not `"disputed"`) to avoid unjustified weight reductions.
3. **Fallback Behavior:** For safety-critical fields (e.g., harmPotential), keep a minimal non-judgment heuristic fallback if LLM fails or refuses.
4. **Terminology:** Use **AnalysisContext** consistently (avoid “scope” for top-level frames); keep “evidenceScope” for per-source metadata only.
5. **Source Classification Alignment:** Reuse existing `SourceType` enum or map explicitly; avoid parallel taxonomies that drift.
6. **Prompt Examples:** Replace any real-world named examples with generic placeholders to keep prompts generic-by-design and avoid test-case leakage.

---

## Current State: Pattern-Based Functions


| Function                    | Location             | What It Does                                   | LLM Replacement                          |
| ----------------------------- | ---------------------- | ------------------------------------------------ | ------------------------------------------ |
| `validateContestation()`    | aggregation.ts:72    | Classifies factualBasis using keyword patterns | LLM outputs`factualBasis` directly       |
| `detectClaimContestation()` | aggregation.ts:170   | Detects contestation using patterns            | LLM outputs`isContested`, `factualBasis` |
| `detectHarmPotential()`     | aggregation.ts:128   | Detects death/injury claims via keywords       | LLM outputs`harmPotential`               |
| `detectPseudoscience()`     | orchestrated.ts:1569 | Pattern-matches pseudoscience categories       | LLM identifies unscientific claims       |
| `detectScopes()`            | scopes.ts            | Pre-detects analytical contexts                | LLM discovers contexts independently     |
| `opinionSourcePatterns`     | aggregation.ts       | Filters opinion sources                        | LLM identifies opinion vs evidence       |

---

## Migration Plan by Function

### 1. `validateContestation()` → LLM `factualBasis`

**Current Behavior:**

```typescript
// Pattern checks: documentedEvidenceKeywords, opinionSourcePatterns
if (matchesAnyPattern(text, documentedEvidenceKeywords)) → "established"
else if (matchesAnyPattern(text, opinionSourcePatterns)) → "opinion"
else → "opinion" (default)
```

**LLM Replacement:**

Add to KeyFactor extraction prompt:

```
For each KeyFactor, classify factualBasis:
- "established": Counter-evidence includes specific data, measurements, audits, studies, or legal citations
- "disputed": Some documented counter-evidence exists but is not conclusive
- "opinion": Counter-argument is political criticism, editorial opinion, or lacks specific evidence
- "unknown": Cannot determine evidence quality

Examples:
- "Study found 45% error rate" → established (has measurement)
- "Executive Order claims abuse" → opinion (political statement, not evidence)
- "Critics say it was unfair" → opinion (no specific evidence cited)
- "Audit documented 12 violations" → established (specific findings)
```

**🔧 PROMPT IMPROVEMENT SUGGESTION:**

Add **counter-examples** to prevent over-classification:

```
Common MISTAKES to avoid:
- ❌ "Official statement says X is true" → NOT established (it's opinion)
- ❌ "Report mentions concerns" → NOT established unless specific data cited
- ✅ "Report found 12 violations across 8 facilities" → established (specific)
- ✅ "Study measured 45% error rate (n=500)" → established (quantified)
```

Add **decision tree** for edge cases:

```
Decision flow:
1. Does it cite specific numbers/measurements? → likely "established"
2. Is it a claim about what happened? → check if documented vs asserted
3. Is it someone's interpretation/opinion? → "opinion"
4. Unclear? → "unknown" (avoid reducing weights without evidence)
```

**💡 ARCHITECTURE NOTE:**
Consider adding `factualBasisConfidence: number` (0-100) to track LLM certainty.
This helps identify cases where patterns might be needed as fallback.

**SE REVIEW COMMENT:** Add an explicit prompt line:
“If you cannot cite concrete evidence from the provided context, do NOT use 'established' or 'disputed'. Use 'opinion' or 'unknown'.”
This reduces silent over-classification and makes classification auditable.

**Schema Change:**

```typescript
// Already exists in KeyFactor schema - just ensure LLM sets it correctly
factualBasis: z.enum(["established", "disputed", "opinion", "unknown"])
```

**Files to Modify:**

- `prompts/extract-keyfactors.ts` - Add factualBasis guidance
- `aggregation.ts` - Remove `validateContestation()` pattern logic, trust LLM value

---

### 2. `detectClaimContestation()` → LLM `isContested` + `factualBasis`

**Current Behavior:**

```typescript
// Pattern checks for "disputed", "contested", "challenged" etc.
// Then checks documentedEvidenceKeywords to classify
```

**LLM Replacement:**

Add to claim verdict prompt:

```
For each claim, determine contestation:

isContested: true if the claim is actively disputed with counter-arguments
factualBasis: Quality of the counter-evidence (see above)
contestedBy: Brief description of who/what contests the claim

If contested, evaluate the QUALITY of counter-evidence:
- Political criticism without data → opinion (full weight kept)
- Documented counter-evidence → established (reduced weight)
```

**Schema Change:**

```typescript
// Already exists - ensure LLM outputs it
isContested: z.boolean(),
factualBasis: z.enum(["established", "disputed", "opinion", "unknown"]),
contestedBy: z.string().optional()
```

**Files to Modify:**

- `prompts/generate-verdicts.ts` - Add contestation guidance
- `aggregation.ts` - Remove `detectClaimContestation()` function

---

### 3. `detectHarmPotential()` → LLM `harmPotential`

**Current Behavior:**

```typescript
// Pattern checks: deathKeywords, injuryKeywords, safetyKeywords, crimeKeywords
if (matches death/injury patterns) → "high"
else if (matches safety patterns) → "high"
else → "medium"
```

**LLM Replacement:**

Add to claim extraction prompt:

```
For each claim, assess harmPotential:

- "high": Claims about death, serious injury, safety hazards, fraud, or crimes
  Examples: "causes cancer", "kills people", "committed fraud", "is dangerous"

- "medium": Claims with moderate consequences if wrong
  Examples: "is inefficient", "costs more", "has bias"

- "low": Claims with minimal real-world impact if wrong
  Examples: "is popular", "was announced", "is planned"

High-harm claims require more careful verification because errors have serious consequences.
```

**🔧 PROMPT IMPROVEMENT SUGGESTION:**

Add **gradations within "high"** for better prioritization:

```
HIGH harm sub-levels (for internal prioritization):
- Critical: Death, severe injury, serious crime allegations → highest scrutiny
- Serious: Financial fraud, safety hazards, health risks → high scrutiny
- Moderate-high: Reputation damage, legal violations → careful review

MEDIUM harm includes:
- Economic claims (cost, efficiency)
- Quality/performance claims
- Political/ideological claims (unless they allege harm)

LOW harm includes:
- Procedural claims (what was announced, planned)
- Popularity/opinion claims
- Temporal claims (when something happened)
```

**💡 TESTING NOTE:**
Create test cases with ambiguous harm:

- "Policy will bankrupt small businesses" → high? (economic harm to group)
- "Violates international norms" → medium? (reputational but vague)
- "Causes stress and anxiety" → high? (health claim but subjective)

These edge cases help refine the prompt.

**SE REVIEW COMMENT:** Keep a minimal “safety fallback” if LLM fails/refuses (timeout, parse error).
Example: if LLM output missing harmPotential, run a non-semantic keyword fallback that only elevates to “high” on clear indicators (death/injury/crime).
This is a safety net, not a semantic judgment engine.

**Schema Change:**

```typescript
// Already exists in claim schema
harmPotential: z.enum(["high", "medium", "low"]).optional()
```

**Files to Modify:**

- `prompts/understand-claim.ts` - Add harmPotential guidance
- `aggregation.ts` - Remove `detectHarmPotential()` function
- `orchestrated.ts` - Remove fallback call to `detectHarmPotential()`

---

### 4. `detectPseudoscience()` → LLM Evidence Quality Assessment

**Current Behavior:**

```typescript
// Pattern matches: homeopathy, quantum healing, crystal therapy, etc.
// Returns categories and confidence
// Used to escalate verdicts
```

**LLM Replacement:**

Add to verdict prompt (ALREADY DONE in v2.9.2):

```
EVIDENCE QUALITY GUIDANCE:
- Claims that rely on mechanisms contradicting established physics, chemistry, or biology should be treated with skepticism
- Claims lacking peer-reviewed scientific evidence, or relying on anecdotes/testimonials, are OPINION not established fact
- If a claim's mechanism has no scientific basis, it should be in the MOSTLY-FALSE/FALSE bands (0-28%)
```

**Additional Enhancement:**
Add to claim schema:

```typescript
evidenceBasis: z.enum([
  "scientific",      // Peer-reviewed studies, established science
  "documented",      // Official records, audits, legal findings
  "anecdotal",       // Testimonials, personal accounts
  "theoretical",     // Logical arguments without empirical support
  "pseudoscientific" // Contradicts established science
]).optional()
```

**✅ DESIGN DECISION: Evidence-Level with Quality-Weighted Aggregation**

**Placement:** `evidenceBasis` on **evidence items** (NOT claim-level)

**Rationale:**
- Evidence type is a property of the SOURCE, not the claim
- A claim can be supported by multiple evidence types simultaneously
- Granular tracking enables transparent quality assessment

**Schema:**

```typescript
// On EvidenceItem/ExtractedFact
evidenceBasis: z.enum([
  "scientific",      // Peer-reviewed studies, established science
  "documented",      // Official records, audits, legal findings
  "anecdotal",       // Testimonials, personal accounts
  "theoretical",     // Logical arguments without empirical support
  "pseudoscientific" // Contradicts established science
]).optional()
```

**Claim-Level Aggregation: Quality-Weighted Evidence Distribution**

Replace "predominantEvidenceBasis" with a **weighted evidence quality assessment**:

```typescript
// On ClaimVerdict
evidenceQuality: {
  // Distribution (transparent audit trail)
  scientificCount: number;
  documentedCount: number;
  anecdotalCount: number;
  theoreticalCount: number;
  pseudoscientificCount: number;

  // Weighted quality score (0-100)
  // Weights: scientific=100, documented=80, theoretical=40, anecdotal=30, pseudoscientific=0
  weightedQuality: number;

  // Strongest evidence type present (for quick filtering)
  strongestBasis: "scientific" | "documented" | "theoretical" | "anecdotal" | "pseudoscientific";

  // Evidence diversity (0-1, higher = more diverse evidence types)
  diversity: number;
}
```

**Why This is Stronger:**

1. **Transparency**: Can audit "3 scientific, 2 anecdotal, 1 pseudoscientific"
2. **Nuance**: Preserves mixed evidence (not forced to choose "predominant")
3. **Weighted Scoring**: Quality formula adjustable without schema changes
4. **Evidence Diversity**: Flag claims with only one evidence type
5. **Future-Proof**: Can add evidence type weighting to UCM config

**Example:**

Evidence for claim "X causes Y":
- Evidence A: "Peer-reviewed study found X causes Y (n=500)" → scientific (weight: 100)
- Evidence B: "Patient testimonial: X caused Y for me" → anecdotal (weight: 30)
- Evidence C: "Government audit documented 12 cases of X→Y" → documented (weight: 80)
- Evidence D: "Homeopathy study claims X cures Y" → pseudoscientific (weight: 0)

Result:
```json
{
  "scientificCount": 1,
  "documentedCount": 1,
  "anecdotalCount": 1,
  "pseudoscientificCount": 1,
  "weightedQuality": 52.5,  // (100 + 80 + 30 + 0) / 4
  "strongestBasis": "scientific",
  "diversity": 0.75  // 4 types present out of 5 possible
}
```

**Verdict Adjustment:**

Claims with low `weightedQuality` (<40) or high pseudoscientific proportion should be pushed toward FALSE.
Claims with high diversity (>0.6) may need manual review for conflicting evidence.

**💡 PROMPT ENHANCEMENT:**

Add explicit guidance for common pseudoscience patterns:

```
PSEUDOSCIENTIFIC RED FLAGS (for evidenceBasis classification):
- Claims of effects without plausible mechanism (homeopathy, quantum healing)
- Contradicts well-established physics/chemistry/biology
- Relies solely on testimonials despite testability
- Uses scientific-sounding jargon incorrectly (quantum, energy, vibrations)
- Claims unfalsifiable or irrefutable ("works but science can't detect it")

IMPORTANT: Distinguish between:
- Unproven but testable → "theoretical" or "anecdotal"
- Contradicts established science → "pseudoscientific"
- Outside scientific consensus but under investigation → "disputed"
```

**SE REVIEW COMMENT:** Ensure “pseudoscientific” classification is evidence-based and generic-by-design.
Avoid hardcoded lists in prompts; require the model to explain which established principles the claim conflicts with (or note absence of evidence).

**Files to Modify:**

- `orchestrated.ts` - Remove `detectPseudoscience()` function entirely
- `orchestrated.ts` - Remove `escalatePseudoscienceVerdict()` function
- `orchestrated.ts` - Remove `calculateArticleVerdictWithPseudoscience()` function
- Schema updates for `evidenceBasis` field

---

### 5. `detectScopes()` / Pre-detected Contexts → LLM Context Discovery

**Current Behavior:**

```typescript
// Pattern matches for legal terms, comparisons, international cues, etc.
// Pre-detects contexts and passes to LLM as "SEED contexts"
// Instructs LLM to "MUST preserve their IDs"
```

**LLM Replacement:**

Keep the UNDERSTAND prompt's context explanation (ALREADY DONE in v2.9.2):

```
TERMINOLOGY (critical):
- AnalysisContext (or "Context"): a bounded analytical frame that should be analyzed separately

NOT DISTINCT CONTEXTS:
- Different perspectives on the same event are NOT separate contexts
- Pro vs con viewpoints are NOT contexts
...

**CRITICAL: The Incompatibility Test**
Before finalizing contexts, ask: "If I combined verdicts from these potential contexts, would the result be MISLEADING?"
```

**Removed (ALREADY DONE):**

- `${scopeHint}` - Pre-detected context list
- `${scopeDetectionHint}` - Entity-based hints
- "MUST preserve their IDs as listed" instruction

**Files to Modify:**

- `scopes.ts` - Keep functions but don't use for prompt steering
- `orchestrated.ts` - Already removed hint injection (v2.9.2)

**✅ ALREADY DONE NOTE:**
This is excellent! Removing the hint injection was the right call. Pre-detected contexts were
anchoring the LLM and preventing it from discovering better analytical frames.

**SE REVIEW COMMENT:** Keep heuristic detection only as a fallback when LLM context detection fails, and do not inject hints into prompts.
This preserves input neutrality without reintroducing anchoring.

**📊 VALIDATION SUGGESTION:**

Create A/B test to measure impact:

- **Control group:** Articles analyzed WITH pre-detected context hints (old behavior)
- **Test group:** Articles analyzed WITHOUT hints (current behavior)

**Metrics to compare:**

1. **Context quality:** Do discovered contexts make analytical sense?
2. **Context count:** Too many? Too few? Compared to human judgment?
3. **Verdict accuracy:** Does removing hints improve/degrade verdict quality?
4. **Incompatibility test pass rate:** Are contexts properly separated?

**Test cases to include:**

- Generic legal case with international reaction cues (international + comparison contexts expected)
- Articles with single context (should not over-split)
- Articles with genuinely distinct contexts (should properly separate)

**SE REVIEW COMMENT:** Avoid real-world named examples in test plans and prompts; use generic placeholders (Case A/B, System X/Y) to remain generic-by-design.

---

### 6. `opinionSourcePatterns` → LLM Source Classification

**Current Behavior:**

```typescript
// Patterns: "executive order", "dissenting", "allegedly", "critics say", etc.
// Overrides documentedEvidenceKeywords if matched
```

**LLM Replacement:**

Add to evidence extraction prompt:

```
When extracting evidence, classify the source type:

sourceAuthority:
- "primary": Original research, official documents, court records
- "secondary": News reports, analysis, reviews
- "opinion": Editorial, political statements, commentary
- "contested": Source itself is disputed

For OPINION sources (executive orders, dissenting opinions, press releases, spokesperson statements):
- These are NOT documented evidence even if they use words like "documented"
- Political statements claiming something is true/false are opinions, not proof
- A government saying "X is persecution" is an opinion, not evidence of persecution
```

**Schema Change:**

```typescript
// Add to EvidenceItem/ExtractedFact
sourceAuthority: z.enum(["primary", "secondary", "opinion"]).optional()
```

**SE REVIEW COMMENT:** Prefer mapping to existing `SourceType` (peer_reviewed_study, government_report, etc.) or define a strict mapping table between the two to avoid taxonomy drift.

**Files to Modify:**

- `prompts/extract-facts-base.ts` - Add source classification guidance
- `aggregation.ts` - Remove `opinionSourcePatterns` logic from `validateContestation()`
- `aggregation.ts` - Remove `opinionSourcePatterns` logic from `detectClaimContestation()`

**🔧 PROMPT IMPROVEMENT SUGGESTION:**

The current categories are good but could use refinement:

**Proposed enhancement:**

```typescript
sourceType: z.enum([
  "empirical-research",    // Studies, experiments, measurements
  "official-record",       // Court records, audit reports, legal documents
  "journalistic",          // News reporting (factual, not opinion)
  "expert-analysis",       // Subject matter expert interpretation
  "political-statement",   // Gov't/official statements, press releases
  "opinion-editorial",     // Commentary, criticism, advocacy
  "anecdotal"             // Personal accounts, testimonials
])
```

**Prompt guidance:**

```
Classify the SOURCE TYPE of each piece of evidence:

EMPIRICAL-RESEARCH: Original studies, experiments, measurements, scientific investigations
- Example: "2023 study measured 45% error rate across 500 samples"

OFFICIAL-RECORD: Court records, audit findings, government reports (factual findings, not opinions)
- Example: "Court documents show 12 violations were found"

JOURNALISTIC: News reporting stating facts, not opinion
- Example: "Reuters reported that the policy was implemented on Jan 15"

EXPERT-ANALYSIS: Subject matter experts explaining/interpreting (not just opining)
- Example: "Economist Dr. Smith analyzed the data and found..."

POLITICAL-STATEMENT: Government claims, executive orders, party statements, press releases
- Example: "Executive Order declares the program is persecution"
- KEY: Even if phrased factually, this is a CLAIM not EVIDENCE

OPINION-EDITORIAL: Commentary, criticism, advocacy, dissenting opinions
- Example: "Critics argue the policy is harmful"

ANECDOTAL: Personal accounts, testimonials, individual experiences
- Example: "Participant reported experiencing side effects"

CRITICAL RULE: Political statements claiming something is true/false are NEVER evidence of that claim.
An executive order saying "X is persecution" is OPINION about persecution, not PROOF of persecution.
```

**SE REVIEW COMMENT:** Require the model to state which evidence criterion is missing when labeling a source as opinion (e.g., no measurements, no documents, no verified records).

**💡 ARCHITECTURE NOTE:**
Consider adding `sourceCredibility` field (0-100) to track:

- Is the source authoritative in this domain?
- Does the source have conflicts of interest?
- Is the source's track record reliable?

This would enable credibility-weighted evidence aggregation.

---

## Implementation Order

**✅ REVIEW VERDICT: Well-sequenced phases with proper validation gates.**

**💡 ENHANCEMENT: Add explicit success criteria and rollback triggers for each phase.**

---

### Phase 1: Prompt Enhancements (No Code Removal)

**Goal:** Add LLM classification guidance WITHOUT removing existing pattern logic yet

**Tasks:**

1. Add `factualBasis` guidance to KeyFactor extraction prompt
2. Add `harmPotential` guidance to claim extraction prompt
3. Add `sourceAuthority` guidance to evidence extraction prompt
4. Add `evidenceBasis` guidance to verdict prompt

**SE REVIEW COMMENT (Prompting):** Add an explicit “evidence-first” rule to every classification prompt:
“Classify only based on evidence provided in the context; if evidence is missing or generic, use opinion/unknown.”

**Success Criteria:**

- [ ] All prompts updated with classification guidance
- [ ] Prompts include positive and negative examples
- [ ] Prompts include decision trees for edge cases
- [ ] Build passes with updated prompts
- [ ] No regression in existing test cases

**Rollback Trigger:** If prompt changes cause >10% increase in LLM errors/refusals

**Estimated Time:** 2-3 hours

---

### Phase 2: Schema Updates

**Goal:** Ensure schemas support all new LLM-generated fields

**Tasks:**

1. Ensure all schemas have required fields (most already exist)
2. Add `sourceAuthority` (or revised `sourceType`) to EvidenceItem schema
3. Add `evidenceBasis` to claim schema (optional initially)
4. Add confidence fields for classification certainty (optional)

**Success Criteria:**

- [ ] All schema changes backward compatible
- [ ] Zod validation passes for new fields
- [ ] TypeScript compiles with no errors
- [ ] Database migrations created (if needed)
- [ ] Default values set for optional fields

**Rollback Trigger:** If schema changes break existing functionality

**Estimated Time:** 1-2 hours

---

### Phase 3: Validation & Testing

**🎯 CRITICAL PHASE - This determines whether to proceed with code removal**

**Goal:** Validate that LLM classifications match or exceed pattern-based classifications

**Testing Strategy:**

**3.1 Parallel Classification Testing**

```typescript
// Run BOTH pattern-based and LLM-based classification
const patternResult = detectHarmPotential(text);
const llmResult = claim.harmPotential; // from LLM

// Log discrepancies
if (patternResult !== llmResult) {
  logger.warn('Classification mismatch', {
    text,
    pattern: patternResult,
    llm: llmResult,
    claim: claim.text
  });
}
```

**3.2 Test Cases to Create:**

**FactualBasis Test Cases:**

- [ ] "Study found 45% error rate" → established (both agree)
- [ ] "Executive Order claims persecution" → opinion (pattern might miss)
- [ ] "Critics say it's unfair" → opinion (both agree)
- [ ] "Audit documented 12 violations" → established (both agree)
- [ ] "Report mentions concerns" → opinion (LLM should catch, pattern might miss)

**HarmPotential Test Cases:**

- [ ] "Causes cancer" → high (both agree)
- [ ] "Is inefficient" → medium (both agree)
- [ ] "Was announced" → low (both agree)
- [ ] "Will bankrupt businesses" → ??? (edge case - test both)
- [ ] "Violates norms" → ??? (edge case - test both)

**SourceAuthority Test Cases:**

- [ ] "Peer-reviewed study" → primary/empirical (both agree)
- [ ] "Reuters reported" → secondary/journalistic (both agree)
- [ ] "Executive Order states" → opinion/political (pattern should catch)
- [ ] "Critics argue" → opinion (both agree)
- [ ] "Official document shows" → varies (test context)

**Pseudoscience Test Cases:**

- [ ] "Homeopathy cures cancer" → pseudoscientific
- [ ] "Quantum healing balances energy" → pseudoscientific
- [ ] "Unproven but under investigation" → theoretical
- [ ] "Traditional medicine claim" → requires context

**3.3 Minimal Success Metrics (Streamlined)**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Test case pass rate** | ≥ 85% | Run 20-30 test cases, count matches |
| **Schema validation** | 100% | All LLM outputs pass Zod validation |
| **No catastrophic failures** | 0 | No cases where LLM completely misclassifies |

**Pass/Fail Criteria:**
- ✅ **PASS**: 85%+ test cases correct, no catastrophic failures, 100% schema valid
- ❌ **FAIL**: <85% accuracy OR any catastrophic failures OR schema validation failures

**Rollback Trigger:** If Phase 3 fails, return to Phase 1 (refine prompts)

**Estimated Time:** 2-3 hours

**Note:** Detailed metrics (false positives, confidence scoring, A/B testing) are **deferred to Beta**.
Focus on basic validation only for alpha.

**⚠️ GO/NO-GO DECISION POINT:** Only proceed to Phase 4 if Phase 3 succeeds

---

### Phase 4: Code Removal

**Goal:** Remove pattern-based logic and trust LLM classifications

**Prerequisites:**

- [ ] Phase 3 validation complete and successful
- [ ] Team sign-off on LLM classification quality
- [ ] Rollback plan documented

**Tasks:**

1. Remove pattern logic from `validateContestation()` - trust LLM `factualBasis`
2. Remove `detectClaimContestation()` function entirely
3. Remove `detectHarmPotential()` function and all calls
4. Remove `detectPseudoscience()` and related escalation functions
5. Remove unused lexicon patterns from UCM configs

**Implementation Strategy:**

**4.1 Incremental Removal (Phased):**

- Day 1: Remove `detectPseudoscience()` (lowest risk, already degraded)
- Day 2: Remove `detectHarmPotential()` (medium risk, clear test cases)
- Day 3: Remove contestation pattern logic (highest risk, most complex)

**Success Criteria:**

- [ ] All pattern functions removed
- [ ] No calls to removed functions remain
- [ ] Build passes
- [ ] All tests pass
- [ ] No regression in production metrics (monitor for 48 hours)

**Rollback Plan:**

1. Revert commit with pattern removal
2. Deploy previous version
3. Analyze what went wrong in Phase 3 validation
4. Return to Phase 3 with refined testing

**Estimated Time:** 2-3 hours for removal, 48 hours monitoring

---

### Phase 5: Cleanup

**Goal:** Remove dead code and update documentation

**Tasks:**

1. Remove dead code (unused functions, imports, types)
2. Remove unused lexicon entries from UCM configs
3. Update documentation:
   - Architecture docs (pattern-based → LLM-based classification)
   - Prompt guides (document new classification criteria)
   - Admin guides (lexicon config simplified)
4. Update tests to reflect LLM-only approach
5. Add monitoring/logging for LLM classification quality

**Documentation Updates:**

- [ ] `Docs/ARCHITECTURE/Overview.md` - Update classification section
- [ ] `Docs/ARCHITECTURE/Analyzer_Pipeline.md` - Remove pattern references
- [ ] `Docs/USER_GUIDES/Lexicon_Management.md` - Simplify to non-intelligent patterns only
- [ ] Add new: `Docs/ARCHITECTURE/LLM_Classification_System.md`

**Success Criteria:**

- [ ] No dead code remains
- [ ] Lexicon configs contain only non-intelligent patterns
- [ ] Documentation accurate and complete
- [ ] Team understands new LLM-based approach

**Estimated Time:** 3-4 hours

---

**TOTAL ESTIMATED TIME:** 14-20 hours across all phases

**CRITICAL SUCCESS FACTOR:** Do NOT skip Phase 3 validation. The entire migration depends on LLM reliability.

---

## What Stays (Non-Intelligent Operations)

These are NOT semantic judgments - they're format/structure operations:


| Operation         | Location                 | Why It Stays                             |
| ------------------- | -------------------------- | ------------------------------------------ |
| URL validation    | provenance-validation.ts | Checking URL format, not content meaning |
| Min length check  | evidence-filter.ts       | Counting characters, not judging quality |
| Deduplication     | evidence-filter.ts       | String similarity, not semantic judgment |
| JSON parsing      | various                  | Structure, not intelligence              |
| Schema validation | Zod schemas              | Type checking, not judgment              |

---

## Success Criteria

- [ ] LLM correctly identifies `factualBasis` without pattern hints
- [ ] LLM correctly identifies `harmPotential` without pattern hints
- [ ] LLM correctly identifies opinion sources vs documented evidence
- [ ] LLM discovers analytical contexts without pre-detection hints
- [ ] No regression in verdict accuracy on test cases
- [ ] All pattern-based "intelligence" functions removed
- [ ] Lexicon configs simplified (only non-intelligent patterns remain)

---

## Risk Mitigation


| Risk                     | Mitigation                                                         | Additional Safeguards                                                 |
| -------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| LLM inconsistency        | Clear examples in prompts, explicit classification criteria        | **Add:** Confidence scoring, parallel validation in Phase 3           |
| Missed edge cases        | Log LLM classifications for monitoring, can add examples over time | **Add:** Edge case test suite, human review of discrepancies          |
| Cost increase            | Most fields already in schemas, minimal prompt size increase       | **Add:** Measure token usage before/after, optimize prompts if needed |
| Regression               | A/B testing before full cutover                                    | **Add:** Feature flag for instant rollback, 48hr monitoring period    |
| LLM hallucination        | Validation against schemas, structured output only                 | **Add:** Confidence thresholds, flag low-confidence classifications   |
| Prompt drift             | Version prompts in UCM, test with each change                      | **Add:** Prompt regression tests, baseline performance metrics        |
| Pattern-LLM disagreement | Phase 3 validation identifies discrepancies                        | **Add:** Human arbitration for systematic disagreements               |

**SE REVIEW COMMENT:** Add “prompt version hash” to all classification logs and job snapshots to enable apples-to-apples comparison across prompt changes.

**🆕 ADDITIONAL RISKS IDENTIFIED:**


| Risk                                                                | Likelihood | Impact | Mitigation                                                             |
| --------------------------------------------------------------------- | ------------ | -------- | ------------------------------------------------------------------------ |
| **LLM model changes** (Anthropic/OpenAI updates model)              | Medium     | High   | Version-lock models in production, test new versions before upgrade    |
| **Prompt injection** (adversarial text games the classifier)        | Low        | Medium | Schema validation, sanity checks, human review of suspicious patterns  |
| **Cultural/language bias** (LLM trained on English/Western content) | Medium     | Medium | Test with diverse article sources, flag non-English content for review |
| **Temporal drift** (LLM knowledge cutoff affects classification)    | Low        | Low    | Classification should be based on text analysis, not world knowledge   |

**🎯 RECOMMENDED ADDITIONS (For Alpha):**

1. **Fallback Strategy:** If LLM fails to classify (error, refusal, timeout):

   ```typescript
   const factualBasis = keyFactor.factualBasis ||
                        (await classifyWithLLMRetry(keyFactor)) ||
                        classifyWithPatternFallback(keyFactor) ||
                        "unknown"; // safe default
   ```

2. **Basic Logging:** Track LLM classification usage during alpha:

   - Classification distribution (how often each category used)
   - Fallback usage rate
   - Processing time per classification
   - Cost per article
   - Note: Full monitoring dashboard deferred to Beta

3. **Human-in-the-Loop:** For high-stakes articles (harm=high, contested=true):

   - Flag LLM classifications for human review
   - Build training dataset from human corrections
   - Periodically fine-tune prompts based on corrections

---

## 🚀 Developer Quick Start (FULL IMPLEMENTATION)

**Scope:** Phase 1 + 2 + 3 (automated) + 4 + Commit (6-9 hours total) - Manual validation SKIPPED

---

### Phase 1: Prompt Enhancements (2-3 hours)

**What to implement:**

1. **Enhance KeyFactor extraction prompt** (`prompts/extract-keyfactors.ts`)
   - Add `factualBasis` classification guidance with examples (see section 1 above)
   - Add counter-examples to prevent over-classification
   - Add decision tree for edge cases

2. **Enhance claim extraction prompt** (`prompts/understand-claim.ts`)
   - Add `harmPotential` classification guidance (see section 3 above)
   - Include high/medium/low examples and decision criteria

3. **Enhance evidence extraction prompt** (`prompts/extract-facts-base.ts`)
   - Add `sourceAuthority` classification guidance (see section 6 above)
   - Include distinction between opinion vs documented evidence

4. **Enhance verdict prompt** (`prompts/generate-verdicts.ts`)
   - Add `evidenceBasis` guidance for pseudoscience detection (see section 4 above)
   - Add contestation quality guidance (see section 2 above)

**Testing:** Run build after each prompt change.

---

### Phase 2: Schema Updates (1-2 hours)

**What to implement:**

1. **Add to EvidenceItem schema:** `sourceAuthority` field
   - Add: `sourceAuthority: z.enum(["primary", "secondary", "opinion"]).optional()`

2. **Add to EvidenceItem schema:** `evidenceBasis` field
   - Add: `evidenceBasis: z.enum(["scientific", "documented", "anecdotal", "theoretical", "pseudoscientific"]).optional()`

3. **Verify ClaimVerdict schema** has contestation fields
   - Ensure: `isContested: z.boolean()`, `factualBasis`, `contestedBy` exist

4. **Verify Claim schema** has `harmPotential` field
   - Should exist: `harmPotential: z.enum(["high", "medium", "low"]).optional()`

5. **Add evidenceQuality aggregation to ClaimVerdict** (NEW)
   - See section 4 for full `evidenceQuality` schema with counts and weighted scoring

**Testing:** `npm -w apps/web run build`

---

### Phase 3: Quick Automated Validation (0.5 hours)

**Replace manual testing with automated checks:**

1. Run build: `npm -w apps/web run build` (must pass)
2. Run tests: `npm -w apps/web run test` (if available, must pass)
3. Quick smoke test: Start dev server, verify no runtime errors
4. Check: Prompts enhanced, schemas compile, no errors

**Proceed to Phase 4 only if all checks pass**

---

### Phase 4: Pattern Code Removal (2-3 hours)

**Remove ALL pattern-based classification logic:**

1. **aggregation.ts**
   - Remove `validateContestation()` pattern logic → trust LLM `factualBasis`
   - Remove `detectClaimContestation()` function entirely
   - Remove `detectHarmPotential()` function entirely
   - Remove `opinionSourcePatterns` logic

2. **orchestrated.ts**
   - Remove `detectPseudoscience()` function
   - Remove `escalatePseudoscienceVerdict()` function
   - Remove `calculateArticleVerdictWithPseudoscience()` function

3. **Clean up:**
   - Remove unused imports
   - Remove dead code

**Testing:** Run build and tests again after removal

---

### Git Commit (0.5 hours)

**After all phases complete:**

```bash
git add .
git commit -m "feat: migrate from pattern-based to LLM-based classification

- Enhanced prompts with classification guidance
- Added schema fields (sourceAuthority, evidenceBasis, evidenceQuality)
- Removed pattern-based logic completely

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

**Success Criteria (ALL Phases):**
- [ ] All 4 prompts enhanced with classification guidance
- [ ] All schema fields added and TypeScript compiles
- [ ] Build passes: `npm -w apps/web run build`
- [ ] All pattern functions removed
- [ ] No calls to removed functions remain
- [ ] Changes committed to git

---

## Next Steps

1. **Phase 1 (NOW)** - Enhance prompts with classification guidance (use Developer Quick Start above)
2. **Phase 2 (Next)** - Schema updates for new LLM fields
3. **Phase 3 (Critical)** - Validation testing before code removal
4. **Phase 4** - Remove pattern code once validated
5. **Phase 5** - Cleanup and documentation

---

## 📋 Comprehensive Review Summary (Claude Code - 2026-02-02)

### Overall Assessment: ⭐⭐⭐⭐½ (4.5/5)

**Excellent plan with strong architectural thinking. Ready to implement with minor enhancements.**

---

### Strengths

**1. Clear Architectural Vision ✅**

- "Intelligence vs structure" separation is exactly right
- Principle ("if human needs judgment, LLM should do it") is clear and actionable
- Well-aligned with modern LLM capabilities

**2. Proper Phased Approach ✅**

- Phases properly sequenced (enhance → validate → remove)
- Phase 3 validation gate prevents premature pattern removal
- Incremental code removal reduces risk

**3. Good Risk Awareness ✅**

- Identified key risks (inconsistency, edge cases, cost, regression)
- Mitigation strategies reasonable
- A/B testing before cutover is smart

**4. Concrete Examples ✅**

- Prompt examples are clear and actionable
- Test cases cover main scenarios
- Decision flows help with edge cases

---

### Areas for Enhancement

**1. Prompt Engineering (Addressed in inline comments)**

- ✅ Added counter-examples to prevent over-classification
- ✅ Added decision trees for edge cases
- ✅ Enhanced source classification categories
- ✅ Added pseudoscience red flags

**2. Testing Strategy (Significantly Enhanced)**

- ✅ Added parallel classification testing approach
- ✅ Added specific test case tables with expected outcomes
- ✅ Added success metrics with quantifiable thresholds
- ✅ Shadow mode deferred to Beta (separate architecture documented)

**3. Risk Mitigation (Expanded)**

- ✅ Added 4 new risk categories (model changes, prompt injection, bias, drift)
- ✅ Added fallback strategy for LLM failures
- ✅ Added monitoring dashboard recommendation
- ✅ Added human-in-the-loop for high-stakes cases

**4. Schema Design (Clarified)**

- 🤔 Raised question: Should `evidenceBasis` be on claims or evidence?
- 💡 Proposed: Keep on evidence items, add `predominantEvidenceBasis` to verdicts
- 💡 Suggested: Add confidence scoring for classifications

---

### Critical Success Factors

**1. Phase 3 Validation is Make-or-Break**

- Do NOT skip or rush this phase
- Plan for 4-6 hours of testing + 2-4 hours of analysis
- Only proceed to Phase 4 with team consensus
- Quantify everything: accuracy, false positives, false negatives

**2. Shadow Mode → DEFERRED TO BETA**

❌ **NOT in Alpha Scope** - See architecture: `Docs/WIP/Shadow_Mode_Architecture.md` and implementation guidance: `Docs/WIP/Vector_DB_Assessment.md`

Shadow Mode is a self-learning prompt optimization system that will be valuable for long-term improvement, but is not required for initial alpha migration. The system will:
- Learn how LLMs understand prompts and propose improvements
- Analyze consistency patterns and edge cases
- Provide A/B testing framework for prompt changes

**Implementation Approach (for Beta):**
- SQLite-first with offline analysis (no performance impact on production pipeline)
- Integration point: Text-analysis service layer (generic, covers all pipelines)
- Vector DB optional - only add if near-duplicate detection shows value
- Follows NFR1 (minimal performance impact) and AGENTS.md (generic-by-design)

**Alpha will rely on:** Manual Phase 3 validation with test cases instead of automated shadow mode analysis.

---

### Deferred to Beta/Production

**❌ NOT in Alpha Scope - Implement Later:**

**1. Shadow Mode (Self-Learning Prompt Optimization)** → **Beta**
- Architecture documented in `Docs/WIP/Shadow_Mode_Architecture.md`
- Implementation approach assessed in `Docs/WIP/Vector_DB_Assessment.md`
- Learns how LLMs understand prompts and proposes improvements based on behavior analysis
- Includes consistency analyzer, edge case detector, and A/B testing framework
- **Implementation Strategy:** SQLite-first with offline analysis; vector DB optional only if needed
- **Integration Point:** Text-analysis service layer (`text-analysis-llm.ts`, `text-analysis-service.ts`)
- Valuable for long-term optimization but not required for initial migration
- Alpha uses manual Phase 3 validation instead

**2. Feature Flag for Instant Rollback** → **Beta**
- Adds complexity without clear alpha benefit
- Simple git revert is sufficient for alpha
- Implement before multi-environment deployment

**3. Monitoring Dashboard** → **Beta**
- Nice-to-have observability
- Manual test case validation provides sufficient alpha validation
- Build comprehensive dashboard before production

**4. Prompt Regression Test Suite** → **Beta**
- Valuable for long-term maintenance
- Not needed for initial migration
- Build test suite as classifications stabilize

**5. Confidence Scoring** → **Beta/Production**
- Adds schema complexity
- Not required for basic classification validation
- Implement when ready for probabilistic reasoning

**6. Classification Audit Log** → **Production**
- Compliance and debugging feature
- Not needed for alpha validation
- Build when approaching production deployment

**7. LLM Classification System Documentation** → **Post-Implementation**
- Document after migration complete
- Can draft based on actual behavior
- Update as system matures

---

### Implementation Checklist

**Before Starting:**

- [ ] Team review and consensus on approach
- [ ] Identify 20-50 representative test articles
- [ ] Baseline current pattern performance
- [ ] Set up monitoring infrastructure

**Phase 1:**

- [ ] Enhance prompts (use inline suggestions)
- [ ] Add counter-examples and decision trees
- [ ] Test prompts with sample inputs
- [ ] Review prompt changes with team

**Phase 2:**

- [ ] Update schemas (consider confidence fields)
- [ ] Ensure backward compatibility
- [ ] Run database migrations if needed

**Phase 3 (CRITICAL):**

- [ ] Implement parallel classification testing
- [ ] Run test suite (FactualBasis, HarmPotential, SourceAuthority, Pseudoscience)
- [ ] Measure accuracy vs patterns
- [ ] A/B test on real articles
- [ ] Analyze discrepancies
- [ ] **GO/NO-GO DECISION:** Proceed to Phase 4?

**Phase 4:**

- [ ] Remove pattern code incrementally
- [ ] Monitor for 48 hours
- [ ] Ready to rollback via git revert if needed

**Phase 5:**

- [ ] Clean up dead code
- [ ] Update documentation
- [ ] Simplify lexicon configs
- [ ] Create LLM Classification System doc

---

### Final Recommendation

**Status:** ✅ **APPROVED TO PROCEED**

**Confidence:** High (85%)

**Conditions:**

1. Complete Phase 3 validation with quantified metrics (non-negotiable)
2. Implement fallback strategy for LLM failures (non-negotiable)
3. Add basic classification logging (recommended)
4. Consider confidence scoring (deferred to Beta)
5. Shadow mode and monitoring dashboard (deferred to Beta)

**Estimated Total Effort:** 14-20 hours

- Phase 1: 2-3 hours
- Phase 2: 1-2 hours
- Phase 3: 2-3 hours (manual test case validation only)
- Phase 4: 2-3 hours
- Phase 5: 3-4 hours
- Buffer: 4-5 hours (prompt refinement, unexpected issues)

**Expected Benefits:**

- More intelligent, context-aware classifications
- Easier to refine (update prompts vs maintain regex patterns)
- Better handling of edge cases
- Reduced technical debt (simpler codebase)
- More maintainable long-term

**Expected Costs:**

- Minimal token increase (~5-10% estimated)
- 20-30 hours implementation effort
- Some risk during transition period (mitigated by phases)

---

### Questions for Team Discussion

1. **evidenceBasis placement:** Claim-level or evidence-level? ✅ RESOLVED: Evidence-level with quality-weighted aggregation
2. **Confidence scoring:** Should we add confidence fields now or defer to beta? → Deferred to Beta
3. **Fallback strategy:** Keep patterns as fallback or fail to "unknown"? → Use pattern fallback for safety-critical fields only
4. **Shadow mode:** When to implement? → Deferred to Beta (architecture documented separately)

---

**Ready to implement!** Start with Phase 1 prompt enhancements and proceed methodically through the phases.

---

*Review completed by Claude Code (Sonnet 4.5) on 2026-02-02*
*Plan originally authored: 2026-02-02*
*Status: REVIEW READY → implementation can begin*
