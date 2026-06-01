---
roles: [Lead Architect]
topics: [rec_a, pass2, model_tiering, ab_test, evidence_drift, claim_decomposition]
status: DESIGN ONLY — not run. Inputs + go/no-go are the Captain's.
files_referenced:
  - apps/web/src/lib/analyzer/claim-extraction-stage.ts (runPass2 :2513, model seam :2583, Pass2 schema :54-56)
  - apps/web/src/lib/analyzer/model-tiering.ts (getModelForTask :159, tier mapping :141)
---

# Output-Level A/B Test Design — Rec-A (Pass-2 Haiku vs Sonnet)

**Date:** 2026-06-01 · **Author role:** Lead Architect · **Status:** DESIGN ONLY.

## 0. The question this settles (and the one it deliberately won't)

**Settles:** Does running Pass-2 (claim decomposition) on **Haiku** (current, Rec-A) instead of **Sonnet** (pre-Rec-A) **degrade Pass-2's own output** — the `impliedClaim` / `roughClaims` / `backgroundDetails` extraction and its contract-anchor faithfulness? This is the *only* thing Rec-A changed, so it is the only thing a revert decision should turn on.

**Deliberately does NOT settle:** end-to-end verdict quality. Per this session's central finding, same-input verdicts are **evidence-pool-drift-dominated** (Jaccard 0.10–0.29; bolsonaro-en swings UNVERIFIED 44 ↔ LEANING-TRUE 71 on *identical* code). A verdict-level A/B would hand back a confident number that is mostly measuring drift, not the model. **A naive "run it twice, compare verdicts" test is worse than no test** — it manufactures false certainty. This design measures Pass-2's output before any research/verdict stage runs.

## 1. Why this can be a clean single-variable test

`runPass2()` is **exported** (`claim-extraction-stage.ts:2513`) and selects its model at `:2583`:

```ts
const model = getModelForTask(modelTaskOverride ?? "extract_evidence", undefined, pipelineConfig);
```

So the model is swappable via the **existing `modelTaskOverride` parameter** — **no code change, no prompt change, no config edit**:

- **Arm H (Haiku — current/Rec-A):** call `runPass2(...)` with `modelTaskOverride` left default → `extract_evidence` → `budget` tier → Haiku.
- **Arm S (Sonnet — pre-Rec-A):** call `runPass2(...)` with `modelTaskOverride: "verdict"` → `premium` tier → Sonnet-4-5. This is the **literal** pre-Rec-A behaviour (Rec-A's diff flipped exactly this key from `"verdict"` to `"extract_evidence"`).

Because we call `runPass2()` directly — not the pipeline — **no Stage-2 research, no web search, no verdict stage runs. There is no evidence pool to drift.** The drift trap is structurally excluded, not statistically averaged away.

## 2. Controls (the difference between a clean test and another confound)

1. **Freeze Pass-2's inputs across arms.** `runPass2` takes `preliminaryEvidence`, `inferredGeography`, `detectedLanguage`. These come from Pass-1 + a preliminary web search — both of which would re-introduce variance. **Run Pass-1 once per input and snapshot its output (and any preliminary evidence) to disk; feed the identical frozen snapshot to both arms and every repetition.** The only thing that varies between Arm H and Arm S is the Pass-2 model.
2. **Pin temperature.** `temperature: 0` for Pass-2 in both arms (set via `pipelineConfig`). Removes intentional sampling jitter so residual within-arm variance is the model's own nondeterminism.
3. **Disable / segregate the C6 contract-retry escalation.** `runPass2`'s contract-failure retry escalates Haiku → Sonnet (`context_refinement`) — that would smuggle Sonnet into Arm H. For the test, **pin the model for the whole call** (no mid-call escalation) so each arm uses only its assigned model; record separately whether a run *would have* escalated (a quality signal in its own right).
4. **Hold everything else identical** — same `currentDate` string (passed in, not `Date.now()`), same prompt section (unchanged), same `pipelineConfig` except the model knob, same input set in the same order.
5. **Use current model versions.** This answers the real question — *should we revert now?* — not "what would Mar-15 Sonnet have done."

## 3. Repetition & noise band (the core methodological fix)

A single run per arm is not interpretable. For each input × each arm, run **N = 5 repetitions at temp 0**.

- **Within-arm noise:** measure how much the N reps of the *same* arm disagree (e.g. Jaccard over `roughClaims` statement sets; variance of judge scores). This is the noise floor.
- **Between-arm signal:** the Arm-S − Arm-H difference **only counts if it exceeds the within-arm noise band.** This is the direct analogue of, and remedy for, the verdict-drift problem — applied at the layer where drift is absent and the floor should be low.

If within-arm noise is itself high at temp 0, that is a finding (Pass-2 is model-nondeterministic) and must be reported, not hidden.

**Resolving power (don't let "within noise band" do unexamined work).** N=5 with a noise-band gate is a screen, not a powered trial: it can reliably surface only **gross, consistent** between-arm differences (e.g. a soft-refusal regression, or a quality gap several × the within-arm spread). It cannot resolve small per-claim quality deltas — and that is acceptable, because a *small* Pass-2 difference is not a reason to pay the revert cost anyway (§6). State the minimum resolvable effect alongside results; if a real but sub-screen difference is suspected and matters, raise N rather than over-reading N=5.

## 4. Metrics

### 4a. Deterministic (computed mechanically per output — no judge)
*(This is measurement tooling, not the report pipeline, so deterministic detectors are permitted here.)*

| Metric | Why it matters | How |
|---|---|---|
| **First-pass soft-refusal rate** | THE documented Rec-A benefit — Sonnet soft-refuses on politically-sensitive input, Haiku does not. Decisive. | Detect degenerate/empty `impliedClaim`+`roughClaims` (the schema `.catch("")` masks refusals) on the *first* attempt, before runPass2's built-in fact-checking-framing retry fires. |
| **Retry/escalation incidence** | A model that only recovers via retry costs more and is less reliable. | Count first-pass failures that needed the framing retry; count runs that would have hit C6 escalation. |
| **Contract-anchor preservation** | The report_damaged driver — does Pass-2 keep truth-condition modifiers (e.g. legal-finality qualifiers)? | Run the existing contract-validation step on each Pass-2 output; record `preservesContract`. |
| **Schema validity / malformed rate** | Robustness. | Did the raw output parse pre-`.catch()` defaults? |
| **Language correctness** | The Fix 0-A drift concern. | `detectedLanguage` == input language; `roughClaims`/`impliedClaim` in the input language (generic language-id, not keyword lists). |
| **Structure** | Descriptive. | Count of `roughClaims`; non-empty `impliedClaim` / `backgroundDetails`. |
| **Latency + token cost per call** | The other side of the trade (Rec-A's ~3% saving + speed). | From `recordLLMCall` telemetry. |

A **soft-refusal regression in Arm S is on its own disqualifying for a revert** — it re-introduces a known bug regardless of decomposition scores.

### 4b. Blind LLM-judge rubric (for decomposition quality, which isn't deterministic)
- **Judge:** a strong model from a **different family** than the arms (e.g. GPT-class) to avoid same-family self-preference; temp 0.
- **Blinding:** judge sees only `(input, Pass-2 output)`; arm identity stripped; outputs shuffled.
- **Rubric (fixed, generic — no test-case vocabulary):** *faithfulness* (captures the input's actual claim without distortion), *completeness* (no dropped check-worthy claim), *atomicity* (rough claims appropriately decomposed, not conflated/over-split), *no-hallucination* (no invented claims/entities), *modifier preservation* (truth-condition qualifiers kept), and **_search-hint quality_** (see below).
- **Why search-hint quality is non-optional.** `roughClaims[].searchHint` (schema `:56`) is the **one channel by which a worse Pass-2 model could leak into the very drift this test structurally excludes**: hints shape what gets searched → the evidence pool → the verdict. A model that decomposes claims fine but writes worse hints would *pass* a faithfulness/atomicity rubric and still hurt downstream. So the judge scores, per claim: does the `searchHint` target retrievable, on-topic, discriminating evidence for that claim (generic; no benchmark vocabulary)? (This is the closest the design comes to the downstream pipeline — included precisely because omitting it would read as "covered" when it isn't.)
- **Stability:** judge each output K=3× (or 2–3 distinct judges); report inter-judge agreement; a quality gap inside judge-noise doesn't count.
- **Plus a pairwise forced-choice:** show the judge **both arms' outputs for the same input, side by side, blind, order counterbalanced** (A/B and B/A), "which decomposition is better + margin." Pairwise is usually more reliable than absolute scoring; position bias controlled by counterbalancing.

## 5. Inputs — REQUIREMENTS (Captain provides; I will not fabricate them)

Per standing rule (never invent verification inputs), I specify the requirements and ask you to supply/approve the set:

- **Diversity axes that matter here:** language (≥ DE / EN / PT — multilingual robustness); **sensitivity** (must include politically-sensitive items — the soft-refusal axis is where Rec-A's benefit lives); claim structure (single- vs multi-claim; with/without truth-condition modifiers like legal-finality); input type (text and URL).
- **Count:** ~15–25 inputs for a usable signal at N=5 reps.
- **Pre-register the set before running** (no cherry-picking after seeing results).
- **Suggested starting point for continuity:** reuse Rec-A's own 4 validation claims (Bolsonaro PT, Iran EN, Plastik DE, Muslime DE) and expand from there — **but the expansion is yours to provide/approve.**

## 6. Pre-registered decision rule (commit before running)

> **Bias disclosure — read before adopting these thresholds.** This rule is **deliberately status-quo-favoring**: "keep Haiku" fires on *any* condition, "reconsider Sonnet" requires *all*. The justification is real (status quo + the documented soft-refusal benefit + the cost saving), but the rule was authored by someone who already recommended *don't revert*, in a session where the author's own hypotheses have been refuted four times. A test whose acceptance line is drawn by the holder of the prior is how confirmation bias launders itself into a number. **Therefore the thresholds below are a proposed default only — they must be Captain-set or Captain-approved BEFORE the test runs, and cannot be (re)set after results are seen.** The blind cross-family judge protects the *scoring*; this protects the *decision*.

- **Keep Haiku (revert NOT warranted)** if *any* of: Arm S shows ≥ Arm H first-pass soft-refusal rate; OR the decomposition-quality margin (S − H, judge + pairwise) is **within the measured within-arm noise band**; OR Arm S regresses on contract-preservation/language beyond noise.
- **Reconsider Sonnet (revert worth costing)** only if **all** hold: a decomposition-quality win for S **beyond** the noise band, **replicated across the multilingual + sensitive inputs** (not one outlier); **no** soft-refusal regression; and the win is large enough to justify the ~3% cost + added latency.
- **A single-input or within-noise difference never justifies a revert** (the bolsonaro lesson, applied up front).

## 7. Harness sketch (reproducible; ~1 script)

`scripts/diag/pass2-model-ab.cjs` (or a gated test), two phases so judging is separable from generation:

1. **Generate** — for each pre-registered input: run Pass-1 once → snapshot `{pass1, frozenPreliminaryEvidence, geography, language}`; then for arm ∈ {H, S} × rep ∈ 1..N: call `runPass2(input, frozenEvidence, pipelineConfig{temp0, model-pinned}, currentDate, stateStub, /*modelTaskOverride*/ arm==='S' ? 'verdict' : undefined, geography, language, …)`; persist every raw output + telemetry to JSONL (model used, tokens, latency, attempt count).
2. **Score** — deterministic metrics over the JSONL; then a separate blind-judge pass over anonymized/shuffled outputs (absolute rubric + counterbalanced pairwise).
3. **Aggregate** — per-arm distributions, within-arm noise, between-arm margins vs noise, and the §6 verdict. Raw JSONL kept for inspection/repro.

## 8. Cost (rough)

Pass-2-only, no research/verdict, no fetch. With 20 inputs × 2 arms × 5 reps = **200 Pass-2 calls** (Arm H Haiku ≈ negligible; Arm S Sonnet ≈ the bulk) + **~200–600 judge calls** (strong cross-family model). Order **single-digit to low-tens of dollars** — far below a full-pipeline A/B (which would also be invalid). Exact figure depends on the final input count and judge K; I'll cost it precisely once the input set is fixed.

## 8b. Recommended staging (spend control)

Run it in two stages and stop early if the cheap half already answers it:
1. **Stage 1 — deterministic only (cheap):** generation + the §4a metrics. The **soft-refusal rate is both deterministic and the single strongest reason** in the keep/revert decision; if Arm S shows a soft-refusal or contract-preservation regression here, §6 already says "keep Haiku" and the judge tier is unnecessary.
2. **Stage 2 — blind judge (commission only if needed):** run §4b only if Stage 1 is clean for both arms and the decision genuinely turns on *decomposition quality* as the tiebreaker. This is where most of the spend (and all of the judge-variance) lives, so don't pay for it unless it's the actual question.

## 9. Threats to validity (stated, not hidden)

- **Judge variance / self-preference** → cross-family judge, K-fold, pairwise + counterbalancing, report agreement.
- **Frozen-evidence representativeness** → the snapshot is one realization; we're testing decomposition *given* identical input, which is the point, but note Pass-2's behaviour on *other* evidence isn't covered.
- **Scope** → measures Pass-2's job only; a decomposition result does **not** transfer to a verdict-quality claim either way.
- **Model drift over time** → uses today's Haiku/Sonnet; re-run if either model version changes.
- **No prompt changes** (AGENTS §Analysis Prompt Rules); the EXTRACT/PASS2 prompt section is byte-identical across arms.

## 10. What I need from you to run it
1. The pre-registered input set (or "reuse Rec-A's 4 + these N more").
2. Go/no-go on spend (≈ single-digit–low-tens of $).
3. Judge-model choice (default: a strong cross-family model).
Until then this is design only — nothing executed, no inputs fabricated.
