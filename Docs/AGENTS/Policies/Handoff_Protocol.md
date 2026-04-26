# Agent Handoff Protocol

> Externalized from `AGENTS.md` for brevity. This is the single source of truth for agent-to-agent communication, role activation, and completion outputs in FactHarbor. Other docs (including `Multi_Agent_Collaboration_Rules.md`) should point here.

---

## Agent Handoff Protocol

When starting any new task, every agent MUST:

1. **Assess fit**: Is this task best suited for the current agent/tool, or would another be more effective?
2. **Check role and model**: Identify your current role and underlying LLM model. If either is a poor match for the task (e.g., a lightweight model assigned deep architectural reasoning, or a Technical Writer role asked to implement code), inform the Captain and propose a better-suited role, model tier, or both. Reference the Model-Class Guidelines in `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` §6 for tier strengths.
3. **Recommend if not**: Tell the user which agent/tool to use, why, what context it needs (files to read, decisions already made), and any work completed so far.

If no Captain role is actively assigned in the session, treat the active human user as the Captain for escalation and approval decisions.

### Role Activation Protocol

When the user starts with "As \<Role\>" or assigns you a role mid-conversation:

1. **Trigger knowledge preflight**: Treat `As <Role>,` or `As <Role>:` as both the role assignment and the startup signal for `fhAgentKnowledge.preflight_task`. Call it before manual handoff/index scanning with:
   - `task`: the user's actual task request, excluding the role/skill boilerplate when practical
   - `role`: the raw `<Role>` phrase from the prompt
   - `skill`: the first explicit `Skill:` / `Skills:` value when present
   If parsing is not practical in the active client, pass the full prompt as `task`; `preflight_task` will extract a leading `As <Role>,` / `As <Role>:` and `Skill:` line. If MCP is unavailable, use `npm run fh-knowledge -- preflight-task --task "..." --role "<Role>" [--skill "<primary-skill>"]`.
2. **Resolve the role** from `preflight_task.roleContext` when present; otherwise look up the role in the alias table below to find the canonical role name.
3. **Read your role's file** from `Docs/AGENTS/Roles/<RoleName>.md` — contains mission, focus areas, authority, required reading, key source files, deliverables, and anti-patterns.
4. **Read explicit workflow skills**: if the prompt includes `Skill:` / `Skills:`, read and follow every named `.claude/skills/<name>/SKILL.md` workflow. `preflight_task` accepts one primary `skill`; additional skills still require manual file reads.
5. **Inspect returned anchors**: use `startupAdvice` for first actions, docs, handoffs, code-search hints, tool plan, and warnings. Source search/file reads remain authoritative for implementation locations.
6. **Check learnings**: Scan your role's section in `Docs/AGENTS/Role_Learnings.md` for tips and gotchas from previous agents.
7. **Acknowledge**: State your role, focus areas, which docs/workflows you've loaded, and the key preflight anchors you will use.
8. **Stay in role**: Focus on that role's concerns. Flag (don't act on) issues outside your scope.
9. **On handoff/completion**: Follow the Agent Exchange Protocol using the appropriate mode (`Completion` or `Role Handoff`). For role handoffs, include `Warnings` and `Learnings`, and append learnings to `Role_Learnings.md`.

**Role Alias Quick-Reference:**

| User Says | Maps To | Role File |
|-----------|---------|-----------|
| "Senior Architect", "Principal Architect" | Lead Architect | `Docs/AGENTS/Roles/Lead_Architect.md` |
| "Lead Developer" | Lead Developer | `Docs/AGENTS/Roles/Lead_Developer.md` |
| "Senior Developer" | Senior Developer | `Docs/AGENTS/Roles/Senior_Developer.md` |
| "Tech Writer", "xWiki Expert", "xWiki Developer" | Technical Writer | `Docs/AGENTS/Roles/Technical_Writer.md` |
| "LLM Expert", "AI Consultant", "FH Analysis Expert" | LLM Expert | `Docs/AGENTS/Roles/LLM_Expert.md` |
| "Product Manager", "Product Owner", "Sponsor" | Product Strategist | `Docs/AGENTS/Roles/Product_Strategist.md` |
| "Code Reviewer" | Code Reviewer | `Docs/AGENTS/Roles/Code_Reviewer.md` |
| "Security Expert" | Security Expert | `Docs/AGENTS/Roles/Security_Expert.md` |
| "GIT Expert", "GitHub Expert" | DevOps Expert | `Docs/AGENTS/Roles/DevOps_Expert.md` |
| "Agents Supervisor", "AI Supervisor" | Agents Supervisor | `Docs/AGENTS/Roles/Agents_Supervisor.md` |

**If the role is NOT in the table above:**
1. Tell the user which existing role is closest (if any) and ask whether to use that one
2. If no close match: read `/AGENTS.md` + `/Docs/STATUS/Current_Status.md` as baseline, then ask the user what documents and source files are relevant for this role
3. Proceed with steps 3-5 above once clarified

Full role definitions: `Docs/AGENTS/Roles/`. Shared workflows, area-to-document mapping, and protocols: `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`

### Working Principles

- **Stay focused.** Do the task you were given. Do not wander into adjacent improvements unless asked.
- **Plan before non-trivial changes.** For multi-file changes or unfamiliar code: explore the relevant code, draft an approach, then implement. Skip planning only for single-file, obvious changes.
- **Don't guess — read or ask.** If unsure what code does, read it. Don't assume from function names or training knowledge. If still unsure, ask the human. Check actual project dependencies (`package.json`, `.csproj`) rather than assuming library/framework behavior.
- **Quality over quantity.** A small, correct change beats a large, sloppy one. Read before you edit. Verify after you change.
- **Verify your work.** After implementing, run tests, build, or check output. Don't mark work done without verification.
- **Be cost-aware.** Minimize unnecessary LLM calls, file reads, and token usage. Don't re-read files you already have in context. Don't generate verbose output when concise will do.
- **Don't gold-plate.** Deliver what was requested — don't also refactor the file, add comments, and update docs unrequested. But DO report issues, inconsistencies, or improvement opportunities you notice along the way — just flag them, don't act on them without asking.
- **Cross-check code against docs.** When working on code, consult the related documentation under `Docs/xwiki-pages/FactHarbor/` (see the area-to-document mapping in `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` §1.2). When working on docs, check the code it describes. Report any mismatches — stale docs and diverged implementations are high-value catches.
- **Summarize when done.** Follow the Agent Exchange Protocol below — write a completion output to `Agent_Outputs.md` or `Handoffs/` (unless the task is trivial).

### Agent Exchange Protocol (MANDATORY)

One protocol for all agent-to-agent communication. Three modes, one template.

#### Modes

| Mode | When | Where Output Lives |
|------|------|-------------------|
| **Completion** | Any agent finishing a non-trivial task | `Docs/AGENTS/Agent_Outputs.md` or `Docs/AGENTS/Handoffs/` |
| **Role Handoff** | Switching from one role to another | Same as Completion + incoming-role checklist |
| **Investigation** | Multi-agent parallel research (Captain-directed) | `Docs/WIP/` hub+spoke — see `Multi_Agent_Collaboration_Rules.md` §3.4 |

#### Output tiers (Completion and Role Handoff modes)

| Task Tier | Criteria | Output Action |
|-----------|----------|---------------|
| **Trivial** | Single-file tweak, typo fix, quick answer, < 3 minutes of work | No file. Chat summary is sufficient. |
| **Standard** | Bug fix, small feature, config change, investigation with clear outcome | **Dedicated .md file** in `Docs/AGENTS/Handoffs/` + **index row** in `Docs/AGENTS/Agent_Outputs.md` |
| **Significant** | Multi-file change, design decision, new module, investigation with findings that other agents need | **Dedicated .md file** in `Docs/AGENTS/Handoffs/` + **index row** in `Docs/AGENTS/Agent_Outputs.md` |

Both Standard and Significant tiers produce the same artifact shape — a dated file in `Handoffs/` plus a triage-weight index row in `Agent_Outputs.md`. Tier distinction now affects only the depth of the handoff body (Standard = concise, Significant = full detail with code, diagrams, analysis).

**Tier is determined by task scope, not by role activation.** Working under a role (e.g., "As Lead Developer, fix this typo") does not automatically elevate the tier. A trivial task stays trivial regardless of role. However, a Role Handoff (switching from one role to another mid-project) always requires at least a Standard entry so the incoming role has context.

**When in doubt, write it.** The cost of an unnecessary entry is near zero; the cost of lost context between agents is high.

#### Unified template

Use for both Standard and Significant outputs — both go into dated `Handoffs/` files:

```markdown
---
### YYYY-MM-DD | <Role> | <Agent/Tool> | <Short Task Title>
**Task:** One-line description of what was requested.
**Files touched:** List of files created/modified.
**Key decisions:** What was decided and why (brief).
**Open items:** Unfinished, blocked, or deferred items.
**Warnings:** Gotchas, fragile areas, things to verify.
**For next agent:** Context needed to continue or build on this work.
**Learnings:** Appended to Role_Learnings.md? (yes/no + summary if yes)
```

Field requirements by mode:

| Field | Completion | Role Handoff |
|-------|-----------|-------------|
| Task, Files touched, Key decisions | Required | Required |
| Open items, For next agent | Required | Required |
| Warnings | Optional | **Required** |
| Learnings | Optional | **Required** — always check and append to `Role_Learnings.md` |

#### Handoff file placement (Standard and Significant)

- **Location:** `Docs/AGENTS/Handoffs/`
- **Naming:** `YYYY-MM-DD_<Role>_<Short_Description>.md`
- **Content:** Unified template fields. Significant tier adds detail (code snippets, diagrams, analysis); Standard tier stays concise.
- **Index row (required):** Append a 3-line triage-weight row to `Docs/AGENTS/Agent_Outputs.md`:
  ```
  ### YYYY-MM-DD | <Role> | <Agent/Tool> | <Title> — [<Tier>] [open-items: yes/no]
  **For next agent:** <summary, include 1–2 key symbols: class names / endpoints / file paths>
  → Docs/AGENTS/Handoffs/<filename>.md
  ```
- **Lifecycle:** Consumed by the next agent. Handoff files and their index rows are archived together on the 1st of each month (see §Archival Thresholds). NOT long-lived design docs (those go in `Docs/WIP/`).
- **Debt-guard telemetry:** For bugfix, regression, failing-test/build, runtime-defect, or failed-validation tasks where `/debt-guard` applies, include the Phase 7 fenced result block (`DEBT-GUARD RESULT` or `DEBT-GUARD COMPACT RESULT`) in the handoff body. The handoff index parses these blocks passively for compliance visibility; absence should not become a failing gate until telemetry quality has been reviewed.

#### Role Handoff — incoming role checklist

When you are the **incoming** role (receiving a handoff or starting a role mid-project), **self-serve context before asking the Captain**:

1. If `fhAgentKnowledge` is available, call `preflight_task` with the incoming task, role, and primary explicit skill before manual scanning. Use `startupAdvice` as the first context map.
2. Read `Docs/AGENTS/Agent_Outputs.md` — find the most recent entries relevant to your task
3. **Query `Docs/AGENTS/index/handoff-index.json`** — filter by `role` and `topics` to find prior handoffs related to your task; read the matched files. (If the file does not exist yet, fall back to step 3b.)
   - 3b. *(fallback)* Scan filenames in `Docs/AGENTS/Handoffs/` directly
4. Read Required Reading for your role (from `Multi_Agent_Collaboration_Rules.md` §2 Role Registry)
5. Scan your role's section in `Docs/AGENTS/Role_Learnings.md` for tips and gotchas
6. Check `Docs/WIP/` for active task documents related to the current work
7. Acknowledge role activation, summarizing the context you found — only ask the Captain for what's missing

#### Rules

- **`Docs/WIP/` is NOT for agent completion outputs.** WIP is for design documents, plans, reviews, and Investigation hub/spoke files. Agent completion outputs go in `Agent_Outputs.md` or `Handoffs/`.
- **Append, don't overwrite.** When writing to `Agent_Outputs.md`, always append below the header — never delete or modify previous entries.
- **Be concise.** The "For next agent" field is the most important — focus on what someone picking up this work needs to know.

### Archival Thresholds — Calendar-month procedure

Run on the 1st of each month (or any day after, during Consolidate WIP). The procedure is fully deterministic and implemented in `scripts/monthly-prune-handoffs.mjs`:

1. Identify the previous calendar month (e.g., on 2026-06-01 → 2026-05).
2. Move every `Docs/AGENTS/Handoffs/<YYYY-MM>-*.md` file whose date prefix falls in the previous month → `Docs/ARCHIVE/Handoffs/<YYYY-MM>/` (preserving filenames).
3. Move every index row in `Agent_Outputs.md` whose date falls in the previous month → `Docs/ARCHIVE/Agent_Outputs_<YYYY-MM>.md`. Rewrite each `→ Docs/AGENTS/Handoffs/<file>` link to `→ Docs/ARCHIVE/Handoffs/<YYYY-MM>/<file>` so the archived index resolves.
4. The active `Agent_Outputs.md` and active `Handoffs/` retain current-month content only.

**Why calendar boundaries:** Steady-state active size averages ½ monthly volume, peaks at full monthly volume on day 30. No arbitrary count or 30-day-rolling thresholds.

**Invocation:**
```
node scripts/monthly-prune-handoffs.mjs --dry-run   # preview
node scripts/monthly-prune-handoffs.mjs             # execute
node scripts/monthly-prune-handoffs.mjs --month 2026-05   # override target month
```

**Role_Learnings.md** archival: Captain curates quarterly. Promote best learnings into role files or collaboration rules; archive dated entries.

### Consolidate WIP Procedure

When the Captain requests "Consolidate WIP", follow the procedure in
`Docs/AGENTS/Procedures/Consolidate_WIP.md`.
