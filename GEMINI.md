<!-- Sync with /AGENTS.md. Last synced: 2026-04-15 -->

# GEMINI.md

> **System Instruction for Gemini Agents (CLI & Code Assist)**

## Model Configuration
**REQUIRED MODEL:** `gemini-3.0-pro` (or latest available `pro` variant).

*   **Gemini CLI:** Ensure you are initialized with `gemini-3.0-pro`.
*   **Gemini Code Assist:** If the IDE allows model selection, select `Gemini 3.0 Pro`.

## Project Context
You are an expert software engineer working on **FactHarbor**.

### Critical Rules (from AGENTS.md)
1.  **Generic by Design:** No hardcoded topics/keywords.
2.  **LLM Intelligence:** Use LLMs for semantic decisions, not regex.
3.  **Terminology (Strict Adherence):**
    *   `ClaimAssessmentBoundary` (NOT Context/Scope)
    *   `AtomicClaim` (NOT Fact)
    *   `EvidenceItem` (NOT Fact)

### Architecture
*   **Web:** Next.js (`apps/web`)
*   **API:** ASP.NET Core (`apps/api`)
*   **Config:** UCM (Unified Config Management) via SQLite.
*   **Analyzer:** Modularized `ClaimAssessmentBoundary` pipeline (Stages 1-5). Key stage components: `research-orchestrator`, `research-query-stage`, `research-acquisition-stage`, `research-extraction-stage`, `boundary-clustering-stage`, `verdict-generation-stage`, `aggregation-stage`.

## Behavior
*   **Reasoning:** Use the high-reasoning capabilities of Gemini 3.0 for architectural decisions and complex refactors.
*   **Code Style:** Follow patterns in `apps/web/src/lib/analyzer/`.
*   **Learnings:** Check `Docs/AGENTS/Role_Learnings.md` for recent lessons before starting complex tasks.
*   **Diffs:** Always provide unified diffs for code changes.

## Named Workflows
Documented procedures for recurring tasks. Read the file and follow its instructions (ignore YAML frontmatter).

| Task | Workflow file |
|---|---|
| Deep pipeline analysis | `.claude/skills/pipeline/SKILL.md` |
| Full quality audit | `.claude/skills/audit/SKILL.md` |
| Post-change validation | `.claude/skills/validate/SKILL.md` |
| Generate handoff document | `.claude/skills/handoff/SKILL.md` |
| Debug log + test analysis | `.claude/skills/debug/SKILL.md` |
| Explain code | `.claude/skills/explain-code/SKILL.md` |
| Prompt deficiency diagnosis | `.claude/skills/prompt-diagnosis/SKILL.md` |
| Docs cleanup and update | `.claude/skills/docs-update/SKILL.md` |
| WIP consolidation and backlog sync | `.claude/skills/wip-update/SKILL.md` |
