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
| Markdown documentation | Any agent | Any | Read Docs/DEVELOPMENT/Documentation.md first |

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

## Calling Codex from Claude Code

Use the Codex model the user explicitly selected for the current task. If the request does not specify one, ask before invoking it. **There is no default Codex model, including `gpt-6-astra`.** The `model` value in `~/.codex/config.toml`, a previous task's selection or the capability table above is not a selection for this task. Keep an existing task selection unless the user changes it; ask before substituting another model when the requested one is rejected by the installed CLI, unavailable or outside the subscription's usage window. The logged-in ChatGPT account is part of the selection: the same machine holds different logins over time, so name the expected account when it matters.

The established route is a local `codex exec` process using the ChatGPT subscription login, with a supplied review packet. It does not use `OPENAI_API_KEY` or `scripts/agents/invoke-gpt.cjs`, which is the paid API route. [`scripts/agents/invoke-codex.cjs`](../../../scripts/agents/invoke-codex.cjs) implements the steps below: pass `--model <slug>`, `--effort <level>`, `--account <email>` and the packet on stdin or `--packet <file>`. `FH_INVOKE_CODEX_DRY_RUN=1` resolves the executable (it runs `--version` and `exec --help`, nothing else) and prints the plan.

1. Locate a current executable that supports the requested model and the flags below in `exec --help`. An explicit `FH_CODEX_BIN` must be usable or the run stops. Do not install or update Codex as a side effect.
2. Copy the environment for the child process only, remove inherited `OPENAI_*` and `CODEX_API_KEY` values and pin `CODEX_HOME` to one absolute path, so the subscription login is the only credential and preflight and execution read the same store. Leave the global environment and `auth.json` unchanged. Run `login status` with that environment and an explicit working directory; require exit code 0 and `Logged in using ChatGPT`. The account and plan exist only as claims in the local `auth.json` token: compare the email with the user's selection, keep it in local evidence, and treat it as a credential-file claim, not proof of current entitlement or billing settings. Missing identity evidence, a stored API key, another `auth_mode` or another account is a stop; do not fall back to the API key.
3. For a packet-only review, use a fresh empty temporary directory outside any checkout, `--skip-git-repo-check` and `--ephemeral`, and spawn with an argument array:

   ```js
   const args = [
     'exec', '--sandbox', 'read-only', '--ephemeral', '--color', 'never',
     '--skip-git-repo-check', '-C', temporaryDirectory,
     '--model', userSelectedModel, '--ignore-user-config', '--strict-config',
     '--disable', 'memories', '--disable', 'shell_tool', '--disable', 'unified_exec',
     '--disable', 'code_mode_host', '--disable', 'skill_search', '--disable', 'tool_suggest',
     '--disable', 'apps', '--disable', 'multi_agent',
     '-c', 'web_search="disabled"', '-c', `model_reasoning_effort="${reviewEffort}"`,
     '--output-last-message', lastMessagePath,
     '-'
   ];
   // spawn(executable, args, { cwd: temporaryDirectory, env: childEnv,
   //   windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
   // Send the packet through stdin, prefixed with the review-only instruction; drain and save stdout and stderr.
   ```

   `userSelectedModel` has no fallback value. `--ignore-user-config` skips `config.toml` only: the maintainer's `danger-full-access` default, MCP servers, model default and memory settings. Skills under `CODEX_HOME` and execpolicy rules are separate sources (`--ignore-rules` exists), and `--strict-config` rejects an unknown `-c` key before any request. With the feature flags above disabled, the model reported no shell, file, patch or image tools in the 2026-09-26 probes (`tools.exec_command is not a function`, `code-mode host is disabled`); collaboration tools stay advertised. The read-only sandbox limits writes and network for commands, not reads, and the wrapper does not verify its enforcement on Windows, so the flags and the instruction carry the packet-only boundary, not the sandbox. Do not add `--dangerously-bypass-approvals-and-sandbox`, `--add-dir`, a writable sandbox or pass-through arguments. Recheck the tool surface after CLI changes; `--json` replaces the step 5 banner with JSONL events that carry the thread id and token usage but not the model.
4. Allow a long-lived invocation (at least a 15-minute process budget for a deep review; the 2026-09-26 trial at high effort took about 2.5 minutes for a 900-line packet) and poll for progress instead of imposing a short shell timeout; from Claude Code, run the wrapper in the background and read its evidence files. Every run gets a fresh evidence directory; refuse an existing one, and refuse a location inside a checkout that is not gitignored (`test-output/` is). It holds the packet, its hash, requested model/effort, executable and version, session id, stdout, stderr and the last message. Do not log secrets; store the account email and plan, nothing more.
5. Require exit code 0 and a non-empty last message, then read the banner block Codex prints first on stderr, between the first two `--------` lines: require `model:`, `sandbox: read-only`, `provider: openai`, `approval: never` and `reasoning effort:` equal to the requested values. Everything after that block is the echoed packet and the response; do not treat text there as control evidence. The banner echoes the client's request, and `codex exec` prints no server-side model echo; in the observed runs an unsupported model produced an HTTP 400 error and a non-zero exit instead of a substitution. `tokens used` is a usage count, not a charge. Subscription usage windows are separate from FactHarbor's paid API ledger, a usage-limit error is a stop rather than a reason to switch credentials or models, and login status says nothing about extra-usage billing.

This profile reviews the supplied packet with the tools above disabled by flags and by instruction. It cannot inspect the checkout, recompute hashes or run tests, and its findings should say so. A review needing repository access is the wrapper's `--repo` profile: shell tool enabled for reading, read-only sandbox, checkout as working directory, and a separately scoped authorization with the sandbox caveat above. None of these instructions grants authority to send private material, exceed disclosure scope or implement the review's recommendations; check outbound content for private material before the packet leaves the machine.
