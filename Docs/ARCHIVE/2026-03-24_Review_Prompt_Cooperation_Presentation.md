# Review Prompt — FactHarbor Academic Cooperation Presentation

## Your Role

You are an experienced **NLP research professor at a Swiss university** (Fachhochschule or ETH-domain) with expertise in automated fact-checking, misinformation detection, and applied NLP. You have published at ACL, EMNLP, and CLEF, and you have experience writing Innosuisse grant proposals. You are reviewing a cooperation presentation from a Swiss open-source startup (FactHarbor) that wants to partner with your group for an Innosuisse-funded research project on resource-efficient automated fact-checking.

## Your Task

Review the document **"FactHarbor — Academic Cooperation for Automated Fact-Checking"** (xWiki format, provided below as "DOCUMENT UNDER REVIEW") with the following goals:

1. **Credibility check:** Does the document make FactHarbor look like a serious, capable implementation partner? Are there any claims that seem exaggerated, vague, or unsupported?
2. **Research fit:** Are the three proposed research questions (RQ1-RQ3) genuinely publishable and novel? Would they interest an NLP research group? Are they framed correctly for Innosuisse (applied research with clear innovation potential)?
3. **Collaboration appeal:** If you were the target audience (Prof. Mark Cieliebak at ZHAW, or Prof. Elliott Ash at ETH), would this document make you want to take a meeting? What's missing or unconvincing?
4. **Tone and level:** Is the technical depth appropriate for a professor? Too shallow? Too detailed? Too marketing-heavy? Too humble?
5. **Structure and flow:** Does the document read well? Is information in the right order? Is anything redundant or misplaced?
6. **Factual accuracy:** Based on the RAG context provided, are all references to academic work (HAMiSoN, ViClaim, CheckThat!, Climinator, DIRAS, AFaCTA) accurate?
7. **Red flags:** Anything that would make a professor skeptical, lose interest, or decide not to engage?

## Output Format

Provide your review as:
1. **Overall impression** (2-3 sentences)
2. **Strengths** (bullet list)
3. **Issues to fix** (bullet list, prioritized: critical → minor)
4. **Suggestions** (bullet list of improvements)
5. **Verdict:** Would you take the meeting? (Yes / Yes with reservations / No, and why)

---

## RAG CONTEXT: Background Information

Use the following verified information to check the document's claims and assess research fit.

### About ZHAW CAI / NLP Group (Primary Target Partner)

- **Prof. Dr. Mark Cieliebak** — Head of NLP Group at ZHAW Centre for AI (CAI), President of SwissNLP, CEO of SpinningBytes AG, founder of SwissText conference. 40+ publications (ACL, EMNLP, LREC). Multiple Innosuisse projects. Contact: ciel@zhaw.ch
- **Pius von Däniken** — Research Assistant, leads misinformation detection work. HAMiSoN project lead at ZHAW, CheckThat! Lab 2nd place (2023), ViClaim co-author. Profile: zhaw.ch/en/about-us/person/vode
- **Dr. Jan Milan Deriu** — Senior Researcher, 57 publications, 831+ citations. HAMiSoN co-PI, ViClaim co-author, SwissAI Initiative data collection lead.
- **Patrick Giedemann** — PhD student on misinformation detection in videos. ViClaim first author, HAMiSoN contributor.

### About HAMiSoN (EUR 1.1M, CHIST-ERA, 2023-2025)

- **Full title:** Holistic Analysis of Organised Misinformation Activity in Social Networks
- **Consortium:** UNED Spain (coordinator), ZHAW Switzerland, University of Tartu Estonia, Synapse Développement France
- **Funding:** CHIST-ERA ERA-NET (Call 2021, OSNEM topic). SNSF funded the Swiss portion.
- **Output:** 30+ publications across EMNLP, IJCAI, ICWSM, CLEF, CASE, IberLEF. Datasets: ViClaim, DIPROMATS 2024, HAMiSoN Social Media dataset.
- **Technical approach:** Two-level architecture — message level (claim worthiness, stance detection, multilingual verified claim retrieval) + social network level (propagation modelling, coordinated behaviour detection). Disinformation intentionality as hidden variable connecting both levels.
- **Models:** XLM-RoBERTa-Large (550M) as primary encoder; Falcon-7B, Mistral-7B, LLama3.2-3B via QLoRA; RoBERTa for stance detection; Graph Attention Networks for multimodal fake news detection.

### About ViClaim (EMNLP 2025, Main Conference)

- **Citation:** Giedemann, von Däniken, Deriu, Rodrigo, Penas, Cieliebak (2025). "ViClaim: A Multilingual Multilabel Dataset for Automatic Claim Detection in Videos." EMNLP 2025, pp. 397-413.
- **Dataset:** 1,798 YouTube Shorts videos, 17,116 annotated sentences, 3 languages (EN/DE/ES), 6 topics, 12 annotators (4 per sentence), multi-label (FCW/FNC/OPN).
- **Key results:** XLM-RoBERTa-Large (550M) achieves F1=0.899 (FCW), outperforms zero-shot o3-mini (F1=0.780), 4o-mini (0.650), Grok-2 (0.665). Written→spoken text transfer collapses: F1 drops from 0.693 to 0.32.
- **Code:** github.com/pgied/viclaim_stt (MIT), github.com/pgied/viclaim_training (MIT). Dataset on Zenodo (CC BY 4.0).

### About CheckThat! Lab (CLEF, Annual Since 2018)

- **Scale:** 130+ registered teams/year (2021-2024), 20+ languages, full pipeline coverage (detection → retrieval → verification).
- **ZHAW results:** 2nd place in 2023 (Task 1A: Multimodal Check-Worthiness, F1=0.708, kernel ensemble averaging). 3rd place in 2025 (Task 4b: Scientific Source Retrieval, MRR@5=66.43%, hybrid retrieval).
- **Key organizers:** Barron-Cedeño (Bologna), Preslav Nakov (MBZUAI), Firoj Alam (QCRI).
- **2026 edition (planned):** Will introduce fact-checking article generation for the first time + reasoning trace evaluation.

### About Prof. Elliott Ash (ETH Zurich, Alternative Partner)

- **Position:** Associate Professor of Law, Economics, and Data Science, Center for Law & Economics, ETH Zurich. Scientific Lead (Human-AI Alignment), Swiss AI Initiative. ERC Starting Grant recipient.
- **Directly relevant papers:** AFaCTA (ACL 2024, LLM-assisted claim detection), e-FEVER (multi-hop explainable fact verification, 60K+ claims), Knowledge Base Choice in Claim Checking (JDIQ 2023), Climinator (npj Climate Action 2025, co-author), BallotBot (RAG chatbot, R&R at Economic Journal).
- **Key group member:** Jingwei Ni (PhD 2023-2027), co-supervised by Sachan & Leippold, lead author on AFaCTA, co-author on Climinator. Works directly on claim detection.
- **Note:** At Oxford Internet Institute for H1 2026. No confirmed Innosuisse project history.

### About Climinator (UZH/ETH, npj Climate Action 2025)

- **Architecture:** Mediator-Advocate debate framework. Multiple LLM advocates each grounded in a distinct knowledge corpus via RAG. Mediator synthesizes verdicts; on disagreement, iterative debate via follow-up questions.
- **Performance:** >96% binary accuracy (Climate Feedback), 72.7% 5-class, 62.9% 7-class.
- **Paper-vs-code gap:** debate.py is empty (0 bytes). Only 3/6 corpora exist. Iterative loop not implemented. PR #108 pivots to Advocate-Mediator pattern. Main branch inactive since May 2025.

### About Innosuisse Funding Path

- **Innovation Cheque:** CHF 15,000, 100% Innosuisse-funded, 4-6 week decision, no co-funding needed. 26% lead to full innovation projects.
- **Innovation Project (with Implementation Partner):** No cap, typical CHF 100K-500K. Innosuisse covers 40-60% (goes to research partner). Company co-funds 40-60% (min 5% cash, rest in-kind as developer time). Duration up to 36 months. 41% approval rate (2024, 802 applications). Rolling submission, ~8 ICT evaluation meetings/year.
- **ZHAW eligibility:** Confirmed eligible as research partner. "Participates extremely successfully in various Innosuisse funding instruments."

### About Low-Resource Fact-Checking (Research Framing)

- **AVeriTeC 2025 shared task:** Now explicitly requires <10B parameters, <1 minute per claim, open-weights only. Community signal that efficient fact-checking is a first-class research challenge.
- **SIGIR 2024:** Fine-tuned XLM-RoBERTa-Large (0.743 F1) beats GPT-4 (0.624) on claim detection across 114 languages.
- **DRAG (ACL 2025):** Transfers RAG from LLMs to small models via knowledge distillation, +27.7% over prior SLM RAG methods.
- **EdgeJury (Jan 2026):** Ensemble of 3B-8B models achieves 76.2% TruthfulQA with 8.4s latency.
- **No existing work** studies distillation of a full multi-stage fact-checking pipeline (most work addresses single stages).

### About FactHarbor's Competitive Position

- **No direct Swiss competitor** does general-purpose, topic-agnostic automated fact-checking with evidence retrieval and verdict generation.
- Climinator = climate-specific only. HAMiSoN = social network campaign analysis. vera.ai (EU) = fact-checker-in-the-loop. SpinningBytes = general text analytics, no fact-checking.
- FactHarbor is the **only end-to-end multi-agent debate system** for fact-checking with live evidence retrieval operating as a user-facing service.

---

## RAG CONTEXT: Source Documents

### Local Project Documents (read these for full detail)

| Document | Path | What it contains |
|----------|------|-----------------|
| **Document under review** | `Docs/xwiki-pages/FactHarbor/Product Development/Presentations/Academic Cooperation/WebHome.xwiki` | The cooperation presentation to review (xWiki 2.1 format) |
| **Innosuisse Partnership Briefing** | `Docs/WIP/2026-03-24_Innosuisse_Partnership_Research_Briefing.md` | Full research into ZHAW, ETH Ash, grant strategy, Swiss landscape, competitive positioning |
| **HAMiSoN Analysis** | `Docs/Knowledge/HAMiSoN_Lessons_for_FactHarbor.md` | Deep analysis of the HAMiSoN project: consortium, publications, methods, 7 lessons for FactHarbor |
| **ViClaim Analysis** | `Docs/Knowledge/ViClaim_EMNLP2025_Lessons_for_FactHarbor.md` | Deep analysis of ViClaim paper: dataset details, model results, 7 lessons for FactHarbor |
| **CheckThat! Lab Analysis** | `Docs/Knowledge/CheckThat_Lab_Lessons_for_FactHarbor.md` | Deep analysis of the shared task series: ZHAW's methods, 10 lessons for FactHarbor |
| **Climinator Analysis** | `Docs/Knowledge/Climinator_Lessons_for_FactHarbor.md` | Analysis of the Climinator paper vs code: debate architecture, 11 lessons |
| **DIRAS Analysis** | `Docs/Knowledge/Schimanski_DIRAS_NAACL2025.md` | Analysis of DIRAS relevance scoring: distillation, calibration |
| **Faithful LLM Specialists** | `Docs/Knowledge/Schimanski_Faithful_LLM_Specialists_ACL2024.md` | ACL 2024 source attribution paper analysis |
| **Executive Summary** | `Docs/Knowledge/EXECUTIVE_SUMMARY.md` | Master index of all knowledge base documents with reading guide |
| **Global Landscape** | `Docs/Knowledge/Global_FactChecking_Landscape_2026.md` | Survey of all AI fact-checking systems worldwide; FactHarbor's unique position |
| **Draft Email to Cieliebak** | `Docs/WIP/2026-03-24_Draft_Email_Cieliebak.md` | Outreach email draft for context on communication strategy |
| **Pipeline Architecture** | `AGENTS.md` (section "Architecture") | Full pipeline description, key files, terminology |
| **Current Status** | `Docs/STATUS/Current_Status.md` | Detailed project status, what works, what's open |

### Remote / External Sources

| Source | URL | What it contains |
|--------|-----|-----------------|
| **FactHarbor App** | https://app.factharbor.ch | Live system — submit claims, browse analyses |
| **FactHarbor GitHub** | https://github.com/robertschaub/FactHarbor | Open-source repository |
| **FactHarbor Docs (gh-pages)** | https://robertschaub.github.io/FactHarbor/ | Published documentation site |
| **HAMiSoN Project Website** | https://nlp.uned.es/hamison-project/ | Project overview, approach, results, publications |
| **ViClaim (ACL Anthology)** | https://aclanthology.org/2025.emnlp-main.21/ | Full paper |
| **ViClaim (arXiv)** | https://arxiv.org/abs/2504.12882 | Preprint with full text |
| **ZHAW-CAI CheckThat! 2023** | https://ceur-ws.org/Vol-3497/paper-048.pdf | System description paper |
| **CheckThat! 2025 Overview** | https://arxiv.org/abs/2503.14828 | Lab overview paper |
| **CheckThat! 2026 Preview** | https://arxiv.org/abs/2602.09516 | Planned tasks for next edition |
| **Climinator (Nature)** | https://www.nature.com/articles/s44168-025-00215-8 | Full paper |
| **AFaCTA (ACL 2024)** | https://aclanthology.org/2024.acl-long.104/ | Elliott Ash group, claim detection |
| **DIRAS (NAACL 2025)** | https://aclanthology.org/2025.naacl-long.271/ | Relevance scoring, distillation |
| **DRAG (ACL 2025)** | https://aclanthology.org/2025.acl-long.358/ | RAG distillation to small models |
| **AVeriTeC 2025** | https://aclanthology.org/2025.fever-1.15/ | Efficient fact-checking shared task |
| **ZHAW CAI Website** | https://www.zhaw.ch/en/engineering/institutes-centres/cai | Research group overview |
| **ZHAW NLP Group** | https://www.zhaw.ch/en/engineering/institutes-centres/cai/natural-language-processing-group | NLP group details |
| **Prof. Mark Cieliebak** | https://www.zhaw.ch/en/about-us/person/ciel | Profile |
| **Prof. Elliott Ash** | https://elliottash.com/ | Personal website with publications |
| **Innosuisse Innovation Cheque** | https://www.innosuisse.admin.ch/en/innovation-cheque | Funding instrument details |
| **Innosuisse Innovation Projects** | https://www.innosuisse.admin.ch/en/innovation-project-with-implementation-partner | Main funding instrument |
| **digitalSwitzerland Report** | https://digitalswitzerland.com/countering-disinformation-with-a-focus-on-fact-checking-and-ai/ | Swiss fact-checking landscape report (Dec 2024) |
| **SwissText 2026** | https://www.swisstext.org/current/ | Swiss NLP conference, June 10, UZH |

---

## DOCUMENT UNDER REVIEW

The document to review is located at:
`Docs/xwiki-pages/FactHarbor/Product Development/Presentations/Academic Cooperation/WebHome.xwiki`

It is in xWiki 2.1 markup format. Key syntax: `= H1 =`, `== H2 ==`, `=== H3 ===`, `**bold**`, `//italic//`, `[[Link>>URL]]`, `{{info}}...{{/info}}`, `{{mermaid}}...{{/mermaid}}`, `(% class="box successmessage" %)(((...)))` = green box.

Please read the full document and provide your review.
