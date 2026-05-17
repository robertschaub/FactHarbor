# ACE Readiness Review & Adversarial Debate — FactHarbor Agent Framework

**Date:** 2026-04-26
**Status:** READY_FOR_REVIEW
**Roles:** Agents Supervisor + LLM Expert (Claude Opus 4.6)
**Debate agents:** Challenger (Claude Opus 4.7), Advocate (Claude Sonnet 4.6)
**Reconciler:** Claude Opus 4.6

---

> **Supersession note (2026-04-26):** This review is preserved as the original Claude review/debate artifact, but its actionable cleanup recommendations have been superseded by `Docs/WIP/2026-04-26_ACE_Governance_Reaudit_Consolidated.md`. The consolidated re-audit corrects the D3 scope, debt-guard observability claim, 44% dead-weight methodology, and literature attributions, and changes the recommended path from broad restructure to staged stabilization, telemetry, and reproducible audit.

---

## 1. Scope

Review and adversarial debate of:

1. Two new skills: `/debt-guard` and `/context-extension` (created 2026-04-26 by Codex GPT-5)
2. ACE (Augmented Code Engineering) readiness of the full agent governance framework
3. Deep audit of `Multi_Agent_Collaboration_Rules.md` actual vs. prescribed usage
4. Literature-backed improvements from multi-agent SE research

---

## 2. Skill Reviews

### 2.1 `/debt-guard` — Mandatory Bugfix Complexity Guard

**Verdict:** ACCEPTED with 3 targeted amendments

| # | Finding | Severity | Amendment | Status |
|---|---|---|---|---|
| D1 | Compact Path self-report gaming — `Net mechanisms: increases` is self-assessed with no falsifiable anchor | HIGH | Add `Mechanism touched: <function/file:line>` field to Compact Path output block | Applied by Codex in `8ab00f01` follow-up |
| D2 | Phase 6 review trigger too vague — "non-trivial changes" has no operationalized threshold | MEDIUM | Replace with concrete criteria: `Net mechanisms` increases, `failed-attempt recovery`, cross-stage boundary | Applied by Codex |
| D3 | No Full Path worked example (Compact Path example exists at lines 78-86) | MEDIUM | Add a Full Path example covering phases 0-7 for a realistic multi-file bug | Open — low urgency |

**Deferred:** D4 (ultrathink position, LOW), D5 (build verifier tier command, LOW)

**Literature support:**
- [ACE (arXiv 2507.03536)](https://arxiv.org/abs/2507.03536): LLM self-assessment of refactoring correctness is unreliable; independent validation required → confirms D1
- [AgentIF Benchmark](https://keg.cs.tsinghua.edu.cn/persons/xubin/papers/AgentIF.pdf): Condition-based constraints (~43% of agent instructions) are the most commonly missed → confirms D1's 7-condition Compact Path gate risk
- [Multi-Agent Debate for Requirements (arXiv 2507.05981)](https://arxiv.org/abs/2507.05981): Debate improves quality only with concrete evaluation criteria, not vague triggers → confirms D2

### 2.2 `/context-extension` — Session Working Memory & Agent Exchange

**Verdict:** ACCEPTED with 2 targeted amendments

| # | Finding | Severity | Amendment | Status |
|---|---|---|---|---|
| C1 | Overlap Gate missing `/wip-update` row | MEDIUM | Add row: `Consolidate WIP or archive completed work / /wip-update / Checkpoint only if long-running` | Applied by Codex |
| C2 | `agent-exchange` retention has no endpoint for external receivers | MEDIUM | Add: "If no receiving agent acts within the current task, originating agent marks it `superseded` at completion" | Applied by Codex |

**Rejected:** C3 (artifact age, LOW), C4 (Codex-specific mirror note, LOW), C5 (template missing — false positive)

**Literature support:**
- [Agentic Context Engineering (arXiv 2510.04618)](https://arxiv.org/html/2510.04618v1): Unstructured iterative rewriting causes "context collapse" — details erode across sessions → confirms C2 endpoint gap

---

## 3. ACE Readiness Assessment

### 3.1 Scorecard

| # | Dimension | Score | Notes |
|---|---|---|---|
| 1 | Role Clarity & Specialization | A | 11 roles, alias tables, preflight_task auto-detection, per-role anti-patterns |
| 2 | Workflow Structure | A | 4 workflow patterns; hub-and-spoke used informally (internalized, not cited) |
| 3 | Quality Guardrails | A | /debt-guard, Failed-Attempt Recovery, LLM Intelligence mandate, multilingual robustness |
| 4 | Knowledge Continuity | A- | preflight_task → handoff → learnings pipeline; /context-extension adds missing middle layer |
| 5 | Cross-Tool Portability | B+ | 7+ IDE integrations, plain-markdown skills, cross-tool notes; slash-command syntax is tool-specific but pragmatically bridged |
| 6 | Safety & Blast Radius Control | B+ | 4-level escalation tiers, hard stops, test-cost gating; bypassPermissions is conscious solo-dev tradeoff |
| 7 | Adversarial Review & Debate | A | /debate with evidence-bundle requirement; cross-model review learning; transport envelope |
| 8 | Observability & Feedback Loops | **B-** | Good qualitative (handoffs, learnings, Agent_Outputs.md); zero quantitative measurement; zero persisted debt-guard structured outputs |
| | **Overall** | **A-** | |

**Observability downgrade rationale (B → B-):** Challenger found zero `DEBT-GUARD RESULT` or `COMPACT DEBT-GUARD` strings persisted anywhere in `Docs/`. The skill's structured output blocks are either never produced or never persisted. Without traces, compliance is unmeasurable. Both MAST taxonomy and Atlan anti-pattern research identify absent observability as a top-tier failure enabler.

### 3.2 Infrastructure Inventory

| Category | Count | Lines |
|---|---|---|
| Agent instruction files | 12 | ~1,050 |
| Skills (.claude + cross-tool) | 16 | ~3,844 |
| Defined roles | 11 | ~716 |
| Policy documents | 3 | ~200 |
| Core collaboration docs | 4 | ~3,701 |
| Handoff files | 382 | ~7,852+ (index) |
| MCP knowledge tools | 9 | via fhAgentKnowledge |
| Cross-tool wrappers | 7+ | IDE-specific configs |

---

## 4. Multi_Agent_Collaboration_Rules.md Deep Audit

### 4.1 Usage Evidence

**April 2026: 381 handoffs analyzed.**

| Signal | Count | Verdict |
|---|---|---|
| Formal workflow cited (§3.1-3.4) | 0 | Never cited explicitly |
| Captain commands used (INVESTIGATE, CONSOLIDATE, etc.) | 0 | Never invoked formally |
| Area-to-Documents mapping (§1.2) referenced | 0 | Superseded by preflight_task |
| Quality Checklist (§8) run | 0 | Replaced by skill-integrated verification |
| Escalation Protocol (§7) formal format used | 0 | Agents escalate informally |
| Role activation via §2 | Active | Via Handoff_Protocol.md + preflight_task |
| Model-Class Guidelines (§6) | Active implicitly | Consumed via skills and preflight |
| Hub-and-spoke pattern (§3.4) | Used informally | April WIP files follow spoke pattern without citing §3.4 |

### 4.2 Section-by-Section Status

| Section | Lines | Status | Evidence |
|---|---|---|---|
| §1.1 Mandatory Knowledge Sources | ~15 | Live | preflight_task uses internally |
| §1.2 Area-to-Documents Mapping | ~15 | **Superseded** | Zero citations; preflight_task resolves dynamically |
| §1.3 Role-to-Area Mapping | ~15 | **Superseded** | Zero citations; roles discovered by task context |
| §1.4 WIP Folder Protocol | ~5 | Live | Agents follow correctly |
| §1.5 Live Validation Hygiene | ~5 | Live | Procedure doc referenced directly |
| §2 Role Registry | ~20 | Live | Compact index table, accurate |
| §3.1 Standard Feature Workflow | ~30 | **Dead** | Never cited or instantiated |
| §3.2 Quick Fix Workflow | ~12 | **Absorbed** | /debt-guard replaced this |
| §3.3 Complex Investigation | ~10 | **Dead** | Never used |
| §3.4 Multi-Agent Investigation | ~170 | **Informally alive** | Spoke pattern followed without citation; well-designed protocol |
| §3.5 Role Handoff Protocol | ~8 | Live | Points to Handoff_Protocol.md |
| §4.1 Naming Convention | ~10 | Live | WIP naming followed |
| §4.2 Document Structure template | ~35 | **Rarely followed** | WIP docs use ad-hoc structure |
| §4.3 Concurrent Editing | ~5 | Live | Spoke-file separation followed |
| §4.4 Review Comment Format | ~20 | **Dead** | Replaced by /debate skills |
| §4.5 Investigation Template | ~130 | **Dormant** | Used once Feb 2026; well-designed but rarely needed |
| §5 Global Rules | ~20 | Live | Clean cross-references to AGENTS.md |
| §6 Model-Class Guidelines | ~60 | **Live implicitly** | Consumed via skills and preflight |
| §6.4-6.5 Skill tier guidance | ~15 | Live | Debt-guard and debate tier specs |
| §7 Escalation Protocol | ~40 | **Dead formally** | Concept alive, format never used |
| §8 Quality Checklist | ~15 | **Dead** | Replaced by skill-integrated verification |

### 4.3 Severity Upgrade

**Original assessment:** 44% dead weight, cleanup recommendation.
**Post-debate assessment:** Severity upgraded to **HIGH** based on harness engineering literature.

Harness Engineering (Fowler 2025, Osmani 2026, OpenAI 2025) warns that stale governance docs are an "attractive nuisance" — agents parse them, allocate context tokens, and may attempt to follow outdated protocols inconsistently. Berkeley's MAST taxonomy (arXiv 2503.13657) shows specification ambiguity is the #1 failure category (79% of multi-agent failures). Dead sections are not merely inefficient; they are actively hazardous specification noise.

### 4.4 Recommendation

**Restructure, don't just trim.** Move dead/dormant sections to `Docs/ARCHIVE/Formal_Workflow_Reference.md` with an explicit "agents must not read archived governance sections" directive. Keep §2, §3.2+3.4+3.5, §5, §6. Target: ~400 lines of living content.

---

## 5. Literature Corpus

| Paper/Source | Key Finding | Applies to |
|---|---|---|
| [MAST: Multi-Agent Failure Taxonomy (Berkeley, arXiv 2503.13657)](https://arxiv.org/abs/2503.13657) | 79% of multi-agent failures are specification/coordination failures; undetectable at individual agent level | Collab rules audit, observability, Agent Evaluator |
| [Harness Engineering (Fowler 2025)](https://martinfowler.com/articles/harness-engineering.html) | Stale governance is an "attractive nuisance"; "if the rule isn't encoded, it doesn't exist" | Dead-weight severity upgrade, executable governance |
| [Agent Harness Engineering (Osmani 2026)](https://addyosmani.com/blog/agent-harness-engineering/) | Periodic cleanup agents recommended for documentation consistency | Monthly governance audit |
| [Harness Engineering (OpenAI 2025)](https://openai.com/index/harness-engineering/) | Policy must be executable, not merely documented | Executable governance |
| [ACE: Validated LLM Refactorings (arXiv 2507.03536)](https://arxiv.org/abs/2507.03536) | LLM self-assessment unreliable; independent validation required | D1 self-report gaming |
| [Agentic Context Engineering (arXiv 2510.04618)](https://arxiv.org/html/2510.04618v1) | "Context collapse" from unstructured iterative rewriting | C2 endpoint, governance restructuring |
| [LLM Agent Evaluation Survey (arXiv 2503.16416)](https://arxiv.org/abs/2503.16416) | <30% perfect instruction-following in complex agentic scenarios | D3 worked examples |
| [AgentIF Benchmark](https://keg.cs.tsinghua.edu.cn/persons/xubin/papers/AgentIF.pdf) | Condition-based constraints (43% of instructions) most commonly missed | D1 Compact Path conditions |
| [MAS Design Patterns (arXiv 2511.08475)](https://arxiv.org/html/2511.08475v1) | "Agent Evaluator" pattern: independent role auditing outputs with metric-based governance | Agent Evaluator recommendation |
| [Multi-Agent Debate for RE (arXiv 2507.05981)](https://arxiv.org/abs/2507.05981) | Debate works only with concrete evaluation criteria | D2 review trigger |
| [Agent Harness Anti-Patterns (Atlan 2026)](https://atlan.com/know/agent-harness-failures-anti-patterns/) | Self-assessment without external verification is known reliability gap | Observability |
| [Agentic AI Maturity Model (Arsanjani 2026)](https://dr-arsanjani.medium.com/ai-in-2026-predictions-mapped-to-the-agentic-ai-maturity-model-c6f851a40ef5) | Governance/audit trails gate Level 3 → Level 4 maturity | Overall ACE readiness |
| [Multi-Agent AI Architecture Patterns (Augment Code)](https://www.augmentcode.com/guides/multi-agent-ai-architecture-patterns-enterprise) | Role clarity reduces coordination failures | Role Clarity A score |

---

## 6. Prioritized Recommendations (Final)

| # | Recommendation | Source | Effort | Impact |
|---|---|---|---|---|
| 1 | **Add Agent Evaluator routine** — weekly `/schedule` agent auditing recent handoffs for compliance signals (debt-guard blocks, required fields, terminology) | MAST taxonomy, MAS Design Patterns | Medium | HIGH |
| 2 | **Restructure collab rules** — move dead sections to `Docs/ARCHIVE/` with "do not read" directive; keep living sections; target ~400 lines | Harness Engineering (Fowler/Osmani/OpenAI) | Low | HIGH |
| 3 | **Make debt-guard enforceable** — require structured output blocks in handoff files for bugfix tasks; validate in handoff index generation | Harness Engineering ("if not encoded, doesn't exist") | Low | HIGH |
| 4 | **Automate wrapper sync** — validation script checking cross-tool trigger text matches canonical skills | Session finding, confirmed by debate | Low | MEDIUM |
| 5 | **Add Full Path worked example** to debt-guard (Compact example exists) | AgentIF benchmark, D3 corrected scope | Low | MEDIUM |
| 6 | **Schedule monthly governance audit** — routine running dead-weight analysis against handoff evidence | Harness Engineering, Agentic Context Engineering | Low | MEDIUM |
| 7 | **Stale learning flagging** — structured `staleness_flag` field in Role_Learnings.md + cleanup in monthly audit | Session finding + MR-3 | Low | LOW |

---

## 7. Debate Reconciliation Log

| # | Challenge | Challenger (Opus 4.7) | Advocate (Sonnet 4.6) | Reconciled |
|---|---|---|---|---|
| CH-1 | D1 may already be implemented | Amendment applied by Codex after exchange artifact | Finding was correct when made | VALID — verify current file state |
| CH-2 | "44% dead weight" understates risk | Upgrade to HIGH; stale docs are "attractive nuisance" | Restructure (linked appendix), don't delete | UPGRADE to HIGH; archive with "do not read" directive |
| CH-3 | Observability B too generous | Downgrade to C+; zero persisted structured outputs | B is fair given qualitative infrastructure | DOWNGRADE to B-; mandate persisted structured outputs |
| CH-4 | D3 "no worked example" partially wrong | Compact example exists at lines 78-86 | Gap is Full Path example specifically | CORRECT scope to "no Full Path example" |
| CH-5 | Cross-Tool B+ ignores structural gap | Slash commands are tool-specific; protocol-driven is better | Cross-tool notes pragmatically bridge the gap | KEEP B+; pragmatic for solo-dev; revisit if >10 tools |
| CH-6 | Hub-and-spoke §3.4 is not dead | April WIP files follow spoke pattern without citation | Zero citations ≠ zero usage | CORRECT: "informally alive, internalized without citation" |

---

## 8. For Next Agent

- Verify D1/D2/D3 amendments are applied in current `.claude/skills/debt-guard/SKILL.md` (Codex handoff: `2026-04-26_Agents_Supervisor_Skill_Review_Amendments.md`)
- Verify C1/C2 amendments are applied in current `.claude/skills/context-extension/SKILL.md`
- When implementing Recommendation 2 (collab rules restructure), preserve §3.4 hub-and-spoke in full — it's informally alive and well-designed
- Recommendation 1 (Agent Evaluator) is the highest-leverage new capability; implement as a `/schedule` routine before adding more skills or roles
- The literature corpus in §5 should be saved as a reference for future governance reviews
