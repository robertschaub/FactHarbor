# FactHarbor Multi-Agent Collaboration Rules

**Version:** 2.0
**Date:** 2026-03-17
**Status:** Active
**Owner:** Robert Schaub

---

## Purpose

This document defines the rules, roles, and workflow for multi-agent collaboration on FactHarbor development tasks. It establishes a structured approach where multiple LLM agents (via Claude Code, Cursor, Cline, Gemini CLI, GitHub Copilot, and other tools) work collaboratively through defined roles to plan, review, implement, and validate changes.

---

## 1. Global References

All agents MUST read and adhere to these foundational documents before starting any task:

### 1.1 Mandatory Knowledge Sources

| Document | Location | Purpose |
|----------|----------|---------|
| **AGENTS.md** | `/AGENTS.md` | Fundamental coding rules, architecture reference, safety rules |
| **GEMINI.md** | `/GEMINI.md` | Gemini CLI-specific instructions and foundational mandates |
| **Coding Guidelines** | `/Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Guidelines/Coding Guidelines/WebHome.xwiki` | Code quality standards, testing requirements, prompt engineering |
| **Terminology Reference** | `/Docs/xwiki-pages/FactHarbor/Product Development/Specification/Reference/Terminology/WebHome.xwiki` | Authoritative glossary for all technical terms |
| **Architecture Overview** | `/Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/System Design/WebHome.xwiki` | System architecture, data models, component interactions |
| **Current Status** | `/Docs/STATUS/Current_Status.md` | Current implementation status and known issues |

### 1.2 Area-to-Documents Mapping

When a task specifies an **Area**, read the corresponding documents:

| Area | Required Documents |
|------|-------------------|
| **Prompts** | `/Docs/ARCHITECTURE/Prompt_Architecture.md`, `/Docs/xwiki-pages/FactHarbor/Product Development/Specification/Reference/Prompt Engineering/Provider-Specific Formatting/WebHome.xwiki`, `/Docs/xwiki-pages/FactHarbor/Product Development/Specification/Reference/Prompt Engineering/Prompt Guidelines/WebHome.xwiki` |
| **Calculations** | `/Docs/ARCHITECTURE/Calculations.md`, `/Docs/ARCHITECTURE/Evidence_Quality_Filtering.md` |
| **Configuration** | `/Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Subsystems and Components/Unified Config Management/WebHome.xwiki`, `/Docs/USER_GUIDES/UCM_Administrator_Handbook.md` |
| **Context-Detection** | `/Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Guidelines/Scope Definition Guidelines/WebHome.xwiki`, `/Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Context Detection/WebHome.xwiki` |
| **Source-Reliability** | `/Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Source Reliability/WebHome.xwiki` |
| **Pipeline** | `/Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Pipeline Variants/WebHome.xwiki`, `/Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/AKEL Pipeline/WebHome.xwiki` |
| **UI** | `/Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/KeyFactors Design/WebHome.xwiki` |
| **Testing** | `/Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Guidelines/Testing Strategy/WebHome.xwiki`, `/Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Tooling/Promptfoo Testing/WebHome.xwiki`, `/Docs/AGENTS/Procedures/Live_Validation_Hygiene.md` |
| **Schema** | `/Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Schema Migration/WebHome.xwiki`, `/Docs/xwiki-pages/FactHarbor/Product Development/Specification/Reference/Data Models and Schemas/Metrics Schema/WebHome.xwiki` |
| **Deployment** | `/Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Deployment/Zero-Cost Hosting Implementation Guide/WebHome.xwiki` |
| **Documentation** | `/Docs/AGENTS/Roles/Technical_Writer.md`, `/Docs/xwiki-pages/README.md`, `/Docs/xwiki-pages/scripts/WORKFLOW.md` |

**If no Area is specified:** Agent should intelligently identify relevant documents based on the task description.

### 1.3 Role-to-Area Mapping

When activated in a role, use this table to identify which areas are within your scope:

| Role | Primary Areas | Secondary Areas |
|------|--------------|-----------------|
| Lead Architect | Pipeline, Schema, Configuration | All (architecture oversight) |
| Lead Developer | All code areas | Testing, Deployment |
| Senior Developer | (assigned per task) | Testing |
| Technical Writer | Documentation | All (docs for any area) |
| LLM Expert | Prompts, Calculations | Pipeline, Testing |
| Product Strategist | — (no code area) | UI, Configuration |
| Code Reviewer | (assigned per task) | Testing |
| Security Expert | Deployment, Configuration | Pipeline, Schema |
| DevOps Expert | Deployment | Testing, Configuration |

### 1.4 WIP Folder Protocol

- **Location:** `/Docs/WIP/`
- **Purpose:** Design documents, plans, reviews in progress, and Investigation hub/spoke files (§3.4)
- **NOT for agent completion outputs.** Task completions and role handoffs use the Agent Exchange Protocol in `AGENTS.md` → `Docs/AGENTS/Agent_Outputs.md` or `Docs/AGENTS/Handoffs/`
- **On Completion:** Move finalized documents to an appropriate `Docs/` subfolder or `Docs/ARCHIVE/`

### 1.5 Live Validation Hygiene

For localhost experiments involving code changes, UCM activation, prompt reseeds,
or interpretation of live job results, follow:

- `/Docs/AGENTS/Procedures/Live_Validation_Hygiene.md`

This is the authority for restart expectations, prompt/config activation timing,
job-hash interpretation, and "mechanism fired vs run variance" checks.

---

## 2. Role Registry

> **Activation:** When the user says "As \<Role\>", look up the role alias in `AGENTS.md` → Role Activation Protocol, then read your role's file from `Docs/AGENTS/Roles/`.
>
> **Lite mode:** Lightweight models with limited context — see §6.3 for a graduated loading strategy that defers non-essential reads.

| # | Role | Aliases | File |
|---|------|---------|------|
| 2.1 | Lead Architect | Senior Architect, Principal Architect | [Roles/Lead_Architect.md](Roles/Lead_Architect.md) |
| 2.2 | Lead Developer | — | [Roles/Lead_Developer.md](Roles/Lead_Developer.md) |
| 2.3 | Senior Developer | — | [Roles/Senior_Developer.md](Roles/Senior_Developer.md) |
| 2.4 | Technical Writer | Tech Writer, xWiki Expert, xWiki Developer | [Roles/Technical_Writer.md](Roles/Technical_Writer.md) |
| 2.5 | LLM Expert | FH Analysis Expert, AI Consultant | [Roles/LLM_Expert.md](Roles/LLM_Expert.md) |
| 2.6 | Product Strategist | Product Manager, Product Owner, Sponsor | [Roles/Product_Strategist.md](Roles/Product_Strategist.md) |
| 2.7 | Code Reviewer | — | [Roles/Code_Reviewer.md](Roles/Code_Reviewer.md) |
| 2.8 | Security Expert | — | [Roles/Security_Expert.md](Roles/Security_Expert.md) |
| 2.9 | DevOps Expert | GIT Expert, GitHub Expert | [Roles/DevOps_Expert.md](Roles/DevOps_Expert.md) |
| 2.10 | Captain | *(Human role — not assignable to agents)* | [Roles/Captain.md](Roles/Captain.md) |
| 2.11 | Agents Supervisor | AI Supervisor | [Roles/Agents_Supervisor.md](Roles/Agents_Supervisor.md) |

---

## 3. Workflow Patterns

> **Usage:** The 5-phase workflow below is active for complex or risky tasks. For simple changes, use the Quick Fix Workflow (3.2).
>
> **Pre-task fitness check:** Before starting any workflow, every agent must verify that their current role and LLM model tier are appropriate for the task. If not, inform the Captain and propose a better fit. See the Agent Handoff Protocol in `/AGENTS.md` and Model-Class Guidelines in §6.

### 3.1 Standard Feature Workflow

```mermaid
flowchart TB
    subgraph Phase1["Phase 1: Planning"]
        P1[Lead Architect<br/>Creates Design Proposal]
        P2[Lead Developer<br/>Reviews Feasibility]
        P3[LLM Expert<br/>Reviews Prompt Impact]
    end

    subgraph Phase2["Phase 2: Review Round 1"]
        R1[All Reviewers<br/>Add Comments to Plan]
        R2[Lead Architect<br/>Revises Based on Feedback]
    end

    subgraph Phase3["Phase 3: Implementation"]
        I1[Senior Developer<br/>Implements Changes]
        I2[Senior Developer<br/>Writes Tests]
    end

    subgraph Phase4["Phase 4: Code Review"]
        CR1[Lead Developer<br/>Code Review]
        CR2[Technical Writer<br/>Doc Review]
    end

    subgraph Phase5["Phase 5: Finalization"]
        F1[Senior Developer<br/>Applies Fixes]
        F2[Lead Developer<br/>Final Approval]
    end

    P1 --> P2 --> P3 --> R1 --> R2 --> I1 --> I2 --> CR1 --> CR2 --> F1 --> F2
```

### 3.2 Quick Fix Workflow

For small, well-understood changes:

1. **Senior Developer** proposes fix with rationale
2. **Lead Developer** reviews and approves
3. **Senior Developer** implements
4. **Lead Developer** verifies

### 3.3 Complex Investigation Workflow

For issues requiring deep analysis by a **single investigator** with sequential review:

1. **LLM Expert** or **Lead Architect** investigates root cause
2. **Lead Developer** validates findings
3. **Lead Architect** proposes solution options
4. **All roles** discuss trade-offs (async via document)
5. Proceed to Standard Feature Workflow

> **§3.3 vs §3.4:** Use §3.3 when one expert can investigate and the team reviews sequentially. Use §3.4 when you want **independent parallel perspectives** from multiple agents on the same problem.

### 3.4 Multi-Agent Investigation Workflow

> **Quick summary:** Captain dispatches 2+ agents to investigate independently
> (each writes to their own spoke file). A consolidator merges findings into
> the hub document. Captain reviews and approves. Full protocol below.

For complex tasks where the Captain wants multiple agents to independently investigate, propose solutions, and produce a consolidated plan.

**When to use:** The Captain assigns the same investigation task to 2+ agents (potentially different roles, tools, or models) and wants a single unified output document.

**Concurrency model: Hub-and-Spoke.** Each agent writes to their own spoke file (zero contention). The consolidator is the only agent that reads all spoke files and merges them into the hub.

**Workflow:**

```mermaid
flowchart TB
    subgraph Init["Phase 0: Initiation"]
        C1[Captain sends INVESTIGATE to first agent]
        C2[First agent creates hub document]
        C3[Captain sends INVESTIGATE to remaining agents]
    end

    subgraph Investigate["Phase 1: Independent Investigation"]
        A1[Agent 1<br/>Writes to own spoke file]
        A2[Agent 2<br/>Writes to own spoke file]
        AN[Agent N<br/>Writes to own spoke file]
    end

    subgraph Consolidate["Phase 2: Consolidation"]
        CON[Consolidator Agent<br/>Reads all spoke files<br/>Writes consolidated output to hub]
    end

    subgraph Review["Phase 3: Review & Approval"]
        REV[Reviewer / Implementer<br/>Reads hub document]
        CAP[Captain approves plan]
    end

    C1 --> C2 --> C3 --> A1 & A2 & AN --> CON --> REV --> CAP
```

**Phase 0 — Initiation (Captain)**

1. Send the **INVESTIGATE** command to the **first agent** and wait for confirmation that the hub document has been created
2. Once confirmed, send **INVESTIGATE** to the remaining agents — they can all run in parallel

This two-step dispatch eliminates the document-creation race condition. No other manual preparation is needed.

**Phase 1 — Independent Investigation (each agent)**

1. **If the hub document does not exist** (first agent only):
   a. Create it from the Investigation Document Template (§4.5), populate the **Investigation Brief** from the Captain's task description
   b. Set document status to `INVESTIGATING`
   c. Add your row to the **Participant Tracker** with your spoke file path
2. **If the hub document exists** (subsequent agents):
   a. Read the Investigation Brief
   b. Add your row to the **Participant Tracker** with your spoke file path
3. **Create your spoke file**: `Docs/WIP/{Topic}_Report_{Role}_{Agent}.md` using the Spoke File Format (§4.5)
4. Perform investigation (read code, analyze data, research) — write everything to **your spoke file**
5. When done: update your Participant Tracker row to `DONE`
6. Do NOT read other agents' spoke files (anti-anchoring rule — reports are in separate files, making this naturally enforced)
7. Do NOT attempt consolidation — that is Phase 2

**Phase 2 — Consolidation (designated agent)**

1. Captain assigns a consolidator agent (typically a high-capability model)
2. Consolidator sets hub document status to `CONSOLIDATING`
3. Consolidator reads ALL spoke files listed in the Participant Tracker (where status = `DONE`)
4. Consolidator writes the following sections in the hub document under `# CONSOLIDATED OUTPUT`:
   - **Consolidated Analysis**: Summary, Agreement Matrix (which investigators confirmed each finding), Strongest Contributions per investigator
   - **Consolidated Plan**: Phased implementation plan with files, risks, and effort indicators — with **Open Questions** subsection for unresolved disagreements requiring Captain decision
5. Consolidator appends each spoke file's content under `# INVESTIGATION REPORTS` in the hub for traceability
6. Set document status to `READY_FOR_REVIEW`

**Phase 3 — Review & Implementation**

1. Captain (or assigned reviewer) reads the hub document
2. Captain approves, requests changes, or escalates open questions
3. Decisions are recorded in the **Decision Record** section of the hub
4. Once approved: set status to `APPROVED` → implementer proceeds using Standard Feature Workflow (§3.1) or Quick Fix Workflow (§3.2)

**Rules:**
- Participants, their roles, and their number vary per task — the Captain decides who participates
- Each agent writes to their own spoke file — no shared-file contention during Phase 1
- Anti-anchoring: agents must NOT read other agents' spoke files during Phase 1 (file separation makes this naturally enforced)
- The consolidator must not discard minority findings — disagreements are valuable signal
- If an agent discovers something outside the investigation scope, it flags it in an `**Out of Scope**` note in their spoke file but does not investigate further
- The hub document is the single source of truth for the downstream reviewer/implementer
- Agents MUST update their row in the **Participant Tracker** when changing state
- If a participant remains in `INVESTIGATING` or `WRITING` status and their agent session is no longer active, the Captain may set their status to `ABANDONED` and proceed with consolidation using available reports. The consolidator should note the missing perspective.

#### Decision Authority & Escalation

Decisions during investigation and consolidation follow a tiered authority model based on impact and risk. Escalate upward when the threshold is exceeded. See also the general Escalation Protocol (§7).

| Level | Who decides | Scope | When applicable | Examples |
|-------|------------|-------|-----------------|---------|
| **1 — Lead agent** | The individual agent decides alone | Low impact, easily reversible, within own report | All phases | Investigation methodology, which files to analyze, report structure, internal findings |
| **2 — Agent consent** | Lead agent + one relevant agent agree | Medium impact, affects shared output | Phase 2–3 only (agents cannot communicate during Phase 1) | Proposing a specific fix approach, recommending a tool/library, flagging a finding as critical |
| **3 — Agent consensus** | All participating agents agree (via document) | High impact, affects multiple areas | Phase 2–3, orchestrated by Captain | Consolidation priorities, plan phasing, recommending architectural changes, disagreement resolution between agents |
| **4 — Captain approval** | Captain must explicitly approve | Very high impact, irreversible, or outside investigation scope | Any phase | Schema migrations, prompt modifications, security-related changes, removing functionality, expanding investigation scope, approving the final plan |

**Escalation rules:**
- When in doubt, escalate one level up — over-escalating is safer than under-escalating
- An agent who identifies a Level 4 decision must flag it in **Open Questions** and NOT proceed without Captain approval
- The consolidator operates at Level 3: they synthesize and structure, but cannot make Level 4 decisions unilaterally
- Level 2–3 decisions must be documented in the report or consolidated plan with rationale
- The Captain can override any lower-level decision
- If no Captain is assigned in the session, escalate Level 4 decisions to the active human user and wait for explicit approval

#### Captain Commands

The Captain uses these standardized prompts to direct agents. Copy, fill in the blanks, and paste to the agent.

**INVESTIGATE** — Assign an agent to investigate (Phase 1):
```
As {Role}, investigate using the Multi-Agent Investigation Workflow (§3.4).
Document: Docs/WIP/{filename}.md
Task: {what to investigate — clear questions to answer}
Inputs: {files, data, reports, or artifacts to examine}
Scope: {what is NOT in scope}
Focus on: {optional specific focus area or questions for this agent}

If the hub document does not exist, create it from the §4.5 template and populate the Investigation Brief.
Add yourself to the Participant Tracker, create your spoke file (§4.5), and write your report there.
```

**CONSOLIDATE** — Assign the consolidator (Phase 2):
```
As {Role}, consolidate the investigation in Docs/WIP/{filename}.md
Set document status to CONSOLIDATING.
Read ALL spoke files listed in the Participant Tracker (where Status = DONE), then write:
- ## Consolidated Analysis (summary, agreement matrix, strongest contributions)
- ## Consolidated Plan (phased, with files and risks)
- ### Open Questions (unresolved disagreements needing Captain decision)
Copy each spoke file's content under # INVESTIGATION REPORTS for traceability.
Set document status to READY_FOR_REVIEW when done.
```

**REVIEW** — Assign a reviewer (Phase 3):
```
As {Role}, review the consolidated plan in Docs/WIP/{filename}.md
Assess the plan for completeness, feasibility, and risks.
Add your review under ## Review Log using the Review Comment Format (§4.4).
```

**STATUS** — Check investigation progress (any phase):
```
Read Docs/WIP/{filename}.md and report:
- Document status
- Participant Tracker state (who is done, who is still working)
- Any agents with ABANDONED status or stale sessions
```

**PROPOSE** — Ask an agent to propose next steps (after any phase):
```
As {Role}, read Docs/WIP/{filename}.md and propose next steps.
Consider the current document status, completed reports, and open questions.
Append your proposal as a new report under # INVESTIGATION REPORTS:
### Proposal: {Role} ({Agent/Model}) — {Date}
Include: what to do next, who should do it, priorities, and any blockers.
Do NOT write into the # CONSOLIDATED OUTPUT sections — those are reserved for the consolidator.
```

**IMPLEMENT** — Assign an agent to execute the approved plan (after Phase 3):
```
As {Role}, implement the approved plan in Docs/WIP/{filename}.md
Read ## Consolidated Plan and execute it phase by phase.
After each phase: run tests/build, update the document status, and report progress.
If you encounter blockers or deviations from the plan, stop and report to the Captain.
```

#### Activation Walkthrough (Captain Quick Reference)

No manual document preparation needed — agents handle it.

**Step 1 — Dispatch first agent**

Paste the **INVESTIGATE** command into the first agent. Wait for confirmation that the hub document has been created and the Investigation Brief is populated.

**Step 2 — Dispatch remaining agents** (in parallel)

Paste the **INVESTIGATE** command into each additional agent. They find the hub document, self-register in the Participant Tracker, and create their own spoke files. All agents write to their own files — no contention.

**Step 3 — Monitor progress**

Paste the **STATUS** command into any available agent to check the Participant Tracker. When all participants show `DONE`, proceed to consolidation.

**Step 4 — Consolidate**

Paste the **CONSOLIDATE** command into a high-capability agent (e.g., Opus). The consolidator reads all spoke files, writes the unified analysis + plan into the hub, and copies spoke content under Investigation Reports for traceability.

**Step 5 — Review, Propose, or Implement**

Use **REVIEW**, **PROPOSE**, or **IMPLEMENT** commands as needed. These can go to the same or different agents.

---

### 3.5 Role Handoff Protocol

Role handoffs follow the **Agent Exchange Protocol** in `AGENTS.md` (Role Handoff mode).

- **Outgoing role:** Write a completion output using the unified template. The **Warnings** and **Learnings** fields are required (not optional). Always append learnings to `/Docs/AGENTS/Role_Learnings.md`.
- **Incoming role:** Follow the incoming-role checklist in AGENTS.md § Agent Exchange Protocol.

See `AGENTS.md` § Agent Exchange Protocol for the full template, output tiers, and file locations.

---

## 4. Collaboration Document Protocol

> This section governs **formal collaborative documents** (plans, reviews, investigations) that live in `Docs/WIP/`. For agent task-completion outputs and role handoffs, see `AGENTS.md` § Agent Exchange Protocol.

### 4.1 Document Naming Convention

```
Docs/WIP/{TaskTitle}_{DocumentType}.md

Examples:
- Docs/WIP/Shadow_Mode_Implementation_Plan.md
- Docs/WIP/Shadow_Mode_Architecture_Review.md
- Docs/WIP/Shadow_Mode_Code_Review.md
- Docs/WIP/Report_Quality_Analysis.md
- Docs/WIP/Grounding_Logic_Investigation_2026-02-13.md  (§3.4 multi-agent investigation)
```

### 4.2 Document Structure

Every collaborative document MUST include:

```markdown
# {Task Name} - {Document Type}

**Status:** DRAFT | IN_REVIEW | APPROVED | IMPLEMENTED | ARCHIVED
**Created:** {date}
**Last Updated:** {date}
**Author Role:** {role name}

---

## Context
{Brief description of the task and why this document exists}

## References
{Links to related documents, requirements, existing code}

---

## Content
{Main content of the document}

---

## Review Log

| Date | Reviewer Role | Status | Comments |
|------|---------------|--------|----------|
| {date} | {role} | {Approved/Changes Requested/Comment} | {summary} |

---

## Decision Record
{Final decisions made, with rationale}
```

### 4.3 Concurrent Editing

- **§3.4 investigations:** No contention — each agent writes to their own spoke file. Only the Participant Tracker in the hub is shared, and updates are brief appends.
- **Other shared documents:** One writer at a time. If two agents need to edit the same document, the Captain sequences them. Always re-read a shared file before editing it — another agent may have changed it since you last read it.

### 4.4 Review Comment Format

When adding review comments:

```markdown
### Review: {Reviewer Role} - {Date}

**Overall Assessment:** {APPROVE | REQUEST_CHANGES | COMMENT_ONLY}

#### Strengths
- {positive observation}

#### Concerns
- **[CRITICAL]** {must fix before proceeding}
- **[SUGGESTION]** {optional improvement}
- **[QUESTION]** {clarification needed}

#### Specific Comments
- Line/Section X: {comment}
```

### 4.5 Investigation Document Template

Used with the Multi-Agent Investigation Workflow (§3.4). File naming: `Docs/WIP/{Topic}_Investigation_{date}.md`

#### Hub Document (shared)

```markdown
# {Topic} — Multi-Agent Investigation

**Status:** INVESTIGATING | CONSOLIDATING | READY_FOR_REVIEW | APPROVED | IMPLEMENTED
**Created:** {date}
**Captain:** {name or role}

---

## Participant Tracker

Each agent adds their own row when joining. No manual setup needed.

| # | Role | Agent/Tool/Model | Report File | Status | Updated |
|---|------|-----------------|-------------|--------|---------|

Status values: `INVESTIGATING` → `WRITING` → `DONE` | `ABANDONED` | `CONSOLIDATING` → `DONE` | `REVIEWING` → `DONE`
Report File: path to the agent's spoke file (e.g., `Docs/WIP/{Topic}_Report_{Role}_{Agent}.md`).

---

## Investigation Brief

**Task:** {What needs to be investigated — clear questions to answer}
**Inputs:** {Files, data, reports, jobs, or artifacts agents should examine}
**Scope boundaries:** {What is NOT in scope for this investigation}

---
---

# CONSOLIDATED OUTPUT

> **Reading guide:** Everything below this line is the authoritative, consolidated result.
> It is written by the consolidator in Phase 2 and reviewed/approved in Phase 3.
> During Phase 1 (investigation) these sections are empty — do not fill them in during investigation.

## Consolidated Analysis

### Summary
*(empty until Phase 2)*

### Agreement Matrix

| Finding | Agent 1 | Agent 2 | Agent N |
|---------|---------|---------|---------|

### Strongest Contributions
*(empty until Phase 2)*

---

## Consolidated Plan

*(empty until Phase 2)*

### Open Questions
*(empty until Phase 2)*

---

## Review Log

| Date | Reviewer Role | Assessment | Comments |
|------|---------------|------------|----------|

---

## Decision Record

*(Decisions made by the Captain after review, with rationale)*

---
---

# INVESTIGATION REPORTS

> **Reading guide:** Everything below this line contains reports copied from spoke files by the consolidator.
> After consolidation, these serve as historical reference and traceability — the consolidated output above is authoritative.

*(Consolidator copies each spoke file's content here in Phase 2 for traceability)*

---
```

#### Spoke File Format (one per agent)

File naming: `Docs/WIP/{Topic}_Report_{Role}_{Agent}.md`

```markdown
# {Topic} — Report: {Role} ({Agent/Model})

**Date:** {date}
**Hub Document:** Docs/WIP/{Topic}_Investigation_{date}.md
**Status:** INVESTIGATING | WRITING | DONE

---

## Files Analyzed
- {file path} — {what was examined and why}

## Findings
{Detailed findings from the investigation}

## Proposals
{Proposed solutions, approaches, or next steps}

## Risks / Concerns
{Identified risks, edge cases, caveats}

## Out of Scope
{Items discovered but outside the investigation scope — flagged for awareness}

---
```

**Status transitions (hub document):**
- `INVESTIGATING` → First agent sets on document creation; agents are writing spoke files
- `CONSOLIDATING` → Set when all investigators are `DONE`; consolidator is working
- `READY_FOR_REVIEW` → Consolidator sets when synthesis is complete
- `APPROVED` → Captain sets after review; implementation may begin
- `IMPLEMENTED` → Move to `Docs/ARCHIVE/` or appropriate subfolder

---

## 5. Global Rules

> The following rules are defined authoritatively in `/AGENTS.md` and apply to all
> agent work. Read them there — they are not duplicated here to avoid drift.
>
> - **Terminology Precision** — AGENTS.md § Terminology table
> - **Generic Design** — AGENTS.md § Generic by Design
> - **Input Neutrality** — AGENTS.md § Input Neutrality
> - **Pipeline Integrity** — AGENTS.md § Pipeline Integrity

### 5.5 Documentation Sync

After any code change that **adds, removes, or renames** a user-facing concept,
API endpoint, configuration parameter, or pipeline stage:

1. **Flag it** in your completion output ("For next agent" field): list which docs
   may need updating and why
2. **Do not inline doc updates** unless the task explicitly includes documentation
3. Documentation updates are a separate task — the Captain or Technical Writer
   will pick them up

---

## 6. Model-Class Guidelines

> **Note:** These are organized by capability tier, not specific model versions, to avoid staleness as models evolve.

### 6.1 High-Capability Models (e.g., Claude Opus, GPT-o3, Gemini 2.0 Pro)

**Strengths:** Deep reasoning, complex analysis, nuanced understanding, large context
**Best For:** Architecture decisions, complex investigations, quality gates, trade-off analysis
**Considerations:**
- Reserve for high-stakes decisions and ambiguous problem spaces
- Excellent for multi-step planning and code review
- Good at finding edge cases in implementations

### 6.2 Mid-Tier Models (e.g., Claude Sonnet, GPT-4.1, Gemini 2.0 Flash)

**Strengths:** Balanced cost/capability, good reasoning, fast iteration
**Best For:** Standard reviews, documentation, routine implementation, iterative review cycles
**Considerations:**
- Well-suited for following structured protocols
- Efficient for documentation tasks
- Good default for most development work

### 6.3 Lightweight Models (e.g., Claude Haiku, GPT-4.1 mini, Kimi K2, Gemini 1.5 Flash)

**Strengths:** Fast, cost-effective, good for bulk operations
**Best For:** Fast iterations, autonomous workflows (Cline), bulk operations, extract/understand tasks
**Considerations:**
- May need explicit reminders about FactHarbor terminology — follow AGENTS.md strictly
- When using Kimi K2 via Cline: be aware it may not know FactHarbor conventions
- Best paired with clear, structured instructions

**Context Budget — Lite Activation:**

Lightweight models have smaller context windows. When activated with "As \<Role\>", use this graduated loading strategy instead of reading all Required Reading at once:

1. **Always load:** `/AGENTS.md` (terminology + safety — non-negotiable)
2. **Load the role entry** from §2 of this document (one subsection, ~40 lines)
3. **Scan** your role's section in `Docs/AGENTS/Role_Learnings.md` (brief)
4. **Defer** remaining Required Reading — load specific documents only when the task requires them
5. **State what you deferred:** In your acknowledgment, list which Required Reading you have NOT loaded yet so the human knows

This avoids consuming 60%+ of context on upfront reads that may not be relevant to a simple task.

---

## 7. Escalation Protocol

### 7.1 When to Escalate to Human

- Security-related changes
- Breaking changes to public APIs
- Schema migrations affecting production data
- Disagreement between Lead Architect and Lead Developer
- Cost/performance trade-offs with significant impact
- Uncertainty about user requirements

### 7.2 Escalation Format

```markdown
## Escalation Request

**From:** {Role} ({Agent})
**Urgency:** HIGH | MEDIUM | LOW
**Decision Needed By:** {date/condition}

### Situation
{What happened or was discovered}

### Options
1. **Option A:** {description}
   - Pros: {list}
   - Cons: {list}

2. **Option B:** {description}
   - Pros: {list}
   - Cons: {list}

### Recommendation
{Which option and why, if any}

### Impact of No Decision
{What happens if human doesn't respond}
```

---

## 8. Quality Checklist

Before marking any task complete:

- [ ] Code follows `/Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Guidelines/Coding Guidelines/WebHome.xwiki`
- [ ] Terminology matches `/Docs/xwiki-pages/FactHarbor/Product Development/Specification/Reference/Terminology/WebHome.xwiki`
- [ ] No hardcoded domain-specific terms
- [ ] Verification run completed (`npm test` safe suite and/or `npm -w apps/web run build`)
- [ ] Expensive LLM tests run only when explicitly requested or required for quality-critical changes (see `/AGENTS.md` Test Cost Warning)
- [ ] Documentation updated
- [ ] Cross-references verified
- [ ] Review log complete in WIP document
- [ ] WIP document moved to appropriate location or archived

---

## Related Documents

- [Meta-Prompt Template](./Multi_Agent_Meta_Prompt.md) - Reusable prompt for starting tasks
- [Role Learnings Log](./Role_Learnings.md) - Agent-contributed tips, gotchas, and patterns per role
- [GlobalMasterKnowledge for xWiki](./GlobalMasterKnowledge_for_xWiki.md) - XWiki-specific rules
- [AGENTS_xWiki.md](./AGENTS_xWiki.md) - XWiki agent configurations

---

**Document Maintainer:** Lead Architect
**Last Reviewed:** 2026-03-17
