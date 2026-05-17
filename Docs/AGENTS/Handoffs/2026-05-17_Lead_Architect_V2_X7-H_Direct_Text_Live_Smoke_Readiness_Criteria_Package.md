# V2 X7-H Direct-Text Live-Smoke Readiness Criteria Package

**Date:** 2026-05-17
**Role:** Lead Architect / Captain Deputy
**Agent:** Codex (GPT-5.5)
**Status:** approved for commit; docs-only; non-authorizing
**Package:** `Docs/WIP/2026-05-17_V2_Slice_X7-H_Direct_Text_Live_Smoke_Readiness_Criteria_Package.md`

## Summary

Drafted X7-H as the docs-only readiness criteria package recommended unanimously by the post-X7-G2 deputy debate.

The package defines what a later direct-text live-smoke execution package must specify before any live jobs can be meaningful:

- committed revision and runtime freshness requirements;
- prompt/config provenance and X3-B prompt-alignment relationship;
- Captain-defined input discipline;
- hidden artifact inspection targets;
- pass/fail and hard-stop criteria;
- explicit distinction between no-corpus denial and analytical evidence scarcity;
- explicit blockers for live jobs, prompt edits, source/provider/search/fetch/parser execution, product/public wiring, cache/SR/storage, Evidence/report/verdict behavior, B3 proof, 2D-C, V1 work, and V1 cleanup.

No source files, prompt files, config/model/schema files, runtime gates, product/public surfaces, live jobs, or tests were changed by this package.

## Files Changed

- `Docs/WIP/2026-05-17_V2_Slice_X7-H_Direct_Text_Live_Smoke_Readiness_Criteria_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-H_Direct_Text_Live_Smoke_Readiness_Criteria_Package.md`
- `Docs/AGENTS/index/handoff-index.json` after index rebuild

## Verification

Required before commit:

- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `node scripts/build-index.mjs --tier=2`
- `git diff --check`
- `git diff --cached --check`

No live jobs or expensive LLM tests are approved or needed for this docs-only package.

## Review Focus

Architect:

- Is the readiness boundary useful without authorizing execution?
- Does the package prevent hidden plumbing from being mistaken for report/public readiness?

Security/runtime:

- Are all forbidden runtime surfaces and stop conditions explicit?
- Is the package clear that live jobs remain blocked until a separate executable package?

Code/package:

- Is the docs-only envelope clear and enforceable?
- Are future execution package prerequisites concrete enough?

LLM Expert:

- Does the package preserve the no-corpus denial versus evidence-scarcity distinction?
- Does it avoid implicit approval for X3-B prompt edits?

## Review Result

Architect, Code/package, LLM/semantic, and Security/runtime reviewers approved. No reviewer authorized live jobs, source execution, prompt edits, product/public wiring, parser work, or report/evidence/verdict behavior.

## Open Items

- A later executable live-smoke package remains required before any direct-text live jobs can be run.
- X3-B prompt edits remain explicitly Captain-gated.
