# FactHarbor Agent Knowledge MCP Setup

This guide covers rollout of the local `fh-agent-knowledge` MCP server after implementation.

The server is local-only, uses stdio, and exposes the internal knowledge tools for task startup:

- `preflight_task`
- `search_handoffs`
- `lookup_stage`
- `lookup_model_task`
- `get_role_context`
- `get_doc_section`
- `bootstrap_knowledge`
- `refresh_knowledge`
- `check_knowledge_health`

The executable entrypoint is:

```powershell
node scripts/fh-knowledge-mcp.mjs
```

## Recommended Startup Pattern

When the client supports MCP and the `fhAgentKnowledge` server is configured, the first knowledge action for a non-trivial task should be:

- call `preflight_task` with the current task description
- include `role` when the user activated one
- only fall back to manual handoff scanning if the returned anchors are insufficient

Example request shape:

```json
{
  "task": "Continue the internal knowledge layer MCP rollout",
  "role": "Lead Architect"
}
```

If MCP is not configured in the active client, use the CLI fallback:

```powershell
npm run fh-knowledge -- preflight-task --task "Continue the internal knowledge layer MCP rollout" --role "Lead Architect"
```

## Project-Scoped Configs Committed In This Repo

The repo now includes committed project-scoped MCP configs for clients that support stable workspace-root path interpolation:

- Cursor: [.cursor/mcp.json](../../.cursor/mcp.json)
- VS Code / Copilot Chat: [.vscode/mcp.json](../../.vscode/mcp.json)

These configs point at:

```text
${workspaceFolder}/scripts/fh-knowledge-mcp.mjs
```

## Claude Code

Claude Code supports project-scoped `.mcp.json`, but its docs note that relative command and argument paths resolve from the directory Claude is launched from, not from the `.mcp.json` file location. Because of that, this repo does not commit an always-on `.mcp.json`.

Recommended options:

1. Use a local or user-scoped config with an absolute path.
2. If you prefer project scope, use an environment variable for the repo root and expand it in `.mcp.json`.

### Windows local-scope example

From PowerShell:

```powershell
$repo = (Resolve-Path .).Path
claude mcp add-json fhAgentKnowledge ("{`"type`":`"stdio`",`"command`":`"cmd`",`"args`":[`"/c`",`"node`",`"$repo\\scripts\\fh-knowledge-mcp.mjs`"],`"env`":{}}") --scope local
```

After setup, ask Claude Code to use `preflight_task` first.

## Gemini CLI

Gemini CLI stores MCP configurations in its workspace `.gemini/settings.json`.

You can automatically add the project-scoped configuration by running this command from the root of the project:

```powershell
gemini mcp add fhAgentKnowledge node scripts/fh-knowledge-mcp.mjs
```

After adding, you can verify it in the CLI with `/mcp list`. The CLI will automatically use it for tool calls.

## Cursor

Project-scoped config is already committed at [.cursor/mcp.json](../../.cursor/mcp.json).

After opening the repo in Cursor:

1. Check the MCP server list.
2. Approve `fhAgentKnowledge` if prompted.
3. Start tasks by asking Cursor to call `preflight_task` before manual scanning.

Cursor CLI shares the same MCP config, so `cursor-agent` can use the same server.

## VS Code / GitHub Copilot Chat

Project-scoped config is already committed at [.vscode/mcp.json](../../.vscode/mcp.json).

After opening the repo in VS Code:

1. Use the MCP commands or chat UI to verify that `fhAgentKnowledge` is present.
2. Start tasks by asking Copilot Chat to use `preflight_task`.

## GitHub Copilot CLI

Copilot CLI uses `~/.copilot/mcp-config.json`, not the workspace `.vscode/mcp.json`.

Manual config example:

```json
{
  "mcpServers": {
    "fhAgentKnowledge": {
      "type": "local",
      "command": "node",
      "args": ["C:\\DEV\\FactHarbor\\scripts\\fh-knowledge-mcp.mjs"],
      "env": {},
      "tools": ["*"]
    }
  }
}
```

Use your actual local repo path in `args`.

## Cline

Cline CLI stores MCP config in `~/.cline/data/settings/cline_mcp_settings.json` and uses the same JSON shape as the extension/VS Code flow, plus optional fields like `alwaysAllow`.

Manual config example:

```json
{
  "mcpServers": {
    "fhAgentKnowledge": {
      "command": "node",
      "args": ["C:\\DEV\\FactHarbor\\scripts\\fh-knowledge-mcp.mjs"],
      "env": {},
      "disabled": false
    }
  }
}
```

Use your actual local repo path in `args`.

## Verification

CLI health:

```powershell
npm run fh-knowledge -- health
```

If you need to force-refresh the local cache before testing:

```powershell
npm run fh-knowledge -- refresh --force
```

If the MCP server appears connected but tools seem stale, reset the client’s cached tool list or restart the MCP server in that client.

## Notes

- The MCP server is intentionally read-only except for local cache bootstrap and refresh.
- Project-scoped configs were committed only where path handling is stable enough for a shared repo file.
- For Claude Code, Cline, and Copilot CLI, machine-local absolute paths remain the most reliable rollout path on Windows.
