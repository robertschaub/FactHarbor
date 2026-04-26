---
name: context-extension
description: Preserve, exchange, and reload high-value working context throughout long agent sessions. Use when Codex/Claude has gathered expensive-to-reconstruct file readings, tool outputs, decisions, hypotheses, subagent results, validation state, or reviewed/debated conclusions that may be needed after compaction, resume, handoff, model/context switch, or delegation to another agent. Also use when the user explicitly asks to save, externalize, checkpoint, exchange, rehydrate, or reload working context. Do not use for completed-task reporting; use the Exchange Protocol, Agent_Outputs, or handoff files for completion outputs.
---

# Context Extension

Use this skill to externalize only the working state that is worth reloading later or worth sharing with another agent. It is a session working-memory and agent-exchange workflow, not a second memory system and not a replacement for source files, current docs, or the Exchange Protocol.

For FactHarbor, `.claude/skills/context-extension/SKILL.md` is the canonical workflow. The user-level Codex copy at `C:\Users\rober\.codex\skills\context-extension\SKILL.md` exists for Codex auto-triggering and must be treated as a mirror. If the two copies differ, follow the repo copy and resync the user-level copy.

## Trigger Gate

Use the skill when at least one condition is true:

- A long session has accumulated decisions, evidence, or open questions that should survive the next phase.
- Context pressure is likely before the task is done.
- A compaction, resume, tool switch, branch switch, or interruption would lose important state.
- You have read many files, logs, PR comments, reports, or subagent outputs that would be expensive to rediscover.
- You are about to move from investigation to implementation or from implementation to verification and need a compact phase checkpoint.
- You are delegating to another agent and need a bounded context packet instead of a broad conversation dump.
- You have reviewed, debated, and consolidated a decision that should be handed to the next phase or another agent before it is committed or acted on.
- The user asks to save, checkpoint, externalize, exchange, reload, rehydrate, or preserve working context.

Do not use it for routine small tasks, final summaries, completion handoffs, raw transcript storage, broad file dumps, secrets, credentials, production/customer data, or material better recovered from authoritative source files.

## Overlap Gate

Before writing or reloading an artifact, choose the owning workflow:

| Need | Owning workflow | Context-extension role |
|---|---|---|
| Find startup context, role fit, prior handoffs, stage owners | `fhAgentKnowledge.preflight_task` / AGENTS startup protocol | Use only after preflight when the active session needs a local working checkpoint |
| Complete a non-trivial task or role handoff | Exchange Protocol / `/handoff` | Link or promote selected working notes; never replace the durable output |
| Run adversarial decision-making | `/debate` | Store the compact debated conclusion and rejected alternatives after debate |
| Clean living docs or archive WIP/handoffs | `/docs-update` or `/wip-update` | Checkpoint investigation state only if the doc cleanup is long-running |
| Analyze pipeline, reports, prompts, debug logs, or validation | `/pipeline`, `/report-review`, `/prompt-diagnosis`, `/debug`, `/validate`, `/audit` | Store reload pointers and intermediate state; do not duplicate those workflows' analysis rules |
| Explain code to a human | `/explain-code` | Usually none; use only if the explanation session becomes long and needs a reload packet |

If another workflow owns the outcome, run that workflow first. Context-extension may carry the state between phases, but it must not become the place where the real work is performed or recorded.

Phase-boundary and after-debate checkpointing is optional. Create a context-extension artifact only when the state would be materially expensive to reconstruct from existing outputs, tool logs, handoffs, or workflow return values.

Do not create a context-extension artifact when the owning workflow final output, required handoff, `Agent_Outputs.md` entry, or subagent return already preserves the needed state with enough fidelity for continuation.

## Session Rhythm

For long-running work, consider context-extension at these points:

1. **Session start / resume:** look for an existing artifact only if the user or prior handoff points to one; otherwise use normal preflight and source reads.
2. **After investigation:** checkpoint source readings, subagent findings, candidate hypotheses, and the exact evidence that survived review.
3. **Before delegation:** write a compact exchange packet with the delegated question, relevant evidence pointers, constraints, and known gaps.
4. **After subagent return:** fold only verified or useful findings into the active artifact; keep rejected arguments visible if they affected the decision.
5. **Before compaction or pause:** update the reload plan and mark what must be rechecked.
6. **Before completion:** delete, supersede, or promote selected content through the Exchange Protocol.

## Operating Modes

Use one explicit mode per write or reload action:

| Mode | Use for | Retention |
|---|---|---|
| `session-checkpoint` | Phase-boundary working memory inside a long session | `active-session` until superseded |
| `agent-exchange` | Bounded packet for another agent or future session | keep until `superseded` or `promoted-to-handoff` |
| `subagent-return` | Compact return packet from a delegated agent | parent verifies and merges selected content |
| `reload` | Rehydrate prior working context | read-only until freshness checks pass |

Keep the three record types distinct:

- Context-extension artifacts are volatile working packets.
- Exchange Protocol outputs are durable completion and role-handoff records.
- `Docs/WIP/` files are formal collaborative investigation or design docs.

## Efficiency Budget

Use the smallest artifact that preserves continuity:

- Keep one active artifact per task slug whenever possible.
- Update at phase boundaries, delegation points, subagent returns, compaction/pause, or explicit user request. Do not update after every tool call.
- Prefer pointers over copied text. A good artifact tells the next agent what to reopen, not everything you saw.
- Keep `Verified observations` and `Reload plan` short enough to scan quickly; split only when a single artifact would become harder to use than rereading sources.
- Keep `.codex/context-extension/index.md` to active or recently superseded artifacts only; remove stale rows when artifacts are deleted or promoted.
- If writing the artifact would take longer than reconstructing the context from authoritative files, do not write it.
- If the owning workflow output already preserves the needed state, do not write a duplicate context-extension artifact.

## Authority Rules

- User instructions, AGENTS.md, closer path-specific AGENTS.md files, role files, current source files, current docs, and current tool output are authoritative.
- Context-extension artifacts are advisory reload indexes. Treat their claims as stale until checked against current files, branch, and date.
- Never let an artifact launder speculation into fact. Label hypotheses, decisions, open questions, and verified observations separately.
- If the task is complete, follow the Exchange Protocol instead of writing another context artifact.

## Artifact Location

Prefer a task-local hidden folder:

```text
.codex/context-extension/
```

In FactHarbor this path is gitignored. Treat artifacts there as local temporary state unless the user explicitly asks to publish them or you promote selected content into the normal Exchange Protocol output.

Use this naming pattern:

```text
YYYY-MM-DD_<short-task-slug>_context.md
```

Maintain a local manifest at:

```text
.codex/context-extension/index.md
```

The manifest lists active artifacts, owner/session, updated time, mode, retention, and reload entrypoint. It is local and gitignored like the artifacts. Use it at session start or resume only when continuing prior work, not for unrelated tasks.

For FactHarbor, do not use `Docs/WIP/` for these artifacts unless the content is intentionally becoming a formal collaborative WIP document. Temporary context artifacts should stay outside normal docs.

## Write Flow

1. State briefly that you are externalizing working context and why.
2. Run a sensitivity check before writing: exclude secrets, credentials, tokens, production/customer data, private keys, raw environment dumps, and raw logs likely to contain sensitive material.
3. Create or update one artifact for the active task.
4. Keep the artifact compact. Store reload pointers and summaries, not full transcripts.
5. Include stable identifiers for anything future agents must reload: absolute or repo-relative paths, line anchors when known, command names, job IDs, PR numbers, commit SHAs, subagent IDs, and source URLs.
6. Separate:
   - `Verified observations`
   - `Decisions made`
   - `Hypotheses`
   - `Open questions`
   - `Reload plan`
   - `Do not trust without rechecking`
7. Add retention state: `active-session`, `agent-exchange`, `superseded`, `promoted-to-handoff`, or `delete-after-task`.
8. If the artifact is in-repo and should be discoverable, mention it in the next status update or handoff. If it is purely temporary, delete or supersede it before final completion when practical.
9. After writing, scan the artifact once for accidentally copied sensitive values or raw dumps before continuing.
10. Update `.codex/context-extension/index.md` with the artifact path, mode, retention, updated time, and reload entrypoint.

Use `references/artifact-template.md` for the exact section layout.

## Agent Exchange Flow

Use context-extension for agent-to-agent working exchange when a subagent or future agent needs more than a one-sentence brief but less than the full conversation.

1. Write an exchange packet in the same artifact or a new artifact with `exchange` in the slug.
2. Include:
   - the delegated question or next phase goal;
   - stable evidence pointers and source paths;
   - decisions already made and whether they are open to challenge;
   - known gaps and forbidden assumptions;
   - constraints from AGENTS.md, role files, active skills, and user instructions;
   - expected return format.
3. Give the receiving agent the artifact path plus the narrow task. Do not ask it to read unrelated artifacts.
4. When the receiving agent returns, verify its claims against authoritative sources before updating the artifact.
5. If a debate/review produced the exchange packet, record the debated alternatives and why they were accepted or rejected.

For subagent returns, require the receiving packet to include: assigned task, files inspected, verified observations, unresolved questions, confidence level, and exact reload pointers. Merge only selected verified content into the active parent artifact; keep rejected or unverified claims in a clearly labeled section if they affected the decision.

Subagents usually return their packet in their final response. The parent agent owns writes to `.codex/context-extension/` unless the user explicitly asks a worker to edit shared artifacts. This avoids concurrent artifact edits and keeps one agent accountable for the manifest.

## Reload Flow

1. Read only the artifact sections needed for the current step.
2. Verify freshness before acting:
   - current branch and git status;
   - whether referenced files still exist;
   - whether referenced files changed after the artifact;
   - current date for time-sensitive facts;
   - whether user instructions have changed since the artifact was written.
3. Reopen authoritative files or tool outputs for any claim that affects edits, validation, review findings, or final conclusions.
4. Load narrow source slices rather than the whole prior context. Prefer the artifact's reload plan.
5. Mark stale or contradicted artifact content as superseded in your own reasoning and continue from current evidence.

## Failure Handling

- If no artifact exists, rebuild from authoritative sources and continue.
- If the artifact conflicts with current source files or user instructions, trust the current source or user instruction.
- If the artifact contains sensitive material, stop using it, remove the sensitive content if safe, and report the issue.
- If many small artifacts exist, consolidate only the still-useful reload pointers into one current artifact and ignore the rest.

## Completion

At task completion:

- Apply the artifact's retention action explicitly: delete, supersede, or promote selected content into the required Exchange Protocol output.
- Delete `delete-after-task` artifacts unless the user explicitly asks to keep them.
- Mark `active-session` artifacts as `superseded` or `promoted-to-handoff` if their content must survive completion.
- Promote still-useful in-progress context into the required Exchange Protocol output only when the task tier requires it; do not promote raw artifacts wholesale.
- Do not leave context-extension artifacts as the only record for significant completed work.
