# Security and operations

FactHarbor's Alpha uses a web application and an API service. Its current controls do not establish a complete production identity, permission or disaster-recovery system.

## Access boundaries

| Surface | Operating contract |
|---|---|
| Analysis submission | Invite-code access and quotas, or authorized administrative access |
| Internal runner | Shared runner-key authentication |
| Administrative changes and configuration tests | Administrative authentication; configuration tests can call paid providers |
| Reports | Public readers can inspect available reports; hidden reports and diagnostic fields have additional access checks |
| Source retrieval | Input and network-target validation, with bounded retrieval |

Keys belong in local environment/configuration files, never in source control, screenshots or issue reports. Keep `FH_ADMIN_KEY` and `FH_INTERNAL_RUNNER_KEY` aligned with their API settings. The [setup guide](../../../devops/guidelines/getting-started/index.md) and [administrator handbook](https://github.com/robertschaub/FactHarbor/blob/main/Docs/USER_GUIDES/UCM_Administrator_Handbook.md) describe their use.

## Local development

The usual local addresses are the web UI at `http://localhost:3000` and API at `http://localhost:5000`, with development Swagger at `/swagger`. Follow the [public contribution instructions](https://github.com/robertschaub/FactHarbor/blob/main/CONTRIBUTING.md) for setup, offline checks and service lifecycle. Do not replace an existing database or stop another task's services to make a check pass.

<span id="ci-cd-pipeline"></span>

## Build and publication

Public CI builds the application and checks the documentation from the public checkout. An authorized push to `main` triggers documentation publication; CI owns the generated Pages branch. A local build or commit does not authorize deployment. See [documentation authoring](https://github.com/robertschaub/FactHarbor/blob/main/Docs/DEVELOPMENT/Documentation.md).

## Operational limits

Health checks establish service reachability, not report quality. Jobs expose progress and result state; administrators can inspect configuration and execution provenance when those records exist. Missing historical provenance must remain explicit.

Before changing an operational deployment, verify its actual authentication, quotas, backup/restore, monitoring and incident-response arrangements. Future role-based access, storage and scaling proposals are not guarantees of current availability. Follow the effective [privacy terms](../../../../privacy-policy.md). The [security policy draft](../../../../organisation/legal-and-compliance/security-policy.md) describes intended controls; [Known issues](https://github.com/robertschaub/FactHarbor/blob/main/Docs/STATUS/KNOWN_ISSUES.md#security-concerns) records current Alpha gaps.
