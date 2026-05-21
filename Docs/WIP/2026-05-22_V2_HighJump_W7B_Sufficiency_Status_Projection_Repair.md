# V2 HighJump W7-B Sufficiency Status Projection Repair

**Date:** 2026-05-22
**Owner:** Captain Deputy / Lead Developer
**Status:** Implemented locally, verifier-clean, ready for one repair canary after commit/runtime refresh
**Related canary:** `ed3a7a7c2e8d405bba30b3ac475f265a`

## Decision

HJ-3 captured the exact W7-B schema failure:

```text
warningMaterialityInputs.upstreamSufficiencyStatus -> invalid_enum_value
```

Steer-Co consented to the narrow repair:

- preserve the LLM-owned W6-C sufficiency judgment in the W6-C decision;
- use that structural field for W7-B warning materiality;
- keep the W7-B schema strict;
- do not map task-level `accepted`, `blocked`, or `damaged` into analytical
  sufficiency semantics;
- fail closed if the preserved W6-C judgment is absent;
- keep public V2 blocked/precutover.

Claude Opus 4.6 also supported the repair and flagged the downstream W8-A/W8-B
projection sites. The implementation aligns those warning-materiality types and
fixtures so the task-level status cannot re-enter the report-result path.

## Scope

Implemented:

- `SufficiencyAssessmentDecision.sufficiencyAssessmentStatus`, sourced from
  `EvidenceSufficiencyResult.sufficiencyAssessment.sufficiencyStatus`.
- W6-C runtime-owned provenance allowlist update for the new field.
- W7-B input packet and runtime owner projection from the preserved
  sufficiency judgment.
- W7-B fail-closed prompt-render guard when the preserved judgment is missing.
- W8-A/W8-B warning-materiality type/projection alignment.
- Topic-neutral W7-B prompt guidance to use `warningMaterialitySeedJson`.
- Focused fixtures and tests to stop encoding `accepted` as an upstream
  sufficiency judgment.

Not implemented:

- W7-B schema loosening;
- deterministic semantic mapping from task status to sufficiency status;
- public report projection;
- model/config/schema/UCM/gateway approval changes;
- new hidden route;
- parser/cache/SR/storage/provider expansion/V1 work.

## V2 Scorecard Impact

V2 SCORECARD IMPACT

Quality dimension advanced:

- V2-Q5 Verdict quality: removes a structural blocker before W7-B can produce
  boundary/verdict candidates for internal report review.
- V2-Q6 Warning integrity: keeps warning materiality sourced from the
  LLM-owned sufficiency judgment rather than task lifecycle status.
- V2-Q8 Public cutover safety: public V2 remains blocked/precutover.
- V2-Q10 Complexity convergence: amends existing contracts instead of adding a
  fallback or loosening the schema.

Direct report value:

- Enables the next internal Alpha report attempt to pass the known W7-B
  warning-materiality schema point.

Hidden-only exception:

- No new hidden mechanism was added. This repair amends existing W6/W7/W8
  projections.

## V2 Retirement Ledger Impact

V2 RETIREMENT LEDGER IMPACT

Rows touched:

- V2-RL-022 remains active for temporary W7-B schema diagnostics. This repair
  uses those diagnostics and does not add a new retirement-ledger row.

Status changes:

- none.

Removal / merge trigger:

- If two successive HighJump W7-B canaries pass without needing schema
  diagnostics, retire or fold V2-RL-022 diagnostics into stable W7-B telemetry.

Debt accepted:

- none beyond the existing V2-RL-022 temporary diagnostic debt.

## Debt-Guard Result

DEBT-GUARD RESULT

Classification:

- `incomplete-existing-mechanism`.

Chosen option:

- Amend the existing W6-C -> W7-B -> W8 structural projection path.

Rejected path and why:

- W7-B schema loosening would hide a real contract mismatch.
- Mapping `accepted/blocked/damaged` to sufficiency judgments would introduce
  deterministic semantic logic and a parallel mechanism.
- A new diagnostic or route is unnecessary; HJ-3 already captured the issue.

What was removed/simplified:

- Stale test fixtures no longer encode `accepted` as an upstream sufficiency
  judgment.

What was added:

- One structural W6-C decision field and corresponding projection/test updates.

Net mechanism count:

- Unchanged. Existing contracts carry the missing field.

Budget reconciliation:

- Actual diff stayed inside W6-C/W7-B/W8 projection and focused tests, plus this
  documentation.

Verification:

- See verifier section below.

Debt accepted and removal trigger:

- No new debt accepted. Existing diagnostic debt remains owned by V2-RL-022.

Residual debt:

- The next canary may reveal a different W7-B schema or reasoning issue. Use
  the bounded diagnostics; do not broaden blindly.

## Verifiers

Passed:

- Focused W6/W7/W8 repair suite:
  - `11` files / `73` tests.
- Boundary guard:
  - `1` file / `94` tests.
- `npm run validate:v2-gates`.
- `node scripts/validate-v2-gate-register.mjs --self-test`.
- `npm run debt:sensors`.
  - status `advisory_warn` for known V2 footprint, boundary-guard size, docs
    volume, and consolidation-marker warnings.
- `npm -w apps/web run build`.
- `git diff --check`.

Failed-attempt recovery:

- First post-repair focused tests showed W6-C runtime-owned provenance needed
  the new field in its exact-key allowlist. Kept the repair and amended the
  existing provenance mechanism.
- First boundary-guard pass rejected an unapproved type-only import. Kept the
  repair and removed the import by deriving the type from the already-approved
  W7-B result contract.
- First build pass exposed nullable type indexing and a prompt-render ordering
  issue. Kept the repair, used `NonNullable` type expressions, and made the
  runtime owner fail closed before prompt rendering when the W6-C judgment is
  absent.

## Next Canary Criteria

After commit and runtime refresh, run exactly one HighJump repair canary on:

```text
Using hydrogen for cars is more efficient than using electricity
```

Pass if W7-B accepts and W8-B produces an internal Alpha report-result candidate
with public V2 still blocked/precutover.

Stop if:

- W7-B remains damaged with a new bounded schema diagnostic;
- W7-B accepts but W8-B blocks on a downstream structural issue;
- public/default-admin/log/error surfaces leak source text, EvidenceItem text,
  prompt text, provider payload, hidden ledger id, or internal run id.
