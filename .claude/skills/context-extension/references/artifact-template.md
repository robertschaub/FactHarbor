# Context Extension Artifact Template

```markdown
# Context Extension: <task slug>

Created: YYYY-MM-DD HH:mm <timezone>
Owner/session: <agent/tool/model if useful>
Repo/workspace: <path>
Branch/commit: <branch> / <commit or unknown>
Mode: session-checkpoint | agent-exchange | subagent-return | reload
Retention: active-session | agent-exchange | superseded | promoted-to-handoff | delete-after-task
Reload entrypoint: <section or first file to read>

## Why This Exists

<One or two sentences explaining what would be expensive or risky to lose.>

## Verified Observations

- <Observation> | Source: <path/link/command/job/subagent ID> | Freshness: <checked date/time>

## Decisions Made

- <Decision> | Basis: <evidence IDs or source pointers> | Reversible: yes/no

## Reviewed / Debated Conclusions

- <Conclusion> | Review/debate source: <subagent ID, debate summary, or file> | Rejected alternatives: <brief list>

## Agent Exchange Packet

- Recipient / role: <agent, role, or "future session">
- Delegated question or next phase goal: <one sentence>
- Context to load first: <specific files, sections, artifact anchors, or tool outputs>
- Constraints: <active instructions that must travel with the task>
- Expected return format: <concise output contract>

## Hypotheses

- <Hypothesis> | Confidence: confirmed/inferred/speculative | Needed check: <how to verify>

## Open Questions

- <Question> | Owner/next step: <who or what command/file>

## Reload Plan

1. Read <specific section/file/tool result>.
2. Recheck <freshness condition>.
3. Continue with <next action>.

## Do Not Trust Without Rechecking

- <Potentially stale, speculative, or environment-sensitive item.>

## Retention Action

<Delete, supersede, promote to Agent_Outputs/handoff, or keep until a named milestone.>
```

Keep artifacts concise. Prefer pointers to authoritative material over copied content.

## Local Manifest Entry

Append or update one row in `.codex/context-extension/index.md`:

```markdown
| Artifact | Updated | Owner/session | Mode | Retention | Reload entrypoint |
|---|---:|---|---|---|---|
| .codex/context-extension/YYYY-MM-DD_slug_context.md | YYYY-MM-DD HH:mm TZ | <agent/tool> | session-checkpoint | active-session | <section/file> |
```
