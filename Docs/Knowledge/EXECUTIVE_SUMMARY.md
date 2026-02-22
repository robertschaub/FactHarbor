# Executive Summary — FactHarbor Knowledge Base

**Date:** 2026-02-22
**Scope:** All documents in `Docs/Knowledge/`

---

## Reading Guide

This knowledge base maps the global fact-checking landscape, academic research, LLM debate, and political bias — and distills what FactHarbor should learn from each. Start here, then dive into the topic that matters most.

| If you want to understand... | Read | Key takeaway |
|------------------------------|------|-------------|
| **Global landscape, top systems, cooperation targets** | [**Global Fact-Checking Landscape 2026**](Global_FactChecking_Landscape_2026.md) | Full Fact AI (#1 deployed), ED2D/Tool-MAD (#1 research debate), 3 concepts to learn from. FactHarbor has the only working MAD implementation; evidence retrieval is the #1 gap. |
| Climinator paper vs code, 11 lessons | [Climinator Analysis](Climinator_Lessons_for_FactHarbor.md) | Paper-vs-code gap is significant. FactHarbor's debate is already more sophisticated than Climinator's actual code. |
| Research network, people, projects, debate landscape | [Research Ecosystem](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md) | 10+ papers, 13 debate frameworks, 10 additional learnings. Search strategy matters more than debate architecture. |
| Meeting prep for Elliott Ash | [Meeting Prep: Ash](Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md) | EMNLP 2024 paper, Ash portfolio, FactHarbor SWOA, calibration status, meeting questions. |
| Why evidence-following appears politically biased | [Epistemic Asymmetry](Truth_Seeking.md) | The information environment is not politically symmetric. This is a property of reality, not a pipeline bug. |

---

## The Best Fact-Checking in the World — and Where FactHarbor Fits

**Full Fact AI (UK)** is the world's #1 production fact-checking AI: 350K sentences/day, licensed to 45 organizations in 26 countries, battle-tested in 7 African elections and the UK election (136M words). Their AI detects and surfaces claims at massive scale — but humans still make the verdict. No IFCN-certified organization trusts AI for verdicts.

**ED2D (EMNLP 2025)** is the most sophisticated multi-agent debate architecture published: 5-stage structured debate where agents retrieve new evidence during the debate itself — solving the "static evidence pool" problem.

**FactHarbor is the only system with a working multi-agent debate implementation for fact-checking.** Full Fact monitors at scale but won't automate verdicts. ED2D has the best debate architecture but exists only as a research paper. FactHarbor sits at the intersection — a functional, pre-release system with a debate architecture more sophisticated than any competitor, but weaker evidence retrieval than the research frontier.

| Dimension | FactHarbor | Best Competitor | Gap |
|-----------|-----------|----------------|-----|
| **Multi-agent debate** | 5-step working implementation | ED2D (EMNLP 2025) — research only | **FH leads** — only working MAD implementation |
| **Calibration methodology** | C18 hard gate, C13 rebalancing | No published equivalent | **FH leads** — publishable contribution |
| **Evidence retrieval** | Web search only | KG²RAG, Tool-MAD (tool-diverse agents) | **FH lags** — #1 quality bottleneck |
| **Monitoring scale** | User-submitted claims only | Full Fact AI: 350K sentences/day | **FH lags** — no detection layer |
| **Cross-provider debate** | Anthropic, OpenAI, Google, Mistral | No competitor compares providers | **FH unique** |

The #1 gap to close: evidence retrieval (C13 = 8/10 pairs). The #1 cooperation target: Full Fact — they have monitoring scale, we have verdict automation they deliberately don't build.

Full analysis: [Global Fact-Checking Landscape 2026](Global_FactChecking_Landscape_2026.md)

---

## FactHarbor at a Glance

Autonomous fact-checking pipeline: claim → AtomicClaim extraction → iterative web search (up to 10 rounds) → evidence grouping (ClaimAssessmentBoundaries) → 5-step LLM debate (advocate × 3 + challenger + reconciler + validation) → sourced report.

Multiple LLM models (Opus/Sonnet for reasoning, Haiku for lightweight tasks) across configurable providers (Anthropic, OpenAI, Google, Mistral). UCM-configurable model tiers. ~40-50 LLM calls per analysis.

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

Consolidated from all research documents (Climinator analysis, Stammbach ecosystem, and Global Landscape investigation). This is the single source of truth for priorities.

Items marked * are validated in Climinator code; items marked † are paper-only (not in OSS code); items marked ‡ are from the 2026-02-22 landscape investigation.

### Tier 1 — Do Now (Low effort, high impact)

| # | Action | Source | Addresses |
|---|--------|--------|-----------|
| **1** | Evidence sufficiency gate — hold verdict when evidence is thin | [Climinator L5](Climinator_Lessons_for_FactHarbor.md#lesson-5-not-enough-information-as-a-first-class-verdict) + Full Fact model‡ | Bad verdicts on weak evidence |
| **2** | Pro/Con query separation — supporting + refuting queries per claim* | [Climinator L10](Climinator_Lessons_for_FactHarbor.md#lesson-10-procon-query-separation) | C13 (8/10 pairs) |
| **3** | Strong challenger model (Opus) — agent quality > debate structure | [Ecosystem L-I](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md#l-i-strong-agent-quality-over-debate-structure) | Verdict quality |
| **4** | Claim verifiability scoring — Haiku pre-filter before the full pipeline | [Ecosystem L-A](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md#l-a-claim-detection-as-a-quality-gate) + Full Fact model‡ | Compute waste, false verdicts |
| **5** | User-facing explanation layer — readable summary for non-experts | [Ecosystem L-E](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md#l-e-explanation-and-transparency-layer) | Transparency |
| **6** | Misleadingness flag — catches "true but misleading" claims | [Ecosystem L-D](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md#l-d-greenwashing-detection-pattern) | Nuance |
| **7** | Contact Full Fact AI — explore partnership (monitoring + verdict engine)‡ | [Landscape §5](Global_FactChecking_Landscape_2026.md#5-cooperation-strategy) | Market positioning |

### Tier 2 — Do Next (Medium effort, high impact)

| # | Action | Source | Addresses |
|---|--------|--------|-----------|
| **8** | Debate-triggered re-search — challenger retrieves counter-evidence during debate‡ | [ED2D](Global_FactChecking_Landscape_2026.md#concept-1-evidence-retrieval-during-debate-ed2d--tool-mad) + [Ecosystem L-H](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md#l-h-debate-informed-re-search) | C13, evidence completeness |
| **9** | Contrarian search pass — dedicated search for counter-evidence | [Climinator L3](Climinator_Lessons_for_FactHarbor.md#lesson-3-the-adversarial-corpus-test-nipcc-pattern) | C13 (8/10 pairs) |
| **10** | Tool-diverse advocates — route each advocate to a different evidence source‡ | [Tool-MAD](Global_FactChecking_Landscape_2026.md#concept-1-evidence-retrieval-during-debate-ed2d--tool-mad) + [Climinator L1](Climinator_Lessons_for_FactHarbor.md#lesson-1-knowledge-diversity--model-diversity) | Evidence diversity |
| **11** | Multi-advocate parallel verdicts (MORE) — eliminates anchoring bias | [Ecosystem L-G](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md#l-g-balanced-overviews--multi-advocate-one-round-pattern) | Structural improvement |
| **12** | Path-based consistency (3 paths) — detects reasoning bias | [Ecosystem L-C](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md#l-c-path-based-consistency-for-annotation-quality) | Addresses C9 |
| **13** | Benchmark against AVeriTeC — evaluate on 4,568-claim standard dataset‡ | [Landscape §4.5](Global_FactChecking_Landscape_2026.md#45-key-benchmarks-and-evaluation-frameworks) | Credibility, measurement |
| **14** | Publish calibration methodology — C18/C13 framework as paper/report‡ | [Landscape §6.1](Global_FactChecking_Landscape_2026.md#61-what-no-one-has-built-yet) | Academic positioning |

### Tier 3 — Investigate (Medium-High effort, strategic)

| # | Action | Source | Addresses |
|---|--------|--------|-----------|
| **15** | Mediator question step† — resolve instability, don't penalize it | [Climinator L4](Climinator_Lessons_for_FactHarbor.md#lesson-4-mediator-as-question-asker-not-just-decision-maker) | Better verdicts |
| **16** | Iterative debate with adaptive stopping† — convergence detection | [Climinator L2](Climinator_Lessons_for_FactHarbor.md#lesson-2-iterative-debate-with-convergence-detection) | Depth where needed |
| **17** | GraphRAG integration — knowledge graph-guided evidence retrieval‡ | [KG²RAG](Global_FactChecking_Landscape_2026.md#concept-2-knowledge-graph-guided-evidence-retrieval-kgrag--graphrag) | Evidence quality at root level |
| **18** | Monitoring-mode architecture — continuous claim detection‡ | [Full Fact model](Global_FactChecking_Landscape_2026.md#concept-3-full-facts-ai-monitoring--prebunking-model) | Scale, market positioning |
| **19** | EU AI Act compliance documentation‡ | [Landscape §6.6](Global_FactChecking_Landscape_2026.md#66-eu-ai-act-implications) | Regulatory positioning |
| **20** | Balanced overviews for evaluative claims — perspective-aware verdicts | [Ecosystem L-G](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md#l-g-balanced-overviews--multi-advocate-one-round-pattern) | Contested claims |

---

## Collaboration Status

| Priority | Contact | Affiliation | Status | Focus |
|----------|---------|------------|--------|-------|
| **1** | **Full Fact AI team** | Full Fact, UK | Not yet contacted | Monitoring (350K/day) + FactHarbor as verdict engine |
| **2** | **AVeriTeC organizers** | Multi-university | Not yet contacted | Benchmark evaluation (4,568 claims, 50 orgs) |
| **3** | **ED2D / Tool-MAD authors** | Academic | Not yet contacted | Evidence retrieval during debate; working pipeline as testbed |
| **4** | **Elliott Ash** | ETH Zurich | Email sent (2026-02-19) | Calibration methodology, cross-provider debate, C13 correction |
| **5** | **Dominik Stammbach** | Princeton CITP | Email drafted, not sent | Data-centric fact-checking, KB selection theory |
| — | **Markus Leippold** | UZH | Not yet contacted | Climate+Tech, evaluation benchmarks, agentic RAG |

Academic contacts: [Research Ecosystem §7-8](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md). Industry + new targets: [Global Landscape §5](Global_FactChecking_Landscape_2026.md#5-cooperation-strategy).

---

## What's Next

**Recently completed (2026-02-22):**
- ✅ A-2 fixes: structured error telemetry (A-2c), TPM guard/fallback (A-2b), crash fix (A-2a)
- ✅ B-sequence quality improvements (from Quality Opportunity Map): B-5a (challenger prompt), B-4 (pro/con query separation), B-6 (verifiability annotation), B-7 (misleadingness flag), B-8 (explanation quality — structural + LLM rubric), B-5b (opus tier)
- ✅ i18n hardening: all structural checks use Unicode-aware patterns, no English-keyword matching
- ✅ xWiki architecture docs updated for CB pipeline (7 pages)

**Immediate (in progress):**
1. A-3 gate re-run (first attempt NO-GO: 7/10 pairs due to Anthropic credit exhaustion, not code issues)
2. Calibration cost optimization (gate vs smoke lane policy)

**After A-3 gate:**
1. D2 B-sequence: runtime tracing (B-1) → knowledge-diversity-lite A/B (B-3) → decision memo (B-2)
2. C13 active rebalancing implementation + A/B calibration
3. Send Stammbach email once Ash meeting is confirmed

**Debate V2 (backlog, pending B-2 outcome):**
- Tier 1 quick wins #1-6 from the priority table above
- Tier 2 evidence improvements: debate-triggered re-search (#8), contrarian search (#9), tool-diverse advocates (#10)
- Note: Iterative debate (#16) and mediator questions (#15) are paper-only† — FactHarbor would be the first OSS implementation

Full prioritized action plan with justifications: [Global Landscape — Executive Summary](Global_FactChecking_Landscape_2026.md#executive-summary)
