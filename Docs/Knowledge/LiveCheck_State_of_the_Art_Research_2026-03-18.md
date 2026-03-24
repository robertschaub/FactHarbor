# State of the Art: Automated and Live Fact-Checking

**Prepared for:** Innosuisse Application -- LiveCheck Project
**Date:** 2026-03-18
**Purpose:** Comprehensive literature review and competitive landscape analysis for the LiveCheck innovation project

---

## Table of Contents

1. [Core Surveys and Foundational Works](#1-core-surveys-and-foundational-works)
2. [Live/Real-Time Fact-Checking Systems](#2-livereal-time-fact-checking-systems)
3. [Key Technical Components](#3-key-technical-components-state-of-the-art)
4. [Existing Commercial and Research Systems](#4-existing-commercial-and-research-systems)
5. [Relevant Benchmarks and Datasets](#5-relevant-benchmarks-and-datasets)
6. [Key Research Groups](#6-key-research-groups)
7. [Market Data and Regulatory Context](#7-market-data-and-regulatory-context)
8. [Research Gaps Addressed by LiveCheck](#8-research-gaps-addressed-by-livecheck)
9. [Full Bibliography](#9-full-bibliography)

---

## 1. Core Surveys and Foundational Works

### 1.1 Guo, Schlichtkrull & Vlachos (2022) -- The Definitive NLP Survey

**Citation:** Guo, Z., Schlichtkrull, M., & Vlachos, A. (2022). A Survey on Automated Fact-Checking. *Transactions of the Association for Computational Linguistics*, 10, 178--206.

**Key contribution:** This survey established the canonical NLP framework for automated fact-checking, unifying various definitions and identifying common concepts across the field. It covers techniques based on natural language processing, machine learning, knowledge representation, and databases to automatically predict the veracity of claims. The pipeline is decomposed into: (1) claim detection, (2) evidence retrieval, (3) verdict prediction, and (4) justification production.

**Relevance to LiveCheck:** Defines the foundational pipeline architecture that LiveCheck extends to real-time operation. The survey explicitly identifies the batch-oriented nature of existing systems as a limitation.

**Source:** [ACL Anthology](https://aclanthology.org/2022.tacl-1.11/) | [arXiv:2108.11896](https://arxiv.org/abs/2108.11896)

---

### 1.2 Zeng, Abumansour & Zubiaga (2021) -- Cross-Disciplinary Review

**Citation:** Zeng, X., Abumansour, A. S., & Zubiaga, A. (2021). Automated Fact-Checking: A Survey. *Language and Linguistics Compass*, 15(10), e12438.

**Key contribution:** Reviews automated fact-checking covering both claim detection and claim validation components, with attention to cross-disciplinary connections between NLP, information retrieval, and journalism studies.

**Relevance to LiveCheck:** Provides the broader interdisciplinary context, particularly the connection between automated tools and journalistic workflows -- central to LiveCheck's human-in-the-loop design.

**Source:** [Wiley Online Library](https://compass.onlinelibrary.wiley.com/doi/10.1111/lnc3.12438)

---

### 1.3 Vykopal et al. (2024) -- LLMs in Automated Fact-Checking

**Citation:** Vykopal, I., Pikuliak, M., Ostermann, S., & Simko, M. (2024). Generative Large Language Models in Automated Fact-Checking: A Survey. *arXiv:2407.02351*.

**Key contribution:** Examines 70 papers on how generative LLMs assist in combating misinformation at scale, covering four primary tasks: check-worthy claim detection, previously fact-checked claim detection, evidence retrieval, and fact verification/fake news detection. Organizes approaches into classification/regression, generation, and synthetic data generation.

**Key findings relevant to LiveCheck:**
- Only 5 of 70 papers explored RAG and ReAct despite their potential -- significant underexploration.
- 57 of 70 papers focus on English only; multilingual capability remains a gap.
- Real-time fact-checking identified as largely unexplored territory.
- 35 distinct LLMs employed across the literature; GPT family dominates.

**Relevance to LiveCheck:** Confirms that real-time, multilingual, evidence-grounded fact-checking with LLMs is an open research area. LiveCheck's architecture directly addresses the identified gaps in RAG-based and interactive fact-checking.

**Source:** [arXiv:2407.02351](https://arxiv.org/html/2407.02351v1)

---

### 1.4 Nakov et al. (2021, 2022) -- CheckThat! and Propaganda Detection

**Citation:** Nakov, P. et al. (2021--2022). Multiple publications on automated fact-checking, propaganda detection, and the CheckThat! shared task series.

**Key contribution:** Preslav Nakov has been instrumental in organizing the CLEF CheckThat! Lab (running since 2018, now in its 8th edition) and in developing multimodal approaches to disinformation detection. His group at MBZUAI has produced tools including LM-Polygraph (uncertainty quantification), Factcheck-Bench (evaluation framework), Loki (open-source fact verification), OpenFactCheck (unified evaluation framework), and FRAPPE (framing/propaganda detection).

**Relevance to LiveCheck:** The CheckThat! task definitions for check-worthiness provide the foundation for LiveCheck's streaming claim detection. Nakov's uncertainty quantification work (LM-Polygraph) is directly applicable to LiveCheck's confidence calibration needs.

**Source:** [MBZUAI Faculty Profile](https://mbzuai.ac.ae/study/faculty/preslav-nakov/)

---

### 1.5 Warren et al. (2025) -- Fact-Checkers' Requirements for Explainable AFC

**Citation:** Warren, G. et al. (2025). Show Me the Work: Fact-Checkers' Requirements for Explainable Automated Fact-Checking. *CHI '25*, Yokohama, Japan.

**Key contribution:** Through semi-structured interviews with professional fact-checkers, this study identifies requirements for automated fact-checking explanations. The most prominent requirement is *replicability* -- all participants emphasized the importance of including links to sources, public data, and tools referenced in the fact-checking process. Findings reveal unmet explanation needs and identify criteria for explanations that trace reasoning paths, reference specific evidence, and highlight uncertainty and information gaps.

**Relevance to LiveCheck:** Directly validates LiveCheck's design emphasis on source attribution, evidence transparency, and uncertainty communication. These are not just technical features but verified professional requirements.

**Source:** [ACM DL](https://dl.acm.org/doi/10.1145/3706598.3713277) | [arXiv:2502.09083](https://arxiv.org/abs/2502.09083)

---

## 2. Live/Real-Time Fact-Checking Systems

### 2.1 LiveFC: The First End-to-End Live Audio Fact-Checking System

**Citation:** Venktesh, V. & Setty, V. (2024). LiveFC: A System for Live Fact-Checking of Audio Streams. *WSDM 2025*. arXiv:2408.07448.

**Authors/Affiliations:** Venktesh V (TU Delft, Netherlands), Vinay Setty (University of Stavanger & Factiverse AI, Norway).

**System architecture (6 components):**
1. **Transcription Module:** Whisper Live with whisper-large-v3, HLS audio segments, Voice Activity Detection
2. **Speaker Diarization:** Overlap-aware online diarization via adapted diart module with incremental clustering
3. **Claim Detection:** Fine-tuned XLM-RoBERTa-Large classifier (trained on ClaimBuster, CLEF CheckThat!, and 1,076 production annotations)
4. **Claim Decomposition:** Mistral-7b with chain-of-thought prompting
5. **Evidence Retrieval:** Multi-source (Google, Bing, Wikipedia, You.com, Semantic Scholar, FactiSearch index of 280K fact-checks); multilingual cross-encoder ranking
6. **Verification:** Fine-tuned XLM-RoBERTa-Large for NLI classification with majority voting

**Performance:**
- Claim Detection: 0.899 macro-F1
- Veracity Prediction: 0.708 macro-F1 (offline), 82.59% precision / 85.78% recall / 83.92% F1 (2024 Presidential Debate case study)
- Identified all 30 PolitiFact claims + additional claims (352 from Trump, 339 from Biden)
- Audio processed in rolling 5-second buffers with 500ms updates
- Outperformed GPT-4 and GPT-3.5-Turbo baselines

**Limitations:**
- Requires m3u8 streaming format
- Binary supported/refuted only (no fine-grained partial truth)
- No multimodal evidence sources
- Limited language support

**Relevance to LiveCheck:** LiveFC is the closest existing system to LiveCheck's vision, but has critical limitations that LiveCheck addresses: (a) binary verdicts vs. LiveCheck's graduated uncertainty-aware signals, (b) no human-in-the-loop escalation, (c) no evidence quality assessment, (d) no source reliability weighting, (e) no attribution quality metrics. LiveCheck's architecture goes significantly beyond LiveFC in depth and transparency.

**Source:** [arXiv:2408.07448](https://arxiv.org/abs/2408.07448) | [ACM DL](https://dl.acm.org/doi/10.1145/3701551.3704128)

---

### 2.2 Factiverse Real-Time Debate Fact-Checking

**Organization:** Factiverse AI (Bergen, Norway; founded by award-winning data scientists and journalists, collaborating with University of Stavanger and TU Delft).

**Capabilities:**
- Real-time transcription of televised debates, filtering factual claims from opinions
- Multi-source web search (Google, Bing, You.com, academic papers)
- Claims outperformance vs. GPT-4, Mistral 7B, GPT-3 in check-worthiness identification
- Supports 114 languages
- ~80% success rate
- Trained on 50,000 certified fact-checks from IFCN

**Demonstrated deployments:**
- 2024 U.S. Presidential Debates: tracked 1,123 claims in real-time
- Finland MTV party leaders' debate: identified 128 factual claims
- EU election debates in Denmark (Spring 2024)
- Used by Norwegian fact-checking outlet Faktisk for TV program verification

**Funding:** Secured EUR 1 million; won Best AI Startup (Nora AI) and Digital Trust Challenge (KI Park Germany) in 2023.

**Relevance to LiveCheck:** Factiverse is the most commercially advanced competitor. Key differentiation for LiveCheck: (a) Factiverse provides speed-focused classification, LiveCheck provides evidence-grounded attribution, (b) Factiverse is proprietary/closed, LiveCheck targets transparent reasoning chains, (c) no published evidence quality assessment or uncertainty quantification in Factiverse's approach.

**Source:** [TechCrunch](https://techcrunch.com/2024/11/17/norwegian-startup-factiverse-wants-to-fight-disinformation-with-ai/) | [Factiverse Blog](https://www.factiverse.ai/blog/factiverse-leads-real-time-fact-checking-in-2024-u-s-presidential-and-vp-debates)

---

### 2.3 ClaimBuster: Pioneer of Live Claim Detection

**Citation:** Hassan, N. et al. (2017). Toward Automated Fact-Checking: Detecting Check-worthy Factual Claims by ClaimBuster. *KDD 2017*.

**Organization:** IDIR Lab, University of Texas at Arlington.

**Capabilities:**
- Real-time monitoring of broadcast TV, online video streams, news articles, and social media
- DeBERTa-based model classifying sentences into Check-worthy Factual Sentence (CFS), Unimportant Factual Sentence (UFS), and Non-Factual Sentence (NFS)
- Used for live coverage of U.S. presidential election debates since 2016
- Monitors social media platforms and Hansard

**Relevance to LiveCheck:** ClaimBuster pioneered the real-time claim detection paradigm but focuses only on check-worthiness classification (the first pipeline stage). It does not perform evidence retrieval or verification. LiveCheck builds on this foundation by extending the full pipeline to real-time operation.

**Source:** [KDD 2017](https://dl.acm.org/doi/10.1145/3097983.3098131) | [ClaimBuster Website](https://idir.uta.edu/claimbuster/)

---

### 2.4 Manual Live Fact-Checking (Baseline)

During the 2024 U.S. election cycle, PolitiFact, PBS News, CBS News, and other organizations conducted live fact-checking of all presidential and vice-presidential debates. CBS News aired QR codes linking to a live blog powered by 20 trained journalists. These efforts remain entirely manual, with typical turnaround times of 15--60 minutes per claim.

**Relevance to LiveCheck:** Demonstrates the strong demand for live fact-checking from major media organizations, while highlighting the scalability ceiling of manual approaches. LiveCheck's human-in-the-loop model bridges this gap by providing AI-assisted triage and evidence gathering to accelerate human review.

---

## 3. Key Technical Components (State of the Art)

### 3.1 Claim Detection and Extraction

**State of the art:**
- **ClaimBuster (Hassan et al., 2017):** DeBERTa-based check-worthiness classifier, the foundational system
- **CLEF CheckThat! Lab (2018--2025):** The primary shared task series, now in its 8th edition. 2024 edition covered 6 tasks in 15 languages; 2025 edition covers subjectivity, claim normalization, numerical fact-checking, and scientific web discourse in 20+ languages
- **AFaCTA (Ni, Shi, Stammbach, Sachan, Ash & Leippold, ACL 2024):** Framework assisting annotation of factual claims using LLMs. Incorporates three distinct prompting steps (Direct Classification, Fact-Extraction CoT, Reasoning with Debate) and aggregates results. Produced PoliClaim dataset spanning diverse political topics. Applied to 6 million U.S. Congressional speeches (1858--2014)
- **Document-level claim extraction (2024):** Recent work on extracting claims from full documents with decontextualization for downstream verification

**Key gap for LiveCheck:** Existing claim detection operates on complete sentences/documents. Streaming claim detection from continuous audio with rolling windows, incomplete utterances, and speaker changes remains underexplored.

**Sources:** [ACL 2024 (AFaCTA)](https://aclanthology.org/2024.acl-long.104/) | [CLEF 2025 CheckThat!](https://arxiv.org/abs/2503.14828)

---

### 3.2 Evidence Retrieval Under Time Constraints

**State of the art:**
- **FIRE (Xie, Xing, Wang et al., NAACL 2025):** Agent-based framework integrating iterative retrieval and verification. Employs a confidence-based mechanism to decide whether to search for more evidence or issue a verdict. Achieves comparable performance while reducing LLM costs by 7.6x and search costs by 16.5x. Developed at MBZUAI (Nakov's group)
- **RAV Framework (2024):** Hybrid evidence retrieval with efficient retriever for preliminary pruning + ranker for precise sorting
- **Anytime reasoning algorithms (2024):** Research on budget-relative policy optimization for models that can produce answers at any interruption point with improving quality
- **Streaming hybrid retrieval (2024--2025):** FLASH Framework parallelizes sparse (BM25) and dense (HNSW) searches, fusing via reciprocal rank fusion (RRF). Sub-second latency achieved with in-memory vector indexes (5--10ms)

**Key gap for LiveCheck:** FIRE's iterative approach is the closest to what LiveCheck needs, but it operates on static claims, not streaming input. No existing system combines time-budgeted evidence retrieval with confidence-based early stopping in a real-time streaming context.

**Sources:** [NAACL 2025 (FIRE)](https://aclanthology.org/2025.findings-naacl.158/) | [FIRE GitHub](https://github.com/mbzuai-nlp/fire)

---

### 3.3 Source Attribution and Faithfulness

**State of the art:**
- **NLI-based verification:** Four families assess claim-evidence relationships: embedding-based similarity, fine-tuned NLI models, fine-tuned reasoning-based rerankers, and LLMs. LLMs achieve the strongest overall performance (MRR 0.75)
- **Atomic fact decomposition (2024--2025):** Decomposing text into atomic facts proven valuable for factuality evaluation. Atomic-SNLI (2025) proposes fine-grained NLI through atomic fact decomposition
- **Attribution benchmarks:** ALCE and AttributedQA provide evaluation frameworks for source attribution quality
- **Incremental evidence surfacing:** Incremental strategies surface complementary evidence more efficiently than one-shot approaches

**Key gap for LiveCheck:** Attribution quality under time pressure is unstudied. How evidence attribution degrades with shorter retrieval windows, and how to communicate attribution confidence to users in real-time, are open questions.

**Sources:** [arXiv:2601.21387](https://arxiv.org/html/2601.21387)

---

### 3.4 Multi-Agent Debate for Verification

**State of the art:**
- **CLIMINATOR (Leippold et al., npj Climate Action 2025):** Mediator-Advocate framework where advocates represent perspectives from specific sources (IPCC, WMO, scientific literature). Achieves up to 96% accuracy in binary climate claim assessments. Demonstrates that iterative debate reliably converges toward scientific consensus even when including denialist perspectives
- **Tool-MAD (arXiv, January 2026):** Multi-agent debate framework where each agent uses a distinct external tool (search API, RAG module). Introduces adaptive query formulation that iteratively refines evidence retrieval based on debate flow. Integrates Faithfulness and Answer Relevance scores. Up to 5.5% accuracy improvement over prior state-of-the-art
- **DebateCV (2025):** Two role-playing Debater agents (affirming/refuting) with a Moderator agent. Achieves 83.4% accuracy under golden evidence, 72.8--73.6% under retrieved evidence, with 2.0--5.8% absolute gains over HerO baseline
- **Du et al. (2023):** "Improving Factuality and Reasoning in Language Models through Multiagent Debate" -- foundational work showing multi-agent debate significantly improves mathematical reasoning and reduces factual hallucinations

**Key gap for LiveCheck:** All existing debate frameworks operate in batch mode with no time constraints. Adapting multi-agent debate to real-time fact-checking with hard latency budgets is unexplored. LiveCheck would pioneer time-constrained adversarial verification.

**Sources:** [npj Climate Action (CLIMINATOR)](https://www.nature.com/articles/s44168-025-00215-8) | [arXiv:2601.04742 (Tool-MAD)](https://arxiv.org/abs/2601.04742)

---

### 3.5 Uncertainty Quantification in NLP

**State of the art:**
- **Conformal Prediction for NLP (TACL 2024):** Comprehensive survey establishing conformal prediction as a theoretically sound, model-agnostic, distribution-free framework for NLP uncertainty quantification
- **ConU (EMNLP Findings 2024):** Applies conformal prediction to black-box LLMs in open-ended NLG tasks. Introduces uncertainty measures based on self-consistency theory. Achieves strict control over correctness coverage rates across 7 LLMs on 4 NLG datasets
- **Conformal Language Modeling (ICLR 2024):** Formal statistical guarantees for language model outputs
- **LM-Polygraph (Nakov/MBZUAI):** Tool predicting LLM uncertainty using cheap, fast uncertainty quantification techniques
- **Token-Entropy Conformal Prediction (TECP, 2025):** Treats log-probability-based token entropy as nonconformity scores for prediction sets with finite-sample coverage guarantees

**Key gap for LiveCheck:** Uncertainty quantification for streaming predictions with evolving evidence bases is unstudied. How to calibrate and communicate confidence when evidence is still being gathered (provisional verdicts) is a novel research question that LiveCheck directly addresses.

**Sources:** [TACL 2024 (CP Survey)](https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00715/125278) | [EMNLP 2024 (ConU)](https://aclanthology.org/2024.findings-emnlp.404/)

---

### 3.6 Human-in-the-Loop Fact-Checking

**State of the art:**
- **Full Fact AI tools (2024--2025):** Used by 40+ fact-checking organizations in 30 countries, 3 languages. AI monitors claims from TV, radio, social media, online news. Accuracy improved from 50% to 80% (by July 2024 with Cambridge collaboration). Supported 12 national elections in 2024. All AI outputs reviewed by humans before publication
- **Semi-supervised active learning:** Human-in-the-loop approaches where users provide feedback or labels for selected instances
- **30% adoption (2024):** Approximately 30% of professional fact-checkers integrated AI into their workflows by 2024
- **Spiegel Group:** Developed tools that score claims for accuracy before human review, with careful implementation ensuring human oversight

**Key gap for LiveCheck:** Existing human-in-the-loop systems operate asynchronously (claim flagged, human reviews later). Real-time escalation with latency-aware triage -- deciding which live claims need immediate human attention vs. automated handling -- is an open design challenge.

**Sources:** [Full Fact AI](https://fullfact.org/ai/) | [Full Fact Blog](https://fullfact.org/blog/2024/jun/the-ai-election-how-full-fact-is-leveraging-new-technology-for-uk-general-election-fact-checking/)

---

### 3.7 Speech Recognition for Real-Time Applications

**State of the art:**
- **Whisper Large V3 Turbo (October 2024):** 5.4x speed improvement through architectural optimization (32 to 4 decoder layers). WER reduced 72%+ vs. prior MLPerf ASR model (RNN-T)
- **Whisper Streaming:** Achieves 3.3 seconds latency on unsegmented long-form speech transcription; demonstrated at multilingual conferences
- **Bloomberg Streaming Whisper (Interspeech 2025):** Converts Whisper into a true streaming model with near-offline accuracy and low, predictable delay using standard CPUs
- **Gladia Real-Time:** 300ms transcription latency, 100+ languages, embedded NER and sentiment analysis
- **SpeakerLM (2025):** End-to-end multimodal LLM for joint speaker diarization and ASR, addressing limitations of cascaded systems
- **pyannote-audio:** Leading open-source speaker diarization library with neural building blocks

**Real-time diarization performance:** Word diarization error rate of 2.68% in two-speaker scenarios, 11.65% in three-speaker scenarios (evaluated on political talk shows).

**Relevance to LiveCheck:** The ASR component is mature enough for LiveCheck's needs. Whisper Streaming + pyannote diarization provides a viable foundation for the streaming ingestion layer. The key challenge is downstream -- processing transcribed claims fast enough for meaningful real-time verification.

**Sources:** [arXiv:2307.14743](https://arxiv.org/abs/2307.14743) | [Bloomberg Research](https://www.bloomberg.com/company/stories/bloombergs-ai-researchers-turn-whisper-into-a-true-streaming-asr-model-at-interspeech-2025/)

---

## 4. Existing Commercial and Research Systems

### 4.1 Competitive Landscape Summary

| System                   | Type         | Real-Time            | Evidence-Based | Attribution | Uncertainty | Human-in-Loop | Languages |
|--------------------------|--------------|----------------------|----------------|-------------|-------------|---------------|-----------|
| **LiveFC**               | Research     | Yes                  | Partial        | No          | No          | No            | Limited   |
| **Factiverse**           | Commercial   | Yes                  | Partial        | No          | No          | Via Faktisk   | 114       |
| **ClaimBuster**          | Research     | Yes (detection only) | No             | No          | No          | No            | English   |
| **Full Fact AI**         | Non-profit   | No (monitoring)      | No             | No          | No          | Yes           | 3         |
| **Logically**            | Commercial   | No                   | Partial        | No          | No          | Yes           | 57        |
| **CLIMINATOR**           | Research     | No                   | Yes            | Yes         | Partial     | No            | English   |
| **Loki/OpenFactCheck**   | Research/OSS | No                   | Yes            | Yes         | No          | No            | Multi     |
| **LiveCheck (proposed)** | Innovation   | **Yes**              | **Yes**        | **Yes**     | **Yes**     | **Yes**       | **Multi** |

---

### 4.2 Detailed Competitor Profiles

#### Factiverse (Norway)
- **Founded:** Bergen, Norway; collaboration with University of Stavanger and TU Delft
- **Funding:** EUR 1 million (2023)
- **Technology:** Real-time transcription + claim detection + web search verification
- **Deployments:** 2024 U.S. Presidential/VP debates, Finnish party debates, Danish EU election debates
- **Strengths:** Speed, multilingual (114 languages), production-proven in debate settings
- **Weaknesses:** Proprietary, ~80% accuracy, no published evidence quality framework, no formal uncertainty quantification
- **LiveCheck differentiation:** Evidence depth, source attribution, uncertainty-aware outputs, open evaluation

#### Full Fact (UK)
- **Status:** UK's leading independent fact-checking charity
- **AI Tools:** Used by 40+ organizations in 30 countries; monitors TV, radio, social media, online news
- **Technology:** Generative AI for monitoring and detecting misinformation at internet scale
- **2024 Performance:** Supported 12 national elections; accuracy improved from 50% to 80% (with Cambridge)
- **Strengths:** Scale, partnerships, proven workflow integration
- **Weaknesses:** Not real-time verification; monitoring/flagging only; human review required for all outputs
- **LiveCheck differentiation:** Real-time processing, automated evidence gathering, live graduated signals

#### Logically (UK/India)
- **Founded:** 2017, Brighouse, England; offices in London, Mysore, Bangalore, Virginia
- **Product:** Logically Facts Accelerate -- AI for claim extraction and urgency scoring in 57 languages
- **2024:** During India General Election, over half of online fact-checked content processed using AI
- **Acquisition:** Acquired Insikt AI (Barcelona) in August 2024
- **Partnerships:** Meta, TikTok
- **Strengths:** Scale, multi-language, platform partnerships
- **Weaknesses:** Not real-time audio/video; text-focused
- **LiveCheck differentiation:** Audio/video streaming, evidence-based verification vs. classification

#### Google Fact Check Tools / ClaimReview
- **Technology:** ClaimReview structured data markup (Schema.org); Fact Check Explorer; Claim Search API
- **Status:** Google phasing out ClaimReview markup support in Google Search (2024), though Fact Check Explorer continues
- **Relevance:** Provides the data infrastructure standard for fact-check interoperability
- **LiveCheck differentiation:** LiveCheck produces fact-checks; ClaimReview is a dissemination/markup standard

#### Buster.ai (France)
- **Funding:** EUR 2 million seed round (OneRagtime, Takara Capital)
- **Technology:** Breaks claims into central meaning, parses against 11,000+ sources (open data, research papers, government documents, press agencies); analyzes text, video, images
- **Strengths:** Multi-source verification, browser extension/API
- **Weaknesses:** Not specifically real-time audio/video streaming

#### Maldita.es (Spain)
- **Approach:** Community-driven through automated chatbot on closed messaging apps
- **AI Tools:** In-house development comparable to Full Fact; predictive claim identification
- **Strengths:** Community engagement model, Spanish-language expertise

#### Newtral (Spain)
- **Goal:** Develop the first real-time automated fact-checking tool combining human and computer intelligence
- **Status:** Aspirational -- production system not yet demonstrated at scale

#### Chequeado (Argentina)
- **Tool:** Chequeabot -- automatically identifies claims from ~30 media outlets daily using NLP and ML
- **Impact:** Half of weekly fact-checks address claims identified by AI
- **Collaboration:** Won Google.org AI Impact Challenge (2019) together with Full Fact and Africa Check

#### Africa Check
- **Collaboration:** Joint AI development with Full Fact and Chequeado, funded by Google.org AI Impact Challenge
- **Focus:** Scaling fact-checking with AI across African contexts

#### CLIMINATOR (UZH)
- **Authors:** Leippold, Vaghefi, Muccione, Bingler, Stammbach, et al.
- **Architecture:** Mediator-Advocate framework with multiple LLM agents representing different authoritative sources (IPCC, WMO, scientific literature)
- **Performance:** Up to 96% accuracy on climate claims; robust against adversarial denialist perspectives
- **Venue:** npj Climate Action, 2025
- **Strengths:** Deep evidence grounding, adversarial robustness, scientific rigor
- **Weaknesses:** Domain-specific (climate), batch-only, not real-time

#### Loki & OpenFactCheck (MBZUAI)
- **Loki:** 5-step pipeline (Decomposer, Checkworthiness Identifier, Query Generator, Evidence Retriever, Claim Verifier). Optimized for accuracy, latency, robustness, cost-efficiency. Supports multiple languages and LLMs. Open-source
- **OpenFactCheck:** Unified framework with 3 modules: Response Evaluator (customizable fact-checker), LLM Evaluator (overall factuality assessment), Fact Checker Evaluator (evaluating automatic fact-checkers)
- **Strengths:** Open-source, modular, comprehensive evaluation
- **Weaknesses:** Batch operation only; no streaming/real-time capability

#### TrueMedia.org (US, closed January 2025)
- **Focus:** Deepfake detection (images, video, audio) with ~90% accuracy
- **Technology:** Multi-model ensemble with partners (Hive, Clarity, Reality Defender, Microsoft)
- **Impact:** Detected 9,700+ deepfake videos across 41 AI content farms (380M+ views)
- **Status:** Closed January 2025; open-sourced detection models
- **Relevance:** Complementary to LiveCheck -- deepfake detection is media manipulation; LiveCheck is factual claim verification

---

## 5. Relevant Benchmarks and Datasets

### 5.1 Core Fact Verification Benchmarks

| Dataset          | Size          | Task                              | Key Features                                                                                                         | Year |
|------------------|---------------|-----------------------------------|----------------------------------------------------------------------------------------------------------------------|------|
| **FEVER**        | 185K claims   | Fact extraction & verification    | Claims generated from Wikipedia; 3-class (Supported/Refuted/NEI)                                                     | 2018 |
| **FEVER 2.0**    | + adversarial | Adversarial fact verification     | Adversarial attacks on FEVER systems                                                                                 | 2019 |
| **FEVEROUS**     | 87K           | Structured + textual verification | Combines tables and text as evidence                                                                                 | 2021 |
| **AVeriTeC**     | 4,568 claims  | Real-world claim verification     | Real fact-checker claims from 50 organizations; 4-class incl. "Conflicting Evidence"; question-answer evidence pairs | 2024 |
| **AVeriTeC 2.0** | Extended      | Extended real-world verification  | FEVER 2025 shared task                                                                                               | 2025 |
| **LIAR**         | 12.8K         | Fake news detection               | PolitiFact statements with speaker/context metadata; 6-class fine-grained                                            | 2017 |
| **MultiFC**      | Multi-domain  | Multi-domain fact-checking        | Claims from multiple fact-checking websites                                                                          | 2019 |
| **X-Fact**       | Multilingual  | Cross-lingual fact verification   | Multiple languages                                                                                                   | 2021 |

### 5.2 Domain-Specific Benchmarks

| Dataset           | Domain               | Size         | Key Features                                                 |
|-------------------|----------------------|--------------|--------------------------------------------------------------|
| **SciFact**       | Biomedical           | 1.4K claims  | Expert-written scientific claims vs. peer-reviewed abstracts |
| **HealthVer**     | Health/COVID         | 14,330 pairs | TREC-COVID claims verified against CORD-19 abstracts         |
| **CLIMATE-FEVER** | Climate              | Claims       | Climate change claims vs. Wikipedia evidence                 |
| **ClimateCheck**  | Climate/Social media | Claims       | Social media claims mapped to scholarly articles             |
| **COVID-Fact**    | COVID-19             | Claims       | COVID-specific misinformation verification                   |
| **RealFactBench** | Multi-domain         | 6K claims    | Knowledge Validation, Rumor Detection, Event Verification    |

### 5.3 Shared Task Series

- **CLEF CheckThat! Lab (2018--2025):** 8 editions. 2024: 6 tasks, 15 languages. 2025: subjectivity, claim normalization, numerical fact-checking, scientific discourse, 20+ languages
- **FEVER Workshop (2018--2025):** 7 editions. Hosts AVeriTeC shared task. 21 submissions in 2024, 18 surpassing baseline
- **AVerImaTeC:** Multimodal extension of AVeriTeC (images + text)

### 5.4 Evaluation Gap for Live Fact-Checking

**No dedicated benchmark exists for evaluating live/streaming fact-checking systems.** LiveFC's evaluation used the 2024 Presidential Debate as a case study, comparing against PolitiFact's manual checks. There is no standardized benchmark measuring:
- End-to-end latency from utterance to verdict
- Accuracy degradation under time pressure
- Attribution quality in real-time settings
- Provisional verdict stability (how verdicts change as evidence accumulates)
- Human-in-the-loop escalation effectiveness

**This is a significant gap that LiveCheck can address by contributing a live fact-checking evaluation benchmark.**

---

## 6. Key Research Groups

### 6.1 Swiss Research Groups (Potential Partners)

#### Markus Leippold & Tobias Schimanski -- University of Zurich (UZH)
- **Affiliation:** Department of Finance, UZH
- **Key work:** CLIMINATOR (96% accuracy climate fact-checking with debate framework), ClimRetrieve (IR from climate disclosures), AFaCTA (with ETH colleagues), PoliClaim dataset
- **Published at:** npj Climate Action (2025), ACL 2024, EMNLP 2024, ClimateNLP 2025
- **Schimanski current status:** Doctoral researcher at UZH; co-editor of ClimateNLP 2025 workshop
- **Relevance:** Deep expertise in evidence-based fact-checking with multi-agent debate, claim detection with LLMs. Direct overlap with LiveCheck's verification architecture. Known to LiveCheck team (meeting 2026-03-18)

#### Elliott Ash & Dominik Stammbach -- ETH Zurich
- **Affiliation:** Center for Law & Economics, ETH Zurich (Ash); Stammbach now at Princeton CITP
- **Key work:** AFaCTA (ACL 2024) -- factual claim detection framework with LLMs; LePaRD (ACL 2024) -- legal passage retrieval; Stammbach's doctoral dissertation on data-centric automated fact-checking at ETH
- **Relevance:** Claim detection expertise, large-scale annotation frameworks, data-centric approaches to fact-checking. ETH connection provides Swiss research institution partner potential

### 6.2 International Research Groups

#### Preslav Nakov -- MBZUAI (Abu Dhabi)
- **Role:** Professor and Department Chair for NLP
- **Key contributions:** CLEF CheckThat! Lab co-organizer, FIRE framework (NAACL 2025), LM-Polygraph (uncertainty), Factcheck-Bench, Loki, OpenFactCheck, FRAPPE
- **Relevance:** Leading figure in automated fact-checking infrastructure; his tools (especially FIRE for iterative retrieval and LM-Polygraph for uncertainty) are directly relevant to LiveCheck

#### Isabelle Augenstein -- University of Copenhagen
- **Role:** Full professor, head of NLP section; ERC Starting Grant holder
- **Group:** CopeNLU (with Pepa Atanasova)
- **Key work:** ExplainYourself project (ERC Starting Grant on Explainable and Robust Automatic Fact Checking)
- **Relevance:** Explainability in fact-checking -- directly relevant to LiveCheck's transparency and attribution goals

#### Andreas Vlachos -- University of Cambridge
- **Role:** Professor of NLP and Machine Learning; Dinesh Dhamija Fellow of Fitzwilliam College
- **Key work:** Co-author of Guo et al. survey; AVeriTeC shared task organizer; zero-shot fact verification via natural logic (EMNLP 2024); TSVer benchmark for time-series evidence (2025)
- **Funding:** ERC, EPSRC, ESRC, Facebook, Amazon, Google, DARPA, Alan Turing Institute
- **Relevance:** Defines the field's evaluation standards; AVeriTeC represents the state-of-the-art benchmark for real-world fact verification

#### Vinay Setty -- University of Stavanger / Factiverse
- **Key work:** LiveFC system (WSDM 2025); dual role as academic researcher and Factiverse co-founder
- **Relevance:** Closest competitor researcher; represents the only group with published live fact-checking system results

#### Iryna Gurevych -- Technical University of Darmstadt
- **Key work:** Co-author of FIRE (NAACL 2025); extensive work on argument mining and claim verification
- **Relevance:** Argument mining and iterative evidence retrieval

---

## 7. Market Data and Regulatory Context

### 7.1 Fact-Checking Industry Census

- **Active fact-checking projects worldwide (2025):** 443 (Duke Reporters' Lab census), down ~2% from 2024
- **Countries covered:** 116 countries, 70+ languages
- **Historical growth:** From 110 projects (2014) to 453 (2022) -- 300%+ increase, now plateaued ~450
- **Projects in dangerous journalism environments:** Nearly 80 operate in countries judged dangerous by Reporters Without Borders
- **Production volume:** Fact-check article volume decreased ~6% in 2025 vs. 2024
- **Meta's impact:** ~160 projects participated in Meta's fact-checking program; program ended in U.S. (January 2025)

### 7.2 Related Technology Markets

| Market                         | 2024 Size | Projected Size       | CAGR   | Source                    |
|--------------------------------|-----------|----------------------|--------|---------------------------|
| Fake Image Detection           | USD 0.6B  | USD 3.9B (2029)      | 41.6%  | MarketsandMarkets         |
| Deepfake Detection             | --        | Significant (2033)   | 37.45% | Spherical Insights        |
| AI Market (overall)            | USD 214B+ | USD 1.3T+ (2030)     | ~35%   | Fortune Business Insights |
| Disinformation Detection Tools | --        | Multi-million (2030) | 5.2%   | Market reports            |

- **Advertising revenue to misinformation sites:** USD 2.6 billion/year (NewsGuard/comScore)
- **Cost of fake reviews to businesses:** USD 152 billion globally (2021)

### 7.3 AI/VC Investment Context

- **Global venture funding 2025:** Up 30% YoY from $328B (2024); ~50% went to AI-related companies
- **AI startup VC 2025:** $89.4 billion (34% of all VC investment)
- **Fact-checking specific funding is modest** compared to broader AI: Factiverse (EUR 1M), Buster.ai (EUR 2M), Full Fact (grant-funded). This represents an underfunded niche relative to the problem's scale

### 7.4 EU Regulatory Drivers

#### Digital Services Act (DSA)
- Adopted 2022, fully applicable February 2024
- Code of Practice on Disinformation integrated as Code of Conduct under DSA
- 44 commitments and 128 concrete measures including "strengthening the fact-checking community"
- **Enforcement challenges:** Between 2022-2025, platforms reduced committed measures by 31%; Microsoft and Google withdrew from fact-checking measures; X left the Code entirely

#### EU AI Act
- Entered into force August 2024 (Regulation EU 2024/1689)
- Full enforcement date: 2 August 2026
- Mandates transparency for AI-generated content; requirements for high-risk AI systems

#### European Democracy Action Plan (EDAP)
- Includes Political Advertising Regulation 2024/900 (transparency in political advertising)
- European Network of Fact-Checkers: EUR 2.5M call for proposals launched April 2025

#### European Digital Media Observatory (EDMO)
- EU's largest interdisciplinary network against disinformation
- 15 national/multinational hubs
- EDMO central refinanced with ~EUR 2.5M; existing 6 hubs receive ~EUR 8.8M via DIGITAL grants
- December 2025: EDMO reported sharp rise in AI-produced/manipulated disinformation

### 7.5 Swiss Context

- **SWI swissinfo.ch:** Branch of SRG SSR; active fact-checking operation
- **Federal Council report (June 2024):** Approved report on influence activities and disinformation threats to Switzerland
- **OECD assessment:** Swiss population not particularly skilled at separating truth from lies
- **digitalswitzerland:** Advocates for AI-driven fact-checking combined with human oversight, education, and cross-sector collaboration
- **Innosuisse 2024 data:** Approved CHF 341 million total funding; 41% approval rate for Innovation Projects, 18% for Startup Innovation Projects

---

## 8. Research Gaps Addressed by LiveCheck

Based on this comprehensive review, LiveCheck addresses the following specific, documented research gaps:

### Gap 1: No Integrated Real-Time Evidence-Based Fact-Checking System

**Current state:** LiveFC provides real-time verification but with binary verdicts and no evidence quality assessment. Factiverse achieves speed but with ~80% accuracy and no published evidence framework. CLIMINATOR achieves deep evidence grounding (96% accuracy) but only in batch mode. All existing systems are either fast-but-shallow or deep-but-slow.

**What LiveCheck adds:** The first system combining real-time operation with evidence-grounded, attributed verification signals. This is explicitly identified as an open problem in Vykopal et al. (2024).

### Gap 2: Uncertainty Quantification for Streaming Predictions

**Current state:** Conformal prediction for NLP is well-established (TACL 2024 survey) but applied only to static predictions. ConU (EMNLP 2024) and LM-Polygraph address uncertainty in batch LLM outputs. No work addresses calibrated confidence for streaming predictions where evidence is still accumulating.

**What LiveCheck adds:** Provisional verdicts with calibrated uncertainty that evolves as evidence accumulates -- a novel application of uncertainty quantification to streaming fact-checking.

### Gap 3: Time-Budgeted Evidence Retrieval for Live Verification

**Current state:** FIRE (NAACL 2025) introduces iterative, confidence-based evidence retrieval that reduces costs 7.6x. Anytime algorithms provide theoretical framework. But neither has been applied to hard real-time deadlines in streaming verification contexts.

**What LiveCheck adds:** Evidence retrieval with explicit time budgets that trade off depth for speed, producing best-available evidence within latency constraints.

### Gap 4: Real-Time Human-in-the-Loop Escalation

**Current state:** Full Fact AI supports 40+ organizations with human-in-the-loop workflows, but all asynchronous. LiveFC has no human-in-the-loop component. CHI 2025 research documents fact-checkers' unmet needs for explainable, transparent outputs with source links.

**What LiveCheck adds:** Real-time triage and escalation logic that routes high-impact, high-uncertainty claims to human reviewers within latency constraints relevant to live broadcasting.

### Gap 5: Multi-Agent Debate Under Time Constraints

**Current state:** CLIMINATOR, Tool-MAD, and DebateCV demonstrate that multi-agent debate improves verification accuracy (2-6% improvements). All operate without time constraints. No work explores how adversarial debate quality degrades under latency budgets.

**What LiveCheck adds:** Time-constrained adversarial verification that maintains debate quality under real-time pressure, a novel combination of two active research areas.

### Gap 6: No Evaluation Benchmark for Live Fact-Checking

**Current state:** FEVER, AVeriTeC, CLEF CheckThat! provide static benchmarks. LiveFC evaluated against PolitiFact's debate checks as a one-off case study. No standardized benchmark measures latency, accuracy degradation under time pressure, or provisional verdict stability.

**What LiveCheck adds:** A benchmark and evaluation protocol for live fact-checking systems, measuring latency-accuracy tradeoffs, attribution quality under time pressure, and escalation effectiveness.

### Gap 7: Streaming Claim Detection from Audio/Video

**Current state:** ClaimBuster and CLEF CheckThat! address check-worthiness on complete text. AFaCTA (ACL 2024) provides LLM-assisted claim annotation for documents. LiveFC uses rolling 5-second windows with fine-tuned XLM-RoBERTa. But no work specifically addresses the challenges of claim boundary detection in continuous speech with incomplete utterances, self-corrections, and speaker overlaps.

**What LiveCheck adds:** Claim detection specifically designed for streaming audio, handling the unique challenges of spoken language (disfluencies, cross-utterance claims, speaker attribution).

---

## 9. Full Bibliography

### Surveys and Foundational Works

1. Guo, Z., Schlichtkrull, M., & Vlachos, A. (2022). A Survey on Automated Fact-Checking. *TACL*, 10, 178--206. [Link](https://aclanthology.org/2022.tacl-1.11/)
2. Zeng, X., Abumansour, A. S., & Zubiaga, A. (2021). Automated Fact-Checking: A Survey. *Language and Linguistics Compass*, 15(10). [Link](https://compass.onlinelibrary.wiley.com/doi/10.1111/lnc3.12438)
3. Vykopal, I., Pikuliak, M., Ostermann, S., & Simko, M. (2024). Generative Large Language Models in Automated Fact-Checking: A Survey. arXiv:2407.02351. [Link](https://arxiv.org/abs/2407.02351)
4. Warren, G. et al. (2025). Show Me the Work: Fact-Checkers' Requirements for Explainable Automated Fact-Checking. *CHI '25*. [Link](https://dl.acm.org/doi/10.1145/3706598.3713277)

### Live/Real-Time Fact-Checking

5. Venktesh, V. & Setty, V. (2024). LiveFC: A System for Live Fact-Checking of Audio Streams. *WSDM 2025*. arXiv:2408.07448. [Link](https://arxiv.org/abs/2408.07448)
6. Hassan, N. et al. (2017). Toward Automated Fact-Checking: Detecting Check-worthy Factual Claims by ClaimBuster. *KDD 2017*. [Link](https://dl.acm.org/doi/10.1145/3097983.3098131)

### Claim Detection and Check-Worthiness

7. Ni, J., Shi, M., Stammbach, D., Sachan, M., Ash, E., & Leippold, M. (2024). AFaCTA: Assisting the Annotation of Factual Claim Detection with Reliable LLM Annotators. *ACL 2024*. [Link](https://aclanthology.org/2024.acl-long.104/)
8. Barron-Cedeno, A. et al. (2024). CLEF-2024 CheckThat! Lab. *CLEF 2024*. [Link](https://link.springer.com/chapter/10.1007/978-3-031-71908-0_2)
9. Barron-Cedeno, A. et al. (2025). CLEF-2025 CheckThat! Lab. *ECIR 2025*. arXiv:2503.14828. [Link](https://arxiv.org/abs/2503.14828)

### Evidence Retrieval

10. Xie, Z., Xing, R., Wang, Y. et al. (2025). FIRE: Fact-checking with Iterative Retrieval and Verification. *Findings of NAACL 2025*. [Link](https://aclanthology.org/2025.findings-naacl.158/)

### Multi-Agent Debate

11. Leippold, M. et al. (2025). Automated Fact-Checking of Climate Claims with Large Language Models (CLIMINATOR). *npj Climate Action*, 4, 17. [Link](https://www.nature.com/articles/s44168-025-00215-8)
12. Tool-MAD (2026). A Multi-Agent Debate Framework for Fact Verification with Diverse Tool Augmentation and Adaptive Retrieval. arXiv:2601.04742. [Link](https://arxiv.org/abs/2601.04742)
13. Du, Y. et al. (2023). Improving Factuality and Reasoning in Language Models through Multiagent Debate. arXiv:2305.14325. [Link](https://arxiv.org/abs/2305.14325)
14. DebateCV (2025). Debating Truth: Debate-driven Claim Verification with Multiple Large Language Model Agents. arXiv:2507.19090. [Link](https://arxiv.org/abs/2507.19090)

### Uncertainty Quantification

15. Conformal Prediction for NLP: A Survey (2024). *TACL*. [Link](https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00715/125278)
16. ConU: Conformal Uncertainty in LLMs (2024). *Findings of EMNLP 2024*. [Link](https://aclanthology.org/2024.findings-emnlp.404/)
17. Conformal Language Modeling (2024). *ICLR 2024*. [Link](https://openreview.net/forum?id=pzUhfQ74c5)

### Source Attribution and NLI

18. User-Centric Evidence Ranking for Attribution and Fact Verification (2025). arXiv:2601.21387. [Link](https://arxiv.org/html/2601.21387)
19. Atomic-SNLI: Fine-Grained NLI through Atomic Fact Decomposition (2025). arXiv:2601.06528. [Link](https://arxiv.org/html/2601.06528)

### Benchmarks and Datasets

20. Thorne, J. et al. (2018). FEVER: A Large-scale Dataset for Fact Extraction and VERification. *NAACL 2018*. [Link](https://arxiv.org/abs/1803.05355)
21. Schlichtkrull, M. et al. (2024). The Automated Verification of Textual Claims (AVeriTeC) Shared Task. *FEVER 2024 Workshop*. [Link](https://aclanthology.org/2024.fever-1.1/)
22. Wadden, D. et al. (2020). Fact or Fiction: Verifying Scientific Claims (SciFact). *EMNLP 2020*. [Link](https://aclanthology.org/2020.emnlp-main.609/)

### LLM Hallucination and Factuality

23. LLM Hallucination: A Comprehensive Survey (2025). arXiv:2510.06265. [Link](https://arxiv.org/abs/2510.06265)
24. RAG Survey: Retrieval-Augmented Generation for LLMs (2024). arXiv:2312.10997. [Link](https://arxiv.org/abs/2312.10997)

### Tools and Systems

25. Loki: An Open-Source Tool for Fact Verification (2024). arXiv:2410.01794. [Link](https://arxiv.org/abs/2410.01794)
26. OpenFactCheck: A Unified Framework for Factuality Evaluation of LLMs (2024). arXiv:2408.11832. [Link](https://arxiv.org/abs/2408.11832)
27. MAFT: Multimodal Automated Fact-Checking via Textualization (2025). *AAAI 2025*. [Link](https://ojs.aaai.org/index.php/AAAI/article/view/35354)

### Speech Recognition

28. Whisper Streaming: Turning Whisper into Real-Time Transcription System (2023). arXiv:2307.14743. [Link](https://arxiv.org/abs/2307.14743)

### Human-in-the-Loop and Journalist Tools

29. Kavtaradze, L. (2024). Challenges of Automating Fact-Checking: A Technographic Case Study. *Digital Journalism*. [Link](https://journals.sagepub.com/doi/10.1177/27523543241280195)

### Multimodal Verification

30. Deepfake-Eval-2024: A Multi-Modal In-the-Wild Benchmark (2025). arXiv:2503.02857. [Link](https://arxiv.org/abs/2503.02857)

### Market and Policy

31. Duke Reporters' Lab (2025). 2025 Census: Fact-checkers persevere as politicians, platforms turn up heat. [Link](https://reporterslab.org/2025/06/19/fact-checkers-persevere-as-politicians-platforms-turn-up-heat/)
32. Poynter Institute (2024). State of the Fact-Checkers Report 2024. [Link](https://www.poynter.org/wp-content/uploads/2025/03/2.Facts-Report-March-2025-.pdf)
33. European Commission (2024). Digital Services Act enforcement. [Link](https://digital-strategy.ec.europa.eu/en/policies/european-digital-media-observatory)

---

## Summary for Innosuisse Application

This review demonstrates that LiveCheck occupies a unique position at the intersection of multiple active research areas:

1. **The timing is right:** ASR technology (Whisper Streaming, 300ms latency) and LLM capabilities have matured to make real-time fact-checking technically feasible for the first time.

2. **The gap is documented:** Multiple surveys (Vykopal et al. 2024, Guo et al. 2022) explicitly identify real-time, evidence-based fact-checking as an open research direction.

3. **No existing system combines all elements:** LiveFC is fast but shallow; CLIMINATOR is deep but batch-only; Full Fact is human-assisted but not real-time. LiveCheck uniquely combines real-time operation + evidence depth + source attribution + uncertainty quantification + human-in-the-loop escalation.

4. **Market demand is proven:** 443 fact-checking organizations worldwide, EUR 8.8M EU funding for EDMO hubs, DSA mandating platform action, Swiss Federal Council acknowledging disinformation threats.

5. **Swiss research ecosystem is strong:** UZH (Leippold/Schimanski -- CLIMINATOR, AFaCTA), ETH (Ash/Stammbach -- claim detection), and potential connections to Vlachos (Cambridge, AVeriTeC) and Nakov (MBZUAI, FIRE) provide a world-class research network.

6. **Seven specific, novel research contributions** are identified: integrated real-time evidence-based verification, streaming uncertainty quantification, time-budgeted evidence retrieval, real-time human-in-the-loop escalation, time-constrained multi-agent debate, a live fact-checking evaluation benchmark, and streaming claim detection from audio/video.
