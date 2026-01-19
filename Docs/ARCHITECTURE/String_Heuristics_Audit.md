# Audit: String/Regex Heuristics That Drive Pipeline Decisions

**Date:** 2026-01-19  
**Audience:** Maintainers / Lead Dev / Pipeline owners  
**Goal:** Identify where FactHarbor uses simple string/regex matches on *user input* or *claim text* to make downstream decisions, assess brittleness, and propose more robust (generic) alternatives.

---

## 1) Executive summary

FactHarbor currently uses a number of **substring/regex-based detectors** that directly affect:

- **What gets researched** (queries, recency routing, inverse-claim search)
- **What gets classified as “procedural”** (Key Factors generation)
- **How scopes are labeled / canonicalized** (IDs, names, status/date anchoring)
- **Whether claims are treated as tangential** (thesis relevance overrides)
- **Whether verdicts are escalated/overridden** (pseudoscience escalation)

These heuristics are often **good “cheap first passes”**, but when they become *hard gates* (or influence research coverage), they can be:

- **Over-broad** (false positives → wrong branch)
- **Under-broad** (false negatives → missing branch)
- **Format-sensitive** (risking input neutrality)
- **Domain-leaky** (some keyword lists embed domain-specific terms and violate “generic by design”)

**Recommendation:** Convert most of these from “string match ⇒ decision” into:

1) **Normalization-first**: consistent tokenization/normalization for all detectors  
2) **Soft signals** (scores) rather than boolean hard gates  
3) **LLM-structured classification** for the few high-impact decisions  
4) **Explicit confidence + fallback** (fail-open vs fail-closed, depending on risk)

---

## 2) Inventory of decision points (high impact)

### A) Recency detection → date-restricted search routing

- **Where**
  - `apps/web/src/lib/analyzer.ts` → `isRecencySensitive()`
- **Heuristic**
  - Looks for:
    - a year in last ~3 years
    - a list of “recent” keywords (e.g., “today”, “latest”)
    - “news indicator” words (trial, election, investigation, etc.)
- **Decision impact**
  - Influences `recencyMatters` in research decision-making and query execution (date filtering).
- **Why too simple**
  - Words like “trial” or “election” do **not** necessarily imply “recent”; this creates **systematic false positives**.
  - It can also create **format sensitivity** (“today” vs not) even when the claim substance is the same.
- **Proposed improvement**
  - Replace boolean recency detection with a scored signal:
    - \(recencyScore = f(dateMentions, explicitRecencyWords, understanding.distinctEvents)\)
  - Prefer **structured signals from Step 1**:
    - `distinctEvents[]` already exists; add/derive `distinctEvents[].isRecent` + `requiresRecencySearch` at understand stage.
  - Treat “news indicator keywords” as **weak evidence only**, not sufficient by itself.

---

### B) Procedural-topic detection → Key Factors generation

- **Where**
  - `apps/web/src/lib/analyzer.ts` → `detectProceduralTopic()`
- **Heuristic**
  - Boolean decision via:
    - `analysisContexts.length > 0`
    - `legalFrameworks.length > 0`
    - share of subclaims marked legal/procedural
    - a regex keyword list (process/audit/trial/court/…)
- **Decision impact**
  - Turns on “procedural mode” and drives Key Factor generation behavior.
- **Why too simple**
  - “Contains trial/court words” is not a robust indicator that Key Factors are appropriate.
  - Some evaluative questions are procedural even without these keywords; others contain keywords but aren’t procedural.
- **Proposed improvement**
  - Move to Step-1 structured output:
    - Add `analysisIntent` (already exists) + introduce `needsKeyFactors: boolean` + `needsKeyFactorsReason: string`.
  - Use model output + guardrails:
    - e.g., if `analysisContexts.length >= 2` OR `keyFactors.length >= N` → enable; else disable unless model says so with high confidence.
  - Keep regex list only as a fallback heuristic and log it as “weak signal”.

---

### C) Inverse-claim generation → extra contradiction search

- **Where**
  - `apps/web/src/lib/analyzer.ts` → `generateInverseClaimQuery()`
- **Heuristic**
  - Regex attempts to flip “X more Y than Z” and a small adjective/opposite map; otherwise adds “false incorrect evidence against”.
- **Decision impact**
  - Can trigger a separate inverse-claim search path and affect evidence collection.
- **Why too simple**
  - Regex-based swaps can generate **nonsensical** or semantically incorrect inverses.
  - The adjective mapping is incomplete; fallback queries can be low-quality (“false incorrect evidence against”).
- **Proposed improvement**
  - Replace with a structured LLM helper (deterministic, budgeted):
    - Input: main thesis + top 3 subclaims
    - Output: `{ inverseQueries: string[] }` (2–3 max), each with a short rationale.
  - Add a lightweight validator:
    - minimum length, no boilerplate, must include at least one key entity.

---

### D) Tangential-claim detection via keyword patterns → changes thesisRelevance

- **Where**
  - `apps/web/src/lib/analyzer.ts` → `isForeignResponseClaim()` called from thesis relevance invariant enforcement
- **Heuristic**
  - Regex patterns for “in response to”, plus a set of patterns for sanctions/visas/tariffs etc.
- **Decision impact**
  - Overrides `thesisRelevance` (direct → tangential), which changes:
    - research inclusion
    - verdict aggregation (tangentials are excluded)
- **Why too simple**
  - This is a high-impact override, but it is driven by a narrow phrase list and contains domain-specific cues (e.g., “US”).
  - Risks false tangential classification.
- **Proposed improvement**
  - Remove the hard override. Prefer:
    - the LLM-provided `thesisRelevance` from Step 1 (already in schema)
    - an overlap-based “safety bump” only (the existing overlap correction is reasonable)
  - If we keep a heuristic, constrain it to **generic response framing** only:
    - patterns like `in response to`, `retaliation`, `reaction` (no country/entity names).
  - Log any override as a structured event so regressions are visible.

---

### E) Scope type inference → ordering/labeling (domain leakage risk)

- **Where**
  - `apps/web/src/lib/analyzer/config.ts` → `inferScopeTypeLabel()`
- **Heuristic**
  - Regex keywords over scope name/metadata; includes domain-specific tokens (e.g., specific institutions).
- **Decision impact**
  - Affects stable ordering and potentially how scopes are presented/canonicalized.
- **Why too simple / risky**
  - Keyword inference can drift and can violate “generic by design” if it embeds domain-specific institutions.
- **Proposed improvement**
  - Replace with a **generic enum** driven by structured metadata:
    - If `metadata.methodology/boundaries` → `Methodological`
    - If `metadata.institution/court` present → `Institutional` (generic), not “Criminal/Electoral”
    - Else `General`
  - Or add a Step-1 field: `analysisContexts[].type` with a constrained enum and a strict prompt instruction (topic-agnostic).

---

### F) Pseudoscience detection → verdict escalation/override (hard-coded topic list)

- **Where**
  - `apps/web/src/lib/analyzer/pseudoscience.ts` (and a duplicate implementation in `apps/web/src/lib/analyzer.ts`)
- **Heuristic**
  - Large regex lists and “brands” lists; drives:
    - `isPseudoscience` labels
    - forced caps/overrides of verdict
- **Decision impact**
  - Potentially overrides verdict outcomes (very high impact).
- **Why too simple / risky**
  - Hard-coded topic/brand lists violate “generic by design”.
  - Regex matching can misfire in quotes or discussion of pseudoscience (debunking) vs endorsement.
- **Proposed improvement**
  - Convert to a **generic “extraordinary mechanism” classifier**:
    - LLM structured call: `{ isExtraordinaryMechanism: boolean, requiresHighBurden: boolean, rationale: string }`
    - Only enable “escalation” when evidence quality gates indicate strong debunking from reliable sources.
  - Remove brand lists or move them behind a configurable plugin, not core logic.
  - Deduplicate code: keep only `analyzer/pseudoscience.ts` and import it from `analyzer.ts`.

---

### G) Claim-position detection for UI highlights

- **Where**
  - `apps/web/src/lib/analyzer.ts` → `findClaimPosition()`
- **Heuristic**
  - `indexOf` on lowercase normalized text.
- **Decision impact**
  - UI highlighting; not analysis correctness, but affects UX/debuggability.
- **Why too simple**
  - Minor edits, punctuation differences, or normalization can break matches.
- **Proposed improvement**
  - Implement token-based fuzzy search:
    - normalize (whitespace/punctuation), then find best window by token overlap
  - Keep exact match fast path for performance.

---

## 3) Cross-cutting recommendation: “HeuristicDecision” pattern

For any high-impact branch driven by string search, prefer:

- **Return shape**:
  - `{ decision: boolean, confidence: 0..1, signals: {...}, reason: string }`
- **Rules**
  - Never hard-filter on low-confidence heuristics.
  - Prefer “fail-open” for coverage decisions (research) and “fail-closed” for safety decisions (provenance).

---

## 4) Next steps (implementation plan)

1) **Deduplicate + centralize heuristic helpers**
   - One normalization helper used by recency/procedural/comparative/position matching.
2) **Move high-impact decisions into Step-1 structured output**
   - `needsKeyFactors`, `requiresRecencySearch`, `inverseQueries[]`
3) **Replace domain-leaky keyword lists**
   - Remove institution-specific tokens from `inferScopeTypeLabel`
   - Replace pseudoscience topic lists with generic “extraordinary mechanism” logic + evidence gating

