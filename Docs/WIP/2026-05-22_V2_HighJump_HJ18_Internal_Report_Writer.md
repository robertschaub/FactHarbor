# V2 HighJump HJ18 - Internal Report Writer

## Context

HJ17 canary job `ec943a2eeedf41a5890c7a0222286f50` closed the W5 output
budget stop. Hidden V2 reached W8-B and W8-G:

- W5 completed as `hidden_evidence_item_extraction_completed` with `3`
  EvidenceItems.
- W8-B created `internal_alpha_report_result_candidate_created` with
  `firstIncompleteStage = none`, `3` boundary candidates, `2` verdict
  candidates, and `3` cited EvidenceItem refs.
- W8-G created a `5413` byte internal Alpha draft, available only through
  explicit authenticated inspection.
- Public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`.

The HJ17 internal draft is useful as structure, but it is still deterministic
projection prose. It exposes an avoidable presentation quality issue: a verdict
candidate id can read like a claim and make `FALSE` appear inverted even though
the W7-B verdict values for the hydrogen family are aligned with the Captain
expectation (`FALSE`, truth `15`, confidence `72`).

## Steer-Co Result

Steer-Co consented to HJ18 as the next balanced step:

- create the first hidden/internal LLM report-writer path over existing W8-B and
  W7-B internal review data;
- do not reopen W5 output budgets, W7-B verdict prompt repair, source
  acquisition, provider expansion, parser execution, cache/SR/storage, public
  report projection, V1 work, or V1 cleanup;
- keep W8-G as a deterministic fallback/review comparison, with a merge trigger
  after the internal report writer proves a better output shape;
- preserve exact verdict values and cited EvidenceItem ids from W7-B; the report
  writer may improve narrative but must not recompute truth, confidence,
  verdict labels, warnings, or evidence.

Reviewer synthesis:

- Internal report-quality lane recommended HJ18-B: a narrow internal
  report-writer/prose LLM stage, not W8G polish and not more source work.
- Internal implementation/debt lane agreed, classifying the issue as an
  incomplete existing report mechanism and recommending use of the existing
  report/aggregation gateway surface.
- Claude Opus requested a structured report-review classification before code.
  That review is recorded here: HJ17's hidden top verdict values align with the
  hydrogen expectation; the active issue is report-writing/presentation quality,
  not a proven W7-B verdict-value defect.

## V2 Scorecard Impact

V2 SCORECARD IMPACT

Quality dimension advanced:

- V2-Q5 Verdict quality: turns accepted hidden verdict candidates into
  reviewable report narrative without changing verdict values.
- V2-Q6 Warning integrity: keeps caveats and material uncertainty in the report
  writer input and output.
- V2-Q8 Public cutover safety: keeps public V2 blocked while internal report
  quality is developed.
- V2-Q9 Cost/latency discipline: one additional hidden LLM call only after W8-B
  is complete, with telemetry and one canary maximum.
- V2-Q10 Complexity convergence: uses the existing `aggregation_narrative`
  gateway task as the stable report owner and starts the W8-G merge path.

Direct user/report value:

- A first LLM-written internal report draft suitable for report review.

Hidden-only value:

- Acceptable because it directly tests report quality and has a W8-G merge
  trigger.

Cost/latency impact:

- Adds one hidden report-writer LLM call on successful W8-B paths only. The
  package records token telemetry and does not add retries.

Retirement or simplification unlocked:

- If HJ18 output is accepted by report review, W8-G can be merged into the
  stable report writer or reduced to fallback diagnostics.

Scorecard risk:

- The report writer could make fluent but unsupported claims. HJ18 mitigates
  that by requiring citation-id preservation, verdict-value preservation, schema
  validation, redacted default admin projection, and no public projection.

## V2 Retirement Ledger Impact

V2 RETIREMENT LEDGER IMPACT

Rows touched:

- V2-RL-004 hidden observability/admin routes: adds one bounded report-writer
  artifact route with the same default redaction posture.
- V2-RL-021 HighJump temporary bar-lowering: continues the report-value phase
  without lowering public cutover or evidence citation bars.
- V2-RL-023 W8-G internal Alpha report draft projection route/sink: W8-G remains
  load-bearing fallback/comparison only until the HJ18 report-writer shape is
  reviewed.

Status changes:

- none in this package.

New mechanism owner:

- `aggregation_narrative` becomes the hidden/internal report-writer owner for
  HJ18.

Removal / merge trigger:

- Merge or quarantine W8-G after two internal report-writer canaries or one
  accepted report-review cycle prove HJ18 has a better report shape and
  equivalent fail-closed containment.

Debt accepted:

- One new hidden report-writer route/sink is accepted temporarily because no
  existing route can expose the LLM-written report draft without mixing it with
  the deterministic W8-G projection. It must remain internal/admin-only and
  default hash/length/provenance-only.

## V2 Consolidation Gate

HJ18 is allowed under the consolidation gate because it advances direct report
quality value and activates an existing planned report owner instead of adding a
new denial/diagnostic layer. It does not create public behavior and it defines a
merge path for W8-G.

## Debt-Guard

Latest debt sensor before HJ18: `advisory_warn` generated
`2026-05-22T05:47:01.584Z`, with the known V2 source footprint, test footprint,
boundary-guard size, WIP-doc volume, net-mechanism, and consolidation-marker
warnings.

DEBT-GUARD INVENTORY:

- Symptom: HJ17 produced an internal Alpha draft, but the draft is deterministic
  projection prose and can present verdict-candidate ids in a confusing way.
- Verifier: HJ17 canary artifacts and explicit W8-G inspection output.
- Recent change surface: W8-G deterministic draft projection and W8-B/W7-B
  internal review payload handoff.
- Existing mechanisms: `aggregation_narrative` gateway task exists as a planned
  report owner; W8-G deterministic draft route/sink exists as a temporary
  projection.
- Debt signals: W8-G is a temporary deterministic report draft and V2 already
  has substantial hidden artifact surface area.
- Constraints: no public output, no source/evidence expansion, no verdict/truth
  recomputation, no deterministic semantic report judgment, no V1 reuse, no
  unsupported citation ids, and no raw text leak into public/default-admin/log
  or error surfaces.
- Unknowns: whether one LLM report-writer pass produces materially better prose
  than W8-G without losing caveats or citations.

Causal classification:

- `missing-capability` for LLM report writing over accepted W8-B/W7-B data;
  `incomplete-existing-mechanism` for the existing W8-G report draft shape.

COMPLEXITY BUDGET:

- Chosen option: add by activating/amending the existing `aggregation_narrative`
  gateway owner.
- Files expected to change: gateway approval/model/cache registries, task
  contracts, one report-writer core, one runtime owner, one artifact sink, one
  internal route, orchestrator wiring, prompt section, focused tests, boundary
  guard, status/handoff/index docs.
- Small-change plan: one HJ18 slice.
- Net mechanisms: increases by one hidden report-writer owner/route, with a
  W8-G merge trigger.
- New branches/fallbacks/flags/helpers: no runtime feature flag; W8-G remains
  existing fallback/comparison only.
- Code expected to remove: none in this slice; W8-G merge/removal is deferred
  until report review proves parity.
- Tests/verifier to add or update: prompt/gateway policy tests, report-writer
  core tests, artifact route/sink tests, orchestrator chain ordering test,
  boundary guard, V2 gates, build.
- Why this is not workaround stacking: it uses the planned report gateway task
  and directly replaces deterministic projection as the report-quality path.
- Why rejected paths are worse:
  - W8-G polish remains deterministic projection and does not test report writer
    quality.
  - W7-B prompt repair is premature because verdict values currently align with
    the target family.
  - Source expansion is not the active report-writing bottleneck.
  - Public report projection would bypass cutover readiness.
- Verifier tier: safe-local, build, then one optional live job after commit and
  runtime refresh.
- Cost class: one additional hidden LLM report-writer call only in canary.
- Runtime provenance: commit and runtime refresh required before any canary.
- Debt accepted: planned temporary hidden report-writer route with W8-G merge
  trigger.

BALANCED RISK MITIGATION:

- Named risk: fluent internal report prose may introduce unsupported claims,
  mutate verdict values, or leak internal/raw text.
- Decision result: add a narrow report-writer contract with strict preservation
  checks and default redacted route.
- Rejected alternatives: no report writer, public projection, W8-G-only polish,
  and source expansion.
- Owner: Lead Developer under Captain Deputy / Steer-Co.
- Verifier: focused report-writer tests, route redaction tests, boundary guard,
  build, and one canary.
- Net-complexity impact: one report owner and route added; W8-G gets explicit
  merge trigger.
- Residual risk: first report-writer prompt may still need quality tuning after
  report review.
- Removal / merge trigger: merge/quarantine W8-G after HJ18 report review
  accepts the report-writer output shape.

## Scope

Allowed:

- activate `aggregation_narrative` as hidden/internal report-writer task;
- add a strict `v2.aggregation_narrative.0` schema and runtime decision;
- add one topic-neutral `V2_AGGREGATION_NARRATIVE` prompt section;
- call the existing approved provider path through the V2 gateway/model-policy
  snapshot;
- consume only accepted W8-B and W7-B internal review payload state;
- preserve W7-B verdict labels, truth percentages, confidence values, boundary
  ids, and cited EvidenceItem ids exactly;
- record one hidden/admin-only artifact with default hash/length/provenance-only
  projection and optional explicit authenticated report text inspection;
- update focused tests, boundary guard, WIP/status/handoff/index docs.

Not allowed:

- public API/UI/report/export/compatibility projection;
- recomputing truth, confidence, warnings, sufficiency, or Source Reliability;
- adding EvidenceItems, parser execution, cache/SR/storage, provider expansion,
  ACS/direct URL, W2/W3 widening, retries, or V1 work;
- making W8-G public or deleting W8-G in this slice;
- topic-specific prompt examples or canary-domain terms.

## Pass Criteria

Local:

- `aggregation_narrative` is executable only with HJ18 approval, model policy,
  cache policy, prompt policy, and hidden/internal eligibility.
- The prompt section contains the exact `v2.aggregation_narrative.0` schema and
  required runtime packet names, with no canary-domain terms.
- The report writer fails closed if W8-B is not created, W7-B is not accepted,
  lineage hashes drift, prompt/model/cache policy is not executable, provider
  output is malformed, unsupported citation ids appear, or verdict values drift.
- Default admin route projection returns no report text, no source text, no
  EvidenceItem text, no prompt text, no provider payload, no hidden ledger id,
  and no public verdict/truth/confidence fields.
- Explicit authenticated inspection may return the internal report markdown and
  nothing else raw.
- Public V2 envelope remains damaged/precutover.

Canary, if run:

- W2/W3/W4/W5/W6/W7/W8-B repeat the known hidden chain for the Captain-defined
  input.
- HJ18 creates one `internal_report_writer_draft_created` artifact.
- The report writer preserves the top W7-B verdict label/truth/confidence and
  cited EvidenceItem ids.
- The report prose improves the W8-G presentation issue without public/default
  admin/log/error leaks.
- W8-G remains available as deterministic comparison/fallback.

## Stop Criteria

Stop and reconvene Steer-Co if:

- local implementation requires source/provider/parser/cache/SR/storage/public
  changes;
- the report writer cannot validate citation-id or verdict-value preservation;
- provider output repeatedly fails schema with unclear cause;
- route/default projection leaks report text or hidden ids;
- canary produces fluent but materially misleading narrative;
- HJ18 requires W7-B verdict prompt changes before the report-writer path can be
  evaluated.

## Implementation Result

Status: locally implemented and verifier-clean.

Implementation delta:

- `aggregation_narrative` is now an executable hidden/internal gateway task with
  HJ18 prompt/model/cache approval.
- Added strict `v2.aggregation_narrative.0` result schema and one
  `internal_report_writer` runtime decision.
- Added one topic-neutral `V2_AGGREGATION_NARRATIVE` prompt section.
- Added runtime owner, bounded process-local artifact sink, and authenticated
  internal no-store artifact route.
- Wired the product orchestrator to run HJ18 only after W8-B/W8-G hidden report
  state is available.
- Added focused contract, route, sink, gateway, prompt, and boundary-guard
  coverage.
- Updated `V2_Gate_Register.json` and its validator so
  `aggregation_narrative` mirrors source truth while the register remains
  audit-only.

Debt-guard result:

- Final classification remains `missing-capability` plus
  `incomplete-existing-mechanism`.
- Net mechanism increase: one hidden report-writer owner/route/sink.
- Accepted debt has a merge/removal trigger: merge or quarantine W8-G after HJ18
  report review accepts output shape and fail-closed parity.
- No source/provider/parser/cache/SR/storage/public/V1 widening was added.

Verification:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/gateway/policy.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-report-writer.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-internal-report-writer-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-report-writer-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  passed: 6 files, 128 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` passed:
  75 files, 356 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` passed: 144 files,
  871 tests.
- `npm run validate:v2-gates` passed.
- `node scripts/validate-v2-gate-register.mjs --self-test` passed.
- `npm run debt:sensors` passed with `advisory_warn` at
  `2026-05-22T06:53:10.020Z`. Salient warnings remain V2 source/test
  footprint, boundary-guard size, WIP docs volume, net-mechanism markers, and
  consolidation-marker review.
- `npm -w apps/web run build` passed. Prompt reseed reported
  `Prompts: 0 changed, 3 unchanged`.
- `npm run index` passed.
- `git diff --check` passed.

Canary readiness:

- HJ18 live canary has run once.
- No second HJ18 canary is authorized.
- The next action is a narrow HJ19 report-writer output-budget/compactness
  repair package, because the HJ18 canary reached the report-writer owner but
  failed closed at JSON parse after the provider output hit the output-token
  ceiling.

## Canary Result

Classification:
`STOP_X7_HJ18_INTERNAL_REPORT_WRITER_PARSE_FAILURE_CONTAINED`

Job:

- Job id: `c75322fad1e74218b8ee51a54f2307cd`
- Input: `Using hydrogen for cars is more efficient than using electricity`
- Pipeline variant: `claimboundary-v2`
- API job status: `SUCCEEDED`
- Runtime commit reported by job: `44395adc13a9b28faa7bec862dafda52682805ed`
- Implementation commit containing HJ18 source behavior:
  `ceb6a38395f2a36bc3eeeeba8ab2818524222013`

Public result:

- Public schema remained `4.0.0-cb-precutover`.
- Public cutover stayed `blocked_precutover`.
- Public analysis issue stayed `report_damaged`.
- Public verdict/truth/confidence stayed unavailable.
- No HJ18 report markdown or hidden report-writer data was exposed through the
  public result.

Hidden chain evidence:

- HJ18 route returned one hidden/internal artifact for ledger
  `c75322fad1e74218b8ee51a54f2307cd:precutover-observability`.
- Default projection stayed `hash_length_provenance_only`.
- `reportMarkdownReturned = false`.
- HJ18 decision status was `internal_report_writer_damaged`.
- `damagedReason = parse_failure`.
- `aggregationNarrativeResultStatus = damaged`.
- `reportReviewReadiness = damaged_before_internal_report_review`.
- `reportMarkdownByteLength = 0`; `reportMarkdownHash = null`.
- Parent W8-B/W7-B hidden state was present:
  `internal_alpha_report_result_candidate_created` and
  `boundary_verdict_candidates_created_internal`.

Telemetry:

- Gateway task: `aggregation_narrative`.
- Prompt section: `V2_AGGREGATION_NARRATIVE`.
- Model policy: `v2.model.aggregation_narrative.hj18`.
- Provider/model: `anthropic` / `claude-haiku-4-5-20251001`.
- Token usage: `5179` input / `4000` output / `9179` total.
- Schema diagnostics: `outputParseStatus = parse_failure`,
  `failureCategory = parse_failure`, issue code `json_parse_error`.
- Raw provider output, prompt text, source text, EvidenceItem text, stack trace,
  and schema messages were not returned.
- Cache remained `no_store_no_read`; cache read/write, parser execution,
  Source Reliability read/write, storage write, public report generation,
  public surface write, compatibility projection, verdict publication, warning
  publication, confidence publication, and truth-percentage publication all
  remained false.

Budget:

- HJ18 consumed `1` job from the Captain-authorized HighJump continuation
  tranche of `8`.
- Remaining live-job budget in the current tranche is `7`.

Interpretation:

- HJ18 is not a report-quality pass.
- HJ18 did prove the hidden/internal report-writer path is product-route
  reachable and fail-closed with the expected containment posture.
- The concrete next blocker is output-budget/compactness for
  `aggregation_narrative`, analogous to the earlier W5/HJ17 output-budget
  repair but scoped to the report writer.

Next action:

- Prepare HJ19 as a narrow report-writer output-budget/compactness repair:
  amend only the existing HJ18 report-writer path, prompt contract, model
  output budget, and focused tests as needed.
- Do not change source acquisition, W4/W5/W6/W7 behavior, provider selection,
  parser/cache/SR/storage, public behavior, ACS/direct URL, V1 work, or V1
  cleanup for this stop.
