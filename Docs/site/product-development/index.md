# Product development

<div class="admonition info" markdown="1">

<p class="admonition-title">The FactHarbor application’s next chapter</p>

Our work continues with **FactHarborDSS (Decision Support System)**, the planned successor to the **FactHarbor application**, extending evidence-based fact-checking into decision support for people and AI agents. [FactHarborDSS repository](https://github.com/robertschaub/FactHarborDSS) — public documentation and planned application home.

The **FactHarbor association** remains the organization behind this work. The current FactHarbor application remains an invite-gated Alpha. Read the [contribution scope and operating constraints](https://github.com/robertschaub/FactHarbor/blob/main/CONTRIBUTING.md#project-state-and-change-authority).

</div>

| Reader need | Start here |
|---|---|
| Explore the application | [Open FactHarbor](https://app.factharbor.ch/) — evidence-based fact-checking; new analyses by invitation |
| Understand the method | [Architecture](specification/architecture/index.md), [analysis pipeline](../akel-pipeline.md) |
| Interpret a report | [Understanding a FactHarbor report](specification/architecture/quality-and-trust/index.md), [verdict scale](diagrams/verdict-scale/index.md), [report examples](specification/fh-analysis-reports/index.md) |
| Run or contribute to the application | [Getting started](devops/guidelines/getting-started/index.md), [contributing](https://github.com/robertschaub/FactHarbor/blob/main/CONTRIBUTING.md) |
| Configure a local instance and integrations | [Local configuration](devops/guidelines/getting-started/index.md#analysis-configuration), [API source](https://github.com/robertschaub/FactHarbor/tree/main/apps/api) |
| Discuss cooperation | [Presentations](presentations/index.md) |

The public checkout includes source, schemas, operative prompts, configuration defaults and checks. Contributions must remain generic across topics, robust across languages and grounded in evidence. Semantic decisions use language-model reasoning; structural code manages contracts and resource control. Analysis settings belong in UCM, with infrastructure and secrets kept in environment configuration.
