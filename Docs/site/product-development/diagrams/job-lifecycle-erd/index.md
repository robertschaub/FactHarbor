# Job Lifecycle ERD

![Job Lifecycle ERD diagram 1](../../../diagrams/diagram-6ddcdfb5e0ee74d2.svg)

[Full-size diagram](../../../diagrams/diagram-6ddcdfb5e0ee74d2.svg) · [Mermaid source](../../../diagrams/diagram-6ddcdfb5e0ee74d2.mmd)

*Jobs progress through a lifecycle: QUEUED -\> RUNNING -\> SUCCEEDED or FAILED. If the system auto-pauses due to provider outage, jobs remain QUEUED until processing resumes. Events are logged at each stage and streamed to the client via SSE.*
