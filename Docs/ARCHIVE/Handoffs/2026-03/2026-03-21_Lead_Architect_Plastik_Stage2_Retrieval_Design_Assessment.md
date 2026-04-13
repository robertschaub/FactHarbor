# 2026-03-21 Lead Architect — Plastik Stage 2 Retrieval Design Assessment

**Task:** Assess whether remaining 48pp post-B1+B2 spread requires a local Stage 2 prompt tweak or a broader retrieval architecture change. Deliver a phased plan with decision gates.

**Activated as:** Lead Architect (Claude Code, Sonnet 4.6)
**Prior chain:** Instability Analysis → Implementation Brief → A1 Results → Contract Fix Status

---

## 1. What the Evidence Tells Us

### What has been fixed

| Fix | Mechanism | Effect confirmed |
|-----|-----------|-----------------|
| Stage 1 contract validator | LLM guardrail prevents proxy drift | 5/5 predicate preservation. Do not reopen. |
| A1 direction guardrail | `retry_once_then_safe_downgrade` promoted to default | Backstop active. But did not cause the improvement in Run4/5. |
| B1 claimDirection guidance | Partial-benefit classification rule in EXTRACT_EVIDENCE | Reduces RC3 (claimDirection ambiguity). Applied. |
| B2 contradiction-iteration framing | Explicit direction guidance in GENERATE_QUERIES | Partially addresses RC2 (expectedEvidenceProfile bias). Applied. |

### What the A1 results reveal (critical architectural signal)

The A1 experiment's most important finding was buried: **Run4 (74% → 27%) and Run5 (69% → 34%) improved without the direction guardrail firing.** Zero `verdict_direction_issue` warnings on those runs. The improvement came entirely from retrieval variation — that re-run happened to return a balanced 56S/56C evidence pool instead of whatever imbalanced pool the baseline run got.

This is the decisive signal. The direction guardrail only fires when evidence *labels* disagree with the verdict. If EN retrieval returns evidence that the extraction LLM legitimately labels as `supports` (e.g., "only 9% of plastic ever gets recycled" → supports "recycling is pointless"), the guardrail passes it through because the verdict is internally consistent. The guardrail cannot correct a problem rooted in which evidence is found — only in how evidence direction is labeled.

**Implication: the direction guardrail is correctly positioned as a backstop, not a fix for the root cause.**

### What B1+B2 did and did not do

B1 addressed how ambiguous partial-benefit findings get labeled. B2 added explicit direction guidance for the contradiction-reserved iteration. Both are prompt-level interventions that reduce labeling noise and improve query coverage at the margin.

But post-B1+B2, spread is still 48pp and EN exact remains high. This tells us:

- **RC3 (claimDirection ambiguity)** was a real contributor but not the dominant one — B1 addressed it and spread is still wide.
- **RC2 residual** — B2 told the contradiction iteration to actively seek counter-evidence, but the preliminary search (which seeds `expectedEvidenceProfile`) still runs before B2's guidance takes effect. The seed still biases the entire query framing.
- **RC1 (language-stratified retrieval)** is the primary surviving driver. EN queries for "plastic recycling is pointless" find the global 9% recycling rate and market-failure literature. DE queries find UBA, NABU, and Swiss federal studies that predominantly show recycling *does* achieve measurable outcomes. This is not noise — it is a real difference in what the global evidence landscape looks like when accessed via different language entry points.

---

## 2. Architectural Judgment: Local Fix vs Structural Retrieval Redesign

**Judgment: the remaining 48pp spread cannot be solved by another local Stage 2 prompt tweak. A structural retrieval change is necessary.**

The reasoning:

1. **Three layers of prompt work have been applied** (Stage 1 contract validator + B1 + B2). Spread is still 48pp. Diminishing returns on the next prompt tweak are nearly certain.

2. **The direction guardrail is active and working as designed** — it just can't reach a problem that lives upstream in retrieval.

3. **The failure mode is provable-structural, not stochastic:** EN exact inputs consistently return evidence pools that are compositionally different from DE exact inputs for the same semantic claim. The variance is real, reproducible, and language-driven. It is not randomness that more clever prompting will stabilize.

4. **There is one legitimate small prompt change remaining** (see §3), but it targets the *secondary* driver (RC2: expectedEvidenceProfile seeding), not the primary one (RC1: pool composition). That change should be made — but as a gate test, not a solution.

5. **If the small change doesn't bring spread to <25pp, the structural option (§4) becomes mandatory**, because no further prompt intervention has a plausible mechanism to fix pool composition stratification.

---

## 3. The Smallest Next Change Still Worth Doing

**Target: expectedEvidenceProfile direction neutralization (Stage 1 → Stage 2 seeding)**

### What to do

The preliminary search that seeds `expectedEvidenceProfile` runs before Gate 1 and before any of B1/B2's guidance takes effect. Its output (which evidence types to seek) frames ALL subsequent query generation. If the preliminary search for "Plastic recycling is pointless" (EN) returns pro-recycling sources, `expectedEvidenceProfile` says "seek lifecycle assessments showing measurable benefit" — making all main queries bias toward finding contradiction-of-thesis evidence, which produces a low truth%. If it returns anti-recycling sources, the opposite happens.

B2 added direction guidance to the `contradiction` iteration. It did not add any instruction to prevent `expectedEvidenceProfile` from biasing the `main` iteration — which is the majority of queries.

**Proposed change** (requires Captain approval per AGENTS.md — prompt change):

In the `GENERATE_QUERIES` section, add a clarification paragraph for when `expectedEvidenceProfile` is present:

```
When `expectedEvidenceProfile` is provided, treat it as descriptive context about
what evidence types likely exist — not as direction guidance. Do not skew query
generation toward finding more of what the preliminary search already found.
Your main and contradiction iterations must together ensure balanced coverage
of evidence that could both affirm and refute the claim, regardless of what
the preliminary search found. The goal is completeness, not confirmation.
```

This is deliberately generic — no topic-specific language, no hardcoded predicates.

### Why this is worth doing even if it doesn't fully solve the spread

- RC2 is a real contributor (~20-25% of original spread). Neutralizing it reduces one genuine bias source.
- The change is a single paragraph addition to one prompt section.
- It has low regression risk: it makes query generation *more* neutral, which is directionally correct for all claim types.
- If it brings spread to <25pp, you have evidence that RC2 was the secondary bottleneck and the remaining variance is acceptable geolinguistic reality.
- If it doesn't, you have the clean decision gate: "prompt interventions are exhausted; structural redesign is next."

### Decision gate for this change

After implementing and running the 5-input Plastik family:

| Outcome | Conclusion | Next action |
|---------|-----------|------------|
| Spread drops to <25pp, EN exact drops to <55% | RC2 was load-bearing; RC1 is within acceptable range | Stabilize; monitor |
| Spread remains ≥25pp OR EN exact stays high | RC1 dominates; prompt work is exhausted | Proceed to §4 structural redesign |
| Spread increases or new regressions appear | Change introduced new bias | Revert; investigate |

---

## 4. The Larger Design Option: Multilingual Evidence-Pool Balancing

### The structural problem

The current pipeline is implicitly monolingual by design: queries are generated in the detected input language, and evidence retrieval is governed by those language-biased queries. For claims about global topics (plastic recycling effectiveness, climate change, hydrogen fuel cells), this produces systematically different evidence pools depending on input language — which produces systematically different verdicts for semantically equivalent inputs.

This is not a bug in any specific component. It is an architectural assumption — that input language should govern retrieval language — that is incompatible with the input neutrality requirement (≤4% tolerance on semantically equivalent inputs).

### The proposed design: cross-linguistic query supplementation

For any claim, the pipeline runs a supplementary query pass in at least one additional retrieval language beyond the detected input language. The cross-linguistic pass targets the language(s) most likely to access complementary evidence pools for the topic — for most global scientific/policy topics, this is English if the input is not already English, and a relevant regional language (DE for European policy) if the input is English.

Evidence from both passes is merged into a single pool before boundary formation, with deduplication by source URL/content hash.

**Design sketch:**

```
[Stage 2: Research]
  |
  ├─ Primary query pass (detected language, as today)
  |    generateResearchQueries(language=detected, iterationType=all)
  |
  └─ Supplementary query pass (cross-linguistic)
       if (detectedLanguage !== 'en') → add English pass
       if (detectedLanguage === 'en') → add 1-2 regional passes (guided by inferredGeography)
       generateResearchQueries(language=supplementary, iterationType=main only)
       [contradiction-reserved iterations remain in primary language only]

[Evidence Merge]
  deduplicate by URL hash
  label each EvidenceItem with retrievalLanguage (no analysis-affecting use)
  pass merged pool to Stage 3 boundary formation as today
```

### Scope and constraints

**What this touches:**
- `claimboundary-pipeline.ts` — Stage 2 query generation loop, evidence collection, and merge step
- `claimboundary.prompt.md` `GENERATE_QUERIES` — may need a language parameter clarification
- Search cost: supplementary pass adds ~N queries per run (1 iteration × search queries per iteration). With `contradictionReservedIterations=1` kept in primary only, cost increase is bounded.

**What this does NOT change:**
- Stage 1 claim extraction (do not touch)
- Stage 3 boundary formation logic (receives the merged pool as-is)
- Stage 4 verdict engine (no changes)
- Evidence direction labels (still LLM-assigned per B1 guidance)
- Any deterministic text-analysis decision

**Constraints:**
- Cross-linguistic retrieval language selection must be LLM-guided or config-driven — not hardcoded per-topic language lists (AGENTS.md: no hardcoded keywords)
- The supplementary pass should not double the `contradiction`-iteration cost; those iterations stay in the primary language

**What this buys:**
- Eliminates the structural evidence pool asymmetry between DE-input and EN-input runs for global topics
- Makes the claim "I ran the same analysis in German and English and got different verdicts" no longer reproducible
- Does not require any prompt changes to verdict logic

**What this does not guarantee:**
- Run-to-run variance within the same language will remain (search results vary). But the *language-driven systematic offset* should disappear.
- Evidence from different language communities may be genuinely contradictory (German NGOs emphasize recycling works; global stats emphasize it mostly fails). Cross-linguistic pooling makes that genuine disagreement visible in the evidence — which is correct behavior, not a bug.

---

## 5. Recommended Phased Plan

### Phase 0 — Diagnostic baseline (zero cost, no changes)

Before any further change, run 3 fresh EN exact inputs (`Plastic recycling is pointless`) on the current post-B1+B2 main.

**Purpose:** Understand whether B1+B2 moved anything. If EN exact is now consistently ≤55%, the 48pp figure may be from the pre-B1+B2 measurement window and Phase 1 may not be needed.

**Decision gate:**
- EN exact consistently >55%: B1+B2 did not solve EN exact outlier. Proceed to Phase 1.
- EN exact consistently ≤55%, spread ≤25pp: B1+B2 may have fixed it. Monitor. Phase 1 becomes optional.

**Cost:** 3 LLM analysis runs. No code/prompt changes.

---

### Phase 1 — expectedEvidenceProfile neutralization (prompt change, needs Captain approval)

**What:** Add the `GENERATE_QUERIES` direction-neutralization paragraph described in §3.

**Verification:** Run the 5-input Plastik family. Evaluate against the decision gate in §3.

**Success criterion:** EN exact drops to <55% and spread ≤25pp.

**Regression check:** Re-run Hydrogen control (should stay MOSTLY-FALSE <35%) and one Bolsonaro EN run (should stay LEANING-TRUE >55%).

**If gate passes:** Stabilize Phase 1. Begin monitoring boundary concentration (Run3's 92.3% CB_34 concentration is still open as a secondary signal).

**If gate fails:** Phase 1 is insufficient. The prompt-intervention path is exhausted. Move to Phase 2.

---

### Phase 2 — Cross-linguistic query supplementation (structural change, Captain design approval)

**What:** Implement the supplementary query pass described in §4.

**Implementation order:**
1. Add a `crossLinguisticQueryEnabled` UCM config flag (default `false`) for safe rollout
2. Implement the supplementary query loop in `claimboundary-pipeline.ts` with evidence merge
3. Add deduplication by URL hash before boundary formation
4. Enable via UCM for a controlled test pass, not as a code default
5. Run the full 5-input Plastik family
6. Evaluate spread and check for evidence volume changes (ensure merge doesn't create boundary concentration)

**Decision gate (for promoting to permanent default):**
| Criterion | Target |
|-----------|--------|
| Spread within 5-input Plastik family | <15pp |
| EN exact truth% | <55% |
| Runs 1–3 (DE/paraphrase) | ±5pp from Phase 1 values |
| Hydrogen control | Still <35% |
| No new boundary hyperconcentration | No boundary >75% of evidence |

**If gate passes:** Set `crossLinguisticQueryEnabled: true` as the new UCM default. Update pipeline config JSON.

**If gate fails:** Investigate whether the supplementary pass is actually diversifying the pool (check evidence counts by language) or whether boundary formation is concentrating them anyway. The boundary concentration issue (Finding 3 from A1 results) may need a separate investigation.

---

### Phase 3 — Boundary concentration safeguard (conditional, after Phase 2)

**When:** Only if Phase 2 is insufficient and boundary concentration remains extreme (>75% in one boundary).

**What:** This is not a verdict fix — it is an evidence distribution problem. If evidence mostly flows into one boundary, that boundary's direction controls the verdict and amplifies any remaining retrieval bias.

Investigation target: `claimboundary-pipeline.ts` boundary formation logic. Understand whether single-boundary dominance is caused by evidence pooling (all items have compatible EvidenceScopes → legitimately go to one boundary) or by a bug in the boundary assignment logic.

**Do not add deterministic rebalancing logic.** If boundary formation needs correction, the fix should be LLM-guided (adjust the boundary formation prompt to encourage more granular segmentation) or configuration-driven (reduce the threshold for creating a new boundary).

---

## 6. What NOT to Do

- **Do not reopen Stage 1.** The contract validator is working. Adding more Stage 1 complexity now risks mixing layers and making the next regression harder to attribute.
- **Do not add another verdict-level fix** (e.g., a new reconciliation step or post-hoc verdict scaling). The verdict stage is not the primary spread driver; adding layers there will mask the retrieval root cause and create future debugging debt.
- **Do not use deterministic language-detection rules** to select retrieval languages (e.g., "if German, add English queries"). The supplementary language selection must be LLM-guided or based on generic config, not per-language hardcoding.
- **Do not run B1+B2 with Plastik-specific examples.** The prompts must remain generic (AGENTS.md: no test-case terms).
- **Do not treat EN exact consistently high as an inherent correctness problem.** Some EN evidence genuinely supports skepticism about plastic recycling (low global rates, market failures). The goal is not to force EN to match DE — it is to ensure the verdict reflects a complete multi-source evidence base, not just one language community's framing.

---

## 7. Open Items

1. **Phase 0 diagnostic runs** — need to be executed before deciding whether Phase 1 is needed
2. **Captain approval** for Phase 1 prompt change (AGENTS.md Analysis Prompt Rules)
3. **Captain design approval** for Phase 2 structural change before implementation
4. **TPM guard fallback** (gpt-4.1 → gpt-4.1-mini for challenger) is a confound in any run where TPM threshold is hit. Consider whether to raise the TPM threshold or log more clearly when this occurs — it weakens the challenger step.
5. **Config provenance gap** (jobId not passed to config_usage) is still open. Makes post-Phase-2 attribution harder. Worth fixing before Phase 2 runs.

---

## Files Touched

- None (architecture assessment only — no code changes)

## Key Decisions

- Diagnosed remaining 48pp spread as primarily RC1 (language-stratified retrieval) — not addressable by another prompt tweak
- Identified one remaining legitimate prompt intervention (expectedEvidenceProfile neutralization, Phase 1)
- Determined that Phase 2 (cross-linguistic query supplementation) is the structural fix if Phase 1 is insufficient
- Provided phased plan with clear decision gates to avoid premature escalation to Phase 2

## Warnings

- B1+B2 prompt changes are already in `main`. Do not apply them again.
- Direction guardrail is already active (`retry_once_then_safe_downgrade`). Do not change it.
- Phase 2 adds search query volume — review cost implications before enabling by default.
- Boundary concentration (92.3% in one boundary observed in A1 Run3) is a secondary amplifier; it may re-emerge after Phase 2 if evidence from both language pools flows into the same dominant boundary.

## For Next Agent

- If implementing Phase 0: run 3 EN exact inputs on current `main`, record truth%, check whether direction warnings fire
- If implementing Phase 1: add the direction-neutralization paragraph to `GENERATE_QUERIES` section in `apps/web/prompts/claimboundary.prompt.md` — see §3 for exact proposed text; get Captain approval first
- If implementing Phase 2: read this file §4 for design constraints before touching `claimboundary-pipeline.ts`
- Key pipeline entry point for Phase 2: `generateResearchQueries()` call sites in `claimboundary-pipeline.ts` Stage 2 loop

## Learnings

Appended to Role_Learnings.md? No — this is a fresh architectural assessment. If Phase 1 or Phase 2 are implemented and produce unexpected behavior, the implementing agent should record learnings at that point.
