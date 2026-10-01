# Using the shared workflows

The fourteen supported workflows and their authority rules are listed in [AGENTS.md](../../AGENTS.md#named-workflows). Their canonical instructions live in `.claude/skills/<name>/SKILL.md`; `.agents/skills/` contains the declared Codex/Gemini discovery copies.

Use the workflow that fits the assigned task. In Claude Code, invoke its slash command with the requested scope. Other clients should follow the corresponding skill body and their supported invocation controls. A workflow does not expand repository access, approved analysis inputs, spending or publication authority. `validate` and `report-review` require explicit selection.

For model selection, subscription authentication and bounded cross-client review, follow [Tool strengths](../AGENTS/Policies/Tool_Strengths.md). For completion records, follow the [handoff protocol](../AGENTS/Policies/Handoff_Protocol.md).

When changing a workflow, update its canonical body and discovery copy together, then run:

```powershell
node scripts/agents/check-skill-mirrors.mjs
```

Use the current skill body for its procedure; do not infer instructions from an older usage guide.
