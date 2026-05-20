# V2 Slice W6-C Sufficiency Assessment Implementation Approval Package

Date: 2026-05-20
Status: review-package-only; not implementation-approved
Package author: Captain Deputy
Baseline design: `Docs/WIP/2026-05-20_V2_Slice_W6-C0_Sufficiency_Portfolio_Input_And_LLM_Assessment_Design.md`
Current prerequisite commit: `d1458c96` (`feat: add v2 w6b sufficiency intake contract`)
Current governing docs commit: `00ddddfc` (`docs: prepare v2 w6c0 sufficiency design package`)
Future implementer: Lead Developer, only after Captain approval
Canary runner: none; no live job is proposed by W6-C

## 1. Approval Question

Captain approval requested:

```text
Approve W6-C implementation as a hidden/internal sufficiency assessment package
that opens the named text-exposure widening gate for bounded EvidenceItem
statements, wraps the existing EvidenceSufficiencyResult task payload inside a
new SufficiencyAssessmentDecision envelope, and enables evidence_sufficiency
gateway/model/cache approval only inside the approved package envelope.

No live job, public behavior, report/verdict/warning/confidence behavior,
provider expansion, parser work, ACS/direct URL support, Source Reliability
weighting, fixed sufficiency formulas, or V1 work is approved.
```

This package is not itself approval to implement. It is the review artifact for
Captain approval.

## 2. Current State

W6-B is committed and verifier-clean:

- `SufficiencyIntakeDecision`
- decision version `v2.evidence-lifecycle.sufficiency-intake.w6b`
- accepted parent: `EvidenceItemHandoffDecision`
- output is internal/admin-only, hash/length/provenance-only by default
- `assessmentExecution = closed_contract_only`
- no LLM sufficiency execution

Existing sufficiency assets already present:

- prompt section `V2_EVIDENCE_SUFFICIENCY_GATE` in
  `apps/web/prompts/claimboundary-v2.prompt.md`
- task key `evidence_sufficiency`
- schema version `v2.evidence_sufficiency_assessment.0`
- `EvidenceSufficiencyAssessment`
- `EvidenceSufficiencyResult`
- `EvidenceSufficiencyResultSchema`

Current execution blockers:

- `evidence_sufficiency` is not in
  `ANALYZER_V2_EXECUTION_ELIGIBLE_GATEWAY_TASK_IDS`;
- it has no registered task model policy in `model-policy-registry.ts`;
- its cache policy is pending, not approved;
- its gateway task status remains blocked until prompt/model/cache approval;
- no implementation owner exists for a W6-C decision envelope.

## 3. What This Gate Unlocks

If Captain later approves this package, W6-C implementation may add one hidden
internal sufficiency owner that:

- constructs a bounded sufficiency LLM input from runtime-owned W5 EvidenceItem
  statements only after matching it against the W6-B `SufficiencyIntakeDecision`;
- executes the existing `evidence_sufficiency` task through an approved
  prompt/model/cache/gateway path;
- wraps the existing `EvidenceSufficiencyResult` payload inside a
  `SufficiencyAssessmentDecision` envelope;
- produces internal stop/go/caveat/refine state for later internal report
  candidates;
- keeps public/default-admin/log/error surfaces text-free.

This gate does not unlock live jobs or product-route/public behavior.

## 4. What Older Guard Or Artifact It Retires Or Merges

W6-C implementation must decide `V2-RL-012`:

- preferred outcome: merge or quarantine W4-I core/sink lineage state because
  W6-B/W6-C can validate downstream lineage without direct W4-I sink access;
- acceptable fallback: keep W4-I core with a sharper removal trigger only if
  W6-C cannot validate required lineage from W5-F/W6-B without it;
- forbidden outcome: add new W4-I consumers.

W6-C must not create a new hidden route. It must work through focused contract
owners and tests only.

## 5. Approved Future File Envelope

If Captain approves W6-C implementation, the proposed file envelope is:

Source:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment.ts`
- `apps/web/src/lib/analyzer-v2/gateway/approval-records.ts`
- `apps/web/src/lib/analyzer-v2/gateway/cache-policy-registry.ts`
- `apps/web/src/lib/analyzer-v2/gateway/model-policy-registry.ts`
- `apps/web/src/lib/analyzer-v2/gateway/policy.ts`

Tests:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Docs/handoff:

- W6-C implementation handoff in `Docs/AGENTS/Handoffs/`
- append-only `Docs/AGENTS/Agent_Outputs.md`
- generated `Docs/AGENTS/index/handoff-index.json`
- minimal status/backlog pointer only if protocol requires it

No prompt file, schema file, product route, runner, orchestrator, UI, API,
report, export, compatibility, Source Reliability, provider, parser, ACS, direct
URL, storage, cache IO implementation, or V1 file is inside this envelope.

## 6. Text-Exposure Widening Contract

W6-C approval would open exactly one text-exposure widening:

```text
runtime-owned W5 EvidenceItem statements -> sufficiency LLM input packet
```

The control parent remains `SufficiencyIntakeDecision`. Text may be read from
the W5 bounded evidence extraction result only after all lineage checks pass.
The only free-text field admitted to the W6-C LLM input is the EvidenceItem
`statement`. All other upstream text-bearing fields must be hashed, counted, or
reduced to non-text structural projections before they enter the W6-C LLM input.

Accepted control parent:

- `SufficiencyIntakeDecision`
- version `v2.evidence-lifecycle.sufficiency-intake.w6b`
- status `sufficiency_intake_ready_for_contract_only_assessment`
- non-null `parentEvidenceItemHandoffDecisionId`
- non-null `lineageHash`
- non-empty statement hashes and byte lengths
- `providerId` and `modelId` non-null

Accepted text source:

- `BoundedEvidenceExtractionDecision`
- status `hidden_evidence_item_extraction_completed`
- `extractionResultStatus = accepted`
- `extractionStatus = evidence_extracted`
- `extractionResult.status = accepted`
- EvidenceItem statement hashes and byte lengths exactly match W6-B
- W5 parent packet hash equals W6-B `w4hPacketHash`
- W5 parent provider id equals W6-B `providerId`
- W5 execution telemetry model id equals W6-B `modelId`
- W6-B `sourceMaterialLineageHash` equals SHA-256 of the W5 source material ref
- all W5 public/report/verdict/warning/confidence/cache/SR/storage/parser side
  effects remain closed

W6-C must not inspect W4-I directly. W5/W6 lineage is enough.

## 7. Sufficiency LLM Input Packet

Future implementation should construct a process-local input packet with:

- packet version
- packet id
- parent `SufficiencyIntakeDecision` id/version
- parent W5 decision id
- evidence item count
- per item:
  - `evidenceItemId`
  - `statement`
  - `statementHash`
  - `statementByteLength`
  - `targetAtomicClaimIds`
  - `claimDirection`
  - `probativeValue`
  - `evidenceStrength`
  - `extractionConfidence`
  - evidence-scope structural projection only:
    - scope field hashes and byte lengths for any upstream text-bearing scope
      fields;
    - non-text categorical/enum fields if present;
    - no raw `method`, `temporalBounds`, `populationOrDomain`,
      `geographicScope`, or `limitations` strings;
  - computed provenance locator hash and byte length;
  - computed provenance rationale hash and byte length;
- source material lineage hash
- W4-H packet hash
- provider id
- model id

The packet is internal only and must not be returned by default. It is not a
public artifact, not a default admin route payload, and not a persisted storage
record.

The phrase "provenance locator hash" means a computed hash of the upstream
`provenance.locator` value. It never means passing the raw locator string to
W6-C. The same applies to upstream `provenance.rationale`: W6-C may pass only
hash/length evidence unless a later Captain-approved prompt/schema package
explicitly opens more text.

Text cap:

- each statement must already have been admitted by W5/W5-F;
- W6-C may not raise W5/W6 byte caps;
- total statement payload must fail closed if it exceeds the sum of the W6-B
  byte lengths or any implementation-local cap approved in this package.

## 8. SufficiencyAssessmentDecision Envelope

W6-C implementation may define one envelope:

```text
SufficiencyAssessmentDecision
decisionVersion = v2.evidence-lifecycle.sufficiency-assessment.w6c
```

Required shape:

- `decisionVersion`
- `decisionId`
- `kind = sufficiency_assessment`
- `assessmentStatus`
- `blockedReason`
- `damagedReason`
- `visibility = internal_admin_only`
- `publicPointerExposure = forbidden`
- `publicCutoverStatus = blocked_precutover`
- `defaultProjection = hash_length_provenance_only`
- parent `SufficiencyIntakeDecision` id/version
- parent W5 decision id
- admitted EvidenceItem count
- EvidenceItem statement hashes and byte lengths
- source material lineage hash
- W4-H packet hash
- provider id and model id
- task key `evidence_sufficiency`
- task schema version `v2.evidence_sufficiency_assessment.0`
- `EvidenceSufficiencyResult` status and payload hash
- report-stop recommendation derived only from accepted task output
- redaction booleans proving no text is returned by default
- side-effect booleans
- execution telemetry with prompt hash, rendered prompt hash, model policy id,
  token usage, duration, cache decision, and approval pointer

The envelope may wrap `EvidenceSufficiencyResult`. It must not duplicate or
change `EvidenceSufficiencyResult` / `EvidenceSufficiencyResultSchema`.

## 9. Gateway / Model / Cache Approval Edits

If Captain approves implementation, W6-C may perform only these gateway edits:

- add one W6-C Captain approval record in
  `apps/web/src/lib/analyzer-v2/gateway/approval-records.ts`;
- add `evidence_sufficiency` to
  `ANALYZER_V2_EXECUTION_ELIGIBLE_GATEWAY_TASK_IDS`;
- set `evidence_sufficiency` gateway status to executable only with W6-C
  prompt/model/cache approval;
- add one model policy for `evidence_sufficiency`;
- add one `ANALYZER_V2_EVIDENCE_SUFFICIENCY_CACHE_POLICY` or approved equivalent
  sufficiency-task no-read/no-store-compatible policy;
- require `canExecuteAnalyzerV2GatewayTask(...)` to pass before provider call.

No prompt text edit is authorized by this package. No schema edit is authorized.
If reviewers require prompt/schema changes, stop and prepare a separate
prompt/schema approval package.

## 10. LLM-Owned Judgment Rule

W6-C must not implement deterministic sufficiency semantics.

Allowed deterministic code:

- structural validation;
- lineage checks;
- hash/length validation;
- redaction checks;
- byte caps;
- prompt/model/cache/gateway approval checks;
- schema parsing;
- side-effect ledger construction.

Forbidden deterministic code:

- fixed source-count thresholds;
- fixed independent-provenance-group thresholds;
- source-diversity formulas;
- scarcity scoring;
- proxy-fit scoring;
- truth/confidence adjustment formulas;
- semantic keyword or regex classification;
- language-specific semantic branching.

The "fewer than two independent provenance groups" concept may only appear as an
LLM-owned structured judgment dimension in `EvidenceSufficiencyResult` or a
future approved prompt/schema, not as TypeScript branching logic.

## 11. Public / Admin / Log Redaction

Default projections must remain text-free.

W6-C must not expose:

- EvidenceItem statements;
- source text;
- source summaries;
- snippets;
- raw evidence-scope text;
- raw provenance locator or rationale text;
- prompt text;
- rendered prompt text;
- provider payloads;
- hidden ledger ids;
- internal statuses in public surfaces;
- raw URLs or page keys not already approved for the internal path.

Allowed default fields:

- ids and versions;
- hashes;
- byte lengths;
- counts;
- enum statuses;
- approval pointer;
- policy ids;
- non-text provenance hashes.

Logs and errors must use structural codes only. They must not include EvidenceItem
text or provider output.

## 12. Side Effects

The W6-C envelope must explicitly record:

- `sufficiencyLlmCalled`
- `promptLoaded`
- `promptRendered`
- `adapterCalled`
- `modelCalled`
- `providerCallbackCreated`
- `providerSdkLoaded`
- `cacheDecisionConstructed`
- `cacheRead = false`
- `cacheWrite = false`
- `parserExecuted = false`
- `sourceReliabilityRead = false`
- `sourceReliabilityWrite = false`
- `storageWrite = false`
- `reportGenerated = false`
- `verdictGenerated = false`
- `warningGenerated = false`
- `confidenceGenerated = false`
- `publicSurfaceWritten = false`

No cache IO is authorized. Cache decision construction may exist only as
fail-closed governance evidence.

## 13. V2 SCORECARD IMPACT

Quality dimension advanced:

- `V2-Q3` Evidence extraction: W6-C lets extracted EvidenceItems be judged for
  portfolio adequacy before downstream use.
- `V2-Q5` Verdict quality: later verdict/report candidates can stop or caveat
  before weak evidence is converted into truth/confidence.
- `V2-Q6` Warning integrity: sufficiency limitation remains internal until a
  later report/warning materiality gate.
- `V2-Q7` Multilingual robustness: sufficiency judgment must be LLM-owned and
  input-language neutral.
- `V2-Q8` Public cutover safety: public V2 remains blocked/precutover.
- `V2-Q9` Cost/latency discipline: one sufficiency call, no retries by default,
  no live canary in this package.
- `V2-Q10` Complexity convergence: W6-C forces W4-I merge/narrow/quarantine
  decision instead of adding another proof route.

Direct user/report value:

- No direct public value yet. It is the first internal gate that can prevent
  weak evidence portfolios from flowing toward report candidates.

Hidden-only value:

- Acceptable because it directly supports report-quality stop/go behavior and
  carries a W4-I retirement decision.

Cost/latency impact:

- No cost in this package. Future implementation may add one LLM call per run
  only after approval; telemetry must record tokens and duration.

Retirement or simplification unlocked:

- W4-I core/sink merge, narrowing, or quarantine decision under `V2-RL-012`.

Scorecard risk:

- The main risk is hidden scoring without report-visible value. The envelope
  therefore must produce report-stop/caveat/refine state for later report path,
  not an opaque score.

## 14. V2 RETIREMENT LEDGER IMPACT

Rows touched:

- `V2-RL-004`: no new admin route.
- `V2-RL-009`: W4 readiness/shell/denial chain remains merge-only.
- `V2-RL-010`: W4-G remains source-text lineage only through W5/W6 parents.
- `V2-RL-011`: W4-H remains extraction-input lineage only through W5/W6 parents.
- `V2-RL-012`: W4-I core/sink must be merged, narrowed, quarantined, or kept
  with a sharper removal trigger in the W6-C implementation closeout.
- `V2-RL-013`: boundary guard receives focused W6-C assertions only; broad split
  remains later.
- `V2-RL-014`: avoid status/backlog narrative duplication.

Status changes:

- Proposed after implementation: `V2-RL-012` from `merge` to either `merge`,
  `quarantine`, or `keep` with exact trigger, based on implementation evidence.

New mechanism owner:

- Proposed `apps/web/src/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment.ts`.

Removal / merge trigger:

- W6-C closeout must state whether W4-I direct runtime state is no longer needed
  for downstream sufficiency lineage validation.

Debt accepted:

- One sufficiency assessment owner.
- One gateway/model/cache approval path for `evidence_sufficiency`.

## 15. V2 CONSOLIDATION GATE

Substantial package:

- Yes. It opens LLM sufficiency execution and bounded EvidenceItem text exposure.

Hidden mechanism added:

- One sufficiency assessment owner. No route or product wiring.

Value produced:

- Converts W5 EvidenceItems into a governed stop/go/caveat sufficiency decision
  for later internal report candidates.

Retires / merges / demotes / quarantines:

- Must decide W4-I core/sink state under `V2-RL-012`.

Steer-Co exception:

- Required and included because this is a phase transition and opens bounded
  text exposure plus LLM execution.

## 16. Latest Debt Sensor Status

Latest closeout run after package and handoff draft:

```text
npm run debt:sensors
Status: advisory_warn
Generated: 2026-05-20T14:04:55.826Z
V2 source: 148 files / 42718 lines
V2 tests: 129 files / 47647 lines
Boundary guard: 10341 lines
Docs/WIP markdown files: 233
Handoff markdown files: 746
Net mechanism increases: 14
V2 consolidation-marker review files: 5
```

Advisory warnings are not blockers, but W6-C implementation must avoid new
diagnostic/proof machinery and must not add routes.

## 17. Required Verifier Set

Before W6-C implementation closeout:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
npm run debt:sensors
npm -w apps/web run build
git diff --check
git diff --cached --check
git status --short --untracked-files=all
```

No expensive tests. No live jobs.

## 18. Required Test Coverage

Focused tests must prove:

- accepted W6-B plus matching W5 extraction creates one internal sufficiency
  input packet;
- mismatched statement hash/length/count fails closed;
- mismatched provider/model/source lineage fails closed;
- W6-C does not read/import/call W4-I directly;
- W6-C never spreads, embeds, serializes, or returns parent W5/W6 objects;
- EvidenceItem statements are present only in the approved LLM input packet;
- upstream evidence-scope and provenance text fields are reduced to hashes,
  byte lengths, or non-text structural projections before W6-C LLM input;
- default decision projection contains hashes/lengths/provenance only;
- logs/errors/blocked/damaged outcomes do not include statement text;
- accepted provider output parses through `EvidenceSufficiencyResultSchema`;
- blocked/damaged provider output fails closed;
- fixed provenance-count formulas are absent from source;
- gateway/model/cache approvals are required before provider call;
- no report/verdict/warning/confidence/public/cache/SR/storage/parser behavior
  occurs.

Boundary guard must prove:

- sufficiency implementation imports only approved dependencies;
- no prompt/schema file was edited;
- no public/app/product/orchestrator/runner/API/UI/report/export/compatibility
  surface imports the W6-C sufficiency module;
- no V1 analyzer imports;
- no provider/parser/source acquisition widening;
- no direct W4-I runtime/sink/provenance dependency.

## 19. Stop Conditions

Stop and reconvene Steer-Co or Captain if:

- implementation requires prompt text or schema edits;
- existing `EvidenceSufficiencyResult` cannot support the needed judgment;
- implementation needs a new route or product/orchestrator wiring;
- implementation needs live jobs;
- implementation needs Source Reliability, truth, confidence, warning, verdict,
  or report behavior;
- implementation proposes any fixed sufficiency formula;
- EvidenceItem text would leak into public/default-admin/log/error surfaces;
- W4-I direct import/read/call/sink access appears necessary;
- provider/model/cache approval cannot be made explicit and traceable;
- verifier failure root cause is unclear;
- scope expands beyond the file envelope.

## 20. Steer-Co Review Requirements

Required reviewers before Captain approval:

- Lead Architect / LLM Governance reviewer: scope, LLM-owned judgment, no fixed
  formulas, task-contract reuse.
- Product Trust / Security reviewer: text-exposure gate, redaction, no public
  leakage.
- Complexity / Retirement reviewer: W4-I decision, no route/proof expansion,
  debt-sensor posture.
- Lead Developer feasibility reviewer: file envelope, verifier set, gateway
  approval implementation feasibility.

This package should return to Captain only after Steer-Co reaches consent or
material dissent remains unresolved.

## 21. Recommendation

Recommendation for Captain:

Approve this W6-C implementation package only if you are ready to open the
bounded EvidenceItem text-exposure gate and LLM sufficiency execution gate under
the exact constraints above.

If not ready, stop here. The current V2 state remains stable at W6-B.
