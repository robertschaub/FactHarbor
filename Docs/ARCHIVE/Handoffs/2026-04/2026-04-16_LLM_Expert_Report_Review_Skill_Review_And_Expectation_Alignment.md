### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Report Review Skill Review And Expectation Alignment

**Task:** Review the newly added `/report-review` workflow, the benchmark expectation file, and the AGENTS wiring; add any missing pieces based on recent benchmark-quality investigation work.

**Files touched:**
- `.claude/skills/report-review/SKILL.md`
- `Docs/AGENTS/benchmark-expectations.json`
- `AGENTS.md`
- `.github/copilot-instructions.md`
- `Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Report_Review_Skill_Review_And_Expectation_Alignment.md`
- `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:**
- Fixed a concrete workflow bug in the skill: the Phase 1 SQL snippet now queries `JobId`, which matches the actual primary key in `apps/api/Data/Entities.cs`.
- Tightened `input=<slug>` resolution so `/report-review` prefers exact slug matches and only falls back to a unique prefix match. This avoids ambiguous scope selection for families that share a prefix.
- Removed the dead `MEMORY.md` reference from the skill. The repo has `CLAUDE.md` and Role/Handoff sources, but no `MEMORY.md` file.
- Aligned the expectation file and instruction surface by renaming the inconsistent `plastik-en` slug to `plastic-en` and by adding the missing WWII-comparison asylum input to the Captain-defined analysis input lists in both `AGENTS.md` and `.github/copilot-instructions.md`.

**Open items:**
- The newly submitted current-head reruns may justify updating `benchmark-expectations.json` once they finish, especially for `bolsonaro-pt` and the two Swiss families.
- `Docs/AGENTS/benchmark-expectations.json` still encodes historical expectations rather than current-head rerun outcomes; that is correct for now, but it should be refreshed after the next deliberate verification wave.

**Warnings:**
- `Docs/AGENTS/Agent_Outputs.md` was already dirty from other task streams before this append. This task adds one new entry only and does not clean up unrelated pending entries.
- I did not commit these review/alignment edits.

**For next agent:**
- If `/report-review` is exercised soon, verify that the new exact-slug behavior feels ergonomic enough; if users still guess the wrong family names, consider adding explicit alias support in `benchmark-expectations.json` rather than reintroducing loose matching.
- Once the current rerun batch reaches terminal states, decide whether `latestVerifiedJobId` / `latestObserved` should be updated for any family in `benchmark-expectations.json`.

**Learnings:** Appended to Role_Learnings.md? no
