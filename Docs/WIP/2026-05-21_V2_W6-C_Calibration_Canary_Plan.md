# W6-C Calibration Canary Plan — Phase 1: materialScarcityCandidate Surface

**Date:** 2026-05-21
**Workstream:** W6-C Retrieval Quality (Direction A, Option D variant)
**Budget slot:** 11 of 20

## Substitution Notice

Steer-Co approved Option D: "modified sufficiency prompt that asks the LLM to
distinguish 'encyclopedic-only coverage' from 'no coverage at all.'"

This implementation substitutes a less-invasive Phase 1: surface the existing
`materialScarcityCandidate` field that the LLM already populates but that the
pipeline currently discards during projection. No prompt change required. If
this field discriminates across canaries, prompt modification is unnecessary.
If it doesn't discriminate, Phase 2 applies Option D proper with a prompt nudge.

Phase 1 is strictly less invasive than the approved Option D (no prompt drift,
no new LLM instruction, same blast radius envelope). Within expanded authority.

## Pre-Defined Discrimination Criteria

These must be evaluated BEFORE interpreting canary results:

1. **`materialScarcityCandidate = "material"` across rerun** — LLM consistently
   judges scarcity as material. The bar is correctly engaging the
   encyclopedic-source quality. Direction: providers (Option A) or prompt nudge
   (Option D Phase 2).

2. **`materialScarcityCandidate = "possible"` or `"none"` while 4 dimensions
   remain material** — Calibration mismatch between dimension flagging and
   aggregate scarcity judgment. Worth a follow-up prompt diagnosis to understand
   why dimensions are flagged as material but aggregate scarcity is not.

3. **`materialScarcityCandidate` varies across reruns** — LLM judgment is noisy
   at this evidence level. Volume/diversity isn't the sole variance source.

## Implementation Scope

Surface `materialScarcityCandidate` from the already-parsed LLM output through
the existing projection chain. No Zod schema, prompt, or schema-version changes.

### Touchpoints

1. **`sufficiency-assessment.ts`**: Add `materialScarcityCandidate` to
   `SufficiencyAssessmentDecision` type, `decision()` params, and 3 caller
   sites (accepted gets value, blocked/damaged get `null`).

2. **`internal-alpha-report-result.ts`**: Add to `ParentProjection`, the
   `projectParents()` function, and the `sufficiencyAssessment` parent-status
   block in the report-result artifact.

3. **`evidence-lifecycle-sufficiency-assessment-provenance.ts`**: Add
   `"materialScarcityCandidate"` to `DECISION_KEYS` array (alphabetical sort).

4. **Tests**: Update test fixtures for both modules.

### Not Changed

- Prompt text (no edit to `claimboundary-v2.prompt.md`)
- Zod schema (`task-contracts/schemas.ts` — already parses the field)
- Type definitions (`task-contracts/types.ts` — already has the type)
- Schema version
- Artifact route
- Redaction flags (`sufficiencyResultPayloadReturned` stays `false`)
- Public behavior (field is `internal_admin_only`, `blocked_precutover`)

## Canary Execution

After implementation, submit one canary with the same hydrogen/electricity claim
to verify:
1. Pipeline completes without schema or runtime errors
2. `materialScarcityCandidate` appears in captured report-result artifact
3. Record the value for discrimination analysis
4. Compare against prior canary dimension profiles (should be identical —
   this change adds a field, doesn't alter assessment logic)

## Security Constraints

- `materialScarcityCandidate` is an enum (`none | possible | material`) — no
  free-text leak risk
- Follows same `internal_admin_only` / `blocked_precutover` / `forbidden`
  exposure rules as existing dimension projections
- `redaction.sufficiencyResultPayloadReturned` stays `false`
