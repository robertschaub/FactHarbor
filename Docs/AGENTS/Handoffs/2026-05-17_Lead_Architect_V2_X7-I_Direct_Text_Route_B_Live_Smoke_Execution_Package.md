# Lead Architect Handoff: V2 X7-I Direct-Text Route B Live-Smoke Execution Package

### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X7-I Direct-Text Route B Live-Smoke Execution Package

**Package:** `Docs/WIP/2026-05-17_V2_Slice_X7-I_Direct_Text_Route_B_Live_Smoke_Execution_Package.md`

**Status:** deputy-approved docs-only execution package. It authorizes live execution only after package commit, clean worktree, runtime refresh, pre-run verifiers, and admin-only route verification.

## Summary

Created X7-I as the Route B executable live-smoke package following the X7-H readiness criteria and a four-role deputy review.

X7-I is intentionally narrow:

- at most two live direct-text jobs;
- exact Captain-approved inputs only;
- inputs treated as opaque runtime payloads, not quality benchmarks;
- no X3-B prompt edits;
- no source-provider/search/fetch/content-dereference/provider-network/parser execution;
- no X5-X7 product wiring;
- no EvidenceCorpus, EvidenceItems, report, meaningful verdict, confidence, cache/SR/storage, ACS/direct URL, B3 proof, 2D-C, V1 work, or V1 cleanup.

The only allowed model/provider activity is the already-approved hidden Claim Understanding LLM/model-provider call in the 4C3b direct-text runtime path. Current live-path truth is explicit: product runner can inspect Claim Understanding runtime artifacts only. X5-X7 harness outputs are not expected in live jobs unless a separate product/orchestrator source package wires them.

## Review Result

Architect: APPROVE after wording clarified the allowed Claim Understanding LLM/model-provider call and the current live-path limitation.

Security/runtime: APPROVE after adding the admin-route unauthenticated `401` verifier and disambiguating source-provider execution from the allowed Claim Understanding model call.

Code/package: APPROVE after adding the exact docs-only file envelope, staging semantics, executable job/poll/artifact snippets, URL-encoded ledger lookup, and corrected `resultJson` field paths.

LLM/semantic: APPROVE after adding the opaque-runtime-payload rule and avoiding semantic interpretation of verdict-like fields.

## Files Changed

- `Docs/WIP/2026-05-17_V2_Slice_X7-I_Direct_Text_Route_B_Live_Smoke_Execution_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-I_Direct_Text_Route_B_Live_Smoke_Execution_Package.md`
- `Docs/AGENTS/index/handoff-index.json`

## Required Before Live Jobs

Commit this package first. Then, before any job submission:

- clean worktree;
- refreshed web/API/runner runtime after the package commit;
- required runtime gates open:
  - `FH_ANALYZER_V2_SHELL=enabled` or `FH_ANALYZER_PIPELINE=v2-precutover`;
  - `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`;
- package verifier suite and runtime/source verifier suite from the package pass;
- unauthenticated artifact route returns `401`;
- authenticated artifact route reports `visibility: internal_admin_only` and `publicPointerExposure: forbidden`.

## Live Execution Rules

Run the first Captain input only:

`Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`

Run the second only if the first has no hard fail:

`Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`

Stop immediately if public V2 output becomes valid, hidden artifacts are not inspectable, source-provider/search/fetch/content-dereference/provider-network/parser execution occurs, evidence/report/verdict behavior appears, runtime is stale, or any input is substituted.

## Verification For This Package

Before commit, run:

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
node scripts/build-index.mjs --tier=2
git diff --check
git diff --cached --check
git status --short --untracked-files=all
```

## Next

Commit the focused X7-I docs package. After commit, perform runtime/source verification, refresh runtime, run the admin-only route verifier, and then run the first live job only if all gates pass.
