# Review & Data Use

## 1. User & Role Concepts

-   **READER**: Default role for anonymous visitors (guest). Can browse, search, and view published analyses.
-   **USER**: Registered role (requires login). Can submit URLs/text for analysis (rate-limited), flag issues, and view submission history.
-   **UCM_ADMINISTRATOR**: Appointed role. Manages UCM configuration (prompt templates, quality thresholds, model selection). All config changes are versioned and auditable.
-   **MODERATOR**: Appointed role. Handles abuse, spam, and harassment. Does NOT manage content quality (that is automated).
-   **TECHNICAL_USER**: Strictly technical identities (services, federation components, background jobs).
-   **FEDERATION_NODE**: Technical entity representing a participating node in the federation (future).

## 2. UCM Configuration Actions

The system logs every significant configuration change:

-   **CONFIG_CHANGE** logs who changed which config, when, and why.
-   Fields: `ConfigBlobHash`, `ConfigType`, `ChangedBy`, `ChangeReason`, `Timestamp`.
-   Every analysis job records the config snapshot used via **config_usage**.
-   Reports reference the exact UCM configuration state at time of analysis.

## 3. User Roles

<span id="3-1-human-roles"></span>

### 3.1 Human Roles

# User Role Structure

![Human User Roles diagram 1](../../../diagrams/diagram-6f576e7ac5aaef6d.svg)

[Full-size diagram](../../../diagrams/diagram-6f576e7ac5aaef6d.svg) · [Mermaid source](../../../diagrams/diagram-6f576e7ac5aaef6d.mmd)

# Role Descriptions

| Role | Purpose | Current Status |
|----|----|----|
| **Reader (Guest)** | Anonymous browsing, searching, and viewing | Implemented (all users) |
| **User (Registered)** | Submit URLs/text for analysis (rate-limited) | Not yet implemented (no auth) |
| **UCM Administrator** | Manage UCM configuration, view audit trail | Partially implemented (CLI/direct DB) |
| **Moderator** | Handle abuse, enforce community guidelines | Not yet implemented |

# Current Implementation

All users are anonymous **Readers**:

-   Can view analysis results
-   Can browse and search published analyses
-   No persistent accounts (no authentication system yet)
-   No submission rate limiting (single-user development mode)

# Design Principles

-   **No data editing** — analysis outputs are immutable
-   **Improve the system, not the data** — UCM Administrators tune configuration to improve quality
-   **Moderators handle abuse only** — not content quality (that is automated)
-   **Low barrier to entry** — anyone can browse and search without registration; submission requires a free account
-   **Rate-limited submissions** — LLM inference and web search are not free; registered users have configurable quotas

<span id="3-2-technical-roles"></span>

### 3.2 Technical Roles

> **Warning**
>
> **Partially Implemented (v2.6.33)** - Only AKEL system service is implemented. User system, moderators, background scheduler, and search indexer are **not yet implemented**.

# Target Technical Model

![Technical and System Users diagram 1](../../../diagrams/diagram-a807bc3e1e27e32e.svg)

[Full-size diagram](../../../diagrams/diagram-a807bc3e1e27e32e.svg) · [Mermaid source](../../../diagrams/diagram-a807bc3e1e27e32e.mmd)

# Implementation Status

| Component | Target Purpose | Current Status |
|----|----|----|
| **USER** | User accounts with reputation | Not implemented (anonymous only) |
| **MODERATOR** | Appointed users with permissions | Not implemented |
| **AKEL** | AI processing engine | Implemented (Twin-Path pipeline) |
| **BACKGROUND_SCHEDULER** | Periodic tasks | Not implemented |
| **SEARCH_INDEXER** | Elasticsearch sync | Not implemented (no Elasticsearch) |

# Current Implementation

**v2.6.33 has only:**

-   AKEL pipeline for analysis
-   .NET API for job persistence
-   No background services
-   No search indexing (uses web search only)

## 4. User Class Diagram

# User Class Diagram

![User Class Diagram diagram 1](../../../diagrams/diagram-16c7b668042d1094.svg)

[Full-size diagram](../../../diagrams/diagram-16c7b668042d1094.svg) · [Mermaid source](../../../diagrams/diagram-16c7b668042d1094.mmd)

# Role Permissions

| Role | Capabilities | Requirements |
|----|----|----|
| **Reader (Guest)** | Browse, search, view results | No login required |
| **User (Registered)** | Everything Reader can + submit URLs/text (rate-limited), flag content | Free account required |
| **UCM Administrator** | Everything User can + manage UCM config, view audit trail, trigger re-analysis | Appointed by Governing Team |
| **Moderator** | Everything User can + review flags, hide content, ban users | Appointed by Governing Team |

# Current Implementation

-   All users are anonymous Readers (no authentication system yet)
-   UCM config management via CLI/direct DB access
-   No moderator tooling
-   No rate limiting (single-user development mode)

# Design Principles

-   **No data editing roles** — analysis outputs are immutable
-   **UCM Administrator** improves the system through configuration, not by editing individual outputs
-   **Submission requires login** — LLM inference and web search are not free; rate limits control costs
-   **Four roles**: Reader (guest), User (registered), UCM Administrator (appointed), Moderator (appointed)
