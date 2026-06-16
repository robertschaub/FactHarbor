<!-- Sync with /AGENTS.md. Last synced: 2026-05-24 -->

# GEMINI.md

> **System Instruction for Gemini Agents (CLI & Code Assist)**

## Model Configuration
**REQUIRED MODEL:** `gemini-3.1-pro-preview` (or latest available `pro` variant).

*   **Gemini CLI:** Ensure you are initialized with `gemini-3.1-pro-preview`.
*   **Gemini Code Assist:** If the IDE allows model selection, select `Gemini 3.1 Pro Preview`.

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
*   **Reasoning:** Use the high-reasoning capabilities of Gemini 3.1 Pro for architectural decisions and complex refactors.
*   **Bugfixing:** For bugfixes, regressions, failing tests/builds, review findings, runtime defects, and failed-validation recovery, apply the compact `AGENTS.md` bugfix complexity heuristic: identify the existing mechanism, prefer amend/delete/quarantine before adding parallel paths, name the verifier, and state expected net mechanism impact.
*   **Agent balance:** Default to one accountable implementer. Add an independent reviewer for high-risk, cross-stage, prompt/config, live-job, public-surface, repeated-failure, unclear-root-cause, or explicitly requested work.
*   **Code Style:** Follow patterns in `apps/web/src/lib/analyzer/`.
*   **Learnings:** Check `Docs/AGENTS/Role_Learnings.md` for recent lessons before starting complex tasks.
*   **Diffs:** Always provide unified diffs for code changes.
*   **Internal knowledge startup:** If your Gemini surface supports MCP and `fhAgentKnowledge` is configured, call `preflight_task` first for role-activated or ambiguous tasks. Otherwise use `npm run fh-knowledge -- preflight-task -- --task "..." [--role ...] [--skill ...]`; if unavailable, fall back to the generated indexes.

## Report Quality Reviews

When judging report quality, compare the target report with `Docs/AGENTS/Captain_Quality_Expectations.md`, `Docs/AGENTS/benchmark-expectations.json`, `Docs/AGENTS/report-quality-expectations.json`, and the best usable comparator reports listed in the Captain expectations file. State whether comparators are exact or variants, local or deployed, and current-stack or historical. If no best comparator exists, say so explicitly.

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

| Task | Workflow file |
|---|---|
| Deep pipeline analysis | `.claude/skills/pipeline/SKILL.md` |
| Full quality audit | `.claude/skills/audit/SKILL.md` |
| Post-change validation | `.claude/skills/validate/SKILL.md` |
| Generate handoff document | `.claude/skills/handoff/SKILL.md` |
| Debug log + test analysis | `.claude/skills/debug/SKILL.md` |
| Explain code | `.claude/skills/explain-code/SKILL.md` |
| Prompt deficiency diagnosis | `.claude/skills/prompt-diagnosis/SKILL.md` |
| Job report review | `.claude/skills/report-review/SKILL.md` |
| Documentation guardrail | `.claude/skills/doc-guard/SKILL.md` |
| Docs cleanup and update | `.claude/skills/docs-update/SKILL.md` |
| WIP consolidation and backlog sync | `.claude/skills/wip-update/SKILL.md` |
