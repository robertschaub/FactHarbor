# Deterministic Analysis Hotspots Review

**Date:** 2026-04-09  
**Author:** Codex (GPT-5)  
**Status:** Review note / backlog input  
**Purpose:** Record the top 5 remaining deterministic analyzer behaviors that materially influence analytical outcomes, ranked by concern under the repository's `LLM Intelligence` mandate.

---

## Scope

This note does **not** argue that all deterministic logic is bad.

The following remain explicitly acceptable:
- schema validation
- bounds/clamps
- routing/retries/timeouts
- ID cleanup and structural normalization
- persistence / audit trail plumbing
- feature flags and config loading

This note covers only deterministic logic that either:
- makes a meaning-bearing judgment about text, or
- deterministically changes analytical outcomes in places that may merit architectural review.

---

## Ranked Hotspots

| Rank | Area | File | Why it is on the list |
|---|---|---|---|
| 1 | Truth-condition anchor preservation override | `apps/web/src/lib/analyzer/claim-extraction-stage.ts` | Uses deterministic substring/quote checks to decide whether extracted claims preserved the user's truth-condition-bearing modifier and whether a retry must be forced. |
| 2 | Verdict direction plausibility / rescue | `apps/web/src/lib/analyzer/verdict-stage.ts` | Uses deterministic weighted evidence-ratio rules to decide whether an LLM direction-validation failure can be overridden or a verdict is still directionally plausible. |
| 3 | Source-reliability truth weighting | `apps/web/src/lib/analyzer/source-reliability.ts` | Deterministically moves truth/confidence toward neutral based on source-reliability scores. Not text-analysis, but still a substantive verdict-moving mechanism. |
| 4 | Input type routing | `apps/web/src/lib/analyzer/pipeline-utils.ts` | Routes short inputs to `"claim"` and long inputs to `"article"` using a fixed length threshold. Low sophistication, but it still affects analysis flow. |
| 5 | Scope-quality classification | `apps/web/src/lib/analyzer/research-extraction-stage.ts` | Uses deterministic length/regex checks to classify scope quality as `complete` / `partial` / `incomplete`. Lower severity than the items above, but still partly analysis-adjacent. |

---

## 1. Truth-Condition Anchor Preservation Override

**File:** `apps/web/src/lib/analyzer/claim-extraction-stage.ts`  
**Function:** `evaluateClaimContractValidation()`

### What it does

After the contract-validation LLM identifies a truth-condition anchor, the code performs deterministic checks such as:
- whether claim text `.includes(anchorText)`
- whether quoted substrings appear in preserved claims
- whether preserved IDs remain valid after filtering

If these checks fail, the code forces a retry via `anchorOverrideRetry`.

### Why this is problematic

This is the clearest remaining case of deterministic logic making a **semantic preservation judgment**.

The code is not merely checking that a field exists. It is deciding whether the extracted claim set still preserves the input's proposition closely enough to count as valid. That is exactly the type of meaning-bearing decision the repository rules try to keep LLM-led.

### Why it matters

This logic can directly:
- trigger or suppress re-prompting
- change which claim set survives Stage 1
- materially alter downstream verdict behavior on hard families such as Swiss/Bundesrat-style modifier cases

### Recommendation

Treat this as the highest-priority remaining deterministic semantic hotspot.

Preferred direction:
- keep deterministic checks only for structural consistency
- move the preservation judgment itself fully into LLM output / LLM re-checking

---

## 2. Verdict Direction Plausibility / Rescue

**File:** `apps/web/src/lib/analyzer/verdict-stage.ts`  
**Functions:** `isVerdictDirectionPlausible()`, `getDeterministicDirectionIssues()`

### What it does

These functions:
- compute weighted supporting vs contradicting evidence ratios
- compare them against truth-percentage bands
- use deterministic thresholds such as hemisphere checks, mixed-evidence floors, and tolerance zones
- decide whether an LLM direction-validation failure can be rescued or whether a verdict is implausible

### Why this is problematic

This is not just invariant checking.

It is a deterministic **analytical adjudication layer** sitting next to the LLM validator. It decides when the LLM may be ignored, rescued, or overruled based on arithmetic rules over evidence-direction buckets.

### Why it matters

This logic can directly:
- preserve verdicts the LLM flagged as directionally wrong
- downgrade or repair verdicts before Stage 5
- shape claim truth outputs in a way that is not purely structural

### Recommendation

This should be reviewed as the second-highest priority.

Preferred direction:
- preserve structural checks for phantom IDs and invalid bucket references
- move the "is this verdict direction analytically plausible?" judgment into an LLM-led validation or repair contract

---

## 3. Source-Reliability Truth Weighting

**File:** `apps/web/src/lib/analyzer/source-reliability.ts`  
**Function:** `applyEvidenceWeighting()`

### What it does

This code:
- computes average source-reliability weight across cited supporting evidence
- deterministically pulls truth toward neutral via `50 + (truth - 50) * avgWeight`
- deterministically scales confidence downward/upward with the same weight

### Why this is problematic

This is not text-analysis, so it is less clearly non-compliant than items 1 and 2.

But it is still a deterministic **substantive verdict mover**. The code is deciding exactly how source reliability changes truth and confidence, using a fixed mathematical transform.

### Why it matters

This logic can:
- materially alter claim verdicts even when LLM reasoning stays unchanged
- introduce run-to-run instability because cited-evidence selection is itself stochastic
- create a hidden second-order adjudication path that is hard to explain to users

### Recommendation

Architectural review is warranted.

Possible future directions:
- keep SR as contextual input to an LLM verdict/adjudication step
- or constrain SR usage to confidence / warning / audit channels rather than directly transforming truth

---

## 4. Input Type Routing

**File:** `apps/web/src/lib/analyzer/pipeline-utils.ts`  
**Function:** `detectInputType()`

### What it does

It routes:
- short inputs (`< 200` chars) to `"claim"`
- longer inputs to `"article"`

### Why this is problematic

This is a low-severity heuristic, but it still affects analysis flow with a crude deterministic threshold.

Unlike items 1-3, it does not interpret semantics deeply. Still, it assumes length is a reliable proxy for input type, which is not always true.

### Why it matters

Routing can affect:
- which prompts fire
- how the pipeline frames the task
- downstream extraction and adjudication behavior

### Recommendation

Low-priority review item.

This is acceptable for now if it behaves well empirically, but it is a reasonable candidate for eventual LLM-led or richer structural classification.

---

## 5. Scope-Quality Classification

**File:** `apps/web/src/lib/analyzer/research-extraction-stage.ts`  
**Function:** `assessScopeQuality()`

### What it does

It classifies an `EvidenceScope` as:
- `complete`
- `partial`
- `incomplete`

using checks like:
- presence of methodology/temporal fields
- minimum length
- regex-style vague placeholders such as `n/a`, `-`, `...`

### Why this is problematic

Most of this is still structural and therefore acceptable.

The concern is that the final classification is exposed as a quality label that can affect how evidence is interpreted downstream, while some of its criteria still rely on fixed string-pattern assumptions.

### Why it matters

This is lower risk than the first four items, but still worth documenting because:
- it is analysis-adjacent rather than purely infrastructural
- it may age poorly across languages or prompt changes

### Recommendation

Low priority.

Keep it under review, but do not treat it as urgent unless evidence appears that scope-quality labeling is materially distorting results.

---

## Overall Assessment

### Clearly problematic now

1. Truth-condition anchor preservation override  
2. Verdict direction plausibility / rescue

These are the strongest remaining cases where deterministic logic is making meaning-bearing analytical decisions.

### Needs architectural review

3. Source-reliability truth weighting

This may be acceptable as a policy choice, but it is still deterministic substantive adjudication and should not remain implicit.

### Lower-priority cleanup / review

4. Input type routing  
5. Scope-quality classification

These are weaker concerns, but they are still the next-most-relevant deterministic analysis hotspots after the top three.

---

## Recommended Backlog Framing

Recommended backlog item:

**LLMINT-2 — Deterministic analysis hotspot review and migration**

Scope:
- replace or review the five hotspots above under the `LLM Intelligence` mandate
- prioritize Stage 1 anchor preservation and Stage 4 direction rescue first
- treat SR truth weighting as an explicit architectural decision, not background math

Suggested execution order:
1. Stage 1 anchor preservation
2. Stage 4 direction plausibility / rescue
3. SR truth weighting review
4. Input routing
5. Scope-quality review

