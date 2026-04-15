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
| [Agent_Outputs.md](Agent_Outputs.md) | Rolling log of agent task completions (Standard tier) |
| [Handoffs/](Handoffs/) | Dedicated output files for significant tasks |
| [Role_Learnings.md](Role_Learnings.md) | Tips and gotchas from previous agents, organized by role |

See AGENTS.md § Agent Exchange Protocol for when and how to write outputs.

---

## Tool-Specific Config Files

All tool configs reference `/AGENTS.md` as the single source of truth. Most are thin pointers; Codex reads `AGENTS.md` natively.

| Tool | Config Location | Notes |
|------|----------------|-------|
| Gemini CLI | `/GEMINI.md` | Auto-loaded as foundational mandate alongside `AGENTS.md`; mirrors the shared Named Workflows table |
| Codex (GPT) | `/AGENTS.md` (native) | Reads `AGENTS.md` directly; use its Named Workflows table for shared skills |
| Claude Code | `/CLAUDE.md` | Auto-loaded into system prompt alongside `AGENTS.md` |
| GitHub Copilot | `/.github/copilot-instructions.md` | Auto-loaded in VS Code |
| Cursor | `/.cursor/rules/*.mdc` | Glob-scoped rules, auto-attached per file type |
| Cline / RooCode | `/.clinerules/*.md` | Inserted into system prompt |
| Windsurf | `/.windsurfrules` | 6000 char limit, condensed rules inline |

---

## Tooling & Reference

| Document | Purpose |
|----------|---------|
| [GlobalMasterKnowledge_for_xWiki.md](GlobalMasterKnowledge_for_xWiki.md) | Core rules and document handling for xWiki work |
| [InitializeFHchat_for_xWiki.md](InitializeFHchat_for_xWiki.md) | Chat initialization prompt for xWiki-focused sessions |
| [Mermaid_ERD_Quick_Reference.md](Mermaid_ERD_Quick_Reference.md) | Syntax reference for Mermaid diagrams in documentation |
