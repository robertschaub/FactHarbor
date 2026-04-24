---
roles: [Lead Architect]
topics: [mcp, agent, knowledge, cli, cache, review, windows]
files_touched:
  - packages/fh-agent-knowledge/src/cache/build-cache.mjs
  - packages/fh-agent-knowledge/src/cache/manifest.mjs
  - packages/fh-agent-knowledge/src/utils/fs.mjs
  - packages/fh-agent-knowledge/src/actions/check-knowledge-health.mjs
  - packages/fh-agent-knowledge/src/actions/refresh-knowledge.mjs
  - packages/fh-agent-knowledge/src/adapters/cli.mjs
  - packages/fh-agent-knowledge/test/cache-and-fs.test.mjs
  - Docs/AGENTS/Handoffs/2026-04-23_Lead_Architect_Internal_Agent_Knowledge_Review_Fixes.md
  - Docs/AGENTS/Agent_Outputs.md
---

# Internal Agent Knowledge Review Fixes

## Task

Address the three issues raised in the Senior Architect review of `@factharbor/fh-agent-knowledge v0.1.0`: stale-cache serving, Windows cache-file overwrite behavior, and missing-file crashes during manifest snapshotting.

## Files touched

- `packages/fh-agent-knowledge/src/cache/build-cache.mjs`
- `packages/fh-agent-knowledge/src/cache/manifest.mjs`
- `packages/fh-agent-knowledge/src/utils/fs.mjs`
- `packages/fh-agent-knowledge/src/actions/check-knowledge-health.mjs`
- `packages/fh-agent-knowledge/src/actions/refresh-knowledge.mjs`
- `packages/fh-agent-knowledge/src/adapters/cli.mjs`
- `packages/fh-agent-knowledge/test/cache-and-fs.test.mjs`
- `Docs/AGENTS/Handoffs/2026-04-23_Lead_Architect_Internal_Agent_Knowledge_Review_Fixes.md`
- `Docs/AGENTS/Agent_Outputs.md`

## Key decisions

- Query callers now auto-refresh stale cache instead of silently serving it. `loadKnowledgeContext(..., refreshIfStale: true)` rebuilds stale cache and returns `cacheRefreshed: true` through the CLI surface.
- `health` and `refresh` intentionally do **not** auto-refresh during inspection. They continue to expose stale state directly so operators can distinguish “stale but fixable” from “already rebuilt.”
- Windows cache writes no longer rely on temp-file rename replacement semantics. `writeJsonAtomic` now uses direct overwrite on `win32` and keeps the temp-file cleanup swallow explicitly documented only for the POSIX fallback path.
- Manifest snapshotting now tolerates missing optional files (`Role_Learnings.md`, `model-tiering.ts`, and similar paths) by recording `null` mtimes instead of throwing `ENOENT`.

## Verification

- `npm run test:knowledge`
- `npm run fh-knowledge -- refresh --force`
- Forced stale-manifest probe: set cache `repoHead` to a sentinel, then ran `npm run fh-knowledge -- preflight-task --task "Continue the internal knowledge layer MCP implementation" --role "Senior Architect"` and confirmed `cacheRefreshed: true`
- `npm run fh-knowledge -- health`

## Open items

- Adoption wiring is still the next highest-value step: route startup guidance and skills through `fh-knowledge preflight-task`.
- The MCP adapter remains deferred. These fixes were intentionally kept in the shared package and CLI path only.
- Retrieval scoring is still lexical/token based. No ranking redesign was attempted in this review-fix pass.

## Warnings

- The stale-cache auto-refresh path currently rebuilds synchronously on the query call. That is fine for CLI usage, but if a future MCP adapter needs lower latency under repeated calls, it may want a small freshness memoization layer rather than repeated full snapshots.
- The cache tests touch the real repo-local `.cache/fh-agent-knowledge` directory and restore it afterward. That is acceptable for this package today, but if parallel package tests grow, a configurable cache root would make isolation cleaner.
- No unrelated `apps/web` test failures were investigated in this pass.

## For next agent

The review findings are addressed. Query commands now self-heal stale cache, Windows cache writes no longer depend on replace-atomic rename behavior, and first-run/feature-branch missing files no longer crash manifest reads. Treat the package as ready for adoption wiring unless Captain explicitly wants deeper ranking/test expansion before that.

## Learnings

- Freshness detection without a clear policy is not enough. If the caller contract is “startup context,” stale warnings alone are too weak; the shared layer should either self-heal or expose stale state in a way callers cannot miss.
- Windows filesystem behavior deserves a first-class path rather than a POSIX fallback assumption. Cache tooling that looks harmless on POSIX can become flaky once multiple local processes touch the same files.
