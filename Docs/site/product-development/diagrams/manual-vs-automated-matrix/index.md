> **Info**
>
> **Design Philosophy** - This matrix shows the intended division of responsibilities between AKEL and humans. v2.6.33 implements the automated claim evaluation; human responsibilities require the user system (not yet implemented).

# Manual vs Automated Matrix

![Manual vs Automated matrix diagram 1](../../../diagrams/diagram-b3fb8daa321a0e91.svg)

[Full-size diagram](../../../diagrams/diagram-b3fb8daa321a0e91.svg) · [Mermaid source](../../../diagrams/diagram-b3fb8daa321a0e91.mmd)

# Automated by AKEL

| Function | Details | Status |
|----|----|----|
| **Claim Evaluation** | Evidence extraction, source scoring, verdict generation, risk classification, publication | Implemented |
| **Quality Assessment** | Contradiction detection, confidence scoring, pattern recognition, anomaly flagging | Partial (Gates 1 and 4) |
| **Content Management** | Boundary clustering, evidence linking, source tracking | Implemented |

# Human Responsibilities

| Function | Details | Status |
|----|----|----|
| **Algorithm Improvement** | Monitor metrics, identify issues, propose fixes, test, deploy | Via code changes |
| **Policy Governance** | Set criteria, define risk tiers, establish thresholds, update guidelines | Not implemented (env vars only) |
| **Exception Handling** | Review flagged items, handle abuse, address safety, manage legal | Not implemented |
| **Strategic Decisions** | Budget, hiring, major policy, partnerships | N/A |

# Key Principles

**Never Manual:**

-   Individual claim approval
-   Routine content review
-   Verdict overrides (fix algorithm instead)
-   Publication gates

**Key Principle:** AKEL handles all content decisions. Humans improve the system, not the data.
