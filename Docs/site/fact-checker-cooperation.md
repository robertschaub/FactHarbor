# FactHarbor — Automated Fact-Checking for Newsrooms



> **Author:** Robert Schaub (Founder and Lead Developer, FactHarbor.ch) **Date:** 31 March 2026



## Document Purpose


**Inspect:**

*   What FactHarbor does, challenges, goals
  **Discuss:**
*   Cooperation opportunities with fact-checkers and newsrooms


## FactHarbor Organisation


Open-source applications and web services for AI-powered fact-checking — every verdict backed by evidence you can inspect.
**Mission:**
FactHarbor brings clarity and transparency to a world full of unclear, contested, and misleading information by shedding light on the context, assumptions, and evidence behind claims.

**Non-profit and Transparent**
FactHarbor is a **Non-Profit Organisation** and a strictly **Open-Source** project.
We serve the public interest with full transparency — no hidden algorithms, and no profit motive.

The FactHarbor **[Verein](https://github.com/robertschaub/FactHarbor/blob/main/Docs/Legal/Vereinsstatuten_FactHarbor_DE.md)** is a Swiss non-profit association, founded on April 23, 2026 and registered in the Commercial Register of the Canton of Zürich (UID CHE-448.446.098).


## The FactHarbor Application


**FactHarbor analyzes claims and articles** by breaking them into verifiable pieces and collecting supporting and opposing evidence from web sources and databases.

It evaluates evidence quality and source reliability, then compares, challenges, and reconciles findings through a structured multi-agent AI debate.

**The result: a transparent verdict where every conclusion links to cited evidence — so you can judge for yourself.**


### What it is NOT


FactHarbor does **not** replace editorial judgment, insider sources, or image/video verification (that's what InVID, TinEye etc. are for). It complements the existing toolbox by automating the time-consuming evidence research for **text-based claims**.

----


## Why This Matters


Misinformation spreads faster than corrections can follow — and the infrastructure is shrinking:

*   **Meta** exited the US Third-Party Fact-Checking Program (January 2025).
*   **Google** reduced ClaimReview visibility in Search results (2025).
*   AI-generated deepfakes and misinformation are accelerating — manual tools are falling behind.

The sector needs independent, sustainable infrastructure. FactHarbor is built for that: open-source, non-profit, and transparent.

----


## How It Works


Unlike single-model AI tools, FactHarbor uses a **structured multi-agent debate** — a Claude-led analysis is independently challenged by a model from a second AI provider (OpenAI). Only evidence-backed objections count.

![fact checker cooperation diagram](diagrams/fact-checker-cooperation-1.svg)

[Full-size diagram](diagrams/fact-checker-cooperation-1.svg) · [Mermaid source](diagrams/fact-checker-cooperation-1.mmd)


## What sets FactHarbor apart?



| Dimension | Manual fact-checking | FactHarbor |
| --- | --- | --- |
|**Evidence research**|Search and read sources yourself|Automatic — iterative web research across 7 providers |
|**Source quality**|Assess credibility by experience|Automatic per-domain scoring (peer-reviewed vs. social media) |
|**Counter-arguments**|Actively sought, but time-consuming|Systematic — AI debate forces both sides to surface |
|**Time per claim**|2–4 hours (experienced journalist)|~15 minutes (target: < 5 min) |
|**Traceability**|Your own notes|Every step documented with source citations |
|**Image/video**|OSINT tools (InVID, TinEye, Bellingcat)|Not yet covered — use your existing tools |


----


## FactHarbor UI


[app.FactHarbor.ch](https://app.factharbor.ch)

![FH UI](_attachments/Organisation/Partner%20%26%20User%20Relations/Presentations/Fact-Checker%20Cooperation/FH_UI.png)


### Verdict and Report

![Verdict Plastic](_attachments/Organisation/Partner%20%26%20User%20Relations/Presentations/Fact-Checker%20Cooperation/Verdict_Plastic.png)
![CA matrix](_attachments/Organisation/Partner%20%26%20User%20Relations/Presentations/Fact-Checker%20Cooperation/CA_matrix.png)

Each verdict includes: truth percentage, confidence, supporting and opposing evidence citations, and a full reasoning narrative.

----


## FAQ



### How are claims selected?


Users can freely submit any claim or full article. The system extracts so-called "Atomic Claims" — individual verifiable statements — and analyzes each one automatically.


### How does it avoid AI hallucination?


Unlike a ChatGPT-style conversation, the AI agents here are constrained — they must follow a tightly prescribed multi-step workflow and produce structured data at each stage.

In the second stage, the agents are fed with evidence gathered via web search (Google, Semantic Scholar, Wikipedia etc.) — a technique known as RAG (Retrieval Augmented Generation).


### How accurate is the analysis?


The headline verdicts (True through False on a 7-point scale) are a starting point, not the final word — language and evidence are rarely black and white.

The real value is not just a verdict — it's the report behind it: every claim backed by cited sources, counter-arguments, confidence scores, and quality warnings. When evidence is thin or conflicting, the system says so openly rather than producing a confident-sounding answer.

----


## Working Together



| What you bring | What you gain |
| --- | --- |
|Workflow knowledge — where verification takes the most time|A tool that automates evidence research, not editorial judgment |
|Real-world claims and feedback on verdict quality|Early access and influence on how the tool evolves for your use case |
|Network reach into the DACH fact-checking ecosystem|A technology partner building specifically for your needs — not a generic AI product |
|Willingness to test in a short pilot|Transparent, auditable reports you can inspect and build on |



## How could FactHarbor fit your workflow?



### Pre-publication research

Journalist drafts a story → submits key claims to FactHarbor → uses the report to identify evidence gaps or counter-arguments.


### Rapid fact-check response

Breaking claim appears → FactHarbor delivers an evidence overview → editorial team refines the verdict.


### Training and education

Junior journalists see **how** evidence is systematically evaluated — not just the result, but the entire research process.


### Audit trail

Every claim, every source, every reasoning step is logged — defensible against complaints or bias accusations.

----


## Current Status and Roadmap



| Area | Status |
| --- | --- |
|**Full pipeline**|5 stages operational: extract claims → research evidence → cluster → AI debate → aggregation |
|**Independent AI challenger**|Claude-led debate, challenged on every claim by a model from a second provider (OpenAI) |
|**Quality control**|6-layer quality checks, confidence tiers, warnings when evidence is thin |
|**Source evaluation**|Automatic per-domain scoring (peer-reviewed study vs. social media post) |
|**Multilingual**|German, English, French, Portuguese tested |
|**Analysis time**|~15 minutes per claim (target: under 5 minutes) |


The system is in **Alpha** and under active development.


| Phase | What It Unlocks |
| --- | --- |
|**Beta** (planned)|User authentication, performance optimization, monitoring |
|**V1.0** (planned)|Public REST API, browser extensions, ClaimReview schema |
|**V1.5+** (vision)|Image/video verification, CMS plugins, team workspaces |


----


## Try it


**Live Demo:**
**[app.FactHarbor.ch](https://app.factharbor.ch)**

Submit any claim — the system researches and delivers a transparent verdict.

----


## Contact


Robert Schaub — Founder and Lead Developer

*   info@factharbor.ch
*   [factharbor.ch](https://factharbor.ch)
*   [LinkedIn](https://www.linkedin.com/in/robertschaub)
*   Phone: +41 76 449 14 39

----

**Related research:** [Fact-Checking Quality Levels by Country](https://github.com/robertschaub/FactHarbor/blob/main/Docs/Investigations/Fact-Checking_Quality_Levels_by_Country.md) | [Swiss Fact-Checking Landscape](https://github.com/robertschaub/FactHarbor/blob/main/Docs/Investigations/Swiss_FactChecking_Landscape_2026.md) | [Global Landscape](https://github.com/robertschaub/FactHarbor/blob/main/Docs/Investigations/Global_FactChecking_Landscape_2026.md)

**Navigation:** [Presentations](organisation/partner-user-relations/presentations/index.md) | [Support FactHarbor](funding.md) | [LinkedIn Article](linkedin.md)
