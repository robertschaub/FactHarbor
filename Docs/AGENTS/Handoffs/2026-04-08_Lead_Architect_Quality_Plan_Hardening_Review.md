---
### 2026-04-08 | Lead Architect | GitHub Copilot (GPT-5.4) | Quality Plan Hardening Review
**Task:** Architect-level review of the revised complete quality assessment and forward plan, with focus on implementation readiness, priority order, shared root causes, and deployment gating.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-08_Lead_Architect_Quality_Plan_Hardening_Review.md` (new), `Docs/AGENTS/Agent_Outputs.md` (append)
**Key decisions:**
1. The revised active issue set is directionally correct, but it should be framed as two workstreams rather than five unrelated items: (a) Stage 1 hardening = proposition anchoring + classification/decomposition stability, (b) verdict semantics hardening = truth/misleadingness separation. Boundary concentration and neutrality remain separate downstream tracks.
2. Priority 1a is the correct first unblocker. The current Zod object silently strips unknown fields, so `truthConditionAnchor` and `antiInferenceCheck` are accepted then discarded. The schema mismatch invalidates round-2 conclusions.
3. Priority 1b is sound and not redundant. Reconciliation already carries the independence rule, but advocate truth scoring happens upstream and still needs the same contract. This is defense-in-depth, not duplication.
4. Priority 2 needs tighter specification: first refresh the neutrality baseline on the current stack, then run a controlled characterization matrix that isolates query-language effects from provider/source-environment effects before proposing an intervention.
5. Priority 3 should not be the immediate next fallback after 1a. Before adding a new Stage-1 LLM call, test the simpler lever that is still untried: run Pass 2 extraction on a stronger model tier. The existing contract validator already uses the `context_refinement`/`modelVerdict` lane.
6. Deployment should not wait for the full neutrality investigation. It should wait for 1a + 1b plus a focused canary gate, because current main still contains a known broken validator contract and a known chronology truth-scoring defect.

**Open items:**
- Add an explicit implementation spec for 1a retry behavior: force retry when `presentInInput=true` and `preservedInClaimIds=[]`, and validate cited claim IDs / quote spans structurally.
- Add a presentation guard for the expected `TRUE + highly_misleading` pattern so users do not misread truth as endorsement.
- Insert a model-tier A/B gate for Pass 2 extraction before approving a new Stage-1 anchor-mapping call.

**Warnings:**
- The current plan mixes two truths that need to stay separate: Stage-1 quality is materially improved in several families, but `STG1-DECOMP` remains an open backlog item for SRG/SRF-style instability. Do not imply the Bundesrat fix path resolves the general decomposition track.
- The neutrality spread cited in the plan (58pp) is based on March measurements. It is still valid as an alert signal, but not as a current-stack intervention baseline until remeasured.
- The advocate prompt does not emit `misleadingness`; only reconciliation does. Priority 1b changes truth-scoring behavior upstream, not just final labeling.

**For next agent:**
- Implement 1a with dynamic corrective guidance built from structured validator output, not generic prose alone. Quote the missing anchor span from the input when available.
- If 1a still underperforms, run a targeted Pass 2 `budget` vs `standard` canary before adding any new Stage-1 LLM call.
- Treat Issue 2 + Issue 5 as the shared Stage-1 hardening track. Keep Issue 3 separate as verdict semantics hardening.

**Learnings:** yes — the plan quality improved materially once the runtime wiring was checked against the prose. For architecture reviews in this repo, prompt contracts, schema parsing, and UI/report presentation must be reviewed together; otherwise the plan can look internally coherent while still being operationally incomplete.
