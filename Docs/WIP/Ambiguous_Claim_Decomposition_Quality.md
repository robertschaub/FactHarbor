# Ambiguous Claim Decomposition — Quality Issue & Fix Proposal

**Date:** 2026-03-05
**Status:** Draft — awaiting team review
**Reported by:** Captain (manual testing)
**Investigated by:** Senior Developer (Claude Code, Opus 4.6)
**Severity:** HIGH — directly reduces analysis quality for a common input pattern

---

## 1. Problem Statement

Ambiguous comparative claims like **"Muslims are more violent than Christians"** are reduced to a single atomic claim, when the input clearly contains multiple independently verifiable dimensions. The pipeline correctly identifies the ambiguity but then filters out the decomposed claims, leaving only one narrow perspective.

This produces an analysis that appears comprehensive (3 boundaries, 44 evidence items) but is structurally incomplete — it only examines one facet (terrorism rates) of a multi-faceted assertion.

---

## 2. Observed Behavior

**Input:** "Muslims are more violent than Christians."

**Expected:** 2-3 atomic claims covering distinct dimensions of "violent":
1. Terrorism/extremist attack rates (comparative)
2. Religiously-motivated persecution (comparative)
3. Attitudes toward/support for political violence (comparative)

**Actual:** 1 atomic claim survived: "Islamist extremist groups commit terrorist attacks at higher rates than Christian extremist groups globally."

**Gate 1 stats from the run:**
```
totalClaims: 3        ← Pass 2 correctly produced 3 claims
passedOpinion: 2      ← 1 claim filtered as opinion
passedSpecificity: 0  ← ALL 3 claims failed LLM specificity check
passedFidelity: 2     ← 1 claim failed fidelity
filteredCount: 2      ← 2 claims removed, 1 survived
```

The pipeline did the right thing at every individual step — the interaction between steps caused the failure.

---

## 3. Root Cause Analysis

The issue is a **tension between two correct rules** that interact badly for ambiguous inputs:

### 3a. Pass 2 Fidelity Rule (correct, but constraining)

The prompt's hard prohibition states:
> "Do not introduce new entities, numeric metrics/scales, date ranges, geographies, or scope qualifiers into `statement` unless they already appear in input text."

For "Muslims are more violent than Christians", this means claim statements CANNOT mention "terrorism", "persecution", or "attitudes" — those words aren't in the input. The LLM must produce claims like:
- "Muslims are more violent than Christians in terms of extremist attacks"
- "Muslims are more violent than Christians in terms of religiously-motivated persecution"

These are correct decompositions of "violent" but read as vague restatements to a specificity checker.

### 3b. Gate 1 Specificity Check (correct, but unaware of context)

Gate 1's Haiku LLM evaluates each claim in isolation and asks: "Is this specific enough to verify?" All 3 dimension-claims received `passedSpecificity: false` because they look like broad, hard-to-pin-down assertions without concrete metrics, time ranges, or geographic bounds.

Gate 1 doesn't know these claims are *intentionally* broader because they represent interpretation dimensions of an ambiguous predicate. It applies the same specificity standard it would to a standalone claim.

### 3c. The Filtering Cascade

Gate 1 filtering Rule 2: a claim is removed if it fails **both** opinion AND specificity simultaneously.

- Claim A: passed opinion, failed specificity → **KEPT** (the terrorism one)
- Claim B: failed opinion, failed specificity → **REMOVED**
- Claim C: failed opinion, failed specificity → **REMOVED**

The 2 removed claims likely covered persecution and attitudes — dimensions the LLM judged as more "opinion-like" (attitudes toward violence) or less specific. Combined with the universal specificity failure, they were eliminated.

### 3d. Why the Local Run (3 boundaries, 1 claim) Worked Differently

The local run kept only 1 atomic claim but still produced 3 boundaries. This is because boundary clustering operates on evidence, not claims — the evidence naturally clustered into GTD, CSIS, and GTI boundaries. However, having only 1 claim means the entire analysis is framed through one dimension (terrorism rates), and the verdict reasoning is constrained to that lens.

---

## 4. Impact Assessment

**Frequency:** Any ambiguous comparative claim triggers this pattern. Examples:
- "Country X is more democratic than Country Y"
- "Drug A is safer than Drug B"
- "Technology X is better than Technology Y"
- "Religion X is more peaceful than Religion Y"

These are common fact-checking inputs. The pattern is: ambiguous predicate + comparative structure → multiple dimensions → Gate 1 filters most of them.

**Quality impact:** The analysis appears complete but systematically ignores dimensions that the user's claim inherently covers. A user asking "are Muslims more violent?" expects coverage of terrorism, persecution, attitudes, and state violence — not just terrorism.

---

## 5. Proposed Fixes

### Fix A: Pass 2 Prompt — Allow Dimension Labels in Claim Statements (PRIMARY)

**File:** `apps/web/prompts/claimboundary.prompt.md` (CLAIM_EXTRACTION_PASS2 section)

**Current constraint (line 147):**
> "Do not introduce new entities, numeric metrics/scales, date ranges, geographies, or scope qualifiers into `statement` unless they already appear in input text."

**Proposed addition** (after the ambiguous_single_claim rules, around line 133):

```
- For ambiguous_single_claim decompositions: the claim statement MAY include a brief
  dimension label that names the interpretation (e.g., "in terms of terrorism rates",
  "in terms of religiously-motivated persecution", "in terms of attitudes toward violence").
  These labels are NOT scope qualifiers or evidence contamination — they are natural-language
  descriptions of the semantic dimensions inherent in the ambiguous predicate. Without them,
  the claims are indistinguishable restatements that cannot pass specificity validation.
  The dimension labels must pass the backup self-check: "Could I have identified this
  dimension without reading preliminary evidence?"
```

**Why this works:** The ambiguous predicate "violent" inherently encompasses terrorism, persecution, and attitudes. Naming these dimensions doesn't violate fidelity — a reasonable reader would identify them from the word "violent" alone. The dimension label gives Gate 1 enough specificity signal to pass the claim.

**Risk:** LOW. The backup self-check prevents evidence contamination. The fidelity rule still applies to the core assertion — only the dimension label is relaxed.

### Fix B: Gate 1 Prompt — Context-Aware Specificity for Dimension Claims

**File:** `apps/web/prompts/claimboundary.prompt.md` (GATE1_VALIDATION section)

**Proposed addition** to the `passedSpecificity` guidance:

```
- When evaluating claims that represent distinct interpretation dimensions of an ambiguous
  input predicate (e.g., separate claims for "violent" decomposed into terrorism, persecution,
  and attitudes dimensions): these claims are expected to be broader than single-dimension
  claims. Their specificity comes from the dimension itself being independently verifiable
  with distinct evidence types, not from containing precise metrics or date ranges. A claim
  like "Group X commits more terrorist attacks than Group Y" is specific enough — it
  identifies a measurable phenomenon (attack rates) even without specifying a dataset or
  time range. Do not fail such claims on specificity merely because they lack numeric
  precision; fail them only if the dimension itself is too vague to generate targeted
  search queries.
```

**Why this works:** Gate 1 currently applies the same specificity bar to all claims. Dimension-claims need a different standard — their specificity is in the *type of evidence needed*, not in metric precision.

**Risk:** LOW. This only relaxes specificity for claims that are clearly dimension-decompositions. Standalone vague claims ("things are bad") still fail.

### Fix C: Pass 2 Prompt — Strengthen Dimension Distinctness Guidance (SECONDARY)

**File:** `apps/web/prompts/claimboundary.prompt.md` (CLAIM_EXTRACTION_PASS2 section)

Strengthen the existing ambiguous_single_claim guidance with an explicit example pattern:

```
- Each dimension claim must be independently falsifiable: if dimension A is true and
  dimension B is false, both verdicts should be coherent. If two dimensions would always
  have the same truth value, they are not truly independent — merge them.
- Good decomposition of "Group X is more violent than Group Y":
  → Dimension 1: comparative rates of organized violence/terrorism
  → Dimension 2: comparative rates of religiously-motivated persecution
  → Dimension 3: comparative public attitudes toward political violence
  Each requires distinct evidence (terrorism databases vs. persecution indices vs. survey data)
  and can independently be true or false.
```

**Risk:** MEDIUM. Adding examples to prompts risks "teaching to the test" (AGENTS.md rule). The example must use abstract entities ("Group X", "Group Y") not real-world names. The example illustrates the *pattern* (dimension decomposition), not a specific topic.

---

## 6. Implementation Priority

| Fix | Effort | Impact | Priority |
|-----|--------|--------|----------|
| A (Pass 2 dimension labels) | Small (prompt edit) | HIGH — directly enables richer claim extraction | **P0** |
| B (Gate 1 specificity context) | Small (prompt edit) | HIGH — prevents filtering of valid dimension claims | **P0** |
| C (Dimension distinctness guidance) | Small (prompt edit) | MEDIUM — improves quality of decomposition | **P1** |

Fixes A and B together address the root cause. Fix C improves the quality of the decomposition itself.

All three are prompt-only changes — no code modifications needed. They will take effect after prompt reseed (`ensureDefaultConfig` on deploy or manual reseed).

---

## 7. Verification Plan

1. **Reseed prompts** after changes: `npm -w apps/web run build` (postbuild auto-reseeds)
2. **Re-run the test input:** "Muslims are more violent than Christians."
   - Expected: 2-3 atomic claims surviving Gate 1
   - Expected: Each claim covers a distinct dimension (terrorism, persecution, attitudes)
3. **Cross-check with other ambiguous inputs:**
   - "Country X is more democratic than Country Y" (should decompose into electoral, institutional, civil liberties dimensions)
   - "Drug A is safer than Drug B" (should decompose into side effects, overdose risk, long-term outcomes)
4. **Regression check:** Run `npm test` to verify no test failures
5. **Verify fidelity is maintained:** Claim statements should not contain evidence-derived specifics (study names, dataset names, specific statistics)

---

## 8. Open Questions for Reviewers

1. **Fix A risk assessment:** Does allowing dimension labels in claim statements create a slippery slope toward evidence contamination? The backup self-check is the guardrail — is it sufficient?
2. **Fix C example risk:** The AGENTS.md rule says "Prompt examples must be abstract (e.g., 'Entity A did X')". The proposed example uses "Group X"/"Group Y" — is this abstract enough, or should we use a completely different domain (e.g., "Technology X is better than Technology Y")?
3. **Gate 1 interaction:** Should we also consider adjusting the `claimSpecificityMinimum` (currently 0.6) for dimension-claims, or is the prompt fix sufficient?
4. **Atomicity level interaction:** At level 3 ("Moderate"), the target is 2-3 claims for ambiguous inputs. Should we consider bumping to level 4 for this class of input, or is 2-3 sufficient?

---

## 9. Review 1 Findings & Decisions (2026-03-05)

**Reviewer:** Code Reviewer (Gemini CLI)

### Findings

| Severity | Finding |
|----------|---------|
| **HIGH** | Fix C's proposed example uses domain-specific wording ("violent", "terrorism", "persecution", "political violence") — violates AGENTS.md "No test-case terms" rule for prompt examples. |
| **MEDIUM** | Fix A's self-check guardrail ("Could I have identified this dimension without reading preliminary evidence?") is too subjective alone — LLMs can still drift into evidence contamination. |
| **LOW** | Verification plan missing explicit multilingual validation for an analysis-affecting prompt change (AGENTS.md Multilingual Robustness rule). |

### Decisions on Section 8 Questions

1. **Fix A tradeoff:** APPROVED with stronger constraints. Dimension labels allowed but must: contain no proper nouns, no dates, no numbers, no regions, no dataset/source names — short neutral phrasing only. Self-check alone is NOT sufficient; explicit constraints required.
2. **Fix C abstractness:** Current wording NOT abstract enough. Must use pattern-level placeholders: "Entity A is more [AMBIGUOUS_TRAIT] than Entity B" with abstract dimensions like "observable incidents", "institutional coercion", "attitudinal support indicators".
3. **Gate 1 threshold:** Do NOT change `claimSpecificityMinimum` yet. Apply prompt fixes (A+B) first, then measure. Global threshold changes risk broad false-positives.
4. **Atomicity level:** Keep level 3. 2-3 claims is the right target; bumping to 4 globally risks over-fragmentation and increased cost.

### Implementation Plan (Updated)

- **Fix A:** Implement with explicit dimension-label constraints (no proper nouns/dates/numbers/regions/source names)
- **Fix B:** Implement as proposed (no changes from review)
- **Fix C:** Rewrite example using abstract placeholders per reviewer guidance; DEFERRED to P1
- **Verification:** Add multilingual test case (e.g., German ambiguous input)
