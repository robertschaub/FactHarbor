# V2 Slice W6-B EvidenceItem Handoff To Sufficiency Intake Review Package

Date: 2026-05-20
Status: review-package-only
Owner: Captain Deputy / Lead Developer
Scope: V2 only

## 1. Purpose

W6-B proposes the first downstream bridge after W5-F:

```text
EvidenceItemHandoffDecision -> internal sufficiency intake contract
```

This package is review-only. It does not authorize implementation, live jobs,
prompt/model/config/schema edits, public behavior, or semantic sufficiency
execution.

This package also carries forward the V2 epistemic adjustment rule: W6-B must
not introduce fixed truth/confidence adjustment formulas for Source Reliability,
source independence, proxy fit, evidence sufficiency, or evidence scarcity.
Those adjustments belong to later approved LLM-owned structured judgments with
cited EvidenceItem/provenance support, or to an explicitly Captain-approved
policy. W6-B code may validate structure, lineage, ids, redaction, counts, and
side-effect boundaries only.

## 2. Exact Owner Module / Files

Proposed implementation owner:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake.ts`

Proposed type/test support, if needed:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/sufficiency/index.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff.test.ts`

Existing input owner:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff.ts`

Boundary guard verifier owner:

- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

No route file is proposed. No orchestrator/product wiring is proposed in W6-B.
No W6-B file may be created under `apps/web/src/app`.

## 3. Input Contract

W6-B accepts exactly one input:

- `EvidenceItemHandoffDecision`

W6-B consumes W4-I only through fields already present on
`EvidenceItemHandoffDecision`. W6-B must not import, read, call, or inspect W4-I
core, sink, provenance helpers, artifact stores, routes, or runtime state
directly.

Required accepted input values:

- `decisionVersion = v2.evidence-lifecycle.evidence-item-handoff.x7w5f`
- `kind = evidence_item_handoff`
- `handoffStatus = evidence_items_ready_for_downstream_internal_handoff`
- `blockedReason = null`
- `damagedReason = null`
- `visibility = internal_admin_only`
- `publicPointerExposure = forbidden`
- `publicCutoverStatus = blocked_precutover`
- `defaultProjection = hash_length_provenance_only`
- `admittedEvidenceItemCount > 0`
- `evidenceItemStatementHashes.length = admittedEvidenceItemCount`
- `evidenceItemStatementByteLengths.length = admittedEvidenceItemCount`
- `w4iDisposition = historical_same_ledger_evidence_merged`
- `replacementW4iTrigger = after_w5f_handoff_route_projection_verified`
- all side-effect flags remain false

Blocked input states:

- W5-F missing;
- `handoffStatus = evidence_item_handoff_blocked`;
- `handoffStatus = evidence_item_handoff_damaged`;
- missing or mismatched statement hash/length arrays;
- missing provider/model/source-material/W4-H lineage where required by W5-F;
- W4-I historical evidence missing or not merged.

W6-B must not use W5-G canary evidence as a substitute for current runtime input.
W5-G is authority that the W5-F path was live-reachable, not a runtime value.

## 4. Internal Sufficiency Intake Output Contract

Proposed contract name:

- `SufficiencyIntakeDecision`

Exact decision version:

- `v2.evidence-lifecycle.sufficiency-intake.w6b`

Proposed accepted status:

- `sufficiency_intake_ready_for_contract_only_assessment`

Proposed blocked status:

- `sufficiency_intake_blocked`

Proposed damaged status:

- `sufficiency_intake_damaged`

Allowed `blockedReason` values:

- `evidence_item_handoff_missing`
- `evidence_item_handoff_not_ready`
- `evidence_item_handoff_blocked`
- `evidence_item_handoff_damaged`
- `evidence_item_handoff_lineage_missing`
- `evidence_item_handoff_side_effects_not_closed`

Allowed `damagedReason` values:

- `admitted_count_projection_mismatch`
- `statement_projection_mismatch`
- `lineage_projection_mismatch`
- `non_contract_only_parent`
- `parent_projection_contains_forbidden_text`

Required fields:

- `decisionVersion`
- `decisionId`
- `kind = sufficiency_intake`
- `intakeStatus`
- `blockedReason`
- `damagedReason`
- `visibility = internal_admin_only`
- `publicPointerExposure = forbidden`
- `publicCutoverStatus = blocked_precutover`
- `defaultProjection = hash_length_provenance_only`
- `parentEvidenceItemHandoffDecisionId`
- `parentEvidenceItemHandoffVersion`
- `admittedEvidenceItemCount`
- `evidenceItemStatementHashes`
- `evidenceItemStatementByteLengths`
- `sourceMaterialLineageHash`
- `w4hPacketHash`
- `providerId`
- `modelId`
- `lineageHash`
- `assessmentExecution = closed_contract_only`
- `redaction`
- `sideEffects`

Field construction rule:

- construct `SufficiencyIntakeDecision` from an explicit allowlist of parent
  fields only;
- do not spread, clone, embed, serialize, or return the parent
  `EvidenceItemHandoffDecision`;
- ignore and exclude any extra fields present on a casted or malformed parent
  input.

Required redaction:

- `evidenceItemTextReturned = false`
- `sourceTextReturned = false`
- `inputTextReturned = false`
- `summaryTextReturned = false`
- `providerPayloadReturned = false`

Required side effects:

- `sufficiencyLlmCalled = false`
- `reportGenerated = false`
- `verdictGenerated = false`
- `warningGenerated = false`
- `confidenceGenerated = false`
- `publicSurfaceWritten = false`
- `cacheRead = false`
- `cacheWrite = false`
- `sourceReliabilityRead = false`
- `sourceReliabilityWrite = false`
- `storageWrite = false`
- `providerCalled = false`
- `parserExecuted = false`

W6-B output is an intake contract only. It does not decide evidence sufficiency,
truth, confidence, verdict, warning materiality, source independence, language
coverage, temporal fit, or expected-evidence gaps.

It also does not calculate any adjusted truth, adjusted confidence, source
reliability discount, independence multiplier, proxy-fit cap, sufficiency score,
or scarcity penalty.

Multilingual neutrality:

- EvidenceItem statements are opaque hash/length/provenance signals only in
  W6-B;
- W6-B must not branch on language, script, locale, keywords, translations,
  token patterns, sentence structure, or meaning;
- non-English or mixed-script sentinel text in unsafe extra fields must not
  appear in output, logs, errors, or default-admin projections.

## 5. Redaction And No-Leak Constraints

Public, UI, report, export, compatibility projection, logs, errors, and
default-admin projections must not expose:

- EvidenceItem statement text;
- source text;
- input text;
- snippets;
- summaries;
- prompt text;
- provider payloads;
- hidden ledger ids;
- internal statuses outside explicitly authenticated internal admin inspection.

Default projection is hash/length/provenance-only. If a future package proposes
text inspection, it must be explicit, authenticated, no-store, and separately
approved.

## 6. Side-Effect Stance

W6-B is no-store and contract/test-only by default.

Cache/SR/storage/provider/parser stance:

- cache read: forbidden
- cache write: forbidden
- Source Reliability read: forbidden
- Source Reliability write: forbidden
- durable storage write: forbidden
- provider/network call: forbidden
- parser execution: forbidden
- LLM sufficiency call: forbidden unless a later package separately approves
  prompt/model/config/schema behavior and execution eligibility

Prompt/config/schema bypass stance:

- prompt text: forbidden
- UCM config reads or writes: forbidden
- prompt profile changes or reads for sufficiency behavior: forbidden
- model policy changes or reads for sufficiency behavior: forbidden
- gateway approval changes or reads for sufficiency execution: forbidden
- task-contract prompt schema edits or imports: forbidden
- fallback prompt/config behavior: forbidden
- LLM output schemas, prompt-facing schemas, gateway task schemas,
  EvidenceItem schemas, and task-contract schemas: forbidden
- local TypeScript contract/types for `SufficiencyIntakeDecision`: allowed

Epistemic adjustment stance:

- fixed truth/confidence adjustment formula: forbidden
- Source Reliability truth/confidence weighting: forbidden
- source independence multiplier/cap: forbidden
- proxy-fit confidence cap: forbidden
- evidence sufficiency score: forbidden
- evidence scarcity penalty formula: forbidden
- LLM-owned structured judgment: out of scope for W6-B and requires later
  approval

## 7. W4-I Core/Sink Retirement Decision

Decision: keep with sharper trigger.

Rationale:

- X7-W5-H retired the standalone W4-I admin route and route test.
- W4-I core/sink/provenance remain needed as historical lineage evidence for
  W5-F and W6-B intake validation.
- Deleting W4-I core/sink now would force W6-B to either trust incomplete
  lineage or duplicate the same eligibility facts.
- W6-B itself must still consume those facts only through
  `EvidenceItemHandoffDecision` fields. Direct W4-I imports or reads remain
  outside the W6-B envelope.

Sharper trigger:

```text
Retain W4-I core/sink only until W6-B sufficiency intake and the next W6-C
sufficiency assessment owner can validate W5-F lineage without consulting W4-I
runtime sink state. At that point, W4-I core/sink must be merged into the stable
lineage owner, narrowed to a pure type/provenance helper, or quarantined.
```

No new W4-I consumers may be added except W6-B lineage validation under this
package boundary.

## 8. V2 Scorecard Impact

Quality dimension advanced:

- `V2-Q3` Evidence extraction: preserves W5-F EvidenceItem handoff as the
  downstream evidence input.
- `V2-Q5` Verdict quality: creates a controlled intake boundary before any
  sufficiency/verdict/report candidate.
- `V2-Q8` Public cutover safety: keeps public V2 blocked/precutover.
- `V2-Q10` Complexity convergence: avoids another route and sharpens W4-I
  retirement trigger.

Direct user/report value:

- none yet. W6-B is the minimum bridge toward report value.

Hidden-only value:

- acceptable because it directly connects W5-F to the internal Alpha stop-line
  and does not add a route or proof lane.

Cost/latency impact:

- none. No LLM, provider, parser, cache, storage, or live job.

Retirement or simplification unlocked:

- W4-I core/sink gets a sharper merge/quarantine trigger for W6-C.

Scorecard risk:

- W6-B may be mistaken for actual sufficiency assessment. The contract must say
  `closed_contract_only` and block report/verdict generation.

## 9. V2 Retirement Ledger Impact

Rows touched:

- `V2-RL-004`: no new admin route; future route consolidation remains required.
- `V2-RL-009`: W4 readiness/shell/denial chain remains merge-only.
- `V2-RL-010`: W4-G remains source-text lineage parent.
- `V2-RL-011`: W4-H remains extraction-input lineage parent.
- `V2-RL-012`: W4-I core/sink kept with sharper W6-C trigger.
- `V2-RL-013`: boundary guard remains oversized; update only focused W6-B
  section if implemented.

Status changes:

- none in this review package.

New mechanism owner:

- proposed `sufficiency/sufficiency-intake.ts`, owned by Lead Developer.

Removal / merge trigger:

- W6-C must decide whether W4-I core/sink is merged, narrowed, kept, or
  quarantined after sufficiency owner can validate lineage without sink state.

Debt accepted:

- one contract-only sufficiency intake owner is proposed.
- W4-I core/sink remains temporary lineage debt.

## 10. Debt Sensor Status

Latest `npm run debt:sensors`:

- Status: `advisory_warn`
- Generated: `2026-05-20T11:35:45.214Z`
- Salient warnings:
  - V2 source/test line footprint over advisory threshold;
  - boundary guard size over advisory threshold;
  - Docs/WIP and handoff volume over advisory threshold;
  - debt-guard telemetry has net mechanism increase mentions;
  - five older Source Acquisition/EvidenceCorpus docs lack consolidation
    markers.

These are steering signals, not blockers. W6-B implementation must not increase
hidden mechanism count without a removal trigger.

## 11. Focused Verifier List

If implementation is later approved, required verifiers:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
npm run debt:sensors
npm -w apps/web run build
git diff --check
git status --short --untracked-files=all
```

Verifier expectations:

- `sufficiency-intake.test.ts` must include unsafe extra fields via casted
  parent input and non-English sentinel text; output, logs, and errors must not
  contain the sentinel text or any parent text fields;
- tests must prove allowlisted field construction only: no spread, clone, or
  parent embedding;
- boundary guard must prove W6-B imports only approved structural dependencies
  and does not import `@/app`, routes, orchestrator, runner/product modules,
  analyzer-v2 runtime modules, cache/SR/storage modules, provider/network
  modules, parser modules, prompt/model adapters, report/verdict/warning/
  confidence modules, ACS/direct URL modules, or V1 analyzer modules;
- boundary guard must prove no W6-B files exist under `apps/web/src/app`;
- boundary guard must prove the orchestrator, product runner, and app routes do
  not import the sufficiency intake module.

No live job. No expensive LLM tests.

## 12. Hard Stop Triggers

Stop and reconvene Steer-Co if:

- W6-B implementation starts before explicit approval;
- live-job execution is proposed while tranche remaining is `0`;
- owner files or verifier files change outside the package envelope;
- W6-B imports or reads W4-I core/sink/provenance directly instead of consuming
  only `EvidenceItemHandoffDecision` fields;
- a route, sink, provider call, parser call, cache/SR/storage behavior, prompt,
  model, config, schema, public surface, report, verdict, warning, confidence,
  ACS/direct URL, provider expansion, or V1 work becomes necessary;
- prompt text, UCM config, prompt profile, model policy, gateway approval,
  task-contract prompt schema, fallback prompt/config behavior, LLM output
  schema, prompt-facing schema, gateway task schema, EvidenceItem schema, or
  task-contract schema access becomes necessary;
- any text appears in public/default-admin/log/error surfaces;
- implementation branches on language, script, locale, keywords, translations,
  token patterns, sentence structure, or meaning;
- implementation spreads, clones, embeds, serializes, or returns the parent
  `EvidenceItemHandoffDecision`;
- sufficiency semantics are implemented through keywords, regex, hardcoded topic
  categories, deterministic language assumptions, or rule-based semantic
  scoring;
- any fixed epistemic adjustment formula is introduced for Source Reliability,
  source independence, proxy fit, evidence sufficiency, evidence scarcity,
  truth, or confidence;
- W5-G canary evidence is used as current runtime sufficiency evidence;
- W4-I core/sink deletion appears necessary before W6-C owner exists;
- any verifier fails with unclear root cause.

## 13. Review Team And Approval Requirements

Required review team before implementation approval:

- Captain Deputy: authority, scope, scorecard, retirement-ledger impact.
- Lead Developer: implementation feasibility, file envelope, verifier plan.
- Lead Architect: sufficiency placement and stage sequencing.
- LLM Expert: semantic ownership and no deterministic semantic logic.
- Product Trust / Report Quality reviewer: report-value relevance and warning
  materiality boundary.
- Code/Security reviewer: redaction, public/default-admin leak checks,
  side-effect stance, no-store posture.

Approval requirements:

- Captain acceptance of this W6-B package before implementation.
- Separate Captain approval for any prompt/model/config/schema behavior.
- Separate Captain approval for live-job tranche reset or canary.
- Separate Captain approval for public behavior, cutover, or V1 cleanup.

## 14. Recommendation

Recommendation: approve W6-B for implementation only if the Captain accepts a
contract/test-only sufficiency intake bridge with no semantic sufficiency
execution. If accepted, implementation should be one narrow module plus focused
tests and boundary guard, with no live job.
