# Agents Supervisor — Agentic Coding with Opus 4.8 Optimization

**Date:** 2026-05-30
**Role:** Agents Supervisor
**Agent/Model:** Claude Code (Opus 4.8, 1M)
**Tier:** Significant
**Full proposal + decision record:** `Docs/WIP/2026-05-30_Agentic_Coding_Opus_4.8_Optimization.md`

## Task
Investigate what/how to optimize agentic coding with Claude Opus 4.8 for FactHarbor, then apply the Captain-approved changes. Scope kept to the Agents-Supervisor lane: harness config + governance docs, not product/architecture or pipeline model tiering.

## Done
- **`.claude/settings.json`** — `CLAUDE_CODE_EFFORT_LEVEL` `max` → `xhigh` (R2). Kept `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1` + `MAX_THINKING_TOKENS=63999` per Captain (still runs Opus 4.6 sometimes; inert on 4.8, active on 4.6).
- **`AGENTS.md` §Safety** — corrected the #34692 note (closed not-planned / stale-labeled 2026-05-30, no fix expected) and added the rule: *destructive/irreversible ops are main-session-only and must never be delegated to a subagent or Workflow agent* (R4). Large File Exception reframed as cost/signal, not capacity (R6).
- **`Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` §6** — removed stale version-pinned model examples (§6.1–6.3 headings); fixed §6.2 default to `xhigh` (env var); removed the false "only tier supports `max`" line; added **§6.5 Effort & Fast-Mode Tiering** (task table, env-var precedence, `ultrathink`/`ultracode`/`/fast`, 4.6 compatibility) (R3, R5); scoped §6.3 Lite Activation to lightweight models, not the 1M main loop (R6).
- **`fhAgentKnowledge`** cache bootstrapped — 296 handoffs indexed (R8).
- **Memory** — new `reference_claude_code_opus48_settings.md`; updated `feedback_claude_settings_hygiene.md` with the 4.8 delta.

## Decisions
- **R1 declined** — keep the two thinking flags (inert on 4.8, needed on 4.6). **R2 = `xhigh`.** **R7 parked** (Workflow-tool pilot); `ultracode` documented in §6.5 as the low-friction on-demand path.

## Warnings
- **Subagent safety gap is permanent in practice.** Under `bypassPermissions`, neither the PreToolUse hook nor a permission prompt guards a subagent/Workflow-agent's destructive command (anthropics/claude-code#34692 closed not-planned). Never delegate `git reset --hard` / `push --force` / `clean -f` / `checkout -- .` / `factharbor.db` writes / expensive tests to a subagent. Prefer worktree isolation for parallel file mutation.
- The `CLAUDE_CODE_EFFORT_LEVEL` env var forces effort **process-wide** (overrides subagent/skill frontmatter). Per-subagent effort tiering would require dropping the env var in favor of `effortLevel` + frontmatter.
- Verification was doc/config only (no build required); `settings.json` remains valid JSON; no application code changed.

## Learnings
- On Opus 4.8, `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` + `MAX_THINKING_TOKENS` are inert (only active on Opus 4.6 / Sonnet 4.6 fixed-budget mode); `CLAUDE_CODE_EFFORT_LEVEL` is the live reasoning knob. `xhigh` falls back to `high` on 4.6, so it is a safe cross-model default.
- Verify version-specific harness facts against `code.claude.com/docs` and `gh issue view`, not a fast-model summary: a WebFetch of #34692 self-contradicted (header vs. body), and a subagent guide misstated effort inheritance (claimed subagents default to `high`; the env var actually forces the level process-wide).

## Next
- Optional: if per-task subagent effort tiering becomes valuable, migrate from the `CLAUDE_CODE_EFFORT_LEVEL` env var to `effortLevel` (settings) + per-skill frontmatter.
- Optional: pilot the Workflow tool / `ultracode` on a real §3.4 investigation (R7, parked) — additive to, not a replacement for, the cross-tool hub-and-spoke protocol.
