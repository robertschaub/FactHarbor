---
roles: [Lead Architect, Captain Deputy]
topics: [v2, x7-n-a, x7-n, live-smoke, clean-provenance]
files_touched:
  - Docs/WIP/2026-05-17_V2_Slice_X7-N-A_Clean_Provenance_Rerun_Amendment.md
  - Docs/STATUS/Current_Status.md
  - Docs/STATUS/Backlog.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/index/handoff-index.json
---

# Lead Architect Handoff: V2 X7-N-A Clean-Provenance Rerun Amendment

### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X7-N-A Clean-Provenance Rerun Amendment

**Task:** Prepare and review a one-job clean-provenance rerun amendment after X7-N was classified as `PROVENANCE_CONTAMINATED_PARTIAL_OBSERVATION`.
**Files touched:** `Docs/WIP/2026-05-17_V2_Slice_X7-N-A_Clean_Provenance_Rerun_Amendment.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/index/handoff-index.json`.
**Key decisions:** X7-N-A authorizes exactly one rerun of the German Captain-approved direct-text canary after package commit, clean worktree, runtime refresh, prompt/config hash recording, inherited X7-N section 8 admin-route preflight, and focused verifiers. It is only a clean-provenance recovery for the X7-N functional observation.
**Open items:** Commit this amendment package, refresh runtime from the committed revision, run the required focused verifiers and admin preflight, then submit only the one German canary if clean status holds.
**Warnings:** Do not run the second X7-N canary under X7-N-A. Do not treat X7-N-A as approval for Query Planning execution, source/provider/search/fetch/content-dereference/parser execution, EvidenceCorpus/EvidenceItems/report/verdict/confidence behavior, cache/SR/storage, ACS/direct URL, public cutover, B3/2D-C, V1 work, or V1 cleanup.
**For next agent:** Preserve the unrelated cleanup stashes and do not pop them before the X7-N-A live rerun. A dirty pre-submission or post-inspection worktree invalidates the run.
**Learnings:** For live-smoke recovery packages, put staging before `git diff --cached --check` and record prompt/config hash state, not only source commit state.

## Review Result

- Architect: APPROVE.
- LLM/semantic: APPROVE.
- Security/runtime: MODIFY, then accepted after the amendment clarified that only the existing hidden direct-text Claim Understanding model/provider call is allowed and expanded inherited no-public-leak/admin-route assertions.
- Code/package: MODIFY, then accepted after the amendment moved staging before cached diff checks, required prompt/config hash recording, and referenced X7-N section 8 explicitly for admin-route preflight.

## Execution Limits

Use only this exact input:

```text
Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz
```

The amendment does not approve the Bolsonaro/fair-trial canary or any additional jobs.

## Required Before Live Rerun

After committing this package:

- verify clean worktree;
- refresh web/API runtime from the committed X7-N-A revision;
- record prompt/config reseed state or `apps/web/prompts/claimboundary-v2.prompt.md` SHA-256;
- run the focused verifier set from the amendment;
- run the exact X7-N section 8 admin-route preflight;
- record clean `git status --short --untracked-files=all` immediately before submission.

After artifact inspection, record clean status again. If dirty, classify the rerun as invalid for gate evidence.
