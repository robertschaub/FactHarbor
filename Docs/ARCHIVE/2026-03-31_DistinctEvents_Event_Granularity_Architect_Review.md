# DistinctEvents Event-Granularity — Architect Review

**Date:** 2026-03-31
**Role:** Lead Architect
**Status:** REVIEW-READY

---

## 1. Executive Summary

The adjusted proposal is the right fix path. It correctly diagnoses the Bolsonaro degradation as an event-granularity problem at the Stage-1 `distinctEvents` boundary — not a Stage 4/5 regression — and proposes a generic, conditional prompt adjustment that should help multi-proceeding families without harming lifecycle, timeline, or evaluative inputs.

The key architectural insight is sound: `distinctEvents` should represent the **minimal set of independently researchable peer event clusters**, not lifecycle milestones of a single cluster. The current prompt at [claimboundary.prompt.md:207](apps/web/prompts/claimboundary.prompt.md#L207) explicitly includes "Temporal episodes of the same phenomenon (e.g., '2022 trial' and '2024 appeal')" — which is what causes Stage 1 to fill `distinctEvents` with STF sub-stages instead of separating STF from TSE.

I approve the proposal with one refinement: the "independently researchable" standard needs sharpening. As stated, it could be read as "would different search queries be needed?" (yes for milestones too) rather than "would different institutional/domain evidence bodies be involved?" The latter is the correct test.

---

## 2. What the Current Bolsonaro Jobs Prove

### The pattern is consistent and clear

All three anchor jobs (`791073`, `34149a`, `0d21e4`) show the same structure:

| Job | distinctEvents | Missing |
|-----|---------------|---------|
| `791073` | STF First Panel trial + appellate proceedings | TSE electoral proceeding entirely absent |
| `34149a` | Electronic monitoring + house arrest + trial + defence arguments | TSE absent; events are milestones of one STF process |
| `0d21e4` | STF trial + ruling publication + appellate proceedings | TSE absent; events are STF lifecycle phases |

The single-proceeding comparators (`696d81`, `14d7fb`) show the expected lifecycle pattern for inputs that ARE about one proceeding:

| Job | distinctEvents | Appropriate? |
|-----|---------------|:---:|
| `696d81` | Aceitação da denúncia + julgamento de preliminares + sustação | Yes — these are genuinely distinct procedural stages of one proceeding |
| `14d7fb` | Charges + pretrial + testimony + verdict + conviction + publication | Yes — a legitimate chronology for a "did the proceedings comply?" question |

### The diagnosis is correct

- The "various/all" inputs ask about **multiple proceedings** but `distinctEvents` only captures **one proceeding's lifecycle**.
- Stage 2 faithfully distributes queries across the extracted events — the wiring works.
- The problem is that the extracted events are all STF milestones, so Stage 2 researches STF from multiple angles but never opens a separate TSE research branch.
- The result: no clean TSE boundary, weaker institution-specific evidence, lower truth/confidence than the best historical runs.

---

## 3. Cross-Family Effect Assessment

### 3.1 Positive target: multi-proceeding collection inputs

**Bolsonaro "various/all":** Strong positive expected. The fix would cause Stage 1 to extract "STF coup trial" and "TSE electoral proceeding" as peer events, restoring the missing research branch.

**Non-political multi-event:** Boeing 737 MAX (NTSB investigation + FAA recertification + congressional hearings) would similarly benefit from peer-event extraction instead of lifecycle milestones of one investigation.

**Multilingual:** The fix is language-neutral if phrased as a structural principle, not as English legal terminology.

### 3.2 Guardrail: single-proceeding lifecycle inputs

**Bolsonaro single-proceeding (696d81, 14d7fb):** Must NOT collapse lifecycle phases. "Did the proceedings comply with procedural law?" legitimately requires researching charges, hearing, verdict, and appeals as separate evidence-gathering targets. The lifecycle detail is the point.

**Risk level:** Medium. The prompt must distinguish "collection of parallel proceedings" from "chronology of one proceeding." The memo's conditional framing (§6.1) addresses this correctly.

### 3.3 Guardrail: URL/article timeline inputs

**wind-still.ch (`a2b7e76c`):** Extracts 5 independently researchable episodes (Windatlas revision, 3 wind park decisions, ETH study). These are NOT milestones of one process — they are genuinely distinct events used by an article to build an argument. The fix should not touch these.

**Risk level:** Low if the prompt targets "milestones of one process" specifically, not "any events below top-level."

### 3.4 Guardrail: evaluative and compound non-event inputs

**SRG/SRF, Homeopathy, Plastik, Hydrogen:** `distinctEvents` is currently empty. The fix should have zero effect on these families. If the revised prompt accidentally encourages event invention on non-event inputs, this is a regression.

**Risk level:** Low — the proposal correctly notes inertness as a success criterion.

---

## 4. Evaluation of the Adjusted Proposal

### 4.1 Diagnosis: Correct

The memo correctly identifies that:
- The wiring (Stage 2 distributes across `distinctEvents`) is already live and working
- The failure is at Stage 1 event extraction: milestones instead of peer proceedings
- The current prompt line at [claimboundary.prompt.md:207](apps/web/prompts/claimboundary.prompt.md#L207) ("Temporal episodes of the same phenomenon") actively encourages the wrong granularity for collection inputs

### 4.2 "Minimal set of independently researchable peer event clusters": Almost right

This is the correct architectural standard, but "independently researchable" is slightly ambiguous. Two STF milestones (charges filed, verdict delivered) ARE independently researchable — they produce different search results. The distinguishing factor is whether they require **different institutional/domain evidence bodies** or just different temporal windows into the same institutional body.

**Suggested sharpening:** "Independently researchable" should mean "requiring substantially different evidence sources or institutional domains," not just "producing different search queries." Milestones of one STF proceeding share the same institutional evidence pool (STF documents, same legal experts, same news coverage of the same court). STF vs TSE require genuinely different evidence domains.

### 4.3 Prompt-only first step: Correct

The proposal correctly recommends prompt-only as the first step. The rationale is sound:
- The wiring is already correct
- The change is at the extraction instruction level
- A new LLM validation/repair step adds complexity before it's proven necessary
- The prompt change can be validated against the family set before promotion

### 4.4 Conditional preservation of lifecycle detail: Correct

The proposal's conditional design (§6.1) is the right architecture:
- Collection-style multi-event inputs → prefer peer clusters
- Single-process chronology inputs → preserve lifecycle phases
- Article/URL episodic inputs → preserve episodes as independently researchable units

The condition must be evaluable by the extraction LLM from the input text alone, without deterministic heuristics. The distinction between "collection of parallel proceedings" and "chronology of one proceeding" is a semantic judgment that the LLM can make from the input wording (e.g., "various trials" vs "the trial proceedings").

### 4.5 Deferred LLM repair pass: Correct deferral

The proposal correctly defers the LLM validation/repair step. If prompt-only achieves the target on the positive set without regressing the guardrails, the repair step is unnecessary complexity. If prompt-only is insufficient (e.g., the LLM still produces milestones despite the instruction), the repair step becomes justified — but only for multi-event outputs that look over-fragmented.

---

## 5. Risks / Cautions

### Risk 1 (MEDIUM): Over-collapsing lifecycle for single-proceeding inputs

If the prompt says "prefer top-level units" too strongly, `14d7fb` could lose its legitimate charges → hearing → verdict → appeal lifecycle. The prompt must make the lifecycle exception unambiguous.

**Mitigation:** The prompt should say something like: "When the input describes one process or its compliance/fairness, lifecycle phases are valid events. When the input describes multiple parallel proceedings or institutions, prefer top-level peer units over milestones of the most prominent one."

### Risk 2 (LOW): Event hallucination on non-event inputs

If the revised prompt accidentally makes the LLM think it should always produce events, SRG/SRF or Homeopathy inputs could get spurious `distinctEvents` entries.

**Mitigation:** The include/exclude rules at lines 204-216 already scope distinctEvents to jurisdiction-relevant proceedings. The revised prompt should not change this framing.

### Risk 3 (LOW): Multilingual regression

The wording "independently researchable peer event clusters" is English-heavy. The prompt should describe the concept, not use this exact phrase, to avoid biasing non-English extraction.

**Mitigation:** Use a description: "events that require different evidence sources or institutional authorities" rather than "peer event clusters."

---

## 6. Recommended Path

### Approve the adjusted proposal as prompt-only first step

**Specific prompt change recommendation:**

In [claimboundary.prompt.md:202-207](apps/web/prompts/claimboundary.prompt.md#L202), revise the Include rules:

Current:
```
**Include:**
- Events, proceedings, rulings, or episodes that are WITHIN the claim's jurisdiction and directly relevant to the claim's substance.
- Multiple proceedings or trials by the jurisdiction's own institutions.
- Temporal episodes of the same phenomenon (e.g., "2022 trial" and "2024 appeal").
```

Proposed:
```
**Include:**
- Events, proceedings, rulings, or episodes that are WITHIN the claim's jurisdiction and directly relevant to the claim's substance.
- Multiple proceedings or trials by different institutions or in different legal domains within the jurisdiction.
- Temporal phases of a single process ONLY when the input asks about the compliance, fairness, or correctness of that specific process. In that case, phases (charges, hearing, verdict, appeal) are valid events because each phase involves different procedural evidence.

**Granularity rule:** When the input describes or implies multiple parallel proceedings, investigations, or decisions by different bodies, represent each top-level proceeding as a separate event. Do NOT fragment one proceeding into lifecycle milestones when peer-level proceedings exist — those milestones would be researched within the parent proceeding's evidence anyway. Prefer the smallest set of events where each event requires different evidence sources or institutional authorities to research.
```

This preserves lifecycle for single-process inputs while steering multi-proceeding inputs toward peer extraction.

### Defer LLM repair step

If the prompt change alone produces stable TSE/STF peer extraction on the positive set without regressing guardrails, no repair step is needed.

If the LLM still produces milestones despite the new instruction (measured on ≥3 runs of the anchor inputs), then add the narrow repair step as a follow-up.

---

## 7. Validation Gate

### Positive set (must improve or hold)

| # | Input | Current anchor | Success criterion |
|---|-------|---------------|-------------------|
| 1 | Bolsonaro EN "various" | `791073` | `distinctEvents` contains ≥2 top-level proceedings (STF + TSE or equivalent), not just STF milestones |
| 2 | Bolsonaro EN "all" | `0d21e4` | Same — peer proceedings, not lifecycle phases |
| 3 | Bolsonaro EN proceedings statement | `34149a` | Same |

### Guardrails (must not regress)

| # | Input | Current anchor | Success criterion |
|---|-------|---------------|-------------------|
| 4 | Bolsonaro single-proceeding EN | `14d7fb` | Lifecycle phases preserved (charges, hearing, verdict, appeal still present) |
| 5 | Bolsonaro single-proceeding PT | `696d81` | Same — multilingual lifecycle preservation |
| 6 | SRG/SRF compound | `11c529` / `9e4d37` | `distinctEvents` remains empty — no spurious events |
| 7 | Homeopathy / Plastik evaluative | `83cec3` | `distinctEvents` remains empty |

### Inspection per run

- `distinctEvents` content: peer proceedings vs lifecycle milestones
- Stage 2 query distribution: evidence from ≥2 institutional domains for multi-proceeding inputs
- Boundary richness: institution-specific boundaries for multi-proceeding inputs
- Article truth/confidence: within or above current range
- No new `UNVERIFIED` claims caused by event structure changes

---

## 8. Final Judgment

**`Adjusted prompt-only distinctEvents fix justified`**

The diagnosis is correct: Bolsonaro "various/all" degradation is primarily an event-granularity problem where Stage 1 fills `distinctEvents` with STF lifecycle milestones instead of peer proceedings (STF + TSE). The revised proposal correctly narrows the fix to a conditional prompt adjustment that preserves lifecycle detail for single-process inputs while steering multi-proceeding inputs toward peer extraction. The "independently researchable" standard is the right architectural concept but should be phrased as "requiring different evidence sources or institutional authorities" to be precise and multilingual-safe.

Prompt-only is the correct first step. The LLM repair pass should be deferred unless prompt-only proves insufficient on ≥3 validation runs.
