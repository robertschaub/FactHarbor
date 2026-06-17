# LLM Expert — Prompt Review and Improvement Proposals

**Date:** 2026-04-14  
**Role:** LLM Expert  
**Agent/Tool:** Claude Sonnet 4.6 (Cowork)  
**Scope:** Full codebase prompt audit — all LLM-facing prompt content  
**Context read:** `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md`, `Docs/WIP/2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md`

---

## Prompt Inventory

All active LLM-facing prompt content found:

| File / Location | Sections / Purpose |
|---|---|
| `apps/web/prompts/claimboundary.prompt.md` | 25 sections — core pipeline: PASS1, SALIENCE_COMMITMENT, PASS2, PASS2_BINDING_APPENDIX, CONTRACT_VALIDATION, CONTRACT_VALIDATION_BINDING_APPENDIX, CLAIM_VALIDATION, GENERATE_QUERIES, RELEVANCE_CLASSIFICATION, EXTRACT_EVIDENCE, SCOPE_NORMALIZATION, BOUNDARY_CLUSTERING, VERDICT_ADVOCATE, VERDICT_CHALLENGER, VERDICT_RECONCILIATION, VERDICT_GROUNDING_VALIDATION, VERDICT_DIRECTION_VALIDATION, VERDICT_DIRECTION_REPAIR, VERDICT_NARRATIVE, ARTICLE_ADJUDICATION, CLAIM_GROUPING, EXPLANATION_QUALITY_RUBRIC, TIGER_SCORE_EVAL, APPLICABILITY_ASSESSMENT, SR_CALIBRATION, REMAP_SEEDED_EVIDENCE, CLAIM_CONTRACT_REPAIR |
| `apps/web/prompts/source-reliability.prompt.md` | 1 combined prompt — source reliability evaluation + evidence quality classification |
| `apps/web/prompts/input-policy-gate.prompt.md` | Input policy gate — allow/reject/review decisions |
| `apps/web/prompts/text-analysis/inverse-claim-verification.prompt.md` | Micro-prompt — strict logical inverse check |
| `apps/web/src/lib/analyzer/claim-extraction-stage.ts` (inline) | `FACT_CHECK_CONTEXT` constant + `retryGuidance` inline strings appended to user messages |

---

## Issue Catalogue

Issues are grouped by category and scored by severity: **Critical**, **High**, **Medium**, **Low**.

---

### CAT-1 — Anchor/Validator Prompt-Runtime Misalignment

#### ISSUE-01 · Severity: **High**

**Location:** `CLAIM_CONTRACT_VALIDATION` (lines ~430-454), `claim-extraction-stage.ts` ~line 2253  
**Problem:** The validator prompt says:

> "if the anchor appears as a literal substring in any claim `statement`, that claim MUST be treated as an anchor carrier"

But the runtime code does NOT accept literal substring presence alone — it filters `preservedInClaimIds` down to claims that also pass the `thesisRelevance = "direct"` structural gate. The runtime is **stricter than the prompt**. This creates a gap where:
- The validator approves preservation based on substring presence
- The runtime then rejects those IDs because they're not thesis-direct
- The result is a false-pass in the validator that the runtime then silently overrides

**Already partially documented** in `2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md` §4.

**Proposed fix:**  
Add an explicit rule to `CLAIM_CONTRACT_VALIDATION` that mirrors the runtime constraint:

```
ADDITIONAL RULE — Thesis-direct-only anchor carriers:
An anchor is considered "preserved" only when the carrying claim has `thesisRelevance: "direct"`. 
Claims with `thesisRelevance: "tangential"` or `"irrelevant"` do NOT qualify as anchor carriers, 
even if the anchor text appears as a literal substring in their statement. Report these as 
`preservedInClaimIds: []` and set `rePromptRequired: true`.
```

This is also needed for the binding-mode `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX`.

---

#### ISSUE-02 · Severity: **Medium**

**Location:** `CLAIM_SALIENCE_COMMITMENT` vs `CLAIM_CONTRACT_VALIDATION` — anchor semantic definition  
**Problem:** The two prompts use slightly different notions of "anchor":
- `CLAIM_SALIENCE_COMMITMENT` identifies anchors by the **sibling test** — aspects whose removal would change what evidence is needed.
- `CLAIM_CONTRACT_VALIDATION` identifies anchors as **truth-condition-bearing modifiers** — components whose removal would change what proposition is being verified.

These are close but not identical. A salience anchor can be a prominent agent or action_predicate that doesn't carry a truth-condition-bearing modifier. This divergence will matter when SALIENCE anchors feed into the binding validator — the validator may reject salience anchors as "not truth-condition-bearing" or vice versa.

**Proposed fix:**  
Before Phase 7b / Shape B ships, add an explicit alignment note to `CLAIM_SALIENCE_COMMITMENT`:

```
NOTE: The anchors you identify here will later be used as binding constraints for extraction 
and validation. Anchor types `agent` and `action_predicate` qualify as anchors only when they 
are constitutive of the proposition (removing them would change what evidence would be needed, 
not merely background context). For Phase 7b downstream compatibility, apply the same truth-
condition test used in the contract validator when classifying agents and predicates.
```

---

### CAT-2 — Competing or Contradictory Rules Within a Single Prompt

#### ISSUE-03 · Severity: **High** (known, partially fixed in 61815f41)

**Location:** `CLAIM_EXTRACTION_PASS2` — wording fidelity vs. normative injection rules  
**Problem:** Two rules in PASS2 can conflict for inputs containing normative/legal-status vocabulary:

- **Rule A:** "Input-authored content takes precedence over the 'no inferred normative claims' rule, because the modifier was authored by the user."
- **Rule B:** "Do NOT extract claims about legality, constitutionality, democratic legitimacy [...] unless the input TEXT ITSELF explicitly makes that assertion."

These resolve correctly for pure modifier inputs (Rule A wins when the user says "rechtskräftig"). But the resolution path is buried in a long parenthetical: *"(e.g., a finality marker, a binding-effect qualifier, or a status-completion adverb)"*. An LLM encountering a new input type may not apply the correct resolution reliably.

**Documented in prior work:** `2026-04-10` learning in `Role_Learnings.md`.

**Proposed fix:**  
Promote the conflict-resolution rule to a top-level named section with an explicit decision flowchart:

```
### Conflict resolution: input-authored vocabulary vs. no-normative-injection rule

STEP 1: Is the word/modifier present verbatim in the input text?
  NO  → Apply the no-normative-injection rule. Do not extract the normative claim.
  YES → Go to STEP 2.

STEP 2: Is this modifier constitutive of the proposition (removing it changes what evidence would verify the claim)?
  NO  → Still do not extract as a separate normative claim. Preserve verbatim in the primary claim statement only.
  YES → The modifier MUST appear verbatim in the primary thesis-direct claim. The no-normative-injection rule does NOT block this.
```

This would make the resolution path mechanical rather than relying on the LLM applying the parenthetical examples.

---

#### ISSUE-04 · Severity: **Medium**

**Location:** `CLAIM_EXTRACTION_PASS2` — claim count stability vs. atomicity-level interaction  
**Problem:** The prompt contains two instructions that can produce inconsistent claim counts:

- The `**Claim count stability for ambiguous predicates**` rule says: "the number of dimension claims should be determined by how many genuinely independent verification dimensions the predicate has."
- The `**${atomicityGuidance}**` variable (injected at runtime) says: at "Very relaxed"/"Relaxed" levels, "merge dimensions aggressively (target 1-2 claims)."

The claim-count stability rule says the count should be a fixed property of the input's semantic structure. The atomicity guidance says to merge based on a runtime setting. These are structurally in tension: the stability rule implies that the same input should always produce the same claim count, but the atomicity guidance implies the count varies by pipeline configuration.

**Proposed fix:**  
Reframe the stability rule to be scoped to a fixed atomicity level:

```
Claim count stability for ambiguous predicates (within a fixed atomicity level): For a given 
ambiguous_single_claim input at a fixed atomicity setting, the number of dimension claims should 
be stable across runs — determined by how many genuinely independent verification dimensions the 
predicate has at that level. Do not add or remove dimensions based on what the preliminary 
evidence happens to cover.
```

---

#### ISSUE-05 · Severity: **Medium**

**Location:** `EXTRACT_EVIDENCE` — `claimDirection` for partial-benefit evidence  
**Problem:** The prompt has a rule:

> "When a claim asserts absence of value/benefit [...], classify evidence showing any measurable, documented positive outcome as `contradicts` — unless the source itself explicitly concludes the positive outcome is negligible."

This is a reasonable rule, but it creates an asymmetry: evidence for broad-positive claims is NOT given the equivalent treatment (i.e., *any* negative outcome counts as `contradicts` for a "brings everything" claim). This asymmetry biases verdict direction for absolute evaluative claims.

**Proposed fix:**  
Add the symmetric rule:

```
SYMMETRIC RULE for absolute-positive claims: When a claim asserts that something is universally 
beneficial, always effective, or has no downsides, evidence showing any measurable, documented 
negative outcome must be classified as `contradicts` — unless the source explicitly concludes 
the negative outcome is negligible or immaterial.
```

---

### CAT-3 — Soft Refusal and Anti-Hallucination Coverage

#### ISSUE-06 · Severity: **High**

**Location:** `claim-extraction-stage.ts` — `FACT_CHECK_CONTEXT` and `retryGuidance` are inline strings, not in the prompt system  
**Problem:** The soft-refusal framing that defends against Anthropic's content-policy caution lives entirely in hardcoded TypeScript strings:

```typescript
const FACT_CHECK_CONTEXT = "CONTEXT: You are operating as part of a fact-checking verification pipeline...";
```

And the retry escalation:
```typescript
retryGuidance = `IMPORTANT: This is a fact-checking analysis engine...`
```

These are NOT in `claimboundary.prompt.md`. This means:
- They are invisible to prompt review
- They drift independently from the Pass2 system prompt framing
- They cannot be A/B tested or version-controlled as part of the prompt system

The LLM Expert learning from `2026-02-19` confirms: "fact-checking framing must be in the SYSTEM prompt, not just USER." These strings are being appended to the USER message, not the system prompt. This is structurally the same anti-pattern.

**Proposed fix:**  
Add a dedicated section to `claimboundary.prompt.md`:

```
## CLAIM_EXTRACTION_FACT_CHECK_FRAMING

### Inline User-Message Framing (Soft Refusal Defense)

The following text is appended to the user message at runtime for CLAIM_EXTRACTION_PASS2 
invocations to defend against content-policy soft refusals:

[FACT_CHECK_CONTEXT]
CONTEXT: You are operating as part of a fact-checking verification pipeline. Your task is 
to faithfully extract the claims in the input text so they can be verified against evidence. 
You are NOT asked to endorse, amplify, or reject any claim. Politically sensitive, controversial, 
legally complex, or potentially biased topics are valid and expected fact-checking subjects — 
treat them with the same structured extraction process.

[RETRY_GUIDANCE — total refusal path]
IMPORTANT: This is a fact-checking analysis engine. Your role is to faithfully extract the 
claims being made in the input text so they can be verified against evidence...
[etc.]
```

This keeps the content in the prompt system where it is reviewable and version-controlled.

**Note:** This is the P1 governance fix listed in `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md` §4.2, which was addressed in `61815f41` for the REPAIR prompt. The FACT_CHECK_CONTEXT equivalent has NOT yet been moved.

---

#### ISSUE-07 · Severity: **Medium**

**Location:** `VERDICT_CHALLENGER` — "missing evidence" challenge quality  
**Problem:** The challenger prompt already has a strong guard against vague missing-evidence challenges:

> "'Maybe more research would help' is NOT a valid challenge. State what specific evidence is missing..."

But the required structure for a missing-evidence challenge only requires: `type`, `description`, `evidenceIds`, `severity`. There is no schema field that forces the challenger to specify **what source type or institution** should have produced the missing evidence. The guard is prose-only.

The `VERDICT_RECONCILIATION` already handles this: "missing_evidence challenges that only say 'more research could help' without specifying what's missing are NOT valid grounds for adjustment." But the reconciler receives challenges after the fact — the generation step has no schema-level incentive to produce well-formed missing-evidence challenges.

**Proposed fix:**  
Add an optional `missingEvidenceSpec` field to the challenge schema:

```json
{
  "type": "missing_evidence",
  "description": "No primary court records from the target proceeding were found...",
  "evidenceIds": ["EV_003"],
  "severity": "high",
  "missingEvidenceSpec": {
    "expectedSourceType": "legal_document",
    "expectedInstitution": "the target jurisdiction's court system",
    "reasonToExpect": "If the claim about X is true, official court records should exist"
  }
}
```

This makes the reconciler's validity check mechanical rather than prose-based.

---

#### ISSUE-08 · Severity: **Low**

**Location:** `CLAIM_SALIENCE_COMMITMENT` — hallucination guard for sparse inputs  
**Problem:** The prompt says: "Do not hallucinate anchors. If the input is a plain factual assertion with no distinguishing meaning aspect beyond the bare agent-action-object, return `anchors: []`. Empty is the correct answer for inputs that lack truth-condition-bearing structure."

This is good, but the guard is immediately followed by a worked example. The worked example includes a non-trivial input (a committee approval). There is a risk that on token-prediction grounds, the model interpolates from the example and produces anchors where none should exist, because the example always produces non-empty output.

**Proposed fix:**  
Add a worked negative example:

```
Worked example of empty-anchor output (do not copy — this is method illustration only):  
Input: "The committee met on Tuesday."  
Anchors: []  
Rationale: The input is a plain occurrence assertion. Removing any element (who, when, what) would 
change the subject but not require fundamentally different evidence — all claims in this family 
would be investigated through the same schedule/meeting records methodology. No distinguishing 
meaning aspect beyond agent-action-object exists.
```

---

### CAT-4 — Schema Specification Quality

#### ISSUE-09 · Severity: **Medium**

**Location:** `source-reliability.prompt.md` — evidence quality relevance instruction ambiguity  
**Problem:** The prompt contains the instruction:

> "When in doubt, mark relevant: true (prefer false negatives in quality over false negatives in coverage)."

The comment says "false negatives in quality" meaning "it's OK to include low-quality items" — but the phrasing is inverted from standard quality-recall terminology. "False negative in quality" is likely to be parsed as "fail to detect a quality problem," not as "err toward inclusion." This could cause inconsistent behavior across models.

**Proposed fix:**  
Rewrite to be unambiguous:

```
When in doubt, err toward marking relevant: true — it is better to include a borderline item 
(and let downstream weighting reduce its influence) than to exclude an item that might be 
genuinely probative.
```

---

#### ISSUE-10 · Severity: **Medium**

**Location:** `VERDICT_NARRATIVE` — `boundaryDisagreements` field spec  
**Problem:** The field spec says to "omit this field entirely if [...] differences are minor." But the JSON schema shows `"boundaryDisagreements": ["string — where and why boundaries diverge"]` as always present (not marked optional). Models will fill it in some outputs, omit it in others, and downstream consumers may fail on the inconsistency.

**Proposed fix:**  
Either: (a) mark the field explicitly as optional in the schema spec with `"boundaryDisagreements?": [...]`, or (b) standardize to always return an empty array `[]` when no material disagreements exist. Option (b) is simpler for consumers:

```json
"boundaryDisagreements": [] 
```
*(preferred — keeps the schema shape stable)*

---

#### ISSUE-11 · Severity: **Low**

**Location:** `CLAIM_EXTRACTION_PASS1` and `CLAIM_EXTRACTION_PASS2` — geography inference rules  
**Problem:** Both prompts include detailed geography inference rules, but they are not perfectly consistent:
- PASS1 says: "Return `null` when a country is merely the subject or actor but evidence would come from international sources."
- PASS2 says: "list the jurisdictions whose institutions, legal systems, or national conditions are directly being assessed."

For a claim like "The Swiss Federal Council signed the EU treaty," PASS1 may infer `null` (the Swiss Federal Council is the actor, not the evidence geography) while PASS2 would likely list `CH` (the Swiss legal/political system is directly assessed). This produces a mismatch between `inferredGeography` (from PASS1) and `relevantGeographies` (from PASS2), which propagates to GENERATE_QUERIES, RELEVANCE_CLASSIFICATION, and APPLICABILITY_ASSESSMENT.

**Proposed fix:**  
Add an explicit alignment note in PASS1:

```
Geography inference alignment with Pass 2: When the claim involves a specific country's 
institutional decision-making, legal process, or domestic event, you MAY infer that country 
as `inferredGeography` — even if the actor is named rather than the evidence location. The test 
is: "would most relevant evidence come from within this country's institutions?" If yes, return 
the country code.
```

---

### CAT-5 — Instruction Verbosity and LLM Parsing Risk

#### ISSUE-12 · Severity: **Medium**

**Location:** `CLAIM_EXTRACTION_PASS2` — rules section length and competing instruction density  
**Problem:** The PASS2 rules section spans roughly 70+ separate instructions across 150+ lines. The `CLAIM_CONTRACT_VALIDATION` prompt then repeats many of the same concepts (modifier preservation, no-normative-injection, shared-predicate fidelity) with slightly different framing. Across these two prompts plus the BINDING_APPENDIX, the model receives 3 versions of modifier-preservation instructions and 3 versions of anti-normative-injection instructions.

From the LLM Expert learning `2026-04-10`: "Competing prompt rules are a structural failure, not a wording failure." The extraction and validation prompts are a slow-accumulation version of this same problem — they've grown to cover every edge case, but at the cost of competing instruction density.

This is the most likely source of inter-run variance on complex multilingual inputs: the model is choosing between which version of each rule to apply.

**Proposed fix (strategic, not tactical):**  
Restructure PASS2 into a tiered rule hierarchy with explicit precedence labels:

```
### Rule Tier 1 — Absolute constraints (THESE OVERRIDE EVERYTHING)
1. Input-fidelity: impliedClaim, articleThesis, and claim statements are derivable from input only
2. Wording preservation: truth-condition-bearing modifiers must appear verbatim in the primary direct claim

### Rule Tier 2 — Structural rules (apply after Tier 1)
1. Claim classification (single/ambiguous/multi)
2. Normative injection prohibition
3. Claim count targets

### Rule Tier 3 — Quality guidance (apply after Tier 2)
1. Specificity and atomicity guidance
2. Centrality and check-worthiness assessment
```

This doesn't reduce the number of rules, but it makes the resolution order explicit, reducing the model's need to choose between competing instructions.

---

#### ISSUE-13 · Severity: **Low**

**Location:** `CLAIM_CONTRACT_VALIDATION` — rule 11 (truth-condition-bearing modifier audit) length  
**Problem:** Rule 11 is the longest single rule in the validator prompt at ~250 words. It contains five sub-rules (the anchor tiebreaker, the verbatim-presence guard, the citation requirements, the directness guard, the structural honesty rule) that are logically sequential but presented as flat prose. Models may parse the rule non-sequentially on long contexts.

**Proposed fix:**  
Split into numbered sub-steps:

```
11. Truth-condition-bearing modifier audit (MANDATORY):

  11a. First, determine whether the input contains a modifier whose removal would change what 
       evidence is needed. If none exists, skip to step 12.

  11b. At least one `thesisRelevance: "direct"` claim must preserve the modifier verbatim.
       Claims with `thesisRelevance: "tangential"` or `"irrelevant"` do not qualify.

  11c. Cite the preserving claim's ID and quote the exact text span carrying the modifier.

  11d. If the modifier appears as a literal substring in a thesis-direct claim, that claim 
       MUST be treated as an anchor carrier — do not report it as missing.

  11e. If no thesis-direct claim carries the modifier, set `rePromptRequired: true`. 
       Near-matches do not count.
```

---

### CAT-6 — Phase 7b / Shape B Readiness Gaps

#### ISSUE-14 · Severity: **High** (Phase 7b blocker)

**Location:** `CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX` — `salienceBindingContextJson` variable undefined behavior  
**Problem:** The binding appendix says: "If the precommitted `anchors` array is empty, do not invent replacement anchors. Proceed with the base extraction rules only."

But it does not specify what the model should do when the salience stage *failed* (as opposed to ran and found zero anchors). The `salienceBindingContextJson` in Phase 7b can indicate:
- `mode: "binding"`, `success: true`, `anchors: []` — stage ran, found nothing
- `mode: "binding"`, `success: false`, `error: "..."` — stage failed
- `mode: "audit"` — binding mode not active

The appendix handles case 1 but not case 2. If the salience stage fails, should extraction fall back to base rules? Should it error? Should it force a retry of the salience stage? This is undefined in the prompt.

Per `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md` §5.3: "Persist full salience status contract on every path" is a required slice-1 item.

**Proposed fix:**  
Add explicit failure-mode handling to the binding appendix:

```
Failure-mode handling:
- If `success: false`: the salience stage failed. Proceed with base extraction rules as if 
  binding mode were not active. Do not use the `anchors` field — it may be empty due to 
  failure rather than genuine absence of anchors. Report in your extraction output that 
  salience binding was skipped due to upstream failure.
- If `mode: "audit"`: this appendix does not apply. Ignore it.
- If `success: true` and `anchors: []`: the salience stage ran successfully but found no 
  distinguishing anchors. Proceed with base extraction rules only.
```

---

#### ISSUE-15 · Severity: **Medium** (Phase 7b blocker)

**Location:** `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX` — validator anchor inventory source  
**Problem:** The binding appendix says: "Audit anchor preservation against the provided `anchors` list only. Do not introduce a different anchor that is not present in that list."

But the base validator rules (rules 11-16) still instruct the model to discover its own anchor from the claim text. These instructions run sequentially. The appendix is appended after the main validator section but before the input/output schema. In long context, the model may apply the base rules (discovering its own anchor) and then the binding rules (checking against the provided anchors) and get confused about which anchor to use for `truthConditionAnchor`.

**Proposed fix:**  
Add an explicit override statement at the START of the binding appendix:

```
OVERRIDE NOTICE: When this appendix is loaded, rules 11a-11e of the base validator are 
modified. Do NOT discover a new anchor from the claim text. Use ONLY the precommitted 
anchors provided below as the truth-condition anchor inventory for this validation run.
```

---

### CAT-7 — Minor / Low Priority

#### ISSUE-16 · Severity: **Low**

**Location:** `CLAIM_GROUPING` — trigger condition  
**Problem:** The prompt says it applies "Given a list of 4 or more atomic claims." The task intro includes "4 or more" as a trigger. But the rules section does not repeat this condition, meaning the prompt may still be called for fewer claims and produce confusing output (e.g., every claim in a single group).

**Proposed fix:** Add a pre-condition check:
```
If fewer than 4 claims are provided, return a single group containing all claims and a 
brief rationale noting the claim count is below the grouping threshold.
```

---

#### ISSUE-17 · Severity: **Low**

**Location:** `inverse-claim-verification.prompt.md` — uses `{{CLAIM_A}}` syntax  
**Problem:** This file uses `{{CLAIM_A}}` / `{{CLAIM_B}}` Mustache-style placeholders, while all other prompts use `${variable}` template literal syntax. This is inconsistent and could cause runtime issues if the prompt loader applies the wrong template engine.

**Proposed fix:** Verify the calling code uses the correct template engine for this file, or standardize to `${CLAIM_A}` syntax.

---

#### ISSUE-18 · Severity: **Low**

**Location:** `VERDICT_DIRECTION_REPAIR` — user message is "Classify each evidence item by applicability"  
**Problem:** The `APPLICABILITY_ASSESSMENT` stage uses the user message: "Classify each evidence item by applicability." This is extremely minimal for a task that requires distinguishing between `direct`, `contextual`, and `foreign_reaction` categories — categories with subtle distinctions that benefit from task restatement. On budget models, a minimal user message can result in schema-only completions without meaningful classification reasoning.

**Proposed fix:** Expand the user message:
```
For each evidence item in the evidence pool, classify it as `direct`, `contextual`, or 
`foreign_reaction` based on whether it evaluates the target proceeding/event, provides 
relevant background, or represents a foreign political reaction. Apply the jurisdiction 
rules from the system prompt.
```

---

## Summary Table

| ID | Location | Category | Severity | Phase 7b Blocker? |
|---|---|---|---|---|
| ISSUE-01 | CONTRACT_VALIDATION | Prompt-runtime misalignment | High | Yes (Shape B) |
| ISSUE-02 | SALIENCE vs VALIDATION | Anchor definition drift | Medium | Yes (Shape B) |
| ISSUE-03 | PASS2 | Competing rules | High | No |
| ISSUE-04 | PASS2 | Claim count stability vs. atomicity | Medium | No |
| ISSUE-05 | EXTRACT_EVIDENCE | Asymmetric absolute-claim direction rule | Medium | No |
| ISSUE-06 | claim-extraction-stage.ts | Inline soft-refusal framing | High | No |
| ISSUE-07 | VERDICT_CHALLENGER | Missing-evidence spec schema gap | Medium | No |
| ISSUE-08 | SALIENCE_COMMITMENT | Hallucination guard / negative example | Low | No |
| ISSUE-09 | source-reliability.prompt.md | Relevance flag ambiguity | Medium | No |
| ISSUE-10 | VERDICT_NARRATIVE | Optional field schema inconsistency | Medium | No |
| ISSUE-11 | PASS1 + PASS2 | Geography inference inconsistency | Low | No |
| ISSUE-12 | PASS2 | Rule hierarchy/verbosity | Medium | No |
| ISSUE-13 | CONTRACT_VALIDATION Rule 11 | Long flat rule structure | Low | No |
| ISSUE-14 | PASS2_BINDING_APPENDIX | Failure-mode undefined | High | Yes (Shape B) |
| ISSUE-15 | VALIDATION_BINDING_APPENDIX | Anchor override ambiguity | Medium | Yes (Shape B) |
| ISSUE-16 | CLAIM_GROUPING | Pre-condition missing | Low | No |
| ISSUE-17 | inverse-claim-verification | Template syntax inconsistency | Low | No |
| ISSUE-18 | APPLICABILITY_ASSESSMENT user msg | Minimal user message | Low | No |

---

## Recommended Implementation Order

### Before Phase 7b / Shape B launch (blockers)

1. **ISSUE-14** — define failure-mode behavior in `CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX`
2. **ISSUE-01** — align `CLAIM_CONTRACT_VALIDATION` literal-substring rule with runtime thesis-direct filter
3. **ISSUE-15** — add override notice to `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX`
4. **ISSUE-02** — add salience→validation anchor alignment note to `CLAIM_SALIENCE_COMMITMENT`

### High-value standalone improvements

5. **ISSUE-03** — add explicit rule-resolution flowchart to PASS2 (modifier vs. normative-injection)
6. **ISSUE-06** — move `FACT_CHECK_CONTEXT` and retry guidance text into prompt file (governance hygiene)
7. **ISSUE-12** — restructure PASS2 rules into tiered hierarchy (strategic, do during a quiet window)

### Quality improvements (batch together)

8. ISSUE-05, ISSUE-07, ISSUE-09, ISSUE-10, ISSUE-13 — schema/rule fixes

### Low priority / cleanup

9. ISSUE-04, ISSUE-08, ISSUE-11, ISSUE-16, ISSUE-17, ISSUE-18

---

## Warnings

- **Do not change CLAIM_SALIENCE_COMMITMENT or CLAIM_EXTRACTION_PASS2 before the next E2 measurement batch** (per the Phase 7 working baseline decision: "Keep CLAIM_SALIENCE_COMMITMENT as-is for the next batch. Keep CLAIM_EXTRACTION_PASS2 as-is for the next batch."). The issues documented here are pre-surveyed — implement them AFTER the measurement batch closes.
- ISSUE-01 (the validator/runtime alignment) is the only exception: it can be fixed immediately because it makes the validator honest, not because it changes extraction behavior.

## Learnings

- The PASS2 prompt is now long enough (~2000+ words of rules) that LLM compliance depends heavily on rule ordering and the model's ability to hold the full instruction set in working attention. The tiered hierarchy restructure (ISSUE-12) is the most structural improvement available — plan it for a refactor session.
- Inline soft-refusal framing in TypeScript (ISSUE-06) is a governance anti-pattern that will recur unless the convention is: all LLM-facing text lives in `.prompt.md` files. Consider adding a lint rule or convention note to `AGENTS.md`.
