# Agent Knowledge Organization — Analysis & Decision

**Date:** 2026-02-24
**Status:** Executed (Option 5), Option 4 recommended for medium-term
**Role:** LLM Expert
**Requested by:** Captain

---

## Problem Statement

The project has multiple agent instruction files with ~60-70% content overlap across tool-specific configs. CLAUDE.md and AGENTS.md are both auto-loaded by Claude Code, causing duplicated content in context. Tool-specific files (copilot-instructions.md, .windsurfrules) contained outdated references to the removed `orchestrated.ts` pipeline. Multi_Agent_Collaboration_Rules.md at 49KB forced agents to load all 11 role definitions when activating just one role.

**Core question:** How to get the right knowledge to the right agent at the right time, without overloading context windows or maintaining redundant copies?

---

## Options Analyzed

### Option 1: Custom/Fine-tuned LLM

**Verdict: Not recommended.**

- Fine-tuning bakes knowledge into model weights. Project knowledge changes frequently (new learnings, architecture decisions, removed pipelines) — would need constant retraining.
- Loses access to frontier model capabilities (reasoning, coding quality) from Opus/Sonnet.
- Cost-benefit is poor for a single project with a solo developer.
- Fine-tuning excels at *style* and *format* — not *factual project knowledge* that evolves weekly.

### Option 2: RAG (Retrieval-Augmented Generation)

**Verdict: Good middle-ground, adds infrastructure.**

- Index all `Docs/` into a vector store, retrieve relevant chunks at query time.
- Could be implemented as an MCP server that Claude Code, Cursor, etc. can call.
- Keeps knowledge fresh without retraining.
- Downside: another system to build and maintain. Retrieval quality depends on chunking strategy and embedding quality — specialized terminology (ClaimAssessmentBoundary, EvidenceScope) may not chunk well with off-the-shelf embeddings.

### Option 3: Claude Projects (claude.ai)

**Verdict: Good for conversational work, limited for coding agents.**

- Upload project knowledge as persistent project documents on claude.ai.
- Works well for architecture discussions, planning, reviews.
- Doesn't help CLI-based coding workflows (Claude Code, Copilot, Windsurf).

### Option 4: MCP Knowledge Server (Recommended for medium-term)

**Verdict: Best practical option for multi-tool setup.**

- Build a lightweight MCP server exposing project knowledge as tools (e.g., `get_role_context("LLM Expert")`, `get_terminology()`, `get_architecture("pipeline")`).
- Claude Code, Cursor, and Cline all support MCP servers natively.
- Server reads existing `.md` files — no duplication, single source of truth.
- Smart filtering: when an agent activates as "LLM Expert", the MCP server returns only the relevant sections.
- Low infrastructure cost: local Node/Python process reading files.

**Not yet implemented.** Backlog item for future development.

### Option 5: Restructure Existing Files (Executed)

**Verdict: Lowest effort, immediate value. Do this regardless of other choices.**

- Split role definitions into per-role files (`Docs/AGENTS/Roles/`)
- Make tool-specific files thin pointers (not partial copies that drift)
- Fix outdated references
- Reduce CLAUDE.md duplication with AGENTS.md

---

## What Was Done (Option 5 Execution)

### Changes Made

1. **Created `Docs/AGENTS/Roles/` directory** with 11 per-role files:
   - Lead_Architect.md, Lead_Developer.md, Senior_Developer.md, Technical_Writer.md, LLM_Expert.md, Product_Strategist.md, Code_Reviewer.md, Security_Expert.md, DevOps_Expert.md, Captain.md, Agents_Supervisor.md

2. **Updated Multi_Agent_Collaboration_Rules.md** — replaced ~450 lines of inline role definitions (§2.1-§2.11) with a compact index table pointing to per-role files. File reduced from ~49KB to ~30KB.

3. **Slimmed CLAUDE.md** — removed sections duplicated in AGENTS.md (publishing, patterns, agent handoff details). Reduced from ~80 lines to ~55 lines. Since both files are auto-loaded by Claude Code, duplication was wasteful.

4. **Rewrote tool-specific files as thin pointers:**
   - `.github/copilot-instructions.md` — fixed stale `orchestrated.ts` → `claimboundary-pipeline.ts` and `runFactHarborAnalysis` → `runClaimBoundaryAnalysis`. Reduced to ~35 lines.
   - `.windsurfrules` — fixed stale `orchestrated.ts` reference. Reduced to ~35 lines.

5. **Updated cross-references:**
   - AGENTS.md Role Activation Protocol — step 2 now points to per-role files, alias table has `Role File` column instead of `Registry Section`
   - Docs/AGENTS/README.md — added Roles section listing all 11 files, updated "By Role" table

6. **Consolidated role-specific files:**
   - TECH_WRITER_START_HERE.md content merged into Roles/Technical_Writer.md (redirect notice left in original)
   - Role_Code_Review_Agent.md content merged into Roles/Code_Reviewer.md (redirect notice left in original)

### Stale References Fixed

| File | Old Reference | New Reference |
|------|--------------|---------------|
| copilot-instructions.md | `orchestrated.ts` | `claimboundary-pipeline.ts` |
| copilot-instructions.md | `runFactHarborAnalysis` | `runClaimBoundaryAnalysis` |
| .windsurfrules | `orchestrated.ts` (~13,600 lines) | Removed |
| Multi_Agent_Collaboration_Rules.md | `orchestrated.ts` in 3 role Key Source Files | `claimboundary-pipeline.ts` |

### Before/After Comparison

| Metric | Before | After |
|--------|--------|-------|
| CLAUDE.md lines | ~80 | ~55 |
| copilot-instructions.md lines | 68 | ~35 |
| .windsurfrules lines | 62 | ~35 |
| Multi_Agent_Collaboration_Rules.md size | ~49KB | ~30KB |
| Per-role files | 2 (TECH_WRITER, Code_Review) | 11 (complete set in Roles/) |
| Stale orchestrated.ts references | 5 across 3 files | 0 |
| Context loaded per role activation | All 11 role defs (~450 lines) | 1 role def (~40 lines) |

---

## Medium-Term Recommendation: MCP Knowledge Server

When the project grows beyond its current scale, implement Option 4:

- A local MCP server that indexes `Docs/AGENTS/Roles/`, `Docs/AGENTS/Role_Learnings.md`, and key architecture docs
- Exposes tools like `get_role("LLM Expert")`, `get_learnings("LLM Expert")`, `search_knowledge("verdict aggregation")`
- All tools (Claude Code, Cursor, Cline) can query it for context-aware knowledge delivery
- Eliminates the need for any content duplication in tool-specific config files
