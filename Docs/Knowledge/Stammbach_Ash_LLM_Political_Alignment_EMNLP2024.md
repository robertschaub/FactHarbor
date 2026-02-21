# Meeting Prep: Elliott Ash — LLM Political Bias & FactHarbor

**For:** Meeting with Elliott Ash (ETH Zurich)
**Date:** 2026-02-19
**Starting point:** [Aligning LLMs with Diverse Political Viewpoints](https://aclanthology.org/2024.emnlp-main.412/) (Stammbach, Widmer, Cho, Gulcehre, Ash — EMNLP 2024)
**Reviewed by:** Claude Opus 4.6, Claude Sonnet 4.6, GPT-5.3 Codex (all merged below)

> **Related docs:** [Executive Summary](EXECUTIVE_SUMMARY.md) for the consolidated priority table. [Research Ecosystem](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md) for the full research network, project summaries, and debate landscape. [Climinator Analysis](Climinator_Lessons_for_FactHarbor.md) for the paper-vs-code deep-dive. [Epistemic Asymmetry](Truth_Seeking.md) for the evidence-pool bias context.

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

**Climinator** (npj Climate Action 2025) — [Link](https://www.nature.com/articles/s44168-025-00215-8) | [Full analysis](Climinator_Lessons_for_FactHarbor.md)
Mediator-Advocate framework with RAG on distinct corpora. >96% reported accuracy. **Critical: open-source code diverges significantly from paper** (debate.py empty, only 3/6 corpora). FactHarbor's debate is already more sophisticated. See [Climinator Analysis](Climinator_Lessons_for_FactHarbor.md) for the complete paper-vs-code gap analysis and 11 lessons.

**Status (2026-02-20):** Addressed. Debate role routing supports provider-level separation via UCM (`debateProfile`, `debateModelProviders`) and `LLMCallFn` provider override wiring. Four profiles: `baseline` (all Anthropic), `tier-split` (Haiku challenger), `cross-provider` (OpenAI challenger), `max-diversity` (OpenAI challenger + Google self-consistency). Profile semantics are independent of global `llmProvider` — all profiles define explicit provider intent for all 5 roles. Runtime fallback warnings (`debate_provider_fallback`) surface in `analysisWarnings` JSON. Diversity warning (`checkDebateTierDiversity`) correctly evaluates resolved config using `__inherit_global__` sentinel. Latest handoff reports clean build and full test pass.

**AFaCTA** (ACL 2024) — [Link](https://aclanthology.org/2024.acl-long.104/) | [Full analysis](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md#32-afacta-acl-2024)
3 predefined reasoning paths for consistency calibration — structurally different from FactHarbor's temperature-based self-consistency. Could detect bias that temperature variation cannot (C9).

**Knowledge Base Choice** (JDIQ 2023) — [Link](https://dl.acm.org/doi/10.1145/3561389) | [Lesson L-B](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md#l-b-data-centric-approach-to-search-strategy)
No universally best KB. Domain overlap drives accuracy. *Most actionable for FactHarbor:* Web search = choosing a KB at runtime. Search strategy should be claim-domain-aware.

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

Postdoc at Princeton CITP. PhD from ETH (Spring 2024) on data-centric fact-checking. Current focus: legal NLP, misinformation detection, AI for access to justice. [Full profile](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md#72-dominik-stammbach)

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
Status note — Section 3 / strengths (2026-02-20, final): **Full empirical C10 baseline complete.** Quick-mode (3 English pairs): meanDirectionalSkew=41pp, failureModeDelta=1.59% (LOW). Full-mode (10 pairs, 3 languages, 2026-02-20): 10/10 completed, meanDirectionalSkew=27.6pp, meanAbsoluteSkew=35.1pp, maxAbsoluteSkew=64.0pp, passRate=30%. Stage prevalence: extractionBias 0/10, researchBias 5/10, evidenceBias 8/10, verdictBias 7/10, failureModeBias 0/10. **Critical finding: French pairs showed near-zero skew (mean=2.0pp, max=4.1pp) vs English (mean=47.1pp) and German (mean=37.0pp).** C18 signal is clean (failureModeBias 0/10). Config hashes frozen: pipeline=07d578ea, search=2d10e611, calc=a79f8349. Artifacts: `run-2026-02-20T14-44-11-904Z.{json,html}` (quick) + `full-2026-02-20T21-32-24-288Z.{json,html}` (canonical full baseline). Earlier failed full artifact `full-2026-02-20T15-00-21-961Z` (0/10 completed) is superseded. **Threshold policy ratified (2026-02-20):** Option C — C18 as hard gate, skew as diagnostic. See [Calibration_Baseline_v1.md](../STATUS/Calibration_Baseline_v1.md).

Code review note — Section 3 / strengths (P-H1): Evidence-item source attribution was fixed: evidence is no longer always mapped to `sources[0]`; each item now maps by returned `sourceUrl`.

### Weaknesses

1. **C10: No empirical bias measurement** — 🟢 **CLOSED (baseline locked, threshold ratified)**.
Status note — C10 (2026-02-20, final): **Full baseline complete.** Quick-mode: 3 English pairs, meanSkew=41pp, failureModeDelta=1.59%. Full-mode: 10/10 pairs, 3 languages (en/de/fr), meanDirectionalSkew=27.6pp, maxAbsoluteSkew=64.0pp, passRate=30%, failureModeBiasCount=0/10. Key finding: French pairs nearly balanced (mean=2.0pp), English high (mean=47.1pp), German high-variance (mean=37.0pp). Evidence-pool asymmetry dominates (8/10 pairs evidenceBias), extraction bias zero. C18 clean. Artifacts: `run-2026-02-20T14-44-11-904Z.{json,html}` (quick) + `full-2026-02-20T21-32-24-288Z.{json,html}` (full). **Threshold ratified (2026-02-20):** Option C — C18 hard gate + skew diagnostic. See [Calibration_Baseline_v1.md](../STATUS/Calibration_Baseline_v1.md).
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

### 5.0 Code-verified status lock (2026-02-20)

This status lock is aligned with currently implemented code paths and tests:

- **Implemented and verified:** C8 (high-harm confidence floor), C18 (failure-mode instrumentation), cross-provider debate routing (C1/C16 direction), Action #6 (verdict range + baseless-challenge guard).
- **CLOSED:** C10 (quick-mode: 3/3 pairs; full-mode: 10/10 pairs, 2026-02-20. Threshold ratified: Option C — C18 hard gate, skew diagnostic. See [Calibration_Baseline_v1.md](../STATUS/Calibration_Baseline_v1.md)).
- **Partially implemented:** C9 (temperature-spread consistency only), C13 (detection without active rebalancing), C17 (generic controls without dedicated benchmark/policy track).
- **Calibration infrastructure fix (2026-02-20):** Vitest config was excluding the calibration test file. Created `vitest.calibration.config.ts` and updated npm scripts (`test:calibration`, `test:calibration:quick`, `test:calibration:full`). Corrected test timeouts to observed pipeline performance: QUICK=60min (was 20min), FULL=180min (was 80min).

### 5.1 Current state snapshot (implementation vs. closure)

| Concern | Current status | What is implemented | What is missing for closure |
|---------|----------------|---------------------|-----------------------------|
| **C10** Empirical bias measurement | 🟢 **CLOSED** | Calibration harness + mirrored pairs + skew metrics + HTML/JSON + A/B diff. Quick: 3/3 pairs, meanSkew=41pp. Full: 10/10 pairs (en/de/fr), meanDirectionalSkew=27.6pp, meanAbsoluteSkew=35.1pp, maxSkew=64.0pp, passRate=30%, failureModeBias=0/10. French pairs: mean=2.0pp. Threshold ratified: Option C. | [Calibration_Baseline_v1.md](../STATUS/Calibration_Baseline_v1.md) |
| **C18** Refusal asymmetry instrumentation | 🟢 Closed (instrumented) | `failureModes` telemetry in runtime + calibration outputs, Admin metrics surfacing | Ongoing monitoring only |
| **C9** Stable-bias risk in self-consistency | 🟠 Partial | 3-run temperature spread + confidence penalties | Path-consistency benchmark and rollout criteria |
| **C13** Evidence pool bias | 🟠 Partial | `assessEvidenceBalance()` detection + warnings + UCM thresholds | Active rebalancing/remediation loop + effectiveness checks |
| **C17** Prompt injection resilience | 🟠 Partial | Adversarial challenge + grounding/direction/structural validation | Dedicated C17 benchmark + explicit failure policy |
| **Action #6** Contestation range/governance | 🟢 Done | `truthPercentageRange`, `validateChallengeEvidence()`, `enforceBaselessChallengePolicy()`, prompt hardening, `baselessAdjustmentRate` metric, UI/HTML display | Boundary variance weight tuning after first calibration baseline |

### 5.2 Recommended next actions (decision-ready)

1. Execute D1-D5 Phase 1 (`A-1`, `A-2a`, `A-2b`, `A-2c`) and pass `A-3` gate (two 10/10 cross-provider full runs).
2. Then execute D2 sequence `B-1 -> B-3 -> B-2` (runtime tracing, knowledge-diversity-lite A/B, decision memo).
3. Keep Debate V2 topology work (`C-1`) in backlog until B-2 outcome is reviewed.

### 5.3 Open topics only (what remains after quick-mode baseline)

1. **Cross-provider stabilization remains open.**
   - Round-2 quick run completed.
   - Round-2 full run is not decision-grade (`6/10` complete).
   - Blockers: `undefined.value` crash path + OpenAI TPM pressure + limited failed-pair diagnostics.

2. **C13 correction remains open.**
   - Detection exists (`evidence_pool_imbalance`), active correction does not.
   - Next milestone: run A/B with and without C13 correction once cross-provider run quality gates pass.

3. **C17 benchmark/policy remains open.**
   - Existing controls are generic.
   - Dedicated benchmark + explicit fail policy is still required for closure.

4. **C9 benchmark decision remains open.**
   - Path-consistency benchmark against current spread method is still pending.

### 5.4 Completed foundational actions (for traceability)

| Concern / Track | Status | Current meaning |
|---|---|---|
| C10 baseline measurement | 🟢 Closed | Canonical quick + full baseline locked |
| Action #6 contestation/range | 🟢 Done | Implemented and test-verified |
| C18 failure-mode instrumentation | 🟢 Closed (instrumented) | Telemetry live and monitored |
| Cross-provider execution | 🟡 In progress | Needs A-2 fixes + A-3 gate pass |
| C13 correction loop | 🟠 Partial | Detection done, correction pending |
| C17 resilience benchmark | 🟠 Partial | Dedicated benchmark/policy pending |
| C9 path-consistency decision | 🟠 Partial | Benchmark and go/no-go pending |

### 5.5 Baseline v1 — Canonical Record (2026-02-20)

**Manifest:** [Calibration_Baseline_v1.md](../STATUS/Calibration_Baseline_v1.md)

Canonical baseline stays unchanged until cross-provider runs pass A-3 quality gates.

Current continuation focus:
1. Finish Phase 1 (`A-1`, `A-2a`, `A-2b`, `A-2c`).
2. Pass A-3 (two complete cross-provider full runs, no fatal exceptions, C18 gate intact).
3. Then run B-sequence (`B-1 -> B-3 -> B-2`) for decision-grade comparison.

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
