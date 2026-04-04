# Agent Rules Cleanup Plan

**Status:** IMPLEMENTED AND ARCHIVED
**Created:** 2026-03-17
**Last Updated:** 2026-04-04
**Author Role:** Agents Supervisor
**Execution Commits:** `6214aa14`, `bc36c51f`, `03e96944`, `dc9729e5`

> Archive note: This file preserves the original 2026-03-17 planning snapshot.
> Cleanup execution later completed in full. For the final outcome summary, see
> `Docs/ARCHIVE/2026-04-04_Agent_Rules_Cleanup_Closure_Summary.md`.

---

## Context

The FactHarbor agent governance ecosystem has grown organically over ~6 weeks of active multi-agent development. It now spans 45+ files and ~17,000 lines across tool configs, role definitions, collaboration rules, handoffs, and learnings. This plan audits the entire ecosystem for staleness, redundancy, gaps, and clarity issues — then provides prioritized actions and tool-specific prompts for cleanup execution.

## References

- `/AGENTS.md` — Canonical agent rules (~900 lines)
- `/CLAUDE.md`, `/GEMINI.md` — Tool-specific thin wrappers
- `/.github/copilot-instructions.md`, `/.windsurfrules`, `/.clinerules/`, `/.cursor/rules/` — Tool configs
- `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` — Collaboration protocol (~730 lines)
- `Docs/AGENTS/Multi_Agent_Meta_Prompt.md` — Task spawning template (~443 lines)
- `Docs/AGENTS/Role_Learnings.md` — Agent-contributed tips (~445 lines)
- `Docs/AGENTS/Agent_Outputs.md` — Rolling completion log (~5,500 lines)
- `Docs/AGENTS/Handoffs/` — 1 active handoff file + README (19 already archived to `Docs/ARCHIVE/Handoffs/`)
- `Docs/AGENTS/Roles/` — 11 role definition files

---

## Governance File Inventory

### Root-Level Instruction Files

| File | Lines | Purpose | Health |
|------|-------|---------|--------|
| `/AGENTS.md` | ~900 | Canonical rules, terminology, architecture, exchange protocol | ⚠️ Large, some sections could be leaner |
| `/CLAUDE.md` | 58 | Claude Code thin wrapper → AGENTS.md | ✅ Good |
| `/GEMINI.md` | 31 | Gemini CLI thin wrapper → AGENTS.md | ✅ Good |
| `apps/api/AGENTS.md` | 66 | .NET API-specific rules | ✅ Good |

### Tool-Specific Config Files

| File | Lines | Purpose | Health |
|------|-------|---------|--------|
| `/.github/copilot-instructions.md` | 39 | GitHub Copilot | ⚠️ Missing vscode-xwiki-preview tool |
| `/.windsurfrules` | 40 | Windsurf IDE | ⚠️ Says "POC", missing vscode-xwiki-preview |
| `/.clinerules/00-factharbor-rules.md` | 79 | Cline/RooCode | ⚠️ Missing vscode-xwiki-preview |
| `/.cursor/rules/factharbor-core.mdc` | 58 | Cursor core | ⚠️ Says "POC" |
| `/.cursor/rules/factharbor-dotnet.mdc` | 26 | Cursor .NET | ✅ Good |
| `/.cursor/rules/factharbor-typescript.mdc` | 27 | Cursor TypeScript | ❌ References removed monolithic-dynamic pipeline |
| `/.cursor/rules/factharbor-xwiki.mdc` | 21 | Cursor xWiki | ✅ Good |

### Docs/AGENTS/ Coordination Files

| File | Lines | Purpose | Health |
|------|-------|---------|--------|
| `README.md` | 78 | Index of agent docs | ✅ Good |
| `Multi_Agent_Collaboration_Rules.md` | 730 | Workflows, roles, templates | ⚠️ Large; terminology table duplicates AGENTS.md; last reviewed 2026-02-10 |
| `Multi_Agent_Meta_Prompt.md` | 443 | Agent spawning template | ⚠️ Examples reference removed pipelines |
| `Agent_Outputs.md` | ~5,500 | Rolling completion log | ❌ Oversized; existing archival policy lacks thresholds |
| `Role_Learnings.md` | 445 | Tips/gotchas per role | ⚠️ Growing, needs curation |
| `Audit_Warning_Severity.md` | 89 | Reusable audit prompt | ✅ Good |
| `AGENTS_xWiki.md` | 185 | xWiki editing rules | ✅ Good |
| `GlobalMasterKnowledge_for_xWiki.md` | 578 | xWiki knowledge base | ✅ Good (owned by Technical Writer role) |
| `InitializeFHchat_for_xWiki.md` | 332 | xWiki chat init prompt | ✅ Good |
| `Mermaid_ERD_Quick_Reference.md` | 126 | Mermaid syntax reference | ✅ Good |
| `Role_Code_Review_Agent.md` | 5 | ❌ Dead redirect stub | ❌ Delete |
| `TECH_WRITER_START_HERE.md` | 5 | ❌ Dead redirect stub | ❌ Delete |

### Handoffs/ (1 active + 19 archived)

| Health | Details |
|--------|---------|
| ✅ | Archival already performed. Active folder contains only `2026-03-01_Security_Expert_PreRelease_Review.md` + `README.md`. 19 consumed files already in `Docs/ARCHIVE/Handoffs/`. |

---

## Findings

### Category 1: STALE CONTENT (must fix — agents will follow wrong instructions)

| # | File | Issue | Severity |
|---|------|-------|----------|
| S1 | `.cursor/rules/factharbor-typescript.mdc:10` | References removed `monolithic-dynamic.ts` pipeline | HIGH |
| S2 | `.windsurfrules:7`, `.cursor/rules/factharbor-core.mdc:13` | Say "POC with two apps" — project is pre-release v1.0, no longer POC | MEDIUM |
| S3 | `Docs/AGENTS/Multi_Agent_Meta_Prompt.md:205` | Example says "Must work with both pipeline modes (Orchestrated, Monolithic Dynamic)" — both removed | MEDIUM |
| S4 | `Docs/AGENTS/Role_Code_Review_Agent.md` | Dead redirect stub (5 lines, "Moved to Roles/Code_Reviewer.md") | LOW |
| S5 | `Docs/AGENTS/TECH_WRITER_START_HERE.md` | Dead redirect stub (5 lines, "Moved to Roles/Technical_Writer.md") | LOW |
| S6 | `Multi_Agent_Collaboration_Rules.md` | Both `Date: 2026-02-10` (line 4) and `Last Reviewed: 2026-02-10` (line 730) are 5+ weeks stale. `Multi_Agent_Meta_Prompt.md` also has `Last Reviewed: 2026-02-10` (line 443). | LOW |

### Category 2: OVERSIZED / ARCHIVAL NEEDED (operational drag — bloats context, slows agents)

| # | File | Issue | Severity |
|---|------|-------|----------|
| A1 | `Docs/AGENTS/Agent_Outputs.md` | ~5,500 lines. Agents instructed to "find the most recent relevant entries" on task start, but the file is so large that scanning it wastes context. AGENTS.md says "Captain may archive old entries during Consolidate WIP" but sets no threshold or cadence — need concrete thresholds. | HIGH |
| A2 | ~~`Docs/AGENTS/Handoffs/`~~ | ~~20 files, oldest 4 weeks.~~ **RESOLVED** — archival already performed. Only 1 active file remains. | ~~MEDIUM~~ N/A |
| A3 | `Docs/AGENTS/Role_Learnings.md` | 445 lines. Not urgent but Captain should curate: promote best learnings to role files, archive dated ones. | LOW |

### Category 3: INCONSISTENCIES (agents get conflicting signals)

| # | File | Issue | Severity |
|---|------|-------|----------|
| I1 | `.github/copilot-instructions.md`, `.windsurfrules`, `.clinerules/00-factharbor-rules.md` | Missing `tools/vscode-xwiki-preview` from project overview (CLAUDE.md and cursor-core have it) | LOW |
| I2 | `Multi_Agent_Collaboration_Rules.md` §5.1 | Terminology table fully duplicates AGENTS.md §Terminology. Any update to one must be mirrored. | MEDIUM |
| I3 | `AGENTS.md` §Architecture | ASCII diagram omits the VS Code extension tool | LOW |

### Category 4: REDUNDANCY (maintenance burden — same content in multiple places)

| # | Files | Issue | Recommendation |
|---|-------|-------|----------------|
| R1 | All 7 tool configs | Each repeats terminology, safety, commands sections from AGENTS.md | **Accept as intentional.** Tool configs are thin copies for tools that can't follow `@references`. Keep but ensure they stay in sync. Add a sync-check step to this plan. |
| R2 | `Multi_Agent_Collaboration_Rules.md` §5.1-5.4 | Duplicates AGENTS.md rules (terminology, generic design, input neutrality, pipeline integrity) | **Remove from collab rules.** Replace with a single line: "See AGENTS.md for terminology, generic design, input neutrality, and pipeline integrity rules." These rules are already in the canonical source. |

### Category 5: MISSING RULES / GAPS (agents lack guidance in these areas)

| # | Gap | Impact | Recommendation |
|---|-----|--------|----------------|
| G1 | No `apps/web/AGENTS.md` | Web app is the complex heart of the system. No path-specific guidance for web-only patterns. | **Create** a lean `apps/web/AGENTS.md` covering: pipeline file structure, prompt file conventions, test patterns, key modules. Similar to `apps/api/AGENTS.md`. |
| G2 | Agent_Outputs.md archival policy lacks thresholds | AGENTS.md already says "Captain may archive old entries during Consolidate WIP" but sets no size/age trigger. File grows unbounded (~5,500 lines). | **Refine existing rule** in AGENTS.md: add concrete thresholds — "When Agent_Outputs.md exceeds 200 lines, archive entries older than 2 weeks to `Docs/ARCHIVE/Agent_Outputs_YYYY-MM.md`." |
| G3 | Handoffs/ archival trigger lacks thresholds | AGENTS.md and `Handoffs/README.md` both say "archive during Consolidate WIP" but set no cadence. (Note: archival *has* been performed — 19 files already in archive — but the trigger was ad-hoc.) | **Refine existing rule** in AGENTS.md: add threshold — "During Consolidate WIP, archive consumed handoff files older than 2 weeks to `Docs/ARCHIVE/Handoffs/`." |
| G4 | Missing: tool-to-model mapping guidance | AGENTS.md §Tool Strengths Reference lists tools but not which models to use with each. Agents sometimes pick suboptimal model tiers. | **Expand** Tool Strengths Reference table to include recommended model tier per task type. |
| G5 | `Multi_Agent_Collaboration_Rules.md` §5.5 Documentation Sync is aspirational | "After any code change: update docs" — agents almost never do this automatically. | **Rewrite** to be pragmatic: "After any code change that adds/removes/renames a public-facing concept, flag documentation updates needed in your completion output. Doc updates are a separate task, not a mandatory inline step." |

### Category 6: CLARITY IMPROVEMENTS (make rules easier to follow)

| # | File | Issue | Recommendation |
|---|------|-------|----------------|
| C1 | `AGENTS.md` "Report Quality & Event Communication" | 43 lines of detailed severity classification rules. Very specific to one subsystem. | **Keep in AGENTS.md** (it's a cross-cutting concern agents must follow) but add a one-line summary at the top: "TL;DR: Severity reflects verdict impact, not what happened internally. Routine operations → silent/info. System failures → warning+. Evidence scarcity → info/warning, never error." |
| C2 | `AGENTS.md` "Consolidate WIP Procedure" | 55 lines. Only the Captain triggers this. Agents don't need it in context unless activated. | **Extract** to `Docs/AGENTS/Procedures/Consolidate_WIP.md`. Replace in AGENTS.md with: "See `Docs/AGENTS/Procedures/Consolidate_WIP.md` for the full procedure." |
| C3 | `Multi_Agent_Collaboration_Rules.md` §3.4 | 130+ lines for Multi-Agent Investigation Workflow. Very detailed but rarely used. | **Keep as-is.** It's a protocol reference — length is justified. But add a 3-line summary at the top of §3.4. |
| C4 | `Multi_Agent_Meta_Prompt.md` | 443 lines. The Quick-Start section (lines 1-65) is useful. The Full Template + 4 examples (lines 66-443) are rarely used. | **Trim examples** to 1 (remove the 3 that reference stale pipeline modes). Keep Quick-Start + Full Template + 1 clean example. |

---

## Prioritized Action Plan

### Phase 1: Fix Stale Content (HIGH priority, ~30 min)

These fixes prevent agents from following wrong instructions.

| # | Action | Files | Effort |
|---|--------|-------|--------|
| 1.1 | Remove monolithic-dynamic reference from Cursor TS rules | `.cursor/rules/factharbor-typescript.mdc` | 2 min |
| 1.2 | Replace "POC" with neutral language in Windsurf + Cursor core | `.windsurfrules`, `.cursor/rules/factharbor-core.mdc` | 5 min |
| 1.3 | Fix stale examples in Meta-Prompt (remove Orchestrated/Monolithic Dynamic references) | `Docs/AGENTS/Multi_Agent_Meta_Prompt.md` | 10 min |
| 1.4 | Delete dead redirect stubs | `Docs/AGENTS/Role_Code_Review_Agent.md`, `Docs/AGENTS/TECH_WRITER_START_HERE.md` | 2 min |
| 1.5 | Add `tools/vscode-xwiki-preview` to tool configs missing it | `.github/copilot-instructions.md`, `.windsurfrules`, `.clinerules/00-factharbor-rules.md` | 5 min |
| 1.6 | Update stale dates: `Date:` (line 4) and `Last Reviewed:` (line 730) in `Multi_Agent_Collaboration_Rules.md`; `Last Reviewed:` (line 443) in `Multi_Agent_Meta_Prompt.md` | `Multi_Agent_Collaboration_Rules.md`, `Multi_Agent_Meta_Prompt.md` | 2 min |

### Phase 2: Archive & Reduce Bloat (HIGH priority, ~30 min)

These actions reduce context waste and improve agent efficiency.

| # | Action | Files | Effort |
|---|--------|-------|--------|
| 2.1 | Archive Agent_Outputs.md: move entries older than 2 weeks to `Docs/ARCHIVE/Agent_Outputs_2026-02.md` and `..._2026-03-early.md`. Keep only entries from 2026-03-10 onward in the active file. | `Docs/AGENTS/Agent_Outputs.md`, `Docs/ARCHIVE/` | 20 min |
| ~~2.2~~ | ~~Archive consumed Handoffs~~ | **ALREADY DONE** — 19 files already in `Docs/ARCHIVE/Handoffs/`. Only 1 active handoff remains. No action needed. | 0 min |
| 2.3 | Refine existing archival policy in AGENTS.md — add concrete thresholds (size/age triggers) to the existing "Captain may archive" guidance | `AGENTS.md` | 10 min |

### Phase 3: Remove Redundancy (MEDIUM priority, ~20 min)

| # | Action | Files | Effort |
|---|--------|-------|--------|
| 3.1 | Remove duplicated §5.1-5.4 from Multi_Agent_Collaboration_Rules.md. Replace with cross-reference to AGENTS.md. | `Multi_Agent_Collaboration_Rules.md` | 10 min |
| 3.2 | Add sync-check reminder comment at top of each tool config: `<!-- Sync check: terminology, safety, commands must match /AGENTS.md. Last synced: YYYY-MM-DD -->` | All 7 tool config files | 10 min |

### Phase 4: Fill Gaps (MEDIUM priority, ~40 min)

| # | Action | Files | Effort |
|---|--------|-------|--------|
| 4.1 | Create `apps/web/AGENTS.md` — lean web-app-specific patterns | `apps/web/AGENTS.md` (NEW) | 20 min |
| 4.2 | Expand Tool Strengths Reference with model tier recommendations | `AGENTS.md` | 10 min |
| 4.3 | Rewrite §5.5 Documentation Sync to be pragmatic | `Multi_Agent_Collaboration_Rules.md` | 10 min |

### Phase 5: Clarity Improvements (LOW priority, ~30 min)

| # | Action | Files | Effort |
|---|--------|-------|--------|
| 5.1 | Add TL;DR summary to "Report Quality & Event Communication" section | `AGENTS.md` | 5 min |
| 5.2 | Extract Consolidate WIP procedure to `Docs/AGENTS/Procedures/Consolidate_WIP.md` | `AGENTS.md`, `Docs/AGENTS/Procedures/` (NEW) | 15 min |
| 5.3 | Add 3-line summary at top of §3.4 Multi-Agent Investigation | `Multi_Agent_Collaboration_Rules.md` | 5 min |
| 5.4 | Trim Meta-Prompt examples (keep 1 clean example, remove 3 stale ones) | `Docs/AGENTS/Multi_Agent_Meta_Prompt.md` | 5 min |

### Phase 6: Curate Learnings (LOW priority, Captain-directed)

| # | Action | Files | Effort |
|---|--------|-------|--------|
| 6.1 | Captain reviews Role_Learnings.md: promote best entries to role files, archive dated entries | `Role_Learnings.md`, role files | 30 min |

---

## Tool-Specific Cleanup Prompts

Each prompt is designed for the specific tool's capabilities, context limits, and knowledge system. The Captain can paste these directly to the appropriate agent.

---

### Prompt 1: Claude Code (Mid-Tier) — Phase 1 Stale Content Fixes

```
As Agents Supervisor, execute Phase 1 of the Agent Rules Cleanup Plan
(Docs/WIP/Agent_Rules_Cleanup_Plan_2026-03-17.md).

You have 6 tasks — do them all in this session:

1.1 — Edit `.cursor/rules/factharbor-typescript.mdc` line 10:
   Remove the line "- Alternative pipeline: `apps/web/src/lib/analyzer/monolithic-dynamic.ts`"
   (This pipeline was removed pre-release.)

1.2 — Edit `.windsurfrules` line 7 and `.cursor/rules/factharbor-core.mdc` line 13:
   Replace "POC with two apps" with "Two apps + one tool" to match CLAUDE.md phrasing.
   In both files, also add "- `tools/vscode-xwiki-preview` — VS Code extension for XWiki previews"
   to the project list (this covers task 1.5 for these two files).

1.3 — Edit `Docs/AGENTS/Multi_Agent_Meta_Prompt.md`:
   - Lines ~205: Replace the Shadow Mode example constraints
     "Must work with both pipeline modes (Orchestrated, Monolithic Dynamic)"
     with "Must work with the ClaimAssessmentBoundary pipeline"
   - Remove or update any other references to removed pipeline modes in examples.
   - Keep Quick-Start examples (they're fine). Remove Examples 2 and 3 (they're
     just variations of the same Shadow Mode task). Keep Example 1 (updated) and
     Example 4 (investigation — still valid).

1.4 — Delete these dead redirect stubs:
   - `Docs/AGENTS/Role_Code_Review_Agent.md`
   - `Docs/AGENTS/TECH_WRITER_START_HERE.md`

1.5 — Edit `.github/copilot-instructions.md` and `.clinerules/00-factharbor-rules.md`:
   Add "- `tools/vscode-xwiki-preview` — VS Code extension for XWiki previews"
   to the project overview section of each file.

1.6 — Update stale dates in governance docs:
   - `Multi_Agent_Collaboration_Rules.md` line 4: change `**Date:** 2026-02-10` to `**Date:** 2026-03-17`
   - `Multi_Agent_Collaboration_Rules.md` line 730: change `**Last Reviewed:** 2026-02-10` to `**Last Reviewed:** 2026-03-17`
   - `Multi_Agent_Meta_Prompt.md` line 443: change `**Last Reviewed:** 2026-02-10` to `**Last Reviewed:** 2026-03-17`

After all edits, run `npm -w apps/web run build` to verify nothing broke.
Commit with: "chore(agents): fix stale content in agent governance files"
```

---

### Prompt 2: Claude Code (Mid-Tier) — Phase 2 Archive & Reduce Bloat

```
As Agents Supervisor, execute Phase 2 of the Agent Rules Cleanup Plan
(Docs/WIP/Agent_Rules_Cleanup_Plan_2026-03-17.md).

Task 2.1 — Archive old Agent_Outputs.md entries:
- Read Docs/AGENTS/Agent_Outputs.md (~5,500 lines)
- Keep ONLY entries dated 2026-03-10 and newer in the active file
- Move all older entries to Docs/ARCHIVE/Agent_Outputs_Pre_2026-03-10.md
  with a header: "# Archived Agent Outputs (before 2026-03-10)"
- Ensure the active file retains its header and format

(Task 2.2 — Handoff archival: SKIP — already done. 19 files in Docs/ARCHIVE/Handoffs/,
only 1 active handoff remains.)

Task 2.3 — Refine existing archival policy in AGENTS.md:
- AGENTS.md already says (line 377): "Cleanup: During Consolidate WIP (or periodically),
  the Captain may archive old entries from Agent_Outputs.md and clear processed handoff files."
- This lacks concrete thresholds. In the Agent Exchange Protocol section, find the
  existing "Cleanup:" bullet and replace it with a subsection:

### Archival Thresholds

The existing cleanup guidance ("Captain may archive during Consolidate WIP") applies
with these concrete triggers:

- **Agent_Outputs.md**: When the file exceeds 200 lines, archive entries older
  than 2 weeks to `Docs/ARCHIVE/Agent_Outputs_YYYY-MM.md`. The active file
  should contain only recent entries that agents may need for context.
- **Handoffs/**: When the active folder exceeds 15 files, archive consumed
  handoff files older than 2 weeks to `Docs/ARCHIVE/Handoffs/`.
- **Role_Learnings.md**: Captain curates quarterly. Promote best learnings into
  role files or collaboration rules; archive dated entries.

Commit with: "chore(agents): archive old outputs, add archival thresholds"
```

---

### Prompt 3: Codex / GPT — Phase 3 Remove Redundancy

> **For Codex CLI or ChatGPT with repo context.** GPT reads AGENTS.md natively.

```
As Agents Supervisor, execute Phase 3 of the Agent Rules Cleanup Plan
(Docs/WIP/Agent_Rules_Cleanup_Plan_2026-03-17.md).

Task 3.1 — Remove duplicated rules from Multi_Agent_Collaboration_Rules.md:

Sections §5.1 (Terminology Precision), §5.2 (Generic Design), §5.3 (Input Neutrality),
and §5.4 (Pipeline Integrity) duplicate content already in /AGENTS.md.

Replace these 4 subsections with a single block:

## 5. Global Rules

> The following rules are defined authoritatively in `/AGENTS.md` and apply to all
> agent work. Read them there — they are not duplicated here to avoid drift.
>
> - **Terminology Precision** — AGENTS.md § Terminology table
> - **Generic Design** — AGENTS.md § Generic by Design
> - **Input Neutrality** — AGENTS.md § Input Neutrality
> - **Pipeline Integrity** — AGENTS.md § Pipeline Integrity

### 5.5 Documentation Sync
(keep this subsection but rewrite per Task 4.3 below)

Task 3.2 — Add sync-check comments to tool configs:

At the top of each of these files, add a comment (in the file's native comment format):
- `.github/copilot-instructions.md` → `<!-- Sync with /AGENTS.md. Last synced: 2026-03-17 -->`
- `.windsurfrules` → `# Sync with /AGENTS.md. Last synced: 2026-03-17`
- `.clinerules/00-factharbor-rules.md` → `<!-- Sync with /AGENTS.md. Last synced: 2026-03-17 -->`
- `.cursor/rules/factharbor-core.mdc` → add after frontmatter: `<!-- Sync with /AGENTS.md. Last synced: 2026-03-17 -->`
- `/GEMINI.md` → `<!-- Sync with /AGENTS.md. Last synced: 2026-03-17 -->`

Commit with: "chore(agents): remove duplicated rules, add sync-check markers"
```

---

### Prompt 4: Gemini CLI (High-Tier) — Phase 4 Fill Gaps

> **For Gemini CLI.** Leverages Gemini's strong reasoning for creating new content.

```
As Agents Supervisor, execute Phase 4 of the Agent Rules Cleanup Plan
(Docs/WIP/Agent_Rules_Cleanup_Plan_2026-03-17.md).

Task 4.1 — Create apps/web/AGENTS.md:

Read /AGENTS.md and apps/api/AGENTS.md for the pattern. Then read these files to
understand the web app structure:
- apps/web/src/lib/analyzer/claimboundary-pipeline.ts (scan structure, don't read all)
- apps/web/src/lib/analyzer/types.ts
- apps/web/src/lib/analyzer/verdict-stage.ts
- apps/web/src/app/api/internal/run-job/route.ts
- apps/web/package.json

Create apps/web/AGENTS.md following the same lean format as apps/api/AGENTS.md:
- Technology (Next.js 15, App Router, AI SDK, vitest)
- Project Structure (key directories: src/lib/analyzer/, src/app/api/, src/components/,
  prompts/, configs/, test/)
- Key Patterns (pipeline stages, LLM calls via AI SDK, UCM config, warning system,
  prompt file conventions)
- Configuration (env vars from .env.local)
- Commands (dev, test, build)
- Safety (don't run expensive tests, don't modify config.db without asking)

Keep it under 80 lines. Reference /AGENTS.md for shared rules.

Task 4.2 — Expand Tool Strengths Reference in AGENTS.md:

Find the "Tool Strengths Reference" table in /AGENTS.md. Replace it with an expanded
version that includes model tier recommendations:

| Task Type | Best Tool | Model Tier | Why |
|-----------|-----------|------------|-----|
| Complex architecture, multi-step reasoning | Claude Code | High | Deep reasoning, plan mode, autonomous tool use |
| Standard implementation, bug fixes | Claude Code / Cursor | Mid | Balanced cost/capability, good for structured work |
| Fast iteration, parallel tasks | Codex CLI | Mid | Cloud sandbox, reads AGENTS.md natively |
| Autonomous multi-step workflows | Cline | Mid or Lightweight | Runs commands autonomously, good for bulk operations |
| Inline code completions | GitHub Copilot | (built-in) | Fast, context-aware, low overhead |
| Multi-file refactors with preview | Cursor Composer | Mid | Visual diff, multi-file edits |
| Documentation + diagrams | Any agent with TECH_WRITER role | Mid | See Roles/Technical_Writer.md |
| Deep investigation, consolidation | Claude Code | High | Best for reading large context, synthesizing findings |
| .NET API work | Any agent | Any | Read apps/api/AGENTS.md first |
| xWiki documentation | Any agent | Any | Read Docs/AGENTS/AGENTS_xWiki.md first |

Note: Use capability tiers (High/Mid/Lightweight) per Multi_Agent_Collaboration_Rules.md §6,
not specific model versions, to avoid staleness as models evolve.

Task 4.3 — Rewrite §5.5 Documentation Sync in Multi_Agent_Collaboration_Rules.md:

Replace the current §5.5 with:

### 5.5 Documentation Sync

After any code change that **adds, removes, or renames** a user-facing concept,
API endpoint, configuration parameter, or pipeline stage:

1. **Flag it** in your completion output ("For next agent" field): list which docs
   may need updating and why
2. **Do not inline doc updates** unless the task explicitly includes documentation
3. Documentation updates are a separate task — the Captain or Technical Writer
   will pick them up

This replaces the previous "update docs after every change" rule, which was
aspirational and rarely followed. Flagging is lightweight and ensures nothing
is silently lost.

Commit with: "chore(agents): create web AGENTS.md, expand tool reference, fix doc sync rule"
```

---

### Prompt 5: Cline (Mid-Tier or Lightweight) — Phase 5 Clarity Improvements

> **For Cline.** Autonomous execution of straightforward edits across multiple files.

```
As Agents Supervisor, execute Phase 5 of the Agent Rules Cleanup Plan
(Docs/WIP/Agent_Rules_Cleanup_Plan_2026-03-17.md).

Read /AGENTS.md and Docs/AGENTS/Multi_Agent_Collaboration_Rules.md first.

Task 5.1 — Add TL;DR to "Report Quality & Event Communication" in /AGENTS.md:

Find the section "### Report Quality & Event Communication" in AGENTS.md.
Add this line immediately after the section header (before "MANDATORY"):

> **TL;DR:** Severity = verdict impact. Routine ops → silent/info. System failures → warning+. Evidence scarcity (analytical reality) → info/warning, never error/severe. If the verdict wouldn't change, it's silent or info.

Task 5.2 — Extract Consolidate WIP to its own file:

1. Create Docs/AGENTS/Procedures/ directory
2. Create Docs/AGENTS/Procedures/Consolidate_WIP.md
3. Move the entire "### Consolidate WIP Procedure" subsection content from
   AGENTS.md into this new file (with a proper header)
4. Replace the removed section in AGENTS.md with:

### Consolidate WIP Procedure

When the Captain requests "Consolidate WIP", follow the procedure in
`Docs/AGENTS/Procedures/Consolidate_WIP.md`.

Task 5.3 — Add summary to §3.4 Multi-Agent Investigation:

In Multi_Agent_Collaboration_Rules.md, find "### 3.4 Multi-Agent Investigation Workflow".
Add this summary block right after the heading:

> **Quick summary:** Captain dispatches 2+ agents to investigate independently
> (each writes to their own spoke file). A consolidator merges findings into
> the hub document. Captain reviews and approves. Full protocol below.

Task 5.4 — Trim Meta-Prompt examples:

In Docs/AGENTS/Multi_Agent_Meta_Prompt.md:
- Keep "Example 1: Lead Architect - Design Task" (but update any stale pipeline
  references to use ClaimAssessmentBoundary pipeline only)
- Keep "Example 4: LLM Expert - Investigation Task" (still valid)
- Remove "Example 2: Lead Developer - Review Task" and "Example 3: Senior Developer -
  Implementation Task" (they're variations of the same Shadow Mode task and add
  350+ lines of bulk)
- Renumber remaining examples as Example 1 and Example 2

Commit with: "chore(agents): improve clarity — TL;DR, extract procedure, trim examples"
```

---

### Prompt 6: Any Agent (Captain-directed) — Phase 6 Curate Learnings

```
As Agents Supervisor, execute Phase 6 of the Agent Rules Cleanup Plan
(Docs/WIP/Agent_Rules_Cleanup_Plan_2026-03-17.md).

Read Docs/AGENTS/Role_Learnings.md completely.

For each role section, assess every entry:

1. **Still relevant?** Check if the learning still applies to the current codebase.
   Cross-reference against recent code changes and current architecture.

2. **Promote or archive?**
   - If the learning is a universal best practice → propose adding it to the
     role's file in Docs/AGENTS/Roles/ (under a "Tips" or "Learned Patterns" section)
   - If the learning is dated (references removed code, fixed bugs, old approaches)
     → mark it for removal
   - If still relevant but situational → keep in Role_Learnings.md

3. Produce a report listing:
   - Entries to promote (with proposed destination)
   - Entries to archive/remove (with reason)
   - Entries to keep as-is

Do NOT execute changes — this is an audit for Captain review.
Write your report to Docs/WIP/Role_Learnings_Curation_Report_2026-03-17.md
```

---

## Estimated Total Effort

| Phase | Priority | Effort | Can Parallelize? |
|-------|----------|--------|-----------------|
| Phase 1: Fix Stale Content | HIGH | ~30 min | Yes (split across 2 agents) |
| Phase 2: Archive & Reduce Bloat | HIGH | ~30 min | Sequential (2.1 then 2.3; task 2.2 already done) |
| Phase 3: Remove Redundancy | MEDIUM | ~20 min | Yes (single agent) |
| Phase 4: Fill Gaps | MEDIUM | ~40 min | Partially (4.1 independent of 4.2/4.3) |
| Phase 5: Clarity Improvements | LOW | ~30 min | Yes (all tasks independent) |
| Phase 6: Curate Learnings | LOW | ~30 min | Yes (audit only) |
| **Total (sequential)** | | **~3.0 hours** | — |
| **Total (parallelized)** | | **~2.0 hours** | Phases 1+3 parallel, then 2, then 4+5 parallel, then 6 |

**Recommended execution order:** Phase 1 + Phase 3 in parallel → Phase 2 (depends on AGENTS.md edits settling) → Phase 4 + Phase 5 in parallel → Phase 6 whenever the Captain has time.

---

## Review Log

| Date | Reviewer Role | Status | Comments |
|------|---------------|--------|----------|
| 2026-03-17 | Agents Supervisor + LLM Expert (Sonnet) | REQUEST_CHANGES | 5 findings: (1) HIGH — handoff inventory stale, archival already done; (2) HIGH — archival policy gap overstated, existing rules need thresholds not new policy; (3) MEDIUM — task 1.6 targeted wrong field; (4) MEDIUM — model-version pinning contradicts tier-based guidance; (5) LOW — quantitative claims slightly off |
| 2026-03-17 | Agents Supervisor (Opus) | REVISED | All 5 findings addressed: inventory corrected, policy reframed as threshold refinement, task 1.6 fixed to target correct fields, model names replaced with tier labels, handoff task marked done, effort revised |
| 2026-03-17 | Re-check (Sonnet) | APPROVE with minor fixes | 2 LOW findings: (1) Agent_Outputs line count was tool-dependent (wc vs PowerShell); (2) effort total inconsistent with phase sums. No higher-severity issues remain. |
| 2026-03-17 | Agents Supervisor (Opus) | FINAL | Line counts rounded to ~5,500 (approximate, avoids tool-dependent drift). Effort table now shows both sequential (3.0h) and parallelized (2.0h) totals. |

---

## Decision Record

- 2026-03-17: Cleanup plan approved for execution after review updates recorded in the Review Log.
- 2026-03-17: Phases 1, 2, and 5 executed in commit `6214aa14`.
- 2026-03-17: Phase 3 executed in commit `bc36c51f`.
- 2026-03-17: Phase 4 executed in commit `03e96944`.
- 2026-03-17: Phase 6 executed in commit `dc9729e5`.
- 2026-04-04: Archived as a historical planning document after documentation-currency review. The canonical current state is the live governance files, not this plan snapshot.
