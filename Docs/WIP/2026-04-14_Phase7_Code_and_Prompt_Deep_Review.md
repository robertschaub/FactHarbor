# Phase 7 Code And Prompt Deep Review

**Date:** 2026-04-14  
**Role:** Lead Developer + Lead Architect  
**Method:** direct source-code/prompt inspection plus debate with an LLM Reviewer and a Senior Developer reviewer using repo-local RAG

## Status Note

This review captures the **pre-hardening forensic baseline** for Phase 7.

Several blockers identified here were later addressed in commit `61815f41`, including:

- post-repair contract-summary refresh
- `preservedByQuotes` persistence
- `stageAttribution` persistence
- moving `CLAIM_CONTRACT_REPAIR` into the prompt system
- case-insensitive anchor checks in repair-related paths

What remains valuable from this document:

- the architectural distinction between **anchor recognition** and **binding extraction**
- the warning that retry/repair can confound job-level interpretation
- the rationale for why Shape B exists at all

What should **not** be treated as latest-state blockers anymore:

- missing repair prompt governance
- missing quote persistence
- stale-summary risk in the exact pre-`61815f41` form described here

## Scope

Reviewed:

- `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/lib/config-schemas.ts`
- `Docs/WIP/2026-04-13_Phase7_Salience_First_Charter.md`
- `Docs/WIP/2026-04-14_Phase7_Status_and_E2_Measurement_Plan.md`
- `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md`

Reviewer debate participants:

- `LLM Reviewer`: prompt architecture and cross-stage semantics
- `Senior Developer`: implementation/control-flow and observability

## Proven Code And Prompt Facts

1. **E2 is live, but still log-only.**  
   Source: [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:241), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:245), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:275), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:1036), [config-schemas.ts](C:/DEV/FactHarbor/apps/web/src/lib/config-schemas.ts:1552)  
   Exact source quote: `Phase 7 E2: salience-commitment stage (log-only).`  
   Exact source quote: `Does NOT yet constrain Pass 2.`

2. **Pass 2 already contains a strong internal salience-preservation scaffold.**  
   Source: [claimboundary.prompt.md](C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md:184), [claimboundary.prompt.md](C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md:193), [claimboundary.prompt.md](C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md:227)  
   Exact source quote: `Mandatory pre-decomposition meaning analysis (do this FIRST, before applying the rules)`  
   Exact source quote: `Commit to preserving each distinguishing aspect in the decomposition.`  
   Exact source quote: `the primary direct claim must fuse it with the action it modifies`

3. **Contract validation is the active retry authority for fidelity.**  
   Source: [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:288), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:349), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:480), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:2668)  
   Exact source quote: `Claim Contract Validation — detect proxy drift before Gate 1`  
   Exact source quote: `triggers a single retry if material drift`  
   Exact source quote: `CONTRACT_VALIDATION stage is the sole fidelity authority`

4. **Older substring heuristics were removed from the main override path, but literal-substring checks still exist in narrow repair logic.**  
   Source: [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:2237), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:2262), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:496), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:1735)  
   Exact source quote: `The F4 substring-based anchor check ... was removed`  
   Exact source quote: `honestQuotes substring check REMOVED`  
   Exact source quote: `anchor must actually be present as substring`

## Reviewer Debate

### LLM Reviewer Position

- E2 currently measures **anchor recognition**, not anchor use, because Pass 2 never consumes the E2 anchor list.  
  Source: [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:245), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:275), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:912)
- The salience prompt and the contract validator are close, but not identical, notions of “anchor.”  
  Source: [claimboundary.prompt.md](C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md:116), [claimboundary.prompt.md](C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md:430), [claimboundary.prompt.md](C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md:446)
- Recommendation: keep E2 measurement as-is, but interpret it as an audit probe, not proof that Pass 2 behavior changed.

### Senior Developer Position

- The measurement surface is partly dirty because contract retry and repair can change the final claim set after the original Pass 2 output.  
  Source: [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:324), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:480), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:803)
- Persisted observability is incomplete or stale in a few important places.  
  Source: [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:515), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:804), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:912), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:2337)
- Recommendation: tighten the contract/measurement surface before using E2 results as architecture-moving evidence.

### Consolidated Debate Result

Both reviewers are right.

- The current stack is already good enough to measure **whether E2 can identify anchors**.
- The current stack is **not yet clean enough** to use job-level success alone as proof that Phase 7’s architecture is working.

That means the correct consolidation is:

- **Do not change the core prompts yet.**
- **Do not treat aggregate job success as a clean E2 signal.**
- **Do record the E2 batch, but segment raw extraction vs retry/repair-mediated outcomes.**

## Consolidated Findings

### 1. Proven: E2 does not yet test the architectural move itself

E2 runs, persists, and stops. Pass 2 receives no salience-anchor input. The measurement therefore answers:  
`Can a dedicated stage identify anchors?`  
It does **not** answer:  
`Does extraction improve when that anchor representation is binding?`

Source: [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:245), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:275), [types.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/types.ts:1183)

### 2. Proven: current Phase 7 measurement is confounded by recovery layers

The final claim set can be altered by:

- contract-guided retry
- targeted repair pass
- final contract-summary refresh

So a “good” final run may reflect:

- original Pass 2 quality
- retry guidance quality
- repair-pass success
- or a combination

Source: [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:355), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:480), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:803)

### 3. Proven: post-repair contract observability can go stale

After `runContractRepair`, the code mutates `activePass2`, but the persisted `contractValidationSummary` is only refreshed if the final accepted claim set is not equivalent to the last validated claim set. If repair changes the set and Gate 1 later preserves it as-is, the summary can still describe the pre-repair validation state.

Source: [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:515), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:804)

### 4. Proven: the prompt contract and the runtime contract are not perfectly aligned

The validator prompt says:

- if the anchor appears as a literal substring in any claim `statement`, that claim must be treated as an anchor carrier

But runtime evaluation does not accept literal presence alone. It filters `preservedInClaimIds` down to existing thesis-direct claim IDs and can still force retry when those IDs do not survive the structural directness gate.

This makes runtime stricter than the prompt.

Source: [claimboundary.prompt.md](C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md:431), [claimboundary.prompt.md](C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md:437), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:2253), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:2294)

### 5. Proven: E2 observability is weaker than the measurement plan assumes

When salience commitment fails, the stage returns `undefined`. The persisted job payload only includes `salienceCommitment` when the stage succeeds. That means the stored output does not distinguish:

- disabled
- failed
- not run
- produced zero anchors successfully

Source: [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:1124), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:912), [types.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/types.ts:1190)

### 6. Proven: traceability is lost between validator output and persisted summary

The validator prompt requires exact quoted proof for anchor preservation. The structured output includes `preservedByQuotes`. But the persisted summary drops those quotes and stores only:

- `anchorText`
- `preservedInClaimIds`
- `validPreservedIds`

That weakens auditability for the E2 batch and for later replay analysis.

Source: [claimboundary.prompt.md](C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md:390), [claimboundary.prompt.md](C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md:477), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:2337), [types.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/types.ts:1216)

### 7. Proven: part of the extraction architecture is still hidden in inline prompt text

`runContractRepair` uses a long inline system prompt and user prompt embedded directly in TypeScript instead of the prompt file system. This splits the extraction contract across:

- `claimboundary.prompt.md`
- inline strings in `claim-extraction-stage.ts`

That makes review harder and increases drift risk.

Source: [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:1688)

### 8. Hypothesis: Shape B is still plausible, but the evidence threshold should be stricter than “E2 found anchors”

Because Pass 2 already has a strong internal meaning-preservation scaffold, a successful E2 batch would support the hypothesis that a dedicated anchor representation is learnable and stable. It would **not** by itself prove that making it binding will improve final extraction quality. That stronger claim still belongs to Phase 7b.

Source basis: [claimboundary.prompt.md](C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md:184), [claimboundary.prompt.md](C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md:227), [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:1037)

## Consolidated Recommendation

### Decision

Proceed with the E2 measurement objective, but tighten the interpretation standard.

### What to keep unchanged now

- Keep `CLAIM_SALIENCE_COMMITMENT` as-is for the next batch.
- Keep `CLAIM_EXTRACTION_PASS2` as-is for the next batch.
- Do not promote Shape B yet.

### What the next measurement must explicitly separate

For every measured run, distinguish:

- raw Pass 2 output
- post-contract-retry output
- post-repair output
- final accepted claim set

Without that split, Phase 7 will keep mixing:

- extraction quality
- validator quality
- recovery quality

### What should be fixed before using E2 as architecture-moving evidence

1. Refresh or recompute `contractValidationSummary` after repair so the stored summary matches the stored final claim set.
2. Persist salience-stage outcome structurally even on failure or disabled paths.
3. Persist quote-level anchor proof if the validator approved preservation.
4. Move the contract-repair prompt into the prompt system so the Stage 1 contract lives in one reviewable place.

## Bottom Line

The deeper code review does **not** invalidate Phase 7.

It does change the standard of proof:

- **E2 batch on current HEAD:** still worth running
- **Interpretation of that batch:** must be “anchor-recognition audit”
- **Evidence needed to justify Shape B:** stronger than current job-level pass/fail metrics alone
