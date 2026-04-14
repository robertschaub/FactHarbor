# Phase 7 Working Baseline

**Date:** 2026-04-14  
**Historical filename:** this file began as the Step 1 note; it is now the consolidated working baseline for Steps 1-3.  
**Audience:** humans and coding agents  
**Companion review:** detailed code/prompt findings live in `Docs/WIP/2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md`

## 0. How To Use This Document

This is the Phase 7 source-of-truth working baseline.

- Use **Section 1** for the current operational picture.
- Use **Section 2** for Step 1: pains, needs, and expectations.
- Use **Section 3** for Step 2: issues and root causes.
- Use **Section 4** for Step 3: root fixes and specification.
- Use the companion code/prompt review when the question is about implementation details, retry/repair semantics, or prompt architecture.

What this document intentionally does **not** do:

- it does not replay every historical artifact line-by-line
- it does not duplicate the full code review
- it does not claim stronger certainty than the sources support

## 1. Executive Baseline

### Current position

- Phase 5/6 fixed real failure classes, but did **not** deliver aggregate R2 improvement.
- Phase 7 is the active workstream.
- **Bundle A (Measurement Hardening) and Bundle B (Contract Cleanup) are committed in `61815f41`.**
- The code/contract surface is materially improved:
  - `salienceCommitment` has a fuller declared contract in code, but slice 1 still needs to ensure the full status survives persistence on every path
  - `contractValidationSummary` now includes `preservedByQuotes`
  - recovery attribution exists in code, but slice 1 still needs to ensure it survives final summary replacement
  - successful repair now forces revalidation before persistence
  - repair prompt governance now lives in `CLAIM_CONTRACT_REPAIR`
  - repair-path anchor checks are case-insensitive
- E2 is still **log-only** and does **not** constrain Pass 2.
- The immediate engineering question is no longer “what is broken?” It is “do we have enough to begin Shape B responsibly?”

### Current decision standard

- The repo now knows enough to begin **Phase 7b / Shape B as a bounded engineering step behind a feature flag**.
- The current E2 packet should still be interpreted as an **anchor-recognition audit**, not as a fully reproduced committed-build statistical close-out.
- Do **not** cite the current measurement packet as decision-grade empirical closure unless and until the committed-build batch is reproducible from local `Jobs` data.
- Final external review result: **Proceed only with constraints.** The architecturally correct next step is still Shape B, but slice 1 must include the remaining observability/mode-separation fixes rather than deferring them.

### Primary supporting sources

- `Docs/WIP/2026-04-13_Phase7_Salience_First_Charter.md`
- `Docs/WIP/2026-04-14_Phase7_Status_and_E2_Measurement_Plan.md`
- `Docs/WIP/2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md`

## 2. Step 1: Pains, Needs, And Expectations

### 2.1 General working summary

| Scope | Category | Statement | Acceptance / operating rule | Provenance | Confidence | Main source(s) |
|---|---|---|---|---|---|---|
| Phase 7 overall | Pain | Phase 5/6 did not solve the aggregate R2 problem. | Do not claim aggregate R2 improvement on current evidence. | Directly documented | High | `2026-04-13_C16_R2_Combined_Replay_Analysis.md`; `2026-04-13_Phase7_Salience_First_Charter.md` |
| Phase 7 overall | Pain | Current `main` still shows mixed salience-preservation behavior across the intended corpus. | Treat current HEAD as unresolved, not stabilized. | Observed + documented | High | local `Jobs`; `2026-04-14_Phase7_Status_and_E2_Measurement_Plan.md` |
| Phase 7 overall | Pain | The biggest current gap is measurement / decision debt. | No further Phase 7 architecture claims without a review-honest measurement record. | Directly documented | High | `2026-04-14_Phase7_Status_and_E2_Measurement_Plan.md` |
| Phase 7 overall | Need | Freeze prompt/stage drift long enough to measure current HEAD. | Measure before adding new Phase 7 interventions. | Directly documented | High | `2026-04-14_Phase7_Status_and_E2_Measurement_Plan.md` |
| Phase 7 overall | Need | Keep exact-input and exact-cohort discipline. | Match byte-identical `inputValue`; do not mix variants or cherry-pick windows. | Directly documented | High | `2026-04-13_C16_R2_Combined_Replay_Analysis.md` |
| Phase 7 overall | Expectation | Phase 7 should solve a generic meaning-preservation problem, not a single-token patch. | Judge on a fixed corpus and explicit thresholds, not narrative optimism. | Directly documented + user-stated in docs | High | `2026-04-13_Phase7_Salience_First_Charter.md` |
| Phase 7 overall | Expectation | Positive inputs should expose salient qualifiers; negative controls should stay empty or near-empty. | Precision metric must explicitly define whether bare subject/action anchors are acceptable. | Directly documented but still underspecified | Medium | `2026-04-13_Phase7_Salience_First_Charter.md` |

### 2.2 Input-by-input summary

| Input | Main pain | Main need | Expected behavior | Provenance | Confidence | Main source(s) |
|---|---|---|---|---|---|---|
| `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben` | qualifier loss, qualifier side-claiming, underweighting of the binding/finality dimension | preserve `rechtskräftig` in at least one thesis-direct claim; use as primary canary (`R2a`) | false-side family result when the qualifier is fused correctly | exact canary in newer plan + strong older family history | High on family; medium on exact-tense transfer | `2026-04-13_Three_Lane_Restart_Comparison_Experiment_Plan.md`; `2026-04-08_Proposition_Anchoring_Fix_Plan.md`; `2026-04-11_Phase2_Per_Input_Expectations.md` |
| `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben` | chronology-only claim can be escalated into invented constitutional / legitimacy content | use as paired chronology control (`R2b`) against `R2a` | stay TRUE-side; no invented normative/legal content | exact control in newer plan + strong older family history | High on family; medium on exact-tense transfer | `2026-04-13_Three_Lane_Restart_Comparison_Experiment_Plan.md`; `2026-04-08_Complete_Quality_Assessment_and_Plan.md`; `2026-04-07_f1a372bf_to_HEAD_Job_Quality_Investigation.md` |
| `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz` | number loss, temporal-qualifier loss, weak grounding on the wrong source | keep `235 000`, keep `zurzeit`, ground directly on SEM 2025 PDF | TRUE / MOSTLY-TRUE, structurally exact | direct exact-input criteria | High | `2026-04-11_Phase2_Per_Input_Expectations.md`; `2026-04-11_Phase2_Gate_G2_Replay_Plan.md` |
| `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?` | STF/TSE collapse, foreign contamination, sentence-loss, underconfident output | preserve multi-proceeding structure and keep foreign political material out of frame | most-true-side family result with adequate structure and confidence | family-derived criteria; exact wording is newer | High on family; medium on exact long-form transfer | `Report_Quality_Criteria_Scorecard_2026-03-12_arch.md`; `2026-03-18_Bolsonaro_Sentencing_Evidence_Loss_Fix_Plan.md`; `2026-04-11_Phase2_Per_Input_Expectations.md` |
| `Plastic recycling is pointless` | broad evaluative variance plus structural weak-run modes | keep decomposition broad and use real researched evidence | mid-band family result; do not treat as a hard exact-input oracle | weak exact-input grounding; family-synthesized expectation | Medium | `2026-04-11_Phase2_Per_Input_Expectations.md`; `2026-03-25_EVD1_Acceptable_Variance_Policy.md` |

### 2.3 Step 1 carry-forward

#### Proven by source

- The unresolved product-quality problem is not “Phase 5/6 code is broken.” It is that current `main` still shows mixed salience-preservation behavior on the intended Phase 7 corpus.
- The strongest immediate operational need is to freeze drift and run the missing E2 measurement batch on current HEAD.
- Historical expectations are stable across the strongest inputs: preserve the claim-defining qualifier when it matters, avoid invented legal/normative content, and do not let trivial chronology dominate the overall result.

#### Inference

- The best current label is **selective salience instability plus measurement-spec ambiguity**.
- That is narrower, and more defensible, than claiming a fully proven general multilingual capability failure.

## 3. Step 2: Issues And Root Causes

### 3.1 General root-cause summary

| Scope | Current issue | Root cause | Status | Confidence | Main source(s) |
|---|---|---|---|---|---|
| R2-style qualifier family | qualifier-preservation failures on current/headline canaries | historically: deterministic substring F4 override; more generally: extraction/validation architecture reacts to salient meaning after extraction rather than committing to it before extraction | partly proven, partly architectural hypothesis | High on F4 history; medium on umbrella architecture claim | `2026-04-12_Phase2_Results_Report.md`; `2026-04-13_Phase7_Salience_First_Charter.md`; `2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md` |
| Asylum family | large verdict divergence on a simple factual target | evidence-direction classification issue; not mainly an R2/F4-style anchor problem | proven issue, lower-level cause unresolved | Medium | `2026-04-12_Phase2_Results_Report.md` |
| Bolsonaro family | instability between decomposition quality and contamination control | the pipeline struggles to preserve multi-proceeding structure while keeping foreign political reaction outside the analytical frame | proven family root cause | High | `Report_Quality_Criteria_Scorecard_2026-03-12_arch.md`; `2026-04-05_Bolsonaro_Plastik_Local_Quality_Investigation.md` |
| Plastic family | broad variance and occasional pathological runs | mixed family: some variance is inherent to broad evaluative inputs; some variance is pipeline-caused (seeded-only sufficiency, boundary concentration, source skew) | mixed, partly proven | Medium | `2026-03-25_EVD1_Acceptable_Variance_Policy.md`; `2026-04-11_Phase2_Per_Input_Expectations.md` |
| Phase 7 architecture | unclear whether salience-first is genuinely the right structural move | E2 is only observational, while Pass 2 already contains a strong internal meaning-preservation scaffold; current batch cannot by itself prove binding-architecture benefit | proven implementation fact, architectural implication still hypothesis | Medium-high | `2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md`; `claimboundary.prompt.md`; `claim-extraction-stage.ts` |
| Measurement protocol | reviews kept drifting between real evidence and overclaim | cohort definition, metric wording, and persisted observability were not tight enough for strong architecture claims | proven on R2; broader pattern partly inferred | Medium-high | `2026-04-13_C16_R2_Combined_Replay_Analysis.md`; `2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md` |

### 3.2 Root causes by input

| Input | Current issue | Root cause | Status | Confidence | Main source(s) |
|---|---|---|---|---|---|
| `... rechtskräftig ...` | modifier loss, underweighted legal-binding dimension, damaged runs | current-head historical root cause: F4 substring override; broader issue family: salient qualifier is not represented explicitly as a first-class extraction contract | current-head history proven; broader architecture still hypothesis | High on family history; medium on Phase 7 umbrella | `2026-04-12_Phase2_Results_Report.md`; `2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md` |
| chronology-only Bundesrat | chronology claim pulled false-side by inferred legality content | interpretation injection: pipeline invents a constitutional-order claim not stated by the user | proven family root cause | High | `2026-04-07_f1a372bf_to_HEAD_Job_Quality_Investigation.md` |
| asylum `235 000` | large direction divergence on the same factual target | evidence-direction classification issue; exact lower-level mechanism still unresolved | proven issue, unresolved lower-level cause | Medium | `2026-04-12_Phase2_Results_Report.md` |
| Bolsonaro fair-trial family | structure collapse or contamination | decomposition-vs-contamination trade-off; likely compounded by retrieval and evidence-selection instability | primary trade-off proven; secondary contributors mixed | Medium-high | `Report_Quality_Criteria_Scorecard_2026-03-12_arch.md`; `2026-03-18_Bolsonaro_Sentencing_Evidence_Loss_Fix_Plan.md`; `2026-04-05_Bolsonaro_Plastik_Local_Quality_Investigation.md` |
| `Plastic recycling is pointless` | some runs are weak, not merely variable | family has real evaluative variance, but also concrete pipeline failures: sufficiency bypass, boundary concentration, English-source criticism bias | mixed | Medium | `2026-03-25_EVD1_Acceptable_Variance_Policy.md`; `2026-04-11_Phase2_Per_Input_Expectations.md` |

### 3.3 Code/prompt-specific Step 2 findings that matter for Phase 7

These findings are implementation-level and come from the deep review plus the later hardening commit:

- E2 is currently **audit-only**, not a binding architectural input.
- Retry and repair can improve the final claim set after the original Pass 2 output, so raw extraction quality and final job success are not the same thing.
- Several earlier contract-surface blockers were fixed in `61815f41`, but the core architectural distinction remains: audit-only E2 is not Shape B.
- The remaining weakness is not primarily code blindness anymore; it is overclaim risk if the measurement packet is treated as stronger than the locally reproducible evidence.
- Final reviewer round identified two still-live slice-1 blockers:
  - full salience status is still not durably persisted on every path
  - `stageAttribution` can still be lost when final revalidation replaces the summary
- Final reviewer round also identified two mandatory Shape B design constraints:
  - explicit config-level separation between audit-only E2 and binding Shape B
  - explicit resolution of thesis-direct vs literal-substring precedence before anchor mapping becomes authoritative

Source: `Docs/WIP/2026-04-14_Phase7_Code_and_Prompt_Deep_Review.md`

### 3.4 Step 2 carry-forward

#### Proven by source

- The most historically proven code-path failure in this workstream was the Apr 8 deterministic substring F4 check.
- The asylum issue is on a different quality axis from R2: evidence-direction classification, not anchor-preservation override.
- The Bolsonaro family’s clearest stable issue is the decomposition-vs-contamination trade-off.
- The Plastic family combines inherent evaluative variance with concrete pipeline weaknesses.
- For Phase 7 specifically, E2 is live but audit-only, and the current measurement surface is not yet clean enough to support large architectural claims.
- After `61815f41`, the repo does appear clean enough to begin Shape B implementation as the next bounded step, but not clean enough to overstate the current measurement packet as fully reproduced proof.

#### Inference

- Salience-first remains plausible, but it is still a hypothesis until the repo can measure it cleanly.
- The next high-value move is not unconstrained implementation. It is a bounded fix/spec package that makes the next measurement trustworthy.

## 4. Step 3: Root Fixes And Specification

### 4.1 Step 3 objective

Turn the current Phase 7 state into a trustworthy decision point.

This means:

- keep the next measurement bounded
- eliminate known measurement-surface distortions
- preserve rollback simplicity
- avoid quietly drifting into Shape B before the evidence justifies it

### 4.2 Root fixes

| Fix area | Root fix | Why this fix exists | Type | Priority | Proof obligation |
|---|---|---|---|---|---|
| Measurement surface | always refresh `contractValidationSummary` after any successful repair before persistence | final stored summary must describe the final stored claim set, not a pre-repair state | code / observability | P0 | stored summary changes when repair changed the active claim set |
| Measurement surface | persist salience-stage outcome structurally for all paths: `ran`, `enabled`, `success`, `error?`, `anchors` | E2 measurement cannot distinguish skipped vs failed vs zero-anchor success today | code / schema | P0 | job record can distinguish all four cases |
| Measurement surface | persist validator quote-level proof (`preservedByQuotes`) alongside IDs | audit claims about anchor preservation need traceable proof, not only claim IDs | code / schema | P0 | stored record includes exact quoted preservation evidence when validator approved |
| Prompt governance | move `runContractRepair` prompt text out of inline TypeScript and into `claimboundary.prompt.md` as a dedicated prompt section | Stage 1 contract should live in one reviewable prompt system, not half in code | prompt / code hygiene | P1 | no inline repair prompt remains in `claim-extraction-stage.ts` |
| Prompt/runtime alignment | explicitly reconcile the validator prompt’s literal-anchor rule with runtime directness filtering | current prompt and runtime contracts are not perfectly aligned | prompt + code/spec | P1 | prompt text and runtime rule describe the same acceptance condition |
| Measurement protocol | the E2 report must split outcomes into raw Pass 2, post-retry, post-repair, and final accepted | final job success alone is too confounded | measurement spec | P0 | every measured run is attributable by stage |
| Metric wording | define negative-control precision precisely, including whether bare subject/action anchors are allowed | current precision language is still ambiguous | measurement spec | P0 | reviewer can classify every control run without interpretation drift |
| Type contract | narrow persisted salience anchor `type` to the same enum family as the generation schema | current schema/types split weakens compile-time trust | code / type contract | P2 | invalid categories cannot silently flow into downstream consumers |

### 4.3 Phase 7 specification after Step 3

#### What Phase 7 is testing

Phase 7 is **not** yet testing whether Shape B improves extraction.

Phase 7 on current HEAD is testing:

1. whether a dedicated salience stage can identify expected anchors with useful stability
2. whether the current extraction/validation/repair stack exposes those anchors in a measurable, reviewable way

#### What counts as success before Shape B

Before any Shape B promotion claim, the repo should be able to say all of the following:

- E2 results are measured on exact locked inputs and exact cohorts.
- The run record distinguishes raw extraction from retry/repair-mediated recovery.
- Salience-stage failures are visible in persisted data.
- Anchor-preservation approvals are auditable from persisted quotes, not only IDs.
- Negative-control precision can be scored mechanically.

#### What does **not** count as success

- a good final report produced only after retry/repair, without stage attribution
- a salience stage that finds anchors, but leaves no trustworthy audit trail
- a positive aggregate interpretation built on ambiguous precision definitions

### 4.4 Input-specific specification notes

| Input family | Specification note |
|---|---|
| `R2a` qualifier canary | remains the primary salience-preservation canary; success requires a thesis-direct claim that preserves the qualifier and a false-side family result |
| `R2b` chronology control | remains the paired control; success requires chronology-only handling with no invented normative/legal escalation |
| asylum `235 000` | stays in the broader quality program, but should not be treated as the decisive Phase 7 salience canary |
| Bolsonaro fair-trial family | important for overall product quality, but it is not the cleanest first discriminator for Phase 7 salience-first architecture |
| `Plastic recycling is pointless` | useful as a broad evaluative stress input, but not as a hard exact-input oracle for Phase 7 go/no-go |

### 4.5 Step 3 carry-forward

#### Proven

- The repo can already measure E2 as an anchor-recognition probe.
- The repo cannot treat audit-only E2 output as Shape B proof.
- The major contract-surface blockers identified in the first deep review were materially addressed in `61815f41`.

#### Inference

- A fully reproduced committed-build batch would still be the cleanest empirical closeout.
- It is nevertheless reasonable to begin Phase 7b now, because the architectural issues are sufficiently understood and the key pre-implementation blockers have already been removed.

## 5. Step 4: Implementation And Verification Plan

### 5.1 Implementation strategy

Implement in two bounded tracks.

- **Track 1: Phase 7b / Shape B implementation**
  This is now the recommended next engineering step.
- **Track 2: empirical closeout hygiene**
  This remains valuable, but it should not block Phase 7b implementation.

### 5.2 Completed hardening and cleanup

The following items are no longer planning items; they are completed in `61815f41`:

| Change | Files / scope | Why now | Rollback | Verification |
|---|---|---|---|---|
| Expand salience-stage status contract in code/types | `claim-extraction-stage.ts`; `types.ts` | establish a richer contract for success/failure state | revert `61815f41` | targeted unit/integration verification |
| Force post-repair contract revalidation before persistence | `claim-extraction-stage.ts` | prevent stale pre-repair summaries | revert `61815f41` | repair-path verification |
| Persist `preservedByQuotes` and add `stageAttribution` to the contract surface | `claim-extraction-stage.ts`; `types.ts` | add auditability and recovery attribution hooks | revert `61815f41` | JSON/result inspection |
| Move repair prompt into prompt system | `claimboundary.prompt.md`; `claim-extraction-stage.ts` | unify Stage 1 contract governance | revert `61815f41` | prompt-load verification |

### 5.3 Phase 7b implementation track

| Step | Scope | Output | Verification |
|---|---|---|---|
| Add explicit mode separation: `audit` vs `binding` | config / runtime wiring | Shape B has its own mode boundary, not just `enabled=true` | config test + disabled-path parity |
| Persist full salience status contract on every path | Stage 1 extraction + persistence contract | disabled, failed, success, and zero-anchor-success are distinguishable | targeted persistence tests |
| Preserve recovery attribution through final refresh | contract summary path | final summary still carries stage provenance | targeted repair/final-refresh tests |
| Add binding salience input to Pass 2 | Stage 1 extraction + prompt contract | Pass 2 receives E2 anchors explicitly | unit/integration tests on structured prompt payload |
| Require claim-to-anchor preservation mapping | Pass 2 output schema + prompt | each thesis-direct claim can point to preserved anchor(s) | schema tests + golden examples |
| Pivot validator from discovery to audit | contract validator prompt + evaluation path | validator checks preservation against pre-committed anchors | targeted validator tests |
| Resolve thesis-direct vs literal-substring precedence explicitly | validator prompt + evaluation logic | no ambiguity once anchor mapping is authoritative | focused validator tests |
| Tighten anchor typing end-to-end | schema + persisted type | binding anchor contract is typed, not loose-string | build/type tests |
| Run bounded verification set | focused canaries, not necessarily another full expensive corpus first | implementation sanity before broader validation | targeted scenario checks on R2a/R2b and one control |

### 5.4 Empirical closeout hygiene track

| Step | Why it still matters |
|---|---|
| rebuild a reproducible committed-build E2 packet when practical | lets later docs claim a statistically clean closeout |
| replace placeholder/non-local appendix evidence with real job IDs only | preserves review honesty |
| keep wording exact: “directionally supportive” vs “reproduced committed-build proof” | avoids overclaiming |

### 5.5 Verification checklist

Before or during Phase 7b implementation, all of the following should remain true:

1. A repaired claim set cannot persist with a stale pre-repair contract summary.
2. The salience stage has a structurally visible status on success, failure, and disabled paths.
3. Approved anchor preservation is auditable from persisted quotes.
4. The repair prompt is no longer hidden in inline TypeScript.
5. The negative-control precision rule is explicit enough that two reviewers would score the same run the same way.
6. Phase 7b ships behind a feature flag with a clear rollback path.
7. Audit-only mode and binding mode are distinguishable in config and persisted results.
8. Final contract summaries cannot silently lose recovery attribution.

### 5.6 Recommended execution order

1. Open Phase 7b / Shape B implementation behind a feature flag.
2. Make the slice-1 observability/mode-separation fixes part of the same first patch.
3. Verify binding-anchor behavior on focused canaries.
4. Keep the empirical closeout hygiene track separate from the engineering start signal.

### 5.7 Step 4 carry-forward

#### Proven

- The repo already has enough architecture knowledge to begin Shape B responsibly.
- The repo does not yet have a locally reproduced committed-build packet strong enough to justify “decisive empirical closeout” language.
- The fastest path forward is Shape B implementation behind a feature flag, not another discovery loop.

#### Inference

- A later reproduced batch would improve the paper trail.
- It is not necessary to delay Phase 7b solely to recover that paper trail.

## 6. Next Document

The next useful document should be the **Phase 7b / Shape B implementation charter**.
