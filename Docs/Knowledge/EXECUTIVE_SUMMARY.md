# Executive Summary — FactHarbor Knowledge Base

**Date:** 2026-02-21
**Scope:** All documents in `Docs/Knowledge/`

---

## Reading Guide

This knowledge base maps the academic landscape around automated fact-checking, LLM debate, and political bias — and distills what FactHarbor should learn from each. Start here, then dive into the topic that matters most.

| If you want to understand... | Read | Key takeaway |
|------------------------------|------|-------------|
| Climinator paper vs code, 11 lessons | [Climinator Analysis](Climinator_Lessons_for_FactHarbor.md) | Paper-vs-code gap is significant. FactHarbor's debate is already more sophisticated than Climinator's actual code. |
| Research network, people, projects, debate landscape | [Research Ecosystem](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md) | 10+ papers, 5 debate frameworks, 10 additional learnings. Search strategy matters more than debate architecture. |
| Meeting prep for Elliott Ash | [Meeting Prep: Ash](Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md) | EMNLP 2024 paper, Ash portfolio, FactHarbor SWOA, calibration status, meeting questions. |
| Why evidence-following appears politically biased | [Epistemic Asymmetry](Truth_Seeking.md) | The information environment is not politically symmetric. This is a property of reality, not a pipeline bug. |

---

## FactHarbor at a Glance

Autonomous fact-checking pipeline: claim → AtomicClaim extraction → iterative web search (up to 10 rounds) → evidence grouping (ClaimAssessmentBoundaries) → 5-step LLM debate (advocate × 3 + challenger + reconciler + validation) → sourced report.

Multiple LLM models (Sonnet for reasoning, Haiku for lightweight tasks) across configurable providers (Anthropic, OpenAI, Google, Mistral). ~40-50 LLM calls per analysis.

---

## Calibration Baseline v1 (2026-02-20)

| Metric | Result | Interpretation |
|--------|--------|---------------|
| **C18 failure-mode bias** | **0/10 pairs** | The LLM does NOT politically refuse or degrade. Clean. |
| **Mean directional skew** | 27.6pp | High — driven by evidence pool asymmetry, not model bias |
| **Evidence-pool bias (C13)** | 8/10 pairs | Dominant bias source. Web search returns asymmetric evidence. |
| **Extraction bias** | 0/10 | Claim extraction is neutral across all pairs and languages |
| **French pairs** | 2.0pp mean skew | Near-zero bias — same pipeline, different language |
| **English pairs** | 47.1pp mean skew | Highest skew — reflects English-language evidence asymmetry |

**Threshold policy (ratified):** C18 is the hard gate (must be 0). Verdict skew is diagnostic until C13 evidence rebalancing ships. See [Calibration_Baseline_v1.md](../STATUS/Calibration_Baseline_v1.md).

---

## Two Key Findings

### 1. Paper-vs-Code Gap

Climinator's paper architecture (iterative debate, 5-6 advocates, claim decomposition, convergence detection) is NOT implemented in the [open-source code](https://github.com/climateandtech/factchecker) — `debate.py` is empty, only 3/6 corpora exist, execution is single-round. **FactHarbor's debate is already more sophisticated than Climinator's actual implementation.** The paper's theoretical architecture remains valuable as a design reference, but should be treated as a proposal, not proven implementation.

Details: [Climinator Analysis §3](Climinator_Lessons_for_FactHarbor.md)

### 2. Epistemic Asymmetry

The calibration baseline's 27.6pp mean skew is not a bug. The academic literature confirms: the information environment is not politically symmetric, and any evidence-following system will appear to lean toward whichever coalition aligns with more factual claims. FactHarbor's design response: measure symmetric treatment (C10), not correctness of position. The C18 hard gate ensures the LLM doesn't politically refuse. C13 addresses evidence-pool asymmetry.

Details: [Epistemic Asymmetry](Truth_Seeking.md)

---

## Prioritized Action Items

Consolidated from all research documents. This is the single source of truth for priorities. Items marked * are validated in Climinator code; items marked † are paper-only (not in OSS code).

For full details on each item, follow the link to the source section.

| # | Learning | Source | Effort | Impact |
|---|---------|--------|--------|--------|
| **1** | Evidence sufficiency gate — don't verdict from thin evidence | [Climinator L5](Climinator_Lessons_for_FactHarbor.md#lesson-5-not-enough-information-as-a-first-class-verdict) | Low | Prevents bad verdicts |
| **2** | Pro/Con query separation — supporting + refuting queries* | [Climinator L10](Climinator_Lessons_for_FactHarbor.md#lesson-10-procon-query-separation) | Low | Quick-win C13 fix |
| **3** | Strong challenger model (Opus) — agent quality > debate structure | [Ecosystem L-I](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md#l-i-strong-agent-quality-over-debate-structure) | Low | High: dominant predictor |
| **4** | Contrarian search pass — search for counter-evidence explicitly | [Climinator L3](Climinator_Lessons_for_FactHarbor.md#lesson-3-the-adversarial-corpus-test-nipcc-pattern) | Medium | Addresses C13 (8/10 pairs) |
| **5** | Search strategy > debate architecture — KB selection matters most | [Ecosystem L-B](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md#l-b-data-centric-approach-to-search-strategy) | Medium | Most impactful variable |
| **6** | Claim verifiability field — filter non-verifiable assertions | [Ecosystem L-A](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md#l-a-claim-detection-as-a-quality-gate) | Low | Prevents spurious verdicts |
| **7** | Multi-advocate parallel verdicts (MORE) — eliminates anchoring bias | [Ecosystem L-G](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md#l-g-balanced-overviews--multi-advocate-one-round-pattern) | Medium | Structural improvement |
| **8** | Evidence partitioning by source type* — structural advocate independence | [Climinator L1](Climinator_Lessons_for_FactHarbor.md#lesson-1-knowledge-diversity--model-diversity) | Medium | Knowledge diversity |
| **9** | Path-based consistency (3 paths) — detects reasoning bias | [Ecosystem L-C](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md#l-c-path-based-consistency-for-annotation-quality) | Medium | Addresses C9 |
| **10** | Debate-informed re-search — fill evidence gaps post-challenge | [Ecosystem L-H](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md#l-h-debate-informed-re-search) | Medium | Evidence completeness |
| **11** | Misleadingness flag — catches "true but misleading" claims | [Ecosystem L-D](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md#l-d-greenwashing-detection-pattern) | Low-Med | Nuance |
| **12** | Mediator question step† — resolve instability, don't penalize it | [Climinator L4](Climinator_Lessons_for_FactHarbor.md#lesson-4-mediator-as-question-asker-not-just-decision-maker) | Medium | Better verdicts |
| **13** | Iterative debate with adaptive stopping† — convergence detection | [Climinator L2](Climinator_Lessons_for_FactHarbor.md#lesson-2-iterative-debate-with-convergence-detection) | Med-High | Depth where needed |
| **14** | User-facing explanation layer — readable summary for non-experts | [Ecosystem L-E](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md#l-e-explanation-and-transparency-layer) | Low | Transparency |
| **15** | Balanced overviews for evaluative claims — perspective-aware verdicts | [Ecosystem L-G](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md#l-g-balanced-overviews--multi-advocate-one-round-pattern) | Medium | Handles contested claims |

### Quick Wins (Low effort)

1. **Evidence sufficiency gate** — deterministic check before verdicts
2. **Pro/Con query separation** — two query templates per claim (from Climinator code)
3. **Strong challenger profile** — config change, test via calibration A/B
4. **Claim verifiability field** — one prompt addition
5. **User-facing explanation** — one Haiku call at pipeline end
6. **Misleadingness flag** — one field in verdict prompt

---

## Collaboration Status

| Contact | Affiliation | Status | Focus |
|---------|------------|--------|-------|
| **Elliott Ash** | ETH Zurich | Email sent (2026-02-19) | Calibration methodology, cross-provider debate, C13 correction |
| **Dominik Stammbach** | Princeton CITP | Email drafted, not sent | Data-centric fact-checking, KB selection theory |
| **Markus Leippold** | UZH | Not yet contacted | Climate+Tech, evaluation benchmarks, agentic RAG |

Full details, email draft, and collaboration strategy: [Research Ecosystem §7-8](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md)

---

## What's Next

**Immediate (in progress):**
1. Cross-provider stabilization (A-2 fixes + A-3 quality gate pass)
2. Pass A-3 gate (two complete 10/10 cross-provider full runs)

**After A-3 gate:**
1. B-sequence: runtime tracing (B-1) → knowledge-diversity-lite A/B (B-3) → decision memo (B-2)
2. C13 active rebalancing implementation + A/B calibration
3. Send Stammbach email once Ash meeting is confirmed

**Debate V2 (backlog, pending B-2 outcome):**
- Quick wins #1-6 from the priority table above
- Contrarian search pass (#4, medium effort)
- Multi-advocate parallel verdicts (#7, medium effort)
- Note: Iterative debate (#13) and mediator questions (#12) are paper-only† — FactHarbor would be the first OSS implementation
