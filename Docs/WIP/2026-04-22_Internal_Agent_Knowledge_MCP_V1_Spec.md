---
title: Internal Agent Knowledge Query Layer - MCP + CLI v1 Implementation Spec
date: 2026-04-22
updated: 2026-04-24
authors: GitHub Copilot (GPT-5.4), Codex (GPT-5)
status: Active implementation spec
scope: Local-only developer workflow knowledge layer for FactHarbor with shared query core plus implemented CLI and MCP adapters, with rollout docs/configs landed and client adoption follow-through next
requires: Captain approval, Lead Developer implementation review
related:
  - Docs/WIP/2026-04-16_Agent_Indexing_System_Design.md
  - Docs/ARCHIVE/Agent_Knowledge_Restructuring_2026-02-24.md
  - Docs/ARCHIVE/Agent_Outputs_2026-03.md
  - Docs/AGENTS/Handoffs/2026-04-19_Code_Reviewer_Indexing_Improvement_Options_Debate.md
  - Docs/AGENTS/Handoffs/2026-04-19_Code_Reviewer_Indexing_Recommendation_Accuracy_Review.md
  - Docs/AGENTS/Handoffs/2026-04-23_Lead_Architect_Internal_Agent_Knowledge_CLI_First_Implementation_Slice.md
  - Docs/AGENTS/Handoffs/2026-04-23_Lead_Architect_Internal_Agent_Knowledge_Review_Fixes.md
  - scripts/build-index.mjs
  - package.json
---

# Internal Agent Knowledge Query Layer - MCP + CLI v1 Implementation Spec

## 1. Purpose

This document defines the current v1 shape of the internal FactHarbor knowledge layer for developer workflow support.

The goal is narrow:

- give Claude Code, Cursor, Cline, Codex, and VS Code Copilot one consistent way to retrieve FactHarbor working context through the same shared query core
- reduce multi-file discovery overhead for handoffs, stage ownership, role context, and model-tier lookup
- keep the system local-only and thin over existing sources of truth
- use a gitignored local cache without deleting the current committed index artifacts in v1

This document is intentionally not a product-facing MCP design. It must not become a parallel way to submit analyses, mutate reports, or bypass the existing job lifecycle.

> Status update - 2026-04-24:
> The earlier CLI-only deferral is now historical. The shared query core, CLI, and thin MCP adapter are all implemented in `packages/fh-agent-knowledge/`. Rollout setup documentation and committed project-scoped configs now exist for Cursor and VS Code/Copilot Chat. Broader client adoption and local client validation remain the active next slice.

## 2. Closed decisions

The following items are settled for v1 and should be treated as implementation constraints, not open questions:

1. v1 is for internal developer workflow only. It is not a public or partner-facing FactHarbor integration surface.
2. v1 ships one shared query core and two thin adapters over that core: CLI and MCP.
3. The shared query core, CLI, and thin MCP adapter are already implemented; rollout and adoption are the active next slice, not more server-side retrieval work.
4. The v1 surface is limited to knowledge retrieval plus safe local cache operations.
5. v1 tool scope includes the same read-only capability set across CLI and MCP: task preflight, handoff search, stage lookup, model-task lookup, role context, targeted doc-section retrieval, bootstrap, refresh, and health check.
6. v1 does not include job submission, report mutation, config writes, database writes, build orchestration, test orchestration, or a general shell surface.
7. v1 remains a thin layer over existing sources of truth in the repo. It must not introduce a second authoritative knowledge store.
8. A gitignored local cache is the primary serving substrate in v1.
9. The current committed generated index artifacts remain rollout-time compatibility, bootstrap inputs, and the default v1 query substrate for handoff, stage, and model lookups.
10. The implementation lives outside `apps/` in a shared package plus thin script entry points.
11. v1 uses plain Node ESM modules and does not require a separate build step.
12. v1 is local-only. No hosted service, background daemon, or remote multi-user mode is introduced.
13. v1 ships without telemetry by default. Optional local-only usage logging may be added later behind an explicit opt-in flag.
14. Protocol-complete handoff publication remains deferred from v1.
15. BM25, embeddings, and broader retrieval sophistication remain deferred.

## 3. Working terminology

- `shared query core` = the only logic-bearing layer. CLI uses it now; MCP must use the same layer rather than re-implement behavior.
- `knowledge cache` = the gitignored local materialized data used to answer queries quickly.
- `compatibility indexes` = the current committed generated artifacts in `Docs/AGENTS/index/`.
- `hot window` = the recent recency overlay from `Docs/AGENTS/Agent_Outputs.md`.
- `safe action` = a local action allowed in v1 because it only affects the local cache. It does not touch jobs, reports, configs, databases, or repo documentation files.
- `authoritative source` = the repo file that owns a fact. The knowledge layer never becomes that owner.

## 4. Scope and non-goals

### 4.1 In scope

- agent task preflight over known repo context
- historical handoff retrieval
- recent active-window context via `Agent_Outputs.md`
- pipeline stage ownership lookup
- model-tier lookup
- role brief and learning lookup
- targeted section retrieval from allowed docs
- local cache bootstrap and refresh
- health inspection for cache freshness and source coverage
- local cache management only
- thin MCP exposure of the same read-only capability set already supported by CLI

### 4.2 Explicitly out of scope

- product-facing fact-checking MCP tools
- `/v1/analyze`, job creation, job mutation, or report mutation
- config writes or UCM writes
- SQLite writes or admin actions
- generalized repo search over arbitrary source code
- code generation or patch application through the knowledge layer
- background watchers or always-on sync services
- replacing grep/search as the general source-code lookup mechanism
- protocol-complete handoff publication or any other repo-doc write path

The existing rule remains: handoff history and stage metadata can help route code discovery, but source code location still uses normal code search once the owning file is known.

## 5. V1 surface

V1 now has two aligned surfaces over the same shared query core:

- CLI is already implemented and available through `fh-knowledge` / `npm run fh-knowledge -- ...`
- MCP is now implemented over stdio and exposes the same capability set as CLI

| Capability | CLI command | MCP tool | Writes? | Status |
|---|---|---|---|---|
| Task preflight | `fh-knowledge preflight-task` | `preflight_task` | No | CLI and MCP implemented |
| Handoff retrieval | `fh-knowledge search-handoffs` | `search_handoffs` | No | CLI and MCP implemented |
| Stage lookup | `fh-knowledge lookup-stage` | `lookup_stage` | No | CLI and MCP implemented |
| Model-task lookup | `fh-knowledge lookup-model-task` | `lookup_model_task` | No | CLI and MCP implemented |
| Role context | `fh-knowledge get-role-context` | `get_role_context` | No | CLI and MCP implemented |
| Targeted doc read | `fh-knowledge get-doc-section` | `get_doc_section` | No | CLI and MCP implemented |
| Bootstrap cache | `fh-knowledge bootstrap` | `bootstrap_knowledge` | Cache only | CLI and MCP implemented |
| Refresh cache | `fh-knowledge refresh` | `refresh_knowledge` | Cache only | CLI and MCP implemented |
| Cache health | `fh-knowledge health` | `check_knowledge_health` | No | CLI and MCP implemented |

### 5.1 `preflight_task` contract

`preflight_task` exists because the highest-value workflow is not one lookup at a time. It should bundle the minimum useful startup context for a task.

Input:

- `task`: free-text task description
- `role` (optional)
- `limit` (optional)

Output:

- `recentContext`: 1-3 recent `Agent_Outputs` matches from the hot window
- `matchedHandoffs`: relevant handoff summaries with file links and reasons
- `stageAnchors`: likely owning analyzer files where applicable
- `roleContext`: active role brief if provided or inferred
- `docAnchors`: the smallest set of policy/design docs to read next
- `warnings`: stale cache or thin-match warnings

The tool should optimize for bounded startup context, not exhaustive search.

## 6. Authoritative inputs and serving model

### 6.1 Authoritative repo inputs

The query core should read from the following authoritative sources:

- `AGENTS.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/**/*.md`
- `Docs/AGENTS/Roles/*.md`
- `Docs/AGENTS/Role_Learnings.md`
- `Docs/AGENTS/Policies/**/*.md` when explicitly requested or referenced by preflight
- selected `Docs/WIP/*.md` files when explicitly requested or referenced by preflight
- `apps/web/src/lib/analyzer/*-stage.ts`
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
- `apps/web/src/lib/analyzer/model-tiering.ts`

### 6.2 Compatibility/bootstrap inputs during rollout

During v1 rollout, the query core should also consume the current committed generated artifacts:

- `Docs/AGENTS/index/handoff-index.json`
- `Docs/AGENTS/index/stage-map.json`
- `Docs/AGENTS/index/stage-manifest.json`

These remain rollout-time compatibility inputs, bootstrap accelerators, and the default low-cost query substrate for v1 lookups. They do not replace the upstream authoritative files listed in Section 6.1, and cache health must track both the generated artifacts and their upstream sources.

### 6.3 Serving model

1. `bootstrap_knowledge` builds a local cache from authoritative repo inputs and compatibility indexes.
2. Runtime queries serve from the local cache first.
3. If the cache is stale, query callers may auto-refresh before serving results; inspection endpoints should still be able to report stale state directly.
4. When the cache is missing, limited read-only fallback to compatibility indexes is allowed so the system can still answer narrow queries on a clean clone.
5. V1 has no repo write path through the query layer.

## 7. Local cache contract

The cache should live under a repo-local gitignored directory:

```text
.cache/
  fh-agent-knowledge/
    manifest.json
    handoffs.json
    recent-window.json
    roles.json
    doc-sections.json
    stage-map.json
    stage-manifest.json
```

`manifest.json` should contain at minimum:

```json
{
  "schemaVersion": 1,
  "builtAt": "2026-04-22T00:00:00.000Z",
  "repoHead": "<git sha or null>",
  "sources": {
    "agentsMtime": "...",
    "agentOutputsMtime": "...",
    "handoffsDigest": "...",
    "rolesDigest": "...",
    "roleLearningsMtime": "...",
    "policiesDigest": "...",
    "selectedWipDigest": "...",
    "stageSourceDigest": "...",
    "modelTieringMtime": "...",
    "handoffIndexGeneratedAt": "...",
    "stageMapGeneratedAt": "...",
    "stageManifestGeneratedAt": "..."
  }
}
```

Freshness in v1 should be intentionally simple:

- if `repoHead` changes, `check_knowledge_health` warns that refresh is recommended
- if any authoritative-source fingerprint above changes, `check_knowledge_health` warns that refresh is recommended
- if any compatibility-index `generatedAt` value moves past `builtAt`, `check_knowledge_health` warns that refresh is recommended
- query callers may auto-refresh stale cache before serving results; `health` should still surface stale state directly when asked to inspect

To keep v1 small, `handoffsDigest`, `rolesDigest`, `policiesDigest`, `selectedWipDigest`, and `stageSourceDigest` may be simple deterministic file-set digests rather than per-file records.

V1 does not need background invalidation, a file watcher, or automatic refresh.

## 8. Repo layout

Introduce a new top-level `packages/` directory and put the shared logic there. This is low-friction because the root workspace already declares `packages/*` in [package.json](../../package.json).

```text
packages/
  fh-agent-knowledge/
    package.json
    src/
      contracts/
        results.mjs
      sources/
        agent-outputs.mjs
        handoffs.mjs
        indexes.mjs
        stages.mjs
        model-tiering.mjs
        roles.mjs
        docs.mjs
      cache/
        manifest.mjs
        build-cache.mjs
        freshness.mjs
      query/
        preflight-task.mjs
        search-handoffs.mjs
        lookup-stage.mjs
        lookup-model-task.mjs
        get-role-context.mjs
        get-doc-section.mjs
      actions/
        bootstrap-knowledge.mjs
        refresh-knowledge.mjs
        check-knowledge-health.mjs
      adapters/
        cli.mjs
        mcp.mjs
    test/
      *.test.mjs

scripts/
  fh-knowledge.mjs
  fh-knowledge-mcp.mjs
```

Placement rules:

- the package owns all reusable logic
- `scripts/` owns only the thin executable wrappers
- `scripts/build-index.mjs` remains in place for the current committed artifact pipeline
- v1 does not move knowledge logic into `apps/api` or `apps/web`

## 9. Adapter behavior

### 9.1 CLI

The CLI is already implemented and remains a first-class adapter required for cross-tool parity.

Initial commands:

```text
fh-knowledge preflight-task --task "..." [--role ...] [--limit 5]
fh-knowledge search-handoffs --query "..." [--role ...] [--after YYYY-MM-DD]
fh-knowledge lookup-stage --name "..."
fh-knowledge lookup-model-task --task "..."
fh-knowledge get-role-context --role "..."
fh-knowledge get-doc-section --file "..." --section "..."
fh-knowledge bootstrap
fh-knowledge refresh [--force]
fh-knowledge health
```

### 9.2 MCP

The MCP adapter is now an active v1 deliverable and should remain a thin adapter over the same shared query core. It must not own business logic.

Constraints:

- use `@modelcontextprotocol/sdk`
- stdio transport
- local-only process launched by the client configuration
- expose the same read-only capability set listed in Section 5
- keep naming and behavior aligned with the shared query operations
- add parity checks so CLI and MCP stay behaviorally aligned

### 9.3 Deferred handoff publication follow-up

Protocol-complete handoff publication is intentionally not part of v1.

If later added, it should be treated as a separate write-surface phase over the same shared core and should follow the publication and archival rules in `Docs/AGENTS/Policies/Handoff_Protocol.md`.

The earlier `publish_handoff` design work remains useful reference material, but it is no longer a v1 acceptance requirement.

## 10. Implementation sequence

### Phase A - shared core and cache (completed)

- create `packages/fh-agent-knowledge/`
- implement source readers, cache builder, freshness checks, and the read-only query operations
- keep current committed indexes untouched

### Phase B - CLI (completed)

- add `scripts/fh-knowledge.mjs`
- expose all v1 commands
- validate that a clean clone can bootstrap locally

### Phase C - MCP adapter (completed)

- add `packages/fh-agent-knowledge/src/adapters/mcp.mjs`
- add `scripts/fh-knowledge-mcp.mjs`
- register the same read-only operations as MCP tools
- validate stdio startup and CLI/MCP parity for the same inputs

### Phase C execution checklist (frozen before coding)

The remaining architecture is already settled. This checklist exists only to freeze the implementation contract for the first MCP coding slice:

1. `v1` transport is `stdio` only.
2. `@modelcontextprotocol/sdk` must be declared directly in `packages/fh-agent-knowledge/package.json`, and the repo root should expose one concrete MCP launcher script.
3. MCP tool names are fixed exactly as listed in Section 5. Do not rename them during implementation.
4. MCP inputs and outputs should mirror the existing shared-core and CLI behavior as closely as possible, including `cacheRefreshed`, `warnings`, and structured failure responses.
5. The MCP adapter owns only tool registration, input validation, and dispatch. Query logic, cache logic, and freshness behavior stay in the shared package.
6. Completion requires parity tests for the MCP surface, not just a server that starts successfully.
7. Client wiring and example configuration come after parity is proven, not before.

### Phase D - rollout review and client wiring (in progress)

Completed:

- confirm that CLI and MCP both answer the high-value knowledge lookups cleanly
- confirm that stale-cache inspection vs. auto-refresh behavior is surfaced correctly
- add a central rollout/setup guide at `Docs/DEVELOPMENT/Agent_Knowledge_MCP_Setup.md`
- commit project-scoped MCP configs for Cursor and VS Code / Copilot Chat
- update tool-wrapper guidance to point agents to `preflight_task` first and the CLI fallback second

Remaining:

- validate local startup and discovery behavior across the supported MCP clients
- tighten any client-specific setup notes that still need machine-local absolute paths
- confirm wrapper/skill guidance can point to one concrete startup path per client

### Phase E - deferred follow-up

- any repo-write surface such as protocol-complete handoff publication
- only then decide whether any committed generated artifacts should later move out of git

## 11. Acceptance checklist

V1 is acceptable when all of the following are true:

- a clean local clone can run `bootstrap_knowledge` successfully
- CLI commands can serve the implemented knowledge lookups from the shared cache/query core
- MCP tools can expose the same read-only capabilities over stdio without re-implementing logic
- CLI and MCP parity checks pass for the same inputs
- `preflight_task` can surface the indexing/query-layer design anchors without broad file scanning
- `search_handoffs`, `lookup_stage`, and `lookup_model_task` resolve against the current repo state
- stale query calls auto-refresh cache where appropriate, while `check_knowledge_health` can still report stale state directly
- no v1 tool can mutate jobs, reports, configs, databases, or repo documentation files

## 12. Deferred items

The following are intentionally postponed beyond v1:

- product-facing MCP tools over the async job API
- job/report/config/database mutation surfaces
- protocol-complete handoff publication
- BM25 or embedding-backed ranking
- background refresh daemons or watchers
- automatic removal of committed generated index artifacts
- usage telemetry by default
- broader source-code semantic search through the knowledge layer
- any repo-doc write helper

## 13. Implementation note

This spec refines rather than replaces [Docs/WIP/2026-04-16_Agent_Indexing_System_Design.md](2026-04-16_Agent_Indexing_System_Design.md).

The April 16 design correctly identified the missing capability: a query surface that makes the index the easiest path. This spec originally recorded a later CLI-first deferral, but that deferral is now historical only. The current repo state and decision are:

- keep the shared query core as the only logic-bearing layer
- keep the implemented CLI surface
- keep the implemented MCP adapter thin over the same shared query core
- use a gitignored local cache as the primary serving layer
- keep the current committed generated indexes as rollout-time compatibility inputs and the default v1 query substrate where that makes implementation materially simpler
- defer protocol-complete handoff publication until a later write-surface phase
- keep the scope strictly on internal developer knowledge retrieval and cache operations
- treat client adoption and local client validation as the next step rather than more server-side retrieval work
