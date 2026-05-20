# V2 Retirement And Convergence Ledger

**Status:** Active draft
**Owner:** Captain Deputy / Lead Developer
**Last updated:** 2026-05-20
**Purpose:** Track what must be kept, retired, merged, quarantined, or deferred so V2 converges instead of accumulating permanent proof machinery.

This ledger is not a cleanup authorization. Deletions, public cutover, prompt
changes, model/config changes, live jobs, and V1 cleanup still require their
normal approval gates.

## Ledger Rules

1. Every substantial V2 package must update or reference at least one row.
2. New hidden readiness, denial, proof, diagnostic, guard, or route machinery
   requires an owner and removal/merge trigger.
3. V1 cleanup remains blocked until V2 owns and verifies the equivalent public
   path, cutover stabilizes, and the cleanup verifier passes.
4. Historical investigation remains available through git history, tags,
   fixtures, and archived docs, not by keeping obsolete runtime mechanisms live.
5. `npm run debt:sensors` is advisory context until Captain promotes thresholds.

## Status Key

| Status | Meaning |
|---|---|
| keep | Needed for current V2 path |
| merge | Keep behavior but consolidate into a smaller owner |
| quarantine | Remove from active path but keep as documented historical/test artifact |
| retire | Delete or remove from active governance/runtime once trigger is met |
| defer | Reassess later; do not build now |
| blocked | Cannot act until an approval or cutover prerequisite exists |

## Active Ledger

| ID | Mechanism / Artifact | Current Status | Owner | Removal / Merge Trigger | Next Action |
|---|---|---|---|---|---|
| V2-RL-001 | V1 ClaimAssessmentBoundary runtime path | blocked | Lead Developer | V2 owns equivalent public Understand -> Research -> Verdict -> report path, cutover stabilizes, cleanup verifier passes | Map V1 surfaces to V2 replacement coverage before any cleanup |
| V2-RL-002 | `apps/web/src/lib/analyzer-v2/` rebuild naming and `4.0.0-cb-precutover` labels | keep | Lead Architect | V1 deletion complete and V2 is the public authority | Later naming-normalization slice removes unnecessary rebuild labels |
| V2-RL-003 | V2 public cutover guard (`publicCutoverStatus`) | keep | Lead Architect | Never before public cutover; after cutover, merge into stable public compatibility contract | Keep fail-closed tests mandatory |
| V2-RL-004 | V2 hidden observability ledger and admin-only artifact routes | keep | Lead Developer | Stable persisted/run-ledger design exists and public cutover path no longer needs process-local proof routes | Merge route families and reduce duplicate hidden artifact projections |
| V2-RL-005 | W2 transport diagnostic packages DIAG2/DIAG3/DIAG4/DIAG5 | retire | Lead Developer | W2/PIV1-A bounded provider network remains stable and no further transport diagnosis is needed | Do not add more diagnostics without retiring older taxonomy/probe docs |
| V2-RL-006 | W2/TR1 transport repair result package | quarantine | Lead Developer | PIV1-A remains accepted as the current path and no TR1 rerun is authorized | Keep as historical pivot evidence; do not continue TR1 repair |
| V2-RL-007 | W3-A search-result preview materialization | merge | Lead Developer | W3-B or later Source Material path owns the useful locator/materialization contract | Merge preview-only checks into Source Material path or quarantine as diagnostic |
| V2-RL-008 | W3-B bounded page-summary Source Material | keep | Lead Developer | Broader Source Material owner exists and W3-B behavior is absorbed into the general source-material contract | Use as first real Source Material reference until generalized |
| V2-RL-009 | W4-A/W4-C/W4-D/W4-E readiness/shell/denial chain | merge | Lead Developer | W5-E or later EvidenceItem admission owner supersedes intermediate proof-chain inspection while preserving parent lineage checks | X7-W5-E marks the W4 proof role as merged into W5/W5-E same-ledger lineage; do not add new W4 proof consumers |
| V2-RL-010 | W4-G bounded corpus-text sidecar | keep | Lead Developer | EvidenceCorpus text-bearing record becomes the stable internal owner | Keep W4-G as parent text lineage for W5-E admission; merge sidecar into EvidenceCorpus storage/contract when extraction/report path is approved |
| V2-RL-011 | W4-H bounded extraction-input packet | keep | Lead Developer | Approved extraction executor and W5-E admission consume the packet and own the stable input contract | Keep exact lineage checks; do not widen before downstream EvidenceItem/report owner review |
| V2-RL-012 | W4-I execution-readiness denial | merge | Lead Developer | W5-F EvidenceItem handoff projection is verified; then remove or merge the standalone W4-I route/sink when no downstream inspection still needs it | X7-W5-E3 proved W5-E admission and same-ledger containment. X7-W5-F defines `EvidenceItemHandoffOwner`, reuses the W5 route projection, marks W4-I as `historical_same_ledger_evidence_merged`, retires `remove_or_merge_route_after_w5e_canary_and_next_evidence_handoff_owner`, and replaces it with `after_w5f_handoff_route_projection_verified`. W4-I core eligibility logic is retained temporarily; do not add new W4-I consumers. |
| V2-RL-013 | Boundary guard monolith test (`boundary-guard.test.ts`) | merge | Lead Developer | Guard sections are split into focused owners without losing coverage | Plan a test-structure split after current gates stabilize |
| V2-RL-014 | V2 WIP/handoff volume | retire | Captain Deputy | Consolidated current-truth docs cover active decisions and old WIP is archived | Run docs consolidation after next bounded orchestration review |
| V2-RL-015 | Captain Deputy / Steer-Co / reasoning-budget governance package | keep | Agents Supervisor | Operating model proves too heavy or review finds authority duplication | Bounded orchestration review checks scope and cost discipline |

## Required Block In Future Packages

```text
V2 RETIREMENT LEDGER IMPACT
Rows touched:
Status changes:
New mechanism owner:
Removal / merge trigger:
Debt accepted:
```

## Current Debt Sensor Snapshot

Latest observed `npm run debt:sensors` state on 2026-05-20:

- V2 source: `41734` lines over advisory threshold `30000`
- V2 tests: `46867` lines over advisory threshold `40000`
- Boundary guard: `10131` lines over advisory threshold `6000`
- Docs/WIP markdown files: `213` over advisory threshold `180`
- Handoff markdown files: `727` over advisory threshold `650`
- Net mechanism increases: `14`
- V2 consolidation-marker review files: `5`

The snapshot is a steering signal. It does not block work by itself.

## Near-Term Convergence Targets

1. Move the next V2 slice toward real evidence/report value, not another
   hidden-only denial layer unless Steer-Co grants an exception.
2. Merge or quarantine W4 readiness/shell/denial chain pieces once a stable
   EvidenceCorpus/extraction owner exists.
3. Split or consolidate the oversized boundary guard after the next V2 gate is
   stable.
4. Archive or consolidate stale WIP/handoff material after the bounded
   orchestration review.
