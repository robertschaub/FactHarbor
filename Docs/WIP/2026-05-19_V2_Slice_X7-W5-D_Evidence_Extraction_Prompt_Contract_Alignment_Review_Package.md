# V2 Slice X7-W5-D Evidence Extraction Prompt/Contract Alignment Review Package

Date: 2026-05-19
Status: locally implemented and verifier-clean; no live job run
Author: Captain Deputy / Lead Developer

## 1. Purpose

X7-W5-C proved that the product route can reach hidden W5 bounded evidence extraction, call the model, and record bounded schema diagnostics. The current blocker is not activation, source material, W4 lineage, or public routing. The blocker is prompt/contract alignment for `V2_EVIDENCE_EXTRACTION`: the model returned parseable JSON that failed `EvidenceExtractionResultSchema`.

W5-D should be a narrow prompt/contract alignment package that clarifies the existing `v2.evidence_extraction_result.0` output shape without changing the schema or adding deterministic repair.

## 2. Ground Truth

- W5-C implementation commit: `68cbae32`
- W5-C live diagnostic job: `7774d72df7734844ad9272967c5d3c7d`
- Source Material text bytes in canary: `960`
- W5 status: `damaged_execution`
- W5 damaged reason: `schema_validation_failed`
- W5 diagnostic status: `parsed` / `schema_validation`
- W5 diagnostic issue count: `8`
- Representative diagnostic path family: `evidenceItems.[non_structural].evidenceScope.*`
- Public V2 remained `4.0.0-cb-precutover` / `blocked_precutover`.
- Default W4-G/W4-H/W4-I/W5 projections and public result did not expose source text.

## 3. Proposed W5-D Scope

Allowed:

- Amend only the `V2_EVIDENCE_EXTRACTION` prompt section in `apps/web/prompts/claimboundary-v2.prompt.md`.
- Clarify all under-specified strict-schema contract fields needed for `EvidenceExtractionResultSchema` output, limited to:
  - `evidenceScope`;
  - `provenance`;
  - branch-specific `null` versus empty-array requirements.
- Clarify the exact accepted `evidenceScope` object shape:
  - `scopeId`
  - `method`
  - `temporalBounds`
  - `populationOrDomain`
  - `geographicScope`
  - `limitations`
- Clarify that nullable evidence-scope fields must be present as `null` when unknown, not omitted.
- Clarify that `limitations` must be an array, possibly empty.
- Clarify the exact accepted `provenance` object shape:
  - `locator`
  - `rationale`
- Clarify that `provenance` is strict and must not include additional keys.
- Clarify branch rules:
  - accepted `evidence_extracted`: `evidenceItems` is a non-empty array and `blockedReason` / `damagedReason` are `null`;
  - accepted `no_extractable_evidence`: `evidenceItems` is an empty array and `blockedReason` / `damagedReason` are `null`;
  - blocked/damaged: `evidenceItems`, `extractionStatus`, and `rationale` are `null`, with only the appropriate blocked/damaged reason populated.
- Clarify that no keys outside the schema may be emitted.
- Add/update prompt contract tests that ensure the W5 evidence-extraction section names the concrete schema fields and does not teach topic-specific terms.
- Add/update focused W5 local tests only if needed to prove the prompt contract and schema diagnostics remain bounded.
- Update status/handoff/Agent_Outputs/index.

Forbidden:

- No schema relaxation or schema version change.
- No deterministic semantic repair, field aliasing, or output normalization to make invalid model output pass.
- No retries or fallback extraction.
- No provider/model routing change or approval flip beyond this prompt text package.
- No parser execution.
- No Source Material widening, W2 endpoint change, provider expansion, ACS/direct URL, cache/SR/storage.
- No public API/UI/report/export/compatibility exposure.
- No report/verdict/warning/confidence behavior.
- No V1 reuse, V1 cleanup, or V1 removal.
- No live job inside implementation. A later canary requires separate explicit authorization after commit/runtime refresh.

## 4. Approval Boundary

This package is approval-gated because it edits analysis prompt text. It should be reviewed and explicitly approved before implementation.

If approved, implementation is limited to topic-neutral prompt contract clarification and focused tests/docs. It must not use the hydrogen canary wording, source text, or any domain-specific failure vocabulary inside the landed prompt.

## 5. Pass Criteria

Local pass requires:

- `V2_EVIDENCE_EXTRACTION` prompt section explicitly states the concrete `evidenceScope` and `provenance` object fields plus branch-specific nullable/array requirements.
- Prompt language remains topic-neutral and multilingual-safe.
- No schema source files are changed.
- No deterministic output repair is added.
- Focused prompt contract tests pass.
- Focused W5 tests pass.
- Boundary guard relevant to prompt/schema/model/public/V1 constraints passes.
- `npm run validate:v2-gates` passes.
- `npm run debt:sensors` is recorded.
- `npm -w apps/web run build` passes.
- `git diff --check` passes.

Suggested verifier set:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
npm run debt:sensors
npm -w apps/web run build
git diff --check
```

## 6. Stop Criteria

Stop and reconvene Steer-Co before implementation continues if:

- The fix requires schema relaxation or output alias repair.
- The prompt needs topic-specific examples or terms.
- The W5-C diagnostics show a deeper task-design issue beyond output-shape clarification.
- Tests fail with unclear root cause.
- The implementation would add another hidden mechanism rather than aligning the existing task contract.
- A reviewer argues that prompt clarification alone risks overfitting or under-specifying EvidenceItem quality.

## 7. Later Canary Proposal

After W5-D is approved, implemented, verifier-clean, committed, and runtime-refreshed, spend at most one live job from the remaining tranche using the exact Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

Expected success signal:

- hidden chain reaches W5;
- W5 no longer fails `EvidenceExtractionResultSchema`;
- result is either `accepted` with at least one bounded EvidenceItem or an accepted `no_extractable_evidence` result with schema-valid rationale;
- default projections and public result still leak no source/input/evidence text;
- parser, cache/SR/storage, report/verdict/warning/confidence/public behavior remain closed.

If W5 still fails schema validation after W5-D, stop live jobs and bring the exact diagnostics back to Steer-Co before any further prompt/schema/model work.

## V2 SCORECARD IMPACT

Quality dimension advanced: V2-Q3 Evidence extraction.

Direct user/report value: none until a later canary produces accepted EvidenceItem output and later report stages consume it.

Hidden-only value: high; this is the shortest path from model execution to schema-valid EvidenceItems.

Cost/latency impact: positive; avoids repeated live canaries by using W5-C diagnostics to target the prompt contract.

Retirement or simplification unlocked: accepted W5 output may unlock W4-I/W4-chain merge/retirement planning and W5-C diagnostic fold-in.

Scorecard risk: if prompt clarification becomes a broad prompt rewrite, it can overfit or create new schema drift. Keep it contract-only.

## V2 RETIREMENT LEDGER IMPACT

Rows touched: V2-RL-009, V2-RL-010, V2-RL-011, V2-RL-012.

Status changes: none in this review package.

New mechanism owner: none; this amends an existing prompt contract.

Removal / merge trigger: schema-valid W5 canary should trigger a follow-up plan to fold W5-C diagnostics into stable telemetry and merge/quarantine W4-I standalone denial proof.

Debt accepted: none expected if implementation stays prompt-contract-only.

## V2 CONSOLIDATION GATE

This package does not add hidden runtime machinery. It targets the existing W5 task contract and should reduce the need for temporary diagnostics once validated.

Latest debt-sensor status at package drafting: `advisory_warn` on 2026-05-19T21:49:32Z for known V2 footprint, test footprint, boundary guard size, docs volume, debt-guard telemetry net mechanism increases, and five older consolidation-marker docs.

## Review Notes

Claude Opus 4.6 reviewed the initial package as `approve_with_changes`. Required amendment: do not limit W5-D to `evidenceScope` alone, because W5-C also reported a top-level union mismatch and the current prompt underspecifies strict `provenance` shape plus branch-specific null/empty-array requirements. This package was amended to allow only these additional contract clarifications: `provenance.{locator,rationale}` and branch-specific `null` versus empty-array rules.

Gemini reviewed the amended package text as `approve`, with no further changes required. Gemini agreed that W5-D is the direct bounded next step and that the approval boundary, forbidden list, pass/stop criteria, and later canary criteria are clear.

## Implementation Closeout

Captain approved analysis prompt edits on 2026-05-20 in the current Codex thread.

Implemented scope:

- `apps/web/prompts/claimboundary-v2.prompt.md`: clarified only the `V2_EVIDENCE_EXTRACTION` output contract.
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`: added focused prompt-contract coverage for strict branch rules, `evidenceScope`, and `provenance`.

No schema files, runtime code, provider/model routing, retries, public behavior, parser/cache/SR/storage, report/verdict/warning/confidence behavior, ACS/direct URL, or V1 files were changed.

Verifier results:

- Focused W5-D verifier set passed: 6 files, 111 tests.
- `npm run validate:v2-gates`: passed.
- `npm run debt:sensors`: `advisory_warn` with existing V2 footprint, boundary guard, docs volume, and consolidation-marker warnings.
- `npm -w apps/web run build`: passed.
- `git diff --check`: passed.

Live jobs: none run for W5-D. A later W5-D canary still requires explicit Captain authorization, committed/refreshed runtime, clean status, and the pass/stop criteria above.
