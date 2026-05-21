### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Captain-Defined Analysis Inputs Rule

**Task:** Add a repository-wide rule that agents must not invent analysis inputs and must instead use the approved Captain-defined inputs.

**Files touched:** `AGENTS.md`; `.github/copilot-instructions.md`; `Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Captain_Defined_Analysis_Inputs_Rule.md`; `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:** Placed the authoritative rule in `AGENTS.md` so it applies repository-wide to all agents and workflows. Synced `.github/copilot-instructions.md` so Copilot's workspace summary carries the same constraint. The rule explicitly forbids inventing, paraphrasing, translating, normalizing, or synthesizing substitute analysis inputs and requires agents to stop and ask Captain if a needed input is not on the approved list.

**Open items:** If Captain adds or replaces approved analysis inputs later, update both `AGENTS.md` and `.github/copilot-instructions.md` together to keep the summary file in sync with the authoritative rule.

**Warnings:** The approved analysis-input list is now duplicated in two instruction files by design. Future edits must keep them synchronized.

**For next agent:** Treat `AGENTS.md` as the source of truth for approved analysis inputs. Use the exact Captain-defined wording only; do not invent alternate phrasings for planning, validation, documentation, or live runs.

**Learnings:** no
