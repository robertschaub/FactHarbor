# Meeting Prep: Tobias Schimanski — UZH, 18 March 2026, 16:00

**For:** First meeting with Tobias Schimanski (UZH, PhD candidate under Leippold)
**Location:** UZH Plattenstrasse 14 (to be confirmed by Tobias)
**Duration:** ~1 hour
**Goal:** Explore collaboration, assess research fit, discuss Innosuisse/BRIDGE funding
**Prepared by:** Claude Opus 4.6 (2026-03-10)

> **Related docs:** [Faithful LLM Specialists (ACL 2024)](Schimanski_Faithful_LLM_Specialists_ACL2024.md) | [DIRAS (NAACL 2025)](Schimanski_DIRAS_NAACL2025.md) | [Climinator Analysis](Climinator_Lessons_for_FactHarbor.md) | [Executive Summary](EXECUTIVE_SUMMARY.md)

---

## 1. Who Is Tobias Schimanski

- **Position:** PhD candidate, University of Zurich, Department of Finance (supervisor: Markus Leippold). Affiliated researcher at University of Oxford.
- **Research focus:** ClimateNLP — using NLP for climate fact-checking, ESG measurement, and information retrieval in sustainable finance.
- **Bridges two groups:**
  - **Leippold group (UZH):** Climinator, ClimateBERT, ChatReport, ClimRetrieve, corporate disclosure analysis
  - **Ash group (ETH):** Faithful LLM specialists, political bias, legal NLP
- **Publication record:** First author at ACL 2024, EMNLP 2024, NAACL 2025. Co-author on npj Climate Action (Climinator). Strong venues.
- **Grant experience:** He mentioned Innosuisse experience unprompted — signals genuine interest and practical knowledge of the process.
- **Status signal:** Elliott introduced him as someone who "would be interested to talk if there is funding for a full-time postdoc." This means: (a) Tobias is finishing or has finished his PhD, (b) the postdoc salary is a hard requirement, (c) Elliott endorses the fit but isn't deeply involved himself.

---

## 2. His Key Papers — What You Should Know

### Paper 1: Faithful LLM Specialists (ACL 2024) — with Ash
**The source attribution paper.** [Full analysis](Schimanski_Faithful_LLM_Specialists_ACL2024.md)

- **Problem:** LLMs cite wrong sources or misrepresent what sources say
- **Solution:** Fine-tune small specialists on quality-filtered synthetic data
- **Key finding:** 669 quality-filtered samples beat thousands of unfiltered ones
- **Metrics:** Source quality (binary: are citations correct?) + Answer attributability (ratio of entailed sentences)
- **Your takeaway:** This formalizes the citation fidelity problem FactHarbor solves at runtime via grounding checks. His metrics could evaluate your pipeline rigorously.

### Paper 2: DIRAS (NAACL 2025) — with Ash + Leippold
**The relevance scoring paper.** [Full analysis](Schimanski_DIRAS_NAACL2025.md)

- **Problem:** How do you know if RAG retrieves the right documents? Manual annotation is expensive and biased.
- **Solution:** Generate explicit relevance definitions per query, use GPT-4 as teacher, distill into 8B model
- **Key findings:** 8B model matches GPT-4 on relevance scoring. Chain-of-thought hurts annotation. Adaptive thresholds > fixed top-k.
- **Your takeaway:** Directly applicable to evidence quality assessment. Could replace or improve probativeValue scoring.

### Paper 3: Climinator (npj Climate Action 2025) — Leippold group
**The climate fact-checking paper.** [Full analysis](Climinator_Lessons_for_FactHarbor.md)

- Mediator-Advocate debate framework with RAG on distinct corpora
- Tobias is a co-author but NOT a lead contributor
- Paper-vs-code gap is significant (debate.py empty) but they're actively working on it (Spectrum experiment PR #108, March 2026)
- **Your takeaway:** Don't lead with this paper — it's more Leippold's project. But the architectural parallels validate the collaboration.

---

## 3. Agenda — 5 Topics (Pick 3-4 for One Hour)

### Topic 1: Live Demo + Architecture Walk-Through (10-15 min — mandatory)

Show FactHarbor in action. Submit a claim on app.factharbor.ch, walk through the report.

Then explain the pipeline at a high level:
```
User Input → AtomicClaim extraction → Iterative web search (up to 10 rounds)
→ Evidence filtering (probativeValue) → 5-step LLM debate
  (advocate ×3 → challenger → reconciler → validation)
→ Sourced verdict report
```

**Why this matters:** Academics respond to working systems. The Climinator code has an empty `debate.py` — seeing a fully operational debate pipeline establishes immediate credibility. This is not a paper proposal; it's a running system.

**What to highlight:**
- Domain-agnostic: works on any topic, any language
- Evidence-first: every verdict traces to specific sources
- Multi-provider: Anthropic, OpenAI, Google, Mistral
- ~40-50 LLM calls per analysis, ~1,079 tests passing

**What NOT to highlight yet:** Calibration baseline numbers, C13 evidence asymmetry, internal bias metrics. Too much detail for a first meeting.

### Topic 2: Source Attribution & Faithfulness (15 min)

The strongest research overlap — connects to his ACL 2024 paper.

**Questions to ask:**
1. "How would you measure attributability in our pipeline — where verdicts cite live web evidence rather than curated paragraphs?"
2. "Our grounding check uses 2× Haiku validation. Would NLI-based entailment (as in your paper) be more rigorous, or is LLM-based checking sufficient?"
3. "Your finding that data quality beats quantity maps directly to our evidence filtering. Would you frame evidence quality filtering as a publishable contribution if formalized with your metrics?"

**What you can share:** FactHarbor has a grounding check (post-verdict validation) and evidence filtering (probativeValue threshold). Both are LLM-based, not formally measured against attribution benchmarks. His metrics could formalize what we do informally.

### Topic 3: Evidence Quality & Relevance Scoring (10 min)

Connects to his DIRAS paper.

**Questions to ask:**
1. "We assign probativeValue (high/medium/low) via LLM prompt. DIRAS shows explicit relevance definitions per query improve scoring significantly. Could a similar approach improve our evidence pipeline?"
2. "Your CoT finding — that it hurts annotation — have you tested whether this extends to evidence quality assessment more broadly?"
3. "Adaptive thresholds per query vs. fixed cutoff — what's your practical recommendation?"

**What you can share:** FactHarbor uses a 3-level categorical scale (high/medium/low). DIRAS suggests continuous calibrated scores are both achievable and more useful. Switching could improve evidence weighting in verdict aggregation.

### Topic 4: Research Framing & Publishable Contributions (10 min)

Explore what a joint project would produce. Candidate framings:

| Framing | Novelty | His fit |
|---------|---------|---------|
| **"Faithfulness in open-domain automated fact-checking"** | No one has measured attributability in a debate-based fact-checker against live web evidence | ACL 2024 expertise |
| **"Calibration framework for automated verdict systems"** | FactHarbor's C10/C13/C18 framework, formalized with evaluation methodology. No published equivalent. | Benchmarking expertise (ClimRetrieve, DIRAS) |
| **"Evidence retrieval quality in adversarial debate architectures"** | Combining DIRAS relevance scoring with multi-agent debate | DIRAS + Climinator expertise |

**Key question:** "Which of these would you find most interesting as a postdoc project?"

Listen carefully to his answer — it reveals whether he wants to work ON FactHarbor's pipeline or use it as a testbed for his own research agenda. Both work, but the grant framing differs.

### Topic 5: Funding Structure (10 min)

**Confirm:**
- Innosuisse Innovation Project as primary vehicle
- He does research (metrics, evaluation, benchmarking) at UZH → funded by grant
- FactHarbor provides platform + integration → in-kind contribution (your time)
- Postdoc position funded via the grant (not by FactHarbor)

**Ask:**
1. "Given your Innosuisse experience, what's the typical timeline from first conversation to submission?"
2. "Would you frame this as Innovation Project or BRIDGE Discovery? What's your preference?"
3. "Who would be the PI — you with Leippold as guarantor, or Leippold directly?"
4. "Is Elliott involved in the project, or is this primarily you + Leippold?"

**What you know:**
- Innosuisse Innovation Project: CHF 300K-800K research side, 18-36 months. FactHarbor contributes 50% in-kind (your hours).
- BRIDGE Discovery: up to CHF 130K/year, max 4 years. More research-oriented, Tobias as individual grantee.
- Fully loaded postdoc cost: ~CHF 120K-140K/year (salary + overhead).

---

## 4. What NOT to Bring Up

| Topic | Why Not |
|-------|---------|
| Political bias / calibration baseline (C10 numbers, 27.6pp skew) | Too internal, too early. Save for after trust is built. |
| Climinator paper-vs-code gap | Don't criticize his supervisor's project in the first meeting. If he raises it, acknowledge neutrally. |
| Pricing / commercialization / business model | Keep it research-focused. |
| Technical implementation details (UCM, config schemas, verdict-stage internals) | Too deep for a first meeting. |
| Other collaboration targets (Full Fact, Stammbach, ED2D) | Irrelevant and could dilute focus. |

---

## 5. What to Bring

- [ ] **Laptop with live demo** — app.factharbor.ch or local dev environment running
- [ ] **Invite code** for Tobias to try it himself (ETH-1 or create a new one)
- [ ] **This document** (printed or on phone) for reference during the meeting
- [ ] **Business cards** if you have them
- [ ] **One-pager** (optional) — high-level architecture + research overlap, something he can forward to Leippold

---

## 6. Signals to Watch For

| Signal | What It Tells You |
|--------|-------------------|
| He wants to define the research questions himself | He sees FactHarbor as a testbed — frame the grant so his research agenda leads |
| He asks about the pipeline implementation details | He wants to work on the system — frame the grant around platform improvement |
| He mentions other companies or projects he's talking to | You're not the only option — move faster on the grant proposal |
| He mentions Leippold's involvement actively | Leippold could be co-PI — bigger grant, more institutional weight |
| He asks about open-sourcing or data sharing | Academic norm — be ready to discuss what's shareable |
| He's cautious about timeline | PhD might not be done yet — check when he can start a postdoc |
| He steers toward climate-specific work | He may want to stay in his comfort zone — gently probe whether domain-agnostic research interests him |

---

## 7. After the Meeting

- [ ] Send thank-you email within 24 hours
- [ ] Share any materials discussed (demo link, architecture overview)
- [ ] If positive: propose concrete next step (draft research outline, second meeting with Leippold, preliminary grant structure)
- [ ] Update `Docs/knowledge/EXECUTIVE_SUMMARY.md` collaboration status
- [ ] If research direction is agreed: start grant outline document in `Docs/WIP/`
