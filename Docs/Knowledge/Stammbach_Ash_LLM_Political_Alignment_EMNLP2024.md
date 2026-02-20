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

**Status (2026-02-20):** Addressed. Debate role routing supports provider-level separation via UCM (`debateProfile`, `debateModelProviders`) and `LLMCallFn` provider override wiring. Four profiles: `baseline` (all Anthropic), `tier-split` (Haiku challenger), `cross-provider` (OpenAI challenger), `max-diversity` (OpenAI challenger + Google self-consistency). Profile semantics are independent of global `llmProvider` — all profiles define explicit provider intent for all 5 roles. Runtime fallback warnings (`debate_provider_fallback`) surface in `analysisWarnings` JSON. Diversity warning (`checkDebateTierDiversity`) correctly evaluates resolved config using `__inherit_global__` sentinel. Latest handoff reports clean build and full test pass.

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
2. **Multi-perspective verdicts.** `BoundaryFindings[]` and `TriangulationScore` surface disagreement structurally, not as post-hoc synthesis.
3. **Mandatory contradiction search.** Pipeline explicitly searches for opposing evidence — architecturally enforced.
4. **Rich metadata conditioning.** EvidenceScope, SourceType, claimDirection, sourceAuthority, evidenceBasis — richer than the paper's party + language + issue template.
5. **Input neutrality.** "Was X fair?" = "X was fair" (≤4% tolerance), with test suite.

**Reviewer notes:** Methodological plurality is not automatically ideological plurality. Rich metadata is useful but not guaranteed to dominate adjudication.

**Honest assessment:** These are real strengths versus zero-shot LLMs. But process architecture alone is not the same as demonstrated mitigation outcomes. Without measurement, claiming "mitigated" is premature.
Status note — Section 3 / strengths (2026-02-20): Calibration harness is built (C10 near-closed). We now have detection (evidence skew), correction (harm confidence floor), configurability (debate tiers), and measurement infrastructure (10 mirrored pairs with A/B diff support). First empirical run is still pending.

Code review note — Section 3 / strengths (P-H1): Evidence-item source attribution was fixed: evidence is no longer always mapped to `sources[0]`; each item now maps by returned `sourceUrl`.

### Weaknesses

1. **C10: No empirical bias measurement** — 🟡 **Near-closed** (harness implemented; first empirical baseline run still pending).
Status note — C10 (2026-02-20): Calibration harness is implemented (10 mirrored pairs, directional skew metrics, HTML + JSON output, A/B diff engine). Remaining closure step is baseline execution + threshold lock.
2. **C9: Self-consistency rewards stable bias** — 🟠 **High**. Illusory control providing false assurance.
3. **C13: Evidence pool bias** — 🟠 **High**. Bias injection before any LLM reasoning; detection done but rebalancing not yet implemented.
Status note — C13 (2026-02-19): Detection implemented. `assessEvidenceBalance()` runs after Stage 2 (research), before verdicts. Emits `evidence_pool_imbalance` with sample-size context (e.g., "83%, 5 of 6 directional items"). Skew threshold and minimum directional count are UCM-configurable. Rebalancing (active correction) is not yet implemented.

Code review note — C13 (P-M2): Direction label matching was corrected from `includes("support")` (would match "unsupported") to `=== "supports"`.
4. **C17: Prompt injection resilience** — 🟠 **High**. Novel attack vectors that can amplify political bias.
5. **C18: Refusal asymmetry instrumentation** — 🟢 **Closed (instrumented)**. Refusal/degradation rates are now tracked by topic, provider, and stage.
Status note — C18 (2026-02-20): C18 instrumentation is implemented in calibration outputs and core runtime telemetry (`failureModes`), and surfaced in Admin Metrics summary/dashboard.

### Opportunities

Three concrete openings from the Ash collaboration: (1) **Calibration harness design** (C10 / §5 Action 1) — Ash's team has directly applicable benchmark methodology for measuring political skew; (2) **Path-consistency from AFaCTA** as a supplement to temperature-based self-consistency — could surface bias that temperature variation cannot detect (C9); (3) **Cross-provider debate architecture** — Climinator's structurally independent advocates validate the §5 Action 4 direction; Ash can advise on whether provider-level separation materially changes outcomes vs. same-provider tier separation.

### Addressed

1. **C8: Advisory-only validation** — 🟢 **Closed**. Detection without correction on high-harm claims.
Status note — C8 (2026-02-19): Closed. `enforceHarmConfidenceFloor()` in verdict-stage now pushes low-confidence verdicts to UNVERIFIED for high-harm claims. Threshold (`highHarmMinConfidence`, default 50) and triggering harm levels (`highHarmFloorLevels`, default ["critical","high"]) are UCM-configurable.

Code review note — C8 (P-H3, U-L1): Removed `as any` cast from the floor check; UCM defaults confirmed as correctly registered.

---

## 4. Meeting Questions (prioritized)

### Measures now in place (as of 2026-02-20)

1. **Bias calibration harness (C10):** 10 mirrored claim pairs, skew metrics, stage indicators, JSON + self-contained HTML reports, A/B comparison support.
2. **Failure-mode instrumentation (C18):** refusal/degradation telemetry by topic, provider, and stage in calibration outputs and runtime metrics (`failureModes`), surfaced in Admin Metrics.
3. **High-harm validation guard (C8):** low-confidence high-harm verdicts are forced to `UNVERIFIED` via `enforceHarmConfidenceFloor()`.
4. **Cross-provider debate separation (C1/C16):** challenger/provider separation via `debateProfile` and `debateModelProviders`, including fallback warnings in `analysisWarnings`.
5. **Evidence-pool skew diagnostics (C13):** `assessEvidenceBalance()` detection with sample-size-aware warnings and UCM-configurable thresholds.
6. **Contestation work (Action #6) is done:** contestation signals, verdict range reporting (`truthPercentageRange` from consistency spread + boundary variance), and baseless-challenge hybrid enforcement (`enforceBaselessChallengePolicy` with deterministic post-check revert) are fully implemented.

### Must-ask (pick 3-4 for a single meeting)

1. **Residual bias after current mitigations (decision: architecture vs model alignment).** "Given these controls are live, what residual political bias should we still expect, and where is model-level alignment still required?"
2. **Cross-provider impact, now that routing is live (decision: keep/expand/limit).** "Do you expect measurable quality/bias gains from provider-level role separation versus same-provider tier separation? Which evaluation metrics should decide rollout policy?"
3. **Calibration interpretation and thresholding (decision: governance baseline).** "For our first calibration runs, what threshold-setting method do you recommend (baseline establishment, tightening cadence, confidence intervals, minimum sample sizes)?"
4. **Evidence-pool correction strategy (decision: correction algorithm).** "We already detect pool skew; what is the safest correction approach (query diversification, directional balancing, source-type constraints) without introducing artificial neutrality artifacts?"

### If time allows

5. **Path-consistency vs temperature-consistency (AFaCTA).** Should we add path-based consistency for contested claims, and how should it be evaluated against the current 3-run spread approach?
6. ~~**Contested-claim range design (Action #6).**~~ **Done.** Implemented method B (consistency spread + boundary variance widening, weight=0.0 default). Enabling widening after baseline calibration.
7. ~~**Baseless challenge governance (Action #6).**~~ **Done.** Hybrid enforcement: deterministic post-check reverts baseless adjustments + advisory warnings for mixed provenance. `baselessAdjustmentRate` metric tracked.
8. **Search-bias compounding.** How should we separate search-provider bias effects from model reasoning bias in comparative runs?

---

## 5. Actionable Recommendations (priority order)

**Principle: Measure before redesign.** Baseline first, then ship corrective controls tied to measured deltas.

### 5.1 Current state snapshot (implementation vs. closure)

| Concern | Current status | What is implemented | What is missing for closure |
|---------|----------------|---------------------|-----------------------------|
| **C10** Empirical bias measurement | 🟡 Near-closed | Calibration harness, mirrored pairs, skew metrics, HTML/JSON, A/B diff | First baseline run + threshold lock + governance decision |
| **C18** Refusal asymmetry instrumentation | 🟢 Closed (instrumented) | `failureModes` telemetry in runtime + calibration outputs, Admin metrics surfacing | Ongoing monitoring only |
| **C9** Stable-bias risk in self-consistency | 🟠 Partial | 3-run temperature spread + confidence penalties | Path-consistency benchmark and rollout criteria |
| **C13** Evidence pool bias | 🟠 Partial | `assessEvidenceBalance()` detection + warnings + UCM thresholds | Active rebalancing/remediation loop + effectiveness checks |
| **C17** Prompt injection resilience | 🟠 Partial | Adversarial challenge + grounding/direction/structural validation | Dedicated C17 benchmark + explicit failure policy |
| **Action #6** Contestation range/governance | 🟢 Done | `truthPercentageRange`, `validateChallengeEvidence()`, `enforceBaselessChallengePolicy()`, prompt hardening, `baselessAdjustmentRate` metric, UI/HTML display | Boundary variance weight tuning after first calibration baseline |

### 5.2 Recommended next actions (decision-ready)

Effort scale used here:
- **Low:** 0.5-1.5 dev days
- **Medium:** 2-4 dev days
- **Medium-High:** 4-7 dev days

| Priority now | Action | Criticality | Effort | Why now | Exit criteria |
|--------------|--------|-------------|--------|---------|---------------|
| **1** | **Run first calibration baseline and lock thresholds (C10 closure step)** | 🔴 **Critical** | Low (+~$3-20 run cost, depending on mode) | Until first run, all mitigation claims remain architectural, not empirical | Baseline report generated, thresholds ratified, pass/fail policy recorded |
| ~~**2**~~ | ~~**Finish Action #6: verdict range + baseless-challenge governance**~~ | 🟢 **Done** | — | Implemented: `truthPercentageRange` in JSON/UI/HTML, `enforceBaselessChallengePolicy` hybrid enforcement, `baselessAdjustmentRate` metric | Boundary variance weight tuning after first calibration baseline |
| **3** | **Implement C13 active rebalancing (not just detection)** | 🟠 **High** | Medium-High | C13 remains a pre-reasoning bias source; diagnostics alone do not reduce skew | Rebalancing loop ships, imbalance warnings decrease in calibration A/B without large quality regressions |
| **4** | **C17 hardening track: adversarial benchmark + fail policy** | 🟠 **High** | Medium | Existing controls are generic; no dedicated injection stress harness or policy gate | C17 benchmark suite in CI/scheduled runs, policy for fail-open/fail-closed behavior approved |
| **5** | **C9 path-consistency benchmark against current spread method** | 🟡 **Medium-High** | Medium | Needed to decide if current self-consistency is robust or cosmetically stable | Side-by-side benchmark complete, adoption threshold defined, go/no-go documented |

### 5.3 Completed foundational actions (for traceability)

| Action | Status | Notes |
|--------|--------|-------|
| Calibration harness implementation | 🟢 Done (implementation) | First empirical run still required for full C10 closure |
| Failure-mode instrumentation (C18) | 🟢 Done | Runtime + calibration + Admin surface |
| High-harm confidence floor (C8) | 🟢 Done | `enforceHarmConfidenceFloor()` active, UCM-configurable |
| Cross-provider challenger separation (C1/C16) | 🟢 Done | `debateProfile` + provider overrides + fallback warnings |
| Evidence-pool imbalance diagnostics (C13 detection) | 🟢 Done | Detection complete; correction remains open |

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
