# Paper Review: Aligning Large Language Models with Diverse Political Viewpoints

**Status:** Reference document for meeting with Elliott Ash
**Date:** 2026-02-19
**Prepared by:** LLM Expert (Claude Code, Opus 4.6)
**Source:** [ACL Anthology](https://aclanthology.org/2024.emnlp-main.412/) | [arXiv](https://arxiv.org/abs/2406.14155)

---

## Paper Identity

| Field | Value |
|-------|-------|
| **Title** | Aligning Large Language Models with Diverse Political Viewpoints |
| **Authors** | Dominik Stammbach, Philine Widmer, Eunjung Cho, Caglar Gulcehre, Elliott Ash |
| **Venue** | EMNLP 2024 (Main, short paper), Miami, Florida |
| **Pages** | 7257-7267 |
| **Code/Data** | [github.com/dominiksinsaarland/swiss_alignment](https://github.com/dominiksinsaarland/swiss_alignment) |

---

## 1. Executive Summary (What You Need to Know)

LLMs like ChatGPT exhibit measurable political bias (confirmed as progressive/liberal/pro-environment, aligning with Swiss Green Liberal Party). This paper fine-tunes Llama 3 8B on 100,000 real comments from Swiss parliamentary candidates using **conditional generation + ORPO** (Odds Ratio Preference Optimization). The resulting model generates party-specific political stances that are **more diverse, more accurate, and preferred by human evaluators** compared to ChatGPT. They also propose a simple pipeline to generate **balanced multi-perspective overviews** from the aligned model.

### Why This Matters for FactHarbor

This paper is directly relevant to FactHarbor's core challenges:

1. **LLM bias is real and measurable.** ChatGPT's political alignment was empirically verified (58% overlap with Swiss Green Liberal Party). Any fact-checking system using LLMs inherits this bias unless actively mitigated.
2. **Preference optimization (ORPO/DPO) can separate subtle viewpoints.** The technique pushes apart responses that differ only in nuance — exactly what FactHarbor needs for distinguishing claim directions and evidence interpretations.
3. **"Balanced overviews" as a design pattern.** Their two-step approach (generate per-perspective stances, then synthesize) parallels FactHarbor's multi-evidence verdict aggregation.
4. **Conditional generation on metadata.** Their prompt template conditions on party + language + issue — analogous to conditioning on EvidenceScope + SourceType + claim direction.
5. **Evidence that zero-shot LLMs produce false consensus.** ChatGPT generates near-identical responses for all parties, creating an illusion of agreement. This directly threatens fact-checking systems that rely on zero-shot LLM reasoning about contested topics.

---

## 2. Problem Statement

LLMs have become ubiquitous decision aids, and research confirms that chatbot interactions can shift user views and behaviors. In the political domain this could influence elections — "one of the most important decision-making processes in democracies." Yet:

- All first-generation LLMs exhibit identifiable political biases (Rozado 2023; Hartmann et al. 2023; Motoki et al. 2024; Rutinowski et al. 2024)
- ChatGPT specifically shows progressive, liberal, and pro-environmental biases
- When asked to represent diverse viewpoints, ChatGPT produces near-identical responses across parties (Jaccard similarity ~0.48)

---

## 3. Dataset: Smartvote

| Property | Value |
|----------|-------|
| **Source** | [smartvote.ch](https://smartvote.ch) — Swiss voting advice application |
| **Size** | ~100,000 candidate comments |
| **Questions** | ~200 distinct political issues |
| **Election cycles** | 2015, 2019, 2023 |
| **Languages** | German (75.5%), French (22.2%), Italian (2.2%) |
| **Adoption** | 85% of Swiss candidates have a profile; 1 in 5 voters consult it |
| **Metadata** | 33 attributes: party, language, canton, age, profession, stance |
| **Splits** | Train: 92,986 / Dev: 4,262 (7 unseen 2023 issues) / Test: 5,488 (7 unseen 2023 issues) |

Key property: Candidates write free-text **comments explaining their positions**, not just yes/no answers. This gives genuine human-authored political reasoning tied to party identity.

---

## 4. Methodology

### 4.1 Conditional Generation

The prompt template conditions generation on structured metadata:

> "You are a helpful Swiss policy advisor. You are in political party **P**, and you reply in **L**" — responding to question **Q**.

This is conceptually simple but powerful: the model learns that the same question Q should produce different responses depending on party P.

### 4.2 ORPO (Odds Ratio Preference Optimization)

The core alignment technique. ORPO is a **monolithic** preference optimization method that combines SFT and preference learning in a single loss:

```
L_ORPO = E[(x, y_w, y_l)] [L_SFT + lambda * L_OR]
```

Where:
- `y_w` = preferred response (comment from party P on issue Q in language L)
- `y_l` = rejected response (comment on **same** issue in **same** language but from a **different** party)
- The odds ratio loss increases preferred choice likelihood while decreasing rejected choice likelihood

**Key insight:** ORPO "pushes apart comments with different metadata, although they might only differ in subtle nuances." This is the critical capability — distinguishing positions that use similar language but express different political stances.

### 4.3 Implementation

| Detail | Value |
|--------|-------|
| Base model | Llama 3 8B (4-bit quantized, unsloth) |
| Fine-tuning | LoRA (Low-Rank Adaptation) |
| Framework | Hugging Face TRL library |
| Alternatives tried | DPO and RLHF — "unsatisfactory outputs" without hyperparameter tuning |

### 4.4 Balanced Overviews Procedure

A simple two-step pipeline:

1. **Generate:** For a given policy question, generate position statements for each political party using the aligned model
2. **Synthesize:** Feed all party positions to GPT-4o to create a balanced summary

**Result comparison (question: "Should the state promote equal educational opportunities?"):**
- **ChatGPT zero-shot:** False consensus — suggests all parties support tuition vouchers for low-income families
- **ORPO-aligned model:** Accurately captures real disagreements — SP emphasizes equality, Die Mitte inclusive funding, FDP cantonal responsibility, SVP rejects focus on low-achievers

---

## 5. Results

### 5.1 Diversity (Jaccard Similarity — lower = more diverse)

| Model | Avg Similarity |
|-------|---------------|
| ChatGPT zero-shot | 0.48 |
| ChatGPT few-shot | 0.34 |
| Llama 3 SFT | 0.33 |
| **Llama 3 ORPO** | **0.24** |

ORPO achieves **50% reduction** in cross-party similarity vs. ChatGPT zero-shot.

### 5.2 Accuracy (MAUVE Score — higher = closer to human references)

| Model | Dev | Test | Combined |
|-------|-----|------|----------|
| ChatGPT zero-shot | 0.36 | 0.25 | 0.24 |
| Llama 3 zero-shot | 0.27 | 0.03 | 0.08 |
| GPT-4o zero-shot | 0.22 | 0.25 | 0.16 |
| ChatGPT few-shot | 0.49 | 0.59 | 0.49 |
| Llama 3 SFT | 0.48 | 0.48 | 0.38 |
| **Llama 3 ORPO** | **0.63** | **0.71** | **0.64** |

ORPO-aligned model achieves **highest scores across all splits**. Even few-shot ChatGPT (0.49) falls far behind.

### 5.3 Human Evaluation

- Cohen's kappa: 0.55 overall, **0.84 excluding ties** (near-perfect agreement)
- ORPO preferred in **~60% of comparisons**
- When ORPO loses, it's primarily on nuance (44% win rate), not accuracy (60% win rate)
- Evaluators: Swiss political science graduate + Swiss city mayor for gold standard deliberation

---

## 6. Related Work & Elliott Ash's Research Context

### Papers Cited in This Work
- **Rozado 2023; Hartmann et al. 2023; Motoki et al. 2024; Rutinowski et al. 2024** — Political bias documentation in ChatGPT
- **Jiang et al. 2022 (CommunityLM)** — Aligned models with specific political leanings using dedicated corpora
- **Feng et al. 2024** — Concurrent work: fine-tunes ensembles of community-aligned models for balanced overview generation
- **Bakker et al. 2022** — Consensus statements generation
- **Zellers et al. 2019; Zhou et al. 2023** — Conditional text generation with metadata

### Elliott Ash's Related Work (for meeting context)

Elliott Ash is Associate Professor of Law, Economics, and Data Science at ETH Zurich. His research combines applied microeconometrics with NLP/ML/AI to understand law and politics.

| Paper | Venue | Relevance |
|-------|-------|-----------|
| **AFaCTA** (Ni, Shi, Stammbach, Sachan, Ash, Leippold) | ACL 2024 | LLM-assisted annotation for factual claim detection; created PoliClaim dataset. Uses calibrated confidence along 3 predefined reasoning paths. Directly relevant to claim extraction and factual verification. |
| **LePaRD** (Mahari, Stammbach, Ash, Pentland) | ACL 2024 | Large-scale judicial citation dataset. Shows Ash's interest in structured evidence retrieval from authoritative sources. |
| **Climinator** (Stammbach, Leippold, Ash et al.) | npj Climate Action 2025 | Automated fact-checking of climate claims using a **Mediator-Advocate framework** — multiple LLMs debate against authoritative sources (IPCC reports, peer-reviewed literature). Achieved >96% binary classification accuracy. Architecture is a multi-LLM debate pattern grounded in deliberation literature. |
| **Apertus** (Ash, Ni, Hoyle et al.) | 2025 | First large-scale open multilingual language model. Demonstrates investment in multilingual LLM capabilities. |

### Dominik Stammbach (lead author)

Now a postdoctoral researcher at Princeton CITP/Polaris Lab. PhD from ETH Zurich (Spring 2024) on **data-centric automated fact-checking** — investigating how to extract relevant evidence from long documents and exploring the roles of different knowledge bases in automated fact checking. His current focus: legal NLP, misinformation detection (climate change, greenwashing), and AI for access to justice.

---

## 7. Key Takeaways & Discussion Points

### What's Strong
1. **Clean experimental design.** Real political data from a well-adopted platform, not synthetic scenarios.
2. **ORPO over DPO/RLHF.** Monolithic loss is simpler and worked better out-of-the-box. One training pass instead of two.
3. **Balanced overviews are practical.** The generate-per-perspective-then-synthesize pattern is immediately applicable.
4. **Multilingual by nature.** Swiss data spans German/French/Italian — alignment works across languages.
5. **Replicable.** Code and data are public.

### Limitations & Open Questions
1. **Only Llama 3 8B tested.** No 70B, no Mistral/Mixtral results. Larger models might not need as much alignment.
2. **Swiss-specific.** Transferability to other countries' political landscapes is claimed but not demonstrated.
3. **Small human evaluation.** Primarily one annotator + deliberation with a mayor. Not a large-scale evaluation.
4. **DPO/RLHF dismissed quickly.** Authors didn't tune hyperparameters — these might work with more effort.
5. **Metadata alignment beyond party failed.** Attempts to condition on canton, age, gender (with Mistral + DPO) failed. Llama 3 + ORPO might succeed but untested.
6. **No analysis of hallucination rates** in aligned vs. unaligned models.
7. **Temporal decay.** Data spans 2015-2023; party positions evolve. No evaluation of temporal robustness.

### Questions to Explore with Elliott Ash

1. **AFaCTA's 3-reasoning-path calibration** for factual claim detection — how well does this transfer beyond political speech? Has it been tested on mixed-domain claims?
2. **Climinator's Mediator-Advocate framework** — what did they learn about debate convergence? How many rounds? When does it fail? How does the mediator decide?
3. **ORPO for evidence interpretation?** Could ORPO-style preference optimization help align models to distinguish between "evidence supports claim" vs. "evidence opposes claim" when the textual difference is subtle?
4. **Multilingual alignment:** Apertus and this paper both handle multilingual content. What are the practical gotchas for analysis across languages?
5. **Balanced overviews at scale:** Their generate-then-synthesize approach works for ~10 parties. How would it scale to dozens of evidence sources with varying reliability?
6. **Political bias in fact-checking:** If LLMs have measurable political bias, what safeguards do they recommend for fact-checking systems that must remain neutral?
7. **Data collection for alignment:** Smartvote gave them 100K labeled examples. For fact-checking, where would equivalent training data come from?

---

## 8. Three Strategic Positions on LLMs and Political Content

The paper proposes three approaches (worth discussing):

1. **Refuse entirely.** LLMs should decline to generate political opinions, prioritizing impartiality.
2. **Always produce balanced overviews.** Every political query gets a multi-perspective summary.
3. **Transparent alignment.** LLMs explicitly declare their political alignment and give users control to switch perspectives.

---

## 9. Technical Details for Reference

### ORPO Loss Function
```
L_ORPO = E[(x, y_w, y_l)] [L_SFT + lambda * L_OR]

Where:
- L_SFT = standard supervised fine-tuning loss on preferred responses
- L_OR = odds ratio loss that increases P(y_w) while decreasing P(y_l)
- lambda = weighting hyperparameter
```

### Prompt Template
```
System: You are a helpful Swiss policy advisor. You are in political party {P},
        and you reply in {L}.
User: {Q}
```

### Evaluation Metrics
- **Jaccard similarity:** Word overlap between party-specific generations (diversity measure)
- **MAUVE score:** Distributional gap between generated and human-reference text (quality measure, uses multilingual RoBERTa embeddings)
- **Human evaluation:** Pairwise preference with Cohen's kappa agreement

### ChatGPT Bias Verification Method
They completed the 2023 Swiss smartvote survey with ChatGPT (temperature=0) using a forced-choice system prompt. Result: 58% of highest-overlap candidates were from the Green Liberal Party (GLP/JGLP), confirming progressive bias in the Swiss context.

---

## 10. Key References

- Stammbach et al. (2024). Aligning Large Language Models with Diverse Political Viewpoints. EMNLP 2024. [Link](https://aclanthology.org/2024.emnlp-main.412/)
- Ni et al. (2024). AFaCTA: Assisting the Annotation of Factual Claim Detection with Reliable LLM Annotators. ACL 2024. [Link](https://aclanthology.org/2024.acl-long.104/)
- Stammbach, Leippold et al. (2025). Automated fact-checking of climate claims with large language models. npj Climate Action. [Link](https://www.nature.com/articles/s44168-025-00215-8)
- Mahari, Stammbach, Ash, Pentland (2024). LePaRD: A Large-Scale Dataset of Judicial Citations to Precedent. ACL 2024.
- Elliott Ash's research profile: [elliottash.com](https://elliottash.com/) | [ETH Zurich](https://lawecon.ethz.ch/group/professors/ash.html)
- Dominik Stammbach: [Princeton CITP](https://citp.princeton.edu/people/dominik-stammbach/) | [Personal site](https://dominik-stammbach.github.io/)
- Code/Data: [github.com/dominiksinsaarland/swiss_alignment](https://github.com/dominiksinsaarland/swiss_alignment)
