# Unified Config Management (UCM)

UCM manages versioned analysis settings and prompts through `/admin/config`. It separates active runtime configuration from the repository files used as defaults or prompt seeds.

## Configuration domains

| Domain | Operating responsibility |
|---|---|
| Pipeline | Provider/model selection, analysis settings, limits and feature controls |
| Search | Search providers and retrieval settings |
| Calculation | Supported assessment and aggregation configuration |
| Source reliability | Source-assessment and cache settings |
| Prompt | Named prompt profiles and their active content |

Profiles are versioned per configuration type and profile key, not as one combined profile object. The current supported prompt profiles are `claimboundary`, `source-reliability` and `input-policy-gate`; consult the [canonical allowlist](https://github.com/robertschaub/FactHarbor/blob/main/apps/web/src/lib/config-storage.ts) before importing or reseeding. Other prompt files may serve separate tools and are not automatically UCM profiles.

Legacy consumers may still request a database-only `orchestrated` prompt profile. It has no seed file and is not part of fresh-checkout setup; see [prompt loading and known legacy dependencies](https://github.com/robertschaub/FactHarbor/blob/main/apps/web/prompts/README.md). Do not invent a replacement profile or reseed a different runtime as a setup workaround.

## Authority and defaults

Active database configuration governs runtime behavior. File-backed defaults in [apps/web/configs](https://github.com/robertschaub/FactHarbor/blob/main/apps/web/configs) and prompt seeds in [apps/web/prompts](https://github.com/robertschaub/FactHarbor/blob/main/apps/web/prompts) remain public source. JSON defaults and their schema defaults must stay synchronized. Missing-config and seeding behavior is defined by the current loader/storage implementation.

Changing a file does not establish which configuration was active for a previous or running job. Inspect the active version, effective configuration and job snapshot. Seed-refresh behavior distinguishes system-seeded content from administrator-managed versions; use the approved reseed procedure instead of assuming every restart overwrites the database.

Environment variables are for infrastructure, paths, credentials and startup controls. They are not a parallel override channel for analytical tuning.

## Inspect, edit and activate

1. Open `/admin/config` with authorized administrative access and select the relevant type/profile.
2. Inspect **Active** and, for JSON configuration, **Effective**. Record the current content hash before a consequential change.
3. Use **Edit** to make the approved change. Resolve schema validation errors; do not treat example values from a historical document as current defaults.
4. Choose the intended save/activation action. Confirm which hash became active; a saved version and an active version are different states.
5. Use **History** to compare versions or activate a previously reviewed version when rollback is authorized.

Configuration changes that affect analysis remain subject to the project's review and verification rules. Do not tune on a few failing reports or enable a default-off experiment without its approved scope.

## Import, export and recovery

Export supports review and backup; imports must match the current type/profile and schema. Keep exports in an appropriate access scope because prompts and configuration can contain task-specific material. Do not paste private exports into public issues or third-party validators.

Development file-write features, where enabled, are separate from saving active UCM versions. Inspect the resulting diff and preserve the previous settings. A configuration export is not a backup of job databases or raw investigation evidence.

## Diagnose configuration drift

Compare the intended default/seed, the active content hash, the effective settings and the job's recorded snapshot. Verify that the affected process loaded the intended state before interpreting a rerun. Exact-input controls, code revision, active prompt/configuration and provider identity all matter for comparison.

The [admin guide](../admin-interface/index.md) covers the UI and provenance tools. The [reseed procedure](https://github.com/robertschaub/FactHarbor/blob/main/Docs/AGENTS/Procedures/Prod_Prompt_Config_Reseed.md) governs authorized runtime refreshes. Reading either guide grants no deployment, runtime change or provider-spending authority.
