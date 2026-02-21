# What FactHarbor Can Learn from Climinator

**Paper:** Leippold, Vaghefi, Stammbach et al. (2025). *Automated fact-checking of climate claims with large language models.* npj Climate Action.
**Links:** [Nature](https://www.nature.com/articles/s44168-025-00215-8) | [arXiv](https://arxiv.org/abs/2401.12566)
**Reviewed by:** Claude Opus 4.6 (2026-02-21)

---

## 1. Climinator in Brief

**CLImate Mediator for INformed Analysis and Transparent Objective Reasoning.**

A Mediator-Advocate debate framework for automated climate claim fact-checking. Multiple LLM advocates — each grounded in a distinct knowledge corpus via RAG — independently evaluate claims. A mediator LLM synthesizes verdicts, and when advocates disagree, it drives iterative debate via follow-up questions until convergence.

### Architecture

```
Claim
  ├─ Advocate 1 (IPCC AR6 corpus via RAG + GPT-4o)
  ├─ Advocate 2 (WMO reports via RAG + GPT-4o)
  ├─ Advocate 3 (290K climate abstracts via RAG + GPT-4o)
  ├─ Advocate 4 (190K top-scientist abstracts via RAG + GPT-4o)
  ├─ Advocate 5 (GPT-4o general, no RAG) — Climinator+ variant
  └─ [Optional] Advocate 6 (NIPCC denial corpus via RAG + GPT-4o)
         │
         ▼
     Mediator (GPT-4o)
       ├─ Consensus? → Final verdict
       └─ Disagreement? → Follow-up questions → Advocates reassess → Loop
```

### Performance

| Task | Accuracy |
|------|----------|
| Binary (correct/incorrect) | >96% (Climate Feedback), >99% (Skeptical Science) |
| 5-class | 72.7% (vs GPT-4o zero-shot 56.5%) |
| 7-class | 62.9% |
| NIPCC adversary → reconvergence | 95.3% after 2 debate rounds |

### Verdict Taxonomy

- **7 classes:** incorrect, mostly inaccurate, unsupported, lacks context, imprecise, mostly accurate, correct
- **5 classes:** incorrect, misleading, mostly accurate, correct, context-dependent
- **2 classes:** correct / incorrect
- **NEI:** "Not Enough Information" — explicit first-class verdict

---

## 2. Architecture Comparison

| Dimension | Climinator | FactHarbor |
|-----------|-----------|------------|
| **Debate structure** | Dynamic rounds until convergence | Fixed 5-step (advocate → consistency → challenge → reconcile → validate) |
| **Advocate diversity source** | Knowledge-base separation (5 corpora) | Model/provider separation (4 debate profiles) |
| **Adversarial role** | Corpus-backed contrarian (NIPCC) | Prompt-directed challenger (same evidence pool) |
| **Mediator behavior** | Asks follow-up questions, drives iterative reassessment | Single-pass reconciliation decision |
| **Evidence source** | Curated RAG corpora (IPCC, WMO, abstracts) | Live web search |
| **Verdict format** | 7/5/2-class categorical | Continuous truthPercentage (0-100) |
| **Convergence signal** | All advocates agree → stop | Fixed pipeline, consistency measured by temperature spread |
| **Models** | GPT-4o (all roles, different corpora) | Sonnet/Haiku (configurable per role + provider) |
| **Claim decomposition** | Decomposes complex claims into subclaims | AtomicClaim extraction in Stage 1 (aligned) |
| **NEI handling** | Explicit first-class verdict | UNVERIFIED (triggered by low confidence or pipeline failure) |

---

## 3. Lessons and Actionable Opportunities

### Lesson 1: Knowledge Diversity > Model Diversity

**Climinator's key insight:** Power comes from advocates drawing on *different knowledge bases*, not different models. All five advocates use GPT-4o — what differs is the corpus each retrieves from (IPCC, WMO, scientific abstracts, top-scientist papers, general knowledge).

**FactHarbor's current approach:** Diversity comes from model/provider separation (`cross-provider`, `max-diversity` profiles). The challenger uses the same evidence pool as the advocate — it's prompted to argue differently, not equipped with different knowledge.

**Actionable opportunity:** After web search (Stage 2), partition the evidence pool by source type and assign different evidence subsets to different debate roles:
- Advocate A: peer-reviewed + institutional sources only
- Advocate B: news/media + general sources only
- Reconciler: sees everything

This is cheaper than adding RAG corpora and achieves the structural independence that makes Climinator effective. The `sourceType` field on `EvidenceItem` already enables this partitioning.

**Effort:** Medium. No new infrastructure — route existing filtered evidence differently into debate prompts.

---

### Lesson 2: Iterative Debate with Convergence Detection

**Climinator:** Debates run dynamically. When advocates disagree, the mediator generates follow-up questions and advocates reassess. This repeats until convergence or a maximum. For straightforward claims, zero rounds needed. For contested claims with NIPCC adversary, 2 rounds typically suffice — but cases needing up to 18 rounds were observed.

**FactHarbor:** Fixed single-pass: one challenge, one reconciliation. The reconciler decides in one shot. No ability to say "I need more information" or "advocates, reconsider this point."

**Actionable opportunity:** Add an optional iterative loop in Step 4 (reconciliation):
```
while (!converged && round < maxRounds) {
  reconcile → check if challenger's points were adequately addressed
  if unresolved challenges remain → re-prompt advocate with specific questions
  round++
}
```

Trigger extended debate only when spread > `unstableThreshold` or when the challenger raises evidence-backed challenges. On uncontested claims, skip additional rounds (Climinator shows zero rounds needed for clear claims).

**Key Climinator finding:** Forcing convergence through iterative questioning dramatically improved accuracy on contested claims. FactHarbor should add `debateDepthMode: "fixed" | "adaptive"` as a UCM config.

**Effort:** Medium-High. Loop logic in verdict-stage, new prompts for mediator follow-up questions, convergence detection heuristic.

---

### Lesson 3: The Adversarial Corpus Test (NIPCC Pattern)

**Climinator's most striking finding:** Adding a climate-denial advocate (backed by NIPCC reports) shifted initial verdicts dramatically (57→155 incorrect classifications). But after iterative debate, the system reconverged to >95% accuracy. Even more telling: the NIPCC advocate couldn't validate its own source material — it classified 58 of 81 NIPCC executive-summary claims as "not enough information," exposing internal incoherence in denial literature.

**What this means for FactHarbor:** The current challenger is prompt-directed but draws from the same evidence pool. For politically charged claims (C10 baseline: 27.6pp mean skew), a structurally independent contrarian that searches for counter-evidence using different search queries would surface genuine vs. manufactured controversy.

**Actionable opportunity:** In Stage 2 (research), add an optional "contrarian search pass":
- After main evidence search, generate inverted search queries (if claim is "X is good", search for "X problems", "X criticism", "X failure")
- Tag results with `searchStrategy: "contrarian"` marker
- Feed them to the challenger role specifically
- Track whether contrarian evidence survives the evidence filter (probativeValue assessment)

This directly addresses C13 (evidence pool bias, 8/10 pairs in baseline). The Climinator finding suggests that weak contrarian evidence self-destructs through debate — no risk of false balance because low-quality counter-evidence gets filtered or loses in reconciliation.

**Effort:** Medium. Extends existing search infrastructure with query inversion and tagging.

---

### Lesson 4: Mediator as Question-Asker, Not Just Decision-Maker

**Climinator's mediator doesn't decide — it interrogates.** When advocates disagree, the mediator generates specific follow-up questions ("Advocate A cited IPCC AR6 Chapter 4 saying X, but Advocate B found WMO data showing Y — can you reconcile?"). This forces advocates to re-examine their reasoning with targeted prompts.

**FactHarbor's reconciler decides.** It receives advocate verdicts + consistency data + challenges and produces final verdicts in a single LLM call. It never asks the advocate to reconsider specific points.

**Actionable opportunity:** Before reconciliation, add a "mediator question" step:
1. Identify specific disagreements (challenger point vs. advocate position)
2. Generate targeted questions about those disagreements
3. Re-prompt the advocate with those specific questions + the challenged evidence
4. Feed the refined advocate response into reconciliation

This is particularly valuable for claims with high spread (>20pp). The current approach applies a 0.4x confidence multiplier for instability — punishing uncertainty rather than resolving it. A mediator question could turn "highly unstable" verdicts into "moderately stable" ones with better reasoning.

**Effort:** Medium. One additional LLM call (Haiku-class) between Steps 3 and 4.

---

### Lesson 5: "Not Enough Information" as a First-Class Verdict

**Climinator treats NEI explicitly.** When advocates can't find sufficient evidence, they say so. The WMO advocate returns NEI for 46% of Skeptical Science claims — this is informative, not a failure.

**FactHarbor has UNVERIFIED** but it's triggered by low confidence (C8 high-harm floor) or pipeline failure, not by deliberate evidence sufficiency assessment. The pipeline always produces a truthPercentage, even when evidence is thin.

**Actionable opportunity:** Add an explicit evidence-sufficiency gate before verdicts:
- Count evidence items per claim after filtering
- If below a minimum threshold (e.g., <3 items, or <2 directional items), classify as INSUFFICIENT_EVIDENCE rather than producing a potentially unreliable percentage
- Prevents the "confident answer from thin evidence" failure mode

Some claims in the calibration baseline get verdicts based on 2-3 evidence items from a single source type. A thin-evidence verdict looks authoritative but isn't.

**Effort:** Low. Deterministic check on evidence count per claim, fits naturally into evidence-filter.ts or as a pre-verdict gate.

---

### Lesson 6: Claim Decomposition Before Verdict

**Climinator decomposes complex claims into subclaims** and evaluates each independently. Example: "Amazon tipping point will destroy 60% of the forest" → (1) "Is there an Amazon tipping point?" and (2) "Will it affect 60% of the forest?" — yielding "mostly accurate" on concept but "imprecise" on percentage.

**FactHarbor already does this** via AtomicClaim extraction in Stage 1.

**No action needed.** Design is aligned. Worth noting in discussions as a validation of the architecture.

---

### Lesson 7: Convergence Speed as Quality Signal

**Climinator uses convergence speed as diagnostic metadata.** Claims converging in 0 rounds are unambiguous. Claims needing 2+ rounds are genuinely contested. Claims needing 18 rounds reveal real scientific controversy. The metadata is itself informative.

**FactHarbor measures spread** (temperature-based consistency) but has no convergence behavior because debate is single-pass.

**Actionable opportunity:** If iterative debate (Lesson 2) is implemented, track `debateRoundsToConvergence` per claim:
- 0 rounds: clear-cut claim, high confidence warranted
- 1-2 rounds: normal contestation, evidence resolves it
- 3+ rounds: genuinely ambiguous, flag for user attention
- Max rounds without convergence: explicitly contested, report as such

Maps directly to `truthPercentageRange` width — claims needing more rounds should have wider ranges.

**Effort:** Low (incremental on top of Lesson 2).

---

### Lesson 8: Prompt Neutrality Engineering

**Climinator explicitly modifies the mediator prompt to "avoid potential biases in favor of climate science"** — even though all corpora are scientific. The team recognized that framing the mediator as a domain expert biases verdicts.

They also found that small prompt modifications (prepending "This claim is made in a climate-change context") dramatically reduced NEI misclassifications.

**FactHarbor's prompt rules already address this** (AGENTS.md: no hardcoded keywords, no test-case terms, generic prompts). But the calibration baseline shows language-dependent skew (English 47pp, French 2pp), suggesting prompts may carry English-specific framing biases.

**Actionable opportunity:** Audit verdict-stage prompts (`apps/web/prompts/`) for:
- English-centric framing assumptions
- Implicit cultural context that works differently in French/German
- Whether the reconciler prompt is neutral between advocate and challenger (or subtly favors the advocate)

**Effort:** Low-Medium. Prompt review + A/B calibration testing.

---

## 4. Priority-Ranked Action Items

| Priority | Lesson | Impact on Known Issues | Effort |
|----------|--------|----------------------|--------|
| **1** | Evidence sufficiency gate (L5) | Prevents thin-evidence verdicts | Low |
| **2** | Contrarian search pass (L3) | Directly addresses C13 (evidence pool bias, 8/10 pairs) | Medium |
| **3** | Evidence partitioning by source type (L1) | Structural advocate independence without new infra | Medium |
| **4** | Mediator question step (L4) | Resolves instability instead of just penalizing it | Medium |
| **5** | Iterative debate with convergence (L2) | Adaptive depth for contested claims | Medium-High |
| **6** | Prompt neutrality audit (L8) | Language skew (En 47pp vs Fr 2pp) | Low-Medium |
| **7** | Convergence-speed tracking (L7) | Better truthPercentageRange calibration | Low (on top of L5) |

Items 1-3 are the highest-value, lowest-risk improvements. Item 2 (contrarian search) is the single most impactful change because it addresses the dominant bias source in the baseline (evidence pool asymmetry in 8/10 pairs).

---

## 5. Climinator Ecosystem — Active Development

Climinator is being actively developed by [Climate+Tech](https://climateandtech.com/en/research-projects/climate-fact-checker-collaboration), led by Prof. Markus Leippold (UZH) with TU Berlin, DFKI, and others.

**2025-2026 Roadmap:**
- Q2 2025: External knowledge integration (Wikipedia, authoritative sources)
- Q3 2025: Large fine-tuned dataset for standardized evaluation
- Q4 2025: Knowledge graph integration
- 2026: Real-world deployment with expert fact-checkers
- Expanding beyond climate to political fact-checking

FactHarbor builds a general-purpose fact-checker. Climate+Tech is moving from climate-specific toward general political claims. Natural overlap for collaboration.

---

## 6. References

- Leippold et al. (2025). Automated fact-checking of climate claims with large language models. npj Climate Action. [Nature](https://www.nature.com/articles/s44168-025-00215-8) | [arXiv](https://arxiv.org/abs/2401.12566)
- [Building Climinator (Springer Nature blog)](https://communities.springernature.com/posts/building-climinator-to-combat-misinformation-in-a-changing-climate)
- [Climinator overview (Climate+Tech)](https://climateandtech.com/en/resources/research-papers/climinator-ai-climate-fact-checking)
- [Climate+Tech collaboration roadmap](https://climateandtech.com/en/research-projects/climate-fact-checker-collaboration)
- FactHarbor meeting prep: [Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md](Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md)
