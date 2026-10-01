# FactHarbor Architecture

FactHarbor is an **AI-powered fact-checking platform** that analyses claims and articles using multiple LLM providers and web search, producing structured verdicts with evidence provenance and confidence scores.

This section provides a comprehensive view of the system architecture, organised for different audiences — from executive overview to developer reference.

## How It Works

FactHarbor's core is the **AKEL pipeline** (AI Knowledge Extraction Layer): a 5-stage analysis engine that extracts claims, researches evidence, clusters boundaries, and generates verdicts on a 7-point scale.

![Architecture diagram 1](../../../diagrams/diagram-1b83192b18cb5388.svg)

[Full-size diagram](../../../diagrams/diagram-1b83192b18cb5388.svg) · [Mermaid source](../../../diagrams/diagram-1b83192b18cb5388.mmd)

*The pipeline extracts verifiable claims from input, gathers evidence from the web, clusters compatible evidence into boundaries, generates verdicts via LLM debate, and aggregates results into a final narrative report.*

## System Context

# System Context

![System Context diagram 1](../../../diagrams/diagram-6d90013027fb2a60.svg)

[Full-size diagram](../../../diagrams/diagram-6d90013027fb2a60.svg) · [Mermaid source](../../../diagrams/diagram-6d90013027fb2a60.mmd)

*FactHarbor uses a two-service architecture: a Next.js app for the user interface and AKEL analysis engine, backed by a .NET API for job persistence. The system integrates with multiple LLM and search providers for vendor independence.*

## Core Principles

-   **AI-First** — The AKEL pipeline is the primary analytical system; humans supplement, not gate-keep
-   **Publish by Default** — No centralised approval; every verdict carries confidence scores and evidence provenance
-   **System Over Data** — Improve algorithms, not individual outputs
-   **Measure Everything** — Quality metrics drive all improvements
-   **No Vendor Lock-In** — Switch LLM or search providers based on cost, quality, or availability without code changes
-   **Start Simple** — Add complexity only when metrics prove it necessary

## Technology Stack

| Layer | Technology | Purpose |
|----|----|----|
| **Frontend** | Next.js (TypeScript, React) | User interface, admin dashboard |
| **Analysis Engine** | TypeScript, Vercel AI SDK | AKEL pipeline, LLM orchestration |
| **API Backend** | ASP.NET Core 8 (C#) | Job scheduling, persistence, SSE events |
| **Storage** | SQLite (3 databases) | Jobs, configuration, source reliability cache |
| **LLM Providers** | Anthropic, OpenAI, Google, Mistral | Multi-provider AI with per-task model tiering |
| **Web Search** | Google CSE, SerpAPI, Brave,\nWikipedia, Semantic Scholar,\nGoogle Fact Check | Evidence retrieval with provider fallback |
| **Quality** | Vitest, PromptFoo | Automated testing and prompt evaluation |

## Architecture Documentation

### Architectural Views (for Architects and Product Owners)

| Page | What You'll Learn |
|----|----|
| [System Design](system-design/index.md) | Two-service architecture, request lifecycle, technology stack, inter-service communication |
| [AKEL Pipeline](../../../akel-pipeline.md) | 5-step analysis flow, pipeline variants, shared analysis modules |
| [Data Model](data-model/index.md) | Complete entity model (CB pipeline: CBClaimUnderstanding, AtomicClaim, ClaimAssessmentBoundary, CBClaimVerdict, OverallAssessment, VerdictNarrative, etc.), quality gate and configuration entities, 7-point verdict scale, job lifecycle |
| [External Dependencies](external-dependencies/index.md) | LLM providers and model tiering, search providers, provider health monitoring |
| [Storage and Configuration](storage-and-configuration/index.md) | Three-database architecture, UCM configuration management, storage evolution roadmap |
| [Quality and Trust](quality-and-trust/index.md) | Quality gates, evidence filtering, source reliability, confidence calibration |
| [Security and Operations](security-and-operations/index.md) | Security model, deployment topology, user roles, monitoring |

### Deep Dives (for Developers and Testers)

|  |  |
|----|----|
| [Deep Dive Index](deep-dive/index.md) | Role-based navigation to detailed implementation references |

Includes: ClaimAssessmentBoundary Pipeline internals, Pipeline Variants, Verdict Debate Pattern, Quality Gates Reference, Boundary Clustering, Evidence Quality Filtering, Source Reliability System, Calculations and Verdicts, Prompt Architecture, Confidence Calibration.

### Future Architecture

|  |  |
|----|----|
| [Future](future/index.md) | Target production architecture, federation vision, automation roadmap |

## Reading Paths

> **Info**
>
> **Sponsor or executive?** Start here, then optionally read [Quality and Trust](quality-and-trust/index.md) to understand what makes the analysis trustworthy.
>
> **Product Owner or Architect?** Read the 7 Architectural Views above in order (~30-45 minutes for a thorough understanding).
>
> **Developer or Tester?** Complete the Architect path first for context, then use the [Deep Dive Index](deep-dive/index.md) to navigate to references relevant to your task.

## Project Status

| Phase | Status | Description |
|----|----|----|
| **Alpha** | Current | Invite-code limited testing, rate limiting, VPS deployment, core AKEL pipeline |
| **Beta** | Planned | User accounts, PostgreSQL migration, production hardening, monitoring |
| **V1.0** | Planned | Public launch, public API, observability, disaster recovery |
| **V2.0+** | Vision | Federation, semantic search, cross-node analysis |

## Related

-   [Design Decisions](../design-decisions.md) — Rationale for key architectural choices
-   [When to Add Complexity](../../devops/guidelines/when-to-add-complexity/index.md) — Decision triggers for technology additions
-   [Requirements](../../requirements/index.md) — User needs and system requirements
