# Captain Comments — Consolidated Assessment & Remaining Decisions

**Date:** 2026-02-16
**From:** Captain Deputy (Lead Developer) — consolidating Captain comments + External Advisor input
**To:** Lead Architect
**Action:** Address each item in the next architecture doc revision

---

## Captain Comment 1: No Text Parsing in Code

**Captain says:** "No text parsing in code! Most rules still apply also re. genericity."

**Assessment:** Confirmed. AGENTS.md rules carry forward to the new pipeline:
- **LLM Intelligence rule** — no deterministic text-analysis logic making analytical decisions
- **No hardcoded keywords** — generic for any topic
- **String Usage Boundary** — prompt strings in UCM only
- **Multilingual Robustness** — language-agnostic prompts, preserve original language
- **Input Neutrality** — phrasing must not affect analysis

The External Advisor specifically flagged UCM enforcement and multilingual robustness as compliance constraints. These are already in §22.2 and §22.3 of the architecture doc but must be treated as non-negotiable design constraints for every new component.

**Action for Lead Architect:** No architecture doc change needed — rules are already referenced. But every new prompt and processing step must be validated against these rules during implementation.

---

## Captain Comment 2: Audit Rules — Remove or Adapt Before Implementation

**Captain says:** "We should first find rules that should be removed or adapted, then adapt/remove, and later stick to the remaining rules."

**Assessment:** This is a prerequisite task before implementation starts. The current AGENTS.md was written for the AnalysisContext pipeline. With ClaimBoundary replacing AnalysisContext, several rules and references become obsolete or need updating.

**Scope of the audit:**

| Document | What to check |
|----------|--------------|
| `AGENTS.md` | Terminology table (AnalysisContext definition), Architecture section (orchestrated.ts line references), Key Files table |
| `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` | Area-to-document mapping, role reading lists |
| `apps/web/prompts/orchestrated.prompt.md` | Entire file — the new pipeline will have a new prompt file (`claimboundary.prompt.md` per §22.2) |
| `apps/web/configs/` | Calculation and pipeline config schemas — new parameters, removed parameters |
| xWiki terminology page | AnalysisContext → ClaimBoundary (flagged by External Advisor as ADR-level change) |

**Action for Lead Architect:** Add a "Rules Audit" task to the implementation plan as Step 0 (before coding). Deliverable: a diff of AGENTS.md and Multi_Agent_Collaboration_Rules.md showing what changes.

**Captain decision needed:** Who performs this audit? Lead Architect (as part of doc update) or separate task?

---

## Captain Comment 3: Geographic/Temporal Scope — Make More Generic

**Captain says:** "Re pre-defined 'Geographic scope' and 'Temporal scope': we should support this in a more generic way."

**Assessment — this is architecturally significant.** The codebase cross-check reveals the architecture is **very tightly coupled** to four specific EvidenceScope field names:

| Field | Coupling Level | Referenced In |
|-------|---------------|---------------|
| `methodology` | **Critical** — required, dedup key, clustering criteria, congruence rules | §8.2, §8.3, §9.1, §11.3, §11.4, §11.5 |
| `temporal` | **Critical** — required, dedup key, clustering criteria, fallback signal | §8.2, §8.3, §9.1, §11.3, §11.6 |
| `boundaries` | **High** — in dedup key, clustering criteria, congruence rules | §8.2, §8.3, §9.1, §11.3, §11.4 |
| `geographic` | **High** — in dedup key, clustering criteria | §8.2, §8.3, §9.1, §11.3 |

Going generic means replacing these four named fields with a flexible structure. Two options:

### Option A: Named Dimensions (semi-generic)

Keep a typed structure but make dimensions extensible:

```typescript
interface EvidenceScope {
  name: string;
  dimensions: ScopeDimension[];   // LLM produces as many as relevant
  sourceType?: SourceType;
}

interface ScopeDimension {
  aspect: string;        // LLM-chosen: "methodology", "temporal", "geographic", "legal_framework", "sample_population", etc.
  value: string;         // The actual scope data
  isRequired: boolean;   // LLM marks which dimensions are analytically important
}
```

**Pros:** Handles domains where the standard 4 fields don't fit (e.g., a medical study's "sample population" or a legal analysis's "standard of proof"). The LLM decides what dimensions matter, not the schema.
**Cons:** Clustering (§11) becomes harder — the congruence assessment can't use a fixed dedup key. The LLM must compare dimension sets of different sizes and names. More complex Zod validation.

### Option B: Keep Named Fields, Add Extensible Extras

```typescript
interface EvidenceScope {
  name: string;
  methodology: string;              // REQUIRED — always meaningful
  temporal: string;                 // REQUIRED — always meaningful
  boundaries?: string;
  geographic?: string;
  sourceType?: SourceType;
  additionalDimensions?: Record<string, string>;  // LLM can add domain-specific dimensions
}
```

**Pros:** Keeps the current architecture's clustering logic intact. `methodology` + `temporal` remain the primary congruence signals. Additional dimensions enrich the scope without breaking the core algorithm.
**Cons:** Still prescribes 4 named fields as "special." The `additionalDimensions` bag may be ignored by clustering unless the prompt explicitly handles it.

### Deputy Recommendation: Option B for v1, consider Option A for v2.

The clustering algorithm (§11) is the heart of the new pipeline. It currently relies on `methodology + boundaries + geographic + temporal` as a composite key. Making this fully generic in v1 risks destabilizing the most critical innovation.

Option B gives the LLM freedom to add domain-specific dimensions (e.g., `{ "standard_of_proof": "beyond reasonable doubt", "sample_size": "N=12,000" }`) while keeping the core congruence algorithm stable. The congruence prompt can be instructed to "also consider `additionalDimensions` when assessing scope compatibility."

**Captain decision needed:** Option A (fully generic) or Option B (named core + extensible extras)?

---

## Captain Comment 4: Qualitative Field Granularity

**Captain says:** "Consider more fine-grained 4 or 5 levels or even make them 0.0-1.0 — but it depends on what works best for LLMs."

**Assessment — field-by-field based on codebase consumption analysis:**

### What works best for LLMs

| Output Type | LLM Consistency | Calibration Stability | Best For |
|-------------|----------------|----------------------|----------|
| 3 categories (high/medium/low) | **Excellent** — clear semantic boundaries | **High** — stable across calls | Gate decisions (pass/fail), simple weighting |
| 4–5 categories | **Good** — requires well-defined labels | **Moderate** — center categories may drift | Graduated responses where 3 levels lose nuance |
| Continuous 0.0–1.0 | **Fair** — LLMs cluster at .2/.3/.5/.7/.8 | **Low** — varies between calls, models, prompts | Fields directly multiplied in formulas |

**Key insight:** LLMs are classifiers, not regressors. They produce categorical outputs more reliably than numeric ones. Our own pipeline proves this — the Bolsonaro verdict hedging at 50% (Phase 9 investigation) is precisely the "clustering at center" problem that continuous LLM outputs exhibit.

### Field-by-field recommendation

| Field | Current | Recommendation | Rationale |
|-------|---------|---------------|-----------|
| **probativeValue** | 3 levels (high/medium/low) | **Keep 3 levels** | Code uses it as binary gate (low=filter, else keep) + one ratio metric. More levels add complexity without changing the gate logic. The density scoring already works with a simple high-count ratio. |
| **harmPotential** | 3 levels (high/medium/low) | **Expand to 4 levels: critical/high/medium/low** | Current problem: LLM over-inflates to HIGH (7/9 Bolsonaro claims). Adding "critical" above "high" creates space: `critical` = direct death/injury allegation (1.5× weight), `high` = serious but not life-threatening (1.2× weight), `medium` = moderate impact (1.0×), `low` = minimal (1.0×). This reduces inflation pressure on HIGH by giving truly dangerous claims their own tier. |
| **centrality** | 3 levels (high/medium/low) | **Keep 3 levels** | Already maps to 3 distinct weights (3.0/2.0/1.0) used in 6+ code locations. The levels correspond to clear semantic categories (thesis-supporting, important context, peripheral). More levels would require redefining all gap detection thresholds. |
| **groundingQuality** (new) | 3 levels proposed (strong/weak/none) | **4 levels: strong/moderate/weak/none** | This is a Gate 1 input. A 4-level scale distinguishes "claim is fully grounded in preliminary evidence" (strong) from "claim references evidence themes but lacks specifics" (moderate) from "claim has minimal grounding" (weak) from "pure cold extraction" (none). The gate threshold can be set at ≥moderate for pass. |
| **scopeQuality** (new) | 2 levels proposed (complete/incomplete) | **3 levels: complete/partial/incomplete** | Distinguishes "all required fields present and meaningful" (complete) from "methodology+temporal present but vague" (partial) from "missing required fields" (incomplete). Partial items can still be clustered with reduced confidence. |
| **specificityScore** | Continuous 0.0–1.0 | **Keep continuous** — this is a Gate 1 threshold (≥0.6). A numeric score with a configurable threshold is the right design. The LLM is asked to assess on a scale, not classify. |
| **claimDirection** | 3 categories | **See Comment 6 below** |
| **truthPercentage** | Continuous 0–100 | **Keep continuous** — this IS the core verdict output. |
| **confidence** | Continuous 0–100 | **Keep continuous** — this feeds directly into weight formulas. |

### Summary rule

> **Categorical for LLM classification outputs. Continuous for LLM assessment outputs. Never mix — don't ask for "0.73 probativeValue" when you mean "high."**

**Captain decision needed:** Approve field-by-field recommendations above, or override specific fields?

---

## Captain Comment 5: Overall Article Verdict — Meaningful for the Reader

**Captain says:** "How would we get the Overall Article verdict so that it's meaningful for the reader?"

**Assessment:** The current pipeline produces a weighted average truth percentage (0–100) mapped to a 7-point scale (TRUE → FALSE). This is technically correct but not informative for readers because:

1. **A single number hides the structure.** 72% MOSTLY-TRUE could mean "all evidence agrees at 72%" or "half the evidence says TRUE, half says FALSE."
2. **No indication of evidence strength.** The reader doesn't know if this is based on 20 sources or 2.
3. **The boundary perspective is lost.** The whole point of ClaimBoundary is that different methodologies may reach different conclusions.

### Proposed reader-facing verdict structure

The **OverallAssessment** should produce:

```
Overall: MOSTLY TRUE (72%) — Confidence: HIGH (82%)
Based on 14 evidence items from 9 independent sources across 3 analytical perspectives.

Key finding: Evidence consistently shows [thesis summary], though [qualification from
dissenting boundary]. The strongest evidence comes from [dominant boundary methodology].

Per-claim breakdown:
  AC_01: "Specific claim text" — TRUE (85%) — 3 boundaries agree
  AC_02: "Another claim" — MIXED (52%) — boundaries disagree (WTW: TRUE, LCA: FALSE)
  AC_03: "Third claim" — MOSTLY TRUE (68%) — single boundary, moderate evidence
```

The meaningful elements for the reader:
- **Overall verdict + confidence** — the headline answer
- **Evidence base summary** — how much evidence, how many sources, how many perspectives
- **Key finding narrative** — LLM-generated 2–3 sentence synthesis (this is the "so what")
- **Per-claim breakdown** — which claims drive the verdict, where boundaries agree/disagree
- **Boundary disagreement callouts** — the most valuable insight from ClaimBoundary design

### §8.5 change needed

The `narrative` field in `OverallAssessment` should be a structured LLM output, not free-form text. Propose a `verdictNarrative` type:

```typescript
interface VerdictNarrative {
  headline: string;           // "Evidence consistently shows X, though Y"
  evidenceBaseSummary: string; // "14 items, 9 sources, 3 perspectives"
  keyFinding: string;         // Main synthesis
  boundaryDisagreements?: string[]; // Where and why boundaries diverge
  limitations: string;        // What the analysis couldn't determine
}
```

**Action for Lead Architect:** Update §8.5 report assembly and OverallAssessment schema with structured narrative. This is an LLM output (Sonnet tier, single call as part of aggregation).

---

## Captain Comment 6: claimDirection "neutral" — Does It Make Sense?

**Captain says:** "claimDirection neutral: does this make sense? How would it be used?"

**Assessment — based on codebase cross-check: "neutral" is effectively dead code in decision-making.**

Current consumption of `"neutral"`:
- **NOT** counted as supporting or contradicting evidence
- **NOT** protected from deduplication
- **NOT** labeled in LLM verdict prompts (supports gets `[SUPPORTING]`, contradicts gets `[COUNTER-EVIDENCE]`, neutral gets nothing)
- **IS** the default/fallback for missing `claimDirection`
- **IS** counted in telemetry (but only as a bucket)

In the new pipeline where claims drive research, every evidence item should have a clear relationship to the claims it's relevant to. "Neutral" evidence — evidence that neither supports nor contradicts any claim — raises the question: why was it extracted?

### Options

**Option A: Remove "neutral" entirely.** Force every evidence item to be `supports` or `contradicts` relative to its relevant claims. If the LLM can't determine direction, flag for re-assessment rather than defaulting to neutral.

**Option B: Replace "neutral" with "contextual."** Some evidence genuinely provides context without taking a directional stance (e.g., "The study was conducted in 2023" — temporal context, not directional). Rename to make the purpose clear: this is background context, not fence-sitting.

**Option C: Keep "neutral" but define its role.** Neutral = evidence that is relevant to the claim's topic but provides background/context rather than supporting or contradicting. It contributes to the evidence base count but not to the directional verdict.

### Deputy Recommendation: Option B — rename to "contextual"

This makes the semantics clear:
- `supports` — evidence that supports the claim's truth
- `contradicts` — evidence that contradicts the claim's truth
- `contextual` — evidence that provides relevant background without directional stance

The rename also signals to the LLM that this is a specific category ("provide background context"), not a cop-out ("I can't decide").

**Captain decision needed:** A (remove), B (rename to contextual), or C (keep as-is)?

---

## Captain Comment 7: Tag LLM/Search/Ext Calls in Diagrams

**Captain says:** "In any diagram tag LLM calls [LLM] and Web search [Search] and external calls [Ext]."

**Assessment:** Clear documentation requirement. Currently the workflow diagram (§6), collaboration diagram (§7), and LLM budget table (§7.2) exist separately. Tagging call types directly in diagrams makes the pipeline's cost structure visible at a glance.

**Action for Lead Architect:** Update all diagrams (§4.1 pipeline overview, §6 workflow, §7 collaboration, §11.2 clustering algorithm) to tag each step with `[LLM]`, `[Search]`, or `[Ext]` as applicable. Steps that are pure computation get no tag (implicitly deterministic).

---

## Captain Comment 8: State LLM Inputs/Outputs and Search Inputs/Outputs

**Captain says:** "State what shall be LLM inputs (prompts etc.) and outputs and what should be Web-Search inputs and outputs."

**Assessment:** The current architecture doc describes processes ("LLM extracts evidence items") but doesn't systematically document the I/O contracts for each LLM call and search operation.

**Proposed format for each call in §8.1–§8.5:**

```
[LLM] Pass 2: Evidence-Grounded Claim Extraction
  Tier: Sonnet
  Input: { originalText, preliminaryEvidence[], preliminaryEvidenceScopes[], guidance }
  Output: { impliedClaim, backgroundDetails, atomicClaims[], retainedEvidence[] }
  UCM Prompt Key: CLAIM_EXTRACTION_PASS2

[Search] Preliminary Evidence Search
  Input: { impliedClaim, topRoughClaims[2-3], queriesPerClaim: 1-2 }
  Output: { searchResults[], fetchedSources[] }
  Provider: Tavily/Brave (UCM-configured)
```

**Action for Lead Architect:** Add I/O contract blocks for every `[LLM]` and `[Search]` call in §8.1–§8.5. This also satisfies the External Advisor's UCM enforcement requirement — each call's prompt key is documented inline.

---

## Captain Comment 9: Claim Granularity — Don't Force Atomicity

**Captain says:** "Sometimes demanding atomic claim from LLM might be counter productive — if it's difficult to find meaningful fine grain claim, then LLM could look into related evidence and find a meaningful fine grain claim."

**Assessment:** The Captain is identifying a real tension in §8.1. The two-pass extraction partially addresses this (Pass 2 has evidence context), but the architecture still implies a fixed flow: extract claims → then research. The Captain's insight is that claim discovery and evidence discovery should be **co-evolutionary** — evidence can reveal what the right claims are.

### Proposed rule: Evidence-Informed Claim Granularity

> "Claims should be at the granularity where evidence naturally supports or contradicts them. Do not force artificial atomicity. If a compound claim cannot be meaningfully split without losing its verifiable core, keep it compound. If a broad claim can be sharpened by referencing specific evidence patterns discovered during preliminary search, sharpen it. The LLM should use preliminary evidence to determine the RIGHT level of claim specificity, not default to maximum decomposition."

### Implementation in §8.1

The Pass 2 prompt should include this guidance:

> "When extracting claims, consider the evidence landscape from the preliminary search. If the evidence addresses the topic at a particular level of specificity (e.g., 'FCEV well-to-wheel efficiency is 25-35%' rather than 'hydrogen is inefficient'), match your claim specificity to the evidence level. Do not split claims into sub-claims that no evidence directly addresses. A claim that is too atomic to research is worse than a compound claim that evidence naturally engages with."

This also connects to the `specificityScore` and the decomposition retry in Gate 1 — if a claim's specificity is low BUT evidence exists at that level of generality, the claim is fine as-is. Specificity should be assessed relative to the evidence landscape, not in absolute terms.

**Action for Lead Architect:** Update §8.1 Pass 2 guidance and Gate 1 specificity assessment to incorporate evidence-informed granularity. Add the rule to the prompt design.

---

## Captain Comment 10: Key Factors — Go With Recommendation

**Captain says:** "Key Factors decision: go with your recommendation."

**Assessment:** The Lead Architect recommended removal (§10). Key Factors are subsumed by atomic claims in the new pipeline. This is already marked as "Approved as-is (no changes needed)" in the architecture doc header.

**Action for Lead Architect:** No change needed — already handled.

---

## Captain Comment 11: Remaining Decisions

**Captain says:** "List again what else we still need to decide now."

---

## Remaining Decisions for Captain

| # | Decision | Options | Deputy Recommendation | Blocking? |
|---|----------|---------|----------------------|-----------|
| **D4** | **EvidenceScope structure** — generic dimensions or named fields + extras? | A: Fully generic dimensions | **B** — named core + extensible extras for v1 | **Yes** — affects §8.2, §8.3, §9.1, §11 (4 major sections) |
| | | B: Named core fields + `additionalDimensions` | | |
| **D5** | **Qualitative field granularity** — approve field-by-field recommendations? | A: Approve all as proposed above | **A** — field-specific recommendations based on codebase analysis | **Yes** — affects §9.1 schemas and all prompts |
| | | B: Override specific fields (specify which) | | |
| **D6** | **claimDirection "neutral"** — remove, rename, or keep? | A: Remove entirely (force supports/contradicts) | **B** — rename to "contextual" | **No** — minor schema change, but good to decide now |
| | | B: Rename to "contextual" | | |
| | | C: Keep as-is | | |
| **D7** | **Overall verdict narrative** — add structured VerdictNarrative type? | A: Yes — structured narrative with headline, key finding, limitations | **A** — makes the verdict meaningful for readers | **No** — additive, doesn't change existing structures |
| | | B: Keep free-form `narrative: string` | | |
| **D8** | **Rules audit timing** — when and who? | A: Lead Architect does it as part of doc update (before implementation) | **A** — Lead Architect knows the new design best | **Yes** — must happen before implementation |
| | | B: Separate task by a different role | | |
| **D9** | **harmPotential 4-level expansion** — add "critical" tier above "high"? | A: Yes — critical/high/medium/low with separate weight multipliers | **A** — addresses the inflation problem at the schema level | **No** — but improves verdict quality |
| | | B: Keep 3 levels, fix via better prompts only | | |

### Already Decided (no revisiting needed)

| Decision | Choice | When |
|----------|--------|------|
| D1: Claim Quality Gate | A — Merged | This session |
| D2: Self-Consistency Modes | A — Two modes | This session |
| D3: Architecture Doc Update | A — Full update | This session |
| Key Factors removal | Approved | Architecture doc §10 |
| Clean break (no backward compat) | Approved | Captain input §20 |
| LLM debate pattern | Approved | Brainstorming review |
| All 13 v1 features | Approved | Brainstorming review |

---

*Ready for Captain decisions on D4–D9, then Lead Architect can proceed with final doc revision.*
