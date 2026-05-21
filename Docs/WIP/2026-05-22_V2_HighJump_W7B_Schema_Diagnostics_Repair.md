# V2 HighJump W7-B Schema Diagnostics Repair

**Date:** 2026-05-22
**Owner:** Captain Deputy / Lead Developer
**Status:** Implemented locally, verifier-clean, ready for focused canary after commit/runtime refresh
**Related canary:** `0069f28abad14644abd3584652be933a`

## Decision

HJ-2 moved the V2 internal Alpha chain to W7-B, but W7-B ended
`boundary_verdict_execution_damaged` after two schema-validation attempts. The
existing hidden artifacts named the failing stage but did not expose enough
bounded contract detail to decide whether the next repair should be prompt
contract, schema, or runtime transformation.

Steer-Co consensus selected a bounded diagnostic amendment before any prompt or
schema repair:

- keep the existing W7-B runtime and W8-B hidden route;
- add path/code-only schema diagnostics to W7-B telemetry;
- project those diagnostics through W8-B upstream stop attribution;
- do not return raw provider output, schema messages, source text, EvidenceItem
  text, prompt text, stack traces, or a new route.

Claude Opus 4.6 agreed with diagnostics-first, but suggested a raw-output
summary. The consolidated decision rejects raw-output summaries for now because
issue paths and codes are enough to classify the schema drift with lower leak
risk.

## Scope

Implemented:

- W7-B `BoundaryVerdictExecutionSchemaDiagnostics` with bounded issue count,
  bounded path segments, bounded codes, redaction booleans, and an explicit
  removal trigger.
- Parse, schema-validation, and task-contract failure categories.
- W8-B projection through existing `upstreamStopAttribution`.
- Focused tests proving diagnostics are structural only and do not retain raw
  provider text or EvidenceItem text.

Not implemented:

- prompt edit;
- schema edit or schema loosening;
- provider/model/config/gateway change;
- public report projection;
- new hidden route;
- raw provider-output capture;
- parser/cache/SR/storage/provider expansion/V1 work.

## V2 Scorecard Impact

V2 SCORECARD IMPACT

Quality dimension advanced:

- V2-Q5 Verdict quality: makes the first W7-B schema stop actionable without
  guessing.
- V2-Q8 Public cutover safety: keeps public V2 blocked/precutover while hidden
  diagnostics improve repair precision.
- V2-Q10 Complexity convergence: diagnostic has owner and removal trigger.

Direct report value:

- No direct report value yet; this repair is an enabling diagnostic for the next
  report attempt.

Hidden-only exception:

- Accepted by Steer-Co because HJ-2 already reached real EvidenceItems and W7-B
  execution; the added diagnostic is the minimum bounded evidence needed to
  avoid speculative prompt/schema changes.

## V2 Retirement Ledger Impact

V2 RETIREMENT LEDGER IMPACT

Rows touched:

- V2-RL-021: HighJump temporary loosenings remain tracked.
- V2-RL-022: new W7-B schema diagnostics row.

Status changes:

- none.

New mechanism owner:

- Lead Developer.

Removal / merge trigger:

- Remove or fold into stable W7-B telemetry after two successive HighJump
  boundary/verdict canaries no longer need schema diagnostics, or at the end of
  the current HighJump tranche.

Debt accepted:

- Planned temporary diagnostic debt, path/code-only, no new route.

## Debt-Guard Result

DEBT-GUARD RESULT

Classification:

- `incomplete-existing-mechanism` plus planned temporary diagnostic debt.

Chosen option:

- Amend W7-B telemetry and existing W8-B upstream stop attribution.

Rejected path and why:

- Prompt-only repair was rejected as speculative because HJ-2 did not record the
  schema issue shape.
- Schema loosening was rejected because no evidence shows the schema is wrong.
- New artifact route was rejected because W8-B already owns the upstream stop
  projection.
- Raw provider-output summaries were rejected due avoidable leak risk.

What was removed/simplified:

- Nothing removed in this slice.

What was added:

- Bounded structural W7-B schema diagnostics and tests.

Net mechanism count:

- Increases by one temporary diagnostic field/projection, with retirement row
  V2-RL-022.

Budget reconciliation:

- Touched the expected W7-B runtime, W8-B report-result projection, and focused
  tests only.

Verification:

- Focused W7/W8 runtime/report-result tests passed.
- Boundary guard passed.
- V2 gate validation passed.
- Gate-register self-test passed.
- `npm run debt:sensors` returned `advisory_warn` for known footprint/docs
  pressure.
- Web build passed.
- `git diff --check` passed.

Debt accepted and removal trigger:

- Planned temporary diagnostic debt. Removal/merge trigger recorded in
  V2-RL-022.

Residual debt:

- The next canary may still show a prompt-contract drift that requires a
  separate prompt repair. This diagnostic does not itself make W7-B pass.

## Next Canary Criteria

After commit and runtime refresh, run exactly one HighJump diagnostic canary on
the Captain-defined input:

```text
Using hydrogen for cars is more efficient than using electricity
```

Pass if W7-B accepts and W8-B can produce an internal Alpha report-result
candidate with public V2 still blocked/precutover.

Stop if W7-B remains damaged but W8-B now reports bounded W7-B schema
diagnostics; use that exact issue list for the next repair.

Hard stop if public/default-admin/log/error surfaces leak raw provider output,
source text, EvidenceItem text, prompt text, hidden ledger ids, or internal run
ids.
