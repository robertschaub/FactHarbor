## Summary

What changed?

Why?

## Scope

- Areas touched:
- Risk level: low / medium / high
- Follow-up work:

## Verification

- [ ] `npm test`
- [ ] `npm -w apps/web run build`
- [ ] `dotnet build apps/api -c Release`
- [ ] I did not run expensive live LLM tests
- [ ] I intentionally ran expensive live LLM tests and documented why

Expensive live tests run, if any:

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
