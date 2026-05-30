# Agentic Coding with Claude Opus 4.8 — Optimization Proposal

**Status:** IMPLEMENTED (2026-05-30) — R1 declined, R7 parked; see Decision Record
**Created:** 2026-05-30
**Last Updated:** 2026-05-30
**Author Role:** Agents Supervisor

---

## Context

The Captain asked: *"Investigate what and how I should optimize for agentic coding with Claude Opus 4.8 for developing FactHarbor."*

Scope of "agentic coding" here = **how the development agents (Claude Code on Opus 4.8, plus the cross-tool fleet) build FactHarbor** — harness config, model/effort tiering, context strategy, the multi-agent governance system, skills, and MCP. This is **not** about the analysis-pipeline's internal LLM tiering (Haiku/Sonnet for extract/verdict) — that is owned by Lead Architect / LLM Expert and is out of scope here.

Governance-lane discipline (per `Roles/Agents_Supervisor.md`): this document **proposes**; it does not change rules, settings, or product/architecture. Items that change behavior or rules are flagged **[Captain decision]**.

---

## TL;DR — Prioritized recommendations

| # | Recommendation | Effort | Risk | Owner |
|---|---|---|---|---|
| **R1** | Remove the two inert thinking flags from `.claude/settings.json` (`CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING`, `MAX_THINKING_TOKENS`) | 2 min | None on 4.8 | Supervisor (on OK) |
| **R2** | Decide the session-default effort level: keep `max` vs. move to `xhigh` | — | Behavior/cost | **[Captain decision]** |
| **R3** | Fix governance doc drift: §6.2 `high`→`max`, refresh/neutralize stale model examples, fix skills-count | 20 min | None | Supervisor (on OK) |
| **R4** | Codify that destructive/irreversible ops are **main-session-only, never delegated** (subagent hook gap is confirmed; tracking issue closed/not-planned); correct the AGENTS.md Safety note | 15 min | None | Supervisor + **[Captain awareness]** |
| **R5** | Add effort/fast-mode **task-tiering** guidance to §6 (cost lever) | 20 min | None | Supervisor (on OK) |
| **R6** | Clarify context strategy for the 1M main loop vs. lightweight models (Lite Activation scoping) | 10 min | None | Supervisor (on OK) |
| **R7** | Pilot the Claude Code **Workflow tool** as an *additive* orchestration option for §3.4 investigations | 1 session | Low (additive) | **[Captain decision]** |
| **R8** | Bootstrap the `fhAgentKnowledge` MCP cache (currently missing → repo fallback) | 2 min | None | Supervisor (on OK) |

R1, R3, R4, R5, R6, R8 are low-risk hygiene in the Supervisor lane. R2 and R7 are genuine Captain calls.

---

## Verified facts (resolved during this investigation)

These two facts are load-bearing and were verified against current sources rather than reconstructed from training memory (knowledge cutoff Jan 2026; today is 2026-05-30).

### Fact A — The thinking-config flags are mostly inert on Opus 4.8
Per Claude Code docs (`code.claude.com/docs` — model-config & env-vars), confirmed via `claude-code-guide`:

- **`CLAUDE_CODE_EFFORT_LEVEL`** is the live reasoning-depth knob. Levels: `low / medium / high / xhigh / max / auto`. **Opus 4.8 default = `high`**; docs recommend **`xhigh`** for most coding/agentic work; **`max`** is "demanding … may show diminishing returns and is prone to overthinking; test before adopting broadly."
- **`CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1`** has **no effect on Opus 4.7+** (they always use adaptive reasoning). It only matters on Opus 4.6 / Sonnet 4.6.
- **`MAX_THINKING_TOKENS=63999`** is **dead on Opus 4.8** — it only applies when adaptive thinking is disabled (the 4.6 fixed-budget path).
- **Fast mode (`/fast`)**: same Opus 4.8 model (no downgrade), ~2.5× faster output, ~2× token price. Orthogonal to effort level — you can run `max` effort in fast mode.
- **Subagents do not inherit** the parent session's effort level; they fall back to the model default (`high`) unless the invocation sets it.

→ FactHarbor's current `settings.json` (`DISABLE_ADAPTIVE_THINKING=1` + `EFFORT_LEVEL=max` + `MAX_THINKING_TOKENS=63999`) runs at **max effort**, and the other two flags do nothing on 4.8. They are Opus-4.6-era cruft that only adds confusion.

### Fact B — The subagent hook gap is current, confirmed behavior (tracking issue is closed/inactive)
- **The gap itself is confirmed**, independent of any issue tracker: this session's own Claude Code harness states hooks are *main-session-only* and do not fire for subagents; the AGENTS.md Safety note already records it; and the 2026-04-01 assessment reproduced it. Treat it as the **current operating reality.**
- **GitHub anthropics/claude-code#34692** ("PreToolUse/PostToolUse hooks do not fire for subagent (Agent tool) tool calls") — queried via `gh` on 2026-05-30: `state=CLOSED`, `stateReason=NOT_PLANNED`, `closedAt=2026-05-30`, with a `stale` label. The same-day close + `stale` label is consistent with an **automated stale-bot close of an inactive issue**, *not* a documented Anthropic "won't fix" decision. **Precise framing:** the issue is closed and not actively planned — *don't wait on it* — but I have not seen a primary statement that the behavior is permanent by design.
- Consequence under this repo's `bypassPermissions` mode: a **subagent's** destructive command (`git reset --hard`, `git push --force`, `git clean -f`, `factharbor.db` writes, expensive test runs) is stopped by **neither** the permission prompt **nor** the PreToolUse safety hook in `settings.json`.
- The 2026-04-01 assessment's open item "monitor #34692 for resolution (enables Safety Net / Agent Teams)" should be **retired** — the issue is closed/inactive, so it is not a live signal to track. The mitigation (R4) holds regardless of the issue's lifecycle.

---

## Detailed recommendations

### R1 — Simplify the thinking config to the one flag that works *(Supervisor, on OK)*
Current `.claude/settings.json` `env` block:
```json
"CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING": "1",
"CLAUDE_CODE_EFFORT_LEVEL": "max",
"MAX_THINKING_TOKENS": "63999"
```
Proposed (keeps current behavior on 4.8, removes inert flags):
```json
"CLAUDE_CODE_EFFORT_LEVEL": "max"   // or "xhigh" — see R2
```
**Why:** On Opus 4.8 the other two flags are inert (Fact A). Removing them is a zero-behavior-change cleanup that prevents future confusion (and the false belief that we're pinning a 64k thinking budget). Keep them only if FactHarbor still intends to run agents on Opus 4.6 / Sonnet 4.6, where they *do* take effect — in which case, comment them as 4.6-only.

### R2 — Session-default effort: `max` vs `xhigh` **[Captain decision]**
This is the one real tradeoff, and it sits against the `AGENTS.md` "System Prompt Override" mandate (*correctness and completeness over speed and brevity*).

- **`max`** (current): deepest reasoning. Per docs, can overthink with diminishing returns. Highest token cost of any setting. Best aligned with the literal "reason deeply" mandate.
- **`xhigh`** (docs' recommended-for-most): near-max reasoning, materially lower token spend, less overthinking.

**Cost matters here** (NPO formation, OpenAI Pro spend, the standing "cost levers" tracking). Max-effort on *every* call — including mechanical edits and doc sync — is the single most expensive Claude Code configuration. Recommendation: **`xhigh` as the session default**, and reach for `max` explicitly on deep pipeline/architecture reasoning (or invoke a skill that bumps effort). This preserves the "reason deeply where it matters" intent while removing the always-on premium. R5 makes the tiering concrete. *Captain picks the default.*

### R3 — Fix governance doc drift *(Supervisor, on OK; rule text → Captain awareness)*
- `Multi_Agent_Collaboration_Rules.md` **§6.2** claims the project default is `CLAUDE_CODE_EFFORT_LEVEL=high`; the actual setting is `max`. Correct it (to whatever R2 decides).
- **§6.1–6.3** pin version-specific examples ("Opus 4.6, GPT-o3, Gemini 2.0 Pro" / "Sonnet 4.6, GPT-4.1" / "Haiku 4.5, Kimi K2") even though the section's own preamble says it is "organized by capability tier … to avoid staleness." Either refresh to the current fleet (Opus 4.8, Sonnet 4.6, Haiku 4.5; GPT-5/Codex, GPT-5.4 Copilot, Gemini) **or** drop version names entirely and keep pure tier descriptions (cleaner, self-maintaining). Recommend the latter.
- §6.1 line "only tier that supports `CLAUDE_CODE_EFFORT_LEVEL=max`" — verify against current docs before re-asserting (effort levels now span a 6-value scale).
- `Docs/DEVELOPMENT/Claude_Code_Skills.md` says "eleven … skills" in the intro but "All ten skills" in Cross-Tool Usage, and the table lists 11. Make the count consistent.

### R4 — Make the subagent safety gap an explicit rule *(Supervisor + Captain awareness)*
Because #34692 is permanent (Fact B) and this repo runs `bypassPermissions`:
- Add a short rule (AGENTS.md §Safety): **destructive or irreversible operations are main-session-only and must never be delegated to a subagent or Workflow agent** — specifically `git reset --hard`, `git push --force`, `git clean -f`, `git checkout -- .`, `factharbor.db` writes, and expensive test runs. These are the exact patterns the PreToolUse hook guards, and the hook does not protect subagent calls.
- Update the existing Safety note: instead of implying a pending upstream fix, state that this is **current, confirmed behavior**; the tracking issue (#34692) was **closed as not-planned (stale-labeled) on 2026-05-30** and is not actively planned; **do not rely on hooks to guard subagent tool calls.** (Avoid asserting "permanent by design" — that is not evidenced by a primary source.)
- For parallel file-mutating agents, prefer **worktree isolation** (`isolation: "worktree"` / `EnterWorktree`) to bound blast radius. Read-only fan-out (the `Explore` agent) is inherently safe — no Edit/Write/destructive-Bash.
- This is a governance rule (no code), but it changes the rules file → Captain awareness.

### R5 — Codify effort / fast-mode task-tiering in §6 *(Supervisor, on OK)*
A small table so agents (and the Captain) pick the cheapest sufficient setting:

| Task class | Effort | Fast mode | Rationale |
|---|---|---|---|
| Pipeline root-cause, architecture, quality gates, `/debate` reconciliation, `/audit`, `/pipeline` | `max` / `xhigh` | off | Intelligence-sensitive |
| Routine implementation, code review, test writing | `xhigh` / `high` | optional | Balanced |
| Mechanical edits, renames, doc sync, index rebuilds, formatting | `medium` / `low` | on | Not intelligence-sensitive; speed/cost win |
| Bulk read-only fan-out (search, file discovery) | inherits env-var level | n/a | Use `Explore` (read-only) |

**Correction (primary source, code.claude.com):** the `CLAUDE_CODE_EFFORT_LEVEL` env var takes precedence over frontmatter and model defaults, so **subagents/Workflow agents inherit the project level process-wide** — wide fan-outs run at the env-var level, *not* a `high` default. This makes R2 (`max`→`xhigh`) a cost win across the **whole fleet**, not just the main loop; and per-subagent tiering via frontmatter is overridden while the env var is set. (An earlier draft claimed subagents default to `high` — that was wrong.)

### R6 — Right-size the context strategy for a 1M main loop *(Supervisor, on OK)*
- §6.3 "Lite Activation / graduated loading" was designed for **small-context lightweight models**. Add one sentence making explicit it does **not** apply to the Opus 4.8 1M main loop, which should follow the AGENTS.md "read files fully before editing" mandate. (Currently implied, not stated — a lightweight subagent and the Opus main loop reading the same role file should behave differently.)
- Keep the **handoff-index** system and the **Large File Exception** (212KB prompt → targeted reads). With 1M context their justification shifts from *"won't fit"* to *"cost + signal-to-noise"* — still valid. Worth a one-line reframe so nobody "optimizes them away" thinking the big window made them obsolete.

### R7 — Pilot the Workflow tool as an additive orchestration option **[Captain decision]**
Claude Code now ships a **Workflow tool** for deterministic multi-agent orchestration (scripted fan-out → consolidate, with schemas, worktree isolation, and budget control). The §3.4 Multi-Agent Investigation Workflow today is **manual**: the Captain copy-pastes INVESTIGATE/CONSOLIDATE/STATUS prompts across separate tool sessions and merges hub/spoke files by hand.

- **Opportunity:** a Claude-native §3.4 run could be one Workflow script (parallel investigators with structured outputs → a consolidator), removing the manual copy-paste dance and the document-race-condition handling.
- **Boundary (important):** the manual hub-and-spoke protocol **stays canonical** because the fleet is deliberately cross-tool — recent `Agent_Outputs.md` is mostly **Codex (GPT-5)** and **Copilot (GPT-5.4)**, and the Workflow tool is Claude-only. This is an *additional Claude-native path*, **not** a re-architecture of the governance system. Do not let it grow into a standing layer (role anti-pattern: gold-plating).
- **Proposal:** one bounded pilot on a real investigation, then keep or drop. Captain decides whether to spend a session on the pilot.

### R8 — Bootstrap the agent-knowledge cache *(Supervisor, on OK)*
The `fhAgentKnowledge` preflight in this session warned `cache_missing` → it served from repo fallback (slower, still correct). A one-time `bootstrap_knowledge` / `refresh_knowledge` (or the CLI equivalent) restores fast structured lookups. Low value, low effort — fold into the next maintenance pass.

---

## What is already good (keep — do not churn)

- **Lean default orchestration.** AGENTS.md already says "default to one accountable implementer; add a reviewer only for high-risk / cross-stage / prompt-config / live-job decisions." That is the right posture for a capable main model — keep it; Opus 4.8 reinforces it. The heavy §3.1 5-phase workflow is correctly reserved for genuinely complex/risky work.
- **The skill suite** (11 skills, cross-tool, canonical in `.claude/skills/`) and the **handoff-index + stage-map + model-manifest** indexing system are modern, well-built, and worth preserving.
- **The `fhAgentKnowledge` MCP** (preflight/search/role-context) is exactly the right adoption — it makes role activation and prior-work lookup cheap.
- **Plugin caution** from the 2026-04-01 assessment stands: no un-audited Claude Code plugins (no sandboxing); hook-based safety plugins remain bypassed for subagents (Fact B).

---

## Open Captain decisions

1. **R2 — session-default effort:** keep `max`, or move to `xhigh` (recommended) with `max` reserved for deep reasoning? (Affects cost on every call.)
2. **R3 — model examples in §6:** refresh to current fleet, or remove version names entirely (recommended)?
3. **R7 — Workflow pilot:** spend one session piloting a Claude-native §3.4, or defer?
4. **Apply R1/R3/R4/R5/R6/R8 now?** All low-risk; R4 changes rule text so it needs your awareness even though it's mechanical.

---

## References
- `.claude/settings.json` — current harness config
- `AGENTS.md` — §System Prompt Override, §Safety, §Named Workflows
- `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` — §3.1/§3.4 workflows, §6 Model-Class Guidelines
- `Docs/AGENTS/Handoffs/2026-04-01_LLM_Expert_AI_Agent_Tooling_Assessment.md` — prior (Opus 4.6-era) tooling scan
- `Docs/DEVELOPMENT/Claude_Code_Skills.md` — skill inventory
- Claude Code docs: `code.claude.com/docs` (model-config, env-vars); GitHub anthropics/claude-code#34692 (closed/not-planned)

---

## Review Log

| Date | Reviewer Role | Status | Comments |
|------|---------------|--------|----------|

## Decision Record

**2026-05-30 (Captain):**
- **R1 — declined.** Keep `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1` + `MAX_THINKING_TOKENS=63999` in `settings.json` — the Captain still runs Opus 4.6 occasionally, where these flags are active (inert on 4.8, so harmless there).
- **R2 — `xhigh`.** Session-default effort changed `max` → `xhigh` (env var). Verified safe for mixed 4.8/4.6 use (falls back to `high` on 4.6). `max` remains on demand via `ultrathink` / `/effort max`.
- **R3, R4, R5, R6, R8 — applied** (see below).
- **R7 — parked.** Workflow-tool pilot not adopted now; `ultracode` noted in §6.5 as the low-friction on-demand path if wanted later.

### Applied (2026-05-30)
- **R2** `.claude/settings.json`: `EFFORT_LEVEL` `max`→`xhigh`.
- **R3** `Multi_Agent_Collaboration_Rules.md` §6: removed stale version-pinned examples (§6.1–6.3 headings); fixed §6.2 (`high`→`xhigh`, env var); replaced the false "only tier supports `max`" line (effort is supported on Opus 4.8/4.7/4.6 + Sonnet 4.6).
- **R4** `AGENTS.md` §Safety: corrected the #34692 note (closed not-planned/stale 2026-05-30, no fix expected) and added the rule that destructive/irreversible ops are main-session-only and never delegated to subagents/Workflow agents.
- **R5** `Multi_Agent_Collaboration_Rules.md` new **§6.5** Effort & Fast-Mode Tiering (task table, env-var precedence, `ultrathink`/`ultracode`/`/fast`, 4.6 compatibility).
- **R6** `AGENTS.md` Large File Exception reframed (cost/signal, not capacity); §6.3 Lite Activation scoped to lightweight models, not the 1M main loop.
- **R8** `fhAgentKnowledge` cache bootstrapped (296 handoffs indexed).

### Correction logged
The earlier draft claim that subagents default to `high` effort was wrong; primary source confirms the env var forces the effort level process-wide (see §6.5 and the R5 correction note).
