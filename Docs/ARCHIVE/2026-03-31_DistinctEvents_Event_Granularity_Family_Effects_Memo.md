# DistinctEvents Event-Granularity Fix — Likely Family Effects Memo

**Date:** 2026-03-31  
**Role:** Lead Architect  
**Agent:** Codex (GPT-5)  
**Scope:** Review likely live-job-family effects of the proposed `distinctEvents` / event-granularity fix using current local jobs, current prompt rules, and archived March quality analyses.

## 1. Executive Summary

The current Bolsonaro degradation is real, but the first proposed fix shape was too blunt.

The live evidence shows that current Bolsonaro `"various"` / `"all"` inputs are not failing because Stage 2 ignores `distinctEvents`. That wiring is already live. They are failing because Stage 1 now fills `distinctEvents` with **milestones inside one STF proceeding** instead of **top-level independently researchable proceedings** such as **STF** and **TSE**. Stage 2 then faithfully follows that narrow structure and over-researches STF.

However, a broad prompt rule like "prefer top-level proceedings, not lifecycle events" would create collateral damage:

- it would likely help **Bolsonaro various/all**
- it could also help other **collection-style legal/process inputs**
- but it could accidentally **flatten good article/timeline inputs** and **reduce useful coverage** for process-heavy URLs or single-proceeding lifecycle questions

So the best adjusted solution is:

1. keep the fix at the **understanding -> research** boundary
2. make it **generic**
3. make it **conditional**
4. avoid a blanket ban on lifecycle/timeline events

Recommended design:

- strengthen `distinctEvents` guidance so **collection-style inputs about multiple proceedings/cases/decisions/investigations** prefer **top-level independently researchable units**
- keep lifecycle milestones valid when the input is actually about the chronology/lifecycle of one process
- if needed, add a **small LLM-based `distinctEvents` validation/repair pass** for collection-style inputs only

This is the most likely way to improve many report families while minimizing collateral regressions.

## 2. Evidence Base

Three independent analysis tracks converged:

- **Historical/docs pass:** March archived docs already framed the right architectural direction: multi-event coverage should live in `distinctEvents`, not in extra AtomicClaims.
- **Prompt/code pass:** current prompt rules still explicitly allow `distinctEvents` to contain temporal episodes of one phenomenon, which is permissive enough to overfill one proceeding with milestones.
- **Live-job pass:** current local jobs show the real family effects clearly.

Key sources reviewed:

- [Agent_Outputs.md](/c:/DEV/FactHarbor/Docs/AGENTS/Agent_Outputs.md)
- [2026-03-30_Report_Quality_Evolution_Deep_Analysis.md](/c:/DEV/FactHarbor/Docs/WIP/2026-03-30_Report_Quality_Evolution_Deep_Analysis.md)
- [Report_Quality_Analysis_2026-03-08.md](/c:/DEV/FactHarbor/Docs/ARCHIVE/Report_Quality_Analysis_2026-03-08.md)
- [claimboundary.prompt.md](/c:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md)

Relevant current prompt rules:

- plurality override exists at [claimboundary.prompt.md](/c:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md#L136)
- question decomposition still forbids sub-event decomposition unless plurality is explicit at [claimboundary.prompt.md](/c:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md#L169)
- `distinctEvents` explicitly includes temporal episodes of the same phenomenon at [claimboundary.prompt.md](/c:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md#L202)
- Stage 2 query generation correctly distributes research across `distinctEvents` at [claimboundary.prompt.md](/c:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md#L490)

## 3. What Current Jobs Show

### 3.1 Bolsonaro various/all — strong positive target

Current anchor jobs:

- `7910732038884c6bb03e6e789024f5cb`
- `34149ab8de1f465580902707e4d40328`
- `0d21e43e180d45718bca3c409251cbcd`

Observed pattern:

- `distinctEvents` is populated
- but the extracted events are mostly **STF sub-stages**
- the separate **TSE electoral proceeding** is absent

Examples:

- `791073...` uses `Bolsonaro coup attempt trial before STF First Panel` + `Appellate proceedings before full Supreme Court`
- `0d21...` uses `STF coup trial` + `publication of conviction ruling` + `appellate proceedings`
- `34149...` uses `electronic monitoring`, `house arrest`, `coup attempt trial proceedings`, `defence arguments on fairness`

Likely effect of a good fix:

- restores a separate TSE research branch
- improves institution/proceeding diversity in Stage 2
- improves claim-boundary richness
- likely raises truth/confidence modestly on the `"various/all"` family because TSE/electoral-law evidence re-enters the pool
- likely reduces run-to-run variance by making top-level event selection more stable

### 3.2 Single-proceeding Bolsonaro / process-heavy legal inputs — mixed risk

Representative current jobs:

- `696d81406d5a4fbfaa4c23ec49fe4e85`
- `14d7fb1530894dbb9a15dee961e0e9c7`

These are not `"various/all"` collection inputs. They are about one attempted-coup proceeding and its fairness/compliance.

Current `distinctEvents` can include:

- acceptance of charges
- preliminary rulings
- trial
- publication of ruling
- appeals

This is not automatically wrong. For a single legal proceeding, those phases may be genuinely relevant to whether the process was fair and lawful.

Likely effect of an over-strong fix:

- could collapse useful lifecycle diversity into one umbrella event
- could reduce coverage of defence arguments, appellate rights, or procedural objections
- could lower boundary richness for singular process/fairness claims

So this family is the main argument against a blanket anti-lifecycle rule.

### 3.3 URL / article / process-heavy timeline inputs — clear regression risk if the fix is too broad

Representative current job:

- `a2b7e76c97684630951134c551e437cb` (`https://www.wind-still.ch/effizienz`)

This job currently extracts a legitimate multi-event set:

- `Windatlas-Überarbeitung 2016`
- `Sistierung Windpark Liesberg`
- `Sistierung Windpark Schleifenberg`
- `Entscheid IWB Chrischona`
- `ETH-Studie zum Chall-Projekt`

These are not just meaningless milestones. They are independently researchable episodes/projects used by the source article to support its thesis.

Likely effect of an over-strong fix:

- could flatten article-level evidence structure
- could reduce coverage diversity
- could make Stage 2 ignore important supporting episodes

This family should therefore be treated as a guardrail. The first rollout should not accidentally "improve" Bolsonaro by harming this class.

### 3.4 SRG/SRF-style compound inputs — likely neutral, but monitor for spurious event invention

Representative current jobs:

- `11c5295a9a7345ad841b832f2970bfa4`
- `9e4d3712e12d49bc8cadd601766e5f4b`

Observed pattern:

- `distinctEvents` is empty
- the instability here is claim-decomposition / evaluative-predicate handling, not event granularity

Likely effect of a well-scoped fix:

- should be essentially none

Main regression risk:

- if the prompt becomes too eager to manufacture "events" from non-event evaluative inputs, these families could degrade

Success criterion here is inertness:

- no new `distinctEvents`
- no new fragmentation
- no new `UNVERIFIED` caused by invented event structure

### 3.5 Broad evaluative inputs — should remain inert

Representative current jobs:

- `83cec35fdbf840d4b0311b5a8ca3ae14` (`Homeopathy does not work for animals`)
- recent Plastik / Hydrogen runs in the March 30 deep-analysis doc

Observed pattern:

- `distinctEvents` is empty
- quality issues here come from evidence balance, tangential claims, or cross-language retrieval, not event structure

Likely effect of a well-scoped fix:

- none

Regression risk:

- accidental event hallucination on abstract evaluative claims

This is another strong inertness guardrail.

### 3.6 Non-political multi-event/process inputs — likely positive, but only if the fix remains generic

No current local Boeing-family job was found, but the archived validation plan already identified the correct class:

- Boeing 737 MAX investigations + recertification decisions

This is exactly the kind of family that should benefit from the right fix:

- multiple top-level investigations/decisions
- potentially multiple institutions
- a natural risk of collapsing onto one most-prominent event if `distinctEvents` is too milestone-like

Likely positive effect:

- broader event coverage
- better query diversification
- richer institution-specific boundaries

Main risk:

- if the fix bans lifecycle detail too aggressively, a process-heavy regulatory chronology could become too flat

## 4. Where the First Proposed Fix Helps

The original direction is still correct in these cases:

- **Bolsonaro `"various/all"` family:** strong help expected
- **other collection-style legal/process claims:** likely help
- **non-political multi-event/process claims:** likely help
- **multilingual multi-event claims:** likely help if the prompt stays generic and language-neutral

Why:

- Stage 2 already knows how to distribute queries across `distinctEvents`
- the missing capability is not downstream routing
- the missing capability is choosing the right event granularity upstream

## 5. Where the First Proposed Fix Could Accidentally Worsen Reports

If implemented as a broad rule like "prefer top-level proceedings, not lifecycle events," it could worsen:

- **single-proceeding legal/fairness inputs**
- **URL/article inputs whose evidence is inherently timeline-shaped**
- **process-heavy regulatory or investigative chronologies**

Failure modes would be:

- flatter event sets
- less search diversity
- fewer procedurally distinct evidence branches
- lower boundary richness
- possible confidence loss if relevant sub-phases stop being researched

## 6. Adjusted Proposal

The proposal should be revised from a simple prompt nudge to a safer, more general design.

### 6.1 Recommended design

**Part A — generic prompt guidance**

Revise `distinctEvents` guidance so that for **collection-style inputs about multiple proceedings/cases/decisions/investigations/events**, the event set should prefer **top-level independently researchable units** over multiple milestones from one underlying unit.

But explicitly preserve lifecycle/timeline events when:

- the input is really about the chronology/lifecycle of one process
- the input is an article/URL whose thesis is argued through multiple episodes
- the milestone itself materially changes the fairness/lawfulness/substance being assessed

### 6.2 Safer follow-on if prompt-only behavior is still unstable

Add a **small LLM-based `distinctEvents` validation/repair pass** that runs only when:

- the input is collection-style or plurality-driven
- `distinctEvents` has 2 or more entries
- and the extracted set may be mostly milestones of one underlying proceeding

The validator should ask an LLM:

- are these events top-level independently researchable units?
- or are they mostly lifecycle steps of one underlying process?
- if the latter, rewrite the set toward broader top-level units while preserving any truly distinct proceedings/institutions

This keeps the decision semantic and multilingual without introducing deterministic heuristics.

### 6.3 What not to do

- do not create a rule keyed to the literal word `"various"`
- do not ban lifecycle events globally
- do not solve this in aggregation, matrix logic, or verdict logic
- do not increase AtomicClaim fragmentation as the primary answer

## 7. Likely Net Effect by Family

| Family | Likely effect | Why |
|---|---|---|
| Bolsonaro `"various/all"` | **Strong positive** | Missing top-level TSE branch is the current main loss |
| Bolsonaro single-proceeding | **Mixed / guardrail** | Lifecycle phases can be legitimately relevant |
| URL/article process-heavy | **Risky if too broad** | These inputs often legitimately rely on episode/timeline structure |
| SRG/SRF compound | **Mostly neutral** | Their problem is not event granularity |
| Broad evaluative inputs | **Neutral if well-scoped; negative if event hallucinations appear** | `distinctEvents` should stay empty |
| Non-political multi-event/process | **Likely positive** | These also need top-level event coverage, not one dominant branch |

## 8. Required Validation Set

The archived March 7 plan already had the right validation philosophy. Use that shape, but anchor it on current live families.

### 8.1 Must-pass positive set

1. Bolsonaro EN `"various"`  
   Current anchor: `7910732038884c6bb03e6e789024f5cb`

2. Bolsonaro EN `"all"`  
   Current anchor: `0d21e43e180d45718bca3c409251cbcd`

3. Bolsonaro EN proceedings statement variant  
   Current anchor: `34149ab8de1f465580902707e4d40328`

4. One non-political multi-event/process control  
   Documented example from March 7 plan: Boeing 737 MAX investigations + recertification

5. One multilingual multi-event/process control  
   Best available current anchor: PT Bolsonaro family

### 8.2 Must-pass guardrails

6. Single-proceeding Bolsonaro control  
   Current anchors: `696d81406d5a4fbfaa4c23ec49fe4e85` and `14d7fb1530894dbb9a15dee961e0e9c7`

7. URL/article timeline/process control  
   Current anchor: `a2b7e76c97684630951134c551e437cb`

8. SRG/SRF compound control  
   Current anchor: `11c5295a9a7345ad841b832f2970bfa4`

9. Broad evaluative inertness controls  
   Current anchors: `9e4d3712e12d49bc8cadd601766e5f4b`, `83cec35fdbf840d4b0311b5a8ca3ae14`, and one Plastik/Hydrogen control

### 8.3 What to inspect in each validation run

- `inputClassification`
- `distinctEvents`
- search-query coverage by event family
- whether more than one top-level event/proceeding branch is researched when appropriate
- final claim-boundary richness
- article truth/confidence
- whether `UNVERIFIED` increases

### 8.4 Concrete pass criteria

- Bolsonaro `"various/all"` must show **STF + TSE** or equivalent top-level multi-proceeding coverage
- single-proceeding Bolsonaro must **not** lose legitimately relevant lifecycle/process coverage
- URL/article control must **not** collapse to one flattened umbrella event
- SRG/SRF and broad evaluative controls must show **no spurious new `distinctEvents`**
- no family should see a material increase in `UNVERIFIED`

## 9. Recommended Next Step

The next step should **not** be a broad prompt-only rollout.

Recommended sequence:

1. draft the adjusted prompt language
2. get LLM-expert / architect review on the exact wording
3. if prompt-only still seems too blunt, add the narrow LLM validation/repair pass for collection-style inputs
4. validate on the family set above before promotion

## 10. Bottom Line

The proposed event-granularity fix is directionally right, but only after adjustment.

The safest high-quality version is:

- **not** "stop using lifecycle events"
- **not** "special-case Bolsonaro"
- **not** "key off the word various"

It is:

- a **generic collection-style event-structure fix**
- that prefers **top-level independently researchable units**
- while preserving lifecycle/timeline detail when the input genuinely needs it
- and validating the result against both positive and guardrail families
