# UCM administrator handbook

Use `/admin/config` to inspect and manage the application's versioned configuration. Administrative access and an explicit change scope are required for mutations.

## Inspect before changing

1. Confirm the environment and database being inspected. Do not assume a local checkout, build or `/version` response identifies the running service or loaded settings.
2. Record the active type/profile, content hash and version label. Labels are descriptive; hashes identify content.
3. Inspect the current config and the comparison with file defaults. A default value is not proof of the effective runtime value.
4. Use History and Diff to compare the relevant versions. Preserve the original version and export a backup before an authorized change.

The dashboard supports active configuration, version history, content-hash lookup, comparisons and export. Use the currently rendered controls; obsolete screenshots and model names are not runtime authority. Current JSON fields/defaults live in `apps/web/configs/*.default.json` and their schema in `apps/web/src/lib/config-schemas.ts`.

## Change and verify

Define the reason, narrow intended effect, validation and rollback criteria before editing. Save a descriptive version; review the full diff and validation results before activation. Importing content, saving a version, activating it and reseeding from files have different effects. Confirm the actual active hash after an authorized activation.

Prompt loading may refresh system-seeded content from changed files. Customized/admin-owned blobs have different preservation behavior. Read the [reseed procedure](../AGENTS/Procedures/Prod_Prompt_Config_Reseed.md) before using that path. A build's postbuild step can seed its environment-selected configuration database; isolate build state from live databases.

A live analysis is a separate, paid action. Use only exact approved inputs and the current spending/stop rules. Offline config validation or a successful save does not prove improved report quality.

## Relate a report to its configuration

Inspect the job's config snapshots and provenance in the Admin quality view (`/admin/quality/job/{JOB_ID}`). Compare the execution commit and prompt/config hashes, including missing or inconsistent records. Do not replace a job's recorded values with today's active configuration or infer an old prompt from a version label alone.

Distinguish changed source, changed active content and a changed provider response. Diagnostic collection can itself mutate state or call providers; use read-only source and existing evidence when the assignment is read-only.

## Restore a known version

When rollback is authorized, select the correct type/profile and previously verified version in History, inspect its content, activate it, and confirm the resulting active hash. An old version is not automatically a good baseline. Keep the failed version and diagnostic evidence so the result remains reviewable; do not delete data as a rollback shortcut.

## API and access

The public configuration routes under `apps/web/src/app/api/admin/config/` define available methods, authentication and response schemas. The Admin UI is the reader-facing entry point; use current source for automation contracts. Credentials belong in the configured environment, never exported into public records.

Before changing analysis settings, check [current holds](../STATUS/Backlog.md#holds-and-required-decisions), [known limitations](../STATUS/KNOWN_ISSUES.md), root [AGENTS.md](../../AGENTS.md) and the task's approval. Feature availability in the UI is not permission to enable it.
