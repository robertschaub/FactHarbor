# V2 Meta Improvement Sequence — Deferred Items

**Date:** 2026-05-22
**Status:** deferred until HighJump reaches a natural stop
**Origin:** Lead Architect V2 Process SWOT Audit (`Docs/AGENTS/Handoffs/2026-05-22_Lead_Architect_V2_Process_SWOT_Audit.md`)

## Context

The SWOT audit proposed a 5-item meta-improvement sequence. An advisor review
found that only Item 2 (canary capture automation) has immediate ROI because
it automates work happening every HJ iteration. Items 1, 3, 4, and 5 add
optional fields or template sections with no programmatic consumer yet, and
modifying skill files during an active HighJump cascade carries timing risk.

**Shipped now:** Item 2 — `scripts/capture-canary-evidence.mjs`

**Deferred:** Items 1, 3, 4, 5 — described below with implementation plan
snapshots so they can be picked up without re-deriving the design.

## Item 1: Advisory Labeling (`output_type` Handoff Field)

**Purpose:** Classify handoffs as advisory / steering / implementation / mixed
so the index can filter by output type.

**Implementation (ready to execute):**
- `scripts/build-index.mjs` `parseHandoff()`: extract `output_type` from YAML
  frontmatter, validate against `[advisory, steering, implementation, mixed]`,
  add to parsed object.
- `Docs/AGENTS/Policies/Handoff_Protocol.md`: add optional YAML field to
  unified template. Omitted = unclassified/legacy. No warnings for missing.
- Index row format: include `[output_type]` when present, omit for legacy.

**Trigger to implement:** when handoff volume makes filtering necessary, or
when a programmatic consumer (dashboard, skill) needs the field.

## Item 3: Failed-Attempt Recovery Field

**Purpose:** Index `failed_attempt_recovery` classification
(keep / amend / quarantine / revert / not_applicable) from handoff YAML so
repeated failure patterns are visible in the index.

**Implementation (ready to execute):**
- `scripts/build-index.mjs` `parseHandoff()`: extract
  `failed_attempt_recovery` from YAML frontmatter, validate against allowed
  values, add to parsed object.
- `Docs/AGENTS/Policies/Handoff_Protocol.md`: add optional YAML field.
  Required after validation failure; omit or `not_applicable` otherwise.
- `.claude/skills/debt-guard/SKILL.md` Phase 5: add note that the
  classification should also appear in handoff YAML frontmatter.
- Soft escalation: if repeated classifications occur for the same mechanism
  without a passing verifier, the handoff should summarize the trend.

**Trigger to implement:** when the HighJump cascade stabilizes and repeated
failure patterns need systematic tracking beyond ad-hoc lane documentation.

## Item 4: Work Envelope in Steer-Co Output

**Purpose:** Add a structured Work Envelope section to Steer-Co Captain-Facing
Output, defining what the Lead Developer may decide autonomously.

**Implementation (ready to execute):**
- `.claude/skills/steer-co/SKILL.md` Captain-Facing Output template: add
  Work Envelope section (In-scope, Out-of-scope, Escalation triggers, Success
  criteria) after `### Directions`.
- `.claude/skills/captain-deputy/SKILL.md`: reference sentence in Lead
  Developer coordination section.
- `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` section 3.0: add sentence
  noting Lead Developer owns routine implementation decisions within the
  envelope.

**Trigger to implement:** when Steer-Co output quality review happens at a
natural HighJump boundary, or when work-scope ambiguity causes an avoidable
escalation.

## Item 5: Retirement Accounting Improvements

**Purpose:** Strengthen the retirement ledger required block and add a
creation-time rule.

**Implementation (ready to execute):**
- `Docs/AGENTS/V2_Retirement_Ledger.md`: add rule 6 ("New rows must be added
  at mechanism creation time, not retroactively"). Extend required block with
  `Verifier:` and `Removal / merge / stabilization path:` fields.
- `Docs/AGENTS/Procedures/Consolidate_WIP.md`: add generic step to check
  active retirement/debt ledger rows for fired triggers during WIP cleanup.

**Trigger to implement:** when a retirement/merge audit is scheduled, or when
a retroactive row causes confusion.

## Constraints (apply to all deferred items)

- No V2-specific content in generic rules/skills/package.json.
- New YAML fields are optional and backward-compatible with existing handoffs.
- No build blockers or approval gates from new fields.
- All changes are measurement/template conventions, not authority changes.
