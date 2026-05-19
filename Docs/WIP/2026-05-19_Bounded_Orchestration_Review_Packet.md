# Bounded Orchestration Review Packet

**Status:** Ready for review
**Prepared by:** Agents Supervisor / Codex GPT-5.5
**Date:** 2026-05-19
**Purpose:** Review the FactHarbor agent orchestration model for missing pieces, authority ambiguity, cost creep, and convergence pressure.

This is a bounded process review. It is not a request to redesign V2, change
product code, approve live jobs, alter prompt/model/config policy, or steer a
specific implementation slice.

## Review Question

Does the current Captain Deputy + Steer-Co + Lead Developer operating model
keep FactHarbor V2 moving independently toward excellent report quality while
preserving approval gates, cost discipline, and complexity control?

## Materials To Review

- `AGENTS.md`
- `.claude/skills/captain-deputy/SKILL.md`
- `.claude/skills/steer-co/SKILL.md`
- `.claude/skills/reasoning-budget/SKILL.md`
- `Docs/AGENTS/Roles/Captain_Deputy.md`
- `Docs/AGENTS/Roles/Lead_Developer.md`
- `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`
- `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`
- `Docs/AGENTS/V2_Excellence_Scorecard.md`
- `Docs/AGENTS/V2_Retirement_Ledger.md`
- `Docs/AGENTS/Handoffs/2026-05-19_Agents_Supervisor_Automatic_Debt_Sensor_Checkpoints.md`

## Current Operating Model Summary

- Captain interacts primarily with Captain Deputy for autonomous workstreams.
- Captain Deputy coordinates Steer-Co for steering and Lead Developer for
  delivery.
- Steer-Co is a model-diverse steering committee led by GPT-5.5 xhigh, with
  Opus 4.6 and Gemini as distinct challenge/advice lanes when convened.
- Lead Developer owns implementation delivery and verification.
- `/reasoning-budget` selects reasoning effort dynamically; not every lane
  should run at max by default.
- `/debt-guard` remains mandatory for bugfixes and complexity-sensitive work.
- `npm run debt:sensors` is automatic but advisory for V2/debt-sensitive
  intake, Steer-Co packets, V2 gates, and closeout.
- `V2_Excellence_Scorecard.md` and `V2_Retirement_Ledger.md` add convergence
  pressure: future slices must show quality value, simplification, or an
  explicit exception.

## Known Current Risks

- V2 hidden proof/guard/diagnostic layers can accumulate faster than report
  quality value.
- Documentation and handoff volume can obscure the current truth.
- Dynamic reasoning can drift into all-premium/all-extra-high use if triggers
  are too broad.
- Steer-Co can become ceremony if convened for mechanical work.
- Captain Deputy can accidentally become a meta-router if mandatory workflow
  boundaries are not enforced.
- Current process improvements remain mixed with active worktree changes until
  staged/committed.

## Reviewer Assignments

### Reviewer A — Claude Opus 4.6

Use `claude-opus-4-6` with adaptive thinking disabled according to
`~/.claude/settings.json`.

Focus:

- hidden authority ambiguity;
- approval-gate bypass risk;
- process overbuilding;
- whether scorecard/ledger rules create enough convergence pressure;
- whether automatic debt sensors are scoped tightly enough.

Return:

```text
OPUS REVIEW
Verdict: approve | approve_with_changes | reject
Top findings:
Required changes:
Optional changes:
Residual risk:
```

### Reviewer B — Gemini Pro

Focus:

- alternate framing and missing operational concerns;
- cost/latency implications;
- whether Lead Developer can act without routine Captain prompts;
- whether Steer-Co triggers are too narrow or too broad.

Return:

```text
GEMINI REVIEW
Verdict: approve | approve_with_changes | reject
Top findings:
Required changes:
Optional changes:
Residual risk:
```

### Reviewer C — Codex Synthesis

Focus:

- reconcile reviewer disagreement;
- convert accepted findings into minimal process amendments;
- reject broad redesign unless tied to a concrete failure mode.

Return:

```text
CODEX SYNTHESIS
Decision:
Accepted changes:
Rejected changes:
Next implementation packet:
Captain escalation:
```

## Pass / Fail Criteria

Pass if:

- mandatory workflows still own their domains;
- Captain approval gates remain explicit;
- Captain Deputy can keep routine work moving;
- Steer-Co has clear consent and escalation boundaries;
- dynamic reasoning avoids all-R3/all-R4 default behavior;
- debt-sensor output is actionable without becoming a premature blocker;
- future V2 slices must state scorecard and retirement-ledger impact.

Fail if:

- any agent can approve prompt/model/config/live-job/public behavior without
  Captain approval;
- Captain Deputy becomes a generic meta-router;
- Steer-Co can approve what a mandatory workflow or Captain gate forbids;
- the process encourages adding more hidden mechanisms without value or
  retirement pressure;
- cost controls rely only on human memory rather than packet fields.

## Immediate Recommendation Pending Review

Until this review completes, use the current model but require every substantial
V2 package to include:

- `V2 SCORECARD IMPACT`
- `V2 RETIREMENT LEDGER IMPACT`
- `V2 CONSOLIDATION GATE`
- latest `npm run debt:sensors` status for debt-sensitive work
