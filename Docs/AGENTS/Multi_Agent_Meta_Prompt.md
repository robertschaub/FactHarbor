# FactHarbor task assignment template

For ordinary solo work, use a concise task, relevant area and acceptance criteria. Read root/applicable nested instructions, then self-serve only relevant source/history. Trivial fixes need no mandatory preflight or handoff file.

For concurrent work, the integrator fills the contract below before dispatch. [Collaboration Rules §4.3](Multi_Agent_Collaboration_Rules.md#43-concurrent-editing) owns writer modes, state ownership and exact review/integration evidence.

```text
Role / task / area:
Repository / full base SHA:
Integrator-supplied branch / worktree (local path only in private/session records):
Owned files / excluded paths / acceptance criteria:
Mode: read-only reviewer | restricted writer | explicitly authorized worker-commit mode | solo integrator
Client / model / permitted tools and commands:
Writable output / cache / temp / database / recovery paths (or none):
Controls: mechanism, tracked/local/UI location, trust/activation, installed checks and unknowns:
Required checks / expected results / justified omissions:
Independent reviewer / sole integrator:
Expected pre-applied integrator-owned hunks and hashes, excluded from worker diff:
Stop conditions: wrong repository/base/worktree; unexpected edits or overlap; needed unassigned write/command; failed required restriction; unresolved findings; reviewed-content drift.
Handoff: base SHA, captured owned diff, hashes of every changed/new file, checks, findings, warnings and learnings.
Integration: integrator records resulting SHA and mapping to reviewed content.
```

Include this definition in every restricted-writer assignment: **Edit only assigned files in the integrator-supplied worktree. Return working-tree edits and evidence. Do not stage, commit, merge, pull, create/switch branches or worktrees, or change shared settings/hooks.** This names a handoff model, not proven containment. Do not dispatch a writer if its required restriction cannot be established. The adopted instruction-system rollout uses this mode for all concurrent writers; other authorized modes remain available outside it.

Restricted reviewers return findings in chat; specify source inspection versus supplied-evidence-only review. The integrator writes needed completion artifacts and serializes shared records/indexes. Use [Handoff Protocol](Policies/Handoff_Protocol.md) for transfers; reuse an existing task record when sufficient.

Strict read-only diagnosis uses captured failures and source. If reproduction is known to be necessary and authorized, assign diagnosis/reproduction together with its writable state, rather than requiring a second session.

Pushes, deployments, live analyses, and provider-spending operations require current authorization covering the specific action and scope. Authorization already given in the task remains valid; preparation or review alone does not grant it.

For an independent investigation, specify the question, scope, evidence and assigned spoke. Investigators do not read other findings before forming their own; only the integrator updates the hub/tracker. See Collaboration Rules §3.4 for requested multi-agent investigations, not routine task choreography.
