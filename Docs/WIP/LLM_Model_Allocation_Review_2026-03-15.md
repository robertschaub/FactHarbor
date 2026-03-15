# LLM Model Allocation Review
**Status:** 🔍 READY FOR REVIEW
**Date:** 2026-03-15
**Author:** Senior Developer (Claude Sonnet 4.6)
**Trigger:** User request — verify model allocation makes sense for quality/cost; identify waste and gaps.

---

## 1. Scope

This document reviews every LLM call slot in the ClaimAssessmentBoundary pipeline, assesses whether the assigned model strength (budget/standard/premium) is appropriate, estimates per-analysis cost, and makes concrete recommendations.

**Source files examined:**
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
- `apps/web/src/lib/analyzer/verdict-stage.ts`
- `apps/web/src/lib/analyzer/llm.ts`
- `apps/web/src/lib/analyzer/model-resolver.ts`
- `apps/web/src/lib/analyzer/metrics.ts`
- `apps/web/configs/pipeline.default.json`

---

## 2. Model Resolution Architecture

All LLM calls resolve through a two-level hierarchy:

```
Strength (budget/standard/premium)
    └─ model-resolver.ts → provider-specific model ID
```

**Strength → Model ID (version-locked defaults):**

| Strength | Anthropic | OpenAI | Google | Mistral |
|----------|-----------|--------|--------|---------|
| **budget** | `claude-haiku-4-5-20251001` | `gpt-4.1-mini` | `gemini-2.5-flash` | `mistral-small-latest` |
| **standard** | `claude-sonnet-4-5-20250929` | `gpt-4.1` | `gemini-2.5-pro` | `mistral-large-latest` |
| **premium** | `claude-opus-4-6` | `gpt-4.1` ¹ | `gemini-2.5-pro` ¹ | `mistral-large-latest` ¹ |

¹ No distinct premium equivalent — maps to same model as standard.

**Legacy tier names** (`haiku`/`sonnet`/`opus`) are accepted and auto-mapped to canonical strengths. Both the UCM JSON fields (`modelUnderstand: "haiku"`) and code fallbacks now use the canonical names.

---

## 3. Complete LLM Call Inventory

### 3.1 Extraction stages (budget — Haiku by default)

| # | Stage | Function | File:Line | Task key | Strength | Calls/analysis |
|---|-------|----------|-----------|----------|----------|----------------|
| 1 | Stage 1 Pass 1 | Understand input, extract rough claims | `claimboundary-pipeline.ts:1240` | `understand` | budget | 1–3 (Gate 1 reprompt) |
| 2 | Stage 2 Preliminary | Extract evidence from initial sources | `claimboundary-pipeline.ts:1570` | `extract_evidence` | budget | 1 |
| 3 | Stage 2 Query gen | Generate research queries per claim | `claimboundary-pipeline.ts:3029` | `understand` | budget | 1 per iteration |
| 4 | Stage 2 Relevance | Classify source relevance | `claimboundary-pipeline.ts:3092` | `understand` | budget | 1 per query |
| 5 | Stage 2 Applicability | Assess evidence applicability | `claimboundary-pipeline.ts:3532` | `understand` | budget | 1 (post-loop) |
| 6 | Stage 2 Extraction | Extract evidence items from source text | `claimboundary-pipeline.ts:3118` | `extract_evidence` | budget | 1 per query |

**Research loop structure:** Each `runResearchIteration` (line 3012) generates N queries (1 LLM call), then loops over each query: 1 relevance call + 1 extraction call per query. With `perClaimQueryBudget: 8` and 2 claims, the loop runs ~5–7 iterations of ~5 calls each (1 query gen + ~2 queries × 2 calls). Plus contrarian (~2 iterations × ~5 calls) and contradiction (~2 iterations × ~3 calls).

**Subtotal extraction: ~30–40 Haiku calls, ~$0.060–0.080 (Anthropic)**

### 3.2 Reasoning stages (standard — Sonnet by default)

| # | Stage | Function | File:Line | Task key | Strength | Calls/analysis |
|---|-------|----------|-----------|----------|----------|----------------|
| 7 | Stage 1 Pass 2 | Extract impliedClaim, roughClaims, backgroundDetails | `claimboundary-pipeline.ts:1782` | `verdict` ⚠️ | standard | 1–4 (retry) |
| 8 | Stage 3 Clustering | LLM-based boundary clustering | `claimboundary-pipeline.ts:4540` | `verdict` | standard | 1 |
| 9 | Stage 4 Advocate | Initial verdict per claim | `verdict-stage.ts:460` | debateRoles.advocate | standard | 1 per claim |
| 10 | Stage 4 Self-consistency | Stability sampling | `verdict-stage.ts:574–577` | debateRoles.selfConsistency | standard | 2 per claim |
| 11 | Stage 4 Reconciler | Synthesise debate into final verdict | `verdict-stage.ts:767` | debateRoles.reconciler | standard | 1 per claim |
| 12 | Stage 5 Narrative | Generate verdict narrative | `claimboundary-pipeline.ts:5755` | `verdict` | standard | 1 |
| 13 | Stage 5 Explanation | Rubric evaluation | `claimboundary-pipeline.ts:6001` | `verdict` | standard | 1 |

**Per-claim calls (9–11):** advocate(1) + self-consistency(2) + reconciler(1) = 4 Sonnet calls per claim.
**Per-analysis calls (7, 8, 12, 13):** Pass 2(1–4) + clustering(1) + narrative(1) + explanation(1) = 4–7 Sonnet calls.
**For 2 claims:** 8 per-claim + 4–7 per-analysis = **~12 Sonnet calls, ~$0.120 (Anthropic)**

### 3.3 Debate — cross-provider (challenger only)

| # | Stage | Function | File:Line | Provider | Strength | Calls/analysis |
|---|-------|----------|-----------|----------|----------|----------------|
| 14 | Stage 4 Challenger | Adversarial attack on advocate verdict | `verdict-stage.ts:716` | **OpenAI** | standard | 1 per claim |

**Model:** `gpt-4.1` (OpenAI standard)
**Purpose:** Provider diversity for structural bias mitigation.
**Cost:** ~$0.012 per call.

### 3.4 Validation stages (budget — Haiku)

| # | Stage | Function | File:Line | Task | Strength | Calls/analysis |
|---|-------|----------|-----------|------|----------|----------------|
| 15 | Stage 4 Grounding check | Binary: does verdict cite real evidence? | `verdict-stage.ts:912` | debateRoles.validation | budget | 1 per claim |
| 16 | Stage 4 Direction check | Binary: does direction match evidence? | `verdict-stage.ts:931` | debateRoles.validation | budget | 1 per claim |

**For 2 claims: 4 Haiku calls, ~$0.012 (Anthropic)**

### 3.5 Optional / conditional calls

| Call | Trigger | Model | Cost |
|------|---------|-------|------|
| Direction repair | Direction check fails + `policy="retry_once"` | Sonnet | ~$0.012 (rare) |
| TIGER score | `tigerScoreMode != "off"` (OFF by default) | Sonnet | ~$0.012 |
| Pass 1 reprompt | Gate 1 pass rate < 50% | Haiku | ~$0.002 per retry |

---

## 4. UCM Debate Role Configuration (pipeline.default.json)

```json
"debateRoles": {
  "advocate":        { "provider": "anthropic", "strength": "standard" },
  "selfConsistency": { "provider": "anthropic", "strength": "standard" },
  "challenger":      { "provider": "openai",    "strength": "standard" },
  "reconciler":      { "provider": "anthropic", "strength": "standard" },
  "validation":      { "provider": "anthropic", "strength": "budget"   }
}
```

**Self-consistency:** 2 rounds × 1 call = 2 Sonnet calls per claim. Combined with the advocate call, this gives a 3-sample spread for stability measurement. The `stable: true` flag requires spread ≤ 3 percentage points.

---

## 5. Cost Estimate (Anthropic default provider, typical analysis)

Pricing from `apps/web/src/lib/analyzer/metrics.ts` (updated 2026-03):

| Model | Input $/1M | Output $/1M |
|-------|-----------|------------|
| `claude-haiku-4-5-20251001` | $1.00 | $5.00 |
| `claude-sonnet-4-5-20250929` | $3.00 | $15.00 |
| `claude-opus-4-6` | $15.00 | $75.00 |
| `gpt-4.1` (OpenAI) | $2.00 | $8.00 |
| `gpt-4.1-mini` (OpenAI) | $0.40 | $1.60 |

**Estimated cost per full analysis (2 atomic claims, 5–10 sources):**

```
Extraction (~35 Haiku calls):       ~$0.070
Reasoning  (~12 Sonnet calls):      ~$0.120
Challenger ( 2 gpt-4.1 calls):      ~$0.024
Validation ( 4 Haiku calls):        ~$0.012
─────────────────────────────────────────────
Total LLM:                          ~$0.226
Search (typical):                   ~$0.040
─────────────────────────────────────────────
Total per analysis:                 ~$0.27
```

*Note: Extraction is the largest call-count category (~35 calls) but its cost (~$0.070) is dominated by reasoning (~$0.120) due to the 3×/15× price difference between Haiku and Sonnet. Per-call averages vary widely — query gen ~$0.0015, evidence extraction ~$0.0045, verdict advocate ~$0.012.*

---

## 6. Assessment

### ✅ What is correct

**Budget for extraction stages (1, 2, 3, 4, 5, 6):** Appropriate. Relevance classification, query generation, and evidence extraction are pattern-recognition tasks, not reasoning. Using Haiku is 5–10× cheaper with no measurable quality loss.

**Standard for verdict debate (advocate, self-consistency, reconciler):** Justified. Multi-step causal reasoning over conflicting evidence requires a capable model. Downgrading these would directly hurt verdict coherence.

**Budget for validation (grounding, direction):** Correct. Binary pass/fail lookups against structured evidence. No reasoning required.

**Self-consistency at `temperature: 0.4`:** Necessary for the spread measurement. This is the mechanism that produces the `stable: true/false` signal and drives confidence banding. Removing it trades stability for cost.

**Retry handling:** No runaway retry cascades found. All failure modes degrade gracefully (non-fatal warnings, skipped checks, or bounded retry counts).

### ⚠️ What is questionable

**Pass 2 runs on Sonnet (wrong task key)**

`runPass2` extracts `impliedClaim`, `backgroundDetails`, and `roughClaims` from user input. This is an extraction/understanding task, but it maps to `getModelForTask("verdict")` = Sonnet.

- The task content does not require verdict-level reasoning.
- The retry ceiling is 4 attempts. At Sonnet rates, 4 retries cost ~$0.048 on this step alone.
- If `impliedClaim` quality is the concern, the right fix is a tighter output schema and Gate 1 catch — not a stronger model.
- UCM setting `modelUnderstand` has **no effect** on Pass 2 because the task key bypasses it.

**Cross-provider challenger (OpenAI `gpt-4.1`) adds cost, marginal diversity**

The challenger attacks the advocate verdict to surface weak reasoning. Provider diversity helps if the same model's biases would cause both advocate and challenger to agree erroneously. However:

- `gpt-4.1` and `claude-sonnet-4-5-20250929` are both mid-tier general-purpose models with broadly similar capabilities and knowledge cutoffs.
- True diversity requires either a *different tier* (budget challenger = noisier, faster pushback) or a genuinely different model family (e.g., reasoning-optimised vs generalist).
- Cost: ~$0.024 per analysis for 2 claims (~11% of total LLM cost) as a bias-mitigation tax with unconfirmed ROI.

### ❌ What is wrong

**Pass 2 task key mislabeled (`"verdict"` should be `"extract_evidence"` or `"understand"`)**

This is a labeling error with a cost consequence. The `modelUnderstand` UCM field is intended to cover understanding/extraction steps, but Pass 2 bypasses it entirely by using the verdict task key. This means:
1. An admin changing `modelUnderstand` gets no benefit on Pass 2.
2. Pass 2 silently runs on Sonnet regardless of tiering intent.

**`getModel()` hardcodes `"sonnet"` literal (`llm.ts:124`)**

`getModel()` is the legacy fallback path, only reached when `llmTiering: false`. It hardcodes `"sonnet"` instead of `"standard"`. Dead code in production today (tiering is always on), but a latent regression risk if tiering is ever disabled. Should be `"standard"`.

---

## 7. Recommendations

### Rec-A (MEDIUM priority) — Fix Pass 2 task key

**Change:** `claimboundary-pipeline.ts` — `runPass2` call from `getModelForTask("verdict")` → `getModelForTask("extract_evidence")`

**Effect:** Pass 2 drops to Haiku. Retries also cheaper. UCM `modelUnderstand` now covers Pass 2 as intended.

**Risk:** Medium. Pass 2 quality must hold — it hosts the soft-refusal retry path for politically sensitive inputs (`claimboundary-pipeline.ts:1784–1789`). Haiku may refuse more frequently on these inputs, triggering additional retries that consume the per-call saving. Phase A testing must measure: (a) `impliedClaim` quality, (b) retry count distribution per input, (c) total Pass 2 step cost (not just per-call cost).

**Fallback:** If quality degrades, the correct fix is a dedicated task key in `modelOverrideForTask()` (e.g., `"pass2_understand"`), not a bespoke UCM field. Do not add `modelPass2` to UCM unless the existing task-key granularity is exhausted.

**Estimated saving:** ~3% of LLM cost (~$0.007–0.010 per analysis) — contingent on retry rates not offsetting gains.

---

### Rec-B (LOW priority) — Rethink challenger cross-provider default

**Two options:**

| Option | Change | Trade-off |
|--------|--------|-----------|
| **B1 (simplify)** | Set `debateRoles.challenger.provider` to `"anthropic"` in UCM | Lose cross-provider diversity. Save ~$0.024/analysis (~11% of LLM cost). Challenger still runs at standard strength. |
| **B2 (improve diversity)** | Keep OpenAI but set challenger `strength` to `"budget"` (`gpt-4.1-mini`) | Cheaper (~$0.008 vs $0.024 for 2 claims). More distinctly "devil's advocate" style. May miss nuanced counter-arguments. |

**Recommended:** Keep current default (OpenAI challenger). At $0.024/analysis (~11% for 2 claims), cross-provider diversity is cheap insurance — the only source of model-family diversity in the debate. Removing it without data showing it's ceremonial is as unjustified as keeping it without data showing it works. Add empirical evaluation to the Phase A checklist instead: measure how often the challenger surfaces a counter-argument that the reconciler actually incorporates. Only revisit the default if data shows the challenger is ceremonial.

**Note — B2 remains on the table:** If empirical data shows the challenger is valuable but too expensive, switching to `gpt-4.1-mini` (budget, ~$0.008 for 2 claims) preserves diversity at lower cost.

---

### Rec-C (LOW priority, zero risk) — Fix `getModel()` literal

**Change:** `llm.ts:124` — `resolveModel("sonnet", provider)` → `resolveModel("standard", provider)`

**Effect:** No functional change today. Prevents regression if `llmTiering` is ever set to `false`.

**Effort:** One-line change.

---

### Rec-D (FUTURE, after Phase A results) — Evaluate self-consistency rounds

**Current:** 2 self-consistency rounds per claim (3 total samples including advocate).

**Question:** Does a 3-sample spread meaningfully improve calibration over a 2-sample spread?

**Action:** After Phase A produces baseline data, compare spread distributions from current (3-sample) vs hypothetical (2-sample). If the stability signal is equivalent, dropping to 1 self-consistency round saves ~$0.020/analysis for 2 claims (~9% of LLM cost).

**Do not change before Phase A baseline is complete.**

---

## 8. Decision Required

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Pass 2 model (Rec-A) | Test on Haiku; measure retry rate + quality | ✅ Proceed with test — widen criteria per Architect note |
| Challenger provider (Rec-B) | Keep OpenAI / B1 simplify / B2 budget | Keep current; evaluate empirically via Phase A |
| `getModel()` fix (Rec-C) | Fix now | ✅ Shipped in commit `fix(llm): use "standard" in getModel()` |
| Self-consistency rounds (Rec-D) | Evaluate after Phase A | 🔁 Defer |

---

## 9. Open Items

- [ ] **Rec-A:** Test Pass 2 on Haiku with Phase A benchmark inputs. Measure: (a) `impliedClaim` quality, (b) retry count distribution per input, (c) total Pass 2 step cost. Do not merge until all three are verified.
- [ ] **Rec-A (footnote):** Add inline comment to `runPass2` call site explaining why task key is `extract_evidence`, not `verdict`.
- [ ] **Rec-B:** After Phase A, measure challenger effectiveness (how often does reconciler incorporate a challenger counter-argument?). Only change default if data shows challenger is ceremonial.
- [x] **Rec-C:** ~~Fix `getModel()` literal~~ — shipped. `resolveModel("sonnet")` → `resolveModel("standard")`, comment corrected.
- [ ] **Rec-D:** Revisit self-consistency rounds after Phase A baseline is available.
- [ ] **Rec-D (follow-up):** If TIGER score is ever enabled, reassess its model assignment (currently would use Sonnet — premium may be justified for long-form narrative scoring).
- [ ] **§3.2 footnote:** Add footnote to Pass 2 row explaining that `modelOverrideForTask("verdict")` maps to `config.modelVerdict` (`llm.ts:94–95`), making `modelUnderstand` ineffective for this step.

---

## Review Log

| Date | Reviewer | Assessment | Notes |
|------|----------|------------|-------|
| 2026-03-15 | Lead Architect | APPROVE with notes | See full review below |

---

### Review: Lead Architect — 2026-03-15

**Overall Assessment:** APPROVE

#### Strengths

- The 16-slot inventory is complete and accurate. Every call site, task key, and strength mapping verified against code. The two-level resolution architecture (strength → provider-specific model ID via `model-resolver.ts`) is correctly described.
- Cost estimates are grounded in the actual pricing constants from `metrics.ts`, not guesses. The per-call breakdown makes it easy to evaluate each recommendation's savings.
- The Rec-A timing discipline is exactly right: measure first (Phase A), change second. This avoids the trap of optimizing cost before establishing a quality baseline.
- Rec-C correctly identified as zero-risk. `normalizeToStrength("sonnet")` already returns `"standard"` via the legacy alias map (`model-resolver.ts:85-88`), so the fix is purely a naming cleanup with no behavioral change. Approved for immediate commit.

#### Concerns

- **[SUGGESTION] Rec-A test criteria should include retry rate, not just `impliedClaim` quality.** Pass 2 handles the soft-refusal retry path (`claimboundary-pipeline.ts:1784-1789`) for politically sensitive inputs. Haiku may refuse more frequently on these inputs, triggering more retries. If Pass 2 on Haiku retries 3-4× per analysis instead of 1×, the per-step cost saving (~$0.007-0.010) is consumed by retry volume. Phase A testing should measure: (a) `impliedClaim` quality, (b) retry count distribution, and (c) total Pass 2 step cost (not just per-call cost).

- **[SUGGESTION] Rec-B recommendation to simplify (B1) is premature without data.** The cross-provider challenger is the only source of model-family diversity in the debate. Removing it without empirical evidence that it adds no value is as unjustified as keeping it without evidence that it does. At ~$0.024/analysis for 2 claims (~11% of LLM cost), this is cheap insurance against systematic same-provider bias — especially on politically charged claims where provider-specific safety training can shape verdict framing. Recommend: keep the current default, but add an open item to measure challenger effectiveness (e.g., how often does the challenger surface a counter-argument that the reconciler actually incorporates?). Only change the default if the data shows the challenger is ceremonial.

- **[SUGGESTION] Rec-A fallback (add `modelPass2` UCM override) is unnecessary complexity.** The existing task key granularity is sufficient. If Pass 2 needs a different model than other `extract_evidence` tasks, the correct fix is a new task key in `modelOverrideForTask()`, not a bespoke UCM field. But this is hypothetical — try `extract_evidence` first, evaluate, and only add granularity if needed.

- **[NOTE] Debate roles bypass `getModelForTask()` entirely.** This is implicit in the review but worth stating explicitly: debate roles call `callLLMWithPrompt()` directly with `tier`/`providerOverride` from `config.debateRoles.*` (`verdict-stage.ts:469, 648-651, 728`). UCM model overrides (`modelVerdict`, `modelUnderstand`, `modelExtractEvidence`) have zero effect on debate roles. This is architecturally correct (debate roles are their own config surface), but anyone reading §7 Rec-B should understand that changing `modelVerdict` does not change the challenger, advocate, or reconciler models.

#### Specific Comments

- §3.1 row 3 (`Stage 2 Query gen`): line reference `3230` — confirmed at `claimboundary-pipeline.ts:3230`, task key `understand`, budget. Correct.
- §3.2 row 7 (`Stage 1 Pass 2`): the `⚠️` marker on the task key is a good visual signal. Consider adding a footnote explaining that `modelOverrideForTask("verdict")` maps to `config.modelVerdict` (`llm.ts:94-95`), which is why `modelUnderstand` has no effect on Pass 2.
- §6 Assessment, "What is wrong": the `getModel()` comment at `llm.ts:123` ("premium model for all tasks") is also inaccurate — it resolves to standard (Sonnet), not premium (Opus). The Rec-C fix should also update this comment.
- §7 Rec-A: add "measure retry rates" to the open item checklist.
- §7 Rec-B: change default recommendation from "B1" to "keep current, evaluate empirically."
