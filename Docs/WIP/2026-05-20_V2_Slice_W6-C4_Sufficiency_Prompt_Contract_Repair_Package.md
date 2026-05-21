# V2 Slice W6-C4 Sufficiency Prompt Contract Repair Package

**Status:** locally implemented and verifier-clean; canary pending
**Date:** 2026-05-20
**Author:** Captain Deputy / Steer-Co
**Package type:** prompt-contract repair approval package
**Evidence source:** `Docs/WIP/2026-05-20_V2_Slice_W6-C3_Sufficiency_Schema_Diagnostics_Canary_Result.md`
**Source implementation baseline:** `cb070a7d`
**Latest result commit:** `d1ba9c4d`
**Implementation handoff:** `Docs/AGENTS/Handoffs/2026-05-21_Lead_Developer_V2_W6-C4_Sufficiency_Prompt_Repair_Implementation.md`

## 1. Purpose

W6-C3 captured the exact W6-C schema failure paths from product-route job
`0456086280104979b74da724d9d58308`.

W6-C currently reaches provider execution and returns parseable JSON, but the
output fails the strict `EvidenceSufficiencyResultSchema`:

- invalid enum values under
  `sufficiencyAssessment.missingEvidenceDimensions.*.dimension`;
- invalid enum value under
  `sufficiencyAssessment.missingEvidenceDimensions.2.materiality`;
- invalid integrity event shape at `integrityEvents.0.type`,
  `integrityEvents.0.references`, and `integrityEvents.0`.

The likely root cause is prompt-contract underspecification in
`V2_EVIDENCE_SUFFICIENCY_GATE`: the section names the fields but does not list
the exact enum literals for `missingEvidenceDimensions.dimension` or
`materiality`, and it relies on a shared task-event contract instead of
repeating the exact event object shape locally for this gate.

## 2. Recommendation

Implement W6-C4 as a narrow prompt-contract repair, not a schema relaxation:

1. Amend only the `V2_EVIDENCE_SUFFICIENCY_GATE` section of
   `apps/web/prompts/claimboundary-v2.prompt.md`.
2. Add the exact allowed literals for:
   - `missingEvidenceDimensions[].dimension`;
   - `missingEvidenceDimensions[].materiality`;
   - `integrityEvents[].type`, `severity`, `message`, and `references`.
3. Add the exact allowed literals for `blockedReason` and `damagedReason`,
   matching the W6-C schema and sibling V7-B prompt convention.
4. State explicitly that `integrityEvents` entries must use
   `{ "type", "severity", "message", "references" }`, not alternate keys such
   as `eventType`, `refs`, `reference`, `detail`, or `details`.
5. Keep wording topic-neutral and schema-focused. Do not add domain examples or
   test-case terms.
6. Do not change TypeScript schemas, model policy, gateway policy, UCM,
   runtime activation, provider seams, cache behavior, or public output.

This package intentionally treats the existing schema as authoritative. The
repair should make the model comply with the contract already enforced by code.

## 3. Approval Boundary

Allowed files:

- `apps/web/prompts/claimboundary-v2.prompt.md`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas.ts` only if the least-complex verifier path needs export-only access to existing Zod enum constants; no enum literals, schemas, validation behavior, or contract semantics may change
- W6-C focused tests only if needed to assert the repaired prompt section is
  loaded for `evidence_sufficiency`
- package/status/handoff/index/Agent_Outputs docs required by protocol

Allowed behavior:

- prompt text amendment in the W6-C prompt section only;
- tests proving the prompt section contains the exact W6-C enum literals,
  blocked/damaged reason literals, and task-event field names;
- tests deriving literal expectations from the schema source of truth where
  feasible, instead of duplicating a disconnected hand-maintained test list;
- tests proving the W6-C prompt section does not contain the canary-domain terms
  `hydrogen`, `electricity`, `cars`, `vehicle`, or `efficient`;
- one post-implementation product-route canary after commit, clean git,
  runtime refresh, runtime hash match, prompt reseed/runtime refresh, W8-B
  route preflight, and focused verifiers.

Forbidden:

- TypeScript schema changes or schema relaxation;
- changed schema literals, validation behavior, or output-contract semantics;
- alias normalization for invalid enum values or event keys;
- model/config/UCM/gateway approval flips;
- additional retries, fallback parsing, or repair loops;
- new route, sink, storage, cache IO, Source Reliability, parser, provider
  expansion, W2/W3 widening, ACS/direct URL, V1 work, or V1 cleanup;
- EvidenceItem, report, verdict, warning, confidence, public/API/UI/export, or
  compatibility behavior changes;
- raw provider output, prompt text, source text, EvidenceItem statement text,
  hidden ledger ids, run ids, stack traces, or raw schema messages in
  public/default-admin/log/error surfaces.

## 4. Pass Criteria

Local implementation passes if:

- the repaired prompt section lists all accepted
  `missingEvidenceDimensions[].dimension` values:
  `source_diversity`, `direct_evidence`, `counter_evidence`,
  `temporal_coverage`, `method_quality`, `source_access`, `other`;
- the repaired prompt section lists all accepted `materiality` values:
  `none`, `minor`, `material`;
- the repaired prompt section repeats the task-event object contract:
  `type`, `severity`, `message`, `references`;
- the repaired prompt section lists all accepted `blockedReason` values:
  `task_policy_not_executable`, `prompt_not_approved`,
  `input_contract_invalid`, `source_acquisition_not_executable`,
  `source_content_missing`;
- the repaired prompt section lists all accepted `damagedReason` values:
  `schema_validation_failed`, `provider_unavailable`,
  `task_contract_validation_failed`;
- tests prove no prompt section drift for W6-C literals, preferably by deriving
  expected literals from the schema source of truth;
- tests prove the W6-C section contains none of the canary-domain terms
  `hydrogen`, `electricity`, `cars`, `vehicle`, or `efficient`;
- no TypeScript schema, model policy, gateway policy, UCM, public output, or
  provider seam changes are made;
- focused W6-C prompt-contract tests, W6-C tests, boundary guard, V2 gate
  validation, debt sensors, build, index, and whitespace checks pass.

Canary passes if:

- product-route W6-C no longer stops with `schema_validation_failed` for the
  W6-C3 captured issue paths;
- none of the eight W6-C3 captured issue paths recur in W6-C diagnostics;
- if W6-C returns accepted, `schemaDiagnostics` is `null`;
- public V2 remains `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`;
- W8-B default route remains internal/admin-only, no-store, and text-free by
  default;
- no public/default-admin/log/error raw-text leak occurs.

If the product route advances beyond W6-C and stops at a downstream owner, that
is acceptable for this package and should be documented as the next stop-line.

## 5. Stop Criteria

Stop and reconvene Steer-Co if:

- implementing the repair requires TypeScript schema changes;
- the prompt edit would need topic-specific or test-case-specific wording;
- the prompt edit cannot preserve multilingual neutrality, including not
  requiring translation before sufficiency reasoning;
- focused local tests fail with unclear root cause;
- W6-C still fails with the same schema paths after one canary;
- W6-C fails with new schema paths that imply a broader contract mismatch;
- W6-C unexpectedly changes public result behavior;
- any raw provider, prompt, source, EvidenceItem, hidden ledger, or stack
  content leaks into public/default-admin/log/error surfaces;
- a second canary appears necessary.

## 6. Verifier Plan

Before implementation commit:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run debt:sensors
npm -w apps/web run build
npm run index
git diff --check
```

Before a live canary:

- implementation committed;
- prompt/config reseed or runtime restart completed;
- API/Web runtime hashes match the committed revision;
- git status clean;
- W8-B route preflight confirms unauthenticated denial, authenticated
  missing-ledger `404`, and `Cache-Control: no-store`.

Canary input:

`Using hydrogen for cars is more efficient than using electricity`

Budget:

- One canary may be proposed after implementation review and commit.
- Current live-job budget before W6-C4 canary: `7`.
- No second W6-C4 canary without a separate reviewed package.

## 7. V2 SCORECARD IMPACT

Expected impact:

- `V2-Q5`: direct progress toward a valid hidden sufficiency assessment instead
  of diagnostic-only stop ownership.
- `V2-Q6`: improves report-value path by allowing downstream
  Boundary/Verdict ownership to be exercised if W6-C accepts.
- `V2-Q8`: preserves public pre-cutover containment.
- `V2-Q10`: spends one job only after local prompt-contract evidence is
  available.

This is the first post-W6-C3 repair step that can plausibly move the product
route from sufficiency stop-line diagnostics toward first internal Alpha report
candidate material.

## 8. V2 RETIREMENT LEDGER IMPACT

Rows touched:

- V2-RL-004 hidden observability ledger and artifact routes.
- V2-RL-014 V2 WIP/handoff volume.

Older guard/artifact retired or merged:

- None immediately.

Retirement pressure:

- If W6-C4 canary passes and W6-C no longer needs W6-C3 diagnostics, the next
  package should either remove/fold W6-C3 diagnostics into stable W6-C telemetry
  or update its removal trigger with a concrete downstream stop-line reason.

## 9. V2 CONSOLIDATION GATE

Gate result: pass for review-package preparation.

Reason:

- This package does not add hidden machinery. It repairs an existing prompt
  contract so an already-approved LLM task can satisfy the strict schema.
- It directly advances report-value path and sets a removal trigger for W6-C3
  diagnostic debt.

Latest debt-sensor status:

- `advisory_warn` on 2026-05-20T22:54:06Z.
- Salient warnings: V2 source/test footprint, boundary guard size, WIP/handoff
  doc volume, debt-guard net mechanism increases, and five consolidation-marker
  review files.

## 10. Roles And Ownership

- Package author: Captain Deputy / Steer-Co.
- Reviewer: Steer-Co, including Claude Opus 4.6 architecture/LLM review.
- Implementer: Lead Developer.
- Canary runner: Captain Deputy / Lead Developer after separate canary
  authorization inside this package and runtime discipline.

## 11. Unlocks, Retires, Stop Condition

What the gate unlocks:

- A narrow prompt-contract implementation package for W6-C only.
- After implementation, exactly one W6-C4 product-route canary.

What it retires or merges:

- No code path immediately. It creates a concrete opportunity to retire or fold
  W6-C3 diagnostics after a successful canary.

Stop condition:

- Stop after one canary, whether pass or fail. If W6-C does not accept or if a
  new schema/root-cause class appears, prepare a new package from that evidence.
