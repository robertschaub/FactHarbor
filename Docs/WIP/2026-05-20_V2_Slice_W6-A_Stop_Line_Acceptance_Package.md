# V2 Slice W6-A Stop-Line Acceptance Package

Date: 2026-05-20
Status: review-only acceptance package
Owner: Captain Deputy
Scope: V2 governance only

## 1. Accepted Stop Baseline

W6-A accepts the current P2 pause baseline:

- X7-W5-G passed as `PASS_X7_W5_G_EVIDENCE_ITEM_HANDOFF_PROJECTION_CANARY`.
- X7-W5-G job id:
  `19f831aa36084ab6a2cee9e89698f87c`.
- X7-W5-G proved hidden W5-F EvidenceItem handoff projection reachability,
  same-ledger lineage, and default redaction.
- X7-W5-H is committed as `b9286fb1` and retired the standalone W4-I internal
  admin route and route test.
- W4-I core denial, runtime ownership, provenance, and process-local sink remain
  for W5 lineage.
- Public V2 remains intentionally blocked:
  `_schemaVersion = 4.0.0-cb-precutover`,
  `publicCutoverStatus = blocked_precutover`, and
  `analysisIssueCode = report_damaged`.
- `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json` has
  `activeTranche.currentRemaining = 0`.

This is a stable stop point, not report-quality evidence and not cutover
readiness.

## 2. Authority Of The Stop-Line Plan

Authoritative for governance:

- V2 source/runtime implementation remains paused until a separately accepted
  package resumes it.
- The next positive stop line is an internal direct-text Alpha `ReportResult`
  candidate.
- The next implementation package must start at W6-B:
  `EvidenceItemHandoffDecision -> internal sufficiency intake contract`.
- Future W6-B/W6-C packages must name exact owners, allowed files, blocked
  surfaces, verifier sets, and retirement-ledger impact before code work.
- Live jobs remain unavailable while the live-job tranche ledger is `0`.

Non-authority:

- The stop-line plan does not authorize W6-B implementation.
- It does not authorize live jobs, canaries, runtime refresh for a canary, or a
  new tranche.
- It does not authorize public API/UI/report/export/compatibility behavior.
- It does not authorize public cutover, V1 cleanup, or V1 removal.
- It does not authorize prompt/model/config/schema edits or approval flips.
- It does not authorize parser execution, cache/SR/storage behavior, provider
  expansion, W2/W3 widening, ACS/direct URL support, or Source Reliability
  verdict weighting.
- It does not authorize new hidden proof machinery except where a future package
  proves direct scorecard value or retires/merges existing machinery.

## 3. Remaining Dissent Or Approval Needed

Known dissent: none recorded after the stop-line second review and P2 Pause
Reconciliation.

Approval still needed:

- Captain approval to draft W6-B package may be given after W6-A acceptance.
- Separate approval is required before any W6-B implementation.
- Separate Captain approval is required before any live-job tranche reset or
  canary.
- Separate approval is required before prompt/model/config/schema behavior
  changes.

## 4. Required Review Team For W6-B

Minimum W6-B review team:

- Captain Deputy: authority, scope, scorecard, retirement ledger, stop triggers.
- Lead Developer: implementation feasibility, file envelope, verifier plan.
- Lead Architect: sufficiency contract placement and stage sequencing.
- LLM Expert: semantic ownership, no deterministic semantic logic, prompt/model
  gate checks.
- Product Trust / Report Quality reviewer: warning materiality, report-value
  relevance, no Alpha-as-public-readiness drift.
- Code Reviewer / Security reviewer: redaction, default-admin/public leak
  checks, side-effect and no-store boundaries.

Optional reviewer if W6-B proposes any prompt/model/config/schema behavior:

- Claude Opus 4.6 LLM/prompt reviewer plus one diverse LLM reviewer before
  implementation approval.

## 5. Precise W6-B Package Boundary

W6-B may be drafted as a review package only with this boundary:

```text
EvidenceItemHandoffDecision -> internal sufficiency intake contract
```

Allowed W6-B draft content:

- exact sufficiency owner/module name under
  `apps/web/src/lib/analyzer-v2/evidence-lifecycle/`;
- exact test envelope under
  `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/`;
- accepted input contract:
  `EvidenceItemHandoffDecision` with
  `handoffStatus = evidence_items_ready_for_downstream_internal_handoff`;
- blocked/damaged handling for missing, damaged, or lineage-incomplete W5-F
  handoff;
- internal-only sufficiency intake shape;
- side-effect ledger proving no report, verdict, warning, confidence, public,
  cache, SR, provider, parser, storage, ACS/direct URL, or V1 behavior;
- default no-store stance;
- redaction posture: hash/length/provenance-only by default;
- retirement-ledger decision for remaining W4-I core/sink lineage debt:
  merge, narrow, keep with sharper trigger, or quarantine.

W6-B must be contract/test-only unless the package explicitly obtains later
approval for a semantic sufficiency task. W6-B must not silently treat W5-G
canary evidence as current runtime sufficiency success.

## 6. Forbidden Scope

W6-A and any W6-B draft must not include:

- source/runtime implementation in W6-A;
- W6-B implementation before approval;
- live jobs or canaries;
- public output, cutover, UI, export, API, report, or compatibility projection;
- prompt/model/config/schema edits or approval flips;
- LLM sufficiency execution unless separately approved;
- deterministic semantic text-analysis logic;
- EvidenceItems beyond the already accepted W5 handoff;
- parser execution;
- cache/SR/storage behavior;
- provider expansion, W2/W3 widening, ACS/direct URL;
- V1 reuse, cleanup, or removal;
- new hidden route/proof/diagnostic/guard machinery without scorecard value and
  retirement-ledger impact.

## 7. Stop Triggers

Stop and reconvene Steer-Co if:

- anyone proposes implementation before W6-B approval;
- live-job execution is proposed while tranche remaining is `0`;
- W6-B cannot name exact owner files and verifier files before code work;
- W6-B needs prompt/model/config/schema behavior;
- W6-B needs public/default-admin text exposure;
- W6-B needs source text, EvidenceItem text, snippets, summaries, prompt text,
  provider payloads, hidden ledger ids, or internal statuses in public or
  default-admin projections;
- sufficiency is implemented through keywords, regex, hardcoded topic
  categories, deterministic language assumptions, or rule-based semantic
  scoring;
- hidden mechanism count increases without retiring/merging/quarantining older
  machinery;
- a verifier failure has unclear root cause.

## 8. Recommendation

W6-A is clean as a review-only stop-line acceptance package.

Recommendation: Captain may authorize drafting W6-B next, but only as a review
package. Do not authorize W6-B implementation in the same step.
