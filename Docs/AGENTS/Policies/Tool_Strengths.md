# Tool Strengths Reference

> Externalized from `AGENTS.md`. For tier-level model guidance (capability per model class), see `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` §6 Model-Class Guidelines. This file covers **tool** strengths (Codex, Claude Code, Gemini CLI, Cursor, Cline, Copilot, etc.) rather than model tiers.
>
> Captain assignment overrides these defaults. In the current FactHarbor workflow, Codex/GPT-5.5 is the primary implementation surface; Claude and Gemini are normally review and secondary-advice surfaces unless explicitly assigned implementation.

| Task Type | Best Tool | Model Tier | Why |
|-----------|-----------|------------|-----|
| Primary implementation, bug fixes, repo-local execution | Codex / GPT-5.5 | High | Primary execution surface; reads `AGENTS.md` natively, supports repo-local skills, shell work, and direct verification |
| Complex architecture review, adversarial critique, plan review | Claude Code / Opus 4.6 | High | Strong secondary reviewer for nuanced design, prompt, and architecture risks; prefer Opus 4.6 over other Claude models unless Captain explicitly requests otherwise |
| Independent second opinion, broad sanity check | Gemini CLI / latest Pro | High | Useful reviewer/advisor with a different model family; good for catching blind spots |
| Routine implementation assistance / IDE edits | Cursor / Copilot | Mid | Good for scoped edits and fast in-editor iteration when guarded by project instructions |
| Autonomous multi-step workflows | Cline | Mid or Lightweight | Runs commands autonomously, good for bulk operations when tightly scoped |
| Inline code completions | GitHub Copilot | (built-in) | Fast, context-aware, low overhead |
| Multi-file refactors with preview | Cursor Composer | Mid | Visual diff, multi-file edits |
| Documentation + diagrams | Any agent with TECH_WRITER role | Mid | See Roles/Technical_Writer.md |
| Deep investigation, consolidation | Codex/GPT-5.5 or Claude Opus 4.6 | High | Use Codex when implementation/verification is likely; use Claude Opus 4.6 when the task is review-only or adversarial synthesis |
| .NET API work | Any agent | Any | Read apps/api/AGENTS.md first |
| xWiki documentation | Any agent | Any | Read Docs/AGENTS/AGENTS_xWiki.md first |
