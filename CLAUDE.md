# Claude Code — FactHarbor

@AGENTS.md

The root is canonical. If the import was not loaded, read AGENTS.md directly. Before web/API work, read the applicable nested AGENTS.md even when launched from the root. `.claude/rules/factharbor-web.md` and `factharbor-api.md` provide path routing, not duplicate policy; do not rely on a prior read to trigger rules before a write.

## Client controls

Shared skills are authoritative in `.claude/skills`; the declared `.agents/skills` copies are checked by `node scripts/agents/check-skill-mirrors.mjs`. `validate` and `report-review` declare `disable-model-invocation: true`. Selection is not permission to reseed, submit jobs, spend on providers, publish or deploy.

`.claude/settings.json` contains repository hooks and uses `bypassPermissions`. This setting is not a restricted reviewer/writer profile. Preserve the destructive-command guard and recovery hooks. Automatic index rebuilding on Write/Edit is removed; the integrator owns existing builders and effective Git-hook output.

A repository observation dated 2026-05-30 reported hooks missing from subagent tool calls. Recheck the installed client's documented behavior before relying on hook coverage; the observation does not establish current enforcement. Destructive/irreversible operations remain main-session-only regardless of coverage.

Agent definitions omit `tools` for ordinary documented tool inheritance and may retain `model: inherit`; inherited tools do not create a restricted profile. Before dispatch, record the actual tools/commands, writable state, configuration scope, trust/activation and unverified controls. A session whose required restriction cannot be established must not be dispatched as a writer. Read-only reviews use supplied evidence or verified read-only tools and return findings in chat.

## Model and advisor use

Choose the configured model/effort for the task; confirm supported settings in the installed client. Existing legacy thinking environment values are retained for compatible clients; their effect varies by model. Do not infer the live model or effective effort from an old repository snapshot, and do not modify user-level settings as part of routine work.

If an advisor is available, use it for a material uncertainty or an independent reasoning check required by root policy. It is an optional client route, not a standing review committee or an empirical regression test. Respect current provider-spend authority and use a compatible available reviewer when that tool is absent. Do not assume Claude model aliases, prices or effort settings apply to another client.

Follow root Scoped Task Worktrees and Collaboration Rules §4.3 for ownership and Git authority. Small read-only lookups can stay in the main session; the repository does not declare a Claude scout role. Use conventional commit messages for authorized integrator commits.
