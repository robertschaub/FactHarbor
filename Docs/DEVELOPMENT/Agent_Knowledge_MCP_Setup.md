# Agent knowledge tools

`fh-agent-knowledge` provides local CLI and stdio MCP lookups for development agents. Use it when indexed navigation helps the task; routine edits do not require preflight. Current source and applicable instructions remain authoritative.

## Search scope

The tool reads selected files and generated indexes from its own checkout: agent roles and skills, selected Markdown sections, public task records, and stage/model-task indexes. Markdown section discovery is limited to tracked files; role and skill discovery can include local files in their configured directories. A file's location does not authorize its disclosure. The tool does not search every repository file or other repositories.

For other task-authorized records, resolve their discovery through the task or a verified adopted workspace profile under [root documentation guidance](../../AGENTS.md#documentation-sources). Empty public handoff results mean no matching records in this index; they do not establish that prior work is absent or an investigation is closed. Never copy another collection into a public index to fill that gap.

| Tools | Use |
|---|---|
| `lookup_stage`, `lookup_model_task` | Navigation to analyzer stages and model-task definitions; verify exact implementation with source search |
| `get_role_context`, `get_doc_section` | Read a role brief or an allowlisted documentation section |
| `search_handoffs` | Search the handoffs indexed in this checkout |
| `preflight_task` | Optionally combine relevant public references and advisory startup suggestions |
| `check_knowledge_health` | Inspect the serving checkout, cache freshness and coverage without writing |
| `bootstrap_knowledge`, `refresh_knowledge` | Explicit cache writes for an authorized writer; never a required read-only startup step |

## Use from the repository

Read-only CLI examples:

```powershell
node scripts/fh-knowledge.mjs health
node scripts/fh-knowledge.mjs preflight-task --task "<current task>"
```

Pass `--role` or `--skill` when explicitly assigned or selected for the task. Preflight also recognizes leading `As <Role>,` and `Skill:` directives, but inferred matches are suggestions, not role activation, permission or proof that a workflow fits. Read applicable root/nested instructions and the relevant skill before acting.

The equivalent MCP tools use underscore names, for example `preflight_task` with a `task` argument. CLI and MCP share the same operations and result format. `npm run fh-knowledge -- <command>` remains an alternative CLI entry point.

## Connect an MCP client

The server uses stdio. Configure the client's executable as the appropriate Node runtime and its argument as the absolute path to `scripts/fh-knowledge-mcp.mjs` in the intended checkout. Use the client's supported local configuration; this guide does not install or enable a server automatically.

The same entry point supports Codex, Claude Code, Gemini and other stdio MCP clients. Tool visibility and permissions depend on the active client configuration. A read-only client can expose the query tools without exposing bootstrap or refresh.

For a task worktree, use that worktree's entry point. Changing only the process working directory does not retarget a server loaded from another checkout. After updating the server code or changing its binding, restart the MCP connection or use a fresh client session, then call `check_knowledge_health` and verify `binding.repoRoot` and `binding.repoHead`.

## Cache and freshness

The default cache is `.cache/fh-agent-knowledge` inside the tool's checkout. `FH_AGENT_KNOWLEDGE_CACHE_DIR` can select an assigned disposable cache for checks. A cache bound to another checkout is refused; an older cache without checkout identity is ignored.

Queries use a fresh cache when available. For a missing or stale cache they read current repository sources in memory, without changing cache bytes or timestamps. Generated stage/handoff indexes are still navigation aids; source reads remain authoritative. If a governing source is unavailable, report the gap rather than reconstructing private history.

In health output, `builtAt` and `repoHead` describe the stored cache, or are null when no usable cache exists. `binding` identifies the tool checkout; `cacheSource` identifies whether results came from cache or repository sources, and `coverage` counts the sources actually served. `stale: true` can therefore accompany current source results while the on-disk cache remains stale.

An assigned writer may rebuild the intended cache explicitly:

```powershell
node scripts/fh-knowledge.mjs refresh
```

Use `--force` only when an otherwise fresh cache needs rebuilding. Do not refresh another task's cache or a frozen recovery checkout as a startup step. These commands grant no service, configuration, deployment, model-call or provider-spending authority.
