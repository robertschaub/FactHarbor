# Agent Handoff Protocol

> Externalized from `AGENTS.md` for brevity. This is the single source of truth for agent-to-agent communication, role activation, and completion outputs in FactHarbor. Other docs (including `Multi_Agent_Collaboration_Rules.md`) should point here.

---

## Agent Handoff Protocol

For a non-trivial task or a role handoff, assess fit without imposing extra sessions on routine work:

1. **Assess fit**: Is this task best suited for the current agent/tool, or would another be more effective?
2. **Check role and model**: Identify your current role and underlying LLM model. If either is a poor match for the task (e.g., a lightweight model assigned deep architectural reasoning, or a Technical Writer role asked to implement code), inform the Captain and propose a better-suited role, model tier, or both. Reference the Model-Class Guidelines in `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` §6 for tier strengths.
3. **Recommend if not**: Tell the user which agent/tool to use, why, what context it needs (files to read, decisions already made), and any work completed so far.

If no Captain role is actively assigned in the session, treat the active human user as the Captain for escalation and approval decisions.

### Role Activation Protocol

When the user starts with "As \<Role\>" or assigns you a role mid-conversation:

1. **Look up the role** in the alias table below → find the canonical role name
2. **Read your role's file** from `Docs/AGENTS/Roles/<RoleName>.md` — contains mission, focus areas, authority, required reading, key source files, deliverables, and anti-patterns
3. **Check learnings**: Scan your role's section in `Docs/AGENTS/Role_Learnings.md` for tips and gotchas from previous agents
4. **Acknowledge**: State your role, focus areas, and which docs you've loaded
5. **Stay in role**: Focus on that role's concerns. Flag (don't act on) issues outside your scope.
6. **On handoff/completion**: Follow the Agent Exchange Protocol using the appropriate mode (`Completion` or `Role Handoff`). For role handoffs, include `Warnings` and `Learnings`, and return durable new learnings for the authorized integrator to persist only when useful.

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
- **Summarize when done.** Follow the Agent Exchange Protocol below — use chat or the existing task record when sufficient; create a handoff only when continuity needs it, under the output tiers below.

### Agent Exchange Protocol (MANDATORY)

One protocol for all agent-to-agent communication. Three modes, one template.

#### Restricted reviewers and scoped workers

The restricted-writer definition is canonical in [Collaboration Rules §4.3](../Multi_Agent_Collaboration_Rules.md#43-concurrent-editing): assigned-file edits in an integrator-supplied worktree, return edits/evidence, no Git mutation or shared-setting/hook changes. Include it in each rollout assignment. It differs from a scoped worker explicitly authorized to deliver commits; a role label alone proves no restriction.

Restricted reviewers return findings, warnings, learnings, and exact reviewed-revision evidence in chat without writing completion files or indexes. The designated integrator writes their completion artifacts under the normal tiers below, preserving reviewer attribution and outcome. For scoped workers, file ownership governs where they may write; return out-of-scope completion material in chat for the integrator. During concurrent writing, the integrator serializes shared output/log/index changes and rebuilds, including `Role_Learnings.md`; this exception applies to the persistence instructions throughout this protocol. See [Collaboration Rules §4.3](../Multi_Agent_Collaboration_Rules.md#43-concurrent-editing).

#### Modes

| Mode | When | Where Output Lives |
|------|------|-------------------|
| **Completion** | Finishing a task | Chat, existing task record, or a warranted handoff/index entry under the tiers below |
| **Role Handoff** | Switching from one role to another | Same as Completion, with Warnings/Learnings and the relevant incoming-role checklist |
| **Investigation** | Multi-agent parallel research (Captain-directed) | `Docs/WIP/` hub+spoke — see `Multi_Agent_Collaboration_Rules.md` §3.4 |

#### Output tiers (Completion and Role Handoff modes)

| Task Tier | Criteria | Output Action |
|-----------|----------|---------------|
| **Trivial** | Single-file tweak, typo fix, quick answer, < 3 minutes of work | No file. Chat summary is sufficient. |
| **Standard** | Bounded change or investigation | Concise chat completion or amend an existing task record. Create a handoff + index row only if needed for continuation or explicitly requested. |
| **Significant** | Multi-file change, design decision, new module, investigation with findings that other agents need | **Dedicated .md file** in `Docs/AGENTS/Handoffs/` + **index row** in `Docs/AGENTS/Agent_Outputs.md` |

A significant task may use an existing authoritative task record when it already holds the required evidence; avoid a second completion narrative. Restricted sessions never write artifacts: the integrator persists needed evidence and attribution.

**Tier is determined by task scope, not by role activation.** Working under a role (e.g., "As Lead Developer, fix this typo") does not automatically elevate the tier. A trivial task stays trivial regardless of role. However, a Role Handoff (switching from one role to another mid-project) requires a concise handoff with Warnings and Learnings; an existing record or supplied chat may carry it.

Preserve decisions and evidence needed by the next agent. Do not create an artifact whose only purpose is satisfying a format.

#### Unified template

Use the applicable fields when recording a handoff or significant completion; omit irrelevant fields for ordinary solo work:

```markdown
---
### YYYY-MM-DD | <Role> | <Agent/Tool> | <Short Task Title>
**Task:** One-line description of what was requested.
**Files touched:** List of files created/modified.
**Repository / base revision:** Repository identity and full base SHA.
**Branch / worktree:** Task branch and worktree identifier (omit local machine paths from public artifacts).
**Owned files / boundaries:** Assigned paths, in/out of scope, and read/write restrictions.
**Permitted commands / state paths:** Commands and writable output/cache/temp/database paths, or none.
**Checks:** Required checks, actual commands/results and checked revision/content; omissions with reasons.
**Reviewer / integrator:** Reviewer and one designated integrator.
**Stop conditions:** Assigned conditions and any triggered/unresolved blockers.
**Reviewed-revision evidence:** Full reviewed SHA, or base SHA plus immutable captured diff and changed/new-file hashes; reviewer outcome/findings reference. Integrator adds resulting SHA and mapping to reviewed content, with renewed review/checks for content changes.
**Key decisions:** What was decided and why (brief).
**Open items:** Unfinished, blocked, or deferred items.
**Warnings:** Gotchas, fragile areas, things to verify.
**For next agent:** Context needed to continue or build on this work.
**Learnings:** Appended to Role_Learnings.md? (yes/no + summary if yes)
```

Field requirements by mode:

The assignment and reviewed-revision fields above are required for concurrent work; for other tasks, include applicable evidence and mark unavailable review/integration evidence as pending rather than implying approval.

| Field | Completion | Role Handoff |
|-------|-----------|-------------|
| Task, Files touched, Key decisions | Required | Required |
| Open items, For next agent | Required | Required |
| Warnings | Optional | **Required** |
| Learnings | Optional | **Required in handoff** — persist only durable new learning under ownership rules |

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

#### Role Handoff — incoming role checklist

When you are the **incoming** role (receiving a handoff or starting a role mid-project), **self-serve context before asking the Captain**:

1. For relevant non-trivial work, inspect the current task record or query the handoff index for prior context; skip history lookup when it adds no value
2. **Only when step 1 identifies a useful history lookup:** query `Docs/AGENTS/index/handoff-index.json`, filter by `roles` and `topics`, and read relevant matches. If the index is absent, use step 2b; otherwise skip this step.
   - 2b. *(fallback)* Scan filenames in `Docs/AGENTS/Handoffs/` directly
3. Read your role brief and only the task-relevant sections of its references
4. Scan your role's section in `Docs/AGENTS/Role_Learnings.md` for tips and gotchas
5. Check the specific active task document when relevant. Historical output and startup advice may be superseded; current authority controls.
6. Acknowledge role activation, summarizing the context you found — only ask the Captain for what's missing

#### Rules

- **`Docs/WIP/` is NOT for agent completion outputs.** WIP is for design documents, plans, reviews, and Investigation hub/spoke files. Agent completion outputs go in `Agent_Outputs.md` or `Handoffs/`.
- **Append, don't overwrite.** When writing to `Agent_Outputs.md`, always append below the header — never delete or modify previous entries.
- **Be concise.** The "For next agent" field is the most important — focus on what someone picking up this work needs to know.

### Archival Thresholds — Calendar-month procedure

Only an authorized integrator performs archival as part of assigned maintenance, typically on or after the 1st of each month. It is not a read-only or ordinary completion side effect. The procedure is fully deterministic and implemented in `scripts/monthly-prune-handoffs.mjs`:

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
