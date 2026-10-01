# Product Development

**We build a high-scale, automated analysis pipeline (AKEL) for evidence-based reasoning.** FactHarbor uses **Next.js**, **.NET 8**, and **multi-provider LLMs** to deliver auditable results. Our development is metrics-driven, open-source, and follows a strict "system-over-data" philosophy.

**Project Repository:** <a href="https://github.com/robertschaub/FactHarbor" rel="noopener" target="_blank">FactHarbor on GitHub</a>

## Quick Start: I am a...

-   **New Developer** → [DevOps & Setup](devops/index.md)
-   **System Architect** → [Specification & Deep Dives](specification/index.md)
-   **Product Owner** → [Requirements & User Needs](requirements/index.md)
-   **Project Manager** → [Planning & Roadmap](planning/index.md)

------------------------------------------------------------------------

## Core Documentation

-   **[Requirements](requirements/index.md)** — Functional features, user roles, and quality standards.
-   **[Specification](specification/index.md)** — Technical architecture, data models, and implementation deep-dives.
-   **[Planning](planning/index.md)** — Project status, phase definitions (Alpha/Beta), and roadmaps.
-   **[DevOps](devops/index.md)** — Coding guidelines, local setup, and deployment guides.

------------------------------------------------------------------------

## Engineering Mandates

-   **No Domain Hardcoding**: The system must remain generic and strictly evidence-driven.
-   **LLM Intelligence**: Use semantic reasoning for analysis, never regex/heuristics.
-   **Input Neutrality**: Phrasing must not bias the depth or direction of analysis.
-   **UCM-Driven**: All tunable parameters reside in Unified Config Management (SQLite).
