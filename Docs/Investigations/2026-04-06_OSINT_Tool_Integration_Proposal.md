# OSINT Tool Integration Proposal for FactHarbor

**Date:** 2026-04-06
**Role:** Lead Architect + OSINT Expert
**Status:** PROPOSAL

---

## 1. Executive Summary

FactHarbor's analysis pipeline already performs automated claim extraction, evidence retrieval, and verdict generation. Integrating OSINT tools could strengthen two specific pipeline gaps: (1) **cross-referencing claims against existing fact-checks** (already partially addressed via Google Fact Check API), and (2) **verifying source provenance and media authenticity** (currently absent).

After evaluating 12 OSINT tools against FactHarbor's architecture, the recommendation is:

- **Tier 1 (High value, implement now):** Enhance the existing Google Fact Check API integration from supplementary search to active claim cross-referencing in Stage 1
- **Tier 2 (Future, when mature OSS emerges):** Independent verification benchmark — no viable candidate today (Loki/OpenFactVerification is abandoned; see §4)
- **Tier 3 (Future):** InVID/WeVerify media verification for image/video claims when FactHarbor expands beyond text

---

## 2. Candidate Evaluation

### 2.1 Tools evaluated

| Tool | Category | API? | Free? | Relevance to FactHarbor | Verdict |
|------|----------|:----:|:-----:|------------------------|---------|
| [Google Fact Check API](https://developers.google.com/fact-check/tools/api) | Claim cross-referencing | Yes | Yes (API key) | **Already integrated** as search provider. Under-utilized. | **Tier 1 — Enhance** |
| [Loki (OpenFactVerification)](https://github.com/Libr-AI/OpenFactVerification) | Automated fact verification | Yes (Python lib) | Yes (OSS, MIT) | Similar pipeline architecture but **effectively abandoned**: last commit Oct 2024, 48 total commits, v0.0.2, zero 2025/2026 activity. Academic demo, not a maintained tool. | **Not recommended** — abandoned |
| [OpenFactCheck](https://openfactcheck.com/) | LLM factuality evaluation | Yes (pip) | Yes (OSS) | Evaluates LLM output factuality. Could validate FactHarbor's own verdicts. | Tier 3 — Future QA |
| [FactCheckExplorer](https://github.com/GONZOsint/factcheckexplorer) | Google Fact Check Explorer wrapper | Yes (Python lib) | Yes (OSS) | Lightweight Python wrapper for Google's Fact Check Explorer. Useful utility but FactHarbor already has a direct API integration. | Not needed — already covered by Tier 1 |
| [InVID/WeVerify](https://weverify.eu/verification-plugin/) | Image/video verification | Partial (APIs for keyframes, forensics) | Yes (EU-funded) | 57k+ weekly users. Relevant when FactHarbor adds media claims. | Tier 3 — Future media |
| [Maltego](https://www.maltego.com/) | Entity relationship mapping | Yes (Transforms API) | Freemium (200 credits/mo) | Network analysis for source provenance. Overkill for current pipeline — better suited for manual investigation. | **Not recommended** — wrong paradigm |
| [Meedan Check](https://meedan.org/check) | Collaborative fact-checking CMS | Yes ([Check API](https://github.com/meedan/check-api)) | OSS (AGPL) | Collaborative verification platform. FactHarbor is automated, not collaborative — different paradigm. | **Not recommended** — different model |
| [OSINT Industries](https://www.osint.industries/) | Person/entity lookup | Yes | Paid | Identity verification. Not relevant to claim fact-checking. | Not relevant |
| [SpiderFoot](https://github.com/smicallef/spiderfoot) | Automated OSINT reconnaissance | Yes (REST API) | OSS | Infrastructure OSINT — domains, IPs, DNS. Not claim-relevant. | Not relevant |
| [Hunchly](https://www.hunch.ly/) | Web investigation recording | No API | Paid | Manual investigation journaling. Not automatable. | Not relevant |
| [ShadowDragon SocialNet](https://shadowdragon.io/) | Social media investigation | Yes | Paid (enterprise) | Social media OSINT. Irrelevant to claim verification. | Not relevant |
| [NewsWhip](https://www.newswhip.com/) | Social engagement monitoring | Yes | Paid | CrowdTangle alternative. Monitors virality, not factuality. | Low relevance |
| [Veracity (AI)](https://arxiv.org/html/2506.15794v1) | AI fact-checking system | FastAPI | OSS | Similar to Loki but less mature. Watch. | Future |

### 2.2 Why most OSINT tools don't fit

Most OSINT tools are designed for **manual investigation** (entity tracking, network mapping, media forensics) by human analysts. FactHarbor is an **automated pipeline** that processes claims programmatically. The integration surface is narrow: only tools with structured APIs that can enrich the pipeline's evidence or cross-reference claims in batch are useful.

The tools that fit are:
- **Claim databases** (Google Fact Check API, ClaimReview) — structured claim/verdict lookups
- **Automated verification pipelines** (Loki) — comparable systems that can serve as evidence sources or benchmarks
- **Media verification APIs** (InVID) — for future media claim support

---

## 3. Tier 1 Proposal: Enhance Google Fact Check API Integration

### What exists today

FactHarbor already has `search-factcheck-api.ts` as a search provider. It queries the [Google Fact Check Tools Claim Search API](https://developers.google.com/fact-check/tools/api) and returns results as `WebSearchResult` entries. However, it's used as a supplementary search provider alongside Brave/SerpAPI/Serper — the ClaimReview data (publisher, textual rating, review URL) flows through as generic search results and loses its structured signal.

### What should change

**Promote Fact Check API from "search result" to "prior fact-check cross-reference."**

Instead of mixing ClaimReview results into the general evidence pool, surface them as structured context:

1. **Stage 1 enrichment:** After claim extraction, query the Fact Check API for each AtomicClaim. If matching fact-checks exist, attach them to the claim as `priorFactChecks: { publisher, rating, url, date }[]`.

2. **Stage 2 query guidance:** When prior fact-checks exist, the query generation LLM sees them as context: "This claim has been previously assessed by [publisher] as [rating]." This helps focus research queries rather than rediscovering what's already been checked.

3. **Stage 4 verdict context:** Prior fact-checks appear in the evidence portfolio alongside SR data. The verdict LLM can reference them but is NOT bound by them — FactHarbor produces its own independent assessment.

4. **Report enrichment:** The final report lists any matching prior fact-checks with attribution ("This claim was also assessed by [Snopes/AFP/PolitiFact] as [rating]").

### Implementation

- **No new search provider needed** — `search-factcheck-api.ts` already exists
- **New function:** `crossReferenceClaimsAgainstFactChecks(claims: AtomicClaim[], config)` — batch query per claim
- **New field:** `priorFactChecks` on `AtomicClaim` or `CBClaimUnderstanding`
- **Prompt additions:** Brief context injection in `GENERATE_QUERIES` and `VERDICT_ADVOCATE`
- **UCM:** `factCheckCrossReferenceEnabled: boolean` (default true), `factCheckApiKey` (already exists)
- **Cost:** Free (Google API key, generous quota)
- **Effort:** ~2 days

### Why this first

- Zero additional cost
- Infrastructure already exists
- Directly addresses a fact-checking best practice: "check if it's already been checked"
- The structured ClaimReview data (publisher, rating, date) is more valuable as structured metadata than as a generic search result
- Aligns with the [EBU/spotlight.ebu.ch guide on automated fact-checking](https://spotlight.ebu.ch/p/automated-fact-checking-osint-api-guide)

---

## 4. Tier 2: Independent Verification Benchmark — No Viable Candidate Today

### Why this tier is empty

An independent verification benchmark — running a second system on the same input and comparing verdicts — would be valuable for quality assurance. However, no current open-source tool is mature enough to serve this role.

### Loki/OpenFactVerification — abandoned

[Loki](https://github.com/Libr-AI/OpenFactVerification) initially looked promising (similar 5-step pipeline, MIT license, [COLING 2025 paper](https://aclanthology.org/2025.coling-demos.4/)). However, investigation of the actual repository reveals:

| Signal | Finding |
|--------|---------|
| Last commit | October 3, 2024 (18+ months ago) |
| Last release | v0.0.2, April 2024 |
| Total commits | 48 (very low for a verification pipeline) |
| Open issues | 1, unanswered since Oct 2024 |
| 2025/2026 activity | Zero |
| Version | Still 0.0.x — never reached 1.0 |

The COLING 2025 paper was likely submitted in mid-2024 during the project's brief active period. Academic publication timelines lag 6-12 months. The code has not been touched since. This is an academic demo, not a maintained tool. **Not recommended for integration or benchmarking.**

### Other candidates assessed

- **[OpenFactCheck](https://openfactcheck.com/):** Evaluates LLM output factuality but is focused on LLM benchmarking, not claim-vs-evidence verification. Different purpose than FactHarbor. Future QA tool at best.
- **[Veracity](https://arxiv.org/html/2506.15794v1):** Recent AI fact-checking system paper, but no evidence of maintained production code. Watch for future development.
- **[FactCheckExplorer](https://github.com/GONZOsint/factcheckexplorer):** Lightweight Python wrapper around Google Fact Check Explorer. Useful utility but FactHarbor already has a direct API integration — no added value.

### Recommendation

Monitor the space. When a mature, actively maintained open-source fact verification pipeline emerges (1.0+ release, active community, production-quality API), revisit this tier. Until then, FactHarbor's own internal quality mechanisms (self-consistency, direction validation, EVD-1 policy) serve as the primary quality benchmark.

---

## 5. Tier 3 (Future): InVID/WeVerify Media Verification

### When relevant

When FactHarbor adds support for verifying claims about images or videos (e.g., "This photo shows X"), [InVID/WeVerify](https://weverify.eu/verification-plugin/) provides:

- **Reverse image search** across multiple engines
- **Video keyframe extraction** and forensic analysis
- **Optical Character Recognition** (OCR) in images
- **Database of Known Fakes** (DBKF) lookup
- **Image context analysis** (where/when was this image first published?)

The plugin is [open source (AFP Medialab)](https://github.com/AFP-Medialab/verification-plugin) with 57k+ weekly users and API endpoints for keyframe and forensic tools.

### Not recommended now because

FactHarbor currently processes text claims only. Media verification is a future capability that requires significant pipeline changes (media input handling, visual evidence extraction, image/video storage). The InVID APIs become relevant when that capability is built.

---

## 6. What NOT to Integrate

| Tool | Why not |
|------|---------|
| **Maltego** | Graph-based investigation tool designed for human analysts. No batch API for automated claim verification. [Pricing](https://www.maltego.com/pricing/) is per-query credits. Wrong paradigm for an automated pipeline. |
| **Meedan Check** | Collaborative CMS for human fact-checker teams. FactHarbor is automated, not collaborative. Different product category. |
| **CrowdTangle** | [Shut down by Meta](https://www.cjr.org/tow_center/meta-is-getting-rid-of-crowdtangle.php) in August 2024. Replacement (Meta Content Library) restricted to academic researchers. |
| **SpiderFoot / Recon-ng** | Infrastructure OSINT (DNS, IP, subdomain enumeration). Not relevant to claim verification. |
| **Hunchly** | Manual web investigation recording tool. No API, no automation. |

---

## 7. Integration Architecture

```
User Input
  → Stage 1: Claim Extraction
     → NEW: Google Fact Check cross-reference (per claim)
        → priorFactChecks attached to each AtomicClaim
  → Stage 2: Research
     → Query generation sees priorFactChecks as context
     → Evidence acquisition (existing providers + Wikipedia)
  → Stage 3: Clustering
  → Stage 4: Verdict Debate
     → Advocate/Challenger see priorFactChecks in evidence portfolio
     → Independent assessment — not bound by prior ratings
  → Stage 5: Aggregation + Report
     → Report includes "Previously assessed by [X] as [Y]" section
  
  [Optional parallel] Loki benchmark → comparison score
```

---

## 8. Recommended Implementation Sequence

| Priority | What | Effort | Cost | Dependencies |
|----------|------|--------|------|-------------|
| **1 (Now)** | Enhance Google Fact Check API → structured claim cross-reference | 2 days | Free | Existing `search-factcheck-api.ts` |
| **2 (Monitor)** | Independent verification benchmark | — | — | No viable candidate today. Revisit when mature OSS tool emerges. |
| **3 (When media support added)** | InVID keyframe/forensic API integration | 3-5 days | Free | Media input pipeline |

---

## 9. Final Judgment

**Google Fact Check API enhancement is the only actionable OSINT integration for FactHarbor today.** The infrastructure exists, the API is free, and it directly addresses the fact-checking best practice of "check if it's already been checked." The independent benchmark tier (Tier 2) has no viable candidate — Loki/OpenFactVerification is abandoned (last commit Oct 2024, 48 total commits, v0.0.2) and no other OSS fact-verification tool is mature enough. Everything else is either wrong paradigm (manual investigation tools), wrong modality (media when we do text), or wrong product category (collaborative CMS). Monitor the OSS fact-verification space; revisit Tier 2 when a maintained 1.0+ tool emerges.

---

**Recommended next task:** Implement Google Fact Check API cross-reference enrichment in Stage 1

**Why this first:** Zero new infrastructure, zero cost, existing provider code. Promotes structured ClaimReview data from a generic search result to a first-class pipeline signal. Gives FactHarbor reports the ability to say "This claim was also assessed by Snopes/AFP/PolitiFact" — a significant trust and transparency improvement.
