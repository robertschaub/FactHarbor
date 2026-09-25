# Tool Strengths Reference

> Externalized from `AGENTS.md`. For tier-level model guidance (capability per model class), see `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` §6 Model-Class Guidelines. This file covers **tool** strengths (Claude Code, Cursor, Codex CLI, Cline, Copilot, etc.) rather than model tiers.

| Task Type | Best Tool | Model Tier | Why |
|-----------|-----------|------------|-----|
| Complex architecture, multi-step reasoning | Claude Code | High | Deep reasoning, plan mode, autonomous tool use |
| Standard implementation, bug fixes | Claude Code / Cursor | Mid | Balanced cost/capability, good for structured work |
| Fast iteration, parallel tasks | Codex CLI | Mid | Cloud sandbox, reads AGENTS.md natively |
| Autonomous multi-step workflows | Cline | Mid or Lightweight | Runs commands autonomously, good for bulk operations |
| Inline code completions | GitHub Copilot | (built-in) | Fast, context-aware, low overhead |
| Multi-file refactors with preview | Cursor Composer | Mid | Visual diff, multi-file edits |
| Documentation + diagrams | Any agent with TECH_WRITER role | Mid | See Roles/Technical_Writer.md |
| Deep investigation, consolidation | Claude Code | High | Best for reading large context, synthesizing findings |
| .NET API work | Any agent | Any | Read apps/api/AGENTS.md first |
| xWiki documentation | Any agent | Any | Read Docs/AGENTS/AGENTS_xWiki.md first |

## Calling Claude Code from Codex

Use the model the user explicitly selected for the current task. If the request does not specify a Claude model, ask before invoking it. **There is no default Claude model, including Fable 5.x.** A previous task's selection, a capability-tier recommendation above or the CLI's configured default is not a selection for this task. Keep an existing task selection unless the user changes it; ask before substituting another model if the requested model is unavailable or out of quota.

The established review route is a local Claude Code CLI process using subscription authentication, with a supplied review packet. It does not require a Codex-to-Claude connector or FactHarbor's provider API key.

1. Locate the installed executable (`Get-Command claude` on Windows; a common native-install location is `%USERPROFILE%\.local\bin\claude.exe`). Check its `--help` for the flags below. Do not install or update it as a side effect.
2. Copy the environment for the child process only. Remove inherited `ANTHROPIC_*`, `CLAUDE_CODE_OAUTH_TOKEN*`, `CLAUDE_CODE_USE_BEDROCK*`, `CLAUDE_CODE_USE_VERTEX*`, `CLAUDE_CODE_USE_FOUNDRY*`, `CLAUDE_MODEL` and `CLAUDECODE` overrides. Leave global environment and credential stores unchanged. Run `auth status --json` with that same child environment and working directory; require `loggedIn: true` and `authMethod: "claude.ai"` for this subscription route. Verify the account against the user's selection; an open Claude desktop window does not establish the CLI account. Keep account details in local evidence, not public documentation. A mismatch needs resolution before a model call; do not fall back to API credentials.
3. For a tool-free review, use a fresh temporary directory outside the checkout and a fresh session. Spawn the executable through Node `child_process.spawn` with an argument array (preserving the empty `--tools` argument on Windows):

   ```js
   const args = [
     '--safe-mode', '--tools', '', '--strict-mcp-config',
     '--disable-slash-commands', '--no-chrome',
     '--model', userSelectedModel, '--effort', reviewEffort,
     '--session-id', freshUuid,
     '--system-prompt', 'Review only the supplied packet. You have no execution or spending authority. Distinguish inspected evidence from attributed claims.',
     '--print', '--output-format', 'json'
   ];
   // spawn(executable, args, { cwd: temporaryDirectory, env: childEnv,
   //   windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
   // Send the packet through stdin; drain and save stdout and stderr.
   ```

   `userSelectedModel` has no fallback value. Honor requested effort; otherwise choose and record a supported effort appropriate to the review. High effort was used in the previous deep reviews, but it is not a model-selection rule. Do not add `--fallback-model`, permission bypasses or tools. `--bare` is not a substitute: the locally inspected client disables subscription OAuth in that mode. Recheck behavior after CLI changes; safe mode alone does not remove built-in tools, and managed policy still applies.
4. Allow a long-lived invocation (at least a 15-minute process budget for a deep review) and poll for progress instead of imposing a short shell timeout. Save the supplied packet, its hash, requested model/effort, session ID, stdout JSON and stderr in the task's local evidence directory. Do not log secrets.
5. Require a successful process result and `is_error: false`; inspect `modelUsage` to confirm the actual model matches the requested model or the explicitly selected alias. Preserve discrepancies as failures, not successful reviews. The `result` field contains the review text. Cost fields are estimates, not proof of invoice charges; keep this subscription review separate from FactHarbor's paid API experiment ledger. Do not infer extra-usage billing settings from login status.

This profile reviews only the supplied packet. It cannot independently inspect the checkout, recompute file hashes or execute tests. Describe its findings accordingly. A review needing repository tools requires a separately scoped invocation with verified controls. None of these instructions grants authority to send private material, run paid analyses or implement the review's recommendations.
