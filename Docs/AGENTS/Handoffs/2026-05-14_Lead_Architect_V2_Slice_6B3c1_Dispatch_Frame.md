---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V2 Slice 6B.3c-1 Dispatch Frame
**Task:** Implement the deputy-approved 6B.3c-1 dispatch-frame boundary contract without product runtime dispatch.
**Files touched:** `apps/web/src/lib/analyzer-v2/claim-understanding/dispatch-frame.ts`, `apps/web/test/unit/lib/analyzer-v2/claim-understanding/dispatch-frame.test.ts`, `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`, `Docs/WIP/2026-05-14_V2_Slice_6B3c_Dispatch_Integration_Review_Package.md`, `Docs/WIP/2026-05-14_V2_Slice_6B3_Revised_Implementation_Plan.md`, `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md`, `Docs/WIP/2026-05-12_Pipeline_Rebuild_Specification_Plan.md`, `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`, `Docs/AGENTS/Agent_Outputs.md`.
**Key decisions:** Slice 6B.3c-1 is complete at `8a663d3f`. The new frame builder is pure and internal: direct text preserves submitted text exactly, direct URL fails closed, ACS-backed input requires resolved snapshot text plus canonical V2 `acsSnapshotHash` and `inputGroundingSeedHash`, and static guards prevent prompt/model/cache/provider/V1 imports.
**Open items:** Product runtime dispatch remains unapproved. The next dispatch proposal must define executable approval source, provider boundary, prompt/config/cache hash construction, cache no-read/no-write posture, URL-resolution prerequisite, and the guard that replaces the product-path model-adapter import ban.
**Warnings:** Do not wire `buildClaimUnderstandingDispatchFrame(...)` into the orchestrator for provider dispatch yet. Do not add prompt loading, model-adapter import, cache-governance builder/decision, provider callback/SDK, approval flips, public diagnostics, live jobs, or direct URL body assumptions without a new reviewed gate.
**For next agent:** Current stable source commit is `8a663d3f`. Verification passed: focused dispatch-frame + boundary tests (2 files, 18 tests), full Analyzer V2 unit slice (16 files, 103 tests), `npm -w apps/web run build`, targeted clean-room source scan, and `git diff --check`. Continue only with docs/debate for product dispatch unless the next step is another clearly non-executable internal contract slice.
**Learnings:** No new role learning added; the existing "do not pre-solve later gates" learning directly applied.

```text
DEBT-GUARD COMPACT RESULT
Path: Compact
Symptom: focused dispatch-frame test failed because it asserted serialized blocked output must not contain `inputIdentityHash`, while the side-effect contract intentionally recorded `inputIdentityHashConstructed: false`.
Existing mechanism: dispatch-frame side-effect object records forbidden work as explicit false flags.
Prior attempt: keep
Lowest-complexity fix: amend the over-broad test-only string assertions and keep full side-effect equality as the behavior proof.
Rejected path: removing side-effect fields would weaken the contract; adding helpers would add mechanism for a test-only issue.
Verifier: focused dispatch-frame + boundary tests passed.
Net mechanisms: unchanged
Residual risk: low
```
