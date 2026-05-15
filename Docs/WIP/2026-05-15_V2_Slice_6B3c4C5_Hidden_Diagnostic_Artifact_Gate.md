# V2 Slice 6B.3c-4C5 Hidden Diagnostic Artifact Gate

**Date:** 2026-05-15
**Status:** source implemented at `4b36aab5`
**Owner role:** Lead Architect / Captain deputy
**Baseline:** `cd6b4059` (`docs: record v2 claim understanding handoff`)
**Checklist version/hash:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## 1. Decision

Do **not** edit the Claim Understanding prompt, schema, model policy, provider behavior, UCM defaults, or Evidence Lifecycle yet.

4C3c proved that hidden direct-text Claim Understanding can execute under the approved triple gate and can write a non-public hidden artifact. The artifact was too coarse for contract-quality diagnosis: it reported `schemaOutcome: damaged` with `damagedReason: claim_contract_validation_failed`, but did not preserve adapter attempt statuses or schema failure summaries.

4C4 typed the internal stage handoff, but it did not prove that direct-text Claim Understanding can produce an accepted `ClaimContract`.

The next source step is therefore hidden diagnostic enrichment: preserve bounded adapter attempt diagnostics in the internal `v2_observability_ledger` artifact only.

## 2. Review Consolidation

The deputy-team review returned consensus:

- Architecture reviewer: choose hidden diagnostic artifact enrichment before prompt/schema/model fixes or Evidence Lifecycle.
- Runtime reviewer: the adapter already captures `parse_failure`, `invalid_schema`, and provider failure attempts; runtime artifact currently drops them.
- LLM-quality reviewer: current live smoke evidence is insufficient to attribute the failure; prompt/schema/model edits need diagnostic evidence first.

Captain escalation is not required for this narrow internal diagnostic slice. Captain escalation is required for prompt/config/model/schema changes, live-job expansion beyond a single committed/refreshed diagnostic smoke, public exposure, cache IO, ACS/direct URL dispatch, approval flips, V1 cleanup, or Evidence Lifecycle start.

## 3. Scope

Allowed source envelope:

- `apps/web/src/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink.ts`
- `apps/web/src/lib/analyzer-v2/claim-understanding/runtime-stage.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/runtime-stage.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- focused docs/handoff/index files

The hidden artifact may include only bounded, sanitized adapter attempt diagnostics:

- attempt number;
- attempt status (`accepted`, `invalid_schema`, `parse_failure`, `provider_failure`);
- prompt content hash;
- provider telemetry already carried by adapter attempts;
- bounded failure message.

Forbidden in the diagnostic payload:

- raw provider output;
- rendered prompt text;
- full provider request;
- input text;
- secrets;
- cache contents or cache IO;
- public pointers;
- public result/report/UI/export/compatibility exposure.

## 4. Implementation Result

Implementation commit: `4b36aab5` (`feat: add v2 hidden attempt diagnostics`).

Implemented source:

- `ClaimUnderstandingRuntimeArtifact` version is bumped to `v2.claim-understanding.runtime-artifact-sink.1`.
- Hidden artifacts now include `adapterAttemptDiagnostics`.
- `runtime-stage.ts` populates the diagnostic field from `dispatchResult.adapterOutcome.attempts` and bounds failure messages to 500 characters.
- Runtime-stage tests cover a hidden direct-text invalid-schema path with two failed attempts and no raw input/rendered prompt leakage in diagnostics.
- Internal artifact route tests verify authenticated access returns the internal diagnostic field.
- Boundary guard marks `adapterAttemptDiagnostics` as an owner-only result-surface term.

Verification:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/runtime-stage.test.ts test/unit/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` - passed, 56 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2 test/unit/lib/analyzer-v2-runtime test/unit/app/api/internal/analyzer-v2/claim-understanding-runtime-artifacts/route.test.ts` - passed, 26 files / 212 tests.
- `npm -w apps/web run build` - passed.
- `git diff --check` - passed.

No live job was run before this source commit. A single Captain-defined direct-text diagnostic smoke may be justified only after commit and runtime refresh.

## 5. Next Gate

After 4C5 is committed, the next low-risk step is one committed/refreshed hidden direct-text diagnostic smoke using a Captain-defined input, likely `Plastic recycling is pointless`, to collect the new attempt diagnostics.

The diagnostic artifact should then determine whether the next reviewed fix belongs to:

- prompt wording;
- schema contract;
- model/provider output mode;
- adapter mapping;
- runtime variable binding;
- output-token/truncation settings.

Do not edit those surfaces until the new hidden diagnostic artifact provides evidence.
