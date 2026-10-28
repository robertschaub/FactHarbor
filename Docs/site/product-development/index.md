# Product development

**Development paused — status as of 28 October 2026.** FactHarbor provides evidence-based claim analysis with inspectable reports. The application remains an invite-gated Alpha; development is paused. Read the [contribution scope and operating constraints](https://github.com/robertschaub/FactHarbor/blob/main/CONTRIBUTING.md#project-state-and-change-authority).

**FactHarborDSS (Decision Support System)** is the planned successor, building on FactHarbor’s evidence-based approach. The aim is to bring fact-checking and decision support together for people and AI agents. [FactHarborDSS repository](https://github.com/robertschaub/FactHarborDSS) — currently private; access is restricted.

| Reader need | Start here |
|---|---|
| Explore the application | [Open FactHarbor](https://app.factharbor.ch/) — evidence-based fact-checking; new analyses by invitation |
| Understand the method | [Architecture](specification/architecture/index.md), [analysis pipeline](../akel-pipeline.md) |
| Interpret a report | [Quality and trust](specification/architecture/quality-and-trust/index.md), [verdict scale](diagrams/verdict-scale/index.md), [report examples](specification/fh-analysis-reports/index.md) |
| Run or contribute to the application | [Getting started](devops/guidelines/getting-started/index.md), [contributing](https://github.com/robertschaub/FactHarbor/blob/main/CONTRIBUTING.md) |
| Configure a local instance and integrations | [Local configuration](devops/guidelines/getting-started/index.md#analysis-configuration), [API source](https://github.com/robertschaub/FactHarbor/tree/main/apps/api) |
| Discuss cooperation | [Presentations](presentations/index.md) |

The public checkout includes source, schemas, operative prompts, configuration defaults and checks. Contributions must remain generic across topics, robust across languages and grounded in evidence. Semantic decisions use language-model reasoning; structural code manages contracts and resource control. Analysis settings belong in UCM, with infrastructure and secrets kept in environment configuration.
