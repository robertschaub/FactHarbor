# Token Reduction via Document Chunking — Debate Consolidation

**Date:** 2026-04-20
**Status:** Decision document — awaiting Captain approval before implementation
**Related:** [Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md](Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md) (existing cost optimization plan)

---

## 1. Summary

Two independent agents debated whether FactHarbor's analytical pipeline should implement document chunking to reduce token consumption. Both agents had access to the full pipeline architecture, AGENTS.md constraints, and identified risks.

**Consensus reached on 4 of 5 points. One hard disagreement resolved by architectural principle.**

---

## 2. The Three Opportunities Evaluated

| # | Stage | Location | Estimated Savings | Current Behavior |
|---|-------|----------|-------------------|------------------|
| 1 | Stage 2: Evidence Extraction | `research-extraction-stage.ts:267-269` | 80-120K tokens/job | 3-5 sources x 8K chars concatenated into single LLM prompt |
| 2 | Stage 4: Verdict Generation | `verdict-stage.ts:616, 900` | 60-100K tokens/job | All evidence items (10-30) passed to every debate role (5+ calls/claim) |
| 3 | Stage 1: Preliminary Search | `claim-extraction-stage.ts:1703-1705` | 10-14K tokens/job | Same full-source concatenation for preliminary evidence |

---

## 3. Debate Positions

### Pro-Chunking argued:
- AGENTS.md **mandates** "Minimize tokens. Lean prompts, bounded outputs, no redundant context." — the current approach violates this.
- Noise (navigation, ads, boilerplate) in source text actively degrades extraction quality — leaner input produces sharper output.
- LLM-based relevance scoring (Haiku) is AGENTS.md-compliant — it's an analytical decision made by an LLM, not a deterministic keyword filter.
- Evidence filtering for verdict can preserve fair-trial by selecting top-K per stance category, not globally.
- Every filtering decision can be logged for full audit trail.

### Anti-Chunking argued:
- "Minimize tokens" means lean prompts, not incomplete evidence — there's a difference between verbose instructions and necessary source content.
- The fair-trial design is **load-bearing architecture** — the pipeline's credibility rests on LLMs seeing ALL evidence. Filtering before verdict is like excluding evidence before trial.
- Cross-paragraph evidence is the norm in news fact-checking: "announced policy" in paragraph 3, "suspended pending review" in paragraph 19.
- Minority evidence suppression is a **disqualifying defect** for a fact-checking platform — top-K by probativeValue systematically kills the lone dissenting source that matters most.
- The 8K character cap already IS a form of chunking — further sub-chunking adds complexity without proportional benefit.
- **Measure before building** — the 436K estimate is based on maximums, not actual data.

---

## 4. Areas of Agreement (both sides)

1. **Stage 1 Preliminary (#3): DO IT.** Both concede this is safe. Preliminary evidence is low-fidelity scaffolding; failure is absorbed by later stages. Header-based chunking at 3-4K chars is low-risk, low-effort, compliant.

2. **Keyword pre-filtering is banned.** Both agree deterministic keyword filtering violates AGENTS.md's LLM Intelligence rule. Any relevance filtering must use an LLM call.

3. **Measurement is prerequisite.** The 436K token estimate is arithmetic on maximums. Before building complex chunking, instrument actual token consumption per stage per job.

4. **The current approach wastes tokens.** Boilerplate, navigation, cookie notices, and unrelated sections in fetched source text are redundant context. The question is how to remove them safely.

---

## 5. Hard Disagreement — Resolved

### Stage 4: Verdict Evidence Filtering

**Resolution: DO NOT FILTER evidence before verdict generation.**

The anti-chunking position wins on architectural grounds:

- `probativeValue` is assigned during extraction (Stage 2), before the adversarial debate begins. The challenger may reinterpret a low-scored item completely differently than the advocate did — that is the entire point of having a challenger.
- Minority evidence suppression is not a risk to monitor; it is a disqualifying defect for a fact-checking platform. The lone retraction notice contradicting 12 high-quality sources is exactly the evidence that must NOT be filtered.
- The reconciler's job is synthesis across ALL evidence. Limiting its visibility defeats its purpose.

**Safe alternative identified but not yet debated:** Summarize low-probativeValue items into a compact block instead of filtering them out. The LLM still sees everything, but in fewer tokens. This preserves the fair-trial principle while reducing token waste. **Needs further investigation before implementation.**

### Stage 2: Evidence Extraction Chunking

**Resolution: DEFER pending measurement. Improve truncation instead of sub-chunking.**

Split decision:
- Anti-chunking is right that 8K-char sources are already short — sub-chunking the chunks adds complexity with uncertain ROI.
- Pro-chunking is right that boilerplate (navigation, ads, cookie text) is pure noise that degrades quality.
- LLM-based pre-filtering (Haiku) is AGENTS.md-compliant but adds cost, latency, and failure modes — economics only work on long documents, and sources are already capped at 8K.

**Recommended path:** Improve the source text extraction/truncation at fetch time (in `research-acquisition-stage.ts`) rather than chunking downstream. Strip boilerplate before the 8K cap, not after. This is structural plumbing (allowed by AGENTS.md), not analytical decision-making.

---

## 6. Consolidated Decision Matrix

| Opportunity | Decision | Rationale | Risk | Effort |
|---|---|---|---|---|
| **#3 Preliminary chunking** | **APPROVED** | Both sides agree. Safe, compliant, easy. | Low | Low |
| **#2 Verdict evidence filtering** | **REJECTED** | Undermines fair-trial architecture. Minority suppression is disqualifying. | — | — |
| **#2 Verdict evidence summarization** | **INVESTIGATE** | Compress low-value items instead of hiding them. Needs design. | Low-Medium | Medium |
| **#1 Extraction sub-chunking** | **DEFERRED** | Uncertain ROI on 8K sources. Measure first. | High | Medium |
| **#1 Better source truncation** | **APPROVED** | Strip boilerplate at fetch time (structural, not analytical). | Low | Low-Medium |
| **Token instrumentation** | **APPROVED (prerequisite)** | Measure actual waste before building complex solutions. | None | Low |

---

## 7. Implementation Sequence

### Phase 0 — Instrument (prerequisite)

Add per-stage token counting to the pipeline. Log:
- Input tokens per LLM call (by stage)
- Source content length before/after truncation
- Evidence item count per verdict call
- Actual vs. estimated total tokens per job

**Goal:** Replace estimates with measured data.

### Phase 1 — Safe wins

1. **#3 Preliminary chunking** — header-based chunking at 3-4K chars in `claim-extraction-stage.ts:1703-1705`
2. **Better source truncation** — improve boilerplate stripping in `research-acquisition-stage.ts` at fetch time (structural text cleaning, not semantic filtering)

### Phase 2 — Measurement-driven (only with data from Phase 0)

3. **Verdict evidence summarization** — design a compact representation for low-probativeValue items that preserves visibility while reducing tokens
4. **Extraction chunking** — revisit only if Phase 0 data shows >30% of extraction tokens are genuinely wasted on irrelevant content

---

## 8. AGENTS.md Compliance Notes

| Action | AGENTS.md Rule | Compliant? |
|---|---|---|
| Header-based structural splitting | Structural plumbing (allowed) | Yes |
| Boilerplate stripping at fetch time | Input validation / normalization (allowed) | Yes |
| Keyword-based relevance filtering | Deterministic analytical decision (BANNED) | **No — do not implement** |
| LLM-based relevance scoring | LLM Intelligence rule (required for analytical decisions) | Yes |
| Evidence filtering before verdict | Not explicitly banned, but violates fair-trial design | **Rejected on design grounds** |
| Evidence summarization before verdict | LLM Intelligence (summarization is LLM task) | Yes |

---

## 9. Relationship to Existing Optimization Plan

This document extends [Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md](Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md), which notes:

> "remaining work needs a fresh validated benchmark" and "the next optimization decision is a new approval decision, not an automatic continuation"

The token instrumentation recommended here (Phase 0) serves as the "fresh validated benchmark" that plan calls for. Phase 1 safe wins can proceed independently. Phase 2 requires the same measurement-driven approval gate.

---

## 10. Key Takeaway

The biggest token savings come with the biggest risks to analytical quality — which is FactHarbor's core value. The debate resolved this clearly:

- **Do the safe things now** (preliminary chunking, better truncation, instrumentation)
- **Protect the fair-trial architecture** (never filter evidence before verdict)
- **Measure before building** (don't optimize an unmeasured problem)
- **Summarize, don't suppress** (if verdict tokens are a problem, compress — don't hide)
