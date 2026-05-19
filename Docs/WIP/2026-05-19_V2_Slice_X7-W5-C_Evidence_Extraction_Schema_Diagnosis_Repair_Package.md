# V2 Slice X7-W5-C Evidence Extraction Schema Diagnosis And Repair Package

Date: 2026-05-19
Role: Lead Developer / Captain Deputy
Status: Steer-Co reviewed package / no implementation yet / no live job authorized by this package

Steer-Co review: Claude Opus 4.6 Senior Architect / LLM Expert, Gemini systems reviewer, and Code Reviewer sidecar reviewed this package after the W5-B live canary. Consolidated position: proceed only after the amendments in this package; W5-C remains local diagnosis/repair and does not authorize prompt/schema changes or another live job.

## Purpose

X7-W5-B repaired the Claim Understanding activation gate and moved the live blocker downstream.

Ground truth from job `3524dcb15866442ea92bee6351591976`:

- Claim Understanding accepted.
- Query Planning accepted.
- W2 provider network produced `9` candidates and `14082` bytes.
- W3-B produced `1` bounded Source Material record.
- W4-G produced `1` bounded text sidecar, `392` bytes, provider `wikimedia_core`.
- W4-H produced `1` bounded extraction-input packet with the same hash/length/provider lineage.
- W4-I reported `extraction_input_structurally_eligible_execution_denied`.
- W5 loaded/rendered the prompt and called the model.
- W5 ended `damaged_execution` / `schema_validation_failed` with `0` EvidenceItems.

The next step is a narrow local W5-C diagnosis/repair package for the schema-validation failure. It must not become a broad report-quality, provider, parser, or public-output step.

## Scope

Allowed after review approval:

- Reproduce or narrow the W5 `schema_validation_failed` path with focused local tests and existing fixtures before adding any new diagnostic field.
- Add sanitized diagnostic detail for W5 schema failures only if current local fixtures and existing telemetry cannot identify the mismatch.
- Tighten adapter/test handling around `EvidenceExtractionResultSchema` only when this means implementation/test alignment with the existing strict contract. It must not relax the schema, normalize semantic aliases, or accept alternate evidence meanings.
- Align implementation docs/status with the observed W5-B live evidence.
- Run only local/focused verifiers and build.

Blocked until separate explicit approval:

- prompt text edits;
- schema edits;
- model/provider selection changes;
- another live job/canary;
- public API/UI/report/export/compatibility behavior;
- EvidenceItem public exposure;
- parser execution;
- report/verdict/warning/confidence behavior;
- cache/SR/storage behavior;
- provider expansion, W2/W3 widening, ACS/direct URL support;
- V1 reuse, cleanup, or removal.

## Diagnosis Questions

W5-C must answer these before any repair is committed:

1. Did the provider return malformed JSON, schema-invalid JSON, or an accepted object that the adapter mis-handled?
2. If schema-invalid, which schema path failed: top-level envelope, `evidenceItems`, `evidenceScope`, provenance, enum value, or strict extra key?
3. Is the current prompt contract ambiguous relative to `EvidenceExtractionResultSchema`, or are tests/adapter fixtures missing a valid accepted/no-evidence shape?
4. Is the schema failure input/model-correlated, e.g. limited to one canary/source-material shape/model response, or does it reproduce generically against the existing W5 task contract?
5. Can the repair stay in adapter diagnostics/tests/contract alignment without prompt or schema edits?
6. If prompt/schema text is required, stop and prepare a separate Captain-approved prompt/schema package.

## Proposed Implementation Envelope

Likely files, if approved:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-owner.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-owner.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- status, handoff, Agent_Outputs, index files as required.

Do not touch `apps/web/prompts/claimboundary-v2.prompt.md` or `apps/web/src/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas.ts` inside this package unless Captain explicitly approves a W5-C prompt/schema amendment.

## Diagnostic Sanitization Contract

If W5-C adds schema-failure diagnostics, the diagnostic surface is allowlist-only:

- Allowed: schema issue category/code, bounded schema path segments, bounded issue counts, contract name/version, output parse status, prompt/model/policy hashes already approved for hidden telemetry, and short structural status labels.
- Forbidden: raw provider JSON, raw Zod messages unless proven value-free and bounded, provider completion text, source text, input text, EvidenceItem text, prompt text, stack traces, arbitrary received values, raw URLs/titles/page keys, and any field that can reconstruct source material.
- Default admin routes must remain hash/length/provenance-only and no-store.
- Any temporary diagnostic field needs a removal/fold-in trigger: remove it or fold it into stable W5 telemetry after the schema-failure root cause is resolved and one later Captain-approved canary verifies W5 behavior.

## Pass Criteria

- Focused W5 tests prove the current accepted and no-extractable-evidence schemas still pass.
- A schema-invalid provider output records sanitized failure category/path information without raw provider payload, source text, input text, EvidenceItem text, prompt text, or stack traces.
- Negative-path leak tests prove schema-invalid/default route projections do not expose raw provider output, source/input text, EvidenceItem text, prompt text, stack traces, raw schema messages, or arbitrary received values.
- W5 remains hidden/internal and default projections remain hash/length/provenance-only.
- No public result fields, UI, report, export, compatibility projection, log, or error exposes source/input/EvidenceItem text.
- No cache read/write, parser, SR/storage, report, verdict, warning, confidence, provider expansion, ACS/direct URL, or V1 work is introduced.
- Local verifiers and build pass.

## Stop Criteria

Stop and return to Captain/Steer-Co if:

- the root cause requires prompt text or schema changes;
- raw provider output or source text would be needed in a default artifact, public response, log, or error;
- the repair would normalize semantic evidence meaning deterministically;
- the repair would add retries or broad fallback behavior instead of fixing the schema contract;
- focused verifier failure root cause is unclear;
- another live job seems necessary before local diagnosis is complete.

## Mandatory Workflows

W5-C is failed-validation recovery after a live canary reached W5 and returned `schema_validation_failed`. Implementation must load and apply `/debt-guard` before source edits.

Required debt-guard path: Full Path.

Expected classification: incomplete-existing-mechanism unless local evidence proves a missing capability.

Complexity budget:

- Prefer amending existing W5 adapter/diagnostic/test handling over adding a new permanent mechanism.
- New diagnostics are allowed only as bounded temporary telemetry with the removal/fold-in trigger above.
- A prompt/schema requirement is not a W5-C implementation task; it stops for a new Captain-approved package.

## Verifier Plan

Before commit:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts
npm run validate:v2-gates
npm run debt:sensors
npm -w apps/web run build
git diff --check
```

No live canary is part of W5-C implementation. A later canary needs a separate Captain-approved package after local diagnosis/repair is verifier-clean.

## V2 SCORECARD IMPACT

High. W5-C targets the first observed blocker after the pipeline reached real source material and real W5 model execution. Fixing it is directly on the path to hidden EvidenceItems and later report quality.

## V2 RETIREMENT LEDGER IMPACT

Rows touched: V2-RL-010, V2-RL-011, V2-RL-012, V2-RL-013, V2-RL-014.

No immediate retirement. W5-C is allowed only if it moves the existing W5 path toward valid hidden EvidenceItems or identifies a precise Captain-gated prompt/schema blocker. If W5-C later enables a valid hidden EvidenceItem canary, that becomes the concrete trigger to merge/delete standalone W4-I denial machinery and reduce W4-chain containment artifacts. If W5-C only adds temporary diagnostics, the closeout must name the owner and removal/fold-in trigger.

## V2 CONSOLIDATION GATE

Pass only if W5-C diagnoses or repairs the existing W5 execution path. Adding a new diagnostic artifact is allowed only if it is bounded, sanitized, and has a removal trigger: remove or fold it into W5 telemetry once schema failure root cause is resolved.

## Latest Debt Sensor Status

Latest command before this package: `npm run debt:sensors`

Status: `advisory_warn`

Salient warnings:

- V2 source/test footprint exceeds advisory thresholds.
- Boundary guard exceeds advisory threshold.
- WIP/handoff volume exceeds advisory thresholds.
- Debt-guard telemetry contains net mechanism increases.
- Five V2 consolidation-marker review files remain advisory warnings.

These warnings favor a narrow diagnosis/repair over another hidden readiness layer.
