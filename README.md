# FactHarbor

## What is FactHarbor?

FactHarbor is an AI-powered platform that turns complex, contested information into structured breakdowns that make reasoning visible and verifiable.

An Evidence Model contains:

- **Claims** — Key assertions extracted from the source material
- **Analysis Contexts** — The frames and conditions under which claims may hold or fail
- **Evidence** — Supporting and opposing sources with quality ratings and reliability scores
- **Verdicts** — Conclusions with explicit confidence levels and cited evidence
- **Full Transparency** — Every assumption, algorithm, and data source is exposed

The result is not a single verdict, but an **evidence landscape** — showing where a claim holds up, where it fails, and where reasonable disagreement exists.

**Who benefits?** Journalists, researchers, educators, policy analysts, and anyone navigating contested claims who wants to *understand*, not just believe.

## Documentation

**[One-Pager](ONEPAGER.md)** — Vision, mission, and why FactHarbor exists in one page.

**[Evidence-Gated Agents](https://github.com/robertschaub/our-ai-charter/blob/main/docs/Assurance/Concepts/evidence-gated-agents.md)** — selected prototype design in which a separate gate asks FactHarbor to examine whether current evidence sufficiently supports an AI agent’s exact proposed decision. The integration is not yet implemented and remains subject to funding.

**[Project context and stewardship](https://github.com/robertschaub/our-ai-charter/blob/main/docs/About.md#stewardship-and-governance)** — how FactHarbor and Our AI Charter relate and are stewarded.

**[Browse full documentation online](https://robertschaub.github.io/FactHarbor/)** — vision, architecture, methodology, and the complete project roadmap.

**[Privacy Policy](Docs/xwiki-pages/FactHarbor/Organisation/Legal%20and%20Compliance/Privacy-Policy.xwiki)** — effective from 18 September 2026 for the current restricted alpha; wider access remains subject to documented expansion gates.

## Getting Started

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for prerequisites, setup, and how to run the application locally.

For detailed configuration of internal keys and service synchronization, see **[Environment Setup & Internal Keys](Docs/DEVELOPMENT/Environment_Setup.md)**.

**Tech stack:** Next.js + ASP.NET Core + LLM orchestration (Anthropic, OpenAI, Google, Mistral)
## License

FactHarbor uses a multi-license model to maximize openness while protecting transparency:

| Content | License |
|---------|---------|
| Documentation | CC BY-SA 4.0 |
| Code (default) | MIT |
| Code (core engine) | AGPL-3.0 |
| Structured data | ODbL |

See [LICENSE.md](LICENSE.md) for full details.

---

*FactHarbor — Making complex claims transparent through evidence, context, and open reasoning.*
