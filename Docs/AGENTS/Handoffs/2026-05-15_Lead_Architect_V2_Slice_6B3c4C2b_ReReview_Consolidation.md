---
date: 2026-05-15
role: Lead Architect
agent: Codex (GPT-5)
task: V2 Slice 6B.3c-4C2b Provider Factory Re-Review Consolidation
status: complete
open_items: yes
topics:
  - v2
  - slice
  - 6b3c4c2b
  - provider-factory
  - review
  - clean-room
files_touched:
  - Docs/WIP/2026-05-14_V2_Slice_6B3c4C2_Provider_Factory_Approval_Package.md
  - Docs/WIP/2026-05-14_V2_Slice_6B3_Revised_Implementation_Plan.md
  - Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md
  - Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_Slice_6B3c4C2b_ReReview_Consolidation.md
---

# V2 Slice 6B.3c-4C2b Provider Factory Re-Review Consolidation

## Summary

Deputy re-review of 4C2b returned `MODIFY` before the 4C2b-0 addendum. At that point, provider factory source was not approved from the current 4C2 package because it still left gate-significant details open: exact SDK import specifiers, factory-only contract state, authoritative config snapshot source, sanitized failure mapping, telemetry ownership, and static guard exceptions.

## Consolidated Decision

The next allowed low-risk step was a 4C2b-0 docs/contract addendum. Provider SDK imports and concrete callback construction remained blocked until that addendum was reviewed and approved.

The current 4C2a contracts intentionally block `sdkImportState: "imported"` and `callbackCreationState: "created"`. A real factory therefore needs a separate reviewed `factory_only_not_product_wired` state before source begins.

## Still Forbidden

- provider SDK imports;
- concrete provider callback creation;
- product/orchestrator/runtime-stage/runtime-dispatch wiring;
- prompt/config source changes or file seeding;
- cache read/write/storage IO;
- approval/status flips or executable gateway construction;
- public API/UI/report/export exposure;
- ACS/direct URL execution;
- live jobs;
- V1 analyzer, prompt, helper, model resolver, or provider helper reuse.

## Verification

Docs-only consolidation. No source verifier was required. Current local baseline immediately before this handoff:

- focused V2 cleanup verifier passed 3 files / 42 tests;
- full Analyzer V2 plus runtime contract verifier passed 20 files / 166 tests;
- `npm -w apps/web run build` passed with no config or prompt reseed changes;
- `git diff --check` passed.

## 4C2b-0 Contract Addendum

Status: implemented as a contract/docs addendum after the re-review.

The addendum defines:

- `factory_only_not_product_wired` as distinct from `contract_only` and execution-approved/product-wired states;
- future factory source path `apps/web/src/lib/analyzer-v2-runtime/claim-understanding-provider-factory.ts`;
- future SDK specifiers `ai` and `@ai-sdk/anthropic`;
- factory-side config authority as supplied validated runtime config snapshot only;
- sanitized provider failure mapping and forbidden raw SDK/secret exposure;
- required telemetry ownership for provider id, model id, tokens, duration, config snapshot hash, attempt identity, output schema version, and prompt hashes;
- a boundary guard that keeps the factory source file absent until a later source gate.

## Follow-Up Source Implementation

Resolved by source commit `7f6f310a` and the follow-up handoff `Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_Slice_6B3c4C2b_Provider_Factory_Source.md`.

The 4C2b provider factory source is now implemented under the narrow factory-only envelope approved after the 4C2b-0 addendum. Product wiring, live jobs, public exposure, cache IO, approval flips, ACS/direct URL execution, and V1 cleanup remain blocked until later reviewed gates.

## Open Items

- Product wiring remains unapproved after the provider factory source commit.
- Authoritative V2 runtime config snapshot storage/retrieval remains unresolved for product wiring; current contracts validate supplied shape only.
- Live jobs remain not meaningful until 4C3 hidden direct-text runtime artifact wiring exists, is committed, and runtime is refreshed.

## Second Reviewer Confirmation

The second reviewer confirmed the then-current gate state: 4C2b remained blocked until a docs/contract addendum was reviewed, V2 runtime config snapshot authority was unresolved, and product wiring remained gated until a later reviewed 4C3 gate.

## For Next Agent

If continuing, start from the follow-up source handoff. Do not product-wire the provider factory or run live jobs yet. The next gate is 4C3: product-owned activation, hidden direct-text artifact routing, public leak guards, rollback behavior, and live-smoke discipline. Stop for Captain confirmation if the proposal includes product activation without deputy consensus, gateway/prompt/model/cache approval flips, public output changes, live jobs outside the approved gate, or V1 cleanup.
