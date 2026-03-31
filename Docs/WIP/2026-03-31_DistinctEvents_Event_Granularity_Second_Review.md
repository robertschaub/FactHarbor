# DistinctEvents Event-Granularity — Independent Second Review

**Date:** 2026-03-31
**Role:** Lead Architect / Code Reviewer (Second Review)
**Agent:** Claude Code (Opus 4.6)
**Status:** REVIEW-COMPLETE
**Reviewed documents:** Architect Review, Family Effects Memo, Agent Outputs, Report Quality Evolution Deep Analysis (Mar 30), Consolidated Plan (Mar 7), Quality Analysis (Mar 8), Baseline Results Phase 1 (Mar 12), Quality Criteria Scorecard (Mar 12), Current Status, Backlog, AGENTS.md
**Inspected code:** `claimboundary.prompt.md` (lines 200-498), `claim-extraction-stage.ts`, `research-query-stage.ts`, `research-orchestrator.ts`, `types.ts`

---

## 1. Executive Summary

The prompt-only `distinctEvents` fix is confirmed. The diagnosis is correct, the refined standard is sound, and prompt-only is the appropriate first step. The prior Architect Review and Family Effects Memo were thorough and reached the right conclusion.

This second review identifies two minor refinements needed before implementation:
1. **Validation gate gap:** wind-still.ch URL/article control must be added — it is the highest-risk regression vector not currently in the Architect Review's gate.
2. **Lifecycle exception wording:** The proposed prompt text is too narrow — it conditions lifecycle preservation on "compliance, fairness, or correctness" when it should apply to any single-process chronology.

Neither refinement changes the fix path or direction. Both are wording adjustments to the proposed prompt text and validation plan.

---

## 2. What the Current Jobs Prove

### The evidence chain is robust

Three independent evidence streams converge on the same conclusion:

| Stream | What it shows | Source |
|--------|--------------|--------|
| **Anchor jobs** (791073, 34149a, 0d21e4) | All extract STF lifecycle milestones as `distinctEvents`; TSE is absent in every case | Family Effects Memo §3.1 |
| **Comparators** (696d81, 14d7fb) | Single-proceeding inputs correctly produce lifecycle phases — the extraction LLM CAN do lifecycle when it's appropriate | Architect Review §2 |
| **Historical trail** | This exact issue was first identified on 2026-03-07 (Consolidated Plan §1: "narrowed too early into an STF-heavy research path") and 2026-03-12 (Phase A Fix 0 jurisdiction rules). Phase A improved jurisdiction filtering but did not address the granularity problem. | Consolidated Plan, Agent Outputs (Mar 12-15) |

### The downstream wiring proves this is purely an extraction problem

I verified in code that the downstream machinery is correct:

1. **`GENERATE_QUERIES` prompt** (claimboundary.prompt.md:490-498): The multi-event coverage rule already instructs the query LLM to distribute across `distinctEvents` — "you MUST distribute query coverage across those events rather than collapsing onto only the most prominent one."

2. **MT-3 coverage guard** (research-orchestrator.ts:1037-1040): `allClaimsSufficient()` already requires `Math.max(minMainIterations, distinctEventCount - 1)` iterations when multiple events exist, ensuring each event cluster gets research coverage opportunity.

3. **`generateResearchQueries()`** (research-query-stage.ts:44-64): Already accepts `distinctEvents` as a parameter and passes it to the prompt template.

All three mechanisms are live and working. If `distinctEvents` contained `[STF coup trial, TSE electoral proceeding]` instead of `[STF First Panel trial, appellate proceedings]`, Stage 2 would already research both institutions. The gap is purely at the extraction boundary.

### The root cause in the current prompt is specific and identifiable

Line 207 of `claimboundary.prompt.md` currently reads:
> "Temporal episodes of the same phenomenon (e.g., '2022 trial' and '2024 appeal')."

This is an **active instruction to produce milestones**. The example pattern (`"2022 trial"` and `"2024 appeal"`) is structurally identical to what the anchor jobs produce (STF trial phases). The LLM is doing exactly what the prompt tells it to do. Removing this misguidance is a necessary first step regardless of any other fix.

---

## 3. Assessment of the Refined Standard

### The discriminator: "different evidence sources or institutional authorities"

The Architect Review refined "independently researchable" to "requiring different evidence sources or institutional authorities." I stress-tested this standard against all control families:

| Family | Events | Same evidence body? | Standard says | Correct? |
|--------|--------|---------------------|---------------|:---:|
| Bolsonaro STF trial → appeal (milestone) | STF phases | Yes — same court, same case file, same parties, same legal experts | Merge (single event) | ✅ |
| Bolsonaro STF vs TSE (peer) | Different courts | No — different courts, different charges, different legal frameworks | Separate events | ✅ |
| wind-still.ch episodes (Windatlas, Liesberg, Schleifenberg, Chrischona, ETH) | Different agencies/regions | No — different cantonal decisions, different research bodies | Separate events | ✅ |
| Boeing NTSB vs FAA vs Congress | Different bodies | No — investigation vs regulation vs oversight | Separate events | ✅ |
| SRG/SRF compound | No events | N/A | No change | ✅ |
| Homeopathy | No events | N/A | No change | ✅ |

**The standard passes all test cases.** The key insight is correct: two milestones of one proceeding share the same institutional evidence pool, while peer proceedings draw from fundamentally different evidence domains.

### One ambiguity remains manageable

"Different evidence sources" could theoretically be read as "different URLs" (too narrow) or "different institutional domains" (correct intent). In practice, an LLM reading the full granularity rule in context — especially the "Do NOT fragment one proceeding into lifecycle milestones when peer-level proceedings exist" clause — will interpret this correctly. The surrounding context disambiguates. No wording change needed for this.

### The standard is multilingual-safe

The discriminator is structural (institutional vs. same-institution evidence bodies), not language-dependent. It works equally well for Portuguese STF/TSE, German Windatlas/cantonal decisions, and English NTSB/FAA. The Architect Review's suggestion to avoid the English-heavy phrase "peer event clusters" in the actual prompt text is correct — the proposed prompt uses descriptive language ("different evidence sources or institutional authorities") which translates the concept without jargon.

---

## 4. Cross-Family Effects

### 4.1 Positive effects — high confidence

| Family | Expected effect | Mechanism | Confidence |
|--------|----------------|-----------|:---:|
| **Bolsonaro "various/all" EN** (791073, 34149a, 0d21e4) | Strong positive — restores TSE research branch | `distinctEvents` shifts from STF milestones to STF+TSE peers; Stage 2 opens TSE query branch | HIGH |
| **Bolsonaro "various/all" PT** | Strong positive — same mechanism | Same architectural fix applies in Portuguese | HIGH |
| **Non-political multi-event** (Boeing-class) | Likely positive — enables peer-institution separation | NTSB/FAA/Congress correctly separated instead of investigation-milestone-heavy | MEDIUM (no anchor job) |

### 4.2 Neutral effects — should be inert

| Family | Why inert | Monitor for |
|--------|-----------|-------------|
| **SRG/SRF** (11c529, 9e4d37) | `distinctEvents` currently empty; fix does not encourage event invention | Spurious event hallucination |
| **Homeopathy** (83cec3) | `distinctEvents` currently empty; evaluative input | Event hallucination |
| **Plastik** (all languages) | `distinctEvents` currently empty; evaluative input | Event hallucination |
| **Flat Earth / Round Earth / Sky** | Controls; `distinctEvents` empty | Nothing |

### 4.3 Negative effects — risk assessment

| Risk | Family | Severity | Likelihood | Mitigation |
|------|--------|----------|:---:|-----------|
| **R1: Over-collapsing lifecycle** | Single-proceeding Bolsonaro (696d81, 14d7fb) | HIGH impact if it occurs | MEDIUM | Conditional prompt design. But see §5 wording concern below. |
| **R2: Article episode flattening** | wind-still.ch (a2b7e76c) | MEDIUM impact — would reduce coverage diversity | LOW | Episodes pass the "different evidence sources" test — they ARE independent events | 
| **R3: Event hallucination on non-event inputs** | SRG, Homeopathy, Plastik | MEDIUM impact — would introduce fragmentation | LOW | Existing scope rules (lines 204-216) limit distinctEvents to jurisdiction-relevant proceedings |
| **R4: Sparse-evidence amplification** | Any family with few sources | LOW impact — fix changes extraction, not sufficiency | LOW | D5 and diversity-aware sufficiency gates are unchanged |

**R1 is the dominant risk** and the one most likely to cause visible regression. The proposed prompt must make the lifecycle exception unambiguous enough that a single-proceeding input like "Was the STF trial procedurally correct?" still produces lifecycle phases (charges, hearing, verdict, appeal).

**R2 is the most underestimated risk.** wind-still.ch is excluded from the Architect Review's validation gate but included in the Family Effects Memo's gate. This is a gap — see §7.

---

## 5. Risks / Cautions

### Caution 1: Lifecycle exception is too narrowly worded (REQUIRES ADJUSTMENT)

The proposed prompt text (Architect Review §6) reads:
> "Temporal phases of a single process ONLY when the input asks about the compliance, fairness, or correctness of that specific process."

This is too narrow. Valid single-process chronology inputs include:
- "What happened in the Boeing 737 MAX certification process?" (not about compliance/fairness)
- "Describe the investigation into Flight MH370" (chronological, not evaluative)
- "How did the Swiss energy transition unfold?" (process chronology)

**Fix:** Replace "ONLY when the input asks about the compliance, fairness, or correctness of that specific process" with "ONLY when the input focuses on the chronology, lifecycle, or internal progression of one specific process." This is broader and correctly covers all single-process inputs, not just evaluative ones.

### Caution 2: Legal-centric language in the "Include" rules

The proposed text says "Multiple proceedings or trials by different institutions or in different legal domains within the jurisdiction." The phrase "legal domains" is too narrow — Boeing NTSB/FAA/Congress are not "legal domains." Use "by different bodies or in different domains" to cover regulatory, investigative, and legislative proceedings equally.

### Caution 3: Prompt-only reliability is an open question

LLMs don't always follow instructions perfectly. The Phase A contamination work (March 12-15) showed that prompt guidance CAN work for `distinctEvents` — Fix 0 successfully improved jurisdiction filtering. But the current prompt already has strong jurisdiction rules (lines 209-217) and the LLM sometimes still pulls in irrelevant events. 

Prompt-only is still the correct first step because:
1. The current line 207 actively encourages the wrong behavior — removing this misguidance is necessary regardless
2. Adding a repair step before knowing if the prompt fix works is premature complexity
3. The validation gate will measure prompt-only effectiveness with concrete pass/fail criteria
4. If prompt-only fails on ≥3 runs, the repair step is a documented, ready-to-implement fallback

### Caution 4: Do not over-optimize for boundary count

The fix aims to restore a missing research branch (TSE), not to maximize the number of boundaries. Success is measured by institutional diversity in the evidence pool and stage-2 query distribution, not by raw boundary count. A run with 4 institution-specific boundaries is better than a run with 8 generic boundaries.

---

## 6. Recommended Path

### Confirm: Prompt-only `distinctEvents` fix as first step

The Architect Review's proposed prompt change at `claimboundary.prompt.md:202-207` is the right fix target. Apply these wording adjustments to the proposed text:

**Adjusted proposed text:**

```
**Include:**
- Events, proceedings, rulings, or episodes that are WITHIN the claim's jurisdiction and directly relevant to the claim's substance.
- Multiple proceedings or decisions by different bodies or in different domains within the jurisdiction.
- Temporal phases of a single process ONLY when the input focuses on the chronology, lifecycle, or internal progression of one specific process. In that case, phases (charges, hearing, verdict, appeal) are valid events because each phase involves different procedural evidence.

**Granularity rule:** When the input describes or implies multiple parallel proceedings, investigations, or decisions by different bodies, represent each top-level proceeding as a separate event. Do NOT fragment one proceeding into lifecycle milestones when peer-level proceedings exist — those milestones would be researched within the parent proceeding's evidence anyway. Prefer the smallest set of events where each event requires different evidence sources or institutional authorities to research.
```

Changes from Architect Review's proposed text:
1. "different institutions or in different legal domains" → "different bodies or in different domains" (generic, not legal-centric)
2. "ONLY when the input asks about the compliance, fairness, or correctness" → "ONLY when the input focuses on the chronology, lifecycle, or internal progression" (broader lifecycle exception)
3. Granularity rule: unchanged (already well-formulated)

### Confirm: Defer LLM repair step

Only add the narrow LLM validation/repair pass if prompt-only fails to produce stable peer-event extraction on ≥3 anchor runs. The repair step is a documented fallback, not an immediate requirement.

### What should NOT be changed now

- Stage 2 wiring (`GENERATE_QUERIES` multi-event coverage rule, `generateResearchQueries()` parameter passing)
- MT-3 coverage guard in `allClaimsSufficient()`
- Evidence filter, D5, or diversity-aware sufficiency logic
- AtomicClaims decomposition rules (Plurality override, dimension independence, facet convergence)
- Verdict debate or aggregation logic
- The Exclude rules (lines 209-216) — these are working correctly for jurisdiction filtering

---

## 7. Validation Gate

### Gap in Architect Review's gate: wind-still.ch missing

The Architect Review proposes 3 positive + 4 guardrail runs. The Family Effects Memo proposes 5 positive + 4+ guardrail runs. Both are reasonable, but the Architect Review's gate omits the wind-still.ch URL/article control.

**This is a gap.** wind-still.ch (`a2b7e76c`) is the highest-risk regression vector for R2 (article episode flattening). It currently extracts 5 genuinely independent episodes. If the prompt fix accidentally collapses these, the article would lose coverage diversity. This family MUST be in the validation gate.

### Recommended gate (adjusted)

**Positive set (must improve or hold) — 3 runs:**

| # | Input | Anchor | Success criterion |
|---|-------|--------|-------------------|
| 1 | Bolsonaro EN "various" | `791073` | `distinctEvents` contains ≥2 top-level peer proceedings (STF + TSE or equivalent), not just STF milestones |
| 2 | Bolsonaro EN "all" | `0d21e4` | Same — peer proceedings, not lifecycle phases |
| 3 | Bolsonaro EN proceedings statement | `34149a` | Same |

**Guardrails (must not regress) — 5 runs:**

| # | Input | Anchor | Success criterion |
|---|-------|--------|-------------------|
| 4 | Bolsonaro single-proceeding EN | `14d7fb` | Lifecycle phases preserved (charges, hearing, verdict, appeal still present) |
| 5 | Bolsonaro single-proceeding PT | `696d81` | Same — multilingual lifecycle preservation |
| 6 | **wind-still.ch URL** | `a2b7e76c` | **Episodes preserved as distinct events** — Windatlas, wind park decisions, ETH study must NOT be collapsed |
| 7 | SRG/SRF compound | `11c529` | `distinctEvents` remains empty — no spurious events |
| 8 | Homeopathy / Plastik evaluative | `83cec3` | `distinctEvents` remains empty |

**Total: 8 runs** (3 positive + 5 guardrail). This is 1 more than the Architect Review's gate but adds the critical URL/article control.

### Per-run inspection checklist

- `distinctEvents` content: peer proceedings vs lifecycle milestones
- Stage 2 query distribution: queries targeting ≥2 institutional domains for multi-proceeding inputs
- Boundary names: institution-specific boundaries for multi-proceeding inputs
- Article truth/confidence: within or above current range
- No increase in `UNVERIFIED` claims caused by event structure changes
- No spurious `distinctEvents` on non-event families

### Gate pass/fail criteria

- **Pass (promote):** All 3 positive runs show peer proceedings AND all 5 guardrails hold
- **Conditional pass (retest):** 2/3 positive runs pass but 1 still shows milestones — rerun the failing input once more. If 3/4 total pass, promote with a monitoring note.
- **Fail (escalate to repair step):** ≤1/3 positive runs show peer proceedings after 2 full attempts — prompt-only is insufficient, proceed to narrow LLM repair pass.

---

## 8. Final Judgment

**`Prompt-only distinctEvents fix confirmed`**

The diagnosis is correct: Bolsonaro "various/all" degradation is an event-granularity problem at Stage 1 where `distinctEvents` fills with STF lifecycle milestones instead of peer proceedings (STF + TSE). The downstream wiring (MT-3 coverage guard, GENERATE_QUERIES multi-event rule, generateResearchQueries parameter passing) is already correct and operational. The current prompt line 207 actively encourages the wrong behavior by listing temporal episodes of the same phenomenon as an Include example.

The refined standard — "requiring different evidence sources or institutional authorities" — is the correct discriminator. It correctly separates peer proceedings (different evidence bodies) from lifecycle milestones (same evidence body) and is multilingual-safe.

Prompt-only is the appropriate first step because it directly addresses the identified root cause (bad prompt guidance at line 207), the fix adds zero code complexity, and the validation gate will objectively measure whether it's sufficient before any repair step is considered.

Two minor wording adjustments to the proposed prompt text are recommended:
1. Broaden the lifecycle exception from "compliance/fairness/correctness" to "chronology, lifecycle, or internal progression" — avoids false-narrowing on non-evaluative single-process inputs
2. Replace "legal domains" with "domains" — ensures the fix is generic beyond legal contexts (per AGENTS.md Generic by Design rule)

One validation gate addition is required:
- Add wind-still.ch URL/article control as guardrail #6 — the highest-risk regression vector for article episode flattening

With these adjustments, the proposal is ready for implementation pending human approval.
