---
### 2026-05-19 | Agents Supervisor | Codex (GPT-5.5) | Automatic Debt Sensor Checkpoints

**Task:** Add automatic `npm run debt:sensors` checkpoints to the Captain Deputy / Steer-Co / Lead Developer orchestration process after the Captain approved making the advisory sensor part of the process.

**Files touched:** `.claude/skills/captain-deputy/SKILL.md`, `.claude/skills/steer-co/SKILL.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.gemini/skills/factharbor-agent/SKILL.md`, `factharbor-agent.skill`, `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`, `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`, `Docs/AGENTS/Roles/Captain_Deputy.md`, `Docs/AGENTS/Roles/Lead_Developer.md`, `Docs/DEVELOPMENT/Claude_Code_Skills.md`, `Docs/AGENTS/Agent_Outputs.md`, and `Docs/AGENTS/Role_Learnings.md`.

**Key decisions:** The sensor is now an automatic advisory checkpoint for Captain Deputy V2/debt-sensitive intake, debt-sensitive Steer-Co packets, V2 Consolidation Gate packages, and Lead Developer closeout. The V2 Consolidation Gate requires the command/status/salient warnings in its consolidation block. Steer-Co must include the latest sensor status in debt-sensitive packet intake and final synthesis. Lead Developer packets now carry a mechanical debt-sensor section so implementation teams know when to run and report it.

**Scope control:** This did not add a new workflow, approval gate, or CI blocker. `advisory_warn` remains steering context, not a veto. The Captain must explicitly promote fail-on-warning behavior before a warning blocks work.

**Current sensor status:** `npm run debt:sensors` returns `advisory_warn`: V2 source lines `39358` exceed `30000`, V2 test lines `45403` exceed `40000`, boundary guard lines `9909` exceed `6000`, Docs/WIP markdown files `203` exceed `180`, handoff markdown files `708` exceed `650`, debt-guard telemetry has `12` net mechanism increases, and `5` V2 Source Acquisition/EvidenceCorpus-related docs need consolidation-marker review.

**Orchestration review recommendation:** Run one bounded review of the whole orchestration after this checkpoint rule lands. The review should focus on coordination failure modes, escalation thresholds, reasoning-budget defaults, Steer-Co trigger discipline, and cost/quality tradeoffs. It should not reopen a broad redesign unless the reviewers find a concrete authority or failure-mode gap.

**Warnings:** PowerShell did not consistently forward `--json` through `npm run debt:sensors -- --json` in this session, while `cmd /c "npm run debt:sensors -- --json"` and `node scripts/check-debt-sensors.mjs --json` produced JSON. The process therefore references the reliable plain `npm run debt:sensors` command for packet status. Use direct `node scripts/check-debt-sensors.mjs --json` if structured output is required by a later automation.

**For next agent:** If invoked as Captain Deputy on a V2/debt-sensitive workstream, run `npm run debt:sensors` during intake, before any debt-sensitive Steer-Co packet, and before closeout. Record status and salient warnings in the packet or handoff. Do not stop solely on `advisory_warn` unless the Captain explicitly promotes fail-on-warning mode.

**Learnings:** Appended to `Docs/AGENTS/Role_Learnings.md` (yes): mechanical debt sensors are most useful as automatic advisory checkpoints owned by Captain Deputy/Steer-Co/Lead Developer, not as a hard gate before an accepted baseline exists.

```text
DEBT-GUARD RESULT
Classification: technical-debt-sensitive governance amendment
Chosen option: amend existing Captain Deputy, Steer-Co, V2 gate, Lead Developer, and tool-wrapper docs
Rejected path and why: adding a new workflow or hard hook/CI gate would increase mechanism count and interrupt routine work before Captain accepts thresholds
What was removed/simplified: none
What was added: automatic advisory debt-sensor checkpoint language and packet fields
Net mechanism count: unchanged; reused the existing `npm run debt:sensors` mechanism
Budget reconciliation: touched governance/skill/docs/package artifacts only; no product code, prompt, model, config, live-job, or analysis behavior changed
Verification: `npm run debt:sensors`; `git diff --check`; `Compress-Archive -Path .gemini/skills/factharbor-agent/* -DestinationPath factharbor-agent.skill -Force`; `npm run index`
Debt accepted and removal trigger: current `advisory_warn` baseline remains accepted until Captain promotes thresholds or asks for cleanup slices
Residual debt: a future bounded orchestration review should check whether the sensor creates enough actionability without adding stop-start overhead
```
