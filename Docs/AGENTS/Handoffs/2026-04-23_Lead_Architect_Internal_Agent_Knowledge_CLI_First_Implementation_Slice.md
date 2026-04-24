---
roles: [Lead Architect]
topics: [mcp, agent, knowledge, cli, cache, preflight, retrieval]
files_touched:
  - package.json
  - scripts/fh-knowledge.mjs
  - packages/fh-agent-knowledge/package.json
  - packages/fh-agent-knowledge/bin/fh-knowledge.mjs
  - packages/fh-agent-knowledge/src/index.mjs
  - packages/fh-agent-knowledge/src/adapters/cli.mjs
  - packages/fh-agent-knowledge/src/actions/bootstrap-knowledge.mjs
  - packages/fh-agent-knowledge/src/actions/refresh-knowledge.mjs
  - packages/fh-agent-knowledge/src/actions/check-knowledge-health.mjs
  - packages/fh-agent-knowledge/src/cache/build-cache.mjs
  - packages/fh-agent-knowledge/src/cache/freshness.mjs
  - packages/fh-agent-knowledge/src/cache/manifest.mjs
  - packages/fh-agent-knowledge/src/contracts/results.mjs
  - packages/fh-agent-knowledge/src/query/get-doc-section.mjs
  - packages/fh-agent-knowledge/src/query/get-role-context.mjs
  - packages/fh-agent-knowledge/src/query/lookup-model-task.mjs
  - packages/fh-agent-knowledge/src/query/lookup-stage.mjs
  - packages/fh-agent-knowledge/src/query/preflight-task.mjs
  - packages/fh-agent-knowledge/src/query/search-handoffs.mjs
  - packages/fh-agent-knowledge/src/sources/agent-outputs.mjs
  - packages/fh-agent-knowledge/src/sources/docs.mjs
  - packages/fh-agent-knowledge/src/sources/handoffs.mjs
  - packages/fh-agent-knowledge/src/sources/indexes.mjs
  - packages/fh-agent-knowledge/src/sources/model-tiering.mjs
  - packages/fh-agent-knowledge/src/sources/roles.mjs
  - packages/fh-agent-knowledge/src/sources/stages.mjs
  - packages/fh-agent-knowledge/src/utils/args.mjs
  - packages/fh-agent-knowledge/src/utils/fs.mjs
  - packages/fh-agent-knowledge/src/utils/paths.mjs
  - packages/fh-agent-knowledge/src/utils/scoring.mjs
  - packages/fh-agent-knowledge/src/utils/sections.mjs
  - packages/fh-agent-knowledge/test/query-behavior.test.mjs
---

# Internal Agent Knowledge CLI-First Implementation Slice

## Task

Implement the next working slice of the internal agent knowledge layer from the CLI-first v1 spec: create the shared local package, expose a usable CLI surface, materialize the cache, and tighten the retrieval behavior that initially hid the MCP thread when a role was supplied.

## Files touched

- `package.json`
- `scripts/fh-knowledge.mjs`
- `packages/fh-agent-knowledge/package.json`
- `packages/fh-agent-knowledge/bin/fh-knowledge.mjs`
- `packages/fh-agent-knowledge/src/index.mjs`
- `packages/fh-agent-knowledge/src/adapters/cli.mjs`
- `packages/fh-agent-knowledge/src/actions/bootstrap-knowledge.mjs`
- `packages/fh-agent-knowledge/src/actions/refresh-knowledge.mjs`
- `packages/fh-agent-knowledge/src/actions/check-knowledge-health.mjs`
- `packages/fh-agent-knowledge/src/cache/build-cache.mjs`
- `packages/fh-agent-knowledge/src/cache/freshness.mjs`
- `packages/fh-agent-knowledge/src/cache/manifest.mjs`
- `packages/fh-agent-knowledge/src/contracts/results.mjs`
- `packages/fh-agent-knowledge/src/query/get-doc-section.mjs`
- `packages/fh-agent-knowledge/src/query/get-role-context.mjs`
- `packages/fh-agent-knowledge/src/query/lookup-model-task.mjs`
- `packages/fh-agent-knowledge/src/query/lookup-stage.mjs`
- `packages/fh-agent-knowledge/src/query/preflight-task.mjs`
- `packages/fh-agent-knowledge/src/query/search-handoffs.mjs`
- `packages/fh-agent-knowledge/src/sources/agent-outputs.mjs`
- `packages/fh-agent-knowledge/src/sources/docs.mjs`
- `packages/fh-agent-knowledge/src/sources/handoffs.mjs`
- `packages/fh-agent-knowledge/src/sources/indexes.mjs`
- `packages/fh-agent-knowledge/src/sources/model-tiering.mjs`
- `packages/fh-agent-knowledge/src/sources/roles.mjs`
- `packages/fh-agent-knowledge/src/sources/stages.mjs`
- `packages/fh-agent-knowledge/src/utils/args.mjs`
- `packages/fh-agent-knowledge/src/utils/fs.mjs`
- `packages/fh-agent-knowledge/src/utils/paths.mjs`
- `packages/fh-agent-knowledge/src/utils/scoring.mjs`
- `packages/fh-agent-knowledge/src/utils/sections.mjs`
- `packages/fh-agent-knowledge/test/query-behavior.test.mjs`

## Key decisions

- Added a new shared package at `packages/fh-agent-knowledge/` with plain Node ESM modules and no build step, matching the spec’s placement and packaging rules.
- Implemented the v1 CLI read surface plus safe cache actions: `preflight-task`, `search-handoffs`, `lookup-stage`, `lookup-model-task`, `get-role-context`, `get-doc-section`, `bootstrap`, `refresh`, and `health`.
- Materialized the local cache under `/.cache/fh-agent-knowledge/` with manifest freshness checks over repo HEAD, authoritative-source fingerprints, and compatibility-index timestamps.
- Exposed the CLI both as `npm run fh-knowledge -- ...` from the repo root and as a workspace bin (`npm exec --workspace @factharbor/fh-agent-knowledge fh-knowledge -- ...`).
- Tightened retrieval behavior after smoke testing: `preflight-task` no longer hard-filters handoffs by active role, `search-handoffs` resolves role aliases through the parsed role table, and search results now include lightweight field-level reasons.
- Filtered `preflight-task` doc anchors to skip utility sources already represented elsewhere in the bundle (`Agent_Outputs.md`, `Role_Learnings.md`, role files), so the returned docs are closer to the intended policy/design anchors.

## Verification

- `npm run test:knowledge`
- `npm run fh-knowledge -- refresh --force`
- `npm run fh-knowledge -- health`
- `npm run fh-knowledge -- preflight-task --task "Continue the internal knowledge layer MCP implementation" --role "Senior Architect"`
- `npm exec --workspace @factharbor/fh-agent-knowledge fh-knowledge -- help`
- `npm -w apps/web run build`

## Open items

- The MCP adapter remains deferred by the active spec. If Captain explicitly reopens it, keep it as a thin adapter over this shared query core.
- Retrieval ranking is still lexical/token-overlap based. It is now usable for the MCP thread, but broader ranking sophistication is still deferred.
- There is no wrapper/skill/documentation pass yet telling other agents to prefer `fh-knowledge` as the first discovery path.
- `npm test` still has unrelated pre-existing failures in `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` (`Stage 2: fetchSources should skip already-fetched URLs`, `Stage 2: runResearchIteration should run full iteration pipeline...`). This implementation did not touch `apps/web/src/lib/analyzer/`.

## Warnings

- The cache is intentionally local and thin. Any repo changes to handoffs, `Agent_Outputs.md`, or the compatibility indexes require `refresh` before stale warnings disappear.
- `search-handoffs --role ...` is intentionally a real role filter. For task preflight, role is now context only; do not reintroduce role-hard-filtering there unless the product intent changes.
- The current workspace is dirty in many unrelated areas. Do not interpret a clean `apps/web` build as proof that the entire repo is otherwise stable.

## For next agent

The CLI-first knowledge layer is now operational. Start from `packages/fh-agent-knowledge/` and `scripts/fh-knowledge.mjs`, not from a fresh design doc. The highest-value next step is adoption: wire agent guidance / skills / docs to call `fh-knowledge preflight-task` and related commands as the default startup path. If Captain later asks for MCP anyway, keep it thin and adapter-only over this package; do not move logic into the adapter.

## Learnings

- Role context and handoff retrieval are not the same thing. `preflight-task` becomes misleading if it uses the active role as a hard filter instead of as a context overlay.
- Alias handling must use the authoritative parsed role table. Normalized-string equality is not sufficient for mappings like `Senior Architect` → `Lead Architect`.
