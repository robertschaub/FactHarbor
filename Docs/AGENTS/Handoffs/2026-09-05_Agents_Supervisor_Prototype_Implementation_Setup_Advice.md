---
### 2026-09-05 | Agents Supervisor | Codex | Prototype Implementation Setup Advice
**Task:** Advise how to organize repositories and agent work before Prototype Fund implementation.
**Status:** Recommendation only; no repository reorganization or operating-policy adoption.
**Files touched:** This handoff and its entry in `Docs/AGENTS/Agent_Outputs.md`; generated handoff index after reconciliation.
**Key decisions:** Recommend keeping existing repository responsibilities, separate worktrees for writers, independently constrained reviewers, and one integration owner. Begin with at most two writers plus a reviewer. The Captain retains scope and acceptance decisions; the Lead Architect must assess the integration application's repository home.
**Open items:** Confirm the additional repositories to inspect, verify their current instructions and source layout, and approve a bounded setup task. No other local repository was inspected. Live branch protection and effective tool permissions were not tested.
**Warnings:** Worktrees isolate tracked edits, not filesystem read access, inherited conversation context, credentials, processes, or database state. Do not propagate restricted context into public implementation tasks. Do not treat this process advice as application architecture approval.
**For next agent:** Review the evidence below before adapting `CLAUDE.md`, reviewer permissions, or service launch scripts. Keep setup changes separate from analysis behavior changes and preserve existing Captain-defined inputs and live-validation controls.
**Learnings:** Not appended to Role_Learnings.md; this is a proposal, not an adopted workflow.

## Recommended working arrangement

- Keep normative specifications, evidence analysis, runtime enforcement, and prototype application responsibilities explicit. Reuse existing homes; inspect the runtime before deciding whether the prototype needs another repository. Reference authoritative specifications at reviewed revisions rather than copying them.
- Give each writing task one repository, a base revision, owned files or interface, acceptance checks, a reviewer, and an integration owner. Use short-lived branches/worktrees; sequence changes to shared contracts, migrations, and configuration.
- Keep public technical instructions self-contained. Public-repository agents receive only the context needed for their task. Coordination access does not imply worker access or permission to disclose.
- Reuse the existing scout, routine developer, long-haul and verifier responsibilities. Separate the choice of coding agent/model from application LLM routing. Use different reviewers for materially different questions rather than running a committee for every change.
- Initially use one controlled local integration stack. Only its owner changes active revisions/configuration, starts or stops it, or conducts authorized live validation. Workers use offline checks and disposable fixtures; any additional stack needs separate ports, databases, UCM, caches and logs.
- Record the complete tested combination of repository revisions, configuration/prompt versions and relevant fixtures. Review the integrated result after combining individually reviewed commits; changed combinations need appropriate revalidation.
- Use cloud execution for self-contained repository tasks with reproducible setup and available fixtures. Validate Windows-specific behavior locally or in Windows CI; do not assume a cloud task can use local services or untracked state.

## Verified FactHarbor setup gaps

| Finding | Evidence | Proposed response |
|---|---|---|
| The tool wrapper still treats direct pushes to main as normal. | [CLAUDE.md](../../../CLAUDE.md), Workflow | Introduce reviewed task branches and a single integration owner for concurrent implementation. |
| Claude's verifier claims hooks protect its Bash commands, while root policy states subagents bypass those hooks. | [Verifier](../../../.claude/agents/verify.md), Bash grant; [AGENTS.md](../../../AGENTS.md), Safety | Reconcile the instructions and enforce reviewer access through the actual tool permissions. Run checks that write artifacts in disposable verification environments. |
| Codex verifier already requests a read-only sandbox and treats writing checks as verification gaps. | [verify.toml](../../../.codex/agents/verify.toml) | Reuse the role, but verify effective permissions in the actual session. |
| Restart scripts can stop processes by selected port and search shells without repository identity. | [restart-clean.ps1](../../../scripts/restart-clean.ps1); [stop-services.ps1](../../../scripts/stop-services.ps1) | Keep service control with the integrator initially; make future parallel launch/stop tooling validate owned process identity. |
| Safe tests and Web/API builds already run for pull requests and main pushes. | [ci.yml](../../../.github/workflows/ci.yml) | Reuse these checks; inspect live repository protections separately before relying on merge enforcement. |

**Validation:** Read-only configuration/script audit by a separate agent and a second critique of the proposed arrangement. Documentation links and diff checked after writing. No application tests, paid analyses, service changes, commits or pushes were required for this advice.

**Current tool references:** [Codex worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees), [cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environment), and [subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents), checked 2026-09-05. Worktrees share Git metadata; cloud tasks check out a selected repository revision and run environment setup before the agent phase.
