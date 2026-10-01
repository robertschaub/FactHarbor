# FactHarbor current status

FactHarbor is an invite-gated **Alpha**. Broader engineering has been paused since 2 July 2026 pending funding. Separately authorized repairs and documentation work do not restart that program. The existing application remains available; this document is not a fresh production-health attestation.

## Supported application

The public checkout contains the Next.js web application and runner, ASP.NET Core API, SQLite persistence, configuration defaults, prompts and offline tests. The supported analysis pipeline is `claimboundary`. Reports expose claims, cited evidence, confidence and material limitations. See [architecture](../site/product-development/specification/architecture/index.md), [getting started](../site/product-development/devops/guidelines/getting-started/index.md) and [known issues](KNOWN_ISSUES.md).

Source and effective runtime configuration are separate. Admin-owned prompt/configuration versions can remain active after a source deployment. Verify actual versions and per-job provenance before attributing an outcome to a change; a commit or `/version` response alone does not identify the loaded runtime.

## Why development is paused

Restart requires an explicit maintainer decision with a bounded outcome, time and spending allowance, verified baseline and backups, appropriate review, and measurable stop criteria. Preserve local evidence, worktrees and services unless their change is specifically authorized. Budget or credit availability does not reopen a stopped experiment.

The active operating restrictions are in [Backlog](Backlog.md#holds-and-required-decisions). In particular:

- Model comparison remains stopped; retain the deployed allocation. No model promotion, paid rerun or reuse of an earlier experiment slot/budget follows from documentation work.
- `DECOMP-RULES` and its Stage 5 design, `NARR-INPUT`, `ADJ-INPUT`, `CLUSTER-CEIL` option C, SR translation cap/UCM changes and EQA eligibility remain held or require separate decisions.
- `C14-UNAVAILABLE`: keep current count-floor and MT-5 eligibility. The proposed skip was not selected.
- The entity-null correction is implemented and offline verified. Evidence-applicability capture remains **unimplemented**: the next bounded investigation task is default-off offline implementation, subject to its own assignment. Enablement, observation window, retention and any spending require separate authority. It is not a score/cache repair.
- EN supplementary retrieval remains experimental/default-off. Source-native retrieval has a default-off scaffold; its planner is unimplemented. Follow the [multilingual promotion contract](../ARCHITECTURE/Multilingual_Language_Handling.md).
- Do not prune the main analysis prompt before measurement and stage isolation exist. A failed quality attempt requires the recovery record in root `AGENTS.md` before another edit.

## Validation and contribution

[Captain Quality Expectations](../AGENTS/Captain_Quality_Expectations.md), the benchmark JSON and Q-code catalog govern quality review. Use the exact approved inputs; unscored controls have no inferred bands. A successful build is not analysis-quality evidence.

Select focused offline checks for a change. `npm test` excludes designated real-provider suites, but inspect each selected command for service or state effects. Calibration, promptfoo and validation batches can spend provider credits and require current authorization. [Calibration run policy](Calibration_Run_Policy.md) governs its lanes.

Before authorized paid validation, verify active prompt/configuration versions (`F2-PROD` and `PROD-PINS`), isolate comparator-bearing jobs, and retain execution provenance. Production deployment, configuration activation and local service changes remain separate actions.

Current contribution priorities and known coverage gaps are in [Backlog](Backlog.md). Public contributors can build and work from this repository's [contribution instructions](../../CONTRIBUTING.md) and current source contracts.

## Operational limits

The [privacy policy](../site/privacy-policy.md) applies to the restricted Alpha. Wider access remains gated by the required privacy, retention, private-person and source-rights controls. Invite-code lockout is declined and external monitoring deferred under the existing decisions; see [security concerns](KNOWN_ISSUES.md#security-concerns). These decisions must be reconsidered on changed exposure or new evidence, not silently presented as implemented controls.

For startup problems, inspect logs and configuration before changing state. Back up data before an authorized recovery; never delete a database as a routine startup remedy. A stale prompt should be diagnosed through its active version and provenance before any authorized reseed.
