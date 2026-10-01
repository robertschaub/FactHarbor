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
