# Coding Agent Prompts

## Phase 2.3 — Verdict Stage JSON Parse Failure

**Context:** Phase 2.2 complete (commits `6db6e958`, `93a90774`). Root cause of dimension-path UNVERIFIED verdicts identified: `VERDICT_ADVOCATE` JSON parse failure due to output token overflow — NOT an evidence quality issue. Full plan: `Docs/WIP/Report_Quality_Analysis_2026-03-08.md`.

---

### Root cause (confirmed)

Run 2 (job `e09851ac`) failed with:
```
Stage4LLMCallError: Stage 4: Failed to parse LLM response as JSON for prompt "VERDICT_ADVOCATE"
```
Both retry attempts failed → 3 claims got `analysis_generation_failed` / `truth=50, conf=0` UNVERIFIED fallback.

Evidence was NOT the problem: Run 2 had 131 items from 33 sources — the highest volume of all 3 runs. All evidence passed filtering normally. The LLM produced verbose boundary-level reasoning that truncated mid-JSON and caused a parse failure. This is a pre-existing vulnerability, not caused by the dimension path — any high-evidence-volume run can trigger it.

---

### Step 1 — Check `max_tokens` for VERDICT_ADVOCATE (Option A, quick check)

Read `apps/web/src/lib/analyzer/verdict-stage.ts` and find the `max_tokens` (or equivalent) value passed to the LLM for `VERDICT_ADVOCATE` calls.

- **If below the model's supported output limit** (e.g., capped at 2048 when Sonnet supports 8192 output tokens): raise it to the model maximum. Commit, then revalidate with 3× Iran. If this resolves the crash, Option A is complete — skip Step 2.
- **If already at or near the model maximum**: Option A won't help. Proceed directly to Step 2.

---

### Step 2 — Evidence truncation before verdict stage (Option B)

If Option A is insufficient (or as a belt-and-suspenders addition), cap evidence input to the verdict stage per claim.

**Where to implement:** Before the evidence context is assembled for the `VERDICT_ADVOCATE` prompt. The cap must be applied per-claim (not globally across the job).

**Truncation strategy:**
1. Filter to items with `probativeValue` of `high` or `medium` first (drop `low`)
2. Within the retained set, balance directional representation: take top N/2 `supports_thesis` and top N/2 `contradicts_thesis` items (or top N if one direction is sparse)
3. Cap at a UCM-configurable limit — suggest `maxEvidenceItemsPerVerdict: 30` as the default. Add to UCM via `config-schemas.ts` + `pipeline.default.json`.
4. If the filtered set is smaller than the cap, use it as-is (no padding)

**Why 30:** Run 1 had 120 items across 3 claims = ~40/claim and succeeded. Run 2 had 131/3 = ~44/claim and failed. 30/claim gives meaningful headroom while preserving the most probative evidence.

**Do NOT implement Option C** (partial JSON recovery for truncated output) — too complex for marginal gain when B prevents the crash by design.

---

### Step 3 — Validate

After whichever option(s) from Steps 1–2 are applied:
- Run `npm test` — all tests pass
- Run 3× Iran "Was Iran actually making nukes?" — confirm:
  - No `VERDICT_ADVOCATE` parse failures
  - Dimension-path runs (where LLM returns `ambiguous_single_claim`) produce real verdicts (`conf > 0`)
  - Overall truth% is in the 65–85% band (not 50% UNVERIFIED)
- Add a unit test for the truncation logic if Option B is implemented (test: evidence beyond cap is dropped; directional balance is maintained; UCM value is respected)

---

### D2 — Classification instability: defer until D1 validated

After 3× Iran re-validation with D1 fix applied, assess whether classification instability (`question` 2/3 vs `ambiguous_single_claim` 1/3) still produces materially different outcomes. If truth% spread across runs is ≤10pp, classification instability is acceptable for now. If spread remains >10pp, revisit Option C from the prior Phase 2.3 spec (check if reprompt loop recovers it before touching the prompt).

---

### D4 (still deferred) — Gate 1 `passedSpecificity` cleanup

Remains deferred. Tackle after D1 is stable and validated.

---

### Validation baseline

| Input | Path | Expected verdict | Expected truth% |
|-------|------|-----------------|----------------|
| "Was Iran making nukes?" | question-path | MOSTLY-TRUE | 68–82% |
| "Was Iran making nukes?" | dimension-path | MOSTLY-TRUE | 65–85%, conf > 0 |
| "Was the Bolsonaro judgment fair?" | question | MOSTLY-TRUE | 68–85% |
| "Hydrogen is more efficient than electricity for cars" | claim | LEANING-FALSE/MOSTLY-FALSE | 25–45% |
