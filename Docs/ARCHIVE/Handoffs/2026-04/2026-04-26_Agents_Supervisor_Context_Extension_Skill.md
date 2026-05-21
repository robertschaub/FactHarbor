### 2026-04-26 | Agents Supervisor / LLM Expert | Codex (GPT-5) | Context Extension Skill

**Task:** Propose, review, debate, and install a new context-extension skill so agents can externalize selected working context and reload it when context-window pressure, compaction, interruption, or handoff would otherwise lose important state.

**Files touched:**
- `.claude/skills/context-extension/SKILL.md`
- `.claude/skills/context-extension/agents/openai.yaml`
- `.claude/skills/context-extension/references/artifact-template.md`
- `C:/Users/rober/.codex/skills/context-extension/SKILL.md`
- `C:/Users/rober/.codex/skills/context-extension/agents/openai.yaml`
- `C:/Users/rober/.codex/skills/context-extension/references/artifact-template.md`
- `AGENTS.md`
- `GEMINI.md`
- `.gemini/skills/factharbor-agent/SKILL.md`
- `factharbor-agent.skill`
- `Docs/DEVELOPMENT/Claude_Code_Skills.md`
- `.gitignore`
- `Docs/AGENTS/Handoffs/2026-04-26_Agents_Supervisor_Context_Extension_Skill.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Role_Learnings.md`

**Key decisions:**
- Installed `context-extension` in both the user Codex skills directory and the repo `.claude/skills/` workflow directory. The repo copy is canonical for FactHarbor; the user Codex copy is a mirror for automatic Codex triggering.
- Scoped the skill to in-progress working packets for session checkpoints, agent exchange, subagent returns, and reload. It explicitly does not replace `Agent_Outputs.md`, handoff files, source files, role files, or current user instructions.
- Chose `.codex/context-extension/` as the default artifact location and added it to `.gitignore` so reload artifacts remain local temporary state by default.
- Added a local manifest requirement at `.codex/context-extension/index.md` so active gitignored artifacts are discoverable across a session without polluting tracked docs.
- Added `references/artifact-template.md` to force a consistent reload/exchange shape: verified observations, decisions, reviewed/debated conclusions, agent exchange packet, hypotheses, open questions, reload plan, untrusted/stale content, and retention action.
- Synced discovery surfaces across `AGENTS.md`, `GEMINI.md`, `.gemini/skills/factharbor-agent/SKILL.md`, `factharbor-agent.skill`, and `Docs/DEVELOPMENT/Claude_Code_Skills.md`.
- Ran a small externalized design review: one subagent focused on governance/failure modes, one on install conventions, then a two-role debate over sufficiency. Challenger findings drove the canonical-source, gitignore, sensitivity-check, and lifecycle tightening amendments.
- Post-commit overlap review classified the follow-up as an incomplete existing workflow boundary, not a reason to add another mechanism. The skill now has an explicit Overlap Gate assigning ownership to `preflight_task`, `/handoff`, `/debate`, docs/WIP workflows, and analysis workflows, plus an Efficiency Budget to prevent artifact sprawl.
- Follow-up overlap debate reconciled to a narrow `MODIFY`: phase-boundary and after-debate checkpointing are optional only when state is materially expensive to reconstruct, and artifacts are suppressed when the owning workflow output, required handoff, `Agent_Outputs.md` entry, or subagent return already preserves enough state.

**Warnings:**
- `PyYAML` was missing from the default Python environment, so the first `quick_validate.py` attempt failed. I installed `PyYAML` with `python -m pip install PyYAML`, after which both skill validators passed.
- Cross-tool automatic invocation is not identical across tools: Codex and Claude can auto-trigger from skill metadata; Gemini and generic agents discover the workflow through shared docs and must read the file when conditions match.
- The user-level Codex copy can drift from the repo copy if future edits update only one path. The skill and development docs now state that `.claude/skills/context-extension/SKILL.md` is canonical for FactHarbor and the Codex copy must be resynced.
- Local `.codex/context-extension/` artifacts are intentionally gitignored. They can support session continuity, but anything durable must still be selectively promoted into the normal Exchange Protocol output.

**Verification:**
- `quick_validate.py C:/Users/rober/.codex/skills/context-extension` passed.
- `quick_validate.py .claude/skills/context-extension` passed.
- SHA-256 comparison confirmed the two `SKILL.md` copies match.
- SHA-256 comparison confirmed the mirrored `artifact-template.md` files also match.
- Node-based checks confirmed all discovery docs reference `.claude/skills/context-extension/SKILL.md`, both skill files reference `references/artifact-template.md`, and `.gitignore` includes `.codex/context-extension/`.
- Rebuilt `factharbor-agent.skill` and verified its archive shape remains `references/`, `scripts/`, `SKILL.md` at the package root.
- Overlap review found no blockers after the Overlap Gate and Efficiency Budget amendments.

**For next agent:**
- When changing the context-extension workflow, edit `.claude/skills/context-extension/SKILL.md` first, then resync `C:/Users/rober/.codex/skills/context-extension/SKILL.md` and rerun both validators.
- Do not let `.codex/context-extension/` become a permanent memory store. Temporary artifacts must be deleted, superseded, or promoted selectively into the normal Exchange Protocol output when a task ends.
- Use explicit modes when writing artifacts: `session-checkpoint`, `agent-exchange`, `subagent-return`, or `reload`.
- Before using the skill, apply the Overlap Gate: if another workflow owns the work, use context-extension only to carry compact state between phases.
- Default to no artifact when the owning workflow already preserves enough state for continuation.
- If other tool wrappers need stronger automatic behavior later, mirror the trigger language from `AGENTS.md` and `Docs/DEVELOPMENT/Claude_Code_Skills.md` instead of adding a second workflow.

**Learnings:** Appended to `Role_Learnings.md`? **Yes** — added an LLM Expert learning about dual-installed skills needing one canonical repo source plus mirrored user-level trigger copies and validation.
