# 2026-05-19 Agents Supervisor V2 Agent Setup Progress Quality Review

## Summary

As Agents Supervisor, I reviewed the V2 status/backlog, recent handoffs,
`Agent_Outputs.md`, the V2 gate register, and the current V2 code/test
footprint. I also used read-only subagents for progress and setup review.

This handoff restores the file referenced by
`Docs/AGENTS/Agent_Outputs.md`. The original pointer existed, but the target
handoff file was missing from the worktree.

## Assessment

Pipeline V2 is progressing well, but it is not yet producing analytical/report
quality. At the time of this review, the latest proven point was W4-H: hidden
product-route execution could repeat W2/W3/W4 lineage and create one bounded
extraction-input packet while keeping extraction execution, EvidenceItems,
parser, verdict/report/confidence, public behavior, cache/SR/storage, provider
expansion, and V1 cleanup closed.

Quality produced was strong for containment, provenance, fail-closed contracts,
leak prevention, and verifier discipline. It was weak for actual fact-checking
quality because EvidenceItems and verdict generation had not started.

Codex GPT-5.5 was effective as primary executor. Claude Opus 4.6 was useful as
a high-pressure reviewer/approval surface. Gemini was valuable in earlier V2
planning/model-adapter review, but there was little visible Gemini participation
in the latest W4 execution track.

Main risk: the governance/proof layer was becoming heavy. The observed V2
footprint was roughly 35k source lines and 42k focused V2 test lines;
`boundary-guard.test.ts` alone was about 9.1k lines. This was useful safety
infrastructure, but without consolidation it would slow every future slice.

## Recommendations

1. Add a machine-readable live-job tranche ledger. The W4-G to W4-H budget reset
   from remaining 2 to tranche 6 was documented in prose, but needed an explicit
   approval pointer and durable ledger.

2. Require every new V2 gate package to state what it unlocks, what older guard
   or artifact it retires or merges, and the stop condition. Avoid proof-only
   gates without an unlock target.

3. Define reviewer quorum and timeout rules for Claude/Gemini/Steering reviews.
   If Opus or Gemini times out, the fallback path should be explicit, not
   improvised.

4. Clarify Captain Deputy versus Steering Board authority in a compact matrix:
   live jobs, prompt/model changes, source text, parser execution, EvidenceItems,
   public behavior, provider expansion, and V1 cleanup.

5. Prune active handoffs. There were over 700 active handoff files, including
   hundreds of April files. This was already a real context/startup cost.

6. Keep GPT-5.5 as executor, but enforce separation at approval points: package
   author, independent reviewer, implementer, and live-canary runner should be
   clearly recorded.

7. Use Gemini selectively as challenger for additive complexity, hidden coupling,
   and broken-intermediate risk. Do not require it for every narrow
   implementation slice unless the slice expands authority.

8. Before claiming quality improvement, require evidence that V2 has reached
   EvidenceItems, extraction quality, verdict quality, and report quality against
   Captain comparator expectations. W4-H was infrastructure quality, not report
   quality.

## Warnings

- V2 was at risk of producing excellent containment machinery while delaying
  actual report-quality validation.
- Boundary-guard and handoff growth were becoming operational drag.
- Reviewer and authority boundaries needed tighter process definition to avoid
  duplicated steering or inferred approvals.

## Learnings

- Strong model effort is best spent at authority transitions, failed validation,
  and cross-stage design decisions, not uniformly on every narrow edit.
- Live-job spending needs explicit tranche accounting because budget resets in
  prose are easy to lose across agents.
- A missing handoff target behind an `Agent_Outputs.md` pointer should be treated
  as a repository hygiene defect and restored or corrected promptly.

## For Next Agent

Treat this review as the process-improvement basis that led to the later Captain
Deputy, Steer-Co, reasoning-budget, debt-sensor, gate-register, and retirement
ledger controls. Do not use it as a live roadmap snapshot; verify current state
from `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, the V2 gate
register, and the latest W5 handoffs.
