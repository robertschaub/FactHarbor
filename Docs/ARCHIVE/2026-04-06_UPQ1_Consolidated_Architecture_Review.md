# UPQ-1 Consolidated Architecture Review

**Date:** 2026-04-06
**Reviewers:** Lead Architect + LLM Expert (Claude Code, Opus 4.6)
**Reviewing:** `Docs/WIP/2026-04-06_Upstream_Report_Quality_Workstream_Proposal.md`
**Status:** Consolidated judgment, ready for GPT cross-review

---

## 1. Consolidated Judgment: `approve` with resequenced Phase A

Both reviewers approve the workstream framing. The disagreement is on sequencing.

---

## 2. Where Both Reviewers Agree

1. **Stage 5 monitor mode is justified.** Post-fix canaries show clean tension reduction (5→2 across four families, -60%). Remaining tensions are genuine directional divergences. Fix 2 (stale `boundaryFindings`) is correctly deferred.

2. **UPQ-1 is correctly framed as Stage 2 first, Stage 3 second.** Boundary concentration is primarily an input problem (skewed evidence pool), not a clustering algorithm problem. The Bolsonaro sufficiency investigation and the Plastik boundary analysis both confirm this.

3. **The proposal correctly avoids mixing too many root causes.** Evidence acquisition, boundary concentration, and multilingual divergence are properly separated.

4. **UPQ-1 and NEUTRALITY-1 need an explicit boundary.** Include `languageLane` in any telemetry, but keep language/retrieval-lane interventions in NEUTRALITY-1's scope.

5. **No broad redesign is warranted.** The pipeline architecture is sound. The gaps are in prompt contracts and observability, not in the stage sequencing or data model.

---

## 3. The Disagreement: Telemetry First vs Prompt Fix First

### Lead Architect position

> Add claim-level acquisition ledger first (Phase A). Measure with 2-3 canary batches. Then choose one bounded Stage 2 intervention (Phase B). Telemetry avoids another speculative fix cycle.

**Strength:** Disciplined. Doesn't commit to an intervention without data.
**Weakness:** The Bolsonaro AC_02 investigation already demonstrated the pattern that telemetry would confirm: some claims accumulate evidence faster than others, proportional to iteration count. Phase A risks being an extended measurement period before an intervention the evidence already justifies.

### LLM Expert position

> Wire existing-evidence summary into GENERATE_QUERIES first. The query generator accepts `existingEvidence` as a parameter at `research-query-stage.ts:46` but never uses it — the prompt receives no information about what evidence has already been found. This is a concrete prompt-architecture gap with a precise fix surface. Fix it first, measure with existing canaries, then add telemetry only if the prompt fix alone is insufficient.

**Strength:** Targets a confirmed code-level gap (dead parameter). The intervention is narrow, testable, and directly addresses the most likely cause of uneven per-claim acquisition.
**Weakness:** Without telemetry, the before/after comparison relies on the same manual reconstruction that the sufficiency investigation required.

### Supporting evidence for the LLM Expert finding

- `generateResearchQueries()` at [research-query-stage.ts:46](apps/web/src/lib/analyzer/research-query-stage.ts#L46) accepts `existingEvidence: EvidenceItem[]`
- The function body never references `existingEvidence` — it is a dead parameter
- The GENERATE_QUERIES prompt receives `claim`, `expectedEvidenceProfile`, `distinctEvents`, `iterationType`, and geography — but no evidence summary
- The orchestrator passes `state.evidenceItems` at [research-orchestrator.ts:711](apps/web/src/lib/analyzer/research-orchestrator.ts#L711), confirming the data is available at call time
- Consequence: iteration 2 cannot avoid re-targeting dimensions already covered by iteration 1; the contradiction iteration cannot see which direction is well-supported

Additionally:
- Previous queries are tracked in `state.searchQueries` but never passed to the query generator
- The prompt says "Do not repeat queries already used in main iterations" for contradiction mode, but the LLM has no information about what queries were previously used
- Query generation temperature is 0.2 (conservative for a diversity-benefiting task)

---

## 4. Consolidated Sequencing Recommendation

Resequence Phase A into two sub-phases. The prompt fix is small enough to do first without delaying telemetry significantly, and it provides an immediate signal:

### Phase A-1: Wire evidence summary into GENERATE_QUERIES (1 day)

1. In `generateResearchQueries()`, build a per-direction evidence count and covered-dimensions summary from `existingEvidence` filtered to the target claim
2. Add `${existingEvidenceSummary}` to the GENERATE_QUERIES prompt template
3. Instruction: "You already have the following evidence for this claim. Focus your queries on dimensions or directions that are under-represented."
4. Add a prompt-contract test for the new variable
5. Run the four hard-family canaries and compare per-claim evidence balance

### Phase A-2: Add claim-level acquisition ledger (1-2 days)

Add to `CBResearchState` and persist in result JSON:

```typescript
claimAcquisitionLedger: Record<string, {
  seededItems: number;
  perIteration: Array<{
    iteration: number;
    queriesGenerated: number;
    newEvidenceItems: number;
    direction: { supports: number; contradicts: number; neutral: number };
  }>;
  totalItems: number;
  applicabilityLosses: number;
}>;
```

Include `languageLane` per iteration entry to keep NEUTRALITY-1 effects visible.

### Phase A gate

After Phase A-1 canaries + Phase A-2 telemetry from 2-3 batches:
- If per-claim evidence balance improved significantly → evidence summary was the main lever; Phase B focuses on query diversity and anchoring
- If per-claim evidence balance is unchanged → the gap is in search/fetch/extraction, not query generation; Phase B targets a different layer

### Phase B: One bounded Stage 2 improvement slice

Chosen based on Phase A data. Candidates:
- Query anchoring refinement (if queries still drift)
- Previous-query deduplication signal (if query overlap is high)
- Extraction yield improvement (if queries are good but extraction loses material)

### Phase C: Stage 3 boundary concentration

Only after Stage 2 is characterized. Confirmed correct by both reviewers.

### Phase D: Validation and promotion gate

Same as the original proposal. Hard families as canary set.

---

## 5. Architectural Risks

### Risk 1 (Lead Architect): Telemetry scope creep
The ledger could grow to capture every per-claim per-iteration metric. Cap to fields needed for Phase B decision-making. Expand only when a specific question requires a new field.

### Risk 2 (LLM Expert): Dead parameter pattern
`existingEvidence` accepted but unused is a symptom of a query generator designed for single-shot use, never adapted for iterative loops. If Phase B focuses on telemetry interpretation rather than closing prompt-architecture gaps, the same evidence-blindness persists.

### Risk 3 (shared): Phase A becoming an end in itself
Telemetry does not improve report quality — it improves our ability to choose the right intervention. Time-box Phase A to 2-3 canary batches, then commit to a Phase B intervention.

---

## 6. Missing Architectural Boundaries

Both reviewers identified that the proposal conflates three distinct sub-problems under "Stage 2/3 upstream quality":

| Layer | What | Fix surface |
|---|---|---|
| **Evidence acquisition quality** | Are we finding enough relevant sources? | Search + fetch + query generation |
| **Claim-local attribution quality** | Is evidence correctly mapped to claims? | Extraction + relevance classification |
| **Boundary formation quality** | Are boundaries well-shaped? | Clustering |

The acquisition ledger should capture these separately so the first intervention targets the right layer.

---

## 7. Overstated Assumptions

1. **"The safest high-value first move is better telemetry"** (original proposal) — slightly overstated. The evidence summary prompt fix is equally safe, cheaper, and has a direct quality-improvement path. Telemetry is the safest *diagnostic* move; the evidence summary is the safest *intervention* move.

2. **"Remaining instability is upstream retrieval/boundary driven"** (original proposal) — mostly correct but understates the prompt-architecture component. The query generator's blindness to existing evidence is a specific prompt-contract gap, not an infrastructure problem. It has a more precise fix surface than "Stage 2 retrieval quality."

---

## 8. Summary for GPT Cross-Review

**Core question for GPT:** Is the resequenced plan (prompt fix first → telemetry second → intervention third) sound, or does the original proposal's discipline (telemetry first → then intervene) better protect against premature optimization?

**Specific points to evaluate:**
1. Is the dead `existingEvidence` parameter a strong enough finding to justify front-loading the prompt fix?
2. Is the proposed `${existingEvidenceSummary}` variable likely to improve per-claim evidence balance, or could it cause new problems (e.g., anchoring bias, over-fitting to the current evidence direction)?
3. Is the Phase A-1 → A-2 → gate → B sequencing the right granularity, or is it over-splitting?
4. Does the NEUTRALITY-1 boundary need to be stronger (e.g., an explicit dependency diagram)?
5. What is the biggest thing this consolidated plan still misses?
