# Prompt management

FactHarbor keeps analysis instructions in managed prompts so that analysis behavior can be inspected, versioned and configured. Operative `.prompt.md` files remain part of the public application source.

## Source and runtime configuration

Repository prompt files provide seed content. The configuration system stores versions and selects the active prompt configuration. Administrators can manage those settings through UCM. A runtime may therefore use an active version that differs from the repository seed; diagnosis must identify the content that actually ran.

Prompts are organised into named sections. The loader selects the required section and substitutes its variables for the task being performed. Provider settings and output contracts must remain consistent with the application code and supported models.

## Responsibilities covered by prompts

The pipeline needs instructions for understanding claims, generating research queries, assessing relevance, extracting evidence, grouping compatible scopes, debating verdicts, validating them and explaining results. These responsibilities align with the [public stage contracts](akel-stage-details.md).

Language-dependent analytical instructions belong in managed prompts or managed search construction. They must not be duplicated as inline semantic rules in application code. Structural code handles schemas, identifiers, section loading, version hashes and other non-semantic processing.

## Contributor guidance

-   Read the actual [operative prompts](https://github.com/robertschaub/FactHarbor/tree/main/apps/web/prompts), [loader](https://github.com/robertschaub/FactHarbor/blob/main/apps/web/src/lib/analyzer/prompt-loader.ts) and applicable agent instructions before editing.
-   Keep changes topic-neutral and robust across languages. Do not build prompts around particular benchmark wording.
-   Preserve the distinction between repository seeds and active runtime configuration.
-   Use the repository's review and verification process. A prompt edit alone does not authorize reseeding a running system or making paid analysis calls.

This public guide describes the management contract. Supported sections, provider settings and current behavior are defined by the public source and active configuration.
