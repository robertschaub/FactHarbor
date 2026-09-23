# Agent Instructions Index

**Purpose**: This folder contains role-specific instructions and tooling for AI agents working on FactHarbor.

---

## Roles

Per-role definition files. Each contains mission, focus areas, authority, required reading, key source files, deliverables, and anti-patterns. Read during role activation (see `/AGENTS.md` Role Activation Protocol).

| Role | File |
|------|------|
| **Lead Architect** | [Roles/Lead_Architect.md](Roles/Lead_Architect.md) |
| **Lead Developer** | [Roles/Lead_Developer.md](Roles/Lead_Developer.md) |
| **Senior Developer** | [Roles/Senior_Developer.md](Roles/Senior_Developer.md) |
| **Technical Writer** | [Roles/Technical_Writer.md](Roles/Technical_Writer.md) |
| **LLM Expert** | [Roles/LLM_Expert.md](Roles/LLM_Expert.md) |
| **Product Strategist** | [Roles/Product_Strategist.md](Roles/Product_Strategist.md) |
| **Code Reviewer** | [Roles/Code_Reviewer.md](Roles/Code_Reviewer.md) |
| **Security Expert** | [Roles/Security_Expert.md](Roles/Security_Expert.md) |
| **DevOps Expert** | [Roles/DevOps_Expert.md](Roles/DevOps_Expert.md) |
| **Captain** (human) | [Roles/Captain.md](Roles/Captain.md) |
| **Agents Supervisor** | [Roles/Agents_Supervisor.md](Roles/Agents_Supervisor.md) |

### Additional Role Resources

| Role | Document | Description |
|------|----------|-------------|
| **Any agent (coding)** | [/AGENTS.md](/AGENTS.md) | Fundamental rules, terminology, architecture — read first |
| **xWiki Editor** | [AGENTS_xWiki.md](AGENTS_xWiki.md) | Rules for editing .xwiki files directly |
| **.NET API Developer** | [/apps/api/AGENTS.md](/apps/api/AGENTS.md) | .NET-specific patterns, structure, and conventions |

---

## Multi-Agent Coordination

| Document | Purpose |
|----------|---------|
| [Multi_Agent_Collaboration_Rules.md](Multi_Agent_Collaboration_Rules.md) | Shared workflows, area-to-document mapping, escalation, quality checklist |
| [Multi_Agent_Meta_Prompt.md](Multi_Agent_Meta_Prompt.md) | Template for spawning task-specific agents with correct context |

---

## Agent Collaboration

| Document | Purpose |
|----------|---------|
| [Agent_Outputs.md](Agent_Outputs.md) | Index of persisted agent completions |
| [Handoffs/](Handoffs/) | Dedicated output files for significant tasks |
| [Role_Learnings.md](Role_Learnings.md) | Tips and gotchas from previous agents, organized by role |

See [Handoff Protocol](Policies/Handoff_Protocol.md) for proportional output tiers and restricted-session exceptions.

---

## Tool-Specific Config Files

All tool configs reference `/AGENTS.md` as the single source of truth. Most are thin pointers; Codex reads `AGENTS.md` natively.

| Tool | Config Location | Notes |
|------|----------------|-------|
| Gemini CLI | `/GEMINI.md` | Root entry point imports canonical AGENTS.md when effective discovery permits; verify loaded context in a fresh session |
| Codex (GPT) | `/AGENTS.md` (native) | Loads the root-to-working-directory instruction chain; explicitly read nested instructions for other targets; skills in `.agents/skills` |
| Claude Code | `/CLAUDE.md` | CLAUDE.md imports AGENTS.md; path rules route to canonical nested instructions |
| GitHub Copilot | `/.github/copilot-instructions.md` | Auto-loaded in VS Code |
| Cursor | `/.cursor/rules/*.mdc` | Glob-scoped rules, auto-attached per file type |
| Cline / RooCode | `/.clinerules/*.md` | Inserted into system prompt |
| Windsurf | `/.windsurfrules` | Portable root/nested instruction routing; verify client loading |

---

## Tooling & Reference

The first three rows form the **quality-expectations triad** consumed by `/report-review`: the MD is Captain's human-readable narrative (intent, rationale, open status); the two JSONs are the machine-readable runtime (per-family bands + Q-code catalog). When MD prose and JSON values disagree on a band, the JSON wins and the MD is updated to match.

| Document | Purpose |
|----------|---------|
| [Captain_Quality_Expectations.md](Captain_Quality_Expectations.md) | Human-readable summary of current Captain benchmark and generic quality expectations |
| [benchmark-expectations.json](benchmark-expectations.json) | Machine-readable expected bands and status for the 8 scored benchmark families |
| [report-quality-expectations.json](report-quality-expectations.json) | Machine-readable cross-input Q-code quality criteria used by `/report-review` |
| [GlobalMasterKnowledge_for_xWiki.md](GlobalMasterKnowledge_for_xWiki.md) | Core rules and document handling for xWiki work |
| [InitializeFHchat_for_xWiki.md](InitializeFHchat_for_xWiki.md) | Chat initialization prompt for xWiki-focused sessions |
| [Mermaid_ERD_Quick_Reference.md](Mermaid_ERD_Quick_Reference.md) | Syntax reference for Mermaid diagrams in documentation |

Shared FactHarbor skills are authoritative under `.claude/skills`, with fourteen declared `.agents/skills` copies. Run `node scripts/agents/check-skill-mirrors.mjs` after changes. Invocation metadata is client-specific; Gemini workspace disabled-skill settings and Cline visible skill toggles require separate session verification. A clone does not contain ignored local settings.
