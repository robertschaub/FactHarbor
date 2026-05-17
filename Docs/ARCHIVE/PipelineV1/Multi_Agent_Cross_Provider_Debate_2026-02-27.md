# Multi-Agent Cross-Provider Debate — Design Proposal
**Date:** 2026-02-27
**Status:** 🧭 Proposal — Awaiting Prioritization
**Author:** LLM Expert
**Type:** Feature Design / Verdict Quality Enhancement

---

## Summary

Replace the current single-provider Steps 2+3 in `verdict-stage.ts` with a **cross-provider parallel debate round** using Claude, GPT-4o, and Gemini as independent debaters. A synthesizer (Claude Opus) aggregates via **weighted majority voting**.

All three AI SDK packages (`@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`) are already installed — no new dependencies required.

---

## Current Architecture (5-step single-provider pattern)

```
Step 1: Advocate Verdict       (Claude Sonnet)  — initial verdicts for all claims
Step 2: Self-Consistency       (Claude Sonnet ×2) ─┐ parallel
Step 3: Adversarial Challenge  (Claude Sonnet)    ─┘
Step 4: Reconciliation         (Claude Sonnet)   — incorporates Steps 2+3
Step 5: Verdict Validation     (Claude Haiku ×2) — grounding + direction checks
THEN:   Structural Consistency Check (deterministic)
Gate 4: Confidence classification
```

**Core problem**: Steps 2 and 3 use the same provider with the same training distribution. Self-challenge and adversarial challenge from the same model are weaker — the model shares the same biases and blind spots. Research (ReConcile, ACL 2024) shows heterogeneous providers drive the largest quality gains over using N copies of the same model.

---

## Proposed Architecture

Replace Steps 2 and 3 with a **cross-provider debate round**. Steps 1, 4, 5 are unchanged.

```
Step 1: Advocate Verdict       (Claude Sonnet)   — unchanged, produces initial verdicts

   ┌── Step 2a: GPT-4o Challenger   (OpenAI GPT-4o)     ─┐
   ├── Step 2b: Gemini Challenger   (Google Gemini 2.5)  ─┼─ parallel
   └── Step 2c: Claude Challenger   (Claude Sonnet)      ─┘
              (each sees Step 1 verdicts; must state explicit disagreements)

Step 3: Cross-Provider Synthesis   (Claude Opus)   ← new aggregator role
              (sees all three challenger outputs + confidence; weighted vote)

Step 4: Reconciliation             (Claude Sonnet) — unchanged, now receives Step 3
Step 5: Verdict Validation         (Claude Haiku ×2) — unchanged
THEN:   Structural Consistency Check (deterministic)
Gate 4: Confidence classification
```

### Key design choices (from research)

| Choice | Rationale |
|--------|-----------|
| **1 debate round only** | ICLR 2025: more rounds add cost, not quality |
| **Voting over full consensus** | +13.2% vs +2.8% for verdict/reasoning tasks (arXiv 2502.19130) |
| **Forced explicit disagreement** | Anti-sycophancy: each challenger must state *what* and *why* it disagrees before accepting Step 1 verdict |
| **Diverse reasoning paths** | Each challenger is prompted to use a distinct reasoning approach (DMAD pattern, ICLR 2025) |
| **Heterogeneous models** | Different providers, not just personas — drives the bulk of quality gains (ReConcile) |
| **Confidence-weighted synthesis** | Higher-confidence challengers influence verdict more (ReConcile pattern) |

---

## Implementation Sketch (TypeScript, Vercel AI SDK)

### 1. Challenger prompt contract

Each challenger receives:
- The AtomicClaim being evaluated
- All EvidenceItems for the ClaimAssessmentBoundary
- Step 1 advocate verdict (truthPercentage, confidenceTier, reasoning)
- A **forced reasoning mode** instruction (distinct per provider)

```typescript
// apps/web/src/lib/analyzer/verdict-stage.ts (new Step 2 replacement)

type CrossProviderChallengerInput = {
  atomicClaim: AtomicClaim;
  evidenceItems: EvidenceItem[];
  advocateVerdict: CBClaimVerdict;           // Step 1 output
  reasoningMode: "inductive" | "deductive" | "analogical"; // DMAD: forced diversity
};

type ChallengerOutput = {
  provider: LLMProviderType;
  agreement: "agree" | "partial" | "disagree";
  disagreementPoints: string[];              // REQUIRED: what specifically differs
  revisedTruthPercentage: number;
  revisedConfidence: "high" | "medium" | "low";
  reasoning: string;
};
```

### 2. Parallel challenger execution

```typescript
import { anthropic } from "@ai-sdk/anthropic";
import { openai }    from "@ai-sdk/openai";
import { google }    from "@ai-sdk/google";
import { generateObject } from "ai";

async function runCrossProviderDebate(
  input: CrossProviderChallengerInput[]  // one per AtomicClaim
): Promise<ChallengerOutput[][]> {

  // Each provider challenges ALL claims in one batched call (batch aggressively)
  const [claudeResults, gptResults, geminiResults] = await Promise.all([
    challengeWithProvider(anthropic("claude-sonnet-4-6"), "deductive",  input),
    challengeWithProvider(openai("gpt-4o"),               "inductive",  input),
    challengeWithProvider(google("gemini-2.5-pro"),       "analogical", input),
  ]);

  // Return [claude, gpt, gemini] outputs per claim
  return input.map((_, i) => [claudeResults[i], gptResults[i], geminiResults[i]]);
}
```

### 3. Synthesis aggregation (Step 3)

```typescript
function synthesizeDebateVerdicts(
  advocateVerdict: CBClaimVerdict,
  challengerOutputs: ChallengerOutput[]   // [claude, gpt, gemini]
): SynthesizedVerdict {

  // Confidence-weighted voting (ReConcile pattern)
  const weights = { high: 3, medium: 2, low: 1 };

  const weightedSum = challengerOutputs.reduce((acc, c) => {
    return acc + c.revisedTruthPercentage * weights[c.revisedConfidence];
  }, advocateVerdict.truthPercentage * weights[advocateVerdict.confidenceTier]);

  const totalWeight = challengerOutputs.reduce(
    (acc, c) => acc + weights[c.revisedConfidence],
    weights[advocateVerdict.confidenceTier]
  );

  return {
    synthesizedTruthPercentage: weightedSum / totalWeight,
    agreementLevel: computeAgreementLevel(challengerOutputs),
    keyDisagreements: challengerOutputs.flatMap(c => c.disagreementPoints),
    // Passed to Step 4 (Reconciliation) instead of raw Step 2+3 outputs
  };
}
```

### 4. Integration point in verdict-stage.ts

Current Step 2+3 run in parallel and both feed Step 4. The new design:

```typescript
// BEFORE (current):
const [consistencyResult, challengeDoc] = await Promise.all([
  runSelfConsistencyCheck(step1Output, config, progress),       // Step 2
  runAdversarialChallenge(step1Output, evidence, config, progress), // Step 3
]);
const step4Input = { ...step1Output, consistencyResult, challengeDoc };

// AFTER (cross-provider debate):
const debateResults = await runCrossProviderDebate(step1Output, evidence, config);  // Steps 2+3 combined
const synthesizedVerdicts = synthesizeDebateVerdicts(step1Output, debateResults);   // Step 3 aggregation
const step4Input = { ...step1Output, debateResults: synthesizedVerdicts };
```

Step 4 (Reconciliation) receives the synthesized debate output and uses it the same way it currently uses `challengeDoc` — no changes to Steps 4/5 or Gate 4.

---

## Decision Points for Captain

Before implementing, these decisions are needed:

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| D1 | **Scope of change** | Replace Steps 2+3 entirely vs add as optional mode (UCM flag) | UCM flag `debateMode: "single_provider" \| "cross_provider"` — safe rollout |
| D2 | **Model selection** | Which specific models per provider? | Claude Sonnet 4.6, GPT-4o, Gemini 2.5 Flash (cost balance) |
| D3 | **Synthesis agent** | Use deterministic voting vs LLM synthesizer for Step 3? | LLM synthesizer (Claude Opus) for nuanced disagreement handling; deterministic voting as fallback |
| D4 | **Cost gate** | Cross-provider debate is ~3× Step 2+3 cost; should it be gated behind a cost tier? | Yes — only activate for `confidenceTier: "contested"` or above |
| D5 | **API key requirement** | Requires `OPENAI_API_KEY` + `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local` | Already documented in `.env.example`? Check and add if missing. |

---

## Cost Estimate

Current Steps 2+3: ~2 LLM calls per claim batch (Sonnet ×3 total: self-consistency ×2 + adversarial ×1).

Cross-provider debate: 3 parallel challenger calls (Sonnet-class per provider) + 1 synthesis call (Opus-class).

| Mode | Calls per claim batch | Relative cost |
|------|----------------------|---------------|
| Current (single-provider) | 3 Sonnet | baseline |
| Cross-provider (all claims) | 3 Sonnet-class + 1 Opus-class | ~2.5–3× |
| Cross-provider (contested only, D4) | Same, conditional | ~1.3–1.5× average |

With D4 (conditional activation for contested verdicts only), average cost increase is modest. For high-stakes verdicts, the quality trade-off is favourable.

---

## Expected Quality Impact

Based on research benchmarks (adjusted for verdict tasks):

| Metric | Expected delta |
|--------|---------------|
| truthPercentage accuracy | +8–11% on contested claims (ReConcile baseline) |
| Hallucination in reasoning | Measurable reduction (cross-model mutual correction) |
| Self-consistency (same input → same verdict) | Likely neutral or slight improvement |
| Input neutrality (framing tolerance) | Likely improvement — heterogeneous models reduce framing sensitivity |

**Critical caveat**: ICLR 2025 shows MAD often loses to Self-Consistency (run N×, vote). Before implementing full cross-provider debate infrastructure, run a **self-consistency baseline experiment**: execute the current verdict stage 3× with temperature variation and majority-vote `truthPercentage`. If that matches the quality gain at lower cost, prefer self-consistency.

---

## Open Questions

- [ ] Does the existing `LLMProviderType` in `types.ts` cover `openai` and `google` already, or only `anthropic`?
- [ ] Are `OPENAI_API_KEY` and `GOOGLE_GENERATIVE_AI_API_KEY` documented in `.env.example`? (Both SDKs installed, but keys may not be configured for all environments.)
- [ ] Should Step 4 (Reconciliation) prompt be updated to receive structured debate output rather than a single challenge document?
- [ ] How does this interact with the Multi-Source Evidence Retrieval work (in progress) — debate quality is evidence-dependent.

---

## References

| Paper / Source | Key finding |
|---|---|
| [Du et al. — Multiagent Debate (ICML 2024)](https://arxiv.org/abs/2305.14325) | Seminal MAD paper. N agents → share → revise → aggregate. Works with black-box models. |
| [ReConcile (ACL 2024)](https://arxiv.org/abs/2309.13007) | Heterogeneous models + confidence-weighted voting. **+11.4% over single-agent.** |
| [DMAD — Diverse Reasoning (ICLR 2025)](https://openreview.net/forum?id=t6QHYUOQL7) | Forced per-agent reasoning diversity outperforms persona diversity. |
| [Voting vs Consensus (arXiv 2502.19130)](https://arxiv.org/abs/2502.19130) | **Voting +13.2%** vs consensus +2.8% for reasoning/verdict tasks. |
| [MAD Scaling Challenges (ICLR 2025 blog)](https://iclr-blogposts.github.io/2025/blog/mad/) | MAD often loses to self-consistency. 1 round optimal. Hide confidence scores from debaters. |
| [CONSENSAGENT (ACL 2025)](https://aclanthology.org/2025.findings-acl.1141/) | Anti-sycophancy: dynamic prompt refinement to prevent agreement without reasoning. |
| [AutoGen debate pattern](https://microsoft.github.io/autogen/stable//user-guide/core-user-guide/design-patterns/multi-agent-debate.html) | Reference implementation (Python). Not needed here — Vercel AI SDK sufficient. |

---

## Prerequisite / Recommended First Step

Before committing to cross-provider debate infrastructure, validate the **self-consistency baseline**:

1. In the Test/Tuning Mode (see [TestTuning_Mode_Design_2026-02-17.md](TestTuning_Mode_Design_2026-02-17.md)), run the current verdict stage 3× with temperature `0.7` on 5 calibration pairs
2. Majority-vote the `truthPercentage` outputs
3. Compare accuracy against current single-pass results on the same pairs
4. If self-consistency matches the expected +8–11% gain → implement self-consistency (trivial), skip cross-provider debate
5. If self-consistency gain is insufficient → proceed with this design

---

*Filed by: LLM Expert (Claude Sonnet 4.6)*
*Related refs: [TestTuning_Mode_Design_2026-02-17.md](../ARCHIVE/TestTuning_Mode_Design_2026-02-17.md), [Multi-Source_Evidence_Retrieval_Plan.md](../ARCHIVE/Multi-Source_Evidence_Retrieval_Plan.md)*
