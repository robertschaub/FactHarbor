# V2 Slice X7-W5-E EvidenceItem Admission And Consolidation Review Package

Date: 2026-05-20
Status: review package; no implementation authorized by this document
Author: Captain Deputy / Steer-Co

## 1. Purpose

X7-W5-D proved that the product V2 hidden chain can produce schema-valid,
accepted bounded EvidenceItems from the runtime-owned W4-H packet while public
V2 remains `4.0.0-cb-precutover` / `blocked_precutover`.

The next slice should not add another hidden denial or diagnostic layer. It
should define the first downstream admission/consumption contract for accepted
hidden EvidenceItems and, in the same package, require concrete consolidation
for the W5-C diagnostics and W4-I/W4-chain proof machinery that W5-D has now
superseded in part.

## 2. Ground Truth

- W5-D prompt-contract implementation commit: `76984bca`
- W5-D live-result docs commit: `f43fd779`
- Current HEAD at package drafting: `6487cb31`
- Valid W5-D canary job: `08291671a7d44a74b9fc048b6a32a7b5`
- Runtime commit for valid canary: `76984bca20840c3c2e9c02449a0e481ec151a02b`
- Valid canary classification: `PASS_X7_W5_D_EVIDENCE_EXTRACTION_SCHEMA_REPAIR_VERIFIED`
- W5 result status: `hidden_evidence_item_extraction_completed`
- Extraction result status: `accepted`
- Extraction status: `evidence_extracted`
- EvidenceItem count: `2`
- Schema diagnostics: `null`
- Retry count: `0`
- W5 token usage: `4159` total tokens
- W5 model duration: `8053ms`
- Public result remained `report_damaged`, `4.0.0-cb-precutover`,
  and `blocked_precutover`.
- Default hidden artifact projection remained hash/length/provenance-only.
- Public/default-admin/log/error text leak checks passed for W5-D.

Operational note: wrong-variant job `ee086cd0e9b44c3ea88c388e96f2eaf6` was
cancelled and is not V2 evidence. Future live execution packages must avoid the
legacy `claimboundary` helper shape and require `claimboundary-v2` route proof.

## 3. Steer-Co Consolidated Direction

Steer-Co reviewed three options after W5-D:

- A: downstream EvidenceItem admission/consumption package only;
- B: consolidation/retirement package first;
- C: combined narrow review package that defines the next EvidenceItem
  admission/consumption step while requiring concrete W5-C/W4-I/W4-chain
  merge or quarantine action in the same package.

Consensus: choose C.

Rationale:

- A alone is debt-blind because it advances hidden value while leaving obsolete
  W5-C and W4 proof machinery active.
- B alone delays the first downstream value step immediately after W5-D finally
  produced accepted EvidenceItems.
- C advances V2-Q3 while satisfying the V2 Consolidation Gate and retirement
  ledger pressure.

Constraints from Steer-Co:

- The admission scope must stay contract-level and hidden/internal.
- The package must not authorize report, verdict, warning, confidence, public,
  parser, cache, SR, storage, provider expansion, ACS/direct URL, or V1 work.
- Retirement actions must be concrete same-slice deliverables or hard
  implementation entry/closeout criteria, not vague future intent.
- Net runtime mechanism count should decrease or remain unchanged; any increase
  needs a missing-capability rationale and removal trigger.
- Leak checks remain first-class. EvidenceItem text must never become
  public/default-admin/log/error-visible.

## 4. Proposed X7-W5-E Scope

Allowed for the later implementation package, if this review package is
accepted:

- Define one hidden/internal EvidenceItem admission/consumption contract that
  accepts only runtime-owned W5-D accepted bounded EvidenceItem output.
- Validate structural prerequisites only:
  - W5 result status is accepted and schema-valid;
  - W5 output belongs to the same runtime ledger as W4-H/W4-I;
  - EvidenceItem count is positive and bounded;
  - required EvidenceItem provenance hashes/refs are present;
  - source-material lineage hash/ref remains available;
  - provider/model/prompt metadata is retained as provenance, not public output.
- Emit exactly one hidden/admin-only admission decision, not a separate sidecar:
  `bounded_evidence_items_admitted_internal_consumption_pending`.
- Preferred owner/file envelope for the later implementation:
  - core decision owner:
    `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-item-admission.ts`;
  - runtime owner/provenance bridge:
    `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-item-admission-owner.ts`;
  - existing W5 artifact sink/route extension only, not a new route:
    `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink.ts`;
  - existing W5 route extension only, not a new route:
    `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.ts`;
  - focused tests beside the touched owners/routes.
- The package must not add a new admin route or a new process-local artifact
  sink unless Steer-Co first accepts a revised net-mechanism budget.
- Preserve redacted projections:
  - no source text by default;
  - no input text by default;
  - no EvidenceItem statement text by default;
  - optional admin inspection, if any, must be explicit, authenticated,
    no-store, and not public/export/report-visible.
- Fold or quarantine W5-C schema diagnostics after W5-D success:
  - keep bounded failure telemetry inside the existing W5 extraction telemetry
    for future failures;
  - remove W5-C-only language from active pass-path docs/status, or mark it as
    historical failure telemetry;
  - do not create a separate W5-C diagnostic route or sink;
  - keep the W5-C live-result docs as historical evidence.
- Merge or quarantine W4-I/W4-chain proof surfaces that are superseded by W5
  accepted output:
  - W4-I core eligibility logic may remain because W5 currently depends on it;
  - W4-I standalone artifact route
    `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-execution-readiness-artifacts/route.ts`
    must be reviewed and either left as historical inspection only with an
    explicit removal trigger or merged into the W5/W5-E route projection;
  - W4-I artifact sink
    `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-artifact-sink.ts`
    must stop gaining new consumers; if it cannot be removed safely in W5-E,
    the implementation handoff must record the exact remaining references and
    the trigger that removes them;
  - W4-G and W4-H lineage checks remain because they are still parent
    provenance, but their standalone proof role must be marked merged into the
    W5/W5-E same-ledger lineage contract.
- Update `Docs/AGENTS/V2_Retirement_Ledger.md` with concrete row impacts for
  V2-RL-009, V2-RL-010, V2-RL-011, and V2-RL-012.
- Add focused tests and boundary guards for admission, redaction, and
  consolidation behavior.
- Add or update package/handoff assertions that no new hidden route/sink was
  added unless a revised Steer-Co amendment explicitly accepts it.
- Update status/handoff/Agent_Outputs/index as required.

## 5. Forbidden Scope

- No report/verdict/warning/confidence behavior.
- No public API/UI/report/export/compatibility exposure.
- No parser execution or parsed-material behavior.
- No LLM prompt/model/config/schema edits.
- No cache read/write, Source Reliability, durable storage, or database schema
  changes.
- No provider expansion, W2/W3 widening, retries, or endpoint migration.
- No ACS/direct URL support.
- No V1 reuse, V1 cleanup, or V1 removal.
- No live job or canary inside implementation; any later canary requires a
  separate reviewed execution package, committed implementation, clean worktree,
  runtime refresh, runtime commit proof, and tranche ledger debit.
- No deterministic semantic EvidenceItem scoring, ranking, or meaning
  classification. Structural validation is allowed; semantic decisions remain
  LLM-owned.

## 6. Proposed Accepted Input

X7-W5-E may accept only the runtime-owned internal
`BoundedEvidenceExtractionDecision`, not the public result, not a default-admin
redacted projection, and not a reconstructed object from serialized route JSON.
The owning runtime path may read it from the existing W5 artifact record before
projection. Admission is allowed only when all are true:

- `status = hidden_evidence_item_extraction_completed`
- `extractionResultStatus = accepted`
- `extractionStatus = evidence_extracted`
- `schemaDiagnostics = null`
- `retryCount = 0` or another explicitly approved bounded value in a later
  package
- `evidenceItemCount > 0`
- every admitted EvidenceItem has a bounded statement byte length, a computed
  statement hash, `provenance.locator`, `provenance.rationale`, source-material
  lineage ref/hash, and W5 task metadata
- `decision.parent.w4hStatus = bounded_extraction_input_packet_created_extraction_execution_closed`
- `decision.parent.w4iStatus = extraction_input_structurally_eligible_execution_denied`
- `decision.parent.providerId` equals the W4-H packet provider id and the W5
  extraction input provider id
- the W4-H packet hash equals the W4-G sidecar hash and W3-B Source Material
  text hash when those fields are present in the same runtime-owned chain
- ledger id equality is exact across the W5 decision, W4-H packet, W4-I
  eligibility decision, W4-G sidecar, and W3-B Source Material artifact

If any prerequisite fails, X7-W5-E must fail closed with a bounded structural
reason and no text leakage.

## 7. Proposed Output Shape

The later implementation package should define a single hidden/admin-only
decision:

`bounded_evidence_items_admitted_internal_consumption_pending`

Maximum default projection: `18` top-level fields. Field additions beyond this
ceiling require a Steer-Co amendment.

Required default projection:

- `ledgerIdHash`
- `parentW5ArtifactId`
- `admittedEvidenceItemCount`
- `evidenceItemStatementHashes`
- `evidenceItemStatementByteLengths`
- `sourceMaterialLineageHash`
- `w4hPacketHash`
- `w4iEligibilityStatus`
- `providerId`
- `modelId`
- `promptProfileId`
- `schemaVersion`
- `admissionStatus`
- `blockedReason`
- `damagedReason`
- `sideEffects`
- `defaultProjection = hash_length_provenance_only`
- `redaction`

The `redaction` object must contain:

- `evidenceItemTextReturned = false`
- `sourceTextReturned = false`
- `inputTextReturned = false`

Allowed status and reason labels for the implementation package:

- `admissionStatus = bounded_evidence_items_admitted_internal_consumption_pending`
- `admissionStatus = evidence_item_admission_blocked`
- `admissionStatus = evidence_item_admission_damaged`
- `blockedReason = w5_result_not_accepted`
- `blockedReason = evidence_item_count_not_positive`
- `blockedReason = lineage_mismatch`
- `blockedReason = w4h_parent_not_closed_packet`
- `blockedReason = w4i_parent_not_eligible_denial`
- `damagedReason = malformed_w5_decision`
- `damagedReason = missing_evidence_item_provenance`
- `damagedReason = projection_redaction_violation`

This output is not an EvidenceCorpus report, not a public EvidenceItem list, and
not a verdict/report input yet. It is the first stable internal handoff point
for later report-quality stages.

## 7.1 Net Mechanism Accounting

Expected mechanism budget for implementation:

- Add `bounded_evidence_items_admitted_internal_consumption_pending` decision:
  `+1`.
- Do not add a new admin route: `0`.
- Do not add a new process-local sink: `0`.
- Fold W5-C schema-diagnostic pass-path narrative into stable W5 failure
  telemetry and mark W5-C as historical: `-0.5` governance/mechanism pressure.
- Merge W4-I standalone inspection into W5/W5-E same-ledger projection or record
  it as historical-only with removal trigger: `-0.5` to `-1`.
- Mark W4-chain proof role merged into W5/W5-E lineage contract while preserving
  parent lineage checks: `-0.5`.

Target net result: runtime mechanism count unchanged or decreased. If the
implementation cannot avoid a new route/sink or cannot make a concrete W4-I
merge/quarantine move, it must stop and reconvene Steer-Co before coding past
the core admission contract.

## 8. Pass Criteria

Local pass for a later implementation requires:

- W5-D accepted output is structurally admitted only through the approved W5
  artifact path.
- Mismatched ledger, provider lineage, source-material hash, W4-H packet hash,
  malformed EvidenceItem projection, missing provenance, or non-accepted W5
  result fails closed.
- Default admin projection is hash/length/provenance-only.
- Public result JSON, UI, reports, exports, compatibility projections, logs,
  and errors expose no source text, input text, EvidenceItem statement text, or
  raw provider payload.
- W5-C temporary diagnostics are folded into stable W5 failure telemetry or
  quarantined with explicit row/status updates.
- W4-I/W4-chain proof surfaces are merged/quarantined or retain a concrete
  owner/removal trigger in the retirement ledger.
- The implementation does not add a new route or new process-local sink unless
  a revised Steer-Co package accepts the mechanism increase.
- Default projection has at most `18` top-level fields.
- Tests assert exact provider-id, ledger-id, W4-H hash, W4-I status, and
  source-material lineage equality checks.
- No prompt/model/config/schema changes occur.
- No report/verdict/warning/confidence/public/cache/SR/storage/provider/ACS/V1
  work occurs.
- V2 gate validation passes.
- Debt sensors are recorded and no unowned net mechanism increase is accepted.

Required focused verifier names or equivalents:

- W5-E admission success from runtime-owned accepted W5 decision.
- W5-E fail-closed on non-accepted W5 result.
- W5-E fail-closed on zero EvidenceItems.
- W5-E fail-closed on provider-id drift.
- W5-E fail-closed on ledger-id drift.
- W5-E fail-closed on W4-H/W4-G/W3-B hash drift.
- W5-E fail-closed on W4-I status drift.
- W5-E fail-closed on missing EvidenceItem provenance.
- W5-E default projection redaction and field-ceiling test.
- W5-E route/public/log/error leak test using the existing W5 route projection.
- Retirement ledger assertion for W5-C and W4-I/W4-chain row updates.

Suggested command set:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2
npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
npm run debt:sensors
npm -w apps/web run build
git diff --check
```

The final implementation package may narrow this verifier set if it identifies
the exact touched files, but it must retain redaction/leak tests, W5 admission
tests, boundary guard coverage, gate validation, debt sensors, build, and diff
check.

## 9. Stop Criteria

Stop and reconvene Steer-Co if:

- implementing admission requires report, verdict, warning, confidence, public,
  parser, cache, SR, storage, provider expansion, ACS/direct URL, or V1 scope;
- EvidenceItem text would appear in public/default-admin/log/error surfaces;
- implementation requires prompt/model/config/schema edits;
- consolidation requires deleting behavior whose replacement is not proven by
  W5-D/W5-E tests;
- W5-C/W4-I/W4-chain retirement cannot be made concrete in the same package;
- focused verifier failure has unclear root cause;
- net mechanism count increases without a concrete missing-capability rationale
  and removal trigger;
- Steer-Co reviewer dissent appears.

## 10. Later Canary Proposal

This review package does not authorize a live job.

If X7-W5-E is implemented, verifier-clean, committed, and runtime-refreshed, a
separate execution package may propose exactly one canary using the current
Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

The canary should prove only that W5-D accepted EvidenceItems can be admitted
into the X7-W5-E internal decision with default redaction and no public leak.
It must not open report/verdict/warning/confidence/public behavior.

## V2 SCORECARD IMPACT

Quality dimension advanced: V2-Q3 Evidence extraction and internal evidence
handoff.

Direct user/report value: none yet; this is still hidden/internal. It moves
closer to report value by creating a stable admitted-EvidenceItem handoff.

Hidden-only value: bounded and justified only because it consolidates prior
proof/diagnostic machinery while advancing from extraction output to internal
admission.

Cost/latency impact: no new live call is authorized. Later canary should reuse
the single W5 path and preserve current W5 telemetry.

Retirement or simplification unlocked: W5-C diagnostics fold/quarantine; W4-I
standalone denial/proof merge; W4-chain proof route reduction.

Scorecard risk: if admission becomes another permanent hidden layer without
retirement or report-facing progress, it violates V2-Q10.

## V2 RETIREMENT LEDGER IMPACT

Rows touched: V2-RL-009, V2-RL-010, V2-RL-011, V2-RL-012, and V2-RL-013 if
boundary guard structure changes are needed.

Status changes: to be made by the implementation package, not this review
package.

New mechanism owner: Lead Developer, only if a stable admission decision is
implemented.

Removal / merge trigger: accepted W5-D output has fired the V2-RL-012 trigger.
X7-W5-E implementation must either merge/quarantine W4-I or record a concrete
remaining owner/removal trigger.

Debt accepted: none accepted by this review package.

## V2 CONSOLIDATION GATE

Latest debt-sensor status at package drafting: `advisory_warn` on
2026-05-20T06:12:21.762Z.

Salient warnings:

- V2 source: `145` files / `41734` lines.
- V2 tests: `127` files / `46867` lines.
- Boundary guard: `10131` lines.
- Docs/WIP markdown files: `213`.
- Handoff markdown files: `727`.
- Net mechanism increases: `14`.
- Five older V2 Source Acquisition/EvidenceCorpus docs still need
  consolidation-marker review.

Consolidation requirement: X7-W5-E may proceed only if the implementation
package makes net runtime mechanisms decrease or remain unchanged, or states a
specific missing-capability rationale plus removal trigger accepted by Steer-Co.

## Review Notes

Steer-Co quorum:

- Captain Deputy / GPT Leader: synthesized current state and authority.
- Claude Opus 4.6 Senior Architect + LLM Expert: `support` for constrained
  Option C.
- Lead Developer practicality lens: `modify`, supporting Option C only as a
  sequenced review package with concrete same-slice retirement obligations.
- Code Reviewer + Security/containment lens: `support` for Option C with
  first-class leak checks and no default-visible EvidenceItem text.

Consent result: Option C, constrained as above. No material dissent remains.

Package-readiness review:

- Claude Opus 4.6 reviewed the first package draft as `approve_with_changes`.
  Required changes were explicit net-mechanism accounting and a hard ceiling on
  the default projection field count.
- Lead Developer / Code Reviewer lens reviewed the first package draft as
  `approve_with_changes`. Required changes were exact contract name, owner
  module, input source, field list, consolidation targets, and focused verifier
  names.

Amendment applied:

- The package now chooses a single decision name:
  `bounded_evidence_items_admitted_internal_consumption_pending`.
- The package chooses the existing W5 artifact sink/route as the projection
  carrier and forbids a new route/sink without Steer-Co amendment.
- The package accepts only runtime-owned internal `BoundedEvidenceExtractionDecision`
  state, not default projections or reconstructed route JSON.
- The package sets an `18` top-level-field default projection ceiling.
- The package adds exact lineage equality checks, allowed status/reason labels,
  net-mechanism accounting, and focused verifier names.
