# Pipeline Redesign Deep Review Report (v1)
**Date**: 2026-01-16  
**Scope**: Deep review of the pipeline redesign plan and supporting docs  
**Reviewed docs**:
- `Docs/DEVELOPMENT/Pipeline_Redesign_Plan_2026-01-16.md`
- `Docs/DEVELOPMENT/Plan_Review_Guide_2026-01-16.md`
- `Docs/DEVELOPMENT/Analysis_Session_Summary_2026-01-16.md`

---

## Executive Summary

The plan correctly identifies high-leverage root causes behind input-neutrality drift, scope loss, and inconsistency (multi-normalization cascade, non-deterministic scope IDs, scope loss via sampling/pruning, and Gate1 timing). The migration approach (Phase 1 critical fixes → Phase 2 simplification → Phase 3 search integration → Phase 4 unified orchestration → Phase 5 deprecation) is reasonable **if** the plan is made execution-ready with:

- stable references (avoid brittle line numbers)
- explicitly defined metrics and regression harness
- hard guardrails for any tool-calling/unified orchestration
- a consistent cost model (assumptions + measurement)

Edits were applied directly to the three documents to address the above.

---

## Key Findings (from the Plan + Session Summary)

### 1) Input neutrality failures are plausible and high impact
The plan’s core claim—question vs statement can diverge materially—is consistent with known failure patterns:
- multiple normalization sites create drift
- LLM-generated `impliedClaim` can change query generation
- scope IDs derived from similarity can become unstable across runs

**Recommendation**: enforce a single normalization point at entry and treat neutrality as an output-level contract (see “Metrics” below).

### 2) Scope loss mechanisms are credible
The plan identifies the typical failure mode: if scope-specific facts are not represented in a refinement prompt, scope refinement can “forget” that scope; later pruning/dedup can then remove it.

**Recommendation**: guarantee ≥1 representative fact per pre-assigned scope during refinement prompts and log scope-loss events explicitly.

### 3) Option A (monolithic LLM + tools) should be treated as **deferred** (future work)
Option A can reduce call count, but it is not the safe default for production rollout because it amplifies known failure modes:
- token-trap / history reinjection risk (quadratic growth under tool loops)
- scope contamination (cross-scope evidence leakage)
- poor debuggability under tail latency

**Recommendation**: keep the orchestrator in TypeScript (Option D), and only revisit Option A if/when tool-chaining + grounding are provably stable under adversarial tests and p95 budgets.

### 4) Cost and performance claims need a single, consistent model
The docs previously mixed multiple “current cost” ranges. The plan is strongest when cost is computed from:
- observed call counts (`state.llmCalls`)
- token usage (if available)
- a documented provider price table

**Recommendation**: adopt a consistent cost model formula and validate against logs.

### 5) Prefer evolution-by-default, with selective rewrites behind flags
“Rewrite from scratch” is high-risk here because the core pipeline is tightly coupled to non-negotiable invariants (pipeline integrity, input neutrality, scope semantics, Gate 1 + Gate 4).

**Recommendation**:
- Evolve the orchestration incrementally in Phases 1–3.
- Rewrite selectively where components are small, interface-bound, and testable (e.g., deterministic scope IDs, a regression harness, provider/tool search adapters).
- Use a “strangler” approach: feature flags + parallel runs + a regression harness as the safety net.

---

## Required Plan Clarifications (before Phase 1 execution)

### A) Replace brittle line-number references
Line numbers drift quickly in `apps/web/src/lib/analyzer.ts`. Use function-name anchors plus a short snippet or a stable description.

### B) Define neutrality/stability at the output level
Replace “must produce identical impliedClaim/researchQueries” with measurable invariants:
- same normalized input string
- same scope count and scope type distribution
- claim stability via Jaccard overlap (or embeddings, if available)
- verdict divergence avg ≤ 4 points and defined p95 target

### C) Add a deterministic regression harness
Before Phase 1 testing, create a harness that runs:
- 20 Q/S pairs (minimum)
- a small set of known multi-scope regressions

Outputs should include:
- neutrality divergence stats (avg/median/p95)
- scope stability and scope-loss event counts
- claim stability stats
- `state.llmCalls` and (if possible) token usage

### D) Add Phase 4 Go/No-Go criteria
Phase 4 must be gated on Phase 1–2 meeting neutrality and scope stability targets and Phase 1 deterministic scope IDs being shipped and verified.

### E) Add a Phase 0 “Ground Realism” gate for Native Research
The redesign assumes “native/grounded research” provides real evidence. The implementation must enforce:
- provenance (facts used in verdicts must come from fetched sources with real URLs/excerpts)
- fail-closed behavior (if grounding metadata/citations are absent, fall back to standard search; do not treat model synthesis as evidence)
- explicit p95 budgets (timeouts/caps) for multi-scope workloads

---

## What was changed in the documents (high level)

### `Plan_Review_Guide_2026-01-16.md`
- Updated “4-phase” wording to **5-phase**.
- Reframed “provider lock-in” as **capability dependence** (tool calling / structured output / native search).
- Added a “line numbers drift” note and shifted to function-name anchoring.
- Added recommended metric definitions (neutrality divergence, scope stability, claim stability, cost).

### `Pipeline_Redesign_Plan_2026-01-16.md`
- Added explicit invariants from `AGENTS.md`.
- Relaxed the “Critical Invariant” from internal-field identity to output-level stability.
- Added a consistent cost model section.
- Added a Phase 1 regression harness TODO and tightened Phase 1 testing language.
- Strengthened Phase 2 pruning/dedup recommendations (deterministic pruning; type-aware/evidence-aware dedup).
- Added guardrails for Phase 3 tool-assisted research and a Phase 4 go/no-go gate.

### `Analysis_Session_Summary_2026-01-16.md`
- Reconciled “TODOs completed” vs “TODOs defined”.
- Clarified “no code changes” to mean “no new code changes during the session” while referencing existing fixes on `main`.
- Added a note to prefer function-name anchoring over line numbers.

---

## Skeptical Second Review (v2.6.33-Skeptical)

**Reviewer**: AI Coding Assistant (Skeptical Second Review Mode)
**Focus**: Ground realism, tool-calling risks, and provider capability assumptions.

### Top 5 Risks (Ranked)

1.  **Evidence Loss (Schema Dilution):** Monolithic calls risk the LLM returning summaries rather than the granular `ExtractedFact` objects (with `claimDirection`, `evidenceScope`) required by `aggregation.ts`.
2.  **"Runaway Research" Budget Hole:** Native tool-calling (e.g., Gemini Grounded) can be recursive. Without strict middleware, costs can spiral before system-level guardrails intervene.
3.  **Context Leakage in Multi-Scope Inputs:** Monolithic prompts increase the risk of "cross-contamination" where evidence from one scope (e.g., Brazil TSE) is used to verdict a claim in another (e.g., US STF) due to shared semantic article framing.
4.  **Progress Tracking Blindness:** A single-call architecture creates a "black box" period of 20-40s where the UI cannot show progress, degrading UX compared to the current iterative display.
5.  **Provider Capability Drift:** Coupling the orchestrator to tool-calling signatures creates a new form of provider lock-in, as Gemini, Perplexity, and OpenAI search APIs behave differently.

### New Kill-Switch Risk (Ground Realism)
6.  **Synthetic Evidence Path:** If “grounded search” returns an LLM synthesis and the pipeline extracts facts from that synthesis (rather than from fetched sources), the system can appear grounded while violating evidence transparency. This is rollout-blocking unless fail-closed provenance rules are enforced.

### Top 5 Fixes (Proposed)

1.  **"Atomic" Tooling (Hybrid Orchestration):** Do not give the LLM a generic "analyze" tool. Give it three explicit tools: `search_web(query)`, `extract_facts_from_source(text, scopeId)`, and `submit_final_verdicts(data)`. Keep the orchestrator logic in the code.
2.  **Deterministic ID Anchoring:** Replace index-based IDs (`CTX_1`) with content-addressed hashes: `hash(normalizedInput + scopeName)`.
3.  **Budget-Aware Provider Wrapper:** Implement a `BudgetedLLM` class to track `totalTokens` and `searchCount` per JobID, throwing `BudgetExceededError` for partial results.
4.  **Shadow-Mode Parallelism:** Use a `FH_SHADOW_PIPELINE` flag to run the hardened Option D pipeline in the background and log divergence without showing it to the user.
5.  **Fact-First Prompting:** Enforce a "Fact Buffer" output before the model generates verdicts to ensure grounding.

### Go/No-Go Criteria for Phase 4

| Gate | Criterion | Metric |
| :--- | :--- | :--- |
| **Neutrality** | Q/S Divergence | Average absolute difference ≤ 4% across 100 test pairs. |
| **Integrity** | Validation | 100% of Option D outputs pass schema + semantic validation (provenance + scope mapping). |
| **Recall** | Scope Retention | 100% of "Legal" and "Regulatory" scopes in regression suite retained. |
| **Efficiency** | Cost/Latency | Cost < $0.50 (GPT-4 tier) and p95 Latency < 45s. |
| **Stability** | ID Invariance | 100% stable `CTX_` and Claim IDs across 5 identical runs. |

---

## Third Review: Adversarial Logical Audit (o1-preview)

**Date**: 2026-01-16
**Method**: Deep Chain-of-Thought simulation of multi-scope inputs.

### The "Kill Switch" Findings:

1.  **The Token Trap (Quadratic Growth)**: Option A (Monolithic) suffers from re-entrant history injection. Each tool turn re-sends prior search results, leading to quadratic token cost scaling. **Plan modified to Option D (Code-Orchestrated Native Research)** to enforce linear scaling.
2.  **Attention Sink (Scope Contamination)**: A single prompt jumbles evidence for 3+ legal bodies (e.g., TSE vs SCOTUS). Isolation is better achieved via stage-gated scoped calls.
3.  **Monolithic Black Box**: UX suffers a "hang" state for 30-40s. Orchestrator must remain in TypeScript to provide telemetry.

### Refined Phase 4 Stress Test:
A multi-court case (TSE vs. SCOTUS vs. ECJ) must be processed with 100% scope isolation and < 20% token overhead compared to simple queries.

---

## Suggested Next Actions (execution-ready checklist)

### Phase 1 (Critical fixes)
- [ ] Single normalization point at entry (remove any secondary normalization)
- [ ] Deterministic scope IDs (document canonicalization + hash scheme)
- [ ] Gate1 moved post-research (ensure pipeline integrity)
- [ ] Regression harness implemented + run on:
  - 20 Q/S pairs
  - known multi-scope regressions
- [ ] Publish Phase 1 metrics report (avg/median/p95, scope-loss counts)

### Phase 2 (Simplification)
- [ ] Replace scope pruning with deterministic “empty claims + empty facts only”
- [ ] Make dedup type-aware/evidence-aware; avoid cross-type merges
- [ ] Re-run harness + 50 diverse inputs; compare claim counts and scope retention

### Phase 3 (LLM-native search integration)
- [ ] Implement tool-assisted search with explicit budgets/caps
- [ ] A/B harness: external vs tool-assisted search (cost, latency, relevance metrics)

### Phase 4 (Option D production hardening)
- [ ] Implement only after go/no-go is green
- [ ] Enforce strict budgets + schema validation + automatic fallback
- [ ] Parallel run + gradual rollout

### Phase 5 (Deprecation)
- [ ] Archive legacy pipeline and update architecture docs
- [ ] Keep benchmark suite as living regression harness

---

## Open Questions (must be resolved)
- What is the authoritative evaluation set for scope recall (manual annotation vs heuristics)?
- How will “fact relevance” be measured initially (text similarity proxy vs human rating)?
- What p95 neutrality divergence is acceptable for rollout (e.g., < 8 points)?

