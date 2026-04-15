# Phase 7 Status And E2 Measurement Plan

**Date:** 2026-04-14
**Status:** Historical bridge document. Operationally superseded by `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md`.
**Scope:** Reconcile the Phase 7 charter with actual repo state and define the immediate next execution step.

## Status Note

This document captured the repo state **before** the later hardening/clarification cycle.

Use it for:

- the transition from charter state to actual `main` state
- the rationale for why E1 and E2 were already live

Do **not** use it as the latest execution plan. The current source-of-truth working baseline is:

- `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md`

---

## Why this document exists

The current Phase 7 charter in [2026-04-13_Phase7_Salience_First_Charter.md](2026-04-13_Phase7_Salience_First_Charter.md) is still the design source of truth, but it is no longer operationally current:

- it still says "design only" and "no code change until E1 measurement decides the path"
- it still describes a serial flow where E1 lands, then is measured, then E2 may land
- it points to future measurement docs that do not yet exist in `Docs/WIP/`

Actual repo state has already moved beyond that:

- **E1 landed** and was iterated to V5
- **E2 landed** as a log-only upstream salience stage
- **no committed Phase 7 measurement doc exists yet**

This doc is the bridge between the charter and the current implementation state.

---

## Current state on `main`

### Charter / design commits

- `e3dc97b7` — initial Phase 7 charter
- `9afc3499` / `c54bba5f` — charter review fixes
- `9d5a3293` — Captain directive applied: work only on `main` HEAD, no historical replays
- `b4dcb1e9` — E1 PASS threshold raised from 60% to 80%

### E1 prompt work

- `7e0fd20a` — E1 salience-first Pass 2 scaffold landed
- `da0247a9` — input-specific example words removed
- `ff08a0db` — E1 V5 meaning-based scaffold landed

### E2 implementation work

- `731f14ec` — E2 log-only upstream salience stage landed

### What is now implemented

**E1 is live in Pass 2.**
- Current prompt version is the V5 meaning-based scaffold in [apps/web/prompts/claimboundary.prompt.md](../../apps/web/prompts/claimboundary.prompt.md).
- It is internal reasoning only; no Pass 2 schema change was made.

**E2 is live as a log-only stage.**
- `runSalienceCommitment()` now runs between Pass 1 and preliminary search in [apps/web/src/lib/analyzer/claim-extraction-stage.ts](../../apps/web/src/lib/analyzer/claim-extraction-stage.ts).
- Results are persisted on `understanding.salienceCommitment`.
- Config switch exists at `calc.salienceCommitment.enabled`.
- E2 does **not** yet constrain Pass 2. Shape B is still unimplemented.

---

## The missing artifact

The repo has code and commit messages, but not yet the expected measurement ledger that explains why E2 was promoted and what should happen next.

Specifically missing:

- **E1 measurement doc** recording the R2 tripwire result claimed in `731f14ec`
- **Phase 7 status doc** explaining that E2 is already on `main`
- **E2 measurement doc** for the 35-run batch the charter now expects

Right now the key E1 outcome exists only in the `731f14ec` commit message:

> V5 tripwire on R2 came in at **3/5 full pass** (ambiguous band)  
> → stop iterating on E1 prompt variants  
> → promote E2 as the structural move  
> → keep V5 in place

That is operationally important and should not live only in git history.

---

## Working interpretation

As of `731f14ec`, Phase 7 is in this state:

1. **Prompt-only E1 did not close the gap decisively.**
2. **E1 was not judged harmful enough to revert.**
3. **E2 was promoted and landed as the next structural probe.**
4. **The next correct step is measurement, not more implementation.**

This means the active question is no longer "should we land E1?" or "should we land E2?"

The active question is:

> **Does the landed E2 salience stage identify anchors reliably enough to justify Phase 7b / Shape B?**

---

## Immediate next step

**Freeze Phase 7 code changes and run the E2 measurement batch on current HEAD.**

Do not:

- iterate E1 prompt wording again
- promote E2 into a binding input
- start Shape B refactor
- start Opus / best-of-N work

until the E2 batch is recorded.

---

## E2 measurement batch to run

Use the charter's current corpus and thresholds from [2026-04-13_Phase7_Salience_First_Charter.md](2026-04-13_Phase7_Salience_First_Charter.md).

### Corpus

**Positive inputs**
- R2 locked German input
- R2-plural German input
- reported-speech hedge German input
- multi-modifier English input
- plain hedge English input

**Negative controls**
- plain factual German input
- plain factual English input
- plain assertion English input

### Run count

- `7 inputs × 5 runs = 35 runs`

### Metrics to record

For every run:
- `jobId`
- `inputValue`
- `executedWebGitCommitHash`
- `verdictLabel`
- `preservesContract`
- `contractValidationSummary.failureMode`
- `contractValidationSummary.truthConditionAnchor.anchorText`
- `contractValidationSummary.truthConditionAnchor.validPreservedIds`
- `salienceCommitment.anchors`

Per aggregate:
- positive-cohort gate-pass rate
- positive-cohort full-pass rate
- E2 recall on positive cohort
- E2 precision on negative-control cohort
- negative-control contamination rate

### Decision thresholds

Keep the charter's locked E2 thresholds:

- **PASS:** recall `>= 80%` and precision `>= 80%`
- **FAIL:** recall `<= 40%` or precision `<= 40%`
- **Ambiguous:** anything between

---

## Required output docs

The next agent should produce **two** docs, not zero and not five:

1. **E1 status note**
   Suggested filename:
   `Docs/ARCHIVE/2026-04-14_Phase7_E1_Status_Note.md`

   Purpose:
   - record that E1 V5 landed
   - record the claimed R2 tripwire result (`3/5`, ambiguous band)
   - record why E2 was promoted

2. **E2 measurement report**
   Suggested filename:
   `Docs/WIP/2026-04-14_Phase7_E2_Measurement.md`

   Purpose:
   - record the 35-run batch on `731f14ec` or later HEAD
   - compute recall / precision / contamination / gate-pass / full-pass
   - route to exactly one of: Shape B, negative close, one bounded prompt lap

If the E1 tripwire raw jobs can be reconstructed exactly from the local API, include them in the E1 note. If not, clearly label the result as "commit-message-sourced, pending raw-job reconstruction."

---

## What I recommend after the E2 batch

### If E2 passes

Open **Phase 7b** with a narrow implementation charter for:
- binding Pass 0 output into Pass 2
- additive `sourceSpan`
- list-based `truthConditionAnchors`
- validator reframed from discovery to audit

### If E2 fails

Close Phase 7 with a negative result and open **Phase 7c** for:
- Opus escalation
- best-of-N / retry strategy
- no Shape B refactor

### If E2 is ambiguous

Allow **one** bounded Pass-0 prompt iteration only.

No prompt treadmill beyond one lap.

---

## Bottom line

**Current work is Phase 7 measurement, not Phase 7 implementation.**

The repo already contains:
- the charter
- the E1 prompt intervention
- the E2 log-only structural probe

What it does **not** yet contain is the document that turns those changes into a defensible decision.

That missing measurement artifact is now the highest-leverage next step.
