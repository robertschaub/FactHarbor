# Global Fact-Checking Landscape 2026 — Where FactHarbor Stands

**Date:** 2026-02-22
**Scope:** Comprehensive survey of AI-based and human fact-checking systems worldwide
**Cross-references:** [Executive Summary](EXECUTIVE_SUMMARY.md) | [Climinator Analysis](Climinator_Lessons_for_FactHarbor.md) | [Research Ecosystem](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md)
**Research method:** Three parallel agents (Opus + 2x Sonnet) covering AI systems, non-AI organizations, and emerging technology. 100+ sources consulted.

> **How to use this document:** Start with the Executive Summary below for the key takeaways and prioritized actions. Then §1 (Rankings) for the most sophisticated systems, §2 for three concepts to learn from, §3 for the landscape map, §4 for detailed profiles, §5 for cooperation strategy.

---

## Executive Summary

### The Bottom Line

**FactHarbor is the only system with a working multi-agent debate implementation for fact-checking.** Academic papers (ED2D, Tool-MAD, DelphiAgent) validate the approach, but none are deployed. Full Fact AI leads in monitoring scale (350K sentences/day, 45 orgs, 26 countries) but deliberately does not automate verdicts. No system — academic or commercial — achieves reliable end-to-end automated fact-checking of arbitrary real-world claims. FactHarbor's ambition to do this places it at the research frontier.

### FactHarbor's Competitive Position

| Dimension | FactHarbor | Best Competitor | Gap |
|-----------|-----------|----------------|-----|
| **Multi-agent debate** | 5-step working implementation (3 advocates + challenger + reconciler + validator) | ED2D (5-stage, EMNLP 2025) — research only | **FH leads** — only working implementation |
| **Calibration methodology** | C18 hard gate, C13 rebalancing, systematic bias measurement | No published equivalent | **FH leads** — publishable contribution |
| **Evidence retrieval** | Web search only | KG²RAG (graph-guided), Tool-MAD (tool-diverse agents) | **FH lags** — #1 quality bottleneck |
| **Monitoring scale** | User-submitted claims only | Full Fact AI: 350K sentences/day | **FH lags** — no detection layer |
| **Cross-provider debate** | Anthropic, OpenAI, Google, Mistral | No competitor compares providers | **FH unique** |
| **Multimodal** | Text only | Reality Defender, C2PA, Sensity AI | **FH lags** — not urgent but growing |

### Prioritized Action Plan

Actions are ordered by **impact on FactHarbor's measured weaknesses**, gated by effort.

#### Tier 1 — Do Now (Low effort, high impact)

| # | Action | Effort | Why Now | Addresses |
|---|--------|--------|---------|-----------|
| **A1** | Evidence sufficiency gate — hold verdict when evidence is thin | Low | Full Fact never verdicts on thin evidence. Prevents our worst outputs. | Bad verdicts on weak evidence |
| **A2** | Pro/Con query separation — generate both supporting and refuting search queries per claim | Low | Validated in Climinator code. Cheapest fix for one-sided evidence pools. | C13 (8/10 pairs) |
| **A3** | Claim verifiability scoring — Haiku pre-filter before the 40-50 LLM call pipeline | Low | Full Fact does this at 350K/day. Saves cost and prevents spurious verdicts. | Compute waste, false verdicts |
| **A4** | Strong challenger model (Opus) — upgrade challenger agent quality | Low | Research consensus: agent quality is the dominant predictor of debate accuracy. Config change only. | Verdict quality |
| **A5** | Contact Full Fact AI team — explore partnership (monitoring + verdict engine) | Low | Highest-impact cooperation target. They have monitoring scale, we have verdict automation. Platform funding crisis creates urgency. | Market positioning |

#### Tier 2 — Do Next (Medium effort, high impact)

| # | Action | Effort | Why Next | Addresses |
|---|--------|--------|----------|-----------|
| **B1** | Debate-triggered re-search — challenger retrieves counter-evidence during debate | Medium | ED2D (EMNLP 2025) and Tool-MAD (2026) prove this works. Directly fixes the "static evidence pool" problem. No production system has this yet. | C13, evidence completeness |
| **B2** | Contrarian search pass — dedicated search for counter-evidence when evidence pool is one-sided | Medium | Validated by Climinator's adversarial corpus pattern. Complements B1. | C13 (8/10 pairs) |
| **B3** | Tool-diverse advocates — route each advocate to a different evidence source (news, academic, institutional) | Medium | From Tool-MAD. Creates structural evidence diversity independent of any single search engine. | Evidence diversity |
| **B4** | Benchmark against AVeriTeC — evaluate pipeline on the standard 4,568-claim dataset | Medium | Only way to objectively measure where FactHarbor stands vs. the field. 2025 constraint: open-weights, single GPU, <1 min/claim. | Credibility, measurement |
| **B5** | Publish calibration methodology — C18/C13 framework as academic paper or technical report | Medium | More rigorous than anything published. Establishes FactHarbor's credibility. Attracts collaborators. | Academic positioning |

#### Tier 3 — Investigate (Medium-High effort, strategic)

| # | Action | Effort | Why Investigate | Addresses |
|---|--------|--------|----------------|-----------|
| **C1** | GraphRAG integration — knowledge graph-guided evidence retrieval as alternative path | Med-High | KG²RAG shows 18% hallucination reduction. Microsoft GraphRAG is open-source. Structural fix for evidence quality that search-engine tweaks can't achieve. | Evidence quality at root level |
| **C2** | Monitoring-mode architecture — continuous claim detection from news sources, not just user-submitted claims | Med-High | Full Fact's entire value proposition. Without this, FactHarbor is reactive only. Prerequisite for prebunking. | Scale, market positioning |
| **C3** | EU AI Act compliance documentation — bias auditing, transparency, confidence reporting | Medium | Regulations effective Aug 2025. FactHarbor's calibration already partially satisfies requirements. Competitive advantage in European market. | Regulatory positioning |

#### Not Now (Backlog)

| Action | Why Not Now |
|--------|-----------|
| Multimodal (image/video/audio) | FactHarbor is text-focused. Market need exists but not our core. Revisit after evidence retrieval is fixed. |
| Blockchain/decentralized verification | Early-stage, low adoption. C2PA provenance advancing faster. Watch, don't build. |
| Real-time broadcast fact-checking | Factiverse leads here. FactHarbor's strength is depth (debate), not speed (real-time). |

### Five Key Insights from the Landscape

1. **Evidence retrieval is FactHarbor's #1 gap.** Every other dimension (debate, calibration, cross-provider) is competitive or leading. C13 (8/10 pairs) confirms it. Fix evidence first.

2. **Platform retreat creates market opportunity.** Meta exited US fact-checking (April 2025). Google removed ClaimReview from Search (June 2025). CrowdTangle deprecated (2024). 443 fact-checking organizations worldwide now need independent tools — the platforms that funded and supported them are leaving.

3. **No one automates verdicts yet.** Full Fact deliberately avoids it. Factiverse attempts it but at early quality. FactHarbor's multi-agent debate is the most serious attempt. This is both our unique strength and our biggest risk.

4. **The confidence paradox validates our model tiering.** Small models are overconfident and wrong. Large models are underconfident but accurate. Haiku for extraction + Sonnet for verdicts is the correct architecture.

5. **FactHarbor's calibration methodology is publishable.** No system in the literature has a systematic bias measurement framework comparable to C18/C13. This is our strongest credibility asset for academic collaboration.

### Cooperation Priorities

| Priority | Target | What They Offer | What We Offer | Next Step |
|----------|--------|----------------|---------------|-----------|
| **1** | Full Fact AI (UK) | Monitoring at 350K/day; 45-org network | Automated verdict engine they don't build | Email introduction |
| **2** | AVeriTeC organizers | Standardized benchmark; 50-org claim dataset | Pipeline evaluation; cross-provider data | Benchmark participation |
| **3** | ED2D / Tool-MAD authors | State-of-the-art debate architecture | Working pipeline as real-world testbed | Research collaboration proposal |
| **4** | Elliott Ash (ETH) | Calibration methodology; bias measurement | Calibration data; pipeline access | Email sent 2026-02-19 |
| **5** | Dominik Stammbach (Princeton) | KB selection theory; data-centric FC | Pipeline for experiments | Email drafted, send after Ash |

---

## 1. The Most Sophisticated Fact-Checking Systems in the World

### 1.1. AI-Based: The Top Two

#### #1: Full Fact AI (UK) — The Gold Standard for AI-Assisted Fact-Checking

**What it is:** A distinct AI product built by Full Fact (UK's leading fact-checker, est. 2010), now licensed as SaaS to 45 fact-checking organizations in 26 countries. Processes ~350,000 sentences per day. Used to monitor elections in South Africa, Namibia, Nigeria, Ghana, Senegal, Algeria, Tunisia, and the UK.

**Why it's #1:**
- **Production scale:** 350K sentences/day is orders of magnitude beyond any academic system
- **Global adoption:** 45 organizations in 26 countries — the only AI fact-checking tool with genuine multi-organization deployment
- **Proven in elections:** Monitored 7 African elections (2024) and the UK election (136M words analyzed, 142,909 articles)
- **Prebunking pivot:** Leading the "Prebunking at Scale" project (EU-wide, 40+ organizations) — shifting from reactive debunking to proactive inoculation
- **Methodology integrity:** AI handles claim detection and triage; human editors retain verdict authority. No IFCN-certified org uses AI for verdicts.

**Architecture:** Claim detection at scale (sentence-level) → claim prioritization → human investigation → publication with ClaimReview markup. The AI layer is the monitoring/triage accelerator, not the verdict engine.

**Funding:** Nuffield Foundation, Google.org, Open Society Foundations, Omidyar Network.

**Limitation:** Does NOT automate verdicts. The AI detects and surfaces claims; humans decide truth. This is a deliberate design choice aligned with IFCN standards, not a technical limitation.

---

#### #2: Factiverse (Norway) — The Most Ambitious Automated Fact-Checker

**What it is:** A Norwegian startup building fully automated real-time fact-checking. Covers 140 languages, offers live broadcast fact-checking, and exposes an API for newsroom integration. Used for live debate coverage.

**Why it's #2:**
- **Real-time capability:** Transcribes live audio, identifies check-worthy claims, runs web search, returns verdicts within seconds
- **Language coverage:** 140 languages — far beyond any competitor
- **API-first:** Designed for integration into existing newsroom workflows
- **Ambition:** Attempting what no one else does — fully automated verdicts at broadcast speed

**Architecture:** Live audio transcription → claim detection → multi-engine web search → LLM-powered evidence evaluation → verdict with sources.

**Limitation:** Live AI fact-checking cannot yet operate autonomously at editorial-quality standards. Latency, context loss in transcription, and political flagging asymmetry remain unsolved. Field consensus is human-in-the-loop for editorial verdicts.

---

### 1.2. Non-AI: The Top Two

#### #1: AFP Fact Check — Largest Scale

140 dedicated journalists across 26 languages in 80+ countries. The world's largest fact-checking operation by headcount and linguistic reach. Meta Third-Party Fact-Checking partner (international markets, post-US exit). Multilingual editorial teams with native speakers (not machine-translated). Operates as a commercial wire service — sustainable business model independent of platform dependency.

#### #2: BBC Verify — Most Technically Sophisticated

60+ dedicated journalists with the most advanced OSINT infrastructure in journalism: satellite imagery (Maxar, Sentinel Hub), geolocation (SunCalc, Google Earth Pro), social media forensics, deepfake detection tools. "BBC Verify Live" — a rolling real-time verification page — is a significant UX innovation. Rated most trusted fact-checking source in the UK by Oxford's Reuters Institute.

---

### 1.3. Academic/Research: The Top Two

#### #1: ED2D — Evidence-Enhanced Debate-to-Detect (EMNLP 2025)

The most structured multi-agent debate protocol published. Five-stage debate (Opening, Rebuttal, Free Debate, Closing, Judgment) with an Agent Layer (Affirmative, Negative, Judge with shared memory) and Orchestrator Layer. The ED2D extension adds active evidence retrieval during Free Debate and Judgment stages — directly addressing the "static evidence" problem that plagues other debate systems.

**Why it matters for FactHarbor:** ED2D's architecture is the closest published analog to FactHarbor's advocate-challenger-reconciler pattern. The evidence-retrieval-during-debate innovation maps directly to FactHarbor's Priority #10 (debate-informed re-search).

#### #2: Tool-MAD — Tool-Augmented Multi-Agent Debate (January 2026)

The newest frontier: each debate agent is assigned a distinct external tool (search API, RAG module, knowledge graph). Agents debate using evidence from their specialized tools, with adaptive retrieval during debate rounds. Solves the "static evidence" problem and the "shared hallucination" problem simultaneously.

**Why it matters for FactHarbor:** Tool-MAD validates FactHarbor's existing design direction of connecting debate agents to different evidence sources (Priority #8, evidence partitioning by source type). It extends this by making each agent's tool access structurally distinct.

---

## 2. Three Concepts FactHarbor Should Learn From

### Concept 1: Evidence Retrieval During Debate (ED2D + Tool-MAD)

**The problem:** FactHarbor's biggest measured issue is evidence pool asymmetry (C13 = 8/10 pairs). The current pipeline searches for evidence *before* the debate, then debates over a fixed evidence pool. If the initial search returns asymmetric evidence, the debate inherits that asymmetry — no amount of debate sophistication fixes bad input.

**The concept:** ED2D and Tool-MAD both solve this by allowing agents to retrieve new evidence *during* the debate. When the challenger identifies a gap in the evidence, it can search for counter-evidence in real time rather than arguing only from what's already collected.

**What FactHarbor should build:**
1. **Debate-triggered re-search** (already Priority #10): When the challenger identifies an evidence gap, it generates a targeted search query and retrieves additional evidence before the reconciliation step
2. **Tool-diverse advocates** (from Tool-MAD): Give each advocate access to a different evidence source — one searches news, one searches academic papers, one searches government/institutional sources. This creates structural evidence diversity without relying on a single search engine's ranking
3. **Contrarian search pass** (already Priority #4): A dedicated search specifically for counter-evidence, triggered automatically for any claim where the evidence pool is one-sided

**Impact on FactHarbor:** Directly addresses C13 (evidence pool asymmetry, 8/10 pairs). This is FactHarbor's #1 quality bottleneck and the concept most likely to produce measurable improvement.

**Key papers:**
- [ED2D/D2D (EMNLP 2025)](https://aclanthology.org/2025.emnlp-main.764.pdf) — 5-stage structured debate with evidence retrieval
- [Tool-MAD (arXiv, Jan 2026)](https://arxiv.org/abs/2601.04742) — Tool-diverse agents with adaptive retrieval
- [DelphiAgent (IPM 2025)](https://www.sciencedirect.com/science/article/abs/pii/S0306457325001827) — Delphi consensus with evidence mining module

**Cooperation opportunity:** The ED2D and Tool-MAD authors are active researchers. FactHarbor could offer its working pipeline as a testbed for their debate architectures — they get real-world validation, we get state-of-the-art debate protocols.

---

### Concept 2: Knowledge Graph-Guided Evidence Retrieval (KG²RAG + GraphRAG)

**The problem:** FactHarbor's web search returns whatever Google/Bing rank highly, which often reflects popularity rather than factual authority. For contested claims, search engines return a mix of partisan sources, opinion pieces, and primary research — with no structural way to distinguish them or ensure balanced coverage.

**The concept:** KG²RAG (NAACL 2025) and Microsoft GraphRAG combine traditional text retrieval with knowledge graph traversal. Instead of just searching for keyword matches, the system follows semantic relationships between entities, claims, and sources in a structured graph. This produces evidence that is:
- **More diverse** (follows multiple relationship paths, not just keyword overlap)
- **More coherent** (evidence items are semantically connected, not just individually relevant)
- **Less hallucination-prone** (18% reduction in biomedical QA benchmarks)

**What FactHarbor should investigate:**
1. **Entity-relationship extraction from evidence:** Build a lightweight knowledge graph from the evidence pool before debate. Each evidence item becomes a node; relationships (supports, contradicts, qualifies, cites) become edges
2. **Graph-guided gap detection:** After initial search, traverse the graph to identify structural gaps — entities mentioned but not evidenced, contradictions without resolution, one-sided relationship clusters
3. **Multi-hop evidence chains:** For complex claims, follow evidence chains across multiple sources rather than treating each source independently

**Impact on FactHarbor:** Addresses both C13 (evidence diversity) and the "search strategy > debate architecture" finding (Priority #5). Knowledge graphs provide structural evidence diversity that keyword search cannot.

**Key papers:**
- [KG²RAG (NAACL 2025)](https://aclanthology.org/2025.naacl-long.449/) — Knowledge graph-guided evidence retrieval
- [Microsoft GraphRAG](https://github.com/microsoft/graphrag) — Community summarization over entity graphs
- [GraphRAG Benchmark (ICLR 2026)](https://github.com/DEEP-PolyU/Awesome-GraphRAG) — Comprehensive evaluation

**Cooperation opportunity:** The KG²RAG team at NAACL and Microsoft's GraphRAG team are producing open-source tools. FactHarbor could integrate GraphRAG as an alternative evidence retrieval path and publish comparative results.

---

### Concept 3: Full Fact's AI Monitoring + Prebunking Model

**The problem:** FactHarbor currently operates claim-by-claim in response to user input. It has no monitoring layer (detecting claims that need checking) and no proactive capability (prebunking claims before they spread). This limits it to reactive fact-checking — the claim is already circulating when someone asks FactHarbor to check it.

**The concept:** Full Fact has solved the scale problem by separating the pipeline into two layers:
1. **AI monitoring layer:** Processes 350K sentences/day, identifies check-worthy claims, prioritizes by virality and impact
2. **Human verdict layer:** Editors investigate the AI-surfaced claims and publish verdicts

The emerging extension is **prebunking** — proactively publishing inoculation content about disinformation tactics before specific claims spread. EFCSN and Full Fact are leading the "Prebunking at Scale" project with 40+ European organizations.

**What FactHarbor should learn:**
1. **Claim worthiness scoring:** Before running the full 40-50 LLM call pipeline, a lightweight classifier (Haiku) could score whether a claim is actually verifiable and worth the computational investment. This maps to Priority #6 (claim verifiability field) — but Full Fact's implementation at 350K sentences/day shows it can work at scale
2. **Evidence sufficiency as a quality gate:** Full Fact's model never verdicts on thin evidence — if the investigation doesn't produce sufficient evidence, the claim is held rather than given a low-confidence verdict. This maps to Priority #1 (evidence sufficiency gate)
3. **Monitoring-mode architecture:** FactHarbor could add a "watch list" feature where it continuously monitors news sources for new claims related to previously checked topics, alerting users when the evidence landscape changes
4. **The human-AI boundary:** Full Fact's deliberate choice to keep verdicts human-authored is not a limitation — it's a design pattern. FactHarbor's automated verdicts are more ambitious, but should learn from Full Fact's transparency about confidence and limitations

**Impact on FactHarbor:** This concept doesn't address a specific calibration metric — it addresses FactHarbor's market positioning. If FactHarbor can combine Full Fact's monitoring scale with automated verdict generation that Full Fact deliberately avoids, it occupies a unique niche: the world's first end-to-end automated fact-checking system at monitoring scale.

**Cooperation opportunity:** Full Fact licenses its AI tools to 45 organizations. FactHarbor could position as the "verdict engine" that Full Fact's monitoring layer feeds into — Full Fact surfaces claims, FactHarbor runs the debate pipeline, humans review. This would be the most impactful partnership in the space.

---

## 3. The Landscape Map

### 3.1. By Category

| Category | Key Players | FactHarbor Position |
|----------|-------------|-------------------|
| **Production AI systems** | Full Fact AI, Factiverse, Logically, ClaimBuster | FactHarbor's debate architecture is more sophisticated than any production system. No production system does multi-agent debate. |
| **Multi-agent debate (research)** | ED2D, Tool-MAD, DelphiAgent, FACT-AUDIT, D3, A-HMAD | FactHarbor is already implementing what these papers propose. ED2D and Tool-MAD offer specific improvements to adopt. |
| **Human fact-checking** | AFP, BBC Verify, Full Fact, PolitiFact, Snopes | These organizations need automated tools. FactHarbor could be their engine. |
| **Platform programs** | Meta TPFC (discontinued US), X Community Notes, Google Fact Check Explorer | Platform retreat from fact-checking creates opportunity for independent tools like FactHarbor. |
| **Evidence retrieval** | KG²RAG, GraphRAG, AVeriTeC | FactHarbor's web-search-only evidence retrieval is the weakest link. Graph-guided retrieval is the frontier. |
| **Deepfake/multimodal** | Reality Defender, Sensity AI, C2PA standard | Not FactHarbor's domain (text-focused), but multimodal claims may need future support. |
| **Calibration/bias** | Confidence Paradox study, Cross-Lingual Pitfalls (ACL 2025), FactHarbor Calibration v1 | FactHarbor's calibration methodology (C18 hard gate, C13 evidence rebalancing) is more systematic than any published approach. |

### 3.2. The Pipeline Consensus

Every system — academic and production — follows the same core pipeline:

```
Claim Detection → Claim Decomposition → Evidence Retrieval → Verdict Prediction → Explanation
```

FactHarbor's pipeline matches this consensus but adds a debate layer between Evidence Retrieval and Verdict Prediction that no other production system implements. The multi-agent debate frameworks (ED2D, Tool-MAD, DelphiAgent) validate this approach at the research level.

### 3.3. State of the Art Accuracy (2025-2026)

| System/Benchmark | Accuracy | Context |
|-----------------|----------|---------|
| Best on AVeriTeC (realistic) | ~33% | Open-weights, single GPU, <1 min/claim |
| Originality.ai (commercial) | ~87% | Self-reported on own benchmark |
| Perplexity (grounded search) | ~63% correct | Tow Center study |
| GPT-5 hallucination rate | ~8% | Best among LLMs |
| Best auto-checkers vs LLM-generated false claims | Miss ~40% | Arms race: generators faster than checkers |
| FactHarbor C18 (failure-mode bias) | 0/10 pairs | Our pipeline doesn't politically refuse or degrade |

**Key insight:** No system achieves reliable end-to-end automated fact-checking of arbitrary real-world claims. The best systems are "AI-assisted" (accelerate human fact-checkers 2-10x) not "AI-automated." FactHarbor's ambition to automate the full pipeline including verdicts puts it at the research frontier.

---

## 4. Detailed System Profiles

### 4.1. Production AI Systems

| System | Origin | Languages | Key Innovation | Status |
|--------|--------|-----------|---------------|--------|
| **Full Fact AI** | UK | EN, FR, AR | 350K sentences/day monitoring; licensed SaaS to 45 orgs in 26 countries | Production |
| **Factiverse** | Norway | 140 | Real-time live broadcast fact-checking | Production |
| **Logically** | UK/India | 57 | Multi-modal (text + image + video); FactFlow newsroom tool; MDHub for governments | Production |
| **ClaimBuster** | UT Arlington | EN | Claim detection scoring (pioneered the concept); 10K+ users | Production |
| **Originality.ai** | Commercial | EN | Combined fact-check + AI detection + plagiarism; 87% accuracy | Commercial SaaS |
| **Wisecube AI** | Commercial | EN | Knowledge triple extraction → knowledge graph cross-reference | Enterprise |
| **Katteb** | Commercial | 110+ | Check-before-generate (fact-check integrated into content generation) | Commercial SaaS |

### 4.2. Multi-Agent Debate Systems (Research)

| System | Venue | Agents | Rounds | Evidence Retrieval | Key Innovation |
|--------|-------|--------|--------|-------------------|---------------|
| **ED2D** | EMNLP 2025 | 3 (Affirm, Negate, Judge) | 5 stages | During debate | Most structured protocol; evidence during free debate |
| **Tool-MAD** | arXiv Jan 2026 | Multiple | Multiple | Tool-specific, adaptive | Each agent has a different external tool |
| **DelphiAgent** | IPM 2025 | Multiple LLMs | Delphi rounds | Mining module | Delphi consensus; no training needed |
| **FACT-AUDIT** | ACL 2025 | 4 (Appraiser, Inquirer, Inspector, Evaluator) | Adaptive | N/A (evaluator) | Importance sampling for hard cases |
| **D3** | 2024-2025 | Advocates + Judge + Jury | MORE or SAMRE | Pre-debate | Cost-aware; explicit token budgets |
| **A-HMAD** | JKSU 2025 | Heterogeneous | Adaptive | Varies | 4-6% higher accuracy, 30% fewer errors |
| **FactHarbor** | Pre-release | 3 Advocates + Challenger + Reconciler + Validator | 5 steps | Pre-debate | Working implementation with calibration methodology |

**FactHarbor's position:** Already more sophisticated than any production system. The research systems (ED2D, Tool-MAD) offer specific architectural improvements — particularly evidence retrieval during debate — that FactHarbor should adopt.

### 4.3. Major Human Fact-Checking Organizations

| Organization | Country | Staff | Languages | Key Innovation |
|-------------|---------|-------|-----------|---------------|
| **AFP Fact Check** | France (global) | 140 | 26 | Largest scale, wire service model |
| **BBC Verify** | UK | 60+ | EN | OSINT sophistication, Verify Live |
| **Full Fact** | UK | 30-40 | EN, FR, AR | AI tools used by 45 orgs; corrections demands |
| **PolitiFact** | US | 30+ | EN | Truth-O-Meter scale; Pulitzer Prize |
| **Snopes** | US | 15+ | EN | Oldest (1994); internet folklore + news |
| **FactCheck.org** | US | 20+ | EN | Annenberg-funded; academic rigor |
| **Africa Check** | South Africa | 24-30 | EN, FR | Africa Facts network; election monitoring |
| **Chequeado** | Argentina | 20-30 | ES | Chequeabot real-time; LatamChequea network |
| **CORRECTIV** | Germany | 60-80 | DE | Investigative journalism + fact-checking |
| **Les Decodeurs** | France | 8-12 | FR | Decodex source credibility database |

### 4.4. Platform Programs

| Platform | Status (2025-2026) | Key Development |
|----------|-------------------|----------------|
| **Meta TPFC** | Ended in US (April 2025); international continues | Replaced by Community Notes in US; funding crisis for 80+ partner orgs |
| **X Community Notes** | Live, expanding; AI pilot with Grok | Only 13.5% of notes appear pre-viral; 26-hour average delay |
| **Google Fact Check Explorer** | Active but diminished | Removed ClaimReview rich results from Search (June 2025) |
| **YouTube** | AI moderation, no fact-checking | Ended COVID misinfo rules; 12M channels terminated in 2025 |

**Platform retreat creates opportunity:** Meta, Google, and YouTube are all pulling back from fact-checking integration. This creates a vacuum that independent tools like FactHarbor could fill — organizations need automated fact-checking now more than ever, but platforms are no longer providing it.

### 4.5. Key Benchmarks and Evaluation Frameworks

| Benchmark | What It Measures | FactHarbor Relevance |
|-----------|-----------------|---------------------|
| **AVeriTeC** | Real-world claim verification (4,568 claims, 50 orgs) | Most realistic benchmark; requires open-weights models |
| **OpenFactCheck** | Evaluates fact-checkers themselves (FactBench, FactQA) | Could evaluate FactHarbor's pipeline quality |
| **FactScore** | Atomic claim precision for long-form text | Validates FactHarbor's AtomicClaim decomposition pattern |
| **LIAR** | 6-class truthfulness on PolitiFact claims | Historical benchmark; ceiling at F1=0.32 shows problem hardness |
| **CheckThat!** | Multilingual claim normalization (13 languages) | Tests cross-lingual capabilities FactHarbor needs |

---

## 5. Cooperation Strategy

### 5.1. Highest-Priority Cooperation Targets

| Target | What They Offer | What FactHarbor Offers | Cooperation Model |
|--------|----------------|----------------------|-------------------|
| **Full Fact** | Production monitoring at 350K sentences/day; 45-org network; election monitoring expertise | Automated verdict engine (the step Full Fact deliberately doesn't automate) | FactHarbor as verdict backend for Full Fact's monitoring frontend |
| **ED2D / D2D authors** | State-of-the-art debate architecture; evidence retrieval during debate | Working pipeline as real-world testbed | Research collaboration: they design, we deploy and measure |
| **AVeriTeC organizers** | Standardized benchmark; 50-org claim dataset | Pipeline evaluation results; cross-provider debate data | Benchmark participation + publication |

### 5.2. Secondary Targets (already in progress)

These contacts are already tracked in [Research Ecosystem §7](Stammbach_Research_Ecosystem_and_FactHarbor_Opportunities.md):

| Contact | Status | Next Step |
|---------|--------|-----------|
| Elliott Ash (ETH) | Email sent 2026-02-19 | Await response |
| Dominik Stammbach (Princeton) | Email drafted | Send after Ash meeting confirmed |
| Markus Leippold (UZH) | Not yet contacted | Contact after A-3 gate |

### 5.3. New Contacts to Investigate

| Contact | Affiliation | Focus | Why |
|---------|------------|-------|-----|
| **ED2D authors** | (check paper) | Multi-agent debate for misinformation | Most architecturally relevant to FactHarbor |
| **Tool-MAD authors** | (check paper) | Tool-augmented debate | Validates FactHarbor's tool-diverse direction |
| **Full Fact AI team** | Full Fact, UK | AI monitoring + prebunking | Highest-impact partnership potential |
| **AVeriTeC organizers** | Multiple universities | Benchmark for real-world fact verification | Standardized evaluation for FactHarbor |
| **KG²RAG authors** | (check NAACL 2025) | Graph-guided evidence retrieval | Directly addresses C13 evidence asymmetry |

---

## 6. Key Cross-Cutting Findings

### 6.1. What No One Has Built Yet

1. **End-to-end automated verdicts at production scale.** Full Fact monitors at scale but humans verdict. Factiverse attempts automation but at early-stage quality. FactHarbor's multi-agent debate with calibration methodology is the most systematic attempt at automated verdicts.

2. **Evidence retrieval during debate in production.** ED2D and Tool-MAD demonstrate this in research. No production system implements it. FactHarbor is positioned to be the first.

3. **Calibration methodology for automated fact-checking.** FactHarbor's C18 hard gate, C13 evidence rebalancing, and systematic bias measurement are more rigorous than any published calibration approach. This is a publishable contribution.

### 6.2. The Confidence Paradox

A 2025 study ([arXiv 2509.08803](https://arxiv.org/html/2509.08803v1)) found:
- **Small LLMs:** High confidence, lower accuracy (Dunning-Kruger at scale)
- **Large LLMs:** Lower confidence, higher accuracy

**Implication for FactHarbor:** The tiered model strategy (Haiku for extraction, Sonnet for verdicts) is correct. Using a small model for verdicts would produce overconfident wrong answers. Using a large model for extraction would waste resources. The confidence paradox validates FactHarbor's existing tiering.

### 6.3. Cross-Lingual Consistency Is Unsolved

ACL 2025 paper "Cross-Lingual Pitfalls" shows all major LLMs give inconsistent verdicts for semantically identical claims across languages. FactHarbor's calibration data confirms this: French pairs show 2.0pp mean skew vs. English 47.1pp. The difference is real and no model solves it — making FactHarbor's multilingual calibration data valuable to the research community.

### 6.4. The Funding Crisis Creates Opportunity

Meta's US exit from TPFC (April 2025) removed the primary income for dozens of fact-checking organizations. CrowdTangle's deprecation (2024) removed a key shared monitoring tool. Google removed ClaimReview from Search results (June 2025). The entire human fact-checking sector faces an existential funding and tooling crisis.

**For FactHarbor:** Organizations that previously relied on platform partnerships now need independent tools. An open-source automated fact-checking pipeline with transparent methodology could fill the gap that platforms are abandoning.

### 6.5. Prebunking Is the Emerging Paradigm

The field is shifting from reactive fact-checking (debunk after viral) to proactive prebunking (inoculate before spread). EFCSN + Full Fact's "Prebunking at Scale" project leads this with 40+ European organizations. FactHarbor could contribute by identifying emerging misinformation patterns from its analysis data.

### 6.6. EU AI Act Implications

Under the EU AI Act (transparency rules effective August 2025), fact-checking tools used in consequential contexts may be classified as high-risk AI, requiring:
- Bias auditing (FactHarbor's calibration methodology partially satisfies this)
- Human oversight mechanisms
- Transparency about confidence and limitations
- Technical documentation

**For FactHarbor:** The calibration baseline, C18 hard gate, and systematic bias measurement position FactHarbor well for EU AI Act compliance. This could be a competitive advantage in the European market.

---

## 7. Summary: Where FactHarbor Stands

### Strengths (confirmed by landscape survey)

1. **Working multi-agent debate** — No other deployed system does this. Research papers (ED2D, Tool-MAD, DelphiAgent) validate the approach, and FactHarbor is the only working implementation.
2. **Calibration methodology** — More systematic than any published approach. The C18/C13 framework is a publishable contribution.
3. **Atomic claim decomposition + aggregation** — Aligned with the research consensus (SAFE, LoCal, FACT-AUDIT, AVeriTeC all use this pattern).
4. **Multi-provider LLM support** — Cross-provider debate is unique; no other system compares Anthropic vs. OpenAI vs. Google verdicts.
5. **Open-source potential** — Climinator's paper-vs-code gap shows the field needs OSS implementations that actually match their papers. FactHarbor already does.

### Weaknesses (identified by landscape survey)

1. **Evidence retrieval is web-search-only** — The biggest gap. KG²RAG and GraphRAG show graph-guided retrieval is the frontier. C13 (8/10 pairs) confirms this is FactHarbor's #1 quality bottleneck.
2. **No monitoring/detection layer** — Full Fact AI processes 350K sentences/day. FactHarbor only checks what users submit.
3. **No multimodal capability** — The field is moving to image+video+audio verification. FactHarbor is text-only.
4. **No standardized benchmark evaluation** — AVeriTeC and OpenFactCheck provide frameworks FactHarbor should evaluate against.

### Three Actions (from this investigation)

| # | Action | Effort | Impact | Source Concept |
|---|--------|--------|--------|---------------|
| **1** | Implement debate-triggered re-search (evidence retrieval during debate) | Medium | Directly addresses C13 (8/10 pairs) | ED2D + Tool-MAD (Concept 1) |
| **2** | Investigate GraphRAG integration as alternative evidence retrieval path | Medium-High | Structural evidence diversity | KG²RAG + GraphRAG (Concept 2) |
| **3** | Contact Full Fact AI team about partnership exploration | Low | Highest-impact cooperation target | Full Fact model (Concept 3) |

These complement the existing priority table in [Executive Summary](EXECUTIVE_SUMMARY.md) — they address gaps that the previous research (focused on Climinator + Stammbach ecosystem) didn't cover.

---

## Appendix A: Research Sources

### Agent 1 (Opus): AI-Based Systems
Covered: Production systems (Factiverse, Logically, ClaimBuster, Originality.ai, Wisecube, Katteb, Factly), multi-agent debate frameworks (Tool-MAD, DelphiAgent, FACT-AUDIT, ED2D, D3, A-HMAD, Du et al.), evaluation frameworks (AVeriTeC, OpenFactCheck, FactScore, HalluLens), commercial platforms (Perplexity), platform programs (Meta TPFC, X Community Notes, Google, YouTube), government programs (DARPA SemaFor/MediFor).

### Agent 2 (Sonnet): Non-AI Organizations
Covered: 14 fact-checking organizations (PolitiFact, Snopes, FactCheck.org, AFP, Reuters, BBC Verify, Full Fact, Washington Post, Africa Check, Chequeado, Rappler, BOOM, CORRECTIV, Les Decodeurs), 5 networks/platforms (IFCN, EFCSN, Google Fact Check Explorer, Meta TPFC, X Community Notes), professional toolkit (InVID/WeVerify, geolocation tools, social media monitoring, ClaimReview schema), funding landscape analysis.

### Agent 3 (Sonnet): Emerging Technology
Covered: Multimodal fact-checking (C2PA, Sensity AI, Reality Defender), real-time systems (Factiverse Live, Full Fact election coverage), crowdsourced approaches (Community Notes research, Fact Protocol blockchain), evidence retrieval innovations (KG²RAG, GraphRAG, AVeriTeC), calibration research (Confidence Paradox, domain-specific calibration), cross-lingual fact-checking (47-language study, Cross-Lingual Pitfalls), domain-specific systems (medical, climate, financial, election), EU AI Act implications.

### Key Academic Papers Referenced

| Paper | Venue | Year |
|-------|-------|------|
| ED2D / D2D | EMNLP | 2025 |
| Tool-MAD | arXiv | 2026 |
| FACT-AUDIT | ACL | 2025 |
| DelphiAgent | IPM | 2025 |
| D3: Debate, Deliberate, Decide | arXiv | 2024-2025 |
| A-HMAD | JKSU | 2025 |
| KG²RAG | NAACL | 2025 |
| AVeriTeC 2nd Shared Task | FEVER@ACL | 2025 |
| LoCal | WWW | 2025 |
| Cross-Lingual Pitfalls | ACL | 2025 |
| Multilingual vs Crosslingual Retrieval | EMNLP | 2025 |
| Confidence Paradox | arXiv | 2025 |
| MAFT | AAAI | 2025 |
| Community Notes Reduce Engagement | PNAS | 2025 |
| Can Community Notes Replace Fact-Checkers? | ACL | 2025 |
| CheckThat! 2025 | arXiv | 2025 |
| OpenFactCheck | EMNLP | 2024 |
