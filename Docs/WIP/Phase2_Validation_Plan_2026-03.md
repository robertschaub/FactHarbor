# Phase 2 Validation Plan — Broader Input Testing

**Date:** 2026-03-09
**Status:** Ready for implementation
**Purpose:** Verify Phase 1+2 pipeline improvements across multiple inputs before declaring production-ready. Current validation was primarily Iran-focused.

---

## Background

Phase 2 delivered: claim stability (Gate 1, reprompt loop), verdict stage maxTokens fix, SR cache TTL + web-search augmentation, scope normalization. Validation so far used mainly Iran ("Was Iran making nukes?") as the canonical case. Broader testing is needed to confirm no regressions on other topics and input types.

---

## Scope

Run 1–2 analyses each for 6 inputs spanning question, statement, claim, and article types. Record results in the checklist table. Investigate any run that fails success criteria.

**Inputs:**

| # | Input | Type | Expected |
|---|-------|------|----------|
| 1 | Was Iran actually making nukes? | Question | truth 60–87%, conf 70–85% |
| 2 | Was the Bolsonaro judgment (trial) fair and based on Brazil's law? | Question | truth 68–85%, conf 70–85% |
| 3 | The Bolsonaro judgment (trial) was fair and based on Brazil's law | Statement | ~same as #2 (±4% input neutrality) |
| 4 | Hydrogen for cars is more efficient than using electricity | Claim | truth 25–45%, LEANING-FALSE/MOSTLY-FALSE |
| 5 | Venezuela's economy under Maduro has performed well | Claim | No crash; reasonable verdict |
| 6 | [Use a known long-form article URL from prior FactHarbor runs, or a ~500+ word article URL] | Article | No crash; summarization + boundaries |

For #6, the implementing agent should use an article URL that has been successfully analyzed before, or pick a well-known long-form source (e.g. a Wikipedia or news article). If none available, skip #6 and note in report.

---

## Success criteria (per run)

- Job completes with status SUCCEEDED
- No `analysis_generation_failed` / `truth=50, conf=0` UNVERIFIED fallback
- No crashes in SR evaluation or scope normalization
- Claim count ≥ 1; boundaries formed
- Bolsonaro: STF and/or TSE mentioned where applicable
- Input neutrality: #2 vs #3 truth% within ~4%

---

## Deliverables

1. **Run all analyses** — via UI (app.factharbor.ch or local dev) or Swagger API
2. **Fill the reporting table** in `Docs/DEVELOPMENT/Phase2_Validation_Checklist.md`
3. **Summary paragraph** — append to this WIP doc: how many runs succeeded, any failures, overall assessment (production-ready or issues to fix)
4. **If failures:** Note job IDs and symptoms for follow-up investigation

---

## Reference

- Validation checklist: `Docs/DEVELOPMENT/Phase2_Validation_Checklist.md`
- Full plan: `Docs/WIP/Report_Quality_Analysis_2026-03-08.md`
- Coding Agent Prompts: `Docs/DEVELOPMENT/Coding Agent Prompts.md` (Phase 2 complete)
