---
title: Internal Agent Knowledge Query Layer - CLI-First v1 Implementation Spec
date: 2026-04-22
authors: GitHub Copilot (GPT-5.4)
status: Draft for implementation review
scope: Local-only developer workflow knowledge layer for FactHarbor with shared query core and CLI-first rollout
requires: Captain approval, Lead Developer implementation review
related:
  - Docs/WIP/2026-04-16_Agent_Indexing_System_Design.md
  - Docs/ARCHIVE/Agent_Knowledge_Restructuring_2026-02-24.md
  - Docs/ARCHIVE/Agent_Outputs_2026-03.md
  - Docs/AGENTS/Handoffs/2026-04-19_Code_Reviewer_Indexing_Improvement_Options_Debate.md
  - Docs/AGENTS/Handoffs/2026-04-19_Code_Reviewer_Indexing_Recommendation_Accuracy_Review.md
  - scripts/build-index.mjs
  - package.json
---

# Internal Agent Knowledge Query Layer - CLI-First v1 Implementation Spec

## 1. Purpose

This document refines the earlier indexing Phase 2 idea into an implementation-ready CLI-first v1 for a local internal developer workflow knowledge layer.

The goal is narrow:

- give Claude Code, Cursor, Cline, Codex, and VS Code Copilot one consistent CLI-first way to retrieve FactHarbor working context
- reduce multi-file discovery overhead for handoffs, stage ownership, role context, and model-tier lookup
- keep the system local-only and thin over existing sources of truth
- move toward a gitignored local serving cache without deleting the current committed index artifacts in v1

This document is intentionally not a product-facing MCP design. It must not become a parallel way to submit analyses, mutate reports, or bypass the existing job lifecycle.

## 2. Closed decisions

The following items are settled for v1 and should be treated as implementation constraints, not open questions:

1. v1 is for internal developer workflow only. It is not a public or partner-facing FactHarbor integration surface.
2. v1 ships one shared query core and one adapter over that core: CLI.
3. An MCP adapter is explicitly deferred until CLI usage validates that the added integration surface is worth it.
4. The v1 surface is limited to knowledge retrieval plus safe local cache operations.
5. v1 tool scope includes: task preflight, handoff search, stage lookup, model-task lookup, role context, targeted doc-section retrieval, bootstrap, refresh, and health check.
6. v1 does not include job submission, report mutation, config writes, database writes, build orchestration, test orchestration, or a general shell surface.
7. v1 remains a thin layer over existing sources of truth in the repo. It must not introduce a second authoritative knowledge store.
8. A gitignored local cache is the primary serving substrate in v1.
9. The current committed generated index artifacts remain rollout-time compatibility, bootstrap inputs, and the default v1 query substrate for handoff, stage, and model lookups.
10. The implementation lives outside `apps/` in a new shared package plus thin script entry points.
11. v1 uses plain Node ESM modules and does not require a separate build step.
12. v1 is local-only. No hosted service, background daemon, or remote multi-user mode is introduced.
13. v1 ships without telemetry by default. Optional local-only usage logging may be added later behind an explicit opt-in flag.
14. Protocol-complete handoff publication is deferred from v1.
15. BM25, embeddings, and broader retrieval sophistication remain deferred.

## 3. Working terminology

- `shared query core` = the only logic-bearing layer. CLI uses it in v1; future adapters may use it later.
- `knowledge cache` = the gitignored local materialized data used to answer queries quickly.
- `compatibility indexes` = the current committed generated artifacts in `Docs/AGENTS/index/`.
- `hot window` = the recent recency overlay from `Docs/AGENTS/Agent_Outputs.md`.
- `safe action` = a local action allowed in v1 because it only affects the local cache. It does not touch jobs, reports, configs, databases, or repo documentation files.
- `authoritative source` = the repo file that owns a fact. The MCP never becomes that owner.

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

### 4.2 Explicitly out of scope

- product-facing fact-checking MCP tools
- `/v1/analyze`, job creation, job mutation, or report mutation
- config writes or UCM writes
- SQLite writes or admin actions
- generalized repo search over arbitrary source code
- code generation or patch application through the MCP
- background watchers or always-on sync services
- replacing grep/search as the general source-code lookup mechanism
- protocol-complete handoff publication or any other repo-doc write path

The existing rule remains: handoff history and stage metadata can help route code discovery, but source code location still uses normal code search once the owning file is known.

## 5. V1 CLI surface

V1 ships one command surface only: the CLI. MCP tool names are deliberately not frozen in this document because the adapter is deferred.

| Capability | CLI command | Writes? | Notes |
|---|---|---|---|
| Task preflight | `fh-knowledge preflight-task` | No | Highest-value entry point; returns the smallest useful starting bundle |
| Handoff retrieval | `fh-knowledge search-handoffs` | No | Uses topics, roles, dates, touched paths, and summary signals |
| Stage lookup | `fh-knowledge lookup-stage` | No | Returns owning file and exported functions |
| Model-task lookup | `fh-knowledge lookup-model-task` | No | Returns tier and resolved model IDs |
| Role context | `fh-knowledge get-role-context` | No | Returns role brief, key docs, and learnings |
| Targeted doc read | `fh-knowledge get-doc-section` | No | Reads only allowlisted docs/sections |
| Bootstrap cache | `fh-knowledge bootstrap` | Cache only | Initial clean-clone setup |
| Refresh cache | `fh-knowledge refresh` | Cache only | Forced or conditional rebuild |
| Cache health | `fh-knowledge health` | No | Reports freshness, gaps, and fallback state |

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
3. If the cache is missing or stale, the adapter returns a clear warning and offers refresh.
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
- queries may still proceed on stale cache, but the staleness warning must remain visible in the response

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

scripts/
  fh-knowledge.mjs
```

Placement rules:

- the package owns all reusable logic
- `scripts/` owns only the thin executable wrappers
- `scripts/build-index.mjs` remains in place for the current committed artifact pipeline
- v1 does not move knowledge logic into `apps/api` or `apps/web`

## 9. Adapter behavior

### 9.1 CLI

The CLI is not a backup-only escape hatch. It is a first-class adapter required for cross-tool parity.

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

### 9.2 Deferred MCP follow-up

An MCP adapter is intentionally not a v1 deliverable.

If later CLI usage validates the need, the MCP adapter should remain a thin adapter over the same shared query core and should not own business logic.

Expected follow-up constraints:

- use `@modelcontextprotocol/sdk`
- stdio transport
- local-only process launched by the client configuration

The MCP adapter must not be introduced just because the protocol exists. The trigger should be validated usage need, not design symmetry.

### 9.3 Deferred handoff publication follow-up

Protocol-complete handoff publication is intentionally not part of v1.

If later added, it should be treated as a separate write-surface phase over the same shared core and should follow the publication and archival rules in `Docs/AGENTS/Policies/Handoff_Protocol.md`.

The earlier `publish_handoff` design work remains useful reference material, but it is no longer a v1 acceptance requirement.

## 10. Implementation sequence

### Phase A - shared core and cache

- create `packages/fh-agent-knowledge/`
- implement source readers, cache builder, freshness checks, and the six read-only query operations
- keep current committed indexes untouched

### Phase B - CLI

- add `scripts/fh-knowledge.mjs`
- expose all v1 commands
- validate that a clean clone can bootstrap locally

### Phase C - rollout review

- confirm that the CLI answers the high-value knowledge lookups cleanly
- confirm that stale-cache warnings are surfaced correctly
- confirm that wrapper/skill guidance can point to one concrete CLI path

### Phase D - deferred follow-up

- optional MCP adapter over the same shared query core
- any repo-write surface such as protocol-complete handoff publication
- only then decide whether any committed generated artifacts should later move out of git

## 11. Acceptance checklist

V1 is acceptable when all of the following are true:

- a clean local clone can run `bootstrap_knowledge` successfully
- `preflight_task` can surface the indexing/query-layer design anchors without broad file scanning
- `search_handoffs` can retrieve relevant April 16-19 indexing handoffs
- `lookup_stage` and `lookup_model_task` resolve against the current analyzer and model-tier data
- `check_knowledge_health` detects missing cache and stale cache cleanly
- no v1 tool can mutate jobs, reports, configs, databases, or repo documentation files

## 12. Deferred items

The following are intentionally postponed beyond v1:

- product-facing MCP tools over the async job API
- MCP adapter delivery itself
- job/report/config/database mutation surfaces
- protocol-complete handoff publication
- BM25 or embedding-backed ranking
- background refresh daemons or watchers
- automatic removal of committed generated index artifacts
- usage telemetry by default
- broader source-code semantic search through the MCP
- any repo-doc write helper

## 13. Implementation note

This spec refines rather than replaces [Docs/WIP/2026-04-16_Agent_Indexing_System_Design.md](2026-04-16_Agent_Indexing_System_Design.md).

The April 16 design correctly identified the missing capability: a query surface that makes the index the easiest path. The adjustment in this v1 spec is now narrower still and follows the later debate result:

- ship the shared query core and CLI first
- use a gitignored local cache as the primary serving layer
- keep the current committed generated indexes as rollout-time compatibility inputs and the default v1 query substrate where that makes implementation materially simpler
- defer MCP until CLI usage validates the added integration surface
- defer protocol-complete handoff publication until a later write-surface phase
- keep the scope strictly on internal developer knowledge retrieval and cache operations
