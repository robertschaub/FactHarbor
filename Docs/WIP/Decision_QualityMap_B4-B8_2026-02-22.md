# Captain Deputy Decisions — Quality Opportunity Map B4-B8 (2026-02-22)

**Context:** 3-reviewer round on `Report_Quality_Opportunity_Map_2026-02-22.md`. All 3 APPROVE-WITH-AMENDMENTS.
**Reviewers:** R1 LLM Expert (Opus 4.6), R2 Lead Developer (Sonnet 4.6), R3 Lead Developer (Codex)
**Decision authority:** Captain Deputy

---

## Decision 1: Implementation Order — R3 sequence (with M0 optional)

**Decision: R3's order, M0 not blocking.**

```
M0   (optional, if hotspot file is unwieldy during B-5a)  ← micro-modularization
B-5a  challenger prompt improvement                        ← zero risk, benefits everything downstream
B-4   pro/con query separation + shared budget framework   ← shapes upstream evidence pool
B-6   verifiability annotation at Stage 1                  ← annotates on improved evidence
B-7   misleadingness flag                                  ← annotates on improved evidence
B-8   explanation quality (structural → rubric)            ← output quality layer
B-5b  Opus tier (reconciler first, then both)              ← highest cost/risk, last
```

**Rationale:**
- R3's core argument is correct: B-4 changes what evidence the pipeline produces. B-6/B-7 annotate that evidence. Annotating first then changing the evidence pool means re-baselining — wasteful.
- B-5a stays first (all 3 agree, zero risk, prompt-only).
- B-5b goes last (all 3 agree, highest cost/risk). Evaluation order per A1: prompts → Opus reconciler → Opus both.
- M0 is good engineering but not blocking. Sequential merge (A6) already prevents collisions. If the developer finds `claimboundary-pipeline.ts` unwieldy during B-5a, do M0 before B-4. Don't gate B-5a on it.

**Why not R2's order:** R2 front-loads annotations (B-6, B-7) before B-4 changes the evidence pool. This creates a "baseline then re-baseline" problem. R2's grouping into week 1/week 2 is convenient for scheduling but wrong for dependency flow.

---

## Decision 2: UCM Flags — R3's 4 mode enums

**Decision: Mode enums, not booleans.**

| UCM Key | Type | Values | Default |
|---------|------|--------|---------|
| `queryStrategyMode` | enum | `legacy` \| `pro_con` | `legacy` |
| `perClaimQueryBudget` | number | 1-20 | `8` |
| `claimAnnotationMode` | enum | `off` \| `verifiability` \| `verifiability_and_misleadingness` | `off` |
| `explanationQualityMode` | enum | `off` \| `structural` \| `rubric` | `off` |

**Rationale:**
- 6 independent booleans create 64 combinations, many invalid (e.g., `rubricEnabled: true` + `structuralCheckEnabled: false`). Untestable.
- Mode enums encode valid state transitions by design. `rubric` implies structural checks as prerequisite — no invalid combination possible.
- `perClaimQueryBudget` as a number (not boolean) directly supports A3 shared budget and is UCM-configurable per D5 R-1 amendment.
- Aligns with AGENTS.md Configuration Placement: "prevent confusion."

---

## Decision 3: M0 Micro-modularization — Approved as optional

**Decision: Optional, not blocking.**

- The sequential merge strategy (A6) already mitigates the collision risk R2 flagged.
- M0 is valuable if the developer finds the hotspot file hard to work with. It is not required for the B-sequence to succeed.
- If done: schedule between B-5a and B-4 (the natural break point). No-behavior-change refactor only.
- If skipped: no downstream impact. Each B-item can still land sequentially.

---

## Decision 4: B-6 Verifiability vs Category — Keep both

**Decision: Keep both fields. Resolve overlap in Stage 1 extraction prompt.**

- `category` = what type of claim this is (factual, opinion, prediction, comparative). Structural classification.
- `verifiability` = can we fact-check it with available evidence (high/medium/low/none). Operational signal.
- These are genuinely different axes. An opinion can contain verifiable factual sub-claims ("The tax cut was bad because it increased the deficit" — deficit claim is verifiable, value judgment is not).
- The extraction prompt must make the distinction clear to the LLM: `category` describes the claim's nature, `verifiability` describes whether evidence can resolve it.
- V1 is flag-only (no filtering or routing), per R2's recommendation. Filtering can be added later once the annotation quality is validated.

---

## Decision 5: All 10 amendments — Approved

| # | Source | Amendment | Decision | Notes |
|---|--------|-----------|----------|-------|
| A1 | R1 | B-5 evaluation order: prompts → Opus reconciler → both | **Approved** | All 3 agree. Never Opus challenger alone. |
| A2 | R1 | B-6 move to Stage 1 | **Approved** | Avoids anchoring bias in verdict prompt. |
| A3 | R1+R2 | Shared search budget (8/claim/round) | **Approved** | UCM-configurable (`perClaimQueryBudget`). Shared with D5#3 contrarian retrieval. |
| A4 | R1 | B-8 two-tier: structural + rubric | **Approved** | Structural checks must stay truly structural per AGENTS.md (R3). |
| A5 | R1 | Verdict Accuracy: multilingual + band-mapping | **Approved** | Aligns with multilingual robustness mandate. Separate track. |
| A6 | R2 | Sequential merges on main | **Approved** | One B-item lands fully before next starts. |
| A7 | R2 | Tag `pre-b-sequence` before starting | **Approved** | Zero cost, good rollback point. |
| A8 | R3 | M0 micro-modularization prep step | **Approved (optional)** | See Decision 3. Not blocking B-5a. |
| A9 | R3 | Schema version bump for new output fields | **Approved** | Essential. Bump to `3.1.0-cb` (minor: new fields, no breaking changes). |
| A10 | R3 | Prompt/UCM parity check per B-item | **Approved** | Each B-item merge must confirm prompt and UCM default are in sync. |

---

## Effort Estimate

Adopting R3's range with the M0-optional adjustment:

| Scenario | Hours |
|----------|-------|
| Without M0 | 24-30h |
| With M0 | 28-36h |

R2's 20-26h is optimistic — it doesn't account for schema work (A9), parity checks (A10), or prompt reseed overhead. R3's estimate is more realistic.

---

## Relationship to D1-D5 Plan

The B-4 through B-8 items run **in parallel with** the D1-D5 execution, not sequentially after it:

- D1 Phase 1 (A-1 through A-3) focuses on cross-provider stabilization — different files, different concerns.
- B-4 through B-8 focus on report quality dimensions — evidence shaping, annotations, explanations.
- B-4's shared search budget (A3) must be coordinated with D5#3 contrarian retrieval (both consume `perClaimQueryBudget`). Implementation note: B-4 builds the budget framework, D5#3 consumes it later.
- B-1 (runtime tracing) and B-3 (knowledge-diversity-lite) remain gated on A-3 per D2.

**No changes to D1-D5 execution order or gates.** The Quality Map B-items are additive.

---

## Action for next agent

Start with:
1. `git tag pre-b-sequence` (A7)
2. B-5a: challenger prompt improvement (2-3h, zero risk, prompt-only change)
3. Then B-4: pro/con query separation + budget framework with `queryStrategyMode` and `perClaimQueryBudget` UCM keys
