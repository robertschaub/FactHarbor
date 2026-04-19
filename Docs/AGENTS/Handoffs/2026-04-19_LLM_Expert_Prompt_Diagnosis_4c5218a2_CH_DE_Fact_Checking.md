---
### 2026-04-19 | LLM Expert | Codex (GPT-5) | Prompt Diagnosis 4c5218a2 CH DE Fact-Checking
**Task:** Diagnose whether local job `4c5218a2960444c29baccff13f21cb38` (`Die Schweiz hat kein systematisches Fact-Checking wie Deutschland`) reflects prompt drift, a live prompt deficiency, or a non-prompt runtime issue.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-19_LLM_Expert_Prompt_Diagnosis_4c5218a2_CH_DE_Fact_Checking.md`, `Docs/AGENTS/Prompt_Issue_Register.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Recovered the exact runtime prompt blob from `apps/web/config.db` using hash `8298884f5ede80863fe2a9195cfb4d33aec0aa86f26c0b1c1f8f8f3a5127ff0f`; it matches the current active `claimboundary` prompt, so this is **not** prompt-rollout drift. The job ran on commit `8626424acd16f1850212c7c64eb1b2dede8f7b2a+2b9fde44`, which means code-history diffs are approximate because the full repo was dirty, but prompt provenance is exact. Stage 1 framing was mostly correct: `expectedEvidenceProfile` asked for directories/registries, institutional comparison, and activity counts. The main report-quality problem is later: Stage 2 seeded proxy/contextual Swiss material into the evidence pool, and the live `VERDICT_RECONCILIATION` prompt lacks an explicit **per-side direct-evidence sufficiency** step for comparative institutional/ecosystem claims. That allows one side's direct evidence (Germany) plus the other side's omission/proxy signals (Switzerland) to settle above `UNVERIFIED` (`LEANING-TRUE 58/32`) even though the reasoning itself admits there is no direct Swiss ecosystem evidence. Separately, the `verdict_grounding_issue` warning is a **known recurring grounding-validator class**, not drift: the active `VERDICT_GROUNDING_VALIDATION` text already says uncited-but-claim-local evidence and challenge-context references are allowed, yet this run still flagged `EV_1776602553386-3388` for not being in `citedEvidenceRegistry`. That points to prompt-order / attention weakness in the grounding validator, not missing rollout.
**Open items:** Captain decision on whether the next step should be (a) a prompt-only fix in `VERDICT_RECONCILIATION`, (b) a stage-code change to seeded/preliminary evidence handling, or (c) both. No fresh live rerun should be submitted without Captain approval because this input is not on the current Captain-defined benchmark list.
**Warnings:** There was **no useful log corroboration** in `apps/web/debug-analyzer.log`; the diagnosis rests on structured report evidence, prompt provenance, and current code reads. The comparative-ecosystem verdict issue is not purely prompt-rooted: automatic preliminary-evidence seeding in `research-orchestrator.ts` is an upstream amplifier. The grounding warning is info-only and did not change the verdict, but it is still a real integrity defect because it weakens trust in validator signals.
**For next agent:** Primary anchors for the live prompt issue are `apps/web/prompts/claimboundary.prompt.md:1399-1414` (`VERDICT_RECONCILIATION`) and `apps/web/prompts/claimboundary.prompt.md:1484-1507` (`VERDICT_GROUNDING_VALIDATION`). Primary runtime/code anchors are `apps/web/src/lib/analyzer/research-orchestrator.ts:934-1015` (automatic seeding of preliminary evidence), `apps/web/src/lib/analyzer/verdict-stage.ts:1216-1335` (grounding validator payload + warning emission), and the job payload itself (`resultJson.meta.promptContentHash = 8298884f...`, `claimAcquisitionLedger.AC_01.seededEvidenceItems = 6`, `finalDirectionCounts = 3 supports / 0 contradicts / 6 neutral`, `analysisWarnings` includes `verdict_grounding_issue`).
**Learnings:** no

## Prompt-diagnosis summary

**Target report**

- `JOB`: `4c5218a2960444c29baccff13f21cb38`
- `GeneratedUtc`: `2026-04-19T12:46:23Z`
- `Input`: `Die Schweiz hat kein systematisches Fact-Checking wie Deutschland`
- `Verdict`: top-level `LEANING-TRUE 58/32`, but article-level report `UNVERIFIED` because quality gates failed
- `Prompt hash`: `8298884f5ede80863fe2a9195cfb4d33aec0aa86f26c0b1c1f8f8f3a5127ff0f`
- `Prompt coverage`: `BLOB-EXACT`
- `Runtime state`: `BLOB-MATCHES-CURRENT-ACTIVE`
- `Commit`: `8626424acd16f1850212c7c64eb1b2dede8f7b2a` (`DIRTY-STATE: yes`)

**Structured signals**

- `research_fetch`: Swiss topical query `Schweiz Fact-Checking-Aktivitäten Nachrichtenmedien Newsroom` had `50%` fetch failure and still yielded only proxy/neutral material.
- `claimAcquisitionLedger`: seeded evidence dominated the claim (`6` seeded items; only `3` admitted researched items, all neutral).
- `evidence pool`: `3` supports, `0` contradicts, `6` neutral.
- `verdict reasoning`: explicitly says there is no direct Swiss evidence, yet the claim verdict remains above `UNVERIFIED`.
- `verdict_grounding_issue`: flags `EV_1776602553386-3388` even though they exist in `evidencePool` and are discussed as claim-local context.

**No log corroboration**

- Narrow grep by time window and grounding keywords in `apps/web/debug-analyzer.log` did not surface a matching schema/parse/runtime error for this job.

## Known-issues anchor table used in this run

| ID | Category | 10-word description |
|---|---|---|
| KI-01 | P9 | Grounding validator overweights cited registry despite local-context allowance |
| KI-02 | P2 | Comparative ecosystem runs admit broad topical proxy evidence too easily |

`KI-01` is grounded in the 2026-04-05 grounding-validator prompt refinement handoff. `KI-02` is grounded in the 2026-04-19 `e8777ef2` CH/DE report review handoff.

## Findings

### [F01] P6 HIGH INFERRED — `claimboundary.prompt.md`, `VERDICT_RECONCILIATION`

- **Type:** `SYSTEMIC`
- **Coverage:** `BLOB-EXACT`
- **Observed:** This run ended `LEANING-TRUE 58/32` even though the reconciler's own prose says there is **no direct Swiss evidence** and the final pool is Germany-direct plus Switzerland-proxy/contextual.
- **Cause:** `VERDICT_RECONCILIATION` lacks an explicit per-side direct-evidence sufficiency step for comparative institutional/ecosystem claims. The prompt tells the model not to default to `UNVERIFIED` when aligned side-specific evidence exists on both sides, but it does not force the reverse check strongly enough: when one side lacks direct ecosystem evidence and only proxies or omission-signals exist, the model can still slide above `UNVERIFIED`.
- **Fixed now:** `no`
- **Status:** `NEW`
- **Notes:** Prompt is a real root-cause **amplifier**, but not the only one. Stage-code seeding of preliminary evidence is the upstream enabler.

### [F02] P9 MEDIUM CONFIRMED — `claimboundary.prompt.md`, `VERDICT_GROUNDING_VALIDATION`

- **Type:** `SYSTEMIC`
- **Coverage:** `BLOB-EXACT`
- **Observed:** The grounding validator flagged `EV_1776602553386-3388` and challenge `CP_AC_01_1` for missing `citedEvidenceRegistry` membership even though the active prompt explicitly allows uncited-but-claim-local evidence references and challenge-context references when they exist in `evidencePool` / `challengeContext`.
- **Cause:** The grounding prompt still leads with registry-focused task bullets, and the non-exhaustive citation-array allowances come later. In this run, the validator behaved as if registry membership were the dominant rule. That matches a prompt-order / attention failure class, not rollout drift.
- **Fixed now:** `partial`
- **Status:** `KNOWN-RECURRING (KI-01)`
- **Notes:** This is the same defect family targeted by the 2026-04-05 grounding prompt refinement, so the current active wording reduced but did not eliminate the failure mode.

## Priority fix list

### [F01] HIGH | `apps/web/prompts/claimboundary.prompt.md`

- `Change:` In `VERDICT_RECONCILIATION`, add a generic mandatory step for comparative systematic/institutionalized/organized claims: assess direct ecosystem evidence on each side separately before assigning truth%. If one side has only contextual proxies, omission-signals, or adjacent-topic material, keep the verdict in the `UNVERIFIED` band unless those proxies come from enumerative/auditing sources for the target activity itself.
- `Generic test:` `yes` — applies to any cross-jurisdiction or cross-entity institutional-ecosystem comparison, not just Swiss/German fact-checking.
- `Regression test:` `yes` — at-risk families are other multi-jurisdiction ecosystem/institutional comparisons where a prompt could become too conservative if both sides actually do have direct evidence assembled across multiple sources.
- `Runtime test:` `prompt-text`
- `Expected:` Direct-evidence asymmetry stays unresolved instead of drifting into `LEANING-TRUE` or `LEANING-FALSE`.

### [F02] MEDIUM | `apps/web/prompts/claimboundary.prompt.md`

- `Change:` Move the three-tier non-exhaustive citation rule in `VERDICT_GROUNDING_VALIDATION` ahead of the registry-focused task bullets, or rewrite the task bullets so `citedEvidenceRegistry` governs only citation-array validation while `evidencePool` / `challengeContext` govern uncited reasoning references.
- `Generic test:` `yes` — affects all grounding-validation runs, not just this job.
- `Regression test:` `yes` — at-risk families are true cross-claim contamination cases where too much relaxation could hide genuine hallucinated citations.
- `Runtime test:` `prompt-text`
- `Expected:` Remaining `verdict_grounding_issue` warnings skew toward genuine hallucination/cross-claim contamination instead of false positives on claim-local context.
