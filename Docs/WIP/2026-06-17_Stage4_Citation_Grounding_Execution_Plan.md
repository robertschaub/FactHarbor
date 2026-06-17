# Stage 4 Citation and Grounding Execution Plan

**Status:** Reviewed execution plan
**Date:** 2026-06-17
**Owner:** Senior Developer / Captain-directed cleanup

## Purpose

Make the next cleanup step executable without turning it into another broad
pipeline investigation. This plan narrows `Clean_Main_Next_Cleanup_Plan` Phase 2
to the first Stage 4 structural repair slice.

This is a planning artifact only. It does not approve code or prompt edits.

## Current Failure Shape

Fresh smoke job `24e71d7e778e40e9baa06d2a4124ba1b` for the Captain-defined
Portuguese Bolsonaro input ended as an article-level `LEANING-TRUE` report, but
`AC_01` became high-checkworthiness `UNVERIFIED`:

- claim: `O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro`
- final claim verdict: `UNVERIFIED`
- final truth/confidence: `50 / 24`
- final reason: `verdict_integrity_failure`
- final citation arrays: empty
- gate impact: high-harm claim publishability collapsed, dragging article
  confidence down

This does not look like a Stage 1 F2 precondition failure:

- `contractValidationSummary.ran=true`
- `preservesContract=true`
- `rePromptRequired=false`
- `stageAttribution=initial`
- all selected atomic claims were contract carriers
- no `contract_surgical_repair_*` warnings appeared in the fresh smoke jobs

The highest-signal warning details point to Stage 4 citation and grounding
handling:

- `EV_029` exists globally, but belongs to `AC_02`; it was cited in the `AC_01`
  challenge context.
- `EV_062` exists globally, but belongs to `AC_03`; it appeared as directional
  contradiction material for `AC_01`.
- `EV_004`, `EV_005`, and `EV_006` are direct `AC_01` support evidence, yet a
  grounded-acceptance warning reported them as missing from the cited registry.

Root classification for implementation is a working hypothesis, not final proof.
It is based on one fresh live job plus matching log details. The implementation
pass must confirm or falsify the hypothesis with focused tests before changing
behavior.

| Classification | Decision |
|---|---|
| Stage 1 / F2 contract loss | Not the first target. Contract validation passed in the fresh failing job. |
| Globally missing evidence hallucination | Not the main observed shape. The suspect IDs exist, but are sibling-claim IDs. |
| Stage 4 structural citation carriage / validator payload mismatch | Primary working target. |
| Prompt noncompliance by the grounding validator | Possible, but only after the structural payload is proven correct. Stop for Captain approval before prompt wording. |

Do not spend extra live jobs only to prove the hypothesis unless Captain
approves the cost. If the implementation owner wants pre-code live
reproduction, use the same Captain-defined Bolsonaro input and require at least
two more runs to see whether the same warning shape repeats.

## Code Surface

Primary file:

- `apps/web/src/lib/analyzer/verdict-stage.ts`

Primary functions and blocks:

- `validateGroundingOnly` around the grounding validator payload
- `getHardCitationIntegrityIssues`
- `normalizeVerdictCitationDirections`
- `getCitedEvidenceRegistry`
- `buildClaimChallengeContext`
- `validateChallengeEvidence`
- Option E / `repair_grounding_acceptance` downgrade attribution

Primary tests:

- `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`
- `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts` only if the
  investigation reaches prompt-contract behavior

Non-target for the first slice:

- `apps/web/src/lib/analyzer/grounding-check.ts`

`grounding-check.ts` may deserve later cleanup, but current call-site triage did
not identify it as the active ClaimAssessmentBoundary Stage 4 path for this
failure.

## Debt Guard Before Code

Before the implementation pass edits code, write a lightweight `DEBT-GUARD`
block:

- Existing mechanism expected to carry behavior: Stage 4 structural citation
  normalization, challenge evidence validation, cited-registry construction, and
  grounded-acceptance checks.
- Preferred net effect: amend the existing validator payload or normalization
  path; do not add a parallel semantic rescue path.
- Additions allowed only if the current structure cannot represent the needed
  state cleanly.
- Verifier: focused unit tests first, then full safe `npm test`; live smoke only
  after commit and runtime refresh.

If any implementation attempt fails, classify it with the repository
failed-attempt recovery command before the next edit.

## First Implementation Slice

### 0. Keep Status/Backlog Work Non-Blocking

`Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` should be updated
as part of the clean-main work, but they should not block the first Stage 4 unit
fixture unless the implementer is actively confused by stale status text.

If status/backlog are edited before code, keep the update minimal:

- point to this focused plan
- name Stage 4 citation/grounding integrity as the first code target
- preserve historical changelog content

### 1. Reconstruct and Capture the Validator Payload First

Start with a minimal `AC_01`-shaped fixture in `verdict-stage.test.ts`, but the
first assertion should inspect current behavior rather than enforce the intended
fix.

The fixture should include:

- direct `AC_01` support evidence equivalent to `EV_004`, `EV_005`, `EV_006`
- a sibling-claim support ID equivalent to `EV_029` in challenge context
- a sibling-claim contradiction ID equivalent to `EV_062` in directional arrays
- an initial verdict and, if needed to exercise the current branch, a
  direction-normalized candidate whose truth direction is stable and whose
  claim-local direct citations should be acceptable

This is not a Stage 1 F2 surgical-repair fixture. Keep contract validation and
claim extraction out of scope.

Use the existing mock LLM call capture pattern to inspect the prompt variables
passed into `validateGroundingOnly`, especially:

- `citedEvidenceRegistry`
- `evidencePool`
- `challengeContext`
- `supportingEvidenceIds`
- `contradictingEvidenceIds`

The capture decides whether the bug is code-carried structure or LLM
grounding-validator compliance.

### 2. Add Failing Structural Assertions

Once the payload shape is known, add the intended behavioral assertions.

Assertions should prove:

- invalid sibling challenge IDs remain recorded as invalid
- invalid sibling challenge IDs are not presented to the grounding validator as
  valid cited challenge evidence
- direct current-claim support IDs are present in the cited registry for the
  repaired candidate
- sibling-claim directional citations are removed or rejected by the existing
  structural path before they can cause a misleading final downgrade
- if sibling IDs are removed and no valid local direct evidence remains, the
  result downgrades through normal insufficient-evidence behavior rather than
  through `verdict_integrity_failure`

### 3. Prefer Structural Fixes in This Order

1. If invalid challenge IDs are passed as `challengeContext.citedEvidenceIds`,
   split valid and invalid challenge evidence more cleanly. Keep invalid IDs in
   `challengeValidation.invalidIds`, but do not present them as cited evidence.
2. If direct current-claim IDs are missing from `citedEvidenceRegistry`, fix the
   registry construction or alias mapping for the repaired/normalized candidate.
3. If sibling-claim IDs remain in directional arrays, route them through the
   existing structural normalization path before grounded acceptance decides the
   final downgrade.
4. If the structure is already correct and the validator still flags allowed
   references, stop for a Captain prompt decision instead of editing prompts
   opportunistically.

No step should allow out-of-registry evidence to pass as valid. The objective is
to remove false structural failures while preserving hard citation integrity.

### 4. Add Negative Coverage Before Live Validation

Add at least one counterfactual fixture where no valid direct current-claim
support or contradiction evidence remains after sibling IDs are removed.

Expected outcome:

- the verdict does not pass grounded acceptance just because bad IDs were
  filtered out
- invalid and sibling IDs remain visible in diagnostics
- the failure mode is a normal insufficient-evidence or publishability outcome,
  not a hidden pass and not a structural integrity crash

## Verifiers

Local verifiers before commit:

1. Focused Stage 4 test:
   `npm -w apps/web test -- test/unit/lib/analyzer/verdict-stage.test.ts`
2. Prompt-contract test only if prompt-variable or contract behavior changes:
   `npm -w apps/web test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts`
3. Safe suite:
   `npm test`
4. Web build if TypeScript surface changes are non-trivial:
   `npm -w apps/web run build`

Live verifiers after commit and runtime refresh:

1. Rerun the same three Captain-defined smoke inputs:
   - `Plastic recycling is pointless`
   - `Using hydrogen for cars is more efficient than using electricity`
   - `O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas`
2. Stop after the first three jobs if a clear regression appears.
3. Do not expand to expensive suites or new validation inputs without Captain
   approval.

## Success Gate

The implementation slice is successful only if all of these hold:

- focused tests prove the structural bug shape and pass with the fix
- negative tests prove genuinely unsupported verdicts still fail
- `npm test` passes
- Bolsonaro PT no longer has a high-checkworthiness `AC_01` downgraded to
  `UNVERIFIED` by `verdict_integrity_failure`
- fresh smoke jobs do not introduce `report_damaged`,
  `analysis_generation_failed`, or worse article verdict direction
- invalid and sibling evidence IDs remain visible as diagnostics when present;
  they are not silently accepted

## Stop Conditions

Stop and ask the Captain before continuing if:

- the fix requires prompt wording under `apps/web/prompts/`
- the correct behavior depends on semantic interpretation of claim meaning
  rather than structural evidence-ID validity
- invalid IDs disappear only because validator bypass rules were weakened
- smoke validation loses more than one selected atomic claim on any input
- Plastic, Hydrogen, or Bolsonaro PT move to a worse article verdict direction
- the first three smoke jobs are variance-dominated rather than clearly better
- the implementation owner cannot produce a structural payload capture; in that
  case, do not infer a code fix from the N=1 live job alone

## External Review Questions

Ask Claude and Gemini to answer these questions before implementation:

1. Is the root classification sound given the observed job shape?
2. Is the proposed first slice structural rather than semantic?
3. Are the tests sufficient to prevent hiding real citation failures?
4. Is any required Captain decision missing?
5. Should any part of this be implemented before updating status/backlog docs?

## Review Consolidation

Reviewed by:

- Claude via `scripts/agents/invoke-claude.cjs`
- Gemini via `scripts/agents/invoke-gemini.cjs`

Consolidated changes made after review:

- Kept Stage 4 citation/grounding integrity as the first implementation target,
  but downgraded the root classification from proof to working hypothesis
  because the live evidence is N=1.
- Reordered the first slice so validator payload capture happens before
  behavioral assertions are finalized.
- Clarified that this is not an F2 surgical-repair fixture; any
  direction-normalized candidate is Stage 4-only.
- Added counterfactual coverage for the case where sibling IDs are removed and
  no valid local direct evidence remains.
- Preserved invalid/sibling-ID diagnostics as a hard requirement so the fix
  cannot pass by bypassing grounding integrity.
- Kept status/backlog updates non-blocking, while naming the minimal doc update
  if the implementer chooses to do it first.
