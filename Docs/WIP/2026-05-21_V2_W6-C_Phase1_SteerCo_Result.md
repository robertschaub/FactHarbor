# W6-C Phase 1 Steer-Co Result: Strategic Direction After N=3 Canaries

**Date:** 2026-05-21
**Package:** `Docs/WIP/2026-05-21_V2_W6-C_Phase1_SteerCo_Reconvention_Package.md`

## Steer-Co Result

**Question:** Given N=3 canaries confirming `materialScarcityCandidate = "material"`
with perfect stability, what strategic direction should W6-C take? Also: waive
the 10-run re-anchoring clause?

**Committee:** Claude Opus 4.6 (Leader) + GPT-5.5 (Member A, adversarial
governance) + Gemini 3.1 Pro Preview (Member B, systems practicality).

**Convened:** yes — full 3-model-family panel.

**Authority:** Captain Deputy decision. Captain expanded authority covers prompt
and schema changes. Option C (accept stop as correct) does not require prompt
changes and stays within authorized scope. Caveat: if `caveat_report` alters
public behavior, Captain review required.

### Current State

- N=3 canaries confirm `materialScarcityCandidate = "material"` with perfect
  stability (3/3 runs), ruling out calibration mismatch and LLM noise.
- The W6-C sufficiency stop correctly identifies that encyclopedic sources cannot
  satisfy academic rigor dimensions (source diversity, counter-evidence, method
  quality consistently material).
- Volume is not the constraint: quota-2, quota-3, and quota-6 produce identical
  dimension profiles.
- The diagnostic projection (`materialScarcityCandidate`) has served its purpose:
  it confirmed the stop is quality-driven, not miscalibrated.
- Budget: 5 of 20 slots remaining (2 wasted on V1 pipeline submissions).

### Decision

**Approve Option C: Accept the stop as correct for this claim profile.**

The LLM's quality assessment is accurate. Encyclopedic sources (Wikimedia page
summaries + OpenAlex abstracts) genuinely cannot satisfy the sufficiency rubric's
requirements for primary research, diverse independent analyses,
counter-evidence, and methodological rigor. The `caveat_report` /
`refine_retrieval` recommendation is the correct output for this source quality.

**Approve 10-run re-anchoring clause waiver** as a non-precedential,
case-specific variance. Rationale: N=3 perfect stability on the primary
diagnostic, corroborated by prior quota canaries (2, 3, 6 EI) showing identical
dimension profiles, with only 5 budget slots remaining.

**Reject Option B (prompt calibration) as a near-term lever.** Both independent
reviewers advise against it: GPT-5.5 warns it "weakens the quality bar" and
Gemini warns it "creates localized prompt drift and complicates long-term system
predictability." The quality signal is correct; lowering the bar to accommodate
encyclopedic sources would mask a genuine limitation.

**Acknowledge Option A (provider expansion) as the structural fix** for future
workstreams. The LLM is specifically identifying what's missing: primary
research, diverse sources, counter-evidence, methodological depth. Provider
expansion directly addresses these. This remains Captain-gated and out of scope
for this budget cycle.

### Consent Check

- **Leader (Claude Opus 4.6):** consent. Option C respects the quality signal.
  Waiver justified by N=3 + prior canaries.
- **Member A (GPT-5.5, governance):** modify → consent with containment. Key
  amendment: waiver must be non-precedential (case-specific variance, not a
  general N=3 sufficiency standard). N=3 alone is insufficient; sufficiency comes
  from N=3 + prior quota canaries + stable dimension diagnostics. Public behavior
  change from `caveat_report` may require Captain review.
- **Member B (Gemini 3.1 Pro, systems):** support. Option C trusts engineered
  thresholds. Waiver is pragmatic given budget constraint. Strongly advises
  against Option B from systems maintenance perspective.
- **Unresolved dissent:** none.
- **Cross-model diversity:** 3 of 3 model families (Opus, GPT-5.5, Gemini).

### Debt-Guard / Complexity Control

- Option C adds no mechanisms, changes no prompts, and requires no schema edits.
- The `materialScarcityCandidate` diagnostic projection added in Phase 1 has
  served its purpose. Its V2 Retirement Ledger row (V2-RL-020) has two triggers
  fired: Steer-Co `caveat_report` authorization (this decision) and diagnostic
  plan exhaustion (Phase 1 conclusive at N=3). The row is now retire-ready.
- Net mechanism change: unchanged.
- Debt sensor status: advisory_warn (stable).

### Dissent / Uncertainty

1. **reportStopRecommendation noise (noted, not blocking).** The secondary signal
   varies (2× `caveat_report`, 1× `refine_retrieval`). If downstream pipelines
   use this for routing, they need deterministic handling. The primary diagnostic
   (`materialScarcityCandidate`) is stable and should be the authoritative signal.

2. **Single claim profile (noted, accepted).** All canaries used the same claim
   ("hydrogen vs electricity"). Generalizability to other claim profiles is
   unknown but out of scope — testing more claim profiles would require dedicated
   budget in a future workstream.

3. **False closure risk (noted, mitigated by framing).** Provider scarcity
   remains structurally unresolved. Option C accepts this for the current claim
   profile; it does not declare the problem solved.

### Directions

1. **Record the Phase 1 conclusion** as diagnostic evidence in the WIP doc
   (done: `Docs/WIP/2026-05-21_V2_W6-C_Phase1_Calibration_Canary_Result.md`).
2. **Record the 10-run waiver** as a non-precedential case-specific variance
   with explicit rationale (N=3 + prior quota canaries + budget constraint).
3. **Do not pursue prompt calibration (Option B)** for this workstream —
   committee consensus against it.
4. **Provider expansion (Option A)** should be scoped in a future workstream
   with dedicated Captain authorization and budget.
5. **Preserve remaining 5 budget slots** — no further canary runs needed for
   this decision.
6. **If `caveat_report` alters public behavior** (user-visible report output),
   that change requires Captain review before implementation.

### Reconvene Trigger

- Captain requests reconsideration of the quality bar for encyclopedic sources.
- Provider expansion workstream is funded and needs W6-C integration direction.
- A different claim profile produces materially different diagnostic results.
- `caveat_report` path implementation encounters W7/W8 gate issues.

### Captain Escalation

**None required for the Option C direction decision itself** — this is a
within-scope steering decision with full committee consent.

**Potential future escalation:** If implementing the `caveat_report` path through
W7/W8 changes public behavior (user-visible reports, verdicts, or warnings), that
implementation requires Captain review per standing rules. The direction decision
is separate from the implementation.

---

## Cross-Model Reviews

### GPT-5.5 (Member A) — 2026-05-21

Invoked via `invoke-gpt.cjs` (model: gpt-5.5).

**Position:** modify → consent with containment

**Key contributions:**
- Waiver must be non-precedential case-specific variance, not a general standard
- N=3 sufficient only because corroborated by prior quota canaries and stable
  dimension diagnostics
- Public behavior risk if `caveat_report` changes external behavior
- Do not pursue Option B — weakens quality bar
- Recommended: record non-precedential variance memo

**Confidence:** confirmed

### Gemini 3.1 Pro Preview (Member B) — 2026-05-21

Invoked via `invoke-gemini.cjs` (model: gemini-3.1-pro-preview).

**Position:** support

**Key contributions:**
- Option C trusts engineered thresholds — the system is working as designed
- Waiving 10-run clause is pragmatic given budget constraint and 3/3 stability
- Strongly against Option B from systems maintenance perspective (prompt drift,
  portability, predictability)
- Downstream risk: `reportStopRecommendation` noise may cause non-deterministic
  routing if parsed without primary diagnostic
- Recommended: implement deterministic downstream routing for `caveat_report`

**Confidence:** confirmed
