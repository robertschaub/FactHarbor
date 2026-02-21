# Review Round Packet - Calibration + Debate System (2026-02-21)

## 1) Review Purpose
Run a focused architecture review to decide whether we proceed with immediate stabilization only, or also approve a broader debate-topology reset track.

This review is not for coding details. It is for:
1. decision clarity
2. sequencing approval
3. ownership and gates

## 2) Scope
In scope:
1. Calibration report model/search transparency correctness
2. Cross-provider run reliability blockers
3. Observability gaps (resolved config vs runtime actual)
4. Near-term execution plan (`a immediate`, `b soon`, `c backlog`)
5. Knowledge-diversity-lite controls (low-cost, trigger-based) for C13
6. Go/no-go criteria for profile promotion decisions

Out of scope:
1. Rich Report Cards ongoing work
2. Non-calibration feature backlog unrelated to C10/C13/C18/C9/C17

## 3) Pre-Read (required)
1. `Docs/WIP/Debate_System_Continuation_Plan_2026-02-21.md`
2. `Docs/Knowledge/Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md`
3. `Docs/Knowledge/Climinator_Lessons_for_FactHarbor.md`
4. `apps/web/test/output/bias/full-2026-02-20T21-32-24-288Z.json` (canonical baseline)
5. `apps/web/test/output/bias/full-2026-02-21T13-49-27-929Z.json` (cross-provider partial)
6. `apps/web/test/output/bias/full-2026-02-21T13-49-27-929Z.html`

Optional:
1. `Docs/WIP/CrossProvider_Calibration_Execution_Report_2026-02-21.md`

## 4) Evidence Snapshot (for the meeting)

Baseline full (canonical):
- artifact: `full-2026-02-20T21-32-24-288Z.json`
- completed: 10/10
- meanAbsoluteSkew: 35.06pp
- meanDirectionalSkew: 27.64pp
- passRate: 30%
- failure-mode asymmetry pair count: 0

Cross-provider full (first attempt):
- artifact: `full-2026-02-21T13-49-27-929Z.json`
- completed: 6/10
- meanAbsoluteSkew: 33.5pp
- meanDirectionalSkew: 23.5pp
- passRate: 33.3%
- failure-mode asymmetry pair count: 1
- failures:
  - `nuclear-energy-fr`: runtime error (`undefined.value`)
  - 3x OpenAI TPM limit (`gpt-4.1`)

Transparency panel finding:
- HTML is technically correct vs JSON.
- Main issue is semantic clarity: "Provider" currently means global provider, not per-role runtime actual.

Bias-source interpretation for this review:
- C18 is mostly clean in canonical baseline.
- Dominant remaining signal is C13-style evidence asymmetry.
- Therefore, review should evaluate **both** model diversity and low-cost knowledge-diversity controls.

## 5) Decisions Required (must be explicit)

### D1 - Immediate scope approval
Approve or change `a) Immediate` items:
1. report semantics fixes (`Global Provider`, `Role Provider Mode`, explanatory note)
2. runtime crash fix (`nuclear-energy-fr`)
3. TPM guard + fallback for OpenAI role calls
4. failure diagnostics bubble-up in pair results
5. rerun gate: two 10/10 cross-provider full runs before interpretation

Decision output:
- `Approved as-is` or `Approved with edits`

### D2 - "Soon" scope approval
Approve or change `b) Soon` items:
1. runtime role tracing (`meta.runtimeRoleModels`)
2. structured baseline vs cross-provider A/B memo
3. first C13 correction iteration + A/B

Decision output:
- execution order locked or changed

### D3 - Backlog strategy
Approve whether Debate V2 topology reset remains backlog or is pulled forward.

Decision output:
- keep in backlog / bring forward with target sprint

### D4 - Promotion policy
Confirm: no default profile/pipeline promotion until rerun and observability gates pass.

Decision output:
- policy ratified yes/no

### D5 - Knowledge-diversity-lite approval (cost/complexity bounded)
Approve or change low-cost, trigger-based controls:
1. evidence sufficiency gate
2. source-type evidence partitioning by role
3. contrarian retrieval pass only when trigger condition is met
4. strict cost caps (extra queries/calls/timeouts)

Decision output:
- `Approved as-is` or `Approved with edits`

## 6) Proposed 60-Min Agenda
1. 0-10 min: Evidence recap (no debate)
2. 10-25 min: Immediate blockers and low-hanging fixes
3. 25-40 min: Runtime observability requirements
4. 40-50 min: Knowledge-diversity-lite scope and cost caps
5. 50-60 min: Decisions, owners, deadlines, exit criteria

## 7) Roles for the Review
1. Architect (chair): scope and decision quality
2. Lead Dev: implementation feasibility, risk, ETA
3. LLM Expert: debate protocol quality and measurement validity
4. Recorder: decision log + action register

## 8) Entry Criteria
Meeting starts only if:
1. all participants reviewed the 6 required pre-reads
2. artifact paths are accessible
3. owner availability for `a) Immediate` work is confirmed

## 9) Exit Criteria
Review is complete only if all are recorded:
1. D1-D5 decisions
2. owner per action item
3. target dates for `a` and `b`
4. one status update destination:
  - `Docs/Knowledge/Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md`
   - plus one execution update in `Docs/WIP/`

## 10) Action Register Template (fill during meeting)
1. Action:
2. Owner:
3. Priority: immediate / soon / backlog
4. Due date:
5. Done when:
6. Risks/Dependencies:

## 11) Recommended Chair Statement (opening)
"Today we are deciding execution sequence, not debating broad theory. If an item does not change D1-D4, we park it. We will leave this session with locked scope, owners, and dates."
