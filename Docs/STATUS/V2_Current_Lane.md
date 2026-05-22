# V2 Current Lane Projection

**Last updated:** 2026-05-22
**Status:** advisory projection for active coordination, not a second approval source

This file mirrors the active V2 lane so agents do not need to reconstruct the
same state from chat, WIP packages, handoffs, status, backlog, and the live-job
ledger before every step. If this projection conflicts with an implementation
package, gate register, live-job ledger, or Captain instruction, the
authoritative source wins.

## Active Goal

Use the HighJump approach to get complete internal Pipeline V2 reports through
the normal manual submission path, now that V2 is the default pipeline and the
admin job UI can display V2 report markdown. Lower only report-blocking bars
that are shown by live evidence, then raise quality, safety, and completeness
from the observed report defects.

## Current Implementation Anchor

Latest committed implementation anchor:

`79a5c31f feat(v2): default manual jobs to pipeline v2`

This commit:

- makes `claimboundary-v2` the default manual submission pipeline through UCM
  defaults, web proxy routes, API job/draft creation defaults, and runner
  missing-variant fallback;
- keeps explicit legacy `claimboundary` requests available;
- surfaces authenticated-admin V2 report markdown on the job page as a `V2
  Report` section;
- preserves public V2 as `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged` with no public verdict/truth/confidence exposure.

Runtime was verified after this commit through `/api/version`, and UCM active
`pipeline/default` was verified with `defaultPipelineVariant:
"claimboundary-v2"`.

## Active Quality Repair

Latest HighJump quality repair:

`298ad76f fix(v2): align highjump boundary verdict comparisons`

Package:

`Docs/WIP/2026-05-22_V2_HighJump_HJ21_W7B_Comparator_Alignment_Repair.md`

HJ21 amends only `V2_BOUNDARY_VERDICT_EXECUTION` with topic-neutral comparator
alignment guidance. It targets the HJ20 quality defect where the hydrogen-family
internal report led with `MIXED` despite the report containing a stronger
false-side alternative.

Repo search on 2026-05-22 found no committed HJ21 canary result and no ledgered
HJ21 job id. Treat HJ21 as locally implemented, committed, and verifier-clean,
but not yet live-validated.

## Latest Canary Result

Latest committed and ledgered report-producing canary:

`PASS_X7_HJ20_W5_OUTPUT_SHAPING_INTERNAL_REPORT_WRITER_DRAFT_CREATED`

Job:

`53f22512b9aa41b5ab23b774e2ddf10f`

Runtime:

`a7a73479d62779ad7b22868898fb50d0d09634c6`

Information yield:

`report produced`

Important hidden evidence:

- W5 accepted `4` EvidenceItems.
- W8-B created an internal Alpha result candidate with `3` boundary candidates,
  `2` verdict candidates, and `4` cited EvidenceItem refs.
- W8-G created a `7843` byte internal Alpha draft.
- HJ19 internal report writer created an `8759` byte hidden report draft.
- Public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`.

The HJ20 draft is useful quality evidence, but it is not the current runtime
state. The next canary should run from the latest committed source
`79a5c31f`.

## Live Budget

Active HighJump continuation tranche:

- ledger: `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`;
- current remaining before the next HighJump canary: `4`;
- every live job still requires clean git status, committed source, runtime
  refresh when needed, runtime commit match, and result documentation.

## Next Action

1. Keep this projection, `Docs/STATUS/Current_Status.md`, and
   `Docs/STATUS/Backlog.md` aligned to `79a5c31f`.
2. Confirm clean git status and runtime freshness at `79a5c31f`.
3. Run one HJ21/post-default canary using the Captain-defined hydrogen input
   through the default manual submission path, without forcing legacy V1.
4. Verify that the resulting job is V2, the authenticated admin job UI can show
   the V2 report, and public/default surfaces stay contained.
5. Judge the next step from observed report evidence:
   - if a complete internal V2 report is produced, review report quality and
     raise the single highest-value report-quality bar next;
   - if the same HJ20/HJ21 comparator defect remains, repair that existing W7-B
     prompt mechanism;
   - if a new stop appears, fix the smallest existing mechanism that blocks full
     report generation.

## Stop Conditions

Stop and reconvene Steer-Co, or escalate to Captain only if needed, when:

- runtime commit does not match the committed source under test;
- the default manual submission path unexpectedly runs V1;
- route/default-admin/public/log/error surfaces leak report text, source text,
  prompt text, provider payload, hidden ids, or public verdict/truth/confidence;
- the next repair would require retries, schema relaxation, a parallel report
  path, source/provider expansion, public behavior, V1 cleanup, parser/cache/SR
  storage, ACS/direct URL, or another hidden mechanism;
- a standing Captain approval gate is reached or team consent fails on a
  material decision.

Do not stop for routine implementation mechanics inside the current
HighJump/report-quality path.

## Coordination Rules For This Lane

- Keep HighJump operational: make the next report capability safe enough; do
  not avoid it by adding another readiness layer.
- Prefer amending existing prompt/report mechanisms over adding plumbing.
- Use Steer-Co for direction changes, material dissent, or unclear failed
  validation, not routine runtime refresh or canary mechanics.
- Use `context-extension` only if delegating complex state, crossing a phase
  boundary, or preserving expensive-to-reconstruct findings.
- Keep process improvements separate from technical steering unless they remove
  concrete friction in this active lane.
