---
roles: [Lead Developer, Captain Deputy]
topics: [v2, x7-t, query-planning, live-smoke, execution-package]
files_touched:
  - Docs/WIP/2026-05-17_V2_Slice_X7-T_Query_Planning_Runtime_Live_Smoke_Package.md
  - Docs/STATUS/Current_Status.md
  - Docs/STATUS/Backlog.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/index/handoff-index.json
---

# Lead Developer Handoff: V2 X7-T Query Planning Runtime Live-Smoke Package

### 2026-05-17 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-T Query Planning Runtime Live-Smoke Package

**Task:** Prepare and review the next bounded live-smoke execution package after X7-S hidden Query Planning runtime implementation.

**Files touched:** `Docs/WIP/2026-05-17_V2_Slice_X7-T_Query_Planning_Runtime_Live_Smoke_Package.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, and `Docs/AGENTS/index/handoff-index.json`.

**Key decisions:** X7-T is a docs-only execution package for at most two exact Captain-defined direct-text jobs after package commit, clean runtime refresh, admin-route preflight, and focused verifiers. It is limited to proving hidden product-route Query Planning runtime invocation, admin-only no-store runtime artifacts, `ready_not_executable` source-acquisition handoff, and public non-leak/precutover behavior. It does not authorize source/search/fetch/parser/SR/cache IO, EvidenceCorpus/evidence/report/verdict/warning/confidence behavior, prompt/config/model/schema edits, public cutover, ACS/direct URL, V1 reuse, or V1 cleanup.

**Review result:** Architect (Epicurus), Security/runtime (Raman), Code/package (Kepler), and LLM/semantic (Dewey) approved. Claude Opus 4.6 senior architect / LLM expert also approved as advisory reviewer. Security initially returned `MODIFY`; the package was amended to require redacted/boolean process-gate proof only, non-empty `FH_ADMIN_KEY` plus wrong-key `401` checks for all four artifact routes, and `Cache-Control: no-store` on successful Claim Understanding, X7-J, X7-O, and X7-S artifact responses.

**Open items:** Commit this package, refresh runtime from the committed revision, run the package verifier set, and execute the two-job live smoke only if preflight is clean. If Query Planning returns damaged/invalid output or an operational stop condition is hit, do not patch inside X7-T; record partial/fail and draft a separate repair package.

**Warnings:** X7-T uses live LLM calls but is not report-quality validation. Treat the two canaries as opaque runtime payloads. Do not consume the remaining live-job budget inside X7-T for retries or substitute inputs. Do not record raw process command lines or secret values in closeout artifacts.

**For next agent:** Stage and commit only the X7-T docs/status/handoff/index envelope, then run the package verifiers. After a clean runtime refresh with `FH_ANALYZER_V2_SHELL=enabled`, `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`, and `FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME=enabled_hidden_direct_text`, execute at most the two exact Captain inputs listed in the package and inspect all four hidden artifact ledgers plus public non-leak behavior.

**Learnings:** Not appended to `Docs/AGENTS/Role_Learnings.md`; this package follows existing X7 live-smoke control patterns.

## Debt Guard

```text
DEBT-GUARD COMPACT RESULT
Chosen option: amend the docs-only X7-T package in place after Security/runtime review findings.
Net mechanism count: unchanged.
Verification: Security/runtime re-review approved; package verifiers still required before commit/execution.
Residual debt: none in the package; runtime closeout must still avoid recording raw process command lines or secrets.
```
