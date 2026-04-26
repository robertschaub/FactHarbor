# ACE Governance Re-Audit - Consolidated Result

**Status:** READY_FOR_REVIEW
**Created:** 2026-04-26
**Last Updated:** 2026-04-26
**Author Role:** Agents Supervisor

---

## Context

This document supersedes the actionable conclusions in `Docs/WIP/2026-04-26_ACE_Readiness_Review_And_Debate.md` for governance cleanup planning.

The earlier ACE review was useful but overconfident in several places. Codex rechecked the current skill files, collaboration rules, handoff corpus, and cited literature, then ran a standard `/debate` between an Advocate, Challenger, and Reconciler.

## References

- `Docs/WIP/2026-04-26_ACE_Readiness_Review_And_Debate.md`
- `Docs/AGENTS/Handoffs/2026-04-26_Agents_Supervisor_ACE_Readiness_Challenge.md`
- `.claude/skills/debt-guard/SKILL.md`
- `.claude/skills/context-extension/SKILL.md`
- `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`
- `Docs/AGENTS/Policies/Handoff_Protocol.md`
- MAST: https://arxiv.org/abs/2503.13657
- AgentIF: https://arxiv.org/abs/2505.16944
- MAS design patterns: https://arxiv.org/abs/2511.08475
- Agentic Context Engineering: https://arxiv.org/abs/2510.04618
- Fowler harness engineering: https://martinfowler.com/articles/harness-engineering.html
- OpenAI harness engineering: https://openai.com/index/harness-engineering/
- Addy Osmani agent harness engineering: https://addyosmani.com/blog/agent-harness-engineering/
- Atlan agent harness anti-patterns: https://atlan.com/know/agent-harness-failures-anti-patterns/

---

## Executive Decision

**Decision:** MODIFY the ACE review's cleanup recommendation.

Begin governance cleanup now, but limit Phase 1 to evidence-bounded stabilization:

1. Correct stale or overstated claims in the ACE review lineage.
2. Clarify governance ownership.
3. Capture initial `/debt-guard` compliance telemetry from the existing Phase 7 result blocks before designing a broader governance YAML schema.
4. Produce a reproducible dead-weight audit artifact before moving, deleting, or archiving sections.

Do **not** perform broad restructuring, archival, or deletion of `Multi_Agent_Collaboration_Rules.md` based only on citation counts or the earlier 44% estimate.

## Verified Facts

### Skill Amendments

All five original accepted exchange amendments are applied in current files:

| Amendment | Current status |
|---|---|
| D1 - Compact Path `Mechanism touched` field | Present at `.claude/skills/debt-guard/SKILL.md:67` |
| D2 - Concrete Phase 6 review triggers | Present at `.claude/skills/debt-guard/SKILL.md:314` |
| D3 - Compact worked mini-example | Present at `.claude/skills/debt-guard/SKILL.md:76` |
| C1 - `/wip-update` Overlap Gate row | Present at `.claude/skills/context-extension/SKILL.md:37` |
| C2 - `agent-exchange` supersession endpoint | Present at `.claude/skills/context-extension/SKILL.md:69` |

The ACE review's "D3" row is now a **new follow-up recommendation** for a Full Path example. It is not one of the original five amendments still awaiting application.

### Observability

The ACE review's claim of zero persisted debt-guard output is literally false. A corpus search found persisted `Debt-Guard Result` text in handoffs.

The corrected finding is narrower and still important: debt-guard evidence is sparse, inconsistent, and not machine-readable. That prevents reliable compliance measurement.

### Collaboration Rules

`Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` is a mixed document:

- It contains live role registry, model-tier guidance, WIP protocol, and links to authoritative handoff procedures.
- It also contains older startup guidance, formal workflow diagrams, long investigation templates, escalation templates, and a quality checklist that are rarely or never explicitly cited in current handoffs.
- Its footer says `Document Maintainer: Lead Architect`, while the Agents Supervisor role owns agent-governance maintenance.

That supports cleanup, but not blind archival.

## Literature Reconciliation

| Source | Correct application | Overclaim to avoid |
|---|---|---|
| MAST `2503.13657` | Supports concern about system-design, inter-agent, and task-verification failures in MAS traces. | Do not cite "79% specification/coordination" as a verified MAST number. Checked figures include 44.2/32.3/23.5 and 37.17/31.41/31.41 splits, depending on figure/table context. |
| AgentIF `2505.16944` | Supports that long, conditional, tool-heavy agent instructions are hard to follow; worked examples and executable checks help. | Do not use it as proof that one specific FactHarbor condition gate will fail without local telemetry. |
| MAS design patterns `2511.08475` | Supports Agent Evaluator as a known pattern: independent metric-based evaluation and governance of other agents. | Do not treat it as proven highest-leverage for FactHarbor; the pattern appears rarely in the surveyed corpus. |
| Agentic Context Engineering `2510.04618` | Supports structured incremental context updates to prevent context collapse. | Do not use it to justify broad archive/delete actions without a local audit. |
| Fowler/OpenAI/Osmani harness engineering | Supports guides, sensors, progressive disclosure, pruning, filesystem state, and verification loops. | Do not attribute exact "attractive nuisance" or "if the rule is not encoded, it does not exist" wording unless a primary source is found. |
| Atlan anti-patterns | Useful industry framing around invisible state, context drift, and failure observability. | Treat as lower-weight than peer-reviewed or primary engineering sources. |

## Debate Result

**Proposition:** FactHarbor should actively clean up and restructure its agent governance docs now, using the ACE readiness review plus Codex challenge findings as the basis for a consolidated cleanup plan.

**Tier:** Standard

### Reconciler Verdict

**Verdict:** MODIFY

Begin governance cleanup now, but limit the first phase to evidence-bounded stabilization, ownership clarification, telemetry design, and stale-status correction before any broad restructure, deletion, or archiving.

### Point Resolution

| Point | Winner | Reason |
|---|---|---|
| Cleanup need | Advocate | Verified duplication, ownership ambiguity, stale finding status, and weak compliance telemetry justify action now. |
| Cleanup basis | Challenger | The ACE review cannot be used unfiltered because it contains factual overclaims and unsupported literature attributions. |
| Scope control | Challenger | Section moves or deletion should wait for a durable corpus snapshot and classification table. |
| Immediate work | Advocate | Correcting stale finding status, clarifying ownership, and defining telemetry are low-risk and evidence-backed. |

### Rejected Arguments

- Reject blanket restructure now if it means archive/delete based on citation sparsity or overclaimed ACE findings.
- Reject "do nothing" because verified governance drift and telemetry gaps already meet the action threshold.

## Consolidated Recommendations

### P0 - Factual Stabilization

1. Mark the original ACE review as reviewed/superseded for action planning, or add a short pointer to this consolidated document.
2. Correct the D3 scope wherever the ACE review is used: original D3 is applied; Full Path example is a new follow-up.
3. Replace unsupported literature claims:
   - MAST: use category splits accurately and cite the specific figure/table context.
   - Harness engineering: cite guides/sensors/pruning/progressive disclosure, not unsupported exact phrases.
   - MAS design patterns: frame Agent Evaluator as a candidate pattern, not a proven top priority.

### P0 - Telemetry Before Enforcement

Use the existing `/debt-guard` Phase 7 result blocks as the first telemetry signal. For bugfix tasks that produce a handoff, the handoff must include the fenced `DEBT-GUARD RESULT` or `DEBT-GUARD COMPACT RESULT` block emitted by `/debt-guard`.

Implementation should start as passive parsing in `scripts/build-index.mjs` or `fhAgentKnowledge`, not as a failing gate. The parser should record which block was present and any simple `Label: value` fields it can extract. Do not infer noncompliance from absence until the team has reviewed a representative sample.

Defer a broader governance YAML schema until after the first telemetry sample shows which fields agents actually provide consistently.

### P1 - Collaboration Rules Audit

Before restructuring `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`, produce a reproducible audit artifact with:

- Commit hash and date.
- Corpus file list.
- Exact search patterns and commands.
- Section-by-section classification: `live`, `duplicate`, `load-on-demand reference`, `dormant`, `obsolete`, `owner-conflict`.
- False-positive notes.
- Proposed destination for each section.

Draft classification:

| Section | Current classification | Recommended action |
|---|---|---|
| Purpose | Live | Keep concise. |
| 1.1 Mandatory Knowledge Sources | Duplicate/live | Replace with pointer to `AGENTS.md` and `preflight_task`; keep only fallback note. |
| 1.2 Area-to-Documents Mapping | Load-on-demand reference | Keep or move to an indexed reference; do not delete until preflight coverage is proven. |
| 1.3 Role-to-Area Mapping | Mostly duplicate | Fold into role files or preflight metadata. |
| 1.4 WIP Folder Protocol | Live | Keep. |
| 1.5 Live Validation Hygiene | Live | Keep pointer. |
| 2 Role Registry | Live | Keep. |
| 3.1 Standard Feature Workflow | Dormant reference | Move to reference/procedure only after audit. |
| 3.2 Quick Fix Workflow | Live as debt-guard pointer | Keep short. |
| 3.3 Complex Investigation | Dormant reference | Merge with 3.4 decision guidance or move to reference. |
| 3.4 Multi-Agent Investigation | Load-on-demand reference, still useful | Preserve; consider moving to `Docs/AGENTS/Procedures/Multi_Agent_Investigation.md` with a short pointer. |
| 3.5 Role Handoff Protocol | Live pointer | Keep. |
| 4.1-4.5 Collaboration Document Protocol | Mixed reference | Preserve but consider moving templates to procedure docs. |
| 5 Global Rules | Live pointer | Keep. |
| 5.5 Documentation Sync | Live | Keep or move to `AGENTS.md` if it should bind all agents. |
| 6 Model-Class Guidelines | Live | Keep. |
| 7 Escalation Protocol | Dormant format, live concept | Keep as load-on-demand or move to policy doc; do not delete. |
| 8 Quality Checklist | Mostly obsolete | Replace with pointers to active verifier/test-cost rules and workflow-specific checks. |
| Footer maintainer | Owner conflict | Change maintainer to Agents Supervisor or split owner vs Captain. |

### P1 - Ownership Cleanup

Resolve governance ownership explicitly:

- Captain remains document owner/approver.
- Agents Supervisor maintains agent-governance docs.
- Lead Architect owns product architecture and technical design rules, not the agent governance corpus.

This should be reflected in `Multi_Agent_Collaboration_Rules.md` and role files if needed.

### P2 - Agent Evaluator

Do not introduce a weekly scheduled evaluator as the first move.

Instead:

1. Add passive telemetry to the handoff/index pipeline.
2. Review 2-4 weeks of telemetry.
3. If recurring compliance gaps appear, add an Agent Evaluator routine with a narrow checklist and explicit false-positive handling.

### P2 - Debt-Guard Full Path Example

Add one compact Full Path example only if it can stay short. The example should show:

- Evidence inventory.
- Causal classification.
- Complexity budget.
- Chosen fix family.
- Post-edit reconciliation.
- Result block.

Do not add a long walkthrough that makes `/debt-guard` harder to follow.

## Proposed Next Work Slices

1. **Slice A: ACE Review Correction**
   - Add a short supersession banner to `Docs/WIP/2026-04-26_ACE_Readiness_Review_And_Debate.md`.
   - Keep original debate history intact.
   - Point readers to this consolidated document for current recommendations.

2. **Slice B: Governance Telemetry Design**
   - Require `/debt-guard` Phase 7 result blocks in bugfix handoffs.
   - Update `build-index.mjs` or `fhAgentKnowledge` to parse those blocks passively.
   - Do not fail builds yet.

3. **Slice C: Reproducible Rules Audit**
   - Create a section inventory for `Multi_Agent_Collaboration_Rules.md`.
   - Record exact commands, corpus, and classifications.
   - Ask Captain before moving/deleting any section.

4. **Slice D: Rules Restructure**
   - Only after Slice C.
   - Convert `Multi_Agent_Collaboration_Rules.md` into a compact routing document.
   - Move long procedures/templates to named procedure docs with explicit load-on-demand status.

## Resolved Decisions

1. The original ACE review gets a short supersession banner while preserving the artifact body unchanged.
2. Initial telemetry lives in existing `/debt-guard` fenced result blocks in handoff files. Broader YAML governance metadata is deferred.
3. `Multi_Agent_Collaboration_Rules.md` names Robert Schaub / Captain as owner and Agents Supervisor as maintainer.

## Review Log

| Date | Reviewer Role | Assessment | Comments |
|---|---|---|---|
| 2026-04-26 | Agents Supervisor / Codex GPT-5 | MODIFY | Cleanup is justified, but must start with stabilization, telemetry, and reproducible audit before broad restructuring. |

## Decision Record

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-26 | Accepted GPT re-audit corrections and adopted `MODIFY` path | The corrections were accepted by Captain review: stabilize first, avoid literature overclaims, treat Agent Evaluator as P2, and require reproducible audit before restructure. |
| 2026-04-26 | Use debt-guard result blocks as first telemetry format | Existing `/debt-guard` Phase 7 blocks are simpler than introducing new governance YAML before seeing real usage data. |
| 2026-04-26 | Captain owner + Agents Supervisor maintainer for collaboration rules | Keeps approval authority with Captain while matching the Agents Supervisor role's governance-maintenance responsibility. |
