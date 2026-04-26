# Multi-Agent Collaboration Rules Audit

**Status:** READY_FOR_REVIEW
**Created:** 2026-04-26
**Last Updated:** 2026-04-26
**Author Role:** Agents Supervisor
**Audited file:** `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`
**Baseline commit:** `ab559315d28b3726f0d89c2e0480feb3d1ea8880`

---

## Purpose

This audit replaces the informal "44% dead weight" claim from `Docs/WIP/2026-04-26_ACE_Readiness_Review_And_Debate.md` with a reproducible, section-level assessment.

The goal is not to restructure the rules immediately. The goal is to identify which sections are live, duplicated, load-on-demand reference material, dormant, obsolete, or ownership metadata so the Captain can approve targeted cleanup later.

## Corpus Snapshot

Date: 2026-04-26

Tracked handoff corpus:

- Command: `git ls-files 'Docs/AGENTS/Handoffs/*.md' | Select-String -Pattern '.*' | Measure-Object`
- Result: 378 tracked handoff files.

Tracked WIP corpus:

- Command: `git ls-files 'Docs/WIP/*.md' | Select-String -Pattern '.*' | Measure-Object`
- Result: 54 tracked WIP markdown files.

Audited rules file:

- Command: `(Get-Content -LiteralPath 'Docs/AGENTS/Multi_Agent_Collaboration_Rules.md').Count`
- Result: 745 lines.

Tooling note:

- An initial `rg` command failed in the Codex app package path with `Zugriff verweigert`; native PowerShell `Select-String` was used for the reproducible counts below.

## Search Patterns And Results

Handoff-only explicit references:

Command shape:

```powershell
$patterns = @(
  'using the Multi-Agent Investigation Workflow',
  'Document: Docs/WIP',
  'Participant Tracker',
  'spoke file',
  'hub document',
  'Review Comment Format',
  'Escalation Request',
  'Quality Checklist',
  'Area-to-Documents Mapping',
  'Model-Class Guidelines',
  'Role Registry',
  'WIP Folder Protocol',
  'Live Validation Hygiene',
  'Debt Guard',
  'debt-guard'
)
foreach ($p in $patterns) {
  $count = (Get-ChildItem -Path 'Docs/AGENTS/Handoffs' -Filter '*.md' -File |
    Select-String -SimpleMatch -Pattern $p -List |
    Measure-Object).Count
  "$p`t$count"
}
```

| Pattern | Handoff files with match | Interpretation |
|---|---:|---|
| `using the Multi-Agent Investigation Workflow` | 0 | Formal command text is not used in completion handoffs. |
| `Document: Docs/WIP` | 0 | Formal Captain command template is not cited in handoffs. |
| `Participant Tracker` | 0 | Tracker format is not cited in handoffs. |
| `spoke file` | 0 | Spoke terminology is not cited in handoffs. |
| `hub document` | 0 | Hub terminology is not cited in handoffs. |
| `Review Comment Format` | 0 | Formal review-comment format is not cited in handoffs. |
| `Escalation Request` | 0 | Formal escalation block is not cited in handoffs. |
| `Quality Checklist` | 0 | Checklist is not cited in handoffs. |
| `Area-to-Documents Mapping` | 0 | Mapping table is not cited in handoffs. |
| `Model-Class Guidelines` | 1 | Rare explicit citation; likely used through role/preflight guidance instead. |
| `Role Registry` | 0 | Role activation now routes through `AGENTS.md` / handoff protocol. |
| `WIP Folder Protocol` | 0 | Behavior may be internalized; no explicit citation. |
| `Live Validation Hygiene` | 0 | Handoffs usually cite concrete validation state, not this section label. |
| `Debt Guard` | 2 | Explicit recent governance handoffs. |
| `debt-guard` | 8 | Active workflow references. |

WIP investigation signals:

Command shape:

```powershell
$patterns = @(
  'Participant Tracker',
  'spoke file',
  'hub document',
  'Multi-Agent Investigation',
  'Investigation Brief',
  'CONSOLIDATED OUTPUT',
  'INVESTIGATION REPORTS'
)
foreach ($p in $patterns) {
  $count = (Get-ChildItem -Path 'Docs/WIP' -Filter '*.md' -File |
    Select-String -SimpleMatch -Pattern $p -List |
    Measure-Object).Count
  "$p`t$count"
}
```

| Pattern | WIP files with match | Interpretation |
|---|---:|---|
| `Participant Tracker` | 0 | Formal hub template is not currently instantiated. |
| `spoke file` | 0 | Current WIP docs do not use the exact spoke wording. |
| `hub document` | 0 | Current WIP docs do not use the exact hub wording. |
| `Multi-Agent Investigation` | 4 | Concept appears in current review/planning docs and one older investigation. |
| `Investigation Brief` | 0 | Formal template field is not in active WIP docs. |
| `CONSOLIDATED OUTPUT` | 0 | Formal template field is not in active WIP docs. |
| `INVESTIGATION REPORTS` | 1 | One older WIP investigation used this structure. |

False-positive handling:

- Zero explicit citation does not prove zero use. It only proves the exact label was not written in completion handoffs.
- Sections that encode useful but rare coordination procedures should be classified as `load-on-demand reference`, not `obsolete`.
- WIP files are design/review artifacts, so their references are weaker evidence of routine workflow use than handoff references.
- Recent ACE WIP documents mention the audited sections because they are discussing this audit; those matches are not independent usage evidence.

## Section Inventory

Line ranges are from `Select-String -LiteralPath 'Docs/AGENTS/Multi_Agent_Collaboration_Rules.md' -Pattern '^(##|###) '`.

| Section | Lines | Classification | Evidence | Recommended action |
|---|---:|---|---|---|
| Purpose | 10-15 | live | Concise document intent. | Keep, but update after restructure. |
| 1. Global References | 16-19 | duplicate/live | Root `AGENTS.md` and role activation already provide startup path. | Keep as short pointer only. |
| 1.1 Mandatory Knowledge Sources | 20-30 | duplicate | Duplicates root and role-required reading; risk of drift. | Replace with pointer to `AGENTS.md` role activation and `preflight_task`. |
| 1.2 Area-to-Documents Mapping | 31-50 | load-on-demand reference | No handoff citations, but useful fallback when `fhAgentKnowledge` is unavailable. | Preserve, likely move to indexed reference/procedure. |
| 1.3 Role-to-Area Mapping | 51-66 | duplicate | Role files and preflight resolve role scope. | Fold into role metadata over time; do not keep as a separate table long-term. |
| 1.4 WIP Folder Protocol | 67-73 | live | Active distinction between WIP and completion outputs. | Keep concise. |
| 1.5 Live Validation Hygiene | 74-85 | live pointer | Points to authoritative procedure. | Keep pointer. |
| 2. Role Registry | 86-107 | live | Compact role index remains useful. | Keep. |
| 3. Workflow Patterns intro | 108-113 | duplicate/live | Mostly points to Handoff Protocol and model guidelines. | Keep short. |
| 3.1 Standard Feature Workflow | 114-146 | dormant reference | No explicit handoff use; diagram may be useful for rare planning. | Move to procedure/reference after Captain approval. |
| 3.2 Quick Fix Workflow | 147-157 | live pointer | `/debt-guard` is active and recent. | Keep short; possibly rename to bugfix routing. |
| 3.3 Complex Investigation Workflow | 158-169 | dormant reference | No explicit current usage. | Merge into decision guidance for 3.4 or move to procedure. |
| 3.4 Multi-Agent Investigation Workflow | 170-366 | load-on-demand reference | Exact hub/spoke template rarely used, but concept appears in WIP and remains useful for Captain-directed parallel work. | Preserve in full, preferably as `Docs/AGENTS/Procedures/Multi_Agent_Investigation.md`, with a short pointer here. |
| 3.5 Role Handoff Protocol | 367-377 | live pointer | Points to authoritative handoff protocol. | Keep concise. |
| 4. Collaboration Document Protocol intro | 378-381 | duplicate/reference | WIP documents use variable structures; formal templates are rarely cited. | Keep only if needed after moving templates. |
| 4.1 Document Naming Convention | 382-394 | live/reference | WIP naming is broadly followed. | Keep or move to WIP procedure. |
| 4.2 Document Structure | 395-433 | dormant template | Current WIP docs are not consistently using exact template. | Move to procedure/reference; avoid mandatory wording unless enforced. |
| 4.3 Concurrent Editing | 434-438 | live | Still relevant in shared workspace. | Keep concise. |
| 4.4 Review Comment Format | 439-459 | obsolete/dormant | No handoff citations; current app review findings use code-comment directives or `/debate`. | Replace with pointers to current review channels; archive old format if needed. |
| 4.5 Investigation Document Template | 460-589 | load-on-demand reference | One older WIP uses investigation-report structure; useful but heavy. | Move with 3.4 into procedure doc. |
| 5. Global Rules | 590-599 | live pointer | Correctly avoids duplicating root rules. | Keep. |
| 5.5 Documentation Sync | 600-612 | live | Still binds code-to-doc responsibility. | Keep or promote to root `AGENTS.md` if it should bind all tools. |
| 6. Model-Class Guidelines | 613-676 | live | Mentioned by role activation/preflight; still useful as a shared tier map. | Keep until `fhAgentKnowledge` fully owns model-tier lookup. |
| 7. Escalation Protocol | 677-717 | dormant concept | Exact format is not cited, but human escalation remains important. | Move format to policy/procedure; keep short trigger pointer. |
| 8. Quality Checklist | 718-733 | obsolete | No handoff citations; replaced by workflow/test-specific verification and `/debt-guard`. | Replace with pointers to active verification rules; archive checklist. |
| Related Documents + footer | 734-745 | live metadata | Footer ownership was corrected to Captain owner / Agents Supervisor maintainer. | Keep and maintain. |

## Audit Conclusions

The prior "44% dead weight" finding is directionally useful but not reproducible enough as originally stated. This audit supports a narrower conclusion:

- High-confidence `obsolete` material is limited: mainly §4.4 Review Comment Format and §8 Quality Checklist.
- Large sections are better classified as `load-on-demand reference`, not dead: especially §3.4 and §4.5.
- Several startup/role/source tables are `duplicate` because `AGENTS.md`, role files, and `fhAgentKnowledge.preflight_task` now carry the active startup path.
- The best cleanup is a routing-doc restructure with preserved procedure docs, not a delete/archive sweep.

## Proposed Restructure Package

For Captain review, not yet approved:

1. Keep `Multi_Agent_Collaboration_Rules.md` as a compact routing document:
   - Purpose
   - Role Registry
   - Active workflow pointers
   - WIP vs completion-output boundary
   - Model-class guidance pointer
   - Escalation trigger pointer
   - Related documents and ownership footer
2. Move preserved long-form material:
   - `Docs/AGENTS/Procedures/Multi_Agent_Investigation.md`: current §3.4 + §4.5.
   - `Docs/AGENTS/Procedures/Collaborative_Document_Protocol.md`: useful pieces of §4.1-§4.3.
   - `Docs/AGENTS/Policies/Escalation_Protocol.md`: §7 format if Captain wants it retained.
3. Replace obsolete material:
   - §4.4 Review Comment Format -> pointer to app review directives and `/debate`.
   - §8 Quality Checklist -> pointer to root verification rules, workflow-specific checks, and `/debt-guard`.
4. Preserve `Area-to-Documents Mapping` until `fhAgentKnowledge` coverage is explicitly verified for every area.

## Do Not Do Yet

- Do not archive or delete §3.4 hub-and-spoke material.
- Do not enforce missing debt-guard telemetry from this audit.
- Do not schedule Agent Evaluator before passive telemetry has a representative sample.
- Do not use exact citation counts as the sole basis for deletion.

## Review Log

| Date | Reviewer Role | Assessment | Comments |
|---|---|---|---|
| 2026-04-26 | Agents Supervisor / Codex GPT-5 | READY_FOR_REVIEW | Audit supports cleanup, but through routing/procedure split and Captain approval. |

## Decision Record

Pending Captain review.
