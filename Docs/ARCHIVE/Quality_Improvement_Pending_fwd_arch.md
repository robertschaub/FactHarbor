# Quality Improvement — Pending Items

**Created:** 2026-03-17 (extracted from WIP Consolidation #6)
**Status:** Active — forward-looking items from archived quality documents

---

## 1. Inverse Claim Asymmetry — Phase 3 (pending)

**Source:** `ARCHIVE/2026-02-27_Inverse_Claim_Asymmetry_Plan.md`

Phase 3: Calibration hardening CI gate. Phases 0-2 completed. Remaining:
- Implement calibration CI gate that blocks merges when framing-symmetry regression exceeds threshold
- Open question: What threshold triggers the gate? (Captain decision needed)
- Open question: Should the gate be advisory (warning) or blocking?

## 2. Report Variability — Residual Config Items (pending)

**Source:** `ARCHIVE/Report_Variability_Consolidated_Plan_2026-03-07.md`

MT-1 through MT-5(A) and MT-5(C) implemented. Remaining Phase 1 config items:
- Sufficiency gate restore: `evidenceSufficiencyMinSourceTypes` currently set to 1 (should be 2). Revert once stable.
- Integrity policy enablement: verify all integrity checks are enabled in production config
- Diagnostic A/B recommendation: run paired jobs with/without specific config changes to measure impact

## 3. Ambiguous Claim Decomposition — Residual Items (low priority)

**Source:** `ARCHIVE/Ambiguous_Claim_Decomposition_Quality.md`

Most items subsumed by Combined_Claim_and_Boundary_Quality_Remediation_Plan. Residual:
- Q3: Specificity threshold tuning (currently 0.7 in Gate 1) — may need adjustment after Phase B
- Q4: Atomicity level (currently 3) — may need per-claim-type adjustment

## 4. Next Investigation Recommendations — Phase B Prompt Quality (deferred)

**Source:** `ARCHIVE/Report_Quality_Next_Investigation_Recommendations_2026-03-14.md`

Phase A (search-stack drift) executed and validated. Phase B:
- Prompt quality investigation for non-English inputs
- Temperature/self-consistency parameter exploration
- Largely governed by Combined Plan now, but the specific recommendation to investigate prompt quality for DE/PT inputs remains relevant

## 5. Jurisdiction Contamination — Phase B/C Contingencies (dormant)

**Source:** `ARCHIVE/Evidence_Jurisdiction_Contamination_Fix_Plan_2026-03-12.md`

Phase A validated. Phase A+ not triggered. Contingency plans if contamination recurs:
- Phase B: Query generation constraints (prompt-only, Fix 2 style)
- Phase C: Boundary formation guardrails (post-clustering filter)
- These are dormant — activate only if Phase A validation shows regression

## 6. Ambiguous Claim Decomposition — Fix A/B Prompts (approved, not implemented)

**Source:** `ARCHIVE/Ambiguous_Claim_Decomposition_Quality.md`

- **Fix A:** Pass 2 Prompt — allow dimension labels in claim statements with strict constraints (no proper nouns, dates, numbers, regions). Self-check alone is NOT sufficient.
- **Fix B:** Gate 1 Prompt — context-aware specificity for dimension claims. Dimension claims are expected to be broader; specificity comes from the dimension being independently verifiable.
- Both approved in Review 1. Not yet implemented. Largely subsumed by Combined Plan Phase B, but the specific prompt guidance may still apply.

## 7. Report Variability — warn_and_cap Integrity Mode (not implemented)

**Source:** `ARCHIVE/Report_Variability_Consolidated_Plan_2026-03-07.md`

Phase 2.1 requires `warn_and_cap` as a third integrity mode:
- Add `"warn_and_cap"` to `VerdictGroundingPolicy` and `VerdictDirectionPolicy` type unions
- New `warnAndCapVerdict()`: preserves TP, caps confidence at 55 (MEDIUM tier), emits `verdict_integrity_warning`
- Register `verdict_integrity_warning` in `warning-display.ts`

## 8. Search Provider Migration (deferred)

**Source:** `ARCHIVE/Report_Variability_Consolidated_Plan_2026-03-07.md` Appendix D

Top candidates for CSE replacement: Serper (evaluate first), Tavily (evaluate second).
Evaluation criteria: result relevance (30%), domain authority (20%), coverage breadth (15%), verdict impact (20%), latency (5%), cost (10%).
Migration path: integrate → shadow mode 1 week → promote to P1 → demote CSE → monitor 2 weeks.

---

## Related Active Documents

- `WIP/Combined_Claim_and_Boundary_Quality_Remediation_Plan_2026-03-16.md` — governing quality plan
- `WIP/Report_Quality_Criteria_Scorecard_2026-03-12.md` — quality criteria reference
- `WIP/Plastik_Recycling_Report_Regression_Investigation_2026-03-16.md` — active investigation
- `WIP/SR_Evidence_Weighting_Investigation_2026-03-16.md` — SR weighting findings
