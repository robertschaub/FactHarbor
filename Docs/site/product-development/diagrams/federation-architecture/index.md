> **Warning**
>
> **Not Implemented (v2.10.2)** — Federation is planned for V2.0+. Current implementation is single-instance only.

# Federation Architecture (Future)

![Federation Architecture diagram 1](../../../diagrams/diagram-a99a55efe580dd5d.svg)

[Full-size diagram](../../../diagrams/diagram-a99a55efe580dd5d.svg) · [Mermaid source](../../../diagrams/diagram-a99a55efe580dd5d.mmd)

**Federation Architecture** - Future (V1.0+): Independent FactHarbor instances can sync claims for broader reach while maintaining local control.

## Target Features

| Feature | Purpose | Status |
|----|----|----|
| **Claim synchronization** | Share verified claims across instances | Not implemented |
| **Cross-node audits** | Distributed quality assurance | Not implemented |
| **Local control** | Each instance maintains autonomy | N/A |
| **Contradiction detection** | Cross-instance contradiction checking | Not implemented |

## Current Implementation

-   Single-instance deployment only
-   No inter-instance communication
-   All data stored locally in SQLite
