# Anti-Hallucination Strategies for AI Systems

**Status:** REFERENCE (evaluate for FactHarbor applicability)
**Source:** External research / best practices compilation
**Created:** 2026-02-09
**Backlog:** See `Docs/STATUS/Backlog.md` — "Anti-hallucination strategy review"

---

## Source Constraint Method

- Only allow AI to reference pre-approved knowledge bases and documents
- Upload verified information to your Claude projects or custom GPTs
- Force AI to cite specific sources for every factual claim
- Reject any response that includes unsourced information

## Multi-Model Cross-Verification

- Run critical queries through multiple AI models (Claude, GPT, Gemini)
- Compare responses and flag discrepancies for manual review
- Use consensus-based decision making for important facts
- Document which models perform best for specific domains

## Structured Prompting Techniques

- Explicitly instruct AI to say "I don't know" when uncertain
- Request confidence levels for each claim (high/medium/low certainty)
- Ask for step-by-step reasoning to trace thought processes
- Use negative prompting: "do not make up information"

## Human Verification Protocols

- Mandatory fact-checking for any AI output used in decisions
- Establish clear review processes before publishing AI-generated content
- Create checklists of common hallucination patterns to watch for
- Maintain updated lists of topics where AI frequently hallucinates

## Domain-Specific Knowledge Curation

- Build curated datasets for your specific industry or use case
- Regularly update knowledge bases with verified current information
- Train custom models on validated data when possible
- Establish clear boundaries for what AI should and shouldn't know

---

## Key Takeaway

You can't eliminate hallucinations entirely, but you can build systems that catch them before they cause problems.

---

## Consolidated FactHarbor Risk Assessment

This table merges the general anti-hallucination strategies with the pipeline-specific knowledge cliff exposure into a single risk view. Risks are ordered by severity.

### Risk Matrix

| # | Risk | Pipeline Stage(s) | Severity | Likelihood | Current Defense | Gap | Proposed Measure | Cost | Priority |
|---|------|-------------------|----------|------------|-----------------|-----|------------------|------|----------|
| **R1** | **Bounce-back in verdict**: LLM fills evidence gaps with confident hallucinated "knowledge" from training data | Verdict | **Critical** | High (every time-sensitive claim) | Verdict prompt says "base on evidence"; Knowledge Cutoff Awareness section exists | No explicit "do NOT use your own knowledge"; no negative prompting; no grounding check | **M1**: Add negative prompting to verdict: "If evidence is insufficient, say so. Do NOT fill gaps with your own knowledge." | Zero (prompt edit) | **P0** |
| **R2** | **Undetected knowledge leakage**: Verdict contains claims not traceable to any EvidenceItem — invisible to user | Verdict, Report | **Critical** | Medium | None | No post-verdict grounding validation exists | **M2**: Post-verdict grounding check — compare verdict statements against EvidenceItem pool, flag `[UNGROUNDED]` claims | 1 LLM call or heuristic per verdict | **P1** |
| **R3** | **Confidence not calibrated to evidence**: LLM reports high confidence even when verdict heavily relies on inference rather than evidence | Verdict | **High** | High | Confidence is LLM-estimated (subjective) | Confidence does not reflect evidence coverage ratio | **M3**: Compute `grounding_ratio = grounded_claims / total_claims`. If < 0.7 → auto-reduce confidence 20%, flag in report | Post-processing only | **P1** |
| **R4** | **Stale priors contradict fresh evidence**: LLM trained on old data discounts or ignores contradictory web evidence in favor of training-time "knowledge" | Verdict | **High** | Medium (when consensus shifted post-cutoff) | Knowledge Cutoff Awareness prompt section | Prompt warns about cutoff but doesn't enforce evidence-over-priors hierarchy | **M4**: Strengthen verdict prompt: "When web evidence contradicts your training knowledge, ALWAYS defer to the web evidence. Your training data may be outdated." | Zero (prompt edit) | **P0** |
| **R5** | **Context Refinement uses stale world model**: LLM creates AnalysisContexts based on outdated understanding (dissolved institutions, changed jurisdictions) | Context Refinement | **Medium** | Low-Medium | SAME QUESTION RULE; context-drift guard | No check that context entities actually exist in provided evidence | **M5**: Validate that each AnalysisContext references at least one entity mentioned in the evidence pool. Orphan contexts = warning | Heuristic check | **P2** |
| **R6** | **Understand misclassifies recency**: LLM labels a post-cutoff event as "well-known" or "historical" based on training data | Understand | **Medium** | Medium | Time-sensitive claim detection exists (partial) | Detection relies on LLM judgment which may itself be miscalibrated | **M6**: Cross-check: if claim contains recent dates (current year, last 12 months) → force `timeSensitive=true` regardless of LLM classification | Heuristic, zero LLM cost | **P2** |
| **R7** | **No second opinion on high-stakes verdicts**: Single LLM hallucination goes undetected — no cross-verification | Verdict | **High** | Low (most verdicts are fine) | None | Single point of failure for verdict accuracy | **M7**: Optional multi-model cross-verification — run verdict through 2nd provider, flag discrepancies > threshold | 2x verdict cost (only for flagged claims) | **P3** |
| **R8** | **Web search results are unconstrained**: Search may return low-quality sources; no pre-approved knowledge base | Extract Evidence | **Medium** | Medium | `sourceAuthority` + `probativeValue` filtering; deterministic opinion filter; relevance pre-filter | No source allowlist/blocklist; no domain quality scoring beyond SR cache | **M8**: Integrate domain quality signals (existing SR cache + optional MBFC/NewsGuard) into relevance pre-filter weighting | Implementation effort; external data dependency | **P3** |
| **R9** | **No hallucination-pattern checklist for users**: User sees report but has no guidance on what to verify | Report (user-facing) | **Low** | — | Report shown to user | No "how to verify this report" guidance | **M9**: Add brief "Verification hints" footer to reports: what to double-check, which claims had low evidence coverage | Template change | **P3** |
| **R10** | **Domain knowledge curation**: No maintained list of hallucination-prone topics | System-wide | **Low** | — | Not applicable (domain-agnostic system) | Could maintain known-problematic topic categories | **M10**: Defer — FactHarbor is domain-agnostic by design. Revisit only if recurring hallucination patterns emerge in a specific domain | None | **Deferred** |

### Priority Summary

| Priority | Measures | Cost | Impact on Report Quality |
|----------|----------|------|--------------------------|
| **P0 — Do now** | M1 (negative prompting), M4 (evidence-over-priors) | Zero — prompt edits only | High — directly prevents bounce-back hallucination in verdicts |
| **P1 — Next** | M2 (grounding check), M3 (confidence calibration) | Low — post-processing + 1 optional LLM call | High — detects and signals when verdict outpaces evidence |
| **P2 — Plan** | M5 (context entity validation), M6 (recency cross-check) | Low — heuristic checks | Medium — reduces upstream errors feeding into verdict |
| **P3 — Backlog** | M7 (multi-model), M8 (source quality), M9 (user checklist) | Medium to High | Medium — safety nets and transparency |
| **Deferred** | M10 (domain curation) | None | Low — not aligned with domain-agnostic design |

### FactHarbor's Structural Advantage

It is worth noting that FactHarbor's architecture **already avoids the worst hallucination scenario** by design:

> The LLM never generates evidence from its own knowledge. All evidence comes from web search results processed through extraction. The LLM's role is to **evaluate** provided evidence, not to **invent** it.

This means the primary risk is not fabricated evidence (that's blocked by the pipeline), but rather:
1. **Fabricated reasoning** in the verdict (gap-filling between real evidence items)
2. **Miscalibrated confidence** (high confidence without proportional evidence)
3. **Stale priors influencing judgment** (training knowledge overriding web evidence)

Measures M1-M4 (P0+P1) directly target all three of these risks at near-zero cost.

---

## The Knowledge Cliff: Temporal Blindness and "Bounce-Back" Hallucination

**Added:** 2026-02-09
**Based on:** Research from [Temporal Blind Spots in Large Language Models (WSDM 2024)](https://dl.acm.org/doi/10.1145/3616855.3635818), [OpenAI confidence calibration research (Sep 2025)](https://arxiv.org/html/2510.06265v2), [Duke University hallucination survey (Jan 2026)](https://blogs.library.duke.edu/blog/2026/01/05/its-2026-why-are-llms-still-hallucinating/), and related LinkedIn discussion.

### The Phenomenon

LLMs have a hard **knowledge boundary** at their training data cutoff date. What happens at and beyond this boundary is not a gradual fade — it's a **cliff with a dangerous bounce**:

```
                        KNOWLEDGE CLIFF + BOUNCE-BACK HALLUCINATION

  Accuracy
  100% |████████████████████▓▓▓▓░░░░
       |████████████████████▓▓▓░░░░░░
       |████████████████████▓▓░░░░░░░░      ← "Bounce-back zone":
       |████████████████████▓░░░░░░░░░░       LLM generates CONFIDENT
       |████████████████████░░░░░░░░░░░       but FABRICATED answers
   50% |████████████████████───────────
       |████████████████████           ░░░░░  ← Hallucination rate
       |████████████████████          ░░░░░░    INCREASES sharply
       |████████████████████         ░░░░░░░
       |████████████████████        ░░░░░░░░
    0% └──────────────────────────────────────→ Time
       Training data          Cutoff    Beyond
       (high accuracy)        date      cutoff
                                 │
                                 ▼
                          THE WALL / CLIFF
```

### Three Zones of LLM Knowledge

**Zone 1: Solid Ground** (well within training data)
- High accuracy, good calibration
- Model has seen information multiple times across sources
- Confidence correlates with actual accuracy

**Zone 2: The Cliff / Degradation Zone** (near cutoff)
- Accuracy drops steeply
- Information was seen fewer times, or only in early/incomplete forms
- Model may confuse draft policies with final ones, preliminary results with conclusions
- Research shows a "recency bias" — even within training data, more recent facts are less reliably memorized

**Zone 3: The Bounce-Back** (beyond cutoff — MOST DANGEROUS)
- The model has **zero** real knowledge
- But instead of saying "I don't know", it **fabricates plausible-sounding answers**
- Confidence remains HIGH because:
  - RLHF training rewards confident, helpful responses over honest uncertainty
  - Next-token prediction optimizes for fluency, not factuality
  - The model extrapolates from patterns it learned, producing "reasonable-sounding fiction"
- This is the "bounce-back": the query hits the wall of ignorance, and instead of stopping, the model **bounces back** with a hallucinated response that feels authoritative

### Why "Bounce-Back" Is Worse Than Simple Ignorance

The fundamental danger: **the model does not know what it doesn't know.**

| Behavior | What User Sees | Danger Level |
|----------|---------------|-------------|
| Model says "I don't know" | Clear uncertainty signal | Low |
| Model gives low-confidence answer | User can calibrate trust | Medium |
| Model gives CONFIDENT wrong answer (bounce-back) | Indistinguishable from real knowledge | **Critical** |

The bounce-back is especially dangerous because:
1. The fabricated answer is structurally correct (proper grammar, logical flow, cited-sounding references)
2. It draws on real patterns from training data (so it "sounds right")
3. It may mix real facts (from within training window) with fabricated ones (from beyond)
4. The model's expressed confidence gives no signal that it crossed the boundary

---

## Risk Scenarios (Illustrative)

These scenarios show how the knowledge cliff manifests in FactHarbor's pipeline. Each maps to risks in the matrix above.

**Scenario 1: Outdated Institutional Knowledge** → R1, R4
- Claim: "Is Organization X trustworthy?"
- Web search provides 2025-2026 evidence showing problems
- LLM verdict draws on pre-cutoff training data where X had a good reputation
- Result: verdict mixes stale priors with fresh evidence, diluting negative findings
- Mitigated by: M1 (don't fill gaps) + M4 (defer to web evidence)

**Scenario 2: Recent Legal/Political Events** → R1, R2, R6
- Claim: "Was Trial Y fair?"
- Web search finds 2026 articles about the outcome
- LLM has no training knowledge of the trial
- Result: LLM may hallucinate procedural details to fill gaps between real evidence items
- Mitigated by: M1 (say "insufficient evidence") + M2 (flag ungrounded claims) + M6 (force timeSensitive)

**Scenario 3: Evolving Scientific Consensus** → R3, R4
- Claim: "Is Treatment Z effective?"
- Post-cutoff studies reversed earlier findings; LLM's training says Z works
- Result: LLM over-weights training priors, discounts contradictory web evidence, reports high confidence
- Mitigated by: M3 (confidence calibration) + M4 (evidence-over-priors rule)

---

## References

- [Temporal Blind Spots in Large Language Models](https://dl.acm.org/doi/10.1145/3616855.3635818) — WSDM 2024. Demonstrates degraded LLM accuracy on temporal questions, particularly near training data boundaries.
- [It's 2026. Why Are LLMs Still Hallucinating?](https://blogs.library.duke.edu/blog/2026/01/05/its-2026-why-are-llms-still-hallucinating/) — Duke University (Jan 2026). Four structural reasons hallucinations persist: benchmark bias, poor training data, design for likability, language complexity.
- [Large Language Models Hallucination: A Comprehensive Survey](https://arxiv.org/html/2510.06265v2) — 2025. Includes OpenAI finding that next-token objectives reward confident guessing over calibrated uncertainty.
- [LLMs Will Always Hallucinate](https://arxiv.org/html/2409.05746v1) — Argues hallucination is structural to the architecture, not a solvable bug.
- [Survey and Analysis of Hallucinations in LLMs](https://pmc.ncbi.nlm.nih.gov/articles/PMC12518350/) — 2025. Hallucination rates increase when data is sparse, contradictory, or low-quality.
- [Hallucination Rates in 2025](https://medium.com/@markus_brinsa/hallucination-rates-in-2025-accuracy-refusal-and-liability-aa0032019ca1) — Accuracy, refusal, and liability analysis across major models.
