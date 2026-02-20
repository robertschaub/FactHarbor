# Meeting Prep: Elliott Ash — LLM Political Bias & FactHarbor

**For:** Meeting with Elliott Ash (ETH Zurich)
**Date:** 2026-02-19
**Starting point:** [Aligning LLMs with Diverse Political Viewpoints](https://aclanthology.org/2024.emnlp-main.412/) (Stammbach, Widmer, Cho, Gulcehre, Ash — EMNLP 2024)
**Reviewed by:** Claude Opus 4.6, Claude Sonnet 4.6, GPT-5.3 Codex (all merged below)

---

## 1. The Paper in Brief

LLMs have measurable political bias. ChatGPT aligns with the Swiss Green Liberal Party at 58% overlap. When asked to represent diverse viewpoints, it produces near-identical responses (Jaccard similarity 0.48).

**Solution:** Fine-tune Llama 3 8B on 100K real comments from Swiss parliamentary candidates ([smartvote.ch](https://smartvote.ch)) using ORPO (Odds Ratio Preference Optimization) — a monolithic preference method that pushes apart responses with different political metadata in a single training pass.

**Results:**

| Metric | ChatGPT zero-shot | ChatGPT few-shot | **Llama 3 ORPO** |
|--------|-------------------|-----------------|------------------|
| Diversity (Jaccard, lower=better) | 0.48 | 0.34 | **0.24** |
| Accuracy (MAUVE, higher=better) | 0.24 | 0.49 | **0.64** |
| Human preference | baseline | — | **~60% preferred** |

**Key insight:** ORPO pushes apart responses that use similar language but express different political stances. The "balanced overviews" pattern (generate per-perspective stances → synthesize) eliminates false consensus.

### Applicability caveat

The paper measures **stance generation** quality, not **claim verification** accuracy. Evidence grounding fundamentally changes the bias dynamics. The findings apply to FactHarbor primarily for evaluatively ambiguous claims where evidence is contested — not for factually clear claims. *(All three reviewers agree)*

### Paper limitations (methodology critiques, NOT FactHarbor weaknesses)

1. Only Llama 3 8B tested — larger models may not need alignment
2. Swiss-specific — unusually favorable context (proportional representation, 85% candidate participation)
3. Weak human eval — 2 annotators, Cohen's kappa 0.55 (moderate), 0.84 excludes ties
4. Jaccard is a poor diversity metric — word overlap, not semantic similarity. MAUVE results are more robust
5. Circular training/evaluation — ORPO trained on same comments used as MAUVE reference
6. No hallucination analysis, no temporal-drift control, no adversarial robustness testing

---

## 2. Ash's Research Portfolio — What to Know

### Tier 1: Directly relevant to FactHarbor

**Climinator** (npj Climate Action 2025) — [Link](https://www.nature.com/articles/s44168-025-00215-8)
Automated climate claim fact-checking. **Mediator-Advocate framework** with structurally independent advocates (RAG on IPCC corpus vs. general GPT-4o). >96% accuracy. Adding adversarial NIPCC advocate increased debate rounds from 1 to 18 on contested claims — correctly detecting genuine controversy.
*Critical comparison:* Climinator uses different models with different corpora. FactHarbor uses the same Sonnet model for all debate roles.
> **[FH 2026-02-20]** Addressed. Debate role routing supports provider-level separation via UCM (`debateProfile`, `debateModelProviders`) and `LLMCallFn` provider override wiring. Four profiles: `baseline` (all Anthropic), `tier-split` (Haiku challenger), `cross-provider` (OpenAI challenger), `max-diversity` (OpenAI challenger + Google self-consistency). Profile semantics are independent of global `llmProvider` — all profiles define explicit provider intent for all 5 roles. Runtime fallback warnings (`debate_provider_fallback`) surface in `analysisWarnings` JSON. Diversity warning (`checkDebateTierDiversity`) correctly evaluates resolved config using `__inherit_global__` sentinel. 918 tests passing.

**AFaCTA** (ACL 2024) — [Link](https://aclanthology.org/2024.acl-long.104/)
LLM-assisted factual claim detection with PoliClaim dataset. Uses **3 predefined reasoning paths** for consistency calibration — structurally different from FactHarbor's temperature-based self-consistency. Path-based consistency could detect bias that temperature variation cannot.

**Knowledge Base Choice** (JDIQ 2023) — [Link](https://dl.acm.org/doi/10.1145/3561389)
No universally best knowledge base. Domain overlap drives accuracy. Combining multiple KBs offers minimal benefit over the single best match. Pipeline confidence predicts KB effectiveness without ground-truth labels. Advocates "data-centric claim checking."
*Most actionable for FactHarbor:* Web search = choosing a KB at runtime. Search strategy should be claim-domain-aware.

**BallotBot** (Working paper 2025) — [SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5168217)
Randomized experiment (California 2024 election). AI chatbot with official voter guide info. Key findings: improved in-depth answers, **reduced overconfidence**, lowered info costs for less-informed voters, **no effect on voting direction**. Validates that balanced AI information informs without steering.

### Tier 2: Relevant to specific concerns

| Paper | Venue | Key finding for FactHarbor |
|-------|-------|---------------------------|
| **Media Slant is Contagious** | Economic Journal (cond. accepted) | Media slant propagates through **framing, not topic selection**. 24M articles show "diverse" sources may share inherited bias. Validates C13. |
| **In-Group Bias in Indian Judiciary** | REStat 2025 | ML bias detection on 5M cases. Found tight zero bias. Methodology (quasi-random assignment → measure directional skew) relevant for C10 calibration design. |
| **Conservative News Media & Criminal Justice** | EJ 2024 | Fox News exposure measurably increases incarceration. Media bias has real-world consequences. |

### Tier 3: Background

**Variational Best-of-N** (ICLR 2025) — alignment inference optimization. **Emotion and Reason in Political Language** (EJ 2022) — text-based emotion-rationality scale on 6M speeches. **Apertus** (2025) — open multilingual LLM. **LePaRD** (ACL 2024) — judicial citation dataset.

### Dominik Stammbach (lead author)

Postdoc at Princeton CITP. PhD from ETH (Spring 2024) on data-centric fact-checking. Current focus: legal NLP, misinformation detection, AI for access to justice.

---

## 3. FactHarbor Position: Strengths, Weaknesses, Opportunities, Addressed

### Strengths

1. **Evidence-first pipeline.** Verdicts must cite fetched evidence with structural ID validation. Eliminates the paper's core finding (zero-shot fabrication).
2. **Multi-perspective verdicts.** `BoundaryFindings[]` and `TriangulationScore` surface disagreement structurally, not as post-hoc synthesis. *(Codex caveat: this is methodological plurality, not necessarily ideological plurality.)*
3. **Mandatory contradiction search.** Pipeline explicitly searches for opposing evidence — architecturally enforced.
4. **Rich metadata conditioning.** EvidenceScope, SourceType, claimDirection, sourceAuthority, evidenceBasis — richer than the paper's party + language + issue template. *(Codex caveat: metadata exists but isn't guaranteed to be decisive in adjudication.)*
5. **Input neutrality.** "Was X fair?" = "X was fair" (≤4% tolerance), with test suite.

**Honest assessment:** These are real strengths versus zero-shot LLMs. But "good process architecture" is not the same as "demonstrated bias mitigation outcomes" *(Codex's core critique)*. Without outcome-level measurement, claiming "mitigated" is premature.
> **[FH 2026-02-20]** Calibration harness now built (C10 closed). We have detection (evidence skew), correction (harm confidence floor), configurability (debate tiers), and measurement (calibration harness with 10 mirrored pairs, A/B diff engine). First empirical run pending — until then, "mitigated" is still architectural, not measured. All new parameters are UCM-configurable with config-load failure logging, so the system is operationally observable. *Code review (P-H1): evidence items were always attributed to `sources[0]` when multiple sources were batched into one LLM call — fixed; LLM now returns a `sourceUrl` per item matched to the correct source. Strength #1 citation accuracy is now genuine.*

### Weaknesses

1. **C10: No empirical bias measurement** — 🟢 **Closed** (harness built, pending first run). Highest priority, directly actionable.
> **[FH 2026-02-20]** Calibration harness implemented. 10 mirrored claim pairs, directional skew metrics, HTML reports, A/B diff engine. First empirical run pending (~$3-6).
2. **C9: Self-consistency rewards stable bias** — 🟠 **High**. Illusory control providing false assurance.
3. **C13: Evidence pool bias** — 🟠 **High**. Bias injection before any LLM reasoning; detection done but rebalancing not yet implemented.
> **[FH 2026-02-19]** Detection implemented. `assessEvidenceBalance()` runs after Stage 2 (research), before verdicts. Emits `evidence_pool_imbalance` warning with sample-size context (e.g., "83%, 5 of 6 directional items"). Skew threshold and minimum directional count are UCM-configurable. Rebalancing (active correction) is not yet implemented — detection only. *Code review (P-M2): direction label matching fixed from `includes("support")` (would match "unsupported") to `=== "supports"` — directional counts fed into this warning are now correct.*
4. **C17/C18: Prompt injection + refusal asymmetry** — 🟠 **High**. Novel attack vectors that amplify political bias.

### Opportunities

Three concrete openings from the Ash collaboration: (1) **Calibration harness design** (C10 / §5 Action 1) — Ash's team has directly applicable benchmark methodology for measuring political skew; (2) **Path-consistency from AFaCTA** as a supplement to temperature-based self-consistency — could surface bias that temperature variation cannot detect (C9); (3) **Cross-provider debate architecture** — Climinator's structurally independent advocates validate the §5 Action 4 direction; Ash can advise on whether provider-level separation materially changes outcomes vs. same-provider tier separation.

### Addressed

1. **C8: Advisory-only validation** — 🟢 **Closed**. Detection without correction on high-harm claims.
> **[FH 2026-02-19]** Closed. `enforceHarmConfidenceFloor()` in verdict-stage now pushes low-confidence verdicts to UNVERIFIED for high-harm claims. Threshold (`highHarmMinConfidence`, default 50) and which harm levels trigger (`highHarmFloorLevels`, default ["critical","high"]) are UCM-configurable. *Code review (P-H3, U-L1): `as any` cast removed from the floor check; UCM defaults confirmed correctly registered.*

---

## 4. Meeting Questions (prioritized)

### Must-ask (pick 3-4 for a single meeting)

1. **Residual bias after architectural mitigation.** "Given our evidence-first architecture with contradiction search and debate, how much residual political bias do you estimate remains? Is architecture sufficient, or is model-level intervention unavoidable?"

2. **Single-model vs. multi-model debate.** "Climinator uses structurally different advocates. We use the same Sonnet for all roles. Did you see qualitatively different outcomes with structural independence? Is 'performative adversarialism' a real concern?"
> **[FH 2026-02-20]** Update for meeting: Cross-provider debate now implemented. Four UCM-selectable profiles (`baseline`, `tier-split`, `cross-provider`, `max-diversity`). `cross-provider` routes challenger to OpenAI; `max-diversity` adds Google for self-consistency. Question shifts from "should we do this?" to "does provider-level separation materially change outcomes vs. same-provider tier separation?"

3. **Minimum viable bias measurement.** "What's the smallest benchmark design that distinguishes model prior bias from evidence-pool bias? What does a good political-skew calibration harness look like?"
> **[FH 2026-02-20]** Update for meeting: Calibration harness built with 10 mirrored pairs (5 domains, 3 languages). Measures directional skew, stage bias indicators (extraction/research/evidence/verdict), and supports A/B comparison of UCM parameter changes. Question can shift from "what does it look like" to "how should we interpret the first results" and "what threshold calibration does Ash recommend?"

4. **Evidence pool bias diagnostics.** "Your KB Choice paper shows domain overlap drives accuracy. Our web search chooses a KB at runtime. How should we detect when the evidence pool is poorly matched or politically skewed?"
> **[FH 2026-02-19]** Update for meeting: We now detect directional skew in the evidence pool post-research (supporting vs. contradicting ratio with sample-size context). Question can shift from "how to detect" to "how to rebalance" and "is ratio-based detection sufficient or do we need semantic diversity metrics?"

### If time allows

5. **AFaCTA path-consistency vs. temperature-consistency.** Which produces more stable calibration on contested claims?
6. **Search bias compounding.** Does search engine ranking bias compound with or cancel LLM reasoning bias?
7. **NIPCC stress test analog.** Could we use a deliberately skeptical advocate to test whether our debate genuinely surfaces controversy?
8. **Refusal asymmetry.** How should a fact-checking system handle topic-dependent model refusals without introducing directional bias?

---

## 5. Actionable Recommendations (priority order)

**Principle: Measure before redesign.** *(Codex's key strategic insight — build baseline metrics first, then tie every architectural change to measured improvement.)*

| Priority | Action | Effort | Impact | Status |
|----------|--------|--------|--------|--------|
| **1** | **Political bias calibration harness** — 10 mirrored claim pairs (5 domains, 3 languages), measure verdict skew direction/magnitude, HTML reports, A/B comparison | Low (~1 day, ~$5-10) | 🔴 **Critical** — foundational | 🟢 **Done** |
|   |   |   | *[FH 2026-02-20] Implemented. 6 library files (`src/lib/calibration/`), 10 fixture pairs, vitest entry. Reviewed by Codex — targeted adjustments applied. Pending: first empirical run (~$3-6). See `Docs/WIP/Calibration_Harness_Design_2026-02-20.md`.* | |
| **2** | **Instrument failure modes** — track refusal/degradation rates by topic, provider, stage. Detect C18 (refusal asymmetry) | Low | 🟠 **High** — reveals invisible bias | 🟢 **Done** |
|   |   |   | *[FH 2026-02-20] Implemented in two layers. (1) Calibration harness now computes refusal/degradation rates per side, asymmetry deltas, and aggregates by domain/provider/stage with HTML + JSON output for C18 detection. (2) Core analysis metrics now persist `failureModes` telemetry (`refusalEvents`, `degradationEvents`, rates per 100 LLM calls, and `byProvider`/`byStage`/`byTopic` counters), and `/api/fh/metrics/summary` plus Admin Metrics dashboard surface these aggregates.* | |
| **3** | **Make validation blocking for high-harm claims** — `validateVerdicts()` returns verdicts unchanged; for `harmPotential >= "high"`, clamp confidence or force UNVERIFIED | Medium | 🟢 **High** — closes C8 | 🟢 **Done** |
|   |   |   | *[FH 2026-02-19] **Done.** `enforceHarmConfidenceFloor()` — forces UNVERIFIED when confidence < threshold. Harm levels and threshold UCM-configurable. 9 unit tests.* | |
| **4** | **Separate the challenger model** — different provider for VERDICT_CHALLENGER (e.g., GPT-4o if advocate is Sonnet) | Medium | 🟠 **High** — closes C1/C16 | 🟢 **Done** |
|   |   |   | *[FH 2026-02-20] **Done.** `LLMCallFn` supports per-role provider override, with UCM presets (`debateProfile`) and explicit per-role provider config (`debateModelProviders`). Four profiles with explicit provider intent independent of global `llmProvider`. Cross-provider challenger routing operational. Runtime fallback warnings surfaced in `analysisWarnings` (`debate_provider_fallback`). Diversity warning (`checkDebateTierDiversity`) evaluates resolved config correctly. 918 tests, build clean.* | |
| **5** | **Evidence pool balance diagnostics** — detect and report when evidence pool is politically one-sided | Medium | 🟢 **Medium-High** — closes C13 | 🟢 **Done** |
|   |   |   | *[FH 2026-02-19] **Done (detection).** `assessEvidenceBalance()` with sample-size-aware warnings. Skew threshold and min directional count UCM-configurable. Rebalancing not yet implemented.* | |
| **6** | **Add "politically contested" warning + range reporting** — show plausible verdict range, not just point estimate, on contested claims | High (long-term) | 🟠 **High** — epistemic honesty | 🟠 **Partial** |
|   |   |   | *[FH 2026-02-20] **Partially implemented.** Contestation detection: `isContested`/`factualBasis` classification in verdict prompts, doubted vs. contested distinction, UCM-configurable `contestationWeights` (opinion=1.0 no penalty, disputed=0.7, established=0.5). Self-consistency spread: 3-run stability measurement with UCM-configurable spread→confidence multipliers. Evidence imbalance: detection + warning. **Missing:** (a) verdict range reporting — `consistencyResult.percentages` data exists but only reduces confidence, not surfaced as plausible range; (b) debate-stage guard — no algorithmic backstop preventing baseless challenger objections from softening verdicts (LLM reconciler trusted only). New AGENTS.md rule "Evidence-weighted contestation" codifies intent. See plan for remaining implementation.* | |

---

## 6. References

### The Paper
- Stammbach et al. (2024). Aligning LLMs with Diverse Political Viewpoints. EMNLP 2024. [ACL Anthology](https://aclanthology.org/2024.emnlp-main.412/) | [arXiv](https://arxiv.org/abs/2406.14155) | [Code](https://github.com/dominiksinsaarland/swiss_alignment)

### Ash Group — Fact-Checking & Claims
- Climinator — [Link](https://www.nature.com/articles/s44168-025-00215-8) | AFaCTA — [Link](https://aclanthology.org/2024.acl-long.104/) | KB Choice — [ACM](https://dl.acm.org/doi/10.1145/3561389)

### Ash Group — Political Bias & Media
- BallotBot — [SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5168217) | Media Slant — [SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3712218) | Emotion & Reason — [Link](https://academic.oup.com/ej/article/132/643/1037/6490125)

### Ash Group — Bias Detection & Alignment
- Indian Judiciary Bias — [Link](https://direct.mit.edu/rest/article-abstract/doi/10.1162/rest_a_01569/128265) | vBoN — [arXiv](https://arxiv.org/abs/2407.06057) | Apertus (2025) | LePaRD (ACL 2024)

### People
- Elliott Ash: [elliottash.com](https://elliottash.com/) | [ETH Zurich](https://lawecon.ethz.ch/group/professors/ash.html)
- Dominik Stammbach: [Princeton CITP](https://citp.princeton.edu/people/dominik-stammbach/) | [Personal site](https://dominik-stammbach.github.io/)
