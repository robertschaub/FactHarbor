<!-- Sync with /AGENTS.md. Last synced: 2026-05-09 -->

# Claude Code instructions — FactHarbor

**Primary rules live in [/AGENTS.md](AGENTS.md)** (auto-loaded via `@AGENTS.md`). If your tool does not follow `@`-imports, read `/AGENTS.md` directly — it is authoritative. Do not duplicate its content here.

## Project snapshot

- `apps/api` — ASP.NET Core API (SQLite, port 5000). Entry: `Program.cs`, `Services/JobService.cs`, `Services/RunnerClient.cs`.
- `apps/web` — Next.js UI + runner/orchestrator (port 3000). Pipeline entry: `src/lib/analyzer/claimboundary-pipeline.ts`. Runner route: `src/app/api/internal/run-job/route.ts`.
- `tools/vscode-xwiki-preview` — VS Code extension for xWiki previews.

Data flow: UI → API (`JobService`) → Runner (POST `/api/internal/run-job`) → `runClaimBoundaryAnalysis` → writes progress back to API.

## Terminology cheat sheet (full table in AGENTS.md)

**ClaimAssessmentBoundary / AtomicClaim / EvidenceScope / EvidenceItem** — the four core analytical types. **NEVER** call any of these "context". **NEVER** call EvidenceItem a "fact" in new code.

## Run commands

- Bootstrap: `powershell -ExecutionPolicy Bypass -File scripts/first-run.ps1`
- Web: `cd apps/web && npm run dev` (3000) · API: `cd apps/api && dotnet run` (5000)
- Tests (safe): `npm test` · Build: `npm -w apps/web run build`
- **Do NOT run** `test:llm`, `test:neutrality`, `test:cb-integration`, `test:expensive` unless asked — real LLM calls at $1-5+/run.

## Pointers

- **Safety, hooks, destructive-git rules**: see `AGENTS.md` §Safety (authoritative).
- **Bugfixing**: load and apply `.claude/skills/debt-guard/SKILL.md` before editing any bugfix, regression, failing test/build, review finding, runtime defect, or failed-validation recovery. In Captain Deputy workstreams, the deputy actively controls debt-guard posture and Steer-Co decides contested complexity direction by consent.
- **Mechanical debt sensors**: `npm run debt:sensors` prints an advisory report for V2 footprint, debt-guard telemetry, docs volume, and V2 consolidation markers. Run it automatically for Captain Deputy V2/debt-sensitive workstreams, debt-sensitive Steer-Co packets, V2 Consolidation Gate packages, and Lead Developer closeout; record status and salient warnings. `advisory_warn` is not a hard blocker unless Captain explicitly requires `--fail-on-warn`.
- **V2 convergence controls**: substantial V2 packages must state `V2 SCORECARD IMPACT` and `V2 RETIREMENT LEDGER IMPACT` against `Docs/AGENTS/V2_Excellence_Scorecard.md` and `Docs/AGENTS/V2_Retirement_Ledger.md`.
- **Roles** ("As \<Role\>"): `Docs/AGENTS/Roles/` — activation protocol in `Docs/AGENTS/Policies/Handoff_Protocol.md`.
- **Multi-agent workflows & collaboration**: `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`.
- **Skill selection**: follow `AGENTS.md` §Named Workflows. Mandatory gates apply first, explicit user skill assignments next, then `fhAgentKnowledge.preflight_task` for role-activated or ambiguous tasks, then skill metadata/table matching. Do not add generic meta-routing skills. `/captain-deputy` is allowed because it is a Captain-facing workstream coordinator for the fixed Steer-Co + Lead Developer operating model, and `/reasoning-budget` is allowed because it routes reasoning effort after the task/workflow is known; neither bypasses mandatory workflows or approval gates.
- **Report quality review**: follow `AGENTS.md` §Report Quality Baseline Comparison; compare reports against Captain expectations, benchmark/Q-code JSONs, and listed best comparators.
- **Permissions mode**: `.claude/settings.json` uses `bypassPermissions` because this repo relies on local safety hooks plus a solo-maintainer workflow where agents are expected to make direct code changes without repeated approval prompts.
- **Internal knowledge MCP rollout**: `Docs/DEVELOPMENT/Agent_Knowledge_MCP_Setup.md`.

## Internal Knowledge Startup

If `fhAgentKnowledge` is configured in Claude Code, use its `preflight_task` MCP tool before manually scanning handoffs or indexes for non-trivial tasks.

When the prompt begins `As <Role>,` or `As <Role>:`, treat that as role activation and as the `preflight_task` trigger. Call `preflight_task` with the task body, `role="<Role>"`, and the first explicit `Skill:` value if present; then load the resolved role file and every named skill workflow.

If MCP is not configured in the current Claude Code setup, fall back to:

`npm run fh-knowledge -- preflight-task --task "..." [--role ...] [--skill ...]`

## Workflow

Solo developer + AI agents. Direct push to main is normal. Commits follow conventional commits: `type(scope): description`.
