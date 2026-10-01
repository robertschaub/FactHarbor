# Product development

FactHarbor builds evidence-based claim analysis with inspectable reports. The application is an invite-gated Alpha; broader development is paused pending funding. Current limitations and approved work are recorded in [project status](https://github.com/robertschaub/FactHarbor/blob/main/Docs/STATUS/Current_Status.md).

| Reader need | Start here |
|---|---|
| Understand the method | [Architecture](specification/architecture/index.md), [analysis pipeline](../akel-pipeline.md) |
| Interpret a report | [Quality and trust](specification/architecture/quality-and-trust/index.md), [verdict scale](diagrams/verdict-scale/index.md), [report examples](specification/fh-analysis-reports/index.md) |
| Run or contribute to the application | [Getting started](devops/guidelines/getting-started/index.md), [contributing](https://github.com/robertschaub/FactHarbor/blob/main/CONTRIBUTING.md) |
| Operate configuration and integrations | [UCM](devops/subsystems-and-components/unified-config-management/index.md), [API contract](specification/poc/api-and-schemas/rest-api-contract/index.md) |
| Discuss cooperation | [Presentations](presentations/index.md) |

The public checkout includes source, schemas, operative prompts, configuration defaults and checks. Contributions must remain generic across topics, robust across languages and grounded in evidence. Semantic decisions use language-model reasoning; structural code manages contracts and resource control. Analysis settings belong in UCM, with infrastructure and secrets kept in environment configuration.

[Pipeline V2](pipeline-v2/index.md) is a historical design reference, not an active implementation restart.
