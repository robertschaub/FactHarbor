<!-- Sync with /AGENTS.md. Last synced: 2026-04-26 -->

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
*   **Bugfixing:** For every bugfix, regression fix, failing test/build fix, review finding, runtime defect repair, or failed-validation recovery, first read and apply `.claude/skills/debt-guard/SKILL.md`.
*   **Code Style:** Follow patterns in `apps/web/src/lib/analyzer/`.
*   **Learnings:** Check `Docs/AGENTS/Role_Learnings.md` for recent lessons before starting complex tasks.
*   **Diffs:** Always provide unified diffs for code changes.
*   **Internal knowledge startup:** If your Gemini surface supports MCP and `fhAgentKnowledge` is configured, call `preflight_task` first. A prompt beginning `As <Role>,` or `As <Role>:` defines the active role and triggers `preflight_task`; pass the task body, `role="<Role>"`, and the first explicit `Skill:` value if present. Otherwise use `npm run fh-knowledge -- preflight-task --task "..." [--role ...] [--skill ...]`. Setup guide: `Docs/DEVELOPMENT/Agent_Knowledge_MCP_Setup.md`.

## Index-First Lookup

Before scanning `Docs/AGENTS/Handoffs/` by filename, query the generated indexes under
`Docs/AGENTS/index/`:

- `handoff-index.json` — filter by `role` and `topics` to find relevant prior work
- `stage-map.json` — locate which analyzer stage file owns a behavior
- `stage-manifest.json` — look up model-tier mappings without grepping code

`handoff-index.json` is for agent task history only. For source code locations, use
normal code search/grep. If the indexes are missing, run `npm run index` once or fall
back to direct file scanning.

## Named Workflows
Documented procedures for recurring tasks. Read the file and follow its instructions (ignore YAML frontmatter).

**Skill selection order.** Resolve which workflows to apply using these layers, in order:

1. **Mandatory gates** — `.claude/skills/debt-guard/SKILL.md` for bugfixes. Always applies regardless of other routing.
2. **Explicit assignment** — the user or prompt names a skill directly (`Skill: pipeline`, `/audit`, etc.).
3. **Preflight routing** — `fhAgentKnowledge.preflight_task` returns recommended skills and startup advice. Role-activated tasks must call preflight; other tasks may call it when workflow choice is ambiguous.
4. **Metadata/table match** — use the Named Workflows table below and the target skill's own description.

When skills overlap, each skill's own scope guards determine which workflow owns the outcome. Do not create meta-routing skills.

| Task | Workflow file |
|---|---|
| Balanced bugfix complexity guard | `.claude/skills/debt-guard/SKILL.md` — mandatory for every bugfixing task before editing; compare undoing/amending previous code against adding new code |
| Adversarial debate | `.claude/skills/debate/SKILL.md` — read and execute the role procedure manually or with available agents when slash commands are unavailable |
| Context extension | `.claude/skills/context-extension/SKILL.md` — preserve, exchange, and reload high-value in-progress context throughout long sessions; not a replacement for completion outputs |
| Deep pipeline analysis | `.claude/skills/pipeline/SKILL.md` |
| Full quality audit | `.claude/skills/audit/SKILL.md` |
| Static prompt quality audit | `.claude/skills/prompt-audit/SKILL.md` |
| Post-change validation | `.claude/skills/validate/SKILL.md` |
| Generate handoff document | `.claude/skills/handoff/SKILL.md` |
| Debug log + test analysis | `.claude/skills/debug/SKILL.md` |
| Explain code | `.claude/skills/explain-code/SKILL.md` |
| Prompt deficiency diagnosis | `.claude/skills/prompt-diagnosis/SKILL.md` |
| Job report review | `.claude/skills/report-review/SKILL.md` |
| Docs cleanup and update | `.claude/skills/docs-update/SKILL.md` |
| WIP consolidation and backlog sync | `.claude/skills/wip-update/SKILL.md` |
