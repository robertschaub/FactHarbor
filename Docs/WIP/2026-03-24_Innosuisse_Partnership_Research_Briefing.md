# Innosuisse Partnership Research Briefing
**Date:** 2026-03-24 | **For:** Robert Schaub, FactHarbor | **Purpose:** Academic partner identification for Innosuisse grant

---

## Executive Summary

Following Tobias Schimanski's decline and recommendation to look at ZHAW, extensive research across 5 parallel tracks reveals **two exceptionally strong partnership candidates** and a clear grant strategy:

| Priority | Partner | Key Person(s) | Why |
|----------|---------|---------------|-----|
| **#1** | **ZHAW CAI / NLP Group** | Prof. Mark Cieliebak, Pius von Däniken | HAMiSoN project (misinformation detection), CheckThat! 2nd place, ViClaim (EMNLP 2025), deep Innosuisse track record, explicitly invites industry collaboration |
| **#2** | **ETH Zurich — Ash Group** | Prof. Elliott Ash, Jingwei Ni | AFaCTA (claim detection), e-FEVER, Climinator co-author, BallotBot (RAG), startup spin-offs — but no confirmed Innosuisse history |
| Fallback | **UZH — Leippold Group** | Prof. Markus Leippold | Climinator (96% accuracy, debate architecture like FactHarbor), but Tobias warned this loops back to him |

**Recommended approach:** Start with **Innovation Cheque** (CHF 15K, 100% funded, 4-6 week decision) with ZHAW as feasibility study, then scale to full Innovation Project (CHF 100K-500K).

---

## Part 1: ZHAW — The Top Candidate

### Why ZHAW is the Best Fit

1. **Innosuisse DNA.** Fachhochschulen have explicit applied-research mandates. ZHAW "participates extremely successfully in various Innosuisse funding instruments" and has an internal support office for partners.
2. **Direct fact-checking expertise.** Not adjacent work — actual misinformation detection research.
3. **Industry bridge-builder.** Prof. Cieliebak runs SpinningBytes AG (NLP startup) and founded SwissText (Swiss NLP conference). He understands commercial applications.

### Key Researchers

#### Prof. Dr. Mark Cieliebak — NLP Group Head
- President of SwissNLP, CEO of SpinningBytes AG, founder of SwissText conference
- 40+ publications (ACL, EMNLP, LREC)
- Multiple Innosuisse projects (ChaLL, SCAI with Legartis, others)
- **Contact:** ciel@zhaw.ch
- **Profile:** https://www.zhaw.ch/en/about-us/person/ciel

#### Pius von Däniken — Lead Misinformation Researcher
- Leads ZHAW's misinformation detection work
- **HAMiSoN project** (EUR 1.1M, CHIST-ERA funded, 2023-2025): claim worthiness checking, stance detection, multilingual verified claim retrieval
- **CheckThat! Lab** — 2nd place globally in multimodal misinformation detection
- **ViClaim** dataset (EMNLP 2025 main conference) — multilingual claim detection in videos
- **Profile:** https://www.zhaw.ch/en/about-us/person/vode

#### Dr. Jan Milan Deriu — Senior Researcher
- 57 publications, 831+ citations
- HAMiSoN co-investigator, ViClaim co-author
- SwissAI Initiative data collection lead
- Broad NLP expertise: dialogue evaluation, NL-to-SQL, LLM evaluation
- **Profile:** https://www.zhaw.ch/en/about-us/person/deri

#### Patrick Giedemann — PhD Student
- PhD on misinformation detection in videos
- ViClaim, HAMiSoN, DIPROMATS (propaganda detection)
- Building "AI platform for fact-checkers"
- **Profile:** https://www.zhaw.ch/en/about-us/person/gied

#### Also Relevant at ZHAW
- **Dr. Farhad Nooralahzadeh** (InIT) — PhD on "Low-Resource Adaptation of Neural NLP", cross-lingual transfer, agentic AI systems
- **Dr. Jonathan Furst** (InIT) — Language agents, agentic AI, information retrieval — **currently hiring** for "Language Agents (Agentic AI)" researcher
- **Prof. Dr. Jasmina Bogojeska** — Explainable/trustworthy AI (appointed Feb 2024)
- **Dr. Ricardo Chavarriaga** — Head of Swiss CLAIRE office, responsible AI governance

### ZHAW Projects Directly Relevant to FactHarbor

| Project | Funding | Overlap with FactHarbor |
|---------|---------|------------------------|
| **HAMiSoN** | EUR 1.1M (CHIST-ERA) | Claim worthiness, stance detection, multilingual claim retrieval |
| **ViClaim** | ZHAW digital | Multilingual claim detection (EMNLP 2025 main) |
| **CheckThat! Lab** | Competition | Automated misinformation detection — 2nd place |
| **ChaLL** | Innosuisse | NLP chatbot (shows Innosuisse track record) |
| **SCAI** | Industry (Legartis) | Legal NLP with deep learning |
| **CertAInty** | Innosuisse | AI certification framework — "trustworthy AI" |

### How to Approach ZHAW

The CAI website explicitly states: *"If you face a business challenge without an existing market solution, it may be a perfect opportunity for a joint research project with potential access to third-party funding."*

**Recommended first contact:** Email Prof. Cieliebak (ciel@zhaw.ch), referencing:
- HAMiSoN and CheckThat! work (shows you know their research)
- FactHarbor's multi-stage pipeline as a commercial application of their research domain
- Interest in Innosuisse Innovation Cheque as a first step

---

## Part 2: Prof. Elliott Ash — ETH Alternative

### Profile
- **Title:** Associate Professor of Law, Economics, and Data Science
- **Group:** Center for Law & Economics (CLE), ETH Zurich
- **Additional roles:** Scientific Lead (Human-AI Alignment), Swiss AI Initiative; Core Faculty, ETH AI Center; ERC Starting Grant recipient
- **Contact:** elliott.ash@gess.ethz.ch
- **Note:** At Oxford Internet Institute for H1 2026 — but ETH group remains active

### Why Ash is a Strong Fit

His group has published on **exactly** the components of a fact-checking pipeline:

| Paper | Venue | FactHarbor Parallel |
|-------|-------|-------------------|
| **AFaCTA** — LLM-assisted factual claim detection with 3 reasoning paths + majority voting | ACL 2024 | Stage 1 (claim extraction) + Stage 4 (debate) |
| **e-FEVER** — Multi-hop explainable fact verification (60K+ claims) | 2021 | Stage 2 (evidence retrieval) + Stage 4 (verdict) |
| **Knowledge Base Choice in Claim Checking** — domain overlap > KB size | JDIQ 2023 | Stage 2 (research acquisition) |
| **Climinator** — LLM debate framework for climate fact-checking | npj Climate Action 2025 | Stage 4 (verdict debate) — architecturally very similar |
| **BallotBot** — RAG chatbot from authoritative sources | R&R Econ Journal 2025 | Stage 2 (RAG pipeline) |

### Key Group Members

| Name | Role | Relevance |
|------|------|-----------|
| **Jingwei Ni** | PhD (2023-2027), co-supervised by Sachan & Leippold | **HIGH** — lead author on AFaCTA, co-author on Climinator, works directly on claim detection |
| **Dr. Alexander Hoyle** | Postdoc (ETH AI Center Fellow) | NLP evaluation, master's thesis was "Citation Detected: Automated Claim Detection through NLP" |
| **Dr. Dominik Stammbach** | Alumni (now Princeton) | PhD thesis: "Data-Centric Automated Fact Checking" — the single most relevant dissertation, but he's left Switzerland |

### Assessment

**Strengths:** Direct research overlap, ETH prestige strengthens any grant, startup experience (Omnilex, CryptoSearchTools), Swiss AI Initiative leadership.

**Concerns:** No confirmed Innosuisse history (ERC/SNSF-funded instead), at Oxford H1 2026, primary framing is social science/law not commercial products, Stammbach (most relevant person) left for Princeton.

**Verdict:** Strong #2 option. Could be combined with ZHAW (ZHAW as lead research partner, Ash group as academic advisor/co-PI). Or pursue independently if ZHAW doesn't work out.

---

## Part 3: The Research Angle — "Low-Resource Fact-Checking"

### Why Tobias Was Right

The academic distinction matters:

| | Low-Latency RAG (what Robert proposed) | Low-Resource Fact-Checking (what Tobias suggested) |
|---|---|---|
| **Core question** | "How to make RAG faster?" | "What minimal model capacity verifies claims reliably?" |
| **Research depth** | Shallow — engineering optimization | Deep — information theory, knowledge distillation, cross-lingual transfer |
| **Publishability** | Low (systems/engineering) | High — active research front with shared tasks |
| **Venues** | Industry blogs, MLSys | ACL, EMNLP, TACL, FEVER workshops |
| **Grant appeal** | Weak (Innosuisse wants research questions) | Strong |

### The Research Landscape Validates This

**Key finding:** The **AVeriTeC 2025** shared task now explicitly requires:
- Open-weights models only
- **< 10 billion parameters**
- **< 1 minute per claim**

This is the NLP community signaling that **efficient fact-checking is now a first-class research challenge**.

### Landmark Papers

| Paper | Finding | Relevance |
|-------|---------|-----------|
| **Fine-Tuned Transformers vs. LLMs** (SIGIR 2024) | XLM-RoBERTa-Large (0.743 F1) beats GPT-4 (0.624) on claim detection across 114 languages | Small specialized models > frontier LLMs for classification |
| **DRAG: Distilling RAG for SLMs** (ACL 2025) | Transfers RAG from LLMs to small models via knowledge distillation | Directly applicable to FactHarbor pipeline compression |
| **EdgeJury** (Jan 2026) | Ensemble of 3B-8B models achieves 76.2% TruthfulQA with 8.4s latency | Proves small-model ensembles can rival large models |
| **Evidence Retrieval is Almost All You Need** (ACL 2024) | Better retrieval > complex verification; 10-20x speedups with indexed dense retrieval | Validates focus on evidence quality over model size |
| **Fact Checking with Insufficient Evidence** (TACL 2022) | Models worst at detecting missing adverbial context (21% accuracy) | Opens research on evidence sufficiency bounds |

### Proposed Research Framing for Innosuisse

**Title:** *"Resource-Efficient Automated Fact Verification: Distilling Multi-Stage Claim Assessment into Deployable Small Language Models"*

**Novel Research Questions (academic partner investigates):**
1. **Evidence sufficiency under constraints:** What minimum retrieval depth + model capacity maintains verdict reliability within defined confidence bounds?
2. **Cross-stage knowledge distillation:** Can a multi-stage LLM pipeline (claim extraction → evidence retrieval → verdict debate → aggregation) be distilled into specialized SLMs preserving verdict quality?
3. **Multilingual verdict stability under compression:** How does quantization/distillation affect verdict consistency across languages?

**Applied Component (FactHarbor builds):**
- Production pipeline dynamically routing between SLM/LLM tiers based on claim complexity
- Edge deployment demonstrator for real-time fact-checking
- FactHarbor's existing ClaimAssessmentBoundary pipeline as the baseline for measuring quality degradation

**Why it's publishable:** No existing work studies distillation of a **full multi-stage** fact-checking pipeline. Most work addresses single stages (retrieval OR verification). The intersection of evidence sufficiency theory with model compression is unexplored.

---

## Part 4: Innosuisse Grant Strategy

### Recommended Path

```
Step 1 (Now)          Step 2 (Month 1-2)        Step 3 (Month 3-5)         Step 4 (Month 5-6)
Contact ZHAW    →     Innovation Cheque    →     Feasibility Study    →     Full Innovation
Prof. Cieliebak       CHF 15K, 100% funded      Co-develop application     Project Application
                      Decision: 4-6 weeks                                   CHF 100K-500K
```

### Innovation Cheque (Start Here)
- **Amount:** CHF 15,000 (100% Innosuisse-funded, no co-funding needed)
- **Purpose:** Feasibility study with research partner
- **Decision:** 4-6 weeks
- **Key stat:** 26% of cheques lead to full Innosuisse projects; 53% of recipients work with a research partner for the first time
- **Submission:** Rolling, via Innolink platform

### Innovation Project with Implementation Partner (Main Goal)
- **Amount:** No cap. Typical CHF 100K-500K
- **Innosuisse covers:** Research partner costs (40-60% of total)
- **FactHarbor co-funds:** 40-60% of total, minimum 5% cash to research partner, rest can be in-kind (developer hours)
- **Duration:** Up to 36 months
- **Approval rate:** 41% (2024 data, 802 applications)
- **Evaluation meetings (ICT track):** ~8/year, rolling submission (6-7 weeks before meeting)
- **Total timeline to project start:** ~9-12 months from first contact

### Co-Funding Example
For a CHF 400K total project:
- Innosuisse pays: CHF 160K-240K (to ZHAW)
- FactHarbor contributes: CHF 160K-240K
  - Minimum CHF 20K cash (5%)
  - Rest: developer time valued at research institution rates

### Also Consider in Parallel
- **Innosuisse Initial Coaching** (CHF 10K voucher, 12 months) — business strategy refinement
- **Hasler Foundation "Responsible AI"** — has funded claim verification before (Sachan + Leippold + Ash)
- **SwissText 2026** (UZH, June 10, 2026) — Demo/Applied track submission for visibility
- **digitalSwitzerland** — published Dec 2024 report on "Countering Disinformation with AI and Fact-Checking"; potential advocacy partner

---

## Part 5: Swiss Landscape — Competitive Positioning

### No Direct Swiss Competitor Exists
FactHarbor fills a clear gap:
- **Climinator** (UZH) = climate-specific only
- **HAMiSoN** (ZHAW) = social network campaign analysis, not consumer fact-checking
- **vera.ai** (EU) = fact-checker-in-the-loop, not automated verdicts
- **SpinningBytes** (Zurich) = general text analytics, no fact-checking product
- No Swiss startup does **general-purpose, topic-agnostic, automated multi-claim fact-checking with evidence retrieval and verdict generation**

### Related Swiss Institutions

| Institution | Group | Focus | Contact |
|-------------|-------|-------|---------|
| ETH — Media Technology Center | NLP team | Data-centric automated fact-checking | mtc.ethz.ch |
| ETH — LRE Lab (Sachan) | Language Reasoning | FRANQ (RAG hallucination detection), co-held Hasler grant on "Scientific Claim Verification" | lre.inf.ethz.ch |
| EPFL — NLP Lab (Bosselut) | NLP | Knowledge graphs, neural IR, commonsense reasoning | nlp.epfl.ch |
| EPFL — dlab (West) | Comp. Social Science | Wikipedia hoax detection, knowledge gaps | dlab.epfl.ch |
| IDSIA (SUPSI/USI, Lugano) | NLP Group | Biomedical NLP, multiple Innosuisse projects | nlp.idsia.ch |
| UZH — Comp. Linguistics (Sennrich) | NLP | Multilingual NLP, SwissText 2026 chair | cl.uzh.ch |
| Swiss Data Science Center | NLP project | Narrative extraction from text, prejudicial narratives in media | datascience.ch |

### Key Events
- **SwissText 2026** — June 10, UZH Oerlikon. Applied Track + Demo Track + NLP Expo. Chair: Rico Sennrich.
- **CLEF CheckThat! 2025** — International shared task. ZHAW participates regularly.
- **AVeriTeC 2025** — Efficient fact-checking shared task (<10B params, <1 min/claim).

---

## Part 6: Recommended Actions

### Immediate (This Week)
1. **Email Prof. Mark Cieliebak** (ciel@zhaw.ch) — mention HAMiSoN, CheckThat!, your pipeline, interest in Innosuisse Innovation Cheque
2. **Read the digitalSwitzerland report** on fact-checking and AI (Dec 2024): https://digitalswitzerland.com/countering-disinformation-with-a-focus-on-fact-checking-and-ai/

### Short-Term (April 2026)
3. **Apply for Innovation Cheque** (CHF 15K) once ZHAW confirms interest
4. **Consider emailing Prof. Ash** (elliott.ash@gess.ethz.ch) — reference AFaCTA paper, explore whether he'd be open to Innosuisse collaboration or an advisory role
5. **Optionally apply for Innosuisse Initial Coaching** (CHF 10K business coaching voucher)

### Medium-Term (May-June 2026)
6. **SwissText 2026** (June 10, UZH) — attend, network, consider Demo Track submission
7. **Complete feasibility study** with ZHAW from Innovation Cheque
8. **Co-develop full Innovation Project application** with research partner

### Strategic
9. **Reframe the research angle** as "low-resource fact-checking" / "resource-efficient claim verification", not "low-latency RAG"
10. **Position FactHarbor** as "trustworthy AI for information quality" to align with Innosuisse's digital transformation theme and Switzerland's AI strategy

---

## Sources

### ZHAW
- ZHAW CAI: https://www.zhaw.ch/en/engineering/institutes-centres/cai
- NLP Group: https://www.zhaw.ch/en/engineering/institutes-centres/cai/natural-language-processing-group
- HAMiSoN: https://www.zhaw.ch/en/research/project/74234
- CheckThat! result: https://www.zhaw.ch/en/about-us/news/news-releases/news-detail/event-news/cai-researchers-achieve-a-top-rank-in-misinformation-detection-competition/
- ViClaim (EMNLP 2025): https://aclanthology.org/2025.emnlp-main.21/

### ETH — Ash Group
- Elliott Ash: https://elliottash.com/
- AFaCTA (ACL 2024): https://aclanthology.org/2024.acl-long.104/
- Knowledge Base Choice: https://arxiv.org/abs/2111.07795
- Climinator: https://www.nature.com/articles/s44168-025-00215-8
- BallotBot: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5168217
- Dominik Stammbach: https://dominik-stammbach.github.io/

### Low-Resource Fact-Checking Research
- Fine-Tuned Transformers vs. LLMs (SIGIR 2024): https://arxiv.org/html/2402.12147v3
- DRAG: Distilling RAG for SLMs (ACL 2025): https://aclanthology.org/2025.acl-long.358/
- EdgeJury (2026): https://arxiv.org/html/2601.00850v1
- AVeriTeC 2025: https://aclanthology.org/2025.fever-1.15/
- Evidence Retrieval (ACL 2024): https://aclanthology.org/2024.findings-acl.551/
- Fact Checking with Insufficient Evidence (TACL 2022): https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00486/112498

### Innosuisse
- Innovation Projects: https://www.innosuisse.admin.ch/en/innovation-project-with-implementation-partner
- Innovation Cheque: https://www.innosuisse.admin.ch/en/innovation-cheque
- Initial Coaching: https://www.innosuisse.admin.ch/en/initial-coaching-for-start-up
- 2024 Facts & Figures: https://2024.discover-innosuisse.ch/en/facts-and-figures

### Swiss Landscape
- digitalSwitzerland Report: https://digitalswitzerland.com/countering-disinformation-with-a-focus-on-fact-checking-and-ai/
- SwissText 2026: https://www.swisstext.org/current/
- Swiss AI Initiative: https://www.swiss-ai.org
- ETH Media Technology Center: https://mtc.ethz.ch/research/natural-language-processing.html
- SDSC NLP: https://www.datascience.ch/projects/nlp
- vera.ai: https://www.veraai.eu/home
