---
### 2026-05-20 | Captain Deputy / Steer-Co | Codex (GPT-5.5) + Claude Opus 4.6 | V2 W6-C4 Sufficiency Prompt Repair Package
**Task:** Prepare the next review package after W6-C3 captured actionable W6-C schema diagnostics.
**Files touched:** `Docs/WIP/2026-05-20_V2_Slice_W6-C4_Sufficiency_Prompt_Contract_Repair_Package.md`; index/status outputs.
**Key decisions:** Recommended a narrow prompt-contract repair in `V2_EVIDENCE_SUFFICIENCY_GATE`, not schema relaxation. The repair should enumerate existing schema literals for missing evidence dimensions, materiality, blocked/damaged reasons, and task-event fields. Claude Opus reviewed the package as `APPROVE_WITH_AMENDMENTS`; amendments were applied to include blocked/damaged reason literals, anti-canary-domain prompt tests, schema-source-derived test expectations where feasible, and a path-level canary pass criterion.
**Open items:** W6-C4 implementation is not started. Prompt/schema work remains approval-gated; obtain explicit approval before editing the prompt.
**Warnings:** Do not implement W6-C4 from this handoff alone unless the active authority model treats this package as approved for prompt work. No TypeScript schema literal/behavior changes, model/config/UCM/gateway edits, public behavior, retry/repair loop, provider expansion, parser/cache/SR/storage, ACS/direct URL, or V1 work is authorized by package preparation.
**For next agent:** If approved, implement inside the package envelope. Use the W6-C3 captured paths as the falsifiable target: no recurrence of those eight paths after one canary. If schema-source-derived prompt tests require exporting existing Zod enum constants, keep it export-only with no literal or validation behavior changes.
**Learnings:** Not appended to `Role_Learnings.md`; package-specific.

## Review Result

Claude Opus 4.6 returned `APPROVE_WITH_AMENDMENTS`.

Applied amendments:

- enumerate `blockedReason` and `damagedReason` literals in W6-C prompt repair;
- add anti-leakage/anti-teaching-to-test assertions for canary-domain terms;
- derive prompt-contract test expectations from the schema source of truth where feasible;
- sharpen canary pass criteria so none of the eight W6-C3 captured issue paths recur.

## Debt And Scorecard

- Latest `npm run debt:sensors`: `advisory_warn` at 2026-05-20T22:54:06Z.
- V2 Scorecard impact: moves W6-C from diagnostic stop-line toward valid hidden sufficiency assessment and downstream internal Alpha report path.
- Retirement Ledger impact: no immediate retirement, but successful W6-C4 should trigger removal/folding of W6-C3 temporary diagnostics.
- Consolidation Gate: passes for review-package preparation because it repairs an existing prompt contract and adds no hidden mechanism.
