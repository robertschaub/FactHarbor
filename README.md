# FactHarbor

**[Explore FactHarbor](https://app.factharbor.ch/)** — Follow claims to their sources, examine the reasoning, and form your own judgment. Access to new analyses is by invitation.

> [!NOTE]
> **The FactHarbor application’s next chapter**
>
> Our work continues with **FactHarborDSS (Decision Support System)**, the planned successor to the **FactHarbor application**. The **FactHarbor association** remains the organization behind this work. Building on evidence-based fact-checking, DSS aims to help people and AI agents compare options and understand the evidence, assumptions and trade-offs behind a recommendation.
>
> [FactHarborDSS repository](https://github.com/robertschaub/FactHarborDSS) — public documentation and planned application home. The current FactHarbor application remains an invite-gated Alpha.

See [project status and contribution guidance](CONTRIBUTING.md#project-state-and-change-authority).

<a id="what-is-factharbor"></a>

## What is the FactHarbor application?

The FactHarbor application is an AI-powered platform that turns complex, contested information into structured breakdowns that make reasoning visible and verifiable.

An Evidence Model contains:

- **Claims** — Key assertions extracted from the source material
- **Assessment boundaries** — The frames and conditions under which claims may hold or fail
- **Evidence** — Supporting and opposing sources with quality ratings and reliability scores
- **Verdicts** — Conclusions with explicit confidence levels and cited evidence
- **Full Transparency** — Every assumption, algorithm, and data source is exposed

The result is not a single verdict, but an **evidence landscape** — showing where a claim holds up, where it fails, and where reasonable disagreement exists.

**Who benefits?** Journalists, researchers, educators, policy analysts, and anyone navigating contested claims who wants to *understand*, not just believe.

## Documentation

**[One-Pager](ONEPAGER.md)** — Vision, mission, and why FactHarbor exists in one page.

**[Evidence-Gated Agents](https://github.com/robertschaub/our-ai-charter/blob/main/docs/Assurance/Concepts/evidence-gated-agents.md)** — a repeated check pattern with transition-specific requirements and evidence retrieval available to any check, including authority and permission checks. The selected prototype examines an agent’s exact proposed decision and controls its release, with planned reuse of FactHarbor retrieval and analytical capabilities. EGA retains analysis and gate decisions; retrieved evidence does not itself grant authority. The integration is not yet implemented and remains subject to funding.

**[Project context and stewardship](https://github.com/robertschaub/our-ai-charter/blob/main/docs/About.md#stewardship-and-governance)** — how FactHarbor and Our AI Charter relate and are stewarded.

**[Browse full documentation online](https://robertschaub.github.io/FactHarbor/)** — vision, architecture, methodology, and the complete project roadmap.

**[Privacy Policy](Docs/site/privacy-policy.md)** — effective from 18 September 2026 for the current restricted alpha; wider access remains subject to documented expansion gates.

## Getting Started

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for prerequisites, setup, and how to run the application locally.

For detailed configuration of internal keys and service synchronization, see **[Environment Setup & Internal Keys](Docs/DEVELOPMENT/Environment_Setup.md)**.

**Tech stack:** Next.js + ASP.NET Core + LLM orchestration (Anthropic, OpenAI, Google, Mistral)
## License

Original software is licensed under GNU AGPL version 3 only; original documentation and graphics use CC BY-SA 4.0. See [Licensing guide](LICENSING.md) for the scope and third-party exceptions. Robert Schaub may separately agree alternative licences for rights he controls.

---

*FactHarbor — Making complex claims transparent through evidence, context, and open reasoning.*
