# Administration

Administrative actions change a running system and require appropriate authorization. Keep credentials out of exported reports and issue descriptions. Use [getting started](../../guidelines/getting-started/index.md) to configure a local instance.

## Pages and access

| Page | Purpose |
|---|---|
| `/admin` | Job audit, configuration snapshots and execution tracing |
| `/admin/config` | Active configuration, editing, version history, comparison and export |
| `/admin/source-reliability` | Inspect/manage cached source assessments |
| `/admin/test-config` | Test configured service connectivity; can call paid providers |

The current test endpoint checks administrative authentication. Authentication does not itself authorize spending: run connectivity checks only when their provider calls are within the task's approved scope.

## Manage configuration

Follow the [UCM guide](../unified-config-management/index.md). Inspect the active version before editing, validate changes, and distinguish saving a version from activating it. History and exports support comparison and recovery. Prompts, pipeline, search, calculation and source-reliability settings are separate configuration domains.

Environment variables hold credentials and infrastructure settings. Analysis behavior is managed in UCM. A repository file update does not prove the same content was active for a job.

## Trace a job

Use the job detail page and administrative audit tools to inspect the recorded configuration and available execution provenance. A job's API creation revision and web execution revision can differ; current responses prefer the execution-time hash when present and otherwise use the legacy creation hash. Missing provenance remains unknown and must not be backfilled by assumption.

The API supports an admin-only `gitHash` filter on `/v1/jobs`. A hash identifies a recorded build, not proof that a model call used a particular active prompt. Compare configuration snapshots and prompt-content hashes as well. See [API contracts](../../../specification/poc/api-and-schemas/rest-api-contract/index.md) and the current [job controller](https://github.com/robertschaub/FactHarbor/blob/main/apps/api/Controllers/JobsController.cs).

## Operational checks

If a service test is skipped, inspect provider selection before treating it as a failure. For authentication or connectivity errors, check matching keys, service addresses and sanitized logs. Restart only the affected service when authorized. Preserve evidence and existing databases; do not reset them to clear a diagnostic problem.

Public reports should expose material analytical limitations while administrative diagnostics remain appropriately scoped. A successful connectivity test or clean health endpoint does not establish report quality.
