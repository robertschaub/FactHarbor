# ClaimBoundary Pipeline — Brainstorming Ideas

**Date:** 2026-02-16
**Author:** Claude Opus 4.6 (Lead Architect)
**Status:** BRAINSTORMING — For Lead Developer review and discussion
**Context:** Ideas generated during architecture discussion with the Captain. These are proposals, not decisions. Some may be incorporated into the ClaimBoundary architecture, some deferred to v2, some dropped.
**Parent document:** `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md`

---

## Already Decided (for reference)

These items are confirmed and will be integrated into the architecture:

| Item | Status | Description |
|------|--------|-------------|
| ClaimBoundary replaces AnalysisContext | **Confirmed** | Boundaries emerge from EvidenceScope clustering, not pre-created |
| Two-pass evidence-grounded claim extraction | **Confirmed** | Quick scan → preliminary search → grounded re-extraction |
| Mandatory EvidenceScope | **Confirmed** | `methodology` + `temporal` required on all evidence items |
| Congruence-focused clustering | **Confirmed** | Merge-vs-separate based on scope congruence, not count targets |
| Key Factors removed | **Confirmed** | Atomic claims subsume their function |
| Clean break (no backward compatibility) | **Confirmed** | Fresh databases except source-reliability |
| LLM debate/exchange pattern | **Confirmed** | To be designed at 2-3 critical pipeline points |
| Monolithic report separate | **Confirmed** | Monolithic report remains a separate view, not used by new orchestrated pipeline |

---

## Idea A: Evidence Relationship Graph

### Concept

Currently, evidence is a flat list of items. But evidence items have relationships with each other that we're ignoring:

- **Evidence A** says "efficiency is 40%"
- **Evidence B** says "efficiency is 40% but only under conditions Y" — B *qualifies* A, it doesn't contradict it
- **Evidence C** cites Evidence A's underlying study — C is not independent from A
- **Evidence D** is a meta-analysis that synthesizes A, B, and C — D supersedes the others

### Proposed Relationship Types

| Relationship | Meaning | Example |
|-------------|---------|---------|
| `supports` | Independently confirms | Two separate WTW studies reaching similar conclusions |
| `contradicts` | Independently disagrees | WTW study vs TTW study with different results |
| `qualifies` | Adds conditions/caveats | "True, but only under European grid mix" |
| `depends_on` | Cites or derives from | Meta-analysis depending on underlying studies |
| `supersedes` | More recent/comprehensive version | 2025 study updating 2020 findings |

### What It Enables

1. **Better contradiction detection:** Distinguish real contradictions from qualifications
2. **Independence scoring:** 3 studies citing the same dataset = 1 independent source, not 3
3. **Richer ClaimBoundary clustering:** Graph community detection rather than flat scope comparison
4. **Evidence weighting:** Independent evidence gets full weight; dependent evidence is de-weighted
5. **Audit trail:** "Why did the verdict change?" — because the superseding study shifted the balance

### Implementation Sketch

- After all evidence is gathered (end of Stage 2), one LLM call (Sonnet) assesses pairwise relationships for evidence items relevant to the same claim
- Output: adjacency list of relationships
- Relationships feed into clustering (Stage 3) and verdict generation (Stage 4)

### Cost & Complexity

- **LLM cost:** 1 Sonnet call (batch all relationships in one prompt)
- **Implementation complexity:** HIGH — graph data structure, relationship extraction prompt, integration with clustering and verdict stages
- **Risk:** LLM may produce noisy/inconsistent relationships; needs validation

### Lead Architect Assessment

High value but high effort. The independence scoring alone would significantly improve verdict quality (currently, 5 evidence items from 5 articles all citing the same UN report are treated as 5 independent pieces of evidence). However, the graph adds structural complexity that could delay v1.

**Recommendation:** Defer to v2. For v1, implement a simpler version: during evidence extraction, ask the LLM to flag `isDerivative: boolean` and `originalSourceId?: string` for each item. This captures the most valuable relationship (dependency) without full graph complexity.

---

## Idea B: Adversarial Challenge Round

### Concept

Different from contradiction search (which looks for existing contrary evidence online). This is an explicit devil's advocate step: after evidence is gathered and a preliminary verdict direction is emerging, ask an LLM to argue the strongest possible case *against* the emerging verdict.

### Prompt Design Sketch

```
You are a critical analyst. The evidence gathered so far suggests this claim is
MOSTLY TRUE at approximately 74%.

Your job: argue the strongest possible case for why this verdict could be WRONG.

1. What assumptions does the current evidence rely on?
2. What evidence would we expect to find if the claim were actually FALSE?
3. Did the research find such evidence, or did it fail to look?
4. Are there methodological weaknesses in the supporting evidence?
5. Is the evidence base truly independent, or does it share common sources?

Be specific. Cite evidence items by ID where relevant.
```

### What It Enables

1. **Catches blind spots:** Contradiction search only finds what exists online. The adversarial round catches reasoning gaps.
2. **Identifies missing evidence:** "We should have found studies about X if the claim were true, but we didn't" is a strong signal.
3. **Stress-tests the reasoning chain:** Not just "is there contrary evidence?" but "is the supporting reasoning actually sound?"
4. **Natural fit for LLM debate pattern:** One LLM builds the case, another attacks it. The reconciliation becomes the verdict.

### Integration with LLM Debate Pattern

```
Round 1 (parallel):
  LLM-A (Advocate):  "Here's the verdict based on evidence: 74% MOSTLY-TRUE"
  LLM-B (Challenger): "Here's why that verdict could be wrong: [challenges]"

Round 2:
  LLM-A (Reconciliation): "Considering the challenges, here's the revised verdict
    with explicit responses to each challenge point"
```

### Cost & Complexity

- **LLM cost:** 1 Sonnet call (the challenge) + 1 Sonnet call (reconciliation). Could be combined into the verdict debate.
- **Implementation complexity:** LOW — it's just an additional prompt in the verdict stage
- **Risk:** The adversarial LLM might produce weak challenges or hallucinate weaknesses that don't exist. Mitigated by requiring it to cite specific evidence items.

### Lead Architect Assessment

High value, low effort. This naturally integrates with the already-confirmed LLM debate pattern. The adversarial role gives the "second LLM" a concrete job rather than just "also generate verdicts."

**Recommendation:** Include in v1 as part of the LLM debate at the verdict stage. The challenger LLM's output becomes an input to the final verdict.

---

## Idea C: Source Triangulation Scoring

### Concept

Evidence is stronger when multiple *independent* sources using *different methodologies* reach the same conclusion. This is the scientific principle of triangulation. The ClaimBoundary structure already captures methodological differences — triangulation scoring leverages this for free.

### Scoring Model

After ClaimBoundary clustering:

| Triangulation Level | Condition | Confidence Boost |
|---------------------|-----------|-----------------|
| **Strong** | ≥3 boundaries pointing same direction | +15% confidence |
| **Moderate** | 2 boundaries agreeing, 1 dissenting | +5% confidence |
| **Weak** | All evidence from 1 boundary only | -10% confidence |
| **Conflicted** | Boundaries evenly split on direction | Flag as contested |

### What It Enables

1. **Methodological diversity as a quality signal:** "3 WTW studies agree" is weaker than "1 WTW + 1 TTW + 1 LCA study agree"
2. **Cheap confidence calibration:** No LLM call needed — computed from boundary structure
3. **Honest uncertainty reporting:** Single-methodology evidence bases are flagged, not silently accepted
4. **Natural integration with multi-perspective verdict:** Triangulation score explains *why* multi-boundary agreement matters

### Implementation Sketch

```typescript
function computeTriangulation(boundaries: ClaimBoundary[], claim: AtomicClaim): TriangulationScore {
  const relevantBoundaries = boundaries.filter(b =>
    b.evidenceItems.some(e => e.relevantClaimIds.includes(claim.id))
  );
  const directions = relevantBoundaries.map(b =>
    dominantDirection(b.evidenceItems, claim.id)  // "supports" | "contradicts" | "mixed"
  );

  const supporting = directions.filter(d => d === "supports").length;
  const contradicting = directions.filter(d => d === "contradicts").length;

  return {
    boundaryCount: relevantBoundaries.length,
    supporting,
    contradicting,
    level: classifyTriangulation(supporting, contradicting, relevantBoundaries.length),
    confidenceAdjustment: computeAdjustment(...)
  };
}
```

### Cost & Complexity

- **LLM cost:** ZERO — purely computed from boundary structure
- **Implementation complexity:** LOW — ~50 lines of deterministic logic
- **Risk:** Minimal. Worst case it's a no-op for single-boundary analyses.

### Lead Architect Assessment

High value, near-zero effort. This should absolutely be in v1. It's the quantitative payoff of the ClaimBoundary design — proving that boundary structure isn't just organizational, it's analytically valuable.

**Recommendation:** Include in v1. Integrate as an input to the aggregation formula (§8.5).

---

## Idea D: Multi-Perspective Verdict (Boundary-Specific Verdicts)

### Concept

Instead of one overall verdict with narrative boundary mentions, produce **boundary-specific verdicts** as first-class analytical outputs. Each ClaimBoundary becomes an analytical lens with its own truth assessment.

### Example Output

For "Hydrogen fuel cell vehicles are less efficient than battery electric vehicles":

```
Claim: "FCEV well-to-wheel efficiency is lower than BEV"

  Perspective 1 — Well-to-Wheel Studies (CB_WTW):
    Verdict: MOSTLY TRUE (76%)
    Confidence: HIGH (85%)
    Evidence: 8 items from 5 independent sources
    Key finding: WTW efficiency FCEV 25-35% vs BEV 70-80%

  Perspective 2 — Tank-to-Wheel Direct Tests (CB_TTW):
    Verdict: TRUE (88%)
    Confidence: HIGH (90%)
    Evidence: 5 items from 3 independent sources
    Key finding: Direct conversion efficiency gap confirmed by dynamometer tests

  Perspective 3 — Grid-Dependent Lifecycle (CB_GRID):
    Verdict: MIXED (52%)
    Confidence: MEDIUM (65%)
    Evidence: 6 items from 4 independent sources
    Key finding: Depends heavily on grid carbon intensity and H2 production method

  Overall (weighted by triangulation + confidence):
    Verdict: MOSTLY TRUE (72%)
    Confidence: HIGH (80%)
    Triangulation: STRONG (3 boundary agreement)
```

### What It Enables

1. **Analytical honesty:** "It depends on how you measure it" is often the truthful answer. Multi-perspective verdicts express this without hedging into MIXED/UNVERIFIED.
2. **User empowerment:** The user can see *why* the overall verdict is what it is and form their own view.
3. **Natural monolithic/detailed split:** Monolithic view = overall verdict. Detailed view = boundary-specific perspectives. Same pipeline, two presentation levels.
4. **Claim-to-boundary matrix:** Each claim gets assessed through each relevant boundary, producing a rich analytical grid.

### Impact on Pipeline Architecture

- **Stage 4 (Verdict):** Instead of one verdict per claim, produce one verdict per claim per relevant boundary, plus a weighted overall.
- **Stage 5 (Aggregate):** Aggregation now has two levels — within-boundary and cross-boundary.
- **Report structure:** Richer, more informative. The "perspective" tabs replace the old "context" tabs with genuine analytical value.

### Relationship to Current Design

The current architecture (§8.4) has `boundaryFindings[]` as narrative summaries within a single verdict. This idea promotes `boundaryFindings` from narrative summaries to full verdicts with their own truth percentage and confidence.

### Cost & Complexity

- **LLM cost:** Moderate increase — the verdict prompt asks for per-boundary assessments in addition to overall. Could be done in a single structured prompt.
- **Implementation complexity:** MEDIUM — changes verdict schema, aggregation logic, and report assembly.
- **Risk:** Over-fragmentation for simple topics. Single-boundary analyses should collapse to a simple single verdict without displaying "Perspective 1 of 1."

### Lead Architect Assessment

This is the most architecturally significant idea. It transforms ClaimBoundaries from evidence organizers into analytical lenses. It also solves the Captain's request to keep monolithic report as a separate view — the monolithic view is simply the overall weighted verdict without the per-boundary breakdown.

**Recommendation:** Include in v1 as a core feature. This is what makes the ClaimBoundary architecture genuinely better than AnalysisContext — it's not just fixing context explosion, it's producing richer analysis.

---

## Idea E: LLM Self-Consistency Check

### Concept

Run the verdict prompt 3 times with temperature > 0 (in parallel). Measure the spread. If the LLM produces 72%, 48%, and 67% for the same claim with the same evidence, that's a 24pp spread — the verdict is inherently unstable and should be flagged as lower confidence.

### Scoring Model

| Spread (max - min) | Assessment | Action |
|--------------------|------------|--------|
| ≤ 5pp | Highly stable | Full confidence |
| 6-12pp | Moderately stable | Slight confidence reduction |
| 13-20pp | Unstable | Significant confidence reduction |
| > 20pp | Highly unstable | Flag as UNVERIFIED regardless of average |

### What It Enables

1. **Cheap instability detection:** Catches the ±15pp Bolsonaro oscillation problem at the source
2. **Evidence vs ambiguity distinction:** "MIXED because evidence on both sides" (stable) vs "MIXED because the LLM is guessing" (unstable)
3. **Could replace or supplement Gate 4:** Self-consistency is a more direct measure of verdict reliability than the current evidence-counting heuristics

### Implementation Sketch

```typescript
async function selfConsistencyCheck(
  prompt: string,
  claims: AtomicClaim[],
  evidence: EvidenceItem[]
): Promise<ConsistencyResult[]> {
  // Run 3 parallel verdict calls with temperature 0.3
  const [v1, v2, v3] = await Promise.all([
    generateVerdicts(prompt, claims, evidence, { temperature: 0.3 }),
    generateVerdicts(prompt, claims, evidence, { temperature: 0.3 }),
    generateVerdicts(prompt, claims, evidence, { temperature: 0.3 }),
  ]);

  return claims.map(claim => {
    const percentages = [v1, v2, v3].map(v => v.find(c => c.claimId === claim.id)?.truthPercentage ?? 50);
    const spread = Math.max(...percentages) - Math.min(...percentages);
    const average = percentages.reduce((a, b) => a + b, 0) / 3;
    return { claimId: claim.id, average, spread, stable: spread <= 12 };
  });
}
```

### Cost & Complexity

- **LLM cost:** 2 extra Haiku-tier calls (run in parallel, so no latency increase). Very cheap.
- **Implementation complexity:** LOW — ~30 lines + integration with confidence scoring
- **Risk:** Temperature sampling introduces noise by design. The spread might reflect prompt sensitivity rather than genuine ambiguity. Mitigated by using moderate temperature (0.3, not 1.0).

### Lead Architect Assessment

Cheap insurance against the instability problem that plagued the old pipeline. The Bolsonaro ±15pp oscillation would be caught immediately. Self-consistency is arguably a better confidence metric than Gate 4's evidence-counting heuristics.

**Recommendation:** Include in v1. Run in parallel with the primary verdict call, so zero latency impact. Use as a confidence modifier alongside (not replacing) Gate 4.

---

## Summary: Lead Architect Recommendations

| Idea | v1? | Rationale |
|------|-----|-----------|
| **A: Evidence Graph** | Defer to v2 | High value but high complexity. For v1: add `isDerivative` flag only. |
| **B: Adversarial Challenge** | **v1** | Natural fit for LLM debate. Low effort, high reasoning quality. |
| **C: Triangulation Scoring** | **v1** | Zero LLM cost. Leverages boundary structure. Quantitative payoff of ClaimBoundary design. |
| **D: Multi-Perspective Verdict** | **v1** | Core feature. Makes ClaimBoundaries analytically valuable, not just organizational. Solves monolithic/detailed view split. |
| **E: Self-Consistency Check** | **v1** | Cheap instability insurance. Catches ±15pp oscillation. Run in parallel. |

---

## Open Questions for Discussion

1. **Idea B + D integration:** Should the adversarial challenge run once per overall verdict, or once per boundary-specific verdict? Per-boundary is more thorough but more expensive.

2. **Idea C thresholds:** The triangulation confidence adjustments (+15%, -10%, etc.) are arbitrary starting points. Should these be UCM-configurable?

3. **Idea D: Single-boundary display.** When there's only 1 boundary, should the UI show "Perspective 1 of 1" or suppress the boundary layer entirely? Suppressing is cleaner but the user might wonder where the boundary analysis went.

4. **Idea E: Temperature value.** 0.3 is a moderate starting point. Too low = spread is always small (doesn't catch instability). Too high = spread is always large (everything looks unstable). Should this be UCM-tunable?

5. **Combined cost estimate:** Ideas B + C + D + E together add approximately 3-4 extra LLM calls per analysis (1 adversarial + 0 triangulation + 0-1 boundary verdicts + 2 self-consistency). At current pricing, roughly +$0.50-1.00/run. Acceptable?

---

*Brainstorming document complete. Ready for Lead Developer review and discussion.*

---

## §6 — Lead Developer Implementation Assessment

**Date:** 2026-02-16
**Role:** Lead Developer
**Agent/Tool:** Claude Code (Opus 4.6)
**Inputs reviewed:** Brainstorming Ideas A–E, Architecture §8/§9/§11, Role_Learnings.md, codebase cross-check (types.ts, orchestrated.ts, aggregation.ts, config.ts, Entities.cs)

---

### Codebase Cross-Check Summary

Before assessing each idea, I mapped the current codebase to identify integration points and blockers:

| Area | Current State | Implication |
|------|--------------|-------------|
| Evidence relationships | Zero cross-referencing fields on `EvidenceItem`. No `isDerivative`, no `parentEvidenceId`. | Idea A's v1 flag is a clean addition — no legacy to untangle. |
| Verdict generation | Single LLM call per path. 3 separate code paths (multi-context, single-context, claim). No debate pattern. | **New pipeline collapses to 1 path** (§8.4). Ideas B/D/E should be designed for the single new path, NOT retrofitted onto the 3 old paths. |
| Aggregation weights | `calculateWeightedVerdictAverage()` accepts `AggregationWeights` from UCM CalcConfig. Multiplicative chain: `centrality × harm × (confidence/100) × contestation`. | Triangulation score (Idea C) plugs directly into this chain as another multiplier. Clean integration. |
| Temperature | Verdict temp is hardcoded 0.3. `getDeterministicTemperature()` helper flips to 0 in deterministic mode. `understandTemperature` is the only UCM-configurable temp. | Idea E needs configurable verdict temperature AND a policy for deterministic mode (see below). |
| API response | `ResultJson` stores any JSON. Current `analysisContextAnswers[]` already provides per-context verdicts with truth % + confidence. | Per-boundary verdicts (Idea D) follow the same pattern — the API layer is flexible. |

---

### Idea-by-Idea Assessment

#### Idea A: Evidence Relationship Graph → **AGREE: Defer to v2. Include `isDerivative` flag in v1.**

**Feasibility:** The v1 flag (`isDerivative: boolean`, `derivedFromSourceUrl?: string`) is trivial to implement — two fields on `EvidenceItem`, one prompt addition to the extraction step (§8.2 step 7). Zero structural complexity.

The full graph (v2) is genuinely high-effort: pairwise relationship extraction, graph data structure, community detection integration with §11 clustering, and noisy LLM relationship outputs that need validation. The Lead Architect's cost assessment is accurate.

**v1 implementation detail:** Use `derivedFromSourceUrl` rather than `originalSourceId` — during extraction, the LLM can identify "this evidence cites the same underlying study as evidence from [source URL]" more reliably than matching against internal evidence IDs it hasn't seen yet. The ID-based linking can come in v2 when we have the full relationship graph.

**Integration concern:** The `isDerivative` flag must feed into aggregation — derivative evidence should get reduced weight (e.g., 0.5×). Without this downstream effect, the flag is just metadata with no analytical impact. Add `derivativeMultiplier` to `AggregationWeights` in CalcConfig.

**Testing:** Unit-testable: mock evidence items with `isDerivative` flag, verify weight reduction in aggregation. Prompt quality (does the LLM correctly identify derivatives?) requires manual spot-checks on real runs.

**Verdict: v1 with `isDerivative` + weight reduction. Agree with Lead Architect.**

---

#### Idea B: Adversarial Challenge Round → **AGREE: v1. Design as integral part of §8.4, not bolt-on.**

**Feasibility:** LOW implementation complexity — confirmed. The new pipeline has a single verdict path (§8.4), so the debate pattern is added once. Current codebase has no debate pattern to extend, which is actually good — clean-sheet design.

**Proposed §8.4 revision:**

```
Step 1: Advocate verdict (Sonnet) — generate initial verdicts for all claims
Step 2: Challenger (Sonnet, parallel) — argue against emerging verdicts, cite evidence by ID
Step 3: Reconciliation (Sonnet) — produce final verdicts incorporating challenge points
```

Steps 1 and 2 can run in parallel (challenger receives advocate output, but both can be kicked off once evidence is organized — the advocate generates verdicts while the challenger gets primed with the evidence set).

Actually, correction: step 2 needs step 1's output (the emerging verdict direction). So it's sequential: 1 → 2 → 3. Three Sonnet calls total for the verdict stage.

**Integration concern — prompt design is critical:** The challenger prompt in the brainstorming doc (lines 86–98) is solid, but needs one addition: **the challenger must assess evidence coverage**, not just evidence interpretation. "Did the research LOOK for disconfirming evidence?" is distinct from "Does the evidence support the verdict?" The former catches research gaps; the latter catches reasoning gaps.

**Testing strategy:**
- **Structural test (deterministic):** Mock the three-call sequence, verify the reconciliation output schema matches `ClaimVerdict[]`.
- **Quality test (integration, expensive):** Run a known-biased topic, verify the challenger produces substantive challenges (not empty agreement). This is manual/spot-check — you can't unit-test LLM reasoning quality.

**Cost revision:** 2 additional Sonnet calls (challenger + reconciliation). At ~$0.15/call for Sonnet, that's ~$0.30/run. Acceptable.

**Verdict: v1. Agree with Lead Architect. Design into §8.4 as steps, not afterthought.**

---

#### Idea C: Source Triangulation Scoring → **STRONGLY AGREE: v1. Highest value-to-effort ratio of all ideas.**

**Feasibility:** ~50 lines of deterministic code. The `calculateWeightedVerdictAverage()` function in aggregation.ts already uses a multiplicative weight chain. Triangulation score becomes another factor:

```typescript
baseWeight = centrality × harm × (confidence/100) × contestation × triangulationFactor
```

Where `triangulationFactor` is computed from boundary agreement (the brainstorming doc's implementation sketch at lines 160–178 is directly usable).

**Implementation detail:** The function needs `ClaimBoundary[]` as input (to count how many boundaries have evidence for each claim and whether they agree). Currently `calculateWeightedVerdictAverage()` only receives flat claim arrays. Two options:
1. Pre-compute `triangulationFactor` per claim and pass it as a field on the claim object (simpler — no signature change).
2. Pass `ClaimBoundary[]` as an additional parameter (cleaner — keeps computation in aggregation.ts).

**Recommendation:** Option 1. Compute triangulation per claim in §8.5 before calling `calculateWeightedVerdictAverage()`, attach as `claim.triangulationFactor`. This preserves aggregation.ts's context-agnostic design (which the Senior Developer confirmed is cleanly decoupled).

**Integration concern — threshold calibration:** The proposed adjustments (+15%, -10%, etc.) are starting points. These MUST be UCM-configurable from day one (see Open Question 2 answer). Hard-coding confidence adjustments is exactly the kind of thing that needs tuning after real runs.

**Testing:** Fully deterministic → excellent testability. Unit tests with mock boundary structures covering all 4 triangulation levels. This is the most testable idea in the document.

**Verdict: v1. Strongly agree. Implement early — it validates the ClaimBoundary design's analytical value.**

---

#### Idea D: Multi-Perspective Verdict → **AGREE for v1, but with SCOPE REDUCTION.**

**Feasibility:** MEDIUM complexity — the Lead Architect's assessment is accurate. But I want to flag the interaction effects.

**What Idea D changes in the pipeline:**
1. **§8.4 (Verdict):** The verdict prompt now asks for per-boundary truth% + confidence + reasoning, not just narrative `boundaryFindings` summaries. Schema change from `BoundaryFinding.summary: string` to `BoundaryFinding.truthPercentage: number, confidence: number, reasoning: string`.
2. **§8.5 (Aggregate):** Two-level aggregation — within-boundary verdicts feed into per-claim overall verdicts, which feed into overall assessment. `calculateWeightedVerdictAverage()` needs to be called twice: once per boundary (producing per-boundary claim verdicts) and once across boundaries (producing overall claim verdicts).
3. **API response:** New `perBoundaryVerdicts[]` field analogous to current `analysisContextAnswers[]`. The API layer (ResultJson is free-form JSON) handles this without schema migration.

**Scope reduction for v1:** The brainstorming example (lines 206–230) shows per-boundary verdicts with full evidence counts, key findings, and confidence. For v1, I recommend:
- **Include:** Per-boundary `truthPercentage`, `confidence`, `evidenceDirection`, `evidenceCount`
- **Defer:** Per-boundary `reasoning` (narrative text per boundary per claim). This multiplies the LLM output by `boundaries × claims` and significantly increases verdict prompt complexity.

The quantitative signals (truth%, confidence, direction) provide the analytical value. The narratives can come in v2 when we've validated the structure works.

**Interaction with Idea B (Adversarial):** If we have per-boundary verdicts, should the challenger challenge per-boundary or overall? The adversarial challenge should see the per-boundary breakdown (it's useful context for identifying where reasoning is weak), but the challenge itself should target the OVERALL verdict synthesis. Per-boundary challenges are v2.

**Testing:**
- **Schema test (deterministic):** Verify per-boundary verdict structure validates against `BoundaryFinding` schema.
- **Aggregation test (deterministic):** Unit test two-level aggregation: mock per-boundary verdicts → verify overall verdict computation.
- **Single-boundary collapse test:** Verify that when `boundaries.length === 1`, the output collapses to a simple single verdict without "Perspective 1 of 1" framing.

**Verdict: v1 with reduced scope (quantitative per-boundary signals, not full narratives). Agree with Lead Architect on importance.**

---

#### Idea E: LLM Self-Consistency Check → **CONDITIONAL AGREE: v1, but needs design clarification.**

**Feasibility:** LOW implementation complexity for the basic version — confirmed. Run verdict prompt 3× with temp>0, compute spread. ~30 lines + integration.

**Critical design questions the brainstorming doc doesn't address:**

1. **What gets re-run?** With Idea B (adversarial debate), the verdict stage is now 3 calls (advocate → challenger → reconciliation). Running the ENTIRE debate 3× means 9 Sonnet calls. Running only the final reconciliation 3× is cheaper but less meaningful (same challenger input). **My recommendation:** Run only the advocate call (step 1) 3×. The spread of the initial assessment is what matters — if the LLM can't even agree with itself on the first pass, the debate won't stabilize it.

2. **Deterministic mode conflict:** `getDeterministicTemperature()` returns 0 in deterministic mode. Self-consistency at temp=0 always produces spread=0. **Policy:** In deterministic mode, skip self-consistency entirely and return `{ stable: true, spread: 0, assessed: false }`. The `assessed: false` flag lets downstream code distinguish "stable because measured" from "stable because not tested."

3. **Tier selection:** The brainstorming doc suggests "Haiku-tier calls." But the verdict prompt is complex (evidence organized by boundary, per-claim assessment, structured output). Haiku may produce lower-quality verdicts that inflate the spread artificially — measuring Haiku's comprehension limits, not genuine verdict instability. **My recommendation:** Use the same model tier as the primary verdict (Sonnet). The extra $0.30 (2 additional Sonnet calls) is worth getting a meaningful spread measurement.

**Integration concern — what happens with the spread?** The brainstorming doc proposes a confidence modifier. This is correct: the spread should reduce confidence, not change the truth percentage. A 24pp spread at 72% truth → keep 72% truth but reduce confidence from (say) 78% to ~55%.

The mapping (spread → confidence reduction) must be UCM-configurable. The proposed thresholds (≤5pp full, 6-12pp slight, 13-20pp significant, >20pp flag UNVERIFIED) are reasonable starting points.

**Testing:**
- **Deterministic mode test:** Verify self-consistency is skipped and returns `assessed: false`.
- **Spread computation test (deterministic):** Mock 3 verdict sets with known spreads, verify classification.
- **Integration test (expensive):** Run actual self-consistency on a known-stable topic (empirical fact) and a known-unstable topic (contested political claim). Verify the spread correlates with topic type.

**Verdict: v1, but only the advocate call (not full debate) gets re-run. Same model tier. Skip in deterministic mode.**

---

### Open Questions — Answers

#### Q1: Should adversarial challenge run per-overall or per-boundary verdict?

**Answer: Per-overall in v1.**

The challenger receives the per-boundary breakdown as INPUT context (so it can identify where reasoning is weakest), but produces a single challenge document targeting the overall verdict synthesis. This keeps the cost at 1 challenger call per analysis, not `O(boundaries)`.

Per-boundary challenges (where the challenger attacks each boundary's methodology and evidence interpretation separately) are a v2 enhancement that pairs well with the full Evidence Relationship Graph (Idea A v2).

#### Q2: Should triangulation thresholds be UCM-configurable?

**Answer: Yes, mandatory.**

Per AGENTS.md: "Default to UCM. If a parameter influences analysis output and you're unsure where it belongs — make it UCM-configurable." Triangulation adjustments directly modify confidence, which affects the final verdict. These belong in CalcConfig alongside existing aggregation weights.

Proposed UCM shape:
```json
{
  "triangulation": {
    "strongAgreementBoost": 0.15,
    "moderateAgreementBoost": 0.05,
    "singleBoundaryPenalty": -0.10,
    "conflictedFlag": true
  }
}
```

#### Q3: Single-boundary display — show "Perspective 1 of 1" or suppress?

**Answer: Suppress the boundary framing. Show boundary metadata inline.**

When `boundaries.length === 1`, the UI should NOT display "Perspective 1 of 1" or any multi-boundary chrome. Instead, show the boundary's scope metadata (methodology, temporal, geographic) as contextual information beneath the verdict — something like:

> **Evidence base:** Well-to-wheel analyses, 2019–2024, primarily European data

This gives the user scope context without implying there are multiple perspectives they're not seeing. The code should detect single-boundary and render a different (simpler) layout.

#### Q4: Self-consistency temperature — UCM-tunable?

**Answer: Yes, with guardrails.**

Add `selfConsistencyTemperature` to PipelineConfig. Default: 0.3. Floor: 0.1 (enforced in code — below 0.1, the spread is always near-zero and the check is meaningless). Ceiling: 0.7 (above 0.7, the LLM becomes too random and everything looks unstable).

In deterministic mode (`config.deterministic = true`), self-consistency is skipped entirely regardless of this setting.

#### Q5: Combined cost estimate acceptable?

**Answer: Yes, but the Lead Architect's estimate needs revision.**

Revised cost breakdown (per analysis run):

| Idea | Calls | Tier | Est. Cost |
|------|-------|------|-----------|
| B: Adversarial (challenger + reconciliation) | 2 | Sonnet | ~$0.30 |
| C: Triangulation | 0 | — | $0.00 |
| D: Multi-Perspective (baked into verdict prompt) | 0 | — | ~$0.00 (slightly larger prompt, same call count) |
| E: Self-Consistency (2 extra advocate calls) | 2 | Sonnet | ~$0.30 |
| **Total** | **4** | | **~$0.60/run** |

This is within the Lead Architect's $0.50–1.00 range. The total pipeline cost increase is modest compared to the research stage (which typically consumes 60–70% of the LLM budget via multiple search → extract → filter iterations).

**Important:** The cost estimate assumes Ideas B and E are designed to SHARE the verdict prompt construction. The advocate call (B step 1) and the self-consistency re-runs (E) use the same prompt — they should share the prompt-building code, not duplicate it.

---

### §8.4 Changes Required (Pipeline Stage Impact)

Ideas B, D, and E all modify §8.4 (Verdict). They must be designed as an integrated stage, not bolted on independently. Proposed revised §8.4 flow:

```
§8.4 VERDICT (Revised for Ideas B + D + E)

Step 1 — Advocate verdict (Sonnet):
  Input: Claims + evidence organized by boundary
  Output: Per-claim verdicts with per-boundary findings (truth%, confidence, direction)
  [This is the current §8.4 expanded with Idea D's per-boundary quantitative signals]

Step 2 — Self-consistency check (Sonnet × 2, parallel with Step 3):
  Re-run Step 1 prompt 2× at selfConsistencyTemperature
  Compute per-claim spread
  Output: ConsistencyResult[] (spread, stable flag)
  [Skip entirely in deterministic mode]

Step 3 — Adversarial challenge (Sonnet, parallel with Step 2):
  Input: Step 1 output (advocate verdicts + per-boundary breakdown)
  Challenge: Argue strongest case against emerging verdicts
  Output: ChallengeDocument (per-claim challenges citing evidence IDs)

Step 4 — Reconciliation (Sonnet):
  Input: Step 1 verdicts + Step 3 challenges + Step 2 consistency data
  Output: Final ClaimVerdict[] with:
    - Revised truth% and confidence (incorporating challenge responses)
    - Consistency-adjusted confidence (if spread was high, confidence reduced)
    - Per-boundary findings retained from Step 1
    - Explicit responses to each challenge point in reasoning

Step 5 — Verdict validation (Haiku × 2, existing):
  Grounding check + direction check (unchanged from current §8.4)
```

**Key design decision:** Steps 2 and 3 run in parallel (both only need Step 1 output). Step 4 waits for both. This means the verdict stage latency is: Step 1 + max(Step 2, Step 3) + Step 4 + Step 5. In practice, Step 3 (single call) finishes faster than Step 2 (2 calls in parallel), so the critical path is: Step 1 → Step 2 → Step 4 → Step 5.

**§8.5 changes (Aggregation):** After Step 4, the aggregation stage receives `ClaimVerdict[]` with per-boundary findings. Triangulation scoring (Idea C) is computed from the boundary structure and applied as a weight modifier. Two-level aggregation:
1. Per-claim overall verdict = already produced by Step 4 (the LLM synthesizes across boundaries)
2. Overall assessment = `calculateWeightedVerdictAverage()` with triangulation-adjusted weights

This keeps the aggregation function deterministic and testable, with the LLM doing the cross-boundary synthesis in Step 4.

---

### Maintenance Concerns Flagged

**1. Idea D + B interaction complexity (MEDIUM risk):**
The reconciliation prompt (Step 4) receives per-boundary findings AND challenge points. If both are large (say 4 boundaries × 6 claims × challenger with 3 points per claim), the prompt becomes very long. Need to enforce output structure: the reconciliation should produce final verdicts, not re-argue every point. A structured output schema (Zod) constrains this.

**2. Idea E + deterministic mode (LOW risk, but must be handled):**
Self-consistency at temp=0 always produces spread=0. The `assessed: false` flag prevents false confidence from "everything looks stable." This is a small edge case but will confuse developers who enable deterministic mode for debugging and wonder why self-consistency always reports "stable."

**3. Three ideas modifying one stage (MEDIUM risk):**
§8.4 goes from 2 steps (verdict + validation) to 5 steps. Each step has its own prompt, schema, and error handling. The stage implementation will be ~400-500 lines. This is manageable if designed as a clean `VerdictStage` module with clear step interfaces, but risky if implemented as inline additions to the main orchestration function.

**Recommendation:** Implement the verdict stage as a separate module (like `aggregation.ts` is separate from `orchestrated.ts`). This contains the complexity and makes each step independently testable.

**4. Cost monitoring (LOW risk):**
4 extra Sonnet calls per run is fine now, but if the pipeline scales to batch processing (multiple articles), costs multiply. Add per-stage cost tracking (LLM call count + token usage per stage) to the job events. This is debugging infrastructure, not a blocker.

---

### Lead Developer's Additional Ideas

#### Idea F: Claim Coverage Matrix (pre-aggregation diagnostic)

After Stage 2, compute a `claims × boundaries` matrix showing evidence coverage:

```
         CB_WTW  CB_TTW  CB_GRID
AC_01:   4 items  2 items  3 items   ← well-covered
AC_02:   1 item   0 items  0 items   ← under-researched
AC_03:   0 items  3 items  1 item    ← boundary-specific
```

**Why:** This matrix is the input for BOTH triangulation scoring (Idea C) and the sufficiency check (§8.2 step 10). Computing it explicitly (rather than inferring from flat lists) gives:
- Clear "under-researched claim" signals for remaining research iterations
- Direct input to `computeTriangulation()` without re-scanning evidence lists
- Diagnostic value: the matrix appears in job events for debugging

**Cost:** Zero LLM. ~20 lines of deterministic code. Computed once after Stage 3 (boundaries created), before Stage 4 (verdict).

**Recommendation:** Include in v1 as infrastructure. It's a data structure, not a feature — but it simplifies the implementation of Ideas C and D.

#### Idea G: Verdict Stage Module Extraction

Not an analytical idea — an implementation architecture recommendation. The verdict stage (§8.4) with Ideas B, D, and E will be the most complex stage in the pipeline. Extract it as `verdict-stage.ts` (analogous to `aggregation.ts`, `evidence-filter.ts`). Benefits:
- Each step (advocate, consistency, challenger, reconciliation, validation) becomes a testable function
- The main orchestration file doesn't grow by another 400+ lines
- Prompt templates for each step live together, not scattered

**Recommendation:** Implement from the start. Don't add to `orchestrated.ts` and refactor later — the current file is already ~13,600 lines.

---

### Summary: Lead Developer Recommendations

| Idea | Lead Architect Says | Lead Developer Says | Key Difference |
|------|-------------------|--------------------|----|
| **A: Evidence Graph** | v2; `isDerivative` for v1 | **Agree** — `isDerivative` + `derivativeMultiplier` weight reduction | Add weight reduction to make the flag analytically useful, not just metadata |
| **B: Adversarial Challenge** | v1 | **Agree** — design as §8.4 Step 3, parallel with self-consistency | Challenge targets overall verdict (not per-boundary). Must assess evidence COVERAGE, not just interpretation. |
| **C: Triangulation** | v1 | **Strongly agree** — highest value/effort ratio | Pre-compute as `claim.triangulationFactor`, UCM-configurable thresholds from day one |
| **D: Multi-Perspective** | v1 core feature | **Agree with scope reduction** — quantitative signals in v1, per-boundary narratives in v2 | Reduces prompt complexity and LLM output size significantly |
| **E: Self-Consistency** | v1 | **Conditional agree** — re-run advocate only, same tier (Sonnet), skip in deterministic mode | Lead Architect said "Haiku-tier" — I disagree, Haiku will inflate spread artificially |
| **F: Coverage Matrix** | (new) | **v1 infrastructure** | Simplifies C and D implementation |
| **G: Verdict Module** | (new) | **v1 architecture** | Prevents orchestrated.ts from growing by another 400+ lines |

---

*Assessment complete. Ready for Captain and Lead Architect review.*
