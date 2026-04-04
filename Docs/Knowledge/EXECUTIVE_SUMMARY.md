# Executive Summary — FactHarbor Knowledge Base

**Date:** 2026-03-24 (updated)
**Scope:** All documents in `Docs/Knowledge/`

---

## Reading Guide

This knowledge base maps the global fact-checking landscape, academic research, LLM debate, and political bias — and distills what FactHarbor should learn from each. Start here, then dive into the topic that matters most.

| If you want to understand... | Read | Key takeaway |
|------------------------------|------|-------------|
| **Global landscape, top systems, cooperation targets** | [**Global Fact-Checking Landscape 2026**](Global_FactChecking_Landscape_2026.md) | Full Fact AI (#1 deployed), ED2D/Tool-MAD (#1 research debate), 3 concepts to learn from. FactHarbor is the only end-to-end MAD system for fact-checking with live evidence retrieval; evidence quality is the #1 gap. |
| **Full Fact AI**: architecture, PASTEL, 7 lessons, cooperation path | [**Full Fact AI Analysis**](FullFact_AI_Lessons_for_FactHarbor.md) | Funnel architecture (333K sentences → 100K claims → human review), PASTEL checkworthiness via LLM yes/no questions + linear regression, deliberate no-verdict stance. Natural complement: their monitoring + our verdicts. |
| **Factiverse**: architecture, 8 lessons, multi-source evidence | [**Factiverse Analysis**](Factiverse_Lessons_for_FactHarbor.md) | 6-stage LiveFC pipeline, fine-tuned XLM-RoBERTa beats GPT-4, 6 evidence sources including Semantic Scholar + FactiSearch (330K fact-checks). Proves multi-source retrieval is achievable — validates our #1 evidence gap. |
| Climinator paper vs code, 11 lessons | [Climinator Analysis](Climinator_Lessons_for_FactHarbor.md) | Paper-vs-code gap remains: debate.py still empty. PR #108 (by suung, "DO NOT MERGE") pivots to Advocate-Mediator pattern. Main branch inactive since May 2025; recent activity only by suung on feature branches. FactHarbor's debate is more sophisticated than Climinator's actual code. |
| Research network, people, projects, debate landscape | [Research Ecosystem](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md) | 10+ papers, 13 debate frameworks, 10 additional learnings. Search strategy matters more than debate architecture. |
| Faithful LLM specialists, source attribution, data quality | [**Faithful LLM Specialists (ACL 2024)**](Schimanski_Faithful_LLM_Specialists_ACL2024.md) | Source quality + attributability metrics. Data quality > quantity. 669 filtered samples beat thousands unfiltered. NLI-based grounding. Strongest Schimanski/Ash connection point. [Code repo available.](https://github.com/EdisonNi-hku/Robust_Evidence_Based_QA) |
| Document relevance scoring, RAG calibration, distillation | [**DIRAS (NAACL 2025)**](Schimanski_DIRAS_NAACL2025.md) | 8B model matches GPT-4 on relevance scoring. Explicit relevance definitions per query. Selection bias correction. CoT hurts annotation. Adaptive thresholds > fixed top-k. [Code repo available.](https://github.com/EdisonNi-hku/DIRAS) |
| **LiveCheck & Innosuisse** | [**LiveCheck & Innosuisse Track**](Innosuisse_Antrag_LiveCheck_ReviewReady_2026-03-18.md) | Funding and research proposal line for live audio/video fact-checking (Innosuisse / Innolink / BRIDGE). |
| **Meeting prep for Tobias Schimanski (2026-03-18)** | [**Meeting Prep: Schimanski**](Meeting_Prep_Schimanski_2026-03-18.md) | Agenda, 5 topics, questions to ask, signals to watch, funding structure. |
| Meeting prep for Elliott Ash (historical) | [Meeting Prep: Ash](Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md) | EMNLP 2024 paper, Ash portfolio, FactHarbor SWOA, calibration status, meeting questions. |
| Why evidence-following appears politically biased | [Epistemic Asymmetry](Truth_Seeking.md) | The information environment is not politically symmetric. This is a property of reality, not a pipeline bug. |
| **Multi-source evidence retrieval spec** | [**Multi-Source Evidence Retrieval**](../Specification/Multi_Source_Evidence_Retrieval.md) | Wikipedia + Semantic Scholar + Google Fact Check Tools API. All free, ~8 hours implementation. Addresses #1 gap (C13 evidence asymmetry). |
| **HAMiSoN**: ZHAW's misinformation research project, 7 lessons | [**HAMiSoN Analysis**](HAMiSoN_Lessons_for_FactHarbor.md) | EUR 1.1M, 30+ papers (EMNLP, IJCAI, ICWSM, CLEF). XLM-R (550M) beats zero-shot LLMs. Holistic message+network approach. Domain adaptation with N=100 samples. Proves ZHAW can lead multi-year research consortia. |
| **ViClaim (EMNLP 2025)**: multilingual claim detection in videos | [**ViClaim Analysis**](ViClaim_EMNLP2025_Lessons_for_FactHarbor.md) | 1,798 videos / 17,116 sentences in EN/DE/ES. Fine-tuned XLM-R (0.90 F1) beats zero-shot o3-mini (0.78). Written→spoken transfer collapses (F1 0.69→0.32). Multi-label taxonomy (FCW/FNC/OPN) is more realistic than binary. Dataset available for Innosuisse research. |
| **CheckThat! Lab**: longest-running fact-checking shared task (2018-2026) | [**CheckThat! Lab Analysis**](CheckThat_Lab_Lessons_for_FactHarbor.md) | 130+ teams/year, 20+ languages, full pipeline coverage. ZHAW 2nd (2023) and 3rd (2025). Ensemble methods win. Hybrid retrieval (lexical+semantic+reranking) is state-of-art. Validates FactHarbor's pipeline architecture. |
| **Innosuisse partnership research** | [**Partnership Briefing**](../WIP/2026-03-24_Innosuisse_Partnership_Research_Briefing.md) | ZHAW CAI (#1 candidate: Cieliebak, von Daniken), ETH Ash (#2). Innovation Cheque → full project path. "Low-resource fact-checking" framing. No Swiss competitor exists. |

---

## The Best Fact-Checking in the World — and Where FactHarbor Fits

**Full Fact AI (UK)** is the world's #1 production fact-checking AI: 350K sentences/day, licensed to 45 organizations in 26 countries, battle-tested in 7 African elections and the UK election (136M words). Their AI detects and surfaces claims at massive scale — but humans still make the verdict. No IFCN-certified organization trusts AI for verdicts.

**ED2D (EMNLP 2025)** is the most sophisticated multi-agent debate architecture published: 5-stage structured debate where agents retrieve new evidence during the debate itself — solving the "static evidence pool" problem.

**FactHarbor is the only end-to-end multi-agent debate system for fact-checking with live evidence retrieval.** ED2D and MADR have released research code (benchmark reproductions), but no system besides FactHarbor operates as a user-facing fact-checking service with live web search, sourced reports, and multi-provider debate. Full Fact monitors at scale but won't automate verdicts. FactHarbor sits at the intersection — a functional, pre-release system combining debate architecture, calibration methodology, and live evidence pipeline in a way no competitor does.

| Dimension | FactHarbor | Best Competitor | Gap |
|-----------|-----------|----------------|-----|
| **Multi-agent debate** | 5-step end-to-end implementation with live evidence | ED2D (EMNLP 2025) — research code released | **FH leads** — only end-to-end MAD system |
| **Calibration methodology** | C18 hard gate, C13 rebalancing | No published equivalent | **FH leads** — publishable contribution |
| **Evidence retrieval** | Web search only → [multi-source spec](../Specification/Multi_Source_Evidence_Retrieval.md) | KG²RAG, Tool-MAD (tool-diverse agents) | **FH lags** — #1 quality bottleneck; spec ready |
| **Monitoring scale** | User-submitted claims only | Full Fact AI: 350K sentences/day | **FH lags** — no detection layer |
| **Cross-provider debate** | Anthropic, OpenAI, Google, Mistral | No competitor compares providers | **FH unique** |

The #1 gap to close: evidence retrieval (C13 = 8/10 pairs). **Specification ready:** [Multi-Source Evidence Retrieval](../Specification/Multi_Source_Evidence_Retrieval.md) — adds Wikipedia, Semantic Scholar, and Google Fact Check Tools API at zero cost, ~8 hours implementation. **Current cooperation sequence:** secure a Swiss research lead for the Innovation Cheque path first, use the `dpa` lane for workflow learning, then approach `EBU Spotlight`. **Full Fact** remains the strongest later-stage international complement once the proof pack exists.

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

Climinator's paper architecture (iterative debate, 5-6 advocates, claim decomposition, convergence detection) is NOT implemented in the [open-source code](https://github.com/climateandtech/factchecker) — `debate.py` is empty (0 bytes, verified 2026-03-11) and will likely remain so. PR #108 pivots to an Advocate-Mediator pattern instead; main branch inactive since May 2025. Only 3/6 corpora exist, execution is single-round. **FactHarbor's debate is already more sophisticated than Climinator's actual implementation.** The paper's theoretical architecture remains valuable as a design reference, but should be treated as a proposal, not proven implementation.

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
| **1** | **ZHAW CAI / NLP** | ZHAW | Preferred first outreach target | Swiss research lead for the Innovation Cheque path |
| **2** | **Catherine Gilbert** | `dpa` | Video call scheduled: `2026-04-08 16:00` | Workflow pain points, DACH contacts, feedback path |
| **3** | **EBU Spotlight** | EBU | Hold until after `dpa` signal | Broadcaster / fact-checking network lane independent of SRF |
| **4** | **Full Fact AI team** | Full Fact, UK | Later-stage strategic target | Monitoring scale + complementarity once the proof pack exists |
| **5** | **GlobalFact 2026** | Poynter / IFCN ecosystem | Networking route: `2026-06-17` to `2026-06-19` | Meetings, ecosystem entry, narrower cooperation asks |
| — | **Ash / Schimanski / Stammbach / Leippold** | ETH / UZH / Princeton | Research-context contacts, not the immediate outreach sequence | Research framing, faithfulness metrics, evidence and relevance methods |

Academic contacts remain detailed in [Research Ecosystem §7-8](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md). The current execution order now lives primarily in `../xwiki-pages/FactHarbor/Organisation/Strategy/Cooperation Opportunities/WebHome.xwiki` and `../WIP/2026-04-02_Call_Prep_Catherine_Gilbert.md`.

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
