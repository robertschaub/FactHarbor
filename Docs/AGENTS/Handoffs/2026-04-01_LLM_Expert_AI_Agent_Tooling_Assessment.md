---
### 2026-04-01 | LLM Expert | Claude Code (Opus 4.6) | AI Agent Tooling Assessment
**Task:** Investigate whether additional AI agent tools/frameworks would benefit the FactHarbor development workflow.
**Files touched:** This handoff file, `Docs/AGENTS/Agent_Outputs.md`
**Scope:** Model-specific (Claude Code) and general-purpose agent tools, evaluated against FactHarbor's existing governance (AGENTS.md, 10 roles, handoff protocol).

---

## Executive Summary

Investigated 30+ tools across 7 categories. Most tools either conflict with the existing AGENTS.md governance or solve problems FactHarbor doesn't have. Three tools reached the trial stage; deeper risk assessment changed two verdicts.

**Final recommendations:**

| Tool | Score | Verdict | Rationale |
|------|-------|---------|-----------|
| **Claude HUD** | 19/25 | **Bookmark** | Context window visibility is valuable, but `dist/usage-api.js` (dead OAuth code in distributable) and source/dist divergence are yellow flags. Wait for cleanup. |
| **Claude Code Safety Net** | 18/25 | **Bookmark** | Well-built, clean audit. BUT: PreToolUse hooks do NOT fire for subagents (anthropics/claude-code#34692, OPEN). FactHarbor uses subagents heavily → silent bypass → false confidence. Wait for upstream fix. |
| **Context7 MCP** | 16/25 | **Bookmark** | Easy install, but FactHarbor's dependency stack is within LLM training data. Revisit if adopting bleeding-edge libraries. |

---

## Tool-Specific Assessments

### 1. Context7 MCP (Upstash)
- **What:** Cloud-hosted MCP server providing current library documentation
- **URL:** https://github.com/upstash/context7 (~51K stars)
- **Install:** One `.mcp.json` entry pointing to `https://mcp.context7.com/mcp`
- **Scores:** Integration 4, Value-Add 2, Maintenance 4, Compatibility 4, Solo-Dev Fit 2 = **16/25**
- **Why bookmark:** FactHarbor's stack (Next.js, Zod, AI SDK, Vitest, ASP.NET Core) is stable and well within Opus 4.6 training cutoff. Solves a real problem that isn't FactHarbor's problem today.

### 2. Claude Code Safety Net (kenryu42)
- **What:** PreToolUse hook blocking destructive git/filesystem commands
- **URL:** https://github.com/kenryu42/claude-code-safety-net (~1.2K stars)
- **Install:** `/plugin marketplace add kenryu42/cc-marketplace` → `/plugin install safety-net@cc-marketplace`
- **Scores:** Integration 4, Value-Add 4, Maintenance 3, Compatibility 3, Solo-Dev Fit 4 = **18/25**

#### Security Audit (deep code review):
- **Network calls on hook path:** ZERO. Purely local pattern matching.
- **Runtime dependencies:** 1 (`shell-quote`, 23M weekly downloads, zero transitive deps)
- **Credential access:** None. Does not read .env, API keys, or ~/.claude/ session data.
- **Audit logging:** Blocked commands only, with secret redaction. Minor gap for unusual formats.
- **Custom rules:** Purely declarative string matching. No eval, no code execution.
- **Auto-update:** None.
- **Verdict:** Clean, well-built security tooling.

#### Known Issues (from GitHub issues):
- **CRITICAL — anthropics/claude-code#34692 (OPEN):** PreToolUse hooks do NOT fire for subagent tool calls. FactHarbor uses Agent tool regularly → entire plugin silently bypassed during multi-agent work.
- **#31:** TMPDIR path traversal bypass (fixed v0.7.5)
- **#11:** Hook logged but didn't actually block a command (unreproduced, closed)
- **#44 (OPEN):** Git worktree operations produce false positives
- **#41 (OPEN):** `find -delete` false positives for legitimate cleanup
- **Windows history:** 3 separate Windows bugs (#2, #21, #26), all fixed but pattern concerning
- **#16:** 7-second latency per Bash command (fixed v0.6.0)

#### Why bookmark (not trial): The subagent bypass is a dealbreaker for FactHarbor's workflow. A safety net with a known hole in the primary usage pattern creates false confidence.

### 3. Claude HUD (jarrodwatts)
- **What:** Status line HUD showing context window health, model, rate limits, agent progress
- **URL:** https://github.com/jarrodwatts/claude-hud (~16K stars)
- **Install:** `/plugin marketplace add jarrodwatts/claude-hud` → `/plugin install claude-hud` → `/claude-hud:setup`
- **Scores:** Integration 4, Value-Add 4, Maintenance 3, Compatibility 4, Solo-Dev Fit 4 = **19/25**

#### Security Audit (deep code review):
- **Network calls (source):** ZERO in TypeScript source.
- **Network calls (dist):** `dist/usage-api.js` — 944-line file with OAuth token handling, calls `api.anthropic.com`. Currently DEAD CODE (unreachable from entry point). Changelog confirms removal pending.
- **Credential access:** `ANTHROPIC_API_KEY` checked for existence only (boolean). Dead code would read OAuth tokens from `~/.claude/.credentials.json`.
- **Runtime dependencies:** ZERO (excellent).
- **Transcript access:** Reads full JSONL transcript. Only processes tool metadata, but has access to entire conversation content.
- **Supply chain risk:** `dist/` committed by CI bot. Source/dist divergence already present (`usage-api.js` has no source file).

#### Why bookmark (not trial): The dead OAuth code in dist and source/dist divergence are yellow flags. Wait until `usage-api.js` is removed from dist. The Git Bash Windows bug (#326) also affects FactHarbor's shell configuration.

---

## Other Tools Evaluated (Summary)

### Considered but skipped:
| Tool | Stars | Why Skip |
|------|-------|----------|
| **dixus/claudeframework** | 0 | Very new fork, conflicts with existing AGENTS.md governance. Borrow ideas (bias-free review, lesson graduation) instead. |
| **everything-claude-code** | 130K | 136 skills would need careful curation. Study instinct-based learning for Role_Learnings.md evolution. |
| **claude-mem** | 44K | Evaluate whether automatic memory complements or conflicts with Agent_Outputs.md. |
| **Aider** | 43K | Too much overlap with Claude Code + Cursor. |
| **CrewAI / AutoGen / LangGraph** | 48-57K | For building agent applications, not coding assistance. |
| **Continuous Claude v3** | 3.7K | FactHarbor's handoff protocol is more mature. Study for ideas only. |
| **ruflo** | 29K | Over-engineered for solo developer + AI. |

### Worth revisiting later:
| Tool | Stars | When to Revisit |
|------|-------|----------------|
| **Agent Teams** (built-in) | n/a | When anthropics/claude-code#34692 is fixed (hooks fire for subagents), test with FactHarbor role definitions. |
| **Claude Agent SDK** | n/a | If programmatic orchestration of Captain/Agent workflow is needed. |
| **agent-skill-creator** | 627 | When cross-tool portability of role definitions becomes a priority. |
| **agnix** (AGENTS.md linter) | 132 | When AGENTS.md exceeds 500 lines and structural drift becomes a concern. |

---

## Claude Code Plugin Security Model (Key Findings)

- **Plugins are NOT sandboxed.** Full user permissions — filesystem, network, environment.
- **Third-party marketplaces have ZERO vetting.** Only official Anthropic marketplace has manual review.
- **PreToolUse hooks see full tool context** (command strings, file paths, env vars). Can block, allow, or modify.
- **StatusLine runs shell commands** with full env access.
- **Plugin auto-update:** Disabled by default for third-party plugins. Official plugins auto-update by default.
- **CVE-2025-59536 and CVE-2026-21852** were found in the hooks infrastructure itself (repo-defined configs executing before consent). Both patched by Anthropic.

---

## Ideas Worth Borrowing (without installing anything)

From **dixus/claudeframework:**
- **Bias-free review via isolated subagent context** — reviewer never sees implementation decisions
- **Lesson graduation** — temporary corrections → permanent CLAUDE.md rules after 14 days of validation

From **everything-claude-code:**
- **Instinct-based learning** with confidence scoring and decay — could evolve Role_Learnings.md

From **Continuous Claude v3:**
- **Ledger-based state persistence** — automate the Agent Exchange Protocol

---

## Key Decisions
1. All three initial "Immediate Win" recommendations downgraded after deep risk investigation.
2. The subagent hook bypass (anthropics/claude-code#34692) is a systemic issue affecting ALL hook-based safety tools, not just Safety Net.
3. Plugin security model requires trusting authors — no technical isolation exists.

## Open Items
- Monitor anthropics/claude-code#34692 for resolution (enables Safety Net and Agent Teams)
- Monitor claude-hud for `usage-api.js` removal from dist
- Broader productivity/quality investigation pending (separate task)

## Warnings
- Do not install any Claude Code plugin without auditing its source code first. The plugin security model provides no isolation.
- The subagent hook bypass means NO hook-based safety tool currently works for multi-agent workflows.

## For Next Agent
This assessment covers external tooling. A separate investigation into workflow improvements, MCP servers, testing strategies, and quality practices would complement this.

## Learnings
Appended to Role_Learnings.md? **Yes** (see below)
