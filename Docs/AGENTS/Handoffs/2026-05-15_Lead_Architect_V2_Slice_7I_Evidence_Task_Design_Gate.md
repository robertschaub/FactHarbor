# Lead Architect Handoff - V2 Slice 7I Evidence Task Design Gate

**Date:** 2026-05-15
**Role:** Lead Architect / Captain deputy
**Task:** Define Evidence Lifecycle prompt/model task contract boundaries
**Implementation commit:** `f58373a5` (`docs: define v2 evidence task design gate`)
**Gate document:** `Docs/WIP/2026-05-15_V2_Slice_7I_Evidence_Prompt_Model_Task_Contract_Design.md`
**Checklist:** `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96`

## Summary

Slice 7I is docs-only. It defines future LLM-owned task boundaries for Evidence Lifecycle query planning, source applicability, and evidence extraction.

It assigns probative value/evidence strength to LLM ownership, either inside `evidence_extraction` or a later LLM-owned `evidence_quality` task. It explicitly forbids deterministic conversion from source type, domain, provider rank, fetch success, or extraction confidence into evidence strength.

No source/test/config/prompt/schema edits, prompt profile registration/file seeding, gateway/task approval flips, prompt loader/model adapter/runtime wiring, hidden artifact expansion, provider/search/fetch execution, cache IO, Source Reliability import/call, public exposure, live job, V1 reuse, or V1 cleanup was authorized.

## Review Consolidation

The deputy-team review approved 7I after two fixes:

- evidence strength/probative value ownership was made explicitly LLM-owned;
- future prompt-backed V2 tasks now require Captain approval plus LLM Expert review, with deputy review only supplementary.

## Files Changed

- `Docs/WIP/2026-05-15_V2_Slice_7I_Evidence_Prompt_Model_Task_Contract_Design.md`
- `Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_Slice_7I_Evidence_Task_Design_Gate.md`
- `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`

## Verification

- `git diff --check` - passed.
- No source/test/config/prompt/schema file changes.
- No live jobs were run because 7I is docs-only.

## Next Step

7J requires Captain approval plus LLM Expert review before task prompts, schemas, model policy, UCM placement, or any task execution direction is authorized.

Do not add source execution, provider SDK imports, search/fetch calls, prompt/model calls, UCM/default changes, cache IO, Source Reliability imports/calls, product wiring, public exposure, live jobs, or V1 cleanup without that gate.

## Warnings

- 7I is design authority only, not prompt/model approval.
- Prompt-backed V2 task work cannot proceed by deputy approval alone under this package.
- Source Reliability remains unchanged and unimported.

## Learnings

- Evidence strength is an analytical judgment, not a deterministic derivative of extraction confidence or source metadata.
- Prompt/model task design needs to precede source task types; otherwise TypeScript shapes become accidental semantic policy.
