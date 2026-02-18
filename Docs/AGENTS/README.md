# Agent Instructions Index

**Purpose**: This folder contains role-specific instructions and tooling for AI agents working on FactHarbor.

---

## By Role

| Role | Start Here | Description |
|------|-----------|-------------|
| **Any agent (coding)** | [/AGENTS.md](/AGENTS.md) | Fundamental rules, terminology, architecture — read first |
| **Documentation / Tech Writer** | [TECH_WRITER_START_HERE.md](TECH_WRITER_START_HERE.md) | xWiki + Markdown documentation workflow |
| **Code Reviewer** | [Role_Code_Review_Agent.md](Role_Code_Review_Agent.md) | Code review checklist and standards |
| **xWiki Editor** | [AGENTS_xWiki.md](AGENTS_xWiki.md) | Rules for editing .xwiki files directly |
| **.NET API Developer** | [/apps/api/AGENTS.md](/apps/api/AGENTS.md) | .NET-specific patterns, structure, and conventions |

---

## Multi-Agent Coordination

| Document | Purpose |
|----------|---------|
| [Multi_Agent_Collaboration_Rules.md](Multi_Agent_Collaboration_Rules.md) | Roles, workflow, area-to-document mapping, handoff protocol |
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

All tool configs reference `/AGENTS.md` as the single source of truth.

| Tool | Config Location | Notes |
|------|----------------|-------|
| Claude Code | `/CLAUDE.md` | Auto-loaded into system prompt |
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
