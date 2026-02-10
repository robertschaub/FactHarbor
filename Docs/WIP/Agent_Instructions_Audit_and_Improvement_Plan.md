# Agent Instructions Audit & Improvement Plan

**Status:** IMPLEMENTED
**Created:** 2026-02-10
**Last Updated:** 2026-02-10
**Author Role:** Lead Developer (Claude Opus 4.6)
**Implemented By:** Agents Supervisor (Claude Opus 4.6)

---

## Context

FactHarbor uses multiple AI coding tools (Claude Code, GitHub Copilot, Cursor, Cline, Windsurf). Each tool auto-reads a different config file. This audit identified redundancy, gaps, staleness, and factual errors across all agent instruction files, then consolidated them so every tool gets the right context from a single source of truth (`AGENTS.md`).

---

## AI Tool Landscape — Config File Reference

| Tool | Config file(s) | Format | Notes |
|------|----------------|--------|-------|
| **Claude Code** | `CLAUDE.md` | Markdown | Auto-loaded into system prompt at session start |
| **GitHub Copilot** | `.github/copilot-instructions.md` | Markdown | Auto-loaded in VS Code |
| **Cursor** | `.cursor/rules/*.mdc` | MDC (Markdown + frontmatter) | Modern format: glob-scoped rules per file area. Legacy `.cursorrules` is deprecated. |
| **Cline / RooCode** | `.clinerules/*.md` | Markdown | Inserted into system prompt; supports directory with multiple files |
| **Windsurf** | `.windsurfrules` | Markdown | 6000 char/file limit, 12000 total. Cannot auto-read external files — must include rules inline. |
| **Kimi K2 / Kimi CLI** | (none) | N/A | Uses Cline as host — inherits `.clinerules/` |
| **GPT-Codex / ChatGPT** | `AGENTS.md` (convention) | Markdown | Not auto-read; must be referenced in prompt |
| **AGENT.md standard** | `AGENT.md` | Markdown | Emerging standard (agentmd/agent.md) — not yet widely adopted. AGENTS.md (plural) has 60,000+ repos. |

**Architecture adopted:**

```
AGENTS.md                              ← Single source of truth (full domain rules)
├── CLAUDE.md                          ← Substantive quickstart + terminology + safety + AGENTS.md directive
├── .github/copilot-instructions.md    ← Same pattern, Copilot-specific notes
├── .cursor/rules/*.mdc                ← 4 glob-scoped files (core, typescript, dotnet, xwiki)
├── .clinerules/00-factharbor-rules.md ← Cline/Kimi rules with autonomous-safety emphasis
├── .windsurfrules                     ← Condensed inline rules (2113 chars, within 6000 limit)
└── apps/api/AGENTS.md                 ← .NET-specific overrides (closest AGENTS.md wins)
```

**Design decision:** Tool config files are NOT thin pointers. Each includes substantive inline content (terminology, safety, key commands) because:
- Claude Code auto-loads CLAUDE.md into its system prompt — a pointer-only file wastes a tool call every session.
- Windsurf cannot auto-read referenced files — inline content is mandatory.
- All tools benefit from having critical terminology immediately available without a file read.

Sources:
- [Cursor Rules Guide (Jan 2026)](https://eastondev.com/blog/en/posts/dev/20260110-cursor-rules-complete-guide/)
- [Cline Rules docs](https://docs.cline.bot/features/cline-rules)
- [Windsurf Cascade Memories](https://docs.windsurf.com/windsurf/cascade/memories)
- [AGENTS.md Official](https://agents.md/)
- [AGENT.md universal standard](https://github.com/agentmd/agent.md)
- [Ruler: Single Source of Truth for AI Rules](https://github.com/intellectronica/ruler)

---

## Inventory (Post-Implementation)

### Agent instruction files (20 total — was 13)

| # | File | Lines | Purpose | Read by | Status |
|---|------|-------|---------|---------|--------|
| 1 | `/AGENTS.md` | ~250 | Master rules, terminology, architecture, commands, handoff protocol | All agents | **UPDATED** |
| 2 | `/CLAUDE.md` | 86 | Claude Code: quickstart + terminology + safety + handoff | Claude Code (auto) | **ENHANCED** (was 57) |
| 3 | `/.github/copilot-instructions.md` | 61 | Copilot: quickstart + terminology + safety + handoff | GitHub Copilot (auto) | **ENHANCED** (was 49) |
| 4 | `/.cursor/rules/factharbor-core.mdc` | ~35 | Core rules for all files in Cursor | Cursor (auto, always) | **NEW** |
| 5 | `/.cursor/rules/factharbor-typescript.mdc` | ~25 | TypeScript/Next.js rules | Cursor (auto, `apps/web/**/*.ts,tsx`) | **NEW** |
| 6 | `/.cursor/rules/factharbor-dotnet.mdc` | ~25 | .NET API rules | Cursor (auto, `apps/api/**/*.cs`) | **NEW** |
| 7 | `/.cursor/rules/factharbor-xwiki.mdc` | ~20 | xWiki editing rules | Cursor (auto, `Docs/xwiki-pages/**/*.xwiki`) | **NEW** |
| 8 | `/.clinerules/00-factharbor-rules.md` | ~60 | Cline/Kimi rules with autonomous-safety emphasis | Cline/RooCode (auto) | **NEW** |
| 9 | `/.windsurfrules` | ~50 | Condensed inline rules (2113 chars) | Windsurf (auto) | **NEW** |
| 10 | `/apps/api/AGENTS.md` | ~70 | .NET-specific patterns, structure, conventions | Any agent editing `apps/api/` | **NEW** |
| 11 | `/CONTRIBUTING.md` | 56 | Human contributor guide | Humans | **EXPANDED** (was 11) |
| 12 | `/Docs/AGENTS/README.md` | ~48 | Index of agent docs + tool config file table | All agents | **UPDATED** |
| 13 | `/Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` | ~470 | Roles, workflows, model-class guidelines | Multi-agent sessions | **UPDATED** |
| 14 | `/Docs/AGENTS/Multi_Agent_Meta_Prompt.md` | 373 | Task assignment template | Multi-agent sessions | Unchanged |
| 15 | `/Docs/AGENTS/Role_Code_Review_Agent.md` | 41 | Code review agent role | Review agents | Unchanged |
| 16 | `/Docs/AGENTS/TECH_WRITER_START_HERE.md` | 195 | Documentation agent guide | Tech writer agents | Unchanged |
| 17 | `/Docs/AGENTS/AGENTS_xWiki.md` | 119 | xWiki editing rules | xWiki editor agents | Unchanged |
| 18 | `/Docs/AGENTS/GlobalMasterKnowledge_for_xWiki.md` | ~150 | xWiki core rules | xWiki editor agents | Unchanged |
| 19 | `/Docs/AGENTS/InitializeFHchat_for_xWiki.md` | ~100 | Chat init for xWiki sessions | xWiki chat agents | Unchanged |
| 20 | `/Docs/AGENTS/Mermaid_ERD_Quick_Reference.md` | ~80 | Mermaid diagram syntax | Doc agents | Unchanged |

---

## Findings (Audit Phase)

Nine problems were identified. All have been resolved.

### Problem 1: CLAUDE.md was a weak subset of AGENTS.md — **RESOLVED**

**Severity:** HIGH

CLAUDE.md (57 lines) lacked terminology rules (AnalysisContext vs EvidenceScope), domain rules (no hardcoded keywords, input neutrality), safety rules, and agent handoff guidance.

**Resolution:** Enhanced to 86 lines. Added critical terminology (6 bullets), safety section, agent handoff section, and AGENTS.md directive for domain-heavy tasks. Kept all existing quickstart content (project overview, data flow, auth, commands, patterns).

### Problem 2: copilot-instructions.md was also a weak subset — **RESOLVED**

**Severity:** HIGH

Same gaps as CLAUDE.md.

**Resolution:** Enhanced to 61 lines with terminology, safety, handoff, and Copilot-specific note ("You are primarily used for inline completions and chat. For large refactors, suggest Cursor Composer or Claude Code.").

### Problem 3: Three files say the same thing differently — **MITIGATED**

**Severity:** MEDIUM

CLAUDE.md, copilot-instructions.md, and AGENTS.md all described data flow, auth, and env variables with slight differences.

**Resolution:** Accepted intentional overlap. Each tool config is self-sufficient for routine tasks (avoids requiring an extra file read), while AGENTS.md remains the canonical source. Quickstart content in tool configs is kept consistent with AGENTS.md. Drift risk accepted as trade-off for better agent bootstrapping.

### Problem 4: AGENTS.md had stale information — **RESOLVED**

**Severity:** MEDIUM

**Changes applied:**
- `orchestrated.ts` line count: `~12000` -> `~13600` (verified: 13,642 lines)
- `npm test`: removed "(placeholder)" — it actually runs vitest via `npm -w apps/web test`
- `npm run lint`: clarified as `Placeholder (echo "(add lint later)")`
- Added `npm -w apps/web run build` to commands table
- Version: `v2.10.2 project / v2.6.41 schema` -> `Pre-release (targeting v1.0)`
- Models: `Haiku 3.5` -> `Haiku 4.5`, `Sonnet 4` -> `Sonnet 4.5`
- Pipeline: Clarified Orchestrated (default) + Monolithic Dynamic (experimental). Added note that Monolithic Canonical is deprecated with removal planned (see `Docs/WIP/Canonical_Pipeline_Removal_Plan.md`).

**Correction to original audit:** The audit stated "Canonical pipeline fully removed" based on Project Lead input. Verification found **640 occurrences of "canonical" across 97 files** — in code (orchestrated.ts: 22 refs, config-schemas.ts: 23 refs), tests, docs, and xWiki pages. The Canonical pipeline *variant* is deprecated but has not been removed. A removal plan exists at `Docs/WIP/Canonical_Pipeline_Removal_Plan.md`. Actual removal is a separate engineering task, out of scope for this audit.

**Scoping note:** Version and model references in CHANGELOG.md and Docs/ARCHIVE/ were intentionally left unchanged — they are historically accurate records, not stale references.

### Problem 5: Multi_Agent_Collaboration_Rules.md referenced outdated models — **RESOLVED**

**Severity:** LOW

**Changes applied:**
- Line 12: Replaced `(GPT-5.2-CODEX, Claude Sonnet, Claude Opus)` with generic framing: `(via Claude Code, Cursor, Cline, GitHub Copilot, and other tools)`
- Section 6: Rewrote from model-specific (GPT-5.2-CODEX, Claude Sonnet, Claude Opus) to model-class-based (High-Capability, Mid-Tier, Lightweight). Added Kimi K2/Cline to Lightweight tier.
- Added usage note marking 5-phase workflow as "active for complex/risky tasks"

### Problem 6: No config files for Cursor, Cline, or Windsurf — **RESOLVED**

**Severity:** HIGH

**Files created:**
- `.cursor/rules/factharbor-core.mdc` — Always-on core rules (terminology, safety, handoff)
- `.cursor/rules/factharbor-typescript.mdc` — Auto-attached for `apps/web/**/*.ts,tsx`
- `.cursor/rules/factharbor-dotnet.mdc` — Auto-attached for `apps/api/**/*.cs`
- `.cursor/rules/factharbor-xwiki.mdc` — Auto-attached for `Docs/xwiki-pages/**/*.xwiki`
- `.clinerules/00-factharbor-rules.md` — Cline rules with Kimi K2 note and autonomous-safety emphasis
- `.windsurfrules` — Condensed inline rules (2113 chars, within 6000 char limit)

**Design decision:** Used `.cursor/rules/*.mdc` (modern format with glob-scoped activation) instead of legacy `.cursorrules` single file. The `.cursor/` directory already existed (contained `plans/`).

### Problem 7: CONTRIBUTING.md was nearly empty — **RESOLVED**

**Severity:** LOW

**Resolution:** Expanded from 11 lines to 56 lines. Added prerequisites, setup steps, run commands, testing, architecture rules, coding standards, AI agent workflow reference.

### Problem 8: No agent instruction file for apps/api (.NET) — **RESOLVED**

**Severity:** MEDIUM

**Resolution:** Created `apps/api/AGENTS.md` (~70 lines) covering .NET 8 technology stack, project structure (7 controllers, 2 services, 2 data files), key patterns (no migrations, JobService for all DB writes, header auth), configuration keys, commands, and safety rules. Added to `Docs/AGENTS/README.md` "By Role" table.

### Problem 9: No "agent handoff" protocol — **RESOLVED**

**Severity:** MEDIUM

**Resolution:** Added "Agent Handoff Protocol" section to AGENTS.md (after Safety, before Authentication). Includes:
- Two-step protocol: (1) assess fit, (2) recommend alternative if better suited
- Tool strengths reference table mapping task types to best tools
- Referenced from all tool config files (CLAUDE.md, copilot-instructions.md, Cursor rules, Cline rules, Windsurf rules)

---

## Resolved Questions

| # | Question | Original Answer | Implementation Resolution |
|---|----------|----------------|--------------------------|
| 1 | Is the 5-phase multi-agent workflow used? | Yes, for complex/risky work. | Added usage note to Multi_Agent_Collaboration_Rules.md |
| 2 | Has Canonical pipeline been removed? | "Yes, fully removed." | **Incorrect.** 640 occurrences remain. Updated AGENTS.md to note deprecated status. Removal is a separate task. |
| 3 | Current version numbers? | Reset to 1.0. | Updated to "Pre-release (targeting v1.0)" in AGENTS.md and Current_Status.md |
| 4 | Cursor-specific conventions? | "Don't know — please propose." | Created 4 glob-scoped `.mdc` files in `.cursor/rules/` |
| 5 | Keep CONTRIBUTING.md? | Yes, expand. | Expanded from 11 to 56 lines |
| 6 | `.cursor/rules/` vs `.cursorrules`? | (Open question) | **`.cursor/rules/*.mdc`** — modern format, glob-scoped, `.cursor/` dir already existed |
| 7 | Windsurf: reference or condensed? | (Open question) | **Condensed inline.** Windsurf cannot auto-read external files. |
| 8 | Adopt AGENT.md (singular) standard? | (Open question) | **Not adopted.** AGENTS.md (plural) has 60,000+ repo adoption. Monitor only. |

---

## Files Changed

### Modified (8 files)

| File | Summary of changes |
|------|-------------------|
| `/AGENTS.md` | Fixed line count (~13600), commands (npm test runs vitest), version (Pre-release v1.0), models (Haiku 4.5, Sonnet 4.5), pipeline status (Canonical deprecated not removed). Added Agent Handoff Protocol section. |
| `/CLAUDE.md` | Enhanced from 57 to 86 lines. Added: AGENTS.md directive, critical terminology (6 bullets), safety rules, agent handoff section. Kept all existing quickstart content. |
| `/.github/copilot-instructions.md` | Enhanced from 49 to 61 lines. Added: AGENTS.md directive, critical terminology, safety, Copilot-specific handoff note. Removed "If anything here is unclear" invitation. |
| `/Docs/STATUS/Current_Status.md` | Version -> Pre-release (targeting v1.0). "Twin-Path Architecture" -> "Pipeline Variants" with Canonical deprecated note. Model names: Haiku 3.5 -> 4.5, Sonnet 4 -> 4.5. Updated component health table. |
| `/Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` | Replaced model-specific names with generic framing. Rewrote Section 6 from model-specific to model-class-based. Added 5-phase workflow usage note. Updated last reviewed date. |
| `/Docs/AGENTS/README.md` | Added ".NET API Developer" role linking to `apps/api/AGENTS.md`. Added "Tool-Specific Config Files" table. |
| `/CONTRIBUTING.md` | Expanded from 11 to 56 lines. Added prerequisites, setup, running locally, testing, architecture rules, coding standards, AI agent workflow section. |
| `/Docs/WIP/Agent_Instructions_Audit_and_Improvement_Plan.md` | This file. Rewritten to reflect implemented state. |

### Created (7 files)

| File | Purpose |
|------|---------|
| `/.cursor/rules/factharbor-core.mdc` | Always-on: AGENTS.md directive, terminology, safety, handoff, conventions |
| `/.cursor/rules/factharbor-typescript.mdc` | Auto-attached for `apps/web/**/*.ts,tsx`: analyzer caveats, fetch patterns, commands |
| `/.cursor/rules/factharbor-dotnet.mdc` | Auto-attached for `apps/api/**/*.cs`: .NET 8, EF Core, JobService, header auth |
| `/.cursor/rules/factharbor-xwiki.mdc` | Auto-attached for `Docs/xwiki-pages/**/*.xwiki`: xWiki 2.1 syntax reference |
| `/.clinerules/00-factharbor-rules.md` | Cline/Kimi rules: terminology, autonomous-safety, Kimi K2 note |
| `/.windsurfrules` | Condensed inline rules (2113 chars within 6000 limit) |
| `/apps/api/AGENTS.md` | .NET-specific: project structure, patterns, config, commands |

---

## Out of Scope (Deferred)

| Item | Reason | Tracking |
|------|--------|----------|
| Canonical pipeline removal (640 refs, 97 files) | Large engineering task, not an instruction-file issue | `Docs/WIP/Canonical_Pipeline_Removal_Plan.md` |
| Version/model refs in CHANGELOG.md, Docs/ARCHIVE/ | Historical records, not stale references | N/A |
| AGENT.md (singular) universal standard adoption | Only ~informational status; AGENTS.md has 60,000+ adoption | Monitor [agentmd/agent.md](https://github.com/agentmd/agent.md) |
| Ruler/AI-Rulez config management tool | Adds build complexity; manual sync is manageable at current scale (5 tools) | Reconsider if drift becomes a problem |
| Vitest tests all broken (47/47 fail) | All test files fail with "No test suite found" — likely vitest config or import issue, not missing tests | Investigate vitest configuration |
| `Current_Status.md` inline version refs (v2.6.38, v2.8.1, v2.9.0 etc.) | Historical "when added" markers inside feature descriptions contrast oddly with "Pre-release v1.0" header | Decide: keep as historical context or strip for v1.0 reset |
| `.gitignore` line 79 "canonical prompts" comment | Uses "canonical" meaning "authoritative", not the pipeline variant — but could confuse agents following the deprecated-code rule | Clarify comment wording |

---

## Verification Results

| Check | Result |
|-------|--------|
| `~12000` in AGENTS.md | Gone (updated to ~13600) |
| `Haiku 3.5` / `Sonnet 4` in AGENTS.md | Gone (updated to 4.5) |
| `v2.10.2` in AGENTS.md | Gone (Pre-release, targeting v1.0) |
| `GPT-5.2` in Multi_Agent_Collaboration_Rules.md | Gone (generic model-class framing) |
| `placeholder` in AGENTS.md commands | Only appears for lint (correct) |
| `.windsurfrules` char count | 2113 chars (within 6000 limit) |
| `npm test` | Pre-existing failures (vitest config issue, unrelated to doc changes) |

---

## Review Log

| Date | Reviewer Role | Status | Comments |
|------|---------------|--------|----------|
| 2026-02-10 | Lead Developer (Claude Opus 4.6) | DRAFT | Initial audit: identified 13 files, 9 problems, proposed 6-phase plan |
| 2026-02-10 | Project Lead (Robert Schaub) | INPUT | Answered open questions, added Cline/Kimi/Windsurf scope, requested agent handoff protocol |
| 2026-02-10 | Agents Supervisor (Claude Opus 4.6) | IMPLEMENTED | Verified all claims (found 7 factual errors), resolved 3 open questions, executed 11-phase corrected plan. 15 files modified/created. |
