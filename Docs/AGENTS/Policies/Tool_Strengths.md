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
| xWiki documentation | Any agent | Any | Read Docs/AGENTS/AGENTS_xWiki.md first |
