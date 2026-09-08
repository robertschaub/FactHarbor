---
name: handoff
description: Preserve task decisions, verification, ownership and next steps for another agent, using the shared FactHarbor handoff protocol.
allowed-tools: Read Glob Grep
---

Bind the handoff to the current authorized task, named base/diff and any explicit arguments. Do not infer scope from the last three commits or an active editor selection.

Read `Docs/AGENTS/Policies/Handoff_Protocol.md`. A trivial completion belongs in chat. Reuse an existing task record when sufficient; create a handoff only when continuation needs it or the user requests one.

Restricted reviewers and restricted writers return owned results, findings, warnings, learnings and review evidence in chat. Only the designated integrator persists shared records/indexes and performs authorized Git mutations. An ordinary solo writer may persist an authorized handoff within assigned paths. This skill itself grants no new write or Git authority; its tool metadata is client-specific.

Include the task/outcome, files actually changed, decisions, exact base/reviewed revision or captured diff plus changed/new-file hashes, relevant checks/results/omissions, warnings, remaining work and next steps. Concurrent assignments also identify branch/worktree, owned/excluded paths, permitted commands/state, reviewer/integrator and triggered stop conditions. Record pre-applied integrator-owned hunks separately and exclude them from worker diffs.

When a new handoff file is warranted, the integrator uses `Docs/AGENTS/Handoffs/YYYY-MM-DD_<Role>_<Task>.md` with YAML `roles`, `topics`, `files_touched` plus the protocol's applicable body fields. Append the protocol's three-line triage index entry to `Docs/AGENTS/Agent_Outputs.md`; preserve existing entries. Check whether the effective Git hook already rebuilt the index before manually rebuilding. Read-only sessions do neither.

Use the shared protocol across Codex, Claude, Gemini and Cline; no bespoke logger, exported skill archive or fixed completion template is required. State unavailable evidence instead of inventing a successful check or integrated SHA.
