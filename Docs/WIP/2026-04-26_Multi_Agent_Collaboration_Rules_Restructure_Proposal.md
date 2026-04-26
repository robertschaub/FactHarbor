# Multi-Agent Collaboration Rules Restructure Proposal

**Status:** READY_FOR_CAPTAIN_REVIEW
**Created:** 2026-04-26
**Last Updated:** 2026-04-26
**Author Role:** Agents Supervisor
**Source audit:** `Docs/WIP/2026-04-26_Multi_Agent_Collaboration_Rules_Audit.md`
**Target document:** `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`

---

## Purpose

This proposal converts the Phase 2 audit into a Captain-reviewable edit plan.

It does not approve or perform the restructure. It defines the smallest useful cleanup package that preserves the live coordination rules while moving long templates and rarely used procedures into load-on-demand documents.

## Governing Constraints

- Do not delete hub-and-spoke investigation material; preserve it as a procedure.
- Do not treat zero explicit handoff citations as proof of dead weight.
- Do not change role activation authority; `AGENTS.md`, `Handoff_Protocol.md`, role files, and `fhAgentKnowledge.preflight_task` remain authoritative startup paths.
- Keep `Multi_Agent_Collaboration_Rules.md` useful as a routing document for agents and humans.
- Do not archive or enforce debt-guard telemetry as part of this restructure.

## Proposed Target Shape

After approval, `Multi_Agent_Collaboration_Rules.md` should become a compact routing document with these sections:

1. Purpose and authority boundary.
2. Startup references:
   - `AGENTS.md`
   - `Docs/AGENTS/Policies/Handoff_Protocol.md`
   - role files
   - `fhAgentKnowledge.preflight_task`
3. Area-to-documents mapping pointer or compact table.
4. Role registry.
5. Workflow routing:
   - `/debt-guard` for bugfixes
   - `/handoff` / Agent Exchange Protocol for completion outputs
   - `/context-extension` for in-progress state transfer
   - `/debate` for adversarial decision pressure
   - procedure pointer for multi-agent investigations
6. WIP vs completion-output boundary.
7. Model-class guidance or pointer.
8. Escalation trigger pointer.
9. Related documents and ownership footer.

The target should avoid embedding long templates in the routing file.

## Section Disposition Matrix

| Current section | Audit classification | Proposed disposition | Destination | Approval note |
|---|---|---|---|---|
| Purpose | live | keep inline | `Multi_Agent_Collaboration_Rules.md` | Rewrite after moves so it describes routing, not full procedure storage. |
| 1. Global References | duplicate/live | keep inline, shorten | same file | Point to `AGENTS.md` and `Handoff_Protocol.md` instead of restating startup protocol. |
| 1.1 Mandatory Knowledge Sources | duplicate | replace with pointer | same file | Preserve only a short "source hierarchy" pointer; do not maintain a parallel required-reading table. |
| 1.2 Area-to-Documents Mapping | load-on-demand reference | keep inline for now | same file | Keep until `fhAgentKnowledge` coverage is verified for every mapped area. |
| 1.3 Role-to-Area Mapping | duplicate | move or fold later | role files / future role metadata | Defer actual removal until role metadata coverage is checked. |
| 1.4 WIP Folder Protocol | live | keep inline | same file | Keep because it prevents completion-output drift into `Docs/WIP/`. |
| 1.5 Live Validation Hygiene | live pointer | keep inline as pointer | same file | No change except shorter wording if needed. |
| 2. Role Registry | live | keep inline | same file | Useful quick lookup; keep aliases and file links. |
| 3. Workflow Patterns intro | duplicate/live | keep inline, shorten | same file | Route to current workflow skills and handoff policy. |
| 3.1 Standard Feature Workflow | dormant reference | move to procedure/reference | `Docs/AGENTS/Procedures/Standard_Feature_Workflow.md` or fold into `Collaborative_Document_Protocol.md` | Approve only if Captain still wants this 5-phase workflow preserved. |
| 3.2 Quick Fix Workflow | live pointer | keep inline, rename | same file | Rename around bugfix routing and `/debt-guard`; avoid implying mandatory two-person review for tiny fixes. |
| 3.3 Complex Investigation Workflow | dormant reference | keep short decision rule | same file + investigation procedure | Keep the §3.3 vs §3.4 distinction; move long explanation if needed. |
| 3.4 Multi-Agent Investigation Workflow | load-on-demand reference | move to procedure | `Docs/AGENTS/Procedures/Multi_Agent_Investigation.md` | Preserve full protocol, templates, commands, and escalation model. |
| 3.5 Role Handoff Protocol | live pointer | keep inline as pointer | same file | Authority remains `Docs/AGENTS/Policies/Handoff_Protocol.md`. |
| 4. Collaboration Document Protocol intro | duplicate/reference | keep short pointer | same file | Point to WIP/collaborative document procedure. |
| 4.1 Document Naming Convention | live/reference | move to procedure, keep one-line pointer | `Docs/AGENTS/Procedures/Collaborative_Document_Protocol.md` | Keep naming guidance available for WIP authors. |
| 4.2 Document Structure | dormant template | move to procedure | `Docs/AGENTS/Procedures/Collaborative_Document_Protocol.md` | Reword as recommended template unless Captain wants it mandatory. |
| 4.3 Concurrent Editing | live | keep inline and duplicate in procedure | same file + procedure | Short rule should stay visible; details can live in procedure. |
| 4.4 Review Comment Format | obsolete/dormant | archive or replace | `Docs/ARCHIVE/` or procedure appendix | Replace inline text with pointers to current review channels, code-comment directives, `/debate`, and handoff review sections. |
| 4.5 Investigation Document Template | load-on-demand reference | move to procedure | `Docs/AGENTS/Procedures/Multi_Agent_Investigation.md` | Preserve with §3.4; do not delete. |
| 5. Global Rules | live pointer | keep inline as pointer | same file | Continue avoiding duplicated root rules. |
| 5.5 Documentation Sync | live | keep inline | same file | Consider later promotion to `AGENTS.md` if Captain wants it repo-wide. |
| 6. Model-Class Guidelines | live | keep inline for now | same file | Retain until model-tier lookup and role preflight coverage make this redundant. |
| 7. Escalation Protocol | dormant concept | keep trigger pointer; move format | `Docs/AGENTS/Policies/Escalation_Protocol.md` | Preserve format only if Captain wants a reusable written escalation template. |
| 8. Quality Checklist | obsolete | replace and archive | `Docs/ARCHIVE/` or remove after pointer replacement | Replace with pointers to `AGENTS.md`, workflow-specific verification, `/debt-guard`, and handoff output requirements. |
| Related Documents + footer | live metadata | keep inline | same file | Maintain Captain owner and Agents Supervisor maintainer. |

## New Or Updated Documents

If approved, create or update:

| Document | Purpose | Source material |
|---|---|---|
| `Docs/AGENTS/Procedures/Multi_Agent_Investigation.md` | Full hub-and-spoke investigation procedure, Captain commands, templates, and escalation model. | Current §3.4 and §4.5. |
| `Docs/AGENTS/Procedures/Collaborative_Document_Protocol.md` | WIP document naming, recommended structure, and concurrent-editing rules. | Current §4.1-§4.3. |
| `Docs/AGENTS/Policies/Escalation_Protocol.md` | Optional reusable escalation format. | Current §7, if Captain wants to preserve the format. |
| `Docs/ARCHIVE/Agent_Governance/` or nearest existing archive location | Retired review-comment and checklist formats if not preserved as appendices. | Current §4.4 and §8. |

## Approval Choices

Captain can approve this in slices:

| Slice | Contents | Risk | Recommendation |
|---|---|---|---|
| A | Convert `Multi_Agent_Collaboration_Rules.md` to compact routing doc; move §3.4 + §4.5 to investigation procedure. | Medium, because cross-references must be accurate. | Approve first if the goal is meaningful size reduction. |
| B | Move collaborative document naming/template material into procedure. | Low. | Approve with Slice A or separately. |
| C | Replace obsolete review-comment and quality-checklist sections with active pointers. | Low to medium, depending on archive preference. | Approve after deciding archive vs delete. |
| D | Move escalation format into policy or reduce to trigger pointer only. | Low. | Approve only if the format remains useful. |
| E | Fold role-to-area mapping into role metadata. | Medium. | Defer until role metadata coverage is audited. |
| F | Replace area-to-documents mapping with `fhAgentKnowledge` lookup. | Medium. | Defer until coverage is verified. |

## Rejected Alternatives

| Alternative | Why rejected |
|---|---|
| Full delete/archive sweep based on citation counts | The audit shows citation absence is not enough evidence; hub-and-spoke material is rare but valuable. |
| Leave the file unchanged | The current file mixes live routing, long templates, outdated review format, and model guidance, making it harder for agents to find the active rule. |
| Move everything into `AGENTS.md` | Root `AGENTS.md` is already dense and should stay as universal agent instruction, not long-form procedure storage. |
| Create a new meta-routing skill | Skill selection already has an order; adding a meta-skill would duplicate existing scope guards. |

## Rollback Plan

If the approved restructure causes agent behavior regressions:

1. Restore the previous `Multi_Agent_Collaboration_Rules.md` from the pre-restructure commit.
2. Keep the new procedure files only if they remain accurate; otherwise archive them with the failed restructure note.
3. Re-run `npm run index:tier2:tracked` only if handoff files changed.
4. Add a correction entry to `Docs/AGENTS/Agent_Outputs.md` and a handoff describing the regression and restore point.

## Acceptance Criteria For Phase 4

Before editing the rules file, Captain should decide:

- Whether Slice A is approved.
- Whether §4.4 and §8 should be archived or deleted after pointer replacement.
- Whether the escalation format should become `Docs/AGENTS/Policies/Escalation_Protocol.md`.
- Whether `Area-to-Documents Mapping` stays inline until `fhAgentKnowledge` coverage is audited.

After the edit:

- Every moved section has a working pointer from `Multi_Agent_Collaboration_Rules.md`.
- No authoritative procedure is lost.
- Root `AGENTS.md`, `Handoff_Protocol.md`, and skill-selection guidance remain unchanged unless explicitly approved.
- `git diff --check` passes.

## Decision Record

Pending Captain review.
