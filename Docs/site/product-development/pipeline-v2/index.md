# Pipeline V2

> **Info**
>
> **Historical target architecture.** V2 explored a redesign of FactHarbor's analysis pipeline. Its implementation workstream was abandoned. These design ideas do not establish a current restart or replacement decision.

The design aimed to make stage responsibilities clearer, keep evidence traceable and ensure that reports present one consistent interpretation of the analysis. Its analytical flow was:

Claim validation → evidence research → sufficiency assessment → evidence-compatible boundaries → verdict adjudication → reporting.

Any future work based on this design must preserve FactHarbor's trust requirements:

- Verdicts cite supporting and opposing evidence. Evidence-backed contestation can affect a verdict; unsupported doubt alone cannot.
- The seven-point verdict scale distinguishes **MIXED**, where evidence supports both sides, from **UNVERIFIED**, where the evidence cannot support a trustworthy judgment. Changes to verdict semantics require a separate decision.
- Material limitations remain visible. Scarce evidence and system failures must be represented honestly, without invented confidence.
- Semantic judgments remain LLM-owned and multilingual. Compatibility adapters present results without reinterpreting verdicts.

The existing runtime remains authoritative until an explicitly approved replacement passes its contract, compatibility and quality checks. Historical reports must remain readable. Where prepared inputs and claim selection apply, replacement work must preserve draft/job associations, selected claims and their original statements, prepared evidence/source data and reuse behavior. Preparation stays separate from execution; an executable job is created only after focus selection is finalized.

This reference authorizes no implementation restart, cutover or paid validation. Consult [current project status](https://github.com/robertschaub/FactHarbor/blob/main/Docs/STATUS/Current_Status.md) and the public contributor instructions before implementation work.

**Further reading:** [Current architecture](../specification/architecture/index.md) · [Calculations and verdicts](../specification/architecture/deep-dive/calculations-and-verdicts/index.md) · [Product development](../index.md).
