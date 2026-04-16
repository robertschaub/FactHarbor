# FactHarbor Multi-Agent Meta-Prompt Template

**Version:** 1.0
**Date:** 2026-02-03

---

## How to Use

Two options depending on task complexity:

### Quick-Start (for simple/moderate tasks)

Most tasks only need a one-liner. The "As \<Role\>" pattern triggers the Role Activation Protocol in AGENTS.md:

```
As {ROLE}, {one-sentence task}.
Area: {area from Multi_Agent_Collaboration_Rules.md §1.2}
Complexity: {simple|moderate|complex}
```

**Examples:**
```
As Senior Developer, fix the confidence calibration test that's failing on edge cases.
Area: Calculations
Complexity: simple
```

```
As LLM Expert, investigate why verdict confidence is consistently too high on controversial topics.
Area: Prompts, Calculations
Complexity: moderate
```

```
As Tech Writer, update the Architecture Overview to reflect the new grounding-check module.
Area: Documentation
Complexity: simple
```

### Captain's Assignment Checklist

Agents self-serve context from `Docs/AGENTS/Agent_Outputs.md`, the handoff index, and `Docs/AGENTS/Handoffs/` (per Agent Exchange Protocol in AGENTS.md). The Captain only needs to provide what agents **cannot** find themselves:

| Complexity | Captain Provides | Agent Self-Serves |
|------------|-----------------|-------------------|
| **Simple** | Role + instruction | Recent outputs, role learnings, index lookup |
| **Moderate** | + Area (if ambiguous) | + Previous agent's outputs, WIP docs, index lookup |
| **Complex** | + Constraints + acceptance criteria | + Full handoff chain, related WIP docs, index lookup |
| **Investigation** | + Observed symptoms + expected vs actual | + All spoke files, hub document, index lookup |

**Index lookup** (all complexity levels): Before reading handoffs by filename, query `Docs/AGENTS/index/handoff-index.json` — filter by `role` and `topics` to get the 3–5 most relevant files directly. Saves ~3,000 tokens vs listing the full directory. If the file does not exist, fall back to scanning `Docs/AGENTS/Handoffs/` directly.

**Minimal dispatch examples:**
```
As Lead Developer, continue the claim fidelity work.
```
(Agent reads Agent_Outputs.md, finds the previous entry, picks up context.)

```
As Code Reviewer, review the changes in the last commit.
```
(Agent reads git log + Agent_Outputs.md for what was done and why.)

**Only add context when** the agent can't find it: verbal decisions not yet written down, external requirements, or when overriding a previous agent's direction.

### Full Template (for complex/multi-agent tasks)

Copy the template below and fill in the `{PLACEHOLDERS}`. Use this for complex tasks or when multiple agents will collaborate on the same work.

---

# META-PROMPT TEMPLATE

```markdown
# FactHarbor Task Assignment

## Your Role
**Role:** {ROLE}
<!-- Options: Lead Architect | Lead Developer | Senior Developer | Technical Writer | LLM Expert | Product Strategist | Code Reviewer | Security Expert | DevOps Expert | Agents Supervisor -->

---

## Task Information

**Task Title:** {TASK_TITLE}
<!-- Brief descriptive title -->

**Area:** {AREA}
<!-- Options: Prompts | Calculations | Configuration | Context-Detection | Source-Reliability | Pipeline | UI | Testing | Schema | Deployment -->
<!-- Or leave blank for agent to identify relevant documents -->

**Complexity:** {COMPLEXITY}
<!-- Options: Low | Medium | High | Investigation -->

---

## Goals

{GOALS}
<!--
Describe what needs to be accomplished. Be specific.
Example:
- Design the Shadow Mode architecture for A/B testing LLM prompts
- Ensure backward compatibility with existing pipeline
- Document trade-offs between options
-->

---

## Constraints & Context

{CONSTRAINTS}
<!--
Any specific constraints, deadlines, or context.
Example:
- Must not increase LLM costs by more than 10%
- Must work with existing UCM configuration system
- Related to issue #123
-->

---

## Deliverables

{DELIVERABLES}
<!--
What outputs are expected. Two categories:
- Formal documents (design, review, investigation) → Docs/WIP/
- Task completion outputs → per Agent Exchange Protocol (AGENTS.md)
Example:
- Architecture document in Docs/WIP/
- Mermaid diagrams showing data flow
- Risk assessment section
- Task completion output per Agent Exchange Protocol (AGENTS.md)
-->

---

## Workflow Phase

**Current Phase:** {PHASE}
<!-- Options: Planning | Review Round 1 | Implementation | Code Review | Finalization -->

**Previous Documents:**
{PREVIOUS_DOCS}
<!--
List any existing documents this task builds on.
Example:
- Docs/WIP/Shadow_Mode_Architecture.md (Draft by Lead Architect)
-->

---

## MANDATORY

Read and follow `/Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`

---

{ADDITIONAL_INSTRUCTIONS}
<!--
Any final task-specific instructions.
Example:
- Start by reading the existing draft in Docs/WIP/Shadow_Mode_Architecture.md
- Focus on database performance implications
- Coordinate with the LLM Expert review
-->

---

Now proceed with your task as {ROLE}.
```

---

# QUICK-START EXAMPLES

## Example 1: Lead Architect - Design Task

```markdown
# FactHarbor Task Assignment

## Your Role
**Role:** Lead Architect

---

## Task Information
**Task Title:** Shadow Mode Architecture Design
**Area:** Configuration, Pipeline
**Complexity:** High

---

## Goals
- Design a Shadow Mode system for A/B testing LLM prompts
- Allow running new prompts in parallel without affecting production results
- Provide comparison metrics between shadow and production outputs
- Integrate with existing UCM configuration system

---

## Constraints & Context
- Must not increase per-analysis LLM costs by more than 15%
- Shadow results should be stored for later analysis
- Must work with the ClaimAssessmentBoundary pipeline

---

## Deliverables
- Architecture document with Mermaid diagrams
- Data model for shadow results storage
- Integration points with UCM
- Cost/complexity trade-off analysis

---

## Workflow Phase
**Current Phase:** Planning
**Previous Documents:** None (new initiative)

---

## MANDATORY

Read and follow `/Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`

---

Now proceed with your task as Lead Architect.
```

---

## Example 2: LLM Expert - Investigation Task

```markdown
# FactHarbor Task Assignment

## Your Role
**Role:** LLM Expert

---

## Task Information
**Task Title:** Report Quality Regression Analysis
**Area:** Prompts, Context-Detection
**Complexity:** Investigation

---

## Goals
- Analyze why report quality has degraded after recent terminology cleanup
- Identify specific prompts or code changes that may have caused issues
- Assess whether ClaimAssessmentBoundary vs EvidenceScope distinction (including legacy AnalysisContext carryover) is causing problems
- Propose solutions to restore quality while maintaining correct terminology

---

## Constraints & Context
- Issues observed:
  - Contexts that should be detected are missed
  - Tangential contexts are being used
  - Counter-evidence directionality sometimes wrong
  - "Contested" used where should be "doubted"
- Recent changes: terminology cleanup, removed specific wording from prompts

---

## Deliverables
- Deep analysis document with findings
- Entity relationship diagrams showing how concepts flow through pipeline
- Specific recommendations for prompt improvements
- Before/after comparison of affected prompts

---

## Workflow Phase
**Current Phase:** Investigation (precedes Planning)
**Previous Documents:**
- Docs/WIP/lexicon-to-llm-migration.md (related work)

---

## MANDATORY

Read and follow `/Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`

---

Now proceed with your task as LLM Expert.
```

---

# DOCUMENT TYPE REFERENCE

**Formal documents** (live in `Docs/WIP/` during active work):

| Document Type | Purpose | Typical Author |
|---------------|---------|----------------|
| `_Plan.md` | Implementation plan with steps | Lead Developer |
| `_Architecture.md` | Design proposals, data models | Lead Architect |
| `_Review.md` | Review comments and feedback | Any reviewer |
| `_Analysis.md` | Investigation findings | Any analyst |
| `_Implementation_Report.md` | Formal post-implementation review (Captain-requested) | Senior Developer |
| `_Code_Review.md` | Code review findings | Lead Developer |
| `_Doc_Review.md` | Documentation review | Technical Writer |

**Agent exchange outputs** (live in `Docs/AGENTS/`):

| Document Type | Purpose | Location |
|---------------|---------|----------|
| `Agent_Outputs.md` entry | Standard task completion log | `Docs/AGENTS/Agent_Outputs.md` |
| `_Handoff.md` | Significant task completion or role handoff | `Docs/AGENTS/Handoffs/` |

Routine task completions use the Agent Exchange Protocol (`AGENTS.md`), not `_Implementation_Report.md` in WIP.

---

## Related Documents

- [Multi-Agent Collaboration Rules](./Multi_Agent_Collaboration_Rules.md) - Full rules and role definitions
- [GlobalMasterKnowledge for xWiki](./GlobalMasterKnowledge_for_xWiki.md) - XWiki-specific protocols

---

**Document Maintainer:** Lead Architect
**Last Reviewed:** 2026-03-23
