# Analysis architecture

The AI Knowledge Extraction Layer (AKEL) is the analysis layer behind FactHarbor's ClaimAssessmentBoundary pipeline. The current pipeline has five stages: understand claims, research evidence, group compatible scopes, generate and challenge verdicts, and aggregate an explained assessment.

![FactHarbor analysis method](diagrams/homepage-method.svg)

[Full-size diagram](diagrams/homepage-method.svg) · [Mermaid source](diagrams/homepage-method.mmd)

## Responsibilities

Research follows the claims that need assessment. Evidence carries source and scope information throughout the process. Analytical boundaries emerge from that evidence. The [debate stage](verdict-debate.md) assesses each claim using the relevant evidence and boundaries, and the report connects conclusions to their supporting or opposing evidence.

The pipeline separates semantic analysis from structural processing. Language models perform interpretation, relevance assessment and other meaning-dependent judgements. Structural code manages identifiers, schemas, configuration, resource limits and result assembly. See [stage responsibilities](akel-stage-details.md) for the public contracts contributors need to preserve.

## Shared capabilities

| Capability | Responsibility |
|---|---|
| Evidence handling | Preserve source references and the conditions under which evidence applies |
| Evidence quality | Assess probative value and relevance; avoid treating duplicates as independent support |
| Source reliability | Supply source-quality information for interpreting evidence |
| Quality gates | Validate claims and assess confidence |
| Verdict interpretation | Apply the public verdict scale and distinguish truth from confidence |
| Configuration and budgets | Manage analysis settings and bounded resource use |

These responsibilities are also shown in the [shared capabilities diagram](shared-modules.md). Resource limits and model choices are configurable operational settings; a particular budget is not a guarantee of evidence completeness or report quality.

## Contributor entry points

The public repository retains the implementation, schemas, operative prompts, default configuration and verification instructions needed to build and work on the application. Start with [CONTRIBUTING](https://github.com/robertschaub/FactHarbor/blob/main/CONTRIBUTING.md) and the applicable agent instructions. Actual supported execution paths and active configuration govern runtime behavior.

FactHarbor remains an alpha project. The architecture describes the method and its responsibilities, not a claim that every analysis succeeds or that every historical design is implemented.
