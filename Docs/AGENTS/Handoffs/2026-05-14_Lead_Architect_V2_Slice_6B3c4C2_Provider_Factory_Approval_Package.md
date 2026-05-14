---
date: 2026-05-14
role: Lead Architect
agent: Codex (GPT-5)
task: V2 Slice 6B.3c-4C2 Provider Factory Approval Package
status: complete
open_items: yes
topics:
  - v2
  - slice
  - 6b3c4c2
  - provider-factory
  - approval-package
  - clean-room
files_touched:
  - Docs/WIP/2026-05-14_V2_Slice_6B3c4C2_Provider_Factory_Approval_Package.md
  - Docs/WIP/2026-05-14_V2_Slice_6B3_Revised_Implementation_Plan.md
  - Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md
  - Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md
  - Docs/AGENTS/Handoffs/2026-05-14_Lead_Architect_V2_Slice_6B3c4C2_Provider_Factory_Approval_Package.md
---

# V2 Slice 6B.3c-4C2 Provider Factory Approval Package

## Summary

Created `Docs/WIP/2026-05-14_V2_Slice_6B3c4C2_Provider_Factory_Approval_Package.md` after the deputy debate returned `MODIFY/MODIFY/MODIFY`: do not start provider-factory source code yet. The next safe action is a docs-only package that defines the source envelope, SDK-import exception, V2 config snapshot authority, guard changes, verifier, and live-job boundary.

This package does not approve provider factory source, provider SDK imports, product runtime injection, public API/UI/report/export exposure, cache IO, ACS/direct URL runtime execution, approval/status flips, prompt/config edits, live jobs, or V1 cleanup.

## Debate Consolidation

- LLM/runtime quality reviewer: `MODIFY`; define provider/config snapshot source, telemetry/provenance, factory I/O, and no-repair/no-fallback behavior before code.
- Clean-room/security challenger: `MODIFY`; exact guard exception is required for any provider SDK import, and Analyzer V2/public/product surfaces must stay protected.
- Implementation architect: `MODIFY`; split into 4C2a inert config/provenance contract, 4C2b factory, and later 4C3 product-hidden runtime artifact.

## Key Decisions

- 4C2 source is not approved by the package itself.
- Proposed 4C2a is an inert provider runtime config/provenance contract with no SDK import and no product wiring.
- Proposed 4C2b is a later clean-room provider factory under `apps/web/src/lib/analyzer-v2-runtime/`.
- Provider SDK imports, if ever approved, must be allowlisted to exactly one reviewed factory file and remain forbidden in Analyzer V2 and public/product surfaces.
- Live jobs remain not meaningful until 4C3, after source commit, runtime refresh, real approval authority, and hidden direct-text artifact readiness.

## Verification

- Documentation/source inspection against 4C1 handoff, 4C package, guardrails, provider-boundary contract, runtime stage/dispatch, model adapter, and model-policy registry.
- `npm run index` and `git diff --check` are the required final verifiers for this docs-only package.

## Open Items

- Deputy review must approve, modify, or block the 4C2 package before 4C2a source starts.
- The authoritative V2 runtime config snapshot source for provider/model name is still open and must be resolved before provider factory code.
- 4C3 must separately decide hidden runtime injection, approval authority, and first live smoke behavior.

## Warnings

- Do not treat this package as source approval. It is a review artifact.
- Do not add a provider SDK import as a "small" change without updating the guard exception and receiving deputy approval.
- Do not wire provider factory output into `runtime-stage.ts`, `orchestrator.ts`, `pipeline-shell.ts`, API routes, UI, report, export, or live jobs under 4C2.

## For Next Agent

Review `Docs/WIP/2026-05-14_V2_Slice_6B3c4C2_Provider_Factory_Approval_Package.md`. If approved, start with 4C2a only: an inert runtime config/provenance contract plus tests and guard updates. Stop for a new review before provider SDK imports, provider factory construction, product injection, approval flips, or live jobs.

## Learnings

Provider factory work is not primarily an SDK problem. The real architectural risk is authority: who owns provider/model/config provenance, how guards keep SDK code out of Analyzer V2 and public paths, and when a hidden runtime artifact becomes meaningful enough for live validation.
