# Core Problems FactHarbor Solves

**Our Mission** FactHarbor brings clarity and transparency to a world full of unclear, contested, and misleading information by shedding light on the context, assumptions, and evidence behind claims.

## 1. Core Problems

<span id="1-1-problem-1-misinformation-manipulation"></span>

### 1.1 Problem 1 — Misinformation & Manipulation

Falsehoods and distortions spread rapidly through:

-   Political propaganda
-   Social media amplification
-   Coordinated influence networks
-   AI-generated fake content

Users need a structured system that resists manipulation and makes reasoning transparent.

<span id="1-2-problem-2-missing-context-behind-claims"></span>

### 1.2 Problem 2 — Missing Context Behind Claims

Most claims change meaning drastically depending on:

-   Definitions
-   Assumptions
-   Boundaries
-   Interpretation

FactHarbor reveals and compares these variations.

<span id="1-3-problem-3-binary-fact-checks-fail"></span>

### 1.3 Problem 3 — "Binary Fact Checks" Fail

Most fact-checking simplifies complex claims into "True" or "False". This often hides legitimate differences in context or methodology. FactHarbor replaces binary judgments with **multi-perspective evaluation**. We use **ClaimAssessmentBoundaries** to show how a claim's truth can change depending on the evidence's scope and assumptions.

<span id="1-4-problem-4-good-evidence-is-hard-to-find"></span>

### 1.4 Problem 4 — Good Evidence Is Hard to Find

High-quality evidence exists, but users often struggle to find it, assess its reliability, or understand how it applies to a specific boundary. FactHarbor aggregates, evaluates, and organizes evidence into clear boundaries with full transparency.

<span id="1-5-problem-5-claims-evolve-over-time"></span>

### 1.5 Problem 5 — Claims Evolve Over Time

Research changes as new studies emerge and consensus shifts. FactHarbor provides:

-   **Versioning**: Full history for every claim and verdict.
-   **Timelines**: Visibility into how a verdict has changed over time.
-   **Auto-Update**: Automatic re-evaluation when new evidence is discovered.

<span id="1-6-problem-6-users-cannot-see-why-people-disagree"></span>

### 1.6 Problem 6 — Users Cannot See Why People Disagree

Disagreements often arise from different definitions, assumptions, or evidence sets. FactHarbor exposes these underlying structures so that disagreements become understandable and constructive, rather than divisive.

## 2. Core Concepts

<span id="2-1-atomicclaim"></span>

### 2.1 AtomicClaim

A single, verifiable assertion extracted from user input. Each claim is evaluated independently across multiple boundaries to ensure a fair and comprehensive assessment.

<span id="2-2-claimassessmentboundary-boundary"></span>

### 2.2 ClaimAssessmentBoundary (Boundary)

A grouping of compatible evidence based on shared methodology, geography, or timeframes. Boundaries emerge naturally from the evidence, showing the different "frames" through which a claim can be viewed.

<span id="2-3-evidenceitem"></span>

### 2.3 EvidenceItem

Information extracted from a source that either supports or contradicts a claim. Each item includes an **EvidenceScope** that describes the source's methodology and limitations.

<span id="2-4-claimverdict"></span>

### 2.4 ClaimVerdict

A likelihood estimate for a claim's truth within a specific boundary. It is based on the quality and quantity of evidence, and is produced through a rigorous, multi-step AI debate process.

<span id="2-5-ai-knowledge-extraction-layer-akel"></span>

### 2.5 AI Knowledge Extraction Layer (AKEL)

The core AI system that extracts claims, researches evidence, clusters boundaries, and generates verdicts. AKEL operates under strict quality gates and human oversight.

<span id="2-6-decentralized-federation-model"></span>

### 2.6 Decentralized Federation Model

FactHarbor supports a decentralized, multi-node architecture where each node stores its own data and synchronizes via federation protocol. This increases resilience, autonomy, and scalability.

## 3. Vision for Impact

FactHarbor aims to:

-   **Reduce polarization** by revealing legitimate grounds for disagreement
-   **Combat misinformation** by providing structured, transparent evaluation
-   **Empower users** to make informed judgments based on evidence
-   **Support deliberative democracy** by clarifying complex policy questions
-   **Enable federated knowledge** so no single entity controls the truth
-   **Resist manipulation** through transparent reasoning and quality oversight
-   **Evolve with research** by continuously improving analysis through UCM configuration

## 4. Related Pages

-   [Requirements (Roles)](../../../product-development/requirements/index.md)
-   [AKEL (AI Knowledge Extraction Layer)](../../../akel-pipeline.md)
-   [Functional Requirements](../../../product-development/requirements/index.md)
-   [Federation & Decentralization](../../../product-development/specification/federation-decentralization/index.md)
