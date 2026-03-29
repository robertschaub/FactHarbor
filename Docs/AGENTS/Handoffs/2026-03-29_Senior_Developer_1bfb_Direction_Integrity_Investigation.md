### 2026-03-29 | Senior Developer | Codex (GPT-5) | 1bfb Bolsonaro Direction Integrity Investigation
**Task:** Deep-investigate job `1bfbfb82f82b4e239f750f0b23883cc7`, reconstruct why `AC_02` hit `verdict_integrity_failure`, run parallel sub-investigations, and consolidate a strategy/plan.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-29_Senior_Developer_1bfb_Direction_Integrity_Investigation.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The primary failure is a Stage-4 citation-carriage defect, not a Bolsonaro-topic issue and not primarily a direction-validator false positive. `AC_02` had a real in-pool evidence mix (`1 support / 4 contradict / 5 neutral`), but its final verdict carried `supportingEvidenceIds=["EV_1774770531922"]` and `contradictingEvidenceIds=[]` even though the reasoning explicitly cited three contradicting evidence IDs that existed in the pool. Grounding validation caught that mismatch, but direction validation and direction repair still operated on the stale arrays. The repair path then changed truth to `32`, re-failed, and safe-downgraded to `50/24`. A secondary bug makes the warning details misleading: the downgrade warning records `originalTruthPercentage=48` from the pre-repair verdict while the warning text describes the repaired `32%` state. Recommended strategy: (1) immediate code-only bug fix for the misleading downgrade details, (2) primary approved fix path is prompt/schema repair so reconciliation and direction-repair outputs carry final support/contradict arrays, with parser consumption and fallback, and (3) until that exists, do not let direction safe-downgrade act on verdicts already known to have broken citation grounding without first repairing attribution. This needs careful design because the current grounding validator emits free-text issues, not structured categories.
**Open items:** Prompt changes require explicit human approval per repo rules. A future implementation should likely add a structured grounding/attribution repair or enriched grounding-validator output category instead of parsing issue strings. There is also a broader product/architecture mismatch to review: the direction semantics xwiki still describes direction validation as advisory-only, while current runtime policy is `retry_once_then_safe_downgrade`.
**Warnings:** This is not a pure validator-threshold problem. Recent DB scan found `25` direction-integrity-failure jobs in the most recent `400` results, and several warning messages are internally contradictory, which indicates a systemic integrity-path defect. Do not respond by tuning deterministic thresholds first. Also do not add regex/keyword logic that infers support/contradiction from free-text reasoning; that would violate AGENTS.md.
**For next agent:** Core artifacts:
- Problem job: `1bfbfb82f82b4e239f750f0b23883cc7` (`UNVERIFIED 55.9 / 24`)
- Comparator: `88325f52d095470b8826440f8c575e7f` (`MOSTLY-TRUE 73.8 / 68`)
- Executed code hash for problem job: `f1e5cc963849cb2745613eb6ca0f253e68e2a144`

Key evidence:
- `AC_02` in `1bfb...` had `10` relevant items total: `1 support / 4 contradict / 5 neutral`
- Final cited arrays were `1 support / 0 contradict`
- Final reasoning explicitly referenced `EV_1774770531919`, `EV_1774770531921`, `EV_1774770531923` as contradicting evidence
- Grounding warning fired before direction downgrade
- `attemptDirectionRepair()` can only change `truthPercentage` and `reasoning`; it cannot repair citation arrays
- Reconciliation prompt/schema currently omits final `supportingEvidenceIds` / `contradictingEvidenceIds`

Recommended implementation order:
1. Fix the warning-state mismatch in `verdict-stage.ts` so the safe-downgrade warning reflects the repaired verdict state or records both pre- and post-repair truth values.
2. With human approval, extend `VERDICT_RECONCILIATION` output schema to return final support/contradict evidence arrays and update the parser to consume them.
3. Mirror the same citation-carriage contract in `VERDICT_DIRECTION_REPAIR`, or add a dedicated grounding/attribution repair step before direction enforcement.
4. Only after citation-carriage is repaired, re-evaluate whether direction-validator threshold/prompt tuning is still necessary.
**Learnings:** no
