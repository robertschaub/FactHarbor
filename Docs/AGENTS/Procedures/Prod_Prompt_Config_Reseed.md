# Prod Prompt/Config Re-seed

Why a committed prompt/config `.md` change can be silently absent in production, and how to make it live.

## The gotcha

Prompt and UCM config **text** is served from the config DB at runtime (seeded from `apps/web/prompts/*.prompt.md` and `apps/web/configs/*.default.json`), not read from the files. A prod deploy does not refresh the live prod config DB:

- **Code** (Zod schemas, `maxOutputTokens`, analyzer logic) is compiled into the build → live on deploy.
- `postbuild` runs `reseed-all-prompts.ts --quiet`, but that seeds the **build-time** DB, not prod's **persistent** `config.db` (which holds admin edits + job snapshots and survives deploys).
- So a prompt/config `.md` change is **not live in prod until a re-seed runs against the prod DB, on the prod server** — even though its code half already shipped.

This is why a `.md`-only change can sit "pending" indefinitely after it was committed and deployed.

## Make it live (on the prod server, against the prod `config.db`)

- `npm -w apps/web run reseed` — both prompts and configs (normal mode)
- `npm -w apps/web run reseed:prompts` / `reseed:configs` — one type only
- **Admin-owned blobs:** a normal re-seed refreshes only **system-owned** default blobs and silently skips blobs edited via the admin UI. To overwrite those, force: `npx tsx scripts/reseed-all-prompts.ts --prompts --force` (or `run reseed:force` for all types).

## Verify

- Compare the active `prompt/<profile>` (or config) blob's content hash against the file, or inspect a job created **after** the re-seed for the intended change.
- Only interpret jobs created after activation — see [Live_Validation_Hygiene.md](Live_Validation_Hygiene.md).

## Known pending (2026-06)

Two committed `.md` changes await a prod re-seed (tracked in [Backlog §Cost optimization](../../STATUS/Backlog.md)): search Serper→P1 (`362a9312`, a `configs` change) and output-token brevity (`871cbf24`, a `prompts` change). One `npm -w apps/web run reseed` on prod clears both.
