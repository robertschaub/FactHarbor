# V2 Slice W6-C3 Sufficiency Schema Diagnostics Package

**Status:** Steer-Co-authorized implementation package
**Date:** 2026-05-20
**Author:** Captain Deputy / Steer-Co
**Package type:** code-only diagnostic amendment plus one gated canary
**Implementation baseline:** `5d9c6ef3`

## 1. Purpose

W8-F proved the product route reaches W6-C and stops there:

- job `5a9f11c1b3e34be18b6bf49ed6fc4d65`
- W6-C status `sufficiency_assessment_damaged`
- W6-C damaged reason `schema_validation_failed`
- public V2 remained blocked/precutover with no W8-B/W8-E leak

W6-C3 makes that failure actionable without guessing at prompt or schema
changes. It adds bounded, sanitized schema diagnostics to the existing W6-C
execution telemetry and exposes only that sanitized diagnostic through the
existing W8-B internal artifact projection.

## 2. Steer-Co Decision

Decision: implement diagnostics first, then use one canary to capture the exact
schema issue before any prompt/schema repair.

Reviewer positions:

- Claude Opus 4.6 Senior Architect / LLM Expert: approve option A,
  code-only W6-C diagnostics through the existing W8-B projection.
- GPT code explorer: feasible without new route/sink and with limited source
  files.

Rejected:

- Prompt/contract repair now: speculative without the issue paths.
- Schema relaxation or alias normalization: risks hiding quality failures.
- New route/sink: unnecessary because W8-B already owns the internal chain
  artifact projection.

## 3. Scope

Allowed files:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-provenance.ts` only if needed for contract validation
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts` only if existing guards require it
- package/status/handoff/index/Agent_Outputs docs required by protocol

Allowed behavior:

- Add a nullable W6-C `schemaDiagnostics` field under execution telemetry.
- Populate diagnostics on JSON parse failure and Zod schema validation failure.
- Project the same sanitized diagnostics through W8-B
  `upstreamStopAttribution.parentStatuses.sufficiencyAssessment`.
- Keep successful W6-C decisions with `schemaDiagnostics = null`.
- Keep W6-C decisions runtime-owned after diagnostics are attached.
- Run one post-implementation canary after commit, clean git, runtime refresh,
  runtime commit match, and verifier pass.

Forbidden:

- no prompt/model/config/schema/UCM/gateway edits or approval flips;
- no schema relaxation, alias normalization, retries, second provider, or
  fallback behavior;
- no new route, sink, storage, cache IO, Source Reliability, parser,
  provider expansion, W2/W3 widening, ACS/direct URL, V1 work, or V1 cleanup;
- no EvidenceItem, report, verdict, warning, confidence, public/API/UI/export,
  or compatibility behavior change;
- no raw provider output, provider message, prompt text, rendered prompt text,
  input packet, source text, EvidenceItem statement text, evidence-scope text,
  provenance text, stack trace, hidden ledger id, run id, or internal object
  dump in public/default-admin/log/error surfaces.

## 4. Diagnostic Contract

W6-C diagnostics must be bounded structural metadata only:

- `diagnosticVersion`: `v2.evidence-lifecycle.sufficiency-assessment.schema-diagnostics.w6c3`
- `contractName`: `EvidenceSufficiencyResultSchema`
- `contractVersion`: `v2.evidence_sufficiency_assessment.0`
- `outputParseStatus`: `not_attempted`, `parse_failure`, or `parsed`
- `failureCategory`: `none`, `parse_failure`, or `schema_validation`
- `issueCount`: number
- `issues`: max 8 entries, each:
  - `path`: max 8 sanitized structural segments
  - `code`: bounded structural code
- redaction booleans proving raw provider output, raw schema messages, provider
  completion text, source text, input text, EvidenceItem text, prompt text, and
  stack traces are not returned
- removal trigger:
  `remove_or_fold_into_stable_w6c_telemetry_after_schema_root_cause_resolution_and_later_captain_approved_canary`

The diagnostic must not include Zod `message`, `expected`, `received`, provider
payload excerpts, or raw completion fingerprints unless a later package proves
that a fingerprint is necessary. The first W6-C3 implementation should prefer
issue paths and codes only.

## 5. Pass Criteria

Implementation passes if:

- malformed JSON yields `parse_failure` diagnostics with a `json_parse_error`
  issue and no raw payload;
- malformed but parsed provider output yields `schema_validation` diagnostics
  with bounded issue paths/codes and no schema messages;
- accepted W6-C output keeps diagnostics `null`;
- W8-B default route projection exposes only the sanitized diagnostics under
  the existing authenticated no-store route;
- public result JSON and default-admin route surfaces do not expose diagnostics,
  raw provider output, prompt text, EvidenceItem text, source text, ledger ids,
  run ids, or internal decision ids;
- no new route/sink or public behavior is added;
- V2 gate validation and boundary guards remain green.

## 6. Stop Criteria

Stop and reconvene Steer-Co if:

- the fix requires prompt/model/config/schema/UCM/gateway edits;
- diagnostics cannot be projected through the existing W8-B route without a new
  route or sink;
- any raw provider text, source text, EvidenceItem statement, prompt text,
  hidden ledger id, stack trace, or raw schema message appears in an exposed
  artifact;
- verifier failures point outside W6-C/W8-B projection ownership;
- the implementation would exceed the allowed file envelope;
- one canary after implementation fails to capture diagnostics.

## 7. Verifier Plan

Before implementation commit:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run debt:sensors
npm -w apps/web run build
npm run index
git diff --check
```

Before live canary:

- implementation is committed;
- unrelated dirty files are isolated non-destructively;
- runtime is refreshed;
- API/Web runtime hashes match the implementation commit;
- W8-B route preflight confirms `401` unauthenticated, bounded `404`
  authenticated missing ledger, and `Cache-Control: no-store`.

The canary uses exactly:

`Using hydrogen for cars is more efficient than using electricity`

with `pipelineVariant = "claimboundary-v2"`.

## 8. Expected Canary Classification

Classify as `PASS_X7_W6_C3_SUFFICIENCY_SCHEMA_DIAGNOSTICS_CAPTURED` if the
single canary still stops at W6-C with sanitized diagnostics populated and no
public/default-admin/raw-text leak.

If W6-C unexpectedly passes, stop and review non-determinism before proceeding.
If diagnostics are absent, stop and re-scope; do not spend a second canary.

## 9. V2 SCORECARD IMPACT

Quality dimension advanced:

- `V2-Q5`: turns W6-C from symptom-only failure into actionable prompt/contract
  repair evidence.
- `V2-Q8`: preserves public pre-cutover containment.
- `V2-Q10`: spends at most one job after local diagnostics make the result
  interpretable.

Direct user/report value:

- None publicly. This is infrastructure toward first internal report-quality
  evidence.

## 10. V2 RETIREMENT LEDGER IMPACT

Rows touched:

- V2-RL-004 hidden observability ledger and artifact routes.
- V2-RL-014 V2 WIP/handoff volume.

Status changes:

- None.

New mechanism owner:

- W6-C3 nullable diagnostics, owned by Lead Developer / Captain Deputy.

Removal / merge trigger:

- Remove or fold into stable W6-C telemetry after the W6-C schema root cause is
  fixed and a later Captain-approved canary verifies W6-C completion.

Debt accepted:

- One bounded temporary diagnostic field. It is justified because W6-C already
  runs the provider and fails at strict schema validation, but current telemetry
  lacks the issue paths needed for a non-speculative repair.

## 11. V2 CONSOLIDATION GATE

Gate result: pass with Steer-Co exception for bounded diagnostic work.

Reason: W6-C3 adds temporary diagnostic metadata, but amends existing W6-C and
W8-B mechanisms rather than adding a new route/sink. It directly unlocks a
prompt/contract repair decision and has an explicit removal/fold trigger.

Latest debt-sensor status:

- `advisory_warn` on 2026-05-20T22:18:12Z.
- Salient warnings: V2 source/test footprint, boundary guard size, docs volume,
  net mechanism increases, and five consolidation-marker review files.

## 12. Output Requirements

After implementation:

- create implementation handoff;
- append `Docs/AGENTS/Agent_Outputs.md`;
- update status/backlog as needed;
- run `npm run index`;
- commit the focused implementation.

After canary:

- create W6-C3 live-result WIP document;
- update `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`;
- update status/backlog, Agent_Outputs, and handoff index;
- commit the result package.
