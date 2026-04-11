---
### 2026-04-10 | Lead Architect + Senior Developer | GitHub Copilot (GPT-5.4) | Current-State Report Quality Investigation
**Task:** Investigate local Swiss-family job `9dab007670434245a3b76fa405066989`, broad report-quality decline concerns, matrix anomalies, same-input variance, complexity growth, and earlier analyses; use parallel agents and return root causes, proposals, and an implementation plan.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-10_Lead_Architect_Senior_Developer_Current_State_Report_Quality_Investigation.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Investigation only. No runtime code changes. Treated this as a combined Lead Architect + Senior Developer review. Re-validated older April 10 findings against the current codebase and live local job/UI instead of assuming earlier handoffs were still current.
**Open items:** Need Captain decision on the desired Stage-1 failure behavior when the final accepted claim set still violates the original claim contract: forced retry, explicit degraded output, or hard failure. Need deployed app URL if remote report comparison is required; `factharbor.ch` resolves to docs, not the live report UI.
**Warnings:** The current pipeline still knowingly ships a broken final claim contract in `9dab...`: `contractValidationSummary` says the final claims dropped `rechtskräftig`, yet the article verdict remains `TRUE 86.9`. The matrix is also semantically mixed: cell colors use boundary-local findings, row headers use dominant-cell coloring, and column totals use final claim verdicts. This can show red cells and a green claim total for the same claim without explanation.
**For next agent:** Highest-priority action remains P0: Stage-1 final-claim contract enforcement. Start from the verified evidence in Sections 1-3 below, not from older speculative reports. After that, fix report honesty in the coverage matrix and only then pursue broader cleanup/removal work.
**Learnings:** No

## Scope And Method

This investigation used:
- live local job payload inspection via `GET /v1/jobs/{jobId}`
- live local UI inspection at `http://localhost:3000/jobs/9dab007670434245a3b76fa405066989`
- jobs-index sampling via `GET /v1/jobs?page=1&pageSize=200`
- direct reads of current analyzer code, config schema/defaults, tests, and prior handoffs
- four parallel Explore-agent threads focused on Stage 1, matrix semantics, systemic variance/history, and removal-first cleanup

The goal was not only to diagnose `9dab...`, but to connect it to the user's broader concerns:
- `rechtskräftig` is not handled as part of the decisive main claim
- matrix red fields feel wrong
- same-input run variance is large
- quality seems worse in some aspects than older reports
- the codebase feels accretive and harder to control

## 1. Verified Current-State Findings

### 1.1 The live `9dab...` report is still fundamentally wrong at the proposition level

Current live local result for job `9dab007670434245a3b76fa405066989`:
- overall verdict: `TRUE`
- truth: `86.9`
- confidence: `83.7`
- current build hash in job list: `d5ded98f...`

The decisive problem is that the final accepted atomic claims are:
- `AC_01`: `Der Bundesrat hat den EU-Vertrag unterzeichnet, bevor das Parlament darüber entschieden hat.`
- `AC_02`: `Der Bundesrat hat den EU-Vertrag unterzeichnet, bevor die Stimmbevölkerung darüber entschieden hat.`

The modifier `rechtskräftig` is missing from both final accepted claims.

But the same result payload also stores:
- `contractValidationSummary.preservesContract = false`
- `contractValidationSummary.rePromptRequired = true`
- `contractValidationSummary.summary = "Both claims omit 'rechtskräftig' (legally binding), a truth-condition-bearing modifier. No claim preserves it."`

So the current system does not fail to notice the problem. It notices it and still proceeds.

### 1.2 Stage 1 currently knows the final claim contract is broken and still ships it

The current `extractClaims()` flow in `apps/web/src/lib/analyzer/claim-extraction-stage.ts` does three relevant things:

1. It runs contract validation after Pass 2 and may retry before Gate 1.
2. It runs Gate 1 and optional reprompt loops.
3. It re-validates the final accepted claims after Gate 1 if the accepted set differs from the last validated set.

The crucial verified behavior is the third part.

Current code path:
- [claim-extraction-stage.ts](c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts#L646) checks whether the final accepted claims differ from the last validated claim set.
- [claim-extraction-stage.ts](c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts#L670) re-runs `validateClaimContract()` on the final accepted claims.
- [claim-extraction-stage.ts](c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts#L674) refreshes `contractValidationSummary`.
- It does **not** halt, retry again, degrade the report, or force a structurally unresolved output when `preservesContract` is still false.

The current retry guidance is also part of the defect, not just the control flow. The corrective string in [claim-extraction-stage.ts](c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts#L302) still tells the model to preserve the anchor in at least one direct atomic claim, which is the same loose framing that produced the broken side-claim pattern in the first place. Across the four same-input payloads reviewed on April 10, that retry recovered zero of the three broken runs.

That means the pipeline currently supports this exact state:
- final accepted claims violate the original proposition
- observability records the violation correctly
- downstream research/verdict stages still operate as if the accepted claim set were valid

This is the highest-priority correctness defect.

### 1.3 `rechtskräftig` is recognized semantically, but handled in the wrong structural place

The live job's normalized background explicitly interprets `rechtskräftig` as the problematic binding/finality modifier:
- the UI background note says the adverb suggests binding or final effect
- the contract summary preserves the same interpretation

The persisted Stage-1 diagnostic data also shows how the modifier was handled before Gate 1:
- `preFilterAtomicClaims` includes a third claim:
  - `AC_03`: `Die Unterzeichnung des EU-Vertrags durch den Bundesrat hat rechtskräftige Wirkung.`
- `gate1Reasoning` marks `AC_03` as:
  - `passedOpinion = true`
  - `passedSpecificity = false`
  - `passedFidelity = false`
  - reasoning: it introduces a legal-effect dimension not present in the input

This gives the exact current failure mode:
- the modifier is not ignored
- it is split out into a standalone legal-effect claim
- Gate 1 then rejects that standalone claim for fidelity
- the surviving final claims keep only the chronology fragments

So the core problem is not “model never saw `rechtskräftig`.”
It is: the current Stage-1 decomposition still cannot preserve the modifier inside a direct claim that survives Gate 1.

### 1.4 The matrix red fields are explainable, but the UI is semantically misleading

The local hydrated page and current UI code confirm the user’s complaint.

Current matrix semantics:
- cells use boundary-local `boundaryFindings` verdict percentages
- row headers use `dominantVerdict()` from [CoverageMatrix.tsx](c:/DEV/FactHarbor/apps/web/src/app/jobs/[id]/components/CoverageMatrix.tsx#L96), which colors the row by the cell with the highest evidence count
- column headers and total-row claim cells use the final aggregated claim verdict from [page.tsx](c:/DEV/FactHarbor/apps/web/src/app/jobs/[id]/page.tsx#L1080)
- overall total uses the final article verdict

For `AC_01` in the live page:
- claim card: `75%`, `Mostly True`
- boundary cards under the same claim:
  - `CB_01`: `18%`, `Mixed`
  - `CB_02`: `10%`, `Neutral`
  - `CB_03`: `12%`, `Mixed`

So the user sees:
- red or false-side cells in the matrix
- a green or true-side final claim verdict for the same claim
- a row header whose color is only the dominant cell, not a real boundary-level verdict

This is not random. It is a mixed-semantic display:
- cell = boundary-local sub-verdict
- row header = dominant-cell indicator
- column total = final claim verdict

Even when technically derivable from the payload, it is not report-honest.

### 1.5 Current local same-input variance is still large

Using the current local jobs index (`/v1/jobs?page=1&pageSize=200`), the following families show active spread:

| Family | Count | Min | Max | Spread |
|---|---:|---:|---:|---:|
| `Der Bundesrat unterschreibt den EU-Vertrag rechtskräftig...` | 26 | 11 | 100 | 89 |
| `Der Bundesrat hat das EU-Vertrags-Packet unterschrieben...` | 2 | 0 | 96 | 96 |
| `Plastic recycling is pointless` | 10 | 40 | 68 | 28 |
| `Jair Bolsonaro received a fair trial in Brazil.` | 2 | 35 | 56 | 21 |

Representative current Swiss-family samples:
- `9dab0076:86:TRUE`
- `05be66ca:32:LEANING-FALSE`
- `7e0683dc:16:MOSTLY-FALSE`
- `5d46fb75:63:LEANING-TRUE`
- `e3927043:93:TRUE`
- `230005f2:17:MOSTLY-FALSE`

That is enough to treat run variance as a present systemic issue, not only a historical one.

### 1.6 `f1a372bf...` is definitively not the causal regression point

Verified via `git show --stat --summary f1a372bf7d9e69cfe220953cbfc5e5aa8193d651`:
- it is a docs-only commit
- no runtime analysis code changed there

The user’s sense that quality has declined since then may still reflect real report quality trends, but not because that commit changed behavior.

## 2. Root Cause Synthesis

### Root cause 1: Stage-1 contract enforcement is observational, not operational

The system has become better at **describing** broken claim contracts than at **preventing** them.

That is the core problem in `9dab...`.

Current architecture:
- detect drift
- retry once upstream
- re-validate final accepted claims
- record summary
- proceed anyway

This is the wrong control point. When the final accepted claims still fail the original proposition contract, the analysis should not proceed as a normal successful report.

### Root cause 2: Stage-1 decomposition still treats truth-condition modifiers as detachable side claims

`rechtskräftig` is currently being externalized into a separate legal-effect claim instead of preserved inside the decisive main claim.

That decomposition is brittle because Gate 1 can then reject the side claim while preserving the chronology fragments. The modifier survives in diagnostics, but not in the accepted analytical unit.

### Root cause 3: The report surface mixes incompatible semantic levels

The current matrix combines:
- per-boundary local findings
- dominant-cell row coloring
- final claim verdicts
- final article verdict

This makes the report look self-contradictory even when the data model technically explains it.

The problem is not only visual design. The report is currently not honest about what each colored number means.

### Root cause 4: Variance is multi-stage and systemic

The Swiss-family issue is not isolated.

The strongest pattern across current and prior evidence is a compounding chain:
- Stage 1 decomposition variability
- Stage 2 evidence-pool variability
- Stage 3 boundary framing variability
- Stage 4/5 repair, rescue, and aggregation variability

That is why the same family can swing from false to true with no code change.

### Root cause 5: Complexity accretion is now a quality problem in itself

The user’s concern about endless additions is justified.

Verified current examples:
- `articleVerdictOverride` is declared in [config-schemas.ts](c:/DEV/FactHarbor/apps/web/src/lib/config-schemas.ts#L1543) and defaulted, but has no runtime consumer outside schema/default definitions.
- deprecated dominance-era residue still exists in [types.ts](c:/DEV/FactHarbor/apps/web/src/lib/analyzer/types.ts#L1313) and article-adjudication path types.
- legacy `orchestrated` prompt profile references are still live in prompt infrastructure and grounding checks, so they are not dead, but they do reflect transitional surface area that increases cognitive load.
- deterministic semantic hotspots remain documented and still relevant, especially Stage-1 anchor preservation and Stage-4 direction rescue.

This does not mean “throw everything away.”
It does mean the next quality phase should include real deletion and simplification, not only more safeguards.

## 3. Most Important Current Issues

### Issue A: Broken final claim contracts can ship as high-confidence success

Severity: Critical

Evidence:
- live `9dab...` payload
- current `claim-extraction-stage.ts` flow
- current test suite only asserts the summary records the failure; it does not assert the pipeline must halt or degrade

Why it matters:
- the report can prove the wrong proposition and still look healthy
- all later stages then optimize the wrong question

### Issue B: `rechtskräftig` is not preserved in a surviving main direct claim

Severity: Critical

Evidence:
- live pre-filter claims and Gate 1 reasoning
- live final accepted claims

Why it matters:
- this is exactly the user’s primary complaint
- it changes the article-level verdict driver

### Issue C: Matrix semantics are misleading enough to damage trust

Severity: High

Evidence:
- live hydrated page
- current CoverageMatrix implementation

Why it matters:
- users correctly perceive contradictions between the matrix and claim totals
- even technically explainable contradictions remain bad report design

### Issue D: Same-input variance is still too high

Severity: High

Evidence:
- local jobs index sampling
- prior April 10 handoffs and historical reports

Why it matters:
- makes it hard to trust improvements
- encourages endless patching because each new failure appears unique

### Issue E: Cleanup debt is now large enough to affect debugging quality

Severity: Medium

Evidence:
- verified dead config field
- verified transitional residue
- documented deterministic hotspots

Why it matters:
- slows future fixes
- makes it harder to know which knobs actually matter

## 4. Improvement Proposals

### P0. Enforce the final claim contract operationally

Goal:
- prevent a successful report when the final accepted claims do not preserve the input’s truth-condition-bearing proposition

Recommended behavior order:
1. best: targeted final retry that must preserve the anchor inside a direct claim that survives Gate 1
2. acceptable fallback: explicit degraded output (`UNVERIFIED` / damaged report) when that cannot be achieved
3. avoid: silently shipping the broken final set

Implementation direction:
- after the final post-Gate-1 contract re-validation, if `preservesContract === false`, do not continue as normal
- add a dedicated failure mode and warning type for “final accepted claim contract broken”
- decide whether this should block verdict generation or force a degraded article output

Why this is better than another early-pass patch:
- it puts the control at the point where the pipeline actually knows what the final accepted claims are

### P1. Redesign Stage 1 so truth-condition modifiers stay attached to a direct surviving claim

Goal:
- stop splitting modifiers like `rechtskräftig` into detachable side claims

Preferred target structure:
- one direct anchor-preserving primary claim
- optional supporting chronology claims beneath it

Avoid:
- modifier-only side claim plus chronology fragments

Suggested design options:
1. teach Pass 2 / contract validation to require one fused anchor-preserving direct claim when a modifier changes the proposition
2. relax Gate 1 fidelity for anchor-preserving fused claims that stay faithful to the original proposition even if they introduce legal-effect language already implied by the modifier
3. add an explicit “truth-condition anchor carrier” marker so Gate 1 cannot filter the only anchor-preserving direct claim without escalation

### P2. Make the matrix semantically honest

Goal:
- stop presenting mixed semantic levels as if they were equivalent verdict summaries

Short-term safe fix:
- keep cell-level boundary findings
- remove row-header verdict coloring unless a real boundary-level verdict exists
- add tooltips/legend text explaining:
  - cell = boundary-local finding
  - column total = final claim verdict
  - overall = final article verdict

Better medium-term fix:
- persist a real display-layer matrix model rather than reusing analytical `boundaryFindings` as UI verdict cells

### P3. Build a repeatable variance battery for same-input families

Goal:
- stop evaluating improvements on single lucky/unlucky runs

Minimum battery:
- Swiss `rechtskräftig` input
- Swiss chronology-only variant
- `Plastic recycling is pointless`
- `Jair Bolsonaro received a fair trial in Brazil.`
- one obvious control family

Acceptance style:
- repeated same-build runs
- track decomposition mode, evidence mix, boundary mix, and final verdict spread
- compare before/after each change wave

### P4. Run a removal-first cleanup track in parallel

Verified removal candidate:
- remove `articleVerdictOverride` from schema/defaults unless a real consumer is added soon

Likely simplification targets after verification:
- deprecated dominance-era backward-compat fields that no longer serve active consumers
- stale comments and narrative around removed orchestrated-era concepts
- deterministic semantic rescue layers that are compensating for upstream instability rather than solving it

### P5. Review deterministic semantic hotspots explicitly

Priority order remains:
1. Stage-1 truth-condition anchor preservation / override logic
2. Stage-4 direction rescue logic
3. source-reliability truth weighting review

This should be a deliberate backlog item, not incidental cleanup.

## 5. Proposed Implementation Plan

### Track 1: Correctness First

1. Add a final-contract failure state in Stage 1.
2. Decide the allowed outcomes when final accepted claims break the contract:
   - targeted retry
   - degraded output
   - hard fail
3. Add tests for the exact current bad behavior:
   - final accepted claims drop anchor
   - pipeline must not produce a normal successful report

### Track 2: Swiss-Family Repair

4. Redesign extraction/gating so `rechtskräftig` remains inside a surviving direct claim.
5. Validate on repeated Swiss-family runs, not one-off jobs.

### Track 3: Report Honesty

6. Neutralize or replace row-header dominant-cell coloring.
7. Add explicit matrix semantics help text/tooltips.
8. Decide whether to persist a UI-oriented matrix model separate from analytical `boundaryFindings`.

### Track 4: Variance Discipline

9. Create a same-input regression battery script or test harness for the main families.
10. Require spread tracking before/after major quality fixes.

### Track 5: Simplification

11. Remove verified dead config (`articleVerdictOverride`).
12. Audit backward-compat and legacy prompt-profile surface.
13. Open a removal-first simplification milestone before adding the next major patch wave.

## 6. Test And Validation Gaps

Current verified gap:
- there are tests that assert `contractValidationSummary` records final accepted anchor loss in [claimboundary-pipeline.test.ts](c:/DEV/FactHarbor/apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts#L8030)
- there is no corresponding test that the pipeline must stop, degrade, or force another correction when that state occurs

That is why the current behavior can be “fully tested” and still produce a structurally wrong successful report.

## 7. Uncertainties / Steering Points For The User

Two decisions would materially steer implementation:

1. When final accepted claims still violate the contract, what outcome do you want?
   - A: force retry until an anchor-preserving direct claim exists
   - B: produce a degraded/UNVERIFIED report
   - C: fail the job visibly

2. For cleanup, do you want:
   - A: a removal-first stabilization track before new fixes
   - B: Stage-1 fix and matrix fix first, with cleanup in parallel

I recommend `1B or 1C` over silent success, and `2B` pragmatically.

## Bottom Line

The user’s main concern is confirmed in the current code and current local report:
- `rechtskräftig` is recognized
- it is not preserved in the decisive final atomic claim set
- the pipeline knows that
- and still returns a high-confidence `TRUE` report

The matrix issue is also real:
- the red fields are not arbitrary
- but the UI mixes boundary-local and final claim/article semantics in a way that is not honest enough for users

The broader quality concern is also justified:
- same-input variance is still large in current local data
- the problem is systemic, not tied to `f1a372bf`
- and the codebase needs some real removal/simplification, not only more patch layers

If only one implementation starts next, it should be:
- **P0 final-claim contract enforcement in Stage 1**

That is the single change most likely to improve both correctness and user trust.
