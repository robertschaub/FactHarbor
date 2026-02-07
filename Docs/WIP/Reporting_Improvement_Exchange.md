# Reporting Improvement Exchange

**Date:** 2026-02-07  
**Purpose:** Working document for model strategy and reporting-quality stabilization.

## Current Operational Findings

1. Phase 1 evidence-quality controls are effective (opinion contamination control is stable).
2. Search-quality controls are implemented, but repeated-run report stability is still inconsistent on some recency-sensitive procedural claims.
3. Multi-context recall can collapse to one context in cases where evidence supports multiple legal/procedural contexts.
4. Dynamic pipeline tends to conservative/near-neutral outputs in disputed legal-process inputs.

## Model Strategy Recommendations

All recommendations remain generic and configuration-driven (UCM), with no domain-specific hardcoding.

1. **Use stronger UNDERSTAND model for context-critical inputs**
   - Keep fast model as default.
   - Escalate UNDERSTAND model only when complexity/risk signals are high (multi-entity legal/procedural structures, ambiguity, recency sensitivity).
   - Keep escalation criteria generic and auditable.

2. **Use stronger context-refinement pass before verdict**
   - If context count is low and evidence diversity is high, run one targeted refinement pass with stronger model.
   - Goal: improve context recall, not force extra contexts.

3. **Use tiered extraction**
   - First pass with cost-efficient extraction model.
   - Re-run extraction on only ambiguous/rejected-near-threshold results with stronger model, bounded by max calls.

4. **Keep verdict model strong, but gate with evidence quality checks**
   - Avoid inflating confidence from sparse evidence.
   - Preserve deterministic correction and low-probative filtering.

5. **Make all routing/tiering parameters UCM-editable**
   - Escalation thresholds
   - Max escalation calls
   - Mode (`off|auto|on`) for LLM relevance classification
   - Recency and confidence penalty controls

## Proposed Auto-Routing Policy (Generic)

1. `default`: cost-efficient models.
2. `auto-escalate`: stronger model when at least one of:
   - low context recall after understanding/refinement,
   - high ambiguity in relevance pre-filter outcomes,
   - recency-sensitive claim with sparse high-probative evidence.
3. `bounded`: enforce max escalations per job to cap cost/latency.

## Execution Plan (Next)

1. Stabilize context recall in orchestrated pipeline (generic context anchoring and refinement triggers).
2. Add/adjust UCM-exposed controls for auto-escalation and thresholds (no hardcoded parsing words).
3. Validate with repeated-run test set covering sensitive legal/procedural, scientific, and policy claims.
4. Compare orchestrated vs dynamic and close largest divergence drivers.
5. Re-baseline metrics and update `Generic Evidence Quality Enhancement Plan.md`.

## Decision Log

1. Prefer prompting + model-routing + UCM controls over domain-specific deterministic parsing rules.
2. Keep heuristic pre-filter in place, but allow controlled LLM relevance fallback in `auto` mode.
3. Do not mark plan complete until repeated-run variance and context recall targets are met.

---

## LLM Expert Analysis (2026-02-07)

**Author:** LLM Expert (Claude Opus)
**Scope:** Model selection audit, configuration gaps, concrete upgrade recommendations

### Finding 1: Tiering Is Disabled — Per-Task Config Is Dead Code

`pipeline.default.json:4` has `llmTiering: false`. This means `llm.ts:138` skips all per-task logic and calls `getModel()`, which returns `claude-sonnet-4-20250514` for every task.

**The `modelUnderstand` and `modelExtractEvidence` fields are ignored.**

Your auto-escalation strategy (Section "Proposed Auto-Routing Policy") cannot work until `llmTiering` is set to `true`. Currently there is no model differentiation between tasks at all.

**Action**: Set `llmTiering: true` to activate per-task routing. This is the prerequisite for everything else.

### Finding 2: Stale Model ID Would Break Tiering

`model-tiering.ts:56` defines the Anthropic budget tier as `claude-3-haiku-20240307`. This is the OLD Haiku (March 2024), not `claude-3-5-haiku-20241022`.

If tiering is enabled without fixing this, budget-tier tasks would route to a deprecated, weaker model.

**Action**: Update `model-tiering.ts:56` from `claude-3-haiku-20240307` to `claude-3-5-haiku-20241022` before enabling tiering.

### Finding 3: Two Competing Model Selection Systems

| System | File | Status |
|--------|------|--------|
| `llm.ts::getModelForTask()` | llm.ts:133 | **Authoritative** — used by orchestrated pipeline |
| `model-tiering.ts::getModelForTask()` | model-tiering.ts:159 | **Stale** — different defaults, not consistently used |

`llm.ts` is what actually runs. `model-tiering.ts` has useful type definitions and cost calculations but its model routing logic diverges. This creates confusion about "which models are configured."

**Action**: Consolidate. Either make `llm.ts` import from `model-tiering.ts`, or deprecate `model-tiering.ts` routing.

### Finding 4: Context Refinement Model Risk

`refineContextsFromEvidence()` in `orchestrated.ts:553` receives a `model` parameter. When tiering is enabled, this function may receive a budget-tier model (Haiku), but context refinement is reasoning-heavy (it decides which AnalysisContexts to create).

The tangential context problem (e.g., "US Government Response" when evaluating trial fairness) originates here. Using Haiku for this step would make it worse.

`llm.ts:70-71` maps `context_refinement` to the same model as `extract_evidence`:
```typescript
case "extract_evidence":
case "context_refinement":
  return config.modelExtractEvidence;
```

**Action**: Context refinement should use `modelVerdict` (premium/standard), not `modelExtractEvidence` (budget). Change `llm.ts:70-71` or add a separate `modelContextRefinement` config field.

### Finding 5: Verdict Model — The Biggest Quality Lever

Verdict generation is where model quality matters most. Currently using `claude-sonnet-4-20250514`.

**Recommendation**: Test `claude-opus-4-20250514` for verdict.

Rationale:
- Verdict weighs competing evidence, calibrates confidence, applies rating direction
- This is deep reasoning — exactly where Opus outperforms Sonnet
- Opus is called once per context, not per evidence item (cost is bounded)
- The verdict calibration table in the GPT prompt variant (see `providers/openai.ts`) compensates for GPT's weaker calibration — with Opus, such compensations may be unnecessary

Cost estimate for Anthropic:
- Verdict task: ~80K tokens per analysis
- Sonnet: $0.24 input + $1.20 output = ~$1.44 per verdict
- Opus: $1.20 input + $6.00 output = ~$7.20 per verdict
- BUT: everything else gets cheaper with tiering (Haiku for extract/understand)

**Concrete test**: Run the Bolsonaro trial case and the 5 standard promptfoo cases with both Sonnet and Opus verdicts. Compare calibration, confidence levels, and reasoning depth.

### Finding 6: OpenAI Tier Differentiation Missing

`model-tiering.ts:98-100` uses `gpt-4o` for BOTH standard AND premium tiers. There's no quality differentiation. Consider:
- Standard: `gpt-4o-mini` or `gpt-4.1-mini`
- Premium: `gpt-4o` or `gpt-4.1`

Also: newer models (`gpt-4.1`, `gpt-4.1-mini`) may be available and offer better performance.

### Finding 7: Google Model Updates Available

`model-tiering.ts:109-131` uses `gemini-1.5-flash/pro`. The Gemini 2.0 series (Flash, Pro) offers significant improvements in reasoning and structured output. Worth evaluating if Google is used as a provider.

### Summary: Recommended Configuration Changes

**Immediate (P0)**:
```
1. Fix model-tiering.ts:56 → claude-3-5-haiku-20241022
2. Set llmTiering: true in pipeline.default.json
3. Change llm.ts context_refinement mapping to use modelVerdict instead of modelExtractEvidence
```

**Short-term (P1)**:
```
4. Test claude-opus-4-20250514 for verdict task
5. Run promptfoo baseline comparison before/after
6. Update OpenAI/Google model IDs to latest versions
```

**Medium-term (P2)**:
```
7. Consolidate model-tiering.ts and llm.ts model selection
8. Add per-task temperature configuration to UCM
9. Consider cross-provider routing support (allow modelVerdict from different provider than llmProvider)
```

### Response to Senior Developer Proposals

Re: **"Use stronger UNDERSTAND model for context-critical inputs"** — Agreed. But note that the escalation trigger needs the baseline to be Haiku first (requires tiering=true). Currently everything is already Sonnet, so there's nothing to escalate from.

Re: **"Use stronger context-refinement pass before verdict"** — Strongly agree. See Finding 4. The simplest fix: change context_refinement to use the verdict model instead of the extract model in `llm.ts`.

Re: **"Use tiered extraction"** — Agreed. The two-pass approach (Haiku first, Sonnet for ambiguous) is sound. Current infrastructure supports this via the gap research continuation loop already implemented.

Re: **"Make all routing/tiering parameters UCM-editable"** — Already partially in place. The `modelUnderstand`, `modelExtractEvidence`, `modelVerdict` fields exist in the schema. Just need tiering enabled to activate them.

---

### Questions for Senior Developer

1. Which `getModelForTask` does `refineContextsFromEvidence()` actually call — the one from `llm.ts` or `model-tiering.ts`? Can you trace the `model` parameter?

2. Have you observed cases where verdict confidence is miscalibrated (too high/too low) that might benefit from a stronger reasoning model?

3. Are you ready to enable `llmTiering: true` as a default, or do you want to keep it experimental?

4. The auto-escalation policy you proposed — does the infrastructure for detecting "low context recall" and "high ambiguity" exist already, or does it need to be built?

---

### Senior Developer Responses

_(Edit below this line)_
