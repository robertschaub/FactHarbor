# Prod Prompt/Config Re-seed

How file-backed prompt/config changes reach runtime, and how to verify the content in use.

## Activation paths

Runtime prompts resolve through the config database, initially seeded from `apps/web/prompts/*.prompt.md`. In the current implementation, loading a prompt can read changed file content and activate it automatically:

- **System-seeded prompt:** `loadPromptConfig` invokes `refreshPromptFromFileIfSystemSeed`. If the active blob has `createdBy="system-seed"` and a version label beginning `seed-v`, changed file content is saved and activated. Publishing the prompt file must therefore be treated as a potential activation.
- **Customized or other-origin prompt:** that refresh preserves the active content. A normal reseed also skips these blobs; an explicitly authorized replacement is needed to change them.
- **No active prompt:** the loader can seed and activate the file on first load.

These paths are defined in [config-loader.ts](../../../apps/web/src/lib/config-loader.ts) and [config-storage.ts](../../../apps/web/src/lib/config-storage.ts). Calling `loadPromptConfig` or `loadPromptFile` is not a read-only way to inspect activation state.

- **Code** (Zod schemas, `maxOutputTokens`, analyzer logic) is compiled into the build → live on deploy.
- `postbuild` runs `reseed-all-prompts.ts --quiet` against the database resolved by its environment. It is not inherently an isolated build database; verify the build and runtime database paths.
- Other UCM defaults in `apps/web/configs/*.default.json` have their own load/seed rules. Do not infer their refresh behavior from the prompt path. Normal reseeding preserves customized configurations.

A deployed file may remain unused for a customized prompt, or become active on a later load for a system-seeded prompt. Determine the deployed code, file content, active blob origin and database path before planning the release. This procedure does not attest the current production state.

## Make it live (on the prod server, against the prod `config.db`)

- `npm -w apps/web run reseed` — both prompts and configs (normal mode)
- `npm -w apps/web run reseed:prompts` / `reseed:configs` — one type only
- **Admin-owned blobs:** a normal re-seed refreshes only **system-owned** default blobs and silently skips blobs edited via the admin UI. To overwrite those, force: `npx tsx scripts/reseed-all-prompts.ts --prompts --force` (or `run reseed:force` for all types).

## Verify

- Coordinate prompt-file rollout and dependent code under the same authorized release plan; do not rely on a separate manual reseed as an activation barrier.
- Compare canonical file content with the active `prompt/<profile>` content/hash and origin, then verify the hash actually resolved by the intended runtime. The loader's pointer cache can retain a previous hash for up to 30 seconds; a version label or immediate pointer check alone is insufficient.
- For an authorized live job, verify its recorded prompt hash and source revision before interpreting the output. For isolated comparisons, pin prompt bytes in the harness instead of reading the mutable active database.
- Only interpret jobs created after activation — see [Live_Validation_Hygiene.md](Live_Validation_Hygiene.md).

## Known pending (2026-06)

The June record listed search Serper→P1 (`362a9312`, a `configs` change) and output-token brevity (`871cbf24`, a `prompts` change) as pending production reseeding, tracked in [Backlog §Cost optimization](../../STATUS/Backlog.md). Their current active state was not checked for this documentation correction; verify it using the origin-sensitive rules above.
