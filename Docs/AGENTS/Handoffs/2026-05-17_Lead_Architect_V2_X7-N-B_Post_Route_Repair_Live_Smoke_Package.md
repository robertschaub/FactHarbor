---
roles: [Lead Architect, Captain Deputy]
topics: [v2, x7-n-b, live-smoke, route-repair, claim-understanding]
files_touched:
  - Docs/WIP/2026-05-17_V2_Slice_X7-N-B_Post_Route_Repair_Clean_Live_Smoke_Package.md
  - Docs/STATUS/Current_Status.md
  - Docs/STATUS/Backlog.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/index/handoff-index.json
---

# Lead Architect Handoff: V2 X7-N-B Post-Route-Repair Live-Smoke Package

### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X7-N-B Post-Route-Repair Live-Smoke Package

**Task:** Prepare a new docs-only live-smoke package after X7-N-A hard-failed and the route selector was repaired.
**Files touched:** `Docs/WIP/2026-05-17_V2_Slice_X7-N-B_Post_Route_Repair_Clean_Live_Smoke_Package.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/index/handoff-index.json`.
**Key decisions:** X7-N-B is a one-job package only. It re-tests the German Captain-approved canary after route-selection fail-closed repair and X3-B, with clean commit provenance and explicit V2 shell/runtime gates. X7-N and X7-N-A are spent and must not be reused. Architect, Security/runtime, LLM/semantic, and Code/package reviews approved after package clarifications and envelope fixes.
**Open items:** Obtain final reviewer acceptance, commit the package, refresh runtime from the committed package, run the listed focused verifiers/admin-route preflight, then submit only the one German canary if all gates pass.
**Warnings:** X7-N-B does not approve the Bolsonaro canary, Query Planning execution, source/provider/search/fetch/content-dereference/parser execution, EvidenceCorpus/EvidenceItems/report/verdict/confidence behavior, cache/SR/storage, ACS/direct URL, public cutover, B3/2D-C, V1 work, or V1 cleanup. A fail-closed blocked V2 job is safe but not a passing smoke.
**For next agent:** Execute only under `Docs/WIP/2026-05-17_V2_Slice_X7-N-B_Post_Route_Repair_Clean_Live_Smoke_Package.md`: commit package first, refresh runtime, prove `FH_ANALYZER_V2_SHELL=enabled` and `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text` in the running process, run verifiers/admin-route preflight, submit one exact German input, inspect ledger `<jobId>:precutover-observability`, and record a separate X7-N-B result closeout.
**Learnings:** Not appended to `Role_Learnings.md`; this is slice-specific execution-gate context.

## Expert Consultation

- Architect reviewer: APPROVE after the package clarified warning scope and bound the job execution hash to the committed X7-N-B package/runtime revision.
- Security/runtime reviewer: APPROVE after the package required actual web/runner process gate recording, added non-admin public response inspection, clarified null compatibility fields, clarified warning scope, and documented the Claim Understanding artifact route no-store gap as acceptable only for local one-job CLI/admin inspection.
- LLM/semantic reviewer: APPROVE. The package uses the German Captain input only as opaque runtime payload, avoids truth/evidence/report/verdict-quality claims, and treats `selectedAtomicClaimCount >= 1` only as structural liveness.
- Code/package reviewer: APPROVE after package-envelope fixes. The package now includes the exact staged-path assertion, records all reviewer decisions, and requires the rebuilt handoff index in the docs-only envelope.

## Package Scope

Allowed input:

```text
Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz
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
