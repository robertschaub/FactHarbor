# Review: Report Quality Opportunity Map

**Reviewer:** LLM Expert (Claude Opus 4.6)
**Date:** 2026-02-22
**Document under review:** `Docs/WIP/Report_Quality_Opportunity_Map_2026-02-22.md`
**Review round:** R1

---

## Per-Item Assessment

### B-4: Pro/Con Query Separation (Exec #2)

**Architect's claim:** LOW effort. Addresses Q1 (evidence completeness) and Q2 (diversity).

**Assessment: Effort is LOW — but with a cost multiplier the Architect doesn't mention.**

Implementation is straightforward: modify the search-query generation prompt to emit two query variants per claim (one supporting, one refuting). This is a prompt change + minor orchestration logic. The Climinator codebase validates this pattern exists in real systems (L10, `create_search_queries` in their code).

**What the Architect missed:**

1. **Search query volume doubles.** Each claim currently generates ~3-5 search queries across up to 10 rounds. Pro/Con separation doubles the query count per claim. At 10 rounds × 2 queries × N claims, this is a material increase in search API calls and latency. The D5 cost ceiling (≤15% runtime increase) may be strained when B-4 stacks on top of D5#3 (contrarian retrieval, which also adds queries).

2. **Overlap with D5#3 contrarian retrieval.** D5#3 fires only when `evidence_pool_imbalance` is detected. B-4 fires always. If both are active, a claim with imbalance gets: normal queries + pro/con variants + contrarian queries. This triple-source pattern needs explicit deduplication or mutual exclusion logic.

3. **Rate limit risk.** FactHarbor uses multiple search providers (Brave, Serper, Google). Provider-level rate limits and quotas will be hit faster with doubled query volume. The existing search circuit breaker (`upsertSearchProviderWarning`) handles this, but more frequent trips = more claims running with thin evidence.

**Verdict: LOW effort is accurate for implementation. But the cost/latency impact is MEDIUM and must be measured. Recommend: implement B-4 with a UCM toggle, run A/B with and without it, and measure search-call count delta and runtime delta before declaring it production-ready.**

---

### B-5: Strong Challenger Profile — Opus for Challenger (Exec #3)

**Architect's claim:** LOW effort (config change). Addresses Q3 (accuracy) and Q4 (stability).

**Assessment: Configuration effort is trivially LOW. Cost and architectural implications are HIGH.**

Changing the challenger model to Opus is a one-line config change in `debateModelTiers`:

```
debateModelTiers.challenger: "sonnet" → needs new tier value or model override
```

However, the current tier system only supports `"haiku" | "sonnet"` (see `verdict-stage.ts:94-100`). Adding `"opus"` requires:
- Extending the `debateModelTiers` type union
- Adding Opus model IDs to `model-tiering.ts` for each provider
- Adding Opus pricing to any cost estimation logic

This is still LOW effort (~1-2 hours), but it's not "just a config change" — it's a type system + routing change.

**What the Architect missed:**

1. **Cost explosion.** Current per-analysis cost breakdown (from implementation analysis):
   - Step 1 (advocate): 1 Sonnet call → ~$0.09
   - Step 2 (self-consistency): 2 Sonnet calls → ~$0.18
   - Step 3 (challenger): 1 Sonnet call → ~$0.09
   - Step 4 (reconciler): 1 Sonnet call → ~$0.09
   - Step 5 (validation): 2 Haiku calls → ~$0.02
   - **Total: ~$0.47/analysis**

   Opus 4.6 pricing is ~5× Sonnet 4.5. Replacing the challenger Sonnet call with Opus:
   - Step 3 becomes ~$0.45 instead of ~$0.09
   - **New total: ~$0.83/analysis** — a **77% cost increase** from a single role change.

   In calibration (10 pairs × 2 sides = 20 analyses): current ~$9.40 → ~$16.60. For a full production run with multiple claims per analysis: proportional increase.

2. **Architectural asymmetry risk.** The debate pattern's integrity depends on balanced reasoning power across roles. If the challenger is Opus and the reconciler is Sonnet, the reconciler may be outmatched — it cannot fully evaluate whether the Opus challenger's arguments are valid or specious. This creates a structural bias toward the challenger position, not because the challenge is correct, but because the reconciler lacks the reasoning capacity to push back on sophisticated objections.

   **The Research Ecosystem doc (L-I) says "agent quality > debate structure" — but this means ALL agents should be high quality, not just the adversary.** The risk is that an Opus challenger generates elaborate-sounding but wrong challenges that a Sonnet reconciler accepts because they seem well-reasoned.

3. **Better alternative: Opus reconciler.** If we're spending on one Opus call, the reconciler is the higher-value placement. The reconciler is the decision-maker — it weighs advocate evidence against challenger objections. A weak reconciler is a worse vulnerability than a weak challenger, because the baseless challenge guard (`enforceBaselessChallengePolicy`) already catches challenges without evidence backing. But nothing catches a reconciler that is outmatched by the arguments it's evaluating.

4. **Even better alternative: better prompts.** Before upgrading model tiers, verify that the current challenger prompt (`VERDICT_CHALLENGER`) is maximally effective. The Climinator analysis shows that their debate was underimplemented (empty `debate.py`) — FactHarbor already has a real challenger. Prompt quality improvements to the existing Sonnet challenger may yield similar quality gains at zero additional cost.

**Verdict: LOW effort is misleading. The configuration change is trivial, but the cost impact (~77% per analysis), the reconciler asymmetry risk, and the need for type-system changes make this a MEDIUM-impact decision that should be evaluated via A/B, not deployed casually. Recommend evaluating in this order: (a) prompt improvements to Sonnet challenger, (b) Opus reconciler instead of Opus challenger, (c) Opus challenger as last resort.**

---

### B-6: Claim Verifiability Field in Verdict Prompt (Exec #6)

**Architect's claim:** LOW effort. Addresses Q7 (appropriate hedging).

**Assessment: LOW effort is accurate. But placement matters — verdict prompt is the wrong location.**

Adding a `verifiability` field (e.g., `"verifiable" | "evaluative" | "predictive" | "vague"`) to the verdict output schema is a prompt change + Zod schema addition. The Research Ecosystem doc (L-A) supports this: claim detection as a quality gate.

**What the Architect missed:**

1. **Stage placement is wrong.** Verifiability should be assessed at Stage 1 (claim extraction), not in the verdict prompt. By the time the verdict stage runs, the pipeline has already spent ~30-40 LLM calls researching and debating a potentially non-verifiable claim. Catching non-verifiable claims early saves all downstream cost.

   The Stage 1 `EXTRACT_CLAIMS` prompt already extracts atomic claims with structured fields. Adding `verifiability` there is the same effort as adding it in the verdict prompt, but catches the problem 4 stages earlier.

2. **Anchoring risk in verdict prompt.** If the LLM assesses verifiability AND truth percentage in the same prompt, verifiability classification can anchor the truth% reasoning. A claim tagged "evaluative" may receive a more hedged truth% not because of evidence weakness but because the model is influenced by its own verifiability assessment. Separating the assessment (Stage 1) from the verdict (Stage 4) eliminates this confound.

3. **Downstream routing.** Once verifiability is a Stage 1 field, it can inform the entire pipeline: evaluative claims could receive different search strategies, different evidence sufficiency thresholds, or even a different verdict presentation (balanced overview instead of truth%). This is the #15 priority item ("balanced overviews for evaluative claims") — B-6 at Stage 1 becomes a prerequisite enabler for it.

**Verdict: LOW effort confirmed, but move it to Stage 1 extraction for maximum value and minimum risk. Prompt interaction risk is real if placed in the verdict prompt alongside truthPercentage.**

---

### B-7: Misleadingness Flag in Verdict Output (Exec #11)

**Architect's claim:** LOW effort. Addresses Q7 (appropriate hedging).

**Assessment: LOW effort is accurate. Semantic decoupling from truthPercentage is the critical design constraint.**

Adding a `misleadingness` field to the verdict output (e.g., `"not_misleading" | "potentially_misleading" | "highly_misleading"` with a `misleadingnessReason` string) is a straightforward prompt + schema change. The Research Ecosystem doc (L-D, greenwashing detection pattern) supports this.

**What the Architect missed:**

1. **"90% true AND highly misleading" must be a valid output state.** This is the core design constraint. Cherry-picked statistics, omitted context, technically-true-but-deceptive framing — these are all high-truth, high-misleadingness states. The verdict prompt MUST explicitly instruct the LLM that truthPercentage and misleadingness are independent dimensions. If the prompt doesn't enforce this, the LLM will naturally correlate them (high misleadingness → lower truth%), defeating the purpose.

2. **Prompt phrasing matters enormously.** The instruction must be something like: "Assess misleadingness INDEPENDENTLY of truthPercentage. A claim can be factually true (high truth%) but misleading if it omits crucial context, implies false causation, or cherry-picks from a larger pattern." Without this explicit instruction, LLMs tend to conflate misleadingness with falsehood.

3. **Interaction with baseless challenge guard.** A claim flagged as misleading could trigger stronger challenger responses in future iterations (if the challenge prompt sees the flag). This is fine as long as the challenge is evidence-backed. But if the misleadingness flag itself becomes a reason for challenge ("this is misleading therefore doubt the truth%"), it would violate the baseless challenge policy. The flag must flow to the report, not back into the debate loop.

**Verdict: LOW effort confirmed. The implementation is straightforward IF the prompt explicitly decouples misleadingness from truthPercentage and IF the flag flows to report output only (not fed back into debate). Add both constraints as acceptance criteria.**

---

### B-8: Explanation Quality Check — LLM Self-Eval of Narrative (Exec #14)

**Architect's claim:** LOW effort (1 Haiku call). Addresses Q5 (explanation quality).

**Assessment: LOW effort is accurate. But LLM self-evaluation is epistemically weak and the design needs refinement.**

Adding a post-verdict Haiku call to evaluate the `verdictNarrative` for quality (clarity, evidence citation, logical flow, accessibility) is simple to implement. One additional LLM call at ~$0.01.

**What the Architect missed:**

1. **Self-eval reliability problem.** The LLM literature consistently shows that LLM self-evaluation is unreliable for quality dimensions that correlate with the model's own generation biases. An LLM tends to rate its own output (or output from the same family) as higher quality than it actually is. This is especially problematic for explanation quality, where "sounds good" ≠ "is good."

   Anthropic's own research and the broader literature (Kadavath et al. 2022, Lin et al. 2022) show that calibration of self-assessment degrades precisely on the dimensions that matter most: logical coherence, completeness, and clarity for non-expert audiences.

2. **Better design: structural checks + separate eval.** Instead of asking "is this narrative good?", decompose quality into structural checklist items:
   - Does the narrative reference at least N specific evidence items by source?
   - Does it address the strongest counter-evidence?
   - Is it under M words? (length proxy for accessibility)
   - Does it explicitly state confidence level?

   These structural checks are deterministic (no LLM needed for most) and more reliable than holistic self-eval. For the subjective dimension (clarity/accessibility), a separate LLM call with a rubric is acceptable, but should use a different model family or provider than the one that generated the narrative.

3. **Cross-model evaluation is more robust.** If the verdict narrative is generated by Sonnet, evaluation by Haiku is a different model but same family (Anthropic). True cross-model eval (e.g., OpenAI evaluating Anthropic output) is more reliable because it doesn't share the same generation biases. However, this adds cross-provider complexity and may not be worth it for a first iteration.

**Verdict: LOW effort confirmed, but the design should be refined. Recommend: (a) structural checks first (deterministic, zero cost), (b) if holistic eval is added, use a rubric-based prompt with explicit scoring dimensions rather than open-ended "rate this narrative," (c) treat self-eval scores as diagnostic data (logged, not gating) until validated against human evaluation.**

---

### Verdict Accuracy Test Set (Section 5)

**Architect's claim:** MEDIUM effort (1-2 days curation). Addresses Q3 (verdict accuracy) — the biggest gap.

**Assessment: Sound methodology. MEDIUM effort is accurate for initial curation. Several methodological caveats need addressing.**

The proposal to curate 20-30 claims with independently verified outcomes (10 true, 10 false, 5-10 contested) from established fact-checkers is methodologically sound and fills the most critical quality gap.

**What the Architect missed:**

1. **Time sensitivity.** Fact-checked claims have a temporal dimension. A claim rated "TRUE" by PolitiFact in 2024 may have new counter-evidence by 2026. The test set must pin a "as-of date" for each claim AND the pipeline must be evaluated against the evidence landscape available at the time of the fact-check, not current evidence. Alternative: select only claims with time-invariant truth (e.g., "The Earth is flat" = always false, "Vaccines cause autism" = consistently debunked). This limits the test set to a less interesting subset.

2. **Selection bias toward English.** PolitiFact, Snopes, Climate Feedback, and AFP Fact Check are primarily English-language sources. The calibration baseline already shows dramatic language effects (en=47.1pp skew vs fr=2.0pp). The test set MUST include non-English claims — ideally from French, German, and multilingual fact-checkers (e.g., Correctiv [DE], Les Decodeurs [FR], AFP Factuel [FR]) to match the calibration fixture's language coverage.

3. **MIXED category scoring.** The proposal says contested claims should map to "MIXED or UNVERIFIED + wide range." But MIXED is the hardest category to validate. What counts as a correct MIXED verdict? If PolitiFact rates a claim "Half True" and the pipeline says 55% (MOSTLY-TRUE), is that a match or a miss? The scoring rubric needs explicit band-mapping:
   - PolitiFact "True" / "Mostly True" → pipeline ≥60% = match
   - PolitiFact "False" / "Pants on Fire" → pipeline ≤30% = match
   - PolitiFact "Half True" / "Mostly False" → pipeline 30-70% with MIXED verdict = match
   - Define tolerance bands, not just category matches.

4. **Fact-checker calibration bias.** Different fact-checkers have different calibration standards. PolitiFact and Snopes sometimes disagree on the same claim. Cross-verification (the proposal mentions this) is essential. Only include claims where ≥2 independent fact-checkers agree on the rating.

5. **Evaluative claims exclusion.** The test set should explicitly exclude evaluative/opinion claims that fact-checkers rated. PolitiFact sometimes rates evaluative statements (e.g., "The economy is doing well") — these don't have ground truth in the traditional sense and would contaminate the accuracy metric.

**Verdict: MEDIUM effort confirmed. The methodology is sound with the additions above. Recommend starting with 15-20 claims (5 clearly true, 5 clearly false, 5 contested) across 2+ languages, with explicit band-mapping for scoring and cross-verification requirement. This is the single highest-value quality measurement we can add.**

---

## Answers to Review Questions

### Group 1: B-4 through B-8 — Technical Feasibility and Effort

**Are the "LOW effort" claims accurate?**

| Item | Claimed Effort | Actual Implementation Effort | Hidden Cost/Complexity |
|------|---------------|----------------------------|----------------------|
| B-4 | Low | Low (prompt + orchestration) | Medium: 2× search queries, rate limits, overlap with D5#3 |
| B-5 | Low (config) | Low-Medium (type system + model routing) | High: 77% cost increase, reconciler asymmetry |
| B-6 | Low | Low (prompt + schema) | Low if placed at Stage 1; Medium if in verdict prompt (anchoring) |
| B-7 | Low | Low (prompt + schema) | Low if decoupled correctly; Medium if correlated with truth% |
| B-8 | Low | Low (1 Haiku call) | Medium: self-eval reliability problem, needs structural alternative |

**Summary:** Implementation effort is genuinely LOW for all five. But B-4 and B-5 have significant operational cost implications that elevate their total-cost-of-deployment to MEDIUM. The Architect correctly classified the code-change effort but underweighted the cost/architectural impact.

### Group 2: B-5 — Challenger Model Deep-Dive

**Should we use Opus for the challenger role specifically?**

No — not as a first choice. The reasoning:

1. **L-I says agent quality matters most** — but this applies to ALL agents, not just the adversary. Upgrading only the challenger creates asymmetric reasoning power that the Sonnet reconciler cannot fully evaluate.

2. **The baseless challenge guard (`enforceBaselessChallengePolicy`)** already handles the main risk of a weak challenger: challenges without evidence backing are reverted. A stronger challenger would produce more sophisticated challenges, but the reconciler becomes the bottleneck.

3. **Recommended evaluation order:**
   - First: improve challenger prompt quality (zero cost)
   - Second: test Opus as reconciler (same cost, better placement)
   - Third: test Opus as challenger (with Opus reconciler, not alone)
   - Fourth: test Opus for both challenger + reconciler (2× Opus cost)

4. **If forced to choose one Opus role:** reconciler, not challenger. The reconciler is the decision-maker. The baseless challenge guard protects against bad challenges; nothing protects against a reconciler that can't evaluate sophisticated arguments.

### Group 3: Verdict Accuracy Test Set

**Is the methodology sound? What are the risks?**

The methodology is sound. Risks and mitigations:

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Time sensitivity of claims | Medium | Pin as-of dates; prefer time-invariant claims for initial set |
| English-only selection bias | High | Include claims from Correctiv (DE), Les Decodeurs/AFP Factuel (FR) |
| MIXED category ambiguity | Medium | Define explicit band-mapping with tolerance ranges |
| Fact-checker disagreement | Low | Require ≥2 independent fact-checker agreement per claim |
| Evaluative claim contamination | Medium | Explicitly exclude opinion/evaluative ratings |
| Sample size too small for statistics | Medium | 20-30 is adequate for directional signal, not statistical significance. Track as diagnostic, not gate, until N≥50 |

**Recommended scoring rubric:**

| Fact-checker rating | Pipeline match if | Tolerance |
|--------------------|-------------------|-----------|
| True / Mostly True | truthPercentage ≥60% | Category match (TRUE/MOSTLY-TRUE) |
| False / Pants on Fire | truthPercentage ≤30% | Category match (FALSE) |
| Half True / Mixed | truthPercentage 30-70%, verdict MIXED | ±10pp of center |
| Unrated/contested | UNVERIFIED or MIXED | Any non-definitive verdict |

### Group 4: Quality Dimension Completeness

**Are there quality dimensions the Architect's Q1-Q7 framework misses?**

Yes, two notable gaps:

1. **Q8: Timeliness / Evidence Freshness.** Does the pipeline find current evidence or rely on stale sources? A verdict based on 2020 evidence for a 2026 claim is technically wrong even if the evidence was once accurate. This is measurable: compare publication dates of cited sources against the claim's temporal context.

2. **Q9: Source Attribution Accuracy.** Does the pipeline correctly attribute claims to sources? Hallucinated citations (the LLM invents a source or misattributes a quote) undermine trust even if the verdict is correct. This is detectable: cross-check cited URLs against actual search results, verify quoted text appears in the source.

Neither is urgent enough to displace B-4 through B-8, but both should be tracked in the quality framework for future measurement.

**Coverage assessment of B-4 through B-8 against Q1-Q7:**

| Dimension | B-4 | B-5 | B-6 | B-7 | B-8 | D1-D5 | Gap remaining |
|-----------|-----|-----|-----|-----|-----|-------|--------------|
| Q1 Evidence completeness | Yes | — | — | — | — | D5#1 | Partial (no "did we find what exists?" benchmark) |
| Q2 Evidence diversity | Yes | — | — | — | — | D5#2 | Partial (detection only) |
| Q3 Verdict accuracy | — | Indirect | — | — | — | — | **Test Set needed** |
| Q4 Verdict stability | — | Indirect | — | — | — | — | C9 path-based still open |
| Q5 Explanation quality | — | — | — | — | Yes | — | First measurement mechanism |
| Q6 Cross-lingual robustness | — | — | — | — | — | — | **Still uncovered** |
| Q7 Appropriate hedging | — | — | Yes | Yes | — | D5#1 | Good coverage with B-6 + B-7 |

**Q3 and Q6 remain the biggest gaps.** The Verdict Accuracy Test Set addresses Q3. Q6 needs explicit multilingual quality tests beyond the bias harness (which measures symmetry, not correctness, per-language).

### Group 5: Risks and Interactions

**What are the interaction risks between the 5 proposals and existing D1-D5 work?**

| Interaction | Risk Level | Description |
|-------------|-----------|-------------|
| B-4 × D5#3 | **High** | Both add search queries. Without mutual exclusion or shared quota, combined query volume could hit rate limits or breach D5 cost ceiling. Must share a per-claim search budget. |
| B-5 × Step 4 reconciler | **High** | Opus challenger vs Sonnet reconciler = asymmetric debate. Reconciler may accept sophisticated-sounding but wrong challenges. Mitigate: upgrade reconciler too, or don't upgrade at all. |
| B-6 × verdict prompt | **Medium** | If verifiability is assessed in the same prompt as truthPercentage, the LLM's verifiability assessment anchors truth% reasoning. Mitigate: move to Stage 1. |
| B-7 × baseless challenge guard | **Medium** | Misleadingness flag could leak into debate loop if not carefully scoped. Must be output-only (report rendering), not fed back into challenger/reconciler context. |
| B-8 × B-2 memo scope | **Low** | B-8 self-eval scores feed into B-2 analysis. If self-eval is unreliable, it contaminates the A/B conclusion. Mitigate: treat as diagnostic, validate against human judgment samples before including in B-2. |
| B-4 × B-1 tracing | **None** | B-1 traces LLM calls; B-4 adds search queries. Orthogonal. |
| B-6 × B-7 | **Low** | Both address Q7 from different angles. Complementary, no conflict. Claim verifiability (B-6) helps interpret misleadingness (B-7) — an evaluative claim flagged as misleading needs different handling than a factual one. |

**Systemic risk: complexity ceiling.** Adding 5 new features in parallel with B-1/B-3 increases the change surface area during a critical stabilization phase. Each item is individually low-risk, but the combined changeset makes the B-2 A/B comparison harder to interpret — which feature caused which delta? Recommend: add items to the A/B matrix with explicit feature flags so each can be isolated.

---

## Amendments Proposed

### Amendment 1: Reorder B-5 Evaluation

**Current proposal:** Opus for challenger.
**Amended proposal:** Evaluate in order: (a) prompt improvement for Sonnet challenger, (b) Opus for reconciler, (c) Opus for challenger + reconciler. Do not deploy Opus challenger alone.

**Rationale:** Asymmetric reasoning power undermines debate integrity. The reconciler is the higher-value placement for a model upgrade. The baseless challenge guard already handles the main risk of a weak challenger.

### Amendment 2: Move B-6 to Stage 1

**Current proposal:** Verifiability field in verdict prompt.
**Amended proposal:** Add `verifiability` field to Stage 1 `EXTRACT_CLAIMS` prompt output schema.

**Rationale:** Earlier detection saves downstream cost (4 stages of work on non-verifiable claims). Eliminates verdict-prompt anchoring risk. Enables future evaluative-claim routing (priority #15).

### Amendment 3: B-4 + D5#3 Shared Search Budget

**Current proposal:** B-4 (pro/con queries) and D5#3 (contrarian retrieval) implemented independently.
**Amended proposal:** Define a per-claim search query budget (e.g., max 8 queries per claim per round). Pro/con and contrarian queries draw from the same budget. When `evidence_pool_imbalance` fires, contrarian queries consume budget slots that would otherwise go to standard pro/con queries.

**Rationale:** Prevents unbounded query multiplication that breaches the D5 cost ceiling.

### Amendment 4: B-8 Design Refinement

**Current proposal:** Single Haiku self-eval call on narrative quality.
**Amended proposal:** Two-tier approach: (a) deterministic structural checks (evidence citation count, counter-evidence addressed, length bounds) — zero cost; (b) rubric-based LLM eval with explicit scoring dimensions (not open-ended quality rating) — 1 Haiku call. Treat combined scores as diagnostic, not gating.

**Rationale:** Structural checks are more reliable than holistic self-eval. Rubric-based evaluation is more calibrated than open-ended assessment.

### Amendment 5: Verdict Accuracy Test Set — Multilingual Requirement

**Current proposal:** Claims from PolitiFact, Snopes, Climate Feedback, AFP, Full Fact.
**Amended proposal:** Add explicit multilingual requirement: ≥5 claims from non-English fact-checkers (Correctiv [DE], Les Decodeurs/AFP Factuel [FR]). Define band-mapping scoring rubric with tolerance ranges. Require ≥2 fact-checker agreement per claim.

**Rationale:** English-only test set would miss the language asymmetry already visible in calibration data (fr=2pp vs en=47pp). Cross-lingual accuracy is a quality dimension (Q6) with no current measurement.

---

## Risk Register

| # | Risk | Severity | Likelihood | Trigger | Mitigation |
|---|------|----------|-----------|---------|------------|
| R1 | B-4 + D5#3 combined query volume breaches cost ceiling | High | Medium | Both active on same claim with imbalanced evidence | Shared per-claim search budget (Amendment 3) |
| R2 | B-5 Opus challenger overwhelms Sonnet reconciler | High | High | Opus generates sophisticated but wrong challenges | Upgrade reconciler first, or both (Amendment 1) |
| R3 | B-6 verdict-prompt placement causes truth% anchoring | Medium | Medium | Verifiability assessment correlates with truth% | Move to Stage 1 (Amendment 2) |
| R4 | B-7 misleadingness flag leaks into debate loop | Medium | Low | Future refactor passes full verdict context to challenger | Enforce output-only scope in code + acceptance criteria |
| R5 | B-8 self-eval scores are unreliable, contaminate B-2 | Medium | High | LLM rates own output generously | Treat as diagnostic; validate against human samples before gating |
| R6 | Five simultaneous B-items make A/B attribution impossible | Medium | Medium | B-2 memo can't isolate which change caused which delta | Feature flags for each B-item; run isolated A/B when attribution needed |
| R7 | Verdict Accuracy Test Set has English-only selection bias | Medium | High | Only anglophone fact-checkers consulted | Multilingual curation requirement (Amendment 5) |
| R8 | MIXED-category scoring ambiguity inflates/deflates accuracy metric | Low | Medium | Band boundaries are arbitrary | Define explicit tolerance ranges, report per-category accuracy separately |

---

## Summary for Architect

The Quality Opportunity Map is a well-reasoned reframe. The core insight — that bias calibration measures consistency, not correctness, and the D1-D5 plan is too narrow — is exactly right. The 5 proposed quick wins are genuinely valuable.

**However, three items need design corrections before implementation:**

1. **B-5 is the highest-risk proposal.** Opus-for-challenger-alone creates asymmetric debate. Evaluate prompt improvements and reconciler upgrade first.
2. **B-6 belongs in Stage 1**, not the verdict prompt. Same effort, better value, no anchoring risk.
3. **B-4 and D5#3 need a shared query budget** or the cost ceiling becomes meaningless.

**The Verdict Accuracy Test Set is the single most important proposal in this document.** It should be elevated from "separate track" to a named priority with explicit timeline and ownership. Without it, every other quality improvement is measured by proxy.

**Estimated impact if all amendments are adopted:** 5 quality dimensions gain their first measurement mechanism (Q1, Q3, Q5, Q7 partial, Q7 partial). Two remain uncovered (Q4 path-based stability, Q6 cross-lingual quality). The overall quality measurement coverage moves from ~20% to ~60% of the framework.
