---
### 2026-04-13 | LLM Expert | Claude Code (Opus 4.6) | Trim root AI-instruction files

**Task:** Reduce root CLAUDE.md and AGENTS.md to minimize AI agent instruction-file bloat (community evidence links compliance decay to growing instruction size). Target: CLAUDE.md ≤40L, AGENTS.md ≤200L.

**Files touched:**
- `AGENTS.md` (458L → 297L) — externalized Agent Handoff Protocol, Tool Strengths, xWiki Reading sections; compressed Test Cost Warning prose.
- `CLAUDE.md` (62L → 34L) — dropped duplicate Auth/Safety/Terminology content; kept project snapshot + 3-line terminology cheat sheet + pointer block.
- `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` — pointer-only updates at 5 occurrences (`AGENTS.md § Agent Exchange Protocol` → `Docs/AGENTS/Policies/Handoff_Protocol.md`).
- `Docs/AGENTS/Policies/Handoff_Protocol.md` (new, 151L) — full Agent Handoff Protocol, Role Activation Protocol, alias table, Working Principles, Agent Exchange Protocol, unified template, incoming-role checklist, Archival Thresholds, Consolidate WIP pointer.
- `Docs/AGENTS/Policies/Tool_Strengths.md` (new, 16L) — Tool Strengths Reference table, with cross-reference to MACR §6 Model-Class Guidelines.
- `Docs/AGENTS/Policies/xWiki_Reading.md` (new, 9L) — quick syntax reference, pointer to `GlobalMasterKnowledge_for_xWiki.md`.

**Key decisions:**
- **Moved, did not delete.** Phase 3 review corrected initial assumption: MACR.md points *to* AGENTS.md as source of truth for Agent Exchange Protocol, not the other way around. So content had to be moved to Policies/ and MACR.md pointers updated — not deleted as duplicate.
- **AGENTS.md 297 vs. 200 target.** Fundamental Rules (~140L) is non-negotiable per plan. Architecture (44L), Commands (~20L), Safety (~8L), Authentication (~8L), Current State (~14L), Instruction Precedence (~12L) + headers/separators ≈ 250L floor. 297 is close to that floor without sacrificing load-bearing rules. Accepted by Code Reviewer.
- **Three-layer stub pattern** for externalized sections in AGENTS.md: section heading + one-line summary + explicit human-readable pointer path. Works for tools that ignore `@`-imports (Cursor/Codex/Gemini/Copilot).
- **Ordering preserved:** Instruction Precedence FIRST, Terminology before Architecture, Fundamental Rules internal order untouched, Safety before pointer sections.

**Open items:**
- `.claude/settings.json` has a pre-existing modification (`CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1`) that was added by the user before this task began — it should commit separately from this docs refactor. Staging guidance provided in chat.
- Unstaged changes pending user review and commit.

**Warnings:**
- **Rule-inventory audit count was 23 → 24** (≥ baseline ✓), but the distribution shifted: 5 rule-keyword hits moved from AGENTS.md into the new Handoff_Protocol.md. If Handoff_Protocol.md ever gets deleted or renamed, rules will be lost silently. Future agents: do not delete Handoff_Protocol.md; update MACR.md pointers if renamed.
- **CLAUDE.md auto-load dependency:** CLAUDE.md relies on `@AGENTS.md` auto-import to surface Auth/Safety/Terminology full content. If a tool ignores `@`-imports (Codex, some Copilot configs), it must read `/AGENTS.md` directly — the new CLAUDE.md states this explicitly.
- **External doc reliance:** Handoff_Protocol.md, Tool_Strengths.md, xWiki_Reading.md are now the authoritative homes for their content. Do not re-duplicate in AGENTS.md.

**For next agent:**
- If extending the handoff protocol, edit `Docs/AGENTS/Policies/Handoff_Protocol.md` directly — AGENTS.md contains only a 5-line stub.
- If adding a new AI tool (Cline, new IDE integration, etc.), add a row to `Docs/AGENTS/Policies/Tool_Strengths.md`, not AGENTS.md.
- If changing xWiki authoring syntax guidance, edit `Docs/AGENTS/GlobalMasterKnowledge_for_xWiki.md` (full rules) and/or `Docs/AGENTS/Policies/xWiki_Reading.md` (quick ref).
- MACR.md now references `Docs/AGENTS/Policies/Handoff_Protocol.md` at lines 71, 112, 367, 370, 372, 378 — do not revert to `AGENTS.md § Agent Exchange Protocol`.

**Pre-existing gap (not regression, non-blocking):** `Roles/Captain.md` exists but Captain is absent from the Role Alias Quick-Reference table in Handoff_Protocol.md. Follow-up task, not blocking this refactor.

**Commit guidance for user:**
Two separate commits recommended:
1. `docs(agents): trim root AI-instruction files, externalize handoff protocol and tool strengths` — covers `AGENTS.md`, `CLAUDE.md`, `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`, `Docs/AGENTS/Policies/`
2. `chore(claude-code): disable adaptive thinking default` — covers `.claude/settings.json` (pre-existing user change from LinkedIn-post discussion; unrelated to this refactor).

**Learnings:** Appended to Role_Learnings.md? **Yes** — see LLM Expert section entry for 2026-04-13. Summary: (1) Always grep the destination file before declaring a section "duplicate and safe to delete" — direction of truth can be opposite of what a file-size comparison implies. (2) Three-layer stub pattern (heading + summary + explicit path) makes externalized content reliable across AI tools with inconsistent `@`-import support. (3) When trimming governance files, capture a keyword-based rule inventory baseline (`MANDATORY|MUST|NEVER|always`) before edits and verify post-edit count is ≥ baseline — catches accidentally dropped rules without needing to diff every line.
