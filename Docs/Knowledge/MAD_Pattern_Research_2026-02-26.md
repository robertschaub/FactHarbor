# Multi-Agent Debate (MAD) Pattern Research

**Date:** 2026-02-26
**Status:** Research complete — findings applied to UCM config
**Author:** Senior Developer (Claude Opus 4.6)

---

## Current FactHarbor Implementation

FactHarbor's verdict stage implements a 5-step structured debate:

```
Step 1: Advocate (initial verdicts)
    ↓
Step 2: Self-Consistency (stability check)  ←── parallel
Step 3: Challenger (adversarial challenge)  ←── parallel
    ↓
Step 4: Reconciler (final verdicts incorporating challenges)
    ↓
Step 5: Validator (grounding + direction checks)
```

**LLM calls per verdict run:** 5–7 (depending on self-consistency mode)

### Current Provider/Model Routing (UCM)

| Role | Provider | Tier | Actual Model |
|------|----------|------|-------------|
| Advocate | Anthropic (global) | sonnet | claude-sonnet-4-5 |
| Self-Consistency | Anthropic (global) | sonnet | claude-sonnet-4-5 |
| Challenger | **OpenAI** | sonnet | gpt-4.1 |
| Reconciler | Anthropic (global) | sonnet | claude-sonnet-4-5 |
| Validator | Anthropic (global) | haiku | claude-haiku-4-5 |

Cross-provider routing configured in UCM (`pipeline.default.json`), not hardcoded. Falls back to global provider if credentials unavailable.

### Recognized Patterns in FactHarbor's Design

- **Pipes and Filters** — overall linear pipeline (Extract → Research → Cluster → Debate → Aggregate)
- **Hegelian Dialectic** — Advocate (thesis) → Challenger (antithesis) → Reconciler (synthesis)
- **Multi-Agent Debate (MAD)** — published AI reasoning pattern, extended with Self-Consistency and Validator steps

---

## Published MAD Patterns Evaluated

### 1. Du et al. — Symmetric Round-Robin Debate (2023/ICML 2024)

Multiple identical LLM instances generate independent answers, then read all others' responses and revise over N rounds. Final answer by majority vote.

- **Strengths:** Simple, no role assignment needed, works with identical model copies
- **Weaknesses:** Convergence to groupthink, no structural adversarial pressure, sycophancy toward early majority
- **Relevance to FH:** Low — our dedicated challenger/reconciler roles already surpass this
- **Source:** https://arxiv.org/abs/2305.14325

### 2. Liang et al. — MAD with Judge / Tit-for-Tat (2023/EMNLP 2024)

Two debaters argue tit-for-tat. A separate judge manages the process, decides when to end, selects winner. Addresses "Degeneration-of-Thought" (DoT) problem.

- **Strengths:** Adaptive termination, moderate disagreement outperforms aggressive disagreement
- **Weaknesses:** Binary (two debaters only), judge is single point of failure
- **Relevance to FH:** Moderate — adaptive termination concept valuable (detect when debate has converged vs. needs more rounds)
- **Source:** https://arxiv.org/abs/2305.19118

### 3. ReConcile — Round-Table Conference (2023/ACL 2024)

Multiple diverse LLMs (ChatGPT + Bard + Claude) hold a round-table discussion with confidence-weighted voting.

- **Strengths:** Model heterogeneity as core principle, confidence-weighted voting, outperformed GPT-4 with weaker models combined
- **Weaknesses:** Requires multiple providers, confidence calibration across models is non-trivial
- **Relevance to FH:** **HIGH** — confidence-weighted voting aligns with Gate 4; model heterogeneity validated our cross-provider challenger routing
- **Source:** https://arxiv.org/abs/2309.13007

### 4. Mixture-of-Agents (MoA) — Layered Aggregation (2024)

Layered architecture where each layer's agents receive all outputs from the previous layer. Final layer has a single aggregator.

- **Strengths:** Exploits "collaborativeness", surpassed GPT-4 on AlpacaEval with open-source models
- **Weaknesses:** Not adversarial, high token cost, iterative refinement rather than argumentation
- **Relevance to FH:** Low-moderate — validates multi-agent approach but lacks adversarial structure
- **Source:** https://arxiv.org/abs/2406.04692

### 5. ChatEval — Multi-Agent Referee Team (2023/ICLR 2024)

Multiple LLM agents with distinct personas evaluate text through structured communication. Compares One-By-One, Simultaneous-Talk, and Simultaneous-Talk-with-Summarizer strategies.

- **Strengths:** Persona diversity by design, communication strategy comparison, summarizer reduces context pressure
- **Weaknesses:** Designed for evaluation not verdict generation, mixed finding ("panels help, debates often hurt")
- **Relevance to FH:** Moderate — Simultaneous-Talk-with-Summarizer could improve reconciliation step
- **Source:** https://arxiv.org/abs/2308.07201

### 6. Tool-MAD — Tool-Augmented Debate for Fact Verification (2025)

Each debate agent has a distinct external tool (different search APIs, RAG modules). Agents retrieve evidence during debate with adaptive query refinement.

- **Strengths:** Tool diversity ensures evidence diversity, adaptive query refinement, directly designed for fact verification
- **Weaknesses:** Complexity of managing multiple tool integrations
- **Relevance to FH:** **HIGH** — evidence-source diversity through tool assignment maps to our source-type partitioning; adaptive query refinement during debate could strengthen evidence coverage
- **Source:** https://arxiv.org/abs/2601.04742

### 7. GKMAD — Guided and Knowledgeable MAD (2025)

Four mechanisms: guided debate, external knowledge injection during debate, structured advice extraction, knowledgeable verification. Tested on HoVER, FEVEROUS, SciFact-Open.

- **Strengths:** Guidance prevents debate drift, "Advanced Advice" creates intermediate reasoning artifact
- **Weaknesses:** Four interacting mechanisms add complexity
- **Relevance to FH:** **HIGH** — advice extraction before final verdict could improve reconciliation step
- **Source:** https://www.sciencedirect.com/science/article/abs/pii/S0957417425037194

### 8. ED2D — Evidence-Based Debate for Misinformation (2025)

Five-stage structured debate (Opening, Rebuttal, Free Debate, Closing, Judgment) with two teams of 4 agents each. Evidence retrieval active during Free Debate stage.

- **Strengths:** Produces persuasive explanations comparable to human experts, evidence retrieval during debate
- **Weaknesses:** 8 agents + judge = high token cost, persuasive wrong answers reinforce misconceptions
- **Relevance to FH:** Moderate-high — evidence retrieval during debate (not just before) is the key insight
- **Source:** https://arxiv.org/abs/2511.07267

### 9. PGR-Debate — Program-Guided Refinement (2024–2025)

Claims decomposed into executable sub-tasks (Question, Verify, Predict). Two debaters + finalizer. Includes knowledge distillation for deployment efficiency.

- **Strengths:** Program-guided decomposition, debate per sub-claim, 1.9x cost reduction via distillation
- **Weaknesses:** Decomposition step is error-prone
- **Relevance to FH:** Moderate — we already decompose into AtomicClaims before debate
- **Source:** https://www.researchgate.net/publication/398886650

### 10. A-HMAD — Adaptive Heterogeneous MAD (2025)

Specialist roles (logical reasoning, factual verification, strategic planning). Coordination policy dynamically selects which agents participate each round. Learned consensus weights.

- **Strengths:** Dynamic agent selection, role specialization, 4–6% accuracy gains, 30%+ factual error reduction
- **Weaknesses:** Coordination policy requires training/tuning
- **Relevance to FH:** **HIGH** — adaptive debate depth (skip full debate for simple claims) could save significant cost
- **Source:** https://link.springer.com/article/10.1007/s44443-025-00353-3

### 11. DMAD — Diverse MAD (ICLR 2025)

Each agent uses a distinct reasoning method (chain-of-thought, analogical, first-principles). Breaks "mental set" — the tendency to apply the same approach repeatedly.

- **Strengths:** Addresses reasoning homogeneity, outperforms standard MAD in fewer rounds
- **Weaknesses:** Requires careful design of distinct reasoning prompts
- **Relevance to FH:** Moderate-high — deeper diversity than temperature variation; prompt different debate roles to use fundamentally different reasoning strategies
- **Source:** https://openreview.net/forum?id=t6QHYUOQL7

### 12. Free-MAD — Consensus-Free Debate (2025)

Eliminates consensus requirement. Score-based evaluation of full debate trajectory. Anti-conformity mechanism mitigates majority influence.

- **Strengths:** Single-round debate reduces token cost, anti-conformity combats sycophancy, trajectory scoring
- **Weaknesses:** Single round may miss iterative refinement for complex claims
- **Relevance to FH:** Moderate-high — anti-conformity mechanism directly relevant to preventing reconciler from "averaging" positions
- **Source:** https://arxiv.org/abs/2509.11035

### 13. S2-MAD — Selective Sparse Debate (NAACL 2025)

Sparsification strategy: similarity calculation detects redundant exchanges, redundancy filter retains only unique information.

- **Strengths:** 94.5% token cost reduction with <2% performance loss
- **Weaknesses:** May incorrectly filter important nuances
- **Relevance to FH:** Moderate — cost optimization layer applicable to our debate
- **Source:** https://arxiv.org/abs/2502.04790

### 14. FACT-AUDIT — Adaptive Multi-Agent Evaluation (ACL 2025)

Five specialist agents (Appraiser, Inquirer, Quality Inspector, Evaluator, Prober) in adaptive evaluation loop. Importance sampling for targeted test scenarios.

- **Strengths:** Five distinct specialist roles, evaluates both verdicts AND justifications
- **Weaknesses:** Designed for evaluation, not production fact-checking
- **Relevance to FH:** Low for direct adoption, but claim-complexity routing (Appraiser) concept is valuable
- **Source:** https://arxiv.org/abs/2502.17924

---

## Critical Warnings from Research

### "Stop Overvaluing Multi-Agent Debate" (ICML 2025)

Systematic evaluation of 5 MAD methods across 9 benchmarks found:
- MAD often **fails to outperform** simple Chain-of-Thought and Self-Consistency with more compute
- **Model heterogeneity is the "universal antidote"** — the single most consistent improvement
- Simple majority voting captures most MAD gains when agents are homogeneous
- Current evaluation practices suffer from limited benchmarks and weak baselines

**Source:** https://arxiv.org/abs/2502.08788

### "Peacemaker or Troublemaker" — Sycophancy in MAD (2025)

- LLM agents exhibit dominant sycophantic tendency in debate
- Optimal results from **mixed teams**: combining agreeable and independent roles
- The Challenger should be explicitly prompted toward "troublemaker" independence

**Source:** https://arxiv.org/abs/2509.23055

---

## Ranked Relevance to FactHarbor

| Rank | Pattern | Relevance | Key Takeaway |
|------|---------|-----------|-------------|
| 1 | Tool-MAD | HIGH | Evidence retrieval during debate, not just before |
| 2 | ReConcile | HIGH | Model heterogeneity + confidence-weighted voting |
| 3 | A-HMAD | HIGH | Adaptive debate depth — skip full debate for simple claims |
| 4 | GKMAD | HIGH | Structured advice extraction before final verdict |
| 5 | DMAD | MOD-HIGH | Different reasoning strategies per role, not just temperature |
| 6 | Free-MAD | MOD-HIGH | Anti-conformity mechanism; trajectory scoring |
| 7 | ED2D | MOD-HIGH | Five-stage debate with evidence retrieval during debate |
| 8 | Liang MAD | MOD | Adaptive termination |
| 9 | ChatEval | MOD | Summarizer agent to reduce context noise |
| 10 | S2-MAD | MOD | Token cost reduction via redundancy filtering |
| 11 | PGR-Debate | MOD | Debate per sub-claim; knowledge distillation |
| 12 | MoA | LOW-MOD | Validates multi-agent approach |
| 13 | Du et al. | LOW-MOD | Foundational work, surpassed by our pattern |
| 14 | FACT-AUDIT | LOW | Evaluation framework, claim-complexity routing concept |

---

## Concrete Improvement Opportunities

### Applied (this session)

**Cross-provider Challenger routing** — Challenger routed to OpenAI (`gpt-4.1`) while Advocate stays on Anthropic (`claude-sonnet-4-5`). Configured in UCM (`pipeline.default.json`). Based on ReConcile + "Stop Overvaluing MAD" finding that model heterogeneity is the single most consistent improvement.

### Future Candidates (not yet implemented)

**1. Adaptive Debate Depth** (from A-HMAD, FACT-AUDIT)
- Assess claim complexity before full debate
- Simple, well-evidenced claims skip Steps 2–3 → validation only
- Estimated cost reduction: 40–60% on easy claims
- Effort: Medium

**2. Evidence Retrieval During Debate** (from Tool-MAD, ED2D, GKMAD)
- Challenger triggers additional searches when gaps identified
- Evidence pool is not locked before debate begins
- Effort: High (pipeline architecture change)

**3. Anti-Sycophancy Challenger Prompting** (from Free-MAD, "Peacemaker or Troublemaker")
- Explicitly prompt Challenger as "troublemaker" with anti-conformity instructions
- Research shows mixed agreeable/independent teams outperform uniform ones
- Effort: Low (prompt change only)

**4. Reasoning Strategy Diversity** (from DMAD)
- Force different reasoning methods per debate role (not just temperature variation)
- Advocate: evidence-weight reasoning, Challenger: contradiction-focused, Reconciler: Bayesian updating
- Effort: Medium (prompt redesign)

**5. Cross-Provider Reconciler** (from ReConcile)
- Route Reconciler to a third provider (Google/Gemini) for neutral arbitration
- Currently shares provider with Advocate, which may create reasoning-style bias
- Effort: Low (UCM config change), but adds operational complexity (third API key)

**6. Structured Advice Extraction** (from GKMAD)
- Extract "debate takeaways" as intermediate artifact before Reconciler produces final verdict
- Reduces noise in reconciliation input
- Effort: Medium
