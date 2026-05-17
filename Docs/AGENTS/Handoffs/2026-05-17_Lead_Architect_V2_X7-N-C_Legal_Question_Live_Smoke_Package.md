---
roles: [Lead Architect, Captain Deputy]
topics: [v2, x7-n-c, live-smoke, legal-question, claim-understanding]
files_touched:
  - Docs/WIP/2026-05-17_V2_Slice_X7-N-C_Legal_Question_Direct_Text_Live_Smoke_Package.md
  - Docs/STATUS/Current_Status.md
  - Docs/STATUS/Backlog.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-N-C_Legal_Question_Live_Smoke_Package.md
  - Docs/AGENTS/index/handoff-index.json
---

# Lead Architect Handoff: V2 X7-N-C Legal-Question Live-Smoke Package

### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X7-N-C Legal-Question Live-Smoke Package

**Task:** Prepare a one-job live-smoke package for the previously blocked Bolsonaro/fair-trial direct question after X7-N-B passed.
**Files touched:** `Docs/WIP/2026-05-17_V2_Slice_X7-N-C_Legal_Question_Direct_Text_Live_Smoke_Package.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-N-C_Legal_Question_Live_Smoke_Package.md`, `Docs/AGENTS/index/handoff-index.json`.
**Key decisions:** X7-N-C is one job only. It uses the exact Captain-approved Bolsonaro/fair-trial input only as opaque runtime payload and tests only hidden Claim Understanding acceptance plus public pre-cutover fail-closed behavior.
**Open items:** Obtain reviewer acceptance, commit the package, refresh runtime from the committed package, run the listed focused verifiers/admin-route preflight, then submit only the one legal-question canary if all gates pass.
**Warnings:** X7-N-C does not approve truth/legal/fairness conclusions, Query Planning execution, source/provider/search/fetch/content-dereference/parser execution, EvidenceCorpus/EvidenceItems/report/verdict/confidence behavior, cache/SR/storage, ACS/direct URL, public cutover, B3/2D-C, V1 work, or V1 cleanup.
**For next agent:** Execute only under `Docs/WIP/2026-05-17_V2_Slice_X7-N-C_Legal_Question_Direct_Text_Live_Smoke_Package.md`: commit package first, refresh runtime, prove V2 shell/runtime gates in the running process, run verifiers/admin-route preflight, submit one exact Bolsonaro/fair-trial input, inspect ledger `<jobId>:precutover-observability`, and record a separate X7-N-C result closeout.
**Learnings:** Not appended to `Role_Learnings.md`; this is slice-specific execution-gate context.

## Package Scope

Allowed input:

```text
Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?
```

No second job belongs to this package.

## Required Before Execution

- reviewer acceptance recorded in the package;
- package committed;
- clean worktree;
- runtime refreshed from committed package revision;
- prompt/config reseed or `claimboundary-v2.prompt.md` hash recorded;
- focused verifiers and build passed;
- V2 gate validator and self-test passed;
- admin artifact routes preflighted as protected/internal-only;
- clean status recorded immediately before submission.
