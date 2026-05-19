---
### 2026-05-19 | Agents Supervisor | Codex (GPT-5.5) | Captain Deputy Operating Model
**Task:** Define and implement the Captain Deputy front-door operating model so the Captain can interact with one agent that coordinates Steer-Co and the Lead Developer, keeps implementation moving autonomously, and applies dynamic reasoning levels across all involved agents.
**Files touched:** `.claude/skills/captain-deputy/SKILL.md`, `.claude/skills/captain-deputy/agents/openai.yaml`, `.claude/skills/steer-co/SKILL.md`, `Docs/AGENTS/Roles/Captain_Deputy.md`, `Docs/AGENTS/Roles/Captain.md`, `Docs/AGENTS/Roles/Lead_Developer.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.gemini/skills/factharbor-agent/SKILL.md`, `factharbor-agent.skill`, `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`, `Docs/AGENTS/Policies/Handoff_Protocol.md`, `Docs/AGENTS/README.md`, `Docs/DEVELOPMENT/Claude_Code_Skills.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/Role_Learnings.md`.
**Key decisions:** Added `/captain-deputy` as the single Captain-facing workstream coordinator, not a generic meta-router. The deputy coordinates Steer-Co for steering and Lead Developer for delivery, defaults to `R3` only during active autonomous coordination/final synthesis, and escalates for high risk, standing approval gates, unresolved material dissent, or essential no-consent decisions. Updated `/steer-co` from low-risk-only deputy decisions to low-risk or bounded medium-risk reversible decisions inside approved direction.
**Open items:** No implementation-code work was authorized or performed. The new role and skills remain untracked until staged/committed with the other governance changes.
**Warnings:** Captain Deputy does not bypass mandatory workflows, prompt/model/config approval, live-job discipline, security/data rules, or Captain approval gates. Lead Developer remains the delivery owner; Captain Deputy should not implement application code directly. `Steer-Co Leader` is not an activatable role alias; it is a GPT-5.5-pinned function inside `/steer-co`. Opus/Gemini challenge calls still require distinct written questions and should not be used as duplicate extra-high review.
**For next agent:** To run an autonomous workstream, start with `As Captain Deputy, Skill: captain-deputy` and produce a workstream packet with objective, authority, scope, reasoning budgets, mandatory workflows, validation, and stop triggers. Use `/steer-co` when verifier failure, scope drift, reviewer disagreement, contested causality, or final synthesis requires model-diverse steering. Bounded medium risk means a wrong decision can be undone within one work session without Captain intervention, data loss, public-facing impact, live-job budget consumption, or prompt/model/config/security approval.
**Learnings:** Appended to `Docs/AGENTS/Role_Learnings.md` (yes): Captain Deputy should be the front-door coordinator, while Steer-Co and Lead Developer remain separate lanes with different authority; session functions such as Steer-Co Leader should not be role aliases.

**Opus 4.6 review consolidation:** Claude Opus 4.6 returned `approve_with_minor_changes`. The high-severity finding was that aliasing `Steer-Co Leader` to Captain Deputy would let non-GPT tools activate a GPT-5.5-pinned function. Consolidation removed that alias from the role file, role registry, and handoff protocol; clarified Deputy-vs-Leader authority; defined bounded medium risk; reduced reasoning-default duplication; and added a Lead Developer cross-reference to standing Captain gates.

**Captain Claude preference:** Captain confirmed preference for `claude-opus-4-6` over newer Opus variants, with adaptive thinking disabled, `CLAUDE_CODE_EFFORT_LEVEL=max`, and `MAX_THINKING_TOKENS=63999`. Project `.claude/settings.json` already matched; `C:/Users/rober/.claude/settings.json` was updated to include the same env block. Future agents should not switch to adaptive thinking only because the CLI emits a deprecation warning.

```text
DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism
Chosen option: amend existing governance text in place
Rejected path and why: adding another role or new mechanism would increase complexity; the issue was ambiguity in the existing coordination model
What was removed/simplified: removed `Steer-Co Leader` as a Captain Deputy alias and reduced duplicate reasoning-default language in the Captain Deputy skill
What was added: bounded-medium-risk definition, Deputy-vs-Leader authority clarification, model-agnostic Deputy note, Lead Developer standing-gates cross-reference
Net mechanism count: unchanged
Budget reconciliation: touched expected governance/skill files only; no product code or new workflow mechanism added
Verification: Opus 4.6 review; skill validators; `npm run index`; `git diff --check`; path/alias inspections
Debt accepted and removal trigger: none
Residual debt: none known
```
