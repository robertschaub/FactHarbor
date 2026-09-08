## Summary

What changed?

Why?

## Scope

- Areas touched:
- Repository / full base SHA:
- Task branch / worktree identifier (no local machine paths):
- Owned files:
- Boundaries (in/out of scope, read/write restrictions):
- Permitted commands / writable state paths (repository-relative, or none):
- Reviewer / designated integrator:
- Stop conditions / unresolved blockers:
- Risk level: low / medium / high
- Follow-up work:

## Verification

Relevant checks, expected results, actual commands/results and omissions with reasons:

Provider-spending/live operations, if any: current action/scope authorization and results.

For concurrent work, identify the §4.3 writer mode. Restricted writers return edits; the integrator stages/commits only owned reviewed content. List pre-applied integrator-owned hunks separately from worker diffs.

Exact reviewed-revision evidence ([Collaboration Rules §4.3](../Docs/AGENTS/Multi_Agent_Collaboration_Rules.md#43-concurrent-editing)):

- Full reviewed SHA (or base SHA + captured diff and hashes of every changed/new file):
- Reviewer / outcome / findings reference (restricted-reviewer chat findings persisted by integrator):
- Check commands / results / checked SHA or content evidence; omissions and reasons:
- Integration SHA / mapping to reviewed content; renewed review/checks after content changes:

## FactHarbor Review Checklist

- [ ] No domain-specific hardcoding was introduced
- [ ] No new deterministic text-analysis decision logic was introduced
- [ ] Analysis-affecting prompt/search text is UCM-managed, not hardcoded inline
- [ ] Analysis-affecting tunables were placed in UCM when appropriate
- [ ] Current terminology is preserved (`AtomicClaim`, `ClaimAssessmentBoundary`, `EvidenceScope`, `EvidenceItem`)
- [ ] I did not extend removed or replaced pipelines/terminology
- [ ] Code changes were cross-checked against relevant docs, or docs were updated if behavior changed
- [ ] Prompt/config changes kept file-backed defaults and admin-visible config expectations in sync
- [ ] Warnings/severity changes follow the verdict-impact rules in `AGENTS.md`

## Notes For Review

Anything a future reviewer or your future self should pay attention to:
