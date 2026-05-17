---
roles: [Lead Architect, Captain Deputy]
topics: [v2, x7-n, direct-text, live-smoke, claim-understanding]
files_touched:
  - Docs/WIP/2026-05-17_V2_Slice_X7-N_Post_X7M_Direct_Text_Live_Smoke_Execution_Package.md
  - Docs/STATUS/Current_Status.md
  - Docs/STATUS/Backlog.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/index/handoff-index.json
---

# Lead Architect Handoff: V2 X7-N Post-X7M Direct-Text Live-Smoke Package

### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X7-N Post-X7M Direct-Text Live-Smoke Package

**Task:** Prepare and review the executable post-X7M direct-text live-smoke package before running any live jobs.
**Files touched:** `Docs/WIP/2026-05-17_V2_Slice_X7-N_Post_X7M_Direct_Text_Live_Smoke_Execution_Package.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/index/handoff-index.json`.
**Key decisions:** X7-N is docs-only and authorizes at most two live direct-text jobs after package commit, clean worktree, runtime refresh, pre-run verifiers, and admin-route preflight. It tests only hidden Claim Understanding `ClaimContract` acceptance after X7-M while public V2 remains `4.0.0-cb-precutover` / `blocked_precutover`.
**Open items:** Commit the package, refresh runtime, run the required pre-run verifiers and admin-route preflight, then execute only the exact two Captain-approved canaries if the first job has no hard fail. After execution, create and commit a separate result closeout package.
**Warnings:** X7-N does not approve Query Planning execution, source/provider/search/fetch/content-dereference/parser execution, EvidenceCorpus/EvidenceItems/report/verdict/confidence behavior, cache/SR/storage, ACS/direct URL, public cutover, B3/2D-C, V1 work, or V1 cleanup. The package intentionally verifies accepted ClaimContract handoff through inspectable X7-J intake fields rather than exposing raw ClaimContract body in the Claim Understanding artifact.
**For next agent:** Execute only under `Docs/WIP/2026-05-17_V2_Slice_X7-N_Post_X7M_Direct_Text_Live_Smoke_Execution_Package.md`: commit package first, refresh runtime, run listed verifiers/admin-route preflight, submit at most the two exact Captain inputs, inspect ledgers `<jobId>:precutover-observability`, and record a separate X7-N result closeout.
**Learnings:** Not appended to `Role_Learnings.md`; this is slice-specific execution-gate context.

## Review Result

- LLM/semantic: APPROVE.
- Architect: APPROVE after section 10 was corrected to use inspectable fields.
- Security/runtime: APPROVE.
- Code/package: APPROVE after section 10 was corrected to avoid implying raw ClaimContract artifact exposure.

## Scope Summary

X7-N may run only these exact Captain-approved inputs:

1. `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
2. `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`

The first job must run first. The second job may run only if the first has no hard fail. No third or fourth job belongs to X7-N.

## Verification Required Before Execution

Package verification before commit:

- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `npm run index`
- `git diff --check`
- `git diff --cached --check`
- `git status --short --untracked-files=all`

Runtime/source verification after commit and before live jobs is listed in the X7-N package and must be run before job submission.
